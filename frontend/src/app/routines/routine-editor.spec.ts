import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RoutineEditor } from './routine-editor';

const ROUTINE = {
  id: 4,
  name: 'Push A',
  totalSets: 8,
  estimatedMinutes: 20,
  exercises: [
    {
      id: 1,
      exerciseId: 1,
      name: 'Bench Press',
      sets: 5,
      reps: 5,
      restSeconds: 150,
      autoProgress: true,
    },
    {
      id: 2,
      exerciseId: 13,
      name: 'Overhead Press',
      sets: 3,
      reps: 8,
      restSeconds: 120,
      autoProgress: false,
    },
  ],
};

async function setup(id?: number) {
  TestBed.configureTestingModule({
    imports: [RoutineEditor],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(RoutineEditor);
  if (id) fixture.componentRef.setInput('id', id);
  const http = TestBed.inject(HttpTestingController);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  if (id) http.expectOne(`/api/routines/${id}`).flush(ROUTINE);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const byLabel = (label: string) =>
    el.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
  return { fixture, http, el, byLabel, navigate };
}

describe('RoutineEditor', () => {
  it('edits the plan, reorders and saves', async () => {
    const { fixture, http, el, byLabel, navigate } = await setup(4);
    expect(el.textContent).toContain('2 exercises · 8 sets · ~20 min');

    byLabel('More sets').click();
    byLabel('Less rest').click();
    byLabel('Move Overhead Press up').click();
    await fixture.whenStable();

    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Save')!.click();
    const req = http.expectOne({ method: 'PUT', url: '/api/routines/4' });
    expect(req.request.body).toEqual({
      name: 'Push A',
      exercises: [
        { exerciseId: 13, sets: 3, reps: 8, restSeconds: 120, autoProgress: false },
        { exerciseId: 1, sets: 6, reps: 5, restSeconds: 135, autoProgress: true },
      ],
    });
    req.flush(ROUTINE);
    expect(navigate).toHaveBeenCalledWith(['/routines']);
  });

  it('builds a new routine from the picker', async () => {
    const { fixture, http, el } = await setup();
    http.expectOne('/api/exercises?includeArchived=true').flush([
      { id: 17, name: 'Back Squat', muscleGroup: 'LEGS', equipment: 'BARBELL', archived: false },
      { id: 22, name: 'Leg Curl', muscleGroup: 'LEGS', equipment: 'MACHINE', archived: false },
      { id: 21, name: 'Leg Press', muscleGroup: 'LEGS', equipment: 'MACHINE', archived: false },
    ]);
    await fixture.whenStable();
    const save = () =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Save')!;
    expect(save().disabled).toBe(true);

    const pick = (name: string) =>
      [...el.querySelectorAll('[role=checkbox]')].find((b) =>
        b.textContent?.includes(name),
      ) as HTMLButtonElement;
    pick('Back Squat').click();
    await fixture.whenStable();
    pick('Leg Curl').click();
    await fixture.whenStable();
    pick('Leg Press').click();
    await fixture.whenStable();
    pick('Leg Press').click(); // untick
    await fixture.whenStable();
    expect(pick('Back Squat').getAttribute('aria-checked')).toBe('true');
    [...el.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Add 2 exercises')!
      .click();
    const name = el.querySelector('input') as HTMLInputElement;
    name.value = 'Legs';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.textContent).toContain('2 exercises · 6 sets');

    save().click();
    const req = http.expectOne({ method: 'POST', url: '/api/routines' });
    expect(req.request.body.exercises).toEqual([
      { exerciseId: 17, sets: 3, reps: 8, restSeconds: 120, autoProgress: false },
      { exerciseId: 22, sets: 3, reps: 8, restSeconds: 120, autoProgress: false },
    ]);
  });
});
