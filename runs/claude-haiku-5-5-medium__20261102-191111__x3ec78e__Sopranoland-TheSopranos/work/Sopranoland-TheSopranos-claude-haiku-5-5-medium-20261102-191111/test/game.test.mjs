// Headless tests for every system of the game, and a full playthrough. The engine and the game run
// in Node with no screen: fixed steps, scripted input (game.input.tap / hold) and the game's debug
// handle. Run it from anywhere:   node test/game.test.mjs      (exit code 1 on any failure)
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameScript } from '../build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const ENGINE = readFileSync(path.join(ROOT, 'src', 'vendor', 'my-3d2dge.js'), 'utf8');
const GAME = gameScript({
  sourceInformation: { date: 'test' }, testingFeedback: ['a', 'b', 'c', 'd'],
  engineFeedback: ['a', 'b', 'c', 'd', 'e', 'f'], promptFeedback: ['a', 'b', 'c', 'd'],
});

// A fresh copy of the engine and the game. opts.hub: a fake AIHub client (a session).
// opts.touch: 'only' for a touch-only device.
function boot(opts = {}) {
  const ctx = { console, Promise };
  if (opts.touch) ctx.matchMedia = q => ({ matches: q.includes('coarse') && opts.touch === 'only' });
  if (opts.hub) ctx.AIHub = opts.hub;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine' });
  vm.runInContext(GAME, ctx, { filename: 'game' });
  const E = ctx.My3D2dge, game = E.current, dbg = game.debug;
  return { E, game, dbg, D: dbg.data, snap: () => dbg.snapshot(), talk: dbg.talkBox };
}

