import { useEffect, useRef, useState } from "react";
import { searchWallpapers } from "./api";
import { defaultFilters } from "./filters";
import { dedupeById } from "./dedupe";
import { pickRecommendationTerms, pickSortAndPage, filterExcluded, filterBlockedTags, preferUnseen, recordShown } from "./recommendationEngine";
import type { RecommendationSettings } from "./recommendationSettings";
import type { Order, Sorting, TopRange, Wallpaper } from "./types";

/** The part of a search Filters shape that's user-adjustable for a
 * recommendation feed — everything else (query, sorting, colors, order,
 * topRange) is either the term itself or picked internally for variety. */
export interface RecommendationExtraFilters {
  categories: { general: boolean; anime: boolean; people: boolean };
  purities: { sfw: boolean; sketchy: boolean; nsfw: boolean };
  atleast: string | null;
  ratios: string[];
  colors: string[];
}

/** A sort the user picked explicitly — replaces the per-term randomized
 * sort, so the feed actually follows the page's sort control. */
export interface RecommendationSort {
  sorting: Sorting;
  order: Order;
  topRange: TopRange;
}

interface TermPaging {
  page: number;
  lastPage: number;
  sorting: Sorting;
}

/** Concatenating each term's whole page (term1 x10, then term2 x10, ...)
 * reads like separate blocks; interleaving mixes them into one feed. */
function interleave<T>(lists: T[][]): T[] {
  const result: T[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) if (list[i] !== undefined) result.push(list[i]);
  }
  return result;
}

interface Params {
  apiKey: string;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  recommendationSettings: RecommendationSettings;
  extraFilters: RecommendationExtraFilters;
  /** Bump this (e.g. favorites count) to force the term set to be
   * re-picked — favoriting something is itself a signal worth reacting to. */
  refreshKey?: unknown;
  /** Null keeps the default mixed, randomized per-term sort. */
  sort?: RecommendationSort | null;
}

/** Shared by the home page's "Wallery Recommendations" row and the full
 * recommendations page — picks recommendation terms (Thompson Sampling over
 * favorites+history tags, or the user's pinned custom tags), fetches each
 * one's own page with its own randomized sort (see pickSortAndPage), and
 * merges the results. Each term is paginated independently rather than
 * ANDed into one combined query, which would both starve the total result
 * count and often return zero matches outright. */
export function useRecommendationFeed({ apiKey, nsfwAllowed, sketchyAllowed, recommendationSettings, extraFilters, refreshKey, sort = null }: Params) {
  const [terms, setTerms] = useState<string[]>([]);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pagingRef = useRef<Record<string, TermPaging>>({});
  const extraKey = JSON.stringify(extraFilters);
  const sortKey = JSON.stringify(sort);
  const sortParams = sort ? { order: sort.order, topRange: sort.topRange } : {};

  const purities = {
    // The feed's own purity filter narrows further, but never loosens —
    // sketchy/nsfw still can't show up if the user hasn't allowed them
    // globally in Settings.
    sfw: true,
    sketchy: sketchyAllowed && extraFilters.purities.sketchy,
    nsfw: nsfwAllowed && extraFilters.purities.nsfw,
  };

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const pickedTerms = pickRecommendationTerms(recommendationSettings);
    pagingRef.current = {};
    setTerms(pickedTerms);
    setWallpapers([]);
    if (pickedTerms.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    function attempt() {
      const picks = pickedTerms.map((term) => ({ term, ...(sort ? { sorting: sort.sorting, page: 1 } : pickSortAndPage()) }));
      Promise.all(
        picks.map(({ term, sorting, page }) =>
          searchWallpapers({ ...defaultFilters(), query: term, categories: extraFilters.categories, atleast: extraFilters.atleast, ratios: extraFilters.ratios, colors: extraFilters.colors, purities, sorting, ...sortParams }, apiKey, page)
            .then((res) => ({ ok: true as const, term, sorting, page, res }))
            .catch(() => ({ ok: false as const, term })),
        ),
      ).then((results) => {
        if (cancelled) return;
        const succeeded = results.flatMap((r) => (r.ok ? [r] : []));
        // Every term failing at once (rate limit, network blip) isn't the
        // same as "no recommendations" — retry instead of settling on empty.
        if (succeeded.length === 0) {
          retryTimer = setTimeout(attempt, 6000);
          return;
        }
        for (const r of succeeded) pagingRef.current[r.term] = { page: r.page, lastPage: r.res.meta.last_page, sorting: r.sorting };
        const merged = filterBlockedTags(filterExcluded(dedupeById(interleave(succeeded.map((r) => r.res.data)))));
        const shown = preferUnseen(merged);
        recordShown(shown.map((w) => w.id));
        setWallpapers(shown);
        setLoading(false);
      });
    }

    attempt();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, apiKey, nsfwAllowed, sketchyAllowed, recommendationSettings, extraKey, sortKey]);

  function loadMore() {
    if (loadingMore) return;
    const pending = terms.filter((term) => {
      const paging = pagingRef.current[term];
      return paging && paging.page < paging.lastPage;
    });
    if (pending.length === 0) return;
    setLoadingMore(true);
    Promise.all(
      pending.map((term) => {
        const paging = pagingRef.current[term];
        const next = paging.page + 1;
        return searchWallpapers({ ...defaultFilters(), query: term, categories: extraFilters.categories, atleast: extraFilters.atleast, ratios: extraFilters.ratios, colors: extraFilters.colors, purities, sorting: paging.sorting, ...sortParams }, apiKey, next)
          .then((res) => {
            pagingRef.current[term] = { ...paging, page: next, lastPage: res.meta.last_page };
            return res.data;
          })
          .catch(() => []);
      }),
    )
      .then((results) => {
        const fresh = filterBlockedTags(filterExcluded(interleave(results)));
        recordShown(fresh.map((w) => w.id));
        setWallpapers((prev) => dedupeById([...prev, ...fresh]));
      })
      .finally(() => setLoadingMore(false));
  }

  function removeWallpaper(id: string) {
    setWallpapers((prev) => prev.filter((w) => w.id !== id));
  }

  return { terms, wallpapers, loading, loadingMore, loadMore, removeWallpaper };
}
