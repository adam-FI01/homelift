import { Component, computed, input } from '@angular/core';

export interface ChartPoint {
  /** Time in milliseconds. */
  x: number;
  y: number;
}

const W = 350;
const H = 160;
const PAD_TOP = 12;
const PAD_BOTTOM = 20;
const PAD_RIGHT = 36;

/** A small, dependency-free SVG line chart in the HomeLift style: dashed grid, one green line. */
@Component({
  selector: 'app-line-chart',
  template: `
    <svg
      role="img"
      [attr.aria-label]="label()"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="none"
    >
      <g class="grid">
        @for (g of chart().grid; track g.y) {
          <path [attr.d]="'M0 ' + g.y + 'H' + (width - padRight)" />
        }
      </g>
      @if (chart().path) {
        <path class="line" [attr.d]="chart().path" />
        <circle class="dot" [attr.cx]="chart().last.x" [attr.cy]="chart().last.y" r="5" />
      }
      <g class="axis">
        @for (g of chart().grid; track g.y) {
          <text [attr.x]="width" [attr.y]="g.y + 4" text-anchor="end">{{ g.label }}</text>
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 160px;
      overflow: visible;
    }
    .grid path {
      stroke: var(--line);
      stroke-width: 1;
      stroke-dasharray: 3 4;
      vector-effect: non-scaling-stroke;
    }
    .line {
      fill: none;
      stroke: var(--pos);
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }
    .dot {
      fill: var(--pos);
      stroke: var(--bg);
      stroke-width: 2;
    }
    .axis text {
      fill: var(--sub);
      font-size: 11px;
    }
  `,
})
export class LineChart {
  readonly points = input.required<ChartPoint[]>();
  readonly label = input.required<string>();

  protected readonly width = W;
  protected readonly height = H;
  protected readonly padRight = PAD_RIGHT;

  protected readonly chart = computed(() => {
    const pts = [...this.points()].sort((a, b) => a.x - b.x);
    if (pts.length === 0) return { path: '', last: { x: 0, y: 0 }, grid: [] };

    const ys = pts.map((p) => p.y);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (hi - lo < 1) {
      lo -= 1;
      hi += 1;
    }
    const xs = pts.map((p) => p.x);
    const x0 = Math.min(...xs);
    const span = Math.max(...xs) - x0 || 1;
    const plotW = W - PAD_RIGHT - 8;
    const plotH = H - PAD_TOP - PAD_BOTTOM;
    const sx = (x: number) => (pts.length === 1 ? plotW / 2 : 4 + ((x - x0) / span) * plotW);
    const sy = (y: number) => PAD_TOP + (1 - (y - lo) / (hi - lo)) * plotH;

    const coords = pts.map((p) => ({ x: round(sx(p.x)), y: round(sy(p.y)) }));
    const path = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x} ${c.y}`).join('');
    const grid = [hi, (hi + lo) / 2, lo].map((v) => ({
      y: round(sy(v)),
      label: String(Math.round(v)),
    }));
    return { path, last: coords.at(-1)!, grid };
  });
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
