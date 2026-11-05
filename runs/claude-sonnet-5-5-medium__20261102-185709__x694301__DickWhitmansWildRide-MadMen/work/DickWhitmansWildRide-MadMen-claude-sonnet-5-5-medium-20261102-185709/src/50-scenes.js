/* DICK WHITMAN'S WILD RIDE: title, attract mode, About, the AI Hub link, and the start. */
(() => {
'use strict';
const game = window.__game, M = game.MAD, E = M.E, px = E.px, { clamp } = E;
const T = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c || '#fdf6e6', Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const HUB = M.HUB;

/* ---------- saves ---------- */
game.saves.write = () => ({ data: { S: JSON.parse(JSON.stringify(M.S)), hx: M.hero.x, hy: M.hero.y }, place: M.W().name, level: M.fmtClock(M.S.clock) });
game.saves.read = save => {
  const d = save.data; M.init(); M.S = d.S; M.S.pos = [d.hx, d.hy]; M.S.demo = false; M.mode = 'world'; game.go('play', { load: true });
};

/* ---------- title ---------- */
let bg = null, menu = null, menuKind = '', titleT = 0;
function buildMenu() {
  const touch = M.touchOnly(); menuKind = touch ? 'touch' : 'full';
  const has = (() => { try { return !!game.saves.latest(); } catch (e) { return false; } })();
  const items = touch ? [{ label: 'SETTINGS' }] : [{ label: 'START THE DAY' }, { label: 'CONTINUE', disabled: !has }, { label: 'SETTINGS' }, { label: 'CONTROLS' }, { label: 'ABOUT AND CREDITS' }];
  menu = new E.Menu(game, items, { x: 'center', y: Math.round(game.H * .6), onPick: (i, it) => {
    const l = it.label;
    if (l === 'START THE DAY') game.go('play', { fresh: true });
    else if (l === 'CONTINUE') { const s = game.saves.latest(); if (s !== null && s !== undefined) game.saves.load(s.slot !== undefined ? s.slot : s); }
    else if (l === 'SETTINGS') game.menu('settings');
    else if (l === 'CONTROLS') game.menu('controls');
    else if (l === 'ABOUT AND CREDITS') game.go('about', { back: 'title' });
  } });
}
const title = {
  enter() {
    M.init(); M.syncSettings(); game.lights.enabled = false; bg = bg || new E.Backdrop('city-night');
    game.audio.music(M.songs.title, { fade: .5 }); M.poke(); buildMenu(); titleT = 0;
  },
  update(dt) {
    M.syncSettings(); titleT += dt;
    const k = M.touchOnly() ? 'touch' : 'full'; if (k !== menuKind) buildMenu();
    menu.update(dt);
    if (M.idleSeconds() >= 10) game.go('attract', { fade: 'iris' });
  },
  draw(r) {
    const W = r.W, H = r.H;
    bg.draw(r);
    r.overlay(g => {
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, H, '#07050d'));
      const glow = .75 + Math.sin(titleT * 2.2) * .25;
      E.font.title(g, "DICK WHITMAN'S", W / 2, 22, { scale: 3, align: 'center', colors: ['#fff0c0', '#ffb040', '#e0603a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a' });
      E.font.title(g, 'WILD RIDE', W / 2, 54, { scale: 5, align: 'center', colors: ['#ffe8b0', '#ff8a3a', '#d8403a'], outline: '#1a0c10', depth: 4, depthColor: '#6a1a1a' });
      px.blend(g, glow * .5, 'add', () => px.rect(g, W / 2 - 110, 98, 220, 1, '#ffb040'));
      T(g, M.TAGLINE.toUpperCase(), W / 2, 104, '#ffd8a0', { align: 'center' });
      if (M.heroRig) { M.heroRig.update(0, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); M.heroRig.drawPortrait(g, 16, H - 92, 76, { zoom: 2.4, bg: '#1a1224' }); }
      T(g, 'MY-3D2DGE ' + E.version, W - 8, H - 20, '#6a6088', { align: 'right' });
      T(g, 'A SPIRITUAL SUCCESSOR TO MAD MEN (2007-2015). A WORK OF FICTION.', W / 2, H - 10, '#6a6088', { align: 'center' });
    });
    menu.draw(r);
    if (menuKind === 'touch') r.overlay(g => {
      E.ui.box(g, W / 2 - 130, Math.round(H * .6) - 52, 260, 34, { bg: ['#3a1a1a', '#220e0e'], border: '#ff8a6a' });
      T(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, Math.round(H * .6) - 44, '#ffd0a0', { align: 'center' });
      T(g, 'THIS GAME HAS NO TOUCH CONTROLS.', W / 2, Math.round(H * .6) - 32, '#c8c0d8', { align: 'center' });
    });
  }
};

/* ---------- attract mode: the game plays itself, cheating freely ---------- */
const PLAN = [
  { id: 'gwen', done: f => f.gwen }, { id: 'joyce', done: f => f.joyce }, { id: 'margie', done: f => f.margie_credit !== undefined },
  { act: 'smoke' }, { id: 'roland', done: f => f.roland }, { id: 'percy', done: f => f.percy }, { id: 'dunn', done: f => f.dunn }, { id: 'archie', done: f => f.archie },
  { id: 'elevator', done: () => M.S.world === 'bar' }, { id: 'sully', done: f => f.sully }, { id: 'vera', done: f => f.vera }, { id: 'hollis', done: f => f.pitch1 },
  { id: 'exit', done: () => M.S.world === 'office' }, { id: 'teague', done: f => f.pitch2 }, { id: 'phone', done: f => f.grace }, { id: 'elevator', done: () => M.mode === 'ending' }
];
let planIdx = 0, stepTime = 0, aiWait = 0, demoAge = 0, aiSmoked = false;
function score(o) { const f = o.fx || {}; return (f.rep || 0) * 2 + (f.composure || 0) * .3 - (f.heat || 0) * 2.2 - Math.max(0, f.haze || 0) * .2 + (f.slide ? 6 : 0) + (f.know ? 4 : 0) + (f.cig ? -.5 : 0); }
function exitDemo() { M.aiDir = null; game.go('title', { fade: 0 }); }
M.demoDone = () => { M.aiDir = null; game.go('attract', { fade: 'iris' }); };
M.demoUpdate = dt => {
  demoAge += dt;
  if (demoAge > .8 && (M.idleSeconds() < .4)) { exitDemo(); return true; }
  const S = M.S, talk = M.talkRef();
  if (talk.open) {
    aiWait -= dt; M.aiDir = null;
    if (aiWait <= 0 && (!talk.typing || talk.shown > 4)) {
      if (talk.choices && talk.i >= talk.pages.length - 1 && !talk.typing && M.curAsk) { const sc = M.curAsk.map(score), best = sc.indexOf(Math.max(...sc)); talk.choice = best; }
      game.input.tap('confirm'); aiWait = talk.typing ? .15 : .55;
    }
    return false;
  }
  if (M.mode !== 'world' || M.pendingTravel) { M.aiDir = null; return false; }
  S.demo = true;
  if (S.flags.pitch1 && !S.flags.pitch2) S.clock = Math.min(S.clock, 14 * 60 + 40);
  const step = PLAN[planIdx];
  if (!step) { M.aiDir = null; return false; }
  stepTime += dt;
  if (step.act === 'smoke') { M.smoke(); planIdx++; stepTime = 0; return false; }
  if (step.done(S.flags)) { planIdx++; stepTime = 0; M.aiDir = null; return false; }
  const t = M.targetById(step.id);
  if (!t) { M.aiDir = null; if (stepTime > 6) { planIdx++; stepTime = 0; } return false; }
  const h = M.hero, d = Math.hypot(t.x - h.x, t.y - h.y);
  if (d < t.r + 12) { M.aiDir = null; M.interact(t); stepTime = 0; aiWait = .5; return false; }
  if (stepTime > 14) { h.x = t.x + 14; h.y = t.y + 12; stepTime = 0; }   // cheating: no clip
  const w = M.W(); if (w.flow.update) w.flow.update(t.x, t.y); M.aiDir = w.flow.dir(h.x, h.y, t.x, t.y);
  return false;
};
const attract = Object.assign({}, M.playScene, {
  pausable: false,
  enter() { planIdx = 0; stepTime = 0; aiWait = 0; demoAge = 0; M.aiDir = null; M.playScene.enter.call(this, { fresh: true, demo: true }); },
  draw(r) {
    M.playScene.draw.call(this, r);
    r.overlay(g => {
      const W = r.W, blink = Math.floor(game.real * 1.5) % 2;
      const y = r.H - 26;
      E.ui.box(g, W / 2 - 100, y, 200, 22, { bg: ['#1d1528', '#120c1c'], border: '#d8c8a0', alpha: .9 });
      E.font.text(g, "DICK WHITMAN'S WILD RIDE", W / 2, y + 4, '#ffd36a', { align: 'center', outline: false, shadow: '#05040a' });
      if (blink) E.font.text(g, 'DEMO  -  PRESS ANY BUTTON', W / 2, y + 13, '#fdf6e6', { align: 'center', outline: false, shadow: '#05040a' });
    });
  }
});

/* ---------- about and credits ---------- */
let abScroll = 0, abBack = 'title';
const about = {
  enter(d) { abScroll = 0; abBack = (d && d.back) || 'title'; game.lights.enabled = false; game.audio.music(M.songs.ending, { fade: .5 }); M.poke(); },
  update(dt) {
    const inp = game.input; abScroll += dt * 6;
    if (inp.down('down')) abScroll += dt * 70; if (inp.down('up')) abScroll -= dt * 90;
    const m = inp.move(); abScroll += m[1] * dt * 60; abScroll = Math.max(0, abScroll);
    if (inp.pressed('cancel') || inp.pressed('pause') || (inp.pressed('confirm') && abScroll > 20) || inp.clicked()) game.go(abBack);
  },
  draw(r) {
    const W = r.W, H = r.H, lines = M.aboutLines(Math.min(W - 60, 380));
    const total = lines.length * 10 + 40; abScroll = Math.min(abScroll, Math.max(0, total - H + 50));
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0c0814');
      lines.forEach((l, i) => { const y = 34 + i * 10 - Math.round(abScroll); if (y > 20 && y < H - 16) T(g, l.t, W / 2 - Math.min(W - 60, 380) / 2 + (l.i || 0), y, l.c || '#d8d0e8'); });
      px.rect(g, 0, 0, W, 24, '#0c0814');
      E.font.title(g, 'ABOUT AND CREDITS', W / 2, 6, { scale: 1, align: 'center', colors: ['#fff6c8', '#e0a85a'] });
      px.rect(g, 0, H - 14, W, 14, '#0c0814');
      T(g, M.label('up') + ' ' + M.label('down') + ' SCROLL     ' + M.label('cancel') + ' BACK', W / 2, H - 11, '#8f86a8', { align: 'center' });
    });
  }
};

