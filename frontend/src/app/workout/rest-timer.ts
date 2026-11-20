import { Component, computed, inject } from '@angular/core';
import { formatDuration } from './workout';
import { RestTimer } from './rest-timer.service';

/** The full rest timer on the workout page. */
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
          <button
            type="button"
            class="icon"
            [attr.aria-pressed]="timer.soundOn()"
            [attr.aria-label]="timer.soundOn() ? 'Sound on' : 'Sound off'"
            (click)="timer.toggleSound()"
          >
            @if (timer.soundOn()) {
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linejoin="round"
              >
                <path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" />
              </svg>
            } @else {
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linejoin="round"
              >
                <path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" />
              </svg>
            }
          </button>
        </div>
        <div class="bar" aria-hidden="true"><div [style.width.%]="percent()"></div></div>
        <div class="actions">
          <button type="button" aria-label="15 seconds less" (click)="timer.adjust(-15)">
            −15s
          </button>
          <button type="button" aria-label="15 seconds more" (click)="timer.adjust(15)">
            +15s
          </button>
          <button type="button" class="skip" (click)="timer.skip()">Skip</button>
        </div>
      </section>
    } @else if (timer.justFinished()) {
      <section class="card done" role="status">
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
        Rest over. Time for the next set.
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
      font-size: 34px;
      font-weight: 500;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .icon {
      width: 40px;
      height: 40px;
      border-radius: 20px;
      border: 0;
      background: var(--soft);
      color: var(--ink);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon[aria-pressed='false'] {
      color: var(--sub);
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
    .actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .actions button {
      height: 44px;
      border-radius: 22px;
      border: 0;
      background: var(--soft);
      color: var(--ink);
      font-size: 14px;
      font-weight: 500;
    }
    .actions .skip {
      background: var(--btn);
      color: var(--on-btn);
      font-weight: 600;
    }
    .done {
      flex-direction: row;
      align-items: center;
      gap: 10px;
      color: var(--pos);
      font-weight: 600;
    }
  `,
})
export class RestTimerCard {
  protected readonly timer = inject(RestTimer);
  protected readonly format = formatDuration;
  protected readonly percent = computed(() => Math.round(this.timer.fraction() * 100));
}
