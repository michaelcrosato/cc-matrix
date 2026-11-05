// Serves a folder on 127.0.0.1 at a port the OS picks (python3 -m http.server 0). Returns { port, stop }; stop() kills
// only the PID this started.
import { spawn } from 'node:child_process';
export function serve(dir) {
  return new Promise((resolve, reject) => {
    const p = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let done = false; const onData = d => { const m = String(d).match(/port (\d+)/); if (m && !done) { done = true; resolve({ port: +m[1], pid: p.pid, stop: () => { try { process.kill(p.pid); } catch (e) { /* gone */ } } }); } };
    p.stdout.on('data', onData); p.stderr.on('data', onData);
    p.on('error', reject); setTimeout(() => { if (!done) { try { process.kill(p.pid); } catch (e) { /* gone */ } reject(new Error('server did not start')); } }, 8000);
  });
}
