import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, sp, r } from '../theme';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
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
      {/* Grid lines */}
      <View style={[s.gridLine, { bottom: BAR_H * 0.5 + 18 }]} />
      <View style={[s.gridLine, { bottom: BAR_H * 0.25 + 18 }]} />

      <View style={s.bars}>
        {data.map((val, i) => {
          const fillH   = val > 0 ? Math.max((val / max) * BAR_H, 6) : 0;
          const isToday = i === todayIdx;
          const isFuture = i > todayIdx;
          const barColor = isToday ? color : isFuture ? colors.bg : color + '45';
          const labelColor = isToday ? color : colors.textMuted;

          return (
            <View key={i} style={s.col}>
              <Text style={[s.valLabel, { color: labelColor, opacity: val > 0 ? 1 : 0 }]}>
                {val > 0 ? `${val}${unit}` : '·'}
              </Text>
              <View style={[s.barBg, { borderColor: isToday ? color + '30' : 'transparent' }]}>
                <View style={[s.barFill, { height: fillH, backgroundColor: barColor }]} />
              </View>
              <Text style={[s.dayLabel, isToday && { color, fontWeight: '700' as const }]}>
                {DAYS[i]}
              </Text>
              {isToday && <View style={[s.activeDot, { backgroundColor: color }]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingTop: 4,
  },
  gridLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.4,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    paddingBottom: 2,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  valLabel: {
    fontSize: 9,
    fontWeight: '700',
    height: 12,
  },
  barBg: {
    width: '100%',
    height: BAR_H,
    backgroundColor: colors.bg,
    borderRadius: r.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
  },
  barFill: {
    width: '100%',
    borderRadius: r.sm,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
  },
});
