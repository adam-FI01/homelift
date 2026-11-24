import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

/**
 * A modal built on the native <dialog>: a bottom sheet on phones, a centred card on wider
 * screens. The browser handles focus trapping and Escape; tapping the backdrop closes it too.
 */
@Component({
  selector: 'app-sheet',
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      (close)="closed.emit()"
      (click)="backdrop($event)"
    >
      <div class="panel">
        <span class="grabber" aria-hidden="true"></span>
        <header>
          <h2 [id]="titleId">{{ title() }}</h2>
          <button type="button" class="close" aria-label="Close" (click)="dialog.close()">
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <ng-content />
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: 100%;
      max-width: 40rem;
      max-height: 85dvh;
      margin: auto auto 0;
      padding: 0;
      border: 0;
      border-radius: 20px 20px 0 0;
      background: var(--surface);
      color: var(--ink);
      overscroll-behavior: contain;
      box-shadow: 0 -2px 24px rgb(0 0 0 / 0.2);
      animation: up 0.2s ease-out;
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.6);
      animation: fade 0.2s ease-out;
    }
    .panel {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 8px 20px calc(env(safe-area-inset-bottom) + 20px);
    }
    .grabber {
      align-self: center;
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: var(--line);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .close {
      flex: none;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      border: 0;
      background: var(--soft);
      color: var(--ink);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @media (min-width: 640px) {
      dialog {
        max-width: 28rem;
        margin: auto;
        border-radius: var(--radius-card);
        animation: pop 0.15s ease-out;
      }
      .grabber {
        display: none;
      }
      .panel {
        padding: 20px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      dialog,
      dialog::backdrop {
        animation: none;
      }
    }
    @keyframes up {
      from {
        transform: translateY(24px);
        opacity: 0.6;
      }
    }
    @keyframes pop {
      from {
        transform: scale(0.97);
        opacity: 0;
      }
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
  `,
})
export class Sheet {
  private static next = 0;

  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = `sheet-title-${Sheet.next++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const d = this.dialog().nativeElement;
      if (this.open() && !d.open) d.showModal?.();
      else if (!this.open() && d.open) d.close();
    });
  }

  /** Clicks on the dialog element itself (not its panel) land on the backdrop. */
  protected backdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.dialog().nativeElement.close();
  }
}
