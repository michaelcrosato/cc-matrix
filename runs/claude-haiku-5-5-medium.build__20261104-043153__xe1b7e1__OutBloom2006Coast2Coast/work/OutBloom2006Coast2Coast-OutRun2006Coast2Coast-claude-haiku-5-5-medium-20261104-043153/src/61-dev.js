// Dev Mode (plan §7.23): opened from the pause menu. Tabs: Tuning (a live slider for each balance value, a reset per
// row and a reset of all), Cheats (no clock, no collisions, numbers on the race), Warp (any stage, any ending, any
// request, any mission), Audio (the songs, the effects, the voices) and Save (seeds, unlocks, the career, the profile).
// Back returns to the paused race, which is kept as it was.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { clamp } = E;
const G = () => OB.game;
const INK = '#fff4e0', SUN = '#ffcf4a';
OB.devCheats = OB.devCheats || { infiniteTime: false, noCollide: false, debug: false };
const TABS = ['TUNING', 'CHEATS', 'WARP', 'AUDIO', 'SAVE', 'INFO'];
const CHEAT_ROWS = [['infiniteTime', 'Infinite time'], ['noCollide', 'No collisions'], ['debug', 'Show the numbers']];
const EFFECTS = ['select', 'confirm', 'cancel', 'coin', 'oneup', 'explode', 'bump', 'jump', 'secret', 'powerup', 'pickup', 'die'];
const stepOf = row => { const [, , def, min, max] = row; return Math.max((max - min) / 40, Math.abs(def) / 100, 0.001); };
const confirmTwice = { key: null };

/** a warp row's action: start a stage's run, or the ending, or the request, or the mission */
const warpRows = () => {
  const rows = [];
  for (const s of OB.STAGES) rows.push({ label: 'START ' + s.id + ' ' + s.name.toUpperCase(), act: () => G().go('race', { mode: 'arcade', car: 'orchidea', paint: 0, passenger: 'marisol', route: [s.id], cheats: {} }, { fade: 0 }) });
  for (const g of Object.keys(OB.ENDINGS)) for (const m of ['Bloom', 'Bud', 'Wilt']) rows.push({ label: 'ENDING ' + g + ' ' + m.toUpperCase(), act: () => G().go('ending', { result: { goal: g, mood: m, passenger: 'vivi', score: 0, route: '', routeIds: [], time: 0, status: 'goal' } }, { fade: 0 }) });
  for (const t of Object.keys(OB.REQUESTS)) {
    const s = OB.STAGES.find(st => (st.slots || []).some(sl => sl.type === t)) || OB.STAGES[0];
    rows.push({ label: 'REQUEST ' + t.toUpperCase(), act: () => G().go('race', { mode: 'love', car: 'orchidea', paint: 0, passenger: 'marisol', route: [s.id], cheats: { infiniteTime: true } }, { fade: 0 }) });
  }
  for (const m of OB.MISSIONS) rows.push({ label: 'MISSION ' + m.id + ' ' + m.title.toUpperCase(), act: () => G().go('brief', { id: m.id }, { fade: 0 }) });
  return rows;
};
const audioRows = () => {
  const rows = [];
  for (const k of Object.keys(OB.SONGS)) rows.push({ label: 'SONG ' + (OB.SONG_NAMES[k] || k).toUpperCase(), act: () => OB.Music.play(k) });
  for (const f of EFFECTS) rows.push({ label: 'EFFECT ' + f.toUpperCase(), act: () => OB.Sfx.play(f) });
  for (const who of OB.CAST_ORDER) for (const mood of ['start', 'perfect', 'miss']) rows.push({ label: 'VOICE ' + who.toUpperCase() + ' ' + mood.toUpperCase(), act: () => OB.bark(who, mood, 9) });
  return rows;
};
const saveRows = () => [
  { label: '+1000 SEEDS', act: () => { OB.Progress.grant(1000, 'dev'); } },
  { label: 'UNLOCK EVERYTHING', act: () => { for (const b of OB.BEDS) if (!OB.profile.owned.includes(b.id)) OB.profile.owned.push(b.id); OB.saveProfile(); } },
  { label: 'CLEAR THE CAREER', act: () => { OB.profile.career = {}; OB.saveProfile(); } },
  { label: 'RESET THE PROFILE', act: () => { if (confirmTwice.key === 'reset') { OB.resetProfile(); confirmTwice.key = null; } else confirmTwice.key = 'reset'; } },
];

