import { hasPermission, type Permission } from '@property-rental/shared';

const LEGACY_PERMISSION_ALIASES: Record<string, Permission[]> = {
  'listings:write': ['listings:create', 'listings:update', 'listings:delete'],
};

export function expandPermissions(permissions: readonly string[] | undefined): Permission[] {
  if (!permissions?.length) return [];
  const expanded = new Set<Permission>();
  for (const permission of permissions) {
    const aliases = LEGACY_PERMISSION_ALIASES[permission];
    if (aliases) {
      for (const alias of aliases) expanded.add(alias);
      continue;
    }
    expanded.add(permission as Permission);
  }
  return [...expanded];
}

export function userHasPermission(
  permissions: readonly string[] | undefined,
  ...needed: Permission[]
): boolean {
  return hasPermission(expandPermissions(permissions), ...needed);
}
