import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font, fx } from '../../theme';
import { ExerciseRecord, ExerciseEntry, SetEntry, TrainingSplit, SplitDay } from '../../types';
import WeeklyChart from '../../components/WeeklyChart';
import { SimpleBarChart, StatBox } from '../../components/SharedCharts';
import { useStore, todayDow } from '../../store';

// ── Types local to this screen ────────────────────────────────────────────────

type LiveSet = { id: string; weight: string; reps: string; done: boolean };
type LiveExercise = { name: string; sets: LiveSet[] };
type ActiveWorkout = { dayName: string; exercises: LiveExercise[]; startedAt: number };

// ── Helpers ────────────────────────────────────────────────────────────────────

const newSet = (): LiveSet => ({ id: Date.now().toString() + Math.random(), weight: '', reps: '', done: false });
const todayISO = () => new Date().toISOString().split('T')[0];

function fmtTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function getProgress(record: ExerciseRecord): { pct: number; dir: 'up' | 'down' | 'same' } | null {
  if (record.entries.length < 2) return null;
  const first  = record.entries[record.entries.length - 1].maxWeight;
  const latest = record.entries[0].maxWeight;
  if (first === 0) return null;
  const pct = ((latest - first) / first) * 100;
  return { pct: Math.abs(Math.round(pct * 10) / 10), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'same' };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GymScreen() {
  const splits   = useStore(s => s.gymSplits);
  const records  = useStore(s => s.gymRecords);
  const weekData = useStore(s => s.gymWeek.data);
  const update   = useStore(s => s.update);
  const addToWeek = useStore(s => s.addToWeek);

  const setSplits  = (fn: TrainingSplit[] | ((p: TrainingSplit[]) => TrainingSplit[])) =>
    update(s => ({ gymSplits: typeof fn === 'function' ? fn(s.gymSplits) : fn }));
  const setRecords = (fn: ExerciseRecord[] | ((p: ExerciseRecord[]) => ExerciseRecord[])) =>
    update(s => ({ gymRecords: typeof fn === 'function' ? fn(s.gymRecords) : fn }));

  const [activeDay, setActiveDay] = useState<SplitDay | null>(null);
  const [workout, setWorkout]     = useState<ActiveWorkout | null>(null);

  // Modals
  const [showCreateSplit, setShowCreateSplit] = useState(false);
  const [editingSplitDay, setEditingSplitDay] = useState<{ splitId: string; day: SplitDay } | null>(null);
  const [editDayName, setEditDayName]         = useState('');
  const [editDayExInput, setEditDayExInput]   = useState('');
  const [editDayExercises, setEditDayExercises] = useState<string[]>([]);
  const [showHistory, setShowHistory]         = useState<ExerciseRecord | null>(null);
  const [showAddEx, setShowAddEx]             = useState(false);
  const [newExName, setNewExName]             = useState('');

  // Create Split state
  const [splitName, setSplitName] = useState('');
  const [splitDayInputs, setSplitDayInputs] = useState<{ name: string; exInput: string; exercises: string[] }[]>([
    { name: 'Tag A', exInput: '', exercises: [] },
  ]);

  // ── Split day editing ────────────────────────────────────────────────────────
  const openEditSplitDay = (splitId: string, day: SplitDay) => {
    setEditingSplitDay({ splitId, day });
    setEditDayName(day.name);
    setEditDayExercises([...day.exercises]);
    setEditDayExInput('');
  };

  const saveEditSplitDay = () => {
    if (!editingSplitDay) return;
    setSplits(prev => prev.map(sp => sp.id === editingSplitDay.splitId
      ? { ...sp, days: sp.days.map(d => d.id === editingSplitDay.day.id
          ? { ...d, name: editDayName.trim() || d.name, exercises: editDayExercises }
          : d) }
      : sp
    ));
    setEditingSplitDay(null);
  };

  const addExToEditDay = () => {
    if (!editDayExInput.trim()) return;
    setEditDayExercises(p => [...p, editDayExInput.trim()]);
    setEditDayExInput('');
  };

  // ── Split creation helpers ─────────────────────────────────────────────────

  const addSplitDayRow = () =>
    setSplitDayInputs(p => [...p, { name: `Tag ${String.fromCharCode(65 + p.length)}`, exInput: '', exercises: [] }]);

  const removeSplitDayRow = (i: number) =>
    setSplitDayInputs(p => p.filter((_, idx) => idx !== i));

  const updateSplitDayName = (i: number, name: string) =>
    setSplitDayInputs(p => p.map((d, idx) => idx === i ? { ...d, name } : d));

  const updateSplitDayExInput = (i: number, val: string) =>
    setSplitDayInputs(p => p.map((d, idx) => idx === i ? { ...d, exInput: val } : d));

  const addExToDayRow = (i: number) => {
    const row = splitDayInputs[i];
    if (!row.exInput.trim()) return;
    setSplitDayInputs(p => p.map((d, idx) =>
      idx === i ? { ...d, exercises: [...d.exercises, d.exInput.trim()], exInput: '' } : d
    ));
  };

  const removeExFromRow = (dayIdx: number, exIdx: number) =>
    setSplitDayInputs(p => p.map((d, i) =>
      i === dayIdx ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) } : d
    ));

  const saveSplit = () => {
    if (!splitName.trim()) return;
    const newSplit: TrainingSplit = {
      id: Date.now().toString(),
      name: splitName.trim(),
      days: splitDayInputs
        .filter(d => d.name.trim())
        .map(d => ({
          id: Date.now().toString() + Math.random(),
          name: d.name.trim(),
          exercises: d.exercises,
        })),
    };
    setSplits(p => [...p, newSplit]);
    setSplitName('');
    setSplitDayInputs([{ name: 'Tag A', exInput: '', exercises: [] }]);
    setShowCreateSplit(false);
  };

  // ── Workout helpers ───────────────────────────────────────────────────────

  const startWorkout = () => {
    if (!activeDay) return;
    const exercises: LiveExercise[] = activeDay.exercises.map(name => ({
      name,
      sets: [newSet()],
    }));
    setWorkout({ dayName: activeDay.name, exercises, startedAt: Date.now() });
  };

  const addExerciseToWorkout = () => {
    if (!newExName.trim() || !workout) return;
    setWorkout(w => w ? { ...w, exercises: [...w.exercises, { name: newExName.trim(), sets: [newSet()] }] } : w);
    setNewExName('');
    setShowAddEx(false);
  };

  const addSet = (exIdx: number) => {
    setWorkout(w => {
      if (!w) return w;
      return {
        ...w,
        exercises: w.exercises.map((ex, i) =>
          i === exIdx ? { ...ex, sets: [...ex.sets, newSet()] } : ex
        ),
      };
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setWorkout(w => {
      if (!w) return w;
      return {
        ...w,
        exercises: w.exercises.map((ex, i) =>
          i === exIdx ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) } : ex
        ),
      };
    });
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', val: string) => {
    setWorkout(w => {
      if (!w) return w;
      return {
        ...w,
        exercises: w.exercises.map((ex, i) =>
          i === exIdx
            ? { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: val } : s) }
            : ex
        ),
      };
    });
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    setWorkout(w => {
      if (!w) return w;
      return {
        ...w,
        exercises: w.exercises.map((ex, i) =>
          i === exIdx
            ? { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, done: !s.done } : s) }
            : ex
        ),
      };
    });
  };

  const finishWorkout = () => {
    if (!workout) return;
    const today   = todayISO();
    const base    = Date.now();
    let   counter = 0;
    let   totalSets = 0;

    // Build all updates first — one setRecords call avoids duplicate-ID race
    type Update = { name: string; entry: ExerciseEntry };
    const updates: Update[] = [];

    workout.exercises.forEach(ex => {
      const done = ex.sets.filter(s => s.done && s.weight && s.reps);
      if (done.length === 0) return;
      totalSets += done.length;

      const setEntries: SetEntry[] = done.map(s => ({
        id: s.id, weight: Number(s.weight), reps: Number(s.reps),
      }));
      const maxW = Math.max(...setEntries.map(s => s.weight));
      updates.push({
        name: ex.name,
        entry: { id: `e-${base}-${counter++}`, date: today, sets: setEntries, maxWeight: maxW },
      });
    });

    // Single state update — no duplicate keys possible
    setRecords(prev => {
      let next = [...prev];
      updates.forEach(({ name, entry }) => {
        const idx = next.findIndex(r => r.name === name);
        if (idx >= 0) {
          next = next.map((r, i) =>
            i === idx ? { ...r, entries: [entry, ...r.entries] } : r
          );
        } else {
          next = [...next, { id: `r-${base}-${counter++}`, name, unit: 'kg' as const, entries: [entry] }];
        }
      });
      return next;
    });

    addToWeek('gymWeek', todayDow(), totalSets);
    setWorkout(null);
  };

  const confirmFinish = () =>
    Alert.alert('Workout beenden', 'Alle erledigten Sätze werden gespeichert.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Beenden', onPress: finishWorkout },
    ]);

  // ── Last session max weight for a given exercise ──────────────────────────
  const lastMax = (name: string): number | null => {
    const rec = records.find(r => r.name === name);
    return rec?.entries[0]?.maxWeight ?? null;
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Header ── */}
        <View style={s.pageHeader}>
          <View>
            <Text style={s.kicker}>Performance Bay</Text>
            <Text style={font.h2}>Gym</Text>
          </View>
          {!workout && (
            <TouchableOpacity style={s.createSplitBtn} onPress={() => setShowCreateSplit(true)}>
              <Ionicons name="add" size={15} color={colors.bg} />
              <Text style={s.createSplitTxt}>Split</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Splits ── */}
        {splits.length === 0 && !workout && (
          <View style={s.emptySection}>
            <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Kein Trainingsplan</Text>
            <Text style={s.emptySub}>Erstelle deinen Split (z.B. Push Pull Legs)</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreateSplit(true)}>
              <Text style={{ color: colors.bg, fontWeight: '700' }}>Split erstellen</Text>
            </TouchableOpacity>
          </View>
        )}

        {splits.length > 0 && !workout && (
          <>
            <Label text="Trainingstage" />
            {splits.map(split => (
              <View key={split.id} style={s.splitCard}>
                <View style={s.splitHeader}>
                  <Text style={s.splitName}>{split.name}</Text>
                  <TouchableOpacity onPress={() => setSplits(p => p.filter(sp => sp.id !== split.id))}>
                    <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayChips}>
                  {split.days.map(day => {
                    const isActive = activeDay?.id === day.id;
                    return (
                      <View key={day.id} style={s.dayChipWrap}>
                        <TouchableOpacity
                          style={[s.dayChip, isActive && s.dayChipActive]}
                          onPress={() => setActiveDay(isActive ? null : day)}
                        >
                          <Text style={[s.dayChipText, isActive && s.dayChipTextActive]}>{day.name}</Text>
                          <Text style={[s.dayChipCount, isActive && { color: colors.bg + 'BB' }]}>
                            {day.exercises.length} Übungen
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.dayEditBtn}
                          onPress={() => openEditSplitDay(split.id, day)}
                        >
                          <Ionicons name="pencil" size={12} color={colors.blue} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
                {activeDay && split.days.some(d => d.id === activeDay.id) && (
                  <View style={s.startRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.startDayName}>{activeDay.name}</Text>
                      <Text style={s.startExList} numberOfLines={1}>
                        {activeDay.exercises.join(', ') || 'Keine Übungen vorgeplant'}
                      </Text>
                    </View>
                    <TouchableOpacity style={s.startBtn} onPress={startWorkout}>
                      <Ionicons name="play" size={16} color={colors.bg} />
                      <Text style={s.startBtnTxt}>Starten</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Active Workout ── */}
        {workout && (
          <>
            {/* Workout header */}
            <View style={s.workoutHeader}>
              <View>
                <Text style={s.workoutDayName}>{workout.dayName}</Text>
              </View>
              <TouchableOpacity style={s.finishBtn} onPress={confirmFinish}>
                <Ionicons name="checkmark" size={16} color={colors.bg} />
                <Text style={s.finishBtnTxt}>Beenden</Text>
              </TouchableOpacity>
            </View>

            {/* Exercise cards */}
            {workout.exercises.map((ex, exIdx) => {
              const last = lastMax(ex.name);
              const doneSets = ex.sets.filter(s => s.done).length;
              return (
                <View key={exIdx} style={s.exCard}>
                  <View style={s.exCardHeader}>
                    <Text style={s.exCardName}>{ex.name}</Text>
                    <View style={s.exCardRight}>
                      {last !== null && (
                        <View style={s.lastBadge}>
                          <Text style={s.lastBadgeTxt}>Zuletzt: {last}kg</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={s.historyBtn}
                        onPress={() => {
                          const rec = records.find(r => r.name === ex.name);
                          if (rec) setShowHistory(rec);
                        }}
                      >
                        <Ionicons name="stats-chart" size={14} color={colors.blue} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sets header */}
                  <View style={s.setsHeader}>
                    <Text style={[s.setCol, { flex: 0.4 }]}>#</Text>
                    <Text style={[s.setCol, { flex: 1 }]}>kg</Text>
                    <Text style={[s.setCol, { flex: 1 }]}>Wdh</Text>
                    <Text style={[s.setCol, { flex: 0.5 }]}>✓</Text>
                  </View>

                  {ex.sets.map((set, si) => (
                    <View key={set.id} style={[s.setRow, set.done && s.setRowDone]}>
                      <Text style={[s.setNum, { flex: 0.4 }]}>{si + 1}</Text>
                      <TextInput
                        style={[s.setInput, { flex: 1 }]}
                        value={set.weight}
                        onChangeText={v => updateSet(exIdx, si, 'weight', v)}
                        placeholder="—"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!set.done}
                      />
                      <TextInput
                        style={[s.setInput, { flex: 1 }]}
                        value={set.reps}
                        onChangeText={v => updateSet(exIdx, si, 'reps', v)}
                        placeholder="—"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!set.done}
                      />
                      <View style={{ flex: 0.5, flexDirection: 'row', gap: 4, justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                          style={[s.checkBtn, set.done && s.checkBtnDone]}
                          onPress={() => toggleSetDone(exIdx, si)}
                        >
                          {set.done && <Ionicons name="checkmark" size={12} color={colors.bg} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeSet(exIdx, si)}>
                          <Ionicons name="close" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={s.addSetRow} onPress={() => addSet(exIdx)}>
                    <Ionicons name="add" size={14} color={colors.accent} />
                    <Text style={s.addSetTxt}>Satz hinzufügen</Text>
                  </TouchableOpacity>

                  {doneSets > 0 && (
                    <Text style={s.setsProgress}>{doneSets}/{ex.sets.length} Sätze ✓</Text>
                  )}
                </View>
              );
            })}

            {/* Add exercise button */}
            <TouchableOpacity style={s.addExBtn} onPress={() => setShowAddEx(true)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text style={s.addExTxt}>Übung hinzufügen</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Exercise History ── */}
        {records.length > 0 && (
          <>
            <Label text="Alle Übungen" />
            {records.map(rec => {
              const prog = getProgress(rec);
              const last = rec.entries[0];
              return (
                <TouchableOpacity key={rec.id} style={s.recCard} onPress={() => setShowHistory(rec)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recName}>{rec.name}</Text>
                    {last && (
                      <Text style={s.recSub}>
                        Zuletzt: {last.maxWeight}kg · {last.sets.length} Sätze · {last.date}
                      </Text>
                    )}
                  </View>
                  {prog !== null && (
                    <View style={[s.progBadge, { backgroundColor: prog.dir === 'up' ? colors.accentDim : colors.amberDim }]}>
                      <Ionicons
                        name={prog.dir === 'up' ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={prog.dir === 'up' ? colors.accent : colors.amber}
                      />
                      <Text style={[s.progTxt, { color: prog.dir === 'up' ? colors.accent : colors.amber }]}>
                        {prog.dir === 'up' ? '+' : '-'}{prog.pct}%
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Weekly Chart ── */}
        {records.length > 0 && (
          <>
            <Label text="Fortschritt" />
            {records.map(rec => {
              if (rec.entries.length === 0) return null;
              const cur  = rec.entries[0];
              const prev = rec.entries[1];
              const wDiff  = prev ? cur.maxWeight - prev.maxWeight : null;
              const curMaxR  = cur.sets.reduce((a, s) => Math.max(a, s.reps), 0);
              const prevMaxR = prev ? prev.sets.reduce((a, s) => Math.max(a, s.reps), 0) : null;
              const rDiff  = prevMaxR !== null ? curMaxR - prevMaxR : null;
              const pct    = prev && prev.maxWeight > 0
                ? Math.round((cur.maxWeight - prev.maxWeight) / prev.maxWeight * 1000) / 10
                : null;
              return (
                <TouchableOpacity key={rec.id} style={s.progressCard} onPress={() => setShowHistory(rec)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.progressName}>{rec.name}</Text>
                    <Text style={s.progressSub}>{cur.maxWeight}kg · {curMaxR} Wdh · {cur.date}</Text>
                  </View>
                  {wDiff !== null && wDiff !== 0 && (
                    <View style={[s.diffBadge, { backgroundColor: (wDiff > 0 ? colors.accent : colors.red) + '20' }]}>
                      <Text style={[s.diffTxt, { color: wDiff > 0 ? colors.accent : colors.red }]}>
                        {wDiff > 0 ? '+' : ''}{wDiff}kg
                      </Text>
                    </View>
                  )}
                  {wDiff === 0 && rDiff !== null && rDiff !== 0 && (
                    <View style={[s.diffBadge, { backgroundColor: (rDiff > 0 ? colors.teal : colors.amber) + '20' }]}>
                      <Text style={[s.diffTxt, { color: rDiff > 0 ? colors.teal : colors.amber }]}>
                        {rDiff > 0 ? '+' : ''}{rDiff} Wdh
                      </Text>
                    </View>
                  )}
                  {pct !== null && pct !== 0 && (
                    <View style={[s.diffBadge, { backgroundColor: (pct > 0 ? colors.accent : colors.red) + '12', marginLeft: 3 }]}>
                      <Text style={[s.diffTxt, { color: pct > 0 ? colors.accent : colors.red, fontSize: 10 }]}>
                        {pct > 0 ? '+' : ''}{pct}%
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Create Split Modal ── */}
      <Modal visible={showCreateSplit} transparent animationType="slide" onRequestClose={() => setShowCreateSplit(false)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setShowCreateSplit(false)} />
          <View style={[m.sheet, { maxHeight: '90%' }]}>
            <View style={m.handle} />
            <Text style={m.title}>Trainingsplan erstellen</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput
                style={m.input}
                placeholder="Name (z.B. Push Pull Legs)"
                placeholderTextColor={colors.textMuted}
                value={splitName}
                onChangeText={setSplitName}
                autoFocus
              />
              <Text style={[font.label, { marginTop: sp.lg, marginBottom: sp.sm }]}>Trainingstage</Text>
              {splitDayInputs.map((day, di) => (
                <View key={di} style={m.dayRow}>
                  <View style={m.dayRowTop}>
                    <TextInput
                      style={[m.input, { flex: 1 }]}
                      value={day.name}
                      onChangeText={v => updateSplitDayName(di, v)}
                      placeholder="Tag Name (z.B. Push)"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity style={m.removeDay} onPress={() => removeSplitDayRow(di)}>
                      <Ionicons name="close" size={16} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                  {/* Exercise input for this day */}
                  <View style={m.exInputRow}>
                    <TextInput
                      style={[m.input, { flex: 1 }]}
                      value={day.exInput}
                      onChangeText={v => updateSplitDayExInput(di, v)}
                      placeholder="Übung hinzufügen..."
                      placeholderTextColor={colors.textMuted}
                      onSubmitEditing={() => addExToDayRow(di)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={m.addExDayBtn} onPress={() => addExToDayRow(di)}>
                      <Ionicons name="add" size={18} color={colors.bg} />
                    </TouchableOpacity>
                  </View>
                  {day.exercises.length > 0 && (
                    <View style={m.exChips}>
                      {day.exercises.map((ex, ei) => (
                        <TouchableOpacity key={ei} style={m.exChip} onPress={() => removeExFromRow(di, ei)}>
                          <Text style={m.exChipTxt}>{ex}</Text>
                          <Ionicons name="close" size={10} color={colors.accent} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              <TouchableOpacity style={m.addDayBtn} onPress={addSplitDayRow}>
                <Ionicons name="add" size={15} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Tag hinzufügen</Text>
              </TouchableOpacity>
              <View style={m.btns}>
                <TouchableOpacity style={m.btnCancel} onPress={() => setShowCreateSplit(false)}>
                  <Text style={{ color: colors.textSub }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={m.btnSave} onPress={saveSplit}>
                  <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Split Day Modal ── */}
      <Modal visible={!!editingSplitDay} transparent animationType="slide" onRequestClose={() => setEditingSplitDay(null)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setEditingSplitDay(null)} />
          <View style={[m.sheet, { maxHeight: '75%' }]}>
            <View style={m.handle} />
            <Text style={m.title}>Tag bearbeiten</Text>
            <TextInput style={m.input} value={editDayName} onChangeText={setEditDayName} placeholder="Tag Name" placeholderTextColor={colors.textMuted} />
            <Text style={[m.title, { fontSize: 13, marginTop: sp.md, marginBottom: sp.sm }]}>Übungen</Text>
            <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
              {editDayExercises.map((ex, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.xs }}>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{ex}</Text>
                  <TouchableOpacity onPress={() => setEditDayExercises(p => p.filter((_, j) => j !== i))}>
                    <Ionicons name="close" size={16} color={colors.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={m.exInputRow}>
              <TextInput
                style={[m.input, { flex: 1 }]}
                value={editDayExInput}
                onChangeText={setEditDayExInput}
                placeholder="Übung hinzufügen..."
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addExToEditDay}
                returnKeyType="done"
              />
              <TouchableOpacity style={m.addExDayBtn} onPress={addExToEditDay}>
                <Ionicons name="add" size={18} color={colors.bg} />
              </TouchableOpacity>
            </View>
            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={() => setEditingSplitDay(null)}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={saveEditSplitDay}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Exercise to Workout Modal ── */}
      <Modal visible={showAddEx} transparent animationType="slide" onRequestClose={() => setShowAddEx(false)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setShowAddEx(false)} />
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>Übung hinzufügen</Text>
            <TextInput
              style={m.input}
              placeholder="Name (z.B. Incline Bench)"
              placeholderTextColor={colors.textMuted}
              value={newExName}
              onChangeText={setNewExName}
              autoFocus
            />
            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={() => setShowAddEx(false)}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={addExerciseToWorkout}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Exercise History Modal ── */}
      <Modal visible={!!showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(null)}>
        {showHistory && <ExerciseHistorySheet record={showHistory} onClose={() => setShowHistory(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

// ── Exercise History Sheet ────────────────────────────────────────────────────

function ExerciseHistorySheet({ record, onClose }: { record: ExerciseRecord; onClose: () => void }) {
  const prog = getProgress(record);
  const weights = record.entries.map(e => e.maxWeight).reverse();
  const labels  = record.entries.map(e => e.date.slice(5)).reverse(); // MM-DD

  return (
    <SafeAreaView style={hs.safe} edges={['top']}>
      <View style={hs.header}>
        <TouchableOpacity style={hs.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color={colors.textSub} />
        </TouchableOpacity>
        <Text style={hs.title}>{record.name}</Text>
        {prog !== null && (
          <View style={[hs.prog, { backgroundColor: prog.dir === 'up' ? colors.accentDim : colors.amberDim }]}>
            <Ionicons name={prog.dir === 'up' ? 'trending-up' : 'trending-down'} size={13} color={prog.dir === 'up' ? colors.accent : colors.amber} />
            <Text style={[hs.progTxt, { color: prog.dir === 'up' ? colors.accent : colors.amber }]}>
              {prog.dir === 'up' ? '+' : '-'}{prog.pct}%
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={hs.content}>
        {/* Weight progression chart */}
        {weights.length > 0 && (
          <View style={hs.chartCard}>
            <Text style={[font.label, { marginBottom: sp.sm }]}>Gewichtsprogression</Text>
            <SimpleBarChart labels={labels} values={weights} color={colors.accent} unit="kg" />
          </View>
        )}

        {/* Stats */}
        <View style={hs.statsRow}>
          <StatBox label="Max Gewicht" value={`${Math.max(...record.entries.map(e => e.maxWeight))}kg`} color={colors.accent} />
          <StatBox label="Sessions" value={String(record.entries.length)} color={colors.blue} />
          <StatBox label="Ø Gewicht" value={`${Math.round(record.entries.reduce((a,e) => a + e.maxWeight, 0) / record.entries.length)}kg`} color={colors.teal} />
        </View>

        {/* Entry list */}
        <Text style={[font.label, { marginTop: sp.lg, marginBottom: sp.sm }]}>Verlauf</Text>
        {record.entries.map(entry => (
          <View key={entry.id} style={hs.entryCard}>
            <View style={hs.entryHeader}>
              <Text style={hs.entryDate}>{entry.date}</Text>
              <Text style={[hs.entryMax, { color: colors.accent }]}>Max: {entry.maxWeight}kg</Text>
            </View>
            {entry.sets.map((set, si) => (
              <View key={set.id} style={hs.setRow}>
                <Text style={hs.setLabel}>Satz {si + 1}</Text>
                <Text style={hs.setVal}>{set.weight}kg × {set.reps} Wdh</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ text }: { text: string }) {
  return <Text style={[font.label, { marginTop: sp.lg, marginBottom: sp.sm }]}>{text}</Text>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const hs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: sp.md, gap: sp.sm },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
  prog: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.full },
  progTxt: { fontSize: 13, fontWeight: '700' },
  content: { paddingHorizontal: sp.md, paddingBottom: 32 },
  chartCard: { backgroundColor: colors.card, borderRadius: r.lg, padding: sp.md, borderWidth: 1, borderColor: colors.border, marginBottom: sp.md },
  statsRow: { flexDirection: 'row', gap: sp.sm },
  entryCard: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sp.sm },
  entryDate: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  entryMax: { fontSize: 13, fontWeight: '700' },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderTopWidth: 1, borderTopColor: colors.border },
  setLabel: { fontSize: 12, color: colors.textMuted },
  setVal: { fontSize: 12, fontWeight: '600', color: colors.text },
});

const m = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: sp.lg, paddingBottom: 40, borderWidth: 1, borderColor: colors.border },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: sp.lg },
  title: { ...font.h3, marginBottom: sp.md },
  input: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  dayRow: { backgroundColor: colors.bg, borderRadius: r.md, padding: sp.sm, marginBottom: sp.sm, gap: sp.sm, borderWidth: 1, borderColor: colors.border },
  dayRowTop: { flexDirection: 'row', gap: sp.sm, alignItems: 'center' },
  removeDay: { padding: sp.sm },
  exInputRow: { flexDirection: 'row', gap: sp.sm, alignItems: 'center' },
  addExDayBtn: { width: 40, height: 40, borderRadius: r.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  exChips: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  exChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentDim, borderRadius: r.full, paddingHorizontal: sp.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.accent + '40' },
  exChipTxt: { fontSize: 12, fontWeight: '600', color: colors.accent },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, padding: sp.sm, marginTop: sp.sm },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  btnCancel: { flex: 1, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  btnSave: { flex: 1, padding: sp.md, borderRadius: r.md, backgroundColor: colors.accent, alignItems: 'center' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: sp.lg, marginBottom: sp.sm },
  kicker: { fontSize: 12, fontWeight: '800', color: colors.accent, letterSpacing: 1.3, marginBottom: 3 },
  createSplitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, borderRadius: r.full, paddingHorizontal: sp.md, paddingVertical: 6 },
  createSplitTxt: { fontSize: 13, fontWeight: '700', color: colors.bg },

  emptySection: { ...fx.card, alignItems: 'center', padding: sp.xl, gap: sp.md, marginTop: sp.md, borderRadius: r.xl },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSub },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.accent, borderRadius: r.full, paddingHorizontal: sp.lg, paddingVertical: sp.sm },

  splitCard: { ...fx.card, borderRadius: r.xl, padding: sp.md, marginTop: sp.sm },
  splitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.sm },
  splitName: { fontSize: 15, fontWeight: '700', color: colors.text },
  dayChips: { gap: sp.sm, paddingRight: sp.sm },
  dayChipWrap: { alignItems: 'center', gap: 3 },
  dayChip: { paddingHorizontal: sp.md, paddingVertical: sp.sm, borderRadius: r.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dayChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipText: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  dayEditBtn: { padding: 3 },
  progressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border, gap: sp.sm },
  progressName: { fontSize: 15, fontWeight: '600', color: colors.text },
  progressSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  diffBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: r.full },
  diffTxt: { fontSize: 12, fontWeight: '700' },
  dayChipTextActive: { color: colors.bg },
  dayChipCount: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginTop: sp.md, paddingTop: sp.md, borderTopWidth: 1, borderTopColor: colors.border },
  startDayName: { fontSize: 14, fontWeight: '700', color: colors.text },
  startExList: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: r.full, paddingHorizontal: sp.md, paddingVertical: 8 },
  startBtnTxt: { color: colors.bg, fontWeight: '700', fontSize: 14 },

  workoutHeader: { ...fx.card, ...fx.goldLine, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: r.xl, padding: sp.md, marginTop: sp.sm, borderColor: colors.accent + '50' },
  workoutDayName: { fontSize: 18, fontWeight: '800', color: colors.accent },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  timerText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  finishBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: r.full, paddingHorizontal: sp.md, paddingVertical: 9 },
  finishBtnTxt: { color: colors.bg, fontWeight: '700', fontSize: 14 },

  exCard: { ...fx.card, borderRadius: r.xl, padding: sp.md, marginTop: sp.sm },
  exCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.sm },
  exCardName: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  exCardRight: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  lastBadge: { backgroundColor: colors.blueDim, borderRadius: r.full, paddingHorizontal: 7, paddingVertical: 3 },
  lastBadgeTxt: { fontSize: 10, fontWeight: '600', color: colors.blue },
  historyBtn: { padding: 4 },

  setsHeader: { flexDirection: 'row', paddingBottom: sp.xs, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: sp.xs },
  setCol: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, paddingVertical: 5 },
  setRowDone: { opacity: 0.6 },
  setNum: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  setInput: { backgroundColor: colors.bg, borderRadius: r.sm, paddingVertical: 6, color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: colors.border },
  checkBtn: { width: 26, height: 26, borderRadius: r.sm, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  addSetRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingTop: sp.sm, marginTop: sp.xs, borderTopWidth: 1, borderTopColor: colors.border },
  addSetTxt: { fontSize: 13, fontWeight: '600', color: colors.accent },
  setsProgress: { fontSize: 11, color: colors.accent, marginTop: sp.xs, textAlign: 'right' },

  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm, padding: sp.md, borderRadius: r.lg, borderWidth: 1, borderColor: colors.accent + '60', marginTop: sp.sm },
  addExTxt: { fontSize: 14, fontWeight: '600', color: colors.accent },

  recCard: { ...fx.card, flexDirection: 'row', alignItems: 'center', borderRadius: r.lg, padding: sp.md, marginBottom: sp.sm, gap: sp.sm },
  recName: { fontSize: 14, fontWeight: '600', color: colors.text },
  recSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  progBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: r.full },
  progTxt: { fontSize: 11, fontWeight: '700' },
});
