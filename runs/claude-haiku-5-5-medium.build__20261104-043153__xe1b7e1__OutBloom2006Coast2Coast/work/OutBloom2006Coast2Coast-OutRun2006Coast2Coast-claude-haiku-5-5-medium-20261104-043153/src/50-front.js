// The front end (plan §7.17): the title with its sunrise, the main menu, the garage (the car, its paint, the driver,
// the passenger and the radio, then the start), How to Play, and About & Credits. Every screen idles into the attract
// mode after ten seconds (60-attract.js), and every one can be left with the cancel button.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px, clamp } = E;
const G = () => OB.game;
const INK = '#fff4e0', SUN = '#ffcf4a', PINK = '#ff5fa2';
const pref = () => OB.profile.last;

/** the player's saved choices (the garage keeps them between runs) */
OB.profile = OB.profile || { last: { car: 1, paint: 0, passenger: 0, station: 0, mode: 'arcade' } };
OB.saveProfile = () => { if (E.store) E.store.set('outbloom:profile', { v: 1, last: OB.profile.last, best: OB.profile.best || {} }); };
OB.loadProfile = () => {
  const p = E.store && E.store.get('outbloom:profile', null);
  if (p && p.v === 1) OB.profile = { last: Object.assign({ car: 1, paint: 0, passenger: 0, station: 0 }, p.last), best: p.best || {} };
};

/** the sunrise behind the title and the menus: a sky, a sun, a sea, a row of palms */
function sunrise(r, colors) {
  r.sky(colors || ['#2a1450', '#7a2a6a', '#ff8a5a']);
  const W = r.W, H = r.H;
  r.overlay(g => {
    px.disc(g, W * .5, H * .62, H * .16, '#ffd060');
    px.disc(g, W * .5, H * .62, H * .24, 'rgba(255,208,96,.25)');
    px.rect(g, 0, H * .66, W, H * .34, '#3a6ac8');
    for (let k = 0; k < 14; k++) px.rect(g, W * .5 - W * .4 + k * W * .06, H * .66 + (k % 3) * 2, W * .03, 1, 'rgba(255,255,255,.35)');
  });
}

