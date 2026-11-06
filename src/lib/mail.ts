// The mailbox: at most one letter a day from the cast, kept for good (the newest MAIL_KEEP). A beaten boss resigns
// and cites the real kill time; the Couch King writes from exile once he has fallen; a co-op partner sends a
// postcard when the week is settled; Mamma Spindel writes from Småland once a month, and sends a care package (a
// letter and something knitted, never XP) when the rough-patch card would show. Mamma's letters are private and
// kind: nothing about the body, food or mood, ever. Pure, so it's tested in logic-test.ts.
import { GOALS } from './coop';
import { owns, withOwned, cosmeticOf } from './cosmetics';
import { dayKey, fmtTime, startOfWeek, WEEKDAYS_LONG } from './dates';
import { FINAL_BOSS, bossFor, kingWeeksOf } from './quests';
import { LETTER_MEMO, memoFound, withMemo } from './cipher';
import type { Letter, State } from './types';

export const MAIL_KEEP = 200;
/** How long after a boss falls its resignation can still arrive (one letter a day, so a busy week may queue). */
export const RESIGN_DAYS = 10;
/** A co-op week's postcard can still come this long after the week. */
export const POSTCARD_DAYS = 21;
/** The Couch King writes from exile this often while he stays down. */
export const EXILE_EVERY_DAYS = 28;
/** A care package at most this often, however long the rough patch. */
export const CARE_EVERY_DAYS = 30;
/** Mamma's knitting, in the order she sends it (cosmetics.ts). Once all are owned, a little bus money instead. */
export const KNITS = ['knit_scarf', 'knit_socks', 'knit_mittens', 'knit_yarn'];
export const CARE_COINS = 50;
export const MAMMA = { name: 'Mamma Spindel', emoji: '🧶' };

const DAY_MS = 86_400_000;
const noon = (key: string) => new Date(`${key}T12:00`);
const month = (key: string) => key.slice(0, 7);
const monthName = (ym: string) => new Date(`${ym}-15T12:00`).toLocaleDateString('en-GB', { month: 'long' });

export type MailCtx = { rough?: boolean };
type Draft = Omit<Letter, 'id' | 'at' | 'day'>;

const has = (s: State, ref: string) => (s.mail ?? []).some((l) => l.ref === ref);
const lastOf = (s: State, prefix: string) => (s.mail ?? []).filter((l) => l.ref.startsWith(prefix)).at(-1) ?? null;
const owner = (s: State, fallback: string) => s.settings.userName || fallback;

/** Where in its week a boss fell: "on Wednesday at 18:42, 2 days and 18 hours into the week". */
export function killedText(week: string, at: number, late: boolean) {
  if (late) return 'after the final whistle, on numbers that came in late';
  const into = Math.max(0, at - new Date(`${week}T00:00`).getTime());
  const days = Math.floor(into / DAY_MS);
  const hours = Math.floor((into % DAY_MS) / 3_600_000);
  const min = Math.floor((into % 3_600_000) / 60_000);
  const parts = [days ? `${days} day${days === 1 ? '' : 's'}` : '', hours ? `${hours} hour${hours === 1 ? '' : 's'}` : '', !days && min ? `${min} minute${min === 1 ? '' : 's'}` : ''].filter(Boolean);
  const span = parts.length ? parts.join(' and ') : 'minutes';
  return `on ${WEEKDAYS_LONG[new Date(at).getDay()]} at ${fmtTime(at)}, ${span} into the week`;
}

