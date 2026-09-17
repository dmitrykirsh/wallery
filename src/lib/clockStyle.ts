import type { CSSProperties } from "react";

export type ClockMode = "digital" | "analog";
export type BackgroundKind = "none" | "solid" | "gradient" | "glass" | "image";

export interface ClockBackground {
  kind: BackgroundKind;
  /** Solid fill, or the gradient's start color. */
  color: string;
  /** Gradient's end color — unused outside kind "gradient". */
  color2: string;
  /** Opacity of the background layer itself (0-100) — independent of the
   * clock's overall `opacity`, so e.g. a fully-opaque face can still sit
   * behind a half-transparent text color, or vice versa. */
  opacity: number;
  /** Backdrop blur in px — only meaningful for kind "glass". */
  blur: number;
  /** 999 reads as "fully round" for analog faces. */
  cornerRadius: number;
  /** Empty string = no border. */
  borderColor: string;
  /** Base64 data URL for a user-supplied texture — only used for kind "image". */
  imageDataUrl: string;
  /** A thin outline ring/rect independent of `kind` — most reference looks
   * are bare text with no fill at all, just this kind of light frame (or
   * nothing). Works even when kind is "none". */
  outline: boolean;
  outlineColor: string;
  /** A thin horizontal rule under the time — the other common "bare text"
   * decoration, seen across most of the reference styles. */
  divider: boolean;
  dividerColor: string;
}

export interface DigitalStyle {
  fontId: string;
  fontWeight: number;
  /** px — the reference styles run much bigger than a typical UI label,
   * often a third of the screen width, so this needs real range. */
  fontSize: number;
  color: string;
  letterSpacing: number;
  showSeconds: boolean;
  format: "24h" | "12h";
  /** A soft glow behind the text, tinted to match `color` — doubles as
   * both "legible over any wallpaper" and the neon-sign look. */
  glow: boolean;
  italic: boolean;
  uppercase: boolean;

  /** Date rendered as a second line directly under the time, inside the
   * same widget — every reference look pairs them this way rather than
   * as a separate widget. */
  showDate: boolean;
  dateFontId: string;
  dateFontSize: number;
  dateColor: string;
  /** "long": Понедельник, 23 октября — "short": Пн, 23 окт. */
  dateFormat: "long" | "short";
  dateUppercase: boolean;

  /** Weather, fetched live from Open-Meteo — another line in the same
   * widget, right below the date, matching the reference looks that pair
   * a clock with current conditions rather than treating it as separate. */
  showWeather: boolean;
  weatherLocationMode: "auto" | "manual";
  /** City name to geocode — only used when weatherLocationMode is "manual". */
  weatherLocationQuery: string;
  weatherUnit: "c" | "f";
  weatherFontSize: number;
  weatherColor: string;
  showForecast: boolean;
}

export type AnalogFace = "minimal" | "ticks" | "numerals" | "roman";

export interface AnalogStyle {
  face: AnalogFace;
  /** Empty string = no visible face plate, just hands/ticks. */
  faceColor: string;
  tickColor: string;
  handHour: string;
  handMinute: string;
  handSecond: string;
  showSecondHand: boolean;
}

export interface ClockStyle {
  mode: ClockMode;
  /** Degrees, -45..45. */
  rotation: number;
  /** Overall opacity, 10..100. */
  opacity: number;
  background: ClockBackground;
  digital: DigitalStyle;
  analog: AnalogStyle;
}

export const DEFAULT_CLOCK_STYLE: ClockStyle = {
  mode: "digital",
  rotation: 0,
  opacity: 100,
  background: {
    kind: "none",
    color: "#18161d",
    color2: "#18161d",
    opacity: 55,
    blur: 20,
    cornerRadius: 20,
    borderColor: "rgba(255,255,255,0.12)",
    imageDataUrl: "",
    outline: false,
    outlineColor: "rgba(255,255,255,0.5)",
    divider: false,
    dividerColor: "rgba(255,255,255,0.5)",
  },
  digital: {
    fontId: "inter",
    fontWeight: 700,
    fontSize: 72,
    color: "#ffffff",
    letterSpacing: 0,
    showSeconds: false,
    format: "24h",
    glow: true,
    italic: false,
    uppercase: false,
    showDate: true,
    dateFontId: "inter",
    dateFontSize: 20,
    dateColor: "#ffffff",
    dateFormat: "long",
    dateUppercase: true,
    showWeather: false,
    weatherLocationMode: "auto",
    weatherLocationQuery: "",
    weatherUnit: "c",
    weatherFontSize: 22,
    weatherColor: "#ffffff",
    showForecast: false,
  },
  analog: {
    face: "ticks",
    faceColor: "",
    tickColor: "rgba(255,255,255,0.75)",
    handHour: "#ffffff",
    handMinute: "#ffffff",
    handSecond: "#e3a458",
    showSecondHand: true,
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function backgroundCss(bg: ClockBackground): CSSProperties {
  const alpha = bg.opacity / 100;
  switch (bg.kind) {
    case "none":
      return {};
    case "solid":
      return { background: hexToRgba(bg.color, alpha) };
    case "gradient":
      return { background: `linear-gradient(135deg, ${hexToRgba(bg.color, alpha)}, ${hexToRgba(bg.color2, alpha)})` };
    case "glass":
      return {
        background: hexToRgba(bg.color, alpha),
        backdropFilter: `blur(${bg.blur}px) saturate(150%)`,
        WebkitBackdropFilter: `blur(${bg.blur}px) saturate(150%)`,
      };
    case "image":
      return bg.imageDataUrl
        ? { backgroundImage: `url(${bg.imageDataUrl})`, backgroundSize: "cover", backgroundPosition: "center", opacity: alpha }
        : {};
  }
}

/** Merges a partial style (e.g. from an old saved widget missing newer
 * fields, or a preset that only overrides part of the shape) over the
 * current default so every field always exists. */
export function normalizeClockStyle(partial: Partial<ClockStyle> | undefined): ClockStyle {
  if (!partial) return DEFAULT_CLOCK_STYLE;
  return {
    ...DEFAULT_CLOCK_STYLE,
    ...partial,
    background: { ...DEFAULT_CLOCK_STYLE.background, ...partial.background },
    digital: { ...DEFAULT_CLOCK_STYLE.digital, ...partial.digital },
    analog: { ...DEFAULT_CLOCK_STYLE.analog, ...partial.analog },
  };
}
