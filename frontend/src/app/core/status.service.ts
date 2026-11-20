import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface AppStatus {
  name: string;
  version: string;
  sqliteVersion: string;
}

@Injectable({ providedIn: 'root' })
export class StatusService {
  private readonly http = inject(HttpClient);

  get() {
    return this.http.get<AppStatus>('/api/status');
  }
}
