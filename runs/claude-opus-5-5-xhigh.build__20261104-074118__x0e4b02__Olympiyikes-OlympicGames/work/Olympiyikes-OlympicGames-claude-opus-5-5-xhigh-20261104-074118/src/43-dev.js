// Dev mode (the pause menu's "Dev mode", or the ` key; never in an AI Hub session): a pixel panel over the right of
// the screen with tabs TUNE · GLOBAL · CHEATS · JUMP · VIEW · DATA. The event's and the global tunables as live
// sliders with reset to defaults, cheats, jumps to any scene, view tools, and the data tools.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp } = E;
const UI = O.UI;
const TABS = ['TUNE', 'GLOBAL', 'CHEATS', 'JUMP', 'VIEW', 'DATA'];
const SONGS = ['title', 'menu', 'parade', 'sprint', 'javelin', 'swim', 'diving', 'archery', 'iron', 'alpine', 'yikesface', 'icesurf', 'lounge', 'organ', 'table', 'closing'];
const STINGS = ['wr', 'yikes', 'laurel', 'fail', 'gameover', 'victory', 'horn', 'tease'];
const SFX = ['gun', 'beep', 'thunk', 'boing', 'twang', 'thwack', 'clank', 'slam', 'splash', 'slap', 'bubbles', 'swish', 'crunch', 'scrape', 'clack', 'brush', 'puck', 'check', 'glass', 'horn', 'buzzer', 'whistle', 'cowbell', 'camera', 'firework', 'medal', 'cough', 'alarm', 'pop'];
const CUES = ['start', 'lead', 'close', 'photo', 'wr', 'yikes', 'falsestart', 'foul', 'turbo', 'win', 'rivalBeat', 'rivalWins', 'idle'];
const LINES = [['chip', 'AND THEY\'RE OFF!'], ['vera', 'I HELD A WORLD RECORD ONCE. FOR ELEVEN MINUTES.'], ['pa', 'LADIES AND GENTLEMEN, A NEW WORLD RECORD!'], ['max', 'SECOND PLACE IS JUST FIRST LOSER.'], ['yikesy', 'YIIIKES!'], ['coach', 'WATCH ME FIRST! THEN YOU!']];

