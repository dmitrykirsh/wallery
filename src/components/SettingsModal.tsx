import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getVersion } from "@tauri-apps/api/app";
import type { Settings } from "../lib/settings";
import { HERO_CUSTOM_SORTING_VALUES, type HeroMode, type HeroSettings } from "../lib/heroSettings";
import type { RecommendationSettings } from "../lib/recommendationSettings";
import { RESOLUTION_GROUPS, RATIOS, RATIO_GROUPS, LANDSCAPE_RATIOS, PORTRAIT_RATIOS } from "../lib/filters";
import type { Category, Purity } from "../lib/types";
import { shuffledTags } from "../lib/tags";
import { isTauri, quitApp, setAutostart as syncAutostart } from "../lib/tauri";
import { exportAllData, importAllData } from "../lib/dataBackup";
import { getBlockedTags, blockTag, unblockTag } from "../lib/recommendationEngine";
import { useLang } from "../lib/LangContext";
import { LANGUAGES } from "../lib/i18n";

interface Props {
  settings: Settings;
  heroSettings: HeroSettings;
  recommendationSettings: RecommendationSettings;
  onSave: (settings: Settings, heroSettings: HeroSettings, recommendationSettings: RecommendationSettings) => void;
  onClose: () => void;
}

const HERO_MODES: { key: HeroMode; label: "quick.hot" | "quick.toplist" | "quick.latest" | "quick.custom" }[] = [
  { key: "hot", label: "quick.hot" },
  { key: "toplist", label: "quick.toplist" },
  { key: "latest", label: "quick.latest" },
  { key: "custom", label: "quick.custom" },
];

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
          {hint}
        </div>
      </div>
      <span
        role="button"
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))" : "var(--color-surface-3)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
    </div>
  );
}

