import WallpaperGrid from "../components/WallpaperGrid";
import { useLang } from "../lib/LangContext";
import type { Wallpaper } from "../lib/types";

interface Props {
  history: Wallpaper[];
  isFavorite: (id: string) => boolean;
  onOpen: (wallpaper: Wallpaper, list: Wallpaper[]) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
  onToast: (message: string) => void;
}

export default function History({ history, isFavorite, onOpen, onToggleFavorite, onClear, onRemove, onToast }: Props) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif font-semibold text-heading-lg" style={{ color: "var(--color-ink)" }}>
          {t("history.title")}
        </h1>
        {history.length > 0 && (
          <button type="button" onClick={onClear} className="text-sm underline-offset-2 hover:underline" style={{ color: "var(--color-ink-faint)" }}>
            {t("history.clear")}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
          {t("empty.history")}
        </div>
      ) : (
        <WallpaperGrid
          wallpapers={history}
          isFavorite={isFavorite}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
          onRemove={(w) => onRemove(w.id)}
          removeTitle={t("history.remove")}
          onToast={onToast}
        />
      )}
    </div>
  );
}
