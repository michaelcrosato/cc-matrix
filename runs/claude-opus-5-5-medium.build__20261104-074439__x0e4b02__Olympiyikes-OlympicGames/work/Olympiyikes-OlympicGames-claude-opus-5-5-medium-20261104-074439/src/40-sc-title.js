/* OLYMPIYIKES! — the title, the main menu, the touch-only notice and the attract mode (§3.2, §3.3, §11). */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, P = O.PAL;

/* ---- the title: a stadium at sunset beside a floodlit ski jump, the cauldron, the blimp, eight athletes warming up ---- */
let lineup = null, blob = null;
const ensureLineup = () => { if (lineup) return; lineup = O.NATIONS.map((n, i) => ({ n, rig: O.makeRig(n, i % 2 ? 'ceremony' : 'track'), ph: i * .7 })); blob = O.Art.mascot(); };
function titleBack(r, t) {
  r.overlay(g => {
    const W = r.W, H = r.H, hz = Math.round(H * .62);
    // sky: sunset on the left (summer), floodlit night on the right (winter)
    for (let y = 0; y < hz; y++) { const k = y / hz; px.rect(g, 0, y, Math.ceil(W / 2), 1, E.mix('#2a1050', '#ff8a4a', k)); px.rect(g, Math.floor(W / 2), y, Math.ceil(W / 2), 1, E.mix('#04061a', '#2a3a7a', k)); }
    for (let k = 0; k < 40; k++) px.rect(g, W / 2 + E.hash2(k, 1) * W / 2, E.hash2(k, 2) * hz * .6, 1, 1, '#ffffff');
    px.disc(g, W * .2, hz - 10, 22, '#ffd27a');
    // the ski jump on the right, floodlit
    px.poly(g, [[W * .62, hz], [W * .78, hz * .25], [W * .8, hz * .25], [W * .74, hz * .55], [W * .98, hz]], '#e8f0fb');
    px.rect(g, W * .775, hz * .2, 6, 10, '#5a6080');
    for (let k = 0; k < 4; k++) { px.blend(g, .3, 'add', () => px.disc(g, W * (.66 + k * .09), hz * (.35 + k * .1), 14, '#fff0c0')); px.rect(g, W * (.66 + k * .09) - 2, hz * (.35 + k * .1) - 1, 4, 2, '#ffffff'); }
    // the stadium bowl on the left with the crowd
    px.poly(g, [[0, hz - 50], [W * .5, hz - 40], [W * .55, hz], [0, hz]], '#3a2a5a');
    O.Art.crowd(g, 0, hz - 46, W * .52, 40, .6 + .4 * Math.sin(t), 61, ['#f2b632', '#e23b2e', '#2f7fe0', '#ff7fb8', '#1fa8a0', '#ffffff']);
    // the cauldron
    const cx = W * .5, cy = hz - 62; px.rect(g, cx - 3, cy, 6, 30, '#8a7a5a'); px.poly(g, [[cx - 12, cy], [cx + 12, cy], [cx + 7, cy + 8], [cx - 7, cy + 8]], '#c8a050');
    for (let i = 0; i < 6; i++) px.disc(g, cx + Math.sin(t * 9 + i) * 4, cy - 4 - i * 4, 7 - i, ['#ff5a1a', '#ff7a2a', '#ffb03a', '#ffd060', '#fff0a0', '#ffffff'][i]);
    // the track and the blimp
    px.rect(g, 0, hz, W, H - hz, '#a8402e'); for (let k = 0; k < 6; k++) px.rect(g, 0, hz + 8 + k * 10, W, 1, '#e8d8d0');
    const bx = ((t * 20) % (W + 120)) - 60; px.ell(g, bx, 40, 26, 9, '#d8dce8'); px.ell(g, bx, 42, 26, 7, '#b8bcc8'); E.font.text(g, 'YIKES', bx, 37, '#e8443a', { align: 'center', outline: false, font: 'tiny' });
    // the eight athletes warming up
    if (lineup) lineup.forEach((L, i) => { const x = W * (.1 + i * .115), y = hz + 44; L.rig.draw(g, Math.round(x), Math.round(y), E.VIEWS.brawler); });
    if (blob) { g.save(); g.translate(Math.round(W * .52), hz + 34); blob.draw(g, 0, 0, E.VIEWS.side); g.restore(); }
  });
}
O.titleBack = titleBack;
function logo(g, r, y) {
  O.Art.emblem(g, r.W / 2, y - 6, 1.1);
  O.title(g, 'OLYMPIYIKES!', r.W / 2, y + 20, r.W > 380 ? 5 : 4, { colors: ['#fff6d0', '#ffd060', '#f08a2a'], outline: '#8a1a10', depth: 3 });
  O.text(g, O.TAGLINE.toUpperCase(), r.W / 2, y + 20 + (r.W > 380 ? 50 : 40), '#ffffff', { align: 'center', scale: 1 });
}
O.logo = logo;

