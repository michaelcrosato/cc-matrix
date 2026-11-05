// node tests/browser/shots.mjs [names...]: screenshots for review into check-output/shots (1280 x 720)
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
process.env.TMPDIR = new URL('../../check-output/tmp/', import.meta.url).pathname;   // (the shared /tmp may be full)
const DEV = new URL('../..', import.meta.url).pathname, out = join(DEV, 'check-output', 'shots'); mkdirSync(out, { recursive: true });
const url = h => pathToFileURL(join(DEV, 'dev/index.html')).href + h;
const S = {
  newgame: ['#newgame', 2500, ''],
  intro: ['#intro', 3500, ''],
  town4: ['#play:lv4', 3500, 'DQ.ctx.clock.setHour(10)'],
  night: ['#play:lv4', 3500, 'DQ.ctx.clock.setHour(22)'],
  bag: ['#play:lv4', 3000, 'DQ.Menus.openSatchel(DQ.ctx,0)'],
  map: ['#play:lv4', 3000, 'DQ.Menus.openSatchel(DQ.ctx,1)'],
  journal: ['#play:lv4', 3000, 'DQ.Menus.openSatchel(DQ.ctx,2)'],
  craft: ['#play:lv4', 3000, '(()=>{const o=DQ.ctx.objects.list.find(q=>q.def.station==="bench");DQ.Menus.openCraft(DQ.ctx,"bench",o)})()'],
  chest: ['#play:lv4', 3000, '(()=>{const o=DQ.ctx.objects.list.find(q=>q.def.chest);DQ.Menus.openChest(DQ.ctx,o)})()'],
  banner: ['#play:lv4', 3000, 'DQ.Menus.openBanner(DQ.ctx)'],
  dev: ['#play:lv4', 3000, 'DQ.Dev.open()'],
  tuning: ['#play:lv4', 3000, '(()=>{DQ.Dev.open();const s=DQ.ctx.ui.top;s.tab=4;s.i=0})()'],
  about: ['#about', 2500, ''],
  aboutSrc: ['#about', 2500, 'DQ.SCENES.about.page=1'],
  aboutTest: ['#about', 2500, 'DQ.SCENES.about.page=2'],
  siege: ['#play:siege', 3000, '(()=>{DQ.ctx.siege.begin({prep:0});DQ.ctx.siege.t=0})()', 6000],
  boss: ['#play:boss', 3000, '(()=>{const g=DQ.ctx.bosses.list.find(m=>m.kind==="gnarlgrim");g.brain.tangle();DQ.ctx.builder.place3(g.x-30,g.y,g.z)})()', 800],
  quarry: ['#play:hall', 3000, 'DQ.Dev.warp(DQ.ctx,"quarryFloor")'],
  spire: ['#play:spire', 3000, 'DQ.Dev.warp(DQ.ctx,"spireTop")'],
  fraying: ['#play:spire', 3000, '(()=>{DQ.ctx.builder.teleportCell(112,118,DQ.ctx.world.topZ(112,118))})()'],
  tweed: ['#play:lv4', 3000, 'DQ.Dev.warp(DQ.ctx,"lintCamp")'],
  coast: ['#play:lv4', 3000, 'DQ.Dev.warp(DQ.ctx,"shipwreck")'],
  tq: ['#play:lv4', 3000, '(()=>{DQ.game.settings.set("camView","Three-quarter")})()'],
  rot: ['#play:lv4', 3000, 'DQ.game.rotateView(90)'],
  bee: ['#bee', 3000, ''],
  beeplay: ['#bee', 2500, '(()=>{const s=DQ.SCENES.bee;s.bots=3;s.startSolo()})()', 8000],
  attract: ['#attract', 9000, '']
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(S);
for (const n of names) {
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const [h, w0, js, w1] = S[n]; const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url(h)); await p.waitForTimeout(w0);
  if (js) { try { await p.evaluate(js); } catch (e) { errs.push('eval: ' + e.message); } await p.waitForTimeout(w1 || 900); }
  await p.screenshot({ path: join(out, n + '.png') });
  const ge = await p.evaluate(() => { const g = window.My3D2dge && My3D2dge.current; return g ? g.errors.map(e => e.where + ': ' + e.message) : ['no game']; });
  console.log(n, errs.concat(ge).slice(0, 3).join(' | ') || 'ok');
  await p.close(); await b.close();
}
