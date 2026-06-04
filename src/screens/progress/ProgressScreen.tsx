import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font, fx } from '../../theme';
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

// ── Alignment helpers ─────────────────────────────────────────────────────────

const ALIGNMENT_MIN = -5;
const ALIGNMENT_MAX = 8;
const ALIGNMENT_RANGE = ALIGNMENT_MAX - ALIGNMENT_MIN;

function alignmentPct(score: number): number {
  const clamped = Math.max(ALIGNMENT_MIN, Math.min(ALIGNMENT_MAX, score));
  return (clamped - ALIGNMENT_MIN) / ALIGNMENT_RANGE;
}

function alignmentStatus(score: number): { label: string; color: string; sub: string } {
  if (score >=  5) return { label: 'PARAGON',      color: '#C8960C', sub: 'Maximale Disziplin. Elite-Level.' };
  if (score >=  3) return { label: 'ELITE',         color: '#E09B00', sub: 'Herausragende Leistung.' };
  if (score >=  1) return { label: 'ALIGNED',       color: '#00AEEF', sub: 'Kurs gehalten. Weiter so.' };
  if (score ===  0) return { label: 'NEUTRAL',      color: '#68789A', sub: 'Kein Signal. Starte eine Session.' };
  if (score >= -1) return { label: 'DESTABILIZED',  color: '#D4A017', sub: 'Schwacher Fokus heute.' };
  if (score >= -3) return { label: 'COMPROMISED',   color: '#C0392B', sub: 'System unter Stress.' };
  return              { label: 'ROGUE',             color: '#8B0000', sub: 'Kritisch. Sofortige Maßnahmen.' };
}

const TOXIN_DEF = [
  { key: 'junkfood',     label: 'Junkfood',        icon: '🍔', desc: 'Ungesunde Ernährung' },
  { key: 'doomScrolling', label: 'Doom-Scrolling',  icon: '📱', desc: 'Endloses Scrollen' },
  { key: 'snooze',       label: 'Snooze',           icon: '⏰', desc: 'Alarm überdrückt' },
] as const;

