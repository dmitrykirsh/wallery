export interface FontOption {
  id: string;
  label: string;
  /** CSS font-family value, including sane fallbacks — used as-is even if
   * the Google Font below fails to load (offline, blocked network). */
  family: string;
  /** Google Fonts `family` query param, e.g. "Orbitron:wght@500;700".
   * Omitted for fonts that are already common system fonts. */
  googleFont?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "inter", label: "Inter", family: "'Inter', system-ui, sans-serif" },
  { id: "system", label: "System UI", family: "system-ui, 'Segoe UI', sans-serif" },
  { id: "georgia", label: "Georgia", family: "Georgia, 'Times New Roman', serif" },
  { id: "consolas", label: "Consolas", family: "Consolas, 'Courier New', monospace" },
  { id: "mono", label: "JetBrains Mono", family: "'JetBrains Mono', Consolas, monospace", googleFont: "JetBrains+Mono:wght@400;600;700" },
  { id: "orbitron", label: "Orbitron", family: "'Orbitron', sans-serif", googleFont: "Orbitron:wght@500;700" },
  { id: "playfair", label: "Playfair Display", family: "'Playfair Display', Georgia, serif", googleFont: "Playfair+Display:wght@500;700" },
  { id: "bebas", label: "Bebas Neue", family: "'Bebas Neue', sans-serif", googleFont: "Bebas+Neue" },
  { id: "oswald", label: "Oswald", family: "'Oswald', sans-serif", googleFont: "Oswald:wght@400;600" },
  { id: "pacifico", label: "Pacifico", family: "'Pacifico', cursive", googleFont: "Pacifico" },
];

const loaded = new Set<string>();

/** Injects a Google Fonts stylesheet link once per family. Fonts already
 * cached from a previous injection are skipped. Failing silently (offline,
 * blocked) is fine — every FontOption's `family` already lists a normal
 * system fallback, so the clock still renders, just without the flourish. */
export function ensureGoogleFont(googleFont: string | undefined) {
  if (!googleFont || loaded.has(googleFont)) return;
  loaded.add(googleFont);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${googleFont}&display=swap`;
  document.head.appendChild(link);
}

export function fontFamilyFor(fontId: string): string {
  return FONT_OPTIONS.find((f) => f.id === fontId)?.family ?? FONT_OPTIONS[0].family;
}
