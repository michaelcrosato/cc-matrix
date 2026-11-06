import { IV, overTray } from './field.js';
import { makeRng } from './rng.js';

const TRAY_AIM = { x: 1.58, y: 0.2 };
const RASTER = raster();

function raster() {
  const pts = [];
  const ys = [0.55, 0.18, -0.18, -0.55];
  const xs = [-1, -0.5, 0, 0.5, 1];
  ys.forEach((y, row) => {
    const line = row % 2 ? [...xs].reverse() : xs;
    for (const x of line) pts.push([x, y]);
  });
  return pts;
}

const roots = new WeakMap();

function rootOf(sim) {
  let root = roots.get(sim);
  if (!root) {
    root = { tick: -1, state: null, claims: new Set(), seats: new Map() };
    roots.set(sim, root);
  }
  return root;
}

function seatMem(root, id) {
  let mem = root.seats.get(id);
  if (!mem) {
    mem = { rng: makeRng(9000 + id * 17), queue: [], paths: new Map(), raster: 0, dwell: 0, phase: null };
    root.seats.set(id, mem);
  }
  return mem;
}

function magFor(want, tuning, steady) {
  const cruise = tuning.tipSpeed * (steady ? tuning.steadyFactor : 1);
  const ratio = Math.min(1, Math.max(0, want / cruise));
  return Math.min(1, ratio ** (1 / tuning.stickCurve));
}

function steer(me, tx, ty, want, tuning, opts, steady = false) {
  const dx = tx - me.x;
  const dy = ty - me.y;
  const d = Math.hypot(dx, dy);
  const delay = opts.reactionDelay || 0;
  const slowR = Math.max(0.08, want * (delay + 0.12));
  let speed = want;
  if (d < slowR) speed = Math.min(want, Math.max(0.08, d / (delay + 0.1)));
  if (d < 0.012) return { source: 'stick', x: 0, y: 0, use: 0, steady };
  const mag = magFor(speed, tuning, steady);
  if (mag < 0.13) return { source: 'stick', x: 0, y: 0, use: 0, steady };
  return { source: 'stick', x: (dx / d) * mag, y: (dy / d) * mag, use: 0, steady };
}

function pointAlong(points, distAlong) {
  let left = Math.max(0, distAlong);
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const len = Math.hypot(dx, dy) || 1e-6;
    if (left <= len) return [points[i - 1][0] + (dx / len) * left, points[i - 1][1] + (dy / len) * left];
    left -= len;
  }
  const last = points[points.length - 1];
  return [last[0], last[1]];
}

function gelPath(rect) {
  if (!rect) return [[0, 0]];
  const [x0, y0, x1, y1] = rect;
  const pts = [];
  let row = 0;
  for (let y = y0 + 0.04; y <= y1 - 0.02; y += 0.12, row++) {
    const xa = x0 + 0.04;
    const xb = x1 - 0.04;
    if (row % 2 === 0) pts.push([xa, y], [xb, y]);
    else pts.push([xb, y], [xa, y]);
  }
  if (!pts.length) pts.push([(x0 + x1) / 2, (y0 + y1) / 2]);
  return pts;
}

function goTool(frame, tool, use) {
  frame.tool = tool;
  if (use != null) frame.use = use;
  return frame;
}

function hold(tool, use, extra) {
  return { source: 'stick', x: 0, y: 0, use, tool, steady: false, ...extra };
}

