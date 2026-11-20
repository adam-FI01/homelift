import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ExerciseHistory } from './history';
import { ExerciseProgress } from './exercise-progress';

const day = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const HISTORY: ExerciseHistory = {
  sessions: [
    {
      workoutId: 3,
      date: day(2),
      sets: [{ setNumber: 1, weightKg: 87.5, reps: 2 }],
      volumeKg: 175,
      bestOneRepMax: 93.3,
      topWeightKg: 87.5,
    },
    {
      workoutId: 2,
      date: day(9),
      sets: [
        { setNumber: 1, weightKg: 80, reps: 5 },
        { setNumber: 2, weightKg: 80, reps: 5 },
      ],
      volumeKg: 800,
      bestOneRepMax: 93.3,
      topWeightKg: 80,
    },
    {
      workoutId: 1,
      date: day(20),
      sets: [{ setNumber: 1, weightKg: 75, reps: 5 }],
      volumeKg: 375,
      bestOneRepMax: 87.5,
      topWeightKg: 75,
    },
  ],
  records: {
    oneRepMax: { value: 93.3, weightKg: 80, reps: 5, date: day(9) },
    heaviest: { value: 87.5, weightKg: 87.5, reps: 2, date: day(2) },
    mostReps: { value: 5, weightKg: 80, reps: 5, date: day(9) },
    sessionVolume: { value: 800, weightKg: 0, reps: 0, date: day(9) },
    sessions: 3,
    totalSets: 4,
  },
};

describe('ExerciseProgress', () => {
  it('shows the estimated 1RM, its change, records and sessions', async () => {
    TestBed.configureTestingModule({
      imports: [ExerciseProgress],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ExerciseProgress);
    fixture.componentRef.setInput('id', 1);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();

    http.expectOne('/api/exercises/1').flush({
      id: 1,
      name: 'Bench Press',
      muscleGroup: 'CHEST',
      equipment: 'BARBELL',
      archived: false,
    });
    http.expectOne('/api/exercises/1/history').flush(HISTORY);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('93.3 kg');
    expect(text).toContain('+5.8 kg');
    expect(text).toContain('87.5 × 2');
    expect(text).toContain('800 kg');
    expect(text).toContain('80 kg · 5, 5');
    // Workout 2 beat the earlier best, so it carries the badge.
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.badge').length).toBe(1);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('svg[role=img]')
        ?.getAttribute('aria-label'),
    ).toContain('3 sessions');
  });
});
