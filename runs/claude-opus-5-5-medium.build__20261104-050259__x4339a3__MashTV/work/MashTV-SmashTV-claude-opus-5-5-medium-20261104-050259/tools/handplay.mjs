// a person's session, no bots: keyboard and mouse only, from the title into play
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const FILE = 'file://' + resolve('../MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259.html');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const S = () => p.evaluate(() => My3D2dge.current.debug.snapshot());
await p.goto(FILE); await p.waitForTimeout(1800);
for (const k of ['Enter', 'Enter', 'Enter']) { await p.keyboard.press(k); await p.waitForTimeout(900); }   // START THE SHOW, CONTESTANT, READY
console.log('after lobby:', (await S()).scene);
const waitScene = async n => { for (let i = 0; i < 60 && (await S()).scene !== n; i++) await p.waitForTimeout(250); };
await waitScene('cut'); await p.waitForTimeout(3000); console.log('cold open playing:', (await S()).scene);
await p.keyboard.down('Enter'); await p.waitForTimeout(1200); await p.keyboard.up('Enter');   // hold to skip the cold open
await waitScene('play'); await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(4000);   // skip the episode card
let s = await S(); console.log('in play:', s.scene, s.room, s.phase);
// play: circle-strafe with WASD while the mouse aims at the nearest goon and holds left click
const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA']; let k = 0, slides = 0;
await p.mouse.move(640, 300); await p.mouse.down();
for (let t = 0; t < 90; t++) {
  if (t % 6 === 0) { await p.keyboard.up(keys[k % 4]); k++; await p.keyboard.down(keys[k % 4]); }
  const aim = await p.evaluate(() => { const W = MT.Show.W, c = W.contestants[0], g = My3D2dge.current; let best = null, bd = 1e9; for (const e of W.enemies) { if (e.dead || e.entering) continue; const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < bd) { bd = d; best = e; } } if (!best) return null; const pt = g.r.w(best.x, best.y, 10), cv = document.getElementById('screen'), kx = cv.getBoundingClientRect().width / g.r.W; return [(pt[0] - g.r.ix) * kx, (pt[1] - g.r.iy) * kx]; });
  if (aim) await p.mouse.move(aim[0], aim[1]);
  if (t % 15 === 7) { await p.keyboard.press('Space'); slides++; }
  if (t === 40) await p.keyboard.press('KeyQ');
  await p.waitForTimeout(250);
  s = await S(); if (s.phase === 'exit' || s.players[0].state === 'out') break;
}
await p.mouse.up(); for (const kk of keys) await p.keyboard.up(kk);
s = await S();
const audio = await p.evaluate(() => { const a = My3D2dge.current.audio; return { ctx: a.ctx && a.ctx.state, song: !!a.song, muted: a.muted }; });
console.log(JSON.stringify({ room: s.room, phase: s.phase, wave: s.wave, cash: s.players[0].cash, hp: s.players[0].hp, lives: s.players[0].lives, R: s.R, kills: await p.evaluate(() => MT.Show.W.contestants[0].kills), slides, audio, errors: errs }));
await p.screenshot({ path: 'shots/handplay.png' });
await b.close();
