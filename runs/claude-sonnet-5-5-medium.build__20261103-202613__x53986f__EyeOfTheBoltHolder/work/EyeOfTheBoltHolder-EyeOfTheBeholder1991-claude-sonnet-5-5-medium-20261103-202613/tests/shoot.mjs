// Screenshots of the game's screens (not part of pass/fail). usage: node tests/shoot.mjs name1 name2 ...
import { open, sleep } from './browser.mjs';
const want = process.argv.slice(2); const { b, page, errs } = await open({ ctx: { viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } } });
await page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'title', null, { timeout: 90000 }); await sleep(500);
const ev = f => page.evaluate(f);
await ev(() => { const { B, UI, game } = window.__game; B.premade(); UI.beginCampaign(B.PREMADE.map(s => B.makeMember(s))); });
await sleep(1500); await ev(() => window.__game.game.advance(3)); await ev(() => { const U = window.__game.UI; if (U.curCut) U.curCut.skip(); U.dlg.close(); U.applyTimeScale(); }); await sleep(2500);
const shots = {
  start: async () => { },
  door: async () => { await ev(() => { const { B } = window.__game; B.warp('f1', 3, 10, 0); }); await sleep(600); },
  gate: async () => { await ev(() => { const { B } = window.__game; B.warp('f1', 3, 6, 0); }); await sleep(600); },
  channel: async () => { await ev(() => { const { B } = window.__game; B.warp('f1', 7, 11, 1); B.F().gates.gS = true; }); await sleep(900); },
  fight: async () => { await ev(() => { const { B } = window.__game; B.warp('f1', 8, 11, 1); B.F().gates.gS = true; }); await sleep(2500); },
  party: async () => { await ev(() => window.__game.UI.open('party')); await sleep(500); },
  camp: async () => { await ev(() => { const { B, UI } = window.__game; B.warp('f1', 3, 11, 0); B.F().mons.forEach(m => m.hp = 0); B.cmdCamp('open'); UI.open('camp'); }); await sleep(500); },
  map: async () => { await ev(() => window.__game.UI.open('map')); await sleep(400); },
  journal: async () => { await ev(() => window.__game.UI.open('journal')); await sleep(400); },
  about: async () => { await ev(() => window.__game.UI.open('about')); await sleep(2500); },
  create: async () => { await ev(() => window.__game.UI.open('create')); await sleep(2500); },
  dev: async () => { await ev(() => window.__game.UI.open('dev')); await sleep(2500); },
  f2: async () => { await ev(() => { const { B } = window.__game; B.warp('f2', 8, 11, 1); }); await sleep(1200); },
  f3: async () => { await ev(() => { const { B } = window.__game; B.warp('f3', 9, 11, 1); }); await sleep(1200); },
  boss: async () => { await ev(() => { const { B } = window.__game; B.warp('f4', 6, 9, 0); B.S.boss.awake = true; }); await sleep(1800); },
  boss2: async () => { await ev(() => { const { B } = window.__game; B.warp('f4', 6, 8, 0); B.S.boss.awake = true; B.S.boss.turned = 3; B.S.boss.opened = true; B.S.boss.locks = { glW: true, glE: true, glN: true }; }); await sleep(3500); },
  secret: async () => { await ev(() => { const { B } = window.__game; B.warp('f1', 5, 7, 1); }); await sleep(900); },
  cast: async () => { await ev(() => { const { UI } = window.__game; UI.open('cast', 2); }); await sleep(400); },
};
for (const n of (want.length ? want : Object.keys(shots))) { try { await ev(() => { const { UI } = window.__game; if (UI.screen) UI.close(); }); await shots[n](); await page.screenshot({ path: `shots/${n}.png` }); console.log('shot', n); } catch (e) { console.log('ERR', n, e.message.slice(0, 200)); } }
console.log(JSON.stringify(await ev(() => window.__game.game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join('|')))), errs.slice(0, 5));
await b.close();
