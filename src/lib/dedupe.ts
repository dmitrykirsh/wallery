import type { Wallpaper } from "./types";

export function dedupeById(wallpapers: Wallpaper[]): Wallpaper[] {
  const seen = new Set<string>();
  const result: Wallpaper[] = [];
  for (const w of wallpapers) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    result.push(w);
  }
  return result;
}
