import { TestBed } from '@angular/core/testing';
import { RestTimer } from './rest-timer.service';

describe('RestTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts down, extends and stops', () => {
    const timer = TestBed.inject(RestTimer);
    expect(timer.remaining()).toBeNull();

    timer.start(60);
    expect(timer.remaining()).toBe(60);

    vi.advanceTimersByTime(10_000);
    expect(timer.remaining()).toBe(50);

    timer.add(30);
    expect(timer.remaining()).toBe(80);

    vi.advanceTimersByTime(80_000);
    expect(timer.remaining()).toBeNull();
  });

  it('can be skipped', () => {
    const timer = TestBed.inject(RestTimer);
    timer.start();
    timer.skip();
    expect(timer.remaining()).toBeNull();
  });
});
