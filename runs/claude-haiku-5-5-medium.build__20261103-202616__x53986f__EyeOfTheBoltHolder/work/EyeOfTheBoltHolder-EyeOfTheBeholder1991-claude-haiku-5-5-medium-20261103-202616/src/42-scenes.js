/* ===== 42 scenes · the game's scenes: title, creation, intro, play, floor card, over, ending, about, race, attract, dev =====
 * The play scene reads the controls, turns them into sim commands, and runs the sim one fixed step at a time. Each
 * overlay (party, camp, spells, map, journal, dialogue, Dev Mode) is a state of play, so the 3D view keeps drawing. */
const SC = { scenes: {}, title: null, attract: false, race: false, pending: null, stage: null };
const INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['ArrowLeft', 'Pad14'], right: ['ArrowRight', 'Pad15'],
  fwd: ['KeyW', 'Pad12'], back: ['KeyS', 'Pad13'], strafeL: ['KeyA'], strafeR: ['KeyD'], turnL: ['KeyQ', 'ArrowLeft', 'Pad14'], turnR: ['KeyE', 'ArrowRight', 'Pad15'],
  use: ['KeyF', 'Enter', 'Pad0'], throw: ['KeyG', 'Pad1'], strike: ['Space', 'Pad2'], party: ['KeyI', 'Pad3'], camp: ['KeyC', 'Pad10'], map: ['KeyM', 'Pad8'],
  journal: ['KeyJ'], examine: ['KeyX', 'Pad11'], selPrev: ['Tab', 'Pad4'], selNext: ['Digit0', 'Pad5'], handMain: ['Pad7'], handOff: ['Pad6'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  dev: ['Backquote']
};
/** the glyph words for the on-screen prompts */
const WORD = { use: '✕ Use', strike: '□ Strike', throw: '○ Throw', party: '△ Party', camp: 'L3 Camp', map: 'Create Map', examine: 'R3 Examine' };
/* ---- title ---- */
const TITLE_LEVEL = {
  rows: [' ################## ', ' #t......PP......t# ', ' #.......PP.......# ', ' #................# ', ' #....========....# ', ' #....========....# ', ' #....========....# ', ' #.....^^^^^^.....# ', ' #t..............t# ', ' #................# '],
  legend: { '=': { floor: 8, side: 'block', color: '#4a4360' }, '^': { stairs: 'n', floor: 8 } }
};
SC.scenes.title = {
  view: 'iso', input: INPUT,
  enter() { SC.stage = SC.stage || buildTitleStage(); titleMenu(); game.resetCamera(); musicTo('title'); SC.idle = 0; UI.screen = null; SC.attractStarted = false; },
  update(dt) {
    if (HUB.route) { HUB.route = false; game.go('hubcard'); return; }
    SC.idle += dt;
    if (game.input.anyPressed && game.input.anyPressed()) SC.idle = 0;
    if (SC.idle > 10 && !SC.attractStarted) { startAttract(); return; }
    if (SC.menu && SC.menu.update(dt)) return;
    if (SC.menu && game.input.pressed('start')) { game.input.consumeAll(); SC.menu.onPick(SC.menu.i, SC.menu.items[SC.menu.i]); }
    const T = SC.stage; T.t = (T.t || 0) + dt;
    const w = T.world, a = T.t * .18 + 2.2;
    w.camera.fixed = { x: T.cx + Math.cos(a) * 120, y: T.cy + Math.sin(a) * 120, z: 58, yaw: a + Math.PI, pitch: -.36, fov: 50 };
    w.step(dt);
  },
  draw(r) {
    SC.stage.world.draw(r);
    const top = Math.max(10, Math.round(r.H * .1)), my = Math.round(r.H * .56);
    if (SC.menu) SC.menu.y = my;
    r.overlay(g => {
      E.font.title(g, 'EYE OF THE', r.W / 2, top, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#c8923a', '#6a4a1a'], depthColor: '#2a1a08' });
      E.font.title(g, 'BOLT-HOLDER', r.W / 2, top + 20, { align: 'center', scale: 4, colors: ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'], depthColor: '#2a1a08' });
      E.font.text(g, 'A thousand locks. One eye.', r.W / 2, top + 52, '#f0e6d0', { align: 'center', shadow: '#000', outline: false });
      if (touchOnly()) { E.ui.box(g, r.W / 2 - 110, my - 40, 220, 30, { bg: ['#1c1813', '#0e0c0a'], border: '#b8924a', alpha: .95 }); E.font.text(g, 'Controller or keyboard required.', r.W / 2, my - 32, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, 'Connect a controller or a keyboard to play.', r.W / 2, my - 22, '#f0e6d0', { align: 'center', font: 'tiny', outline: false }); }
    });
    if (SC.menu) SC.menu.draw(r);
    r.text('v' + B.VERSION + '   ' + (game.input.lastDevice === 'gamepad' ? 'D-pad + ' + LBL('confirm') : 'Arrows + Enter  ·  M mute'), r.W / 2, r.H - 10, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};
/** the touch-only test: a coarse pointer with no hover and no key or pad used yet */
const touchOnly = () => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches && game.input.lastDevice === 'touch'; } catch (e) { return false; } };
/** the title stage: the lit hall, the camera turning round it */
function buildTitleStage() {
  const w = new W3(game, { level: TITLE_LEVEL, fog: { near: 140, far: 600 }, torchShadows: 1 });
  const cx = w.width / 2, cy = 6.5 * 16;
  const hero = w.hero({ x: cx - 18, y: cy, rig: new E.Humanoid({ hood: true, colors: { cloth: '#2f8f86', hair: '#2e2230' } }), facing: Math.PI / 2 });
  const hero2 = w.hero({ x: cx + 18, y: cy, rig: new E.Humanoid({ build: 'heroic', hat: { style: 'helmet', color: '#8a92a0' }, colors: { cloth: '#7a3a2e', pants: '#3a3440', hair: '#4a2e1e', skin: '#d8a888', metal: '#b8c0cc' } }), facing: Math.PI / 2 });
  w.thing('star', cx, cy - 26, 20, { spin: .35, bob: 3 });
  w.camera.set('fixed');
  SC.menu = null;
  return { world: w, cx, cy, heroes: [hero, hero2], t: 0 };
}
/** the title menu: Continue when a save exists, New Game, Load, Rat Run, Settings, About, Quit */
function titleMenu() {
  const hasSave = (game.saves.latest && game.saves.latest());
  const items = [];
  if (hasSave) items.push({ label: 'Continue', key: 'continue' });
  items.push({ label: 'New Game', key: 'new' }, { label: 'Load Game', key: 'load' }, { label: 'Rat Run', key: 'race' }, { label: 'Settings', key: 'settings' }, { label: 'About & Credits', key: 'about' });
  SC.menu = new E.Menu(game, items.map(i => i.label), {
    x: 'center', y: 0,
    onPick: i => {
      const k = items[i].key;
      if (k === 'continue') { game.saves.load('auto'); }
      else if (k === 'new') game.go('create');
      else if (k === 'load') { game.saves.show ? game.saves.show() : game.menu('saves'); }
      else if (k === 'race') { SC.race = true; game.go('race'); }
      else if (k === 'settings') game.menu('settings');
      else if (k === 'about') game.go('about');
    }
  });
  SC.menuItems = items;
}
/* ---- attract: the demo plays itself (the bot, with cheats), any input leaves ---- */
function startAttract() {
  SC.attractStarted = true; SC.attract = true; game.go('attract');
}
SC.scenes.attract = {
  view: 'iso', input: INPUT,
  enter() { SC.vign = 0; attractVignette(); },
  update(dt) {
    if (game.input.anyPressed && game.input.anyPressed()) { game.input.consumeAll(); SC.attract = false; SC.attractStarted = false; game.go('title'); return; }
    SC.vt = (SC.vt || 0) + dt;
    if (SC.bot && SC.bot.step) SC.bot.step(dt);
    if (SC.vt > (SC.vdur || 20)) { SC.vign = (SC.vign + 1) % ATTRACT_VIGNETTES.length; attractVignette(); }
  },
  draw(r) {
    const w = VIEW.world; if (w) { w.draw(r); }
    r.overlay(g => { hudDraw(g, r); E.font.text(g, 'DEMO', 6, 4, '#ffd36a', { outline: false }); E.font.text(g, 'Press any key', r.W / 2, r.H - 52, '#c8c0b0', { align: 'center', outline: false }); });
  }
};
/** the vignettes: a floor and a moment, the bot plays them with cheats, each time-boxed */
const ATTRACT_VIGNETTES = [{ floor: 'f1', at: [2, 14, 0], secs: 18 }, { floor: 'f2', at: [2, 1, 1], secs: 16 }, { floor: 'f2', at: [13, 8, 3], secs: 14 }, { floor: 'f3', at: [12, 4, 0], secs: 16 }, { floor: 'f4', at: [6, 11, 0], secs: 22 }];
function attractVignette() {
  const v = ATTRACT_VIGNETTES[SC.vign];
  B.sim.newGame({ seed: 9 + SC.vign, members: null, diff: 'Normal' });
  B.sim.cheat('god', true); B.sim.cheat('noHunger', true);
  B.sim.warp(v.floor, v.at[0], v.at[1], v.at[2]);
  for (const f of ['f2', 'f3', 'f4']) B.sim.S.floors[f].visited = true;
  SC.bot = B.bot.start(); SC.vt = 0; SC.vdur = v.secs; useFloor(v.floor);
  SC.bot.step = dt => { for (let k = 0; k < 2; k++) { const c = B.bot.decide(SC.bot); if (c) B.sim.cmd(c); B.sim.update(dt / 2); if (B.sim.S.over) SC.bot.done = true; } syncWorld(dt); };
  musicTo(B.FLOORS[v.floor].song);
}
/* ---- creation: four roster slots, each Created (race, class, stats, look, name) or Premade; Quick Start fills them all ---- */
const CR = { slots: [null, null, null, null], slot: 0, step: null, draft: null, i: 0 };
const NAMES = { human: ['Aldric Vane', 'Bren Hollow', 'Corwin Ash', 'Dara Quill', 'Edda Marl', 'Fenn Stowe', 'Garrick Lowe', 'Hale Brindle', 'Ilse Cray', 'Jory Penn', 'Kell Moor', 'Liss Harrow'],
  dwarf: ['Brenna Stonehand', 'Dorn Ironbell', 'Eskil Gravel', 'Frida Boulder', 'Grimm Coppergate', 'Hilde Anvil', 'Ivar Hammerfall', 'Kara Deepforge', 'Lodur Mine', 'Mora Rivetson', 'Orm Tallowbeard', 'Runa Keystone'],
  elf: ['Aelis Ferrin', 'Caladhel', 'Elowen Vale', 'Faelan Reed', 'Ilyana Wren', 'Linnea Sorrel', 'Myriel Ash', 'Nessa Thorn', 'Rhys Silverlaurel', 'Sylvi Brook', 'Tauren Leaf', 'Yllis Dawn'],
  halfling: ['Bilbo', 'Cosmo Tuck', 'Daisy Burrow', 'Milo Nettle', 'Peony Hob', 'Rollo Fairbanks', 'Tansy Puddock', 'Wim Brandyhill', 'Pim Greenhill', 'Poppy Cloud', 'Odo Ferris', 'Lily Dapple'] };
/** the starting gear and pack of a class (PLAN §4.4) */
const START_GEAR = {
  F: { gear: { main: 'longSword', off: 'woodenShield', body: 'leatherArmor' }, pack: ['ration'] },
  P: { gear: { main: 'longSword', off: 'woodenShield', body: 'chainShirt' }, pack: ['ration'] },
  R: { gear: { main: 'shortSword', off: 'shortSword', body: 'leatherArmor' }, pack: ['shortBow', 'arrows', 'ration'] },
  C: { gear: { main: 'mace', off: 'holySymbol', body: 'leatherArmor' }, pack: ['ration'], prep: { 1: ['mend', 'mend'] } },
  M: { gear: { main: 'dagger', off: 'spellbook', body: 'travellersRobe' }, pack: ['ration'], book: ['sparkDart', 'findSeams', 'slumber'], prep: { 1: ['sparkDart', 'slumber'] } },
  T: { gear: { main: 'shortSword', body: 'leatherArmor' }, pack: ['darts', 'darts', 'darts', 'darts', 'darts', 'darts', 'lockpicks', 'ration'] }
};
/** 4d6, the lowest die dropped, then the race's modifiers, re-rolled until the class's minimums are met (Math.random: the view's own dice) */
function rollStats(cls, race) {
  const need = B.MIN_STATS[cls] || {};
  for (let guard = 0; guard < 2000; guard++) {
    const base = {};
    for (const k of ['str', 'dex', 'con', 'int', 'wis']) { const d = [1, 2, 3, 4].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b); base[k] = d[1] + d[2] + d[3]; }
    const mods = B.RACES[race].mods, eff = {};
    for (const k of Object.keys(base)) eff[k] = Math.max(3, Math.min(18, base[k] + (mods[k] || 0)));
    if (Object.entries(need).every(([k, v]) => eff[k] >= v)) return base;
  }
  return { str: 12, dex: 12, con: 12, int: 12, wis: 12 };
}
const PREMADE_AS_SLOTS = () => PREMADE.map(p => Object.assign({ premade: true }, p));
/** a finished slot: the start gear, its book and prayers, and the name */
function slotFromDraft(d) {
  const st = START_GEAR[d.cls];
  return { name: d.name, race: d.race, cls: d.cls, base: d.base, look: d.look, gear: Object.assign({}, st.gear), pack: st.pack.slice(), book: (st.book || []).slice(), prep: JSON.parse(JSON.stringify(st.prep || {})) };
}
const crRooms = () => {
  const d = CR.draft;
  if (CR.step === 'race') return Object.keys(B.RACES).map(r => ({ label: B.RACES[r].name + ' · ' + B.RACES[r].trait, act: () => { d.race = r; CR.step = 'class'; CR.i = 0; } }));
  if (CR.step === 'class') return B.RACES[d.race].classes.split('').map(c => ({ label: B.CLASSES[c].name, act: () => { d.cls = c; d.base = rollStats(c, d.race); CR.step = 'stats'; CR.i = 0; } }));
  if (CR.step === 'stats') return [{ label: 'Keep these stats', act: () => { CR.step = 'look'; CR.i = 0; } }, { label: 'Roll again (□ ' + Object.entries(d.base).map(([k, v]) => k.toUpperCase() + ' ' + v).join('  ') + ')', act: () => { d.base = rollStats(d.cls, d.race); } }];
  if (CR.step === 'look') return [0, 1, 2, 3, 4, 5].map(i => ({ label: 'Look ' + (i + 1), act: () => { d.look = i; CR.step = 'name'; CR.i = 0; d.name = NAMES[d.race][0]; } }));
  if (CR.step === 'name') return NAMES[d.race].map(n => ({ label: n, act: () => { d.name = n; CR.slots[CR.slot] = slotFromDraft(d); CR.step = null; CR.i = 0; } }));
  return [];
};
const crRows = () => {
  if (CR.step) return crRooms();
  const rows = CR.slots.map((sl, i) => ({ label: 'Slot ' + (i + 1) + ': ' + (sl ? sl.name + ' (' + B.RACES[sl.race].name + ' ' + B.CLASSES[sl.cls].name + ')' : 'Create'), act: () => { if (CR.slots[i]) { CR.slots[i] = null; return; } CR.slot = i; CR.draft = { race: 'human', cls: 'F', base: {}, look: 0, name: '' }; CR.step = 'race'; CR.i = 0; } }));
  rows.push({ label: 'Quick Start: the premade four', act: () => { CR.slots = PREMADE_AS_SLOTS().map(p => ({ name: p.name, race: p.race, cls: p.cls, base: p.base, look: 0, gear: p.gear, pack: p.pack, book: p.book || [], prep: p.prep || {}, premade: true })); } });
  const full = CR.slots.every(Boolean);
  rows.push({ label: full ? 'Begin the Descent' : 'Begin the Descent (fill four slots)', act: () => { if (!full) return; SC.members = CR.slots.map(sl => sl.premade ? PREMADE.find(p => p.name === sl.name) : sl); game.go('intro'); } });
  rows.push({ label: 'Back', act: () => game.go('title') });
  return rows;
};
SC.scenes.create = {
  view: 'iso', input: INPUT,
  enter() { CR.step = null; CR.i = 0; },
  update(dt) {
    const rows = crRows(); CR.i = clamp(CR.i, 0, rows.length - 1);
    if (game.input.pressed('down')) CR.i = Math.min(rows.length - 1, CR.i + 1);
    if (game.input.pressed('up')) CR.i = Math.max(0, CR.i - 1);
    if (game.input.pressed('confirm') || game.input.pressed('use')) { game.input.consumeAll(); const r = rows[CR.i]; if (r && r.act) r.act(); }
    if (game.input.pressed('cancel')) { game.input.consumeAll(); if (CR.step) { CR.step = null; CR.i = 0; } else game.go('title'); }
  },
  draw(r) {
    SC.stage.world.draw(r);
    const rows = crRows(), W = Math.min(r.W - 16, 300), H = Math.min(r.H - 16, 200), x = Math.round((r.W - W) / 2), y = Math.round((r.H - H) / 2);
    r.overlay(g => {
      E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#05030c', '#05030c'], alpha: .45 }); PANEL(g, x, y, W, H);
      E.font.text(g, CR.step ? { race: 'RACE', class: 'CLASS', stats: 'STATS', look: 'LOOK', name: 'NAME' }[CR.step] : 'THE PARTY', x + W / 2, y + 6, '#ffd36a', { align: 'center', outline: false });
      if (CR.step === 'stats') TXT(g, Object.entries(CR.draft.base).map(([k, v]) => k.toUpperCase() + ' ' + v).join('  '), x + W / 2, y + 18, '#c8c0b0', { align: 'center', font: 'tiny' });
      const top = y + 30, rh = 12, max = Math.floor((H - 46) / rh), first = Math.max(0, Math.min(CR.i - max + 1, rows.length - max));
      rows.slice(first, first + max).forEach((row, k) => { const idx = first + k, on = idx === CR.i, ry = top + k * rh; if (on) E.ui.box(g, x + 4, ry - 1, W - 8, rh, { bg: '#3a2e1a', border: '#ffd36a', alpha: .8 }); TXT(g, row.label, x + 10, ry + 1, on ? '#fff6d8' : '#d8d0c0', { font: 'tiny' }); });
      TXT(g, LBL('confirm') + ' Choose   ' + LBL('cancel') + ' Back', x + W - 6, y + H - 9, '#8a8070', { font: 'tiny', align: 'right' });
    });
  }
};
/* ---- intro: the Council's words over the Drain-gate, then the play ---- */
const INTRO = [
  ['Hasp. The city of a thousand locks.'], ['For three hundred years its Tumblerwrights forged the finest locks in the world, and its people slept soundly behind them.'],
  ['Then the locks began to turn by themselves.'],
  ['STRAKE: Doors bolt themselves in empty houses. Wells cap shut. Last night the east granary locked forty men inside and would not open for axes.'],
  ['LINTEL: It comes from below. Past the Drains, past the old guild halls… from the Undergate itself.'],
  ['STRAKE: You were recommended to me as people who open things. Go down. Find what holds our bolts, and break its grip.'],
  ['The Drain-gate groans open. You step down into the dark.'], ['Behind you, the grate crashes shut. A great bolt slides home with a sound like a closing tomb.'],
  ['Somewhere far below, something blinks.']
];
SC.scenes.intro = {
  view: 'iso', input: INPUT,
  enter() { SC.introT = 0; SC.introI = 0; SC.introDone = false; musicTo('title'); SC.talk = new E.Dialog(game); SC.talk.say(INTRO.map(l => l[0]), { name: 'NARRATOR', onDone: () => { SC.introDone = true; } }); newGameFromCreate(); },
  update(dt) { if (SC.talk.update(dt)) { babbleTick(SC.talk); if (game.input.pressed('pause') || game.input.pressed('start')) { if (game.input.down('pause') && (SC.holdT = (SC.holdT || 0) + dt) > 1) { SC.introDone = true; } } return; } if (SC.introDone) game.go('play', { from: 'intro' }); },
  draw(r) { SC.stage.world.draw(r); }
};
/** the party from the creation, a new sim, and the first floor */
function newGameFromCreate() { const members = SC.members || PREMADE; SC.members = null; B.sim.newGame({ seed: Math.floor(Math.random() * 1e6) + 1, members, diff: game.settings.difficulty || 'Normal' }); }
/* ---- play ---- */
SC.scenes.play = {
  view: 'iso', input: INPUT, pausable: true,
  enter(d) {
    SC.talk = SC.talk || new E.Dialog(game);
    useFloor(B.sim.S.floor); SC.holdUse = 0; SC.bumpT = 0;
    UI.screen = null; UI.i = 0; UI.toast = { text: B.FLOORS[B.sim.S.floor].name.toUpperCase(), until: B.sim.S.time + 3 };
    if (d && d.from === 'intro') { B.sim.S.log.push({ t: 0, text: 'The grate above is bolted fast. There is no way back.' }); }
    if (B.sim.S.race) { /* the race keeps its own clock */ }
    musicTo(B.FLOORS[B.sim.S.floor].song);
  },
  update(dt) {
    const sim = B.sim, S = sim.S;
    if (SC.devOpen) { devInput(dt); return; }
    // time in menus: the sim slows (or stops) while a screen is open; the setting picks how much
    game.timeScale = (UI.screen || SC.devOpen) ? ({ Pause: 0, Slow: .25, 'Real time': 1 })[game.settings.menuTime] ?? .25 : 1;
    if (SC.talk.update(dt)) { babbleTick(SC.talk); handleDialogInput(); return; }
    if (game.input.pressed('pause')) { /* the engine's pause menu handles Esc/Options */ }
    if (UI.screen) { screenInput(dt); return; }
    if (SC.autoplay) { const c = B.bot.decide(SC.botPlay || (SC.botPlay = B.bot.start())); if (c) sim.cmd(c); }
    // the Dev Mode from the pause menu (the engine's menu item) and the map and screens
    if (game.input.pressed('party')) { game.input.consume('party'); UI.screen = 'party'; UI.i = 0; S.party.sel = Math.max(0, S.party.sel); return; }
    if (game.input.pressed('camp') && !S.camp) { game.input.consume('camp'); if (sim.cmd({ c: 'camp', op: 'rest' }).ok) return; toast('You may not rest with enemies near.'); return; }
    if (game.input.pressed('map')) { game.input.consume('map'); UI.screen = 'map'; return; }
    if (game.input.pressed('journal')) { game.input.consume('journal'); UI.screen = 'journal'; UI.i = 0; UI.tab = 0; return; }
    if (game.input.pressed('selPrev')) { game.input.consume('selPrev'); cycleSel(-1); }
    if (game.input.pressed('selNext')) { game.input.consume('selNext'); cycleSel(1); }
    for (let k = 1; k <= 6; k++) if (game.input.pressed('Digit' + k) || false) { /* the digits: see keysHand() */ }
    // movement: held directions step and turn, one buffered command at a time
    if (!S.camp && (S.party.busyT || 0) <= 0) {
      const mv = game.input.move ? game.input.move() : [0, 0];
      if (game.input.pressed('turnL')) { game.input.consume('turnL'); sim.cmd({ c: 'turn', s: -1 }); }
      else if (game.input.pressed('turnR')) { game.input.consume('turnR'); sim.cmd({ c: 'turn', s: 1 }); }
      else if (game.input.down('fwd') || mv[1] < -.5) sim.cmd({ c: 'move', d: 'f' });
      else if (game.input.down('back') || mv[1] > .5) sim.cmd({ c: 'move', d: 'b' });
      else if (game.input.down('strafeL') || mv[0] < -.5) sim.cmd({ c: 'move', d: 'l' });
      else if (game.input.down('strafeR') || mv[0] > .5) sim.cmd({ c: 'move', d: 'r' });
    }
    if (game.input.pressed('strike')) { game.input.consume('strike'); sim.cmd({ c: 'strike' }); }
    if (game.input.pressed('throw')) { game.input.consume('throw'); sim.cmd({ c: 'throw' }); }
    if (game.input.pressed('examine')) { game.input.consume('examine'); sim.cmd({ c: 'examine' }); }
    if (game.input.pressed('use')) { SC.holdUse = 0; SC.useDown = true; }
    if (SC.useDown && game.input.down('use')) SC.holdUse += dt;
    if (SC.useDown && !game.input.down('use')) { SC.useDown = false; game.input.consume('use'); if (SC.holdUse >= .4 && S.party.hand) sim.cmd({ c: 'putDown' }); else sim.cmd({ c: 'use' }); }
    // one fixed step of the sim, its events to the view, the audio and the HUD
    const ev = sim.update(dt);
    for (const e of ev) handleEvent(e);
    if (S.race && S.race.done && !SC.raceEnded) { SC.raceEnded = true; game.after(2, () => game.go('raceEnd')); }
    if (S.ended === 'victory' && !SC.ending) { SC.ending = true; game.go('ending'); }
    if (S.over && !SC.overShown) { SC.overShown = true; game.go('over'); }
    if (S.floor === 'f4' && S.boss && S.boss.started) { /* the boss's music is the fight layer */ }
    syncWorld(dt);
    tickHint(dt);
  },
  draw(r) {
    const w = useFloor(B.sim.S.floor); w.draw(r);
    r.overlay(g => {
      hudDraw(g, r);
      if (SC.ovCells || SC.ovAI || SC.ovWire) debugOverlay(g, r);
      if (SC.devOpen) drawDev(g, r);
      else if (UI.screen === 'map') drawMap(g, r);
      else if (UI.screen) drawScreen(g, r);
      if (SC.talk.visible || SC.talkOpen) dialogBox(g, r);
      if (UI.hint) TXT(g, UI.hint.text, r.W / 2, r.H - 100, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      if (B.sim.S.floor === 'f4' && B.sim.S.boss && B.sim.S.boss.started) TXT(g, '', 0, 0);
    });
  }
};
/** a DOS-like note at the bottom of the view; a hint is the first-time tip */
function toast(text) { UI.toast = { text, until: B.sim.S.time + 2.5 }; }
function tickHint(dt) { if (UI.hint) { UI.hint.t -= dt; if (UI.hint.t <= 0) UI.hint = null; } }
/** the sim's event: the sound, the screen, the hint, the story, the bark, the floor card */
function handleEvent(e) {
  switch (e.t) {
    case 'msg': if (e.kind !== 'note') UI.toast = { text: e.text, until: B.sim.S.time + 2 }; break;
    case 'hint': if (B.hintsOn()) UI.hint = { text: e.text.replace('{square}', LBL('strike')), t: 6 }; break;
    case 'story': openStory(e.id); break;
    case 'bark': UI.toast = { text: BARKS[e.id] || '', until: B.sim.S.time + 3 }; break;
    case 'floor': sceneFloorCard(e); break;
    case 'hit': UI.hitSide = undefined; break;
    case 'bump': playSfx('thud'); break;
    case 'sfx': playSfx(e.n); break;
    case 'gameover': break;
    case 'npcJoin': break;
    case 'deed': toast('A hidden deed is done!'); break;
    case 'campEnd': break;
    case 'music': break;
    case 'bossIntro': toast('THE EYE OPENS.'); musicTo('boss'); break;
    case 'bossDead': musicTo('victory'); break;
    default: break;
  }
  if (e.t === 'hurt' && e.m !== undefined) { UI.hitT = .6; UI.hitSide = 0; }
  if (e.t === 'hit' && e.from !== undefined) { /* the party's hits */ }
}
/** the floor's card: a short fade and the floor's name; the view changes floor at once */
function sceneFloorCard(e) { UI.toast = { text: e.name.toUpperCase(), until: B.sim.S.time + 3 }; UI.hint = null; musicTo(e.song); useFloor(e.to); }
/** the cycle of the selected member (L1 / R1) */
function cycleSel(d) { const S = B.sim.S, n = partyList().length || 1; S.party.sel = (S.party.sel + d + 6) % 6; while (!S.party.roster[S.party.place[S.party.sel]]) S.party.sel = (S.party.sel + d + 6) % 6; }
/** the screens' keys: up and down move the focus, ✕ acts, ○ goes back, L1 and R1 switch tabs */
function screenInput(dt) {
  const rows = screenRows();
  if (game.input.pressed('cancel')) { game.input.consume('cancel'); if (UI.screen === 'memorize' || UI.screen === 'formation' || UI.screen === 'save' || UI.screen === 'load') UI.screen = 'camp'; else UI.screen = null; UI.i = 0; return; }
  if (UI.screen === 'journal') { if (game.input.pressed('selPrev')) { UI.tab = (UI.tab + 3) % 4; UI.i = 0; } if (game.input.pressed('selNext')) { UI.tab = (UI.tab + 1) % 4; UI.i = 0; } }
  if (UI.screen === 'map') return;
  if (game.input.pressed('down')) UI.i = Math.min(rows.length - 1, UI.i + 1);
  if (game.input.pressed('up')) UI.i = Math.max(0, UI.i - 1);
  if (game.input.pressed('selPrev') && UI.screen === 'party') { cycleSel(-1); UI.i = 0; }
  if (game.input.pressed('selNext') && UI.screen === 'party') { cycleSel(1); UI.i = 0; }
  if (game.input.pressed('confirm') || game.input.pressed('use')) {
    game.input.consume('confirm'); game.input.consume('use');
    const row = rows[UI.i];
    if (row && row.act) { const r = row.act(); if (r && r.ok === false && r.why) toast(r.why === 'full' ? 'No room.' : ''); }
  }
  if (game.input.pressed('strike')) { game.input.consume('strike'); const row = rows[UI.i]; if (row && UI.screen === 'party' && row.id && row.id.startsWith('pack:')) { const S = B.sim.S, idx = S.party.place[S.party.sel], i = +row.id.split(':')[1]; B.sim.cmd({ c: 'inv', op: 'use', from: { where: 'pack', m: idx, i } }); } }
}
function handleDialogInput() { if (game.input.pressed('confirm') || game.input.pressed('use')) game.input.consume('confirm'); }
const dialogBox = (g, r) => { /* the engine's E.Dialog draws itself over the view */ };
/** the story runner: the NPCs' scripts (43-story.js) open with a line set and choices that set flags and join */
function openStory(id) {
  const sc = STORY[id]; if (!sc) return;
  const sayNode = node => {
    SC.talk.say(node.lines, Object.assign({ name: node.name || 'NARRATOR', onDone: () => { if (node.then) { const nx = node.then(); if (nx) sayNode(nx); } } }, node.choices ? { choices: node.choices.map(c => c.text), onChoice: i => { const c = node.choices[i]; c.act && c.act(); if (c.next) sayNode(STORY[c.next]); } } : {}));
  };
  if (sc.start) sayNode(sc.start);
}
/** the music: the floor's song or the named cue, by the audio's own names */
function musicTo(song) { if (!song) return; try { game.audio.music(SONGS[song] || song, { fade: 1 }); } catch (e) { /* no audio yet */ } }
/** the floor's sound: the sim names it, the audio plays it (44-audio.js defines them) */
function playSfx(name) { try { game.audio.sfx(name); } catch (e) { /* a name not defined yet */ } }
/* ---- floor card, game over, ending, about, race ---- */
SC.scenes.over = {
  view: 'iso', input: INPUT,
  enter() { SC.overMenu = new E.Menu(game, ['Load last save', 'Load game', 'Title'], { x: 'center', y: 90, onPick: i => { if (i === 0) { SC.overShown = false; game.saves.load('auto'); } else if (i === 1) { SC.overShown = false; game.go('title'); } else { game.go('title'); } } }); playSfx('gameOver'); },
  update(dt) { if (SC.overMenu.update(dt)) return; },
  draw(r) { VIEW.world && VIEW.world.draw(r); r.overlay(g => { E.font.title(g, 'THE PARTY IS LOST', r.W / 2, r.H / 2 - 70, { align: 'center', scale: 2, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' }); TXT(g, 'The Drains keep what they take.', r.W / 2, r.H / 2 - 40, '#f0e6ff', { align: 'center' }); }); SC.overMenu.draw(r); }
};
SC.scenes.ending = {
  view: 'iso', input: INPUT,
  enter() { SC.endT = 0; musicTo('ending'); SC.endLines = ENDING.slice(); },
  update(dt) { SC.endT += dt; if (SC.endT > 4 + SC.endLines.length * 6 || game.input.anyPressed && game.input.pressed('confirm')) { if (SC.endT > 1) { SC.ending = false; game.go('title'); } } },
  draw(r) { VIEW.world && VIEW.world.draw(r); r.overlay(g => { E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#05030c', '#05030c'], alpha: .6 }); const i = Math.min(SC.endLines.length - 1, Math.floor(Math.max(0, SC.endT - 4) / 6)); if (SC.endT < 4) E.font.title(g, 'THE END', r.W / 2, r.H / 2 - 10, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#c8923a'] }); else TXT(g, SC.endLines[i] || '', r.W / 2, r.H / 2 - 10, '#f0e6d0', { align: 'center' }); }); }
};
/** the About and Credits: its pages (L1 and R1), and the Source Information text */
SC.scenes.about = {
  view: 'iso', input: INPUT,
  enter() { SC.aboutPage = 0; SC.aboutScroll = 0; },
  update(dt) { if (game.input.pressed('cancel') || game.input.pressed('confirm')) { game.input.consumeAll(); game.go('title'); return; } if (game.input.pressed('selNext')) SC.aboutPage = (SC.aboutPage + 1) % B.ABOUT.pages.length; if (game.input.pressed('selPrev')) SC.aboutPage = (SC.aboutPage + B.ABOUT.pages.length - 1) % B.ABOUT.pages.length; if (game.input.down('down')) SC.aboutScroll += dt * 20; if (game.input.down('up')) SC.aboutScroll = Math.max(0, SC.aboutScroll - dt * 20); },
  draw(r) { r.overlay(g => { E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#1c1813', '#0e0c0a'], alpha: .97 }); const pg = B.ABOUT.pages[SC.aboutPage]; E.font.title(g, pg.title, r.W / 2, 8, { align: 'center', scale: 1, colors: ['#fff6d8', '#ffd36a', '#c8923a'] }); let y = 30 - SC.aboutScroll; for (const l of pg.lines) { for (const w of E.font.wrap(l, r.W - 24, { font: 'tiny' })) { TXT(g, w, 12, y, '#f0e6d0', { font: 'tiny' }); y += 9; } } TXT(g, LBL('confirm') + ' Back   L1/R1 pages', r.W - 6, r.H - 8, '#8a8070', { align: 'right', font: 'tiny' }); }); }
};
/** the Rat Run: the race floor, solo, with a clock and the score */
SC.scenes.race = {
  view: 'iso', input: INPUT,
  enter() { B.sim.newRace({ seed: hubOn() ? HUB.info.seed : 5 }); musicTo('drains'); UI.toast = { text: 'THE RAT RUN', until: 99999 }; useFloor('race'); SC.raceEnded = false; SC.hubDone = false; SC.trail = []; SC.trailT = 0; },
  update(dt) {
    const sim = B.sim, S = sim.S;
    if (hubOn()) { if (AIHub.time() < 0 || HUB.ended) { if (HUB.ended && !SC.hubDone) { SC.hubDone = true; game.go('raceEnd'); } return; } hubRaceTick(dt); }
    // the solo run's trail (10 a second) for the best-run ghost, and the best time kept in storage
    if (!hubOn() && !S.race.done) { SC.trailT = (SC.trailT || 0) - dt; if (SC.trailT <= 0) { SC.trailT = .1; (SC.trail = SC.trail || []).push({ t: +S.race.t.toFixed(2), cx: S.party.cx, cy: S.party.cy, dir: S.party.dir }); } }
    if (game.input.pressed('pause')) { game.input.consume('pause'); }
    if (SC.talk && SC.talk.update(dt)) return;
    if (game.input.pressed('turnL')) { game.input.consume('turnL'); sim.cmd({ c: 'turn', s: -1 }); }
    else if (game.input.pressed('turnR')) { game.input.consume('turnR'); sim.cmd({ c: 'turn', s: 1 }); }
    else if (game.input.down('fwd')) sim.cmd({ c: 'move', d: 'f' });
    else if (game.input.down('back')) sim.cmd({ c: 'move', d: 'b' });
    if (game.input.pressed('use')) { game.input.consume('use'); sim.cmd({ c: 'use' }); }
    if (game.input.pressed('strike')) { game.input.consume('strike'); sim.cmd({ c: 'strike' }); }
    for (const e of sim.update(dt)) handleEvent(e);
    if (S.race.done && !SC.raceEnded) { SC.raceEnded = true; hubReport('finished'); if (!hubOn()) saveRatRun(S.race.time, SC.trail || []); game.after(1.5, () => game.go('raceEnd')); }
    if (S.over && !SC.overShown) { SC.overShown = true; if (hubOn()) { hubReport('wipe'); game.go('raceEnd'); } else game.go('over'); }
    syncWorld(dt);
  },
  draw(r) { const w = useFloor('race'); w.draw(r); r.overlay(g => { hudDraw(g, r); hubDrawGhosts(g, r); if (!hubOn()) ratGhostDraw(g, r); }); }
};
SC.scenes.raceEnd = {
  view: 'iso', input: INPUT,
  enter() { SC.reMenu = new E.Menu(game, ['Run again', 'Title'], { x: 'center', y: 110, onPick: i => { if (i === 0) game.go('race'); else game.go('title'); } }); const R = B.sim.S.race; SC.reLines = [R.done ? 'Escaped in ' + Math.floor(R.time / 60) + ':' + (R.time % 60).toFixed(1).padStart(4, '0') : 'Your party fell.', 'Score ' + R.score, 'Kills ' + R.kills + '   Crowns ' + R.crowns]; },
  update(dt) { SC.reMenu.update(dt); },
  draw(r) { VIEW.world && VIEW.world.draw(r); r.overlay(g => { E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#05030c', '#05030c'], alpha: .6 }); SC.reLines.forEach((l, i) => TXT(g, l, r.W / 2, 60 + i * 12, '#ffe7a8', { align: 'center' })); }); SC.reMenu.draw(r); }
};
/** the Dev Mode's panel: tabs of the sliders and the cheats, and the reset; it changes the sim live (B.T and the cheats) */
const DEV_TABS = ['Combat', 'Monsters', 'Exploration', 'Survival', 'Cheats', 'Warp', 'Party', 'Spawn', 'Debug'];
SC.dev = { tab: 0, i: 0 };
function devSave() { try { localStorage.setItem('boltholder.dev', JSON.stringify({ T: B.T, cheats: B.sim.S.cheats || {} })); } catch (e) { /* storage may be off */ } }
function devLoad() { try { const d = JSON.parse(localStorage.getItem('boltholder.dev') || 'null'); if (d && d.T) Object.assign(B.T, d.T); } catch (e) { /* none */ } }
/** the Dev Mode's rows for the open tab: the sliders (live, saved), the cheats (toggles), the reset at the top */
function devRows() {
  const tab = DEV_TABS[SC.dev.tab], rows = [{ id: 'reset', label: 'Reset to defaults', act: () => { B.resetTuning(); devSave(); return { ok: true }; } }];
  if (tab === 'Cheats') {
    const names = [['god', 'God mode'], ['infAmmo', 'Infinite spells'], ['noCool', 'No cooldowns'], ['noHunger', 'No hunger'], ['oneHit', 'One-hit kills'], ['noclip', 'Noclip'], ['revealMap', 'Reveal map'], ['freeze', 'Freeze monsters']];
    for (const [k, l] of names) rows.push({ id: k, label: l + ': ' + (B.sim.S.cheats && B.sim.S.cheats[k] ? 'ON' : 'off'), act: () => { B.sim.cheat(k, !(B.sim.S.cheats && B.sim.S.cheats[k])); devSave(); return { ok: true }; } });
    rows.push({ id: 'heal', label: 'Heal all', act: () => { for (const [m] of partyList()) healMember(m, 999); return { ok: true }; } });
    rows.push({ id: 'lvl', label: 'Give every member a level', act: () => { for (const [m] of partyList()) { m.xp = B.XP_LEVELS[Math.min(8, m.lvl + 1)]; checkLevel(m); } return { ok: true }; } });
    return rows;
  }
  if (tab === 'Warp') { for (const f of ['f1', 'f2', 'f3', 'f4']) rows.push({ id: 'w' + f, label: 'Warp to ' + B.FLOORS[f].name, act: () => { B.sim.warp(f, B.FLOORS[f].start[0], B.FLOORS[f].start[1], B.FLOORS[f].start[2]); useFloor(f); return { ok: true }; } }); return rows; }
  if (tab === 'Party') {
    rows.push({ id: 'rest', label: 'Full rest', act: () => { for (const [m] of partyList()) { healMember(m, 999); m.food = 100; m.used = { 1: 0, 2: 0, 3: 0 }; } return { ok: true }; } });
    for (const id of ['tamsin', 'durgan', 'veil']) rows.push({ id: 'npc' + id, label: 'Add NPC: ' + NPCS[id].name, act: () => B.sim.cmd({ c: 'npc', id, join: true }) });
    return rows;
  }
  if (tab === 'Spawn') {
    const [fx, fy] = frontCell();
    for (const type of Object.keys(B.MONS).filter(t => t !== 'boltholder')) rows.push({ id: 'sp' + type, label: 'Spawn ' + B.MONS[type].name + ' in front', act: () => { if (!passable(fx, fy, 'mon') || monAt(fx, fy)) return { ok: false, why: 'blocked' }; const m = mkMon(type, fx, fy, B.sim.S.floor, {}); m.aware = true; m.state = 'hunt'; monsOn().push(m); useFloor(B.sim.S.floor); return { ok: true }; } });
    rows.push({ id: 'killall', label: 'Kill all on this floor', act: () => { for (const m of monsOn()) if (m.hp > 0 && m.type !== 'boltholder') monsterDied(m, null); return { ok: true }; } });
    return rows;
  }
  if (tab === 'Debug') {
    rows.push({ id: 'bot', label: 'Auto-play this floor (the walkthrough bot): ' + (SC.autoplay ? 'on' : 'off'), act: () => { SC.autoplay = !SC.autoplay; return { ok: true }; } });
    rows.push({ id: 'cells', label: 'Overlay: cell and facing: ' + (SC.ovCells ? 'on' : 'off'), act: () => { SC.ovCells = !SC.ovCells; return { ok: true }; } });
    rows.push({ id: 'ai', label: 'Overlay: monster states: ' + (SC.ovAI ? 'on' : 'off'), act: () => { SC.ovAI = !SC.ovAI; return { ok: true }; } });
    rows.push({ id: 'wire', label: 'Overlay: wiring on the map: ' + (SC.ovWire ? 'on' : 'off'), act: () => { SC.ovWire = !SC.ovWire; return { ok: true }; } });
    for (const [label, x, y, dir] of (B.FLOORS[B.sim.S.floor].waypoints || [])) rows.push({ id: 'wp' + label, label: 'Waypoint: ' + label, act: () => { B.sim.warp(B.sim.S.floor, x, y, dir); useFloor(B.sim.S.floor); return { ok: true }; } });
    for (const [name, id] of Object.entries(B.SFX_NAMES)) rows.push({ id: 'sfx' + id, label: 'Sound: ' + id, act: () => { playSfx(id); return { ok: true }; } });
    for (const id of Object.keys(SONGS)) rows.push({ id: 'song' + id, label: 'Song: ' + id, act: () => { musicTo(id); return { ok: true }; } });
    rows.push({ id: 'intro', label: 'Play the intro again', act: () => { game.go('intro'); return { ok: true }; } });
    return rows;
  }
  const group = { Combat: 'Combat', Monsters: 'Monsters', Exploration: 'Exploration', Survival: 'Survival' }[tab] || tab;
  for (const t of B.TUNING.filter(x => x.group === group)) rows.push({ id: t.key, label: t.label + ': ' + +(B.T[t.key].toFixed(2)), adj: d => { B.T[t.key] = clamp(+(B.T[t.key] + d * t.step).toFixed(3), t.min, t.max); devSave(); }, desc: 'default ' + t.def });
  return rows;
}
/** the Dev Mode's input: L1 and R1 change tabs, up and down move, left and right change a slider, ✕ runs a row, ○ closes */
function devInput(dt) {
  if (game.input.pressed('cancel')) { game.input.consume('cancel'); SC.devOpen = false; return; }
  if (game.input.pressed('selPrev')) SC.dev.tab = (SC.dev.tab + DEV_TABS.length - 1) % DEV_TABS.length, SC.dev.i = 0;
  if (game.input.pressed('selNext')) SC.dev.tab = (SC.dev.tab + 1) % DEV_TABS.length, SC.dev.i = 0;
  const rows = devRows(); SC.dev.i = clamp(SC.dev.i, 0, rows.length - 1);
  if (game.input.pressed('down')) SC.dev.i = Math.min(rows.length - 1, SC.dev.i + 1);
  if (game.input.pressed('up')) SC.dev.i = Math.max(0, SC.dev.i - 1);
  const row = rows[SC.dev.i];
  if (row && row.adj && (game.input.pressed('left') || game.input.pressed('right'))) row.adj(game.input.pressed('right') ? 1 : -1);
  if (row && row.act && game.input.pressed('confirm')) { game.input.consume('confirm'); row.act(); }
}
/** the Dev Mode's panel: the tabs, the rows and each slider's value */
function drawDev(g, r) {
  const rows = devRows(), W = Math.min(r.W - 20, 300), H = Math.min(r.H - 20, 210), x = Math.round((r.W - W) / 2), y = Math.round((r.H - H) / 2);
  E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#05030c', '#05030c'], alpha: .6 }); PANEL(g, x, y, W, H);
  E.font.text(g, 'DEV MODE', x + W / 2, y + 4, '#ffd36a', { align: 'center', outline: false });
  DEV_TABS.forEach((t, i) => TXT(g, t, x + 6 + i * (W / DEV_TABS.length - 2), y + 16, i === SC.dev.tab ? '#ffd36a' : '#8a8070', { font: 'tiny' }));
  const top = y + 28, max = Math.floor((H - 40) / 11), first = Math.max(0, Math.min(SC.dev.i - max + 1, rows.length - max));
  rows.slice(first, first + max).forEach((row, k) => { const on = first + k === SC.dev.i, ry = top + k * 11; if (on) E.ui.box(g, x + 4, ry - 1, W - 8, 11, { bg: '#3a2e1a', border: '#ffd36a', alpha: .8 }); TXT(g, row.label, x + 10, ry, on ? '#fff6d8' : '#d8d0c0', { font: 'tiny' }); });
  TXT(g, LBL('confirm') + ' run  ◀ ▶ change  L1/R1 tabs  ' + LBL('cancel') + ' close', x + 6, y + H - 10, '#8a8070', { font: 'tiny' });
}

/** the Debug overlays: the cell and facing, each monster's state and timers, the wiring as lines on the map */
function debugOverlay(g, r) {
  const S = B.sim.S, p = S.party;
  if (SC.ovCells) TXT(g, 'cell ' + p.cx + ',' + p.cy + ' facing ' + DNAME[p.dir] + '  t ' + S.time.toFixed(1), 4, 62, '#9ad8ff', { font: 'tiny' });
  if (SC.ovAI) monsOn().filter(m => m.hp > 0).slice(0, 12).forEach((m, i) => TXT(g, m.type + ' ' + m.state + (m.aware ? ' aware' : '') + ' hp ' + m.hp + ' wind ' + (m.wind || 0).toFixed(2), 4, 110 + i * 8, '#ffb0a0', { font: 'tiny' }));
  if (SC.ovWire) (curF().wires || []).slice(0, 20).forEach((w, i) => TXT(g, JSON.stringify(w.on).slice(0, 60), 4, 240 + i * 0, '#a0ffa0', { font: 'tiny' }));
}

/* ---- the solo Rat Run's best-run ghost: the best time and its 10 Hz trail, kept in storage ---- */
function loadRatRun() { try { return JSON.parse(localStorage.getItem('boltholder.ratrun') || 'null'); } catch (e) { return null; } }
function saveRatRun(time, trail) {
  const best = loadRatRun();
  if (best && best.time <= time) return;
  try { localStorage.setItem('boltholder.ratrun', JSON.stringify({ time, trail })); } catch (e) { /* storage may be off */ }
}
/** the golden ghost: the best trail's cell at the run's time, drawn with a light and a name */
function ratGhostDraw(g, r) {
  const best = loadRatRun(); if (!best || !best.trail || !best.trail.length || !VIEW.world) return;
  const t = B.sim.S.race.t; let pick = best.trail[0];
  for (const s of best.trail) { if (s.t <= t) pick = s; else break; }
  const q = VIEW.world.project(MID(pick.cx), MID(pick.cy), 22); if (!q) return;
  g.fillStyle = 'rgba(255,211,106,.35)'; g.beginPath(); g.arc(q[0], q[1], 5, 0, Math.PI * 2); g.fill();
  TXT(g, 'BEST ' + Math.floor(best.time / 60) + ':' + (best.time % 60).toFixed(1).padStart(4, '0'), q[0], q[1] - 10, '#ffd36a', { align: 'center', font: 'tiny' });
}
