const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting URBANFLOW full-stack development environment...');

function runProcess(name, prefixColor, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWin
  });

  const formatLine = (data, isError = false) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        const color = isError ? '\x1b[31m' : prefixColor;
        console.log(`${color}[${name}]\x1b[0m ${line}`);
      }
    });
  };

  child.stdout.on('data', (d) => formatLine(d, false));
  child.stderr.on('data', (d) => formatLine(d, true));

  child.on('close', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return child;
}

const backend = runProcess('Backend', '\x1b[32m', npmCmd, ['run', 'dev'], path.join(rootDir, 'backend'));
const frontend = runProcess('Frontend', '\x1b[34m', npmCmd, ['run', 'dev'], path.join(rootDir, 'frontend'));

function cleanup() {
  console.log('\nShutting down dev servers...');
  if (isWin) {
    if (backend.pid) {
      try { spawn('taskkill', ['/pid', backend.pid, '/f', '/t']); } catch (_) {}
    }
    if (frontend.pid) {
      try { spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']); } catch (_) {}
    }
  } else {
    try { backend.kill(); } catch (_) {}
    try { frontend.kill(); } catch (_) {}
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