const dev = {
  enter(data = {}) { this.from = data.from || 'title'; this.tab = 0; this.focus = 0; this.scroll = 0; this.t = 0; OB.Music.play('garden'); OB.loadProfile(); },
  rows() {
    if (this.tab === 0) return [['reset', 'RESET ALL TO DEFAULTS']].concat(OB.TUNING.map(r => ['tune', r]));
    if (this.tab === 1) return CHEAT_ROWS.map(([k, l]) => ['cheat', k, l]);
    if (this.tab === 2) return warpRows().map(r => ['act', r]);
    if (this.tab === 3) return audioRows().map(r => ['act', r]);
    if (this.tab === 4) return saveRows().map(r => ['act', r]);
    return [];
  },
  update(dt) {
    this.t += dt;
    const I = G().input, rows = this.rows(), n = rows.length;
    if (I.pressed('nextTab')) { this.tab = (this.tab + 1) % TABS.length; this.focus = 0; this.scroll = 0; }
    if (I.pressed('prevTab')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.focus = 0; this.scroll = 0; }
    if (n) {
      if (I.pressed('up') || I.repeat('up', .35, .12)) this.focus = (this.focus + n - 1) % n;
      if (I.pressed('down') || I.repeat('down', .35, .12)) this.focus = (this.focus + 1) % n;
      const dir = I.pressed('right') || I.repeat('right', .25, .08) ? 1 : I.pressed('left') || I.repeat('left', .25, .08) ? -1 : 0;
      if (dir) this.change(rows[this.focus], dir);
      if (I.pressed('confirm') || I.pressed('start')) this.press(rows[this.focus]);
      const visible = 9; if (this.focus < this.scroll) this.scroll = this.focus; if (this.focus >= this.scroll + visible) this.scroll = this.focus - visible + 1;
    }
    if (I.pressed('cancel')) { OB.Sfx.play('cancel'); this.back(); }
  },
  press(row) {
    if (row[0] === 'reset') { OB.resetTuning(); OB.Sfx.play('confirm'); }
    else if (row[0] === 'cheat') { OB.devCheats[row[1]] = !OB.devCheats[row[1]]; OB.Sfx.play('select'); }
    else if (row[0] === 'act') { OB.Sfx.play('confirm', { vol: .4 }); row[1].act(); }
  },
  change(row, dir) {
    if (row[0] === 'tune') { const [, , def, min, max] = row[1], k = row[1][1]; OB.tuning[k] = clamp(+(OB.tuning[k] + dir * stepOf(row[1])).toFixed(4), min, max); OB.Sfx.play('select', { vol: .3 }); }
    else if (row[0] === 'cheat') { OB.devCheats[row[1]] = dir > 0; }
  },
  back() { if (this.from === 'race' && OB.race) G().go('race', { resume: true }); else G().go('title', null, { fade: 'wipe' }); },
  draw(r) {
    const W = r.W, H = r.H, rows = this.rows();
    r.sky(['#1a1040', '#3a1a5a', '#6a2a5a']);
    r.overlay(g => {
      OB.UI.panel(g, 8, 8, W - 16, H - 36, { bg: ['#140a2a', '#22124a'] });
      E.font.title(g, 'DEV MODE', W / 2, 12, { scale: 2, align: 'center' });
      TABS.forEach((t, i) => E.font.text(g, t, 14 + i * 74, 36, i === this.tab ? SUN : '#c8b8d8', { outline: false, shadow: '#000', font: 'tiny', scale: 1 }));
      if (this.tab === 0) {
        const vis = rows.slice(this.scroll, this.scroll + 9);
        vis.forEach((row, j) => {
          const i = this.scroll + j, y = 50 + j * 20, f = i === this.focus, x = 18;
          OB.UI.panel(g, x, y, W - 36, 17, { bg: f ? ['#4a1e6a', '#7a3a7a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#4a3a6a', alpha: .95 });
          if (row[0] === 'reset') { E.font.text(g, row[1], W / 2, y + 5, f ? SUN : INK, { align: 'center', outline: false, shadow: '#000', font: 'tiny' }); return; }
          const [, k, def, min, max, label] = row[1], v = OB.tuning[k], changed = Math.abs(v - def) > 1e-9;
          E.font.text(g, label.toUpperCase(), x + 6, y + 5, f ? SUN : INK, { outline: false, shadow: '#000', font: 'tiny' });
          const bx = W * .48, bw = W * .26;
          E.ui.bar(g, bx, y + 6, bw, 5, clamp((v - min) / (max - min), 0, 1), changed ? '#ff8ac0' : '#7ac8e0');
          E.font.text(g, (changed ? '* ' : '') + (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2)), W - 24, y + 5, changed ? '#ff8ac0' : INK, { align: 'right', outline: false, shadow: '#000', font: 'tiny' });
        });
        if (rows.length > 9) E.font.text(g, (this.focus + 1) + ' / ' + rows.length, W - 24, H - 46, '#c8b8d8', { align: 'right', outline: false, shadow: '#000', font: 'tiny' });
      } else if (this.tab === 1) {
        rows.forEach((row, i) => {
          const y = 52 + i * 26, f = i === this.focus, on = !!OB.devCheats[row[1]];
          OB.UI.panel(g, 18, y, W - 36, 22, { bg: f ? ['#4a1e6a', '#7a3a7a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#4a3a6a', alpha: .95 });
          E.font.text(g, row[2].toUpperCase(), 26, y + 7, f ? SUN : INK, { outline: false, shadow: '#000', scale: 1 });
          E.font.text(g, on ? 'ON' : 'OFF', W - 26, y + 7, on ? '#7aff9a' : '#c8b8d8', { align: 'right', outline: false, shadow: '#000', scale: 1 });
        });
      } else if (this.tab === 2 || this.tab === 3 || this.tab === 4) {
        const vis = rows.slice(this.scroll, this.scroll + 9);
        vis.forEach((row, j) => {
          const i = this.scroll + j, y = 50 + j * 20, f = i === this.focus;
          OB.UI.panel(g, 18, y, W - 36, 17, { bg: f ? ['#4a1e6a', '#7a3a7a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#4a3a6a', alpha: .95 });
          const lab = row[1].label + (this.tab === 4 && row[1].label.startsWith('RESET') && confirmTwice.key === 'reset' ? '  (PRESS AGAIN)' : '');
          E.font.text(g, lab, 26, y + 5, f ? SUN : INK, { outline: false, shadow: '#000', font: 'tiny' });
        });
        E.font.text(g, (this.focus + 1) + ' / ' + rows.length, W - 24, H - 46, '#c8b8d8', { align: 'right', outline: false, shadow: '#000', font: 'tiny' });
      } else {
        const race = OB.race;
        const lines = ['VERSION  ' + OB.VERSION, 'ENGINE   my-3D2dge v0.85.2', 'ROUTE    ' + (race ? race.routeIds.join(' > ') : '-'),
          'EVENTS   ' + OB.bus.recent(200).length + ' recent', 'ERRORS   ' + (G().errors ? G().errors.length : 0), 'SCENE    ' + (G().sceneName || '-'),
          'SEEDS    ' + OB.profile.seeds, 'BEDS     ' + OB.profile.owned.length + ' of ' + OB.BEDS.length + ' bloomed'];
        lines.forEach((l, i) => E.font.text(g, l, 26, 56 + i * 18, INK, { outline: false, shadow: '#000', font: 'tiny' }));
      }
      OB.UI.footer(r, H - 14, [['prevTab', 'Tab'], ['nextTab', 'Tab'], ['confirm', this.tab === 0 ? 'Reset' : this.tab === 1 ? 'Toggle' : 'Go'], ['cancel', 'Back']]);
    });
  },
};
OB.scenes = OB.scenes || {};
OB.scenes.dev = dev;
})();
