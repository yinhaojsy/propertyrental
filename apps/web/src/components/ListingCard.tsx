import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ListingCard } from '../store/api';
import { OfferModal } from './OfferModal';
import { ListingBadgesOverlay } from './ListingBadgesOverlay';

interface ListingCardItemProps {
  listing: ListingCard;
  showActions?: boolean;
}

export function ListingCardItem({ listing, showActions = true }: ListingCardItemProps) {
  const { t, i18n } = useTranslation();
  const [offerOpen, setOfferOpen] = useState(false);

  const title = i18n.language === 'zh' && listing.titleZh ? listing.titleZh : listing.titleEn;
  const sectorName =
    i18n.language === 'zh' && listing.sector.nameZh
      ? listing.sector.nameZh
      : listing.sector.nameEn;
  const cityName =
    i18n.language === 'zh' ? listing.city.nameZh : listing.city.nameEn;

  const bedsLabel = listing.isStudio
    ? t('listing.studio')
    : listing.beds != null
      ? t('listing.beds', { count: listing.beds })
      : null;
  const bathsLabel =
    listing.baths != null ? t('listing.baths', { count: listing.baths }) : null;
  const sizeLabel =
    listing.areaValue != null
      ? `${listing.areaValue.toLocaleString()} ${listing.areaUnit ?? 'sqft'}`
      : null;

  const meta = [bedsLabel, bathsLabel, sizeLabel].filter(Boolean).join(' · ');
  const date = listing.publishedAt ?? listing.createdAt;

  return (
    <>
      <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
        <Link to={`/listings/${listing.slug}`} className="flex flex-col sm:flex-row">
          <div className="relative h-48 w-full shrink-0 bg-gray-200 sm:h-auto sm:w-56 md:w-64">
            <ListingBadgesOverlay badges={listing.badges} />
            {listing.coverPhotoUrl ? (
              <img
                src={listing.coverPhotoUrl}
                alt={title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full min-h-[12rem] items-center justify-center text-gray-400">
                No photo
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="text-2xl font-bold text-brand">
              {listing.currency} {listing.rentAmount.toLocaleString()}
              <span className="text-sm font-normal text-gray-500">{t('listing.perMonth')}</span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              {sectorName}, {cityName}
            </div>
            {meta && <div className="mt-1 text-sm text-gray-500">{meta}</div>}
            <h3 className="mt-2 line-clamp-2 font-medium text-gray-900">{title}</h3>
            <div className="mt-auto pt-3 text-xs text-gray-400">
              {t('listing.posted', {
                date: new Date(date).toLocaleDateString(i18n.language),
              })}
            </div>
          </div>
        </Link>

        {showActions && (
          <div className="flex gap-2 border-t border-gray-100 p-3">
            {listing.contactEmail && (
              <a
                href={`mailto:${listing.contactEmail}`}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-sm font-medium"
              >
                {t('listing.email')}
              </a>
            )}
            {listing.contactPhone && (
              <a
                href={`tel:${listing.contactPhone}`}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-sm font-medium"
              >
                {t('listing.call')}
              </a>
            )}
            <button
              type="button"
              onClick={() => setOfferOpen(true)}
              className="flex-1 rounded-lg bg-brand py-2 text-center text-sm font-medium text-white"
            >
              {t('listing.makeOffer')}
            </button>
          </div>
        )}
      </article>

      {offerOpen && (
        <OfferModal listingId={listing.id} onClose={() => setOfferOpen(false)} />
      )}
    </>
  );
}
