import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { toShown, toStored } from './body';
import { BodyPage } from './body-page';

describe('body units', () => {
  it('converts weight and lengths for pounds users', () => {
    expect(toShown('WEIGHT', 80, 'LB')).toBe(176.4);
    expect(toShown('WAIST', 84, 'LB')).toBe(33.1);
    expect(toShown('BODY_FAT', 18.5, 'LB')).toBe(18.5);
    expect(toStored('WAIST', 33, 'LB')).toBeCloseTo(83.82);
  });
});

describe('BodyPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows the latest weight, its change and logs a new one', async () => {
    TestBed.configureTestingModule({
      imports: [BodyPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(BodyPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/body' && r.params.get('kind') === 'WEIGHT')
      .flush([
        { id: 1, date: '2026-11-01', kind: 'WEIGHT', value: 82.4 },
        { id: 2, date: '2026-11-15', kind: 'WEIGHT', value: 81.6 },
      ]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('81.6 kg');
    expect(el.textContent).toContain('−0.8 kg since');

    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Log')!.click();
    await fixture.whenStable();
    const value = el.querySelector('input[inputmode=decimal]') as HTMLInputElement;
    value.value = '81.2';
    value.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Save')!.click();
    const req = http.expectOne({ method: 'PUT', url: '/api/body' });
    expect(req.request.body.value).toBe(81.2);
    expect(req.request.body.kind).toBe('WEIGHT');
  });
});