/** the touch-only notice: a pad and a keyboard, the words, and the Settings button */
function notice(r, y) {
  r.overlay(g => {
    OB.UI.panel(g, r.W / 2 - 150, y, 300, 58, { bg: ['#1e1040', '#3a2050'] });
    E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 12, SUN, { align: 'center', outline: false, shadow: '#000', scale: 1 });
    E.font.text(g, 'This demo plays with a pad or keys, not touch.', r.W / 2, y + 30, INK, { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
  });
}

/* ---- title ---- */
const title = {
  enter() { OB.Music.play('title'); OB.idle.reset(); },
  update(dt) {
    OB.idle.tick(dt, 'title');
    const I = G().input;
    if (OB.env.touchOnly) {
      // a tap on SETTINGS opens the settings (the notice's button)
      const c = I.clicked && I.clicked(), W = G().W, H = G().H;
      if (c && c[0] >= W / 2 - 60 && c[0] <= W / 2 + 60 && c[1] >= H * .6 + 64 && c[1] <= H * .6 + 86) G().menu('settings');
      return;
    }
    if (I.pressed('confirm') || I.pressed('start')) G().go('menu', null, { fade: 'wipe' });
  },
  draw(r) {
    sunrise(r);
    const W = r.W, H = r.H;
    r.overlay(g => {
      E.font.title(g, 'OutBloom', W / 2, H * .18, { scale: 4, align: 'center' });
      E.font.text(g, '2006', W / 2 + 118, H * .18 + 4, SUN, { align: 'center', outline: false, shadow: '#000', scale: 2 });
      E.font.text(g, 'COAST 2 COAST', W / 2, H * .18 + 50, INK, { align: 'center', outline: false, shadow: '#000', scale: 2 });
      E.font.text(g, 'ONE DAY. ONE ROAD. EVERY FLOWER IN BLOOM.', W / 2, H * .18 + 76, '#ffd6a0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
    });
    if (OB.env.touchOnly) { notice(r, H * .6); r.overlay(g => { OB.UI.panel(g, W / 2 - 60, H * .6 + 64, 120, 22, {}); E.font.text(g, 'SETTINGS', W / 2, H * .6 + 70, SUN, { align: 'center', outline: false, shadow: '#000', scale: 2 }); }); }
    r.overlay(g => {
      const label = G().input.lastDevice === 'gamepad' ? 'PRESS' : 'PRESS ENTER';
      const t = G().time || 0;
      if (!OB.env.touchOnly && Math.floor(t * 2) % 2 === 0) {
        const w = E.font.width(label, { scale: 2 }) + 36;
        OB.UI.prompt(g, Math.round(W / 2 - w / 2), Math.round(H * .86), 'confirm', label, { scale: 2 });
      }
      E.font.text(g, OB.VERSION, 4, H - 10, '#c8b8d8', { outline: false, shadow: '#000', font: 'tiny' });
    });
  },
};

/* ---- main menu ---- */
const menuItems = [
  { label: 'ARCADE RUN', sub: 'Five stages, one clock, the coast', mode: 'arcade' },
  { label: 'LOVE IN BLOOM', sub: 'Pleases your passenger, for petals', mode: 'love' },
  { label: 'COAST 2 COAST TOUR', sub: 'Fourteen postcards from four friends', tour: true },
  { label: 'TIME TRIAL', sub: 'Count up, and beat the stage', trial: true },
  { label: 'VERSUS 2P', sub: 'Two drivers, one screen, one road', versus: true },
  { label: 'GARAGE GARDEN', sub: 'Plant seeds to unlock cars and songs', garden: true },
  { label: 'GARAGE', sub: 'Car, paint, passenger, song' },
  { label: 'HOW TO PLAY', sub: 'Six pages, with the keys' },
  { label: 'ABOUT & CREDITS', sub: 'The credits, and the answers' },
  { label: 'SETTINGS', sub: 'Difficulty, camera, the buttons' },
];
const menu = {
  enter() { OB.Music.play('garden'); this.m = null; OB.idle.reset(); },
  update(dt) {
    OB.idle.tick(dt, 'menu');
    const I = G().input;
    if (!this.m) this.m = new OB.Menu(menuItems.map((it, i) => Object.assign({}, it, { act: () => pick(i) })), { x: 240, y: 74, gap: 8, cols: 3, w: 150, h: 30, onBack: () => G().go('title', null, { fade: 'wipe' }) }).layout(r_(), 0);
    this.m.update(dt, I);
  },
  draw(r) {
    sunrise(r, ['#1e1040', '#4a1e6a', '#c85a6a']);
    const m = this.m; if (!m) return;
    m.o.x = r.W / 2; m.layout(r.W, r.H);
    r.overlay(g => {
      E.font.title(g, 'OutBloom', r.W / 2, 10, { scale: 2, align: 'center' });
      m.draw(g, { scale: 2 });
      const it = menuItems[m.focus];
      if (it) E.font.text(g, it.sub, r.W / 2, r.H - 40, '#ffd6a0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      OB.UI.footer(r, r.H - 22, [['confirm', 'Select'], ['cancel', 'Back']]);
    });
  },
};
// (the menu lays its items on the screen's centre)
function r_() { return { W: OB.game.W, H: OB.game.H }; }
function pick(i) {
  const it = menuItems[i];
  if (it.mode) { G().go('garage', { mode: it.mode }, { fade: 'wipe' }); }
  else if (it.trial) G().go('trialsetup', null, { fade: 'wipe' });
  else if (it.tour) G().go('tour', null, { fade: 'wipe' });
  else if (it.garden) G().go('garden', null, { fade: 'wipe' });
  else if (it.versus) G().go('versus', null, { fade: 'wipe' });
  else if (i === 6) G().go('garage', { mode: 'arcade', browse: true }, { fade: 'wipe' });
  else if (i === 7) G().go('howto', null, { fade: 'wipe' });
  else if (i === 8) G().go('about', null, { fade: 'wipe' });
  else if (i === 9) G().menu('settings');
}

/* ---- the garage: car, paint, passenger, radio, and START ---- */
const garage = {
  enter(data = {}) {
    this.mode = data.mode || 'arcade'; this.browse = !!data.browse; this.missionId = data.mission || null; this.focus = 0; this.rows = this.browse ? 5 : 6;   // (car, paint, passenger, radio, then START and BACK; browsing has no START)
    OB.loadProfile(); this.p = OB.profile.last;
    if (this.p.car === undefined) this.p.car = 1;
    OB.Music.play('garden'); OB.idle.reset();
  },
  update(dt) {
    OB.idle.tick(dt, 'garage');
    const I = G().input; const rows = this.rows;
    if (I.pressed('up') || I.repeat('up', .4, .15)) this.focus = (this.focus + rows - 1) % rows;
    if (I.pressed('down') || I.repeat('down', .4, .15)) this.focus = (this.focus + 1) % rows;
    const dir = I.pressed('right') || I.repeat('right', .35, .14) ? 1 : I.pressed('left') || I.repeat('left', .35, .14) ? -1 : 0;
    if (dir) this.change(this.focus, dir);
    if (I.pressed('confirm') || I.pressed('start')) {
      if (this.focus === rows - 1) { G().go('menu', null, { fade: 'wipe' }); }
      else if (!this.browse && this.focus === rows - 2) this.start();
    }
    if (I.pressed('cancel')) G().go('menu', null, { fade: 'wipe' });
  },
  change(row, dir) {
    const p = this.p;
    if (row === 0) { for (let k = 0; k < OB.CARS.length; k++) { p.car = (p.car + dir + OB.CARS.length) % OB.CARS.length; if (OB.Progress.carOwned(OB.CARS[p.car].id)) break; } p.paint = 0; }
    else if (row === 1) { const n = OB.Progress.paintsFor(OB.CARS[p.car]).length; p.paint = (p.paint + dir + n) % n; }
    else if (row === 2) p.passenger = (p.passenger + dir + OB.CAST_ORDER.length) % OB.CAST_ORDER.length;
    else if (row === 3) { for (let k = 0; k < OB.STATIONS.length; k++) { p.station = (p.station + dir + OB.STATIONS.length) % OB.STATIONS.length; if (!OB.STATIONS[p.station].unlock || OB.Progress.owns(OB.STATIONS[p.station].unlock)) break; } OB.Music.play(OB.STATIONS[p.station].song); }
    OB.Sfx.play('select', { vol: .4 }); OB.saveProfile();
  },
  start() {
    const p = this.p, car = OB.CARS[p.car];
    const m = this.missionId ? OB.MISSIONS.find(x => x.id === this.missionId) : null;
    G().go('race', { mode: m ? (m.rule === 'love' ? 'love' : 'arcade') : this.mode, car: car.id, paint: p.paint, passenger: OB.CAST_ORDER[p.passenger], station: p.station, difficulty: G().settings.difficulty || 'Normal', route: m ? m.route : null, mission: this.missionId, cheats: {} }, { fade: 'wipe' });
  },
  draw(r) {
    const W = r.W, H = r.H, p = this.p, car = OB.CARS[p.car], paints = OB.Progress.paintsFor(car);
    sunrise(r, ['#1a1040', '#3a1a5a', '#8a3a6a']);
    r.overlay(g => {
      E.font.title(g, 'GARAGE', W / 2, 8, { scale: 2, align: 'center' });
      // the car on the left, turning slowly on the turntable (a side profile in code)
      const cx = W * .25, cy = H * .62, s = Math.max(.9, H / 170);
      px.ell(g, cx, cy + 2, 70 * s, 6 * s, 'rgba(0,0,0,.35)');
      OB.Art.playerCar(g, cx, cy, s * 1.25, { paint: paints[p.paint % paints.length], steer: 0, brake: false, passenger: { skin: '#f0c8a0' }, passengerHair: OB.CAST[OB.CAST_ORDER[p.passenger]].hair });
      E.font.text(g, car.name.toUpperCase(), cx, cy + 14 * s, SUN, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      E.font.text(g, car.year + '  ' + car.class.toUpperCase(), cx, cy + 26 * s, INK, { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      // the stat bars: top speed, 0–100, handling
      const bars = [['TOP', car.top / 340], ['0-100', 1 - (car.zero - 3) / 3.5], ['HANDLING', car.steer / 2.5]];
      bars.forEach(([lab, v], i) => { const y = H * .8 + i * 9; E.font.text(g, lab, W * .05, y, INK, { outline: false, shadow: '#000', font: 'tiny' }); E.ui.bar(g, W * .2, y + 1, W * .18, 4, clamp(v, 0, 1), SUN); });
      // the rows on the right
      const rows = [
        ['CAR', car.name],
        ['PAINT', 'PAINT ' + (p.paint + 1) + ' OF ' + paints.length],
        ['PASSENGER', OB.CAST[OB.CAST_ORDER[p.passenger]].name],
        ['RADIO', OB.STATIONS[p.station].freq + ' ' + OB.STATIONS[p.station].name],
      ];
      const x0 = W * .48, gapY = 34;
      rows.forEach(([lab, val], i) => {
        const f = i === this.focus, y = 40 + i * gapY;
        OB.UI.panel(g, x0, y, W * .48, 26, { bg: f ? ['#4a1e6a', '#7a3a7a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#8a6a9a', alpha: .95 });
        E.font.text(g, lab, x0 + 6, y + 4, f ? SUN : '#c8b8d8', { outline: false, shadow: '#000', font: 'tiny' });
        E.font.text(g, val, x0 + 6, y + 14, INK, { outline: false, shadow: '#000', font: 'tiny', scale: 1 });
        if (f) { E.font.text(g, '<', x0 + W * .48 - 10, y + 8, SUN, { outline: false, shadow: '#000', scale: 2 }); }
      });
      const last = OB.CAST[OB.CAST_ORDER[p.passenger]];
      OB.Art.portrait(g, OB.CAST_ORDER[p.passenger], x0, 40 + 4 * gapY + 4, 44, 'happy');
      E.font.text(g, last.bio, x0 + 50, 40 + 4 * gapY + 8, INK, { outline: false, shadow: '#000', font: 'tiny' });
      const btnY = H - 38;
      if (!this.browse) OB.UI.panel(g, x0, btnY - 12, W * .22, 20, { bg: this.focus === rows.length ? ['#7a3a7a', '#aa5a9a'] : ['#1e1040', '#3a2050'] });
      if (!this.browse) E.font.text(g, 'START', x0 + W * .11, btnY - 6, SUN, { align: 'center', outline: false, shadow: '#000', scale: 2 });
      E.font.text(g, 'BACK', W * .8, btnY - 6, INK, { align: 'center', outline: false, shadow: '#000', scale: 2 });
      OB.UI.footer(r, H - 16, [['up', 'Move'], ['left', 'Change'], ['confirm', this.browse ? 'Back' : 'Start'], ['cancel', 'Back']]);
    });
  },
};

/* ---- how to play: six pages, each with its words ---- */
const HOWTO = [
  ['DRIVING', ['Hold the gas on the right trigger, or W or up.', 'Steer with the stick or A and D, or left and right.', 'The brake is on the left trigger, or S or down.', 'The road bends. Slow down for the sharp ones.']],
  ['DRIFTING', ['Steer and tap the brake to drift at speed.', 'Or hold the drift button, the circle or Space.', 'The drift builds style points for the Bloom chain.', 'Counter-steer to straighten. Let go to end it.']],
  ['SLIPSTREAM', ['Tuck in behind a car to slipstream.', 'Pull out of its shadow for a slingshot.', 'Pass a car close and fast for a near miss.', 'Near misses are worth the most style points.']],
  ['FORKS AND CHECKPOINTS', ['Each stage ends in a fork: two roads.', 'Steer to the side you want when you reach it.', 'Each checkpoint gives you more daylight.', 'Five stages to the coast. Five goals, five endings.']],
  ['LOVE IN BLOOM', ['Your passenger has requests as you drive.', 'Balloons, gnomes, cones, arches, overtakes, near misses.', 'Please her for petals. Perfect is five petals.', 'Her favourite requests give more. Grades go AAA to E.']],
  ['CONTROLS AND SETTINGS', ['The pause menu has settings, controls and Dev Mode.', 'Dev Mode sets the balance with live sliders.', 'Buttons show as PlayStation, or Xbox in Settings.', 'Press cancel to leave any screen.']],
];
const howto = {
  enter() { this.page = 0; OB.idle.reset(); },
  update(dt) {
    OB.idle.tick(dt, 'howto');
    const I = G().input;
    if (I.pressed('right') || I.pressed('nextTab')) this.page = (this.page + 1) % HOWTO.length;
    if (I.pressed('left') || I.pressed('prevTab')) this.page = (this.page + HOWTO.length - 1) % HOWTO.length;
    if (I.pressed('cancel') || I.pressed('confirm')) G().go('menu', null, { fade: 'wipe' });
  },
  draw(r) {
    const [h, lines] = HOWTO[this.page], W = r.W, H = r.H;
    sunrise(r, ['#1e1040', '#4a1e6a', '#7a3a6a']);
    r.overlay(g => {
      OB.UI.panel(g, 20, 24, W - 40, H - 58, { bg: ['#1a0e34', '#2a1450'] });
      E.font.title(g, h, W / 2, 34, { scale: 2, align: 'center' });
      lines.forEach((l, i) => E.font.text(g, l, 40, 74 + i * 26, INK, { outline: false, shadow: '#000', scale: 2 }));
      E.font.text(g, (this.page + 1) + ' / ' + HOWTO.length, W / 2, H - 42, SUN, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      OB.UI.footer(r, H - 16, [['left', 'Page'], ['right', 'Page'], ['cancel', 'Back']]);
    });
  },
};

/* ---- about and credits: the credits, then the source information and the feedback (the same text as the JSON) ---- */
const about = {
  enter() { this.page = 0; OB.idle.reset(); },
  pages() { return OB.aboutPages(); },
  update(dt) {
    OB.idle.tick(dt, 'about');
    const I = G().input, n = this.pages().length;
    if (I.pressed('right') || I.pressed('nextTab')) this.page = (this.page + 1) % n;
    if (I.pressed('left') || I.pressed('prevTab')) this.page = (this.page + n - 1) % n;
    if (I.pressed('cancel') || I.pressed('confirm')) G().go('menu', null, { fade: 'wipe' });
  },
  draw(r) {
    const W = r.W, H = r.H, pg = this.pages()[this.page];
    sunrise(r, ['#1e1040', '#3a1a5a', '#5a2a6a']);
    r.overlay(g => {
      OB.UI.panel(g, 14, 16, W - 28, H - 46, { bg: ['#1a0e34', '#2a1450'] });
      E.font.title(g, pg.title, W / 2, 24, { scale: 2, align: 'center' });
      const lines = pg.lines;
      lines.slice(0, 9).forEach((l, i) => E.font.text(g, l, 26, 56 + i * 20, INK, { outline: false, shadow: '#000', font: 'tiny', scale: 1 }));
      E.font.text(g, (this.page + 1) + ' / ' + this.pages().length, W / 2, H - 36, SUN, { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      OB.UI.footer(r, H - 16, [['left', 'Page'], ['right', 'Page'], ['cancel', 'Back']]);
    });
  },
};

OB.scenes = OB.scenes || {};
Object.assign(OB.scenes, { title, menu, garage, howto, about });
})();
