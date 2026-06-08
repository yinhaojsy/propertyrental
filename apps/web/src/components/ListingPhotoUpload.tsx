import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  usePresignPhotoMutation,
  useConfirmPhotoMutation,
  useReorderPhotosMutation,
  useDeleteListingPhotoMutation,
  useDeleteAllListingPhotosMutation,
} from '../store/api';
import { StructuredPhotoUpload } from './StructuredPhotoUpload';
import { formatFileSize } from '../lib/format';
import { AdminPhotoLightbox, type AdminPhotoPreview } from './AdminPhotoLightbox';

export interface PhotoItem {
  id: number;
  url: string | null;
  originalUrl?: string | null;
  storageKey?: string;
  floor?: string | null;
  roomType?: string | null;
  roomLabel?: string | null;
  roomLabelZh?: string | null;
  sortOrder: number;
  isCover: boolean;
  uploadMode?: 'structured' | 'bulk' | null;
  fileSizeBytes?: number | null;
}

interface ListingPhotoUploadProps {
  listingId: number | null;
  listingType: string;
  propertySubtype: string;
  photos: PhotoItem[];
  uploadMode: 'structured' | 'bulk';
  onUploadModeChange: (mode: 'structured' | 'bulk') => void;
  onEnsureListing: () => Promise<number>;
  onDerivedBedsBaths: (beds: number | null, baths: number | null) => void;
  onRefetch: () => void;
  readOnly?: boolean;
}

