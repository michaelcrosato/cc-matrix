// 50m FREESTYLE (short course) — summer · Splash Palace · the dive, strokes on the beat, breathing, the flip turn and
// the touch. And Splash Palace itself (O.Venue.pool), which the diving reuses.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, M = 12, POOL = 25 * M;
const LANE_Y = i => 30 + (7 - i) * 22;

// Splash Palace: windows to the beach, stands, the deck, the water with caustics and lane ropes
O.Venue.pool = (r, o = {}) => {
  const g = r.ctx, t = game.real, W = r.W;
  const top = r.w(0, -20, 70)[1];
  Art.sky(g, r.bw, Math.max(4, top + 30), ['#5aa8e8', '#9ad0f4', '#e8f4fb']);
  // big windows onto the beach: sea, sand, palms
  const wy = Math.max(-60, top - 60);
  px.rect(g, 0, wy + 30, r.bw, 18, '#2a7ab8'); for (let i = 0; i < 20; i++) px.rect(g, (i * 41 + Math.floor(t * 6)) % (r.bw + 40) - 20, wy + 34 + (i % 3) * 4, 10, 1, '#c8e8f8');
  px.rect(g, 0, wy + 48, r.bw, 10, '#f0d8a0');
  for (let k = 0; k < 8; k++) { const x = ((k * 97 - r.ix * .2) % (r.bw + 60) + r.bw + 60) % (r.bw + 60) - 30; px.rect(g, x, wy + 22, 2, 28, '#7a5a3a'); for (let f = 0; f < 5; f++) px.line(g, x + 1, wy + 22, x + 1 + Math.cos(f * 1.3 + Math.sin(t + k) * .1) * 10, wy + 22 + Math.sin(f * 1.3) * 5 - 2, '#3a9a4a', 2); }
  for (let k = 0; k < 30; k++) { const x = ((k * 48 - r.ix * .6) % (r.bw + 48) + r.bw + 48) % (r.bw + 48) - 24; px.rect(g, x, wy, 3, 60, '#e8ecf4'); }
  px.rect(g, 0, wy + 58, r.bw, 4, '#c8ccd8');
  // stands
  const yTop = r.w(0, -20, 40)[1], yBot = r.w(0, 12, 0)[1];
  Art.stands(g, 0, yTop, r.bw, yBot, { tiers: 3, seed: 21, scroll: r.ix, bg: '#2a4a6a', lip: '#3a5a7a', rail: '#e8ecf4' });
  const jx = r.w(o.jumboX || 380, 0, 0)[0]; if (jx > -140 && jx < r.bw + 20) Art.jumbo(g, jx, yTop - 54, 100, 44, o.jumbo || ['SPLASH PALACE']);
  // deck and water
  const xa = (r.ix - 60) / 1.5, xb = (r.ix + W + 60) / 1.5, y0 = 12, y1 = 196;
  Art.quad(r, [[xa, y0, 0], [xb, y0, 0], [xb, 19, 0], [xa, 19, 0]], '#e8ecf4');
  Art.quad(r, [[xa, y1, 0], [xb, y1, 0], [xb, 280, 0], [xa, 280, 0]], '#e8ecf4');
  for (let k = Math.floor(xa / 16); k < xb / 16; k++) Art.wline(r, [k * 16, y1, 0], [k * 16, 280, 0], '#c8ccd8');
  const wx0 = o.x0 !== undefined ? o.x0 : 0, wx1 = o.x1 !== undefined ? o.x1 : POOL;
  Art.quad(r, [[Math.max(xa, wx0 - 300), 19, 0], [Math.min(xb, wx1 + 300), 19, 0], [Math.min(xb, wx1 + 300), y1, 0], [Math.max(xa, wx0 - 300), y1, 0]], '#e8ecf4');
  Art.quad(r, [[wx0, 19, 0], [wx1, 19, 0], [wx1, y1, 0], [wx0, y1, 0]], '#2a8ad8');
  // caustics
  for (let i = 0; i < 90; i++) { const h = O.hash('cau' + i), x = wx0 + (h % 1000) / 1000 * (wx1 - wx0), y = 22 + ((h >>> 10) % 170), ph = t * 1.6 + (h % 7); const p = r.w(x + Math.sin(ph) * 6, y, 0); px.blend(g, .35, 'add', () => px.rect(g, p[0], p[1], 6 + (h % 4) * 2, 1, '#bfe8ff')); }
  // lane lines on the floor, the T at each wall
  if (o.lanes !== false) for (let i = 0; i < 8; i++) { const y = LANE_Y(i); Art.wline(r, [wx0 + 12, y, 0], [wx1 - 12, y, 0], '#1a5aa8', 2); }
  // lane ropes: coloured floats
  if (o.lanes !== false) for (let i = 0; i <= 8; i++) { const y = i === 8 ? LANE_Y(7) - 11 : LANE_Y(i) + 11; for (let x = wx0; x <= wx1; x += 4) { const p = r.w(x, y, 0), c = x < wx0 + 5 * M || x > wx1 - 5 * M ? '#e23b2e' : (Math.floor(x / 4) % 2 ? '#f2b632' : '#ffffff'); px.rect(g, p[0], p[1] - 1, 3, 2, c); } }
  // backstroke flags at 5 m
  if (o.lanes !== false) for (const fx of [wx0 + 5 * M, wx1 - 5 * M]) { const a = r.w(fx, 19, 30), b = r.w(fx, 196, 30); px.line(g, a[0], a[1], b[0], b[1], '#3a3f5a', 1); for (let k = 0; k < 14; k++) { const q = r.w(fx, 22 + k * 13, 30); px.poly(g, [[q[0], q[1]], [q[0] + 3, q[1]], [q[0] + 1.5, q[1] + 4]], ['#e23b2e', '#ffffff', '#2f7fe0'][k % 3]); } }
  // the pool edge
  Art.wline(r, [wx0, 19, 0], [wx1, 19, 0], '#c8ccd8', 2); Art.wline(r, [wx0, 196, 0], [wx1, 196, 0], '#c8ccd8', 2);
};

