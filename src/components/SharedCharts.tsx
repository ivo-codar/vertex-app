import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, sp, r, fx, ff } from '../theme';

const BAR_H = 70;

// ── SimpleBarChart ────────────────────────────────────────────────────────────

interface BarChartProps {
  labels: string[];
  values: number[];
  color: string;
  unit?: string;
}

export function SimpleBarChart({ labels, values, color, unit = '' }: BarChartProps) {
  const max = Math.max(...values, 1);
  return (
    <View style={s.barRow}>
      {values.map((v, i) => {
        const h      = Math.max((v / max) * BAR_H, v > 0 ? 4 : 0);
        const isLast = i === values.length - 1;
        const c      = isLast ? color : color + '56';
        return (
          <View key={i} style={s.barCol}>
            <Text style={[s.barVal, { color: isLast ? color : colors.textMuted }]}>
              {v > 0 ? `${v}${unit}` : ''}
            </Text>
            <View style={[s.barBg, { height: BAR_H }, isLast && { borderColor: color + '90', backgroundColor: colors.cardDeep }]}>
              <View style={[s.barFill, { height: h, backgroundColor: c }]} />
            </View>
            <Text style={[s.barLabel, isLast && { color }]} numberOfLines={1}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── StatBox ───────────────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: string;
  color: string;
}

export function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <View style={sb.card}>
      <Text style={[sb.value, { color }]}>{value}</Text>
      <Text style={sb.label}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barVal: { fontFamily: ff.mono, fontSize: 11, fontWeight: '700' },
  barBg: {
    width: '100%',
    backgroundColor: colors.cardDeep,
    borderRadius: r.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  barFill: { width: '100%', borderRadius: r.sm },
  barLabel: { fontFamily: ff.mono, fontSize: 10, color: colors.textMuted, textAlign: 'center' },
});

const sb = StyleSheet.create({
  card: {
    flex: 1, borderRadius: r.md,
    padding: sp.md, alignItems: 'center', gap: 5,
    ...fx.card,
  },
  value: { fontFamily: ff.mono, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontFamily: ff.mono, fontSize: 10, color: colors.textSub, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' },
});
