/* title, game over, results, about + the attract-mode autopilot */
(() => {
const G = SD, E = G.E, game = G.game, W = G.W, { px, clamp } = E;

/* ---------- input activity (idle timer for attract mode, exit from it) ---------- */
G.lastInput = performance.now();
const touch = () => { G.lastInput = performance.now(); };
['keydown', 'mousedown', 'pointerdown', 'touchstart', 'wheel'].forEach(ev => window.addEventListener(ev, touch, { passive: true }));
let lmx = -1, lmy = -1;
window.addEventListener('mousemove', e => { if (Math.abs(e.clientX - lmx) + Math.abs(e.clientY - lmy) > 4) { lmx = e.clientX; lmy = e.clientY; touch(); } }, { passive: true });
let padBase = null;
setInterval(() => {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let act = false;
  for (const p of pads) { if (!p) continue; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .6)) act = true; }
  if (act) touch();
}, 100);
G.idleSeconds = () => (performance.now() - G.lastInput) / 1000;

/* ---------- title ---------- */
let menu = null, bg = null, titleRig = null, tt = 0;
const hasSave = () => { try { return !!(game.saves && game.saves.latest && game.saves.latest()); } catch (e) { return false; } };
const buildMenu = () => {
  const items = [];
  if (G.touchOnly) items.push({ label: 'SETTINGS' });
  else {
    if (hasSave()) items.push({ label: 'CONTINUE' });
    items.push({ label: 'NEW GAME' }, { label: 'SETTINGS' }, { label: 'CONTROLS' }, { label: 'ABOUT' });
  }
  menu = new E.Menu(game, items, { x: 'center', y: 118, onPick(i, it) {
    G.lastInput = performance.now();
    switch (it.label) {
      case 'CONTINUE': G.loadLatest(); break;
      case 'NEW GAME': G.newGame(); break;
      case 'SETTINGS': game.menu('settings'); break;
      case 'CONTROLS': game.menu('controls'); break;
      case 'ABOUT': game.go('about', {}, { fade: .25 }); break;
    }
  } });
};
G.newGame = () => { game.audio.sfx('confirm'); G.S = G.fresh(); game.go('play', { fresh: true, demo: false, area: 'yard' }, { fade: 'black' }); };
G.loadLatest = () => { const s = game.saves.latest(); if (s) game.saves.load(s.slot !== undefined ? s.slot : 'auto'); };

const title = {
  view: 'overhead',
  enter() {
    bg = new E.Backdrop('city-night'); tt = 0; G.curMusic = null;
    titleRig = G.makeRig('tommy', { size: 2 });
    buildMenu();
    G.applySettings();
    if (!G.HUB || G.hubState === 'none') G.music('title');
    G.stopHud && G.stopHud();
    G.lastInput = performance.now();
  },
  update(dt) {
    tt += dt; G.applySettings();
    titleRig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: Math.floor(tt / 4) % 2 ? 'hips' : undefined });
    if (G.HUB && G.hubState !== 'none') return;
    menu.update(dt);
    if (G.idleSeconds() >= 10) { G.idleSeconds && (G.demoStart = performance.now()); game.go('play', { demo: true, fresh: true, area: 'yard' }, { fade: 'black' }); }
  },
  draw(r) {
    bg.draw(r);
    r.overlay(g => {
      const Wd = r.W, Ht = r.H;
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, Wd, Ht, '#303060'));
      px.rect(g, 0, Ht - 40, Wd, 40, '#0a0810');
      titleRig.drawPortrait(g, 14, 24, 96, { zoom: 2.2, turn: .25, bg: '#241830' });
      px.rect(g, 13, 23, 98, 1, '#c9a45c'); px.rect(g, 13, 120, 98, 1, '#c9a45c');
      E.font.title(g, 'THE', Wd / 2, 18, { scale: 2, colors: ['#ffe9a8', '#e0a040'], outline: '#1a0c10', align: 'center' });
      E.font.title(g, 'SOPRANO', Wd / 2, 36, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a', align: 'center' });
      const flick = Math.floor(tt * 7) % 29 === 0 ? .4 : 1;
      px.blend(g, flick, 'normal', () => E.font.title(g, 'DIET', Wd / 2, 64, { scale: 4, colors: ['#ffb0d8', '#ff4a9a', '#c01070'], outline: '#1a0c10', depth: 3, depthColor: '#50082a', align: 'center' }));
      G.txt(g, 'A Jersey tale of ducks, doctors and deli meat', Wd / 2, 98, '#e8dcc0', { align: 'center' });
      if (G.HUB && G.hubState !== 'none') { G.panel(g, Wd / 2 - 110, 118, 220, 20); G.txt(g, G.hubState === 'wait' ? 'Joining the round...' : 'Waiting for the round to start...', Wd / 2, 124, '#fff', { align: 'center' }); }
      else { menu.draw(r); }
      if (G.touchOnly) { G.panel(g, Wd / 2 - 120, 80 + 56, 240, 24); G.txt(g, 'Controller or keyboard required', Wd / 2, 140 + 2, '#ffd36a', { align: 'center' }); }
      G.txt(g, 'my-3D2dge ' + (E.version || ''), 4, Ht - 10, '#6a6078');
      if (!G.touchOnly && !(G.HUB && G.hubState !== 'none')) G.promptRow(g, Wd - 6, Ht - 30, [['confirm', 'Select'], ['move', 'Move']]);
      if (!G.touchOnly && !(G.HUB && G.hubState !== 'none')) G.txt(g, 'Idle for 10 seconds: attract mode', 6, Ht - 24, '#7a7090');
    });
  }
};

