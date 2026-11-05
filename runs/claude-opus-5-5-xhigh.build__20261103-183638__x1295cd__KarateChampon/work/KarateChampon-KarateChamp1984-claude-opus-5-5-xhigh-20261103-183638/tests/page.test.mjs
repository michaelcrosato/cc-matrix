// page (browser): the engine's check.mjs on the bundle over file:// (no errors, no external requests, it draws), the
// session client inline and byte-identical as the first script, the exit interview parses
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), name = basename(root), bundle = join(root, '..', name + '.html');
export default async t => {
  t.check('the bundle exists beside PLAN.md', existsSync(bundle));
  const html = readFileSync(bundle, 'utf8'), session = readFileSync(join(root, 'vendor/aihub/session.js'), 'utf8');
  const first = html.indexOf('<script>'), metaAt = html.indexOf('<meta charset="utf-8">');
  t.check('the session client is the first script, right after <meta charset>', metaAt >= 0 && first > metaAt && html.slice(metaAt, first).trim() === '<meta charset="utf-8">');
  t.check('the session client is byte-identical', html.slice(first + 8, first + 8 + session.length) === session);
  t.check('the hub tags: session 1, shared-world, 2-4 players', /hub:session" content="1"/.test(html) && /hub:session-mode" content="shared-world"/.test(html) && /hub:session-players" content="2-4"/.test(html));
  t.check('<title>Karate Champon</title>', html.includes('<title>Karate Champon</title>'));
  let ei = null; try { ei = JSON.parse(readFileSync(join(root, '..', 'exit-interview.json'), 'utf8')); } catch (e) { /* checked below */ }
  t.check('exit-interview.json parses with every block', !!ei && ei.sourceInformation && ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4 && ei.aiHub && ei.aiHub.tags.length >= 3);
  for (const hash of ['', 'fight/stadium/mei', 'bonus/bull']) {
    let out = '', ok = true; try { out = execFileSync(process.execPath, [join(root, 'engine/tools/check.mjs'), bundle + (hash ? '#' + hash : ''), '--seconds', '3', '--out', join(root, 'tests/out/check')], { encoding: 'utf8', env: Object.assign({}, process.env), timeout: 120000 }); } catch (e) { ok = false; out = String(e.stdout || '') + String(e.stderr || e.message); }
    t.check('check.mjs ' + (hash || 'title') + ': no errors', ok && /\n\s*no errors/.test(out), out.split('\n').filter(l => /error|fail/i.test(l) && !/snapshot/.test(l)).slice(0, 4).join(' / '));
    let rep = {}; try { rep = JSON.parse(readFileSync(join(root, 'tests/out/check/report.json'), 'utf8')); } catch (e) { /* none */ }
    t.check('check.mjs ' + (hash || 'title') + ': no external requests', Array.isArray(rep.external) && rep.external.length === 0, JSON.stringify(rep.external));
  }
};