function SortablePhoto({
  photo,
  onDelete,
  onSetCover,
  onPreview,
  busy,
  readOnly,
}: {
  photo: PhotoItem;
  onDelete: () => void;
  onSetCover: () => void;
  onPreview: () => void;
  busy: boolean;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled: readOnly,
  });
  const style = readOnly ? undefined : { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-lg border bg-white ${
        isDragging ? 'z-10 opacity-80 shadow-lg' : ''
      }`}
    >
      {photo.url && (
        <button
          type="button"
          onClick={onPreview}
          className="block w-full cursor-zoom-in"
          aria-label={t('admin.viewPhoto')}
        >
          <img src={photo.url} alt="" className="aspect-square w-full object-cover" draggable={false} />
        </button>
      )}
      {!readOnly && (
        <>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
            aria-label={t('admin.deletePhoto')}
          >
            ×
          </button>
          {photo.isCover ? (
            <span className="absolute left-1 top-1 rounded bg-brand px-1 text-xs text-white">
              {t('admin.coverPhoto')}
            </span>
          ) : (
            <button
              type="button"
              onClick={onSetCover}
              disabled={busy}
              className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white hover:bg-brand disabled:opacity-50"
            >
              {t('admin.setAsCover')}
            </button>
          )}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white cursor-grab active:cursor-grabbing"
            aria-label={t('admin.dragToReorder')}
          >
            ⋮⋮
          </button>
          {photo.fileSizeBytes != null && photo.fileSizeBytes > 0 && (
            <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              {formatFileSize(photo.fileSizeBytes)}
            </span>
          )}
        </>
      )}
      {readOnly && photo.isCover && (
        <span className="absolute left-1 top-1 rounded bg-brand px-1 text-xs text-white">
          {t('admin.coverPhoto')}
        </span>
      )}
    </div>
  );
}

function reorderPhotosInGroup(
  allPhotos: PhotoItem[],
  groupPhotos: PhotoItem[],
  activeId: number,
  overId: number,
): PhotoItem[] {
  const sortedAll = [...allPhotos].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedGroup = [...groupPhotos].sort((a, b) => a.sortOrder - b.sortOrder);
  const oldIndex = sortedGroup.findIndex((p) => p.id === activeId);
  const newIndex = sortedGroup.findIndex((p) => p.id === overId);
  if (oldIndex < 0 || newIndex < 0) return sortedAll;

  const reorderedGroup = arrayMove(sortedGroup, oldIndex, newIndex);
  const groupIds = new Set(sortedGroup.map((p) => p.id));
  let groupIdx = 0;

  return sortedAll.map((photo) => {
    if (!groupIds.has(photo.id)) return photo;
    return reorderedGroup[groupIdx++]!;
  });
}

export function ListingPhotoUpload({
  listingId,
  propertySubtype,
  photos,
  uploadMode,
  onUploadModeChange,
  onEnsureListing,
  onDerivedBedsBaths,
  onRefetch,
  readOnly = false,
}: ListingPhotoUploadProps) {
  const { t } = useTranslation();
  const [presignPhoto] = usePresignPhotoMutation();
  const [confirmPhoto] = useConfirmPhotoMutation();
  const [reorderPhotos] = useReorderPhotosMutation();
  const [deleteListingPhoto] = useDeleteListingPhotoMutation();
  const [deleteAllListingPhotos] = useDeleteAllListingPhotosMutation();

  const [uploading, setUploading] = useState(false);
  const [photoActionId, setPhotoActionId] = useState<number | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<AdminPhotoPreview | null>(null);

  const photoBusy = uploading || clearingAll || photoActionId != null;

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => a.sortOrder - b.sortOrder),
    [photos],
  );

  const bulkPhotos = useMemo(
    () => sortedPhotos.filter((p) => p.uploadMode === 'bulk'),
    [sortedPhotos],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleUpload = async (files: FileList | File[] | null) => {
    if (readOnly || !files?.length) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError(t('admin.uploadImagesOnly'));
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const id = await onEnsureListing();
      let sortOrder = sortedPhotos.length;

      for (const file of imageFiles) {
        const { uploadUrl, storageKey } = await presignPhoto({
          listingId: id,
          filename: file.name,
          contentType: file.type,
        }).unwrap();

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        }).then((res) => {
          if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        });

        const result = (await confirmPhoto({
          listingId: id,
          data: {
            storageKey,
            roomLabel: file.name,
            sortOrder,
            uploadMode: 'bulk',
            isCover: sortedPhotos.length === 0 && sortOrder === 0,
            fileSizeBytes: file.size,
          },
        }).unwrap()) as { derived?: { beds: number; baths: number } };

        if (result.derived) {
          onDerivedBedsBaths(
            result.derived.beds > 0 ? result.derived.beds : null,
            result.derived.baths > 0 ? result.derived.baths : null,
          );
        }
        sortOrder += 1;
      }
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent, groupPhotos: PhotoItem[]) => {
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id || !listingId) return;

    const reordered = reorderPhotosInGroup(
      sortedPhotos,
      groupPhotos,
      Number(active.id),
      Number(over.id),
    ).map((photo, index) => ({
      ...photo,
      sortOrder: index,
    }));

    try {
      await reorderPhotos({
        listingId,
        photos: reordered.map((p) => ({
          id: p.id,
          sortOrder: p.sortOrder,
        })),
      }).unwrap();
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const applyDerived = (derived?: { beds: number; baths: number }) => {
    if (!derived) return;
    onDerivedBedsBaths(
      derived.beds > 0 ? derived.beds : null,
      derived.baths > 0 ? derived.baths : null,
    );
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!listingId || !window.confirm(t('admin.confirmDeletePhoto'))) return;
    setError(null);
    setPhotoActionId(photoId);
    try {
      const result = await deleteListingPhoto({ listingId, photoId }).unwrap();
      applyDerived(result.derived);
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setPhotoActionId(null);
    }
  };

  const handleSetCover = async (photoId: number) => {
    if (!listingId) return;
    setError(null);
    setPhotoActionId(photoId);
    try {
      await reorderPhotos({
        listingId,
        photos: sortedPhotos.map((p) => ({
          id: p.id,
          sortOrder: p.sortOrder,
          isCover: p.id === photoId,
        })),
      }).unwrap();
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setPhotoActionId(null);
    }
  };

  const handleClearAllPhotos = async () => {
    if (!listingId || !window.confirm(t('admin.confirmClearAllPhotos'))) return;
    setError(null);
    setClearingAll(true);
    try {
      const result = await deleteAllListingPhotos(listingId).unwrap();
      applyDerived(result.derived);
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setClearingAll(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading || uploadMode !== 'bulk') return;
    void handleUpload(e.dataTransfer.files);
  };

  const bulkGrouped = [[t('admin.bulkUpload'), bulkPhotos] as const].filter(
    ([, items]) => items.length > 0,
  );

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-2 font-semibold">{t('admin.photos')}</h2>
      <p className="mb-4 text-sm text-gray-600">{t('admin.photosHelp')}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onUploadModeChange('structured')}
          disabled={readOnly}
          className={`rounded-lg px-3 py-1 text-sm disabled:opacity-50 ${uploadMode === 'structured' ? 'bg-brand text-white' : 'border'}`}
        >
          {t('admin.structuredUpload')}
        </button>
        <button
          type="button"
          onClick={() => onUploadModeChange('bulk')}
          disabled={readOnly}
          className={`rounded-lg px-3 py-1 text-sm disabled:opacity-50 ${uploadMode === 'bulk' ? 'bg-brand text-white' : 'border'}`}
        >
          {t('admin.bulkUpload')}
        </button>
      </div>

      {!readOnly && uploadMode === 'structured' ? (
        <>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleClearAllPhotos()}
              disabled={photoBusy || sortedPhotos.length === 0}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {t('admin.clearAllPhotos')}
            </button>
          </div>
          <StructuredPhotoUpload
          listingId={listingId}
          propertySubtype={propertySubtype}
          photos={photos}
          onEnsureListing={onEnsureListing}
          onDerivedBedsBaths={onDerivedBedsBaths}
          onRefetch={onRefetch}
          readOnly={readOnly}
        />
        </>
      ) : !readOnly ? (
        <p className="mb-4 text-sm text-gray-600">{t('admin.bulkUploadHint')}</p>
      ) : null}

      {!readOnly && uploadMode === 'bulk' && (
      <div
        className={`mb-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          uploading
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
            : isDragOver
              ? 'border-brand bg-brand/5'
              : 'border-gray-300 bg-gray-50 hover:border-brand/50'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!uploading) setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
          }
        }}
        onDrop={onDrop}
      >
        <p className="text-sm font-medium text-gray-700">{t('admin.uploadAllPhotos')}</p>
        <p className="mt-1 text-sm text-gray-500">{t('admin.dropPhotosHint')}</p>
        <label className="mt-4 inline-block cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          {t('admin.browsePhotos')}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => {
              void handleUpload(e.target.files);
              e.target.value = '';
            }}
            className="sr-only"
          />
        </label>
      </div>
      )}

      {readOnly && uploadMode === 'structured' && (
        <StructuredPhotoUpload
          listingId={listingId}
          propertySubtype={propertySubtype}
          photos={photos}
          onEnsureListing={onEnsureListing}
          onDerivedBedsBaths={onDerivedBedsBaths}
          onRefetch={onRefetch}
          readOnly
        />
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {uploading && uploadMode === 'bulk' && (
        <p className="mb-3 text-sm text-gray-500">{t('common.loading')}</p>
      )}

      {(uploadMode === 'bulk' ? bulkGrouped : []).length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!readOnly && (
              <>
                <p className="text-sm text-gray-600">{t('admin.photoReorderHint')}</p>
                <button
                  type="button"
                  onClick={() => void handleClearAllPhotos()}
                  disabled={photoBusy}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  {t('admin.clearAllPhotos')}
                </button>
              </>
            )}
          </div>
          {bulkGrouped.map(([group, groupPhotos]) => (
            <div key={group}>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                {group} ({groupPhotos.length})
              </h3>
              {readOnly ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {groupPhotos.map((photo) => (
                    <div key={photo.id} className="relative overflow-hidden rounded-lg border bg-white">
                      {photo.url && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
                          className="block w-full cursor-zoom-in"
                          aria-label={t('admin.viewPhoto')}
                        >
                          <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
                        </button>
                      )}
                      {photo.isCover && (
                        <span className="pointer-events-none absolute left-1 top-1 rounded bg-brand px-1 text-xs text-white">
                          {t('admin.coverPhoto')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => void handleDragEnd(event, groupPhotos)}
              >
                <SortableContext
                  items={groupPhotos.map((p) => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                    {groupPhotos.map((photo) => (
                      <SortablePhoto
                        key={photo.id}
                        photo={photo}
                        busy={photoBusy}
                        readOnly={readOnly}
                        onPreview={() => setPreviewPhoto(photo)}
                        onDelete={() => void handleDeletePhoto(photo.id)}
                        onSetCover={() => void handleSetCover(photo.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              )}
            </div>
          ))}
        </div>
      )}

      <AdminPhotoLightbox photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </section>
  );
}
