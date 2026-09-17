import { useState } from "react";
import { motion } from "framer-motion";
import type { WidgetInstance } from "../lib/widgets";
import { normalizeClockStyle, type AnalogFace, type BackgroundKind, type ClockStyle } from "../lib/clockStyle";
import { CLOCK_PRESETS } from "../lib/clockPresets";
import { loadCustomClockStyles, saveCustomClockStyles, type CustomClockStyle } from "../lib/customClockStyles";
import { emitStyleUpdate, resizeWidgetWindow } from "../lib/widgetWindow";
import { FONT_OPTIONS } from "../lib/googleFonts";
import { useLang } from "../lib/LangContext";

interface Props {
  widget: WidgetInstance;
  onClose: () => void;
  onSave: (style: ClockStyle, size: { width: number; height: number }) => void;
}

const MAX_TEXTURE_BYTES = 600_000;
const DEFAULT_DIGITAL_SIZE = { width: 420, height: 160 };

function swatchColor(style: ClockStyle): string {
  if (style.background.kind === "none") return style.mode === "digital" ? style.digital.color : style.analog.handHour;
  return style.background.color;
}

function ChipRow<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels: Record<T, string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <span key={opt} role="button" className="chip" data-active={value === opt} onClick={() => onChange(opt)}>
          {labels[opt]}
        </span>
      ))}
    </div>
  );
}

function SliderField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-ink-muted)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--color-ink-faint)" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

