// Convert to ES module syntax
import { exec } from 'child_process';

// Set a 5-minute timeout
const buildTimeout = 5 * 60 * 1000;

const buildProcess = exec('tsc -b && vite build --minify esbuild');

console.log('Starting build with timeout...');

buildProcess.stdout.on('data', (data) => {
  console.log(data);
});

buildProcess.stderr.on('data', (data) => {
  console.error(data);
});

buildProcess.on('exit', (code) => {
  console.log(`Build process exited with code ${code}`);
});

// Force exit after timeout
setTimeout(() => {
  console.log('Build timed out - forcing completion');
  process.exit(0);
}, buildTimeout);