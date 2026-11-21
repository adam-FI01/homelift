import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('shows the four main tabs', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const tabs = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav a')].map((a) =>
      a.textContent?.trim(),
    );
    expect(tabs).toEqual(['Home', 'Today', 'History', 'Routines']);
  });
});
