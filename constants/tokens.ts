export type ThemeTokens = {
  bg: string;
  bgSoft: string;
  surface: string;
  surface2: string;
  fg: string;
  muted: string;
  mutedStrong: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  accent: string;
  warning: string;
  orange: string;
};

export const ayracTokens: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    bg:           '#f9f7f5',
    bgSoft:       '#f5f2f0',
    surface:      '#ffffff',
    surface2:     '#f1edea',
    fg:           '#151b28',
    muted:        '#656d81',
    mutedStrong:  '#9ba1b0',
    border:       '#e5e0dc',
    borderStrong: '#d4ccc4',
    primary:      '#3c67f6',
    primaryDeep:  '#243d8f',
    primarySoft:  '#ebf0fe',
    accent:       '#1ca070',
    warning:      '#f5a124',
    orange:       '#d85e31',
  },
  dark: {
    bg:           '#000000',
    bgSoft:       '#080808',
    surface:      '#0e0e0e',
    surface2:     '#151515',
    fg:           '#F5F0E8',
    muted:        'rgba(245,240,232,0.45)',
    mutedStrong:  'rgba(245,240,232,0.18)',
    border:       '#1c1c1c',
    borderStrong: '#262626',
    primary:      '#F5F0E8',
    primaryDeep:  '#b0a898',
    primarySoft:  'rgba(245,240,232,0.07)',
    accent:       '#4ecb91',
    warning:      '#f5a124',
    orange:       '#d85e31',
  },
};

export const BOOK_COLORS = [
  '#7c3aed', '#1d9e75', '#d85a30', '#3b82f6',
  '#ec4899', '#f5a623', '#06b6d4', '#8b5a3c',
];

export const fonts = {
  serif: 'Fraunces_700Bold',
  serifMedium: 'Fraunces_600SemiBold',
  serifRegular: 'Fraunces_400Regular',
} as const;
