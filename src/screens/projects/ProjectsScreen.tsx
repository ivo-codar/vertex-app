import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, sp, r, font } from '../../theme';
import { KanbanColumn, KanbanCard } from '../../types';
import WeeklyChart from '../../components/WeeklyChart';
import { useStore, todayDow, INITIAL_BOARD } from '../../store';

const PRIORITY_COLOR = {
  low:    colors.textMuted,
  medium: colors.amber,
  high:   colors.red,
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
  const [newTitle, setNewTitle]     = useState('');
  const [newTag, setNewTag]         = useState('');
  const [newPriority, setNewPriority] = useState<KanbanCard['priority']>('medium');
  const [targetColId, setTargetColId] = useState('todo');

  const moveCard = (cardId: string, fromId: string, toId: string) => {
    setBoard(prev => {
      const card = prev.find(c => c.id === fromId)!.cards.find(c => c.id === cardId)!;
      if (toId === 'done') {
        addToWeek('projectsWeek', todayDow(), 1);
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

  const addCard = () => {
    if (!newTitle.trim()) return;
    const card: KanbanCard = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      tags: newTag.trim() ? [newTag.trim()] : [],
      priority: newPriority,
    };
    setBoard(prev => prev.map(col =>
      col.id === targetColId ? { ...col, cards: [card, ...col.cards] } : col
    ));
    setNewTitle('');
    setNewTag('');
    setNewPriority('medium');
    setShowModal(false);
  };

  const totalCards = board.reduce((acc, col) => acc + col.cards.length, 0);
  const doneCards  = board.find(c => c.id === 'done')?.cards.length ?? 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
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
            <Text style={m.sheetTitle}>Task hinzufügen</Text>

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

            <Text style={[font.label, { marginTop: sp.md, marginBottom: sp.sm }]}>Priorität</Text>
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[m.prioChip, newPriority === p && { backgroundColor: PRIORITY_COLOR[p] + '25', borderColor: PRIORITY_COLOR[p] }]}
                  onPress={() => setNewPriority(p)}
                >
                  <View style={[m.prioDot, { backgroundColor: PRIORITY_COLOR[p] }]} />
                  <Text style={[m.prioText, newPriority === p && { color: PRIORITY_COLOR[p] }]}>
                    {p === 'low' ? 'Niedrig' : p === 'medium' ? 'Mittel' : 'Hoch'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
              <TouchableOpacity style={m.btnCancel} onPress={() => setShowModal(false)}>
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
  card, colId, colIdx, totalCols, onMove, onDelete,
}: {
  card: KanbanCard;
  colId: string;
  colIdx: number;
  totalCols: number;
  onMove: (id: string, from: string, to: string) => void;
  onDelete: (id: string, colId: string) => void;
}) {
  return (
    <View style={cs.card}>
      <View style={cs.cardTop}>
        <View style={[cs.priority, { backgroundColor: PRIORITY_COLOR[card.priority] }]} />
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
          <TouchableOpacity style={cs.arrow} onPress={() => onDelete(card.id, colId)}>
            <Ionicons name="close" size={12} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={cs.title}>{card.title}</Text>
      {card.tags.length > 0 && (
        <View style={cs.tags}>
          {card.tags.map(tag => (
            <View key={tag} style={cs.tag}>
              <Text style={cs.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: r.md,
    padding: sp.md,
    marginBottom: sp.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  priority: { width: 8, height: 8, borderRadius: 4 },
  arrows: { flexDirection: 'row', gap: 4 },
  arrow: { padding: 5, backgroundColor: colors.cardAlt, borderRadius: 4 },
  arrowFwd: { borderColor: colors.accentDim, borderWidth: 1 },
  title: { fontSize: 14, fontWeight: '500', color: colors.text, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: sp.sm },
  tag: { backgroundColor: colors.accentDim, borderRadius: r.full, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '700', color: colors.accent },
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
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingTop: sp.md,
    paddingBottom: sp.sm,
  },
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: r.md,
    paddingHorizontal: sp.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
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
    width: 258,
    backgroundColor: colors.surface,
    borderRadius: r.lg,
    padding: sp.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: r.lg,
    padding: sp.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
});
