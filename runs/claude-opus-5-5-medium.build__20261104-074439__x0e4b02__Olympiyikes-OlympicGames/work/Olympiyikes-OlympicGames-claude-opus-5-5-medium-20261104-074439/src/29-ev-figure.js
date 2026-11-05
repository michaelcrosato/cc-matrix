/* OLYMPIYIKES! — Glory Ice Palace and FIGURE SKATING, free skate (§6.10): "Waltz of the Yikes" on the engine's rhythm module. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;
const BAR = 12;   // a 3/4 bar at 4 steps a beat
const PARTS = [['INTRO', 4, 'intro'], ['STEP SEQUENCE A', 8, 'stepA'], ['JUMP COMBO 1', 4, 'jump1'], ['SPIRAL & SPIN', 8, 'spin'], ["COACH'S CORNER", 8, 'coach'], ['STEP SEQUENCE B', 8, 'stepB'], ['JUMP COMBO 2', 4, 'jump2'], ['FINALE', 4, 'finale']];
const LANES = 5, LEN = PARTS.reduce((s, p) => s + p[1], 0) * BAR + BAR;
/** the chart: lane strings built deterministically from the parts (~140 notes) */
function chart(easy) {
  const L = Array.from({ length: LANES }, () => Array(LEN).fill('.')), r = E.rng(0x5CA7E);
  let bar = 0; const put = (lane, step, ch) => { if (step < LEN) L[lane][step] = ch; };
  const hold = (step, len) => { put(4, step, 'h'); for (let k = 1; k < len; k++) put(4, step + k, '='); };
  for (const [, bars, kind] of PARTS) {
    for (let b = 0; b < bars; b++) {
      const s0 = (bar + b) * BAR;
      if (kind === 'intro') { if (b === 3) put(1, s0, 'x'); }
      else if (kind === 'stepA') { put([0, 3][b % 2], s0, 'x'); put([3, 0][b % 2], s0 + 4, 'x'); if (b % 2) put(Math.floor(r() * 4), s0 + 8, 'x'); }
      else if (kind === 'jump1') { if (b === 0 || b === 2) hold(s0, 8); else put(b === 1 ? 0 : 3, s0 + 4, 'x'); }
      else if (kind === 'spin') { if (b < 4) { put(2, s0, 'x'); if (b % 2) put(2, s0 + 6, 'x'); } else { put(1, s0, 'x'); put(1, s0 + 4, 'x'); if (b % 2) put(1, s0 + 8, 'x'); } }
      else if (kind === 'coach') { const call = b < 2 || (b >= 4 && b < 6); const pat = [[0, 0], [4, 3], [8, 2]], pat2 = [[0, 1], [4, 2], [8, 0]]; for (const [o, l] of (b % 2 ? pat2 : pat)) put(l, s0 + o, call ? 'c' : 'x'); }
      else if (kind === 'stepB') { for (const o of [0, 4, 8]) put(Math.floor(r() * 4), s0 + o, 'x'); if (b % 2) put(Math.floor(r() * 4), s0 + 10, 'x'); }
      else if (kind === 'jump2') { if (b === 0) hold(s0, 16); else if (b === 2) { put(0, s0, 'x'); put(3, s0 + 4, 'x'); put(2, s0 + 8, 'x'); } else if (b === 3) put(1, s0, 'x'); }
      else if (kind === 'finale') { put(b % 2 ? 0 : 3, s0, 'x'); put(2, s0 + 4, 'x'); if (b === 3) hold(s0 + 8, 4); }
    }
    bar += bars;
  }
  put(4, bar * BAR, 'x');   // the final pose
  if (easy) for (let l = 0; l < 4; l++) { let k = 0; for (let s = 0; s < LEN; s++) if (L[l][s] === 'x' && k++ % 2) L[l][s] = '.'; }
  return L.map(a => a.join(''));
}
const partAt = step => { let bar = Math.floor(step / BAR), acc = 0; for (const p of PARTS) { if (bar < acc + p[1]) return p; acc += p[1]; } return PARTS[PARTS.length - 1]; };
const SONG = () => Object.assign({}, O.SONGS.waltz, { loop: false, len: LEN + BAR });
const RINK = { W: 720, H: 360, X0: 40, Y0: 40 };
const iceTex = (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, sc = E.noise2(x * .03, y * .11) > .78 ? 12 : 0, lx = x - RINK.X0, ly = y - RINK.Y0;
  if (lx < 0 || ly < 0 || lx > RINK.W || ly > RINK.H) return [40 + n * 10, 46 + n * 10, 70 + n * 10];
  const mid = Math.abs(lx - RINK.W / 2) < 1; if (mid) return [200, 60, 80];
  const ring = Math.abs(Math.hypot(lx - RINK.W / 2, ly - RINK.H / 2) - 48) < 1; if (ring) return [80, 130, 220];
  const g = 226 + n * 14 - sc + E.noise2(x * .01, y * .01) * 14; return [g - 8, g, g + 10]; };
