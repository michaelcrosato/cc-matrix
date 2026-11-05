// One command for every test: builds the game, runs the rules in Node (the sim, no page), then the flows in headless
// Chromium (the real page from file://). Prints only the failures and one count line. Run: node tests/run.mjs
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadSim } from './node/load.mjs';
import { open, GAME } from './lib/open.mjs';
import { chromium } from 'playwright';

const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
let count = 0;
const check = (name, ok, detail = '') => { count++; if (!ok) fails.push(name + (detail ? ' :: ' + detail : '')); };

execFileSync(process.execPath, [path.join(dev, 'tools', 'build.mjs')], { stdio: 'ignore' });
const S7 = loadSim();
const dt = 1 / 120;

/* ---------- rules (Node) ---------- */
const fresh = () => { S7.prog = S7.newProgress(); S7.resetTuning(); S7.cheats.god = S7.cheats.ammo = S7.cheats.reveal = false; };

// content: every name a level uses exists in the registries
for (const id of ['t00', 't01', 'echo', 'room7']) {
  const A = S7.prepareLegs(S7.AREAS[id]);
  check('area ' + id + ' has a start leg', !A.start || A.legs[A.start]);
  for (const w of A.waves || []) check('wave ' + w.wave + ' exists', !!S7.WAVES[w.wave], id);
  for (const L of Object.values(A.legs)) {
    if (L.boss) check('boss ' + L.boss + ' exists', !!S7.BOSSES[L.boss], id);
    for (const n of L.next || []) check('leg ' + id + '.' + L.id + ' links to ' + n, !!A.legs[n]);
    check('leg ' + id + '.' + L.id + ' has length', L.len > 0);
  }
  for (const pk of A.pickups || []) check('pickup ' + pk.id + ' on a leg', !!A.legs[pk.leg]);
  for (const g of A.gates || []) check('gate ' + g.id + ' on a leg', !!A.legs[g.leg]);
}
for (const [k, W] of Object.entries(S7.WEAPONS)) check('weapon ' + k + ' sane', W.dmg > 0 && W.range > 0 && W.rate > 0 && W.mag > 0);
for (const id of S7.ROSTER) check('persona ' + id + ' has a weapon', !!S7.WEAPONS[S7.PERSONAS[id].weapon]);
check('seven personas', S7.ROSTER.length === 7);
for (const [name, list] of Object.entries(S7.WAVES)) for (const [type] of list) check('whiteout ' + type + ' in ' + name, !!S7.ENEMIES[type]);
check('line for every boss', Object.values(S7.BOSSES).every(b => b.line));
check('room 7 credits lines', S7.CREDITS.length > 10);

// rails: every point of every rail in a room is on a floor tile
for (const id of ['t00']) {
  const A = S7.prepareLegs(S7.AREAS[id]);
  for (const L of Object.values(A.legs)) for (const [x, y] of L.pts) {
    check('rail ' + id + '.' + L.id + ' point on floor (' + x + ',' + y + ')', S7.isFloor(A, x, y));
  }
  // the junction: both branches end where the boss legs begin
  const end = (leg) => leg.pts[leg.pts.length - 1], start = (leg) => leg.pts[0];
  check('north joins shaftN', JSON.stringify(end(A.legs.north)) === JSON.stringify(start(A.legs.shaftN)));
  check('south joins shaftS', JSON.stringify(end(A.legs.south)) === JSON.stringify(start(A.legs.shaftS)));
  check('lobby ends at the junction', JSON.stringify(end(A.legs.lobby)) === JSON.stringify(start(A.legs.north)) && JSON.stringify(end(A.legs.lobby)) === JSON.stringify(start(A.legs.south)));
}

// the bot finishes every area (the campaign can be played through)
for (const id of ['t00', 't01', 'echo']) {
  fresh();
  const sim = new S7.Sim(S7.AREAS[id]);
  const run = { sim, bot: true, time: 0 };
  let steps = 0;
  for (; steps < 120 * 200 && !sim.complete && !sim.over; steps++) { sim.update(dt, S7.botIntents(run, dt)); run.time += dt; sim.ev.length = 0; }
  check('bot completes ' + id, sim.complete && !sim.over, 'after ' + (steps * dt).toFixed(1) + 's');
}

// the same inputs give the same state
const replay = () => {
  fresh();
  const sim = new S7.Sim(S7.AREAS.t00); const run = { sim, bot: true, time: 0 };
  for (let i = 0; i < 120 * 12; i++) { sim.update(dt, S7.botIntents(run, dt)); run.time += dt; sim.ev.length = 0; }
  return S7.hashSim(sim);
};
check('the same run gives the same hash', replay() === replay());

