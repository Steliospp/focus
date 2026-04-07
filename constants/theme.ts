export const Colors = {
  background: '#F5F0E8',
  primary: '#E8820C',
  primaryLight: '#F5A940',
  primaryLightest: '#FDE8C8',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  textMuted: '#AAAAAA',
  surface: '#FFFDF9',
  border: '#EDE8DF',
  danger: '#D94444',
  success: '#5CB85C',
  recording: '#FF3B30',
} as const;

export const Fonts = {
  serifItalic: 'PlayfairDisplay-Italic',
  serifBoldItalic: 'PlayfairDisplay-BoldItalic',
  sansRegular: 'DMSans-Regular',
  sansMedium: 'DMSans-Medium',
  sansLight: 'DMSans-Light',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radii = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#E8820C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLarge: {
    shadowColor: '#E8820C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
} as const;

export const RecordButton = {
  centerSize: 160,
  middleRingSize: 210,
  outerRingSize: 260,
} as const;
