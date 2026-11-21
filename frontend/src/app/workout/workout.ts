import { Equipment, MuscleGroup } from '../exercises/exercise';

export interface LoggedSet {
  id: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  /** Warm-ups are kept but left out of volume, records and "last time". */
  warmup: boolean;
  /** Logged while offline and not yet on the server. */
  pending?: boolean;
}

export interface PreviousSet {
  weightKg: number;
  reps: number;
}

export interface WorkoutExercise {
  /** Id of this exercise within the workout (not the library exercise id). */
  id: number;
  exerciseId: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  targetSets: number;
  /** Planned reps per set when started from a routine. */
  targetReps: number | null;
  /** Rest after each set, in seconds, when started from a routine. */
  restSeconds: number | null;
  /** Add weight when every set last time reached the planned reps. */
  autoProgress: boolean;
  /** Exercises with the same group are a superset, done back to back. */
  supersetGroup: number | null;
  /** Set-up cues saved on the exercise, such as seat height. */
  notes: string | null;
  sets: LoggedSet[];
  lastTime: PreviousSet[];
}

export interface Workout {
  id: number;
  name: string | null;
  routineId: number | null;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  exercises: WorkoutExercise[];
}

export const WEIGHT_STEP_KG = 2.5;

/**
 * Values to fill in for the next set: repeat what was just logged today, otherwise the same
 * set from last time (plus a step when auto progression earned it), otherwise a sensible
 * starting point for the equipment.
 */
export function nextSetDefaults(exercise: WorkoutExercise, stepKg = WEIGHT_STEP_KG): PreviousSet {
  const today = workingSets(exercise).at(-1);
  if (today) return { weightKg: today.weightKg, reps: today.reps };
  const target = exercise.targetReps;
  const previous = exercise.lastTime[0];
  if (previous) {
    if (earnedProgression(exercise)) return { weightKg: previous.weightKg + stepKg, reps: target! };
    return { weightKg: previous.weightKg, reps: target ?? previous.reps };
  }
  return { weightKg: startingWeight(exercise.equipment), reps: target ?? 8 };
}

/** True when auto progression is on and every planned set last time reached the planned reps. */
export function earnedProgression(exercise: WorkoutExercise): boolean {
  const target = exercise.targetReps;
  const last = exercise.lastTime;
  return (
    exercise.autoProgress &&
    target !== null &&
    last.length >= exercise.targetSets &&
    last.slice(0, exercise.targetSets).every((s) => s.reps >= target)
  );
}

function startingWeight(equipment: Equipment): number {
  switch (equipment) {
    case 'BARBELL':
      return 20;
    case 'BODYWEIGHT':
      return 0;
    default:
      return 10;
  }
}

/** "82.5" for 82.5, "80" for 80. */
export function formatKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, '');
}

/** "1:05" for 65 seconds, "1:02:05" past an hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** The sets that count: everything but warm-ups. */
export function workingSets(exercise: WorkoutExercise): LoggedSet[] {
  return exercise.sets.filter((s) => !s.warmup);
}

/** Indexes of the exercises in the same superset as the one at `index`, in order. */
export function supersetOf(workout: Workout, index: number): number[] {
  const group = workout.exercises[index]?.supersetGroup;
  if (group == null) return [index];
  return workout.exercises.flatMap((e, i) => (e.supersetGroup === group ? [i] : []));
}

/**
 * Where to go after logging a working set on the exercise at `index`, and whether to rest.
 * In a superset you move straight to the next exercise and rest after the round; otherwise you
 * rest, and move on once the planned sets are done.
 */
export function afterLog(workout: Workout, index: number): { index: number; rest: boolean } {
  const members = supersetOf(workout, index);
  const pos = members.indexOf(index);
  const remaining = (i: number) =>
    workingSets(workout.exercises[i]).length < workout.exercises[i].targetSets;
  if (members.length > 1 && pos < members.length - 1) {
    return { index: members[pos + 1], rest: false };
  }
  const unfinished = members.find(remaining);
  if (unfinished !== undefined) return { index: unfinished, rest: true };
  const after = members.at(-1)! + 1;
  return { index: after < workout.exercises.length ? after : index, rest: true };
}

export interface ProgressionHint {
  /** What to try, in kg. */
  weightKg: number;
  reps: number;
  /** Why, in a few words. */
  reason: string;
}

/**
 * A suggestion for the first working set, based on last time: add weight once every set hit its
 * reps, otherwise match last time or beat it by a rep. Plain arithmetic, nothing clever. Not shown
 * once you've logged a set, or when auto progression already added the weight.
 */
export function progressionHint(
  exercise: WorkoutExercise,
  stepKg = WEIGHT_STEP_KG,
): ProgressionHint | null {
  const last = exercise.lastTime;
  if (last.length === 0 || workingSets(exercise).length > 0) return null;
  const top = last[0];
  const target = exercise.targetReps;
  if (target !== null) {
    if (earnedProgression(exercise)) return null; // already applied, and said so in the summary
    const allHit = last.slice(0, exercise.targetSets).every((s) => s.reps >= target);
    return allHit
      ? {
          weightKg: top.weightKg + stepKg,
          reps: target,
          reason: `Every set hit ${target} reps last time`,
        }
      : { weightKg: top.weightKg, reps: target, reason: 'Match last time and get every rep' };
  }
  if (last.every((s) => s.reps >= 12) && top.weightKg > 0) {
    return {
      weightKg: top.weightKg + stepKg,
      reps: Math.max(top.reps - 2, 1),
      reason: '12+ reps on every set last time',
    };
  }
  return { weightKg: top.weightKg, reps: top.reps + 1, reason: 'Beat last time by one rep' };
}
