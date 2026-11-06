import { dist } from './field.js';

function scale(sim) {
  return sim.beatScale() * sim.tuning.strainSpeedMult;
}

export function stepStrains(sim, dt) {
  const beats = sim.beatEvents || [];
  for (const e of sim.entities) {
    if (!e.alive) continue;
    if (e.stunned > 0) {
      e.stunned -= dt;
      if (e.kind === 'adagio' && e.stunned <= 0 && e.hp <= 0 && !e.tray && !e.holder) {
        e.hp = 40 * sim.hpScale;
        e.grabbable = false;
        sim.events.push({ type: 'wake', id: e.id });
      }
      continue;
    }
    switch (e.kind) {
      case 'adagio': stepAdagio(sim, e, dt, beats); break;
      case 'hole':
      case 'nest': stepHole(sim, e, beats); break;
      case 'note': stepNote(sim, e, beats); break;
      case 'spore': sim.hurt(0.3 * dt, 'spore'); break;
      case 'scratch': sim.hurt((e.rate || 0.5) * dt, 'scratch'); break;
      case 'tremolo': stepTremolo(sim, e, dt); break;
      case 'legato': stepLegato(sim, e, beats); break;
      case 'crescendo': stepCrescendo(sim, e, dt, beats); break;
      case 'fermata': stepFermata(sim, e, dt); break;
      case 'coda': stepCoda(sim, e, dt, beats); break;
      case 'bleeder': stepBleeder(sim, e, dt); break;
      case 'pool': stepPool(sim, e, dt); break;
      default: break;
    }
  }
  for (const seat of sim.seats) if (seat.syringeCd > 0) seat.syringeCd -= dt;
  if (sim.hintT != null) sim.hintT += dt;
}

function stepAdagio(sim, e, dt, beats) {
  const spd = 0.12 * scale(sim);
  e.along = (e.along || 0) + spd * dt;
  const path = e.path;
  if (path?.length) {
    const p = walk(path, e.along);
    e.x = p.x;
    e.y = p.y;
  }
  const pos = sim.beat.count % 4;
  // Beats 3 and 4: count 3, 7… and count 4, 8… (count is 0 before the first beat).
  e.core = sim.beat.count > 0 && (pos === 0 || pos === 3);
  for (const b of beats) {
    if (b.beatInBar === 1 && (e.scratches || 0) < 3) {
      e.scratches = (e.scratches || 0) + 1;
      sim.spawn({ kind: 'scratch', site: e.site, at: [e.x, e.y], rate: 0.5 });
    }
    if (e.grande && b.beatInBar === 1 && b.bar % 2 === 0) {
      const open = sim.entities.filter((x) => x.alive && x.kind === 'bleeder').length;
      if (open < 3) sim.spawn({ kind: 'bleeder', site: e.site, at: [e.x + 0.15, e.y] });
    }
  }
  e.need = e.hp > 0 ? 'laser' : 'forceps';
  e.grabbable = e.hp <= 0;
}

function walk(path, along) {
  let left = along;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    const len = Math.hypot(dx, dy) || 1e-6;
    if (left <= len) return { x: path[i - 1][0] + (dx / len) * left, y: path[i - 1][1] + (dy / len) * left };
    left -= len;
  }
  const a = path[path.length - 1];
  const b = path[0];
  return { x: a[0] + (b[0] - a[0]) * 0.0, y: a[1] };
}

function stepHole(sim, e, beats) {
  if (e.sealed) return;
  e.need = e.hidden && !e.marked ? 'scanner' : 'gel';
  if (e.hidden && !e.marked) return;
  if (e.quota && (e.spawned || 0) >= e.quota) return;
  for (const b of beats) {
    if (b.beatInBar === 2 || b.beatInBar === 4) {
      const n = Math.max(1, Math.round(sim.tuning.spawnRateMult));
      for (let i = 0; i < n; i++) {
        if (e.quota && (e.spawned || 0) >= e.quota) break;
        e.spawned = (e.spawned || 0) + 1;
        sim.spawn({
          kind: 'note',
          site: e.site,
          at: [e.x + (i - 0.5) * 0.08, e.y + 0.06],
          born: sim.beat.count,
        });
      }
    }
  }
}

function stepNote(sim, e, beats) {
  e.need = 'laser';
  e.grabbable = true;
  const age = sim.beat.count - (e.born || sim.beat.count);
  if (age >= (e.life || 2)) {
    e.alive = false;
    sim.spawn({ kind: 'spore', site: e.site, at: [e.x, e.y] });
    sim.hurt(2, 'burst');
    sim.events.push({ type: 'burst', id: e.id });
  }
}

