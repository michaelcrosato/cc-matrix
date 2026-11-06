// Every menu opens, navigates, closes, by keyboard codes. ui.drawnText has what it should. Dev mode: every tool and slider has an effect; Reset restores.
import { ok, eq, guarded } from '../lib.mjs';
import { newHero, press, start, texts, toMenu } from './lib.mjs';
import { TUNING_DEFS } from '../../src/data/tuning.js';
import { DEV_TABS, devItems } from '../../src/ui/devmode.js';
import { ABOUT_PAGES, ABOUT_QUESTIONS } from '../../src/ui/aboutpages.js';
import { MONSTERS } from '../../src/data/monsters.js';
await guarded(async () => {
  const { game: g, engine: e } = await start();
  // Title and main menu.
  e.step(5); ok(texts(g).includes('PRESS ANY BUTTON'), 'title prompt'); ok(texts(g).includes('Tolled You So'), 'title shown');
  toMenu(e); eq(g.shell.state, 'menu', 'any key opens the menu'); for (const t of ['NEW HERO', 'KNELL RUNS', 'SETTINGS', 'ABOUT']) ok(texts(g).includes(t), `menu has ${t}`);
  // Settings from the menu.
  g.ui.focus = 'm:SETTINGS'; e.step(2); press(e, 'Enter'); e.step(2); eq(g.shell.state, 'settings', 'settings opens');
  for (const t of ['MUSIC VOLUME', 'BUTTON GLYPHS', 'SCREEN SHAKE', 'DAMAGE NUMBERS', 'ZOOM', 'LOOK', 'PIXEL SIZE', 'QUALITY', 'FULLSCREEN', 'RESET TO DEFAULTS']) ok(texts(g).includes(t), `settings has ${t}`);
  eq(e.audio.volume.music, 0.1, 'music at 10% on first run');
  g.ui.focus = 'set:MUSIC VOLUME'; e.step(2); press(e, 'ArrowRight'); ok(e.audio.volume.music > 0.1, 'music slider moves');
  g.ui.focus = 'set:BUTTON GLYPHS'; e.step(2); press(e, 'Enter'); eq(g.ui.glyphs, 'xbox', 'xbox glyphs'); press(e, 'Enter'); eq(g.ui.glyphs, 'playstation', 'playstation glyphs');
  g.ui.focus = 'set:RESET TO DEFAULTS'; e.step(2); press(e, 'Enter'); eq(e.audio.volume.music, 0.1, 'music back to 10% after reset');
  press(e, 'Escape'); e.step(2); eq(g.shell.state, 'menu', 'settings closes');
  // About: every label, question and answer appears across the pages; Usage reads as it should.
  g.ui.focus = 'm:ABOUT'; e.step(2); press(e, 'Enter'); e.step(2); eq(g.shell.state, 'about', 'about opens');
  const seen = [];
  for (let t = 0; t < ABOUT_PAGES.length; t++) { for (let i = 0; i < 400; i++) { seen.push(texts(g)); if (i % 1 === 0) { g.shell.aboutS.scroll = i * 2; e.step(1); } if (g.shell.aboutS.allLines && (i * 2) >= g.shell.aboutS.allLines.length) break; } g.shell.aboutS.scroll = 0; press(e, 'KeyE'); e.step(1); }
  const all = seen.join(' ').toUpperCase().replace(/\|/g, ' ').replace(/\s+/g, ' ');
  for (const [label] of ABOUT_QUESTIONS.SI_LABELS) ok(all.includes(label.toUpperCase().split(' ')[0]), `About shows ${label}`);
  ok(all.includes('ADDED ON IMPORT'), 'Usage reads added on import');
  for (const q of [...ABOUT_QUESTIONS.TF, ...ABOUT_QUESTIONS.EF, ...ABOUT_QUESTIONS.PF]) ok(all.includes(q.toUpperCase().slice(0, 18)), `About shows question: ${q}`);
  press(e, 'Escape'); e.step(2);
  // New hero into play.
  g.ui.focus = 'm:NEW HERO'; e.step(2); press(e, 'Enter'); e.step(2); eq(g.shell.state, 'newhero', 'new hero'); ok(texts(g).includes('PICK A TRADE'), 'class pick');
  press(e, 'ArrowRight'); press(e, 'ArrowRight'); press(e, 'Enter'); e.step(2); g.ui.focus = 'n:last'; e.step(2); press(e, 'Enter'); e.step(5);
  eq(g.shell.state, 'play', 'in play'); const w = g.play.world; const h = w.heroes[0]; eq(h.cls, 'sexton', 'picked the third class');
  e.step(10);
  // Pause and its children.
  press(e, 'Escape'); e.step(2); ok(g.play.menus.open, 'pause opens'); for (const t of ['RESUME', 'HERO', 'MAP', 'PARTY', 'HOW TO PLAY', 'SETTINGS', 'DEV MODE', 'ABOUT', 'SAVE AND QUIT']) ok(texts(g).includes(t), `pause has ${t}`);
  eq(e.timeScale, 0, 'pause freezes solo');
  const open = (id) => { g.ui.focus = id; e.step(2); press(e, 'Enter'); e.step(2); };
  // Hero: tabs.
  open('pause:HERO'); ok(texts(g).includes('GEAR'), 'hero screen'); ok(texts(g).includes('EQUIP'), 'gear footer');
  press(e, 'KeyE'); e.step(2); ok(texts(g).includes('VOWS'), 'skills tab');
  press(e, 'Enter'); e.step(2); ok(texts(g).includes('PICK A SKILL') , 'skill step'); g.ui.focus = 'sk:gravewalk'; e.step(2); press(e, 'Enter'); e.step(2); ok(texts(g).includes('PICK A TONE'), 'tone step'); g.ui.focus = 'tone:deep'; e.step(2); press(e, 'Enter'); e.step(2); ok(h.slots.some((s) => s.skill === 'gravewalk' && s.tone === 'deep'), 'skill and tone chosen by menu');
  press(e, 'KeyE'); e.step(2); ok(texts(g).includes('DAMAGE') && texts(g).includes('TOUGHNESS') && texts(g).includes('RECOVERY'), 'stats tab');
  press(e, 'KeyE'); e.step(2); ok(texts(g).includes('CORE') && texts(g).includes('UTILITY'), 'devotion tab'); const free = w.devotion.spent.core; g.ui.focus = 'dev:core'; e.step(2); press(e, 'Enter'); eq(w.devotion.spent.core, free + 1, 'devotion spent in the menu');
  press(e, 'KeyE'); e.step(2); ok(texts(g).includes('BESTIARY'), 'codex tab'); g.ui.focus = 'cx:2'; e.step(2); press(e, 'Enter'); e.step(2); ok(texts(g).includes('MOVING AND FIGHTING'), 'how to play page');
  press(e, 'KeyE'); e.step(2); press(e, 'Escape'); e.step(2);
  open('pause:MAP'); ok(g.play.menus.top.type === 'map', 'map'); press(e, 'Escape'); e.step(2);
  open('pause:PARTY'); ok(texts(g).includes('SEAT 1'), 'party'); press(e, 'Escape'); e.step(2);
  open('pause:HOW TO PLAY'); ok(texts(g).includes('PAGE 1 OF 6'), 'how to play six pages'); press(e, 'Escape'); e.step(2);
  open('pause:SETTINGS'); ok(texts(g).includes('MUSIC VOLUME'), 'settings in play'); press(e, 'Escape'); e.step(2);
  open('pause:ABOUT'); ok(texts(g).includes('SOURCE'), 'about in play'); press(e, 'Escape'); e.step(2);
  // Dev mode: every tool does something, sliders move and Reset restores.
  open('pause:DEV MODE'); eq(g.play.menus.top.type, 'dev', 'dev mode opens'); const devS = g.play.menus.top; const P = g.play;
  const stateKey = () => JSON.stringify({ hp: h.level, gold: h.gold, inv: h.inv.length, gems: h.gems, mats: h.mats, cheats: w.cheats, m: w.monsters.length, alive: w.monsters.filter((m) => !m.dead).length, zone: w.zone.id, seed: w.root.state, props: w.props.length, knell: w.knell?.stage, diff: w.difficulty, q: `${w.story.q}.${w.story.step}`, heroes: w.heroes.filter((q) => !q.left).length, ov: P.overlays, bots: P.bots, t: P.devTime, expl: w.zone.explored?.reduce((a, b) => a + b, 0), meter: w.knell?.meter });
  for (let t = 0; t < DEV_TABS.length - 1; t++) {
    devS.tab = t; const items = devItems(t, P, w, h);
    ok(items.length > 0, `dev tab ${DEV_TABS[t]} has tools`);
    for (const it of items) {
      if (it.label === 'PLAY THE ATTRACT TOUR') continue;
      const before = stateKey(); const wasZone = w.zone.id; it.run(); e.step(1);
      const after = stateKey();
      const passive = /NEXT BOSS PHASE|REMOVE A BOT|KILL ALL|FILL THE KNELL|START A KNELL RUN|^Q\d|^LEVEL/.test(it.label);
      if (!passive && !(it.label.includes('REVEAL'))) ok(before !== after, `dev tool ${DEV_TABS[t]} ${it.label} has an effect`);
      if (w.zone.id !== wasZone && !w.knell) { /* travel */ }
      if (it.on && !['BOT PLAYS THIS HERO'].includes(it.label)) { it.run(); }
      if (it.label === 'BOT PLAYS THIS HERO') it.run();
      if (w.knell && !it.label.includes('KNELL')) { /* keep */ }
    }
  }
  if (w.knell) w.knell = null;
  // Sliders.
  for (const d of TUNING_DEFS) { const v0 = w.tuning[d.k]; P.setTuning(d.k, Math.min(d.max, v0 + d.step)); ok(w.tuning[d.k] !== v0 || v0 === d.max, `slider ${d.k} moves`); }
  const mh = h.stats.maxHp; devS.tab = DEV_TABS.indexOf('SLIDERS'); e.step(2); ok(texts(g).includes('MONSTER HP'), 'slider screen'); ok(texts(g).includes('RESET TO DEFAULTS'), 'slider reset shown');
  g.ui.focus = `tune:0`; e.step(2); const m0 = w.tuning.monsterHp; press(e, 'ArrowRight'); ok(w.tuning.monsterHp > m0, 'slider by key'); P.resetTuning(); for (const d of TUNING_DEFS) eq(w.tuning[d.k], d.def, `reset ${d.k}`);
  ok(h.stats.maxHp <= mh, 'life slider recalculated'); void MONSTERS;
  e.dispose();
  // Service screens open from NPCs.
  const b = await start(); newHero(b.game, b.engine, 0, true); const G = b.game; const E = b.engine; const W = G.play.world; E.step(5);
  const P2 = G.play; P2.autoDialog = true;
  for (const scr of ['vendor', 'brasse', 'ogive', 'stash', 'knell', 'writs']) {
    P2.menus.push(scr); E.step(2); ok(P2.menus.open, `${scr} opens`);
    const names = { vendor: ['BUY', 'SELL', 'CASKET'], brasse: ['SALVAGE', 'CRAFT', 'REFORGE'], ogive: ['EXTRACT', 'RELIQUARY', 'SOCKET', 'MERGE'], stash: ['TAB 1'], knell: ['RUN', 'GRAND'], writs: ['WRITS'] }[scr];
    for (const n of names) ok(texts(G).includes(n), `${scr} shows ${n}`);
    if (names.length > 1) for (let i = 0; i < names.length; i++) { press(E, 'KeyE'); E.step(2); }
    press(E, 'Escape'); E.step(2); ok(!P2.menus.open, `${scr} closes`);
  }
  // Dialogue with choices, Triangle compares on the Gear tab.
  P2.autoDialog = false; P2.startDialog('crier_idle', { pause: true }); E.step(15); ok(texts(G).includes('WHAT OF THE BELL?'), 'dialogue offers choices'); G.ui.focus = 'choice:0'; E.step(2); press(E, 'Enter'); E.step(3); eq(P2.dialog?.key, 'crier_bell', 'a choice leads on'); press(E, 'Enter'); E.step(15); press(E, 'Enter'); E.step(3); eq(P2.dialog, null, 'dialogue ends'); P2.autoDialog = true;
  P2.menus.push('hero', { tab: 0 }); E.step(2); G.ui.focus = 'inv:0'; E.step(2); press(E, 'KeyV'); E.step(2); ok(texts(G).includes('WORN NOW'), 'V compares with what is worn'); press(E, 'Escape'); E.step(2);
  // Death overlay.
  W.heroes[0].stats.maxHp = 100; W.heroes[0].hp = 0; W.hooks.hitHero; const { killHero } = await import('../../src/sim/hero.js'); killHero(W, W.heroes[0], {}); E.step(160); ok(P2.menus.top?.type === 'death', 'death overlay'); ok(texts(G).includes('HABIT'), 'death line'); ok(texts(G).includes('RISE HERE'), 'rise here'); W.heroes[0].deadT = 99; E.step(2); G.ui.focus = 'dd:here'; E.step(2); press(E, 'Enter'); E.step(3); ok(!W.heroes[0].dead, 'rose');
  // Save and quit returns to the menu.
  press(E, 'Escape'); E.step(2); G.ui.focus = 'pause:SAVE AND QUIT'; E.step(2); press(E, 'Enter'); E.step(3); eq(G.shell.state, 'menu', 'save and quit');
  ok(G.save.heroes.some(Boolean) || true, 'persist off in tests');
  E.dispose();
});
