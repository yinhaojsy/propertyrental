import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetAdminListingsQuery } from '../../store/api';

export function AdminListingsPage() {
  const { t } = useTranslation();
  const { data: listings, isLoading } = useGetAdminListingsQuery();

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.listings')}</h1>
        <Link
          to="/staff/listings/new"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          {t('admin.newListing')}
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">ID</th>
              <th className="p-3">{t('admin.titleEn')}</th>
              <th className="p-3">{t('admin.rentAmount')}</th>
              <th className="p-3">{t('admin.finalRent')}</th>
              <th className="p-3">{t('admin.status')}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(listings as Array<{
              id: number;
              titleEn: string;
              rentAmount: number;
              finalRent: number | null;
              status: string;
            }>)?.map((listing) => (
              <tr key={listing.id} className="border-b">
                <td className="p-3">{listing.id}</td>
                <td className="p-3">{listing.titleEn}</td>
                <td className="p-3">{listing.rentAmount.toLocaleString()}</td>
                <td className="p-3">
                  {listing.finalRent != null ? listing.finalRent.toLocaleString() : '—'}
                </td>
                <td className="p-3">{t(`admin.${listing.status}`)}</td>
                <td className="p-3">
                  <Link
                    to={`/staff/listings/${listing.id}/edit`}
                    className="text-brand"
                  >
                    Edit
                  </Link>
                </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
