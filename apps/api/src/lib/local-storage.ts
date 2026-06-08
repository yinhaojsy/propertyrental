import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

export const uploadsRoot = config.uploadsDir;

let ready = false;

export async function ensureLocalStorage(): Promise<void> {
  if (ready) return;
  await fs.mkdir(uploadsRoot, { recursive: true });
  ready = true;
}

export function localFilePath(storageKey: string): string {
  return path.join(uploadsRoot, storageKey);
}

export async function writeLocalFile(storageKey: string, body: Buffer): Promise<void> {
  await ensureLocalStorage();
  const filePath = localFilePath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
}

export async function readLocalFile(storageKey: string): Promise<Buffer> {
  return fs.readFile(localFilePath(storageKey));
}

export async function deleteLocalFile(storageKey: string): Promise<void> {
  try {
    await fs.unlink(localFilePath(storageKey));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw err;
  }
}

export async function deleteLocalListingFolder(listingId: number): Promise<void> {
  const dir = path.join(uploadsRoot, 'listings', String(listingId));
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw err;
  }
}

export function localPublicUrl(storageKey: string): string {
  return `${config.apiPublicUrl}/uploads/${storageKey}`;
}

export function localUploadUrl(storageKey: string): string {
  return `${config.apiPublicUrl}/api/local-storage/${encodeURIComponent(storageKey)}`;
}