function stepTremolo(sim, e, dt) {
  if (e.pinned > 0) {
    e.pinned -= dt;
    e.need = 'laser';
    return;
  }
  e.need = 'scanner';
  let fleeing = false;
  for (const seat of sim.seats) {
    if (seat.out || seat.site !== e.site) continue;
    const d = dist(seat.x, seat.y, e.x, e.y);
    if (d < 0.6 && seat.speed > 0.45) {
      fleeing = true;
      const dx = e.x - seat.x;
      const dy = e.y - seat.y;
      const m = Math.hypot(dx, dy) || 1;
      const spd = 0.9 * scale(sim);
      e.x += (dx / m) * spd * dt;
      e.y += (dy / m) * spd * dt;
    }
  }
  e.fleeing = fleeing;
  if (fleeing) sim.hurt(1.5 * dt, 'tremolo');
}

function stepLegato(sim, e, beats) {
  for (const link of e.links) {
    link.need = !link.cut ? (link.index === e.active ? 'scalpel' : 'wait') : link.tray ? 'done' : 'forceps';
    if (link.cut && !link.tray && !link.holder) {
      const age = sim.beat.count - (link.cutAtBeat || sim.beat.count);
      if (age >= 8) {
        link.cut = false;
        link.free = false;
        e.active = link.index;
        sim.events.push({ type: 'reattach', id: e.id });
      }
    }
  }
  for (const b of beats) {
    if (b.beat % 8 === 0) {
      const open = sim.entities.filter((x) => x.alive && x.kind === 'bleeder').length;
      if (open < 4 && sim.clampsUsed < 4) sim.spawn({ kind: 'bleeder', site: e.site, at: [e.x, e.y] });
      sim.events.push({ type: 'jerk', id: e.id });
    }
  }
  e.need = 'scalpel';
  for (const ent of sim.entities) {
    if (ent.kind !== 'link' || ent.chain !== e.id) continue;
    ent.chainActive = e.active;
    const link = e.links[ent.index];
    if (!link) continue;
    ent.cut = !!link.cut;
    ent.x = link.x;
    ent.y = link.y;
    ent.grabbable = !!(link.cut && !link.tray);
    ent.embedded = false;
    ent.need = link.cut ? (link.tray ? 'done' : 'forceps') : (ent.index === e.active ? 'scalpel' : 'wait');
    if (link.tray) ent.alive = false;
  }
  if (e.links.length && e.links.every((l) => l.tray)) {
    e.alive = false;
    e.tray = true;
  }
}

function stepCrescendo(sim, e, dt, beats) {
  const live = sim.entities.filter((f) => f.alive && f.kind === 'feeder' && f.parent === e.id);
  if (!e.exposed) {
    const growDt = dt * sim.beatScale();
    e.size = Math.min(1, e.size + (0.02 + 0.015 * live.length) * growDt);
    sim.hurt((1 + 6 * e.size) * growDt, 'crescendo');
    if (e.size >= 1) {
      e.size = 0.6;
      sim.hurt(20, 'fortissimo');
      sim.spawn({ kind: 'bleeder', site: e.site, at: [e.x - 0.2, e.y] });
      sim.spawn({ kind: 'bleeder', site: e.site, at: [e.x + 0.2, e.y] });
      sim.events.push({ type: 'fortissimo', id: e.id });
    }
    for (const b of beats) {
      if (b.beat % 16 === 0 && live.length < 4) {
        const missing = 4 - live.length;
        for (let i = 0; i < missing; i++) {
          sim.spawn({
            kind: 'feeder',
            site: e.site,
            parent: e.id,
            at: [e.x + Math.cos(i) * 0.25, e.y + Math.sin(i) * 0.18],
            hp: 40,
          });
        }
      }
    }
    if (live.length === 0 && e.armed) {
      e.exposed = true;
      e.need = 'scalpel';
      sim.spawn({
        kind: 'circleCut',
        site: e.site,
        at: [e.x, e.y],
        points: circle(e.x, e.y, 0.22),
      });
    }
    e.armed = true;
  } else {
    e.size = Math.max(0.2, e.size - 0.15 * dt);
    const cut = sim.entities.find((c) => c.kind === 'circleCut' && c.site === e.site && !c.alive);
    if (cut && !e.revealed) {
      e.revealed = true;
      e.grabbable = true;
      e.need = 'forceps';
      e.embedded = true;
      e.embed = e.embed || 0.35;
      e.axis = 90;
    }
  }
}

function circle(x, y, r) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7]);
  }
  return pts;
}

function stepFermata(sim, e, dt) {
  if (!sim.arrest && e.stage === 'attack') {
    sim.arrest = {
      clock: 8,
      tutorial: !!e.tutorial,
      stopsBeat: true,
      holdVitals: true,
      source: e.id,
      savedVitals: sim.vitals,
    };
    sim.vitals = Math.min(sim.vitals, 15);
    sim.events.push({ type: 'arrest', id: e.id });
    e.stage = 'open';
  }
  if (sim.arrest && sim.arrest.source === e.id) {
    const clockScale = sim.hushPhase === 'wash' ? sim.tuning.hushTimeScale : 1;
    if (sim.hushPhase !== 'inhale') sim.arrest.clock -= dt * clockScale;
    sim.vitals = 15;
    if (sim.arrest.clock <= 0 && !sim.noFail && !sim.lockFail) sim.fail('vitals');
  }
  if (!sim.arrest && e.stage === 'open') {
    e.stage = 'between';
    e.arrests = (e.arrests || 0) + 1;
    if (e.arrests >= (e.needed || 1) && e.hp <= 0) {
      e.grabbable = true;
      e.need = 'forceps';
      e.embedded = true;
      e.embed = 0.45;
      e.axis = 90;
    }
  }
  e.eye = true;
  e.need = e.hp > 0 && sim.arrest ? 'laser' : e.grabbable ? 'forceps' : 'wait';
}

