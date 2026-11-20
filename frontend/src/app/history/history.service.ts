import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ExerciseHistory, WorkoutSummary } from './history';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);

  exercise(id: number) {
    return this.http.get<ExerciseHistory>(`/api/exercises/${id}/history`);
  }

  recentWorkouts(limit = 30) {
    return this.http.get<WorkoutSummary[]>('/api/workouts', { params: { limit } });
  }
}
