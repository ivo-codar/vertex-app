import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Routine, CalendarEvent,
  TrainingSplit, ExerciseRecord,
  SubjectItem, WorkSession, GradeEntry, GradeSubject, CategoryWeights,
  KanbanColumn, WeekData,
} from '../types';
import { colors } from '../theme';
import { getCurrentMonday } from '../utils/storage';

// ── Defaults ──────────────────────────────────────────────────────────────────

const COLOR_POOL = [
  '#00AEEF', '#C8960C', '#E09B00', '#00C9B1',
  '#8B7FD4', '#1A9E5C', '#E07B5C', '#7B9ED9',
  '#C0392B', '#D4A5A5', '#5BA3A0', '#9B8EC4',
];

export const DEFAULT_SUBJECTS: SubjectItem[] = [
  { name: 'Mathe',      color: '#00AEEF', icon: 'calculator-outline' },  // arc reactor
  { name: 'Physik',     color: '#E09B00', icon: 'flask-outline' },       // energy
  { name: 'Informatik', color: '#C8960C', icon: 'code-slash-outline' },  // stark gold
  { name: 'Englisch',   color: '#00C9B1', icon: 'language-outline' },    // jarvis teal
  { name: 'Deutsch',    color: '#8B7FD4', icon: 'book-outline' },        // wayne purple
  { name: 'Biologie',   color: '#1A9E5C', icon: 'leaf-outline' },        // field green
];
export { COLOR_POOL };

const DEFAULT_WEIGHTS: CategoryWeights = { Klausur: 50, Mündlich: 50, Praktisch: 0, Test: 0, Präsentation: 0 };
const SPORT_WEIGHTS:   CategoryWeights = { Klausur: 30, Mündlich: 0,  Praktisch: 70, Test: 0, Präsentation: 0 };

export const DEFAULT_GRADE_SUBJECTS: GradeSubject[] = [
  { id: 'gs-de', name: 'Deutsch',     isLK: true,  weights: DEFAULT_WEIGHTS },
  { id: 'gs-en', name: 'Englisch',    isLK: true,  weights: DEFAULT_WEIGHTS },
  { id: 'gs-sp', name: 'Sport',       isLK: true,  weights: SPORT_WEIGHTS   },
  { id: 'gs-ma', name: 'Mathe',       isLK: false, weights: DEFAULT_WEIGHTS },
  { id: 'gs-ph', name: 'Physik',      isLK: false, weights: DEFAULT_WEIGHTS },
  { id: 'gs-ge', name: 'Geschichte',  isLK: false, weights: DEFAULT_WEIGHTS },
  { id: 'gs-bi', name: 'Biologie',    isLK: false, weights: DEFAULT_WEIGHTS },
  { id: 'gs-ku', name: 'Kunst',       isLK: false, weights: { Klausur: 20, Mündlich: 20, Praktisch: 60, Test: 0, Präsentation: 0 } },
];

export const INITIAL_BOARD: KanbanColumn[] = [
  { id: 'todo',       title: 'To Do',       cards: [] },
  { id: 'inprogress', title: 'In Progress', cards: [] },
  { id: 'done',       title: 'Done',        cards: [] },
];

const emptyWeek = (): WeekData => ({ weekOf: getCurrentMonday(), data: Array(7).fill(0) });

// ── State ─────────────────────────────────────────────────────────────────────

interface State {
  _hydrated: boolean;
  // Home
  routines: Routine[];
  events: CalendarEvent[];
  streak: number;
  lastStreakDate: string;
  notifMap: Record<string, string>; // eventId → scheduledNotificationId
  // Gym
  gymSplits: TrainingSplit[];
  gymRecords: ExerciseRecord[];
  gymWeek: WeekData;
  // Focus
  focusSubjects: SubjectItem[];
  focusSubject: string;
  focusSessions: WorkSession[];
  focusWeek: WeekData;
  focusGrades: GradeEntry[];
  // Grade book
  gradeSubjects: GradeSubject[];
  activeSemester: 1 | 2 | 3 | 4;
  // Projects
  projectsBoard: KanbanColumn[];
  projectsWeek: WeekData;
}

interface Actions {
  /** Shallow-merge any partial state update. Accepts object or updater function. */
  update: (partial: Partial<State> | ((s: State) => Partial<State>)) => void;
  /** Increment a week-data counter by amount on a specific day index. */
  addToWeek: (key: 'gymWeek' | 'focusWeek' | 'projectsWeek', dayIdx: number, amount: number) => void;
  /** Called on app foreground — resets expired week data and missed streaks. */
  checkResets: () => void;
  /** Add a custom focus subject with auto-assigned color. */
  addSubject: (name: string) => void;
}

export type AppStore = State & Actions;

// ── Store ─────────────────────────────────────────────────────────────────────

