import {
  Workout,
  WorkoutExercise,
  afterLog,
  formatDuration,
  formatKg,
  nextSetDefaults,
  progressionHint,
  roundToStep,
  routineFromWorkout,
} from './workout';

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
    supersetGroup: null,
    notes: null,
    sets: [],
    lastTime: [],
    ...overrides,
  };
}

describe('nextSetDefaults', () => {
  it('repeats the set just logged today', () => {
    const ex = exercise({
      sets: [{ id: 1, setNumber: 1, weightKg: 82.5, reps: 5, warmup: false }],
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

describe('afterLog', () => {
  const ex = (id: number, group: number | null, done: number, target = 3): WorkoutExercise =>
    exercise({
      id,
      supersetGroup: group,
      targetSets: target,
      sets: Array.from({ length: done }, (_, i) => ({
        id: i,
        setNumber: i + 1,
        weightKg: 50,
        reps: 8,
        warmup: false,
      })),
    });
  const workout = (...exercises: WorkoutExercise[]): Workout => ({
    id: 1,
    name: null,
    routineId: null,
    notes: null,
    startedAt: '',
    finishedAt: null,
    exercises,
  });

  it('rests and stays until the planned sets are done, then moves on', () => {
    expect(afterLog(workout(ex(1, null, 1), ex(2, null, 0)), 0)).toEqual({ index: 0, rest: true });
    expect(afterLog(workout(ex(1, null, 3), ex(2, null, 0)), 0)).toEqual({ index: 1, rest: true });
  });

  it('alternates through a superset and rests after the round', () => {
    const w = workout(ex(1, 1, 1), ex(2, 1, 0), ex(3, null, 0));
    expect(afterLog(w, 0)).toEqual({ index: 1, rest: false });
    expect(afterLog(workout(ex(1, 1, 1), ex(2, 1, 1), ex(3, null, 0)), 1)).toEqual({
      index: 0,
      rest: true,
    });
    expect(afterLog(workout(ex(1, 1, 3), ex(2, 1, 3), ex(3, null, 0)), 1)).toEqual({
      index: 2,
      rest: true,
    });
  });

  it('ignores warm-ups when picking last set', () => {
    const e = exercise({
      sets: [
        { id: 1, setNumber: 1, weightKg: 80, reps: 5, warmup: false },
        { id: 2, setNumber: 2, weightKg: 40, reps: 10, warmup: true },
      ],
    });
    expect(nextSetDefaults(e)).toEqual({ weightKg: 80, reps: 5 });
  });
});

describe('progressionHint', () => {
  const last = (...reps: number[]) => reps.map((r) => ({ weightKg: 80, reps: r }));

  it('suggests more weight when every planned set hit its reps', () => {
    const hint = progressionHint(
      exercise({ targetReps: 5, targetSets: 3, lastTime: last(5, 5, 6) }),
    );
    expect(hint).toEqual({ weightKg: 82.5, reps: 5, reason: 'Every set hit 5 reps last time' });
  });

  it('suggests matching last time when a set fell short', () => {
    expect(
      progressionHint(exercise({ targetReps: 5, targetSets: 3, lastTime: last(5, 4, 4) }))
        ?.weightKg,
    ).toBe(80);
  });

  it('suggests one more rep without a plan, or weight after high reps', () => {
    expect(progressionHint(exercise({ lastTime: last(8, 8) }))).toEqual({
      weightKg: 80,
      reps: 9,
      reason: 'Beat last time by one rep',
    });
    expect(progressionHint(exercise({ lastTime: last(12, 13) }))?.weightKg).toBe(82.5);
  });

  it('stays quiet with no history, after a set today, or when auto progression applied', () => {
    expect(progressionHint(exercise())).toBeNull();
    expect(
      progressionHint(
        exercise({
          lastTime: last(8),
          sets: [{ id: 1, setNumber: 1, weightKg: 80, reps: 8, warmup: false }],
        }),
      ),
    ).toBeNull();
    expect(
      progressionHint(
        exercise({ targetReps: 5, targetSets: 2, autoProgress: true, lastTime: last(5, 5) }),
      ),
    ).toBeNull();
  });
});

describe('progressionHint with a rep range', () => {
  const range = { targetReps: 8, targetMaxReps: 12, targetSets: 3 };
  const sets = (...reps: number[]) => reps.map((r) => ({ weightKg: 20, reps: r }));

  it('adds a rep until the top of the range', () => {
    const hint = progressionHint(exercise({ ...range, lastTime: sets(10, 9, 9) }), 2.5);
    expect(hint).toMatchObject({ weightKg: 20, reps: 10 });
    expect(hint?.reason).toContain('12');
  });

  it('starts at the bottom of the range after a fresh start', () => {
    expect(progressionHint(exercise({ ...range, lastTime: sets(6, 6, 6) }), 2.5)).toMatchObject({
      weightKg: 20,
      reps: 8,
    });
  });

  it('adds weight and drops to the bottom once every set hits the top', () => {
    expect(progressionHint(exercise({ ...range, lastTime: sets(12, 12, 13) }), 2.5)).toMatchObject({
      weightKg: 22.5,
      reps: 8,
    });
  });

  it('uses the exercise own weight step', () => {
    const ex = exercise({ ...range, stepKg: 1, lastTime: sets(12, 12, 12) });
    expect(progressionHint(ex, 2.5)?.weightKg).toBe(21);
  });

  it('earns auto progression only at the top of the range', () => {
    const base = { ...range, autoProgress: true };
    expect(nextSetDefaults(exercise({ ...base, lastTime: sets(10, 10, 10) }), 2.5)).toEqual({
      weightKg: 20,
      reps: 8,
    });
    expect(nextSetDefaults(exercise({ ...base, lastTime: sets(12, 12, 12) }), 2.5)).toEqual({
      weightKg: 22.5,
      reps: 8,
    });
  });
});

describe('progressionHint after missed sessions', () => {
  const missed = (n: number) =>
    exercise({
      targetReps: 5,
      targetSets: 3,
      missedSessions: n,
      lastTime: [
        { weightKg: 100, reps: 4 },
        { weightKg: 100, reps: 3 },
        { weightKg: 100, reps: 3 },
      ],
    });

  it('suggests a lighter week after two misses in a row', () => {
    const hint = progressionHint(missed(2), 2.5);
    expect(hint).toMatchObject({ weightKg: 90, reps: 5, deload: true });
    expect(hint?.reason).toContain('lighter week');
  });

  it('rounds the lighter weight to the exercise step', () => {
    const ex = { ...missed(2), stepKg: 2.5, lastTime: [{ weightKg: 62.5, reps: 4 }] };
    expect(progressionHint(ex, 2.5)?.weightKg).toBe(57.5); // 56.25 rounds to 57.5
  });

  it('only matches last time after a single miss', () => {
    const hint = progressionHint(missed(1), 2.5);
    expect(hint).toMatchObject({ weightKg: 100, reps: 5 });
    expect(hint?.deload).toBeUndefined();
  });

  it('rounds to the nearest step', () => {
    expect(roundToStep(56.2, 2.5)).toBe(55);
    expect(roundToStep(57.4, 2.5)).toBe(57.5);
  });
});

describe('routineFromWorkout', () => {
  const set = (id: number, reps: number, warmup = false) => ({
    id,
    setNumber: id,
    weightKg: 50,
    reps,
    warmup,
  });
  const workout = (exercises: WorkoutExercise[]) => ({ exercises }) as Workout;

  it('saves working sets and the last rep count, skipping warm-ups', () => {
    const w = workout([exercise({ sets: [set(1, 12, true), set(2, 8), set(3, 6)] })]);
    expect(routineFromWorkout(w, 'Push', 90)).toEqual({
      name: 'Push',
      exercises: [
        {
          exerciseId: 1,
          sets: 2,
          reps: 6,
          maxReps: null,
          restSeconds: 90,
          autoProgress: false,
          supersetGroup: null,
        },
      ],
    });
  });

  it('leaves out exercises with no working sets and keeps supersets and rest', () => {
    const w = workout([
      exercise({ exerciseId: 1, sets: [set(1, 5)], restSeconds: 120, supersetGroup: 1 }),
      exercise({ exerciseId: 2, sets: [set(2, 10, true)] }),
    ]);
    const r = routineFromWorkout(w, 'A', 90);
    expect(r.exercises).toHaveLength(1);
    expect(r.exercises[0]).toMatchObject({ restSeconds: 120, supersetGroup: 1 });
  });
});
