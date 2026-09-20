// Whether Wallhaven's API answered the last time we asked. api.ts reports
// into this; the UI reads it to decide between "browse as usual" and the
// "site is down, your favorites are still here" screen — and the Lightbox
// uses it to prefer a favorite's offline copy over waiting on failed retries.
let down = false;
const listeners = new Set<() => void>();

export function isApiDown(): boolean {
  return down;
}

export function reportApiStatus(ok: boolean) {
  if (down === !ok) return;
  down = !ok;
  listeners.forEach((l) => l());
}

export function subscribeApiStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 5xx (Cloudflare's 521/522/523… included) or no connection at all — as
 * opposed to a 429 rate limit or a 4xx, which mean "the site is up, you
 * did something it didn't like". */
export function isApiDownError(err: unknown): boolean {
  const message = String(err);
  return /Network error|Failed to fetch|NetworkError/i.test(message) || /\b5\d\d\b/.test(message);
}
