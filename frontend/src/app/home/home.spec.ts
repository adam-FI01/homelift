import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Stats, isoDate } from '../stats/stats';
import { Home, weekDays } from './home';

const totals = (workouts: number, volumeKg: number) => ({
  workouts,
  sets: 0,
  reps: 0,
  volumeKg,
  minutes: 0,
});

function week(): Stats {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { start: isoDate(d), workouts: i === 0 ? 1 : 0, volumeKg: i === 0 ? 4000 : 0 };
  });
  return {
    period: 'WEEK',
    start: buckets[0].start,
    end: '',
    totals: totals(1, 4000),
    previous: totals(1, 3700),
    activeDays: 1,
    longestStreakDays: 1,
    averageMinutes: 0,
    topExercise: null,
    muscleGroups: [],
    heaviestLift: null,
    records: [],
    biggestSession: null,
    favoriteWeekday: null,
    favoriteTimeOfDay: null,
    buckets,
  };
}

const routine = (id: number, name: string) => ({
  id,
  name,
  exercises: [],
  totalSets: 0,
  estimatedMinutes: 45,
});

describe('Home', () => {
  it('summarises the week and suggests the next routine in rotation', async () => {
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(Home);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const stats = http.match((r) => r.url === '/api/stats');
    stats.find((r) => r.request.params.get('period') === 'WEEK')!.flush(week());
    stats
      .find((r) => r.request.params.get('period') === 'MONTH')!
      .flush({
        ...week(),
        records: [
          {
            exerciseId: 1,
            name: 'Back Squat',
            weightKg: 120,
            reps: 3,
            estimatedOneRepMax: 132,
            date: '2026-11-16',
          },
        ],
      });
    http.expectOne('/api/workouts/current').flush(null, { status: 204, statusText: 'No Content' });
    http
      .expectOne('/api/routines')
      .flush([routine(1, 'Legs'), routine(2, 'Pull'), routine(3, 'Push')]);
    http.expectOne((r) => r.url === '/api/workouts').flush([{ id: 9, routineId: 2 }]);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('4,000 kg');
    expect(text).toContain('+8% vs last week');
    expect(text).toContain('Push'); // after Pull comes Push
    expect(text).toContain('About 45 min');
    expect(text).toContain('Back Squat');
    expect(text).toContain('120 kg × 3');
    expect(text).toContain('1 session');
  });

  it('marks trained days and today', () => {
    const days = weekDays(week());
    expect(days[0].done).toBe(true);
    expect(days.filter((d) => d.today)).toHaveLength(1);
    expect(weekDays(null).every((d) => !d.done)).toBe(true);
  });
});
