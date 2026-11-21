import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DEFAULT_REST_SECONDS, RestTimer } from './rest-timer.service';

describe('RestTimer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('counts down from the end time, adjusts both ways and stops', () => {
    const timer = TestBed.inject(RestTimer);
    expect(timer.remaining()).toBeNull();

    timer.start(60);
    expect(timer.remaining()).toBe(60);

    vi.advanceTimersByTime(10_000);
    expect(timer.remaining()).toBe(50);

    timer.adjust(15);
    expect(timer.remaining()).toBe(65);
    timer.adjust(-15);
    expect(timer.remaining()).toBe(50);

    vi.advanceTimersByTime(50_000);
    expect(timer.remaining()).toBeNull();
    expect(timer.justFinished()).toBe(true);

    vi.advanceTimersByTime(10_000);
    expect(timer.justFinished()).toBe(false);
  });

  it('ends the rest when time is taken away past zero', () => {
    const timer = TestBed.inject(RestTimer);
    timer.start(10);
    timer.adjust(-15);
    expect(timer.remaining()).toBeNull();
  });

  it('catches up after the page was hidden, since it counts from the end time', () => {
    const timer = TestBed.inject(RestTimer);
    timer.start(DEFAULT_REST_SECONDS);
    // Background tabs barely run intervals; jump the clock without ticking.
    vi.setSystemTime(Date.now() + 100_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(timer.remaining()).toBe(DEFAULT_REST_SECONDS - 100);
  });

  it('uses the default rest from settings', () => {
    localStorage.setItem('homelift.settings', JSON.stringify({ defaultRestSeconds: 90 }));
    const timer = TestBed.inject(RestTimer);
    timer.start();
    expect(timer.remaining()).toBe(90);
  });

  it('stays still when vibration is off', () => {
    localStorage.setItem('homelift.settings', JSON.stringify({ restVibrate: false }));
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const timer = TestBed.inject(RestTimer);
    timer.start(5);
    vi.advanceTimersByTime(6_000);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('vibrates when rest is over', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const timer = TestBed.inject(RestTimer);
    timer.start(5);
    vi.advanceTimersByTime(6_000);
    expect(vibrate).toHaveBeenCalled();
  });

  it('remembers a running timer and the sound setting across reloads', () => {
    const first = TestBed.inject(RestTimer);
    first.start(90);
    first.toggleSound();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const second = TestBed.inject(RestTimer);
    expect(second.remaining()).toBe(90);
    expect(second.soundOn()).toBe(false);
  });

  it('can be skipped', () => {
    const timer = TestBed.inject(RestTimer);
    timer.start();
    timer.skip();
    expect(timer.remaining()).toBeNull();
    expect(timer.justFinished()).toBe(false);
  });
});
