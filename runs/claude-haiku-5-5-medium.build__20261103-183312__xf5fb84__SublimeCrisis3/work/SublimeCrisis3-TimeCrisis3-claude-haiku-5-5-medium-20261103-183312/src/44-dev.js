// 44-dev.js: the dev panel (plan 4.16), from the pause menu. The sim is frozen while it is open; close it and play goes on
// with the new values. Six tabs of descriptors: each slider's key is a path into TC.tune ('enemy.hpMul'), and Reset all
// copies TC.TUNE back. Navigation: up and down move, left and right adjust (hold to speed up), confirm toggles or runs,
// cancel closes, and the tab keys (Q and E, or L1 and R1) change tab. Dev mode is not in AI Hub sessions.

TC.Dev = {
  open: false, tab: 0, i: 0, play: null, game: null, confirmReset: false, held: 0,
  tabs: [
    { name: 'PLAYER', items: [
      { t: 'toggle', path: 'player.godMode', label: 'God mode' },
      { t: 'toggle', path: 'player.infiniteAmmo', label: 'Infinite ammo' },
      { t: 'slider', path: 'player.lives', label: 'Start lives (0 = difficulty)', min: 0, max: 9, step: 1 },
      { t: 'slider', path: 'player.iframes', label: 'I-frames (s)', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'player.coverIn', label: 'Cover in (s)', min: 0.05, max: 0.4, step: 0.01 },
      { t: 'slider', path: 'player.coverOut', label: 'Cover out (s)', min: 0.05, max: 0.4, step: 0.01 },
      { t: 'slider', path: 'player.reload', label: 'Reload (s)', min: 0.1, max: 1, step: 0.05 },
      { t: 'slider', path: 'player.padSpeed', label: 'Pad aim speed', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'player.aimAssist', label: 'Aim assist', min: 0, max: 1, step: 0.05 },
    ] },
    { name: 'WEAPONS', items: [
      { t: 'slider', path: 'weapon.handgunDmg', label: 'Handgun damage', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'weapon.mgRate', label: 'MG rate (/s)', min: 4, max: 20, step: 1 },
      { t: 'slider', path: 'weapon.mgDmg', label: 'MG damage', min: 0.1, max: 1, step: 0.05 },
      { t: 'slider', path: 'weapon.shotPellets', label: 'Shotgun pellets', min: 4, max: 14, step: 1 },
      { t: 'slider', path: 'weapon.shotSpread', label: 'Shotgun spread (deg)', min: 2, max: 12, step: 0.5 },
      { t: 'slider', path: 'weapon.glRadius', label: 'GL radius (u)', min: 24, max: 96, step: 4 },
      { t: 'slider', path: 'weapon.glDmg', label: 'GL damage', min: 2, max: 12, step: 0.5 },
      { t: 'slider', path: 'weapon.ammoMul', label: 'Ammo pickups x', min: 0.5, max: 3, step: 0.1 },
    ] },
    { name: 'ENEMIES', items: [
      { t: 'slider', path: 'enemy.hpMul', label: 'HP x', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'enemy.threatMul', label: 'Threat chance x', min: 0, max: 3, step: 0.1 },
      { t: 'slider', path: 'enemy.telegraphMul', label: 'Telegraph x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'enemy.fireMul', label: 'Fire interval x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'enemy.maxThreats', label: 'Max threats', min: 1, max: 4, step: 1 },
      { t: 'slider', path: 'enemy.minGap', label: 'Minimum gap (s)', min: 0.1, max: 1, step: 0.05 },
      { t: 'slider', path: 'enemy.reactMul', label: 'Reaction x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'enemy.bossHpMul', label: 'Boss HP x', min: 0.25, max: 3, step: 0.25 },
    ] },
    { name: 'TIME', items: [
      { t: 'toggle', path: 'time.freeze', label: 'Freeze TIME' },
      { t: 'slider', path: 'time.sceneMul', label: 'Area time x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'time.eliteBonus', label: 'Elite bonus (s)', min: 0, max: 5, step: 0.5 },
      { t: 'slider', path: 'time.refill', label: 'Refill after time-up', min: 0.2, max: 1, step: 0.1 },
      { t: 'slider', path: 'time.gameSpeed', label: 'Game speed', min: 0.25, max: 1.5, step: 0.05 },
    ] },
    { name: 'VIEW', items: [
      { t: 'slider', path: 'view.fov', label: 'FOV', min: 45, max: 75, step: 1 },
      { t: 'toggle', path: 'view.hideHud', label: 'Hide HUD' },
      { t: 'toggle', path: 'view.hitVolumes', label: 'Show hit volumes' },
      { t: 'toggle', path: 'view.colliders', label: 'Show colliders' },
      { t: 'toggle', path: 'view.aiLabels', label: 'Show AI states' },
      { t: 'toggle', path: 'view.threatDebug', label: 'Show threat timers' },
      { t: 'toggle', path: 'view.perf', label: 'Show performance readout' },
      { t: 'toggle', path: 'view.threatBig', label: 'Large crisis rings' },
    ] },
    { name: 'ACTIONS', items: [
      { t: 'run', label: 'Restart area', fn: d => d.play.restartArea() },
      { t: 'run', label: 'Next area', fn: d => d.play.skipArea(1) },
      { t: 'run', label: 'Kill all enemies', fn: d => d.play.killAll() },
      { t: 'run', label: 'All weapons and ammo', fn: d => d.play.allWeapons() },
      { t: 'run', label: '+1 life', fn: d => { for (const p of d.play.sim.players) p.lives = Math.min(9, p.lives + 1); } },
      { t: 'run', label: 'Lose a life', fn: d => { for (const p of d.play.sim.players) d.play.sim.loseLife(p, 'dev', true); } },
      { t: 'run', label: 'Trigger a threat on me', fn: d => d.play.sim.addThreat({ src: 0, target: 0, muzzle: [d.play.sim.base + 200, 0, 20], tele: 0.8, kind: 'shot', pr: null }) },
      { t: 'run', label: 'Bot plays (Autopilot)', fn: d => { const s = d.play.seats[0]; s.bot = s.bot ? null : TC.Autopilot.make('fair'); } },
      { t: 'run', label: 'Clear stage (win)', fn: d => d.play.sim.stageClear() },
      { t: 'run', label: 'Game over', fn: d => d.play.sim.gameOver() },
    ] },
  ],

  openFrom(game) {
    const play = TC.current.play;
    game.resume();
    if (!play) return;
    this.game = game; this.play = play; this.open = true; this.i = 0; this.tab = 0; this.confirmReset = false;
  },
  active() { return this.open; },
  close() { this.open = false; this.confirmReset = false; },

  // Reset all values to their defaults (TC.TUNE), with a second press to confirm.
  resetAll() {
    if (!this.confirmReset) { this.confirmReset = true; return; }
    TC.tuneReset();
    this.confirmReset = false;
  },

  update(dt) {
    const g = this.game, I = g.input;
    const items = this.tabs[this.tab].items;
    if (I.pressed('cancel') || I.pressed('pause')) { this.close(); return; }
    if (I.pressed('down')) this.i = (this.i + 1) % (items.length + 1);
    if (I.pressed('up')) this.i = (this.i + items.length) % (items.length + 1);
    if (I.pressed('right') || I.pressed('left')) this.adjust(I.pressed('right') ? 1 : -1, items);
    if ((I.down('right') || I.down('left')) && ++this.held > 14 && this.held % 4 === 0) this.adjust(I.down('right') ? 1 : -1, items);
    if (!I.down('right') && !I.down('left')) this.held = 0;
    if (I.pressed('w4') || I.pressed('next')) this.tab = (this.tab + 1) % this.tabs.length;
    if (I.pressed('prev') || I.pressed('w3')) this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length;
    if (I.pressed('confirm') || I.pressed('fire')) this.pick(items);
    if (I.pressed('reload')) this.resetFocused(items);
  },

  // Change a slider by one step, or flip a toggle; the reset row is the last one.
  adjust(dir, items) {
    if (this.i >= items.length) return;
    const it = items[this.i];
    if (it.t === 'slider') {
      const v = TC.tuneGet(it.path);
      const next = TC.clamp(Math.round((v + dir * it.step) / it.step) * it.step, it.min, it.max);
      TC.tuneSet(it.path, Math.round(next * 1000) / 1000);
    } else if (it.t === 'toggle') {
      TC.tuneSet(it.path, !TC.tuneGet(it.path));
    }
  },

  pick(items) {
    if (this.i >= items.length) { this.resetAll(); return; }
    const it = items[this.i];
    if (it.t === 'toggle') TC.tuneSet(it.path, !TC.tuneGet(it.path));
    else if (it.t === 'run') it.fn(this);
    TC.sfx(this.game, 'pick');
  },

  // Reset the focused value to its default (the Reset key).
  resetFocused(items) {
    if (this.i >= items.length) return;
    const it = items[this.i];
    if (it.path) TC.tuneSet(it.path, TC.tuneGetFrom(TC.TUNE, it.path));
  },

  draw(r) {
    const W = r.W, H = r.H;
    r.overlay(g => {
      g.fillStyle = '#05070fe6';
      g.fillRect(0, 0, W, H);
      TC.text(g, 'DEV MODE', W / 2, 8, TC.PALETTE.warn, { align: 'center', scale: 2 });
      this.tabs.forEach((t, k) => {
        TC.text(g, t.name, 16 + k * 62, 26, k === this.tab ? TC.PALETTE.gold : TC.PALETTE.dim, { scale: 1 });
      });
      const items = this.tabs[this.tab].items;
      items.forEach((it, k) => {
        const y = 40 + k * 14;
        const focus = k === this.i;
        if (focus) { g.fillStyle = '#3aa0e8'; g.fillRect(12, y - 2, W - 24, 12); }
        const changed = it.path && TC.tuneChanged(it.path);
        const col = focus ? '#ffffff' : changed ? TC.PALETTE.gold : '#c8d6ee';
        TC.text(g, it.label, 18, y, col, { scale: 1 });
        if (it.path) {
          const v = TC.tuneGet(it.path);
          const shown = typeof v === 'boolean' ? (v ? 'ON' : 'OFF') : String(Math.round(v * 100) / 100);
          TC.text(g, shown, W - 20, y, col, { align: 'right', scale: 1 });
          if (changed) TC.text(g, 'def ' + String(TC.tuneGetFrom(TC.TUNE, it.path)), W - 90, y, TC.PALETTE.dim, { align: 'right', scale: 1 });
        }
      });
      const y = 40 + items.length * 14 + 8;
      const focusReset = this.i === items.length;
      if (focusReset) { g.fillStyle = '#3aa0e8'; g.fillRect(12, y - 2, W - 24, 12); }
      TC.text(g, this.confirmReset ? 'PRESS AGAIN TO RESET EVERYTHING' : 'RESET ALL TO DEFAULTS', 18, y, focusReset ? '#ffffff' : TC.PALETTE.warn, { scale: 1 });
      TC.text(g, 'Left/right adjust  Enter toggles or runs  Q/E tab  Esc closes', W / 2, H - 12, TC.PALETTE.dim, { align: 'center', scale: 1 });
    });
  },
};
