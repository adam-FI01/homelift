import { Units } from '../settings/settings';
import { LB_PER_KG } from '../settings/settings';

export type BodyKind =
  'WEIGHT' | 'BODY_FAT' | 'WAIST' | 'CHEST' | 'ARM' | 'THIGH' | 'HIPS' | 'NECK';

export interface BodyMetric {
  id: number;
  /** YYYY-MM-DD */
  date: string;
  kind: BodyKind;
  /** kg for weight, percent for body fat, cm for lengths. */
  value: number;
}

type Measure = 'weight' | 'percent' | 'length';

export const BODY_KINDS: { kind: BodyKind; label: string; measure: Measure }[] = [
  { kind: 'WEIGHT', label: 'Weight', measure: 'weight' },
  { kind: 'BODY_FAT', label: 'Body fat', measure: 'percent' },
  { kind: 'WAIST', label: 'Waist', measure: 'length' },
  { kind: 'CHEST', label: 'Chest', measure: 'length' },
  { kind: 'ARM', label: 'Arm', measure: 'length' },
  { kind: 'THIGH', label: 'Thigh', measure: 'length' },
  { kind: 'HIPS', label: 'Hips', measure: 'length' },
  { kind: 'NECK', label: 'Neck', measure: 'length' },
];

const CM_PER_IN = 2.54;

function measureOf(kind: BodyKind): Measure {
  return BODY_KINDS.find((k) => k.kind === kind)!.measure;
}

/** "kg", "lb", "%", "cm" or "in". */
export function bodyUnit(kind: BodyKind, units: Units): string {
  switch (measureOf(kind)) {
    case 'weight':
      return units === 'LB' ? 'lb' : 'kg';
    case 'percent':
      return '%';
    case 'length':
      return units === 'LB' ? 'in' : 'cm';
  }
}

/** A stored value in the units shown, to one decimal. */
export function toShown(kind: BodyKind, stored: number, units: Units): number {
  const m = measureOf(kind);
  const v =
    units === 'LB' && m === 'weight'
      ? stored * LB_PER_KG
      : units === 'LB' && m === 'length'
        ? stored / CM_PER_IN
        : stored;
  return Math.round(v * 10) / 10;
}

/** A typed value back to how it is stored. */
export function toStored(kind: BodyKind, shown: number, units: Units): number {
  const m = measureOf(kind);
  if (units === 'LB' && m === 'weight') return shown / LB_PER_KG;
  if (units === 'LB' && m === 'length') return shown * CM_PER_IN;
  return shown;
}
