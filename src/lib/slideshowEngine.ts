import { searchWallpapers } from "./api";
import { setWallpaper } from "./tauri";
import { defaultFilters, LANDSCAPE_RATIOS, PORTRAIT_RATIOS } from "./filters";
import { getFavorites } from "./favorites";
import { SOURCE_TO_FILTERS, type SlideshowRule } from "./slideshow";
import type { Filters, Wallpaper } from "./types";

export function slideshowFilters(rule: SlideshowRule): Filters {
  const { sorting, topRange } = SOURCE_TO_FILTERS[rule.source as Exclude<SlideshowRule["source"], "favorites">];
  const ratios = rule.orientation === "landscape" ? LANDSCAPE_RATIOS : rule.orientation === "portrait" ? PORTRAIT_RATIOS : [];
  return {
    ...defaultFilters(),
    query: rule.query,
    resolutions: rule.resolution ? [rule.resolution] : [],
    ratios,
    colors: rule.colors,
    categories: rule.categories,
    purities: rule.purities,
    sorting,
    ...(topRange ? { topRange } : {}),
  };
}

/** Reuses the rule's orientation/category/purity toggles as local filters
 * over the saved favorites list, since there's no API call to hand them to. */
function favoritesPool(rule: SlideshowRule): Wallpaper[] {
  return getFavorites().filter((w) => {
    if (rule.orientation === "landscape" && w.dimension_x <= w.dimension_y) return false;
    if (rule.orientation === "portrait" && w.dimension_x >= w.dimension_y) return false;
    if (!rule.categories[w.category]) return false;
    if (!rule.purities[w.purity]) return false;
    return true;
  });
}

/** Runs a single wallpaper rotation for the given rule. Used both by the
 * background interval runner and the "apply now" button. */
export async function runSlideshowTick(apiKey: string, rule: SlideshowRule): Promise<void> {
  const pool = rule.source === "favorites" ? favoritesPool(rule) : (await searchWallpapers(slideshowFilters(rule), apiKey, 1)).data;
  if (pool.length === 0) return;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  await setWallpaper(pick.id, pick.path, rule.monitor, rule.style);
}
