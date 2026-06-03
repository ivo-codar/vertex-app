import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, AppState, AppStateStatus, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font } from '../../theme';
import { WorkSession, SubjectItem } from '../../types';
import WeeklyChart from '../../components/WeeklyChart';
import { useStore, todayDow, DEFAULT_SUBJECTS, COLOR_POOL } from '../../store';

// ── Types ─────────────────────────────────────────────────────────────────────

type GradeEntry = {
  id: string;
  subject: string;
  points: number;
  label: string;
  date: string;
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  '#00AEEF', '#C8960C', '#E09B00', '#00C9B1',
  '#8B7FD4', '#1A9E5C', '#E07B5C', '#7B9ED9',
  '#C0392B', '#D4A5A5', '#5BA3A0', '#9B8EC4',
];

const ICON_OPTIONS: IoniconName[] = [
  'book-outline',      'calculator-outline', 'flask-outline',    'code-slash-outline',
  'language-outline',  'leaf-outline',       'musical-notes-outline', 'fitness-outline',
  'globe-outline',     'hammer-outline',     'pencil-outline',   'time-outline',
  'planet-outline',    'business-outline',   'heart-outline',    'school-outline',
  'telescope-outline', 'color-palette-outline', 'stats-chart-outline', 'trophy-outline',
  'laptop-outline',    'mic-outline',        'camera-outline',   'cube-outline',
];

