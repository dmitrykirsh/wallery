import type { WallpaperStyle } from "./tauri";

const STORAGE_KEY = "wallery:wallpaper-prefs";

export interface WallpaperPrefs {
  monitor: string | null; // null = all monitors
  style: WallpaperStyle;
  saveFolder: string | null; // null = default Pictures/Wallery
}

const defaults: WallpaperPrefs = {
  monitor: null,
  style: "fill",
  saveFolder: null,
};

export function loadWallpaperPrefs(): WallpaperPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveWallpaperPrefs(prefs: WallpaperPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
