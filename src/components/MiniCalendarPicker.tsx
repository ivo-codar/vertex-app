import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r } from '../theme';

const DAYS  = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];

interface Props {
  value: string | null; // YYYY-MM-DD
  onChange: (iso: string) => void;
}

export default function MiniCalendarPicker({ value, onChange }: Props) {
  const today = new Date();
  const [yr, setYr]  = useState(today.getFullYear());
  const [mo, setMo]  = useState(today.getMonth());

  const prev = () => { if (mo === 0) { setMo(11); setYr(y => y - 1); } else setMo(m => m - 1); };
  const next = () => { if (mo === 11) { setMo(0); setYr(y => y + 1); } else setMo(m => m + 1); };

  const firstDow   = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const daysInMo   = new Date(yr, mo + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMo }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const iso = (day: number) =>
    `${yr}-${String(mo + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const isToday = (d: number) =>
    d === today.getDate() && mo === today.getMonth() && yr === today.getFullYear();

  const isSel = (d: number) => value === iso(d);

  return (
    <View style={s.wrap}>
      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity style={s.navBtn} onPress={prev}>
          <Ionicons name="chevron-back" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[mo]} {yr}</Text>
        <TouchableOpacity style={s.navBtn} onPress={next}>
          <Ionicons name="chevron-forward" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={s.dowRow}>
        {DAYS.map(d => <Text key={d} style={s.dowLabel}>{d}</Text>)}
      </View>

      {/* Grid */}
      {rows.map((row, ri) => (
        <View key={ri} style={s.row}>
          {row.map((day, di) => {
            if (!day) return <View key={`e${di}`} style={s.cell} />;
            const today_ = isToday(day);
            const sel_   = isSel(day);
            return (
              <TouchableOpacity key={day} style={s.cell} onPress={() => onChange(iso(day))} activeOpacity={0.7}>
                <View style={[
                  s.circle,
                  sel_   && s.circleSel,
                  today_ && !sel_ && s.circleToday,
                ]}>
                  <Text style={[
                    s.dayNum,
                    sel_   && s.dayNumSel,
                    today_ && !sel_ && s.dayNumToday,
                  ]}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Selected display */}
      {value && (
        <View style={s.selectedRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
          <Text style={s.selectedText}>
            {new Date(value + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: r.lg, padding: sp.md, borderWidth: 1, borderColor: colors.border },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp.sm },
  navBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.textMuted },
  row: { flexDirection: 'row', marginBottom: 2 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  circleSel: { backgroundColor: colors.accent },
  circleToday: { borderWidth: 1, borderColor: colors.accent },
  dayNum: { fontSize: 13, fontWeight: '500', color: colors.textSub },
  dayNumSel: { color: colors.bg, fontWeight: '800' },
  dayNumToday: { color: colors.accent, fontWeight: '700' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: sp.sm, paddingTop: sp.sm, borderTopWidth: 1, borderTopColor: colors.border },
  selectedText: { fontSize: 13, fontWeight: '600', color: colors.accent },
});
