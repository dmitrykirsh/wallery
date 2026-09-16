import { useMemo, useRef } from "react";
import type { Wallpaper } from "../lib/types";
import { distributeColumns } from "../lib/masonry";
import { useColumnCount } from "../lib/useColumnCount";
import WallpaperCard from "./WallpaperCard";

interface Props {
  wallpapers: Wallpaper[];
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

export default function WallpaperGrid({ wallpapers, isFavorite, onOpen, onToggleFavorite, onToast }: Props) {
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
              onOpen={(wallpaper) => onOpen(wallpaper, wallpapers)}
              onToggleFavorite={onToggleFavorite}
              onToast={onToast}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
