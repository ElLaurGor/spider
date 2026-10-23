// Levels from total XP. On their own (xp.ts re-exports them) so the save's one-time fixes can use them
// without importing the achievements, which would make defaults.ts import itself in a circle.

/** Total XP needed to reach `level`: 0, 100, 300, 600, 1000, … */
export const xpForLevel = (level: number) => 50 * (level - 1) * level;

export function levelForXp(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}
