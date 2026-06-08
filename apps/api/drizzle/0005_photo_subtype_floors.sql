CREATE TABLE IF NOT EXISTS "photo_subtype_floors" (
  "property_subtype" text NOT NULL,
  "floor_id" integer NOT NULL REFERENCES "photo_floors"("id") ON DELETE cascade,
  PRIMARY KEY ("property_subtype", "floor_id")
);

-- House: all configured floors
INSERT INTO "photo_subtype_floors" ("property_subtype", "floor_id")
SELECT 'house', f.id
FROM "photo_floors" f
ON CONFLICT DO NOTHING;

-- Portion types: basement through upper floors (no penthouse by default)
INSERT INTO "photo_subtype_floors" ("property_subtype", "floor_id")
SELECT v.subtype, f.id
FROM (VALUES
  ('upper_portion'),
  ('lower_portion'),
  ('any_portion')
) AS v(subtype)
CROSS JOIN "photo_floors" f
WHERE f.slug IN ('basement', 'ground', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
ON CONFLICT DO NOTHING;
