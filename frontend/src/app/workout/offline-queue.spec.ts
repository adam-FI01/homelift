import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OfflineQueue, withPending } from './offline-queue.service';
import { Workout } from './workout';

const WORKOUT: Workout = {
  id: 7,
  name: 'Push',
  routineId: null,
  notes: null,
  startedAt: '',
  finishedAt: null,
  exercises: [
    {
      id: 11,
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
      lastTime: [],
      sets: [{ id: 100, setNumber: 1, weightKg: 80, reps: 5, warmup: false }],
    },
  ],
};

describe('OfflineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('shows queued sets as pending on the workout', () => {
    const shown = withPending(WORKOUT, [
      { key: 'a', workoutId: 7, workoutExerciseId: 11, weightKg: 80, reps: 4, warmup: false },
    ])!;
    expect(shown.exercises[0].sets.map((s) => [s.setNumber, s.reps, !!s.pending])).toEqual([
      [1, 5, false],
      [2, 4, true],
    ]);
    expect(withPending(WORKOUT, [])).toBe(WORKOUT);
  });

  it('keeps sets on the device and sends them in order when back online', async () => {
    const queue = TestBed.inject(OfflineQueue);
    const http = TestBed.inject(HttpTestingController);
    queue.add({ workoutId: 7, workoutExerciseId: 11, weightKg: 80, reps: 4, warmup: false });
    queue.add({ workoutId: 7, workoutExerciseId: 11, weightKg: 80, reps: 3, warmup: false });
    expect(JSON.parse(localStorage.getItem('homelift.offline.sets')!)).toHaveLength(2);

    const done = queue.flush();
    const first = http.expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' });
    expect(first.request.body.reps).toBe(4);
    first.flush({});
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' }).flush({});
    await done;
    expect(queue.count()).toBe(0);
    expect(queue.synced()).toBe(1);
  });

  it('stops at a network failure and keeps the rest', async () => {
    const queue = TestBed.inject(OfflineQueue);
    const http = TestBed.inject(HttpTestingController);
    queue.add({ workoutId: 7, workoutExerciseId: 11, weightKg: 80, reps: 4, warmup: false });
    const done = queue.flush();
    http
      .expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' })
      .error(new ProgressEvent('error'));
    await done;
    expect(queue.count()).toBe(1);
  });
});
