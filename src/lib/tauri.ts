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

export async function cropWallpaper(
  id: string,
  url: string,
  crop: CropRect,
  targetWidth: number,
  targetHeight: number,
  monitor: string | null,
  mode: "set" | "save",
  saveFolder: string | null,
): Promise<string> {
  if (!isTauri()) {
    throw new Error(t("error.tauriOnlyCrop"));
  }
  return await invoke<string>("crop_wallpaper", { id, url, crop, targetWidth, targetHeight, monitor, mode, saveFolder });
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
export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  const { enable, disable, isEnabled } = await import("@tauri-apps/plugin-autostart");
  const currentlyEnabled = await isEnabled().catch(() => false);
  if (enabled && !currentlyEnabled) await enable();
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
