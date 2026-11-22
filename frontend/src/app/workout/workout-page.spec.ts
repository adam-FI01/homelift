import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmService } from '../shared/confirm.service';
import { RestTimer } from './rest-timer.service';
import { Workout } from './workout';
import { WorkoutPage } from './workout-page';

const WORKOUT: Workout = {
  id: 7,
  name: 'Push A',
  routineId: null,
  notes: null,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  exercises: [
    {
      id: 11,
      exerciseId: 1,
      name: 'Bench Press',
      muscleGroup: 'CHEST',
      equipment: 'BARBELL',
      targetSets: 2,
      targetReps: null,
      restSeconds: null,
      autoProgress: false,
      supersetGroup: null,
      notes: null,
      sets: [{ id: 100, setNumber: 1, weightKg: 82.5, reps: 5, warmup: false }],
      lastTime: [
        { weightKg: 80, reps: 5 },
        { weightKg: 80, reps: 4 },
      ],
    },
    {
      id: 12,
      exerciseId: 2,
      name: 'Overhead Press',
      muscleGroup: 'SHOULDERS',
      equipment: 'BARBELL',
      targetSets: 3,
      targetReps: null,
      restSeconds: null,
      autoProgress: false,
      supersetGroup: null,
      notes: null,
      sets: [],
      lastTime: [],
    },
  ],
};

