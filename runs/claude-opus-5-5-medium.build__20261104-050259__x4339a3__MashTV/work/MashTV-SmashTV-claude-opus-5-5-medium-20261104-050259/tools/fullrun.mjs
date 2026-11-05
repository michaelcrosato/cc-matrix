// the whole game in Chromium with real keyboard and mouse events only: P1 is a local contestant, its "hands" are this script
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const FILE = 'file://' + resolve('../MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259.html');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const ROUTE = ['1-2', '1-4', '1-5', '1-B', '2-2', '2-4', '2-5', '2-B', '3-2', '3-4', '3-5', '3-B'];
const log = { scenes: [], rooms: [], recaps: 0, continues: 0 }; let lastScene = '', lastRoom = '';
await p.goto(FILE); await p.waitForTimeout(1800);
const ROOKIE = async () => { await p.keyboard.press('Enter'); await p.waitForTimeout(700); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(700); await p.keyboard.press('Enter'); };
await ROOKIE();
const held = new Set(); const hold = async (k, on) => { if (on && !held.has(k)) { held.add(k); await p.keyboard.down(k); } else if (!on && held.has(k)) { held.delete(k); await p.keyboard.up(k); } };
let mouseDown = false; const t0 = Date.now();
while (Date.now() - t0 < 100 * 60 * 1000) {
  // what a player sees and decides (the bot's judgement, read only; the game is driven by the events below)
  const st = await p.evaluate((route) => {
    const g = My3D2dge.current, sc = g.sceneName, W = MT.Show.W, out = { sc, room: W && W.room.id, phase: W && W.phase, state: MT.Show.state };
    if (sc !== 'play' || !W || MT.Show.state !== 'room') return out;
    const c = W.contestants[0]; out.cstate = c.state;
    const it = MT.bot.intent(c, W, { route, bombAt: 18 });
    const key = W.pickups.find(q => !q.dead && (q.kind === 'key' || q.kind === 'statue') && q.z < 14);   // a player who wants the Green Room goes for the keys first
    if (key && (W.phase === 'exit' || W.phase === 'clear' || W.alive() < 4)) { const d = Math.hypot(key.x - c.x, key.y - c.y) || 1; it.move = [(key.x - c.x) / d, (key.y - c.y) / d]; }
    // move: ground direction -> the screen keys that give it
    const s = g.view.p ? null : null; const m = it.move; let sx = 0, sy = 0;
    if (Math.hypot(m[0], m[1]) > .3) { sx = m[0]; sy = m[1]; }
    out.keys = { KeyD: sx > .38, KeyA: sx < -.38, KeyS: sy > .38, KeyW: sy < -.38 };
    if (it.aim !== null && it.fire) { const tx = c.x + Math.cos(it.aim) * 60, ty = c.y + Math.sin(it.aim) * 60, pt = g.r.w(tx, ty, 10), cv = document.getElementById('screen'), k = cv.getBoundingClientRect().width / g.r.W; const rc = cv.getBoundingClientRect(); out.aim = [rc.left + (pt[0] - 1) * k, rc.top + (pt[1] - 1) * k]; }
    out.slide = it.slide; out.bomb = it.bomb; out.boat = it.showboat; out.start = it.start;
    return out;
  }, ROUTE);
  if (st.sc !== lastScene) { log.scenes.push(st.sc); lastScene = st.sc; }
  if (st.room && st.room !== lastRoom) { log.rooms.push(st.room); lastRoom = st.room; }
  if (st.sc === 'play' && st.keys) {
    for (const [k, v] of Object.entries(st.keys)) await hold(k, v);
    if (st.aim) { await p.mouse.move(st.aim[0], st.aim[1]); if (!mouseDown) { await p.mouse.down(); mouseDown = true; } } else if (mouseDown) { await p.mouse.up(); mouseDown = false; }
    if (st.slide) await p.keyboard.press('Space'); if (st.bomb) await p.keyboard.press('KeyE'); if (st.boat) await p.keyboard.press('KeyQ'); if (st.start) await p.keyboard.press('Enter');
  } else {
    for (const k of [...held]) await hold(k, false); if (mouseDown) { await p.mouse.up(); mouseDown = false; }
    if (st.sc === 'play' && st.state === 'continue') { log.continues++; await p.keyboard.press('Enter'); }
    if (st.sc === 'cut' || st.sc === 'recap' || st.sc === 'play') await p.keyboard.press('Enter');   // skip lines, cards and the map
    if (st.sc === 'cut') { await p.keyboard.down('Enter'); await p.waitForTimeout(900); await p.keyboard.up('Enter'); }
  }
  if (st.sc === 'ending' && !log.ending) { log.ending = await p.evaluate(() => My3D2dge.current.scene.kind); await p.waitForTimeout(3000); await p.screenshot({ path: 'shots/fullrun-ending.png' }); }
  if (st.sc === 'ending' || st.sc === 'credits') await p.keyboard.press('Enter');
  if (st.sc === 'initials') { await p.keyboard.press('ArrowUp'); await p.waitForTimeout(150); for (let i = 0; i < 3; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(150); } }
  if (st.sc === 'scores') { log.table = await p.evaluate(() => MT.cab.table('show')); await p.screenshot({ path: 'shots/fullrun-scores.png' }); await p.keyboard.press('Enter'); }
  if (st.sc === 'gameover' || st.sc === 'title' && log.rooms.length) break;
  await p.waitForTimeout(90);
}
const fin = await p.evaluate(() => ({ scene: My3D2dge.current.sceneName, keys: MT.run && MT.run.keys, robot: MT.run && MT.run.lanceRobot, cash: MT.run && MT.run.contestants[0].cash, killed: MT.run && Object.keys(MT.run.killedKinds), used: MT.run && Object.keys(MT.run.usedW), audio: My3D2dge.current.audio.ctx && My3D2dge.current.audio.ctx.state }));
console.log(JSON.stringify({ minutes: ((Date.now() - t0) / 60000).toFixed(1), log, fin, errors: errs.slice(0, 5) }, null, 1));
await p.screenshot({ path: 'shots/fullrun-end.png' }); await b.close();
