// Which automatic backup to trust. Pure (backup.ts needs the file system), so logic-test checks it.
import { wouldWipe } from './persist';

/** A dated "data-….json" file and its number of days; null days when it can't be read or isn't a S.P.I.D.E.R. backup. */
export type BackupCandidate = { name: string; days: number | null };

/**
 * The backup to restore: the newest one that parses and isn't a near-empty copy written after a wipe (the
 * same rule as the save guard, against the fullest file there). A truncated newest file falls back to the
 * one before. Null when none can be read. The names sort by date.
 */
export function pickBackup(files: BackupCandidate[]): string | null {
  const ok = files.filter((f): f is { name: string; days: number } => f.days != null).sort((a, b) => (a.name < b.name ? 1 : -1));
  if (!ok.length) return null;
  const most = Math.max(...ok.map((f) => f.days));
  return (ok.find((f) => !wouldWipe(most, f.days)) ?? ok[0]).name;
}

/** This week's automatic backup would hold far fewer days than the last one: skip it, and prune nothing. */
export const skipAutoBackup = (lastDays: number | null, nextDays: number) => lastDays != null && wouldWipe(lastDays, nextDays);
