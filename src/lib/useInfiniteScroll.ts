import { useEffect, useRef, useState } from "react";

/** Reveals more items (in batches) as the user scrolls near the bottom of
 * the page. Uses a plain scroll listener rather than IntersectionObserver
 * because a sentinel that stays within the viewport right after a batch
 * loads (e.g. on a short window) would otherwise never re-fire.
 *
 * `cooldownMs` throttles how often a new batch can be revealed — needed
 * whenever revealing a batch triggers real network requests (e.g. fetching
 * wallpapers per tag), so a short/fast-growing page can't blow through
 * Wallhaven's rate limit by cascading through many batches at once. Leave
 * it at 0 for purely client-side batches (e.g. a static tag cloud). */
export function useInfiniteScroll(total: number, batchSize: number, cooldownMs = 0): number {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const lastFireRef = useRef(0);

  useEffect(() => {
    function onScroll() {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800;
      if (!nearBottom) return;
      if (cooldownMs > 0 && Date.now() - lastFireRef.current < cooldownMs) return;
      setVisibleCount((c) => {
        if (c >= total) return c;
        lastFireRef.current = Date.now();
        const next = Math.min(c + batchSize, total);
        if (next < total) setTimeout(onScroll, Math.max(50, cooldownMs));
        return next;
      });
    }
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [total, batchSize, cooldownMs]);

  return Math.min(visibleCount, total);
}
