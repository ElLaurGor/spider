// HQ's cards in the owner's chosen order, some hidden. The pinned banners on top (the spider's bubble,
// health alerts, low-battery mode, Wrapped, the season) aren't listed: they can't be moved or hidden.

export type HqLayout = { order: string[]; hidden: string[] };

/**
 * Every movable HQ section, in its default order. NEW HQ CARD: add an entry here where it should sit by
 * default, then its renderer in SECTIONS in src/app/(tabs)/index.tsx (the compiler insists on both).
 * Saved layouts pick new entries up on their own (hqOrder). `when` marks a card that only shows sometimes,
 * so Settings' layout editor can say when.
 */
export const HQ_SECTIONS = [
  { id: 'care', label: 'Check-ins: name a low mood, one small step, the joy menu, rough-patch check', when: 'after a low check-in or on a rough patch' },
  { id: 'weather', label: 'Weather' },
  { id: 'commute', label: 'SL departures (once a stop is set)' },
  { id: 'weekend', label: 'This weekend in Stockholm (once event types are picked)', when: 'Thu–Sat' },
  { id: 'chapter', label: 'New chapter: birthday, payday, back from a break', when: 'on a fresh-start day' }, // step 8 game
  { id: 'horoscope', label: 'Spindelhoroskopet: the week ahead in the stars', when: 'Mondays' }, // step 10
  { id: 'review', label: 'War room: the Sunday review', when: 'Sundays, until sealed or closed' }, // step 9 admin
  { id: 'shelf', label: 'Due-back shelf: pickup codes, returns, library loans', when: 'while something is on it' }, // step 9 admin
  { id: 'sleep', label: 'Sleep & energy check-in', when: 'mornings, until it is filled in' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'buttons', label: 'Water, coffee & gaming buttons' },
  { id: 'worry', label: 'Worry parking: park it, the worry slot' }, // step 9 care
  { id: 'top3', label: "Today's top 3", when: 'after a debrief picked them' },
  { id: 'chores', label: 'Chores due', when: 'when one is due' }, // step 9 admin
  { id: 'evening', label: 'Evening: wind-down, debrief, shutdown', when: 'evenings' }, // step 10: wind-down + debrief + the shutdown in one card
  { id: 'level', label: 'Level & day score' },
  { id: 'lair', label: "Terrarium: the spider's home" },
  { id: 'week', label: 'This week: boss, league and co-op, Silk Track, medals, trek, contract' },
  { id: 'quests', label: 'Daily quests (and the boss, if This week is off)' },
  { id: 'league', label: 'League (full card)' },
  { id: 'silk', label: 'Silk Track (full card)' },
  { id: 'medals', label: 'Weekly medals (full card)', when: 'once a medal is in reach this week' },
  { id: 'trek', label: 'Virtual trek (full card, with watch steps)' },
  { id: 'contract', label: 'Weekly contract (full card)' },
  { id: 'countdowns', label: 'Countdowns', when: 'while one is running' },
  { id: 'swedishDays', label: 'Red days, name days & payday' },
  { id: 'sweden', label: 'Swedish calendar: people days, Hesa Fredrik, tax return, preparedness week', when: 'when one is coming up' }, // step 8 sweden
  { id: 'upnext', label: 'Up next' },
  { id: 'progress', label: 'Ability points & rested bonus', when: 'when there is something to spend' },
  { id: 'shortcuts', label: 'Shortcut buttons' },
  { id: 'experiment', label: 'Running experiment', when: 'while one runs' },
  { id: 'insight', label: 'Insight of the day', when: 'when the data has one' },
  { id: 'wild', label: 'Flies, diary & web' },
] as const;

export type HqSectionId = (typeof HQ_SECTIONS)[number]['id'];

/** The full weekly cards: the This week card sums them up, so they start hidden (Settings brings any of them back). */
export const WEEK_PARTS: readonly HqSectionId[] = ['league', 'silk', 'medals', 'trek', 'contract'];
const DEFAULT_HIDDEN: readonly HqSectionId[] = WEEK_PARTS;

const IDS: readonly HqSectionId[] = HQ_SECTIONS.map((x) => x.id);
const known = (id: string): id is HqSectionId => (IDS as readonly string[]).includes(id);

/**
 * Retired cards that live on inside another one (step 10: the wind-down and debrief cards became Evening). A
 * saved layout keeps working: the first of them in its order gives the new card its place, and the new card
 * starts hidden only if all of them were. Other retired ids (`achievements`, which moved to Records) just drop out.
 */
