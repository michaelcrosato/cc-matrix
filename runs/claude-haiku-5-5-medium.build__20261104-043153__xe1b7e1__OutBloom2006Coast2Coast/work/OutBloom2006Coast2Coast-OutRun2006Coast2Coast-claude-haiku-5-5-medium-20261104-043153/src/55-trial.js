// Time Trial (plan §7.10): pick any stage (or the Full Coast, with the forks open); the clock counts up; traffic is off
// by default. Your best run of a stage is kept as a ghost (its positions, sampled at 10 Hz) and drawn as a translucent
// car; a medal (Bronze, Silver, Gold, Bloom) comes from the stage's par, the reference bot's time.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const G = () => OB.game;

OB.medalFor = (ms, par) => {
  const s = ms / 1000;
  if (s <= par * .98) return 'Bloom';
  if (s <= par * 1.04) return 'Gold';
  if (s <= par * 1.12) return 'Silver';
  if (s <= par * 1.25) return 'Bronze';
  return null;
};

const trialsetup = {
  enter() { OB.loadProfile(); this.traffic = false; this.build(); OB.Music.play('garden'); OB.idle.reset(); },
  build() {
    const items = OB.STAGES.map(s => {
      const rec = OB.profile.records.stage[s.id];
      return { label: s.id + ' ' + s.name.toUpperCase(), sub: 'PAR ' + s.par.toFixed(1) + ' • ' + (rec ? 'BEST ' + (rec.ms / 1000).toFixed(2) : 'NO TIME'), act: () => this.start(s.id) };
    });
    items.push({ label: 'FULL COAST', sub: 'FORKS OPEN • TO THE GOAL', act: () => this.start(null) });
    items.push({ label: 'TRAFFIC ' + (this.traffic ? 'ON' : 'OFF'), sub: 'TAP TO CHANGE', act: () => { this.traffic = !this.traffic; this.build(); } });
    this.m = new OB.Menu(items, { x: 240, y: 46, gap: 4, cols: 3, w: 150, h: 26, onBack: () => G().go('menu', null, { fade: 'wipe' }) }).layout(0, 0);
  },
  start(stageId) {
    const p = OB.profile.last, car = OB.CARS[p.car] || OB.CARS[1];
    G().go('race', { mode: 'trial', car: car.id, paint: p.paint, passenger: 'marisol', route: stageId ? [stageId] : null, traffic: this.traffic, trial: true, cheats: {} }, { fade: 'wipe' });
  },
  update(dt) {
    OB.idle.tick(dt, 'trial');
    this.m.update(dt, G().input);
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#1a1040', '#3a1a5a', '#8a3a6a']);
    this.m.o.x = W / 2; this.m.o.y = 46; this.m.layout(W, H);
    r.overlay(g => {
      E.font.title(g, 'TIME TRIAL', W / 2, 6, { scale: 2, align: 'center' });
      this.m.draw(g, { scale: 1 });
      OB.UI.footer(r, H - 16, [['confirm', 'Start'], ['cancel', 'Back']]);
    });
  },
};

/** the ghost of a run: its samples [z, x, ms] for a stage, kept as the best run */
OB.Ghost = {
  playback(stageId, t) {
    const g = OB.profile.ghosts[stageId]; if (!g || !g.length) return null;
    const ms = t * 1000; let lo = 0, hi = g.length - 1;
    if (ms > g[hi][2]) return null;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (g[mid][2] <= ms) lo = mid; else hi = mid; }
    const a = g[lo], b = g[hi], u = b[2] === a[2] ? 0 : (ms - a[2]) / (b[2] - a[2]);
    return { z: a[0] + (b[0] - a[0]) * u, x: a[1] + (b[1] - a[1]) * u };
  },
  /** save a finished run as the stage's best if it beats the record; returns whether it was a new best */
  save(stageId, ms, samples) {
    const rec = OB.profile.records.stage[stageId];
    if (rec && rec.ms <= ms) return false;
    const st = OB.STAGES.find(s => s.id === stageId);
    OB.profile.records.stage[stageId] = { ms: Math.round(ms) };
    OB.profile.ghosts[stageId] = samples.slice(0, 6000);
    OB.profile.records.medals[stageId] = OB.medalFor(ms, st.par);
    OB.saveProfile(); return true;
  },
};
OB.scenes = OB.scenes || {};
OB.scenes.trialsetup = trialsetup;
})();
