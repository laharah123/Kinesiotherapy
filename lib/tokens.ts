// Design tokens — warm earth palette, calm/gentle
// All colours expressed as rgba strings for React Native compatibility.

export const COLORS = {
  // Surfaces — subtly warm, low chroma
  bg:         'rgba(248,244,239,1)',   // soft cream
  bgAlt:      'rgba(239,232,223,1)',   // dimmer cream
  surface:    'rgba(252,250,248,1)',   // near-white warm
  surface2:   'rgba(234,227,216,1)',   // card alt
  border:     'rgba(220,210,196,1)',   // hairline
  borderSoft: 'rgba(230,222,210,1)',

  // Text
  ink:  'rgba(48,38,28,1)',    // deep warm charcoal
  ink2: 'rgba(90,76,60,1)',    // body
  ink3: 'rgba(140,122,100,1)', // muted
  ink4: 'rgba(190,175,155,1)', // very muted

  // Brand — warm clay / terracotta
  clay:      'rgba(180,110,72,1)',
  clayDeep:  'rgba(140,80,48,1)',
  claySoft:  'rgba(240,224,212,1)',
  claySoft2: 'rgba(220,196,172,1)',

  // Sage — calming secondary
  sage:     'rgba(120,160,110,1)',
  sageDeep: 'rgba(72,110,78,1)',
  sageSoft: 'rgba(228,240,224,1)',

  // Ochre — accent for energy / streaks
  ochre:     'rgba(210,180,80,1)',
  ochreSoft: 'rgba(244,238,212,1)',

  // Dark session background
  sessionBg: 'rgba(38,32,26,1)',

  // Pain scale — sequential green → red-clay
  pain0: 'rgba(152,205,140,1)',
  pain1: 'rgba(200,220,110,1)',
  pain2: 'rgba(220,200,80,1)',
  pain3: 'rgba(215,150,72,1)',
  pain4: 'rgba(195,90,60,1)',
} as const;

export const RADII = {
  r1: 10,
  r2: 16,
  r3: 22,
  r4: 32,
} as const;

// React Native shadow objects (iOS elevation + Android elevation)
export const SHADOWS = {
  card: {
    shadowColor: 'rgba(60,40,20,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHi: {
    shadowColor: 'rgba(60,40,20,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// Font family names, loaded via expo-font in app/_layout.tsx.
// Only these families are registered, so nothing else may be referenced here.
export const FONTS = {
  serif:      'InstrumentSerif',
  serifItalic: 'InstrumentSerif-Italic',
  sans:       'Inter',
  sansMedium: 'Inter-Medium',
  sansSemi:   'Inter-SemiBold',
  sansBold:   'Inter-Bold',
} as const;

export type FontWeightToken = '400' | '500' | '600' | '700';

/**
 * Android ignores `fontWeight` when a custom `fontFamily` is set, so weight has
 * to be expressed by picking the right loaded family. Always style text with
 * `fontFamily: fontFor('600')` rather than `fontFamily: FONTS.sans` plus
 * `fontWeight: '600'`.
 */
export function fontFor(weight: FontWeightToken): string {
  switch (weight) {
    case '500': return FONTS.sansMedium;
    case '600': return FONTS.sansSemi;
    case '700': return FONTS.sansBold;
    default:    return FONTS.sans;
  }
}

// Type scale. Weight lives in the family name, never in `fontWeight`.
export const TYPE = {
  h1:      { fontFamily: FONTS.serif,  fontSize: 36, lineHeight: 42 },
  h2:      { fontFamily: FONTS.serif,  fontSize: 26, lineHeight: 32 },
  h3:      { fontFamily: FONTS.serif,  fontSize: 22, lineHeight: 28 },
  counter: { fontFamily: FONTS.serif,  fontSize: 92, lineHeight: 92 },
  body:    { fontFamily: FONTS.sans,   fontSize: 14, lineHeight: 22 },
  bodyLg:  { fontFamily: FONTS.sans,   fontSize: 15.5, lineHeight: 24 },
  bodyStrong: { fontFamily: FONTS.sansSemi, fontSize: 14, lineHeight: 22 },
  muted:   { fontFamily: FONTS.sans,   fontSize: 12.5, lineHeight: 18 },
  caption: { fontFamily: FONTS.sans,   fontSize: 11, lineHeight: 16 },
  label:   { fontFamily: FONTS.sansMedium, fontSize: 12, lineHeight: 16 },
  mono:    { fontFamily: FONTS.sans,   fontSize: 12 },
  eyebrow: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;

// Subscription pricing
export const PRICING = {
  monthly: { label: 'Monthly', price: '$12.99', cycle: 'per month', sub: 'Flexible · cancel any time', productId: 'com.kinesiotherapy.monthly' },
  yearly:  { label: 'Yearly',  price: '$100',   cycle: 'per year',  sub: 'Just $8.33 / month', badge: 'Save 36%', productId: 'com.kinesiotherapy.yearly' },
  trialDays: 7,
} as const;

// Combined token object (convenience re-export)
export const T = {
  ...COLORS,
  ...RADII,
  shadows: SHADOWS,
  fonts: FONTS,
  fontFor,
  type: TYPE,
  pricing: PRICING,
} as const;

export type ToneColor = 'clay' | 'sage' | 'ochre' | 'neutral';
export type GlyphKind = 'arc' | 'spine' | 'wrist' | 'neck' | 'leaf' | 'wave' | 'dots' | 'sun' | 'check' | 'flame' | 'circle';
export type IconName =
  | 'back' | 'close' | 'menu' | 'more' | 'search'
  | 'home' | 'plan' | 'progress' | 'profile'
  | 'play' | 'pause' | 'next' | 'check' | 'plus'
  | 'flame' | 'clock' | 'calendar' | 'bell' | 'chevron'
  | 'sparkle' | 'eye' | 'lock' | 'mail' | 'google' | 'apple'
  | 'arrowRight' | 'pencil' | 'heart' | 'shield' | 'bolt' | 'redo'
  | 'tap' | 'hand' | 'volume' | 'volumeOff' | 'info' | 'warning'
  | 'trash' | 'externalLink' | 'refresh';
