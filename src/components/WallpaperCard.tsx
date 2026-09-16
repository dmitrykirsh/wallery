import { motion } from "framer-motion";
import type { Wallpaper } from "../lib/types";
import WallpaperActions from "./WallpaperActions";
import FallbackImage from "./FallbackImage";
import { useHoverBackground } from "../lib/HoverBackgroundContext";

interface Props {
  wallpaper: Wallpaper;
  favorite: boolean;
  /** When set, the card has this fixed height and a width computed from the
   * image's aspect ratio (used in horizontal filmstrip rows) instead of a
   * fixed width with a variable aspect-ratio height (used in the masonry grid). */
  fixedHeight?: number;
  onOpen: (wallpaper: Wallpaper) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

// A quiet purity indicator right on the card — muted, not the loud filter-pill
// colors, since this needs to sit on every single thumbnail without shouting.
const PURITY_BORDER: Record<string, { border: string; ring: string }> = {
  sketchy: { border: "#8f7548", ring: "rgba(143,117,72,0.35)" },
  nsfw: { border: "#8a5658", ring: "rgba(138,86,88,0.35)" },
};

export default function WallpaperCard({ wallpaper, favorite, fixedHeight, onOpen, onToggleFavorite, onToast }: Props) {
  const aspect = wallpaper.dimension_x / wallpaper.dimension_y;
  const sizeStyle = fixedHeight
    ? { height: fixedHeight, width: fixedHeight * aspect }
    : { aspectRatio: `${wallpaper.dimension_x} / ${wallpaper.dimension_y}`, width: "100%" };
  const { setImage } = useHoverBackground();
  const purityStyle = PURITY_BORDER[wallpaper.purity];

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onClick={() => onOpen(wallpaper)}
      onMouseEnter={() => setImage(wallpaper.thumbs.small)}
      onMouseLeave={() => setImage(null)}
      className={`group relative block overflow-hidden rounded-2xl border text-left ${fixedHeight ? "shrink-0" : "mb-4 w-full"}`}
      style={{
        borderColor: purityStyle?.border ?? "var(--color-border-soft)",
        boxShadow: purityStyle ? `inset 0 0 0 1px ${purityStyle.ring}` : undefined,
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
        className="glass pointer-events-none absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        {wallpaper.resolution}
      </div>

      <motion.span
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(wallpaper);
        }}
        role="button"
        className={`glass absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full transition-opacity duration-200 ${
          favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={favorite ? "var(--color-favorite)" : "none"} stroke={favorite ? "var(--color-favorite)" : "white"} strokeWidth="2">
          <path d="M12 21s-7.5-4.6-10-9.3C0.3 8 1.7 4 5.6 3.2 8 2.7 10.4 4 12 6.3 13.6 4 16 2.7 18.4 3.2 22.3 4 23.7 8 22 11.7 19.5 16.4 12 21 12 21Z" />
        </svg>
      </motion.span>

      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-end gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <WallpaperActions wallpaper={wallpaper} onToast={onToast} size="sm" />
      </div>
    </motion.button>
  );
}