const RESIGN: Record<string, { subject: string; body: (v: { name: string; boss: string; killed: string }) => string }> = {
  procrastinator: {
    subject: 'Resignation (finally)',
    body: (v) => `Dear ${v.name},\n\nI was going to write this sooner.\n\nPlease accept my resignation as this week's boss. You beat me ${v.killed}. That is faster than I have ever started anything.\n\nI will clear my desk tomorrow. Or the day after. Soon, let's say.\n\nRegretfully,\n${v.boss}`,
  },
  couch_goblin: {
    subject: 'Resignation from between the cushions',
    body: (v) => `To ${v.name},\n\nYou got up. Repeatedly. And ${v.killed}, I was officially beaten.\n\nI am moving back into the gap between the cushions, where it is warm and nobody does lunges.\n\nYours, with crumbs,\n${v.boss}`,
  },
  doomscroll: {
    subject: "I'm logging off",
    body: (v) => `${v.name},\n\nYou beat me ${v.killed}. I did not see it coming. I was busy refreshing.\n\nI resign, effective immediately. Please do not like, share or subscribe.\n\nLogging out,\n${v.boss}`,
  },
  snooze: {
    subject: 'Resignation (snoozed twice before sending)',
    body: (v) => `Dear ${v.name},\n\nI tried to write this at 07:00. Then at 07:09. Then at 07:18.\n\nYou finished me ${v.killed}. I accept it. Nine more minutes, and then I accept it.\n\nDrowsily,\n${v.boss}`,
  },
  dehydration: {
    subject: 'Resignation, very dry',
    body: (v) => `${v.name},\n\nCaptain's log, final entry. My ship went down ${v.killed}. It went down in water. Yours.\n\nI resign my commission and will retire somewhere arid.\n\nParched regards,\n${v.boss}`,
  },
  leg_day: {
    subject: 'I yield (sitting down)',
    body: (v) => `Dear ${v.name},\n\nYou beat me ${v.killed}. I would kneel, but I have never trained for it.\n\nPlease accept my resignation, and these very long trousers.\n\nRespectfully,\n${v.boss}`,
  },
  sugar_baron: {
    subject: 'Resignation, no shortcuts',
    body: (v) => `${v.name},\n\nI looked for a shortcut out of this. There wasn't one. You took the long way and beat me ${v.killed}.\n\nMy resignation is attached. I wrote it the hard way, and it hurt.\n\nSincerely,\n${v.boss}`,
  },
  binge: {
    subject: 'The final episode',
    body: (v) => `Dear ${v.name},\n\nPreviously, on this week: you beat me ${v.killed}.\n\nThis is my resignation. There is no next episode. Autoplay has been cancelled.\n\nUntil the reboot,\n${v.boss}`,
  },
  [FINAL_BOSS.id]: {
    subject: 'Abdication',
    body: (v) => `${v.name},\n\nBy royal decree, which nobody reads: I step down. You toppled the throne ${v.killed}.\n\nI take with me only the remote and my dignity, and I could not find the remote.\n\nFormerly yours,\n${v.boss}`,
  },
};

const EXILE: { subject: string; body: (name: string) => string }[] = [
  { subject: 'Greetings from exile', body: (n) => `${n},\n\nI write to you from a folding chair. A FOLDING CHAIR. No cushions, no recline, no cup holder.\n\nThe Syndicate has stopped returning my calls. The Procrastinator says he will call back later.\n\nEnjoy your victory. I am planning my comeback. Slowly.` },
  { subject: 'Exile, week something', body: (n) => `${n},\n\nI have taken up a hobby. It is standing. I hate it.\n\nThe Snooze Button visited. He stayed nine minutes, then nine more, then left without saying goodbye.\n\nDo not think this means I miss you. I miss my throne.` },
  { subject: 'A formal complaint', body: (n) => `To ${n},\n\nThe accommodation in exile has stairs. Who builds stairs? People like you, I expect.\n\nI have lodged a complaint with the management. The management is a pigeon.\n\nYours, out of breath.` },
  { subject: 'Postcard from a park bench', body: (n) => `${n},\n\nToday I sat on a park bench for an hour. It was the least comfortable hour of my reign.\n\nA jogger nodded at me. I did not nod back. I have standards, and also a stiff neck.` },
  { subject: 'Still here', body: (n) => `${n},\n\nThey say a walk helps with heartbreak. I would not know. I am heartbroken horizontally.\n\nThe Binge Necromancer recommends a series about a king who gets his throne back. I have watched it four times.` },
  { subject: 'An invitation, declined', body: (n) => `${n},\n\nI was invited to a five-kilometre fun run. I sent my regrets and a small decorative cushion.\n\nYou may think you have won. You have. But I am keeping a list.` },
];

