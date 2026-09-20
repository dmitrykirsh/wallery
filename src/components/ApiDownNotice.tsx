import { motion } from "framer-motion";
import { useLang } from "../lib/LangContext";

interface Props {
  /** The raw error text, used only to pull out an HTTP status like 521. */
  error?: string | null;
  favoritesCount: number;
  onOpenFavorites: () => void;
  onRetry?: () => void;
}

function statusCode(error: string | null | undefined): string | null {
  return error?.match(/\b(5\d\d)\b/)?.[1] ?? null;
}

/** Shown in place of the content when Wallhaven itself is down (Cloudflare's
 * 521 and friends, or no connection). The point of the screen is the second
 * half of the message: everything already in favorites is stored on disk and
 * still works, so the app is never a dead end. */
export default function ApiDownNotice({ error, favoritesCount, onOpenFavorites, onRetry }: Props) {
  const { t } = useLang();
  const code = statusCode(error);

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center"
    >
      <svg width="200" height="150" viewBox="0 0 200 150" fill="none" aria-hidden="true">
        <circle cx="100" cy="76" r="62" fill="var(--color-surface-2)" />
        <circle cx="100" cy="76" r="62" stroke="var(--color-border)" strokeWidth="1" />
        <path
          d="M52 106C34 106 26 86 40 76C38 58 60 50 72 60C78 42 108 38 120 56C144 52 158 72 146 86C162 94 156 106 140 106Z"
          fill="var(--color-surface-3)"
          stroke="var(--color-ink-faint)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M105 62L90 90H103L96 110L118 80H106L112 62Z" fill="var(--color-accent)" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinejoin="round" />
        <g transform="translate(138 100)">
          <circle r="17" fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="1" />
          <path
            transform="translate(-9 -9) scale(0.75)"
            d="M12 21s-7.5-4.6-10-9.3C0.3 8 1.7 4 5.6 3.2 8 2.7 10.4 4 12 6.3 13.6 4 16 2.7 18.4 3.2 22.3 4 23.7 8 22 11.7 19.5 16.4 12 21 12 21Z"
            fill="var(--color-favorite)"
          />
        </g>
        <circle cx="52" cy="46" r="2.5" fill="var(--color-accent-2)" />
        <circle cx="156" cy="44" r="2" fill="var(--color-accent)" />
        <circle cx="34" cy="98" r="1.6" fill="var(--color-ink-faint)" />
      </svg>

      <h2 className="mt-4 font-serif font-semibold text-heading-lg" style={{ color: "var(--color-ink)" }}>
        {t("apiDown.title")}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
        {t("apiDown.text")}
      </p>

      {code && (
        <span className="mt-3 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-ink-faint)", fontVariantNumeric: "tabular-nums" }}>
          {t("apiDown.code")}: {code}
        </span>
      )}

      {favoritesCount > 0 && (
        <p className="mt-6 text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {t("apiDown.favorites")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {favoritesCount > 0 && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onOpenFavorites}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
          >
            {t("apiDown.openFavorites")} · {favoritesCount}
          </motion.button>
        )}
        {onRetry && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onRetry}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
          >
            {t("apiDown.retry")}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
