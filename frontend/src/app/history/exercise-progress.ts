import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ExerciseService } from '../exercises/exercise.service';
import { SettingsService } from '../settings/settings.service';
import { WeightPipe } from '../settings/weight.pipe';
import { LineChart } from '../shared/line-chart';
import { RANGES, Range, describeSets, rangeStart, recordSessions, shortDate } from './history';
import { HistoryService } from './history.service';

/** One exercise's progress: estimated 1RM over time, records, and past sessions. */
@Component({
  selector: 'app-exercise-progress',
  imports: [RouterLink, LineChart, WeightPipe],
  templateUrl: './exercise-progress.html',
  styleUrl: './exercise-progress.scss',
})
export class ExerciseProgress {
  private readonly exercises = inject(ExerciseService);
  private readonly history = inject(HistoryService);
  private readonly settings = inject(SettingsService);
  protected readonly unit = this.settings.unitLabel;
  protected readonly display = (kg: number) => this.settings.display(kg);

  readonly id = input.required({ transform: numberAttribute });

  protected readonly ranges = RANGES;
  protected readonly range = signal<Range>('3M');
  protected readonly describeSets = describeSets;
  protected readonly shortDate = shortDate;

  protected readonly data = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) =>
        forkJoin({ exercise: this.exercises.get(id), history: this.history.exercise(id) }).pipe(
          map((d) => ({ ...d, failed: false })),
          catchError(() => of({ exercise: null, history: null, failed: true })),
        ),
      ),
    ),
  );

  protected readonly records = computed(() => recordSessions(this.data()?.history?.sessions ?? []));

  protected readonly inRange = computed(() => {
    const from = rangeStart(this.range());
    return (this.data()?.history?.sessions ?? []).filter((s) => Date.parse(s.date) >= from);
  });

  protected readonly points = computed(() =>
    this.inRange().map((s) => ({
      x: Date.parse(s.date),
      y: this.settings.display(s.bestOneRepMax),
    })),
  );

  /** Latest best 1RM and its change across the selected range. */
  protected readonly headline = computed(() => {
    const sessions = [...this.inRange()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const latest =
      sessions.at(-1)?.bestOneRepMax ?? this.data()?.history?.records.oneRepMax?.value ?? null;
    if (latest === null) return null;
    const first = sessions[0]?.bestOneRepMax;
    const change = sessions.length > 1 && first ? latest - first : null;
    return {
      value: latest,
      change,
      percent: change !== null && first ? (change / first) * 100 : null,
    };
  });

  protected readonly chartLabel = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return 'No sessions in this range';
    const u = this.unit();
    return `Estimated 1-rep max from ${round(pts[0].y)} ${u} to ${round(pts.at(-1)!.y)} ${u} over ${pts.length} sessions`;
  });

  protected round = round;

  protected signed(n: number): string {
    return (n > 0 ? '+' : n < 0 ? '−' : '') + round(Math.abs(n));
  }

  protected rangeName(r: Range): string {
    return r === 'ALL' ? 'All' : r;
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