export default function SettingsModal({ settings, heroSettings, recommendationSettings, onSave, onClose }: Props) {
  const [version, setVersion] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  useEffect(() => {
    if (isTauri()) getVersion().then(setVersion).catch(() => {});
  }, []);

  async function handleExportData() {
    setBackupBusy(true);
    try {
      await exportAllData();
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleImportData() {
    // Restoring writes straight into localStorage, but every piece of app
    // state was already loaded into memory at startup — a reload is the
    // simplest way to make everything (favorites, widgets, this API key
    // field, etc.) actually reflect what was just restored.
    if (!window.confirm(t("settings.importConfirm"))) return;
    setBackupBusy(true);
    try {
      const restored = await importAllData();
      if (restored) window.location.reload();
    } finally {
      setBackupBusy(false);
    }
  }
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [nsfwEnabled, setNsfwEnabled] = useState(settings.nsfwEnabled);
  const [sketchyEnabled, setSketchyEnabled] = useState(settings.sketchyEnabled);
  const [autostart, setAutostart] = useState(settings.autostart);
  const [hero, setHero] = useState<HeroSettings>(heroSettings);
  const [rec, setRec] = useState<RecommendationSettings>(recommendationSettings);
  const [tagDraft, setTagDraft] = useState("");
  const [blockedTags, setBlockedTags] = useState<string[]>(() => [...getBlockedTags()]);
  const [blockDraft, setBlockDraft] = useState("");
  // Shuffled once per modal open so the picker offers a fresh spread each
  // time without needing to re-fetch or infinitely scroll anything.
  const [suggestedTags] = useState(() => shuffledTags(nsfwEnabled).slice(0, 60));
  const { t, lang, setLang } = useLang();

  function updateHero(next: Partial<HeroSettings>) {
    setHero((prev) => ({ ...prev, ...next }));
  }

  function addRecTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    setRec((prev) => (prev.customTags.includes(tag) ? prev : { ...prev, customTags: [...prev.customTags, tag] }));
    setTagDraft("");
  }

  function removeRecTag(tag: string) {
    setRec((prev) => ({ ...prev, customTags: prev.customTags.filter((existing) => existing !== tag) }));
  }

  function toggleRecTag(tag: string) {
    if (rec.customTags.includes(tag)) removeRecTag(tag);
    else addRecTag(tag);
  }

  function addBlockedTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    blockTag(tag);
    setBlockedTags([...getBlockedTags()]);
    setBlockDraft("");
  }

  function removeBlockedTag(tag: string) {
    unblockTag(tag);
    setBlockedTags([...getBlockedTags()]);
  }

  function toggleRecCategory(cat: Category) {
    setRec((prev) => {
      const next = { ...prev.categories, [cat]: !prev.categories[cat] };
      if (Object.values(next).every((v) => !v)) return prev;
      return { ...prev, categories: next };
    });
  }

  function toggleRecPurity(p: Purity) {
    setRec((prev) => {
      const next = { ...prev.purities, [p]: !prev.purities[p] };
      if (Object.values(next).every((v) => !v)) return prev;
      return { ...prev, purities: next };
    });
  }

  function pickRecAtLeast(res: string) {
    setRec((prev) => ({ ...prev, atleast: prev.atleast === res ? null : res }));
  }

  function toggleRecRatio(ratio: string) {
    setRec((prev) => ({ ...prev, ratios: prev.ratios.includes(ratio) ? prev.ratios.filter((r) => r !== ratio) : [...prev.ratios, ratio] }));
  }

  function setRecRatioGroup(group: string[]) {
    setRec((prev) => {
      const isActive = group.every((r) => prev.ratios.includes(r)) && prev.ratios.length === group.length;
      return { ...prev, ratios: isActive ? [] : group };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="glass-strong flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl p-6"
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            {t("settings.title")}
          </h2>
          <span className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
            {version ? `Wallery v${version}` : "Wallery"}
          </span>
        </div>

        <div className="my-4">
          <label className="mb-1.5 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {t("settings.language")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <span key={l.code} role="button" onClick={() => setLang(l.code)} className="chip" data-active={lang === l.code}>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="my-2 divide-y" style={{ borderColor: "var(--color-border)" }}>
          <ToggleRow label={t("settings.sketchyToggle")} hint={t("settings.sketchyHint")} checked={sketchyEnabled} onChange={setSketchyEnabled} />
          <ToggleRow label={t("settings.nsfwToggle")} hint={t("settings.nsfwHint")} checked={nsfwEnabled} onChange={setNsfwEnabled} />
        </div>

        <div className="my-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            {t("settings.bannerTitle")}
          </h3>

          <label className="mb-1.5 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {t("settings.bannerSource")}
          </label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {HERO_MODES.map((m) => (
              <span key={m.key} role="button" onClick={() => updateHero({ mode: m.key })} className="chip" data-active={hero.mode === m.key}>
                {t(m.label)}
              </span>
            ))}
          </div>

          {hero.mode === "custom" && (
            <>
              <input
                value={hero.customQuery}
                onChange={(e) => updateHero({ customQuery: e.target.value })}
                placeholder={t("settings.bannerQueryPlaceholder")}
                className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
              />

              <label className="mb-1.5 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
                {t("settings.bannerSorting")}
              </label>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {HERO_CUSTOM_SORTING_VALUES.map((s) => (
                  <span key={s} role="button" onClick={() => updateHero({ customSorting: s })} className="chip" data-active={hero.customSorting === s}>
                    {t(`sort.${s}` as const)}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            <ToggleRow label={t("settings.bannerSketchyToggle")} hint={t("settings.sketchyHint")} checked={hero.sketchyEnabled} onChange={(v) => updateHero({ sketchyEnabled: v })} />
            <ToggleRow label={t("settings.bannerNsfwToggle")} hint={t("settings.nsfwHint")} checked={hero.nsfwEnabled} onChange={(v) => updateHero({ nsfwEnabled: v })} />
          </div>
        </div>

        <div className="my-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            {t("settings.recTitle")}
          </h3>

          <ToggleRow label={t("settings.recToggle")} hint={t("settings.recHint")} checked={rec.useCustomTags} onChange={(v) => setRec((prev) => ({ ...prev, useCustomTags: v }))} />

          {rec.useCustomTags && (
            <div className="mt-2">
              {rec.customTags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {rec.customTags.map((tag) => (
                    <motion.span
                      key={tag}
                      whileTap={{ scale: 0.95 }}
                      role="button"
                      onClick={() => removeRecTag(tag)}
                      className="chip"
                      data-active="true"
                    >
                      #{tag} ✕
                    </motion.span>
                  ))}
                </div>
              )}

              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRecTag(tagDraft);
                  }
                }}
                placeholder={t("settings.recAddPlaceholder")}
                className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
              />

              <p className="mb-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
                {t("settings.recSuggested")}
              </p>
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {suggestedTags.map((tag) => (
                  <span key={tag} role="button" onClick={() => toggleRecTag(tag)} className="chip" data-active={rec.customTags.includes(tag)}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
              {t("settings.recFilters")}
            </p>

            <div className="mb-2 flex flex-wrap gap-1.5">
              {(["general", "anime", "people"] as Category[]).map((cat) => (
                <span key={cat} role="button" onClick={() => toggleRecCategory(cat)} className="chip" data-active={rec.categories[cat]}>
                  {t(`filter.${cat}` as const)}
                </span>
              ))}
              <span className="mx-1 h-5 w-px self-center" style={{ background: "var(--color-border)" }} />
              {(["sfw", ...(sketchyEnabled ? (["sketchy"] as const) : []), ...(nsfwEnabled ? (["nsfw"] as const) : [])] as Purity[]).map((p) => (
                <span key={p} role="button" onClick={() => toggleRecPurity(p)} className="chip" data-active={rec.purities[p]}>
                  {p.toUpperCase()}
                </span>
              ))}
            </div>

            <p className="mb-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {t("filter.atLeast")}
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {RESOLUTION_GROUPS.flatMap((g) => g.values).map((res) => (
                <span key={res} role="button" onClick={() => pickRecAtLeast(res)} className="chip" data-active={rec.atleast === res}>
                  {res}
                </span>
              ))}
            </div>

            <p className="mb-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {t("filter.ratio")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span role="button" onClick={() => setRecRatioGroup(LANDSCAPE_RATIOS)} className="chip" data-active={LANDSCAPE_RATIOS.every((r) => rec.ratios.includes(r)) && rec.ratios.length === LANDSCAPE_RATIOS.length}>
                {t("filter.allWide")}
              </span>
              <span role="button" onClick={() => setRecRatioGroup(PORTRAIT_RATIOS)} className="chip" data-active={PORTRAIT_RATIOS.every((r) => rec.ratios.includes(r)) && rec.ratios.length === PORTRAIT_RATIOS.length}>
                {t("filter.allPortrait")}
              </span>
              {RATIO_GROUPS.flatMap((g) => g.values).map((value) => {
                const r = RATIOS.find((x) => x.value === value);
                return (
                  <span key={value} role="button" onClick={() => toggleRecRatio(value)} className="chip" data-active={rec.ratios.includes(value)}>
                    {r?.label ?? value}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-faint)" }}>
              {t("settings.recBlockedTags")}
            </p>
            <p className="mb-2 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {t("settings.recBlockedHint")}
            </p>
            {blockedTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {blockedTags.map((tag) => (
                  <motion.span key={tag} whileTap={{ scale: 0.95 }} role="button" onClick={() => removeBlockedTag(tag)} className="chip" data-active="true">
                    #{tag} ✕
                  </motion.span>
                ))}
              </div>
            )}
            <input
              value={blockDraft}
              onChange={(e) => setBlockDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBlockedTag(blockDraft);
                }
              }}
              placeholder={t("settings.recBlockedPlaceholder")}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />
          </div>
        </div>

        <p className="mb-4 mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {t("settings.apiKeyHint")}
        </p>

        <label className="mb-1 block text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {t("settings.apiKeyLabel")}
        </label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="…"
          className="mb-5 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
        />

        {isTauri() && (
          <>
            <div className="my-2 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
              <ToggleRow label={t("settings.autostartToggle")} hint={t("settings.autostartHint")} checked={autostart} onChange={setAutostart} />
            </div>
            <p className="mb-4 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {t("settings.closeToTray")}
            </p>
          </>
        )}
        </div>

        {isTauri() && (
          <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
              {t("settings.backup")}
            </p>
            <p className="mb-2 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {t("settings.backupHint")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExportData}
                disabled={backupBusy}
                className="rounded-lg border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
              >
                {t("settings.exportData")}
              </button>
              <button
                onClick={handleImportData}
                disabled={backupBusy}
                className="rounded-lg border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
              >
                {t("settings.importData")}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-4">
          {isTauri() ? (
            <button onClick={() => quitApp()} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}>
              {t("settings.quit")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              {t("action.cancel")}
            </button>
            <button
              onClick={() => {
                syncAutostart(autostart);
                onSave({ ...settings, apiKey, nsfwEnabled, sketchyEnabled, autostart }, hero, rec);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))", color: "var(--color-accent-ink)" }}
            >
              {t("action.save")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
