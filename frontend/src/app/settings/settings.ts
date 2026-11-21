export type Units = 'KG' | 'LB';
export type Theme = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface Settings {
  defaultRestSeconds: number;
  autoStartRest: boolean;
  restSound: boolean;
  restVibrate: boolean;
  units: Units;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultRestSeconds: 120,
  autoStartRest: true,
  restSound: true,
  restVibrate: true,
  units: 'KG',
  theme: 'SYSTEM',
};

export const LB_PER_KG = 2.2046226218;

/** Weights are stored in kg; these convert for showing and typing in the chosen unit. */
export function toDisplay(kg: number, units: Units): number {
  return units === 'LB' ? kg * LB_PER_KG : kg;
}

export function fromDisplay(value: number, units: Units): number {
  return units === 'LB' ? value / LB_PER_KG : value;
}

/** The +/- step for weights: 2.5 kg or 5 lb, the usual smallest pair of plates. */
export function weightStep(units: Units): number {
  return units === 'LB' ? 5 : 2.5;
}

/** "82.5", "1,234" or "181.9": at most `decimals` places, trailing zeros dropped. */
export function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
