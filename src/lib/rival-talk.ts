// The league bots talk back: a rival who passes you gloats, one you pass sulks. At most two a day, and
// they keep quiet on low-mood, period and paused days. Their lines are about themselves and the race, never your body.
// A co-op week's partner (coop.ts) doesn't gloat or sulk: it's on your side that week.
import { partnerName } from './coop';
import { dayKey } from './dates';
import { nemesisOf, standings } from './league';
import { fillLine } from './lines';
import { gentleDay } from './tone';
import type { State } from './types';

export type RivalTalkState = { week: string; rank: number; day: string; n: number };
export const RIVAL_TALK_PER_DAY = 2;

/** passed: they just passed you. beaten: you just passed them. Only {name} (yours) is filled in. */
type Voice = { passed: string[]; beaten: string[] };

const VOICES: Record<string, Voice> = {
  'Gym Bro Gustav': {
    passed: ['Bröööh. That spot is mine now.', "Passed you on the warm-up set. Didn't even feel it."],
    beaten: ['Okay, okay. Respect. Rematch on leg day.', 'You passed me? I was resting between sets. Obviously.'],
  },
  'Couch Potato Carl': {
    passed: ['I passed you. From the couch. Think about that.', "Even I'm ahead of you now. Let that sink in."],
    beaten: ['Fair. I was in a very deep nap.', "Go on then. I'll catch up after this episode."],
  },
  'Hydro Hanna': {
    passed: ["Stay hydrated, {name}. I'll be up here.", 'Passed you on my sixth glass. Splash.'],
    beaten: ["Huh. You're thirstier than I thought.", "Fine. I'm going to need a bigger bottle."],
  },
  'Caffeine Kalle': {
    passed: ['Third espresso kicked in. Bye!', 'Zoom. That was me. Passing you. On caffeine.'],
    beaten: ['Wait, what? I need another coffee to process this.', 'You passed me while I was waiting for the kettle. Rude.'],
  },
  'Speedrun Sara': {
    passed: ['Any% league run. You were a skip.', 'Frame-perfect overtake. GG.'],
    beaten: ["Reset. I'm resetting. This run is dead.", 'Okay, that was a clean route. Respect.'],
  },
  'Lazy Lars': {
    passed: ["Didn't even try and I passed you. Concerning. For you.", 'Passed you. Going back to bed now.'],
    beaten: ['Cool. Wake me up when it matters.', "You win this one. I'll file a complaint later. Maybe."],
  },
  'Grindset Greta': {
    passed: ['5 AM club says hi. From above you.', 'While you rested, I grinded. Now look.'],
    beaten: ['This is a temporary setback in my growth journey.', 'Noted. Moving my morning routine to 4 AM.'],
  },
  'Noob Niklas': {
    passed: ["Wait, I'm ahead of someone? Screenshotting this.", 'Mom, get the camera! I passed {name}!'],
    beaten: ['Yeah, that tracks.', 'gg, I guess. What does XP stand for again?'],
  },
  'Doomscroll Dennis': {
    passed: ["Passed you between two reels. Didn't even look up.", 'Overtook you. Anyway, back to scrolling.'],
    beaten: ['Hold on, I saw a video about this.', "You passed me? I'll post about it. Later. After this one."],
  },
  'Zen Zara': {
    passed: ['I flow past you like water. Namaste.', "Breathe in. Breathe out. I'm ahead now."],
    beaten: ['I release my attachment to this rank.', "Your energy is strong today. I see it. I'm a little annoyed."],
  },
  'Protein Petra': {
    passed: ["Gains don't sleep. Neither does my rank.", 'Shake in one hand, your spot in the other.'],
    beaten: ["Recovery day. That's my story.", 'Okay, that hurt more than leg day.'],
  },
  'Night Owl Olle': {
    passed: ['Overtook you at 02:00. You were asleep. Amateur.', 'The night shift wins again.'],
    beaten: ['You passed me in daylight? Unfair conditions.', "Fine. I'll get you after midnight."],
  },
  'Spreadsheet Sven': {
    passed: ["According to my spreadsheet, I'm ahead by a statistically significant margin.", 'Cell B3: me. Cell B4: you. Formatted in red.'],
    beaten: ['This contradicts my projections. Recalculating.', "I'll need a pivot table to understand how that happened."],
  },
  'Snack Attack Stina': {
    passed: ['Passed you on my break. Mine was a good one.', 'Ha! Overtake of the day, sponsored by my desk drawer.'],
    beaten: ['Okay, you got me. I was in the kitchen.', 'Fine, you win. I was busy reorganizing my desk drawer.'],
  },
  'Marathon Maja': {
    passed: ["Kilometre 30 and I'm passing you. This is my pace.", 'Slow and steady? No. Fast and steady.'],
    beaten: ["It's a marathon, not a sprint. I'll get you back.", 'Pacing error. Mine. Noted.'],
  },
  'Procrastinating Pelle': {
    passed: ['I passed you. I was supposed to do that yesterday.', "Overtook you by accident. Don't tell anyone I tried."],
    beaten: ["I'll pass you back tomorrow. Or the day after.", "I'll deal with this later."],
  },
  'Meme Lord Max': {
    passed: ["Get rekt. I'm making this a meme.", "You've been passed. This is the way."],
    beaten: ['Bruh.', 'Task failed successfully.'],
  },
  'Early Bird Elin': {
    passed: ['Good morning! I already passed you. Coffee?', 'Up at 05:30 and ahead of you by 06:00.'],
    beaten: ['Wow, you were up early too? Respect.', "Okay. Tomorrow I'm setting the alarm for 05:00."],
  },
  'Tryhard Tove': {
    passed: ['Of course I passed you. I always pass you.', "I've been tracking your XP all week. Hi."],
    beaten: ["NO. That's not possible. Checking the logs.", 'This means war. Friendly war. But war.'],
  },
  'Chill Chris': {
    passed: ['Oh hey, passed you. No stress though.', "Didn't mean to pass you, just vibing."],
    beaten: ['All good, all good. You earned it.', "Nice one. I'm gonna go grab a coffee."],
  },
};

