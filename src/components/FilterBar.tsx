import { useState } from "react";
import { motion } from "framer-motion";
import type { Filters, Category, Purity } from "../lib/types";
import { RESOLUTION_GROUPS, RATIOS, RATIO_GROUPS, LANDSCAPE_RATIOS, PORTRAIT_RATIOS, COLORS, SORTING_VALUES, TOP_RANGE_VALUES } from "../lib/filters";
import { useLang } from "../lib/LangContext";
import Dropdown from "./Dropdown";

function screenResolution(): string {
  const w = Math.round(window.screen.width * (window.devicePixelRatio || 1));
  const h = Math.round(window.screen.height * (window.devicePixelRatio || 1));
  return `${w}x${h}`;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
}

const CATEGORY_KEY: Record<Category, "filter.general" | "filter.anime" | "filter.people"> = {
  general: "filter.general",
  anime: "filter.anime",
  people: "filter.people",
};

interface PillColor {
  fill: string;
  border: string;
}

// Decorative differentiation only (category), or aligned with the same
// purity colors used on the wallpaper card badge (sketchy/nsfw) so the same
// state reads as the same color everywhere in the app, not just here.
const CATEGORY_COLORS: Record<Category, PillColor> = {
  general: { fill: "#4a3d31", border: "#8a7660" },
  anime: { fill: "#4a3238", border: "#96707a" },
  people: { fill: "#463d26", border: "#8f7a4f" },
};

const PURITY_COLORS: Record<Purity, PillColor> = {
  sfw: { fill: "#333b31", border: "#7c8b79" },
  sketchy: { fill: "#3d301a", border: "#c9963d" },
  nsfw: { fill: "#33201a", border: "#c05a3e" },
};

function coloredChipStyle(active: boolean, color: PillColor): React.CSSProperties | undefined {
  if (!active) return undefined;
  return {
    background: color.fill,
    borderColor: color.border,
    color: "var(--color-ink)",
  };
}

const ICONS = {
  resolution: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="13" rx="2" />
      <path d="M3 15l5-4 4 3 5-5 4 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ratio: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="10" rx="2" />
    </svg>
  ),
  color: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
  sort: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h10M4 18h6" strokeLinecap="round" />
    </svg>
  ),
  period: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" />
    </svg>
  ),
};

/** A small pill option used inside dropdown panels — active state gets the
 * gradient fill + glow, matching the chips in the main toolbar. */
function OptionPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
      style={
        active
          ? { background: "var(--gradient-accent)", borderColor: "var(--color-accent)", color: "var(--color-accent-ink)" }
          : { background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }
      }
    >
      {children}
    </motion.button>
  );
}

