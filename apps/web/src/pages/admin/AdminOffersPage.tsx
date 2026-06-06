import { useTranslation } from 'react-i18next';
import { useGetAdminOffersQuery } from '../../store/api';

export function AdminOffersPage() {
  const { t } = useTranslation();
  const { data: offers, isLoading } = useGetAdminOffersQuery();

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('admin.offers')}</h1>
      <div className="space-y-3">
        {(offers as Array<{
          id: number;
          name: string;
          email: string;
          phone: string;
          offeredRent: number | null;
          listingId: number;
          createdAt: string;
        }>)?.map((offer) => (
          <div key={offer.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="font-medium">{offer.name}</div>
            <div className="text-sm text-gray-600">
              {offer.email} · {offer.phone}
            </div>
            {offer.offeredRent && (
              <div className="text-sm">Offer: PKR {offer.offeredRent.toLocaleString()}</div>
            )}
            <div className="text-xs text-gray-400">
              Listing #{offer.listingId} · {new Date(offer.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
