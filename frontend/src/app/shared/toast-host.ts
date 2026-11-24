import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Shows the latest toast. The live region is always in the page so screen readers announce it. */
@Component({
  selector: 'app-toast-host',
  template: `
    <div class="region" role="status" aria-live="polite">
      @if (toasts.current(); as t) {
        <div class="toast" [attr.data-toast]="t.id">
          <span>{{ t.message }}</span>
          <button type="button" aria-label="Dismiss message" (click)="toasts.dismiss()">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .region {
      position: fixed;
      z-index: 30;
      top: calc(env(safe-area-inset-top) + 12px);
      left: 12px;
      right: 12px;
      max-width: 38rem;
      margin: 0 auto;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 8px 12px 16px;
      border-radius: 14px;
      background: var(--btn);
      color: var(--on-btn);
      font-size: 16px;
      font-weight: 500;
      box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
      animation: drop 0.2s ease-out;
    }
    button {
      flex: none;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 18px;
      background: none;
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
      }
    }
    @keyframes drop {
      from {
        transform: translateY(-8px);
        opacity: 0;
      }
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
}
