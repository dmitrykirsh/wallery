import { useEffect, useState } from "react";
import { listMonitors, type MonitorInfo } from "./tauri";

let cache: Promise<MonitorInfo[]> | null = null;

export function useMonitors(): MonitorInfo[] {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);

  useEffect(() => {
    if (!cache) cache = listMonitors();
    cache.then(setMonitors).catch(() => setMonitors([]));
  }, []);

  return monitors;
}
