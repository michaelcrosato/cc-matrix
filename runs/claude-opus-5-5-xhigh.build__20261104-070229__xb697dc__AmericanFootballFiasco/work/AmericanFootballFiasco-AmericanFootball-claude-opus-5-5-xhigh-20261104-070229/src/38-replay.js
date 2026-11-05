// Instant replay and the highlight reel: from the snap to a second after the whistle, every athlete's place, facing, pose
// and flags and the ball at 60 Hz, plus the presentation's events (pops, lines). Playback drives the rigs from the frames
// with the sim frozen and untouched, from new angles, slowed down. The five most exciting plays are kept for the reel.
(() => {
'use strict';
const FF = window.FF, bus = FF.bus, game = FF.game;
const N = 10;   // per athlete: x y z facing pose poseU flags vx vy id
const rp = FF.replay = { rec: null, last: null, highlights: [], playing: null, want: null };
rp.reset = () => { rp.rec = null; rp.last = null; rp.highlights = []; rp.playing = null; rp.want = null; };
rp.start = m => { rp.rec = { frames: [], events: [], t: 0, step: 0, after: -1, q: m.quarter, clock: m.clock, score: m.score.slice(), poss: m.poss, excite: 0, caption: '' }; };
rp.event = (kind, d) => { if (rp.rec && !rp.playing) rp.rec.events.push({ t: rp.rec.t, kind, d }); };
const flagsOf = a => (a.carry ? 1 : 0) | (a.hot > 0 ? 2 : 0) | (a.dinged > 0 ? 4 : 0) | (a.helmetOff ? 8 : 0) | (a.fallBack ? 16 : 0) | (a.mega ? 32 : 0) | (a.carry === 'L' ? 64 : 0);
rp.record = (m, dt) => {
  const R = rp.rec; if (!R || rp.playing) return;
  R.t += dt; R.step++;
  if (R.step % 2) return;
  const list = m.on.concat(m.extra), f = new Float32Array(list.length * N + 7);
  list.forEach((a, i) => { const k = i * N; f[k] = a.x; f[k + 1] = a.y; f[k + 2] = a.z; f[k + 3] = a.facing; f[k + 4] = FF.POSE_CODE[a.pose] || 0; f[k + 5] = a.poseU || 0; f[k + 6] = flagsOf(a); f[k + 7] = a.vx; f[k + 8] = a.vy; f[k + 9] = a.id; });
  const b = m.ball, o = list.length * N; f[o] = b.x; f[o + 1] = b.y; f[o + 2] = b.z; f[o + 3] = ['held', 'pass', 'kick', 'loose', 'kickLoose', 'dead', 'bounce', 'placed', 'tee'].indexOf(b.state); f[o + 4] = b.spin || 0; f[o + 5] = list.length; f[o + 6] = R.t;
  R.frames.push(f); if (R.frames.length > 720) R.frames.shift();
  if (R.after >= 0) { R.after -= dt; if (R.after < 0) rp.finish(m); }
};
rp.finish = m => {
  const R = rp.rec; if (!R) return; rp.rec = null; if (R.frames.length < 10) return;
  rp.last = R;
  if (R.excite > 0) { rp.highlights.push(R); rp.highlights.sort((a, b) => b.excite - a.excite); if (rp.highlights.length > 5) rp.highlights.length = 5; }
  void m;
};
/** the whistle: a second more, then the clip is done; how exciting it was, and a caption for the reel */
const PRIO = { td: 10, int: 9, fumble: 8, megaHit: 9, bigHit: 6, seismic: 9, mascotOn: 7, fgLong: 7, sack: 5, bigRun: 6, bigCatch: 6 };
bus.on('whistle', d => { if (rp.rec && d.m === FF.match) rp.rec.after = 1; });
for (const ev of Object.keys(PRIO)) bus.on(ev, d => {
  const R = rp.rec, m = d.m; if (!R || m !== FF.match || rp.playing) return;
  const yds = d.yards || (m.play && m.play.gain) || 10, sc = PRIO[ev] * Math.max(1, Math.abs(yds) / 10);
  if (sc > R.excite) { R.excite = sc; R.kind = ev; R.who = d.player || d.defender || d.tackler || d.who || d.receiver; R.yards = yds; }
  if (['td', 'int', 'megaHit', 'seismic', 'mascotOn'].includes(ev) || (ev === 'fumble' && m.play && m.play.fumbled)) R.want = true;
  if ((ev === 'bigRun' || ev === 'bigCatch') && Math.abs(yds) >= 40) R.want = true;
});
bus.on('fg', d => { const R = rp.rec; if (R && d.good && d.yards >= 50) { R.want = true; R.excite = Math.max(R.excite, 7 * d.yards / 10); R.kind = 'fgLong'; R.yards = d.yards; } });
/** should the last play be replayed now? */
rp.should = (m, kind) => {
  const set = game.settings.replays, R = rp.last; if (!R || set === 'off' || m.mode === 'hub' || m.mode === 'lab' || FF.fast) return false;
  if (set === 'td') return R.kind === 'td' || kind === 'td';
  return !!R.want;
};
rp.caption = (R, m) => {
  const who = R.who ? (R.who.short || R.who.name) : '', q = R.q > 4 ? 'OT' : 'Q' + R.q, kind = { td: R.yards + '-YD TOUCHDOWN', int: 'INTERCEPTION', fumble: 'FUMBLE', megaHit: 'MEGA HIT', bigHit: 'BIG HIT', seismic: 'SEISMIC SACK', mascotOn: 'MASCOT MAYHEM', fgLong: R.yards + '-YD FIELD GOAL', sack: 'SACK', bigRun: R.yards + '-YD RUN', bigCatch: R.yards + '-YD CATCH' }[R.kind] || 'BIG PLAY';
  return q + ' ' + FF.u.mmss(R.clock) + ' — ' + who + ' ' + kind;
};
/** start playing a clip: shots from the field level and an iso or reverse angle, slowed down */
rp.play = (R, o = {}) => {
  if (!R) return false;
  const n = R.frames.length, key = R.events.length ? R.events[R.events.length - 1].t : R.t * .7;
  rp.playing = { R, t: Math.max(0, (o.from !== undefined ? o.from : R.t - 4.2)), end: R.t, rate: o.rate || FF.T.replayRate, shot: 0, view: o.view || 'field', alt: FF.rf() < .5 ? 'iso' : 'reverse', reel: !!o.reel, caption: o.caption || '', onDone: o.onDone, key, n };
  FF.replayPlaying = true; return true;
};
rp.stop = () => { const p = rp.playing; rp.playing = null; FF.replayPlaying = false; if (p && p.onDone) p.onDone(); };
/** advance playback by real time; returns the frame { list: [athlete-ish], ball } to draw */
rp.update = rdt => {
  const p = rp.playing; if (!p) return null;
  p.t += rdt * p.rate; if (p.shot === 0 && p.t > p.end - 1.6 && !p.reel) { p.shot = 1; p.rate = Math.min(p.rate, .35); }
  if (p.t >= p.end) { rp.stop(); return null; }
  return rp.frameAt(p.R, p.t);
};
rp.frameAt = (R, t) => {
  const fr = R.frames, t0 = fr[0][fr[0].length - 1]; let i = Math.max(0, Math.min(fr.length - 2, Math.floor((t - t0) * 60)));
  while (i > 0 && fr[i][fr[i].length - 1] > t) i--; while (i < fr.length - 2 && fr[i + 1][fr[i + 1].length - 1] < t) i++;
  const a = fr[i], b = fr[i + 1], ta = a[a.length - 1], tb = b[b.length - 1], k = tb > ta ? Math.max(0, Math.min(1, (t - ta) / (tb - ta))) : 0;
  const n = a[a.length - 2], list = [];
  for (let j = 0; j < n; j++) {
    const o = j * N, L = (q) => a[o + q] + (b[o + q] - a[o + q]) * k, fl = a[o + 6];
    list.push({ id: a[o + 9], x: L(0), y: L(1), z: L(2), facing: a[o + 3], pose: FF.POSES[a[o + 4]] || 'idle', poseU: L(5), vx: a[o + 7], vy: a[o + 8], carry: fl & 1 ? (fl & 64 ? 'L' : 'R') : null, hot: !!(fl & 2), dinged: !!(fl & 4), helmetOff: !!(fl & 8), fallBack: !!(fl & 16), mega: !!(fl & 32), poseT: t });
  }
  const o = n * N, B = q => a[o + q] + (b[o + q] - a[o + q]) * k;
  return { list, ball: { x: B(0), y: B(1), z: B(2), state: ['held', 'pass', 'kick', 'loose', 'kickLoose', 'dead', 'bounce', 'placed', 'tee'][a[o + 3]] || 'dead', spin: B(4) }, t, events: R.events };
};
})();
