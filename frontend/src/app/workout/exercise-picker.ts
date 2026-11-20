import { Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { Exercise, label } from '../exercises/exercise';
import { ExerciseService } from '../exercises/exercise.service';

/** A searchable list of active exercises; emits the one picked. Shown inside a sheet. */
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
            <button type="button" class="row" (click)="picked.emit(e)">
              <span>{{ e.name }}</span>
              <span class="sub">{{ label(e.muscleGroup) }}</span>
            </button>
          </li>
        } @empty {
          <li class="sub empty">{{ exercises() ? 'No exercises match.' : 'Loading…' }}</li>
        }
      </ul>
    </div>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
    }
    .close {
      background: none;
      border: 0;
      color: var(--sub);
      padding: 8px 0 8px 12px;
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
      margin: 0 -18px -8px;
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
      padding: 10px 18px;
      border: 0;
      background: none;
      color: var(--ink);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      text-align: left;
      font-weight: 500;
    }
    .sub {
      color: var(--sub);
      font-size: 14px;
      font-weight: 400;
    }
    .empty {
      padding: 16px 18px;
      text-align: center;
    }
  `,
})
export class ExercisePicker {
  readonly picked = output<Exercise>();

  protected readonly label = label;
  protected readonly query = signal('');
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
}
