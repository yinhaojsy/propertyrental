import '../load-env.js';
import { pool } from './index.js';
import { runMigrations } from './run-migrations.js';

async function run() {
  await runMigrations();
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
