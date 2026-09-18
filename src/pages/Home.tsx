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
import { excludeWallpaper, bumpTagStats } from "../lib/recommendationEngine";
import { useRecommendationFeed } from "../lib/useRecommendationFeed";
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
  onOpenRecommendations: () => void;
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
  onOpenRecommendations,
  onOpen,
  onToggleFavorite,
  onToast,
}: Props) {
  const { t } = useLang();
  const [hero, setHero] = useState<Wallpaper[]>([]);
  const [heroEmpty, setHeroEmpty] = useState(false);
  // A small in-memory cache per hero config so switching Hot/Toplist/Latest
  // shows the last-seen set instantly instead of blanking the whole widget
  // while a fresh fetch is in flight — it still refreshes silently behind it.
  const heroCache = useRef<Map<string, Wallpaper[]>>(new Map());
  // Tracks how far the background pool-growth has paged for the *current*
  // hero config, so switching config (or a stale in-flight tick) doesn't
  // keep paging the wrong pool.
  const heroGrowthRef = useRef<{ key: string; nextPage: number; lastPage: number }>({ key: "", nextPage: 1, lastPage: 1 });

  const {
    wallpapers: recWallpapers,
    loading: recLoading,
    loadingMore: recLoadingMore,
    loadMore: loadMoreRecommendations,
    removeWallpaper: removeRecWallpaper,
  } = useRecommendationFeed({
    apiKey,
    nsfwAllowed,
    sketchyAllowed,
    recommendationSettings,
    extraFilters: {
      categories: recommendationSettings.categories,
      purities: recommendationSettings.purities,
      atleast: recommendationSettings.atleast,
      ratios: recommendationSettings.ratios,
      colors: [],
    },
    refreshKey: favoritesVersion,
  });

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

  function recommendationContextMenu(wallpaper: Wallpaper): ContextMenuAction[] {
    return [
      {
        label: t("menu.recommendMore"),
        onClick: () => {
          bumpTagStats(wallpaper, "more");
          onToast(t("toast.recommendMore"));
        },
      },
      {
        label: t("menu.recommendLess"),
        onClick: () => {
          bumpTagStats(wallpaper, "less");
          onToast(t("toast.recommendLess"));
        },
      },
      {
        label: t("menu.dontRecommend"),
        danger: true,
        onClick: () => {
          excludeWallpaper(wallpaper);
          removeRecWallpaper(wallpaper.id);
          onToast(t("toast.dontRecommend"));
        },
      },
    ];
  }

  const heroLoading = hero.length === 0;

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
          title={t("home.recommendedForYou")}
          onTitleClick={onOpenRecommendations}
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