function stepCoda(sim, e, dt, beats) {
  const beatInBar = sim.beat.phase >= 0 ? ((sim.beat.count % 4) || 4) : 1;
  // Wind-up is the beat before downbeat: beat 4 telegraphs beat 1.
  const telegraph = (sim.beat.count % 4) === 0;
  e.windup = telegraph;
  for (const arm of e.arms || []) {
    arm.windup = telegraph;
    arm.need = telegraph ? 'laser' : 'wait';
    if (telegraph && arm.hp == null) arm.hp = 30;
  }
  for (const b of beats) {
    if (b.beatInBar === 1) {
      const armsNow = sim.entities.filter((a) => a.kind === 'baton' && a.parent === e.id);
      const blocked = armsNow.some((a) => a.hp <= 0);
      if (!blocked) {
        sim.hurt(6, 'downbeat');
        sim.spawn({ kind: 'scratch', site: e.site, at: [e.x, e.y - 0.1], rate: 0.4 });
        sim.events.push({ type: 'downbeat', id: e.id });
      }
      for (const a of armsNow) a.hp = 9;
    }
    if (b.beatInBar === 3) {
      sim.spawn({ kind: 'note', site: e.site, at: [e.x + 0.2, e.y], born: sim.beat.count, life: 5 });
      sim.events.push({ type: 'cue', id: e.id });
    }
    if (b.bar % 4 === 0 && b.beatInBar === 1) {
      e.coreOpen = true;
      e.coreTimer = 3;
    }
  }
  if (e.coreOpen) {
    e.coreTimer -= beats.length;
    if (e.coreTimer <= 0) e.coreOpen = false;
  }
  const arms = sim.entities.filter((a) => a.alive && a.kind === 'baton' && a.parent === e.id);
  e.arms = arms;
  if (e.hp <= 0 && !e.downed) {
    e.downed = true;
    e.grabbable = true;
    e.embedded = true;
    e.embed = 0.6;
    e.axis = 90;
    e.need = 'forceps';
  } else if (e.hp > 0) {
    e.need = e.coreOpen ? 'laser' : (telegraph ? 'laser' : 'wait');
    const ratio = e.hp / e.maxHp;
    if (!e.moved66 && ratio <= 0.66) {
      e.moved66 = true;
      moveCoda(sim, e);
    } else if (!e.moved33 && ratio <= 0.33) {
      e.moved33 = true;
      moveCoda(sim, e);
    }
  }
}

function moveCoda(sim, e) {
  const sites = sim.op.sites.map((s) => s.id);
  const i = sites.indexOf(e.site);
  e.site = sites[(i + 1) % sites.length];
  for (const a of sim.entities) if (a.kind === 'baton' && a.parent === e.id) a.alive = false;
  sim.spawn({ kind: 'baton', site: e.site, parent: e.id, at: [e.x - 0.28, e.y], hp: 9 });
  sim.spawn({ kind: 'baton', site: e.site, parent: e.id, at: [e.x + 0.28, e.y], hp: 9 });
  sim.events.push({ type: 'codaMove', site: e.site });
}

function stepBleeder(sim, e, dt) {
  if (e.clamped) {
    e.need = 'wait';
    return;
  }
  e.need = 'clamp';
  const world = sim.drainScale();
  sim.hurt(1 * dt * world, 'bleed');
  if (!e.pool) {
    const pool = sim.spawn({ kind: 'pool', site: e.site, at: [e.x, e.y + 0.05], vol: 0.2, cap: 0.55 });
    e.pool = pool.id;
  }
  const pool = sim.entities.find((p) => p.id === e.pool && p.alive);
  if (pool) pool.vol += 0.35 * dt * world;
}

function stepPool(sim, e, dt) {
  if (e.vol > e.cap) {
    e.overflowed = true;
    e.covers = true;
    sim.hurt(0.4 * dt * sim.drainScale(), 'overflow');
    for (const g of sim.entities) {
      if (g.alive && g.site === e.site && dist(g.x, g.y, e.x, e.y) < 0.2 && g.kind !== 'pool') g.covered = true;
    }
    if ((sim.overflowBark || 0) <= 0) {
      sim.bark('overflow');
      sim.overflowBark = 4;
    }
  }
  if (sim.overflowBark > 0) sim.overflowBark -= dt;
}

export function hpOf(base, sim) {
  return base * sim.tuning.strainHpMult * sim.mods.hp * sim.grHp;
}
