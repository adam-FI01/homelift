import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Decision, ImportPreview, ImportResult } from './import';

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly http = inject(HttpClient);

  /** A dry run: what the file holds and how its exercise names match the library. */
  preview(csv: string, units: 'KG' | 'LB') {
    return this.http.post<ImportPreview>('/api/import/preview', { csv, units });
  }

  start(csv: string, units: 'KG' | 'LB', decisions: Decision[]) {
    return this.http.post<ImportResult>('/api/import', { csv, units, decisions });
  }
}
