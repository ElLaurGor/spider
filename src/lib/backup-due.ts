// When the automatic backup runs (once a day, the first time the app runs that day) and when S.P.I.D.E.R.
// nudges about backups. Kept apart from backup.ts so it's testable offline.
import { startOfDay } from './dates';

/** Daily files kept in the automatic folder: a week's worth. Manual backups are never pruned. */
export const AUTO_BACKUPS_KEPT = 7;

export function autoBackupDue(lastBackupAt: number | null, now: Date = new Date()) {
  return lastBackupAt == null || lastBackupAt < startOfDay(now).getTime();
}

/** A week without a backup is when the nudges start. */
export const BACKUP_STALE_DAYS = 7;
/** A new install isn't nagged before it has a few days worth keeping. */
const NUDGE_AFTER_DAYS = 3;

export type BackupNudge = 'setup' | 'stale';

/**
 * Whether to nudge about backups. 'setup': no folder for daily backups, and nothing saved or sent off the phone
 * for a week. 'stale': the folder is set but nothing reached it for a week (its permission may be gone).
 * `firstDay` is the first day with data.
 */
export function backupNudge(
  b: { backupFolderUri?: string | null; lastBackupAt: number | null; lastSharedAt?: number | null; firstDay: string | null },
  now: Date = new Date(),
): BackupNudge | null {
  if (!b.firstDay || now.getTime() - new Date(`${b.firstDay}T12:00`).getTime() < NUDGE_AFTER_DAYS * 86_400_000) return null;
  const fresh = (at: number | null | undefined) => at != null && now.getTime() - at < BACKUP_STALE_DAYS * 86_400_000;
  if (b.backupFolderUri) return fresh(b.lastBackupAt) ? null : 'stale';
  return fresh(b.lastBackupAt) || fresh(b.lastSharedAt) ? null : 'setup';
}
