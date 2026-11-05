/* OLYMPIYIKES! — dev mode (§13): pause menu → Dev mode, or the ` key. Live tuning sliders with reset to defaults, cheats,
 * jumps to any screen, view tools and data tools. Absent in hub sessions. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, G = O.G;
const TABS = ['TUNE', 'GLOBAL', 'CHEATS', 'JUMP', 'VIEW', 'DATA'];
const D = O.Dev = { isOpen: false, live: false, tab: 0, row: 0, cheats: { autopilot: false, perfect: false, god: false, infHype: false }, pending: null, hideHud: false, skeleton: false, inputs: false, sel: {}, rects: [], tabRects: [], heldT: 0, statePage: 0, msg: null, msgT: 0 };
const say = m => { D.msg = m; D.msgT = 2; };
const inEvent = () => !!(O.ctx && game.sceneName && game.sceneName.startsWith('ev:'));
const evId = () => inEvent() ? O.ctx.def.id : (D.sel.tuneEv || 'sprint');
const cycle = (k, n, d) => { D.sel[k] = ((D.sel[k] || 0) + d + n) % n; return D.sel[k]; };

/* rows: { label, kind: 'slider'|'toggle'|'button'|'choice'|'info', get, set, act, min, max, step, def, options } */
function rows() {
  const t = TABS[D.tab], out = [];
  if (t === 'TUNE' || t === 'GLOBAL') {
    const grp = t === 'GLOBAL' ? 'G' : evId(), defs = O.tune.defs(grp), T = O.tune.get(grp);
    if (t === 'TUNE') out.push({ label: 'EVENT', kind: 'choice', get: () => O.EVENTS[grp] ? O.EVENTS[grp].name : grp, change: d => { if (!inEvent()) D.sel.tuneEv = O.EVENT_LIST[cycle('tuneI', 12, d)].id; } });
    for (const k in defs) { const s = defs[k]; out.push({ label: s.label, kind: 'slider', min: s.min, max: s.max, step: s.step, def: s.v, get: () => T[k], set: v => O.tune.set(grp, k, v), reset: () => O.tune.set(grp, k, s.v) }); }
    out.push({ label: 'RESET TO DEFAULTS (' + O.tune.changed(grp).length + ' changed)', kind: 'button', act: () => { O.tune.reset(grp); say('Defaults restored'); } });
    out.push({ label: 'COPY JSON', kind: 'button', act: () => { const j = O.tune.json(); try { navigator.clipboard && navigator.clipboard.writeText(j); } catch (e) { /* no clipboard */ } console.log('[tune]', j); say('Copied (and in the console)'); } });
    out.push({ label: 'KEEP AFTER RELOAD', kind: 'toggle', get: () => O.tune.keep, set: v => { O.tune.keep = v; O.tune.save(); } });
  } else if (t === 'CHEATS') {
    for (const [k, l] of [['autopilot', 'AUTOPILOT P1'], ['perfect', 'PERFECT P1'], ['god', 'GOD MODE (no wipeouts)'], ['infHype', 'INFINITE HYPE']]) out.push({ label: l, kind: 'toggle', get: () => D.cheats[k], set: v => D.cheat(k, v) });
    out.push({ label: 'WIN NOW (gold)', kind: 'button', act: () => D.cheat('win') });
    out.push({ label: 'LOSE NOW (8th)', kind: 'button', act: () => D.cheat('lose') });
    out.push({ label: 'DNF NOW', kind: 'button', act: () => D.cheat('dnf') });
    out.push({ label: 'NEXT ATTEMPT', kind: 'button', act: () => D.cheat('next') });
    const ph = inEvent() ? (O.ctx.def.phases || []) : [];
    out.push({ label: 'SKIP TO PHASE', kind: 'choice', get: () => ph.length ? ph[(D.sel.ph || 0) % ph.length][0].toUpperCase() : '—', change: d => cycle('ph', Math.max(1, ph.length), d), act: () => { if (ph.length) D.cheat('phase:' + ph[(D.sel.ph || 0) % ph.length][0]); } });
    out.push({ label: 'UNLOCK ALL LAURELS', kind: 'button', act: () => { O.Laurels.unlockAll(); say('All 12 laurels unlocked'); } });
    out.push({ label: 'TORCHES +3', kind: 'button', act: () => { if (O.meet) { O.meet.torches += 3; say('Torches: ' + O.meet.torches); } else say('No Games running'); } });
    out.push({ label: 'GIVE MEDAL', kind: 'choice', get: () => ['GOLD', 'SILVER', 'BRONZE'][D.sel.medal || 0], change: d => cycle('medal', 3, d), act: () => { const m = O.meet; if (m && m.players[0]) { m.medals[m.players[0].nat][['g', 's', 'b'][D.sel.medal || 0]]++; say('Medal given'); } else say('No meet'); } });
  } else if (t === 'JUMP') {
    out.push({ label: 'EVENT', kind: 'choice', get: () => O.EVENT_LIST[D.sel.ev || 0].name, change: d => cycle('ev', 12, d), act: () => D.jump('ev:' + O.EVENT_LIST[D.sel.ev || 0].id) });
    out.push({ label: 'GAMES DAY', kind: 'choice', get: () => 'DAY ' + ((D.sel.day || 0) + 1) + ' · ' + O.EVENTS[O.DAYS[D.sel.day || 0]].short, change: d => cycle('day', 12, d), act: () => D.jump('day:' + ((D.sel.day || 0) + 1)) });
    out.push({ label: 'OPENING CEREMONY', kind: 'button', act: () => D.jump('opening') });
    out.push({ label: 'CLOSING + ENDING', kind: 'choice', get: () => 'RANK ' + ((D.sel.rank || 0) + 1), change: d => cycle('rank', 8, d), act: () => D.jump('closing:' + ((D.sel.rank || 0) + 1)) });
    out.push({ label: 'PODIUM (sample)', kind: 'button', act: () => D.jump('podium') });
    out.push({ label: 'MEDAL TABLE (sample)', kind: 'button', act: () => D.jump('medals') });
    const bk = Object.keys(O.BEATS);
    out.push({ label: 'STORY BEAT', kind: 'choice', get: () => bk[D.sel.beat || 0], change: d => cycle('beat', bk.length, d), act: () => D.jump('beat:' + bk[D.sel.beat || 0]) });
    out.push({ label: 'ATTRACT MODE', kind: 'button', act: () => D.jump('attract') });
    out.push({ label: 'POSE LAB', kind: 'button', act: () => D.jump('poselab') });
    out.push({ label: 'HUB CARD (offline preview + sample ghosts)', kind: 'button', act: () => D.jump('hub') });
  } else if (t === 'VIEW') {
    out.push({ label: 'LIVE (game runs, panel open)', kind: 'toggle', get: () => D.live, set: v => { D.live = v; game.timeScale = v ? D.scale : 0; } });
    out.push({ label: 'TIME SCALE', kind: 'slider', min: .1, max: 4, step: .05, def: 1, get: () => D.scale, set: v => { D.scale = v; if (D.live) game.timeScale = v; }, reset: () => { D.scale = 1; } });
    out.push({ label: 'FRAME STEP', kind: 'button', act: () => { const was = game.timeScale; game.timeScale = 1; D.stepping = true; game.advance ? null : null; D.frame = 1; game.timeScale = was; } });
    out.push({ label: 'RIG SKELETONS', kind: 'toggle', get: () => D.skeleton, set: v => { D.skeleton = v; } });
    out.push({ label: 'INPUT DISPLAY', kind: 'toggle', get: () => D.inputs, set: v => { D.inputs = v; } });
    out.push({ label: 'SHOW FPS', kind: 'toggle', get: () => !!game.settings.showFps, set: v => game.settings.set('showFps', v) });
    out.push({ label: 'FREE CAMERA', kind: 'toggle', get: () => !!game.cam.free, set: v => { game.cam.free = v ? { keys: true, edge: 0, drag: true } : null; } });
    out.push({ label: 'ZOOM', kind: 'slider', min: .5, max: 3, step: .05, def: 1, get: () => game.zoom || 1, set: v => game.setZoom(v), reset: () => game.setZoom(1) });
    out.push({ label: 'HUD', kind: 'toggle', get: () => !D.hideHud, set: v => { D.hideHud = !v; } });
    out.push({ label: 'LIGHTS', kind: 'toggle', get: () => game.lights.enabled, set: v => { game.lights.enabled = v; } });
    out.push({ label: 'PHOTO MODE (no UI)', kind: 'toggle', get: () => !!O.photoMode, set: v => { O.photoMode = v; } });
    out.push({ label: 'STATE JSON', kind: 'choice', get: () => 'PAGE ' + (D.statePage + 1), change: d => { D.statePage = Math.max(0, D.statePage + d); } });
  } else if (t === 'DATA') {
    out.push({ label: 'MEET SEED', kind: 'choice', get: () => String(O.meet ? O.meet.seed : O.seed), change: d => { if (O.meet) O.meet.seed += d; else O.seed += d; } });
    out.push({ label: 'RESET RECORDS', kind: 'button', act: () => { O.Records.reset(); say('Records reset'); } });
    out.push({ label: 'RESET LAURELS', kind: 'button', act: () => { O.Laurels.reset(); say('Laurels reset'); } });
    out.push({ label: 'CLEAR GAMES SAVE', kind: 'button', act: () => { O.store.set('games', null); say('Save cleared'); } });
    out.push({ label: 'CLEAR GHOSTS & PBs', kind: 'button', act: () => { O.store.set('pb', null); for (const id in O.EVENTS) O.store.set('ghost:' + id, null); say('Cleared'); } });
    const songs = Object.keys(O.SONGS), stings = Object.keys(O.STINGS), sfx = ['gun', 'splash', 'slap', 'clack', 'horn', 'boing', 'alarm', 'firework', 'cowbell', 'glass', 'twang', 'slam'];
    out.push({ label: 'SONG', kind: 'choice', get: () => songs[D.sel.song || 0], change: d => cycle('song', songs.length, d), act: () => O.music(songs[D.sel.song || 0]) });
    out.push({ label: 'STING', kind: 'choice', get: () => stings[D.sel.sting || 0], change: d => cycle('sting', stings.length, d), act: () => O.sting(stings[D.sel.sting || 0]) });
    out.push({ label: 'SOUND EFFECT', kind: 'choice', get: () => sfx[D.sel.sfx || 0], change: d => cycle('sfx', sfx.length, d), act: () => O.sfx(sfx[D.sel.sfx || 0]) });
    const keys = Object.keys(O.COMM_BANK);
    out.push({ label: 'COMMENTARY CUE', kind: 'choice', get: () => keys[D.sel.cue || 0], change: d => cycle('cue', keys.length, d), act: () => O.Comms.cue(keys[D.sel.cue || 0], { name: 'DASH', nation: 'SUNVALE', lane: 4 }, { force: true, prio: 10 }) });
    out.push({ label: 'VOICE TEST', kind: 'choice', get: () => Object.keys(O.VOICES)[D.sel.voice || 0], change: d => cycle('voice', Object.keys(O.VOICES).length, d), act: () => O.Voice.speak('Hello everybody! Welcome to the Games!', Object.keys(O.VOICES)[D.sel.voice || 0]) });
  }
  return out;
}

