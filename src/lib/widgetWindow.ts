import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { availableMonitors, type Monitor } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { emitTo } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";
import type { WidgetInstance } from "./widgets";
import type { ClockStyle } from "./clockStyle";

const WIDGET_LABEL_PREFIX = "widget-";

export function widgetLabel(id: string): string {
  return `${WIDGET_LABEL_PREFIX}${id}`;
}

export async function getMonitors(): Promise<Monitor[]> {
  if (!isTauri()) return [];
  try {
    return await availableMonitors();
  } catch {
    return [];
  }
}

async function resolveMonitor(monitorName: string | null): Promise<Monitor | null> {
  const monitors = await getMonitors();
  if (monitors.length === 0) return null;
  const match = monitorName ? monitors.find((m) => m.name === monitorName) : null;
  // The saved monitor is gone or was renamed (Windows can reshuffle device
  // names after a crash or a re-plug): the primary monitor, the one at
  // (0, 0), is a far safer landing spot than whichever happens to be listed first.
  return match ?? monitors.find((m) => m.position.x === 0 && m.position.y === 0) ?? monitors[0];
}

/** Everything is computed in physical pixels on purpose: a window's logical
 * size/position are converted with the scale factor of whichever monitor it
 * currently sits on, so mixing logical numbers from one monitor with another
 * monitor's DPI is what used to make widgets jump screens and come out at
 * the wrong size. */
async function placeWidget(win: WebviewWindow, widget: WidgetInstance, monitor: Monitor | null) {
  const scale = monitor?.scaleFactor ?? 1;
  const origin = monitor ? monitor.position : { x: 0, y: 0 };
  await win.setPosition(new PhysicalPosition(Math.round(origin.x + widget.offsetX * scale), Math.round(origin.y + widget.offsetY * scale)));
  await win.setSize(new PhysicalSize(Math.round(widget.width * scale), Math.round(widget.height * scale)));
}

// Two overlapping spawn calls for the same widget (the launch effect and a
// second trigger arriving before the first window finished creating) would
// both pass the "does it exist yet" check and open the widget twice.
const pendingSpawns = new Map<string, Promise<void>>();

export function spawnWidgetWindow(widget: WidgetInstance): Promise<void> {
  const pending = pendingSpawns.get(widget.id);
  if (pending) return pending;
  const task = doSpawnWidgetWindow(widget).finally(() => pendingSpawns.delete(widget.id));
  pendingSpawns.set(widget.id, task);
  return task;
}

async function doSpawnWidgetWindow(widget: WidgetInstance): Promise<void> {
  if (!isTauri()) return;
  if (await widgetWindowExists(widget.id)) return;
  const monitor = await resolveMonitor(widget.monitorName);

  const win = new WebviewWindow(widgetLabel(widget.id), {
    url: `index.html#/widget/${widget.id}`,
    width: widget.width,
    height: widget.height,
    transparent: true,
    decorations: false,
    // Not always-on-top — send_widget_to_back below drops it to the
    // bottom of the normal Z-order instead, so it sits behind every other
    // window without needing the WorkerW reparenting trick (which broke
    // this window's transparency outright — SetParent and layered/
    // transparent windows don't mix well). Unlike reparenting, changing
    // Z-order never touches the window's parent, so rendering stays intact.
    alwaysOnTop: false,
    skipTaskbar: true,
    shadow: false,
    resizable: false,
    focus: false,
  });

  await new Promise<void>((resolve, reject) => {
    win.once("tauri://created", () => resolve());
    win.once("tauri://error", (e) => reject(e));
  });
  await placeWidget(win, widget, monitor).catch(() => {});
  // Click-through by default — the user only needs real mouse input while
  // actively repositioning it (see setWidgetEditing).
  await win.setIgnoreCursorEvents(true);
  await sendWidgetToBack(widget.id);
  // Windows briefly re-raises a freshly created window once its first frame
  // actually paints, undoing the SetWindowPos above — a couple of follow-up
  // calls catch it back down instead of leaving it on top for a moment.
  setTimeout(() => sendWidgetToBack(widget.id), 150);
  setTimeout(() => sendWidgetToBack(widget.id), 600);
}

/** Drops the widget to the bottom of the Z-order (see the Rust command for
 * why this is the safer alternative to reparenting). One-shot — call again
 * if something else brings the window forward (e.g. right after the user
 * finishes dragging it in edit mode). */
export async function sendWidgetToBack(id: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("send_widget_to_back", { label: widgetLabel(id) }).catch(() => {});
}

export async function closeWidgetWindow(id: string): Promise<void> {
  if (!isTauri()) return;
  const win = await WebviewWindow.getByLabel(widgetLabel(id));
  await win?.close();
}

export async function widgetWindowExists(id: string): Promise<boolean> {
  if (!isTauri()) return false;
  return (await WebviewWindow.getByLabel(widgetLabel(id))) !== null;
}

/** Toggles a widget between click-through display mode and a draggable
 * edit mode. The widget page itself calls `startDragging()` on pointer
 * down; while click-through is on, that pointer event never reaches it,
 * so no separate "am I editing" signal needs to travel into that window. */
export async function setWidgetEditing(id: string, editing: boolean): Promise<void> {
  if (!isTauri()) return;
  const win = await WebviewWindow.getByLabel(widgetLabel(id));
  if (!win) return;
  await win.setIgnoreCursorEvents(!editing);
}

/** Live-resizes an already-open widget window — used by the style editor's
 * size sliders so an analog face (which wants a roughly square window,
 * unlike the wide rectangle a digital clock defaults to) can be previewed
 * and adjusted without closing and recreating the window. */
export async function resizeWidgetWindow(id: string, width: number, height: number): Promise<void> {
  if (!isTauri()) return;
  const win = await WebviewWindow.getByLabel(widgetLabel(id));
  if (!win) return;
  const scale = await win.scaleFactor().catch(() => 1);
  await win.setSize(new PhysicalSize(Math.round(Math.max(60, width) * scale), Math.round(Math.max(60, height) * scale))).catch(() => {});
}

/** Pushes a live style preview into an already-open widget window, so the
 * editor's sliders/pickers show their effect immediately without the
 * widget having to reload or re-read localStorage. */
export async function emitStyleUpdate(id: string, style: ClockStyle): Promise<void> {
  if (!isTauri()) return;
  await emitTo(widgetLabel(id), "style-update", style).catch(() => {});
}

/** Reads the widget window's current on-screen position back, as an offset
 * relative to its monitor's origin — call after the user finishes dragging
 * it in edit mode, to persist the new spot. */
export async function readWidgetOffset(widget: WidgetInstance): Promise<{ offsetX: number; offsetY: number; monitorName: string | null } | null> {
  if (!isTauri()) return null;
  const win = await WebviewWindow.getByLabel(widgetLabel(widget.id));
  if (!win) return null;
  const monitors = await getMonitors();
  if (monitors.length === 0) return null;
  const pos = await win.outerPosition();
  const size = await win.outerSize();
  const cx = pos.x + size.width / 2;
  const cy = pos.y + size.height / 2;
  // The monitor the widget was actually dropped on — not necessarily the one
  // it started on, if the user dragged it across.
  const monitor =
    monitors.find((m) => cx >= m.position.x && cx < m.position.x + m.size.width && cy >= m.position.y && cy < m.position.y + m.size.height) ??
    (await resolveMonitor(widget.monitorName));
  if (!monitor) return null;
  return {
    offsetX: (pos.x - monitor.position.x) / monitor.scaleFactor,
    offsetY: (pos.y - monitor.position.y) / monitor.scaleFactor,
    monitorName: monitor.name,
  };
}
