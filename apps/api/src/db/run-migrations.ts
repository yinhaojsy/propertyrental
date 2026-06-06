import path from 'path';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder });
  console.log('Database migrations complete.');
}
