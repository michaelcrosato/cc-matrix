// The frame: the floor (per-pixel painters), the sky, scenery (culled), entities and FX through E.Mode7, then the post
// passes (grade, night darkness with light holes, rain), telegraph rings, markers and crosshairs.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp, lerp } = WP;
const R = WP.Render = { m7: null, cache: new Map(), stage: null, scenery: [], tmp: null };
const FAR = 2200;

R.init = () => {
  if (R.m7) return;
  R.m7 = new E.Mode7({ floor: () => [0, 0, 0], size: [2, 2], far: FAR, fog: { color: '#a0b0c0', near: 400, far: FAR } });
  R.m7.drawFloor = drawFloor;
};
/** a stage (or a cutscene's look): its sky, fog, floor and scenery */
R.setStage = (st, o = {}) => {
  R.init(); R.stage = st;
  R.m7._sky = null;
  R.m7.o.sky = new E.Backdrop(st.sky || 'day');
  R.m7.o.fog = st.fog ? Object.assign({}, st.fog) : null;
  R.m7.o.far = st.fog ? st.fog.far : FAR;
  R.m7.o.outside = st.outside || '#405a30';
  R.painter = typeof st.floor === 'function' ? st.floor : WP.FLOORS[st.floor] || WP.FLOORS.hill;
  R.scenery = WP.Layout.place(st, st.scenery || []);
  if (st.scenery2) R.scenery = R.scenery.concat(WP.Layout.place(st, st.scenery2));
  R.cache.clear();
};
// ---------- the floor: each row sampled along the floor line under it ----------
let fbuf = null, fimg = null, f32 = null;
function drawFloor(g, vp) {
  const P = this._P, top = Math.max(vp.y, Math.ceil(P.cy - P.f * P.sp / P.cp)), bot = vp.y + vp.h; if (bot <= top) return;
  const w = vp.w, h = bot - top;
  if (!fbuf || fbuf.width !== w || fbuf.height !== h) { fbuf = E.mkCanvas(w, h); fimg = fbuf.getContext('2d').createImageData(w, h); f32 = new Uint32Array(fimg.data.buffer); }
  const paint = R.painter, st = R.stage, t = WP.time, fwd = !!(st && st.forward), oc = WP.pack(E.hex(this.o.outside));
  const far = (this.o.fog && this.o.fog.far) || this.o.far;
  for (let row = 0; row < h; row++) {
    const D = this.rowDepth(top + row + .5), base = row * w;
    if (!D || D > far) { f32.fill(oc, base, base + w); continue; }
    const s = (D * P.cp + P.h * P.sp) / P.f, l0 = (vp.x + .5 - P.cx) * s, ux = P.rx * s, uy = P.ry * s;
    let wx = P.x + P.fx * D + P.rx * l0, wy = P.y + P.fy * D + P.ry * l0;
    for (let i = 0; i < w; i++, wx += ux, wy += uy) f32[base + i] = paint(wx, wy, fwd ? 0 : WP.Y0 - wy, t, s);
  }
  fbuf.getContext('2d').putImageData(fimg, 0, 0); g.drawImage(fbuf, vp.x, top);
  const fog = this.o.fog;
  if (fog) {
    const fc = E.hex(fog.color || '#a8c0e0'), n = fog.near || 0;
    for (let by = top; by < bot; by++) { const D = this.rowDepth(by + .5), a = D ? clamp((D - n) / (far - n), 0, 1) : 1; if (a > .01) { g.fillStyle = `rgba(${fc[0]},${fc[1]},${fc[2]},${(Math.round(a * 8) / 8).toFixed(3)})`; g.fillRect(vp.x, by, vp.w, 1); } }
  }
}
// ---------- shapes as billboards (cached per view scale, facing, size, params, mats) ----------
const tint = (sp, col, a) => {
  const c = sp._tint || (sp._tint = E.mkCanvas(sp.w, sp.h)), g = c.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, sp.w, sp.h); g.drawImage(sp.cv, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, sp.w, sp.h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return c;
};
R.shapeSprite = (id, k, facing, o = {}) => {
  const m7 = R.m7, v = m7.view(k), f = Math.round(((facing % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / Math.PI * 8) / 8 * Math.PI;
  const key = id + ':' + v.scale + ':' + v.yawDeg + ':' + v.pitchDeg + ':' + f + ':' + (o.size || 1) + ':' + (o.pk || '') + ':' + (o.mk || '');
  let sp = R.cache.get(key);
  if (sp === undefined) { if (R.cache.size > 5000) R.cache.clear(); try { sp = E.shapeSprite(id, { view: v, facing: f, size: o.size || 1, params: o.params, mats: o.mats }); } catch (e) { sp = null; } R.cache.set(key, sp); }
  return sp;
};
R.shape = (id, x, y, z, o = {}) => {
  R.m7.add(x, y, z, (g, sx, sy, k) => {
    const sp = R.shapeSprite(id, k, o.facing === undefined ? Math.PI / 2 : o.facing, o); if (!sp) return;
    const img = o.flash ? tint(sp, o.flash, .7) : o.flip ? sp.fl : sp.cv;
    const ox = o.flip ? sp.w - sp.foot[0] : sp.foot[0];
    if (o.alpha !== undefined && o.alpha < 1) { g.globalAlpha *= o.alpha; g.drawImage(img, Math.round(sx - ox), Math.round(sy - sp.foot[1])); g.globalAlpha = 1; }
    else g.drawImage(img, Math.round(sx - ox), Math.round(sy - sp.foot[1]));
    if (o.after) o.after(g, sx, sy, k);
  });
};
// rigs drawn at their view; flashed on a hit; clipped to a window
const rigCanvas = () => R.tmp || (R.tmp = E.mkCanvas(360, 360));
R.rig = (rig, x, y, z, o = {}) => {
  R.m7.add(x, y, z, (g, sx, sy, k) => {
    const v = R.m7.view(k); sx = Math.round(sx); sy = Math.round(sy);
    if (o.clip) { g.save(); g.beginPath(); g.rect(o.clip[0], o.clip[1], o.clip[2] - o.clip[0], o.clip[3] - o.clip[1]); g.clip(); }
    const a = o.alpha === undefined ? 1 : o.alpha;
    if (o.flash || a < 1) {
      const c = rigCanvas(), cg = E.ctx2d(c), S = c.width; cg.clearRect(0, 0, S, S); E.px.reset && E.px.reset(cg);
      rig.draw(cg, S / 2, S * .8, v);
      if (o.flash) { cg.globalCompositeOperation = 'source-atop'; cg.globalAlpha = .65; cg.fillStyle = o.flash; cg.fillRect(0, 0, S, S); cg.globalAlpha = 1; cg.globalCompositeOperation = 'source-over'; }
      g.globalAlpha *= a; g.drawImage(c, sx - S / 2, sy - S * .8); g.globalAlpha = 1;
    } else rig.draw(g, sx, sy, v);
    if (o.clip) g.restore();
    if (o.after) o.after(g, sx, sy, k);
  });
};
const sprAt = (g, spr, sx, sy, scale, o = {}) => {
  const s = Math.max(1, Math.round(scale * 2) / 2), w = Math.max(1, Math.round(spr.w * s)), h = Math.max(1, Math.round(spr.h * s));
  if (o.rot) { g.save(); g.translate(Math.round(sx), Math.round(sy)); g.rotate(Math.round(o.rot / (Math.PI / 8)) * Math.PI / 8); g.drawImage(spr.cv, -w / 2, -h / 2, w, h); g.restore(); }
  else g.drawImage(o.flip ? spr.fl : spr.cv, Math.round(sx - w / 2), Math.round(sy - (o.center ? h / 2 : h)), w, h);
};
R.sprAt = sprAt;

// ---------- one frame ----------
R.draw = (r, world, ctx) => {
  const m7 = R.m7, cam = world.cam, V = world.view;
  m7.cam = { x: cam.x, y: cam.y, h: cam.h, angle: cam.angle, pitch: cam.pitch, fov: cam.fov };
  const far = (m7.o.fog && m7.o.fog.far) || FAR, P = V.P;
  // scenery, culled by depth and width
  for (const s of R.scenery) {
    const D = (s.wx - P.x) * P.fx + (s.wy - P.y) * P.fy; if (D < 20 || D > far) continue;
    const L = (s.wx - P.x) * P.rx + (s.wy - P.y) * P.ry; if (Math.abs(L) > V.halfWidth(D) + 140 * (s.size || 1)) continue;
    if (s.fn) { s.fn(m7, s, world); continue; }
    R.shape(s.id, s.wx, s.wy, s.z || 0, s);
  }
  if (world.stage.drawExtra) world.stage.drawExtra(m7, world, R);
  for (const e of world.ents) R.ent(e, world, ctx);
  WP.FX.gather(m7, V);
  m7.draw(r);
  r.overlay(g => R.post(g, world, ctx));
};
const DRAW = R.DRAW = {};
R.ent = (e, world, ctx) => {
  const tp = WP.TYPES[e.type]; if (!tp || e.gone) return;
  const f = DRAW[e.type] || DRAW[tp.kind]; if (f) f(e, tp, world, ctx);
};
const flashOf = e => (e.hitT > 0 && (e.hitT -= 1 / 60) > 0) ? '#ffffff' : null;
// ---------- infantry, civilians, hostages ----------
DRAW.infantry = DRAW.civ = DRAW.hostage = (e, tp, world, ctx) => {
  if (e.hidden && !(e.beh === 'window' && e.st === 'open')) { if (e.facade) drawShutters(e, world, 0); return; }
  const rig = WP.Rigs.get(e), V = world.view;
  let alpha = 1;
  if (e.dead || e.wounded || e.lost) { const T = e.dead ? (e.fadeAt || 2.5) : 6; if (e.stt > T - .6) alpha = clamp((T - e.stt) / .6, 0, 1); }
  if (e.saved && e.stt > 2.4) alpha = clamp((3 - e.stt) / .6, 0, 1);
  let clip = null;
  if (e.facade) { const f = e.facade, a = V.project(f[0], f[1], f[2]), b = V.project(f[3], f[4], f[5]); if (a && b) clip = [Math.floor(Math.min(a[0], b[0])), Math.floor(Math.min(a[1], b[1])), Math.ceil(Math.max(a[0], b[0])), Math.ceil(Math.max(a[1], b[1]))]; }
  const fl = e.flashT > 0 ? '#ffffff' : null; if (e.flashT > 0) e.flashT -= 1 / 60;
  R.rig(rig, e.x, e.y, e.z, { clip, alpha, flash: fl, after: (g, sx, sy, k) => {
    const H = WP.Hit.rigH(tp, e) * R.m7.view(k).scale;
    if (e.chute && e.beh === 'para') sprAt(g, WP.SPR.chute, sx + Math.sin(WP.time * 1.3 + e.id) * 2 * k, sy - H - 2 * k, Math.max(.5, k * 1.4));
    if (e.whistle) { sprAt(g, WP.SPR.whistle, sx, sy - H - 6 - Math.abs(Math.sin(WP.time * 14)) * 3, Math.max(1, k * .9)); }
    if (e.marker > 0) { const s = Math.max(4, 6 * k); px.blend(g, .8, 'add', () => { px.rect(g, sx - s, sy - H - s * 2.2, s * 2, 2, '#ff3a2a'); px.rect(g, sx - 1, sy - H - s * 2.2, 2, s * 1.4, '#ff3a2a'); }); }
    if (!e.dead && (e.type === 'knife' || e.type === 'grenadier' || e.type === 'rpg') && rig.J.handR) {
      const hw = rig.hand('R'), hp = world.view.project(hw[0], hw[1], hw[2]);
      if (hp) { const ox = hp[0] - (R.m7.project(e.x, e.y, e.z) || [hp[0]])[0], s = Math.max(.6, k * .8);
        if (e.type === 'knife' && e.throwing) sprAt(g, WP.SPR.p_knife, sx + ox, hp[1], s, { center: true });
        if (e.type === 'grenadier' && e.throwing) sprAt(g, WP.SPR.p_grenade, sx + ox, hp[1], s, { center: true });
        if (e.type === 'rpg') { px.line(g, sx + ox - 7 * k, hp[1] - 1 * k, sx + ox + 4 * k, hp[1] - 2.5 * k, '#3a4426', Math.max(2, Math.round(2.4 * k))); } }
    }
    if (e.type === 'medic' && e.pair && !e.wounded) {   // a stretcher between the pair
      const o = world.ents.find(q => q !== e && q.type === 'medic' && q.pair && !q.wounded && Math.hypot(q.x - e.x, q.y - e.y) < 80);
      if (o && o.id > e.id) { const a = world.view.project(e.x, e.y, e.z + 16), b = world.view.project(o.x, o.y, o.z + 16); if (a && b) { px.line(g, a[0], a[1], b[0], b[1], '#6a4a2a', Math.max(1, Math.round(k))); px.rect(g, Math.min(a[0], b[0]) + 4 * k, Math.min(a[1], b[1]) - 2 * k, Math.abs(b[0] - a[0]) - 8 * k, Math.max(2, 3 * k), '#e8e4d8'); } }
    }
    if (e.kind === 'hostage' && !e.saved && !e.lost) { for (let i = 0; i < 3; i++) px.rect(g, sx - 7 + i * 5, sy - H - 7, 4, 3, i < e.hp ? '#5aff6a' : '#3a2a2a'); if (e.grabbedBy) E.font.text(g, 'HELP!', sx, sy - H - 18, '#ff6a50', { align: 'center', outline: '#000' }); }
  } });
  if (e.facade && e.beh === 'window') drawShutters(e, world, clamp(e.st === 'open' ? e.stt / .3 : e.hidden ? 0 : 1, 0, 1));
  // friendly markers
  if ((tp.kind === 'civ' || tp.kind === 'hostage') && !e.wounded && !e.lost && !e.saved && ctx.markers) {
    const p = V.project(e.x, e.y, e.z + WP.Hit.worldH(tp) + 6);
    if (p) for (const q of world.players) if (!q.down && Math.hypot(q.x - p[0], q.y - p[1]) < 36 + 40) { R.marks.push([p[0], p[1]]); break; }
  }
};
function drawShutters(e, world, open) {
  const f = e.facade, w = (f[3] - f[0]) / 2;
  R.m7.add((f[0] + f[3]) / 2, f[1] + 1, f[2], (g, sx, sy, k) => {
    const hw = Math.max(1, w * k), hh = Math.max(2, (f[5] - f[2]) * k), c = '#6a4a2a', d = '#4a3018';
    for (const s of [-1, 1]) { const ww = hw * (1 - open * .85); px.rect(g, s < 0 ? sx - hw : sx + hw - ww, sy - hh, ww, hh, c); px.rect(g, s < 0 ? sx - hw : sx + hw - ww, sy - hh, ww, 1, d); }
  });
}
R.marks = [];
// ---------- animals ----------
DRAW.animal = (e, tp, world) => {
  const b = WP.Rigs.get(e);
  R.m7.add(e.x, e.y, e.z + (e.hop || 0), (g, sx, sy, k) => {
    b.draw(g, Math.round(sx), Math.round(sy), R.m7.view(k * 1.3));
    if (e.carry) { const s = Math.max(.5, k * .7); sprAt(g, WP.PICKUP_SPR[e.carry] || WP.SPR.mag, sx, sy - tp.R * 2.2 * k * 1.3, s); }
  });
};
// ---------- vehicles, boats, aircraft ----------
const WRECK = { b: 'charred', c: 'charred', h: 'charred', s: 'charred', d: 'charred', y: 'charred', w: 'charred', l: 'charred', r: 'charred' };
DRAW.vehicle = DRAW.boat = DRAW.air = (e, tp, world, ctx) => {
  if (!tp.shape) return;
  const z = e.z + (e.bob || 0), wreck = e.dead;
  let alpha = 1; if (wreck && e.stt > (e.fadeAt || 6.6) - .6) alpha = clamp(((e.fadeAt || 6.6) - e.stt) / .6, 0, 1);
  const flash = e.hitT > 0 ? '#ffffff' : null; if (e.hitT > 0) e.hitT -= 1 / 60;
  R.shape(tp.shape, e.x, e.y, z, { facing: e.facing, mats: wreck ? WRECK : null, mk: wreck ? 'w' : '', flash, alpha, after: (g, sx, sy, k) => {
    if (e.type === 'heli' || e.type === 'hyenaOne') drawRotor(g, e, sx, sy, k, tp);
    if (e.type === 'cargoPlane') { for (const s of [-1, 1]) { const w = WP.Hit.local(e, [s * 30, 26, 15]), p = R.m7.project(w[0], w[1], w[2]); if (p) drawProp(g, p[0], p[1], k * 14); } }
  } });
  // turrets turn on their own
  if (!wreck && (e.type === 'apc' || e.type === 'tank')) { const w = WP.Hit.local(e, [0, 0, e.type === 'apc' ? 20 : 15]); R.shape(e.type === 'apc' ? 'apcTurret' : 'tankTurret', w[0], w[1] - .5, w[2], { facing: e.turret || e.facing, flash }); }
  // gunners
  for (const p of e.parts || []) if (p.kind === 'gunner' && !p.dead && !wreck) { const r = WP.Rigs.pool.get(e.id + ':' + p.name); if (r) R.rig(r, p.x, p.y - .6, p.z + (e.bob || 0), { flash: p.hitT > 0 ? '#ffffff' : null }); }
};
function drawRotor(g, e, sx, sy, k, tp) {
  const top = sy - (tp.box[2] + 4) * (tp.sc || 1) * k, r = 30 * (tp.sc || 1) * k, a = WP.time * 30;
  if (e.dead && e.z <= 0) return;
  px.blend(g, .5, 'normal', () => { px.ell(g, sx, top, r, Math.max(1, r * .12), '#d0d0c8'); });
  for (let i = 0; i < 2; i++) { const t = a + i * Math.PI / 2, x = Math.cos(t) * r; px.line(g, sx - x, top - Math.sin(t) * r * .1, sx + x, top + Math.sin(t) * r * .1, '#2a2a2a', Math.max(1, Math.round(k))); }
}
function drawProp(g, x, y, r) { const a = WP.time * 40; px.blend(g, .45, 'normal', () => px.disc(g, x, y, r, '#c8c8c0')); px.line(g, x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r, '#2a2a2a', 1); }
// ---------- projectiles and pickups ----------
DRAW.proj = (e, tp, world) => {
  const kind = e.ptype; if (kind === 'flame') { R.m7.add(e.x, e.y, 0, (g, sx, sy, k) => { for (let i = 0; i < 5; i++) px.blend(g, .8, 'add', () => px.disc(g, sx + (i - 2) * 8 * k, sy - 6 * k - Math.abs(Math.sin(WP.time * 9 + i)) * 6 * k, 7 * k, i % 2 ? '#ff9a2a' : '#ffd86a')); }); return; }
  if (kind === 'steam') return;
  const spr = WP.SPR['p_' + kind] || WP.SPR.p_grenade;
  R.m7.add(e.x, e.y, e.z, (g, sx, sy, k) => {
    const sc = Math.max(1, k * (kind === 'knife' ? 1.2 : kind === 'shell' ? 1.6 : 1.1));
    const rot = kind === 'knife' ? WP.time * 22 : kind === 'grenade' || kind === 'pgren' ? WP.time * 12 : Math.atan2(-(e.vz || 0), 1) * .3 + (sx < WP.W / 2 ? 0 : Math.PI);
    if (kind === 'shell') px.blend(g, .7, 'add', () => px.disc(g, sx, sy, 6 * sc, '#ff8a2a'));
    sprAt(g, spr, sx, sy, sc, { rot });
    if (kind !== 'pgren' && e.hp > 0 && WP.PROJ[kind] && WP.PROJ[kind].hits) px.blend(g, .35 + .25 * Math.sin(WP.time * 20), 'add', () => px.disc(g, sx, sy, Math.max(5, 4 * k) + 2, '#ff6a40'));
  });
  if (kind === 'pgren') R.m7.add(e.x, e.y, 0, (g, sx, sy, k) => px.blend(g, .4, 'normal', () => px.ell(g, sx, sy, Math.max(1, 3 * k), Math.max(1, k), '#000000')));
};
DRAW.pickup = (e, tp, world) => {
  const spr = WP.PICKUP_SPR[e.ptype] || WP.SPR.mag, blink = e.t > e.life - 1.5 && !e.chute && Math.floor(e.t * 10) % 2 === 0;
  if (blink) return;
  R.m7.add(e.x, e.y, e.z, (g, sx, sy, k) => {
    const s = Math.max(1, k * .95);
    px.blend(g, .35 + .2 * Math.sin(WP.time * 6), 'add', () => px.ddisc(g, sx, sy - spr.h * s / 2, spr.w * s * .9, '#fff0a0', .6));
    if (e.chute) sprAt(g, WP.SPR.chute, sx, sy - spr.h * s - 2, s * 1.2);
    sprAt(g, spr, sx, sy, s);
  });
  if (!e.chute) R.m7.add(e.x, e.y, 0, (g, sx, sy, k) => px.blend(g, .35, 'normal', () => px.ell(g, sx, sy, Math.max(1, 5 * k), Math.max(1, 1.4 * k), '#000000')));
};
// ---------- props ----------
DRAW.prop = (e, tp, world) => {
  if (e.type === 'rope' || e.type === 'shutter') { if (DRAW['prop:' + e.type]) DRAW['prop:' + e.type](e, tp, world); return; }
  const id = e.shapeId || tp.shape; if (!id) return;
  let alpha = 1; if (e.dead) { if (e.type === 'searchlight') { } else { const T = e.fadeAt || .2; alpha = clamp(1 - e.stt / Math.max(.05, T), 0, 1); if (alpha <= 0) return; } }
  const o = { facing: e.facing, flash: e.hitT > 0 ? '#ffffff' : null, alpha };
  if (e.hitT > 0) e.hitT -= 1 / 60;
  if (e.type === 'sandbags') { const k = e.hp / e.maxHp, len = 32 * (e.size || 1); o.params = { len: k > .66 ? len : k > .33 ? len * .8 : len * .55 }; o.pk = Math.round(o.params.len); }
  if (e.type === 'mast') { const tl = e.topple || 0; o.params = { tilt: Math.round(WP.smooth(tl) * 80 / 5) * 5 }; o.pk = o.params.tilt; if (e.fallen && e.topple >= 1 && e.stt > 8) return; }
  if (e.size && e.type !== 'sandbags') o.size = e.size;
  if (e.type === 'searchlight' && e.out) o.mats = { g: 'steelDk' }, o.mk = 'out';
  R.shape(id, e.x, e.y, e.z, o);
};
// ---------- telegraphs, markers, glows (screen space) ----------
const RING = ['#ffe040', '#ffa030', '#ff3a20'];
R.rings = (g, world, ctx) => {
  const V = world.view, seat = pid => { const p = world.players.find(q => q.pid === pid); return p ? p.color : '#ffffff'; };
  const ring = (x, y, u, pid, big) => {
    const r = Math.round(lerp(22, 6, u) * (big || 1)), c = RING[Math.min(2, Math.floor(u * 3))];
    for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; px.rect(g, x + Math.cos(t) * r, y + Math.sin(t) * r, 2, 2, c); }
    if (world.players.length > 1) for (let a = 0; a < 48; a += 2) { const t = a / 48 * Math.PI * 2; px.dot(g, x + Math.cos(t) * (r + 2), y + Math.sin(t) * (r + 2), seat(pid)); }
    px.rect(g, x - 1, y - 1, 2, 2, c);
  };
  const offscreen = [];
  for (const e of world.ents) {
    if (e.dead || e.gone) continue;
    const tp = WP.TYPES[e.type];
    if (e.atk && e.atk.phase === 'tele' && !(e.atk.spec && e.atk.spec.noRing)) {
      const H = tp.kind === 'infantry' ? WP.Hit.worldH(tp) * (e.pose === 'kneel' ? WP.KNEEL : 1) : 20, p = V.project(e.x, e.y, e.z + H * .62);
      if (p && p[0] > -4 && p[0] < WP.W + 4) {
        const u = clamp(e.atk.t / e.atk.T, 0, 1);
        if (e.atk.spec.glint) { const s = 1 + Math.round(u * 2); px.blend(g, .6 + .4 * Math.sin(WP.time * 30), 'add', () => sprAt(g, WP.SPR.glint, p[0], p[1] - H * p[2] * .3, s, { center: true })); }
        ring(Math.round(p[0]), Math.round(p[1]), u, e.atk.pid);
      } else if (p) offscreen.push([p[0] < 0 ? -1 : 1, p[1]]);
    }
    for (const q of e.parts || []) if (q.atk && q.atk.phase === 'tele' && !q.dead) { const p = V.project(q.x, q.y, q.z + 4); if (p && p[0] > -4 && p[0] < WP.W + 4) ring(Math.round(p[0]), Math.round(p[1]), clamp(q.atk.t / q.atk.T, 0, 1), q.atk.pid); else if (p) offscreen.push([p[0] < 0 ? -1 : 1, p[1]]); }
    // boss glows: the cannon, the nozzle, the vents, the nose
    if (tp.kind === 'boss') {
      for (const [gl, part] of [[e.canGlow, 'cannon'], [e.flame, e.flame && e.flame.side], [e.vent, 'boiler'], [e.noseGlow, 'nose']]) {
        if (!gl) continue; const q = e.parts.find(p => p.name === part); if (!q) continue; const p = V.project(q.x, q.y, q.z); if (!p) continue;
        const u = clamp(gl.t / gl.T, 0, 1); px.blend(g, .5 + .4 * Math.sin(WP.time * 24), 'add', () => px.ddisc(g, p[0], p[1], 6 + u * 10, u > .66 ? '#ff4a20' : '#ffb040', .9)); ring(Math.round(p[0]), Math.round(p[1]), u, gl.pid, 1.2);
      }
      if (e.atkT) { const T = e.tusk, w = [e.tx, e.ty], p = V.project(w[0], w[1], 40); if (p && T) ring(Math.round(p[0]), Math.round(p[1]), clamp(e.atkT.t / e.atkT.T, 0, 1), e.atkT.pid, 1.3); }
    }
    if (tp.kind === 'proj' && e.ptype === 'mortar' && !e.gone) {   // a landing marker on the top edge
      const x = Math.round(e.markX), u = clamp(e.u, 0, 1), c = Math.floor(WP.time * 8) % 2 ? '#ff3a20' : '#ffe040';
      px.poly(g, [[x - 6, 16], [x + 6, 16], [x, 24]], c); px.rect(g, x - 8, 14, 16 * (1 - u), 2, '#ff3a20');
    }
  }
  for (const [s, y] of offscreen) { const x = s < 0 ? 4 : WP.W - 4, yy = clamp(y, 20, WP.PLAY_H - 20), c = Math.floor(WP.time * 8) % 2 ? '#ff3a20' : '#ffe040'; px.poly(g, s < 0 ? [[x, yy], [x + 8, yy - 6], [x + 8, yy + 6]] : [[x, yy], [x - 8, yy - 6], [x - 8, yy + 6]], c); }
};
// ---------- the post passes ----------
let dark = null;
R.post = (g, world, ctx) => {
  const st = world.stage, W = WP.W, H = WP.H;
  // the grade: a multiply and an add over the whole picture
  if (st.grade) { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, W, H, st.grade.mul)); if (st.grade.add) px.blend(g, .5, 'add', () => px.rect(g, 0, 0, W, H, st.grade.add)); }
  // night: a dark mask with dithered light holes (searchlights, fires, the flare, muzzle flashes, explosions)
  const dk = world.darkness * (world.flare > 0 ? .25 : 1);
  if (dk > 0) {
    if (!dark) dark = E.mkCanvas(W, H);
    const d = dark.getContext('2d'), V = world.view; d.globalCompositeOperation = 'source-over';
    const base = Math.round(255 * (1 - dk)), tintc = `rgb(${Math.round(base * .55)},${Math.round(base * .7)},${base})`;
    d.fillStyle = tintc; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'lighter';
    const light = (x, y, r, c, a = .7) => { if (x < -r || x > W + r || y < -r || y > H + r) return; px.ddisc(d, x, y, r, c, a); };
    for (const e of world.ents) {
      if (e.type === 'searchlight' && !e.out && !e.dead && e.beam) { const p = V.project(e.x, e.y, e.z), q = WP.FX.groundEll(V, e.beam[0], e.beam[1], 40); if (q) { light(q[0], q[1], q[2] * 1.2, '#c8d0b8', .8); } if (p) light(p[0], p[1], 10, '#ffffff', .9); }
      if (e.type === 'boss' || WP.TYPES[e.type].kind === 'boss') for (const q of e.parts || []) if ((q.name === 'light1' || q.name === 'light2') && !q.dead) { const p = V.project(q.x, q.y, q.z); if (p) light(p[0], p[1], 18, '#ffffff', .9); }
      if (e.atk && e.atk.phase === 'fire') { const p = V.project(e.x, e.y, e.z + 22); if (p) light(p[0], p[1], 30, '#ffc080', .6); }
    }
    for (const s of R.scenery) if (s.light) { const p = V.project(s.wx, s.wy, (s.z || 0) + s.light[0]); if (p) light(p[0], p[1], Math.min(90, s.light[1] * p[2] * .7), s.light[2] || '#ffa050', .6); }
    for (const p of WP.FX.parts) if (p.kind === 'ball' || p.kind === 'fire') { const q = V.project(p.x, p.y, p.z); if (q) light(q[0], q[1], p.size * q[2] * 3, '#ffa050', .5); }
    for (const s of WP.FX.screen) if (s.kind === 'flash') light(s.x, s.y, 40, '#ffc080', .5);
    if (world.flare > 0) light(W / 2, 40, 300, '#ff9a8a', .4);
    g.save(); g.globalCompositeOperation = 'multiply'; g.drawImage(dark, 0, 0); g.restore();
  }
  // rain
  if (st.rain) { const n = Math.round(st.rain * 160), t = WP.time; for (let i = 0; i < n; i++) { const x = ((i * 97.3 + t * 260) % (W + 40)) - 20, y = ((i * 53.1 + t * 520 + i * i) % (H + 20)) - 10; px.blend(g, .45, 'normal', () => px.line(g, x, y, x - 3, y + 8, '#a8b8d0', 1)); } if (st.lightning && Math.sin(t * 1.7) > .995) px.blend(g, .3, 'add', () => px.rect(g, 0, 0, W, H, '#c8d8ff')); }
  if (world.spotted > 0 && Math.floor(WP.time * 6) % 2 === 0) px.blend(g, .12, 'add', () => px.rect(g, 0, 0, W, WP.PLAY_H, '#ffffff'));
  if (st.overlay) st.overlay(g, world);
  R.rings(g, world, ctx);
  for (const [x, y] of R.marks) px.poly(g, [[x - 4, y - 6], [x + 4, y - 6], [x, y]], '#3aff6a');
  R.marks.length = 0;
  WP.FX.drawScreen(g, world.view, ctx);
  if (ctx.devShapes) for (const s of world.shapes || []) { const c = s.cover ? '#3a8aff' : s.part === 'head' ? '#ff4040' : '#40ff40'; if (s.kind === 'c') { for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; px.dot(g, s.cx + Math.cos(t) * s.r, s.cy + Math.sin(t) * s.r, c); } } else if (s.kind === 'r') { px.line(g, s.x0, s.y0, s.x1, s.y0, c); px.line(g, s.x0, s.y1, s.x1, s.y1, c); px.line(g, s.x0, s.y0, s.x0, s.y1, c); px.line(g, s.x1, s.y0, s.x1, s.y1, c); } else for (let i = 0; i < s.pts.length; i++) { const a = s.pts[i], b = s.pts[(i + 1) % s.pts.length]; px.line(g, a[0], a[1], b[0], b[1], c); } }
};
})();
