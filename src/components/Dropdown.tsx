import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  label: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  children: ReactNode;
}

export default function Dropdown({ label, icon, active, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((o) => !o)}
        className="chip"
        data-active={active || open}
      >
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
          <motion.svg width="10" height="10" viewBox="0 0 10 10" className="opacity-60" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </motion.svg>
        </span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -2 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "top left" }}
            className="glass-strong absolute left-0 z-30 mt-2 min-w-[220px] rounded-2xl p-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
