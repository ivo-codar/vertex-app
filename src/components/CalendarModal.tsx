import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font } from '../theme';
import { Routine, CalendarEvent } from '../types';
import { TAG_CONFIG } from './tagConfig';

const WEEKDAYS   = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];

interface Props {
  visible:  boolean;
  onClose:  () => void;
  routines: Routine[];
  events:   CalendarEvent[];
}

export default function CalendarModal({ visible, onClose, routines, events }: Props) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState<Date>(today);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build grid cells (null = empty padding before 1st)
  const firstDow  = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rawCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows of 7
  while (rawCells.length % 7 !== 0) rawCells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < rawCells.length; i += 7) rows.push(rawCells.slice(i, i + 7));

  const isoFor = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const eventsForDay = (day: number) =>
    events.filter(ev => ev.isoDate === isoFor(day));

  const routinesForDow = (dayNum: number) => {
    const dow = (new Date(viewYear, viewMonth, dayNum).getDay() + 6) % 7;
    return routines.filter(rt => rt.days.length === 0 || rt.days.includes(dow));
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear  === today.getFullYear();

  const isSelected = (day: number) =>
    day === selected.getDate() &&
    viewMonth === selected.getMonth() &&
    viewYear  === selected.getFullYear();

  // ── Selected day details ─────────────────────────────────────────────────
  const selIso = isoFor(selected.getDate());
  const selDow = (selected.getDay() + 6) % 7;
  const selEvents   = selected.getMonth() === viewMonth
    ? events.filter(ev => ev.isoDate === selIso) : [];
  const selRoutines = selected.getMonth() === viewMonth
    ? routines.filter(rt => rt.days.length === 0 || rt.days.includes(selDow)) : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.textSub} />
          </TouchableOpacity>
          <View style={s.monthNav}>
            <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Day headers ── */}
        <View style={s.dowRow}>
          {WEEKDAYS.map(d => (
            <Text key={d} style={s.dowLabel}>{d}</Text>
          ))}
        </View>

        {/* ── Month grid ── */}
        <View style={s.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((day, di) => {
                if (!day) return <View key={`e-${di}`} style={s.cell} />;
                const dayEvents   = eventsForDay(day);
                const dayRoutines = routinesForDow(day);
                const today_      = isToday(day);
                const sel_        = isSelected(day);

                return (
                  <TouchableOpacity
                    key={day}
                    style={[s.cell, sel_ && s.cellSelected]}
                    onPress={() => setSelected(new Date(viewYear, viewMonth, day))}
                    activeOpacity={0.7}
                  >
                    <View style={[s.dayCircle, today_ && s.dayCircleToday, sel_ && s.dayCircleSel]}>
                      <Text style={[
                        s.dayNum,
                        today_ && s.dayNumToday,
                        sel_   && s.dayNumSel,
                      ]}>
                        {day}
                      </Text>
                    </View>

                    {/* Indicator dots */}
                    <View style={s.dotRow}>
                      {dayRoutines.length > 0 && (
                        <View style={[s.dot, { backgroundColor: colors.accent + '90' }]} />
                      )}
                      {dayEvents.slice(0, 2).map(ev => {
                        const cfg = TAG_CONFIG[ev.tag];
                        return (
                          <View key={ev.id} style={[s.dot, { backgroundColor: cfg?.text ?? colors.blue }]} />
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Day divider ── */}
        <View style={s.divider} />

        {/* ── Selected day panel ── */}
        <ScrollView style={s.panel} contentContainerStyle={s.panelContent} showsVerticalScrollIndicator={false}>
          <Text style={s.panelDate}>
            {selected.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          {selRoutines.length > 0 && (
            <>
              <Text style={s.panelSection}>Routinen</Text>
              {selRoutines.map(rt => (
                <View key={rt.id} style={s.panelItem}>
                  <View style={[s.panelAccent, { backgroundColor: colors.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.panelItemTitle}>{rt.title}</Text>
                    {rt.time && <Text style={s.panelItemSub}>{rt.time}</Text>}
                  </View>
                  <View style={[s.panelTag, { backgroundColor: colors.accentDim }]}>
                    <Text style={[s.panelTagText, { color: colors.accent }]}>Routine</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {selEvents.length > 0 && (
            <>
              <Text style={s.panelSection}>Termine</Text>
              {selEvents.map(ev => {
                const cfg = TAG_CONFIG[ev.tag] ?? { text: colors.accent, bg: colors.accentDim, icon: 'calendar-outline' as const };
                return (
                  <View key={ev.id} style={s.panelItem}>
                    <View style={[s.panelAccent, { backgroundColor: cfg.text, width: 4 }]} />
                    <View style={[s.panelIconWrap, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={14} color={cfg.text} />
                    </View>
                    <Text style={[s.panelItemTitle, { flex: 1 }]}>{ev.title}</Text>
                    <View style={[s.panelTag, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.panelTagText, { color: cfg.text }]}>{ev.tag}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {selRoutines.length === 0 && selEvents.length === 0 && (
            <View style={s.emptyDay}>
              <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
              <Text style={s.emptyText}>Nichts geplant.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sp.md, paddingVertical: sp.sm,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  monthNav: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.lg },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  monthTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  dowRow: { flexDirection: 'row', paddingHorizontal: sp.sm, marginTop: sp.sm, marginBottom: sp.xs },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },

  grid: { paddingHorizontal: sp.sm },
  row: { flexDirection: 'row', marginBottom: 2 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: r.md },
  cellSelected: { backgroundColor: colors.accentDim },
  dayCircle: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleToday: { backgroundColor: colors.accent },
  dayCircleSel: { },
  dayNum: { fontSize: 14, fontWeight: '500', color: colors.textSub },
  dayNumToday: { color: colors.bg, fontWeight: '800' },
  dayNumSel: { color: colors.accent, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: sp.md, marginVertical: sp.md },

  panel: { flex: 1 },
  panelContent: { paddingHorizontal: sp.md, paddingBottom: 32 },
  panelDate: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: sp.md },
  panelSection: { ...font.label, marginBottom: sp.sm, marginTop: sp.sm },
  panelItem: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    backgroundColor: colors.card, borderRadius: r.md,
    padding: sp.md, marginBottom: sp.sm,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  panelAccent: { width: 3, alignSelf: 'stretch' },
  panelIconWrap: {
    width: 28, height: 28, borderRadius: r.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  panelItemTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  panelItemSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  panelTag: { paddingHorizontal: sp.sm, paddingVertical: 3, borderRadius: r.full },
  panelTagText: { fontSize: 10, fontWeight: '700' },
  emptyDay: { alignItems: 'center', paddingVertical: sp.xl, gap: sp.sm },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
