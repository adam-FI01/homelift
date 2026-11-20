import { Component, input, model } from '@angular/core';

/** A number with large − and + buttons, sized for thumbs between sets. The value can also be typed. */
@Component({
  selector: 'app-stepper',
  template: `
    <span class="label" [id]="id()">{{ label() }}</span>
    <div class="row">
      <button
        type="button"
        [attr.aria-label]="decreaseLabel()"
        [disabled]="value() <= min()"
        (click)="nudge(-step())"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <input
        inputmode="decimal"
        [attr.aria-labelledby]="id()"
        [value]="display(value())"
        (change)="typed($any($event.target))"
        (focus)="$any($event.target).select()"
      />
      <button type="button" [attr.aria-label]="increaseLabel()" (click)="nudge(step())">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
    }
    .label {
      font-size: 12px;
      color: var(--sub);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    button {
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
    button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    input {
      width: 100%;
      min-width: 0;
      border: 0;
      background: none;
      color: var(--ink);
      text-align: center;
      font: inherit;
      font-size: 24px;
      font-weight: 500;
      letter-spacing: -0.02em;
    }
  `,
})
export class Stepper {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly value = model.required<number>();
  readonly step = input(1);
  readonly min = input(0);
  readonly decreaseLabel = input('Decrease');
  readonly increaseLabel = input('Increase');

  protected display(v: number): string {
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  }

  protected nudge(delta: number): void {
    // Round to the step so typed values like 81 snap back onto the 2.5 grid when nudged.
    const next = Math.round((this.value() + delta) / this.step()) * this.step();
    this.value.set(Math.max(this.min(), next));
  }

  protected typed(el: HTMLInputElement): void {
    const parsed = Number(el.value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= this.min()) this.value.set(parsed);
    el.value = this.display(this.value());
  }
}
