import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'published',
  'inactive',
  'rented_out',
]);

export const listingTypeEnum = pgEnum('listing_type', [
  'residential',
  'commercial',
  'industrial',
]);

export const propertySubtypeEnum = pgEnum('property_subtype', [
  'house',
  'flat',
  'upper_portion',
  'lower_portion',
  'any_portion',
  'office',
  'shop',
  'building',
  'warehouse',
  'factory',
]);

export const areaUnitEnum = pgEnum('area_unit', [
  'marla',
  'kanal',
  'sqft',
  'sqm',
  'yard',
]);

export const offerSourceEnum = pgEnum('offer_source', ['app_offer', 'offline']);

export const uploadModeEnum = pgEnum('upload_mode', ['structured', 'bulk']);

export const roomTypeEnum = pgEnum('room_type', [
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
]);

export const floorEnum = pgEnum('floor_type', [
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
]);

export const photoFloors = pgTable('photo_floors', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameZh: text('name_zh').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const photoRoomTypes = pgTable('photo_room_types', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameZh: text('name_zh').notNull(),
  labelEn: text('label_en').notNull(),
  labelZh: text('label_zh').notNull(),
  autoNumber: boolean('auto_number').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const photoFloorRoomTypes = pgTable(
  'photo_floor_room_types',
  {
    floorId: integer('floor_id')
      .notNull()
      .references(() => photoFloors.id, { onDelete: 'cascade' }),
    roomTypeId: integer('room_type_id')
      .notNull()
      .references(() => photoRoomTypes.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('photo_floor_room_types_pk').on(t.floorId, t.roomTypeId)],
);

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameZh: text('name_zh').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const propertyTypes = pgTable('property_types', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameZh: text('name_zh'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const propertySubtypes = pgTable(
  'property_subtypes',
  {
    id: serial('id').primaryKey(),
    propertyTypeId: integer('property_type_id')
      .notNull()
      .references(() => propertyTypes.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    nameEn: text('name_en').notNull(),
    nameZh: text('name_zh'),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('property_subtypes_type_slug_idx').on(t.propertyTypeId, t.slug)],
);

export const sectors = pgTable(
  'sectors',
  {
    id: serial('id').primaryKey(),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id),
    slug: text('slug').notNull(),
    nameEn: text('name_en').notNull(),
    nameZh: text('name_zh'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('sectors_city_slug_idx').on(t.cityId, t.slug),
    index('sectors_city_idx').on(t.cityId),
  ],
);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('user_roles_unique_idx').on(t.userId, t.roleId)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: serial('id').primaryKey(),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('role_perm_unique_idx').on(t.roleId, t.permission)],
);

export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const listings = pgTable(
  'listings',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id),
    sectorId: integer('sector_id')
      .notNull()
      .references(() => sectors.id),
    listingType: text('listing_type').notNull(),
    propertySubtype: text('property_subtype').notNull(),
    status: listingStatusEnum('status').default('draft').notNull(),
    rentAmount: numeric('rent_amount', { precision: 14, scale: 2 }).notNull(),
    currency: text('currency').default('PKR').notNull(),
    areaValue: numeric('area_value', { precision: 14, scale: 2 }),
    areaUnit: areaUnitEnum('area_unit').default('sqft'),
    areaSqftNormalized: numeric('area_sqft_normalized', { precision: 14, scale: 2 }),
    beds: integer('beds'),
    isStudio: boolean('is_studio').default(false).notNull(),
    baths: integer('baths'),
    isPenthouse: boolean('is_penthouse').default(false).notNull(),
    titleEn: text('title_en').notNull(),
    titleZh: text('title_zh'),
    descriptionEn: text('description_en'),
    descriptionZh: text('description_zh'),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    createdById: integer('created_by_id').references(() => users.id),
    publishedAt: timestamp('published_at'),
    rentedOutAt: timestamp('rented_out_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('listings_status_idx').on(t.status),
    index('listings_city_idx').on(t.cityId),
    index('listings_sector_idx').on(t.sectorId),
    index('listings_type_idx').on(t.listingType),
    index('listings_subtype_idx').on(t.propertySubtype),
    index('listings_rent_idx').on(t.rentAmount),
    index('listings_area_idx').on(t.areaSqftNormalized),
    index('listings_beds_idx').on(t.beds),
    index('listings_baths_idx').on(t.baths),
  ],
);

export const listingPhotos = pgTable(
  'listing_photos',
  {
    id: serial('id').primaryKey(),
    listingId: integer('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    thumbnailKey: text('thumbnail_key'),
    floor: text('floor'),
    roomType: text('room_type'),
    roomLabel: text('room_label'),
    roomLabelZh: text('room_label_zh'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isCover: boolean('is_cover').default(false).notNull(),
    uploadMode: uploadModeEnum('upload_mode').default('structured').notNull(),
    processingStatus: text('processing_status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('listing_photos_listing_idx').on(t.listingId)],
);

export const offers = pgTable(
  'offers',
  {
    id: serial('id').primaryKey(),
    listingId: integer('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    offeredRent: numeric('offered_rent', { precision: 14, scale: 2 }),
    message: text('message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('offers_listing_idx').on(t.listingId)],
);

export const rentalRecords = pgTable('rental_records', {
  id: serial('id').primaryKey(),
  listingId: integer('listing_id')
    .notNull()
    .references(() => listings.id),
  offerId: integer('offer_id').references(() => offers.id),
  tenantName: text('tenant_name').notNull(),
  tenantPhone: text('tenant_phone'),
  rentAmount: numeric('rent_amount', { precision: 14, scale: 2 }).notNull(),
  source: offerSourceEnum('source').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const citiesRelations = relations(cities, ({ many }) => ({
  sectors: many(sectors),
  listings: many(listings),
}));

export const sectorsRelations = relations(sectors, ({ one, many }) => ({
  city: one(cities, { fields: [sectors.cityId], references: [cities.id] }),
  listings: many(listings),
}));

export const propertyTypesRelations = relations(propertyTypes, ({ many }) => ({
  subtypes: many(propertySubtypes),
}));

export const propertySubtypesRelations = relations(propertySubtypes, ({ one }) => ({
  propertyType: one(propertyTypes, {
    fields: [propertySubtypes.propertyTypeId],
    references: [propertyTypes.id],
  }),
}));

export const photoFloorsRelations = relations(photoFloors, ({ many }) => ({
  floorRoomTypes: many(photoFloorRoomTypes),
}));

export const photoRoomTypesRelations = relations(photoRoomTypes, ({ many }) => ({
  floorRoomTypes: many(photoFloorRoomTypes),
}));

export const photoFloorRoomTypesRelations = relations(photoFloorRoomTypes, ({ one }) => ({
  floor: one(photoFloors, {
    fields: [photoFloorRoomTypes.floorId],
    references: [photoFloors.id],
  }),
  roomType: one(photoRoomTypes, {
    fields: [photoFloorRoomTypes.roomTypeId],
    references: [photoRoomTypes.id],
  }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  city: one(cities, { fields: [listings.cityId], references: [cities.id] }),
  sector: one(sectors, { fields: [listings.sectorId], references: [sectors.id] }),
  photos: many(listingPhotos),
  offers: many(offers),
  createdBy: one(users, { fields: [listings.createdById], references: [users.id] }),
}));

export const listingPhotosRelations = relations(listingPhotos, ({ one }) => ({
  listing: one(listings, {
    fields: [listingPhotos.listingId],
    references: [listings.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  offers: many(offers),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  listing: one(listings, { fields: [offers.listingId], references: [listings.id] }),
  user: one(users, { fields: [offers.userId], references: [users.id] }),
}));
