CREATE TABLE IF NOT EXISTS "listing_badges" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "label_en" text NOT NULL,
  "label_zh" text,
  "background_color" text DEFAULT '#dc2626' NOT NULL,
  "text_color" text DEFAULT '#ffffff' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "listing_badge_assignments" (
  "listing_id" integer NOT NULL REFERENCES "listings"("id") ON DELETE cascade,
  "badge_id" integer NOT NULL REFERENCES "listing_badges"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "listing_badge_assignments_pk"
  ON "listing_badge_assignments" ("listing_id", "badge_id");

CREATE INDEX IF NOT EXISTS "listing_badge_assignments_listing_idx"
  ON "listing_badge_assignments" ("listing_id");

INSERT INTO "listing_badges" ("slug", "label_en", "label_zh", "background_color", "text_color", "sort_order") VALUES
  ('popular', 'Popular', '热门', '#dc2626', '#ffffff', 1),
  ('featured', 'Featured', '精选', '#ea580c', '#ffffff', 2)
ON CONFLICT ("slug") DO NOTHING;
