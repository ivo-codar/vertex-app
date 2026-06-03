import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, sp, r } from '../theme';

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
        const c      = isLast ? color : color + '50';
        return (
          <View key={i} style={s.barCol}>
            <Text style={[s.barVal, { color: isLast ? color : colors.textMuted }]}>
              {v > 0 ? `${v}${unit}` : ''}
            </Text>
            <View style={[s.barBg, {
              height: BAR_H,
              borderColor: isLast ? color + '30' : 'transparent',
            }]}>
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
  barVal: { fontSize: 11, fontWeight: '700' },
  barBg: {
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: r.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
  },
  barFill: { width: '100%', borderRadius: r.sm },
  barLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});

const sb = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: r.md,
    padding: sp.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 12, color: colors.textSub, fontWeight: '600', textAlign: 'center' },
});
