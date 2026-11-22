import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { HistoryService } from '../history/history.service';
import { SettingsService } from '../settings/settings.service';
import { WeightPipe } from '../settings/weight.pipe';
import { Routine, exerciseSummary } from '../routines/routine';
import { RoutineService } from '../routines/routine.service';
import { Stats, change, isoDate, localDate } from '../stats/stats';
import { StatsService } from '../stats/stats.service';
import { OfflineQueue } from '../workout/offline-queue.service';
import { OfflineStatus } from '../workout/offline-status';
import { WorkoutService } from '../workout/workout.service';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The home summary: this week's volume, what's up next, the week at a glance and recent records. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, WeightPipe, OfflineStatus],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly router = inject(Router);
  private readonly routinesApi = inject(RoutineService);
  protected readonly unit = inject(SettingsService).unitLabel;

  protected readonly today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  protected readonly data = toSignal(
    forkJoin({
      week: inject(StatsService)
        .get('WEEK', isoDate(new Date()))
        .pipe(catchError(() => of(null))),
      month: inject(StatsService)
        .get('MONTH', isoDate(new Date()))
        .pipe(catchError(() => of(null))),
      current: inject(WorkoutService)
        .current()
        .pipe(catchError(() => of(null))),
      routines: this.routinesApi.list().pipe(catchError(() => of([] as Routine[]))),
      last: inject(HistoryService)
        .recentWorkouts(1)
        .pipe(catchError(() => of([]))),
    }),
  );

  private readonly queue = inject(OfflineQueue);

  /** The workout in progress, unless it is only waiting to be finished on the server. */
  protected readonly current = computed(() => {
    const c = this.data()?.current ?? null;
    const finishing = this.queue.items().some((i) => i.type === 'finish' && i.workoutId === c?.id);
    return finishing ? null : c;
  });

  protected readonly offline = computed(() => {
    const d = this.data();
    return !!d && d.week === null;
  });

  protected readonly volumeChange = computed(() => {
    const w = this.data()?.week;
    return w ? change(w.totals.volumeKg, w.previous.volumeKg) : null;
  });

  /** The routine after the one used last, so a rotation like Push, Pull, Legs comes round in turn. */
  protected readonly upNext = computed(() => {
    const d = this.data();
    if (!d || d.routines.length === 0) return null;
    const lastId = d.last[0]?.routineId;
    const i = d.routines.findIndex((r) => r.id === lastId);
    return d.routines[(i + 1) % d.routines.length];
  });

  protected readonly week = computed(() => weekDays(this.data()?.week ?? null));

  protected readonly records = computed(() => (this.data()?.month?.records ?? []).slice(0, 3));

  protected summary(r: Routine): string {
    return exerciseSummary(r);
  }

  protected start(r: Routine): void {
    this.routinesApi.start(r.id).subscribe({
      next: () => this.router.navigate(['/workout']),
      error: () => this.router.navigate(['/workout']),
    });
  }

  protected dayName(iso: string): string {
    return localDate(iso).toLocaleDateString(undefined, { weekday: 'short' });
  }
}

/** Monday to Sunday with whether each day had a workout and which one is today. */
export function weekDays(week: Stats | null, now = new Date()) {
  const todayIso = isoDate(now);
  return DAY_LETTERS.map((letter, i) => {
    const bucket = week?.buckets[i];
    return {
      letter,
      done: (bucket?.workouts ?? 0) > 0,
      today: bucket?.start === todayIso,
      label: bucket
        ? localDate(bucket.start).toLocaleDateString(undefined, { weekday: 'long' })
        : letter,
    };
  });
}
