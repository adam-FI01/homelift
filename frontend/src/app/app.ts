import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ConfirmHost } from './shared/confirm-host';
import { RestTimerMini } from './workout/rest-timer-mini';

/** The app shell: the page on top and a tab bar at the bottom, as in the mockups. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RestTimerMini, ConfirmHost],
  template: `
    <main class="content">
      <router-outlet />
    </main>
    @if (!onWorkout()) {
      <app-rest-timer-mini class="mini" />
    }
    <app-confirm-host />
    <nav class="tabs" aria-label="Main">
      <a
        routerLink="/"
        routerLinkActive="on"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linejoin="round"
        >
          <path d="M4 10l8-6 8 6v10h-5v-6H9v6H4z" />
        </svg>
        Home
      </a>
      <a routerLink="/workout" routerLinkActive="on" ariaCurrentWhenActive="page">
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
        Today
      </a>
      <a routerLink="/history" routerLinkActive="on" ariaCurrentWhenActive="page">
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linejoin="round"
        >
          <path d="M4 17l5-5 4 3 7-8" />
        </svg>
        History
      </a>
      <a routerLink="/routines" routerLinkActive="on" ariaCurrentWhenActive="page">
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
        Routines
      </a>
    </nav>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    .content {
      flex: 1;
      width: 100%;
      max-width: 40rem;
      margin: 0 auto;
      padding: calc(env(safe-area-inset-top) + 16px) 20px calc(env(safe-area-inset-bottom) + 140px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .mini {
      position: fixed;
      left: 12px;
      right: 12px;
      z-index: 11;
      max-width: 38rem;
      margin: 0 auto;
      bottom: calc(env(safe-area-inset-bottom) + 72px);
    }
    .tabs {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      height: calc(env(safe-area-inset-bottom) + 64px);
      padding-bottom: env(safe-area-inset-bottom);
      border-top: 1px solid var(--line);
      background: var(--surface);
    }
    a {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--sub);
      text-decoration: none;
      font-size: 11px;
      font-weight: 500;
    }
    a.on {
      color: var(--ink);
      font-weight: 600;
    }
  `,
})
export class App {
  private readonly router = inject(Router);

  /** The workout page shows the full timer, so the mini one hides there. */
  protected readonly onWorkout = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects.startsWith('/workout')),
    ),
    { initialValue: false },
  );
}
