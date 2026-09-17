import type { ClockStyle } from "./clockStyle";

const STORAGE_KEY = "wallery:custom-clock-styles";

export interface CustomClockStyle {
  id: string;
  name: string;
  style: ClockStyle;
}

export function loadCustomClockStyles(): CustomClockStyle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomClockStyles(styles: CustomClockStyle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
}
