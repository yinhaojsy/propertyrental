import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { AREA_UNITS, BED_OPTIONS, BATH_OPTIONS } from '@property-rental/shared';
import type { RootState } from '../store';
import { setSearchField, setCity, resetSearch } from '../store/searchSlice';
import { useGetCitiesQuery, useGetSectorsQuery, useGetPropertyTypesQuery } from '../store/api';
import { SearchableSelect } from './SearchableSelect';
import { NumberInput } from './NumberInput';

interface SearchFormProps {
  onSearch: () => void;
  mode?: 'landing' | 'panel';
  resultCount?: number;
}

export function SearchForm({ onSearch, mode = 'landing', resultCount }: SearchFormProps) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const search = useSelector((s: RootState) => s.search);

  const { data: cities = [] } = useGetCitiesQuery();
  const { data: propertyTypeData } = useGetPropertyTypesQuery();
  const propertyTypes = propertyTypeData?.types ?? [];
  const propertySubtypes = propertyTypeData?.subtypes ?? [];

  const cityForSectors = search.city === 'all' ? undefined : search.city;
  const { data: sectors = [] } = useGetSectorsQuery(cityForSectors!, {
    skip: !cityForSectors,
  });

  const subtypes = useMemo(
    () =>
      propertySubtypes.filter(
        (s) => propertyTypes.find((pt) => pt.id === s.propertyTypeId)?.slug === search.listingType,
      ),
    [propertySubtypes, propertyTypes, search.listingType],
  );

  const sectorOptions = useMemo(
    () => sectors.map((s) => ({ value: s.id, label: s.nameEn })),
    [sectors],
  );

  const showResidentialFilters = search.listingType === 'residential';
  const bedOptions =
    search.propertySubtype === 'flat'
      ? BED_OPTIONS
      : BED_OPTIONS.filter((b) => b !== 'studio');

  const labelFor = (nameEn: string, nameZh: string | null | undefined, slug: string) => {
    if (i18n.language.startsWith('zh') && nameZh) return nameZh;
    const translated = t(`propertyTypes.${slug}`, { defaultValue: '' });
    return translated || nameEn;
  };

  const isPanel = mode === 'panel';

  return (
    <div className={isPanel ? 'space-y-4' : 'rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-100 md:p-6'}>
      {!isPanel && <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('search.title')}</h2>}

      <div className="mb-4 flex flex-wrap gap-2">
        {propertyTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              dispatch(setSearchField({ key: 'listingType', value: type.slug }));
              const firstSubtype = propertySubtypes.find((s) => s.propertyTypeId === type.id);
              if (firstSubtype) {
                dispatch(setSearchField({ key: 'propertySubtype', value: firstSubtype.slug }));
              }
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              search.listingType === type.slug
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {labelFor(type.nameEn, type.nameZh, type.slug)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">{t('search.city')}</span>
          <select
            value={search.city}
            onChange={(e) => dispatch(setCity(e.target.value as typeof search.city))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          >
            <option value="all">{t('search.cityAll')}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {labelFor(city.nameEn, city.nameZh, city.slug)}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">{t('search.location')}</span>
          <SearchableSelect
            multiple
            options={sectorOptions}
            values={search.sectorIds}
            onChangeMultiple={(next) =>
              dispatch(setSearchField({ key: 'sectorIds', value: next.map(Number) }))
            }
            disabled={!cityForSectors}
            placeholder={t('search.locationPlaceholder')}
            searchPlaceholder={t('search.searchSectors')}
            emptyMessage={t('search.noSectors')}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">{t('search.propertyType')}</span>
          <select
            value={search.propertySubtype}
            onChange={(e) =>
              dispatch(setSearchField({ key: 'propertySubtype', value: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
          >
            {subtypes.map((st) => (
              <option key={st.id} value={st.slug}>
                {labelFor(st.nameEn, st.nameZh, st.slug)}
              </option>
            ))}
          </select>
        </label>

        <div className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">{t('search.area')}</span>
          <div className="flex gap-2">
            <NumberInput
              min={0}
              value={search.areaMin}
              onValueChange={(value) => dispatch(setSearchField({ key: 'areaMin', value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              placeholder={t('search.areaFrom')}
            />
            <NumberInput
              min={0}
              value={search.areaMax}
              onValueChange={(value) => dispatch(setSearchField({ key: 'areaMax', value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              placeholder={t('search.areaAny')}
            />
            <select
              value={search.areaUnit}
              onChange={(e) =>
                dispatch(
                  setSearchField({
                    key: 'areaUnit',
                    value: e.target.value as typeof search.areaUnit,
                  }),
                )
              }
              className="rounded-lg border border-gray-300 px-2 py-2.5 text-sm"
            >
              {AREA_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`areaUnits.${u}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showResidentialFilters && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{t('search.beds')}</span>
              <select
                value={search.beds}
                onChange={(e) =>
                  dispatch(
                    setSearchField({ key: 'beds', value: e.target.value as typeof search.beds }),
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              >
                {bedOptions.map((b) => (
                  <option key={b} value={b}>
                    {b === 'all' ? t('search.all') : b === 'studio' ? t('search.studio') : b}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{t('search.baths')}</span>
              <select
                value={search.baths}
                onChange={(e) =>
                  dispatch(
                    setSearchField({ key: 'baths', value: e.target.value as typeof search.baths }),
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              >
                {BATH_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b === 'all' ? t('search.all') : b}
                  </option>
                ))}
              </select>
            </label>

            {search.propertySubtype === 'flat' && (
              <label className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  checked={search.isPenthouse}
                  onChange={(e) =>
                    dispatch(setSearchField({ key: 'isPenthouse', value: e.target.checked }))
                  }
                />
                <span className="text-sm">{t('search.penthouse')}</span>
              </label>
            )}
          </>
        )}

        <div className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">{t('search.price')}</span>
          <div className="flex gap-2">
            <NumberInput
              min={0}
              value={search.priceMin}
              onValueChange={(value) => dispatch(setSearchField({ key: 'priceMin', value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              placeholder={t('search.priceFrom')}
            />
            <NumberInput
              min={0}
              value={search.priceMax}
              onValueChange={(value) => dispatch(setSearchField({ key: 'priceMax', value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              placeholder={t('search.areaAny')}
            />
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap gap-3 ${isPanel ? 'sticky bottom-0 border-t bg-white pt-4' : 'mt-5'}`}>
        {!isPanel && (
          <button
            type="button"
            onClick={onSearch}
            className="rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            {t('search.searchBtn')}
          </button>
        )}
        <button
          type="button"
          onClick={() => dispatch(resetSearch())}
          className={`rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 ${
            isPanel ? '' : ''
          }`}
        >
          {t('search.resetBtn')}
        </button>
        {isPanel && (
          <button
            type="button"
            onClick={onSearch}
            className="ml-auto rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            {t('search.showAds', { count: resultCount ?? 0 })}
          </button>
        )}
      </div>
    </div>
  );
}
