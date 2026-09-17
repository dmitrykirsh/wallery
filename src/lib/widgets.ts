import { normalizeClockStyle, type ClockStyle } from "./clockStyle";

export type WidgetType = "clock";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  /** Tauri monitor `name` (a stable per-adapter device name on Windows) —
   * used to re-find the same physical monitor on restart. Null means "use
   * whatever monitor comes first" (falls back gracefully if the saved
   * monitor was unplugged). */
  monitorName: string | null;
  /** Position relative to the monitor's own origin, not absolute desktop
   * coordinates — so a saved widget still lands in the right spot on that
   * monitor even if the multi-monitor arrangement shifts things around. */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  style: ClockStyle;
}

const STORAGE_KEY = "wallery:widgets";

export function loadWidgets(): WidgetInstance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Widgets saved before the style editor existed have no `style` field —
    // normalize fills in the full default shape instead of leaving it undefined.
    return parsed.map((w) => ({ ...w, style: normalizeClockStyle(w.style) }));
  } catch {
    return [];
  }
}

export function saveWidgets(widgets: WidgetInstance[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}
