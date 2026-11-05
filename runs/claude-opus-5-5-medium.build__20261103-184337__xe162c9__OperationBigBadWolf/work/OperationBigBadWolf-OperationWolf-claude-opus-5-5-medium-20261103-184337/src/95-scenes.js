// The scene table and the flow (6.4): title <-> attract -> squad -> briefing -> map -> play (op card, the op, the
// tally) -> cutscenes -> ... -> ending -> credits -> initials -> title; continue; about; range. The radio.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, T = WP.T, UI = WP.UI, txt = (...a) => UI.txt(...a), F = E.font;
const game = () => WP.game, I0 = () => WP.game.input;
// ---------------------------------------------------------------------------------------------- the radio: non-modal lines with portraits and gibberish voices
const Radio = WP.Radio = { q: [], talk: null, cut: null, last: null, log: [] };
Radio.init = g => { Radio.talk = new E.Dialog(g, { speed: 60 }); Radio.cut = new E.Dialog(g, { speed: 40 }); };
Radio.line = (key, vars) => { const L = WP.TEXT[key]; if (!L) return null; return { who: L.who, text: WP.fill(L.text, WP.Players.input(0), vars || {}) }; };
Radio.say = (key, vars) => { const l = Radio.line(key, vars); if (!l) return; if (Radio.q.length > 2) Radio.q.shift(); Radio.q.push(l); Radio.log.push(l.text); if (Radio.log.length > 40) Radio.log.shift(); };
Radio.portrait = who => (g, x, y, size) => WP.HUD.portrait((WP.SPEAKERS[who] || WP.SPEAKERS.DEN).rig, g, x, y, size);
Radio.update = dt => {
  const t = Radio.talk; if (!t) return;
  if (!t.open && Radio.q.length) { const l = Radio.q.shift(), sp = WP.SPEAKERS[l.who] || WP.SPEAKERS.DEN; Radio.last = l; t.voice = WP.Audio.voiceFn(sp.voice, l.text); t.say(l.text, { name: sp.name, portrait: Radio.portrait(l.who), portraitSize: 28, auto: 2.2, modal: false, place: 'top', y: 26, alpha: .85 }); if (l.who === 'KRAGG') WP.Audio.cackle(); if (l.text === 'AWOOOO!') WP.Audio.howl(); }
  t.update(dt);
  const a = game().audio; if (a && a.duck) a.duck(!!t.open);
};
Radio.clear = () => { Radio.q.length = 0; if (Radio.talk && Radio.talk.open) Radio.talk.open = false; };
Radio.draw = r => { if (Radio.talk && Radio.talk.open) Radio.talk.draw(r); };
// tips: each once per save
WP.tipSeen = k => { const s = E.store.get('wp:tips', null) || {}; if (s[k]) return true; s[k] = 1; E.store.set('wp:tips', s); return false; };
// ---------------------------------------------------------------------------------------------- the run's players between ops
WP.carry = sim => { WP.run.players = sim.players.map(p => ({ pid: p.pid, score: p.score, mag: p.mag, spares: p.spares.slice(), grenades: p.grenades, damage: p.damage, down: p.down, stats: p.stats })); };
const startPlayers = () => {
  const n = (game().players || [game().input]).length, prev = WP.run.players || [];
  const out = []; for (let i = 0; i < n; i++) { const q = prev[i]; if (!q) { out.push({}); continue; } out.push({ score: q.score, mag: q.mag, spares: q.spares, grenades: q.grenades, damage: q.down ? 50 : q.damage }); }
  return out;
};
// ---------------------------------------------------------------------------------------------- presentation of a world's events (FX, sound, radio, markers)
const Pres = WP.Pres = {};
Pres.events = (world, evs, o = {}) => {
  const R = WP.Render, g = game(), local = o.local;
  for (const ev of evs) {
    WP.Audio.onEvent(ev, world, local);
    const k = ev.k;
    if (k === 'shot') {
      const p = world.players.find(q => q.pid === ev.pid); const seat = p ? p.seat : 0;
      const m = R.muzzle && R.muzzle[seat] ? R.muzzle[seat] : [WP.W * .62, WP.PLAY_H];
      R.tracers.push({ x0: m[0], y0: m[1], x1: ev.x, y1: ev.y, life: 1 / 30, fury: ev.fury }); R.recoil[seat] = 1; R.flashP = R.flashP || []; R.flashP[seat] = .04; g.after(.04, () => { R.flashP[seat] = 0; });
      if (!(R.casings.length > 40)) R.casings.push({ x: m[0] + 6, y: m[1] + 30, vx: 60 + WP.fxr() * 60, vy: -120 - WP.fxr() * 60, life: 1.2 });
      if (ev.id) { const e = world.get(ev.id); const mat = ev.mat || (e && (e.kind === 'vehicle' || e.kind === 'boss' ? 'metal' : e.kind === 'prop' ? (e.T.mat || 'wood') : e.kind === 'infantry' ? 'flesh' : 'dirt')); if (ev.wx !== undefined) R.impact(mat, ev.wx, ev.wy, ev.wz); if (e && WP.hostile(e) || (e && e.dead && e.kind === 'infantry')) R.hitm.push({ x: ev.x, y: ev.y, head: ev.part === 'head', life: .25 }); }
      else if (ev.fx !== undefined) R.impact(ev.mat, ev.fx, ev.fy, 0);
    } else if (k === 'explode') { R.explosion(ev.x, ev.y, ev.z, ev.r, ev.big); g.shake(ev.big ? 6 : 3); g.flash('#fff0c0', .08, ev.big ? .8 : .4); if (!o.noFreeze) g.freeze(.04); }
    else if (k === 'throw') { const p = world.players.find(q => q.pid === ev.pid); R.throwAnim[p ? p.seat : 0] = .4; }
    else if (k === 'score') R.floats.push({ x: ev.x, y: ev.y, z: ev.z, text: String(ev.v), life: .9 });
    else if (k === 'damage') { if (local === undefined || ev.pid === local) { R.arcs.push({ side: ev.side, life: .6, pid: ev.pid }); g.shake(2); } }
    else if (k === 'friendly') { Pres.banner(ev.kind === 'hostage' ? WP.TEXT.hud.hostageHit : WP.TEXT.hud.civ, '#ff4040'); if (!o.noTips) Radio.say(ev.kind === 'hostage' ? 'hostage.grab' : 'tip.civ'); }
    else if (k === 'pickup') { R.floats.push({ x: ev.x, y: ev.y, z: ev.z + 10, text: WP.PICK_NAME[ev.pk] || '', life: 1.1, color: '#a0ff90' }); if (ev.pk === 'fury') WP.Audio.sting && WP.Audio.S.fanfare(); }
    else if (k === 'intercept') { R.floats.push({ x: ev.x, y: ev.y, z: ev.z, text: WP.TEXT.hud.intercept, life: .8, color: '#80e0ff' }); R.add('flash', ev.x, ev.y, ev.z, 0, 0, 0, .1, 8); for (let i = 0; i < 6; i++) { const a = i; R.add('spark', ev.x, ev.y, ev.z, Math.cos(a) * 60, Math.sin(a) * 60, 40, .3, 1, '#ffe080', 200); } }
    else if (k === 'radio') { if (!o.noRadio) Radio.say(ev.key, ev.vars); }
    else if (k === 'tip') { if (!o.noTips && !WP.tipSeen(ev.key)) Radio.say(ev.key); }
    else if (k === 'boss') { Pres.banner(WP.TEXT.hud.warning, '#ff4040', ev.name); }
    else if (k === 'bossdown') { g.timeScale = .3; g.after(.15, () => { g.timeScale = WP.T.timeScale; }); g.flash('#ffffff', .3, 1); g.shake(8); }
    else if (k === 'mult' && ev.m >= 4) Pres.banner(WP.TEXT.hud.packFury, '#ffe060');
    else if (k === 'chain') { Pres.banner(WP.TEXT.hud.chain, '#ffb040'); }
    else if (k === 'bridge') Pres.banner(WP.TEXT.hud.bridgeOut, '#ffe060');
    else if (k === 'cell') { world.cellsOpen = world.cellsOpen || []; world.cellsOpen[ev.idx] = true; }
    else if (k === 'cut') { g.flash('#000000', .4, 1); Pres.banner(WP.TEXT['op6.board'].text, '#ffe060'); }
    else if (k === 'spotted') g.flash('#ffffff', .1, .5);
    else if (k === 'mast') { if (world.objective && world.objective.have >= world.objective.need) Radio.say('clear.1'); }
    else if (k === 'kill' && ev.how === 'blast') { const e = world.get(ev.id); if (e) e.blastZ = 0; }
    else if (k === 'down' && (local === undefined || ev.pid === local)) g.flash('#ff2020', .3, .6);
    else if (k === 'dynamite') { g.flash('#ffffff', .25, 1); g.shake(10); for (let i = 0; i < 8; i++) { const w = WP.camToWorld(world.cam, (i - 4) * 60, 120 + (i % 3) * 80); R.explosion(w[0], w[1], 10, 40, false); } }
    else if (k === 'rescued') Radio.say('hostage.board');
  }
};
Pres.banner = (text, color, sub) => { WP.Play.banner = { text, color, sub, t: 2.2 }; };
// ---------------------------------------------------------------------------------------------- the play scene
const Play = WP.Play = { sim: null, scene: null, banner: null };
const PLAY = {
  pausable: true,
  enter(d = {}) {
    Play.data = d; Play.scene = PLAY; Play.attract = !!d.attract; Play.range = !!d.range; Play.intro = d.attract || d.jump || d.range || d.session ? 0 : 3.4; Play.go = 0; Play.banner = null; Play.endT = 0; Play.deathT = 0;
    WP.Render.fx.length = 0; Radio.clear();
    const op = d.range ? 1 : d.op || 1, g = game();
    if (!d.attract && !d.range && !d.session) { if (d.restart && WP.run.opStart) { WP.run.players = JSON.parse(JSON.stringify(WP.run.opStart)).map((p, i) => Object.assign(p, { damage: 0, down: false, score: (WP.run.players && WP.run.players[i] ? WP.run.players[i].score : p.score), spares: (p.spares || []).length >= 3 ? p.spares : [30, 30, 30], grenades: Math.max(3, p.grenades || 0) })); } WP.run.opStart = JSON.parse(JSON.stringify(WP.run.players || [])); }
    const players = d.attract ? [{ name: 'LOBO' }] : d.players || startPlayers();
    const hostages = op === 6 ? (WP.run.hostagesFreed === null || WP.run.hostagesFreed === undefined ? 5 : WP.run.hostagesFreed) : 5;
    Play.sim = new WP.Sim({ op, players, seed: d.seed !== undefined ? d.seed : (E.store.get('wp:seed', 1) + op * 101 + WP.run.continues * 977 + WP.run.loop * 31) >>> 0, attract: d.attract, session: d.session, hostages, perks: d.attract || d.session || WP.run.mission ? {} : WP.run.perks });
    if (d.range) WP.setupRange(Play.sim);
    if (d.jump !== undefined) WP.jumpTo(Play.sim, d.jump);
    WP.Audio.music(Play.sim.stage.music, { force: true });
    if (typeof document !== 'undefined' && g.canvas) g.canvas.style.cursor = 'none';
    if (!d.attract && !d.session) g.allowJoin({ max: 4, onJoin: (inp, n) => Play.join(n - 1) });
    Play.idle = 0;
    if (WP.openDevSoon) { WP.openDevSoon = false; g.after(.3, () => { g.menu(); WP.Dev.open(); }); }
  },
  exit() { if (typeof document !== 'undefined' && game().canvas) game().canvas.style.cursor = ''; Radio.clear(); },
  update(dt, stepping) {
    const g = game(), sim = Play.sim; if (!sim) return;
    g.timeScale = Play.attract ? 1 : WP.T.timeScale;
    Radio.update(dt); if (Play.banner && (Play.banner.t -= dt) <= 0) Play.banner = null;
    if (WP.HUD.tipT > 0) WP.HUD.tipT -= dt;
    // attract: any input goes back to the title; the playlist moves on
    if (Play.attract) {
      if (WP.anyInput()) { g.go('title', { woke: true }); return; }
      Play.segT -= dt; if (Play.segT <= 0 || sim.done) { WP.Attract.next(); return; }
    }
    if (Play.intro > 0) { Play.intro -= dt; if (Play.intro <= 0) { Play.go = .9; } WP.Render.update(sim, dt); return; }
    if (Play.go > 0) Play.go -= dt;
    const frames = sim.players.map((p, i) => Play.attract ? WP.Bot.frame(sim, i, dt, { fair: false }) : WP.Players.frame(i, sim, dt));
    sim.step(dt, frames);
    Pres.events(sim, sim.events, { noTips: Play.attract || Play.range, noRadio: Play.range });
    WP.Render.update(sim, dt); WP.Audio.loops(sim, dt, 0);
    if (Play.range) WP.rangeStep(sim, dt);
    if (sim.done === 'clear' && !Play.attract && !Play.range) { WP.carry(sim); g.go('tally', { op: sim.opn, sim }); }
    else if (sim.done === 'fail' && !Play.attract) { WP.carry(sim); g.go('continue', { op: sim.opn }); }
  },
  draw(r) {
    const sim = Play.sim; if (!sim) return;
    const allDown = sim.players.every(p => p.down);
    if (allDown) { Play.deathT = Math.min(1, Play.deathT + 1 / 60); sim.cam = Object.assign({}, sim.cam, { h: WP.lerp(sim.cam.h, 8, Play.deathT), pitch: WP.lerp(sim.cam.pitch, -10, Play.deathT) }); }
    WP.Render.draw(r, sim);
    r.overlay(g => {
      WP.Render.screenFx(g, sim);
      WP.Render.overlays(g, sim);
      WP.Dev.drawOverlay(g, sim);
      if (allDown) px.blend(g, .4 * Play.deathT, 'normal', () => px.rect(g, 0, 0, WP.W, WP.PLAY_H, '#801010'));
      const showGun = game().settings.showGun !== false;
      if (showGun) sim.players.forEach((p, i) => WP.Render.drawGun(g, p, i, sim.players.length > 1));
      WP.Render.drawCasings(g);
      WP.HUD.draw(g, sim, { hi: WP.hiScore(), joinHint: !Play.attract && sim.players.length === 1 && WP.freePad() ? String(I0().label('start', 'gamepad')).toUpperCase() : null, attract: Play.attract, dev: WP.Dev.changed().length > 0 || Object.values(WP.CHEATS).some(Boolean) });
      if (!(Play.intro > 0)) sim.players.forEach(p => WP.HUD.crosshair(g, sim, p, { num: sim.players.length > 1 }));
      if (Play.intro > 0) WP.drawOpCard(g, sim, Play.intro);
      if (Play.go > 0) txt(g, WP.TEXT.hud.go, WP.W / 2, 90, '#ffe060', { align: 'center', scale: 5 });
      const b = Play.banner; if (b) { const on = (WP.Render.t * 5 % 1) < .7; if (on) txt(g, b.text, WP.W / 2, 70, b.color, { align: 'center', scale: 3 }); if (b.sub) txt(g, b.sub, WP.W / 2, 96, '#ffe0c0', { align: 'center', scale: 2 }); }
      if (Play.range) WP.rangeDraw(g, sim);
    });
    Radio.draw(r);
  }
};
Play.join = seat => { const s = Play.sim; if (!s || s.players[seat]) return; while (s.players.length < seat) s.players.push(s.newPlayer({}, s.players.length, seat + 1)); s.players.push(s.newPlayer({}, seat, seat + 1)); s.coop = 1 + .3 * (s.players.length - 1); WP.Audio.S.menuPick(); Pres.banner('WOLF ' + (seat + 1) + ' JOINS!', WP.SEAT[seat]); };
WP.freePad = () => { const g = game(); if (typeof navigator === 'undefined' || !navigator.getGamepads) return false; const pads = [...(navigator.getGamepads() || [])].filter(Boolean); const used = (g.players || []).map(p => p.padIndex).filter(v => v !== null && v !== undefined); return pads.some(p => !used.includes(p.index)) && (g.players || []).length < 4; };
WP.hiScore = () => { const t = WP.cab ? WP.cab.table('campaign') : []; return t && t[0] ? t[0].score : 50000; };
// jump to a beat, the boss or part B (dev mode, deep links, attract)
WP.jumpTo = (sim, at) => {
  if (at === 'B' && sim.stage.partB) { for (const h of sim.holds) h.state = 'done'; for (const b of sim.beats) { b.fired = true; b.done = true; } for (const k in sim.q) sim.q[k] = 0; sim.d = sim.rail.end; sim.startPartB(); return; }
  let d = 0;
  if (at === 'boss') d = sim.rail.end; else if (typeof at === 'number') d = at; else { const b = sim.beats.find(x => x.id === at); d = b ? b.at || 0 : 0; }
  for (const b of sim.beats) if ((b.at || 0) < d) { b.fired = true; b.done = true; }
  for (const h of sim.holds) if (h.d < d || (at !== 'boss' && h.d === d && false)) h.state = 'done';
  sim.d = Math.min(d, sim.rail.end);
  if (at === 'boss') { for (const k in sim.q) sim.q[k] = 0; if (sim.stage.partB) WP.jumpTo(sim, 'B'); }
  sim.cam = sim.camNow(); sim.view.begin(sim.cam);
};
WP.drawOpCard = (g, sim, t) => {
  const st = sim.stage, n = st.n, [name, obj] = WP.TEXT.ops[n - 1], a = Math.min(1, (3.4 - t) * 3);
  px.blend(g, .75 * a, 'normal', () => px.rect(g, 0, 60, WP.W, 120, '#0b0c08'));
  px.rect(g, 0, 60, WP.W, 2, '#e0b040'); px.rect(g, 0, 178, WP.W, 2, '#e0b040');
  const slide = Math.max(0, (1 - a) * 200);
  txt(g, 'OPERATION ' + n, WP.W / 2 - slide, 68, '#c8b070', { align: 'center', scale: 2 });
  F.title(g, name, WP.W / 2 + slide, 86, { scale: 3, colors: ['#fff0b0', '#e0b040', '#8a6a2a'], outline: '#0b0c08', depth: 2, depthColor: '#3a2a10', align: 'center' });
  txt(g, obj, WP.W / 2, 120, '#f2ead3', { align: 'center' });
  const icons = { soldier: 'icoSoldier', vehicle: 'icoJeep', air: 'icoHeli', boat: 'icoBoat' }; let x = WP.W / 2 - Object.keys(sim.quotaMax).length * 25;
  for (const k of Object.keys(sim.quotaMax)) { px.sprite(g, WP.SPR[icons[k]], x, 140); txt(g, 'x' + sim.quotaMax[k], x + 10, 139, '#f2ead3', { scale: 2 }); x += 50; }
  if (t < 1.4 && (WP.Render.t * 4 % 1) < .7) txt(g, WP.TEXT.hud.ready, WP.W / 2, 160, '#ffe060', { align: 'center', scale: 2 });
};
// ---------------------------------------------------------------------------------------------- the range (dev): target practice with a time-to-target readout
WP.setupRange = sim => { sim.range = { times: [], spawnT: 0, cur: null }; for (const b of sim.beats) { b.fired = true; b.done = true; } for (const h of sim.holds) h.state = 'done'; sim.holds = [{ d: 300, until: 'never', state: 'on', t: 0 }]; sim.d = 300; sim.ents = sim.ents.filter(e => e.kind === 'prop'); sim.byId = new Map(sim.ents.map(e => [e.id, e])); WP.CHEATS.holdFire = false; };
WP.BEHAV.dummy = (sim, e) => { e.facing = sim.cam.angle + Math.PI; e.pose = 'stand'; };
WP.rangeStep = (sim, dt) => {
  const R = sim.range; R.spawnT -= dt;
  if (!sim.ents.some(e => e.o && e.o.rangeT && !e.dead)) {
    if (R.cur) { R.times.push(sim.t - R.cur); if (R.times.length > 8) R.times.shift(); R.cur = null; }
    if (R.spawnT <= 0) { const k = sim.R.ai(); const dz = [60, 150, 300, 600][Math.floor(k * 4)]; sim.spawn('rifleman', { lx: (sim.R.ai() - .5) * sim.hw(dz) * 1.4, dz, path: 'dummy', rangeT: true }); R.cur = sim.t; R.spawnT = .6; }
  }
  if (!sim.ents.some(e => e.type === 'rifleman' && e.beh === 'sprint' && !e.dead)) sim.spawn('rifleman', { side: 'L', dz: 220, path: 'sprint' });
  if (!sim.ents.some(e => e.type === 'grenadier' && !e.dead)) sim.spawn('grenadier', { lx: 80, dz: 160, path: 'popup', stay: true });
  if (!sim.ents.some(e => e.kind === 'civilian' && !e.dead)) sim.spawn('villager', { side: 'R', dz: 120 });
  for (const p of sim.players) { p.damage = Math.min(p.damage, 60); if (p.spares.length < 3) p.spares.push(T.magSize); }
};
WP.rangeDraw = (g, sim) => { const t = sim.range.times, avg = t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0; txt(g, 'RANGE  TIME TO TARGET ' + (avg ? avg.toFixed(2) + ' S' : '-') + '  LAST ' + (t.length ? t[t.length - 1].toFixed(2) : '-'), 6, 26, '#80ff80'); };
// ---------------------------------------------------------------------------------------------- the attract mode
const Attract = WP.Attract = { i: 0 };
Attract.start = () => { Attract.i = 0; Attract.go(); };
Attract.go = () => { const [op, at, secs] = WP.ATTRACT[Attract.i]; game().go('play', { attract: true, op, jump: at, seed: 1000 + Attract.i }); Play.segT = secs; };
Attract.next = () => { Attract.i++; if (Attract.i >= WP.ATTRACT.length) { game().go('scores', { attract: true }); return; } Attract.go(); };
// any input at all (keys, buttons, a mouse move or click, a stick) — taps don't count on a touch-only device
WP.anyInput = () => {
  const g = game(), I = g.input; if (WP.touchOnly && WP.touchOnly()) return false;
  if (I.anyPressed && I.anyPressed()) return true;
  const H = I.held; if (H && (H.size || Object.keys(H).length)) return true;
  const p = I.pointer ? I.pointer() : null; if (p && (!WP._ptr || p[0] !== WP._ptr[0] || p[1] !== WP._ptr[1])) { const moved = !!WP._ptr; WP._ptr = p.slice(); if (moved) return true; }
  const m = I.padMove || [0, 0]; if (Math.hypot(m[0], m[1]) > .3) return true;
  return false;
};
// ---------------------------------------------------------------------------------------------- scenes
const S = WP.SCENES = { play: PLAY };
S.title = {
  enter(d = {}) {
    if (WP.deepLink) { const [f, dd] = WP.deepLink; WP.deepLink = null; game().go(f, dd); if (dd.openDev) WP.openDevSoon = true; return; }
    WP.Audio.music('title'); this.idle = 0; this.sub = null; WP._ptr = null; game().allowJoin({ max: 4, onJoin: () => WP.Audio.S.menuPick() });
    const cleared = (E.store.get('wp:cleared', 0) || 0) > 0;
    this.menu = new UI.Menu([
      { label: () => WP.TEXT.menu.start, fn: () => this.diffMenu() },
      { label: () => WP.TEXT.menu.squad, fn: () => game().go('squad') },
      { label: () => WP.TEXT.menu.select, fn: () => { WP.run = WP.newRun({ diff: game().settings.difficulty, mission: true }); game().go('map', { select: true }); }, hidden: !cleared },
      { label: () => WP.TEXT.menu.scores, fn: () => game().go('scores') },
      { label: () => WP.TEXT.menu.settings, fn: () => game().menu('settings') },
      { label: () => WP.TEXT.menu.about, fn: () => game().go('about') }
    ], { y: 136, gap: 17 });
  },
  diffMenu() {
    const S2 = game().settings, opts = ['recruit', 'veteran', 'arcade'];
    this.sub = new UI.Menu(opts.map(k => ({ label: WP.DIFF[k].name, fn: () => { S2.set('difficulty', k); WP.newGame(k); } })).concat([{ label: 'BACK', fn: () => { this.sub = null; } }]), { y: 140, gap: 17, i: Math.max(0, opts.indexOf(S2.difficulty)), onCancel: () => { this.sub = null; } });
  },
  update(dt) {
    const I = I0(); if (!this.menu) return;
    if (WP.anyInput()) this.idle = 0; else this.idle += dt;
    if (this.idle > 10) { Attract.start(); return; }
    if (WP.touchOnly && WP.touchOnly()) { const c = I.clicked ? I.clicked() : null; if (c && WP.inRect(c, [WP.W / 2 - 60, 200, WP.W / 2 + 60, 224])) game().menu('settings'); return; }
    (this.sub || this.menu).update(I);
  },
  draw(r) {
    if (!this.menu) return;
    r.overlay(g => {
      UI.titleArt(g, WP.Render.t += 1 / 60);
      UI.logo(g, 40);
      txt(g, WP.TEXT.tagline, WP.W / 2, 112, '#c8b890', { align: 'center' });
      if (WP.touchOnly && WP.touchOnly()) {
        E.ui.box(g, 60, 140, WP.W - 120, 90, { bg: ['#2a1a14', '#140a08'], alpha: .92 });
        txt(g, WP.TEXT.touch[0], WP.W / 2, 152, '#ff8060', { align: 'center', scale: 2 }); txt(g, WP.TEXT.touch[1], WP.W / 2, 176, '#f2ead3', { align: 'center' });
        px.rect(g, WP.W / 2 - 60, 200, 120, 24, '#e0b040'); txt(g, 'SETTINGS', WP.W / 2, 206, '#0b0c08', { align: 'center', scale: 2, outline: false });
      } else {
        (this.sub || this.menu).draw(g);
        UI.footer(g, I0(), [['confirm', 'SELECT'], ['cancel', 'BACK']]);
        if ((WP.Render.t * 2 % 1) < .7 && !this.sub) txt(g, 'PRESS ' + String(I0().label('start')).toUpperCase(), WP.W / 2, 245, '#ffe060', { align: 'center' });
      }
      txt(g, 'v' + WP.VERSION + '  ' + (E.versionLabel ? E.versionLabel() : ''), 4, WP.H - 10, '#6a6a5a', { font: 'tiny' });
      const n = (game().players || []).length; if (n > 1) txt(g, n + ' WOLVES READY', 4, 4, '#80e080');
    });
  }
};
S.squad = {
  enter() { game().allowJoin({ max: 4, onJoin: () => WP.Audio.S.menuPick() }); this.menu = new UI.Menu([{ label: 'START MISSION', fn: () => S.title.diffMenu.call(this) }, { label: 'BACK', fn: () => game().go('title') }], { y: 214, gap: 17, onCancel: () => game().go('title') }); this.sub = null; },
  update(dt) { (this.sub || this.menu).update(I0()); },
  draw(r) {
    r.overlay(g => {
      UI.titleArt(g, WP.Render.t += 1 / 60); px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, WP.W, WP.H, '#0b0c08'));
      txt(g, 'THE PACK', WP.W / 2, 14, '#e0b040', { align: 'center', scale: 3 });
      const ps = game().players || [game().input];
      for (let i = 0; i < 4; i++) {
        const x = 24 + i * 112, y = 50, on = i < ps.length;
        E.ui.box(g, x, y, 100, 140, { bg: on ? ['#2a3a1c', '#141c0c'] : ['#1a1a14', '#0e0e0a'], alpha: .95 });
        if (on) { WP.HUD.portrait(['lobo', 'fang', 'tundra', 'moonshine'][i], g, x + 26, y + 10, 48); txt(g, 'WOLF ' + (i + 1), x + 50, y + 66, WP.SEAT[i], { align: 'center', scale: 2 }); txt(g, WP.SEAT_NAMES[i], x + 50, y + 86, '#f2ead3', { align: 'center' }); txt(g, ps[i].device === 'gamepad' || (i === 0 && ps[i].padId) ? 'CONTROLLER' : 'KEYS + MOUSE', x + 50, y + 104, '#a0a090', { align: 'center', font: 'tiny' }); }
        else { txt(g, 'OPEN', x + 50, y + 50, '#5a5a4a', { align: 'center', scale: 2 }); txt(g, 'PRESS ' + String(I0().label('start', 'gamepad')).toUpperCase(), x + 50, y + 80, '#8a8a6a', { align: 'center' }); txt(g, 'ON A FREE', x + 50, y + 92, '#8a8a6a', { align: 'center', font: 'tiny' }); txt(g, 'CONTROLLER', x + 50, y + 100, '#8a8a6a', { align: 'center', font: 'tiny' }); }
      }
      (this.sub || this.menu).draw(g); UI.footer(g, I0(), [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
S.squad.diffMenu = S.title.diffMenu;
WP.newGame = diff => { WP.run = WP.newRun({ diff }); WP.run.players = null; game().go('cutscene', { id: 'briefing', next: 'map' }); };
// ---------------------------------------------------------------------------------------------- cutscenes: briefing, interrogation, Kennel aftermath (scripts; hold confirm to skip)
S.cutscene = {
  enter(d) {
    this.d = d; this.t = 0; this.card = null; this.hold = 0; this.done = false; Radio.clear(); const g = game(), C = Radio.cut, self = this;
    const say = (key, vars) => new Promise(() => {});
    WP.Audio.music(d.id === 'briefing' ? 'briefing' : d.id === 'aftermath' ? 'ending' : 'map');
    this.rigs = {};
    if (d.id === 'interrogation') { this.rigs.lobo = WP.rigNew('lobo'); this.rigs.giggs = WP.rigNew('giggs'); WP.customPose(this.rigs.giggs); this.rigs.giggs.custom = 'handsUp'; }
    if (d.id === 'aftermath') { this.n = WP.run.hostagesFreed === null ? 5 : WP.run.hostagesFreed; this.rigs.h = []; for (let i = 0; i < 5; i++) { const r = WP.rigNew('h' + i); this.rigs.h.push(r); } }
    const line = key => { const l = Radio.line(key, { n: this.n }); const sp = WP.SPEAKERS[l.who] || WP.SPEAKERS.DEN; C.voice = WP.Audio.voiceFn(sp.voice, l.text); C.say(l.text, { name: sp.name, portrait: Radio.portrait(l.who), portraitSize: 40, place: 'bottom' }); if (l.text === 'AWOOOO!') WP.Audio.howl(); return E.until(() => !C.open); };
    this.script = g.script(function* () {
      if (d.id === 'briefing') {
        for (const c of WP.TEXT['brief.cards']) { self.card = c; yield 2.8; }
        self.card = null; for (const k of ['brief.1', 'brief.2', 'brief.3', 'brief.4']) yield line(k);
        yield 1.4;
      } else if (d.id === 'interrogation') {
        yield .8; yield line('int.1'); yield line('int.2'); yield line('int.3'); g.shake(8); WP.Audio.S.thud(); WP.Audio.S.stamp(); yield .6; yield line('int.4'); yield line('int.5'); yield line('int.6'); yield .8;
      } else if (d.id === 'aftermath') {
        yield 1; self.card = WP.fill(WP.TEXT['after.1'], null, { n: self.n }); WP.Audio.S.fanfare(); yield 4; yield line('clear.5'); yield 1;
      }
      self.done = true;
    });
  },
  update(dt) {
    const I = I0(), C = Radio.cut; this.t += dt;
    C.update(dt);
    if (I.down('confirm') || I.down('start') || I.down('fire')) this.hold += dt; else this.hold = 0;
    for (const k in this.rigs) { const v = this.rigs[k]; if (Array.isArray(v)) v.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: i < this.n ? 'kneel' : 'down', expr: i < this.n ? 'smile' : undefined })); else v.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: k === 'lobo' ? 0 : Math.PI, point: k === 'lobo', expr: k === 'giggs' ? 'wince' : 'angry', hurt: k === 'giggs' && this.t % 3 < .3 ? .5 : 0 }); }
    if (this.hold > 1 || this.done) { if (this.script) this.script.cancel(); C.close(); WP.flowAfterCut(this.d); }
  },
  draw(r) {
    const d = this.d, t = this.t;
    r.overlay(g => {
      if (d.id === 'briefing') UI.coastNight(g, t);
      else if (d.id === 'interrogation') { UI.tent(g, t); const v = new E.View('side', 'Side', 0, 0, 3, 1); this.rigs.lobo.draw(g, 190, 205, v); this.rigs.giggs.draw(g, 290, 205, v); }
      else if (d.id === 'aftermath') { UI.coastNight(g, t * .3); const v = new E.View('side', 'Side', 0, 0, 2.2, 1); this.rigs.h.forEach((rg, i) => { rg.draw(g, 80 + i * 80, 200, v); WP.HUD.portrait('h' + i, g, 64 + i * 80, 40, 32, { tint: i < this.n ? undefined : '#404040' }); txt(g, WP.HOSTAGES[i][0], 80 + i * 80, 76, i < this.n ? '#a0ff90' : '#6a6a5a', { align: 'center', font: 'tiny' }); }); }
      if (this.card) { px.blend(g, .7, 'normal', () => px.rect(g, 0, 110, WP.W, 40, '#0b0c08')); txt(g, this.card, WP.W / 2, 124, '#f2ead3', { align: 'center', scale: F.width(this.card, { scale: 2 }) > WP.W - 20 ? 1 : 2 }); }
      if (this.hold > 0) { const u = Math.min(1, this.hold); for (let a = 0; a < 24 * u; a++) { const th = -Math.PI / 2 + a / 24 * 6.283; px.rect(g, Math.round(WP.W - 20 + Math.cos(th) * 8), Math.round(20 + Math.sin(th) * 8), 2, 2, '#ffe060'); } }
      txt(g, 'HOLD ' + String(I0().label('confirm')).toUpperCase() + ' TO SKIP', WP.W - 6, WP.H - 12, '#8a8a7a', { align: 'right', font: 'tiny' });
    });
    Radio.cut.draw(r);
  }
};
WP.flowAfterCut = d => { const g = game(); if (d.next === 'map') g.go('map'); else g.go(d.next || 'title', d.nextData); };
// ---------------------------------------------------------------------------------------------- the map
S.map = {
  enter(d = {}) {
    this.select = !!d.select; WP.Audio.music('map'); game().allowJoin({ max: 4, onJoin: () => WP.Audio.S.menuPick() });
    const done = WP.run.done || []; this.next = this.select ? 1 : (done.length ? Math.max(...done) + 1 : 1); if (this.next > 6) this.next = 6;
    this.i = this.next - 1; this.lastPtr = null; this.t = 0;
    const unlocked = this.select ? Math.min(6, (E.store.get('wp:cleared', 0) || 0) + 1) : this.next;
    this.unlocked = unlocked;
    Radio.clear(); Radio.q.push({ who: 'DEN', text: WP.TEXT['map.' + this.next] }); this.saidT = 0;
  },
  update(dt) {
    const I = I0(); this.t += dt; Radio.update(dt);
    if (this.select) { if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { this.i = Math.min(this.unlocked - 1, this.i + 1); WP.Audio.S.menuMove(); } if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { this.i = Math.max(0, this.i - 1); WP.Audio.S.menuMove(); } }
    const ptr = I.pointer ? I.pointer() : null;
    if (ptr && (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1])) { this.lastPtr = ptr.slice(); UI.NODES.forEach((n, k) => { if (Math.hypot(ptr[0] - n[0], ptr[1] - n[1]) < 14 && (this.select ? k < this.unlocked : k === this.next - 1)) this.i = k; }); }
    const cl = I.clicked ? I.clicked() : null; const clickedNode = cl && UI.NODES.findIndex(n => Math.hypot(cl[0] - n[0], cl[1] - n[1]) < 14);
    if (I.pressed('confirm') || I.pressed('start') || (clickedNode !== null && clickedNode === this.i) || (cl && WP.inRect(cl, [WP.W - 130, WP.H - 34, WP.W, WP.H]))) { WP.Audio.S.menuPick(); if (this.select) { WP.run.mission = true; WP.run.players = null; WP.run.hostagesFreed = 5; } game().go('play', { op: this.i + 1 }); }
    if (I.pressed('cancel')) { WP.Audio.S.menuBack(); game().go('title'); }
  },
  draw(r) {
    r.overlay(g => {
      UI.mapArt(g, this.t);
      const done = WP.run.done || [];
      UI.NODES.forEach(([x, y], k) => {
        const n = k + 1, isDone = !this.select && done.includes(n), cur = k === this.i, avail = this.select ? k < this.unlocked : n === this.next;
        px.disc(g, x, y, 11, '#0b0c08'); px.disc(g, x, y, 9, isDone ? '#3a7a3a' : avail ? '#e0b040' : '#5a5a4a');
        if (cur) { const rr = 13 + Math.sin(this.t * 6) * 2; for (let a = 0; a < 24; a++) { const t = a / 24 * 6.283; px.rect(g, Math.round(x + Math.cos(t) * rr), Math.round(y + Math.sin(t) * rr), 2, 2, '#ffe060'); } }
        px.sprite(g, WP.SPR[UI.mapIcons[k]], x - 4, y - 4);
        txt(g, String(n), x + 10, y - 16, '#f2ead3');
        if (isDone) txt(g, 'OK', x - 5, y + 11, '#80ff80', { font: 'tiny' });
      });
      const [name, obj] = WP.TEXT.ops[this.i];
      E.ui.box(g, 10, WP.H - 64, 300, 54, { bg: ['#2a3420', '#141a0c'], alpha: .92 });
      txt(g, 'OP ' + (this.i + 1) + '  ' + name, 20, WP.H - 58, '#e0b040', { scale: 2 }); txt(g, obj, 20, WP.H - 38, '#f2ead3');
      txt(g, (this.select ? 'MISSION SELECT' : 'DIFFICULTY ' + WP.DIFF[WP.run.diff].name) + (WP.run.loop > 1 ? '  LOOP ' + WP.run.loop : ''), 20, WP.H - 26, '#a0a090', { font: 'tiny' });
      const s = String(I0().label('confirm')).toUpperCase() + ' DEPLOY'; px.rect(g, WP.W - 128, WP.H - 32, 122, 22, '#e0b040'); txt(g, s, WP.W - 67, WP.H - 26, '#0b0c08', { align: 'center', outline: false, scale: 1 });
    });
    Radio.draw(r);
  }
};
// ---------------------------------------------------------------------------------------------- the tally
S.tally = {
  enter(d) {
    const sim = d.sim, n = sim.opn; this.op = n; this.t = 0; this.i = 0; this.count = 0; WP.Audio.music('tally', { force: true });
    const ps = sim.players, sum = f => ps.reduce((a, p) => a + f(p), 0), shots = sum(p => p.stats.shots), hits = sum(p => p.stats.hits), acc = shots ? hits / shots : 0;
    const civ = sum(p => p.stats.civ);
    this.lines = [['SOLDIERS', sum(p => p.stats.soldiers), 0], ['VEHICLES', sum(p => p.stats.vehicles), 0], ['ACCURACY', Math.round(acc * 100) + '%', Math.round(acc * 100 * 100 * n)], ['HEADSHOTS', sum(p => p.stats.heads), sum(p => p.stats.heads) * 200], ['INTERCEPTS', sum(p => p.stats.inter), sum(p => p.stats.inter) * 100],
      civ ? ['CIVILIANS HIT', civ, -1000 * civ] : ['CIVILIANS SPARED', '', 5000], ['OPERATION BONUS', '', 10000 * n]];
    if (sim.stage.hostages) this.lines.push(['HOSTAGES', sim.host.saved + '/' + sim.host.n, sim.host.saved * 5000]);
    // the bonus goes to every player still standing
    const bonus = this.lines.reduce((a, l) => a + l[2], 0), live = ps.filter(p => !p.down);
    (live.length ? live : ps).forEach(p => { const rp = WP.run.players.find(q => q.pid === p.pid); if (rp) rp.score = Math.max(0, rp.score + Math.round(bonus / (live.length || 1))); });
    this.total = bonus;
    // the perk, the heal, the record of the run
    const st = sim.stage; WP.run.done = (WP.run.done || []).filter(x => x !== n).concat(n); WP.run.continuesOp = 0;
    if (!WP.run.mission) {
      if (st.perk === 'commsDown') WP.run.perks.commsDown = true; if (st.perk === 'camp') WP.run.perks.camp = true;
      if (st.perk === 'village') WP.run.perks.village = true; if (st.perk === 'supplies') { WP.run.perks.supplies = true; for (const p of WP.run.players) { while (p.spares.length < T.maxMags + 1) p.spares.push(T.magSize); p.spares = p.spares.map(() => T.magSize); p.grenades = T.maxGrenades; } }
      if (st.perk === 'hostages') WP.run.hostagesFreed = sim.host.saved;
    }
    if (n === 6) WP.run.hostagesHome = sim.host.saved;
    if (n === 6 && WP.run.mission) WP.run.hostagesHome = sim.host.saved;
    const heal = n === 3 ? 40 : WP.T.clearHeal; for (const p of WP.run.players) { p.damage = Math.max(0, p.damage - heal); }
    this.heal = heal; this.perk = st.perk ? WP.TEXT.perks[st.perk] : null;
    E.store.set('wp:cleared', Math.max(E.store.get('wp:cleared', 0) || 0, n));
    const acc2 = WP.run.acc || [0, 0]; WP.run.acc = [acc2[0] + hits, acc2[1] + shots];
    Radio.clear(); Radio.say('clear.' + n, { n: sim.host.saved });
  },
  update(dt) {
    const I = I0(); this.t += dt; Radio.update(dt);
    const step = .55, shown = Math.floor(this.t / step);
    if (shown > this.i && this.i < this.lines.length) { this.i = Math.min(this.lines.length, shown); WP.Audio.S.stamp(); }
    if ((I.pressed('confirm') || I.pressed('start') || I.clicked && I.clicked()) && this.t > .4) { if (this.i < this.lines.length) { this.i = this.lines.length; this.t = this.lines.length * step; } else this.next(); }
    if (this.t > this.lines.length * step + 6) this.next();
  },
  next() {
    const g = game(), n = this.op;
    if (WP.run.mission) { g.go('map', { select: true }); return; }
    if (n === 2) g.go('cutscene', { id: 'interrogation', next: 'map' });
    else if (n === 5) g.go('cutscene', { id: 'aftermath', next: 'map' });
    else if (n === 6) g.go('ending', { n: WP.run.hostagesHome || 0 });
    else g.go('map');
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, WP.W, WP.H, '#10140c'); for (let y = 0; y < WP.H; y += 4) px.rect(g, 0, y, WP.W, 1, '#141a10');
      txt(g, 'OPERATION ' + this.op + ' CLEAR', WP.W / 2, 10, '#e0b040', { align: 'center', scale: 3 });
      this.lines.slice(0, this.i).forEach(([k, v, pts], j) => { const y = 44 + j * 18; txt(g, k, 60, y, '#c8b890', { scale: 1 }); txt(g, String(v), 260, y, '#f2ead3', { align: 'right' }); txt(g, (pts >= 0 ? '+' : '') + pts, WP.W - 60, y, pts < 0 ? '#ff6040' : '#ffe080', { align: 'right', scale: 2 }); });
      if (this.i >= this.lines.length) {
        const y = 44 + this.lines.length * 18 + 4; txt(g, 'TOTAL BONUS  +' + this.total, WP.W / 2, y, '#ffe060', { align: 'center', scale: 2 });
        if (this.perk) { E.ui.box(g, 60, y + 22, WP.W - 120, 34, { bg: ['#3a3014', '#1a160a'], alpha: .95 }); txt(g, 'PERK: ' + this.perk[0], WP.W / 2, y + 26, '#e0b040', { align: 'center' }); txt(g, WP.fill(this.perk[1], null, { n: WP.run.hostagesFreed }), WP.W / 2, y + 40, '#f2ead3', { align: 'center', font: 'tiny' }); }
        if (this.heal) txt(g, 'DAMAGE REPAIRED -' + this.heal, WP.W / 2, y + 62, '#80ff80', { align: 'center' });
        UI.footer(g, I0(), [['confirm', 'CONTINUE']]);
      }
    });
    Radio.draw(r);
  }
};
// ---------------------------------------------------------------------------------------------- continue / game over
S.continue = {
  enter(d) { this.op = d.op; this.t = 10; WP.Audio.music('gameover', { force: true }); this.over = false; },
  update(dt) {
    const I = I0();
    if (this.over) { this.overT -= dt; if (this.overT <= 0 || (this.overT < 2 && (I.pressed('confirm') || I.pressed('start')))) WP.toInitials('title'); return; }
    this.t -= dt;
    if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) { WP.run.continues++; WP.Audio.S.menuPick(); game().go('play', { op: this.op, restart: true }); return; }
    if (I.pressed('cancel') || this.t <= 0) { this.over = true; this.overT = 4; }
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, WP.W, WP.H, '#0b0606');
      if (this.over) { txt(g, 'GAME OVER', WP.W / 2, 80, '#ff4030', { align: 'center', scale: 4 }); txt(g, WP.TEXT.gameover, WP.W / 2, 130, '#f2ead3', { align: 'center', scale: 2 }); txt(g, 'SCORE ' + WP.fmt((WP.run.players || [{ score: 0 }])[0].score, 7), WP.W / 2, 160, '#ffe080', { align: 'center', scale: 2 }); return; }
      txt(g, 'CONTINUE?', WP.W / 2, 60, '#ffe060', { align: 'center', scale: 4 });
      txt(g, String(Math.max(0, Math.ceil(this.t))), WP.W / 2, 110, '#ffffff', { align: 'center', scale: 6 });
      txt(g, 'CONTINUES USED ' + WP.run.continues, WP.W / 2, 170, '#c8b890', { align: 'center' });
      txt(g, 'SCORE ' + WP.fmt((WP.run.players || [{ score: 0 }])[0].score, 7), WP.W / 2, 186, '#f2ead3', { align: 'center', scale: 2 });
      UI.footer(g, I0(), [['confirm', 'CONTINUE'], ['cancel', 'GIVE UP']]);
    });
  }
};
// ---------------------------------------------------------------------------------------------- the ending, credits, initials, scores, about
WP.rank = () => {
  const h = WP.run.hostagesHome || 0, acc = WP.run.acc && WP.run.acc[1] ? WP.run.acc[0] / WP.run.acc[1] : 0;
  const R = WP.TEXT.ranks, r = h >= 5 && WP.run.continues === 0 && acc >= .55 ? R[4] : h >= 4 ? R[3] : h >= 3 ? R[2] : h >= 1 ? R[1] : R[0];
  return (WP.run.loop > 1 ? 'BLACK MOON ' : '') + r;
};
S.ending = {
  enter(d) { this.n = d.n === undefined ? 5 : d.n; this.t = 0; this.phase = 'text'; WP.Audio.music('ending', { force: true }); game().after(1, () => WP.Audio.howl()); const key = this.n >= 5 ? 'end.5' : this.n >= 3 ? 'end.3' : this.n >= 1 ? 'end.1' : 'end.0'; this.lines = WP.TEXT[key].map(s => WP.fill(s, null, { n: this.n })); this.menu = null; },
  update(dt) {
    const I = I0(); this.t += dt;
    if (this.phase === 'text' && (this.t > this.lines.length * 3 + 4 || ((I.pressed('confirm') || I.pressed('start')) && this.t > 1.5))) { this.phase = 'choice'; this.menu = new UI.Menu([{ label: 'LOOP 2', fn: () => { WP.run.loop++; WP.run.done = []; WP.run.hostagesFreed = null; WP.run.perks = {}; game().go('credits', { next: 'loop' }); } }, { label: 'TITLE', fn: () => game().go('credits', { next: 'title' }) }], { y: 190, gap: 18 }); }
    else if (this.phase === 'choice') this.menu.update(I);
  },
  draw(r) {
    r.overlay(g => {
      UI.sunriseSea(g, this.t); UI.plane(g, WP.W / 2 + Math.sin(this.t * .4) * 20, 120 + Math.sin(this.t * .7) * 6, 1.2, this.t);
      for (let i = 0; i < 5; i++) WP.HUD.portrait('h' + i, g, 150 + i * 36, 8, 28, { tint: i < this.n ? undefined : '#404040' });
      this.lines.forEach((l, i) => { if (this.t > i * 3 + .5) txt(g, l, WP.W / 2, 160 + i * 12, '#ffffff', { align: 'center' }); });
      if (this.t > this.lines.length * 3 + 1) { txt(g, 'RANK: ' + WP.rank(), WP.W / 2, 44, '#ffe060', { align: 'center', scale: 2 }); }
      if (this.phase === 'choice') { px.blend(g, .7, 'normal', () => px.rect(g, 0, 156, WP.W, 80, '#0b0c08')); txt(g, WP.TEXT['end.more'], WP.W / 2, 166, '#e0b040', { align: 'center', scale: 2 }); this.menu.draw(g); UI.footer(g, I0(), [['confirm', 'SELECT']]); }
    });
  }
};
S.credits = {
  enter(d = {}) { this.d = d; this.t = 0; WP.Audio.music('title'); this.lines = []; for (const [h, rows] of WP.ABOUT) { this.lines.push(['h', h]); for (const [k, v] of rows) { this.lines.push(['k', k]); for (const l of F.wrap(v, WP.W - 80)) this.lines.push(['v', l]); } this.lines.push(['v', '']); } this.lines.push(['h', 'THANK YOU FOR PLAYING']); },
  update(dt) { const I = I0(); this.t += dt * (I.down('confirm') || I.down('fire') ? 4 : 1); if (this.t * 22 > this.lines.length * 12 + WP.H || I.pressed('cancel') || I.pressed('start')) this.finish(); },
  finish() { const n = this.d.next; if (n === 'loop') WP.toInitials('map'); else if (n === 'title' && this.d.fromEnding !== false) WP.toInitials('title'); else game().go(n || 'title'); },
  draw(r) { r.overlay(g => { UI.coastNight(g, this.t); let y = WP.H - this.t * 22; for (const [k, s] of this.lines) { if (y > -12 && y < WP.H) txt(g, s, WP.W / 2, y, k === 'h' ? '#e0b040' : k === 'k' ? '#c8b070' : '#f2ead3', { align: 'center', scale: k === 'h' ? 2 : 1 }); y += k === 'h' ? 20 : 12; } UI.footer(g, I0(), [['confirm', 'FASTER'], ['cancel', 'SKIP']]); }); }
};
// initials for everyone who qualifies, in turn, then the next scene
WP.toInitials = next => { const ps = (WP.run.players || []).map((p, i) => ({ seat: i, score: p.score })).filter(p => WP.cab && WP.cab.qualifies(p.score, 'campaign') && !WP.run.mission); game().go('initials', { list: ps, next }); };
S.initials = {
  enter(d) { this.d = d; this.list = d.list.slice(); this.cur = null; this.nextOne(); WP.Audio.music('title'); },
  nextOne() { this.cur = this.list.shift() || null; if (!this.cur) { const n = this.d.next; WP.run.players = n === 'map' ? WP.run.players : null; game().go(n === 'map' ? 'map' : 'scores', n === 'map' ? {} : { after: 'title' }); return; } WP.cab.enter(this.cur.score, 'campaign', () => this.nextOne()); },
  update(dt) { WP.cab.update(dt); },
  draw(r) { r.overlay(g => { UI.coastNight(g, WP.Render.t += 1 / 60); txt(g, 'NEW HIGH SCORE!', WP.W / 2, 20, '#ffe060', { align: 'center', scale: 3 }); if (this.cur) txt(g, 'WOLF ' + (this.cur.seat + 1) + '  ' + WP.fmt(this.cur.score, 7), WP.W / 2, 50, WP.SEAT[this.cur.seat], { align: 'center', scale: 2 }); }); WP.cab.draw(r); }
};
S.scores = {
  enter(d = {}) { this.d = d; this.t = 0; WP._ptr = null; },
  update(dt) { this.t += dt; const I = I0(); if (this.d.attract) { if (WP.anyInput()) { game().go('title', { woke: true }); return; } if (this.t > 6) game().go('title'); return; } if (I.pressed('confirm') || I.pressed('cancel') || I.pressed('start') || (I.clicked && I.clicked()) || this.t > 20) game().go(this.d.after || 'title'); },
  draw(r) { r.overlay(g => { UI.titleArt(g, WP.Render.t += 1 / 60); px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, WP.W, WP.H, '#0b0c08')); }); WP.cab.drawTable(r, 'campaign', 30, 'TOP WOLVES'); r.overlay(g => { if (this.d.attract) txt(g, WP.TEXT.hud.demo, WP.W / 2, WP.H - 14, '#ffe060', { align: 'center' }); else UI.footer(g, I0(), [['cancel', 'BACK']]); }); }
};
S.about = {
  enter() { this.i = 0; },
  update(dt) { const I = I0(); const cl = I.clicked ? I.clicked() : null; if (I.pressed('right') || I.pressed('confirm') || (cl && cl[0] > WP.W / 2)) { this.i = (this.i + 1) % WP.ABOUT.length; WP.Audio.S.menuMove(); } if (I.pressed('left') || (cl && cl[0] <= WP.W / 2)) { this.i = (this.i + WP.ABOUT.length - 1) % WP.ABOUT.length; WP.Audio.S.menuMove(); } if (I.pressed('cancel')) game().go('title'); },
  draw(r) { r.overlay(g => { UI.titleArt(g, WP.Render.t += 1 / 60); UI.aboutPage(g, this.i); UI.footer(g, I0(), [['left', 'PREV'], ['right', 'NEXT'], ['cancel', 'BACK']]); }); }
};
})();
