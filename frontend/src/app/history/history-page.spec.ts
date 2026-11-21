import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmService } from '../shared/confirm.service';
import { WorkoutSummary } from './history';
import { HistoryPage, groupByMonth } from './history-page';

const summary = (
  id: number,
  startedAt: string,
  volumeKg: number,
  exercises: string[],
): WorkoutSummary => ({
  id,
  name: 'Push',
  routineId: null,
  startedAt,
  finishedAt: startedAt.replace('T10', 'T11'),
  exercises,
  sets: 3,
  volumeKg,
});

const WORKOUTS = [
  summary(3, '2026-11-16T10:00:00Z', 2000, ['Bench Press']),
  summary(2, '2026-11-02T10:00:00Z', 1500, ['Bench Press', 'Dip']),
  summary(1, '2026-10-28T10:00:00Z', 1000, ['Dip']),
];

describe('HistoryPage', () => {
  beforeEach(() => localStorage.clear());

  async function setup() {
    TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(HistoryPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === '/api/workouts').flush(WORKOUTS);
    http.expectOne('/api/exercises?includeArchived=true').flush([
      {
        id: 1,
        name: 'Bench Press',
        muscleGroup: 'CHEST',
        equipment: 'BARBELL',
        restSeconds: null,
        notes: null,
        archived: false,
      },
      {
        id: 31,
        name: 'Dip',
        muscleGroup: 'ARMS',
        equipment: 'BODYWEIGHT',
        restSeconds: null,
        notes: null,
        archived: false,
      },
    ]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(text))!;
    return { fixture, http, el, button };
  }

  it('groups workouts by month with totals', async () => {
    const { el } = await setup();
    const months = [...el.querySelectorAll('.month')];
    expect(months).toHaveLength(2);
    expect(months[0].textContent).toContain('2 workouts · 3,500 kg');
    expect(months[1].textContent).toContain('1 workout · 1,000 kg');
  });

  it('opens a workout in a sheet and deletes it', async () => {
    const { fixture, http, el, button } = await setup();
    (el.querySelector('.month .row') as HTMLButtonElement).click();
    http.expectOne('/api/workouts/3').flush({
      id: 3,
      name: 'Push',
      routineId: null,
      notes: null,
      startedAt: WORKOUTS[0].startedAt,
      finishedAt: WORKOUTS[0].finishedAt,
      exercises: [
        {
          id: 9,
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
          sets: [
            { id: 1, setNumber: 1, weightKg: 80, reps: 5, warmup: false },
            { id: 2, setNumber: 2, weightKg: 80, reps: 4, warmup: false },
          ],
        },
      ],
    });
    await fixture.whenStable();
    expect(el.textContent).toContain('80 kg · 5, 4');
    expect(el.textContent).toContain('1:00:00');

    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(true);
    button('Delete workout').click();
    await fixture.whenStable();
    http.expectOne({ method: 'DELETE', url: '/api/workouts/3' }).flush(null);
    await fixture.whenStable();
    expect(el.querySelectorAll('.month')[0].textContent).toContain('1 workout · 1,500 kg');
  });

  it('lists trained exercises by recency', async () => {
    const { fixture, el, button } = await setup();
    button('Exercises').click();
    await fixture.whenStable();
    const rows = [...el.querySelectorAll('a.row')].map((r) =>
      r.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(rows[0]).toContain('Bench Press2 sessions');
    expect(rows[1]).toContain('Dip2 sessions');
  });

  it('groups by calendar month', () => {
    expect(groupByMonth(WORKOUTS).map((g) => g.workouts.length)).toEqual([2, 1]);
  });
});