const SB_ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
O.defEvent({
  id: 'swim', name: '50m FREESTYLE', short: '50m Free', season: 'summer', venueName: 'SPLASH PALACE', music: 'swim', view: 'brawler',
  format: { type: 'race' }, M,
  measure: { unit: 's', better: 'lower', fmt: v => v.toFixed(2) + ' s', wr: [19.62, 'WAV', 'MARINA SPLASHWORTH'], qualify: { Easy: 25.5, Normal: 23.2, Hard: 21.6 }, seedStep: .25 },
  points: t => 18.9 * Math.pow(Math.max(0, 35 - t), 1.5),
  tune: { vMax: [2.45, 1.5, 3.5, .05, 'Top speed (m/s)'], perfectWindow: [70, 20, 160, 5, 'Perfect stroke window (ms)'], goodWindow: [150, 60, 300, 5, 'Good stroke window (ms)'], o2Drain: [.11, 0, .4, .01, 'Oxygen drain / s'], breathGain: [.45, .1, 1, .05, 'Oxygen per breath'], turnPush: [1.25, 1, 1.8, .05, 'Perfect turn push ×'], diveGlide: [3, 0, 6, .1, 'Dive glide bonus (m)'] },
  howto: { goal: 'Fastest over two lengths wins. Stroke on the beat, breathe, flip-turn at the wall.', rows: [[['action'], 'HOLD AND RELEASE: DIVE · TURN · TOUCH'], [['mashL', 'mashR'], 'STROKE ON THE BEAT (THE RING)'], [['alt'], 'BREATHE RIGHT AFTER A STROKE'], [['turbo'], 'DOLPHIN MODE: PERFECT STROKES']] },
  yikesKinds: ['falsestart', 'flopstart', 'gasp', 'bonk'], turboName: 'DOLPHIN MODE!',
  laurel: { id: 'torpedo', name: 'TORPEDO', text: 'React under 0.15 s, a perfect dive and a perfect turn in one race', test: (ctx, a) => { const L = ctx.s.lanes.find(l => l.a === a); return L && L.react != null && L.react < .15 && L.diveQ >= 1 && L.turnQ === 'PERFECT'; } },
  hub: { ok: true, attempts: 1, seconds: 45 }, attract: { seconds: 20 },
  phases: ['marks', 'dive', 'swim', 'turn', 'touch'],
  hubSample: ctx => { const L = ctx.s && ctx.s.lanes.find(l => l.a.human); return L ? [L.d] : null; },
  hubPoint: (ctx, q, g) => { const k = [4, 2, 5, 1, 6, 0, 7][(Object.keys(O.Hub.ghosts).map(Number).sort((a, b) => a - b).indexOf(g.id)) % 7], d = q[0]; return [d < 25 ? d * M : (50 - d) * M, LANE_Y(k), 0]; },
  build(ctx) {
    const humans = ctx.athletes.filter(a => a.human), cpus = ctx.athletes.filter(a => !a.human), lanes = new Array(8).fill(null); let k = 0;
    for (const a of humans) lanes[SB_ORDER[k++]] = a; for (const a of cpus) { while (k < 8 && lanes[SB_ORDER[k]]) k++; if (k < 8) lanes[SB_ORDER[k++]] = a; }
    ctx.laneOf = new Map(); lanes.forEach((a, i) => { if (a) { ctx.laneOf.set(a, i); a.lane = i; } });
    for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'swim');
    ctx.w.dolphins = [];
  },
  start(ctx) {
    const rnd = ctx.rng('beep:' + (ctx.w.resets || 0));
    ctx.s = { phase: 'marks', pt: 0, t: 0, beepAt: .8 + rnd() * .8, beepT: null, fin: 0, firstFin: null,
      lanes: ctx.athletes.map(a => ({ a, lane: ctx.laneOf.get(a), d: 0, v: 0, z: 8, state: 'block', react: null, holdT: 0, diveQ: 0, glide: 0, q: .6, o2: 1, next: 0, beat: 0, nb: 0, strokes: 0, sinceStroke: 9, judge: null, judgeT: 0, gasp: 0, turned: false, turnQ: null, bonk: 0, push: 0, fin: null, touch: false, perfects: 0, dq: false })) };
  },
  step(ctx, dt) {
    const s = ctx.s; s.pt += dt; s.t += dt;
    if (s.phase === 'marks') {
      for (const L of s.lanes) if (!L.dq && (L.a.I.A || L.a.I.Ad) && s.pt > .3) return falseStart(ctx, L);
      if (s.pt >= s.beepAt + (ctx.meet.mode === 'attract' ? 0 : 1)) { s.phase = 'race'; s.beepT = s.t; ctx.sfx('beepHi'); O.Crowd.bump(.7); }
    } else if (s.phase === 'race') {
      for (const L of s.lanes) swimLane(ctx, L, dt);
      const all = s.lanes.filter(L => !L.dq), fin = all.filter(L => L.fin != null).length, rt = s.t - s.beepT;
      const lead = all.reduce((m, L) => L.d > m.d ? L : m, all[0]); if (lead && lead.a !== s.leadA && rt > 4) { s.leadA = lead.a; ctx.cue('lead', { a: lead.a }, { cool: 4 }); }
      if (fin >= all.length || rt > 60 || (s.firstFin != null && all.every(L => L.fin != null || !L.a.human) && rt > s.firstFin + 5)) { s.phase = 'done'; for (const L of all) if (L.fin == null) ctx.note(L.a, 'DNF'); }
    }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: (ctx, a) => { const L = ctx.s.lanes.find(l => l.a === a); return L && L.fin != null && !L.dq ? L.fin : null; },
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), L = s.lanes.find(l => l.a === a), bs = a.bs, perfect = a.cheat === 'perfect';
    if (!L || L.dq || s.phase !== 'race') return I;
    const rt = s.t - s.beepT;
    if (bs.r === undefined) { bs.r = ctx.rng('bot:' + a.id); bs.react = perfect ? .12 : clamp(.25 - .11 * a.skill + (bs.r() - .5) * .06, .11, .4); bs.hold = perfect ? .4 : .2 + bs.r() * (.6 - .25 * a.skill); bs.breathEvery = 3 + Math.floor(bs.r() * 2); bs.turnAt = perfect ? .85 : lerp(1.4, .8, a.skill) + (bs.r() - .5) * .3; }
    if (L.state === 'block') { if (rt >= bs.react) I.Ad = true; return I; }
    if (L.state === 'windup') { I.Ad = L.holdT < bs.hold; return I; }
    if (L.state !== 'swim') return I;
    // strokes on the beat
    if (bs.nextPress === undefined || bs.forBeat !== L.nb) {
      bs.forBeat = L.nb; const r = bs.r(), pP = perfect ? 1 : .35 + .55 * a.skill, pG = perfect ? 0 : 1 - pP - (1 - a.skill) * .15;
      const err = r < pP ? (bs.r() - .5) * .07 : r < pP + pG ? (bs.r() < .5 ? -1 : 1) * (.075 + bs.r() * .06) : .2;
      bs.nextPress = L.nb + err;
    }
    if (L.bt >= bs.nextPress && bs.pressedFor !== L.nb) { if (L.next === 0) I.L = true; else I.R = true; bs.pressedFor = L.nb; bs.strokesSince = (bs.strokesSince || 0) + 1; }
    if (L.sinceStroke > .04 && L.sinceStroke < .2 && !L.breathed && (L.strokes - (bs.lastBreath || 0) >= bs.breathEvery || L.o2 < .4) && L.o2 < .75) { I.X = true; bs.lastBreath = L.strokes; }
    // the turn and the touch
    const toWall = L.d < 25 ? 25 - L.d : 50 - L.d;
    if (!L.turned && L.d < 25 && toWall <= bs.turnAt) I.A = true;
    if (L.turned && toWall < .7 && !L.touch) I.A = true;
    if (a.hype >= 1 && L.d > 20) I.T = true;
    return I;
  },
  onTurbo(ctx, a) { if (!O.sandbox) { const L = ctx.s.lanes.find(l => l.a === a); if (L) ctx.w.dolphins.push({ lane: L.lane + (L.lane < 7 ? 1 : -1), x: L.d < 25 ? L.d * M : (50 - L.d) * M, t: 0, dir: L.d < 25 ? 1 : -1 }); } },
  cam(ctx, dt) {
    const s = ctx.s; if (!s) return game.focus(150, 107, 22);
    const hs = s.lanes.filter(L => L.a.human && !L.dq), pool = hs.length ? hs : s.lanes;
    const lead = pool.reduce((m, L) => L.d > m.d ? L : m, pool[0]), wx = L => L.d < 25 ? L.d * M : (50 - L.d) * M;
    const tx = clamp(wx(lead) + (lead.d < 25 ? 50 : -50), 120, POOL - 120);
    ctx.w.cx = ctx.w.cx === undefined ? tx : ctx.w.cx + (tx - ctx.w.cx) * Math.min(1, dt * 4);
    game.focus(ctx.w.cx, 107, 22);
  },
  draw(ctx, r) {
    const s = ctx.s, t = game.real;
    const lead = s && s.lanes.reduce((m, L) => L.d > m.d ? L : m, s.lanes[0]);
    O.Venue.pool(r, { jumbo: ['50m FREE', lead ? O.shortName(lead.a.name) : 'SPLASH'] });
    for (let i = 0; i < 8; i++) r.queue(-6, LANE_Y(i), 0, g => { const p = r.w(-6, LANE_Y(i), 0), q = r.w(-6, LANE_Y(i), 10); px.rect(g, p[0] - 6, q[1], 10, p[1] - q[1], '#c8ccd8'); px.rect(g, p[0] - 6, q[1], 10, 3, '#f2b632'); E.font.text(g, String(i + 1), p[0] - 3, q[1] + 4, '#14182e', { font: 'tiny', outline: false }); }, { bias: -3 });
    if (!s) return;
    for (const L of s.lanes) if (L.a.human) { const y = LANE_Y(L.lane); r.decal(g => px.blend(g, .2, 'normal', () => px.poly(g, [r.w(0, y - 11, 0), r.w(POOL, y - 11, 0), r.w(POOL, y + 11, 0), r.w(0, y + 11, 0)], L.a.color))); }
    for (const L of s.lanes) {
      const a = L.a, y = LANE_Y(L.lane), x = L.state === 'block' || L.state === 'windup' ? -6 : (L.d < 25 ? L.d * M : (50 - L.d) * M), z = L.z;
      if (L.state !== 'block' && L.state !== 'windup') r.queue(x, y + 3, 0, g => { const p = r.w(x, y + 3, 0); px.blend(g, .35, 'normal', () => px.ell(g, p[0], p[1], 16, 3, '#1a5aa8')); }, { bias: -1 });
      r.actor(x, y, z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { ghost: a.turboT > 0 ? { color: '#8ad8ff', life: .25, alpha: .5, owner: a.rig } : undefined });
      if (L.state === 'swim' || L.state === 'glide') r.queue(x, y + 2, 0, g => { const p = r.w(x, y, 0); px.blend(g, .55, 'normal', () => px.rect(g, p[0] - 18, p[1] - 3, 36, 6, '#2a8ad8')); px.blend(g, .4, 'add', () => px.rect(g, p[0] - 18, p[1] - 3, 36, 1, '#bfe8ff')); }, { bias: 6 });
      if (a.human) r.queue(x, y, 30, g => { const p = r.w(x, y, 30); px.poly(g, [[p[0] - 4, p[1] - 6], [p[0] + 4, p[1] - 6], [p[0], p[1]]], a.color); }, { bias: 40 });
      if (L.judgeT > 0 && L.judge && a.human) r.textAt(x, y, 26, L.judge, L.judge === 'PERFECT' ? '#4fe0a8' : L.judge === 'GOOD' ? '#ffe066' : '#ff6b6b');
    }
    for (const d of ctx.w.dolphins) { d.t += 1 / 60; const x = d.x + d.dir * d.t * 60, z = Math.max(0, Math.sin(d.t * 3) * 26), y = LANE_Y(clamp(d.lane, 0, 7)); if (d.t < 2) r.queue(x, y, z, g => { const p = r.w(x, y, z); px.ell(g, p[0], p[1], 9, 3, '#7a9ab8'); px.poly(g, [[p[0] - d.dir * 8, p[1]], [p[0] - d.dir * 13, p[1] - 4], [p[0] - d.dir * 13, p[1] + 3]], '#7a9ab8'); px.rect(g, p[0] + d.dir * 4, p[1] - 1, 1, 1, '#000000'); px.poly(g, [[p[0], p[1] - 3], [p[0] - d.dir * 3, p[1] - 7], [p[0] - d.dir * 4, p[1] - 3]], '#6a8aa8'); }); }
    ctx.w.dolphins = ctx.w.dolphins.filter(d => d.t < 2);
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return;
    const rt = s.beepT != null ? Math.max(0, s.phase === 'race' ? s.t - s.beepT : Math.max(...s.lanes.map(L => L.fin || 0))) : 0;
    O.HUD.big(g, rt.toFixed(2), W - 14 - E.font.width(rt.toFixed(2), { scale: 3 }), 10, '#ffe066');
    if (s.phase === 'marks') O.UI.stamp(g, W, H, 'TAKE YOUR MARKS', 1, { scale: 3, y: 50 });
    const hs = s.lanes.filter(L => L.a.human);
    hs.forEach((L, i) => {
      const n = hs.length, bw = Math.min(170, (W - 40) / n), x = Math.round(W / 2 - (n * bw) / 2 + i * bw + 6), y = H - 36, a = L.a;
      UI.panel(g, x, y - 6, bw - 12, 34, { trim: a.color, alpha: .78 });
      UI.text(g, (n > 1 ? 'P' + (a.player + 1) + ' ' : '') + 'LANE ' + (L.lane + 1) + (L.d >= 25 ? ' · LAP 2' : ' · LAP 1'), x + 4, y - 2, a.color);
      if (L.fin != null) { UI.text(g, L.fin.toFixed(2) + ' s', x + 4, y + 10, '#ffe066'); return; }
      if (L.state === 'block') O.Prompt.draw(g, x + 4, y + 10, 'action', { inp: a.inp, label: s.phase === 'race' ? 'DIVE!' : 'WAIT FOR THE BEEP', pulse: s.phase === 'race' });
      else if (L.state === 'windup') O.Prompt.draw(g, x + 4, y + 10, 'action', { inp: a.inp, label: 'RELEASE!', pulse: true });
      else {
        // the stroke ring with the next expected glyph
        const cx = x + 14, cy = y + 15, k = clamp(1 - (L.nb - L.bt) / L.period, 0, 1.2), R = 11 - 8 * Math.min(1, k);
        px.disc(g, cx, cy, 5, '#14182e'); for (let q = 0; q < 16; q++) { const an = q / 16 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(an) * (3 + R)), Math.round(cy + Math.sin(an) * (3 + R)), '#ffffff'); }
        O.Prompt.icon(g, cx - 5, cy - 5, L.next === 0 ? 'mashL' : 'mashR', { inp: a.inp, lit: k > .85 });
        // oxygen bubbles
        for (let b = 0; b < 5; b++) { const on = L.o2 > b / 5; px.disc(g, x + 34 + b * 9, y + 15, 3, on ? (L.o2 < .25 ? '#ff6b6b' : '#8ad8ff') : '#2a2f55'); }
        UI.text(g, 'O2', x + 34, y + 21, '#aab0d0', { font: 'tiny' });
        const toWall = L.d < 25 ? 25 - L.d : 50 - L.d;
        if (!L.turned && L.d < 25 && toWall < 1.8) O.Prompt.draw(g, x + 84, y + 10, 'action', { inp: a.inp, label: 'TURN!', pulse: true, color: '#ffe066' });
        else if (L.turned && toWall < 1.2) O.Prompt.draw(g, x + 84, y + 10, 'action', { inp: a.inp, label: 'TOUCH!', pulse: true, color: '#ffe066' });
        else if (L.o2 < .4) O.Prompt.draw(g, x + 84, y + 10, 'alt', { inp: a.inp, label: 'BREATHE', pulse: true, color: '#8ad8ff' });
      }
      O.HUD.flame(g, x + bw - 12 - 54, y - 2, a, { w: 40 });
    });
  }
});

