import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useGetSectorsQuery } from '../store/api';
import type { RootState } from '../store';
import { setSearchField } from '../store/searchSlice';

interface SearchResultsToolbarProps {
  onOpenFilters: () => void;
  onOpenSort: () => void;
  onFiltersChange: () => void;
}

export function SearchResultsToolbar({ onOpenFilters, onOpenSort, onFiltersChange }: SearchResultsToolbarProps) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const search = useSelector((s: RootState) => s.search);

  const cityForSectors = search.city === 'all' ? undefined : search.city;
  const { data: sectors = [] } = useGetSectorsQuery(cityForSectors!, { skip: !cityForSectors });

  const selectedSectors = sectors.filter((s) => search.sectorIds.includes(s.id));

  const clearSectors = () => {
    dispatch(setSearchField({ key: 'sectorIds', value: [] }));
    onFiltersChange();
  };

  const removeSector = (id: number) => {
    dispatch(setSearchField({
      key: 'sectorIds',
      value: search.sectorIds.filter((sectorId) => sectorId !== id),
    }));
    onFiltersChange();
  };

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex shrink-0 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          <span>⚙</span>
          {t('search.filters')}
        </button>
        <button
          type="button"
          onClick={onOpenSort}
          className="flex shrink-0 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          <span>⇅</span>
          {t('search.sort')}
        </button>
      </div>

      {selectedSectors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedSectors.map((sector) => (
            <button
              key={sector.id}
              type="button"
              onClick={() => removeSector(sector.id)}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
            >
              {i18n.language.startsWith('zh') && sector.nameZh ? sector.nameZh : sector.nameEn}
              <span className="text-gray-400">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearSectors}
            className="text-sm font-medium text-brand"
          >
            {t('search.clearAll')}
          </button>
        </div>
      )}
    </div>
  );
}
