export interface PhotoMetadata {
  floor?: string | null;
  roomType?: string | null;
  roomLabel?: string | null;
  roomLabelZh?: string | null;
  uploadMode?: 'structured' | 'bulk' | null;
}

export interface RoomTypeLabelConfig {
  slug: string;
  labelEn: string;
  labelZh: string;
  autoNumber: boolean;
}

export interface FloorLabelConfig {
  slug: string;
  nameEn: string;
  nameZh: string;
}

function roomSlotKey(photo: PhotoMetadata): string {
  const label = photo.roomLabel?.trim() || 'default';
  const floor = photo.floor ?? '';
  return `${floor}::${photo.roomType}::${label}`;
}

export function isStructuredPhoto(photo: PhotoMetadata): boolean {
  return photo.uploadMode !== 'bulk' && !!photo.roomType && !!photo.roomLabel;
}

/** Group structured photos by room slot; bulk photos keep their relative order at the end. */
export function sortPhotosByRoomSlot<
  T extends PhotoMetadata & { sortOrder: number; isCover?: boolean },
>(photos: T[]): T[] {
  if (photos.length === 0) return [];

  const cover = photos.find((p) => p.isCover);
  const rest = cover ? photos.filter((p) => p !== cover) : [...photos];

  const groups = new Map<string, T[]>();
  const bulk: T[] = [];

  for (const photo of rest) {
    if (!isStructuredPhoto(photo)) {
      bulk.push(photo);
      continue;
    }
    const key = roomSlotKey(photo);
    const group = groups.get(key) ?? [];
    group.push(photo);
    groups.set(key, group);
  }

  const grouped = [...groups.entries()]
    .sort(([, a], [, b]) => {
      const minA = Math.min(...a.map((p) => p.sortOrder));
      const minB = Math.min(...b.map((p) => p.sortOrder));
      return minA - minB;
    })
    .flatMap(([, group]) => [...group].sort((a, b) => a.sortOrder - b.sortOrder));

  const ordered = [...grouped, ...bulk.sort((a, b) => a.sortOrder - b.sortOrder)];
  return cover ? [cover, ...ordered] : ordered;
}

export const ROOM_TYPES_WITHOUT_FLOOR = ['garage', 'lawn', 'terrace'] as const;

export function roomTypeRequiresFloor(roomType: string): boolean {
  return !ROOM_TYPES_WITHOUT_FLOOR.includes(roomType as (typeof ROOM_TYPES_WITHOUT_FLOOR)[number]);
}

export function deriveBedsBathsFromPhotoMetadata(photos: PhotoMetadata[]): {
  beds: number;
  baths: number;
} {
  const bedroomKeys = new Set<string>();
  const bathroomKeys = new Set<string>();

  for (const photo of photos) {
    if (photo.uploadMode === 'bulk') continue;
    if (!photo.roomType) continue;

    const key = roomSlotKey(photo);
    if (photo.roomType === 'bedroom') bedroomKeys.add(key);
    if (photo.roomType === 'bathroom') bathroomKeys.add(key);
  }

  return { beds: bedroomKeys.size, baths: bathroomKeys.size };
}

const FALLBACK_ROOM_TYPE_LABELS: Record<string, { en: string; zh: string; autoNumber: boolean }> = {
  drawing_room: { en: 'Drawing Room', zh: '客厅', autoNumber: false },
  bedroom: { en: 'Bed', zh: '卧室', autoNumber: true },
  bathroom: { en: 'Bath', zh: '浴室', autoNumber: true },
  kitchen: { en: 'Kitchen', zh: '厨房', autoNumber: false },
  dining: { en: 'Dining', zh: '餐厅', autoNumber: false },
  lounge: { en: 'Lounge', zh: '休息室', autoNumber: false },
  store: { en: 'Store', zh: '储藏室', autoNumber: false },
  garage: { en: 'Garage', zh: '车库', autoNumber: false },
  lawn: { en: 'Lawn', zh: '草坪', autoNumber: false },
  terrace: { en: 'Terrace', zh: '露台', autoNumber: false },
  other: { en: 'Other', zh: '其他', autoNumber: false },
};

