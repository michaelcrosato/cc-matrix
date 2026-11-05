// serve(dir): python3 -m http.server on a port the OS picks, bound to 127.0.0.1; resolves { port, pid, stop() } once it
// prints its port. Stops only the process it started, by its PID.
import { spawn } from 'node:child_process';
export function serve(dir) {
  return new Promise((resolve, reject) => {
    const p = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', done = false;
    const onData = d => { out += d; const m = out.match(/port (\d+)/); if (m && !done) { done = true; resolve({ port: +m[1], pid: p.pid, stop: () => { try { process.kill(p.pid); } catch (e) { /* gone */ } } }); } };
    p.stdout.on('data', onData); p.stderr.on('data', onData);
    p.on('exit', c => { if (!done) reject(new Error('http.server exited ' + c + ': ' + out)); });
    setTimeout(() => { if (!done) { try { process.kill(p.pid); } catch (e) { /* gone */ } reject(new Error('http.server did not start: ' + out)); } }, 15000);
  });
}
