import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

const STORAGE_KEY = 'homelift.rest.endsAt';
export const DEFAULT_REST_SECONDS = 150;

/**
 * Counts down rest between sets. The end time is kept in localStorage, so the timer survives a
 * reload or the phone locking the tab.
 */
@Injectable({ providedIn: 'root' })
export class RestTimer {
  private readonly endsAt = signal<number | null>(read());
  private readonly total = signal(DEFAULT_REST_SECONDS);
  private readonly now = signal(Date.now());

  /** Seconds left, or null when no rest is running. */
  readonly remaining = computed(() => {
    const end = this.endsAt();
    if (end === null) return null;
    const left = Math.ceil((end - this.now()) / 1000);
    return left > 0 ? left : null;
  });

  /** How much of the rest is left, from 1 down to 0. */
  readonly fraction = computed(() => (this.remaining() ?? 0) / Math.max(this.total(), 1));

  constructor() {
    const tick = setInterval(() => this.tick(), 250);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }

  start(seconds = DEFAULT_REST_SECONDS): void {
    this.total.set(seconds);
    this.setEnd(Date.now() + seconds * 1000);
  }

  add(seconds: number): void {
    const end = this.endsAt();
    if (end === null) return;
    this.total.update((t) => t + seconds);
    this.setEnd(end + seconds * 1000);
  }

  skip(): void {
    this.setEnd(null);
  }

  private tick(): void {
    const wasRunning = this.remaining() !== null;
    this.now.set(Date.now());
    if (wasRunning && this.remaining() === null) {
      this.setEnd(null);
      navigator.vibrate?.([200, 100, 200]);
    }
  }

  private setEnd(end: number | null): void {
    this.now.set(Date.now());
    this.endsAt.set(end);
    try {
      if (end === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(end));
    } catch {
      // Storage can be unavailable (private mode); the timer still works for this page.
    }
  }
}

function read(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return value > Date.now() ? value : null;
  } catch {
    return null;
  }
}
