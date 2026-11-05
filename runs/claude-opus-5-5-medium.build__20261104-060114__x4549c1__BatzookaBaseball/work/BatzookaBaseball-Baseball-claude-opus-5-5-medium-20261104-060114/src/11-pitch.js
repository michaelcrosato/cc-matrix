/* PITCHING: the catalog (speed factor, break in U at the plate, lateness k, special paths), the parametric flight (the
 * plate crossing is known at release), the windup with the target marker and the release ring, aftertouch, stamina,
 * calls at the zone, the catcher and wild pitches, and the CPU pitcher. */
const PITCHES = {
  heater: { name: 'HEATER', spd: 1, bx: 0, bz: 1.5, k: 1, kind: 'heat', cost: 1.2 },
  curve: { name: 'CURVE', spd: .74, bx: 7, bz: -10, k: 2.2, kind: 'break', cost: 1.6 },
  slider: { name: 'SLIDER', spd: .86, bx: 9, bz: -3, k: 2, kind: 'break', cost: 1.6 },
  changeup: { name: 'CHANGEUP', spd: .66, bx: -3, bz: -6, k: 1.6, kind: 'off', cost: 1 },
  sinker: { name: 'SINKER', spd: .92, bx: -4, bz: -6, k: 1.8, kind: 'off', cost: 1 },
  knuckler: { name: 'KNUCKLER', spd: .6, bx: 0, bz: -3, k: 1.5, kind: 'off', cost: 1, wobble: 2.2 },
  butterfly: { name: 'BUTTERFLY KNUCKLER', spd: .58, bx: 0, bz: -4, k: 1.5, kind: 'sig', cost: 2.2, wobble: 3.6 },
  kernelcannon: { name: 'KERNEL CANNON', spd: 1.15, bx: 0, bz: 2, k: 1, kind: 'sig', cost: 2.2 },
  riptide: { name: 'RIPTIDE CURVE', spd: .78, bx: 6, bz: -8, k: 2, kind: 'sig', cost: 2.2, wave: 4 },
  magmasinker: { name: 'MAGMA SINKER', spd: .9, bx: -2, bz: -10, k: 3, kind: 'sig', cost: 2.2, trail: 'ember' },
  zerog: { name: 'ZERO-G FLOATER', spd: .62, bx: 0, bz: -14, k: 4, kind: 'sig', cost: 2.2 },
  phantomfork: { name: 'PHANTOM FORKBALL', spd: .84, bx: 0, bz: -8, k: 3, kind: 'sig', cost: 2.2, hide: [.35, .8] },
  gigavolt: { name: 'GIGAVOLT HEATER', spd: 1.25, bx: 0, bz: 1, k: 1, kind: 'sig', cost: 2.2, zig: 2, trail: 'spark' },
  // team supers (x1.35 unless stated; the meter pays for them)
  cornpopper: { name: 'CORN POPPER', spd: 1.1, bx: 0, bz: 0, k: 1, kind: 'super', cost: 5, pops: true, trail: 'popcorn' },
  tidalwave: { name: 'TIDAL WAVE', spd: 1.2, bx: 0, bz: 0, k: 1, kind: 'super', cost: 5, tide: 10, trail: 'wave' },
  meteorheater: { name: 'METEOR HEATER', spd: 1.35, bx: 0, bz: 1, k: 1, kind: 'super', cost: 5, trail: 'fire' },
  blackhole: { name: 'BLACK HOLE BALL', spd: 1.15, bx: 0, bz: -3, k: 2, kind: 'super', cost: 5, trail: 'void', pull: true },
  banshee: { name: 'BANSHEE BALL', spd: 1.2, bx: 0, bz: -2, k: 2, kind: 'super', cost: 5, hide: [.08, .85], scream: true },
  overclock: { name: 'OVERCLOCK LASER', spd: 1.5, bx: 0, bz: 0, k: 1, kind: 'super', cost: 5, trail: 'laser', strict: true },
  pitchomatic: { name: 'PITCH-O-MATIC', spd: .8, bx: 0, bz: -1, k: 1.5, kind: 'heat', cost: 0 }
};
const PLATE_Y = HY - 6, BASE_SPEED = 340;
const zoneOf = p => { const k = ((p && p.look && p.look.size) || 1.24) / 1.24; return { x0: -6, x1: 6, z0: 9 * k, z1: 25 * k }; };
const releaseOf = p => ({ x: HX + (p && p.throws === 'L' ? 5 : -5), y: HY - 193, z: 26 });
const pitchesOf = p => (p.look.pitches || ['heater', 'curve', 'changeup', 'heater']);
const stamOf = (s, p) => { const t = M.teams[s]; return t.stamina[p.id] === undefined ? (t.stamina[p.id] = 100) : t.stamina[p.id]; };

