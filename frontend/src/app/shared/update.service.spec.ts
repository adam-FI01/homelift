import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { UpdateBanner } from './update-banner';
import { UpdateService } from './update.service';

describe('UpdateBanner', () => {
  function setup() {
    const versions = new Subject<VersionEvent>();
    const unrecoverable = new Subject<unknown>();
    TestBed.configureTestingModule({
      imports: [UpdateBanner],
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versions,
            unrecoverable,
            checkForUpdate: () => Promise.resolve(false),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(UpdateBanner);
    TestBed.inject(UpdateService);
    return { fixture, versions, unrecoverable, el: fixture.nativeElement as HTMLElement };
  }

  it('shows nothing until a new version is ready', async () => {
    const { fixture, versions, el } = setup();
    await fixture.whenStable();
    expect(el.querySelector('.banner')).toBeNull();

    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    await fixture.whenStable();
    expect(el.textContent).toContain('A new version is ready');
    expect(el.textContent).toContain('Reload');
  });

  it('can be dismissed for now', async () => {
    const { fixture, versions, el } = setup();
    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    await fixture.whenStable();
    (el.querySelector('[aria-label="Not now"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('.banner')).toBeNull();
  });

  it('asks for a reload when the cached app is unrecoverable', async () => {
    const { fixture, unrecoverable, el } = setup();
    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'hash mismatch' });
    await fixture.whenStable();
    expect(el.textContent).toContain('needs to reload');
    expect(el.querySelector('.x')).toBeNull();
  });
});
