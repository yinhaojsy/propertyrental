import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerScript = path.join(__dirname, 'worker.js');

let worker: ChildProcess | null = null;
let shuttingDown = false;

function launchWorker(): void {
  if (shuttingDown) return;

  worker = spawn(process.execPath, [workerScript], { stdio: 'inherit' });

  worker.on('exit', (code, signal) => {
    worker = null;
    if (shuttingDown) return;
    console.error(`Worker exited (code=${code}, signal=${signal}), restarting in 3s...`);
    setTimeout(launchWorker, 3000);
  });
}

function shutdown(): void {
  shuttingDown = true;
  worker?.kill('SIGTERM');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

launchWorker();
await import('./index.js');