Object.assign(D, {
  scale: 1,
  open() { if (O.inHub) return; game.resume && game.paused && game.resume(); D.isOpen = true; D.openedAt = game.real; D.prev = game.timeScale || 1; game.timeScale = D.live ? D.scale : 0; D.row = Math.min(D.row, 20); O.sfx('pause'); },
  close() { D.isOpen = false; game.timeScale = D.prev || 1; for (const p of game.players) p.consumeAll(); O.sfx('cancel'); },
  set(group, key, v) { O.tune.set(group, key, v); },
  /** the cheats (tests use the same names) */
  cheat(name, v) {
    if (name in D.cheats) { D.cheats[name] = v === undefined ? !D.cheats[name] : !!v; applyCheats(); return; }
    if (!inEvent()) { say('Not in an event'); return; }
    D.pending = name; if (D.isOpen && !D.live) { game.timeScale = 1; D.resumeAfter = true; }
    say(name.toUpperCase());
  },
  /** jump to any screen with sample data */
  jump(target) {
    D.close(); O.Attract.on = false;
    const sample = (mode) => { const m = O.flow.newMeet(mode || 'single', { players: [{ nat: 'SUN', input: 0, color: E.PLAYER_COLORS[0] }] }); O.flow.begin(m); return m; };
    if (target.startsWith('ev:')) { const id = target.slice(3); const m = sample('single'); m.events = [id]; return O.go('ev:' + id, {}, 0); }
    if (target.startsWith('day:')) { const n = +target.slice(4); const m = sample('games'); m.day = n - 1; for (let d = 0; d < n - 1; d++) simulateDay(m, O.DAYS[d]); m.beats = {}; for (const k in O.BEATS) m.beats[k] = 1; return O.go('dayCard', {}, 0); }
    if (target === 'opening') { sample('games'); return O.go('opening', {}, 0); }
    if (target.startsWith('closing')) { const rank = +(target.split(':')[1] || 1); const m = sample('games'); for (const n of O.NATIONS) m.medals[n.id] = { g: 0, s: 0, b: 0 }; O.NATIONS.forEach((n, i) => { m.medals[n.id].g = 12 - i; }); const me = O.NATIONS[rank - 1]; m.players[0].nat = me.id; m.day = 12; return O.go('closing', {}, 0); }
    if (target === 'podium' || target === 'medals') { const m = sample('games'); simulateDay(m, 'sprint'); m.lastEvent = 'sprint'; return O.go(target === 'podium' ? 'podium' : 'medals', { res: m.lastResults, def: O.EVENTS.sprint }, 0); }
    if (target.startsWith('beat:')) { const m = sample('games'); m.day = 6; simulateDay(m, 'sprint'); return O.go('beat', { key: target.slice(5) }, 0); }
    if (target === 'attract') { O.go('title', {}, 0); return game.after(.1, () => O.Attract.start()); }
    if (target === 'poselab') return O.go('poselab', {}, 0);
    if (target === 'hub') return O.Hub && O.Hub.preview();
  },
  update(dt) {
    dt = 1 / 120; const I = game.input, R = rows();
    D.msgT = Math.max(0, D.msgT - dt);
    if (D.frame) { D.frame = 0; game.timeScale = 1; game.after(1 / 120, () => { if (D.isOpen && !D.live) game.timeScale = 0; }); }
    if (D.resumeAfter && !D.pending) { D.resumeAfter = false; if (!D.live) game.timeScale = 0; }
    if ((I.pressed('cancel') || I.pressed('dev')) && game.real > (D.openedAt || 0) + .05) { D.close(); return; }
    if (I.pressed('tabR')) { D.tab = (D.tab + 1) % TABS.length; D.row = 0; } if (I.pressed('tabL')) { D.tab = (D.tab + TABS.length - 1) % TABS.length; D.row = 0; }
    if (I.repeat('down', .3, .08)) D.row = Math.min(R.length - 1, D.row + 1); if (I.repeat('up', .3, .08)) D.row = Math.max(0, D.row - 1);
    D.row = Math.min(D.row, R.length - 1);
    const hp = O.hover(I); if (hp) D.rects.forEach((Rc, k) => { if (O.hit(hp, Rc)) D.row = k; });
    const c = I.clicked(); if (c) { const tk = D.tabRects.findIndex(Rc => O.hit(c, Rc)); if (tk >= 0) { D.tab = tk; D.row = 0; } }
    const row = R[D.row]; if (!row) return;
    const fine = I.down('turbo'), held = I.down('left') || I.down('right'); D.heldT = held ? D.heldT + dt : 0;
    const dir = (I.repeat('right', .5, .05) ? 1 : 0) - (I.repeat('left', .5, .05) ? 1 : 0);
    if (dir && row.kind === 'slider') { const st = row.step * (fine ? 1 : D.heldT > 1 ? 5 : 1) * (fine ? .2 : 1); row.set(E.clamp(row.get() + dir * Math.max(st, row.step), row.min, row.max)); }
    if (dir && (row.kind === 'choice')) row.change(dir);
    if (dir && row.kind === 'toggle') row.set(dir > 0);
    // mouse drag on a slider
    if (I.down('confirm') === false && I.mouse && I.held && I.held.has && I.held.has('Mouse0') && row.kind === 'slider' && D.rects[D.row] && I.pointer()) { const Rc = D.rects[D.row], p = I.pointer(); const u = E.clamp((p[0] - (Rc[0] + Rc[2] * .55)) / (Rc[2] * .4), 0, 1); row.set(row.min + u * (row.max - row.min)); }
    if (I.pressed('confirm') || I.pressed('action') || (c && D.rects[D.row] && O.hit(c, D.rects[D.row]))) {
      if (row.kind === 'button') row.act(); else if (row.kind === 'toggle') row.set(!row.get()); else if (row.kind === 'slider') row.reset(); else if (row.kind === 'choice' && row.act) row.act();
      O.sfx('select', { vol: .5 });
    }
    if (I.pressed('turbo') && !held) { const t = TABS[D.tab]; if (t === 'TUNE') O.tune.reset(evId()); if (t === 'GLOBAL') O.tune.reset('G'); say('Tab reset to defaults'); }
    if (D.live) for (const p of game.players) { p.consumeAll(); for (const a of ['mashL', 'mashR', 'action', 'turbo', 'alt', 'up', 'down', 'left', 'right']) p.suppress(a); }
  },
  draw(g, r) {
    const w = Math.max(220, Math.round(r.W * .45)), x = r.W - w - 4, y = 4, h = r.H - 8, R = rows();
    O.panel(g, x, y, w, h, { alpha: .94, border: '#4fe0a8' });
    O.text(g, 'DEV MODE' + (D.live ? ' · LIVE' : ' · FROZEN'), x + 8, y + 5, '#4fe0a8');
    D.tabRects = []; let tx = x + 6; TABS.forEach((t, k) => { const tw = E.font.width(t, { font: 'tiny' }) + 8; px.rect(g, tx, y + 16, tw, 10, k === D.tab ? '#4fe0a8' : '#1c2350'); E.font.text(g, t, tx + 4, y + 18, k === D.tab ? '#05060f' : '#c8d0f0', { outline: false, font: 'tiny' }); D.tabRects.push([tx, y + 16, tw, 10]); tx += tw + 2; });
    D.rects = []; const rh = 13, first = Math.max(0, D.row - Math.floor((h - 70) / rh) + 2);
    R.forEach((row, k) => { if (k < first) { D.rects.push([-99, -99, 0, 0]); return; } const yy = y + 32 + (k - first) * rh; if (yy > y + h - 30) { D.rects.push([-99, -99, 0, 0]); return; } const f = k === D.row; D.rects.push([x + 4, yy - 1, w - 8, rh - 1]);
      if (f) px.rect(g, x + 4, yy - 1, w - 8, rh - 1, '#14403a');
      const changed = row.kind === 'slider' && Math.abs(row.get() - row.def) > 1e-9;
      E.font.text(g, (f ? '>' : ' ') + row.label.replace(/²/g, '2').replace(/[‹›×·]/g, '-'), x + 8, yy + 2, changed ? '#ffd060' : '#e8ecff', { outline: false, font: 'tiny' });
      const vx = x + w * .55, vw = w * .4;
      if (row.kind === 'slider') { const u = (row.get() - row.min) / (row.max - row.min), du = (row.def - row.min) / (row.max - row.min); px.rect(g, vx, yy + 4, vw, 2, '#3a4070'); px.rect(g, vx + vw * du, yy + 1, 1, 8, '#9aa2c8'); px.rect(g, vx + vw * u - 1, yy, 3, 10, changed ? '#ffd060' : '#4fe0a8'); E.font.text(g, fmtv(row.get()), vx + vw, yy - 5, '#ffffff', { outline: false, font: 'tiny', align: 'right' }); }
      else if (row.kind === 'toggle') E.font.text(g, row.get() ? 'ON' : 'OFF', vx + vw, yy + 2, row.get() ? '#4fe0a8' : '#7a82aa', { outline: false, font: 'tiny', align: 'right' });
      else if (row.kind === 'choice') E.font.text(g, '< ' + String(row.get()).replace(/[‹›·—]/g, '-') + ' >', vx + vw, yy + 2, '#ffffff', { outline: false, font: 'tiny', align: 'right' });
    });
    if (TABS[D.tab] === 'VIEW' && R[D.row] && R[D.row].label === 'STATE JSON') { const s = JSON.stringify(game.debug ? game.debug.snapshot() : {}) || ''; const lines = O.wrap(s, w - 16, 1); lines.slice(D.statePage * 10, D.statePage * 10 + 10).forEach((ln, i) => E.font.text(g, ln, x + 8, y + h - 130 + i * 9, '#9aa2c8', { outline: false, font: 'tiny' })); }
    if (D.msgT > 0 && D.msg) O.text(g, D.msg, x + w / 2, y + h - 26, '#ffd060', { align: 'center' });
    E.font.text(g, 'Q/E L1/R1 TABS - UP/DOWN ROW - LEFT/RIGHT CHANGE (SHIFT FINE) - ACT/RESET - TURBO RESETS TAB - BACK CLOSES', x + 6, y + h - 12, '#7a82aa', { outline: false, font: 'tiny' });
  }
});
const fmtv = v => Math.abs(v) < .01 && v !== 0 ? v.toExponential(1) : Math.abs(v) < 1 ? v.toFixed(3) : Math.abs(v) < 100 ? v.toFixed(2) : v.toFixed(0);
function applyCheats() {
  const c = D.cheats, ctx = O.ctx;
  if (ctx && ctx.athletes) for (const a of ctx.athletes) if (a.human && a.player === 0) { a.pilot.cheat = c.perfect ? 'perfect' : null; a.infHype = c.infHype; if (!c.autopilot && !c.perfect && a.input) O.AutoPlayer.release(a.input); }
}
O.bus.on('*', () => {});
/** a day's results simulated (dev jumps to later days, sample podiums) */
function simulateDay(m, id) {
  const def = O.EVENTS[id], r = E.rng(O.hashStr(m.seed + id)), order = O.NATIONS.map(n => ({ n, k: n.skills[id] + O.gauss(r) * .05 })).sort((a, b) => b.k - a.k);
  const lower = def.measure.better === 'lower', wr = def.measure.wr[0];
  const rows = order.map((q, i) => { const v = def.matchEvent ? 8 - i : +(lower ? wr * (1.02 + i * .015) : wr * (.97 - i * .02)).toFixed(2); return { a: { nat: q.n, name: q.n.athlete, short: q.n.athlete.split(' ')[0], human: m.players.some(p => p.nat === q.n.id), player: 0, notes: [], id: q.n.id }, v, rank: i + 1, medal: i < 3 ? i + 1 : 0, display: def.matchEvent ? (i === 0 ? 'GOLD' : 'PLACED ' + (i + 1)) : def.measure.fmt(v), notes: [], points: 0 }; });
  const res = { event: id, rows, records: [] }; m.lastResults = res; m.lastEvent = id; O.flow.commit(m, res, def);
}
O.simulateDay = simulateDay;
// the ` key opens and closes the panel anywhere but in a hub session
E.HOOKS.step.push(g => { if (!O.inHub && !D.isOpen && g.input.pressed('dev')) D.open(); });
// rig skeletons and the input display, drawn over everything while asked for
E.HOOKS.draw.push((g, r, ctx2d) => {
  if (!D.isOpen && !D.inputs && !D.skeleton) return;
  if (D.skeleton && O.ctx && O.ctx.athletes) for (const a of O.ctx.athletes) if (a.rig && a.rig.debug) try { a.rig.debug(r); } catch (e) { /* the rig may not be on screen */ }
  if (D.inputs) { const h = game.input.history || []; h.slice(-12).forEach((e, i) => { E.font.text(ctx2d, (e.dir || 5) + ' ' + (e.pressed || []).join('+'), 6, 40 + i * 9, '#4fe0a8', { outline: false, font: 'tiny' }); }); }
});
})();