/* ---------- game over ---------- */
let overMenu = null;
const over = {
  view: 'overhead',
  enter(d) {
    G.stopMusic(); game.audio.sfx('die');
    overMenu = new E.Menu(game, [{ label: 'TRY AGAIN' }, { label: 'TITLE SCREEN' }], { x: 'center', y: 120, onPick(i) {
      if (i === 0) { G.S.hp = G.maxHp() * .7; G.S.stress = 40; G.S.cash = Math.round(G.S.cash * .8); game.go('play', { area: G.S.area, demo: false }, { fade: 'black' }); }
      else game.go('title', {}, { fade: 'black' });
    } });
  },
  update(dt) { overMenu.update(dt); },
  draw(r) {
    r.sky(['#200808', '#080204']);
    r.overlay(g => {
      const Wd = r.W;
      E.font.title(g, 'WHACKED', Wd / 2, 36, { scale: 4, colors: ['#ffb0a0', '#e04a3a', '#801a1a'], outline: '#100000', depth: 3, depthColor: '#400808', align: 'center' });
      G.txt(g, 'Sleeping with the fishes is overrated. The diet was supposed to prevent this.', Wd / 2, 84, '#e8c8c0', { align: 'center' });
      G.txt(g, 'You lose 20% of your cash. Dignity unaffected.', Wd / 2, 96, '#a89090', { align: 'center' });
      overMenu.draw(r);
    });
  }
};

/* ---------- results ---------- */
let resT = 0, resMenu = null;
const results = {
  view: 'overhead',
  enter(d) {
    resT = 0; G.curMusic = null; W.noHud = false; G.toasts.length = 0;
    const S = G.S; S.score = G.calcScore();
    resMenu = new E.Menu(game, [{ label: 'BACK TO TITLE' }], { x: 'center', y: 176, onPick() { game.go('title', {}, { fade: 'black' }); } });
    if (d && d.demo) G.demoRestart = .6; else G.demoRestart = 0;
    if (!(d && d.demo)) game.audio.sfx('rank');
  },
  update(dt) {
    resT += dt;
    if (G.demoRestart) { G.demoCheckExit(); G.demoRestart -= dt; if (resT > 6) { G.S = G.fresh(); game.go('play', { demo: true, fresh: true, area: 'yard' }, { fade: 'black' }); } return; }
    if (resT > 1.5) resMenu.update(dt);
  },
  draw(r) {
    r.sky(['#101018', '#2a1a28']);
    r.overlay(g => {
      const Wd = r.W, Ht = r.H, S = G.S;
      G.txt(g, 'EPISODE ONE  -  "THE ONION RING"', Wd / 2, 12, '#ffd36a', { align: 'center', scale: 1 });
      E.font.title(g, 'THE END?', Wd / 2, 24, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 2, depthColor: '#6a2a1a', align: 'center' });
      const diet = S.gut < 35 ? 'Nutritionist-approved' : S.gut < 60 ? 'Cardiologist concerned' : 'Numbers: theatrical';
      const rows = [['Take', G.fmt(S.cash)], ['Rank', G.RANKS[G.rank()] + '  (' + Math.round(S.respect) + ')'], ['Knockouts', S.kills], ['Ducks fed', S.ducks + '/3'], ['Insight', S.insight], ['Panic attacks', S.panics], ['Salads taken', S.refused], ['Diet verdict', diet]];
      G.panel(g, Wd / 2 - 110, 60, 220, 12 + rows.length * 11 + 16);
      rows.forEach((rw, i) => { const a = clamp(resT - i * .15, 0, 1); px.blend(g, a, 'normal', () => { G.txt(g, rw[0], Wd / 2 - 98, 68 + i * 11, '#e0d4bc'); G.txt(g, String(rw[1]), Wd / 2 + 98, 68 + i * 11, '#fff', { align: 'right' }); }); });
      px.blend(g, clamp(resT - 1.3, 0, 1), 'normal', () => G.txt(g, 'FINAL SCORE  ' + S.score.toLocaleString('en-US'), Wd / 2, 68 + rows.length * 11 + 6, '#9be58a', { align: 'center', scale: 1 }));
      G.txt(g, 'Cut to black. Roll credits. Nobody will ever agree what happened.', Wd / 2, Ht - 14, '#8a8098', { align: 'center' });
      if (!G.demoRestart && resT > 1.5) resMenu.draw(r);
    });
  }
};

