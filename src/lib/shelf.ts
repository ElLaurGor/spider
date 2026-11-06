// The due-back shelf (step 9 admin): a parcel to pick up (its code shown big until it's picked up), an online
// order's return window and a library loan's return-by day. Shared text (a PostNord, Instabox, DHL or Budbee SMS,
// a shop's delivery mail, the library's reminder) is read for a pickup code and dates; nothing about carrier hold
// times is assumed, so a text without a date asks for one. The return window is the ångerrätt: 14 days counted from
// the day after delivery, and a last day on a weekend or a red day moves to the next weekday (lag 1930:173). One
// opt-in reminder before each deadline (`shelf-<id>`). Pure, so logic-test can check it.
import { addDays, atTime, dayKey, isDayKey, WEEKDAYS_LONG } from './dates';
import type { LineKey } from './lines';
import type { PlannedPing } from './people-days';
import { isDayOff } from './swedish-days';
import type { ShelfItem, ShelfKind, State } from './types';

/** Ångerrätt: 14 days, counted from the day after delivery. */
export const RETURN_DAYS = 14;
/** Done items stay on the list (greyed) this long, then drop off. */
const DONE_KEEP_MS = 3 * 86_400_000;
/** Items kept at most. */
const SHELF_MAX = 40;

export const SHELF_KINDS: Record<ShelfKind, { emoji: string; label: string; done: string; by: string }> = {
  parcel: { emoji: '📦', label: 'Parcel to pick up', done: 'Picked up', by: 'pick up by' },
  return: { emoji: '↩️', label: 'Return window', done: 'Sent back', by: 'return by' },
  loan: { emoji: '📚', label: 'Library loan', done: 'Returned', by: 'due back' },
};

const noon = (key: string) => new Date(`${key}T12:00`);

/** Every match of `re` in `str` (a global copy of it), without String.prototype.matchAll. */
function allMatches(str: string, re: RegExp): RegExpExecArray[] {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const out: RegExpExecArray[] = [];
  for (let m = g.exec(str); m; m = g.exec(str)) {
    out.push(m);
    if (m[0] === '') g.lastIndex++;
  }
  return out;
}

/** The last day to return an order delivered on `delivered`: 14 days from the day after, moved off weekends and red days. */
export function returnBy(delivered: string) {
  let d = addDays(noon(delivered), RETURN_DAYS);
  for (let i = 0; i < 10 && isDayOff(d); i++) d = addDays(d, 1);
  return dayKey(d);
}

// ---------- reading shared text ----------

const MONTHS: [RegExp, number][] = [
  [/^jan(uari|uary)?$/, 1],
  [/^feb(ruari|ruary)?$/, 2],
  [/^mar(s|ch)?$/, 3],
  [/^apr(il)?$/, 4],
  [/^ma(j|y)$/, 5],
  [/^jun(i|e)?$/, 6],
  [/^jul(i|y)?$/, 7],
  [/^aug(usti|ust)?$/, 8],
  [/^sep(t|tember)?$/, 9],
  [/^o[ck]t(ober)?$/, 10],
  [/^nov(ember)?$/, 11],
  [/^dec(ember)?$/, 12],
];
const MONTH_WORD = 'januari|january|jan|februari|february|feb|mars|march|mar|april|apr|maj|may|juni|june|jun|juli|july|jul|augusti|august|aug|september|sept|sep|oktober|october|okt|oct|november|nov|december|dec';
const monthOf = (word: string) => MONTHS.find(([re]) => re.test(word.toLowerCase().replace('.', '')))?.[1] ?? null;

const CARRIERS: [RegExp, string][] = [
  [/postnord/i, 'PostNord'],
  [/instabox/i, 'Instabox'],
  [/\bdhl\b/i, 'DHL'],
  [/budbee/i, 'Budbee'],
  [/\bbring\b/i, 'Bring'],
  [/schenker/i, 'DB Schenker'],
  [/airmee/i, 'Airmee'],
  [/\bups\b/i, 'UPS'],
  [/\bdpd\b/i, 'DPD'],
  [/\bgls\b/i, 'GLS'],
  [/early ?bird/i, 'Early Bird'],
];

