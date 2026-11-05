// 10m PLATFORM DIVING — summer · Splash Palace · pick a dive, time the take-off, tuck or pike to spin, open up to line
// up the entry, twist on the way down. Five judges; a rip entry makes no splash, a belly flop soaks the judges.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, M = 12, EDGE_X = 30, EDGE_Z = 120, PI = Math.PI;
const DIVES = {
  '105B': { name: 'FORWARD 2½ PIKE', dd: 2.8, halves: 5, pos: 'pike', dir: 1, start: 0, twists: 0, tier: 0 },
  '205C': { name: 'BACK 2½ TUCK', dd: 3.0, halves: 5, pos: 'tuck', dir: -1, start: 0, twists: 0, tier: 0 },
  '107C': { name: 'FORWARD 3½ TUCK', dd: 3.3, halves: 7, pos: 'tuck', dir: 1, start: 0, twists: 0, tier: 1 },
  '407C': { name: 'INWARD 3½ TUCK', dd: 3.2, halves: 7, pos: 'tuck', dir: 1, start: 0, twists: 0, tier: 1, inward: true },
  '5154B': { name: 'FORWARD 2½ 2 TWISTS PIKE', dd: 3.6, halves: 5, pos: 'pike', dir: 1, start: 0, twists: 4, tier: 2 },
  'YIKES': { name: 'YIKES! ARMSTAND QUINTUPLE', dd: 4.8, halves: 10, pos: 'tuck', dir: 1, start: PI, twists: 0, tier: 2, armstand: true, spinK: 1.28 }
};
O.DIVES = DIVES;
const TIERS = [['105B', '205C'], ['107C', '407C'], ['5154B', 'YIKES']];

