/* ---- TITLE, ATTRACT MODE, ABOUT, RESULTS, GAME OVER, TOUCH NOTICE, AI HUB ---- */
const BUILD_DATE = '2026-11-02 18:43';
const MID = 480;
const stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'ground', side: '#b88a58' } }, edges: 'open' });
const titleBg = new E.Backdrop({ sky: ['#1a2a5a', '#d8704a', '#ffc070'], sun: { x: .72, y: .55, r: 26, color: '#fff0b0' }, stars: 0,
  layers: [{ kind: 'mountains', color: '#7a3a3a', y: .6, height: .22, parallax: .1 }, { kind: 'mountains', color: '#5a2a2e', y: .7, height: .2, parallax: .2 }, { kind: 'hills', color: '#8a5a3a', y: .8, height: .12, parallax: .35 }] });
const tRigs = { v: CAST.alias(), p: CAST.pinky(), m: CAST.teacher() };
let titleMenu = null, idle = 0, touchOnly = false, touchEl = null, sawPad = false, actStamp = 0, lastPtr = null;
const hasSave = () => { try { return !!E.store.get('bb:save', null); } catch (e) { return false; } };
const saved = () => { try { const s = E.store.get('bb:save', null); return typeof s === 'string' ? JSON.parse(s) : s; } catch (e) { return null; } };

// any input at all: keys, mouse, clicks, touches, pad buttons and sticks
for (const ev of ['keydown', 'pointerdown', 'wheel']) addEventListener(ev, () => { actStamp++; if (ev === 'keydown') dropTouchNotice(); }, true);
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { if (!lastPtr || Math.hypot(e.clientX - lastPtr[0], e.clientY - lastPtr[1]) > 4) { actStamp++; } lastPtr = [e.clientX, e.clientY]; } }, true);
addEventListener('gamepadconnected', () => { sawPad = true; dropTouchNotice(); });
function padActive() {
  try { for (const p of navigator.getGamepads() || []) { if (!p) continue; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) return true; } } catch (e) { /* blocked */ }
  return false;
}
function anyInput() { if (padActive()) { dropTouchNotice(); return true; } const s = actStamp; if (s !== anyInput.s) { anyInput.s = s; return true; } return false; }
function dropTouchNotice() { if (touchEl) { touchEl.remove(); touchEl = null; touchOnly = false; if (titleMenu) titleMenu.active = true; } }
function showTouchNotice() {
  const mm = q => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  let pads = 0; try { pads = Array.from(navigator.getGamepads() || []).filter(Boolean).length; } catch (e) { /* blocked */ }
  touchOnly = mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && !pads;
  if (!touchOnly) return;
  touchEl = document.createElement('div');
  touchEl.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:30;padding:18px 16px calc(18px + env(safe-area-inset-bottom));background:rgba(8,16,12,.92);color:#e8f1dc;font:600 18px/1.3 system-ui,sans-serif;text-align:center;border-top:2px solid #8fd14f';
  touchEl.innerHTML = '<div style="font-size:20px;margin-bottom:10px">Controller or keyboard required</div><button style="font:600 16px system-ui;padding:10px 22px;border-radius:8px;border:2px solid #8fd14f;background:#14301c;color:#e8f1dc">Settings</button>';
  touchEl.querySelector('button').addEventListener('click', () => game.menu('settings'));
  document.body.appendChild(touchEl);
}

