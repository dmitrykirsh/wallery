import { AnimatePresence, motion } from "framer-motion";

interface Props {
  message: string | null;
}

export default function Toast({ message }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence>
        {message && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="glass-strong rounded-full px-4 py-2 text-sm"
            style={{ color: "var(--color-ink)" }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
