import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import {
  EQUIPMENT,
  Equipment,
  Exercise,
  MUSCLE_GROUPS,
  MuscleGroup,
  label,
} from '../exercises/exercise';
import { ExerciseService, problemMessage } from '../exercises/exercise.service';

/**
 * A searchable list of active exercises, shown inside a sheet. Tapping one picks it, or with
 * `multiple` set, ticks it; the button at the bottom then adds all ticked ones in tap order.
 */
@Component({
  selector: 'app-exercise-picker',
  template: `
    <div class="picker">
      <input
        type="search"
        placeholder="Search exercises"
        aria-label="Search exercises"
        autocomplete="off"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
      <ul>
        @for (e of matches(); track e.id) {
          <li>
            @if (multiple()) {
              <button
                type="button"
                class="row"
                role="checkbox"
                [attr.aria-checked]="isChosen(e)"
                (click)="toggle(e)"
              >
                <span class="box" [class.on]="isChosen(e)" aria-hidden="true">
                  @if (isChosen(e)) {
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  }
                </span>
                @if (e.mediaType === 'IMAGE' && e.mediaUrl) {
                  <img class="thumb" [src]="e.mediaUrl" alt="" loading="lazy" decoding="async" />
                }
                <span class="name">{{ e.name }}</span>
                <span class="sub">{{ label(e.muscleGroup) }}</span>
              </button>
            } @else {
              <button type="button" class="row" (click)="picked.emit(e)">
                @if (e.mediaType === 'IMAGE' && e.mediaUrl) {
                  <img class="thumb" [src]="e.mediaUrl" alt="" loading="lazy" decoding="async" />
                }
                <span class="name">{{ e.name }}</span>
                <span class="sub">{{ label(e.muscleGroup) }}</span>
              </button>
            }
          </li>
        } @empty {
          <li class="sub empty">{{ exercises() ? 'No exercises match.' : 'Loading…' }}</li>
        }
      </ul>
      @if (canCreate()) {
        @if (!creating()) {
          <button type="button" class="create" (click)="creating.set(true)">
            Create "{{ newName() }}"
          </button>
        } @else {
          <form class="new" (submit)="create($event)">
            <span class="title">New exercise: {{ newName() }}</span>
            <label>
              <span class="sub">Muscle group</span>
              <select aria-label="Muscle group" (change)="muscle.set($any($event.target).value)">
                <option value="" [selected]="!muscle()">Choose</option>
                @for (m of muscleGroups; track m) {
                  <option [value]="m" [selected]="muscle() === m">{{ label(m) }}</option>
                }
              </select>
            </label>
            <label>
              <span class="sub">Equipment</span>
              <select aria-label="Equipment" (change)="gear.set($any($event.target).value)">
                <option value="" [selected]="!gear()">Choose</option>
                @for (g of equipmentOptions; track g) {
                  <option [value]="g" [selected]="gear() === g">{{ label(g) }}</option>
                }
              </select>
            </label>
            @if (error(); as message) {
              <p class="error" role="alert">{{ message }}</p>
            }
            <button type="submit" class="btn-primary" [disabled]="saving() || !muscle() || !gear()">
              Create and add
            </button>
          </form>
        }
      }
      @if (multiple()) {
        <button
          type="button"
          class="btn-primary"
          [disabled]="chosen().length === 0"
          (click)="pickedMany.emit(chosen())"
        >
          {{
            chosen().length === 0
              ? 'Select exercises'
              : 'Add ' + chosen().length + (chosen().length === 1 ? ' exercise' : ' exercises')
          }}
        </button>
      }
    </div>
  `,
  styles: `
    .picker {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    input {
      height: var(--tap);
      padding: 0 14px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--bg);
      color: var(--ink);
      font: inherit;
    }
    ul {
      list-style: none;
      margin: 0 -20px;
      padding: 0;
      max-height: 50dvh;
      overflow-y: auto;
    }
    li + li {
      border-top: 1px solid var(--line);
    }
    .row {
      width: 100%;
      min-height: var(--tap);
      padding: 10px 20px;
      border: 0;
      background: none;
      color: var(--ink);
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
      font-weight: 500;
    }
    .name {
      flex: 1;
    }
    .thumb {
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--soft);
    }
    .box {
      flex: none;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 1.5px solid var(--sub);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .box.on {
      background: var(--btn);
      border-color: var(--btn);
      color: var(--on-btn);
    }
    .sub {
      color: var(--sub);
      font-size: 14px;
      font-weight: 400;
    }
    .empty {
      padding: 16px 20px;
      text-align: center;
    }
    .create {
      width: 100%;
      min-height: 48px;
      margin-top: 8px;
      border: 1px dashed var(--line, #d4d4d8);
      border-radius: 12px;
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .new {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .new .title {
      font-weight: 600;
    }
    .new label {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .new select {
      min-height: 44px;
      border-radius: 10px;
      font: inherit;
      padding: 0 10px;
    }
    .error {
      margin: 0;
      color: var(--danger, #b42318);
    }
    .btn-primary:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
})
export class ExercisePicker {
  readonly multiple = input(false);
  readonly picked = output<Exercise>();
  readonly pickedMany = output<Exercise[]>();

  private readonly api = inject(ExerciseService);
  protected readonly label = label;
  protected readonly muscleGroups = MUSCLE_GROUPS;
  protected readonly equipmentOptions = EQUIPMENT;
  protected readonly creating = signal(false);
  protected readonly muscle = signal<MuscleGroup | ''>('');
  protected readonly gear = signal<Equipment | ''>('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly created = signal<Exercise[]>([]);
  protected readonly query = signal('');
  protected readonly chosen = signal<Exercise[]>([]);
  private readonly loaded = toSignal(
    this.api.list().pipe(
      map((all) => all.filter((e) => !e.archived)),
      catchError(() => of([] as Exercise[])),
    ),
  );
  protected readonly exercises = computed(() => {
    const all = this.loaded();
    return all ? [...this.created(), ...all] : undefined;
  });
  protected readonly matches = computed(() => {
    const q = this.query().trim().toLowerCase();
    return (this.exercises() ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
  });
  protected readonly newName = computed(() => this.query().trim().replace(/\s+/g, ' '));
  /** Offer to create the searched name unless an exercise already has exactly that name. */
  protected readonly canCreate = computed(() => {
    const name = this.newName().toLowerCase();
    return (
      name.length > 0 &&
      this.exercises() !== undefined &&
      !this.exercises()!.some((e) => e.name.toLowerCase() === name)
    );
  });

  protected create(event: Event): void {
    event.preventDefault();
    const muscleGroup = this.muscle();
    const equipment = this.gear();
    if (!muscleGroup || !equipment || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.api
      .create({
        name: this.newName(),
        muscleGroup,
        equipment,
        restSeconds: null,
        notes: null,
        stepKg: null,
      })
      .subscribe({
        next: (e) => {
          this.saving.set(false);
          this.created.update((list) => [e, ...list]);
          this.creating.set(false);
          this.muscle.set('');
          this.gear.set('');
          this.query.set('');
          if (this.multiple()) this.chosen.update((list) => [...list, e]);
          else this.picked.emit(e);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(problemMessage(err));
        },
      });
  }

  protected isChosen(e: Exercise): boolean {
    return this.chosen().some((c) => c.id === e.id);
  }

  protected toggle(e: Exercise): void {
    this.chosen.update((list) =>
      this.isChosen(e) ? list.filter((c) => c.id !== e.id) : [...list, e],
    );
  }
}
