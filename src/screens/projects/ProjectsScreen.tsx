import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font, fx } from '../../theme';
import { KanbanColumn, KanbanCard, ThreatLevel } from '../../types';
import WeeklyChart from '../../components/WeeklyChart';
import { useStore, todayDow, INITIAL_BOARD } from '../../store';

// ── Threat Level config ───────────────────────────────────────────────────────

type ThreatCfg = { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>['name'] };

const THREAT: Record<ThreatLevel, ThreatCfg> = {
  gamma: { label: 'GAMMA', color: '#5C5C7A', bg: 'rgba(92,92,122,0.12)',   icon: 'remove-circle-outline' },
  beta:  { label: 'BETA',  color: '#00AEEF', bg: 'rgba(0,174,239,0.12)',   icon: 'chevron-up-circle-outline' },
  alpha: { label: 'ALPHA', color: '#E09B00', bg: 'rgba(224,155,0,0.14)',   icon: 'alert-circle-outline' },
  omega: { label: 'OMEGA', color: '#C0392B', bg: 'rgba(192,57,43,0.15)',   icon: 'nuclear-outline' },
};

const COL_COLOR: Record<string, string> = {
  todo:       colors.textMuted,
  inprogress: colors.amber,
  done:       colors.accent,
};

const COL_ORDER = ['todo', 'inprogress', 'done'];


const todayIdx = (new Date().getDay() + 6) % 7;

