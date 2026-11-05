import { chromium } from 'playwright';
import { resolve } from 'node:path';
process.env.TMPDIR = resolve('.tmp');
const b = await chromium.launch();
const file = 'file://' + resolve('../TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153.html');
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(file); await p.waitForFunction(() => window.TC && TC.game && TC.game.sceneName === 'title', null, { timeout: 30000 });
await p.evaluate(() => { TC.debug.start({ stage: 2, scene: '2-3', cheats: { god: true } }); }); await p.waitForTimeout(400); await p.evaluate(() => TC.debug.bot(true, 'expert'));
for (let k = 0; k < 6; k++) { await p.waitForTimeout(3000); const s = await p.evaluate(() => { const S = TC.play.sim, c = S.cameraFor(0); return [S.scene.id, S.phase, S.carriers.funi.d.toFixed(0), [c.x, c.y, c.z].map(v => v.toFixed(0)).join(','), (c.yaw * 57.3).toFixed(0), (c.pitch * 57.3).toFixed(0), S.enemies.filter(e => e.alive && !e.civ && !e.ally).length].join(' '); }); console.log(k, s); await p.screenshot({ path: 'shots/funi_' + k + '.png' }); }
await b.close();
