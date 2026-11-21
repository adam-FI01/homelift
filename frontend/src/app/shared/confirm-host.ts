import { Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';
import { Sheet } from './sheet';

/** Renders the question from ConfirmService. Lives once, in the app shell. */
@Component({
  selector: 'app-confirm-host',
  imports: [Sheet],
  template: `
    @if (confirm.pending(); as p) {
      <app-sheet [open]="true" [title]="p.title" (closed)="confirm.answer(false)">
        @if (p.message) {
          <p class="message">{{ p.message }}</p>
        }
        <div class="actions">
          <button
            type="button"
            class="btn-primary"
            [class.danger]="p.danger"
            (click)="confirm.answer(true)"
          >
            {{ p.confirmLabel }}
          </button>
          <button type="button" class="secondary" (click)="confirm.answer(false)">
            {{ p.cancelLabel ?? 'Cancel' }}
          </button>
        </div>
      </app-sheet>
    }
  `,
  styles: `
    .message {
      margin: 0;
      color: var(--sub);
      font-size: 15px;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .danger {
      background: var(--neg);
      color: #fff;
    }
    .secondary {
      height: 48px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--ink);
      font-weight: 500;
    }
  `,
})
export class ConfirmHost {
  protected readonly confirm = inject(ConfirmService);
}
