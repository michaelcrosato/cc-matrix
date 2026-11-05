/* OutBloom — the Coast 2 Coast Tour: Bruno's opening, the island map with fourteen postcards (spatial focus, hover,
 * padlocks saying what opens them), the brief (one big postcard), the debrief (a rank stamp, seeds counted up, unlock
 * toasts), the givers' little arcs, the Garage Garden (flower beds that sprout, bud and bloom), and the Finale's group
 * photo and credits. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const game = OB.game, UI = OB.UI, C = UI.COL, SC = OB.SCENES, P = () => OB.Profile.data;
const go = (s, d) => game.go(s, d, { fade: 'wipe', seconds: .3 });
/* ---- a short talk scene: lines with portraits, then a scene ---- */
const talkScene = (name, linesOf, after, sky) => ({
  res: [480, 270], expand: true,
  enter(d) { this.s = { lines: linesOf(d), i: 0, t: 0, d }; UI.screenName = name; this.say(); },
  say() { const L = this.s.lines[this.s.i]; if (!L) return; OB.Talk.clear(); OB.Talk.say(L[0], L[1], { mood: 'happy' }); this.s.t = 0; },
  update(dt) { this.s.t += dt; OB.Talk.step(dt); const I = game.input; if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) { if (OB.Talk.speaking()) { OB.Talk.cur.shown = OB.Talk.cur.text.length; OB.Talk.t = OB.Talk.cur.dur; } else { this.s.i++; if (this.s.i >= this.s.lines.length) { OB.Talk.clear(); after(this.s.d); } else this.say(); } }
    if (I.pressed('cancel')) { OB.Talk.clear(); after(this.s.d); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, L = this.s.lines[this.s.i] || this.s.lines[this.s.lines.length - 1]; OB.menuBG(g, W, H, this.s.t + this.s.i, typeof sky === 'function' ? sky(this.s.d) : sky || 'fieldsMorning');
    // the garage: a shutter, a workbench, the car
    px.rect(g, 0, Math.round(H * .58), W, Math.round(H * .42), '#6a5a5a'); px.rect(g, W * .1, H * .2, W * .8, H * .38, '#8a7a72'); for (let i = 0; i < 10; i++) px.rect(g, Math.round(W * .1), Math.round(H * .2 + i * H * .038), Math.round(W * .8), 1, '#6a5a52');
    OB.Art.drawCar(g, OB.Art.car('orchidea', '#e8463a'), W * .3, H * .86, .55, { yaw: Math.PI / 2 * .999 });
    OB.Cast.drawFigure(g, L[0], W * .66, H * .86, 2, { facing: Math.PI, pose: this.s.t < 1 ? 'wave' : undefined, expr: 'smile' });
    OB.Cast.portrait(g, L[0], 20, H - 74, 44, { mood: 'happy' });
    UI.panel(g, 70, H - 74, W - 90, 44, { alpha: .95 }); UI.text(g, (OB.CAST[L[0]] || {}).full || OB.CAST[L[0]].name, 78, H - 70, { color: C.sun });
    const T = OB.Talk.cur; UI.text(g, T ? T.text.slice(0, T.shown) : L[1], 78, H - 58, { wrap: W - 110 });
    UI.text(g, (this.s.i + 1) + ' / ' + this.s.lines.length, W - 26, H - 40, { align: 'right', color: C.dim }); UI.footer(g, W, H, [['confirm', 'Next'], ['cancel', 'Skip']]); }); }
});
SC.tourintro = talkScene('tourintro', () => OB.STORY.opening, () => { P().seenTour = true; OB.Profile.save(); go('tour'); });
SC.giverintro = talkScene('giverintro', d => OB.STORY.intro[d.giver], d => { P().givers[d.giver] = Object.assign(P().givers[d.giver] || {}, { intro: true }); OB.Profile.save(); go('brief', d); });
SC.giveroutro = talkScene('giveroutro', d => OB.STORY.outro[d.giver], d => { P().givers[d.giver] = Object.assign(P().givers[d.giver] || {}, { outro: true }); OB.Profile.save(); go('tour', { focus: d.id }); });
/* ---- the Tour map ---- */
let tour = null, tourScr = null;
const drawIsland = (g, W, H, t) => {
  px.rect(g, 0, 0, W, H, '#3a9ad8'); for (let i = 0; i < 80; i++) px.rect(g, (i * 71 + Math.floor(t * 8)) % W, (i * 43) % H, 3, 1, '#7ac8f0');
  const cx = W / 2, cy = H / 2 + 6, rx = W * .44, ry = H * .38, pts = [];
  for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, r = 1 + Math.sin(a * 3) * .06 + Math.sin(a * 7) * .03; pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r * (1 - .2 * Math.sin(a))]); }
  px.poly(g, pts.map(p => [p[0] + 3, p[1] + 4]), '#2a6a9a'); px.poly(g, pts, '#f0d8a0'); px.poly(g, pts.map(p => [cx + (p[0] - cx) * .94, cy + (p[1] - cy) * .92]), '#7cbc58');
  const regions = [[.82, .5, '#f4dca6'], [.68, .3, '#9a72d6'], [.7, .62, '#c69468'], [.55, .22, '#ffcc2a'], [.55, .5, '#3a9ad8'], [.55, .78, '#e0a070'], [.4, .2, '#ffc0d8'], [.4, .4, '#b0a090'], [.4, .62, '#8aa84e'], [.4, .82, '#f09ab8'], [.22, .2, '#e8b880'], [.22, .38, '#2f7a3a'], [.22, .55, '#1a1a4a'], [.22, .7, '#5a4a6a'], [.22, .86, '#7a6a8a']];
  regions.forEach(([x, y, c]) => px.disc(g, Math.round(W * x), Math.round(H * y), Math.round(W * .05), c));
  // the pyramid as roads, east (S1) to west (the goals)
  const pos = id => { const S = OB.STAGES[id]; return [W * (.9 - (S.row - 1) * .17), H * (.5 + (S.col - (S.row + 1) / 2) * .17)]; };
  for (const [a, f] of Object.entries(OB.FORKS)) for (const b of f) { const p = pos(a), q = pos(b); px.line(g, Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), '#7a7a86', 3); px.line(g, Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), '#fff4e0', 1); }
  for (const id of Object.keys(OB.STAGES)) { const p = pos(id); px.disc(g, Math.round(p[0]), Math.round(p[1]), 3, '#ff5fa2'); }
  return pos;
};
SC.tour = {
  res: [480, 270], expand: true,
  enter(d) { tour = { t: 0, focus: d && d.focus }; UI.screenName = 'tour'; UI.idleT = 0; if (OB.Audio) OB.Audio.music('menu');
    tourScr = UI.screen({ name: 'tour', footer: [['navv', 'Move'], ['confirm', 'Open'], ['cancel', 'Menu']], back: () => go('menu', { focus: 2 }), dev: true }); },
  layout(W, H) {
    const items = OB.MISSIONS.map(m => { const open = OB.Profile.missionOpen(m.id), c = P().career[m.id]; return { id: m.id, x: Math.round(W * m.map[0] - 17), y: Math.round(H * m.map[1] - 12), w: 34, h: 24, m, open, c,
      pick: () => { if (!open) { OB.sfx && OB.sfx('error'); UI.toast('LOCKED', m.finale ? 'Clear any ' + OB.FINALE_AT + ' postcards' : 'Clear ' + (OB.MISSIONS.find(o => o.opens.includes(m.id)) || {}).title); return; } const giv = P().givers[m.giver]; if (!giv || !giv.intro) go('giverintro', { giver: m.giver, id: m.id }); else go('brief', { id: m.id }); },
      draw: (g, it, f) => this.card(g, it, f) }; });
    tourScr.setItems(items, true);
    if (tour.focus) { const i = items.findIndex(it => it.id === tour.focus); if (i >= 0) tourScr.focus = i; tour.focus = null; }
  },
  card(g, it, f) {
    const m = it.m, col = OB.CAST[m.giver].color || '#ffffff';
    px.rect(g, it.x + 2, it.y + 2, it.w, it.h, '#1a0a2899'); px.rect(g, it.x, it.y, it.w, it.h, it.open ? '#fff4e0' : '#a89cb0'); px.rect(g, it.x + 2, it.y + 2, 14, 12, col);
    OB.Cast.portrait(g, m.giver, it.x + 2, it.y + 2, 14, { frame: false, zoom: 1.6, bg: col });
    UI.text(g, m.id, it.x + it.w - 3, it.y + 3, { align: 'right', color: '#3a1a4a', shadow: false });
    if (!it.open) OB.Art.icon(g, 'lock', it.x + it.w - 9, it.y + 13);
    else if (it.c && it.c.rank) UI.text(g, it.c.rank, it.x + it.w - 3, it.y + 13, { align: 'right', color: it.c.rank === 'AAA' ? '#c8306a' : '#2a7a3a', shadow: false });
    if (m.finale) OB.Art.icon(g, 'trophy', it.x + 18, it.y + 13);
  },
  update(dt) { tour.t += dt; UI.tickIdle(dt); if (UI.idleT > 10 && OB.Attract) { OB.Attract.start('tour'); return; } this.layout(game.W, game.H); tourScr.update(dt); UI.focusId = tourScr.current && tourScr.current.id; },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; this.layout(W, H); drawIsland(g, W, H, tour.t);
    UI.text(g, 'COAST 2 COAST TOUR', 8, 6, { scale: 2, color: '#fff4e0' }); { const ca = game.cornerArea && game.cornerArea(), rx = ca && ca.y0 < 30 ? Math.floor(ca.x0) - 6 : W - 8; UI.text(g, P().seeds + ' SEEDS  -  ' + OB.Profile.clearedCount() + ' / 14 CLEARED', rx, 8, { align: 'right', color: C.sun }); }
    UI.text(g, 'ALBA COAST →', W - 8, H / 2 + 50, { align: 'right', color: '#ffffff' }); UI.text(g, '← VESPERA COAST', 8, H / 2 + 50, { color: '#ffffff' });
    tourScr.draw(g);
    const it = tourScr.current; if (it) { const m = it.m; UI.panel(g, 8, H - 48, W - 16, 24, { alpha: .92 }); UI.text(g, m.title.toUpperCase() + '  -  ' + OB.GIVERS[m.giver], 14, H - 44, { color: C.sun }); UI.text(g, it.open ? m.rules : (m.finale ? 'Clear any ' + OB.FINALE_AT + ' postcards to open the Finale.' : 'Locked: clear "' + (OB.MISSIONS.find(o => o.opens.includes(m.id)) || {}).title + '".'), 14, H - 34, { color: '#ffffff' }); }
    UI.footer(g, W, H, tourScr.footer); UI.drawToasts(g, W); }); }
};
/* ---- the brief: one big postcard ---- */
let br = null, brScr = null;
SC.brief = {
  res: [480, 270], expand: true,
  enter(d) { br = { m: OB.MISSION[d.id], t: 0 }; UI.screenName = 'brief'; OB.Talk.clear(); OB.Talk.say(br.m.giver, br.m.brief[0], { mood: 'happy' }); OB.Talk.say(br.m.giver, br.m.brief[1], { mood: 'excited' });
    brScr = UI.screen({ name: 'brief', footer: [['confirm', 'Start'], ['cancel', 'Back']], back: () => go('tour', { focus: br.m.id }) });
    brScr.setItems([{ id: 'start', x: 0, y: 0, w: 1, h: 1, label: 'START', scale: 2, pick: () => this.start() }, { id: 'back', x: 0, y: 0, w: 1, h: 1, label: 'MAP', scale: 2, pick: () => go('tour', { focus: br.m.id }) }]); },
  start() { const m = br.m, L = P().last; const flow = { mode: 'mission', mission: m.id, back: 'brief', backData: { id: m.id } }; if (m.kind === 'love') go('garage', flow); else go('garage', Object.assign(flow, {})); },
  update(dt) { br.t += dt; OB.Talk.step(dt); brScr.update(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, m = br.m, c = P().career[m.id]; OB.menuBG(g, W, H, br.t, OB.STAGES[(m.route || ['S1'])[0]].sky);
    const x = W / 2 - 200, y = 18, w = 400, h = 200; px.rect(g, x + 4, y + 4, w, h, '#1a0a2880'); px.rect(g, x, y, w, h, '#fff4e0'); px.rect(g, x + 6, y + 6, w - 12, h - 12, '#fffaf0');
    for (let i = 0; i < 10; i++) px.rect(g, x + w - 70 + (i % 2) * 2, y + 10 + i * 6, 2, 3, '#c8306a');
    px.rect(g, x + w - 56, y + 12, 44, 52, OB.CAST[m.giver].color); OB.Cast.portrait(g, m.giver, x + w - 54, y + 14, 40, { mood: 'happy', frame: false });
    UI.text(g, 'POSTCARD ' + m.id + ' FROM ' + OB.GIVERS[m.giver].toUpperCase(), x + 14, y + 12, { color: '#c8306a', shadow: false });
    UI.text(g, m.title.toUpperCase(), x + 14, y + 24, { scale: 2, color: '#3a1a4a', shadow: false });
    const T = OB.Talk.cur; m.brief.forEach((l, i) => UI.text(g, '"' + l + '"', x + 14, y + 50 + i * 11, { color: '#5a3a6a', shadow: false }));
    UI.text(g, 'RULES', x + 14, y + 80, { color: '#c8306a', shadow: false }); UI.text(g, m.rules, x + 14, y + 91, { color: '#3a1a4a', shadow: false, wrap: w - 100 });
    const where = m.route ? m.route.map(s => OB.STAGES[s].name).join(' → ') + (m.goal ? ' → GOAL ' + m.goal : '') : 'The whole island, forks open';
    UI.text(g, 'ROUTE  ' + where, x + 14, y + 112, { color: '#3a1a4a', shadow: false });
    UI.text(g, 'REWARD', x + 14, y + 128, { color: '#c8306a', shadow: false }); OB.RANKS.forEach((rk, i) => { UI.text(g, rk + ' ' + Math.round(m.seeds * OB.RANK_MUL[rk]), x + 60 + i * 60, y + 128, { color: '#3a1a4a', shadow: false }); });
    UI.text(g, 'GOALS  ' + OB.RANKS.map((rk, i) => rk + ' ' + (typeof m.ranks[i] === 'number' && m.ranks[i] < 1 && m.ranks[i] > 0 ? Math.round(m.ranks[i] * 100) + '%' : m.ranks[i])).join('   ') + '  (' + m.unit + ')', x + 14, y + 142, { color: '#5a3a6a', shadow: false });
    UI.text(g, 'YOUR BEST: ' + (c && c.rank ? c.rank : '-'), x + 14, y + 158, { color: '#3a1a4a', shadow: false });
    brScr.items.forEach((it, i) => { it.x = x + w - 200 + i * 96; it.y = y + h - 36; it.w = 88; it.h = 26; }); brScr.draw(g);
    UI.footer(g, W, H, brScr.footer); }); }
};
/* ---- the debrief: a rank stamp, seeds counted up, unlock toasts ---- */
let db = null, dbScr = null;
SC.debrief = {
  res: [480, 270], expand: true,
  enter(R) {
    const id = R.missionId, m = OB.MISSION[id], before = Object.assign({}, P().career[id] || {}), was = OB.MISSIONS.filter(o => OB.Profile.missionOpen(o.id)).map(o => o.id), beds = OB.BEDS.filter(b => OB.Profile.bedState(b) === 'locked').map(b => b.id);
    const res = { cleared: !!R.cleared, rank: R.rank || null, best: R.best };
    const out = OB.Profile.missionResult(id, res);
    const opened = OB.MISSIONS.filter(o => OB.Profile.missionOpen(o.id) && !was.includes(o.id)), newBeds = OB.BEDS.filter(b => beds.includes(b.id) && OB.Profile.bedState(b) !== 'locked');
    db = { R, m, res, paid: out.paid, shown: 0, t: 0, opened, newBeds };
    UI.screenName = 'debrief'; game.audio.music(OB.THEMES.results, { fade: .6 });
    OB.Talk.clear(); OB.Talk.say('bruno', OB.line('bruno', res.cleared ? 'win' : 'fail'), { mood: res.cleared ? 'excited' : 'happy' });
    if (res.cleared) for (const b of newBeds) UI.toast('A NEW BED IS READY', b.name + ' in the Garage Garden', 4);
    if (res.cleared) for (const o of opened) UI.toast('NEW POSTCARD', o.title, 3.5);
    const lastOfGiver = res.cleared && OB.MISSIONS.filter(o => o.giver === m.giver && !o.finale).slice(-1)[0].id === id && !(P().givers[m.giver] || {}).outro;
    db.next = OB.MISSIONS.find(o => m.opens.includes(o.id));
    dbScr = UI.screen({ name: 'debrief', footer: [['confirm', 'Select'], ['cancel', 'Map']], back: () => this.leave('tour') });
    dbScr.setItems([
      { id: 'retry', x: 0, y: 0, w: 1, h: 1, label: 'RETRY', scale: 1, pick: () => go('brief', { id }) },
      { id: 'next', x: 0, y: 0, w: 1, h: 1, label: 'NEXT POSTCARD', scale: 1, disabled: !(db.next && OB.Profile.missionOpen(db.next.id)), pick: () => go('brief', { id: db.next.id }) },
      { id: 'map', x: 0, y: 0, w: 1, h: 1, label: 'MAP', scale: 1, pick: () => this.leave('tour') }
    ]);
    db.outro = lastOfGiver; db.finale = res.cleared && m.finale;
  },
  leave(to) { if (db.finale) return go('finale', db.R); if (db.outro) return go('giveroutro', { giver: db.m.giver, id: db.m.id }); go(to, { focus: db.m.id }); },
  update(dt) { db.t += dt; db.shown = Math.min(db.paid, Math.round(db.paid * clamp((db.t - 1) / 1.2, 0, 1))); OB.Talk.step(dt); UI.stepToasts(dt); dbScr.update(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, m = db.m; OB.menuBG(g, W, H, db.t, 'fieldsMorning');
    UI.text(g, 'DEBRIEF · '.replace('·', '-') + m.title.toUpperCase(), W / 2, 10, { align: 'center', scale: 2, color: '#fff4e0' });
    UI.panel(g, 30, 34, W - 60, 140, { alpha: .92 });
    Object.entries(db.R.stats || {}).forEach(([k, v], i) => { UI.text(g, k.toUpperCase(), 44, 46 + i * 13, { color: C.dim }); UI.text(g, String(v), 200, 46 + i * 13, { align: 'right', color: '#ffffff' }); });
    const st = clamp((db.t - .4) * 3, 0, 1), rk = db.res.rank;
    if (st > 0) { const s = Math.round(3 + (1 - st) * 4), cx = W - 120, cy = 70; if (db.res.cleared) { UI.frame(g, cx - 50, cy - 18, 100, 60, rk === 'AAA' ? C.pink : C.sun); E.font.title(g, rk, cx, cy - 10, { align: 'center', scale: s, colors: rk === 'AAA' ? ['#ffffff', '#ff7ab8', '#c8306a'] : ['#ffffff', '#ffd23a', '#c88a20'], depth: 2 }); if (rk === 'AAA') UI.text(g, 'FULL BLOOM', cx, cy + 34, { align: 'center', color: C.pink }); }
      else { E.font.title(g, 'NOT YET', cx, cy - 4, { align: 'center', scale: 3, colors: ['#ffe0e0', '#ff8a8a', '#c83a3a'], depth: 2 }); } }
    OB.Art.icon(g, 'seed', 44, 148, 2); UI.text(g, '+' + db.shown + ' SEEDS' + (db.res.cleared && !db.paid ? ' (no new rank)' : ''), 60, 150, { color: C.good });
    OB.Cast.portrait(g, 'bruno', 30, H - 84, 36, { mood: db.res.cleared ? 'happy' : 'neutral' }); const T = OB.Talk.cur; if (T) { UI.panel(g, 70, H - 84, 220, 22, { alpha: .9 }); UI.text(g, T.text.slice(0, T.shown), 76, H - 78, {}); }
    dbScr.items.forEach((it, i) => { it.x = W - 340 + i * 110; it.y = H - 50; it.w = 102; it.h = 24; }); dbScr.draw(g);
    UI.footer(g, W, H, dbScr.footer); UI.drawToasts(g, W); }); }
};
/* ---- the Garage Garden ---- */
let gd = null, gdScr = null;
SC.garden = {
  res: [480, 270], expand: true,
  enter(d) { gd = { t: 0, page: 0, anim: {} }; UI.screenName = 'garden'; UI.idleT = 0; if (OB.Audio) OB.Audio.music('menu');
    gdScr = UI.screen({ name: 'garden', footer: [['confirm', 'Plant'], ['tabL', 'Page'], ['cancel', 'Back']], back: () => go('menu', { focus: 5 }), onTab: dir => { gd.page = (gd.page + dir + 3) % 3; gdScr.focus = 0; OB.sfx && OB.sfx('tick'); } }); },
  layout(W, H) {
    const beds = OB.BEDS.slice(gd.page * 6, gd.page * 6 + 6), bw = Math.min(140, (W - 60) / 3), bh = 78;
    const items = beds.map((b, i) => ({ id: b.id, b, x: Math.round(W / 2 - bw * 1.5 - 10 + (i % 3) * (bw + 10)), y: 44 + Math.floor(i / 3) * (bh + 12), w: Math.round(bw), h: bh, pick: () => this.plant(b), draw: (g, it, f) => this.bed(g, it, f) }));
    items.push({ id: 'page', x: W / 2 - 50, y: H - 44, w: 100, h: 18, label: 'PAGE ' + (gd.page + 1) + ' / 3', scale: 1, left: () => { gd.page = (gd.page + 2) % 3; }, right: () => { gd.page = (gd.page + 1) % 3; }, pick: () => { gd.page = (gd.page + 1) % 3; } });
    gdScr.setItems(items, true);
  },
  plant(b) { const st = OB.Profile.bedState(b); if (st === 'bloomed') { UI.toast('ALREADY IN BLOOM', b.name); return; } if (st === 'locked') { OB.sfx && OB.sfx('error'); UI.toast('LOCKED', 'Clear "' + OB.MISSION[b.needs].title + '" to get the seed packet'); return; }
    if (!OB.Profile.buy(b.id)) { OB.sfx && OB.sfx('error'); UI.toast('NOT ENOUGH SEEDS', b.cost + ' needed'); return; }
    gd.anim[b.id] = 0; OB.sfx && OB.sfx('plant'); game.audio.sting(OB.JINGLES.unlock, { duck: .5 }); UI.toast('IN BLOOM!', b.name + (b.kind === 'car' ? ' - in the garage now' : ''), 3); },
  bed(g, it, f) {
    const b = it.b, st = OB.Profile.bedState(b), a = gd.anim[b.id];
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a2a2a', '#7a4a3a'] : ['#3a2a22', '#5a3a2a'], border: f ? C.sun : '#a88a6a' });
    px.rect(g, it.x + 6, it.y + 30, it.w - 12, 14, '#5a3a22'); for (let i = 0; i < 6; i++) px.rect(g, it.x + 10 + i * (it.w - 20) / 6, it.y + 34, 6, 2, '#3a2412');
    const grow = st === 'bloomed' ? (a === undefined ? 1 : clamp(a / 1.6, 0, 1)) : 0;
    for (let i = 0; i < 4; i++) { const fx = it.x + 16 + i * (it.w - 32) / 3, h = 4 + grow * 16; px.line(g, Math.round(fx), it.y + 32, Math.round(fx), Math.round(it.y + 32 - h), '#3a9a4a', 2);
      if (grow > .6) px.disc(g, Math.round(fx), Math.round(it.y + 30 - h), Math.round(2 + (grow - .6) * 8), ['#ff7ab8', '#ffd23a', '#ff5a3a', '#b07ae8'][i]); else if (grow > .3) px.disc(g, Math.round(fx), Math.round(it.y + 30 - h), 2, '#7ad860'); }
    OB.Art.icon(g, b.icon, it.x + 6, it.y + 6, 1);
    UI.text(g, b.name, it.x + 16, it.y + 6, { color: f ? C.sun : C.ink });
    UI.text(g, st === 'bloomed' ? 'IN BLOOM' : st === 'locked' ? 'NEEDS ' + b.needs : b.cost + ' SEEDS', it.x + it.w / 2, it.y + 52, { align: 'center', color: st === 'bloomed' ? C.good : st === 'locked' ? '#a89cb0' : P().seeds >= b.cost ? C.sun : C.bad });
    if (st === 'locked') OB.Art.icon(g, 'lock', it.x + it.w - 12, it.y + 50);
    if (a !== undefined && a < 1.6) { gd.anim[b.id] += 1 / 60; if (a > 1.1 && a < 1.13) OB.FX.emit('petal', it.x + it.w / 2, it.y + 20, 16, { colors: ['#ffb0d0', '#ff7ab8', '#ffffff'], speed: 70, grav: 40, life: 1.2, size: 2 }); }
  },
  update(dt) { gd.t += dt; UI.tickIdle(dt); OB.FX.step(dt); UI.stepToasts(dt); if (UI.idleT > 10 && OB.Attract) { OB.Attract.start('garden'); return; } this.layout(game.W, game.H); gdScr.update(dt); UI.focusId = gdScr.current && gdScr.current.id; },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; this.layout(W, H); OB.menuBG(g, W, H, gd.t, 'lake'); px.rect(g, 0, Math.round(H * .3), W, H, '#6cb05c'); for (let i = 0; i < 60; i++) px.rect(g, (i * 53) % W, Math.round(H * .3 + (i * 31) % (H * .7)), 2, 2, i % 3 ? '#8ad070' : '#ffd23a');
    UI.text(g, 'GARAGE GARDEN', 10, 8, { scale: 2, color: '#fff4e0' }); OB.Art.icon(g, 'seed', W - 110, 8, 2); UI.text(g, P().seeds + ' SEEDS', W - 10, 10, { align: 'right', scale: 2, color: C.sun });
    gdScr.draw(g); OB.FX.draw(g); UI.footer(g, W, H, gdScr.footer); UI.drawToasts(g, W); }); }
};
/* ---- the Finale: the group photo at the goal, Bruno's toast, the credits ---- */
let fin = null;
SC.finale = {
  res: [480, 270], expand: true,
  enter(R) { fin = { R, t: 0, i: 0 }; UI.screenName = 'finale'; game.audio.music(OB.THEMES.credits, { fade: 1 }); OB.Talk.clear(); for (const [w, l] of OB.STORY.finale) OB.Talk.say(w, l, { mood: 'excited' }); },
  update(dt) { fin.t += dt; OB.Talk.step(dt); if (fin.t > 6.2 && fin.t < 6.3) { game.flash('#ffffff', .2, .8); OB.sfx && OB.sfx('shutter'); } const I = game.input; if (fin.t > 2 && (I.pressed('cancel') || (fin.t > 40) || (fin.t > 9 && (I.pressed('confirm') || I.pressed('start')) && fin.t > 30))) go('tour'); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, t = fin.t, gy = Math.round(H * .74), goal = (fin.R.players && fin.R.players[0].goal) || 'E';
    OB.Sky.draw(g, { x: 0, y: 0, w: W, h: H }, gy - 20, OB.GOALS[goal].sky, t * 6, t, { fireworks: true }); px.rect(g, 0, gy, W, H - gy, '#3a3046');
    const cast = ['bruno', 'marisol', 'leo', 'vivi', 'juni']; cast.forEach((id, i) => OB.Cast.drawFigure(g, id, W / 2 - 100 + i * 50, gy, 1.7, { facing: 0, pose: t > 5 ? 'cheer' : 'wave', expr: 'smile' }));
    if (OB.Talk.cur) OB.HUD.bubble(g, { seatScreen: [W / 2 + (OB.Talk.cur.who === 'juni' ? 100 : -100), gy - 80] }, { x: 0, y: 0, w: W, h: H });
    if (t > 8) { const lines = OB.ABOUT.credits, y0 = H - (t - 8) * 18; UI.panel(g, W / 2 - 150, 0, 300, H, { alpha: .55 }); lines.forEach((l, i) => { const y = y0 + i * 14; if (y > -10 && y < H) UI.text(g, l, W / 2, y, { align: 'center', color: i === 0 ? C.sun : '#ffffff', scale: i === 0 ? 2 : 1 }); }); }
    UI.footer(g, W, H, [['cancel', 'Map']]); }); }
};
})();
