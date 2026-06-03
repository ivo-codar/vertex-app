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

const CATEGORIES: GradeCategory[] = ['Klausur', 'Mündlich', 'Praktisch', 'Test', 'Präsentation'];

const CAT_META: Record<GradeCategory, { icon: string; color: string; desc: string }> = {
  Klausur:      { icon: '📄', color: colors.blue,   desc: 'Schriftliche Prüfung' },
  Mündlich:     { icon: '🗣️', color: colors.teal,   desc: 'Mündliche Leistung' },
  Praktisch:    { icon: '🏃', color: colors.green,  desc: 'Praktische Leistung' },
  Test:         { icon: '✏️', color: colors.amber,  desc: 'Kurztest / Lernkontrolle' },
  Präsentation: { icon: '🎤', color: '#8B7FD4',     desc: 'Referat / Präsentation' },
};

const WEIGHT_OPTIONS = [0.5, 1, 1.5, 2, 3];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ptsToNote(pts: number): string {
  if (pts >= 15) return '1+'; if (pts >= 14) return '1'; if (pts >= 13) return '1−';
  if (pts >= 12) return '2+'; if (pts >= 11) return '2'; if (pts >= 10) return '2−';
  if (pts >= 9)  return '3+'; if (pts >= 8)  return '3'; if (pts >= 7)  return '3−';
  if (pts >= 6)  return '4+'; if (pts >= 5)  return '4'; if (pts >= 4)  return '4−';
  if (pts >= 3)  return '5+'; if (pts >= 2)  return '5'; if (pts >= 1)  return '5−';
  return '6';
}

function ptsToAbiGrade(pts: number): string {
  if (pts >= 13.5) return '1,0'; if (pts >= 12.5) return '1,3'; if (pts >= 11.5) return '1,7';
  if (pts >= 10.5) return '2,0'; if (pts >= 9.5)  return '2,3'; if (pts >= 8.5)  return '2,7';
  if (pts >= 7.5)  return '3,0'; if (pts >= 6.5)  return '3,3'; if (pts >= 5.5)  return '3,7';
  if (pts >= 4.5)  return '4,0'; return 'n.B.';
}

function ptsColor(pts: number): string {
  if (pts >= 13) return colors.accent;
  if (pts >= 10) return colors.teal;
  if (pts >= 7)  return colors.blue;
  if (pts >= 4)  return colors.amber;
  return colors.red;
}

