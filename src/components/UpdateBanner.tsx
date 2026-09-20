import { motion } from "framer-motion";
import { useLang } from "../lib/LangContext";
import { openInBrowser } from "../lib/tauri";
import type { UpdateInfo } from "../lib/updates";

interface Props {
  update: UpdateInfo;
  onDismiss: () => void;
}

export default function UpdateBanner({ update, onDismiss }: Props) {
  const { t } = useLang();
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="glass-strong fixed right-5 bottom-5 z-50 flex w-80 flex-col gap-3 rounded-2xl p-4"
    >
      <div>
        <div className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
          {t("update.available")}
        </div>
        <div className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Wallery v{update.version}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDismiss} className="rounded-lg px-3 py-1.5 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {t("update.later")}
        </button>
        <button
          type="button"
          onClick={() => {
            openInBrowser(update.url);
            onDismiss();
          }}
          className="rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
        >
          {t("update.download")}
        </button>
      </div>
    </motion.div>
  );
}
