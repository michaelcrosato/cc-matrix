// real keyboard and mouse in Chromium, no debug calls that change the game: menus, pause, dev mode, settings, attract, a boss
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const FILE = 'file://' + resolve('../MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259.html');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const S = () => p.evaluate(() => My3D2dge.current.debug.snapshot()), out = {};
const ev = f => p.evaluate(f);
// 1 attract: 11 s idle on the title, then a key returns
await p.goto(FILE); await p.waitForTimeout(12000); out.attractStarts = (await S()).scene;
await p.waitForTimeout(4000); out.attractReel = (await S()).reel;
await p.keyboard.press('KeyX'); await p.waitForTimeout(800); out.keyReturnsToTitle = (await S()).scene;
// 2 how to play with keys, Settings via the menu: switch to Xbox glyphs in the engine's settings screen
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
out.howto = (await S()).scene; await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200); out.howtoPage = await ev(() => MT.howtoPanel.page);
await p.keyboard.press('Escape'); await p.waitForTimeout(700);
await ev(() => My3D2dge.current.settings.set('glyphs', 'xbox')); out.xboxGlyphs = await ev(() => My3D2dge.current.players.every(q => q.glyphs === 'xbox')); await ev(() => My3D2dge.current.settings.set('glyphs', 'playstation'));
// 3 into Mashy's room via the deep link, fight with keys + mouse
await p.goto('about:blank'); await p.goto(FILE + '#boss=1'); await p.waitForTimeout(3000);
const keys = ['KeyA', 'KeyD']; await p.mouse.down();
for (let t = 0; t < 120; t++) {
  if (t % 8 === 0) { await p.keyboard.up(keys[(t / 8 + 1) % 2]); await p.keyboard.down(keys[(t / 8) % 2]); }
  const aim = await ev(() => { const W = MT.Show.W, g = My3D2dge.current; if (!W || !W.boss) return null; const B = W.boss, pt = g.r.w(B.x, B.y, 20), cv = document.getElementById('screen'), k = cv.getBoundingClientRect().width / g.r.W; return [(pt[0] - g.r.ix) * k, (pt[1] - g.r.iy) * k]; });
  if (aim) await p.mouse.move(aim[0], aim[1]);
  if (t % 12 === 5) await p.keyboard.press('Space');
  if (t === 30) await p.keyboard.press('KeyE');
  await p.waitForTimeout(250);
}
await p.mouse.up(); for (const k of keys) await p.keyboard.up(k);
out.boss = await ev(() => { const s = My3D2dge.current.debug.snapshot(); return { phase: s.boss && s.boss.phase, parts: s.boss && s.boss.parts.map(q => q[0] + ':' + q[1]).join(' '), bullets: s.bullets, hp: s.players[0].hp, lives: s.players[0].lives, cash: s.players[0].cash }; });
await p.screenshot({ path: 'shots/handplay-boss.png' });
// 4 Esc pauses; the pause menu's Dev mode button opens the panel; arrows change a slider live; Esc closes it
await p.keyboard.press('Escape'); await p.waitForTimeout(600); out.paused = await ev(() => My3D2dge.current.paused);
const devBtn = await p.$('text=Dev mode'); out.devButton = !!devBtn; if (devBtn) await devBtn.click(); await p.waitForTimeout(500);
out.devOpen = await ev(() => MT.overlay.kind);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); out.sliderPlayerSpeed = await ev(() => MT.T.playerSpeed);
await p.keyboard.press('KeyR'); await p.waitForTimeout(150); out.sliderReset = await ev(() => MT.T.playerSpeed);
await p.screenshot({ path: 'shots/handplay-dev.png' });
await p.keyboard.press('Escape'); await p.waitForTimeout(300); out.devClosed = await ev(() => !MT.overlay.open);
out.audio = await ev(() => { const a = My3D2dge.current.audio; return a.ctx && a.ctx.state; });
out.errors = errs;
console.log(JSON.stringify(out, null, 1));
await b.close();
