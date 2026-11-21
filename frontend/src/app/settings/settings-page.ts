import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { problemMessage } from '../exercises/exercise.service';
import { Sheet } from '../shared/sheet';
import { catchError, of } from 'rxjs';
import { formatDuration } from '../workout/workout';
import { Settings, Theme, Units } from './settings';
import { SettingsService } from './settings.service';

interface ServerStatus {
  version: string;
  sqliteVersion: string;
  javaVersion: number;
  uptimeSeconds: number;
  databaseBytes: number;
  workouts: number;
  sets: number;
}

type Toggle = 'autoStartRest' | 'restSound' | 'restVibrate';

/** Rest timer, units, theme, and your data. Every change saves straight away. */
@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, Sheet],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly service = inject(SettingsService);

  protected readonly s = this.service.settings;
  protected readonly format = formatDuration;
  protected readonly unitOptions: { value: Units; label: string }[] = [
    { value: 'KG', label: 'Kilograms' },
    { value: 'LB', label: 'Pounds' },
  ];
  protected readonly themeOptions: { value: Theme; label: string }[] = [
    { value: 'SYSTEM', label: 'System' },
    { value: 'LIGHT', label: 'Light' },
    { value: 'DARK', label: 'Dark' },
  ];
  protected readonly toggles: { key: Toggle; title: string; detail: string }[] = [
    { key: 'autoStartRest', title: 'Start rest automatically', detail: 'After each logged set' },
    { key: 'restSound', title: 'Sound', detail: 'Three soft tones when rest is over' },
    { key: 'restVibrate', title: 'Vibrate', detail: 'On phones that allow it' },
  ];
  protected readonly downloads = [
    {
      href: '/api/export/homelift.db',
      title: 'Full backup',
      detail: 'A copy of the database file. Restores everything.',
    },
    {
      href: '/api/export/sets.csv',
      title: 'Sets as CSV',
      detail: 'Every set, for spreadsheets. Always in kg.',
    },
    {
      href: '/api/export/backup.json',
      title: 'All data as JSON',
      detail: 'Exercises, routines and workouts, readable anywhere.',
    },
  ];

  /** Server facts for the "About" section, or null when the server can't be reached. */
  protected readonly status = toSignal(
    inject(HttpClient)
      .get<ServerStatus>('/api/status')
      .pipe(catchError(() => of(null))),
    { initialValue: undefined },
  );

  protected uptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  protected size(bytes: number): string {
    return bytes >= 1_048_576
      ? `${(bytes / 1_048_576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Which PIN sheet is open, and its fields. */
  protected readonly pinSheet = signal<'set' | 'change' | 'remove' | null>(null);
  protected readonly currentPin = signal('');
  protected readonly newPin = signal('');
  protected readonly confirmPin = signal('');
  protected readonly pinError = signal<string | null>(null);

  constructor() {
    this.auth.refresh().subscribe({ error: () => undefined });
  }

  protected openPin(kind: 'set' | 'change' | 'remove'): void {
    this.currentPin.set('');
    this.newPin.set('');
    this.confirmPin.set('');
    this.pinError.set(null);
    this.pinSheet.set(kind);
  }

  protected savePin(): void {
    const kind = this.pinSheet();
    if (kind === 'remove') {
      this.auth.removePin(this.currentPin()).subscribe({
        next: () => this.pinSheet.set(null),
        error: (e: unknown) => this.pinError.set(problemMessage(e)),
      });
      return;
    }
    if (!/^\d{4,12}$/.test(this.newPin())) {
      this.pinError.set('Use 4 to 12 digits.');
      return;
    }
    if (this.newPin() !== this.confirmPin()) {
      this.pinError.set("The two PINs don't match.");
      return;
    }
    this.auth.setPin(this.newPin(), kind === 'change' ? this.currentPin() : undefined).subscribe({
      next: () => this.pinSheet.set(null),
      error: (e: unknown) => this.pinError.set(problemMessage(e)),
    });
  }

  protected lockNow(): void {
    this.auth.lock().subscribe(() => this.router.navigate(['/unlock']));
  }

  protected set(change: Partial<Settings>): void {
    this.service.update(change);
  }

  protected toggle(key: Toggle): void {
    this.service.update({ [key]: !this.s()[key] });
  }

  protected nudgeRest(seconds: number): void {
    const next = Math.min(900, Math.max(15, this.s().defaultRestSeconds + seconds));
    this.service.update({ defaultRestSeconds: next });
  }
}
