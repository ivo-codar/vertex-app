import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font, fx } from '../../theme';
import { GradeEntry, GradeSubject, CategoryWeights, AbiturExam, AbiturExamType } from '../../types';
import { useStore } from '../../store';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEMESTERS = [1, 2, 3, 4] as const;
type Sem = 1 | 2 | 3 | 4;

// Mirrors the logic in GradeScreen
function calcSubjectAvg(
  entries: GradeEntry[], subjectId: string,
  semester: Sem, weights: CategoryWeights,
): number | null {
  const rel = entries.filter(e => e.subjectId === subjectId && e.semester === semester);
  if (rel.length === 0) return null;
  const CATEGORIES = ['Klausur', 'Mündlich', 'Praktisch', 'Test', 'Präsentation'] as const;
  let weightedSum = 0, usedWeight = 0;
  CATEGORIES.forEach(cat => {
    const catW = weights[cat];
    if (catW <= 0) return;
    const catEntries = rel.filter(e => e.category === cat);
    if (catEntries.length === 0) return;
    const totalW = catEntries.reduce((a, e) => a + (e.weight ?? 1), 0);
    const catAvg = catEntries.reduce((a, e) => a + e.points * (e.weight ?? 1), 0) / totalW;
    weightedSum += catAvg * catW;
    usedWeight  += catW;
  });
  if (usedWeight === 0) {
    const totalW = rel.reduce((a, e) => a + (e.weight ?? 1), 0);
    return rel.reduce((a, e) => a + e.points * (e.weight ?? 1), 0) / totalW;
  }
  return weightedSum / usedWeight;
}

function ptsColor(p: number): string {
  if (p >= 13) return colors.accent;
  if (p >= 10) return colors.teal;
  if (p >= 7)  return colors.blue;
  if (p >= 4)  return colors.amber;
  return colors.red;
}

function ptsToNote(p: number): string {
  if (p >= 15) return '1+'; if (p >= 14) return '1'; if (p >= 13) return '1−';
  if (p >= 12) return '2+'; if (p >= 11) return '2'; if (p >= 10) return '2−';
  if (p >= 9)  return '3+'; if (p >= 8)  return '3'; if (p >= 7)  return '3−';
  if (p >= 6)  return '4+'; if (p >= 5)  return '4'; if (p >= 4)  return '4−';
  if (p >= 3)  return '5+'; if (p >= 2)  return '5'; if (p >= 1)  return '5−';
  return '6';
}

/**
 * Converts total Abitur points (300–900) to final grade (1.0–4.0).
 * Formula: E = 4 − 3 × (P − 300) / 600
 */
function totalToGrade(total: number): string {
  if (total < 300) return 'n.B.';
  const raw = 4 - (3 * (total - 300)) / 600;
  const clamped = Math.max(1.0, Math.min(4.0, raw));
  // Round to 1 decimal, then display with German comma
  return clamped.toFixed(1).replace('.', ',');
}

function gradeColor(total: number): string {
  if (total >= 750) return colors.accent;
  if (total >= 600) return colors.teal;
  if (total >= 450) return colors.blue;
  if (total >= 300) return colors.amber;
  return colors.red;
}

// Exam factor: schriftlich = 4, mündlich = 4 (standard)
const EXAM_FACTOR = 4;

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }

