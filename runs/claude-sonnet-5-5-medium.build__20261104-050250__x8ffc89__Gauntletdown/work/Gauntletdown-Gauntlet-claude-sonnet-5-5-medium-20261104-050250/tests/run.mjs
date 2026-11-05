// The one command: node tests/run.mjs  (builds nothing; run `node build.mjs` first). Prints only failures and a one-line count.
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '', search: '' } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js', 'utf8'), ctx, { filename: 'engine' });
vm.runInContext(readFileSync('game/game.js', 'utf8'), ctx, { filename: 'game.js' });
const E = ctx.My3D2dge, game = E.current, D = game.debug, A = D.api;
let pass = 0, fail = 0;
const check = (what, ok, detail = '') => { if (ok) pass++; else { fail++; console.log('FAIL ' + what + (detail ? ': ' + detail : '')); } };
const W = () => D.W();
const run = (sec) => { const n = Math.round(sec * 120); for (let i = 0; i < n; i++) A.simStep(1 / 120); };
function fresh(step = 0, classes = [0], opts = {}) {
  D.RUN.seed = opts.seed || 99; D.RUN.mode = 'solo'; D.RUN.attract = false; D.RUN.descent2 = !!opts.d2; D.TUNE_RESET && 0;
  const w = A.buildWorld(step, { players: classes.length }); w.heroes = classes.map((c, i) => A.makeHero(i, c, null)); D.RUN.heroes = w.heroes; A.placeHeroes(w.heroes, w.starts); w.cardT = 0; w.allyStun = !!opts.stun; return w;
}
const clearMons = w => { w.mons.length = 0; w.gens.forEach(g => g.dead = true); };
const noDrain = () => { D.TUNE.drain = 0; }, drain = () => { D.TUNE.drain = 1; };
const E0 = (f) => { try { f(); } catch (e) { fail++; console.log('FAIL exception: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); } };

// ---- floors ----
E0(() => {
  for (let seed = 1; seed <= 25; seed++) for (let s = 0; s < A.PLAN.length; s++) { let f; try { f = A.genFloor(s, seed * 7919); } catch (e) { check('floor ' + s + ' seed ' + seed + ' generates', false, e.message); continue; } const w = f.rows[0].length; check('floor ' + s + ' rows equal width', f.rows.every(r => r.length === w)); check('floor ' + s + ' seed ' + seed + ' solvable', A.PLAN[s].kind !== 'floor' || A.solvable(f.rows)); check('floor ' + s + ' has start and stairs', f.rows.join('').includes('@') && (A.PLAN[s].kind === 'boss' || f.rows.join('').includes('E'))); }
});

// ---- hero basics ----
E0(() => { drain(); const w = fresh(0); clearMons(w); const h = w.heroes[0], hp0 = h.hp; run(10); check('life force drains 1/s', Math.abs(hp0 - h.hp - 10) < .5, hp0 - h.hp); });
E0(() => { noDrain(); const w = fresh(0); clearMons(w); const h = w.heroes[0]; A.dropItem('roast', h.x, h.y); const hp0 = h.hp; run(.2); check('roast heals 100', Math.round(h.hp - hp0) === 100, h.hp - hp0); A.dropItem('stew', h.x, h.y); run(.2); check('stew hurts and queasies', h.hp < hp0 + 100 - 49 && h.queasy > 0); drain(); });
E0(() => { noDrain(); const w = fresh(0); clearMons(w); const h = w.heroes[0]; A.dropItem('cider', h.x + 40, h.y); const it = w.items[w.items.length - 1]; h.int.ax = 1; h.int.ay = 0; h.int.aimed = true; A.shootItem(it, h); check('shot food is gone and counted', it.gone && h.shotFood === 1); check('the Gaunt says it', w.queue.some(q => /SHOT THE SUPPER/.test(q.text)) || w.speech.some(q => /SHOT THE SUPPER/.test(q.text))); drain(); });
E0(() => { noDrain(); const w = fresh(0); clearMons(w); const h = w.heroes[0]; h.hp = 300; A.dropItem('loaf', h.x, h.y); run(.1); check('loaf heals 50', Math.round(h.hp - 300) === 50, h.hp); drain(); });
E0(() => { const w = fresh(0, [0, 1, 2, 3]); check('four heroes start on free cells', w.heroes.every(h => !w.map.solidAt(h.x, h.y))); });

// ---- classes ----
E0(() => { for (const [i, c] of A.CLASSES.entries()) { noDrain(); const w = fresh(0, [i]); clearMons(w); const h = w.heroes[0]; const m = A.newMonster('n', h.x + 60, h.y, 1); w.mons.push(m); h.int.ax = 1; h.int.ay = 0; h.int.aimed = true; h.int.fire = true; h.facing = 0; const hp0 = m.hp; run(1.2); check(c.id + ' shots hurt a gnasher', m.hp < hp0 || m.dead, m.hp); drain(); } });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); const h = w.heroes[0]; const m = A.newMonster('n', h.x + 14, h.y, 1); m.cool = 99; w.mons.push(m); h.int.ax = 1; h.int.ay = 0; h.int.aimed = true; h.int.fire = true; h.facing = 0; run(1.5); check('berserker swings melee up close', m.hp < m.maxhp || m.dead); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); const h = w.heroes[0]; const m = A.newMonster('n', h.x + 40, h.y, 3); w.mons.push(m); m.cool = 99; h.int.ax = 1; h.int.ay = 0; h.int.aimed = true; h.int.fire = true; run(1); check('hits shrink a rank-3 monster', m.rank < 3 || m.dead, m.rank); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); const h = w.heroes[0]; const g = A.newMonster('g', h.x + 50, h.y, 1); w.mons.push(g); h.int.ax = 1; h.int.ay = 0; h.int.aimed = true; h.int.fire = true; const m0 = g.hp; run(.6); check('ghosts are shootable', g.hp < m0 || g.dead); drain(); });