/** Mamma's news from Småland, one per calendar month. Weather, the lake, the neighbours, knitting. */
const MAMMA_MONTHS = [
  'Snow up to the mailbox here. Gunnar dug a path to it so your letters can get through. He says the shovelling did him good.',
  'The lake has frozen solid and the ice fishermen are out, sitting very still. I think of them as experts at patience. I could learn a thing or two.',
  'The first crocus came up by the woodshed this week. I told it all about you. It seemed encouraged.',
  'Spring cleaning! I found your old school drawings. The spider with nine legs is still my favourite. Nine is a lucky number.',
  'The birches are out and the whole forest smells green. Your father has started talking to the lawnmower again. It does not answer, which suits him.',
  'Midsummer is coming. We will dance around the pole, and your father will pretend he does not know the words to the frog song.',
  'Long light evenings. I sit on the porch and knit until the mosquitoes vote me out.',
  'The nights are getting dark again, and the stars are back over the lake. I counted them for you. I lost count, but it was a lot.',
  "The forest is turning gold. Gunnar's cows have learned to open the gate. Nobody here is surprised.",
  'Storms this month. The old oak lost a branch, and your father has named it. The branch, not the oak.',
  'Dark by four now. I have lit candles in every window, so the house looks like it is waving at you.',
  'The Advent star is up in the kitchen window. The church choir needs altos. I told them you are busy being wonderful in Stockholm.',
];
const MAMMA_KNIT = [
  'My knitting is going well. I am making something. You will find out.',
  'I dropped a stitch on Tuesday and found it again on Thursday. That is how it goes. Things come back.',
  'The yarn shop in the village has a new colour. I bought too much of it, of course.',
  'I have started a new pattern. It has more holes than it should, but your father says it looks deliberate.',
];

/** What S.P.I.D.E.R. tells Mamma about last month: tasks finished and training days, only when there were some. Never anything else. */
function mammaNews(s: State, ym: string) {
  let tasks = 0;
  let trained = 0;
  for (const [key, d] of Object.entries(s.days)) {
    if (!key.startsWith(ym)) continue;
    tasks += d.doneTasks?.length ?? 0;
    if (d.workoutCounted) trained += 1;
  }
  const bits = [tasks ? `finished ${tasks} task${tasks === 1 ? '' : 's'}` : '', trained ? `trained on ${trained} day${trained === 1 ? '' : 's'}` : ''].filter(Boolean);
  if (!bits.length) return '';
  return ` Your S.P.I.D.E.R. tells me you ${bits.join(' and ')} in ${monthName(ym)}. I am proud of you, numbers or no numbers.`;
}

function mammaLetter(s: State, now: Date): Draft {
  const ym = month(dayKey(now));
  const last = month(dayKey(new Date(now.getFullYear(), now.getMonth() - 1, 15)));
  const name = owner(s, 'darling');
  const n = (s.mail ?? []).filter((l) => l.from === 'mamma').length;
  const body = `Dear ${name},\n\n${MAMMA_MONTHS[now.getMonth()]}\n\n${MAMMA_KNIT[n % MAMMA_KNIT.length]}${mammaNews(s, last)}\n\nBe kind to yourself, little one.\n\nKramar,\nMamma`;
  return { from: 'mamma', sender: MAMMA.name, emoji: MAMMA.emoji, subject: `A letter from Småland · ${monthName(ym)}`, body, ref: `mamma:${ym}` };
}

const CARE_OPEN = [
  'Something told me you could use a parcel. Mothers know these things, even from Småland.',
  'I had a feeling this morning, so I went straight to the post office. Gunnar drove. He drives very slowly, so it took a while.',
  'This is just a little parcel, for no reason at all. Well, for a small reason. You.',
];