/* ---- title ---- */
const dim = new E.Backdrop('night');
const titleScene = {
  view: 'side', views: ['side'], input: KEYMAP, res: 'ps1',
  enter() {
    L.enabled = false; game.resetCamera(); game.follow(null); game.cam.bounds = null; game.cam.room = null; A.music('title'); idle = 0; demo = null; demoCheat = false; ui.hud({}); anyInput.s = actStamp;
    const items = [{ label: 'NEW GAME' }, { label: 'CONTINUE', disabled: !hasSave() }, { label: 'SETTINGS' }, { label: 'CONTROLS' }, { label: 'ABOUT / CREDITS' }];
    titleMenu = new E.Menu(game, items, { y: 90, x: 'center', onPick: i => {
      if (touchOnly) return;
      if (i === 0) { game.go('play', { fresh: true }); }
      else if (i === 1) { const s = saved(); if (s) { fresh(); Object.assign(S, s); S.hp = 6; game.go('play', { load: true }); } }
      else if (i === 2) game.menu('settings');
      else if (i === 3) game.menu('controls');
      else openAbout();
    } });
    titleMenu.active = !touchOnly;
    if (HUB.active) game.go('play', { fresh: true, session: true }, { fade: 0 });
  },
  update(dt) {
    if (ui.screen || game.paused) { idle = 0; return; }
    if (!titleMenu.update(dt)) { const P2 = game.players; if (P2.some(I => I.pressed('start')) && !touchOnly) { P2.forEach(I => I.consumeAll()); titleMenu.onPick(titleMenu.i, titleMenu.items[titleMenu.i]); } }
    if (anyInput()) idle = 0; else idle += dt;
    if (idle > 10) startDemo();
    game.focus(MID, 0, 32 + (game.H / 2 - 22) / -game.view.bz);
    const t = game.time;
    tRigs.v.update(dt, { x: MID + 22, y: 0, z: 32, facing: Math.PI, vx: 0, vy: 0, pose: Math.sin(t * .7) > .6 ? 'hips' : undefined });
    tRigs.p.update(dt, { x: MID + 62, y: 0, z: 32, facing: Math.PI, vx: 0, vy: 0, pose: Math.sin(t * .9 + 2) > .7 ? 'wave' : undefined });
    tRigs.m.update(dt, { x: MID - 18, y: 0, z: 32, facing: 0, vx: 0, vy: 0 });
  },
  draw(r) {
    titleBg.draw(r); stage.draw(r);
    r.prop('cactus', MID - 150, 4, 32, { size: 1.5 }); r.prop('cactus', MID + 150, 4, 32, { size: 1.2 }); r.prop('rock', MID + 118, 8, 32, { size: 1.4 }); r.prop('bones', MID + 90, 6, 32, {});
    r.queue(MID - 80, 8, 32, g => { r.box(g, MID - 138, 4, 32, MID - 56, 16, 62, '#e8e4d8', '#cfc8b4'); const a = r.w(MID - 128, 4, 52), b = r.w(MID - 100, 4, 52); px.rect(g, a[0], a[1], b[0] - a[0], 7, '#3a9ad8'); const c = r.w(MID - 90, 4, 52), d = r.w(MID - 66, 4, 52); px.rect(g, c[0], c[1], d[0] - c[0], 7, '#3a9ad8'); const s = r.w(MID - 138, 4, 38); px.rect(g, s[0], s[1], 82, 3, '#6a8a5a'); });
    r.actor(MID + 22, 0, 32, (g, ox, oy) => tRigs.v.draw(g, ox, oy, r.view)); r.actor(MID + 62, 0, 32, (g, ox, oy) => tRigs.p.draw(g, ox, oy, r.view)); r.actor(MID - 18, 0, 32, (g, ox, oy) => tRigs.m.draw(g, ox, oy, r.view));
    const top = r.W < 380 ? 18 : 0; titleMenu.y = 94 + top;
    r.overlay(g => {
      E.font.title(g, 'BREWING', r.W / 2, 10 + top, { align: 'center', scale: 4, colors: ['#f4ffd8', '#a8e868', '#4aa83a'], depth: 3, depthColor: '#10301a' });
      E.font.title(g, 'BAD', r.W / 2, 44 + top, { align: 'center', scale: 5, colors: ['#ffffe0', '#ffe070', '#e0902a'], depth: 3, depthColor: '#3a1a08' });
      E.font.text(g, 'A SPIRITUAL SUCCESSOR TO BREAKING BAD', r.W / 2, 82 + top, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      const how = dev() === 'gamepad' ? 'D-pad / stick + ' + lab('confirm') : dev() === 'touch' ? '' : 'Arrows or WASD + Enter, or click';
      E.font.text(g, how, r.W / 2, r.H - 14, '#fff3d0', { align: 'center', shadow: '#000', outline: false });
      if (idle > 6.5 && idle < 10) E.font.text(g, 'ATTRACT MODE IN ' + Math.ceil(10 - idle), r.W / 2, r.H - 26, '#ffd070', { align: 'center', shadow: '#000', outline: false });
    });
    titleMenu.draw(r);
  }
};

/* ---- about / credits ---- */
function openAbout() {
  const si = CREDITS.sourceInformation, Q = ['How many issues did testing catch?', 'How many were critical / game breaking?', 'What was the most helpful test?', 'What was the least helpful test?'],
    EQ = ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What one thing would you remove or overhaul?', 'What one thing would you change?'],
    PQ = ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'If there was one test you could have run, what would it be?'];
  const qa = (qs, as) => qs.map((q, i) => q + '\n' + as[i]).join('\n\n');
  ui.show('help', {
    title: 'About • Credits', kicker: TITLE + '  •  ' + si.date, keys: [],
    sections: [
      ['Source Information', ['Date: ' + si.date, 'Source: ' + si.source, 'Genre and Perspective: ' + si.genre + '. ' + si.perspective + '.', 'Tech: ' + si.tech, 'Art Direction: ' + si.artDirection, 'Animation: ' + si.animation, 'Audio: ' + si.audio, 'Online: ' + si.online, 'Testing: ' + si.testing, 'Research: ' + si.research, 'Environment: ' + si.environment, 'Model: ' + si.model, 'Usage: ' + si.usage].join('\n')],
      ['Testing Feedback', qa(Q, CREDITS.testingFeedback)],
      ['Engine Feedback', qa(EQ, CREDITS.engineFeedback)],
      ['Prompt Feedback', qa(PQ, CREDITS.promptFeedback)],
      ['The story', 'Wendell Marsh teaches chemistry. He has nine weeks of insurance, a pregnant wife and a very good memory for the periodic table. This game contains no real chemistry: the cook is a toy of steady hands.']
    ],
    actions: [['Back', () => ui.hide()]], back: () => ui.hide()
  });
}

