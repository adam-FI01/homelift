import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Downloads to keep your training data safe or use it elsewhere. */
@Component({
  selector: 'app-data-page',
  imports: [RouterLink],
  template: `
    <header class="head">
      <a routerLink="/" class="icon" aria-label="Back to home">
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </a>
      <h1>Your data</h1>
    </header>
    <p class="sub intro">Everything stays on your server. Download a copy whenever you like.</p>

    <section class="card list" aria-label="Downloads">
      @for (d of downloads; track d.href) {
        <a class="row" [href]="d.href" download>
          <div class="what">
            <span class="name">{{ d.title }}</span>
            <span class="sub">{{ d.detail }}</span>
          </div>
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
        </a>
      }
    </section>

    <section class="card restore" aria-label="Restoring a backup">
      <span class="name">Restoring a backup</span>
      <ol class="sub">
        <li>Stop the HomeLift container.</li>
        <li>
          Replace <code>homelift.db</code> in its data folder with the backup file, renamed to
          <code>homelift.db</code>.
        </li>
        <li>Start the container again.</li>
      </ol>
    </section>
  `,
  styles: `
    :host {
      display: contents;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: -10px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ink);
    }
    .sub {
      font-size: 14px;
      color: var(--sub);
    }
    .intro {
      margin: -8px 0 0;
    }
    .list {
      padding: 0 18px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 64px;
      color: var(--ink);
      text-decoration: none;
    }
    .row + .row {
      border-top: 1px solid var(--line);
    }
    .row svg {
      color: var(--sub);
      flex: none;
    }
    .what {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 0;
    }
    .name {
      font-size: 15px;
      font-weight: 500;
    }
    .restore {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    ol {
      margin: 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      line-height: 1.45;
    }
    code {
      font-size: 13px;
      background: var(--soft);
      padding: 1px 5px;
      border-radius: 4px;
    }
  `,
})
export class DataPage {
  protected readonly downloads = [
    {
      href: '/api/export/homelift.db',
      title: 'Full backup',
      detail: 'A copy of the database file. Restores everything.',
    },
    { href: '/api/export/sets.csv', title: 'Sets as CSV', detail: 'Every set, for spreadsheets.' },
    {
      href: '/api/export/backup.json',
      title: 'All data as JSON',
      detail: 'Exercises, routines and workouts, readable anywhere.',
    },
  ];
}
