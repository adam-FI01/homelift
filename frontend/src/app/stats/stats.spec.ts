import { change, hoursAndMinutes, periodTitle, shiftPeriod, volumeComparison } from './stats';

describe('stats helpers', () => {
  it('steps between periods', () => {
    expect(shiftPeriod('WEEK', '2026-11-16', -1)).toBe('2026-11-09');
    expect(shiftPeriod('MONTH', '2026-11-01', 1)).toBe('2026-12-01');
    expect(shiftPeriod('QUARTER', '2026-10-01', 1)).toBe('2027-01-01');
    expect(shiftPeriod('YEAR', '2026-01-01', -1)).toBe('2025-01-01');
    expect(shiftPeriod('DAY', '2026-03-01', -1)).toBe('2026-02-28');
  });

  it('titles periods', () => {
    const today = new Date(2026, 10, 20);
    expect(periodTitle('DAY', '2026-11-20', today)).toBe('Today');
    expect(periodTitle('QUARTER', '2026-10-01', today)).toBe('Q4 2026');
    expect(periodTitle('YEAR', '2026-01-01', today)).toBe('2026');
  });

  it('compares volume with things you can picture', () => {
    expect(volumeComparison(10)).toBeNull();
    expect(volumeComparison(4800)).toBe('about 3.2 cars');
    expect(volumeComparison(1500)).toBe('about 1 car');
    expect(volumeComparison(90_000)).toBe('about 15 elephants');
  });

  it('formats change and time', () => {
    expect(change(110, 100)).toBe(10);
    expect(change(5, 0)).toBeNull();
    expect(hoursAndMinutes(135)).toBe('2h 15m');
    expect(hoursAndMinutes(45)).toBe('45m');
  });
});
