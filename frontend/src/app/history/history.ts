export interface HistorySet {
  setNumber: number;
  weightKg: number;
  reps: number;
}

export interface Session {
  workoutId: number;
  date: string;
  sets: HistorySet[];
  volumeKg: number;
  bestOneRepMax: number;
  topWeightKg: number;
}

export interface Best {
  value: number;
  weightKg: number;
  reps: number;
  date: string;
}

export interface ExerciseHistory {
  sessions: Session[];
  records: {
    oneRepMax: Best | null;
    heaviest: Best | null;
    mostReps: Best | null;
    sessionVolume: Best | null;
    sessions: number;
    totalSets: number;
  };
}

export interface WorkoutSummary {
  id: number;
  name: string | null;
  routineId: number | null;
  startedAt: string;
  finishedAt: string | null;
  exercises: string[];
  sets: number;
  volumeKg: number;
}

export type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL';
export const RANGES: Range[] = ['1M', '3M', '6M', '1Y', 'ALL'];

/** The start of a range ending now, or 0 for all time. */
export function rangeStart(range: Range, now = new Date()): number {
  const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, ALL: 0 }[range];
  if (!months) return 0;
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.getTime();
}

/** Ids of sessions that set a new best estimated 1RM at the time they happened. */
export function recordSessions(sessions: Session[]): Set<number> {
  const records = new Set<number>();
  let best = 0;
  for (const s of [...sessions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    if (s.bestOneRepMax > best) {
      // The very first session is a baseline, not a record.
      if (best > 0) records.add(s.workoutId);
      best = s.bestOneRepMax;
    }
  }
  return records;
}

/** "80 kg · 5, 5, 4" when the weight is the same, otherwise "80×5, 82.5×3". */
export function describeSets(sets: HistorySet[]): string {
  if (sets.length === 0) return '';
  const weights = new Set(sets.map((s) => s.weightKg));
  if (weights.size === 1)
    return `${kg(sets[0].weightKg)} kg · ${sets.map((s) => s.reps).join(', ')}`;
  return sets.map((s) => `${kg(s.weightKg)}×${s.reps}`).join(', ');
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function kg(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}
