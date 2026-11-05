// Screenshots for review (not a test): one boot, then each scenario set up through game.debug. node tests/shoot.mjs [names...] [--w=1280 --h=720]
import { open, bootWait } from './shot.mjs';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('='))), only = args.filter(a => !a.startsWith('--'));
const W = +(opt.w || 1280), H = +(opt.h || 720), tag = opt.tag || '';
const SC = {
  title: [`g.go('title', null, { fade: 0 })`, 1500],
  create: [`g.go('create', null, { fade: 0 })`, 1200],
  createLook: [`g.go('create', null, { fade: 0 })`, 600, `B.Create.slot=0;B.Create.cur=B.Create.newHero();B.Create.cur.race='dwarf';B.Create.cur.cls='C';B.Create.step=2;`, 600],
  f1: [`D.UI.closeAll(); D.warp('f1',2,14,0); g.go('play', null, { fade: 0 })`, 1500],
  channel: [`D.warp('f1',2,8,0); g.go('play', null, { fade: 0 })`, 2000],
  party: [`D.warp('f1',2,14,0); g.go('play', null, { fade: 0 })`, 1200, `D.UI.open('party',{m:0})`, 600],
  sheet: [`D.warp('f1',2,14,0); g.go('play', null, { fade: 0 })`, 1200, `D.UI.open('party',{m:3}); D.SCREENS.party.sheet=true`, 600],
  cast: [`D.warp('f1',2,8,0); g.go('play', null, { fade: 0 })`, 1200, `D.UI.open('cast',{m:3})`, 600],
  camp: [`D.warp('f1',5,13,0); g.go('play', null, { fade: 0 })`, 1200, `D.cmd({c:'camp',op:'open'}); D.UI.open('camp')`, 600],
  map: [`D.warp('f1',10,6,1); g.go('play', null, { fade: 0 })`, 1200, `D.UI.open('map')`, 600],
  journal: [`D.warp('f1',10,8,2); g.go('play', null, { fade: 0 })`, 1200, `D.cmd({c:'use'}); D.UI.open('journal',{tab:1})`, 600],
  talk: [`D.warp('f1',5,2,1); g.go('play', null, { fade: 0 })`, 1200, `D.cmd({c:'use'})`, 1800],
  f2: [`D.warp('f2',7,1,1); g.go('play', null, { fade: 0 })`, 3500],
  clock: [`D.warp('f2',18,3,0); g.go('play', null, { fade: 0 })`, 2000],
  f3: [`D.warp('f3',6,8,1); g.go('play', null, { fade: 0 })`, 2500],
  chapel: [`D.warp('f3',18,4,0); g.go('play', null, { fade: 0 })`, 2000],
  f4: [`D.warp('f4',6,8,0); g.go('play', null, { fade: 0 })`, 2000],
  boss: [`D.warp('f4',6,5,0); g.go('play', null, { fade: 0 })`, 7000],
  dev: [`D.warp('f1',2,14,0); g.go('play', null, { fade: 0 })`, 1200, `D.UI.open('dev')`, 600],
  about: [`g.go('about', null, { fade: 0 })`, 1200],
  over: [`D.warp('f1',2,14,0); g.go('over', null, { fade: 0 })`, 1500],
  race: [`B.startRace({solo:true})`, 5000],
  intro: [`B.newGame({seed:2}); g.go('cutscene', { id: 'intro' }, { fade: 0 })`, 4000],
  introB: [`B.newGame({seed:2}); g.go('cutscene', { id: 'intro' }, { fade: 0 })`, 1500, `const c = g.scenes.cutscene; for (let i = 0; i < 7; i++) c.next();`, 3000],
  ending: [`D.warp('f4',6,5,0); B.S.boss.alive=false; B.S.boss.dead=2; g.go('cutscene', { id: 'ending' }, { fade: 0 })`, 3000],
  endingD: [`D.warp('f4',6,5,0); g.go('cutscene', { id: 'ending' }, { fade: 0 })`, 1500, `const c = g.scenes.cutscene; c.next(); c.next();`, 3000],
  credits: [`D.warp('f4',6,5,0); g.go('credits', null, { fade: 0 })`, 6000],
  bossOpen: [`D.warp('f4',6,4,0); B.S.boss.awake=true; for (const id of ['GL1','GL2','GL3']) B.lockDone(id); B.S.moment=null; g.go('play', null, { fade: 0 })`, 4000],
  attract: [`g.go('attract', null, { fade: 0 })`, 6000],
  leech: [`D.UI.closeAll(); D.warp('f1',2,14,0); g.go('play', null, { fade: 0 }); B.CHEATS.god = true; const m = B.spawnMon(B.S.floors[B.S.floor], 'leech', 2, 12, {}); m.aware = true; m.st = 'hunt'`, 2600],
  ratknot: [`D.UI.closeAll(); D.warp('f1',2,14,0); g.go('play', null, { fade: 0 }); B.CHEATS.god = true; const m = B.spawnMon(B.S.floors[B.S.floor], 'ratknot', 2, 12, {}); m.aware = true; m.st = 'hunt'`, 2600],
  spider: [`D.UI.closeAll(); D.warp('f1',2,14,0); g.go('play', null, { fade: 0 }); B.CHEATS.god = true; const m = B.spawnMon(B.S.floors[B.S.floor], 'spider', 2, 12, {}); m.aware = true; m.st = 'hunt'`, 2600],
  gazer: [`D.UI.closeAll(); D.warp('f1',2,14,0); g.go('play', null, { fade: 0 }); B.CHEATS.god = true; const m = B.spawnMon(B.S.floors[B.S.floor], 'gazer', 2, 12, {}); m.aware = true; m.st = 'hunt'`, 2600]
};
const { browser, page, errors } = await open({ w: W, h: H });
await bootWait(page);
for (const [name, steps] of Object.entries(SC)) {
  if (only.length && !only.includes(name)) continue;
  for (let i = 0; i < steps.length; i += 2) {
    await page.evaluate(js => { const g = window.__game, D = g.debug, B = D.B; try { if (!js.includes('D.UI.open') && !js.includes('B.Create')) { D.UI.closeAll(); }  (0, eval)('(function(g,D,B){' + js + '})')(g, D, B); } catch (e) { console.error('scenario: ' + e.message); } }, steps[i]);
    await page.waitForTimeout(steps[i + 1]);
  }
  await page.screenshot({ path: fileURLToPath(new URL('../shots/' + name + tag + '.png', import.meta.url)) });
}
const gerr = await page.evaluate(() => window.__game.errors.map(e => e.where + ': ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
console.log('errors', errors.concat(gerr).slice(0, 15).join('\n') || 'none');
await browser.close();
