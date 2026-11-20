import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { StatusService } from '../core/status.service';

@Component({
  selector: 'app-home',
  template: `
    <h1>Ready to train</h1>
    <p class="lead">Workout logging is coming next. This page confirms the app is wired up.</p>

    <section class="panel" aria-live="polite">
      @if (status(); as s) {
        @if (s === 'offline') {
          <p class="row"><span class="dot off"></span>Server unreachable</p>
        } @else {
          <p class="row"><span class="dot on"></span>Server online</p>
          <dl>
            <dt>Version</dt><dd>{{ s.version }}</dd>
            <dt>SQLite</dt><dd>{{ s.sqliteVersion }}</dd>
          </dl>
        }
      } @else {
        <p class="row muted">Checking server…</p>
      }
    </section>
  `,
  styles: `
    h1 { font-size: 1.75rem; line-height: 1.2; margin: 0.5rem 0; letter-spacing: -0.02em; }
    .lead { color: var(--muted); margin: 0 0 1.5rem; }
    .panel { border: 1px solid var(--line); border-radius: 12px; padding: 1rem; background: var(--surface); }
    .row { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-weight: 600; }
    .muted { color: var(--muted); font-weight: 400; }
    .dot { width: 0.625rem; height: 0.625rem; border-radius: 50%; }
    .on { background: var(--ok); } .off { background: var(--bad); }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 1rem; margin: 0.875rem 0 0; }
    dt { color: var(--muted); } dd { margin: 0; font-variant-numeric: tabular-nums; }
  `,
})
export class Home {
  private readonly api = inject(StatusService);
  protected readonly status = toSignal(
    this.api.get().pipe(catchError(() => of('offline' as const))),
  );
}
