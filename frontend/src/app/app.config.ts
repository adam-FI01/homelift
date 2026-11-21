import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
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
  ],
};
