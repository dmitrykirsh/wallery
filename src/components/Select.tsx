import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

const MARGIN = 8;

/** A glass-styled stand-in for a native <select> — rendered into a portal
 * so it can't be clipped by an ancestor's overflow:hidden (e.g. the
 * slideshow rule card's expand/collapse animation wrapper), unlike a
 * plain position:absolute dropdown would be. */
export default function Select<T extends string | number>({ value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function toggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estHeight = Math.min(options.length * 36 + 16, 280);
      const openDown = window.innerHeight - rect.bottom >= estHeight + MARGIN || rect.top < estHeight + MARGIN;
      setPos({
        top: openDown ? rect.bottom + 6 : Math.max(MARGIN, rect.top - estHeight - 6),
        left: Math.max(MARGIN, Math.min(rect.left, window.innerWidth - rect.width - MARGIN)),
        width: rect.width,
      });
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
      >
        <span className="truncate">{current?.label ?? ""}</span>
        <motion.svg width="10" height="10" viewBox="0 0 10 10" className="ml-2 shrink-0 opacity-60" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </motion.svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="glass-strong fixed z-[200] max-h-[280px] overflow-y-auto rounded-2xl p-1.5 shadow-2xl"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                  style={{
                    color: o.value === value ? "var(--color-accent)" : "var(--color-ink)",
                    background: o.value === value ? "rgba(255,255,255,0.06)" : "transparent",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
