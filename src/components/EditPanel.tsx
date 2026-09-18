import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Wallpaper } from "../lib/types";
import { saveEditedWallpaper, type CropRect } from "../lib/tauri";
import { useMonitors } from "../lib/useMonitors";
import { useLang } from "../lib/LangContext";
import FallbackImage from "./FallbackImage";
import { NEUTRAL_ADJUSTMENTS, PRESET_FILTERS, adjustmentsEqual, cssFilterString, isNeutral, type Adjustments } from "../lib/photoFilters";
import { loadCustomFilters, saveCustomFilters, type CustomFilter } from "../lib/customFilters";

interface Props {
  wallpaper: Wallpaper;
  /** The exact URL the main viewer already finished loading — reusing it
   * (the browser serves it from cache) instead of independently racing a
   * second request for the same, sometimes very large, file. */
  src: string;
  onToast: (message: string) => void;
  /** Called whenever the color adjustments change, so the caller can mirror
   * them onto the large main preview — the crop box here is too small to
   * actually judge a color filter by. */
  onFilterChange?: (cssFilter: string) => void;
}

type TargetMode = "screen" | { monitorId: string } | "custom";

const PREVIEW_WIDTH = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function targetKey(mode: TargetMode): string {
  return typeof mode === "string" ? mode : `monitor:${mode.monitorId}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.slice(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, min, max, onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-ink-muted)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--color-ink-faint)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

export default function EditPanel({ wallpaper, src, onToast, onFilterChange }: Props) {
  const { t } = useLang();
  const monitors = useMonitors();
  const [mode, setMode] = useState<TargetMode>("screen");
  const [customW, setCustomW] = useState(1920);
  const [customH, setCustomH] = useState(1080);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState<"set" | "save" | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const [adjust, setAdjust] = useState<Adjustments>(NEUTRAL_ADJUSTMENTS);

  // The crop box is only ~280px wide — nowhere near big enough to actually
  // judge a color filter by. Mirror the live filter onto the large main
  // preview instead, and clear it again when this panel goes away
  // (switching wallpapers unmounts it while the next one's src resolves).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onFilterChange?.(cssFilterString(adjust)), [adjust]);
  useEffect(() => () => onFilterChange?.(""), []);
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>(() => loadCustomFilters());
  const [namingFilter, setNamingFilter] = useState(false);
  const [filterName, setFilterName] = useState("");
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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

  function updateAdjust(patch: Partial<Adjustments>) {
    setAdjust((prev) => ({ ...prev, ...patch }));
  }

  function applyPreset(values: Adjustments) {
    setAdjust(values);
  }

  function startNamingFilter() {
    setFilterName("");
    setNamingFilter(true);
  }

  function confirmSaveFilter() {
    const name = filterName.trim();
    if (!name) return;
    const next = [...customFilters, { id: crypto.randomUUID(), name, adjust }];
    setCustomFilters(next);
    saveCustomFilters(next);
    setNamingFilter(false);
    onToast(t("edit.filterSaved"));
  }

  function removeCustomFilter(id: string) {
    const next = customFilters.filter((f) => f.id !== id);
    setCustomFilters(next);
    saveCustomFilters(next);
  }

  async function apply(action: "set" | "save") {
    setBusy(action);
    try {
      const imgEl = previewRef.current?.querySelector("img");
      if (!imgEl) throw new Error("Image not ready");
      const crop = computeCropRect();

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, target.width);
      canvas.height = Math.max(1, target.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.filter = cssFilterString(adjust);
      ctx.drawImage(imgEl, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), "image/jpeg", 0.92),
      );
      const dataBase64 = await blobToBase64(blob);

      const monitorId = typeof mode === "object" ? mode.monitorId : null;
      const path = await saveEditedWallpaper(wallpaper.id, dataBase64, monitorId, action, null);
      onToast(action === "set" ? t("crop.setDone") : `${t("crop.saveDone")}: ${path}`);
    } catch (err) {
      onToast(String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
          {t("edit.cropTitle")}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="chip" data-active={mode === "screen"} onClick={() => setMode("screen")}>
            {t("crop.myScreen")} · {screenTarget.width}×{screenTarget.height}
          </button>
          {monitors
            .filter((m) => m.width > 0)
            .map((m) => (
              <button key={m.id} type="button" className="chip" data-active={typeof mode === "object" && mode.monitorId === m.id} onClick={() => setMode({ monitorId: m.id })}>
                {t("monitor.label")} {m.index} · {m.width}×{m.height}
              </button>
            ))}
          <button type="button" className="chip" data-active={mode === "custom"} onClick={() => setMode("custom")}>
            {t("crop.custom")}
          </button>
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
          ref={previewRef}
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
            style={{ position: "absolute", left: pan.x, top: pan.y, width: dispW, height: dispH, maxWidth: "none", filter: cssFilterString(adjust) }}
          />
        </div>

        <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.02} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
            {t("edit.colorTitle")}
          </p>
          {!isNeutral(adjust) && (
            <button type="button" className="text-xs underline" style={{ color: "var(--color-ink-faint)" }} onClick={() => setAdjust(NEUTRAL_ADJUSTMENTS)}>
              {t("edit.reset")}
            </button>
          )}
        </div>

        <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
          {t("edit.presets")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_FILTERS.map((p) => (
            <button key={p.id} type="button" className="chip" data-active={adjustmentsEqual(adjust, p.adjust)} onClick={() => applyPreset(p.adjust)}>
              {p.name}
            </button>
          ))}
        </div>

        {customFilters.length > 0 && (
          <>
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {t("edit.myFilters")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {customFilters.map((f) => (
                // A div, not a button: it contains its own delete button, and
                // a button can't legally nest another button.
                <motion.div
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  whileTap={{ scale: 0.95 }}
                  className="chip"
                  data-active={adjustmentsEqual(adjust, f.adjust)}
                  onClick={() => applyPreset(f.adjust)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      applyPreset(f.adjust);
                    }
                  }}
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomFilter(f.id);
                    }}
                    aria-label={t("edit.deleteFilter")}
                    title={t("edit.deleteFilter")}
                    className="ml-1.5"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}

        <div className="my-1 flex flex-col gap-2.5">
          <SliderRow label={t("color.brightness")} value={adjust.brightness} min={0} max={200} onChange={(v) => updateAdjust({ brightness: v })} />
          <SliderRow label={t("color.contrast")} value={adjust.contrast} min={0} max={200} onChange={(v) => updateAdjust({ contrast: v })} />
          <SliderRow label={t("color.saturation")} value={adjust.saturation} min={0} max={200} onChange={(v) => updateAdjust({ saturation: v })} />
          <SliderRow label={t("color.hue")} value={adjust.hue} min={-180} max={180} onChange={(v) => updateAdjust({ hue: v })} />
          <SliderRow label={t("color.sepia")} value={adjust.sepia} min={0} max={100} onChange={(v) => updateAdjust({ sepia: v })} />
          <SliderRow label={t("color.grayscale")} value={adjust.grayscale} min={0} max={100} onChange={(v) => updateAdjust({ grayscale: v })} />
          <SliderRow label={t("color.invert")} value={adjust.invert} min={0} max={100} onChange={(v) => updateAdjust({ invert: v })} />
        </div>

        {namingFilter ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSaveFilter();
                if (e.key === "Escape") setNamingFilter(false);
              }}
              placeholder={t("edit.filterNamePlaceholder")}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />
            <motion.button whileTap={{ scale: 0.96 }} onClick={confirmSaveFilter} className="rounded-lg px-3 py-2 text-sm font-medium" style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}>
              {t("action.save")}
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={isNeutral(adjust)}
            onClick={startNamingFilter}
            className="self-start rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
          >
            {t("edit.saveFilter")}
          </motion.button>
        )}
      </div>

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
