import { motion } from "framer-motion";
import { getHelp } from "../lib/help";
import { useLang } from "../lib/LangContext";

interface Props {
  onClose: () => void;
}

export default function HelpModal({ onClose }: Props) {
  const { t, lang } = useLang();
  const sections = getHelp(lang);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.help")}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="glass-strong flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-serif font-semibold text-heading" style={{ color: "var(--color-ink)" }}>
              {t("settings.help")}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {t("settings.helpHint")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("lightbox.close")} className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {sections.map((section, i) => (
            <details key={section.title} className="group border-t py-2.5 first:border-t-0" style={{ borderColor: "var(--color-border)" }} open={i === 0}>
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden"
                style={{ color: "var(--color-ink)" }}
              >
                {section.title}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 transition-transform group-open:rotate-180"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
                {section.body}
              </p>
            </details>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {t("lightbox.close")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
