import type { Wallpaper } from "./types";

/**
 * Greedy shortest-column placement using each wallpaper's known aspect ratio
 * as a stand-in for its rendered height. Deterministic and append-stable:
 * placing item N only depends on items 0..N-1, so appending more wallpapers
 * (infinite scroll) never reshuffles already-placed cards — unlike native
 * CSS `columns`, which rebalances the whole layout whenever content is added.
 */
export function distributeColumns(wallpapers: Wallpaper[], columnCount: number): Wallpaper[][] {
  const columns: Wallpaper[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);

  for (const w of wallpapers) {
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push(w);
    heights[shortest] += w.dimension_y / w.dimension_x;
  }

  return columns;
}
