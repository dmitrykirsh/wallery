import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";
import { loadLang, translate } from "./i18n";
import type { SearchResponse, Wallpaper, Filters } from "./types";

// Several places in the app (the hero banner's initial page burst, the
// recommendation row's per-term fetches, tag rows revealing as you scroll)
// each fire a handful of requests via Promise.all. Individually reasonable,
// but landing on the same page load they can add up to a dozen-plus
// requests hitting Wallhaven in the same instant — well within its 45/min
// budget on paper, but still enough to trip its burst/concurrency limiter
// and return 429. Funnel every request through a small shared queue so the
// app never has more than a few in flight at once, spaced slightly apart,
// regardless of how many call sites ask for something at the same time.
const MAX_CONCURRENT = 3;
const MIN_GAP_MS = 200;

let active = 0;
let lastStart = 0;
const queue: (() => void)[] = [];

function drainQueue() {
  if (active >= MAX_CONCURRENT || queue.length === 0) return;
  const wait = Math.max(0, lastStart + MIN_GAP_MS - Date.now());
  if (wait > 0) {
    setTimeout(drainQueue, wait);
    return;
  }
  const job = queue.shift();
  if (!job) return;
  active++;
  lastStart = Date.now();
  job();
}

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          drainQueue();
        });
    });
    drainQueue();
  });
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  return throttled(async () => {
    if (isTauri()) {
      return await invoke<T>("api_get", { path, params });
    }

    const search = new URLSearchParams(params);
    const res = await fetch(`/wallhaven-api/v1${path}?${search.toString()}`);
    if (!res.ok) throw new Error(`${translate(loadLang(), "error.apiStatus")} ${res.status}`);
    return (await res.json()) as T;
  });
}

function buildParams(filters: Partial<Filters>, apiKey: string, page: number): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.query) params.q = filters.query;

  if (filters.categories) {
    const c = filters.categories;
    params.categories = `${c.general ? 1 : 0}${c.anime ? 1 : 0}${c.people ? 1 : 0}`;
  }

  if (filters.purities) {
    const p = filters.purities;
    params.purity = `${p.sfw ? 1 : 0}${p.sketchy ? 1 : 0}${p.nsfw ? 1 : 0}`;
  }

  if (filters.sorting) params.sorting = filters.sorting;
  if (filters.order) params.order = filters.order;
  if (filters.sorting === "toplist" && filters.topRange) params.topRange = filters.topRange;
  if (filters.atleast) params.atleast = filters.atleast;
  if (filters.resolutions?.length) params.resolutions = filters.resolutions.join(",");
  if (filters.ratios?.length) params.ratios = filters.ratios.join(",");
  if (filters.colors?.length) params.colors = filters.colors[0];

  params.page = String(page);
  if (apiKey) params.apikey = apiKey;

  return params;
}

export async function searchWallpapers(
  filters: Partial<Filters>,
  apiKey: string,
  page = 1,
): Promise<SearchResponse> {
  return apiGet<SearchResponse>("/search", buildParams(filters, apiKey, page));
}

export async function getWallpaper(id: string, apiKey: string): Promise<Wallpaper> {
  const params: Record<string, string> = {};
  if (apiKey) params.apikey = apiKey;
  const res = await apiGet<{ data: Wallpaper }>(`/w/${id}`, params);
  return res.data;
}
