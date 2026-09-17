import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export interface ContextMenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  pos: { x: number; y: number } | null;
  actions: ContextMenuAction[];
  onClose: () => void;
}

const MENU_WIDTH = 220;
const ITEM_HEIGHT = 38;

export default function ContextMenu({ pos, actions, onClose }: Props) {
  // Closes on any click elsewhere (including the mousedown that precedes a
  // *different* element's own contextmenu event, so right-clicking another
  // card swaps the menu instead of stacking two) or on scroll, since a
  // stale menu pinned to a now-scrolled-away position looks broken.
  useEffect(() => {
    if (!pos) return;
    function handle() {
      onClose();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("scroll", handle, true);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("scroll", handle, true);
    };
  }, [pos, onClose]);

  if (!pos) return null;

  const left = Math.min(pos.x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(pos.y, window.innerHeight - actions.length * ITEM_HEIGHT - 16 - 8);

  return createPortal(
    <AnimatePresence>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className="glass-strong fixed z-[200] rounded-2xl p-1.5 text-left shadow-2xl"
        style={{ top, left, width: MENU_WIDTH }}
      >
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => {
              a.onClick();
              onClose();
            }}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
            style={{ color: a.danger ? "#ef4b53" : "var(--color-ink)" }}
          >
            {a.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