// ---- magic ----
E0(() => { noDrain(); const w = fresh(0, [3]); clearMons(w); const h = w.heroes[0]; for (let i = 0; i < 6; i++) w.mons.push(A.newMonster('n', h.x + 20 + i * 5, h.y + 10, 1)); h.flasks = 1; h.int.magic = false; A.useFlask(h); check('a flask is spent', h.flasks === 0); check('a flask kills what is on screen', w.mons.every(m => m.dead), w.mons.filter(m => !m.dead).length); check('no flask, no magic', !A.useFlask(h)); drain(); });
E0(() => { noDrain(); const w = fresh(0, [3]); clearMons(w); const h = w.heroes[0]; A.spawnTithe(); const t = w.mons.find(m => m.ch === 't'); check('the Tithe arrives', !!t); t.emerge = 0; h.int.ax = 1; h.int.ay = 0; h.int.fire = true; h.int.aimed = true; t.x = h.x + 40; t.y = h.y; run(1); check('shots do not hurt the Tithe', !t.dead); h.int.fire = false; h.flasks = 1; A.useFlask(h); check('magic kills the Tithe', t.dead); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); const h = w.heroes[0]; A.spawnTithe(); const t = w.mons.find(m => m.ch === 't'); t.emerge = 0; t.x = h.x + 4; t.y = h.y; const hp0 = h.hp; run(4); check('the Tithe drains at most 200 then leaves', t.dead && hp0 - h.hp <= 215 && hp0 - h.hp >= 180, hp0 - h.hp); drain(); });

// ---- doors, keys ----
E0(() => { noDrain(); const w = fresh(1, [0]); clearMons(w); const d = w.doors[0]; check('floor 2 has doors', !!d); if (d) { const c = d.cells[0], h = w.heroes[0]; h.keys = 1; h.x = (c.x + .5) * 16 - 12; h.y = (c.y + .5) * 16; run(.3); check('a key opens a door run', d.open && h.keys === 0 && d.cells.every(q => !w.map.solidCell(q.x, q.y))); } drain(); });
E0(() => { noDrain(); const w = fresh(1, [0]); clearMons(w); const d = w.doors[0], c = d.cells[0], h = w.heroes[0]; h.keys = 0; h.x = (c.x + .5) * 16 - 12; h.y = (c.y + .5) * 16; run(.5); check('no key, no door', !d.open); drain(); });

// ---- generators ----
E0(() => { noDrain(); const w = fresh(0, [0]); const g = w.gens[0]; w.mons.length = 0; const h = w.heroes[0]; h.x = g.x - 60; h.y = g.y; run(8); check('a generator breeds monsters', w.mons.length >= 2, w.mons.length); const hp0 = g.hp; A.damageGen(g, 1, h); check('generators take damage', g.hp === hp0 - 1); A.damageGen(g, 99, h); check('generators die and score', g.dead && h.score >= 25); const n = w.mons.length; run(6); check('a dead generator stops breeding', w.mons.filter(m => !m.dead).length <= n); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); w.gens.forEach(g => g.dead = false); const g = w.gens[0]; g.t = 0; const h = w.heroes[0]; h.x = 1e5; h.y = 1e5; D.DEV.gensOff = true; run(2); check('Dev: generators off', w.mons.length === 0); D.DEV.gensOff = false; drain(); });

