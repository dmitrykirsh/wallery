import type { Sorting, Wallpaper } from "./types";
import type { RecommendationSettings } from "./recommendationSettings";
import { favoriteTags } from "./favorites";
import { getSearchHistory } from "./searchHistory";

const STATS_KEY = "wallery:rec-tag-stats";
/** Superseded by STATS_KEY (see migrateWeightsToStats) — kept only as a
 * migration source, never written to again. */
const LEGACY_WEIGHTS_KEY = "wallery:rec-tag-weights";
const EXCLUDED_KEY = "wallery:rec-excluded-ids";
const RECENT_KEY = "wallery:rec-recent-shown";
const BLOCKED_TAGS_KEY = "wallery:rec-blocked-tags";

const MAX_EXCLUDED = 500;
const MAX_RECENT = 150;
const REC_TERM_COUNT = 5;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Tag stats — Thompson Sampling
//
// Each tag carries a Beta(alpha, beta) posterior over "is this a tag the
// user wants more of". alpha accumulates positive evidence, beta negative.
// Recommending is then: draw one random sample per candidate tag from its
// own posterior, and take the tags with the highest samples. This is the
// standard Thompson Sampling bandit policy — it does its own
// exploration/exploitation balancing with no separate parameter, because a
// tag with a wide, uncertain posterior (few observations) still
// occasionally samples high even with a middling mean, while a tag with a
// tight, confidently-high posterior wins most of the time without needing
// to be forced to the top.
// ---------------------------------------------------------------------------

export interface TagStat {
  alpha: number;
  beta: number;
}

const NEUTRAL_STAT: TagStat = { alpha: 1, beta: 1 };

/** One-time migration from the old single-number weight to a Beta prior.
 *
 * The old weight was itself already "net signed evidence": +2 per
 * "recommend more", -2 per "recommend less", -1 per "don't recommend",
 * clamped to [-5, 8]. Treating |weight| directly as a pseudo-count of
 * evidence on whichever side it leans keeps the migration monotonic and
 * loses no information the old system had:
 *   alpha = 1 + max(0, weight)
 *   beta  = 1 + max(0, -weight)
 * weight = 0  -> alpha=1, beta=1  (uniform prior, mean 0.5 — matches the old
 *               neutral score of exactly 1 in the previous weighted sample)
 * weight = +2 -> alpha=3, beta=1  (mean 0.75, one clear positive signal)
 * weight = -2 -> alpha=1, beta=3  (mean 0.25, one clear negative signal)
 */
function migrateWeightToStat(weight: number): TagStat {
  return { alpha: 1 + Math.max(0, weight), beta: 1 + Math.max(0, -weight) };
}

function loadStats(): Record<string, TagStat> {
  const existing = localStorage.getItem(STATS_KEY);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch {
      return {};
    }
  }
  // Nothing migrated yet this browser profile — pull from the legacy
  // weights once, so existing feedback isn't silently discarded.
  const legacy = readJson<Record<string, number>>(LEGACY_WEIGHTS_KEY, {});
  const migrated: Record<string, TagStat> = {};
  for (const [tag, weight] of Object.entries(legacy)) migrated[tag] = migrateWeightToStat(weight);
  writeJson(STATS_KEY, migrated);
  return migrated;
}

export function getTagStats(): Record<string, TagStat> {
  return loadStats();
}

export function getTagStat(tag: string): TagStat {
  return getTagStats()[tag] ?? { ...NEUTRAL_STAT };
}

type FeedbackKind = "more" | "less" | "exclude";

/** How much a single feedback action moves alpha/beta. "exclude" ends up
 * roughly as strong as ~7 "recommend less" clicks — enough that the tag's
 * sampled score is rarely competitive, without an outright hard filter (the
 * image itself is still separately hard-blacklisted by id, see
 * excludeWallpaper — this is only the softer tag-level echo of that). */
const FEEDBACK_DELTA: Record<FeedbackKind, { alpha: number; beta: number }> = {
  more: { alpha: 2, beta: 0 },
  less: { alpha: 0, beta: 2 },
  exclude: { alpha: 0, beta: 15 },
};

/** Applies feedback to every tag on the wallpaper — "recommend more/less"
 * on one image is really feedback about the tags it carries, not the image
 * itself, so the effect generalizes to future recommendations. */
/** Applies feedback to one tag by name directly — used by the tag chip's
 * own "show more/less in recommendations" menu, where there's no wallpaper
 * in hand, only the tag. */
export function bumpTagStatByName(tagName: string, kind: FeedbackKind) {
  const stats = loadStats();
  const delta = FEEDBACK_DELTA[kind];
  const current = stats[tagName] ?? { ...NEUTRAL_STAT };
  stats[tagName] = { alpha: current.alpha + delta.alpha, beta: current.beta + delta.beta };
  writeJson(STATS_KEY, stats);
}

