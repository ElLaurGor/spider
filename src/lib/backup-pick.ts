// Which automatic backup to trust. Pure (backup.ts needs the file system), so logic-test checks it.
import { AUTO_BACKUPS_KEPT } from './backup-due';
import { dayKey, startOfWeek } from './dates';
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

/**
 * Today's automatic backup would hold far fewer days than the fullest kept one: skip it, and prune nothing.
 * Against the fullest, not the newest: a newest file that was cut off (or written after a partial loss) must not
 * switch the guard off.
 */
export const skipAutoBackup = (fullestDays: number | null, nextDays: number) => fullestDays != null && wouldWipe(fullestDays, nextDays);

/** Weeks kept on top of the daily files, the newest backup of each: about a month more to go back to. */
export const WEEKLY_BACKUPS_KEPT = 5;

/** The Monday of a "data-YYYY-MM-DD-…" file's week, or null for a name that doesn't say. */
function weekOfName(name: string) {
  const m = /^data-(\d{4})-(\d{2})-(\d{2})/.exec(name);
  return m ? dayKey(startOfWeek(new Date(+m[1], +m[2] - 1, +m[3], 12))) : null;
}

/**
 * The automatic backups to delete: all but the newest `daily` files and, before those, the newest file of each
 * of the `weekly` weeks before them. A name without a date is never deleted. Names sort by date.
 */
export function autoBackupsToPrune(names: string[], daily = AUTO_BACKUPS_KEPT, weekly = WEEKLY_BACKUPS_KEPT): string[] {
  const older = [...names].sort().slice(0, Math.max(0, names.length - daily));
  const keep = new Set<string>();
  const weeks = new Set<string>();
  for (const name of [...older].reverse()) {
    const week = weekOfName(name);
    if (week == null) keep.add(name);
    else if (!weeks.has(week) && weeks.size < weekly) {
      weeks.add(week);
      keep.add(name);
    }
  }
  return older.filter((name) => !keep.has(name));
}

/**
 * Photos in the automatic folder that none of the kept backups points to any more (a deleted meal or progress
 * photo, a backup pruned since): safe to delete. Null when a kept file couldn't be read, since then nobody knows.
 */
export function orphanPhotos(have: string[], kept: (Record<string, string> | null)[]): string[] | null {
  if (kept.some((p) => p == null)) return null;
  const used = new Set(kept.flatMap((p) => Object.values(p ?? {})));
  return have.filter((name) => !used.has(name));
}
