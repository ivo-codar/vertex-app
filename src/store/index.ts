import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Routine, CalendarEvent,
  TrainingSplit, ExerciseRecord,
  SubjectItem, WorkSession, GradeEntry,
  KanbanColumn, WeekData,
} from '../types';
import { colors } from '../theme';
import { getCurrentMonday } from '../utils/storage';

// ── Defaults ──────────────────────────────────────────────────────────────────

const COLOR_POOL = [
  colors.blue, colors.amber, colors.accent, colors.teal,
  '#FF6B9D', colors.green, '#FF8A65', '#CE93D8',
];

export const DEFAULT_SUBJECTS: SubjectItem[] = [
  { name: 'Mathe',      color: colors.blue },
  { name: 'Physik',     color: colors.amber },
  { name: 'Informatik', color: colors.accent },
  { name: 'Englisch',   color: colors.teal },
  { name: 'Deutsch',    color: '#FF6B9D' },
  { name: 'Biologie',   color: colors.green },
];
export { COLOR_POOL };

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
        // v0 → v1: add focusSubject, notifMap, WeekData shape
        if (fromVersion < 1) {
          stored.focusSubject  = stored.focusSubject  ?? DEFAULT_SUBJECTS[0].name;
          stored.notifMap      = stored.notifMap      ?? {};
          stored.gymWeek       = stored.gymWeek?.data ? stored.gymWeek : emptyWeek();
          stored.focusWeek     = stored.focusWeek?.data ? stored.focusWeek : emptyWeek();
          stored.projectsWeek  = stored.projectsWeek?.data ? stored.projectsWeek : emptyWeek();
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
