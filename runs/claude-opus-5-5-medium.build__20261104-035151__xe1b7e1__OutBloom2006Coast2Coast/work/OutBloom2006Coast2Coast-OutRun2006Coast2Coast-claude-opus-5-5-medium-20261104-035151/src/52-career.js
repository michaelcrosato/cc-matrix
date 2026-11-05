/* The career (PLAN §7.8, §7.9): the Tour map of Bellafiore with its postcards, the brief, the debrief (rank stamp,
 * seeds, unlocks), the Finale's group photo and credits, and the Garage Garden (beds to plant with seeds). */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL;
const S = OB.SCENES = OB.SCENES || {}, game = () => OB.game;

/* ---- the Tour map ---- */
const ISLAND = [[.04, .5], [.1, .22], [.28, .08], [.52, .04], [.74, .1], [.92, .28], [.97, .52], [.9, .76], [.7, .92], [.45, .96], [.22, .9], [.08, .74]];
S.tour = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(d = {}) {
    this.t = 0; OB.UI.idle = 0; this.scr = this.scr || new OB.UI.Screen({ wrap: false }); if (d.focus) this.want = d.focus;
    const p = OB.Profile.p; this.intro = !p.seenIntro ? 0 : -1; this.giverIntro = null;
    if (!game().audio.song || game().audio.song.src !== OB.SONGS.garden) game().audio.music(OB.SONGS.garden, { fade: .6 });
  },
  update(dt) {
    this.t += dt; const I = game().input, W = game().W, H = game().H, p = OB.Profile.p;
    if (this.intro >= 0) { if (I.pressed('confirm') || I.pressed('start') || I.pressed('cancel') || (I.clicked && I.clicked())) { this.intro++; OB.Sound.play('ok'); if (this.intro < OB.TOUR_LINES.intro.length) OB.Voice.say(OB.TOUR_LINES.intro[this.intro], 'bruno', 'happy'); else { this.intro = -1; p.seenIntro = true; OB.Profile.save(); } } if (this.intro === 0 && this.t < dt * 2) OB.Voice.say(OB.TOUR_LINES.intro[0], 'bruno', 'happy'); return; }
    const mx = 20, my = 26, mw = W - 40, mh = H - 96;
    this.map = [mx, my, mw, mh];
    this.scr.set(OB.MISSIONS.map(m => ({ id: m.id, x: mx + m.map[0] * mw - 16, y: my + m.map[1] * mh - 12, w: 32, h: 24, m, locked: !OB.Tour.unlocked(m, p), onPick: () => this.open(m), draw: (g, it, f, scr) => this.card(g, it, f, scr) })));
    if (this.want) { this.scr.focus(this.want); this.want = null; }
    const r = this.scr.update(dt);
    if (r === 'back') game().go('menu', { focus: 2 }, { fade: 'wipe' });
    if (OB.UI.idle > 10) OB.Attract.start('tour');
  },
  open(m) {
    const p = OB.Profile.p;
    if (!OB.Tour.unlocked(m, p)) { OB.Sound.play('error'); OB.UI.toast('LOCKED', m.needs ? 'Clear any ' + m.needs + ' postcards' : 'Clear "' + OB.MISSION[m.after].title + '" first', 2.5); return; }
    game().go('brief', { id: m.id }, { fade: 'wipe' });
  },
  card(g, it, f, scr) {
    const m = it.m, rec = OB.Profile.p.career[m.id], col = (OB.CAST[m.giver] || {}).color || '#ffffff';
    E.ui.box(g, it.x, it.y, it.w, it.h, { bg: it.locked ? ['#4a4458', '#3a3448'] : ['#fff8ec', '#f0e0c8'], border: f ? '#ffcf4a' : col, gradient: !it.locked });
    if (it.locked) OB.icon(g, 'lock', it.x + 10, it.y + 6, 1);
    else { px.rect(g, it.x + 3, it.y + 3, 10, 10, col); T(g, m.id, it.x + 22, it.y + 5, '#5a1e4a', { align: 'center' }); if (rec && rec.rank) T(g, rec.rank, it.x + it.w / 2, it.y + 14, rec.rank === 'AAA' ? C.pink : '#3a7a3a', { align: 'center' }); }
    if (f) scr.ring(g, it);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, p = OB.Profile.p, [mx, my, mw, mh] = this.map || [20, 26, W - 40, H - 96];
      px.rect(g, 0, 0, W, H, '#2a7ab8'); for (let y = 0; y < H; y += 6) px.rect(g, 0, y, W, 1, '#3a8ac8');
      // Bellafiore: a leaf, sunrise coast east (right), sunset coast west (left)
      px.poly(g, ISLAND.map(([x, y]) => [mx + x * mw, my + y * mh]), '#e8d8a0');
      px.poly(g, ISLAND.map(([x, y]) => [mx + (.5 + (x - .5) * .94) * mw, my + (.5 + (y - .5) * .9) * mh]), '#7ab858');
      const regions = [[.82, .5, '#f0dca0'], [.65, .3, '#9a8ad0'], [.68, .7, '#c8a080'], [.5, .2, '#f0c830'], [.52, .55, '#5aa0c8'], [.6, .85, '#c86a4a'], [.35, .12, '#f8c8d8'], [.38, .45, '#c8b098'], [.4, .7, '#6a8a48'], [.3, .82, '#f090b0'], [.12, .25, '#ffb050'], [.18, .42, '#2a8a3a'], [.15, .6, '#3a3a6a'], [.2, .75, '#5a4a7a'], [.1, .88, '#8a6a9a']];
      for (const [x, y, c] of regions) px.ell(g, mx + x * mw, my + y * mh, mw * .06, mh * .07, c);
      for (const id in OB.STAGES) { const f = OB.forkOf(id); if (!f) continue; const a = this.stagePos(id), b1 = this.stagePos(f[0]), b2 = this.stagePos(f[1]); px.line(g, a[0], a[1], b1[0], b1[1], '#6a5a4a', 2); px.line(g, a[0], a[1], b2[0], b2[1], '#6a5a4a', 2); }
      T(g, 'ALBA COAST ', mx + mw - 6, my + mh * .5 - 20, '#5a1e4a', { align: 'right' }); T(g, 'VESPERA COAST', mx + 6, my + mh * .5, '#5a1e4a');
      OB.UI.title(g, 'COAST 2 COAST TOUR', W / 2, 4, { scale: 2 });
      T(g, '★ ' + p.seeds + ' SEEDS', 8, 8, C.good);
      const cleared = Object.values(p.career).filter(c => c.cleared).length; T(g, cleared + ' / ' + OB.MISSIONS.length + ' CLEARED', 8, 18, '#ffffff');
      this.scr.draw(g);
      // the focused postcard's line
      const it = this.scr.cur; if (it) { const m = it.m, rec = p.career[m.id]; OB.UI.panel(g, 20, H - 66, W - 40, 40, { alpha: .94 }); OB.Cast.portrait(g, m.giver, 26, H - 62, 32, {}); T(g, m.title.toUpperCase(), 66, H - 60, C.sun, { scale: 1 }); T(g, OB.CAST[m.giver].name + ' • ' + (it.locked ? (m.needs ? 'Clear any ' + m.needs + ' postcards to open' : 'Opens after "' + OB.MISSION[m.after].title + '"') : m.rule), 66, H - 49, '#ffffff'); T(g, rec && rec.rank ? 'BEST ' + rec.rank : 'NEW', W - 28, H - 60, rec && rec.rank ? C.good : C.pink, { align: 'right' }); }
      OB.UI.footer(g, W, H, [['left', 'Move'], ['confirm', 'Open'], ['cancel', 'Back']]);
      if (this.intro >= 0) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#140a28')); OB.UI.panel(g, W / 2 - 180, H / 2 - 46, 360, 92); OB.Cast.portrait(g, 'bruno', W / 2 - 172, H / 2 - 38, 60, {}); T(g, 'BRUNO BREZZA', W / 2 - 104, H / 2 - 36, OB.CAST.bruno.color); E.font.wrap(OB.TOUR_LINES.intro[this.intro] || '', 250).forEach((l, i) => T(g, l, W / 2 - 104, H / 2 - 22 + i * 10, '#ffffff')); OB.UI.prompt(g, W / 2 + 110, H / 2 + 30, 'confirm', 'Next'); }
    });
  },
  stagePos(id) { const s = OB.STAGES[id], [mx, my, mw, mh] = this.map || [20, 26, 440, 174]; return [mx + mw * (.86 - (s.row - 1) * .18), my + mh * (.15 + (s.col - .5) / (s.row) * .7 * (s.row > 1 ? 1 : 0) + (s.row === 1 ? .35 : 0))]; }
};

