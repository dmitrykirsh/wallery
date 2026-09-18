import { useEffect, useMemo, useState } from "react";
import { searchWallpapers } from "../lib/api";
import { defaultFilters } from "../lib/filters";
import { dedupeById } from "../lib/dedupe";
import { shuffledTags } from "../lib/tags";
import { useInfiniteScroll } from "../lib/useInfiniteScroll";
import type { Wallpaper } from "../lib/types";
import WallpaperRow from "./WallpaperRow";

const BATCH_SIZE = 2;
// Revealing a batch fires one Wallhaven search request per tag, and the API
// caps at 45 requests/minute — this keeps a fast scroll well under that.
const COOLDOWN_MS = 3000;

interface Props {
  apiKey: string;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  onSelectTag: (tag: string) => void;
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

/** An endless list of "tag + horizontal image row" sections below the tag
 * cloud — reveals more random tags (and fetches their wallpapers) as the
 * user keeps scrolling down the page. */
export default function TagRowFeed({ apiKey, nsfwAllowed, sketchyAllowed, onSelectTag, isFavorite, onOpen, onToggleFavorite, onToast }: Props) {
  // Re-picks (and re-shuffles) the tag pool whenever nsfwAllowed flips, so a
  // disabled NSFW toggle drops nsfw-leaning tag names too, not just the
  // images fetched for them.
  const pool = useMemo(() => shuffledTags(nsfwAllowed), [nsfwAllowed]);
  const visibleCount = useInfiniteScroll(pool.length, BATCH_SIZE, COOLDOWN_MS);
  const visibleTags = pool.slice(0, visibleCount);
  const [data, setData] = useState<Record<string, Wallpaper[]>>({});

  // A tag's row is only ever (re-)fetched when it's missing from the cache
  // below — so flipping the NSFW/sketchy toggles off must actually clear
  // out already-fetched rows, or previously-loaded content stays visible
  // under the old, looser purity filter for the rest of the session.
  useEffect(() => {
    setData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsfwAllowed, sketchyAllowed]);

  useEffect(() => {
    const missing = visibleTags.filter((tag) => !(tag in data));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map((tag) =>
        // "relevance" rather than "date_added" — Wallhaven's date-sorted
        // text search mixes in loosely-related results (e.g. real photos
        // that just mention the tag), while relevance keeps them on-topic.
        searchWallpapers(
          { ...defaultFilters(), query: tag, purities: { sfw: true, sketchy: sketchyAllowed, nsfw: nsfwAllowed }, sorting: "relevance" },
          apiKey,
          1,
        )
          .then((res) => [tag, dedupeById(res.data).slice(0, 10)] as const)
          .catch(() => [tag, []] as const),
      ),
    ).then((results) => {
      if (cancelled) return;
      setData((prev) => ({ ...prev, ...Object.fromEntries(results) }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTags.join(","), apiKey, nsfwAllowed, sketchyAllowed]);

  return (
    <div>
      {visibleTags.map((tag) => (
        <WallpaperRow
          key={tag}
          title={`#${tag}`}
          wallpapers={data[tag] ?? []}
          loading={!(tag in data)}
          onTitleClick={() => onSelectTag(tag)}
          isFavorite={isFavorite}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
          onToast={onToast}
        />
      ))}
    </div>
  );
}
