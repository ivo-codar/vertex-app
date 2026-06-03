export const colors = {
  bg:       '#060D08',
  surface:  '#0C1610',
  card:     '#111D16',
  cardAlt:  '#172318',
  border:   '#1E3028',

  accent:    '#00E676',
  accentDim: 'rgba(0, 230, 118, 0.10)',

  blue:    '#448AFF',
  blueDim: 'rgba(68, 138, 255, 0.10)',

  teal:    '#1DE9B6',
  tealDim: 'rgba(29, 233, 182, 0.10)',

  cyan:    '#00E5FF',
  cyanDim: 'rgba(0, 229, 255, 0.10)',

  green:    '#69F0AE',
  greenDim: 'rgba(105, 240, 174, 0.10)',

  amber:    '#FFB300',
  amberDim: 'rgba(255, 179, 0, 0.12)',

  red: '#FF5252',

  text:     '#EDF7F0',
  textSub:  '#7A9E86',
  textMuted:'#3D6B50',
};

export const sp = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const r = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  full: 999,
};

/**
 * 3-level typography hierarchy — no uppercase, consistent sizing.
 *
 * h1   28px  800 — screen hero numbers / large display
 * h2   22px  700 — screen titles
 * h3   17px  600 — card / modal titles
 * body 15px  400 — primary content
 * small 13px 400 — secondary content
 * label 12px 600 — section headers (subtle, NOT uppercase)
 * caption 11px 500 — metadata, timestamps
 */
export const font = {
  h1: {
    fontSize: 28, fontWeight: '800' as const,
    color: colors.text, letterSpacing: -0.8,
  },
  h2: {
    fontSize: 22, fontWeight: '700' as const,
    color: colors.text, letterSpacing: -0.4,
  },
  h3: {
    fontSize: 17, fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 15, fontWeight: '400' as const,
    color: colors.text,
  },
  small: {
    fontSize: 13, fontWeight: '400' as const,
    color: colors.textSub,
  },
  label: {
    fontSize: 12, fontWeight: '600' as const,
    color: colors.textSub, letterSpacing: 0.2,
    // deliberately NO textTransform — uppercase reads as noise
  },
  caption: {
    fontSize: 11, fontWeight: '500' as const,
    color: colors.textMuted,
  },
};
