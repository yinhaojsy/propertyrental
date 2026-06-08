import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRoomSlotLabel } from '@property-rental/shared';
import { useGetPhotoConfigQuery, type ListingBadge } from '../store/api';
import { ListingBadgesOverlay } from './ListingBadgesOverlay';

interface GalleryPhoto {
  id: number;
  url: string | null;
  originalUrl?: string | null;
  floor?: string | null;
  roomType?: string | null;
  roomLabel?: string | null;
  roomLabelZh?: string | null;
}

interface ListingPhotoGalleryProps {
  photos: GalleryPhoto[];
  fallbackUrl?: string | null;
  title: string;
  badges?: ListingBadge[];
}

function photoSrc(photo: GalleryPhoto, fullSize = false): string {
  if (fullSize) return photo.originalUrl ?? photo.url ?? '';
  return photo.url ?? photo.originalUrl ?? '';
}

export function ListingPhotoGallery({ photos, fallbackUrl, title, badges }: ListingPhotoGalleryProps) {
  const { t, i18n } = useTranslation();
  const { data: photoConfig } = useGetPhotoConfigQuery();
  const formatOptions = useMemo(
    () => ({
      locale: i18n.language,
      floors: (photoConfig?.floors ?? []).map((f) => ({
        slug: f.slug,
        nameEn: f.nameEn,
        nameZh: f.nameZh,
      })),
      roomTypes: (photoConfig?.roomTypes ?? []).map((rt) => ({
        slug: rt.slug,
        labelEn: rt.labelEn,
        labelZh: rt.labelZh,
        autoNumber: rt.autoNumber,
      })),
    }),
    [i18n.language, photoConfig],
  );

  const captionFor = useCallback(
    (photo: GalleryPhoto) => {
      if (!photo.roomLabel && !photo.roomType) return null;
      return formatRoomSlotLabel(
        {
          floor: photo.floor,
          roomType: photo.roomType,
          roomLabel: photo.roomLabel,
          roomLabelZh: photo.roomLabelZh,
        },
        formatOptions,
      );
    },
    [formatOptions],
  );

  const items =
    photos.length > 0
      ? photos
      : fallbackUrl
        ? [{ id: 0, url: fallbackUrl, originalUrl: fallbackUrl }]
        : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const active = items[activeIndex];
  const src = photoSrc(active!, true);
  const activeCaption = active ? captionFor(active) : null;

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? items.length - 1 : i - 1));
  }, [items.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === items.length - 1 ? 0 : i + 1));
  }, [items.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, goPrev, goNext]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  if (items.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        {t('listing.noPhotos')}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-gray-900">
        <div className="relative aspect-[16/10] bg-black">
          <ListingBadgesOverlay badges={badges} />
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group h-full w-full cursor-zoom-in"
            aria-label={t('listing.openGallery')}
          >
            <img src={src} alt={title} className="h-full w-full object-contain" />
            <span className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] rounded bg-black/60 px-2 py-1 text-xs text-white">
              {activeCaption ?? t('listing.tapToExpand')}
            </span>
          </button>
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
                aria-label={t('listing.prevPhoto')}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70"
                aria-label={t('listing.nextPhoto')}
              >
                ›
              </button>
              <span className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
                {t('listing.photosCount', { current: activeIndex + 1, total: items.length })}
              </span>
            </>
          )}
        </div>

        {items.length > 1 && (
          <div className="flex gap-1 overflow-x-auto bg-gray-900 p-2">
            {items.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-16 w-20 shrink-0 overflow-hidden rounded border-2 ${
                  index === activeIndex
                    ? 'border-brand'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={photoSrc(photo)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={t('listing.gallery')}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm">
              {activeCaption
                ? `${activeCaption} · ${t('listing.photosCount', { current: activeIndex + 1, total: items.length })}`
                : t('listing.photosCount', { current: activeIndex + 1, total: items.length })}
            </span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-white/10"
            >
              {t('listing.closeGallery')}
            </button>
          </div>

          <div
            className="relative flex flex-1 touch-pan-y items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={photoSrc(items[activeIndex]!, true)}
              alt={title}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70 sm:flex"
                  aria-label={t('listing.prevPhoto')}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70 sm:flex"
                  aria-label={t('listing.nextPhoto')}
                >
                  ›
                </button>
                <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/70 sm:hidden">
                  {t('listing.swipeHint')}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
