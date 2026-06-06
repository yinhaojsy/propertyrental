import type { User } from '../store/api';

const STAFF_PERMISSIONS = ['listings:read', 'offers:read', 'users:read'] as const;

export function hasStaffAccess(user?: User | null): boolean {
  if (!user?.permissions?.length) return false;
  return user.permissions.some((p) =>
    STAFF_PERMISSIONS.includes(p as (typeof STAFF_PERMISSIONS)[number]),
  );
}