/* ---- the attract mode: the game plays itself through the stealth, the cook, the laundry, the fight and the boss; any input leaves ---- */
let demoMouse = null;
function demoInput() {
  const I = game.input;
  if (I.anyPressed()) return true; if (anyInput()) return true;
  return false;
}
function startDemo() {
  fresh(); setPersona(1);
  demo = { stage: 0, t: 0, wps: [], caption: '', ctl: null };
  demo.ctl = demoCtl;
  game.go('play', { demo: true, demoStart: true });
}
function cellsPath(list) { return list.map(c => PX(c[0], c[1])); }
function demoSetup(stage) {
  const h = hero.b; demo.stage = stage; demo.t = 0; foes.length = 0; shots.clear(); flasks.length = 0; bubbles.length = 0;
  game.setView('threequarter'); S.hp = 6; hero.inv = 0;
  const put = c => { const p = PX(c[0], c[1]); h.x = p.x; h.y = p.y; h.vx = h.vy = 0; };
  if (stage === 0) { S.step = 4; S.bags = 3; S.purity = 96; S.supplies = false; resetWorld(); setPersona(1); put([7, 13]); demo.wps = cellsPath([[7, 16], [12, 18], [12, 22], [8, 24], [8, 26]]); demo.caption = 'STEALTH: patrols have eyes. Hide in the brush, skip the sprint, deliver the product.'; A.music('town', { fade: .5 }); S.step = 4; }
  if (stage === 1) { S.supplies = true; S.step = 3; game.go('cook', { level: 1, demo: true }); demo.caption = 'THE COOK: heat, mix, crystallize.'; }
  if (stage === 2) { S.step = 6; resetWorld(); setPersona(1); put([44, 12]); S.flasks = 9; for (const c of [[41, 5], [50, 5], [41, 9], [50, 9]]) addGoon(c[0], c[1], c[0] > 45 ? 'goon2' : 'goon', { aggro: true }); demo.wps = []; demo.caption = 'COMBAT: wrench for close, flasks for crowds, barrels for cover.'; A.music('boss', { fade: .5 }); }
  if (stage === 3) { S.step = 8; resetWorld(); setPersona(1); put([45, 27]); S.flasks = 9; addBoss(); foes[foes.length - 1].aggro = true; demo.caption = 'THE BOSS: dodge the telegraphed charge, punish his stun.'; A.music('boss', { fade: .5 }); }
  if (stage === 4) { game.go('launder', { demo: true }); }
}
function demoCtl(dt) {
  const d = demo, h = hero.b; d.t += dt;
  const c = { mx: 0, my: 0, sprint: false, attack: false, throw: false, interact: false };
  const go = p => { const a = Math.atan2(p.y - h.y, p.x - h.x); c.mx = Math.cos(a); c.my = Math.sin(a); return Math.hypot(p.x - h.x, p.y - h.y); };
  if (d.stage === 0) {
    const w = d.wps[0];
    if (w) { if (go(w) < 6) d.wps.shift(); }
    if (!w || d.t > 34) { demoSetup(1); }
    return c;
  }
  if (d.stage === 2 || d.stage === 3) {
    const live = foes.filter(f => f.kind !== 'cop');
    if (!live.length || d.t > (d.stage === 2 ? 26 : 20)) { demoSetup(d.stage === 2 ? 3 : 4); return c; }
    let best = live[0], bd = 1e9; for (const f of live) { const q = dist2(f.b, h); if (q < bd) { bd = q; best = f; } }
    hero.face = ang(h, best.b);
    if (bd > 30) { if (bd > 52 && S.flasks > 0 && hero.thr <= 0 && Math.random() < dt * 1.2) { c.throw = true; hero.face = ang(h, best.b); } go(best.b); }
    else { c.attack = true; const a = ang(best.b, h); c.mx = Math.cos(a) * .3; c.my = Math.sin(a) * .3; }
    S.hp = 6; S.flasks = Math.max(S.flasks, 4);
    if (d.stage === 3 && best.kind === 'boss') { best.hp = Math.max(best.hp, best.max * .2); if (best.hp < best.max * .5 && d.t > 12) best.hp = 0.5; }
    return c;
  }
  return c;
}
function demoOverlay(r) {
  r.overlay(g => {
    const W = r.W, H = r.H; px.rect(g, 0, H - 38, W, 38, '#000000'); E.font.text(g, demo.caption || '', W / 2, H - 31, '#ffe7a8', { align: 'center', outline: false, wrap: W - 24 });
    if (Math.floor(game.real * 1.6) % 2) E.font.text(g, 'ATTRACT MODE • PRESS ANY BUTTON', W / 2, 8, '#ffffff', { align: 'center', shadow: '#000', outline: false });
  });
}

