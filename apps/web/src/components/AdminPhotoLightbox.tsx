import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '../lib/format';

export interface AdminPhotoPreview {
  url: string | null;
  originalUrl?: string | null;
  fileSizeBytes?: number | null;
  roomLabel?: string | null;
}

interface AdminPhotoLightboxProps {
  photo: AdminPhotoPreview | null;
  onClose: () => void;
}

function fullSrc(photo: AdminPhotoPreview): string {
  return photo.originalUrl ?? photo.url ?? '';
}

export function AdminPhotoLightbox({ photo, onClose }: AdminPhotoLightboxProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!photo) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [photo, onClose]);

  if (!photo) return null;

  const src = fullSrc(photo);
  if (!src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={t('admin.viewPhoto')}
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 text-sm">
          {photo.roomLabel && <span className="font-medium">{photo.roomLabel}</span>}
          {photo.fileSizeBytes != null && photo.fileSizeBytes > 0 && (
            <span className={photo.roomLabel ? 'ml-2 text-white/70' : 'text-white/70'}>
              {formatFileSize(photo.fileSizeBytes)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-white/10"
        >
          {t('listing.closeGallery')}
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full w-full items-center justify-center">
          <img
            src={src}
            alt=""
            className="block max-h-full max-w-full select-none object-contain"
            style={{ maxHeight: 'calc(100dvh - 4.5rem)', maxWidth: 'calc(100vw - 2rem)' }}
            draggable={false}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
