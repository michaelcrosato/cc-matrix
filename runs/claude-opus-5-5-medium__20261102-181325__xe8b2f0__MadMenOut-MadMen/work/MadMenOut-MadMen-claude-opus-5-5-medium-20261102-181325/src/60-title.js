/* MAD MEN OUT — the title, the attract mode (after 10 s without input: the AI plays a day, cheating freely; any input
 * ends it) and the About / Credits screen (source information and the build's feedback, from 15-about.js). */
const TI = { idle: 0, menu: null, mode: null, t: 0, smoke: 0 };
function titleItems() {
  if (touchOnly()) return [{ label: 'SETTINGS', act: () => game.menu('settings') }, { label: 'ABOUT & CREDITS', act: () => game.go('about', { from: 'title' }) }];
  return [
    { label: 'NEW CAMPAIGN', act: () => { newCampaign(); game.go('office', null, { fade: 'iris', seconds: .6 }); } },
    { label: 'CONTINUE', disabled: !hasSave(), act: () => { if (game.saves.load(game.saves.latest().slot)) game.go('office', null, { fade: 'iris', seconds: .6 }); } },
    { label: 'PITCH-OFF (2 PLAYERS)', act: () => startVersus() },
    { label: 'PITCH GAUNTLET (SOLO)', act: () => startGauntlet({ mode: 'gauntlet' }) },
    { label: 'ABOUT & CREDITS', act: () => game.go('about', { from: 'title' }) },
    { label: 'SETTINGS', act: () => game.menu('settings') }
  ];
}
function makeTitleMenu() {
  const items = titleItems(), touch = touchOnly();
  TI.items = items; TI.touch = touch;
  TI.menu = new E.Menu(game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 110, box: true, bg: ['#2a2018', '#120c08'], border: '#c8a868', pick: '#e8c36a',
    onPick: (i) => { A.sfx('confirm'); items[i].act(); } });
}
const titleScene = {
  view: 'side', views: ['side', 'brawler'], input: KEYS, res: 'ps1', touch: [],
  enter() {
    S.demo = false; TI.idle = 0; TI.t = 0; makeTitleMenu(); music('lounge'); game.follow(null); game.cam.bounds = null; L.enabled = true; L.ambient = .45;
    game.input.touchEnabled = false; game.resetCamera();
  },
  update(dt) {
    TI.t += dt; vgFocus();
    if (TI.touch !== touchOnly()) makeTitleMenu();   // a key or a pad arrived on a touch screen: the full menu
    const I = game.input;
    if (realInputNow() || I.anyPressed() || I.clicked()) TI.idle = 0; else TI.idle += dt;
    if (TI.idle >= 10) { startAttract(); return; }
    if (!TI.menu.update(dt) && I.pressed('start')) { I.consumeAll(); TI.menu.onPick(TI.menu.i, TI.menu.items[TI.menu.i]); }
    rigOf('jack').update(dt, { x: STAGE_MID + 70, y: 0, z: 32, vx: 0, vy: 0, facing: Math.PI, pose: TI.t % 9 < 5 ? 'hips' : null });
    TI.smoke -= dt; if (TI.smoke < 0) { TI.smoke = .5; P.smoke(STAGE_MID + 62, 0, 32 + 34, 1, { size: .5, color: '#a8a0b8' }); }
  },
  draw(r) {
    SKY.manhattan.draw(r); stage.draw(r);
    r.shape('mmSofa', STAGE_MID - 60, -10, 32); r.shape('mmBarCart', STAGE_MID - 120, -8, 32); r.shape('mmDeskLamp', STAGE_MID - 120, -8, 45);
    r.prop('lamp', STAGE_MID + 130, -6, 32, { light: true, size: 1.2 }); r.shape('mmPlant', STAGE_MID + 160, -10, 32); r.shape('mmHatStand', STAGE_MID - 170, -10, 32);
    r.actor(STAGE_MID + 70, 0, 32, (g, ox, oy) => rigOf('jack').draw(g, ox, oy, r.view));
    r.overlay(g => {
      const narrow = r.W < 380, top = narrow ? 34 : 14;
      E.font.title(g, 'MAD MEN OUT', r.W / 2, top, { align: 'center', scale: narrow ? 3 : 4, colors: ['#fff8e8', '#f0d8a0', '#e8c36a', '#a8742a'], depth: 3, depthColor: '#2a1a0a' });
      txt(g, 'Madison Avenue, 1962. Everybody is selling something.', r.W / 2, top + 40, COL.ink, { align: 'center' });
      txt(g, 'A spiritual successor to Mad Men (2007-2015)', r.W / 2, top + 52, COL.dim, { align: 'center', font: 'tiny' });
      if (TI.touch) {
        panel(g, r.W / 2 - 120, 78, 240, 26, { alpha: .9, border: '#ff9a7a' });
        txt(g, 'Controller or keyboard required', r.W / 2, 84, '#ffd0c0', { align: 'center' });
        txt(g, 'Connect one to play. Touch is not supported.', r.W / 2, 94, COL.dim, { align: 'center', font: 'tiny' });
      }
      const how = TI.touch ? 'Connect a controller or keyboard. The demo plays by itself.' : dev() === 'gamepad' ? 'D-pad + ' + key('confirm') + ' choose' : dev() === 'mouse' ? 'Click to choose' : dev() === 'touch' ? 'Tap SETTINGS or wait for the demo' : 'Arrows + Enter, or click';
      txt(g, how, r.W / 2, r.H - 14, '#b8b0a8', { align: 'center' });
      txt(g, E.versionLabel ? 'my-3D2dge ' + E.versionLabel() : '', 4, r.H - 8, '#5a5048', { font: 'tiny' });
    });
    TI.menu.y = Math.max(110, Math.round(r.H / 2) - 6);
    TI.menu.draw(r);
  }
};

