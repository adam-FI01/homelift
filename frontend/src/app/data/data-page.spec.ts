import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DataPage } from './data-page';

describe('DataPage', () => {
  it('links to the three downloads', async () => {
    TestBed.configureTestingModule({ imports: [DataPage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(DataPage);
    await fixture.whenStable();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a[download]')].map(
      (a) => a.getAttribute('href'),
    );
    expect(links).toEqual([
      '/api/export/homelift.db',
      '/api/export/sets.csv',
      '/api/export/backup.json',
    ]);
  });
});
