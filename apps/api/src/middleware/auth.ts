import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { refreshTokens, userRoles, rolePermissions, roles } from '../db/schema.js';
import { verifyToken, signAccessToken, type TokenPayload } from '../lib/utils.js';
import type { Permission } from '@property-rental/shared';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  setAccessCookie,
} from '../lib/auth-cookies.js';
import { resolveRefreshSession } from '../lib/session.js';
import { eq } from 'drizzle-orm';

export { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, setAuthCookies, clearAuthCookies };

export interface AuthRequest extends Request {
  user?: TokenPayload & { permissions: Permission[] };
}

export async function getUserPermissions(userId: number): Promise<Permission[]> {
  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .where(eq(userRoles.userId, userId));

  return [...new Set(rows.map((r) => r.permission as Permission))];
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      next();
      return;
    }

    const session = await resolveRefreshSession(refreshToken, res);
    if (!session) {
      next();
      return;
    }

    const permissions = await getUserPermissions(session.payload.userId);
    const accessToken = req.cookies?.[ACCESS_COOKIE];
    let accessValid = false;

    if (accessToken) {
      try {
        const accessPayload = verifyToken(accessToken);
        if (accessPayload.userId === session.payload.userId) {
          accessValid = true;
          req.user = { ...accessPayload, permissions };
        }
      } catch {
        // Access token expired — session is still valid if recently active
      }
    }

    if (!accessValid) {
      req.user = { ...session.payload, permissions };
      setAccessCookie(res, signAccessToken(session.payload));
    }

    next();
  } catch {
    next();
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requirePermission(...needed: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const has = needed.some((p) => req.user!.permissions.includes(p));
    if (!has) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const csrfCookie = req.cookies?.[CSRF_COOKIE];
  const csrfHeader = req.headers['x-csrf-token'];
  if (!csrfCookie || csrfCookie !== csrfHeader) {
    res.status(403).json({ error: 'CSRF validation failed' });
    return;
  }
  next();
}
