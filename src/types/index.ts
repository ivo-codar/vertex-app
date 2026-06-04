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
  completedDates: string[]; // YYYY-MM-DD — one entry per day completed
  time?: string;
  days: number[];           // 0=Mo … 6=So, empty = every day
  notifIds?: string[];      // expo notification IDs for scheduled reminders
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
  date: string;
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
  icon?: string;
};

export type WorkSession = {
  id: string;
  subject: string;
  duration: number;
  date?: string; // YYYY-MM-DD — when the session took place
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
  isLK: boolean;
  weights: CategoryWeights;
};

export type GradeEntry = {
  id: string;
  subjectId: string;
  subject: string;
  points: number;
  category: GradeCategory;
  label: string;
  date: string;
  semester: 1 | 2 | 3 | 4;
  weight: number;
};

// ── Projects ──────────────────────────────────────────────────────────────────

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type ThreatLevel = 'gamma' | 'beta' | 'alpha' | 'omega';

export type KanbanCard = {
  id: string;
  title: string;
  tags: string[];
  threat: ThreatLevel;
  effort: 1 | 2 | 3 | 5 | 8;
  doubleDown: boolean;           // 2x points on done, penalty on miss
  doubleDownDate: string | null; // YYYY-MM-DD when protocol was activated
  dueDate?: string | null;       // YYYY-MM-DD optional deadline
  subtasks: Subtask[];
};

export type KanbanColumn = {
  id: string;
  title: string;
  cards: KanbanCard[];
};

// ── Abitur ────────────────────────────────────────────────────────────────────

export type AbiturExamType = 'schriftlich' | 'mündlich';

export type AbiturExam = {
  id: string;
  subjectId: string;
  subject: string;
  type: AbiturExamType;
  points: number; // 0–15 raw points
};

// ── Store ─────────────────────────────────────────────────────────────────────

export type WeekData = {
  weekOf: string;
  data: number[];
};
