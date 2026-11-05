/* UI kit (focus lists, mouse hover and click), portraits and dialog, tally with the x-ray Shot Chart. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, txt = BB.txt;

/* ---------- focus menu ---------- */
BB.Menu = class {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.rects = []; this.hoverMoved = false; this.cols = o.cols || 1; }
  get cur() { return this.items[this.i]; }
  /* returns { pick: item|null, back: bool, adjust: -1|0|1 } */
  update(inp, dt) {
    const out = { pick: null, back: false, adjust: 0 };
    const n = this.items.length; if (!n) return out;
    const step = (d) => { let k = this.i; for (let t = 0; t < n; t++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; BB.sfx('uiMove'); } };
    if (this.cols > 1) {
      if (inp.repeat('left', .3, .12)) step(-1); if (inp.repeat('right', .3, .12)) step(1);
      if (inp.pressed('up')) { this.i = (this.i - this.cols + n) % n; BB.sfx('uiMove'); } if (inp.pressed('down')) { this.i = (this.i + this.cols) % n; BB.sfx('uiMove'); }
    } else {
      if (inp.repeat('up', .3, .1)) step(-1); if (inp.repeat('down', .3, .1)) step(1);
      if (inp.repeat('left', .3, .08)) out.adjust = -1; if (inp.repeat('right', .3, .08)) out.adjust = 1;
    }
    const ptr = inp.pointer ? inp.pointer() : null;
    if (ptr && (!this.lastPtr || Math.hypot(ptr[0] - this.lastPtr[0], ptr[1] - this.lastPtr[1]) > 1)) {
      this.lastPtr = ptr.slice();
      for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (r && !this.items[k].disabled && ptr[0] >= r[0] && ptr[0] < r[0] + r[2] && ptr[1] >= r[1] && ptr[1] < r[1] + r[3]) { if (this.i !== k) { this.i = k; BB.sfx('uiMove'); } } }
    }
    const clk = inp.clicked ? inp.clicked() : null;
    if (clk) { for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (r && !this.items[k].disabled && clk[0] >= r[0] && clk[0] < r[0] + r[2] && clk[1] >= r[1] && clk[1] < r[1] + r[3]) { this.i = k; out.pick = this.items[k]; BB.sfx('uiOk'); return out; } } }
    if (inp.pressed('confirm') || inp.pressed('start')) { if (this.cur && !this.cur.disabled) { out.pick = this.cur; BB.sfx('uiOk'); } }
    if (inp.pressed('cancel')) { out.back = true; BB.sfx('uiBack'); }
    return out;
  }
};
/* a vertical list drawn at x,y with item height h */
BB.drawList = (g, menu, x, y, w, h, o = {}) => {
  menu.rects = [];
  menu.items.forEach((it, k) => {
    const sel = k === menu.i, yy = y + k * h; menu.rects[k] = [x, yy, w, h - 2];
    if (sel) { E.ui.box(g, x, yy, w, h - 2, { bg: ['#4a3a18', '#2c2210'], border: '#ffd36a', alpha: .95 }); px.poly(g, [[x + 5, yy + h / 2 - 5], [x + 10, yy + h / 2 - 2], [x + 5, yy + h / 2 + 1]], '#ffd36a'); }
    else E.ui.box(g, x, yy, w, h - 2, { bg: ['#1a2036', '#10131f'], border: '#3a4264', alpha: .8 });
    const col = it.disabled ? '#6a6a7a' : sel ? '#ffffff' : '#c8c8dc';
    txt(g, it.label, x + 16, yy + (h - 2) / 2 - 3, col, { scale: o.scale || 1 });
    if (it.value !== undefined) { const v = typeof it.value === 'function' ? it.value() : it.value; txt(g, '< ' + v +  ' >', x + w - 8 - BB.tw('< ' + v +  ' >'), yy + (h - 2) / 2 - 3, sel ? '#ffd36a' : '#9a9ab0'); }
    if (it.badge) txt(g, it.badge, x + w - 8 - BB.tw(it.badge), yy + (h - 2) / 2 - 3, '#9fd18a');
  });
};

