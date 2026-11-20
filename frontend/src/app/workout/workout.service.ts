import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { LoggedSet, Workout } from './workout';

const BASE = '/api/workouts';

@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private readonly http = inject(HttpClient);

  /** The workout in progress, or null when there is none. */
  current() {
    return this.http
      .get<Workout>(`${BASE}/current`, { observe: 'response' })
      .pipe(map((res) => (res.status === 204 ? null : res.body)));
  }

  get(id: number) {
    return this.http.get<Workout>(`${BASE}/${id}`);
  }

  start(name?: string) {
    return this.http.post<Workout>(BASE, name ? { name } : {});
  }

  addExercise(workoutId: number, exerciseId: number) {
    return this.http.post<Workout>(`${BASE}/${workoutId}/exercises`, { exerciseId });
  }

  removeExercise(workoutId: number, workoutExerciseId: number) {
    return this.http.delete<Workout>(`${BASE}/${workoutId}/exercises/${workoutExerciseId}`);
  }

  logSet(workoutId: number, workoutExerciseId: number, weightKg: number, reps: number) {
    return this.http.post<LoggedSet>(`${BASE}/${workoutId}/exercises/${workoutExerciseId}/sets`, {
      weightKg,
      reps,
    });
  }

  updateSet(
    workoutId: number,
    workoutExerciseId: number,
    setId: number,
    weightKg: number,
    reps: number,
  ) {
    return this.http.put<LoggedSet>(
      `${BASE}/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`,
      {
        weightKg,
        reps,
      },
    );
  }

  removeSet(workoutId: number, workoutExerciseId: number, setId: number) {
    return this.http.delete<void>(
      `${BASE}/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`,
    );
  }

  finish(workoutId: number) {
    return this.http.post<Workout>(`${BASE}/${workoutId}/finish`, null);
  }

  discard(workoutId: number) {
    return this.http.delete<void>(`${BASE}/${workoutId}`);
  }
}