/* ---- ATTRACT MODE: a scripted day, played by an autopilot that never fails ---- */
const AT = { on: false, i: 0, t: 0, route: [] };
function startAttract() {
  newCampaign(); S.demo = true; AT.on = true; AT.i = 0; AT.t = 0;
  AT.route = [['npc', 'ruth'], ['look', 'look:magazine'], ['npc', 'eddie'], ['npc', 'monty'], ['spot', 'barcart'], ['npc', 'dolores'], ['spot', 'typewriter'], ['spot', 'conf']];
  game.go('office', null, { fade: 'dissolve', seconds: .8 });
}
function stopAttract() {
  if (!AT.on) return;
  AT.on = false; S.demo = false; OF.auto = null; OF.noclip = false; talk.close(); game.input.consumeAll();
  newCampaign(); game.go('title', null, { fade: 'dissolve', seconds: .4 });
}
function attractNext() { AT.on = false; S.demo = false; OF.auto = null; OF.noclip = false; newCampaign(); game.go('title', null, { fade: 'dissolve', seconds: .8 }); }
// the autopilot's walk: straight for the next stop on the route, around the furniture
OF.autoFor = () => dt => {
  if (!AT.on || !OF.hero) return null;
  const step = AT.route[AT.i]; if (!step) return null;
  const tgt = step[0] === 'npc' ? OF.npcs.find(n => n.id === step[1]) : OF.spots.find(s => s.id === step[1]);
  if (!tgt) { AT.i++; return null; }
  const h = OF.hero, d = Math.hypot(tgt.x - h.x, tgt.y - h.y);
  if (d < 20) { AT.i++; h.facing = Math.atan2(tgt.y - h.y, tgt.x - h.x); useSpot(tgt); return [0, 0]; }
  OF.flow.update(tgt.x, tgt.y); const w = OF.flow.dir(h.x, h.y, tgt.x, tgt.y);
  // the demo cheats: blocked for a moment, it walks straight through the furniture to its stop
  AT.stuck = Math.hypot(h.vx, h.vy) < 12 ? (AT.stuck || 0) + dt : Math.max(0, (AT.stuck || 0) - dt);
  if (AT.stuck > .4) AT.ghost = 1.2;
  AT.ghost = Math.max(0, (AT.ghost || 0) - dt); OF.noclip = AT.ghost > 0;
  if (OF.noclip) return [(tgt.x - h.x) / d * .9, (tgt.y - h.y) / d * .9];
  return [w[0] * .9, w[1] * .9];
};
function demoTick(dt) {
  if (!AT.on) return;
  if (realInputNow()) { stopAttract(); return; }
  const I = game.input; AT.t += dt;
  if (talk.open) { if (AT.t > .55) { AT.t = 0; I.tap('confirm'); } return; }
  const sc = game.sceneName;
  if (sc === 'office') { OF.auto = OF.autoFor(); if (OF.journal) OF.journal = false; }
  else if (sc === 'brainstorm' && AT.t > .7) {
    AT.t = 0; const want = Math.min(3, BR.cards.length);
    if (BR.sel.length < want) { BR.focus = BR.cards.findIndex(id => !BR.sel.includes(id)); brConfirm(); }
    else { BR.focus = BR.cards.length; brConfirm(); }
  }
}
// the pitch's cheat: hit every needle and every beat
function demoPitchAuto(dt) {
  const I = game.input;
  if (PT.phase === 'choose' && PT.t > .9) { PT.focus = 0; I.tap('confirm'); PT.t = -5; }
  else if (PT.phase === 'deliver' && PT.t > .6) { const [a, b] = PT.zone; if (Math.abs(PT.needle - (a + b) / 2) < (b - a) * .1) I.tap('confirm'); }
  else if (PT.phase === 'pivot') I.tap('confirm');
  else if (PT.phase === 'close' && PT.beatT >= PT.beatDur - 1 / 60 && !PT._tapped) { I.tap(PT.beats[PT.beat]); PT._tapped = PT.beat; }
  if (PT.phase === 'close' && PT._tapped !== undefined && PT._tapped !== PT.beat) PT._tapped = undefined;
}

