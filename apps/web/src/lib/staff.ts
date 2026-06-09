import type { User } from '../store/api';

const STAFF_PERMISSIONS = [
  'listings:read',
  'offers:read',
  'clients:read',
  'users:read',
  'roles:read',
  'locations:read',
  'photo-config:read',
  'badges:read',
  'settings:read',
] as const;

export function hasStaffAccess(user?: User | null): boolean {
  if (!user?.permissions?.length) return false;
  return user.permissions.some((p) =>
    STAFF_PERMISSIONS.includes(p as (typeof STAFF_PERMISSIONS)[number]),
  );
}
