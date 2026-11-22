import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/**
 * Tells the app when a newer version has been downloaded in the background. The open app keeps
 * running the old code until it is reloaded, so the shell shows a banner that offers a reload.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly sw = inject(SwUpdate);

  /** A new version is downloaded and ready; a reload switches to it. */
  readonly ready = signal(false);
  /** The cached copy is broken and only a reload fixes it. */
  readonly broken = signal(false);

  constructor() {
    if (!this.sw.isEnabled) return;
    this.sw.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.ready.set(true);
    });
    this.sw.unrecoverable.subscribe(() => this.broken.set(true));
    // The app can stay open for days on a phone, so look for updates now and then.
    const check = () => void this.sw.checkForUpdate().catch(() => undefined);
    setInterval(check, 6 * 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }

  /** Switches to the new version by loading the page again. */
  reload(): void {
    location.reload();
  }
}