// A fake hub client: the protocol's calls, recorded. The test moves its clock and fires its events.
function fakeHub(time = -Infinity) {
  const rec = { connect: null, ready: 0, results: [], progress: [], sent: [], handlers: {} };
  let clock = time;
  const hub = {
    active: true, seeded: true, version: '1.3.0',
    connect(o) { rec.connect = o; return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Dom', color: '#e8443a' }, { id: 1, name: 'Ray', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 600000, seed: 7 }); },
    ready() { rec.ready++; },
    time() { return clock; },
    on(ev, fn) { rec.handlers[ev] = fn; return () => { delete rec.handlers[ev]; }; },
    progress(o) { rec.progress.push(o); },
    result(o) { rec.results.push(o); },
    finish() {},
    send(d, o) { rec.sent.push({ d, o }); return true; },
    rng() { return () => 0.5; },
    fail() {},
  };
  return { hub, rec, setTime: t => { clock = t; }, fire: (ev, ...a) => rec.handlers[ev] && rec.handlers[ev](...a) };
}

let passed = 0, failed = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) passed++; else { failed++; failures.push(name + (detail ? ' :: ' + detail : '')); }
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || !detail ? '' : '  (' + detail + ')'));
};
const J = v => JSON.stringify(v);
// advance in 0.1 s steps so the scenes' timers and the hub's clock keep up
const run = (game, secs) => { for (let t = 0; t < secs - 1e-9; t += .1) game.advance(.1); };
// press confirm through a talk box and any conversation after it, until nothing is open
function talkAll(game, talk, snap, max = 300) {
  for (let i = 0; i < max; i++) {
    const s = snap();
    if (!s.talk && !s.conv) return true;
    if (s.talk) { if (talk.choices) { talk.choice = 0; } game.input.tap('confirm'); game.advance(.4); } else game.advance(.2);
  }
  return false;
}
// press through a conversation's pages until its choices show, then pick choice i
function pickChoice(game, talk, snap, i, max = 60) {
  for (let n = 0; n < max && !(talk.choices && talk.i === talk.pages.length - 1); n++) { if (talk.typing) game.advance(.5); else { game.input.tap('confirm'); game.advance(.4); } }
  if (!talk.choices || talk.i !== talk.pages.length - 1) return false;
  for (let n = 0; n < 40 && talk.typing; n++) game.advance(.25);   // let the question finish typing
  talk.choice = i; game.input.tap('confirm'); game.advance(.4);
  return true;
}
// stand the hero on a cell's centre, and let the world read it
function stand(dbg, game, D, cell) { const w = dbg.world(); const c = w.map.center(cell[0], cell[1]); dbg.teleport(c[0], c[1]); game.advance(.1); return c; }
const tick = () => new Promise(r => setImmediate(r));   // the hub's promise resolves on the next turn
const distTo = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ================================================================================================
// 1 · Scenes, the title and the attract demo
// ================================================================================================
{
  const { game, snap } = boot();
  game.advance(1);
  check('the title is the first scene', snap().scene === 'title', J(snap().scene));
  game.input.tap('confirm'); run(game, .8);
  check('NEW GAME opens the play scene with the intro talk', snap().scene === 'play' && snap().conv === 'intro' && snap().talk, J(snap()));
  check('the first objective is on the chapter toast', (snap().toast || '').includes('COLLECTIONS'), J(snap().toast));
  check('no errors in the first seconds of play', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
}
{
  // ten seconds idle on the title starts the attract demo; any input ends it
  const { game, snap } = boot();
  game.advance(1);
  run(game, 9);
  check('the title waits before the ten seconds are up', snap().scene === 'title', J(snap().scene));
  run(game, 2.5);
  check('ten seconds idle starts the attract demo', snap().scene === 'attract' && snap().attract === true, J(snap().scene));
  run(game, 3);
  check('the attract demo plays on its own', snap().hero !== null && snap().chapter >= 1, J(snap()));
  game.input.tap('confirm'); run(game, 1);
  check('any input ends the demo and goes back to the title', snap().scene === 'title' && snap().attract === false, J(snap().scene));
}
{
  // the demo really shows the whole story and then goes back to the title, with no error
  const { game, snap } = boot();
  game.advance(1); run(game, 10.5);
  const seen = new Set();
  let t = 0;
  while (t < 600 && ['attract', 'session'].includes(snap().scene)) { game.advance(.1); seen.add(snap().chapter); t += .1; }
  check('the attract demo goes through every chapter', [1, 2, 3, 4, 5].every(c => seen.has(c)), 'chapters seen: ' + [...seen].join(','));
  check('the attract demo finishes Ma’s door', snap().done === true, J(snap()));
  run(game, 6);
  check('the attract demo ends at the title', snap().scene === 'title', J(snap().scene));
  check('no errors during the attract demo', game.errors.length === 0, game.errors.map(e => (e.stack || e.message)).join(' | ').slice(0, 800));
}

// ================================================================================================
// 2 · The map, the zones and the walls
// ================================================================================================
{
  const { game, dbg, snap, D } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5);
  const b = (() => { const s = snap(); return s; })();
  check('the hero starts at home', snap().zone === 'home', snap().zone);
  check('the zones name the places by cell', D.zoneAt(8 * 16, 6 * 16) === 'home' && D.zoneAt(27 * 16, 6 * 16) === 'deli' && D.zoneAt(40 * 16, 6 * 16) === 'diner' && D.zoneAt(52 * 16, 6 * 16) === 'lounge' && D.zoneAt(37 * 16, 28 * 16) === 'yard' && D.zoneAt(50 * 16, 30 * 16) === 'warehouse' && D.zoneAt(10 * 16, 30 * 16) === 'lot' && D.zoneAt(30 * 16, 19 * 16) === 'street' && D.zoneAt(27 * 16, 27 * 16) === 'vashti', 'zone table');
  const w = dbg.world();
  check('the town rows are 40 rows of 60 cells', D.buildTownRows().length === 40 && D.buildTownRows().every(r => r.length === 60));
  // the house wall stops the hero: stand in the yard below the house and walk up into it
  const below = w.map.center(8, 13);
  dbg.teleport(below[0], below[1] + 8);
  game.input.hold('up', true); run(game, 1.5); game.input.hold('up', false);
  check('a wall stops the hero (the house)', snap().hero[1] >= 180, J(snap().hero));
}
{
  // the walk: the hero moves on the stick and the keys, and the Mover's controls are used
  const { game, snap, dbg } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, game.debug.talkBox, snap);
  const x0 = snap().hero[0];
  game.input.hold('right', true); run(game, .8); game.input.hold('right', false);
  check('the keys walk the hero', snap().hero[0] > x0 + 20, J([x0, snap().hero]));
}

