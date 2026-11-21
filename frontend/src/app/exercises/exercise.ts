export const MUSCLE_GROUPS = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'LEGS',
  'ARMS',
  'CORE',
  'FULL_BODY',
] as const;
export const EQUIPMENT = [
  'BARBELL',
  'DUMBBELL',
  'MACHINE',
  'CABLE',
  'BODYWEIGHT',
  'KETTLEBELL',
  'OTHER',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

export interface Exercise {
  id: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  /** Rest after each set in seconds, or null to use the default from Settings. */
  restSeconds: number | null;
  /** Set-up cues such as seat height or grip. */
  notes: string | null;
  archived: boolean;
}

export type ExerciseInput = Pick<
  Exercise,
  'name' | 'muscleGroup' | 'equipment' | 'restSeconds' | 'notes'
>;

/** Turns an API enum such as FULL_BODY into "Full body". */
export function label(value: MuscleGroup | Equipment): string {
  const words = value.toLowerCase().replace('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
