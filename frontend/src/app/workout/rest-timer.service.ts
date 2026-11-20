import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

const END_KEY = 'homelift.rest.endsAt';
const TOTAL_KEY = 'homelift.rest.total';
const SOUND_KEY = 'homelift.rest.sound';
export const DEFAULT_REST_SECONDS = 150;
/** How long "Rest over" stays on screen after the countdown ends. */
const DONE_MS = 8000;

/**
 * Counts down rest between sets. It stores the end time rather than counting ticks, so it stays
 * right when the tab sleeps, the phone locks or you move to another page, and it survives a
 * reload. When rest is over it beeps (if sound is on) and vibrates where the phone allows it.
 */
@Injectable({ providedIn: 'root' })
export class RestTimer {
  private readonly document = inject(DOCUMENT);
  private readonly endsAt = signal<number | null>(
    read(END_KEY, (v) => (v > Date.now() ? v : null)),
  );
  private readonly total = signal(read(TOTAL_KEY, (v) => v || DEFAULT_REST_SECONDS));
  private readonly now = signal(Date.now());
  private readonly finishedAt = signal<number | null>(null);
  private audio: AudioContext | null = null;

  readonly soundOn = signal(read(SOUND_KEY, (v) => v !== 0, 1));

  /** Seconds left, or null when no rest is running. */
  readonly remaining = computed(() => {
    const end = this.endsAt();
    if (end === null) return null;
    const left = Math.ceil((end - this.now()) / 1000);
    return left > 0 ? left : null;
  });

  /** How much of the rest is left, from 1 down to 0. */
  readonly fraction = computed(() => (this.remaining() ?? 0) / Math.max(this.total(), 1));

  /** True for a few seconds after rest ends, so the screen can say so. */
  readonly justFinished = computed(() => {
    const at = this.finishedAt();
    return at !== null && this.now() - at < DONE_MS;
  });

  constructor() {
    const tick = setInterval(() => this.tick(), 250);
    // Timers are throttled in background tabs; catch up the moment the page is visible again.
    const wake = () => this.tick();
    this.document.addEventListener('visibilitychange', wake);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      this.document.removeEventListener('visibilitychange', wake);
    });
  }

  /**
   * Call from a tap (before any await) so the browser lets the timer play a sound later.
   * Browsers only allow audio that was set up during a user gesture.
   */
  prime(): void {
    if (!this.soundOn() || typeof AudioContext === 'undefined') return;
    this.audio ??= new AudioContext();
    if (this.audio.state === 'suspended') void this.audio.resume();
  }

  start(seconds = DEFAULT_REST_SECONDS): void {
    this.finishedAt.set(null);
    this.total.set(seconds);
    this.save(TOTAL_KEY, seconds);
    this.setEnd(Date.now() + seconds * 1000);
  }

  /** Adds (or with a negative number, takes away) time; taking away past zero ends the rest. */
  adjust(seconds: number): void {
    const end = this.endsAt();
    if (end === null || this.remaining() === null) return;
    const next = end + seconds * 1000;
    if (next <= Date.now()) {
      this.skip();
      return;
    }
    this.total.update((t) => Math.max(t + seconds, 1));
    this.save(TOTAL_KEY, this.total());
    this.setEnd(next);
  }

  skip(): void {
    this.finishedAt.set(null);
    this.setEnd(null);
  }

  toggleSound(): void {
    this.soundOn.update((on) => !on);
    this.save(SOUND_KEY, this.soundOn() ? 1 : 0);
    if (this.soundOn()) this.prime();
  }

  private tick(): void {
    const wasRunning = this.remaining() !== null;
    this.now.set(Date.now());
    if (wasRunning && this.remaining() === null) {
      this.setEnd(null);
      this.finishedAt.set(Date.now());
      this.alert();
    }
  }

  private alert(): void {
    navigator.vibrate?.([200, 100, 200, 100, 400]);
    if (this.soundOn() && this.audio) beep(this.audio);
  }

  private setEnd(end: number | null): void {
    this.now.set(Date.now());
    this.endsAt.set(end);
    this.save(END_KEY, end);
  }

  private save(key: string, value: number | null): void {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));
    } catch {
      // Storage can be unavailable (private mode); the timer still works for this page.
    }
  }
}

function read<T>(key: string, map: (value: number) => T, fallback = 0): T {
  try {
    const raw = localStorage.getItem(key);
    return map(raw === null ? fallback : Number(raw));
  } catch {
    return map(fallback);
  }
}

/** Three short rising tones, quiet enough for a gym, clear enough to notice. */
function beep(ctx: AudioContext): void {
  const start = ctx.currentTime;
  [660, 880, 1100].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t = start + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  });
}
