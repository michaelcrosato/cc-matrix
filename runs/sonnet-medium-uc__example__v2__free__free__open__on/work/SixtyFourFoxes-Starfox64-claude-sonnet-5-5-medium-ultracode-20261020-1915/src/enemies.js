// Enemy definitions and behaviours. Rail behaviours work in rail space (s,x,y); air behaviours in world space.
import { THREE } from './render.js';
import * as M from './models.js';
import { clamp, damp, rr, pick, TAU, angDiff, lerp } from './util.js';

export const DEFS = {
  scout: { build: M.buildScout, hp: 2, r: 2.0, score: 100, name: 'Scout' },
  drone: { build: M.buildDrone, hp: 1, r: 1.5, score: 60, name: 'Drone' },
  gunship: { build: M.buildGunship, hp: 16, r: 3.6, score: 400, name: 'Gunship' },
  turret: { build: M.buildTurret, hp: 5, r: 2.4, score: 150, name: 'Turret', ground: true },
  tank: { build: M.buildTank, hp: 6, r: 2.8, score: 200, name: 'Tank', ground: true },
  tower: { build: null, hp: 14, r: 4.2, score: 300, name: 'Tower', ground: true },
  bomber: { build: M.buildBomber, hp: 999, r: 5.0, score: 1200, name: 'Bomber' },
  walker: { build: M.buildWalker, hp: 999, r: 6, score: 2500, name: 'Walker', ground: true },
  carrier: { build: M.buildCarrier, hp: 999, r: 14, score: 8000, name: 'Warden Carrier' },
  ace: { build: () => M.buildAce(0xc7cfdf, 0xffd24a), hp: 22, r: 2.4, score: 600, name: 'Silver Jackal' },
  leader: { build: () => M.buildAce(0xff4a4a, 0xff4a4a), hp: 46, r: 2.6, score: 2000, name: 'Jackal Leader' },
};

export const ALLIES = {
  rook: { name: 'ROOK', species: 'Hawk', pal: 'rook', pitch: 1.5, color: '#6a8aff' },
  hazel: { name: 'HAZEL', species: 'Hare', pal: 'hazel', pitch: 1.9, color: '#ff7fb0' },
  dot: { name: 'DOT', species: 'Tree Frog', pal: 'dot', pitch: 2.4, color: '#5fe38a' },
  kit: { name: 'KIT', species: 'Fox', pal: 'kit', pitch: 1.1, color: '#ff8a3a' },
  base: { name: 'COMMAND', species: 'Operator', pal: 'kit', pitch: 1.3, color: '#9fe8ff' },
  gen: { name: 'GEN. MANGE', species: 'Jackal', pal: 'jackal', pitch: 0.6, color: '#ff4a4a' },
};

// -------- helpers --------
const V = THREE.Vector3;
const _a = new V(), _b = new V();
export function dRel(g, e) { return e.rail.s - g.p.s; }

