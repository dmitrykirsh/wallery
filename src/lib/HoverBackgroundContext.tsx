import { createContext, useContext, useRef, useState, type ReactNode } from "react";

interface HoverBackgroundValue {
  image: string | null;
  setImage: (url: string | null) => void;
}

const HoverBackgroundContext = createContext<HoverBackgroundValue | null>(null);

export function HoverBackgroundProvider({ children }: { children: ReactNode }) {
  const [image, setImageState] = useState<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A short delay before committing a hover, too — the heavy blur filter is
  // expensive to (re)compute, so swiping across several cards while scanning
  // the grid would otherwise trigger one expensive recompute per card
  // instead of settling once on whichever one the pointer actually lands on.
  const setTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function setImage(url: string | null) {
    clearTimeout(clearTimer.current);
    clearTimeout(setTimer.current);
    if (url) {
      setTimer.current = setTimeout(() => setImageState(url), 90);
    } else {
      clearTimer.current = setTimeout(() => setImageState(null), 120);
    }
  }

  return <HoverBackgroundContext.Provider value={{ image, setImage }}>{children}</HoverBackgroundContext.Provider>;
}

export function useHoverBackground(): HoverBackgroundValue {
  const ctx = useContext(HoverBackgroundContext);
  if (!ctx) throw new Error("useHoverBackground must be used within HoverBackgroundProvider");
  return ctx;
}