/** launch a pitch from the defense's pitcher: type, the aim point (x, z relative to the plate's centre), release
 *  quality q 0..1; o: { cpu, forced } */
function throwPitch(type, aimX, aimZ, q, o = {}) {
  const s = 1 - M.half, D = defense(), pit = D.pitcher, def = PITCHES[type] || PITCHES.heater, st = stamOf(s, pit);
  const fat = st < 15 ? [.85, 2] : st < 40 ? [.92, 1.4] : [1, 1];
  const upg = D.upg ? 1 + .03 * (D.upg.arm || 0) : 1, boss = (M.boss && pit.look.captain && TEAMS[pit.team].boss) ? M.boss.speed : 1;
  const speed = BASE_SPEED * def.spd * (def.kind === 'super' && def.spd === 1 ? 1.35 : 1) * statF(pit.vel) * (1 + .08 * q) * fat[0] * TUNE.pitchSpeed * (o.cpu ? M.diff.pitchMul * (.85 + .15 * TUNE.cpuPitch) : 1) * upg * boss;
  const rel = releaseOf(pit), missR = lerp(5, .5, q) * fat[1] * (1.25 - .05 * pit.ctl) * (M.cheats.allStrikes ? 0 : 1);
  const ma = R() * TAU, mr = Math.sqrt(R()) * missR, side = pit.throws === 'L' ? -1 : 1;
  let cross = { x: HX + aimX + Math.cos(ma) * mr, z: aimZ + Math.sin(ma) * mr };
  if (M.cheats.allStrikes || o.forced) { const Z = zoneOf(batterNow()); cross.x = HX + clamp(cross.x - HX, Z.x0 + 1, Z.x1 - 1); cross.z = clamp(cross.z, Z.z0 + 1, Z.z1 - 1); }
  if (o.forced && o.x !== undefined) cross = { x: HX + o.x, z: o.z };
  const brk = statF(pit.brk) * (1 + .2 * q) * TUNE.pitchBreak, dist = Math.hypot(PLATE_Y - rel.y, cross.x - rel.x, cross.z - rel.z);
  const pseed = R() * 1000;
  M.pitch = { type, def, rel, cross, T: dist / speed, t: 0, q, speed, bx: def.bx * brk * side, bz: def.bz * brk, k: def.k || 1, seed: pseed, sag: 1.5 + 400 / speed,
    after: 0, crossed: false, done: false, cpu: !!o.cpu, by: pit, pops: def.pops ? [0, 1, 2].map(() => (R() - .5) * 6) : null };
  D.stamina[pit.id] = Math.max(0, st - def.cost * TUNE.staminaDrain);
  pStat(pit).pitches++; M.pitchCount++;
  if (def.kind === 'super') { D.meter = M.cheats.infMeter ? 100 : 0; emit('super', { kind: 'pitch', type, team: s }); sfx('charge'); }
  emit('release', { type, speed, q, cpu: !!o.cpu });
  sfx('whoosh', { pitch: speed / 340 });
  return M.pitch;
}
/** where the pitch is at u (0 release, 1 the plate; past 1 it flies on to the catcher) */
function pitchPos(pt, u) {
  const uu = Math.min(u, 1), d = pt.def, k = pt.k;
  let x = lerp(pt.rel.x, pt.cross.x, uu) + pt.bx * (Math.pow(uu, k) - uu);
  let z = lerp(pt.rel.z, pt.cross.z, uu) + 4 * uu * (1 - uu) * pt.sag + pt.bz * (Math.pow(uu, k) - uu);
  const y = lerp(pt.rel.y, PLATE_Y, u);
  const env = Math.sin(Math.PI * uu);
  if (d.wobble) { x += d.wobble * Math.sin(uu * 11 + pt.seed) * env; z += d.wobble * .7 * Math.sin(uu * 13 + pt.seed * 2) * env; }
  if (d.wave) z += d.wave * Math.sin(uu * TAU) * env;
  if (d.zig) x += d.zig * (Math.floor(uu * 14) % 2 ? 1 : -1) * env;
  if (d.tide) z += d.tide * env;
  if (pt.pops) pt.pops.forEach((j, i) => { const at = [.3, .55, .8][i]; if (uu > at) x += j * (1 - uu) / (1 - at); });
  if (u > 1) { const du = u - 1; const p1 = pitchPos(pt, .98), vx = (x - p1.x) / .02, vz = (z - p1.z) / .02; x += vx * du; z = Math.max(1.5, z + vz * du); }
  return { x, y, z };
}
const pitchHidden = (pt, u) => !!(pt.def.hide && u > pt.def.hide[0] && u < pt.def.hide[1]);
function inZone(x, z, p) { const Z = zoneOf(p); const r = 1.6; return x - HX >= Z.x0 - r && x - HX <= Z.x1 + r && z >= Z.z0 - r && z <= Z.z1 + r; }
/** does a pitch crossing at (x, z) hit the batter? */
function hitsBatter(x, z, p) { const box = p.bats === 'L' ? 18 : -18, dx = x - HX; return z > 4 && z < 34 && Math.abs(dx - box) < 7 && Math.sign(dx) === Math.sign(box); }

