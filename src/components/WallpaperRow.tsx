import { useEffect, useRef } from "react";
import type { Wallpaper } from "../lib/types";
import WallpaperCard from "./WallpaperCard";

const ROW_HEIGHT = 190;

interface Props {
  title: string;
  wallpapers: Wallpaper[];
  loading?: boolean;
  loadingMore?: boolean;
  /** Fired when the user scrolls near the right edge — lets the row load more items. */
  onReachEnd?: () => void;
  /** When set, the title becomes clickable (e.g. a "#tag" row title runs that tag's search). */
  onTitleClick?: () => void;
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

export default function WallpaperRow({
  title,
  wallpapers,
  loading,
  loadingMore,
  onReachEnd,
  onTitleClick,
  isFavorite,
  onOpen,
  onToggleFavorite,
  onToast,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(dx: number) {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || !onReachEnd) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 400) onReachEnd();
  }

  // Lets the row scroll horizontally with a plain vertical mouse wheel while
  // hovered. React's onWheel is passive, so preventDefault has to happen via
  // a manually-attached non-passive listener instead. Runs unconditionally
  // (before the early return below) so hook order never changes between renders.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el!.scrollLeft += e.deltaY;
        handleScroll();
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReachEnd]);

  if (!loading && wallpapers.length === 0) return null;

  return (
    <div className="group/row relative mb-8">
      <h2
        role={onTitleClick ? "button" : undefined}
        onClick={onTitleClick}
        className={`mb-3 text-sm font-medium uppercase tracking-wide transition-colors ${onTitleClick ? "cursor-pointer hover:!text-[var(--color-accent)]" : ""}`}
        style={{ color: "var(--color-ink-faint)" }}
      >
        {title}
      </h2>

      <span
        role="button"
        onClick={() => scrollBy(-ROW_HEIGHT * 2)}
        className="glass absolute -left-3 top-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full opacity-0 shadow-lg transition-opacity group-hover/row:opacity-100"
        style={{ color: "var(--color-ink)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </span>
      <span
        role="button"
        onClick={() => scrollBy(ROW_HEIGHT * 2)}
        className="glass absolute -right-3 top-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full opacity-0 shadow-lg transition-opacity group-hover/row:opacity-100"
        style={{ color: "var(--color-ink)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </span>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex gap-3 overflow-x-auto pb-1"
        style={{ height: ROW_HEIGHT }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 animate-pulse rounded-2xl"
                style={{ background: "var(--color-surface)", height: ROW_HEIGHT, width: ROW_HEIGHT * 1.6 }}
              />
            ))
          : wallpapers.map((w) => (
              <WallpaperCard
                key={w.id}
                wallpaper={w}
                favorite={isFavorite(w.id)}
                fixedHeight={ROW_HEIGHT}
                onOpen={(wallpaper) => onOpen(wallpaper, wallpapers)}
                onToggleFavorite={onToggleFavorite}
                onToast={onToast}
              />
            ))}
        {loadingMore && (
          <div className="shrink-0 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)", height: ROW_HEIGHT, width: ROW_HEIGHT * 1.6 }} />
        )}
      </div>
    </div>
  );
}