export default function FilterBar({ filters, onChange, nsfwAllowed, sketchyAllowed }: Props) {
  const { t } = useLang();
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  // "Hot" isn't a distinct Wallhaven sort value — it's shorthand for
  // toplist-over-the-last-week, so it's derived rather than stored.
  const isHotSort = filters.sorting === "toplist" && filters.topRange === "1w";
  // Which resolution mode the picker is showing. Can't be purely derived from
  // filters (atleast/resolutions) — both are empty right after switching to
  // "Exactly" with nothing picked yet, which would otherwise snap back to
  // "At Least" until a value is actually chosen.
  const [isAtLeastMode, setIsAtLeastMode] = useState(filters.resolutions.length === 0);

  function toggleCategory(cat: Category) {
    const next = { ...filters.categories, [cat]: !filters.categories[cat] };
    if (Object.values(next).every((v) => !v)) return;
    onChange({ ...filters, categories: next });
  }

  function togglePurity(p: Purity) {
    const next = { ...filters.purities, [p]: !filters.purities[p] };
    if (Object.values(next).every((v) => !v)) return;
    onChange({ ...filters, purities: next });
  }

  function setAtLeastMode() {
    setIsAtLeastMode(true);
    if (filters.resolutions.length > 0) onChange({ ...filters, resolutions: [] });
  }

  function setExactMode() {
    setIsAtLeastMode(false);
    if (filters.atleast) onChange({ ...filters, atleast: null });
  }

  function pickAtLeast(res: string) {
    onChange({ ...filters, atleast: filters.atleast === res ? null : res, resolutions: [] });
  }

  function toggleExactResolution(res: string) {
    const has = filters.resolutions.includes(res);
    onChange({ ...filters, atleast: null, resolutions: has ? filters.resolutions.filter((r) => r !== res) : [...filters.resolutions, res] });
  }

  function applyCustomResolution() {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (!w || !h) return;
    const res = `${w}x${h}`;
    if (isAtLeastMode) {
      onChange({ ...filters, atleast: res, resolutions: [] });
    } else {
      onChange({ ...filters, atleast: null, resolutions: filters.resolutions.includes(res) ? filters.resolutions : [...filters.resolutions, res] });
    }
    setCustomW("");
    setCustomH("");
  }

  function toggleRatio(ratio: string) {
    const has = filters.ratios.includes(ratio);
    onChange({ ...filters, ratios: has ? filters.ratios.filter((r) => r !== ratio) : [...filters.ratios, ratio] });
  }

  function setRatioGroup(group: string[]) {
    const isActive = group.every((r) => filters.ratios.includes(r)) && filters.ratios.length === group.length;
    onChange({ ...filters, ratios: isActive ? [] : group });
  }

  function pickColor(color: string | null) {
    onChange({ ...filters, colors: color ? [color] : [] });
  }

  const purities: Purity[] = ["sfw", ...(sketchyAllowed ? (["sketchy"] as const) : []), ...(nsfwAllowed ? (["nsfw"] as const) : [])];

  return (
    <div className="glass-strong flex flex-wrap items-center gap-1.5 rounded-2xl p-2">
      {(Object.keys(CATEGORY_KEY) as Category[]).map((cat) => (
        <motion.button
          key={cat}
          type="button"
          whileTap={{ scale: 0.96 }}
          className="chip"
          data-active={filters.categories[cat]}
          style={coloredChipStyle(filters.categories[cat], CATEGORY_COLORS[cat])}
          onClick={() => toggleCategory(cat)}
        >
          {t(CATEGORY_KEY[cat])}
        </motion.button>
      ))}

      <span className="mx-1 h-5 w-px" style={{ background: "var(--color-border)" }} />

      {purities.map((p) => (
        <motion.button
          key={p}
          type="button"
          whileTap={{ scale: 0.96 }}
          className="chip"
          data-active={filters.purities[p]}
          style={coloredChipStyle(filters.purities[p], PURITY_COLORS[p])}
          onClick={() => togglePurity(p)}
        >
          {p.toUpperCase()}
        </motion.button>
      ))}

      <span className="mx-1 h-5 w-px" style={{ background: "var(--color-border)" }} />

      <Dropdown label={t("filter.resolution")} icon={ICONS.resolution} active={!!filters.atleast || filters.resolutions.length > 0}>
        <div className="mb-3 flex gap-1.5">
          <OptionPill active={isAtLeastMode} onClick={setAtLeastMode}>
            {t("filter.atLeast")}
          </OptionPill>
          <OptionPill active={!isAtLeastMode} onClick={setExactMode}>
            {t("filter.exactly")}
          </OptionPill>
        </div>
        <p className="mb-3 px-0.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          {t("filter.yourScreenIs")} <strong style={{ color: "var(--color-ink)" }}>{screenResolution()}</strong>
        </p>
        <div className="grid w-[440px] grid-cols-5 gap-x-3 gap-y-1">
          {RESOLUTION_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
                {group.label === "Ultrawide" ? t("filter.ultrawide") : group.label}
              </p>
              {group.values.map((res) => (
                <OptionPill
                  key={res}
                  active={isAtLeastMode ? filters.atleast === res : filters.resolutions.includes(res)}
                  onClick={() => (isAtLeastMode ? pickAtLeast(res) : toggleExactResolution(res))}
                >
                  {res}
                </OptionPill>
              ))}
            </div>
          ))}
        </div>
        <p className="mb-2 mt-3 px-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
          {t("filter.customResolution")}
        </p>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
            placeholder="1920"
            className="w-20 rounded-lg border px-2 py-1 text-xs"
            style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
          />
          <span style={{ color: "var(--color-ink-faint)" }}>×</span>
          <input
            type="number"
            min={1}
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            placeholder="1080"
            className="w-20 rounded-lg border px-2 py-1 text-xs"
            style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
          />
          <button
            onClick={applyCustomResolution}
            className="rounded-lg px-2.5 py-1 text-xs font-medium"
            style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
          >
            {t("filter.apply")}
          </button>
        </div>
      </Dropdown>

      <Dropdown label={t("filter.ratio")} icon={ICONS.ratio} active={filters.ratios.length > 0}>
        <div className="mb-3 flex gap-1.5">
          <OptionPill active={LANDSCAPE_RATIOS.every((r) => filters.ratios.includes(r)) && filters.ratios.length === LANDSCAPE_RATIOS.length} onClick={() => setRatioGroup(LANDSCAPE_RATIOS)}>
            {t("filter.allWide")}
          </OptionPill>
          <OptionPill active={PORTRAIT_RATIOS.every((r) => filters.ratios.includes(r)) && filters.ratios.length === PORTRAIT_RATIOS.length} onClick={() => setRatioGroup(PORTRAIT_RATIOS)}>
            {t("filter.allPortrait")}
          </OptionPill>
        </div>
        <div className="grid w-[300px] grid-cols-4 gap-x-2 gap-y-1">
          {RATIO_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
                {group.label === "Wide" ? t("filter.wide") : group.label === "Ultrawide" ? t("filter.ultrawide") : group.label === "Portrait" ? t("filter.portrait") : t("filter.square")}
              </p>
              {group.values.map((value) => {
                const r = RATIOS.find((x) => x.value === value);
                return (
                  <OptionPill key={value} active={filters.ratios.includes(value)} onClick={() => toggleRatio(value)}>
                    {r?.label ?? value}
                  </OptionPill>
                );
              })}
            </div>
          ))}
        </div>
      </Dropdown>

      <Dropdown label={t("filter.color")} icon={ICONS.color} active={filters.colors.length > 0}>
        <div className="grid grid-cols-6 gap-2">
          <button
            onClick={() => pickColor(null)}
            className="col-span-6 mb-1 rounded-lg py-1 text-xs"
            style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
          >
            {t("action.reset")}
          </button>
          {COLORS.map((c) => (
            <motion.button
              key={c}
              whileTap={{ scale: 0.9 }}
              onClick={() => pickColor(c)}
              className="h-6 w-6 rounded-full border-2"
              style={{
                background: `#${c}`,
                borderColor: filters.colors[0] === c ? "var(--color-ink)" : "transparent",
                boxShadow: filters.colors[0] === c ? `0 0 0 2px var(--color-accent)` : "inset 0 0 0 1px var(--color-border)",
              }}
              title={`#${c}`}
            />
          ))}
        </div>
      </Dropdown>

      <Dropdown label={isHotSort ? t("quick.hot") : t(`sort.${filters.sorting}` as const)} icon={ICONS.sort}>
        <p className="mb-2 px-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
          {t("filter.sorting")}
        </p>
        <div className="flex max-w-[220px] flex-wrap gap-1.5">
          <OptionPill active={isHotSort} onClick={() => onChange({ ...filters, sorting: "toplist", topRange: "1w" })}>
            {t("quick.hot")}
          </OptionPill>
          {SORTING_VALUES.map((s) => (
            <OptionPill
              key={s}
              active={s === filters.sorting && !(s === "toplist" && isHotSort)}
              onClick={() => onChange({ ...filters, sorting: s })}
            >
              {t(`sort.${s}` as const)}
            </OptionPill>
          ))}
        </div>
      </Dropdown>

      {filters.sorting === "toplist" && !isHotSort && (
        <Dropdown label={t(`range.${filters.topRange}` as const)} icon={ICONS.period}>
          <p className="mb-2 px-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
            {t("filter.period")}
          </p>
          <div className="flex max-w-[220px] flex-wrap gap-1.5">
            {TOP_RANGE_VALUES.map((r) => (
              <OptionPill key={r} active={r === filters.topRange} onClick={() => onChange({ ...filters, topRange: r })}>
                {t(`range.${r}` as const)}
              </OptionPill>
            ))}
          </div>
        </Dropdown>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        className="chip"
        aria-label={t("filter.sortDirection")}
        onClick={() => onChange({ ...filters, order: filters.order === "desc" ? "asc" : "desc" })}
      >
        <motion.span animate={{ rotate: filters.order === "desc" ? 0 : 180 }} transition={{ duration: 0.2 }}>
          ↓
        </motion.span>
      </motion.button>
    </div>
  );
}
