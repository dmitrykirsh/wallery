import type { WallpaperStyle } from "./tauri";
import type { Category, Purity, Sorting, TopRange } from "./types";

const STORAGE_KEY = "wallery:slideshow-rules";

export type SlideshowSource = "random" | "latest" | "hot" | "toplist" | "favorites";
export type Orientation = "any" | "landscape" | "portrait";

/** "favorites" doesn't hit the API at all — it's handled separately by
 * picking from the locally-saved favorites list — so it has no entry here. */
export const SOURCE_TO_FILTERS: Record<Exclude<SlideshowSource, "favorites">, { sorting: Sorting; topRange?: TopRange }> = {
  random: { sorting: "random" },
  latest: { sorting: "date_added" },
  hot: { sorting: "toplist", topRange: "1w" },
  toplist: { sorting: "toplist", topRange: "1y" },
};

export interface SlideshowRule {
  id: string;
  enabled: boolean;
  /** Which monitor this rule targets: null = every monitor (same picture everywhere). */
  monitor: string | null;
  source: SlideshowSource;
  query: string;
  resolution: string | null;
  orientation: Orientation;
  colors: string[];
  categories: Record<Category, boolean>;
  purities: Record<Purity, boolean>;
  intervalMinutes: number;
  style: WallpaperStyle;
  lastAppliedAt: number;
}

export function newRule(monitor: string | null = null): SlideshowRule {
  return {
    id: Math.random().toString(36).slice(2),
    enabled: true,
    monitor,
    source: "random",
    query: "",
    resolution: null,
    orientation: "any",
    colors: [],
    categories: { general: true, anime: true, people: true },
    purities: { sfw: true, sketchy: true, nsfw: false },
    intervalMinutes: 60,
    style: "fill",
    lastAppliedAt: 0,
  };
}

export function loadSlideshowRules(): SlideshowRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((r) => ({ ...newRule(), ...r })) : [];
  } catch {
    return [];
  }
}

export function saveSlideshowRules(rules: SlideshowRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export const INTERVAL_OPTIONS = [
  { label: "15", minutes: 15 },
  { label: "30", minutes: 30 },
  { label: "60", minutes: 60 },
  { label: "180", minutes: 180 },
  { label: "360", minutes: 360 },
  { label: "720", minutes: 720 },
  { label: "1440", minutes: 1440 },
] as const;

export const SOURCE_OPTIONS: SlideshowSource[] = ["random", "latest", "hot", "toplist", "favorites"];
