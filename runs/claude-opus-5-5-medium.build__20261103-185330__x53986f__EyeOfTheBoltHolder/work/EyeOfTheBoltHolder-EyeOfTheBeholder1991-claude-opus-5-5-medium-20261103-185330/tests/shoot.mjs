// Looks (not pass or fail): screenshots at 1920x1080, 1280x720 and 1024x768, and filmstrips (contact sheets of frames)
// of motions a script can't judge. Usage: node tests/shoot.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { NAME } from '../tools/build.mjs';
import { ARGS } from './suites/20-browser.mjs';
const root = new URL('../..', import.meta.url).pathname, out = new URL('../shots/', import.meta.url).pathname;
const browser = await chromium.launch({ args: ARGS });
const open = async (w, h) => { const p = await browser.newPage({ viewport: { width: w, height: h } }); await p.goto('file://' + root + NAME + '.html?backend=webgl'); await p.waitForFunction(() => window.B && B.game && B.game.sceneName === 'title', null, { timeout: 120000 }); await p.waitForTimeout(1000); return p; };
const play = (p, fid, x, y, d) => p.evaluate(([fid, x, y, d]) => { B.newState(5); B.game.go('play', { resume: true }, { fade: 0 }); setTimeout(() => B.devWarp(fid, x, y, d), 50); }, [fid, x, y, d]);
for (const [w, h] of [[1920, 1080], [1280, 720], [1024, 768]]) {
  const p = await open(w, h), tag = w + 'x' + h;
  await p.screenshot({ path: out + tag + '-title.png' });
  await play(p, 'f1', 2, 7, 0); await p.waitForTimeout(2500); await p.screenshot({ path: out + tag + '-f1.png' });
  await p.evaluate(() => B.Play.openScreen('party', { m: 0 })); await p.waitForTimeout(500); await p.screenshot({ path: out + tag + '-party.png' });
  await p.evaluate(() => { B.Play.closeScreen(); B.Play.openScreen('camp'); }); await p.waitForTimeout(400); await p.screenshot({ path: out + tag + '-camp.png' });
  await p.evaluate(() => { B.Play.closeScreen(); B.devWarp('f4', 6, 5, 0); B.S.floors.f4.doors.G10.want = 1; for (const m of B.S.floors.f4.mons) if (m.type !== 'boltholder') m.hp = 0; B.bossWake(); B.S.talk = null; }); await p.waitForTimeout(2500); await p.screenshot({ path: out + tag + '-boss.png' });
  await p.close();
}
// filmstrips: frames every 60 ms, laid out in a sheet
const FW = +(process.env.FW || 1920), FH = Math.round(FW * 9 / 16), p = await open(FW, FH), strips = {};
const film = async (name, setup, n = 10, gap = 70, clip = { x: FW / 8, y: FH / 12, width: FW * .75, height: FH * .7 }) => {
  await p.evaluate(() => { B.game.timeScale = .08; B.Play.slowFilm = true; }); await p.evaluate(setup); const frames = [];
  for (let i = 0; i < n; i++) { frames.push((await p.screenshot({ clip })).toString('base64')); await p.waitForTimeout(gap); }
  await p.evaluate(() => { B.game.timeScale = 1; B.Play.slowFilm = false; }); strips[name] = frames;
};
await play(p, 'f1', 2, 11, 1); await p.waitForTimeout(2500);
await film('lever', () => { B.Play.cmd({ c: 'use' }); }, 8, 30);
await p.evaluate(() => { B.S.floors.f1.doors.G1.want = 0; B.S.floors.f1.doors.G1.open = 0; B.S.party.dir = 0; }); await p.waitForTimeout(1500);
await film('gate', () => { B.S.party.dir = 1; B.Play.cmd({ c: 'use' }); B.S.party.dir = 0; }, 10, 120);
await p.evaluate(() => { B.devWarp('f1', 2, 6, 0); B.S.floors.f1.mons = []; const m = B.spawnMon('f1', 'skeleton', 2, 5, {}); m.aware = true; m.state = 'hunt'; m.atkT = 0; m.reengage = 0; }); await p.waitForTimeout(1200);
await film('windup', () => {}, 12, 80);
await film('swing', () => { B.CHEATS.god = true; B.Play.cmd({ c: 'strike' }); }, 10, 40);
await p.evaluate(() => { B.devWarp('f1', 9, 8, 2); B.S.floors.f1.mons = []; }); await p.waitForTimeout(1000);
await film('illusion', () => { B.Play.cmd({ c: 'move', d: 'f' }); }, 8, 50);
await p.evaluate(() => { B.devWarp('f4', 6, 5, 0); B.S.floors.f4.doors.G10.want = 1; for (const m of B.S.floors.f4.mons) if (m.type !== 'boltholder') m.hp = 0; B.bossWake(); B.S.talk = null; B.CHEATS.god = true; }); await p.waitForTimeout(2000);
await film('bolts', () => { const b = B.bossMon().boss; b.locks = [true, true, false]; }, 6, 120);
await film('lightning', () => { const m = B.bossMon(); m.boss.atkT = 0; }, 12, 90);
for (const [name, frames] of Object.entries(strips)) {
  const sheet = await p.evaluate(async fr => { const ims = await Promise.all(fr.map(async b => { const i = new Image(); i.src = 'data:image/png;base64,' + b; await i.decode(); return i; })); const cols = 4, w = 320, h = Math.round(w * ims[0].height / ims[0].width), c = document.createElement('canvas'); c.width = cols * w; c.height = Math.ceil(ims.length / cols) * h; const g = c.getContext('2d'); ims.forEach((im, k) => g.drawImage(im, (k % cols) * w, Math.floor(k / cols) * h, w, h)); return c.toDataURL('image/png').split(',')[1]; }, frames);
  writeFileSync(out + 'film-' + FW + '-' + name + '.png', Buffer.from(sheet, 'base64'));
}
console.log('errors', JSON.stringify(await p.evaluate(() => B.game.errors.map(e => e.message))));
await browser.close();
