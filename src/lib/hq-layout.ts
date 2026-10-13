// HQ's cards in the owner's chosen order, some hidden. The pinned banners on top (the spider's bubble,
// health alerts, low-battery mode, Wrapped, the season) aren't listed: they can't be moved or hidden.

export type HqLayout = { order: string[]; hidden: string[] };

/**
 * Every movable HQ section, in its default order. NEW HQ CARD: add an entry here where it should sit by
 * default, then its renderer in SECTIONS in src/app/(tabs)/index.tsx (the compiler insists on both).
 * Saved layouts pick new entries up on their own (hqOrder).
 */
export const HQ_SECTIONS = [
  { id: 'weather', label: 'Weather' },
  { id: 'countdowns', label: 'Countdowns' },
  { id: 'sleep', label: 'Sleep & energy check-in' },
  { id: 'winddown', label: 'Wind-down (evenings)' },
  { id: 'level', label: 'Level & day score' },
  { id: 'shortcuts', label: 'Shortcut buttons' },
  { id: 'league', label: 'League' },
  { id: 'contract', label: 'Weekly contract' },
  { id: 'insight', label: 'Insight of the day' },
  { id: 'quests', label: 'Quests & boss' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'buttons', label: 'Water & gaming buttons' },
  { id: 'upnext', label: 'Up next' },
  { id: 'achievements', label: 'Achievements' },
] as const;

export type HqSectionId = (typeof HQ_SECTIONS)[number]['id'];

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

/** Sections to draw, in order. */
export const hqVisible = (layout?: HqLayout | null) => hqOrder(layout).filter((id) => !(layout?.hidden ?? []).includes(id));

/** Moves a section one step up (-1) or down (+1). */
export function moveSection(layout: HqLayout | null | undefined, id: HqSectionId, dir: -1 | 1): HqLayout {
  const order = hqOrder(layout);
  const i = order.indexOf(id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < order.length) [order[i], order[j]] = [order[j], order[i]];
  return { order, hidden: layout?.hidden ?? [] };
}

export function toggleSection(layout: HqLayout | null | undefined, id: HqSectionId): HqLayout {
  const hidden = layout?.hidden ?? [];
  return { order: hqOrder(layout), hidden: hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id] };
}
