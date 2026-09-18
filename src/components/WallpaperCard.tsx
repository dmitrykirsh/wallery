import { useState } from "react";
import { motion } from "framer-motion";
import type { Wallpaper } from "../lib/types";
import WallpaperActions from "./WallpaperActions";
import FallbackImage from "./FallbackImage";
import ContextMenu, { type ContextMenuAction } from "./ContextMenu";
import { useLang } from "../lib/LangContext";

interface Props {
  wallpaper: Wallpaper;
  favorite: boolean;
  /** When set, the card has this fixed height and a width computed from the
   * image's aspect ratio (used in horizontal filmstrip rows) instead of a
   * fixed width with a variable aspect-ratio height (used in the masonry grid). */
  fixedHeight?: number;
  /** When provided, right-clicking the card shows these as a context menu
   * instead of the browser's default one — used by the recommendation row
   * for "не рекомендовать / реже / чаще". */
  contextMenuActions?: (wallpaper: Wallpaper) => ContextMenuAction[];
  /** When provided, shows a simple like/dislike pair — used on the full
   * Wallery Recommendations page as a quicker alternative to the right-click
   * menu. Upvote reinforces the wallpaper's tags; downvote hides it and
   * nudges its tags down, same as "не рекомендовать". */
  onUpvote?: (wallpaper: Wallpaper) => void;
  onDownvote?: (wallpaper: Wallpaper) => void;
  upvoteTitle?: string;
  downvoteTitle?: string;
  onOpen: (wallpaper: Wallpaper) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

// A quiet purity indicator right on the card — muted, not the loud filter-pill
// colors, since this needs to sit on every single thumbnail without shouting.
// The badge label carries the meaning; the border is a secondary color cue,
// never the only one (color alone doesn't reach colorblind/low-vision users).
const PURITY_BADGE: Record<string, { border: string; label: string }> = {
  sketchy: { border: "#c9963d", label: "S" },
  nsfw: { border: "#c05a3e", label: "18+" },
};

export default function WallpaperCard({
  wallpaper,
  favorite,
  fixedHeight,
  contextMenuActions,
  onUpvote,
  onDownvote,
  upvoteTitle,
  downvoteTitle,
  onOpen,
  onToggleFavorite,
  onToast,
}: Props) {
  const aspect = wallpaper.dimension_x / wallpaper.dimension_y;
  const sizeStyle = fixedHeight
    ? { height: fixedHeight, width: fixedHeight * aspect }
    : { aspectRatio: `${wallpaper.dimension_x} / ${wallpaper.dimension_y}`, width: "100%" };
  const { t } = useLang();
  const purityBadge = PURITY_BADGE[wallpaper.purity];
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  function handleContextMenu(e: React.MouseEvent) {
    if (!contextMenuActions) return;
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }

  // A div, not a button: the card needs to contain its own focusable action
  // buttons (favorite, upvote/downvote, set/download), and a <button> can't
  // legally nest other buttons. role="button" + tabIndex + this handler give
  // it the same keyboard behavior a native button would have.
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      role="button"
      tabIndex={0}
      aria-label={wallpaper.resolution}
      onClick={() => onOpen(wallpaper)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(wallpaper);
        }
      }}
      onContextMenu={handleContextMenu}
      className={`group relative block cursor-pointer overflow-hidden rounded-2xl border text-left ${fixedHeight ? "shrink-0" : "mb-4 w-full"}`}
      style={{
        borderColor: purityBadge?.border ?? "var(--color-border-soft)",
        background: "var(--color-surface)",
        ...sizeStyle,
      }}
    >
      {/* "original" keeps the source's true aspect ratio (capped at ~300px
          on the longer side); "large"/"small" are fixed-canvas crops (e.g.
          always 16:9) that badly crop portrait or square wallpapers. */}
      <motion.div className="h-full w-full" whileHover={{ scale: 1.12 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
        <FallbackImage
          sources={[wallpaper.thumbs.original, wallpaper.thumbs.large, wallpaper.thumbs.small]}
          alt={wallpaper.id}
          className="block h-full w-full object-cover"
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div
        className="glass pointer-events-none absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-xs font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ color: "var(--color-ink)" }}
      >
        {wallpaper.resolution}
      </div>

      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        {purityBadge && (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold"
            style={{ background: purityBadge.border, color: "var(--color-accent-ink)" }}
            title={wallpaper.purity}
          >
            {purityBadge.label}
          </span>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(wallpaper);
          }}
          aria-label={t("lightbox.favoriteHint")}
          className={`glass flex h-7 w-7 items-center justify-center rounded-full transition-opacity duration-200 ${
            favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={favorite ? "var(--color-favorite)" : "none"} stroke={favorite ? "var(--color-favorite)" : "var(--color-ink)"} strokeWidth="2">
            <path d="M12 21s-7.5-4.6-10-9.3C0.3 8 1.7 4 5.6 3.2 8 2.7 10.4 4 12 6.3 13.6 4 16 2.7 18.4 3.2 22.3 4 23.7 8 22 11.7 19.5 16.4 12 21 12 21Z" />
          </svg>
        </motion.button>
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-end justify-between gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {(onUpvote || onDownvote) && (
          <div className="pointer-events-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {onUpvote && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={() => onUpvote(wallpaper)}
                aria-label={upvoteTitle}
                title={upvoteTitle}
                className="glass flex h-7 w-7 items-center justify-center rounded-full"
                style={{ color: "var(--color-ink)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            )}
            {onDownvote && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={() => onDownvote(wallpaper)}
                aria-label={downvoteTitle}
                title={downvoteTitle}
                className="glass flex h-7 w-7 items-center justify-center rounded-full"
                style={{ color: "var(--color-ink)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            )}
          </div>
        )}
        <div className="pointer-events-auto ml-auto flex flex-wrap justify-end gap-1.5">
          <WallpaperActions wallpaper={wallpaper} onToast={onToast} size="sm" />
        </div>
      </div>

      {contextMenuActions && (
        <ContextMenu pos={menuPos} actions={contextMenuActions(wallpaper)} onClose={() => setMenuPos(null)} />
      )}
    </motion.div>
  );
}
