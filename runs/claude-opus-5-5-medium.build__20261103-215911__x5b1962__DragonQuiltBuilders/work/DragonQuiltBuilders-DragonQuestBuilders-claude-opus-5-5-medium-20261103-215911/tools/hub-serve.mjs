// Serves a folder on 127.0.0.1 at a port the OS picks (python3 -m http.server 0); returns { port, url, stop() }.
// Stops only the process it started, by its PID.
import { spawn } from 'node:child_process';
export function serve(dir) {
  return new Promise((resolve, reject) => {
    const p = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const onData = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) { p.stdout.off('data', onData); resolve({ port: +m[1], url: 'http://127.0.0.1:' + m[1] + '/', pid: p.pid, stop: () => { try { process.kill(p.pid); } catch (e) { /* gone */ } } }); } };
    p.stdout.on('data', onData); p.stderr.on('data', () => {});
    p.on('error', reject); setTimeout(() => reject(new Error('server did not start: ' + buf)), 10000);
  });
}
