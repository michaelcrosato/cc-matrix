// 12-scenes: title, card, annex backdrop, field wrapper, montage, credits, versus setup. Globals run from every scene.
const Globals = {
  idle: 0, activity: false, lastPtr: null,
  tick(dt) {
    Devices.tick();
    if (UI.update(dt)) { /* a screen owns the input */ }
    const I = game.input; let act = I.anyPressed ? I.anyPressed() : false;
    const pa = padAxes(); if (Math.abs(pa.l[0]) > .5 || Math.abs(pa.l[1]) > .5) act = true; if (this.activity) { act = true; this.activity = false; }
    const sc = game.sceneName;
    if (Attract.active) { Attract.tick(dt); if (act && this.armed) { Attract.stop(); game.go('title'); } this.armed = true; return; }
    if (sc === 'title') { this.idle = act ? 0 : this.idle + dt; if (this.idle > 10 && !(UI.cur && UI.cur.cls !== 'menu') && !game.paused) { this.idle = 0; this.armed = false; Attract.start(); } }
    else this.idle = 0;
  }
};
if (typeof window !== 'undefined') { for (const ev of ['keydown', 'mousedown', 'wheel', 'touchstart']) window.addEventListener(ev, () => { Globals.activity = true; if (ev === 'keydown') { Devices.sawKey = true; if (Devices.touchOnly) { Devices.touchOnly = false; Scenes.title.menu(); } } }); window.addEventListener('mousemove', e => { const l = Globals.lastPtr; if (!l || Math.hypot(e.clientX - l[0], e.clientY - l[1]) > 6) { Globals.activity = true; Globals.lastPtr = [e.clientX, e.clientY]; } }); window.addEventListener('gamepadconnected', () => { Devices.padSeen = true; Devices.touchOnly = false; if (game.sceneName === 'title') Scenes.title.menu(); }); }
const withGlobals = sc => { const u = sc.update; sc.update = function (dt) { Globals.tick(dt); if (u) return u.call(this, dt); }; return sc; };
const skyDraw = (r, a, b) => r.sky([a, b]);
const Scenes = {};
Scenes.title = withGlobals({
  view: 'iso',
  enter() { game.lights.enabled = true; game.lights.ambient = .35; game.weather = { kind: 'rain', amount: .5, wind: .2 }; Sound.music('title'); this.map = this.map || makeMap(); game.cam.bounds = null; this.t = 0; Attract.stop(); Devices.detectTouchOnly(); this.menu(); },
  exit() { game.weather = null; game.lights.enabled = false; },
  menu() {
    UI.closeAll(); if (Devices.touchOnly) { UI.open({ kicker: 'WIRETAP', title: 'Controller or keyboard required', cls: 'menu touch', body: '<p>Connect a controller or keyboard to play. The demo will run in the meantime.</p>', items: [{ label: 'Settings', fn: () => game.menu('settings') }], back: false, legend: [] }); return; }
    const items = [{ label: 'The Case', sub: 'Story · 5 episodes', fn: () => { UI.closeAll(); Director.newGame(); } }];
    if (Director.hasSave()) items.push({ label: 'Continue', fn: () => { UI.closeAll(); Director.cont(); } });
    items.push({ label: 'The Game', sub: 'Corner vs Detail', fn: () => Scenes.versusSetup() }, { label: 'Settings', fn: () => game.menu('settings') }, { label: 'About & Credits', fn: () => Scenes.about() });
    UI.open({ kicker: 'Somebody\'s always listening.', title: 'WIRETAP', cls: 'menu', items, back: false, legend: [['confirm', 'Select']] });
  },
  update(dt) { this.t += dt; },
  draw(r) {
    r.sky(['#0b0c14', '#2a2030']); const m = this.map, cx = 24 * 16 + 8, cy = 16 * 16 + 8; game.focus(cx + Math.sin(this.t * .1) * 60, cy - 20, 20); m.drawFloor(r); m.queueWalls(r);
    for (const [k, x, y] of PROPS) r.prop(k, x * CELL + 8, y * CELL + 8, 0, { light: k === 'streetlamp', size: 1.3 }); for (const [x, y, c, rad] of LIGHTS) game.lights.add(x * CELL + 8, y * CELL + 8, 26, rad, .95, { color: c });
    // phone wires overhead
    r.overlay(g => { for (let i = 0; i < 3; i++) { const y = 20 + i * 5; for (let x = 0; x < r.W; x += 2) px.dot(g, x, Math.round(y + Math.sin(x * .02 + i) * 4 + x * .01), '#0a0a0c'); } });
  }
});
Scenes.card = withGlobals({
  enter(d) { this.d = d; this.t = 0; Hud.set(''); Sound.stop(); Sound.sfx('stamp'); },
  update(dt) { this.t += dt; if (this.t > 1 && (game.input.pressed('confirm') || this.t > 5.5)) { Director.next(); } },
  draw(r) { r.sky(['#000', '#000']); const d = this.d; r.overlay(g => { E.font.title(g, 'EPISODE ' + d.n, r.W / 2, r.H / 2 - 50, { scale: 2, align: 'center', colors: ['#cfcfcf', '#888'] }); E.font.title(g, d.name, r.W / 2, r.H / 2 - 24, { scale: 3, align: 'center' }); E.font.text(g, d.epi, r.W / 2, r.H / 2 + 34, '#c8c4b8', { align: 'center', wrap: r.W - 60 }); E.font.text(g, lbl('confirm') + ' to continue', r.W / 2, r.H - 20, '#777', { align: 'center' }); }); }
});
// The Annex: a walkable basement room with stations. Missions and screens launch from here.
const ANNEX_ROWS = ['####################', '#..................#', '#.B......W.....N...#', '#..................#', '#..................#', '#.........@........#', '#..................#', '#.S..............D.#', '#..................#', '####################'];
const ANNEX_STATIONS = { B: ['Board', 'the Board', () => Screens.board(() => Screens.annex())], W: ['Wire', 'Wire room desk', () => Screens.wire(() => Screens.annex())], N: ['Notebook', 'Case notebook', () => Screens.notebook()], S: ['Save', 'Save the case', () => { saveState(); Hud.toast('Saved', 'The Annex autosave'); }], D: ['Door', 'Next assignment', () => { UI.closeAll(); Director.advance(); }] };
Scenes.annex = withGlobals({
  view: 'iso',
  enter(d) {
    UI.closeAll(); this.d = d || {}; game.lights.enabled = true; game.lights.ambient = .45; Hud.set(''); Sound.music('wire'); this.t = 0;
    if (this.d.screen) { this.walk = false; const f = () => Director.next(); setTimeout(() => Screens[this.d.screen](f), 0); }
    else { this.walk = true; this.map = new E.TileMap({ rows: ANNEX_ROWS, legend: { '#': 1, '.': { floor: 'tile' }, B: { floor: 'tile', spawn: 'B' }, W: { floor: 'tile', spawn: 'W' }, N: { floor: 'tile', spawn: 'N' }, S: { floor: 'tile', spawn: 'S' }, D: { floor: 'tile', spawn: 'D' }, '@': { floor: 'tile', spawn: 'me' } }, types: { 1: { h: 40, top: '#3a3a40', side: '#57555a', face: 'plaster', roof: 'plain', cut: true } }, floorTex: (x, y) => { const k = ((x >> 4) + (y >> 4)) & 1; return k ? [88, 88, 84] : [74, 74, 72]; }, outside: '#08080c' });
      const st = this.map.find('me'); this.me = new Person({ kind: 'sub', role: 'dana', x: st.x, y: st.y, rig: CAST.dana.rig }); this.near = null; game.cam.bounds = v => this.map.bounds(v); }
  },
  exit() { game.lights.enabled = false; UI.closeAll(); Hud.set(''); },
  update(dt) {
    this.t += dt; if (!this.walk || UI.isOpen) return; const I = game.input, M = this.me, mv = I.move(), g = game.view.screenDirToGround(mv[0], mv[1]), mag = Math.min(1, Math.hypot(g[0], g[1]));
    M.body.vx = g[0] * SPEED.walk * 1.2 * mag; M.body.vy = g[1] * SPEED.walk * 1.2 * mag; if (mag > .1) M.facing = Math.atan2(g[1], g[0]); M.body.update(dt, this.map); M.poseRig(dt); game.focus(M.x, M.y, 10);
    this.near = null; let bd = 26; for (const k in ANNEX_STATIONS) { const p = this.map.find(k); if (p && Math.hypot(p.x - M.x, p.y - M.y) < bd) { bd = Math.hypot(p.x - M.x, p.y - M.y); this.near = k; } }
    if (this.near && I.pressed('interact')) ANNEX_STATIONS[this.near][2]();
    if (I.pressed('notebook')) Screens.notebook(); if (I.pressed('rotL')) game.rotateView(-90); if (I.pressed('rotR')) game.rotateView(90);
    Hud.set(`<div class="hud"><div class="obj"><span class="k">THE ANNEX</span><b>${esc(Director.nextLabel())}</b><span>Walk to the door when you are ready.</span></div><div class="cnt"><span>Brass <b>${Math.round(STATE.brass)}</b></span><span>Heat <b>${Math.round(STATE.heat)}</b></span><span>Legal <b>${Math.round(STATE.legal)}</b></span><span>Case <b>${Math.round(STATE.caseScore)}</b></span></div>${this.near ? `<div class="pr">${glyph('interact')} ${esc(ANNEX_STATIONS[this.near][1])}</div>` : ''}</div>`);
  },
  draw(r) {
    if (!this.walk) { r.sky(['#08090e', '#171a24']); game.focus(100, 100, 12); r.overlay(g => px.rect(g, 0, 0, r.W, r.H, 'rgba(10,10,16,.8)')); return; }
    const m = this.map; r.sky(['#08090e', '#171a24']); m.drawFloor(r); m.queueWalls(r);
    const col = { B: '#c8a050', W: '#60a0e0', N: '#d8d4c8', S: '#80d890', D: '#ffb347' };
    for (const k in ANNEX_STATIONS) { const p = m.find(k); if (!p) continue; r.queue(p.x, p.y, 0, g => r.box(g, p.x - 8, p.y - 6, 0, p.x + 8, p.y + 6, k === 'D' ? 26 : 10, col[k], '#3a3a40')); game.lights.add(p.x, p.y, 20, 46, .8, { color: col[k] }); r.queue(p.x, p.y, 34, g => { const [sx, sy] = r.w(p.x, p.y, 34); E.font.text(g, ANNEX_STATIONS[k][0], sx, sy, '#ffe8b0', { align: 'center', outline: true }); }, { emissive: true }); }
    const M = this.me; r.shadow(M.x, M.y, 6, .35); r.actor(M.x, M.y, M.body.z, (g, ox, oy) => M.rig.draw(g, ox, oy, r.view));
  }
});
const fieldScene = { view: 'iso', pausable: true, enter(d) { Field.enter(d); }, exit() { Field.exit(); }, update(dt) { Field.update(dt); }, draw(r) { Field.draw(r); } };
Scenes.field = withGlobals(fieldScene);
Scenes.montage = withGlobals({
  enter(e) { this.e = e; Hud.set(''); Sound.music('sad'); const s = STATE;
    UI.open({ kicker: 'Epilogue', title: e.title, cls: 'montage', body: `<p>${esc(e.text)}</p><p>Case ${Math.round(s.caseScore)} · Legal ${Math.round(s.legal)} · Brass ${Math.round(s.brass)} · Tee made ${money(s.corner.cash)} on the corner.</p><p class="q">"Somebody's always listening."</p>`, items: [{ label: 'Credits', fn: () => { UI.closeAll(); game.go('credits'); } }], back: false }); },
  draw(r) { r.sky(['#000', '#101018']); }
});
Scenes.credits = withGlobals({
  enter() { this.t = 0; Sound.music('title'); }, update(dt) { this.t += dt; if ((this.t > 2 && game.input.pressed('confirm')) || this.t > 40) game.go('title'); },
  draw(r) { r.sky(['#000', '#000']); const lines = ['WIRETAP', '', 'An original game inspired by The Wire (HBO, 2002-2008).', 'Not affiliated with HBO or the show\'s creators.', '', 'Built by Anthropic claude-sonnet-5-5 (medium)', 'from a plan by claude-opus-5-5 (max)', '', 'Engine: my-3D2dge v' + E.version + ' by Michael Crosato', 'Multiplayer: AI Hub Session Protocol v1', '', 'Music, effects and voices are synthesized in code.', '', 'Somebody\'s always listening.']; r.overlay(g => lines.forEach((l, i) => E.font.text(g, l, r.W / 2, r.H - this.t * 14 + i * 14, i === 0 ? '#ffb347' : '#d8d4c8', { align: 'center' }))); }
});
Scenes.about = function () {
  const I = CREDITS.exitInterview, QS = { t: ['How many issues did testing catch?', 'How many were critical?', 'Most helpful test?', 'Least helpful test?'], e: ['Liked most about the engine?', 'Stuck or guessed wrong?', 'Most important thing built yourself?', 'Hardest part of the engine?', 'Remove or overhaul one thing?', 'Change one thing?'], p: ['Liked most about the prompt?', 'Confusing?', 'Hardest thing to do?', 'One test you could have run?'] };
  const si = I.sourceInformation, pages = [['Credits', () => CREDITS.credits.map(l => `<p>${esc(l)}</p>`).join('')], ['Source', () => Object.keys(si).map(k => `<p><b>${esc(k)}</b>: ${esc(si[k])}</p>`).join('')], ['Testing', () => I.testingFeedback.map((a, i) => `<p><b>${QS.t[i]}</b><br>${esc(a)}</p>`).join('')], ['Engine', () => I.engineFeedback.map((a, i) => `<p><b>${QS.e[i]}</b><br>${esc(a)}</p>`).join('')], ['Prompt', () => I.promptFeedback.map((a, i) => `<p><b>${QS.p[i]}</b><br>${esc(a)}</p>`).join('')]];
  UI.open({ kicker: 'WIRETAP', title: 'About & Credits', cls: 'about', tab: 0, tabs: pages.map(p => p[0]), body: s => pages[s.tab][1](), items: [{ label: 'Back', fn: () => UI.close() }], legend: [['tabPrev', 'Prev page'], ['tabNext', 'Next page'], ['move', 'Scroll'], ['cancel', 'Back']], onKey: (a, s) => { if (a === 'tabNext') { s.tab = (s.tab + 1) % pages.length; UI.render(); return true; } if (a === 'tabPrev') { s.tab = (s.tab + pages.length - 1) % pages.length; UI.render(); return true; } if (a === 'up' || a === 'down') { const bd = document.querySelector('.about .body'); if (bd) bd.scrollTop += (a === 'down' ? 1 : -1) * 90; return true; } return false; } });
};
Scenes.versusSetup = function () {
  UI.open({ kicker: 'The Game', title: 'Corner vs Detail', cls: 'menu', body: '<p>Pick a side. Five-minute rounds online; two minutes against bots, or two humans on one keyboard.</p>', items: [{ label: 'Detective', sub: 'Photograph deals, don\'t get made', fn: () => { UI.closeAll(); game.go('field', { mission: 'vs', seconds: 120 }); } }, { label: 'Two players', sub: 'Local split screen: Detective vs Corner', fn: () => { UI.closeAll(); game.go('field', { mission: 'vs2', seconds: 120 }); } }, { label: 'Corner', sub: 'Serve buyers, call out cops', fn: () => { UI.closeAll(); game.go('field', { mission: 'tee1' }); } }, { label: 'Back', fn: () => UI.close() }], legend: [['confirm', 'Select'], ['cancel', 'Back']] });
};
