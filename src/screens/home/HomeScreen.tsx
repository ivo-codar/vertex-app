import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font, fx, ff } from '../../theme';
import { Routine, CalendarEvent } from '../../types';
import CalendarModal from '../../components/CalendarModal';
import MiniCalendarPicker from '../../components/MiniCalendarPicker';
import { TAG_CONFIG, TAG_OPTIONS } from '../../components/tagConfig';
import {
  scheduleEventReminder,
  cancelEventReminder,
  scheduleRoutineReminders,
  cancelRoutineReminders,
} from '../../utils/notifications';
import { useStore } from '../../store';

const WEEKDAYS    = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAY_NAMES   = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function parseInputDate(input: string): string | null {
  const trimmed = input.trim();
  const parts = trimmed.split('.');
  if (parts.length < 2) return null;
  const day   = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year  = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
  if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export default function HomeScreen() {
  const today    = new Date();
  const todayDow = (today.getDay() + 6) % 7;
  const todayStr = today.toDateString();

  const routines       = useStore(s => s.routines);
  const events         = useStore(s => s.events);
  const streak         = useStore(s => s.streak);
  const lastStreakDate = useStore(s => s.lastStreakDate);
  const notifMap       = useStore(s => s.notifMap);
  const update         = useStore(s => s.update);

  const [showCalendar, setShowCalendar] = useState(false);

  const setRoutines = (fn: Routine[] | ((p: Routine[]) => Routine[])) =>
    update(s => ({ routines: typeof fn === 'function' ? fn(s.routines) : fn }));

  const setEvents = (fn: CalendarEvent[] | ((p: CalendarEvent[]) => CalendarEvent[])) =>
    update(s => ({ events: typeof fn === 'function' ? fn(s.events) : fn }));

  const recordStreakDay = () => {
    if (lastStreakDate !== todayStr) {
      update({ lastStreakDate: todayStr, streak: streak + 1 });
    }
  };

  const todayISO = today.toISOString().split('T')[0];
  const isCompletedToday = (rt: Routine) => (rt.completedDates ?? []).includes(todayISO);

  // ── Routine modal (add + edit) ────────────────────────────────────────────
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [newName, setNewName]   = useState('');
  const [newTime, setNewTime]   = useState('');
  const [newDays, setNewDays]   = useState<number[]>([]);
  const toggleNewDay = (i: number) =>
    setNewDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort());

  const openAddRoutine = () => {
    setEditingRoutineId(null); setNewName(''); setNewTime(''); setNewDays([]);
    setShowRoutineModal(true);
  };
  const openEditRoutine = (rt: Routine) => {
    setEditingRoutineId(rt.id); setNewName(rt.title);
    setNewTime(rt.time ?? ''); setNewDays(rt.days);
    setShowRoutineModal(true);
  };

  // ── Event modal (add + edit) ──────────────────────────────────────────────
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newTitle, setNewTitle]     = useState('');
  const [newIsoDate, setNewIsoDate] = useState<string | null>(null);
  const [newTag, setNewTag]         = useState('Klausur');

  const openAddEvent = () => {
    setEditingEventId(null); setNewTitle(''); setNewIsoDate(null); setNewTag('Klausur');
    setShowEventModal(true);
  };
  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEventId(ev.id); setNewTitle(ev.title);
    setNewIsoDate(ev.isoDate); setNewTag(ev.tag);
    setShowEventModal(true);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const toggleRoutine = (id: string) => {
    setRoutines(prev => prev.map(rt => {
      if (rt.id !== id) return rt;
      const wasDone = isCompletedToday(rt);
      const completedDates = wasDone
        ? (rt.completedDates ?? []).filter(d => d !== todayISO)
        : [...(rt.completedDates ?? []), todayISO];
      // Streak only on first completion, never decrements
      if (!wasDone) recordStreakDay();
      return { ...rt, completedDates };
    }));
  };

  const saveRoutine = async () => {
    if (!newName.trim()) return;
    const trimmedTime = newTime.trim();

    if (editingRoutineId) {
      // Cancel old notifications before rescheduling
      const oldRt = routines.find(r => r.id === editingRoutineId);
      if (oldRt?.notifIds?.length) await cancelRoutineReminders(oldRt.notifIds);

      let notifIds: string[] = [];
      if (trimmedTime) {
        notifIds = await scheduleRoutineReminders({
          id: editingRoutineId, title: newName.trim(), time: trimmedTime, days: newDays,
        });
      }
      setRoutines(prev => prev.map(rt => rt.id === editingRoutineId
        ? { ...rt, title: newName.trim(), time: trimmedTime || undefined, days: newDays, notifIds }
        : rt
      ));
    } else {
      const id = Date.now().toString();
      let notifIds: string[] = [];
      if (trimmedTime) {
        notifIds = await scheduleRoutineReminders({
          id, title: newName.trim(), time: trimmedTime, days: newDays,
        });
      }
      setRoutines(prev => [...prev, {
        id,
        title: newName.trim(),
        streak: 0,
        completedDates: [],
        time: trimmedTime || undefined,
        days: newDays,
        notifIds,
      }]);
    }
    setNewName(''); setNewTime(''); setNewDays([]);
    setShowRoutineModal(false);
  };

  const saveEvent = async () => {
    if (!newTitle.trim() || !newIsoDate) return;
    if (editingEventId) {
      // Edit existing — reschedule notification
      const oldNid = notifMap[editingEventId];
      if (oldNid) cancelEventReminder(oldNid);
      const updated: CalendarEvent = { id: editingEventId, title: newTitle.trim(), isoDate: newIsoDate, tag: newTag };
      setEvents(prev => prev.map(e => e.id === editingEventId ? updated : e));
      const nid = await scheduleEventReminder(updated);
      if (nid) update(s => ({ notifMap: { ...s.notifMap, [editingEventId]: nid } }));
    } else {
      const newEvent: CalendarEvent = { id: Date.now().toString(), title: newTitle.trim(), isoDate: newIsoDate, tag: newTag };
      setEvents(prev => [...prev, newEvent]);
      const nid = await scheduleEventReminder(newEvent);
      if (nid) update(s => ({ notifMap: { ...s.notifMap, [newEvent.id]: nid } }));
    }
    setNewTitle(''); setNewIsoDate(null); setNewTag('Klausur'); setEditingEventId(null);
    setShowEventModal(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const todayRoutines = routines.filter(rt => rt.days.length === 0 || rt.days.includes(todayDow));
  const doneCount = todayRoutines.filter(rt => isCompletedToday(rt)).length;
  const total     = todayRoutines.length;
  const pct       = total > 0 ? doneCount / total : 0;

  const sortedEvents = [...events].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>Vertex Command</Text>
            <Text style={s.dateText}>
              {DAY_NAMES[todayDow]}, {today.getDate()}. {MONTH_NAMES[today.getMonth()]}
            </Text>
            {total > 0 ? (
              <View style={s.progressRow}>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                </View>
                <Text style={s.progressCaption}>{doneCount}/{total} erledigt</Text>
              </View>
            ) : (
              <Text style={s.hintText}>Füge Routinen hinzu ↓</Text>
            )}
          </View>
          {streak > 0 && (
            <View style={s.streakPill}>
              <Ionicons name="flame" size={15} color={colors.amber} />
              <Text style={s.streakPillNum}>{streak}</Text>
            </View>
          )}
        </View>

        {/* ── Week Calendar (tappable) ── */}
        <TouchableOpacity style={s.calCard} onPress={() => setShowCalendar(true)} activeOpacity={0.85}>
          <View style={s.calHint}>
            <Text style={s.calHintText}>{MONTH_NAMES[today.getMonth()]} {today.getFullYear()}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={s.calHintLink}>Kalender</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
            </View>
          </View>
          <View style={s.weekRow}>
            {WEEKDAYS.map((day, i) => {
              const isToday = i === todayDow;
              const isPast  = i < todayDow;
              const dNum    = new Date(
                today.getFullYear(), today.getMonth(),
                today.getDate() - todayDow + i
              ).getDate();
              const dayIso = (() => {
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayDow + i);
                return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              })();
              const hasEvent = events.some(ev => ev.isoDate === dayIso);
              return (
                <View key={day} style={s.dayCol}>
                  <Text style={[s.dayLabel, isToday && s.dayLabelActive, isPast && s.dayLabelPast]}>
                    {day}
                  </Text>
                  <View style={[s.dayCircle, isToday && s.dayCircleActive]}>
                    <Text style={[s.dayNum, isToday && s.dayNumActive, isPast && s.dayNumPast]}>
                      {dNum}
                    </Text>
                  </View>
                  {isToday && <View style={s.todayDot} />}
                  {!isToday && hasEvent && <View style={[s.todayDot, { backgroundColor: colors.blue }]} />}
                </View>
              );
            })}
          </View>
        </TouchableOpacity>

        {/* ── Routines ── */}
        <SectionRow title="Routinen heute" onAdd={openAddRoutine} />
        {todayRoutines.length === 0 ? (
          <EmptyCard
            icon="checkmark-circle-outline"
            text={routines.length > 0 ? 'Heute keine Routinen geplant.' : 'Noch keine Routinen — tippe +'}
            sub="Tippe + um deine erste hinzuzufügen."
          />
        ) : (
          todayRoutines.map(rt => {
            const done = isCompletedToday(rt);
            return (
              <View key={rt.id} style={[s.routineCard, done && s.routineCardDone]}>
                <View style={[s.leftAccent, { backgroundColor: done ? colors.accent : colors.border }]} />
                <TouchableOpacity
                  style={[s.checkbox, done && s.checkboxDone]}
                  onPress={() => toggleRoutine(rt.id)}
                >
                  {done && <Ionicons name="checkmark" size={12} color={colors.bg} />}
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleRoutine(rt.id)}>
                  <Text style={[s.routineTitle, done && s.strikethru]}>{rt.title}</Text>
                  <View style={s.routineMeta}>
                    {rt.time && (
                      <View style={s.timeBadge}>
                        <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                        <Text style={s.timeText}>{rt.time}</Text>
                        {rt.notifIds?.length ? (
                          <Ionicons name="notifications" size={9} color={colors.accent} />
                        ) : null}
                      </View>
                    )}
                    {rt.days.length > 0 && (
                      <View style={s.daysRow}>
                        {WEEKDAYS.map((d, i) => (
                          <Text key={d} style={[s.dayPip, rt.days.includes(i) && s.dayPipActive]}>{d}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => openEditRoutine(rt)}>
                  <Ionicons name="pencil" size={13} color={colors.blue} />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => {
                  if (rt.notifIds?.length) cancelRoutineReminders(rt.notifIds);
                  setRoutines(p => p.filter(r => r.id !== rt.id));
                }}>
                  <Ionicons name="close" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ── Events ── */}
        <SectionRow title="Demnächst" onAdd={openAddEvent} />
        {sortedEvents.length === 0 ? (
          <EmptyCard
            icon="calendar-outline"
            text="Keine Termine."
            sub="Tippe + um einen hinzuzufügen."
          />
        ) : (
          sortedEvents.map(ev => {
            const cfg = TAG_CONFIG[ev.tag] ?? { bg: colors.accentDim, text: colors.accent, icon: 'calendar-outline' as const };
            return (
              <View key={ev.id} style={s.eventCard}>
                <View style={[s.leftAccent, { backgroundColor: cfg.text, width: 4 }]} />
                <View style={[s.eventIconWrap, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={16} color={cfg.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[font.body, { fontWeight: '600' }]}>{ev.title}</Text>
                  <View style={s.eventMeta}>
                    <Ionicons name="calendar-outline" size={10} color={colors.textMuted} />
                    <Text style={s.eventDate}>{fmtDate(ev.isoDate)}</Text>
                  </View>
                </View>
                <View style={[s.tag, { backgroundColor: cfg.bg }]}>
                  <Text style={[s.tagText, { color: cfg.text }]}>{ev.tag}</Text>
                </View>
                <TouchableOpacity style={s.iconBtn} onPress={() => openEditEvent(ev)}>
                  <Ionicons name="pencil" size={13} color={colors.blue} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.iconBtn}
                  onPress={() => {
                    const nid = notifMap[ev.id];
                    if (nid) {
                      cancelEventReminder(nid);
                      update(s => { const { [ev.id]: _, ...rest } = s.notifMap; return { notifMap: rest }; });
                    }
                    setEvents(p => p.filter(e => e.id !== ev.id));
                  }}
                >
                  <Ionicons name="close" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Calendar Modal ── */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        routines={routines}
        events={events}
      />

      {/* ── Add Routine Modal ── */}
      <Modal visible={showRoutineModal} transparent animationType="slide" onRequestClose={() => setShowRoutineModal(false)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setShowRoutineModal(false)} />
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>{editingRoutineId ? 'Routine bearbeiten' : 'Routine hinzufügen'}</Text>
            <TextInput style={m.input} placeholder="Name (z.B. Morning Run)" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} autoFocus />
            <TextInput style={[m.input, { marginTop: sp.sm }]} placeholder="Uhrzeit (optional, z.B. 07:00)" placeholderTextColor={colors.textMuted} value={newTime} onChangeText={setNewTime} />
            <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>
              Tage — {newDays.length === 0 ? 'Jeden Tag' : `${newDays.length} ausgewählt`}
            </Text>
            <View style={m.daysRow}>
              {WEEKDAYS.map((day, i) => {
                const active = newDays.includes(i);
                return (
                  <TouchableOpacity key={day} style={[m.dayBtn, active && m.dayBtnActive]} onPress={() => toggleNewDay(i)}>
                    <Text style={[m.dayBtnText, active && m.dayBtnTextActive]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={m.hint}>Kein Tag = täglich wiederholen</Text>
            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={() => setShowRoutineModal(false)}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={saveRoutine}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Event Modal ── */}
      <Modal visible={showEventModal} transparent animationType="slide" onRequestClose={() => setShowEventModal(false)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setShowEventModal(false)} />
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>{editingEventId ? 'Termin bearbeiten' : 'Termin hinzufügen'}</Text>
            <TextInput
              style={m.input}
              placeholder="Titel (z.B. Mathe Klausur)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <Text style={[m.fieldLabel]}>Datum auswählen</Text>
            <MiniCalendarPicker value={newIsoDate} onChange={setNewIsoDate} />
            <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>Kategorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm }}>
              {TAG_OPTIONS.map(tag => {
                const cfg = TAG_CONFIG[tag];
                const active = tag === newTag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[m.tagChip, active && { backgroundColor: cfg.bg, borderColor: cfg.text }]}
                    onPress={() => setNewTag(tag)}
                  >
                    <Ionicons name={cfg.icon} size={13} color={active ? cfg.text : colors.textMuted} />
                    <Text style={[m.tagChipText, active && { color: cfg.text }]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={() => setShowEventModal(false)}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={saveEvent}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionRow({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View style={sr.row}>
      <View style={sr.titleWrap}>
        <View style={sr.line} />
        <Text style={font.label}>{title}</Text>
      </View>
      <TouchableOpacity style={sr.addBtn} onPress={onAdd}>
        <Ionicons name="add" size={15} color={colors.bg} />
      </TouchableOpacity>
    </View>
  );
}

function EmptyCard({ icon, text, sub }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; text: string; sub: string;
}) {
  return (
    <View style={ec.wrap}>
      <Ionicons name={icon} size={24} color={colors.textMuted} />
      <Text style={ec.text}>{text}</Text>
      <Text style={ec.sub}>{sub}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: sp.xl, marginBottom: sp.md },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  line: { width: 3, height: 14, borderRadius: 2, backgroundColor: colors.accent, ...fx.goldGlow },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...fx.goldGlow },
});

const ec = StyleSheet.create({
  wrap: { ...fx.card, alignItems: 'center', padding: sp.xl, borderRadius: r.lg, gap: sp.sm },
  text: { fontSize: 14, fontWeight: '500', color: colors.textSub },
  sub: { fontSize: 12, color: colors.textMuted },
});

const m = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: sp.lg, paddingBottom: 40, borderWidth: 1, borderColor: colors.border },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: sp.lg },
  title: { ...font.h3, marginBottom: sp.md },
  input: { backgroundColor: colors.card, borderRadius: r.md, padding: sp.md, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  errorText: { fontSize: 11, color: colors.red, marginTop: 4 },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayBtn: { flex: 1, paddingVertical: 9, borderRadius: r.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dayBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayBtnText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  dayBtnTextActive: { color: colors.bg },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: sp.xs },
  fieldLabel: { ...font.label, marginTop: sp.md, marginBottom: sp.sm },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  btnCancel: { flex: 1, padding: sp.md, borderRadius: r.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  btnSave: { flex: 1, padding: sp.md, borderRadius: r.md, backgroundColor: colors.accent, alignItems: 'center' },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: sp.md, paddingVertical: 7, borderRadius: r.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tagChipText: { fontSize: 12, fontWeight: '600', color: colors.textSub },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: sp.lg, paddingBottom: sp.md,
    gap: sp.md,
  },
  kicker: { fontFamily: ff.mono, fontSize: 11, fontWeight: '700', color: colors.accent, letterSpacing: 2.5, marginBottom: 5, textTransform: 'uppercase' },
  dateText: { fontFamily: ff.display, fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  hintText: { fontFamily: ff.body, fontSize: 13, color: colors.textMuted, marginTop: 5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: 8 },
  progressBg: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  progressCaption: { fontFamily: ff.mono, fontSize: 12, fontWeight: '600', color: colors.textSub },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.amberDim,
    paddingHorizontal: sp.md, paddingVertical: sp.sm,
    borderRadius: r.full,
    borderWidth: 1, borderColor: colors.amber + '40',
    ...fx.goldGlow, shadowColor: colors.amber,
  },
  streakPillNum: { fontFamily: ff.mono, fontSize: 16, fontWeight: '700', color: colors.amber },

  // ── Calendar strip ─────────────────────────────────────────────────────────
  calCard: {
    ...fx.card,
    borderRadius: r.xl,
    padding: sp.md,
    borderTopColor: colors.accent + '66',
  },
  calHint: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.md },
  calHintText: { fontFamily: ff.mono, fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  calHintLink: { fontFamily: ff.body, fontSize: 12, fontWeight: '600', color: colors.accent },
  weekRow: { flexDirection: 'row' },
  dayCol: { flex: 1, alignItems: 'center', gap: 5 },
  dayLabel: { fontFamily: ff.mono, fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5 },
  dayLabelActive: { color: colors.accent, fontWeight: '700' },
  dayLabelPast: { opacity: 0.5 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: colors.accent, ...fx.goldGlow },
  dayNum: { fontFamily: ff.mono, fontSize: 15, fontWeight: '600', color: colors.textSub },
  dayNumActive: { color: colors.bg, fontWeight: '800' },
  dayNumPast: { color: colors.textMuted },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },

  // ── Routine cards ──────────────────────────────────────────────────────────
  routineCard: {
    flexDirection: 'row', alignItems: 'center',
    ...fx.card,
    borderRadius: r.lg,
    marginBottom: 8,
    overflow: 'hidden',
  },
  routineCardDone: { opacity: 0.6 },
  leftAccent: { width: 3, alignSelf: 'stretch' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: sp.sm, marginVertical: sp.md,
  },
  checkboxDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  routineTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  strikethru: { textDecorationLine: 'line-through', color: colors.textMuted },
  routineMeta: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: 3, flexWrap: 'wrap' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 12, color: colors.textMuted },
  daysRow: { flexDirection: 'row', gap: 3 },
  dayPip: { fontFamily: ff.mono, fontSize: 10, fontWeight: '600', color: colors.textMuted, opacity: 0.5 },
  dayPipActive: { color: colors.accent, opacity: 1 },
  streakPillMini: { flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: sp.xs },
  streakPillText: { fontFamily: ff.mono, fontSize: 13, fontWeight: '600', color: colors.amber },
  iconBtn: { padding: sp.sm },

  // ── Event cards ────────────────────────────────────────────────────────────
  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    ...fx.card,
    borderRadius: r.lg,
    marginBottom: 8,
    overflow: 'hidden', paddingRight: sp.sm, paddingVertical: sp.md, gap: sp.sm,
  },
  eventIconWrap: {
    width: 30, height: 30, borderRadius: r.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  eventDate: { fontSize: 13, color: colors.textSub },
  tag: { paddingHorizontal: sp.sm, paddingVertical: 4, borderRadius: r.full },
  tagText: { fontSize: 12, fontWeight: '600' },
});
