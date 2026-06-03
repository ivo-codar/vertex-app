import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, r } from '../theme';

const DAYS  = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const BAR_H = 80;

interface Props {
  data: number[];
  color?: string;
  unit?: string;
}

export default function WeeklyChart({ data, color = colors.accent, unit = '' }: Props) {
  const todayIdx = (new Date().getDay() + 6) % 7;
  const max = Math.max(...data, 1);

  return (
    <View style={s.wrap}>
      <View style={[s.gridLine, { bottom: BAR_H * 0.75 + 20 }]} />
      <View style={[s.gridLine, { bottom: BAR_H * 0.5  + 20 }]} />
      <View style={[s.gridLine, { bottom: BAR_H * 0.25 + 20 }]} />

      <View style={s.bars}>
        {data.map((val, i) => {
          const fillH    = val > 0 ? Math.max((val / max) * BAR_H, 6) : 0;
          const isToday  = i === todayIdx;
          const isFuture = i > todayIdx;
          const barColor = isToday ? color : isFuture ? colors.border : color + '40';

          return (
            <View key={i} style={s.col}>
              {/* Value label */}
              <Text style={[s.valLabel, {
                color: isToday ? color : colors.textMuted,
                opacity: val > 0 ? 1 : 0,
              }]}>
                {val > 0 ? `${val}${unit}` : '0'}
              </Text>

              {/* Bar */}
              <View style={[s.barBg, {
                borderColor: isToday ? color + '60' : colors.border,
              }]}>
                <View style={[s.barFill, { height: fillH, backgroundColor: barColor }]} />
              </View>

              {/* Day label */}
              <Text style={[s.dayLabel, isToday && { color, fontWeight: '700' as const }]}>
                {DAYS[i]}
              </Text>

              {/* Today dot */}
              {isToday && <View style={[s.dot, { backgroundColor: color }]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative', paddingTop: 4 },
  gridLine: {
    position: 'absolute', left: 0, right: 0,
    height: 1, backgroundColor: colors.border, opacity: 0.5,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingBottom: 2 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  valLabel: { fontSize: 11, fontWeight: '700', height: 14 },
  barBg: {
    width: '100%', height: BAR_H,
    backgroundColor: colors.bg,
    borderRadius: r.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
  },
  barFill: { width: '100%', borderRadius: r.sm },
  dayLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
