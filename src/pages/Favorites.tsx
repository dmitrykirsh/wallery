import WallpaperGrid from "../components/WallpaperGrid";
import { useLang } from "../lib/LangContext";
import { isTauri } from "../lib/tauri";
import type { Wallpaper } from "../lib/types";

interface Props {
  cacheEnabled: boolean;
  onCacheEnabledChange: (enabled: boolean) => void;
  favorites: Wallpaper[];
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

export default function Favorites({ cacheEnabled, onCacheEnabledChange, favorites, isFavorite, onOpen, onToggleFavorite, onToast }: Props) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="font-serif font-semibold text-heading-lg" style={{ color: "var(--color-ink)" }}>
          {t("favorites.title")}
        </h1>
        {isTauri() && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                {t("favorites.cache")}
              </div>
              <div className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                {t("favorites.cacheHint")}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cacheEnabled}
              aria-label={t("favorites.cache")}
              onClick={() => onCacheEnabledChange(!cacheEnabled)}
              className="relative h-6 w-11 shrink-0 rounded-full border text-left transition-colors"
              style={{ background: cacheEnabled ? "var(--color-accent)" : "var(--color-surface-3)", borderColor: "var(--color-border)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform"
                style={{ background: "var(--color-ink)", transform: cacheEnabled ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        )}
      </div>

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
