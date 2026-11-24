import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { LoggedSet, Workout } from './workout';
import { WorkoutService } from './workout.service';

const KEY = 'homelift.offline.queue';
/** Where version 1.0 kept queued sets, before other actions could wait too. */
const OLD_KEY = 'homelift.offline.sets';

interface Base {
  /** Local id, so an action can be shown before the server has seen it. */
  key: string;
  workoutId: number;
}

export interface QueuedSet extends Base {
  type: 'set';
  workoutExerciseId: number;
  weightKg: number;
  reps: number;
  warmup: boolean;
}

export interface QueuedSetEdit extends Base {
  type: 'editSet';
  workoutExerciseId: number;
  setId: number;
  weightKg: number;
  reps: number;
  warmup: boolean;
}

export interface QueuedSetDelete extends Base {
  type: 'deleteSet';
  workoutExerciseId: number;
  setId: number;
}

export interface QueuedNotes extends Base {
  type: 'notes';
  notes: string;
}

export interface QueuedFinish extends Base {
  type: 'finish';
}

/** Something done while the server couldn't be reached, waiting to be sent. */
export type QueuedAction = QueuedSet | QueuedSetEdit | QueuedSetDelete | QueuedNotes | QueuedFinish;

/** An action as given to `add`; the queue adds the key. */
export type NewAction = QueuedAction extends infer A
  ? A extends QueuedAction
    ? Omit<A, 'key'>
    : never
  : never;

/**
 * Changes made while the server can't be reached: logged sets, corrections, notes and finishing
 * the workout. They are kept on the device, shown as waiting, and sent in the order they were made
 * as soon as the connection is back.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueue {
  private readonly api = inject(WorkoutService);
  private flushing = false;

  readonly items = signal<QueuedAction[]>(read());
  readonly count = computed(() => this.items().length);
  /** Counts up after each successful sync, so pages can reload. */
  readonly synced = signal(0);
  /** An action the server refused (say, the workout was finished elsewhere), to tell the user once. */
  readonly dropped = signal(0);
  /** A short description of what is waiting, such as "2 sets, notes and finish". */
  readonly summary = computed(() => describeQueue(this.items()));

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

  add(action: NewAction): void {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let items = this.items();
    if (action.type === 'notes') {
      // Only the latest text matters, so it replaces notes still waiting for this workout.
      items = items.filter((i) => !(i.type === 'notes' && i.workoutId === action.workoutId));
    }
    this.update([...items, { ...action, key } as QueuedAction]);
  }

  /** Changes a set that is still waiting to be sent, rather than queueing another change. */
  editPending(key: string, change: { weightKg: number; reps: number; warmup: boolean }): void {
    this.update(
      this.items().map((i) => (i.key === key && i.type === 'set' ? { ...i, ...change } : i)),
    );
  }

  /** Forgets a set that never reached the server. */
  removePending(key: string): void {
    this.update(this.items().filter((i) => i.key !== key));
  }

  /** Sends queued actions in order; stops at the first network failure and tries again later. */
  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    let sent = 0;
    try {
      for (const item of [...this.items()]) {
        try {
          await firstValueFrom(this.send(item) as Observable<unknown>);
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

  private send(item: QueuedAction) {
    switch (item.type) {
      case 'set':
        return this.api.logSet(
          item.workoutId,
          item.workoutExerciseId,
          item.weightKg,
          item.reps,
          item.warmup,
        );
      case 'editSet':
        return this.api.updateSet(
          item.workoutId,
          item.workoutExerciseId,
          item.setId,
          item.weightKg,
          item.reps,
          item.warmup,
        );
      case 'deleteSet':
        return this.api.removeSet(item.workoutId, item.workoutExerciseId, item.setId);
      case 'notes':
        return this.api.saveNotes(item.workoutId, item.notes);
      case 'finish':
        return this.api.finish(item.workoutId);
    }
  }

  private update(items: QueuedAction[]): void {
    this.items.set(items);
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Without storage the queue still lives for this page.
    }
  }
}

/** "2 sets, notes and finish": what is waiting, in plain words. */
export function describeQueue(items: QueuedAction[]): string {
  const count = (t: QueuedAction['type']) => items.filter((i) => i.type === t).length;
  const sets = count('set');
  const fixes = count('editSet') + count('deleteSet');
  const parts = [
    sets ? `${sets} ${sets === 1 ? 'set' : 'sets'}` : '',
    fixes ? `${fixes} ${fixes === 1 ? 'correction' : 'corrections'}` : '',
    count('notes') ? 'notes' : '',
    count('finish') ? 'finish' : '',
  ].filter(Boolean);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/**
 * The workout with waiting actions applied, so working offline looks like working online: queued
 * sets appear as pending, corrections show, deleted sets disappear, notes are kept. A workout that
 * is waiting to be finished is treated as finished.
 */
export function withPending(
  workout: Workout | null | undefined,
  queued: QueuedAction[],
): Workout | null | undefined {
  if (!workout) return workout;
  const mine = queued.filter((q) => q.workoutId === workout.id);
  if (mine.length === 0) return workout;
  if (mine.some((q) => q.type === 'finish')) return null;
  const notes = mine.filter((q): q is QueuedNotes => q.type === 'notes').at(-1);
  return {
    ...workout,
    notes: notes ? notes.notes : workout.notes,
    exercises: workout.exercises.map((e) => {
      const deleted = new Set(
        mine.flatMap((q) =>
          q.type === 'deleteSet' && q.workoutExerciseId === e.id ? [q.setId] : [],
        ),
      );
      const edits = mine.filter(
        (q): q is QueuedSetEdit => q.type === 'editSet' && q.workoutExerciseId === e.id,
      );
      const saved: LoggedSet[] = e.sets
        .filter((s) => !deleted.has(s.id))
        .map((s) => {
          const edit = edits.filter((q) => q.setId === s.id).at(-1);
          return edit
            ? { ...s, weightKg: edit.weightKg, reps: edit.reps, warmup: edit.warmup, pending: true }
            : s;
        });
      const extra = mine.filter(
        (q): q is QueuedSet => q.type === 'set' && q.workoutExerciseId === e.id,
      );
      const start = e.sets.length;
      const pending: LoggedSet[] = extra.map((q, i) => ({
        id: -(start + i + 1),
        setNumber: start + i + 1,
        weightKg: q.weightKg,
        reps: q.reps,
        warmup: q.warmup,
        pending: true,
        queueKey: q.key,
      }));
      return { ...e, sets: [...saved, ...pending] };
    }),
  };
}

function read(): QueuedAction[] {
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      // Sets queued by version 1.0 had no type; carry them over once.
      const sets = (JSON.parse(old) as Omit<QueuedSet, 'type'>[]).map((s): QueuedSet => ({
        ...s,
        type: 'set',
      }));
      localStorage.removeItem(OLD_KEY);
      const current = JSON.parse(localStorage.getItem(KEY) ?? '[]') as QueuedAction[];
      const merged = [...sets, ...current];
      localStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
    }
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
