import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RestTimer } from './rest-timer.service';
import { Workout } from './workout';
import { WorkoutPage } from './workout-page';

const WORKOUT: Workout = {
  id: 7,
  name: 'Push A',
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
      sets: [{ id: 100, setNumber: 1, weightKg: 82.5, reps: 5 }],
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
    expect(el.textContent).toContain('Last time 80 × 5, 80 × 4');
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
    expect(req.request.body).toEqual({ weightKg: 82.5, reps: 5 });
    req.flush({ id: 101, setNumber: 2, weightKg: 82.5, reps: 5 });
    expect(rest.remaining()).toBeGreaterThan(0);

    const updated = structuredClone(WORKOUT);
    updated.exercises[0].sets.push({ id: 101, setNumber: 2, weightKg: 82.5, reps: 5 });
    http.expectOne('/api/workouts/7').flush(updated);
    await fixture.whenStable();

    expect(el.querySelector('h1')?.textContent).toBe('Overhead Press');
    expect(el.querySelector('[aria-label="Rest timer"]')).not.toBeNull();
    http.verify();
  });
});
