import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  deriveBedsBathsFromPhotoMetadata,
  formatRoomSlotLabel,
  resolveFloorsForSubtype,
  suggestRoomLabels,
  type PhotoMetadata,
} from '@property-rental/shared';
import {
  usePresignPhotoMutation,
  useConfirmPhotoMutation,
  useReorderPhotosMutation,
  useUpdateListingPhotosMetadataMutation,
  useDeleteListingPhotoMutation,
  useGetPhotoConfigQuery,
} from '../store/api';
import { labelFor } from '../lib/labels';
import { formatFileSize } from '../lib/format';
import type { PhotoItem } from './ListingPhotoUpload';
import { AdminPhotoLightbox, type AdminPhotoPreview } from './AdminPhotoLightbox';

export interface UploadSlot {
  id: string;
  floor: string | null;
  roomType: string;
  labelEn: string;
  labelZh: string;
}

function slotPhotos(photos: PhotoItem[], slot: UploadSlot): PhotoItem[] {
  return photos.filter(
    (p) =>
      p.uploadMode !== 'bulk' &&
      p.roomType === slot.roomType &&
      (p.floor ?? null) === slot.floor &&
      p.roomLabel === slot.labelEn,
  );
}

function slotsFromPhotos(photos: PhotoItem[]): UploadSlot[] {
  const seen = new Map<string, UploadSlot>();
  for (const p of photos) {
    if (p.uploadMode === 'bulk' || !p.roomType || !p.roomLabel) continue;
    const key = `${p.floor ?? ''}::${p.roomType}::${p.roomLabel}`;
    if (!seen.has(key)) {
      seen.set(key, {
        id: key,
        floor: p.floor ?? null,
        roomType: p.roomType,
        labelEn: p.roomLabel,
        labelZh: p.roomLabelZh ?? p.roomLabel,
      });
    }
  }
  return [...seen.values()];
}

function slotToMeta(slot: UploadSlot): PhotoMetadata {
  return {
    floor: slot.floor,
    roomType: slot.roomType,
    roomLabel: slot.labelEn,
    roomLabelZh: slot.labelZh,
    uploadMode: 'structured',
  };
}

