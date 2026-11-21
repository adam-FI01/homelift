import { Session, describeSets, rangeStart, recordSessions } from './history';

const session = (workoutId: number, date: string, bestOneRepMax: number): Session => ({
  workoutId,
  date,
  bestOneRepMax,
  sets: [],
  volumeKg: 0,
  topWeightKg: 0,
});

describe('history helpers', () => {
  it('marks sessions that beat every earlier estimated 1RM', () => {
    const sessions = [
      session(3, '2026-11-12T10:00:00Z', 101),
      session(1, '2026-11-01T10:00:00Z', 97),
      session(2, '2026-11-05T10:00:00Z', 96),
      session(4, '2026-11-16T10:00:00Z', 101),
    ];
    expect([...recordSessions(sessions)]).toEqual([3]);
  });

  it('describes sets compactly', () => {
    expect(
      describeSets([
        { setNumber: 1, weightKg: 80, reps: 5 },
        { setNumber: 2, weightKg: 80, reps: 4 },
      ]),
    ).toBe('80 kg · 5, 4');
    expect(
      describeSets([
        { setNumber: 1, weightKg: 80, reps: 5 },
        { setNumber: 2, weightKg: 82.5, reps: 3 },
      ]),
    ).toBe('80×5, 82.5×3');
  });

  it('computes range starts', () => {
    const now = new Date('2026-11-20T12:00:00');
    expect(new Date(rangeStart('3M', now)).getMonth()).toBe(7);
    expect(rangeStart('ALL', now)).toBe(0);
  });
});
