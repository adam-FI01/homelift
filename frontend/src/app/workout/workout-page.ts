import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { Exercise } from '../exercises/exercise';
import { problemMessage } from '../exercises/exercise.service';
import { describeSets } from '../history/history';
import { SettingsService } from '../settings/settings.service';
import { WeightPipe } from '../settings/weight.pipe';
import { ConfirmService } from '../shared/confirm.service';
import { Sheet } from '../shared/sheet';
import { ExercisePicker } from './exercise-picker';
import { RestTimer } from './rest-timer.service';
import { RestTimerCard } from './rest-timer';
import { Stepper } from './stepper';
import {
  LoggedSet,
  Workout,
  afterLog,
  earnedProgression,
  formatDuration,
  nextSetDefaults,
  supersetOf,
  workingSets,
} from './workout';
import { WorkoutService } from './workout.service';

/** The workout in progress: pick an exercise, log sets with one tap, rest between them. */
@Component({
  selector: 'app-workout-page',
  imports: [RouterLink, Stepper, RestTimerCard, ExercisePicker, Sheet, WeightPipe],
  templateUrl: './workout-page.html',
  styleUrl: './workout-page.scss',
})
export class WorkoutPage {
  private readonly api = inject(WorkoutService);
  private readonly router = inject(Router);
  private readonly rest = inject(RestTimer);
  private readonly confirm = inject(ConfirmService);
  protected readonly settings = inject(SettingsService);

  protected readonly unit = this.settings.unitLabel;
  protected readonly weightStep = this.settings.weightStep;

  protected readonly workout = signal<Workout | null | undefined>(undefined);
  protected readonly index = linkedSignal<Workout | null | undefined, number>({
    source: this.workout,
    computation: (w, prev) =>
      Math.min(prev?.value ?? 0, Math.max((w?.exercises.length ?? 1) - 1, 0)),
  });
  protected readonly picking = signal(false);
  protected readonly finishing = signal(false);
  /** The logged set being corrected in the edit sheet, with draft values. */
  protected readonly editing = signal<{ set: LoggedSet } | null>(null);
  protected readonly editWeight = signal(0);
  protected readonly editReps = signal(0);
  protected readonly editWarmup = signal(false);
  /** Log the next set as a warm-up; switches off when you change exercise. */
  protected readonly warmupNext = linkedSignal({ source: this.index, computation: () => false });
  protected readonly notesDraft = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly current = computed(() => this.workout()?.exercises[this.index()] ?? null);

  /** Weight and reps for the next set, refilled whenever the exercise or its sets change. */
  protected readonly weight = linkedSignal(() => {
    const ex = this.current();
    return ex ? this.shown(nextSetDefaults(ex, this.settings.weightStepKg()).weightKg) : 0;
  });
  protected readonly reps = linkedSignal(() => {
    const ex = this.current();
    return ex ? nextSetDefaults(ex, this.settings.weightStepKg()).reps : 0;
  });

  protected readonly nextSetNumber = computed(() => {
    const ex = this.current();
    return ex ? workingSets(ex).length + 1 : 1;
  });

  /** Names of the other exercises in the current superset, if any. */
  protected readonly supersetPartners = computed(() => {
    const w = this.workout();
    if (!w) return [];
    return supersetOf(w, this.index())
      .filter((i) => i !== this.index())
      .map((i) => w.exercises[i].name);
  });

  /** Rows for the sets table: warm-ups first, then every working set and the ones still to do. */
  protected readonly rows = computed(() => {
    const ex = this.current();
    if (!ex) return [];
    const warmups = ex.sets.filter((s) => s.warmup);
    const working = workingSets(ex);
    const count = Math.max(ex.targetSets, working.length + 1);
    return [
      ...warmups.map((s) => ({ label: 'W', logged: s, last: null, next: false, warmup: true })),
      ...Array.from({ length: count }, (_, i) => ({
        label: String(i + 1),
        logged: working[i] ?? null,
        last: ex.lastTime[i] ?? null,
        next: i === working.length,
        warmup: false,
      })),
    ];
  });

  protected readonly progress = computed(() => {
    const exercises = this.workout()?.exercises ?? [];
    const planned = exercises.reduce(
      (n, e) => n + Math.max(e.targetSets, workingSets(e).length),
      0,
    );
    const done = exercises.reduce((n, e) => n + workingSets(e).length, 0);
    return planned ? Math.round((done / planned) * 100) : 0;
  });