async function setup(current: Workout | null) {
  TestBed.configureTestingModule({
    imports: [WorkoutPage],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(WorkoutPage);
  const http = TestBed.inject(HttpTestingController);
  const rest = TestBed.inject(RestTimer);
  fixture.detectChanges();
  http
    .expectOne('/api/workouts/current')
    .flush(current, current ? {} : { status: 204, statusText: 'No Content' });
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(text))!;
  return { fixture, http, el, button, rest };
}

describe('WorkoutPage', () => {
  afterEach(() => TestBed.inject(RestTimer).skip());

  it('offers to start a workout when none is in progress', async () => {
    const { el, button, http, fixture } = await setup(null);
    expect(el.textContent).toContain('No workout in progress');

    button('Start workout').click();
    http.expectOne({ method: 'POST', url: '/api/workouts' }).flush({ ...WORKOUT, exercises: [] });
    await fixture.whenStable();
    expect(el.querySelector('app-exercise-picker')).not.toBeNull();
  });

  it('prefills the next set and shows last time', async () => {
    const { el } = await setup(WORKOUT);
    expect(el.querySelector('h1')?.textContent).toBe('Bench Press');
    expect(el.textContent).toContain('Last time 80 kg · 5, 4');
    expect(el.textContent).toContain('Log set 2 · 82.5 kg × 5');
  });

  it('adjusts the weight with the stepper', async () => {
    const { fixture, el } = await setup(WORKOUT);
    (el.querySelector('[aria-label="Increase weight by 2.5 kg"]') as HTMLButtonElement).click();
    (el.querySelector('[aria-label="One fewer rep"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Log set 2 · 85 kg × 4');
  });

  it('logs a set with one tap, starts the rest timer and moves on when the plan is done', async () => {
    const { fixture, el, button, http, rest } = await setup(WORKOUT);
    button('Log set 2').click();

    const req = http.expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' });
    expect(req.request.body).toEqual({ weightKg: 82.5, reps: 5, warmup: false });
    req.flush({ id: 101, setNumber: 2, weightKg: 82.5, reps: 5, warmup: false });

    const updated = structuredClone(WORKOUT);
    updated.exercises[0].sets.push({
      id: 101,
      setNumber: 2,
      weightKg: 82.5,
      reps: 5,
      warmup: false,
    });
    http.expectOne('/api/workouts/7').flush(updated);
    await fixture.whenStable();

    expect(rest.remaining()).toBeGreaterThan(0);
    expect(el.querySelector('h1')?.textContent).toBe('Overhead Press');
    expect(el.querySelector('[aria-label="Rest timer"]')).not.toBeNull();
    http.verify();
  });

  it('edits a logged set in a sheet', async () => {
    const { fixture, el, http } = await setup(WORKOUT);
    (el.querySelector('[aria-label="Set 1 logged. Edit"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const sheet = [...el.querySelectorAll('app-sheet')].find((s) =>
      s.textContent?.includes('Edit set'),
    )!;
    (sheet.querySelector('[aria-label="One fewer rep"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    [...sheet.querySelectorAll('button')].find((b) => b.textContent?.includes('Save'))!.click();

    const req = http.expectOne({ method: 'PUT', url: '/api/workouts/7/exercises/11/sets/100' });
    expect(req.request.body).toEqual({ weightKg: 82.5, reps: 4, warmup: false });
    req.flush({ id: 100, setNumber: 1, weightKg: 82.5, reps: 4, warmup: false });
    http.expectOne('/api/workouts/7').flush(WORKOUT);
  });

  it('shows a summary before finishing', async () => {
    const { fixture, el, button, http } = await setup(WORKOUT);
    button('Finish').click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Finish workout?');
    expect(el.textContent).toContain('413 kg');

    button('Finish workout').click();
    http.expectOne({ method: 'POST', url: '/api/workouts/7/finish' }).flush(WORKOUT);
  });

  it('asks before discarding', async () => {
    const { fixture, button, http } = await setup(WORKOUT);
    const ask = vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(false);
    button('Discard workout').click();
    await fixture.whenStable();
    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Discard this workout?', danger: true }),
    );
    http.expectNone({ method: 'DELETE' });
  });

  it('logs warm-ups without resting or moving on', async () => {
    const { fixture, el, button, http, rest } = await setup(WORKOUT);
    button('Warm-up').click();
    await fixture.whenStable();
    button('Log warm-up').click();
    const req = http.expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' });
    expect(req.request.body.warmup).toBe(true);
    req.flush({ id: 102, setNumber: 2, weightKg: 82.5, reps: 5, warmup: true });
    const updated = structuredClone(WORKOUT);
    updated.exercises[0].sets.push({ id: 102, setNumber: 2, weightKg: 40, reps: 8, warmup: true });
    http.expectOne('/api/workouts/7').flush(updated);
    await fixture.whenStable();

    expect(rest.remaining()).toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('Bench Press');
    expect([...el.querySelectorAll('.grid.warm')]).toHaveLength(1);
    expect(el.textContent).toContain('Log warm-up');
  });

  it('keeps logging while offline and shows the set as pending', async () => {
    localStorage.removeItem('homelift.offline.queue');
    const { fixture, el, button, http } = await setup(WORKOUT);
    button('Log set 2').click();
    http
      .expectOne({ method: 'POST', url: '/api/workouts/7/exercises/11/sets' })
      .error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Offline · 1 set saved on this phone');
    // Two of two planned sets are done (one pending), so it moves on.
    expect(el.querySelector('h1')?.textContent).toBe('Overhead Press');
    button('Bench Press').click();
    await fixture.whenStable();
    expect(el.querySelector('[aria-label="Set 2 waiting to sync"]')).not.toBeNull();
    localStorage.removeItem('homelift.offline.queue');
  });

  it('finishes offline: keeps the finish on the phone and goes home', async () => {
    localStorage.removeItem('homelift.offline.queue');
    const { fixture, el, button, http } = await setup(WORKOUT);
    button('Finish').click();
    await fixture.whenStable();
    button('Finish workout').click();
    http
      .expectOne({ method: 'POST', url: '/api/workouts/7/finish' })
      .error(new ProgressEvent('error'));
    await fixture.whenStable();
    const queued = JSON.parse(localStorage.getItem('homelift.offline.queue')!);
    expect(queued.map((q: { type: string }) => q.type)).toEqual(['finish']);
    expect(el).toBeTruthy();
    localStorage.removeItem('homelift.offline.queue');
  });
});