function falseStart(ctx, L) {
  if (O.god(L.a)) return;
  ctx.yikes(L.a, 'falsestart'); ctx.sfx('whistle');
  ctx.w.resets = (ctx.w.resets || 0) + 1; const yellow = ctx.w.yellow || (ctx.w.yellow = new Set()), dq = ctx.w.dq || (ctx.w.dq = new Set());
  if (yellow.has(L.a)) { dq.add(L.a); ctx.note(L.a, 'DQ'); } else yellow.add(L.a);
  ctx.def.start(ctx); for (const l of ctx.s.lanes) l.dq = dq.has(l.a); for (const a of ctx.athletes) { a.bs = {}; a.fresh = O.freshState(); }
}
function swimLane(ctx, L, dt) {
  const s = ctx.s, T = ctx.T, a = L.a, I = a.I, rt = s.t - s.beepT;
  if (L.dq) return;
  if (L.fin != null) { L.v = Math.max(0, L.v - 2 * dt); return; }
  if (L.state === 'block') { if (I.A || I.Ad) { L.react = rt; L.state = 'windup'; L.holdT = 0; if (rt < .1 && !a.cheat) return falseStart(ctx, L); if (rt < .15) ctx.hype(a, .25); } return; }
  if (L.state === 'windup') {
    L.holdT += dt;
    if (!I.Ad || L.holdT > .75) {
      const flop = L.holdT > .75 && !O.god(a), q = flop ? 0 : L.holdT < .2 ? .4 : L.holdT <= .6 ? 1 : .6;
      L.diveQ = q; L.state = 'dive'; L.diveT = 0; L.glide = flop ? 2 : 4 + T.diveGlide * q; L.v = T.vMax * (flop ? .8 : 1.35);
      if (flop) { ctx.yikes(a, 'flopstart'); ctx.sfx('slap'); } else ctx.sfx('splash', { vol: .6 });
      if (q >= 1) ctx.hype(a, .15);
    }
    return;
  }
  if (L.state === 'dive') { L.diveT += dt; L.d += L.v * dt; L.z = Math.max(-2, 8 - L.diveT * 22); if (L.d >= L.glide * .4 || L.diveT > .5) { L.state = 'glide'; ctx.fx(P => P.bits(L.d * M, LANE_Y(L.lane), 0, 10, ['#ffffff', '#bfe8ff', '#8ad8ff'])); } return; }
  if (L.state === 'glide') { L.d += L.v * dt; L.z = -2; L.v = Math.max(T.vMax * .9, L.v - .4 * dt); if (L.d >= L.glide) { L.state = 'swim'; L.bt = 0; L.period = 60 / (50 + 50 * .9); L.nb = L.period * .6; L.next = 0; } return; }
  if (L.state === 'flip') { L.flipT += dt; if (L.flipT > .45) { L.state = 'swim'; L.turned = true; L.v = T.vMax * L.push; L.bt = 0; L.nb = L.period; L.next = 0; } return; }
  // swimming: the beat, strokes, breathing, the turn and the touch
  const ws = O.windowScale(), pw = T.perfectWindow / 1000 * ws, gw = T.goodWindow / 1000 * ws, turbo = a.turboT > 0;
  L.period = 60 / (50 + 50 * clamp(L.v / T.vMax, 0, 1.2));
  if (L.gasp > 0) { L.gasp -= dt; L.v = Math.max(0, L.v - 3 * dt); L.d += L.v * dt; if (L.gasp <= 0) { L.o2 = .6; L.bt = 0; L.nb = L.period; } return; }
  L.bt += dt; L.sinceStroke += dt; L.judgeT -= dt;
  L.o2 = Math.max(0, L.o2 - T.o2Drain * dt);
  if (L.o2 <= 0 && O.god(a)) L.o2 = .6;
  if (L.o2 <= 0) { L.gasp = 1.2; ctx.yikes(a, 'gasp'); ctx.sfx('cough'); return; }
  let judged = null;
  if (turbo) { if (L.bt >= L.nb) judged = 'PERFECT'; }
  else {
    const press = I.L ? 0 : I.R ? 1 : -1;
    if (press >= 0) {
      const e = L.bt - L.nb;
      if (e < -gw) { L.q *= .9; L.v *= .95; L.judge = 'MISS'; L.judgeT = .4; ctx.fx(P => P.bits(swX(L), LANE_Y(L.lane), 2, 4, ['#ffffff', '#bfe8ff'])); }
      else judged = press !== L.next ? 'MISS' : Math.abs(e) <= pw ? 'PERFECT' : Math.abs(e) <= gw ? 'GOOD' : 'MISS';
    } else if (L.bt > L.nb + gw) judged = 'MISS';
  }
  if (judged) {
    if (L.o2 < .25 && judged === 'PERFECT') judged = 'GOOD';
    const val = judged === 'PERFECT' ? 1 : judged === 'GOOD' ? .6 : 0, k = Math.min(1, L.period / 1.5);
    L.q = L.q + (val - L.q) * k; L.judge = judged; L.judgeT = .45; L.strokes++; L.sinceStroke = 0; L.breathed = false;
    if (judged === 'MISS') { L.v *= .95; ctx.fx(P => P.bits(swX(L), LANE_Y(L.lane), 2, 5, ['#ffffff', '#bfe8ff'])); }
    if (judged === 'PERFECT') { L.perfects++; if (L.perfects % 6 === 0) ctx.hype(a, .1); }
    L.next ^= 1; L.nb += L.period; if (L.nb < L.bt) L.nb = L.bt + L.period * .5;
    if (!O.sandbox && a.human) game.audio.sfx('splash', { vol: .12, pitch: 1.6 });
  }
  if ((I.X || I.Xd && L.sinceStroke < .02) && L.sinceStroke < .25 && !L.breathed) { L.o2 = Math.min(1, L.o2 + T.breathGain); L.breathed = true; L.v *= .97; L.q *= .93; if (!O.sandbox) game.audio.sfx('bubbles', { vol: .4 }); }
  const vt = T.vMax * (.45 + .55 * L.q) * ctx.turbo(a, 1.1);
  L.v += (vt - L.v) * Math.min(1, dt * 1.5);
  const toWall = L.d < 25 ? 25 - L.d : 50 - L.d;
  if (!L.turned) {
    if (I.A && toWall <= 1.6 && L.d < 25) { L.turnQ = toWall >= .6 && toWall <= 1.1 ? 'PERFECT' : toWall > 1.1 ? 'EARLY' : 'LATE'; L.push = L.turnQ === 'PERFECT' ? T.turnPush : L.turnQ === 'EARLY' ? .9 : 1.05; if (L.turnQ === 'PERFECT') { ctx.hype(a, .2); ctx.cue('turn', { a }); } L.d = 25; L.state = 'flip'; L.flipT = 0; ctx.sfx('splash', { vol: .4 }); return; }
    if (L.d >= 25 && O.god(a)) { L.turnQ = 'PERFECT'; L.push = T.turnPush; L.d = 25; L.state = 'flip'; L.flipT = 0; return; }
    if (L.d >= 25) { L.d = 25; L.bonk = 1; L.turnQ = 'BONK'; ctx.yikes(a, 'bonk'); ctx.sfx('thwack'); L.v = 0; L.state = 'flip'; L.flipT = -.55; L.push = .8; return; }
  }
  if (L.turned && !L.touch && I.A && toWall <= .8) { L.touch = true; L.reach = .05; }
  const prev = L.d; L.d += L.v * dt;
  if (L.d >= 50 - (L.touch ? .6 : 0) && prev < 50) {
    const k = (50 - (L.touch ? .6 : 0) - prev) / Math.max(1e-6, L.d - prev); L.fin = +(rt - dt + dt * k - (L.touch ? .05 : 0) + (L.touch ? 0 : .08)).toFixed(3); L.d = 50;
    if (s.firstFin == null) { s.firstFin = rt; if (!O.sandbox) { O.CrowdAudio.cheer(); ctx.cue('touch', { a }, { prio: 3 }); } }
  }
}
const swX = L => L.d < 25 ? L.d * M : (50 - L.d) * M;
function animate(ctx, dt) {
  for (const L of ctx.s.lanes) {
    const a = L.a, rig = a.rig, back = L.d >= 25, x = L.state === 'block' || L.state === 'windup' ? -6 : swX(L);
    const st = { x, y: LANE_Y(L.lane), z: 0, facing: back ? Math.PI : 0, vx: 0, vy: 0 };
    O.Pose.rot(rig, 0, 0);
    if (L.state === 'block') { O.Pose.set(rig, 'crouchStart'); st.z = 8; }
    else if (L.state === 'windup') { O.Pose.set(rig, 'armsForward'); st.z = 8; O.Pose.rot(rig, .4, 0); }
    else if (L.state === 'dive') { O.Pose.set(rig, L.diveQ === 0 ? 'bellyFlop' : 'dive'); st.z = L.z; O.Pose.rot(rig, Math.min(Math.PI / 2, L.diveT * 4), 0, [0, 0, rig.o.hipZ]); }
    else if (L.state === 'glide') { O.Pose.set(rig, 'dive'); st.z = -4; O.Pose.rot(rig, Math.PI / 2, 0, [0, 0, rig.o.hipZ]); }
    else if (L.state === 'flip') { O.Pose.set(rig, 'tuck'); st.z = -4; st.facing = L.flipT > .2 ? Math.PI : 0; O.Pose.rot(rig, Math.PI / 2 + clamp(L.flipT / .45, 0, 1) * Math.PI * 2, 0, [0, 0, rig.o.hipZ]); }
    else if (L.fin != null) { O.Pose.clear(rig); st.z = -10; st.pose = ctx.s.firstFin === L.fin ? 'cheer' : 'wave'; }
    else { O.Pose.clear(rig); st.swim = true; st.vx = (back ? -1 : 1) * Math.max(30, L.v * M * 1.6); st.z = -1; }
    if (L.gasp > 0) { st.hurt = true; st.expr = 'wince'; }
    rig.update(dt, st);
  }
}
})();
