import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font } from '../../theme';
import { useStore } from '../../store';
import WeeklyChart from '../../components/WeeklyChart';
import { SimpleBarChart, StatBox } from '../../components/SharedCharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtH = (mins: number) =>
  mins === 0 ? '0h' : mins < 60 ? `${mins}min` : `${(Math.round(mins / 6) / 10).toFixed(1)}h`;

const toHours = (mins: number) => Math.round(mins / 6) / 10;

function pointsColor(p: number) {
  if (p >= 13) return colors.accent;
  if (p >= 10) return colors.teal;
  if (p >= 7)  return colors.blue;
  if (p >= 4)  return colors.amber;
  return colors.red;
}

function pointsLabel(p: number) {
  if (p >= 13) return 'Sehr gut';
  if (p >= 10) return 'Gut';
  if (p >= 7)  return 'Befriedigend';
  if (p >= 4)  return 'Ausreichend';
  return 'Mangelhaft';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  // ── Real data from store ─────────────────────────────────────────────────
  const gymRecords     = useStore(s => s.gymRecords);
  const gymWeek        = useStore(s => s.gymWeek.data);
  const focusSessions  = useStore(s => s.focusSessions);
  const focusSubjects  = useStore(s => s.focusSubjects);
  const focusWeek      = useStore(s => s.focusWeek.data);
  const focusGrades    = useStore(s => s.focusGrades);
  const projectsBoard  = useStore(s => s.projectsBoard);
  const projectsWeek   = useStore(s => s.projectsWeek.data);
  const streak         = useStore(s => s.streak);

  const [selectedEx, setSelectedEx] = useState<string | null>(null);

  const activeEx = selectedEx ?? gymRecords[0]?.name ?? null;
  const exRecord = gymRecords.find(r => r.name === activeEx);
  const exWeights = exRecord ? [...exRecord.entries].reverse().map(e => e.maxWeight) : [];
  const exLabels  = exRecord ? [...exRecord.entries].reverse().map(e => e.date.slice(5)) : [];
  const exPR = exWeights.length > 0 ? Math.max(...exWeights) : 0;

  // Progress %
  const gymProgress = exRecord && exRecord.entries.length >= 2
    ? ((exRecord.entries[0].maxWeight - exRecord.entries[exRecord.entries.length - 1].maxWeight)
        / exRecord.entries[exRecord.entries.length - 1].maxWeight * 100)
    : null;

  // Focus stats
  const totalFocusMins = focusSessions.reduce((a, s) => a + s.duration, 0);
  const colorMap = Object.fromEntries(focusSubjects.map(s => [s.name, s.color]));
  const bySubject = focusSessions.reduce<Record<string, number>>((a, s) => {
    a[s.subject] = (a[s.subject] ?? 0) + s.duration; return a;
  }, {});

  // Projects stats
  const doneCards  = projectsBoard.find(c => c.id === 'done')?.cards.length ?? 0;
  const totalCards = projectsBoard.reduce((a, c) => a + c.cards.length, 0);
  const inProgress = projectsBoard.find(c => c.id === 'inprogress')?.cards.length ?? 0;

  // Grade stats
  const gradesBySubject = focusSubjects
    .map(sub => ({ sub, entries: focusGrades.filter(g => g.subject === sub.name) }))
    .filter(x => x.entries.length > 0);

  const weekHours = focusWeek.map(toHours);

  const hasAnyData = gymRecords.length > 0 || focusSessions.length > 0 || totalCards > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[font.h2, { marginTop: sp.md }]}>Progress</Text>
        <Text style={[font.small, { marginTop: 2 }]}>Deine Entwicklung — Live-Daten</Text>

        {/* ── Top stats ── */}
        <View style={s.statsRow}>
          <StatBox label="Streak"        value={`${streak}d`}               color={colors.amber} />
          <StatBox label="Fokus-Zeit"    value={fmtH(totalFocusMins)}       color={colors.blue} />
          <StatBox label="Tasks erledigt" value={String(doneCards)}         color={colors.accent} />
        </View>

        {!hasAnyData && (
          <View style={s.emptyState}>
            <Ionicons name="stats-chart-outline" size={40} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Noch keine Daten</Text>
            <Text style={s.emptySub}>
              Starte ein Workout, eine Focus-Session oder erledige Tasks — dein Fortschritt erscheint hier automatisch.
            </Text>
          </View>
        )}

        {/* ── GYM ── */}
        {gymRecords.length > 0 && (
          <>
            <SectionTitle icon="barbell-outline" title="Gym" color={colors.accent} />

            {/* Exercise selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {gymRecords.map(rec => (
                <TouchableOpacity
                  key={rec.id}
                  style={[s.chip, activeEx === rec.name && s.chipActive]}
                  onPress={() => setSelectedEx(rec.name)}
                >
                  <Text style={[s.chipTxt, activeEx === rec.name && s.chipTxtActive]}>{rec.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {exRecord && (
              <View style={s.chartCard}>
                <View style={s.chartCardHeader}>
                  <Text style={font.small}>Gewichtsprogression — {exRecord.name}</Text>
                  {gymProgress !== null && (
                    <View style={[s.badge, { backgroundColor: gymProgress >= 0 ? colors.accentDim : colors.amberDim }]}>
                      <Ionicons
                        name={gymProgress >= 0 ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={gymProgress >= 0 ? colors.accent : colors.amber}
                      />
                      <Text style={[s.badgeTxt, { color: gymProgress >= 0 ? colors.accent : colors.amber }]}>
                        {gymProgress >= 0 ? '+' : ''}{Math.round(gymProgress * 10) / 10}%
                      </Text>
                    </View>
                  )}
                  {exPR > 0 && (
                    <View style={[s.badge, { backgroundColor: colors.amberDim }]}>
                      <Ionicons name="trophy" size={11} color={colors.amber} />
                      <Text style={[s.badgeTxt, { color: colors.amber }]}>PR: {exPR}kg</Text>
                    </View>
                  )}
                </View>
                {exWeights.length > 1 ? (
                  <SimpleBarChart labels={exLabels} values={exWeights} color={colors.accent} unit="kg" />
                ) : (
                  <Text style={s.oneSession}>Noch 1 Session — mehr Daten nach weiteren Workouts.</Text>
                )}
              </View>
            )}

            <View style={[s.chartCard, { marginTop: sp.sm }]}>
              <Text style={[font.small, { marginBottom: sp.sm }]}>Sets diese Woche</Text>
              <WeeklyChart data={gymWeek} color={colors.accent} />
            </View>
          </>
        )}

        {/* ── FOCUS ── */}
        {focusSessions.length > 0 && (
          <>
            <SectionTitle icon="timer-outline" title="Deep Work" color={colors.blue} />

            <View style={s.statsRow}>
              <StatBox label="Gesamt"   value={fmtH(totalFocusMins)}                      color={colors.blue} />
              <StatBox label="Sessions" value={String(focusSessions.length)}               color={colors.teal} />
              <StatBox label="Fächer"   value={String(Object.keys(bySubject).length)}      color={colors.accent} />
            </View>

            <View style={[s.chartCard, { marginTop: sp.sm }]}>
              <Text style={[font.small, { marginBottom: sp.sm }]}>Stunden diese Woche</Text>
              <WeeklyChart data={weekHours} color={colors.blue} unit="h" />
            </View>

            {Object.keys(bySubject).length > 0 && (
              <View style={[s.chartCard, { marginTop: sp.sm }]}>
                <Text style={[font.small, { marginBottom: sp.md }]}>Fächer-Verteilung</Text>
                {Object.entries(bySubject)
                  .sort((a, b) => b[1] - a[1])
                  .map(([sub, mins]) => {
                    const pct   = totalFocusMins > 0 ? (mins / totalFocusMins) * 100 : 0;
                    const color = colorMap[sub] ?? colors.accent;
                    return (
                      <View key={sub} style={{ marginBottom: sp.sm }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={font.small}>{sub}</Text>
                          <Text style={[font.small, { color }]}>{fmtH(mins)}</Text>
                        </View>
                        <View style={s.barBg}>
                          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* Grades */}
            {gradesBySubject.length > 0 && (
              <>
                <Text style={[font.label, { marginTop: sp.lg, marginBottom: sp.sm }]}>Noten-Übersicht</Text>
                {gradesBySubject.map(({ sub, entries }) => {
                  const avg  = entries.reduce((a, e) => a + e.points, 0) / entries.length;
                  const avgR = Math.round(avg * 10) / 10;
                  const clr  = pointsColor(avgR);
                  const trend = entries.length >= 2
                    ? entries[0].points > entries[1].points ? 'up'
                    : entries[0].points < entries[1].points ? 'down' : 'same'
                    : 'same';
                  return (
                    <View key={sub.name} style={s.gradeRow}>
                      <View style={[s.dot, { backgroundColor: sub.color }]} />
                      <Text style={[font.body, { flex: 1, fontWeight: '600' }]}>{sub.name}</Text>
                      <View style={[s.gradeBadge, { backgroundColor: clr + '20' }]}>
                        <Text style={[s.gradeVal, { color: clr }]}>{avgR} Pkt</Text>
                        <Text style={[s.gradeLabel, { color: clr }]}>{pointsLabel(Math.round(avgR))}</Text>
                      </View>
                      <Ionicons
                        name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                        size={16}
                        color={trend === 'up' ? colors.accent : trend === 'down' ? colors.red : colors.textMuted}
                      />
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── PROJECTS ── */}
        {totalCards > 0 && (
          <>
            <SectionTitle icon="layers-outline" title="Projects" color={colors.teal} />

            <View style={s.statsRow}>
              <StatBox label="Erledigt"    value={String(doneCards)}   color={colors.accent} />
              <StatBox label="In Progress" value={String(inProgress)}  color={colors.amber} />
              <StatBox label="Gesamt"      value={String(totalCards)}  color={colors.blue} />
            </View>

            {/* Completion bar */}
            <View style={s.chartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: sp.sm }}>
                <Text style={font.small}>Abschlussrate</Text>
                <Text style={[font.small, { color: colors.accent }]}>
                  {totalCards > 0 ? Math.round(doneCards / totalCards * 100) : 0}%
                </Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${totalCards > 0 ? doneCards / totalCards * 100 : 0}%`, backgroundColor: colors.accent }]} />
              </View>
            </View>

            <View style={[s.chartCard, { marginTop: sp.sm }]}>
              <Text style={[font.small, { marginBottom: sp.sm }]}>Erledigte Tasks diese Woche</Text>
              <WeeklyChart data={projectsWeek} color={colors.teal} />
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; title: string; color: string;
}) {
  return (
    <View style={st.row}>
      <View style={[st.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[font.label, { color }]}>{title}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: sp.lg, marginBottom: sp.sm },
  iconWrap: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  statsRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.md },

  emptyState: {
    alignItems: 'center', padding: sp.xl, marginTop: sp.xl,
    gap: sp.md, borderRadius: r.xl, borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSub },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  chipRow: { gap: sp.sm, paddingRight: sp.md, marginBottom: sp.sm },
  chip: { paddingHorizontal: sp.md, paddingVertical: 7, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  chipTxtActive: { color: colors.bg },

  chartCard: { backgroundColor: colors.card, borderRadius: r.lg, padding: sp.md, borderWidth: 1, borderColor: colors.border },
  chartCardHeader: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.sm, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: sp.sm, paddingVertical: 3, borderRadius: r.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  oneSession: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: sp.md },

  barBg: { height: 6, backgroundColor: colors.bg, borderRadius: r.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: r.full },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  gradeBadge: { borderRadius: r.md, padding: sp.xs, alignItems: 'center' },
  gradeVal: { fontSize: 14, fontWeight: '800' },
  gradeLabel: { fontSize: 9, fontWeight: '600' },
});
