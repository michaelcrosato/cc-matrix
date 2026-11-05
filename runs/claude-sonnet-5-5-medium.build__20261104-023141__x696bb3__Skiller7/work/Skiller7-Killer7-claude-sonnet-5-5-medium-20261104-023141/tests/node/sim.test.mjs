import { load, makeChecker } from '../lib/node-harness.mjs';
const { S7 } = load(); const { check, report } = makeChecker();
const st = S7.st, sim = S7.sim, I = (o = {}) => Object.assign(S7.noIntent(), o);
const run = (sec, o = {}, dt = 1 / 60) => { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) sim.update(dt, typeof o === 'function' ? o(i) : I(o)); };
S7.newState({ difficulty: 'normal' });
// every area loads and has a graph where every edge has length
for (const id of S7.AREA_ORDER) { const A = S7.reg.areas[id]; S7.newState({}); try { sim.loadArea(id, Object.keys(typeof A.nodes === 'function' ? A.nodes() : A.nodes)[0]); const G = S7.graph(); check('area ' + id + ' edges', Object.values(G.edges).every(e => e.len > 1), JSON.stringify(Object.values(G.edges).filter(e => !(e.len > 1)).map(e => e.id))); for (const e of A.edges) { if (!G.nodes[e.a] || !G.nodes[e.b]) check('edge nodes ' + id + ':' + e.id, false); } for (const sp of A.spots) { if (sp.node && !G.nodes[sp.node]) check('spot node ' + sp.id, false); if (sp.edge && !G.edges[sp.edge]) check('spot edge ' + sp.id, false); } for (const t of A.triggers) { if (t.beat && !S7.reg.beats[t.beat]) check('beat ' + t.beat, false); if (t.wave && !A.waves[t.wave]) check('wave ' + t.wave, false); if (t.node && !G.nodes[t.node]) check('trigger node ' + t.id, false); if (t.edge && !G.edges[t.edge]) check('trigger edge ' + t.id, false); } } catch (e) { check('area ' + id, false, e.stack); } }
// walking: room 7 star junction
S7.newState({}); sim.loadArea('room7', 'c'); st.flags.intro_done = true;
check('room7 starts at a junction', st.mode === 'junction', st.mode);
run(.5); check('junction waits', st.mode === 'junction');
sim.update(1 / 60, I({ branch: 5 })); check('chose the door branch', st.edge === 'c-door' || st.mode === 'rail', st.edge + ' ' + st.mode);
run(.1, { go: true }); const s1 = st.s; run(.5, { go: true }); check('go moves along the rail', Math.abs(st.s - s1) > .5, st.s + ' vs ' + s1);
// the lobby: arrive, junction, gates
S7.newState({}); sim.loadArea('00A', 'start'); st.mode = 'rail';
run(.2); check('lobby: card beat plays', !!st.beat || st.mode === 'cutscene' || st.mode === 'talk', st.mode);
for (let i = 0; i < 200 && (st.mode === 'talk' || st.mode === 'cutscene'); i++) sim.update(1 / 60, I({ confirm: i % 20 === 0, skipScene: i > 120 }));
check('dialogs end', st.mode === 'rail', st.mode);
const talkOut = () => { for (let i = 0; i < 400 && (st.mode === 'talk' || st.mode === 'cutscene'); i++) sim.update(1 / 60, I({ confirm: i % 15 === 0 })); };
for (let k = 0; k < 6; k++) { run(3, { go: true }); talkOut(); }
check('walked to the first junction or beyond', st.area === '00A' && (st.mode === 'junction' || st.edge !== 'e1' || st.mode === 'rail'), st.mode + ' ' + st.edge);
// combat
S7.newState({}); sim.loadArea('00A', 'start'); st.flags.t00_card = true; st.done['00A:card'] = true; st.done['00A:tut_scan'] = true; st.mode = 'rail';
const e = sim.spawnEnemy('giggler', st.x - 6, st.y); e.spawnT = 0;
st.mode = 'rail'; sim.update(1 / 60, I({ aim: true })); check('aim mode', st.mode === 'aim');
// unrevealed: warm spot can't be hit
st.aim.yaw = Math.atan2(e.y - st.y, e.x - st.x); st.aim.pitch = 0; e.x = st.x - 6; e.y = st.y; e.vx = e.vy = 0; e.stun = 60;
sim.update(1 / 60, I({ aim: true, scan: true })); check('scan reveals', e.visible > 0);
const eye = st.z + 1.55; st.aim.pitch = Math.atan2(e.z + e.def.warm[1] - eye, 6);
const bx = e.x + Math.cos(e.face) * e.def.r * .6, by = e.y + Math.sin(e.face) * e.def.r * .6; st.aim.yaw = Math.atan2(by - st.y, bx - st.x);
let hp0 = e.hp; sim.update(1 / 60, I({ aim: true, fire: true, firePressed: true }));
check('warm spot shot thaws instantly', e.dead, 'hp ' + e.hp);
check('thawing drops red', st.pickups.some(p => p.kind === 'red') || st.red > 40);
// body shots hurt
const e2 = sim.spawnEnemy('giggler', st.x - 5, st.y); e2.spawnT = 0; e2.stun = 60; e2.visible = 5; e2.x = st.x - 5; e2.y = st.y;
st.aim.yaw = Math.atan2(e2.y - st.y, e2.x - st.x); st.aim.pitch = Math.atan2(e2.z + e2.def.h * .3 - eye, 5); st.roster[st.persona].cool = 0; st.roster[st.persona].ammo = 6;
sim.update(1 / 60, I({ aim: true, fire: true, firePressed: true })); check('body shot damages', e2.hp < e2.hpMax || e2.dead, e2.hp + '/' + e2.hpMax);
// enemies explode on you
S7.newState({}); sim.loadArea('00A', 'start'); st.done['00A:card'] = true; st.done['00A:tut_scan'] = true; st.mode = 'rail';
const e3 = sim.spawnEnemy('giggler', st.x - 3, st.y); e3.spawnT = 0; const hp3 = st.roster.rurik.hp; run(3);
check('whiteouts reach and blast you', st.roster.rurik.hp < hp3, hp3 + ' -> ' + st.roster.rurik.hp);
// freezing and the swap
st.roster.rurik.hp = 1; sim.hurtHero(50, 'test'); run(2.5);
check('freeze then the next coat steps out', st.persona !== 'rurik' && st.roster.rurik.frozen && st.mode !== 'frozen', st.persona + ' ' + st.mode);
// all frozen: game over
for (const id of S7.ROSTER) { st.roster[id].frozen = true; st.roster[id].hp = 0; } st.roster.anselma.frozen = false; st.roster.anselma.hp = 5; st.persona = 'anselma'; st.cheats.god = false; st.switchT = 0; sim.hurtHero(99, 'test'); run(2.5);
check('game over when all frozen', st.mode === 'gameover' && st.over, st.mode);
// save roundtrip
S7.newState({}); sim.loadArea('00A', 'j2'); st.red = 77; st.pins.push('pin1'); st.items.servicekey = 1; const data = sim.serialize(), json = JSON.stringify(data);
S7.newState({}); sim.deserialize(JSON.parse(json)); check('save roundtrip', st.area === '00A' && st.red === 77 && st.pins[0] === 'pin1' && st.items.servicekey === 1, st.area + st.red);
// gates: buyout with gustav
S7.newState({}); sim.loadArea('00A', 'j3'); st.mode = 'junction'; st.persona = 'gustav'; st.red = 60; st.done['00A:tw2'] = true;
const ix = st.options.findIndex(o => o.gate === 'rope'); sim.update(1 / 60, I({ branch: ix })); run(4, { go: true });
check('a closed rope blocks', st.blocked === 'rope', String(st.blocked) + ' ' + st.edge + ' ' + st.s);
sim.update(1 / 60, I({ interact: true })); check('Make It Rain pays the rope', sim.gateOpen('rope') && st.red === 35, 'red ' + st.red);
console.log(report() ? '' : ''); process.exit(0);
