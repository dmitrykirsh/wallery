import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import HeroCarousel from "../components/HeroCarousel";
import TagCloud from "../components/TagCloud";
import TagRowFeed from "../components/TagRowFeed";
import WallpaperRow from "../components/WallpaperRow";
import type { ContextMenuAction } from "../components/ContextMenu";
import { searchWallpapers } from "../lib/api";
import { defaultFilters } from "../lib/filters";
import { dedupeById } from "../lib/dedupe";
import {
  pickRecommendationTerms,
  pickSortAndPage,
  filterExcluded,
  preferUnseen,
  recordShown,
  excludeWallpaper,
  bumpTagWeight,
} from "../lib/recommendationEngine";
import { useLang } from "../lib/LangContext";
import type { HeroMode, HeroSettings } from "../lib/heroSettings";
import type { RecommendationSettings } from "../lib/recommendationSettings";
import type { Filters, Sorting, TopRange, Wallpaper } from "../lib/types";

interface Props {
  apiKey: string;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  heroSettings: HeroSettings;
  recommendationSettings: RecommendationSettings;
  favoritesVersion: number;
  isFavorite: (id: string) => boolean;
  onSelectTag: (tag: string) => void;
  onQuickSort: (sorting: Sorting, topRange?: TopRange) => void;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

const QUICK_LINKS: { key: "quick.latest" | "quick.hot" | "quick.toplist" | "quick.random"; sorting: Sorting; topRange?: TopRange; icon: string }[] = [
  { key: "quick.latest", sorting: "date_added", icon: "M12 7v5l3 2" },
  { key: "quick.hot", sorting: "toplist", topRange: "1w", icon: "M12 3c3 3 5 6 5 9a5 5 0 1 1-10 0c0-1 .3-2 1-3 .3 1.5 1 2 1 2 0-2.5 1.5-4 3-6Z" },
  { key: "quick.toplist", sorting: "toplist", topRange: "1y", icon: "M6 20V10M12 20V4M18 20v-7" },
  { key: "quick.random", sorting: "random", icon: "M4 4h4l12 16h-4L4 4ZM16 4h4v4M20 16v4h-4" },
];

const HERO_MODES: { key: HeroMode; label: "quick.hot" | "quick.toplist" | "quick.latest" | "quick.custom" }[] = [
  { key: "hot", label: "quick.hot" },
  { key: "toplist", label: "quick.toplist" },
  { key: "latest", label: "quick.latest" },
  { key: "custom", label: "quick.custom" },
];

function heroCacheKey(h: HeroSettings): string {
  return h.mode === "custom" ? `custom:${h.customQuery}:${h.customSorting}` : h.mode;
}

function heroFilters(h: HeroSettings): Filters {
  const purities = { sfw: true, sketchy: h.sketchyEnabled, nsfw: h.nsfwEnabled };
  if (h.mode === "latest") return { ...defaultFilters(), purities, sorting: "date_added" };
  if (h.mode === "toplist") return { ...defaultFilters(), purities, sorting: "toplist", topRange: "1y" };
  if (h.mode === "custom") return { ...defaultFilters(), purities, query: h.customQuery, sorting: h.customSorting };
  return { ...defaultFilters(), purities, sorting: "toplist", topRange: "1w" };
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

interface TermPaging {
  page: number;
  lastPage: number;
  sorting: Sorting;
}

// Fetching only a handful of pages meant the hero kept reshuffling through
// the same small pool for the whole session. Pull a moderate initial pool
// (kept modest since this fires as a burst alongside the recommendation
// row's own requests the instant Home mounts), then keep quietly fetching
// further pages in the background so the pool keeps growing the longer the
// banner stays open — well within Wallhaven's rate limit at one extra
// request every 45s.
const HERO_INITIAL_PAGES = 4;
const HERO_GROWTH_INTERVAL_MS = 45000;
const HERO_MAX_POOL = 400;

export default function Home({
  apiKey,
  nsfwAllowed,
  sketchyAllowed,
  heroSettings,
  recommendationSettings,
  favoritesVersion,
  isFavorite,
  onSelectTag,
  onQuickSort,
  onOpen,
  onToggleFavorite,
  onToast,
}: Props) {
  const { t } = useLang();
  const [hero, setHero] = useState<Wallpaper[]>([]);
  const [heroEmpty, setHeroEmpty] = useState(false);
  const [recTerms, setRecTerms] = useState<string[]>([]);
  const [recWallpapers, setRecWallpapers] = useState<Wallpaper[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [recLoadingMore, setRecLoadingMore] = useState(false);
  // A small in-memory cache per hero config so switching Hot/Toplist/Latest
  // shows the last-seen set instantly instead of blanking the whole widget
  // while a fresh fetch is in flight — it still refreshes silently behind it.
  const heroCache = useRef<Map<string, Wallpaper[]>>(new Map());
  // Tracks how far the background pool-growth has paged for the *current*
  // hero config, so switching config (or a stale in-flight tick) doesn't
  // keep paging the wrong pool.
  const heroGrowthRef = useRef<{ key: string; nextPage: number; lastPage: number }>({ key: "", nextPage: 1, lastPage: 1 });
  // Per-term pagination for "load more" — each recommendation term is
  // fetched (and paginated) independently and merged, rather than ANDed
  // into one combined query, which would both starve the total result
  // count and often return zero matches outright.
  const recPagingRef = useRef<Record<string, TermPaging>>({});

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const key = heroCacheKey(heroSettings);
    const cached = heroCache.current.get(key);
    setHero(cached ?? []);
    setHeroEmpty(false);
    const filters = heroFilters(heroSettings);
    const pages = Array.from({ length: HERO_INITIAL_PAGES }, (_, i) => i + 1);

    function attempt() {
      Promise.all(
        pages.map((page) =>
          searchWallpapers(filters, apiKey, page)
            .then((res) => ({ ok: true as const, res }))
            .catch(() => ({ ok: false as const })),
        ),
      ).then((results) => {
        if (cancelled) return;
        const succeeded = results.flatMap((r) => (r.ok ? [r.res] : []));
        // Every single page request failing (rate limit, transient network
        // blip — a burst of 8 concurrent requests is exactly the kind of
        // thing that trips Wallhaven's limiter) is NOT the same as a
        // genuinely empty result. Treating it as "nothing found" was the
        // actual bug — it should just quietly retry instead.
        if (succeeded.length === 0) {
          retryTimer = setTimeout(attempt, 6000);
          return;
        }
        const fresh = dedupeById(succeeded.flatMap((r) => r.data));
        heroGrowthRef.current = { key, nextPage: HERO_INITIAL_PAGES + 1, lastPage: succeeded[0].meta.last_page };
        if (fresh.length === 0) {
          // A genuinely empty result (e.g. a typo'd custom tag) shouldn't
          // leave the banner spinning forever with no explanation — but
          // only report that if there's nothing cached to fall back on.
          if (!cached) setHeroEmpty(true);
          return;
        }
        heroCache.current.set(key, fresh);
        setHero(fresh);
      });
    }

    attempt();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [apiKey, heroSettings]);

  // Keeps quietly paging further into the result set every so often, so a
  // long-running session sees a continuously widening pool instead of
  // reshuffling through the same initial batch forever.
  useEffect(() => {
    const key = heroCacheKey(heroSettings);
    let cancelled = false;
    const filters = heroFilters(heroSettings);

    const interval = setInterval(() => {
      const state = heroGrowthRef.current;
      if (state.key !== key || state.nextPage > state.lastPage) return;
      const page = state.nextPage;
      searchWallpapers(filters, apiKey, page)
        .then((res) => {
          if (cancelled || heroGrowthRef.current.key !== key) return;
          heroGrowthRef.current = { key, nextPage: page + 1, lastPage: res.meta.last_page };
          if (res.data.length === 0) return;
          setHero((prev) => {
            const merged = dedupeById([...prev, ...res.data]).slice(0, HERO_MAX_POOL);
            heroCache.current.set(key, merged);
            return merged;
          });
        })
        .catch(() => {});
    }, HERO_GROWTH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiKey, heroSettings]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const terms = pickRecommendationTerms(recommendationSettings);
    recPagingRef.current = {};
    setRecTerms(terms);
    setRecWallpapers([]);
    if (terms.length === 0) {
      setRecLoading(false);
      return;
    }
    setRecLoading(true);
    const purities = { sfw: true, sketchy: sketchyAllowed, nsfw: nsfwAllowed };

    function attempt() {
      const picks = terms.map((term) => ({ term, ...pickSortAndPage() }));
      Promise.all(
        picks.map(({ term, sorting, page }) =>
          searchWallpapers({ ...defaultFilters(), query: term, purities, sorting }, apiKey, page)
            .then((res) => ({ ok: true as const, term, sorting, page, res }))
            .catch(() => ({ ok: false as const, term })),
        ),
      ).then((results) => {
        if (cancelled) return;
        const succeeded = results.flatMap((r) => (r.ok ? [r] : []));
        // Every term failing at once (rate limit, network blip) isn't the
        // same as "no recommendations" — that was the actual bug behind
        // the row silently disappearing. Retry instead of settling on empty.
        if (succeeded.length === 0) {
          retryTimer = setTimeout(attempt, 6000);
          return;
        }
        for (const r of succeeded) recPagingRef.current[r.term] = { page: r.page, lastPage: r.res.meta.last_page, sorting: r.sorting };
        const merged = filterExcluded(dedupeById(interleave(succeeded.map((r) => r.res.data))));
        const shown = preferUnseen(merged);
        recordShown(shown.map((w) => w.id));
        setRecWallpapers(shown);
        setRecLoading(false);
      });
    }

    attempt();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesVersion, apiKey, nsfwAllowed, sketchyAllowed, recommendationSettings]);

  function loadMoreRecommendations() {
    if (recLoadingMore) return;
    const pending = recTerms.filter((term) => {
      const paging = recPagingRef.current[term];
      return paging && paging.page < paging.lastPage;
    });
    if (pending.length === 0) return;
    setRecLoadingMore(true);
    const purities = { sfw: true, sketchy: sketchyAllowed, nsfw: nsfwAllowed };
    Promise.all(
      pending.map((term) => {
        const paging = recPagingRef.current[term];
        const next = paging.page + 1;
        return searchWallpapers({ ...defaultFilters(), query: term, purities, sorting: paging.sorting }, apiKey, next)
          .then((res) => {
            recPagingRef.current[term] = { ...paging, page: next, lastPage: res.meta.last_page };
            return res.data;
          })
          .catch(() => []);
      }),
    )
      .then((results) => {
        const fresh = filterExcluded(interleave(results));
        recordShown(fresh.map((w) => w.id));
        setRecWallpapers((prev) => dedupeById([...prev, ...fresh]));
      })
      .finally(() => setRecLoadingMore(false));
  }

  function recommendationContextMenu(wallpaper: Wallpaper): ContextMenuAction[] {
    return [
      {
        label: t("menu.recommendMore"),
        onClick: () => {
          bumpTagWeight(wallpaper, 2);
          onToast(t("toast.recommendMore"));
        },
      },
      {
        label: t("menu.recommendLess"),
        onClick: () => {
          bumpTagWeight(wallpaper, -2);
          onToast(t("toast.recommendLess"));
        },
      },
      {
        label: t("menu.dontRecommend"),
        danger: true,
        onClick: () => {
          excludeWallpaper(wallpaper);
          setRecWallpapers((prev) => prev.filter((w) => w.id !== wallpaper.id));
          onToast(t("toast.dontRecommend"));
        },
      },
    ];
  }

  const heroLoading = hero.length === 0;
  const recTitle = recTerms.length ? `${t("home.recommendedForYou")} · ${recTerms.map((term) => `#${term}`).join(" ")}` : t("home.moreTags");

  return (
    <div className="py-6">
      <div className="mb-10 w-full">
        {heroEmpty ? (
          <div className="flex h-[560px] w-full items-center justify-center text-center text-sm" style={{ background: "var(--color-surface)", color: "var(--color-ink-faint)" }}>
            {t("home.heroEmpty")}
          </div>
        ) : heroLoading ? (
          <div className="h-[560px] w-full animate-pulse" style={{ background: "var(--color-surface)" }} />
        ) : (
          <HeroCarousel
            wallpapers={hero}
            label={heroSettings.mode === "custom" ? heroSettings.customQuery || t("quick.custom") : t(HERO_MODES.find((m) => m.key === heroSettings.mode)!.label)}
            onOpen={onOpen}
            onToast={onToast}
          />
        )}
      </div>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {QUICK_LINKS.map((link) => (
            <motion.span
              key={link.key}
              whileTap={{ scale: 0.95 }}
              role="button"
              className="chip"
              onClick={() => onQuickSort(link.sorting, link.topRange)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={link.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t(link.key)}
            </motion.span>
          ))}
        </div>

        <WallpaperRow
          title={recTitle}
          wallpapers={recWallpapers}
          loading={recLoading}
          loadingMore={recLoadingMore}
          onReachEnd={loadMoreRecommendations}
          contextMenuActions={recommendationContextMenu}
          isFavorite={isFavorite}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
          onToast={onToast}
        />

        <h2 className="mb-4 text-center text-sm font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
          {t("home.findByTag")}
        </h2>
        <div className="mb-10">
          <TagCloud onSelect={onSelectTag} includeNsfw={nsfwAllowed} />
        </div>

        <TagRowFeed
          apiKey={apiKey}
          nsfwAllowed={nsfwAllowed}
          sketchyAllowed={sketchyAllowed}
          onSelectTag={onSelectTag}
          isFavorite={isFavorite}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
          onToast={onToast}
        />
      </div>
    </div>
  );
}
