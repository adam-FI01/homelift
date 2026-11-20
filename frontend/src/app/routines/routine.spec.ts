import { exerciseSummary } from './routine';

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