/* ---------- about / credits ---------- */
let abScroll = 0;
const about = {
  view: 'overhead',
  enter() { abScroll = 0; G.music('title'); },
  update(dt) {
    const inp = game.input, m = inp.move();
    abScroll = Math.max(0, abScroll + (m[1] * 120 + (inp.padAim ? inp.padAim[1] * 120 : 0)) * dt);
    if (inp.pressed('cancel') || inp.pressed('pause') || inp.pressed('confirm')) game.go('title', {}, { fade: .25 });
    if (inp.clicked && inp.clicked()) game.go('title', {}, { fade: .25 });
  },
  draw(r) {
    r.sky(['#14101c', '#241830']);
    r.overlay(g => {
      const Wd = r.W, Ht = r.H, mw = Math.min(Wd - 40, 360), x0 = (Wd - mw) >> 1;
      let y = 22 - abScroll; const lh = E.font.lineHeight ? E.font.lineHeight() + 2 : 9;
      const out = [];
      out.push(['T', G.TITLE + ' - About']);
      for (const sec of G.ABOUT) { out.push(['H', sec.h]); for (const l of sec.lines) out.push(['L', l]); out.push(['S']); }
      let total = 0;
      for (const o of out) {
        if (o[0] === 'S') { y += 6; total += 6; continue; }
        const big = o[0] === 'T', head = o[0] === 'H';
        const wrapped = E.font.wrap(o[1], mw, {});
        for (const ln of wrapped) { if (y > -10 && y < Ht) G.txt(g, ln, x0, y, big ? '#ffd36a' : head ? '#ff9ad5' : '#e8dcc0', big ? { scale: 2 } : {}); y += big ? lh * 2 : lh; total += big ? lh * 2 : lh; }
        if (head) y += 1;
      }
      px.rect(g, 0, Ht - 14, Wd, 14, '#0a0810');
      G.promptRow(g, Wd - 6, Ht - 12, [['move', 'Scroll'], ['cancel', 'Back']]);
      if (abScroll > total) abScroll = total;
    });
  }
};

G.scenes.title = title; G.scenes.over = over; G.scenes.results = results; G.scenes.about = about;