const GENERIC: Voice = {
  passed: ['See you at the top. Well, I will.', 'Passed you. Try to keep up.'],
  beaten: ['That was a fluke. Rematch tomorrow.', 'Enjoy it while it lasts.'],
};

export const voiceOf = (rival: string) => VOICES[rival] ?? GENERIC;
export const allRivalLines = () => [...Object.values(VOICES), GENERIC].flatMap((v) => [...v.passed, ...v.beaten]);

/**
 * Compares your league rank with the last one seen. Null when nothing changed; otherwise the rank to
 * remember and, within today's allowance, the rival's remark. The first look at a new week only remembers.
 */
export function rivalTalk(s: State, now = new Date(), roll = Math.random): { talk: RivalTalkState; line: { text: string; tone: 'good' | 'info' } | null } | null {
  const l = s.league;
  if (!l) return null;
  const table = standings(s, now);
  const rank = table.findIndex((r) => r.me) + 1;
  const day = dayKey(now);
  const prev = s.rivalTalk;
  if (!prev || prev.week !== l.week) return { talk: { week: l.week, rank, day, n: 0 }, line: null };
  if (prev.rank === rank) return null;
  const n = prev.day === day ? prev.n : 0;
  const talk = { week: l.week, rank, day, n };
  const quiet = gentleDay(s, day);
  if (quiet || n >= RIVAL_TALK_PER_DAY) return { talk, line: null };
  const climbed = rank < prev.rank;
  const other = table[climbed ? rank : rank - 2]; // just below you (you passed them) or just above you (they passed you)
  if (!other || other.me || other.name === partnerName(s, now)) return { talk, line: null };
  const pool = climbed ? voiceOf(other.name).beaten : voiceOf(other.name).passed;
  const quote = fillLine(pool[Math.floor(roll() * pool.length) % pool.length], { name: s.settings.userName || 'boss' });
  const tag = nemesisOf(s)?.id === other.id ? ' (your nemesis)' : '';
  return { talk: { ...talk, n: n + 1 }, line: { text: `${other.emoji} ${other.name}${tag}: "${quote}"`, tone: climbed ? 'good' : 'info' } };
}
