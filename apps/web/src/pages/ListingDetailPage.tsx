import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetListingQuery } from '../store/api';
import { OfferModal } from '../components/OfferModal';
import { ListingPhotoGallery } from '../components/ListingPhotoGallery';
import { formatRentPKR, slugLabel, whatsAppUrl } from '../lib/format';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function ListingDetailPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const [offerOpen, setOfferOpen] = useState(false);
  const { data: listing, isLoading, error } = useGetListingQuery(slug!);

  if (isLoading) return <p>{t('common.loading')}</p>;
  if (error || !listing) return <p>{t('common.error')}</p>;

  const title =
    i18n.language === 'zh' && listing.titleZh ? listing.titleZh : listing.titleEn;
  const description =
    i18n.language === 'zh' && listing.descriptionZh
      ? listing.descriptionZh
      : listing.descriptionEn;
  const sectorName =
    i18n.language === 'zh' && listing.sector.nameZh
      ? listing.sector.nameZh
      : listing.sector.nameEn;
  const cityName =
    i18n.language === 'zh' ? listing.city.nameZh : listing.city.nameEn;
  const locationLabel = `${sectorName}, ${cityName}`;
  const priceLabel = formatRentPKR(listing.rentAmount, listing.currency);
  const addedDate = new Date(listing.publishedAt ?? listing.createdAt).toLocaleDateString(
    i18n.language,
  );
  const areaLabel =
    listing.areaValue != null
      ? `${listing.areaValue.toLocaleString()} ${t(`areaUnits.${listing.areaUnit ?? 'sqft'}`)}`
      : null;

  const bedsLabel = listing.isStudio
    ? t('listing.studio')
    : listing.beds != null
      ? t('listing.beds', { count: listing.beds })
      : null;
  const bathsLabel =
    listing.baths != null ? t('listing.baths', { count: listing.baths }) : null;

  const inquiryMessage = t('listing.inquiryMessage', { title, id: listing.id });
  const whatsappLink =
    listing.contactPhone != null
      ? whatsAppUrl(listing.contactPhone, inquiryMessage)
      : null;

  const contactActions = (
    <>
      {listing.contactPhone && (
        <a
          href={`tel:${listing.contactPhone}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white"
        >
          {t('listing.call')} · {listing.contactPhone}
        </a>
      )}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-xl border border-green-600 py-3 font-semibold text-green-700 hover:bg-green-50"
        >
          WhatsApp
        </a>
      )}
      {listing.contactEmail && (
        <a
          href={`mailto:${listing.contactEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(inquiryMessage)}`}
          className="flex w-full items-center justify-center rounded-xl border border-gray-200 py-3 font-medium"
        >
          {t('listing.email')}
        </a>
      )}
      <button
        type="button"
        onClick={() => setOfferOpen(true)}
        className="w-full rounded-xl border border-brand py-3 font-semibold text-brand hover:bg-brand/5"
      >
        {t('listing.makeOffer')}
      </button>
    </>
  );

  return (
    <div className="pb-24 md:pb-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link to="/search" className="text-brand hover:underline">
          {t('nav.search')}
        </Link>
        <span>/</span>
        <span>{cityName}</span>
        <span>/</span>
        <span className="text-gray-800">{sectorName}</span>
      </nav>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <ListingPhotoGallery
            photos={listing.photos ?? []}
            fallbackUrl={listing.coverPhotoUrl}
            title={title}
            badges={listing.badges}
          />

          {(bedsLabel || bathsLabel || areaLabel) && (
            <div className="flex flex-wrap gap-3">
              {bedsLabel && (
                <div className="flex min-w-[7rem] flex-col items-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <span className="text-2xl">🛏</span>
                  <span className="mt-1 text-sm font-semibold">{bedsLabel}</span>
                </div>
              )}
              {bathsLabel && (
                <div className="flex min-w-[7rem] flex-col items-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <span className="text-2xl">🛁</span>
                  <span className="mt-1 text-sm font-semibold">{bathsLabel}</span>
                </div>
              )}
              {areaLabel && (
                <div className="flex min-w-[7rem] flex-col items-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <span className="text-2xl">📐</span>
                  <span className="mt-1 text-sm font-semibold">{areaLabel}</span>
                </div>
              )}
            </div>
          )}

          <div className="lg:hidden">
            <div className="text-3xl font-bold text-brand">{priceLabel}</div>
            <p className="text-sm text-gray-500">{t('listing.perMonth')}</p>
            <h1 className="mt-3 text-xl font-semibold text-gray-900">{title}</h1>
            <p className="mt-1 text-gray-600">{locationLabel}</p>
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">{t('listing.overview')}</h2>
            <DetailRow label={t('listing.type')} value={slugLabel(listing.propertySubtype)} />
            <DetailRow label={t('listing.price')} value={`${priceLabel} ${t('listing.perMonth')}`} />
            {bathsLabel && <DetailRow label={t('listing.bathroom')} value={bathsLabel} />}
            {areaLabel && <DetailRow label={t('listing.area')} value={areaLabel} />}
            <DetailRow label={t('listing.purpose')} value={t('listing.forRent')} />
            {bedsLabel && <DetailRow label={t('listing.bedroom')} value={bedsLabel} />}
            <DetailRow label={t('listing.added')} value={addedDate} />
            <DetailRow label={t('listing.location')} value={locationLabel} />
          </section>

          {description && (
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">{t('listing.description')}</h2>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{description}</p>
            </section>
          )}
        </div>

        <aside className="mt-6 lg:mt-0">
          <div className="sticky top-20 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="hidden lg:block">
              <div className="text-3xl font-bold text-brand">{priceLabel}</div>
              <p className="text-sm text-gray-500">{t('listing.perMonth')}</p>
              <h1 className="mt-4 text-xl font-semibold leading-snug text-gray-900">{title}</h1>
              <p className="mt-2 text-gray-600">{locationLabel}</p>
            </div>
            <div className="space-y-2">{contactActions}</div>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-200 bg-white p-3 shadow-lg md:hidden">
        <div className="flex gap-2">
          {listing.contactPhone && (
            <a
              href={`tel:${listing.contactPhone}`}
              className="flex flex-1 items-center justify-center rounded-xl bg-brand py-3 font-semibold text-white"
            >
              {t('listing.call')}
            </a>
          )}
          <button
            type="button"
            onClick={() => setOfferOpen(true)}
            className="flex flex-1 items-center justify-center rounded-xl border border-brand py-3 font-semibold text-brand"
          >
            {t('listing.makeOffer')}
          </button>
        </div>
      </div>

      {offerOpen && <OfferModal listingId={listing.id} onClose={() => setOfferOpen(false)} />}
    </div>
  );
}
