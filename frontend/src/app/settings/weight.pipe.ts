import { Pipe, PipeTransform, inject } from '@angular/core';
import { SettingsService } from './settings.service';

/**
 * Shows a stored kg weight in the chosen unit: `{{ 82.5 | weight }}` is "82.5 kg" or
 * "181.9 lb"; `{{ v | weight: 0 }}` rounds; `{{ v | weight: 1 : false }}` leaves out the unit.
 * Impure so it follows a change of units without reloading.
 */
@Pipe({ name: 'weight', pure: false })
export class WeightPipe implements PipeTransform {
  private readonly settings = inject(SettingsService);

  transform(kg: number | null | undefined, decimals = 1, withUnit = true): string {
    return kg == null ? '' : this.settings.format(kg, decimals, withUnit);
  }
}
