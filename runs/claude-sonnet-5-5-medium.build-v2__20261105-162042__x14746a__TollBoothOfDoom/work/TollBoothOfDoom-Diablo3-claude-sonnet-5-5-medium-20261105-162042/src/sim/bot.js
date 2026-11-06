// A simple intent generator for tests, attract mode and couch bot seats.
import { CLASSES } from '../data/classes.js';
import { monstersNear, livingHeroes } from './core.js';
import { skillSpec, canCast } from './effects.js';

export function botIntent(w, h, st = {}) {
  const I = { mx: 0, mz: 0, held: [false, false, false, false, false, false], pressed: [false, false, false, false, false, false], dodge: false, potion: false, interact: false, interactHold: false, ax: null, az: null, soft: true };
  if (!h.alive) return I;
  const mem = h.botMem || (h.botMem = { x: 0, z: 0, t: 0, ignore: new Map() });
  if (Math.hypot(h.x - mem.x, h.z - mem.z) > 0.6) { mem.x = h.x; mem.z = h.z; mem.t = w.t; }
  const stepD = Math.hypot(h.x - (mem.px ?? h.x), h.z - (mem.pz ?? h.z)); mem.px = h.x; mem.pz = h.z;
  mem.still = stepD < 0.004 && h.wantMove && !h.cast ? (mem.still || 0) + 1 / 60 : 0;
  const stuck = w.t - mem.t > 2.5 && !h.cast;
  if (stuck && mem.last && mem.lastD > 2.6) { mem.ignore.set(mem.last, w.t + 20); mem.t = w.t; }
  if (stuck && mem.lastDrop) { mem.ignore.set('d' + mem.lastDrop, w.t + 12); mem.breakProps = w.t + 5; mem.lastDrop = 0; mem.t = w.t; }
  const goal = st.goal;
  const foes = monstersNear(w, h.x, h.z, 30).filter((m) => !(mem.ignore.get(m.id) > w.t)).filter((m) => !m.dead && (!m.team || m.team === 'monster') && !m.prop && m.state !== 'dormant' && !(m.invuln > w.t + 1));
  const props = monstersNear(w, h.x, h.z, 6).filter((m) => m.prop && !m.dead);
  let target = null, bd = 1e9;
  for (const m of foes) { const d = Math.hypot(m.x - h.x, m.z - h.z) * (m.static ? 0.3 : m.boss ? 0.4 : 1); if (d < bd) { bd = d; target = m; } }
  if (h.hp < h.maxHp * 0.5 && h.potionCd <= 0) I.potion = true;
  const ranged = h.cls === 'lamplighter';
  const want = ranged ? 7 : h.cls === 'sexton' ? 5 : 1.6;
  if (goal && goal.force && target && w.t - mem.t < 2 && Math.hypot(target.x - h.x, target.z - h.z) > 1.2 + (target.r || 0)) target = null; // rushing a goal: only fight what is adjacent
  h.botSrc = target ? 'target' : goal ? 'goal' : 'none';
  if (target) mem.lastDrop = 0;
  mem.last = target ? target.id : 0; mem.lastD = target ? Math.hypot(target.x - h.x, target.z - h.z) : 0;
  if (target) {
    const dx = target.x - h.x, dz = target.z - h.z, d = Math.hypot(dx, dz) || 1;
    I.ax = target.x; I.az = target.z; I.soft = false;
    if (d > want + 0.8) { if (w.zone.nav.lineOfSight(h.x, h.z, target.x, target.z, 0.42)) { I.mx = dx / d; I.mz = dz / d; } else steerTo(w, h, target.x, target.z, I, st, 0.5); } else if (ranged && d < want - 2) { I.mx = -dx / d; I.mz = -dz / d; }
    if (d < 40) {
      // use skills: prefer ones that are castable, highest slot first
      for (let i = 5; i >= 0; i--) {
        if (!h.skills[i]) continue;
        const ok = canCast(w, h, i);
        const spec = skillSpec(h, i);
        if (ok !== true) continue;
        const f0 = spec.fx[0]; const reach = f0.range || f0.dist || f0.r || 8;
        if (spec.melee && d > 3.2) continue;
        if (spec.cost === 0 && spec.cd === 0 && i !== 0 && i !== 1) continue;
        if (d > reach + (f0.range || f0.dist ? 0 : 1.2) || (f0.op === 'turret' || f0.op === 'zone' || f0.op === 'summon' || f0.op === 'buff') && d > 14) continue;
        I.held[i] = true; I.pressed[i] = true; break;
      }
      if (!I.held.some(Boolean)) { for (let i = 0; i < 2; i++) { if (!h.skills[i] || canCast(w, h, i) !== true) continue; const sp = skillSpec(h, i); if (d > (sp.melee ? 3.4 : sp.fx[0].r ? sp.fx[0].r + 1.5 : 13)) continue; I.held[i] = true; I.pressed[i] = true; break; } }
    }
    // dodge when something is winding up next to us
    if (target.state === 'wind' && d < 3 && h.dodgeCd <= 0 && !h.cast) { I.dodge = true; I.mx = -dz / d; I.mz = dx / d; }
  } else if (props.length && (!goal || w.t < (mem.breakProps || 0))) {
    const p = props[0]; const dx = p.x - h.x, dz = p.z - h.z, d = Math.hypot(dx, dz) || 1;
    I.ax = p.x; I.az = p.z; I.soft = false;
    if (d > 1.5) { I.mx = dx / d; I.mz = dz / d; } else if (canCast(w, h, 0) === true) { I.held[0] = true; I.pressed[0] = true; }
  } else if (goal) {
    if (!goal.stay || Math.hypot(goal.x - h.x, goal.z - h.z) > 3) steerTo(w, h, goal.x, goal.z, I, st, goal.pick ? 0.3 : 1.2);
  }
  if (goal && goal.use && Math.hypot(goal.x - h.x, goal.z - h.z) < 2.2) { I.interact = true; I.interactHold = true; }
  // wedged against a corner: recentre in the cell for a moment
  if (mem.still > 0.4 && (I.mx || I.mz)) { h.botSrc += '+recentre'; const cx = Math.floor(h.x) + 0.5 - h.x, cz = Math.floor(h.z) + 0.5 - h.z; const l = Math.hypot(cx, cz); if (l > 0.08) { I.mx = cx / l; I.mz = cz / l; } if (mem.still > 1.0) mem.still = 0; }
  // loot (not while rushing a goal)
  if (!target && !(goal && goal.force)) {
    let bestD = null, bdd = 1e9;
    mem.lastDrop = 0;
    for (const d of w.drops) { if (d.dead || (d.owner != null && d.owner !== h.seat) || mem.ignore.get('d' + d.id) > w.t) continue; if (d.kind === 'item' && h.inv.length >= 40) continue; const dd = Math.hypot(d.x - h.x, d.z - h.z); if (dd < 14 && dd < bdd) { bdd = dd; bestD = d; } }
    if (bestD) { if (mem.prevDrop !== bestD.id) mem.t = w.t; mem.prevDrop = bestD.id; mem.lastDrop = bestD.id; steerTo(w, h, bestD.x, bestD.z, I, st, 0.35); }
  }
  h.wantMove = !!(I.mx || I.mz);
  return I;
}
function steerTo(w, h, gx, gz, I, st, stop = 1.2) {
  const nav = w.navs[h.seat % 4] || w.zone.nav;
  nav.flowTo(gx, gz);
  const o = [0, 0];
  const dx = gx - h.x, dz = gz - h.z, d = Math.hypot(dx, dz);
  if (d < stop) return;
  if (w.zone.nav.lineOfSight(h.x, h.z, gx, gz, 0.42)) { I.mx = dx / d; I.mz = dz / d; return; }
  if (nav.flowDirection(h.x, h.z, o)) { const nx = Math.floor(h.x) + 0.5 + Math.round(o[0]), nz = Math.floor(h.z) + 0.5 + Math.round(o[1]); const ax = nx - h.x, az = nz - h.z, l = Math.hypot(ax, az) || 1; if (l < 0.15) { I.mx = o[0]; I.mz = o[1]; } else { I.mx = ax / l; I.mz = az / l; } } else { I.mx = dx / d; I.mz = dz / d; }
}
