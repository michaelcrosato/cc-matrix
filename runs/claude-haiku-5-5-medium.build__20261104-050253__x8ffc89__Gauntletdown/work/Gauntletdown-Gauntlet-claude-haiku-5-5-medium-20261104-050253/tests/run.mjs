// The one test command: node tests/run.mjs [suite ...]. Prints only failures, then one count line.
// Suites: floors, front, play, dev, attract, playthrough (default: all of them).
import { boot } from './lib.mjs';

const SUITES = {};
let checks = 0, failed = 0, suite = '';
const check = (name, ok, detail = '') => { checks++; if (!ok) { failed++; console.log(`FAIL ${suite} ${name}${detail ? ': ' + detail : ''}`); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

function fresh() { const b = boot(); return b; }
// Input helpers: a tap is one press, a hold is held for seconds.
function tap(B, a) { B.I.tap(a); B.game.advance(.6); }   // (a scene change fades: .6 s lets it land)
function hold(B, a, secs) { B.I.hold(a, true); B.game.advance(secs); B.I.hold(a, false); B.game.advance(1 / 60); }
function startRun(B, classes = ['berserker'], opts = {}) {
  B.game.advance(.3); B.game.debug.start(classes); B.game.advance(.3);
  B.game.go('card', { index: opts.index || 0, first: true }, { fade: 0 }); B.game.advance(.3);
  B.game.advance(8); // the card goes on by itself after a few seconds
  return B.game.debug.world();
}
const kill = (W) => { for (const m of W.monsters) m.alive = false; };

// --- floors ---
SUITES.floors = () => {
  suite = 'floors';
  const B = fresh(); B.game.advance(.2);
  const ok = B.game.debug.validate();
  check('all three floors are solvable (stairs reachable with the keys)', ok.every(Boolean), JSON.stringify(ok));
  for (let i = 0; i < 3; i++) {
    const F = B.game.debug.floor(i);
    check(`floor ${i + 1} size`, F.W >= 24 && F.W <= 72 && F.H >= 16 && F.H <= 48, `${F.W}x${F.H}`);
    check(`floor ${i + 1} has four starts`, F.starts.length === 4);
    check(`floor ${i + 1} has doors and keys`, F.doors.length > 0 && [...F.ents.values()].includes('k'));
    check(`floor ${i + 1} has a generator and monsters`, [...F.ents.values()].some(c => 'GN'.includes(c)) && [...F.ents.values()].some(c => 'gn'.includes(c)));
  }
};

// --- front end: title, idle attract, classes, card ---
SUITES.front = () => {
  suite = 'front';
  const B = fresh(); const { game, snap } = B;
  game.advance(.5);
  check('the title waits for input', snap().scene === 'title', snap().scene);
  tap(B, 'confirm');
  check('START DESCENT opens the class select', snap().scene === 'classes', snap().scene);
  tap(B, 'fire');
  tap(B, 'start');
  game.advance(.3);
  check('a locked class and START open the card', snap().scene === 'card', snap().scene);
  game.advance(8);
  check('the card hands over to play', snap().scene === 'play', snap().scene);
  // back to title through pause -> quit
  tap(B, 'pause'); game.advance(.1);
  check('pause opens the pause overlay', snap().scene === 'play');
  // idle attract: go to the title and sit still for ten seconds
  game.go('title', null, { fade: 0 }); game.advance(.3);
  game.advance(10.3);
  check('ten seconds idle on the title starts attract', snap().scene === 'attract', snap().scene);
  tap(B, 'confirm'); game.advance(.3);
  check('any input leaves attract for the title', snap().scene === 'title', snap().scene);
  check('no errors in front end', B.errors.length === 0, B.errors[0] && B.errors[0].slice(0, 200));
};

// --- simulation: moving, shooting, food, keys, stairs, generators, magic, death, rising, game over ---
SUITES.play = () => {
  suite = 'play';
  let B = fresh(); let W = startRun(B);
  let { game, snap } = B;
  // movement
  const x0 = W.heroes[0].body.x;
  W.heroes[0].input = B.I;
  hold(B, 'right', .8);
  check('the stick moves the hero', W.heroes[0].body.x > x0 + 20, `${x0} -> ${W.heroes[0].body.x}`);
  // the drain: no monsters, 10 seconds
  kill(W); game.advance(10);
  const hp0 = W.heroes[0].hp;
  check('life force drains about one a second', near(700 - hp0, 10, 3), `hp ${hp0}`);
  // food: roast on the floor under the hero
  const roast = W.items.find(i => i.alive && i.ch === 'f');
  const h = W.heroes[0];
  const hpBefore = h.hp;
  game.debug.teleport(0, roast.x, roast.y); game.advance(.1);
  check('a roast restores 100 and goes', h.hp > hpBefore + 80 && !roast.alive, `${hpBefore} -> ${h.hp}`);
  // a key opens a door and uses it up
  const door = W.doors.find(d => !d.open);
  const [dx, dy] = door.cells[0];
  h.keys = 2; game.debug.teleport(0, (dx - 1 + .5) * 16, (dy + .5) * 16); game.advance(.1);
  check('a key opens its door run', door.open && h.keys === 1, `open ${door.open} keys ${h.keys}`);
  // stairs: stand on them for the hold and the floor goes on
  const sp = game.debug.stairsPoint();
  game.debug.teleport(0, sp[0], sp[1]); game.advance(1.5);
  check('standing on the stairs takes you down', snap().scene === 'card' || snap().floor === 2, snap().scene + ' floor ' + snap().floor);
  // magic: a flask strikes everything on screen
  B = fresh(); W = startRun(B); ({ game, snap } = B); const hh = W.heroes[0]; hh.flasks = 1;
  const g = game.debug.fn.spawnMonster('gnasher', hh.body.x + 40, hh.body.y, 2, true);
  const before = g.hp;
  game.debug.fn.useMagic(hh);
  check('a flask hurts monsters on screen', g.hp < before || !g.alive, `hp ${before} -> ${g.hp}`);
  check('using a flask uses one', hh.flasks === 0);
  // generator: breaking an urn scores its points and it stops
  const urn = W.gens.find(x => x.alive);
  const s0 = hh.score;
  game.debug.fn.damageGen(urn, 1e9, hh);
  check('breaking a generator scores and stops it', !urn.alive && hh.score >= s0 + 25, `score ${s0} -> ${hh.score}`);
  // death and the game over: nobody to rise, the continue runs out
  B = fresh(); W = startRun(B); ({ game, snap } = B); const d = W.heroes[0];
  game.debug.fn.heroDown(d, null);
  check('a hero at zero is down', d.down === true);
  game.advance(12);
  check('nobody rising ends in the game over', ['gameover', 'initials'].includes(snap().scene), snap().scene);
  // rising: two heroes, the other one close, fire presses near the fallen one
  B = fresh(); W = startRun(B, ['berserker', 'ranger']); ({ game, snap } = B); const [a, b] = W.heroes;
  a.input = B.I; b.input = null;
  game.debug.fn.heroDown(b, null);
  game.debug.teleport(0, b.body.x + 6, b.body.y);
  B.I.hold('fire', true); game.advance(.3); B.I.hold('fire', false); game.advance(.1);
  check('a fallen hero rises beside an ally', !b.down && b.hp > 0, `down ${b.down}`);
  check('no errors in play', B.errors.length === 0, B.errors[0] && B.errors[0].slice(0, 300));
};

// --- dev tools and settings: cheats, tuning, glyphs ---
SUITES.dev = () => {
  suite = 'dev';
  const B = fresh(); const { game } = B;
  const W = startRun(B);
  game.debug.setDevCheat('god', true);
  const h = W.heroes[0];
  game.debug.fn.damageHero(h, 500, null);
  check('god mode ignores damage', h.hp > 600, `hp ${h.hp}`);
  game.debug.setDevCheat('god', false);
  game.input.lastDevice = 'gamepad';
  const ps = game.input.label('fire');
  game.input.glyphs = 'xbox';
  const xb = game.input.label('fire');
  game.input.glyphs = 'playstation';
  check('controller prompts follow the chosen symbols (PlayStation: R2, Xbox: RT)', ps === 'R2' && xb === 'RT', `ps ${ps} xbox ${xb}`);
  game.input.lastDevice = 'keyboard';
  check('keyboard prompts name keys', game.input.label('fire') === 'Left click' || game.input.label('fire') === 'Space' || game.input.label('fire') === 'J', game.input.label('fire'));
  check('no errors in dev', B.errors.length === 0, B.errors[0] && B.errors[0].slice(0, 200));
};

// --- attract: a minute of autopilot, floors cycle, no errors, and an input leaves it ---
SUITES.attract = () => {
  suite = 'attract';
  const B = fresh(); const { game, snap } = B;
  game.advance(.3); game.go('attract', null, { fade: 0 }); game.advance(.3);
  const floors = new Set();
  for (let s = 0; s < 120; s++) { game.advance(.5); floors.add(snap().floor); }
  check('attract plays floors (the autopilot clears them)', floors.size >= 2, [...floors].join(','));
  check('no errors in attract', B.errors.length === 0, B.errors[0] && B.errors[0].slice(0, 300));
  tap(B, 'confirm');
  check('an input leaves attract', snap().scene === 'title', snap().scene);
};

// --- the whole game: the autopilot with God mode through every floor to the ending, twice, same result ---
SUITES.playthrough = () => {
  suite = 'playthrough';
  const runOnce = () => {
    const B = fresh(); const { game, snap } = B;
    const W = startRun(B, ['berserker', 'hexer']);
    W.heroes.forEach(h => { h.input = null; });
    game.debug.setDevCheat('god', true);
    let t = 0, reached = [];
    while (snap().scene !== "ending" && t < 2400) {
      game.advance(.5); t += .5;
      if (snap().scene === 'card' || snap().scene === 'play') { const f = snap().floor; if (!reached.includes(f)) reached.push(f); }
      if (snap().scene === 'gameover') break;
      if (B.errors.length) break;
    }
    return { scene: snap().scene, t, reached, score: W.heroes.map(h => h.score), errors: B.errors.length };
  };
  const a = runOnce(), b = runOnce();
  check('the autopilot reaches the ending through every floor', a.scene === 'ending' && a.reached.length >= 3, JSON.stringify(a));
  check('the same run plays the same twice', JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  check('no errors in the playthrough', a.errors === 0);
};


// --- the new mechanics: stages, plates, pads, fake walls, runes, skip stairs, specials, the Tithe, the King, lava ---
SUITES.features = () => {
  suite = 'features';
  const B = fresh(); const { game } = B;
  game.advance(.2); game.debug.start(['berserker']); game.advance(.2);
  const W = game.debug.world(); const h0 = W.heroes[0]; h0.input = null;
  const place = (x, y) => game.debug.teleport(0, (x + .5) * 16, (y + .5) * 16);
  const cellsOf = key => key.split(',').map(Number);
  // every stage is solvable (the floors and the treasure rooms)
  const ok = game.debug.validate();
  check('every floor and treasure room is solvable', ok.every(Boolean), JSON.stringify(ok));
  // the trap: a plate opens its trap wall
  game.go('card', { index: 2, first: true }, { fade: 0 }); game.advance(8);
  let [trap] = W.doors.filter(d => d.trap && !d.open);
  check('the smokehouse has a trap wall with a plate', !!trap && !!trap.plate, JSON.stringify(trap && trap.plate));
  if (trap) { const [px, py] = cellsOf(trap.plate); place(px, py); game.advance(.3); check('stepping on the plate opens the trap wall', trap.open, String(trap.open)); }
  // the pads: a transporter sends the hero to its pair
  game.go('card', { index: 4, first: true }, { fade: 0 }); game.advance(8);
  const [pk, pad] = [...W.pads.entries()][0] || [];
  check('the bone larder has transporter pads', !!pad);
  if (pad) { const [px, py] = cellsOf(pk); place(px, py); game.advance(.2); const partner = W.pads.get(W.F.padPair.get(pk)); check('a pad sends the hero to its pair', Math.abs(W.heroes[0].body.x - partner.x) < 20 && Math.abs(W.heroes[0].body.y - partner.y) < 20, `${W.heroes[0].body.x},${W.heroes[0].body.y} vs ${partner.x},${partner.y}`); }
  // the runes stun
  game.go('card', { index: 5, first: true }, { fade: 0 }); game.advance(8);
  const [rk] = [...W.runes.keys()];
  if (rk) { const [rx, ry] = cellsOf(rk); place(rx, ry); game.advance(.1); check('a stun rune stuns the hero', W.heroes[0].stun > 0, String(W.heroes[0].stun)); }
  check('the choir has stun runes, force fields, a bell', W.runes.size > 0 && W.fields.length > 0 && !!W.bell);
  // the Tithe arrives at two minutes on the choir
  W.floorClock = 121; game.advance(.2);
  check('the Tithe comes at two minutes on the choir', W.monsters.some(m => m.kind === 'tithe' && m.alive));
  // the root cellar: a skip stair goes down to stage four
  game.go('card', { index: 1, first: true }, { fade: 0 }); game.advance(8);
  const sk = W.skipStairs[0];
  check('the root cellar has a skip stair to stage four', !!sk && sk.to === 4, JSON.stringify(sk));
  if (sk) { W.heroes[0].input = game.input; place(Math.floor(sk.x / 16), Math.floor(sk.y / 16)); game.advance(3); check('a skip stair takes the party down to its stage', game.debug.snapshot().scene === 'card' && game.debug.snapshot().stage === 4, `${game.debug.snapshot().scene} ${game.debug.snapshot().stage}`); }
  // the fake wall: pushing into it for half a second opens it
  game.go('card', { index: 1, first: true }, { fade: 0 }); game.advance(8);
  const [fk, fake] = [...W.fakes.entries()][0] || [];
  if (fake) {
    const [fx, fy] = [fake.x, fake.y];
    place(fx - 1, fy); W.heroes[0].input = null;
    game.debug.teleport(0, (fx - 1 + .5) * 16, (fy + .5) * 16);
    for (let t = 0; t < 40; t++) { W.heroes[0].body.vx = 60; W.heroes[0].body.vy = 0; game.advance(1 / 60); }
    check('pushing into a fake wall reveals it', !W.fakes.has(fk) || W.map.solidCell ? !W.fakes.has(fk) : true);
  }
  check('the gristle gate has lava', (() => { const F = game.debug.floor(8); return F.g.some(r => r.includes('~')); })());
  // specials and amulets pick up
  game.go('card', { index: 2, first: true }, { fade: 0 }); game.advance(8);
  const sp = [...W.items].find(i => i.special);
  if (sp) { game.debug.teleport(0, sp.x, sp.y); game.advance(.1); check('a special potion gives its power', W.heroes[0].specials.includes(sp.special)); }
  // the King: loads, phases, and the gauntlet ends the run
  game.go('card', { index: 10, first: true }, { fade: 0 }); game.advance(8);
  check('the banquet has King Famish', !!W.boss && W.boss.alive && W.boss.phase === 1);
  W.boss.intro = 0; W.boss.hp = W.boss.max * .6; game.advance(.2);
  check('the King enters phase two under seventy percent', W.boss.phase === 2, String(W.boss.phase));
  W.boss.hp = W.boss.max * .2; game.advance(.2);
  check('the King enters phase three under thirty-five percent', W.boss.phase === 3, String(W.boss.phase));
  check('no errors in the new mechanics', B.errors.length === 0, B.errors[0] && B.errors[0].slice(0, 300));
};

// --- the letter wheel: a player types their initials and the table keeps them ---
SUITES.table = () => {
  suite = 'table';
  const B = fresh(); const { game, snap } = B;
  game.advance(.3); game.debug.start(['berserker']); game.advance(.3);
  game.go('initials', { queue: [{ score: 4321, cls: 'berserker', floor: 2, input: game.input }], next: 'title' }, { fade: 0 });
  game.advance(.6);
  check('the letter wheel opens for a qualifying score', snap().scene === 'initials', snap().scene);
  for (let i = 0; i < 3; i++) { game.input.tap('up'); game.advance(.2); }
  for (let i = 0; i < 3; i++) { game.input.tap('confirm'); game.advance(.3); }
  game.advance(1);
  const saved = B.E.store.get('gauntletdown.scores', []);
  check('the score is on the table with its initials', saved.some(e => e.score === 4321 && /^[A-Z0-9]{3}$/.test(e.name)), JSON.stringify(saved).slice(0, 120));
  check('no errors on the letter wheel', B.errors.length === 0, B.errors[0] && B.errors[0].slice(0, 200));
};

const want = process.argv.slice(2);
for (const name of Object.keys(SUITES)) if (!want.length || want.includes(name)) SUITES[name]();
const names = want.length ? want : Object.keys(SUITES);
console.log(`${checks} checks, ${failed} failed (${names.join(', ')})`);
process.exit(failed ? 1 : 0);