// ================================================================================================
// 3 · The people, the talk and the chapters
// ================================================================================================
{
  const { game, dbg, snap, talk } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, talk, snap);
  check('the intro talk closes and the play goes on', !snap().talk && !snap().conv, J(snap()));
  stand(dbg, game, null, [27, 11]); game.input.tap('interact'); run(game, .3);
  check('Sal Ricci’s talk opens when the hero interacts', snap().conv === 'ricci', J(snap()));
  talkAll(game, talk, snap);
  check('Sal Ricci pays $800', snap().cash === 800 && snap().got.ricci === true, J(snap()));
  stand(dbg, game, null, [40, 11]); game.input.tap('interact'); run(game, .3); talkAll(game, talk, snap);
  check('Dorothy pays $450', snap().cash === 1250 && snap().got.dorothy === true, J(snap()));
  stand(dbg, game, null, [51, 11]); game.input.tap('interact'); run(game, .3); talkAll(game, talk, snap);
  check('Tina pays $1,500 and the chapter moves on to the sit-down', snap().cash === 2750 && snap().chapter === 2, J(snap()));
  // the interaction stays quiet away from people
  stand(dbg, game, null, [20, 30]); const before = snap().conv; game.input.tap('interact'); run(game, .3);
  check('the interaction does nothing with nobody near', snap().conv === before && !snap().talk, J(snap()));
}
{
  // a choice moves the respect (Big Lou's sit-down)
  const { game, dbg, snap, talk } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, talk, snap);
  dbg.chapter(2);
  stand(dbg, game, null, [51, 14]); game.input.tap('interact'); run(game, .3);
  check('Big Lou opens his talk', snap().conv === 'lou', J(snap()));
  check('the talk offers the three answers', pickChoice(game, talk, snap, 1) === true, '');
  check('the flag of the second answer is set (the Gus line)', snap().flags.gus === true, J(snap().flags));
  check('the second answer adds 2 respect', snap().respect === 2, J(snap().respect));
  talkAll(game, talk, snap);
  check('Big Lou’s talk ends and the chapter moves on to the session', snap().chapter === 3 && snap().conv === null, J(snap()));
}
{
  // Vashti's session: a calm answer lowers the stress, an agitated one raises it
  const { game, dbg, snap, talk } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, talk, snap);
  dbg.chapter(3); dbg.give('stress', 50);
  dbg.startConv('vashti', () => dbg.give('flags', { done: true }));
  run(game, .3);
  pickChoice(game, talk, snap, 0);
  check('the calm answer lowers the stress by 6', snap().stress === 44, J(snap().stress));
  pickChoice(game, talk, snap, 0);
  check('the second question takes another calm answer', snap().stress === 32, J(snap().stress));
  check('the conversation runs to its end', talkAll(game, talk, snap) && snap().conv === null, J(snap()));
}
{
  // every conversation’s nodes resolve, and the text uses glyphs the font has
  const { D } = boot();
  const bad = [];
  for (const [id, c] of Object.entries(D.CONVS)) {
    if (!c.nodes[c.start]) bad.push(id + ':start');
    for (const [nid, n] of Object.entries(c.nodes)) {
      if (n.next && !c.nodes[n.next]) bad.push(id + '.' + nid + '->' + n.next);
      for (const ch of n.choices || []) if (ch.next && !c.nodes[ch.next]) bad.push(id + '.' + nid + '=>' + ch.next);
      if (!n.text || !n.text.length) bad.push(id + '.' + nid + ':text');
      if (!D.VOICES[n.who]) bad.push(id + '.' + nid + ':voice(' + n.who + ')');
    }
  }
  check('every conversation links to real nodes, with a voice for each speaker', bad.length === 0, bad.join(' '));
  const odd = [...new Set(J(D.CONVS).match(/[^\x00-\x7F]/g) || [])].filter(c => !'•×♥★←→↑↓♪▸©'.includes(c));
  check('conversation text has only glyphs the engine font draws', odd.length === 0, J(odd));
}

