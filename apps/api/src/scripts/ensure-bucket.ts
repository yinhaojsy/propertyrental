import '../load-env.js';
import { ensureBucket } from '../lib/storage.js';

async function main() {
  await ensureBucket();
  console.log(`S3 bucket ready: ${process.env.S3_BUCKET ?? 'property-rental'}`);
}

main().catch((err) => {
  console.error('Failed to ensure S3 bucket:', err.message);
  process.exit(1);
});