function candidates(state, me, opts) {
  const list = [];
  const tethers = new Set(state.entities.filter((t) => t.kind === 'tether' && !t.cut).map((t) => t.site));
  for (const e of state.entities) {
    if (e.holder != null || e.site === 'tray') continue;
    let job = null;
    let prio = 0;
    if (e.kind === 'bleeder' && !e.clamped) {
      const closing = /^close\b/i.test(state.objective || '') || state.flags?.closing || state.flags?.needUnclamp;
      if (!closing) { job = 'clamp'; prio = 90; }
    }
    else if (e.kind === 'note') { job = 'grab'; prio = 88; }
    else if (e.kind === 'spore' || e.kind === 'scratch') { job = 'spot'; prio = 84; }
    else if (e.kind === 'tremolo') { job = e.pinned > 0 ? 'beam' : 'tremolo'; prio = 80; }
    else if (e.kind === 'feeder') {
      job = 'beam';
      // A delayed hand that stops to clamp lets the swelling finish the patient.
      const slow = (opts?.reactionDelay || 0) > 0;
      prio = slow || state.vitals >= 55 ? 94 : 86;
    }
    else if (e.kind === 'baton' && e.hp > 0 && e.windup) { job = 'beam'; prio = 96; }
    else if (e.kind === 'baton' && e.hp > 0 && state.beatInBar === 3) { job = 'approach'; prio = 93; }
    else if (e.kind === 'coda' && e.hp > 0 && e.coreOpen) { job = 'beam'; prio = 97; }
    else if (e.kind === 'coda' && e.hp > 0) { job = 'wait'; prio = 64; }
    else if (e.kind === 'coda' && e.grabbable) { job = 'grab'; prio = 70; }
    else if (e.kind === 'adagio' && e.hp > 0) { job = e.core ? 'beam' : 'wait'; prio = e.core ? 93 : 8; }
    else if (e.kind === 'adagio' && e.grabbable) { job = 'grab'; prio = 71; }
    else if (e.kind === 'fermata' && e.grabbable) { job = 'grab'; prio = 71; }
    else if (e.kind === 'crescendo' && e.grabbable) { job = 'grab'; prio = 71; }
    else if (e.kind === 'link' && e.grabbable) { job = 'grab'; prio = 94; }
    else if (e.kind === 'link' && !e.cut && e.index === e.chainActive) { job = 'swipe'; prio = 75; }
    else if (e.kind === 'tether' && !e.cut) { job = 'swipe'; prio = 74; }
    else if ((e.kind === 'shard' || e.kind === 'tumor' || e.kind === 'ring') && e.grabbable) {
      if ((e.kind === 'tumor' || e.kind === 'ring') && tethers.has(e.site)) continue;
      job = 'grab'; prio = 65;
    }
    else if (e.kind === 'incision' || e.kind === 'circleCut') { job = 'cut'; prio = 60; }
    else if (e.kind === 'nodule' || e.kind === 'egg') { job = 'beam'; prio = 67; }
    else if (e.kind === 'hole' || e.kind === 'nest') { job = 'spot'; prio = 63; }
    else if (e.kind === 'pool') { job = 'suction'; prio = 61; }
    else if (e.kind === 'wound') { job = 'suture'; prio = 56; }
    else if (e.kind === 'injection') { job = 'inject'; prio = 52; }
    else if (e.kind === 'gelZone') { job = 'gelzone'; prio = 42; }
    if (!job) continue;
    const dist = Math.hypot((e.x || 0) - me.x, (e.y || 0) - me.y);
    const sitePenalty = e.site === me.site ? 0 : 12;
    list.push({ e, job, score: prio - sitePenalty - dist * 0.02 });
  }
  list.sort((a, b) => b.score - a.score);
  return list;
}

function actOn(state, me, job, e, mem, tuning, opts) {
  if (e.site && e.site !== me.site && e.site !== 'tray') {
    const idx = state.sites.indexOf(e.site);
    const f = steer(me, e.x || 0, e.y || 0, 0.6, tuning, opts);
    if (idx >= 0) f.site = idx;
    f.use = 0;
    return f;
  }
  if (job === 'clamp') return pulseClamp(me, e, mem, tuning, opts);
  if (job === 'grab') return grab(me, e, tuning, opts);
  if (job === 'beam') return beam(me, e, tuning, opts);
  if (job === 'approach') return approach(me, e, tuning, opts);
  if (job === 'tremolo') return tremolo(me, e, tuning, opts);
  if (job === 'spot') return spot(me, e, e.kind === 'spore' || e.kind === 'scratch' || e.kind === 'hole' || e.kind === 'nest' ? 'gel' : 'gel', tuning, opts);
  if (job === 'swipe') return swipe(me, e, mem, tuning, opts);
  if (job === 'cut') return cutPoly(me, e, tuning, opts);
  if (job === 'suction') return spot(me, e, 'suction', tuning, opts);
  if (job === 'suture') return sew(me, e, tuning, opts);
  if (job === 'inject') return syringeAt(me, e.x, e.y, tuning, opts);
  if (job === 'gelzone') return paintZone(me, e, mem, tuning, opts);
  if (job === 'wait') return goTool(steer(me, e.x, e.y, 0.85, tuning, opts), 'laser', 0);
  return hold('gel', 0);
}

