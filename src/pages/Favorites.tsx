import WallpaperGrid from "../components/WallpaperGrid";
import { useLang } from "../lib/LangContext";
import type { Wallpaper } from "../lib/types";

interface Props {
  favorites: Wallpaper[];
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

export default function Favorites({ favorites, isFavorite, onOpen, onToggleFavorite, onToast }: Props) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <h1 className="mb-5 font-serif font-semibold text-heading-lg" style={{ color: "var(--color-ink)" }}>
        {t("favorites.title")}
      </h1>

      {favorites.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
          {t("empty.favorites")}
        </div>
      ) : (
        <WallpaperGrid
          wallpapers={favorites}
          isFavorite={isFavorite}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
          onToast={onToast}
        />
      )}
    </div>
  );
}
