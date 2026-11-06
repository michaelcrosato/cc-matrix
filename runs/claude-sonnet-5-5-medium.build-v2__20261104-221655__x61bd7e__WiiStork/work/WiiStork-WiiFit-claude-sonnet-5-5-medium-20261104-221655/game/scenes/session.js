// session: ActRun (the engine of every activity) and the generated activity scenes (card, demo, count, play, result)
(() => {
const E = My3D2dge, G = window.G, { px } = E;
const C = G.C;
G.starsOf = (pct, act, tier) => {
  const thr = ((tier && act.tiers[tier - 1] && act.tiers[tier - 1].stars) || act.stars || [.35, .65, .90]).map((v, i) => v * G.DEV.star3 * (i === 0 ? G.DEV.star1 : 1));
  return pct >= thr[2] ? 3 : pct >= thr[1] ? 2 : pct >= thr[0] ? 1 : 0;
};
G.thresholds = (act, tier) => ((act.tiers[tier - 1] && act.tiers[tier - 1].stars) || act.stars || [.35, .65, .90]).map((v, i) => v * G.DEV.star3 * (i === 0 ? G.DEV.star1 : 1));
G.slots = n => n <= 1 ? [{ x: 0, size: 2.1 }] : n === 2 ? [{ x: -30, size: 1.9 }, { x: 30, size: 1.9 }] : n === 3 ? [{ x: -52, size: 1.7 }, { x: 0, size: 1.7 }, { x: 52, size: 1.7 }] : [0, 1, 2, 3].map(i => ({ x: -66 + i * 44, size: 1.5 }));
// ---- contestant -----------------------------------------------------------------------------------------------
G.makeContestant = o => Object.assign({ it: G.newIntent(), bal: null, fig: null, name: 'You', color: '#ff7a59', score: 0, local: true, bot: null, input: null, id: 0, pct: 0 }, o);

// ---- ActRun ------------------------------------------------------------------------------------------------------------
class ActRun {
  constructor(def, o) {
    o = o || {}; this.def = def; this.tier = o.tier || 1; this.T = def.tiers[this.tier - 1] || def.tiers[0]; this.seed = o.seed != null ? o.seed : (Date.now() & 0xffff);
    this.rng = o.rng || E.rng(this.seed); this.time = 0; this.dur = o.dur || this.T.dur || 60; this.fixedDur = !!o.dur; this.done = false; this.cheat = !!o.cheat; this.mode = o.mode || 'story'; this.t = 0;
    this.cs = o.contestants || [G.makeContestant({ input: G.game.input })];
    this.n = this.cs.length; this.slotsDef = G.slots(this.n); this.devBot = null; this.shortRun = !!o.short; this.hub = !!o.hub; this.events = [];
    this.inst = o.inst === false ? null : G.castFigure(G.S.inst || 'birch', { size: 2.1 }); if (this.inst) { this.inst.rig.o.size = this.n > 1 ? 1.7 : 2.05; this.inst.x = this.n > 1 ? 100 : 62; this.inst.y = 8; this.inst.tgt = 1.4; this.inst.set('Idle_Subtle'); }
    this.cs.forEach((c, i) => { c.idx = i; c.bal = c.bal || new G.Balance(G.SETS[this.T.set || 'free'], E.rng(this.seed * 31 + i * 7 + 3)); c.bal.cheat = this.cheat; c.score = 0; c.fig = c.fig || (c.local ? G.playerFigure() : G.colorFigure(c.color)); const s = this.slotsDef[Math.min(i, 3)]; c.fig.x = s.x; c.fig.y = 12; c.fig.size = s.size; c.fig.rig.o.size = s.size; c.fig.tgt = 1.5707; });
    this.talk = (key, who) => {};
    if (def.setup) def.setup(this);
  }
  slot(i) { return this.slotsDef[Math.min(i, 3)]; }
  // steps one contestant's lean with its intent (bots and humans alike)
  leanStep(c, dt) { c.bal.u.x = c.it.ux; c.bal.u.y = c.it.uy; c.bal.step(dt); }
  fill(c, dt) {
    if (c.ghostOnly) return;
    let bot = c.bot;
    if (!bot && c.local && G.devFlags.bot) { this.devBot = this.devBot || new G.Bot(G.devFlags.bot, E.rng(5)); bot = this.devBot; c.devbot = true; }
    if (bot) { const sk = bot.skill || 'average'; if (this.def.bot) this.def.bot(this, c, bot, dt); else { const u = bot.lean(c.bal, dt); c.it.ux = u.x; c.it.uy = u.y; } c.it.src = 'bot'; }
    else if (c.input) G.readHuman(c.input, c.it, dt);
  }
  update(dt) {
    if (this.done) return;
    this.time += dt;
    for (const c of this.cs) this.fill(c, dt);
    this.def.update(dt, this);
    for (const c of this.cs) { c.fig.update(dt); if (c.bal.stumbleT > 0 || c.bal.edge > 0) { /* hooks in activity */ } }
    if (this.inst) this.inst.update(dt);
    if (this.time >= this.dur || this.def.finished && this.def.finished(this)) { this.done = true; for (const c of this.cs) { const r = this.def.result(this, c); c.pct = G.clamp(r.pct, 0, 1); c.detail = r.detail; c.score = Math.round(c.pct * 1000); } }
  }
  draw(r) { const rm = this.def.room === false ? null : (G.rooms[this.def.room] || G.rooms.deck); if (rm) rm(r, this.time); this.def.draw(r, this); }
  hud(r) { if (this.def.hud) this.def.hud(r, this); }
  result(c) { return this.def.result(this, c); }
}
G.ActRun = ActRun;

// ---- scenes -------------------------------------------------------------------------------------------------------------
G.scenes = G.scenes || {};
const how = (def, input) => { const d = (input || G.game.input).lastDevice; return def.how ? (d === 'gamepad' ? def.how.pad : (G.leanSrc === 'mouse' ? def.how.mouse : def.how.key)) || def.how.key : ''; };
G.devOf = input => (input || G.game.input).lastDevice === 'gamepad' ? 'pad' : 'key';
function setLights() { const L = G.game.lights, tm = G.time(); L.enabled = tm !== 'noon'; L.ambient = tm === 'morning' ? .92 : tm === 'dusk' ? .62 : 1; }

function makeScene(def) {
  let run = null, phase = 'card', pt = 0, data = null, pills = null, resultState = null, bestBefore = 0, count = 3, announced = false, stampT = 0, again = 0;
  const pause = {};
  const startRun = () => {
    const contestants = data.contestants || null;
    run = new ActRun(def, { tier: data.tier, mode: data.mode, contestants, cheat: data.mode === 'attract', short: data.short, seed: data.seed });
    if (data.dur) run.dur = data.dur;
    G.curRun = run;
  };
  const toPhase = p => { phase = p; pt = 0; };
  const finish = () => {
    const c = run.cs[0], r = run.result(c), pct = G.clamp(r.pct, 0, 1), stars = G.starsOf(pct, def, run.tier);
    const sm = (run.dur / 30) * (1 + .25 * stars) * (G.S.suggestion === def.id && data.mode === 'story' ? 1.5 : 1) * G.DEV.minutes;
    resultState = { pct, stars, detail: r.detail, minutes: sm, dropped: 0, tareLine: null, first: !G.S.sessLog.includes(def.id + ':' + data.day), newBest: false };
    if (data.mode === 'story' || data.mode === 'free') {
      const had = G.stars(def.id, run.tier); G.setBest(def.id, run.tier, stars); if (G.S.day === 2 && stars >= 2 && !G.S.gertNod && data.mode === 'story') G.S.gertNod = 1; resultState.newBest = stars > had; G.S.minutes += sm; G.S.plays++;
      if (data.mode === 'story' && !data.counted) { G.S.done = Math.min(3, G.S.done + 1); data.counted = true; }
      if (G.unlockCheck) G.unlockCheck();
      G.saveNow();
    }
    const key = run.cs[0].bal.falls > 1 && stars < 2 ? 'fall' : 'star' + stars;
    resultState.tareLine = G.line(G.LINES.tare[key]);
    resultState.stamp = 0; toPhase('result'); G.jingle('star' + Math.max(1, stars));
  };
  return {
    pausable: true, view: def.view || 'brawler', camera: def.camera || { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
    enter(d) {
      data = Object.assign({ tier: 1, mode: 'story', day: G.S.day }, d || {}); phase = data.skipCard ? 'count' : 'card'; pt = 0; setLights();
      startRun(); G.game.weather = def.weather || null; G.game.timeScale = G.DEV.timeScale || 1; announced = false; G.cap = null; G.leanSrc = 'key';
      G.song(def.song || 'yoga'); this.rebuildPills();
      if (data.skipCard) { count = 3; }
      G.curDef = def;
      if (def.enter) def.enter(run, data);
    },
    exit() { const cv = typeof document !== 'undefined' && document.getElementById('screen'); if (cv) cv.style.cursor = ''; if (def.exit) def.exit(run); G.game.weather = null; G.curRun = null; G.game.timeScale = 1; },
    rebuildPills() {
      const items = [{ label: 'Start' }];
      const unlocked2 = def.tiers.length > 1 && (G.stars(def.id, 1) >= 2 || G.S.day >= 4 || G.S.free || data.mode === 'free');
      if (def.tiers.length > 1) items.push({ label: 'Tier', choices: ['1', '2'], idx: data.tier - 1, disabled: !unlocked2 });
      items.push({ label: 'Back' }); pills = new G.Pills(items, { w: 110, y: 'center', x: 'center' }); pills.first(); pills.o.y = 150; pills.o.h = 16;
    },
    update(dt) {
      const input = G.game.input; G.tick(dt); G.talk && G.talk.update(dt);
      if (!run) return;
      if (input.lastDevice === 'gamepad') G.leanSrc = 'pad';
      if (phase === 'card') {
        const r = pills.update(dt, input), it = pills.items;
        run.cs[0].fig.update(dt); if (run.inst) run.inst.update(dt);
        if (r && r.change != null && it[r.change].label === 'Tier') { data.tier = it[r.change].idx + 1; startRun(); if (def.enter) def.enter(run, data); }
        if (r && r.pick != null) { const lab = it[r.pick].label; if (lab === 'Start') toPhase('demo'); else if (lab === 'Back') this.leave(); }
        if (r && r.cancel) this.leave();
        if (data.mode === 'attract') toPhase('demo');
      } else if (phase === 'demo') {
        pt += dt; run.cs[0].fig.update(dt); if (run.inst) { run.inst.update(dt); run.inst.set(def.demoPose || 'stork'); }
        if (!announced) { announced = true; const L = G.LINES[G.S.inst || 'birch']; G.caption(G.line(L.demo), G.CAST[G.S.inst || 'birch'].name, 3); }
        if (pt > 3 || input.pressed('confirm')) { toPhase('count'); count = 3; G.cap = null; }
      } else if (phase === 'count') {
        pt += dt; run.cs[0].fig.update(dt); if (run.inst) run.inst.update(dt);
        const c3 = 3 - pt; if (Math.ceil(c3) !== count) { count = Math.ceil(c3); if (count > 0) G.snd('boop', { pitch: 1 + (3 - count) * .1 }); }
        if (pt >= 3) { toPhase('play'); G.snd('bell'); if (def.start) def.start(run); }
      } else if (phase === 'play') {
        G.leanSrc = run.cs[0].it.src; run.update(dt);
        if (run.done) { finish(); }
        if (input.pressed('pause') && false) { }
      } else if (phase === 'result') {
        pt += dt; resultState.stamp = Math.min(3, pt * 2.2);
        run.cs[0].fig.update(dt); if (run.inst) run.inst.update(dt);
        if (pt > .6 && !resultState.coins) { resultState.coins = 0; }
        if (resultState.coins != null && resultState.coins < Math.ceil(resultState.minutes) && pt > .9 + resultState.coins * .25) { resultState.coins++; G.gerald.drop(); G.snd('clink'); }
        if (pt > 1.2 && !resultState.said) { resultState.said = true; G.caption(resultState.tareLine, 'Tare', 3.5); }
        if (!resultState.pills) { resultState.pills = new G.Pills([{ label: 'Again' }, { label: 'Done' }], { w: 90, x: 'center', y: 168, h: 16, cancel: false }); }
        if (pt > 1.2) { const r = resultState.pills.update(dt, input); if (r && r.pick === 0) { G.snd('ok'); this.again(); } else if (r && r.pick === 1) this.done(); }
      }
      G.gerald.update(dt);
    },
    again() { startRun(); if (def.enter) def.enter(run, data); resultState = null; announced = false; toPhase('count'); count = 3; G.cap = null; },
    leave() { if (data.onBack) data.onBack(); else G.game.go(G.S.started && data.mode === 'story' ? 'island' : 'title'); },
    done() { if (data.onDone) data.onDone(resultState); else G.game.go(data.mode === 'story' ? 'island' : (data.back || 'title')); },
    draw(r) {
      if (!run) return;
      G.game.focus(0, 0, 18);
      run.draw(r);
      const W = r.W, H = r.H;
      if (phase === 'card') this.drawCard(r);
      else if (phase === 'demo') { G.drawCaption(r, 36); r.overlay(g => G.txt(g, 'Watch.', W / 2, 14, C.INK, { align: 'center', scale: 2 })); }
      else if (phase === 'count') { r.overlay(g => { G.bigNum(g, Math.max(1, count), W / 2, 60, 6, C.ACC2); G.txt(g, 'Breathe in', W / 2, 40, C.INK, { align: 'center', scale: 2 }); }); G.drawCaption(r); }
      else if (phase === 'play') { run.hud(r); G.drawCaption(r, 40); }
      else if (phase === 'result') this.drawResult(r);
      const cv = typeof document !== 'undefined' && document.getElementById('screen'), mouse = phase === 'play' && G.leanSrc === 'mouse'; if (cv) cv.style.cursor = mouse ? 'none' : '';
      if (mouse) { const pp = G.game.input.pointer(); if (pp) r.overlay(g => { px.disc(g, pp[0], pp[1], 6, 'rgba(255,255,255,.85)'); px.disc(g, pp[0], pp[1], 4.5, '#f6d2b0'); for (let k = -1; k <= 1; k++) px.disc(g, pp[0] + k * 3, pp[1] - 5, 1.6, '#f6d2b0'); }); }
      if (data.mode === 'attract') r.overlay(g => { G.rr(g, 8, 8, 40, 14, C.ACC); G.txt(g, 'DEMO', 28, 12, '#fff', { align: 'center' }); });
      G.talk && G.talk.draw(r);
    },
    drawCard(r) {
      const W = r.W, H = r.H, th = G.thresholds(def, data.tier);
      r.overlay(g => {
        G.rr(g, W / 2 - 160, 6, 320, 76, 'rgba(32,64,76,.18)'); G.rr(g, W / 2 - 160, 4, 320, 76, C.ACC); G.rr(g, W / 2 - 159, 5, 318, 74, C.WHITE);
        G.txt(g, def.name + (def.tiers.length > 1 ? '  ·  Tier ' + data.tier + (data.tier === 2 && def.tier2Name ? ': ' + def.tier2Name : '') : ''), W / 2, 8, C.ACC2, { align: 'center', scale: 2 });
        G.wrap(def.card, 304).slice(0, 2).forEach((l, i) => G.txt(g, l, W / 2, 26 + i * 9, C.INK, { align: 'center' }));
        G.wrap(how(def), 304).slice(0, 1).forEach((l, i) => G.txt(g, l, W / 2, 46 + i * 9, C.MUTED, { align: 'center' }));
        for (let i = 0; i < 3; i++) { G.drawStars(g, W / 2 - 100 + i * 100, 66, i + 1, 4, i + 1); G.txt(g, Math.round(th[i] * 100) + '%', W / 2 - 100 + i * 100 + 22, 63, C.MUTED, { align: 'left' }); }
        G.txt(g, 'Best', W / 2 + 134, 8, C.MUTED, { align: 'right' }); G.drawStars(g, W / 2 + 148, 12, G.stars(def.id, data.tier), 3);
      });
      pills.o.x = 14; pills.o.y = H - 62; pills.o.w = 100; pills.o.h = 15; pills.draw(r); G.prompt(r, [['confirm', 'Pick'], ['cancel', 'Back']]);
    },
    drawResult(r) {
      const W = r.W, H = r.H, s = resultState, st = Math.floor(s.stamp);
      r.overlay(g => {
        G.rr(g, W / 2 - 110, 22, 220, 130, 'rgba(32,64,76,.18)'); G.rr(g, W / 2 - 110, 20, 220, 130, C.ACC); G.rr(g, W / 2 - 109, 21, 218, 128, C.WHITE);
        G.txt(g, def.name, W / 2, 26, C.ACC2, { align: 'center', scale: 2 });
        for (let i = 0; i < 3; i++) { const on = i < s.stars && st > i, k = Math.max(0, 1 - ((s.stamp - i) * 4)); G.drawStar(g, W / 2 - 40 + i * 40, 62 - k * 18, on ? 15 + k * 8 : 14, on ? C.GOLD : '#cfdde1', on ? '#fff3b0' : null); }
        G.txt(g, Math.round(s.pct * 100) + '%', W / 2, 86, C.INK, { align: 'center', scale: 2 });
        if (s.detail) G.txt(g, s.detail, W / 2, 104, C.MUTED, { align: 'center' });
        G.txt(g, '+' + s.minutes.toFixed(1) + ' minutes' + (s.newBest ? '  ·  new best' : ''), W / 2, 118, C.ACC2, { align: 'center' });
        if (data.mode !== 'free' && G.S.suggestion === def.id && data.mode === 'story') G.txt(g, "Tare's Suggestion: x1.5", W / 2, 130, C.CORAL, { align: 'center' });
        G.gerald.draw(g, W - 52, 104, 1.1, false);
      });
      if (s.pills) s.pills.draw(r); G.drawCaption(r, H - 52); G.prompt(r, [['confirm', 'Pick']]);
    }
  };
}
G.makeScene = makeScene;
G.gerald = new G.Gerald();
})();
