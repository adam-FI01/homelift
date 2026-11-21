import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  DEFAULT_SETTINGS,
  Settings,
  formatNumber,
  fromDisplay,
  standardBar,
  toDisplay,
  weightStep,
} from './settings';

const CACHE_KEY = 'homelift.settings';

/**
 * Settings live on the server so every device shares them, with a local copy so the app starts
 * in the right theme and units before the server answers.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  readonly settings = signal<Settings>(cached());
  readonly units = computed(() => this.settings().units);
  readonly unitLabel = computed(() => (this.units() === 'LB' ? 'lb' : 'kg'));
  readonly weightStep = computed(() => weightStep(this.units()));
  /** The bar weight in the chosen unit. */
  readonly bar = computed(() => {
    const kg = this.settings().barKg;
    return kg == null
      ? standardBar(this.units())
      : Math.round(toDisplay(kg, this.units()) * 10) / 10;
  });
  /** The step in kg, for logic that works in stored units. */
  readonly weightStepKg = computed(() => fromDisplay(this.weightStep(), this.units()));

  constructor() {
    effect(() => {
      const theme = this.settings().theme;
      const root = this.document.documentElement;
      if (theme === 'SYSTEM') delete root.dataset['theme'];
      else root.dataset['theme'] = theme.toLowerCase();
    });
  }

  /** Fetches the server's settings; called once at startup. */
  load(): void {
    this.http.get<Settings>('/api/settings').subscribe({
      next: (s) => this.apply(s),
      error: () => undefined, // keep the cached copy when offline
    });
  }

  /** Changes some settings and saves them; the screen updates straight away. */
  update(change: Partial<Settings>): void {
    const next = { ...this.settings(), ...change };
    this.apply(next);
    this.http.put<Settings>('/api/settings', next).subscribe({
      next: (s) => this.apply(s),
      error: () => undefined,
    });
  }

  /** Saves a bar weight typed in the chosen unit; the usual bar is stored as "default". */
  setBar(value: number): void {
    const units = this.units();
    this.update({ barKg: value === standardBar(units) ? null : fromDisplay(value, units) });
  }

  /** A weight in the chosen unit, as a number. */
  display(kg: number): number {
    return toDisplay(kg, this.units());
  }

  /** Converts a typed weight back to kg for storage. */
  toKg(value: number): number {
    return fromDisplay(value, this.units());
  }

  /** "82.5 kg" or "181.9 lb". */
  format(kg: number, decimals = 1, withUnit = true): string {
    const n = formatNumber(this.display(kg), decimals);
    return withUnit ? `${n} ${this.unitLabel()}` : n;
  }

  private apply(s: Settings): void {
    this.settings.set({ ...DEFAULT_SETTINGS, ...s });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.settings()));
    } catch {
      // Storage unavailable: the app still works, it just may flash the default theme.
    }
  }
}

function cached(): Settings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