const Dev = O.Dev = {
  isOpen: false, live: false, tab: 0, row: 0, scroll: 0, keepScale: 1, speed: 1,
  autopilot: false, perfect: false, god: false, infHype: false, hideHud: false, photo: false, skeleton: false, bodies: false, inputs: false, lightsOff: false, freeCam: false,
  song: 0, sting: 0, sfx: 0, cue: 0, line: 0, jumpEv: 0, jumpDay: 1, jumpRank: 1, jumpBeat: 0, statePage: 0, phase: 0, rep: 0,
  open() {
    if (O.inHub) return false;
    if (game.paused) game.resume();
    if (game.shell && game.shell.screen) { try { game.shell.hide(); } catch (e) { /* the engine's screen is gone already */ } }
    this.isOpen = true; this.keepScale = game.timeScale; game.timeScale = 0; this.row = 0; this.scroll = 0; UI.sfx('pause'); for (const p of game.players) p.consumeAll();
    return true;
  },
  close() { this.isOpen = false; this.live = false; game.timeScale = this.keepScale || 1; for (const p of game.players) p.consumeAll(); UI.sfx('cancel'); },
  ev() { const c = O.Run.ctx; return game.sceneName && game.sceneName.startsWith('ev:') && c ? c.def : null; },
  rows() {
    const t = TABS[this.tab], ev = this.ev(), out = [];
    const slider = (group, key) => { const sp = O.tune.specs(group)[key], T = O.tune.get(group); return { kind: 'slider', label: sp.label, get: () => T[key], set: v => O.tune.set(group, key, v), def: sp.def, min: sp.min, max: sp.max, step: sp.step }; };
    if (t === 'TUNE') {
      if (!ev) out.push({ kind: 'info', label: 'Open the panel during an event to tune it.' });
      else { for (const k in O.tune.specs(ev.id)) out.push(slider(ev.id, k)); const n = Object.keys(O.tune.changed(ev.id)).length; out.push({ kind: 'button', label: 'RESET TO DEFAULTS' + (n ? ' (' + n + ' CHANGED)' : ''), act: () => O.tune.reset(ev.id) }, { kind: 'button', label: 'COPY JSON', act: () => copy(O.tune.json(ev.id)) }); }
      out.push({ kind: 'toggle', label: 'KEEP AFTER RELOAD', get: () => O.store.get('tuneKeep', false), set: v => { O.store.set('tuneKeep', v); O.store.set('tune', v ? O.tune.changedAll() : null); } });
    } else if (t === 'GLOBAL') {
      for (const k in O.tune.specs('G')) out.push(slider('G', k));
      out.push({ kind: 'button', label: 'RESET TO DEFAULTS', act: () => O.tune.reset('G') }, { kind: 'button', label: 'COPY JSON', act: () => copy(O.tune.json('G')) });
    } else if (t === 'CHEATS') {
      const tg = (label, key) => ({ kind: 'toggle', label, get: () => this[key], set: v => { this[key] = v; if (key === 'perfect' && !v) { const c = O.Run.ctx; if (c) c.athletes.forEach(a => { if (a.player === 0) a.cheat = null; }); } } });
      out.push(tg('AUTOPILOT P1', 'autopilot'), tg('PERFECT P1', 'perfect'), tg('GOD MODE (NO WIPEOUTS)', 'god'), tg('INFINITE HYPE', 'infHype'));
      out.push({ kind: 'button', label: 'WIN NOW (GOLD)', act: () => this.cheat('win') }, { kind: 'button', label: 'LOSE NOW (8TH)', act: () => this.cheat('lose') }, { kind: 'button', label: 'DNF NOW', act: () => this.cheat('dnf') });
      if (ev && ev.phases) out.push({ kind: 'choice', label: 'SKIP TO PHASE', options: ev.phases.map(p => p.toUpperCase()), get: () => this.phase, set: v => this.phase = v, act: () => this.cheat('phase') });
      out.push({ kind: 'button', label: 'NEXT ATTEMPT', act: () => this.cheat('next') }, { kind: 'button', label: 'UNLOCK ALL LAURELS', act: () => this.cheat('laurels') }, { kind: 'button', label: 'TORCHES +3', act: () => this.cheat('torches') }, { kind: 'choice', label: 'GIVE MEDAL', options: ['GOLD', 'SILVER', 'BRONZE'], get: () => this.rep, set: v => this.rep = v, act: () => this.cheat('medal') });
    } else if (t === 'JUMP') {
      const evs = O.SINGLE_ORDER;
      out.push({ kind: 'choice', label: 'EVENT', options: evs.map(e => O.EVENTS[e].short || e), get: () => this.jumpEv, set: v => this.jumpEv = v, act: () => this.jump('event') });
      out.push({ kind: 'choice', label: 'GAMES DAY', options: O.EVENT_ORDER.map((e, i) => 'DAY ' + (i + 1)), get: () => this.jumpDay - 1, set: v => this.jumpDay = v + 1, act: () => this.jump('day') });
      out.push({ kind: 'button', label: 'OPENING CEREMONY', act: () => this.jump('opening') });
      out.push({ kind: 'choice', label: 'CLOSING + ENDING', options: ['RANK 1', 'RANK 2', 'RANK 5'], get: () => this.jumpRank, set: v => this.jumpRank = v, act: () => this.jump('closing') });
      out.push({ kind: 'button', label: 'PODIUM (SAMPLE)', act: () => this.jump('podium') }, { kind: 'button', label: 'MEDAL TABLE (SAMPLE)', act: () => this.jump('medals') }, { kind: 'button', label: 'RESULTS (SAMPLE)', act: () => this.jump('results') });
      out.push({ kind: 'choice', label: 'STORY BEAT', options: Object.keys(O.BEATS).map(k => k.toUpperCase()), get: () => this.jumpBeat, set: v => this.jumpBeat = v, act: () => this.jump('beat') });
      out.push({ kind: 'button', label: 'ATTRACT MODE', act: () => this.jump('attract') }, { kind: 'button', label: 'POSE LAB', act: () => this.jump('poselab') }, { kind: 'button', label: 'HUB CARD (OFFLINE PREVIEW, FAKE GHOSTS)', act: () => this.jump('hub') }, { kind: 'button', label: 'TITLE', act: () => this.jump('title') });
    } else if (t === 'VIEW') {
      const tg = (label, key, f) => ({ kind: 'toggle', label, get: () => this[key], set: v => { this[key] = v; if (f) f(v); } });
      out.push(tg('RIG SKELETONS', 'skeleton'), tg('PHYSICS BODIES', 'bodies'), tg('INPUT DISPLAY', 'inputs'), { kind: 'toggle', label: 'FPS', get: () => !!game.settings.showFps, set: v => game.settings.set('showFps', v) });
      out.push({ kind: 'toggle', label: 'LIVE (RUN WITH THE PANEL OPEN)', get: () => this.live, set: v => { this.live = v; game.timeScale = v ? this.keepScale || 1 : 0; } });
      out.push({ kind: 'slider', label: 'TIME SCALE', get: () => this.speed, set: v => this.speed = v, def: 1, min: .1, max: 4, step: .1 });
      out.push({ kind: 'button', label: 'FRAME STEP', act: () => { const k = game.timeScale; game.timeScale = 1; this.stepping = true; try { O.Run.ctx && game.sceneName.startsWith('ev:') ? O.Run.update(1 / 120, 1 / 120) : 0; } finally { game.timeScale = k; this.stepping = false; } } });
      out.push(tg('FREE CAMERA', 'freeCam', v => { game.cam.free = v ? { speed: 300 } : null; }), { kind: 'slider', label: 'ZOOM', get: () => game.zoom || 1, set: v => game.setZoom(v), def: 1, min: .5, max: 3, step: .05 });
      out.push(tg('HUD OFF', 'hideHud'), tg('LIGHTS OFF', 'lightsOff'), tg('PHOTO MODE (NO UI)', 'photo'));
      out.push({ kind: 'choice', label: 'STATE JSON', options: ['PAGE 1', 'PAGE 2', 'PAGE 3', 'PAGE 4'], get: () => this.statePage, set: v => this.statePage = v, act: () => {} });
    } else if (t === 'DATA') {
      out.push({ kind: 'slider', label: 'MEET SEED', get: () => O.meet ? O.meet.seed % 1000 : O.seed % 1000, set: v => { if (O.meet) O.meet.seed = Math.round(v); else O.seed = Math.round(v); }, def: 0, min: 0, max: 999, step: 1 });
      out.push({ kind: 'button', label: 'RESET RECORDS', act: () => { O.Records.reset(); game.note('RECORDS RESET'); } }, { kind: 'button', label: 'RESET LAURELS', act: () => { O.Records.resetLaurels(); game.note('LAURELS RESET'); } }, { kind: 'button', label: 'CLEAR THE GAMES SAVE', act: () => { O.store.del('games'); game.note('SAVE CLEARED'); } }, { kind: 'button', label: 'CLEAR GHOSTS', act: () => { O.Ghost.clearAll(); game.note('GHOSTS CLEARED'); } });
      out.push({ kind: 'choice', label: 'SONG', options: SONGS.map(s => s.toUpperCase()), get: () => this.song, set: v => this.song = v, act: () => O.Music.play(SONGS[this.song]) });
      out.push({ kind: 'choice', label: 'STING', options: STINGS.map(s => s.toUpperCase()), get: () => this.sting, set: v => this.sting = v, act: () => O.Music.sting(STINGS[this.sting]) });
      out.push({ kind: 'choice', label: 'SOUND EFFECT', options: SFX.map(s => s.toUpperCase()), get: () => this.sfx, set: v => this.sfx = v, act: () => game.audio.sfx(SFX[this.sfx]) });
      out.push({ kind: 'choice', label: 'VOICE LINE', options: LINES.map(l => l[0].toUpperCase()), get: () => this.line, set: v => this.line = v, act: () => O.Comms.say(LINES[this.line][0], LINES[this.line][1], { prio: 9 }) });
      out.push({ kind: 'choice', label: 'COMMENTARY CUE', options: CUES.map(s => s.toUpperCase()), get: () => this.cue, set: v => this.cue = v, act: () => O.Comms.cue(CUES[this.cue], { name: 'DASH GOLDBERRY', nation: 'SUNVALE' }, { force: true }) });
    }
    return out;
  },
  set(group, key, v) { O.tune.set(group, key, v); },
  cheat(name) {
    const ctx = O.Run.ctx, inEv = this.ev(), m = O.meet;
    if (name === 'laurels') { for (const id in O.EVENTS) { const L = O.EVENTS[id].laurel; if (L) { const all = Object.assign({}, O.Records.laurels(), { [L.id]: 1 }); O.store.set('laurels', all); } } game.note('ALL LAURELS UNLOCKED'); return; }
    if (name === 'torches') { if (m) { m.torches = Math.min(9, (m.torches || 0) + 3); game.note('TORCHES: ' + m.torches); } return; }
    if (name === 'medal') { if (m && m.players[0]) { const k = 'gsb'[this.rep], n = m.players[0].nation, t = m.medals[n] || (m.medals[n] = { g: 0, s: 0, b: 0 }); t[k]++; game.note('MEDAL GIVEN'); } return; }
    if (!inEv || !ctx) { game.note('NOT IN AN EVENT'); return; }
    if (name === 'next') { O.fastForward(ctx); return; }
    if (name === 'phase') { const def = ctx.def; if (def.skipTo) def.skipTo(ctx, this.phase); else O.fastForward(ctx); this.close(); return; }
    // win / lose / dnf: the results with the first human placed so
    const res = O.buildResults(ctx), rows = res.rows, h = rows.find(r => r.human) || rows[0]; if (!h) return;
    const ev = ctx.def, wr = O.Records.wr(ev.id), fmt = v => ev.format.type === 'match' ? '' : ev.measure.fmt(v);
    rows.splice(rows.indexOf(h), 1);
    if (name === 'win') { h.perf = ev.format.type === 'match' ? (h.perf || 3) : wr != null ? (ev.measure.better === 'lower' ? wr * 1.001 : wr * .999) : h.perf; h.display = ev.format.type === 'match' ? 'WON' : fmt(h.perf); rows.unshift(h); }
    else if (name === 'lose') { rows.push(h); h.display = ev.format.type === 'match' ? 'LOST' : h.display; }
    else { h.perf = null; h.display = 'DNF'; h.notes = ['DNF']; rows.push(h); }
    rows.forEach((r, i) => { r.rank = i + 1; r.medal = i < 3 ? 'gsb'[i] : null; r.points = O.points(ev.id, r.perf); if (name === 'dnf' && r === h) r.medal = null; });
    this.close(); O.Run.setPhase('end'); O.Run.endT = 1; game.timeScale = 1; O.flow.eventDone(res);
  },
  jump(target) {
    this.close(); game.timeScale = 1; O.Attract.on = false;
    const evs = O.SINGLE_ORDER;
    if (target === 'event') { const id = evs[this.jumpEv]; O.meet = O.flow.quickMeet(id); game.go('ev:' + id, {}, { fade: 'iris' }); }
    else if (target === 'day') { O.sampleMeet(null, 'day', this.jumpDay); game.go('dayCard', {}); }
    else if (target === 'opening') { O.meet = O.flow.newMeet({ mode: 'games', events: O.EVENT_ORDER.slice(), players: [{ nation: 'SUN', input: game.input }] }); game.go('opening', {}); }
    else if (target === 'closing') { O.sampleMeet(null, 'closing', 12); const m = O.meet, rank = [1, 2, 5][this.jumpRank]; const order = O.NATION_IDS.slice(); order.splice(order.indexOf('SUN'), 1); order.splice(rank - 1, 0, 'SUN'); m.medals = {}; order.forEach((n, i) => m.medals[n] = { g: 9 - i, s: 2, b: 1 }); m.day = 11; game.go('closing', {}); }
    else if (target === 'podium' || target === 'medals' || target === 'results') { O.sampleMeet(evs[this.jumpEv], target); game.go(target, {}); }
    else if (target === 'beat') { O.sampleMeet(null, 'beat', 7); game.go('beat', { id: Object.keys(O.BEATS)[this.jumpBeat], then: 'next' }); }
    else if (target === 'attract') { game.go('title', {}); game.after(.3, () => O.Attract.begin('title')); }
    else if (target === 'poselab') game.go('poselab', {});
    else if (target === 'hub') { if (O.Hub) { O.Hub.offline(); game.go('hubCard', {}); } }
    else game.go('title', {});
  },
  update(rdt) {
    const I = game.input, rows = this.rows(); for (const p of game.players) p.suppress('pause');
    if (I.pressed('cancel') || I.pressed('dev')) { this.close(); return; }
    if (I.pressed('tabL') || I.pressed('tabR')) { this.tab = (this.tab + (I.pressed('tabR') ? 1 : -1) + TABS.length) % TABS.length; this.row = 0; this.scroll = 0; UI.sfx('select'); }
    if (I.repeat('up', .3, .07)) { this.row = (this.row - 1 + rows.length) % rows.length; UI.sfx('select'); } if (I.repeat('down', .3, .07)) { this.row = (this.row + 1) % rows.length; UI.sfx('select'); }
    const r = rows[this.row]; if (!r) return;
    const fine = I.down('turbo') || I.down('alt'), dir = I.repeat('left', .5, .05) ? -1 : I.repeat('right', .5, .05) ? 1 : 0;
    if (dir) { if (r.kind === 'slider') { const st = r.step * (fine ? 1 : Math.max(1, Math.round((r.max - r.min) / r.step / 50))); r.set(clamp(+(r.get() + dir * st).toFixed(6), r.min, r.max)); } else if (r.kind === 'choice') r.set((r.get() + dir + r.options.length) % r.options.length); else if (r.kind === 'toggle') r.set(!r.get()); }
    if (I.pressed('confirm') || I.pressed('action')) { UI.sfx('confirm'); if (r.kind === 'slider') r.set(r.def); else if (r.kind === 'toggle') r.set(!r.get()); else if (r.act) r.act(); }
    if (I.pressed('turbo') && !I.down('alt')) { const t = TABS[this.tab]; if (t === 'TUNE' && this.ev()) O.tune.reset(this.ev().id); else if (t === 'GLOBAL') O.tune.reset('G'); UI.sfx('confirm'); }
    // the mouse: hover focuses, click activates or tabs, drag a slider, the wheel nudges
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked(), L = this.layout;
    if (L && p && I.lastDevice === 'mouse') { const k = L.rows.findIndex(q => UI.hit(p, ...q.rect)); if (k >= 0) { this.row = L.rows[k].i; if (I.down('action') || (I.held && I.held.has && I.held.has('Mouse0'))) { const q = L.rows[k], rr = rows[q.i]; if (rr && rr.kind === 'slider' && q.bar) { const u = clamp((p[0] - q.bar[0]) / q.bar[2], 0, 1); rr.set(+(rr.min + u * (rr.max - rr.min)).toFixed(4)); } } } }
    if (L && c) { const tk = L.tabs.findIndex(q => UI.hit(c, ...q)); if (tk >= 0) { this.tab = tk; this.row = 0; } const k = L.rows.findIndex(q => UI.hit(c, ...q.rect)); if (k >= 0) { const rr = rows[L.rows[k].i]; if (rr && rr.kind === 'toggle') rr.set(!rr.get()); else if (rr && rr.act && rr.kind !== 'slider') rr.act(); } }
    if (this.live) { for (const q of game.players) for (const a of ['mashL', 'mashR', 'action', 'turbo', 'alt', 'up', 'down', 'left', 'right']) q.suppress(a); }
  },
  draw(g, W, H) {
    const rows = this.rows(), x0 = Math.round(W * .55), w = W - x0 - 6, y0 = 6, h = H - 12;
    UI.panel(g, x0, y0, w, h, { alpha: .94, trim: '#4fe0a8' });
    UI.text(g, 'DEV MODE', x0 + 8, y0 + 5, '#4fe0a8'); UI.text(g, this.live ? 'LIVE' : 'FROZEN', x0 + w - 44, y0 + 5, this.live ? '#ffe066' : '#aab0d0');
    const L = this.layout = { tabs: [], rows: [] };
    let tx = x0 + 6; TABS.forEach((t, i) => { const tw = UI.tw(t, 1) + 8; L.tabs.push([tx, y0 + 16, tw, 12]); px.rect(g, tx, y0 + 16, tw, 12, i === this.tab ? '#4fe0a8' : '#1c2148'); UI.text(g, t, tx + 4, y0 + 18, i === this.tab ? '#06120a' : '#c0c6e8', { shadow: false }); tx += tw + 2; });
    const rh = 15, top = y0 + 34, vis = Math.floor((h - 60) / rh);
    if (this.row < this.scroll) this.scroll = this.row; if (this.row >= this.scroll + vis) this.scroll = this.row - vis + 1;
    rows.slice(this.scroll, this.scroll + vis).forEach((r, k) => {
      const i = this.scroll + k, y = top + k * rh, f = i === this.row; L.rows.push({ i, rect: [x0 + 4, y - 2, w - 8, rh - 1] });
      if (f) px.rect(g, x0 + 4, y - 2, w - 8, rh - 1, '#24305a');
      if (r.kind === 'info') { UI.text(g, r.label, x0 + 8, y, '#aab0d0'); return; }
      const changed = r.kind === 'slider' && Math.abs(r.get() - r.def) > 1e-9;
      const maxL = w - (r.kind === 'slider' ? 120 : r.kind === 'choice' ? 16 + UI.tw('< ' + r.options[r.get()] + ' >', 1) : 40); let lab = r.label.toUpperCase(); while (UI.tw(lab, 1) > maxL && lab.length > 4) lab = lab.slice(0, -2) + '…'.slice(0, 0); if (UI.tw(r.label.toUpperCase(), 1) > maxL) lab = lab.replace(/\.*$/, '') + '.';
      UI.text(g, lab, x0 + 8, y, changed ? '#f2b632' : f ? '#ffffff' : '#c8ccec');
      if (r.kind === 'slider') { const bx = x0 + w - 104, bw = 60, u = (r.get() - r.min) / (r.max - r.min), du = (r.def - r.min) / (r.max - r.min); px.rect(g, bx, y + 3, bw, 3, '#2a2f55'); px.rect(g, bx, y + 3, Math.round(bw * u), 3, changed ? '#f2b632' : '#4fe0a8'); px.rect(g, bx + Math.round(bw * du), y + 1, 1, 7, '#ffffff'); L.rows[L.rows.length - 1].bar = [bx, y, bw, 8]; const v = r.get(), s = Math.abs(v) < .01 && v !== 0 ? v.toExponential(1) : (+v.toFixed(r.step < .01 ? 4 : r.step < 1 ? 2 : 0)).toString(); UI.text(g, s, x0 + w - 40, y, '#ffffff'); }
      else if (r.kind === 'toggle') { const on = !!r.get(); px.rect(g, x0 + w - 30, y, 18, 8, on ? '#4fe0a8' : '#3a3f66'); px.rect(g, x0 + w - 30 + (on ? 10 : 0), y, 8, 8, '#ffffff'); }
      else if (r.kind === 'choice') { const s = '< ' + r.options[r.get()] + ' >'; UI.text(g, s, x0 + w - 8 - UI.tw(s, 1), y, '#ffe066'); }
      else if (r.kind === 'button') UI.text(g, '▸', x0 + w - 16, y, '#4fe0a8');
    });
    if (TABS[this.tab] === 'VIEW') { const snap = JSON.stringify(game.debug.snapshot()), per = 240, part = snap.slice(this.statePage * per, (this.statePage + 1) * per); UI.wrap(part, w - 16, 1).slice(0, 4).forEach((l, i) => E.font.text(g, l, x0 + 8, y0 + h - 64 + i * 7, '#8a90b8', { font: 'tiny', outline: false })); }
    O.Prompt.strip(g, [['moveV', 'ROW'], ['moveH', 'CHANGE'], ['confirm', 'DO / RESET'], ['turbo', 'RESET TAB'], [['tabL', 'tabR'], 'TAB'], ['cancel', 'CLOSE']], x0 + w / 2, y0 + h - 16, { bg: false });
  }
};
function copy(text) { try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) { /* no clipboard */ } if (typeof console !== 'undefined') console.log(text); game.note('COPIED TO THE CLIPBOARD'); }
O.openDev = () => Dev.open();
O.restartEvent = () => { if (!Dev.ev()) return game.note('NOT IN AN EVENT'); game.resume(); const id = O.Run.ctx.def.id; for (const a of O.Run.ctx.athletes) a.attempts = []; game.go('ev:' + id, {}, { fade: 'iris' }); };
O.showEventHelp = () => { if (!Dev.ev()) return game.note('NOT IN AN EVENT'); const ev = O.Run.ctx.def; game.note(ev.howto.goal.toUpperCase(), 4); };
O.god = a => !!(Dev.god && a && a.human);
// the panel and the view tools over every scene
O.overlays.push((r, g) => {
  if (Dev.photo) return;
  if (Dev.inputs) { const h = game.input.history || []; h.slice(-12).forEach((e, i) => { const x = 8 + i * 14, y = r.H - 60; UI.text(g, String(e.dir), x, y, '#ffffff'); (e.pressed || []).slice(0, 2).forEach((a, k) => O.Prompt.icon(g, x - 2, y + 9 + k * 12, a)); }); }
  if (Dev.isOpen) Dev.draw(g, r.W, r.H);
});
E.HOOKS.input.push(gm => { if (Dev.isOpen) for (const p of gm.players) p.suppress('pause'); if (!O.inHub && gm.input.pressed('dev') && !Dev.isOpen && gm.sceneName && !(gm.shell && gm.shell.screen)) Dev.open(); });
E.HOOKS.draw.push((gm, r, g) => { if (Dev.lightsOff) gm.lights.enabled = false; if (Dev.skeleton && O.Run.ctx && gm.sceneName.startsWith('ev:')) for (const a of O.Run.ctx.athletes) if (a.rig) try { a.rig.debug(r); } catch (e) { /* the rig is drawn elsewhere */ } if (Dev.bodies && O.Run.ctx && O.Run.ctx.def.debugDraw) O.Run.ctx.def.debugDraw(O.Run.ctx, r, g); });
// keep tuning after a reload when asked
if (O.store.get('tuneKeep', false)) O.tune.load(O.store.get('tune', {}));
})();
