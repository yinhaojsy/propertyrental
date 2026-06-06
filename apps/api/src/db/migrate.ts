import '../load-env.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';

async function run() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