// Words before a date. Deadline: the last day something can be done. Starts: "från och med" (from) is a start,
// never a deadline. The nearest one before the date (in its sentence) says what the date is.
const DEADLINE = /(senast|sista\s+dag(en)?|sista\s+datum|t\.\s?o\.\s?m\.?|\btom\b|till\s+och\s+med|innan|före|förfaller|förfallodag|förfallodatum|återlämnas|återlämna|lämnas\s+tillbaka|fram\s+till|kvar\s+till|ligger\s+kvar|reserverad\s+till|\bby\b|\buntil\b|\bbefore\b|no\s+later\s+than|\blatest\b|last\s+day|deadline|expires?|\bdue\b|return\s+date)/gi;
const DELIVERED = /(levererad|levererades|levererat|leveransdatum|delivered|mottagen|mottogs|kom\s+fram|ankom|anlände|utkörd|received)/gi;
const STARTS = /(från\s+och\s+med|fr\.\s?o\.\s?m\.?|\bfrom\b)/gi;
/** Where the last match of `re` ends in `str`, or -1. */
const lastEnd = (re: RegExp, str: string) => {
  let at = -1;
  for (const m of allMatches(str, re)) at = m.index + m[0].length;
  return at;
};
/** What comes before a date in its sentence, weekday abbreviations ("fre.") and "delivered by" tidied away. */
const leadIn = (text: string, index: number) =>
  (text.slice(Math.max(0, index - 48), index).split(/\n|[.!?]\s+(?=[A-ZÅÄÖ])/).at(-1) ?? '')
    .replace(/\b(mån|tis|ons|tors|tor|fre|lör|sön|mon|tue|wed|thu|fri|sat|sun)\./gi, '$1')
    .replace(/\b(delivered|levererad\w*)\s+(by|av)\b/gi, '$1');

type Found = { key: string; index: number; kind: 'deadline' | 'delivered' | 'plain' };

/** A day key for day/month (and a year, maybe 2 digits). Without a year: this year's, or next year's when that's more than 60 days back. */
function keyOf(day: number, month: number, year: number | null, today: string): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ty = Number(today.slice(0, 4));
  const full = year == null ? null : year < 100 ? 2000 + year : year;
  const make = (y: number) => {
    const d = new Date(y, month - 1, day, 12);
    return d.getMonth() === month - 1 ? dayKey(d) : null;
  };
  if (full != null) return full >= 2000 && full <= 2100 ? make(full) : null;
  const k = make(ty);
  if (!k) return null;
  const back = (noon(today).getTime() - noon(k).getTime()) / 86_400_000;
  if (back > 60) return make(ty + 1);
  if (back < -300) return make(ty - 1);
  return k;
}