function pulseClamp(me, e, mem, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  if (d > 0.045) return goTool(steer(me, e.x, e.y, 0.75, tuning, opts), 'clamp', 0);
  if (mem.pulsed === e.id) {
    mem.pulsed = 0;
    return hold('clamp', 0);
  }
  mem.pulsed = e.id;
  return hold('clamp', 1);
}

function grab(me, e, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  const delay = opts.reactionDelay || 0;
  if (delay > 0) {
    // The grip is queued. Press while still closing so it lands inside the 0.1 radius.
    if (d > 0.22) return goTool(steer(me, e.x, e.y, 0.85, tuning, opts), 'forceps', 0);
    if (d > 0.06) return goTool(steer(me, e.x, e.y, 0.55, tuning, opts), 'forceps', 1);
    return hold('forceps', 1);
  }
  if (d > 0.04) return goTool(steer(me, e.x, e.y, 0.85, tuning, opts), 'forceps', 0);
  return hold('forceps', 1);
}

function parkOn(me, e, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  if (d > 0.04) return goTool(steer(me, e.x, e.y, 1.05, tuning, opts), 'laser', 0);
  return hold('laser', 0);
}

function beamCore(me, e, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  const delay = opts.reactionDelay || 0;
  if (delay > 0) {
    // Brake early: the queued sprint otherwise carries the tip through the core.
    if (d > 0.22) return goTool(steer(me, e.x, e.y, 1.05, tuning, opts), 'laser', 1);
    return hold('laser', 1);
  }
  return beam(me, e, tuning, opts);
}

function beamBaton(me, e, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  const delay = opts.reactionDelay || 0;
  if (d > 0.025) {
    const want = d > 0.22 ? 1.05 : 0.72;
    // Arm one reaction early so the beam is already on when the tip arrives.
    const arm = 0.03 + want * delay;
    return goTool(steer(me, e.x, e.y, want, tuning, opts), 'laser', d < arm ? 1 : 0);
  }
  return hold('laser', 1);
}

function tendBaton(state, me, bat, tuning, opts) {
  if (bat.site && bat.site !== me.site) {
    const idx = state.sites.indexOf(bat.site);
    const f = steer(me, bat.x || 0, bat.y || 0, 0.9, tuning, opts);
    if (idx >= 0) f.site = idx;
    f.use = 0;
    return f;
  }
  const noteNear = state.entities.some((e) => e.kind === 'note' && e.site === bat.site && Math.hypot((e.x || 0) - (bat.x || 0), (e.y || 0) - (bat.y || 0)) <= 0.2);
  // Beat 4 keeps the beam hot so the reset arm dies before the next downbeat.
  const preheat = state.beatInBar === 4 || state.beatInBar === 1;
  if ((bat.hp || 0) <= 0 && !noteNear && !preheat) return parkOn(me, bat, tuning, opts);
  return beamBaton(me, bat, tuning, opts);
}

function approach(me, e, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  const delay = opts.reactionDelay || 0;
  // The wind-up is one beat. A delayed hand has to be on the baton before it starts.
  const want = delay > 0 ? (d > 0.12 ? 1.05 : 0.65) : (d > 0.2 ? 0.9 : 0.2);
  const f = steer(me, e.x, e.y, want, tuning, opts);
  return goTool(f, 'laser', 0);
}

