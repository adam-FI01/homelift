import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Exercise, ExerciseInput } from './exercise';

const BASE = '/api/exercises';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Exercise[]>(BASE, { params: { includeArchived: true } });
  }

  get(id: number) {
    return this.http.get<Exercise>(`${BASE}/${id}`);
  }

  create(input: ExerciseInput) {
    return this.http.post<Exercise>(BASE, input);
  }

  update(id: number, input: ExerciseInput) {
    return this.http.put<Exercise>(`${BASE}/${id}`, input);
  }

  archive(id: number) {
    return this.http.post<Exercise>(`${BASE}/${id}/archive`, null);
  }

  restore(id: number) {
    return this.http.post<Exercise>(`${BASE}/${id}/restore`, null);
  }
}

/** The human-readable message from an API problem response, or a fallback. */
export function problemMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Server unreachable. Check your connection.';
    const detail = error.error?.detail;
    if (typeof detail === 'string' && detail) return detail;
  }
  return 'Something went wrong. Please try again.';
}
