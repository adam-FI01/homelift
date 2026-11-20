import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { StatusService } from '../core/status.service';

@Component({
  selector: 'app-home',
  template: `
    <section class="hero">
      <span class="sub">Welcome</span>
      <h1>Ready to train</h1>
      <span class="sub">Workout logging is coming next.</span>
    </section>

    <section class="card" aria-label="Server" aria-live="polite">
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
        <p class="row sub">Checking server…</p>
      }
    </section>
  `,
  styles: `
    :host { display: contents; }
    .hero { display: flex; flex-direction: column; gap: 4px; padding: 4px 0 8px; }
    h1 { margin: 0; font-size: 34px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.15; }
    .sub { font-size: 14px; color: var(--sub); }
    .row { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 500; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .on { background: var(--pos); } .off { background: var(--neg); }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 14px 0 0; font-size: 14px; }
    dt { color: var(--sub); } dd { margin: 0; text-align: right; }
  `,
})
export class Home {
  private readonly api = inject(StatusService);
  protected readonly status = toSignal(
    this.api.get().pipe(catchError(() => of('offline' as const))),
  );
}
