import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { normalizeClockStyle, type ClockStyle } from "./clockStyle";
import type { WidgetInstance, WidgetType } from "./widgets";
import { isTauri } from "./tauri";

const FILE_FILTER = { name: "Wallery Widget", extensions: ["json"] };

interface WidgetFile {
  wallery: "widget";
  version: 1;
  type: WidgetType;
  width: number;
  height: number;
  style: ClockStyle;
}

/** Serializes a widget's *look* only — deliberately excludes `monitorName`/
 * `offsetX`/`offsetY`, which are personal to the machine it was set up on. */
export async function exportWidget(widget: WidgetInstance): Promise<boolean> {
  if (!isTauri()) return false;
  const path = await save({
    filters: [FILE_FILTER],
    defaultPath: `clock-${widget.id.slice(0, 8)}.json`,
  });
  if (!path) return false;
  const file: WidgetFile = {
    wallery: "widget",
    version: 1,
    type: widget.type,
    width: widget.width,
    height: widget.height,
    style: widget.style,
  };
  await writeTextFile(path, JSON.stringify(file, null, 2));
  return true;
}

/** Reads a widget file picked by the user and returns its normalized shape,
 * or null if the user cancelled or the file wasn't a valid widget export. */
export async function importWidgetFile(): Promise<{ type: WidgetType; width: number; height: number; style: ClockStyle } | null> {
  if (!isTauri()) return null;
  const path = await open({ filters: [FILE_FILTER], multiple: false, directory: false });
  if (!path || Array.isArray(path)) return null;
  const raw = await readTextFile(path);
  const parsed = JSON.parse(raw) as Partial<WidgetFile>;
  if (parsed.wallery !== "widget" || !parsed.style) return null;
  return {
    type: parsed.type === "clock" ? "clock" : "clock",
    width: typeof parsed.width === "number" ? parsed.width : 420,
    height: typeof parsed.height === "number" ? parsed.height : 160,
    style: normalizeClockStyle(parsed.style),
  };
}
