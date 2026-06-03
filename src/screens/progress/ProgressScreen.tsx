import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
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
  const gymRecords    = useStore(s => s.gymRecords);
  const gymWeek       = useStore(s => s.gymWeek.data);
  const focusSessions = useStore(s => s.focusSessions);
  const focusSubjects = useStore(s => s.focusSubjects);
  const focusWeek     = useStore(s => s.focusWeek.data);
  const focusGrades   = useStore(s => s.focusGrades);
  const projectsBoard = useStore(s => s.projectsBoard);
  const projectsWeek  = useStore(s => s.projectsWeek.data);
  const streak        = useStore(s => s.streak);

  const [selectedEx, setSelectedEx] = useState<string | null>(null);

  const activeEx  = selectedEx ?? gymRecords[0]?.name ?? null;
  const exRecord  = gymRecords.find(r => r.name === activeEx);
  const exWeights = exRecord ? [...exRecord.entries].reverse().map(e => e.maxWeight) : [];
  const exLabels  = exRecord ? [...exRecord.entries].reverse().map(e => e.date.slice(5)) : [];
  const exPR      = exWeights.length > 0 ? Math.max(...exWeights) : 0;

  const gymProgress = exRecord && exRecord.entries.length >= 2
    ? ((exRecord.entries[0].maxWeight - exRecord.entries[exRecord.entries.length - 1].maxWeight)
        / exRecord.entries[exRecord.entries.length - 1].maxWeight * 100)
    : null;

  const totalFocusMins  = focusSessions.reduce((a, s) => a + s.duration, 0);
  const colorMap        = Object.fromEntries(focusSubjects.map(s => [s.name, s.color]));
  const bySubject       = focusSessions.reduce<Record<string, number>>((a, s) => {
    a[s.subject] = (a[s.subject] ?? 0) + s.duration; return a;
  }, {});

  const doneCards  = projectsBoard.find(c => c.id === 'done')?.cards.length ?? 0;
  const totalCards = projectsBoard.reduce((a, c) => a + c.cards.length, 0);
  const inProgress = projectsBoard.find(c => c.id === 'inprogress')?.cards.length ?? 0;
  const completionPct = totalCards > 0 ? Math.round(doneCards / totalCards * 100) : 0;

  const gradesBySubject = focusSubjects
    .map(sub => ({ sub, entries: focusGrades.filter(g => g.subject === sub.name) }))
    .filter(x => x.entries.length > 0);

  const weekHours = focusWeek.map(toHours);
  const hasGym     = gymRecords.length > 0;
  const hasFocus   = focusSessions.length > 0;
  const hasProject = totalCards > 0;
  const hasAnyData = hasGym || hasFocus || hasProject;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={font.h2}>Progress</Text>
          <Text style={s.headerSub}>Live-Daten aus allen Bereichen</Text>
        </View>

        {/* ── Top Streak + Summary ── */}
        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <Ionicons name="flame" size={20} color={streak > 0 ? colors.amber : colors.textMuted} />
            <Text style={[s.summaryVal, { color: streak > 0 ? colors.amber : colors.textMuted }]}>
              {streak}
            </Text>
            <Text style={s.summaryLabel}>Streak</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Ionicons name="timer-outline" size={20} color={colors.blue} />
            <Text style={[s.summaryVal, { color: colors.blue }]}>{fmtH(totalFocusMins)}</Text>
            <Text style={s.summaryLabel}>Fokus</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.accent} />
            <Text style={[s.summaryVal, { color: colors.accent }]}>{doneCards}</Text>
            <Text style={s.summaryLabel}>Erledigt</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Ionicons name="barbell-outline" size={20} color={colors.teal} />
            <Text style={[s.summaryVal, { color: colors.teal }]}>{gymRecords.length}</Text>
            <Text style={s.summaryLabel}>Übungen</Text>
          </View>
        </View>

        {/* ════ GYM ════ */}
        <Section icon="barbell-outline" title="Gym" color={colors.accent}>
          {!hasGym ? (
            <EmptySection text="Erstelle einen Split und starte dein erstes Workout." />
          ) : (<>
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
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardLabel}>Gewichtsprogression</Text>
                  <View style={s.badgeRow}>
                    {gymProgress !== null && (
                      <Badge
                        icon={gymProgress >= 0 ? 'trending-up' : 'trending-down'}
                        label={`${gymProgress >= 0 ? '+' : ''}${Math.round(gymProgress * 10) / 10}%`}
                        color={gymProgress >= 0 ? colors.accent : colors.amber}
                      />
                    )}
                    {exPR > 0 && <Badge icon="trophy" label={`PR ${exPR}kg`} color={colors.amber} />}
                  </View>
                </View>
                {exWeights.length > 1
                  ? <SimpleBarChart labels={exLabels} values={exWeights} color={colors.accent} unit="kg" />
                  : <Text style={s.oneSession}>Mehr Daten nach weiteren Workouts.</Text>
                }
              </View>
            )}
            <View style={[s.card, { marginTop: sp.sm }]}>
              <Text style={s.cardLabel}>Sets diese Woche</Text>
              <WeeklyChart data={gymWeek} color={colors.accent} />
            </View>
          </>)}
        </Section>

        {/* ════ FOCUS ════ */}
        <Section icon="timer-outline" title="Deep Work" color={colors.blue}>
          {!hasFocus ? (
            <EmptySection text="Starte eine Focus-Session um deinen Lernfortschritt zu sehen." />
          ) : (<>
            <View style={s.statsRow}>
              <StatBox label="Gesamt"   value={fmtH(totalFocusMins)}                      color={colors.blue} />
              <StatBox label="Sessions" value={String(focusSessions.length)}               color={colors.blue} />
              <StatBox label="Fächer"   value={String(Object.keys(bySubject).length)}      color={colors.blue} />
            </View>
            <View style={[s.card, { marginTop: sp.sm }]}>
              <Text style={s.cardLabel}>Stunden diese Woche</Text>
              <WeeklyChart data={weekHours} color={colors.blue} unit="h" />
            </View>
            {Object.keys(bySubject).length > 0 && (
              <View style={[s.card, { marginTop: sp.sm }]}>
                <Text style={[s.cardLabel, { marginBottom: sp.md }]}>Fächer-Verteilung</Text>
                {Object.entries(bySubject).sort((a, b) => b[1] - a[1]).map(([sub, mins]) => {
                  const pct   = totalFocusMins > 0 ? (mins / totalFocusMins) * 100 : 0;
                  const color = colorMap[sub] ?? colors.accent;
                  return (
                    <View key={sub} style={{ marginBottom: sp.sm }}>
                      <View style={s.barLabelRow}>
                        <Text style={font.small}>{sub}</Text>
                        <Text style={[font.small, { color }]}>{fmtH(mins)}</Text>
                      </View>
                      <View style={s.barBg}>
                        <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            {gradesBySubject.length > 0 && (
              <View style={[s.card, { marginTop: sp.sm }]}>
                <Text style={[s.cardLabel, { marginBottom: sp.sm }]}>Noten</Text>
                {gradesBySubject.map(({ sub, entries }) => {
                  const avg  = entries.reduce((a, e) => a + e.points, 0) / entries.length;
                  const avgR = Math.round(avg * 10) / 10;
                  const clr  = pointsColor(avgR);
                  const trend = entries.length >= 2
                    ? entries[0].points > entries[1].points ? 'up'
                    : entries[0].points < entries[1].points ? 'down' : 'same' : 'same';
                  return (
                    <View key={sub.name} style={s.gradeRow}>
                      <View style={[s.gradeDot, { backgroundColor: sub.color }]} />
                      <Text style={[font.body, { flex: 1, fontWeight: '600' }]}>{sub.name}</Text>
                      <View style={[s.gradeBadge, { backgroundColor: clr + '20' }]}>
                        <Text style={[s.gradeVal, { color: clr }]}>{avgR} Pkt</Text>
                        <Text style={[s.gradeLevel, { color: clr }]}>{pointsLabel(Math.round(avgR))}</Text>
                      </View>
                      <Ionicons
                        name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                        size={16}
                        color={trend === 'up' ? colors.accent : trend === 'down' ? colors.red : colors.textMuted}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </>)}
        </Section>

        {/* ════ PROJECTS ════ */}
        <Section icon="layers-outline" title="Projects" color={colors.teal}>
          {!hasProject ? (
            <EmptySection text="Erstelle Tasks im Projects-Tab um deinen Fortschritt zu sehen." />
          ) : (<>
            <View style={s.completionCard}>
              <View style={s.completionLeft}>
                <Text style={s.completionPct}>{completionPct}%</Text>
                <Text style={s.completionLabel}>Abgeschlossen</Text>
              </View>
              <View style={s.completionStats}>
                <CompletionRow label="Erledigt"    value={doneCards}  color={colors.accent} />
                <CompletionRow label="In Progress" value={inProgress} color={colors.amber} />
                <CompletionRow label="Offen" value={totalCards - doneCards - inProgress} color={colors.textMuted} />
              </View>
            </View>
            <View style={s.completionBar}>
              <View style={[s.completionBarFill, { width: `${completionPct}%` as any }]} />
            </View>
            <View style={[s.card, { marginTop: sp.md }]}>
              <Text style={s.cardLabel}>Erledigte Tasks diese Woche</Text>
              <WeeklyChart data={projectsWeek} color={colors.teal} />
            </View>
          </>)}
        </Section>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptySection({ text }: { text: string }) {
  return (
    <View style={es.wrap}>
      <Text style={es.text}>{text}</Text>
    </View>
  );
}

function Section({ icon, title, color, children }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; color: string; children: React.ReactNode;
}) {
  return (
    <View style={sec.wrap}>
      <View style={sec.header}>
        <View style={[sec.iconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={[font.label, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Badge({ icon, label, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string;
}) {
  return (
    <View style={[bdg.wrap, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[bdg.txt, { color }]}>{label}</Text>
    </View>
  );
}

function CompletionRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={cr.row}>
      <View style={[cr.dot, { backgroundColor: color }]} />
      <Text style={cr.label}>{label}</Text>
      <Text style={[cr.value, { color }]}>{value}</Text>
    </View>
  );
}

const es = StyleSheet.create({
  wrap: { paddingVertical: sp.md, paddingHorizontal: sp.sm },
  text: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});

const sec = StyleSheet.create({
  wrap: { marginTop: sp.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.sm },
  iconWrap: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});

const bdg = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: r.full },
  txt: { fontSize: 11, fontWeight: '700' },
});

const cr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { flex: 1, fontSize: 13, color: colors.textSub },
  value: { fontSize: 14, fontWeight: '700' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  header: { paddingTop: sp.md, paddingBottom: sp.sm },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  // ── Summary card ─────────────────────────────────────────────────────────
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: r.lg,
    padding: sp.md,
    marginTop: sp.sm,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryVal: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: colors.textSub, fontWeight: '500' },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.border },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center', paddingVertical: sp.xxl,
    gap: sp.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.textSub },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: sp.md },

  // ── Generic card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.card, borderRadius: r.lg,
    padding: sp.md, borderWidth: 1, borderColor: colors.border,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.sm, flexWrap: 'wrap', gap: sp.xs },
  cardLabel: { fontSize: 13, fontWeight: '600', color: colors.textSub, marginBottom: sp.xs },
  badgeRow: { flexDirection: 'row', gap: sp.xs },
  oneSession: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: sp.md },

  statsRow: { flexDirection: 'row', gap: sp.sm },
  chipRow: { gap: sp.sm, paddingRight: sp.md, marginBottom: sp.sm },
  chip: { paddingHorizontal: sp.md, paddingVertical: 7, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  chipTxtActive: { color: colors.bg },

  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barBg: { height: 5, backgroundColor: colors.bg, borderRadius: r.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: r.full },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: sp.xs },
  gradeDot: { width: 8, height: 8, borderRadius: 4 },
  gradeBadge: { borderRadius: r.md, paddingHorizontal: sp.sm, paddingVertical: 3, alignItems: 'center' },
  gradeVal: { fontSize: 13, fontWeight: '800' },
  gradeLevel: { fontSize: 9, fontWeight: '600' },

  // ── Projects completion ───────────────────────────────────────────────────
  completionCard: {
    backgroundColor: colors.card, borderRadius: r.lg,
    padding: sp.md, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', gap: sp.lg,
  },
  completionLeft: { alignItems: 'center', minWidth: 72 },
  completionPct: { fontSize: 36, fontWeight: '800', color: colors.teal, letterSpacing: -1 },
  completionLabel: { fontSize: 13, color: colors.textSub, fontWeight: '500', marginTop: 2 },
  completionStats: { flex: 1 },
  completionBar: {
    height: 6, backgroundColor: colors.card, borderRadius: r.full,
    overflow: 'hidden', marginTop: sp.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  completionBarFill: { height: '100%', backgroundColor: colors.teal, borderRadius: r.full },
});
