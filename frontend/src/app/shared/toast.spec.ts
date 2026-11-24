import { TestBed } from '@angular/core/testing';
import { ToastHost } from './toast-host';
import { ToastService } from './toast.service';

describe('toasts', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a message in a polite live region and clears it by itself', async () => {
    const fixture = TestBed.createComponent(ToastHost);
    const el = fixture.nativeElement as HTMLElement;
    const toasts = TestBed.inject(ToastService);
    expect(el.querySelector('[role="status"]')).not.toBeNull();

    toasts.show('Routine saved');
    fixture.detectChanges();
    expect(el.textContent).toContain('Routine saved');

    vi.advanceTimersByTime(4100);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Routine saved');
  });

  it('replaces the message and can be dismissed', () => {
    const fixture = TestBed.createComponent(ToastHost);
    const toasts = TestBed.inject(ToastService);
    toasts.show('One');
    toasts.show('Two');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Two');
    expect(fixture.nativeElement.textContent).not.toContain('One');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(toasts.current()).toBeNull();
  });
});
