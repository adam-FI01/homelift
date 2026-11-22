import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { Exercise, label } from '../exercises/exercise';
import { ExerciseService } from '../exercises/exercise.service';

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
      <ul [attr.aria-multiselectable]="multiple() || null">
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

  protected readonly label = label;
  protected readonly query = signal('');
  protected readonly chosen = signal<Exercise[]>([]);
  protected readonly exercises = toSignal(
    inject(ExerciseService)
      .list()
      .pipe(
        map((all) => all.filter((e) => !e.archived)),
        catchError(() => of([] as Exercise[])),
      ),
  );
  protected readonly matches = computed(() => {
    const q = this.query().trim().toLowerCase();
    return (this.exercises() ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
  });

  protected isChosen(e: Exercise): boolean {
    return this.chosen().some((c) => c.id === e.id);
  }

  protected toggle(e: Exercise): void {
    this.chosen.update((list) =>
      this.isChosen(e) ? list.filter((c) => c.id !== e.id) : [...list, e],
    );
  }
}
