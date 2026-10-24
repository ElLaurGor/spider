// Step totals from Health Connect step records. Pure, so it's testable offline (health.ts does the reading).
import { ZEPP } from './sleep';

export type StepRecord = { start: number; end: number; count: number; origin?: string; modified?: number };

const HOUR = 3_600_000;

/**
 * How far before midnight a day's read of records starts. Health Connect returns records by their start time,
 * so one that began before midnight would otherwise be missed, with its part after midnight.
 */
export const STEPS_LEAD_MS = 6 * HOUR;

const covers = (r: StepRecord, from: number, to: number) => (r.end > r.start ? r.end > from && r.start < to : r.start >= from && r.start < to);

/**
 * One app's steps in [from, to): its records added up, with the part of a record that sticks out of the range
 * prorated. Where its records overlap (a block written again, a block and its parts), each stretch of time
 * counts once, from the newest record covering it. That is what Health Connect's own aggregate does within one
 * app, without its app priority list, which leaves out an app that isn't on it.
 */
export function stepsIn(records: StepRecord[], from: number, to: number): number {
  let total = 0;
  const spans: StepRecord[] = [];
  for (const r of records) {
    if (r.count <= 0 || !covers(r, from, to)) continue;
    if (r.end > r.start) spans.push(r);
    else total += r.count; // an instant counts whole
  }
  spans.sort((a, b) => a.start - b.start || a.end - b.end);
  const bounds = [...new Set([from, to, ...spans.flatMap((r) => [r.start, r.end])])].filter((t) => t >= from && t <= to).sort((a, b) => a - b);
  let active: StepRecord[] = [];
  let next = 0;
  for (let i = 0; i + 1 < bounds.length; i++) {
    const [a, b] = [bounds[i], bounds[i + 1]];
    while (next < spans.length && spans[next].start <= a) active.push(spans[next++]);
    active = active.filter((r) => r.end > a);
    if (!active.length) continue;
    const newest = active.reduce((x, y) => ((y.modified ?? 0) >= (x.modified ?? 0) ? y : x));
    total += (newest.count * (b - a)) / (newest.end - newest.start);
  }
  return Math.round(total);
}

/** How many records start before an earlier one has ended (the same span written again included). */
export function overlapsIn(records: StepRecord[]): number {
  let n = 0;
  let reached = -Infinity;
  for (const r of [...records].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (r.start < reached) n++;
    reached = Math.max(reached, r.end);
  }
  return n;
}

/** Where an app's records for [from, to) end (zero-step ones too): what it has handed over so far. Null without records. */
export function coveredUntil(records: StepRecord[], from: number, to: number): number | null {
  let until: number | null = null;
  for (const r of records) if (covers(r, from, to)) until = Math.max(until ?? -Infinity, Math.min(r.end, to));
  return until;
}

export type StepsPlan = {
  zepp: number; // Zepp's own records, added up
  until: number | null; // where Zepp's records end; null when it has none that day
  gap: number | null; // from here to the day's end, Health Connect's merged total of the other apps is added; null = nothing to add
};

/**
 * How a day's steps are put together from a read of Zepp's own records. Zepp's records count. Other apps
 * (this phone's own step counter, mostly) fill in the whole day when Zepp has no records that day, and with
 * `now` (today, with filling on) the time after Zepp's newest record, which Zepp hasn't written to Health
 * Connect yet. Null when the read failed: unknown, never another source's number.
 */
export function stepsPlan(own: StepRecord[] | null, from: number, to: number, now?: number): StepsPlan | null {
  if (own == null) return null;
  const until = coveredUntil(own, from, to);
  const zepp = stepsIn(own, from, to);
  if (until == null) return { zepp, until, gap: from };
  return { zepp, until, gap: now != null && until < Math.min(now, to) ? until : null };
}

export type StepSource = {
  origin: string;
  name: string;
  steps: number;
  records: number;
  overlaps: number; // records starting before an earlier one ended
  minutes: number | null; // a typical record's length
  firstStart: number | null;
  lastEnd: number | null;
  lastWritten: number | null;
};

