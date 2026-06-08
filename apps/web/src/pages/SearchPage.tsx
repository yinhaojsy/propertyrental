import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { SearchForm } from '../components/SearchForm';
import { ListingCardItem } from '../components/ListingCard';
import { SearchResultsToolbar } from '../components/SearchResultsToolbar';
import { SearchFiltersSheet } from '../components/SearchFiltersSheet';
import { SearchSortSheet } from '../components/SearchSortSheet';
import { useSearchListingsQuery, useGetCitiesQuery } from '../store/api';
import {
  queryToSearchState,
  searchStateToQuery,
  setSearchState,
} from '../store/searchSlice';
import type { RootState } from '../store';

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const search = useSelector((s: RootState) => s.search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const isResultsView = searchParams.get('view') === 'results';

  useEffect(() => {
    const fromUrl = queryToSearchState(searchParams);
    if (Object.keys(fromUrl).length > 0) {
      dispatch(setSearchState(fromUrl));
    }
  }, []);

  const queryParams: Partial<import('@property-rental/shared').SearchListingsInput> = {
    city: search.city,
    sectorIds: search.sectorIds.map(String),
    listingType: search.listingType,
    propertySubtype: search.propertySubtype as import('@property-rental/shared').SearchListingsInput['propertySubtype'],
    areaMin: search.areaMin ?? undefined,
    areaMax: search.areaMax ?? undefined,
    areaUnit: search.areaUnit,
    beds: search.beds,
    baths: search.baths,
    priceMin: search.priceMin ?? undefined,
    priceMax: search.priceMax ?? undefined,
    isPenthouse: search.isPenthouse || undefined,
    sort: search.sort,
    page: Number(searchParams.get('page') ?? 1),
    limit: 20,
  };

  const { data, isLoading, isFetching } = useSearchListingsQuery(queryParams, {
    skip: !isResultsView,
  });

  const { data: previewData, isLoading: previewLoading } = useSearchListingsQuery(queryParams, {
    skip: isResultsView,
  });

  const { data: cities = [] } = useGetCitiesQuery();

  const applySearch = () => {
    const params = searchStateToQuery(search);
    params.set('view', 'results');
    params.delete('page');
    setSearchParams(params);
  };

  const goToLanding = () => {
    setSearchParams({});
  };

  const cityLabel =
    search.city === 'all'
      ? t('search.cityAll')
      : (() => {
          const city = cities.find((c) => c.slug === search.city);
          if (!city) return search.city;
          return i18n.language.startsWith('zh') ? city.nameZh : city.nameEn;
        })();

  if (!isResultsView) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-6 py-8 text-white md:px-8">
          <h1 className="text-2xl font-bold md:text-3xl">{t('search.title')}</h1>
          <p className="mt-2 max-w-xl text-white/90">{t('tagline')}</p>
        </section>

        <SearchForm
          onSearch={() => {
            const params = searchStateToQuery(search);
            params.set('view', 'results');
            setSearchParams(params);
          }}
        />

        {previewLoading && (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        )}

        {!previewLoading && previewData && previewData.data.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">{t('search.availableListings')}</h2>
            <div className="grid gap-4">
              {previewData.data.map((listing) => (
                <ListingCardItem key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        )}

        {!previewLoading && previewData?.data.length === 0 && (
          <p className="rounded-xl bg-white p-8 text-center text-gray-500">
            {t('search.noResults')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="-mx-4 border-b bg-white px-4 py-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={goToLanding}
            className="mt-0.5 text-lg text-gray-600"
            aria-label={t('search.back')}
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {t(`search.${search.listingType}ForRent`, { defaultValue: t('search.title') })}
            </h1>
            <p className="text-sm text-gray-500">
              {data
                ? t('search.adsInCity', { count: data.pagination.total, city: cityLabel })
                : t('common.loading')}
            </p>
          </div>
        </div>
      </div>

      <SearchResultsToolbar
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenSort={() => setSortOpen(true)}
        onFiltersChange={applySearch}
      />

      {(isLoading || isFetching) && (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      )}

      {!isLoading && data?.data.length === 0 && (
        <p className="rounded-xl bg-white p-8 text-center text-gray-500">{t('search.noResults')}</p>
      )}

      <div className="grid gap-4">
        {data?.data.map((listing) => (
          <ListingCardItem key={listing.id} listing={listing} />
        ))}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pb-4">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => {
                const params = searchStateToQuery(search);
                params.set('view', 'results');
                params.set('page', String(page));
                setSearchParams(params);
              }}
              className={`rounded-lg px-3 py-1 ${
                page === data.pagination.page ? 'bg-brand text-white' : 'border bg-white'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      <SearchFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={applySearch}
        resultCount={data?.pagination.total}
      />

      <SearchSortSheet open={sortOpen} onClose={() => setSortOpen(false)} onApply={applySearch} />
    </div>
  );
}