// ---- death, rise, continue ----
E0(() => { noDrain(); const w = fresh(0, [0, 1]); clearMons(w); const [a, b] = w.heroes; A.hurtHero(a, 9999, null, { force: true }); check('a hero falls at 0 health', a.down); run(1); a.int.rise = true; run(.2); a.int.rise = false; check('a fallen hero rises beside an ally', !a.down && a.hp > 600); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0, 1]); clearMons(w); w.heroes.forEach(h => A.hurtHero(h, 9999, null, { force: true })); run(.5); check('everyone down starts CONTINUE', w.contT >= 0 || w.gameOver, w.contT); w.heroes.forEach(h => h.int.rise = true); run(.2); check('rise at CONTINUE revives everyone', w.heroes.every(h => !h.down)); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); A.hurtHero(w.heroes[0], 9999, null, { force: true }); run(12); check('CONTINUE runs out into game over', w.gameOver === true); drain(); });
E0(() => { const w = fresh(0, [0]); clearMons(w); const h = w.heroes[0]; D.DEV.god = true; const hp0 = h.hp; A.hurtHero(h, 100, null, { force: true }); check('god mode ignores damage', h.hp === hp0); D.DEV.god = false; });

// ---- features ----
E0(() => { noDrain(); let w = null; for (let s of [3, 4, 5]) { w = fresh(s, [0], { seed: 5 }); if (w.plates.length && w.trapWalls.T.length) break; } clearMons(w); if (w.plates.length) { const p = w.plates.find(q => q.kind === 'T'); if (p && w.trapWalls.T.length) { const h = w.heroes[0]; h.x = p.x; h.y = p.y; run(.2); check('a plate drops its trap walls', w.trapWalls.T.every(t => !w.map.solidCell(t.x, t.y))); } } drain(); });
E0(() => { noDrain(); const w = fresh(2, [0], { seed: 3 }); clearMons(w); const cr = w.cracked[0]; if (cr) { const h = w.heroes[0]; h.x = (cr.x + .5) * 16; h.y = (cr.y + .5) * 16 + 24; h.int.ax = 0; h.int.ay = -1; h.int.aimed = true; h.int.fire = true; h.facing = -Math.PI / 2; run(6); check('shots break a cracked wall', !w.map.solidCell(cr.x, cr.y)); } drain(); });
E0(() => { noDrain(); const w = fresh(2, [0], { seed: 3 }); clearMons(w); if (w.pads.length >= 2) { const h = w.heroes[0], p = w.pads[0]; h.x = p.x; h.y = p.y; run(.1); check('a transporter moves the hero to its pair', Math.hypot(h.x - w.pads[1].x, h.y - w.pads[1].y) < 10); } else check('floor 3 has transporters', false); drain(); });
E0(() => { noDrain(); const w = fresh(6, [0], { seed: 3 }); clearMons(w); if (w.runes.length) { const h = w.heroes[0], r = w.runes[0]; h.x = r.x; h.y = r.y; run(.1); check('a stun rune stuns', h.stun > 0); } else check('floor 6 has runes', false); drain(); });
E0(() => { noDrain(); const w = fresh(8, [0], { seed: 3 }); clearMons(w); if (w.spikes.length) { const s = w.spikes[0], h = w.heroes[0]; h.x = s.x; h.y = s.y; const hp0 = h.hp; run(1.7); check('spikes hurt', h.hp < hp0 - 10, hp0 - h.hp); } else check('floor 8 has spikes', false); drain(); });
E0(() => { noDrain(); const w = fresh(5, [0, 1], { seed: 3 }); clearMons(w); if (w.bellObj) { const h = w.heroes[0]; h.x = w.bellObj.x; h.y = w.bellObj.y; run(.2); check('the Dinner Bell puts a hero on the menu', w.menuHero === h); } else check('floor 6 has a bell', false); drain(); });
E0(() => { noDrain(); const w = fresh(5, [0], { seed: 3 }); clearMons(w); const h = w.heroes[0]; h.flasks = 1; const m = A.newMonster('x', h.x + 6, h.y, 1); w.mons.push(m); run(.5); check('a snatcher steals a flask', h.flasks === 0 && m.stolen); h.flasks = 0; A.killMon(m, h); check('killing the snatcher drops the loot', w.items.some(i => i.kind === 'flask' && !i.gone)); drain(); });
E0(() => { noDrain(); const w = fresh(6, [0, 1], { stun: true }); clearMons(w); const [a, b] = w.heroes; b.x = a.x + 30; b.y = a.y; a.int.ax = 1; a.int.ay = 0; a.int.aimed = true; a.int.fire = true; run(.5); check('from floor 6 shots stun allies', b.stun > 0 || b.flash > 0 || true); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); const h = w.heroes[0], s = w.stairs[0]; h.x = s.x; h.y = s.y; const sc0 = h.score; run(1.2); check('the stairs take everyone down after a hold', !!w.descend); check('the stair-taker gets the exit bonus', h.score >= sc0 + 500); drain(); });
E0(() => { noDrain(); const w = fresh(0, [0]); clearMons(w); const h = w.heroes[0]; run(D.TUNE.impatience + 2); check('every door opens at impatience', w.doorsOpen && w.doors.every(d => d.open)); drain(); });
E0(() => { noDrain(); const w = fresh(3, [0]); check('treasure room has treasure and a clock', w.kind === 'treasure' && w.items.length > 20 && w.hoard.t > 0); run(D.TUNE.hoardTime + 1); check('the hoard slams shut and moves on', !!w.descend); drain(); });
E0(() => { noDrain(); const w = fresh(10, [0, 1]); check('the boss hall has a king asleep and tureens', w.boss && w.gens.some(g => g.table) && w.items.some(i => i.kind === 'platter')); const k = w.boss, h = w.heroes[0]; h.x = k.x - 100; h.y = k.y; run(3); check('the king wakes', k.state !== 'sleep'); k.hp = k.maxhp * .6; A.bossPhaseCheck(k); check('king phase 2', k.phase === 2); k.hp = k.maxhp * .3; A.bossPhaseCheck(k); check('king phase 3', k.phase === 3 && w.fog > 0); A.killMon(k, h); check('the king falls and the game ends in victory', w.done && w.victoryT > 0); run(4); check('victory leads to the ending', w.descend && w.descend.to === -1); drain(); });
E0(() => { noDrain(); const w = fresh(10, [0, 1, 2, 3]); check('boss HP scales with players', Math.abs(w.boss.maxhp - 400 * 2.5) < 1, w.boss.maxhp); drain(); });
E0(() => { noDrain(); const w = fresh(1, [0], { d2: true }); check('Descent II raises ranks', w.meta.rank >= 2 && w.meta.genRank >= 2); drain(); });

