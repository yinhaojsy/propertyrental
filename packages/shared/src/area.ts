import type { AreaUnit } from './enums.js';

/** Conversion factors to square feet */
const TO_SQFT: Record<AreaUnit, number> = {
  sqft: 1,
  sqm: 10.7639,
  yard: 9,
  marla: 272.25,
  kanal: 5445,
};

export function convertToSqFt(value: number, unit: AreaUnit): number {
  return value * TO_SQFT[unit];
}

export function convertFromSqFt(sqft: number, unit: AreaUnit): number {
  return sqft / TO_SQFT[unit];
}

export function roundArea(value: number, unit: AreaUnit): number {
  const decimals = unit === 'marla' || unit === 'kanal' ? 4 : 2;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function sqftFromAreaInput(value: number | null, unit: AreaUnit): number | null {
  if (value == null) return null;
  return roundArea(convertToSqFt(value, unit), 'sqft');
}

export function areaInUnit(sqft: number | null, unit: AreaUnit): number | null {
  if (sqft == null) return null;
  return roundArea(convertFromSqFt(sqft, unit), unit);
}

export function formatArea(value: number | null, unit: AreaUnit | null): string {
  if (value == null) return '';
  const labels: Record<AreaUnit, string> = {
    sqft: 'sq ft',
    sqm: 'sq m',
    yard: 'yard',
    marla: 'marla',
    kanal: 'kanal',
  };
  return `${value.toLocaleString()} ${labels[unit ?? 'sqft']}`;
}

export function parseBedFilter(bed: string): number | 'studio' | null {
  if (bed === 'all' || !bed) return null;
  if (bed === 'studio') return 'studio';
  if (bed === '10+') return 10;
  const n = parseInt(bed, 10);
  return Number.isNaN(n) ? null : n;
}

export function parseBathFilter(bath: string): number | null {
  if (bath === 'all' || !bath) return null;
  if (bath === '10+') return 10;
  const n = parseInt(bath, 10);
  return Number.isNaN(n) ? null : n;
}
