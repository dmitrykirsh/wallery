const STORAGE_KEY = "wallery:settings";

export interface Settings {
  apiKey: string;
  nsfwEnabled: boolean;
  sketchyEnabled: boolean;
  autostart: boolean;
  /** Ask GitHub once in a while whether a newer release exists. */
  checkUpdates: boolean;
  /** Show the "new version available" popup when a check finds one. */
  updateNotifications: boolean;
  /** Keep offline copies of favorites on disk (downloaded automatically). */
  cacheFavorites: boolean;
}

const defaults: Settings = {
  apiKey: "",
  nsfwEnabled: true,
  sketchyEnabled: true,
  autostart: false,
  checkUpdates: true,
  updateNotifications: true,
  cacheFavorites: true,
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
