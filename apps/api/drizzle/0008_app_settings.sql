CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "app_settings" ("key", "value")
VALUES (
  'photo_compression',
  '{"enabled":true,"minBytes":1572864,"quality":82,"maxOutputBytes":null}'::jsonb
)
ON CONFLICT ("key") DO NOTHING;
