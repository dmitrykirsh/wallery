import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Wallpaper } from "../lib/types";
import { getWallpaper } from "../lib/api";
import WallpaperActions from "./WallpaperActions";
import FallbackImage from "./FallbackImage";
import CropPanel from "./CropPanel";
import { useLang } from "../lib/LangContext";
import { isTauri, openInBrowser } from "../lib/tauri";

interface Props {
  wallpaper: Wallpaper;
  apiKey: string;
  favorite: boolean;
  hasMultiple: boolean;
  /** Tag names already starred for recommendation favorites. */
  favoriteTags: string[];
  /** Toggles a tag in the recommendation-favorites list; returns the new starred state. */
  onToggleFavoriteTag: (tag: string) => boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTagClick: (tag: string) => void;
  onToggleFavorite: (wallpaper: Wallpaper) => void;
  onToast: (message: string) => void;
}

export default function Lightbox({
  wallpaper,
  apiKey,
  favorite,
  hasMultiple,
  favoriteTags,
  onToggleFavoriteTag,
  onClose,
  onNext,
  onPrev,
  onTagClick,
  onToggleFavorite,
  onToast,
}: Props) {
  const { t } = useLang();
  const [detail, setDetail] = useState<Wallpaper>(wallpaper);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [mainImageFailed, setMainImageFailed] = useState(false);
  const [copiedTagId, setCopiedTagId] = useState<number | null>(null);

  function toggleFavoriteTag(tagName: string) {
    const nowStarred = onToggleFavoriteTag(tagName);
    onToast(nowStarred ? t("tag.favAdded") : t("tag.favRemoved"));
  }

  async function copyTag(tagId: number, tagName: string) {
    try {
      await navigator.clipboard.writeText(tagName);
      setCopiedTagId(tagId);
      onToast(`${t("tag.copied")}: #${tagName}`);
      setTimeout(() => setCopiedTagId((id) => (id === tagId ? null : id)), 900);
    } catch {
      onToast(t("tag.copyFailed"));
    }
  }

  useEffect(() => {
    setDetail(wallpaper);
    setImgLoaded(false);
    setResolvedSrc(null);
    setMainImageFailed(false);
    getWallpaper(wallpaper.id, apiKey)
      .then(setDetail)
      .catch(() => {});
  }, [wallpaper, apiKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasMultiple) onNext();
      if (e.key === "ArrowLeft" && hasMultiple) onPrev();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev, hasMultiple]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6" onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="glass-strong flex h-[92vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden rounded-3xl md:flex-row"
      >
        <div className="relative flex flex-1 items-center justify-center overflow-hidden" style={{ background: "var(--color-bg)" }}>
          {!imgLoaded && (
            <img
              src={detail.thumbs.large}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-60 blur-sm"
            />
          )}
          <FallbackImage
            sources={[detail.path, detail.thumbs.original, detail.thumbs.large]}
            alt={detail.id}
            priority
            onLoad={() => setImgLoaded(true)}
            onFallback={() => onToast(t("toast.fallback"))}
            onResolvedSource={(url) => {
              setResolvedSrc(url);
              setMainImageFailed(false);
            }}
            onFailed={() => setMainImageFailed(true)}
            allowManualReload
            className="relative z-10 h-full w-full object-contain"
          />

          {hasMultiple && (
            <>
              <span
                role="button"
                onClick={onPrev}
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg backdrop-blur transition-colors"
                style={{ background: "rgba(20,18,25,0.7)", color: "var(--color-ink)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </span>
              <span
                role="button"
                onClick={onNext}
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg backdrop-blur transition-colors"
                style={{ background: "rgba(20,18,25,0.7)", color: "var(--color-ink)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 overflow-y-auto p-5 md:w-80">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              {detail.resolution}
            </span>
            <div className="flex items-center gap-3">
              <span role="button" onClick={() => openInBrowser(`https://wallhaven.cc/w/${detail.id}`)} title={t("lightbox.openInBrowser")} style={{ color: "var(--color-ink-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span role="button" onClick={() => onToggleFavorite(detail)} title={t("lightbox.favoriteHint")}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={favorite ? "var(--color-favorite)" : "none"}
                  stroke={favorite ? "var(--color-favorite)" : "var(--color-ink-muted)"}
                  strokeWidth="2"
                >
                  <path d="M12 21s-7.5-4.6-10-9.3C0.3 8 1.7 4 5.6 3.2 8 2.7 10.4 4 12 6.3 13.6 4 16 2.7 18.4 3.2 22.3 4 23.7 8 22 11.7 19.5 16.4 12 21 12 21Z" />
                </svg>
              </span>
              <span role="button" onClick={onClose} className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                ✕
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            <span className="rounded-md border px-2 py-1 capitalize" style={{ borderColor: "var(--color-border)" }}>
              {detail.category}
            </span>
            <span className="rounded-md border px-2 py-1 uppercase" style={{ borderColor: "var(--color-border)" }}>
              {detail.purity}
            </span>
            <span className="rounded-md border px-2 py-1" style={{ borderColor: "var(--color-border)" }}>
              {(detail.file_size / 1024 / 1024).toFixed(1)} {t("unit.mb")}
            </span>
          </div>

          <WallpaperActions wallpaper={detail} onToast={onToast} size="md" fill />

          <div className="flex flex-wrap gap-1.5 overflow-y-auto">
            {(detail.tags ?? []).map((tag) => (
              <motion.span
                key={tag.id}
                role="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => onTagClick(tag.name)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  copyTag(tag.id, tag.name);
                }}
                title={t("tag.hint")}
                className="relative flex cursor-pointer items-center gap-1 overflow-hidden rounded-full border px-2 py-1 text-xs transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
              >
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoriteTag(tag.name);
                  }}
                  title={t("tag.favHint")}
                  className="shrink-0"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill={favoriteTags.includes(tag.name) ? "var(--color-accent)" : "none"}
                    stroke={favoriteTags.includes(tag.name) ? "var(--color-accent)" : "currentColor"}
                    strokeWidth="1.6"
                  >
                    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8-5.1-4.7 6.9-.8L12 2Z" strokeLinejoin="round" />
                  </svg>
                </span>
                <AnimatePresence>
                  {copiedTagId === tag.id && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center gap-1"
                      style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
                    >
                      <motion.svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                      {t("tag.copied")}
                    </motion.span>
                  )}
                </AnimatePresence>
                #{tag.name}
              </motion.span>
            ))}
          </div>

          {isTauri() &&
            (resolvedSrc ? (
              <CropPanel wallpaper={detail} src={resolvedSrc} onToast={onToast} />
            ) : (
              <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
                  {t("crop.title")}
                </p>
                <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                  {mainImageFailed ? t("lightbox.notLoaded") : t("empty.loading")}
                </p>
              </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
