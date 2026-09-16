const STORAGE_KEY = "wallery:hero-settings";

export type HeroMode = "hot" | "toplist" | "latest" | "custom";
export type HeroCustomSorting = "date_added" | "relevance" | "random";

export interface HeroSettings {
  mode: HeroMode;
  customQuery: string;
  customSorting: HeroCustomSorting;
  nsfwEnabled: boolean;
  sketchyEnabled: boolean;
}

const defaults: HeroSettings = {
  mode: "hot",
  customQuery: "",
  customSorting: "relevance",
  nsfwEnabled: false,
  sketchyEnabled: true,
};

export function loadHeroSettings(): HeroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveHeroSettings(settings: HeroSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const HERO_CUSTOM_SORTING_VALUES: HeroCustomSorting[] = ["date_added", "relevance", "random"];
