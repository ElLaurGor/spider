// Phone screen time from Android's usage stats, via the local native module
// `modules/spider-usage` (shipped in APK 1.3.0). On older installs the module is
// missing and everything here quietly reports "unsupported".
import { requireOptionalNativeModule } from 'expo';

export type AppUsage = { packageName: string; label: string; foregroundMs: number; isGame: boolean };
export type ForegroundSpan = { packageName: string; label: string; start: number; end: number };

type NativeUsage = {
  hasPermission(): boolean;
  openSettings(): void;
  getUsage(startMs: number, endMs: number): Promise<AppUsage[]>;
  getForegroundSpans(startMs: number, endMs: number): Promise<ForegroundSpan[]>;
  // APK 1.4.0+
  startGuard?(endsAtMs: number, keywords: string[], lines: string[], title: string): boolean;
  stopGuard?(): void;
  getUnlocks?(startMs: number, endMs: number): Promise<number>;
};

const native = requireOptionalNativeModule<NativeUsage>('SpiderUsage');

export const screenTimeSupported = native != null;

export const hasUsageAccess = () => {
  try {
    return native?.hasPermission() ?? false;
  } catch {
    return false;
  }
};

export const openUsageSettings = () => native?.openSettings();

export async function usageBetween(start: number, end: number): Promise<AppUsage[]> {
  if (!native || !hasUsageAccess()) return [];
  const list = await native.getUsage(start, end);
  return list.filter((a) => a.foregroundMs >= 60_000).sort((a, b) => b.foregroundMs - a.foregroundMs);
}

/** Which app was in the foreground when, between two times. Empty without usage access. */
export async function spansBetween(start: number, end: number): Promise<ForegroundSpan[]> {
  if (!native || !hasUsageAccess()) return [];
  return native.getForegroundSpans(start, end);
}

/**
 * Strict Web Focus: the other app the user spent the most time in (30+ seconds)
 * during the focus window, or null if clean or if usage access isn't available.
 */
export async function focusBreaker(start: number, end: number): Promise<string | null> {
  if (!native || !hasUsageAccess()) return null;
  const spans = await native.getForegroundSpans(start, end);
  const time = new Map<string, number>();
  for (const s of spans) time.set(s.label, (time.get(s.label) ?? 0) + (s.end - s.start));
  const worst = [...time.entries()].sort((a, b) => b[1] - a[1])[0];
  return worst && worst[1] >= 30_000 ? worst[0] : null;
}

/** The Web Focus guard (APK 1.4.0+): nudges the moment a social app opens during focus. */
export const guardSupported = typeof native?.startGuard === 'function';

export function startFocusGuard(endsAt: number, lines: string[], title: string): boolean {
  if (!native?.startGuard || !hasUsageAccess()) return false;
  try {
    return native.startGuard(endsAt, DOOMSCROLL, lines, title);
  } catch {
    return false;
  }
}

export function stopFocusGuard() {
  try {
    native?.stopGuard?.();
  } catch {
    // not running
  }
}

/** Phone unlocks between two times (APK 1.4.0+), or null when unknown. */
export async function unlocksBetween(start: number, end: number): Promise<number | null> {
  if (!native?.getUnlocks || !hasUsageAccess()) return null;
  try {
    return await native.getUnlocks(start, end);
  } catch {
    return null;
  }
}

/** Social/video apps that count as doomscrolling (matched on package name). */
const DOOMSCROLL = ['tiktok', 'musically', 'instagram', 'facebook', 'twitter', 'reddit', 'snapchat', 'youtube', 'pinterest', 'threads', 'tumblr', '9gag'];
export const isDoomscroll = (pkg: string) => DOOMSCROLL.some((k) => pkg.toLowerCase().includes(k));
