import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font } from '../../theme';
import { GradeEntry, GradeSubject, GradeCategory, CategoryWeights } from '../../types';
import { useStore, DEFAULT_GRADE_SUBJECTS } from '../../store';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: GradeCategory[] = ['Schriftlich', 'Mündlich', 'Praktisch', 'Test', 'Sonstig'];

const CAT_ICON: Record<GradeCategory, string> = {
  Schriftlich: '✍️', Mündlich: '🗣️', Praktisch: '🏃', Test: '📝', Sonstig: '⭐',
};

// ── Grade calculations ────────────────────────────────────────────────────────

function ptsToGrade(pts: number): string {
  if (pts >= 15) return '1+'; if (pts >= 14) return '1'; if (pts >= 13) return '1-';
  if (pts >= 12) return '2+'; if (pts >= 11) return '2'; if (pts >= 10) return '2-';
  if (pts >= 9)  return '3+'; if (pts >= 8)  return '3'; if (pts >= 7)  return '3-';
  if (pts >= 6)  return '4+'; if (pts >= 5)  return '4'; if (pts >= 4)  return '4-';
  if (pts >= 3)  return '5+'; if (pts >= 2)  return '5'; if (pts >= 1)  return '5-';
  return '6';
}

function ptsColor(pts: number): string {
  if (pts >= 13) return colors.accent;
  if (pts >= 10) return colors.teal;
  if (pts >= 7)  return colors.blue;
  if (pts >= 4)  return colors.amber;
  return colors.red;
}

function calcSubjectAvg(
  entries: GradeEntry[],
  subjectId: string,
  semester: 1 | 2 | 3 | 4,
  weights: CategoryWeights,
): number | null {
  const rel = entries.filter(e => e.subjectId === subjectId && e.semester === semester);
  if (rel.length === 0) return null;

  let weightedSum = 0;
  let usedWeight  = 0;

  CATEGORIES.forEach(cat => {
    const w = weights[cat];
    if (w <= 0) return;
    const catEntries = rel.filter(e => e.category === cat);
    if (catEntries.length === 0) return;
    const avg = catEntries.reduce((a, e) => a + e.points, 0) / catEntries.length;
    weightedSum += avg * w;
    usedWeight  += w;
  });

  if (usedWeight === 0) {
    // fallback: simple average
    return rel.reduce((a, e) => a + e.points, 0) / rel.length;
  }
  return weightedSum / usedWeight;
}

function calcOverallAvg(
  subjects: GradeSubject[],
  entries: GradeEntry[],
  semester: 1 | 2 | 3 | 4,
): number | null {
  let total = 0, weight = 0;
  subjects.forEach(sub => {
    const avg = calcSubjectAvg(entries, sub.id, semester, sub.weights);
    if (avg === null) return;
    const w = sub.isLK ? 2 : 1;
    total  += avg * w;
    weight += w;
  });
  return weight > 0 ? total / weight : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onClose: () => void; }

type View = 'main' | 'subject';