const MERGED: Partial<Record<HqSectionId, readonly string[]>> = { evening: ['winddown', 'debrief'] };
const mergedInto = (id: string) => (Object.keys(MERGED) as HqSectionId[]).find((to) => MERGED[to]?.includes(id)) ?? id;

export const hqLabel = (id: HqSectionId) => HQ_SECTIONS.find((x) => x.id === id)?.label ?? id;
/** When a card that only shows sometimes shows (evenings, Thu–Sat, …); undefined for the ones that always do. */
export const hqWhen = (id: HqSectionId): string | undefined => {
  const x = HQ_SECTIONS.find((y) => y.id === id);
  return x && 'when' in x ? x.when : undefined;
};

/** The saved order with retired ids dropped (merged ones renamed) and new ones slotted in after their default neighbour. */
export function hqOrder(layout?: HqLayout | null): HqSectionId[] {
  const out = [...new Set((layout?.order ?? []).map(mergedInto).filter(known))];
  IDS.forEach((id, i) => {
    if (out.includes(id)) return;
    const before = IDS.slice(0, i).reverse().find((x) => out.includes(x));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, id);
  });
  return out;
}

/** The hidden sections: the saved ones (merged ones as their new card), or the default ones while nothing was saved. */
export function hqHidden(layout?: HqLayout | null): string[] {
  if (!layout?.hidden) return [...DEFAULT_HIDDEN];
  const saved = layout.hidden;
  const out = saved.filter((id) => mergedInto(id) === id);
  for (const to of Object.keys(MERGED) as HqSectionId[]) {
    const from = MERGED[to] ?? [];
    if (!out.includes(to) && from.length > 0 && from.every((id) => saved.includes(id))) out.push(to);
  }
  return out;
}

/** Sections to draw, in order. */
export const hqVisible = (layout?: HqLayout | null) => {
  const hidden = hqHidden(layout);
  return hqOrder(layout).filter((id) => !hidden.includes(id));
};

/**
 * Moves a section one step up (-1) or down (+1) past the next card of its own kind (shown or hidden), so a
 * move in Settings' Shown list always passes a card that's on screen.
 */
export function moveSection(layout: HqLayout | null | undefined, id: HqSectionId, dir: -1 | 1): HqLayout {
  const order = hqOrder(layout);
  const hidden = hqHidden(layout);
  const isHidden = (x: string) => hidden.includes(x);
  const i = order.indexOf(id);
  let j = i + dir;
  while (i >= 0 && j >= 0 && j < order.length && isHidden(order[j]) !== isHidden(id)) j += dir;
  if (i >= 0 && j >= 0 && j < order.length) {
    order.splice(i, 1);
    order.splice(j, 0, id);
  }
  return { order, hidden };
}

/** A long-press on an arrow: straight to the top or the bottom of the list. */
export function moveSectionTo(layout: HqLayout | null | undefined, id: HqSectionId, end: 'top' | 'bottom'): HqLayout {
  const order = hqOrder(layout).filter((x) => x !== id);
  return { order: end === 'top' ? [id, ...order] : [...order, id], hidden: hqHidden(layout) };
}

export function toggleSection(layout: HqLayout | null | undefined, id: HqSectionId): HqLayout {
  const hidden = hqHidden(layout);
  return { order: hqOrder(layout), hidden: hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id] };
}

/**
 * One-time move of a saved layout to the This week card (fixes.ts): it takes the place of the first weekly card
 * that was showing (else it sits just above the quests), and those cards are hidden but stay in the list. It's
 * hidden itself only if every card it replaces was hidden, the quests (and so the boss) included.
 */
export function withWeekCard(layout: HqLayout): HqLayout {
  const hidden = hqHidden(layout);
  const saved = [...new Set(layout.order.map(mergedInto).filter(known))].filter((id) => id !== 'week');
  const firstShown = saved.find((id) => WEEK_PARTS.includes(id) && !hidden.includes(id));
  const at = firstShown ? saved.indexOf(firstShown) : saved.indexOf('quests');
  const order = hqOrder({ order: at >= 0 ? [...saved.slice(0, at), 'week', ...saved.slice(at)] : saved, hidden });
  // Only the cards that layout already had: one added since (the trek) can't have been hidden in it yet.
  const knew = [...WEEK_PARTS, 'quests'].filter((id) => (saved as string[]).includes(id));
  const replaced = knew.length > 0 && knew.every((id) => hidden.includes(id));
  return { order, hidden: [...new Set([...hidden.filter((id) => id !== 'week'), ...WEEK_PARTS, ...(replaced ? ['week'] : [])])] };
}
