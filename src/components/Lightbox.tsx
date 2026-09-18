import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Tag, Wallpaper } from "../lib/types";
import { getWallpaper } from "../lib/api";
import WallpaperActions from "./WallpaperActions";
import FallbackImage from "./FallbackImage";
import EditPanel from "./EditPanel";
import ContextMenu, { type ContextMenuAction } from "./ContextMenu";
import { blockTag, bumpTagStatByName } from "../lib/recommendationEngine";
import { resolveSimilarQuery } from "../lib/similarSearch";
import { useLang } from "../lib/LangContext";
import { isTauri, openInBrowser } from "../lib/tauri";

const VIEW_MIN_ZOOM = 1;
const VIEW_MAX_ZOOM = 5;

interface Props {
  wallpaper: Wallpaper;
  apiKey: string;
  favorite: boolean;
  hasMultiple: boolean;
  /** Tag names already starred for recommendation favorites. */
  favoriteTags: string[];
  /** Toggles a tag in the recommendation-favorites list; returns the new starred state. */
  onToggleFavoriteTag: (tag: string) => boolean;
  /** Whether Settings → "use custom tags for recommendations" is currently
   * on — decides which toast wording to show after adding a tag. */
  myTagsEnabled: boolean;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTagClick: (tag: string) => void;
  /** Runs the resolved "similar" query through the normal search flow. */
  onFindSimilar: (query: string) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

export default function Lightbox({
  wallpaper,
  apiKey,
  favorite,
  hasMultiple,
  favoriteTags,
  onToggleFavoriteTag,
  myTagsEnabled,
  nsfwAllowed,
  sketchyAllowed,
  onClose,
  onNext,
  onPrev,
  onTagClick,
  onFindSimilar,
  onToggleFavorite,
  onToast,
}: Props) {
  const { t } = useLang();
  const [detail, setDetail] = useState<Wallpaper>(wallpaper);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [mainImageFailed, setMainImageFailed] = useState(false);
  const [tagMenu, setTagMenu] = useState<{ tag: Tag; pos: { x: number; y: number } } | null>(null);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [editFilter, setEditFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [viewZoom, setViewZoom] = useState(1);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const viewDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const viewContainerRef = useRef<HTMLDivElement>(null);

  function clampViewPan(p: { x: number; y: number }, zoom: number) {
    const el = viewContainerRef.current;
    const maxX = el ? (el.clientWidth * (zoom - 1)) / 2 : 0;
    const maxY = el ? (el.clientHeight * (zoom - 1)) / 2 : 0;
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  }

  // Ctrl + wheel zooms the main preview in and out, keeping whatever point
  // is under the cursor fixed in place — a plain wheel keeps scrolling the
  // page as normal, only the modifier repurposes it for zoom.
  function onViewWheel(e: React.WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const el = viewContainerRef.current;
    const nextZoom = Math.min(VIEW_MAX_ZOOM, Math.max(VIEW_MIN_ZOOM, viewZoom * (1 - e.deltaY * 0.0015)));
    if (el) {
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      setViewPan(
        clampViewPan(
          {
            x: cx - (cx - viewPan.x) * (nextZoom / viewZoom),
            y: cy - (cy - viewPan.y) * (nextZoom / viewZoom),
          },
          nextZoom,
        ),
      );
    }
    setViewZoom(nextZoom);
  }

  function onViewPointerDown(e: React.PointerEvent) {
    if (viewZoom <= 1) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    viewDragRef.current = { startX: e.clientX, startY: e.clientY, panX: viewPan.x, panY: viewPan.y };
  }
  function onViewPointerMove(e: React.PointerEvent) {
    if (!viewDragRef.current) return;
    const dx = e.clientX - viewDragRef.current.startX;
    const dy = e.clientY - viewDragRef.current.startY;
    setViewPan(clampViewPan({ x: viewDragRef.current.panX + dx, y: viewDragRef.current.panY + dy }, viewZoom));
  }
  function onViewPointerUp() {
    viewDragRef.current = null;
  }

  async function findSimilar() {
    if (findingSimilar) return;
    setFindingSimilar(true);
    try {
      const query = await resolveSimilarQuery(detail, {
        apiKey,
        categories: { general: true, anime: true, people: true },
        purities: { sfw: true, sketchy: sketchyAllowed, nsfw: nsfwAllowed },
      });
      if (query) {
        onFindSimilar(query);
      } else {
        onToast(t("lightbox.noSimilar"));
      }
    } finally {
      setFindingSimilar(false);
    }
  }

  function tagMenuActions(tag: Tag): ContextMenuAction[] {
    const isMyTag = favoriteTags.includes(tag.name);
    return [
      {
        label: isMyTag ? t("tag.removeFromMyTags") : t("tag.addToMyTags"),
        onClick: () => {
          const nowAdded = onToggleFavoriteTag(tag.name);
          if (!nowAdded) {
            onToast(t("tag.favRemoved"));
          } else {
            onToast(myTagsEnabled ? t("tag.favAdded") : t("tag.favAddedDisabled"));
          }
        },
      },
      {
        label: t("tag.showMore"),
        onClick: () => {
          bumpTagStatByName(tag.name, "more");
          onToast(t("toast.recommendMore"));
        },
      },
      {
        label: t("tag.showLess"),
        onClick: () => {
          bumpTagStatByName(tag.name, "less");
          onToast(t("toast.recommendLess"));
        },
      },
      {
        label: t("tag.blockTag"),
        danger: true,
        onClick: () => {
          blockTag(tag.name);
          onToast(`${t("tag.blocked")}: #${tag.name}`);
        },
      },
    ];
  }

  useEffect(() => {
    setDetail(wallpaper);
    setImgLoaded(false);
    setResolvedSrc(null);
    setMainImageFailed(false);
    setEditFilter("");
    setViewZoom(1);
    setViewPan({ x: 0, y: 0 });
    getWallpaper(wallpaper.id, apiKey)
      .then(setDetail)
      .catch(() => {});
  }, [wallpaper, apiKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasMultiple) onNext();
      if (e.key === "ArrowLeft" && hasMultiple) onPrev();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev, hasMultiple]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6" onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="glass-strong flex h-[92vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden rounded-3xl md:flex-row"
      >
        <div
          ref={viewContainerRef}
          className="relative flex flex-1 items-center justify-center overflow-hidden touch-none"
          style={{ background: "var(--color-bg)", cursor: viewZoom > 1 ? (viewDragRef.current ? "grabbing" : "grab") : undefined }}
          onWheel={onViewWheel}
          onPointerDown={onViewPointerDown}
          onPointerMove={onViewPointerMove}
          onPointerUp={onViewPointerUp}
          onPointerLeave={onViewPointerUp}
        >
          {!imgLoaded && (
            <img
              src={detail.thumbs.large}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-60 blur-sm"
            />
          )}
          <FallbackImage
            sources={[detail.path, detail.thumbs.original, detail.thumbs.large]}
            alt={detail.id}
            priority
            onLoad={() => setImgLoaded(true)}
            onFallback={() => onToast(t("toast.fallback"))}
            onResolvedSource={(url) => {
              setResolvedSrc(url);
              setMainImageFailed(false);
            }}
            onFailed={() => setMainImageFailed(true)}
            allowManualReload
            draggable={false}
            className="relative z-10 h-full w-full object-contain"
            style={{
              filter: editFilter || undefined,
              transform: viewZoom > 1 ? `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewZoom})` : undefined,
              transition: viewDragRef.current ? "none" : "transform 0.1s ease-out",
            }}
          />

          {hasMultiple && (
            <>
              <span
                role="button"
                onClick={onPrev}
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg backdrop-blur transition-colors"
                style={{ background: "rgba(20,18,25,0.7)", color: "var(--color-ink)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </span>
              <span
                role="button"
                onClick={onNext}
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg backdrop-blur transition-colors"
                style={{ background: "rgba(20,18,25,0.7)", color: "var(--color-ink)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 overflow-y-auto p-5 md:w-80">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              {detail.resolution}
            </span>
            <div className="flex items-center gap-3">
              <span role="button" onClick={() => openInBrowser(`https://wallhaven.cc/w/${detail.id}`)} title={t("lightbox.openInBrowser")} style={{ color: "var(--color-ink-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span role="button" onClick={() => onToggleFavorite(detail)} title={t("lightbox.favoriteHint")}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={favorite ? "var(--color-favorite)" : "none"}
                  stroke={favorite ? "var(--color-favorite)" : "var(--color-ink-muted)"}
                  strokeWidth="2"
                >
                  <path d="M12 21s-7.5-4.6-10-9.3C0.3 8 1.7 4 5.6 3.2 8 2.7 10.4 4 12 6.3 13.6 4 16 2.7 18.4 3.2 22.3 4 23.7 8 22 11.7 19.5 16.4 12 21 12 21Z" />
                </svg>
              </span>
              <span role="button" onClick={onClose} className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                ✕
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            <span className="rounded-md border px-2 py-1 capitalize" style={{ borderColor: "var(--color-border)" }}>
              {detail.category}
            </span>
            <span className="rounded-md border px-2 py-1 uppercase" style={{ borderColor: "var(--color-border)" }}>
              {detail.purity}
            </span>
            <span className="rounded-md border px-2 py-1" style={{ borderColor: "var(--color-border)" }}>
              {(detail.file_size / 1024 / 1024).toFixed(1)} {t("unit.mb")}
            </span>
          </div>

          <WallpaperActions wallpaper={detail} onToast={onToast} size="md" fill />

          <button
            onClick={findSimilar}
            disabled={findingSimilar}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="10" cy="10" r="6.5" />
              <path d="M15 15l5 5" strokeLinecap="round" />
            </svg>
            {findingSimilar ? t("lightbox.findingSimilar") : t("lightbox.findSimilar")}
          </button>

          <div className="flex shrink-0 flex-wrap gap-1.5">
            {(detail.tags ?? []).map((tag) => (
              <motion.span
                key={tag.id}
                role="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => onTagClick(tag.name)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTagMenu({ tag, pos: { x: e.clientX, y: e.clientY } });
                }}
                title={t("tag.hint")}
                className="flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
              >
                #{tag.name}
              </motion.span>
            ))}
          </div>

          <ContextMenu pos={tagMenu?.pos ?? null} actions={tagMenu ? tagMenuActions(tagMenu.tag) : []} onClose={() => setTagMenu(null)} />

          {isTauri() && (
            <div className="flex shrink-0 flex-col gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
              <span
                role="button"
                onClick={() => setEditOpen((o) => !o)}
                className="flex items-center justify-between text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--color-ink-faint)" }}
              >
                {t("edit.title")}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: editOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease-out" }}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>

              {editOpen &&
                (resolvedSrc ? (
                  <EditPanel wallpaper={detail} src={resolvedSrc} onToast={onToast} onFilterChange={setEditFilter} />
                ) : (
                  <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                    {mainImageFailed ? t("lightbox.notLoaded") : t("empty.loading")}
                  </p>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
