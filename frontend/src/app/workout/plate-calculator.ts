import { Component, computed, inject, input } from '@angular/core';
import { PLATES, formatNumber, platesPerSide } from '../settings/settings';
import { SettingsService } from '../settings/settings.service';

/** Which plates to load on each side of the bar for a weight, drawn as a loaded bar. */
@Component({
  selector: 'app-plate-calculator',
  template: `
    <div class="bar" role="img" [attr.aria-label]="description()">
      <span class="sleeve"></span>
      @for (p of result().plates; track $index) {
        <span class="plate" [style.height.px]="height(p)">{{ fmt(p) }}</span>
      }
      <span class="shaft"></span>
    </div>
    <p class="per-side">
      @if (result().plates.length) {
        Each side: <strong>{{ platesText() }}</strong>
      } @else {
        Just the bar
      }
    </p>
    @if (result().remainder > 0) {
      <p class="sub">
        {{ fmt(result().remainder) }} {{ unit() }} can't be made with standard plates.
      </p>
    }
    <div class="bar-row">
      <span>Bar</span>
      <div class="pick">
        <button type="button" aria-label="Lighter bar" (click)="nudgeBar(-1)">−</button>
        <output>{{ fmt(settings.bar()) }} {{ unit() }}</output>
        <button type="button" aria-label="Heavier bar" (click)="nudgeBar(1)">+</button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .bar {
      display: flex;
      align-items: center;
      height: 120px;
      padding: 0 4px;
      overflow-x: auto;
    }
    .sleeve {
      width: 12px;
      height: 24px;
      border-radius: 3px;
      background: var(--sub);
      flex: none;
    }
    .shaft {
      flex: 1;
      min-width: 40px;
      height: 10px;
      background: var(--line);
      border-radius: 0 5px 5px 0;
    }
    .plate {
      flex: none;
      width: 26px;
      margin-right: 3px;
      border-radius: 5px;
      background: var(--ink);
      color: var(--on-btn);
      display: flex;
      align-items: center;
      justify-content: center;
      writing-mode: vertical-rl;
      font-size: 11px;
      font-weight: 600;
    }
    .per-side {
      margin: 0;
      font-size: 15px;
    }
    .sub {
      margin: 0;
      font-size: 13px;
      color: var(--sub);
    }
    .bar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 15px;
    }
    .pick {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border-radius: 999px;
      background: var(--soft);
    }
    .pick button {
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 18px;
      background: none;
      color: var(--ink);
      font-size: 18px;
    }
    .pick output {
      min-width: 64px;
      text-align: center;
      font-weight: 600;
    }
  `,
})
export class PlateCalculator {
  protected readonly settings = inject(SettingsService);

  /** The total on the bar, in the chosen unit. */
  readonly total = input.required<number>();

  protected readonly unit = this.settings.unitLabel;
  protected readonly result = computed(() =>
    platesPerSide(this.total(), this.settings.bar(), PLATES[this.settings.units()]),
  );
  protected readonly platesText = computed(() =>
    this.result()
      .plates.map((p) => this.fmt(p))
      .join(' · '),
  );
  protected readonly description = computed(() =>
    this.result().plates.length
      ? `Each side of the bar: ${this.platesText()} ${this.unit()}`
      : 'Just the bar, no plates',
  );

  protected fmt(n: number): string {
    return formatNumber(n, 2);
  }

  /** Taller for heavier plates, like the real thing. */
  protected height(plate: number): number {
    const max = PLATES[this.settings.units()][0];
    return 40 + (plate / max) * 70;
  }

  protected nudgeBar(direction: -1 | 1): void {
    const step = this.settings.units() === 'LB' ? 5 : 2.5;
    this.settings.setBar(Math.max(0, this.settings.bar() + step * direction));
  }
}
