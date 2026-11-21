import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Exercise } from './exercise';
import { ExerciseList } from './exercise-list';

const EXERCISES: Exercise[] = [
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
    id: 2,
    name: 'Back Squat',
    muscleGroup: 'LEGS',
    equipment: 'BARBELL',
    restSeconds: null,
    notes: null,
    archived: false,
  },
  {
    id: 3,
    name: 'Leg Press',
    muscleGroup: 'LEGS',
    equipment: 'MACHINE',
    restSeconds: null,
    notes: null,
    archived: false,
  },
  {
    id: 4,
    name: 'Old Press',
    muscleGroup: 'CHEST',
    equipment: 'MACHINE',
    restSeconds: null,
    notes: null,
    archived: true,
  },
];

async function setup() {
  TestBed.configureTestingModule({
    imports: [ExerciseList],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(ExerciseList);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne('/api/exercises?includeArchived=true').flush(EXERCISES);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const names = () => [...el.querySelectorAll('.name')].map((n) => n.textContent?.trim());
  const click = async (text: string) => {
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(text))!.click();
    await fixture.whenStable();
  };
  return { fixture, http, el, names, click };
}

describe('ExerciseList', () => {
  it('groups active exercises by muscle group', async () => {
    const { el, names } = await setup();
    expect([...el.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Chest', 'Legs']);
    expect(names()).toEqual(['Bench Press', 'Back Squat', 'Leg Press']);
  });

  it('filters by search text and muscle group', async () => {
    const { fixture, el, names, click } = await setup();
    const search = el.querySelector('input')!;
    search.value = 'press';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(names()).toEqual(['Bench Press', 'Leg Press']);

    await click('Legs');
    expect(names()).toEqual(['Leg Press']);
  });

  it('reveals archived exercises on request', async () => {
    const { names, click } = await setup();
    expect(names()).not.toContain('Old Press');
    await click('Show archived (1)');
    expect(names()).toContain('Old Press');
  });
});
