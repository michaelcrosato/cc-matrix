// FX: world particles drawn through m7.add (dust, sparks, splinters, splashes, smoke, fire, fireballs, debris, shock
// rings), screen FX (flashes, hit markers, floating numbers, damage arcs, tracers), and the Sim's events -> visuals.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp, lerp } = WP;
const R = WP.fxr, rr = (a, b) => a + (b - a) * R();
const FX = WP.FX = { parts: [], screen: [], tracers: [], decals: [], max: 900 };
const add = p => { if (FX.parts.length < FX.max) FX.parts.push(Object.assign({ t: 0, vx: 0, vy: 0, vz: 0, grav: 0, size: 1 }, p)); };
FX.add = add;
FX.clear = () => { FX.parts.length = 0; FX.screen.length = 0; FX.tracers.length = 0; FX.decals.length = 0; };
// ---------- emitters ----------
FX.dust = (x, y, z, n = 5, col = '#b8a07a', s = 1) => { for (let i = 0; i < n; i++) add({ kind: 'dust', x, y, z, vx: rr(-20, 20), vy: rr(-20, 20), vz: rr(10, 40), grav: 40, life: rr(.35, .7), size: rr(2, 4) * s, color: col }); };
FX.sparks = (x, y, z, n = 6, col = '#ffe080') => { for (let i = 0; i < n; i++) add({ kind: 'spark', x, y, z, vx: rr(-80, 80), vy: rr(-80, 80), vz: rr(20, 110), grav: 300, life: rr(.15, .35), size: 1, color: col }); };
FX.splinters = (x, y, z, n = 6) => { for (let i = 0; i < n; i++) add({ kind: 'bit', x, y, z, vx: rr(-60, 60), vy: rr(-60, 60), vz: rr(40, 120), grav: 380, life: rr(.4, .8), size: rr(1.2, 2.2), color: WP.pick(R, ['#a8784a', '#c8965a', '#7a5432']) }); };
FX.splash = (x, y, n = 6) => { for (let i = 0; i < n; i++) add({ kind: 'drop', x, y, z: 0, vx: rr(-25, 25), vy: rr(-25, 25), vz: rr(60, 130), grav: 400, life: rr(.3, .6), size: rr(1.2, 2.2), color: WP.pick(R, ['#d8f0ff', '#a8d0e8', '#ffffff']) }); };
FX.smoke = (x, y, z, n = 3, col = '#6a6460', s = 1) => { for (let i = 0; i < n; i++) add({ kind: 'smoke', x: x + rr(-4, 4), y: y + rr(-4, 4), z, vx: rr(-6, 6), vy: rr(-6, 6), vz: rr(14, 30), grav: -4, life: rr(.9, 1.6), size: rr(4, 7) * s, color: col }); };
FX.fire = (x, y, z, n = 2, s = 1) => { for (let i = 0; i < n; i++) add({ kind: 'fire', x: x + rr(-3, 3) * s, y: y + rr(-3, 3) * s, z, vx: rr(-4, 4), vy: rr(-4, 4), vz: rr(20, 40), grav: -10, life: rr(.3, .55), size: rr(2.5, 4.5) * s }); };
FX.debris = (x, y, z, n = 10, cols) => { for (let i = 0; i < n; i++) add({ kind: 'bit', x, y, z, vx: rr(-120, 120), vy: rr(-120, 120), vz: rr(80, 220), grav: 420, life: rr(.6, 1.2), size: rr(1.5, 3.2), color: WP.pick(R, cols || ['#3a3430', '#5a524a', '#7a6a5a', '#ff9a40']) }); };
FX.ring = (x, y, r, col = '#fff0c0', life = .35) => add({ kind: 'ring', x, y, z: 0, life, size: r, color: col });
FX.fireball = (x, y, z, r) => {
  add({ kind: 'ball', x, y, z, life: .42, size: r });
  for (let i = 0; i < 4; i++) add({ kind: 'ball', x: x + rr(-r, r) * .5, y: y + rr(-r, r) * .5, z: z + rr(0, r * .6), life: rr(.25, .4), size: r * rr(.35, .6), delay: rr(0, .12) });
};
FX.explosion = (x, y, z, r, big) => {
  FX.fireball(x, y, z + 4, r * .55); FX.ring(x, y, r * 1.1, '#fff4c8', .4); FX.smoke(x, y, z + r * .3, 4 + big * 3, '#4a4440', 1 + big * .6);
  FX.debris(x, y, z + 4, 8 + big * 6); FX.sparks(x, y, z + 6, 6 + big * 4, '#ffc060');
  FX.decals.push({ x, y, r: r * .5, life: 12, t: 0 });
};
FX.trail = (x, y, z, kind) => { if (kind === 'rocket' || kind === 'missile') add({ kind: 'smoke', x, y, z, vx: 0, vy: 0, vz: 4, life: .7, size: 2.6, color: '#c8c0b8' }); else if (kind === 'shell') add({ kind: 'fire', x, y, z, life: .15, size: 3 }); else if (kind === 'flame') FX.fire(x, y, z + 6, 3, 2.2); };
// screen-space
FX.flashS = (x, y, r, col, life = .06) => FX.screen.push({ kind: 'flash', x, y, r, col, life, t: 0 });
FX.hitmark = (x, y, head) => FX.screen.push({ kind: 'hit', x, y, head, life: head ? .3 : .18, t: 0 });
FX.text = (x, y, z, str, col, scale = 1, life = 1) => FX.screen.push({ kind: 'text', wx: x, wy: y, wz: z, str, col, scale, life, t: 0 });
FX.textS = (x, y, str, col, scale = 2, life = 1.2) => FX.screen.push({ kind: 'texts', x, y, str, col, scale, life, t: 0 });
FX.arc = (dir, pid) => FX.screen.push({ kind: 'arc', dir, pid, life: .5, t: 0 });
FX.tracer = (x0, y0, x1, y1, col, life = .05) => FX.tracers.push({ x0, y0, x1, y1, col, life, t: 0 });

