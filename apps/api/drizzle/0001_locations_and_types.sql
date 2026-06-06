ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "property_types" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name_en" text NOT NULL,
  "name_zh" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "property_subtypes" (
  "id" serial PRIMARY KEY NOT NULL,
  "property_type_id" integer NOT NULL REFERENCES "property_types"("id") ON DELETE cascade,
  "slug" text NOT NULL,
  "name_en" text NOT NULL,
  "name_zh" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "property_subtypes_type_slug_idx" ON "property_subtypes" ("property_type_id", "slug");

ALTER TABLE "listings" ALTER COLUMN "listing_type" TYPE text USING "listing_type"::text;
ALTER TABLE "listings" ALTER COLUMN "property_subtype" TYPE text USING "property_subtype"::text;

INSERT INTO "property_types" ("slug", "name_en", "name_zh", "sort_order") VALUES
  ('residential', 'Residential', '住宅', 1),
  ('commercial', 'Commercial', '商业', 2),
  ('industrial', 'Industrial', '工业', 3)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "property_subtypes" ("property_type_id", "slug", "name_en", "name_zh", "sort_order")
SELECT pt.id, v.slug, v.name_en, v.name_zh, v.sort_order
FROM (VALUES
  ('residential', 'house', 'House', '独立屋', 1),
  ('residential', 'flat', 'Flat/Apartment', '公寓', 2),
  ('residential', 'upper_portion', 'Upper Portion', '上层', 3),
  ('residential', 'lower_portion', 'Lower Portion', '下层', 4),
  ('residential', 'any_portion', 'Any Portion', '任意层', 5),
  ('commercial', 'office', 'Office', '办公室', 1),
  ('commercial', 'shop', 'Shop', '商铺', 2),
  ('commercial', 'building', 'Building/Plaza', '建筑/广场', 3),
  ('industrial', 'warehouse', 'Warehouse', '仓库', 1),
  ('industrial', 'factory', 'Factory', '工厂', 2)
) AS v(type_slug, slug, name_en, name_zh, sort_order)
JOIN "property_types" pt ON pt.slug = v.type_slug
ON CONFLICT DO NOTHING;
