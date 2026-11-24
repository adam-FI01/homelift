import { Component, OnInit, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Exercise } from '../exercises/exercise';
import { problemMessage } from '../exercises/exercise.service';
import { SettingsService } from '../settings/settings.service';
import { ConfirmService } from '../shared/confirm.service';
import { Sheet } from '../shared/sheet';
import { ExercisePicker } from '../workout/exercise-picker';
import { formatDuration } from '../workout/workout';
import { DEFAULT_PLAN, RoutineExercise, supersetGroups, withLinks } from './routine';
import { RoutineService } from './routine.service';

type Field = 'sets' | 'reps' | 'maxReps' | 'restSeconds';

const LIMITS: Record<Field, { min: number; max: number; step: number }> = {
  sets: { min: 1, max: 20, step: 1 },
  reps: { min: 1, max: 100, step: 1 },
  maxReps: { min: 1, max: 100, step: 1 },
  restSeconds: { min: 0, max: 900, step: 15 },
};

/** Builds or edits a routine: name, exercises in order, and sets × reps · rest for each. */
@Component({
  selector: 'app-routine-editor',
  imports: [RouterLink, ExercisePicker, Sheet],
  templateUrl: './routine-editor.html',
  styleUrl: './routine-editor.scss',
})
export class RoutineEditor implements OnInit {
  private readonly api = inject(RoutineService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly settings = inject(SettingsService);
  protected readonly unit = this.settings.unitLabel;
  protected readonly weightStep = this.settings.weightStep;

  readonly id = input(undefined, {
    transform: (v: unknown) => (v == null ? undefined : numberAttribute(v)),
  });

  protected readonly name = signal('');
  protected readonly exercises = signal<RoutineExercise[]>([]);
  protected readonly open = signal<number | null>(0);
  protected readonly picking = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadFailed = signal(false);

  protected readonly formatRest = formatDuration;

  protected readonly summary = computed(() => {
    const list = this.exercises();
    const sets = list.reduce((n, e) => n + e.sets, 0);
    const seconds = list.reduce(
      (n, e) => n + e.sets * 45 + Math.max(e.sets - 1, 0) * e.restSeconds,
      0,
    );
    const minutes = Math.round(seconds / 300) * 5;
    return `${list.length} ${list.length === 1 ? 'exercise' : 'exercises'} · ${sets} sets · ~${minutes} min`;
  });

  protected readonly canSave = computed(
    () => this.name().trim().length > 0 && this.exercises().length > 0,
  );

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      this.picking.set(true);
      return;
    }
    this.api.get(id).subscribe({
      next: (r) => {
        this.name.set(r.name);
        this.exercises.set(withLinks(r.exercises));
      },
      error: () => this.loadFailed.set(true),
    });
  }

  protected addMany(picked: Exercise[]): void {
    this.exercises.update((list) => [
      ...list,
      ...picked.map((e) => ({
        exerciseId: e.id,
        name: e.name,
        ...DEFAULT_PLAN,
        // The exercise's own rest, else the default rest from Settings.
        restSeconds: e.restSeconds ?? this.settings.settings().defaultRestSeconds,
      })),
    ]);
    this.open.set(picked.length === 1 ? this.exercises().length - 1 : null);
    this.picking.set(false);
  }

  protected adjust(index: number, field: Field, direction: -1 | 1): void {
    const e = this.exercises()[index];
    if (field === 'maxReps') {
      // "Up to": the top of a rep range. One step above the bottom is the lowest it can go, and
      // going lower turns the range off again.
      const next = (e.maxReps ?? e.reps) + direction;
      this.patch(index, { maxReps: next <= e.reps ? null : Math.min(LIMITS.maxReps.max, next) });
      return;
    }
    const { min, max, step } = LIMITS[field];
    const value = Math.min(max, Math.max(min, e[field] + step * direction));
    // Moving the bottom up past the top of the range pushes the top up with it.
    const top = field === 'reps' && e.maxReps != null && e.maxReps <= value ? null : e.maxReps;
    this.patch(index, { [field]: value, ...(field === 'reps' ? { maxReps: top } : {}) });
  }

  protected atLimit(index: number, field: Field, direction: -1 | 1): boolean {
    const e = this.exercises()[index];
    if (field === 'maxReps') {
      return direction < 0 ? e.maxReps == null : (e.maxReps ?? e.reps) >= LIMITS.maxReps.max;
    }
    const value = e[field];
    return direction < 0 ? value <= LIMITS[field].min : value >= LIMITS[field].max;
  }

  /** "8", or "8 to 12" for a rep range. */
  protected repsLabel(e: RoutineExercise): string {
    return e.maxReps ? `${e.reps} to ${e.maxReps}` : String(e.reps);
  }

  protected toggleLink(index: number): void {
    this.patch(index, { linkNext: !this.exercises()[index].linkNext });
  }

  protected toggleAuto(index: number): void {
    this.patch(index, { autoProgress: !this.exercises()[index].autoProgress });
  }

  protected move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    this.exercises.update((list) => {
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    if (this.open() === index) this.open.set(target);
  }

  protected remove(index: number): void {
    this.exercises.update((list) => list.filter((_, i) => i !== index));
    this.open.set(null);
  }

  protected toggle(index: number): void {
    this.open.update((o) => (o === index ? null : index));
  }

  protected save(): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set(null);
    const list = this.exercises();
    const groups = supersetGroups(list);
    const input = {
      name: this.name().trim(),
      exercises: list.map(({ exerciseId, sets, reps, maxReps, restSeconds, autoProgress }, i) => ({
        exerciseId,
        sets,
        reps,
        maxReps: maxReps ?? null,
        restSeconds,
        autoProgress,
        supersetGroup: groups[i],
      })),
    };
    this.api.save(this.id(), input).subscribe({
      next: () => this.router.navigate(['/routines']),
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(problemMessage(err));
      },
    });
  }

  protected async delete(): Promise<void> {
    const id = this.id();
    if (!id) return;
    const ok = await this.confirm.ask({
      title: `Delete ${this.name()}?`,
      message: 'Workouts you already did with it are kept.',
      confirmLabel: 'Delete routine',
      danger: true,
    });
    if (!ok) return;
    this.api.delete(id).subscribe({
      next: () => this.router.navigate(['/routines']),
      error: (err: unknown) => this.error.set(problemMessage(err)),
    });
  }

  private patch(index: number, change: Partial<RoutineExercise>): void {
    this.exercises.update((list) => list.map((e, i) => (i === index ? { ...e, ...change } : e)));
  }
}