// ---------------- RAIL BEHAVIOURS ----------------
export const RAIL = {
  scout(g, e, dt) {
    const r = e.rail; e.t += dt;
    r.s -= e.vs * dt;
    r.x = clamp(e.x0 + Math.sin(e.t * e.freq + e.ph) * e.amp, -30, 30);
    r.y = clamp(e.y0 + Math.cos(e.t * e.freq * 0.8 + e.ph) * e.amp * 0.3, -6, 18);
    const d = dRel(g, e);
    e.fireT -= dt;
    if (e.chase) {
      const a = e.chase; if (a.dead || a.state === 'gone') { e.chase = null; } else {
        r.s = lerpS(r.s, a.rail.s - e.chaseOff, 3, dt); r.x = lerpS(r.x, a.rail.x + e.chaseX, 2.4, dt); r.y = lerpS(r.y, a.rail.y, 2.4, dt);
        e.fireT -= 0;
        if (e.fireT <= 0 && g.mode === 'rail') { e.fireT = rr(0.5, 1.0); g.enemyBoltTo(e.pos, a.pos, 90, 8, a); }
        return;
      }
    }
    if (e.fireT <= 0 && d < 230 && d > 40) { e.fireT = rr(1.3, 2.4); g.enemyBolt(e.pos, 85, 10); }
    if (d < -80) g.removeEnt(e);
  },
  drone(g, e, dt) {
    const r = e.rail; e.t += dt; r.s -= e.vs * dt;
    const d = dRel(g, e);
    r.x += Math.sin(e.t * 2 + e.ph) * 6 * dt; r.y += Math.cos(e.t * 1.7 + e.ph) * 4 * dt;
    if (d < 140 && d > 0) { r.x += clamp(g.p.x - r.x, -1, 1) * 9 * dt; r.y += clamp(g.p.y - r.y, -1, 1) * 7 * dt; }
    if (e.mesh.userData.parts.core) { e.mesh.userData.parts.core.rotation.y += dt * 3; e.mesh.userData.parts.ring.rotation.z += dt * 4; }
    e.fireT -= dt; if (e.fireT <= 0 && d < 200 && d > 50) { e.fireT = rr(2.5, 4.5); g.enemyBolt(e.pos, 60, 8); }
    if (d < -80) g.removeEnt(e);
  },
  gunship(g, e, dt) {
    const r = e.rail; e.t += dt; const d = dRel(g, e);
    if (e.phase === 'in') { r.s -= e.vs * dt + 0; if (d <= e.hold) e.phase = 'hold'; }
    else if (e.phase === 'hold') {
      r.s = lerpS(r.s, g.p.s + e.hold, 2, dt);
      r.x = lerpS(r.x, e.x0 + Math.sin(e.t * 0.6) * 14, 1.5, dt); r.y = lerpS(r.y, e.y0 + Math.sin(e.t * 0.9) * 4, 1.5, dt);
      e.fireT -= dt;
      if (e.fireT <= 0) { e.fireT = 2.4; for (let i = 0; i < 3; i++) setTimeout(() => !e.dead && g.running && g.enemyBolt(e.pos, 95, 12), i * 150); }
      e.holdT -= dt; if (e.holdT <= 0) e.phase = 'leave';
    } else { r.s += 70 * dt; if (d > 520) g.removeEnt(e); }
    if (d < -80) g.removeEnt(e);
  },
  turret(g, e, dt) {
    const d = dRel(g, e); e.t += dt;
    const head = e.mesh.userData.parts.head;
    if (head) {
      const tw = e.pos.clone().sub(g.p.pos); const yaw = Math.atan2(tw.x, tw.z);
      head.rotation.y = damp(head.rotation.y, yaw - e.mesh.rotation.y + (e.yawBase || 0), 4, dt);
      head.rotation.y = head.rotation.y; 
    }
    e.fireT -= dt;
    if (e.fireT <= 0 && d < 280 && d > 25) { e.fireT = rr(1.5, 2.4); g.enemyBolt(e.top || e.pos, 80, 10); }
    if (d < -80) g.removeEnt(e);
  },
  tank(g, e, dt) {
    const r = e.rail, d = dRel(g, e); e.t += dt;
    r.x = clamp(e.x0 + Math.sin(e.t * 0.7 + e.ph) * 10, -32, 32);
    r.s -= 8 * dt;
    e.fireT -= dt; if (e.fireT <= 0 && d < 260 && d > 25) { e.fireT = rr(1.8, 2.8); g.enemyBolt(e.pos, 75, 10); }
    if (d < -80) g.removeEnt(e);
  },
  bomber(g, e, dt) {
    const r = e.rail, d = dRel(g, e); e.t += dt;
    const P = e.mesh.userData.parts;
    if (P.ring) P.ring.rotation.z += dt * 1.2;
    if (e.phase === 'in') { r.s -= e.vs * 3 * dt; if (d <= e.hold) e.phase = 'hold'; }
    else {
      r.s = lerpS(r.s, g.p.s + e.hold, 2, dt);
      r.x = lerpS(r.x, Math.sin(e.t * 0.5) * 12, 1.5, dt); r.y = lerpS(r.y, 8 + Math.sin(e.t * 0.8) * 3, 1.5, dt);
      e.fireT -= dt;
      if (e.fireT <= 0) { e.fireT = 3.2; g.ringBurst(e.pos, 10, 38, 8); }
      e.fire2 -= dt; if (e.fire2 <= 0) { e.fire2 = 1.4; for (const part of e.parts) if (!part.dead) g.enemyBolt(part.pos, 90, 10); }
    }
    if (d < -100) g.removeEnt(e);
  },
  walker(g, e, dt) {
    const r = e.rail; e.t += dt;
    const d = dRel(g, e);
    if (e.phase === 'in') { r.s -= 30 * dt; if (d <= e.hold) e.phase = 'hold'; }
    else { r.s = lerpS(r.s, g.p.s + e.hold, 1.4, dt); r.x = lerpS(r.x, Math.sin(e.t * 0.35) * 16, 1, dt); }
    e.fireT -= dt; if (e.fireT <= 0 && e.phase === 'hold') { e.fireT = 1.1; _a.copy(e.pos); _a.y += 6.5; g.enemyBolt(_a, 95, 11); }
    e.anim.update(dt);
  },
  carrier(g, e, dt) { g.bossUpdate(e, dt); },
  ring(g, e, dt) { e.mesh.rotation.z += dt * 0.8; if (dRel(g, e) < -40) g.removeEnt(e); },
  item(g, e, dt) { e.mesh.rotation.y += dt * 2; e.mesh.rotation.x = Math.sin(e.t += dt * 2) * 0.2; if (dRel(g, e) < -40) g.removeEnt(e); },
  pillar(g, e, dt) { if (dRel(g, e) < -80) g.removeEnt(e); },
};
function lerpS(a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); }

