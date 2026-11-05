// Downloads the pinned engine, 3D module, vendor libraries and AI Hub client into the dev folder (idempotent).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ENGINE = '4390a9852fe0ad01e1699a160f2a331931bb1a72';
const HUB = 'f8835e4824fbf9bbb4bac3a35e88e3ab197fdd1e';
const raw = (repo, sha, p) => `https://raw.githubusercontent.com/michaelcrosato/${repo}/${sha}/${p}`;

function tree(repo, sha) {
  const out = execFileSync('gh', ['api', `repos/michaelcrosato/${repo}/git/trees/${sha}?recursive=1`], { maxBuffer: 64 << 20 });
  return JSON.parse(out).tree.filter(t => t.type === 'blob');
}

async function get(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url);
    if (r.ok) { fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); return true; }
    await new Promise(res => setTimeout(res, 500 * (i + 1)));
  }
  throw new Error('fetch failed: ' + url);
}

const jobs = [];
const engineTree = tree('my-3d2dge', ENGINE);
for (const t of engineTree) {
  if (t.path.startsWith('dist/handoff/')) {
    // skip the agent build and unused heavy catalogs; keep everything the tools/kits need
    jobs.push([raw('my-3d2dge', ENGINE, t.path), path.join(ROOT, 'engine', t.path.slice('dist/handoff/'.length))]);
  }
}
jobs.push([raw('my-3d2dge', ENGINE, 'dist/my-3d2dge-3d.js'), path.join(ROOT, 'engine/my-3d2dge-3d.js')]);
for (const f of ['00-shell.js', '30-shooter.js', '40-horror.js', '60-flight.js', '10-action.js'])
  jobs.push([raw('my-3d2dge', ENGINE, 'src/starter3d/' + f), path.join(ROOT, 'ref', f)]);
for (const f of ['three.webgpu.min.js', 'three.core.min.js', 'three.tsl.min.js', 'LICENSE'])
  jobs.push([raw('my-3d2dge', ENGINE, 'vendor/three-0.182.0/' + f), path.join(ROOT, 'vendor/three-0.182.0', f)]);
for (const f of ['rapier.js', 'LICENSE'])
  jobs.push([raw('my-3d2dge', ENGINE, 'vendor/rapier3d-simd-compat-0.19.3/' + f), path.join(ROOT, 'vendor/rapier3d-simd-compat-0.19.3', f)]);
for (const f of ['session.js', 'harness.html', 'bridge.js', 'round.js', 'README.md', 'examples/ghost.html'])
  jobs.push([raw('ai-hub', HUB, 'lib/hub/' + f), path.join(ROOT, 'vendor/aihub', f)]);

let n = 0;
const pool = 8;
for (let i = 0; i < jobs.length; i += pool) {
  const got = await Promise.all(jobs.slice(i, i + pool).map(([u, d]) => get(u, d)));
  n += got.filter(Boolean).length;
}
console.log(`fetch-deps: ${n} downloaded, ${jobs.length - n} already present`);
