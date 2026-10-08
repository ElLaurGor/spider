export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// Monday-first order for display.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const MIN = 60_000;
export const HOUR = 60 * MIN;

export const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date | number = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function startOfDay(d: Date | number = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date | number, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** The given clock time, `dayOffset` days from `base`. */
export function atTime(base: Date | number, dayOffset: number, hour: number, minute = 0) {
  const x = addDays(base, dayOffset);
  x.setHours(hour, minute, 0, 0);
  return x;
}

export function startOfWeek(d: Date | number = new Date()) {
  const x = startOfDay(d);
  const back = (x.getDay() + 6) % 7; // Monday = 0
  return addDays(x, -back);
}

export const fmtTime = (d: Date | number) => {
  const x = new Date(d);
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export function fmtDuration(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

export function timeOfDay(d = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 23) return 'evening';
  return 'night';
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
