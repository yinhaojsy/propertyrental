import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.resolve(__dirname, '../../../uploads');

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

export function localPublicUrl(storageKey: string): string {
  return `${config.apiPublicUrl}/uploads/${storageKey}`;
}

export function localUploadUrl(storageKey: string): string {
  return `${config.apiPublicUrl}/api/local-storage/${encodeURIComponent(storageKey)}`;
}
