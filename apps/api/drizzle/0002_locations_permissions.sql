INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r.id, p.permission
FROM "roles" r
JOIN (VALUES
  ('super_admin', 'locations:read'),
  ('super_admin', 'locations:write'),
  ('admin', 'locations:read'),
  ('admin', 'locations:write'),
  ('lister', 'locations:read')
) AS p(role_name, permission) ON r.name = p.role_name
ON CONFLICT DO NOTHING;