function newSlotId() {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

interface StructuredPhotoUploadProps {
  listingId: number | null;
  propertySubtype: string;
  photos: PhotoItem[];
  onEnsureListing: () => Promise<number>;
  onDerivedBedsBaths: (beds: number | null, baths: number | null) => void;
  onRefetch: () => void;
  readOnly?: boolean;
}

export function StructuredPhotoUpload({
  listingId,
  propertySubtype,
  photos,
  onEnsureListing,
  onDerivedBedsBaths,
  onRefetch,
  readOnly = false,
}: StructuredPhotoUploadProps) {
  const { t, i18n } = useTranslation();
  const { data: photoConfig } = useGetPhotoConfigQuery();
  const [presignPhoto] = usePresignPhotoMutation();
  const [confirmPhoto] = useConfirmPhotoMutation();
  const [reorderPhotos] = useReorderPhotosMutation();
  const [updatePhotosMetadata] = useUpdateListingPhotosMetadataMutation();
  const [deleteListingPhoto] = useDeleteListingPhotoMutation();

  const floors = photoConfig?.floors ?? [];
  const roomTypes = photoConfig?.roomTypes ?? [];
  const floorRoomTypes = photoConfig?.floorRoomTypes ?? [];
  const subtypeFloors = photoConfig?.subtypeFloors ?? [];

  const availableFloors = useMemo(
    () => resolveFloorsForSubtype(propertySubtype, floors, subtypeFloors),
    [propertySubtype, floors, subtypeFloors],
  );
  const showFloor = availableFloors.length > 0;

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => a.sortOrder - b.sortOrder),
    [photos],
  );

  const photoMeta = useMemo(
    () =>
      sortedPhotos.map((p) => ({
        floor: p.floor,
        roomType: p.roomType,
        roomLabel: p.roomLabel,
        roomLabelZh: p.roomLabelZh,
        uploadMode: p.uploadMode,
      })),
    [sortedPhotos],
  );

  const formatOptions = useMemo(
    () => ({
      locale: i18n.language,
      floors: availableFloors.map((f) => ({ slug: f.slug, nameEn: f.nameEn, nameZh: f.nameZh })),
      roomTypes: roomTypes.map((rt) => ({
        slug: rt.slug,
        labelEn: rt.labelEn,
        labelZh: rt.labelZh,
        autoNumber: rt.autoNumber,
      })),
    }),
    [i18n.language, availableFloors, roomTypes],
  );

  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>([]);
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);
  const [photoActionId, setPhotoActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<AdminPhotoPreview | null>(null);
  const pendingEmptySlotIds = useRef<Set<string>>(new Set());

  const defaultFloor =
    availableFloors.find((f) => f.slug === 'ground')?.slug ??
    availableFloors[0]?.slug ??
    null;
  const defaultRoomType = roomTypes[0]?.slug ?? 'bedroom';

  const roomTypeConfigFor = useCallback(
    (slug: string) => {
      const rt = roomTypes.find((r) => r.slug === slug);
      if (!rt) return null;
      return {
        slug: rt.slug,
        labelEn: rt.labelEn,
        labelZh: rt.labelZh,
        autoNumber: rt.autoNumber,
      };
    },
    [roomTypes],
  );

  const computeSlotLabels = useCallback(
    (
      roomType: string,
      floor: string | null,
      excludeSlotId: string | null,
      existingSlots: UploadSlot[],
      excludePhotoIds?: Set<number>,
    ) => {
      const fromPhotos = sortedPhotos
        .filter((p) => !excludePhotoIds?.has(p.id))
        .map((p) => ({
          floor: p.floor,
          roomType: p.roomType,
          roomLabel: p.roomLabel,
          roomLabelZh: p.roomLabelZh,
          uploadMode: p.uploadMode,
        }));
      const others = existingSlots
        .filter((s) => s.id !== excludeSlotId)
        .map(slotToMeta);
      return suggestRoomLabels(roomType, floor, [...fromPhotos, ...others], roomTypeConfigFor(roomType));
    },
    [sortedPhotos, roomTypeConfigFor],
  );

  const createDefaultSlot = useCallback(
    (existingSlots: UploadSlot[] = []): UploadSlot => {
      const roomType = defaultRoomType;
      const floor = showFloor ? defaultFloor : null;
      const labels = computeSlotLabels(roomType, floor, null, existingSlots);
      const id = newSlotId();
      pendingEmptySlotIds.current.add(id);
      return { id, floor, roomType, ...labels };
    },
    [computeSlotLabels, defaultFloor, defaultRoomType, showFloor],
  );

  useEffect(() => {
    const fromPhotos = slotsFromPhotos(sortedPhotos);
    setUploadSlots((prev) => {
      const emptySlots = prev.filter(
        (s) =>
          pendingEmptySlotIds.current.has(s.id) && slotPhotos(sortedPhotos, s).length === 0,
      );
      if (fromPhotos.length === 0 && emptySlots.length === 0) {
        return [createDefaultSlot()];
      }
      const photoIds = new Set(fromPhotos.map((s) => s.id));
      const merged = [
        ...fromPhotos,
        ...emptySlots.filter((s) => !photoIds.has(s.id)),
      ];
      return merged.length > 0 ? merged : [createDefaultSlot()];
    });
  }, [sortedPhotos, createDefaultSlot]);

  useEffect(() => {
    if (readOnly) return;
    const derived = deriveBedsBathsFromPhotoMetadata(photoMeta);
    onDerivedBedsBaths(
      derived.beds > 0 ? derived.beds : null,
      derived.baths > 0 ? derived.baths : null,
    );
  }, [photoMeta, onDerivedBedsBaths, readOnly]);

  const availableRoomTypesForFloor = useCallback(
    (floorSlug: string | null) => {
      if (!showFloor || !floorSlug) return roomTypes;
      const floor = availableFloors.find((f) => f.slug === floorSlug);
      if (!floor) return roomTypes;
      const linkedIds = new Set(
        floorRoomTypes.filter((link) => link.floorId === floor.id).map((link) => link.roomTypeId),
      );
      if (linkedIds.size === 0) return roomTypes;
      return roomTypes.filter((rt) => linkedIds.has(rt.id));
    },
    [roomTypes, availableFloors, floorRoomTypes, showFloor],
  );

  const busy = uploadingSlotId != null || photoActionId != null || updatingSlotId != null;

  const applyDerived = (derived?: { beds: number; baths: number }) => {
    if (!derived) return;
    onDerivedBedsBaths(
      derived.beds > 0 ? derived.beds : null,
      derived.baths > 0 ? derived.baths : null,
    );
  };

  const updateSlot = async (
    slotId: string,
    patch: Partial<Pick<UploadSlot, 'floor' | 'roomType'>>,
  ) => {
    const slot = uploadSlots.find((s) => s.id === slotId);
    if (!slot) return;

    let roomType = patch.roomType ?? slot.roomType;
    let floor = patch.floor !== undefined ? patch.floor : slot.floor;
    if (showFloor && !floor) {
      floor = defaultFloor;
    }

    const slotPhotoList = slotPhotos(sortedPhotos, slot);
    const excludeIds = new Set(slotPhotoList.map((p) => p.id));
    const labels = computeSlotLabels(roomType, floor, slotId, uploadSlots, excludeIds);

    if (slotPhotoList.length > 0 && listingId) {
      setError(null);
      setUpdatingSlotId(slotId);
      try {
        const result = await updatePhotosMetadata({
          listingId,
          photos: slotPhotoList.map((p) => ({
            id: p.id,
            floor: showFloor ? floor : null,
            roomType,
            roomLabel: labels.labelEn,
            roomLabelZh: labels.labelZh,
          })),
        }).unwrap();
        applyDerived(result.derived);
        onRefetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'));
      } finally {
        setUpdatingSlotId(null);
      }
      return;
    }

    setUploadSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        return { ...s, roomType, floor, ...labels };
      }),
    );
  };

  const addSlotAfter = (afterId: string) => {
    setUploadSlots((prev) => {
      const ref = prev.find((s) => s.id === afterId) ?? prev[prev.length - 1];
      const roomType = ref?.roomType ?? defaultRoomType;
      const floor = ref?.floor ?? (showFloor ? defaultFloor : null);
      const labels = computeSlotLabels(roomType, floor, null, prev);
      const id = newSlotId();
      pendingEmptySlotIds.current.add(id);
      const newSlot: UploadSlot = { id, roomType, floor, ...labels };
      const idx = prev.findIndex((s) => s.id === afterId);
      if (idx < 0) return [...prev, newSlot];
      const next = [...prev];
      next.splice(idx + 1, 0, newSlot);
      return next;
    });
  };

  const removeSlot = async (slotId: string) => {
    const slot = uploadSlots.find((s) => s.id === slotId);
    if (!slot || !listingId) return;

    const slotPhotoList = slotPhotos(sortedPhotos, slot);
    if (
      slotPhotoList.length > 0 &&
      !window.confirm(t('admin.confirmRemoveRoomSlot'))
    ) {
      return;
    }

    setError(null);
    try {
      let lastDerived: { beds: number; baths: number } | undefined;
      for (const photo of slotPhotoList) {
        const result = await deleteListingPhoto({ listingId, photoId: photo.id }).unwrap();
        lastDerived = result.derived;
      }
      applyDerived(lastDerived);
      pendingEmptySlotIds.current.delete(slotId);
      setUploadSlots((prev) => {
        const next = prev.filter((s) => s.id !== slotId);
        return next.length > 0 ? next : [createDefaultSlot()];
      });
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const uploadToSlot = async (slot: UploadSlot, files: FileList | File[] | null) => {
    if (readOnly || !files?.length) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError(t('admin.uploadImagesOnly'));
      return;
    }

    setError(null);
    setUploadingSlotId(slot.id);
    pendingEmptySlotIds.current.delete(slot.id);

    try {
      const id = await onEnsureListing();
      let sortOrder = sortedPhotos.length;
      const hasAnyPhoto = sortedPhotos.length > 0;

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
            floor: showFloor ? (slot.floor ?? defaultFloor ?? undefined) : undefined,
            roomType: slot.roomType,
            roomLabel: slot.labelEn,
            roomLabelZh: slot.labelZh,
            sortOrder,
            uploadMode: 'structured',
            isCover: !hasAnyPhoto && sortOrder === sortedPhotos.length,
            fileSizeBytes: file.size,
          },
        }).unwrap()) as { derived?: { beds: number; baths: number } };

        applyDerived(result.derived);
        sortOrder += 1;
      }
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setUploadingSlotId(null);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (
    event: DragEndEvent,
    slotPhotoList: PhotoItem[],
  ) => {
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id || !listingId) return;

    const sortedGroup = [...slotPhotoList].sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIndex = sortedGroup.findIndex((p) => p.id === Number(active.id));
    const newIndex = sortedGroup.findIndex((p) => p.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedGroup = arrayMove(sortedGroup, oldIndex, newIndex);
    const groupIds = new Set(reorderedGroup.map((p) => p.id));
    let groupIdx = 0;
    const reordered = sortedPhotos.map((photo) => {
      if (!groupIds.has(photo.id)) return photo;
      return reorderedGroup[groupIdx++]!;
    });

    try {
      await reorderPhotos({
        listingId,
        photos: reordered.map((p, index) => ({ id: p.id, sortOrder: index })),
      }).unwrap();
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!listingId || !window.confirm(t('admin.confirmDeletePhoto'))) return;
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

  const slotDisplayLabel = (slot: UploadSlot) =>
    formatRoomSlotLabel(slotToMeta(slot), formatOptions);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t('admin.structuredBlocksHint')}</p>

      {uploadSlots.map((slot) => {
        const slotPhotoList = slotPhotos(sortedPhotos, slot);
        const roomOptions = availableRoomTypesForFloor(slot.floor ?? defaultFloor);
        const isUploading = uploadingSlotId === slot.id;
        const isUpdating = updatingSlotId === slot.id;
        const isDragOver = dragOverSlotId === slot.id;
        const slotFloor = slot.floor ?? defaultFloor ?? '';

        return (
          <div
            key={slot.id}
            className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-800">{slotDisplayLabel(slot)}</h3>
              {!readOnly && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => void removeSlot(slot.id)}
                    disabled={busy || uploadSlots.length <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-lg leading-none text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    aria-label={t('admin.removeRoomSlot')}
                    title={t('admin.removeRoomSlot')}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => addSlotAfter(slot.id)}
                    disabled={busy}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-lg leading-none text-brand hover:bg-brand/5 disabled:opacity-40"
                    aria-label={t('admin.addRoomSlot')}
                    title={t('admin.addRoomSlot')}
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {!readOnly && (
              <div className={`mb-3 grid gap-3 ${showFloor ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                {showFloor && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      {t('admin.floor')}
                    </span>
                    <select
                      value={slotFloor}
                      onChange={(e) => void updateSlot(slot.id, { floor: e.target.value })}
                      disabled={busy || isUpdating}
                      className="w-full rounded-lg border bg-white px-3 py-2 disabled:bg-gray-100"
                    >
                      {availableFloors.map((f) => (
                        <option key={f.slug} value={f.slug}>
                          {labelFor(f.nameEn, f.nameZh, i18n.language, f.slug)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    {t('admin.roomType')}
                  </span>
                  <select
                    value={slot.roomType}
                    onChange={(e) => void updateSlot(slot.id, { roomType: e.target.value })}
                    disabled={busy || isUpdating}
                    className="w-full rounded-lg border bg-white px-3 py-2 disabled:bg-gray-100"
                  >
                    {roomOptions.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {labelFor(r.nameEn, r.nameZh, i18n.language, r.slug)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {!readOnly && (
              <div
                className={`mb-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  isUploading
                    ? 'cursor-not-allowed border-gray-200 bg-white opacity-60'
                    : isDragOver
                      ? 'border-brand bg-brand/5'
                      : 'border-gray-300 bg-white hover:border-brand/50'
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (!busy) setDragOverSlotId(slot.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!busy) setDragOverSlotId(slot.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverSlotId((current) => (current === slot.id ? null : current));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSlotId(null);
                  if (!busy) void uploadToSlot(slot, e.dataTransfer.files);
                }}
              >
                <p className="text-sm font-medium text-gray-700">{t('admin.uploadToRoom')}</p>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dropPhotosHint')}</p>
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  {isUploading ? t('common.loading') : t('admin.browsePhotos')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={busy}
                    onChange={(e) => {
                      void uploadToSlot(slot, e.target.files);
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
            )}

            {slotPhotoList.length > 0 && (
              readOnly ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {slotPhotoList.map((photo) => (
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
                  onDragEnd={(event) => void handleDragEnd(event, slotPhotoList)}
                >
                  <SortableContext
                    items={slotPhotoList.map((p) => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                      {slotPhotoList.map((photo) => (
                        <SortablePhoto
                          key={photo.id}
                          photo={photo}
                          busy={busy}
                          onPreview={() => setPreviewPhoto(photo)}
                          onDelete={() => void handleDeletePhoto(photo.id)}
                          onSetCover={() => void handleSetCover(photo.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )
            )}
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!readOnly && sortedPhotos.some((p) => p.uploadMode === 'structured') && (
        <p className="text-xs text-gray-500">
          {t('admin.structuredBedsBathsSummary', {
            beds: deriveBedsBathsFromPhotoMetadata(photoMeta).beds,
            baths: deriveBedsBathsFromPhotoMetadata(photoMeta).baths,
          })}
        </p>
      )}

      <AdminPhotoLightbox photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}