/* ---- the brief: one big postcard ---- */
S.brief = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(d) { this.m = OB.MISSION[d.id]; this.t = 0; this.scr = new OB.UI.Screen(); const p = OB.Profile.p, m = this.m, gv = p.givers[m.giver]; this.lines = (!gv ? [OB.TOUR_LINES.givers[m.giver].intro] : []).concat(m.brief); if (!gv) { p.givers[m.giver] = 1; OB.Profile.save(); } this.li = 0; OB.Voice.say(this.lines[0], m.giver, 'happy'); },
  update(dt) {
    this.t += dt; const W = game().W, H = game().H, m = this.m, I = game().input;
    if (this.t > 2.2 && this.li < this.lines.length - 1) { this.li++; this.t = 0; OB.Voice.say(this.lines[this.li], m.giver, 'excited'); }
    const fixed = OB.PASSENGERS.includes(m.giver) ? m.giver : null;
    this.scr.set([{ id: 'go', label: 'START', x: W / 2 + 40, y: H - 60, w: 120, h: 30, onPick: () => game().go('garage', { mission: m.id, fixedPassenger: fixed, back: 'brief', backData: { id: m.id } }, { fade: 'wipe' }) }, { id: 'back', label: 'MAP', x: W / 2 - 160, y: H - 60, w: 120, h: 30, onPick: () => game().go('tour', { focus: m.id }, { fade: 'wipe' }) }]);
    const r = this.scr.update(dt); if (r === 'back') game().go('tour', { focus: m.id }, { fade: 'wipe' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, m = this.m, p = OB.Profile.p, rec = p.career[m.id];
      px.rect(g, 0, 0, W, H, '#2a7ab8');
      E.ui.box(g, 30, 14, W - 60, H - 84, { bg: ['#fff8ec', '#f0e0c8'], border: '#c8a070' });
      px.rect(g, W - 92, 22, 52, 60, '#e8d0a0'); for (let i = 0; i < 6; i++) px.rect(g, W - 92 + i * 9, 22, 4, 2, '#c8a070'); OB.icon(g, 'flower', W - 74, 40, 2);
      OB.Cast.portrait(g, m.giver, 42, 26, 70, { bg: '#f0d8b8' });
      T(g, m.title.toUpperCase(), 124, 28, '#5a1e4a', { scale: 2, shadow: false });
      T(g, 'FROM ' + OB.CAST[m.giver].full.toUpperCase(), 124, 48, '#8a5a4a', { shadow: false });
      this.lines.slice(0, this.li + 1).forEach((l, i) => T(g, '"' + l + '"', 124, 62 + i * 11, '#3a1a4a', { shadow: false }));
      T(g, 'RULES', 42, 110, '#8a5a4a', { shadow: false }); E.font.wrap(m.rule, W - 150).forEach((l, i) => T(g, l, 90, 110 + i * 10, '#3a1a4a', { shadow: false }));
      T(g, 'ROUTE  ' + (m.route ? m.route.map(id => OB.STAGES[id].name).join(' → ') : 'The whole island, forks open'), 42, 136, '#3a1a4a', { shadow: false });
      OB.RANKS.forEach((rk, i) => { const x = 42 + i * 92; T(g, rk, x, 152, rk === 'AAA' ? C.pink : '#5a1e4a', { shadow: false, scale: 1 }); T(g, m.thText ? m.thText[i] : m.th[i] + ' ' + m.unit, x + 22, 152, '#3a1a4a', { shadow: false }); T(g, '★ ' + Math.round(m.seeds * OB.RANK_MULT[rk]), x + 22, 162, '#3a7a3a', { shadow: false }); });
      if (rec && rec.rank) T(g, 'BEST: ' + rec.rank, W - 46, 160, '#3a7a3a', { align: 'right', shadow: false });
      this.scr.draw(g);
      OB.UI.footer(g, W, H, [['confirm', 'Start'], ['cancel', 'Back']]);
    });
  }
};

