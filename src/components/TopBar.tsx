import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "../lib/LangContext";

interface Props {
  query: string;
  favoritesCount: number;
  slideshowActive: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onSearch: (q: string) => void;
  onLogo: () => void;
  onOpenFavorites: () => void;
  onOpenHistory: () => void;
  onOpenSlideshow: () => void;
  onOpenWidgets: () => void;
  onOpenSettings: () => void;
}

export default function TopBar({
  query,
  favoritesCount,
  slideshowActive,
  canGoBack,
  onBack,
  onSearch,
  onLogo,
  onOpenFavorites,
  onOpenHistory,
  onOpenSlideshow,
  onOpenWidgets,
  onOpenSettings,
}: Props) {
  const [value, setValue] = useState(query);
  const { t } = useLang();

  // Reflect a tag click / quick-search elsewhere in the app — otherwise the
  // input keeps showing whatever was last typed here instead of what's
  // actually being searched.
  useEffect(() => setValue(query), [query]);

  return (
    <header className="glass sticky top-0 z-40 flex items-center gap-4 px-6 py-3">
      <motion.span
        whileTap={{ scale: 0.92 }}
        role="button"
        onClick={onLogo}
        title="Wallery"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--gradient-accent)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="8" cy="8" r="2.6" fill="var(--color-accent-ink)" />
          <path
            d="M2.5 17.5 8.5 10l3.6 4.2 2.4-2.9L21.5 19H2.5Z"
            fill="var(--color-accent-ink)"
            stroke="var(--color-accent-ink)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>

      <motion.span
        whileTap={canGoBack ? { scale: 0.9 } : undefined}
        role="button"
        onClick={canGoBack ? onBack : undefined}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          color: canGoBack ? "var(--color-ink-muted)" : "var(--color-ink-faint)",
          opacity: canGoBack ? 1 : 0.4,
          cursor: canGoBack ? "pointer" : "default",
        }}
        title={t("nav.back")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.span>

      <form
        className="flex flex-1 items-center gap-2 rounded-full border px-4 py-2"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(value.trim());
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" style={{ color: "var(--color-ink-faint)" }}>
          <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("app.searchPlaceholder")}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--color-ink)" }}
        />
      </form>

      <motion.span
        whileTap={{ scale: 0.9 }}
        role="button"
        onClick={onOpenFavorites}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--color-ink-muted)" }}
        title={t("nav.favorites")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21s-7.5-4.6-10-9.3C0.3 8 1.7 4 5.6 3.2 8 2.7 10.4 4 12 6.3 13.6 4 16 2.7 18.4 3.2 22.3 4 23.7 8 22 11.7 19.5 16.4 12 21 12 21Z" />
        </svg>
        {favoritesCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
            style={{ background: "var(--color-favorite)", color: "#1c1408" }}
          >
            {favoritesCount}
          </span>
        )}
      </motion.span>

      <motion.span
        whileTap={{ scale: 0.9 }}
        role="button"
        onClick={onOpenHistory}
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--color-ink-muted)" }}
        title={t("nav.history")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3.5" y="7.5" width="13" height="13" rx="2" />
          <path d="M7.5 7.5V5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" strokeLinejoin="round" />
        </svg>
      </motion.span>

      <motion.span
        whileTap={{ scale: 0.9 }}
        role="button"
        onClick={onOpenSlideshow}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--color-ink-muted)" }}
        title={t("nav.slideshow")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" strokeLinecap="round" />
        </svg>
        {slideshowActive && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--gradient-accent)" }}
          />
        )}
      </motion.span>

      <motion.span
        whileTap={{ scale: 0.9 }}
        role="button"
        onClick={onOpenWidgets}
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--color-ink-muted)" }}
        title={t("nav.widgets")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
        </svg>
      </motion.span>

      <motion.span
        whileTap={{ scale: 0.9 }}
        role="button"
        onClick={onOpenSettings}
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--color-ink-muted)" }}
        title={t("nav.settings")}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M19.4 13a7.6 7.6 0 0 0 0-2l1.9-1.5-2-3.4-2.2.9a7.7 7.7 0 0 0-1.7-1L15 3.5h-4l-.4 2.4a7.7 7.7 0 0 0-1.7 1l-2.2-.9-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-1.9 1.5 2 3.4 2.2-.9c.5.4 1.1.8 1.7 1L11 20.5h4l.4-2.4c.6-.2 1.2-.6 1.7-1l2.2.9 2-3.4L19.4 13Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>
    </header>
  );
}
