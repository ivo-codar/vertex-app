export type TabParamList = {
  Home:     undefined;
  Gym:      undefined;
  DeepWork: undefined;
  Projects: undefined;
  Progress: undefined;
};

// ── Home ──────────────────────────────────────────────────────────────────────

export type Routine = {
  id: string;
  title: string;
  streak: number;
  completed: boolean;
  time?: string;
  days: number[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  isoDate: string; // YYYY-MM-DD
  tag: string;
};

// ── Gym ───────────────────────────────────────────────────────────────────────

export type SetEntry = {
  id: string;
  weight: number;
  reps: number;
};

export type ExerciseEntry = {
  id: string;
  date: string;       // YYYY-MM-DD
  sets: SetEntry[];
  maxWeight: number;
};

export type ExerciseRecord = {
  id: string;
  name: string;
  unit: 'kg' | 'lbs';
  entries: ExerciseEntry[];
};

export type SplitDay = {
  id: string;
  name: string;
  exercises: string[];
};

export type TrainingSplit = {
  id: string;
  name: string;
  days: SplitDay[];
};

// ── Focus ─────────────────────────────────────────────────────────────────────

export type SubjectItem = {
  name: string;
  color: string;
  icon?: string; // optional Ionicons name
};

export type WorkSession = {
  id: string;
  subject: string;
  duration: number; // minutes
};

export type GradeCategory = 'Klausur' | 'Mündlich' | 'Praktisch' | 'Test' | 'Präsentation';

export type CategoryWeights = {
  Klausur:      number;
  Mündlich:     number;
  Praktisch:    number;
  Test:         number;
  Präsentation: number;
};

export type GradeSubject = {
  id: string;
  name: string;
  isLK: boolean;           // Leistungskurs — zählt doppelt
  weights: CategoryWeights; // müssen zusammen 100 ergeben
};

export type GradeEntry = {
  id: string;
  subjectId: string;
  subject: string;
  points: number;          // 0-15
  category: GradeCategory;
  label: string;
  date: string;            // YYYY-MM-DD
  semester: 1 | 2 | 3 | 4;
  weight: number;          // individuelle Gewichtung, default 1
};

// ── Projects ──────────────────────────────────────────────────────────────────

export type KanbanCard = {
  id: string;
  title: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
};

export type KanbanColumn = {
  id: string;
  title: string;
  cards: KanbanCard[];
};

// ── Store ─────────────────────────────────────────────────────────────────────

export type WeekData = {
  weekOf: string; // YYYY-MM-DD of that Monday
  data: number[];
};
