/**
 * VERTEX — Stark / Wayne Theme
 *
 * Batman: cold black, surgical precision, zero noise
 * Stark:  refined gold, arc-reactor blue, J.A.R.V.I.S. data readouts
 */

export const colors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  bg:       '#06060C',
  surface:  '#0A0A14',
  card:     '#10101D',
  cardAlt:  '#171728',
  cardDeep: '#090913',
  border:   '#2A2A42',   // visible edges without turning into outlines everywhere
  hairline: 'rgba(234, 234, 244, 0.06)',

  // ── Stark Gold ───────────────────────────────────────────────────────────────
  accent:    '#C8960C',
  accentDim: 'rgba(200, 150, 12, 0.14)',

  // ── Arc Reactor Blue ─────────────────────────────────────────────────────────
  blue:    '#00AEEF',
  blueDim: 'rgba(0, 174, 239, 0.13)',

  // ── J.A.R.V.I.S. Teal ────────────────────────────────────────────────────────
  teal:    '#00C9B1',
  tealDim: 'rgba(0, 201, 177, 0.12)',

  cyan:    '#00AEEF',
  cyanDim: 'rgba(0, 174, 239, 0.10)',

  // ── Success ───────────────────────────────────────────────────────────────────
  green:    '#1A9E5C',
  greenDim: 'rgba(26, 158, 92, 0.12)',

  // ── Energy / Fire ─────────────────────────────────────────────────────────────
  amber:    '#E09B00',
  amberDim: 'rgba(224, 155, 0, 0.14)',

  // ── Danger ────────────────────────────────────────────────────────────────────
  red: '#C0392B',

  // ── Typography ───────────────────────────────────────────────────────────────
  // Bumped contrast significantly — no more squinting.
  text:      '#EAEAF4',   // bright near-white
  textSub:   '#8C9EC4',   // steel blue — clearly legible
  textMuted: '#565680',   // muted but actually readable now
};

export const fx = {
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 5,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  goldLine: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 150, 12, 0.42)',
  },
  blueLine: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 174, 239, 0.36)',
  },
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
  sm:  6,
  md:  10,
  lg:  14,
  xl:  18,
  xxl: 26,
  full: 999,
};

/**
 * Typography — all sizes bumped +1-2px for comfortable reading distance.
 * No uppercase. No squinting.
 */
export const font = {
  h1: {
    fontSize: 30, fontWeight: '800' as const,
    color: colors.text, letterSpacing: -1,
  },
  h2: {
    fontSize: 24, fontWeight: '700' as const,
    color: colors.text, letterSpacing: -0.5,
  },
  h3: {
    fontSize: 19, fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16, fontWeight: '400' as const,
    color: colors.text,
  },
  small: {
    fontSize: 14, fontWeight: '400' as const,
    color: colors.textSub,
  },
  label: {
    fontSize: 13, fontWeight: '600' as const,
    color: colors.textSub, letterSpacing: 0.3,
  },
  caption: {
    fontSize: 12, fontWeight: '500' as const,
    color: colors.textMuted,
  },
};
