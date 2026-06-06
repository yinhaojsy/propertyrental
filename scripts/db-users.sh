#!/usr/bin/env bash
# List application users (not PostgreSQL's built-in "user" function!)
set -euo pipefail

export PATH="$(brew --prefix postgresql@18 2>/dev/null || brew --prefix postgresql)/bin:$PATH"

echo "=== App users (table: users) ==="
psql -d property_rental -c "SELECT id, email, name, created_at FROM users ORDER BY id;"

echo ""
echo "=== Roles per user ==="
psql -d property_rental -c "
  SELECT u.id, u.email, r.name AS role
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  ORDER BY u.id;
"

echo ""
echo "Note: SELECT * FROM user;  → Postgres login name (yin), NOT app users!"
echo "      SELECT * FROM users; → App accounts table"
