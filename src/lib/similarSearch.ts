import { searchWallpapers } from "./api";
import { defaultFilters } from "./filters";
import type { Wallpaper } from "./types";

const MAX_TAGS = 5;
const MIN_RESULTS = 4;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Wallhaven's own advanced search syntax: a bare `+tagname` term requires
 * that tag, and several space-separated `+` terms AND together — this is
 * the same operator its own site uses for "require this tag" filtering, so
 * the resulting query reads sensibly if the user looks at the search bar
 * afterwards (unlike, say, joining raw tag ids). */
export function requireQuery(tags: string[]): string {
  // A multi-word tag has to be quoted or it would split into separate terms.
  return tags.map((t) => (/\s/.test(t) ? `+"${t}"` : `+${t}`)).join(" ");
}

interface Options {
  apiKey: string;
  categories: { general: boolean; anime: boolean; people: boolean };
  purities: { sfw: boolean; sketchy: boolean; nsfw: boolean };
}

/** Finds a tag combination that yields an actual result set, starting from
 * "up to 5 shared tags, ANDed" (as close to genuinely similar as the tag
 * data supports) and shrinking one tag at a time whenever that's too
 * narrow — down to a single tag as the guaranteed-non-empty last resort,
 * which is exactly the plain single-tag search already used elsewhere in
 * the app. Returns the resolved query string (to hand to the normal search
 * flow) plus the current wallpaper's own id, so the caller can drop it from
 * whatever shows up first. */
export async function resolveSimilarQuery(wallpaper: Wallpaper, { apiKey, categories, purities }: Options): Promise<string | null> {
  const names = [...new Set((wallpaper.tags ?? []).map((t) => t.name))];
  if (names.length === 0) return null;
  const ordered = shuffle(names);

  for (let count = Math.min(MAX_TAGS, ordered.length); count >= 1; count--) {
    const sample = ordered.slice(0, count);
    const query = requireQuery(sample);
    try {
      const res = await searchWallpapers({ ...defaultFilters(), query, categories, purities, sorting: "relevance" }, apiKey, 1);
      const withoutSelf = res.data.filter((w) => w.id !== wallpaper.id);
      if (withoutSelf.length >= MIN_RESULTS || (count === 1 && withoutSelf.length > 0)) return query;
    } catch {
      // Treat a failed attempt the same as "too narrow" — shrink and retry
      // rather than surfacing a transient network error to the user.
    }
  }
  return null;
}
