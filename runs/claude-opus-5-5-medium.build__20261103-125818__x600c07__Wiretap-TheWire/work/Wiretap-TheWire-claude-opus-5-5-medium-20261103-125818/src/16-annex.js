// WIRETAP: interiors. The Annex (the detail's office over the impound lot: walk it, use its stations), and one room
// scene for the box, chambers, the wire room, Odessa's kitchen, Mama B's back room, the press conference and the car.
const ANNEX_ROWS = ['######################', '#....#..........#....#', '#....#..........#....#', '#....,..........,....#', '#....#..........#....#', '######..........######', '#....#..........#....#', '#....,..........,....#', '#....#..........#....#', '#########,,,,#########'];
const STATIONS = { board: [10, 1.6, 'The Board'], navarre: [18.5, 2.5, "Navarre's office"], wire: [3, 2.5, 'Wire room'], evidence: [3, 7, 'Evidence cage'], coffee: [18.5, 7, 'Coffee'], hal: [13, 7, "Hal's bench"], desk: [7, 2.8, 'Your desk'], stairs: [10.5, 8.6, 'Stairs down'] };
let annexMap = null;
const Annex = {
  pausable: true, view: 'iso', views: ['iso'], camera: { zoom: [.9, 2], start: 1.5, tall: 1.6 },
  enter(data = {}) {
    if (!annexMap) annexMap = new E.TileMap({ rows: ANNEX_ROWS, legend: { '#': 1, '.': { floor: 'lino' }, ',': { floor: 'door' } }, types: { 1: { h: 40, top: '#3a3834', side: '#a8a090', face: 'plaster', roof: 'plain', cut: true, windows: { lit: .6 } } },
      floorTex: (x, y, tag) => { const ix = Math.floor(x / 8), iy = Math.floor(y / 8); return tag === 'door' ? [90, 70, 50] : (ix + iy) % 2 ? [138, 132, 120] : [122, 116, 106]; }, outside: '#141210' });
    this.map = annexMap; const b = Director.beat(); this.b = b; this.st = data.stations || b.stations || {}; this.used = {}; this.t = 0;
    const p = C(10.5, 7.5); this.me = makePlayer('dana', p); this.me.facing = -Math.PI / 2;
    this.cast = [['lou', 10.3, 3.9], ['hal', 13.3, 7.9], ['ren', 7.3, 7.9], ['navarre', 18.3, 3.2]].map(([id, cx, cy]) => { const a = new Agent({ id, person: id, x: (cx + .5) * T, y: (cy + .5) * T }); a.facing = Math.PI / 2; return a; });
    if (b.extra) for (const id of b.extra) { const a = new Agent({ id, person: id, x: 16.5 * T, y: 3 * T }); a.facing = Math.PI; this.cast.push(a); }
    game.lights.enabled = true; game.lights.ambient = .62; game.weather = null; Music.play('wire'); Amb.set(['hvac']);
    game.follow(null); game.cam.bounds = v => annexMap.bounds(v); game.cam.snap = true;
    STATE.inAnnex = true; game.saves.canSave = true;
    if (b.brief && !data.noBrief) Talk.run(b.brief(), () => { if (b.afterBrief) b.afterBrief(); });
    tip('annex', 'The Annex', 'Walk to a lit station and press ' + Prompt.label('interact') + '. The stairs take you back out. Your desk is the save point (pause menu).');
  },
  exit() { game.saves.canSave = false; STATE.inAnnex = false; if (ui) ui.hud({}); game.lights.enabled = false; },
  live(k) { const s = this.st[k]; return s && (!s.need || s.need()) && !(s.once && this.used[k]); },
  required() { const r = Object.entries(this.st).filter(([k, s]) => s.required && !this.used[k]); return r.filter(([k, s]) => !s.need || s.need()).concat(r.filter(([k, s]) => s.need && !s.need())); },
  update(dt) {
    if (Globals.tick(dt)) return;
    if (Talk.open) { Talk.update(dt); game.focus(this.me.x, this.me.y, 16); return; }
    if (UI.update(dt)) return; if (Talk.update(dt)) { game.focus(this.me.x, this.me.y, 16); return; }
    this.t += dt;
    if (game.input.pressed('notebook') || game.input.pressed('map') || padCreate()) { Notebook.open(game.input.pressed('map') ? 'map' : 'objectives'); return; }
    const p = this.me, g = p.ctl.ground(), m = Math.hypot(g[0], g[1]);
    p.body.vx = g[0] * 60; p.body.vy = g[1] * 60; if (m > .1) p.facing = Math.atan2(g[1], g[0]); p.body.update(dt, annexMap);
    p.rig.update(dt, { x: p.x, y: p.y, z: 0, vx: p.body.vx, vy: p.body.vy, facing: p.facing });
    for (const a of this.cast) a.rig.update(dt, { x: a.x, y: a.y, z: 0, vx: 0, vy: 0, facing: a.facing });
    let near = null, nd = 22;
    for (const k of Object.keys(STATIONS)) { if (!this.live(k) && k !== 'stairs') continue; const [cx, cy] = STATIONS[k], d = Math.hypot((cx + .5) * T - p.x, (cy + .5) * T - p.y); if (d < nd) { nd = d; near = k; } }
    if (near === 'stairs' && this.required().length) near = null;
    this.near = near;
    const clk = game.input.clicked && game.input.clicked();
    if (clk && this.hover) near = this.hover;
    if (near && (p.ctl.pressed('interact') || (clk && this.hover === near))) this.use(near);
    game.focus(p.x, p.y, 16);
    const req = this.required();
    ui.hud({ objective: req.length ? { step: 'THE ANNEX', title: req[0][1].label || STATIONS[req[0][0]][2], text: req[0][1].text || '', at: { x: (STATIONS[req[0][0]][0] + .5) * T, y: (STATIONS[req[0][0]][1] + .5) * T }, from: p } : { step: 'THE ANNEX', title: this.b.leave || 'Head out', text: 'The stairs, south', at: C(10.5, 8.6), from: p },
      prompt: near ? { act: 'interact', label: near === 'stairs' ? 'Leave' : (this.st[near] && this.st[near].label) || STATIONS[near][2] } : null,
      bars: [{ label: "Major's patience", value: STATE.meters.brass, max: 100, color: STATE.meters.brass < 30 ? '#ff5a4a' : '#ffb347' }], counts: [['Case', STATE.meters.case], ['Heat', STATE.meters.heat]], place: 'The Annex · Episode ' + STATE.ep });
  },
  use(k) {
    if (k === 'stairs') { if (this.b.car && !Attract.on) return Director.car(this.b.car, () => Director.complete()); return Director.complete(); }
    const s = this.st[k]; this.used[k] = true; s.act(() => { if (s.complete && !s.complete()) { this.used[k] = false; toast('Not finished', s.unfinished || 'Come back to it.'); } });
  },
  draw(r) {
    annexMap.drawFloor(r); annexMap.queueWalls(r);
    const sh = [['desk', 7.5, 2.8, Math.PI / 2], ['desk', 10.5, 2.8, Math.PI / 2], ['desk', 7.5, 6.8, Math.PI / 2], ['desk', 13.5, 6.8, Math.PI / 2], ['filecab', 1.4, 6.4, 0], ['filecab', 2.4, 6.4, 0], ['filecab', 14.8, 1.4, 0],
      ['reel', 2.5, 1.6, Math.PI / 2], ['crt', 4, 1.6, Math.PI / 2], ['radiator', 1.6, 4.3, 0], ['coffeemaker', 19, 6.4, Math.PI / 2], ['desk', 18.5, 1.8, Math.PI / 2], ['corkboard', 10.5, 1.1, Math.PI / 2], ['desk', 3, 7.8, Math.PI / 2]];
    for (const [id, cx, cy, f] of sh) r.shape(id, cx * T, cy * T, 0, { facing: f });
    // the Board's pins show in the world too
    const pins = Object.keys(STATE.board.pins).length;
    r.queue(10.5 * T, 1.2 * T, 20, g => { for (let i = 0; i < pins; i++) { const p = r.w((8.8 + (i % 6) * .6) * T, 1.25 * T, 30 - Math.floor(i / 6) * 8); px.rect(g, p[0] - 2, p[1] - 2, 4, 5, '#f4f1ea'); px.dot(g, p[0], p[1] - 2, '#c82a2a'); } for (const l of STATE.board.links.slice(0, 4)) { const a = r.w(9 * T, 1.25 * T, 28), b = r.w(12 * T, 1.25 * T, 22); px.line(g, a[0], a[1], b[0], b[1], '#b3261e'); } }, { bias: 4 });
    for (const [x, y] of [[7.5, 2.8], [13.5, 6.8], [18.5, 1.8], [3, 1.8]]) { r.prop('lamp', x * T + 6, y * T, 14, { size: .5, light: true }); }
    for (const a of this.cast) a.draw(r);
    r.shadow(this.me.x, this.me.y, 6, .35); r.actor(this.me.x, this.me.y, 0, (g, ox, oy) => this.me.rig.draw(g, ox, oy, r.view), { xray: { color: '#ffb347' } });
    this.hover = null; const ptr = Prompt.dev === 'kbm' && game.input.pointer ? game.input.pointer() : null;
    for (const k of Object.keys(STATIONS)) { if (!this.live(k) && !(k === 'stairs' && !this.required().length)) continue; const [cx, cy, nm] = STATIONS[k], s = r.w((cx + .5) * T, (cy + .5) * T, 24);
      if (ptr && Math.hypot(ptr[0] - s[0], ptr[1] - s[1]) < 16) this.hover = k;
      game.lights.add((cx + .5) * T, (cy + .5) * T, 10, 30, .6, { color: '#ffb347' });
      r.overlay(g => { const on = this.near === k || this.hover === k; E.font.text(g, (on ? '▸ ' : '') + ((this.st[k] && this.st[k].label) || nm), Math.round(s[0]), Math.round(s[1]) - 6, on ? '#ffb347' : '#e8e4dc', { align: 'center', shadow: '#000', outline: false }); }); }
    Talk.draw(r);
  }
};

