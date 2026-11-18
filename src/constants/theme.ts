/**
 * FitPilot theme — near-black base, vivid green/lime brand, colourful accents.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1220',
    background: '#F3F7FB',
    backgroundElement: '#E4EEF5',
    backgroundSelected: '#CBE8F0',
    textSecondary: '#5B6B7C',
    primary: '#16A34A',
    accent: '#65A30D',
  },
  dark: {
    text: '#F0FDFA',
    background: '#070B14',
    backgroundElement: '#101826',
    backgroundSelected: '#16222F',
    textSecondary: '#94A3B8',
    primary: '#34D860',
    accent: '#A3E635',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
