import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import { WeightPipe } from '../settings/weight.pipe';
import { LineChart } from '../shared/line-chart';
import { BarChart } from './bar-chart';
import {
  PERIODS,
  Period,
  Stats,
  change,
  hoursAndMinutes,
  isoDate,
  localDate,
  periodNoun,
  periodTitle,
  shiftPeriod,
  titleCase,
  volumeComparison,
} from './stats';
import { StatsService } from './stats.service';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: Stats };

/** A Wrapped-style recap of a day, week, month, quarter or year, told as a stack of cards. */
@Component({
  selector: 'app-stats-page',
  imports: [RouterLink, DecimalPipe, BarChart, LineChart, WeightPipe],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
})
export class StatsPage {
  private readonly api = inject(StatsService);
  private readonly settings = inject(SettingsService);
  protected readonly unit = this.settings.unitLabel;

  protected readonly periods = PERIODS;
  protected readonly period = signal<Period>('WEEK');
  /** Any day inside the period being shown. */
  protected readonly date = signal(isoDate(new Date()));

  protected readonly load = toSignal(
    combineLatest([toObservable(this.period), toObservable(this.date)]).pipe(
      switchMap(([p, d]) =>
        this.api.get(p, d).pipe(
          map((stats): Load => ({ status: 'ready', stats })),
          catchError(() => of<Load>({ status: 'error' })),
          startWith<Load>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as Load },
  );

  protected readonly stats = computed(() => {
    const l = this.load();
    return l.status === 'ready' ? l.stats : null;
  });

  protected readonly title = computed(() => {
    const s = this.stats();
    return s ? periodTitle(s.period, s.start) : '';
  });

  protected readonly noun = computed(() => periodNoun(this.period()));
  protected readonly isCurrent = computed(() => {
    const s = this.stats();
    return !!s && localDate(s.end) > new Date();
  });

  protected readonly volumeChange = computed(() => {
    const s = this.stats();
    return s ? change(s.totals.volumeKg, s.previous.volumeKg) : null;
  });

  protected readonly comparison = computed(() =>
    volumeComparison(this.stats()?.totals.volumeKg ?? 0),
  );

  protected readonly bars = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return s.buckets.map((b) => ({
      label: this.bucketLabel(s.period, b.start),
      value: b.volumeKg,
    }));
  });

  /** Volume added up bucket by bucket, up to today, for the running total line. */
  protected readonly runningTotal = computed(() => {
    const s = this.stats();
    if (!s || s.period === 'DAY') return [];
    const now = Date.now();
    let total = 0;
    return s.buckets
      .filter((b) => localDate(b.start).getTime() <= now)
      .map((b) => ({
        x: localDate(b.start).getTime(),
        y: this.settings.display((total += b.volumeKg)),
      }));
  });

  protected readonly runningLabel = computed(() => {
    const pts = this.runningTotal();
    const last = pts.at(-1);
    return last
      ? `Running total of volume this ${this.noun()}, reaching ${Math.round(last.y)} ${this.unit()}`
      : 'No volume logged';
  });

  protected readonly chartLabel = computed(() => {
    const s = this.stats();
    if (!s) return '';
    const best = [...s.buckets].sort((a, b) => b.volumeKg - a.volumeKg)[0];
    return best && best.volumeKg > 0
      ? `Volume per ${s.period === 'YEAR' ? 'month' : s.period === 'QUARTER' ? 'week' : 'day'}; the biggest was ${this.bucketLabel(s.period, best.start)} with ${this.settings.format(best.volumeKg, 0)}`
      : 'No volume logged';
  });

  protected readonly hoursAndMinutes = hoursAndMinutes;
  protected readonly titleCase = titleCase;

  protected select(p: Period): void {
    this.period.set(p);
    this.date.set(isoDate(new Date()));
  }

  protected step(direction: -1 | 1): void {
    const s = this.stats();
    if (s) this.date.set(shiftPeriod(s.period, s.start, direction));
  }

  protected periodLabel(p: Period): string {
    return titleCase(p);
  }

  protected dayLabel(iso: string): string {
    return localDate(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  protected signed(n: number): string {
    return (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
  }

  private bucketLabel(period: Period, iso: string): string {
    const d = localDate(iso);
    switch (period) {
      case 'WEEK':
        return d.toLocaleDateString(undefined, { weekday: 'narrow' });
      case 'MONTH':
        return String(d.getDate());
      case 'QUARTER':
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      case 'YEAR':
        return d.toLocaleDateString(undefined, { month: 'narrow' });
      default:
        return '';
    }
  }
}