function careLetter(s: State, now: Date): { draft: Draft; gift: string | null } {
  const gift = KNITS.find((id) => !owns(s, id)) ?? null;
  const name = owner(s, 'darling');
  const n = (s.mail ?? []).filter((l) => l.ref.startsWith('care:')).length;
  const inside = gift
    ? `Inside is a ${cosmeticOf(gift)?.name.toLowerCase() ?? 'knitted thing'}, made during the long evenings. Wear it when the days feel heavy. It will not fix anything, but it will be warm, and so am I.`
    : `Inside is a little something for the bus, since I have already knitted you everything. Twice.`;
  const body = `Dear ${name},\n\n${CARE_OPEN[n % CARE_OPEN.length]}\n\n${inside}\n\nNo need to write back. Rest when you can, and call if you like. I am always here.\n\nKramar,\nMamma`;
  return {
    draft: { from: 'mamma', sender: MAMMA.name, emoji: MAMMA.emoji, subject: 'A parcel from Småland', body, ref: `care:${dayKey(now)}`, ...(gift ? { gift } : { coins: CARE_COINS }) },
    gift,
  };
}

/** The boss kills whose resignation hasn't come yet (the last RESIGN_DAYS), oldest first. */
function resignDue(s: State, now: Date) {
  const since = now.getTime() - RESIGN_DAYS * DAY_MS;
  return Object.keys(s.bossesDefeated)
    .filter((week) => (s.bossKilledAt?.[week] ?? 0) >= since && !has(s, `resign:${week}`))
    .sort();
}

function resignLetter(s: State, week: string): Draft {
  const boss = bossFor(s, noon(week));
  const id = s.bossesDefeated[week];
  const at = s.bossKilledAt?.[week] ?? Date.now();
  const late = (s.bossLateKills ?? []).includes(week);
  const t = RESIGN[id] ?? RESIGN.procrastinator;
  const king = id === FINAL_BOSS.id;
  return {
    from: king ? 'king' : 'boss',
    sender: boss.name,
    emoji: boss.emoji,
    subject: t.subject,
    body: t.body({ name: owner(s, 'boss'), boss: boss.name, killed: killedText(week, at, late) }),
    ref: `resign:${week}`,
  };
}

function exileDue(s: State, now: Date) {
  if (!s.syndicateBroken) return null;
  const week = dayKey(startOfWeek(now));
  const kings = kingWeeksOf(s);
  if (kings.includes(week)) return null; // he's back this week: no time for letters
  const lastKill = Math.max(0, ...Object.entries(s.bossesDefeated).filter(([, id]) => id === FINAL_BOSS.id).map(([w]) => s.bossKilledAt?.[w] ?? 0));
  if (!lastKill || now.getTime() - lastKill < 7 * DAY_MS) return null; // the abdication comes first
  const last = lastOf(s, 'exile:');
  if (last && now.getTime() - last.at < EXILE_EVERY_DAYS * DAY_MS) return null;
  return week;
}

function exileLetter(s: State, week: string): Draft {
  const n = (s.mail ?? []).filter((l) => l.ref.startsWith('exile:')).length;
  const t = EXILE[n % EXILE.length];
  return { from: 'king', sender: `${FINAL_BOSS.name}, in exile`, emoji: FINAL_BOSS.emoji, subject: t.subject, body: `${t.body(owner(s, 'boss'))}\n\n${FINAL_BOSS.name}, in exile`, ref: `exile:${week}` };
}

function postcardDue(s: State, now: Date) {
  const c = s.coop;
  if (!c?.result || has(s, `coop:${c.week}`)) return null;
  if (now.getTime() - noon(c.week).getTime() > (7 + POSTCARD_DAYS) * DAY_MS) return null;
  return c;
}

function postcard(s: State, c: NonNullable<State['coop']>): Draft {
  const r = c.result!;
  const name = owner(s, 'there');
  const goal = GOALS[c.goal]?.label ?? 'the goal';
  const sign = `${c.partner.emoji} ${c.partner.name}`;
  const card =
    r.target <= 0
      ? { subject: 'Postcard from a rest week', body: `Hej ${name}!\n\nOur co-op week got called off for rest. Good call. I spent it lying very still inside a spreadsheet.\n\nSame team next time?\n\n${sign}` }
      : r.won
        ? { subject: 'Postcard from the finish line', body: `Hej ${name}!\n\nGreetings from the end of our co-op week: ${r.count} of ${r.target} ${goal}, together. I have framed the bar.\n\nBack to being rivals on Monday. I will miss being on your side. A little.\n\n${sign}` }
        : { subject: 'Postcard from almost', body: `Hej ${name},\n\nWe got to ${r.count} of ${r.target} ${goal}. Not the finish line, but you could see it from there.\n\nNo hard feelings. Mostly because you cannot see my face. Next co-op, we go again.\n\n${sign}` };
  return { from: 'rival', sender: c.partner.name, emoji: c.partner.emoji, ...card, ref: `coop:${c.week}` };
}

