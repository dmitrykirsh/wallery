import { beforeAll, describe, expect, it, vi } from "vitest";

let savedFile: string | null = null;
const invoke = vi.fn(async (cmd: string, args?: { data: string }) => {
  if (cmd === "storage_load") return savedFile;
  if (cmd === "storage_save") savedFile = args!.data;
});

vi.mock("@tauri-apps/api/core", () => ({ invoke: (cmd: string, args?: { data: string }) => invoke(cmd, args) }));
vi.mock("./tauri", () => ({ isTauri: () => true }));

// The node test environment has no DOM Storage — a minimal one whose
// prototype the module under test can patch, like the real Storage.
class TestStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const g = globalThis as unknown as Record<string, unknown>;

beforeAll(() => {
  g.Storage = TestStorage;
  g.localStorage = new TestStorage();
  g.window = { addEventListener: () => {} };
});

describe("durableStorage", () => {
  it("restores saved data over stale localStorage, mirrors new writes, and flushes on demand", async () => {
    const { initDurableStorage, flushDurableStorage } = await import("./durableStorage");

    // What WebView2 lost: localStorage has an older favorites list than the file.
    localStorage.setItem("wallery:favorites", "[]");
    localStorage.setItem("other:key", "x");
    savedFile = JSON.stringify({ "wallery:favorites": '[{"id":"abc"}]', "wallery:lang": "ru" });

    await initDurableStorage(true);
    expect(localStorage.getItem("wallery:favorites")).toBe('[{"id":"abc"}]');
    expect(localStorage.getItem("wallery:lang")).toBe("ru");

    localStorage.setItem("wallery:favorites", '[{"id":"new"},{"id":"abc"}]');
    await flushDurableStorage();
    const saved = JSON.parse(savedFile!);
    expect(saved["wallery:favorites"]).toBe('[{"id":"new"},{"id":"abc"}]');
    // Only the app's own keys are mirrored.
    expect(saved["other:key"]).toBeUndefined();
  });

  it("saves a write on its own shortly after it happens", async () => {
    vi.useFakeTimers();
    localStorage.setItem("wallery:favorites", '[{"id":"later"}]');
    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();
    expect(JSON.parse(savedFile!)["wallery:favorites"]).toBe('[{"id":"later"}]');
  });
});
