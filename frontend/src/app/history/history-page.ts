import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Exercise } from '../exercises/exercise';
import { ExerciseService } from '../exercises/exercise.service';
import { problemMessage } from '../exercises/exercise.service';
import { RoutineService } from '../routines/routine.service';
import { SettingsService } from '../settings/settings.service';
import { WeightPipe } from '../settings/weight.pipe';
import { ConfirmService } from '../shared/confirm.service';
import { Sheet } from '../shared/sheet';
import { Workout, formatDuration, routineFromWorkout, workingSets } from '../workout/workout';
import { WorkoutService } from '../workout/workout.service';
import { WorkoutSummary, describeSets } from './history';
import { HistoryService } from './history.service';

const PAGE = 50;

type Tab = 'workouts' | 'exercises';

export interface MonthGroup {
  key: string;
  title: string;
  volumeKg: number;
  workouts: WorkoutSummary[];
}

/** Groups workouts (newest first) by calendar month, with each month's total volume. */
export function groupByMonth(workouts: WorkoutSummary[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const w of workouts) {
    const d = new Date(w.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.at(-1);
    if (!g || g.key !== key) {
      g = {
        key,
        title: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        volumeKg: 0,
        workouts: [],
      };
      groups.push(g);
    }
    g.workouts.push(w);
    g.volumeKg += w.volumeKg;
  }
  return groups;
}

/** Past workouts by month, or the exercises you have trained; tap a workout to see every set. */
@Component({
  selector: 'app-history-page',
  imports: [RouterLink, Sheet, WeightPipe],
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
})
export class HistoryPage {
  private readonly history = inject(HistoryService);
  private readonly workouts = inject(WorkoutService);
  private readonly confirm = inject(ConfirmService);
  private readonly settings = inject(SettingsService);
  private readonly exercisesApi = inject(ExerciseService);
  private readonly routines = inject(RoutineService);

  protected readonly tab = signal<Tab>('workouts');
  protected readonly limit = signal(PAGE);
  /** Workouts deleted here, hidden without a reload. */
  private readonly removed = signal<Set<number>>(new Set());

  private readonly data = toSignal(
    toObservable(this.limit).pipe(
      switchMap((limit) =>
        forkJoin({
          workouts: this.history.recentWorkouts(limit),
          exercises: this.exercisesApi.list(),
        }).pipe(
          map((d) => ({ ...d, failed: false })),
          catchError(() =>
            of({ workouts: [] as WorkoutSummary[], exercises: [] as Exercise[], failed: true }),
          ),
        ),
      ),
    ),
  );

  protected readonly loaded = computed(() => this.data() !== undefined);
  protected readonly failed = computed(() => this.data()?.failed ?? false);
  protected readonly list = computed(() =>
    (this.data()?.workouts ?? []).filter((w) => !this.removed().has(w.id)),
  );
  protected readonly months = computed(() => groupByMonth(this.list()));
  protected readonly mayHaveMore = computed(
    () => (this.data()?.workouts.length ?? 0) >= this.limit(),
  );

  /** Trained exercises with how often and when they were last done, most recent first. */
  protected readonly trained = computed(() => {
    const byName = new Map((this.data()?.exercises ?? []).map((e) => [e.name, e]));
    const seen = new Map<string, { exercise: Exercise; sessions: number; last: string }>();
    for (const w of this.list()) {
      for (const name of w.exercises) {
        const e = byName.get(name);
        if (!e) continue;
        const entry = seen.get(name);
        if (entry) entry.sessions++;
        else seen.set(name, { exercise: e, sessions: 1, last: w.startedAt });
      }
    }
    return [...seen.values()];
  });

  protected readonly detail = signal<Workout | null>(null);
  protected readonly detailSummary = computed(() => {
    const w = this.detail();
    if (!w) return null;
    const sets = w.exercises.flatMap(workingSets);
    return {
      sets: sets.length,
      volumeKg: sets.reduce((kg, s) => kg + s.weightKg * s.reps, 0),
      duration: this.duration(w.startedAt, w.finishedAt),
      exercises: w.exercises
        .filter((e) => workingSets(e).length > 0)
        .map((e) => ({
          id: e.exerciseId,
          name: e.name,
          sets: describeSets(workingSets(e), this.settings.unitLabel(), (kg) =>
            this.settings.display(kg),
          ),
        })),
    };
  });

  protected readonly notesDraft = signal('');
  /** "Save as routine" in the detail sheet: null when closed, else the name being typed. */
  protected readonly routineName = signal<string | null>(null);
  protected readonly routineSaved = signal<string | null>(null);
  protected readonly routineBusy = signal(false);
  protected readonly routineError = signal<string | null>(null);

  protected open(w: WorkoutSummary): void {
    this.workouts.get(w.id).subscribe((full) => {
      this.notesDraft.set(full.notes ?? '');
      this.resetRoutine();
      this.detail.set(full);
    });
  }

  private resetRoutine(): void {
    this.routineName.set(null);
    this.routineSaved.set(null);
    this.routineError.set(null);
  }

  protected startSaveRoutine(): void {
    this.routineName.set(this.detail()?.name ?? '');
  }

  /** Turns this past workout into a routine: working sets and the last rep count per exercise. */
  protected saveRoutine(): void {
    const w = this.detail();
    const name = this.routineName()?.trim();
    if (!w || !name || this.routineBusy()) return;
    this.routineBusy.set(true);
    this.routineError.set(null);
    this.routines
      .save(undefined, routineFromWorkout(w, name, this.settings.settings().defaultRestSeconds))
      .subscribe({
        next: (r) => {
          this.routineBusy.set(false);
          this.routineName.set(null);
          this.routineSaved.set(r.name);
        },
        error: (err: unknown) => {
          this.routineBusy.set(false);
          this.routineError.set(problemMessage(err));
        },
      });
  }

  protected saveNotes(): void {
    const w = this.detail();
    if (!w) return;
    this.workouts
      .saveNotes(w.id, this.notesDraft().trim())
      .subscribe((updated) => this.detail.set(updated));
  }

  protected async remove(): Promise<void> {
    const w = this.detail();
    if (!w) return;
    const ok = await this.confirm.ask({
      title: 'Delete this workout?',
      message: 'Its sets are removed from your history, stats and records. This cannot be undone.',
      confirmLabel: 'Delete workout',
      danger: true,
    });
    if (!ok) return;
    this.workouts.discard(w.id).subscribe(() => {
      this.removed.update((set) => new Set(set).add(w.id));
      this.detail.set(null);
    });
  }

  protected more(): void {
    this.limit.update((n) => n + PAGE);
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }

  protected longDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  protected shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  protected duration(start: string, end: string | null): string {
    return end ? formatDuration((Date.parse(end) - Date.parse(start)) / 1000) : '';
  }
}