FX.update = dt => {
  for (const p of FX.parts) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.t += dt; p.vz -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z < 0 && (p.kind === 'bit' || p.kind === 'spark' || p.kind === 'casing')) { p.z = 0; p.vz = -p.vz * .35; p.vx *= .5; p.vy *= .5; }
    if (p.kind === 'drop' && p.z < 0) p.t = p.life;
  }
  FX.parts = FX.parts.filter(p => p.t < p.life);
  for (const s of FX.screen) s.t += dt;
  FX.screen = FX.screen.filter(s => s.t < s.life);
  for (const s of FX.tracers) s.t += dt;
  FX.tracers = FX.tracers.filter(s => s.t < s.life);
  for (const d of FX.decals) d.t += dt;
  FX.decals = FX.decals.filter(d => d.t < d.life);
};
// ---------- drawing (world particles through m7.add) ----------
const FIRE = ['#fff6c8', '#ffd86a', '#ff9a2a', '#e8502a', '#8a2a1a'];
FX.gather = (m7, view) => {
  for (const d of FX.decals) m7.add(d.x, d.y, 0, (g, sx, sy, k) => { const a = clamp(1 - d.t / d.life, 0, 1) * .55; px.blend(g, a, 'multiply', () => px.ell(g, sx, sy, d.r * k, d.r * k * .28, '#3a3028')); });
  for (const p of FX.parts) {
    if (p.delay > 0) continue;
    const u = p.t / p.life;
    m7.add(p.x, p.y, Math.max(0, p.z), (g, sx, sy, k) => {
      const s = Math.max(1, p.size * k);
      switch (p.kind) {
        case 'dust': px.blend(g, (1 - u) * .7, 'normal', () => px.disc(g, sx, sy, s * (.6 + u * .8), p.color)); break;
        case 'smoke': px.blend(g, (1 - u) * .6, 'normal', () => px.disc(g, sx, sy, s * (.5 + u), p.color)); break;
        case 'spark': px.rect(g, sx, sy, Math.max(1, k * .9), Math.max(1, k * .9), u < .5 ? '#ffffff' : p.color); break;
        case 'bit': px.rect(g, sx - s / 2, sy - s / 2, s, s, p.color); break;
        case 'drop': px.rect(g, sx, sy, Math.max(1, s * .6), Math.max(1, s), p.color); break;
        case 'casing': px.rect(g, sx, sy, Math.max(1, k * 1.5), Math.max(1, k * .8), '#e8c040'); break;
        case 'fire': { const c = FIRE[Math.min(4, Math.floor(u * 5))]; px.blend(g, 1 - u * .5, 'add', () => px.disc(g, sx, sy, s * (1 - u * .4), c)); break; }
        case 'ball': { const r = p.size * k * (.5 + u * .8), c = FIRE[Math.min(4, Math.floor(u * 5))]; px.blend(g, 1 - u * .6, 'add', () => { px.disc(g, sx, sy, r, c); px.disc(g, sx, sy, r * .6, FIRE[Math.max(0, Math.floor(u * 5) - 1)]); }); break; }
        case 'ring': { const r = p.size * k * (.2 + u), ry = r * .3; px.blend(g, (1 - u) * .8, 'add', () => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; px.rect(g, sx + Math.cos(t) * r, sy + Math.sin(t) * ry, 2, 1, p.color); } }); break; }
      }
    });
  }
};
// ---------- screen FX (after the 3D view) ----------
FX.drawScreen = (g, view, me) => {
  for (const s of FX.tracers) px.line(g, s.x0, s.y0, s.x1, s.y1, s.col, 1);
  for (const s of FX.screen) {
    const u = s.t / s.life;
    if (s.kind === 'flash') px.blend(g, 1 - u, 'add', () => px.disc(g, s.x, s.y, s.r * (1 - u * .3), s.col));
    else if (s.kind === 'hit') { const c = s.head ? '#ffd040' : '#ffffff', r = s.head ? 6 : 4; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) px.line(g, s.x + dx * 2, s.y + dy * 2, s.x + dx * r, s.y + dy * r, c, 1); }
    else if (s.kind === 'text') { const p = view.project(s.wx, s.wy, s.wz); if (p) E.font.text(g, s.str, Math.round(p[0]), Math.round(p[1] - u * 16), s.col, { align: 'center', outline: '#140c08', scale: s.scale }); }
    else if (s.kind === 'texts') E.font.text(g, s.str, Math.round(s.x), Math.round(s.y - u * 10), s.col, { align: 'center', outline: '#140c08', scale: s.scale });
    else if (s.kind === 'arc') {   // a red arc on the edge toward the shooter
      const a = (1 - u) * .8, W = WP.W, H = WP.PLAY_H;
      px.blend(g, a, 'add', () => {
        if (s.dir < 0) for (let i = 0; i < 6; i++) px.rect(g, i, 40 + i * 6, 2, H - 80 - i * 12, '#ff2a1a');
        else if (s.dir > 0) for (let i = 0; i < 6; i++) px.rect(g, W - 2 - i, 40 + i * 6, 2, H - 80 - i * 12, '#ff2a1a');
        else for (let i = 0; i < 6; i++) px.rect(g, 60 + i * 10, H - 2 - i, W - 120 - i * 20, 2, '#ff2a1a');
      });
    }
  }
};
/** a ground circle -> its screen ellipse [cx, cy, rx, ry] */
FX.groundEll = (view, x, y, r) => {
  const c = view.project(x, y, 0); if (!c) return null;
  const P = view.P, a = view.project(x - P.fx * r, y - P.fy * r, 0), b = view.project(x + P.fx * r, y + P.fy * r, 0);
  const ry = a && b ? Math.abs(a[1] - b[1]) / 2 : r * c[2] * .3; return [c[0], c[1], r * c[2], Math.max(1, ry)];
};