function CheckboxField({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-fit cursor-pointer select-none items-center gap-2 text-sm ${className ?? ""}`}
      style={{ color: "var(--color-ink)" }}
    >
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors"
        style={{ borderColor: checked ? "var(--color-accent)" : "var(--color-border)", background: checked ? "var(--gradient-accent)" : "transparent" }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1.5 5L4 7.5L8.5 2" stroke="var(--color-accent-ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </span>
  );
}

function ColorField({ label, value, onChange, onClear }: { label: string; value: string; onChange: (v: string) => void; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 rounded border-0 bg-transparent" />
        {onClear && (
          <span role="button" className="text-xs underline" style={{ color: "var(--color-ink-faint)" }} onClick={onClear}>
            ✕
          </span>
        )}
      </div>
    </div>
  );
}

export default function WidgetEditorModal({ widget, onClose, onSave }: Props) {
  const { t } = useLang();
  const [style, setStyle] = useState<ClockStyle>(widget.style);
  const [size, setSize] = useState({ width: widget.width, height: widget.height });
  const [customStyles, setCustomStyles] = useState<CustomClockStyle[]>(() => loadCustomClockStyles());
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  function updateSizeImpl(next: { width: number; height: number }) {
    setSize(next);
    resizeWidgetWindow(widget.id, next.width, next.height);
  }

  function update(next: ClockStyle) {
    setStyle(next);
    emitStyleUpdate(widget.id, next);
    // Time + date + weather (+ forecast) stacks taller than a bare clock —
    // grow the window (once) so a preset or a freshly-checked toggle
    // doesn't just get its extra lines clipped at the old height.
    if (next.mode === "digital" && next.digital.showWeather && size.height < 220) {
      updateSizeImpl({ ...size, height: 260 });
    }
  }

  function updateSize(next: { width: number; height: number }) {
    updateSizeImpl(next);
  }

  function patch(p: Partial<ClockStyle>) {
    update(normalizeClockStyle({ ...style, ...p }));
  }
  function patchDigital(p: Partial<ClockStyle["digital"]>) {
    update(normalizeClockStyle({ ...style, digital: { ...style.digital, ...p } }));
  }
  function patchAnalog(p: Partial<ClockStyle["analog"]>) {
    update(normalizeClockStyle({ ...style, analog: { ...style.analog, ...p } }));
  }
  function patchBackground(p: Partial<ClockStyle["background"]>) {
    update(normalizeClockStyle({ ...style, background: { ...style.background, ...p } }));
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_TEXTURE_BYTES) {
      window.alert(t("editor.imageTooBig"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patchBackground({ imageDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  function saveAsStyle() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [...customStyles, { id: crypto.randomUUID(), name: trimmed, style }];
    setCustomStyles(next);
    saveCustomClockStyles(next);
    setNaming(false);
  }

  function removeCustomStyle(id: string) {
    const next = customStyles.filter((s) => s.id !== id);
    setCustomStyles(next);
    saveCustomClockStyles(next);
  }

  function handleClose() {
    // Editing only ever pushed live *previews* — the widget's persisted
    // style/size shouldn't change unless the user actually hits Save.
    emitStyleUpdate(widget.id, widget.style);
    resizeWidgetWindow(widget.id, widget.width, widget.height);
    onClose();
  }

  function handleSave() {
    onSave(style, size);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        // This sits inside WidgetsModal's own backdrop-closing div (not a
        // portal) — without this, a click out here would bubble up and
        // close that modal too, not just this one.
        e.stopPropagation();
        handleClose();
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="glass-strong max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            {t("editor.title")}
          </h2>
          <button onClick={handleClose} className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {t("editor.presets")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CLOCK_PRESETS.map((p) => (
                <span key={p.id} role="button" className="chip" data-active={JSON.stringify(style) === JSON.stringify(p.style)} onClick={() => update(p.style)}>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: swatchColor(p.style) }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {customStyles.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
                {t("editor.myStyles")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customStyles.map((s) => (
                  <motion.span key={s.id} whileTap={{ scale: 0.95 }} role="button" className="chip" data-active={JSON.stringify(style) === JSON.stringify(s.style)} onClick={() => update(s.style)}>
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: swatchColor(s.style) }} />
                    {s.name}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomStyle(s.id);
                      }}
                      className="ml-1.5"
                    >
                      ✕
                    </span>
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
              {t("editor.mode")}
            </p>
            <ChipRow
              options={["digital", "analog"]}
              value={style.mode}
              onChange={(mode) => {
                patch({ mode });
                // An analog face wants a round-ish window — a digital
                // clock's wide rectangle would squash the circle into an
                // oval, so switching modes snaps to a sensible aspect
                // instead of leaving the user to fix it by hand.
                if (mode === "analog" && Math.abs(size.width - size.height) > 20) {
                  updateSize({ width: Math.max(size.width, size.height), height: Math.max(size.width, size.height) });
                } else if (mode === "digital" && size.width === size.height) {
                  updateSize(DEFAULT_DIGITAL_SIZE);
                }
              }}
              labels={{ digital: t("editor.modeDigital"), analog: t("editor.modeAnalog") }}
            />
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
              {t("editor.size")}
            </p>
            <div className="flex flex-col gap-2.5">
              <SliderField label={t("editor.width")} value={size.width} min={80} max={1400} step={10} onChange={(width) => updateSize({ ...size, width })} />
              <SliderField label={t("editor.height")} value={size.height} min={60} max={800} step={10} onChange={(height) => updateSize({ ...size, height })} />
            </div>
            <span role="button" className="mt-2 inline-block text-xs underline" style={{ color: "var(--color-ink-faint)" }} onClick={() => updateSize({ width: Math.max(size.width, size.height), height: Math.max(size.width, size.height) })}>
              {t("editor.square")}
            </span>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
              {t("editor.background")}
            </p>
            <ChipRow
              options={["none", "solid", "gradient", "glass", "image"] as BackgroundKind[]}
              value={style.background.kind}
              onChange={(kind) => patchBackground({ kind })}
              labels={{ none: t("editor.bgNone"), solid: t("editor.bgSolid"), gradient: t("editor.bgGradient"), glass: t("editor.bgGlass"), image: t("editor.bgImage") }}
            />

            {style.background.kind !== "none" && (
              <div className="mt-3 flex flex-col gap-2.5">
                {style.background.kind === "image" ? (
                  <label className="cursor-pointer rounded-lg border px-3 py-2 text-center text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}>
                    {t("editor.uploadImage")}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <>
                    <ColorField label={t("editor.color")} value={style.background.color} onChange={(color) => patchBackground({ color })} />
                    {style.background.kind === "gradient" && <ColorField label={t("editor.color2")} value={style.background.color2} onChange={(color2) => patchBackground({ color2 })} />}
                  </>
                )}
                <SliderField label={t("editor.opacity")} value={style.background.opacity} min={0} max={100} onChange={(opacity) => patchBackground({ opacity })} />
                {style.background.kind === "glass" && <SliderField label={t("editor.blur")} value={style.background.blur} min={0} max={40} onChange={(blur) => patchBackground({ blur })} />}
                <SliderField label={t("editor.cornerRadius")} value={Math.min(style.background.cornerRadius, 60)} min={0} max={60} onChange={(cornerRadius) => patchBackground({ cornerRadius })} />
                <div className="flex items-center gap-2">
                  <span role="button" className="chip" data-active={style.background.cornerRadius >= 999} onClick={() => patchBackground({ cornerRadius: 999 })}>
                    {t("editor.round")}
                  </span>
                </div>
                <ColorField
                  label={t("editor.border")}
                  value={style.background.borderColor || "#ffffff"}
                  onChange={(borderColor) => patchBackground({ borderColor })}
                  onClear={style.background.borderColor ? () => patchBackground({ borderColor: "" }) : undefined}
                />
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2.5 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
              <CheckboxField label={t("editor.outline")} checked={style.background.outline} onChange={(outline) => patchBackground({ outline })} />
              {style.background.outline && <ColorField label={t("editor.outlineColor")} value={style.background.outlineColor} onChange={(outlineColor) => patchBackground({ outlineColor })} />}

              <CheckboxField label={t("editor.divider")} checked={style.background.divider} onChange={(divider) => patchBackground({ divider })} />
              {style.background.divider && <ColorField label={t("editor.dividerColor")} value={style.background.dividerColor} onChange={(dividerColor) => patchBackground({ dividerColor })} />}
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
              {t("editor.transform")}
            </p>
            <div className="flex flex-col gap-2.5">
              <SliderField label={t("editor.rotation")} value={style.rotation} min={-45} max={45} onChange={(rotation) => patch({ rotation })} />
              <SliderField label={t("editor.opacity")} value={style.opacity} min={10} max={100} onChange={(opacity) => patch({ opacity })} />
            </div>
          </div>

          {style.mode === "digital" ? (
            <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
              <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
                {t("editor.font")}
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {FONT_OPTIONS.map((f) => (
                  <span key={f.id} role="button" className="chip" data-active={style.digital.fontId === f.id} onClick={() => patchDigital({ fontId: f.id })}>
                    {f.label}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                <SliderField label={t("editor.fontSize")} value={style.digital.fontSize} min={16} max={320} step={2} onChange={(fontSize) => patchDigital({ fontSize })} />
                <SliderField label={t("editor.fontWeight")} value={style.digital.fontWeight} min={200} max={800} step={100} onChange={(fontWeight) => patchDigital({ fontWeight })} />
                <SliderField label={t("editor.letterSpacing")} value={style.digital.letterSpacing} min={-2} max={8} onChange={(letterSpacing) => patchDigital({ letterSpacing })} />
                <ColorField label={t("editor.color")} value={style.digital.color} onChange={(color) => patchDigital({ color })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm" style={{ color: "var(--color-ink)" }}>
                <CheckboxField label={t("editor.showSeconds")} checked={style.digital.showSeconds} onChange={(showSeconds) => patchDigital({ showSeconds })} />
                <CheckboxField label={t("editor.glow")} checked={style.digital.glow} onChange={(glow) => patchDigital({ glow })} />
                <CheckboxField label={t("editor.italic")} checked={style.digital.italic} onChange={(italic) => patchDigital({ italic })} />
                <CheckboxField label={t("editor.uppercase")} checked={style.digital.uppercase} onChange={(uppercase) => patchDigital({ uppercase })} />
              </div>
              <div className="mt-3">
                <ChipRow options={["24h", "12h"]} value={style.digital.format} onChange={(format) => patchDigital({ format })} labels={{ "24h": t("editor.format24"), "12h": t("editor.format12") }} />
              </div>

              <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                <CheckboxField className="mb-2 font-medium" label={t("editor.showDate")} checked={style.digital.showDate} onChange={(showDate) => patchDigital({ showDate })} />
                {style.digital.showDate && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {FONT_OPTIONS.map((f) => (
                        <span key={f.id} role="button" className="chip" data-active={style.digital.dateFontId === f.id} onClick={() => patchDigital({ dateFontId: f.id })}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                    <SliderField label={t("editor.fontSize")} value={style.digital.dateFontSize} min={10} max={100} onChange={(dateFontSize) => patchDigital({ dateFontSize })} />
                    <ColorField label={t("editor.color")} value={style.digital.dateColor} onChange={(dateColor) => patchDigital({ dateColor })} />
                    <ChipRow
                      options={["long", "short"]}
                      value={style.digital.dateFormat}
                      onChange={(dateFormat) => patchDigital({ dateFormat })}
                      labels={{ long: t("editor.dateLong"), short: t("editor.dateShort") }}
                    />
                    <CheckboxField label={t("editor.uppercase")} checked={style.digital.dateUppercase} onChange={(dateUppercase) => patchDigital({ dateUppercase })} />
                  </div>
                )}
              </div>

              <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                <CheckboxField className="mb-2 font-medium" label={t("editor.showWeather")} checked={style.digital.showWeather} onChange={(showWeather) => patchDigital({ showWeather })} />
                {style.digital.showWeather && (
                  <div className="flex flex-col gap-2.5">
                    <ChipRow
                      options={["auto", "manual"]}
                      value={style.digital.weatherLocationMode}
                      onChange={(weatherLocationMode) => patchDigital({ weatherLocationMode })}
                      labels={{ auto: t("editor.weatherAuto"), manual: t("editor.weatherManual") }}
                    />
                    {style.digital.weatherLocationMode === "manual" && (
                      <input
                        value={style.digital.weatherLocationQuery}
                        onChange={(e) => patchDigital({ weatherLocationQuery: e.target.value })}
                        placeholder={t("editor.weatherCityPlaceholder")}
                        className="rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                      />
                    )}
                    <ChipRow options={["c", "f"]} value={style.digital.weatherUnit} onChange={(weatherUnit) => patchDigital({ weatherUnit })} labels={{ c: "°C", f: "°F" }} />
                    <SliderField label={t("editor.fontSize")} value={style.digital.weatherFontSize} min={10} max={80} onChange={(weatherFontSize) => patchDigital({ weatherFontSize })} />
                    <ColorField label={t("editor.color")} value={style.digital.weatherColor} onChange={(weatherColor) => patchDigital({ weatherColor })} />
                    <CheckboxField label={t("editor.showForecast")} checked={style.digital.showForecast} onChange={(showForecast) => patchDigital({ showForecast })} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
              <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
                {t("editor.face")}
              </p>
              <div className="mb-3">
                <ChipRow
                  options={["minimal", "ticks", "numerals", "roman"] as AnalogFace[]}
                  value={style.analog.face}
                  onChange={(face) => patchAnalog({ face })}
                  labels={{ minimal: t("editor.faceMinimal"), ticks: t("editor.faceTicks"), numerals: t("editor.faceNumerals"), roman: t("editor.faceRoman") }}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                <ColorField
                  label={t("editor.faceColor")}
                  value={style.analog.faceColor || "#ffffff"}
                  onChange={(faceColor) => patchAnalog({ faceColor })}
                  onClear={style.analog.faceColor ? () => patchAnalog({ faceColor: "" }) : undefined}
                />
                <ColorField label={t("editor.tickColor")} value={style.analog.tickColor} onChange={(tickColor) => patchAnalog({ tickColor })} />
                <ColorField label={t("editor.handHour")} value={style.analog.handHour} onChange={(handHour) => patchAnalog({ handHour })} />
                <ColorField label={t("editor.handMinute")} value={style.analog.handMinute} onChange={(handMinute) => patchAnalog({ handMinute })} />
                <ColorField label={t("editor.handSecond")} value={style.analog.handSecond} onChange={(handSecond) => patchAnalog({ handSecond })} />
              </div>
              <CheckboxField className="mt-3" label={t("editor.showSecondHand")} checked={style.analog.showSecondHand} onChange={(showSecondHand) => patchAnalog({ showSecondHand })} />
            </div>
          )}

          <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            {naming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveAsStyle();
                    if (e.key === "Escape") setNaming(false);
                  }}
                  placeholder={t("editor.styleNamePlaceholder")}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
                <motion.button whileTap={{ scale: 0.96 }} onClick={saveAsStyle} className="rounded-lg px-3 py-2 text-sm font-medium" style={{ background: "var(--color-surface-3)", color: "var(--color-ink)" }}>
                  {t("action.save")}
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setName("");
                  setNaming(true);
                }}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
              >
                {t("editor.saveStyle")}
              </motion.button>
            )}
          </div>

          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleClose} className="flex-1 rounded-lg py-2 text-sm font-medium" style={{ background: "var(--color-surface-3)", color: "var(--color-ink)" }}>
              {t("action.cancel")}
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSave} className="flex-1 rounded-lg py-2 text-sm font-medium" style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}>
              {t("action.save")}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
