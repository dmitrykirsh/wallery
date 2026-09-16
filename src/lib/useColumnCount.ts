import { useEffect, useState, type RefObject } from "react";

const TARGET_COLUMN_WIDTH = 300;

export function useColumnCount(ref: RefObject<HTMLElement | null>): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Debounced — a transient width blip (e.g. a scrollbar appearing right
    // as new content loads in) would otherwise flip the column count for a
    // moment and reflow every card, which reads as a jerk right when
    // scrolling settles. Only a width change that sticks around actually
    // means the window was resized.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      clearTimeout(timer);
      timer = setTimeout(() => setCount(Math.max(1, Math.round(width / TARGET_COLUMN_WIDTH))), 150);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref]);

  return count;
}