const NAMES: Record<string, string> = {
  [ZEPP]: 'Zepp',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.google.android.apps.healthdata': 'This phone (Health Connect)',
  android: 'This phone',
};
/** Health Connect's own phone step counter writes as "android", and since mid-2026 as com.android.healthconnect.phone.<id>. */
export const sourceName = (origin: string) => NAMES[origin] ?? (origin.startsWith('com.android.healthconnect.phone') ? 'This phone' : origin);

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : null;
};

const byOrigin = (records: StepRecord[]) => {
  const out = new Map<string, StepRecord[]>();
  for (const r of records) out.set(r.origin ?? 'unknown', [...(out.get(r.origin ?? 'unknown') ?? []), r]);
  return out;
};

/** Each app's steps in [from, to): totals, record sizes, overlaps, and when its newest record ends and was written. Zepp first. */
export function stepSources(records: StepRecord[], from: number, to: number): StepSource[] {
  return [...byOrigin(records.filter((r) => covers(r, from, to))).entries()]
    .map(([origin, list]) => {
      const lengths = list.filter((r) => r.end > r.start).map((r) => (r.end - r.start) / 60_000);
      const m = median(lengths);
      return {
        origin,
        name: sourceName(origin),
        steps: stepsIn(list, from, to),
        records: list.length,
        overlaps: overlapsIn(list),
        minutes: m == null ? null : Math.round(m * 10) / 10,
        firstStart: Math.min(...list.map((r) => r.start)),
        lastEnd: Math.max(...list.map((r) => r.end)),
        lastWritten: list.some((r) => r.modified != null) ? Math.max(...list.map((r) => r.modified ?? 0)) : null,
      };
    })
    .sort((a, b) => Number(b.origin === ZEPP) - Number(a.origin === ZEPP) || b.steps - a.steps);
}

/** Each app's steps per clock hour in [from, to), for hours with any. Hour starts come from the clock, so DST days stay right. */
export function stepsByHour(records: StepRecord[], from: number, to: number): { at: number; bySource: Record<string, number> }[] {
  const groups = [...byOrigin(records).entries()];
  const out: { at: number; bySource: Record<string, number> }[] = [];
  for (let t = from; t < to; ) {
    const d = new Date(t);
    const end = Math.min(to, new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime());
    const bySource: Record<string, number> = {};
    for (const [origin, list] of groups) {
      const n = stepsIn(list, t, end);
      if (n > 0) bySource[sourceName(origin)] = n;
    }
    if (Object.keys(bySource).length) out.push({ at: t, bySource });
    t = end;
  }
  return out;
}

export type StepsCheck = {
  at: number;
  steps: number | null; // what S.P.I.D.E.R. counts from the watch now
  plan: StepsPlan | null;
  gapSteps: number | null; // what the other apps added after `plan.gap`
  fill: boolean; // filling Zepp's delay with other apps is on
  zeppMerged: number | null; // Health Connect's own total for Zepp alone: 0 while Zepp has steps means Zepp is off its priority list
  merged: number | null; // Health Connect's merged total of every app: the number the Health Connect app shows
  sources: StepSource[];
  hours: { at: number; bySource: Record<string, number> }[];
  zeppTail: StepRecord[]; // Zepp's newest records, newest first
  errors: string[];
  android: string;
};

