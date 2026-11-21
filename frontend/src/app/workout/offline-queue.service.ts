import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LoggedSet, Workout } from './workout';
import { WorkoutService } from './workout.service';

const KEY = 'homelift.offline.sets';

export interface QueuedSet {
  /** Local id, so the set can be shown before the server has one. */
  key: string;
  workoutId: number;
  workoutExerciseId: number;
  weightKg: number;
  reps: number;
  warmup: boolean;
}

/**
 * Sets logged while the server can't be reached. They are kept on the device, shown as pending,
 * and sent in order as soon as the connection is back.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueue {
  private readonly api = inject(WorkoutService);
  private flushing = false;

  readonly items = signal<QueuedSet[]>(read());
  readonly count = computed(() => this.items().length);
  /** Counts up after each successful sync, so pages can reload. */
  readonly synced = signal(0);
  /** A set the server refused (say, the workout was finished elsewhere), to tell the user once. */
  readonly dropped = signal(0);

  constructor() {
    const online = () => void this.flush();
    window.addEventListener('online', online);
    const retry = setInterval(() => {
      if (this.count() > 0) void this.flush();
    }, 30_000);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', online);
      clearInterval(retry);
    });
    if (this.count() > 0) queueMicrotask(() => void this.flush());
  }

  add(set: Omit<QueuedSet, 'key'>): void {
    this.update([
      ...this.items(),
      { ...set, key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    ]);
  }

  /** Sends queued sets in order; stops at the first network failure and tries again later. */
  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    let sent = 0;
    try {
      for (const item of [...this.items()]) {
        try {
          await firstValueFrom(
            this.api.logSet(
              item.workoutId,
              item.workoutExerciseId,
              item.weightKg,
              item.reps,
              item.warmup,
            ),
          );
        } catch (err) {
          if (!(err instanceof HttpErrorResponse) || err.status === 0 || err.status >= 500) break;
          this.dropped.update((n) => n + 1);
        }
        this.update(this.items().filter((i) => i.key !== item.key));
        sent++;
      }
    } finally {
      this.flushing = false;
      if (sent > 0) this.synced.update((n) => n + 1);
    }
  }

  private update(items: QueuedSet[]): void {
    this.items.set(items);
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Without storage the queue still lives for this page.
    }
  }
}

/** The workout with queued sets added as pending, so logging offline looks like logging online. */
export function withPending(
  workout: Workout | null | undefined,
  queued: QueuedSet[],
): Workout | null | undefined {
  if (!workout) return workout;
  const mine = queued.filter((q) => q.workoutId === workout.id);
  if (mine.length === 0) return workout;
  return {
    ...workout,
    exercises: workout.exercises.map((e) => {
      const extra = mine.filter((q) => q.workoutExerciseId === e.id);
      if (extra.length === 0) return e;
      const start = e.sets.length;
      const pending: LoggedSet[] = extra.map((q, i) => ({
        id: -(start + i + 1),
        setNumber: start + i + 1,
        weightKg: q.weightKg,
        reps: q.reps,
        warmup: q.warmup,
        pending: true,
      }));
      return { ...e, sets: [...e.sets, ...pending] };
    }),
  };
}

function read(): QueuedSet[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
