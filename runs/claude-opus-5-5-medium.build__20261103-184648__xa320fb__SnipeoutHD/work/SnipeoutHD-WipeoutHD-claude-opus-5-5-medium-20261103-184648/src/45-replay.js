// Replays (deterministic re-simulation from the seed and the human controls), ghosts (time trial, hot lap) and records
(() => {
const SN = globalThis.SN, V = SN.V;
const BITS = ['fire', 'firePressed', 'fireReleased', 'absorb', 'shiftL', 'shiftR'];
const Replay = SN.Replay = {
  pack(c) {
    let b = 0; BITS.forEach((k, i) => { if (c[k]) b |= 1 << i; }); if (c.flick < 0) b |= 64; if (c.flick > 0) b |= 128; if (c.analog) b |= 256;
    return [Math.round((c.steer || 0) * 127), Math.round((c.pitch || 0) * 127), c.thrust ? 1 : 0, Math.round((c.brakeL || 0) * 255), Math.round((c.brakeR || 0) * 255), b];
  },
  unpack(a) {
    const b = a[5], c = { steer: a[0] / 127, pitch: a[1] / 127, thrust: a[2], brakeL: a[3] / 255, brakeR: a[4] / 255, flick: b & 64 ? -1 : b & 128 ? 1 : 0, analog: !!(b & 256) };
    BITS.forEach((k, i) => { c[k] = b & (1 << i) ? 1 : 0; }); return c;
  },
  /** a new race that re-simulates a record; run it to the end and its hash equals rec.hash */
  race(rec) {
    return new SN.Race({ track: rec.track, mode: rec.mode, cls: rec.cls, laps: rec.laps, seed: rec.seed, entrants: rec.entrants, tune: rec.tune, cheats: rec.cheats, difficulty: rec.difficulty, rules: rec.rules, target: rec.target, intro: rec.intro ? undefined : false, replay: rec });
  },
  /** re-simulate a record to its end, headless: returns the race */
  verify(rec) { const saved = SN.Tune.snapshot(), R = Replay.race(rec); for (let i = 0; i < rec.steps; i++) R.step(SN.DT); SN.Tune.load(saved); return R; }
};
/* ---- ghosts: (p, u, h, yaw against the track, roll) at 20 Hz, quantised to Int16, base64 ---- */
const Ghost = SN.Ghost = {
  start(sh) { return { samples: [], t: 0, ship: sh, p0: sh.p }; },
  sample(g, race) {
    const sh = g.ship; g.t += SN.DT; if (g.t < .05 - 1e-9) return; g.t -= .05;
    const fr = race.track.frameAt(sh.s), yaw = Math.atan2(V.dot(sh.F, fr.R), V.dot(sh.F, fr.F));
    g.samples.push(Math.round((sh.p - g.p0) / 8), Math.round(sh.u / 4), Math.round(sh.h / 2), Math.round(yaw * 1000), Math.round(sh.visRoll * 1000));
  },
  encode(g) { const a = new Int16Array(g.samples.map(v => Math.max(-32768, Math.min(32767, v)))), u8 = new Uint8Array(a.buffer); let s = ''; for (let i = 0; i < u8.length; i += 4096) s += String.fromCharCode.apply(null, u8.subarray(i, i + 4096)); return btoa(s); },
  decode(b64) { const s = atob(b64), u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return new Int16Array(u8.buffer); },
  /** the ghost's pose at time t (seconds from its start): { p, u, h, yaw, roll } or null past its end */
  at(data, t, p0 = 0) {
    const n = data.length / 5, x = t * 20, i = Math.floor(x), f = x - i; if (i < 0 || i >= n - 1) return null;
    const A = i * 5, B = A + 5, l = (a, b) => a + (b - a) * f;
    return { p: p0 + l(data[A], data[B]) * 8, u: l(data[A + 1], data[B + 1]) * 4, h: l(data[A + 2], data[B + 2]) * 2, yaw: l(data[A + 3], data[B + 3]) / 1000, roll: l(data[A + 4], data[B + 4]) / 1000 };
  }
};
})();
