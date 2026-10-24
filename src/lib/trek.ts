// The virtual trek: watch steps walk the spider along a real route, past postcards from real places. Totals
// only: a day without steps just leaves the spider standing, nothing asks for a daily amount, and nothing
// runs in a row. The league's bots walk the same route at their own pace. Waypoints pay coins and the odd
// cosmetic, never XP. Places and distances are approximate.
import { withOwned } from './cosmetics';
import { addDays, dayKey } from './dates';
import type { Rival, State, Trek, TrekRoute } from './types';

export type Waypoint = { name: string; km: number; card: string };
export type Route = {
  id: TrekRoute;
  name: string;
  emoji: string;
  blurb: string;
  waypoints: Waypoint[]; // the first is the start (0 km), the last the finish
  coins: number; // per waypoint reached
  finishCoins: number;
  items: { at: number; id: string }[]; // cosmetics: waypoint index -> item (cosmetics.ts)
};

export const ROUTES: Record<TrekRoute, Route> = {
  tunnelbana: {
    id: 'tunnelbana',
    name: 'Tunnelbanan',
    emoji: '🚇',
    blurb: 'All three colours end to end: green from Hässelby strand to Hagsätra, red from Norsborg to Ropsten, blue from Akalla to Kungsträdgården. About 68 km.',
    coins: 10,
    finishCoins: 50,
    items: [{ at: 18, id: 'trek_ticket' }],
    waypoints: [
      { name: 'Hässelby strand', km: 0, card: "The green line's western end, by Mälaren. The spider buys no ticket. The spider walks." },
      { name: 'Vällingby', km: 3, card: 'Vällingby, built in the 1950s around one idea: work, home and centre within walking distance. Finally, someone who thinks like me.' },
      { name: 'Alvik', km: 9.5, card: 'Alvik. Trains, trams and a bridge, all of them faster than you. None of them are getting the postcard.' },
      { name: 'T-Centralen', km: 14, card: 'T-Centralen, where the blue-line platforms are painted with blue vines on white. Underground, someone decided on a garden.' },
      { name: 'Slussen', km: 15.5, card: 'Slussen, rebuilt for most of a decade. Detours everywhere. The spider took all of them.' },
      { name: 'Globen', km: 18.5, card: 'Globen: a giant white ball you can see from half of Söderort. You are closer to it than any of them.' },
      { name: 'Högdalen', km: 23.5, card: 'Högdalen. Quiet, green, unremarkable. I have filed it under "rest stop".' },
      { name: 'Hagsätra', km: 27.5, card: 'End of the green line. Change to the red one. On foot, naturally.' },
      { name: 'Norsborg', km: 28, card: "The red line's southern end. Nobody walks here from Hagsätra. You just did. Sort of." },
      { name: 'Fittja', km: 31.5, card: 'Fittja. A long way from the centre, and every metre of it walked. I am noting that down.' },
      { name: 'Liljeholmen', km: 42.5, card: 'Liljeholmen, where the red line meets the tram. A crossroads. Choose the path with more steps.' },
      { name: 'Gamla stan', km: 45, card: 'Gamla stan: the platform looks out over water, right through the window. Most stations show you a wall.' },
      { name: 'Östermalmstorg', km: 47.5, card: 'Östermalmstorg, with its walls of art cut into concrete. Read them on your way past. Slowly.' },
      { name: 'Ropsten', km: 52, card: "Ropsten, the red line's end, by the bridge to Lidingö. The blue line next. Yes, all of it." },
      { name: 'Akalla', km: 53, card: "The blue line's northern end. Two lines down, one to go." },
      { name: 'Kista', km: 55, card: "Kista, Stockholm's tech district. Somewhere in there a server is judging you less than I do." },
      { name: 'Solna centrum', km: 60, card: 'Solna centrum: a red sky and a green forest painted on the cave walls. Thousands ride past it daily. You walked to it.' },
      { name: 'Rådhuset', km: 66.5, card: 'Rådhuset: the station looks like a cave carved out of red rock. Very on-brand for a spider.' },
      { name: 'Kungsträdgården', km: 68, card: 'Kungsträdgården, the end of the blue line, with old Stockholm on display below ground. Every line, end to end. On foot.' },
    ],
  },
  sormland: {
    id: 'sormland',
    name: 'Sörmlandsleden',
    emoji: '🌲',
    blurb: 'About 1000 km of trail from a Stockholm subway station into Sörmland. A curated walk past places on or near the trail; distances are approximate.',
    coins: 25,
    finishCoins: 150,
    items: [
      { at: 9, id: 'trek_map' },
      { at: 14, id: 'trek_pack' },
    ],
    waypoints: [
      { name: 'Björkhagen', km: 0, card: 'Sörmlandsleden starts here, at a subway station in a Stockholm suburb. Most epic journeys begin with a ticket barrier.' },
      { name: 'Hellasgården', km: 8, card: 'Hellasgården, in the Nacka reserve. People bathe in the lake here in January. On purpose.' },
      { name: 'Tyresta', km: 40, card: 'Tyresta national park: old-growth forest a commute from Sergels torg. Part of it burned in 1999. The forest kept going.' },
      { name: 'Paradiset', km: 75, card: "Paradiset nature reserve. Someone named a forest 'Paradise' and it has been living up to it ever since." },
      { name: 'Järna', km: 140, card: 'Järna. Farmland, lakes, and the first stretch where Stockholm feels properly behind you.' },
      { name: 'Trosa', km: 200, card: "Trosa calls itself the end of the world. It isn't. You have about 800 km left." },
      { name: 'Nyköping', km: 270, card: 'Nyköping castle, where a king invited his brothers to a feast in 1317 and they never left the tower. Choose your hosts with care.' },
      { name: 'Stendörren', km: 320, card: 'Stendörren: islands strung together with suspension bridges. They sway. That is the point.' },
      { name: 'Katrineholm', km: 430, card: 'Katrineholm grew up around the railway. You arrived on foot, which the town will find old-fashioned.' },
      { name: 'Malmköping', km: 520, card: 'Malmköping, a small town with its own museum tramway. Halfway, give or take. Have a map.' },
      { name: 'Eskilstuna', km: 600, card: 'Eskilstuna, the old steel town, once famous for forged tools. The spider respects a well-made thing.' },
      { name: 'Strängnäs', km: 700, card: 'Strängnäs and its brick cathedral above Mälaren. Old, quiet, unhurried. Take notes.' },
      { name: 'Mariefred', km: 780, card: 'Mariefred and Gripsholm castle, home of a great many portraits. None of them walked here.' },
      { name: 'Gnesta', km: 870, card: 'Gnesta. The last long forest stretch. Nothing happens here, which is exactly the appeal.' },
      { name: 'The 1000 km mark', km: 1000, card: 'About 1000 km. The trail goes on, but the spider stops here and expects a backpack.' },
    ],
  },
};