/* ---- the debrief: the rank stamp, seeds counted up, unlocks ---- */
S.debrief = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(res) {
    this.res = res; this.t = 0; this.scr = new OB.UI.Screen(); const m = this.m = OB.MISSION[res.cfg.rules ? res.cfg.rules.id : res.cfg.mission];
    const mr = res.mission || { cleared: false }; this.mr = mr;
    this.pay = OB.attractActive ? { seeds: 0, unlocked: [] } : OB.Profile.mission(m.id, mr);
    for (const u of this.pay.unlocked) OB.UI.toast('A NEW BED IS READY', u, 4);
    const line = OB.line(mr.cleared ? 'missionWin' : 'missionFail', m.giver); this.line = line; OB.Voice.say(line, m.giver, mr.cleared ? 'excited' : 'sad');
    game().audio.music(OB.SONGS.results, { fade: .6 }); OB.Sound.sting(mr.cleared ? 'goal' : 'gameover');
    // a giver's last postcard closes their arc
    const theirs = OB.MISSIONS.filter(x => x.giver === m.giver && x.id !== 'F'), p = OB.Profile.p;
    this.outro = mr.cleared && this.pay.first && theirs.every(x => p.career[x.id] && p.career[x.id].cleared) ? OB.TOUR_LINES.givers[m.giver].outro : null;
    if (m.id === 'F' && mr.cleared) this.finale = true;
  },
  update(dt) {
    this.t += dt; const W = game().W, H = game().H, m = this.m, idx = OB.MISSIONS.indexOf(m), nx = OB.MISSIONS.find((x, i) => i > idx && OB.Tour.unlocked(x, OB.Profile.p) && !(OB.Profile.p.career[x.id] || {}).cleared);
    OB.UI.stepToasts(dt);
    if (this.t < 1) return;
    const items = [{ id: 'retry', label: 'RETRY', onPick: () => game().go('race', Object.assign({}, this.res.cfg), { fade: 'wipe' }) }];
    if (this.finale) items.push({ id: 'finale', label: 'THE FINALE ♥', onPick: () => game().go('finale', this.res, { fade: 'wipe' }) });
    else if (nx) items.push({ id: 'next', label: 'NEXT POSTCARD', onPick: () => game().go('brief', { id: nx.id }, { fade: 'wipe' }) });
    items.push({ id: 'map', label: 'MAP', onPick: () => game().go('tour', { focus: m.id }, { fade: 'wipe' }) });
    items.forEach((it, i) => Object.assign(it, { x: W / 2 - items.length * 65 + i * 130, y: H - 60, w: 120, h: 30, scale: it.label.length > 10 ? 1 : 2 }));
    this.scr.set(items); const r = this.scr.update(dt); if (r === 'back') game().go('tour', { focus: m.id }, { fade: 'wipe' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, m = this.m, mr = this.mr, s = Math.min(1, this.t / .5);
      r.sky(['#1a0a3a', '#4a1a5a', '#ff7a59']);
      OB.UI.title(g, m.title.toUpperCase(), W / 2, 8, { scale: 2 });
      OB.UI.panel(g, 40, 34, W - 80, H - 106, { alpha: .94 });
      OB.Cast.portrait(g, m.giver, 52, 44, 56, { expr: mr.cleared ? 'smile' : 'wince' });
      E.font.wrap('"' + (this.outro || this.line) + '"', 200).forEach((l, i) => T(g, l, 116, 48 + i * 10, '#ffffff'));
      // the stamp
      const cx = W - 110, cy = 92, rk = mr.cleared ? mr.rank : 'MISS';
      px.disc(g, cx, cy, 34 * s, mr.cleared ? (rk === 'AAA' ? C.pink : '#e8402a') : '#5a5a6a'); px.disc(g, cx, cy, 30 * s, '#fff8ec');
      if (s >= 1) { T(g, rk, cx, cy - 10, mr.cleared ? (rk === 'AAA' ? C.pink : '#c83a2a') : '#5a5a6a', { align: 'center', scale: rk.length > 2 ? 2 : 3, shadow: false }); if (rk === 'AAA') T(g, 'FULL BLOOM', cx, cy + 14, C.pink, { align: 'center', shadow: false }); }
      let y = 106; for (const [k, v] of Object.entries(mr.stats || {})) { T(g, k, 60, y, C.dim); T(g, String(v), 230, y, '#ffffff', { align: 'right' }); y += 11; }
      if (mr.why) T(g, mr.why, 60, y + 2, C.bad);
      const shown = Math.min(this.pay.seeds, Math.floor(this.t * 300)); T(g, '★ +' + shown + ' SEEDS', 60, H - 86, C.good, { scale: 2 });
      this.scr.draw(g); OB.UI.drawToasts(g, W);
      OB.UI.footer(g, W, H, [['confirm', 'Select'], ['cancel', 'Map']]);
    });
  }
};

