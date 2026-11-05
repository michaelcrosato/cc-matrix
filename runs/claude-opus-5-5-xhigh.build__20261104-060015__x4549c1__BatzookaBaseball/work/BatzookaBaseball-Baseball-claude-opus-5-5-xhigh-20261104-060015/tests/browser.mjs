// Browser checks (--browser): the engine's check tool on the bundle at its deep links and sizes (no errors, no
// external requests, the canvas covered), then drawn runs in Chromium: the attract reel's whole loop and a 9-inning
// CPU game fast-forwarded with drawing, each with no errors. Prints FAIL lines and "N passed, M failed".
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(root, '..', 'BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015.html');
let passed = 0, failed = 0;
const ck = (name, ok, detail = '') => { if (ok) passed++; else { failed++; console.log('FAIL [browser] ' + name + (detail ? ': ' + String(detail).slice(0, 500) : '')); } };
for (const [hash, size] of [['', null], ['#match', null], ['#derby', null], ['#about', null], ['#gallery', null], ['', '1920x1080'], ['#touch', '390x844@3'], ['#training/1', null], ['#tour/2', null]]) {
  const a = [join(root, 'tools', 'check.mjs'), FILE + hash, '--seconds', '3', '--out', join(root, '.tmp', 'check-' + (hash.replace(/\W/g, '') || 'title') + (size ? '-' + size.replace(/\W/g, '') : ''))];
  if (size) a.push('--size', size);
  const r = spawnSync(process.execPath, a, { encoding: 'utf8', env: Object.assign({}, process.env, { TMPDIR: join(root, '.tmp') }) });
  const out = (r.stdout || '') + (r.stderr || '');
  ck('check ' + (hash || '(title)') + (size ? ' ' + size : ''), r.status === 0 && !/error\(s\):/.test(out), out.split('\n').filter(l => /error|FAIL|request/i.test(l)).slice(0, 6).join(' | '));
  ck('no external requests ' + (hash || '(title)'), !/external request/i.test(out) || /0 external/i.test(out));
}
const browser = await chromium.launch();
const run = async (hash, secs, label) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + FILE + hash); await page.waitForTimeout(2000);
  const res = await page.evaluate(async (secs) => {
    const g = My3D2dge.current; g.stop(); const seen = new Set();
    for (let i = 0; i < secs * 30; i++) { g.advance(1 / 30, { draw: true }); seen.add(g.sceneName); if (BZ.attract.on) seen.add('seg' + (BZ.attract.seg % BZ.ATTRACT.length)); if (i % 200 === 0) await new Promise(r => setTimeout(r, 0)); }
    return { seen: [...seen], errors: g.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')), scene: g.sceneName, inning: BZ.M && BZ.M.inning };
  }, secs);
  ck(label + ': no errors while drawing', !res.errors.length && !errs.length, res.errors.concat(errs).slice(0, 4).join(' || '));
  await page.close();
  return res;
};
const att = await run('#attract', 175, 'the attract reel');
ck('the attract reel shows every segment', BZ_SEGS(att.seen) >= 10, att.seen.join(' '));
const sim = await run('#sim/caldera', 700, 'a drawn 9-inning CPU game at Caldera');
ck('the drawn CPU game plays deep into the game (7th inning or the results)', sim.seen.includes('results') || sim.inning >= 7, sim.scene + ' inning ' + sim.inning);
await run('#sim/tranquility', 240, 'a drawn CPU game on the moon');
await run('#sim/boneyard', 240, 'a drawn CPU game in the Boneyard');
await run('#sim/megadome', 240, 'a drawn CPU game in the MegaDome');
await run('#sim/barnacle', 240, 'a drawn CPU game at Barnacle Bay');
await browser.close();
function BZ_SEGS(seen) { return seen.filter(s => /^seg\d+$/.test(s)).length; }
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
