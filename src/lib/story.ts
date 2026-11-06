// step 9 story: what run() checks after everything else (store.tsx, next to the golden-line roll). Once-only
// remarks (remarks.ts), winks at meta-moves (meta-winks.ts), intercepted memos (cipher.ts) and the day's letter
// (mail.ts). Pure apart from the line picks, so the rules are tested in logic-test.ts:
// - at most one remark and one wink a run; a remark takes the place of the usual line when that line is showing;
// - on a quiet day (tone.ts quietDay) a remark says its kind version or waits, and winks are dropped;
// - nothing here pays XP.
import { fliesCaught, FLY_MEMO, memoFound, memoLine, memosFound, withMemo } from './cipher';
import { dayKey } from './dates';
import { fillLine, freshLine, producedLine, type LineKey } from './lines';
import { withMail, MAMMA } from './mail';
import { META_LINE, metaEvents, saidThisWeek, withSaid } from './meta-winks';
import { REMARKS, remarksEarned, type Remark } from './remarks';
import { effectiveSavage } from './selectors';
import { quietDay } from './tone';
import type { RemarkMark, State } from './types';

export type StoryMsg = { text: string; tone: 'info' | 'good' | 'bad' | 'epic' };
export type StoryOpts = { quiet?: boolean; rough?: boolean; now?: Date };

/** Remarks said in one day at most; the rest wait for the next. */
export const REMARKS_A_DAY = 4;
export const REMARK_MARK = '👁️';

const say = (s: State, key: LineKey, vars: Record<string, string | number> = {}) => freshLine(key, effectiveSavage(s), { name: s.settings.userName || 'boss', ...vars });

/** Puts a remark in place of the usual line of that moment when one of `replaces` is showing, else as a toast of its own. */
export function tellRemark(msgs: StoryMsg[], r: Pick<Remark, 'replaces'>, text: string) {
  const shown = `${REMARK_MARK} ${text}`;
  for (let i = msgs.length - 1; i >= 0 && r.replaces?.length; i--) {
    const p = producedLine(msgs[i].text);
    if (p && (r.replaces as string[]).includes(p.key)) {
      msgs[i] = { ...msgs[i], text: msgs[i].text.replace(p.text, shown), tone: 'epic' };
      return;
    }
  }
  msgs.push({ text: shown, tone: 'epic' });
}

/**
 * The remark to say now (one at most): a freshly earned one, else one still waiting. `quiet`: a quiet day, so only
 * a kind version is said and the rest wait. `silent` (a quiet run): nothing is said, what was earned waits.
 */
export function remarksNow(prev: State, s: State, quiet: boolean, now: Date, silent = false): { state: State; told: { r: Remark; text: string; replace: boolean } | null } {
  const at = now.getTime();
  const today = dayKey(now);
  const marks: Record<string, RemarkMark> = { ...s.remarks };
  const earned = remarksEarned(prev, s);
  const name = s.settings.userName || 'boss';
  const saidToday = Object.values(marks).filter((m) => !m.wait && dayKey(m.at) === today).length;
  let told: { r: Remark; text: string; replace: boolean } | null = null;
  const tell = (r: Remark, replace: boolean) => {
    if (silent || told || saidToday >= REMARKS_A_DAY) return false;
    if (quiet && !r.kind) return false;
    told = { r, text: fillLine(quiet ? r.kind! : r.text, { name }), replace };
    marks[r.id] = quiet ? { at, kind: true } : { at };
    return true;
  };
  for (const r of earned) if (!tell(r, true)) marks[r.id] = { at, wait: true };
  if (!told) {
    const waiting = REMARKS.filter((r) => s.remarks?.[r.id]?.wait);
    for (const r of waiting) if (tell(r, false)) break;
  }
  if (!earned.length && !told) return { state: s, told: null };
  return { state: { ...s, remarks: marks }, told };
}

/**
 * The story checks for one run, after the rest of the pipeline. `quiet` (body and photo logging): nothing is said
 * and no letter comes, but what happened is still noted. `rough`: the rough-patch card would show (care packages).
 */
export function checkStory(prev: State, next: State, msgs: StoryMsg[], opts: StoryOpts = {}): State {
  if (!next.onboarded) return next;
  const now = opts.now ?? new Date();
  const today = dayKey(now);
  const quietToday = quietDay(next, today, now);

  // Winks at meta-moves: never on a quiet day, each kind once a week.
  const meta = metaEvents(prev, next, now.getTime());
  let s = meta.state;
  if (!opts.quiet && !quietToday) {
    const e = meta.events.find((x) => !saidThisWeek(s, x.kind, now.getTime()));
    if (e) {
      msgs.push({ text: `🌀 ${say(s, META_LINE[e.kind], e.vars)}`, tone: 'info' });
      s = withSaid(s, e.kind, now.getTime());
    }
  }

  // Once-only remarks (a quiet run only notes what was earned, for later).
  const r = remarksNow(prev, s, quietToday, now, !!opts.quiet);
  s = r.state;
  if (r.told) {
    const t: { r: Remark; text: string; replace: boolean } = r.told;
    tellRemark(msgs, t.replace ? t.r : {}, t.text);
  }

  // Intercepted memos: a 13th fly (the 13th caught, or the 26th, … for a collection that's past 13), and a toast at 13:37 (once).
  if (Math.floor(fliesCaught(prev) / FLY_MEMO) < Math.floor(fliesCaught(s) / FLY_MEMO) && !memoFound(s, 'fly13')) {
    s = withMemo(s, 'fly13', now.getTime());
    if (!opts.quiet) msgs.push({ text: say(s, 'memoIntercepted', { n: s.cipher?.found.length ?? 1 }), tone: 'epic' });
  }
  if (!opts.quiet && now.getHours() === 13 && now.getMinutes() === 37 && !memoFound(s, 'leet')) {
    s = withMemo(s, 'leet', now.getTime());
    const memo = memosFound(s).at(-1);
    msgs.push({ text: `📡 13:37. Incoming: ${memo ? memoLine(s, memo.text) : ''} (kept in the Bestiary, under Decoder)`, tone: 'epic' });
  }

  // The day's letter.
  if (!opts.quiet) {
    const m = withMail(s, now, { rough: opts.rough });
    if (m.letter) {
      s = m.state;
      const from = m.letter.from === 'mamma' ? `${MAMMA.name} in Småland` : `${m.letter.emoji} ${m.letter.sender}`;
      msgs.push({ text: say(s, 'mailArrived', { title: from }), tone: 'good' });
      if (m.letter.memo) msgs.push({ text: say(s, 'memoIntercepted', { n: s.cipher?.found.length ?? 1 }), tone: 'epic' });
    }
  }
  return s;
}