const n = (x: number | null | undefined) => (x == null ? '?' : x.toLocaleString('sv-SE'));
const clock = (at: number) => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** What the steps check found, in a sentence or three: why the numbers differ, and what can be done about it. */
export function stepsVerdict(c: StepsCheck): string[] {
  const out: string[] = [];
  const zepp = c.sources.find((x) => x.origin === ZEPP);
  if (!zepp) {
    out.push('Nothing from Zepp in Health Connect today. In Zepp: Profile → Add accounts → Health Connect, and allow steps.');
  } else if (c.plan?.until != null) {
    const behind = Math.round((c.at - c.plan.until) / 60_000);
    if (behind > 5) {
      out.push(
        `Zepp's steps in Health Connect stop at ${clock(c.plan.until)}${zepp.lastWritten ? ` (written ${clock(zepp.lastWritten)})` : ''}: Zepp hasn't handed over the last ${behind} min yet. The Zepp app counts straight from the watch, so it's ahead until it writes them. Opening Zepp and letting the watch sync pushes them.`,
      );
    }
  }
  if (c.plan?.gap != null && c.gapSteps != null) {
    out.push(
      c.plan.until == null
        ? `With nothing from Zepp, S.P.I.D.E.R. counts the other apps: ${n(c.gapSteps)}.`
        : `S.P.I.D.E.R. fills the time after ${clock(c.plan.gap)} with ${n(c.gapSteps)} steps from the other apps (this phone's own counter), until Zepp's own steps arrive.`,
    );
  }
  if (zepp && zepp.steps > 0 && c.zeppMerged === 0) {
    out.push(
      "Health Connect's own total leaves Zepp out: Zepp isn't on its priority list for steps. Health Connect's settings → Steps → data sources and priority: add Zepp at the top.",
    );
  }
  if (c.merged != null && c.steps != null && c.merged !== c.steps) {
    const others = c.sources.filter((x) => x.origin !== ZEPP && x.steps > 0).map((x) => x.name);
    out.push(
      `The Health Connect app shows ${n(c.merged)}: its merged total of ${others.length ? `Zepp and ${others.join(', ')}` : 'every app'}, picked hour by hour by its priority list, so it can differ from Zepp's own count.`,
    );
  }
  return out;
}

/** The steps check as plain text, to share when the numbers still don't add up. */
export function stepsReport(c: StepsCheck): string {
  const lines = [`S.P.I.D.E.R. steps check ${new Date(c.at).toISOString()} (local ${clock(c.at)}, Android ${c.android})`];
  const p = c.plan;
  lines.push(
    p == null
      ? 'Counting: unknown (the read failed)'
      : `Counting: ${n(c.steps)} = Zepp ${n(p.zepp)}${p.until != null ? ` (records up to ${clock(p.until)})` : ' (no records)'}${p.gap != null ? ` + others ${n(c.gapSteps)} since ${clock(p.gap)}` : ''} · filling ${c.fill ? 'on' : 'off'}`,
  );
  lines.push(`Health Connect merged: ${n(c.merged)} · Zepp alone by Health Connect: ${n(c.zeppMerged)}`);
  lines.push('Sources:');
  for (const x of c.sources) {
    lines.push(
      `- ${x.name} (${x.origin}): ${n(x.steps)} · ${x.records} records${x.minutes != null ? ` of ~${x.minutes} min` : ''} · ${x.overlaps} overlapping` +
        `${x.firstStart != null && x.lastEnd != null ? ` · ${clock(x.firstStart)}–${clock(x.lastEnd)}` : ''}${x.lastWritten ? ` · newest written ${clock(x.lastWritten)}` : ''}`,
    );
  }
  const names = [...new Set(c.hours.flatMap((h) => Object.keys(h.bySource)))];
  if (names.length) {
    lines.push(`By hour (${names.join(' / ')}):`);
    for (const h of c.hours) lines.push(`${clock(h.at)}  ${names.map((k) => n(h.bySource[k] ?? 0)).join(' / ')}`);
  }
  if (c.zeppTail.length) {
    lines.push("Zepp's newest records:");
    for (const r of c.zeppTail) lines.push(`${clock(r.start)}–${clock(r.end)} ${r.count}${r.modified ? ` (written ${clock(r.modified)})` : ''}`);
  }
  lines.push(c.errors.length ? `Errors: ${c.errors.join(' | ')}` : 'Errors: none');
  return lines.join('\n');
}
