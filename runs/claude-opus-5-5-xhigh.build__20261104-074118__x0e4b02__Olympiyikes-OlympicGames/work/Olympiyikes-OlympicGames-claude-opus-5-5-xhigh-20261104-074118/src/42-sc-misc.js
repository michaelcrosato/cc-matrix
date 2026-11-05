// Single Event (a grid of the twelve, then Retry · Change event · Main menu), Records (tables, laurels, the cabinet),
// How to Play (the basics and every event card), About & Credits (paged), and the Pose Lab.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp } = E;
const UI = O.UI, Art = O.Art;
const ORDER = ['sprint', 'javelin', 'swim', 'diving', 'archery', 'weights', 'skijump', 'downhill', 'bobsled', 'figure', 'curling', 'hockey'];
O.SINGLE_ORDER = ORDER;
const bestMedal = id => { const c = O.Records.cabinet(); let best = null; const rank = { g: 3, s: 2, b: 1 }; for (const n in c) { const m = c[n][id]; if (m && (!best || rank[m] > rank[best])) best = m; } return best; };

// ---------------------------------------------------------------------------------------------------------------
// single event select
// ---------------------------------------------------------------------------------------------------------------
O.scene('single', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .25,
  enter() {
    if (O.Music.current !== 'menu') O.Music.play('menu');
    this.grid = new UI.Grid(12, { x: 16, y: 38, cols: 4, w: 64, h: 48, gap: 6, onPick: i => O.flow.startSingle(ORDER[i]), onCancel: () => O.go('menu'),
      drawTile: (g, i, x, y, w, h, f) => { const id = ORDER[i], ev = O.EVENTS[id]; const c = ev.season === 'winter' ? '#16305a' : '#5a2216'; px.rect(g, x, y, w, h, f ? '#f2b632' : '#05060e'); px.rect(g, x + 1, y + 1, w - 2, h - 2, c); Art.picto(g, id, x + w / 2 - 14, y + 4 + (f ? -1 : 0), 28); UI.text(g, ev.short || ev.name, x + w / 2 - UI.tw(ev.short || ev.name, 1) / 2, y + h - 12, f ? '#ffe066' : '#ffffff'); const m = bestMedal(id); if (m) Art.medal(g, x + w - 8, y + 9, m, 8, { ribbon: false }); } });
    if (O.singleFocus !== undefined) this.grid.i = O.singleFocus;
  },
  update() { this.grid.update(); O.singleFocus = this.grid.i; },
  draw(r) {
    const W = r.W, H = r.H, id = ORDER[this.grid.i], ev = O.EVENTS[id];
    UI.backdrop(r.ctx, r.bw, r.bh, '#16204a', '#06081a');
    r.overlay(g => {
      UI.screenTitle(g, W, 'SINGLE EVENT', { right: ev.season === 'winter' ? 'WINTER' : 'SUMMER' });
      this.grid.draw(g);
      const px0 = 300, pw = W - px0 - 12; UI.panel(g, px0, 38, pw, 162, { title: ev.name, alpha: .85 });
      UI.wrap(ev.howto.goal.toUpperCase(), pw - 16, 1).forEach((l, i) => UI.text(g, l, px0 + 8, 56 + i * 11, '#ffffff'));
      const wr = O.Records.wrEntry(id); if (wr) { UI.text(g, 'WORLD RECORD', px0 + 8, 110, '#aab0d0'); UI.text(g, ev.measure.fmt(wr.perf), px0 + 8, 122, '#ffe066', { scale: 2 }); UI.text(g, wr.name, px0 + 8, 142, '#c8ccec'); }
      if (ev.laurel) { Art.laurel(g, px0 + 8, 158, 18, O.Records.hasLaurel(ev.laurel.id)); UI.text(g, ev.laurel.name, px0 + 30, 160, O.Records.hasLaurel(ev.laurel.id) ? '#f2c94c' : '#8a90b8'); UI.wrap(ev.laurel.text.toUpperCase(), pw - 40, 1).slice(0, 2).forEach((l, i) => UI.text(g, l, px0 + 30, 172 + i * 10, '#8a90b8')); }
      O.Prompt.strip(g, [['move', 'CHOOSE'], ['confirm', 'PLAY'], ['cancel', 'BACK']], W / 2, H - 22);
    });
  }
});
O.scene('singleMenu', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .5,
  enter(d) { this.id = d.id; const ev = O.EVENTS[d.id]; this.list = new UI.List([{ label: 'RETRY', onPick: () => { const players = O.meet ? O.meet.players : [{ nation: 'SUN', input: game.input }]; O.meet = O.flow.newMeet({ mode: 'single', events: [d.id], players }); O.go('eventCard', {}); } }, { label: 'CHANGE EVENT', onPick: () => O.go('single') }, { label: 'MAIN MENU', onPick: () => { O.meet = null; O.go('menu'); } }], { x: 0, y: 90, w: 220, row: 26, scale: 2 }); this.ev = ev; if (O.Music.current !== 'table') O.Music.play('table'); },
  update() { this.list.update(); },
  draw(r) {
    const W = r.W, H = r.H; this.list.o.x = Math.round(W / 2 - 110);
    UI.backdrop(r.ctx, r.bw, r.bh, '#16204a', '#06081a');
    r.overlay(g => { UI.screenTitle(g, W, this.ev.name); Art.picto(g, this.id, W / 2 - 20, 36, 40); this.list.draw(g); O.Prompt.strip(g, [['confirm', 'SELECT']], W / 2, H - 22); });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// records: a tab per event, LAURELS, CABINET
// ---------------------------------------------------------------------------------------------------------------
O.scene('records', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .25,
  enter() { this.tabs = new UI.Tabs(ORDER.map(id => O.EVENTS[id].short || O.EVENTS[id].name).concat(['LAURELS', 'CABINET']), { y: 32, show: 5 }); },
  update() { this.tabs.update(); if (UI.anyPressed('cancel')) { UI.sfx('cancel'); O.go('menu'); } },
  draw(r) {
    const W = r.W, H = r.H, i = this.tabs.i;
    UI.backdrop(r.ctx, r.bw, r.bh, '#2a1a40', '#06081a');
    r.overlay(g => {
      UI.screenTitle(g, W, 'RECORDS');
      this.tabs.draw(g, W);
      if (i < 12) { O.drawRecordTable(g, ORDER[i], W / 2 - 170, 56, 340); const ev = O.EVENTS[ORDER[i]]; if (ev.format.type === 'match') UI.text(g, 'MATCH EVENT: MOST POINTS IN A FINAL', W / 2 - UI.tw('MATCH EVENT: MOST POINTS IN A FINAL', 1) / 2, 190, '#aab0d0'); }
      else if (i === 12) {
        ORDER.forEach((id, k) => { const ev = O.EVENTS[id], L = ev.laurel, on = O.Records.hasLaurel(L.id), x = 16 + (k % 4) * ((W - 32) / 4), y = 56 + Math.floor(k / 4) * 54; UI.panel(g, x, y, (W - 32) / 4 - 6, 48, { alpha: .8, trim: on ? '#f2c94c' : '#3a3f66' }); Art.laurel(g, x + 4, y + 4, 22, on); UI.text(g, L.name, x + 28, y + 6, on ? '#f2c94c' : '#aab0d0'); UI.wrap(L.text.toUpperCase(), (W - 32) / 4 - 16, 1).slice(0, 3).forEach((l, j) => UI.text(g, l, x + 6, y + 20 + j * 9, on ? '#ffffff' : '#6a7090', { font: 'tiny' })); });
        const n = ORDER.filter(id => O.Records.hasLaurel(O.EVENTS[id].laurel.id)).length; UI.text(g, n + ' OF 12 LAURELS', W / 2 - UI.tw(n + ' OF 12 LAURELS', 1) / 2, H - 40, '#f2c94c');
      } else {
        const c = O.Records.cabinet(), x0 = 70, y0 = 56, cw = Math.min(26, (W - x0 - 20) / 12);
        ORDER.forEach((id, k) => Art.picto(g, id, x0 + k * cw, y0, Math.min(20, cw - 2)));
        O.NATIONS.forEach((n, j) => { const y = y0 + 24 + j * 16; Art.flag(g, 14, y, 18, 12, n.id); UI.text(g, n.id, 36, y + 2, '#ffffff'); ORDER.forEach((id, k) => { const m = c[n.id] && c[n.id][id]; if (m) Art.medal(g, x0 + k * cw + 8, y + 6, m, 9, { ribbon: false }); else px.rect(g, x0 + k * cw + 7, y + 5, 2, 2, '#3a3f66'); }); });
        UI.text(g, 'A GOLD TURNS THAT NATION\'S GEAR GOLDEN IN THAT EVENT', W / 2 - UI.tw('A GOLD TURNS THAT NATION\'S GEAR GOLDEN IN THAT EVENT', 1) / 2, H - 40, '#f2c94c');
      }
      O.Prompt.strip(g, [[['tabL', 'tabR'], 'TABS'], ['cancel', 'BACK']], W / 2, H - 22);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// how to play: basics (4 pages) and every event card
// ---------------------------------------------------------------------------------------------------------------
const BASICS = [
  { title: 'MASH', acts: [['mashL', 'mashR']], text: 'ALTERNATE THE TWO BUTTONS AS FAST AS YOU CAN. PRESSING THE SAME ONE TWICE COUNTS FOR LITTLE, AND TOO MANY IN A ROW MEANS A STUMBLE. SETTINGS HAS MASH ASSIST: ONE BUTTON, OR HOLD.' },
  { title: 'TIMING', acts: [['action']], text: 'MOST EVENTS HAVE A MOMENT: THE GUN, THE TAKE-OFF, THE RELEASE, THE ENTRY. A NEEDLE OR A RING SHOWS IT. PRESS IN THE GREEN. SETTINGS HAS TIMING ASSIST FOR WIDER WINDOWS.' },
  { title: 'HYPE & YIKES TURBO', acts: [['turbo']], text: 'GOOD PLAY FILLS YOUR HYPE FLAME. WHEN IT IS FULL, PRESS TURBO FOR THREE SECONDS OF YIKES TURBO: EACH EVENT HAS ITS OWN. ROCKET SKIS, DOLPHIN MODE, HYPER ARM...' },
  { title: 'YIKES!', acts: [['moveH']], text: 'WHEN IT GOES WRONG, IT GOES GLORIOUSLY WRONG: FALSE STARTS, BELLY FLOPS, CRASHES. THE CROWD GASPS, THE REEL ROLLS, AND YOU GET SYMPATHY HYPE. COMEBACKS ALWAYS HAPPEN.' }
];
O.scene('howto', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .25,
  enter() { this.page = 0; this.n = BASICS.length + ORDER.length; },
  update() {
    if (UI.anyRepeat('right') || UI.anyPressed('tabR')) { this.page = (this.page + 1) % this.n; UI.sfx('select'); }
    if (UI.anyRepeat('left') || UI.anyPressed('tabL')) { this.page = (this.page - 1 + this.n) % this.n; UI.sfx('select'); }
    const c = UI.clicked(); if (c && this.dots) { const k = Math.floor((c[0] - this.dots.x0) / 10); if (Math.abs(c[1] - this.dots.y) < 8 && k >= 0 && k < this.n) this.page = k; }
    if (UI.anyPressed('cancel') || UI.anyPressed('confirm') && this.page === this.n - 1) { UI.sfx('cancel'); O.go('menu'); }
  },
  draw(r) {
    const W = r.W, H = r.H;
    if (this.page >= BASICS.length) { const ev = O.EVENTS[ORDER[this.page - BASICS.length]]; O.drawEventCard(r, ev, { items: false }); r.overlay(g => { this.dots = UI.dots(g, this.n, this.page, W / 2, H - 38); O.Prompt.strip(g, [['moveH', 'PAGE'], ['cancel', 'BACK']], W / 2, H - 22); }); return; }
    const b = BASICS[this.page];
    UI.backdrop(r.ctx, r.bw, r.bh, '#1a2a50', '#06081a');
    r.overlay(g => {
      UI.screenTitle(g, W, 'HOW TO PLAY', { right: 'BASICS ' + (this.page + 1) + ' / 4' });
      E.font.text(g, b.title, W / 2 - E.font.width(b.title, { scale: 3 }) / 2, 44, '#f2b632', { scale: 3, shadow: '#000', outline: false });
      if (this.page === 0) O.Prompt.pair(g, W / 2 - 20, 76, 'mashL', 'mashR', { size: 2, rate: 6 });
      else if (this.page === 2) { O.HUD.flame(g, W / 2 - 40, 80, { hype: .5 + .5 * Math.sin(game.real * 2), turboT: 0 }); O.Prompt.draw(g, W / 2 + 30, 76, 'turbo', { size: 2 }); }
      else if (this.page === 3) O.UI.stamp(g, W, H, 'OLYMPIYIKES!', (game.real % 2), { scale: 3, y: 70 });
      else { const bar = this.bar || (this.bar = new O.Widgets.TimingBar({ hz: .9 })); bar.update(1 / 60); bar.draw(g, W / 2 - 80, 82, 160, 10); O.Prompt.draw(g, W / 2, 98, 'action', { size: 2, align: 'center' }); }
      const k2 = UI.wrap(b.text, W - 50, 2).length <= 4 ? 2 : 1; UI.wrap(b.text, W - 50, k2).forEach((l, i) => UI.text(g, l, 24, 124 + i * (k2 === 2 ? 19 : 12), '#ffffff', { scale: k2 }));
      this.dots = UI.dots(g, this.n, this.page, W / 2, H - 38);
      O.Prompt.strip(g, [['moveH', 'PAGE'], ['cancel', 'BACK']], W / 2, H - 22);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// about & credits (paged): Source Information · Testing · Engine · Prompt · Credits · Controls
// ---------------------------------------------------------------------------------------------------------------
const aboutPages = () => {
  const A = O.ABOUT || {}, S = A.sourceInformation || {};
  const si = [['DATE', S.date], ['SOURCE', S.source], ['PLAN', S.plan], ['GENRE', S.genre], ['PERSPECTIVE', S.perspective], ['TECH', S.tech], ['ART DIRECTION', S.artDirection], ['ANIMATION', S.animation], ['AUDIO', S.audio], ['ONLINE', S.online], ['TESTING', S.testing], ['RESEARCH', S.research], ['ENVIRONMENT', S.environment], ['MODEL', S.model], ['USAGE', S.usage]];
  const qa = (title, qs, ans) => ({ title, rows: qs.map((q, i) => [q, (ans || [])[i] || 'unknown']) });
  return [
    { title: 'SOURCE INFORMATION', rows: si },
    qa('TESTING FEEDBACK', ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'], A.testingFeedback),
    qa('ENGINE FEEDBACK', ['What I liked most', 'Did I get stuck or guess wrong?', 'The most important thing I built', 'The hardest part', 'What I changed in the engine, and why', 'One thing I would change'], A.engineFeedback),
    qa('PROMPT FEEDBACK', ['What I liked most', 'What was confusing', 'The hardest thing to do', 'What I would change'], A.promptFeedback),
    { title: 'CREDITS', rows: (A.credits || []).map(c => [c[0], c[1]]) },
    { title: 'CONTROLS', controls: true }
  ];
};
O.scene('about', {
  menu: true, view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: .25,
  enter() { this.pages = aboutPages(); this.page = 0; this.sub = 0; },
  update() {
    const P = this.pages, p = P[this.page];
    if (UI.anyPressed('tabR') || UI.anyRepeat('right')) { this.page = (this.page + 1) % P.length; this.sub = 0; UI.sfx('select'); }
    if (UI.anyPressed('tabL') || UI.anyRepeat('left')) { this.page = (this.page - 1 + P.length) % P.length; this.sub = 0; UI.sfx('select'); }
    if (UI.anyRepeat('down') && this.more) { this.sub++; UI.sfx('select'); } if (UI.anyRepeat('up') && this.sub > 0) { this.sub--; UI.sfx('select'); }
    const c = UI.clicked(); if (c && this.dots) { const k = Math.floor((c[0] - this.dots.x0) / 10); if (Math.abs(c[1] - this.dots.y) < 8 && k >= 0 && k < P.length) { this.page = k; this.sub = 0; } }
    if (UI.anyPressed('cancel')) { UI.sfx('cancel'); O.go('menu'); }
    void p;
  },
  draw(r) {
    const W = r.W, H = r.H, p = this.pages[this.page];
    UI.backdrop(r.ctx, r.bw, r.bh, '#1a1650', '#06081a');
    r.overlay(g => {
      UI.screenTitle(g, W, 'ABOUT & CREDITS', { right: p.title });
      const x = 16, w = W - 32; let y = 36; const bottom = H - 50;
      if (p.controls) { drawControls(g, W, H); }
      else {
        // rows: a label in gold, the text wrapped beneath; paged by ↑/↓ when they don't fit
        const rows = p.rows, blocks = rows.map(([k, v]) => ({ k: String(k).toUpperCase(), lines: UI.wrap(String(v == null ? 'unknown' : v), w - 8, 1) }));
        let start = 0, skip = this.sub; const pages = []; let cur = [], hh = 0;
        for (const b of blocks) { const bh = 12 + b.lines.length * 10 + 4; if (hh + bh > bottom - 36 && cur.length) { pages.push(cur); cur = []; hh = 0; } cur.push(b); hh += bh; }
        if (cur.length) pages.push(cur);
        const pg = pages[Math.min(skip, pages.length - 1)] || []; this.more = skip < pages.length - 1; void start;
        for (const b of pg) { UI.text(g, b.k, x, y, '#f2b632'); y += 11; for (const l of b.lines) { UI.text(g, l, x + 6, y, '#ffffff'); y += 10; } y += 4; }
        if (pages.length > 1) UI.text(g, 'PART ' + (Math.min(skip, pages.length - 1) + 1) + ' OF ' + pages.length + (this.more ? '  ·  ↓ MORE' : ''), W - 16 - UI.tw('PART 1 OF 9  ·  ↓ MORE', 1), H - 48, '#aab0d0');
      }
      this.dots = UI.dots(g, this.pages.length, this.page, W / 2, H - 38);
      O.Prompt.strip(g, [['moveH', 'PAGE'], ['moveV', 'MORE'], ['cancel', 'BACK']], W / 2, H - 22);
    });
  }
});
function drawControls(g, W, H) {
  const rows = [['move', 'MOVE · STEER · AIM · MENUS'], [['mashL', 'mashR'], 'MASH · TUCK / PIKE · PASS / CHECK · SWEEP'], ['action', 'ACTION: JUMP · THROW · RELEASE · SHOOT'], ['turbo', 'YIKES TURBO (FULL HYPE)'], ['alt', 'HOLD: BREATH · TUCK · BREATHE · BURST'], ['pause', 'PAUSE (DEV MODE IS IN THE PAUSE MENU)'], [['tabL', 'tabR'], 'SWITCH TABS']];
  const devs = [['keyboard', 'KEYBOARD'], ['gamepad', 'CONTROLLER']];
  devs.forEach(([d, label], c) => {
    const x0 = 16 + c * (W - 32) / 2; UI.text(g, label, x0, 38, '#f2b632', { scale: 1 });
    rows.forEach(([a, l], i) => { const y = 52 + i * 22; const w = O.Prompt.draw(g, x0, y, a, { device: d }); UI.wrap(l, (W - 32) / 2 - w - 14, 1).slice(0, 2).forEach((s, j) => UI.text(g, s, x0 + w + 6, y + 1 + j * 9, '#ffffff')); });
  });
  UI.text(g, 'MOUSE: AIM AND SHOOT IN ARCHERY, CURLING AND HOCKEY; CLICK MENUS', 16, H - 60, '#c8ccec');
}
O.CREDITS_PAGES = () => {
  const A = O.ABOUT || {};
  return [['OLYMPIYIKES!', 'FASTER. HIGHER. YIKES.', '', 'THE COMPLETE SUMMER AND WINTER GAMES,', 'OVER THE TOP.'],
    ['DESIGN, CODE, ART, MUSIC AND VOICES', 'PLANNED BY CLAUDE-OPUS-5-5 (MAX EFFORT)', 'BUILT BY CLAUDE-OPUS-5-5 (XHIGH EFFORT)', 'ALL ART, MUSIC, SOUND AND VOICES MADE IN CODE'],
    ['THE CAST', 'CHIP BELLOWS · DAME VERA VELOCITY · THE STADIUM PA', 'MAX OVERDRIVE · INGRID SNOWCASTLE · COCO BONBON', 'BLAZE CINDERHART · MARINA SPLASHWORTH · ROCKY SUMMIT', 'PIXEL VANCE · DASH GOLDBERRY · YIKESY THE MASCOT', 'COACH BRUNO'],
    ['BUILT ON', 'MY-3D2DGE ' + E.versionLabel().toUpperCase(), 'AI HUB SESSION PROTOCOL 1 · CLIENT 1.4.0', 'ENGINE CHANGES: SEE ABOUT & CREDITS'],
    ['A WORK OF FICTION', 'ALL NATIONS, ATHLETES, VENUES AND THE MASCOT ARE INVENTED.', 'NO OFFICIAL EMBLEMS, ANTHEMS OR MUSIC WERE HARMED.', '', 'THANK YOU FOR PLAYING!']].concat(A.creditsExtra || []);
};

// ---------------------------------------------------------------------------------------------------------------
// the pose lab: every custom pose on a rig, turning (dev mode → JUMP, or #poselab)
// ---------------------------------------------------------------------------------------------------------------
O.scene('poselab', {
  menu: false, view: 'brawler', input: O.KEYS, camera: { zoom: [.75, 2] }, touch: [], lock: .2, pausable: true,
  enter(d) { this.names = O.Pose.names; this.i = Math.max(0, d && d.pose ? this.names.indexOf(d.pose) : 0); this.rig = O.makeRig('SUN', 'track'); this.rig2 = O.makeRig('BON', 'skate'); this.turn = 0; this.pitch = 0; this.blob = Art.makeYikesy(9); },
  update(dt, rdt) {
    if (UI.anyRepeat('right')) { this.i = (this.i + 1) % this.names.length; UI.sfx('select'); } if (UI.anyRepeat('left')) { this.i = (this.i - 1 + this.names.length) % this.names.length; UI.sfx('select'); }
    if (game.input.down('up')) this.pitch += rdt * 2; if (game.input.down('down')) this.pitch -= rdt * 2; if (game.input.pressed('action')) this.pitch = 0;
    if (UI.anyPressed('cancel')) { O.go('menu'); return; }
    this.turn += rdt * .6;
    const nm = this.names[this.i]; O.Pose.set(this.rig, nm, { u: .5 + .5 * Math.sin(game.real * 2), h: .5 + .5 * Math.sin(game.real), ph: game.real * 6 }); O.Pose.set(this.rig2, nm, { u: 1, h: 1, ph: game.real * 6 });
    O.Pose.rot(this.rig, this.pitch, 0); O.Pose.rot(this.rig2, this.pitch, 0);
    this.rig.update(dt || 1 / 120, { x: -30, y: 60, z: 0, facing: this.turn }); this.rig2.update(dt || 1 / 120, { x: 30, y: 60, z: 0, facing: 0 });
    this.blob.update(rdt, { squash: Math.sin(game.real * 5) * .2 });
    game.focus(0, 60, 24);
  },
  draw(r) {
    Art.sky(r.ctx, r.bw, r.bh, ['#1a2a50', '#3a4a7a', '#5a6a9a']);
    Art.quad(r, [[-200, 20, 0], [200, 20, 0], [200, 140, 0], [-200, 140, 0]], '#3a4060');
    for (const [rig, x] of [[this.rig, -30], [this.rig2, 30]]) { r.shadow(x, 60, 7, .5); r.actor(x, 60, 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); }); }
    Art.drawYikesy(r, this.blob, 80, 70, 0);
    r.overlay(g => { const W = r.W, H = r.H; UI.screenTitle(g, W, 'POSE LAB', { right: (this.i + 1) + ' / ' + this.names.length }); E.font.text(g, this.names[this.i].toUpperCase(), W / 2 - E.font.width(this.names[this.i].toUpperCase(), { scale: 2 }) / 2, 34, '#ffe066', { scale: 2, shadow: '#000', outline: false }); O.Prompt.strip(g, [['moveH', 'POSE'], ['moveV', 'PITCH'], ['action', 'RESET'], ['cancel', 'BACK']], W / 2, H - 22); });
  }
});
})();
