import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { SEARCH_SORT_OPTIONS, type SearchSortOption } from '@property-rental/shared';
import type { RootState } from '../store';
import { setSearchField } from '../store/searchSlice';

interface SearchSortSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
}

const SORT_ICONS: Record<SearchSortOption, string> = {
  popular: '★',
  newest: '◷',
  price_asc: '↑',
  price_desc: '↓',
};

export function SearchSortSheet({ open, onClose, onApply }: SearchSortSheetProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const sort = useSelector((s: RootState) => s.search.sort);

  if (!open) return null;

  const selectSort = (value: SearchSortOption) => {
    dispatch(setSearchField({ key: 'sort', value }));
    onApply();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" aria-label={t('search.close')} onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-brand">⇅</span>
            {t('search.sortBy')}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400">
            ✕
          </button>
        </div>
        <ul className="py-2">
          {SEARCH_SORT_OPTIONS.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => selectSort(option)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">
                  {SORT_ICONS[option]}
                </span>
                <span className="flex-1 font-medium">{t(`search.sort_${option}`)}</span>
                <span
                  className={`h-5 w-5 rounded-full border-2 ${
                    sort === option ? 'border-brand bg-brand' : 'border-gray-300'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
