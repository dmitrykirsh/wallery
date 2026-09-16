import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Wallpaper } from "../lib/types";
import { cropWallpaper, type CropRect } from "../lib/tauri";
import { useMonitors } from "../lib/useMonitors";
import { useLang } from "../lib/LangContext";
import FallbackImage from "./FallbackImage";

interface Props {
  wallpaper: Wallpaper;
  /** The exact URL the main viewer already finished loading — reusing it
   * (the browser serves it from cache) instead of independently racing a
   * second request for the same, sometimes very large, file. */
  src: string;
  onToast: (message: string) => void;
}

type TargetMode = "screen" | { monitorId: string } | "custom";

const PREVIEW_WIDTH = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function targetKey(mode: TargetMode): string {
  return typeof mode === "string" ? mode : `monitor:${mode.monitorId}`;
}

export default function CropPanel({ wallpaper, src, onToast }: Props) {
  const { t } = useLang();
  const monitors = useMonitors();
  const [mode, setMode] = useState<TargetMode>("screen");
  const [customW, setCustomW] = useState(1920);
  const [customH, setCustomH] = useState(1080);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState<"set" | "save" | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const screenTarget = useMemo(
    () => ({
      width: Math.round(window.screen.width * (window.devicePixelRatio || 1)),
      height: Math.round(window.screen.height * (window.devicePixelRatio || 1)),
    }),
    [],
  );

  const target =
    mode === "screen"
      ? screenTarget
      : mode === "custom"
        ? { width: Math.max(1, customW), height: Math.max(1, customH) }
        : (() => {
            const m = monitors.find((mon) => mon.id === mode.monitorId);
            return m && m.width > 0 ? { width: m.width, height: m.height } : screenTarget;
          })();

  const aspect = target.width / target.height;
  const previewHeight = PREVIEW_WIDTH / aspect;

  const imgW = wallpaper.dimension_x;
  const imgH = wallpaper.dimension_y;
  const baseScale = Math.max(PREVIEW_WIDTH / imgW, previewHeight / imgH);
  const effScale = baseScale * zoom;
  const dispW = imgW * effScale;
  const dispH = imgH * effScale;

  function clampPan(p: { x: number; y: number }) {
    const minX = Math.min(0, PREVIEW_WIDTH - dispW);
    const minY = Math.min(0, previewHeight - dispH);
    return { x: Math.min(0, Math.max(minX, p.x)), y: Math.min(0, Math.max(minY, p.y)) };
  }

  // Re-center whenever the target aspect ratio, zoom, or wallpaper changes —
  // otherwise the old pan offset can point outside the new crop bounds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPan(clampPan({ x: (PREVIEW_WIDTH - dispW) / 2, y: (previewHeight - dispH) / 2 })), [targetKey(mode), wallpaper.id]);
  useEffect(() => setPan((p) => clampPan(p)), [zoom, target.width, target.height]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy }));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function computeCropRect(): CropRect {
    const sx = -pan.x / effScale;
    const sy = -pan.y / effScale;
    const sw = PREVIEW_WIDTH / effScale;
    const sh = previewHeight / effScale;
    return { x: Math.round(sx), y: Math.round(sy), width: Math.round(sw), height: Math.round(sh) };
  }

  async function apply(action: "set" | "save") {
    setBusy(action);
    try {
      const crop = computeCropRect();
      const monitorId = typeof mode === "object" ? mode.monitorId : null;
      const path = await cropWallpaper(wallpaper.id, wallpaper.path, crop, target.width, target.height, monitorId, action, null);
      onToast(action === "set" ? t("crop.setDone") : `${t("crop.saveDone")}: ${path}`);
    } catch (err) {
      onToast(String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
        {t("crop.title")}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <span role="button" className="chip" data-active={mode === "screen"} onClick={() => setMode("screen")}>
          {t("crop.myScreen")} · {screenTarget.width}×{screenTarget.height}
        </span>
        {monitors
          .filter((m) => m.width > 0)
          .map((m) => (
            <span key={m.id} role="button" className="chip" data-active={typeof mode === "object" && mode.monitorId === m.id} onClick={() => setMode({ monitorId: m.id })}>
              {t("monitor.label")} {m.index} · {m.width}×{m.height}
            </span>
          ))}
        <span role="button" className="chip" data-active={mode === "custom"} onClick={() => setMode("custom")}>
          {t("crop.custom")}
        </span>
      </div>

      {mode === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customW}
            onChange={(e) => setCustomW(Number(e.target.value) || 0)}
            className="w-20 rounded-lg border px-2 py-1 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
          />
          <span style={{ color: "var(--color-ink-faint)" }}>×</span>
          <input
            type="number"
            value={customH}
            onChange={(e) => setCustomH(Number(e.target.value) || 0)}
            className="w-20 rounded-lg border px-2 py-1 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
          />
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
        {t("crop.dragHint")}
      </p>

      <div
        className="relative touch-none overflow-hidden rounded-lg select-none"
        style={{ width: PREVIEW_WIDTH, height: previewHeight, background: "#000", cursor: dragRef.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {!imgReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}
        <FallbackImage
          sources={[src]}
          alt=""
          draggable={false}
          priority
          allowManualReload
          onLoad={() => setImgReady(true)}
          style={{ position: "absolute", left: pan.x, top: pan.y, width: dispW, height: dispH, maxWidth: "none" }}
        />
      </div>

      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.02}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="w-full"
      />

      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => apply("save")}
          disabled={busy !== null}
          className="flex-1 rounded-lg py-2 text-sm font-medium"
          style={{ background: "var(--color-surface-3)", color: "var(--color-ink)" }}
        >
          {busy === "save" ? t("action.downloading") : t("crop.save")}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => apply("set")}
          disabled={busy !== null}
          className="flex-1 rounded-lg py-2 text-sm font-medium"
          style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
        >
          {busy === "set" ? t("action.setting") : t("crop.set")}
        </motion.button>
      </div>
    </div>
  );
}