/* ============ attract-mode autopilot ============ */
const D = G.demo = { slide: 0, side: 1, atk: 0, wait: .8, stuck: 0, lp: null, flow: null, flowFor: null, intr: 0 };
G.demoCheckExit = () => { if (G.lastInput > (G.demoStart || 0) + 500) { G.demoStart = 0; G.demoRestart = 0; game.go('title', {}, { fade: 'black' }); } };
G.demoTick = dt => {
  if (!G.demoStart) G.demoStart = performance.now();
  /* fail-safe: keep the tour moving */
  if (W.areaTime > (W.A.name === 'town' ? 85 : W.A.name === 'woods' ? 80 : 45) && !W.busy && !W.cut && !W.transition) G.demoSkip();
};
G.demoSkip = () => {
  const S = G.S, A = W.A;
  W.transition = true; game.after(1, () => { W.transition = false; });
  if (A.name === 'yard') { S.flags.bread = true; S.ducks = 3; S.flags.yardDone = true; S.flags.duck0 = S.flags.duck1 = S.flags.duck2 = true; S.chap = 1; game.go('play', { area: 'town', spawn: G.P(2, 13), demo: true }, { fade: 'iris' }); }
  else if (A.name === 'town') { A.shops.forEach(s => { S.done[s.id] = true; }); S.shakes = 3; S.flags.ambushStarted = true; S.flags.ambushDone = true; S.flags.therapyOpen = true; W.enemies.forEach(e => { e.dead = true; e.t = 3; }); game.go('play', { area: 'therapy', spawn: G.P(8.5, 8), demo: true }, { fade: 'iris' }); }
  else if (A.name === 'woods') { S.flags.enc1 = S.flags.enc2 = S.flags.bossStart = true; if (W.boss && !W.boss.dead) W.hurtEnemy(W.boss, 9999, 0, 1); else if (!W.boss) game.go('play', { area: 'diner', demo: true }, { fade: 'white' }); else W.enemies.forEach(e => W.hurtEnemy(e, 9999, 0, 1)); }
};
G.demoDialog = dt => {
  D.wait -= dt; const t = W.talk;
  if (D.wait <= 0) { if (t.choices) t.choice = Math.floor(Math.random() * t.choices.length); game.input.tap('confirm'); D.wait = t.choices ? .9 : .75; }
};
G.demoCtl = () => {
  const S = G.S, H = W.hero, b = H.body, A = W.A, dt = 1 / 120;
  const c = { mx: 0, my: 0, attack: false, dash: false, skill: false, interact: false, eat: false, next: false, view: false, click: null, gdir: null };
  S.hp = G.maxHp(); S.stress = Math.min(S.stress, 50);
  if (W.cut || W.talk.open) return c;
  let foe = null, fd = 220;
  for (const e of W.enemies) if (!e.dead) { const d = Math.hypot(e.body.x - b.x, e.body.y - b.y); if (d < fd) { fd = d; foe = e; } }
  let tx = null, ty = null, isExit = false;
  if (foe) { tx = foe.body.x; ty = foe.body.y; }
  else { const ob = G.objective(); if (ob) { isExit = !!ob.exit; if (ob.area !== A.name) { isExit = true; const ec = G.exitCenter(ob.area); if (ec) { tx = ec[0]; ty = ec[1]; } } else { tx = ob.x; ty = ob.y; } } }
  if (tx == null) return c;
  const d = Math.hypot(tx - b.x, ty - b.y);
  if (foe && fd < 24) { D.atk -= dt; if (D.atk <= 0) { c.attack = true; D.atk = .23; } c.gdir = [0, 0]; if (S.menace >= 100) c.skill = true; if (foe.k.boss && foe.state === 'chargeWind' && Math.random() < .02) c.dash = true; }
  else if (d > (foe ? 18 : isExit ? 3 : 20)) {
    if (D.flowFor !== A) { D.flow = new E.FlowField(A.map); D.flowFor = A; }
    D.flow.update(tx, ty);
    const dir = D.flow.dir(b.x, b.y, tx, ty); c.gdir = [dir[0], dir[1]];
    if (D.lp && Math.hypot(b.x - D.lp[0], b.y - D.lp[1]) < dt * 30) { D.stuck += dt; } else { D.stuck = Math.max(0, D.stuck - dt * 2); }
    D.lp = [b.x, b.y];
    if (D.stuck > .35 || D.slide > 0) {
      if (!(D.slide > 0)) { D.slide = .9; D.side = Math.random() < .5 ? 1 : -1; D.stuck = 0; }
      D.slide -= dt; const a = Math.atan2(dir[1], dir[0]) + D.side * 1.35; c.gdir = [Math.cos(a), Math.sin(a)];
    }
  } else {
    D.intr -= dt; if (D.intr <= 0 && W.nearInter()) { c.interact = true; D.intr = .9; }
    c.gdir = [0, 0];
  }
  if (!foe && W.nearInter() && d < 30) { D.intr -= dt; if (D.intr <= 0) { c.interact = true; D.intr = .9; } }
  return c;
};
})();