/** Today already had its letter. */
export const mailedToday = (s: State, now = new Date()) => (s.mail ?? []).some((l) => l.day === dayKey(now));

/**
 * The day's letter, if one is due and none came today: a care package first (when the rough-patch card would
 * show, at most every CARE_EVERY_DAYS), then a boss's resignation, a co-op postcard, Mamma's monthly letter and
 * the Couch King from exile. A care package's knitting goes straight into the wardrobe (or coins when she has
 * knitted everything already). Never XP.
 */
export function withMail(s: State, now = new Date(), ctx: MailCtx = {}): { state: State; letter: Letter | null } {
  if (!s.onboarded || mailedToday(s, now)) return { state: s, letter: null };
  let draft: Draft | null = null;
  let next = s;
  const lastCare = lastOf(s, 'care:');
  if (ctx.rough && (!lastCare || now.getTime() - lastCare.at >= CARE_EVERY_DAYS * DAY_MS)) {
    const care = careLetter(s, now);
    draft = care.draft;
    if (care.gift) next = withOwned(next, care.gift);
    else next = { ...next, coins: next.coins + CARE_COINS, coinsEarned: next.coinsEarned + CARE_COINS };
  }
  if (!draft) {
    const week = resignDue(s, now)[0];
    if (week) {
      draft = resignLetter(s, week);
      // The second resignation letter ever carries an intercepted memo in its P.S. (cipher.ts).
      const resigned = (s.mail ?? []).filter((l) => l.ref.startsWith('resign:')).length + 1;
      if (resigned >= LETTER_MEMO && !memoFound(next, 'letter')) {
        draft = { ...draft, memo: true, body: `${draft.body}\n\nP.S. This was in the Syndicate's out-tray. I did not read it. Burn it.` };
        next = withMemo(next, 'letter', now.getTime());
      }
    }
  }
  if (!draft) {
    const c = postcardDue(s, now);
    if (c) draft = postcard(s, c);
  }
  if (!draft && !has(s, `mamma:${month(dayKey(now))}`)) draft = mammaLetter(s, now);
  if (!draft) {
    const week = exileDue(s, now);
    if (week) draft = exileLetter(s, week);
  }
  if (!draft) return { state: s, letter: null };
  const letter: Letter = { ...draft, id: `${now.getTime().toString(36)}-${draft.ref}`, at: now.getTime(), day: dayKey(now) };
  return { state: { ...next, mail: [...(next.mail ?? []), letter].slice(-MAIL_KEEP) }, letter };
}

/** Letters not opened yet, newest first. */
export const unreadMail = (s: State) => (s.mail ?? []).filter((l) => !l.read).reverse();
/** `s` with letter `id` (or every letter) marked read. */
export const withRead = (s: State, id?: string): State => ({ ...s, mail: (s.mail ?? []).map((l) => (!id || l.id === id ? (l.read ? l : { ...l, read: true }) : l)) });
/** HQ's banner key for a letter: closed with ×, it stays closed (State.dismissed). */
export const mailBannerKey = (l: Letter) => `mail:${l.id}`;
/** The newest unread letter HQ's banner shows, unless its banner was closed. */
export function mailBanner(s: State): Letter | null {
  const l = unreadMail(s)[0];
  return l && !(s.dismissed ?? []).includes(mailBannerKey(l)) ? l : null;
}
/** Days since a letter arrived, for the mailbox list. */
export const letterAge = (l: Letter, now = new Date()) => Math.max(0, Math.round((noon(dayKey(now)).getTime() - noon(l.day).getTime()) / DAY_MS));
