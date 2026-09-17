import { DEFAULT_CLOCK_STYLE, type AnalogStyle, type ClockBackground, type ClockStyle, type DigitalStyle } from "./clockStyle";

export interface ClockPreset {
  id: string;
  name: string;
  style: ClockStyle;
}

interface ClockStyleOverrides extends Partial<Omit<ClockStyle, "background" | "digital" | "analog">> {
  background?: Partial<ClockBackground>;
  digital?: Partial<DigitalStyle>;
  analog?: Partial<AnalogStyle>;
}

function preset(id: string, name: string, overrides: ClockStyleOverrides): ClockPreset {
  return {
    id,
    name,
    style: {
      ...DEFAULT_CLOCK_STYLE,
      ...overrides,
      background: { ...DEFAULT_CLOCK_STYLE.background, ...overrides.background },
      digital: { ...DEFAULT_CLOCK_STYLE.digital, ...overrides.digital },
      analog: { ...DEFAULT_CLOCK_STYLE.analog, ...overrides.analog },
    },
  };
}

/** Ten ready-made looks, modeled directly on the reference set: bare huge
 * typography sitting right on the wallpaper, not a card floating on top —
 * a background/border is the exception here, not the rule. Names stay in
 * English, like the photo-filter presets. */
export const CLOCK_PRESETS: ClockPreset[] = [
  preset("glow-minimal", "Glow Minimal", {
    digital: { fontId: "inter", fontWeight: 800, fontSize: 84, color: "#ffffff", glow: true, showDate: true, dateFontSize: 20, dateUppercase: true },
  }),
  preset("clean-sans", "Clean Sans", {
    digital: { fontId: "system", fontWeight: 700, fontSize: 76, color: "#ffffff", glow: false, showDate: true, dateFormat: "long", dateUppercase: true, dateFontSize: 18 },
  }),
  preset("neon-pink", "Neon Pink", {
    digital: { fontId: "orbitron", fontWeight: 700, fontSize: 64, color: "#ff4fd8", letterSpacing: 1, glow: true, showDate: false },
  }),
  preset("fire-script", "Fire Script", {
    background: { divider: true, dividerColor: "rgba(255,255,255,0.6)" },
    digital: { fontId: "oswald", fontWeight: 700, fontSize: 68, color: "#f0a04b", italic: true, uppercase: true, glow: false, showDate: true, dateFontId: "oswald", dateFontSize: 22, dateUppercase: true, dateColor: "#ffffff" },
  }),
  preset("ring-outline", "Ring Outline", {
    background: { outline: true, outlineColor: "rgba(255,255,255,0.55)", cornerRadius: 999 },
    digital: { fontId: "inter", fontWeight: 500, fontSize: 44, color: "#ffffff", glow: false, showDate: true, dateFontSize: 15, dateUppercase: true },
  }),
  preset("frosted-bars", "Frosted Bars", {
    background: { kind: "solid", color: "#ffffff", opacity: 12, cornerRadius: 4 },
    digital: { fontId: "system", fontWeight: 300, fontSize: 46, color: "#ffffff", letterSpacing: 4, glow: false, showDate: false },
  }),
  preset("thin-editorial", "Thin Editorial", {
    digital: { fontId: "georgia", fontWeight: 400, fontSize: 60, color: "#ffffff", glow: false, showDate: true, dateFormat: "long", dateUppercase: false, dateFontId: "georgia", dateFontSize: 20 },
  }),
  preset("retro-mono", "Retro Mono", {
    digital: { fontId: "mono", fontWeight: 700, fontSize: 58, color: "#e8e8e8", letterSpacing: 4, glow: false, showDate: true, dateFormat: "short", dateUppercase: true, dateFontId: "mono", dateFontSize: 16 },
  }),
  preset("ultra-thin", "Ultra Thin", {
    digital: { fontId: "system", fontWeight: 200, fontSize: 120, color: "rgba(255,255,255,0.85)", glow: false, showSeconds: false, showDate: false },
  }),
  preset("divider-classic", "Divider Classic", {
    background: { divider: true, dividerColor: "rgba(255,255,255,0.45)" },
    digital: {
      fontId: "playfair",
      fontWeight: 600,
      fontSize: 66,
      color: "#ffffff",
      glow: false,
      showDate: true,
      dateFontId: "playfair",
      dateFontSize: 19,
      dateUppercase: true,
      showWeather: true,
      weatherFontSize: 22,
      weatherColor: "#ffffff",
      showForecast: true,
    },
  }),
];
