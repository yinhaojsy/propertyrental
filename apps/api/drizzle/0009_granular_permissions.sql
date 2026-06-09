-- Grant granular listing permissions to roles that had listings:write
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT rp.role_id, p.permission
FROM "role_permissions" rp
JOIN (VALUES
  ('listings:create'),
  ('listings:update'),
  ('listings:delete')
) AS p(permission) ON rp.permission = 'listings:write'
ON CONFLICT DO NOTHING;

-- super_admin: all new permissions
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r.id, p.permission
FROM "roles" r
JOIN (VALUES
  ('listings:create'),
  ('listings:update'),
  ('listings:delete'),
  ('clients:read'),
  ('photo-config:read'),
  ('photo-config:write'),
  ('badges:read'),
  ('badges:write'),
  ('settings:read'),
  ('settings:write')
) AS p(permission) ON r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- admin role
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r.id, p.permission
FROM "roles" r
JOIN (VALUES
  ('listings:create'),
  ('listings:update'),
  ('listings:delete'),
  ('clients:read'),
  ('photo-config:read'),
  ('photo-config:write'),
  ('badges:read'),
  ('badges:write'),
  ('settings:read'),
  ('settings:write')
) AS p(permission) ON r.name = 'admin'
ON CONFLICT DO NOTHING;

-- lister role
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r.id, p.permission
FROM "roles" r
JOIN (VALUES
  ('listings:create'),
  ('listings:update'),
  ('photo-config:read')
) AS p(permission) ON r.name = 'lister'
ON CONFLICT DO NOTHING;
