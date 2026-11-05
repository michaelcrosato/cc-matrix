import { chromium } from 'playwright';
import { resolve } from 'node:path';
process.env.TMPDIR = resolve('.tmp');
const b = await chromium.launch();
const file = 'file://' + resolve('../TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153.html');
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForFunction(() => window.TC && TC.game && TC.game.sceneName === 'title', null, { timeout: 30000 });
await p.evaluate(() => { TC.debug.start({ stage: 2, scene: '2-4', cheats: { god: true } }); });
const st = () => p.evaluate(() => { const S = TC.play.sim, c = S.cameraFor(0); return { id: S.scene.id, ph: S.phase, s: S.scene.id + ' ' + S.phase + ' ' + [c.x, c.y, c.z].map(v => v.toFixed(0)).join(',') + ' r ' + Math.hypot(c.x - 1560, c.y).toFixed(0) + ' enemies ' + S.enemies.filter(e => e.alive && !e.civ).map(e => e.type + '@' + (e.cover && e.cover.id) + ':' + e.state).join(' ') }; });
for (let k = 0; k < 40; k++) { await p.waitForTimeout(700); const s = await st(); if (s.id === '2-4' && s.ph === 'action') { const al = await p.evaluate(() => TC.play.sim.enemies.filter(e => e.alive && !e.civ && !e.ally).map(e => e.cover && e.cover.id)); if (al.includes('s1') || al.includes('s2')) { console.log('STAIRS', s.s); await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/climb_stairs.png' }); } await p.evaluate(() => TC.dev.run(['a', 'kill'], TC.play)); } if (s.id === '2-B' || s.ph === 'clear' || s.ph === 'travel') break; }
for (let k = 0; k < 14; k++) { const s = await st(); console.log(k, s.s); await p.screenshot({ path: 'shots/climb_' + k + '.png' }); if (s.id === '2-B' && s.ph === 'action') break; await p.waitForTimeout(400); }
console.log(errs); await b.close();
