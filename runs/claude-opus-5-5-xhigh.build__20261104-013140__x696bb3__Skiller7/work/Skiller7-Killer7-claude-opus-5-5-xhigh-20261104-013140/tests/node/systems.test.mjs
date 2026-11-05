// The systems (§7): rails and the walker, aim and weapons, the scan, Whiteouts, crits, personas and the ring, freezing
// and the Sweep, gates, Red and healing, the Wax Bench, saves, story skipping, dev sliders, voices, determinism.
import fs from 'node:fs';
import path from 'node:path';
import { boot } from '../lib/node-harness.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const M = 16;
const fresh = (seed = 5) => {
  const h = boot({ seed }); h.step(.3); h.S7.newGame('piste'); h.step(.1); h.sim.skipCutscene(); h.step(.2);
  for (const p of h.S7.PERSONA_ORDER) h.sim.st.roster[p].unlocked = true;
  return h;
};
export default async (T) => {
  // ---- core ----
  {
    const sims = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /^(1|2|3|4|5|6)/.test(f));
    const bad = sims.filter(f => /Math\.random/.test(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
    T.check('no Math.random in the sim', !bad.length, bad.join(', '));
    const { S7 } = fresh();
    T.check('registries are full', Object.keys(S7.AREAS).length >= 10 && Object.keys(S7.PERSONAS).length === 7 && Object.keys(S7.ENEMIES).length >= 8 && Object.keys(S7.SONGS).length >= 12);
    S7.T.walkSpeed = 150; S7.tuningReset(); T.eq('tuning resets to defaults', S7.T.walkSpeed, 85);
  }
  // ---- determinism: the same seed and inputs give the same hash, twice ----
  {
    const run = () => { const { S7, sim, I, step } = fresh(9); const hs = []; sim.warp('00A', 'j2'); sim.startWave('elev'); I.hold('move'); for (let k = 0; k < 10; k++) { step(.5); hs.push(sim.hash()); if (k === 4) { I.hold('move', false); I.hold('aim'); } if (k > 5) I.tap('scan'); } return hs.join(','); };
    T.eq('determinism', run(), run());
  }
  // ---- rails ----
  {
    const { S7, sim, I, step } = fresh();
    sim.warp('00A', 'r7'); I.hold('move'); step(1);
    T.check('walking holds speed', Math.abs(sim.W.v - sim.walkSpeed()) < 2, sim.W.v);
    I.hold('move', false); step(.4); T.check('letting go stops', sim.W.v < 1, sim.W.v);
    sim.warp('00A', 'r7'); I.hold('move'); step(2.0); I.hold('move', false); step(.5);
    T.eq('the walker stops on the junction', sim.W.node, 'j1');
    const n = sim.rails.nodes.j1; T.check('within 0.1 m of it', Math.hypot(sim.hero.x - n.x, sim.hero.y - n.y) < 1.6);
    sim.warp('00A', 'j1'); const ex = sim.rails.exits('j1').find(x => x.edge.id === 'j1-s1'); sim.takeBranch(ex); I.hold('move'); step(.5); I.hold('move', false);
    const d0 = sim.W.dir; I.tap('turn'); step(.3); T.eq('a quick turn flips the direction', sim.W.dir, -d0);
    // ski: accelerates downhill; a hockey stop brings it to 0
    sim.st.persona = 'dagny'; sim.warp('01C', 'st'); I.hold('move'); step(.2); const e = sim.rails.edges['st-f1']; sim.takeBranch({ edge: e, dir: 1 }); step(3);
    T.check('skiing accelerates on the slope', sim.W.v > 120, sim.W.v);
    I.hold('move', false); I.tap('turn'); step(1.5); T.check('a hockey stop stops', sim.W.v < 5, sim.W.v);
    // the jump: only Dagny
    sim.warp('00B', 'g2'); sim.st.persona = 'ignaz'; const je = sim.rails.edges['g2-lz'];
    T.check('a jump refuses Ignaz', sim.takeBranch({ edge: je, dir: 1 }) === false);
    sim.st.persona = 'dagny'; I.hold('skill'); sim.I = Object.assign(S7.noIntents(), { skillD: true, move: true });
    T.check('Dagny jumps', sim.takeBranch({ edge: je, dir: 1 }) === true); I.hold('skill', false); step(2.5);
    T.check('and lands on the far side', !!sim.st.flags.jumped);
  }
  // ---- aim, weapons, the scan, crits ----
  {
    const { S7, sim, I, step, game } = fresh();
    sim.warp('00A', 'j2'); sim.st.persona = 'mireille';
    const e = sim.spawnEnemy('giggler', [24.5, 9.5], { speedK: .001 });
    T.check('a fresh Whiteout is invisible', !sim.isRevealed(e));
    I.hold('aim'); step(.4); T.check('aim mode holds the walker', sim.aim.on && sim.W.v === 0);
    I.tap('scan'); step(.8); T.check('a scan reveals it', sim.isRevealed(e));
    step(sim.revealFor() + .5); T.check('the reveal runs out', !sim.isRevealed(e));
    const w = sim.warmPos(e), eye = sim.eye(), d = [w[0] - eye[0], w[1] - eye[1], w[2] - eye[2]];
    sim.aim.yaw = Math.atan2(d[1], d[0]); sim.aim.pitch = Math.atan2(d[2], Math.hypot(d[0], d[1])); sim.aim.recoil = 0;
    let crit = 0; const off = S7.bus.on('crit', () => crit++);
    I.tap('fire'); step(.1); off();
    T.check('a warm-spot hit kills at once (THAW.)', !e.alive && crit === 1, JSON.stringify({ alive: e.alive, hp: e.hp }));
    const r0 = sim.warmR(); sim.stats().critical = 3; T.check('Critical widens the warm spot', sim.warmR() > r0 * 1.25);
    // the shotgun's ten pellets; the Pole Guns' magazine; a wall blocks
    sim.st.persona = 'rurik'; let shots = 0; const o2 = S7.bus.on('hit', () => shots++);
    const e2 = sim.spawnEnemy('plow', [24.5, 11.5], { speedK: .001 }); e2.facing = Math.PI / 2; e2.reveal = 9;
    let tinks = 0; const o3 = S7.bus.on('tink', () => tinks++);
    sim.aim.yaw = Math.atan2(e2.y - sim.eye()[1], e2.x - sim.eye()[0]); sim.aim.pitch = -.02; step(1.2); I.tap('fire'); step(.1); o2(); o3();
    T.check('a Plow\'s slab blocks shots from the front', tinks > 0 && e2.alive, tinks);
    sim.st.persona = 'ignaz'; sim.mags = {}; const W = sim.weaponDef(); T.eq('Gamsbock magazine', sim.mag().n, W.mag);
    for (let k = 0; k < W.mag; k++) { I.tap('fire'); step(1.3); }
    step(.1); T.check('an empty gun reloads by itself', sim.mag().reload > 0 || sim.mag().n === W.mag, JSON.stringify(sim.mag()));
    I.hold('aim', false); step(.3);
    T.check('no errors (combat)', !game.errors.length, game.errors.map(x => x.message).join(' | '));
  }
  // ---- Whiteouts: Twins split, a burst hurts, a Bloom has three warm spots ----
  {
    const { S7, sim, step } = fresh();
    sim.warp('00A', 'j2');
    const tw = sim.spawnEnemy('twins', [24.5, 8.5], { speedK: .001 });
    sim.hitEnemy(tw, false, 5, {}); T.eq('Twins split into two small Gigglers', sim.enemies.filter(e => e.alive && e.type === 'giggler').length, 2);
    const hp0 = sim.pstate().hp; const g = sim.spawnEnemy('giggler', [24.5, 13.8]); step(1.5);
    T.check('a Giggler that reaches you bursts and hurts', sim.pstate().hp < hp0 && !g.alive, sim.pstate().hp);
    const b = sim.spawnEnemy('bloom', [20, 18]); for (let k = 0; k < 2; k++) sim.hitEnemy(b, true, 1, {});
    T.check('a Bloom survives two warm spots', b.alive); sim.hitEnemy(b, true, 1, {}); T.check('and thaws on the third', !b.alive);
  }
  // ---- personas, the ring, freezing and the Sweep ----
  {
    const { S7, sim, I, step } = fresh();
    sim.warp('00A', 'j2'); sim.st.persona = 'ignaz'; sim.pstate().hp = 50;
    T.check('the ring refuses the Sweep outside Room 7', sim.whyNot('ansel') === 'ROOM 7 ONLY');
    sim.trySwitch('dagny'); step(.2); T.check('a switch takes time', !!sim.switching); step(.4); T.check('and ends after 0.45 s', !sim.switching && sim.st.persona === 'dagny');
    T.eq('HP is per persona', sim.st.roster.ignaz.hp, 50);
    sim.pstate().hp = 0; sim.freezePersona(); T.eq('HP 0 freezes', sim.mode, 'frozen'); step(1.5);
    T.eq('the Sweep takes over', sim.st.persona, 'ansel');
    T.check('a frozen persona can\'t be picked', sim.whyNot('dagny') === 'FROZEN');
    const st = sim.st.roster.dagny.statue; T.check('the statue stays where it fell', !!st && st.area === '00A');
    sim.revive('dagny'); T.check('chipped free at half HP', !sim.st.roster.dagny.frozen && sim.st.roster.dagny.hp === 40);
    sim.st.persona = 'ansel'; sim.pstate().hp = 0; sim.freezePersona(); T.eq('the Sweep falling is game over', sim.mode, 'gameover');
  }
  // ---- gates: the right solver opens, the wrong one is refused ----
  {
    const { S7, sim } = fresh();
    sim.warp('00A', 'j3'); const rope = sim.rails.edges['j3-g1'];
    sim.st.persona = 'ignaz'; T.check('a velvet rope refuses Ignaz', !sim.passGate(rope));
    sim.st.persona = 'rurik'; sim.passGate(rope); T.check('Rurik is asked to pay', !!(sim.prompt && sim.prompt.choice));
    const red0 = sim.st.red; sim.prompt.onPick(0); sim.prompt = null; T.check('paying opens it', sim.gateOpen('rope') && sim.st.red === red0 - 20);
    sim.warp('01C', 'ts'); const pe = sim.rails.edges['ts-pr'];
    sim.st.persona = 'dagny'; T.check('the patrol rope refuses Dagny', !sim.passGate(pe)); sim.st.persona = 'ansel'; T.check('and lets the Sweep pass', sim.passGate(pe));
    sim.warp('01E', 'ig'); const lock = sim.rails.edges['ig-r7e']; sim.st.items.ember = 0; T.check('an ice lock needs the Ember Charm', !sim.passGate(lock)); sim.st.items.ember = 1; T.check('which melts it', sim.passGate(lock));
    sim.warp('01A', 'ls'); const dg = sim.rails.edges['ls-gg']; sim.st.items.edelweiss = 2; T.check('the Delegate Gate wants three', !sim.passGate(dg));
    sim.warp('01B', 'hm'); sim.st.persona = 'kasimir'; sim.st.red = 50; const I2 = Object.assign(S7.noIntents(), { skillP: true }); sim.updateSkills(1 / 120, I2); T.check('Echo opens the Echo Wall', sim.gateOpen('mirrors'));
    sim.warp('01A', 'mk'); sim.st.persona = 'dagny'; sim.aim.on = true; sim.mags = {}; const bell = sim.spots.find(s => s.id === 'bell');
    sim.hitTarget(bell, sim.weaponDef(), [0, 0, 0]); T.check('a far bell ignores everyone but a scoped Gamsbock', !sim.spotUsed(bell));
    sim.st.persona = 'ignaz'; sim.aim.scope = true; sim.hitTarget(bell, sim.weaponDef(), [0, 0, 0]); T.check('and rings for Ignaz\'s scope', sim.spotUsed(bell));
  }
  // ---- Red, healing, the Wax Bench ----
  {
    const { S7, sim, I, step } = fresh();
    sim.warp('00A', 'j2'); sim.st.persona = 'rurik'; sim.pstate().hp = 50; sim.st.red = 100;
    I.hold('heal'); step(1); I.hold('heal', false);
    T.check('healing converts about 40 a second', Math.abs(sim.pstate().hp - 90) < 3 && Math.abs(sim.st.red - 60) < 3, sim.pstate().hp + ' ' + sim.st.red);
    sim.st.red = 5; sim.pstate().hp = 50; I.hold('heal'); step(1); I.hold('heal', false); T.check('and stops at zero Red', sim.st.red === 0 && Math.round(sim.pstate().hp) === 55);
    sim.gain('red', 5000); T.eq('Red caps at 999', sim.st.red, 999);
  }
  // ---- saves: a round trip is exact; a mid-area save restores the walker, items, flags and gates ----
  {
    const { S7, sim, step } = fresh();
    sim.warp('00A', 'j3'); sim.st.items.servicekey = 1; sim.st.flags.test = 7; sim.st.gates['00A:rope'] = 1; sim.st.persona = 'rurik';
    const a = JSON.stringify(sim.serialize()); sim.deserialize(JSON.parse(a)); const b = JSON.stringify(sim.serialize());
    T.eq('serialize → deserialize → serialize is exact', a, b);
    T.check('the restore keeps the walker, items, flags and gates', sim.W.node === 'j3' && sim.st.items.servicekey === 1 && sim.st.flags.test === 7 && sim.gateOpen('rope') && sim.st.persona === 'rurik');
    let refused = false; try { sim.deserialize(Object.assign(JSON.parse(a), { v: 0 })); } catch (e) { refused = true; } T.check('an old version is refused cleanly', refused && S7.migrateSave({}, 0) === null);
  }
  // ---- story: skipping a cutscene lands in the same state as watching it ----
  {
    const w = boot({ seed: 4 }); w.step(.3); w.S7.newGame('piste'); for (let k = 0; k < 200 && w.sim.st.area === 'room7'; k++) { w.I.tap('confirm'); w.step(.3); }
    const s = boot({ seed: 4 }); s.step(.3); s.S7.newGame('piste'); s.step(.1); s.sim.skipCutscene(); s.step(.3);
    T.check('skip equals watch (the cold open)', w.sim.st.area === s.sim.st.area && w.sim.W.node === s.sim.W.node && JSON.stringify(w.sim.st.flags.coldOpenDone) === JSON.stringify(s.sim.st.flags.coldOpenDone), w.sim.st.area + ' ' + s.sim.st.area);
  }
  // ---- dev mode: sliders apply and reset ----
  {
    const { S7, sim, I, step } = fresh();
    sim.warp('00A', 'j1'); S7.T.walkSpeed = 170; sim.takeBranch(sim.rails.exits('j1').find(x => x.edge.id === 'j1-s1')); I.hold('move'); step(.4); T.check('the walk-speed slider applies', sim.W.v > 140, sim.W.v); I.hold('move', false);
    S7.T.enemyHP = 2; const e = sim.spawnEnemy('giggler', [24.5, 16]); T.eq('the enemy-HP slider applies', e.hp, 60);
    S7.tuningReset(); T.check('reset restores every default', Object.keys(S7.TUNING).every(k => S7.T[k] === S7.TUNING[k].def));
  }
  // ---- voices: deterministic syllables; nothing without an AudioContext ----
  {
    const { S7 } = fresh();
    const a = JSON.stringify(S7.Voice.schedule('Good evening, Madame Holle.', S7.VOICES.concierge)), b = JSON.stringify(S7.Voice.schedule('Good evening, Madame Holle.', S7.VOICES.concierge));
    T.check('a syllable schedule is deterministic', a === b && JSON.parse(a).length > 4);
    let ok = true; try { S7.voice.laugh('giggle', 0, [0, 0, 0], { x: 0, y: 0, z: 0, yaw: 0 }, false); S7.voice.talkTick({ lines: [{ who: 'holle', text: 'Shake the bed.' }], i: 0, shown: 5 }); } catch (e) { ok = false; }
    T.check('voices and laughs are no-ops headless', ok);
  }
};
