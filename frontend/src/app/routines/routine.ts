export interface RoutineExercise {
  id?: number;
  exerciseId: number;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  autoProgress: boolean;
  /** Exercises with the same group are a superset, done back to back. */
  supersetGroup?: number | null;
  /** Editor only: this exercise is in a superset with the next one. */
  linkNext?: boolean;
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
  exercises: Omit<RoutineExercise, 'id' | 'name' | 'linkNext'>[];
}

/** Marks each exercise that shares a superset group with the one after it. */
export function withLinks(exercises: RoutineExercise[]): RoutineExercise[] {
  return exercises.map((e, i) => ({
    ...e,
    linkNext: e.supersetGroup != null && exercises[i + 1]?.supersetGroup === e.supersetGroup,
  }));
}

/** Turns "linked to the next" flags back into superset group numbers (1, 2, …). */
export function supersetGroups(exercises: RoutineExercise[]): (number | null)[] {
  const groups: (number | null)[] = [];
  let next = 1;
  exercises.forEach((e, i) => {
    const linkedFromPrevious = i > 0 && exercises[i - 1].linkNext;
    if (linkedFromPrevious) groups.push(groups[i - 1]);
    else if (e.linkNext && i < exercises.length - 1) groups.push(next++);
    else groups.push(null);
  });
  return groups;
}

export const DEFAULT_PLAN = { sets: 3, reps: 8, restSeconds: 120, autoProgress: false };

/** "Bench Press, Overhead Press and 4 more". */
export function exerciseSummary(routine: Pick<Routine, 'exercises'>, shown = 2): string {
  const names = routine.exercises.map((e) => e.name);
  if (names.length === 0) return 'No exercises yet';
  if (names.length <= shown + 1) return names.join(', ');
  return `${names.slice(0, shown).join(', ')} and ${names.length - shown} more`;
}
