import type { Wallpaper } from "./types";

const STORAGE_KEY = "wallery:favorites";

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

export function getFavorites(): Wallpaper[] {
  return readAll();
}

export function isFavorite(id: string): boolean {
  return readAll().some((w) => w.id === id);
}

export function toggleFavorite(wallpaper: Wallpaper): boolean {
  const list = readAll();
  const idx = list.findIndex((w) => w.id === wallpaper.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeAll(list);
    return false;
  }
  list.unshift(wallpaper);
  writeAll(list);
  return true;
}

export function favoriteTags(): string[] {
  const list = readAll();
  const counts = new Map<string, number>();
  for (const w of list) {
    for (const tag of w.tags ?? []) {
      counts.set(tag.name, (counts.get(tag.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
