import {
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  AfterViewInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { SettingsService } from '../settings/settings.service';
import { AuthService } from './auth.service';

/** The lock screen: one PIN field. */
@Component({
  selector: 'app-unlock-page',
  template: `
    <form class="lock" (submit)="submit($event)">
      <svg
        aria-hidden="true"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
      <h1>HomeLift is locked</h1>
      <label class="sr" for="pin">PIN</label>
      <input
        #field
        id="pin"
        type="password"
        inputmode="numeric"
        autocomplete="current-password"
        maxlength="12"
        placeholder="Enter PIN"
        [value]="pin()"
        (input)="pin.set($any($event.target).value)"
      />
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      <button class="btn-primary" type="submit" [disabled]="busy() || pin().length < 4">
        Unlock
      </button>
    </form>
  `,
  styles: `
    :host {
      display: contents;
    }
    .lock {
      margin: 12vh auto 0;
      width: 100%;
      max-width: 20rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      text-align: center;
    }
    svg {
      color: var(--sub);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    input {
      width: 100%;
      height: 56px;
      padding: 0 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--ink);
      font: inherit;
      font-size: 24px;
      letter-spacing: 0.3em;
      text-align: center;
    }
    .error {
      margin: 0;
      color: var(--neg);
      font-size: 14px;
    }
    .btn-primary:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class UnlockPage implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService);

  /** Where to go once unlocked, from the ?next= query parameter. */
  readonly next = input<string>('/');

  protected readonly pin = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  ngAfterViewInit(): void {
    this.field().nativeElement.focus();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.busy.set(true);
    this.error.set(null);
    this.auth.unlock(this.pin()).subscribe({
      next: () => {
        this.settings.load();
        const next = this.next();
        this.router.navigateByUrl(
          next && next.startsWith('/') && !next.startsWith('//') ? next : '/',
        );
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.pin.set('');
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        this.error.set(
          status === 429
            ? 'Too many tries. Wait 30 seconds.'
            : status === 0
              ? 'Server unreachable.'
              : 'Wrong PIN.',
        );
      },
    });
  }
}
