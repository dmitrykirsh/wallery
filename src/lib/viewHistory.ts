import type { Wallpaper } from "./types";

const STORAGE_KEY = "wallery:view-history";
const MAX_ENTRIES = 300;

function readAll(): Wallpaper[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Wallpaper[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getViewHistory(): Wallpaper[] {
  return readAll();
}

/** Moves the wallpaper to the front instead of adding a duplicate — history
 * should read "what did I look at, most recent first", not accumulate a
 * repeat entry every time the same wallpaper is reopened. */
export function recordView(wallpaper: Wallpaper) {
  const list = readAll().filter((w) => w.id !== wallpaper.id);
  list.unshift(wallpaper);
  writeAll(list.slice(0, MAX_ENTRIES));
}

export function clearViewHistory() {
  writeAll([]);
}

export function removeFromViewHistory(id: string) {
  writeAll(readAll().filter((w) => w.id !== id));
}