function resolveRoomTypeConfig(
  roomType: string,
  config?: RoomTypeLabelConfig | null,
): { labelEn: string; labelZh: string; autoNumber: boolean } {
  if (config) {
    return {
      labelEn: config.labelEn,
      labelZh: config.labelZh,
      autoNumber: config.autoNumber,
    };
  }
  const fallback = FALLBACK_ROOM_TYPE_LABELS[roomType];
  if (fallback) {
    return {
      labelEn: fallback.en,
      labelZh: fallback.zh,
      autoNumber: fallback.autoNumber,
    };
  }
  const spaced = roomType.replace(/_/g, ' ');
  return { labelEn: spaced, labelZh: spaced, autoNumber: false };
}

export function suggestRoomLabels(
  roomType: string,
  floor: string | null,
  photos: PhotoMetadata[],
  roomTypeConfig?: RoomTypeLabelConfig | null,
): { labelEn: string; labelZh: string } {
  const { labelEn, labelZh, autoNumber } = resolveRoomTypeConfig(roomType, roomTypeConfig);

  if (autoNumber) {
    const onFloor = photos.filter(
      (p) =>
        p.roomType === roomType &&
        p.uploadMode !== 'bulk' &&
        (floor ? p.floor === floor : !p.floor),
    );
    const usedEn = new Set(
      onFloor.map((p) => p.roomLabel?.trim()).filter(Boolean) as string[],
    );
    let n = 1;
    while (usedEn.has(`${labelEn} ${n}`)) n += 1;
    return { labelEn: `${labelEn} ${n}`, labelZh: `${labelZh} ${n}` };
  }

  const onFloor = photos.filter(
    (p) =>
      p.roomType === roomType &&
      p.uploadMode !== 'bulk' &&
      (floor ? p.floor === floor : !p.floor),
  );
  if (onFloor.length === 0) return { labelEn, labelZh };
  const suffix = onFloor.length + 1;
  return { labelEn: `${labelEn} ${suffix}`, labelZh: `${labelZh} ${suffix}` };
}

/** @deprecated Use suggestRoomLabels instead */
export function suggestRoomLabel(
  roomType: string,
  floor: string | null,
  photos: PhotoMetadata[],
  roomTypeConfig?: RoomTypeLabelConfig | null,
): string {
  return suggestRoomLabels(roomType, floor, photos, roomTypeConfig).labelEn;
}

export function formatRoomSlotLabel(
  photo: PhotoMetadata,
  options?: {
    locale?: string;
    floors?: FloorLabelConfig[];
    roomTypes?: RoomTypeLabelConfig[];
  },
): string {
  const locale = options?.locale ?? 'en';
  const useZh = locale.startsWith('zh');

  const floorConfig = options?.floors?.find((f) => f.slug === photo.floor);
  const roomTypeConfig = options?.roomTypes?.find((r) => r.slug === photo.roomType);

  let roomPart: string | null = null;
  if (photo.roomLabel || photo.roomLabelZh) {
    roomPart = useZh
      ? photo.roomLabelZh || photo.roomLabel || null
      : photo.roomLabel || photo.roomLabelZh || null;
  } else if (photo.roomType) {
    if (roomTypeConfig) {
      roomPart = useZh ? roomTypeConfig.labelZh : roomTypeConfig.labelEn;
    } else {
      roomPart = photo.roomType.replace(/_/g, ' ');
    }
  }

  if (!photo.floor) {
    return roomPart || 'Photo';
  }

  const floorPart = floorConfig
    ? useZh
      ? floorConfig.nameZh
      : floorConfig.nameEn
    : photo.floor;

  if (!roomPart) return floorPart;
  return `${roomPart} - ${floorPart}`;
}

export function usesFloorForSubtype(propertySubtype: string): boolean {
  if (propertySubtype === 'flat') return false;
  return !['office', 'shop', 'building', 'warehouse', 'factory'].includes(propertySubtype);
}

export interface PhotoSubtypeFloorLink {
  propertySubtype: string;
  floorId: number;
}

export function resolveFloorsForSubtype<
  T extends { id: number; isActive?: boolean },
>(propertySubtype: string, floors: T[], subtypeFloors: PhotoSubtypeFloorLink[]): T[] {
  const activeFloors = floors.filter((f) => f.isActive !== false);
  const links = subtypeFloors.filter((l) => l.propertySubtype === propertySubtype);
  if (links.length === 0) {
    if (!usesFloorForSubtype(propertySubtype)) return [];
    return activeFloors;
  }
  const linkedIds = new Set(links.map((l) => l.floorId));
  return activeFloors.filter((f) => linkedIds.has(f.id));
}

export function isResidentialStructuredSubtype(
  listingType: string,
  propertySubtype: string,
): boolean {
  return listingType === 'residential' && usesFloorForSubtype(propertySubtype);
}
