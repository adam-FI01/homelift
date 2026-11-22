import { Component, inject } from '@angular/core';
import { UpdateService } from './update.service';

/** A calm banner at the top: a new version is ready, or the cached app needs a reload. */
@Component({
  selector: 'app-update-banner',
  template: `
    @if (update.broken()) {
      <div class="banner" role="status">
        <span>HomeLift needs to reload to keep working.</span>
        <button type="button" (click)="update.reload()">Reload</button>
      </div>
    } @else if (update.ready()) {
      <div class="banner" role="status">
        <span>A new version is ready</span>
        <button type="button" (click)="update.reload()">Reload</button>
        <button type="button" class="x" aria-label="Not now" (click)="update.ready.set(false)">
          ×
        </button>
      </div>
    }
  `,
  styles: `
    .banner {
      position: fixed;
      z-index: 19;
      top: calc(env(safe-area-inset-top) + 12px);
      left: 12px;
      right: 12px;
      max-width: 38rem;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 10px 10px 16px;
      border-radius: 14px;
      background: var(--btn);
      color: var(--on-btn);
      box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
      font-size: 14px;
    }
    span {
      flex: 1;
    }
    button {
      flex: none;
      height: 32px;
      padding: 0 12px;
      border: 0;
      border-radius: 16px;
      background: var(--on-btn);
      color: var(--btn);
      font-weight: 600;
    }
    .x {
      width: 32px;
      padding: 0;
      background: none;
      color: inherit;
      font-size: 20px;
    }
  `,
})
export class UpdateBanner {
  protected readonly update = inject(UpdateService);
}
