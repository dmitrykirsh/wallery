import { useEffect, useRef, useState } from "react";
import FilterBar from "../components/FilterBar";
import WallpaperGrid from "../components/WallpaperGrid";
import { defaultFilters } from "../lib/filters";
import { useRecommendationFeed } from "../lib/useRecommendationFeed";
import { bumpTagStats, excludeWallpaper } from "../lib/recommendationEngine";
import { useLang } from "../lib/LangContext";
import type { RecommendationSettings } from "../lib/recommendationSettings";
import type { Filters, Wallpaper } from "../lib/types";

interface Props {
  apiKey: string;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  recommendationSettings: RecommendationSettings;
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

/** The full "Wallery Recommendations" page — unlike the home row, its
 * category/purity/resolution/ratio/color filters are entirely its own
 * (a plain local Filters state driving the normal FilterBar), independent
 * from the Settings → recommendation filters, which only ever affect the
 * home feed. */
export default function Recommendations({ apiKey, nsfwAllowed, sketchyAllowed, recommendationSettings, isFavorite, onOpen, onToggleFavorite, onToast }: Props) {
  const { t } = useLang();
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [refreshTick, setRefreshTick] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const { wallpapers, terms, loading, loadingMore, loadMore, removeWallpaper } = useRecommendationFeed({
    apiKey,
    nsfwAllowed,
    sketchyAllowed,
    recommendationSettings,
    extraFilters: {
      categories: filters.categories,
      purities: filters.purities,
      atleast: filters.atleast,
      ratios: filters.ratios,
      colors: filters.colors,
    },
    refreshKey: refreshTick,
  });

  useEffect(() => {
    fetchingRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    function maybeLoadMore() {
      if (fetchingRef.current) return;
      loadMore();
    }

    const sentinel = sentinelRef.current;
    let observer: IntersectionObserver | null = null;
    if (sentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) maybeLoadMore();
        },
        { rootMargin: "2000px" },
      );
      observer.observe(sentinel);
    }

    const pollTimer = setInterval(() => {
      const rect = sentinelRef.current?.getBoundingClientRect();
      if (rect && rect.top < window.innerHeight + 2000) maybeLoadMore();
    }, 1500);

    return () => {
      clearInterval(pollTimer);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallpapers]);

  function upvote(wallpaper: Wallpaper) {
    bumpTagStats(wallpaper, "more");
    onToast(t("toast.recommendMore"));
  }

  function downvote(wallpaper: Wallpaper) {
    excludeWallpaper(wallpaper);
    removeWallpaper(wallpaper.id);
    onToast(t("toast.dontRecommend"));
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
          {t("recommendations.title")}
        </h1>
        <button
          onClick={() => setRefreshTick((n) => n + 1)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5" strokeLinecap="round" />
            <path d="M18 3v5h-5M6 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("recommendations.refresh")}
        </button>
      </div>

      <div className="sticky top-16 z-20 mb-5 py-2">
        <FilterBar filters={filters} onChange={setFilters} nsfwAllowed={nsfwAllowed} sketchyAllowed={sketchyAllowed} />
      </div>

      {loading && wallpapers.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
          {t("empty.loading")}
        </div>
      ) : terms.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
          {t("empty.recommendations")}
        </div>
      ) : (
        <>
          <WallpaperGrid
            wallpapers={wallpapers}
            isFavorite={isFavorite}
            onUpvote={upvote}
            onDownvote={downvote}
            upvoteTitle={t("recommendations.upvoteHint")}
            downvoteTitle={t("recommendations.downvoteHint")}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
            onToast={onToast}
          />
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-10 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
              {t("empty.loading")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