O.scene('title', {
  menu: true, lock: .4,
  enter() { ensureLineup(); this.t = 0; O.music('title'); O.meet = null; O.activity.last = game.real; this.setR = null; },
  update(dt) {
    this.t += dt;
    for (const [i, L] of lineup.entries()) L.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, run: i % 3 === 0 ? .6 : 0, pose: i % 3 === 1 ? 'wave' : i % 3 === 2 ? 'hips' : null });
    blob.update(dt, { squash: Math.sin(this.t * 5) * .15, walk: 0, look: [Math.sin(this.t), 0] });
    const touchOnly = O.touchOnly();
    if (touchOnly) { const c = game.input.clicked(); if (c && this.setR && O.hit(c, this.setR)) game.menu('settings'); return; }
    if (game.input.anyPressed() || game.input.clicked()) { if (this.t > .3) { O.sfx('confirm'); O.go('menu', {}); } }
  },
  draw(r) {
    titleBack(r, this.t);
    r.overlay(g => {
      logo(g, r, 30);
      if (O.touchOnly()) {
        const w = Math.min(r.W - 30, 320), x = r.W / 2 - w / 2, y = r.H * .52; O.panel(g, x, y, w, 70);
        O.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 8, '#ffd060', { align: 'center' });
        O.text(g, 'Connect a controller or keyboard to play.', r.W / 2, y + 22, '#ffffff', { align: 'center' });
        this.setR = [r.W / 2 - 60, y + 38, 120, 24]; O.panel(g, this.setR[0], this.setR[1], 120, 24, { border: '#ffffff' }); O.text(g, 'SETTINGS', r.W / 2, y + 45, '#ffffff', { align: 'center', scale: 1 });
      } else if (Math.floor(this.t * 2) % 2 === 0) {
        { const dv = game.input.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard', w = O.Prompt.width('confirm', { size: 2, device: dv }) + E.font.width('PRESS ', { scale: 2 }); O.text(g, 'PRESS', r.W / 2 - w / 2, r.H * .58 + 2, '#ffffff', { scale: 2 }); O.Prompt.draw(g, r.W / 2 - w / 2 + E.font.width('PRESS ', { scale: 2 }), r.H * .58, 'confirm', { size: 2, device: dv }); }
      }
      E.font.text(g, 'v' + O.VERSION + ' - my-3D2dge ' + E.version, r.W - 6, r.H - 10, '#9aa2c8', { align: 'right', outline: false, font: 'tiny' });
    });
  }
});

