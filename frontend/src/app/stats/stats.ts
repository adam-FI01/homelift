import { MuscleGroup } from '../exercises/exercise';

export const PERIODS = ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] as const;
export type Period = (typeof PERIODS)[number];
export type DayOfWeek =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface Totals {
  workouts: number;
  sets: number;
  reps: number;
  volumeKg: number;
  minutes: number;
}

export interface Lift {
  exerciseId: number;
  name: string;
  weightKg: number;
  reps: number;
  estimatedOneRepMax: number;
  date: string;
}

export interface Stats {
  period: Period;
  /** First day, YYYY-MM-DD. */
  start: string;
  /** Day after the last, YYYY-MM-DD. */
  end: string;
  totals: Totals;
  previous: Totals;
  activeDays: number;
  longestStreakDays: number;
  averageMinutes: number;
  topExercise: { exerciseId: number; name: string; sets: number; volumeKg: number } | null;
  muscleGroups: { muscleGroup: MuscleGroup; sets: number; share: number }[];
  heaviestLift: Lift | null;
  records: Lift[];
  biggestSession: { workoutId: number; date: string; volumeKg: number; sets: number } | null;
  favoriteWeekday: { day: DayOfWeek; workouts: number } | null;
  favoriteTimeOfDay: TimeOfDay | null;
  buckets: { start: string; workouts: number; volumeKg: number }[];
}

const PERIOD_NOUN: Record<Period, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
};

export function periodNoun(p: Period): string {
  return PERIOD_NOUN[p];
}

/** Parses YYYY-MM-DD as a local date, avoiding the UTC shift of Date.parse. */
export function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A day inside the period before or after the one starting on `start`. */
export function shiftPeriod(period: Period, start: string, direction: -1 | 1): string {
  const d = localDate(start);
  switch (period) {
    case 'DAY':
      d.setDate(d.getDate() + direction);
      break;
    case 'WEEK':
      d.setDate(d.getDate() + 7 * direction);
      break;
    case 'MONTH':
      d.setMonth(d.getMonth() + direction);
      break;
    case 'QUARTER':
      d.setMonth(d.getMonth() + 3 * direction);
      break;
    case 'YEAR':
      d.setFullYear(d.getFullYear() + direction);
      break;
  }
  return isoDate(d);
}

/** "Today", "Week of 16 Nov", "November 2026", "Q4 2026", "2026". */
export function periodTitle(period: Period, start: string, today = new Date()): string {
  const d = localDate(start);
  switch (period) {
    case 'DAY':
      return isoDate(d) === isoDate(today)
        ? 'Today'
        : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    case 'WEEK':
      return 'Week of ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    case 'MONTH':
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    case 'QUARTER':
      return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    case 'YEAR':
      return String(d.getFullYear());
  }
}

/** Percentage change, or null when there is nothing to compare with. */
export function change(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

const THINGS = [
  { kg: 150_000, one: 'blue whale', many: 'blue whales' },
  { kg: 6_000, one: 'elephant', many: 'elephants' },
  { kg: 1_500, one: 'car', many: 'cars' },
  { kg: 300, one: 'grand piano', many: 'grand pianos' },
  { kg: 30, one: 'golden retriever', many: 'golden retrievers' },
];

/** "about 3.2 cars": the volume in something easier to picture. */
export function volumeComparison(kg: number): string | null {
  const thing = THINGS.find((t) => kg >= t.kg);
  if (!thing) return null;
  const count = kg / thing.kg;
  const rounded = count >= 10 ? Math.round(count) : Math.round(count * 10) / 10;
  return `about ${rounded} ${rounded === 1 ? thing.one : thing.many}`;
}

export function hoursAndMinutes(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export function titleCase(value: string): string {
  const words = value.toLowerCase().replace('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
