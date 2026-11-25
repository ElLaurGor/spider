// step 10 ux: Settings' sections, in the order they sit on the screen. The chip row on top jumps to them, and
// `/settings?section=<id>` (settingsLink) lands on one, so a link from HQ, a card or a notification opens the
// card it's about instead of the top of a long scroll. Pure: notifications.ts and logic-test import it.

export const SETTINGS_SECTIONS = [
  { id: 'me', label: 'Me' }, // personality, themes, sick or away
  { id: 'hq', label: 'HQ' }, // the HQ layout
  { id: 'goals', label: 'Goals' }, // daily goals, schedule
  { id: 'pings', label: 'Pings' }, // notifications
  { id: 'care', label: 'Care' }, // the care corner
  { id: 'places', label: 'Places' }, // weather, outside, SL, this weekend
  { id: 'sweden', label: 'Sweden' }, // the Swedish calendar
  { id: 'devices', label: 'Devices' }, // calendars, phone screen time, the watch
  { id: 'data', label: 'Data' }, // backup & restore, about
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['id'];

/** The section a `?section=` param names, or null for anything else (an old link, a typo). */
export const settingsSectionOf = (param: unknown): SettingsSection | null =>
  SETTINGS_SECTIONS.find((x) => x.id === param)?.id ?? null;

/** The route that opens Settings at a section. */
export const settingsLink = (section: SettingsSection) => `/settings?section=${section}` as const;

/**
 * The section on screen while scrolled to `y` (the scroll offset plus what the sticky chip row covers): the
 * last one whose top is above it. `tops` are the sections' measured tops; unmeasured ones are skipped.
 */
export function sectionAt(tops: Partial<Record<SettingsSection, number>>, y: number): SettingsSection {
  let at: SettingsSection = SETTINGS_SECTIONS[0].id;
  for (const s of SETTINGS_SECTIONS) {
    const top = tops[s.id];
    if (top != null && top <= y) at = s.id;
  }
  return at;
}