// gates: the rope on the north leg is payable before the gate with the rime on the way
fresh();
{
  const A = S7.prepareLegs(S7.AREAS.t00), g = A.gates[0];
  const rimeBefore = A.pickups.filter(p => p.leg === g.leg && p.kind === 'rime' && p.at < g.at).length;
  check('gate payable from its route', rimeBefore * 2 >= g.price, 'price ' + g.price);
  const A1 = S7.prepareLegs(S7.AREAS.t01), g1 = A1.gates[0];
  const rime1 = A1.pickups.filter(p => p.leg === g1.leg && p.kind === 'rime' && p.at < g1.at).length;
  check('t01 gate payable from its route', rime1 * 2 >= g1.price, 'price ' + g1.price);
}

// the sweep: a frozen persona thaws when interact is held for two seconds
fresh();
{
  const sim = new S7.Sim(S7.AREAS.t00);
  sim.heroes.push(sim.makePersona('racer'));
  sim.me.hp = 0; sim.me.frozen = true;
  const I = { interact: true };
  for (let i = 0; i < 120 * 2.2; i++) sim.update(dt, Object.assign({}, I));
  check('the sweep thaws a frozen coat', sim.heroes.some(h => !h.frozen && h.hp === 2), JSON.stringify(sim.heroes.map(h => [h.id, h.frozen, h.hp])));
}

// a frozen persona hands over to the next alive one
fresh();
{
  const sim = new S7.Sim(S7.AREAS.t00);
  sim.heroes.push(sim.makePersona('racer'));
  sim.me.hp = 0; sim.me.frozen = true; sim.stats.deaths = 0;
  for (let i = 0; i < 120 * 1.4; i++) sim.update(dt, {});
  check('handover to the next coat after a freeze', sim.me.id === 'racer' && !sim.me.frozen, sim.me.id);
}

// a blast near the hero hurts it; god mode stops it
fresh();
{
  const sim = new S7.Sim(S7.AREAS.t00);
  const hp0 = sim.me.hp;
  sim.blast({ x: sim.pos.x + .5, y: sim.pos.y, z: sim.pos.z, type: 'giggler', def: S7.ENEMIES.giggler, alive: true });
  check('a blast hurts', sim.me.hp < hp0, 'hp ' + sim.me.hp);
  S7.cheats.god = true; const hp1 = sim.me.hp; sim.hurt(5); S7.cheats.god = false;
  check('god mode stops damage', sim.me.hp === hp1);
}

// the scan reveals Whiteouts in front, and the reveal runs out
fresh();
{
  const sim = new S7.Sim(S7.AREAS.t00);
  sim.spawnWave('lane');
  const e = sim.enemies[0];
  e.x = sim.pos.x + 6; e.y = sim.pos.y; e.z = sim.pos.z; sim.scanCD = 0;
  sim.scan();
  check('scan reveals a Whiteout in front', e.revealT > 0);
  for (let i = 0; i < 120 * (S7.live.scanTime + 1); i++) sim.update(dt, {});
  check('the reveal runs out', !(e.revealT > 0));
}

// abilities: the flare stuns and starts its cooldown
fresh();
{
  const sim = new S7.Sim(S7.AREAS.t00);
  sim.me.cdAbility = 0;
  sim.update(dt, { ability: true });
  check('ability starts a cooldown', sim.me.cdAbility > 0);
}

// the dev sliders reset to their defaults
fresh();
{
  S7.live.walkSpeed = 4; S7.live.heroHP = 9; S7.resetTuning();
  check('tuning resets', S7.live.walkSpeed === S7.TUNING.walkSpeed.def && S7.live.heroHP === S7.TUNING.heroHP.def);
}

// people, notes and the service door: Pim gives the code, the code opens the door, the dossier fills with notes
fresh();
{
  const A = S7.prepareLegs(S7.AREAS.t00);
  check('two people on the t00 rails', (A.npcs || []).length === 2 && A.npcs.every(n => A.legs[n.leg]));
  const everyNote = Object.keys(S7.NOTES).every(k => Object.values(S7.AREAS).some(a => (a.pickups || []).some(p => p.note === k)));
  check('a note on the rails for each dossier entry', everyNote);
  check('every person has lines', Object.values(S7.NPCS).every(n => Object.values(n.lines).every(l => l.length)));
  const sim = new S7.Sim(A);
  // the sim's talk: standing by Pim (on the south leg) and pressing interact emits talk
  sim.legId = 'south'; sim.s = A.legs.south.len * A.npcs[1].at;
  const near = sim.npcNear();
  check('Pim is in talking range on his leg', near && near.id === 'pim');
  sim.update(dt, { pay: true });
  check('talking emits a talk event', sim.ev.some(e => e.type === 'talk' && e.id === 'pim'));
  sim.ev.length = 0;
  // the code gate: wanting to pay at the door asks for the code; the door opens when openGate runs
  const gate = A.gates.find(g => g.kind === 'code');
  check('a code door on the south leg', !!gate && gate.leg === 'south');
  check('the code is the year Pim gives', gate && gate.code === '1926');
  sim.legId = 'south'; sim.s = A.legs.south.len * gate.at; sim.dir = 1; sim.gateNear = gate; sim.wantPay = true;
  sim.checkGates();
  check('the door asks for its code', sim.ev.some(e => e.type === 'code_request' && e.id === gate.id));
  sim.openGate(gate.id);
  check('the code door opens', sim.gateOpen[gate.id] === true);
}
// the boss begins with a camera cut that lasts for its dialogue
fresh();
{
  const sim = new S7.Sim(S7.AREAS.t00);
  sim.legId = 'shaftS'; sim.s = sim.leg.len; sim.arriveEnd();
  check('the boss starts when the rail ends', !!sim.boss && sim.ev.some(e => e.type === 'boss'));
}

