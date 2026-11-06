// A static server on 127.0.0.1 and a port the OS picks. Stopped by its own PID only.
import { spawn } from 'node:child_process';
export function serve(dir) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] });
    let buf = '';
    const onData = (d) => {
      buf += d.toString();
      const m = /port (\d+)/.exec(buf);
      if (m) { proc.stdout.off('data', onData); proc.stdout.resume(); resolve({ port: Number(m[1]), url: `http://127.0.0.1:${m[1]}`, stop: () => proc.kill() }); }
    };
    proc.stdout.on('data', onData);
    proc.on('error', reject);
    proc.on('exit', (c) => reject(new Error(`server exited ${c}`)));
  });
}