function beam(me, e, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  const delay = opts.reactionDelay || 0;
  if (delay > 0) {
    // Fire on the way in. The queued beam then meets the target instead of starting late.
    if (d > 0.18) return goTool(steer(me, e.x, e.y, 0.95, tuning, opts), 'laser', 0);
    if (d > 0.04) return goTool(steer(me, e.x, e.y, 0.7, tuning, opts), 'laser', 1);
    return hold('laser', 1);
  }
  if (d > 0.03) {
    const f = steer(me, e.x, e.y, d > 0.25 ? 0.9 : 0.32, tuning, opts);
    return goTool(f, 'laser', d < 0.04 ? 1 : 0);
  }
  return hold('laser', 1);
}

function tremolo(me, e, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  const f = steer(me, e.x, e.y, d < 0.75 ? 0.3 : 1.05, tuning, opts);
  return goTool(f, 'scanner', d < 0.2 ? 1 : 0);
}

function spot(me, e, tool, tuning, opts) {
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  if (d > 0.05) return goTool(steer(me, e.x, e.y, 0.8, tuning, opts), tool, 0);
  return hold(tool, 1);
}

function swipe(me, e, mem, tuning, opts) {
  const x1 = e.x1 ?? e.x;
  const y1 = e.y1 ?? e.y;
  const x2 = e.x2 ?? e.x;
  const y2 = e.y2 ?? e.y;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const vertical = Math.abs(y2 - y1) > Math.abs(x2 - x1);
  const ox = vertical ? 0.05 : 0;
  const oy = vertical ? 0 : 0.05;
  if (mem.swipeId !== e.id) { mem.swipeId = e.id; mem.swipe = 0; }
  const fromX = mx - ox;
  const fromY = my - oy;
  const toX = mx + ox;
  const toY = my + oy;
  if (mem.swipe === 0) {
    const f = steer(me, fromX, fromY, 0.7, tuning, opts);
    if (Math.hypot(me.x - fromX, me.y - fromY) < 0.03) mem.swipe = 1;
    return goTool(f, 'scalpel', 0);
  }
  const f = steer(me, toX, toY, 1.2, tuning, opts);
  if (Math.hypot(me.x - toX, me.y - toY) < 0.03) mem.swipe = 0;
  return goTool(f, 'scalpel', 1);
}

function cutPoly(me, e, tuning, opts) {
  const pts = e.points;
  if (!pts?.length) return hold('scalpel', 0);
  if (!e.started) {
    const d = Math.hypot(me.x - pts[0][0], me.y - pts[0][1]);
    if (d > 0.032) return goTool(steer(me, pts[0][0], pts[0][1], 0.5, tuning, opts), 'scalpel', 0);
    return hold('scalpel', 1);
  }
  const target = pointAlong(pts, (e.along || 0) + 0.12);
  return goTool(steer(me, target[0], target[1], 0.48, tuning, opts), 'scalpel', 1);
}

function sew(me, e, tuning, opts) {
  if (e.readyTie || !e.gates?.length) return hold('suture', 0);
  const g = e.gates[e.gate || 0];
  if (!g) return hold('suture', 0);
  const d = Math.hypot(me.x - g.x, me.y - g.y);
  if (d > 0.03) return goTool(steer(me, g.x, g.y, 0.46, tuning, opts), 'suture', 0);
  return hold('suture', 1);
}

function syringeAt(me, x, y, tuning, opts) {
  const d = Math.hypot(me.x - x, me.y - y);
  if (d > 0.06) {
    const f = steer(me, x, y, 1.15, tuning, opts);
    f.syringe = false;
    return f;
  }
  return { source: 'stick', x: 0, y: 0, use: 0, syringe: true };
}