export default function AbiturScreen({ onBack }: Props) {
  const gradeSubjects    = useStore(s => s.gradeSubjects);
  const focusGrades      = useStore(s => s.focusGrades);
  const abiturExams      = useStore(s => s.abiturExams);
  const abiturEingebracht = useStore(s => s.abiturEingebracht);
  const storeUpdate      = useStore(s => s.update);

  const setExams = (fn: AbiturExam[] | ((p: AbiturExam[]) => AbiturExam[])) =>
    storeUpdate(s => ({ abiturExams: typeof fn === 'function' ? fn(s.abiturExams) : fn }));
  const setEingebracht = (fn: string[] | ((p: string[]) => string[])) =>
    storeUpdate(s => ({ abiturEingebracht: typeof fn === 'function' ? fn(s.abiturEingebracht) : fn }));

  // Exam modal state
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examSubId, setExamSubId]         = useState('');
  const [examType, setExamType]           = useState<AbiturExamType>('schriftlich');
  const [examPts, setExamPts]             = useState('');

  // ── Block I — per-subject per-semester averages ───────────────────────────

  // subjectId-semester key helpers
  const einKey = (subId: string, sem: Sem) => `${subId}-${sem}`;
  const isEingebracht = (subId: string, sem: Sem) => abiturEingebracht.includes(einKey(subId, sem));

  const toggleEingebracht = (subId: string, sem: Sem) => {
    const key = einKey(subId, sem);
    setEingebracht(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Compute all subject × semester averages
  const semAvgMatrix = useMemo(() =>
    gradeSubjects.map(sub => ({
      sub,
      avgs: SEMESTERS.map(sem => ({
        sem,
        avg: calcSubjectAvg(focusGrades, sub.id, sem, sub.weights),
      })),
    })),
    [gradeSubjects, focusGrades]
  );

  // Block I: sum of eingebrachte Kurse × LK factor
  const blockIData = useMemo(() => {
    let rawSum = 0, maxSum = 0, count = 0;
    semAvgMatrix.forEach(({ sub, avgs }) => {
      const factor = sub.isLK ? 2 : 1;
      avgs.forEach(({ sem, avg }) => {
        const included = isEingebracht(sub.id, sem);
        if (included) {
          const pts = avg !== null ? Math.round(avg) : 0;
          rawSum += pts * factor;
          maxSum += 15 * factor;
          count++;
        }
      });
    });
    // Normalize to 600-point scale
    const normalized = maxSum > 0 ? Math.round((rawSum / maxSum) * 600) : 0;
    return { rawSum, maxSum, normalized, count };
  }, [semAvgMatrix, abiturEingebracht]);

  // Block II: exams
  const blockIITotal = useMemo(() =>
    abiturExams.reduce((sum, e) => sum + e.points * EXAM_FACTOR, 0),
    [abiturExams]
  );
  const blockIIMax = 5 * 15 * EXAM_FACTOR; // 300

  // Grand total (900-point scale)
  const grandTotal = blockIData.normalized + blockIITotal;

  // ── Exam modal helpers ────────────────────────────────────────────────────

  const openAddExam = () => {
    setEditingExamId(null);
    setExamSubId(gradeSubjects[0]?.id ?? '');
    setExamType('schriftlich');
    setExamPts('');
    setShowExamModal(true);
  };

  const openEditExam = (exam: AbiturExam) => {
    setEditingExamId(exam.id);
    setExamSubId(exam.subjectId);
    setExamType(exam.type);
    setExamPts(String(exam.points));
    setShowExamModal(true);
  };

  const saveExam = () => {
    const pts = parseInt(examPts, 10);
    if (isNaN(pts) || pts < 0 || pts > 15 || !examSubId) return;
    const sub = gradeSubjects.find(s => s.id === examSubId);
    if (!sub) return;
    const entry: AbiturExam = {
      id: editingExamId ?? Date.now().toString(),
      subjectId: examSubId,
      subject: sub.name,
      type: examType,
      points: pts,
    };
    if (editingExamId) {
      setExams(prev => prev.map(e => e.id === editingExamId ? entry : e));
    } else {
      if (abiturExams.length >= 5) return; // max 5
      setExams(prev => [...prev, entry]);
    }
    setShowExamModal(false);
  };

  // ── Select-all shortcut ───────────────────────────────────────────────────

  const selectAllAvailable = () => {
    const keys: string[] = [];
    semAvgMatrix.forEach(({ sub, avgs }) => {
      avgs.forEach(({ sem, avg }) => {
        if (avg !== null) keys.push(einKey(sub.id, sem));
      });
    });
    setEingebracht(keys);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const totalColor = gradeColor(grandTotal);
  const hasData    = grandTotal > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.textSub} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Abitur Rechner</Text>
          <Text style={font.caption}>Block I + II · NRW-Modell</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Ergebnis-Card ── */}
        <View style={[s.resultCard, hasData && { borderColor: totalColor + '60' }]}>
          <View style={s.resultRow}>
            <View style={s.resultBlock}>
              <Text style={s.resultBlockLabel}>BLOCK I</Text>
              <Text style={[s.resultBlockPts, { color: blockIData.normalized > 0 ? ptsColor(blockIData.normalized / 40) : colors.textMuted }]}>
                {blockIData.normalized}
              </Text>
              <Text style={s.resultBlockSub}>/ 600</Text>
            </View>
            <View style={s.resultDivider} />
            <View style={s.resultBlock}>
              <Text style={s.resultBlockLabel}>BLOCK II</Text>
              <Text style={[s.resultBlockPts, { color: blockIITotal > 0 ? ptsColor(blockIITotal / 20) : colors.textMuted }]}>
                {blockIITotal}
              </Text>
              <Text style={s.resultBlockSub}>/ 300</Text>
            </View>
            <View style={s.resultDivider} />
            <View style={[s.resultBlock, s.resultBlockTotal]}>
              <Text style={s.resultBlockLabel}>GESAMT</Text>
              <Text style={[s.resultTotalPts, { color: hasData ? totalColor : colors.textMuted }]}>
                {grandTotal}
              </Text>
              <Text style={[s.resultGrade, { color: hasData ? totalColor : colors.textMuted }]}>
                {hasData ? `Note ${totalToGrade(grandTotal)}` : '—'}
              </Text>
            </View>
          </View>
          {hasData && (
            <View style={s.progressBarWrap}>
              <View style={[s.progressBarFill, { width: `${Math.min(100, (grandTotal / 900) * 100)}%` as any, backgroundColor: totalColor }]} />
            </View>
          )}
          {hasData && (
            <Text style={[s.progCaption, { color: totalColor }]}>
              {grandTotal} / 900 Punkte · Abiturnote {totalToGrade(grandTotal)}
            </Text>
          )}
        </View>

        {/* ── Block I ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionLine} />
          <Text style={s.sectionTitle}>BLOCK I — Kursergebnisse</Text>
          <TouchableOpacity onPress={selectAllAvailable}>
            <Text style={s.selectAll}>Alle einbringen</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.sectionHint}>
          Tippe eine Zelle an, um das Halbjahresergebnis einzubringen (✓). LK zählt ×2.
        </Text>

        {semAvgMatrix.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="school-outline" size={24} color={colors.textMuted} />
            <Text style={s.emptyTxt}>Noch keine Noten eingetragen.{'\n'}Füge Noten im Notenbuch hinzu.</Text>
          </View>
        ) : (
          semAvgMatrix.map(({ sub, avgs }) => (
            <View key={sub.id} style={s.subjectRow}>
              <View style={s.subjectNameWrap}>
                <Text style={s.subjectName} numberOfLines={1}>{sub.name}</Text>
                {sub.isLK && <View style={s.lkBadge}><Text style={s.lkText}>LK</Text></View>}
              </View>
              <View style={s.semCells}>
                {avgs.map(({ sem, avg }) => {
                  const included = isEingebracht(sub.id, sem);
                  const pts = avg !== null ? Math.round(avg) : null;
                  return (
                    <TouchableOpacity
                      key={sem}
                      style={[
                        s.semCell,
                        included && s.semCellActive,
                        pts !== null && included && { borderColor: ptsColor(pts) + '80' },
                      ]}
                      onPress={() => avg !== null && toggleEingebracht(sub.id, sem)}
                      activeOpacity={avg !== null ? 0.7 : 1}
                    >
                      <Text style={s.semCellLabel}>HJ{sem}</Text>
                      {pts !== null ? (
                        <>
                          <Text style={[s.semCellPts, included && { color: ptsColor(pts) }]}>
                            {sub.isLK ? pts * 2 : pts}
                          </Text>
                          {included && (
                            <Ionicons name="checkmark-circle" size={10} color={ptsColor(pts)} />
                          )}
                        </>
                      ) : (
                        <Text style={s.semCellEmpty}>—</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {blockIData.count > 0 && (
          <View style={s.blockSummary}>
            <Text style={s.blockSummaryTxt}>
              {blockIData.count} Kurse eingebracht · Roh {blockIData.rawSum}/{blockIData.maxSum} · Normiert {blockIData.normalized}/600
            </Text>
          </View>
        )}

        {/* ── Block II ── */}
        <View style={[s.sectionHeader, { marginTop: sp.xl }]}>
          <View style={s.sectionLine} />
          <Text style={s.sectionTitle}>BLOCK II — Prüfungen</Text>
          {abiturExams.length < 5 && (
            <TouchableOpacity style={s.addBtn} onPress={openAddExam}>
              <Ionicons name="add" size={14} color={colors.bg} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.sectionHint}>Max. 5 Prüfungen · je 0–15 Punkte × 4 = max. 60 pro Prüfung</Text>

        {abiturExams.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="create-outline" size={24} color={colors.textMuted} />
            <Text style={s.emptyTxt}>Noch keine Prüfungsergebnisse.{'\n'}Tippe + um eine einzutragen.</Text>
          </View>
        ) : (
          abiturExams.map((exam, idx) => {
            const total = exam.points * EXAM_FACTOR;
            const col   = ptsColor(exam.points);
            return (
              <View key={exam.id} style={s.examCard}>
                <View style={[s.examIndex, { backgroundColor: col + '20' }]}>
                  <Text style={[s.examIndexTxt, { color: col }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.examSubject}>{exam.subject}</Text>
                  <Text style={font.caption}>{exam.type === 'schriftlich' ? 'schriftlich' : 'mündlich'} · {exam.points} Pkt × 4</Text>
                </View>
                <View style={[s.examBadge, { backgroundColor: col + '18' }]}>
                  <Text style={[s.examTotal, { color: col }]}>{total}</Text>
                  <Text style={[s.examNote, { color: col }]}>{ptsToNote(exam.points)}</Text>
                </View>
                <TouchableOpacity style={s.examBtn} onPress={() => openEditExam(exam)}>
                  <Ionicons name="pencil" size={13} color={colors.blue} />
                </TouchableOpacity>
                <TouchableOpacity style={s.examBtn} onPress={() => setExams(p => p.filter(e => e.id !== exam.id))}>
                  <Ionicons name="trash-outline" size={13} color={colors.red} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {abiturExams.length > 0 && (
          <View style={s.blockSummary}>
            <Text style={s.blockSummaryTxt}>
              {abiturExams.length}/5 Prüfungen · {blockIITotal} / {blockIIMax} Punkte
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Exam Modal ── */}
      <Modal visible={showExamModal} transparent animationType="slide" onRequestClose={() => setShowExamModal(false)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setShowExamModal(false)} />
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>{editingExamId ? 'Prüfung bearbeiten' : 'Prüfungsergebnis eintragen'}</Text>

            <Text style={m.label}>Fach</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm, marginBottom: sp.md }}>
              {gradeSubjects.map(sub => (
                <TouchableOpacity
                  key={sub.id}
                  style={[m.chip, examSubId === sub.id && m.chipActive]}
                  onPress={() => setExamSubId(sub.id)}
                >
                  <Text style={[m.chipTxt, examSubId === sub.id && m.chipTxtActive]}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={m.label}>Art</Text>
            <View style={{ flexDirection: 'row', gap: sp.sm, marginBottom: sp.md }}>
              {(['schriftlich', 'mündlich'] as AbiturExamType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[m.chip, examType === t && m.chipActive, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setExamType(t)}
                >
                  <Text style={[m.chipTxt, examType === t && m.chipTxtActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={m.label}>Punkte (0–15)</Text>
            <View style={m.ptsGrid}>
              {Array.from({ length: 16 }, (_, i) => i).map(p => {
                const sel = examPts === String(p);
                const col = ptsColor(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[m.ptsBtn, sel && { backgroundColor: col, borderColor: col }]}
                    onPress={() => setExamPts(String(p))}
                  >
                    <Text style={[m.ptsBtnTxt, sel && { color: colors.bg }]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {examPts !== '' && (
              <View style={m.ptsPreview}>
                <Text style={[m.ptsPrevTxt, { color: ptsColor(parseInt(examPts)) }]}>
                  {examPts} Punkte → {parseInt(examPts) * EXAM_FACTOR} (×4) · Note {ptsToNote(parseInt(examPts))}
                </Text>
              </View>
            )}

            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={() => setShowExamModal(false)}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={saveExam}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: sp.lg, paddingBottom: sp.md, gap: sp.sm,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  title: { ...font.h2 },

  resultCard: {
    ...fx.card,
    borderRadius: r.xl, padding: sp.lg,
    marginBottom: sp.lg, borderWidth: 1,
    borderColor: colors.border,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: sp.md },
  resultBlock: { flex: 1, alignItems: 'center' },
  resultBlockTotal: { flex: 1.2 },
  resultBlockLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 4 },
  resultBlockPts: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  resultBlockSub: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  resultTotalPts: { fontSize: 34, fontWeight: '800', letterSpacing: -2 },
  resultGrade: { fontSize: 13, fontWeight: '700' },
  resultDivider: { width: 1, height: 48, backgroundColor: colors.border, marginHorizontal: sp.sm },
  progressBarWrap: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: sp.sm },
  progressBarFill: { height: '100%', borderRadius: 2 },
  progCaption: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: sp.xs, marginTop: sp.lg, gap: sp.sm,
  },
  sectionLine: { width: 18, height: 2, borderRadius: 1, backgroundColor: colors.accent },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1.4 },
  selectAll: { fontSize: 12, color: colors.blue, fontWeight: '600' },
  addBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginBottom: sp.md },

  emptyCard: {
    ...fx.card, borderRadius: r.lg,
    alignItems: 'center', padding: sp.xl, gap: sp.sm,
  },
  emptyTxt: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  subjectRow: {
    ...fx.card, borderRadius: r.lg,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: sp.sm, paddingHorizontal: sp.md,
    marginBottom: 8, gap: sp.sm,
  },
  subjectNameWrap: { width: 80, flexDirection: 'row', alignItems: 'center', gap: 4 },
  subjectName: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  lkBadge: { backgroundColor: colors.accentDim, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  lkText: { fontSize: 8, fontWeight: '800', color: colors.accent },
  semCells: { flex: 1, flexDirection: 'row', gap: 6 },
  semCell: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
    borderRadius: r.sm, backgroundColor: colors.cardAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  semCellActive: { backgroundColor: colors.accentDim, borderColor: colors.accent + '60' },
  semCellLabel: { fontSize: 9, fontWeight: '700', color: colors.textMuted },
  semCellPts: { fontSize: 13, fontWeight: '800', color: colors.textSub },
  semCellEmpty: { fontSize: 13, fontWeight: '700', color: colors.border },

  blockSummary: {
    backgroundColor: colors.cardAlt, borderRadius: r.md,
    padding: sp.sm, marginTop: sp.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  blockSummaryTxt: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  examCard: {
    ...fx.card, borderRadius: r.lg,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: sp.sm, paddingHorizontal: sp.md,
    marginBottom: 8, gap: sp.sm,
  },
  examIndex: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  examIndexTxt: { fontSize: 13, fontWeight: '800' },
  examSubject: { fontSize: 14, fontWeight: '600', color: colors.text },
  examBadge: { alignItems: 'center', paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.md },
  examTotal: { fontSize: 16, fontWeight: '800' },
  examNote: { fontSize: 10, fontWeight: '700' },
  examBtn: { padding: sp.xs },
});

const m = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: sp.lg, paddingBottom: 40, borderWidth: 1, borderColor: colors.border,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: sp.lg },
  title: { ...font.h3, marginBottom: sp.md },
  label: { ...font.label, marginBottom: sp.sm },
  chip: {
    paddingHorizontal: sp.md, paddingVertical: 8, borderRadius: r.full,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  chipTxtActive: { color: colors.bg },
  ptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  ptsBtn: {
    width: 44, height: 44, borderRadius: r.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  ptsBtnTxt: { fontSize: 14, fontWeight: '700', color: colors.textSub },
  ptsPreview: {
    marginTop: sp.sm, padding: sp.sm,
    borderRadius: r.md, backgroundColor: colors.card,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  ptsPrevTxt: { fontSize: 14, fontWeight: '700' },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  btnCancel: {
    flex: 1, padding: sp.md, borderRadius: r.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  btnSave: { flex: 1, padding: sp.md, borderRadius: r.md, backgroundColor: colors.accent, alignItems: 'center' },
});