// ---------------- ALL-RANGE BEHAVIOURS (world space) ----------------
// Ships hold yaw/pitch; steer toward a target direction with limited turn rate.
export function fwd(yaw, pitch, out) { return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); }
export function steer(e, dir, rate, dt) {
  const ty = Math.atan2(-dir.x, -dir.z), tp = Math.asin(clamp(dir.y, -1, 1));
  const dy = angDiff(e.yaw, ty), dp = tp - e.pitch;
  const m = rate * dt;
  e.yawRate = clamp(dy, -m, m); e.yaw += e.yawRate;
  e.pitch += clamp(dp, -m, m); e.pitch = clamp(e.pitch, -1.2, 1.2);
}
export const AIR = {
  scout(g, e, dt) { chaser(g, e, dt, { speed: 78, turn: 1.9, fire: 1.6, range: 170, ang: 0.18, dmg: 8, evade: 0 }); },
  drone(g, e, dt) { chaser(g, e, dt, { speed: 55, turn: 1.4, fire: 3.0, range: 150, ang: 0.3, dmg: 7, evade: 0 }); },
  gunship(g, e, dt) { chaser(g, e, dt, { speed: 38, turn: 0.7, fire: 1.8, range: 230, ang: 0.25, dmg: 12, evade: 0, burst: 3 }); },
  ace(g, e, dt) { chaser(g, e, dt, { speed: 92, turn: 2.2, fire: 1.2, range: 200, ang: 0.14, dmg: 10, evade: 1 }); },
  leader(g, e, dt) { chaser(g, e, dt, { speed: 100, turn: 2.5, fire: 0.8, range: 220, ang: 0.12, dmg: 11, evade: 1.4, burst: 2 }); },
};
function chaser(g, e, dt, c) {
  e.t += dt;
  const P = g.p; const to = new V().copy(P.pos).sub(e.pos); const dist = to.length();
  const dir = to.clone().normalize();
  e.mode = e.mode || 'attack';
  e.modeT = (e.modeT ?? rr(4, 8)) - dt;
  // break away after a pass to avoid hugging the player
  const f = fwd(e.yaw, e.pitch, _b);
  const dot = f.dot(dir);
  if (e.mode === 'attack' && dist < 26 && dot > 0.4) { e.mode = 'break'; e.modeT = rr(1.6, 2.6); e.breakDir = new V(rr(-1, 1), rr(-0.3, 0.6), rr(-1, 1)).normalize(); }
  if (e.mode === 'break' && e.modeT <= 0) e.mode = 'attack';
  let target = dir;
  if (e.mode === 'break') target = e.breakDir;
  // lead the player a little
  else if (dist > 60) { target = new V().copy(P.pos).addScaledVector(P.wvel, Math.min(1.2, dist / 200)).sub(e.pos).normalize(); }
  // allies chase: if an ally is nearer and player far, attack ally
  if (e.targetAlly && !e.targetAlly.dead && e.targetAlly.state !== 'gone') {
    target = e.targetAlly.pos.clone().sub(e.pos).normalize();
  }
  steer(e, target, c.turn, dt);
  e.roll = damp(e.roll || 0, -e.yawRate / dt * 0.45, 5, dt);
  e.speed = damp(e.speed || c.speed, c.speed * (e.mode === 'break' ? 1.15 : 1), 2, dt);
  fwd(e.yaw, e.pitch, _b); e.vel.copy(_b).multiplyScalar(e.speed);
  e.pos.addScaledVector(e.vel, dt);
  // soft arena
  const R = g.stage.arenaR; const hd = Math.hypot(e.pos.x, e.pos.z);
  if (hd > R) { e.pos.x *= R / hd; e.pos.z *= R / hd; e.mode = 'attack'; }
  e.pos.y = clamp(e.pos.y, -80, 160);
  e.fireT -= dt;
  const aimDot = fwd(e.yaw, e.pitch, _b).dot(dir);
  if (e.fireT <= 0 && dist < c.range && aimDot > Math.cos(c.ang) && e.mode === 'attack') {
    e.fireT = c.fire * rr(0.8, 1.3);
    const n = c.burst || 1;
    for (let i = 0; i < n; i++) setTimeout(() => { if (!e.dead && g.running) g.enemyBolt(e.pos, 140, c.dmg, null, fwd(e.yaw, e.pitch, new V())); }, i * 110);
  }
  if (c.evade && e.mode === 'attack') { e.evadeT = (e.evadeT ?? rr(1, 3)) - dt; if (e.evadeT <= 0) { e.evadeT = rr(2.5, 5) / c.evade; e.sideStep = (Math.random() < 0.5 ? -1 : 1) * 14; e.sideT = 0.5; } }
  if (e.sideT > 0) { e.sideT -= dt; _b.set(Math.cos(e.yaw), 0, -Math.sin(e.yaw)); e.pos.addScaledVector(_b, e.sideStep * dt * 2); e.roll = (e.roll || 0) + dt * 12 * Math.sign(e.sideStep); }
}
