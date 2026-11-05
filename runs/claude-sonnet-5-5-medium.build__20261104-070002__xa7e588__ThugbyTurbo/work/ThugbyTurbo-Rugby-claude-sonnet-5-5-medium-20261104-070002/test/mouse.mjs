import { chromium } from '../tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => console.log('ERR', String(e).slice(0, 300)));
await p.goto(new URL('../../ThugbyTurbo-Rugby-claude-sonnet-5-5-medium-20261104-070002.html', import.meta.url).href); await p.waitForTimeout(1200);
await p.evaluate(() => __thugby.game.debug.go('match', { mode: 'exh', home: 'hawks', away: 'dockers', venue: 'docks', players: 0, half: 120 })); await p.waitForTimeout(1200);
await p.evaluate(() => { const s = __thugby.sim, S = s.S; S.phase = 'play'; S.sp = null; S.ball.st = 'loose'; for (const q of S.players) s.place(q, 100 + q.id * 3, 100 + q.id * 20); const c = S.players[4]; s.place(c, 600, 384, 0); s.giveBall(c); s.place(S.players[3], 560, 330, 0); S.dev.aiOff = true; for (const q of S.players) if (q.team === 1) { q.off = true; } });

let hit = null;
for (let x = 300; x < 980 && !hit; x += 24) for (let y = 150; y < 600 && !hit; y += 24) { await p.mouse.move(x, y); await p.waitForTimeout(25); const h = await p.evaluate(() => __thugby.TT.V.hover); if (h === 3) hit = [x, y]; }
let f=0; const chk=(n,c)=>{ if(!c){f++;console.log('FAIL '+n);} }; chk('mouse hover finds a teammate', !!hit);
if (hit) { const c0 = await p.evaluate(() => __thugby.sim.S.counts.pass | 0); await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); await p.waitForTimeout(400); chk('left click passes to the hovered teammate', (await p.evaluate(() => __thugby.sim.S.counts.pass | 0)) > c0);
 // right-button kick (retried: the pass above may still be in flight on a loaded machine)
 for (let t = 0; t < 4 && !(await p.evaluate(() => __thugby.sim.S.counts.kick | 0)); t++) { await p.waitForTimeout(600); await p.evaluate(() => { const s=__thugby.sim,S=s.S; S.phase='play'; S.sp=null; s.place(S.players[4], 600, 384, 0); s.giveBall(S.players[4]); }); await p.waitForTimeout(200); await p.mouse.move(900, 300); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(700); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(300); }
 chk('right-button hold and release kicks', (await p.evaluate(() => __thugby.sim.S.counts.kick | 0)) > 0); }
await b.close(); console.log(f ? f+' FAILED' : 'all 3 mouse checks passed'); process.exit(f?1:0);
