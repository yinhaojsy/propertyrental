import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetAdminListingsQuery,
  useGetAdminBadgesQuery,
  useSetListingBadgesMutation,
  useDeleteListingMutation,
  type ListingBadge,
} from '../../store/api';

interface AdminListingRow {
  id: number;
  titleEn: string;
  rentAmount: number;
  finalRent: number | null;
  status: string;
  badges?: ListingBadge[];
}

export function AdminListingsPage() {
  const { t } = useTranslation();
  const { data: listings, isLoading } = useGetAdminListingsQuery();
  const { data: allBadges = [] } = useGetAdminBadgesQuery();
  const [setListingBadges] = useSetListingBadgesMutation();
  const [deleteListing] = useDeleteListingMutation();

  const activeBadges = allBadges.filter((b) => b.isActive !== false);

  const handleDeleteListing = async (listing: AdminListingRow) => {
    if (!window.confirm(t('admin.confirmDeleteListing', { title: listing.titleEn }))) return;
    await deleteListing(listing.id).unwrap();
  };

  const toggleBadge = async (listingId: number, badgeId: number, currentIds: number[]) => {
    const next = new Set(currentIds);
    if (next.has(badgeId)) next.delete(badgeId);
    else next.add(badgeId);
    await setListingBadges({ listingId, badgeIds: [...next] }).unwrap();
  };

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
              <th className="p-3">{t('admin.badges')}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(listings as AdminListingRow[])?.map((listing) => {
              const assignedIds = (listing.badges ?? []).map((b) => b.id);
              return (
                <tr key={listing.id} className="border-b align-top">
                  <td className="p-3">{listing.id}</td>
                  <td className="p-3">{listing.titleEn}</td>
                  <td className="p-3">{listing.rentAmount.toLocaleString()}</td>
                  <td className="p-3">
                    {listing.finalRent != null ? listing.finalRent.toLocaleString() : '—'}
                  </td>
                  <td className="p-3">{t(`admin.${listing.status}`)}</td>
                  <td className="p-3">
                    {activeBadges.length === 0 ? (
                      <span className="text-xs text-gray-400">{t('admin.noBadgesYet')}</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {activeBadges.map((badge) => (
                          <label
                            key={badge.id}
                            className="flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={assignedIds.includes(badge.id)}
                              onChange={() =>
                                void toggleBadge(listing.id, badge.id, assignedIds)
                              }
                            />
                            <span
                              className="rounded px-1 py-0.5 text-[10px] font-bold uppercase"
                              style={{
                                backgroundColor: badge.backgroundColor,
                                color: badge.textColor,
                              }}
                            >
                              {badge.labelEn}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-3">
                      <Link to={`/staff/listings/${listing.id}/edit`} className="text-brand">
                        {t('admin.edit')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDeleteListing(listing)}
                        className="text-red-600 hover:underline"
                      >
                        {t('admin.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