/* ---- the CPU pitcher: a pitch mix by the count, aim at the edges by level, release quality, aftertouch ---- */
function cpuPitchChoice() {
  const D = defense(), pit = D.pitcher, list = pitchesOf(pit), b = M.balls, s = M.strikes, Z = zoneOf(batterNow());
  if (D.meter >= 100 && s === 2 && !M.cheats.noCpuSuper) return { type: TEAMS[pit.team].superPitch, slot: 4, x: (R() - .5) * 6, z: lerp(Z.z0 + 2, Z.z1 - 2, R()), q: M.diff.relQ };
  const r = R(); let slot;
  if (b >= 3 || b - s >= 2) slot = r < .65 ? 0 : r < .85 ? 2 : 1;
  else if (s === 2) slot = r < .3 ? 1 : r < .55 ? 3 : r < .8 ? 2 : 0;
  else slot = r < .4 ? 0 : r < .62 ? 1 : r < .82 ? 2 : 3;
  const skill = clamp(TUNE.cpuPitch, 0, 2), edge = (.35 + DIFF_ORDER.indexOf(M.diffId) * .15) * skill;
  const wantBall = s === 2 && b < 3 && R() < .35 * skill;
  const ax = (R() < .5 ? -1 : 1) * (wantBall ? 9 : 1 + Math.pow(R(), 1.2 - .3 * edge) * 9.5);
  const az = wantBall ? (R() < .5 ? Z.z0 - 4 : Z.z1 + 3) : R() < .2 + .1 * edge ? (R() < .5 ? Z.z0 - 2.5 : Z.z1 + 2.5) : lerp(Z.z0 + 1, Z.z1 - 1, R());
  return { type: list[slot] || 'heater', slot, x: ax + gauss() * M.diff.aimSd * .4, z: az + gauss() * M.diff.aimSd * .4, q: clamp(M.diff.relQ * (.8 + .2 * skill) + gauss() * .12, 0, 1) };
}
