import type { Permission } from './enums.js';

export function hasPermission(
  permissions: readonly string[] | undefined,
  ...needed: Permission[]
): boolean {
  if (!permissions?.length || needed.length === 0) return false;
  return needed.some((p) => permissions.includes(p));
}

export function hasAllPermissions(
  permissions: readonly string[] | undefined,
  ...needed: Permission[]
): boolean {
  if (!permissions?.length || needed.length === 0) return false;
  return needed.every((p) => permissions.includes(p));
}

/** Human-readable label for permission strings (e.g. listings:create → Create listings). */
export function formatPermissionLabel(permission: string): string {
  const [resource, action] = permission.split(':');
  const resourceLabel = (resource ?? permission).replace(/-/g, ' ');
  const actionLabel = action ?? '';
  if (!actionLabel) return resourceLabel;
  return `${actionLabel.charAt(0).toUpperCase()}${actionLabel.slice(1)} ${resourceLabel}`;
}

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  listings: [
    'listings:read',
    'listings:create',
    'listings:update',
    'listings:delete',
    'listings:publish',
  ],
  offers: ['offers:read', 'offers:write'],
  clients: ['clients:read'],
  users: ['users:read', 'users:write'],
  roles: ['roles:read', 'roles:write'],
  locations: ['locations:read', 'locations:write'],
  photoConfig: ['photo-config:read', 'photo-config:write'],
  badges: ['badges:read', 'badges:write'],
  settings: ['settings:read', 'settings:write'],
};
