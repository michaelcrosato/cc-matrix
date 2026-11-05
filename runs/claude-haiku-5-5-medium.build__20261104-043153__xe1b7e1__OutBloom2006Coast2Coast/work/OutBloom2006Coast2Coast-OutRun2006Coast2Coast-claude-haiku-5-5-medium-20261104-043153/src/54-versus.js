// Versus (plan §7.11): two drivers on one screen, split in two. Each driver has a race of the same route and the same
// seeded traffic; the other car shows on each screen as a ghost. The second driver is a second pad if one has joined,
// else the CPU. The first to the end wins. (Deviation: the two cars do not collide with each other.)
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px } = E;
const G = () => OB.game;
const INK = '#fff4e0', SUN = '#ffcf4a';

const ROUTES = [
  { name: 'FLOWER SPRINT', sub: 'S1 → S2 → S5', route: ['S1', 'S2', 'S5'] },
  { name: 'CLIFF SPRINT', sub: 'S1 → S3 → S6', route: ['S1', 'S3', 'S6'] },
  { name: 'FULL COAST', sub: 'S1 → S2 → S5 → S9 → S13 → Goal C', route: ['S1', 'S2', 'S5', 'S9', 'S13'] },
];

/** a driver's intent from its input (a pad or the keys) */
function intentOf(I) {
  return { steer: I.move()[0], gas: OB.analog(I, 'gas'), brake: OB.analog(I, 'brake'), drift: I.down('drift'), shiftUp: I.pressed('shiftUp'), shiftDown: I.pressed('shiftDown') };
}

