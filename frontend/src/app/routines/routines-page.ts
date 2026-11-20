import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { problemMessage } from '../exercises/exercise.service';
import { Routine, exerciseSummary } from './routine';
import { RoutineService } from './routine.service';

@Component({
  selector: 'app-routines-page',
  imports: [RouterLink],
  template: `
    <header class="head">
      <h1>Routines</h1>
      <a class="add" routerLink="/routines/new">New</a>
    </header>

    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }

    @if (routines(); as list) {
      @for (r of list; track r.id) {
        <section class="card routine" [attr.aria-label]="r.name">
          <a class="top" [routerLink]="['/routines', r.id]">
            <div class="what">
              <span class="name">{{ r.name }}</span>
              <span class="sub">{{ summary(r) }}</span>
            </div>
            <span class="sub meta">~{{ r.estimatedMinutes }} min</span>
          </a>
          <button
            type="button"
            class="btn-primary"
            [disabled]="busy() || r.exercises.length === 0"
            (click)="start(r)"
          >
            Start workout
          </button>
        </section>
      } @empty {
        <section class="card empty">
          <p>Save the workouts you repeat, like "Push A" or "Legs", and start them with one tap.</p>
          <a class="btn-primary" routerLink="/routines/new">Create a routine</a>
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
    .routine {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--ink);
      text-decoration: none;
    }
    .what {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .name {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .sub {
      font-size: 14px;
      color: var(--sub);
    }
    .meta {
      flex: none;
      font-size: 13px;
      padding-top: 4px;
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
export class RoutinesPage {
  private readonly api = inject(RoutineService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly routines = toSignal(
    this.api.list().pipe(
      catchError(() => {
        this.error.set("Couldn't load routines. Is the server running?");
        return of([] as Routine[]);
      }),
    ),
  );

  protected summary(r: Routine): string {
    return exerciseSummary(r);
  }

  protected start(r: Routine): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.start(r.id).subscribe({
      next: () => this.router.navigate(['/workout']),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(problemMessage(err));
      },
    });
  }
}
