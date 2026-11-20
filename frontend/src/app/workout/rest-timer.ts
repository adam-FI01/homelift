import { Component, computed, inject } from '@angular/core';
import { formatDuration } from './workout';
import { RestTimer } from './rest-timer.service';

@Component({
  selector: 'app-rest-timer',
  template: `
    @if (timer.remaining(); as left) {
      <section class="card" aria-label="Rest timer">
        <div class="top">
          <div class="time">
            <span class="label">Rest</span>
            <span class="clock" role="timer">{{ format(left) }}</span>
          </div>
          <button type="button" aria-label="Add 30 seconds" (click)="timer.add(30)">+30s</button>
          <button type="button" (click)="timer.skip()">Skip</button>
        </div>
        <div class="bar" aria-hidden="true"><div [style.width.%]="percent()"></div></div>
      </section>
    }
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px 16px;
    }
    .top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .time {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .label {
      font-size: 12px;
      color: var(--sub);
    }
    .clock {
      font-size: 28px;
      font-weight: 500;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    button {
      height: 40px;
      padding: 0 16px;
      border-radius: 20px;
      border: 0;
      background: var(--soft);
      color: var(--ink);
      font-size: 14px;
      font-weight: 500;
    }
    .bar {
      height: 4px;
      border-radius: 2px;
      background: var(--soft);
      overflow: hidden;
    }
    .bar div {
      height: 4px;
      background: var(--pos);
      transition: width 0.25s linear;
    }
  `,
})
export class RestTimerCard {
  protected readonly timer = inject(RestTimer);
  protected readonly format = formatDuration;
  protected readonly percent = computed(() => Math.round(this.timer.fraction() * 100));
}