  /** Totals for the finish sheet; warm-ups don't count. */
  protected readonly summary = computed(() => {
    const exercises = this.workout()?.exercises ?? [];
    const sets = exercises.flatMap(workingSets);
    return {
      exercises: exercises.filter((e) => workingSets(e).length > 0).length,
      sets: sets.length,
      volume: Math.round(sets.reduce((kg, s) => kg + s.weightKg * s.reps, 0)),
    };
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
    const warmup = this.warmupNext();
    const from = this.index();
    this.rest.prime();
    this.run(
      this.api.logSet(w.id, ex.id, this.settings.toKg(this.weight()), this.reps(), warmup),
      () => {
        this.reload((updated) => {
          // Warm-ups need no rest or move; working sets follow the superset and the plan.
          if (warmup) return;
          const next = afterLog(updated, from);
          if (next.rest && this.settings.settings().autoStartRest) {
            this.rest.start(ex.restSeconds ?? undefined);
          }
          this.index.set(next.index);
        });
      },
    );
  }

  protected editSet(set: LoggedSet): void {
    this.editWeight.set(this.shown(set.weightKg));
    this.editReps.set(set.reps);
    this.editWarmup.set(set.warmup);
    this.editing.set({ set });
  }

  protected saveSet(): void {
    const w = this.workout();
    const ex = this.current();
    const e = this.editing();
    if (!w || !ex || !e) return;
    this.run(
      this.api.updateSet(
        w.id,
        ex.id,
        e.set.id,
        this.settings.toKg(this.editWeight()),
        this.editReps(),
        this.editWarmup(),
      ),
      () => {
        this.editing.set(null);
        this.reload();
      },
    );
  }

  protected deleteSet(): void {
    const w = this.workout();
    const ex = this.current();
    const e = this.editing();
    if (!w || !ex || !e) return;
    this.run(this.api.removeSet(w.id, ex.id, e.set.id), () => {
      this.editing.set(null);
      this.reload();
    });
  }

  protected async removeExercise(): Promise<void> {
    const w = this.workout();
    const ex = this.current();
    if (!w || !ex) return;
    const ok = await this.confirm.ask({
      title: `Remove ${ex.name}?`,
      message: ex.sets.length
        ? `Its ${ex.sets.length} logged ${ex.sets.length === 1 ? 'set goes' : 'sets go'} too.`
        : undefined,
      confirmLabel: 'Remove exercise',
      danger: true,
    });
    if (ok) this.run(this.api.removeExercise(w.id, ex.id), (updated) => this.workout.set(updated));
  }

  /** Opens the finish sheet, or offers to discard when nothing was logged. */
  protected finish(): void {
    if (this.summary().sets === 0) {
      void this.discard();
      return;
    }
    this.notesDraft.set(this.workout()?.notes ?? '');
    this.finishing.set(true);
  }

  protected confirmFinish(): void {
    const w = this.workout();
    if (!w) return;
    const notes = this.notesDraft().trim();
    const save = notes !== (w.notes ?? '') ? this.api.saveNotes(w.id, notes) : of(w);
    this.run(save.pipe(switchMap(() => this.api.finish(w.id))), () => {
      this.finishing.set(false);
      this.rest.skip();
      this.router.navigate(['/']);
    });
  }

  protected async discard(): Promise<void> {
    const w = this.workout();
    if (!w) return;
    const sets = this.summary().sets;
    const ok = await this.confirm.ask({
      title: 'Discard this workout?',
      message: sets
        ? `The ${sets} ${sets === 1 ? 'set' : 'sets'} you logged will be deleted.`
        : 'Nothing was logged yet.',
      confirmLabel: 'Discard workout',
      danger: true,
    });
    if (!ok) return;
    this.run(this.api.discard(w.id), () => {
      this.rest.skip();
      this.router.navigate(['/']);
    });
  }

  protected lastTimeSummary(): string {
    const ex = this.current();
    if (!ex) return '';
    const plan = ex.targetReps ? `Target ${ex.targetSets} × ${ex.targetReps}` : null;
    if (ex.lastTime.length === 0) return plan ?? 'First time doing this one';
    const last =
      'last time ' +
      describeSets(
        ex.lastTime.map((s, i) => ({ ...s, setNumber: i + 1 })),
        this.unit(),
        (kg) => this.settings.display(kg),
      );
    const bump = earnedProgression(ex) ? ` · +${this.weightStep()} ${this.unit()} today` : '';
    return plan ? `${plan} · ${last}${bump}` : last.charAt(0).toUpperCase() + last.slice(1);
  }

  /** A stored kg weight in the chosen unit, to one decimal, for the steppers. */
  private shown(kg: number): number {
    return Math.round(this.settings.display(kg) * 10) / 10;
  }

  private reload(then?: (updated: Workout) => void): void {
    const w = this.workout();
    if (!w) return;
    this.api.get(w.id).subscribe((updated) => {
      this.workout.set(updated);
      then?.(updated);
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