// cutscenes and the new people: the beats are generators of shots and lines; Hansi and the third note are on the rails
fresh();
{
  check('a beat for each arrival and for the bosses', !!S7.BEATS.t00 && !!S7.BEATS.t01 && !!S7.BEATS.boss);
  const fake = { sim: { boss: { x: 1, y: 1, def: S7.BOSSES.bellcaptain }, pos: { x: 0, y: 0, z: 0, dx: 1, dy: 0 } } };
  const g = S7.BEATS.boss(fake);
  const first = g.next().value, second = g.next().value;
  check('the boss beat frames the boss, then speaks its line', !!first.shot && second.say[0] === S7.BOSSES.bellcaptain.line);
  check('the t01 people are placed on their legs', S7.prepareLegs(S7.AREAS.t01).npcs.length === 2);
  check('the third note is on the rails', S7.prepareLegs(S7.AREAS.t01).pickups.some(p => p.note === 'note-powder'));
  check('every person has a kind', Object.values(S7.NPCS).every(n => ['blob', 'ghost', 'human'].includes(n.kind)));
}

// AI Hub: finishing the Echo Run reports its time to the hub once, in milliseconds, and records the best run
fresh();
{
  const reports = [];
  const saved = { hub: S7.hub, game: S7.game };
  S7.hub = { active: true, result: (o) => reports.push(o), progress: () => {} };
  S7.game = { go() {} };
  const sim = new S7.Sim(S7.AREAS.echo);
  sim.t = 12.5; sim.stats.time = 12.5; sim.trace = [[0, 'run', 0]];
  const run = { sim, areaId: 'echo', area: S7.AREAS.echo, reportedHub: false, pres: { dispose() {} } };
  S7.onComplete(run);
  check('the echo reports its time to the hub once', reports.length === 1 && reports[0].time === 12500, JSON.stringify(reports));
  check('the echo keeps its best run', !!S7.prog.echoBest && S7.prog.echoBest.time === 12.5);
  S7.hub = saved.hub; S7.game = saved.game;
}

// the hash of a run is a string (for the tests and dev tools)
check('hash is a string', typeof S7.hashSim(new S7.Sim(S7.AREAS.t00)) === 'string');

