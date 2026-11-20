import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Exercise } from '../exercises/exercise';
import { problemMessage } from '../exercises/exercise.service';
import { ExercisePicker } from './exercise-picker';
import { RestTimer } from './rest-timer.service';
import { RestTimerCard } from './rest-timer';
import { Stepper } from './stepper';
import { WEIGHT_STEP_KG, Workout, formatDuration, formatKg, nextSetDefaults } from './workout';
import { WorkoutService } from './workout.service';

/** The workout in progress: pick an exercise, log sets with one tap, rest between them. */
@Component({
  selector: 'app-workout-page',
  imports: [RouterLink, Stepper, RestTimerCard, ExercisePicker],
  templateUrl: './workout-page.html',
  styleUrl: './workout-page.scss',
})
export class WorkoutPage {
  private readonly api = inject(WorkoutService);
  private readonly router = inject(Router);
  private readonly rest = inject(RestTimer);

  protected readonly formatKg = formatKg;
  protected readonly weightStep = WEIGHT_STEP_KG;

  protected readonly workout = signal<Workout | null | undefined>(undefined);
  protected readonly index = linkedSignal<Workout | null | undefined, number>({
    source: this.workout,
    computation: (w, prev) =>
      Math.min(prev?.value ?? 0, Math.max((w?.exercises.length ?? 1) - 1, 0)),
  });
  protected readonly picking = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly current = computed(() => this.workout()?.exercises[this.index()] ?? null);

  /** Weight and reps for the next set, refilled whenever the exercise or its sets change. */
  protected readonly weight = linkedSignal(() => {
    const ex = this.current();
    return ex ? nextSetDefaults(ex).weightKg : 0;
  });
  protected readonly reps = linkedSignal(() => {
    const ex = this.current();
    return ex ? nextSetDefaults(ex).reps : 0;
  });

  protected readonly nextSetNumber = computed(() => (this.current()?.sets.length ?? 0) + 1);

  /** Rows for the sets table: every logged set plus the planned ones still to do. */
  protected readonly rows = computed(() => {
    const ex = this.current();
    if (!ex) return [];
    const count = Math.max(ex.targetSets, ex.sets.length + 1);
    return Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      logged: ex.sets[i] ?? null,
      last: ex.lastTime[i] ?? null,
      next: i === ex.sets.length,
    }));
  });

  protected readonly progress = computed(() => {
    const exercises = this.workout()?.exercises ?? [];
    const planned = exercises.reduce((n, e) => n + Math.max(e.targetSets, e.sets.length), 0);
    const done = exercises.reduce((n, e) => n + e.sets.length, 0);
    return planned ? Math.round((done / planned) * 100) : 0;
  });

  private readonly now = signal(Date.now());
  protected readonly elapsed = computed(() => {
    const w = this.workout();
    return w ? formatDuration((this.now() - Date.parse(w.startedAt)) / 1000) : '';
  });

  constructor() {
    const tick = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
    this.api.current().subscribe({
      next: (w) => {
        this.workout.set(w);
        if (w && w.exercises.length === 0) this.picking.set(true);
      },
      error: (err: unknown) => {
        this.workout.set(null);
        this.error.set(problemMessage(err));
      },
    });
  }

  protected start(): void {
    this.run(this.api.start(), (w) => {
      this.workout.set(w);
      this.picking.set(true);
    });
  }

  protected add(exercise: Exercise): void {
    const w = this.workout();
    if (!w) return;
    this.run(this.api.addExercise(w.id, exercise.id), (updated) => {
      this.workout.set(updated);
      this.index.set(updated.exercises.length - 1);
      this.picking.set(false);
    });
  }

  protected logSet(): void {
    const w = this.workout();
    const ex = this.current();
    if (!w || !ex) return;
    const finishesExercise = ex.sets.length + 1 >= ex.targetSets;
    this.run(this.api.logSet(w.id, ex.id, this.weight(), this.reps()), () => {
      this.rest.start();
      this.reload(() => {
        // Move on once the planned sets are done, if there is a next exercise.
        if (finishesExercise && this.index() < (this.workout()?.exercises.length ?? 0) - 1) {
          this.index.update((i) => i + 1);
        }
      });
    });
  }

  protected removeSet(setId: number, setNumber: number): void {
    const w = this.workout();
    const ex = this.current();
    if (!w || !ex || !confirm(`Remove set ${setNumber}?`)) return;
    this.run(this.api.removeSet(w.id, ex.id, setId), () => this.reload());
  }

  protected removeExercise(): void {
    const w = this.workout();
    const ex = this.current();
    if (!w || !ex || !confirm(`Remove ${ex.name} from this workout?`)) return;
    this.run(this.api.removeExercise(w.id, ex.id), (updated) => this.workout.set(updated));
  }

  protected finish(): void {
    const w = this.workout();
    if (!w) return;
    const logged = w.exercises.some((e) => e.sets.length > 0);
    if (!logged) {
      this.discard();
      return;
    }
    this.run(this.api.finish(w.id), () => {
      this.rest.skip();
      this.router.navigate(['/']);
    });
  }

  protected discard(): void {
    const w = this.workout();
    if (!w || !confirm('Discard this workout? Its sets will be deleted.')) return;
    this.run(this.api.discard(w.id), () => {
      this.rest.skip();
      this.router.navigate(['/']);
    });
  }

  protected lastTimeSummary(): string {
    const last = this.current()?.lastTime ?? [];
    if (last.length === 0) return 'First time doing this one';
    return 'Last time ' + last.map((s) => `${formatKg(s.weightKg)} × ${s.reps}`).join(', ');
  }

  private reload(then?: () => void): void {
    const w = this.workout();
    if (!w) return;
    this.api.get(w.id).subscribe((updated) => {
      this.workout.set(updated);
      then?.();
    });
  }

  private run<T>(request: Observable<T>, done: (value: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (value) => {
        this.busy.set(false);
        done(value);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(problemMessage(err));
      },
    });
  }
}
