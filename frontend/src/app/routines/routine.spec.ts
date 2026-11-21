import { RoutineExercise, exerciseSummary, supersetGroups, withLinks } from './routine';

describe('exerciseSummary', () => {
  const r = (...names: string[]) => ({
    exercises: names.map((name, i) => ({
      exerciseId: i,
      name,
      sets: 3,
      reps: 8,
      restSeconds: 60,
      autoProgress: false,
    })),
  });

  it('lists a few names and counts the rest', () => {
    expect(exerciseSummary(r())).toBe('No exercises yet');
    expect(exerciseSummary(r('A', 'B', 'C'))).toBe('A, B, C');
    expect(exerciseSummary(r('A', 'B', 'C', 'D', 'E'))).toBe('A, B and 3 more');
  });
});

describe('supersets', () => {
  const e = (name: string, linkNext = false): RoutineExercise => ({
    exerciseId: 1,
    name,
    sets: 3,
    reps: 8,
    restSeconds: 60,
    autoProgress: false,
    linkNext,
  });

  it('turns links into groups and back', () => {
    const groups = supersetGroups([
      e('A', true),
      e('B'),
      e('C'),
      e('D', true),
      e('E', true),
      e('F'),
    ]);
    expect(groups).toEqual([1, 1, null, 2, 2, 2]);
    const linked = withLinks(
      ['A', 'B', 'C'].map((n, i) => ({ ...e(n), supersetGroup: [1, 1, null][i] })),
    );
    expect(linked.map((x) => x.linkNext)).toEqual([true, false, false]);
  });

  it('ignores a link on the last exercise', () => {
    expect(supersetGroups([e('A'), e('B', true)])).toEqual([null, null]);
  });
});
