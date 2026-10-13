// When the automatic backup runs: on a Sunday without one yet, or once the last one is over a
// week old (a Sunday the app wasn't opened). Kept apart from backup.ts so it's testable offline.
import { startOfDay } from './dates';

export const AUTO_BACKUPS_KEPT = 4;

export function autoBackupDue(lastBackupAt: number | null, now: Date = new Date()) {
  if (lastBackupAt == null) return true;
  if (now.getTime() - lastBackupAt > 7 * 86_400_000) return true;
  return now.getDay() === 0 && lastBackupAt < startOfDay(now).getTime();
}
