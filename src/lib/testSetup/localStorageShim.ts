/** Minimal in-memory localStorage — vitest's default "node" environment has
 * no DOM, and pulling in jsdom just for this would be a heavy dependency
 * for one API. Call install() in a test's beforeEach for a clean slate. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

export function installLocalStorageShim(): void {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
}
