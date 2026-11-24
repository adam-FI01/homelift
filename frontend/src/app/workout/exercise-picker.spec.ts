import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Exercise } from '../exercises/exercise';
import { ExercisePicker } from './exercise-picker';

const BENCH: Exercise = {
  id: 1,
  name: 'Bench Press',
  muscleGroup: 'CHEST',
  equipment: 'BARBELL',
  restSeconds: null,
  notes: null,
  archived: false,
};

async function setup(multiple = false) {
  TestBed.configureTestingModule({
    imports: [ExercisePicker],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(ExercisePicker);
  fixture.componentRef.setInput('multiple', multiple);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((r) => r.url === '/api/exercises').flush([BENCH]);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const type = async (text: string) => {
    const input = el.querySelector('input[type=search]') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(text));
  return { fixture, http, el, type, button };
}

function choose(el: HTMLElement, label: string, value: string) {
  const select = el.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('ExercisePicker create', () => {
  it('offers no create row for an empty search or an exact match', async () => {
    const { el, type, button } = await setup();
    expect(button('Create')).toBeUndefined();
    await type('bench press');
    expect(button('Create')).toBeUndefined();
    await type('Cable Row');
    expect(button('Create "Cable Row"')).toBeDefined();
    expect(el.textContent).toContain('No exercises match.');
  });

  it('creates the searched exercise and picks it', async () => {
    const { fixture, http, el, type, button } = await setup();
    const picked: Exercise[] = [];
    fixture.componentInstance['picked'].subscribe((e: Exercise) => picked.push(e));
    await type('  Cable   Row ');
    button('Create')!.click();
    fixture.detectChanges();
    expect((button('Create and add') as HTMLButtonElement).disabled).toBe(true);
    choose(el, 'Muscle group', 'BACK');
    choose(el, 'Equipment', 'CABLE');
    fixture.detectChanges();
    button('Create and add')!.click();

    const req = http.expectOne({ method: 'POST', url: '/api/exercises' });
    expect(req.request.body).toMatchObject({
      name: 'Cable Row',
      muscleGroup: 'BACK',
      equipment: 'CABLE',
    });
    req.flush({ ...BENCH, id: 9, name: 'Cable Row', muscleGroup: 'BACK', equipment: 'CABLE' });
    await fixture.whenStable();
    expect(picked.map((e) => e.id)).toEqual([9]);
  });

  it('ticks the new exercise in multi-select mode', async () => {
    const { fixture, http, el, type, button } = await setup(true);
    await type('Dips');
    button('Create')!.click();
    fixture.detectChanges();
    choose(el, 'Muscle group', 'CHEST');
    choose(el, 'Equipment', 'BODYWEIGHT');
    fixture.detectChanges();
    button('Create and add')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/exercises' })
      .flush({ ...BENCH, id: 10, name: 'Dips', equipment: 'BODYWEIGHT' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button('Add 1 exercise')).toBeDefined();
    expect(el.textContent).toContain('Dips');
  });
});
