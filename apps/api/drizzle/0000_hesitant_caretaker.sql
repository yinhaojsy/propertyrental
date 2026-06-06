CREATE TYPE "public"."area_unit" AS ENUM('marla', 'kanal', 'sqft', 'sqm', 'yard');--> statement-breakpoint
CREATE TYPE "public"."floor_type" AS ENUM('basement', 'ground', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'penthouse');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'published', 'inactive', 'rented_out');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('residential', 'commercial', 'industrial');--> statement-breakpoint
CREATE TYPE "public"."offer_source" AS ENUM('app_offer', 'offline');--> statement-breakpoint
CREATE TYPE "public"."property_subtype" AS ENUM('house', 'flat', 'upper_portion', 'lower_portion', 'any_portion', 'office', 'shop', 'building', 'warehouse', 'factory');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('drawing_room', 'bedroom', 'bathroom', 'kitchen', 'dining', 'lounge', 'store', 'garage', 'lawn', 'terrace', 'other');--> statement-breakpoint
CREATE TYPE "public"."upload_mode" AS ENUM('structured', 'bulk');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"storage_key" text NOT NULL,
	"thumbnail_key" text,
	"floor" "floor_type",
	"room_type" "room_type",
	"room_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"upload_mode" "upload_mode" DEFAULT 'structured' NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"city_id" integer NOT NULL,
	"sector_id" integer NOT NULL,
	"listing_type" "listing_type" NOT NULL,
	"property_subtype" "property_subtype" NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"rent_amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'PKR' NOT NULL,
	"area_value" numeric(14, 2),
	"area_unit" "area_unit" DEFAULT 'sqft',
	"area_sqft_normalized" numeric(14, 2),
	"beds" integer,
	"is_studio" boolean DEFAULT false NOT NULL,
	"baths" integer,
	"is_penthouse" boolean DEFAULT false NOT NULL,
	"title_en" text NOT NULL,
	"title_zh" text,
	"description_en" text,
	"description_zh" text,
	"contact_phone" text,
	"contact_email" text,
	"created_by_id" integer,
	"published_at" timestamp,
	"rented_out_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"offered_rent" numeric(14, 2),
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "rental_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"offer_id" integer,
	"tenant_name" text NOT NULL,
	"tenant_phone" text,
	"rent_amount" numeric(14, 2) NOT NULL,
	"source" "offer_source" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_records" ADD CONSTRAINT "rental_records_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_records" ADD CONSTRAINT "rental_records_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_photos_listing_idx" ON "listing_photos" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "listings_sector_idx" ON "listings" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "listings_type_idx" ON "listings" USING btree ("listing_type");--> statement-breakpoint
CREATE INDEX "listings_subtype_idx" ON "listings" USING btree ("property_subtype");--> statement-breakpoint
CREATE INDEX "listings_rent_idx" ON "listings" USING btree ("rent_amount");--> statement-breakpoint
CREATE INDEX "listings_area_idx" ON "listings" USING btree ("area_sqft_normalized");--> statement-breakpoint
CREATE INDEX "listings_beds_idx" ON "listings" USING btree ("beds");--> statement-breakpoint
CREATE INDEX "listings_baths_idx" ON "listings" USING btree ("baths");--> statement-breakpoint
CREATE INDEX "offers_listing_idx" ON "offers" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_perm_unique_idx" ON "role_permissions" USING btree ("role_id","permission");--> statement-breakpoint
CREATE UNIQUE INDEX "sectors_city_slug_idx" ON "sectors" USING btree ("city_id","slug");--> statement-breakpoint
CREATE INDEX "sectors_city_idx" ON "sectors" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_unique_idx" ON "user_roles" USING btree ("user_id","role_id");