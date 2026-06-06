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
  roomTypeRequiresFloor,
  suggestRoomLabels,
  usesFloorForSubtype,
  type PhotoMetadata,
} from '@property-rental/shared';
import {
  usePresignPhotoMutation,
  useConfirmPhotoMutation,
  useReorderPhotosMutation,
  useDeleteListingPhotoMutation,
  useGetPhotoConfigQuery,
} from '../store/api';
import { labelFor } from '../lib/labels';
import type { PhotoItem } from './ListingPhotoUpload';

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
  busy,
  readOnly,
}: {
  photo: PhotoItem;
  onDelete: () => void;
  onSetCover: () => void;
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
        <img src={photo.url} alt="" className="aspect-square w-full object-cover" draggable={false} />
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
  const [deleteListingPhoto] = useDeleteListingPhotoMutation();

  const floors = photoConfig?.floors ?? [];
  const roomTypes = photoConfig?.roomTypes ?? [];
  const floorRoomTypes = photoConfig?.floorRoomTypes ?? [];
  const showFloor = usesFloorForSubtype(propertySubtype);

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
      floors: floors.map((f) => ({ slug: f.slug, nameEn: f.nameEn, nameZh: f.nameZh })),
      roomTypes: roomTypes.map((rt) => ({
        slug: rt.slug,
        labelEn: rt.labelEn,
        labelZh: rt.labelZh,
        autoNumber: rt.autoNumber,
      })),
    }),
    [i18n.language, floors, roomTypes],
  );

  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>([]);
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);
  const [photoActionId, setPhotoActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingEmptySlotIds = useRef<Set<string>>(new Set());

  const defaultFloor = floors.find((f) => f.slug === 'ground')?.slug ?? floors[0]?.slug ?? null;
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
    (roomType: string, floor: string | null, excludeSlotId: string | null, existingSlots: UploadSlot[]) => {
      const others = existingSlots
        .filter((s) => s.id !== excludeSlotId)
        .map(slotToMeta);
      return suggestRoomLabels(roomType, floor, [...photoMeta, ...others], roomTypeConfigFor(roomType));
    },
    [photoMeta, roomTypeConfigFor],
  );

  const createDefaultSlot = useCallback(
    (existingSlots: UploadSlot[] = []): UploadSlot => {
      const roomType = defaultRoomType;
      const floor =
        showFloor && roomTypeRequiresFloor(roomType) ? defaultFloor : null;
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
      const floor = floors.find((f) => f.slug === floorSlug);
      if (!floor) return roomTypes;
      const linkedIds = new Set(
        floorRoomTypes.filter((link) => link.floorId === floor.id).map((link) => link.roomTypeId),
      );
      if (linkedIds.size === 0) return roomTypes;
      return roomTypes.filter((rt) => linkedIds.has(rt.id));
    },
    [roomTypes, floors, floorRoomTypes, showFloor],
  );

  const busy = uploadingSlotId != null || photoActionId != null;

  const applyDerived = (derived?: { beds: number; baths: number }) => {
    if (!derived) return;
    onDerivedBedsBaths(
      derived.beds > 0 ? derived.beds : null,
      derived.baths > 0 ? derived.baths : null,
    );
  };

  const updateSlot = (slotId: string, patch: Partial<Pick<UploadSlot, 'floor' | 'roomType'>>) => {
    setUploadSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        if (slotPhotos(sortedPhotos, slot).length > 0) return slot;

        let roomType = patch.roomType ?? slot.roomType;
        let floor = patch.floor !== undefined ? patch.floor : slot.floor;
        if (patch.roomType && !roomTypeRequiresFloor(patch.roomType)) {
          floor = null;
        }
        if (patch.floor === null || floor === '') {
          floor = null;
        }
        if (showFloor && roomTypeRequiresFloor(roomType) && !floor) {
          floor = defaultFloor;
        }

        const labels = computeSlotLabels(roomType, floor, slotId, prev);
        return { ...slot, roomType, floor, ...labels };
      }),
    );
  };

  const addSlotAfter = (afterId: string) => {
    setUploadSlots((prev) => {
      const ref = prev.find((s) => s.id === afterId) ?? prev[prev.length - 1];
      const roomType = ref?.roomType ?? defaultRoomType;
      const floor =
        ref?.floor ??
        (showFloor && roomTypeRequiresFloor(roomType) ? defaultFloor : null);
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
            floor: slot.floor ?? undefined,
            roomType: slot.roomType,
            roomLabel: slot.labelEn,
            roomLabelZh: slot.labelZh,
            sortOrder,
            uploadMode: 'structured',
            isCover: !hasAnyPhoto && sortOrder === sortedPhotos.length,
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
        const hasPhotos = slotPhotoList.length > 0;
        const roomOptions = availableRoomTypesForFloor(slot.floor);
        const slotFloorRequired = showFloor && roomTypeRequiresFloor(slot.roomType);
        const isUploading = uploadingSlotId === slot.id;

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
                      value={slot.floor ?? ''}
                      onChange={(e) =>
                        updateSlot(slot.id, {
                          floor: e.target.value === '' ? null : e.target.value,
                        })
                      }
                      disabled={hasPhotos || !slotFloorRequired}
                      className="w-full rounded-lg border bg-white px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="">{t('admin.floorNone')}</option>
                      {floors.map((f) => (
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
                    onChange={(e) => updateSlot(slot.id, { roomType: e.target.value })}
                    disabled={hasPhotos}
                    className="w-full rounded-lg border bg-white px-3 py-2 disabled:bg-gray-100"
                  >
                    {(slotFloorRequired ? roomOptions : roomTypes).map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {labelFor(r.nameEn, r.nameZh, i18n.language, r.slug)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {!readOnly && (
              <label className="mb-3 inline-flex cursor-pointer items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                {isUploading ? t('common.loading') : t('admin.uploadToRoom')}
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
            )}

            {slotPhotoList.length > 0 && (
              readOnly ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {slotPhotoList.map((photo) => (
                    <div key={photo.id} className="relative overflow-hidden rounded-lg border bg-white">
                      {photo.url && (
                        <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
                      )}
                      {photo.isCover && (
                        <span className="absolute left-1 top-1 rounded bg-brand px-1 text-xs text-white">
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
    </div>
  );
}
