// Meeting load (step 10, the calendar autopsy): a week's or a month's meetings, read back from the phone's own
// calendar (nothing is saved for it): hours of meetings, the focus gaps of 90+ minutes left inside working
// hours, meetings that ran past 17:00, double bookings, the longest back-to-back run and the busiest day. The
// War room, the weekly Report and Wrapped show it, never graded; its lines roast the calendar, never her.
//
// A meeting is a timed event (not all-day), not marked "free", at most MEETING_MAX_MIN long, starting before
// EVENING_HOUR on a workday (Monday to Friday, not a red day or de facto day off, not paused), from a meeting
// calendar (settings.meetingCalendars; unset = every calendar the app reads), and not a block she keeps for
// herself (focus time, lunch, gym, commute, out of office). The same event in two calendars counts once.
// Declined invitations can't be told apart: expo-calendar doesn't read the attendee status on Android.
// Pure (no expo, no theme), so logic-test can check it.
import { addDays, atTime, dayKey, fmtDuration, MIN, pad, WEEKDAYS_LONG } from './dates';
import { GAP_MIN } from './marathon';
import { pausedOn } from './pause';
import { isDayOff } from './swedish-days';
import type { CalEvent, State } from './types';
import { LATE_HOUR } from './woop';

/** Working hours, for the focus gaps: 08:00 to 17:00 (the hour woop.ts calls a meeting late). */
export const WORK_FROM = 8;
export const WORK_TO = LATE_HOUR;
/** A gap this long inside working hours is one deep work fits in. */
export const FOCUS_GAP_MIN = 90;
/** Events starting at or after this hour are evening plans, not meetings. */
export const EVENING_HOUR = 18;
/** A timed event longer than this is a block (a trip, out of office), not a meeting. */
export const MEETING_MAX_MIN = 8 * 60;
/** A week (or month) with this many minutes of meetings per workday on average is a heavy one. */
export const HEAVY_PER_DAY_MIN = 180;

/** Blocks she keeps for herself, not meetings (English and Swedish, matched at the start of a word). */
const OWN_BLOCK = /\b(focus|fokus|deep work|lunch|gym|workout|träning|commute|pendling|out of office|ooo\b|vacation|semester|ledig)/i;

const noon = (key: string) => new Date(`${key}T12:00`);

/** A workday: Monday to Friday, not a red day or de facto day off, not a paused day (sick or away). */
export const workdayOn = (s: State, key: string) => !isDayOff(noon(key)) && !pausedOn(s, key);

/** The calendars whose events can be meetings (null: every calendar the app reads). */
export const meetingCalendarsOf = (s: State): string[] | null => s.settings.meetingCalendars ?? null;

/** Whether an event is a meeting (the workday is checked by the day's load). */
export function isMeeting(e: CalEvent, calendars: string[] | null = null) {
  if (e.allDay || e.free || e.end <= e.start || e.end - e.start > MEETING_MAX_MIN * MIN) return false;
  if (calendars && !calendars.includes(e.calendarId)) return false;
  if (new Date(e.start).getHours() >= EVENING_HOUR) return false;
  return !OWN_BLOCK.test(e.title);
}

type Span = { start: number; end: number };

/** Spans merged where they overlap or touch, earliest first. */
function union(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const x of [...spans].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && x.start <= last.end) last.end = Math.max(last.end, x.end);
    else out.push({ ...x });
  }
  return out;
}

const length = (spans: Span[]) => spans.reduce((a, x) => a + (x.end - x.start), 0);

