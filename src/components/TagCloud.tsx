import { useState } from "react";
import { shuffledTags } from "../lib/tags";

// Shown all at once, no progressive reveal — a fixed, scannable count
// instead of an infinite-scrolling list of tags.
const VISIBLE_COUNT = 60;
const SIZE_CLASSES = ["text-sm opacity-70", "text-base opacity-85", "text-lg opacity-100 font-medium"];

interface Props {
  onSelect: (tag: string) => void;
  includeNsfw?: boolean;
}

export default function TagCloud({ onSelect, includeNsfw }: Props) {
  // Shuffled once per component mount (i.e. once per app load) so the order
  // is fresh each time but stable while browsing.
  const [pool] = useState(() => shuffledTags(includeNsfw));
  const visible = pool.slice(0, VISIBLE_COUNT);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 px-6 pb-10">
      {visible.map((tag, i) => {
        const sizeClass = SIZE_CLASSES[(i * 7 + tag.length) % SIZE_CLASSES.length];
        return (
          <span
            key={tag}
            onClick={() => onSelect(tag)}
            role="button"
            className={`cursor-pointer transition-colors hover:!opacity-100 ${sizeClass}`}
            style={{ color: "var(--color-ink-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-muted)")}
          >
            #{tag}
          </span>
        );
      })}
    </div>
  );
}
