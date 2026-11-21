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
    http.expectOne('/api/status').flush({ version: '0.1.0', sqliteVersion: '3.54.1' });
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
    expect(el.textContent).toContain('HomeLift 0.1.0');
  });
});