export const TREK_ORDER: TrekRoute[] = ['tunnelbana', 'sormland'];
export const DEFAULT_STEP_M = 0.75;
export const lengthOf = (r: Route) => r.waypoints[r.waypoints.length - 1].km;

/** A fresh trek on `route` from `day`, at 0 km: the `skip` steps already walked that day don't count (so switching routes can't replay them). */
export const newTrek = (route: TrekRoute, day = dayKey(), stepM = DEFAULT_STEP_M, skip = 0): Trek => ({ route, since: day, skip, stepM, reached: 0 });

/** Kilometres walked: every day's watch steps from the start day on (today's so far), at the trek's step length. */
export function trekKm(s: State, t: Trek, now = new Date()): number {
  const today = dayKey(now);
  let steps = 0;
  for (const [k, d] of Object.entries(s.days)) if (k >= t.since && k <= today) steps += d.steps ?? 0;
  return Math.min(lengthOf(ROUTES[t.route]), (Math.max(0, steps - (t.skip ?? 0)) * t.stepM) / 1000);
}

/** The last waypoint at or behind `km`. */
export const waypointAt = (r: Route, km: number) => r.waypoints.reduce((a, w, i) => (w.km <= km ? i : a), 0);

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** A bot's usual kilometres a day before its own power and the day's roll (about 7000 steps). */
export const BOT_KM_A_DAY = 5.2;

