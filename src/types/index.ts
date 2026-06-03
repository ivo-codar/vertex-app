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

export type GradeEntry = {
  id: string;
  subject: string;
  points: number; // 0-15 Abitur
  label: string;
  date: string;   // YYYY-MM-DD
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