/* ---- ABOUT & CREDITS: pages of plain text, read with left / right or a click ---- */
const AB = { page: 0, from: 'title', scroll: 0 };
const aboutScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter(d) { AB.page = 0; AB.scroll = 0; AB.from = d && d.from || 'title'; game.follow(null); L.enabled = false; },
  update(dt) {
    const I = game.input, n = ABOUT.length; vgFocus();
    if (I.repeat('right') || I.pressed('confirm')) { AB.page = (AB.page + 1) % n; AB.scroll = 0; A.sfx('blip'); }
    if (I.repeat('left')) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; A.sfx('blip'); }
    if (I.down('down')) AB.scroll += dt * 60; if (I.down('up')) AB.scroll = Math.max(0, AB.scroll - dt * 60);
    const c = I.clicked(); if (c) { if (c[0] < game.W / 3) { AB.page = (AB.page + n - 1) % n; } else AB.page = (AB.page + 1) % n; AB.scroll = 0; }
    if (I.pressed('cancel') || I.pressed('start')) { I.consumeAll(); game.go(AB.from); }
  },
  back() { game.go(AB.from); return true; },
  draw(r) {
    SKY.manhattan.draw(r);
    const [title, lines] = ABOUT[AB.page], W = Math.min(r.W - 24, 440), x0 = Math.round((r.W - W) / 2);
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
      E.font.title(g, title, r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
      let y = 32 - Math.round(AB.scroll);
      for (const ln of lines) {
        const [k, v] = Array.isArray(ln) ? ln : [null, ln];
        if (k) { txt(g, k, x0, y, COL.gold); y += 10; }
        const h = E.font.text(g, v, x0 + (k ? 8 : 0), y, COL.ink, { outline: false, shadow: COL.shadow, wrap: W - (k ? 8 : 0) }).h; y += h + 5;
      }
      AB.scroll = Math.min(AB.scroll, Math.max(0, y + AB.scroll - (r.H - 24)));
      panel(g, 0, r.H - 16, r.W, 16, { alpha: .9 });
      txt(g, '← ' + (AB.page + 1) + ' / ' + ABOUT.length + ' →     ' + key('cancel') + ' back     ↑↓ scroll', r.W / 2, r.H - 12, COL.ink, { align: 'center' });
    });
  }
};
