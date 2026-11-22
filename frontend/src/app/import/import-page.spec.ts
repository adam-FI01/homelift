import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ImportPreview, choiceOf, decisionFor, defaultDecisions, describeResult } from './import';
import { ImportPage } from './import-page';

const PREVIEW: ImportPreview = {
  format: 'Strong',
  units: 'KG',
  sets: 4,
  workouts: 2,
  existingWorkouts: 1,
  from: '2019-03-04',
  to: '2019-03-06',
  skippedRows: 1,
  problems: ['line 5: no reps'],
  exercises: [
    { name: 'Cable Wobble Raise', sets: 1, match: null, suggestions: [] },
    {
      name: 'Bench Press (Barbell)',
      sets: 2,
      match: { id: 3, name: 'Bench Press' },
      suggestions: [],
    },
  ],
};

describe('import helpers', () => {
  it('uses matches and adds the rest by default', () => {
    expect(defaultDecisions(PREVIEW.exercises)).toEqual([
      { name: 'Cable Wobble Raise', action: 'CREATE', exerciseId: null },
      { name: 'Bench Press (Barbell)', action: 'MAP', exerciseId: 3 },
    ]);
  });

  it('turns a choice into a decision and back', () => {
    for (const choice of ['new', 'skip', '12']) {
      expect(choiceOf(decisionFor('x', choice))).toBe(choice);
    }
  });

  it('describes the result in a sentence', () => {
    expect(
      describeResult({
        workouts: 1,
        sets: 3,
        createdExercises: 2,
        skippedWorkouts: 1,
        skippedSets: 0,
      }),
    ).toBe(
      'Imported 1 workout and 3 sets. 2 new exercises added. 1 workout already here, skipped.',
    );
  });
});

describe('ImportPage', () => {
  it('reads a file, lets you choose matches and imports', async () => {
    TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ImportPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne('/api/exercises?includeArchived=true')
      .flush([
        { id: 3, name: 'Bench Press', muscleGroup: 'CHEST', equipment: 'BARBELL', archived: false },
      ]);
    const el = fixture.nativeElement as HTMLElement;

    const csv = 'Date,Exercise Name,Set Order,Weight,Reps\n2019-03-04,Bench,1,60,10\n';
    const picker = el.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(picker, 'files', {
      value: [new File([csv], 'strong.csv', { type: 'text/csv' })],
    });
    picker.dispatchEvent(new Event('change'));
    const preview = await vi.waitFor(() => http.expectOne('/api/import/preview'));
    expect(preview.request.body).toEqual({ csv, units: 'KG' });
    preview.flush(PREVIEW);
    await fixture.whenStable();

    expect(el.textContent).toContain('4 sets');
    expect(el.textContent).toContain('1 of these workouts are already in HomeLift');
    expect(el.textContent).toContain('1 rows can');
    const selects = [...el.querySelectorAll('select')] as HTMLSelectElement[];
    expect(selects.map((s) => s.value)).toEqual(['new', '3']);

    // Leave the unmatched one out.
    selects[0].value = 'skip';
    selects[0].dispatchEvent(new Event('change'));
    [...el.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Import 4 sets'))!
      .click();
    const run = http.expectOne({ method: 'POST', url: '/api/import' });
    expect(run.request.body.decisions).toEqual([
      { name: 'Cable Wobble Raise', action: 'SKIP', exerciseId: null },
      { name: 'Bench Press (Barbell)', action: 'MAP', exerciseId: 3 },
    ]);
    run.flush({ workouts: 1, sets: 2, createdExercises: 0, skippedWorkouts: 1, skippedSets: 1 });
    await fixture.whenStable();
    expect(el.textContent).toContain('Imported 1 workout and 2 sets.');
  });

  it('shows the server message for a file it cannot read', async () => {
    TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ImportPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/exercises?includeArchived=true').flush([]);
    const el = fixture.nativeElement as HTMLElement;
    const picker = el.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(picker, 'files', { value: [new File(['a,b'], 'x.csv')] });
    picker.dispatchEvent(new Event('change'));
    const preview = await vi.waitFor(() => http.expectOne('/api/import/preview'));
    preview.flush(
      { detail: "Couldn't find a date column." },
      { status: 422, statusText: 'Unprocessable' },
    );
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('date column');
  });
});
