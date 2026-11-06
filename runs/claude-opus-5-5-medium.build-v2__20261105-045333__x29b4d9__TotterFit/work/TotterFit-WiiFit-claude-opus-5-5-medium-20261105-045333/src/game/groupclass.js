// Group Class: 1-4 on one TV.
import { el, txt } from '../ui/ui.js';
import { SEATS } from '../data/config.js';
import { EVENTS } from '../data/events.js';
import { pick } from '../core/rng.js';
import { setPalette } from '../render/palette.js';
import { box, at, cyl } from '../art/materials.js';
import * as Play from '../ui/screens/play.js';
const COUCH = ['poses', 'cairn', 'logReps', 'stepClass', 'plates', 'fruitHat', 'springboard', 'raft', 'tug', 'roomService'];
export function openGroupLobby(g) {
  const ui = g.ui, inp = g.input; const seats = [];
  const already = (d) => seats.some(s => s.dev === d);
  const add = (dev, ctrl) => { if (already(dev) || seats.length >= 4) return; seats.push({ dev, ctrl, colour: SEATS[seats.length], name: `Seat ${seats.length + 1}` }); g.audio.sfx('ok'); lay.rebuild(); };
  let lay = null; let keyJoinGuard = 0;
  lay = ui.open('group', (e, layer) => {
    e.classList.add('dim'); e.appendChild(txt('div', 'title-h', 'Group Class'));
    const mats = el('div', 'mats'); for (let i = 0; i < 4; i++) { const s = seats[i]; const m = el('div', 'mat'); m.style.minHeight = '34vh'; if (s) { const c = el('div', 'chip'); c.style.background = s.colour; m.append(c, txt('div', '', s.name), txt('div', 'small', s.dev === 'kbm' ? 'Keys and mouse' : `Controller ${s.ctrl.index + 1}`)); } else m.append(txt('div', '', 'Empty mat'), txt('div', 'small', 'Press to join')); mats.appendChild(m); } e.appendChild(mats);
    const r = el('div', 'row'); if (seats.length) { r.append(ui.btn('Quick Class', () => { ui.close(); runGroup(g, seats, quick(g)); }, { def: true }), ui.btn('Pick Three', () => openPick(g, seats))); } else { const b = ui.btn('Waiting for someone', () => {}, { cls: 'locked' }); r.appendChild(b); } e.appendChild(r);
    e.appendChild(el('div', 'grow')); const bar = ui.bottom([['use', 'Join'], ['back', 'Leave']]); e.appendChild(bar);
  }, {
    onBack: () => { if (seats.length) { seats.pop(); seats.forEach((s, i) => { s.colour = SEATS[i]; s.name = `Seat ${i + 1}`; }); lay.rebuild(); } else ui.close(); },
    tick: (dt) => {
      keyJoinGuard += dt; if (ui.top() !== lay || keyJoinGuard < .2) return;
      for (const c of inp.pads) if (c.connected && c.hop && !already(`pad${c.index}`)) { add(`pad${c.index}`, c); inp.menu.confirm = false; }
      if ((inp.kbm.use || inp.kbm.hop) && !already('kbm')) { add('kbm', inp.kbm); inp.menu.confirm = false; }
    },
  });
  // Clicking a mat joins keyboard and mouse.
  lay.el.addEventListener('click', (e) => { if (e.target.closest('.mat') && !already('kbm')) add('kbm', inp.kbm); });
}
function quick(g) { const pool = [...COUCH].filter(e => EVENTS[e]); const out = []; while (out.length < 3) out.push(pool.splice(Math.floor(g.rngFlow() * pool.length), 1)[0]); return out; }
function openPick(g, seats) {
  const ui = g.ui, chosen = []; let page = 0; const per = 5, list = COUCH.filter(e => EVENTS[e]), pages = Math.ceil(list.length / per);
  ui.open('grouppick', (e, layer) => {
    e.classList.add('dim'); e.appendChild(txt('div', 'title-h', `Pick three (${chosen.length} of 3)`)); const row = el('div', 'row');
    for (const id of list.slice(page * per, page * per + per)) row.appendChild(ui.cardBtn('card', () => { if (chosen.includes(id)) chosen.splice(chosen.indexOf(id), 1); else chosen.push(id); if (chosen.length === 3) { ui.closeTo('group'); ui.close(); runGroup(g, seats, chosen); } else layer.rebuild(); }, (b) => { b.append(txt('div', 'big', EVENTS[id].title)); if (chosen.includes(id)) b.appendChild(txt('div', 'stamp', 'YES')); }));
    e.appendChild(row); const pr = el('div', 'row'); pr.appendChild(ui.btn('More classes', () => { page = (page + 1) % pages; layer.rebuild(false); }, { cls: 'small' })); e.appendChild(pr); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['use', 'Choose'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
export function runGroup(g, seats, list) { g.ui.closeAll(); g.scripts.run(groupFlow(g, seats, list), 'flow'); g.groupRun = true; }
function* groupFlow(g, seats, list) {
  const pts = seats.map(() => 0);
  for (const id of list) {
    const Cls = EVENTS[id]; let go = null; Play.openIntro(g, Cls, 0, (v) => { go = v; }); yield () => go !== null; g.ui.close(); if (go === 'back') break;
    yield* g.wipe(() => { const specs = seats.map((s, i) => ({ kind: 'local', ctrl: s.ctrl, name: s.name, colour: s.colour, seat: i })); if (id === 'raft' && specs.length < 2) specs.push({ kind: 'bot', skill: 'average', name: 'Retired Kevin', colour: '#2FA7A0' }); g.startEventMode(Cls, { tier: 0, group: true, palette: 'noon' }, specs); });
    const ev = g.mode.event; yield () => ev.phase === 'done'; yield 1.1;
    const order = seats.map((_, i) => i).sort((a, b) => ev.laneResult(b).form - ev.laneResult(a).form); order.forEach((s, rank) => { pts[s] += 4 - rank; }); document.body.classList.remove('hidecursor');
    let cont = false; g.ui.open('groupresult', (e) => { e.classList.add('dim'); e.appendChild(txt('div', 'title-h', Cls.title)); const row = el('div', 'row'); order.forEach((s, rank) => { const c = el('div', 'card'); c.style.borderColor = seats[s].colour; c.append(txt('div', 'big', `${rank + 1}`), txt('div', '', seats[s].name), txt('div', 'small', `+${4 - rank} points. Total ${pts[s]}`)); row.appendChild(c); }); e.appendChild(row); e.appendChild(el('div', 'grow')); const r2 = el('div', 'row'); r2.appendChild(g.ui.btn('Next', () => { cont = true; }, { def: true })); e.appendChild(r2); }, {}); g.audio.sting('pleasant'); yield () => cont; g.ui.close();
  }
  // Final podium: a toy-block podium, winners on top, and it tips over.
  const order = seats.map((_, i) => i).sort((a, b) => pts[b] - pts[a]);
  yield* g.wipe(() => { g.clearMode(); setPalette('golden'); const m = podiumMode(g, seats, order); g.mode = m; });
  g.audio.sting('fanfare'); g.audio.sfx('cheer'); let cont = false;
  g.ui.open('podium', (e) => { e.appendChild(txt('div', 'title-h', `${seats[order[0]].name} wins`)); const row = el('div', 'row'); order.forEach((s, r) => { const c = el('div', 'gaugeTag'); c.textContent = `${r + 1}. ${seats[s].name}: ${pts[s]}`; row.appendChild(c); }); e.appendChild(row); e.appendChild(el('div', 'grow')); const r2 = el('div', 'row'); r2.appendChild(g.ui.btn('Finish', () => { cont = true; }, { def: true })); e.appendChild(r2); }, {});
  yield () => cont; g.ui.closeAll(); g.groupRun = false;
  yield* g.wipe(() => g.goTitle(true));
}
import * as THREE from 'three/webgpu';
import { makeDoll } from '../art/doll.js';
import { RAPIER, makeWorld, addGroundPlane, groups } from '../physics/world.js';
function podiumMode(g, seats, order) {
  const group = new THREE.Group(); g.scene.add(group); g.island.setStage('backdrop'); const world = makeWorld({ iterations: 8 }); addGroundPlane(world, 0); const G = groups(1, 0xffff);
  group.add(at(cyl(9, 9.3, .4, '#8FD06F', 32), 0, -.2, 0));
  const H = [1.8, 1.2, .7, .35], X = [0, -1.9, 1.9, 3.8], blocks = [], dolls = [], cols = ['#F5B700', '#B8C4CF', '#C98F62', '#E8DCC8'];
  order.forEach((s, r) => { const h = H[r], x = X[r]; const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, h / 2, 0).setCanSleep(false)); world.createCollider(RAPIER.ColliderDesc.cuboid(.9, h / 2, .9).setMass(1).setFriction(.6).setCollisionGroups(G), b); const m = box(1.8, h, 1.8, cols[r]); group.add(m); blocks.push({ b, m, h });
    const d = makeDoll({ paint: seats[s].colour }); d.rig.play('cheer', 0); group.add(d.group); d.group.position.set(x, h, 0); const db = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, h + .75, 0).setCanSleep(false)); world.createCollider(RAPIER.ColliderDesc.capsule(.5, .25).setMass(.4).setFriction(.7).setCollisionGroups(G), db); dolls.push({ d, db }); });
  g.rig.set(1, 3, 10, 1, 1.4, 0, true); let t = 0, tipped = false;
  return { screen: 'podium', blocks, fixed(dt) { t += dt; if (t > 3 && !tipped) { tipped = true; { const q = blocks[0].b.translation(); blocks[0].b.applyImpulseAtPoint({ x: 6, y: 0, z: .4 }, { x: q.x, y: q.y + blocks[0].h / 2, z: q.z }, true); } g.audio.sfx('creak', { dur: 1 }); g.after(.8, () => g.audio.sfx('clatter')); } world.step(); for (const o of blocks) { const p = o.b.translation(), q = o.b.rotation(); o.m.position.set(p.x, p.y, p.z); o.m.quaternion.set(q.x, q.y, q.z, q.w); } },
    frame(dt) { for (const o of dolls) { const p = o.db.translation(), q = o.db.rotation(); o.d.group.position.set(p.x, p.y - .75, p.z); o.d.lean.quaternion.set(q.x, q.y, q.z, q.w); o.d.tick(dt); } g.island.tick(dt); }, dispose() { group.removeFromParent(); world.free(); } };
}
void pick;
