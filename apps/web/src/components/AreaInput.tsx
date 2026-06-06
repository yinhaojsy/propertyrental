import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AREA_UNITS,
  areaInUnit,
  sqftFromAreaInput,
  type AreaUnit,
} from '@property-rental/shared';
import { NumberInput } from './NumberInput';

interface AreaInputProps {
  areaSqft: number | null;
  onAreaSqftChange: (sqft: number | null) => void;
}

export function AreaInput({ areaSqft, onAreaSqftChange }: AreaInputProps) {
  const { t } = useTranslation();
  const [inputUnit, setInputUnit] = useState<AreaUnit>('sqft');
  const [inputValue, setInputValue] = useState<number | null>(null);

  useEffect(() => {
    setInputValue(areaInUnit(areaSqft, inputUnit));
  }, [areaSqft, inputUnit]);

  return (
    <div>
      <span className="text-sm">{t('admin.area')}</span>
      <div className="mt-1 flex gap-2">
        <NumberInput
          min={0}
          value={inputValue}
          onValueChange={(value) => {
            setInputValue(value);
            onAreaSqftChange(sqftFromAreaInput(value, inputUnit));
          }}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2"
        />
        <select
          value={inputUnit}
          onChange={(e) => setInputUnit(e.target.value as AreaUnit)}
          className="w-36 shrink-0 rounded-lg border px-2 py-2 text-sm"
        >
          {AREA_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {t(`areaUnits.${unit}`)}
            </option>
          ))}
        </select>
      </div>

      {areaSqft != null && (
        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <p className="mb-1 font-medium text-gray-700">{t('admin.areaConversions')}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {AREA_UNITS.map((unit) => {
              const value = areaInUnit(areaSqft, unit);
              if (value == null) return null;
              return (
                <li key={unit} className={unit === 'sqft' ? 'font-medium text-brand' : undefined}>
                  {t(`areaUnits.${unit}`)}: {value.toLocaleString()}
                  {unit === 'sqft' ? ` (${t('admin.areaStoredAs')})` : ''}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