export default function GradeScreen({ onClose }: Props) {
  const focusGrades   = useStore(s => s.focusGrades);
  const gradeSubjects = useStore(s => s.gradeSubjects);
  const activeSem     = useStore(s => s.activeSemester);
  const update        = useStore(s => s.update);

  const setGrades    = (fn: GradeEntry[] | ((p: GradeEntry[]) => GradeEntry[])) =>
    update(s => ({ focusGrades: typeof fn === 'function' ? fn(s.focusGrades) : fn }));
  const setSubjects  = (fn: GradeSubject[] | ((p: GradeSubject[]) => GradeSubject[])) =>
    update(s => ({ gradeSubjects: typeof fn === 'function' ? fn(s.gradeSubjects) : fn }));
  const setSemester  = (sem: 1 | 2 | 3 | 4) => update({ activeSemester: sem });

  // View state
  const [view, setView]           = useState<View>('main');
  const [selectedSub, setSelectedSub] = useState<GradeSubject | null>(null);

  // Add grade modal
  const [showAddGrade, setShowAddGrade]   = useState(false);
  const [addSubId, setAddSubId]           = useState('');
  const [addCat, setAddCat]               = useState<GradeCategory>('Schriftlich');
  const [addPoints, setAddPoints]         = useState('');
  const [addLabel, setAddLabel]           = useState('');

  // Add/edit subject modal
  const [showSubjectModal, setShowSubjectModal]   = useState(false);
  const [editSub, setEditSub]                     = useState<GradeSubject | null>(null);
  const [subName, setSubName]                     = useState('');
  const [subIsLK, setSubIsLK]                     = useState(false);
  const [subWeights, setSubWeights]               = useState<CategoryWeights>(
    { Schriftlich: 50, Mündlich: 50, Praktisch: 0, Test: 0, Sonstig: 0 }
  );

  // ── Computed ────────────────────────────────────────────────────────────────

  const overallAvg = useMemo(
    () => calcOverallAvg(gradeSubjects, focusGrades, activeSem),
    [gradeSubjects, focusGrades, activeSem]
  );

  const subjectAvgs = useMemo(() =>
    Object.fromEntries(gradeSubjects.map(sub => [
      sub.id,
      calcSubjectAvg(focusGrades, sub.id, activeSem, sub.weights),
    ])),
    [gradeSubjects, focusGrades, activeSem]
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addGrade = () => {
    const pts = parseInt(addPoints, 10);
    if (isNaN(pts) || pts < 0 || pts > 15 || !addSubId) return;
    const sub = gradeSubjects.find(s => s.id === addSubId);
    if (!sub) return;
    setGrades(prev => [{
      id: Date.now().toString(),
      subjectId: addSubId,
      subject: sub.name,
      points: pts,
      category: addCat,
      label: addLabel.trim() || `${addCat} ${prev.filter(e => e.subjectId === addSubId && e.category === addCat).length + 1}`,
      date: new Date().toISOString().split('T')[0],
      semester: activeSem,
    }, ...prev]);
    setAddPoints(''); setAddLabel(''); setShowAddGrade(false);
  };

  const deleteGrade = (id: string) =>
    setGrades(prev => prev.filter(e => e.id !== id));

  const openSubjectEdit = (sub: GradeSubject | null) => {
    if (sub) {
      setEditSub(sub);
      setSubName(sub.name);
      setSubIsLK(sub.isLK);
      setSubWeights({ ...sub.weights });
    } else {
      setEditSub(null);
      setSubName('');
      setSubIsLK(false);
      setSubWeights({ Schriftlich: 50, Mündlich: 50, Praktisch: 0, Test: 0, Sonstig: 0 });
    }
    setShowSubjectModal(true);
  };

  const saveSubject = () => {
    if (!subName.trim()) return;
    if (editSub) {
      setSubjects(prev => prev.map(s => s.id === editSub.id
        ? { ...s, name: subName.trim(), isLK: subIsLK, weights: subWeights }
        : s
      ));
      // update denormalized subject name in entries
      update(s => ({
        focusGrades: s.focusGrades.map(e =>
          e.subjectId === editSub.id ? { ...e, subject: subName.trim() } : e
        ),
      }));
    } else {
      setSubjects(prev => [...prev, {
        id: `gs-${Date.now()}`,
        name: subName.trim(),
        isLK: subIsLK,
        weights: subWeights,
      }]);
    }
    setShowSubjectModal(false);
  };

  const deleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    setGrades(prev => prev.filter(e => e.subjectId !== id));
  };

  // ── Weight input helper ──────────────────────────────────────────────────────

  const setWeight = (cat: GradeCategory, val: string) => {
    const n = parseInt(val, 10);
    setSubWeights(prev => ({ ...prev, [cat]: isNaN(n) ? 0 : Math.max(0, Math.min(100, n)) }));
  };

  const weightTotal = Object.values(subWeights).reduce((a, b) => a + b, 0);

  // ── Subject detail view ──────────────────────────────────────────────────────

  if (view === 'subject' && selectedSub) {
    const subEntries = focusGrades.filter(
      e => e.subjectId === selectedSub.id && e.semester === activeSem
    );
    const avg = subjectAvgs[selectedSub.id];

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => setView('main')}>
            <Ionicons name="arrow-back" size={20} color={colors.textSub} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={s.subjectTitleRow}>
              <Text style={s.subjectTitle}>{selectedSub.name}</Text>
              {selectedSub.isLK && <View style={s.lkBadge}><Text style={s.lkText}>LK ×2</Text></View>}
            </View>
            <Text style={[font.caption, { marginTop: 2 }]}>Halbjahr {activeSem}</Text>
          </View>
          {avg !== null && (
            <View style={[s.avgBig, { backgroundColor: ptsColor(avg) + '20' }]}>
              <Text style={[s.avgBigNum, { color: ptsColor(avg) }]}>{avg.toFixed(1)}</Text>
              <Text style={[s.avgBigGrade, { color: ptsColor(avg) }]}>{ptsToGrade(Math.round(avg))}</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {/* Per-category breakdown */}
          {CATEGORIES.map(cat => {
            const catEntries = subEntries.filter(e => e.category === cat);
            if (catEntries.length === 0 && selectedSub.weights[cat] === 0) return null;
            const catAvg = catEntries.length > 0
              ? catEntries.reduce((a, e) => a + e.points, 0) / catEntries.length
              : null;
            const w = selectedSub.weights[cat];
            return (
              <View key={cat} style={s.catSection}>
                <View style={s.catHeader}>
                  <Text style={s.catEmoji}>{CAT_ICON[cat]}</Text>
                  <Text style={s.catName}>{cat}</Text>
                  <Text style={s.catWeight}>{w}%</Text>
                  {catAvg !== null && (
                    <View style={[s.catAvgBadge, { backgroundColor: ptsColor(catAvg) + '20' }]}>
                      <Text style={[s.catAvgNum, { color: ptsColor(catAvg) }]}>
                        Ø {catAvg.toFixed(1)} · {ptsToGrade(Math.round(catAvg))}
                      </Text>
                    </View>
                  )}
                </View>

                {catEntries.map(e => (
                  <View key={e.id} style={s.gradeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.gradeLabel}>{e.label}</Text>
                      <Text style={font.caption}>{e.date}</Text>
                    </View>
                    <View style={[s.ptsBadge, { backgroundColor: ptsColor(e.points) + '20' }]}>
                      <Text style={[s.ptsNum, { color: ptsColor(e.points) }]}>{e.points}</Text>
                      <Text style={[s.ptsGrade, { color: ptsColor(e.points) }]}>{ptsToGrade(e.points)}</Text>
                    </View>
                    <TouchableOpacity style={s.delBtn} onPress={() => deleteGrade(e.id)}>
                      <Ionicons name="trash-outline" size={15} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}

                {catEntries.length === 0 && w > 0 && (
                  <Text style={s.noCatText}>Noch keine {cat}-Note</Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={s.addGradeBtn} onPress={() => {
            setAddSubId(selectedSub.id); setShowAddGrade(true);
          }}>
            <Ionicons name="add-circle" size={18} color={colors.accent} />
            <Text style={s.addGradeTxt}>Note hinzufügen</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add grade modal */}
        <AddGradeModal
          visible={showAddGrade}
          onClose={() => setShowAddGrade(false)}
          subjects={gradeSubjects}
          subId={addSubId}
          setSubId={setAddSubId}
          cat={addCat}
          setCat={setAddCat}
          points={addPoints}
          setPoints={setAddPoints}
          label={addLabel}
          setLabel={setAddLabel}
          onSave={addGrade}
          singleSubject
        />
      </SafeAreaView>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color={colors.textSub} />
        </TouchableOpacity>
        <Text style={s.screenTitle}>Noten</Text>
        <TouchableOpacity style={s.configBtn} onPress={() => openSubjectEdit(null)}>
          <Ionicons name="add" size={18} color={colors.bg} />
        </TouchableOpacity>
      </View>

      {/* Semester tabs */}
      <View style={s.semTabs}>
        {([1, 2, 3, 4] as const).map(sem => (
          <TouchableOpacity
            key={sem}
            style={[s.semTab, activeSem === sem && s.semTabActive]}
            onPress={() => setSemester(sem)}
          >
            <Text style={[s.semTabTxt, activeSem === sem && s.semTabTxtActive]}>HJ {sem}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overall average */}
      <View style={s.overallCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.overallLabel}>Gesamtschnitt · Halbjahr {activeSem}</Text>
          <Text style={s.overallSub}>
            {gradeSubjects.filter(s => s.isLK).length} LK · {gradeSubjects.filter(s => !s.isLK).length} GK
          </Text>
        </View>
        {overallAvg !== null ? (
          <View style={[s.overallBadge, { backgroundColor: ptsColor(overallAvg) + '20' }]}>
            <Text style={[s.overallPts, { color: ptsColor(overallAvg) }]}>
              {overallAvg.toFixed(1)}
            </Text>
            <Text style={[s.overallGrade, { color: ptsColor(overallAvg) }]}>
              ≈ {ptsToGrade(Math.round(overallAvg))}
            </Text>
          </View>
        ) : (
          <Text style={font.caption}>Noch keine Noten</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* LK subjects */}
        <Text style={s.groupLabel}>Leistungskurse (×2)</Text>
        {gradeSubjects.filter(s => s.isLK).map(sub => (
          <SubjectCard
            key={sub.id}
            sub={sub}
            avg={subjectAvgs[sub.id]}
            entryCount={focusGrades.filter(e => e.subjectId === sub.id && e.semester === activeSem).length}
            onPress={() => { setSelectedSub(sub); setView('subject'); }}
            onEdit={() => openSubjectEdit(sub)}
            onDelete={() => deleteSubject(sub.id)}
          />
        ))}

        {/* GK subjects */}
        <Text style={[s.groupLabel, { marginTop: sp.lg }]}>Grundkurse</Text>
        {gradeSubjects.filter(s => !s.isLK).map(sub => (
          <SubjectCard
            key={sub.id}
            sub={sub}
            avg={subjectAvgs[sub.id]}
            entryCount={focusGrades.filter(e => e.subjectId === sub.id && e.semester === activeSem).length}
            onPress={() => { setSelectedSub(sub); setView('subject'); }}
            onEdit={() => openSubjectEdit(sub)}
            onDelete={() => deleteSubject(sub.id)}
          />
        ))}

        {gradeSubjects.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="school-outline" size={40} color={colors.textMuted} />
            <Text style={s.emptyTxt}>Keine Fächer konfiguriert</Text>
          </View>
        )}

        <TouchableOpacity style={s.addGradeBtn} onPress={() => {
          setAddSubId(gradeSubjects[0]?.id ?? '');
          setShowAddGrade(true);
        }}>
          <Ionicons name="add-circle" size={18} color={colors.accent} />
          <Text style={s.addGradeTxt}>Note eintragen</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add grade modal */}
      <AddGradeModal
        visible={showAddGrade}
        onClose={() => setShowAddGrade(false)}
        subjects={gradeSubjects}
        subId={addSubId}
        setSubId={setAddSubId}
        cat={addCat}
        setCat={setAddCat}
        points={addPoints}
        setPoints={setAddPoints}
        label={addLabel}
        setLabel={setAddLabel}
        onSave={addGrade}
        singleSubject={false}
      />

      {/* Subject config modal */}
      <Modal visible={showSubjectModal} transparent animationType="slide" onRequestClose={() => setShowSubjectModal(false)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setShowSubjectModal(false)} />
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>{editSub ? 'Fach bearbeiten' : 'Fach hinzufügen'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput style={m.input} placeholder="Fachname" placeholderTextColor={colors.textMuted} value={subName} onChangeText={setSubName} autoFocus />

              <View style={m.switchRow}>
                <View>
                  <Text style={m.switchLabel}>Leistungskurs</Text>
                  <Text style={m.switchSub}>Zählt doppelt im Gesamtschnitt</Text>
                </View>
                <Switch
                  value={subIsLK}
                  onValueChange={setSubIsLK}
                  trackColor={{ false: colors.border, true: colors.accentDim }}
                  thumbColor={subIsLK ? colors.accent : colors.textMuted}
                />
              </View>

              <Text style={[m.sectionLabel, { marginTop: sp.md }]}>
                Gewichtung  <Text style={[m.weightTotal, { color: weightTotal === 100 ? colors.accent : colors.red }]}>
                  {weightTotal}/100
                </Text>
              </Text>
              {CATEGORIES.map(cat => (
                <View key={cat} style={m.weightRow}>
                  <Text style={m.weightCat}>{CAT_ICON[cat]} {cat}</Text>
                  <View style={m.weightInputWrap}>
                    <TextInput
                      style={m.weightInput}
                      value={subWeights[cat] > 0 ? String(subWeights[cat]) : ''}
                      onChangeText={v => setWeight(cat, v)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={m.weightPct}>%</Text>
                  </View>
                </View>
              ))}
              {weightTotal !== 100 && (
                <Text style={m.weightWarn}>Summe muss 100% ergeben</Text>
              )}

              <View style={m.btns}>
                <TouchableOpacity style={m.btnCancel} onPress={() => setShowSubjectModal(false)}>
                  <Text style={{ color: colors.textSub }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[m.btnSave, weightTotal !== 100 && { opacity: 0.4 }]} onPress={saveSubject} disabled={weightTotal !== 100}>
                  <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubjectCard({ sub, avg, entryCount, onPress, onEdit, onDelete }: {
  sub: GradeSubject; avg: number | null; entryCount: number;
  onPress: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={s.subCard} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <View style={s.subCardHeader}>
          <Text style={s.subCardName}>{sub.name}</Text>
          {sub.isLK && <View style={s.lkBadge}><Text style={s.lkText}>LK</Text></View>}
        </View>
        <Text style={font.caption}>{entryCount} Noten · HJ {}</Text>
      </View>
      {avg !== null ? (
        <View style={[s.subAvgBadge, { backgroundColor: ptsColor(avg) + '18' }]}>
          <Text style={[s.subAvgNum, { color: ptsColor(avg) }]}>{avg.toFixed(1)}</Text>
          <Text style={[s.subAvgGrade, { color: ptsColor(avg) }]}>{ptsToGrade(Math.round(avg))}</Text>
        </View>
      ) : (
        <Text style={[font.caption, { marginRight: sp.sm }]}>—</Text>
      )}
      <TouchableOpacity style={s.cardIconBtn} onPress={onEdit}>
        <Ionicons name="pencil" size={14} color={colors.blue} />
      </TouchableOpacity>
      <TouchableOpacity style={s.cardIconBtn} onPress={onDelete}>
        <Ionicons name="trash-outline" size={14} color={colors.red} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function AddGradeModal({ visible, onClose, subjects, subId, setSubId, cat, setCat,
  points, setPoints, label, setLabel, onSave, singleSubject }: {
  visible: boolean; onClose: () => void; subjects: GradeSubject[];
  subId: string; setSubId: (v: string) => void;
  cat: GradeCategory; setCat: (v: GradeCategory) => void;
  points: string; setPoints: (v: string) => void;
  label: string; setLabel: (v: string) => void;
  onSave: () => void; singleSubject: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.title}>Note eintragen</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {!singleSubject && (
              <>
                <Text style={m.sectionLabel}>Fach</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm, marginBottom: sp.sm }}>
                  {subjects.map(sub => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[m.chip, subId === sub.id && m.chipActive]}
                      onPress={() => setSubId(sub.id)}
                    >
                      <Text style={[m.chipTxt, subId === sub.id && m.chipTxtActive]}>{sub.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={m.sectionLabel}>Kategorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm, marginBottom: sp.sm }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[m.chip, cat === c && m.chipActive]}
                  onPress={() => setCat(c)}
                >
                  <Text style={m.chipEmoji}>{CAT_ICON[c]}</Text>
                  <Text style={[m.chipTxt, cat === c && m.chipTxtActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={m.sectionLabel}>Punkte (0 – 15)</Text>
            <View style={m.pointsGrid}>
              {Array.from({ length: 16 }, (_, i) => i).map(p => {
                const sel = points === String(p);
                const c   = ptsColor(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[m.pointBtn, sel && { backgroundColor: c, borderColor: c }]}
                    onPress={() => setPoints(String(p))}
                  >
                    <Text style={[m.pointBtnNum, sel && { color: colors.bg }]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {points !== '' && (
              <View style={m.pointPreview}>
                <Text style={[m.pointPreviewTxt, { color: ptsColor(parseInt(points)) }]}>
                  {parseInt(points)} Punkte · Note {ptsToGrade(parseInt(points))}
                </Text>
              </View>
            )}

            <Text style={[m.sectionLabel, { marginTop: sp.sm }]}>Bezeichnung (optional)</Text>
            <TextInput style={m.input} placeholder="z.B. Klausur 1, Mündliche Prüfung..." placeholderTextColor={colors.textMuted} value={label} onChangeText={setLabel} />

            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={onClose}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={onSave}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: r.xxl, borderTopRightRadius: r.xxl, padding: sp.lg, paddingBottom: 40, borderWidth: 1, borderColor: colors.border, maxHeight: '85%' },
  handle: { width: 36, height: 3, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: sp.lg },
  title: { ...font.h3, marginBottom: sp.md },
  input: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: sp.sm },
  sectionLabel: { ...font.label, marginBottom: sp.sm },
  chip: { paddingHorizontal: sp.md, paddingVertical: 8, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  chipTxtActive: { color: colors.bg },
  chipEmoji: { fontSize: 13 },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  pointBtn: { width: 44, height: 44, borderRadius: r.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pointBtnNum: { fontSize: 15, fontWeight: '700', color: colors.textSub },
  pointPreview: { marginTop: sp.sm, padding: sp.sm, borderRadius: r.md, backgroundColor: colors.card, alignItems: 'center' },
  pointPreviewTxt: { fontSize: 15, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, borderWidth: 1, borderColor: colors.border, marginBottom: sp.sm },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  switchSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: sp.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  weightCat: { fontSize: 14, color: colors.textSub, flex: 1 },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weightInput: { width: 52, backgroundColor: colors.card, borderRadius: r.sm, padding: sp.sm, color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: colors.border },
  weightPct: { fontSize: 13, color: colors.textMuted },
  weightTotal: { fontSize: 12, fontWeight: '700' },
  weightWarn: { fontSize: 12, color: colors.red, marginTop: sp.sm },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  btnCancel: { flex: 1, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  btnSave: { flex: 1, padding: sp.md, borderRadius: r.md, backgroundColor: colors.accent, alignItems: 'center' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: sp.sm, paddingBottom: sp.md, gap: sp.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  configBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  semTabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.card, borderRadius: r.md, padding: 4, marginBottom: sp.md, borderWidth: 1, borderColor: colors.border },
  semTab: { flex: 1, paddingVertical: 8, borderRadius: r.sm, alignItems: 'center' },
  semTabActive: { backgroundColor: colors.accent },
  semTabTxt: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  semTabTxtActive: { color: colors.bg },

  overallCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: colors.card, borderRadius: r.lg, padding: sp.md, marginBottom: sp.md, borderWidth: 1, borderColor: colors.border, gap: sp.md },
  overallLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  overallSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  overallBadge: { alignItems: 'center', paddingHorizontal: sp.md, paddingVertical: sp.sm, borderRadius: r.md },
  overallPts: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  overallGrade: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  groupLabel: { fontSize: 12, fontWeight: '700', color: colors.accent, letterSpacing: 1, marginBottom: sp.sm, paddingTop: sp.sm },

  subCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border, gap: sp.sm },
  subCardHeader: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  subCardName: { fontSize: 16, fontWeight: '600', color: colors.text },
  lkBadge: { backgroundColor: colors.accentDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: r.sm },
  lkText: { fontSize: 10, fontWeight: '800', color: colors.accent },
  subAvgBadge: { alignItems: 'center', paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.md },
  subAvgNum: { fontSize: 18, fontWeight: '800' },
  subAvgGrade: { fontSize: 11, fontWeight: '700' },
  cardIconBtn: { padding: sp.xs },

  catSection: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.sm },
  catEmoji: { fontSize: 16 },
  catName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  catWeight: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  catAvgBadge: { paddingHorizontal: sp.sm, paddingVertical: 3, borderRadius: r.full },
  catAvgNum: { fontSize: 12, fontWeight: '700' },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: sp.sm, borderTopWidth: 1, borderTopColor: colors.border },
  gradeLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  ptsBadge: { alignItems: 'center', paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.md },
  ptsNum: { fontSize: 18, fontWeight: '800' },
  ptsGrade: { fontSize: 10, fontWeight: '700' },
  delBtn: { padding: 6 },
  noCatText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: sp.sm },

  subjectTitleRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  subjectTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  avgBig: { alignItems: 'center', paddingHorizontal: sp.md, paddingVertical: sp.sm, borderRadius: r.md },
  avgBigNum: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  avgBigGrade: { fontSize: 14, fontWeight: '700' },

  addGradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.accent + '50', marginTop: sp.md },
  addGradeTxt: { fontSize: 15, fontWeight: '600', color: colors.accent },

  emptyState: { alignItems: 'center', paddingVertical: sp.xxl, gap: sp.md },
  emptyTxt: { fontSize: 16, fontWeight: '500', color: colors.textSub },
});
