import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const target = path.resolve(apiRoot, 'web-dist');

const sources = [
  path.resolve(apiRoot, '../web/dist'),
  path.resolve(apiRoot, '../../apps/web/dist'),
];

for (const src of sources) {
  try {
    await fs.access(path.join(src, 'index.html'));
    await fs.rm(target, { recursive: true, force: true });
    await fs.cp(src, target, { recursive: true });
    console.log(`Staged web app: ${src} -> ${target}`);
    process.exit(0);
  } catch {
    // try next source
  }
}

console.error('Web build not found. Expected apps/web/dist after vite build.');
process.exit(1);
