import { useEffect, useRef, useState } from "react";
import FilterBar from "../components/FilterBar";
import WallpaperGrid from "../components/WallpaperGrid";
import ApiDownNotice from "../components/ApiDownNotice";
import { isApiDownError } from "../lib/connectivity";
import { searchWallpapers } from "../lib/api";
import { dedupeById } from "../lib/dedupe";
import { useLang } from "../lib/LangContext";
import type { Filters, Wallpaper } from "../lib/types";

interface Props {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  favoritesCount: number;
  onOpenFavorites: () => void;
  apiKey: string;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

export default function Results({
  filters,
  onFiltersChange,
  favoritesCount,
  onOpenFavorites,
  apiKey,
  nsfwAllowed,
  sketchyAllowed,
  isFavorite,
  onOpen,
  onToggleFavorite,
  onToast,
}: Props) {
  const { t, lang } = useLang();
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const requestKey = JSON.stringify(filters);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Guards against overlapping fetches for the same "next" page — from a
  // burst of intersection/scroll events, or from the periodic fallback poll
  // below firing while a fetch from the observer is already in flight.
  const fetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchWallpapers(filters, apiKey, 1)
      .then((res) => {
        if (cancelled) return;
        setWallpapers(dedupeById(res.data));
        setPage(1);
        setLastPage(res.meta.last_page);
        setTotal(res.meta.total);
      })
      .catch((err) => !cancelled && setError(String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, apiKey, retryNonce]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    let pollTimer: ReturnType<typeof setInterval>;

    function fetchNext() {
      if (fetchingRef.current || page >= lastPage) return;
      fetchingRef.current = true;
      const next = page + 1;
      setLoading(true);
      searchWallpapers(filters, apiKey, next)
        .then((res) => {
          if (cancelled) return;
          setWallpapers((prev) => dedupeById([...prev, ...res.data]));
          setPage(next);
        })
        .catch((err) => {
          if (cancelled) return;
          const message = String(err);
          // A rate-limit hit during fast scrolling shouldn't require the
          // user to nudge the scrollbar again to retry — it clears on its
          // own within a minute, so just wait and try the same page again.
          if (message.includes("429")) {
            retryTimer = setTimeout(() => {
              fetchingRef.current = false;
              fetchNext();
            }, 8000);
          } else {
            onToast(message);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
          fetchingRef.current = false;
        });
    }

    const sentinel = sentinelRef.current;
    let observer: IntersectionObserver | null = null;
    if (sentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) fetchNext();
        },
        { rootMargin: "2000px" },
      );
      observer.observe(sentinel);
    }

    // Defensive fallback in case an intersection/scroll event is ever
    // missed (e.g. a resize or layout change that doesn't fire one): check
    // periodically whether the sentinel is already on-screen.
    pollTimer = setInterval(() => {
      const rect = sentinelRef.current?.getBoundingClientRect();
      if (rect && rect.top < window.innerHeight + 2000) fetchNext();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(pollTimer);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lastPage, requestKey, apiKey]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="sticky top-16 z-20 mb-5 py-2">
        <FilterBar filters={filters} onChange={onFiltersChange} nsfwAllowed={nsfwAllowed} sketchyAllowed={sketchyAllowed} />
      </div>

      {!loading && !error && (
        <p className="mb-4 text-sm" style={{ color: "var(--color-ink-faint)", fontVariantNumeric: "tabular-nums" }}>
          {total.toLocaleString(lang)} {t("filter.found")}
        </p>
      )}

      {error && wallpapers.length === 0 && isApiDownError(error) ? (
        <ApiDownNotice
          error={error}
          favoritesCount={favoritesCount}
          onOpenFavorites={onOpenFavorites}
          onRetry={() => setRetryNonce((n) => n + 1)}
        />
      ) : (
        error && (
          <p className="mb-4 text-sm" style={{ color: "var(--color-accent-2)" }}>
            {error}
          </p>
        )
      )}

      <WallpaperGrid
        wallpapers={wallpapers}
        isFavorite={isFavorite}
        onOpen={onOpen}
        onToggleFavorite={onToggleFavorite}
        onToast={onToast}
      />

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="py-10 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
          {t("empty.loading")}
        </div>
      )}

      {!loading && wallpapers.length === 0 && !error && (
        <div className="py-16 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
          {t("empty.nothingFound")}
        </div>
      )}
    </div>
  );
}
