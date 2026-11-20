import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { MUSCLE_GROUPS, MuscleGroup, label } from './exercise';
import { ExerciseService } from './exercise.service';

type Filter = MuscleGroup | 'ALL';

@Component({
  selector: 'app-exercise-list',
  imports: [RouterLink],
  template: `
    <header class="head">
      <h1>Exercises</h1>
      <a class="add" routerLink="/exercises/new">Add</a>
    </header>

    <input
      class="search"
      type="search"
      placeholder="Search exercises"
      aria-label="Search exercises"
      autocomplete="off"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
    />

    <nav class="chips" aria-label="Muscle group">
      @for (f of filters; track f) {
        <button
          type="button"
          class="chip"
          [class.on]="filter() === f"
          [attr.aria-pressed]="filter() === f"
          (click)="filter.set(f)"
        >
          {{ f === 'ALL' ? 'All' : label(f) }}
        </button>
      }
    </nav>

    @switch (state().status) {
      @case ('loading') {
        <p class="sub">Loading…</p>
      }
      @case ('error') {
        <p class="card sub">Couldn't load exercises. Is the server running?</p>
      }
      @default {
        @for (group of groups(); track group.name) {
          <section class="card list" [attr.aria-label]="group.name">
            <h2>{{ group.name }}</h2>
            @for (e of group.items; track e.id) {
              <a class="row" [routerLink]="['/exercises', e.id]">
                <span class="name">{{ e.name }}</span>
                <span class="sub">{{ label(e.equipment) }}</span>
              </a>
            }
          </section>
        } @empty {
          <p class="sub empty">No exercises match.</p>
        }
        @if (archivedCount() > 0) {
          <button type="button" class="link" (click)="showArchived.set(!showArchived())">
            {{ showArchived() ? 'Hide archived' : 'Show archived (' + archivedCount() + ')' }}
          </button>
        }
      }
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding-top: 4px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .add {
      font-weight: 600;
      color: var(--ink);
      text-decoration: none;
      padding: 8px 0 8px 16px;
    }
    .search {
      height: var(--tap);
      width: 100%;
      padding: 0 14px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--ink);
      font: inherit;
    }
    .chips {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      margin: 0 -20px;
      padding: 0 20px;
      scrollbar-width: none;
    }
    .chip {
      flex: none;
      height: 34px;
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
    .list {
      padding: 6px 0;
    }
    h2 {
      margin: 0;
      padding: 10px 18px 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--sub);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: var(--tap);
      padding: 10px 18px;
      color: var(--ink);
      text-decoration: none;
    }
    .row + .row {
      border-top: 1px solid var(--line);
    }
    .name {
      font-weight: 500;
    }
    .sub {
      color: var(--sub);
      font-size: 14px;
    }
    .empty {
      text-align: center;
      padding: 24px 0;
      margin: 0;
    }
    .link {
      background: none;
      border: 0;
      color: var(--sub);
      font-size: 14px;
      padding: 8px;
      align-self: center;
    }
  `,
})
export class ExerciseList {
  private readonly api = inject(ExerciseService);

  protected readonly label = label;
  protected readonly filters: Filter[] = ['ALL', ...MUSCLE_GROUPS];
  protected readonly query = signal('');
  protected readonly filter = signal<Filter>('ALL');
  protected readonly showArchived = signal(false);

  protected readonly state = toSignal(
    this.api.list().pipe(
      map((items) => ({ status: 'ready' as const, items })),
      catchError(() => of({ status: 'error' as const, items: [] })),
      startWith({ status: 'loading' as const, items: [] }),
    ),
    { requireSync: true },
  );

  protected readonly archivedCount = computed(
    () => this.state().items.filter((e) => e.archived).length,
  );

  protected readonly groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    const visible = this.state().items.filter(
      (e) =>
        (this.showArchived() || !e.archived) &&
        (f === 'ALL' || e.muscleGroup === f) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
    return MUSCLE_GROUPS.map((g) => ({
      name: label(g),
      items: visible.filter((e) => e.muscleGroup === g),
    })).filter((g) => g.items.length > 0);
  });
}
