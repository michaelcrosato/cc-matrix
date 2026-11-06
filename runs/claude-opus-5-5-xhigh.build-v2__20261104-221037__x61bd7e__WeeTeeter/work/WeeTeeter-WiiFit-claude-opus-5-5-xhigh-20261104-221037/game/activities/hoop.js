/* activities/hoop.js: Hoop Hips. Circle the lean to spin a hoop. A stick and a mouse circle; keys step W D S A. Too slow,
 * just right, too eager. Regulars toss more hoops from the sides: catch them left and right. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp, TAU } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const PI2 = Math.PI * 2;
const wrap = a => { while (a > Math.PI) a -= PI2; while (a < -Math.PI) a += PI2; return a; };
const BOT = { poor: { om: 7.8, jit: 1.8, react: .9, cat: .55, sd: .16 }, average: { om: 8.8, jit: 1.1, react: .6, cat: .78, sd: .1 }, good: { om: 9, jit: .55, react: .4, cat: .92, sd: .06 }, expert: { om: 9.2, jit: .2, react: .25, cat: 1, sd: .02 } };
const HOOP_COLS = ['#ff7a59', '#2cc6e6', '#f5c84b', '#6fcf8e', '#b08be0', '#f08fb0'];
function drawHoopHalf(r, c, i, front, ctx) {
  const n = 24, rx = (12 + (i % 2)) * ctx.size * .95, ry = rx * .36, wob = c.phase * (i % 2 ? 1 : -1), oz = (10.2 - i * .75) * ctx.size + Math.sin(c.phase + i) * 1.2;
  const col = HOOP_COLS[i % HOOP_COLS.length], cx = Math.cos(c.phase + i * .7) * 2.4 * ctx.size;
  r.queue(c.x, 0.1, 0, g => {
    const p = r.w(c.x, 0, oz);
    for (let k = 0; k < n; k++) { const a = k / n * PI2, f = Math.sin(a) > 0; if (f !== front) continue; const a2 = (k + 1) / n * PI2; px.line(g, p[0] + cx + Math.cos(a) * rx, p[1] + Math.sin(a) * ry, p[0] + cx + Math.cos(a2) * rx, p[1] + Math.sin(a2) * ry, front ? col : E.shade(col, -.25), 2); }
  }, { bias: front ? 6 : -6 });
}
G.family('hoop', {
  camera: { zoom: false },
  setup(ctx) {
    const { tier } = ctx;
    ctx.dirSign = 1; ctx.swap = tier.swap || 1; ctx.nextSwap = ctx.dur / (ctx.swap + 1); ctx.swapI = 0; ctx.tossT = tier.tossEvery; ctx.tosses = []; ctx.bestHoops = 1; ctx.bestSum = 0; ctx.other = 0;
    ctx.throwers = ['okafor', 'marisol'].map((id, i) => ({ rig: G.regularRig(id, 1.5), x: i ? 150 : -150, id, poser: null }));
    for (const q of ctx.throwers) q.poser = new G.Poser(q.rig);
    for (const c of ctx.contestants) {
      c.bal = new G.Balance({ k: 30, c: 9, s: 0, A: .4, nf: 1, R: .25 }, c.rng); c.bal.cheat = true;
      c.way = 0; c.flips = 0; c.hoops = 1; c.phase = 0; c.om = 0; c.th = 0; c.cum = 0; c.score = 0; c.hist = []; c.outT = 0; c.thSet = false; c.state = 'slow'; c.caught = 0; c.dropped = 0; c.inBand = 0; c.playT = 0;
      if (ctx.contestants.length === 1) c.x = 0;
    }
    ctx.whirr = null;
  },
  preview(dt, ctx) {
    G.stageCam(32, 8); if (ctx.done) { G.celebrate(ctx, dt); for (const q of ctx.throwers) { q.poser.update(dt); q.rig.update(dt, { x: q.x, y: -14, z: 0, vx: 0, vy: 0, facing: q.poser.facing, expr: 'smile' }); } return; }
    for (const c of ctx.contestants) { c.phase += dt * 3; c.rig.body = G.moves.hula(c.phase); c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); }
    for (const q of ctx.throwers) { q.poser.clip('Idle_Subtle', { tgt: q.x < 0 ? .6 : 2.5, loop: true }); q.poser.update(dt); q.rig.update(dt, { x: q.x, y: -14, z: 0, vx: 0, vy: 0, facing: q.poser.facing, expr: 'smile' }); }
  },
  update(dt, ctx) {
    const t = ctx.time, { tier } = ctx, d = G.DEV; G.stageCam(32, 8);
    /* "Other way!" */
    if (t >= ctx.nextSwap && ctx.swapI < ctx.swap) { ctx.swapI++; ctx.nextSwap += ctx.dur / (ctx.swap + 1); ctx.dirSign = -ctx.dirSign; ctx.other = 2.2; if (ctx.local && !ctx.quiet) { G.A.sfx('ok'); const who = G.S.instructor || 'birch'; G.mutter(who, G.DATA.lines[who].other, { auto: 2.6 }); } }
    ctx.other = Math.max(0, ctx.other - dt);
    /* a Regular tosses a hoop: catch it inside .25 s of arrival */
    ctx.tossT -= dt;
    if (ctx.tossT <= 0) { ctx.tossT = tier.tossEvery * (.85 + .3 * ctx.rng()); const side = ctx.rng() < .5 ? -1 : 1; ctx.tosses.push({ side, t: 0, fly: 1.1, res: {} }); if (ctx.local && !ctx.quiet) G.A.sfx('whoosh2', { vol: .6 }); }
    for (const h of ctx.tosses) h.t += dt;
    ctx.bestSum += dt * ctx.bestHoops;
    /* keep the best-possible stack in step with what has been thrown */
    const arrived = ctx.tosses.filter(h => h.t >= h.fly && !h.counted); for (const h of arrived) { h.counted = true; ctx.bestHoops = Math.min(6, ctx.bestHoops + 1); }
    for (const c of ctx.contestants) {
      const I = c.intent; c.playT += dt;
      /* angular speed from the raw direction: a stick or mouse circles, keys step by quadrants */
      const key = I.source === 'keyboard', rx = I.rawX, ry = I.rawY, mag = Math.hypot(rx, ry);
      if (mag > .55) { const a = Math.atan2(rx, ry); if (c.thSet) { const da = wrap(a - c.th); c.cum += da; } c.th = a; c.thSet = true; }
      const win = key ? 1.2 : .35; c.hist.push(t, c.cum); while (c.hist.length > 2 && t - c.hist[0] > win) c.hist.splice(0, 2);
      const span = Math.max(.1, t - c.hist[0]); c.om = (c.cum - c.hist[1]) / span;
      if (!c.way && Math.abs(c.om) > 2.5) c.way = c.om > 0 ? 1 : -1;
      if (c.flips !== ctx.swapI) { c.flips = ctx.swapI; if (c.way) c.way = -c.way; }
      const scale = key ? .6 : 1, lo = (d.hoopLo + (c.hoops - 1) * tier.needMore) * scale, hi = (d.hoopHi + (c.hoops - 1) * tier.needMore) * scale, om = c.om * (c.way || 1);
      c.state = om < lo ? 'slow' : om > hi ? 'eager' : 'right';
      const inBand = c.state === 'right' || ctx.other > 1.2;
      c.bandLo = lo; c.bandHi = hi; c.omDisp = om;
      if (inBand) { c.score += dt * c.hoops; c.inBand += dt; c.outT = 0; }
      else if (c.playT > 2) { c.outT += dt; if (c.outT >= 1.5 && c.hoops > 1) { c.hoops--; c.dropped++; c.outT = 0; if (G.cue(ctx, c)) { G.A.sfx('drop'); if (c.input) c.input.rumble(.3, .15); } } }
      /* catches */
      for (const h of ctx.tosses) {
        if (h.res[c.i]) continue;
        const dtA = h.t - h.fly;
        if ((h.side < 0 ? I.catchL : I.catchR) && Math.abs(dtA) <= .25) { h.res[c.i] = 'got'; if (c.hoops < 6) c.hoops++; c.caught++; if (G.cue(ctx, c)) { G.A.sfx('catch'); if (c.input) c.input.rumble(.25, .1); G.P.glints(c.x, 0, 22 * ctx.size / 2, 5, '#ffd166'); } }
        else if (dtA > .25) { h.res[c.i] = 'miss'; }
      }
      c.bal.step(dt, I.x, I.y);
      c.phase += dt * clamp(Math.abs(c.om), 2, 14) * (c.om < 0 ? -1 : 1);
      c.rig.body = G.moves.hula(c.phase * .5);
      c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: 0, vy: 0, facing: 1.57, expr: c.state === 'right' ? 'smile' : 'wince' });
      if (G.cue(ctx, c)) { ctx.whirr = ctx.whirr || new G.Tone({ wave: 'triangle' }); ctx.whirr.set({ freq: 180 + Math.abs(c.om) * 42, vol: Math.min(.05, Math.abs(c.om) * .006) }); }
    }
    ctx.tosses = ctx.tosses.filter(h => h.t < h.fly + .8);
    for (const q of ctx.throwers) { q.poser.clip('Cheering_Two_Hands', { tgt: q.x < 0 ? .6 : 2.5, loop: true, speed: .6 }); q.poser.update(dt); q.rig.update(dt, { x: q.x, y: -14, z: 0, vx: 0, vy: 0, facing: q.poser.facing, expr: 'smile' }); }
  },
  stop(ctx) { if (ctx.whirr) ctx.whirr.stop(); },
  result(ctx, c) { const pct = ctx.bestSum > 0 ? clamp(c.score / ctx.bestSum, 0, 1) : 0; return { pct, detail: 'Just right for ' + Math.round(c.inBand) + ' s. Caught ' + c.caught + '. Most hoops: ' + (c.maxH || c.hoops) + '.' }; },
  bot(ctx, c, dt) {
    const B = BOT[c.brain.skill], I = c.intent;
    const midOm = c.bandLo && c.bandHi ? (c.bandLo + c.bandHi) / 2 : 9, wantOm = c.brain.skill === 'poor' ? Math.min(B.om, midOm) : midOm + (B.om - 9);
    if (c.botFlips === undefined) c.botFlips = 0;
    c.botTh = (c.botTh || 0) + dt * (wantOm + B.jit * Math.sin(ctx.time * 1.7 + c.i * 2)) * (c.botDir || 1);
    if (!c.botDir) c.botDir = 1; if (c.botFlips !== ctx.swapI) { c.botFlips = ctx.swapI; c.flipIn = B.react; } if (c.flipIn != null) { c.flipIn -= dt; if (c.flipIn <= 0) { c.botDir = -c.botDir; c.flipIn = null; } }
    const m = .9; I.rawX = Math.sin(c.botTh) * m; I.rawY = Math.cos(c.botTh) * m; I.x = I.rawX; I.y = I.rawY; I.source = 'bot';
    /* catches: reach out near the arrival, a little off */
    I.catchL = I.catchR = false;
    for (const h of ctx.tosses) { if (h.res[c.i] || h.plan && h.plan[c.i] === 'skip') continue; h.plan = h.plan || {}; if (h.plan[c.i] === undefined) h.plan[c.i] = c.rng() < B.cat ? (c.rng() - .5) * B.sd * 2 : 'skip'; if (h.plan[c.i] === 'skip') continue; if (h.t >= h.fly + h.plan[c.i]) { if (h.side < 0) I.catchL = true; else I.catchR = true; } }
  },
  ghost(ctx, c) { return { ph: +c.phase.toFixed(2), h: c.hoops }; },
  draw(r, ctx) {
    (G.ROOMS[ctx.def.room] || G.ROOMS.pier)(r, { dusk: G.roomDusk && G.roomDusk(), festive: ctx.mode === 'games' });
    for (const q of ctx.throwers) G.drawRig(r, q.rig, q.x, -14);
    for (const c of ctx.contestants) {
      G.drawMat(r, c.x, 0, 30 * (ctx.size / 2.1), 9, c.local ? '#bfeee0' : '#e8f0f2');
      G.drawRig(r, c.rig, c.x, 0);
      for (let i = 0; i < c.hoops; i++) { drawHoopHalf(r, c, i, false, ctx); drawHoopHalf(r, c, i, true, ctx); }
    }
    G.drawGhosts && G.drawGhosts(r, ctx);
    for (const h of ctx.tosses) {
      const k = clamp(h.t / h.fly, 0, 1.2), tgt = ctx.contestants.length === 1 ? ctx.contestants[0].x : h.side * 40, sx = h.side * 170, x = sx + (tgt - sx) * k, z = 34 + Math.sin(Math.min(k, 1) * Math.PI) * 42 - Math.max(0, k - 1) * 200;
      r.queue(x, 2, Math.max(0, z), g => { const p = r.w(x, 2, Math.max(0, z)); const rx = 14; for (let i = 0; i < 18; i++) { const a = i / 18 * PI2 + game.real * 6; px.rect(g, p[0] + Math.cos(a) * rx, p[1] + Math.sin(a) * rx * .5, 2, 2, HOOP_COLS[(ctx.tosses.indexOf(h) + 2) % 6]); } });
    }
  },
  hud(g, ctx) {
    if (!ctx.live && !ctx.showHud) return;
    const W = game.W, H = game.H, many = ctx.contestants.length > 1;
    if (ctx.live) G.drawTimer(g, G.left(ctx));
    for (const c of ctx.contestants) {
      if (c.life) continue;
      const cx = many ? game.r.w(c.x, 0, 0)[0] : W / 2, cy = H - (many ? 12 : 16), R = many ? 22 : 40;
      /* the big dial: too slow, just right, too eager */
      const maxOm = c.bandHi * 1.5 || 16, ang = o => Math.PI + clamp(o / maxOm, 0, 1) * Math.PI;
      for (let i = 0; i <= 40; i++) { const o = i / 40 * maxOm, a = ang(o), col = o < (c.bandLo || 7) ? '#ffe0b8' : o > (c.bandHi || 11) ? '#ffc0ac' : '#7fe0c3'; for (let rr = R - (many ? 5 : 8); rr <= R; rr += 2) px.rect(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, 2, col); }
      const a = ang(c.omDisp || 0); px.line(g, cx, cy, cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2), '#20404c', 2); px.disc(g, cx, cy, many ? 2 : 4, '#20404c');
      const word = c.state === 'right' ? 'Just right' : c.state === 'eager' ? 'Too eager' : 'Too slow';
      txt(g, many ? c.name : word, cx, cy - R - 12, many ? c.color : c.state === 'right' ? '#14a8c8' : '#e0553a', { align: 'center', shadow: '#ffffff', scale: 1 });
      const hx = cx - 22; for (let i = 0; i < 6; i++) { const on = i < c.hoops; px.disc(g, hx + i * 9, cy - R - 22, 3, on ? HOOP_COLS[i] : '#d6e2e5'); }
    }
    if (ctx.other > 0) { const k = Math.floor(game.real * 8) % 2; G.panel(g, W / 2 - 62, 34, 124, 26, { r: 9, bg: k ? '#ffd166' : '#fbfdfd' }); txt(g, G.DATA.lines.notes.otherWay, W / 2, 38, '#20404c', { align: 'center', scale: 2 }); }
    for (const h of ctx.tosses) { const dtA = h.t - h.fly, loc = ctx.local && !h.res[ctx.local.i]; if (loc && Math.abs(dtA) < .5) { const x = h.side < 0 ? W * .2 : W * .8, near = Math.abs(dtA) <= .25; G.panel(g, x - 46, H * .34, 92, 22, { r: 8, bg: near ? '#2cc6e6' : '#fbfdfd' }); txt(g, 'Catch!', x, H * .34 + 3, near ? '#ffffff' : '#20404c', { align: 'center' }); txt(g, G.keyLabel(h.side < 0 ? 'catchL' : 'catchR'), x, H * .34 + 12, near ? '#ffffff' : '#14a8c8', { align: 'center' }); } }
    if (ctx.live && !many) G.prompts(g, [[game.input.lastDevice === 'gamepad' ? '=Left stick' : G.leanSource() === 'mouse' ? '=Circle the mouse' : '=W D S A', 'Circle']]);
  }
});
})();
