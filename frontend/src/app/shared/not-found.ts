import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="nf">
      <h1>Page not found</h1>
      <p>That address doesn't exist in HomeLift.</p>
      <a class="btn-primary" routerLink="/">Back to Home</a>
    </section>
  `,
  styles: `
    :host {
      display: contents;
    }
    .nf {
      margin-top: 12vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    p {
      margin: 0 0 16px;
      color: var(--sub);
    }
    .btn-primary {
      max-width: 16rem;
    }
  `,
})
export class NotFound {}
