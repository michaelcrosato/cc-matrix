// Shared helpers for the browser suites: launch chromium with WebGPU flags, serve a folder on an OS-picked port, stop only our own PIDs.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
export const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
export async function launch(extra = {}) { return chromium.launch({ args: ARGS, ...extra }); }
export function serve(dir) { return new Promise((resolve, reject) => { const p = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }); let buf = ''; const t = setTimeout(() => reject(new Error('server timeout')), 8000); p.stdout.on('data', (d) => { buf += d; const m = buf.match(/port (\d+)/); if (m) { clearTimeout(t); resolve({ port: +m[1], stop: () => p.kill() }); } }); p.on('error', reject); }); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
