// Spotter "Arena" theme: one source for colors and fonts (see docs/design-system.md).
// Font family names match the files in assets/fonts/ (Vega requires that).

export const color = {
  ground: '#0A0B10',
  surface: '#14161F',
  raised: '#1E2130',
  line: '#2A2E40',
  text: '#F4F5F7',
  textSecondary: '#A3A8B8',
  textIdle: '#CFD3DC',
  accent: '#C8FF3D', // volt: energy, focus, progress
  accentSurface: '#1A2410', // focused / positive fills under volt borders
  cue: '#FFB547', // amber: only the coach talking to you
  cueSurface: '#1F1A0E',
  onCue: '#1A1206',
  qrDark: '#0A0B10',
  qrLight: '#FFFFFF',
} as const;

export const font = {
  display: 'ArchivoCondensed-Black',
  displayBold: 'ArchivoCondensed-ExtraBold',
  body: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodyBold: 'DMSans-Bold',
} as const;