// ================================================================================================
// 4 · Combat, the pistol, the hero’s health, and the checkpoint
// ================================================================================================
{
  const { game, dbg, snap, E } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, game.debug.talkBox, snap);
  dbg.chapter(4); run(game, .1);
  const yard = stand(dbg, game, null, [37, 30]); run(game, .5); talkAll(game, game.debug.talkBox, snap);
  const w = dbg.world();
  check('entering the yard spawns the crew and Gus', snap().boss !== null && snap().foes >= 4, J(snap()));
  const hero = w.hero;
  const crew = w.foes.find(f => !f.dead && f.kind === 'crew');
  // the bat: a crew member just in front of the hero
  hero.facing = 0;
  crew.x = hero.x + 14; crew.y = hero.y; crew.vx = crew.vy = 0; crew.alert = 0;
  const hp0 = crew.hp;
  for (let i = 0; i < 5; i++) { game.input.tap('attack'); run(game, .45); if (crew.dead) break; }
  check('the bat hits a crew member in front', crew.hp < hp0 || crew.dead, 'hp ' + hp0 + ' -> ' + crew.hp);
  // the pistol: a shell is used and a shot down the line hits
  w.foes = [];   // (only the pistol's target is in the yard for these shots: the boss would be the nearest)
  const f2 = new dbg.data.Foe('crew', dbg.data.LOOKS.benny, { x: 0, y: 0 }, { name: 'TARGET' });
  f2.hp = 60; w.foes.push(f2);   // (the bat's target is out of the list: it would be the nearest)
  f2.x = hero.x + 70; f2.y = hero.y; f2.vx = f2.vy = 0; f2.alert = 0; f2.hp = 60;
  hero.facing = 0;
  const ammo0 = snap().ammo;
  game.input.tap('use'); run(game, .7);
  check('the pistol costs a shell', snap().ammo === ammo0 - 1, J(snap().ammo));
  check('the shot hits the foe in its line', f2.hp < 60 || f2.dead, 'hp ' + f2.hp);
  // the hero takes a hit: an enemy bullet hurts; a guard takes less
  dbg.give('hp', 100); hero.iframes = 0;
  w.shots.fire({ x: hero.x + 20, y: hero.y, z: 14, vx: -200, vy: 0, vz: 0, r: 2, team: 'enemy', dmg: 18, life: 2 });
  run(game, .4);
  check('an enemy bullet hurts the hero', snap().hp === 82, J(snap().hp));
  hero.iframes = 0; dbg.give('hp', 100);
  game.input.hold('block', true);
  w.shots.fire({ x: hero.x + 20, y: hero.y, z: 14, vx: -200, vy: 0, vz: 0, r: 2, team: 'enemy', dmg: 18, life: 2 });
  run(game, .4); game.input.hold('block', false);
  check('guarding takes less damage (30 percent)', snap().hp >= 94 && snap().hp < 100, J(snap().hp));
  // a death sends the hero back to the chapter’s checkpoint and counts it
  dbg.give('hp', 3); hero.iframes = 0; const d0 = snap().deaths;
  w.shots.fire({ x: hero.x + 20, y: hero.y, z: 14, vx: -200, vy: 0, vz: 0, r: 2, team: 'enemy', dmg: 18, life: 2 });
  run(game, .4);
  check('a death counts and restores 70 health', snap().deaths === d0 + 1 && snap().hp === 70, J(snap()));
  const cp = w.map.center(30, 19);
  check('a death sends the hero back to the chapter 4 checkpoint', Math.abs(snap().hero[0] - cp[0]) < 3 && Math.abs(snap().hero[1] - cp[1]) < 3, J([snap().hero, cp]));
}
{
  // a civilian who is hit: the heat rises, and the others run
  const { game, dbg, snap, E } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, game.debug.talkBox, snap);
  const w = dbg.world();
  const civ = w.civs[0];
  w.hero.facing = Math.atan2(civ.y - w.hero.y, civ.x - w.hero.x);
  civ.x = w.hero.x + 14; civ.y = w.hero.y; civ.vx = civ.vy = 0;
  game.input.tap('attack'); run(game, .5);
  for (let i = 0; i < 3; i++) { game.input.tap('attack'); run(game, .45); }
  check('hitting a civilian raises the heat', snap().heat > 0, J(snap().heat));
  check('the civilian runs', civ.flee > 0 || civ.dead, J(civ.flee));
}
{
  // pickups: a cannoli heals and calms; the shells come in boxes; a duck counts
  const { game, dbg, snap, D } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, game.debug.talkBox, snap);
  const w = dbg.world();
  dbg.give('hp', 40); dbg.give('stress', 30);
  dbg.teleport(w.cannoli[0].x, w.cannoli[0].y); run(game, .3);
  check('a cannoli heals 25 and calms 10', snap().hp === 65 && snap().stress === 20 && snap().cannoli === 1, J(snap()));
  dbg.teleport(w.ammo[0].x, w.ammo[0].y); run(game, .3);
  check('a box of shells adds 8', snap().ammo === 20, J(snap().ammo));
  dbg.teleport(w.ducks[0].x, w.ducks[0].y); run(game, .3);
  check('a duck counts toward the pool', snap().ducks === 1, J(snap().ducks));
}
{
  // heat and panic: a hot street raises the stress; at 100 the hero panics and can't fight
  const { game, dbg, snap } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, game.debug.talkBox, snap);
  dbg.chapter(5); dbg.give('heat', 90); run(game, 2);
  check('a hot street raises the stress', snap().stress > 0, J(snap().stress));
  dbg.give('stress', 100); run(game, .2);
  check('a stress of 100 is a panic (the toast says so)', (snap().toast || '').includes('PANIC'), J(snap().toast));
  const w = dbg.world();
  const n = w.foes.length;
  game.input.tap('attack'); run(game, .3);
  check('a panic stops the bat', !w.combo.busy, J(w.combo.busy));
}

