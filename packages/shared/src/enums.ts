export const CITIES = ['islamabad', 'rawalpindi'] as const;
export type CitySlug = (typeof CITIES)[number];

export const LISTING_STATUSES = ['draft', 'published', 'inactive', 'rented_out'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_TYPES = ['residential', 'commercial', 'industrial'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const RESIDENTIAL_SUBTYPES = [
  'house',
  'flat',
  'upper_portion',
  'lower_portion',
  'any_portion',
] as const;
export type ResidentialSubtype = (typeof RESIDENTIAL_SUBTYPES)[number];

export const COMMERCIAL_SUBTYPES = ['office', 'shop', 'building'] as const;
export type CommercialSubtype = (typeof COMMERCIAL_SUBTYPES)[number];

export const INDUSTRIAL_SUBTYPES = ['warehouse', 'factory'] as const;
export type IndustrialSubtype = (typeof INDUSTRIAL_SUBTYPES)[number];

export type PropertySubtype =
  | ResidentialSubtype
  | CommercialSubtype
  | IndustrialSubtype;

export const AREA_UNITS = ['marla', 'kanal', 'sqft', 'sqm', 'yard'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const ROLES = ['super_admin', 'admin', 'lister', 'viewer'] as const;
export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = [
  'listings:read',
  'listings:write',
  'listings:publish',
  'offers:read',
  'offers:write',
  'users:read',
  'users:write',
  'roles:read',
  'roles:write',
  'locations:read',
  'locations:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  super_admin: [...PERMISSIONS],
  admin: [
    'listings:read',
    'listings:write',
    'listings:publish',
    'offers:read',
    'offers:write',
    'locations:read',
    'locations:write',
  ],
  lister: ['listings:read', 'listings:write', 'listings:publish', 'offers:read', 'locations:read'],
  viewer: ['listings:read', 'offers:read'],
};

export const FLOOR_OPTIONS = [
  'basement',
  'ground',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'penthouse',
] as const;
export type FloorOption = (typeof FLOOR_OPTIONS)[number];

export const ROOM_TYPES = [
  'drawing_room',
  'bedroom',
  'bathroom',
  'kitchen',
  'dining',
  'lounge',
  'store',
  'garage',
  'lawn',
  'terrace',
  'other',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const OFFER_SOURCES = ['app_offer', 'offline'] as const;
export type OfferSource = (typeof OFFER_SOURCES)[number];

export const BED_OPTIONS = [
  'all',
  'studio',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10+',
] as const;
export type BedOption = (typeof BED_OPTIONS)[number];

export const BATH_OPTIONS = [
  'all',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10+',
] as const;
export type BathOption = (typeof BATH_OPTIONS)[number];

export const SEARCH_SORT_OPTIONS = ['popular', 'newest', 'price_asc', 'price_desc'] as const;
export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number];

export function getSubtypesForType(type: ListingType): readonly string[] {
  switch (type) {
    case 'residential':
      return RESIDENTIAL_SUBTYPES;
    case 'commercial':
      return COMMERCIAL_SUBTYPES;
    case 'industrial':
      return INDUSTRIAL_SUBTYPES;
  }
}

export function resolvePropertySubtype(
  type: ListingType,
  subtype: string,
): PropertySubtype | null {
  const allowed = getSubtypesForType(type);
  if (subtype === 'any_portion' && type === 'residential') return 'any_portion';
  return allowed.includes(subtype) ? (subtype as PropertySubtype) : null;
}
