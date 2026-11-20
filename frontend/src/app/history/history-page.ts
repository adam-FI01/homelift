import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ExerciseService } from '../exercises/exercise.service';
import { formatDuration } from '../workout/workout';
import { shortDate } from './history';
import { HistoryService } from './history.service';

/** Recent workouts, and every exercise you have trained with a link to its progress. */
@Component({
  selector: 'app-history-page',
  imports: [RouterLink, DecimalPipe],
  template: `
    <header class="head">
      <h1>History</h1>
      <div class="pills">
        <a class="pill" routerLink="/exercises">Exercises</a>
        <a class="pill" routerLink="/stats">Stats</a>
      </div>
    </header>

    @if (data(); as d) {
      @if (d.workouts.length === 0) {
        <section class="card empty">
          <p>Finished workouts show up here.</p>
          <a class="btn-primary" routerLink="/workout">Start a workout</a>
        </section>
      } @else {
        <section aria-label="Exercises you have trained" class="block">
          <span class="title">Exercises</span>
          <div class="card list">
            @for (e of trained(); track e.id) {
              <a class="row" [routerLink]="['/exercises', e.id]">
                <span class="name">{{ e.name }}</span>
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            }
          </div>
        </section>

        <section aria-label="Recent workouts" class="block">
          <span class="title">Workouts</span>
          <div class="card list">
            @for (w of d.workouts; track w.id) {
              <div class="row">
                <div class="what">
                  <span class="name">{{ w.name ?? 'Workout' }} · {{ shortDate(w.startedAt) }}</span>
                  <span class="sub">{{ w.exercises.join(', ') || 'No sets logged' }}</span>
                </div>
                <div class="nums">
                  <span>{{ w.volumeKg | number: '1.0-0' }} kg</span>
                  <span class="sub">{{ duration(w.startedAt, w.finishedAt) }}</span>
                </div>
              </div>
            }
          </div>
        </section>
      }
    } @else {
      <p class="sub">Loading…</p>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 4px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .pills { display: flex; gap: 8px; }
    .pill {
      height: 36px;
      padding: 0 14px;
      border-radius: 18px;
      background: var(--soft);
      color: var(--ink);
      text-decoration: none;
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
    }
    .block {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .title {
      font-size: 14px;
      font-weight: 500;
    }
    .list {
      padding: 0 16px;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 56px;
      gap: 12px;
      color: var(--ink);
      text-decoration: none;
    }
    .row + .row {
      border-top: 1px solid var(--line);
    }
    a.row svg {
      color: var(--sub);
      flex: none;
    }
    .what {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .what .sub {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .name {
      font-size: 15px;
      font-weight: 500;
    }
    .nums {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      font-size: 14px;
      flex: none;
    }
    .sub {
      font-size: 13px;
      color: var(--sub);
    }
    .empty {
      display: flex;
      flex-direction: column;
      gap: 14px;
      text-align: center;
    }
    .empty p {
      margin: 0;
      color: var(--sub);
    }
  `,
})
export class HistoryPage {
  protected readonly shortDate = shortDate;

  protected readonly data = toSignal(
    forkJoin({
      workouts: inject(HistoryService).recentWorkouts(100),
      exercises: inject(ExerciseService).list(),
    }).pipe(catchError(() => of({ workouts: [], exercises: [] }))),
  );

  /** Library exercises that appear in at least one finished workout, by name. */
  protected readonly trained = computed(() => {
    const d = this.data();
    if (!d) return [];
    const names = new Set(d.workouts.flatMap((w) => w.exercises));
    return d.exercises.filter((e) => names.has(e.name));
  });

  protected duration(start: string, end: string | null): string {
    return end ? formatDuration((Date.parse(end) - Date.parse(start)) / 1000) : '';
  }
}
