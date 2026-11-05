/* OutBloom — after the run: the ending vignette (each goal has its own, in three moods: Bloom, Bud, Wilt; a side view
 * at the goal's sky, the car arriving and parking, the couple stepping out, a local's line, the passenger's line, the
 * mood's moment, a caption card), the game over (the sun set), the results (big tiles: score and route, style, petals
 * and grade, seeds and records) and the initials entry on a letter wheel. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const game = OB.game, UI = OB.UI, C = UI.COL, SC = OB.SCENES;
const go = (s, d) => game.go(s, d, { fade: 'wipe', seconds: .3 });
const moodOf = R => {
  if (R.mood) return R.mood;
  if (R.grade) return OB.moodOfGrade(R.grade);
  const left = R.clock; return left >= 20 ? 'bloom' : left >= 5 ? 'bud' : 'wilt';
};
OB.moodOf = moodOf;
/* ---- the ending ---- */
let en = null;
const PROPS = {
  A(g, W, gy, t, m) { // Lantern Pier: a pier on posts, lantern strings
    px.rect(g, W * .55, gy - 22, W * .45, 6, '#8a5a3a'); for (let i = 0; i < 8; i++) px.rect(g, Math.round(W * .56 + i * W * .056), gy - 16, 4, 30, '#5a3a2a');
    for (let i = 0; i < 9; i++) { const x = W * .58 + i * W * .045, y = gy - 70 + Math.sin(i) * 4; px.line(g, Math.round(x), Math.round(y), Math.round(x + W * .045), Math.round(gy - 70 + Math.sin(i + 1) * 4), '#3a2a2a', 1); px.disc(g, Math.round(x), Math.round(y + 4), 3, '#ffb040'); } },
  B(g, W, gy, t) { // Petal Falls Chapel: a white chapel, the waterfall behind
    const wf = OB.Art.sprite('waterfall', 0, Math.floor(t * 8)); g.drawImage(wf.cv, Math.round(W * .62), Math.round(gy - wf.h * .9), Math.round(wf.w * .9), Math.round(wf.h * .9));
    const ch = OB.Art.sprite('chapel', 0, 0); g.drawImage(ch.cv, Math.round(W * .4), Math.round(gy - ch.h * .7), Math.round(ch.w * .7), Math.round(ch.h * .7)); },
  C(g, W, gy, t) { // Grand Hotel Vespera: a facade with lit windows, the awning
    px.rect(g, W * .45, gy - 150, W * .55, 150, '#3a2e58'); for (let r = 0; r < 6; r++) for (let i = 0; i < 9; i++) px.rect(g, Math.round(W * .47 + i * W * .058), gy - 140 + r * 22, 8, 10, (r + i) % 3 ? '#ffd870' : '#5a4a7a');
    px.rect(g, W * .55, gy - 40, W * .3, 8, '#c83a4a'); UI.text(g, 'GRAND HOTEL VESPERA', W * .72, gy - 52, { align: 'center', color: '#ffd870' }); },
  D(g, W, gy, t, m) { // Stargazer Observatory: a dome on a hill, opening at Bloom
    px.poly(g, [[W * .4, gy], [W * .7, gy - 40], [W, gy - 30], [W, gy]], '#2a2040'); const cx = W * .72, cy = gy - 40; px.rect(g, Math.round(cx - 34), Math.round(cy - 30), 68, 30, '#e8e8f0');
    px.disc(g, Math.round(cx), Math.round(cy - 30), 34, '#d8d8e4'); px.rect(g, Math.round(cx - 34), Math.round(cy - 30), 68, 34, '#e8e8f0'); px.disc(g, Math.round(cx), Math.round(cy - 30), 33, '#d8d8e4'); px.rect(g, Math.round(cx - 40), Math.round(cy - 2), 80, 34, '#e8e8f0');
    if (m === 'bloom') { const o = Math.min(1, en.t / 6) * 10; px.rect(g, Math.round(cx - o), Math.round(cy - 62), Math.round(o * 2), 34, '#141430'); } },
  E(g, W, gy, t) { // Finisterra Lighthouse: the tower, its beam
    px.poly(g, [[W * .5, gy], [W * .62, gy - 26], [W, gy - 26], [W, gy]], '#5a5a6a'); const x = W * .78; px.poly(g, [[x - 12, gy - 26], [x + 12, gy - 26], [x + 8, gy - 140], [x - 8, gy - 140]], '#f4f4f4');
    for (let i = 0; i < 4; i++) px.rect(g, Math.round(x - 10 + i * .8), Math.round(gy - 50 - i * 26), Math.round(20 - i * 1.6), 9, '#e83a3a'); px.rect(g, Math.round(x - 9), gy - 156, 18, 16, '#ffe080');
    const a = g.globalAlpha; g.globalAlpha = .18; const sw = Math.sin(t * .8) * .6; px.poly(g, [[x, gy - 148], [x - W * .6, gy - 148 - 40 + sw * 60], [x - W * .6, gy - 148 + 40 + sw * 60]], '#fff4c0'); g.globalAlpha = a; px.reset(g); }
};
const MOMENT = {
  lanterns(g, W, H, gy, u) { for (let i = 0; i < 40; i++) { const x = (i * 53) % W, y = gy - 20 - ((u * 120 + i * 13) % (H)), s = 2 + i % 3; px.rect(g, Math.round(x), Math.round(y), s, s + 1, i % 4 ? '#ffb040' : '#ffe070'); } if (u > .4) OB.FX.weather(g, { x: 0, y: 0, w: W, h: H }, 'petals', u * 10, .3); },
  onelantern(g, W, H, gy, u) { const y = gy - 60 - u * 120; px.rect(g, Math.round(W * .32), Math.round(y), 5, 7, '#ffd060'); px.rect(g, Math.round(W * .32) + 1, Math.round(y) + 1, 3, 4, '#fff0a0'); },
  gone(g) {}, bouquet(g, W, H, gy, u) { const x = W * .7 - u * W * .32, y = gy - 70 - Math.sin(u * Math.PI) * 50; OB.Art.icon(g, 'bouquet', x, y, 2); },
  cake(g, W, H, gy) { px.rect(g, Math.round(W * .48), gy - 22, 30, 4, '#f4f0e8'); px.rect(g, Math.round(W * .5), gy - 36, 22, 14, '#ffb0c8'); px.rect(g, Math.round(W * .5), gy - 36, 22, 3, '#ffffff'); px.rect(g, Math.round(W * .61), gy - 44, 2, 8, '#ffd23a'); },
  soaked(g, W, H, gy, u) { OB.FX.weather(g, { x: 0, y: 0, w: W, h: H }, 'shower', u * 12, 1.2); },
  carpet(g, W, H, gy, u, t) { px.rect(g, Math.round(W * .3), gy - 3, Math.round(W * .45), 4, '#c8203a'); if (Math.floor(t * 5) % 3 === 0) { const x = W * (.35 + ((Math.floor(t * 5) * 37) % 40) / 100); px.disc(g, Math.round(x), gy - 50, 5, '#ffffff'); } },
  valet(g, W, H, gy, u) {}, noodles(g, W, H, gy) { px.rect(g, Math.round(W * .12), gy - 30, 40, 26, '#c83a2a'); px.rect(g, Math.round(W * .12), gy - 38, 40, 8, '#ffd870'); UI.text(g, 'NOODLES', W * .12 + 20, gy - 37, { align: 'center', color: '#c83a2a', shadow: false }); px.disc(g, Math.round(W * .12 + 6), gy - 4, 4, '#2a2a2a'); px.disc(g, Math.round(W * .12 + 34), gy - 4, 4, '#2a2a2a'); },
  meteors(g, W, H, gy, u, t) { for (let i = 0; i < 6; i++) { const k = (t * .9 + i * .23) % 1, x = W * ((i * .17 + .1) % 1) + k * 80, y = 20 + (i * 23) % 70 + k * 30; px.line(g, Math.round(x), Math.round(y), Math.round(x - 14), Math.round(y - 5), '#ffffff', 1); } },
  onestar(g, W, H, gy, u) { if (u > .3 && u < .6) { const k = (u - .3) / .3, x = W * .2 + k * W * .4, y = 30 + k * 20; px.line(g, Math.round(x), Math.round(y), Math.round(x - 20), Math.round(y - 7), '#ffffff', 1); } },
  cocoa(g, W, H, gy) { for (let i = 0; i < 6; i++) px.ell(g, Math.round(W * (.1 + i * .16)), 40 + (i % 2) * 10, 30, 10, '#4a4a6a'); px.rect(g, Math.round(W * .5), gy - 46, 8, 8, '#a8683a'); px.rect(g, Math.round(W * .5) + 8, gy - 44, 2, 4, '#a8683a'); },
  greenflash(g, W, H, gy, u) { const sy = gy - 30 + u * 30; px.disc(g, Math.round(W * .25), Math.round(sy), 14, u > .75 ? '#7aff9a' : '#ffb040'); px.rect(g, 0, gy - 30, W * .5, 30, '#2a3a7a'); },
  sliver(g, W, H, gy, u) { px.disc(g, Math.round(W * .25), Math.round(gy - 32), 14, '#ff8a3a'); px.rect(g, 0, gy - 30, W * .5, 30, '#2a2a5a'); },
  jacket(g, W, H, gy) { OB.FX.weather(g, { x: 0, y: 0, w: W, h: H }, 'snow', en.t, .15); }
};
SC.ending = {
  res: [480, 270], expand: true,
  enter(R) {
    const p = R.players[0], goal = p.goal || 'A', G = OB.GOALS[goal], mood = moodOf(R), pass = p.passenger || 'marisol', EN = OB.ENDINGS[goal];
    en = { R, goal, G, mood, pass, EN, t: 0, car: p.car, paint: R.cfg.paint || OB.CARS[p.car].paints[0], beat: 0, said: {} };
    if (OB.Audio) game.audio.music(mood === 'bloom' ? OB.THEMES.credits : OB.THEMES.results, { fade: 1 });
    R.mood = mood;
    UI.screenName = 'ending';
  },
  update(dt) {
    en.t += dt; const t = en.t, I = game.input;
    if (en.R.attract) { OB.Talk.step(dt); OB.FX.step(dt); if (t > 4.5 && !en.said.a) { en.said.a = 1; OB.Talk.say('local', en.EN.arrive, { mood: 'happy' }); } if (t > 7.5 && !en.said.b) { en.said.b = 1; OB.Talk.say(en.pass, en.EN[en.mood][en.pass], { mood: 'excited' }); } OB.Attract.tick(dt); return; }
    if (t > 4.5 && !en.said.a) { en.said.a = 1; OB.Talk.clear(); OB.Talk.say('local', en.EN.arrive, { mood: 'happy' }); }
    if (t > 7.5 && !en.said.b) { en.said.b = 1; OB.Talk.say(en.pass, en.EN[en.mood][en.pass], { mood: en.mood === 'wilt' ? 'sad' : 'excited' }); }
    OB.Talk.step(dt); OB.FX.step(dt);
    if (en.mood === 'bloom' && en.goal !== 'D' && t > 8 && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) OB.FX.emit('confetti', game.W * (.3 + OB.FX.rnd() * .4), game.H * .2, 14, { colors: ['#ff7ab8', '#ffd23a', '#5ae0ff', '#ffffff'], speed: 60, grav: 50, life: 2, size: 2 });
    if ((t > 1 && (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked()))) || t > 14) { OB.Talk.clear(); go(en.R.cfg.afterEnding || 'results', en.R); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = en.t, gy = Math.round(H * .78), u = clamp((t - 7) / 6, 0, 1);
      OB.Sky.draw(g, { x: 0, y: 0, w: W, h: H }, gy - 30, en.G.sky, t * 8, t, { fireworks: (en.goal === 'A' || en.goal === 'C') && en.mood === 'bloom' && t > 6 });
      px.rect(g, 0, gy, W, H - gy, '#3a3046'); px.rect(g, 0, gy, W, 3, '#5a5068');
      PROPS[en.goal](g, W, gy, t, en.mood);
      const sc = en.EN[en.mood].scene; if (MOMENT[sc]) MOMENT[sc](g, W, H, gy, u, t);
      // the car arrives from the left and parks
      const arrive = clamp(t / 3, 0, 1), cx = W * (-.25 + .55 * (1 - Math.pow(1 - arrive, 3)));
      const bank = OB.Art.car(en.car, en.paint); OB.Art.drawCar(g, bank, cx, gy + 4, .55, { yaw: Math.PI / 2 * .999 });
      // the couple step out and stand by the car; the local waits
      const out = clamp((t - 3) / 1.5, 0, 1);
      if (out > 0) {
        const pose = en.mood === 'bloom' ? (t > 8 ? 'cheer' : 'wave') : en.mood === 'wilt' ? (t > 8 ? 'hips' : undefined) : (t > 8 ? 'wave' : undefined);
        OB.Cast.drawFigure(g, 'leo', cx + 50 * out, gy, 1.6, { facing: 0, vx: out < 1 ? 30 : 0, run: out < 1 ? .4 : 0, expr: en.mood === 'wilt' ? 'wince' : 'smile', dt: 1 / 60 });
        OB.Cast.drawFigure(g, en.pass, cx + 72 * out, gy, 1.6, { facing: Math.PI * (t > 7.5 ? 1 : 0), vx: out < 1 ? 30 : 0, run: out < 1 ? .4 : 0, pose: t > 7.5 ? pose : undefined, expr: en.mood === 'wilt' ? 'angry' : 'smile', dt: 1 / 60 });
        if (en.mood === 'wilt' && en.goal === 'E' && t > 9) { px.rect(g, Math.round(cx + 66 * out), gy - 44, 14, 14, '#3a4a6a'); }
      }
      OB.Cast.drawFigure(g, 'local', W * .86, gy, 1.5, { facing: Math.PI, pose: t > 4.5 && t < 7 ? 'wave' : undefined, expr: 'smile', dt: 1 / 60 });
      OB.FX.draw(g);
      // the speech bubble over whoever talks
      if (OB.Talk.cur) { const who = OB.Talk.cur.who, x = who === 'local' ? W * .82 : cx + 72, d = { seatScreen: [x, gy - 70] }; OB.HUD.bubble(g, d, { x: 0, y: 0, w: W, h: H }); }
      // the caption card
      if (t > 10) { const k = clamp((t - 10) * 3, 0, 1); UI.panel(g, W / 2 - 170, Math.round(H * .08 - (1 - k) * 40), 340, 52, { bg: ['#fff4e0', '#ffe0c0'], border: '#c8306a' });
        UI.text(g, 'GOAL ' + en.goal + ' - ' + en.G.place.toUpperCase(), W / 2, H * .08 + 6, { align: 'center', color: '#c8306a', shadow: false });
        UI.text(g, en.mood.toUpperCase() + ': ' + en.G.titles[en.mood], W / 2, H * .08 + 18, { align: 'center', scale: 1, color: '#5a1e4a', shadow: false });
        UI.text(g, en.EN[en.mood].caption, W / 2, H * .08 + 32, { align: 'center', color: '#3a2a3a', shadow: false }); }
      UI.footer(g, W, H, [['confirm', 'Continue']]);
    });
  }
};
/* ---- the game over: the sun set ---- */
let gov = null;
SC.gameover = {
  res: [480, 270], expand: true,
  enter(R) { gov = { R, t: 0 }; UI.screenName = 'gameover'; game.audio.sting(OB.JINGLES.gameover, { duck: 0 }); },
  update(dt) { gov.t += dt; const I = game.input; if (gov.t > 1.5 && (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked()))) go('results', gov.R); if (gov.t > 8) go('results', gov.R); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, p = gov.R.players[0];
    OB.Sky.draw(g, { x: 0, y: 0, w: W, h: H }, H * .62, 'beachSunset', 0, gov.t, {}); px.rect(g, 0, Math.round(H * .62), W, H, '#2a1a3a');
    OB.FX.ditherFill(g, { x: 0, y: 0, w: W, h: H }, '#1a0a28', clamp(gov.t * .15, 0, .5));
    E.font.title(g, 'TIME UP', Math.round(W / 2), Math.round(H * .26), { align: 'center', scale: 5, colors: ['#ffe0c0', '#ff8a5a', '#c8304a'], depth: 3, depthColor: '#3a0a1a' });
    UI.text(g, 'The sun set over ' + OB.STAGES[p.stage].name + '.', W / 2, H * .5, { align: 'center', scale: 1 });
    if (p.passenger) OB.Cast.portrait(g, p.passenger, W / 2 - 20, H * .58, 40, { mood: 'pouty' });
    if (gov.t > 1.5) UI.footer(g, W, H, [['confirm', 'Results']]); }); }
};
/* ---- results: big tiles, no tables ---- */
let res = null, resScr = null;
const TABLE = mode => 'outbloom:table:' + mode;
OB.table = mode => { try { return E.store.get(TABLE(mode), []) || []; } catch (e) { return []; } };
const qualifies = (mode, score) => { const t = OB.table(mode); return score > 0 && (t.length < 10 || score > t[t.length - 1].score); };
SC.results = {
  res: [480, 270], expand: true,
  enter(R) {
    if (R && R.cfg && R.cfg.mode === 'versus') { res = { versus: true }; return SC.versusResults.enter(R); }
    res = { R, t: 0, seeds: 0, record: false, entry: null, mode: R.cfg.mode === 'love' ? 'love' : 'arcade' };
    UI.screenName = 'results'; game.audio.music(OB.THEMES.results, { fade: .8 });
    const p = R.players[0];
    if (R.cfg.mode === 'arcade' || R.cfg.mode === 'love') { R.mood = R.mood || (p.goal ? moodOf(R) : null); res.seeds = OB.Profile.runResult(R); }
    if (R.cfg.mode === 'trial' && OB.Trial) Object.assign(res, OB.Trial.after(R));
    if ((R.cfg.mode === 'arcade' || R.cfg.mode === 'love') && qualifies(res.mode, p.score)) res.entry = { letters: [0, 0, 0], i: 0, done: false };
    const back = R.cfg.mode === 'trial' ? 'trial' : 'menu';
    resScr = UI.screen({ name: 'results', footer: [['confirm', 'Select'], ['cancel', 'Menu']], back: () => go('menu') });
    resScr.setItems([
      { id: 'again', x: 0, y: 0, w: 1, h: 1, label: 'DRIVE AGAIN', scale: 1, pick: () => OB.startRace(Object.assign({}, R.cfg, { noIntro: false, seed: (R.cfg.seed + 1) >>> 0 })) },
      { id: 'car', x: 0, y: 0, w: 1, h: 1, label: R.cfg.mode === 'trial' ? 'TRIAL MENU' : 'CHANGE CAR', scale: 1, pick: () => R.cfg.mode === 'trial' ? go('trial') : go('garage', { mode: R.cfg.mode }) },
      { id: 'menu', x: 0, y: 0, w: 1, h: 1, label: 'MENU', scale: 1, pick: () => go('menu') }
    ]);
  },
  update(dt) {
    if (res.versus) return SC.versusResults.update(dt);
    res.t += dt; const I = game.input, en2 = res.entry;
    if (en2 && !en2.done) {   // the letter wheel: up and down turn a letter, left and right move, confirm takes it (typing works)
      const L = en2.letters;
      if (I.repeat('up', .3, .1)) { L[en2.i] = (L[en2.i] + 1) % 27; OB.sfx('tick'); } if (I.repeat('down', .3, .1)) { L[en2.i] = (L[en2.i] + 26) % 27; OB.sfx('tick'); }
      if (I.pressed('left')) en2.i = Math.max(0, en2.i - 1); if (I.pressed('right')) en2.i = Math.min(2, en2.i + 1);
      if (OB.lastTyped) { const ch = OB.lastTyped.toUpperCase(); OB.lastTyped = null; if (/^[A-Z]$/.test(ch)) { L[en2.i] = ch.charCodeAt(0) - 64; en2.i = Math.min(2, en2.i + 1); } }
      if (I.pressed('confirm') || I.pressed('start')) { if (en2.i < 2) en2.i++; else { en2.done = true; const name = L.map(v => v ? String.fromCharCode(64 + v) : ' ').join(''), tb = OB.table(res.mode); tb.push({ name, score: res.R.players[0].score, goal: res.R.players[0].goal || '-' }); tb.sort((a, b) => b.score - a.score); try { E.store.set(TABLE(res.mode), tb.slice(0, 10)); } catch (e) { /* storage blocked */ } OB.sfx('confirm'); game.input.consumeAll(); } }
      return;
    }
    resScr.update(dt);
  },
  draw(r) {
    if (res.versus) return SC.versusResults.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, R = res.R, p = R.players[0], k = clamp(res.t * 2, 0, 1);
      OB.menuBG(g, W, H, res.t, p.goal ? OB.GOALS[p.goal].sky : 'beachSunset');
      UI.text(g, R.cfg.mode === 'trial' ? 'TIME TRIAL RESULTS' : R.cfg.mode === 'love' ? 'LOVE IN BLOOM RESULTS' : 'RESULTS', W / 2, 8, { align: 'center', scale: 2, color: '#fff4e0' });
      const tw = (W - 40) / 3, ty = 30, th = 120;
      // tile 1: the score, the time and the route
      UI.panel(g, 10, ty, tw, th, { alpha: .92 }); UI.text(g, R.cfg.mode === 'trial' ? 'TIME' : 'SCORE', 18, ty + 6, { color: C.dim });
      UI.text(g, R.cfg.mode === 'trial' ? OB.HUD.fmtT(p.time || R.t) : String(Math.round(p.score * k)), 18, ty + 16, { scale: 2, color: C.sun });
      UI.text(g, p.goal ? 'GOAL ' + p.goal + ': ' + OB.GOALS[p.goal].place : p.finished ? 'FINISHED' : 'REACHED ' + OB.STAGES[p.stage].name, 18, ty + 34, { color: '#ffffff' });
      OB.HUD.miniMap(g, { fixed: R.cfg.route && R.cfg.route.stages ? R.cfg.route.stages : null }, { routeStr: p.route, stage: p.stage, road: { junctionAt: null }, car: { z: 0 } }, 18 + tw / 2 - 38, ty + 52, res.t);
      UI.text(g, 'ROUTE ' + (p.route || '-'), 18, ty + th - 14, { color: C.dim });
      // tile 2: style
      const x2 = 20 + tw; UI.panel(g, x2, ty, tw, th, { alpha: .92 }); UI.text(g, 'YOUR STYLE', x2 + 8, ty + 6, { color: C.dim });
      [['BEST DRIFT', p.stats.bestDrift], ['NEAR MISSES', p.stats.nearMisses], ['OVERTAKES', p.stats.overtakes], ['SLIPSTREAM', p.stats.slipTime.toFixed(1) + ' s'], ['TOP SPEED', OB.HUD.speedTxt(p.stats.maxSpeed).join(' ')], ['CRASHES', p.stats.crashes]].forEach(([l, v], i) => { UI.text(g, l, x2 + 8, ty + 20 + i * 15, {}); UI.text(g, String(v), x2 + tw - 8, ty + 20 + i * 15, { align: 'right', color: C.sun }); });
      // tile 3: Love in Bloom's petals and grade, or the medal; then seeds and records
      const x3 = 30 + tw * 2; UI.panel(g, x3, ty, tw, th, { alpha: .92 });
      if (R.grade) { UI.text(g, 'PETALS ' + R.petals + ' / ' + R.maxPetals, x3 + 8, ty + 6, { color: C.pink }); const st = clamp((res.t - .6) * 3, 0, 1);
        if (st > 0) { const s = Math.round(2 + (1 - st) * 4); E.font.title(g, R.grade, Math.round(x3 + tw / 2), Math.round(ty + 22), { align: 'center', scale: s + 2, colors: ['#ffffff', '#ff7ab8', '#c8306a'], depth: 2 }); if (R.grade === 'AAA') UI.text(g, 'FULL BLOOM!', x3 + tw / 2, ty + 70, { align: 'center', color: C.sun }); } }
      else if (res.medal) { UI.text(g, 'MEDAL', x3 + 8, ty + 6, { color: C.dim }); UI.text(g, res.medal.toUpperCase(), x3 + tw / 2, ty + 30, { align: 'center', scale: 2, color: { bronze: '#c87a3a', silver: '#d8d8e8', gold: '#ffd23a', bloom: '#ff7ab8', none: '#8a7a9a' }[res.medal] }); if (res.split) UI.text(g, res.split, x3 + tw / 2, ty + 52, { align: 'center' }); }
      else { UI.text(g, 'MOOD', x3 + 8, ty + 6, { color: C.dim }); if (p.passenger) OB.Cast.portrait(g, p.passenger, x3 + tw / 2 - 20, ty + 20, 40, { mood: R.mood === 'wilt' ? 'pouty' : 'happy' }); UI.text(g, (R.mood || 'no goal').toUpperCase(), x3 + tw / 2, ty + 66, { align: 'center', color: C.sun }); }
      OB.Art.icon(g, 'seed', x3 + 8, ty + 88, 2); UI.text(g, '+' + res.seeds + ' SEEDS', x3 + 22, ty + 90, { color: C.good });
      if (res.record) UI.text(g, Math.floor(res.t * 3) % 2 ? 'NEW RECORD!' : '', x3 + tw / 2, ty + 104, { align: 'center', color: C.sun });
      // the initials, or the buttons
      if (res.entry && !res.entry.done) {
        UI.panel(g, W / 2 - 110, ty + th + 10, 220, 60, { border: C.sun }); UI.text(g, 'NEW HIGH SCORE! YOUR INITIALS', W / 2, ty + th + 16, { align: 'center', color: C.sun });
        res.entry.letters.forEach((v, i) => { const x = W / 2 - 30 + i * 30, on = i === res.entry.i; UI.text(g, v ? String.fromCharCode(64 + v) : '_', x, ty + th + 32, { align: 'center', scale: 3, color: on ? C.sun : '#ffffff' }); if (on) { UI.text(g, '↑', x, ty + th + 24, { align: 'center', color: C.sun }); UI.text(g, '↓', x, ty + th + 56, { align: 'center', color: C.sun }); } });
        UI.footer(g, W, H, [['navv', 'Letter'], ['nav', 'Next'], ['confirm', 'OK']]);
      } else {
        const by = ty + th + 18; resScr.items.forEach((it, i) => { it.x = W / 2 - 165 + i * 112; it.y = by; it.w = 104; it.h = 26; });
        resScr.draw(g);
        const tb = OB.table(res.mode).slice(0, 3); if (tb.length && R.cfg.mode !== 'trial') { UI.text(g, 'TOP: ' + tb.map(e => e.name + ' ' + e.score).join('   '), W / 2, by + 36, { align: 'center', color: C.dim }); }
        UI.footer(g, W, H, resScr.footer);
      }
    });
  }
};
if (typeof addEventListener === 'function' && !OB.env.headless) addEventListener('keydown', e => { if (e.key && e.key.length === 1) OB.lastTyped = e.key; });
})();