// ---------- the Sim's events -> visuals ----------
FX.onEvents = (world, evs, ctx) => {
  const V = world.view;
  for (const ev of evs) {
    switch (ev.k) {
      case 'shot': {
        const me = ctx.isLocal(ev.pid), p = world.players.find(q => q.pid === ev.pid);
        const muzzle = ctx.muzzle(ev.pid);
        if (muzzle && (me || world.players.length > 1)) FX.tracer(muzzle[0], muzzle[1], ev.sx, ev.sy, ev.fury ? '#ffe040' : '#fff4c0');
        if (ev.what === 'sky') break;
        const m = ev.mat;
        if (ev.what === 'floor') { if (world.stage && world.stage.water && world.stage.water(ev.x, ev.y)) FX.splash(ev.x, ev.y, 4); else FX.dust(ev.x, ev.y, 0, 3, '#b8a07a', .8); }
        else if (m === 'metal' || ev.what === 'cover' && m !== 'dirt') FX.sparks(ev.x, ev.y, ev.z, 4);
        else if (m === 'wood') FX.splinters(ev.x, ev.y, ev.z, 3);
        else if (m === 'dirt') FX.dust(ev.x, ev.y, ev.z, 3, '#a8905e', .7);
        else if (m === 'flesh') { FX.dust(ev.x, ev.y, ev.z, 2, '#d8c8a8', .6); }
        else if (m === 'glass') FX.sparks(ev.x, ev.y, ev.z, 5, '#c8f0ff');
        if (me && ev.what !== 'floor' && ev.what !== 'cover' && ev.what !== 'civ' && ev.what !== 'hostage') FX.hitmark(ev.sx, ev.sy, ev.part === 'head');
        void p; break;
      }
      case 'kill': {
        const e = world.byId(ev.id); const tp = WP.TYPES[ev.type];
        if (tp.kind === 'infantry') { FX.dust(ev.x, ev.y, ev.z, 6, '#c8b088', 1.2); if (ev.part === 'head' && ctx.isLocal(ev.by)) { const p = V.project(ev.x, ev.y, ev.z + 34); if (p) FX.textS(p[0], p[1] - 6, WP.TEXT.hud.headshot, '#ffd040', 1, .7); } }
        void e; break;
      }
      case 'explode': FX.explosion(ev.x, ev.y, ev.z, ev.r, ev.big || 0); break;
      case 'intercept': FX.sparks(ev.x, ev.y, ev.z, 8, '#ffe0a0'); if (ev.kind !== 'knife') FX.fireball(ev.x, ev.y, ev.z, 8); { const p = V.project(ev.x, ev.y, ev.z); if (p && ctx.isLocal(ev.by)) FX.textS(p[0], p[1] - 8, 'SHOT DOWN!', '#a8f0ff', 1, .7); } break;
      case 'propHit': { const e = world.byId(ev.id); if (e) { if (ev.mat === 'wood') FX.splinters(e.x, e.y, e.z + 8, 2); else if (ev.mat === 'dirt') FX.dust(e.x, e.y, e.z + 8, 2, '#a8905e'); else FX.sparks(e.x, e.y, e.z + 8, 2); } break; }
      case 'propDown': if (ev.type === 'crate' || ev.type === 'ammoCrate') FX.splinters(ev.x, ev.y, ev.z + 8, 14); else if (ev.type === 'sandbags') FX.dust(ev.x, ev.y, ev.z + 6, 14, '#a8905e', 1.6); else if (ev.type === 'searchlight') FX.sparks(ev.x, ev.y, ev.z, 14, '#ffffff'); else if (ev.type === 'mast') FX.sparks(ev.x, ev.y, 10, 20, '#a8e0ff'); break;
      case 'partDown': FX.sparks(ev.x, ev.y, ev.z, 10); FX.smoke(ev.x, ev.y, ev.z, 3); break;
      case 'armored': { const p = V.project(ev.x, ev.y, ev.z); if (p) { FX.sparks(ev.x, ev.y, ev.z, 2, '#d8e8ff'); if (!FX.armT || WP.time - FX.armT > .9) { FX.armT = WP.time; FX.textS(p[0], p[1] - 10, ev.shield ? 'SHIELD!' : WP.TEXT.hud.armored, '#c8d8e8', 1, .6); } } break; }
      case 'pickup': { const p = V.project(ev.x, ev.y, ev.z); if (p) FX.textS(p[0], p[1] - 10, WP.PICKUPS[ev.kind].name, '#a8ffa8', 1, .9); FX.sparks(ev.x, ev.y, ev.z, 6, '#a8ffa8'); break; }
      case 'points': { if (ev.v) { const p = V.project(ev.x, ev.y, ev.z); if (p) FX.textS(p[0], p[1], (ev.v > 0 ? '' : '') + ev.v, ev.v > 0 ? (world.players.length > 1 ? (world.players.find(q => q.pid === ev.pid) || {}).color || '#fff' : '#ffffff') : '#ff6a50', 1, .9); } else if (ev.label && ev.label !== 'MAG') { /* pickup label shown by 'pickup' */ } if (ev.label === 'RESUPPLY FEE') FX.textS(WP.W / 2, 110, 'RESUPPLY FEE -2000', '#ff8a50', 1, 1.6); break; }
      case 'civHit': { const p = V.project(ev.x, ev.y, ev.z + 30); FX.textS(WP.W / 2, 70, WP.TEXT.hud.civHit, '#ff4a3a', 2, 1.4); if (p) FX.dust(ev.x, ev.y, ev.z + 10, 4); break; }
      case 'hostageHit': if (ev.pid >= 0) FX.textS(WP.W / 2, 70, WP.TEXT.hud.hostageHit, '#ff4a3a', 2, 1.4); break;
      case 'damage': if (ctx.isLocal(ev.pid) && ev.v > 0) FX.arc(ev.dir, ev.pid); break;
      case 'efire': {
        const e = world.byId(ev.id); if (!e) break;
        let m = null;
        if (ev.part && e.parts) { const q = e.parts.find(p => p.name === ev.part); if (q) m = [q.x, q.y, q.z + 6]; }
        if (!m) m = [e.x, e.y, (e.z || 0) + (WP.TYPES[e.type].kind === 'infantry' ? WP.Hit.worldH(WP.TYPES[e.type]) * .6 : 14)];
        const p = V.project(m[0], m[1], m[2]); if (!p) break;
        FX.flashS(p[0], p[1], Math.max(3, 4 * p[2]), '#ffe080', .07);
        if (!ev.proj) FX.tracer(p[0], p[1], p[0] + (WP.W / 2 - p[0]) * .9 + rr(-30, 30), WP.PLAY_H + 10, '#ffd080', .05);
        break;
      }
      case 'chuteCut': { const e = world.byId(ev.id); if (e) FX.sparks(e.x, e.y, e.z + 40, 4, '#ffffff'); break; }
      case 'chain': FX.textS(WP.W / 2, 92, WP.TEXT.hud.chain + ' +1000', '#ffb040', 2, 1.3); break;
      case 'packFury': FX.textS(WP.W / 2, 92, WP.TEXT.hud.packFury, '#ffe040', 2, 1.6); break;
      case 'spotted': FX.textS(WP.W / 2, 56, WP.TEXT.hud.spotted, '#ffffff', 2, 1.2); break;
      case 'dynamite': ctx.flash('#ffffff', .25); break;
      case 'impact': if (ev.kind === 'knife') FX.textS(WP.W / 2 + rr(-40, 40), WP.PLAY_H - 30, 'SLASH!', '#ff6a50', 1, .5); break;
      case 'throw': { const e = world.byId(ev.id); if (e) e._thrownAt = WP.time; break; }
      case 'land': { const e = world.byId(ev.id); if (e) FX.dust(e.x, e.y, 0, 4); break; }
      case 'towerFall': { const e = world.byId(ev.id); if (e) { e._fallAt = WP.time; for (let i = 0; i < 5; i++) FX.explosion(e.x + rr(-30, 30), e.y, rr(20, 80), 30, 1); } break; }
    }
  }
};
})();
