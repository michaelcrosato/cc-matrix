import * as THREE from 'three/webgpu';
import { RAPIER, propGroups, dollGroups } from '../physics/world.js';
import { GameEvent } from './base.js';
import { box, cyl, ball, cone } from '../art/props.js';
import { tuning } from '../data/tuning.js';
import { toon } from '../render/renderer.js';

const TIERS = [
  { rad: 1, per: 1, ankle: 4.6, margin: 0.45, par: 52 },
  { rad: 1.22, per: 0.8125, ankle: 5, margin: 0.6, par: 60 },
  { rad: 1.44, per: 0.625, ankle: 5, margin: 0.6, par: 66 },
];
const FRUIT = [['#FF8A1F', 'Orange'], ['#E8443A', 'Apple'], ['#9BE04A', 'Lime'], ['#FFD23F', 'Lemon'], ['#C77DFF', 'Plum']];
const REACH = 0.463; // basket offset per unit of cob

export class FruitHat extends GameEvent {
  static id = 'fruitHat'; static title = 'Fruit Hat'; static discipline = 'Balance Play'; static instructor = 'trudy'; static couch = true; static session = true; static music = 'balance';
  static intro = { line: 'Catch fruit in your basket hat. Hop to toss it into the crate and bank it.', can: 'You can push your luck: more fruit before banking pays more.', cant: "You can't lose points by falling, only whatever was still in your hat.", prompts: [['move', 'Lean'], ['hop', 'Bank'], ['flail', 'Flail']] };
  constructor(game, o) {
    super(game, o); const T = TIERS[this.tier]; this.T = T; this.duration = o.duration || 60; this.paletteName = 'noon'; this.music = 'balance';
    this.makeGround(2.6, 5, '#C99A62'); this.laneGap = 3.4; this.spawnT = 1.2; this.spawned = []; this.n = 0;
    this.cam = { pos: [0, 1.9, 8.4], look: [0, 1.5, 0], fov: 38 };
    this.buildSet(); this.addDolls({ ankleMax: T.ankle, margin: T.margin });
    for (const lane of this.lanes) this.setupLane(lane);
    this.camSnap = true;
  }
  buildSet() {
    const g = this.group; const n = this.lanes.length;
    for (let i = 0; i < n; i++) { const x = this.laneX(i); for (let k = -3; k <= 3; k++) { g.add(box(0.95, 0.12, 6.4, k % 2 ? '#D9AE6E' : '#CDA060', x + k * 0.98 * 0.5, -0.06, 0)); } }
    // pier posts and sea-side
    for (let i = -1; i <= n; i++) for (const z of [-3, 3]) g.add(cyl(0.18, 2.4, '#7A4F2A', this.laneX(0) - 1.7 + i * this.laneGap, -1.1, z, 8));
    // barges offshore firing fruit
    for (const lane of this.lanes) {
      const x = this.laneX(lane.id); const b = new THREE.Group(); b.position.set(x, -0.1, -9);
      b.add(box(2.6, 0.7, 1.4, '#2F6E8E', 0, 0.1, 0), box(2.8, 0.15, 1.6, '#E8443A', 0, 0.5, 0)); const cannon = cyl(0.22, 1, '#3D3D4D', 0, 1, 0); cannon.rotation.x = -0.5; b.add(cannon); b.add(cyl(0.05, 2.5, '#9A6B3F', 0.8, 1.7, 0), box(0.9, 0.7, 0.04, '#F5B700', 1.25, 2.4, 0));
      g.add(b); lane.barge = b; lane.cannon = cannon;
    }
    for (let i = 0; i < 6; i++) g.add(ball(0.5, '#FFFFFF', -14 + i * 6, 0.1, -14 - (i % 2) * 3));
  }
  setupLane(lane) {
    if (lane.kind === 'ghost') return;
    const T = this.T, b = lane.bal; lane.kind !== 'ghost' && (lane.bal.p.maxLean = null);
    lane.bal.sway = 0.02; lane.bal.tremor = 0.02;
    // basket on the doll's body
    const gq = dollGroups(lane.id);
    b.addCollider(RAPIER.ColliderDesc.cylinder(0.02, 0.36).setTranslation(0, 0.75, 0).setMass(0.01).setFriction(0.9).setCollisionGroups(gq));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); b.addCollider(RAPIER.ColliderDesc.cuboid(0.02, 0.1, 0.16).setTranslation(Math.cos(a) * 0.36, 0.85, Math.sin(a) * 0.36).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setMass(0.001).setCollisionGroups(gq)); }
    const bas = new THREE.Group(); bas.position.y = 1.5; bas.add(cyl(0.36, 0.05, '#D9AE5A', 0, 0, 0, 20), new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 24), toon('#B88A3E')).rotateX(Math.PI / 2)); bas.children[1].position.y = 0.1;
    const wall = cyl(0.36, 0.2, '#D9AE5A', 0, 0.1, 0, 20); wall.material = toon('#E8C070', { side: THREE.DoubleSide }); bas.add(wall);
    const inner = cyl(0.33, 0.04, '#B88A3E', 0, 0.03, 0, 20); bas.add(inner); lane.doll.root.add(bas); lane.basket = bas;
    lane.crate = box(0.8, 0.4, 0.6, '#A8743A', lane.x + 1.15, 0.2, 0.6); this.group.add(lane.crate);
    lane.inHat = []; lane.banked = 0; lane.bankCd = 0; lane.bankedFruit = 0; lane.nextBank = 0; lane.tossing = []; lane.stats = { banks: 0, caught: 0, spilled: 0 };
    lane.ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 24), toon('#1A1420')); lane.ring.rotation.x = Math.PI / 2; lane.ring.visible = false; this.group.add(lane.ring);
    lane.ringFill = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })); lane.ringFill.rotation.x = -Math.PI / 2; this.group.add(lane.ringFill); lane.ringFill.visible = false;
  }
  hatWorld(lane) { const p = lane.bal.body.translation(), q = lane.bal.body.rotation(); const v = new THREE.Vector3(0, 0.75, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)); return { x: p.x + v.x, y: p.y + v.y, z: p.z + v.z }; }
  spawn(lane) {
    const T = this.T; const r = this.r; const rad = tuning.landingRadius * T.rad; const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad;
    const lx = lane.x + Math.cos(a) * d, lz = Math.sin(a) * d * 0.9; this.n++;
    const roll = r(); let kind = 'fruit'; if (this.n % 17 === 9) kind = 'gold'; else if (roll < 0.1 && this.n > 3) kind = 'urchin'; else if (roll > 0.92 && this.n > 4) kind = 'boot';
    const col = kind === 'gold' ? '#FFD700' : kind === 'urchin' ? '#6B3FA0' : kind === 'boot' ? '#6A4A2A' : FRUIT[Math.floor(r() * FRUIT.length)][0];
    const rad2 = kind === 'gold' ? 0.1 : 0.075; const mass = kind === 'gold' ? 0.035 : kind === 'boot' ? 0.04 : tuning.fruitMass * (this.tier ? 0.8 : 1);
    const fly = 1.5, start = { x: lane.x + (r() - 0.5) * 0.4, y: 1.3, z: -9 }, g = tuning.gravity;
    const vx = (lx - start.x) / fly, vz = (lz - start.z) / fly, vy = (1.75 - start.y + 0.5 * g * fly * fly) / fly;
    const body = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(start.x, start.y, start.z).setLinvel(vx, vy, vz).setCcdEnabled(true).setCanSleep(false).setLinearDamping(0.02));
    this.pw.world.createCollider(RAPIER.ColliderDesc.ball(rad2).setMass(mass).setFriction(0.8).setRestitution(0.1).setCollisionGroups(propGroups(lane.id)), body);
    const mesh = new THREE.Group(); if (kind === 'urchin') { mesh.add(ball(rad2, col)); for (let i = 0; i < 10; i++) { const s = cone(0.02, 0.1, '#1A1420'); const u = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(); s.position.copy(u.clone().multiplyScalar(rad2 + 0.03)); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u); mesh.add(s); } }
    else if (kind === 'boot') { mesh.add(box(0.1, 0.16, 0.1, col, 0, 0, 0), box(0.1, 0.07, 0.17, col, 0, -0.06, 0.05)); } else mesh.add(ball(rad2, col)); if (kind === 'fruit') mesh.add(cone(0.01, 0.04, '#2E7D32', 0, rad2 + 0.01, 0));
    mesh.position.set(start.x, start.y, start.z); this.group.add(mesh);
    const f = { lane, kind, body, mesh, mass, value: kind === 'gold' ? 5 : kind === 'fruit' ? 1 : 0, state: 'fly', t: 0, land: [lx, lz], inHat: 0, rad: rad2 }; this.spawned.push(f);
    lane.cannon.rotation.x = -0.9; lane.cannonKick = 0.25; this.game.audio.sfx('pop');
    lane.nextTarget = lane.nextTarget || []; lane.nextTarget.push(f);
  }
  killFruit(f) { if (f.dead) return; f.dead = true; this.pw.removeBody(f.body); f.mesh.removeFromParent(); }
  botIntent(lane, dt, it) {
    const bot = lane.bot; let gx = 0, gz = 0; let best = null;
    for (const f of this.spawned) if (f.lane === lane && !f.dead && f.state === 'fly' && f.t > 0.55) { if (!best || f.t > best.t) best = f; }
    if (best) { gx = (best.land[0] - lane.x) / REACH; gz = best.land[1] / REACH; }
    const a = 1 - Math.exp(-dt / (lane.goalTau || 0.3)); lane.gs = lane.gs || [0, 0]; lane.gs[0] += (gx - lane.gs[0]) * a; lane.gs[1] += (gz - lane.gs[1]) * a;
    const [wx, wz] = bot.steer(lane.gs[0], lane.gs[1], lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz;
    it.hopEdge = false; const bankAt = lane.bankAt ?? 7; if ((lane.inHat.length >= bankAt || this.loadOf(lane) > (lane.loadMax ?? 1.1)) && lane.bankCd <= 0 && bot.t > (lane.botWait || 0)) { it.hopEdge = true; lane.botWait = bot.t + 0.4; }
    if (lane.bal.leanDeg > 31 && lane.bal.flailCd <= 0 && lane.bal.flailLeft <= 0 && lane.bot.skill.lag < 0.4) it.flailEdge = true; else it.flailEdge = false;
  }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return;
    if (lane.bankCd > 0) lane.bankCd -= dt;
    if (it.hopEdge && lane.bankCd <= 0) this.bank(lane);
  }
  bank(lane) {
    lane.bankCd = 1; lane.rig.play('hop', 0.05, { force: true }); this.game.audio.sfx('hop');
    if (!lane.inHat.length) return; const items = lane.inHat.slice(); let val = 0; for (const f of items) val += f.value;
    const mult = 1 + 0.1 * (items.length - 1); const gain = val * mult; lane.score += gain; lane.stats.banks++; lane.bankedFruit += items.length;
    for (const f of items) { const p = f.mesh.position.clone(); f.dead = true; this.pw.removeBody(f.body); lane.tossing.push({ mesh: f.mesh, from: p, to: new THREE.Vector3(lane.x + 1.15, 0.5, 0.6), t: 0, d: 0.6 }); }
    lane.inHat = []; this.syncLoad(lane);
    this.word('+' + gain.toFixed(1), lane.x + 0.8, 1.2); this.game.audio.sfx('catch'); this.game.rumble(lane, 0.3, 120); this.onBank && this.onBank(lane, items.length, gain);
  }
  syncLoad(lane) { }
  loadOf(lane) { let d = 0; for (const f of (lane.inHat || [])) d += f.mass * 9.81 * 1.6; return d; }
  step(dt) {
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost') continue;
      lane.cannonKick && (lane.cannonKick -= dt, lane.cannon.rotation.x += (-0.5 - lane.cannon.rotation.x) * 0.2);
      if (lane.bal.fallen) continue; lane.form = Math.min(100, 100 * lane.score / this.T.par);
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.t < this.duration - 2.2) { this.spawnT = tuning.fruitInterval * this.T.per * (0.85 + this.r() * 0.3); for (const lane of this.lanes) if (lane.kind !== 'ghost' && !lane.bal.fallen) this.spawn(lane); }
    for (const f of this.spawned) {
      if (f.dead) continue; f.t += dt; const p = f.body.translation(); f.mesh.position.set(p.x, p.y, p.z); const q = f.body.rotation(); f.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      const lane = f.lane; if (p.y < -2 || p.z > 14 || Math.abs(p.x) > 60) { this.killFruit(f); continue; }
      if (f.state === 'gone') { if (p.y < 0.2 || f.t > 12) { f.gone = (f.gone || 0) + dt; if (f.gone > 1.2) this.killFruit(f); } continue; }
      if (lane.bal.fallen) { if (f.state === 'hat') { f.state = 'gone'; lane.inHat = lane.inHat.filter((x) => x !== f); } else if (f.t > 1.4) f.state = 'gone'; continue; }
      const h = this.hatWorld(lane); const dx = p.x - h.x, dz = p.z - h.z, dy = p.y - h.y; const inside = Math.hypot(dx, dz) < 0.33 && dy > -0.02 && dy < 0.28;
      if (f.state === 'fly') { if (f.t > 1.1 && inside) { f.inHat += dt; if (f.inHat > 0.25) { this.enterHat(lane, f); } } else if (f.t > 1.3) f.inHat = 0; if (f.t > 2.2 && f.state === 'fly') f.state = 'gone'; }
      else if (f.state === 'hat') { if (!inside && dy > 0.1 || dy < -0.1) { f.state = 'gone'; lane.inHat = lane.inHat.filter((x) => x !== f); lane.stats.spilled++; } }
    }
    for (const lane of this.lanes) if (lane.tossing) for (let i = lane.tossing.length - 1; i >= 0; i--) { const o = lane.tossing[i]; o.t += dt; const a = Math.min(1, o.t / o.d); o.mesh.position.lerpVectors(o.from, o.to, a); o.mesh.position.y += Math.sin(a * Math.PI) * 1.2; if (a >= 1) { o.mesh.removeFromParent(); lane.tossing.splice(i, 1); } }
    for (const lane of this.lanes) { if (!lane.ring) continue; const t = lane.nextTarget ? lane.nextTarget.filter((f) => !f.dead && f.state === 'fly') : []; lane.nextTarget = t; const f = t[0]; if (f) { lane.ring.visible = lane.ringFill.visible = true; lane.ring.position.set(f.land[0], 0.03, f.land[1]); lane.ringFill.position.set(f.land[0], 0.025, f.land[1]); const k = 1 + 0.5 * Math.max(0, 1 - f.t / 1.5); lane.ring.scale.setScalar(k); lane.ringFill.scale.setScalar(Math.max(0.2, f.t / 1.5)); } else lane.ring.visible = lane.ringFill.visible = false; }
    if (this.t >= this.duration) this.finish();
  }
  enterHat(lane, f) {
    if (f.kind === 'urchin') { lane.score = Math.max(0, lane.score - 2); lane.bal.shove((this.r() < 0.5 ? -1 : 1) * 1.1, 0.2, 0.25); this.word('OUCH', lane.x, 2.0); this.game.audio.sfx('spike'); this.game.rumble(lane, 0.6, 200); this.killFruit(f); return; }
    f.state = 'hat'; lane.inHat.push(f); lane.stats.caught++; this.game.audio.sfx('catch'); this.game.rumble(lane, 0.2, 60); lane.rig.play('hop', 0.05, { force: true }); this.hitstop = 0.03;
  }
  onFall(lane) { const n = lane.inHat.length; lane.stats.spilled += n; if (n) this.word('SPLAT x' + n, lane.x, 1.6); lane.inHat = []; }
  onFinish() { for (const lane of this.lanes) if (lane.kind !== 'ghost') { let v = 0; for (const f of lane.inHat) v += f.value; lane.score += v * 0.5; lane.form = Math.min(100, 100 * lane.score / this.T.par); } }
  discInfo(lane) { const f = lane.nextTarget && lane.nextTarget[0]; return { marks: f ? [{ x: (f.land[0] - lane.x) / REACH, z: f.land[1] / REACH, r: 0.12 }] : [], zone: null }; }
  hudInfo(lane) { return { score: lane.score, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'hat', html: `<b>${(lane.inHat || []).length}</b> in hat` }, { id: 'load', html: `Load <span class="meter"><i style="width:${Math.min(100, Math.round(this.loadOf(lane) / 2.4 * 100))}%"></i></span>` }] }; }
  prompts() { return FruitHat.intro.prompts; }
  frameExtra() { for (const lane of this.lanes) if (lane.basket) lane.basket.position.y = 1.5; }
  onDispose() { for (const f of this.spawned) f.mesh.removeFromParent(); }
}
