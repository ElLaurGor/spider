import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// Shared by every theme.
const BASE = {
  text: '#F2F4F8',
  dim: '#8A93A6',
  faint: '#545C6E',
  cyan: '#3FD0FF',
  water: '#3FA9FF',
  green: '#33D17A',
  yellow: '#FFC53D',
  purple: '#9B6BFF',
};

// `red` is each theme's main accent and `blue` its second one (names kept from the original palette).
export const THEMES = {
  classic: {
    name: 'Classic Web',
    level: 1,
    colors: { bg: '#07090F', card: '#10141F', card2: '#171D2B', border: '#232B3D', red: '#E23636', redDim: '#3A1418', blue: '#2F7BFF', blueDim: '#0F2247' },
  },
  symbiote: {
    name: 'Symbiote',
    level: 3,
    colors: { bg: '#030303', card: '#0D0D0F', card2: '#18181C', border: '#2A2A30', red: '#8E44FF', redDim: '#24133F', blue: '#9AA3B5', blueDim: '#24262C' },
  },
  arc: {
    name: 'Arc Reactor',
    level: 5,
    colors: { bg: '#040A12', card: '#0A1420', card2: '#10202F', border: '#1B3247', red: '#00A8CC', redDim: '#06303B', blue: '#5AE4FF', blueDim: '#0B3442' },
  },
  gold: {
    name: 'Gold Titan',
    level: 7,
    colors: { bg: '#0B0806', card: '#16100B', card2: '#211810', border: '#3A2A18', red: '#C8102E', redDim: '#3B0C14', blue: '#D4A017', blueDim: '#3A2C08' },
  },
  neon: {
    name: 'Neon Glitch',
    level: 9,
    colors: { bg: '#08040F', card: '#120A1E', card2: '#1B102C', border: '#2E1C47', red: '#FF2E88', redDim: '#3D0F26', blue: '#00E5FF', blueDim: '#06323A' },
  },
  // A trophy, not a level reward: beat the Couch King (quests.ts FINAL_BOSS). `level` is only for sorting.
  crown: {
    name: "Couch King's Crown",
    level: 999,
    unlock: 'syndicate',
    colors: { bg: '#0A0507', card: '#170B11', card2: '#22101A', border: '#3D1C2C', red: '#E0B43A', redDim: '#3D300C', blue: '#C2185B', blueDim: '#3D0A1F' },
  },
};
export type ThemeId = keyof typeof THEMES;

// Styles are created once when each screen's module loads, so the chosen theme is read
// synchronously here, before anything else, and switching themes restarts the app.
const themeFile = () => new File(Paths.document, 'theme.txt');

function savedTheme(): ThemeId {
  try {
    const f = themeFile();
    if (f.exists) {
      const id = f.textSync().trim();
      if (id in THEMES) return id as ThemeId;
    }
  } catch {
    // first run or unreadable: default theme
  }
  return 'classic';
}

export const THEME_ID: ThemeId = savedTheme();

export function saveTheme(id: ThemeId) {
  const f = themeFile();
  if (!f.exists) f.create();
  f.write(id);
}

/** S.P.I.D.E.R. HUD palette for the active theme — always dark. */
export const C = { ...BASE, ...THEMES[THEME_ID].colors };

export const RADIUS = 16;

export const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });
