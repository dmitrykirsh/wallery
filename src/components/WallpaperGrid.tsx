import { useMemo, useRef } from "react";
import type { Wallpaper } from "../lib/types";
import { distributeColumns } from "../lib/masonry";
import { useColumnCount } from "../lib/useColumnCount";
import WallpaperCard from "./WallpaperCard";
import type { ContextMenuAction } from "./ContextMenu";

interface Props {
  wallpapers: Wallpaper[];
  isFavorite: (id: string) => boolean;
  contextMenuActions?: (wallpaper: Wallpaper) => ContextMenuAction[];
  onUpvote?: (wallpaper: Wallpaper) => void;
  onDownvote?: (wallpaper: Wallpaper) => void;
  upvoteTitle?: string;
  downvoteTitle?: string;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onRemove?: (wallpaper: Wallpaper) => void;
  removeTitle?: string;
  onToast: (message: string) => void;
}

export default function WallpaperGrid({
  wallpapers,
  isFavorite,
  contextMenuActions,
  onUpvote,
  onDownvote,
  upvoteTitle,
  downvoteTitle,
  onOpen,
  onToggleFavorite,
  onRemove,
  removeTitle,
  onToast,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount(ref);
  const columns = useMemo(() => distributeColumns(wallpapers, columnCount), [wallpapers, columnCount]);

  return (
    <div ref={ref} className="flex gap-4">
      {columns.map((column, i) => (
        <div key={i} className="flex flex-1 flex-col">
          {column.map((w) => (
            <WallpaperCard
              key={w.id}
              wallpaper={w}
              favorite={isFavorite(w.id)}
              contextMenuActions={contextMenuActions}
              onUpvote={onUpvote}
              onDownvote={onDownvote}
              upvoteTitle={upvoteTitle}
              downvoteTitle={downvoteTitle}
              onOpen={(wallpaper) => onOpen(wallpaper, wallpapers)}
              onToggleFavorite={onToggleFavorite}
              onRemove={onRemove}
              removeTitle={removeTitle}
              onToast={onToast}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
