/* activities/slalom.js: Mount Posture Slalom, on Mode 7. Lean steers, forward tucks, back brakes. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const SNOW = (x, y) => { const n = Math.sin(x * .071) * Math.sin(y * .053) + .6 * Math.sin((x + y) * .019) + .3 * Math.sin(x * .3 + y * .17), band = Math.sin(y * .05) * 5 + Math.sin(y * .013) * 4, cord = Math.sin(x * .9) > .7 ? -3 : 0, sp = ((Math.floor(x / 9) * 73 + Math.floor(y / 13) * 37) % 41 === 0) ? -14 : 0; const v = 238 + n * 3 + band + cord + sp; return [v - 8, v - 2, Math.min(255, v + 8)]; };
const m7 = new E.Mode7({ floor: SNOW, size: [1024, 1024], wrap: true, far: 1700, outside: '#eaf4f8', fog: { color: '#eaf4f8', near: 800, far: 1700 }, sky: new E.Backdrop({ sky: ['#8fd3f4', '#d8f3fb', '#f4fbfd'], sun: { x: .75, y: .22, r: 12, color: '#fff6d8' }, layers: [{ kind: 'mountains', color: '#c6dcea', y: .78, height: .3, parallax: .02 }, { kind: 'mountains', color: '#e6f1f7', y: .86, height: .2, parallax: .05 }, { kind: 'hills', color: '#a8c8c0', y: .96, height: .08, parallax: .09 }] }) });
G.m7 = m7;
const PINE = E.prop('pine').frames[0];
const HEADING = -Math.PI / 2;
const BOT = { poor: { gain: .75, noise: .4, tuck: 0, avoid: .4 }, average: { gain: 1, noise: .2, tuck: .2, avoid: .8 }, good: { gain: 1.15, noise: .08, tuck: .6, avoid: 1 }, expert: { gain: 1.25, noise: .02, tuck: .9, avoid: 1.2 } };
const drawGatePole = (g, sx, sy, k, col, side, next) => { const h = 46 * k; px.rect(g, sx - Math.max(.5, k * .9), sy - h, Math.max(1, k * 1.8), h, '#5a6a74'); const fw = 19 * k, fh = 14 * k; px.poly(g, [[sx, sy - h], [sx + side * fw, sy - h + fh * .5], [sx, sy - h + fh]], col); if (next) px.disc(g, sx, sy - h - 2 * k, Math.max(1, k * 1.6), '#ffd166'); };
const drawSnowman = (g, sx, sy, k) => { px.ell(g, sx, sy - 7 * k, 8 * k, 7 * k, '#ffffff'); px.ell(g, sx + k, sy - 6 * k, 7 * k, 6 * k, '#e3edf2'); px.disc(g, sx, sy - 18 * k, 5.5 * k, '#ffffff'); px.disc(g, sx, sy - 27 * k, 4 * k, '#ffffff'); if (k > .5) { px.rect(g, sx - 3 * k, sy - 35 * k, 6 * k, 4 * k, '#20404c'); px.rect(g, sx - 4.5 * k, sy - 31.5 * k, 9 * k, k, '#20404c'); px.dot(g, sx - 1.4 * k, sy - 28 * k, '#20404c'); px.dot(g, sx + 1.4 * k, sy - 28 * k, '#20404c'); px.poly(g, [[sx, sy - 27 * k], [sx + 4 * k, sy - 26 * k], [sx, sy - 25.5 * k]], '#ff9a3a'); px.rect(g, sx - 5 * k, sy - 23.5 * k, 10 * k, 1.4 * k, '#ff7a59'); } };
G.family('slalom', {
  camera: { zoom: false },
  setup(ctx) {
    const co = G.DATA.courses.slalom[ctx.tier.course], n = co.gates.length;
    const base = G.DEV.skiSpeed;
    let use = n; if (ctx.durGiven) use = Math.max(4, Math.min(n, Math.floor(ctx.durGiven * base / co.spacing) - 1));
    ctx.course = co; ctx.gates = co.gates.slice(0, use).map((x, i) => ({ x, y: -(i + 1) * co.spacing, state: null, col: i % 2 ? '#2c7fe6' : '#e0553a', i }));
    ctx.obstacles = co.obstacles.filter(o => o[1] < use).map(o => ({ x: o[0], y: -(o[1] + 1) * co.spacing - co.spacing * .5, kind: o[2] }));
    ctx.side = []; for (let i = -6; i < (use + 4) * 7; i++) for (const s of [-1, 1]) ctx.side.push({ x: s * (232 + ((i * 53 + (s + 1) * 37) % 80)), y: -i * co.spacing / 7, sc: 1.4 + ((i * 31 + s * 7) % 5 + 5) % 5 * .18 });
    ctx.finishY = -(use + 1) * co.spacing; ctx.nextGate = 0; ctx.scale = use / n; ctx.par = co.par * ctx.scale; ctx.worst = co.worst * ctx.scale; ctx.snow = [];
    for (let i = 0; i < 90; i++) ctx.snow.push({ x: G.cosmetic(), y: G.cosmetic(), s: .3 + G.cosmetic() * .9 });
    for (const c of ctx.contestants) { c.sx = 0; c.sy = 0; c.v = 0; c.bal = new G.Balance({ k: 14, c: 7, s: 0, A: .9, nf: 1, R: .3 }, c.rng); c.bal.cheat = true; c.tumble = 0; c.miss = 0; c.passed = 0; c.hits = 0; c.pen = 0; c.fin = 0; c.state = ''; c.stateT = 0; c.yaw = 0; c.trail = []; c.carve = null; }
    ctx.camY = 0; ctx.camX = 0;
  },
  preview(dt, ctx) { if (ctx.done) return; const c = ctx.contestants[0]; c.rig.update(dt, { x: c.sx, y: c.sy, z: 0, vx: 0, vy: 0, facing: HEADING, pose: 'crouch', expr: 'smile' }); game.focus(0, 0, 0); ctx.camY = 0; ctx.camX = 0; },
  update(dt, ctx) {
    const d = G.DEV; game.focus(0, 0, 0);
    for (const c of ctx.contestants) {
      const I = c.intent, b = c.bal; b.step(dt, I.x, I.y);
      if (c.fin) { c.v = Math.max(0, c.v - 300 * dt); c.sy -= c.v * dt; continue; }
      if (c.tumble > 0) {
        c.tumble -= dt; c.v = Math.max(0, c.v - 400 * dt); c.sy -= c.v * dt;
      } else {
        const want = d.skiSpeed * (b.y > .3 ? 1.35 : b.y < -.3 ? .6 : 1);
        c.v += (want - c.v) * Math.min(1, dt * 1.6);
        c.sx += b.x * 210 * d.skiTurn * dt; c.sx = clamp(c.sx, -220, 220); c.sy -= c.v * dt;
      }
      c.stateT = Math.max(0, c.stateT - dt);
      /* gates: cross the line between the poles */
      const G0 = ctx.gates[c.nextGate === undefined ? (c.nextGate = 0) : c.nextGate];
      if (G0 && c.sy <= G0.y) {
        const hw = ctx.course.gateWidth / 2 * (G.gentle() ? 1.25 : 1);
        if (Math.abs(c.sx - G0.x) <= hw) { c.passed++; c.state = 'Gate'; c.stateT = .7; if (G.cue(ctx, c)) { G.A.sfx('hit'); } }
        else { c.miss++; c.pen += 3; c.state = G.DATA.lines.notes.missed; c.stateT = 1.1; if (G.cue(ctx, c)) { G.A.sfx('miss'); if (c.input) c.input.rumble(.25, .12); } }
        c.nextGate++;
      }
      /* snowmen and pines: a tumble */
      if (c.tumble <= 0 && !ctx.cheat) for (const o of ctx.obstacles) { if (Math.abs(c.sy - o.y) < 12 && Math.abs(c.sx - o.x) < (o.kind === 'pine' ? 13 : 11)) { c.tumble = 1.2; c.hits++; c.v *= .35; if (G.cue(ctx, c)) { G.A.sfx('stumble'); game.shake(.2); if (c.input) c.input.rumble(.8, .3); G.mutter('tare', G.line('tare.fall')); } break; } }
      if (c.sy <= ctx.finishY) { c.fin = ctx.time; if (ctx.contestants.every(q => q.fin)) ctx.finishT = ctx.finishT || ctx.time; }
      /* the body */
      c.yaw += (b.x * .3 - c.yaw) * Math.min(1, dt * 6);
      const pose = c.tumble > 0 ? 'down' : 'crouch';
      c.rig.wob = [b.x * .6, b.y * .3]; c.rig.update(dt, { x: c.sx, y: c.sy, z: 0, vx: 0, vy: 0, facing: HEADING + c.yaw, pose: c.tumble > 0 ? undefined : 'crouch', down: c.tumble > 0 ? .8 : 0, expr: c.tumble > 0 ? 'wince' : 'smile' });
      if (G.cue(ctx, c)) { if (!c.carve) c.carve = G.A.sfx('carve', { loop: true, vol: .3 }); if (c.carve && c.carve.set) c.carve.set({ vol: .25 + Math.abs(b.x) * .9, pan: b.x }); }
      if (Math.floor(ctx.time * 16) !== Math.floor((ctx.time - dt) * 16)) { c.trail.push(c.sx, c.sy); if (c.trail.length > 140) c.trail.splice(0, 2); }
    }
    if (ctx.finishT && ctx.time > ctx.finishT + .9) ctx.finished = true;
    const me = ctx.local || ctx.contestants[0];
    ctx.camX += (me.sx - ctx.camX) * Math.min(1, dt * 6); ctx.camY = me.sy;
    for (const s of ctx.snow) { s.y = (s.y + dt * (.18 + s.s * .2)) % 1; s.x = (s.x + dt * (-.02 + me.bal.x * -.08)) % 1; if (s.x < 0) s.x += 1; }
  },
  stop(ctx) { for (const c of ctx.contestants) if (c.carve && c.carve.stop) { c.carve.stop(); c.carve = null; } },
  result(ctx, c) {
    const t = (c.fin || ctx.time) + c.pen + (c.fin ? 0 : 30), pct = clamp((ctx.worst - t) / (ctx.worst - ctx.par), 0, 1), L = G.DATA.lines.slalomTimes, peer = L[1 + Math.floor(G.cosmetic() * (L.length - 1)) % (L.length - 1)], first = L[0];
    return { pct, detail: 'Your time ' + G.fmtTime(t) + '. Gates ' + c.passed + ' of ' + ctx.gates.length + '. ' + first[0] + ' ' + G.fmtTime(first[1]) + '. ' + first[2] + ' ' + peer[0] + ' ' + G.fmtTime(peer[1]) + '. ' + peer[2], time: t };
  },
  bot(ctx, c, dt) {
    const B = BOT[c.brain.skill], I = c.intent, G0 = ctx.gates[c.nextGate || 0] || { x: 0, y: c.sy - 500 };
    c.nz = c.nz || G.noise(c.rng, 1.3);
    let tx = G0.x;
    for (const o of ctx.obstacles) { const dy = c.sy - o.y; if (dy > 0 && dy < 170 && Math.abs(o.x - c.sx) < 30 * B.avoid) tx = c.sx + (c.sx >= o.x ? 1 : -1) * 70; }
    /* the lean this gate needs: its distance across over the time left to reach it */
    const v = Math.max(60, c.v), tTo = Math.max(.35, Math.min(3, (c.sy - G0.y) / v)), need = (tx - c.sx) / tTo / (210 * G.DEV.skiTurn);
    I.x = clamp(need * B.gain + B.noise * c.nz(ctx.time), -1, 1);
    I.y = Math.abs(need) < .25 && tTo > .8 ? B.tuck : Math.abs(need) > .8 ? -.5 : 0;
  },
  ghost(ctx, c) { return { x: Math.round(c.sx), y: Math.round(c.sy), w: [+c.bal.x.toFixed(2), +c.bal.y.toFixed(2)] }; },
  draw(r, ctx) {
    const me = ctx.local || ctx.contestants[0], cam = m7.chase({ x: ctx.camX + (me.sx - ctx.camX) * .5, y: ctx.camY }, { back: 64, h: 40, angle: HEADING + me.yaw * .25 }); cam.pitch = 15; cam.fov = 70;
    m7.o.fog = ctx.course.fog || { color: '#eaf4f8', near: 800, far: 1700 };
    const vis = o => o.y < cam.y && o.y > cam.y - 1500;
    for (let i = 0; i < me.trail.length; i += 2) { const x = me.trail[i], y = me.trail[i + 1]; if (y > cam.y) continue; m7.add(x, y, 0, (g, sx, sy, k) => { px.rect(g, sx - 3 * k, sy, Math.max(1, k), 1, '#c9dce8'); px.rect(g, sx + 2 * k, sy, Math.max(1, k), 1, '#c9dce8'); }); }
    for (const s of ctx.side) if (vis(s)) m7.sprite(PINE, s.x, s.y, 0, { scale: s.sc });
    for (const o of ctx.obstacles) if (vis(o)) { if (o.kind === 'pine') m7.sprite(PINE, o.x, o.y, 0, { scale: 1.5 }); else m7.add(o.x, o.y, 0, (g, sx, sy, k) => drawSnowman(g, sx, sy, k * .85)); }
    const hw = ctx.course.gateWidth / 2;
    ctx.gates.forEach(G0 => { if (!vis(G0)) return; const next = G0.i === (me.nextGate || 0); m7.add(G0.x - hw, G0.y, 0, (g, sx, sy, k) => drawGatePole(g, sx, sy, k * .85, G0.col, -1, next)); m7.add(G0.x + hw, G0.y, 0, (g, sx, sy, k) => drawGatePole(g, sx, sy, k * .85, G0.col, 1, next)); });
    if (vis({ y: ctx.finishY })) m7.add(0, ctx.finishY, 0, (g, sx, sy, k) => { const w = 90 * k, h = 44 * k; for (const q of [-1, 1]) px.rect(g, sx + q * w - k, sy - h, 2 * k, h, '#5a6a74'); px.rect(g, sx - w, sy - h, 2 * w, 11 * k, '#fbfdfd'); for (let i = 0; i < 12; i++) if (i % 2) px.rect(g, sx - w + i * w / 6, sy - h, w / 6, 5.5 * k, '#20404c'); else px.rect(g, sx - w + i * w / 6, sy - h + 5.5 * k, w / 6, 5.5 * k, '#20404c'); });
    G.drawSkiGhosts && G.drawSkiGhosts(ctx);
    for (const c of ctx.contestants) { if (!c.local && ctx.local) continue; m7.add(c.sx, c.sy, 0, (g, sx, sy, k) => { px.ell(g, sx, sy + k, 11 * k, 3 * k, '#a8c0d0'); for (const q of [-1, 1]) { px.poly(g, [[sx + q * 4 * k - k, sy + 4 * k], [sx + q * 4 * k + k, sy + 4 * k], [sx + q * 3.4 * k + .6 * k, sy - 9 * k], [sx + q * 3.4 * k - .6 * k, sy - 9 * k]], '#ff7a59'); px.rect(g, sx + q * 3.4 * k - .6 * k, sy - 9 * k, 1.2 * k, k, '#ffffff'); } const v = m7.view(k * .92); c.rig.draw(g, Math.round(sx), Math.round(sy), v); }); }
    m7.draw(r, cam);
    r.overlay(g => { for (const s of ctx.snow) px.rect(g, s.x * game.W, s.y * game.H, s.s > .8 ? 2 : 1, s.s > .8 ? 2 : 1, '#ffffff'); });
  },
  hud(g, ctx) {
    if (!ctx.live) return;
    const W = game.W, H = game.H, c = ctx.local || ctx.contestants[0];
    G.panel(g, 8, 6, 74, 20, { r: 8 }); txt(g, G.fmtTime((c.fin || ctx.time) + c.pen), 45, 9, '#20404c', { align: 'center', scale: 2 });
    G.panel(g, W - 92, 8, 84, 16, { r: 7 }); txt(g, 'Gate ' + Math.min((c.nextGate || 0) + 1, ctx.gates.length) + ' / ' + ctx.gates.length, W - 50, 12, '#14a8c8', { align: 'center' });
    G.drawPlate(g, c.bal, { x: W / 2, y: H - 28, r: 22, ring: null, color: c.color });
    if (c.bal.y > .3) txt(g, 'Tuck', W / 2, H - 62, '#14a8c8', { align: 'center', shadow: '#ffffff' }); else if (c.bal.y < -.3) txt(g, 'Braking', W / 2, H - 62, '#e0553a', { align: 'center', shadow: '#ffffff' });
    if (c.stateT > 0) txt(g, c.state, W / 2, 34, c.state === 'Gate' ? '#14a8c8' : '#e0553a', { align: 'center', scale: 2, shadow: '#ffffff' });
    if (c.tumble > 0) txt(g, 'Tumble', W / 2, 52, '#e0553a', { align: 'center', scale: 2, shadow: '#ffffff' });
    G.prompts(g, [['lean', 'Lean']]);
  }
});
})();
