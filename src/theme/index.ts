/**
 * VERTEX — Stark / Wayne Theme
 *
 * Batman: cold black, surgical precision, zero noise
 * Stark:  refined gold, arc-reactor blue, J.A.R.V.I.S. data readouts
 *
 * Rule: Gold earns its place. It appears only where it matters.
 */

export const colors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  // Cold blacks with a barely perceptible navy undertone — like the inside of
  // the Batcave or a Stark Industries server room after dark.
  bg:       '#06060C',   // void black
  surface:  '#0A0A14',   // nav / tab bar
  card:     '#0E0E1A',   // card surface
  cardAlt:  '#121220',   // elevated / nested
  border:   '#1A1A2E',   // hairline — barely there, like hologram grid lines

  // ── Stark Gold ───────────────────────────────────────────────────────────────
  // 18-karat, not flashy. The accent strip on the Mark III suit.
  // Earns its place: buttons, active states, progress, checkboxes.
  accent:    '#C8960C',
  accentDim: 'rgba(200, 150, 12, 0.13)',

  // ── Arc Reactor Blue ─────────────────────────────────────────────────────────
  // The chest piece. Pure, electric, data-forward.
  // Used for: charts, focus timer, information states.
  blue:    '#00AEEF',
  blueDim: 'rgba(0, 174, 239, 0.12)',

  // ── J.A.R.V.I.S. Teal ────────────────────────────────────────────────────────
  // The holographic interface color. Cool, precise.
  teal:    '#00C9B1',
  tealDim: 'rgba(0, 201, 177, 0.10)',

  cyan:    '#00AEEF',
  cyanDim: 'rgba(0, 174, 239, 0.10)',

  // ── Success ───────────────────────────────────────────────────────────────────
  // Kept subtle. Only for completion / done states.
  green:    '#1A9E5C',
  greenDim: 'rgba(26, 158, 92, 0.10)',

  // ── Energy / Fire ─────────────────────────────────────────────────────────────
  // Streak flames, repulsor charge, warnings. Warm gold-orange.
  amber:    '#E09B00',
  amberDim: 'rgba(224, 155, 0, 0.13)',

  // ── Danger ────────────────────────────────────────────────────────────────────
  // Iron Man red. Delete. Error. Alert.
  red: '#C0392B',

  // ── Typography ───────────────────────────────────────────────────────────────
  // Cold, screen-precise. Like reading off a monitor in a darkened lab.
  text:      '#EAEAF4',   // near white, slight blue cast
  textSub:   '#68789A',   // brushed steel
  textMuted: '#2C2C42',   // deep shadow — barely readable by design
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
  sm:  6,    // sharper corners — more Wayne / Stark than rounded
  md:  10,
  lg:  14,
  xl:  18,
  xxl: 26,
  full: 999,
};

/**
 * Typography — precise, no fluff.
 * Numbers read like J.A.R.V.I.S. readouts.
 * No uppercase — uppercase screams "Bootstrap", not "Stark Industries".
 */
export const font = {
  h1: {
    fontSize: 28, fontWeight: '800' as const,
    color: colors.text, letterSpacing: -1,
  },
  h2: {
    fontSize: 22, fontWeight: '700' as const,
    color: colors.text, letterSpacing: -0.5,
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
    fontSize: 11, fontWeight: '600' as const,
    color: colors.textSub, letterSpacing: 0.5,
  },
  caption: {
    fontSize: 11, fontWeight: '500' as const,
    color: colors.textMuted,
  },
};