/** Every date in the text with where it is: ISO, 21/11, 21/11-2026, 21.11.2026, "21 nov", "21:e november 2026", "Nov 21". */
export function datesIn(text: string, today = dayKey()): { key: string; index: number }[] {
  const out: { key: string; index: number; end: number }[] = [];
  const take = (key: string | null, index: number, end: number) => {
    if (key && !out.some((o) => index < o.end && end > o.index)) out.push({ key, index, end });
  };
  for (const m of allMatches(text, /\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/g)) take(keyOf(+m[3], +m[2], +m[1], today), m.index, m.index + m[0].length);
  const word = new RegExp(`\\b(\\d{1,2})(?::?e|:a|st|nd|rd|th)?\\.?\\s+(?:of\\s+)?(${MONTH_WORD})\\.?(?:,?\\s+(\\d{4}))?(?![a-zåäö])`, 'gi');
  for (const m of allMatches(text, word)) take(keyOf(+m[1], monthOf(m[2]) ?? 0, m[3] ? +m[3] : null, today), m.index, m.index + m[0].length);
  const english = new RegExp(`\\b(${MONTH_WORD})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'gi');
  for (const m of allMatches(text, english)) take(keyOf(+m[2], monthOf(m[1]) ?? 0, m[3] ? +m[3] : null, today), m.index, m.index + m[0].length);
  // Day first, as in Sweden (and Britain). Not a time ("kl. 12.30"), a weight or a price ("2.5 kg"), or "parcel 1/2".
  for (const m of allMatches(text, /\b(\d{1,2})[./](\d{1,2})(?:[./-](\d{4}|\d{2}))?(?![\d.,]*\s*(?:(?:kg|g|kr|sek|cm)(?![a-zåäö])|%))(?![\d:])/gi)) {
    const before = text.slice(Math.max(0, m.index - 12), m.index);
    if (/kl\.?\s*$/i.test(before) || /(kolli|paket|del|part|parcel|package|nr|no\.?)\s*$/i.test(before)) continue;
    take(keyOf(+m[1], +m[2], m[3] ? +m[3] : null, today), m.index, m.index + m[0].length);
  }
  return out.sort((a, b) => a.index - b.index).map(({ key, index }) => ({ key, index }));
}

function datesWithKinds(text: string, today: string): Found[] {
  return datesIn(text, today).map(({ key, index }) => {
    const lead = leadIn(text, index);
    const at = { deadline: lastEnd(DEADLINE, lead), delivered: lastEnd(DELIVERED, lead), start: lastEnd(STARTS, lead) };
    const best = Math.max(at.deadline, at.delivered, at.start);
    const kind: Found['kind'] = best < 0 || best === at.start ? 'plain' : best === at.delivered ? 'delivered' : 'deadline';
    return { key, index, kind };
  });
}

/** A pickup code: 4–10 capital letters or digits (at least one digit), or "123 456", soon after a code word. */
export function codeIn(text: string): string | null {
  const label = /(utlämningskod|upphämtningskod|uthämtningskod|hämtningskod|hämtkod|öppningskod|upplåsningskod|paketboxkod|boxkod|pin-?kod|\bpin\b|\bkoden\b|\bkod\b|pickup code|collection code|\bcode\b)/gi;
  for (const m of allMatches(text, label)) {
    const lead = text.slice(Math.max(0, m.index - 6), m.index).toLowerCase();
    if (/(qr-?|qr |streck|bar)$/.test(lead)) continue; // a QR code or a barcode isn't the code to type in
    const window = text.slice(m.index + m[0].length, m.index + m[0].length + 48);
    for (const c of allMatches(window, /([A-Z0-9]{4,10}|\d{3}[ -]\d{3})/g)) {
      const prev = window[c.index - 1] ?? ' ';
      const next = window[c.index + c[0].length] ?? ' ';
      if (/[\w/.:-]/.test(prev) || /[\w/:-]/.test(next) || (next === '.' && /\d/.test(window[c.index + c[0].length + 1] ?? ''))) continue;
      const code = c[0].replace(/[ -]/g, '');
      if (!/\d/.test(code) || /^(19|20)\d\d$/.test(code)) continue; // a year isn't a code
      return code;
    }
  }
  return null;
}

export const carrierIn = (text: string) => CARRIERS.find(([re]) => re.test(text))?.[1] ?? null;

/** Who it's from ("från Zalando", "from Apotea"), for the title. */
function senderIn(text: string) {
  const m = text.match(/\b(?:från|from|avsändare:?|sender:?)\s+([A-ZÅÄÖ][\wÅÄÖåäö&'-]+(?:\s[A-ZÅÄÖ][\wÅÄÖåäö&'-]+)?)/);
  const who = m?.[1]?.trim();
  return who && !CARRIERS.some(([re]) => re.test(who)) ? who : null;
}

/** What kind of item the text is about, when it says: a library loan, a parcel to pick up, an online order. */
export function kindIn(text: string, code: string | null): ShelfKind | null {
  if (/bibliotek|library|\blån(et|en|ade)?\b|\bloans?\b|lånetid|omlån|återlämna/i.test(text)) return 'loan';
  if (code || /hämta|uthämtning|utlämning|ombud|paketbox|paketskåp|\bbox\b|pick ?up|collect|service ?point|postombud/i.test(text)) return 'parcel';
  if (/retur|return|ångerrätt|levererad|levererades|delivered|\border\b|beställning/i.test(text)) return 'return';
  return null;
}

export type ShelfParse = {
  kind: ShelfKind | null;
  carrier: string | null;
  code: string | null;
  until: string | null; // the last day, when a deadline word comes before it
  delivered: string | null;
  dates: string[]; // every date found, for one-tap picks
  title: string;
};

/** Reads a shared text for the shelf: kind, carrier, code, the deadline and the delivery day. What isn't there stays null (the form asks). */
export function parseShelfText(text: string, today = dayKey()): ShelfParse {
  const code = codeIn(text);
  const carrier = carrierIn(text);
  const kind = kindIn(text, code);
  const found = datesWithKinds(text, today);
  const deadline = found.find((f) => f.kind === 'deadline' && f.key >= today) ?? found.find((f) => f.kind === 'deadline');
  const delivered = found.find((f) => f.kind === 'delivered' && f.key <= today)?.key ?? null;
  // A loan is named after the book when the text quotes it ("Kallocain"), never after the library.
  const quoted = text.match(/["“”«»]([^"“”«»\n]{2,60})["“”«»]/)?.[1]?.trim() ?? null;
  const sender = kind === 'loan' ? quoted : senderIn(text);
  return {
    kind,
    carrier,
    code,
    until: deadline?.key ?? null,
    delivered,
    dates: [...new Set(found.map((f) => f.key))],
    title: shelfTitle(kind ?? 'parcel', carrier, sender),
  };
}

/** A title for an item: "Parcel · PostNord", "Return · Zalando", "Library loan". */
export function shelfTitle(kind: ShelfKind, carrier: string | null, sender: string | null = null) {
  if (kind === 'loan') return sender ? `Library loan · ${sender}` : 'Library loan';
  if (kind === 'return') return sender ? `Return · ${sender}` : 'Online order return';
  const who = [sender, carrier].filter(Boolean).join(' · ');
  return who ? `Parcel · ${who}` : 'Parcel';
}

// ---------- the shelf ----------

const shelfOf = (s: State) => s.shelf ?? [];

/** The shelf as shown: open items by deadline (none last), then the ones just done. */
export function shelfList(s: State, now = Date.now()): ShelfItem[] {
  const open = shelfOf(s)
    .filter((x) => x.doneAt == null)
    .sort((a, b) => (a.until ?? '9999').localeCompare(b.until ?? '9999') || a.at - b.at);
  const done = shelfOf(s).filter((x) => x.doneAt != null && now - x.doneAt < DONE_KEEP_MS);
  return [...open, ...done];
}

export const openShelf = (s: State) => shelfOf(s).filter((x) => x.doneAt == null);

/** A tidied code: capitals and digits only, at most 12. */
export const cleanCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

/** Adds an item. A return with a delivery day and no last day gets the ångerrätt's. Old done items drop off. */
export function withShelfItem(s: State, item: Omit<ShelfItem, 'id' | 'at'>, id: string, now = Date.now()): State {
  const title = item.title.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!title) return s;
  const delivered = item.delivered && isDayKey(item.delivered) ? item.delivered : undefined;
  const until = item.until && isDayKey(item.until) ? item.until : item.kind === 'return' && delivered ? returnBy(delivered) : undefined;
  const code = item.code ? cleanCode(item.code) : '';
  const next: ShelfItem = {
    id,
    kind: item.kind,
    title,
    at: now,
    ...(code ? { code } : {}),
    ...(item.carrier ? { carrier: item.carrier } : {}),
    ...(until ? { until } : {}),
    ...(delivered ? { delivered } : {}),
    ...(item.remind && until ? { remind: true } : {}),
  };
  const kept = shelfOf(s).filter((x) => x.doneAt == null || now - x.doneAt < DONE_KEEP_MS);
  return { ...s, shelf: [...kept, next].slice(-SHELF_MAX) };
}

export const withShelfDone = (s: State, id: string, done: boolean, now = Date.now()): State => ({
  ...s,
  shelf: shelfOf(s).map((x) => (x.id === id ? (done ? { ...x, doneAt: now } : { ...x, doneAt: undefined }) : x)),
});

export const withoutShelfItem = (s: State, id: string): State => ({ ...s, shelf: shelfOf(s).filter((x) => x.id !== id) });

export function withShelfRemind(s: State, id: string, on: boolean): State {
  return { ...s, shelf: shelfOf(s).map((x) => (x.id === id && x.until ? { ...x, remind: on || undefined } : x)) };
}

/** Days left to `until` from `today` (0 on the day itself, below 0 once it's gone). */
export const daysTo = (until: string, today = dayKey()) => Math.round((noon(until).getTime() - noon(today).getTime()) / 86_400_000);

/** "today", "tomorrow", "Friday" (within a week), else "Fri 21 Nov". */
export function dayWord(key: string, today = dayKey()) {
  const n = daysTo(key, today);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1 && n < 7) return WEEKDAYS_LONG[noon(key).getDay()];
  return noon(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** The deadline as a card shows it: "pick up by Friday", "return by today", "was due Tue 4 Nov". */
export function deadlineText(x: ShelfItem, today = dayKey()) {
  if (!x.until) return 'no date yet';
  const n = daysTo(x.until, today);
  return n < 0 ? `was due ${dayWord(x.until, today)}` : `${SHELF_KINDS[x.kind].by} ${dayWord(x.until, today)}`;
}

const REMIND_LINE: Record<ShelfKind, LineKey> = { parcel: 'shelfRemindPickup', return: 'shelfRemindReturn', loan: 'shelfRemindLoan' };
/** The evening before the last day, at this hour. */
export const REMIND_HOUR = 18;

/**
 * When an item's one reminder goes: 18:00 the day before its last day, or, for an item added after that, the
 * morning of the last day (wake-up + 1 h). Worked out from when it was added, so a replan never moves it to a
 * second ping. Null without a date, without the opt-in, or once it's done.
 */
export function shelfRemindAt(x: ShelfItem, wakeHour: number): Date | null {
  if (!x.remind || !x.until || x.doneAt != null) return null;
  const eve = atTime(noon(x.until), -1, REMIND_HOUR);
  if (x.at < eve.getTime()) return eve;
  const morning = atTime(noon(x.until), 0, wakeHour + 1);
  return x.at < morning.getTime() ? morning : null;
}

/** The shelf's planned reminders (`shelf-<id>`), each in its own day's tone (notifications.ts). */
export function shelfPings(s: State, now = new Date()): (PlannedPing & { code?: string })[] {
  const out: (PlannedPing & { code?: string })[] = [];
  for (const x of openShelf(s)) {
    const at = shelfRemindAt(x, s.settings.wakeHour);
    if (!at || at.getTime() <= now.getTime()) continue;
    const day = dayKey(at);
    const k = SHELF_KINDS[x.kind];
    out.push({ id: `shelf-${x.id}`, at, day, title: `${k.emoji} ${x.title}`, line: REMIND_LINE[x.kind], vars: { title: x.title, day: dayWord(x.until as string, day) }, ...(x.code ? { code: x.code } : {}) });
  }
  return out;
}
