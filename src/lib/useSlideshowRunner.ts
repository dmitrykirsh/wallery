import { useEffect } from "react";
import { runSlideshowTick } from "./slideshowEngine";
import { loadSlideshowRules, saveSlideshowRules, type SlideshowRule } from "./slideshow";

/** Mounted once at the app root; runs each enabled rule on its own interval
 * for as long as the app window stays open (or is minimized to the tray —
 * the window doesn't need to be visible). */
export function useSlideshowRunner(apiKey: string, rules: SlideshowRule[]) {
  useEffect(() => {
    const enabled = rules.filter((r) => r.enabled);
    if (enabled.length === 0) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function updateRule(id: string, patch: Partial<SlideshowRule>) {
      const all = loadSlideshowRules();
      saveSlideshowRules(all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }

    for (const rule of enabled) {
      // Tracked locally per rule so rescheduling always uses the timestamp
      // from the tick that just ran, instead of a stale closure value.
      let lastAppliedAt = rule.lastAppliedAt;

      async function tick() {
        try {
          await runSlideshowTick(apiKey, rule);
        } catch {
          // Network hiccup or no matches — just retry on the next interval.
        }
        if (cancelled) return;
        lastAppliedAt = Date.now();
        updateRule(rule.id, { lastAppliedAt });
        schedule();
      }

      function schedule() {
        const intervalMs = rule.intervalMinutes * 60_000;
        const elapsed = Date.now() - lastAppliedAt;
        const wait = Math.max(0, intervalMs - elapsed);
        timers.push(setTimeout(tick, wait));
      }

      schedule();
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, JSON.stringify(rules)]);
}
