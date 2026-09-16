const STORAGE_KEY = "wallery:recommendation-settings";

export interface RecommendationSettings {
  /** When true, the "Recommended for you" row uses customTags instead of
   * the auto-computed favorites + search history. */
  useCustomTags: boolean;
  customTags: string[];
}

const defaults: RecommendationSettings = {
  useCustomTags: false,
  customTags: [],
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
