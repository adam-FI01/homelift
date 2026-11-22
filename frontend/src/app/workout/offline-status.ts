import { Component, inject } from '@angular/core';
import { OfflineQueue } from './offline-queue.service';

/** Says what is saved on this phone and waiting to be sent, with a way to try again now. */
@Component({
  selector: 'app-offline-status',
  template: `
    @if (queue.count() > 0) {
      <p class="offline" role="status">
        <span>
          Offline · {{ queue.summary() }} saved on this phone, sending when you're back online
        </span>
        <button type="button" (click)="queue.flush()">Send now</button>
      </p>
    }
  `,
  styles: `
    .offline {
      margin: 0;
      padding: 8px 8px 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 10px;
      background: var(--soft);
      color: var(--sub);
      font-size: 13px;
    }
    span {
      flex: 1;
    }
    button {
      flex: none;
      height: 28px;
      padding: 0 12px;
      border: 0;
      border-radius: 14px;
      background: var(--btn);
      color: var(--on-btn);
      font-size: 13px;
      font-weight: 600;
    }
  `,
})
export class OfflineStatus {
  protected readonly queue = inject(OfflineQueue);
}