export default function ProgressScreen() {
  const alignmentScore      = useStore(s => s.alignmentScore);
  const toxins              = useStore(s => s.toxins);
  const pendingMorningCheck = useStore(s => s.pendingMorningCheck);
  const toggleToxin         = useStore(s => s.toggleToxin);
  const dismissMorningCheck = useStore(s => s.dismissMorningCheck);

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

  // Animate bar position
  const barAnim = useRef(new Animated.Value(alignmentPct(alignmentScore))).current;
  useEffect(() => {
    Animated.spring(barAnim, {
      toValue: alignmentPct(alignmentScore),
      useNativeDriver: false,
      tension: 40, friction: 8,
    }).start();
  }, [alignmentScore]); // eslint-disable-line

  const status = alignmentStatus(alignmentScore);

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
          <Text style={s.kicker}>System Intelligence</Text>
          <Text style={font.h2}>Progress</Text>
          <Text style={s.headerSub}>Live-Daten aus allen Bereichen</Text>
        </View>

        {/* ══════════ ALIGNMENT METER ══════════ */}
        <View style={al.card}>
          {/* Header */}
          <View style={al.header}>
            <View>
              <Text style={al.title}>ALIGNMENT METER</Text>
              <Text style={al.subtitle}>O.R.A.C.L.E. DAILY ASSESSMENT</Text>
            </View>
            <View style={[al.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[al.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* Score */}
          <Text style={[al.scoreNum, { color: status.color }]}>
            {alignmentScore >= 0 ? '+' : ''}{alignmentScore}
          </Text>
          <Text style={al.scoreSub}>{status.sub}</Text>

          {/* Bar */}
          <View style={al.barWrap}>
            <Text style={al.barLabelLeft}>ROGUE</Text>
            <View style={al.track}>
              {/* Negative fill (center → left) */}
              <View style={al.negHalf}>
                {alignmentScore < 0 && (
                  <View style={[al.negFill, {
                    width: `${Math.min(100, Math.abs(alignmentScore) / Math.abs(ALIGNMENT_MIN) * 100)}%`,
                  }]} />
                )}
              </View>
              {/* Center divider */}
              <View style={al.centerLine} />
              {/* Positive fill (center → right) */}
              <View style={al.posHalf}>
                {alignmentScore > 0 && (
                  <View style={[al.posFill, {
                    width: `${Math.min(100, alignmentScore / ALIGNMENT_MAX * 100)}%`,
                  }]} />
                )}
              </View>
            </View>
            <Text style={al.barLabelRight}>PARAGON</Text>
          </View>

          {/* Legend */}
          <View style={al.legend}>
            <View style={al.legendItem}>
              <View style={[al.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={al.legendTxt}>Gym +1 · Focus +1 · Omega +2</Text>
            </View>
            <View style={al.legendItem}>
              <View style={[al.legendDot, { backgroundColor: colors.red }]} />
              <Text style={al.legendTxt}>Toxin −1 je Check</Text>
            </View>
          </View>
        </View>

        {/* ══════════ TOXIN CHECK-IN ══════════ */}
        <View style={[al.card, al.toxinCard]}>
          <View style={al.toxinHeader}>
            <Ionicons name="nuclear" size={14} color={colors.red} />
            <Text style={al.toxinTitle}>SYSTEM QUERY</Text>
            <Ionicons name="nuclear" size={14} color={colors.red} />
          </View>
          <Text style={al.toxinQuestion}>WERE TOXINS CONSUMED TODAY?</Text>

          {TOXIN_DEF.map(({ key, label, icon, desc }) => {
            const checked = toxins[key];
            return (
              <TouchableOpacity
                key={key}
                style={[al.toxinRow, checked && al.toxinRowActive]}
                onPress={() => toggleToxin(key)}
                activeOpacity={0.8}
              >
                <Text style={al.toxinIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[al.toxinLabel, checked && { color: colors.red }]}>{label}</Text>
                  <Text style={al.toxinDesc}>{desc}</Text>
                </View>
                <View style={[al.toxinCheck, checked && al.toxinCheckDone]}>
                  {checked && <Ionicons name="checkmark" size={12} color={colors.bg} />}
                </View>
              </TouchableOpacity>
            );
          })}
          <Text style={al.toxinNote}>
            Jeder Haken zieht −1 vom Alignment Score
          </Text>
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
      {/* ══════ MORNING SYSTEM QUERY ══════ */}
      <Modal
        visible={pendingMorningCheck}
        transparent
        animationType="fade"
        onRequestClose={dismissMorningCheck}
      >
        <View style={mq.overlay}>
          <View style={mq.card}>
            <Text style={mq.system}>O.R.A.C.L.E. SYSTEM QUERY</Text>
            <Text style={mq.time}>MORNING ASSESSMENT — {new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' })}</Text>

            <View style={mq.divider} />

            <Text style={mq.question}>WERE TOXINS{'\n'}CONSUMED?</Text>
            <Text style={mq.sub}>Gestrige Gewohnheiten beeinflussen den heutigen Score.</Text>

            {TOXIN_DEF.map(({ key, label, icon, desc }) => {
              const checked = toxins[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[mq.row, checked && mq.rowActive]}
                  onPress={() => toggleToxin(key)}
                  activeOpacity={0.8}
                >
                  <Text style={mq.icon}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[mq.label, checked && { color: colors.red }]}>{label}</Text>
                    <Text style={mq.desc}>{desc}</Text>
                  </View>
                  <View style={[mq.check, checked && mq.checkDone]}>
                    {checked && <Ionicons name="checkmark" size={12} color={colors.bg} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={mq.divider} />

            <TouchableOpacity style={mq.confirmBtn} onPress={dismissMorningCheck}>
              <Ionicons name="shield-checkmark" size={16} color={colors.bg} />
              <Text style={mq.confirmTxt}>ASSESSMENT COMPLETE — PROCEED</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  header: { paddingTop: sp.lg, paddingBottom: sp.sm },
  kicker: { fontSize: 12, fontWeight: '800', color: colors.accent, letterSpacing: 1.3, marginBottom: 3 },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  // ── Summary card ─────────────────────────────────────────────────────────
  summaryCard: {
    ...fx.card,
    flexDirection: 'row',
    borderRadius: r.xl,
    padding: sp.md,
    marginTop: sp.sm,
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
    ...fx.card,
    borderRadius: r.xl,
    padding: sp.md,
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
    ...fx.card,
    borderRadius: r.xl,
    padding: sp.md,
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

// ── Morning Query styles ──────────────────────────────────────────────────────
const mq = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', padding: sp.xl },
  card: {
    backgroundColor: colors.surface, borderRadius: r.xl,
    padding: sp.xl, borderWidth: 1, borderColor: 'rgba(192,57,43,0.5)',
  },
  system: { fontSize: 10, fontWeight: '800', color: colors.red, letterSpacing: 2, textAlign: 'center' },
  time: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 3, marginBottom: sp.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: sp.md },
  question: {
    fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center',
    letterSpacing: -0.5, marginBottom: sp.xs,
  },
  sub: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: sp.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    backgroundColor: colors.card, borderRadius: r.md,
    padding: sp.md, marginBottom: sp.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  rowActive: { borderColor: 'rgba(192,57,43,0.6)', backgroundColor: 'rgba(192,57,43,0.07)' },
  icon: { fontSize: 22 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  desc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  check: { width: 22, height: 22, borderRadius: r.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.red, borderColor: colors.red },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.sm, backgroundColor: colors.accent, borderRadius: r.md,
    padding: sp.md,
  },
  confirmTxt: { fontSize: 13, fontWeight: '800', color: colors.bg, letterSpacing: 0.5 },
});

// ── Alignment Meter styles ────────────────────────────────────────────────────
const al = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: r.lg,
    padding: sp.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: sp.md,
  },
  toxinCard: { borderColor: 'rgba(192,57,43,0.35)' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sp.sm },
  title:  { fontSize: 11, fontWeight: '800', color: colors.textSub, letterSpacing: 1.5 },
  subtitle: { fontSize: 10, color: colors.textMuted, marginTop: 2, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.sm },
  statusLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  scoreNum: { fontSize: 40, fontWeight: '900', letterSpacing: -2, textAlign: 'center', marginVertical: sp.xs },
  scoreSub: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: sp.md },

  // ── Horizontal bar ──────────────────────────────────────────────────────────
  barWrap: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.md },
  barLabelLeft:  { fontSize: 9, fontWeight: '800', color: '#8B0000',    letterSpacing: 0.5, width: 38 },
  barLabelRight: { fontSize: 9, fontWeight: '800', color: colors.accent, letterSpacing: 0.5, width: 48, textAlign: 'right' },
  track: {
    flex: 1, height: 12, flexDirection: 'row',
    backgroundColor: colors.bg, borderRadius: r.full,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  negHalf: {
    flex: 1, flexDirection: 'row', justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  negFill: { height: '100%', backgroundColor: '#C0392B', borderRadius: r.full },
  centerLine: { width: 2, backgroundColor: colors.textMuted, opacity: 0.4 },
  posHalf: { flex: 1, overflow: 'hidden' },
  posFill: { height: '100%', backgroundColor: colors.accent, borderRadius: r.full },

  legend: { flexDirection: 'row', gap: sp.lg, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendTxt: { fontSize: 11, color: colors.textMuted },

  // ── Toxin check-in ──────────────────────────────────────────────────────────
  toxinHeader: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, justifyContent: 'center', marginBottom: sp.xs },
  toxinTitle: { fontSize: 11, fontWeight: '800', color: colors.red, letterSpacing: 2 },
  toxinQuestion: {
    fontSize: 13, fontWeight: '700', color: colors.text,
    textAlign: 'center', marginBottom: sp.md, letterSpacing: 0.3,
  },
  toxinRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    backgroundColor: colors.bg, borderRadius: r.md,
    padding: sp.md, marginBottom: sp.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  toxinRowActive: { borderColor: 'rgba(192,57,43,0.6)', backgroundColor: 'rgba(192,57,43,0.06)' },
  toxinIcon: { fontSize: 22 },
  toxinLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  toxinDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  toxinCheck: {
    width: 22, height: 22, borderRadius: r.sm,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  toxinCheckDone: { backgroundColor: colors.red, borderColor: colors.red },
  toxinNote: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: sp.xs },
});