/** How far a league bot has walked since the trek began: its own pace, rolled per day by name, today's share by the hour. */
export function botKm(r: Pick<Rival, 'name' | 'power'>, t: Trek, now = new Date()): number {
  const today = dayKey(now);
  const share = Math.min(1, Math.max(0, (now.getHours() + now.getMinutes() / 60 - 7) / 16));
  let km = 0;
  for (let d = new Date(`${t.since}T12:00`); dayKey(d) <= today; d = addDays(d, 1)) {
    const key = dayKey(d);
    const roll = hash(`${r.name}:${key}:trek`) / 2 ** 32;
    km += BOT_KM_A_DAY * r.power * (0.55 + 0.9 * roll) * (key === today ? share : 1);
  }
  return Math.min(lengthOf(ROUTES[t.route]), km);
}

export type TrekRow = { name: string; emoji: string; km: number; me: boolean };

/** You and this week's league bots on the trek, furthest first. */
export function trekTable(s: State, t: Trek, now = new Date()): TrekRow[] {
  const rows: TrekRow[] = [
    { name: s.settings.userName || 'You', emoji: '🕷️', km: trekKm(s, t, now), me: true },
    ...(s.league?.rivals ?? []).map((r) => ({ name: r.name, emoji: r.emoji, km: botKm(r, t, now), me: false })),
  ];
  return rows.sort((a, b) => b.km - a.km || (a.me ? -1 : b.me ? 1 : 0));
}

export type TrekStatus = { route: Route; km: number; at: number; next: Waypoint | null; toNext: number; done: boolean; rank: number; of: number };

export function trekStatus(s: State, now = new Date()): TrekStatus | null {
  const t = s.trek;
  if (!t) return null;
  const route = ROUTES[t.route];
  const km = trekKm(s, t, now);
  const at = waypointAt(route, km);
  const next = route.waypoints[at + 1] ?? null;
  const table = trekTable(s, t, now);
  return { route, km, at, next, toNext: next ? next.km - km : 0, done: !next, rank: table.findIndex((r) => r.me) + 1, of: table.length };
}

/** Waypoints passed since the last check, with what they pay. Coins and cosmetics only. */
export function checkTrek(s: State, now = new Date()): { state: State; passed: Waypoint[]; coins: number; items: string[]; finished: boolean } {
  const t = s.trek;
  const none = { state: s, passed: [], coins: 0, items: [], finished: false };
  if (!t) return none;
  const route = ROUTES[t.route];
  const at = waypointAt(route, trekKm(s, t, now));
  if (at <= t.reached) return none;
  const passed = route.waypoints.slice(t.reached + 1, at + 1);
  const finished = at === route.waypoints.length - 1;
  const coins = passed.length * route.coins + (finished ? route.finishCoins : 0);
  const items = route.items.filter((x) => x.at > t.reached && x.at <= at).map((x) => x.id);
  let state: State = { ...s, trek: { ...t, reached: at }, coins: s.coins + coins, coinsEarned: s.coinsEarned + coins };
  for (const id of items) state = withOwned(state, id);
  if (finished) state = { ...state, treksDone: [...(state.treksDone ?? []), t.route] };
  return { state, passed, coins, items, finished };
}

/** One line for HQ's weekly summary, or null with no trek on. */
export function trekSummary(s: State, now = new Date()) {
  const st = trekStatus(s, now);
  if (!st) return null;
  const km = st.km < 100 ? st.km.toFixed(1) : String(Math.round(st.km));
  if (st.done) return `${st.route.emoji} ${st.route.name}: finished, ${Math.round(lengthOf(st.route))} km`;
  return `${st.route.emoji} ${st.route.name}: ${km} km · ${st.next?.name} in ${st.toNext < 10 ? st.toNext.toFixed(1) : Math.round(st.toNext)} km · ${ordinal(st.rank)} of ${st.of}`;
}

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