/* ---------- AI Hub: ghost mode. Each copy plays its own seeded day; the others show as ghosts in the same room ---------- */
const ghosts = {}; let hubInfo = null, sendT = 0, progT = 0, reported = false, hubEnded = false, ghostRigs = {};
M.hubGate = dt => {
  if (!HUB || !hubInfo) return false;
  if (hubEnded) return true;
  if (window.AIHub.time() < 0) { M.hubCount = Math.ceil(-window.AIHub.time() / 1000); return true; }
  M.hubCount = 0; return false;
};
M.hubTick = dt => {
  if (!HUB || !hubInfo || hubEnded) return;
  const A = window.AIHub, S = M.S;
  sendT -= dt; if (sendT <= 0) { sendT = .12; A.send({ w: S.world, x: Math.round(M.hero.x), y: Math.round(M.hero.y), f: +M.hero.facing.toFixed(2) }, { reliable: false }); }
  progT -= dt; if (progT <= 0) { progT = 1; A.progress({ score: estimate(), label: M.fmtClock(S.clock) + '  REP ' + S.rep }); }
};
const estimate = () => { const S = M.S; return Math.max(0, S.rep * 10 + ((S.flags.won1 ? 1 : 0) + (S.flags.won2 ? 1 : 0)) * 400); };
M.hubResult = (score, e) => {
  if (!HUB || !hubInfo || reported) return; reported = true;
  const S = M.S;
  window.AIHub.result({ score, stats: { reputation: S.rep, accounts: (S.flags.won1 ? 1 : 0) + (S.flags.won2 ? 1 : 0), haze: Math.round(S.haze), heat: S.heat }, awards: [{ title: e.title, detail: e.lines[0] }] });
};
M.drawGhosts = r => {
  if (!HUB || !hubInfo) return;
  const S = M.S, now = performance.now();
  for (const id in ghosts) {
    const gh = ghosts[id]; if (gh.w !== S.world || now - gh.t > 4000) continue;
    const p = hubInfo.players.find(p => String(p.id) === String(id)); if (!p) continue;
    const rig = ghostRigs[id] || (ghostRigs[id] = M.rigFor('you', { colors: { cloth: p.color, coat: p.color, trim: '#ffffff' } }));
    gh.sx = (gh.sx === undefined ? gh.x : gh.sx + (gh.x - gh.sx) * .3); gh.sy = (gh.sy === undefined ? gh.y : gh.sy + (gh.y - gh.sy) * .3);
    const vx = (gh.x - gh.sx) * 6, vy = (gh.y - gh.sy) * 6;
    rig.update(1 / 60, { x: gh.sx, y: gh.sy, z: 0, vx, vy, facing: gh.f });
    r.shadow(gh.sx, gh.sy, 5);
    r.actor(gh.sx, gh.sy, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { alpha: .55 });
    r.textAt(gh.sx, gh.sy, 50, (p.name || 'PLAYER').toUpperCase(), p.color);
  }
  if (M.hubCount > 0) r.overlay(g => { E.font.title(g, String(M.hubCount), r.W / 2, r.H / 2 - 20, { scale: 6, align: 'center', colors: ['#fff6c8', '#e07a2a'] }); T(g, 'THE DAY BEGINS WHEN THE CLOCK SAYS', r.W / 2, r.H / 2 + 30, '#ffd36a', { align: 'center' }); });
};
function hubSetup() {
  const A = window.AIHub;
  A.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) { HUBNONE = true; game.go('title'); return; }
    hubInfo = info; M.hubInfo = info; M.S.hubName = info.players[info.me] && info.players[info.me].name;
    A.on('message', (d, from) => { if (d && typeof d.x === 'number') { const g = ghosts[from] || (ghosts[from] = {}); Object.assign(g, { w: d.w, x: d.x, y: d.y, f: d.f || 0, t: performance.now() }); } });
    A.on('leave', e => { delete ghosts[e.id]; });
    A.on('time-up', () => { if (!reported) { const S = M.S; M.hubResult(estimate(), M.endings(S)); } });
    A.on('end', () => { hubEnded = true; game.audio.mute(true); });
    A.ready();
  }).catch(() => { game.go('title'); });
}
let HUBNONE = false;

/* ---------- start ---------- */
const boot = { title: M.TITLE.toUpperCase(), steps: [['Hiring the typing pool', () => { M.init(); }], ['Polishing the brass', () => { }]] };
game.start({ scene: HUB ? 'play' : 'title', scenes: { title, play: M.playScene, attract, about }, boot });
if (HUB) hubSetup();
if (M.DEBUG) { window.__M = M; }
})();
