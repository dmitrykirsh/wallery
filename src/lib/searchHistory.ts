const STORAGE_KEY = "wallery:search-history";
const MAX_ENTRIES = 20;

export function recordSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  const history = getSearchHistory().filter((h) => h.toLowerCase() !== q.toLowerCase());
  history.unshift(q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
}

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