/* ---------- portraits, dialog ---------- */
const rigs = {};
BB.portrait = id => {
  if (rigs[id]) return rigs[id];
  const c = BB.CAST[id];
  const rig = new E.Humanoid({ size: 1.3, hair: c.hair, hat: c.hat || undefined, outfit: c.outfit, colors: { skin: c.skin, hair: id === 'granny' ? '#d8d8e0' : id === 'dub' ? '#8a8a8a' : id === 'earl' ? '#5a3a22' : id === 'loretta' ? '#2a1a12' : '#6a4a22', cloth: c.color } });
  return rigs[id] = rig;
};
BB.talk = null;
BB.makeTalk = game => {
  const t = new E.Dialog(game, { speed: 42, lines: 2, voice: 'babble', bg: '#141a3a', border: '#ffd36a' }); BB.talk = t; return t;
};
BB.say = (lines, onDone) => {
  const talk = BB.talk, game = BB.game; let i = 0;
  const next = () => {
    if (i >= lines.length) { talk.close(); if (onDone) onDone(); return; }
    const [who, text] = lines[i++]; const c = BB.CAST[who] || BB.CAST.emcee; BB.babbleFor(who);
    talk.nameColor = c.color;
    talk.say(text, { name: c.name, portrait: BB.portrait(who), portraitSize: 36, onDone: next });
  };
  next();
};
BB.talkTick = dt => { if (BB.talk && BB.talk.open && BB.RNG.fx()() < .35) BB.babbleFor(BB.talkWho || 'emcee'); };

