import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";

// Everything the app remembers lives in localStorage under this prefix. In
// the desktop app WebView2 writes it to disk lazily, and the webview is never
// closed gracefully (the window hides to the tray; Quit or a Windows shutdown
// ends the process), so the latest changes — a freshly added favorite — could
// be missing on the next launch. Every change is therefore mirrored into a
// file by the Rust side (storage_save), and that file wins on startup.
const PREFIX = "wallery:";
const SAVE_DELAY_MS = 150;

let timer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;
let dirty = false;

function dump(): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) data[key] = localStorage.getItem(key) ?? "";
  }
  return data;
}

/** Writes the current state to disk now; resolves once it's saved. */
export async function flushDurableStorage(): Promise<void> {
  if (!isTauri()) return;
  clearTimeout(timer);
  timer = undefined;
  if (saving) {
    // A save already in flight may predate the latest change — queue one more.
    dirty = true;
    return saving;
  }
  saving = saveLoop();
  return saving;
}

async function saveLoop(): Promise<void> {
  do {
    dirty = false;
    try {
      await invoke("storage_save", { data: JSON.stringify(dump()) });
    } catch {
      // Disk trouble: localStorage still has the data for this session.
    }
  } while (dirty);
  // Cleared in the same step as the final `dirty` check — a flush arriving
  // after it must start a new save, not wait on one that already ended.
  saving = null;
}

function scheduleSave() {
  if (timer) return;
  timer = setTimeout(() => void flushDurableStorage(), SAVE_DELAY_MS);
}

let patched = false;

function watchWrites() {
  if (patched) return;
  patched = true;
  const proto = Storage.prototype;
  const { setItem, removeItem, clear } = proto;
  proto.setItem = function (key: string, value: string) {
    setItem.call(this, key, value);
    if (this === localStorage && key.startsWith(PREFIX)) scheduleSave();
  };
  proto.removeItem = function (key: string) {
    removeItem.call(this, key);
    if (this === localStorage && key.startsWith(PREFIX)) scheduleSave();
  };
  proto.clear = function () {
    clear.call(this);
    if (this === localStorage) scheduleSave();
  };
  window.addEventListener("pagehide", () => void flushDurableStorage());
}

/** Call before the app renders. `restore` copies the saved file back into
 * localStorage (main window only — widget windows share the same
 * localStorage and open after it has already been restored). */
export async function initDurableStorage(restore: boolean): Promise<void> {
  if (!isTauri()) return;
  if (restore) {
    try {
      const raw = await invoke<string | null>("storage_load");
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        for (const [key, value] of Object.entries(saved)) {
          if (key.startsWith(PREFIX) && typeof value === "string") localStorage.setItem(key, value);
        }
      }
    } catch {
      // Unreadable file: fall back to whatever localStorage has.
    }
  }
  watchWrites();
  // First run with this feature (or after a restore): make sure the file
  // holds the full current state right away.
  if (restore) void flushDurableStorage();
}
