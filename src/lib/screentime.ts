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

/** Social/video apps that count as doomscrolling (matched on package name). */
const DOOMSCROLL = ['tiktok', 'musically', 'instagram', 'facebook', 'twitter', 'reddit', 'snapchat', 'youtube', 'pinterest', 'threads', 'tumblr', '9gag'];
export const isDoomscroll = (pkg: string) => DOOMSCROLL.some((k) => pkg.toLowerCase().includes(k));
