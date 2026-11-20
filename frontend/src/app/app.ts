import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <header class="bar">
      <span class="brand">HomeLift</span>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100dvh; }
    .bar {
      position: sticky; top: 0;
      padding: calc(env(safe-area-inset-top) + 0.875rem) 1rem 0.875rem;
      background: var(--surface); border-bottom: 1px solid var(--line);
    }
    .brand { font-weight: 700; letter-spacing: -0.01em; font-size: 1.125rem; }
    .content { flex: 1; width: 100%; max-width: 40rem; margin: 0 auto; padding: 1.25rem 1rem; }
  `,
})
export class App {}
