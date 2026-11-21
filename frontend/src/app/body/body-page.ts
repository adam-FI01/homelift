import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, of, switchMap } from 'rxjs';
import { formatNumber } from '../settings/settings';
import { SettingsService } from '../settings/settings.service';
import { ConfirmService } from '../shared/confirm.service';
import { LineChart } from '../shared/line-chart';
import { Sheet } from '../shared/sheet';
import { isoDate, localDate } from '../stats/stats';
import { BODY_KINDS, BodyKind, BodyMetric, bodyUnit, toShown, toStored } from './body';
import { BodyService } from './body.service';

/** Track body weight and measurements over time. */
@Component({
  selector: 'app-body-page',
  imports: [RouterLink, LineChart, Sheet],
  templateUrl: './body-page.html',
  styleUrl: './body-page.scss',
})
export class BodyPage {
  private readonly api = inject(BodyService);
  private readonly settings = inject(SettingsService);
  private readonly confirm = inject(ConfirmService);

  protected readonly kinds = BODY_KINDS;
  protected readonly kind = signal<BodyKind>('WEIGHT');
  private readonly version = signal(0);

  protected readonly entries = toSignal(
    combineLatest([toObservable(this.kind), toObservable(this.version)]).pipe(
      switchMap(([kind]) => this.api.list(kind).pipe(catchError(() => of([] as BodyMetric[])))),
    ),
  );

  protected readonly unit = computed(() => bodyUnit(this.kind(), this.settings.units()));
  protected readonly label = computed(() => BODY_KINDS.find((k) => k.kind === this.kind())!.label);
  protected readonly shown = (stored: number) =>
    toShown(this.kind(), stored, this.settings.units());

  protected readonly points = computed(() =>
    (this.entries() ?? []).map((e) => ({ x: localDate(e.date).getTime(), y: this.shown(e.value) })),
  );
  protected readonly newestFirst = computed(() => [...(this.entries() ?? [])].reverse());

  protected readonly latest = computed(() => {
    const list = this.entries() ?? [];
    if (list.length === 0) return null;
    const last = this.shown(list.at(-1)!.value);
    const first = this.shown(list[0].value);
    return {
      value: last,
      change: list.length > 1 ? Math.round((last - first) * 10) / 10 : null,
      since: list[0].date,
    };
  });

  protected readonly logging = signal(false);
  protected readonly draftDate = signal(isoDate(new Date()));
  protected readonly draftValue = signal('');

  protected startLog(): void {
    const latest = this.latest();
    this.draftDate.set(isoDate(new Date()));
    this.draftValue.set(latest ? String(latest.value) : '');
    this.logging.set(true);
  }

  protected save(): void {
    const value = Number(this.draftValue().replace(',', '.'));
    if (!(value > 0) || !this.draftDate()) return;
    this.api
      .save(this.draftDate(), this.kind(), toStored(this.kind(), value, this.settings.units()))
      .subscribe(() => {
        this.logging.set(false);
        this.version.update((v) => v + 1);
      });
  }

  protected async remove(e: BodyMetric): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Delete ${this.fmt(this.shown(e.value))} ${this.unit()}?`,
      message: `From ${this.day(e.date)}.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) this.api.delete(e.id).subscribe(() => this.version.update((v) => v + 1));
  }

  protected fmt(n: number): string {
    return formatNumber(n, 1);
  }

  protected signed(n: number): string {
    return (n > 0 ? '+' : n < 0 ? '−' : '±') + this.fmt(Math.abs(n));
  }

  protected day(iso: string): string {
    return localDate(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  protected readonly chartLabel = computed(
    () => `${this.label()} over time, ${this.points().length} entries`,
  );
}
