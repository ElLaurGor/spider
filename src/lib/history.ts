// Tracker and habit history (step 8): the last 8 weeks as a grid, Monday to Sunday, with a total per week
// ("Done on 4 of 5", "Yes on 4 of 7", "avg 3.2"). Rough days (paused, a low mood, a period day) are drawn as
// rest, dimmed, never as gaps or misses. Totals per week only: never a count of days in a row.
// Theme-free, so logic-test can check it.
import { addDays, dayKey, startOfWeek } from './dates';
import { roughDay } from './day-filters';
import { habitsDone, habitsFor } from './habits';
import { dayOf } from './selectors';
import type { Habit, State, Tracker } from './types';

/**
 * A day in the grid. `done`/`mini`: the habit was done (as its mini version); `miss`: due and not done; `open`:
 * due today, still time; `off`: not due that day; `rest`: a rough day (with its value, if one was logged);
 * `value`: a tracker's number; `yes`/`no`: a check tracker; `empty`: nothing logged; `none`: before it existed
 * or still to come.
 */
export type CellKind = 'done' | 'mini' | 'miss' | 'open' | 'off' | 'rest' | 'value' | 'yes' | 'no' | 'empty' | 'none';
export type Cell = { key: string; kind: CellKind; value?: number };
export type HistoryWeek = { week: string; cells: Cell[]; summary: string };

export const HISTORY_WEEKS = 8;

const noon = (key: string) => new Date(`${key}T12:00`);

/** The weeks shown, oldest first, each as its seven day keys. */
function weeksOf(now: Date, weeks: number) {
  const monday = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const m = addDays(monday, -7 * (weeks - 1 - i));
    return { week: dayKey(m), keys: Array.from({ length: 7 }, (_, j) => dayKey(addDays(m, j))) };
  });
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** A habit's last 8 weeks. Range habits ("2–4× a week") are counted against their range, never day by day. */
export function habitHistory(s: State, h: Habit, now = new Date(), weeks = HISTORY_WEEKS): HistoryWeek[] {
  const today = dayKey(now);
  const born = dayKey(h.createdAt ?? 0);
  return weeksOf(now, weeks).map(({ week, keys }) => {
    const cells: Cell[] = keys.map((key) => {
      if (key > today || key < born) return { key, kind: 'none' };
      const d = dayOf(s, key);
      if (habitsDone(s, key).includes(h.id)) return { key, kind: (d.habitsMini ?? []).includes(h.id) ? 'mini' : 'done' };
      if (roughDay(s, key) != null) return { key, kind: 'rest' };
      const due = habitsFor(s, noon(key)).some((x) => x.id === h.id);
      if (!due) return { key, kind: 'off' };
      return { key, kind: key === today ? 'open' : 'miss' };
    });
    const done = cells.filter((c) => c.kind === 'done' || c.kind === 'mini').length;
    const minis = cells.filter((c) => c.kind === 'mini').length;
    const due = done + cells.filter((c) => c.kind === 'miss' || c.kind === 'open').length;
    const rest = cells.filter((c) => c.kind === 'rest').length;
    const range = h.perWeek ? ` · goal ${h.perWeek.min === h.perWeek.max ? h.perWeek.min : `${h.perWeek.min}–${h.perWeek.max}`}` : '';
    const main = cells.every((c) => c.kind === 'none')
      ? '–'
      : h.perWeek
        ? `${done}×${range}`
        : due
          ? `Done on ${done} of ${due}`
          : done
            ? `${done}× extra`
            : 'Nothing due';
    const extras = [minis ? `${minis} mini` : '', rest ? `${rest} rest` : ''].filter(Boolean).join(' · ');
    return { week, cells, summary: extras && main !== '–' ? `${main} · ${extras}` : main };
  });
}

/** A tracker's last 8 weeks: yes/no answers, or the values logged (a rough day's value shows, dimmed, as rest). */
export function trackerHistory(s: State, t: Tracker, now = new Date(), weeks = HISTORY_WEEKS): HistoryWeek[] {
  const today = dayKey(now);
  const born = dayKey(t.createdAt ?? 0);
  return weeksOf(now, weeks).map(({ week, keys }) => {
    const cells: Cell[] = keys.map((key) => {
      if (key > today || key < born) return { key, kind: 'none' };
      const v = s.days[key]?.tracks?.[t.id];
      if (roughDay(s, key) != null) return v != null ? { key, kind: 'rest', value: v } : { key, kind: 'rest' };
      if (v == null) return { key, kind: 'empty' };
      if (t.kind === 'check') return { key, kind: v > 0 ? 'yes' : 'no', value: v };
      return { key, kind: 'value', value: v };
    });
    if (cells.every((c) => c.kind === 'none')) return { week, cells, summary: '–' };
    if (t.kind === 'check') {
      // A yes on a rough day still counts as a yes; a no (or nothing) then is rest, never a miss.
      const yes = cells.filter((c) => (c.kind === 'yes' || c.kind === 'rest') && (c.value ?? 0) > 0).length;
      const answered = yes + cells.filter((c) => c.kind === 'no').length;
      return { week, cells, summary: answered ? `Yes on ${yes} of ${answered}` : 'Nothing logged' };
    }
    // Numbers are data, not a score: every value logged counts, rough days' included.
    const values = cells.filter((c) => c.value != null).map((c) => c.value as number);
    if (!values.length) return { week, cells, summary: 'Nothing logged' };
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = `avg ${fmt(Math.round((sum / values.length) * 10) / 10)}`;
    const unit = t.unit ? ` ${t.unit}` : '';
    return { week, cells, summary: t.kind === 'number' ? `${avg}${unit} · ${fmt(Math.round(sum * 10) / 10)}${unit} in all` : `${avg} · ${values.length} logged` };
  });
}
