/* Dev Mode (PLAN §7.23): from the pause menu's Dev Mode item (or F9 while paused), a canvas panel over the frozen
 * race, pad-navigable (L1/R1 or Q/E switch tabs; the mouse clicks and drags sliders). Tabs: Tuning (a live slider for
 * every gameplay variable, a reset per row and RESET ALL TO DEFAULTS, "Keep after reload"), Cheats, Warp, Audio, Save
 * and Info. Back returns to the pause menu. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL;
const game = () => OB.game, KEY = 'outbloom:dev';
const TABS = ['TUNING', 'CHEATS', 'WARP', 'AUDIO', 'SAVE', 'INFO'];
const PER = 7;
const w = { stage: 0, pct: 0, goal: 0, mood: 0, req: 0, mission: 0, song: 0, sfx: 0, who: 0, vmood: 0, tod: 0, weather: 0, side: 0 };
const PCTS = [0, .25, .5, .75, .95], GOALS = ['A', 'B', 'C', 'D', 'E'], MOODS = ['bloom', 'bud', 'wilt'], VMOODS = ['happy', 'excited', 'angry', 'sad', 'scared'], TODS = [null].concat(Object.keys(OB.TOD)), WEATHER = [null, 'shower', 'petals', 'fireworks'];
const ids = () => Object.keys(OB.STAGES);
OB.Dev = {
  active: false, tab: 0, page: 0, confirmReset: false, jsonPage: 0, keep: false,
  init() { try { const s = E.store.get(KEY, null); if (s && s.keep) { this.keep = true; for (const k in s.tuning || {}) if (k in OB.tuning) OB.tuning[k] = s.tuning[k]; } } catch (e) { /* storage blocked */ } },
  persist() { try { E.store.set(KEY, this.keep ? { keep: true, tuning: OB.tuning } : { keep: false }); } catch (e) { /* storage blocked */ } },
  open() { if (OB.env.hub) return false; this.active = true; this.scr = new OB.UI.Screen({ wrap: false }); this.page = 0; game().resume(); game().input.consumeAll(); OB.Sound.play('ok'); return true; },
  close() { this.active = false; this.confirmReset = false; OB.Sound.play('back'); this.persist(); game().pause('player'); },
  rows() {
    const tab = TABS[this.tab], R = [], g = game();
    const slider = ([grp, k, def, lo, hi, step, desc]) => ({ id: k, kind: 'slider', label: k, grp, desc, get: () => OB.tuning[k], lo, hi, step, def,
      set: v => { OB.tuning[k] = +(Math.round(E.clamp(v, lo, hi) / step) * step).toFixed(4); OB.bus.emit('tuning', { key: k }); this.persist(); }, reset: () => { OB.resetTuning(k); this.persist(); } });
    if (tab === 'TUNING') {
      R.push({ id: 'resetAll', kind: 'button', label: 'RESET ALL TO DEFAULTS', act: () => { OB.resetTuning(); this.persist(); OB.UI.toast('TUNING', 'Every value is back to its default', 2); } });
      R.push({ id: 'keep', kind: 'toggle', label: 'Keep after reload', get: () => this.keep, set: v => { this.keep = v; this.persist(); } });
      for (const s of OB.TUNING_SPEC) R.push(slider(s));
    }
    if (tab === 'CHEATS') for (const [k, label] of OB.CHEAT_LIST) R.push({ id: k, kind: 'toggle', label, get: () => !!OB.cheats[k], set: v => { OB.cheats[k] = v; } });
    if (tab === 'WARP') {
      const race = OB.race, ins = game().sceneName === 'race' && race;
      const pick = (id, label, list, key, fmt) => ({ id, kind: 'pick', label, get: () => fmt(list[w[key]]), left: () => { w[key] = (w[key] - 1 + list.length) % list.length; }, right: () => { w[key] = (w[key] + 1) % list.length; } });
      R.push(pick('stage', 'Stage', ids(), 'stage', id => id + ' ' + OB.STAGES[id].name), pick('pct', 'At', PCTS, 'pct', p => Math.round(p * 100) + '%'));
      R.push({ id: 'warp', kind: 'button', label: 'WARP THERE', disabled: !ins, act: () => { const id = ids()[w.stage], Sx = OB.World.get(id); race.teleport(race.p1, id, Math.max(30, Math.floor(PCTS[w.pct] * Sx.len)) * OB.SEG, 200); this.close(); game().resume(); this.active = false; } });
      R.push({ id: 'nextcp', kind: 'button', label: 'NEXT CHECKPOINT', disabled: !ins, act: () => { const c = race.p1.car, Sx = OB.World.get(c.stage); race.teleport(race.p1, c.stage, Math.max(c.z, (Sx.segs.length - 20) * OB.SEG), 220, c.x); this.done(); } });
      R.push({ id: 'fork', kind: 'button', label: 'TO THE FORK', disabled: !ins, act: () => { const c = race.p1.car, Sx = OB.World.get(c.stage); if (Sx.juncStart >= 0) race.teleport(race.p1, c.stage, (Sx.juncStart - 100) * OB.SEG, 230); this.done(); } });
      R.push(pick('side', 'Force fork side', [0, -1, 1], 'side', s => s ? (s < 0 ? 'LEFT' : 'RIGHT') : 'OFF'));
      R.push({ id: 'applyside', kind: 'button', label: 'APPLY FORK SIDE', disabled: !ins, act: () => { race.cfg.forceSide = [0, -1, 1][w.side] || null; OB.UI.toast('FORK', race.cfg.forceSide ? 'Forced ' + (race.cfg.forceSide < 0 ? 'left' : 'right') : 'Free', 1.5); } });
      R.push(pick('req', 'Request', OB.REQUEST_TYPES, 'req', t => t), { id: 'reqgo', kind: 'button', label: 'TRIGGER REQUEST NOW', disabled: !ins, act: () => { if (!race.requests) race.requests = new OB.Requests(race, race.p1); race.requests.start(OB.REQUEST_TYPES[w.req]); this.done(); } });
      R.push({ id: 'spawncar', kind: 'button', label: 'SPAWN A CAR AHEAD', disabled: !ins, act: () => { const c = race.p1.car; race.traffic.add({ stage: c.stage, z: c.z + 3000, lane: 0, type: 'sedan', ribbon: { dx: 0 } }); this.done(); } });
      R.push({ id: 'spawnrib', kind: 'button', label: 'SPAWN A RIBBON PAIR', disabled: !ins, act: () => { if (!race.requests) race.requests = new OB.Requests(race, race.p1); const q = race.requests.start('ribbons'); q.phase = 'active'; this.done(); } });
      R.push({ id: 'spawnriv', kind: 'button', label: 'SPAWN A RIVAL (KIKI)', disabled: !ins, act: () => { const R2 = race._rival(OB.PERSONAS.kiki, race.rivals.length); R2.car.stage = race.p1.car.stage; R2.car.z = race.p1.car.z + 2000; R2.car.v = race.p1.car.v; R2.car.held = false; R2.stages = [R2.car.stage]; race.rivals.push(R2); this.done(); } });
      R.push(pick('tod', 'Time of day', TODS, 'tod', t => t || 'stage default'), pick('weather', 'Weather', WEATHER, 'weather', t => t || 'none'));
      R.push({ id: 'todgo', kind: 'button', label: 'APPLY TIME AND WEATHER', act: () => { OB.todOverride = TODS[w.tod]; OB.weatherOverride = WEATHER[w.weather]; OB.UI.toast('WORLD', (OB.todOverride || 'default') + ' / ' + (OB.weatherOverride || 'clear'), 1.5); } });
      R.push(pick('goal', 'Ending goal', GOALS, 'goal', x => x + ' ' + OB.GOALS[x].name), pick('mood', 'Mood', MOODS, 'mood', x => x.toUpperCase()));
      R.push({ id: 'endgo', kind: 'button', label: 'PLAY THE ENDING', act: () => { this.active = false; const r = OB.race ? OB.buildResult(OB.race) : {}; game().go('ending', Object.assign({ mode: 'arcade', score: 0, stats: { bestDrift: 0, nearmiss: 0, slip: 0, overtakes: 0 }, car: 'orchidea', driver: 'leo', passenger: 'marisol', outfit: 0, cfg: { mode: 'arcade' } }, r, { goal: GOALS[w.goal], mood: MOODS[w.mood], finished: true })); } });
      R.push(pick('mission', 'Mission', OB.MISSIONS, 'mission', m => m.id + ' ' + m.title), { id: 'missiongo', kind: 'button', label: 'START THE MISSION', act: () => { this.active = false; const m = OB.MISSIONS[w.mission]; game().go('race', OB.Tour.config(m, OB.Profile.p.last)); } });
      R.push({ id: 'attract', kind: 'button', label: 'PLAY THE ATTRACT DEMO', act: () => { this.active = false; game().go('attract', { from: 'menu' }); } }, { id: 'credits', kind: 'button', label: 'PLAY THE CREDITS', act: () => { this.active = false; game().go('credits', { back: 'menu' }); } });
    }
    if (tab === 'AUDIO') {
      const songs = Object.keys(OB.SONGS), sfx = Object.keys(OB.SFX), who = Object.keys(OB.CAST);
      R.push({ id: 'song', kind: 'pick', label: 'Jukebox', get: () => OB.SONGS[songs[w.song]].name, left: () => { w.song = (w.song - 1 + songs.length) % songs.length; }, right: () => { w.song = (w.song + 1) % songs.length; } });
      R.push({ id: 'play', kind: 'button', label: 'PLAY SONG', act: () => g.audio.music(OB.SONGS[songs[w.song]], { restart: true }) });
      const cur = g.audio.song; if (cur) cur.tracks.forEach((tr, i) => { if (tr.name) R.push({ id: 'layer' + i, kind: 'toggle', label: 'Layer: ' + tr.name, get: () => cur.vols[tr.i] > .5, set: v => g.audio.layer(tr.name, v ? 1 : 0, .2) }); });
      R.push({ id: 'sfx', kind: 'pick', label: 'Sound effect', get: () => sfx[w.sfx], left: () => { w.sfx = (w.sfx - 1 + sfx.length) % sfx.length; }, right: () => { w.sfx = (w.sfx + 1) % sfx.length; } }, { id: 'sfxgo', kind: 'button', label: 'PLAY EFFECT', act: () => OB.Sound.play(sfx[w.sfx]) });
      R.push({ id: 'jingle', kind: 'button', label: 'PLAY GOAL FANFARE', act: () => OB.Sound.sting('goal') });
      R.push({ id: 'who', kind: 'pick', label: 'Voice', get: () => OB.CAST[who[w.who]].name, left: () => { w.who = (w.who - 1 + who.length) % who.length; }, right: () => { w.who = (w.who + 1) % who.length; } }, { id: 'vm', kind: 'pick', label: 'Mood', get: () => VMOODS[w.vmood], left: () => { w.vmood = (w.vmood + 4) % 5; }, right: () => { w.vmood = (w.vmood + 1) % 5; } });
      R.push({ id: 'say', kind: 'button', label: 'SAY A SAMPLE LINE', act: () => { const id = who[w.who], line = OB.line('start', id) || OB.line('ann', 'announcer') || 'Hello there!'; OB.Voice.say(line, id, VMOODS[w.vmood]); OB.UI.toast(OB.CAST[id].name, line, 2.5); } });
    }
    if (tab === 'SAVE') {
      const p = OB.Profile.p;
      R.push({ id: 'seeds', kind: 'button', label: 'GIVE 1,000 SEEDS', act: () => { p.seeds += 1000; OB.Profile.save(); OB.UI.toast('SEEDS', 'Now ' + p.seeds, 1.5); } });
      R.push({ id: 'unlock', kind: 'button', label: 'UNLOCK EVERYTHING', act: () => { OB.Profile.unlockAll(); OB.UI.toast('UNLOCKED', 'Every bed is in bloom', 1.5); } });
      R.push({ id: 'clear', kind: 'button', label: 'CLEAR THE CAREER', act: () => { p.career = {}; OB.Profile.save(); OB.UI.toast('CAREER', 'Cleared', 1.5); } });
      R.push({ id: 'rankA', kind: 'button', label: 'SET EVERY MISSION TO RANK A', act: () => { for (const m of OB.MISSIONS) p.career[m.id] = { cleared: true, rank: 'A', best: 0, paid: 'A' }; OB.Profile.save(); OB.UI.toast('CAREER', 'Every postcard at A', 1.5); } });
      R.push({ id: 'reset', kind: 'button', label: this.confirmReset ? 'REALLY RESET? PRESS AGAIN' : 'RESET THE PROFILE', act: () => { if (!this.confirmReset) { this.confirmReset = true; return; } this.confirmReset = false; OB.Profile.reset(); OB.UI.toast('PROFILE', 'A fresh start', 1.5); } });
      R.push({ id: 'json', kind: 'pick', label: 'Profile JSON page', get: () => (this.jsonPage + 1) + ' / ' + this.jsonPages(), left: () => { this.jsonPage = Math.max(0, this.jsonPage - 1); }, right: () => { this.jsonPage = Math.min(this.jsonPages() - 1, this.jsonPage + 1); } });
    }
    if (tab === 'INFO') R.push({ id: 'info', kind: 'info', label: 'Version, seed, route, events, errors' });
    return R;
  },
  jsonLines() { return JSON.stringify(OB.Profile.p, (k, v) => k === 'ghost' ? '[' + (v ? v.length : 0) + ' samples]' : v, 1).split('\n'); },
  jsonPages() { return Math.max(1, Math.ceil(this.jsonLines().length / 14)); },
  done() { this.active = false; game().resume(); },
  update(dt) {
    const I = game().input, W = game().W, H = game().H;
    if (I.pressed('shiftUp')) { this.tab = (this.tab + 1) % TABS.length; this.page = 0; OB.Sound.play('focus'); }
    if (I.pressed('shiftDown')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.page = 0; OB.Sound.play('focus'); }
    const rows = this.rows(), pages = Math.max(1, Math.ceil(rows.length / PER)); this.page = Math.min(this.page, pages - 1);
    const x0 = W / 2 - 200, y0 = 50;
    const vis = rows.slice(this.page * PER, this.page * PER + PER);
    const items = vis.map((rw, i) => ({ id: rw.id, rw, x: x0, y: y0 + i * 24, w: 400, h: 21, disabled: rw.disabled, onPick: () => this.pick(rw), onLeft: rw.kind === 'slider' ? () => rw.set(rw.get() - rw.step) : rw.kind === 'pick' ? rw.left : rw.kind === 'toggle' ? () => rw.set(!rw.get()) : null, onRight: rw.kind === 'slider' ? () => rw.set(rw.get() + rw.step) : rw.kind === 'pick' ? rw.right : rw.kind === 'toggle' ? () => rw.set(!rw.get()) : null, onClick: ck => this.click(rw, ck, x0), draw: (g, it, f, scr) => this.row(g, it, f, scr) }));
    TABS.forEach((t, i) => items.push({ id: 'tab' + i, nofocus: true, x: x0 + i * 67, y: 30, w: 64, h: 16, onClick: () => { this.tab = i; this.page = 0; }, draw: () => {} }));
    if (pages > 1) { items.push({ id: 'pgup', nofocus: true, x: x0 + 300, y: y0 + PER * 24 + 4, w: 40, h: 16, onClick: () => { this.page = (this.page + pages - 1) % pages; }, draw: () => {} }, { id: 'pgdn', nofocus: true, x: x0 + 350, y: y0 + PER * 24 + 4, w: 40, h: 16, onClick: () => { this.page = (this.page + 1) % pages; }, draw: () => {} }); }
    this.scr.set(items);
    // paging when focus runs off the list
    const cur = this.scr.i, n = vis.length;
    if (I.pressed('down') && cur === n - 1 && pages > 1) { this.page = (this.page + 1) % pages; this.scr.i = 0; return; }
    if (I.pressed('up') && cur === 0 && pages > 1) { this.page = (this.page + pages - 1) % pages; this.scr.i = 0; return; }
    if (I.pressed('horn')) { const rw = vis[cur]; if (rw && rw.reset) { rw.reset(); OB.Sound.play('toggle'); } }
    // the mouse drags a slider
    const mp = I.pointer && I.pointer(), held = I.held && I.held.has('Mouse0');
    if (held && mp) { const it = items.find(it => it.rw && it.rw.kind === 'slider' && mp[1] >= it.y && mp[1] < it.y + it.h && mp[0] >= x0 + 180 && mp[0] <= x0 + 340); if (it) it.rw.set(it.rw.lo + (mp[0] - x0 - 180) / 160 * (it.rw.hi - it.rw.lo)); }
    if (I.pressed('pause') || (I.pressed('start') && !I.pressed('confirm'))) { this.close(); return; }
    const r = this.scr.update(dt); if (r === 'back') this.close();
  },
  pick(rw) { if (rw.kind === 'button' && !rw.disabled) rw.act(); else if (rw.kind === 'toggle') rw.set(!rw.get()); else if (rw.kind === 'pick') rw.right(); else if (rw.kind === 'slider') rw.reset(); },
  click(rw, ck, x0) { if (rw.kind === 'slider') { if (ck[0] >= x0 + 360) rw.reset(); else if (ck[0] >= x0 + 180 && ck[0] <= x0 + 340) rw.set(rw.lo + (ck[0] - x0 - 180) / 160 * (rw.hi - rw.lo)); } else if (rw.kind === 'pick') { if (ck[0] < x0 + 260) rw.left(); else rw.right(); } else this.pick(rw); },
  row(g, it, f, scr) {
    const rw = it.rw, x = it.x, y = it.y;
    E.ui.box(g, x, y, it.w, it.h, { bg: rw.disabled ? ['#2a2438', '#1a1828'] : f ? ['#5a3a8a', '#3a2470'] : ['#2a1a4a', '#1a1030'], border: f ? '#ffcf4a' : '#5a4a7a', gradient: true });
    const lab = rw.kind === 'slider' ? rw.label : rw.label;
    T(g, lab, x + 6, y + 7, rw.disabled ? '#6a6080' : '#ffffff');
    if (rw.kind === 'slider') {
      const v = rw.get(), fr = (v - rw.lo) / (rw.hi - rw.lo), changed = Math.abs(v - rw.def) > 1e-9;
      px.rect(g, x + 180, y + 9, 160, 3, '#4a3a6a'); px.rect(g, x + 180, y + 9, 160 * fr, 3, C.pink); px.rect(g, x + 178 + 160 * fr, y + 5, 4, 11, '#ffffff');
      T(g, (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(3)) + '', x + 345, y + 7, '#ffffff');
      if (changed) { px.disc(g, x + 170, y + 10, 3, C.sun); }
      T(g, 'R', x + it.w - 14, y + 7, changed ? C.sun : '#5a4a7a');
      if (f) T(g, rw.grp + ': ' + rw.desc + '  (default ' + rw.def + ')', x, 50 + PER * 24 + 22, C.dim);
    } else if (rw.kind === 'toggle') { const on = rw.get(); px.rect(g, x + it.w - 40, y + 5, 30, 11, on ? C.good : '#4a3a6a'); px.rect(g, x + it.w - (on ? 22 : 38), y + 6, 10, 9, '#ffffff'); }
    else if (rw.kind === 'pick') T(g, '← ' + rw.get() + ' →', x + it.w - 8, y + 7, C.sun, { align: 'right' });
    else if (rw.kind === 'button') T(g, '→', x + it.w - 14, y + 7, C.sun);
    if (f) scr.ring(g, it);
  },
  draw(g, W, H) {
    if (!this.active) return;
    px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0614'));
    const x0 = W / 2 - 200;
    OB.UI.panel(g, x0 - 10, 6, 420, H - 30, { alpha: .96 });
    T(g, 'DEV MODE', x0, 12, C.pink, { scale: 1 }); T(g, 'the race is frozen', x0 + 70, 12, C.dim);
    TABS.forEach((t, i) => { E.ui.box(g, x0 + i * 67, 30, 64, 16, { bg: i === this.tab ? ['#ffcf4a', '#e8902a'] : ['#3a2a5a', '#2a1a4a'], border: '#8a70b0' }); T(g, t, x0 + i * 67 + 32, 34, i === this.tab ? '#2a1450' : '#ffffff', { align: 'center' }); });
    if (TABS[this.tab] === 'INFO') this.info(g, x0, 50, W, H);
    else if (this.scr) {
      this.scr.draw(g);
      const rows = this.rows(), pages = Math.max(1, Math.ceil(rows.length / PER));
      if (pages > 1) { T(g, 'PAGE ' + (this.page + 1) + '/' + pages, x0 + 230, 50 + PER * 24 + 8, C.dim); T(g, '↑', x0 + 315, 50 + PER * 24 + 8, C.sun); T(g, '↓', x0 + 365, 50 + PER * 24 + 8, C.sun); }
      if (TABS[this.tab] === 'SAVE') { const L = this.jsonLines().slice(this.jsonPage * 14, this.jsonPage * 14 + 14); L.forEach((l, i) => E.font.text(g, l.slice(0, 70), x0 + 4, 50 + 7 * 24 + 22 + i * 6, '#a8f0c8', { font: 'tiny', outline: false })); }
    }
    OB.UI.footer(g, W, H, [['shiftDown', 'Tab'], ['shiftUp', 'Tab'], ['left', 'Adjust'], ['horn', 'Reset row'], ['cancel', 'Back']]);
  },
  info(g, x, y, W, H) {
    const race = OB.race, rows = [['Version', OB.VERSION + ' (engine ' + (E.version || '') + ')'], ['Scene', game().sceneName], ['Seed', race ? race.cfg.seed : '-'], ['Route', race ? race.p1.stages.join(' > ') + ' (' + race.p1.route + ')' : '-'], ['Errors', String(game().errors.length)], ['Profile seeds', String(OB.Profile.p.seeds)]];
    rows.forEach(([k, v], i) => { T(g, k, x, y + i * 10, C.dim); T(g, String(v), x + 90, y + i * 10, '#ffffff'); });
    T(g, 'LAST 20 EVENTS', x, y + 66, C.sun);
    OB.bus.log(20).forEach((e, i) => E.font.text(g, e.t + ' ' + e.name + ' ' + JSON.stringify(e.data || {}).slice(0, 60), x, y + 78 + i * 6, '#c8f0ff', { font: 'tiny', outline: false }));
  }
};
})();
