import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Exercise } from '../exercises/exercise';
import { ExerciseService, problemMessage } from '../exercises/exercise.service';
import { SettingsService } from '../settings/settings.service';
import {
  Decision,
  ImportPreview,
  ImportResult,
  choiceOf,
  decisionFor,
  defaultDecisions,
  describeResult,
} from './import';
import { ImportService } from './import.service';

type Step = 'pick' | 'review' | 'done';

/**
 * Brings a workout history in from a CSV file: pick the file, review what is in it and how its
 * exercise names match the library (nothing is saved yet), then import.
 */
@Component({
  selector: 'app-import-page',
  imports: [RouterLink],
  template: `
    <header class="head">
      <a routerLink="/settings" class="icon" aria-label="Back to settings">
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </a>
      <h1>Import workouts</h1>
    </header>

    @if (step() === 'pick') {
      <section class="card stack" aria-labelledby="pick-title">
        <h2 id="pick-title">Choose a CSV file</h2>
        <p class="sub">
          One row per set, with a date, an exercise, a weight and reps. Exports from Strong, Hevy
          and FitNotes work as they are, and so does a simple file with the headers
          <code>date,exercise,weight,reps</code>.
        </p>
        <fieldset>
          <legend>Weights in the file are in</legend>
          <div class="options">
            @for (u of units; track u.value) {
              <button
                type="button"
                class="chip"
                [class.on]="unit() === u.value"
                [attr.aria-pressed]="unit() === u.value"
                (click)="unit.set(u.value)"
              >
                {{ u.label }}
              </button>
            }
          </div>
          <p class="sub">Some exports say which in their headers; then that wins.</p>
        </fieldset>
        <label class="btn-primary file">
          {{ busy() ? 'Reading…' : 'Choose file' }}
          <input
            type="file"
            class="visually-hidden"
            accept=".csv,text/csv,text/plain"
            [disabled]="busy()"
            (change)="choose($event)"
          />
        </label>
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
      </section>
    }

    @if (step() === 'review' && preview(); as p) {
      <section class="card stack" aria-labelledby="review-title">
        <h2 id="review-title">Here's what is in {{ fileName() }}</h2>
        <p>
          <strong>{{ p.sets }} sets</strong> in <strong>{{ p.workouts }} workouts</strong>, from
          {{ p.from }} to {{ p.to }}. Read as {{ p.format }} with weights in
          {{ p.units === 'LB' ? 'lb' : 'kg' }}.
        </p>
        @if (p.existingWorkouts > 0) {
          <p class="sub">
            {{ p.existingWorkouts }} of these workouts are already in HomeLift and will be skipped.
          </p>
        }
        @if (p.skippedRows > 0) {
          <details>
            <summary>{{ p.skippedRows }} rows can't be used</summary>
            <ul class="problems">
              @for (problem of p.problems; track problem) {
                <li>{{ problem }}</li>
              }
            </ul>
          </details>
        }
      </section>

      <section class="group" aria-labelledby="match-title">
        <h2 id="match-title" class="label">Match exercises</h2>
        <p class="sub">
          Choose what each name in the file should become. Matches found for you are already
          selected.
        </p>
        <div class="card list">
          @for (e of p.exercises; track e.name) {
            <div class="match">
              <label [for]="'ex-' + $index">
                <span class="name">{{ e.name }}</span>
                <span class="sub">{{ e.sets }} {{ e.sets === 1 ? 'set' : 'sets' }}</span>
              </label>
              <select [id]="'ex-' + $index" (change)="pick(e.name, $any($event.target).value)">
                <option value="new" [selected]="choice(e.name) === 'new'">
                  Add as a new exercise
                </option>
                <option value="skip" [selected]="choice(e.name) === 'skip'">Leave out</option>
                @if (e.suggestions.length > 0) {
                  <optgroup label="Close matches">
                    @for (s of e.suggestions; track s.id) {
                      <option [value]="s.id" [selected]="choice(e.name) === '' + s.id">
                        {{ s.name }}
                      </option>
                    }
                  </optgroup>
                }
                <optgroup label="All exercises">
                  @for (x of library(); track x.id) {
                    <option [value]="x.id" [selected]="choice(e.name) === '' + x.id">
                      {{ x.name }}
                    </option>
                  }
                </optgroup>
              </select>
            </div>
          }
        </div>
      </section>

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      <button type="button" class="btn-primary" [disabled]="busy()" (click)="run()">
        {{ busy() ? 'Importing…' : 'Import ' + p.sets + ' sets' }}
      </button>
      <button type="button" class="secondary" [disabled]="busy()" (click)="reset()">
        Choose another file
      </button>
    }

    @if (step() === 'done' && result(); as r) {
      <section class="card stack" role="status">
        <h2>All done</h2>
        <p>{{ summary() }}</p>
        <a routerLink="/history" class="btn-primary">See history</a>
      </section>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: -10px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ink);
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    h2.label {
      font-size: 13px;
      color: var(--sub);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    p {
      margin: 0;
    }
    .group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sub {
      color: var(--sub);
      font-size: 14px;
    }
    code {
      font-size: 13px;
    }
    fieldset {
      border: 0;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    legend {
      padding: 0;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--sub);
    }
    .options {
      display: flex;
      gap: 8px;
    }
    .chip {
      height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink);
      font-size: 14px;
    }
    .chip.on {
      background: var(--btn);
      color: var(--on-btn);
      border-color: var(--btn);
    }
    .file {
      cursor: pointer;
    }
    .file:focus-within {
      outline: 2px solid var(--ink);
      outline-offset: 3px;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      border: 0;
    }
    .list {
      padding: 4px 0;
    }
    .match {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 18px;
    }
    .match + .match {
      border-top: 1px solid var(--line);
    }
    .match label {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .name {
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    select {
      height: var(--tap);
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--bg);
      color: var(--ink);
      font: inherit;
      width: 100%;
    }
    .problems {
      margin: 8px 0 0;
      padding-left: 20px;
      font-size: 14px;
      color: var(--sub);
    }
    summary {
      cursor: pointer;
      font-size: 14px;
    }
    .error {
      color: var(--neg);
      font-size: 14px;
    }
    .secondary {
      height: 44px;
      border: 0;
      background: none;
      color: var(--ink);
      font-weight: 500;
    }
    .btn-primary:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
})
export class ImportPage {
  private readonly api = inject(ImportService);
  private readonly settings = inject(SettingsService);

  protected readonly units = [
    { value: 'KG' as const, label: 'Kilograms' },
    { value: 'LB' as const, label: 'Pounds' },
  ];
  protected readonly unit = signal<'KG' | 'LB'>(this.settings.units() === 'LB' ? 'LB' : 'KG');

  protected readonly step = signal<Step>('pick');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fileName = signal('the file');
  protected readonly preview = signal<ImportPreview | null>(null);
  protected readonly result = signal<ImportResult | null>(null);
  protected readonly summary = computed(() => {
    const r = this.result();
    return r ? describeResult(r) : '';
  });

  private csv = '';
  private readonly decisions = signal<Decision[]>([]);

  /** The whole library, for choosing a match by hand. */
  protected readonly library = toSignal(
    inject(ExerciseService)
      .list()
      .pipe(catchError(() => of([] as Exercise[]))),
    { initialValue: [] as Exercise[] },
  );

  protected choice(name: string): string {
    const d = this.decisions().find((x) => x.name === name);
    return d ? choiceOf(d) : 'new';
  }

  protected pick(name: string, choice: string): void {
    this.decisions.update((list) =>
      list.map((d) => (d.name === name ? decisionFor(name, choice) : d)),
    );
  }

  protected async choose(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      this.csv = await file.text();
    } catch {
      this.busy.set(false);
      this.error.set("That file couldn't be read.");
      return;
    }
    this.fileName.set(file.name);
    this.api.preview(this.csv, this.unit()).subscribe({
      next: (p) => {
        this.busy.set(false);
        this.preview.set(p);
        this.decisions.set(defaultDecisions(p.exercises));
        this.step.set('review');
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(problemMessage(err));
      },
    });
  }

  protected run(): void {
    const p = this.preview();
    if (!p) return;
    this.busy.set(true);
    this.error.set(null);
    this.api.start(this.csv, p.units, this.decisions()).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.result.set(r);
        this.step.set('done');
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(problemMessage(err));
      },
    });
  }

  protected reset(): void {
    this.csv = '';
    this.preview.set(null);
    this.step.set('pick');
  }
}
