import { useEffect, useRef, useState } from "react";
import { useLang } from "../lib/LangContext";
import { fetchImageDataUrl, isTauri } from "../lib/tauri";

/** Re-encodes an already-loaded <img> to a data URL entirely client-side —
 * no network involved at all. Used so a sibling that needs the same image
 * (the crop preview) can reuse the exact bytes already sitting in memory
 * instead of independently re-requesting the same URL, which — being a
 * genuinely separate request — can still hit whatever intermittently
 * blocks the first one even when that first one just succeeded. Returns
 * null if the canvas comes back tainted (no CORS headers) or anything else
 * goes wrong; the caller falls back to handing over the plain URL instead. */
function toDataUrl(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width === 0 || canvas.height === 0) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  sources: string[];
  /** Called once when a source fails and we fall through to the next one —
   * useful for telling the user we're showing a smaller version instead. */
  onFallback?: () => void;
  /** Shows a small manual reload button over the image at all times, not
   * just after a failure — for spots (the main Lightbox view, the crop
   * preview) where a stuck load is especially disruptive and the user
   * should be able to force a fresh attempt without waiting. */
  allowManualReload?: boolean;
  /** Called once a source has actually finished loading, with that exact
   * URL (no retry fragment) — lets a sibling that needs the same image
   * (e.g. the crop preview) wait for and reuse it instead of racing its
   * own separate request for the same, possibly very large, file. */
  onResolvedSource?: (url: string) => void;
  /** Called once every source has been exhausted — lets a sibling waiting
   * on `onResolvedSource` (e.g. the crop preview) stop waiting and show its
   * own failure state instead of spinning forever. */
  onFailed?: () => void;
  /** Skips the shared load queue entirely instead of competing with it on
   * equal footing. The queue exists to stop a *mass* of thumbnails (a grid,
   * the hero carousel) from all firing at once — it was never meant to make
   * the one image the user is actually looking at right now (the Lightbox's
   * main view, the crop preview) sit behind a backlog of background grid
   * traffic that's still loading underneath the modal. */
  priority?: boolean;
}

/** Renders an <img> that falls through a list of candidate URLs on load
 * error (e.g. full-res path -> large thumb -> small thumb), instead of
 * showing the browser's broken-image icon when the first one fails —
 * a very large source file exceeding the webview's decode limits, a
 * transient network error, or an API rate limit can all trigger this;
 * the browser's onerror doesn't expose which, so the fallback message
 * stays generic rather than guessing a specific cause. */
// A failed load is often a transient network blip or a momentary rate limit
// (the app itself keeps other requests running in the background — a hero
// reshuffle, a tag-row batch — that can collide with a large full-res
// fetch) rather than a genuinely dead URL. Retry the *same* source a few
// times, waiting a bit longer each time, before giving up on it.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [400, 1200, 2500];
// Some failures never fire onError at all — a connection that stalls
// instead of being refused just leaves the <img> pending forever. Treat a
// load that hasn't finished within this window as stalled too, so those
// cases don't hang silently. A background thumbnail can afford to bail
// quickly; the original the user is actually looking at (a `priority`
// load) gets more patience — but not too much, since giving up on it now
// hands off to the Rust rescue path below rather than settling for a
// downgrade, so there's no need to wait minutes before trying that.
const STALL_TIMEOUT_MS_DEFAULT = 12000;
const STALL_TIMEOUT_MS_PRIORITY = 20000;

// The grid, the hero carousel, and tag rows can all mount dozens of images
// at once, each firing its own <img> request the instant it renders. That's
// a burst of concurrent connections to Wallhaven's CDN with no pacing at
// all — a very plausible way to trip a burst/concurrency limiter even for a
// small, perfectly healthy file, independent of (and in addition to) the
// JSON API's own rate limit. Route every image load through a small shared
// queue so only a handful are ever actually in flight at once; the rest
// wait their turn instead of all firing in the same instant.
const MAX_CONCURRENT_LOADS = 8;
let activeLoads = 0;
const loadQueue: (() => void)[] = [];

function drainLoadQueue() {
  while (activeLoads < MAX_CONCURRENT_LOADS && loadQueue.length > 0) {
    const next = loadQueue.shift();
    if (!next) continue;
    activeLoads++;
    next();
  }
}

