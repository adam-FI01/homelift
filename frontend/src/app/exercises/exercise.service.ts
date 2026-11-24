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

  /** Sends a picture or clip; the body is the file and its type says what it is. */
  uploadMedia(id: number, file: Blob) {
    return this.http.put<Exercise>(`${BASE}/${id}/media`, file, {
      headers: { 'Content-Type': file.type },
    });
  }

  removeMedia(id: number) {
    return this.http.delete<Exercise>(`${BASE}/${id}/media`);
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
