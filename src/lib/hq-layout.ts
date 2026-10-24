// HQ's cards in the owner's chosen order, some hidden. The pinned banners on top (the spider's bubble,
// health alerts, low-battery mode, Wrapped, the season) aren't listed: they can't be moved or hidden.

export type HqLayout = { order: string[]; hidden: string[] };

/**
 * Every movable HQ section, in its default order. NEW HQ CARD: add an entry here where it should sit by
 * default, then its renderer in SECTIONS in src/app/(tabs)/index.tsx (the compiler insists on both).
 * Saved layouts pick new entries up on their own (hqOrder).
 */
export const HQ_SECTIONS = [
  { id: 'care', label: 'Check-ins: name a low mood, rough-patch check (rare)' },
  { id: 'weather', label: 'Weather' },
  { id: 'commute', label: 'SL departures (once a stop is set)' },
  { id: 'sleep', label: 'Sleep & energy check-in' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'buttons', label: 'Water & gaming buttons' },
  { id: 'top3', label: "Today's top 3" },
  { id: 'winddown', label: 'Wind-down (evenings)' },
  { id: 'debrief', label: 'Evening debrief (evenings)' },
  { id: 'level', label: 'Level & day score' },
  { id: 'week', label: 'This week: boss, league and co-op, Silk Track, medals, trek, contract' },
  { id: 'quests', label: 'Daily quests (and the boss, if This week is off)' },
  { id: 'league', label: 'League (full card)' },
  { id: 'silk', label: 'Silk Track (full card)' },
  { id: 'medals', label: 'Weekly medals (full card)' },
  { id: 'trek', label: 'Virtual trek (full card, with watch steps)' },
  { id: 'contract', label: 'Weekly contract (full card)' },
  { id: 'countdowns', label: 'Countdowns' },
  { id: 'swedishDays', label: 'Red days & payday' },
  { id: 'upnext', label: 'Up next' },
  { id: 'progress', label: 'Ability points & rested bonus' },
  { id: 'shortcuts', label: 'Shortcut buttons' },
  { id: 'experiment', label: 'Running experiment' },
  { id: 'insight', label: 'Insight of the day' },
  { id: 'wild', label: 'Flies, diary & web' },
  { id: 'achievements', label: 'Achievements' },
] as const;

export type HqSectionId = (typeof HQ_SECTIONS)[number]['id'];

/** The full weekly cards: the This week card sums them up, so they start hidden (Settings brings any of them back). */
export const WEEK_PARTS: readonly HqSectionId[] = ['league', 'silk', 'medals', 'trek', 'contract'];
const DEFAULT_HIDDEN: readonly HqSectionId[] = WEEK_PARTS;

const IDS: readonly HqSectionId[] = HQ_SECTIONS.map((x) => x.id);
const known = (id: string): id is HqSectionId => (IDS as readonly string[]).includes(id);

export const hqLabel = (id: HqSectionId) => HQ_SECTIONS.find((x) => x.id === id)?.label ?? id;

/** The saved order with retired ids dropped and new ones slotted in after their default neighbour. */
export function hqOrder(layout?: HqLayout | null): HqSectionId[] {
  const out = [...new Set((layout?.order ?? []).filter(known))];
  IDS.forEach((id, i) => {
    if (out.includes(id)) return;
    const before = IDS.slice(0, i).reverse().find((x) => out.includes(x));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, id);
  });
  return out;
}

/** The hidden sections: the saved ones, or the default ones while nothing was saved. */
export const hqHidden = (layout?: HqLayout | null): string[] => layout?.hidden ?? [...DEFAULT_HIDDEN];

/** Sections to draw, in order. */
export const hqVisible = (layout?: HqLayout | null) => {
  const hidden = hqHidden(layout);
  return hqOrder(layout).filter((id) => !hidden.includes(id));
};

/** Moves a section one step up (-1) or down (+1). */
export function moveSection(layout: HqLayout | null | undefined, id: HqSectionId, dir: -1 | 1): HqLayout {
  const order = hqOrder(layout);
  const i = order.indexOf(id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < order.length) [order[i], order[j]] = [order[j], order[i]];
  return { order, hidden: hqHidden(layout) };
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
  const saved = [...new Set(layout.order.filter(known))].filter((id) => id !== 'week');
  const firstShown = saved.find((id) => WEEK_PARTS.includes(id) && !hidden.includes(id));
  const at = firstShown ? saved.indexOf(firstShown) : saved.indexOf('quests');
  const order = hqOrder({ order: at >= 0 ? [...saved.slice(0, at), 'week', ...saved.slice(at)] : saved, hidden });
  const replaced = [...WEEK_PARTS, 'quests'].every((id) => hidden.includes(id));
  return { order, hidden: [...new Set([...hidden.filter((id) => id !== 'week'), ...WEEK_PARTS, ...(replaced ? ['week'] : [])])] };
}
