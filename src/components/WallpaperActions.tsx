import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { Wallpaper } from "../lib/types";
import { setWallpaper, saveWallpaper, pickFolder, type WallpaperStyle } from "../lib/tauri";
import { useMonitors } from "../lib/useMonitors";
import { loadWallpaperPrefs, saveWallpaperPrefs } from "../lib/wallpaperPrefs";
import { useLang } from "../lib/LangContext";

const STYLES: WallpaperStyle[] = ["fill", "fit", "stretch", "span", "center", "tile"];
const MARGIN = 10;

interface Props {
  wallpaper: Wallpaper;
  onToast: (message: string) => void;
  size?: "sm" | "md";
  /** Make the Set/Download buttons split the row evenly instead of hugging
   * the right edge — keeps them visually stable when the label's width
   * changes across languages (a right-anchored row jumps left/right). */
  fill?: boolean;
}

interface MenuPos {
  top: number;
  left: number;
  origin: "top" | "bottom";
}

function computeMenuPos(trigger: HTMLElement, estWidth: number, estHeight: number): MenuPos {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openDown = spaceBelow >= estHeight + MARGIN || spaceBelow >= spaceAbove;

  const top = openDown
    ? Math.min(rect.bottom + 8, window.innerHeight - estHeight - MARGIN)
    : Math.max(rect.top - estHeight - 8, MARGIN);

  let left = rect.right - estWidth;
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - estWidth - MARGIN));

  return { top: Math.max(MARGIN, top), left, origin: openDown ? "top" : "bottom" };
}

export default function WallpaperActions({ wallpaper, onToast, size = "sm", fill = false }: Props) {
  const monitors = useMonitors();
  const { t } = useLang();
  const [prefs, setPrefs] = useState(() => loadWallpaperPrefs());
  const [open, setOpen] = useState<"set" | "save" | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [busy, setBusy] = useState<"set" | "save" | null>(null);
  const [folder, setFolder] = useState<string | null>(prefs.saveFolder);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function toggleMenu(which: "set" | "save") {
    if (open === which) {
      setOpen(null);
      return;
    }
    if (ref.current) {
      const estHeight = which === "set" ? 60 + monitors.length * 34 + STYLES.length * 15 + 120 : 140;
      setMenuPos(computeMenuPos(ref.current, which === "set" ? 224 : 256, estHeight));
    }
    setOpen(which);
  }

  function updatePrefs(next: Partial<typeof prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    saveWallpaperPrefs(merged);
  }

  async function applySet() {
    setBusy("set");
    try {
      await setWallpaper(wallpaper.id, wallpaper.path, prefs.monitor, prefs.style);
      onToast(t("toast.wallpaperSet"));
      setOpen(null);
    } catch (err) {
      onToast(String(err));
    } finally {
      setBusy(null);
    }
  }

  async function applySave(targetFolder: string | null) {
    setBusy("save");
    try {
      const path = await saveWallpaper(wallpaper.id, wallpaper.path, targetFolder);
      onToast(`${t("toast.saved")}: ${path}`);
      setOpen(null);
    } catch (err) {
      onToast(String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleChooseFolder() {
    const picked = await pickFolder();
    if (picked) {
      setFolder(picked);
      updatePrefs({ saveFolder: picked });
    }
  }

  const pad = size === "sm" ? "px-1.5 py-1 text-[11px]" : "px-4 py-2 text-sm";
  const containerClass = fill ? "flex w-full gap-1.5" : "relative flex flex-wrap justify-end gap-1.5";
  const btnWrapClass = fill ? "flex flex-1 overflow-hidden rounded-lg" : "flex overflow-hidden rounded-lg";
  const labelClass = fill ? "flex-1 text-center font-medium" : "font-medium";

  return (
    <div ref={ref} className={containerClass} onClick={(e) => e.stopPropagation()}>
      <motion.div whileTap={{ scale: 0.96 }} className={btnWrapClass} style={{ background: "var(--gradient-accent)" }}>
        <span role="button" onClick={applySet} className={`${labelClass} ${pad}`} style={{ color: "var(--color-accent-ink)" }}>
          {busy === "set" ? t("action.setting") : t("action.set")}
        </span>
        <span
          role="button"
          onClick={() => toggleMenu("set")}
          className="flex items-center border-l px-1.5"
          style={{ borderColor: "rgba(0,0,0,0.15)", color: "var(--color-accent-ink)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      </motion.div>

      <motion.div whileTap={{ scale: 0.96 }} className={`glass ${btnWrapClass}`}>
        <span role="button" onClick={() => applySave(folder)} className={`${labelClass} ${pad}`} style={{ color: "var(--color-ink)" }}>
          {busy === "save" ? t("action.downloading") : t("action.download")}
        </span>
        <span
          role="button"
          onClick={() => toggleMenu("save")}
          className="flex items-center border-l px-1.5"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "var(--color-ink)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      </motion.div>

      {open === "set" &&
        menuPos &&
        createPortal(
          <motion.div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: menuPos.origin === "top" ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="glass-strong fixed z-[100] w-56 rounded-2xl p-3 text-left shadow-2xl"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <p className="mb-1.5 text-[11px] font-medium uppercase" style={{ color: "var(--color-ink-faint)" }}>
              {t("menu.monitor")}
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span role="button" onClick={() => updatePrefs({ monitor: null })} className="chip" data-active={prefs.monitor === null}>
                {t("menu.all")}
              </span>
              {monitors.map((m) => (
                <span key={m.id} role="button" onClick={() => updatePrefs({ monitor: m.id })} className="chip" data-active={prefs.monitor === m.id}>
                  {t("monitor.label")} {m.index}
                </span>
              ))}
            </div>

            <p className="mb-1.5 text-[11px] font-medium uppercase" style={{ color: "var(--color-ink-faint)" }}>
              {t("menu.fillStyle")}
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <span key={s} role="button" onClick={() => updatePrefs({ style: s })} className="chip" data-active={prefs.style === s}>
                  {t(`style.${s}` as const)}
                </span>
              ))}
            </div>

            <button
              onClick={applySet}
              className="w-full rounded-lg py-1.5 text-sm font-medium"
              style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
            >
              {t("action.apply")}
            </button>
          </motion.div>,
          document.body,
        )}

      {open === "save" &&
        menuPos &&
        createPortal(
          <motion.div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: menuPos.origin === "top" ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="glass-strong fixed z-[100] w-64 rounded-2xl p-3 text-left shadow-2xl"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <p className="mb-1.5 text-[11px] font-medium uppercase" style={{ color: "var(--color-ink-faint)" }}>
              {t("menu.folder")}
            </p>
            <p className="mb-2 truncate text-sm" style={{ color: "var(--color-ink-muted)" }} title={folder ?? undefined}>
              {folder ?? t("settings.defaultFolder")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleChooseFolder}
                className="flex-1 rounded-lg border py-1.5 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
              >
                {t("action.choose")}
              </button>
              <button
                onClick={() => applySave(folder)}
                className="flex-1 rounded-lg py-1.5 text-sm font-medium"
                style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
              >
                {t("action.save")}
              </button>
            </div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}
