import { useSyncExternalStore } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Wallpaper } from "./types";
import { cacheFavoriteFiles, isTauri, listCachedFavorites, uncacheFavoriteFiles } from "./tauri";

// Offline copies of favorites live on disk (see cache_favorite in lib.rs);
// this module mirrors *which* ones exist as asset-protocol URLs, so any
// image component can prefer the local file without asking Rust each time.
interface Entry {
  thumb: string | null;
  full: string | null;
}

let entries = new Map<string, Entry>();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((l) => l());
}

export function getCachedThumb(id: string): string | null {
  return entries.get(id)?.thumb ?? null;
}

export function getCachedFull(id: string): string | null {
  return entries.get(id)?.full ?? null;
}

/** Re-renders the caller whenever the set of cached files changes. */
export function useFavoritesCacheVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
}

async function refresh() {
  const list = await listCachedFavorites();
  const next = new Map<string, Entry>();
  for (const item of list) {
    next.set(item.id, {
      thumb: item.thumb ? convertFileSrc(item.thumb) : null,
      full: item.full ? convertFileSrc(item.full) : null,
    });
  }
  entries = next;
  notify();
}

// One operation at a time: an un-favorite arriving while the same wallpaper
// is still downloading must run *after* it, or the freshly written files
// would outlive the heart that was just removed.
let chain: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<void>) {
  chain = chain.then(task).catch(() => {});
  return chain;
}

function cacheOne(w: Wallpaper) {
  return cacheFavoriteFiles(w.id, w.thumbs.original || w.thumbs.large, w.path);
}

export function cacheFavorite(w: Wallpaper) {
  if (!isTauri()) return;
  void enqueue(async () => {
    await cacheOne(w);
    await refresh();
  });
}

export function uncacheFavorite(id: string) {
  if (!isTauri()) return;
  void enqueue(async () => {
    await uncacheFavoriteFiles(id);
    await refresh();
  });
}

/** Brings the disk in line with the favorites list: with `download` off it
 * only removes copies whose heart is gone; on, it also downloads whatever is
 * missing (favorites saved before caching existed, or restored from a
 * backup) and deletes copies whose heart is gone. */
export function syncFavoritesCache(favorites: Wallpaper[], download = true) {
  if (!isTauri()) return;
  void enqueue(async () => {
    await refresh();
    const wanted = new Set(favorites.map((w) => w.id));
    for (const id of [...entries.keys()]) {
      if (!wanted.has(id)) await uncacheFavoriteFiles(id);
    }
    if (!download) {
      await refresh();
      return;
    }
    for (const w of favorites) {
      const cached = entries.get(w.id);
      if (cached?.thumb && cached.full) continue;
      try {
        await cacheOne(w);
      } catch {
        // Site down or offline right now — the next launch tries again.
      }
    }
    await refresh();
  });
}
