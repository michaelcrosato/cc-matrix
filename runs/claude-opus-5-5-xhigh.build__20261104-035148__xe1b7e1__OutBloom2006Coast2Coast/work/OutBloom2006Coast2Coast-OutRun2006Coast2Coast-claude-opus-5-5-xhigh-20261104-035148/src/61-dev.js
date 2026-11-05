/* OutBloom — Dev Mode, from the pause menu (or F9 in a race): a large, pad-navigable canvas panel over the frozen race.
 * Tabs (L1/R1 or Q/E): Tuning (a live slider for every gameplay number, grouped, each with its value, a reset and a dot
 * when it differs; RESET ALL; keep after reload), Cheats, Warp (any stage at 0/25/50/75/95 %, the fork, the next
 * checkpoint, a forced fork side, any ending, any request now, spawn traffic, a ribbon pair, a rival, time of day and
 * weather, the attract demo, the credits, any mission), Audio (a jukebox with layers, every sound, every voice in every
 * mood, the reverb), Save (seeds, unlock all, clear the career, set ranks, reset the profile with a confirmation, the
 * profile as paged JSON) and Info (version, seed, route, the last 20 events, errors). Back returns to the pause menu. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const game = OB.game, UI = OB.UI, C = UI.COL;
const TABS = ['TUNING', 'CHEATS', 'WARP', 'AUDIO', 'SAVE', 'INFO'];
const D = OB.Dev = { isOpen: false, tab: 0, row: 0, scroll: 0, keep: false, confirm: null, jsonPage: 0, drag: null, msg: '', msgT: 0 };
try { const s = E.store.get('outbloom:dev', null); if (s && s.keep) { D.keep = true; for (const [k, v] of Object.entries(s.tuning || {})) if (OB.TUNING_DEFAULTS[k] !== undefined) OB.tuning[k] = v; } } catch (e) { /* storage blocked */ }
const saveKeep = () => { try { E.store.set('outbloom:dev', D.keep ? { keep: true, tuning: OB.tuning } : { keep: false }); } catch (e) { /* storage blocked */ } };
const note = m => { D.msg = m; D.msgT = 2.5; };
D.open = () => { if (OB.env.hub) return; D.isOpen = true; D.row = 0; D.scroll = 0; D.confirm = null; game.resume(); D.prevScale = game.timeScale; game.timeScale = 0; OB.bus.emit('dev:open', {}); };
D.close = (toPause = true) => { D.isOpen = false; game.timeScale = OB.tune('gameSpeed') * (OB.cheats.slow ? .25 : OB.cheats.fast ? 2 : 1); if (toPause && game.scene && game.scene.pausable) game.pause('player'); };
const race = () => OB.Race.current;
const CHEAT_ROWS = [['infiniteTime', 'Infinite time'], ['noCollide', 'No collisions'], ['perfectRequests', 'Perfect requests'], ['autoDrive', 'Auto drive (the bot drives)'], ['autoDrift', 'Auto drift'], ['freezeTraffic', 'Freeze traffic'], ['noTraffic', 'No traffic'], ['invincibleMood', 'Invincible mood'], ['hitboxes', 'Show hitboxes'], ['overlay', 'Debug overlay'], ['hideHud', 'Hide the HUD'], ['slow', 'Slow motion x0.25'], ['fast', 'Fast x2']];
/** the rows of the open tab: { label, value (text), left, right, act, slider (0..1), differs } */
function rows() {
  const r = race(), T = OB.tuning;
  switch (D.tab) {
    case 0: { const out = [{ label: 'RESET ALL TO DEFAULTS', act: () => { OB.resetTuning(); saveKeep(); note('Every value back to its default'); } }, { label: 'Keep after reload', value: D.keep ? 'ON' : 'OFF', act: () => { D.keep = !D.keep; saveKeep(); } }];
      let group = null;
      for (const sp of OB.TUNING_SPEC) { if (sp.group !== group) { group = sp.group; out.push({ label: '- ' + group.toUpperCase() + ' -', header: true }); }
        const v = T[sp.key], step = sp.step; out.push({ key: sp.key, label: sp.label, value: (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(3)) + '', slider: (v - sp.min) / (sp.max - sp.min), differs: Math.abs(v - OB.TUNING_DEFAULTS[sp.key]) > 1e-9,
          left: () => { OB.setTune(sp.key, v - step); saveKeep(); }, right: () => { OB.setTune(sp.key, v + step); saveKeep(); }, act: () => { OB.resetTuning(sp.key); saveKeep(); }, set: u => { OB.setTune(sp.key, sp.min + Math.round(u * (sp.max - sp.min) / step) * step); saveKeep(); } }); }
      return out; }
    case 1: return CHEAT_ROWS.map(([k, l]) => ({ label: l, value: OB.cheats[k] ? 'ON' : 'OFF', act: () => { OB.cheats[k] = !OB.cheats[k]; if (k === 'slow' || k === 'fast') { if (OB.cheats.slow && OB.cheats.fast) OB.cheats[k === 'slow' ? 'fast' : 'slow'] = false; } } }));
    case 2: {
      const out = [];
      out.push({ label: 'Warp to stage', value: (D.wStage = D.wStage || 'S1') + ' ' + OB.STAGES[D.wStage].name + ' at ' + ([0, 25, 50, 75, 95][D.wPct = D.wPct || 0]) + '%', left: () => { const ks = Object.keys(OB.STAGES); D.wStage = ks[(ks.indexOf(D.wStage) + ks.length - 1) % ks.length]; }, right: () => { const ks = Object.keys(OB.STAGES); D.wStage = ks[(ks.indexOf(D.wStage) + 1) % ks.length]; }, act: () => { D.wPct = (D.wPct + 1) % 5; } });
      out.push({ label: 'GO: warp now', act: () => { if (!r) return note('Start a race first'); game.debug.teleport(D.wStage, [0, .25, .5, .75, .95][D.wPct], 0); D.close(false); } });
      out.push({ label: 'Warp to the fork', act: () => { if (!r) return; const d = r.p1; if (!d.road.junctionAt) return note('This stage ends at a goal'); r.place(d, d.stage, d.road.junctionAt - 60 * OB.SEG, d.car.x); D.close(false); } });
      out.push({ label: 'Warp to the next checkpoint', act: () => { if (!r) return; const d = r.p1; if (!d.road.junctionAt) return note('No checkpoint after this stage'); r.place(d, d.stage, d.road.length - 6 * OB.SEG, d.car.x); D.close(false); } });
      out.push({ label: 'Force fork side', value: D.force ? (D.force < 0 ? 'LEFT' : 'RIGHT') : 'FREE', act: () => { D.force = D.force === -1 ? 1 : D.force === 1 ? 0 : -1; if (r) r.forceSide = D.force; } });
      out.push({ label: 'Play ending', value: 'GOAL ' + (D.eGoal = D.eGoal || 'A') + ' ' + (D.eMood = D.eMood || 'bloom').toUpperCase(), left: () => { D.eGoal = 'ABCDE'[('ABCDE'.indexOf(D.eGoal) + 4) % 5]; }, right: () => { D.eGoal = 'ABCDE'[('ABCDE'.indexOf(D.eGoal) + 1) % 5]; }, act: () => { D.eMood = { bloom: 'bud', bud: 'wilt', wilt: 'bloom' }[D.eMood]; } });
      out.push({ label: 'GO: play that ending', act: () => { D.close(false); game.go('ending', { mood: D.eMood, clock: 20, cfg: { mode: 'arcade', paint: '#e8463a', afterEnding: 'menu' }, players: [{ goal: D.eGoal, passenger: (r && r.p1.passenger) || 'marisol', car: 'orchidea', score: 0, stats: { bestDrift: 0, nearMisses: 0, overtakes: 0, slipTime: 0, maxSpeed: 0, crashes: 0 } }] }); } });
      out.push({ label: 'Trigger request', value: (D.req = D.req || 'balloons').toUpperCase(), left: () => { D.req = OB.REQ_ORDER[(OB.REQ_ORDER.indexOf(D.req) + 13) % 14]; }, right: () => { D.req = OB.REQ_ORDER[(OB.REQ_ORDER.indexOf(D.req) + 1) % 14]; }, act: () => { if (!r) return; if (!r.req) { const dir = new OB.Requests.Director(r, { passenger: r.p1.passenger || 'marisol' }); r.rules.push(dir); } if (r.req.cur) r.req.cur = null; r.req.start({ key: 'dev:' + OB.now(), stage: r.p1.stage, z: r.p1.car.z + 2000, type: D.req }); D.close(false); } });
      out.push({ label: 'Spawn a traffic car ahead', act: () => { if (!r) return; const L = r.traffic.list(r.p1.stage); r.traffic.spawn(L, r.p1.car.z + 2500, { lane: 1 }); note('A car, 2,500 ahead'); } });
      out.push({ label: 'Spawn a ribbon pair ahead', act: () => { if (!r) return; r.traffic.spawnRibbon(r.p1.stage, r.p1.car.z + 3000); note('A ribbon pair ahead'); } });
      out.push({ label: 'Spawn a rival', value: (D.rival = D.rival || 'kiki').toUpperCase(), left: () => { const ps = ['kiki', 'brambles', 'lustres', 'ottavio']; D.rival = ps[(ps.indexOf(D.rival) + 3) % 4]; }, right: () => { const ps = ['kiki', 'brambles', 'lustres', 'ottavio']; D.rival = ps[(ps.indexOf(D.rival) + 1) % 4]; },
        act: () => { if (!r) return; const P = OB.PERSONAS[D.rival], d = new OB.Driver(r, { id: 'r' + (r.drivers.length + 1), kind: 'rival', car: P.car, paint: P.paint, name: P.name, persona: D.rival, brain: new OB.Brain(Object.assign({}, P)), driver: P.rig, driftInput: 'button' }); r.place(d, r.p1.stage, r.p1.car.z + 1500, -.5); d.routeIdx = r.p1.routeIdx; d.routeStr = r.p1.routeStr; d.car.v = r.p1.car.v; r.drivers.push(d); note(P.name + ' joins'); } });
      out.push({ label: 'Time of day', value: (D.tod = D.tod || (r ? OB.STAGES[r.p1.stage].tod : 'noon')).toUpperCase(), left: () => { const k = Object.keys(OB.TOD); D.tod = k[(k.indexOf(D.tod) + k.length - 1) % k.length]; }, right: () => { const k = Object.keys(OB.TOD); D.tod = k[(k.indexOf(D.tod) + 1) % k.length]; }, act: () => { if (!r) return; OB.STAGES[r.p1.stage].tod = D.tod; note('Time of day: ' + D.tod); } });
      out.push({ label: 'Weather', value: (D.wx = D.wx || 'none').toUpperCase(), act: () => { D.wx = { none: 'shower', shower: 'petals', petals: 'fireworks', fireworks: 'none' }[D.wx]; if (r) { const road = r.p1.road; road.events = road.events.filter(e => !e.dev); if (D.wx !== 'none') road.events.push({ kind: D.wx, z0: 0, z1: road.length, dev: true }); } } });
      out.push({ label: 'Play the attract demo', act: () => { D.close(false); OB.Race.current && OB.Race.current.dispose(); OB.Attract.start('menu'); } });
      out.push({ label: 'Play the credits', act: () => { D.close(false); game.go('finale', { players: [{ goal: 'E' }] }); } });
      out.push({ label: 'Start mission', value: (D.mis = D.mis || 'B1') + ' ' + OB.MISSION[D.mis].title, left: () => { const k = OB.MISSIONS.map(m => m.id); D.mis = k[(k.indexOf(D.mis) + k.length - 1) % k.length]; }, right: () => { const k = OB.MISSIONS.map(m => m.id); D.mis = k[(k.indexOf(D.mis) + 1) % k.length]; }, act: () => { D.close(false); game.go('brief', { id: D.mis }); } });
      return out;
    }
    case 3: {
      const out = [];
      const songs = OB.SONGS.concat(Object.values(OB.THEMES));
      out.push({ label: 'Jukebox', value: (D.song = D.song || 0) + 1 + '. ' + songs[D.song].title, left: () => { D.song = (D.song + songs.length - 1) % songs.length; }, right: () => { D.song = (D.song + 1) % songs.length; }, act: () => game.audio.music(songs[D.song], { restart: true, fade: .3 }) });
      for (const L of ['drums', 'perc', 'bass', 'keys', 'pad', 'lead', 'sparkle']) out.push({ label: '  layer: ' + L, value: game.audio.song && game.audio.song.tracks.find(t => t.name === L) ? (game.audio.pos.layers[game.audio.song.tracks.findIndex(t => t.name === L)] > 0 ? 'ON' : 'OFF') : '-', act: () => { const S = game.audio.song; if (!S) return; const i = S.tracks.findIndex(t => t.name === L); if (i < 0) return; game.audio.layer(L, game.audio.pos.layers[i] > 0 ? 0 : 1, .3); } });
      const sfx = ['pop', 'boink', 'sting', 'snap', 'tok', 'chime', 'harp', 'shutter', 'zing', 'whoosh2', 'thunk', 'scrape', 'squealspin', 'splash', 'backfire', 'cheer', 'gull', 'chirp', 'rising', 'deflate', 'plant', 'static', 'thump', 'crackle', 'beep', 'gobeep'];
      out.push({ label: 'Sound effect', value: sfx[D.sfx = D.sfx || 0], left: () => { D.sfx = (D.sfx + sfx.length - 1) % sfx.length; }, right: () => { D.sfx = (D.sfx + 1) % sfx.length; }, act: () => OB.sfx(sfx[D.sfx]) });
      const who = ['marisol', 'vivi', 'juni', 'bruno', 'kiki', 'bram', 'lance', 'ottavio', 'announcer'], moods = ['happy', 'excited', 'angry', 'sad', 'scared'];
      out.push({ label: 'Voice', value: (D.who = D.who || 'marisol').toUpperCase() + ' ' + (D.mood = D.mood || 'happy'), left: () => { D.who = who[(who.indexOf(D.who) + who.length - 1) % who.length]; }, right: () => { D.who = who[(who.indexOf(D.who) + 1) % who.length]; }, act: () => { D.mood = moods[(moods.indexOf(D.mood) + 1) % moods.length]; } });
      out.push({ label: 'GO: speak a sample line', act: () => { const line = OB.line(D.who, 'start') || OB.line(D.who, 'taunt') || 'CHECKPOINT!'; OB.Babble.say(line, D.who, D.mood); note('"' + line + '"'); } });
      out.push({ label: 'Reverb', value: (D.rev = D.rev === undefined ? .15 : D.rev).toFixed(2), slider: D.rev / 1.5, left: () => { D.rev = clamp(D.rev - .05, 0, 1.5); game.audio.reverb(D.rev, .1); }, right: () => { D.rev = clamp(D.rev + .05, 0, 1.5); game.audio.reverb(D.rev, .1); }, set: u => { D.rev = u * 1.5; game.audio.reverb(D.rev, .1); } });
      return out;
    }
    case 4: {
      const P = OB.Profile;
      const out = [{ label: 'Give 1,000 seeds', act: () => { P.grant(1000, 'dev'); note('+1000 seeds'); } },
        { label: 'Unlock everything', act: () => { const d = P.data; for (const m of OB.MISSIONS) d.career[m.id] = Object.assign(d.career[m.id] || {}, { cleared: true, rank: d.career[m.id] && d.career[m.id].rank || 'C', paid: d.career[m.id] ? d.career[m.id].paid : 0, tries: 1 }); d.seeds += 7000; for (const b of OB.BEDS) if (P.bedState(b) !== 'bloomed') P.buy(b.id); P.save(); note('Everything in bloom'); } },
        { label: 'Clear the career', act: () => { P.data.career = {}; P.data.givers = {}; P.save(); note('Career cleared'); } },
        { label: 'Set every mission\'s rank', value: D.rk = D.rk || 'A', left: () => { D.rk = OB.RANKS[(OB.RANKS.indexOf(D.rk) + 3) % 4]; }, right: () => { D.rk = OB.RANKS[(OB.RANKS.indexOf(D.rk) + 1) % 4]; }, act: () => { for (const m of OB.MISSIONS) P.data.career[m.id] = { cleared: true, rank: D.rk, paid: 0, tries: 1 }; P.save(); note('Every mission at ' + D.rk); } },
        { label: D.confirm === 'reset' ? 'REALLY RESET THE PROFILE? (select again)' : 'Reset the profile', danger: true, act: () => { if (D.confirm === 'reset') { P.reset(); D.confirm = null; note('Profile reset'); } else D.confirm = 'reset'; } },
        { label: 'Profile JSON page', value: (D.jsonPage + 1) + '', left: () => { D.jsonPage = Math.max(0, D.jsonPage - 1); }, right: () => { D.jsonPage++; }, act: () => { D.jsonPage++; } }];
      const json = JSON.stringify(P.data).match(/.{1,52}/g) || [], per = 8, page = json.slice(D.jsonPage * per, D.jsonPage * per + per);
      if (!page.length && D.jsonPage) D.jsonPage = 0;
      for (const l of page) out.push({ label: l, mono: true, header: true });
      return out;
    }
    case 5: {
      const out = [{ label: 'Version', value: OB.VERSION + ' / my-3D2dge ' + E.version, header: true }, { label: 'Seed', value: r ? String(r.seed) : '-', header: true }, { label: 'Route', value: r ? (r.p1.routeStr || '-') + ' (' + r.p1.stage + ')' : '-', header: true }, { label: 'Errors', value: String(game.errors.length), header: true }];
      for (const e of OB.bus.last(20).reverse()) out.push({ label: e.t.toFixed(1) + ' ' + e.name, value: JSON.stringify(e.data).slice(0, 34), header: true, mono: true });
      return out;
    }
  }
  return [];
}
D.rows = rows;
D.update = dt => {
  const I = game.input; D.msgT = Math.max(0, D.msgT - dt);
  if (I.pressed('tabL')) { D.tab = (D.tab + TABS.length - 1) % TABS.length; D.row = 0; D.scroll = 0; OB.sfx('tick'); }
  if (I.pressed('tabR')) { D.tab = (D.tab + 1) % TABS.length; D.row = 0; D.scroll = 0; OB.sfx('tick'); }
  const R = rows(); const sel = () => R.findIndex((x, i) => i >= D.row && !x.header);
  if (R[D.row] && R[D.row].header) { const n = sel(); D.row = n >= 0 ? n : 0; }
  const step = d => { let i = D.row; for (let k = 0; k < R.length; k++) { i = (i + d + R.length) % R.length; if (!R[i].header) { D.row = i; break; } } OB.sfx('focus'); };
  if (I.repeat('up', .3, .07)) step(-1); if (I.repeat('down', .3, .07)) step(1);
  const row = R[D.row];
  if (row && I.repeat('left', .3, .06) && row.left) row.left(); if (row && I.repeat('right', .3, .06) && row.right) row.right();
  if (row && I.pressed('confirm') && row.act) { row.act(); OB.sfx('confirm'); }
  if (I.pressed('cancel')) { OB.sfx('back'); if (D.confirm) D.confirm = null; else D.close(true); return; }
  // the mouse: hover selects a row, a click acts, a drag on a slider sets it
  const p = I.pointer && I.pointer(), L = D.layout;
  if (p && L) { const i = Math.floor((p[1] - L.y0) / L.rh) + D.scroll; if (p[0] > L.x && p[0] < L.x + L.w && i >= 0 && i < R.length && !R[i].header && (!D.lastP || D.lastP[1] !== p[1])) D.row = i; D.lastP = p;
    const tabHit = p[1] >= L.ty && p[1] < L.ty + 14 ? Math.floor((p[0] - L.x) / (L.w / TABS.length)) : -1; const c = I.clicked && I.clicked();
    if (c) { if (tabHit >= 0 && tabHit < TABS.length && c[1] < L.ty + 14) { D.tab = tabHit; D.row = 0; D.scroll = 0; } else if (row && row.slider !== undefined && row.set && c[0] > L.sx) row.set(clamp((c[0] - L.sx) / L.sw, 0, 1)); else if (row && row.act) row.act(); }
    if (I.down && I.held.has('Mouse0') && row && row.set && p[0] > L.sx) row.set(clamp((p[0] - L.sx) / L.sw, 0, 1)); }
  const vis = D.layout ? D.layout.n : 14; if (D.row < D.scroll) D.scroll = D.row; if (D.row >= D.scroll + vis) D.scroll = D.row - vis + 1;
};
D.draw = (g, W, H) => {
  const x = Math.max(10, W / 2 - 220), w = Math.min(W - 20, 440), y = 10, h = H - 20, rh = 12, ty = y + 22, y0 = ty + 20, n = Math.floor((h - 60) / rh);
  D.layout = { x, w, y0, rh, ty, n, sx: x + w - 130, sw: 90 };
  const a = g.globalAlpha; g.globalAlpha = .55; px.rect(g, 0, 0, W, H, '#0a0614'); g.globalAlpha = a;
  UI.panel(g, x, y, w, h, { bg: ['#140a24', '#2a1450'], border: C.sea });
  UI.text(g, 'DEV MODE', x + 8, y + 6, { color: C.sea, scale: 1 }); UI.text(g, 'the race is frozen', x + w - 8, y + 6, { align: 'right', color: C.dim });
  TABS.forEach((tn, i) => { const tw = w / TABS.length; px.rect(g, Math.round(x + i * tw + 2), ty, Math.round(tw - 4), 13, i === D.tab ? C.sea : '#2a1a4a'); UI.text(g, tn, x + i * tw + tw / 2, ty + 3, { align: 'center', color: i === D.tab ? '#0a0614' : C.ink, shadow: false }); });
  const R = rows();
  for (let k = 0; k < n && D.scroll + k < R.length; k++) {
    const i = D.scroll + k, row = R[i], yy = y0 + k * rh, on = i === D.row;
    if (on) px.rect(g, x + 4, yy - 1, w - 8, rh, '#4a2a6a');
    if (on) UI.frame(g, x + 3, yy - 2, w - 6, rh + 2, Math.floor(game.real * 3) % 2 ? C.sun : '#fff0a0');
    UI.text(g, row.label, x + 10, yy + 1, { color: row.header ? (row.mono ? '#c8ffc8' : C.dim) : row.danger ? C.bad : on ? C.sun : C.ink, shadow: false });
    if (row.differs) px.disc(g, x + w - 140, yy + 4, 2, C.pink);
    if (row.slider !== undefined) { UI.slider(g, D.layout.sx, yy, D.layout.sw, row.slider, on); UI.text(g, row.value, x + w - 10, yy + 1, { align: 'right', shadow: false }); }
    else if (row.value !== undefined) UI.text(g, row.value, x + w - 10, yy + 1, { align: 'right', color: row.value === 'ON' ? C.good : row.value === 'OFF' ? C.dim : C.ink, shadow: false });
  }
  if (R.length > n) UI.text(g, (D.scroll + 1) + '-' + Math.min(R.length, D.scroll + n) + ' of ' + R.length, x + w - 8, y + h - 24, { align: 'right', color: C.dim });
  if (D.msgT > 0) UI.text(g, D.msg, x + 10, y + h - 24, { color: C.good });
  const tip = D.tab === 0 && R[D.row] && R[D.row].key ? 'left/right adjust · select resets this row'.replace(/·/g, '-') : 'select acts';
  UI.text(g, tip, x + 10, y + h - 12, { color: C.dim, shadow: false });
  UI.footer(g, W, H, [['tabL', 'Tab'], ['tabR', ''], ['confirm', 'Select'], ['cancel', 'Back']], { y: 12 });
};
})();