O.defEvent({
  id: 'diving', name: '10m PLATFORM', short: 'Diving', season: 'summer', venueName: 'SPLASH PALACE', music: 'diving', view: 'side',
  format: { type: 'attempts', attempts: 3 }, M, aggregate: 'sum', highlights: 1, maxTime: 30, roundName: 'DIVE',
  measure: { unit: 'pts', better: 'higher', fmt: v => v.toFixed(2), wr: [338.4, 'BON', 'COCO BONBON'], qualify: { Easy: 150, Normal: 195, Hard: 240 }, seedStep: -9 },
  points: v => 3.4 * v,
  tune: { tuckSpin: [12.5, 6, 20, .1, 'Tuck spin (rad/s)'], pikeSpin: [9, 4, 16, .1, 'Pike spin (rad/s)'], openSpin: [1.5, 0, 4, .1, 'Open spin (rad/s)'], takeoffVz: [4.2, 2, 7, .1, 'Take-off speed up (m/s)'], ripTolerance: [8, 2, 20, .5, 'Rip entry tolerance (deg)'], judgeNoise: [.5, 0, 2, .05, 'Judge noise'], twistTime: [.25, .1, .6, .01, 'Half twist time (s)'] },
  howto: { goal: 'Three dives, the scores added. Spin the somersaults the dive asks for, then open up and enter the water straight, head first.', rows: [[['action'], 'TAKE OFF IN THE GREEN'], [['mashL'], 'HOLD: TUCK (FAST SPIN)'], [['mashR'], 'HOLD: PIKE (SPIN)'], [['moveH'], 'TAP: HALF TWIST (TWIST DIVES)']] },
  yikesKinds: ['bellyflop', 'wrongway'], turboName: 'SLOW-MO SUPREMACY!',
  laurel: { id: 'tens', name: 'PERFECT 10s', text: 'All five judges award a 10', test: (ctx, a) => a.attempts.some(x => x && x.info && x.info.cards && x.info.cards.every(c => c === 10)) },
  hub: { ok: true, attempts: 2, seconds: 45 }, attract: { seconds: 18, setup(ctx) { ctx.w.attractDive = 'YIKES'; } },
  phases: ['pick', 'stance', 'air', 'entry'],
  hubSample: ctx => { const s = ctx.s; return s && s.d ? [s.x, s.z] : null; },
  hubPoint: (ctx, q, g) => [q[0] + 14 * (Object.keys(O.Hub.ghosts).indexOf(String(g.id)) + 1), 10, q[1]],
  build(ctx) { for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'dive'); ctx.w.used = new Map(); ctx.w.judges = [0, 1, 2, 3, 4].map(i => O.makeRig(O.NATION_IDS[(i * 3 + 1) % 8], 'ceremony', { mate: i % 3 })); },
  start(ctx, a) {
    const used = ctx.w.used.get(a) || [];
    const all = TIERS.flat(), opts = TIERS.map((t, i) => t.find(d => !used.includes(d)) || TIERS[Math.min(2, i + 1)].find(d => !used.includes(d)) || TIERS[Math.max(0, i - 1)].find(d => !used.includes(d)) || all.find(d => !used.includes(d)) || t[0]);
    ctx.s = { a, phase: ctx.w.attractDive && a.cheat ? 'stance' : 'pick', pt: 0, opts, pick: 1, dive: ctx.w.attractDive && a.cheat ? ctx.w.attractDive : null, bar: new O.Widgets.TimingBar({ hz: 1.4, zones: [{ from: .44, to: .56, name: 'PERFECT', q: 1, color: '#4fe0a8' }, { from: .3, to: .7, name: 'GOOD', q: .55, color: '#f2b632' }] }),
      x: EDGE_X - 4, z: EDGE_Z, vx: 0, vz: 0, th: 0, tw: 0, twists: 0, twT: 0, inPos: 0, wrongPos: 0, airT: 0, q: 0, cards: null, score: null, e: 0, flop: false, rip: false, slow: false, splash: 0, used, judgeT: 0, entered: false };
    if (ctx.s.dive) ctx.s.d = DIVES[ctx.s.dive];
  },
  step(ctx, dt) {
    const s = ctx.s, a = s.a, I = a.I, T = ctx.T; s.pt += dt;
    if (s.phase === 'pick') {
      if (I.Lf) s.pick = (s.pick + 2) % 3; if (I.Rt) s.pick = (s.pick + 1) % 3;
      if (I.A || s.pt > 12) { s.dive = s.opts[s.pick]; s.d = DIVES[s.dive]; s.used.push(s.dive); ctx.w.used.set(a, s.used); s.phase = 'stance'; s.pt = 0; if (s.d.tier === 2) ctx.cue('hard', { a }); else ctx.cue('start', { a }); }
      return;
    }
    const d = s.d;
    if (s.phase === 'stance') {
      s.bar.update(dt); s.th = d.start; if (d.armstand) s.z = EDGE_Z;
      if ((I.A && s.pt > .3) || s.pt > 8) {
        const res = s.bar.press(); s.q = res.q; s.phase = 'air'; s.pt = 0;
        s.vz = T.takeoffVz + 1.6 * s.q; s.vx = 1.0 * (d.dir < 0 && !d.inward ? 1 : 1); s.z = EDGE_Z + (d.armstand ? 6 : 0);
        ctx.sfx('boing', { vol: .3, pitch: 1.6 }); if (s.q >= 1) ctx.hype(a, .15);
      }
    } else if (s.phase === 'air') {
      s.airT += dt;
      const turbo = a.turboT > 0, tuck = I.Lh, pike = I.Rh && !tuck, pos = tuck ? 'tuck' : pike ? 'pike' : 'open';
      const w = (pos === 'tuck' ? T.tuckSpin : pos === 'pike' ? T.pikeSpin : T.openSpin) * (pos !== 'open' && d.spinK ? d.spinK : 1);
      const rem = d.halves * PI + d.start - s.th;
      if (pos !== 'open') { if (pos === d.pos) s.inPos += dt; else s.wrongPos += dt; }
      s.th += w * dt * (rem > -PI ? 1 : .3);
      if (d.twists && (I.Lf || I.Rt) && pos !== 'tuck' && s.twT <= 0) { s.twT = T.twistTime; s.twists++; }
      if (s.twT > 0) s.twT -= dt;
      s.pos = pos;
      s.vz -= 9.81 * dt; s.x += s.vx * M * dt; s.z += s.vz * M * dt;
      if (!s.slow && s.z < 40 && !O.sandbox) { s.slow = true; ctx.slowmo(.35, .6); }
      if (turbo) { /* SLOW-MO SUPREMACY: the runner's time scale */ }
      if (s.z <= 0) entry(ctx);
    } else if (s.phase === 'entry') {
      s.z = Math.max(-50, s.z + s.vz * M * dt * .25); s.vz *= Math.pow(.05, dt);
      if (s.pt > (O.sandbox ? 0 : .9) && !s.cards) judge(ctx);
      if (s.cards) { s.judgeT += dt; if (s.judgeT > (O.sandbox ? 0 : 2.4)) s.phase = 'done'; }
    }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: ctx => ctx.s.score,
  attemptInfo: ctx => ({ dive: ctx.s.dive, cards: ctx.s.cards, e: ctx.s.e }),
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), bs = a.bs, perfect = a.cheat === 'perfect';
    if (!s || s.a !== a) return I;
    if (bs.r === undefined) { bs.r = ctx.rng('bot:' + a.id); bs.err = perfect ? 0 : O.gauss(bs.r) * (1 - a.skill) * 48 * PI / 180; bs.q = perfect ? 0 : (1 - a.skill) * .2 * (bs.r() < .5 ? -1 : 1); }
    if (s.phase === 'pick') { const want = perfect ? 2 : a.skill > .8 ? 2 : a.skill > .62 ? 1 : 0; if (s.pick < want) I.Rt = true; else if (s.pick > want) I.Lf = true; else if (s.pt > .6) I.A = true; return I; }
    if (s.phase === 'stance') { if (Math.abs(s.bar.v - (.5 + bs.q)) < .02 && s.pt > .5) I.A = true; return I; }
    if (s.phase === 'air') {
      const d = s.d, T = ctx.T, a2 = 9.81 * M, tRem = (s.vz * M + Math.sqrt(Math.max(0, s.vz * s.vz * M * M + 2 * a2 * Math.max(0, s.z)))) / a2;
      const rem = d.halves * PI + d.start - s.th - bs.err;
      const keep = rem > T.openSpin * tRem;
      if (keep) { if (d.pos === 'tuck') I.Lh = true; else I.Rh = true; }
      if (d.twists && s.twists < d.twists && s.twT <= 0 && d.pos === 'pike') { if (bs.tw === undefined) bs.tw = 0; bs.tw ^= 1; if (bs.tw) I.Rt = true; }
      if (a.hype >= 1 && s.airT > .2) I.T = true;
    }
    return I;
  },
  onTurbo(ctx, a) { ctx.slowmo(.5, 2.5); },
  cam(ctx, dt) {
    const s = ctx.s; let tz = s ? clamp(s.z + 6, 10, 160) : 110, tx = s ? s.x + 40 : 80;
    if (s && (s.phase === 'pick' || s.phase === 'stance')) { tz = 100; tx = 70; }
    if (s && (s.phase === 'entry' || s.phase === 'done')) { tz = 20; }
    const w = ctx.w; w.cz = w.cz === undefined ? tz : w.cz + (tz - w.cz) * Math.min(1, dt * 4); w.cx = w.cx === undefined ? tx : w.cx + (tx - w.cx) * Math.min(1, dt * 4);
    game.focus(w.cx, 0, w.cz);
  },
  draw(ctx, r) {
    const s = ctx.s, g = r.ctx, t = game.real;
    // the hall: back wall with windows and stands, the tower, the pool cross-section
    Art.sky(g, r.bw, r.bh, ['#3a7ab8', '#7ab0d8', '#c8e0f0']);
    const wb = r.w(0, 0, 0)[1];
    for (let k = -2; k < 14; k++) { const x0 = r.w(k * 60, 0, 0)[0]; px.rect(g, x0, r.w(0, 0, 230)[1], 40, 70, '#9ad0f4'); px.rect(g, x0, r.w(0, 0, 230)[1] + 44, 40, 26, '#2a7ab8'); px.rect(g, x0 + 40, r.w(0, 0, 230)[1], 20, 70, '#e8ecf4'); }
    const st0 = r.w(0, 0, 150)[1], st1 = r.w(0, 0, 10)[1];
    O.Art.stands(g, r.w(130, 0, 0)[0], st0, r.bw, st1, { tiers: 4, seed: 41, scroll: r.ix, bg: '#2a4a6a', lip: '#3a5a7a', rail: '#e8ecf4' });
    const deckY = r.w(0, 0, 0)[1];
    px.rect(g, 0, deckY, r.bw, r.bh - deckY, '#2a8ad8');
    for (let i = 0; i < 6; i++) { const x = r.w(40 + i * 40 + Math.sin(t * .5 + i) * 10, 0, 0)[0]; px.blend(g, .18, 'add', () => px.poly(g, [[x, deckY], [x + 14, deckY], [x + 34, r.bh], [x + 4, r.bh]], '#bfe8ff')); }
    for (let i = 0; i < 18; i++) { const h = O.hash('bub' + i), bx = r.w(60 + h % 200, 0, 0)[0], by = deckY + ((h >>> 8) % 80) - ((t * 20 + i * 13) % 80); if (by > deckY) px.disc(g, bx, by, 1, '#d8f4ff'); }
    px.rect(g, 0, deckY - 1, r.bw, 2, '#bfe8ff');
    // the tower
    const tx = r.w(-40, 0, 0)[0], ex = r.w(EDGE_X, 0, 0)[0];
    px.rect(g, tx - 10, r.w(0, 0, EDGE_Z + 40)[1], 30, deckY - r.w(0, 0, EDGE_Z + 40)[1], '#c8ccd8'); px.rect(g, tx - 10, r.w(0, 0, EDGE_Z + 40)[1], 6, deckY - r.w(0, 0, EDGE_Z + 40)[1], '#a8acc0');
    for (const [m, len] of [[1, 20], [3, 30], [5, 38], [7.5, 46], [10, 70]]) { const y = r.w(0, 0, m * M)[1]; px.rect(g, tx, y, len * 1.5, 4, m === 10 ? '#e8ecf4' : '#d8dce8'); px.rect(g, tx, y + 4, len * 1.5, 2, '#8a90a8'); E.font.text(g, m + 'm', tx + 2, y + 6, '#3a3f5a', { font: 'tiny', outline: false }); }
    px.rect(g, ex - 2, r.w(0, 0, EDGE_Z)[1], 3, 2, '#e23b2e');
    // the judges' table and the scoreboard on the right
    const jx = 250; r.queue(jx, 0, 0, gg => { const p = r.w(jx, 0, 0); px.rect(gg, p[0] - 4, p[1] - 22, 110, 6, '#5a4a3a'); px.rect(gg, p[0] - 4, p[1] - 16, 110, 16, '#3a2e24'); }, { bias: -5 });
    ctx.w.judges.forEach((jr, i) => { const x = jx + 4 + i * 14; jr.update(1 / 60, { x, y: 0, z: 0, facing: Math.PI, pose: s && s.cards && s.judgeT > .3 + i * .15 ? 'cheer' : undefined }); r.actor(x, 0, 0, (gg, ox, oy) => { jr.draw(gg, ox, oy, r.view); if (s && s.cards && s.judgeT > .3 + i * .15) { const c = s.cards[i]; px.rect(gg, ox - 7, oy - 58, 14, 10, '#ffffff'); E.font.text(gg, c % 1 ? c.toFixed(1) : String(c), ox - 6, oy - 56, '#14182e', { font: 'tiny', outline: false }); } if (s && s.soaked) { px.blend(gg, .4, 'normal', () => px.rect(gg, ox - 6, oy - 40, 12, 40, '#6ab8e8')); } }); });
    Art.jumbo(g, r.w(200, 0, 160)[0], r.w(0, 0, 160)[1], 110, 40, s && s.d ? [s.d.name.slice(0, 22), 'DD ' + s.d.dd.toFixed(1), s.score != null ? s.score.toFixed(2) : ''] : ['10m PLATFORM']);
    if (!s) return;
    const a = s.a;
    if (s.phase !== 'pick') {
      const z = s.phase === 'stance' && s.d && s.d.armstand ? EDGE_Z + 2 : s.z;
      r.actor(s.x, 0, z, (gg, ox, oy) => a.rig.draw(gg, ox, oy, r.view), { ghost: a.turboT > 0 ? { color: '#ffe8a0', life: .3, alpha: .5, owner: a.rig } : undefined });
      if (a.turboT > 0 && Math.floor(t * 30) % 2) game.particles.glints(s.x, 0, s.z + 10, 1, '#fff6c8', 8);
    } else { a.rig.update(1 / 60, { x: EDGE_X - 16, y: 0, z: EDGE_Z, facing: 0, pose: 'hips' }); r.actor(EDGE_X - 16, 0, EDGE_Z, (gg, ox, oy) => a.rig.draw(gg, ox, oy, r.view)); }
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return; const a = s.a;
    if (s.phase === 'pick') {
      UI.text(g, 'CHOOSE YOUR DIVE', W / 2 - UI.tw('CHOOSE YOUR DIVE', 2) / 2, 50, '#ffffff', { scale: 2 });
      s.opts.forEach((id, i) => { const d = DIVES[id], w = 120, x = Math.round(W / 2 - 1.5 * w - 6 + i * (w + 6)), y = 74, f = s.pick === i; UI.panel(g, x, y, w, 64, { trim: f ? '#f2b632' : '#3a3f66', alpha: .9 }); UI.text(g, ['EASIER', 'HARDER', 'HARDEST'][i], x + 6, y + 6, f ? '#f2b632' : '#aab0d0'); UI.wrap(d.name, w - 12, 1).forEach((l, k) => UI.text(g, l, x + 6, y + 18 + k * 10, '#ffffff')); UI.text(g, 'DD ' + d.dd.toFixed(1) + ' · ' + d.pos.toUpperCase(), x + 6, y + 48, '#ffe066'); });
      if (a.human) O.Prompt.strip(g, [['moveH', 'CHOOSE'], ['action', 'DIVE']], W / 2, H - 22, { inp: a.inp });
      return;
    }
    const d = s.d; UI.text(g, d.name + ' · DD ' + d.dd.toFixed(1), 12, 46, '#ffe066');
    if (s.phase === 'stance') { s.bar.draw(g, W / 2 - 90, H - 56, 180, 10, { label: 'TAKE-OFF' }); if (a.human) O.Prompt.draw(g, W / 2, H - 38, 'action', { inp: a.inp, label: 'JUMP', align: 'center', size: 2 }); }
    if (s.phase === 'air' || s.phase === 'entry') {
      // the rotation dial: half-somersaults done vs required
      const cx = W - 52, cy = 80, R = 26, done = (s.th - d.start) / PI;
      UI.panel(g, cx - 40, cy - 34, 80, 84, { alpha: .8 });
      for (let k = 0; k < d.halves; k++) { const an = -PI / 2 + k / d.halves * PI * 2; px.disc(g, Math.round(cx + Math.cos(an) * R), Math.round(cy + Math.sin(an) * R), 3, done >= k + 1 ? '#4fe0a8' : '#3a3f66'); }
      const an = -PI / 2 + (s.th - d.start) * d.halves / (d.halves * PI) * PI * 2 / d.halves * d.halves / 2; void an;
      px.line(g, cx, cy, Math.round(cx + Math.sin(s.th) * (R - 6)), Math.round(cy - Math.cos(s.th) * (R - 6)), '#ffffff', 2);
      UI.text(g, Math.min(d.halves, Math.floor(done * 2) / 2).toFixed(1) + ' / ' + (d.halves / 2).toFixed(1), cx - 22, cy + 32, '#ffffff');
      if (d.twists) UI.text(g, 'TWISTS ' + s.twists + ' / ' + d.twists, cx - 34, cy - 30, '#ffe066');
      if (a.human && s.phase === 'air') O.Prompt.strip(g, [[d.pos === 'tuck' ? 'mashL' : 'mashR', 'HOLD ' + d.pos.toUpperCase()], ...(d.twists ? [['moveH', 'TWIST']] : [])], W / 2, H - 22, { inp: a.inp });
      if (s.pos && s.phase === 'air') UI.text(g, s.pos.toUpperCase(), W / 2 - UI.tw(s.pos.toUpperCase(), 2) / 2, 60, s.pos === d.pos ? '#4fe0a8' : '#ffffff', { scale: 2 });
    }
    if (s.cards) { const lab = s.rip ? 'RIP!' : s.flop ? 'BELLY FLOP!' : s.e <= 15 ? 'CLEAN!' : ''; if (lab) UI.text(g, lab, W / 2 - UI.tw(lab, 3) / 2, 56, s.flop ? '#ff6b6b' : '#4fe0a8', { scale: 3 }); s.cards.forEach((c, i) => { const x = Math.round(W / 2 - 75 + i * 30), y = 90; px.rect(g, x, y, 26, 20, s.drop && s.drop.includes(i) ? '#5a6080' : '#ffffff'); E.font.text(g, c % 1 ? c.toFixed(1) : String(c), x + 13 - E.font.width(c % 1 ? c.toFixed(1) : String(c), { scale: 1 }) / 2, y + 7, '#14182e', { outline: false }); }); UI.text(g, s.score.toFixed(2) + ' POINTS', W / 2 - UI.tw(s.score.toFixed(2) + ' POINTS', 2) / 2, 116, '#ffe066', { scale: 2 }); }
    if (ctx.meet.mode !== 'attract') O.HUD.board(g, ctx, 10, 60, 3, { w: 140 });
    O.HUD.flame(g, W / 2 - 23, 36, a);
  }
});

