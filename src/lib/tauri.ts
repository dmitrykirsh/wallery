import { invoke } from "@tauri-apps/api/core";
import { loadLang, translate } from "./i18n";

export function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

/** This module has no React context, so it can't use useLang() — reads the
 * persisted language directly for the handful of user-facing strings here. */
function t(key: Parameters<typeof translate>[1]): string {
  return translate(loadLang(), key);
}

export interface MonitorInfo {
  id: string;
  index: number;
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WallpaperStyle = "fill" | "fit" | "stretch" | "tile" | "center" | "span";

export async function listMonitors(): Promise<MonitorInfo[]> {
  if (!isTauri()) return [];
  try {
    return await invoke<MonitorInfo[]>("list_monitors");
  } catch {
    return [];
  }
}

export async function setWallpaper(
  id: string,
  url: string,
  monitor: string | null,
  style: WallpaperStyle,
): Promise<void> {
  if (!isTauri()) {
    throw new Error(t("error.tauriOnlySet"));
  }
  await invoke("set_wallpaper", { id, url, monitor, style });
}

export async function saveWallpaper(id: string, url: string, folder: string | null): Promise<string> {
  if (!isTauri()) {
    throw new Error(t("error.tauriOnlySave"));
  }
  return await invoke<string>("save_wallpaper", { id, url, folder });
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({ directory: true, multiple: false, title: t("dialog.chooseFolder") });
  return typeof result === "string" ? result : null;
}

export async function quitApp(): Promise<void> {
  if (!isTauri()) return;
  await invoke("quit_app");
}

/** Saves an already cropped, resized, and color-adjusted image — baked in
 * client-side via canvas (see EditPanel) — either as the desktop wallpaper
 * or to a folder. `dataBase64` is the raw base64 payload of a JPEG blob,
 * no `data:...;base64,` prefix. */
export async function saveEditedWallpaper(
  id: string,
  dataBase64: string,
  monitor: string | null,
  mode: "set" | "save",
  saveFolder: string | null,
): Promise<string> {
  if (!isTauri()) {
    throw new Error(t("error.tauriOnlyCrop"));
  }
  return await invoke<string>("save_edited_wallpaper", { id, dataBase64, monitor, mode, saveFolder });
}

export async function openInBrowser(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

/** The system tray menu is native OS UI outside the React tree, so it can't
 * read the in-app language directly — call this once on load and whenever
 * the language changes to keep its labels in sync. */
export async function setTrayLabels(show: string, quit: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("set_tray_labels", { show, quit }).catch(() => {});
}

/** Syncs the OS-level "launch on login" registration to match the setting —
 * a no-op if it already matches, so this is safe to call on every save. */
export async function setAutostart(enabled: boolean, refresh = false): Promise<void> {
  if (!isTauri()) return;
  const { enable, disable, isEnabled } = await import("@tauri-apps/plugin-autostart");
  const currentlyEnabled = await isEnabled().catch(() => false);
  // `refresh` rewrites an existing entry too, so its command line always
  // carries the current --autostart flag (which is what makes a login launch
  // start hidden in the tray) even if it was registered by an older build.
  if (enabled && (!currentlyEnabled || refresh)) await enable();
  else if (!enabled && currentlyEnabled) await disable();
}

/** Fetches an image through Rust's own HTTP client and returns it as a
 * base64 data URL — a last-resort path for when the webview's own network
 * stack refuses a direct <img> request that a plain HTTP client handles
 * fine. Throws outside Tauri (there's no separate HTTP client to fall back
 * to there). */
export async function fetchImageDataUrl(url: string): Promise<string> {
  if (!isTauri()) {
    throw new Error(t("error.tauriOnlyCrop"));
  }
  return await invoke<string>("fetch_image_data_url", { url });
}

/** Sets the wallpaper as the Windows lock screen picture. */
export async function setLockScreen(id: string, url: string): Promise<void> {
  if (!isTauri()) {
    throw new Error(t("error.tauriOnlySet"));
  }
  await invoke("set_lock_screen", { id, url });
}

export interface CachedFavoriteFiles {
  id: string;
  thumb: string | null;
  full: string | null;
}

export async function listCachedFavorites(): Promise<CachedFavoriteFiles[]> {
  if (!isTauri()) return [];
  try {
    return await invoke<CachedFavoriteFiles[]>("list_cached_favorites");
  } catch {
    return [];
  }
}

export async function cacheFavoriteFiles(id: string, thumbUrl: string, fullUrl: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("cache_favorite", { id, thumbUrl, fullUrl });
}

export async function uncacheFavoriteFiles(id: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("uncache_favorite", { id });
}

export interface LatestRelease {
  tag: string;
  url: string;
  notes: string;
}

export async function fetchLatestRelease(): Promise<LatestRelease> {
  if (!isTauri()) throw new Error("Update check is only available in the desktop app");
  return await invoke<LatestRelease>("fetch_latest_release");
}