// ================================================================================================
// 5 · The chapters, from the yard to Ma’s door (standalone)
// ================================================================================================
{
  const { game, dbg, snap, talk } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, talk, snap);
  dbg.chapter(5); run(game, .2);
  const w = dbg.world();
  run(game, 11);
  check('chapter 5 sends Feds onto the street', w.foes.some(f => f.kind === 'fed'), J(w.foes.length));
  const home = w.map.center(8, 13);
  dbg.teleport(home[0], home[1]); run(game, .2); game.input.tap('interact'); run(game, .4);
  check('Ma’s door starts her talk', snap().conv === 'home', J(snap()));
  talkAll(game, talk, snap); run(game, 1.2);
  check('Ma’s talk ends the story (standalone: the end screen)', snap().done === true && snap().scene === 'end', J(snap()));
}

// ================================================================================================
// 6 · Settings, glyphs, the touch-only rule and the save slots
// ================================================================================================
{
  const { game } = boot();
  check('the stick inversions are settings', !!game.settings.spec('invertStickX') && !!game.settings.spec('invertStickY'));
  check('the button symbols default to PlayStation', game.settings.glyphs === 'playstation' && game.input.glyphs === 'playstation', J([game.settings.glyphs, game.input.glyphs]));
  check('the camera view is on V and the right stick press', game.input.map.view.includes('KeyV') && game.input.map.view.includes('Pad11'), J(game.input.map.view));
  check('the bat prompt names the key or button in use', typeof game.input.label('attack') === 'string' && game.input.label('attack').length > 0, J(game.input.label('attack')));
}
{
  // the stick helper inverts only what the player asked for, and only on a gamepad
  const { game, dbg } = boot();
  game.input.move = () => [0.6, -0.4];
  game.input.lastDevice = 'gamepad';
  check('a gamepad stick reads normally by default', J(dbg.stick()) === J([0.6, -0.4]), J(dbg.stick()));
  game.settings.set('invertStickX', true);
  check('the left-right inversion flips x', J(dbg.stick()) === J([-0.6, -0.4]), J(dbg.stick()));
  game.settings.set('invertStickY', true);
  check('the up-down inversion flips y as well', J(dbg.stick()) === J([-0.6, 0.4]), J(dbg.stick()));
  game.input.lastDevice = 'keyboard';
  check('the keyboard is not inverted', J(dbg.stick()) === J([0.6, -0.4]), J(dbg.stick()));
  game.settings.set('invertStickX', false); game.settings.set('invertStickY', false);
}
{
  // a touch-only device gets no touch controls (the title says controller or keyboard)
  const { game } = boot({ touch: 'only' });
  check('a touch-only device has its touch controls off', game.input.touchEnabled === false, J(game.input.touchEnabled));
  const { game: g2 } = boot();
  check('a device with a keyboard keeps touch available', g2.input.touchEnabled === true, J(g2.input.touchEnabled));
}
{
  // the save slots: a save writes the run; a load brings it back
  const { game, dbg, snap, talk } = boot();
  game.advance(1); game.input.tap('confirm'); run(game, .5); talkAll(game, talk, snap);
  dbg.give('cash', 1234); dbg.give('respect', 3);
  check('the save slot takes the run', game.saves.save(0) === true, '');
  dbg.give('cash', 0); dbg.give('respect', 0);
  const latest = game.saves.latest();
  check('the save is the latest run', !!latest && latest.slot === 0, J(latest));
  game.saves.load(0); run(game, 1.2);
  check('loading brings back the cash and the respect', snap().cash === 1234 && snap().respect === 3 && snap().scene === 'play', J(snap()));
}

