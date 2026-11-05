// The rig sheet: every character (or every suit on one fighter) at 4 facings in the game's views, at 2x, into
// test-output/rigsheet/*.png. node tools/rigsheet.mjs [cast|suits|poses] [fighter]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGame, VENDOR_MOCAP } from './build.mjs';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'cast', who = process.argv[3] || 'tess';
buildGame();
mkdirSync(join(DEV, 'test-output/rigsheet'), { recursive: true });
const page = join(DEV, 'test-output/rigsheet/sheet.html');
writeFileSync(page, `<!doctype html><html><body style="margin:0;background:#222">
<script>window.AOA_NO_BOOT = true;</script>
<script src="../../engine/my-3d2dge.js"></script>
${VENDOR_MOCAP.map(f => `<script src="../../${f}"></script>`).join('')}
<script src="../../build/game.js"></script>
<canvas id="c"></canvas>
<script>
const E = My3D2dge, G = window.AOA, mode = ${JSON.stringify(mode)}, who = ${JSON.stringify(who)};
const views = [new E.View('court', 'Broadcast', 0, 32, 1.5, 1), new E.View('servecam', 'Serve Cam', 90, 46, 1.5, 1), E.VIEWS.threequarter, E.VIEWS.iso];
let rows;
if (mode === 'suits') rows = G.SUIT_IDS.map(s => ({ label: s, rig: () => G.makeRig(who, { suit: s }) }));
else if (mode === 'poses') rows = ['vready', 'bump', 'set', 'blockup', 'toss', 'spikearm', 'highfive', 'clap', 'facepalm', 'peace', 'lookback', 'stretch', 'sit', 'cheer', 'wave', 'hips'].map(p => ({ label: p, pose: p, rig: () => G.makeRig(who) }));
else if (mode === 'clips') { G.Anim.init(); rows = G.Anim.lib.names.map(n => ({ label: n, clip: n, rig: () => G.makeRig(who) })); }
else if (mode === 'acc') rows = G.ACC_IDS.map(a => ({ label: a, rig: () => G.makeRig(who, { acc: [a] }) }));
else rows = Object.keys(G.CAST).map(id => ({ label: id, rig: () => G.makeRig(id) }));
const facings = [0, Math.PI / 2, Math.PI, -Math.PI / 2], CW = 64, CH = 78, W = CW * facings.length * views.length, H = CH * rows.length;
const cv = document.getElementById('c'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
g.fillStyle = '#e8d4a0'; g.fillRect(0, 0, W, H);
rows.forEach((row, ri) => views.forEach((v, vi) => facings.forEach((f, fi) => {
  const rig = row.rig(); if (row.clip) { const c = G.Anim.lib.clip(row.clip); G.Anim.clip(rig, row.clip, c.dur * (vi * 4 + fi) / 16); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 }); } else for (let k = 0; k < 40; k++) rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: f, pose: row.pose });
  const x = (vi * facings.length + fi) * CW, y = ri * CH;
  g.fillStyle = (vi + ri) % 2 ? '#e2c088' : '#f3d9a4'; g.fillRect(x, y, CW, CH);
  rig.draw(g, x + CW / 2, y + CH - 8, v);
  if (vi === 0 && fi === 0) { E.font.text(g, row.label, x + 2, y + 2, '#2a1a10', { outline: false }); }
})));
window.done = true;
</script></body></html>`);
const browser = await chromium.launch();
const p = await browser.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(page).href);
await p.waitForFunction(() => window.done, null, { timeout: 15000 }).catch(() => {});
const el = await p.$('#c'), box = await el.boundingBox();
await p.setViewportSize({ width: Math.ceil(box.width * 2), height: Math.ceil(box.height * 2) });
await p.evaluate(() => { const c = document.getElementById('c'); c.style.width = c.width * 2 + 'px'; c.style.imageRendering = 'pixelated'; });
const out = join(DEV, `test-output/rigsheet/${mode}${mode === 'cast' ? '' : '-' + who}.png`);
await (await p.$('#c')).screenshot({ path: out });
await browser.close();
console.log(errs.length ? 'errors: ' + errs.join(' | ') : 'ok', out);
