import { Component, computed, input } from '@angular/core';

export interface Bar {
  label: string;
  value: number;
}

/** Simple vertical bars; the tallest one is drawn in the accent colour. */
@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="bars" role="img" [attr.aria-label]="label()">
      @for (b of scaled(); track $index) {
        <div class="col">
          <div class="bar" [class.top]="b.top" [style.height.%]="b.height"></div>
          @if (showLabels()) {
            <span>{{ b.label }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 120px;
    }
    .col {
      flex: 1;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
    }
    .bar {
      width: 100%;
      max-width: 28px;
      min-height: 3px;
      border-radius: 4px;
      background: var(--soft);
    }
    .bar.top {
      background: var(--pos);
    }
    span {
      font-size: 11px;
      color: var(--sub);
    }
  `,
})
export class BarChart {
  readonly bars = input.required<Bar[]>();
  readonly label = input.required<string>();

  protected readonly showLabels = computed(() => this.bars().length <= 12);
  protected readonly scaled = computed(() => {
    const bars = this.bars();
    const max = Math.max(...bars.map((b) => b.value), 0);
    return bars.map((b) => ({
      label: b.label,
      height: max ? Math.max((b.value / max) * 100, b.value ? 4 : 0) : 0,
      top: max > 0 && b.value === max,
    }));
  });
}
