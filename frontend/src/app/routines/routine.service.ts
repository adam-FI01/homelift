import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Workout } from '../workout/workout';
import { Routine, RoutineInput } from './routine';

const BASE = '/api/routines';

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Routine[]>(BASE);
  }

  get(id: number) {
    return this.http.get<Routine>(`${BASE}/${id}`);
  }

  save(id: number | undefined, input: RoutineInput) {
    return id
      ? this.http.put<Routine>(`${BASE}/${id}`, input)
      : this.http.post<Routine>(BASE, input);
  }

  delete(id: number) {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  start(id: number) {
    return this.http.post<Workout>(`${BASE}/${id}/start`, null);
  }
}