function paintZone(me, e, mem, tuning, opts) {
  let rec = mem.paths.get(e.id);
  if (!rec) {
    rec = { i: 0, pts: gelPath(e.rect) };
    mem.paths.set(e.id, rec);
  }
  const p = rec.pts[Math.min(rec.i, rec.pts.length - 1)];
  const f = steer(me, p[0], p[1], 0.58, tuning, opts);
  if (Math.hypot(me.x - p[0], me.y - p[1]) < 0.05 && rec.i < rec.pts.length - 1) rec.i += 1;
  return goTool(f, 'gel', 1);
}

function carry(me, held, tuning, opts) {
  if (held.embedded) {
    const axis = ((held.axis ?? 0) * Math.PI) / 180;
    const mag = magFor(0.62, tuning, false);
    return {
      source: 'stick', x: Math.cos(axis) * mag, y: Math.sin(axis) * mag, use: 1, tool: 'forceps',
    };
  }
  if (overTray(me.x, me.y)) return hold('forceps', 0);
  return goTool(steer(me, TRAY_AIM.x, TRAY_AIM.y, 1.35, tuning, opts), 'forceps', 1);
}

function shock(me, opts) {
  const delay = opts.reactionDelay || 0;
  const releaseAt = Math.max(0.5, 1.16 - delay);
  if ((me.charge || 0) < releaseAt) return { source: 'stick', x: 0, y: 0, use: 1, steady: true, tool: me.tool };
  return { source: 'stick', x: 0, y: 0, use: 0, steady: false, tool: me.tool };
}

function scan(state, me, mem, tuning, opts) {
  if (mem.phase !== state.phase) {
    mem.phase = state.phase;
    mem.raster = 0;
    mem.dwell = 0;
    mem.sitePass = Math.max(0, state.sites.indexOf(me.site));
  }
  const site = state.sites[mem.sitePass % state.sites.length];
  if (me.site !== site) {
    return { source: 'stick', x: 0, y: 0, use: 0, tool: 'scanner', site: mem.sitePass % state.sites.length };
  }
  const p = RASTER[Math.min(mem.raster, RASTER.length - 1)];
  const d = Math.hypot(me.x - p[0], me.y - p[1]);
  const f = steer(me, p[0], p[1], 0.7, tuning, opts);
  if (d < 0.08) {
    mem.dwell += 1 / 60;
    if (mem.dwell >= 0.7) {
      mem.dwell = 0;
      mem.raster += 1;
      if (mem.raster >= RASTER.length) {
        mem.raster = 0;
        mem.sitePass += 1;
      }
    }
  }
  return goTool(f, 'scanner', 1);
}

function unclamp(me, e, mem, tuning, opts, state) {
  if (e.site && state && e.site !== me.site && e.site !== 'tray') {
    const idx = state.sites.indexOf(e.site);
    const f = steer(me, e.x, e.y, 0.6, tuning, opts);
    if (idx >= 0) f.site = idx;
    f.use = 0;
    f.alt = false;
    return f;
  }
  const d = Math.hypot(me.x - e.x, me.y - e.y);
  if (d > 0.05) {
    const f = steer(me, e.x, e.y, 0.7, tuning, opts);
    f.alt = false;
    return f;
  }
  if (mem.altId === e.id) {
    mem.altId = 0;
    return { source: 'stick', x: 0, y: 0, use: 0, alt: false };
  }
  mem.altId = e.id;
  return { source: 'stick', x: 0, y: 0, use: 0, alt: true, tool: 'forceps' };
}

