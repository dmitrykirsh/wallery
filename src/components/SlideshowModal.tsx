import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RESOLUTIONS, COLORS } from "../lib/filters";
import { INTERVAL_OPTIONS, SOURCE_OPTIONS, newRule, type SlideshowRule, type Orientation } from "../lib/slideshow";
import { runSlideshowTick } from "../lib/slideshowEngine";
import type { WallpaperStyle, MonitorInfo } from "../lib/tauri";
import type { Category, Purity } from "../lib/types";
import { useMonitors } from "../lib/useMonitors";
import { useLang } from "../lib/LangContext";
import Select from "./Select";

const STYLES: WallpaperStyle[] = ["fill", "fit", "stretch", "span", "center", "tile"];
const ORIENTATIONS: Orientation[] = ["any", "landscape", "portrait"];
const CATEGORY_KEY: Record<Category, "filter.general" | "filter.anime" | "filter.people"> = {
  general: "filter.general",
  anime: "filter.anime",
  people: "filter.people",
};

interface Props {
  rules: SlideshowRule[];
  apiKey: string;
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  onSave: (rules: SlideshowRule[]) => void;
  onClose: () => void;
}

export default function SlideshowModal({ rules, apiKey, nsfwAllowed, sketchyAllowed, onSave, onClose }: Props) {
  const { t } = useLang();
  const [draft, setDraft] = useState(rules);
  const [expandedId, setExpandedId] = useState<string | null>(rules[0]?.id ?? null);
  const monitors = useMonitors();

  function updateRule(id: string, patch: Partial<SlideshowRule>) {
    setDraft((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRule() {
    const usedMonitors = new Set(draft.map((r) => r.monitor));
    const freeMonitor = monitors.find((m) => !usedMonitors.has(m.id));
    const rule = newRule(freeMonitor ? freeMonitor.id : null);
    setDraft((rs) => [...rs, rule]);
    setExpandedId(rule.id);
  }

  function deleteRule(id: string) {
    setDraft((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="glass-strong max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="font-serif font-semibold text-heading" style={{ color: "var(--color-ink)" }}>
            {t("slideshow.title")}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addRule}
              className="rounded-full px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
            >
              + {t("action.addRule")}
            </button>
            <button type="button" onClick={onClose} aria-label={t("lightbox.close")} className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
              ✕
            </button>
          </div>
        </div>
        <p className="mb-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {t("slideshow.description")}
        </p>

        {draft.length === 0 && (
          <p className="mb-4 rounded-xl border border-dashed p-4 text-center text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-ink-faint)" }}>
            {t("slideshow.noRules")}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {draft.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              expanded={expandedId === rule.id}
              onToggleExpand={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
              onChange={(patch) => updateRule(rule.id, patch)}
              onDelete={() => deleteRule(rule.id)}
              monitors={monitors}
              nsfwAllowed={nsfwAllowed}
              sketchyAllowed={sketchyAllowed}
              apiKey={apiKey}
            />
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {t("action.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
          >
            {t("action.save")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface RuleCardProps {
  rule: SlideshowRule;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<SlideshowRule>) => void;
  onDelete: () => void;
  monitors: MonitorInfo[];
  nsfwAllowed: boolean;
  sketchyAllowed: boolean;
  apiKey: string;
}

function RuleCard({ rule, expanded, onToggleExpand, onChange, onDelete, monitors, nsfwAllowed, sketchyAllowed, apiKey }: RuleCardProps) {
  const { t } = useLang();
  const [applying, setApplying] = useState(false);
  const purities: Purity[] = ["sfw", ...(sketchyAllowed ? (["sketchy"] as const) : []), ...(nsfwAllowed ? (["nsfw"] as const) : [])];
  const matchedMonitor = rule.monitor ? monitors.find((m) => m.id === rule.monitor) : undefined;
  const monitorLabel = rule.monitor ? (matchedMonitor ? `${t("monitor.label")} ${matchedMonitor.index}` : rule.monitor) : t("slideshow.allOnePicture");

  function toggleCategory(cat: Category) {
    const next = { ...rule.categories, [cat]: !rule.categories[cat] };
    if (Object.values(next).every((v) => !v)) return;
    onChange({ categories: next });
  }

  function togglePurity(p: Purity) {
    const next = { ...rule.purities, [p]: !rule.purities[p] };
    if (Object.values(next).every((v) => !v)) return;
    onChange({ purities: next });
  }

  async function applyNow() {
    setApplying(true);
    try {
      await runSlideshowTick(apiKey, rule);
      onChange({ lastAppliedAt: Date.now() });
    } catch {
      // background runner will retry on its own schedule
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="glass rounded-2xl">
      <div className="flex items-center gap-2 p-3">
        <motion.button
          type="button"
          role="switch"
          aria-checked={rule.enabled}
          aria-label={t(`slideshow.source.${rule.source}` as const)}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange({ enabled: !rule.enabled })}
          className="relative h-5 w-9 shrink-0 rounded-full border text-left transition-colors"
          style={{ background: rule.enabled ? "var(--color-accent)" : "var(--color-surface-3)", borderColor: "var(--color-border)" }}
        >
          <span
            className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform"
            style={{ background: "var(--color-ink)", transform: rule.enabled ? "translateX(16px)" : "translateX(0)" }}
          />
        </motion.button>

        <button type="button" onClick={onToggleExpand} aria-expanded={expanded} className="flex flex-1 items-center justify-between gap-2 text-left">
          <span className="truncate text-sm" style={{ color: "var(--color-ink)" }}>
            {t(`slideshow.source.${rule.source}` as const)}
            {rule.query ? ` · ${rule.query}` : ""} · {monitorLabel}
          </span>
          <motion.svg width="10" height="10" viewBox="0 0 10 10" animate={{ rotate: expanded ? 180 : 0 }} style={{ color: "var(--color-ink-faint)" }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </motion.svg>
        </button>

        <button type="button" onClick={onDelete} aria-label={t("slideshow.deleteRule")} title={t("slideshow.deleteRule")} style={{ color: "var(--color-ink-faint)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t p-4" style={{ borderColor: "var(--color-border)" }}>
              {rule.lastAppliedAt > 0 && (
                <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                  {t("slideshow.lastApplied")}: {new Date(rule.lastAppliedAt).toLocaleString()}
                </p>
              )}

              <div>
                <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                  {t("slideshow.source")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCE_OPTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => onChange({ source: s })} className="chip" data-active={rule.source === s}>
                      {t(`slideshow.source.${s}` as const)}
                    </button>
                  ))}
                </div>
              </div>

              {rule.source !== "favorites" && (
                <input
                  value={rule.query}
                  onChange={(e) => onChange({ query: e.target.value })}
                  placeholder={t("slideshow.query")}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
              )}

              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORY_KEY) as Category[]).map((cat) => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)} className="chip" data-active={rule.categories[cat]}>
                    {t(CATEGORY_KEY[cat])}
                  </button>
                ))}
                <span className="mx-1 h-5 w-px self-center" style={{ background: "var(--color-border)" }} />
                {purities.map((p) => (
                  <button key={p} type="button" onClick={() => togglePurity(p)} className="chip" data-active={rule.purities[p]}>
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {rule.source !== "favorites" && (
                  <div>
                    <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                      {t("filter.resolution")}
                    </label>
                    <Select
                      value={rule.resolution ?? ""}
                      onChange={(v) => onChange({ resolution: v || null })}
                      options={[{ value: "", label: t("action.any") }, ...RESOLUTIONS.map((r) => ({ value: r, label: r }))]}
                    />
                  </div>
                )}

                <div className={rule.source === "favorites" ? "col-span-2" : undefined}>
                  <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                    {t("slideshow.interval")}
                  </label>
                  <Select
                    value={rule.intervalMinutes}
                    onChange={(v) => onChange({ intervalMinutes: v })}
                    options={INTERVAL_OPTIONS.map((o) => ({ value: o.minutes, label: t(`interval.${o.label}` as const) }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                  {t("filter.orientation")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ORIENTATIONS.map((o) => (
                    <button key={o} type="button" onClick={() => onChange({ orientation: o })} className="chip" data-active={rule.orientation === o}>
                      {o === "any" ? t("filter.any") : o === "landscape" ? t("filter.landscape") : t("filter.portrait")}
                    </button>
                  ))}
                </div>
              </div>

              {rule.source !== "favorites" && (
                <div>
                  <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                    {t("filter.color")}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChange({ colors: [] })}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
                    >
                      {t("action.any")}
                    </button>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onChange({ colors: [c] })}
                        className="h-6 w-6 rounded-full border-2"
                        style={{ background: `#${c}`, borderColor: rule.colors[0] === c ? "var(--color-accent)" : "transparent" }}
                        title={`#${c}`}
                        aria-label={`#${c}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                  {t("slideshow.targetMonitor")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => onChange({ monitor: null })} className="chip" data-active={rule.monitor === null}>
                    {t("slideshow.allOnePicture")}
                  </button>
                  {monitors.map((m) => (
                    <button key={m.id} type="button" onClick={() => onChange({ monitor: m.id })} className="chip" data-active={rule.monitor === m.id}>
                      {t("monitor.label")} {m.index}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                  {t("menu.fillStyle")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.map((s) => (
                    <button key={s} type="button" onClick={() => onChange({ style: s })} className="chip" data-active={rule.style === s}>
                      {t(`style.${s}` as const)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={applyNow}
                disabled={applying}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
              >
                {applying ? "…" : t("action.applyNow")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