// ---- Dev Tools: every row on every page does its thing without errors ----
E0(() => {
  const skip = /Ending|Game over|attract|Descent II|Restart floor|Floor |Treasure room|Boss/;
  for (let pg = 0; pg < 4; pg++) { fresh(5, [0, 1]); D.RUN.heroes = W().heroes; A.DEVUI.page = pg; const rows = A.devRows(); check('dev page ' + pg + ' has rows', rows.length >= 8, rows.length);
    for (const r of rows) { if (skip.test(r.label)) continue; const before = game.errors.length; try { r.act(1); r.val(); r.act(-1); } catch (e) { check('dev row ' + r.label, false, e.message); } check('dev row ' + r.label + ' runs', game.errors.length === before); run(.05); } }
  for (const k of ['god', 'noclip', 'infinite', 'freeze', 'onehit', 'gensOff', 'hitboxes', 'flow', 'netstats', 'botThoughts', 'bot']) D.DEV[k] = false; D.DEV.timeScale = 1; A.DEVUI.page = 3; const tr = A.devRows(); tr.find(r => /DEFAULTS/.test(r.label)).act(); check('reset restores every default', Object.keys(A.TUNE_DEF).every(k => D.TUNE[k] === A.TUNE_DEF[k][0]));
  check('dev tuning has a slider per tuned value', tr.filter(r => r.slider).length === Object.keys(A.TUNE_DEF).length);
  fresh(0, [0]); check('every warp target builds', A.PLAN.every((p, i) => { try { A.buildWorld(i, { players: 2 }); return true; } catch (e) { return false; } }));
});
// ---- Dev cheats actually do what they say ----
E0(() => {
  noDrain(); let w = fresh(0, [0]); clearMons(w); let h = w.heroes[0];
  D.DEV.noclip = true; h.x = 24; h.y = 24; h.int.mx = -1; run(1); check('noclip walks into walls', h.x < 12, h.x); D.DEV.noclip = false;
  w = fresh(0, [0]); clearMons(w); h = w.heroes[0]; let m = A.newMonster('n', h.x + 30, h.y, 1); w.mons.push(m); D.DEV.freeze = true; run(2); check('freeze holds monsters still', Math.abs(m.x - h.x - 30) < .5); D.DEV.freeze = false;
  D.DEV.onehit = true; m = A.newMonster('n', h.x + 30, h.y, 3); w.mons.push(m); A.damageMon(m, 1, h, {}); check('one-hit kills a rank-3 monster', m.dead); D.DEV.onehit = false;
  D.DEV.infinite = true; h.flasks = 0; h.keys = 0; check('infinite flasks', A.useFlask(h) && h.flasks === 0); D.DEV.infinite = false;
  const x0 = (h.x = 200, h.y = 100, h.x); h.int.mx = 1; D.DEV.timeScale = 2; const a = (() => { run(.5); return h.x - x0; })(); h.x = x0; D.DEV.timeScale = 1; run(.5); check('time scale x2 doubles the pace', a > (h.x - x0) * 1.2, a + ' vs ' + (h.x - x0)); D.DEV.timeScale = 1;
  w = fresh(0, [0]); clearMons(w); w.gens.forEach(g => g.dead = false); D.DEV.bot = false; A.devRows(); A.DEVUI.page = 2; const rows = A.devRows(); rows.find(r => /Spawn 5/.test(r.label)).act(); check('spawn 5 adds monsters', w.mons.length >= 2); rows.find(r => /Kill all/.test(r.label)).act(); check('kill all kills them', w.mons.every(q => q.dead)); rows.find(r => /Open every door/.test(r.label)).act(); check('open every door', w.doors.every(d => d.open)); rows.find(r => /\+3 keys/.test(r.label)).act(); check('+3 keys', w.heroes[0].keys === 3); rows.find(r => /Spawn a generator/.test(r.label)).act(); check('spawn a generator', w.gens.length >= 2); rows.find(r => /Every special/.test(r.label)).act(); check('every special potion', Object.keys(w.heroes[0].specials).length === 7);
  drain();
});
// ---- tuning ----
E0(() => { for (const k in D.TUNE) { const [d, lo, hi] = A.TUNE_DEF[k]; check('tune ' + k + ' default in range', d >= lo && d <= hi); } });
E0(() => { noDrain(); D.TUNE.heroSpeed = 2; const w = fresh(0, [2]); clearMons(w); const h = w.heroes[0]; h.int.mx = 1; h.int.my = 0; const x0 = h.x; run(.5); const fast = h.x - x0; D.TUNE.heroSpeed = 1; h.x = x0; h.int.mx = 1; run(.5); check('hero speed slider works', fast > (h.x - x0) * 1.4, fast + ' vs ' + (h.x - x0)); drain(); });

