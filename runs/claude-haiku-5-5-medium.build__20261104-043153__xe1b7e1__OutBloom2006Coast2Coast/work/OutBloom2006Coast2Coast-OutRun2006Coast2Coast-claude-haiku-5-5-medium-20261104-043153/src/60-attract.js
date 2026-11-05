// Attract mode (plan §7.22): after ten seconds with no input on the title, menu or garage, the game plays itself on a
// timed cycle: the arcade run, the forks, a Love in Bloom run with its requests, a Drift Duel or a two-bot versus
// (alternating each cycle), a goal's ending, and the high-score table. The bot drives with cheats on, "DEMO PLAY"
// shows, and any input ends it and returns to the title. It never writes the profile.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const G = () => OB.game;
const IDLE_SCENES = ['title', 'menu', 'garage'];
const IDLE_AFTER = 10;

/** the idle clock: any input resets it; ten seconds on an idle screen starts the attract mode */
OB.idle = {
  t: 0, last: null,
  reset() { this.t = 0; },
  tick(dt, name) {
    const I = G().input;
    const p = I.pointer && I.pointer();
    const moved = p && this.last && (Math.abs(p[0] - this.last[0]) + Math.abs(p[1] - this.last[1]) > 4);
    this.last = p ? p.slice() : null;
    const active = I.anyPressed() || I.move()[0] || I.move()[1] || moved || (I.clicked && I.clicked());
    if (active) { this.t = 0; return; }
    if (!IDLE_SCENES.includes(name)) { this.t = 0; return; }
    this.t += dt;
    if (this.t > IDLE_AFTER) { this.t = 0; OB.attract.start(); }
  },
};

/** the playlist: each segment, its kind, its seconds, and what it plays */
const CARS = ['orchidea', 'gardenia', 'magnolia', 'primavera', 'girasole'];
const PLAYLIST = [
  { k: 'race', name: 'ARCADE RUN', s: 25, mode: 'arcade', passenger: 'marisol' },
  { k: 'race', name: 'THE FORKS', s: 15, mode: 'arcade', passenger: 'marisol', seedAdd: 500 },
  { k: 'race', name: 'LOVE IN BLOOM', s: 20, mode: 'love', passenger: 'vivi' },
  { k: 'race', name: 'DRIFT DUEL', s: 20, mode: 'arcade', passenger: 'juni', mission: 'B2' },
  { k: 'race', name: 'VERSUS', s: 20, versus: true },
  { k: 'ending', name: 'GOAL A', s: 10 },
  { k: 'table', name: 'HIGH SCORES', s: 5 },
];
OB.PLAYLIST = PLAYLIST;

/** a demo race's config for a segment (the bot drives it, the cheats on) */
function demoCfg(seg, seed) {
  const c = OB.CARS.find(x => x.id === CARS[seed % CARS.length]) || OB.CARS[1];
  const cfg = { mode: seg.mode === 'love' ? 'love' : 'demo', demo: true, car: c.id, paint: 0, passenger: seg.passenger, difficulty: 'Normal', seed: 1000 + seed * 37 + (seg.seedAdd || 0), route: null, cheats: { noCollide: true, infiniteTime: true } };
  if (seg.mission) { cfg.route = OB.MISSIONS.find(m => m.id === seg.mission).route; cfg.mission = seg.mission; }
  return cfg;
}

/** the attract director: the cycle, the segment in play, and the way on and back to the title */
OB.attract = {
  active: false, idx: 0, seed: 1, segment: '',
  start() { if (OB.env.hub) return; this.active = true; this.idx = 0; this.seed = 1; G().go('attract', { idx: 0, seed: 1 }, { fade: 'wipe' }); },
  /** the next segment (the cycle goes on, with a new seed each time round) */
  next() {
    if (!this.active || this.switching) return;   // (once per segment, however many callers ask)
    this.switching = true;
    this.idx = (this.idx + 1) % PLAYLIST.length;
    if (this.idx === 0) this.seed++;
    G().go('attract', { idx: this.idx, seed: this.seed }, { fade: 'wipe' });
  },
  exit() { this.active = false; OB.Hud.banners = []; G().go('title', null, { fade: 'wipe' }); },
};

