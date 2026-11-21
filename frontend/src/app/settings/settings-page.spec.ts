import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SettingsPage } from './settings-page';
import { SettingsService } from './settings.service';

describe('SettingsPage', () => {
  beforeEach(() => localStorage.clear());

  async function setup() {
    TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(SettingsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne('/api/auth')
      .flush({ enabled: false, unlocked: true, managedByEnvironment: false });
    http.expectOne('/api/status').flush({
      version: '0.1.0',
      sqliteVersion: '3.54.1',
      javaVersion: 25,
      uptimeSeconds: 93_784,
      databaseBytes: 2_621_440,
      workouts: 61,
      sets: 1058,
    });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, http, el };
  }

  it('changes the default rest and saves it', async () => {
    const { fixture, http, el } = await setup();
    expect(el.textContent).toContain('2:00');
    (el.querySelector('[aria-label="15 seconds less default rest"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.textContent).toContain('1:45');
    expect(
      http.expectOne({ method: 'PUT', url: '/api/settings' }).request.body.defaultRestSeconds,
    ).toBe(105);
  });

  it('switches units, theme and toggles', async () => {
    const { fixture, http, el } = await setup();
    const button = (text: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;

    button('Pounds').click();
    http.expectOne({ method: 'PUT', url: '/api/settings' });
    expect(TestBed.inject(SettingsService).format(100)).toBe('220.5 lb');

    button('Dark').click();
    http.expectOne({ method: 'PUT', url: '/api/settings' });
    await fixture.whenStable();
    expect(document.documentElement.dataset['theme']).toBe('dark');

    (el.querySelector('[aria-labelledby="restSound-label"]') as HTMLButtonElement).click();
    expect(http.expectOne({ method: 'PUT', url: '/api/settings' }).request.body.restSound).toBe(
      false,
    );
    delete document.documentElement.dataset['theme'];
  });

  it('offers the backups', async () => {
    const { el } = await setup();
    const links = [...el.querySelectorAll('a[download]')].map((a) => a.getAttribute('href'));
    expect(links).toEqual([
      '/api/export/homelift.db',
      '/api/export/sets.csv',
      '/api/export/backup.json',
    ]);
    expect(el.textContent).toContain('Server healthy');
    expect(el.textContent).toContain('up 1d 2h');
    expect(el.textContent).toContain('2.5 MB · SQLite 3.54.1');
    expect(el.textContent).toContain('61 workouts · 1058 sets');
  });

  it('sets a PIN after typing it twice', async () => {
    const { fixture, http, el } = await setup();
    (el.querySelector('[aria-labelledby="pin-label"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const inputs = [
      ...el.querySelectorAll('input[autocomplete="new-password"]'),
    ] as HTMLInputElement[];
    const type = (i: HTMLInputElement, v: string) => {
      i.value = v;
      i.dispatchEvent(new Event('input'));
    };
    const save = () =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Save PIN')!;

    type(inputs[0], '2468');
    type(inputs[1], '2469');
    save().click();
    await fixture.whenStable();
    expect(el.textContent).toContain("don't match");

    type(inputs[1], '2468');
    save().click();
    expect(http.expectOne({ method: 'PUT', url: '/api/auth/pin' }).request.body).toEqual({
      pin: '2468',
    });
  });
});