function decide(state, me, mem, opts, claims) {
  const tuning = state.tuning;
  const held = state.entities.find((e) => e.holder === me.id);
  if (held) return carry(me, held, tuning, opts);

  if (state.arrest) {
    const eye = state.entities.find((e) => e.kind === 'fermata' && e.hp > 0);
    if (eye && !state.arrest.tutorial) {
      if (eye.site && eye.site !== me.site) {
        const idx = state.sites.indexOf(eye.site);
        const f = steer(me, eye.x, eye.y, 0.9, tuning, opts);
        if (idx >= 0) f.site = idx;
        f.use = 0;
        return f;
      }
      return beam(me, eye, tuning, opts);
    }
    return shock(me, opts);
  }

  const bleeding = state.entities.some((e) => e.kind === 'bleeder' && !e.clamped);
  const coreNow = state.entities.some((e) => (e.kind === 'coda' && e.coreOpen) || (e.kind === 'adagio' && e.hp > 0 && e.core));
  const codaUp = state.entities.some((e) => e.kind === 'coda' && e.hp > 0);
  const windup = state.entities.some((e) => e.kind === 'baton' && e.hp > 0 && e.windup);
  if (codaUp && (me.composure || 0) >= 100 && state.vitals < 62 && !coreNow) {
    return { source: 'stick', x: 0, y: 0, use: 0, special: true, tool: me.tool };
  }
  const swelling = state.entities.some((e) => e.kind === 'crescendo' && !e.exposed);
  const slow = (opts.reactionDelay || 0) > 0;
  // The downed conductor still strikes until it is on the tray. Pull it before anything else.
  if (slow) {
    const downed = state.entities.find((e) => e.kind === 'coda' && !(e.hp > 0) && e.grabbable && e.holder == null);
    if (downed) {
      const arms = state.entities.filter((e) => e.kind === 'baton');
      if (arms.length && !arms.some((a) => !(a.hp > 0))) {
        const pool = arms.filter((a) => a.hp > 0);
        const bat = (pool.length ? pool : arms).slice().sort((a, b) => {
          const da = Math.hypot(a.x - me.x, a.y - me.y) + (a.site === me.site ? 0 : 3) + (a.x < 0 ? 0.35 : 0);
          const db = Math.hypot(b.x - me.x, b.y - me.y) + (b.site === me.site ? 0 : 3) + (b.x < 0 ? 0.35 : 0);
          return da - db;
        })[0];
        mem.batonId = bat.id;
        return tendBaton(state, me, bat, tuning, opts);
      }
      if (downed.site && downed.site !== me.site) {
        const idx = state.sites.indexOf(downed.site);
        const f = steer(me, downed.x || 0, downed.y || 0, 1.05, tuning, opts);
        if (idx >= 0) f.site = idx;
        f.use = 0;
        return f;
      }
      return grab(me, downed, tuning, opts);
    }
  }
  // A delayed hand that leaves the conductor for the IV misses the baton and eats the downbeat.
  const healAt = codaUp ? (slow ? 12 : 46) : (swelling && slow ? 8 : 40);
  const holdPost = slow && codaUp && (
    state.beatInBar === 1 || state.beatInBar === 4
    || state.entities.some((e) => e.id === mem.batonId && e.kind === 'baton' && e.hp > 0)
  );
  if (!holdPost && !coreNow && !(codaUp && windup) && state.vitals < healAt && (me.syringeCd || 0) <= 0 && (!bleeding || state.vitals < 22)) {
    return syringeAt(me, IV.x, IV.y, tuning, opts);
  }

  if (!codaUp && (me.composure || 0) >= 100 && state.vitals < 50) {
    return { source: 'stick', x: 0, y: 0, use: 0, special: true, tool: me.tool };
  }

  if (slow && coreNow) {
    const core = state.entities.find((e) => (e.kind === 'coda' && e.coreOpen) || (e.kind === 'adagio' && e.hp > 0 && e.core));
    if (core) {
      if (core.kind === 'coda') {
        const arm = state.entities.find((e) => e.id === mem.batonId && e.kind === 'baton' && e.hp > 0);
        if (arm) return tendBaton(state, me, arm, tuning, opts);
      }
      if (core.site && core.site !== me.site) {
        const idx = state.sites.indexOf(core.site);
        const f = steer(me, core.x || 0, core.y || 0, 1.1, tuning, opts);
        if (idx >= 0) f.site = idx;
        f.use = 0;
        return f;
      }
      return core.kind === 'coda' ? beamCore(me, core, tuning, opts) : beam(me, core, tuning, opts);
    }
  }

  if (slow && codaUp && !coreNow) {
    // Stay on the +x arm after it drops to 0. A dead arm still blocks the downbeat,
    // and the cue note sits beside it. Retarget only when that arm is gone.
    const allBats = state.entities.filter((e) => e.kind === 'baton');
    let bat = allBats.find((b) => b.id === mem.batonId);
    if (!bat && allBats.length) {
      const live = allBats.filter((b) => b.hp > 0);
      const pool = live.length ? live : allBats;
      bat = pool.slice().sort((a, b) => {
        const da = Math.hypot(a.x - me.x, a.y - me.y) + (a.site === me.site ? 0 : 3) + (a.x < 0 ? 0.35 : 0);
        const db = Math.hypot(b.x - me.x, b.y - me.y) + (b.site === me.site ? 0 : 3) + (b.x < 0 ? 0.35 : 0);
        return da - db;
      })[0];
      mem.batonId = bat.id;
    }
    if (bat) {
      if (bat.site && bat.site !== me.site) {
        const idx = state.sites.indexOf(bat.site);
        const f = steer(me, bat.x || 0, bat.y || 0, 0.9, tuning, opts);
        if (idx >= 0) f.site = idx;
        f.use = 0;
        return f;
      }
      return tendBaton(state, me, bat, tuning, opts);
    }
  }
  if (!codaUp) mem.batonId = 0;

  const list = candidates(state, me, opts).filter((c) => !claims.has(c.e.id));
  if (list.length) {
    const pick = list[0];
    claims.add(pick.e.id);
    return actOn(state, me, pick.job, pick.e, mem, tuning, opts);
  }

  const closing = /^close\b/i.test(state.objective || '') || !!state.flags?.closing || !!state.flags?.needUnclamp;
  if (closing) {
    const clamped = state.entities.find((e) => e.kind === 'bleeder' && e.clamped && !claims.has(e.id));
    if (clamped) {
      claims.add(clamped.id);
      return unclamp(me, clamped, mem, tuning, opts, state);
    }
  }

  const tools = state.phaseTools || [];
  if (tools.includes('syringe') && !state.flags?.stabilized && /stab/i.test(state.objective || '')) {
    return syringeAt(me, IV.x, IV.y, tuning, opts);
  }
  if (tools.includes('scanner') && !closing) return scan(state, me, mem, tuning, opts);
  return { source: 'stick', x: 0, y: 0, use: 0, tool: me.tool || 'gel' };
}