/* ---- rooms: small interiors in the brawler view; data says who sits where, the scene's run() opens the screens ---- */
const ROOMS = {
  box: { rows: ['########', '#......#', '#......#', '#......#', '########'], wall: '#5a6058', floor: [70, 72, 70], props: [['table', 3.5, 2.5, 0], ['chair', 3.5, 1.8, Math.PI / 2], ['chair', 3.5, 3.3, -Math.PI / 2]], light: '#e8f0ff', amb: ['hum'], music: null, flicker: true },
  chambers: { rows: ['########', '#......#', '#......#', '#......#', '########'], wall: '#6a4a32', floor: [92, 60, 40], props: [['judgedesk', 4, 1.8, Math.PI / 2], ['bookcase', 1.6, 1.2, Math.PI / 2], ['bookcase', 6.4, 1.2, Math.PI / 2]], light: '#ffd890', amb: [], music: null },
  wire: { rows: ['########', '#......#', '#......#', '#......#', '########'], wall: '#4a5048', floor: [80, 78, 70], props: [['desk', 3, 1.8, Math.PI / 2], ['reel', 2.6, 1.7, Math.PI / 2], ['crt', 3.8, 1.7, Math.PI / 2], ['radiator', 6, 1.3, Math.PI / 2], ['chair', 3, 2.6, -Math.PI / 2]], light: '#c8ffd0', amb: ['hiss', 'hvac'], music: 'wire' },
  kitchen: { rows: ['#######', '#.....#', '#.....#', '#.....#', '#######'], wall: '#b8a27a', floor: [140, 110, 80], props: [['table', 3, 2.5, 0], ['stove', 5.2, 1.4, Math.PI / 2], ['chair', 3, 1.8, Math.PI / 2], ['chair', 3, 3.3, -Math.PI / 2]], light: '#ffc880', amb: [], music: 'gospel' },
  mamab: { rows: ['########', '#......#', '#......#', '#......#', '########'], wall: '#6a3a22', floor: [90, 60, 40], props: [['table', 3.5, 2.4, 0], ['chair', 2.6, 2.4, 0], ['chair', 4.4, 2.4, Math.PI], ['shelf', 1.5, 1.2, Math.PI / 2]], light: '#ffb060', amb: [], music: null },
  press: { rows: ['##########', '#........#', '#........#', '#........#', '##########'], wall: '#5a5a62', floor: [96, 96, 100], props: [['table', 5, 2.2, 0], ['crate', 3.6, 2.2, 0], ['barrel', 6.4, 2.2, 0]], light: '#ffffff', amb: ['street'], music: 'montage' },
  office: { rows: ['########', '#......#', '#......#', '#......#', '########'], wall: '#7a7468', floor: [110, 104, 96], props: [['desk', 4, 1.8, Math.PI / 2], ['filecab', 1.6, 1.3, 0], ['filecab', 6.4, 1.3, 0]], light: '#fff0d0', amb: ['hvac'], music: 'montage' }
};
const roomMaps = {};
const carBg = typeof E.Backdrop === 'function' ? null : null;
const Room = {
  pausable: true, view: 'brawler', views: ['brawler'], camera: false,
  enter(d) {
    this.d = d; this.kind = d.room; this.t = 0;
    if (d.room === 'car') { this.bg = this.bg || new E.Backdrop('city-night'); this.cast = []; game.setView && game.setView('side'); Music.play('field'); Amb.set(['street']); game.lights.enabled = false; }
    else {
      const R = ROOMS[d.room]; if (!roomMaps[d.room]) roomMaps[d.room] = new E.TileMap({ rows: R.rows, legend: { '#': 1, '.': { floor: 'f' } }, types: { 1: { h: 44, top: '#2a2620', side: R.wall, face: 'plaster', roof: 'plain', cut: true } }, floorTex: (x, y) => { const n = hash2(Math.floor(x), Math.floor(y)); return R.floor.map(c => c + Math.round((n - .5) * 10)); }, outside: '#0a0a0c' });
      this.map = roomMaps[d.room]; this.R = R;
      this.cast = (d.cast || []).map(([id, cx, cy, f, pose]) => { const a = new Agent({ id: id + cx, person: CAST[id] ? id : null, x: cx * T, y: cy * T, seed: 3 }); a.facing = f || 0; a.pose = pose || null; return a; });
      game.lights.enabled = true; game.lights.ambient = d.room === 'press' ? .8 : .5; if (R.music !== undefined) Music.play(R.music); Amb.set(R.amb);
      const w = R.rows[0].length; game.follow(null); this.focus = { x: w * T / 2 + (d.room === 'wire' ? w * T * .3 : 0), y: 2.6 * T };
    }
    game.weather = null; if (ui) ui.hud({});
    if (d.run) d.run(this);
  },
  exit() { game.lights.enabled = false; if (game.setView) game.setView('iso'); },
  update(dt) {
    if (Globals.tick(dt)) return; this.t += dt;
    for (const a of this.cast) a.rig.update(dt, { x: a.x, y: a.y, z: 0, vx: 0, vy: 0, facing: a.facing, pose: a.pose ? POSE[a.pose] || a.pose : null });
    if (Talk.open) { Talk.update(dt); this.cam(); return; }   // a line spoken over a screen (a call from the wire room) goes first
    if (UI.update(dt)) { this.cam(); return; }
    Talk.update(dt); this.cam();
  },
  cam() { if (this.kind === 'car') game.focus(this.t * 60, 0, 30); else game.focus(this.focus.x, this.focus.y, 18); },
  draw(r) {
    if (this.kind === 'car') {
      this.bg.draw(r);
      r.overlay(g => { const cx = Math.round(r.W / 2), cy = Math.round(r.H * .62), sway = Math.round(Math.sin(this.t * 3) * .6);
        px.rect(g, 0, cy + 24, r.W, r.H - cy - 24, '#141416'); for (let i = 0; i < 12; i++) px.rect(g, Math.round(((i * 60 - this.t * 180) % (r.W + 60) + r.W + 60) % (r.W + 60)) - 30, cy + 34, 22, 2, '#c8b040');
        px.rect(g, cx - 70, cy - 4 + sway, 140, 26, '#a8946a'); px.rect(g, cx - 50, cy - 24 + sway, 96, 22, '#a8946a'); px.rect(g, cx - 46, cy - 21 + sway, 42, 17, '#1a2030'); px.rect(g, cx, cy - 21 + sway, 42, 17, '#1a2030');
        rigOf('dana').drawPortrait(g, cx - 40, cy - 22 + sway, 26, { zoom: 1, turn: .6, bg: '#1a2030' }); rigOf('lou').drawPortrait(g, cx + 6, cy - 22 + sway, 26, { zoom: 1, turn: -.6, bg: '#1a2030' });
        for (const x of [cx - 46, cx + 44]) { px.disc(g, x, cy + 22 + sway, 9, '#141414'); px.disc(g, x, cy + 22 + sway, 4, '#6a6a6a'); }
        px.rect(g, cx + 66, cy + 2 + sway, 4, 4, '#ffe8a0'); });
    } else {
      this.map.drawFloor(r); this.map.queueWalls(r);
      for (const [id, cx, cy, f] of this.R.props) r.shape(id, cx * T, cy * T, 0, { facing: f });
      for (const a of this.cast) a.draw(r);
      const R = this.R, w = R.rows[0].length, fl = R.flicker ? (Math.sin(this.t * 37) > .93 ? .55 : 1) : 1;
      game.lights.add(w * T / 2, 2.5 * T, 40, 120, .9 * fl, { color: R.light });
      if (this.kind === 'press') for (let i = 0; i < 3; i++) if (Math.sin(this.t * 5 + i * 2) > .97) game.flash('#ffffff', .04, .3);
    }
    if (this.d.title) r.overlay(g => E.font.text(g, this.d.title, 10, 8, '#e9dcb5', { shadow: '#000', outline: false }));
    Talk.draw(r);
  }
};
