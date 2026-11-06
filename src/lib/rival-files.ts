// Rival files (step 8 days): tap a rival in the league table for their file. Weeks you finished above or below
// them, the weeks they were your nemesis, banana peels thrown at them and co-op weeks together. Keyed by their
// roster name (league.ts rosterName), since rivals can be renamed. Each league week saves its finishing order
// when it settles (finishOf, in checkLeague), so the file fills in from then on; older weeks show what's known
// (the nemesis log). Pure, so logic-test can check it.
import { addDays } from './dates';
import { nemesisOf, peelsOn, rosterName, standings } from './league';
import type { FinishRow, LeagueWeek, State } from './types';

/**
 * What a settling league week saves for the rival files (s.league is the week being settled): every rival's finish
 * under their roster name with the peels they took, the nemesis and the co-op partner, by roster name.
 */
export function finishOf(s: State): Pick<LeagueWeek, 'table' | 'nemesis' | 'coop'> {
  const l = s.league;
  if (!l) return {};
  const end = addDays(new Date(`${l.week}T23:59`), 6);
  const table: FinishRow[] = standings(s, end)
    .filter((r) => !r.me)
    .map((r) => {
      const peels = peelsOn(l, r.id);
      return { base: r.base ?? r.name, name: r.name, emoji: r.emoji, xp: r.xp, ...(peels ? { peels } : {}) };
    });
  const nem = nemesisOf(s);
  const partner = s.coop?.week === l.week ? l.rivals.find((r) => r.name === s.coop?.partner.name) : undefined;
  return { table, ...(nem ? { nemesis: rosterName(nem) } : {}), ...(partner ? { coop: rosterName(partner) } : {}) };
}

export type RivalWeek = {
  week: string;
  /** Your XP and theirs that week; `above`: you finished ahead (a tie goes to you, as in the table). Null when not saved. */
  mine: number | null;
  theirs: number | null;
  above: boolean | null;
  nemesis: boolean;
  beaten: boolean | null;
  peels: number;
  coop: boolean;
};

/** Every name a rival has gone by: the roster name, the one the owner gave them, and those in saved weeks. */
function namesOf(s: State, base: string) {
  const names = new Set<string>([base]);
  const given = s.rivalNames?.[base];
  if (given) names.add(given);
  for (const r of s.league?.rivals ?? []) if (rosterName(r) === base) names.add(r.name);
  for (const h of s.league?.history ?? []) for (const r of h.table ?? []) if (r.base === base) names.add(r.name);
  return names;
}

/** A rival's file: their weeks against you (newest first), the totals and this week's race so far. */
export function rivalFile(s: State, base: string, now = new Date()) {
  const names = namesOf(s, base);
  const l = s.league;
  const log = s.nemesisLog ?? {};
  const weeks: RivalWeek[] = [];
  const seen = new Set<string>();
  for (const h of l?.history ?? []) {
    seen.add(h.week);
    const row = h.table?.find((r) => r.base === base);
    const logged = log[h.week];
    const nemesis = h.nemesis != null ? h.nemesis === base : !!logged && names.has(logged.name);
    const coop = h.coop === base;
    if (!row && !nemesis && !coop) continue;
    weeks.push({
      week: h.week,
      mine: row ? h.xp : null,
      theirs: row?.xp ?? null,
      above: row ? h.xp >= row.xp : null,
      nemesis,
      beaten: nemesis ? (logged?.beaten ?? null) : null,
      peels: row?.peels ?? 0,
      coop,
    });
  }
  // The nemesis log goes back further than the league history (60 weeks against 26).
  for (const [week, n] of Object.entries(log)) {
    if (seen.has(week) || !names.has(n.name)) continue;
    weeks.push({ week, mine: null, theirs: null, above: null, nemesis: true, beaten: n.beaten, peels: 0, coop: false });
  }
  // The last co-op week on record, when its league week wasn't saved with a partner.
  const c = s.coop;
  if (c && c.week !== l?.week && names.has(c.partner.name)) {
    const w = weeks.find((x) => x.week === c.week);
    if (w) w.coop = true;
    else if (!seen.has(c.week)) weeks.push({ week: c.week, mine: null, theirs: null, above: null, nemesis: false, beaten: null, peels: 0, coop: true });
  }
  weeks.sort((a, b) => b.week.localeCompare(a.week));

  const live = l?.rivals.find((r) => rosterName(r) === base) ?? null;
  const table = live ? standings(s, now) : [];
  const myRow = table.find((r) => r.me);
  const theirRow = live ? table.find((r) => r.id === live.id) : undefined;
  const thisWeek =
    live && l && myRow && theirRow
      ? { mine: myRow.xp, theirs: theirRow.xp, peels: peelsOn(l, live.id), nemesis: nemesisOf(s)?.id === live.id, coop: s.coop?.week === l.week && s.coop.partner.name === live.name }
      : null;

  const rows = l?.history.flatMap((h) => h.table ?? []).filter((r) => r.base === base) ?? [];
  const latest = rows.at(-1);
  const emoji = live?.emoji ?? latest?.emoji ?? Object.values(log).find((n) => names.has(n.name))?.emoji ?? '🤖';
  const name = live?.name ?? s.rivalNames?.[base] ?? latest?.name ?? base;
  const met = weeks.filter((w) => w.above != null);
  return {
    base,
    name,
    emoji,
    renamed: name !== base,
    weeks,
    thisWeek,
    above: met.filter((w) => w.above).length,
    below: met.filter((w) => w.above === false).length,
    nemesis: weeks.filter((w) => w.nemesis).length + (thisWeek?.nemesis ? 1 : 0),
    nemesisBeaten: weeks.filter((w) => w.nemesis && w.beaten).length,
    peels: weeks.reduce((a, w) => a + w.peels, 0) + (thisWeek?.peels ?? 0),
    coop: weeks.filter((w) => w.coop).length + (thisWeek?.coop ? 1 : 0),
  };
}

/** Rivals with a file: this week's league and everyone in the saved weeks, by roster name, most weeks met first. */
export function knownRivals(s: State): { base: string; name: string; emoji: string; weeks: number }[] {
  const out = new Map<string, { base: string; name: string; emoji: string; weeks: number }>();
  for (const h of s.league?.history ?? []) {
    for (const r of h.table ?? []) {
      const was = out.get(r.base);
      out.set(r.base, { base: r.base, name: r.name, emoji: r.emoji, weeks: (was?.weeks ?? 0) + 1 });
    }
  }
  for (const r of s.league?.rivals ?? []) {
    const base = rosterName(r);
    out.set(base, { base, name: r.name, emoji: r.emoji, weeks: out.get(base)?.weeks ?? 0 });
  }
  return [...out.values()].sort((a, b) => b.weeks - a.weeks || a.name.localeCompare(b.name));
}
