import { WorkoutExercise, formatDuration, formatKg, nextSetDefaults } from './workout';

function exercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: 1,
    exerciseId: 1,
    name: 'Bench Press',
    muscleGroup: 'CHEST',
    equipment: 'BARBELL',
    targetSets: 3,
    targetReps: null,
    restSeconds: null,
    autoProgress: false,
    sets: [],
    lastTime: [],
    ...overrides,
  };
}

describe('nextSetDefaults', () => {
  it('repeats the set just logged today', () => {
    const ex = exercise({
      sets: [{ id: 1, setNumber: 1, weightKg: 82.5, reps: 5 }],
      lastTime: [{ weightKg: 80, reps: 5 }],
    });
    expect(nextSetDefaults(ex)).toEqual({ weightKg: 82.5, reps: 5 });
  });

  it('starts from last time when nothing is logged yet', () => {
    expect(nextSetDefaults(exercise({ lastTime: [{ weightKg: 80, reps: 6 }] }))).toEqual({
      weightKg: 80,
      reps: 6,
    });
  });

  it('falls back to a starting weight for the equipment', () => {
    expect(nextSetDefaults(exercise())).toEqual({ weightKg: 20, reps: 8 });
    expect(nextSetDefaults(exercise({ equipment: 'BODYWEIGHT' })).weightKg).toBe(0);
    expect(nextSetDefaults(exercise({ equipment: 'DUMBBELL' })).weightKg).toBe(10);
  });
});

describe('formatting', () => {
  it('drops needless decimals from weights', () => {
    expect(formatKg(80)).toBe('80');
    expect(formatKg(82.5)).toBe('82.5');
    expect(formatKg(81.25)).toBe('81.3');
  });

  it('formats durations as m:ss or h:mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(-3)).toBe('0:00');
  });
});

describe('auto progression', () => {
  const planned = (lastReps: number[], autoProgress = true): WorkoutExercise =>
    exercise({
      targetSets: 3,
      targetReps: 5,
      autoProgress,
      lastTime: lastReps.map((reps) => ({ weightKg: 80, reps })),
    });

  it('adds a step when every set hit the target last time', () => {
    expect(nextSetDefaults(planned([5, 5, 6]))).toEqual({ weightKg: 82.5, reps: 5 });
  });

  it('repeats the weight when a set fell short', () => {
    expect(nextSetDefaults(planned([5, 5, 4]))).toEqual({ weightKg: 80, reps: 5 });
  });

  it('stays put when auto progression is off', () => {
    expect(nextSetDefaults(planned([5, 5, 5], false))).toEqual({ weightKg: 80, reps: 5 });
  });

  it('uses the planned reps when there is no history', () => {
    expect(nextSetDefaults(exercise({ targetReps: 12 })).reps).toBe(12);
  });
});
