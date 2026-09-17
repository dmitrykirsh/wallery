import type { Adjustments } from "./photoFilters";

const STORAGE_KEY = "wallery:custom-filters";

export interface CustomFilter {
  id: string;
  name: string;
  adjust: Adjustments;
}

export function loadCustomFilters(): CustomFilter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomFilters(filters: CustomFilter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}