/* ---- the Finale: the group photo at the goal, Bruno's toast, then the credits ---- */
S.finale = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(res) { this.res = res || OB.lastResult || {}; this.t = 0; this.rigs = ['bruno', 'marisol', 'vivi', 'juni'].map(id => OB.Cast.rig(id)); this.bg = new E.Backdrop({ sky: ['#2a1a5a', '#8a3a7a', '#f0604a', '#ffb050'], sun: { x: .5, y: .66, r: 24, color: '#ffd070' }, layers: [{ kind: 'sea', color: '#3a4a9a', y: .74, height: .3 }] }); game().audio.music(OB.SONGS.lullaby, { fade: 1 }); this.flash = 0; this.said = 0; },
  update(dt) {
    this.t += dt; const t = this.t, I = game().input;
    this.rigs.forEach((R, i) => OB.Cast.pose(R, dt, { x: -60 + i * 40, y: 0, z: 0, facing: Math.PI / 2, pose: t > 4 ? (i % 2 ? 'cheer' : 'wave') : 'hips', expr: 'smile' }));
    if (this.said < 3 && t > 1 + this.said * 3) { OB.Voice.say(OB.TOUR_LINES.finale[this.said], this.said === 1 ? 'juni' : 'bruno', 'excited'); if (this.said === 1) { this.flash = 1; OB.Sound.play('shutter'); } this.said++; }
    this.flash = Math.max(0, this.flash - dt * 2);
    if (t > 11 || (t > 1 && (I.pressed('confirm') || I.pressed('cancel')))) game().go('credits', {}, { fade: 'wipe' });
  },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => { px.rect(g, 0, Math.round(r.H * .78), r.W, r.H, '#8a6a4a'); });
    for (const R of this.rigs) if (R.rig) r.actor(R.state.x, 0, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H, li = Math.min(2, Math.floor((this.t - 1) / 3));
      if (this.t > 1) { OB.UI.panel(g, W / 2 - 150, 18, 300, 30, { alpha: .9 }); T(g, '"' + OB.TOUR_LINES.finale[Math.max(0, li)] + '"', W / 2, 29, '#ffffff', { align: 'center' }); }
      if (this.flash > 0 && !OB.FX.reduce()) px.blend(g, this.flash * (OB.game.settings.flashes || 1), 'add', () => px.rect(g, 0, 0, W, H, '#ffffff'));
      OB.UI.title(g, 'COAST 2 COAST!', W / 2, H - 50, { scale: 2 });
    });
  }
};
S.credits = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(d = {}) { this.t = 0; this.back = d.back || 'menu'; if (!game().audio.song || game().audio.song.src !== OB.SONGS.lullaby) game().audio.music(OB.SONGS.lullaby, { fade: 1 }); },
  update(dt) { this.t += dt; const I = game().input; if (this.t > .3 && (I.pressed('confirm') || I.pressed('cancel') || OB.UI.rightClick)) game().go(this.back, {}, { fade: 'wipe' }); if (this.t > 60) game().go(this.back, {}, { fade: 'wipe' }); },
  draw(r) {
    r.sky(['#05051a', '#2a1a5a', '#8a3a7a']);
    r.overlay(g => {
      const W = r.W, H = r.H, lines = OB.ABOUT.credits(); let y = H - this.t * 18;
      for (const l of lines) { if (y > -20 && y < H + 10) T(g, l.text, W / 2, Math.round(y), l.head ? C.sun : '#ffffff', { align: 'center', scale: l.head ? 2 : 1 }); y += l.head ? 24 : 12; }
      OB.UI.footer(g, W, H, [['confirm', 'Skip']]);
    });
  }
};

