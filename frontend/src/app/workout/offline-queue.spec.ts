import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OfflineQueue, describeQueue, withPending } from './offline-queue.service';
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
      {
        type: 'set',
        key: 'a',
        workoutId: 7,
        workoutExerciseId: 11,
        weightKg: 80,
        reps: 4,
        warmup: false,
      },
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
    queue.add({
      type: 'set',
      workoutId: 7,
      workoutExerciseId: 11,
      weightKg: 80,
      reps: 4,
      warmup: false,
    });
    queue.add({
      type: 'set',
      workoutId: 7,
      workoutExerciseId: 11,
      weightKg: 80,
      reps: 3,
      warmup: false,
    });
    expect(JSON.parse(localStorage.getItem('homelift.offline.queue')!)).toHaveLength(2);

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
    queue.add({
      type: 'set',
      workoutId: 7,
      workoutExerciseId: 11,
      weightKg: 80,
      reps: 4,
      warmup: false,
    });
    const done = queue.flush();
    http
      .expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' })
      .error(new ProgressEvent('error'));
    await done;
    expect(queue.count()).toBe(1);
  });

  it('queues finishing and notes behind the sets and sends everything in order', async () => {
    const queue = TestBed.inject(OfflineQueue);
    const http = TestBed.inject(HttpTestingController);
    queue.add({
      type: 'set',
      workoutId: 7,
      workoutExerciseId: 11,
      weightKg: 80,
      reps: 4,
      warmup: false,
    });
    queue.add({ type: 'notes', workoutId: 7, notes: 'felt heavy' });
    queue.add({ type: 'notes', workoutId: 7, notes: 'felt good' });
    queue.add({ type: 'finish', workoutId: 7 });
    expect(queue.count()).toBe(3); // the later notes replaced the earlier ones
    expect(queue.summary()).toBe('1 set, notes and finish');

    const done = queue.flush();
    http.expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' }).flush({});
    await new Promise((r) => setTimeout(r));
    const notes = http.expectOne({ method: 'PUT', url: '/api/workouts/7/notes' });
    expect(notes.request.body).toEqual({ notes: 'felt good' });
    notes.flush({});
    await new Promise((r) => setTimeout(r));
    http.expectOne({ method: 'POST', url: '/api/workouts/7/finish' }).flush({});
    await done;
    expect(queue.count()).toBe(0);
  });

  it('drops an action the server refuses, so one bad change cannot block the rest', async () => {
    const queue = TestBed.inject(OfflineQueue);
    const http = TestBed.inject(HttpTestingController);
    queue.add({ type: 'deleteSet', workoutId: 7, workoutExerciseId: 11, setId: 5 });
    queue.add({ type: 'finish', workoutId: 7 });
    const done = queue.flush();
    http
      .expectOne({ method: 'DELETE', url: '/api/workouts/7/exercises/11/sets/5' })
      .flush({}, { status: 404, statusText: 'Not Found' });
    await new Promise((r) => setTimeout(r));
    http.expectOne({ method: 'POST', url: '/api/workouts/7/finish' }).flush({});
    await done;
    expect(queue.dropped()).toBe(1);
    expect(queue.count()).toBe(0);
  });

  it('carries over sets queued by version 1.0', () => {
    localStorage.setItem(
      'homelift.offline.sets',
      JSON.stringify([
        { key: 'old', workoutId: 7, workoutExerciseId: 11, weightKg: 60, reps: 8, warmup: false },
      ]),
    );
    const queue = TestBed.inject(OfflineQueue);
    expect(queue.items()).toEqual([expect.objectContaining({ type: 'set', key: 'old', reps: 8 })]);
    expect(localStorage.getItem('homelift.offline.sets')).toBeNull();
  });

  it('shows corrections, deletions and notes on the workout while they wait', () => {
    const shown = withPending(WORKOUT, [
      {
        type: 'editSet',
        key: 'a',
        workoutId: 7,
        workoutExerciseId: 11,
        setId: 100,
        weightKg: 82.5,
        reps: 5,
        warmup: false,
      },
      { type: 'notes', key: 'b', workoutId: 7, notes: 'good session' },
    ])!;
    expect(shown.exercises[0].sets[0]).toMatchObject({ weightKg: 82.5, pending: true });
    expect(shown.notes).toBe('good session');

    const removed = withPending(WORKOUT, [
      { type: 'deleteSet', key: 'c', workoutId: 7, workoutExerciseId: 11, setId: 100 },
    ])!;
    expect(removed.exercises[0].sets).toHaveLength(0);
  });

  it('treats a workout waiting to be finished as finished', () => {
    expect(withPending(WORKOUT, [{ type: 'finish', key: 'f', workoutId: 7 }])).toBeNull();
  });

  it('describes what is waiting in plain words', () => {
    expect(describeQueue([])).toBe('');
    expect(
      describeQueue([
        {
          type: 'set',
          key: '1',
          workoutId: 7,
          workoutExerciseId: 1,
          weightKg: 1,
          reps: 1,
          warmup: false,
        },
        {
          type: 'set',
          key: '2',
          workoutId: 7,
          workoutExerciseId: 1,
          weightKg: 1,
          reps: 1,
          warmup: false,
        },
        { type: 'deleteSet', key: '3', workoutId: 7, workoutExerciseId: 1, setId: 1 },
      ]),
    ).toBe('2 sets and 1 correction');
  });
});
