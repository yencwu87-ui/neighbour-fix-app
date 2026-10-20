import { useColorScheme } from 'react-native';

const light = {
  bg: '#f3f5f1', card: '#ffffff', ink: '#17221e', muted: '#5b6a64', line: '#d9e0db',
  accent: '#0f6f62', accentSoft: '#e1efeb', onAccent: '#ffffff', brass: '#9a6f12', brassSoft: '#f6ecd2',
  good: '#2f7d3b', warn: '#a8650c', crit: '#b23a2e',
};
const dark: typeof light = {
  bg: '#0f1513', card: '#17201d', ink: '#e7eeea', muted: '#9aa9a3', line: '#2a3632',
  accent: '#4cc0ad', accentSoft: '#16312c', onAccent: '#0f1513', brass: '#e1b24a', brassSoft: '#33290f',
  good: '#6fc27a', warn: '#e3a14a', crit: '#ef7a6d',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, pill: 999 };