/* ---- the Garage Garden: beds in rows of three, paged ---- */
S.garden = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter() { this.t = 0; this.page = 0; this.scr = new OB.UI.Screen(); this.anim = {}; OB.UI.idle = 0; if (!game().audio.song || game().audio.song.src !== OB.SONGS.garden) game().audio.music(OB.SONGS.garden, { fade: .6 }); },
  update(dt) {
    this.t += dt; OB.UI.stepToasts(dt); OB.FX.step(dt);
    const W = game().W, H = game().H, per = 6, pages = Math.ceil(OB.BEDS.length / per), beds = OB.BEDS.slice(this.page * per, this.page * per + per), bw = 132, bh = 70;
    const turn = d => { this.page = (this.page + d + pages) % pages; OB.Sound.play('focus'); };
    const items = beds.map((b, i) => ({ id: b.id, b, x: W / 2 - 1.5 * bw - 10 + (i % 3) * (bw + 10), y: 40 + Math.floor(i / 3) * (bh + 10), w: bw, h: bh, onPick: () => this.plant(b), draw: (g, it, f, scr) => this.bed(g, it, f, scr) }));
    this.scr.set(items);
    const I = game().input; if (I.pressed('shiftUp')) turn(1); if (I.pressed('shiftDown')) turn(-1);
    const r = this.scr.update(dt); if (r === 'back') game().go('menu', { focus: 5 }, { fade: 'wipe' });
    for (const k in this.anim) this.anim[k] += dt;
    if (OB.UI.idle > 10) OB.Attract.start('garden');
  },
  plant(b) {
    const res = OB.Profile.buy(b.id);
    if (!res.ok) { OB.Sound.play('error'); OB.UI.toast(b.name, res.why === 'Locked' ? 'Clear "' + OB.MISSION[b.needs].title + '" to get the seeds' : res.why, 2.5); return; }
    this.anim[b.id] = 0; OB.Sound.play('plant'); OB.Sound.sting('unlock'); OB.UI.toast('IN BLOOM!', b.name + ' is yours', 3);
    const it = this.scr.items.find(x => x.id === b.id); if (it) OB.FX.emit('petal', it.x + it.w / 2, it.y + 30, 40, { vy: -80, vs: 160, g: 140, life: 1.6, size: 3, colors: ['#ff8ac0', '#ffc0d8', '#ffffff', '#ffcf4a'] });
  },
  bed(g, it, f, scr) {
    const b = it.b, st = OB.Profile.bedState(b), a = this.anim[b.id];
    E.ui.box(g, it.x, it.y, it.w, it.h, { bg: st === 'bloomed' ? ['#4a8a3a', '#2a5a2a'] : st === 'locked' ? ['#4a4458', '#3a3448'] : ['#7a5a3a', '#5a3a2a'], border: f ? '#fff4c0' : '#c8a070' });
    // soil, then a sprout, a bud and the bloom
    px.rect(g, it.x + 8, it.y + it.h - 20, it.w - 16, 10, '#4a2a1a');
    const grow = st === 'bloomed' ? (a === undefined ? 3 : Math.min(3, a * 3)) : 0;
    for (let i = 0; i < 4; i++) { const x = it.x + 22 + i * 28, y = it.y + it.h - 20; if (grow > 0) px.rect(g, x, y - 8 * Math.min(1, grow), 2, 8 * Math.min(1, grow), '#3aa04a'); if (grow > 1) px.disc(g, x + 1, y - 10, 2 + (grow > 2 ? 2 : 0), grow > 2 ? ['#ff6aa0', '#ffd040', '#ffffff', '#c080ff'][i] : '#5ab04a'); }
    OB.icon(g, st === 'locked' ? 'lock' : b.icon, it.x + 8, it.y + 6, 1);
    T(g, b.name.length > 19 ? b.name.slice(0, 18) + '.' : b.name, it.x + 24, it.y + 7, '#ffffff');
    T(g, st === 'bloomed' ? 'IN BLOOM' : st === 'locked' ? 'NEEDS ' + b.needs : '★ ' + b.cost, it.x + 24, it.y + 19, st === 'bloomed' ? '#c8ffc8' : st === 'locked' ? '#c8b8e0' : (OB.Profile.p.seeds >= b.cost ? C.good : C.bad));
    if (f) scr.ring(g, it);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, per = 6, pages = Math.ceil(OB.BEDS.length / per);
      r.sky(['#5aa8e8', '#a8d8f8', '#e8f8e0']);
      px.rect(g, 0, H * .3, W, H, '#6ab048'); for (let x = 0; x < W; x += 16) px.rect(g, x, H * .3, 8, 3, '#7ac058');
      px.rect(g, W - 90, 20, 80, 50, '#c8a080'); px.poly(g, [[W - 96, 20], [W - 50, 4], [W - 4, 20]], '#a0503a'); T(g, 'BRUNO\'S', W - 50, 34, '#5a1e4a', { align: 'center', shadow: false });
      OB.UI.title(g, 'GARAGE GARDEN', W / 2 - 40, 6, { scale: 2 });
      T(g, '★ ' + OB.Profile.p.seeds, 10, 8, '#2a5a1a', { scale: 2, shadow: false });
      this.scr.draw(g);
      T(g, 'PAGE ' + (this.page + 1) + ' / ' + pages, W / 2, H - 40, '#2a5a1a', { align: 'center', shadow: false });
      const cur = this.scr.cur; if (cur && cur.b) { const b = cur.b, st = OB.Profile.bedState(b); OB.UI.panel(g, W / 2 - 170, H - 76, 340, 28, { alpha: .92 }); T(g, b.name, W / 2, H - 70, C.sun, { align: 'center' }); T(g, st === 'bloomed' ? 'In bloom: it is yours' : st === 'locked' ? 'Clear "' + OB.MISSION[b.needs].title + '" on the Tour to get the seed packet' : 'Plant for ' + b.cost + ' seeds (you have ' + OB.Profile.p.seeds + ')', W / 2, H - 59, '#ffffff', { align: 'center' }); }
      OB.FX.draw(g); OB.UI.drawToasts(g, W);
      OB.UI.footer(g, W, H, [['shiftDown', 'Page'], ['shiftUp', 'Page'], ['confirm', 'Plant'], ['cancel', 'Back']]);
    });
  }
};
})();
