export type Units = 'KG' | 'LB';
export type Theme = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface Settings {
  defaultRestSeconds: number;
  autoStartRest: boolean;
  restSound: boolean;
  restVibrate: boolean;
  units: Units;
  theme: Theme;
  /** Bar weight in kg; null means the usual bar for the units (20 kg or 45 lb). */
  barKg: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultRestSeconds: 120,
  autoStartRest: true,
  restSound: true,
  restVibrate: true,
  units: 'KG',
  theme: 'SYSTEM',
  barKg: null,
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

/** Common plates, heaviest first, in the units' own sizes. */
export const PLATES: Record<Units, number[]> = {
  KG: [25, 20, 15, 10, 5, 2.5, 1.25],
  LB: [45, 35, 25, 10, 5, 2.5],
};

/** The usual Olympic bar: 20 kg, or 45 lb. */
export function standardBar(units: Units): number {
  return units === 'LB' ? 45 : 20;
}

/**
 * Plates for each side of the bar to reach `total`, heaviest first, all in the same unit.
 * `remainder` is what can't be made with the plates (per bar, not per side).
 */
export function platesPerSide(
  total: number,
  bar: number,
  plates: number[],
): { plates: number[]; remainder: number } {
  let side = Math.max(0, (total - bar) / 2);
  const out: number[] = [];
  for (const p of plates) {
    while (side + 1e-9 >= p) {
      out.push(p);
      side -= p;
    }
  }
  return { plates: out, remainder: Math.round(side * 2 * 100) / 100 };
}
