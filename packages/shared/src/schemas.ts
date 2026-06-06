import { z } from 'zod';
import {
  AREA_UNITS,
  BATH_OPTIONS,
  BED_OPTIONS,
  CITIES,
  COMMERCIAL_SUBTYPES,
  INDUSTRIAL_SUBTYPES,
  LISTING_STATUSES,
  LISTING_TYPES,
  RESIDENTIAL_SUBTYPES,
  ROLES,
  SEARCH_SORT_OPTIONS,
} from './enums.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
});

export const searchListingsSchema = z.object({
  city: z.enum(['all', ...CITIES]).default('all'),
  sectorIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return [];
      return Array.isArray(v) ? v : v.split(',').filter(Boolean);
    }),
  listingType: z.string().min(1).default('residential'),
  propertySubtype: z.string().min(1).default('house'),
  areaMin: z.coerce.number().min(0).default(0),
  areaMax: z.coerce.number().optional(),
  areaUnit: z.enum(AREA_UNITS).default('sqft'),
  beds: z.enum(BED_OPTIONS).default('all'),
  baths: z.enum(BATH_OPTIONS).default('all'),
  priceMin: z.coerce.number().min(0).default(0),
  priceMax: z.coerce.number().optional(),
  isPenthouse: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
  sort: z.enum(SEARCH_SORT_OPTIONS).default('popular'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const createListingSchema = z.object({
  cityId: z.number().int().positive(),
  sectorId: z.number().int().positive(),
  listingType: z.string().min(1),
  propertySubtype: z.string().min(1),
  rentAmount: z.number().positive(),
  currency: z.string().default('PKR'),
  areaValue: z.number().positive().optional(),
  areaUnit: z.enum(AREA_UNITS).default('sqft'),
  beds: z.number().int().min(0).max(20).nullable().optional(),
  isStudio: z.boolean().default(false),
  baths: z.number().int().min(0).max(20).nullable().optional(),
  isPenthouse: z.boolean().default(false),
  titleEn: z.string().min(1).max(200),
  titleZh: z.string().max(200).optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export const updateListingSchema = createListingSchema.partial();

export const createDraftListingSchema = z.object({
  cityId: z.number().int().positive(),
  sectorId: z.number().int().positive(),
  listingType: z.string().min(1),
  propertySubtype: z.string().min(1),
  rentAmount: z.number().positive().optional(),
  currency: z.string().default('PKR'),
  areaValue: z.number().positive().optional(),
  areaUnit: z.enum(AREA_UNITS).default('sqft'),
  beds: z.number().int().min(0).max(20).nullable().optional(),
  isStudio: z.boolean().default(false),
  baths: z.number().int().min(0).max(20).nullable().optional(),
  isPenthouse: z.boolean().default(false),
  titleEn: z.string().max(200).optional(),
  titleZh: z.string().max(200).optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export const listingStatusSchema = z.object({
  status: z.enum(LISTING_STATUSES),
});

export const createOfferSchema = z.object({
  listingId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  phone: z.string().min(5).max(20),
  email: z.string().email(),
  offeredRent: z.number().positive().optional(),
  message: z.string().max(2000).optional(),
});

export const rentalRecordSchema = z.object({
  listingId: z.number().int().positive(),
  offerId: z.number().int().positive().optional(),
  tenantName: z.string().min(1).max(100),
  tenantPhone: z.string().optional(),
  rentAmount: z.number().positive(),
  source: z.enum(['app_offer', 'offline']),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  role: z.enum(ROLES),
  phone: z.string().optional(),
});

export const photoUploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\//),
  floor: z.string().max(50).optional(),
  roomType: z.string().max(50).optional(),
  roomLabel: z.string().max(100).optional(),
  roomLabelZh: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isCover: z.boolean().default(false),
  uploadMode: z.enum(['structured', 'bulk']).default('structured'),
});

export const photoConfirmSchema = z.object({
  storageKey: z.string().min(1),
  floor: z.string().max(50).optional(),
  roomType: z.string().max(50).optional(),
  roomLabel: z.string().max(100).optional(),
  roomLabelZh: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isCover: z.boolean().default(false),
  uploadMode: z.enum(['structured', 'bulk']).default('structured'),
});

export const photoReorderSchema = z.object({
  photos: z.array(
    z.object({
      id: z.number().int().positive(),
      sortOrder: z.number().int().min(0),
      isCover: z.boolean().optional(),
    }),
  ),
});

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens');

export const createCitySchema = z.object({
  slug: slugSchema.optional(),
  nameEn: z.string().min(1).max(100),
  nameZh: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

export const updateCitySchema = createCitySchema.partial();

export const createSectorSchema = z.object({
  cityId: z.number().int().positive(),
  slug: slugSchema.optional(),
  nameEn: z.string().min(1).max(200),
  nameZh: z.string().max(200).optional(),
  isActive: z.boolean().default(true),
});

export const updateSectorSchema = createSectorSchema.omit({ cityId: true }).partial();

export const createPropertyTypeSchema = z.object({
  slug: slugSchema.optional(),
  nameEn: z.string().min(1).max(100),
  nameZh: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePropertyTypeSchema = createPropertyTypeSchema.partial();

export const createPropertySubtypeSchema = z.object({
  propertyTypeId: z.number().int().positive(),
  slug: slugSchema.optional(),
  nameEn: z.string().min(1).max(100),
  nameZh: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePropertySubtypeSchema = createPropertySubtypeSchema
  .omit({ propertyTypeId: true })
  .partial();

export const createPhotoFloorSchema = z.object({
  slug: slugSchema.optional(),
  nameEn: z.string().min(1).max(100),
  nameZh: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePhotoFloorSchema = createPhotoFloorSchema.partial();

export const createPhotoRoomTypeSchema = z.object({
  slug: slugSchema.optional(),
  nameEn: z.string().min(1).max(100),
  nameZh: z.string().min(1).max(100),
  labelEn: z.string().min(1).max(100),
  labelZh: z.string().min(1).max(100),
  autoNumber: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePhotoRoomTypeSchema = createPhotoRoomTypeSchema.partial();

export const setPhotoFloorRoomTypesSchema = z.object({
  roomTypeIds: z.array(z.number().int().positive()),
});

export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
