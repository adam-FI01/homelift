import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATES, platesPerSide } from '../settings/settings';
import { PlateCalculator } from './plate-calculator';

describe('platesPerSide', () => {
  it('loads the heaviest plates first', () => {
    expect(platesPerSide(100, 20, PLATES.KG)).toEqual({ plates: [25, 15], remainder: 0 });
    expect(platesPerSide(82.5, 20, PLATES.KG)).toEqual({ plates: [25, 5, 1.25], remainder: 0 });
    expect(platesPerSide(225, 45, PLATES.LB)).toEqual({ plates: [45, 45], remainder: 0 });
  });

  it('reports what plates cannot make', () => {
    expect(platesPerSide(21, 20, PLATES.KG)).toEqual({ plates: [], remainder: 1 });
    expect(platesPerSide(15, 20, PLATES.KG)).toEqual({ plates: [], remainder: 0 });
  });
});

describe('PlateCalculator', () => {
  beforeEach(() => localStorage.clear());

  it('shows the plates per side and changes the bar', async () => {
    TestBed.configureTestingModule({
      imports: [PlateCalculator],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(PlateCalculator);
    fixture.componentRef.setInput('total', 100);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Each side: 25 · 15');
    expect(el.textContent).toContain('20 kg');

    (el.querySelector('[aria-label="Lighter bar"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(
      TestBed.inject(HttpTestingController).expectOne({ method: 'PUT', url: '/api/settings' })
        .request.body.barKg,
    ).toBe(17.5);
    expect(el.textContent).toContain('Each side: 25 · 15 · 1.25');
    expect(el.textContent).toContain('17.5 kg');
  });
});