// ================================================================================================
// 7 · The hub session (AI Hub Session Protocol v1, ghost mode)
// ================================================================================================
{
  const { hub, rec, setTime, fire } = fakeHub(-Infinity);
  const { game, snap } = boot({ hub });
  await tick(); game.advance(1); run(game, .3);
  check('a session opens straight into the round (no title)', snap().scene === 'play', J(snap().scene));
  check('the session connects in ghost mode with 1 to 4 seats', rec.connect && rec.connect.mode === 'ghost' && rec.connect.seats[0] === 1 && rec.connect.seats[1] === 4, J(rec.connect));
  check('the round calls ready once the world is built', rec.ready === 1, 'ready ' + rec.ready);
  check('the session has no quit to title (the hub ends rounds)', game.o.menu && game.o.menu.quit === false, J(game.o.menu && game.o.menu.quit));
  check('before the start the round does not play', snap().hero && !snap().talk && snap().scene === 'play', J(snap()));
  const x0 = snap().hero[0];
  game.input.hold('right', true); run(game, .8); game.input.hold('right', false);
  check('before the start the hero does not move', snap().hero[0] === x0, J([x0, snap().hero]));
  setTime(0); fire('start', { in: 3000 }); run(game, .2);
  const x1 = snap().hero[0];
  game.input.hold('right', true); run(game, .8); game.input.hold('right', false);
  check('after the start the hero plays', snap().hero[0] !== x1, J([x1, snap().hero]));
  run(game, 2);
  check('the copy sends its place to the others (ghost mode, unreliable)', rec.sent.length > 5 && rec.sent.every(s => s.o && s.o.reliable === false), 'sent ' + rec.sent.length);
  check('the progress reaches the hub about once a second', rec.progress.length >= 1, 'progress ' + rec.progress.length);
  fire('message', { x: 150, y: 220, f: 0, vx: 0, vy: 0, zone: 'home' }, 1);
  run(game, .3);
  check('another copy’s place is kept, with no error', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  fire('leave', { id: 1, reason: 'left' }); run(game, .2);
  check('a player leaving is handled', game.errors.length === 0, '');
  fire('time-up', { graceMs: 5000 }); run(game, .2);
  check('time-up reports a result once, with the score', rec.results.length === 1 && typeof rec.results[0].score === 'number', J(rec.results));
  fire('time-up', { graceMs: 5000 }); run(game, .2);
  check('a second time-up does not report again', rec.results.length === 1, J(rec.results.length));
  const sent0 = rec.sent.length;
  fire('end', { reason: 'finished', standings: [] }); run(game, .6);
  check('after the end nothing more is sent', rec.sent.length === sent0, 'sent ' + (rec.sent.length - sent0));
  check('no errors in a session', game.errors.length === 0, game.errors.map(e => (e.stack || e.message)).join(' | ').slice(0, 600));
}
{
  // a session round where the hero gets to Ma's door: one result with the time, then the round waits
  const { hub, rec, setTime, fire } = fakeHub(0);
  const { game, snap, dbg, talk } = boot({ hub });
  await tick(); game.advance(1); run(game, .2);
  setTime(10000); fire('start', { in: 0 }); run(game, .2);
  dbg.chapter(5); run(game, .2);
  const w = dbg.world(), home = w.map.center(8, 13);
  dbg.teleport(home[0], home[1]); run(game, .2); game.input.tap('interact'); run(game, .4); talkAll(game, talk, snap); run(game, .5);
  check('the round reports its time when the last chapter is done', rec.results.length === 1 && typeof rec.results[0].time === 'number' && rec.results[0].time > 0, J(rec.results));
  check('after the result the round waits and the scene stays', snap().scene === 'play' && snap().done === true && snap().frozen === true, J(snap()));
  check('no errors at the end of the round', game.errors.length === 0, game.errors.map(e => (e.stack || e.message)).join(' | ').slice(0, 600));
}

// ================================================================================================
// 8 · The About pages read the exit interview
// ================================================================================================
{
  const exitPath = path.join(ROOT, '..', 'exit-interview.json');
  if (existsSync(exitPath)) {
    let data = null, err = '';
    try { data = JSON.parse(readFileSync(exitPath, 'utf8')); } catch (e) { err = e.message; }
    check('exit-interview.json parses as JSON', !err, err);
    const fields = ['date', 'source', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    check('the interview answers every source field', !!data && fields.every(f => typeof data.sourceInformation[f] === 'string' && data.sourceInformation[f].length > 0));
    check('the interview answers every feedback question (4, 6 and 4)', !!data && data.testingFeedback.length === 4 && data.engineFeedback.length === 6 && data.promptFeedback.length === 4);
  } else {
    check('exit-interview.json is written', false, 'not written yet');
  }
}

// ================================================================================================
// 9 · A full playthrough: keys and mouse, from NEW GAME to the credits
// ================================================================================================
{
  const { game, dbg, snap, talk, E } = boot();
  game.advance(1);
  game.input.tap('confirm'); run(game, .6);                                      // NEW GAME
  talkAll(game, talk, snap);                                                     // the intro
  stand(dbg, game, null, [27, 11]); game.input.tap('interact'); run(game, .3); talkAll(game, talk, snap);   // Sal Ricci
  stand(dbg, game, null, [40, 11]); game.input.tap('interact'); run(game, .3); talkAll(game, talk, snap);   // Dorothy
  stand(dbg, game, null, [51, 11]); game.input.tap('interact'); run(game, .3); talkAll(game, talk, snap);   // Tina
  check('the collections are done and the sit-down is next', snap().chapter === 2 && snap().cash === 2750, J(snap()));
  stand(dbg, game, null, [51, 14]); game.input.tap('interact'); run(game, .3);   // Big Lou
  pickChoice(game, talk, snap, 0);
  talkAll(game, talk, snap);
  check('the sit-down is done and the session is next', snap().chapter === 3, J(snap()));
  stand(dbg, game, null, [27, 23]); game.input.tap('interact'); run(game, .5);   // Dr. Vashti's door
  check('the session room opens', snap().scene === 'session', J(snap().scene));
  pickChoice(game, talk, snap, 2); pickChoice(game, talk, snap, 0); pickChoice(game, talk, snap, 0); pickChoice(game, talk, snap, 0);
  talkAll(game, talk, snap);
  check('the session ends back in the play scene on chapter 4', snap().scene === 'play' && snap().chapter === 4, J(snap()));
  // the yard: the bat and the pistol until Gus is down
  const w = dbg.world();
  stand(dbg, game, null, [37, 30]); run(game, .4);
  let frames = 0;
  while (!snap().bossDown && frames < 2500 && snap().scene === 'play') {
    const hero = w.hero;
    const foe = w.foes.filter(f => !f.dead && f.kind !== 'civ').sort((a, b) => distTo(hero, a) - distTo(hero, b))[0];
    if (talk.open) game.input.tap('confirm');
    else if (foe) {
      hero.facing = Math.atan2(foe.y - hero.y, foe.x - hero.x);
      if (distTo(hero, foe) > 34) { hero.x += Math.cos(hero.facing) * 2.5; hero.y += Math.sin(hero.facing) * 2.5; }
      if (frames % 4 === 0) game.input.tap('attack');
      if (frames % 9 === 0 && snap().ammo > 0 && distTo(hero, foe) > 40) game.input.tap('use');
    }
    if (snap().hp < 70) dbg.give('hp', 100);
    game.advance(.1); frames++;
  }
  check('the yard fight puts Gus down', snap().bossDown === true, J(snap()));
  check('the Feds come once Gus is down (chapter 5)', snap().chapter === 5, J(snap()));
  // the Feds, and the walk home to Ma
  const home = w.map.center(8, 13);
  let steps = 0;
  while (!snap().done && steps < 3000 && snap().scene === 'play') {
    const hero = w.hero;
    if (talk.open) { game.input.tap('confirm'); game.advance(.2); steps++; continue; }
    const fed = w.foes.filter(f => !f.dead && f.kind === 'fed').sort((a, b) => distTo(hero, a) - distTo(hero, b))[0];
    if (fed && distTo(hero, fed) < 120) { hero.facing = Math.atan2(fed.y - hero.y, fed.x - hero.x); if (steps % 9 === 0 && snap().ammo > 0) game.input.tap('use'); }
    const dx = home[0] - hero.x, dy = home[1] - hero.y, dd = Math.hypot(dx, dy) || 1;
    if (dd > 24) { hero.x += dx / dd * 2.2; hero.y += dy / dd * 2.2; }
    else game.input.tap('interact');
    if (snap().hp < 70) dbg.give('hp', 100);
    game.advance(.1); steps++;
  }
  check('Ma’s house ends the story', snap().done === true, J(snap()));
  talkAll(game, talk, snap); run(game, 1.2);
  check('the end screen waits after the story', snap().scene === 'end', J(snap().scene));
  game.input.tap('confirm'); run(game, .5);
  check('the About pages open from the end screen', snap().scene === 'credits', J(snap().scene));
  for (let i = 0; i < 4; i++) { game.input.tap('right'); run(game, .3); }
  check('the About pages turn through the sections', snap().scene === 'credits', J(snap().scene));
  game.input.tap('cancel'); run(game, .5);
  check('the playthrough goes back to the end screen without an error', game.errors.length === 0 && snap().scene === 'end', game.errors.map(e => (e.stack || e.message)).join(' | ').slice(0, 800));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) { console.log('failures:\n - ' + failures.join('\n - ')); process.exit(1); }
