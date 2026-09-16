import { useCallback, useState } from "react";
import type { Wallpaper } from "./types";
import { getFavorites, toggleFavorite as toggleStored } from "./favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Wallpaper[]>(() => getFavorites());

  const toggleFavorite = useCallback((wallpaper: Wallpaper) => {
    toggleStored(wallpaper);
    setFavorites(getFavorites());
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((w) => w.id === id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
