import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppErrorHandler } from './app-error';
import { ErrorBanner } from './error-banner';

describe('ErrorBanner', () => {
  it('shows a calm message for unhandled errors and can be dismissed', async () => {
    TestBed.configureTestingModule({
      imports: [ErrorBanner],
      providers: [{ provide: ErrorHandler, useExisting: AppErrorHandler }],
    });
    const fixture = TestBed.createComponent(ErrorBanner);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.inject(AppErrorHandler).handleError(new Error('boom'));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Something went wrong on this screen');

    (el.querySelector('[aria-label=Dismiss]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')).toBeNull();
  });

  it('asks for a reload after an update replaced the code', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new AppErrorHandler();
    handler.handleError(new TypeError('Failed to fetch dynamically imported module: /chunk-x.js'));
    expect(handler.message()).toContain('HomeLift was updated');
  });
});
