import type { Filters } from "./types";

export function defaultFilters(): Filters {
  return {
    query: "",
    categories: { general: true, anime: true, people: true },
    purities: { sfw: true, sketchy: true, nsfw: true },
    sorting: "date_added",
    order: "desc",
    topRange: "1M",
    atleast: null,
    resolutions: [],
    ratios: [],
    colors: [],
  };
}

/** Resolutions grouped by aspect-ratio category, matching Wallhaven's own picker layout. */
export const RESOLUTION_GROUPS: { label: string; values: string[] }[] = [
  { label: "Ultrawide", values: ["2560x1080", "3440x1440", "3840x1600"] },
  { label: "16:9", values: ["1280x720", "1600x900", "1920x1080", "2560x1440", "3840x2160"] },
  { label: "16:10", values: ["1280x800", "1600x1000", "1920x1200", "2560x1600", "3840x2400"] },
  { label: "4:3", values: ["1280x960", "1600x1200", "1920x1440", "2560x1920", "3840x2880"] },
  { label: "5:4", values: ["1280x1024", "1600x1280", "1920x1536", "2560x2048", "3840x3072"] },
];

export const RESOLUTIONS = RESOLUTION_GROUPS.flatMap((g) => g.values);

export const RATIOS = [
  { label: "16:9", value: "16x9" },
  { label: "16:10", value: "16x10" },
  { label: "21:9", value: "21x9" },
  { label: "32:9", value: "32x9" },
  { label: "48:9", value: "48x9" },
  { label: "4:3", value: "4x3" },
  { label: "3:2", value: "3x2" },
  { label: "5:4", value: "5x4" },
  { label: "1:1", value: "1x1" },
  { label: "9:16", value: "9x16" },
  { label: "10:16", value: "10x16" },
  { label: "9:18", value: "9x18" },
  { label: "9:21", value: "9x21" },
  { label: "3:4", value: "3x4" },
  { label: "2:3", value: "2x3" },
  { label: "4:5", value: "4x5" },
];

/** Ratios grouped to match Wallhaven's own Wide/Ultrawide/Portrait/Square picker layout. */
export const RATIO_GROUPS: { label: string; values: string[] }[] = [
  { label: "Wide", values: ["16x9", "16x10"] },
  { label: "Ultrawide", values: ["21x9", "32x9", "48x9"] },
  { label: "Portrait", values: ["9x16", "10x16", "9x18"] },
  { label: "Square", values: ["1x1", "3x2", "4x3", "5x4"] },
];

export const LANDSCAPE_RATIOS = ["16x9", "16x10", "21x9", "32x9", "48x9", "4x3", "3x2", "5x4"];
export const PORTRAIT_RATIOS = ["9x16", "10x16", "9x18", "9x21", "3x4", "2x3", "4x5"];

export const COLORS = [
  "660000", "990000", "cc0000", "cc3333", "ea4c88",
  "993399", "663399", "333399", "0066cc", "0099cc",
  "66cccc", "77cc33", "669900", "336600", "666600",
  "999900", "cccc33", "ffff00", "ffcc33", "ff9900",
  "ff6600", "cc6633", "996633", "663300", "000000",
  "999999", "cccccc", "ffffff", "424153",
];

export const SORTING_VALUES: Filters["sorting"][] = ["date_added", "relevance", "random", "views", "favorites", "toplist"];
export const TOP_RANGE_VALUES: Filters["topRange"][] = ["1d", "3d", "1w", "1M", "3M", "6M", "1y"];
