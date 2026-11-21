import { Equipment, MuscleGroup } from '../exercises/exercise';

export interface LoggedSet {
  id: number;
  setNumber: number;
  weightKg: number;
  reps: number;
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
  sets: LoggedSet[];
  lastTime: PreviousSet[];
}

export interface Workout {
  id: number;
  name: string | null;
  routineId: number | null;
  startedAt: string;
  finishedAt: string | null;
  exercises: WorkoutExercise[];
}

export const WEIGHT_STEP_KG = 2.5;

/**
 * Values to fill in for the next set: repeat what was just logged today, otherwise the same
 * set from last time (plus a step when auto progression earned it), otherwise a sensible
 * starting point for the equipment.
 */
export function nextSetDefaults(exercise: WorkoutExercise, stepKg = WEIGHT_STEP_KG): PreviousSet {
  const today = exercise.sets.at(-1);
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
