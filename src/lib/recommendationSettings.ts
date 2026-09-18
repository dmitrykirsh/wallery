const STORAGE_KEY = "wallery:recommendation-settings";

export interface RecommendationSettings {
  /** When true, the "Recommended for you" row uses customTags instead of
   * the auto-computed favorites + search history. */
  useCustomTags: boolean;
  customTags: string[];
  /** Narrows every recommendation query — same shape as the main search
   * filters, but scoped just to this row so it doesn't have to match
   * whatever's currently selected in Results. */
  categories: { general: boolean; anime: boolean; people: boolean };
  purities: { sfw: boolean; sketchy: boolean; nsfw: boolean };
  atleast: string | null;
  ratios: string[];
}

const defaults: RecommendationSettings = {
  useCustomTags: false,
  customTags: [],
  categories: { general: true, anime: true, people: true },
  purities: { sfw: true, sketchy: true, nsfw: true },
  atleast: null,
  ratios: [],
};

export function loadRecommendationSettings(): RecommendationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveRecommendationSettings(settings: RecommendationSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
