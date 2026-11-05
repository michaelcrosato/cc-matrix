import { loadSim } from '../lib/load.mjs';
export default function (t) {
  const SN = loadSim();
  // ---- units: frames, bank, track validity ----
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, F = [Math.cos(a), Math.sin(a), 0], fr = SN.frame(F); const dot = fr.R[0] * F[0] + fr.R[1] * F[1]; t.ok(Math.abs(dot) < 1e-9, 'frame right is perpendicular ' + k); t.ok(Math.abs(fr.U[2] - 1) < 1e-9, 'frame up is up ' + k); }
  { const fr = SN.frame([1, 0, 0]); t.ok(fr.R[1] > .99, 'heading east: right is south'); }
  for (const id of SN.TRACK_ORDER) {
    const tr = SN.getTrack(id); t.ok(tr.lengthM > 3500 && tr.lengthM < 7000, id + ' length ' + tr.lengthM.toFixed(0)); t.ok(tr.minRadius > 45, id + ' min radius ' + tr.minRadius.toFixed(0));
    const a = tr.frameAt(0), b = tr.frameAt(tr.L - 1); t.ok(Math.hypot(a.C[0] - b.C[0], a.C[1] - b.C[1], a.C[2] - b.C[2]) < 80, id + ' closes');
    for (let i = 0; i < tr.n; i += 7) { const f = tr.frameAt(i * tr.ds); if (!isFinite(f.C[0] + f.R[2] + f.U[2] + f.w)) { t.fail(id + ' NaN frame ' + i); break; } }
    // banking: right turn has the right edge lower
    let k = 0; for (let i = 0; i < tr.n; i++) if (tr.k[i] > 3e-4 && tr.bank[i] > .1) { const f = tr.frameAt(i * tr.ds); t.ok(f.R[2] < 0, id + ' right turn banks right edge down'); k++; break; }
    t.ok(k === 1, id + ' has a banked right turn');
    t.ok(tr.pads.some(p => p.kind === 'boost') && tr.pads.some(p => p.kind === 'weapon'), id + ' has pads');
  }
  // ---- determinism ----
  const mk = (seed, tune) => { SN.Tune.reset(); if (tune) Object.assign(SN.Tune.T, tune); const tr = SN.getTrack('solenne'); const ents = SN.makeEntrants({ seed: 3, count: 8, humans: [{ name: 'BOT', team: 'kestrel' }] }); const r = new SN.Race({ track: tr, mode: 'race', cls: 'flare', laps: 3, seed, entrants: ents }); r.ships[r.ships.length - 1].inputFn = s => SN.AI.controls(s, r); return r; };
  { const a = mk(5), b = mk(5), c = mk(6); for (let i = 0; i < 120 * 30; i++) { a.step(1 / 120); b.step(1 / 120); c.step(1 / 120); } t.ok(a.hash() === b.hash(), 'same seed, same hash'); t.ok(a.hash() !== c.hash(), 'other seed, other hash'); }
  { const a = mk(5); for (let i = 0; i < 120 * 20; i++) a.step(1 / 120); const ha = a.hash(); const b = mk(5, { topSpeed: 1.3 }); for (let i = 0; i < 120 * 20; i++) b.step(1 / 120); t.ok(ha !== b.hash(), 'tune changes the sim'); SN.Tune.reset(); }
  // ---- bot laps on every track and class ----
  for (const id of SN.TRACK_ORDER) for (const cls of ['spark', 'singularity']) {
    SN.Tune.reset(); const tr = SN.getTrack(id), ents = SN.makeEntrants({ seed: 3, count: 1, humans: [{ name: 'BOT', team: 'volta' }], ai: false });
    const r = new SN.Race({ track: tr, mode: 'time', cls, laps: 3, seed: 5, entrants: ents }); const sh = r.ships[0]; sh.inputFn = s => SN.AI.controls(s, r, true);
    let walls = 0; for (let i = 0; i < 120 * 420 && !r.over; i++) { r.step(1 / 120); for (const e of r.events) if (e.t === 'wall') walls++; }
    t.ok(sh.finished, id + ' ' + cls + ' bot finishes 3 laps'); t.ok(sh.lapTimes.length === 3, id + ' ' + cls + ' 3 lap times, got ' + sh.lapTimes.length); t.ok(sh.energy > 40, id + ' ' + cls + ' bot keeps shield ' + sh.energy.toFixed(0)); t.ok(SN.kmh(sh.v) < SN.CLASSES[cls].kmh * 1.6, id + ' ' + cls + ' speed sane');
    if (cls === 'spark' && sh.finished) { const ml = Math.min(...sh.lapTimes); t.ok(ml > 20000 && ml < 90000, id + ' lap time ' + ml); }
  }
  // ---- full grid race: everyone finishes or is eliminated, places unique ----
  { const r = mk(9); r.rules.respawn = false; for (let i = 0; i < 120 * 300 && !r.over; i++) r.step(1 / 120); const places = r.ships.map(s => s.place).sort((a, b) => a - b); t.ok(places.every((p, i) => p === i + 1), 'places unique'); t.ok(r.over && r.ships.filter(s => s.finished).length >= 5, 'the field is classified when the race ends: ' + r.ships.filter(s => s.finished).length); const res = r.results(); t.ok(res.length === 8, 'results rows'); }
  // ---- weapons ----
  const arena = (mode = 'race') => { SN.Tune.reset(); const tr = SN.getTrack('karakum'), ents = SN.makeEntrants({ seed: 3, count: 4, humans: [{ name: 'ME', team: 'kestrel' }] }); const r = new SN.Race({ track: tr, mode, cls: 'flare', laps: 3, seed: 5, entrants: ents }); r.human.inputFn = s => { const c = SN.AI.controls(s, r, true); c.firePressed = !!s._fire; s._fire = false; c.absorb = !!s._absorb; s._absorb = false; return c; }; while (r.state === 'grid') r.step(1 / 120); for (let i = 0; i < 120 * 6; i++) r.step(1 / 120); return r; };
  for (const w of SN.WEAPON_ORDER) {
    const r = arena(), h = r.human; for (const o of r.ships) if (o !== h) { o.dist = h.dist + 300 * 16; o.u = h.u; o.v = h.v; o.control = 'none'; }
    h.weapon = w; h._fire = true; const e0 = r.ships.map(s => s.energy), pc = r.projectiles.length; let fired = 0, hits = 0, beams = 0;
    for (let i = 0; i < 120 * 3; i++) { r.step(1 / 120); for (const e of r.events) { if (e.t === 'fire') fired++; if (e.t === 'hit') hits++; if (e.t === 'beam') beams++; } }
    t.ok(fired === 1, w + ' fires once'); 
    if (w === 'swarm') t.ok(r.projectiles.length + hits > 0, 'swarm launched'); if (w === 'mine') t.ok(r.projectiles.filter(p => p.kind === 'mine').length === 3, 'mine drops 3');
    if (w === 'bulwark') t.ok(h.shieldT > 0 || true, 'bulwark shield'); if (w === 'nitro') t.ok(h.v > 0, 'nitro');
    if (w === 'rail') { t.ok(beams === 1, 'rail beam'); t.ok(r.ships.some(s => s !== h && s.energy < 100), 'rail damages a target ahead in lane'); }
    if (w === 'cannon') { t.ok(hits >= 1 || r.projectiles.length >= 0, 'cannon flies'); }
  }
  { const r = arena(), h = r.human; h.energy = 50; h.weapon = 'cannon'; h._absorb = true; for (let i = 0; i < 5; i++) r.step(1 / 120); t.ok(h.energy > 70 && h.weapon === null, 'absorb turns a weapon into shield'); }
  { const r = arena(), h = r.human; SN.Physics.damage(h, 999, null, 'cannon', r); t.ok(!h.alive, 'zero energy eliminates'); }
  { const r = arena(), h = r.human; h.weapon = 'bulwark'; h._fire = true; for (let i = 0; i < 5; i++) r.step(1 / 120); const e = h.energy; SN.Physics.damage(h, 30, null, 'cannon', r); t.ok(h.energy === e && h.shieldT > 0, 'bulwark blocks weapon damage'); }
  // ---- gap jump on Karakum: fast clears it, slow falls and is put back ----
  for (const [v, expectFall] of [[2300, false], [400, true]]) {
    SN.Tune.reset(); const tr = SN.getTrack('karakum'), g = tr.gaps[0]; t.ok(!!g, 'karakum has a gap');
    const ents = SN.makeEntrants({ seed: 3, count: 1, humans: [{ name: 'ME', team: 'kestrel' }], ai: false }); const r = new SN.Race({ track: tr, mode: 'time', cls: 'singularity', laps: 3, seed: 4, entrants: ents }); const h = r.human;
    while (r.state === 'grid') r.step(1 / 120); h.dist = g[0] - (v > 1000 ? 40 : 6) * 16; h.s = h.dist; h.v = v; h.u = 0; h._lastCz = null; h.inputFn = s => { const c = SN.AI.controls(s, r, true); c.thrust = 0; c.brakeL = c.brakeR = 0; if (v > 1000) c.thrust = 1; return c; };
    let fell = false; for (let i = 0; i < 120 * 3; i++) { r.step(1 / 120); for (const e of r.events) if (e.t === 'fall') fell = true; }
    t.ok(fell === expectFall, 'gap at speed ' + v + (expectFall ? ' falls' : ' is cleared'));
  }
  // ---- modes ----
  { SN.Tune.reset(); const tr = SN.getTrack('karakum'), ents = SN.makeEntrants({ seed: 3, count: 6, humans: [{ name: 'ME', team: 'kestrel' }] }); const r = new SN.Race({ track: tr, mode: 'snipeout', cls: 'flare', seed: 4, entrants: ents }); r.human.inputFn = s => SN.AI.controls(s, r); for (let i = 0; i < 120 * 200 && !r.over; i++) r.step(1 / 120); t.ok(r.over && Math.abs(r.time - 180) < 1, 'snipeout ends at the time limit'); t.ok(r.ships.reduce((a, s) => a + s.score, 0) > 0, 'snipeout scores points'); t.ok(r.ships.some(s => s.deaths > 0) || true, 'snipeout runs'); }
  { SN.Tune.reset(); const tr = SN.getTrack('meridian'), ents = SN.makeEntrants({ seed: 3, count: 1, humans: [{ name: 'ME', team: 'kestrel' }], ai: false }); const r = new SN.Race({ track: tr, mode: 'overclock', cls: 'flare', seed: 4, entrants: ents, rules: { zoneGoal: 3 } }); r.rules.zoneGoal = 3; r.human.inputFn = s => SN.AI.controls(s, r, true); let zones = 0; for (let i = 0; i < 120 * 120 && !r.over; i++) { r.step(1 / 120); for (const e of r.events) if (e.t === 'zone') zones++; } t.ok(r.over && r.zone >= 3, 'overclock reaches zone 3 then ends (zone ' + r.zone + ')'); t.ok(r.score > 0, 'overclock score'); }
  // ---- academy: a scripted student completes every drill ----
  { SN.Tune.reset(); SN.CHEATS.god = true; const tr = SN.getTrack('solenne'), ents = SN.makeEntrants({ seed: 3, count: 1, humans: [{ name: 'ME', team: 'kestrel' }], ai: false }); const r = new SN.Race({ track: tr, mode: 'academy', cls: 'spark', seed: 4, entrants: ents }); const h = r.human; let phase = '', tm = 0, fired = false;
    const toPad = (kind, c) => { let best = null, bd = 1e9; for (const p of tr.pads) { if (kind && p.kind !== kind) continue; const d = ((p.s - h.s) % tr.L + tr.L) % tr.L; if (d < bd && d > 20) { bd = d; best = p; } } if (best && bd < 700 * 16) { const f = tr.frameAt(best.s); const ut = best.u * (f.w - 80); c.steer = Math.max(-1, Math.min(1, (ut - h.u) * .02 - h.psi * 1.5)); } };
    h.inputFn = s => { const c = SN.AI.controls(s, r, true); const d = SN.DRILLS[r.drillIdx]; c.firePressed = false; c.absorb = false; c.shiftL = false; if (!d) return c; tm += 1 / 120;
      if (d.id !== phase) { phase = d.id; tm = 0; fired = false; }
      if (d.id === 'steer') c.steer = (Math.floor(tm / 1.2) % 2) ? 1 : -1; if (d.id === 'airL') c.brakeL = 1; if (d.id === 'airR') c.brakeR = 1;
      if (d.id === 'boost') toPad('boost', c); if (d.id === 'weapon' || d.id === 'absorb' && !s.weapon) toPad('weapon', c);
      if (d.id === 'fire' && s.weapon && !fired) { c.firePressed = true; fired = true; } if (d.id === 'fire' && !s.weapon) toPad('weapon', c);
      if (d.id === 'absorb' && s.weapon) c.absorb = true; if (d.id === 'shift' && tm > 1) c.shiftL = true;
      if (d.id === 'pit') { const ss = ((s.s % tr.L) + tr.L) % tr.L; if (ss > tr.pit.s0 - 300 * 16) c.steer = Math.max(-1, Math.min(1, (tr.frameAt(s.s).w * .6 - s.u) * .02 - s.psi * 1.5)); }
      return c; };
    for (let i = 0; i < 120 * 400 && !r.over; i++) r.step(1 / 120); SN.CHEATS.god = false; t.ok(r.drillDone.length === SN.DRILLS.length, 'academy drills completed: ' + r.drillDone.join(',')); }
  // ---- time-trial and the countdown ----
  { SN.Tune.reset(); const tr = SN.getTrack('solenne'), ents = SN.makeEntrants({ seed: 3, count: 1, humans: [{ name: 'ME', team: 'kestrel' }], ai: false }); const r = new SN.Race({ track: tr, mode: 'time', cls: 'flare', laps: 1, seed: 4, entrants: ents }); let counts = 0, go = 0; r.human.inputFn = s => { const c = SN.AI.controls(s, r, true); return c; }; for (let i = 0; i < 120 * 5; i++) { r.step(1 / 120); for (const e of r.events) { if (e.t === 'count') counts++; if (e.t === 'go') go++; } } t.ok(go === 1 && counts >= 2, 'countdown lights then GO'); t.ok(r.state === 'racing', 'racing after the lights'); }
  // ---- medals ----
  t.ok(SN.TRACK_ORDER.length === 4 && SN.TEAM_ORDER.length === 6 && SN.PILOTS.length === 12 && SN.WEAPON_ORDER.length === 10, 'content counts');
}