/** One input frame for one seat. Reads `sim.state` only. */
export function botInput(sim, seat, opts = {}) {
  const stateNow = sim.state;
  const root = rootOf(sim);
  if (root.tick !== stateNow.tick) {
    root.tick = stateNow.tick;
    root.state = stateNow;
    root.claims = new Set();
  }
  const state = root.state;
  const id = typeof seat === 'number' ? seat : seat.id;
  const me = state.seats.find((s) => s.id === id);
  if (!me || me.out) return { source: 'stick', x: 0, y: 0, use: 0 };
  const mem = seatMem(root, id);
  const frame = decide(state, me, mem, opts, root.claims);
  if (opts.noise) {
    frame.x = (frame.x || 0) + (mem.rng() - 0.5) * 2 * opts.noise;
    frame.y = (frame.y || 0) + (mem.rng() - 0.5) * 2 * opts.noise;
  }
  const delay = Math.max(0, Math.round((opts.reactionDelay || 0) * 60));
  mem.queue.push(frame);
  if (mem.queue.length <= delay) return { source: 'stick', x: 0, y: 0, use: 0 };
  return mem.queue.shift();
}

/** Drive every seat from the bot until the operation ends. */
export function play(sim, opts = {}, maxSteps = 1e7) {
  let n = 0;
  while (!sim.over && n < maxSteps) {
    const ids = sim.state.seats.map((s) => s.id);
    for (const id of ids) sim.input(id, botInput(sim, { id }, opts));
    sim.step();
    n += 1;
  }
  return n;
}
