import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Monitor } from "@tauri-apps/api/window";
import { loadWidgets, saveWidgets, type WidgetInstance } from "../lib/widgets";
import { DEFAULT_CLOCK_STYLE, type ClockStyle } from "../lib/clockStyle";
import { getMonitors, spawnWidgetWindow, closeWidgetWindow, setWidgetEditing, readWidgetOffset, sendWidgetToBack } from "../lib/widgetWindow";
import { exportWidget, importWidgetFile } from "../lib/widgetShare";
import { useLang } from "../lib/LangContext";
import WidgetEditorModal from "./WidgetEditorModal";

interface Props {
  onClose: () => void;
}

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 160;

export default function WidgetsModal({ onClose }: Props) {
  const { t } = useLang();
  const [widgets, setWidgets] = useState<WidgetInstance[]>(() => loadWidgets());
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [addMonitor, setAddMonitor] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<WidgetInstance | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMonitors().then(setMonitors);
  }, []);

  function persist(next: WidgetInstance[]) {
    setWidgets(next);
    saveWidgets(next);
  }

  function monitorLabel(name: string | null) {
    const idx = monitors.findIndex((m) => m.name === name);
    return idx >= 0 ? `${t("monitor.label")} ${idx + 1}` : t("monitor.label");
  }

  async function createWidget(width: number, height: number, style: ClockStyle) {
    const monitor = monitors[addMonitor] ?? monitors[0] ?? null;
    const logicalW = monitor ? monitor.size.width / monitor.scaleFactor : 1920;
    const widget: WidgetInstance = {
      id: crypto.randomUUID(),
      type: "clock",
      monitorName: monitor?.name ?? null,
      offsetX: Math.max(24, logicalW - width - 40),
      offsetY: 40,
      width,
      height,
      style,
    };
    await spawnWidgetWindow(widget);
    persist([...widgets, widget]);
  }

  async function addClock() {
    setBusy(true);
    try {
      await createWidget(DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_CLOCK_STYLE);
    } finally {
      setBusy(false);
    }
  }

  async function importClock() {
    setBusy(true);
    try {
      const imported = await importWidgetFile();
      if (imported) await createWidget(imported.width, imported.height, imported.style);
    } finally {
      setBusy(false);
    }
  }

  async function removeWidget(id: string) {
    setBusy(true);
    try {
      if (editingId === id) setEditingId(null);
      await closeWidgetWindow(id);
      persist(widgets.filter((w) => w.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEditing(widget: WidgetInstance) {
    if (editingId === widget.id) {
      const offset = await readWidgetOffset(widget);
      await setWidgetEditing(widget.id, false);
      await sendWidgetToBack(widget.id);
      setEditingId(null);
      if (offset) persist(widgets.map((w) => (w.id === widget.id ? { ...w, ...offset } : w)));
      return;
    }
    if (editingId) await setWidgetEditing(editingId, false);
    await setWidgetEditing(widget.id, true);
    setEditingId(widget.id);
  }

  function saveStyle(newStyle: ClockStyle, size: { width: number; height: number }) {
    if (!customizing) return;
    persist(widgets.map((w) => (w.id === customizing.id ? { ...w, style: newStyle, ...size } : w)));
    setCustomizing(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="glass-strong max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-heading" style={{ color: "var(--color-ink)" }}>
            {t("widgets.title")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("lightbox.close")} className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          {t("widgets.dragHint")}
        </p>

        {widgets.length === 0 && (
          <p className="mb-4 text-sm" style={{ color: "var(--color-ink-faint)" }}>
            {t("widgets.empty")}
          </p>
        )}

        <div className="mb-4 flex flex-col gap-2">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="flex flex-col gap-2 rounded-xl border px-3 py-2.5"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                  {t("widgets.clockLabel")}
                </div>
                <div className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                  {monitorLabel(widget.monitorName)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={busy}
                  onClick={() => toggleEditing(widget)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={
                    editingId === widget.id
                      ? { background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }
                      : { background: "var(--color-surface-3)", color: "var(--color-ink)" }
                  }
                >
                  {editingId === widget.id ? t("widgets.donePosition") : t("widgets.editPosition")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={busy}
                  onClick={() => setCustomizing(widget)}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
                >
                  {t("widgets.customize")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={busy}
                  onClick={() => exportWidget(widget)}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
                >
                  {t("widgets.export")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={busy}
                  onClick={() => removeWidget(widget.id)}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
                >
                  {t("action.delete")}
                </motion.button>
              </div>
            </div>
          ))}
        </div>

        {monitors.length > 1 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {monitors.map((m, i) => (
              <button
                key={m.name ?? i}
                type="button"
                className="chip"
                data-active={addMonitor === i}
                onClick={() => setAddMonitor(i)}
              >
                {t("monitor.label")} {i + 1}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={addClock}
            className="flex-1 rounded-lg py-2 text-sm font-medium"
            style={{ background: "var(--gradient-accent)", color: "var(--color-accent-ink)" }}
          >
            {t("widgets.addClock")}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={importClock}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }}
          >
            {t("widgets.import")}
          </motion.button>
        </div>
      </motion.div>

      {customizing && <WidgetEditorModal widget={customizing} onClose={() => setCustomizing(null)} onSave={saveStyle} />}
    </div>
  );
}