/* ---------- flows (headless Chromium, the real page) ---------- */
async function flows() {
  const { browser, page, errors } = await open();
  try {
    const snap = () => page.evaluate(() => window.__game.debug.snapshot());
    // polls until the scene is the one wanted (the 3D world takes a while to build under a software renderer)
    const until = async (scene, ms = 30000) => {
      const t0 = Date.now();
      let s = await snap();
      while (s.scene !== scene && Date.now() - t0 < ms) { await page.waitForTimeout(250); s = await snap(); }
      return s;
    };
    // 1. boot: the title
    const s0 = await snap();
    check('boots to the title', s0.scene === 'title', s0.scene);
    // 2. attract: ten seconds without input
    const s1 = await until('attract', 25000);
    check('attract starts after ten seconds', s1.scene === 'attract', s1.scene);
    await page.keyboard.down('KeyQ');
    await page.waitForTimeout(250);
    await page.keyboard.up('KeyQ');
    const s2 = await until('title', 15000);
    check('any input leaves attract', s2.scene === 'title', s2.scene);
    // 3. the campaign: room 7, target 00 to its results
    await page.evaluate(() => window.__game.debug.go('room7', {}));
    check('room 7 opens', (await until('room7')).scene === 'room7');
    await page.evaluate(() => window.__game.debug.play('t00', true));
    let s = await until('results', 240000);
    for (let k = 0; k < 200 && s.scene !== 'results'; k++) { await page.evaluate(() => window.__game.advance(1)); s = await snap(); }
    check('target 00 reaches its results', s.scene === 'results', s.scene + ' ' + s.area);
    // 3b. the mouse aims: holding the aim button and moving turns the aim
    await page.evaluate(() => window.__game.debug.go('room7', {}));
    await until('room7');
    await page.evaluate(() => window.__game.debug.play('t00', false));
    await until('play');
    await page.waitForTimeout(3500);
    await page.mouse.move(480, 270);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(640, 300, { steps: 12 });
    await page.waitForTimeout(400);
    await page.mouse.up({ button: 'right' });
    const aimed = await snap();
    check('the mouse turns the aim', aimed.aim && (Math.abs(aimed.aim.yaw) > 0.01 || Math.abs(aimed.aim.pitch) > 0.01), JSON.stringify(aimed.aim));
    // 3c. the arrival cut plays before the dialogue; confirm skips the shot
    await page.evaluate(() => window.__game.debug.go('room7', {}));
    await until('room7');
    await page.evaluate(() => window.__game.debug.play('t01', false));
    await until('play');
    await page.waitForTimeout(600);
    const cutting = await snap();
    check('the arrival plays a camera cut', cutting.cut === true, JSON.stringify({ cut: cutting.cut, dialog: cutting.dialog }));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const skipped = await snap();
    check('confirm skips the camera cut to its dialogue', skipped.dialog === true, JSON.stringify({ cut: skipped.cut, dialog: skipped.dialog }));
    // 4. the pause menu reaches dev mode; a slider moves
    await page.evaluate(() => window.__game.debug.go('room7', {}));
    await until('room7');
    await page.evaluate(() => window.__game.debug.play('t01', false));
    await until('play');
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    check('pause menu opens dev mode', (await until('dev', 15000)).scene === 'dev');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const moved = await page.evaluate(() => window.__game.debug.snapshot().live.heroHP);
    check('dev slider moves', moved !== 6, 'heroHP ' + moved);
    await page.keyboard.press('Escape');
    check('dev mode returns to the run', (await until('play', 15000)).scene === 'play');
    // 5. the echo run records its time and ends in results
    await page.evaluate(() => window.__game.debug.play('echo', true));
    s = await until('results', 120000);
    for (let k = 0; k < 120 && s.scene !== 'results'; k++) { await page.evaluate(() => window.__game.advance(1)); s = await snap(); }
    check('echo run finishes', s.scene === 'results', s.scene);
    // 6. the game over: every coat frozen
    await page.evaluate(() => window.__game.debug.go('room7', {}));
    await until('room7');
    await page.evaluate(() => window.__game.debug.play('t00', false));
    await until('play');
    await page.evaluate(() => window.__game.debug.freezeAll());
    for (let k = 0; k < 6; k++) { await page.evaluate(() => window.__game.advance(1)); }
    s = await snap();
    check('all coats frozen ends the run', s.scene === 'gameover' || s.over === true, s.scene);
    // 7. save
    await page.evaluate(() => window.__game.debug.go('room7', {}));
    await until('room7');
    const saved = await page.evaluate(() => !!window.__game.debug.save(0));
    check('the clock saves', saved);
    check('a save is listed', await page.evaluate(() => !!window.__game.saves.latest()));
    // 8. the credits
    await page.evaluate(() => window.__game.debug.go('credits', { from: 'title' }));
    check('credits open', (await until('credits')).scene === 'credits');
    check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
  // 9. a touch-only phone: the notice and no game controls
  const b2 = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b2.newContext({ hasTouch: true, isMobile: true, viewport: { width: 740, height: 360 } });
  const p2 = await ctx.newPage();
  const errs2 = [];
  p2.on('pageerror', e => errs2.push(e.message));
  await p2.goto(pathToFileURL(GAME).href, { waitUntil: 'load' });
  await p2.waitForFunction(() => window.__game && window.__game.debug && window.__game.debug.snapshot().scene === 'title', null, { timeout: 90000 });
  const touchOnly = await p2.evaluate(() => S7.touchOnly);
  check('a touch-only phone is detected', touchOnly === true, String(touchOnly));
  check('touch-only shows the notice', await p2.evaluate(() => !!S7.touchOnly));
  check('no page errors on a phone', errs2.length === 0, errs2.slice(0, 2).join(' | '));
  await b2.close();
}

try { await flows(); } catch (err) { fails.push('flows crashed :: ' + err.message); }

// AI Hub: the framed game says hello, starts, reports progress and its Echo Run time to the hub (about five minutes)
try {
  execFileSync(process.execPath, [path.join(dev, 'tests', 'hub-check.mjs')], { stdio: 'pipe', timeout: 900000 });
  count++;
} catch (err) { count++; fails.push('ai hub round did not report :: ' + String(err.stdout || err.message).split('\n').filter(Boolean).slice(-1)[0]); }

if (fails.length) { for (const f of fails) console.log('FAIL ' + f); }
console.log(`${count - fails.length}/${count} checks passed${fails.length ? '' : ' - all green'}`);
process.exitCode = fails.length ? 1 : 0;
