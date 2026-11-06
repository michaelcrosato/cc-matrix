#!/usr/bin/env node
// Screenshots for my own eyes. Usage: node tools/shots.mjs name[,name...] [--size 1920x1080]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { devices } from 'playwright';
import { DEV, openGame } from './browser.mjs';

const args = process.argv.slice(2);
const sizeArg = args.includes('--size') ? args[args.indexOf('--size') + 1] : '1920x1080';
const [width, height] = sizeArg.split('x').map(Number);
const names = (args[0] && !args[0].startsWith('--') ? args[0] : 'title').split(',');
const OUT = join(DEV, '.scratch/shots');
mkdirSync(OUT, { recursive: true });

const { browser, page, errors } = await openGame({ width, height, ...(args.includes('--phone') ? { contextOptions: { ...devices['Pixel 7'], viewport: undefined } } : {}) });
const ev = (fn, arg) => page.evaluate(fn, arg);
const step = (n) => ev((m) => { window.__PIXEL_ENGINE__.step(m); }, n);
const press = async (code, frames = 2) => { await ev(([c, f]) => { const e = window.__PIXEL_ENGINE__; e.input.setKey(c, true); e.step(f); e.input.setKey(c, false); e.step(1); }, [code, frames]); };
async function nanScan(tag) {
  const out = await ev(() => { const res = []; window.__PIXEL_ENGINE__.scene.traverse((o) => { const g = o.geometry; const a = g?.attributes?.position; if (!a) return; for (let i = 0; i < a.count * 3; i++) { if (Number.isNaN(a.array[i])) { let chain = ''; let p = o; for (let k = 0; k < 4 && p; k++) { chain += `${p.constructor.name}:${p.name}<`; p = p.parent; } res.push(`${chain} count ${a.count} ctor ${g.constructor.name} i${i}`); break; } } }); return res.slice(0, 5); });
  if (out.length) console.log('NAN', tag, out.join(' || '));
}
async function snap(name) {
  await nanScan(name);
  const f0 = await ev(() => window.__PIXEL_ENGINE__.frame);
  await ev(() => { window.__PIXEL_ENGINE__.manual = false; });
  await page.waitForFunction((n) => window.__PIXEL_ENGINE__.frame >= n + 2, f0, { timeout: 30000 }).catch(() => {});
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  await ev(() => { window.__PIXEL_ENGINE__.manual = true; });
}
const newHero = async (cls = 0, start = 0) => {
  await step(5);
  await press('Enter');
  await step(3);
  await press('Enter'); await step(3);
  // Class choice: focus starts on the first class.
  for (let i = 0; i < cls; i++) { await press('ArrowRight'); }
  await press('Enter'); await step(3);
  if (start === 1) await press('ArrowRight');
  await press('Enter'); await step(5);
};
const skipCut = async () => { await ev(() => { window.__GAME__.skipCutscenes = true; const e = window.__PIXEL_ENGINE__; e.step(10); window.__GAME__.skipCutscenes = false; }); };
const go = async (zone, floor = 0) => { await ev(([z, f]) => { const g = window.__GAME__; g.closeAll(); g.cmd({ c: 'dev_goto', zone: z, floor: f }); const e = window.__PIXEL_ENGINE__; e.step(3); g.closeAll(); e.step(2); }, [zone, floor]); };
const lvl = (n) => ev((m) => { const g = window.__GAME__; g.cmd({ c: 'dev_level', n: m }); }, n);
const open = (cls, arg) => ev(([c, a]) => { const g = window.__GAME__; g.closeAll(); g.menuSeat = 0; g.openScreen(new g.screenClasses[c](g, a)); window.__PIXEL_ENGINE__.step(3); }, [cls, arg]);
const closeAll = () => ev(() => { window.__GAME__.closeAll(); window.__PIXEL_ENGINE__.step(2); });
const boss = async (type, frames = 90) => { await ev((t) => { const g = window.__GAME__; g.world.cheats.god = true; g.skipCutscenes = true; g.cmd({ c: 'dev_boss', type: t }); }, type); await step(frames); };
const scen = {
  ui: async () => {
    await newHero(0); await skipCut();
    await ev(() => { const g = window.__GAME__; g.world.camp.flags.forge = 1; g.world.camp.flags.reliquary = 1; g.world.camp.flags.crier_met = 1; g.cmd({ c: 'dev_level_max' }); g.cmd({ c: 'dev_gold', n: 90000 }); g.cmd({ c: 'dev_mats' }); g.cmd({ c: 'dev_gems' }); for (const id of ['widows_clapper', 'plate_lining', 'verger_cowl']) g.cmd({ c: 'dev_legendary', id }); for (const s of ['head', 'chest']) g.cmd({ c: 'dev_set', slot: s }); for (const s of ['ring', 'legs', 'main', 'off', 'feet', 'amulet', 'hands']) g.cmd({ c: 'dev_item', slot: s, rarity: 'reliquary' }); g.cmd({ c: 'writs' }); g.cmd({ c: 'dev_kill_all' }); g.closeAll(); });
    await go('town'); await step(40);
    for (const [name, c, a, tabs] of [['gear', 'HeroScreen', 0, 0], ['skills', 'HeroScreen', 1, 0], ['stats', 'HeroScreen', 2, 0], ['devotion', 'HeroScreen', 3, 0], ['codex', 'HeroScreen', 4, 0], ['penny', 'PennywhistleScreen', null, 3], ['brasse', 'BrasseScreen', null, 3], ['ogive', 'OgiveScreen', null, 4], ['stash', 'StashScreen', null, 0], ['map', 'MapScreen', null, 0], ['knellfont', 'KnellScreen', null, 0], ['writs', 'WritsScreen', null, 0], ['pause', 'PauseScreen', null, 0], ['settings', 'SettingsScreen', null, 0], ['howto', 'HowToScreen', null, 0], ['party', 'PartyScreen', null, 0], ['about', 'AboutScreen', null, 0], ['dev', 'DevScreen', null, 0]]) {
      await open(c, a);
      await snap(`ui_${name}`);
      for (let t = 1; t < tabs; t++) { await press('KeyE'); await snap(`ui_${name}${t}`); }
    }
    await closeAll();
    await ev(() => { const g = window.__GAME__; const o = g.world.objects.find((q) => q.key === 'npc_crier'); const h = g.world.heroes[0]; h.x = o.x + 1; h.z = o.z + 1; window.__PIXEL_ENGINE__.step(2); });
    await press('KeyE'); await step(30); await snap('ui_dialogue');
    await closeAll();
  },
  bosses: async () => {
    await newHero(2); await skipCut();
    await ev(() => { const g = window.__GAME__; g.world.cheats.god = true; g.cmd({ c: 'dev_level_max' }); g.skipCutscenes = true; for (const [i, id] of ['shovel_swat', 'bone_toss', 'raise_pallbearers', 'exhume', 'coffin_drop', 'last_rites'].entries()) g.cmd({ c: 'skill', slot: i, id }); });
    await go('ossuary', 2); await boss('bursar', 120); await snap('boss_bursar');
    await go('cloister', 0); await boss('ambrose', 120); await snap('boss_ambrose');
    await go('belfry', 3); await step(120); await snap('boss_malison1');
    await ev(() => { const g = window.__GAME__; g.cmd({ c: 'dev_next_phase' }); }); await step(200); await snap('boss_malison2');
    await ev(() => { const g = window.__GAME__; g.cmd({ c: 'dev_next_phase' }); }); await step(120); await snap('boss_malison3');
    await go('pantry', 0); await boss('cellarer', 90); await snap('boss_cellarer');
    await go('town'); await ev(() => { const g = window.__GAME__; g.cmd({ c: 'dev_knell_start' }); window.__PIXEL_ENGINE__.step(4); g.closeAll(); });
    await step(240); await ev(() => { const r = window.__GAME__.world.run; if (r) r.meter = Math.floor(r.total * 0.6); }); await step(10); await snap('knell_meter');
    await boss('hollow_sexton', 90); await snap('boss_warden1');
    await ev(() => window.__GAME__.cmd({ c: 'dev_kill_all' })); await step(20);
    await boss('grand_chorister', 90); await snap('boss_warden2');
    await ev(() => window.__GAME__.cmd({ c: 'dev_kill_all' })); await step(20);
    await boss('clapperjaw_prime', 90); await snap('boss_warden3');
  },
  classes: async () => {
    for (const [cls, skills] of [[0, ['clout', 'chain_reap', 'great_toll', 'reverberate', 'bellfall', 'last_peal']], [1, ['spark_bolt', 'flare', 'lantern_hurl', 'lamp_post', 'beacon', 'long_nights_end']], [2, ['shovel_swat', 'bone_toss', 'raise_pallbearers', 'exhume', 'coffin_drop', 'danse_macabre']]]) {
      if (cls > 0) { await ev(() => { const g = window.__GAME__; g.closeAll(); g.ctx.engine.timeScale = 1; g.save.heroes = [null, null, null]; g.enterShell(); }); await step(3); }
      await newHero(cls); await skipCut();
      await ev((sk) => { const g = window.__GAME__; g.world.cheats.god = true; g.world.cheats.noCd = true; g.world.cheats.infRes = true; g.cmd({ c: 'dev_level_max' }); for (const [i, id] of sk.entries()) g.cmd({ c: 'skill', slot: i, id }); for (const s of ['head', 'shoulders', 'chest']) { g.cmd({ c: 'dev_item', slot: s, rarity: 'reliquary' }); g.cmd({ c: 'equip', uid: g.world.heroes[0].inv.find(Boolean).uid }); } }, skills);
      await go('ossuary', 0); await step(10);
      await ev(() => { window.__GAME__.cmd({ c: 'dev_spawn', type: 'rattlebones', n: 40 }); }); await step(40);
      for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) { await press(k, 2); await step(12); await snap(`class${cls}_${k}`); await step(30); }
    }
  },
  malison: async () => {
    await newHero(1); await skipCut();
    await ev(() => { const g = window.__GAME__; g.world.cheats.god = true; g.cmd({ c: 'dev_level_max' }); g.skipCutscenes = true; });
    await go('belfry', 3); await step(6);
    await ev(() => { const g = window.__GAME__; const h = g.world.heroes[0], z = g.world.zone; h.x = z.w / 2 + 2; h.z = z.h / 2 + 6; }); await step(100); await snap('mal1');
    await ev(() => { const g = window.__GAME__; g.cmd({ c: 'dev_next_phase' }); }); await step(160); await snap('mal2');
    await ev(() => { const g = window.__GAME__; g.cmd({ c: 'dev_next_phase' }); }); await step(90); await snap('mal3');
  },
  couch: async () => {
    await ev(() => { window.__pads = []; window.__mk = () => { const p = { connected: true, mapping: 'standard', id: 'stub', index: window.__pads.length, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; window.__pads.push(p); return p; }; navigator.getGamepads = () => window.__pads; });
    await newHero(0); await skipCut();
    await ev(() => { const g = window.__GAME__; g.world.cheats.god = true; g.cmd({ c: 'dev_level', n: 10 }); g.addBotSeat(); g.addBotSeat(); g.addBotSeat(); g.world.cheats.noCd = true; });
    await go('causeway'); await step(200); await snap('couch');
  },
  credits: async () => {
    await newHero(0); await skipCut();
    await ev((fn) => { const g = window.__GAME__; g.skipCutscenes = false; g[fn](true); }, 'playEnding');
    for (let i = 0; i < 40; i++) { await press('Enter'); await step(30); if (await ev(() => window.__GAME__.screens.at(-1)?.tag === 'credits')) break; }
    await step(360); await snap('credits1'); await step(600); await snap('credits2');
  },
  attract: async () => {
    await step(620);
    for (let i = 0; i < 6; i++) { await step(60 * 9); await snap(`attract_${i}`); await step(60 * 11); }
  },

  title: async () => { await step(30); await snap('title'); },
  menu: async () => { await step(5); await press('Enter'); await step(10); await snap('menu'); },
  newhero: async () => { await step(5); await press('Enter'); await step(3); await press('Enter'); await step(10); await snap('newhero'); await press('Enter'); await step(4); await snap('newhero2'); },
  play: async () => { await newHero(0); await skipCut(); await step(10); await snap('play_yard'); await ev(() => { const e = window.__PIXEL_ENGINE__; e.input.setKey('MouseLeft', false); e.input.setKey('Digit1', false); }); await press('KeyD', 60); await snap('play_yard2'); },
  zones: async () => {
    await newHero(1); await skipCut();
    await ev(() => { const g = window.__GAME__; g.world.cheats.god = true; g.world.tuning.monsterDensity = 1.5; });
    await lvl(15);
    for (const [z, f] of [['yard', 0], ['town', 0], ['causeway', 0], ['ossuary', 0], ['cloister', 0], ['belfry', 0], ['belfry', 3], ['pantry', 0]]) {
      await go(z, f);
      await step(60);
      await snap(`zone_${z}${f}`);
    }
  },
  fight: async () => {
    await newHero(0); await skipCut();
    await ev(() => { const g = window.__GAME__; g.world.cheats.god = true; });
    await lvl(15);
    await go('ossuary', 0);
    await step(10);
    await ev(() => { const g = window.__GAME__; g.cmd({ c: 'dev_spawn', type: 'rattlebones', n: 40 }); g.cmd({ c: 'dev_spawn', type: 'peatwalker', elite: 'champion', aff: ['tolling'] }); });
    await step(50);
    await ev(() => { const e = window.__PIXEL_ENGINE__; e.input.setKey('Digit1', true); });
    await step(20);
    await snap('fight1');
    await step(15);
    await snap('fight2');
  },
};
for (const n of names) {
  if (!scen[n]) { console.log('no scenario', n); continue; }
  await scen[n]();
}
if (errors.length) console.log('ERRORS', errors.slice(0, 8).join('\n').slice(0, 1600));
const es = await ev(() => window.__PIXEL_ENGINE__.errors);
if (es.length) console.log('ENGINE', es.slice(0, 6).join('\n').slice(0, 1600));
await browser.close();
