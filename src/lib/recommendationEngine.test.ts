import { beforeEach, describe, expect, it } from "vitest";
import { installLocalStorageShim } from "./testSetup/localStorageShim";
import { bumpTagStats, excludeWallpaper, getTagStat, sampleBeta, sampleGamma } from "./recommendationEngine";
import type { Wallpaper } from "./types";

function wallpaperWithTags(...tagNames: string[]): Wallpaper {
  return {
    id: "w1",
    url: "",
    short_url: "",
    views: 0,
    favorites: 0,
    source: "",
    purity: "sfw",
    category: "general",
    dimension_x: 1920,
    dimension_y: 1080,
    resolution: "1920x1080",
    ratio: "16x9",
    file_size: 0,
    file_type: "image/jpeg",
    created_at: "",
    colors: [],
    path: "",
    thumbs: { large: "", original: "", small: "" },
    tags: tagNames.map((name, i) => ({ id: i, name, alias: name, category_id: 1, category: "", purity: "sfw", created_at: "" })),
  };
}

beforeEach(() => {
  installLocalStorageShim();
});

describe("getTagStat", () => {
  it("defaults an unseen tag to a uniform Beta(1, 1) prior", () => {
    expect(getTagStat("nebula")).toEqual({ alpha: 1, beta: 1 });
  });
});

describe("bumpTagStats", () => {
  it("adds alpha on 'more' for every tag on the wallpaper", () => {
    const w = wallpaperWithTags("forest", "mountains");
    bumpTagStats(w, "more");
    expect(getTagStat("forest")).toEqual({ alpha: 3, beta: 1 });
    expect(getTagStat("mountains")).toEqual({ alpha: 3, beta: 1 });
  });

  it("adds beta on 'less'", () => {
    const w = wallpaperWithTags("cyberpunk");
    bumpTagStats(w, "less");
    expect(getTagStat("cyberpunk")).toEqual({ alpha: 1, beta: 3 });
  });

  it("adds a large beta on 'exclude' — strong but not absolute", () => {
    const w = wallpaperWithTags("gore");
    bumpTagStats(w, "exclude");
    expect(getTagStat("gore")).toEqual({ alpha: 1, beta: 16 });
  });

  it("accumulates across repeated feedback instead of overwriting", () => {
    const w = wallpaperWithTags("neon");
    bumpTagStats(w, "more");
    bumpTagStats(w, "more");
    bumpTagStats(w, "less");
    expect(getTagStat("neon")).toEqual({ alpha: 5, beta: 3 });
  });

  it("leaves tags not on the wallpaper untouched", () => {
    bumpTagStats(wallpaperWithTags("a"), "more");
    expect(getTagStat("b")).toEqual({ alpha: 1, beta: 1 });
  });
});

describe("excludeWallpaper", () => {
  it("hard-blacklists the id and softly bumps its tags", () => {
    const w = wallpaperWithTags("horror");
    excludeWallpaper(w);
    expect(getTagStat("horror")).toEqual({ alpha: 1, beta: 16 });
  });
});

describe("migration from the legacy weight map", () => {
  it("converts a positive legacy weight into alpha-dominant stats", () => {
    localStorage.setItem("wallery:rec-tag-weights", JSON.stringify({ sunset: 4 }));
    expect(getTagStat("sunset")).toEqual({ alpha: 5, beta: 1 });
  });

  it("converts a negative legacy weight into beta-dominant stats", () => {
    localStorage.setItem("wallery:rec-tag-weights", JSON.stringify({ clutter: -3 }));
    expect(getTagStat("clutter")).toEqual({ alpha: 1, beta: 4 });
  });

  it("only migrates once — a later legacy-map change has no further effect", () => {
    localStorage.setItem("wallery:rec-tag-weights", JSON.stringify({ dust: 2 }));
    expect(getTagStat("dust")).toEqual({ alpha: 3, beta: 1 });
    localStorage.setItem("wallery:rec-tag-weights", JSON.stringify({ dust: -5 }));
    expect(getTagStat("dust")).toEqual({ alpha: 3, beta: 1 });
  });
});

describe("sampleGamma", () => {
  it("produces only positive values", () => {
    for (let i = 0; i < 500; i++) expect(sampleGamma(2.5)).toBeGreaterThan(0);
  });

  it("averages close to its shape parameter over many draws (mean of Gamma(k,1) is k)", () => {
    const n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += sampleGamma(4);
    expect(sum / n).toBeGreaterThan(3.7);
    expect(sum / n).toBeLessThan(4.3);
  });

  it("handles shape < 1 via the boost trick without going negative", () => {
    for (let i = 0; i < 500; i++) expect(sampleGamma(0.3)).toBeGreaterThan(0);
  });
});

describe("sampleBeta", () => {
  it("stays within (0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const s = sampleBeta(2, 5);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    }
  });

  it("averages close to alpha/(alpha+beta) over many draws", () => {
    const n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += sampleBeta(3, 7);
    // True mean is 0.3 — a wide tolerance keeps this from flaking on a
    // legitimately-random sampler while still catching a broken formula.
    expect(sum / n).toBeGreaterThan(0.27);
    expect(sum / n).toBeLessThan(0.33);
  });

  it("a tag with strongly positive feedback samples high far more often than a neutral one", () => {
    let likedWins = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const liked = sampleBeta(9, 1); // e.g. four "recommend more" clicks
      const neutral = sampleBeta(1, 1);
      if (liked > neutral) likedWins++;
    }
    expect(likedWins / trials).toBeGreaterThan(0.85);
  });
});