/* ---- game over, results ---- */
const overMenu = new E.Menu(game, ['TRY AGAIN', 'TITLE'], { y: 120, onPick: i => { if (i === 0) { S.hp = 6; heroDead = false; game.go('play', { load: true }); } else game.go('title'); } });
const overBg = new E.Backdrop({ sky: ['#12040c', '#3a0c1c', '#6a1a28'], moon: { x: .5, y: .3, r: 16, color: '#e8a0a0' }, stars: 30, layers: [{ kind: 'mountains', color: '#2a0c16', y: .72, height: .3, parallax: 0 }] });
const overScene = {
  view: 'side', input: KEYMAP, res: 'ps1',
  enter() { A.music(null); A.sfx('die'); game.follow(null); game.focus(0, 0, 0); L.enabled = false; overMenu.i = 0; ui.hud({}); if (HUB.active) { game.go('play', { load: true }, { fade: 0 }); S.hp = 6; } },
  update(dt) { overMenu.update(dt); },
  back() { return false; },
  draw(r) { const y = Math.round(r.H / 2) - 62; overMenu.y = y + 60; overBg.draw(r); r.overlay(g => { E.font.title(g, 'FLATLINED', r.W / 2, y, { align: 'center', scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' }); E.font.text(g, 'The doctor gave you months. Vega gave you a minute.', r.W / 2, y + 40, '#e8b0b0', { align: 'center', outline: false }); }); overMenu.draw(r); }
};
function finalScore() { return Math.round(S.cash + S.dirty * .6 + S.bestPurity * 8 + S.kills * 25 - S.busts * 60); }
const resultsScene = {
  view: 'side', input: KEYMAP, res: 'ps1',
  enter() {
    game.follow(null); game.focus(0, 0, 0); L.enabled = false; A.music('desk'); ui.hud({});
    const mins = Math.floor(S.time / 60), secs = Math.floor(S.time % 60);
    const showResults = () => ui.show('results', {
      emblem: '☠', kicker: 'Brewing Bad • Chapter one', title: 'The empire business',
      text: ['Wendell Marsh has a new name, a clean fortune of ' + $(S.cash) + ', and a very simple question: how much is enough?'],
      stats: [[$(S.cash), 'Clean cash'], [S.bestPurity + '%', 'Best purity'], [String(S.kills), 'Rivals down'], [String(S.busts), 'Busts'], [mins + ':' + String(secs).padStart(2, '0'), 'Time'], [String(finalScore()), 'Score']],
      medals: [['99% club', S.bestPurity >= 98], ['Unseen (no busts)', S.busts === 0], ['Laundered 1,000+', S.laundered >= 1000], ['Dumpster diver', S.found >= 3]],
      actions: [{ label: 'Play again', primary: true, fn: () => { ui.hide(); game.go('play', { fresh: true }); } }, { label: 'Title', fn: () => { ui.hide(); game.go('title'); } }]
    });
    showResults();
    if (HUB.active) hubFinish();
  },
  update() { }, draw(r) { r.sky(['#08140c', '#14301c']); }
};

/* ---- AI Hub (ghost mode): other players' characters appear where they stand ---- */
function hubScore() { return finalScore(); }
function hubProgress() { try { if (HUB.progress) HUB.progress({ score: hubScore(), label: $(S.cash + S.dirty) + ' • step ' + S.step }); } catch (e) { /* hub gone */ } }
function hubFinish() { if (!round || round.sent) return; round.sent = true; try { HUB.result({ score: hubScore(), stats: { 'Clean cash': S.cash, 'Best purity': S.bestPurity, 'Rivals down': S.kills, Busts: S.busts }, awards: S.bestPurity >= 98 ? [{ title: '99% club', detail: 'A near-perfect batch' }] : [] }); } catch (e) { /* hub gone */ } }
let hubT = 0, prT = 0;
function hubTick(dt) {
  if (!round) return;
  hubT += dt; prT += dt;
  if (hubT > .12) { hubT = 0; try { HUB.send({ x: Math.round(hero.b.x * 10) / 10, y: Math.round(hero.b.y * 10) / 10, f: Math.round(hero.face * 100) / 100, p: S.persona, s: Math.hypot(hero.b.vx, hero.b.vy) > 5 ? 1 : 0 }, { reliable: false }); } catch (e) { /* hub gone */ } }
  if (prT > 1) { prT = 0; hubProgress(); }
}
function ghostOf(id) {
  let g = ghosts.get(id);
  if (!g) { const pl = (HUB.players || []).find(p => p.id === id) || {}; g = { x: 0, y: 0, tx: 0, ty: 0, name: String(pl.name || 'P' + (id + 1)).slice(0, 14), color: pl.color || '#ffffff', rig: rigOf({ build: 'chibi', weapon: null, outfit: 'coat', hair: 'bald', hat: { style: 'cap', color: '#0e0e10' }, sleeves: 'long', colors: { skin: SKIN, cloth: pl.color || '#888', coat: pl.color || '#888', pants: '#202024' } }), f: 0, mv: 0 }; ghosts.set(id, g); }
  return g;
}
function hubSetup() {
  if (!HUB.active || !HUB.connect) return;
  round = { over: false, sent: false, ready: false };
  HUB.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) { round = null; return; }
    round.ready = true; try { HUB.ready(); } catch (e) { /* hub gone */ }
    HUB.on('message', (d, from) => { if (!d || typeof d.x !== 'number') return; const g = ghostOf(from); g.tx = d.x; g.ty = d.y; g.f = d.f || 0; g.mv = d.s; if (!g.init) { g.x = d.x; g.y = d.y; g.init = true; } });
    HUB.on('leave', e => { ghosts.delete(e.id); });
    HUB.on('time-up', () => { hubFinish(); });
    HUB.on('end', () => { round.over = true; A.music(null); });
  });
}
