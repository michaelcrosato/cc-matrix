/* Versus: two players on one machine, split screen, same stage and the same traffic. Player 1 uses the engine's input (pad
 * or keys); player 2 uses I J K L U on the keyboard, or a second gamepad. First car through the gate wins. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, game = OB.game, S = OB.scenes, T = OB.txt;
const keys = {};
if (typeof window.addEventListener === 'function') { window.addEventListener('keydown', e => { keys[e.code] = true; }); window.addEventListener('keyup', e => { keys[e.code] = false; }); window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; }); }
OB.vsKeys = keys;
const pad2 = () => { try { const gp = navigator.getGamepads ? navigator.getGamepads() : []; const ix = game.input.padIndex; for (let i = 0; i < gp.length; i++) if (gp[i] && i !== ix) return gp[i]; } catch (e) { /* no pads */ } return null; };
const ctl2 = () => {
  const gp = pad2(); let steer = (keys.KeyL ? 1 : 0) - (keys.KeyJ ? 1 : 0), gas = !!keys.KeyI, brake = !!keys.KeyK, drift = !!keys.KeyU;
  if (gp) { const ax = gp.axes[0] || 0; if (Math.abs(ax) > .18) steer = ax; gas = gas || !!(gp.buttons[7] && gp.buttons[7].pressed) || !!(gp.buttons[0] && gp.buttons[0].pressed); brake = brake || !!(gp.buttons[6] && gp.buttons[6].pressed); drift = drift || !!(gp.buttons[1] && gp.buttons[1].pressed); }
  return { steer, gas, brake, drift, horn: false, radio: false };
};
S.versus = {
  pausable: true, view: 'side', res: [480, 270], expand: true,
  enter(d) {
    this.d = d; OB.wireRaceAudio(); OB.fx.clear(); OB.bubble = null; this.t = 0; this.done = false; this.winner = null;
    const mk = (car, color) => new OB.Race({ mode: 'versus', single: true, car, color, pass: d.pass, station: d.station, stage: d.stage, seed: d.seed || 1, noRequests: true, countdown: 3.4 });
    const others = OB.CARS.filter(c => OB.save.cars.includes(c.id) && c.id !== d.car);
    this.r1 = mk(d.car, d.color); this.r2 = mk((others[0] || OB.CARS.find(c => c.id === d.car)).id, (d.color + 1) % OB.COLORS.length); this.r2.passId = 'dante';
    OB.playSong(d.station, .1); OB.pauseItems = () => [['Restart', () => { game.resume(); game.go('versus', this.d); }]];
  },
  exit() { OB.pauseItems = null; },
  update(dt) {
    const I = game.input, [mx] = I.move(); OB.voice.update(dt); this.t += dt;
    this.r1.update(dt, { steer: mx, gas: I.down('gas'), brake: I.down('brake'), drift: I.down('drift'), horn: false, radio: false });
    this.r2.update(dt, ctl2());
    for (const R of [this.r1, this.r2]) R.turnSky = (R.turnSky || 0) + R.road.curveAt(R.pz) * R.speed * 12 * dt * .004;
    OB.engine(dt, this.r1.speed, I.down('gas'), Math.abs(this.r1.x) > 1.08);
    if (!this.winner) { if (this.r1.state === 'goal') this.winner = 1; else if (this.r2.state === 'goal') this.winner = 2; }
    if (this.winner && !this.done && (this.winner === 1 ? this.r1 : this.r2).endT > 2.8) { this.done = true; game.go('results', { mode: 'versus', winner: this.winner, t1: this.r1.stageT, t2: this.r2.stageT, stage: this.d.stage, stats: {}, seeds: 0, petals: 0, grade: 'E', score: 0, route: [this.d.stage], car: this.r1.car.id, color: this.r1.color, passId: 'marisol' }); }
  },
  draw(r) {
    const W = r.W, H = r.H, hw = Math.floor(W / 2);
    OB.drawRace(r, this.r1, { vp: { x: 0, y: 0, w: hw - 1, h: H }, compact: true, rowLabel: 'PLAYER 1' });
    OB.drawRace(r, this.r2, { vp: { x: hw + 1, y: 0, w: W - hw - 1, h: H }, compact: true, rowLabel: 'PLAYER 2' });
    r.overlay(g => {
      px.rect(g, hw - 1, 0, 2, H, '#ffd6f0');
      const gp = pad2(); T(g, 'P1 ' + game.input.label('gas') + ' gas  ' + game.input.label('drift') + ' slide', 6, H - 10, '#ffe27a', { font: 'tiny' });
      T(g, gp ? 'P2 pad 2' : 'P2  I gas  K brake  J L steer  U slide', W - 6, H - 10, '#ffe27a', { align: 'right', font: 'tiny' });
      if (this.winner) { E.font.title(g, 'PLAYER ' + this.winner + ' WINS', W / 2, Math.round(H * .36), { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 }); }
    });
  }
};
})();
