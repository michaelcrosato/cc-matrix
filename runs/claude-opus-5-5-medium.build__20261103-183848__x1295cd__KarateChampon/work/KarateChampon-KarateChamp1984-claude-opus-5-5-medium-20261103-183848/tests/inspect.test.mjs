// Browser: direct inspection of the shipped HTML (tests/inspect.mjs), each TASK.md feature driven with real input.
import { execFileSync } from 'node:child_process';
export default async t => {
  let out = ''; try { out = execFileSync(process.execPath, [new URL('inspect.mjs', import.meta.url).pathname], { timeout: 600000 }).toString(); } catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); }
  const rows = out.split('\n').filter(l => /^(PASS|FAIL) /.test(l)); t.check('the inspection ran', rows.length >= 45, out.slice(-300));
  for (const r of rows) t.check('inspect: ' + r.slice(5).replace(/\s+\[.*$/, ''), r.startsWith('PASS'), r);
};
