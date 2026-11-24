import { Equipment, MuscleGroup } from '../exercises/exercise';
import { RoutineInput } from '../routines/routine';

export interface LoggedSet {
  id: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  /** Warm-ups are kept but left out of volume, records and "last time". */
  warmup: boolean;
  /** Logged while offline and not yet on the server. */
  pending?: boolean;
  /** Key of the queued action, for a set that is still only on this device. */
  queueKey?: string;
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
  /** Planned reps per set when started from a routine (the bottom of a range). */
  targetReps: number | null;
  /** Top of the planned rep range, or null for a fixed number of reps. */
  targetMaxReps?: number | null;
  /** Weight to add for this exercise, in kg, or null to follow the setting. */
  stepKg?: number | null;
  /** How many of the last two sessions in a row fell short of the plan (0 to 2). */
  missedSessions?: number;
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

/** The weight to add for this exercise: its own step, else the one from Settings. */
export function stepFor(exercise: WorkoutExercise, defaultStepKg = WEIGHT_STEP_KG): number {
  return exercise.stepKg ?? defaultStepKg;
}

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
    if (earnedProgression(exercise)) {
      return { weightKg: previous.weightKg + stepFor(exercise, stepKg), reps: target! };
    }
    return { weightKg: previous.weightKg, reps: target ?? previous.reps };
  }
  return { weightKg: startingWeight(exercise.equipment), reps: target ?? 8 };
}

/** True when the plan is a range such as 8 to 12 reps. */
export function hasRange(exercise: WorkoutExercise): boolean {
  return exercise.targetReps != null && (exercise.targetMaxReps ?? 0) > exercise.targetReps;
}

/**
 * True when auto progression is on and every planned set last time reached the reps to beat: the
 * planned reps, or the top of the range when there is one.
 */
export function earnedProgression(exercise: WorkoutExercise): boolean {
  const target = exercise.targetReps;
  const last = exercise.lastTime;
  return (
    exercise.autoProgress &&
    target !== null &&
    last.length >= exercise.targetSets &&
    last.slice(0, exercise.targetSets).every((s) => s.reps >= (exercise.targetMaxReps ?? target))
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

/**
 * A routine from what was done: each exercise with its working-set count and last rep count.
 * Exercises with no working sets are left out.
 */
export function routineFromWorkout(
  workout: Workout,
  name: string,
  defaultRestSeconds: number,
): RoutineInput {
  const exercises = workout.exercises
    .map((e) => ({ e, done: workingSets(e) }))
    .filter(({ done }) => done.length > 0)
    .map(({ e, done }) => ({
      exerciseId: e.exerciseId,
      sets: Math.min(done.length, 20),
      reps: Math.min(Math.max(done[done.length - 1].reps, 1), 100),
      maxReps: null,
      restSeconds: e.restSeconds ?? defaultRestSeconds,
      autoProgress: false,
      supersetGroup: e.supersetGroup,
    }));
  return { name, exercises };
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
  /** A lighter week: the weight is dropped on purpose. */
  deload?: boolean;
}

/** Share of the weight to keep in a lighter week. */
export const DELOAD_FACTOR = 0.9;

/** `kg` rounded to the nearest multiple of `step`, so a lighter week lands on weights you own. */
export function roundToStep(kg: number, step: number): number {
  return step > 0 ? Math.round(kg / step) * step : kg;
}

/**
 * A suggestion for the first working set, based on last time. Plain arithmetic, nothing clever:
 *
 * 1. Two sessions in a row missed the plan: a lighter week, 10% off the last weight.
 * 2. A rep range (8 to 12): add a rep each time until every set reaches the top, then add one step
 *    of weight and drop back to the bottom.
 * 3. A fixed target: add a step once every set hit it, otherwise match last time.
 * 4. No plan: beat last time by a rep, or add weight after 12 reps on every set.
 *
 * Not shown once you've logged a set, or when auto progression already added the weight.
 */
export function progressionHint(
  exercise: WorkoutExercise,
  defaultStepKg = WEIGHT_STEP_KG,
): ProgressionHint | null {
  const last = exercise.lastTime;
  if (last.length === 0 || workingSets(exercise).length > 0) return null;
  const step = stepFor(exercise, defaultStepKg);
  const top = last[0];
  const target = exercise.targetReps;

  if ((exercise.missedSessions ?? 0) >= 2 && top.weightKg > 0) {
    return {
      weightKg: Math.max(roundToStep(top.weightKg * DELOAD_FACTOR, step), 0),
      reps: target ?? top.reps,
      reason: 'Missed the plan two sessions in a row. Try a lighter week',
      deload: true,
    };
  }
  if (target !== null) {
    if (earnedProgression(exercise)) return null; // already applied, and said so in the summary
    const planned = last.slice(0, exercise.targetSets);
    if (hasRange(exercise)) {
      const max = exercise.targetMaxReps!;
      if (planned.length > 0 && planned.every((s) => s.reps >= max)) {
        return {
          weightKg: top.weightKg + step,
          reps: target,
          reason: `Every set hit ${max} reps last time`,
        };
      }
      const lowest = Math.min(...planned.map((s) => s.reps), max);
      const reps = Math.min(Math.max(lowest + 1, target), max);
      return { weightKg: top.weightKg, reps, reason: `Add a rep, working up to ${max}` };
    }
    return planned.every((s) => s.reps >= target)
      ? {
          weightKg: top.weightKg + step,
          reps: target,
          reason: `Every set hit ${target} reps last time`,
        }
      : { weightKg: top.weightKg, reps: target, reason: 'Match last time and get every rep' };
  }
  if (last.every((s) => s.reps >= 12) && top.weightKg > 0) {
    return {
      weightKg: top.weightKg + step,
      reps: Math.max(top.reps - 2, 1),
      reason: '12+ reps on every set last time',
    };
  }
  return { weightKg: top.weightKg, reps: top.reps + 1, reason: 'Beat last time by one rep' };
}
