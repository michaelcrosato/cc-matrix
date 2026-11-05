// The content validator (§14.7) as a suite: areas, rails, cameras, spots, waves, triggers, talks, speakers.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export default async (T) => {
  let out = '', ok = true;
  try { execFileSync(process.execPath, [path.join(ROOT, 'tools/validate-content.mjs')], { stdio: 'pipe' }); } catch (e) { ok = false; out = String(e.stderr || e.stdout || e.message); }
  T.check('the content validates', ok, out.split('\n').slice(0, 8).join(' | '));
};