const todayISO = () => new Date().toISOString().split('T')[0];

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const fmtTimer = (s: number) =>
  `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

const fmtHours = (mins: number): string => {
  if (mins === 0) return '0h';
  if (mins < 60) return `${mins}min`;
  return `${(Math.round(mins / 6) / 10).toFixed(1)}h`;
};

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
  if (p >= 1)  return 'Mangelhaft';
  return 'Ungenügend';
}

function gradeTrend(entries: GradeEntry[]): 'up' | 'down' | 'same' {
  if (entries.length < 2) return 'same';
  const last = entries[0].points;
  const prev = entries[1].points;
  return last > prev ? 'up' : last < prev ? 'down' : 'same';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeepWorkScreen() {
  const subjects  = useStore(s => s.focusSubjects);
  const subject   = useStore(s => s.focusSubject);
  const sessions  = useStore(s => s.focusSessions);
  const weekData  = useStore(s => s.focusWeek.data);
  const grades    = useStore(s => s.focusGrades);
  const update    = useStore(s => s.update);
  const addToWeek = useStore(s => s.addToWeek);
  const storeAddSubject = useStore(s => s.addSubject);

  const setSubjects = (fn: SubjectItem[] | ((p: SubjectItem[]) => SubjectItem[])) =>
    update(s => ({ focusSubjects: typeof fn === 'function' ? fn(s.focusSubjects) : fn }));
  const setSubject  = (v: string) => update({ focusSubject: v });
  const setSessions = (fn: WorkSession[] | ((p: WorkSession[]) => WorkSession[])) =>
    update(s => ({ focusSessions: typeof fn === 'function' ? fn(s.focusSessions) : fn }));
  const setGrades   = (fn: GradeEntry[] | ((p: GradeEntry[]) => GradeEntry[])) =>
    update(s => ({ focusGrades: typeof fn === 'function' ? fn(s.focusGrades) : fn }));

  // Timer
  const [display, setDisplay] = useState(0);     // seconds to show
  const [running, setRunning] = useState(false);
  const startRef  = useRef<number | null>(null);  // Date.now() when run started
  const savedRef  = useRef(0);                    // accumulated ms before this run
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modals
  const [showAddSubject, setShowAddSubject]       = useState(false);
  const [newSubjectName, setNewSubjectName]       = useState('');
  const [showManageSubjects, setShowManageSubjects] = useState(false);
  const [editSubject, setEditSubject]             = useState<SubjectItem | null>(null);
  const [editSubName, setEditSubName]             = useState('');
  const [editSubColor, setEditSubColor]           = useState('');
  const [editSubIcon, setEditSubIcon]             = useState('');
  const [editSession, setEditSession]             = useState<WorkSession | null>(null);
  const [editSessHours, setEditSessHours]         = useState('');
  const [editSessSubject, setEditSessSubject]     = useState('');
  const [showManual, setShowManual]               = useState(false);
  const [manualHours, setManualHours]             = useState('');
  const [manualSubject, setManualSubject]         = useState('');
  const [showGrade, setShowGrade]                 = useState(false);
  const [gradeSubject, setGradeSubject]           = useState('');
  const [gradePoints, setGradePoints]             = useState('');
  const [gradeLabel, setGradeLabel]               = useState('');
  const [showGradeHistory, setShowGradeHistory]   = useState<string | null>(null);

  // ── Timer core ────────────────────────────────────────────────────────────

  const elapsed = () =>
    startRef.current !== null
      ? savedRef.current + (Date.now() - startRef.current)
      : savedRef.current;

  const syncDisplay = () => setDisplay(Math.floor(elapsed() / 1000));

  const startTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(syncDisplay, 500);
  };
  const stopTick = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  // Manage tick based on `running` state — single source of truth
  useEffect(() => {
    if (running) startTick();
    else stopTick();
    return stopTick;
  }, [running]); // eslint-disable-line

  // Background/foreground: sync display when returning
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && running) {
        syncDisplay();
        startTick();
      } else if (state !== 'active' && running) {
        stopTick(); // visual tick pauses; timestamp keeps running
      }
    });
    return () => sub.remove();
  }, [running]); // eslint-disable-line

  // ── Controls ──────────────────────────────────────────────────────────────

  const handlePlay = () => {
    startRef.current = Date.now();
    setRunning(true);
  };

  const handlePause = () => {
    savedRef.current = elapsed();
    startRef.current = null;
    setRunning(false);
    syncDisplay();
  };

  const saveSession = (subjectName: string, ms: number) => {
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return;
    setSessions(prev => [{ id: Date.now().toString(), subject: subjectName, duration: mins }, ...prev]);
    addToWeek('focusWeek', todayDow(), mins);
  };

  const handleStop = () => {
    const ms = elapsed();
    saveSession(subject, ms);
    savedRef.current = 0;
    startRef.current = null;
    setRunning(false);
    setDisplay(0);
  };

  const handleReset = () => {
    savedRef.current = 0;
    startRef.current = null;
    setDisplay(0);
  };

  // Subject switch: auto-save current session and reset
  const handleSubjectChange = (newSubject: string) => {
    if (newSubject === subject) return;
    const ms = elapsed();
    if (ms >= 60000) saveSession(subject, ms); // save if ≥ 1 min
    savedRef.current = 0;
    startRef.current = null;
    setRunning(false);
    setDisplay(0);
    setSubject(newSubject);
  };

  // ── Manual entry ──────────────────────────────────────────────────────────

  const submitManual = () => {
    const h = parseFloat(manualHours.replace(',', '.'));
    if (isNaN(h) || h <= 0) return;
    const mins = Math.round(h * 60);
    const sub  = manualSubject || subject;
    setSessions(prev => [{ id: `m-${Date.now()}`, subject: sub, duration: mins }, ...prev]);
    setWeekData(prev => prev.map((v, i) => i === todayIdx ? v + mins : v));
    setManualHours(''); setManualSubject('');
    setShowManual(false);
  };

  // ── Grades ────────────────────────────────────────────────────────────────

  const submitGrade = () => {
    const p = parseInt(gradePoints, 10);
    if (isNaN(p) || p < 0 || p > 15) return;
    setGrades(prev => [{
      id: Date.now().toString(),
      subject: gradeSubject || subject,
      points: p,
      label: gradeLabel.trim() || 'Klausur',
      date: todayISO(),
    }, ...prev]);
    setGradePoints(''); setGradeLabel(''); setGradeSubject('');
    setShowGrade(false);
  };

  const gradesBySubject = subjects
    .map(s => ({ subject: s, entries: grades.filter(g => g.subject === s.name) }))
    .filter(x => x.entries.length > 0);

  // ── Add/remove subject ────────────────────────────────────────────────────

  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    storeAddSubject(name); // handles dedup + color assignment
    setNewSubjectName(''); setShowAddSubject(false);
  };

  const removeSubject = (name: string) => {
    setSubjects(prev => prev.filter(s => s.name !== name));
    if (subject === name) setSubject(subjects.find(s => s.name !== name)?.name ?? '');
  };

  const openEditSubject = (sub: SubjectItem) => {
    setEditSubject(sub);
    setEditSubName(sub.name);
    setEditSubColor(sub.color);
    setEditSubIcon(sub.icon ?? '');
  };

  const saveEditSubject = () => {
    if (!editSubject || !editSubName.trim()) return;
    const oldName = editSubject.name;
    const updated: SubjectItem = {
      name: editSubName.trim(),
      color: editSubColor || editSubject.color,
      icon: editSubIcon || undefined,
    };
    setSubjects(prev => prev.map(s => s.name === oldName ? updated : s));
    if (oldName !== updated.name) {
      setSessions(prev => prev.map(s => s.subject === oldName ? { ...s, subject: updated.name } : s));
      if (subject === oldName) setSubject(updated.name);
    }
    setEditSubject(null);
  };

  const deleteSession = (id: string) =>
    setSessions(prev => prev.filter(s => s.id !== id));

  const openEditSession = (sess: WorkSession) => {
    setEditSession(sess);
    setEditSessHours(String((Math.round(sess.duration / 6) / 10).toFixed(1)));
    setEditSessSubject(sess.subject);
  };

  const saveEditSession = () => {
    if (!editSession) return;
    const h = parseFloat(editSessHours.replace(',', '.'));
    if (isNaN(h) || h <= 0) return;
    setSessions(prev => prev.map(s =>
      s.id === editSession.id ? { ...s, subject: editSessSubject, duration: Math.round(h * 60) } : s
    ));
    setEditSession(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const colorMap  = Object.fromEntries(subjects.map(s => [s.name, s.color]));
  const activeColor = colorMap[subject] ?? colors.accent;
  const totalMins = sessions.reduce((a, s) => a + s.duration, 0);
  const bySubject = sessions.reduce<Record<string, number>>((a, s) => {
    a[s.subject] = (a[s.subject] ?? 0) + s.duration; return a;
  }, {});
  const weekHours = weekData.map(toHours);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.pageHeader}>
          <Text style={font.h2}>Deep Work</Text>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerBtn} onPress={() => { setManualSubject(subject); setShowManual(true); }}>
              <Ionicons name="pencil" size={14} color={colors.textSub} />
              <Text style={s.headerBtnTxt}>Manuell</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.headerBtn, { borderColor: colors.accent + '60' }]} onPress={() => { setGradeSubject(subject); setShowGrade(true); }}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text style={[s.headerBtnTxt, { color: colors.accent }]}>Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Subject chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: sp.md }} contentContainerStyle={s.chipRow}>
          {subjects.map(sub => {
            const active = sub.name === subject;
            return (
              <TouchableOpacity
                key={sub.name}
                style={[s.chip, active && { backgroundColor: sub.color + '22', borderColor: sub.color }]}
                onPress={() => handleSubjectChange(sub.name)}
                activeOpacity={0.7}
              >
                {sub.icon
                  ? <Ionicons name={sub.icon as IoniconName} size={12} color={active ? sub.color : colors.textMuted} />
                  : <View style={[s.dot, { backgroundColor: sub.color }]} />
                }
                <Text style={[s.chipText, active && { color: sub.color }]}>{sub.name}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={s.addChip} onPress={() => setShowAddSubject(true)}>
            <Ionicons name="add" size={14} color={colors.accent} />
            <Text style={s.addChipText}>Fach</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.manageChip} onPress={() => setShowManageSubjects(true)}>
            <Ionicons name="settings-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
        <Text style={s.chipHint}>Fach wechseln speichert die aktuelle Session</Text>

        {/* ── Timer ── */}
        <View style={s.timerCard}>
          <View style={[s.timerRing, { borderColor: activeColor }]}>
            <Text style={s.timerDisplay}>{fmtTimer(display)}</Text>
            <Text style={[s.timerSubject, { color: activeColor }]}>{subject}</Text>
          </View>
          <View style={s.controls}>
            {running ? (
              <>
                <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={handlePause}>
                  <Ionicons name="pause" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={handleStop}>
                  <Ionicons name="stop" size={22} color={colors.red} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[s.btn, { backgroundColor: activeColor }]} onPress={handlePlay}>
                  <Ionicons name="play" size={22} color={colors.bg} />
                </TouchableOpacity>
                {display > 0 && (
                  <>
                    <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={handleStop}>
                      <Ionicons name="checkmark" size={20} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={handleReset}>
                      <Ionicons name="refresh" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
          {running && (
            <View style={s.liveRow}>
              <View style={[s.liveDot, { backgroundColor: activeColor }]} />
              <Text style={[s.liveText, { color: activeColor }]}>Läuft · auch im Hintergrund</Text>
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatCard label="Heute" value={fmtHours(totalMins)} color={colors.blue} />
          <StatCard label="Sessions" value={String(sessions.length)} color={colors.accent} />
          <StatCard label="Fächer"   value={String(Object.keys(bySubject).length)} color={colors.teal} />
        </View>

        {/* ── Subject distribution ── */}
        {Object.keys(bySubject).length > 0 && (
          <>
            <Label text="Verteilung" />
            {Object.entries(bySubject)
              .sort((a, b) => b[1] - a[1])
              .map(([sub, mins]) => {
                const pct   = totalMins > 0 ? (mins / totalMins) * 100 : 0;
                const color = colorMap[sub] ?? colors.accent;
                return (
                  <View key={sub} style={{ marginBottom: sp.sm }}>
                    <View style={s.barLabel}>
                      <View style={s.barLabelLeft}>
                        <View style={[s.dot, { backgroundColor: color }]} />
                        <Text style={font.small}>{sub}</Text>
                      </View>
                      <Text style={[font.small, { color }]}>{fmtHours(mins)}</Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
          </>
        )}

        {/* ── Sessions ── */}
        {sessions.length > 0 && (
          <>
            <Label text="Sessions" />
            {sessions.map(sess => (
              <View key={sess.id} style={s.sessRow}>
                <View style={[s.dot, { width: 10, height: 10, backgroundColor: colorMap[sess.subject] ?? colors.accent }]} />
                <Text style={[font.body, { flex: 1, fontWeight: '500' }]}>{sess.subject}</Text>
                <Text style={font.small}>{fmtHours(sess.duration)}</Text>
                <TouchableOpacity style={s.sessIconBtn} onPress={() => openEditSession(sess)}>
                  <Ionicons name="pencil" size={14} color={colors.blue} />
                </TouchableOpacity>
                <TouchableOpacity style={s.sessIconBtn} onPress={() => deleteSession(sess.id)}>
                  <Ionicons name="trash-outline" size={14} color={colors.red} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* ── Weekly chart ── */}
        <Label text="Diese Woche (Stunden)" />
        <WeeklyChart data={weekHours} color={colors.blue} unit="h" />

        {/* ── Grades ── */}
        <View style={s.gradeHeader}>
          <Label text="Noten (Abipunkte)" />
          <TouchableOpacity style={s.gradeAddBtn} onPress={() => { setGradeSubject(subject); setShowGrade(true); }}>
            <Ionicons name="add" size={15} color={colors.bg} />
          </TouchableOpacity>
        </View>

        {gradesBySubject.length === 0 ? (
          <View style={s.gradeEmpty}>
            <Ionicons name="star-outline" size={22} color={colors.textMuted} />
            <Text style={s.gradeEmptyTxt}>Noch keine Noten eingetragen.</Text>
          </View>
        ) : (
          gradesBySubject.map(({ subject: sub, entries }) => {
            const avg   = entries.reduce((a, e) => a + e.points, 0) / entries.length;
            const avgR  = Math.round(avg * 10) / 10;
            const trend = gradeTrend(entries);
            const color = pointsColor(avgR);
            return (
              <TouchableOpacity key={sub.name} style={s.gradeCard} onPress={() => setShowGradeHistory(sub.name)}>
                <View style={[s.dot, { width: 10, height: 10, backgroundColor: sub.color }]} />
                <Text style={[font.body, { flex: 1, fontWeight: '600' }]}>{sub.name}</Text>
                <Text style={s.gradeCount}>{entries.length} Eintr.</Text>
                <View style={[s.gradeBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[s.gradePts, { color }]}>{avgR} Pkt</Text>
                  <Text style={[s.gradeLevel, { color }]}>{pointsLabel(Math.round(avgR))}</Text>
                </View>
                <Ionicons
                  name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                  size={16}
                  color={trend === 'up' ? colors.accent : trend === 'down' ? colors.red : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Manage Subjects Modal ── */}
      <SheetModal visible={showManageSubjects} onClose={() => setShowManageSubjects(false)} title="Fächer verwalten">
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {subjects.map(sub => (
            <View key={sub.name} style={mg.row}>
              {sub.icon
                ? <Ionicons name={sub.icon as IoniconName} size={16} color={sub.color} />
                : <View style={[mg.dot, { backgroundColor: sub.color }]} />
              }
              <Text style={[mg.name, { color: sub.color }]}>{sub.name}</Text>
              <TouchableOpacity style={mg.iconBtn} onPress={() => { openEditSubject(sub); setShowManageSubjects(false); }}>
                <Ionicons name="pencil" size={15} color={colors.blue} />
              </TouchableOpacity>
              <TouchableOpacity style={mg.iconBtn} onPress={() => removeSubject(sub.name)}>
                <Ionicons name="trash-outline" size={15} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={mg.addBtn} onPress={() => { setShowManageSubjects(false); setShowAddSubject(true); }}>
          <Ionicons name="add" size={15} color={colors.bg} />
          <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 14 }}>Neues Fach</Text>
        </TouchableOpacity>
      </SheetModal>

      {/* ── Edit Subject Modal ── */}
      <SheetModal visible={!!editSubject} onClose={() => setEditSubject(null)} title="Fach bearbeiten">
        <TextInput
          style={m.input}
          placeholder="Name"
          placeholderTextColor={colors.textMuted}
          value={editSubName}
          onChangeText={setEditSubName}
        />
        <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>Farbe</Text>
        <View style={pk.grid}>
          {COLOR_PALETTE.map(c => (
            <TouchableOpacity key={c} style={[pk.colorBtn, { backgroundColor: c }, editSubColor === c && pk.colorBtnActive]} onPress={() => setEditSubColor(c)}>
              {editSubColor === c && <Ionicons name="checkmark" size={14} color={colors.bg} />}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>Icon</Text>
        <View style={pk.grid}>
          {ICON_OPTIONS.map(icon => (
            <TouchableOpacity
              key={icon}
              style={[pk.iconBtn, editSubIcon === icon && { backgroundColor: (editSubColor || colors.accent) + '30', borderColor: editSubColor || colors.accent }]}
              onPress={() => setEditSubIcon(icon)}
            >
              <Ionicons name={icon} size={18} color={editSubIcon === icon ? (editSubColor || colors.accent) : colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
        <ModalBtns onCancel={() => setEditSubject(null)} onSave={saveEditSubject} />
      </SheetModal>

      {/* ── Edit Session Modal ── */}
      <SheetModal visible={!!editSession} onClose={() => setEditSession(null)} title="Session bearbeiten">
        <Text style={m.fieldLabel}>Fach</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm, marginBottom: sp.sm }}>
          {subjects.map(sub => (
            <TouchableOpacity
              key={sub.name}
              style={[m.subChip, editSessSubject === sub.name && { backgroundColor: sub.color + '25', borderColor: sub.color }]}
              onPress={() => setEditSessSubject(sub.name)}
            >
              <Text style={[m.subChipTxt, editSessSubject === sub.name && { color: sub.color }]}>{sub.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={m.fieldLabel}>Stunden (z.B. 1.5)</Text>
        <TextInput
          style={m.input}
          value={editSessHours}
          onChangeText={setEditSessHours}
          keyboardType="decimal-pad"
          placeholder="z.B. 1.5"
          placeholderTextColor={colors.textMuted}
        />
        <ModalBtns onCancel={() => setEditSession(null)} onSave={saveEditSession} />
      </SheetModal>

      {/* ── Add Subject Modal ── */}
      <SheetModal visible={showAddSubject} onClose={() => setShowAddSubject(false)} title="Neues Fach">
        <TextInput style={m.input} placeholder="Name (z.B. Geschichte)" placeholderTextColor={colors.textMuted} value={newSubjectName} onChangeText={setNewSubjectName} autoFocus onSubmitEditing={addSubject} returnKeyType="done" />
        <ModalBtns onCancel={() => setShowAddSubject(false)} onSave={addSubject} />
      </SheetModal>

      {/* ── Manual Entry Modal ── */}
      <SheetModal visible={showManual} onClose={() => setShowManual(false)} title="Zeit nachtragen">
        <Text style={m.fieldLabel}>Fach</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm, marginBottom: sp.sm }}>
          {subjects.map(sub => (
            <TouchableOpacity
              key={sub.name}
              style={[m.subChip, manualSubject === sub.name && { backgroundColor: sub.color + '25', borderColor: sub.color }]}
              onPress={() => setManualSubject(sub.name)}
            >
              <Text style={[m.subChipTxt, manualSubject === sub.name && { color: sub.color }]}>{sub.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={m.fieldLabel}>Stunden (z.B. 1.5 oder 1,5)</Text>
        <TextInput style={m.input} placeholder="z.B. 1.5" placeholderTextColor={colors.textMuted} value={manualHours} onChangeText={setManualHours} keyboardType="decimal-pad" autoFocus />
        <ModalBtns onCancel={() => setShowManual(false)} onSave={submitManual} />
      </SheetModal>

      {/* ── Grade Entry Modal ── */}
      <SheetModal visible={showGrade} onClose={() => setShowGrade(false)} title="Note eintragen">
        <Text style={m.fieldLabel}>Fach</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm, marginBottom: sp.sm }}>
          {subjects.map(sub => (
            <TouchableOpacity
              key={sub.name}
              style={[m.subChip, gradeSubject === sub.name && { backgroundColor: sub.color + '25', borderColor: sub.color }]}
              onPress={() => setGradeSubject(sub.name)}
            >
              <Text style={[m.subChipTxt, gradeSubject === sub.name && { color: sub.color }]}>{sub.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={m.fieldLabel}>Punkte (0 – 15)</Text>
        <View style={s.pointsGrid}>
          {Array.from({ length: 16 }, (_, i) => i).map(p => {
            const sel = gradePoints === String(p);
            const c   = pointsColor(p);
            return (
              <TouchableOpacity key={p} style={[s.pointBtn, sel && { backgroundColor: c, borderColor: c }]} onPress={() => setGradePoints(String(p))}>
                <Text style={[s.pointBtnTxt, sel && { color: colors.bg }]}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {gradePoints !== '' && (
          <View style={s.gradePreview}>
            <Text style={[s.gradePreviewTxt, { color: pointsColor(parseInt(gradePoints)) }]}>
              {parseInt(gradePoints)} Punkte → {pointsLabel(parseInt(gradePoints))}
            </Text>
          </View>
        )}
        <Text style={[m.fieldLabel, { marginTop: sp.sm }]}>Bezeichnung (optional)</Text>
        <TextInput style={m.input} placeholder="z.B. Klausur 1, Mündlich..." placeholderTextColor={colors.textMuted} value={gradeLabel} onChangeText={setGradeLabel} />
        <ModalBtns onCancel={() => setShowGrade(false)} onSave={submitGrade} />
      </SheetModal>

      {/* ── Grade History Modal ── */}
      <Modal visible={!!showGradeHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGradeHistory(null)}>
        {showGradeHistory && (() => {
          const sub     = subjects.find(s => s.name === showGradeHistory);
          const entries = grades.filter(g => g.subject === showGradeHistory);
          const avg     = entries.length > 0 ? entries.reduce((a, e) => a + e.points, 0) / entries.length : 0;
          const avgR    = Math.round(avg * 10) / 10;
          return (
            <SafeAreaView style={s.safe} edges={['top']}>
              <View style={s.ghHeader}>
                <TouchableOpacity style={s.ghClose} onPress={() => setShowGradeHistory(null)}>
                  <Ionicons name="close" size={20} color={colors.textSub} />
                </TouchableOpacity>
                <Text style={s.ghTitle}>{showGradeHistory}</Text>
                {entries.length > 0 && (
                  <View style={[s.ghAvg, { backgroundColor: pointsColor(avgR) + '20' }]}>
                    <Text style={[s.ghAvgTxt, { color: pointsColor(avgR) }]}>Ø {avgR} Pkt</Text>
                  </View>
                )}
              </View>
              <ScrollView contentContainerStyle={{ padding: sp.md }}>
                {/* Mini bar chart */}
                {entries.length > 1 && (
                  <View style={s.ghChart}>
                    <Text style={[font.label, { marginBottom: sp.sm }]}>Entwicklung</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
                      {[...entries].reverse().map((e, i) => {
                        const h = (e.points / 15) * 70 + 4;
                        const c = pointsColor(e.points);
                        const isLast = i === entries.length - 1;
                        return (
                          <View key={e.id} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: isLast ? c : colors.textMuted }}>{e.points}</Text>
                            <View style={{ width: '100%', height: 70, backgroundColor: colors.bg, borderRadius: r.sm, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: isLast ? c + '40' : 'transparent' }}>
                              <View style={{ height: h, backgroundColor: isLast ? c : c + '55', borderRadius: r.sm }} />
                            </View>
                            <Text style={{ fontSize: 8, color: isLast ? c : colors.textMuted }}>{e.date.slice(5)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
                <Text style={[font.label, { marginTop: sp.lg, marginBottom: sp.sm }]}>Alle Noten</Text>
                {entries.map(e => (
                  <View key={e.id} style={s.ghEntry}>
                    <View style={{ flex: 1 }}>
                      <Text style={[font.body, { fontWeight: '600' }]}>{e.label}</Text>
                      <Text style={font.small}>{e.date}</Text>
                    </View>
                    <View style={[s.gradeBadge, { backgroundColor: pointsColor(e.points) + '20' }]}>
                      <Text style={[s.gradePts, { color: pointsColor(e.points) }]}>{e.points} Pkt</Text>
                      <Text style={[s.gradeLevel, { color: pointsColor(e.points) }]}>{pointsLabel(e.points)}</Text>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={[s.headerBtn, { alignSelf: 'center', marginTop: sp.lg }]}
                  onPress={() => { setGradeSubject(showGradeHistory); setShowGradeHistory(null); setShowGrade(true); }}>
                  <Ionicons name="add" size={14} color={colors.accent} />
                  <Text style={[s.headerBtnTxt, { color: colors.accent }]}>Note hinzufügen</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[sc.card, { borderColor: color + '40' }]}>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={[font.label, { marginTop: sp.lg, marginBottom: sp.sm }]}>{text}</Text>;
}

function SheetModal({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.title}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModalBtns({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <View style={m.btns}>
      <TouchableOpacity style={m.btnCancel} onPress={onCancel}>
        <Text style={{ color: colors.textSub }}>Abbrechen</Text>
      </TouchableOpacity>
      <TouchableOpacity style={m.btnSave} onPress={onSave}>
        <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: r.md, padding: sp.sm, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.border },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
});

const m = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: sp.lg, paddingBottom: 40, borderWidth: 1, borderColor: colors.border },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: sp.lg },
  title: { ...font.h3, marginBottom: sp.md },
  fieldLabel: { ...font.label, marginBottom: sp.sm },
  input: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  btnCancel: { flex: 1, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  btnSave: { flex: 1, padding: sp.md, borderRadius: r.md, backgroundColor: colors.accent, alignItems: 'center' },
  subChip: { paddingHorizontal: sp.md, paddingVertical: 7, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  subChipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSub },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: sp.md },
  headerActions: { flexDirection: 'row', gap: sp.sm },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: sp.sm, paddingVertical: 6, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  headerBtnTxt: { fontSize: 12, fontWeight: '600', color: colors.textSub },

  chipRow: { gap: sp.sm, paddingRight: sp.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: sp.md, paddingVertical: 7, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  dot: { width: 6, height: 6, borderRadius: 3 },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: sp.md, paddingVertical: 7, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent + '60' },
  addChipText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  manageChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipHint: { fontSize: 10, color: colors.textMuted, marginTop: 4 },

  timerCard: { backgroundColor: colors.card, borderRadius: r.xl, padding: sp.xl, marginTop: sp.md, alignItems: 'center', gap: sp.lg, borderWidth: 1, borderColor: colors.border },
  timerRing: { width: 168, height: 168, borderRadius: 84, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  timerDisplay: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: -1 },
  timerSubject: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  controls: { flexDirection: 'row', gap: sp.md },
  btn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.red + '60' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },

  barLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  barLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  barBg: { height: 6, backgroundColor: colors.card, borderRadius: r.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: r.full },

  sessRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
  sessIconBtn: { padding: 4 },

  gradeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gradeAddBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: sp.lg },
  gradeEmpty: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.border },
  gradeEmptyTxt: { fontSize: 13, color: colors.textMuted },
  gradeCard: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
  gradeCount: { fontSize: 11, color: colors.textMuted },
  gradeBadge: { borderRadius: r.md, padding: sp.xs, alignItems: 'center' },
  gradePts: { fontSize: 14, fontWeight: '800' },
  gradeLevel: { fontSize: 9, fontWeight: '600' },

  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm, marginTop: sp.xs },
  pointBtn: { width: 42, height: 42, borderRadius: r.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pointBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.textSub },
  gradePreview: { marginTop: sp.sm, padding: sp.sm, borderRadius: r.md, backgroundColor: colors.card, alignItems: 'center' },
  gradePreviewTxt: { fontSize: 14, fontWeight: '700' },

  ghHeader: { flexDirection: 'row', alignItems: 'center', padding: sp.md, gap: sp.sm },
  ghClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  ghTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
  ghAvg: { paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.full },
  ghAvgTxt: { fontSize: 13, fontWeight: '700' },
  ghChart: { backgroundColor: colors.card, borderRadius: r.lg, padding: sp.md, borderWidth: 1, borderColor: colors.border, marginBottom: sp.md },
  ghEntry: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
});

// ── Manage subjects sheet ─────────────────────────────────────────────────────
const mg = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: sp.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  iconBtn: { padding: sp.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm, backgroundColor: colors.accent, borderRadius: r.md, padding: sp.md, marginTop: sp.md },
});

// ── Color & Icon picker ───────────────────────────────────────────────────────
const pk = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  colorBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: colors.text, transform: [{ scale: 1.15 }] },
  iconBtn: { width: 44, height: 44, borderRadius: r.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
});
