import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { formatDuration } from '../workout/workout';
import { Settings, Theme, Units } from './settings';
import { SettingsService } from './settings.service';

type Toggle = 'autoStartRest' | 'restSound' | 'restVibrate';

/** Rest timer, units, theme, and your data. Every change saves straight away. */
@Component({
  selector: 'app-settings-page',
  imports: [RouterLink],
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

  protected readonly version = toSignal(
    inject(HttpClient)
      .get<{ version: string; sqliteVersion: string }>('/api/status')
      .pipe(
        map((s) => `HomeLift ${s.version} · SQLite ${s.sqliteVersion}`),
        catchError(() => of('Server unreachable')),
      ),
  );

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
