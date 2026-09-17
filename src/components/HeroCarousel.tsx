import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Wallpaper } from "../lib/types";
import WallpaperActions from "./WallpaperActions";
import FallbackImage from "./FallbackImage";
import { useHoverBackground } from "../lib/HoverBackgroundContext";

interface Props {
  wallpapers: Wallpaper[];
  label: string;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToast: (message: string) => void;
}

const TILE_COUNT = 9;

// A fixed grid — cell positions never move or resize. Only which wallpaper
// is shown in each cell changes over time, so the collage stays visually
// calm instead of constantly reflowing.
const BIG_STYLE: React.CSSProperties = { gridColumn: "1 / 3", gridRow: "1 / 3" };
const SMALL_SLOTS: React.CSSProperties[] = [
  { gridColumn: "3 / 4", gridRow: "1 / 2" },
  { gridColumn: "4 / 5", gridRow: "1 / 2" },
  { gridColumn: "5 / 6", gridRow: "1 / 2" },
  { gridColumn: "6 / 7", gridRow: "1 / 2" },
  { gridColumn: "3 / 4", gridRow: "2 / 3" },
  { gridColumn: "4 / 5", gridRow: "2 / 3" },
  { gridColumn: "5 / 6", gridRow: "2 / 3" },
  { gridColumn: "6 / 7", gridRow: "2 / 3" },
];

function tileSrc(w: Wallpaper): string {
  return w.thumbs.large;
}

// The big tile is the most visually prominent slot — a strongly vertical
// (portrait) source image gets cropped brutally to fill its ~square area.
// Biasing its pick toward landscape/square images keeps that crop sane;
// portrait images still show up fine in the narrower small slots.
function isLandscapeish(w: Wallpaper): boolean {
  return w.dimension_x / w.dimension_y >= 1.15;
}

function pickDistinct(pool: Wallpaper[], count: number, avoid: Set<string>, preferLandscape = false): Wallpaper[] {
  let candidates = pool.filter((w) => !avoid.has(w.id));
  if (preferLandscape) {
    const landscape = candidates.filter(isLandscapeish);
    if (landscape.length >= count) candidates = landscape;
  }
  const source = candidates.length >= count ? candidates : pool;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Resolves once the image has loaded (or failed, or timed out) — never
 * rejects, so a slow/broken URL just gives up gracefully instead of
 * stalling a tile's rotation forever. */
function preload(url: string, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
    setTimeout(finish, timeoutMs);
  });
}

function CollageTile({
  wallpaper,
  gridStyle,
  list,
  onOpen,
  onToast,
}: {
  wallpaper: Wallpaper;
  gridStyle: React.CSSProperties;
  list: Wallpaper[];
  onOpen: (w: Wallpaper, list: Wallpaper[]) => void;
  onToast: (m: string) => void;
}) {
  const { setImage } = useHoverBackground();
  const sources = [tileSrc(wallpaper), wallpaper.thumbs.original, wallpaper.path];

  return (
    <div
      role="button"
      className="tile-glass group relative cursor-pointer overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-300 ease-out hover:z-10 hover:scale-[1.015] hover:shadow-[0_12px_36px_rgba(0,0,0,0.4)]"
      style={{ background: "var(--color-surface)", ...gridStyle }}
      onMouseEnter={() => setImage(wallpaper.thumbs.small)}
      onMouseLeave={() => setImage(null)}
      onClick={() => onOpen(wallpaper, list)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={wallpaper.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <FallbackImage
            sources={sources}
            alt={wallpaper.id}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        </motion.div>
      </AnimatePresence>
      <div className="tile-sheen pointer-events-none absolute inset-0" />
      <div className="tile-streaks pointer-events-none absolute inset-0">
        <span />
        <span />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white/90" style={{ background: "rgba(0,0,0,0.45)" }}>
          {wallpaper.resolution}
        </span>
        <div className="pointer-events-auto">
          <WallpaperActions wallpaper={wallpaper} onToast={onToast} size="sm" />
        </div>
      </div>
    </div>
  );
}

export default function HeroCarousel({ wallpapers, label, onOpen, onToast }: Props) {
  const [tiles, setTiles] = useState<Wallpaper[]>([]);
  const tilesRef = useRef<Wallpaper[]>([]);
  tilesRef.current = tiles;
  const pausedRef = useRef(false);

  // Initial fill — waits for every tile's thumbnail to actually finish
  // loading before showing any of them, instead of popping in blank tiles
  // that fill in one by one.
  useEffect(() => {
    if (wallpapers.length === 0) {
      setTiles([]);
      return;
    }
    let cancelled = false;
    const big = pickDistinct(wallpapers, 1, new Set(), true);
    const smallCount = Math.min(TILE_COUNT - 1, Math.max(0, wallpapers.length - big.length));
    const small = pickDistinct(wallpapers, smallCount, new Set(big.map((w) => w.id)));
    const initial = [...big, ...small];
    Promise.all(initial.map((w) => preload(tileSrc(w)))).then(() => {
      if (!cancelled) setTiles(initial);
    });
    return () => {
      cancelled = true;
    };
  }, [wallpapers]);

  // Each tile reshuffles on its own randomized, self-rescheduling timer —
  // slow enough to feel calm, preloading the next image before it ever
  // swaps in, and pausing entirely while the banner is hovered. Since cell
  // positions never move, one tile changing never affects any other.
  useEffect(() => {
    if (wallpapers.length === 0) return;
    let cancelled = false;
    const timeouts: number[] = [];

    function scheduleTile(i: number) {
      const delay = 9000 + Math.random() * 10000;
      const id = window.setTimeout(() => tick(i), delay);
      timeouts.push(id);
    }

    async function tick(i: number) {
      if (cancelled) return;
      if (pausedRef.current) {
        scheduleTile(i);
        return;
      }
      const current = tilesRef.current;
      const used = new Set(current.map((w) => w.id));
      if (i < current.length) used.delete(current[i].id);
      const [next] = pickDistinct(wallpapers, 1, used, i === 0);
      if (next) {
        await preload(tileSrc(next));
        if (!cancelled && !pausedRef.current && i < tilesRef.current.length) {
          setTiles((prev) => {
            const copy = [...prev];
            copy[i] = next;
            return copy;
          });
        }
      }
      if (!cancelled) scheduleTile(i);
    }

    const count = Math.min(TILE_COUNT, wallpapers.length);
    for (let i = 0; i < count; i++) scheduleTile(i);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [wallpapers]);

  if (tiles.length === 0) {
    return <div className="h-[380px] w-full animate-pulse" style={{ background: "var(--color-surface)" }} />;
  }

  return (
    <div
      className="relative grid h-[380px] w-full grid-cols-6 grid-rows-2 gap-2"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      {tiles.map((tile, i) => (
        <CollageTile key={i} wallpaper={tile} gridStyle={i === 0 ? BIG_STYLE : SMALL_SLOTS[i - 1] ?? {}} list={wallpapers} onOpen={onOpen} onToast={onToast} />
      ))}

      <span
        className="glass pointer-events-none absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--color-accent)" }}
      >
        {label}
      </span>
    </div>
  );
}
