import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BodyKind, BodyMetric } from './body';

@Injectable({ providedIn: 'root' })
export class BodyService {
  private readonly http = inject(HttpClient);

  /** Entries oldest first; `to` is the day after the last one wanted. */
  list(kind?: BodyKind, from?: string, to?: string) {
    const params: Record<string, string> = {};
    if (kind) params['kind'] = kind;
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<BodyMetric[]>('/api/body', { params });
  }

  save(date: string, kind: BodyKind, value: number) {
    return this.http.put<BodyMetric>('/api/body', { date, kind, value });
  }

  delete(id: number) {
    return this.http.delete<void>(`/api/body/${id}`);
  }
}