/* ---- the route and the second driver's choice ---- */
const versusMenu = {
  enter() { this.route = 0; this.focus = 0; OB.Music.play('garden'); OB.idle.reset(); },
  update(dt) {
    const I = G().input;
    if (I.pressed('up')) this.focus = (this.focus + 3) % 4;
    if (I.pressed('down')) this.focus = (this.focus + 1) % 4;
    if (I.pressed('left') || I.pressed('right')) { if (this.focus === 0) this.route = (this.route + (I.pressed('left') ? 2 : 1)) % 3; }
    if (I.pressed('confirm') || I.pressed('start')) { if (this.focus === 1) this.start(); else if (this.focus === 2) { OB.versusCpu = !OB.versusCpu; OB.Sfx.play('select'); } else if (this.focus === 3) G().go('menu', null, { fade: 'wipe' }); else this.focus = 1; }
    if (I.pressed('cancel')) G().go('menu', null, { fade: 'wipe' });
  },
  start() {
    // a human driver 2: a second player on the keys (the right half), which leaves again when the screen does
    if (OB.versusCpu === false && G().players.length < 2) G().addPlayer({ keys: 'right' });
    G().go('versusrace', { route: ROUTES[this.route].route, cpu: OB.versusCpu !== false }, { fade: 'wipe' });
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#1e1040', '#4a1e6a', '#c85a6a']);
    r.overlay(g => {
      E.font.title(g, 'VERSUS 2P', W / 2, 8, { scale: 2, align: 'center' });
      const rows = [
        ['ROUTE', ROUTES[this.route].name + '   ' + ROUTES[this.route].sub],
        ['DRIVER 2', OB.versusCpu !== false ? 'CPU' : 'HUMAN (KEYS RIGHT, OR A SECOND PAD)'],
        ['', ''],
      ];
      rows.forEach(([lab, val], i) => {
        const y = 52 + i * 34, f = this.focus === i;
        OB.UI.panel(g, W / 2 - 170, y, 340, 26, { bg: f ? ['#4a1e6a', '#7a3a7a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#8a6a9a', alpha: .95 });
        if (lab) { E.font.text(g, lab, W / 2 - 162, y + 4, f ? SUN : '#c8b8d8', { outline: false, shadow: '#000', font: 'tiny' }); E.font.text(g, val, W / 2 - 162, y + 14, INK, { outline: false, shadow: '#000', font: 'tiny' }); }
      });
      const bs = [['START', 1], ['DRIVER 2', 2], ['BACK', 3]];
      bs.forEach(([lab, i], k) => {
        const x = W / 2 - 170 + k * 116, y = 52 + 2 * 34 + 20, f = this.focus === i;
        OB.UI.panel(g, x, y, 108, 24, { bg: f ? ['#7a3a7a', '#aa5a9a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#8a6a9a' });
        E.font.text(g, lab, x + 54, y + 7, f ? SUN : INK, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      });
      E.font.text(g, 'Left and right change the route. Up and down move. Driver 2 is a second pad, or the CPU.', W / 2, H - 40, '#ffd6a0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      OB.UI.footer(r, H - 16, [['confirm', 'Select'], ['cancel', 'Back']]);
    });
  },
};

/* ---- the race: two drivers, one screen, each in its own viewport ---- */
const versusrace = {
  pausable: true, touch: [],
  enter(data) {
    OB.race = null;
    const seed = (data.seed || (Math.floor(Math.random() * 1e6) + 1));
    const base = { mode: 'trial', car: 'orchidea', passenger: 'marisol', route: data.route, seed, cheats: {} };
    this.botA = !!data.botA;
    this.A = new OB.Race(Object.assign({}, base, { paint: 0, traffic: true, bot: data.botA ? new OB.Brain({ forks: [], skill: .95, drift: true }) : null }));
    this.B = new OB.Race(Object.assign({}, base, { paint: 1, traffic: true, car: 'gardenia', bot: data.cpu !== false ? new OB.Brain({ forks: [], skill: .95, drift: true }) : null }));
    this.A.skipHud = this.B.skipHud = true;
    this.cpu = data.cpu !== false; this.winner = null; this.endT = 0; this.turn = [0, 0];
    this.A.others = []; this.B.others = [];
    this.pad2 = !this.cpu && G().players && G().players[1] ? G().players[1] : null;
    if (!this.cpu && !this.pad2) this.cpu = true;   // (no second driver came: the CPU drives)
    G().splitScreen(2, { layout: 'rows' });
    OB.Music.play('pastel');
    OB.race = this.A;
  },
  exit() { G().splitScreen(0); OB.race = null; for (const q of G().players.slice(1)) G().removePlayer(q); },
  update(dt) {
    const I = G().input;
    if (this.winner === null) {
      this.A.others = [this.stateOf(this.B, 'B')]; this.B.others = [this.stateOf(this.A, 'A')];
      this.A.step(dt, this.botA ? null : intentOf(I));
      this.B.step(dt, this.pad2 ? intentOf(this.pad2) : null);
      // the two cars collide when they share a stage and meet (a cooldown keeps one meeting to one contact)
      this.vsHit = Math.max(0, (this.vsHit || 0) - dt);
      if (this.A.stage.def.id === this.B.stage.def.id && this.vsHit <= 0) {
        const dz = this.B.car.z - this.A.car.z, dx = this.B.car.x - this.A.car.x;
        if (Math.abs(dz) < 260 && Math.abs(dx) < .4) {
          this.vsHit = .6;
          const va = this.A.car.v, vb = this.B.car.v;
          this.A.car.collideWith({ v: vb, x: this.B.car.x, id: 'P2' });
          this.B.car.collideWith({ v: va, x: this.A.car.x, id: 'P1' });
        }
      }
      for (const [race, name] of [[this.A, 'P1'], [this.B, this.cpu ? 'CPU' : 'P2']]) if (race.status === 'finish' || race.status === 'goal') { if (!this.winner) this.winner = race === this.A ? 'P1' : name; }
    } else {
      this.endT += dt;
      if (this.endT > 2 && (I.pressed('confirm') || I.pressed('start'))) { G().go('versus', null, { fade: 'wipe' }); }
      if (I.pressed('cancel')) G().go('menu', null, { fade: 'wipe' });
    }
    if (this.winner !== null && this.endT > 12) G().go('versus', null, { fade: 'wipe' });
  },
  stateOf(race, id) { return { stage: race.stage.def.id, z: race.car.z, x: race.car.x, v: race.car.v, color: id === 'A' ? '#e0503a' : '#3a7ad8', name: id }; },
  draw(r) {
    const prev = OB.race, race = r.viewport && r.viewport.i === 1 ? this.B : this.A;
    OB.race = race;
    try { OB.scenes.race.draw.call(OB.scenes.race, r); } finally { OB.race = prev; }
  },
  hud(r) {
    const W = r.W, H = r.H;
    r.overlay(g => {
      E.font.text(g, 'P1', 4, 4, '#ffe6c0', { shadow: '#000', outline: false, font: 'tiny' });
      E.font.text(g, this.cpu ? 'CPU' : 'P2', 4, H / 2 + 4, '#ffe6c0', { shadow: '#000', outline: false, font: 'tiny' });
      E.font.text(g, 'P1 ' + Math.round(this.A.car.z / Math.max(1, this.A.stage.len) * 100) + '%', W - 4, 4, '#ffffff', { align: 'right', shadow: '#000', outline: false, font: 'tiny' });
      E.font.text(g, (this.cpu ? 'CPU ' : 'P2 ') + Math.round(this.B.car.z / Math.max(1, this.B.stage.len) * 100) + '%', W - 4, H / 2 + 4, '#ffffff', { align: 'right', shadow: '#000', outline: false, font: 'tiny' });
      if (this.A.status === 'countdown') { const n = Math.ceil(this.A.countdown); E.font.title(g, n > 0 ? String(n) : 'GO!', W / 2, H * .42, { scale: 3, align: 'center' }); }
      if (this.winner) {
        OB.UI.panel(g, W / 2 - 110, H / 2 - 20, 220, 40, { bg: ['#1a0e34', '#2a1450'], alpha: .92 });
        E.font.text(g, this.winner + ' WINS!', W / 2, H / 2 - 12, SUN, { align: 'center', outline: false, shadow: '#000', scale: 2 });
        E.font.text(g, 'PRESS ' + (G().input.label('confirm') || 'ENTER') + ' FOR A REMATCH', W / 2, H / 2 + 8, INK, { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      }
    });
  },
};
OB.scenes = OB.scenes || {};
Object.assign(OB.scenes, { versus: versusMenu, versusrace });
})();
