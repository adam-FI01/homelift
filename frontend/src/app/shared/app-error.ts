import { ErrorHandler, Injectable, signal } from '@angular/core';

/**
 * Catches errors nobody else handled, logs them, and shows a calm banner instead of a broken
 * screen. The banner offers a reload, which fixes most one-off glitches.
 */
@Injectable({ providedIn: 'root' })
export class AppErrorHandler implements ErrorHandler {
  readonly message = signal<string | null>(null);

  handleError(error: unknown): void {
    console.error(error);
    const chunk = String((error as Error)?.message ?? error).includes(
      'dynamically imported module',
    );
    this.message.set(
      chunk
        ? 'HomeLift was updated. Reload to get the new version.'
        : 'Something went wrong on this screen. Reloading usually fixes it.',
    );
  }

  dismiss(): void {
    this.message.set(null);
  }
}
