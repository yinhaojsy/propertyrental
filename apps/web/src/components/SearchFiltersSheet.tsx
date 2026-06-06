import { useTranslation } from 'react-i18next';
import { SearchForm } from './SearchForm';

interface SearchFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  resultCount?: number;
}

export function SearchFiltersSheet({ open, onClose, onApply, resultCount }: SearchFiltersSheetProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const handleApply = () => {
    onApply();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <button type="button" onClick={onClose} className="text-lg text-gray-600" aria-label={t('search.back')}>
          ←
        </button>
        <h2 className="font-semibold">{t('search.filters')}</h2>
        <button type="button" onClick={handleApply} className="font-semibold text-brand">
          {t('search.done')}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <SearchForm onSearch={handleApply} mode="panel" resultCount={resultCount} />
      </div>
    </div>
  );
}
