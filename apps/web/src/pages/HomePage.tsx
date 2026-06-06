import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchForm } from '../components/SearchForm';
import { ListingCardItem } from '../components/ListingCard';
import { useSearchListingsQuery } from '../store/api';
import { searchStateToQuery } from '../store/searchSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSelector((s: RootState) => s.search);

  const { data: recentData } = useSearchListingsQuery({
    listingType: 'residential',
    propertySubtype: 'house',
    limit: 6,
  });

  const handleSearch = () => {
    const params = searchStateToQuery(search);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-6 py-10 text-white md:px-10">
        <h1 className="text-2xl font-bold md:text-3xl">{t('appName')}</h1>
        <p className="mt-2 max-w-xl text-white/90">{t('tagline')}</p>
      </section>

      <SearchForm onSearch={handleSearch} />

      {recentData && recentData.data.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Recent Listings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {recentData.data.map((listing) => (
              <ListingCardItem key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
