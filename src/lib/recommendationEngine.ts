import type { Sorting, Wallpaper } from "./types";
import type { RecommendationSettings } from "./recommendationSettings";
import { favoriteTags } from "./favorites";
import { getSearchHistory } from "./searchHistory";

const WEIGHTS_KEY = "wallery:rec-tag-weights";
const EXCLUDED_KEY = "wallery:rec-excluded-ids";
const RECENT_KEY = "wallery:rec-recent-shown";

const MAX_EXCLUDED = 500;
const MAX_RECENT = 150;
const WEIGHT_MIN = -5;
const WEIGHT_MAX = 8;
const REC_TERM_COUNT = 5;

function readMap(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, number>) {
  localStorage.setItem(key, JSON.stringify(map));
}

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function getTagWeights(): Record<string, number> {
  return readMap(WEIGHTS_KEY);
}

/** Applies delta to every tag on the wallpaper — "рекомендовать чаще/реже"
 * on one image is really feedback about the tags it carries, not the image
 * itself, so the effect generalizes to future recommendations. */
export function bumpTagWeight(wallpaper: Wallpaper, delta: number) {
  const weights = readMap(WEIGHTS_KEY);
  for (const tag of wallpaper.tags ?? []) {
    weights[tag.name] = clamp((weights[tag.name] ?? 0) + delta, WEIGHT_MIN, WEIGHT_MAX);
  }
  writeMap(WEIGHTS_KEY, weights);
}

export function getExcludedIds(): Set<string> {
  return new Set(readList(EXCLUDED_KEY));
}

/** "Не рекомендовать" — hides this exact image from recommendations forever,
 * plus a small nudge against its tags (one dislike is weak evidence against
 * the tags too, but nowhere near as strong as an explicit "рекомендовать реже"). */
export function excludeWallpaper(wallpaper: Wallpaper) {
  const list = readList(EXCLUDED_KEY);
  if (!list.includes(wallpaper.id)) {
    list.unshift(wallpaper.id);
    writeList(EXCLUDED_KEY, list.slice(0, MAX_EXCLUDED));
  }
  bumpTagWeight(wallpaper, -1);
}

export function filterExcluded<T extends Wallpaper>(list: T[]): T[] {
  const excluded = getExcludedIds();
  return excluded.size === 0 ? list : list.filter((w) => !excluded.has(w.id));
}

/** Ring buffer of recently-shown wallpaper ids — recommendations prefer
 * anything NOT in here, which is what actually breaks the "same pictures
 * every time" feeling instead of just varying which tags get searched. */
export function recordShown(ids: string[]) {
  if (ids.length === 0) return;
  const list = readList(RECENT_KEY);
  const merged = [...ids, ...list.filter((id) => !ids.includes(id))];
  writeList(RECENT_KEY, merged.slice(0, MAX_RECENT));
}

export function getRecentlyShown(): Set<string> {
  return new Set(readList(RECENT_KEY));
}

/** Prefers wallpapers the user hasn't just been shown, but only when there's
 * enough unseen material to fill the row — otherwise a small result set
 * would collapse to almost nothing. */
export function preferUnseen<T extends Wallpaper>(list: T[]): T[] {
  const recent = getRecentlyShown();
  if (recent.size === 0) return list;
  const unseen = list.filter((w) => !recent.has(w.id));
  return unseen.length >= Math.min(list.length, 8) ? unseen : list;
}

/** Weighted sample without replacement — score is 1+weight (floored so a
 * suppressed tag never hits zero/negative probability outright, it just
 * becomes much less likely), so higher-weighted tags surface more often
 * without the pick being fully deterministic run to run. */
function weightedSample(candidates: string[], weights: Record<string, number>, count: number): string[] {
  const pool = candidates.map((tag) => ({ tag, score: Math.max(0.15, 1 + (weights[tag] ?? 0)) }));
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.score, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx].score;
      if (r <= 0) break;
    }
    picked.push(pool.splice(idx, 1)[0].tag);
  }
  return picked;
}

/** Replaces the old "always top-3 favorite tags + top-3 history" — those
 * were deterministic, so the row fetched the exact same query every time
 * and Wallhaven's relevance sort for a fixed query returns the exact same
 * page 1 every time too. Sampling from the *whole* favorites+history pool,
 * weighted by explicit feedback, means the term set itself now varies
 * between refreshes instead of only ever being the same handful of terms. */
export function pickRecommendationTerms(recSettings: RecommendationSettings): string[] {
  if (recSettings.useCustomTags && recSettings.customTags.length > 0) {
    return recSettings.customTags.slice(0, REC_TERM_COUNT);
  }
  const weights = getTagWeights();
  const candidates = [...new Set([...favoriteTags(), ...getSearchHistory()])].filter((tag) => (weights[tag] ?? 0) > WEIGHT_MIN);
  if (candidates.length === 0) return [];
  return weightedSample(candidates, weights, Math.min(REC_TERM_COUNT, candidates.length));
}

const SORT_POOL: Sorting[] = ["relevance", "relevance", "random", "date_added"];

/** Picking a fixed sort+page1 per term is exactly what made every refresh
 * look identical. Mostly relevance (so recommendations stay on-topic) but
 * with some random/date_added mixed in, plus a randomized page for
 * relevance itself, gives real variety without abandoning tag relevance. */
export function pickSortAndPage(): { sorting: Sorting; page: number } {
  const sorting = SORT_POOL[Math.floor(Math.random() * SORT_POOL.length)];
  const page = sorting === "relevance" ? 1 + Math.floor(Math.random() * 3) : 1;
  return { sorting, page };
}
