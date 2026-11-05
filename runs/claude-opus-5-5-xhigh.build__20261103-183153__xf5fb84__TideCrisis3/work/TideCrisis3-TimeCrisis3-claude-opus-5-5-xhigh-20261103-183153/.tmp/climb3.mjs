import { chromium } from 'playwright';
import { resolve } from 'node:path';
process.env.TMPDIR = resolve('.tmp');
const b = await chromium.launch();
const file = 'file://' + resolve('../TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153.html');
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForFunction(() => window.TC && TC.game && TC.game.sceneName === 'title', null, { timeout: 30000 });
await p.evaluate(() => { TC.debug.start({ stage: 2, scene: '2-4', cheats: { god: true } }); });
const st = () => p.evaluate(() => { const S = TC.play.sim, c = S.cameraFor(0); return { id: S.scene.id, ph: S.phase, climbing: S.climbing(), stair: S.enemies.filter(e => e.alive && e.cover && e.cover.stair && e.state !== 'enter').length, other: S.enemies.filter(e => e.alive && !e.civ && !e.ally && !(e.cover && e.cover.stair)).length, s: S.scene.id + ' ' + S.phase + ' ' + [c.x, c.y, c.z].map(v => v.toFixed(0)).join(',') + ' yaw ' + (c.yaw * 57.3).toFixed(0) + ' pitch ' + (c.pitch * 57.3).toFixed(0) }; });
let n = 0, fought = false;
for (let k = 0; k < 200; k++) {
  await p.waitForTimeout(250); const s = await st();
  if (s.climbing && n < 12 && k % 2 === 0) { console.log('climb', n, s.s); await p.screenshot({ path: 'shots/lh_climb_' + n++ + '.png' }); continue; }
  if (s.stair >= 2 && !fought) { await p.waitForTimeout(900); console.log('stairfight', s.s); await p.screenshot({ path: 'shots/lh_stairfight.png' }); fought = true; continue; }
  if (s.id === '2-4' && s.ph === 'action' && !s.climbing && (s.other > 0 || fought)) await p.evaluate(() => TC.dev.run(['a', 'kill'], TC.play));
  if (s.id === '2-B') break;
}
for (let k = 0; k < 16; k++) { const s = await st(); console.log('ride', k, s.s); await p.screenshot({ path: 'shots/lh_ride_' + k + '.png' }); if (s.ph === 'action') break; await p.waitForTimeout(450); }
console.log(errs); await b.close();
