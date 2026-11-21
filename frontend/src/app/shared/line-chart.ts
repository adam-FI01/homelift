import { DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';

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

/**
 * A small, dependency-free SVG line chart in the HomeLift style: dashed grid, one green line.
 * Hover, tap or drag across it to read any point; it is also a focusable control where the arrow
 * keys move between points and Home and End jump to the ends.
 */
@Component({
  selector: 'app-line-chart',
  imports: [DecimalPipe],
  template: `
    <div
      class="frame"
      tabindex="0"
      role="group"
      [attr.aria-label]="label() + '. Use the arrow keys to read each point.'"
      (pointerdown)="pointer($event)"
      (pointermove)="pointer($event)"
      (pointerleave)="leave($event)"
      (keydown)="key($event)"
      (blur)="active.set(null)"
    >
      <svg
        aria-hidden="true"
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
          @if (selected(); as s) {
            <path class="guide" [attr.d]="'M' + s.cx + ' ' + padTop + 'V' + (height - padBottom)" />
          }
        }
        <g class="axis">
          @for (g of chart().grid; track g.y) {
            <text [attr.x]="width" [attr.y]="g.y + 4" text-anchor="end">{{ g.label }}</text>
          }
        </g>
      </svg>
      @if (chart().path) {
        @if (selected(); as s) {
          <span class="dot on" [style.left.%]="s.left" [style.top.%]="s.top"></span>
          <div class="tip" [class.flip]="s.left > 60" [style.left.%]="s.left" role="status">
            <strong>{{ s.point.y | number: '1.0-1' }}{{ unit() ? ' ' + unit() : '' }}</strong>
            <span>{{ date(s.point.x) }}</span>
          </div>
        } @else {
          <span
            class="dot"
            [style.left.%]="chart().coords.at(-1)!.left"
            [style.top.%]="chart().coords.at(-1)!.top"
          ></span>
        }
      }
    </div>
  `,
  styles: `
    /* Room above the plot for the reading, so it never covers the text above. */
    :host {
      display: block;
      padding-top: 40px;
    }
    .frame {
      position: relative;
      touch-action: pan-y;
      border-radius: 8px;
      cursor: crosshair;
    }
    .frame:focus-visible {
      outline: 2px solid var(--ink);
      outline-offset: 4px;
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
    .guide {
      stroke: var(--sub);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }
    .axis text {
      fill: var(--sub);
      font-size: 11px;
    }
    .dot {
      position: absolute;
      width: 10px;
      height: 10px;
      margin: -5px 0 0 -5px;
      border-radius: 50%;
      background: var(--pos);
      box-shadow: 0 0 0 2px var(--bg);
      pointer-events: none;
    }
    .dot.on {
      width: 14px;
      height: 14px;
      margin: -7px 0 0 -7px;
    }
    .tip {
      position: absolute;
      top: -8px;
      transform: translate(-50%, -100%);
      pointer-events: none;
      white-space: nowrap;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      padding: 6px 10px;
      border-radius: 10px;
      background: var(--btn);
      color: var(--on-btn);
      font-size: 12px;
      box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
    }
    .tip strong {
      font-size: 15px;
      font-weight: 600;
    }
    .tip span {
      opacity: 0.75;
    }
  `,
})
export class LineChart {
  readonly points = input.required<ChartPoint[]>();
  readonly label = input.required<string>();
  /** Shown after the value in the tooltip, such as "kg". */
  readonly unit = input('');

  protected readonly width = W;
  protected readonly height = H;
  protected readonly padRight = PAD_RIGHT;
  protected readonly padTop = PAD_TOP;
  protected readonly padBottom = PAD_BOTTOM;

  /** Index of the point being read, or null. */
  protected readonly active = signal<number | null>(null);

  protected readonly chart = computed(() => {
    const pts = [...this.points()].sort((a, b) => a.x - b.x);
    if (pts.length === 0) return { pts, path: '', coords: [], grid: [] };

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

    const coords = pts.map((p) => {
      const cx = round(sx(p.x));
      const cy = round(sy(p.y));
      return { cx, cy, left: (cx / W) * 100, top: (cy / H) * 100 };
    });
    const path = coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx} ${c.cy}`).join('');
    const grid = [hi, (hi + lo) / 2, lo].map((v) => ({
      y: round(sy(v)),
      label: String(Math.round(v)),
    }));
    return { pts, path, coords, grid };
  });

  protected readonly selected = computed(() => {
    const i = this.active();
    const c = this.chart();
    if (i === null || !c.coords[i]) return null;
    return { ...c.coords[i], point: c.pts[i] };
  });

  protected pointer(event: PointerEvent): void {
    const coords = this.chart().coords;
    if (coords.length === 0) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = ((event.clientX - box.left) / (box.width || 1)) * 100;
    let best = 0;
    coords.forEach((c, i) => {
      if (Math.abs(c.left - pct) < Math.abs(coords[best].left - pct)) best = i;
    });
    this.active.set(best);
  }

  /** Touch keeps the reading after lifting the finger; a mouse clears it on leaving. */
  protected leave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.active.set(null);
  }

  protected key(event: KeyboardEvent): void {
    const last = this.chart().coords.length - 1;
    if (last < 0) return;
    const i = this.active();
    const next = {
      ArrowRight: i === null ? last : Math.min(i + 1, last),
      ArrowLeft: i === null ? last : Math.max(i - 1, 0),
      Home: 0,
      End: last,
      Escape: null,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.active.set(next);
  }

  protected date(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