export function bumpTagStats(wallpaper: Wallpaper, kind: FeedbackKind) {
  for (const tag of wallpaper.tags ?? []) bumpTagStatByName(tag.name, kind);
}

// ---------------------------------------------------------------------------
// Random sampling — Gamma via Marsaglia & Tsang, Beta via two Gammas.
// No built-in in JS, and this needs to be an actual statistically-correct
// sampler (not a cheap approximation) since the whole point of Thompson
// Sampling is that the *shape* of the posterior, not just its mean, decides
// how often a tag wins.
// ---------------------------------------------------------------------------

function sampleStandardNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Marsaglia & Tsang (2000), "A Simple Method for Generating Gamma
 * Variables" — valid for shape > 0 (boosts shape < 1 via the standard
 * U^(1/shape) trick, since the rejection loop below only works for >= 1). */
export function sampleGamma(shape: number): number {
  if (shape < 1) {
    const u = Math.random();
    return sampleGamma(shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = sampleStandardNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

export function getExcludedIds(): Set<string> {
  return new Set(readJson<string[]>(EXCLUDED_KEY, []));
}

/** "Не рекомендовать" — hides this exact image from recommendations forever,
 * plus a strong (but not absolute) nudge against its tags via bumpTagStats. */
export function excludeWallpaper(wallpaper: Wallpaper) {
  const list = readJson<string[]>(EXCLUDED_KEY, []);
  if (!list.includes(wallpaper.id)) {
    list.unshift(wallpaper.id);
    writeJson(EXCLUDED_KEY, list.slice(0, MAX_EXCLUDED));
  }
  bumpTagStats(wallpaper, "exclude");
}

export function filterExcluded<T extends Wallpaper>(list: T[]): T[] {
  const excluded = getExcludedIds();
  return excluded.size === 0 ? list : list.filter((w) => !excluded.has(w.id));
}

/** A hard, user-managed blocklist of tag names — unlike bumpTagStats'
 * "exclude" (a strong but soft nudge), a blocked tag never gets picked as a
 * recommendation term, and any wallpaper carrying it gets dropped from
 * results even if it surfaced through a different, unblocked term. */
export function getBlockedTags(): Set<string> {
  return new Set(readJson<string[]>(BLOCKED_TAGS_KEY, []));
}

export function blockTag(tag: string) {
  const t = tag.trim().toLowerCase();
  if (!t) return;
  const list = readJson<string[]>(BLOCKED_TAGS_KEY, []);
  if (!list.includes(t)) writeJson(BLOCKED_TAGS_KEY, [...list, t]);
}

export function unblockTag(tag: string) {
  const list = readJson<string[]>(BLOCKED_TAGS_KEY, []);
  writeJson(BLOCKED_TAGS_KEY, list.filter((t) => t !== tag));
}

export function filterBlockedTags<T extends Wallpaper>(list: T[]): T[] {
  const blocked = getBlockedTags();
  if (blocked.size === 0) return list;
  return list.filter((w) => !(w.tags ?? []).some((tag) => blocked.has(tag.name.toLowerCase())));
}

/** Ring buffer of recently-shown wallpaper ids — recommendations prefer
 * anything NOT in here, which is what actually breaks the "same pictures
 * every time" feeling instead of just varying which tags get searched. */
export function recordShown(ids: string[]) {
  if (ids.length === 0) return;
  const list = readJson<string[]>(RECENT_KEY, []);
  const merged = [...ids, ...list.filter((id) => !ids.includes(id))];
  writeJson(RECENT_KEY, merged.slice(0, MAX_RECENT));
}

export function getRecentlyShown(): Set<string> {
  return new Set(readJson<string[]>(RECENT_KEY, []));
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

/** Replaces the old "always top-3 favorite tags + top-3 history" — those
 * were deterministic, so the row fetched the exact same query every time
 * and Wallhaven's relevance sort for a fixed query returns the exact same
 * page 1 every time too. Thompson Sampling draws one random score per
 * candidate tag from its own Beta posterior and takes the top N — the term
 * set varies between refreshes, weighted toward tags with good feedback,
 * without a separate exploration knob. */
export function pickRecommendationTerms(recSettings: RecommendationSettings): string[] {
  if (recSettings.useCustomTags && recSettings.customTags.length > 0) {
    return recSettings.customTags.slice(0, REC_TERM_COUNT);
  }
  const stats = getTagStats();
  const blocked = getBlockedTags();
  const candidates = [...new Set([...favoriteTags(), ...getSearchHistory()])].filter((tag) => !blocked.has(tag.toLowerCase()));
  if (candidates.length === 0) return [];
  const sampled = candidates.map((tag) => {
    const stat = stats[tag] ?? NEUTRAL_STAT;
    return { tag, score: sampleBeta(stat.alpha, stat.beta) };
  });
  sampled.sort((a, b) => b.score - a.score);
  return sampled.slice(0, REC_TERM_COUNT).map((s) => s.tag);
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
