import type { Response } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { refreshTokens } from '../db/schema.js';
import { config } from '../config.js';
import { verifyToken, hashToken, type TokenPayload } from './utils.js';
import { clearAuthCookies } from './auth-cookies.js';

export function isSessionInactive(lastActivityAt: Date, createdAt: Date): boolean {
  const lastActive = lastActivityAt.getTime();
  return Date.now() - lastActive > config.session.inactivityMs;
}

export async function touchSession(tokenId: number): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ lastActivityAt: new Date() })
    .where(eq(refreshTokens.id, tokenId));
}

export async function invalidateSession(tokenId: number, res: Response): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
  clearAuthCookies(res);
}

export async function resolveRefreshSession(
  refreshToken: string,
  res: Response,
): Promise<{ payload: TokenPayload; tokenId: number } | null> {
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

    if (!stored) return null;

    if (isSessionInactive(stored.lastActivityAt, stored.createdAt)) {
      await invalidateSession(stored.id, res);
      return null;
    }

    await touchSession(stored.id);
    return { payload, tokenId: stored.id };
  } catch {
    return null;
  }
}
