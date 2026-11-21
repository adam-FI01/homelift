import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { lockedInterceptor } from './locked.interceptor';
import { UnlockPage } from './unlock-page';

describe('PIN lock', () => {
  beforeEach(() => localStorage.clear());

  it('sends locked API calls to the PIN screen', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([lockedInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(HttpClient)
      .get('/api/routines')
      .subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/routines')
      .flush({ title: 'Locked' }, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).toHaveBeenCalledWith(['/unlock'], { queryParams: { next: '/' } });
  });

  it('unlocks and returns to where you were', async () => {
    TestBed.configureTestingModule({
      imports: [UnlockPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(UnlockPage);
    fixture.componentRef.setInput('next', '/stats');
    const go = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input')!;
    input.value = '2468';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne('/api/auth/unlock');
    expect(req.request.body).toEqual({ pin: '2468' });
    req.flush({ enabled: true, unlocked: true, managedByEnvironment: false });
    http.expectOne('/api/settings').flush({});
    expect(go).toHaveBeenCalledWith('/stats');
  });

  it('says when the PIN is wrong', async () => {
    TestBed.configureTestingModule({
      imports: [UnlockPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(UnlockPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input')!;
    input.value = '0000';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/unlock')
      .flush({ title: 'Wrong PIN' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Wrong PIN');
  });
});
