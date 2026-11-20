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
      display: flex; align-items: center;
      height: calc(env(safe-area-inset-top) + 64px);
      padding: env(safe-area-inset-top) 20px 0;
      max-width: 40rem; width: 100%; margin: 0 auto;
    }
    .brand { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
    .content {
      flex: 1; width: 100%; max-width: 40rem; margin: 0 auto;
      padding: 4px 20px calc(env(safe-area-inset-bottom) + 24px);
      display: flex; flex-direction: column; gap: 16px;
    }
  `,
})
export class App {}
