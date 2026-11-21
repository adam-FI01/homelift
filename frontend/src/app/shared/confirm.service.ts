import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive actions get a red button. */
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Asks a yes or no question in a sheet instead of the browser's confirm(). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<Pending | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...options, resolve }));
  }

  answer(ok: boolean): void {
    const p = this.pending();
    if (!p) return;
    this.pending.set(null);
    p.resolve(ok);
  }
}
