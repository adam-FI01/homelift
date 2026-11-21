import { Component, computed, inject, input, numberAttribute, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import { formatDuration } from '../workout/workout';
import { EQUIPMENT, Equipment, Exercise, MUSCLE_GROUPS, MuscleGroup, label } from './exercise';
import { ExerciseService, problemMessage } from './exercise.service';

/** Adds a new exercise, or edits and archives an existing one when an id is in the route. */
@Component({
  selector: 'app-exercise-form',
  imports: [RouterLink],
  template: `
    <header class="head">
      <a class="back" routerLink="/exercises" aria-label="Back to exercises">‹ Exercises</a>
      <h1>{{ id() ? 'Edit exercise' : 'New exercise' }}</h1>
    </header>

    @if (loadFailed()) {
      <p class="card sub">Couldn't load this exercise.</p>
    } @else {
      <form class="card form" (submit)="save($event)">
        <label class="field">
          <span>Name</span>
          <input
            name="name"
            required
            maxlength="80"
            autocomplete="off"
            placeholder="e.g. Cable Lateral Raise"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </label>

        <fieldset>
          <legend>Muscle group</legend>
          <div class="options">
            @for (m of muscleGroups; track m) {
              <button
                type="button"
                class="chip"
                [class.on]="muscleGroup() === m"
                [attr.aria-pressed]="muscleGroup() === m"
                (click)="muscleGroup.set(m)"
              >
                {{ label(m) }}
              </button>
            }
          </div>
        </fieldset>

        <fieldset>
          <legend>Equipment</legend>
          <div class="options">
            @for (eq of equipmentOptions; track eq) {
              <button
                type="button"
                class="chip"
                [class.on]="equipment() === eq"
                [attr.aria-pressed]="equipment() === eq"
                (click)="equipment.set(eq)"
              >
                {{ label(eq) }}
              </button>
            }
          </div>
        </fieldset>

        <label class="field">
          <span>Notes</span>
          <textarea
            class="field"
            name="notes"
            rows="2"
            maxlength="500"
            placeholder="Set-up cues, like seat height or grip"
            [value]="notes()"
            (input)="notes.set($any($event.target).value)"
          ></textarea>
        </label>

        <fieldset>
          <legend>Rest between sets</legend>
          <div class="rest">
            <button
              type="button"
              class="chip"
              [class.on]="rest() === null"
              [attr.aria-pressed]="rest() === null"
              (click)="rest.set(null)"
            >
              Default ({{ format(defaultRest()) }})
            </button>
            <div class="rest-pick" [class.on]="rest() !== null">
              <button type="button" aria-label="15 seconds less rest" (click)="nudgeRest(-15)">
                −
              </button>
              <output>{{ format(rest() ?? defaultRest()) }}</output>
              <button type="button" aria-label="15 seconds more rest" (click)="nudgeRest(15)">
                +
              </button>
            </div>
          </div>
        </fieldset>

        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }

        <button class="btn-primary" type="submit" [disabled]="saving() || !canSave()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </form>

      @if (id()) {
        <button type="button" class="secondary" [disabled]="saving()" (click)="toggleArchived()">
          {{ archived() ? 'Restore exercise' : 'Archive exercise' }}
        </button>
        <p class="hint">Archived exercises are hidden from the list but keep their history.</p>
      }
    }
  `,
  styles: `
    .rest {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .rest-pick {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 36px;
      padding: 0 4px;
      border-radius: 999px;
      border: 1px solid var(--line);
    }
    .rest-pick.on {
      border-color: var(--ink);
    }
    .rest-pick button {
      width: 32px;
      height: 32px;
      border: 0;
      background: none;
      color: var(--ink);
      font-size: 18px;
    }
    .rest-pick output {
      min-width: 40px;
      text-align: center;
      font-size: 14px;
      font-weight: 500;
    }
    :host {
      display: contents;
    }
    .head {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: 4px;
    }
    .back {
      color: var(--sub);
      text-decoration: none;
      font-size: 15px;
      padding: 4px 0;
      align-self: flex-start;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .field span,
    legend {
      font-size: 14px;
      font-weight: 500;
      color: var(--sub);
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
    fieldset {
      border: 0;
      margin: 0;
      padding: 0;
    }
    legend {
      padding: 0;
      margin-bottom: 8px;
    }
    .options {
      display: flex;
      flex-wrap: wrap;
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
    .btn-primary:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .error {
      margin: 0;
      color: var(--neg);
      font-size: 14px;
    }
    .secondary {
      height: 48px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--ink);
      font-weight: 500;
    }
    .hint {
      margin: -8px 0 0;
      text-align: center;
      color: var(--sub);
      font-size: 13px;
    }
  `,
})
export class ExerciseForm implements OnInit {
  private readonly api = inject(ExerciseService);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService);

  /** Bound from the :id route parameter; absent when adding. */
  readonly id = input(undefined, {
    transform: (v: unknown) => (v == null ? undefined : numberAttribute(v)),
  });

  protected readonly label = label;
  protected readonly muscleGroups = MUSCLE_GROUPS;
  protected readonly equipmentOptions = EQUIPMENT;

  protected readonly name = signal('');
  protected readonly muscleGroup = signal<MuscleGroup | null>(null);
  protected readonly equipment = signal<Equipment | null>(null);
  /** This exercise's own rest in seconds, or null to follow the default. */
  protected readonly rest = signal<number | null>(null);
  protected readonly notes = signal('');
  protected readonly defaultRest = computed(() => this.settings.settings().defaultRestSeconds);
  protected readonly format = formatDuration;
  protected readonly archived = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadFailed = signal(false);

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.api.get(id).subscribe({
        next: (e) => this.fill(e),
        error: () => this.loadFailed.set(true),
      });
    }
  }

  protected canSave(): boolean {
    return (
      this.name().trim().length > 0 && this.muscleGroup() !== null && this.equipment() !== null
    );
  }

  protected save(event: Event): void {
    event.preventDefault();
    const muscleGroup = this.muscleGroup();
    const equipment = this.equipment();
    if (!this.canSave() || !muscleGroup || !equipment) return;

    const input = {
      name: this.name().trim(),
      muscleGroup,
      equipment,
      restSeconds: this.rest(),
      notes: this.notes().trim() || null,
    };
    const id = this.id();
    this.run(id ? this.api.update(id, input) : this.api.create(input), () =>
      this.router.navigate(['/exercises']),
    );
  }

  protected toggleArchived(): void {
    const id = this.id();
    if (!id) return;
    this.run(this.archived() ? this.api.restore(id) : this.api.archive(id), (e) => {
      this.fill(e);
      if (e.archived) this.router.navigate(['/exercises']);
    });
  }

  private run(request: Observable<Exercise>, done: (e: Exercise) => void): void {
    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (e) => {
        this.saving.set(false);
        done(e);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(problemMessage(err));
      },
    });
  }

  protected nudgeRest(seconds: number): void {
    this.rest.update((r) => Math.min(900, Math.max(0, (r ?? this.defaultRest()) + seconds)));
  }

  private fill(e: Exercise): void {
    this.name.set(e.name);
    this.muscleGroup.set(e.muscleGroup);
    this.equipment.set(e.equipment);
    this.rest.set(e.restSeconds ?? null);
    this.notes.set(e.notes ?? '');
    this.archived.set(e.archived);
  }
}