const attract = {
  enter(data = {}) {
    this.idx = data.idx || 0; this.seed = data.seed || 1; this.t = 0; this.done = false; OB.attract.switching = false;
    OB.attract.idx = this.idx; OB.attract.seed = this.seed;
    const seg = PLAYLIST[this.idx]; this.seg = seg; OB.attract.segment = seg.name;
    if (seg.k === 'race' && seg.versus) OB.scenes.versusrace.enter({ route: ['S1', 'S2', 'S5'], cpu: true, botA: true, seed: 1000 + this.seed * 53 });
    else if (seg.k === 'race') OB.scenes.race.enter(demoCfg(seg, this.seed));
    else if (seg.k === 'ending') OB.scenes.ending.enter({ result: { goal: 'A', mood: 'Bloom', passenger: 'marisol', score: 0, route: '', routeIds: [], time: 0, status: 'goal', attract: true } });
    else OB.Music.play('results');
  },
  exit() { const seg = this.seg; if (seg && seg.k === 'race') { if (seg.versus) OB.scenes.versusrace.exit(); else OB.scenes.race.exit(); } },
  update(dt) {
    const I = G().input;
    if (I.anyPressed() || (I.clicked && I.clicked()) || I.move()[0] || I.move()[1]) { OB.attract.exit(); return; }
    this.t += dt;
    const seg = this.seg;
    if (seg.k === 'race') { if (seg.versus) OB.scenes.versusrace.update.call(OB.scenes.versusrace, dt); else OB.scenes.race.update.call(OB.scenes.race, dt); }
    else if (seg.k === 'ending') OB.scenes.ending.update.call(OB.scenes.ending, dt);
    if (this.t > seg.s && !this.done) { this.done = true; OB.attract.next(); }
  },
  draw(r) {
    const seg = this.seg, W = r.W, H = r.H, t = G().time || 0;
    if (seg.k === 'race') {
      if (seg.versus) OB.scenes.versusrace.draw.call(OB.scenes.versusrace, r);
      else OB.scenes.race.draw.call(OB.scenes.race, r);
    } else if (seg.k === 'ending') OB.scenes.ending.draw.call(OB.scenes.ending, r);
    else { r.sky(['#1a1040', '#3a1a5a', '#6a2a5a']); r.overlay(g => drawTable(g, W, H)); }
    r.overlay(g => {
      E.font.text(g, 'DEMO PLAY • ' + seg.name, 6, H - 16, '#ffe04a', { shadow: '#000', outline: false, font: 'tiny' });
      if (Math.floor(t * 2) % 2 === 0) {
        const label = G().input.lastDevice === 'gamepad' ? 'PRESS ' : 'PRESS ANY KEY';
        E.font.text(g, label, W / 2, H - 16, '#ffffff', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      }
    });
  },
};

/** the high-score table: the best score of each mode from the profile, as the arcade shows it */
function drawTable(g, W, H) {
  E.font.title(g, 'HIGH SCORES', W / 2, 12, { scale: 2, align: 'center' });
  const rows = Object.entries(OB.profile.best || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!rows.length) E.font.text(g, 'NO RUNS YET ON THIS DEVICE', W / 2, H / 2, '#ffe6c0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
  rows.forEach(([k, v], i) => E.font.text(g, (i + 1) + '  ' + k.toUpperCase().slice(0, 22) + '  ' + String(v), W / 2 - 110, 50 + i * 22, '#fff4e0', { outline: false, shadow: '#000', scale: 1 }));
}
OB.scenes = OB.scenes || {};
OB.scenes.attract = attract;
})();
