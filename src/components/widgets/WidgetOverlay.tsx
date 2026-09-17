import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { loadWidgets } from "../../lib/widgets";
import { normalizeClockStyle, type ClockStyle } from "../../lib/clockStyle";
import ClockWidget from "./ClockWidget";

interface Props {
  id: string;
}

/** Rendered inside its own transparent, click-through, always-on-top
 * window (see lib/widgetWindow.ts) — one per active widget. This is NOT
 * mounted inside the normal app tree; main.tsx routes straight here for
 * any window whose URL is "#/widget/<id>", skipping the rest of the app
 * entirely (no TopBar, no LangProvider, nothing but this one widget's
 * face on a transparent background).
 *
 * Click-through is controlled remotely by the main window (see
 * setWidgetEditing) — while it's off, the drag handler below simply
 * never fires, since the OS hands the click straight to the desktop
 * beneath instead of to this window at all. Style changes made live in
 * the editor arrive over the "style-update" event rather than requiring
 * a reload, so the preview here matches what's on screen exactly. */
export default function WidgetOverlay({ id }: Props) {
  const widget = loadWidgets().find((w) => w.id === id);
  const [style, setStyle] = useState<ClockStyle | null>(widget?.style ?? null);

  useEffect(() => {
    const unlisten = listen<ClockStyle>("style-update", (e) => setStyle(normalizeClockStyle(e.payload)));
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  if (!widget || !style) return null;

  return (
    <div className="h-screen w-screen" onPointerDown={() => getCurrentWindow().startDragging()}>
      {widget.type === "clock" && <ClockWidget style={style} />}
    </div>
  );
}
