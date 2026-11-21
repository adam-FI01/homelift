import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { routes } from './app.routes';
import { lockedInterceptor } from './auth/locked.interceptor';
import { AppErrorHandler } from './shared/app-error';
import { SettingsService } from './settings/settings.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useExisting: AppErrorHandler },
    // Pages are lazy-loaded, then all fetched in the background so switching tabs never waits.
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withFetch(), withInterceptors([lockedInterceptor])),
    // Fetch settings in the background; the cached copy is used until they arrive.
    provideAppInitializer(() => inject(SettingsService).load()),
    // Installable app with an offline cache; off in dev so code changes show straight away.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // The app has always-running timers, so wait a few seconds rather than for "stable".
      registrationStrategy: 'registerWithDelay:3000',
    }),
  ],
};
