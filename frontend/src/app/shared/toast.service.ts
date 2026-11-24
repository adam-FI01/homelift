import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
}

/** Short confirmations after an action ("Routine saved"). They go away by themselves. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private static readonly SHOW_MS = 4000;
  private next = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly current = signal<Toast | null>(null);

  show(message: string): void {
    clearTimeout(this.timer);
    this.current.set({ id: this.next++, message });
    this.timer = setTimeout(() => this.dismiss(), ToastService.SHOW_MS);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}
