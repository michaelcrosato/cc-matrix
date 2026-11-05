/* OutBloom — the front end: the title (the logo over Sunrise Strand, PRESS ✕ / PRESS ENTER by device, the touch-only
 * notice), the main menu (a carousel of six mode cards, then Settings, How to Play, About & Credits), the garage (car,
 * paint, driver, passenger), the radio (stations, transmission), How to Play (six pages, each with a live demo) and
 * About & Credits (paged). Every screen: at most seven focusable items, a footer of prompts, a way back. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const game = OB.game, UI = OB.UI, C = UI.COL, SC = OB.SCENES = OB.SCENES || {};
const P = () => OB.Profile.data;
const go = (s, d) => game.go(s, d, { fade: 'wipe', seconds: .3 });
/* ---- a shared backdrop: the title's sky, the sea, drifting petals ---- */
OB.menuBG = (g, W, H, t, sky = 'title') => {
  OB.Sky.draw(g, { x: 0, y: 0, w: W, h: H }, H * .62, sky, t * 30, t, {});
  const sea = E.tones('#c8607a'); px.rect(g, 0, Math.round(H * .62), W, Math.round(H * .38), sea.base);
  for (let i = 0; i < 60; i++) { const x = (i * 97 + t * (10 + i % 5) * 3) % W, y = H * .63 + (i * 37 % 100) / 100 * H * .37; px.rect(g, Math.round(x), Math.round(y), 2 + i % 4, 1, i % 3 ? sea.lt : '#ffe0a0'); }
  OB.FX.weather(g, { x: 0, y: 0, w: W, h: H }, 'petals', t, .5);
};
/** the logo: OUTBLOOM extruded pink to gold, a sunflower for the O, a 2006 badge, COAST 2 COAST on a road stripe */
OB.drawLogo = (g, cx, y, t, scale = 5) => {
  const s = scale, word = 'UTBLOOM', w = UI.width(word, s) + 8 * s;
  E.font.title(g, word, Math.round(cx + 4 * s), Math.round(y), { align: 'center', scale: s, colors: ['#fff4e0', '#ffb3d1', '#ff7a59', '#ffcf4a'], depth: 4, depthColor: '#5a1e4a' });
  const fx = cx - w / 2 + 4 * s, fy = y + 3.5 * s;   // the sunflower O
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t * .4; px.ell(g, Math.round(fx + Math.cos(a) * 3.2 * s), Math.round(fy + Math.sin(a) * 3.2 * s), Math.round(1.6 * s), Math.round(1.6 * s), k % 2 ? '#ffc81a' : '#ffdf5a'); }
  px.disc(g, Math.round(fx), Math.round(fy), Math.round(2.4 * s), '#6a3a1a'); px.disc(g, Math.round(fx - .6 * s), Math.round(fy - .6 * s), Math.round(1 * s), '#8a5a2a');
  const sh = (t % 6) / 6; if (sh < .25) { const sx = cx - w / 2 + sh * 4 * (w + 40); for (let k = 0; k < 7 * s; k++) px.rect(g, Math.round(sx + k * .3), Math.round(y - 2 + k), 2, 1, '#ffffff'); }
  // the badge and the stripe
  const bx = cx + w / 2 - 10, by = y - 8; px.rect(g, Math.round(bx - 2), Math.round(by), 34, 14, '#1a0a28'); px.rect(g, Math.round(bx - 1), Math.round(by + 1), 32, 12, '#ff5fa2'); UI.text(g, '2006', bx + 15, by + 3, { align: 'center', color: '#ffffff', shadow: false });
  const ry = y + 8 * s + 6; px.poly(g, [[cx - 92, ry + 14], [cx - 80, ry], [cx + 80, ry], [cx + 92, ry + 14]], '#3a3448'); for (let k = -3; k <= 3; k++) px.rect(g, Math.round(cx + k * 22 - 6), ry + 6, 12, 2, '#fff4e0');
  UI.text(g, 'COAST 2 COAST', cx, ry + 2, { align: 'center', scale: 1, color: '#ffcf4a' });
};
/* ---- the title ---- */
let titleT = 0, titleCar = null;
SC.title = {
  res: [480, 270], expand: true, touch: [],
  enter() { titleT = 0; UI.idleT = 0; UI.screenName = 'title'; if (OB.Audio) OB.Audio.music('title'); OB.FX.clear(); if (OB.Touch) OB.Touch.refresh(); },
  update(dt) {
    titleT += dt; const I = game.input;
    const active = UI.tickIdle(dt);
    if (OB.Touch && OB.Touch.blocked()) { const c = I.clicked && I.clicked(); if (c && OB.Touch.settingsHit(c)) game.menu('settings'); if (UI.idleT > 10) OB.Attract.start('title'); return; }
    if (UI.idleT > 10 && OB.Attract) { OB.Attract.start('title'); return; }
    if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) { OB.sfx && OB.sfx('confirm'); go('menu'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      const road = OB.World.stage('S1');
      road.drawTo(g, { x: 0, y: 0, w: W, h: H }, { z: 3000 + titleT * 900, x: 0, h: 1000, focal: OB.FOCAL, horizon: .5, cars: [], sky: (g2, vp) => OB.Sky.draw(g2, vp, H * .5, 'beachDawn', titleT * 20, titleT, {}) }, titleT);
      const bank = OB.Art.car('orchidea', P().last && OB.CARS.orchidea.paints[0]);
      OB.Art.drawCar(g, bank, W / 2, H * .97, .9, { yaw: Math.sin(titleT * .5) * .15, occupants: (g2, A, k) => OB.Cast.drawOccupants(g2, A, k, { driver: 'leo', passenger: 'marisol', yaw: 0, speed: 120 }) });
      OB.FX.weather(g, { x: 0, y: 0, w: W, h: H }, 'petals', titleT, .6);
      OB.FX.bloom(g, { x: 0, y: 0, w: W, h: H }, .55, '#ffc890');
      OB.drawLogo(g, W / 2, 26, titleT, W >= 440 ? 5 : 4);
      if (OB.Touch && OB.Touch.blocked()) OB.Touch.drawNotice(g, W, H, titleT);
      else if (Math.floor(titleT * 2) % 2 === 0) { const pad = UI.device() === 'pad'; UI.panel(g, W / 2 - 60, H * .64, 120, 18, { alpha: .7 }); UI.prompt(g, W / 2, H * .64 + 4, pad ? 'confirm' : 'start', pad ? 'PRESS' : 'PRESS ENTER', { align: 'center' }); }
      UI.text(g, 'v' + OB.VERSION + '  ·  my-3D2dge ' + (E.versionLabel ? E.versionLabel().split(' ')[0] : E.version), 6, H - 11, { color: '#ffe0f0' });
      UI.text(g, '© 2026 an original homage', W - 6, H - 11, { align: 'right', color: '#ffe0f0' });
    });
  }
};
/* ---- the main menu: a carousel of six mode cards, then three buttons ---- */
const MODES = [
  { id: 'arcade', title: 'ARCADE RUN', sub: 'Five stages, one day, sixteen routes.', icon: 'sun' },
  { id: 'love', title: 'LOVE IN BLOOM', sub: 'Please your passenger. Earn her petals.', icon: 'heart' },
  { id: 'tour', title: 'COAST 2 COAST TOUR', sub: 'Fourteen postcards from four friends.', icon: 'star' },
  { id: 'trial', title: 'TIME TRIAL', sub: 'Any stage. Your best ghost. No traffic.', icon: 'trophy' },
  { id: 'versus', title: 'VERSUS 2P', sub: 'Split screen. Same road. One winner.', icon: 'car' },
  { id: 'garden', title: 'GARAGE GARDEN', sub: 'Plant seeds. Bloom cars, songs, colours.', icon: 'seed' }
];
let menuScr = null, menuSel = 0, menuT = 0;
const openMode = id => {
  if (id === 'arcade' || id === 'love') go('garage', { mode: id });
  else if (id === 'tour') go(P().seenTour ? 'tour' : 'tourintro');
  else if (id === 'trial') go('trial');
  else if (id === 'versus') go('versus');
  else if (id === 'garden') go('garden');
};
function drawModeArt(g, id, x, y, w, h, t) {   // a small live illustration per mode
  px.rect(g, x, y, w, h, '#2a1450');
  OB.Sky.draw(g, { x, y, w, h }, y + h * .6, { arcade: 'beachDawn', love: 'beachSunset', tour: 'fieldsMorning', trial: 'riviera', versus: 'canyon', garden: 'lake' }[id], t * 30, t, {});
  px.rect(g, x, Math.round(y + h * .6), w, Math.round(h * .4), { arcade: '#2f9ee6', love: '#e8b880', tour: '#7cbc58', trial: '#14204a', versus: '#e0a070', garden: '#6cb05c' }[id]);
  const cx = x + w / 2, gy = y + h - 6;
  if (id === 'garden') { for (let i = 0; i < 5; i++) { const fx = x + 14 + i * (w - 28) / 4, bl = (Math.sin(t * 2 + i) + 1) / 2; px.line(g, Math.round(fx), gy, Math.round(fx), Math.round(gy - 14 - bl * 6), '#3a8a3a', 2); px.disc(g, Math.round(fx), Math.round(gy - 16 - bl * 6), 4 + Math.round(bl * 2), ['#ff7ab8', '#ffd23a', '#ff5a3a', '#b07ae8', '#ffffff'][i]); } return; }
  if (id === 'tour') { for (let i = 0; i < 3; i++) { const px0 = x + 16 + i * 34, py0 = y + 14 + (i % 2) * 6; px.rect(g, px0, py0, 28, 20, '#fff4e0'); px.rect(g, px0 + 2, py0 + 2, 12, 10, ['#ffb3d1', '#a8e0f0', '#fff0a8'][i]); px.rect(g, px0 + 20, py0 + 2, 6, 7, '#ff5fa2'); } }
  const bank = OB.Art.car(id === 'trial' ? 'girasole' : id === 'versus' ? 'gardenia' : 'orchidea', id === 'trial' ? '#ffc81a' : id === 'versus' ? '#f4f2ee' : '#e8463a');
  if (id === 'versus') { OB.Art.drawCar(g, bank, cx - 22, gy, .3, { yaw: .1 }); OB.Art.drawCar(g, OB.Art.car('magnolia', '#2a3a8a'), cx + 22, gy - 2, .28, { yaw: -.1 }); }
  else if (id !== 'tour') OB.Art.drawCar(g, bank, cx, gy, .34, { yaw: Math.sin(t) * .3 });
  if (id === 'love') for (let i = 0; i < 6; i++) OB.Art.icon(g, 'heart', x + 10 + ((i * 40 + t * 20) % (w - 20)), y + 8 + Math.sin(t * 2 + i) * 4 + (i % 3) * 8);
  if (id === 'trial') { const a = g.globalAlpha; g.globalAlpha = .4; OB.Art.drawCar(g, OB.Art.car('girasole', '#ffffff'), cx + 26, gy - 6, .26, { yaw: 0, shadow: false }); g.globalAlpha = a; }
}
SC.menu = {
  res: [480, 270], expand: true,
  enter(d) {
    menuT = 0; UI.idleT = 0; UI.screenName = 'menu'; if (OB.Audio) OB.Audio.music('menu');
    menuScr = UI.screen({ name: 'menu', footer: [['nav', 'Mode'], ['confirm', 'Select'], ['cancel', 'Title']], back: () => go('title') });
    if (d && d.focus !== undefined) menuSel = d.focus;
  },
  layout(W, H) {
    const cw = Math.min(250, W * .52), ch = 150, cx = W / 2 - cw / 2, cy = 40;
    menuScr.setItems([
      { id: 'carousel', x: cx, y: cy, w: cw, h: ch, left: () => { menuSel = (menuSel + 5) % 6; }, right: () => { menuSel = (menuSel + 1) % 6; }, pick: () => openMode(MODES[menuSel].id), noFrame: false,
        clickX: x => { if (x < cx + 30) { menuSel = (menuSel + 5) % 6; OB.sfx && OB.sfx('tick'); return true; } if (x > cx + cw - 30) { menuSel = (menuSel + 1) % 6; OB.sfx && OB.sfx('tick'); return true; } return false; },
        draw: (g, it, f) => this.drawCarousel(g, it, f, W) },
      { id: 'settings', x: W / 2 - 165, y: 206, w: 104, h: 26, label: 'SETTINGS', scale: 1, pick: () => game.menu('settings') },
      { id: 'howto', x: W / 2 - 52, y: 206, w: 104, h: 26, label: 'HOW TO PLAY', scale: 1, pick: () => go('howto') },
      { id: 'about', x: W / 2 + 61, y: 206, w: 104, h: 26, label: 'ABOUT & CREDITS', scale: 1, pick: () => go('about') }
    ], true);
  },
  drawCarousel(g, it, f, W) {
    const t = menuT;
    for (const off of [-1, 1]) { const m = MODES[(menuSel + off + 6) % 6], w = it.w * .55, x = off < 0 ? it.x - w + 18 : it.x + it.w - 18, y = it.y + 24;
      UI.panel(g, x, y, w, it.h - 48, { bg: ['#1e0e38', '#3a1a4a'], border: '#8a6aa0' }); drawModeArt(g, m.id, x + 6, y + 6, w - 12, 50, t); UI.text(g, m.title, x + w / 2, y + 62, { align: 'center', color: C.dim }); }
    const m = MODES[menuSel];
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a1a6a', '#8a2a7a'] : C.panel, border: f ? C.sun : C.border });
    drawModeArt(g, m.id, it.x + 8, it.y + 8, it.w - 16, 86, t);
    OB.Art.icon(g, m.icon, it.x + 10, it.y + 102, 2);
    UI.text(g, m.title, it.x + it.w / 2 + 6, it.y + 100, { align: 'center', scale: 2, color: C.sun });
    UI.text(g, m.sub, it.x + it.w / 2, it.y + 122, { align: 'center' });
    for (let i = 0; i < 6; i++) px.rect(g, Math.round(it.x + it.w / 2 - 33 + i * 12), it.y + it.h - 10, 8, 3, i === menuSel ? C.sun : '#6a4a8a');
    UI.text(g, '◀', it.x + 6, it.y + 44, { scale: 2, color: f ? C.sun : C.dim }); UI.text(g, '▶', it.x + it.w - 16, it.y + 44, { scale: 2, color: f ? C.sun : C.dim });
  },
  update(dt) {
    menuT += dt; UI.tickIdle(dt);
    if (UI.idleT > 10 && OB.Attract) { OB.Attract.start('menu', { focus: menuSel }); return; }
    this.layout(game.W, game.H); menuScr.update(dt); UI.focusId = menuScr.current && menuScr.current.id;
  },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; this.layout(W, H); OB.menuBG(g, W, H, menuT); UI.text(g, 'CHOOSE YOUR DAY', W / 2, 14, { align: 'center', scale: 2, color: '#fff4e0' }); { const ca = game.cornerArea && game.cornerArea(), rx = ca && ca.y0 < 30 ? Math.floor(ca.x0) - 6 : W - 8; OB.Art.icon(g, 'seed', rx - UI.width(P().seeds + ' SEEDS') - 10, 5); UI.text(g, P().seeds + ' SEEDS', rx, 6, { align: 'right', color: C.sun }); }
    menuScr.draw(g); UI.footer(g, W, H, menuScr.footer); }); }
};
/* ---- the garage: car, paint, driver, passenger ---- */
let gar = null, garScr = null;
const carOpen = id => P().unlocked.cars.includes(id);
SC.garage = {
  res: [480, 270], expand: true,
  enter(flow) {
    flow = flow || { mode: 'arcade' }; const L = P().last;
    gar = { flow, t: 0, car: flow.fixedCar || L.car, paint: L.paint || 0, edition: !!L.edition, driver: L.driver || 'leo', passenger: flow.fixedPassenger || L.passenger || 'marisol', outfit: L.outfit || 0, spin: 0 };
    if (!carOpen(gar.car)) gar.car = 'orchidea';
    UI.idleT = 0; UI.screenName = 'garage'; if (OB.Audio) OB.Audio.music('menu');
    garScr = UI.screen({ name: 'garage', footer: [['nav', 'Change'], ['confirm', 'Next'], ['cancel', 'Back']], back: () => go(flow.back || 'menu', flow.backData) });
  },
  layout(W, H) {
    const lx = W * .48, w = W - lx - 12, f = gar.flow, cars = OB.CAR_ORDER, paints = OB.paintsFor(gar.car, P());
    const step = (list, cur, dir) => list[(list.indexOf(cur) + dir + list.length) % list.length];
    const items = [
      { id: 'car', x: lx, y: 34, w, h: 34, left: () => { if (!f.fixedCar) { gar.car = step(cars, gar.car, -1); gar.paint = 0; gar.edition = false; } }, right: () => { if (!f.fixedCar) { gar.car = step(cars, gar.car, 1); gar.paint = 0; gar.edition = false; } }, pick: () => this.next(), draw: (g, it, fo) => this.row(g, it, fo, 'CAR', OB.carStats(gar.car, gar.edition).name, !carOpen(gar.car)) },
      { id: 'paint', x: lx, y: 74, w, h: 34, left: () => { gar.paint = (gar.paint + paints.length - 1) % paints.length; }, right: () => { gar.paint = (gar.paint + 1) % paints.length; }, pick: () => this.next(), draw: (g, it, fo) => this.paintRow(g, it, fo, paints) },
      { id: 'edition', x: lx, y: 114, w, h: 24, left: () => this.toggleEd(), right: () => this.toggleEd(), pick: () => this.toggleEd(), draw: (g, it, fo) => this.row(g, it, fo, 'EDITION', gar.edition ? 'BLOOM EDITION' : 'STANDARD', false, !OB.EDITIONS[gar.car] || !P().unlocked.editions.includes(gar.car)) },
      { id: 'driver', x: lx, y: 144, w, h: 24, left: () => { gar.driver = gar.driver === 'leo' ? 'lea' : 'leo'; }, right: () => { gar.driver = gar.driver === 'leo' ? 'lea' : 'leo'; }, pick: () => this.next(), draw: (g, it, fo) => this.row(g, it, fo, 'DRIVER', OB.CAST[gar.driver].name) },
      { id: 'passenger', x: lx, y: 174, w, h: 40, left: () => { if (!f.fixedPassenger) { gar.passenger = step(OB.PASSENGERS, gar.passenger, -1); gar.outfit = 0; } }, right: () => { if (!f.fixedPassenger) { gar.passenger = step(OB.PASSENGERS, gar.passenger, 1); gar.outfit = 0; } }, pick: () => this.next(), draw: (g, it, fo) => this.passRow(g, it, fo) },
      { id: 'outfit', x: lx, y: 220, w: w * .48, h: 22, left: () => this.cycleOutfit(), right: () => this.cycleOutfit(), pick: () => this.cycleOutfit(), draw: (g, it, fo) => this.row(g, it, fo, 'OUTFIT', (OB.CAST[gar.passenger].outfits[gar.outfit] || {}).name || '', false, P().unlocked.outfits[gar.passenger].length < 2) },
      { id: 'go', x: lx + w * .52, y: 220, w: w * .48, h: 22, label: 'NEXT ▶', scale: 1, pick: () => this.next() }
    ];
    garScr.setItems(items, true);
  },
  toggleEd() { if (OB.EDITIONS[gar.car] && P().unlocked.editions.includes(gar.car)) gar.edition = !gar.edition; else { OB.sfx && OB.sfx('error'); UI.toast('LOCKED', 'Plant it in the Garage Garden'); } },
  cycleOutfit() { const o = P().unlocked.outfits[gar.passenger]; if (o.length < 2) { OB.sfx && OB.sfx('error'); UI.toast('LOCKED', 'Plant it in the Garage Garden'); return; } gar.outfit = (gar.outfit + 1) % 2; },
  next() {
    if (!carOpen(gar.car)) { OB.sfx && OB.sfx('error'); UI.toast('LOCKED', 'Plant it in the Garage Garden'); return; }
    const paints = OB.paintsFor(gar.car, P()); const L = P().last; Object.assign(L, { car: gar.car, paint: gar.paint, edition: gar.edition, driver: gar.driver, passenger: gar.passenger, outfit: gar.outfit }); OB.Profile.save();
    const cfg = Object.assign({ car: gar.car, edition: gar.edition, paint: paints[gar.paint % paints.length].color, driver: gar.driver, passenger: gar.passenger, outfit: gar.outfit }, gar.flow);
    go('radio', cfg);
  },
  row(g, it, f, label, value, locked, disabled) {
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a1a6a', '#7a2a7a'] : C.panel, border: f ? C.sun : C.border, alpha: .92 });
    UI.text(g, label, it.x + 6, it.y + 4, { color: C.dim });
    UI.text(g, '◀ ' + value + ' ▶', it.x + it.w / 2, it.y + it.h - 12, { align: 'center', color: disabled ? '#8a7a9a' : f ? C.sun : C.ink });
    if (locked || disabled) OB.Art.icon(g, 'lock', it.x + it.w - 12, it.y + 4);
  },
  paintRow(g, it, f, paints) {
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a1a6a', '#7a2a7a'] : C.panel, border: f ? C.sun : C.border, alpha: .92 }); UI.text(g, 'PAINT', it.x + 6, it.y + 4, { color: C.dim });
    const n = paints.length, sw = Math.min(16, (it.w - 20) / n);
    paints.forEach((p, i) => { const x = it.x + 8 + i * sw, y = it.y + 16; px.rect(g, Math.round(x), y, Math.round(sw - 2), 12, '#1a0a28'); px.rect(g, Math.round(x + 1), y + 1, Math.round(sw - 4), 10, p.color); if (i === gar.paint % n) UI.frame(g, x - 2, y - 2, sw + 2, 16, f ? C.sun : '#ffffff'); });
  },
  passRow(g, it, f) {
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a1a6a', '#7a2a7a'] : C.panel, border: f ? C.sun : C.border, alpha: .92 });
    const c = OB.CAST[gar.passenger]; OB.Cast.portrait(g, gar.passenger, it.x + 4, it.y + 4, 32, { mood: 'happy', outfit: gar.outfit });
    UI.text(g, 'PASSENGER  ◀ ' + c.name.toUpperCase() + ' ▶', it.x + 42, it.y + 4, { color: f ? C.sun : C.ink }); UI.text(g, c.bio, it.x + 42, it.y + 15, { color: C.dim });
    UI.text(g, 'LOVES', it.x + 42, it.y + 27, { color: C.pink }); c.loves.forEach((l, i) => OB.Art.icon(g, OB.Art.REQ_ICON[l], it.x + 76 + i * 14, it.y + 26));
  },
  update(dt) { gar.t += dt; gar.spin += dt * .8; UI.tickIdle(dt); if (UI.idleT > 10 && OB.Attract) { OB.Attract.start('garage', gar.flow); return; } this.layout(game.W, game.H); garScr.update(dt); UI.focusId = garScr.current && garScr.current.id; },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; this.layout(W, H);
      OB.menuBG(g, W, H, gar.t, 'lake');
      const s = OB.carStats(gar.car, gar.edition), paints = OB.paintsFor(gar.car, P()), bank = OB.Art.car(gar.car, paints[gar.paint % paints.length].color, gar.edition);
      UI.text(g, gar.flow.mode === 'love' ? 'LOVE IN BLOOM · GARAGE' : gar.flow.mode === 'mission' ? 'TOUR · GARAGE' : gar.flow.mode === 'trial' ? 'TIME TRIAL · GARAGE' : 'ARCADE RUN · GARAGE', 10, 10, { scale: 2, color: '#fff4e0' });
      // the turntable
      const tx = W * .24, ty = H * .62; px.ell(g, Math.round(tx), Math.round(ty), Math.round(W * .2), 16, '#3a2a4a'); px.ell(g, Math.round(tx), Math.round(ty - 2), Math.round(W * .19), 13, '#5a4a6a');
      const a = gar.spin % (Math.PI * 2);
      OB.Art.drawCar(g, bank, tx, ty + 6, Math.min(.5, W / 1100), { spin: a < Math.PI * 2 ? a : 0 });
      if (!carOpen(gar.car)) { UI.panel(g, tx - 80, ty - 60, 160, 30, { alpha: .9 }); OB.Art.icon(g, 'lock', tx - 74, ty - 52, 2); UI.text(g, 'Plant it in the', tx + 6, ty - 56, { align: 'center' }); UI.text(g, 'Garage Garden', tx + 6, ty - 46, { align: 'center', color: C.sun }); }
      UI.text(g, s.cls.toUpperCase() + '  ·  ' + s.year, tx, ty + 14, { align: 'center', color: C.sun });
      const bars = [['SPEED', (s.top - 230) / 110], ['ACCEL', (6.2 - s.zeroTo100) / 3.4], ['HANDLING', (s.steer - 1.75) / .7 * .6 + (s.grip - .76) / .2 * .4]];
      bars.forEach(([l, v], i) => { const y = ty + 28 + i * 12; UI.text(g, l, tx - 80, y, { color: C.dim }); px.rect(g, Math.round(tx - 20), y + 1, 100, 6, '#2a1a3a'); px.rect(g, Math.round(tx - 20), y + 1, Math.round(100 * clamp(v, .08, 1)), 6, [C.pink, C.sun, C.sea][i]); });
      { const wl = E.font.wrap(OB.CARS[gar.car].blurb, W * .44, {}), ls = Array.isArray(wl) ? wl : String(wl).split('\n'); ls.forEach((l, i) => UI.text(g, l, tx, H - 40 + i * 9, { align: 'center', color: '#ffffff' })); }
      garScr.draw(g); UI.footer(g, W, H, garScr.footer); UI.drawToasts(g, W);
    });
  }
};
/* ---- the radio: a faceplate, five stations (two more to unlock), the transmission ---- */
let rad = null, radScr = null;
SC.radio = {
  res: [480, 270], expand: true,
  enter(cfg) { rad = { cfg: cfg || { mode: 'arcade' }, t: 0, st: P().last.station || 0, trans: P().last.transmission || OB.setting('transmission'), staticT: 0 }; if (!P().unlocked.songs.includes(OB.STATIONS[rad.st].song)) rad.st = 0;
    if (OB.Radio) OB.Radio.preview(rad.st); UI.idleT = 0; UI.screenName = 'radio';
    radScr = UI.screen({ name: 'radio', footer: [['nav', 'Tune'], ['alt', 'Transmission'], ['confirm', 'Drive!'], ['cancel', 'Back']], back: () => go(rad.cfg.mode === 'versus' ? 'versus' : 'garage', rad.cfg),
      extra: I => { if (I.pressed('alt')) { this.toggleTrans(); return true; } if (I.pressed('gas') && !I.pressed('confirm')) { this.start(); return true; } return false; } }); },
  open() { return OB.STATIONS.map((s, i) => P().unlocked.songs.includes(s.song) ? i : -1).filter(i => i >= 0); },
  tune(dir) { const open = this.open(), k = open.indexOf(rad.st); rad.st = open[(k + dir + open.length) % open.length]; rad.staticT = .3; if (OB.Radio) OB.Radio.preview(rad.st, true); },
  toggleTrans() { rad.trans = rad.trans === 'auto' ? 'manual' : 'auto'; OB.sfx && OB.sfx('toggle'); },
  start() { const L = P().last; L.station = rad.st; L.transmission = rad.trans; OB.Profile.save(); const cfg = Object.assign({}, rad.cfg, { station: rad.st, transmission: rad.trans }); OB.startRace(cfg); },
  layout(W, H) {
    const fx = W / 2 - 180, fw = 360;
    radScr.setItems([
      { id: 'dial', x: fx, y: 60, w: fw, h: 96, left: () => this.tune(-1), right: () => this.tune(1), pick: () => this.start(), clickX: x => { const open = OB.STATIONS.length, i = Math.floor((x - fx - 10) / ((fw - 20) / open)); if (i >= 0 && i < open && P().unlocked.songs.includes(OB.STATIONS[i].song)) { if (i === rad.st) return false; rad.st = i; rad.staticT = .3; if (OB.Radio) OB.Radio.preview(i, true); OB.sfx && OB.sfx('tick'); return true; } return false; }, draw: (g, it, f) => this.drawDial(g, it, f) },
      { id: 'trans', x: fx, y: 170, w: 170, h: 30, left: () => this.toggleTrans(), right: () => this.toggleTrans(), pick: () => this.toggleTrans(), draw: (g, it, f) => { UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#4a1a6a', '#7a2a7a'] : C.panel, border: f ? C.sun : C.border }); UI.text(g, 'TRANSMISSION', it.x + 6, it.y + 4, { color: C.dim }); UI.text(g, rad.trans === 'auto' ? 'AUTO' : 'MANUAL', it.x + it.w - 8, it.y + 12, { align: 'right', scale: 2, color: rad.trans === 'auto' ? C.sea : C.pink }); } },
      { id: 'drive', x: fx + fw - 170, y: 170, w: 170, h: 30, label: 'DRIVE!', scale: 2, pick: () => this.start() }
    ].concat(P().unlocked.mirror ? [{ id: 'mirror', x: fx + 180, y: 170, w: fw - 360, h: 30, label: () => 'MIRROR ' + (OB.mirrorOn ? 'ON' : 'OFF'), scale: 1, left: () => { OB.mirrorOn = !OB.mirrorOn; }, right: () => { OB.mirrorOn = !OB.mirrorOn; }, pick: () => { OB.mirrorOn = !OB.mirrorOn; } }] : []), true);
  },
  drawDial(g, it, f) {
    UI.panel(g, it.x, it.y, it.w, it.h, { bg: ['#1a1418', '#3a2a30'], border: f ? C.sun : '#8a7a70' });
    px.rect(g, it.x + 10, it.y + 8, it.w - 20, 30, '#0a2a1a'); px.rect(g, it.x + 11, it.y + 9, it.w - 22, 28, '#143a24');
    const S = OB.STATIONS[rad.st], song = OB.SONGS[S.song];
    UI.text(g, S.freq + '  ' + S.name, it.x + 18, it.y + 12, { color: '#7aff9a', shadow: false });
    UI.text(g, '♪ ' + song.title, it.x + 18, it.y + 24, { color: '#c8ffd8', shadow: false });
    if (rad.staticT > 0) for (let i = 0; i < 30; i++) px.rect(g, it.x + 12 + Math.floor(OB.FX.rnd() * (it.w - 24)), it.y + 10 + Math.floor(OB.FX.rnd() * 26), 2, 1, '#7aff9a');
    const n = OB.STATIONS.length, bw = (it.w - 20) / n;
    OB.STATIONS.forEach((s, i) => { const x = it.x + 10 + i * bw, y = it.y + 46, open = P().unlocked.songs.includes(s.song), on = i === rad.st;
      px.rect(g, Math.round(x + 1), y, Math.round(bw - 2), 40, on ? '#ffcf4a' : open ? '#5a4a50' : '#2a2026'); px.rect(g, Math.round(x + 2), y + 1, Math.round(bw - 4), 37, on ? '#fff0b0' : open ? '#7a6a70' : '#3a2e34');
      UI.text(g, String(i + 1), x + bw / 2, y + 4, { align: 'center', scale: 2, color: on ? '#2a1a10' : '#e8e0d8', shadow: false });
      UI.text(g, s.freq, x + bw / 2, y + 24, { align: 'center', color: on ? '#2a1a10' : '#c8c0b8', shadow: false });
      if (!open) OB.Art.icon(g, 'lock', x + bw - 9, y + 3); });
  },
  update(dt) { rad.t += dt; rad.staticT = Math.max(0, rad.staticT - dt); UI.tickIdle(dt); if (UI.idleT > 10 && OB.Attract) { OB.Attract.start('radio', rad.cfg); return; } this.layout(game.W, game.H); radScr.update(dt); UI.focusId = radScr.current && radScr.current.id; },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; this.layout(W, H); OB.menuBG(g, W, H, rad.t, 'beachSunset'); UI.text(g, 'PICK A STATION', W / 2, 26, { align: 'center', scale: 2, color: '#fff4e0' });
    UI.text(g, 'Switch stations in a race: ', W / 2 - 30, 212, { align: 'center', color: C.dim }); UI.prompt(g, W / 2 + 60, 210, 'radio', '', {});
    radScr.draw(g); UI.footer(g, W, H, radScr.footer); }); }
};
/** start a race from a flow's config: the mode's rules and route */
OB.startRace = cfg => {
  const c = Object.assign({ seed: (OB.Profile.data.runs * 7919 + 17) >>> 0, difficulty: OB.setting('difficulty'), mirror: OB.Profile.data.unlocked.mirror && OB.mirrorOn }, cfg);
  if (c.mode === 'love') c.rules = [OB.Requests.director({ passenger: c.passenger })];
  if (c.mode === 'mission' && OB.Missions) OB.Missions.configure(c);
  if (c.mode === 'trial' && OB.Trial) OB.Trial.configure(c);
  if (OB.Radio) OB.Radio.select(c.station || 0);
  go('race', c);
};
/* ---- How to Play: six pages, each with a live demo driven by the bot ---- */
const HOWTO = [
  { title: 'DRIVING', text: ['Hold the gas, steer through the bends.', 'Leave the road and you slow right down.'], prompts: [['gas', 'Gas'], ['brake', 'Brake'], ['steer', 'Steer']], demo: { stage: 'S1', z: 60 } },
  { title: 'DRIFTING', text: ['Tap the brake while steering to drift,', 'or press Drift. Counter-steer to recover.'], prompts: [['drift', 'Drift'], ['brake', 'Tap']], demo: { stage: 'S3', z: 320, drift: true } },
  { title: 'SLIPSTREAM & NEAR MISSES', text: ['Tuck in behind a car to slipstream; pull', 'out for a slingshot. Brush past for points.'], prompts: [['horn', 'Horn']], demo: { stage: 'S4', z: 160, draft: true } },
  { title: 'FORKS & CHECKPOINTS', text: ['Each checkpoint gives daylight back.', 'At a fork, the side you are on picks the road.'], prompts: [['steer', 'Choose']], demo: { stage: 'S1', z: 860 } },
  { title: 'LOVE IN BLOOM', text: ['Your passenger asks for things: balloons,', 'drifts, photos. Petals make your grade.'], prompts: [['camera', 'Camera'], ['radio', 'Radio']], demo: { stage: 'S1', z: 120, love: true } },
  { title: 'TOUR & GARDEN', text: ['Clear postcards in the Tour for seeds.', 'Plant them in the Garage Garden to unlock.'], prompts: [['tabL', 'Page'], ['tabR', 'Page']], demo: { stage: 'S9', z: 200 } }
];
let how = null, howScr = null;
const makeDemo = page => {
  const D = HOWTO[page].demo, cfg = { mode: 'demo', route: { stages: [D.stage], sprint: true }, noIntro: true, zStart: D.z, seed: 99 + page, players: [{ car: page === 1 ? 'gardenia' : 'orchidea', paint: page === 1 ? '#f4f2ee' : '#e8463a', passenger: 'marisol', bot: { targets: true, draft: !!D.draft, driftAt: D.drift ? 3 : 4 } }], startTime: 999, finishHold: 999 };
  if (D.love) cfg.rules = [OB.Requests.director({ passenger: 'marisol' })];
  const r = new OB.RaceClass(cfg); r.demo = true; return r;
};
SC.howto = {
  res: [480, 270], expand: true,
  enter(d) { how = { page: d && d.page || 0, t: 0, race: null }; how.race = makeDemo(how.page); UI.screenName = 'howto'; UI.idleT = 0;
    howScr = UI.screen({ name: 'howto', footer: [['nav', 'Page'], ['cancel', 'Back']], back: () => { this.drop(); go('menu', { focus: 0 }); }, onTab: dir => this.turn(dir) }); },
  drop() { if (how && how.race) { how.race.dispose(); if (how.race.req) how.race.req = null; how.race = null; } },
  exit() { this.drop(); },
  turn(dir) { how.page = (how.page + dir + HOWTO.length) % HOWTO.length; this.drop(); how.race = makeDemo(how.page); OB.sfx && OB.sfx('tick'); },
  layout(W, H) { howScr.setItems([{ id: 'prev', x: 8, y: H / 2 - 16, w: 28, h: 32, label: '◀', scale: 2, pick: () => this.turn(-1) }, { id: 'pages', x: W / 2 - 40, y: H - 38, w: 80, h: 16, static: false, label: (how.page + 1) + ' / ' + HOWTO.length, scale: 1, left: () => this.turn(-1), right: () => this.turn(1), pick: () => this.turn(1) }, { id: 'next', x: W - 36, y: H / 2 - 16, w: 28, h: 32, label: '▶', scale: 2, pick: () => this.turn(1) }], true); if (howScr.focus === 0 && !howScr.moved) { howScr.focus = 1; howScr.moved = true; } },
  update(dt) { how.t += dt; if (how.race) { const r = how.race; r.step(dt); if (r.phase === 'done' || r.p1.car.z > r.p1.road.length - 2000) { this.drop(); how.race = makeDemo(how.page); } }
    for (const d of how.race ? how.race.drivers : []) d.cam.lagX += (d.absX() - d.cam.lagX) * Math.min(1, dt * 6);
    UI.tickIdle(dt); this.layout(game.W, game.H); howScr.update(dt); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pg = HOWTO[how.page]; this.layout(W, H);
      OB.menuBG(g, W, H, how.t, 'fieldsMorning');
      UI.text(g, 'HOW TO PLAY · ' + pg.title, W / 2, 10, { align: 'center', scale: 2, color: '#fff4e0' });
      const bw = Math.min(300, W - 100), bh = Math.round(bw * .5), bx = Math.round(W / 2 - bw / 2), by = 30;
      UI.panel(g, bx - 4, by - 4, bw + 8, bh + 8, { border: C.sun });
      if (how.race) { const vp = { x: bx, y: by, w: bw, h: bh }; g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip(); OB.drawRaceView(g, how.race, how.race.p1, vp, how.t, { noPost: true }); if (how.race.req && how.race.req.cur) UI.text(g, how.race.req.cur.callout, bx + bw / 2, by + 6, { align: 'center', color: C.sun }); g.restore(); }
      pg.text.forEach((l, i) => UI.text(g, l, W / 2, by + bh + 10 + i * 11, { align: 'center' }));
      let x = W / 2 - pg.prompts.length * 40; for (const [a, l] of pg.prompts) { x += UI.prompt(g, x, by + bh + 32, a, l, {}) + 16; }
      howScr.draw(g); UI.footer(g, W, H, howScr.footer);
    });
  }
};
/* ---- About & Credits: big pages turned with ◀ ▶ ---- */
let ab = null, abScr = null;
SC.about = {
  res: [480, 270], expand: true,
  enter(d) { ab = { page: 0, t: 0, from: d && d.from || 'menu' }; UI.screenName = 'about'; abScr = UI.screen({ name: 'about', footer: [['nav', 'Page'], ['cancel', 'Back']], back: () => go(ab.from, { focus: 0 }), onTab: dir => this.turn(dir) }); },
  turn(dir) { const n = OB.ABOUT.pages.length; ab.page = (ab.page + dir + n) % n; ab.sub = 0; OB.sfx && OB.sfx('tick'); },
  layout(W, H) { abScr.setItems([{ id: 'prev', x: 8, y: H / 2 - 16, w: 28, h: 32, label: '◀', scale: 2, pick: () => this.turn(-1) }, { id: 'page', x: W / 2 - 40, y: H - 46, w: 80, h: 18, label: (ab.page + 1) + ' / ' + OB.ABOUT.pages.length, scale: 1, left: () => this.turn(-1), right: () => this.turn(1), pick: () => this.turn(1) }, { id: 'next', x: W - 36, y: H / 2 - 16, w: 28, h: 32, label: '▶', scale: 2, pick: () => this.turn(1) }], true); if (!abScr.moved) { abScr.focus = 1; abScr.moved = true; } },
  update(dt) { ab.t += dt; this.layout(game.W, game.H); abScr.update(dt); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pg = OB.ABOUT.pages[ab.page]; this.layout(W, H);
      OB.menuBG(g, W, H, ab.t, 'beachSunset');
      UI.panel(g, 44, 18, W - 88, H - 70, { alpha: .9 });
      UI.text(g, pg.title, W / 2, 26, { align: 'center', scale: 2, color: C.sun });
      let y = 48; const maxW = W - 110;
      for (const line of pg.lines) { const wrapped = E.font.wrap(line, maxW, {}); const ls = Array.isArray(wrapped) ? wrapped : String(wrapped).split('\n'); for (const l of ls) { if (y > H - 64) break; UI.text(g, l, 56, y, { color: line.startsWith('·') || line.startsWith('Q') ? C.ink : C.ink }); y += 9; } y += 2; }
      abScr.draw(g); UI.footer(g, W, H, abScr.footer);
    });
  }
};
})();
