import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq, and, gt } from 'drizzle-orm';
import { loginSchema, registerSchema } from '@property-rental/shared';
import { db } from '../db/index.js';
import { users, roles, userRoles, refreshTokens } from '../db/schema.js';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  generateCsrfToken,
  verifyToken,
} from '../lib/utils.js';
import {
  authenticate,
  requireAuth,
  setAuthCookies,
  clearAuthCookies,
  csrfProtection,
  getUserPermissions,
  type AuthRequest,
  REFRESH_COOKIE,
} from '../middleware/auth.js';
import { refreshExpiryDate } from '../lib/auth-cookies.js';
import {
  invalidateSession,
  isSessionInactive,
} from '../lib/session.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router = Router();

router.post('/register', csrfProtection, validateBody(registerSchema), async (req, res) => {
  const { email, password, name, phone } = req.body;
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, name, phone })
    .returning();

  const csrfToken = generateCsrfToken();
  const payload = { userId: user!.id, email: user!.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const now = new Date();

  await db.insert(refreshTokens).values({
    userId: user!.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
    lastActivityAt: now,
  });

  setAuthCookies(res, accessToken, refreshToken, csrfToken);
  res.status(201).json({
    user: { id: user!.id, email: user!.email, name: user!.name, phone: user!.phone },
    csrfToken,
  });
});

router.post('/login', csrfProtection, validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const csrfToken = generateCsrfToken();
  const payload = { userId: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const now = new Date();

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
    lastActivityAt: now,
  });

  setAuthCookies(res, accessToken, refreshToken, csrfToken);

  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));
  const permissions = await getUserPermissions(user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      roles: userRoleRows.map((r) => r.roleName),
      permissions,
    },
    csrfToken,
  });
}));

router.post('/logout', csrfProtection, authenticate, requireAuth, async (req: AuthRequest, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken && req.user) {
    await db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, req.user.userId),
          eq(refreshTokens.tokenHash, hashToken(refreshToken)),
        ),
      );
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.get('/csrf', (_req, res) => {
  const csrfToken = generateCsrfToken();
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ csrfToken });
});

router.get('/me', authenticate, requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      roles: userRoleRows.map((r) => r.roleName),
      permissions: req.user!.permissions,
    },
  });
});

router.post('/refresh', csrfProtection, async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  try {
    const payload = verifyToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.userId, payload.userId),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      );

    if (!stored) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    if (isSessionInactive(stored.lastActivityAt, stored.createdAt)) {
      await invalidateSession(stored.id, res);
      res.status(401).json({ error: 'Session expired due to inactivity' });
      return;
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

    const csrfToken = generateCsrfToken();
    const accessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);
    const now = new Date();

    await db.insert(refreshTokens).values({
      userId: payload.userId,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: refreshExpiryDate(),
      lastActivityAt: now,
    });

    setAuthCookies(res, accessToken, newRefreshToken, csrfToken);
    res.json({ csrfToken });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Session expired' });
  }
});

export default router;
