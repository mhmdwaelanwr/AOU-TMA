import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = [];

function has(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0;
}

function start(name, command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[${name}] exited with code ${code}`);
  });
  children.push(child);
}

const python = has('python3') ? 'python3' : has('python') ? 'python' : null;
if (!python) {
  console.error('Python 3 is required for local full-stack mode. Run npm run setup after installing Python.');
  process.exit(1);
}

console.log('\nAOU TMA Hub live development\n');
console.log('Frontend: http://localhost:5173');
console.log('API:      http://localhost:8000');
console.log('FX:       http://localhost:3001\n');

start('api', python, ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], 'backend-python', {
  CORS_ORIGINS: 'http://localhost:5173',
});
start('fx', 'node', ['--watch', 'src/index.js'], 'backend-node', {
  CORS_ORIGINS: 'http://localhost:5173',
});
start('frontend', 'npm', ['run', 'dev', '--', '--host', '0.0.0.0'], 'frontend');

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 250);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