const STORE_VERSION = 1;

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      _hydrated: false,
      routines: [],
      events: [],
      streak: 0,
      lastStreakDate: '',
      notifMap: {},
      gymSplits: [],
      gymRecords: [],
      gymWeek: emptyWeek(),
      focusSubjects: DEFAULT_SUBJECTS,
      gradeSubjects: DEFAULT_GRADE_SUBJECTS,
      activeSemester: 1,
      focusSubject: DEFAULT_SUBJECTS[0].name,
      focusSessions: [],
      focusWeek: emptyWeek(),
      focusGrades: [],
      projectsBoard: INITIAL_BOARD,
      projectsWeek: emptyWeek(),

      // ── Actions ────────────────────────────────────────────────────────────

      update: (partial) => {
        if (typeof partial === 'function') {
          set(state => ({ ...state, ...partial(state) }));
        } else {
          set(state => ({ ...state, ...partial }));
        }
      },

      addToWeek: (key, dayIdx, amount) => {
        set(state => ({
          [key]: {
            weekOf: state[key].weekOf,
            data: state[key].data.map((v, i) => i === dayIdx ? v + amount : v),
          },
        }));
      },

      checkResets: () => {
        const state = get();
        const mon   = getCurrentMonday();
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const todayStr = today.toDateString();
        const ystStr   = yesterday.toDateString();

        const updates: Partial<State> = {};

        // Week resets
        if (state.gymWeek.weekOf !== mon)      updates.gymWeek = emptyWeek();
        if (state.focusWeek.weekOf !== mon)     updates.focusWeek = emptyWeek();
        if (state.projectsWeek.weekOf !== mon)  updates.projectsWeek = emptyWeek();

        // Streak reset if user missed a day
        if (
          state.lastStreakDate &&
          state.lastStreakDate !== todayStr &&
          state.lastStreakDate !== ystStr
        ) {
          updates.streak = 0;
          updates.lastStreakDate = '';
        }

        // Reset completed routines at start of each day
        if (state.lastStreakDate && state.lastStreakDate !== todayStr) {
          updates.routines = state.routines.map(r => ({ ...r, completed: false }));
        }

        if (Object.keys(updates).length > 0) {
          set(state => ({ ...state, ...updates }));
        }
      },

      addSubject: (name) => {
        const state = get();
        if (state.focusSubjects.some(s => s.name === name)) return;
        const color = COLOR_POOL[state.focusSubjects.length % COLOR_POOL.length];
        set(state => ({
          ...state,
          focusSubjects: [...state.focusSubjects, { name, color }],
        }));
      },
    }),

    // ── Persistence config ───────────────────────────────────────────────────
    {
      name: 'vertex-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_VERSION,

      // Schema migration: runs when stored version < STORE_VERSION
      migrate: (stored: any, fromVersion: number) => {
        if (fromVersion < 1) {
          stored.focusSubject  = stored.focusSubject  ?? DEFAULT_SUBJECTS[0].name;
          stored.notifMap      = stored.notifMap      ?? {};
          stored.gymWeek       = stored.gymWeek?.data ? stored.gymWeek : emptyWeek();
          stored.focusWeek     = stored.focusWeek?.data ? stored.focusWeek : emptyWeek();
          stored.projectsWeek  = stored.projectsWeek?.data ? stored.projectsWeek : emptyWeek();
        }
        // Always ensure grade fields exist (added in v2)
        stored.gradeSubjects  = stored.gradeSubjects  ?? DEFAULT_GRADE_SUBJECTS;
        stored.activeSemester = stored.activeSemester ?? 1;
        // Migrate GradeEntry and category names
        const CAT_MAP: Record<string, string> = { 'Schriftlich': 'Klausur', 'Sonstig': 'Präsentation' };
        if (Array.isArray(stored.focusGrades)) {
          stored.focusGrades = stored.focusGrades.map((g: any) => ({
            ...g,
            subjectId: g.subjectId ?? g.id,
            category:  CAT_MAP[g.category] ?? g.category ?? 'Klausur',
            semester:  g.semester  ?? 1,
            weight:    g.weight    ?? 1,
          }));
        }
        // Migrate subject weights keys
        if (Array.isArray(stored.gradeSubjects)) {
          stored.gradeSubjects = stored.gradeSubjects.map((s: any) => ({
            ...s,
            weights: {
              Klausur:      s.weights?.Klausur      ?? s.weights?.Schriftlich ?? 50,
              Mündlich:     s.weights?.Mündlich     ?? 50,
              Praktisch:    s.weights?.Praktisch    ?? 0,
              Test:         s.weights?.Test         ?? 0,
              Präsentation: s.weights?.Präsentation ?? s.weights?.Sonstig ?? 0,
            },
          }));
        }
        return stored as AppStore;
      },

      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },

      // Don't persist ephemeral UI state
      partialize: (state) => {
        const { _hydrated, ...rest } = state;
        return rest;
      },
    }
  )
);

// ── Convenience selectors ─────────────────────────────────────────────────────

export const todayDow = () => (new Date().getDay() + 6) % 7;
