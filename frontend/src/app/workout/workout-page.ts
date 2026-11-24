import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { Exercise } from '../exercises/exercise';
import { problemMessage } from '../exercises/exercise.service';
import { describeSets } from '../history/history';
import { RoutineService } from '../routines/routine.service';
import { SettingsService } from '../settings/settings.service';
import { WeightPipe } from '../settings/weight.pipe';
import { ConfirmService } from '../shared/confirm.service';
import { Sheet } from '../shared/sheet';
import { ExercisePicker } from './exercise-picker';
import { NewAction, OfflineQueue, withPending } from './offline-queue.service';
import { OfflineStatus } from './offline-status';
import { PlateCalculator } from './plate-calculator';
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
  progressionHint,
  supersetOf,
  workingSets,
} from './workout';
import { WorkoutService } from './workout.service';

/** The workout in progress: pick an exercise, log sets with one tap, rest between them. */
@Component({
  selector: 'app-workout-page',
  imports: [
    RouterLink,
    OfflineStatus,
    Stepper,
    RestTimerCard,
    ExercisePicker,
    Sheet,
    WeightPipe,
    PlateCalculator,
  ],
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

  private readonly queue = inject(OfflineQueue);
  private readonly routines = inject(RoutineService);
  /** The workout as the server last sent it. */
  private readonly server = signal<Workout | null | undefined>(undefined);
  /** What the page shows: the server's workout plus any sets waiting to sync. */
  protected readonly workout = computed(() => withPending(this.server(), this.queue.items()));
  protected readonly index = linkedSignal<Workout | null | undefined, number>({
    source: this.workout,
    computation: (w, prev) =>
      Math.min(prev?.value ?? 0, Math.max((w?.exercises.length ?? 1) - 1, 0)),
  });
  protected readonly picking = signal(false);
  protected readonly finishing = signal(false);
  protected readonly plates = signal(false);
  /** The logged set being corrected in the edit sheet, with draft values. */
  protected readonly editing = signal<{ set: LoggedSet } | null>(null);
  protected readonly editWeight = signal(0);
  protected readonly editReps = signal(0);
  protected readonly editWarmup = signal(false);
  /** Log the next set as a warm-up; switches off when you change exercise. */
  protected readonly warmupNext = linkedSignal({ source: this.index, computation: () => false });
  protected readonly notesDraft = signal('');
  /** "Save as routine" on the finish sheet: null when closed, else the name being typed. */
  protected readonly routineName = signal<string | null>(null);
  protected readonly routineSaved = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly current = computed(() => this.workout()?.exercises[this.index()] ?? null);

  /** The +/− step for the weight stepper, in the chosen unit: this exercise's own, else the setting. */
  protected readonly weightStep = computed(() => {
    const own = this.current()?.stepKg;
    return own ? Math.round(this.settings.display(own) * 100) / 100 : this.settings.weightStep();
  });

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

  /** A suggestion for the first set, from last time. */
  protected readonly hint = computed(() => {
    const ex = this.current();
    return ex ? progressionHint(ex, this.settings.weightStepKg()) : null;
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
    // When queued sets reach the server, fetch the real workout again.
    effect(() => {
      if (this.queue.synced() > 0) untracked(() => this.reload());
    });
    const tick = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
    this.api.current().subscribe({
      next: (w) => {
        this.server.set(w);
        if (w && w.exercises.length === 0) this.picking.set(true);
      },
      error: (err: unknown) => {
        this.server.set(null);
        this.error.set(problemMessage(err));
      },
    });
  }

  protected start(): void {
    this.run(this.api.start(), (w) => {
      this.server.set(w);
      this.picking.set(true);
    });
  }

  protected add(exercise: Exercise): void {
    const w = this.workout();
    if (!w) return;
    this.run(this.api.addExercise(w.id, exercise.id), (updated) => {
      this.server.set(updated);
      this.index.set(updated.exercises.length - 1);
      this.picking.set(false);
    });
  }

  protected applyHint(): void {
    const h = this.hint();
    if (!h) return;
    this.weight.set(this.shown(h.weightKg));
    this.reps.set(h.reps);
  }

  protected logSet(): void {
    const w = this.workout();
    const ex = this.current();
    if (!w || !ex) return;
    const warmup = this.warmupNext();
    const from = this.index();
    const weightKg = this.settings.toKg(this.weight());
    const reps = this.reps();
    this.rest.prime();
    // Warm-ups need no rest or move; working sets follow the superset and the plan.
    const moveOn = (updated: Workout) => {
      if (warmup) return;
      const next = afterLog(updated, from);
      if (next.rest && this.settings.settings().autoStartRest) {
        this.rest.start(ex.restSeconds ?? undefined);
      }
      this.index.set(next.index);
    };
    this.busy.set(true);
    this.error.set(null);
    this.api.logSet(w.id, ex.id, weightKg, reps, warmup).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload(() => moveOn(this.workout()!));
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (err instanceof HttpErrorResponse && err.status === 0) {
          // Offline: keep the set on this device, show it as pending and carry on.
          this.queue.add({
            type: 'set',
            workoutId: w.id,
            workoutExerciseId: ex.id,
            weightKg,
            reps,
            warmup,
          });
          moveOn(this.workout()!);
        } else {
          this.error.set(problemMessage(err));
        }
      },
    });
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
    const weightKg = this.settings.toKg(this.editWeight());
    const reps = this.editReps();
    const warmup = this.editWarmup();
    const queued = e.set.queueKey;
    if (queued) {
      // Still only on this phone: change the waiting set itself.
      this.queue.editPending(queued, { weightKg, reps, warmup });
      this.editing.set(null);
      return;
    }
    this.runOrQueue(
      this.api.updateSet(w.id, ex.id, e.set.id, weightKg, reps, warmup),
      {
        type: 'editSet',
        workoutId: w.id,
        workoutExerciseId: ex.id,
        setId: e.set.id,
        weightKg,
        reps,
        warmup,
      },
      () => {
        this.editing.set(null);
        this.reload();
      },
      () => this.editing.set(null),
    );
  }

  protected deleteSet(): void {
    const w = this.workout();
    const ex = this.current();
    const e = this.editing();
    if (!w || !ex || !e) return;
    const queued = e.set.queueKey;
    if (queued) {
      this.queue.removePending(queued);
      this.editing.set(null);
      return;
    }
    this.runOrQueue(
      this.api.removeSet(w.id, ex.id, e.set.id),
      { type: 'deleteSet', workoutId: w.id, workoutExerciseId: ex.id, setId: e.set.id },
      () => {
        this.editing.set(null);
        this.reload();
      },
      () => this.editing.set(null),
    );
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
    if (ok) this.run(this.api.removeExercise(w.id, ex.id), (updated) => this.server.set(updated));
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

  protected startSaveRoutine(): void {
    this.routineName.set(this.workout()?.name ?? '');
  }

  /** Turns what was done today into a routine: working sets and the last rep count per exercise. */
  protected saveRoutine(): void {
    const w = this.workout();
    const name = this.routineName()?.trim();
    if (!w || !name || this.busy()) return;
    const exercises = w.exercises
      .map((e) => ({ e, done: workingSets(e) }))
      .filter(({ done }) => done.length > 0)
      .map(({ e, done }) => ({
        exerciseId: e.exerciseId,
        sets: Math.min(done.length, 20),
        reps: Math.min(Math.max(done[done.length - 1].reps, 1), 100),
        maxReps: null,
        restSeconds: e.restSeconds ?? this.settings.settings().defaultRestSeconds,
        autoProgress: false,
        supersetGroup: e.supersetGroup,
      }));
    this.busy.set(true);
    this.error.set(null);
    this.routines.save(undefined, { name, exercises }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.routineName.set(null);
        this.routineSaved.set(r.name);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(problemMessage(err));
      },
    });
  }

  protected confirmFinish(): void {
    const w = this.workout();
    if (!w) return;
    const notes = this.notesDraft().trim();
    const changed = notes !== (w.notes ?? '');
    const save = changed ? this.api.saveNotes(w.id, notes) : of(w);
    const leave = () => {
      this.finishing.set(false);
      this.rest.skip();
      this.router.navigate(['/']);
    };
    this.busy.set(true);
    this.error.set(null);
    save.pipe(switchMap(() => this.api.finish(w.id))).subscribe({
      next: () => {
        this.busy.set(false);
        leave();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (err instanceof HttpErrorResponse && err.status === 0) {
          // No connection: keep the notes and the finish on this phone, in order, and send them later.
          if (changed) this.queue.add({ type: 'notes', workoutId: w.id, notes });
          this.queue.add({ type: 'finish', workoutId: w.id });
          leave();
        } else {
          this.error.set(problemMessage(err));
        }
      },
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
    const reps =
      ex.targetMaxReps && ex.targetReps ? `${ex.targetReps} to ${ex.targetMaxReps}` : ex.targetReps;
    const plan = reps ? `Target ${ex.targetSets} × ${reps}` : null;
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
      this.server.set(updated);
      then?.(updated);
    });
  }

  /** Like `run`, but with no connection the change waits on this phone and `offline` shows it. */
  private runOrQueue<T>(
    request: Observable<T>,
    action: NewAction,
    done: (value: T) => void,
    offline: () => void,
  ): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (value) => {
        this.busy.set(false);
        done(value);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (err instanceof HttpErrorResponse && err.status === 0) {
          this.queue.add(action);
          offline();
        } else {
          this.error.set(problemMessage(err));
        }
      },
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
