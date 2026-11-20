import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Period, Stats } from './stats';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  get(period: Period, date: string) {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    return this.http.get<Stats>('/api/stats', { params: { period, date, zone } });
  }
}
