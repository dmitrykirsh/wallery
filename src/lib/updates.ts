import { fetchLatestRelease } from "./tauri";

const LAST_SEEN_KEY = "wallery:last-seen-version";
const DISMISSED_KEY = "wallery:dismissed-update";

// Evaluated once at import — before anything in this session has had a
// chance to write its own keys — so a brand-new install (nothing stored yet)
// can be told apart from someone updating from a release that predates the
// "what's new" screen (data present, but no last-seen version recorded).
const hadDataAtStartup = (() => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith("wallery:")) return true;
    }
  } catch {
    // ignore
  }
  return false;
})();

export interface UpdateInfo {
  version: string;
  url: string;
  notes: string;
}

function parts(version: string): number[] {
  return version
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((p) => parseInt(p, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

/** >0 when a is newer than b. Non-numeric suffixes are ignored. */
export function compareVersions(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Resolves with the newer release, `null` if already up to date, and
 * rejects if GitHub couldn't be reached. */
export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  const release = await fetchLatestRelease();
  if (!release.tag || compareVersions(release.tag, currentVersion) <= 0) return null;
  return { version: release.tag.replace(/^v/i, ""), url: release.url, notes: release.notes };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export const getDismissedUpdate = () => read(DISMISSED_KEY);
export const dismissUpdate = (version: string) => write(DISMISSED_KEY, version);

/** True exactly once after the app was updated: the stored version is older
 * than the running one. Records the running version either way. */
let whatsNewDecision: boolean | null = null;
export function shouldShowWhatsNew(currentVersion: string): boolean {
  // Decided once per session, so a dev-mode double effect can't consume it.
  if (whatsNewDecision !== null) return whatsNewDecision;
  const last = read(LAST_SEEN_KEY);
  write(LAST_SEEN_KEY, currentVersion);
  if (last === currentVersion) whatsNewDecision = false;
  else if (last === null) whatsNewDecision = hadDataAtStartup;
  else whatsNewDecision = compareVersions(currentVersion, last) > 0;
  return whatsNewDecision;
}