/** The meetings on day `key` (started that day), each once even when it sits in two calendars, earliest first. */
export function meetingsOn(s: State, events: CalEvent[], key: string): CalEvent[] {
  if (!workdayOn(s, key)) return [];
  const cals = meetingCalendarsOf(s);
  const seen = new Set<string>();
  return events
    .filter((e) => dayKey(e.start) === key && isMeeting(e, cals))
    .filter((e) => {
      const id = `${e.title.trim().toLowerCase()}|${e.start}|${e.end}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => a.start - b.start);
}

export type DayLoad = {
  day: string;
  workday: boolean;
  meetings: number;
  /** Minutes in meetings, overlaps counted once. */
  minutes: number;
  /** Gaps of FOCUS_GAP_MIN or more inside working hours, and their minutes. */
  focusGaps: number;
  focusMin: number;
  /** Meetings that ran past 17:00, and the minutes after it. */
  late: number;
  lateMin: number;
  /** Meetings that started before an earlier one had ended. */
  clashes: number;
  /** The longest run of meetings with less than GAP_MIN between them (marathon.ts), in minutes. */
  longestRun: number;
};

/** One day's meeting load. A day off has none and no focus gaps either (they're for workdays). */
export function dayLoad(s: State, events: CalEvent[], key: string): DayLoad {
  const date = noon(key);
  const workday = workdayOn(s, key);
  const list = meetingsOn(s, events, key);
  const midnight = atTime(date, 1, 0).getTime();
  const spans = union(list.map((e) => ({ start: e.start, end: Math.min(e.end, midnight) })));
  const from = atTime(date, 0, WORK_FROM).getTime();
  const to = atTime(date, 0, WORK_TO).getTime();

  const gaps: number[] = [];
  if (workday) {
    let cursor = from;
    for (const x of spans) {
      if (x.end <= from) continue;
      if (x.start >= to) break;
      if (x.start - cursor >= FOCUS_GAP_MIN * MIN) gaps.push(x.start - cursor);
      cursor = Math.max(cursor, x.end);
    }
    if (to - cursor >= FOCUS_GAP_MIN * MIN) gaps.push(to - cursor);
  }

  let clashes = 0;
  let latest = -Infinity;
  for (const e of list) {
    if (e.start < latest) clashes++;
    latest = Math.max(latest, e.end);
  }

  let longestRun = 0;
  for (let i = 0; i < spans.length; ) {
    let end = spans[i].end;
    let j = i + 1;
    while (j < spans.length && spans[j].start - end < GAP_MIN * MIN) end = Math.max(end, spans[j++].end);
    longestRun = Math.max(longestRun, end - spans[i].start);
    i = j;
  }

  const after = spans.map((x) => ({ start: Math.max(x.start, to), end: x.end })).filter((x) => x.end > x.start);
  return {
    day: key,
    workday,
    meetings: list.length,
    minutes: Math.round(length(spans) / MIN),
    focusGaps: gaps.length,
    focusMin: Math.round(gaps.reduce((a, b) => a + b, 0) / MIN),
    late: list.filter((e) => e.end > to).length,
    lateMin: Math.round(length(after) / MIN),
    clashes,
    longestRun: Math.round(longestRun / MIN),
  };
}

export type MeetingLoad = {
  from: string;
  to: string;
  days: DayLoad[];
  workdays: number;
  meetings: number;
  minutes: number;
  focusGaps: number;
  focusMin: number;
  late: number;
  lateMin: number;
  clashes: number;
  /** The day with the longest back-to-back run, and the run in minutes. */
  longestRun: number;
  longestRunDay: string | null;
  /** The workday with the most minutes in meetings (ties: more meetings, then the earlier day). */
  busiest: DayLoad | null;
};

/** The days from `from` to `to`, both included, never past `today` (a week or month so far). */
export function rangeDays(from: string, to: string, today = dayKey()): string[] {
  const last = to < today ? to : today;
  const out: string[] = [];
  for (let d = noon(from); dayKey(d) <= last; d = addDays(d, 1)) out.push(dayKey(d));
  return out;
}

/** The meeting load of the days from `from` to `to` (never past `today`). */
export function meetingLoad(s: State, events: CalEvent[], from: string, to: string, today = dayKey()): MeetingLoad {
  const days = rangeDays(from, to, today).map((k) => dayLoad(s, events, k));
  const sum = (k: keyof Omit<DayLoad, 'day' | 'workday'>) => days.reduce((a, d) => a + d[k], 0);
  const work = days.filter((d) => d.workday);
  const busiest = work.filter((d) => d.minutes > 0).sort((a, b) => b.minutes - a.minutes || b.meetings - a.meetings || (a.day < b.day ? -1 : 1))[0] ?? null;
  const run = [...days].sort((a, b) => b.longestRun - a.longestRun || (a.day < b.day ? -1 : 1))[0];
  return {
    from,
    to: days.length ? days[days.length - 1].day : from,
    days,
    workdays: work.length,
    meetings: sum('meetings'),
    minutes: sum('minutes'),
    focusGaps: sum('focusGaps'),
    focusMin: sum('focusMin'),
    late: sum('late'),
    lateMin: sum('lateMin'),
    clashes: sum('clashes'),
    longestRun: run?.longestRun ?? 0,
    longestRunDay: run?.longestRun ? run.day : null,
    busiest,
  };
}

/** The range to read from the phone for days `from`–`to`: a day either side, since Android only lists events wholly inside it. */
export function readRange(from: string, to: string) {
  return { start: atTime(noon(from), -1, 0), end: atTime(noon(to), 2, 0) };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const hrs = (min: number) => fmtDuration(min * MIN);
export const weekdayOf = (key: string) => WEEKDAYS_LONG[noon(key).getDay()];

export type LoadMood = 'none' | 'noFocus' | 'heavy' | 'late' | 'light';

/**
 * What the load says about the calendar, most damning first: no meetings at all, not one focus gap left,
 * HEAVY_PER_DAY_MIN or more a workday, two or more meetings past 17:00, else a light one. Null without workdays.
 */
export function loadMood(load: MeetingLoad): LoadMood | null {
  if (!load.workdays) return null;
  if (!load.meetings) return 'none';
  if (!load.focusGaps) return 'noFocus';
  if (load.minutes >= load.workdays * HEAVY_PER_DAY_MIN) return 'heavy';
  if (load.late >= 2) return 'late';
  return 'light';
}

/** The pool each mood's line comes from (lines.ts). */
export const LOAD_LINE = { none: 'meetingNone', noFocus: 'meetingNoFocus', heavy: 'meetingHeavy', late: 'meetingLate', light: 'meetingLight' } as const;

/** The placeholders every meeting line may use: {hours} in meetings, the busiest {day}, {n} meetings past 17:00. */
export const loadVars = (load: MeetingLoad) => ({ hours: hrs(load.minutes), day: load.busiest ? weekdayOf(load.busiest.day) : 'no day', n: load.late });

/** The facts, one per line, for the War room and the Report. */
export function loadFacts(load: MeetingLoad): string[] {
  if (!load.meetings) return [`No meetings over ${plural(load.workdays, 'workday')}.`];
  const out = [`${hrs(load.minutes)} in ${plural(load.meetings, 'meeting')} over ${plural(load.workdays, 'workday')} (${hrs(Math.round(load.minutes / Math.max(1, load.workdays)))} a day).`];
  out.push(load.focusGaps ? `${plural(load.focusGaps, 'focus gap')} of ${FOCUS_GAP_MIN}+ min between ${pad(WORK_FROM)}:00 and ${pad(WORK_TO)}:00, ${hrs(load.focusMin)} in all.` : `No gap of ${FOCUS_GAP_MIN} minutes between ${pad(WORK_FROM)}:00 and ${pad(WORK_TO)}:00.`);
  if (load.late) out.push(`${plural(load.late, 'meeting')} ran past ${pad(WORK_TO)}:00 (${hrs(load.lateMin)} after it).`);
  if (load.busiest) out.push(`Busiest: ${weekdayOf(load.busiest.day)}, ${hrs(load.busiest.minutes)} in ${plural(load.busiest.meetings, 'meeting')}.`);
  if (load.longestRun >= 120 && load.longestRunDay) out.push(`Longest back-to-back: ${hrs(load.longestRun)} on ${weekdayOf(load.longestRunDay)}.`);
  if (load.clashes) out.push(`${plural(load.clashes, 'double booking')}.`);
  return out;
}