let rmap = null;
const rinkMap = () => { if (rmap) return rmap; const cols = Math.ceil((RINK.W + 80) / 16), rows = Math.ceil((RINK.H + 80) / 16), R = []; for (let y = 0; y < rows; y++) { let s = ''; for (let x = 0; x < cols; x++) s += (y === 1 || y === rows - 2) && x > 0 && x < cols - 1 || (x === 1 || x === cols - 2) && y > 0 && y < rows - 1 ? '#' : '.'; R.push(s); }
  rmap = new E.TileMap({ rows: R, legend: { '#': 1, '.': { floor: 'ice' } }, floorTex: iceTex, outside: '#141830', ao: 3, types: { 1: { h: 10, top: '#e8ecf4', side: '#2a5ab8', face: 'plank', cut: true, cutH: 5 } } }); return rmap; };
const path = (u) => { const cx = RINK.X0 + RINK.W / 2, cy = RINK.Y0 + RINK.H / 2; return [cx + Math.sin(u) * RINK.W * .36, cy + Math.sin(u * 2) * RINK.H * .3]; };
const VAL = { perfect: 1, great: .8, good: .5, miss: 0 };

O.defEvent({
  id: 'figure', name: 'FIGURE SKATING', short: 'Figure', season: 'winter', venue: 'Glory Ice Palace', pictogram: 'figure', music: null, view: 'threequarter', sport: 'figure', lights: .62,
  format: { type: 'attempts', rounds: 1, combine: 'best', highlight: [] }, maxTime: 90, turbo: 'STAR POWER!', noPopup: true, finishTime: 4,
  measure: { better: 'higher', unit: 'pts', fmt: v => v.toFixed(2), wr: [228.56, 'BON', 'COCO BONBON'], qualify: { Easy: 120, Normal: 150, Hard: 180 } },
  points: v => Math.min(1200, 5.3 * v),
  tune: { perfectMs: [45, 20, 90, 1, 'Perfect (ms)'], greatMs: [90, 40, 150, 1, 'Great (ms)'], goodMs: [135, 60, 220, 1, 'Good (ms)'], lifeDrain: [1, 0, 3, .05, 'Life drain ×'], tesScale: [130, 60, 200, 1, 'TES for a perfect program'], pcsWeight: [2, .5, 4, .05, 'PCS weight'] },
  howto: { goal: 'Skate the program to the waltz. Highest score wins.', rows: [[['move'], 'Arrows / d-pad: hit the notes'], [['action'], 'Hold notes = JUMPS: hold, then let go'], [null, "Coach's Corner: listen, then answer"], [['turbo'], 'STAR POWER: every judgement better']] },
  yikesKinds: ['FALL!'],
  laurel: { id: 'fullcombo', name: 'FULL COMBO', text: 'A program without a miss', test: (ctx, a) => a.S.rh && a.S.rh.counts.miss === 0 && !a.S.rh.failed },
  hub: { ok: false }, attract: { seconds: 22, after: 3, setup(ctx) { const s = ctx.cur.S; s.skipTo = PARTS.slice(0, 6).reduce((n, p) => n + p[1], 0) * BAR; } },
  turnLabel: ctx => 'FREE SKATE · WALTZ OF THE YIKES',
  phases: PARTS.map(([nm], i) => [nm.toLowerCase(), ctx => { const s = ctx.cur.S; s.skipTo = PARTS.slice(0, i).reduce((n, p) => n + p[1], 0) * BAR; }]),
  build() { rinkMap(); },
  start(ctx) {
    const a = ctx.cur;
    a.S = { rh: null, started: false, t: 0, falls: 0, val: 0, max: 0, moves: [], move: null, moveT: 0, u: 0, endT: 0, over: false, finishPose: false, lastJ: null, plush: [], spin: 0 };
  },
  simPerf(ctx, a) {
    const r = ctx.rng('prog'), sk = ctx.skill(a), acc = Math.max(.1, Math.min(1, sk + O.gauss(r) * .05)), falls = r() < (1 - sk) * 1.2 ? 1 + Math.floor(r() * 2 * (1 - sk)) : 0;
    const tes = ctx.T.tesScale * Math.pow(acc, 1.3) * (1 - falls * .04), pcs = Math.min(100, (acc * 9.4 + (sk > .9 ? .5 : 0)) * 5 * ctx.T.pcsWeight) - falls;
    return Math.round((tes + pcs) * 100) / 100;
  },
  bot(ctx, a, dt, I) {
    const s = a.S, rh = s.rh; if (!rh || !rh.started) return I;
    const sk = ctx.skill(a), pos = game.audio.pos.step, spb = 60 / 138 / 4;
    for (const n of rh.notes) { if (n.call || n.j) continue; if (n.step > pos + 4) break; const dtMs = (n.step - pos) * spb * 1000; const err = a.pilot.cheat === 'perfect' ? 0 : (1 - sk) * 70; if (dtMs <= -err * .5 + 6) { if (n.lane === 4) I.A = true; else I[['left', 'down', 'up', 'right'][n.lane]] = true; n._botHit = true; } }
    for (const n of rh.notes) if (n.holding && n.lane === 4 && pos < n.end) I.Ad = true;
    if (a.hype >= 1) I.T = true;
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T;
    for (const a of ctx.active) {
      const s = a.S, I = a.I; s.t += dt;
      if (!s.rh) {
        s.rh = new E.Rhythm(game, { song: SONG(), chart: chart(ctx.meet.difficulty === 'Easy'), lanes: ['fs0', 'fs1', 'fs2', 'fs3', 'fs4'], windows: { perfect: T.perfectMs * O.winScale(), great: T.greatMs * O.winScale(), good: T.goodMs * O.winScale() }, life: .6, lead: 1.8,
          voice: { wave: 'triangle', vol: .18, dur: .12 }, on: { judge: (j, n) => judged(ctx, a, j, n), fail: () => { ctx.fx.banner('PROGRAM OVER', { y: .3 }); } } });
        s.rh.start(); s.started = true;
        s.total = s.rh.notes.filter(n => !n.call).length;
        if (s.skipTo) { const C = game.audio.song; if (C) { C.s0 = s.skipTo; C.t0 = game.time; if (C.next !== undefined) C.next = s.skipTo; } for (const n of s.rh.notes) if (n.step < s.skipTo) { n.j = n.call ? 'call' : 'perfect'; s.val += n.call ? 0 : 1; } }
        if (!ctx.fast) O.Comms.say('K:Show them your best, ' + a.short + '! Follow the music!', null, 3);
      }
      const rh = s.rh;
      if (!s.over) {
        // inputs to lanes (the player's own input or a bot's)
        ['left', 'down', 'up', 'right'].forEach((k, i) => { if (I[k]) rh.hit(i); else if (rh.down[i]) rh.release(i); });
        if (I.A) rh.hit(4); else if (rh.down[4] && !I.Ad) rh.release(4);
        rh.update();
        const pos = game.audio.pos.step; s.part = partAt(Math.max(0, pos));
        if (s.part[2] === 'coach' && s.coachSaid !== true && !ctx.fast) { s.coachSaid = true; O.Comms.say("K:Coach's Corner! Listen... then copy me!", null, 4); }
        s.u += dt * .32 * (1 + (s.move === 'spiral' ? .4 : 0));
        if (rh.done || pos >= LEN + 2) { s.over = true; s.endT = 0; finish(ctx, a); }
      } else s.endT += dt;
      if (s.moveT > 0) s.moveT -= dt;
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.endT > 3.5 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera(ctx) { const a = ctx.cur; if (!a || !a.S || a.S.u === undefined) { game.focus(RINK.X0 + RINK.W / 2, RINK.Y0 + RINK.H / 2, 0); return; } const p = path(a.S.u); game.focus(p[0], p[1] + 28, 10); game.setZoom(1); },
  draw(ctx, r) {
    r.sky(['#0a0820', '#14103a', '#201848']);
    const map = rinkMap(); map.drawFloor(r); map.queueWalls(r);
    // stands around, moving colored spots
    r.queue(RINK.X0 + RINK.W / 2, 0, 0, g => { const a0 = r.w(0, 10, 0); px.rect(g, 0, 0, r.W, Math.max(0, a0[1]), '#141030'); O.Art.crowd(g, 0, Math.max(0, a0[1] - 50), r.W, 46, O.Crowd.level, 41, ['#ff7fb8', '#6fe0c0', '#f2b632', '#3a7cf0', '#ffffff', '#e83ae0']); }, { bias: -3000 });
    for (let k = 0; k < 3; k++) { const p = path(game.real * .2 + k * 2.1); game.lights.add(p[0], p[1], 0, 120, .8, { color: ['#ff9ad0', '#9ad8ff', '#fff0b0'][k] }); }
    // the kiss & cry booth: bench, flowers, a giant plush mascot
    const kx = RINK.X0 + RINK.W - 30, ky = RINK.Y0 + RINK.H + 24;
    r.queue(kx, ky, 0, g => { const p = r.w(kx, ky, 0); px.rect(g, p[0] - 40, p[1] - 22, 80, 22, '#e83a8a'); px.rect(g, p[0] - 40, p[1] - 26, 80, 4, '#ffd0e8'); E.font.text(g, 'KISS & CRY', p[0], p[1] - 17, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); for (let i = 0; i < 4; i++) px.disc(g, p[0] - 30 + i * 6, p[1] - 4, 3, ['#ff5a7a', '#ffd060', '#ff8ad0', '#ffffff'][i]); px.disc(g, p[0] + 26, p[1] - 10, 9, '#f8f8ff'); px.disc(g, p[0] + 23, p[1] - 12, 1, '#1a1d2e'); px.disc(g, p[0] + 29, p[1] - 12, 1, '#1a1d2e'); });
    const a = ctx.cur;
    if (a && a.rig && a.S.u !== undefined) {
      const s = a.S, p = path(s.u), jumpZ = s.move === 'jump' && s.moveT > 0 ? Math.sin((1 - s.moveT / s.moveDur) * Math.PI) * 16 : 0;
      r.shadow(p[0], p[1], 6, .3);
      r.actor(p[0], p[1], jumpZ, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { flash: a.turboT > 0 ? '#ffffff' : false, flashMix: .2, ghost: a.turboT > 0 ? { color: ['#ff5a5a', '#ffd060', '#5aff8a', '#5ad8ff'][Math.floor(game.real * 8) % 4], life: .25, alpha: .5 } : undefined });
      if (a.turboT > 0) game.particles.glints(p[0], p[1], 10, 1, '#ffffff', 10);
      for (const pl of s.plush) r.queue(pl.x, pl.y, pl.z, g => { const q = r.w(pl.x, pl.y, pl.z); px.disc(g, q[0], q[1], 3, '#f8f8ff'); px.rect(g, q[0] - 3, q[1] + 1, 3, 1, '#ff7a2a'); px.rect(g, q[0], q[1] + 1, 3, 1, '#3fa8e8'); });
    }
  },
  hud(ctx, r, g) {
    const a = ctx.cur; O.HUD.header(g, r, ctx, a && a.S.part ? a.S.part[0] : 'FREE SKATE');
    if (!a || !a.S || !a.S.rh) return;
    const s = a.S, rh = s.rh;
    O.HUD.big(g, r.W - 14, 10, 'COMBO ' + rh.combo);
    O.text(g, 'LIFE', r.W - 120, 32, '#c8d0f0'); O.HUD.power(g, r.W - 92, 33, 78, rh.life, rh.life < .25 ? '#ff6b6b' : '#ff8ad0');
    // the highway along the bottom third: notes travel right to left to the target line
    const y0 = r.H - 70, x0 = 70, len = Math.min(r.W - 110, 340), gap = 12;
    O.panel(g, 8, y0 - 36, x0 + len + 12, 5 * gap + 24, { alpha: .6 });
    for (let l = 0; l < 5; l++) { const yy = y0 - 24 + l * gap; px.rect(g, x0, yy, len, 1, '#3a4070'); O.Prompt.draw(g, x0 - 34, yy - 4, ['left', 'down', 'up', 'right', 'action'][l], { input: a.input || game.input }); }
    px.rect(g, x0, y0 - 30, 2, 5 * gap + 8, '#f2c94c');
    for (const it of rh.ahead()) { const n = it.note; if (n.call) continue; const x = x0 + it.dt / rh.lead * len, yy = y0 - 24 + n.lane * gap; const col = ['#ff6b6b', '#4fe0a8', '#7fb2ff', '#ffd060', '#ff8fd8'][n.lane];
      if (n.end > n.step) { const xe = x0 + it.dtEnd / rh.lead * len; px.rect(g, Math.max(x0, x), yy - 2, Math.max(1, xe - Math.max(x0, x)), 5, n.holding ? '#ffffff' : E.shade(col, -.3)); }
      if (x >= x0 - 4) { px.disc(g, x, yy, 5, '#05060f'); px.disc(g, x, yy, 4, col); } }
    for (const it of rh.ahead(true)) { const n = it.note; const x = x0 + it.dt / rh.lead * len, yy = y0 - 24 + n.lane * gap; if (x >= x0) { px.disc(g, x, yy, 4, '#5a4a8a'); px.disc(g, x, yy, 2, '#c8a8ff'); } }
    if (s.part && s.part[2] === 'coach') O.text(g, s.rh.notes.some(n => n.call && !n.j) ? "COACH'S CALL — LISTEN" : 'YOUR TURN — ANSWER!', x0 + len / 2, y0 - 48, '#c8a8ff', { align: 'center' });
    if (rh.last && game.time - rh.last.t < .5) O.text(g, rh.last.j.toUpperCase() + '!', r.W / 2, r.H * .25, { perfect: '#f2c94c', great: '#4fe0a8', good: '#7fb2ff', miss: '#ff6b6b' }[rh.last.j] || '#ffffff', { align: 'center', scale: 2 });
    if (a.human) O.HUD.flame(g, r.W - 20, 50, a, a.input);
    if (s.result) { const w = 260, x = r.W / 2 - w / 2, y = 44; O.panel(g, x, y, w, 64); O.text(g, 'KISS & CRY', r.W / 2, y + 6, '#ff8ad0', { align: 'center' }); O.text(g, 'TES ' + s.result.tes.toFixed(2) + '   PCS ' + s.result.pcs.toFixed(2), r.W / 2, y + 20, '#ffffff', { align: 'center' }); if (s.falls) O.text(g, 'FALLS -' + s.falls, r.W / 2, y + 32, '#ff6b6b', { align: 'center' }); O.text(g, s.result.total.toFixed(2), r.W / 2, y + 42, '#f2c94c', { align: 'center', scale: 2 }); }
  },
  ghostState() { return [0, 0, 0, 0, 0]; }, ghostDraw() { return null; }
});
function judged(ctx, a, j, n) {
  const s = a.S; let jj = j;
  if (a.turboT > 0 && j !== 'perfect') jj = j === 'great' ? 'perfect' : j === 'good' ? 'great' : 'good';
  s.val += VAL[jj] || 0; s.lastJ = jj;
  if (jj === 'perfect') ctx.hype(a, .03);
  const lane = n.lane, isHold = n.end > n.step;
  if (jj === 'miss' && isHold && !ctx.god(a)) { s.falls++; s.move = 'fall'; s.moveT = s.moveDur = 1.4; ctx.yikes(a, 'FALL!', 'fall'); ctx.fx.sfx('thunk'); return; }
  if (jj === 'miss') return;
  if (isHold) { s.move = 'jump'; s.moveDur = s.moveT = (n.end - n.step) * 60 / 138 / 4 + .2; ctx.fx.sfx('whoosh'); if (n.end - n.step >= 16) { ctx.fx.banner('QUAD YIKES!', { y: .2 }); ctx.fx.say('figure', { name: a.short }); } }
  else { s.move = ['edgeL', 'sit', 'spiral', 'edgeR', 'pose'][lane]; s.moveT = s.moveDur = lane === 1 ? 1 : .6; }
  if (n.step >= LEN - BAR) { s.finishPose = true; s.move = 'pose'; s.moveT = 3; }
}
function finish(ctx, a) {
  const s = a.S, T = ctx.T, rh = s.rh, total = Math.max(1, s.total);
  const acc = s.val / total, tes = T.tesScale * acc - s.falls * 2;
  const comps = [acc, Math.min(1, rh.maxCombo / total * 1.5), acc * (1 - s.falls * .05), (acc + (s.finishPose ? .1 : 0)) / 1.1, Math.min(1, acc * 1.02)];
  const pcs = comps.reduce((t, c) => t + Math.max(0, Math.min(10, c * 10)), 0) * T.pcsWeight - s.falls;
  const tot = Math.max(0, Math.round((tes + Math.min(100, pcs)) * 100) / 100);
  s.result = { tes, pcs: Math.min(100, pcs), total: tot };
  ctx.finish(a, tot);
  ctx.fx.sfx('cheerSwell'); O.Crowd.excite(1);
  if (!ctx.fast) { for (let k = 0; k < 14; k++) { const rr = ctx.rng('plush' + k); s.plush.push({ x: RINK.X0 + rr() * RINK.W, y: RINK.Y0 + rr() * RINK.H, z: 0 }); } O.Comms.say(acc > .9 ? 'V:Grandpa would be whistling now.' : 'C:What a program from ' + a.short + '!', null, 6); }
  game.audio.music(null);
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig; if (s.u === undefined) return;
  const p = path(s.u), q = path(s.u + .01), fac = Math.atan2(q[1] - p[1], q[0] - p[0]);
  let pose = 'skateGlide', extra = {};
  if (s.moveT > 0) { pose = { edgeL: 'skateGlide', edgeR: 'skateGlide', sit: 'sitSpin', spiral: 'skateSpiral', pose: 'finalPose', jump: 'skateJump', fall: null }[s.move]; }
  if (s.move === 'jump' && s.moveT <= 0 && s.moveDur) { pose = 'skateLand'; }
  O.Pose.set(rig, pose, { t: s.t });
  if ((s.move === 'jump' || s.move === 'sit') && s.moveT > 0) s.spin += dt * (s.move === 'jump' ? 25 : 14); else s.spin *= Math.pow(.02, dt);
  rig.spin = s.spin;
  rig.bodyRoll = s.move === 'edgeL' && s.moveT > 0 ? -.25 : s.move === 'edgeR' && s.moveT > 0 ? .25 : 0;
  extra.down = s.move === 'fall' && s.moveT > 0 ? Math.sin((1 - s.moveT / 1.4) * Math.PI) : 0;
  rig.update(dt, Object.assign({ x: p[0], y: p[1], z: 0, vx: Math.cos(fac) * 60, vy: Math.sin(fac) * 60, facing: fac, run: .2, pose: s.over && s.endT > .3 ? 'cheer' : null }, extra));
  for (const pl of s.plush) pl.z = Math.max(0, (pl.z || 60) - dt * 40);
}
})();
