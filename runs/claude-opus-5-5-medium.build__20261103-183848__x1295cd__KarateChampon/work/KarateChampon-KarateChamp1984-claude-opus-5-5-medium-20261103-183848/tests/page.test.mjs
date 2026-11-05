// Browser: the engine's check over file:// (no errors, no external requests), and the session client byte-identical
// and first after <meta charset>.
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
const root = new URL('../', import.meta.url), NAME = 'KarateChampon-KarateChamp1984-claude-opus-5-5-medium-20261103-183848.html';
export default async t => {
  const html = readFileSync(new URL('../' + NAME, root), 'utf8'), session = readFileSync(new URL('vendor/aihub/session.js', root), 'utf8');
  t.check('session.js inline, byte-identical, first after <meta charset>', html.indexOf('<meta charset="utf-8">\n<script>' + session + '</script>') > 0 && html.indexOf('<script') === html.indexOf('<script>' + session));
  for (const m of ['hub:session" content="1"', 'hub:session-players" content="2-4"', 'hub:session-mode" content="shared-world"']) t.check('meta ' + m, html.includes(m));
  t.check('<title>Karate Champon</title>', html.includes('<title>Karate Champon</title>'));
  let out = ''; try { out = execFileSync(process.execPath, [new URL('engine/tools/check.mjs', root).pathname, new URL('../' + NAME, root).pathname, '--out', new URL('tests/out/check', root).pathname], { stdio: 'pipe', timeout: 180000 }).toString(); } catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); }
  t.check('check.mjs: no errors', /no errors/.test(out), out.slice(-600));
  let rep = null; try { rep = JSON.parse(readFileSync(new URL('tests/out/check/report.json', root), 'utf8')); } catch (e) { try { rep = JSON.parse(readFileSync(new URL('check-output/report.json', root), 'utf8')); } catch (e2) { /* none */ } }
  t.check('no external requests', rep && Array.isArray(rep.external) && rep.external.length === 0, rep && rep.external);
  rmSync(new URL('check-output', root), { recursive: true, force: true });
};
