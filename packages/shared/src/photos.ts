import type { RoomType } from './enums.js';

export interface PhotoMetadata {
  floor?: string | null;
  roomType?: string | null;
  roomLabel?: string | null;
  uploadMode?: 'structured' | 'bulk' | null;
}

function roomSlotKey(photo: PhotoMetadata): string {
  const label = photo.roomLabel?.trim() || 'default';
  const floor = photo.floor ?? '';
  return `${floor}::${photo.roomType}::${label}`;
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

const ROOM_TYPE_LABELS: Partial<Record<RoomType, string>> = {
  drawing_room: 'Drawing Room',
  bedroom: 'Bed',
  bathroom: 'Bath',
  kitchen: 'Kitchen',
  dining: 'Dining',
  lounge: 'Lounge',
  store: 'Store',
  garage: 'Garage',
  lawn: 'Lawn',
  terrace: 'Terrace',
  other: 'Other',
};

export function suggestRoomLabel(
  roomType: RoomType,
  floor: string | null,
  photos: PhotoMetadata[],
): string {
  if (roomType === 'bedroom' || roomType === 'bathroom') {
    const prefix = roomType === 'bedroom' ? 'Bed' : 'Bath';
    const onFloor = photos.filter(
      (p) =>
        p.roomType === roomType &&
        p.uploadMode !== 'bulk' &&
        (floor ? p.floor === floor : !p.floor),
    );
    const used = new Set(
      onFloor.map((p) => p.roomLabel?.trim()).filter(Boolean) as string[],
    );
    let n = 1;
    while (used.has(`${prefix} ${n}`)) n += 1;
    return `${prefix} ${n}`;
  }

  const base = ROOM_TYPE_LABELS[roomType] ?? roomType.replace(/_/g, ' ');
  const onFloor = photos.filter(
    (p) =>
      p.roomType === roomType &&
      p.uploadMode !== 'bulk' &&
      (floor ? p.floor === floor : !p.floor),
  );
  if (onFloor.length === 0) return base;
  return `${base} ${onFloor.length + 1}`;
}

export function formatRoomSlotLabel(photo: PhotoMetadata): string {
  const parts = [];
  if (photo.floor) parts.push(photo.floor);
  if (photo.roomLabel) parts.push(photo.roomLabel);
  else if (photo.roomType) parts.push(photo.roomType.replace(/_/g, ' '));
  return parts.join(' · ') || 'Photo';
}

export function usesFloorForSubtype(propertySubtype: string): boolean {
  if (propertySubtype === 'flat') return false;
  return !['office', 'shop', 'building', 'warehouse', 'factory'].includes(propertySubtype);
}

export function isResidentialStructuredSubtype(
  listingType: string,
  propertySubtype: string,
): boolean {
  return listingType === 'residential' && usesFloorForSubtype(propertySubtype);
}