/** Requests a load slot, calling `onGranted` once one is free (immediately,
 * if one already is). Returns an idempotent release function — call it once
 * the load has finished (success or error) to free the slot for the next
 * queued image, and again on cleanup/abandonment; the second call is a
 * harmless no-op either way. */
function requestLoadSlot(onGranted: () => void): () => void {
  let state: "pending" | "granted" | "released" = "pending";
  const tryGrant = () => {
    state = "granted";
    onGranted();
  };
  if (activeLoads < MAX_CONCURRENT_LOADS) {
    activeLoads++;
    tryGrant();
  } else {
    loadQueue.push(tryGrant);
  }
  return () => {
    if (state === "released") return;
    if (state === "granted") {
      activeLoads--;
      drainLoadQueue();
    } else {
      const idx = loadQueue.indexOf(tryGrant);
      if (idx >= 0) loadQueue.splice(idx, 1);
    }
    state = "released";
  };
}

export default function FallbackImage({ sources, onLoad, onFallback, allowManualReload, onResolvedSource, onFailed, priority, style, ...rest }: Props) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [canLoad, setCanLoad] = useState(false);
  const [rescuedSrc, setRescuedSrc] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const releaseSlotRef = useRef<() => void>(() => {});
  const rescueAttemptedRef = useRef(false);
  const rescueFailedRef = useRef(false);
  const indexRef = useRef(0);
  indexRef.current = index;

  useEffect(() => {
    setIndex(0);
    setFailed(false);
    setLoaded(false);
    setRetryToken(0);
    setRescuedSrc(null);
    retryCountRef.current = 0;
    rescueAttemptedRef.current = false;
    rescueFailedRef.current = false;
    clearTimeout(retryTimerRef.current);
  }, [sources[0]]);

  useEffect(() => () => {
    clearTimeout(retryTimerRef.current);
    clearTimeout(stallTimerRef.current);
  }, []);

  function releaseSlot() {
    releaseSlotRef.current();
  }

  function handleFailure() {
    releaseSlot();
    if (retryCountRef.current < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS[retryCountRef.current] ?? 2500;
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => setRetryToken((t) => t + 1), delay);
      return;
    }
    goToNextSource();
  }

  function goToNextSource() {
    const leavingOriginal = index === 0;
    retryCountRef.current = 0;

    // Kick the Rust rescue off the moment the *original* itself fails —
    // not after every smaller fallback has also had its own full round of
    // retries and stall timeouts, which could easily add up to a couple of
    // minutes and mean the rescue never gets a real chance to run before
    // the user's given up and closed the lightbox. It runs in parallel
    // with (not instead of) the normal fallback chain below, so there's
    // still an immediate, smaller stopgap on screen while it works.
    if (leavingOriginal && priority && isTauri() && !rescueAttemptedRef.current) {
      rescueAttemptedRef.current = true;
      fetchImageDataUrl(sources[0])
        .then((dataUrl) => {
          setRescuedSrc(dataUrl);
          setCanLoad(true);
          setFailed(false);
        })
        .catch(() => {
          rescueFailedRef.current = true;
          // The rescue didn't pan out either — *now* it's a genuine
          // downgrade worth telling the user about, rather than the
          // premature "showing a smaller version" that used to fire the
          // instant the original failed once, even when the rescue went
          // on to quietly recover the full image a moment later.
          onFallback?.();
          // Only actually give up on its behalf if the visual fallback
          // chain has *also* run out by the time this comes back.
          if (indexRef.current >= sources.length - 1) {
            setFailed(true);
            onFailed?.();
          }
        });
    }

    // While a rescue is still in flight (or already succeeded), hold off on
    // the "showing a smaller version" toast — its own resolution above
    // decides whether that message ends up being true at all.
    const rescueInFlight = rescueAttemptedRef.current && !rescueFailedRef.current && !rescuedSrc;

    if (index < sources.length - 1) {
      if (!rescueInFlight) onFallback?.();
      setIndex((i) => i + 1);
      setRetryToken(0);
      return;
    }

    // At the last source. If a rescue attempt is still in flight, wait for
    // it instead of giving up now — its own .then/.catch above will decide
    // the final outcome once it resolves.
    if (!rescueInFlight) {
      setFailed(true);
      onFailed?.();
    }
  }

  // Unlike onError (a quick, definitive rejection worth retrying in place),
  // a stall means the request is still sitting there — restarting it via
  // the same retry path would just cancel a big file's download right
  // before it finishes and restart it from zero, forever. Skip straight to
  // the next (smaller, faster) source instead.
  function handleStall() {
    clearTimeout(retryTimerRef.current);
    releaseSlot();
    goToNextSource();
  }

  /** Restarts the whole chain from the best (first) source, bypassing
   * whatever attempt/fallback state it had settled into. */
  function forceReload() {
    clearTimeout(retryTimerRef.current);
    clearTimeout(stallTimerRef.current);
    retryCountRef.current = 0;
    rescueAttemptedRef.current = false;
    rescueFailedRef.current = false;
    setIndex(0);
    setFailed(false);
    setLoaded(false);
    setRescuedSrc(null);
    setRetryToken((t) => t + 1);
  }

  const current = sources[Math.min(index, sources.length - 1)];
  // A URL *fragment* forces the <img> to make a fresh load attempt (an
  // unchanged src is a no-op) without altering the actual HTTP request —
  // Wallhaven's image CDN rejects requests with an unexpected *query*
  // param outright, which would turn a recoverable transient failure into
  // a guaranteed one before ever getting to retry it.
  const src = rescuedSrc ?? (retryToken > 0 ? `${current}#retry-${retryToken}` : current);

  // Every new attempt at `src` (first try, retry, fallback, or a manual
  // reload) waits its turn in the shared queue before the <img> actually
  // gets a `src` and starts a real network request — unless it's a
  // priority load, which starts immediately regardless of the queue.
  useEffect(() => {
    if (priority) {
      setCanLoad(true);
      releaseSlotRef.current = () => {};
      return;
    }
    setCanLoad(false);
    const release = requestLoadSlot(() => setCanLoad(true));
    releaseSlotRef.current = release;
    return () => release();
  }, [src, priority]);

  useEffect(() => {
    if (failed || loaded || !canLoad) return;
    clearTimeout(stallTimerRef.current);
    stallTimerRef.current = setTimeout(handleStall, priority ? STALL_TIMEOUT_MS_PRIORITY : STALL_TIMEOUT_MS_DEFAULT);
    return () => clearTimeout(stallTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, failed, loaded, canLoad, priority]);

  const reloadButton = allowManualReload && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        forceReload();
      }}
      aria-label={t("crop.forceReload")}
      title={t("crop.forceReload")}
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full"
      style={{ background: "rgba(33,26,22,0.72)", color: "var(--color-ink)" }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12a9 9 0 0 1 15.5-6.4M21 12a9 9 0 0 1-15.5 6.4" strokeLinecap="round" />
        <path d="M18 3v5h-5M6 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  if (failed) {
    return (
      <div className="relative flex h-full w-full items-center justify-center text-xs" style={{ color: "var(--color-ink-faint)" }}>
        {t("lightbox.notLoaded")}
        {reloadButton}
      </div>
    );
  }

  return (
    <>
      {canLoad && (
        <img
          {...rest}
          src={src}
          // Every failed attempt along the way (a retry, a fallback to a
          // smaller source, waiting on the Rust rescue) briefly leaves the
          // <img> pointed at a src that just errored, and the browser's own
          // broken-image glyph flashes on screen before React re-renders
          // with the next attempt. Staying invisible until something
          // actually loads hides that flicker — whatever's already behind
          // this element (a blurred placeholder, the card's background)
          // shows through in the meantime instead.
          style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.15s ease-out" }}
          crossOrigin={priority ? "anonymous" : undefined}
          onLoad={(e) => {
            releaseSlot();
            setLoaded(true);
            if (onResolvedSource) {
              // Already network-independent (a rescued data URL) — hand it
              // over as-is. Otherwise, try to re-encode the pixels already
              // sitting in this <img> so the sibling never has to make its
              // own request for the same URL at all; fall back to just the
              // URL if that's not possible for some reason.
              const dataUrl = priority ? toDataUrl(e.currentTarget) : null;
              onResolvedSource(rescuedSrc ?? dataUrl ?? current);
            }
            onLoad?.(e);
          }}
          onError={handleFailure}
        />
      )}
      {reloadButton}
    </>
  );
}
