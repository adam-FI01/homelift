import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

export interface AuthState {
  enabled: boolean;
  unlocked: boolean;
  managedByEnvironment: boolean;
}

/** The optional PIN lock. The session lives in an HttpOnly cookie the browser sends itself. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly state = signal<AuthState | null>(null);

  refresh() {
    return this.http.get<AuthState>('/api/auth').pipe(tap((s) => this.state.set(s)));
  }

  unlock(pin: string) {
    return this.http
      .post<AuthState>('/api/auth/unlock', { pin })
      .pipe(tap((s) => this.state.set(s)));
  }

  lock() {
    return this.http
      .post<void>('/api/auth/lock', null)
      .pipe(tap(() => this.state.update((s) => (s ? { ...s, unlocked: false } : s))));
  }

  setPin(pin: string, currentPin?: string) {
    return this.http
      .put<AuthState>('/api/auth/pin', { pin, currentPin })
      .pipe(tap((s) => this.state.set(s)));
  }

  removePin(pin: string) {
    return this.http
      .delete<AuthState>('/api/auth/pin', { body: { pin } })
      .pipe(tap((s) => this.state.set(s)));
  }
}