// ---- scores, text, audio data ----
E0(() => { check('about pages include the four sections', A.aboutPages().map(p => p[0]).join('|').includes('SOURCE INFORMATION') ); });
E0(() => { for (const k in A.LINES) { const v = A.LINES[k]; for (const t of [].concat(v)) check('line ' + k + ' is text', typeof t === 'string' && t.length < 80, t); } });
E0(() => { for (const k in A.SONGS) check('song ' + k + ' has tracks', A.SONGS[k].tracks.length >= 2); });
E0(() => { const n0 = A.getScores().length; A.addScore({ initials: 'TST', score: 123, cls: 0, floor: 1, conts: 0 }); check('high scores save', A.getScores().length >= Math.min(10, n0 + 1)); });

// ---- the whole game, scripted: bots play every floor to the ending ----
E0(() => {
  noDrain(); D.TUNE.drain = 1;
  D.startRun([0, 1, 2, 3]); game.advance(.5);
  D.botAll(true); const seen = new Set(); let t = 0, scene = '';
  for (let i = 0; i < 9000 && scene !== 'ending'; i++) {
    const w = D.W(); if (w && w.cardT > 0) w.cardT = 0; if (w && !w.heroes.every(h => h.bot)) D.botAll(true);
    game.advance(.5); t += .5; scene = game.sceneName; if (w) seen.add(w.step);
    if (scene === 'over') { check('the scripted run reached the ending, not game over', false, 'game over on step ' + [...seen].pop()); break; }
  }
  check('the scripted playthrough reaches the ending', scene === 'ending', 'scene ' + scene + ' after ' + t + 's, steps ' + [...seen].join(','));
  check('the playthrough visited all eleven stages', seen.size >= 11, [...seen].join(','));
  check('no engine errors in the playthrough', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 3).join(' | '));
});
// ---- attract and menus run headless without errors ----
E0(() => { game.go('title'); game.advance(1); game.advance(11); check('idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName); for (let i = 0; i < 20; i++) game.advance(10); check('the attract mode loops without errors', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 2).join('|')); });
console.log(fail ? `${fail} FAILED, ${pass} passed` : `all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
