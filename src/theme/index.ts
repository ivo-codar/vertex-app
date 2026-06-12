/**
 * VERTEX — Stark / Wayne Theme  ·  v2 "Onyx Protocol"
 *
 * Batman: cold black, surgical precision, zero noise
 * Stark:  refined gold, arc-reactor blue, J.A.R.V.I.S. data readouts
 *
 * Type system (loaded via Google Fonts on web — see postbuild-web.js):
 *   Sora           → display / headlines (geometric, technical)
 *   Inter          → body / UI text (clean, neutral, legible)
 *   JetBrains Mono → numbers, data readouts, terminal accents
 */

// ── Font families ──────────────────────────────────────────────────────────────
export const ff = {
  display: 'Sora, system-ui, sans-serif',
  body:    'Inter, system-ui, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, monospace',
};

export const colors = {
  // ── Backgrounds — deep onyx with a cold navy undertone ─────────────────────
  bg:        '#05060B',
  surface:   '#0A0B14',
  card:      '#11131F',
  cardAlt:   '#181A28',
  cardDeep:  '#080910',
  border:    '#262A3D',
  borderHi:  '#363B52',   // brighter border for active / hovered states
  hairline:  'rgba(234, 240, 255, 0.06)',

  // ── Stark Gold — the signature accent ──────────────────────────────────────
  accent:     '#D4A017',
  accentSoft: '#F0C04A',  // lighter gold for glows / highlights
  accentDim:  'rgba(212, 160, 23, 0.15)',
  accentGlow: 'rgba(240, 192, 74, 0.35)',

  // ── Arc Reactor Blue ───────────────────────────────────────────────────────
  blue:     '#1FB6FF',
  blueSoft: '#6FD3FF',
  blueDim:  'rgba(31, 182, 255, 0.14)',
  blueGlow: 'rgba(111, 211, 255, 0.30)',

  // ── J.A.R.V.I.S. Teal ──────────────────────────────────────────────────────
  teal:    '#15E0C0',
  tealDim: 'rgba(21, 224, 192, 0.13)',

  cyan:    '#1FB6FF',
  cyanDim: 'rgba(31, 182, 255, 0.10)',

  // ── Success ─────────────────────────────────────────────────────────────────
  green:    '#22B66B',
  greenDim: 'rgba(34, 182, 107, 0.13)',

  // ── Energy / Fire ───────────────────────────────────────────────────────────
  amber:    '#F5A623',
  amberDim: 'rgba(245, 166, 35, 0.15)',

  // ── Danger ───────────────────────────────────────────────────────────────────
  red:    '#E54B4B',
  redDim: 'rgba(229, 75, 75, 0.14)',

  // ── Typography ───────────────────────────────────────────────────────────────
  text:      '#F0F3FB',   // crisp near-white
  textSub:   '#97A6C7',   // steel blue
  textMuted: '#5C6585',   // muted but readable
};

export const fx = {
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },
  cardElevated: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.borderHi,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 8,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  // Glow helpers — used for active / emphasized elements
  goldGlow: {
    shadowColor: colors.accentSoft,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 0,
  },
  blueGlow: {
    shadowColor: colors.blueSoft,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 0,
  },
  goldLine: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 160, 23, 0.45)',
  },
  blueLine: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(31, 182, 255, 0.40)',
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
  sm:  8,
  md:  12,
  lg:  16,
  xl:  22,
  xxl: 28,
  full: 999,
};

/**
 * Typography — Sora for display, Inter for UI, JetBrains Mono for data.
 * Tighter tracking on big text, airier tracking on small labels.
 */
export const font = {
  h1: {
    fontFamily: ff.display,
    fontSize: 32, fontWeight: '800' as const,
    color: colors.text, letterSpacing: -1.2,
  },
  h2: {
    fontFamily: ff.display,
    fontSize: 25, fontWeight: '700' as const,
    color: colors.text, letterSpacing: -0.6,
  },
  h3: {
    fontFamily: ff.display,
    fontSize: 19, fontWeight: '600' as const,
    color: colors.text, letterSpacing: -0.2,
  },
  body: {
    fontFamily: ff.body,
    fontSize: 16, fontWeight: '400' as const,
    color: colors.text,
  },
  bodyMed: {
    fontFamily: ff.body,
    fontSize: 16, fontWeight: '600' as const,
    color: colors.text,
  },
  small: {
    fontFamily: ff.body,
    fontSize: 14, fontWeight: '400' as const,
    color: colors.textSub,
  },
  label: {
    fontFamily: ff.body,
    fontSize: 12, fontWeight: '700' as const,
    color: colors.textSub, letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: ff.body,
    fontSize: 12, fontWeight: '500' as const,
    color: colors.textMuted,
  },
  // Monospace for numbers / data readouts
  mono: {
    fontFamily: ff.mono,
    fontSize: 16, fontWeight: '600' as const,
    color: colors.text, letterSpacing: -0.3,
  },
  monoBig: {
    fontFamily: ff.mono,
    fontSize: 30, fontWeight: '700' as const,
    color: colors.text, letterSpacing: -1,
  },
};