/* ---------- tally: scores page and x-ray shot chart ---------- */
const CHART_ANIMAL = (species, sex) => ({ species, sex, age: 'adult', pts: 8, face: 1, phase: 0, gait: 'stand', pose: 'stand', mode: 'stand', dead: false, deadT: 0, hits: [] });
BB.drawShotChart = (g, ctx, x, y, w, h, kills, species) => {
  E.ui.box(g, x, y, w, h, { bg: ['#0e1830', '#0a1020'], border: '#7aa7ff', alpha: .96 });
  txt(g, 'X-RAY SHOT CHART', x + 6, y + 5, '#7aa7ff');
  if (!kills.length) { txt(g, 'NO HITS TO CHART', x + w / 2 - 40, y + h / 2, '#6a7aa0'); return; }
  const n = Math.min(kills.length, 4), cw = (w - 8) / Math.min(n, 2), rh = (h - 22) / Math.ceil(n / 2);
  kills.slice(0, 4).forEach((k, i) => {
    const col = i % 2, row = Math.floor(i / 2), cx = x + 4 + col * cw + cw / 2, base = y + 20 + row * rh + rh - 12;
    const sp = BB.SPECIES[k.species], a = CHART_ANIMAL(k.species, 'male'); a.pts = k.pts;
    const kk = Math.min(cw / 3.2 / (sp.size * BB.T.animalScale), rh / 2.4 / (sp.size * BB.T.animalScale)); const sc = sp.size * BB.T.animalScale;
    BB.drawAnimal(g, a, cx, base, kk, null, { xray: true });
    /* organ outlines */
    for (const z of BB.animalZones(a, cx, base, kk)) if (z.kind === 'heart' || z.kind === 'lung' || z.kind === 'head') { for (let t = 0; t < 24; t++) { const an = t / 24 * 6.283; px.dot(g, cx * 0 + z.cx + Math.cos(an) * z.r, z.cy + Math.sin(an) * z.r, z.kind === 'heart' ? '#ff5a5a' : z.kind === 'lung' ? '#ffb070' : '#ffe27a'); } }
    for (const h of k.hits) { const hx = cx + h.lx * kk * sc, hy = base - h.ly * kk * sc; const pc = BB.COLORS[k.p] || '#fff'; px.disc(g, hx, hy, 2, '#000'); px.disc(g, hx, hy, 1, pc); if (h.lethal) px.dot(g, hx, hy, '#fff'); }
    txt(g, k.zone.toUpperCase() + ' ' + k.metres + 'M', cx - BB.tw(k.zone.toUpperCase() + ' ' + k.metres + 'M') / 2, base + 3, '#cfe0ff');
  });
};
BB.tally = { page: 0, t: 0 };
BB.drawTally = (g, ctx, W, H) => {
  const res = ctx.results || [], bonus = !!ctx.def.bonus, multi = res.length > 1;
  px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, W, H, '#080a14'));
  const title = bonus ? ctx.def.name.toUpperCase() : ctx.def.trophy ? (ctx.trophyState && ctx.trophyState.lost ? 'THE ONE THAT GOT AWAY' : 'TROPHY BAGGED') : ctx.endReason === 'time' ? 'TIME!' : ctx.endReason === 'benched' ? 'EVERYONE BENCHED' : 'SITE CLEAR';
  E.font.title(g, title, W / 2, 10, { scale: 2, colors: ['#ffe27a', '#d98a2a'], outline: '#000', align: 'center' });
  txt(g, ctx.def.name + ' • ' + ctx.hunt.name, W / 2 - BB.tw(ctx.def.name + ' • ' + ctx.hunt.name) / 2, 32, '#9fb0d8');
  const page = BB.tally.page;
  if (page === 0 || bonus) {
    const colW = Math.min(180, (W - 20) / Math.max(1, res.length));
    res.forEach((r, i) => {
      const x = W / 2 - colW * res.length / 2 + i * colW + 4, y = 50, w = colW - 8;
      E.ui.box(g, x, y, w, H - 100, { bg: ['#1b2240', '#10152a'], border: r.p.color, alpha: .96 });
      txt(g, (multi ? 'P' + (r.p.idx + 1) + ' ' : '') + BB.COLOR_NAMES[r.p.idx], x + 6, y + 6, r.p.color);
      let yy = y + 20;
      if (bonus) { txt(g, 'HITS ' + r.hits + '/' + r.shots + ' SHOTS', x + 6, yy, '#fff'); yy += 12; for (const b of r.bonuses) { txt(g, b[0], x + 6, yy, '#9fe08a'); txt(g, '+' + BB.fmt(b[1]), x + w - 6 - BB.tw('+' + BB.fmt(b[1])), yy, '#9fe08a'); yy += 12; } }
      else {
        for (const k of r.kills.slice(0, 5)) { const lab = k.zone.toUpperCase().slice(0, 7) + ' ' + k.metres + 'M' + (k.running ? ' RUN' : ''); txt(g, lab, x + 6, yy, '#c8c8dc'); const s = '+' + BB.fmt(k.score); txt(g, s, x + w - 6 - BB.tw(s), yy, '#ffd36a'); yy += 11; }
        if (r.kills.length === 0) { txt(g, 'NO BUCKS BAGGED', x + 6, yy, '#8a8aa0'); yy += 11; }
        for (const b of r.bonuses) { txt(g, b[0], x + 6, yy, '#9fe08a'); const s = '+' + BB.fmt(b[1]); txt(g, s, x + w - 6 - BB.tw(s), yy, '#9fe08a'); yy += 11; }
        if (r.penalties) { txt(g, 'PENALTIES x' + r.penalties, x + 6, yy, '#ff7a6a'); yy += 11; }
      }
      px.rect(g, x + 6, y + (H - 100) - 30, w - 12, 1, '#3a4264');
      const tot = BB.fmt(r.total); txt(g, 'TOTAL', x + 6, y + H - 126, '#fff'); txt(g, tot, x + w - 6 - BB.tw(tot, { scale: 2 }), y + H - 128, '#ffe27a', { scale: 2 });
      if (!bonus && !ctx.def.trophy) for (let s = 0; s < 3; s++) { const sx = x + 8 + s * 16, sy = y + H - 150; px.poly(g, [[sx + 6, sy], [sx + 12, sy + 8], [sx + 6, sy + 5], [sx, sy + 8]], s < r.stars ? '#ffd36a' : '#3a3a50'); px.line(g, sx + 6, sy + 3, sx + 6, sy + 10, s < r.stars ? '#ffd36a' : '#3a3a50', 2); }
    });
  } else {
    const ks = ctx.kills; BB.drawShotChart(g, ctx, 20, 44, W - 40, H - 92, ks, ctx.hunt.species);
  }
  const pg = bonus ? [] : [['tab', ''], ];
  BB.prompts(g, [['confirm', page === 0 && !bonus ? 'SHOT CHART' : 'CONTINUE'], ...(page === 1 ? [['cancel', 'SCORES']] : [])], W / 2, H - 20, 'center');
};
})();
