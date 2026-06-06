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

function shutdown(serverClose?: () => void): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('Shutting down...');
  worker?.kill('SIGTERM');
  serverClose?.();
  setTimeout(() => process.exit(0), 8000).unref();
}

launchWorker();

const { start, httpServer } = await import('./index.js');
await start();

process.on('SIGTERM', () => {
  shutdown(() => {
    httpServer?.close(() => process.exit(0));
  });
});
process.on('SIGINT', () => {
  shutdown(() => {
    httpServer?.close(() => process.exit(0));
  });
});
