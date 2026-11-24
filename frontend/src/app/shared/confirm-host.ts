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
            [class]="p.danger ? 'btn-danger' : 'btn-primary'"
            (click)="confirm.answer(true)"
          >
            {{ p.confirmLabel }}
          </button>
          <button type="button" class="btn-secondary" (click)="confirm.answer(false)">
            {{ p.cancelLabel ?? 'Cancel' }}
          </button>
        </div>
      </app-sheet>
    }
  `,
  styles: `
    .message {
      margin: 0;
      color: var(--ink);
      font-size: 16px;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `,
})
export class ConfirmHost {
  protected readonly confirm = inject(ConfirmService);
}
