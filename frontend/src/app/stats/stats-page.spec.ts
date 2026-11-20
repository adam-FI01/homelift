import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Stats } from './stats';
import { StatsPage } from './stats-page';

const EMPTY_TOTALS = { workouts: 0, sets: 0, reps: 0, volumeKg: 0, minutes: 0 };

const WEEK: Stats = {
  period: 'WEEK',
  start: '2026-11-16',
  end: '2026-11-23',
  totals: { workouts: 3, sets: 6, reps: 31, volumeKg: 2682.5, minutes: 135 },
  previous: { workouts: 1, sets: 1, reps: 5, volumeKg: 2000, minutes: 60 },
  activeDays: 3,
  longestStreakDays: 2,
  averageMinutes: 45,
  topExercise: { exerciseId: 1, name: 'Bench Press', sets: 3, volumeKg: 1262.5 },
  muscleGroups: [
    { muscleGroup: 'CHEST', sets: 3, share: 50 },
    { muscleGroup: 'LEGS', sets: 2, share: 33.3 },
  ],
  heaviestLift: {
    exerciseId: 3,
    name: 'Back Squat',
    weightKg: 120,
    reps: 3,
    estimatedOneRepMax: 132,
    date: '2026-11-17',
  },
  records: [
    {
      exerciseId: 1,
      name: 'Bench Press',
      weightKg: 85,
      reps: 5,
      estimatedOneRepMax: 99.2,
      date: '2026-11-16',
    },
  ],
  biggestSession: { workoutId: 2, date: '2026-11-16', volumeKg: 1410, sets: 3 },
  favoriteWeekday: { day: 'MONDAY', workouts: 1 },
  favoriteTimeOfDay: 'MORNING',
  buckets: [0, 1410, 860, 0, 412.5, 0, 0].map((v, i) => ({
    start: `2026-11-${16 + i}`,
    workouts: v ? 1 : 0,
    volumeKg: v,
  })),
};

async function setup() {
  TestBed.configureTestingModule({
    imports: [StatsPage],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(StatsPage);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, http, el: fixture.nativeElement as HTMLElement };
}

describe('StatsPage', () => {
  it('tells the story of the week', async () => {
    const { fixture, http, el } = await setup();
    const req = http.expectOne((r) => r.url === '/api/stats');
    expect(req.request.params.get('period')).toBe('WEEK');
    expect(req.request.params.get('zone')).toBeTruthy();
    req.flush(WEEK);
    await fixture.whenStable();

    const text = el.textContent!;
    expect(text).toContain('2,683 kg');
    expect(text).toContain('about 1.8 cars');
    expect(text).toContain('+34% vs last week');
    expect(text).toContain('Bench Press');
    expect(text).toContain('120 kg × 3');
    expect(text).toContain('1 record broken');
    expect(text).toContain('Mostly chest');
    expect(text).toContain('In the morning');
    expect(text).toContain('2h 15m');
  });

  it('switches period and steps back in time', async () => {
    const { fixture, http, el } = await setup();
    http.expectOne((r) => r.url === '/api/stats').flush(WEEK);
    await fixture.whenStable();

    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Year')!.click();
    await fixture.whenStable();
    const year = http.expectOne((r) => r.url === '/api/stats');
    expect(year.request.params.get('period')).toBe('YEAR');
    year.flush({
      ...WEEK,
      period: 'YEAR',
      start: '2026-01-01',
      end: '2027-01-01',
      totals: EMPTY_TOTALS,
      previous: EMPTY_TOTALS,
    });
    await fixture.whenStable();
    expect(el.textContent).toContain('Nothing logged this year');

    (el.querySelector('[aria-label="Previous year"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(http.expectOne((r) => r.url === '/api/stats').request.params.get('date')).toBe(
      '2025-01-01',
    );
  });
});
