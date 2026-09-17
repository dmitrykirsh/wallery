/** Color adjustments applied to a wallpaper before cropping/exporting,
 * expressed directly as CSS `filter()` function arguments so the live
 * preview (a plain `filter` style on an <img>) and the final baked-in
 * output (the same string handed to a canvas 2d context) are always
 * pixel-for-pixel identical — there's no separate "preview math" and
 * "export math" to keep in sync. */
export interface Adjustments {
  brightness: number; // 100 = neutral
  contrast: number; // 100 = neutral
  saturation: number; // 100 = neutral
  hue: number; // degrees, 0 = neutral
  sepia: number; // 0 = neutral
  grayscale: number; // 0 = neutral
  invert: number; // 0 = neutral
}

export const NEUTRAL_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
};

export function isNeutral(a: Adjustments): boolean {
  return adjustmentsEqual(a, NEUTRAL_ADJUSTMENTS);
}

export function adjustmentsEqual(a: Adjustments, b: Adjustments): boolean {
  return a.brightness === b.brightness && a.contrast === b.contrast && a.saturation === b.saturation && a.hue === b.hue && a.sepia === b.sepia && a.grayscale === b.grayscale && a.invert === b.invert;
}

export function cssFilterString(a: Adjustments): string {
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
    `hue-rotate(${a.hue}deg)`,
    a.sepia ? `sepia(${a.sepia}%)` : "",
    a.grayscale ? `grayscale(${a.grayscale}%)` : "",
    a.invert ? `invert(${a.invert}%)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export interface FilterPreset {
  id: string;
  name: string;
  adjust: Adjustments;
}

function preset(id: string, name: string, overrides: Partial<Adjustments>): FilterPreset {
  return { id, name, adjust: { ...NEUTRAL_ADJUSTMENTS, ...overrides } };
}

/** Twenty ready-made looks, roughly in the same spirit as Wallpaper Engine's
 * or a photo app's built-in filter shelf. Names are left in English —
 * like Instagram/Lightroom presets, they read as proper-noun style labels
 * in every language rather than something that needs translating. */
export const PRESET_FILTERS: FilterPreset[] = [
  preset("vivid", "Vivid", { contrast: 112, saturation: 145 }),
  preset("vivid-warm", "Vivid Warm", { contrast: 108, saturation: 130, hue: -8, brightness: 104 }),
  preset("vivid-cool", "Vivid Cool", { contrast: 110, saturation: 125, hue: 10, brightness: 102 }),
  preset("dramatic", "Dramatic", { contrast: 140, saturation: 90, brightness: 95 }),
  preset("dramatic-cool", "Dramatic Cool", { contrast: 135, saturation: 85, hue: 12, brightness: 92 }),
  preset("mono", "Mono", { grayscale: 100, contrast: 108 }),
  preset("noir", "Noir", { grayscale: 100, contrast: 145, brightness: 88 }),
  preset("silvertone", "Silvertone", { grayscale: 100, brightness: 112, contrast: 95 }),
  preset("sepia", "Sepia", { sepia: 75, contrast: 105, saturation: 95 }),
  preset("vintage", "Vintage", { sepia: 35, saturation: 80, contrast: 92, brightness: 106 }),
  preset("faded", "Faded", { contrast: 82, saturation: 65, brightness: 110 }),
  preset("chrome", "Chrome", { saturation: 140, contrast: 118, brightness: 102 }),
  preset("cool", "Cool", { hue: 15, saturation: 108, brightness: 102 }),
  preset("warm", "Warm", { hue: -12, saturation: 112, brightness: 104 }),
  preset("golden-hour", "Golden Hour", { sepia: 25, saturation: 122, hue: -8, brightness: 106 }),
  preset("moody-blue", "Moody Blue", { hue: 25, saturation: 90, contrast: 116, brightness: 90 }),
  preset("pastel", "Pastel", { saturation: 55, brightness: 114, contrast: 88 }),
  preset("high-key", "High Key", { brightness: 122, contrast: 88, saturation: 95 }),
  preset("low-key", "Low Key", { brightness: 78, contrast: 132, saturation: 100 }),
  preset("inverted", "Inverted", { invert: 100 }),
];
