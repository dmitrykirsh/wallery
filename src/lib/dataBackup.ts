import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "./tauri";

const PREFIX = "wallery:";
const FILE_FILTER = { name: "Wallery Backup", extensions: ["json"] };

interface BackupFile {
  wallery: "backup";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

/** Everything the app keeps in localStorage (API key, favorites, widgets,
 * recommendation weights, history, ...) — a plain dump by key prefix, so a
 * newly added storage key is backed up automatically without this needing
 * to be updated. This exists because the NSIS uninstaller's "delete app
 * data" option (offered when reinstalling/updating) wipes this same
 * localStorage profile — a backup taken beforehand is the only way back. */
function dumpLocalStorage(): Record<string, string> {
  const dump: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) dump[key] = localStorage.getItem(key) ?? "";
  }
  return dump;
}

export async function exportAllData(): Promise<boolean> {
  if (!isTauri()) return false;
  const path = await save({
    filters: [FILE_FILTER],
    defaultPath: `wallery-backup-${new Date().toISOString().slice(0, 10)}.json`,
  });
  if (!path) return false;
  const file: BackupFile = { wallery: "backup", version: 1, exportedAt: new Date().toISOString(), data: dumpLocalStorage() };
  await writeTextFile(path, JSON.stringify(file, null, 2));
  return true;
}

/** Returns true if data was restored (caller should reload the app so every
 * React state picks up the newly written localStorage), false if the user
 * cancelled or the file wasn't a valid backup. */
export async function importAllData(): Promise<boolean> {
  if (!isTauri()) return false;
  const path = await open({ filters: [FILE_FILTER], multiple: false, directory: false });
  if (!path || Array.isArray(path)) return false;
  const raw = await readTextFile(path);
  const parsed = JSON.parse(raw) as Partial<BackupFile>;
  if (parsed.wallery !== "backup" || !parsed.data) return false;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key.startsWith(PREFIX)) localStorage.setItem(key, value);
  }
  return true;
}