function calcSubjectAvg(
  entries: GradeEntry[], subjectId: string,
  semester: 1 | 2 | 3 | 4 | 'all', weights: CategoryWeights,
): number | null {
  const rel = entries.filter(e =>
    e.subjectId === subjectId && (semester === 'all' || e.semester === semester)
  );
  if (rel.length === 0) return null;

  let weightedSum = 0, usedWeight = 0;
  CATEGORIES.forEach(cat => {
    const catW = weights[cat];
    if (catW <= 0) return;
    const catEntries = rel.filter(e => e.category === cat);
    if (catEntries.length === 0) return;
    // Weighted average within category
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

function calcOverallAvg(
  subjects: GradeSubject[], entries: GradeEntry[],
  semester: 1 | 2 | 3 | 4 | 'all',
): number | null {
  let total = 0, weight = 0;
  subjects.forEach(sub => {
    const avg = calcSubjectAvg(entries, sub.id, semester, sub.weights);
    if (avg === null) return;
    const w = sub.isLK ? 2 : 1;
    total += avg * w; weight += w;
  });
  return weight > 0 ? total / weight : null;
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props { onClose: () => void; }
type ScreenView = 'main' | 'subject';

export default function GradeScreen({ onClose }: Props) {
  const focusGrades   = useStore(s => s.focusGrades);
  const gradeSubjects = useStore(s => s.gradeSubjects);
  const activeSem     = useStore(s => s.activeSemester);
  const storeUpdate   = useStore(s => s.update);

  const setGrades   = (fn: GradeEntry[]    | ((p: GradeEntry[])   => GradeEntry[]))   =>
    storeUpdate(s => ({ focusGrades:   typeof fn === 'function' ? fn(s.focusGrades)   : fn }));
  const setSubjects = (fn: GradeSubject[]  | ((p: GradeSubject[]) => GradeSubject[])) =>
    storeUpdate(s => ({ gradeSubjects: typeof fn === 'function' ? fn(s.gradeSubjects) : fn }));
  const setSemester = (sem: 1 | 2 | 3 | 4) => storeUpdate({ activeSemester: sem });

  // Navigation
  const [view, setView]               = useState<ScreenView>('main');
  const [selectedSub, setSelectedSub] = useState<GradeSubject | null>(null);

  // Grade form state (shared for add + edit)
  const [gradeModal, setGradeModal]   = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formSubId, setFormSubId]     = useState('');
  const [formCat, setFormCat]         = useState<GradeCategory>('Klausur');
  const [formPts, setFormPts]         = useState('');
  const [formLabel, setFormLabel]     = useState('');
  const [formWeight, setFormWeight]   = useState(1);
  const [formSem, setFormSem]         = useState<1|2|3|4>(activeSem);

  // Subject modal
  const [subModal, setSubModal]       = useState(false);
  const [editingSub, setEditingSub]   = useState<GradeSubject | null>(null);
  const [subName, setSubName]         = useState('');
  const [subIsLK, setSubIsLK]         = useState(false);
  const [subWeights, setSubWeights]   = useState<CategoryWeights>(
    { Klausur: 50, Mündlich: 50, Praktisch: 0, Test: 0, Präsentation: 0 }
  );

  // ── Grade form helpers ─────────────────────────────────────────────────────

  const openAddGrade = (subId?: string, cat?: GradeCategory) => {
    setEditingId(null);
    setFormSubId(subId ?? gradeSubjects[0]?.id ?? '');
    setFormCat(cat ?? 'Klausur');
    setFormPts(''); setFormLabel(''); setFormWeight(1);
    setFormSem(activeSem);
    setGradeModal(true);
  };

  const openEditGrade = (e: GradeEntry) => {
    setEditingId(e.id);
    setFormSubId(e.subjectId);
    setFormCat(e.category);
    setFormPts(String(e.points));
    setFormLabel(e.label);
    setFormWeight(e.weight ?? 1);
    setFormSem(e.semester);
    setGradeModal(true);
  };

  const saveGrade = () => {
    const pts = parseInt(formPts, 10);
    if (isNaN(pts) || pts < 0 || pts > 15 || !formSubId) return;
    const sub = gradeSubjects.find(s => s.id === formSubId);
    if (!sub) return;
    const autoLabel = formLabel.trim() ||
      `${formCat} ${focusGrades.filter(e => e.subjectId === formSubId && e.category === formCat).length + (editingId ? 0 : 1)}`;

    if (editingId) {
      setGrades(prev => prev.map(e => e.id === editingId
        ? { ...e, subjectId: formSubId, subject: sub.name, points: pts, category: formCat, label: autoLabel, semester: formSem, weight: formWeight }
        : e
      ));
    } else {
      setGrades(prev => [{
        id: Date.now().toString(), subjectId: formSubId, subject: sub.name,
        points: pts, category: formCat, label: autoLabel,
        date: new Date().toISOString().split('T')[0], semester: formSem, weight: formWeight,
      }, ...prev]);
    }
    setGradeModal(false);
  };

  const deleteGrade = (id: string) =>
    setGrades(prev => prev.filter(e => e.id !== id));

  // ── Subject form helpers ───────────────────────────────────────────────────

  const openAddSubject = () => {
    setEditingSub(null); setSubName(''); setSubIsLK(false);
    setSubWeights({ Klausur: 50, Mündlich: 50, Praktisch: 0, Test: 0, Präsentation: 0 });
    setSubModal(true);
  };

  const openEditSubject = (sub: GradeSubject) => {
    setEditingSub(sub); setSubName(sub.name); setSubIsLK(sub.isLK);
    setSubWeights({ ...sub.weights }); setSubModal(true);
  };

  const saveSubject = () => {
    if (!subName.trim()) return;
    const totalW = Object.values(subWeights).reduce((a, b) => a + b, 0);
    if (totalW !== 100) return;
    if (editingSub) {
      setSubjects(prev => prev.map(s => s.id === editingSub.id
        ? { ...s, name: subName.trim(), isLK: subIsLK, weights: subWeights } : s
      ));
      storeUpdate(s => ({ focusGrades: s.focusGrades.map(e =>
        e.subjectId === editingSub.id ? { ...e, subject: subName.trim() } : e
      )}));
    } else {
      setSubjects(prev => [...prev, {
        id: `gs-${Date.now()}`, name: subName.trim(), isLK: subIsLK, weights: subWeights,
      }]);
    }
    setSubModal(false);
  };

  const deleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    setGrades(prev => prev.filter(e => e.subjectId !== id));
    if (view === 'subject') setView('main');
  };

  // ── Computed ────────────────────────────────────────────────────────────────

  const semAvgs = useMemo(() =>
    ([1,2,3,4] as const).map(sem => calcOverallAvg(gradeSubjects, focusGrades, sem)),
    [gradeSubjects, focusGrades]
  );

  const abiAvg = useMemo(() =>
    calcOverallAvg(gradeSubjects, focusGrades, 'all'),
    [gradeSubjects, focusGrades]
  );

  const subAvgs = useMemo(() =>
    Object.fromEntries(gradeSubjects.map(sub => [
      sub.id, calcSubjectAvg(focusGrades, sub.id, activeSem, sub.weights),
    ])),
    [gradeSubjects, focusGrades, activeSem]
  );

  const weightTotal = Object.values(subWeights).reduce((a, b) => a + b, 0);

  // ── Subject detail view ──────────────────────────────────────────────────────

  if (view === 'subject' && selectedSub) {
    const avg  = subAvgs[selectedSub.id];
    const semEntries = focusGrades.filter(e => e.subjectId === selectedSub.id && e.semester === activeSem);

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn2} onPress={() => setView('main')}>
            <Ionicons name="arrow-back" size={20} color={colors.textSub} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm }}>
              <Text style={s.screenTitle}>{selectedSub.name}</Text>
              {selectedSub.isLK && <View style={s.lkBadge}><Text style={s.lkText}>LK ×2</Text></View>}
            </View>
            <Text style={font.caption}>Halbjahr {activeSem}</Text>
          </View>
          <TouchableOpacity style={s.iconBtn2} onPress={() => openEditSubject(selectedSub)}>
            <Ionicons name="settings-outline" size={18} color={colors.textSub} />
          </TouchableOpacity>
          {avg !== null && (
            <View style={[s.bigBadge, { backgroundColor: ptsColor(avg) + '20' }]}>
              <Text style={[s.bigPts, { color: ptsColor(avg) }]}>{avg.toFixed(1)}</Text>
              <Text style={[s.bigNote, { color: ptsColor(avg) }]}>{ptsToNote(Math.round(avg))}</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {CATEGORIES.map(cat => {
            const catEntries = semEntries
              .filter(e => e.category === cat)
              .sort((a, b) => a.date.localeCompare(b.date));
            const catW = selectedSub.weights[cat];
            if (catEntries.length === 0 && catW === 0) return null;

            const totalW  = catEntries.reduce((a, e) => a + (e.weight ?? 1), 0);
            const catAvg  = totalW > 0
              ? catEntries.reduce((a, e) => a + e.points * (e.weight ?? 1), 0) / totalW
              : null;
            const meta    = CAT_META[cat];

            return (
              <View key={cat} style={s.catCard}>
                {/* Category header */}
                <View style={s.catHeader}>
                  <Text style={s.catIcon}>{meta.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.catName}>{cat}</Text>
                    <Text style={font.caption}>{meta.desc} · Gewichtung {catW}%</Text>
                  </View>
                  {catAvg !== null && (
                    <View style={[s.catAvgBadge, { backgroundColor: ptsColor(catAvg) + '20' }]}>
                      <Text style={[s.catAvgPts, { color: ptsColor(catAvg) }]}>
                        Ø {catAvg.toFixed(1)}
                      </Text>
                      <Text style={[s.catAvgNote, { color: ptsColor(catAvg) }]}>
                        {ptsToNote(Math.round(catAvg))}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity style={s.addCatBtn} onPress={() => openAddGrade(selectedSub.id, cat)}>
                    <Ionicons name="add" size={14} color={colors.bg} />
                  </TouchableOpacity>
                </View>

                {/* Trend chart — only when ≥2 entries */}
                {catEntries.length >= 2 && (
                  <View style={s.trendWrap}>
                    {catEntries.slice(-6).map((e, i) => {
                      const h = Math.max((e.points / 15) * 44, 3);
                      return (
                        <View key={e.id} style={s.trendCol}>
                          <Text style={[s.trendPts, { color: ptsColor(e.points) }]}>{e.points}</Text>
                          <View style={s.trendBg}>
                            <View style={[s.trendFill, { height: h, backgroundColor: ptsColor(e.points) }]} />
                          </View>
                        </View>
                      );
                    })}
                    <View style={s.trendArrow}>
                      <Ionicons name="trending-up" size={16} color={
                        catEntries.length >= 2 && catEntries[catEntries.length-1].points > catEntries[0].points
                          ? colors.accent : colors.textMuted
                      } />
                    </View>
                  </View>
                )}

                {/* Grade entries */}
                {catEntries.length === 0 ? (
                  <Text style={s.noCatTxt}>Noch keine {cat}-Note — tippe + um eine einzutragen</Text>
                ) : (
                  catEntries.map(e => (
                    <View key={e.id} style={s.gradeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.gradeLabel}>{e.label}</Text>
                        <Text style={font.caption}>{e.date} · Gewichtung ×{e.weight}</Text>
                      </View>
                      <View style={[s.ptsBadge, { backgroundColor: ptsColor(e.points) + '18' }]}>
                        <Text style={[s.ptsNum, { color: ptsColor(e.points) }]}>{e.points}</Text>
                        <Text style={[s.ptsNote, { color: ptsColor(e.points) }]}>{ptsToNote(e.points)}</Text>
                      </View>
                      <TouchableOpacity style={{ padding: 6 }} onPress={() => openEditGrade(e)}>
                        <Ionicons name="pencil" size={14} color={colors.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity style={{ padding: 6 }} onPress={() => deleteGrade(e.id)}>
                        <Ionicons name="trash-outline" size={14} color={colors.red} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            );
          })}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Grade form modal */}
        <GradeFormModal
          visible={gradeModal} onClose={() => setGradeModal(false)}
          isEdit={!!editingId}
          subjects={gradeSubjects} subId={formSubId} setSubId={setFormSubId}
          cat={formCat} setCat={setFormCat}
          pts={formPts} setPts={setFormPts}
          label={formLabel} setLabel={setFormLabel}
          weight={formWeight} setWeight={setFormWeight}
          semester={formSem} setSemester={setFormSem}
          onSave={saveGrade} lockSubject
        />

        {/* Subject config modal */}
        <SubjectModal
          visible={subModal} onClose={() => setSubModal(false)}
          isEdit={!!editingSub}
          name={subName} setName={setSubName}
          isLK={subIsLK} setIsLK={setSubIsLK}
          weights={subWeights} setWeights={setSubWeights}
          weightTotal={weightTotal} onSave={saveSubject}
        />
      </SafeAreaView>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn2} onPress={onClose}>
          <Ionicons name="close" size={20} color={colors.textSub} />
        </TouchableOpacity>
        <Text style={s.screenTitle}>Noten</Text>
        <TouchableOpacity style={[s.iconBtn2, { backgroundColor: colors.accent }]} onPress={openAddSubject}>
          <Ionicons name="add" size={18} color={colors.bg} />
        </TouchableOpacity>
      </View>

      {/* Semester tabs */}
      <View style={s.semRow}>
        {([1,2,3,4] as const).map(sem => (
          <TouchableOpacity key={sem} style={[s.semTab, activeSem === sem && s.semTabActive]} onPress={() => setSemester(sem)}>
            <Text style={[s.semTxt, activeSem === sem && s.semTxtActive]}>HJ {sem}</Text>
            {semAvgs[sem-1] !== null && (
              <Text style={[s.semAvg, activeSem === sem && { color: colors.bg }]}>
                {semAvgs[sem-1]!.toFixed(1)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Abitur prognose */}
        <View style={s.abiCard}>
          <View style={s.abiLeft}>
            <Text style={s.abiTitle}>Abitur Prognose</Text>
            <Text style={font.caption}>Alle HJ · LK ×2 gewichtet</Text>
            <View style={s.abiSemRow}>
              {([1,2,3,4] as const).map(sem => {
                const avg = semAvgs[sem-1];
                return (
                  <View key={sem} style={[s.abiSemChip, avg !== null && { borderColor: ptsColor(avg) + '60' }]}>
                    <Text style={s.abiSemLabel}>HJ {sem}</Text>
                    <Text style={[s.abiSemPts, avg !== null && { color: ptsColor(avg) }]}>
                      {avg !== null ? avg.toFixed(1) : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          {abiAvg !== null ? (
            <View style={[s.abiRight, { backgroundColor: ptsColor(abiAvg) + '18' }]}>
              <Text style={[s.abiPts, { color: ptsColor(abiAvg) }]}>{abiAvg.toFixed(1)}</Text>
              <Text style={[s.abiGrade, { color: ptsColor(abiAvg) }]}>{ptsToAbiGrade(abiAvg)}</Text>
              <Text style={[s.abiLabel, { color: ptsColor(abiAvg) }]}>Abi</Text>
            </View>
          ) : (
            <View style={s.abiRight}>
              <Text style={[font.caption, { textAlign: 'center' }]}>Noch{'\n'}keine Daten</Text>
            </View>
          )}
        </View>

        {/* HJ average */}
        {semAvgs[activeSem-1] !== null && (
          <View style={[s.semAvgCard, { borderColor: ptsColor(semAvgs[activeSem-1]!) + '40' }]}>
            <Text style={s.semAvgLabel}>HJ {activeSem} Schnitt</Text>
            <Text style={[s.semAvgPts, { color: ptsColor(semAvgs[activeSem-1]!) }]}>
              {semAvgs[activeSem-1]!.toFixed(1)} Pkt · Note {ptsToAbiGrade(semAvgs[activeSem-1]!)}
            </Text>
          </View>
        )}

        {/* LK */}
        <Text style={s.groupLabel}>Leistungskurse  ×2</Text>
        {gradeSubjects.filter(s => s.isLK).map(sub => (
          <SubjectRow key={sub.id} sub={sub} avg={subAvgs[sub.id]}
            count={focusGrades.filter(e => e.subjectId === sub.id && e.semester === activeSem).length}
            onPress={() => { setSelectedSub(sub); setView('subject'); }}
            onEdit={() => openEditSubject(sub)}
            onDelete={() => deleteSubject(sub.id)}
          />
        ))}

        {/* GK */}
        <Text style={[s.groupLabel, { marginTop: sp.lg }]}>Grundkurse</Text>
        {gradeSubjects.filter(s => !s.isLK).map(sub => (
          <SubjectRow key={sub.id} sub={sub} avg={subAvgs[sub.id]}
            count={focusGrades.filter(e => e.subjectId === sub.id && e.semester === activeSem).length}
            onPress={() => { setSelectedSub(sub); setView('subject'); }}
            onEdit={() => openEditSubject(sub)}
            onDelete={() => deleteSubject(sub.id)}
          />
        ))}

        {gradeSubjects.length === 0 && (
          <View style={s.emptyWrap}>
            <Ionicons name="school-outline" size={40} color={colors.textMuted} />
            <Text style={s.emptyTxt}>Tippe + um dein erstes Fach hinzuzufügen</Text>
          </View>
        )}

        <TouchableOpacity style={s.addBtn} onPress={() => openAddGrade()}>
          <Ionicons name="add-circle" size={18} color={colors.accent} />
          <Text style={s.addBtnTxt}>Note eintragen</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      <GradeFormModal
        visible={gradeModal} onClose={() => setGradeModal(false)}
        isEdit={!!editingId}
        subjects={gradeSubjects} subId={formSubId} setSubId={setFormSubId}
        cat={formCat} setCat={setFormCat}
        pts={formPts} setPts={setFormPts}
        label={formLabel} setLabel={setFormLabel}
        weight={formWeight} setWeight={setFormWeight}
        semester={formSem} setSemester={setFormSem}
        onSave={saveGrade} lockSubject={false}
      />

      <SubjectModal
        visible={subModal} onClose={() => setSubModal(false)}
        isEdit={!!editingSub}
        name={subName} setName={setSubName}
        isLK={subIsLK} setIsLK={setSubIsLK}
        weights={subWeights} setWeights={setSubWeights}
        weightTotal={weightTotal} onSave={saveSubject}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubjectRow({ sub, avg, count, onPress, onEdit, onDelete }: {
  sub: GradeSubject; avg: number | null; count: number;
  onPress: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={s.subRow} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm }}>
          <Text style={s.subName}>{sub.name}</Text>
          {sub.isLK && <View style={s.lkBadge}><Text style={s.lkText}>LK</Text></View>}
        </View>
        <Text style={font.caption}>{count} Noten eingetragen</Text>
      </View>
      {avg !== null ? (
        <View style={[s.subAvgBadge, { backgroundColor: ptsColor(avg) + '18' }]}>
          <Text style={[s.subAvgPts, { color: ptsColor(avg) }]}>{avg.toFixed(1)}</Text>
          <Text style={[s.subAvgNote, { color: ptsColor(avg) }]}>{ptsToNote(Math.round(avg))}</Text>
        </View>
      ) : (
        <Text style={[font.caption, { marginRight: sp.sm }]}>—</Text>
      )}
      <TouchableOpacity style={{ padding: 6 }} onPress={onEdit}>
        <Ionicons name="pencil" size={14} color={colors.blue} />
      </TouchableOpacity>
      <TouchableOpacity style={{ padding: 6 }} onPress={onDelete}>
        <Ionicons name="trash-outline" size={14} color={colors.red} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function GradeFormModal({ visible, onClose, isEdit, subjects, subId, setSubId,
  cat, setCat, pts, setPts, label, setLabel, weight, setWeight,
  semester, setSemester, onSave, lockSubject }: {
  visible: boolean; onClose: () => void; isEdit: boolean;
  subjects: GradeSubject[]; subId: string; setSubId: (v: string) => void;
  cat: GradeCategory; setCat: (v: GradeCategory) => void;
  pts: string; setPts: (v: string) => void;
  label: string; setLabel: (v: string) => void;
  weight: number; setWeight: (v: number) => void;
  semester: 1|2|3|4; setSemester: (v: 1|2|3|4) => void;
  onSave: () => void; lockSubject: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.title}>{isEdit ? 'Note bearbeiten' : 'Note eintragen'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Subject */}
            {!lockSubject && (
              <>
                <Text style={m.label}>Fach</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.chipRow}>
                  {subjects.map(sub => (
                    <TouchableOpacity key={sub.id} style={[m.chip, subId === sub.id && m.chipActive]} onPress={() => setSubId(sub.id)}>
                      <Text style={[m.chipTxt, subId === sub.id && m.chipTxtActive]}>{sub.name}</Text>
                      {sub.isLK && <Text style={[m.chipTxt, { fontSize: 10 }, subId === sub.id && m.chipTxtActive]}> LK</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Category */}
            <Text style={m.label}>Art</Text>
            <View style={m.catGrid}>
              {CATEGORIES.map(c => {
                const meta = CAT_META[c];
                const active = cat === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[m.catBtn, active && { backgroundColor: meta.color + '20', borderColor: meta.color }]}
                    onPress={() => setCat(c)}
                  >
                    <Text style={m.catBtnIcon}>{meta.icon}</Text>
                    <Text style={[m.catBtnTxt, active && { color: meta.color }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Points */}
            <Text style={m.label}>Punkte (0 – 15)</Text>
            <View style={m.ptsGrid}>
              {Array.from({ length: 16 }, (_, i) => i).map(p => {
                const sel = pts === String(p);
                const c   = ptsColor(p);
                return (
                  <TouchableOpacity key={p} style={[m.ptsBtn, sel && { backgroundColor: c, borderColor: c }]} onPress={() => setPts(String(p))}>
                    <Text style={[m.ptsBtnNum, sel && { color: colors.bg }]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {pts !== '' && (
              <View style={m.ptsPreview}>
                <Text style={[m.ptsPrevTxt, { color: ptsColor(parseInt(pts)) }]}>
                  {pts} Punkte · Note {ptsToNote(parseInt(pts))}
                </Text>
              </View>
            )}

            {/* Weight */}
            <Text style={[m.label, { marginTop: sp.sm }]}>Gewichtung dieser Note</Text>
            <View style={m.chipRow}>
              {WEIGHT_OPTIONS.map(w => (
                <TouchableOpacity key={w} style={[m.chip, weight === w && m.chipActive]} onPress={() => setWeight(w)}>
                  <Text style={[m.chipTxt, weight === w && m.chipTxtActive]}>×{w}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Label */}
            <Text style={[m.label, { marginTop: sp.sm }]}>Bezeichnung (optional)</Text>
            <TextInput style={m.input} placeholder="z.B. Klausur 2, Referat Geschichte..." placeholderTextColor={colors.textMuted} value={label} onChangeText={setLabel} />

            {/* Semester */}
            <Text style={[m.label, { marginTop: sp.sm }]}>Halbjahr</Text>
            <View style={m.chipRow}>
              {([1,2,3,4] as const).map(sem => (
                <TouchableOpacity key={sem} style={[m.chip, semester === sem && m.chipActive]} onPress={() => setSemester(sem)}>
                  <Text style={[m.chipTxt, semester === sem && m.chipTxtActive]}>HJ {sem}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={onClose}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={onSave}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>{isEdit ? 'Speichern' : 'Eintragen'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SubjectModal({ visible, onClose, isEdit, name, setName, isLK, setIsLK,
  weights, setWeights, weightTotal, onSave }: {
  visible: boolean; onClose: () => void; isEdit: boolean;
  name: string; setName: (v: string) => void;
  isLK: boolean; setIsLK: (v: boolean) => void;
  weights: CategoryWeights; setWeights: React.Dispatch<React.SetStateAction<CategoryWeights>>;
  weightTotal: number; onSave: () => void;
}) {
  const setW = (cat: GradeCategory, val: string) => {
    const n = parseInt(val, 10);
    setWeights(p => ({ ...p, [cat]: isNaN(n) ? 0 : Math.max(0, Math.min(100, n)) }));
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.title}>{isEdit ? 'Fach bearbeiten' : 'Fach hinzufügen'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput style={m.input} placeholder="Fachname" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus />
            <View style={m.switchRow}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Leistungskurs</Text>
                <Text style={font.caption}>Zählt doppelt im Gesamtschnitt</Text>
              </View>
              <Switch value={isLK} onValueChange={setIsLK} trackColor={{ false: colors.border, true: colors.accentDim }} thumbColor={isLK ? colors.accent : colors.textMuted} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.sm }}>
              <Text style={m.label}>Gewichtung</Text>
              <Text style={[m.label, { color: weightTotal === 100 ? colors.accent : colors.red }]}>{weightTotal}/100%</Text>
            </View>
            {CATEGORIES.map(cat => (
              <View key={cat} style={m.weightRow}>
                <Text style={m.weightLabel}>{CAT_META[cat].icon} {cat}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TextInput style={m.weightInput} value={weights[cat] > 0 ? String(weights[cat]) : ''} onChangeText={v => setW(cat, v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} />
                  <Text style={font.caption}>%</Text>
                </View>
              </View>
            ))}
            {weightTotal !== 100 && <Text style={{ fontSize: 12, color: colors.red, marginTop: sp.xs }}>Summe muss 100% ergeben</Text>}
            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={onClose}><Text style={{ color: colors.textSub }}>Abbrechen</Text></TouchableOpacity>
              <TouchableOpacity style={[m.btnSave, weightTotal !== 100 && { opacity: 0.4 }]} onPress={onSave} disabled={weightTotal !== 100}>
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
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: r.xxl, borderTopRightRadius: r.xxl, padding: sp.lg, paddingBottom: 40, borderWidth: 1, borderColor: colors.border, maxHeight: '90%' },
  handle: { width: 36, height: 3, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: sp.lg },
  title: { ...font.h3, marginBottom: sp.md },
  label: { ...font.label, marginBottom: sp.sm },
  input: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: sp.sm },
  chipRow: { gap: sp.sm, paddingBottom: sp.sm },
  chip: { paddingHorizontal: sp.md, paddingVertical: 8, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  chipTxtActive: { color: colors.bg },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm, marginBottom: sp.sm },
  catBtn: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: sp.sm, padding: sp.sm, borderRadius: r.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  catBtnIcon: { fontSize: 18 },
  catBtnTxt: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  ptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  ptsBtn: { width: 44, height: 44, borderRadius: r.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ptsBtnNum: { fontSize: 15, fontWeight: '700', color: colors.textSub },
  ptsPreview: { marginTop: sp.sm, padding: sp.sm, borderRadius: r.md, backgroundColor: colors.card, alignItems: 'center' },
  ptsPrevTxt: { fontSize: 15, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, borderWidth: 1, borderColor: colors.border, marginBottom: sp.sm },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: sp.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  weightLabel: { fontSize: 14, color: colors.textSub, flex: 1 },
  weightInput: { width: 52, backgroundColor: colors.card, borderRadius: r.sm, padding: sp.sm, color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: colors.border },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  btnCancel: { flex: 1, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  btnSave: { flex: 1, padding: sp.md, borderRadius: r.md, backgroundColor: colors.accent, alignItems: 'center' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: sp.sm, paddingBottom: sp.md, gap: sp.sm },
  iconBtn2: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  screenTitle: { flex: 1, ...font.h2 },
  lkBadge: { backgroundColor: colors.accentDim, paddingHorizontal: 7, paddingVertical: 2, borderRadius: r.sm },
  lkText: { fontSize: 10, fontWeight: '800', color: colors.accent },

  semRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.card, borderRadius: r.md, padding: 4, marginBottom: sp.md, borderWidth: 1, borderColor: colors.border },
  semTab: { flex: 1, paddingVertical: sp.sm, borderRadius: r.sm, alignItems: 'center' },
  semTabActive: { backgroundColor: colors.accent },
  semTxt: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  semTxtActive: { color: colors.bg },
  semAvg: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 1 },

  abiCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: r.lg, padding: sp.md, marginBottom: sp.md, borderWidth: 1, borderColor: colors.border, gap: sp.md },
  abiLeft: { flex: 1 },
  abiTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  abiSemRow: { flexDirection: 'row', gap: sp.xs, marginTop: sp.sm },
  abiSemChip: { flex: 1, backgroundColor: colors.bg, borderRadius: r.sm, padding: sp.xs, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  abiSemLabel: { fontSize: 9, fontWeight: '600', color: colors.textMuted },
  abiSemPts: { fontSize: 13, fontWeight: '800', color: colors.textSub },
  abiRight: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: sp.md, paddingVertical: sp.sm, borderRadius: r.md, minWidth: 64 },
  abiPts: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  abiGrade: { fontSize: 15, fontWeight: '700' },
  abiLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  semAvgCard: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  semAvgLabel: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  semAvgPts: { fontSize: 14, fontWeight: '800' },

  groupLabel: { fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1.5, marginBottom: sp.sm },

  subRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border, gap: sp.xs },
  subName: { fontSize: 16, fontWeight: '600', color: colors.text },
  subAvgBadge: { alignItems: 'center', paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.md },
  subAvgPts: { fontSize: 18, fontWeight: '800' },
  subAvgNote: { fontSize: 10, fontWeight: '700' },

  catCard: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.sm },
  catIcon: { fontSize: 18 },
  catName: { fontSize: 15, fontWeight: '600', color: colors.text },
  catAvgBadge: { paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.md, alignItems: 'center' },
  catAvgPts: { fontSize: 14, fontWeight: '800' },
  catAvgNote: { fontSize: 10, fontWeight: '700' },
  addCatBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  trendWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginBottom: sp.sm, paddingBottom: sp.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  trendCol: { flex: 1, alignItems: 'center', gap: 3 },
  trendPts: { fontSize: 10, fontWeight: '700' },
  trendBg: { width: '100%', height: 44, backgroundColor: colors.bg, borderRadius: r.sm, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  trendFill: { width: '100%', borderRadius: r.sm },
  trendArrow: { paddingLeft: sp.xs, paddingBottom: sp.xs, alignSelf: 'flex-end' },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, paddingVertical: sp.sm, borderTopWidth: 1, borderTopColor: colors.border },
  gradeLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  ptsBadge: { alignItems: 'center', paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.md },
  ptsNum: { fontSize: 18, fontWeight: '800' },
  ptsNote: { fontSize: 10, fontWeight: '700' },
  noCatTxt: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: sp.sm },

  bigBadge: { alignItems: 'center', paddingHorizontal: sp.md, paddingVertical: sp.sm, borderRadius: r.md },
  bigPts: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  bigNote: { fontSize: 13, fontWeight: '700' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.accent + '50', marginTop: sp.md },
  addBtnTxt: { fontSize: 15, fontWeight: '600', color: colors.accent },
  emptyWrap: { alignItems: 'center', paddingVertical: sp.xxl, gap: sp.md },
  emptyTxt: { fontSize: 15, color: colors.textSub, textAlign: 'center' },
});
