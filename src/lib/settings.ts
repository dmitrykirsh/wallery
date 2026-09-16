const STORAGE_KEY = "wallery:settings";

export interface Settings {
  apiKey: string;
  nsfwEnabled: boolean;
  sketchyEnabled: boolean;
  autostart: boolean;
}

const defaults: Settings = {
  apiKey: "",
  nsfwEnabled: true,
  sketchyEnabled: true,
  autostart: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
