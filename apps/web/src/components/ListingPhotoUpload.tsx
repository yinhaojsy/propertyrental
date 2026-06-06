import { useEffect, useMemo, useState } from 'react';
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
  FLOOR_OPTIONS,
  ROOM_TYPES,
  deriveBedsBathsFromPhotoMetadata,
  formatRoomSlotLabel,
  suggestRoomLabel,
  usesFloorForSubtype,
  type RoomType,
} from '@property-rental/shared';
import {
  usePresignPhotoMutation,
  useConfirmPhotoMutation,
  useReorderPhotosMutation,
} from '../store/api';

export interface PhotoItem {
  id: number;
  url: string | null;
  storageKey?: string;
  floor?: string | null;
  roomType?: string | null;
  roomLabel?: string | null;
  sortOrder: number;
  isCover: boolean;
  uploadMode?: 'structured' | 'bulk' | null;
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
}

function SortablePhoto({ photo }: { photo: PhotoItem }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-lg border bg-white ${
        isDragging ? 'z-10 opacity-80 shadow-lg' : ''
      }`}
    >
      {photo.url && <img src={photo.url} alt="" className="aspect-square w-full object-cover" draggable={false} />}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white cursor-grab active:cursor-grabbing"
        aria-label={t('admin.dragToReorder')}
      >
        ⋮⋮
      </button>
      {photo.isCover && (
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
  listingType,
  propertySubtype,
  photos,
  uploadMode,
  onUploadModeChange,
  onEnsureListing,
  onDerivedBedsBaths,
  onRefetch,
}: ListingPhotoUploadProps) {
  const { t } = useTranslation();
  const [presignPhoto] = usePresignPhotoMutation();
  const [confirmPhoto] = useConfirmPhotoMutation();
  const [reorderPhotos] = useReorderPhotosMutation();

  const showFloor = usesFloorForSubtype(propertySubtype);
  const [floor, setFloor] = useState<(typeof FLOOR_OPTIONS)[number]>('ground');
  const [roomType, setRoomType] = useState<RoomType>('drawing_room');
  const [roomLabel, setRoomLabel] = useState('Drawing Room');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        uploadMode: p.uploadMode,
      })),
    [sortedPhotos],
  );

  useEffect(() => {
    setRoomLabel(
      suggestRoomLabel(roomType, showFloor ? floor : null, photoMeta),
    );
  }, [roomType, floor, showFloor, photoMeta]);

  useEffect(() => {
    if (uploadMode !== 'structured' || listingType !== 'residential') return;
    const hasStructuredMetadata = photoMeta.some(
      (p) => p.uploadMode !== 'bulk' && p.roomType,
    );
    if (!hasStructuredMetadata) return;

    const derived = deriveBedsBathsFromPhotoMetadata(photoMeta);
    onDerivedBedsBaths(
      derived.beds > 0 ? derived.beds : null,
      derived.baths > 0 ? derived.baths : null,
    );
  }, [photoMeta, uploadMode, listingType, onDerivedBedsBaths]);

  const groupedPhotos = useMemo(() => {
    const groups = new Map<string, PhotoItem[]>();
    for (const photo of sortedPhotos) {
      const key =
        photo.uploadMode === 'bulk'
          ? t('admin.bulkUpload')
          : formatRoomSlotLabel(photo);
      const list = groups.get(key) ?? [];
      list.push(photo);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [sortedPhotos, t]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleUpload = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
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
            floor: uploadMode === 'structured' && showFloor ? floor : undefined,
            roomType: uploadMode === 'structured' ? roomType : undefined,
            roomLabel:
              uploadMode === 'structured'
                ? roomLabel.trim() || suggestRoomLabel(roomType, showFloor ? floor : null, photoMeta)
                : file.name,
            sortOrder,
            uploadMode,
            isCover: sortedPhotos.length === 0 && sortOrder === 0,
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
      isCover: index === 0,
    }));

    try {
      await reorderPhotos({
        listingId,
        photos: reordered.map((p) => ({
          id: p.id,
          sortOrder: p.sortOrder,
          isCover: p.isCover,
        })),
      }).unwrap();
      onRefetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    void handleUpload(e.dataTransfer.files);
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-2 font-semibold">{t('admin.photos')}</h2>
      <p className="mb-4 text-sm text-gray-600">{t('admin.photosHelp')}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onUploadModeChange('structured')}
          className={`rounded-lg px-3 py-1 text-sm ${uploadMode === 'structured' ? 'bg-brand text-white' : 'border'}`}
        >
          {t('admin.structuredUpload')}
        </button>
        <button
          type="button"
          onClick={() => onUploadModeChange('bulk')}
          className={`rounded-lg px-3 py-1 text-sm ${uploadMode === 'bulk' ? 'bg-brand text-white' : 'border'}`}
        >
          {t('admin.bulkUpload')}
        </button>
      </div>

      {uploadMode === 'structured' ? (
        <div className="mb-4 space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
          <p className="text-sm font-medium text-gray-800">{t('admin.structuredUploadHint')}</p>
          <div className={`grid gap-3 ${showFloor ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {showFloor && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">{t('admin.floor')}</span>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value as (typeof FLOOR_OPTIONS)[number])}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  {FLOOR_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">{t('admin.roomType')}</span>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as RoomType)}
                className="w-full rounded-lg border px-3 py-2"
              >
                {ROOM_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">{t('admin.roomLabel')}</span>
              <input
                value={roomLabel}
                onChange={(e) => setRoomLabel(e.target.value)}
                placeholder="e.g. Bed 1, Drawing Room"
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            {showFloor
              ? t('admin.structuredHouseHint')
              : t('admin.structuredFlatHint')}
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-600">{t('admin.bulkUploadHint')}</p>
      )}

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
        <p className="text-sm font-medium text-gray-700">
          {uploadMode === 'structured' ? t('admin.uploadToRoom') : t('admin.uploadAllPhotos')}
        </p>
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

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {uploading && <p className="mb-3 text-sm text-gray-500">{t('common.loading')}</p>}

      {sortedPhotos.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('admin.photoReorderHint')}</p>
          {groupedPhotos.map(([group, groupPhotos]) => (
            <div key={group}>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                {group} ({groupPhotos.length})
              </h3>
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
                      <SortablePhoto key={photo.id} photo={photo} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