export default function ProjectsScreen() {
  const board     = useStore(s => s.projectsBoard);
  const weekData  = useStore(s => s.projectsWeek.data);
  const update    = useStore(s => s.update);
  const addToWeek = useStore(s => s.addToWeek);

  const setBoard = (fn: KanbanColumn[] | ((p: KanbanColumn[]) => KanbanColumn[])) =>
    update(s => ({ projectsBoard: typeof fn === 'function' ? fn(s.projectsBoard) : fn }));

  const [showModal, setShowModal]   = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardColId, setEditingCardColId] = useState<string | null>(null);
  const [newTitle, setNewTitle]     = useState('');
  const [newTag, setNewTag]         = useState('');
  const [newThreat, setNewThreat]       = useState<ThreatLevel>('beta');
  const [newEffort, setNewEffort]       = useState<1|2|3|5|8>(1);
  const [newDoubleDown, setNewDoubleDown] = useState(false);
  const [showDDWarning, setShowDDWarning] = useState(false);
  const [targetColId, setTargetColId] = useState('todo');
  const addAlignment = useStore(s => s.addAlignment);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [newSubtask, setNewSubtask] = useState('');

  const moveCard = (cardId: string, fromId: string, toId: string) => {
    setBoard(prev => {
      const card = prev.find(c => c.id === fromId)!.cards.find(c => c.id === cardId)!;
      if (toId === 'done') {
        const pts = (card.effort ?? 1) * (card.doubleDown ? 2 : 1);
        addToWeek('projectsWeek', todayDow(), pts);
        if (card.threat === 'omega') addAlignment(2); // OMEGA NEUTRALIZED → +2 ALIGNMENT
      }
      return prev.map(col => {
        if (col.id === fromId) return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        if (col.id === toId)   return { ...col, cards: [card, ...col.cards] };
        return col;
      });
    });
  };

  const deleteCard = (cardId: string, colId: string) => {
    setBoard(prev => prev.map(col =>
      col.id === colId ? { ...col, cards: col.cards.filter(c => c.id !== cardId) } : col
    ));
  };

  const toggleSubtask = (cardId: string, colId: string, subId: string) => {
    setBoard(prev => prev.map(col => col.id !== colId ? col : {
      ...col, cards: col.cards.map(c => c.id !== cardId ? c : {
        ...c, subtasks: (c.subtasks ?? []).map(st =>
          st.id === subId ? { ...st, done: !st.done } : st
        ),
      }),
    }));
  };

  const addSubtask = (cardId: string, colId: string) => {
    if (!newSubtask.trim()) return;
    setBoard(prev => prev.map(col => col.id !== colId ? col : {
      ...col, cards: col.cards.map(c => c.id !== cardId ? c : {
        ...c, subtasks: [...(c.subtasks ?? []), { id: Date.now().toString(), title: newSubtask.trim(), done: false }],
      }),
    }));
    setNewSubtask('');
  };

  const openEditCard = (card: KanbanCard, colId: string) => {
    setEditingCardId(card.id);
    setEditingCardColId(colId);
    setNewTitle(card.title);
    setNewTag(card.tags[0] ?? '');
    setNewThreat(card.threat ?? 'beta');
    setNewEffort(card.effort ?? 1);
    setNewDoubleDown(card.doubleDown ?? false);
    setTargetColId(colId);
    setShowModal(true);
  };

  const addCard = () => {
    if (!newTitle.trim()) return;
    if (editingCardId) {
      // Edit existing
      setBoard(prev => prev.map(col => ({
        ...col,
        cards: col.cards.map(c => c.id === editingCardId
          ? { ...c, title: newTitle.trim(), tags: newTag.trim() ? [newTag.trim()] : [], threat: newThreat, effort: newEffort, doubleDown: newDoubleDown, doubleDownDate: newDoubleDown ? (c.doubleDownDate ?? new Date().toISOString().split('T')[0]) : null }
          : c
        ),
      })));
    } else {
      const card: KanbanCard = {
        id: Date.now().toString(),
        title: newTitle.trim(),
        tags: newTag.trim() ? [newTag.trim()] : [],
        threat:         newThreat,
        effort:         newEffort,
        doubleDown:     newDoubleDown,
        doubleDownDate: newDoubleDown ? new Date().toISOString().split('T')[0] : null,
        subtasks: [],
      };
      setBoard(prev => prev.map(col =>
        col.id === targetColId ? { ...col, cards: [card, ...col.cards] } : col
      ));
    }
    setNewTitle('');
    setNewTag('');
    setNewThreat('beta');
    setNewDoubleDown(false);
    setShowDDWarning(false);
    setNewEffort(1);
    setEditingCardId(null);
    setEditingCardColId(null);
    setShowModal(false);
  };

  const totalCards = board.reduce((acc, col) => acc + col.cards.length, 0);
  const doneCards  = board.find(c => c.id === 'done')?.cards.length ?? 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.kicker}>Workspace Grid</Text>
          <Text style={font.h2}>Projects</Text>
          <Text style={[font.small, { marginTop: 2 }]}>{doneCards}/{totalCards} erledigt</Text>
        </View>
        <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color={colors.bg} />
        </TouchableOpacity>
      </View>

      {/* Column Summary */}
      <View style={s.summary}>
        {board.map(col => (
          <View key={col.id} style={s.summaryItem}>
            <View style={[s.summaryDot, { backgroundColor: COL_COLOR[col.id] }]} />
            <Text style={s.summaryCount}>{col.cards.length}</Text>
            <Text style={font.small}>{col.title}</Text>
          </View>
        ))}
      </View>

      {/* Kanban */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.board}
        style={{ flex: 1 }}
      >
        {board.map((col, colIdx) => (
          <View key={col.id} style={s.column}>
            <View style={s.colHeader}>
              <View style={[s.colDot, { backgroundColor: COL_COLOR[col.id] }]} />
              <Text style={s.colTitle}>{col.title}</Text>
              <View style={s.colBadge}>
                <Text style={s.colBadgeText}>{col.cards.length}</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {col.cards.map(card => (
                <KanbanCardView
                  key={card.id}
                  card={card}
                  colId={col.id}
                  colIdx={colIdx}
                  totalCols={board.length}
                  onMove={moveCard}
                  onDelete={deleteCard}
                  onEdit={() => openEditCard(card, col.id)}
                  expanded={expandedCard === card.id}
                  onToggleExpand={() => setExpandedCard(prev => prev === card.id ? null : card.id)}
                  onToggleSubtask={(subId) => toggleSubtask(card.id, col.id, subId)}
                  newSubtask={expandedCard === card.id ? newSubtask : ''}
                  onSubtaskChange={setNewSubtask}
                  onAddSubtask={() => addSubtask(card.id, col.id)}
                />
              ))}
              <TouchableOpacity
                style={s.addCard}
                onPress={() => { setTargetColId(col.id); setShowModal(true); }}
              >
                <Ionicons name="add" size={14} color={colors.textMuted} />
                <Text style={[font.small, { color: colors.textMuted }]}>Hinzufügen</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ))}

        {/* Weekly Chart Column */}
        <View style={s.chartColumn}>
          <Text style={[font.label, { marginBottom: sp.sm }]}>Diese Woche</Text>
          <WeeklyChart data={weekData} color={colors.accent} />
          <Text style={[font.small, { marginTop: sp.sm, textAlign: 'center' }]}>
            Tasks erledigt
          </Text>
        </View>
      </ScrollView>

      {/* Add Card Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={m.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setShowModal(false)} />
          <View style={m.sheet}>
            <Text style={m.sheetTitle}>{editingCardId ? 'Task bearbeiten' : 'Task hinzufügen'}</Text>

            <TextInput
              style={m.input}
              placeholder="Titel..."
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <TextInput
              style={[m.input, { marginTop: sp.sm }]}
              placeholder="Tag (z.B. Vertex, Design)"
              placeholderTextColor={colors.textMuted}
              value={newTag}
              onChangeText={setNewTag}
            />

            <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>THREAT LEVEL</Text>
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              {(Object.entries(THREAT) as [ThreatLevel, ThreatCfg][]).map(([lvl, cfg]) => {
                const active = newThreat === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[m.threatBtn, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                    onPress={() => setNewThreat(lvl)}
                  >
                    <Ionicons name={cfg.icon} size={14} color={active ? cfg.color : colors.textMuted} />
                    <Text style={[m.threatLabel, active && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>Aufwand</Text>
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              {([1, 2, 3, 5, 8] as const).map(pts => (
                <TouchableOpacity
                  key={pts}
                  style={[m.prioChip, newEffort === pts && { backgroundColor: colors.blueDim, borderColor: colors.blue }]}
                  onPress={() => setNewEffort(pts)}
                >
                  <Text style={[m.prioText, newEffort === pts && { color: colors.blue, fontWeight: '800' }]}>{pts}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Double Down ── */}
            <TouchableOpacity
              style={[m.ddBtn, newDoubleDown && m.ddBtnActive]}
              onPress={() => {
                const next = !newDoubleDown;
                setNewDoubleDown(next);
                if (next) { setShowDDWarning(true); setTimeout(() => setShowDDWarning(false), 2500); }
              }}
            >
              <View style={m.ddLeft}>
                <Text style={[m.ddX, newDoubleDown && m.ddXActive]}>2X</Text>
                <View>
                  <Text style={[m.ddTitle, newDoubleDown && m.ddTitleActive]}>DOUBLE DOWN PROTOKOLL</Text>
                  <Text style={m.ddSub}>
                    {newDoubleDown ? 'Aktiv — Punkte ×2 bei Abschluss' : 'Punkte verdoppeln / Penalty bei Versagen'}
                  </Text>
                </View>
              </View>
              <View style={[m.ddToggle, newDoubleDown && m.ddToggleOn]}>
                <View style={[m.ddKnob, newDoubleDown && m.ddKnobOn]} />
              </View>
            </TouchableOpacity>

            {showDDWarning && (
              <View style={m.ddWarningBox}>
                <Ionicons name="nuclear" size={14} color={colors.red} />
                <Text style={m.ddWarningTxt}>⚡ DOUBLE DOWN PROTOCOL INITIATED ⚡</Text>
                <Ionicons name="nuclear" size={14} color={colors.red} />
              </View>
            )}

            <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>Spalte</Text>
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              {board.map(col => (
                <TouchableOpacity
                  key={col.id}
                  style={[m.prioChip, targetColId === col.id && { backgroundColor: COL_COLOR[col.id] + '25', borderColor: COL_COLOR[col.id] }]}
                  onPress={() => setTargetColId(col.id)}
                >
                  <Text style={[m.prioText, targetColId === col.id && { color: COL_COLOR[col.id] }]}>
                    {col.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={m.btns}>
              <TouchableOpacity style={m.btnCancel} onPress={() => { setShowModal(false); setEditingCardId(null); }}>
                <Text style={{ color: colors.textSub }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnSave} onPress={addCard}>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function KanbanCardView({
  card, colId, colIdx, totalCols, onMove, onDelete, onEdit,
  expanded, onToggleExpand, onToggleSubtask, newSubtask, onSubtaskChange, onAddSubtask,
}: {
  card: KanbanCard; colId: string; colIdx: number; totalCols: number;
  onMove: (id: string, from: string, to: string) => void;
  onDelete: (id: string, colId: string) => void;
  onEdit: () => void;
  expanded: boolean; onToggleExpand: () => void;
  onToggleSubtask: (subId: string) => void;
  newSubtask: string; onSubtaskChange: (v: string) => void;
  onAddSubtask: () => void;
}) {
  const subtasks  = card.subtasks ?? [];
  const doneCount = subtasks.filter(st => st.done).length;
  const threat    = card.threat ?? 'beta';
  const tcfg      = THREAT[threat];

  // Omega: pulsing border animation
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (threat !== 'omega') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [threat]); // eslint-disable-line

  const omegaBorder = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(192,57,43,0.3)', 'rgba(192,57,43,1)'],
  });

  const CardContainer = threat === 'omega'
    ? ({ children }: { children: React.ReactNode }) => (
        <Animated.View style={[cs.card, { borderColor: omegaBorder }]}>{children}</Animated.View>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <View style={cs.card}>{children}</View>
      );

  return (
    <CardContainer>
      <View style={cs.cardTop}>
        <View style={[cs.threatBadge, { backgroundColor: tcfg.bg }]}>
          <Ionicons name={tcfg.icon} size={11} color={tcfg.color} />
          <Text style={[cs.threatLabel, { color: tcfg.color }]}>{tcfg.label}</Text>
        </View>
        <View style={cs.arrows}>
          {colIdx > 0 && (
            <TouchableOpacity style={cs.arrow} onPress={() => onMove(card.id, colId, COL_ORDER[colIdx - 1])}>
              <Ionicons name="arrow-back" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          {colIdx < totalCols - 1 && (
            <TouchableOpacity style={[cs.arrow, cs.arrowFwd]} onPress={() => onMove(card.id, colId, COL_ORDER[colIdx + 1])}>
              <Ionicons name="arrow-forward" size={12} color={colors.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={cs.arrow} onPress={onEdit}>
            <Ionicons name="pencil" size={11} color={colors.blue} />
          </TouchableOpacity>
          <TouchableOpacity style={cs.arrow} onPress={() => onDelete(card.id, colId)}>
            <Ionicons name="close" size={12} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.85}>
        <Text style={cs.title}>{card.title}</Text>
      </TouchableOpacity>

      <View style={cs.cardFooter}>
        {card.tags.length > 0 && card.tags.map(tag => (
          <View key={tag} style={cs.tag}><Text style={cs.tagText}>{tag}</Text></View>
        ))}
        <View style={cs.effortBadge}>
          <Text style={cs.effortTxt}>{card.effort ?? 1}pt</Text>
        </View>
        {card.doubleDown && (
          <View style={cs.ddBadge}>
            <Text style={cs.ddBadgeTxt}>2X</Text>
          </View>
        )}
        {subtasks.length > 0 && (
          <TouchableOpacity style={cs.subtasksBadge} onPress={onToggleExpand}>
            <Text style={cs.subtasksTxt}>{doneCount}/{subtasks.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subtasks — expanded */}
      {expanded && (
        <View style={cs.subtasksWrap}>
          {subtasks.map(st => (
            <TouchableOpacity key={st.id} style={cs.subtaskRow} onPress={() => onToggleSubtask(st.id)}>
              <View style={[cs.stCheck, st.done && cs.stCheckDone]}>
                {st.done && <Ionicons name="checkmark" size={9} color={colors.bg} />}
              </View>
              <Text style={[cs.stTitle, st.done && cs.stDone]}>{st.title}</Text>
            </TouchableOpacity>
          ))}
          <View style={cs.stInputRow}>
            <TextInput
              style={cs.stInput}
              value={newSubtask}
              onChangeText={onSubtaskChange}
              placeholder="Teilaufgabe hinzufügen..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={onAddSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={onAddSubtask}>
              <Ionicons name="add-circle" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </CardContainer>
  );
}

const cs = StyleSheet.create({
  card: {
    ...fx.card,
    borderRadius: r.lg,
    padding: sp.md,
    marginBottom: sp.sm,
    marginBottom: sp.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  threatBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: r.sm },
  threatLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  arrows: { flexDirection: 'row', gap: 4 },
  arrow: { padding: 5, backgroundColor: colors.cardAlt, borderRadius: 4 },
  arrowFwd: { borderColor: colors.accentDim, borderWidth: 1 },
  title: { fontSize: 14, fontWeight: '500', color: colors.text, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: sp.sm },
  tag: { backgroundColor: colors.accentDim, borderRadius: r.full, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '700', color: colors.accent },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: sp.sm, alignItems: 'center' },
  effortBadge: { backgroundColor: colors.blueDim, borderRadius: r.full, paddingHorizontal: 6, paddingVertical: 2 },
  effortTxt: { fontSize: 10, fontWeight: '700', color: colors.blue },
  ddBadge: { backgroundColor: 'rgba(192,57,43,0.18)', borderRadius: r.full, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(192,57,43,0.5)' },
  ddBadgeTxt: { fontSize: 10, fontWeight: '900', color: colors.red },
  subtasksBadge: { backgroundColor: colors.accentDim, borderRadius: r.full, paddingHorizontal: 6, paddingVertical: 2 },
  subtasksTxt: { fontSize: 10, fontWeight: '700', color: colors.accent },
  subtasksWrap: { marginTop: sp.sm, paddingTop: sp.sm, borderTopWidth: 1, borderTopColor: colors.border },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: 4 },
  stCheck: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stCheckDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  stTitle: { flex: 1, fontSize: 13, color: colors.text },
  stDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  stInputRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: sp.xs },
  stInput: { flex: 1, color: colors.text, fontSize: 13, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 4 },
});

const m = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: r.xl,
    borderTopRightRadius: r.xl,
    padding: sp.lg,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: { ...font.h3, marginBottom: sp.md },
  input: {
    backgroundColor: colors.card,
    borderRadius: r.md,
    padding: sp.md,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  btnCancel: {
    flex: 1,
    padding: sp.md,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  btnSave: {
    flex: 1,
    padding: sp.md,
    borderRadius: r.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  prioChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  prioDot: { width: 6, height: 6, borderRadius: 3 },
  prioText: { fontSize: 12, fontWeight: '600', color: colors.textSub },
  threatBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: r.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  threatLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },

  // ── Double Down ───────────────────────────────────────────────────────────
  ddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: r.md, padding: sp.md,
    borderWidth: 1, borderColor: colors.border, marginTop: sp.md,
  },
  ddBtnActive: { borderColor: colors.red, backgroundColor: 'rgba(192,57,43,0.08)' },
  ddLeft: { flexDirection: 'row', alignItems: 'center', gap: sp.md, flex: 1 },
  ddX: { fontSize: 22, fontWeight: '900', color: colors.textMuted, letterSpacing: -1 },
  ddXActive: { color: colors.red },
  ddTitle: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  ddTitleActive: { color: colors.red },
  ddSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  ddToggle: { width: 40, height: 22, borderRadius: 11, backgroundColor: colors.border, padding: 2 },
  ddToggleOn: { backgroundColor: colors.red },
  ddKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textMuted },
  ddKnobOn: { backgroundColor: colors.text, transform: [{ translateX: 18 }] },
  ddWarningBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.sm, backgroundColor: 'rgba(192,57,43,0.12)',
    borderRadius: r.md, padding: sp.sm, marginTop: sp.sm,
    borderWidth: 1, borderColor: colors.red,
  },
  ddWarningTxt: { fontSize: 11, fontWeight: '800', color: colors.red, letterSpacing: 0.5 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingTop: sp.lg,
    paddingBottom: sp.sm,
  },
  kicker: { fontSize: 12, fontWeight: '800', color: colors.teal, letterSpacing: 1.3, marginBottom: 3 },
  fab: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: sp.sm,
    marginBottom: sp.md,
  },
  summaryItem: {
    ...fx.card,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: r.md,
    paddingHorizontal: sp.sm,
    paddingVertical: 7,
  },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryCount: { fontSize: 14, fontWeight: '700', color: colors.text },

  board: {
    paddingHorizontal: 20,
    paddingBottom: sp.xl,
    gap: sp.sm,
    alignItems: 'flex-start',
  },
  column: {
    ...fx.panel,
    width: 258,
    borderRadius: r.xl,
    padding: sp.sm,
    maxHeight: 520,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.xs,
    marginBottom: sp.xs,
  },
  colDot: { width: 8, height: 8, borderRadius: 4 },
  colTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  colBadge: {
    backgroundColor: colors.card,
    borderRadius: r.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  colBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textSub },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    padding: sp.sm,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: sp.xs,
  },

  chartColumn: {
    ...fx.panel,
    width: 220,
    borderRadius: r.xl,
    padding: sp.md,
    alignSelf: 'flex-start',
  },
});
