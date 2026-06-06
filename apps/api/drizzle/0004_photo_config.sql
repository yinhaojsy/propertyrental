CREATE TABLE IF NOT EXISTS "photo_floors" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name_en" text NOT NULL,
  "name_zh" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "photo_room_types" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name_en" text NOT NULL,
  "name_zh" text NOT NULL,
  "label_en" text NOT NULL,
  "label_zh" text NOT NULL,
  "auto_number" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "photo_floor_room_types" (
  "floor_id" integer NOT NULL REFERENCES "photo_floors"("id") ON DELETE cascade,
  "room_type_id" integer NOT NULL REFERENCES "photo_room_types"("id") ON DELETE cascade,
  PRIMARY KEY ("floor_id", "room_type_id")
);

ALTER TABLE "listing_photos" ADD COLUMN IF NOT EXISTS "room_label_zh" text;
ALTER TABLE "listing_photos" ALTER COLUMN "floor" TYPE text USING "floor"::text;
ALTER TABLE "listing_photos" ALTER COLUMN "room_type" TYPE text USING "room_type"::text;

INSERT INTO "photo_floors" ("slug", "name_en", "name_zh", "sort_order") VALUES
  ('basement', 'Basement', '地下室', 1),
  ('ground', 'Ground Floor', '一楼', 2),
  ('1', '1st Floor', '1楼', 3),
  ('2', '2nd Floor', '2楼', 4),
  ('3', '3rd Floor', '3楼', 5),
  ('4', '4th Floor', '4楼', 6),
  ('5', '5th Floor', '5楼', 7),
  ('6', '6th Floor', '6楼', 8),
  ('7', '7th Floor', '7楼', 9),
  ('8', '8th Floor', '8楼', 10),
  ('9', '9th Floor', '9楼', 11),
  ('10', '10th Floor', '10楼', 12),
  ('penthouse', 'Penthouse', '顶层', 13)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "photo_room_types" ("slug", "name_en", "name_zh", "label_en", "label_zh", "auto_number", "sort_order") VALUES
  ('drawing_room', 'Drawing Room', '客厅', 'Drawing Room', '客厅', false, 1),
  ('bedroom', 'Bedroom', '卧室', 'Bed', '卧室', true, 2),
  ('bathroom', 'Bathroom', '浴室', 'Bath', '浴室', true, 3),
  ('kitchen', 'Kitchen', '厨房', 'Kitchen', '厨房', false, 4),
  ('dining', 'Dining Room', '餐厅', 'Dining', '餐厅', false, 5),
  ('lounge', 'Lounge', '休息室', 'Lounge', '休息室', false, 6),
  ('store', 'Store', '储藏室', 'Store', '储藏室', false, 7),
  ('garage', 'Garage', '车库', 'Garage', '车库', false, 8),
  ('lawn', 'Lawn', '草坪', 'Lawn', '草坪', false, 9),
  ('terrace', 'Terrace', '露台', 'Terrace', '露台', false, 10),
  ('other', 'Other', '其他', 'Other', '其他', false, 11)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "photo_floor_room_types" ("floor_id", "room_type_id")
SELECT f.id, r.id
FROM "photo_floors" f
CROSS JOIN "photo_room_types" r
ON CONFLICT DO NOTHING;
