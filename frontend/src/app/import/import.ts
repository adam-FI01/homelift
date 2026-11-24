export type Action = 'MAP' | 'CREATE' | 'SKIP';

export interface Suggestion {
  id: number;
  name: string;
}

/** An exercise name from the file and what the server matched it with. */
export interface ExerciseMatch {
  name: string;
  sets: number;
  match: Suggestion | null;
  suggestions: Suggestion[];
}

export interface ImportPreview {
  format: string;
  units: 'KG' | 'LB';
  sets: number;
  workouts: number;
  existingWorkouts: number;
  from: string;
  to: string;
  skippedRows: number;
  problems: string[];
  exercises: ExerciseMatch[];
}

export interface ImportResult {
  workouts: number;
  sets: number;
  createdExercises: number;
  skippedWorkouts: number;
  skippedSets: number;
}

export interface Decision {
  name: string;
  action: Action;
  exerciseId: number | null;
}

/** What to do with each name before the person changes anything: use the match, else add it. */
export function defaultDecisions(exercises: ExerciseMatch[]): Decision[] {
  return exercises.map((e) =>
    e.match
      ? { name: e.name, action: 'MAP', exerciseId: e.match.id }
      : { name: e.name, action: 'CREATE', exerciseId: null },
  );
}

/** The value of the choice list for a decision: an exercise id, "new" or "skip". */
export function choiceOf(d: Decision): string {
  return d.action === 'MAP' ? String(d.exerciseId) : d.action === 'CREATE' ? 'new' : 'skip';
}

export function decisionFor(name: string, choice: string): Decision {
  if (choice === 'new') return { name, action: 'CREATE', exerciseId: null };
  if (choice === 'skip') return { name, action: 'SKIP', exerciseId: null };
  return { name, action: 'MAP', exerciseId: Number(choice) };
}

/** A sentence for the result: "Imported 12 workouts and 214 sets." */
export function describeResult(r: ImportResult): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const parts = [`Imported ${plural(r.workouts, 'workout')} and ${plural(r.sets, 'set')}.`];
  if (r.createdExercises) parts.push(`${plural(r.createdExercises, 'new exercise')} added.`);
  if (r.skippedWorkouts)
    parts.push(`${plural(r.skippedWorkouts, 'workout')} already here, skipped.`);
  return parts.join(' ');
}
