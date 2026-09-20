import { motion } from "framer-motion";
import { getChangelog } from "../lib/changelog";
import { useLang } from "../lib/LangContext";

interface Props {
  version: string;
  onClose: () => void;
}

export default function WhatsNewModal({ version, onClose }: Props) {
  const { t, lang } = useLang();
  const items = getChangelog(version, lang);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("whatsNew.title")}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="glass-strong flex max-h-[80vh] w-full max-w-lg flex-col rounded-3xl p-6"
      >
        <div className="mb-1 flex items-baseline gap-2">
          <h2 className="font-serif font-semibold text-heading" style={{ color: "var(--color-ink)" }}>
            {t("whatsNew.title")}
          </h2>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}>
            v{version}
          </span>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {items ? (
            <ul className="flex flex-col gap-2.5">
              {items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm" style={{ color: "var(--color-ink-muted)" }}>
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--color-accent)" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-ink-faint)" }}>
              {t("whatsNew.empty")}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-5">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
          >
            {t("whatsNew.done")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