function entry(ctx) {
  const s = ctx.s, d = s.d, a = s.a, T = ctx.T;
  s.phase = 'entry'; s.pt = 0; s.z = 0;
  const halves = (s.th - d.start) / PI, nearest = O.god(a) ? d.halves : Math.round(halves), off = O.god(a) ? Math.min(5, Math.abs(halves - Math.round(halves)) * 180) : Math.abs(halves - nearest) * 180;   // degrees from the nearest vertical
  s.halvesDone = nearest; s.e = off;
  const feetFirst = (nearest + (d.start ? 1 : 0)) % 2 === 0;
  s.flop = off > 75; s.rip = !s.flop && off <= T.ripTolerance && !feetFirst;
  const sz = s.rip ? 0 : s.flop ? 30 : clamp(off / 3, 4, 20);
  ctx.fx(P => { if (s.rip) P.glints(s.x, 0, 2, 6, '#ffffff', 6); else P.bits(s.x, 0, 0, Math.round(sz * 2), ['#ffffff', '#bfe8ff', '#8ad8ff', '#4aa8e8']); P.dust(s.x, 0, 0, s.rip ? 2 : 6, { color: '#d8f4ff', size: 2 }); });
  if (s.flop) { ctx.sfx('slap'); ctx.yikes(a, d.dir < 0 ? 'wrongway' : 'bellyflop', { cue: 'flop' }); s.soaked = true; }
  else { ctx.sfx('splash', { vol: s.rip ? .15 : .7 }); if (s.rip) { ctx.cue('rip', { a }, { prio: 3 }); ctx.hype(a, .3); } else if (off < 15) ctx.cue('good', { a }); else if (halves > d.halves + .3) ctx.cue('over', { a }); }
}
function judge(ctx) {
  const s = ctx.s, d = s.d, a = s.a, T = ctx.T, rnd = ctx.rng('judges:' + a.id + ':' + s.dive);
  const e = s.e;
  let base = s.flop ? 1 : e <= T.ripTolerance ? 9.5 : e <= 15 ? 8.5 : e <= 25 ? 7 : e <= 45 ? 5 : 3;
  base += .5 * s.q;
  const posTotal = s.inPos + s.wrongPos; if (posTotal > 0 && s.wrongPos > s.inPos) base -= 1;
  base -= 2 * Math.abs(s.halvesDone - d.halves);
  if (d.twists) base -= 1.5 * Math.max(0, d.twists - s.twists);
  const cards = [0, 1, 2, 3, 4].map(() => Math.round(clamp(base + O.gauss(rnd) * T.judgeNoise * clamp(.25 + e / 25, .25, 1.2), 0, 10) * 2) / 2);
  const order = cards.map((c, i) => [c, i]).sort((x, y) => x[0] - y[0]);
  s.drop = [order[0][1], order[4][1]];
  const mid = order.slice(1, 4).reduce((m, x) => m + x[0], 0);
  s.cards = cards; s.score = +(mid * d.dd).toFixed(2); s.judgeT = 0;
  if (cards.every(c => c === 10)) { ctx.cue('tens', { a }, { prio: 5 }); if (!O.sandbox) O.recordBurst('PERFECT 10s!', a.name); }
  if (!O.sandbox) { ctx.sfx('judge'); O.Crowd.bump(s.score / (d.dd * 30)); if (s.score > d.dd * 24) O.CrowdAudio.cheer(); else O.CrowdAudio.applause(); }
}
function animate(ctx, dt) {
  const s = ctx.s, a = s.a, rig = a.rig, d = s.d; if (!d) return;
  const back = d.dir < 0 || d.inward, st = { x: s.x, y: 0, z: Math.max(-50, s.z), facing: back ? Math.PI : 0, vx: 0, vy: 0 };
  const sign = d.dir < 0 && !d.inward ? -1 : d.inward ? -1 : 1;
  if (s.phase === 'stance') { O.Pose.set(rig, d.armstand ? 'dive' : 'armsUp'); O.Pose.rot(rig, d.armstand ? PI : 0, 0, [0, 0, rig.o.hipZ]); if (d.armstand) st.z = EDGE_Z + 2 + rig.o.hipZ * 2.3 * rig.o.size; }
  else if (s.phase === 'air') { O.Pose.set(rig, s.pos === 'tuck' ? 'tuck' : s.pos === 'pike' ? 'pike' : 'layout', {}, { snap: false }); O.Pose.rot(rig, sign * s.th, 0, [0, 0, rig.o.hipZ]); st.facing += s.twists * PI + (s.twT > 0 ? (1 - s.twT / ctx.T.twistTime) * PI : 0); st.z = s.z - rig.o.hipZ * rig.o.size; }
  else { O.Pose.set(rig, s.flop ? 'bellyFlop' : 'dive'); O.Pose.rot(rig, s.flop ? PI / 2 : PI, 0, [0, 0, rig.o.hipZ]); st.z = s.z - 30; if (s.cards) { O.Pose.rot(rig, 0, 0); O.Pose.clear(rig); st.z = -6; st.pose = s.score > d.dd * 22 ? 'cheer' : 'wave'; st.swim = false; } }
  rig.update(dt, st);
}
})();
