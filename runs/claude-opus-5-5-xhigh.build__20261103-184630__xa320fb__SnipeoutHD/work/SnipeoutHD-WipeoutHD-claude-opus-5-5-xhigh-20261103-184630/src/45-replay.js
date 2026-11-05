// SNIPEOUT HD: replays, ghosts and records. A replay re-simulates a race from its recording (seed, track, class, mode,
// tuning, the humans' controls per step) and checks the final hash. A ghost is the player's line at 20 Hz (s, u, h,
// yaw against the track, roll) quantised to Int16 and kept in the save as base64.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;

const Replay = SN.Replay = {
  /** a new race that replays a recording: race.replay.feed() gives each step's controls; race.replay.done at the end */
  play(rec) {
    const saved = SN.Tune.snapshot(); SN.Tune.load(rec.tune);
    const savedCheats = Object.assign({}, SN.cheats); if (rec.cheats) Object.assign(SN.cheats, rec.cheats);
    const T = SN.getTrack(rec.track);
    const R = new SN.Race({ track: T, mode: rec.mode, cls: rec.cls, laps: rec.laps, seed: rec.seed, difficulty: rec.difficulty, entrants: rec.entrants.map(e => Object.assign({}, e)),
      intro: rec.intro, drill: rec.drill, rules: rec.rules || undefined, versusMode: rec.versusMode, flyingStart: rec.flyingStart, record: false });
    SN.Tune.load(saved); Object.assign(SN.cheats, savedCheats);
    const cur = rec.frames.map(() => ({ i: 0, n: 0 })), out = rec.frames.map(() => SN.Controls.blank());
    R.replay = {
      rec, step: 0, steps: rec.steps || 0, done: false,
      /** set the humans' controls for the next step from the frames */
      feed() {
        rec.frames.forEach((f, k) => {
          const c = cur[k]; while (c.i < f.length && c.n >= f[c.i][2]) { c.i++; c.n = 0; }
          const fr = f[c.i]; if (!fr) { R.setControls(k, SN.Controls.blank()); return; }
          c.n++; SN.Race.decode(fr[0], fr[1], out[k]); R.setControls(k, out[k]);
        });
        this.step++; if (this.steps && this.step >= this.steps) this.done = true;
      },
      /** run the step with the recording's tuning in force (the sliders the race was run with) */
      run(dt) {
        const keep = SN.Tune.snapshot(), kc = Object.assign({}, SN.cheats); SN.Tune.load(rec.tune); if (rec.cheats) Object.assign(SN.cheats, rec.cheats);
        try { if (rec.skip === R.n) R.skipIntro(); this.feed(); R.step(dt); } finally { SN.Tune.load(keep); Object.assign(SN.cheats, kc); }
      },
      get ok() { return !rec.hash || R.hash() === rec.hash; }
    };
    return R;
  },
  /** replay a whole recording at once (tests): the final hash */
  verify(rec) { const R = Replay.play(rec); let n = 0; while (!R.replay.done && n < 120 * 900) { R.replay.run(1 / 120); n++; } return { hash: R.hash(), want: rec.hash, ok: R.hash() === rec.hash, race: R }; }
};

/* ---- ghosts: the player's line at 20 Hz ---- */
const Ghost = SN.Ghost = {
  recorder(race, ship) { return { race, ship, t: 0, data: [], step(dt) { this.t += dt; if (this.t >= .05 - 1e-9) { this.t -= .05; Ghost.sample(this.race.track, this.ship, this.data); } } }; },
  sample(T, ship, out) {
    const fr = T.frameAt(ship.s), yaw = Math.atan2(V.dot(ship.F, fr.R), V.dot(ship.F, fr.F));
    out.push(Math.round(ship.s / 4) & 0xffff, E.clamp(Math.round(ship.u * 4), -32767, 32767), E.clamp(Math.round(ship.h * 4), -32767, 32767), Math.round(E.clamp(yaw, -3.2, 3.2) * 10000), Math.round(SN.wrapAngle(ship.rollAng) * 10000));
  },
  encode(data) {
    const a = new Int16Array(data.length); for (let i = 0; i < data.length; i++) a[i] = i % 5 === 0 ? (data[i] << 16 >> 16) : data[i];
    const b = new Uint8Array(a.buffer); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'));
  },
  decode(str) {
    const s = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary'), b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    const a = new Int16Array(b.buffer, 0, Math.floor(b.length / 2)), out = [];
    for (let i = 0; i < a.length; i++) out.push(i % 5 === 0 ? a[i] & 0xffff : a[i]);
    return out;
  },
  /** a ghost's pose at time t (s): { s, u, h, yaw, roll } interpolated, or null past its end */
  at(data, t, T) {
    const n = data.length / 5, x = t * 20, i = Math.floor(x); if (i < 0 || i >= n - 1) return null;
    const f = x - i, g = k => data[i * 5 + k], h = k => data[(i + 1) * 5 + k];
    let s0 = g(0) * 4, s1 = h(0) * 4; if (s1 < s0 - T.L / 2) s1 += T.L; if (s1 > s0 + 65535 * 2) s1 -= 65536 * 4;
    return { s: (s0 + (s1 - s0) * f) % T.L, u: (g(1) + (h(1) - g(1)) * f) / 4, h: (g(2) + (h(2) - g(2)) * f) / 4, yaw: (g(3) + (h(3) - g(3)) * f) / 10000, roll: (g(4) + (h(4) - g(4)) * f) / 10000 };
  },
  /** place a ghost craft (control 'ghost') at its pose for time t */
  pose(ship, data, t, T) {
    const q = Ghost.at(data, t, T); if (!q) { ship.hidden = true; return false; }
    ship.hidden = false; ship.savePrev();
    const fr = T.frameAt(q.s), srf = T.surface(q.s, q.u);
    if (srf.kind === 'gap') { V.addS(ship.P, fr.C, fr.R, q.u); V.addS(ship.P, ship.P, fr.U, q.h); } else V.addS(ship.P, srf.P, srf.N, q.h);
    V.set(ship.F, fr.F[0] * Math.cos(q.yaw) + fr.R[0] * Math.sin(q.yaw), fr.F[1] * Math.cos(q.yaw) + fr.R[1] * Math.sin(q.yaw), fr.F[2] * Math.cos(q.yaw) + fr.R[2] * Math.sin(q.yaw));
    V.copy(ship.U, srf.kind === 'gap' ? fr.U : srf.N); ship.rollAng = q.roll; ship.s = q.s; ship.u = q.u; ship.h = q.h;
    return true;
  }
};

/* ---- records: best race and best lap per track / class / mode ---- */
SN.Records = {
  key: (track, cls, mode) => track + '/' + cls + '/' + mode,
  get(save, track, cls, mode) { return (save.records || {})[SN.Records.key(track, cls, mode)] || null; },
  /** offer a result: returns { race: bool, lap: bool } for what is new */
  offer(save, track, cls, mode, o) {
    const R = save.records || (save.records = {}), k = SN.Records.key(track, cls, mode), r = R[k] || (R[k] = {});
    const out = { race: false, lap: false };
    if (o.race && isFinite(o.race) && !(r.race <= o.race)) { r.race = o.race; r.racePilot = o.pilot; out.race = true; }
    if (o.lap && isFinite(o.lap) && !(r.lap <= o.lap)) { r.lap = o.lap; r.lapPilot = o.pilot; out.lap = true; }
    if (o.score !== undefined && !(r.score >= o.score)) { r.score = o.score; r.scorePilot = o.pilot; out.race = true; }
    return out;
  }
};
})();
