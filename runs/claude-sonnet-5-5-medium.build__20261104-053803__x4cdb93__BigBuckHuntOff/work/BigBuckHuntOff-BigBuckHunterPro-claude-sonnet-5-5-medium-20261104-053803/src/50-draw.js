/* Drawing a site: world, effects, scopes, reticles, HUD. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, lerp = BB.lerp, txt = BB.txt;
const RAD = Math.PI / 180;

/* extra critter shape: snowman popper */
const baseDrawCritter = BB.drawCritter;
BB.drawCritter = (g, c, sx, sy, k, v) => {
  if (c.def.shape === 'snowman') { const rise = c.rise === undefined ? 1 : c.rise; if (rise <= 0) return; const s = k * .9; g.save && g.save(); px.rect(g, sx - s * 1.2, sy - 2, s * 2.4, 3, '#eef3f6'); BB.PROPS.snowman.draw(g, { s: 1.3 * rise, seed: 1 }, sx, sy + (1 - rise) * s * 0.8, k); g.restore && g.restore(); return; }
  baseDrawCritter(g, c, sx, sy, k, v);
};

/* ---------- entity list for the renderer ---------- */
function entityList(ctx, g) {
  const out = [];
  for (const a of ctx.animals) {
    if (a.mode === 'hidden' || a.invisible) continue;
    out.push({ x: a.x, y: a.y, z: a.z, draw(g2, sx, sy, k, v) {
      const opt = {}; if (a.paper) opt.paper = true;
      BB.drawAnimal(g2, a, sx, sy, k, v, opt);
      if (a.paper) for (const h of a.hits) { const sc = BB.SPECIES[a.species].size * BB.T.animalScale; px.disc(g2, sx + a.face * h.lx * k * sc, sy - h.ly * k * sc, Math.max(1, k * .03), '#222'); }
      if (BB.dev.overlays.zones && !a.dead) { for (const z of BB.animalZones(a, sx, sy, k)) { const c = { heart: '#ff4a4a', head: '#ffd24a', lung: '#ff9a4a', neck: '#ffff6a', shoulder: '#ff7ad0', gut: '#9a9aff', ham: '#6ad0ff', leg: '#6aff9a', antler: '#ffffff' }[z.kind]; if (z.cx !== undefined) px.line(g2, z.cx - z.r, z.cy, z.cx + z.r, z.cy, c, 1), px.line(g2, z.cx, z.cy - z.r, z.cx, z.cy + z.r, c, 1); else px.line(g2, z.x0, z.y0, z.x1, z.y1, c, 1); } }
      if (BB.dev.overlays.labels) txt(g2, a.mode + (a.sex === 'male' ? ' M' : ' F'), sx - 14, sy - k * 2.4, '#fff');
    } });
  }
  for (const c of ctx.critters) {
    if (c.def.shape === 'snowman' && c.dead) continue;
    out.push({ x: c.x, y: c.y, z: c.z || 0, draw(g2, sx, sy, k, v) { BB.drawCritter(g2, c, sx, sy, k, v); } });
  }
  return out;
}
BB.renderMain = (g, ctx, time) => {
  const v = ctx.view;
  if (g.canvas && g.canvas.width > 0 && (v.W !== g.canvas.width || v.H !== g.canvas.height)) { v.W = g.canvas.width; v.H = g.canvas.height; BB.updateView(v); }
  BB.renderWorld(g, v, { site: ctx.def, hunt: ctx.hunt, terrain: ctx.terrain, props: ctx.props, entities: entityList(ctx, g), time, fogExtra: ctx.def.fogExtra || 0, tops: ctx.tops });
  ctx.tops = ctx.tops;
};
/* a lens pass into an offscreen canvas, drawn through a pixel circle */
let lensCanvas = null;
function drawLens(g, ctx, p, time) {
  if (typeof document === 'undefined') return;
  const v = ctx.view, R = Math.round(Math.min(v.H * .3, 66)), S = R * 2 + 1, t = clamp(p.scopeT, 0, 1), RR = Math.max(6, Math.round(R * t));
  if (!lensCanvas || lensCanvas.width !== S) { lensCanvas = document.createElement('canvas'); lensCanvas.width = lensCanvas.height = S; }
  const lg = lensCanvas.getContext('2d'); lg.imageSmoothingEnabled = false; lg._c = null;
  const v2 = Object.assign({}, v); v2.W = S; v2.H = S; v2.mag = BB.T.scopeMag; v2.f = v.f * v2.mag;
  v2.cx = R - (p.ax - v.cx) * v2.mag; v2.hy = R - (p.ay - v.hy) * v2.mag;
  const ctx2 = { site: ctx.def, hunt: ctx.hunt, terrain: ctx.terrain, props: ctx.props, entities: entityList(ctx, lg), time, fogExtra: ctx.def.fogExtra || 0, tops: [] };
  lg.save(); lg.clearRect(0, 0, S, S); BB.renderWorld(lg, v2, ctx2); lg.restore(); px.reset(lg);
  const cx = Math.round(p.rx), cy = Math.round(p.ry), ox = clamp(cx, RR + 2, v.W - RR - 3) - cx, oy = clamp(cy, RR + 2, v.H - RR - 3) - cy;
  px.disc(g, cx + ox, cy + oy, RR + 3, '#000');
  for (let dy = -RR; dy <= RR; dy++) { const hw = Math.floor(Math.sqrt(RR * RR - dy * dy)); const sy0 = R + Math.round(dy * R / RR); g.drawImage(lensCanvas, R - Math.round(hw * R / RR), sy0, Math.max(1, Math.round(hw * 2 * R / RR)), 1, cx + ox - hw, cy + oy + dy, hw * 2 + 1, 1); }
  /* crosshair, mil dots, vignette */
  const lx = cx + ox, ly = cy + oy;
  px.line(g, lx - RR, ly, lx - 5, ly, '#000', 1); px.line(g, lx + 5, ly, lx + RR, ly, '#000', 1); px.line(g, lx, ly - RR, lx, ly - 5, '#000', 1); px.line(g, lx, ly + 5, lx, ly + RR, '#000', 1);
  for (let i = 1; i < 5; i++) { px.dot(g, lx + i * 9, ly, '#000'); px.dot(g, lx - i * 9, ly, '#000'); px.dot(g, lx, ly + i * 9, '#000'); px.dot(g, lx, ly - i * 9, '#000'); }
  px.dot(g, lx, ly, p.color);
  for (let a = 0; a < 90; a++) { const an = a / 90 * 6.283; px.dot(g, lx + Math.round(Math.cos(an) * (RR + 1)), ly + Math.round(Math.sin(an) * (RR + 1)), p.color); }
  p.lensCenter = [lx, ly, RR];
}
/* ---------- reticles ---------- */
BB.drawReticle = (g, p, ctx) => {
  const x = Math.round(p.rx + (p.scoped ? 0 : p.sx)), y = Math.round(p.ry + (p.scoped ? 0 : p.sy)), c = p.benched ? '#7a7a86' : p.color, k = p.kick * 3 + p.dry * (BB.fxr(-1, 1)) * 2;
  if (p.scoped && p.scopeT > .9) { return; }
  const R = 6 + k;
  switch (p.shape) {
    case 'circle': for (let a = 0; a < 20; a++) { const an = a / 20 * 6.283; px.dot(g, x + Math.round(Math.cos(an) * R), y + Math.round(Math.sin(an) * R), '#000'); } for (let a = 0; a < 14; a++) { const an = a / 14 * 6.283; px.dot(g, x + Math.round(Math.cos(an) * (R - 1)), y + Math.round(Math.sin(an) * (R - 1)), c); } px.line(g, x - R - 3, y, x - 3, y, c, 1); px.line(g, x + 3, y, x + R + 3, y, c, 1); px.line(g, x, y - R - 3, x, y - 3, c, 1); px.line(g, x, y + 3, x, y + R + 3, c, 1); break;
    case 'diamond': px.line(g, x, y - R, x + R, y, '#000', 3); px.line(g, x + R, y, x, y + R, '#000', 3); px.line(g, x, y + R, x - R, y, '#000', 3); px.line(g, x - R, y, x, y - R, '#000', 3); px.line(g, x, y - R, x + R, y, c, 1); px.line(g, x + R, y, x, y + R, c, 1); px.line(g, x, y + R, x - R, y, c, 1); px.line(g, x - R, y, x, y - R, c, 1); break;
    case 'brackets': for (const s of [-1, 1]) { px.line(g, x + s * R, y - R, x + s * R, y + R, '#000', 3); px.line(g, x + s * R, y - R, x + s * (R - 4), y - R, '#000', 3); px.line(g, x + s * R, y + R, x + s * (R - 4), y + R, '#000', 3); px.line(g, x + s * R, y - R, x + s * R, y + R, c, 1); px.line(g, x + s * R, y - R, x + s * (R - 4), y - R, c, 1); px.line(g, x + s * R, y + R, x + s * (R - 4), y + R, c, 1); } break;
    default: px.line(g, x, y - R, x + R, y + R, '#000', 3); px.line(g, x + R, y + R, x - R, y + R, '#000', 3); px.line(g, x - R, y + R, x, y - R, '#000', 3); px.line(g, x, y - R, x + R, y + R, c, 1); px.line(g, x + R, y + R, x - R, y + R, c, 1); px.line(g, x - R, y + R, x, y - R, c, 1);
  }
  px.dot(g, x, y, c); px.dot(g, x + 1, y, '#000');
  if (p.benched) txt(g, 'BENCHED', x - 17, y + R + 4, '#c8c8d8');
  if (ctx.players.length > 1) txt(g, 'P' + (p.idx + 1), x + R + 3, y - R - 6, c);
};
/* ---------- HUD ---------- */
function shell(g, x, y, on) { px.rect(g, x, y, 3, 8, on ? '#e8c44a' : '#3a3a40'); px.rect(g, x, y, 3, 2, on ? '#c0392b' : '#2a2a30'); px.rect(g, x, y + 7, 3, 1, on ? '#8a6a1c' : '#2a2a30'); }
BB.drawHud = (g, ctx, opt = {}) => {
  const v = ctx.view, W = v.W, H = v.H, ps = ctx.players, multi = ps.length > 1;
  /* timer */
  if (!opt.noTimer && ctx.state === 'play' && !ctx.def.range) {
    const left = Math.max(0, ctx.timeLimit - ctx.t), s = Math.ceil(left); const lab = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    E.ui.box(g, W / 2 - 22, 3, 44, 15, { bg: ['#1d2236', '#101426'], border: left < 10 ? '#ff6a4a' : '#e8e4ff', alpha: .85 }); txt(g, lab, W / 2 - BB.tw(lab) / 2, 7, left < 10 ? '#ff8a6a' : '#fff');
  }
  /* player cards */
  const ca = BB.game.cornerArea ? BB.game.cornerArea() : null;
  ps.forEach((p, i) => {
    const x = multi ? 4 + i * Math.min(112, (W - 10) / ps.length) : 4, y = 4;
    E.ui.box(g, x, y, multi ? 106 : 118, 30, { bg: ['#1d2236', '#101426'], border: p.color, alpha: .82 });
    px.rect(g, x + 3, y + 3, 5, 5, p.color);
    txt(g, (multi ? 'P' + (i + 1) + ' ' : '') + BB.fmt(p.siteScore), x + 11, y + 3, p.benched ? '#a0a0b0' : '#fff');
    const n = Math.round(BB.T.rounds); for (let r = 0; r < Math.min(n, 10); r++) shell(g, x + 5 + r * 5, y + 14, r < p.rounds - (p.chambered ? 0 : 0));
    px.rect(g, x + 5 + Math.min(n, 10) * 5 + 2, y + 15, 5, 5, p.chambered ? '#6fe06f' : p.rackT > 0 || p.reloadT > 0 ? '#f0c040' : '#a03030');
    if (!ctx.def.bonus) { for (let c = 0; c < Math.min(5, p.calls); c++) px.rect(g, x + 5 + c * 6, y + 24, 4, 3, '#9fd18a'); txt(g, ctx.hunt.call.slice(0, 5), x + 40, y + 21, '#8fa'); }
  });
  /* targets remaining */
  if (!ctx.def.bonus && !ctx.def.range && !ctx.def.trophy) {
    const total = ctx.bucksTotalLive || ctx.bucksTotal, bagged = ctx.kills.length, gone = ctx.escaped.length;
    const x = W - 6 - total * 8, y = 6; for (let i = 0; i < total; i++) { const c = i < bagged ? '#6fe06f' : i < bagged + gone ? '#e06f6f' : '#e8e4ff'; px.poly(g, [[x + i * 8 + 3, y], [x + i * 8 + 7, y + 8], [x + i * 8, y + 8]], c); }
  }
  /* scope breath bars */
  for (const p of ps) if (p.scoped && p.lensCenter) { const [lx, ly, R] = p.lensCenter; const w = 40; px.rect(g, lx - w / 2, ly + R + 5, w, 4, '#000'); px.rect(g, lx - w / 2 + 1, ly + R + 6, (w - 2) * p.breathT / BB.T.breath, 2, p.shaky > 0 ? '#ff6a4a' : p.breathHeld ? '#9fd0ff' : '#e8e4ff'); }
  /* PUMP prompt */
  for (const p of ps) if (!p.benched && !p.bot && ctx.state === 'play' && !p.chambered && p.rackT <= 0 && p.reloadT <= 0 && Math.floor(ctx.sceneTime * 4) % 2 === 0) {
    const lab = p.rounds > 0 ? 'PUMP' : 'RELOAD'; const x = clamp(p.rx, 30, W - 30); txt(g, lab, x - BB.tw(lab) / 2 - 8, p.ry + 14, '#ffe27a'); BB.glyph(g, 'pump', x + BB.tw(lab) / 2 - 4, p.ry + 12, p.input && p.input.lastDevice === 'gamepad' ? 'pad' : undefined);
  }
  /* banners */
  BB.fx.banners.forEach((b, i) => { const u = b.t / b.life, a = u < .1 ? u / .1 : u > .75 ? (1 - u) / .25 : 1; const y = 44 + (BB.fx.banners.length - 1 - i) * 22 - (1 - Math.min(1, b.t * 6)) * -8; px.blend(g, a, 'normal', () => { E.font.title(g, b.text, W / 2, y, { scale: 1, colors: [b.color, BB.shadec(b.color, .7)], outline: '#000', align: 'center' }); }); });
  /* pops */
  for (const p of BB.fx.pops) { const u = p.t / p.life; px.blend(g, 1 - u * u, 'normal', () => txt(g, p.text, p.x - BB.tw(p.text) / 2, p.y - u * 22, p.color, { scale: p.big ? 2 : 1, outline: '#000' })); }
  /* captions */
  BB.fx.captions.forEach((c, i) => { const w = Math.min(W - 20, BB.tw(c.who + ': ' + c.text) + 14), x = W / 2 - w / 2, y = H - 24 - (BB.fx.captions.length - 1 - i) * 15; const u = c.t / c.life, a = u > .85 ? (1 - u) / .15 : 1; px.blend(g, a * .9, 'normal', () => { px.rect(g, x, y, w, 13, '#10131f'); }); px.blend(g, a, 'normal', () => { txt(g, c.who + ':', x + 4, y + 3, '#ffd36a'); txt(g, c.text, x + 6 + BB.tw(c.who + ':'), y + 3, '#fff'); }); });
  /* particles */
  for (const p of BB.fx.puffs) px.rect(g, p.x, p.y, p.sz, p.sz, p.c);
  /* stink and splat */
  if (BB.fx.stink > 0) px.blend(g, Math.min(.55, BB.fx.stink * .3), 'normal', () => px.rect(g, 0, 0, W, H, '#8ab030'));
  if (BB.fx.splat > 0) px.blend(g, Math.min(.9, BB.fx.splat), 'normal', () => { px.ell(g, W * .5, H * .45, W * .4, H * .35, '#f4f8fb'); px.ell(g, W * .3, H * .6, 40, 30, '#e8eff4'); px.ell(g, W * .72, H * .35, 36, 26, '#e8eff4'); });
};
/* bottom prompts while playing (first part of a site and always the essentials) */
BB.drawPlayPrompts = (g, ctx) => {
  const W = ctx.view.W, H = ctx.view.H; const p = ctx.players.find(q => !q.bot) || ctx.players[0]; if (!p || ctx.players.every(q => q.bot)) return;
  const dev = p.input && p.input.lastDevice === 'gamepad' ? 'pad' : undefined;
  if (ctx.sceneTime > 14 && ctx.t > 0 && !ctx.def.range) { if (BB.fx.captions.length) return; }
  const items = [['aim', 'AIM'], ['fire', 'FIRE'], ['pump', 'PUMP'], ['scope', 'SCOPE']]; if (!ctx.def.bonus) items.push(['call', ctx.hunt.call.split(' ')[0]]);
  if (BB.fx.captions.length === 0) BB.prompts(g, items, W / 2, H - 15, 'center', dev);
};
/* the whole site frame */
BB.drawSiteFrame = (g, ctx, time, opts = {}) => {
  const v = ctx.view;
  BB.renderMain(g, ctx, time);
  /* fog glade overlay */
  if (ctx.fogA > .02) px.blend(g, clamp(ctx.fogA, 0, .85), 'normal', () => { px.rect(g, 0, 0, v.W, v.H, ctx.hunt.fog); });
  if (BB.FG[ctx.def.vantage]) BB.FG[ctx.def.vantage](g, v, time);
  if (ctx.view.crash) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, v.W, v.H, '#3a2418')); }
  BB.drawWeather(g, v, ctx.hunt, 1 / 60);
  /* tone */
  if (BB.T.timeOfDay !== 0) px.blend(g, Math.abs(BB.T.timeOfDay) * .25, 'multiply', () => px.rect(g, 0, 0, v.W, v.H, BB.T.timeOfDay < 0 ? '#5060a0' : '#ffb060'));
  if (ctx.hunt.id === 'bugle') px.blend(g, .1, 'multiply', () => px.rect(g, 0, 0, v.W, v.H, '#ff9a6a'));
  if (!opts.noScope) for (const p of ctx.players) if (p.scopeT > .02) drawLens(g, ctx, p, time); else p.lensCenter = null;
  if (!opts.noReticle) for (const p of ctx.players) if (ctx.state === 'play' || ctx.state === 'endwait') BB.drawReticle(g, p, ctx);
  if (!opts.noHud) { BB.drawHud(g, ctx, opts); if (!opts.noPrompts) BB.drawPlayPrompts(g, ctx); }
  /* vignette */
  px.blend(g, .22, 'multiply', () => { px.rect(g, 0, 0, v.W, 5, '#000'); px.rect(g, 0, v.H - 5, v.W, 5, '#000'); });
};
})();
