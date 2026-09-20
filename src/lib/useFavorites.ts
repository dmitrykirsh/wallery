import { useCallback, useEffect, useRef, useState } from "react";
import type { Wallpaper } from "./types";
import { getFavorites, toggleFavorite as toggleStored } from "./favorites";
import { cacheFavorite, syncFavoritesCache, uncacheFavorite } from "./favoritesCache";

export function useFavorites(cacheEnabled: boolean) {
  const [favorites, setFavorites] = useState<Wallpaper[]>(() => getFavorites());
  const cacheEnabledRef = useRef(cacheEnabled);
  cacheEnabledRef.current = cacheEnabled;

  // On launch, and whenever the setting flips: with caching on, fetch offline
  // copies that are missing; either way drop copies whose heart is gone.
  useEffect(() => {
    syncFavoritesCache(getFavorites(), cacheEnabled);
  }, [cacheEnabled]);

  const toggleFavorite = useCallback((wallpaper: Wallpaper) => {
    const nowFavorite = toggleStored(wallpaper);
    setFavorites(getFavorites());
    if (nowFavorite) {
      if (cacheEnabledRef.current) cacheFavorite(wallpaper);
    } else {
      uncacheFavorite(wallpaper.id);
    }
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((w) => w.id === id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
