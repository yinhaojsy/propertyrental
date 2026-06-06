import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: number | string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: number | string | null;
  values?: (number | string)[];
  multiple?: boolean;
  onChange?: (value: number | string | null) => void;
  onChangeMultiple?: (values: (number | string)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value = null,
  values = [],
  multiple = false,
  onChange,
  onChangeMultiple,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  disabled = false,
  emptyMessage = 'No results',
  className = '',
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedValues = multiple ? values : value != null && value !== '' ? [value] : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabels = useMemo(
    () =>
      selectedValues
        .map((v) => options.find((o) => o.value === v)?.label)
        .filter(Boolean) as string[],
    [options, selectedValues],
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const toggleValue = (optionValue: number | string) => {
    if (multiple) {
      const next = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChangeMultiple?.(next);
      return;
    }
    onChange?.(optionValue);
    setOpen(false);
    setQuery('');
  };

  const removeValue = (optionValue: number | string) => {
    if (!multiple) return;
    onChangeMultiple?.(selectedValues.filter((v) => v !== optionValue));
  };

  const triggerLabel = multiple
    ? selectedLabels.length > 0
      ? `${selectedLabels.length} selected`
      : placeholder
    : selectedLabels[0] ?? placeholder;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm disabled:bg-gray-100 disabled:text-gray-400 ${
          open ? 'border-brand ring-1 ring-brand/30' : 'border-gray-300'
        }`}
      >
        <span className={selectedLabels.length ? 'text-gray-900' : 'text-gray-500'}>{triggerLabel}</span>
        <span className="text-gray-400">{open ? '▴' : '▾'}</span>
      </button>

      {multiple && selectedValues.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedValues.map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? String(v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs text-brand"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeValue(v)}
                  className="rounded-full hover:bg-brand/20"
                  aria-label={`Remove ${label}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</li>
            ) : (
              filtered.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => toggleValue(option.value)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        isSelected ? 'bg-brand/5 text-brand' : 'text-gray-900'
                      }`}
                    >
                      {multiple && (
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected ? 'border-brand bg-brand text-white' : 'border-gray-300'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                      )}
                      <span>{option.label}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
