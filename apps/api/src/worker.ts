import './load-env.js';
import { ensureBucket } from './lib/storage.js';
import { startWorkers } from './lib/queue.js';

ensureBucket()
  .then(() => startWorkers())
  .catch((err) => {
    console.error('Worker storage init failed:', err);
    process.exit(1);
  });
