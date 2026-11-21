import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatDuration } from './workout';
import { RestTimer } from './rest-timer.service';

/** A slim bar above the tabs so rest keeps counting down wherever you are in the app. */
@Component({
  selector: 'app-rest-timer-mini',
  imports: [RouterLink],
  template: `
    @if (timer.remaining(); as left) {
      <div class="mini" role="timer" aria-label="Rest timer">
        <a routerLink="/workout" class="time"
          >Rest <strong>{{ format(left) }}</strong></a
        >
        <button type="button" aria-label="15 seconds more" (click)="timer.adjust(15)">+15s</button>
        <button type="button" (click)="timer.skip()">Skip</button>
        <span class="bar" aria-hidden="true" [style.width.%]="timer.fraction() * 100"></span>
      </div>
    } @else if (timer.justFinished()) {
      <a routerLink="/workout" class="mini over" role="status">Rest over · next set</a>
    }
  `,
  styles: `
    .mini {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 8px;
      height: 48px;
      padding: 0 8px 0 16px;
      border-radius: 24px;
      background: var(--btn);
      color: var(--on-btn);
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.15);
    }
    .time {
      flex: 1;
      color: inherit;
      text-decoration: none;
      font-size: 15px;
    }
    strong {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      margin-left: 4px;
    }
    button {
      height: 34px;
      padding: 0 12px;
      border-radius: 17px;
      border: 0;
      background: color-mix(in srgb, currentColor 16%, transparent);
      color: inherit;
      font-size: 13px;
      font-weight: 500;
    }
    .bar {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 3px;
      background: var(--pos);
      transition: width 0.25s linear;
    }
    .over {
      justify-content: center;
      text-decoration: none;
      font-weight: 600;
      background: var(--pos);
      color: #fff;
    }
  `,
})
export class RestTimerMini {
  protected readonly timer = inject(RestTimer);
  protected readonly format = formatDuration;
}