/* ---- the main menu ---- */
const ITEMS = [
  { id: 'continue', label: 'CONTINUE GAMES', desc: 'Pick up The Games at the next day.' },
  { id: 'games', label: 'THE GAMES', desc: 'Opening ceremony, 12 days of Summer AND Winter, a rival, the closing ceremony. Or Quick Games: 4 events.' },
  { id: 'single', label: 'SINGLE EVENT', desc: 'Any of the 12 events, against the CPU or in practice. 1–4 players.' },
  { id: 'records', label: 'RECORDS', desc: 'World records, top-5 tables, your laurels and your medal cabinet.' },
  { id: 'howto', label: 'HOW TO PLAY', desc: 'Mashing, timing, hype & YIKES TURBO, and every event\'s card.' },
  { id: 'settings', label: 'SETTINGS', desc: 'Difficulty, prompts, assists, commentary, sound, display, controls.' },
  { id: 'about', label: 'ABOUT & CREDITS', desc: 'Source information, feedback, credits and controls.' }
];
O.scene('menu', {
  menu: true, lock: .3,
  enter() { ensureLineup(); this.t = 0; const has = !!O.flow.load(); this.items = ITEMS.filter(it => it.id !== 'continue' || has); this.m = new O.Menu10(this.items.map(it => ({ label: it.label }))); O.music('menu'); O.meet = null; },
  update(dt) {
    this.t += dt; blob.update(dt, { squash: Math.sin(this.t * 5) * .1, walk: 0, look: [1, 0] });
    for (const [i, L] of lineup.entries()) L.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer', run: i % 2 ? .3 : 0 });
    const k = this.m.update(dt);
    if (k === 'cancel') return O.go('title', {});
    if (k === null) return;
    const id = this.items[k].id;
    if (id === 'continue') { const m = O.flow.load(); if (m) { O.meet = m; O.flow.next(); } }
    else if (id === 'games') O.go('gamesSetup', {});
    else if (id === 'single') O.go('single', {});
    else if (id === 'settings') game.menu('settings');
    else O.go(id, {});
  },
  draw(r) {
    O.bgCard(r);
    r.overlay(g => {
      O.stripeBg(g, r, this.t);
      O.title(g, 'OLYMPIYIKES!', 20, 10, 3, { align: 'left' });
      const w = Math.min(230, r.W * .48); O.panel(g, 12, 48, w + 16, this.items.length * 22 + 14); this.m.draw(g, 20, 56, w);
      // the vignette for the focused item
      const id = this.items[this.m.i].id, vx = w + 40, vw = r.W - vx - 14, vy = 48, vh = this.items.length * 22 + 14;
      if (vw > 100) {
        O.panel(g, vx, vy, vw, vh);
        const cx = vx + vw / 2, cy = vy + vh / 2;
        if (id === 'games' || id === 'continue') { lineup.slice(0, 4).forEach((L, i) => L.rig.draw(g, Math.round(vx + vw * (.2 + i * .2)), Math.round(cy + 30), E.VIEWS.brawler)); O.Art.emblem(g, cx, vy + 26, .8); }
        else if (id === 'single') { O.EVENT_LIST.forEach((d, i) => { const an = this.t * .6 + i / 12 * Math.PI * 2; O.Art.picto(g, cx + Math.cos(an) * Math.min(vw * .35, 70) - 16, cy + Math.sin(an) * 44 - 16, d.pictogram, 2, d.season); }); }
        else if (id === 'records') { O.Art.medal(g, cx - 30, cy - 10, 2, 2); O.Art.medal(g, cx, cy - 20, 1, 2); O.Art.medal(g, cx + 30, cy - 6, 3, 2); O.text(g, Object.keys(O.Laurels.get()).length + ' / 12 LAURELS', cx, cy + 30, '#ffd060', { align: 'center' }); }
        else if (id === 'howto') { O.Prompt.pair(g, cx - 30, cy - 10, { size: 2 }); O.Prompt.draw(g, cx - 10, cy + 16, 'action', { size: 2 }); }
        else if (id === 'settings') { O.Prompt.draw(g, cx, cy - 8, 'confirm', { size: 2, align: 'center', device: 'gamepad' }); O.text(g, 'Prompts: ' + (game.settings.glyphs === 'xbox' ? 'Xbox' : 'PlayStation'), cx, cy + 16, '#c8d0f0', { align: 'center' }); }
        else { g.save(); g.translate(Math.round(cx), Math.round(cy + 20)); blob.draw(g, 0, 0, E.VIEWS.side); g.restore(); O.text(g, 'YIKESY', cx, cy + 30, '#ffffff', { align: 'center' }); }
      }
      const desc = this.items[this.m.i].desc; O.wrap(desc, r.W - 40, 1).slice(0, 2).forEach((ln, i) => O.text(g, ln, r.W / 2, vy + vh + 10 + i * 11, '#c8d0f0', { align: 'center' }));
      O.Prompt.strip(g, r, [['move', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]);
    });
  },
  back() { O.go('title', {}); return true; }
});

/* ---- the attract mode (§11): a director over the real event scenes ---- */
const PLAY = ['sprint', 'skijump', 'diving', 'downhill', 'curling', 'figure', 'hockey', 'javelin', 'swim', 'archery', 'weights', 'bobsled'];
O.Attract = {
  on: false, i: 0, seg: 0, kind: null, t: 0,
  start() {
    this.on = true; this.seg = 0; this.t = 0; this.wasTouch = O.touchOnly(); O.Comms.reset();
    game.timeScale = 1; this.cards();
  },
  stop() { this.on = false; O.meet = null; game.timeScale = 1; game.audio.music(null); O.Comms.reset(); O.activity.last = game.real; O.go('title', {}, 0); },
  /** the playlist: LOGO → EVENT → RECORDS → EVENT → MEDALS → EVENT → TIP → EVENT → loop */
  cards() { const k = this.seg % 8; if (k % 2 === 1) return this.event(); O.go('attractCard', { kind: ['logo', 'records', 'medals', 'tip'][k / 2] }, 0); },
  event() {
    const id = PLAY[this.i % PLAY.length]; this.i++;
    const def = O.EVENTS[id], feat = O.NATIONS[(this.i * 3) % 8].id;
    const meet = O.flow.newMeet('attract', { events: [id], players: [] }); meet.featured = feat; meet.seed = 1000 + this.i; O.meet = meet; meet.rival = 'TRB';
    O.go('ev:' + id, { attract: true }, 'iris'); this.segT = 0; this.segMax = def.attract ? def.attract.seconds : 18;
  },
  segmentDone() { if (!this.on) return; this.seg++; this.cards(); },
  tick(dt) {
    if (!this.on) return;
    this.segT = (this.segT || 0) + dt;
    if (game.sceneName && game.sceneName.startsWith('ev:') && this.segT > this.segMax + 8) this.segmentDone();   // a segment that runs long moves on
  },
  /** any input exits (read in the input hook, so a press during a scene fade still counts) */
  anyInput() {
    if (!this.on) return; const inp = game.input; let any = inp.anyPressed() || !!inp.clicked();
    for (const p of game.players) if (p.anyPressed()) any = true;
    if (any && (this.segT || 0) > .2) this.stop();
  },
  drawBadge(g, r) {
    O.panel(g, 8, r.H - 30, 52, 20, { border: '#e8443a' }); O.text(g, 'DEMO', 34, r.H - 24, '#ff6b6b', { align: 'center' });
    if (Math.floor(game.real * 1.5) % 2 === 0) { if (this.wasTouch || O.touchOnly()) O.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 26, '#ffffff', { align: 'center' }); else O.Prompt.draw(g, r.W / 2, r.H - 28, 'confirm', { label: 'PRESS ANY BUTTON', align: 'center' }); }
    E.font.title(g, 'OLYMPIYIKES!', r.W - 8, r.H - 22, { scale: 1, colors: ['#fff6d0', '#ffd060', '#f08a2a'], align: 'right' });
  }
};
E.HOOKS.step.push((g, dt) => { if (O.Attract.on) O.Attract.tick(dt); });
E.HOOKS.input.push(() => { if (O.Attract.on) O.Attract.anyInput(); });
O.scene('attractCard', {
  enter(d) { this.kind = d.kind; this.t = 0; ensureLineup(); if (d.kind === 'logo') O.music('title'); },
  update(dt) { this.t += dt; for (const L of lineup) L.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer' }); if (this.t > (this.kind === 'logo' ? 4 : this.kind === 'tip' ? 5 : 6)) O.Attract.segmentDone(); },
  draw(r) {
    const k = this.kind;
    if (k === 'logo') { titleBack(r, this.t); r.overlay(g => logo(g, r, 34)); return; }
    O.bgCard(r);
    r.overlay(g => {
      O.stripeBg(g, r, this.t);
      if (k === 'records') { const all = O.Records.all(), ids = O.EVENT_LIST.slice(0, 8); O.title(g, 'WORLD RECORDS', r.W / 2, 12, 3); const w = Math.min(r.W - 30, 420), x = r.W / 2 - w / 2; O.panel(g, x, 48, w, ids.length * 18 + 10); ids.forEach((d, i) => { const row = all[d.id][0]; O.Art.picto(g, x + 8, 52 + i * 18, d.pictogram, 1, d.season); O.text(g, d.name, x + 30, 56 + i * 18, '#ffffff'); O.text(g, d.measure.fmt(row.v) + '  ' + row.name, x + w - 10, 56 + i * 18, '#ffd060', { align: 'right' }); }); }
      else if (k === 'medals') { O.title(g, 'THE NATIONS', r.W / 2, 12, 3); O.NATIONS.forEach((n, i) => { const x = r.W / 2 - 180 + (i % 4) * 92, y = 60 + Math.floor(i / 4) * 80; O.Art.flag(g, x, y, 48, 32, n, true); O.text(g, n.name, x + 24, y + 38, '#ffffff', { align: 'center' }); O.text(g, n.athlete, x + 24, y + 50, '#9aa2c8', { align: 'center', font: 'tiny' }); }); }
      else { const tips = ['Alternate the two mash buttons. Same button twice = stumble!', 'A full hype flame fires YIKES TURBO: every event has its own.', 'Every wipeout gives a little sympathy hype. Comebacks happen.', 'Hold your breath at full draw in archery. Not too long!']; const tip = tips[O.Attract.i % tips.length]; O.title(g, 'TIP', r.W / 2, 30, 3); O.wrap(tip, r.W - 80, 2).forEach((ln, i) => O.text(g, ln, r.W / 2, 90 + i * 20, '#ffffff', { align: 'center', scale: 2 })); O.Art.laurel(g, r.W / 2, 170, '#f2c94c', 2); }
    });
  }
});
})();
