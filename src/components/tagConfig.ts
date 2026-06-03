import { colors } from '../theme';

type IoniconsName = import('@expo/vector-icons').Ionicons['props']['name'];

export type TagCfg = { bg: string; text: string; icon: IoniconsName };

export const TAG_CONFIG: Record<string, TagCfg> = {
  Klausur:    { bg: colors.blueDim,              text: colors.blue,   icon: 'school-outline' },
  Schule:     { bg: 'rgba(92,154,255,0.12)',      text: '#5C9AFF',     icon: 'book-outline' },
  Gym:        { bg: colors.accentDim,            text: colors.accent, icon: 'barbell-outline' },
  Arbeit:     { bg: colors.tealDim,              text: colors.teal,   icon: 'briefcase-outline' },
  Freunde:    { bg: 'rgba(158,106,222,0.15)',     text: '#9E6ADE',     icon: 'people-outline' },
  Gesundheit: { bg: colors.greenDim,             text: colors.green,  icon: 'medkit-outline' },
  Persönlich: { bg: colors.amberDim,             text: colors.amber,  icon: 'person-outline' },
};

export const TAG_OPTIONS = Object.keys(TAG_CONFIG);
