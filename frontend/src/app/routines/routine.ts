export interface RoutineExercise {
  id?: number;
  exerciseId: number;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  autoProgress: boolean;
}

export interface Routine {
  id: number;
  name: string;
  exercises: RoutineExercise[];
  totalSets: number;
  estimatedMinutes: number;
}

export interface RoutineInput {
  name: string;
  exercises: Omit<RoutineExercise, 'id' | 'name'>[];
}

export const DEFAULT_PLAN = { sets: 3, reps: 8, restSeconds: 120, autoProgress: false };

/** "Bench Press, Overhead Press and 4 more". */
export function exerciseSummary(routine: Pick<Routine, 'exercises'>, shown = 2): string {
  const names = routine.exercises.map((e) => e.name);
  if (names.length === 0) return 'No exercises yet';
  if (names.length <= shown + 1) return names.join(', ');
  return `${names.slice(0, shown).join(', ')} and ${names.length - shown} more`;
}
