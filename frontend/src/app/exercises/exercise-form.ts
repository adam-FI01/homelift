import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  numberAttribute,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import { ACCEPT, PreparedMedia, prepareMedia } from '../shared/media';
import { ToastService } from '../shared/toast.service';
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
      <form class="card form" novalidate (submit)="save($event)">
        <label class="field">
          <span>Name <span class="req">Required</span></span>
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
          <legend>Muscle group <span class="req">Required</span></legend>
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
          <legend>Equipment <span class="req">Required</span></legend>
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

        <fieldset>
          <legend>Photo or short clip</legend>
          @if (preview(); as p) {
            <div class="media">
              @if (p.type === 'VIDEO') {
                <video [src]="p.url" controls muted loop playsinline preload="metadata"></video>
              } @else {
                <img [src]="p.url" alt="This exercise" decoding="async" />
              }
            </div>
          }
          <div class="rest">
            <label class="chip file">
              {{ preview() ? 'Choose another' : 'Add a picture or clip' }}
              <input
                type="file"
                class="visually-hidden"
                [accept]="accept"
                (change)="chooseMedia($event)"
              />
            </label>
            @if (preview()) {
              <button type="button" class="chip" (click)="clearMedia()">Remove</button>
            }
          </div>
          @if (mediaError(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }
          <p class="hint">
            Your own photo or a clip of up to 15 MB. It stays on your server and goes into backups.
          </p>
        </fieldset>

        <fieldset>
          <legend>Weight step</legend>
          <div class="rest">
            <button
              type="button"
              class="chip"
              [class.on]="step() === null"
              [attr.aria-pressed]="step() === null"
              (click)="step.set(null)"
            >
              Default ({{ defaultStep() }} {{ unit() }})
            </button>
            <div class="rest-pick" [class.on]="step() !== null">
              <button type="button" aria-label="Smaller weight step" (click)="nudgeStep(-1)">
                −
              </button>
              <output>{{ step() ?? defaultStep() }} {{ unit() }}</output>
              <button type="button" aria-label="Bigger weight step" (click)="nudgeStep(1)">
                +
              </button>
            </div>
          </div>
          <p class="hint">
            What to add when you progress, for example 1 for small dumbbells or the jump between
            plates on a machine.
          </p>
        </fieldset>

        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }

        @if (missing(); as m) {
          <p class="missing" role="alert">{{ m }}</p>
        }
        <button class="btn-primary" type="submit" [disabled]="saving()">
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
    .media {
      margin-bottom: 12px;
      border-radius: 14px;
      overflow: hidden;
      background: var(--soft);
    }
    .media img,
    .media video {
      display: block;
      width: 100%;
      max-height: 280px;
      object-fit: contain;
    }
    .file {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
    }
    .file:focus-within {
      outline: 2px solid var(--ink);
      outline-offset: 2px;
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
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
    }
    .req {
      font-size: 13px;
      font-weight: 500;
      color: var(--sub);
      margin-left: 6px;
    }
    input {
      height: var(--tap);
      padding: 0 14px;
      border: 1.5px solid var(--field-line);
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--ink);
      font: inherit;
    }
    .missing {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--neg);
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
  private readonly toast = inject(ToastService);
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
  /** This exercise's own weight step in the chosen unit, or null to follow Settings. */
  protected readonly step = signal<number | null>(null);

  protected readonly accept = ACCEPT;
  /** The saved picture or clip, shown until it is removed or replaced. */
  private readonly saved = signal<Pick<Exercise, 'mediaUrl' | 'mediaType'> | null>(null);
  /** A file chosen but not sent yet; it goes up when the form is saved. */
  private readonly chosen = signal<{ media: PreparedMedia; url: string } | null>(null);
  private readonly removeSaved = signal(false);
  protected readonly mediaError = signal<string | null>(null);
  protected readonly preview = computed(() => {
    const c = this.chosen();
    if (c) return { url: c.url, type: c.media.type };
    const s = this.saved();
    return s?.mediaUrl && !this.removeSaved() ? { url: s.mediaUrl, type: s.mediaType } : null;
  });
  protected readonly unit = this.settings.unitLabel;
  protected readonly defaultStep = this.settings.weightStep;
  protected readonly defaultRest = computed(() => this.settings.settings().defaultRestSeconds);
  protected readonly format = formatDuration;
  protected readonly archived = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadFailed = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dropChosen());
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.api.get(id).subscribe({
        next: (e) => this.fill(e),
        error: () => this.loadFailed.set(true),
      });
    }
  }

  protected readonly attempted = signal(false);

  /** What is still missing, shown after the first tap on Save. */
  protected missing(): string | null {
    if (!this.attempted()) return null;
    const list = [
      this.name().trim() ? null : 'a name',
      this.muscleGroup() ? null : 'a muscle group',
      this.equipment() ? null : 'the equipment',
    ].filter((m) => m !== null);
    return list.length ? `Still needed: ${list.join(', ')}.` : null;
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
    if (!this.canSave() || !muscleGroup || !equipment) {
      this.attempted.set(true);
      return;
    }

    const input = {
      name: this.name().trim(),
      muscleGroup,
      equipment,
      restSeconds: this.rest(),
      notes: this.notes().trim() || null,
      stepKg: this.step() === null ? null : this.settings.toKg(this.step()!),
    };
    const id = this.id();
    const media = this.chosen()?.media;
    const removeSaved = this.removeSaved();
    const request = (id ? this.api.update(id, input) : this.api.create(input)).pipe(
      // Pictures go up after the exercise exists, so a new exercise can have one straight away.
      switchMap((saved) =>
        media
          ? this.api.uploadMedia(saved.id, media.blob)
          : removeSaved && saved.mediaUrl
            ? this.api.removeMedia(saved.id)
            : of(saved),
      ),
    );
    this.run(request, (saved) => {
      this.toast.show(`${saved.name} saved`);
      this.router.navigate(['/exercises']);
    });
  }

  protected toggleArchived(): void {
    const id = this.id();
    if (!id) return;
    this.run(this.archived() ? this.api.restore(id) : this.api.archive(id), (e) => {
      this.fill(e);
      this.toast.show(e.archived ? `${e.name} archived` : `${e.name} restored`);
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

  /** Moves the step through the usual jumps: 0.5, 1, 1.25, 2, 2.5, 5, 10. */
  protected nudgeStep(direction: -1 | 1): void {
    const steps = [0.25, 0.5, 1, 1.25, 2, 2.5, 5, 10];
    const now = this.step() ?? this.defaultStep();
    const next =
      direction > 0 ? steps.find((s) => s > now) : [...steps].reverse().find((s) => s < now);
    if (next !== undefined) this.step.set(next);
  }

  protected async chooseMedia(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.mediaError.set(null);
    try {
      const media = await prepareMedia(file);
      this.dropChosen();
      this.chosen.set({ media, url: URL.createObjectURL(media.blob) });
    } catch (err) {
      this.mediaError.set(err instanceof Error ? err.message : 'That file could not be used.');
    }
  }

  protected clearMedia(): void {
    this.dropChosen();
    this.removeSaved.set(true);
    this.mediaError.set(null);
  }

  private dropChosen(): void {
    const c = this.chosen();
    if (c) URL.revokeObjectURL(c.url);
    this.chosen.set(null);
  }

  private fill(e: Exercise): void {
    this.saved.set({ mediaUrl: e.mediaUrl, mediaType: e.mediaType });
    this.removeSaved.set(false);
    this.step.set(
      e.stepKg == null ? null : Math.round(this.settings.display(e.stepKg) * 100) / 100,
    );
    this.name.set(e.name);
    this.muscleGroup.set(e.muscleGroup);
    this.equipment.set(e.equipment);
    this.rest.set(e.restSeconds ?? null);
    this.notes.set(e.notes ?? '');
    this.archived.set(e.archived);
  }
}
