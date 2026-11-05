/* The hunt scene: runs the queue of story, sites, trophies, bonus games and results. Also attract mode. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, txt = BB.txt;
const H = BB.H = { run: null, ctx: null, phase: '', pt: 0, qi: -1, bg: null, cam: null, init: null, chart: 0 };

/* ---------- run setup ---------- */
function buildQueue(mode, o) {
  const q = []; const hunts = mode === 'huntoff' ? BB.HUNT_LIST : [o.hunt];
  if (mode === 'hub') return [{ t: 'hub' }];
  if (mode === 'range') return [{ t: 'site', id: 'range', hunt: 'hollow' }];
  if (mode === 'bonus') { q.push({ t: 'story', key: o.bonus, hunt: BB.BONUS[o.bonus].hunt }); q.push({ t: 'bonus', id: 'bonus_' + o.bonus, hunt: BB.BONUS[o.bonus].hunt }); return q; }
  hunts.forEach((h, hi) => {
    const plan = BB.HUNT_PLAN[h];
    if (mode === 'huntoff' && hi === 0) q.push({ t: 'story', key: 'welcome', hunt: h });
    q.push({ t: 'start', hunt: h });
    q.push({ t: 'story', key: h + '_intro', hunt: h });
    plan.sites.forEach(id => q.push({ t: 'site', id, hunt: h }));
    q.push({ t: 'story', key: plan.trophy, hunt: h }); q.push({ t: 'site', id: plan.trophy, hunt: h });
    q.push({ t: 'story', key: plan.bonus, hunt: h }); q.push({ t: 'bonus', id: 'bonus_' + plan.bonus, hunt: h });
    q.push({ t: 'results', hunt: h });
  });
  if (mode === 'huntoff') q.push({ t: 'ceremony' });
  return q;
}
BB.startRun = (mode, o = {}) => {
  const game = BB.game, ps = [];
  if (mode === 'party') BB.party.forEach((e, i) => ps.push(BB.makePlayer(i, { input: e.type === 'human' ? (i === 0 ? game.input : e.input) : null, bot: e.type === 'bot' ? BB.makeBot(e.skill) : null })));
  else ps.push(BB.makePlayer(0, { input: game.input }));
  BB.records.hunts++; BB.saveRecords();
  BB.pendingRun = { mode, o, players: ps, queue: buildQueue(mode, o), seed: 1000 + BB.records.hunts * 7 };
  game.go('hunt');
};
function nextSeg() {
  const run = H.run; H.qi++; H.cam = null; BB.game.timeScale = 1; BB.fx.banners.length = 0; BB.fx.captions.length = 0;
  if (H.qi >= run.queue.length) return endRun();
  const seg = run.queue[H.qi]; H.seg = seg; H.pt = 0;
  if (seg.t === 'start') { for (const p of run.players) { p.huntScore = 0; p.score = p.score || 0; } H.huntStartIdx = H.qi; H.huntTally = []; return nextSeg(); }
  if (seg.t === 'story') {
    H.phase = 'story'; H.bg = BB.makeBackdrop(BB.HUNT_PLAN[seg.hunt].sites[0], true); BB.music(seg.hunt);
    BB.say(BB.STORY[seg.key], () => nextSeg()); return;
  }
  if (seg.t === 'site' || seg.t === 'bonus') {
    BB.RNG.reseed(run.seed + H.qi);
    H.ctx = BB.curSite = BB.createSite(seg.id, run.players, { seed: run.seed + H.qi, mode: run.mode });
    H.phase = 'card'; H.pt = 0; BB.music(seg.t === 'bonus' ? 'bonus' : H.ctx.def.trophy ? 'trophy' : H.ctx.def.hunt);
    for (const p of run.players) { p.rx = H.ctx.view.W / 2; p.ry = H.ctx.view.H * .55; if (p.bot) { p.bot.rx = p.rx; p.bot.ry = p.ry; } }
    if (run.mode === 'range') { H.ctx.state = 'play'; H.phase = 'play'; }
    return;
  }
  if (seg.t === 'results') return beginResults(seg);
  if (seg.t === 'ceremony') return beginCeremony();
}
H.forceNext = () => nextSeg();
function endRun() { BB.game.go(BB.pendingExit || 'menu'); }
H.restartSite = () => { const run = H.run; if (!run || !H.ctx) return; H.qi--; nextSeg(); };
H.restartHunt = () => { const run = H.run; if (!run) return; H.qi = (H.huntStartIdx || 0) - 1; nextSeg(); };
BB.pauseAction = (what) => {
  const game = BB.game;
  if (what === 'site') { game.resume(); if (H.run) H.restartSite(); }
  else if (what === 'hunt') { game.resume(); if (H.run) H.restartHunt(); }
  else if (what === 'dev') { game.resume(); BB.dev.open = true; BB.dev.page = 0; BB.dev.row = 0; if (BB.devOpened) BB.devOpened(); }
};

/* ---------- site completion bookkeeping ---------- */
function afterSite() {
  const ctx = H.ctx, run = H.run;
  if (ctx.def.bonus) BB.finishBonus(ctx);
  const rec = BB.records;
  for (const r of ctx.results) {
    if (r.p.bot) continue;
    if (!ctx.def.bonus && !ctx.def.trophy && !ctx.def.range) { rec.stars[ctx.id] = Math.max(rec.stars[ctx.id] || 0, r.stars); }
    rec.best[ctx.id] = Math.max(rec.best[ctx.id] || 0, r.total);
  }
  if (ctx.def.trophy && ctx.kills.length) { rec.mounts[ctx.def.trophy] = true; BB.sfx('fanfare'); }
  for (const k of ctx.kills) { const cur = rec.plaques[ctx.hunt.id]; if (!cur || k.pts > cur.pts) rec.plaques[ctx.hunt.id] = { pts: k.pts, metres: k.metres, species: k.species }; }
  BB.saveRecords();
  H.phase = 'tally'; BB.tally.page = 0; H.pt = 0; BB.music('results');
}
BB.hubFinish = null;

/* ---------- results ---------- */
function beginResults(seg) {
  const run = H.run, hunt = BB.HUNTS[seg.hunt], plan = BB.HUNT_PLAN[seg.hunt];
  let par = 0; for (const id of plan.sites) par += BB.SITES[id].par; par += BB.SITES[plan.trophy].par + 1500;
  H.res = { hunt, par, rows: run.players.map(p => ({ p, score: p.huntScore, rank: BB.rankFor(p.huntScore, par) })), rivals: [], initials: null, phase: 'show' };
  run.cum = run.cum || run.players.map(() => 0); run.rivalCum = run.rivalCum || BB.RIVALS.map(() => 0);
  H.res.rows.forEach((r, i) => { run.cum[i] += r.score; });
  H.res.rivals = BB.RIVALS.map((rv, i) => { const sc = Math.round(par * rv.f * (1 + (BB.hash2(i, BB.hashStr(seg.hunt), 3) - .5) * .12)); run.rivalCum[i] += sc; return { name: rv.name, id: rv.id, score: sc }; });
  const best = Math.max(...H.res.rows.map(r => r.score)); const dw = H.res.rivals[0];
  H.res.dwayneBeat = best > dw.score; if (H.res.dwayneBeat && run.mode !== 'party') { H.res.rows[0].p.huntScore += 1000; H.res.rows[0].score += 1000; run.cum[0] += 1000; H.res.bragging = 1000; }
  H.res.entries = H.res.rows.concat(H.res.rivals.map(r => ({ rival: true, name: r.name, score: r.score }))).sort((a, b) => b.score - a.score);
  H.phase = 'results'; H.pt = 0; BB.music('results'); BB.sfx('fanfare');
  const first = H.res.rows[0];
  if (!first.p.bot && run.mode !== 'party' && first.score > 0) { H.res.initials = { letters: [0, 0, 0], at: 0 }; const saved = E.store.get('bbho.initials', 'AAA'); for (let i = 0; i < 3; i++) H.res.initials.letters[i] = Math.max(0, saved.charCodeAt(i) - 65) % 26; }
}
function finishResults() {
  const res = H.res; BB.records.hunts = BB.records.hunts;
  if (res.initials) { const name = res.initials.letters.map(l => String.fromCharCode(65 + l)).join(''); E.store.set('bbho.initials', name); BB.addScore(H.run.mode === 'huntoff' ? 'hunt_' + res.hunt.id : 'hunt_' + res.hunt.id, name, res.rows[0].score); res.initials = null; }
  BB.saveRecords();
  const story = res.dwayneBeat ? 'dwayne_behind' : 'dwayne_ahead';
  H.phase = 'story'; H.bg = BB.makeBackdrop(BB.HUNT_PLAN[res.hunt.id].sites[0], true);
  BB.say(BB.STORY[story], () => nextSeg());
}
function beginCeremony() {
  const run = H.run; const me = run.cum[0] || 0;
  const entries = [{ name: 'YOU', score: me, me: true }].concat(BB.RIVALS.map((r, i) => ({ name: r.name, score: run.rivalCum[i] })));
  entries.sort((a, b) => b.score - a.score);
  const win = entries[0].me; H.cer = { entries, win }; H.phase = 'ceremony'; H.pt = 0; BB.music('results');
  if (win) { BB.records.champion = true; BB.sfx('fanfare'); } else BB.sfx('sad');
  BB.addScore('huntoff', 'YOU', me);
  BB.saveRecords();
  H.cerStory = false;
}

/* ---------- the scene ---------- */
BB.buildHuntScene = (game) => ({
  view: 'overhead', pausable: true,
  enter() {
    const pr = BB.pendingRun; if (!pr) { game.go('menu'); return; }
    H.run = pr; BB.pendingRun = null; H.qi = -1; H.ctx = null; BB.players = pr.players; BB.hubMode = pr.mode === 'hub';
    BB.makeTalk(game); game.timeScale = 1; BB.dev.open = false;
    if (pr.mode === 'hub') { BB.hubBegin(); return; }
    nextSeg();
  },
  exit() { game.timeScale = 1; if (BB.dev.open) BB.dev.open = false; BB.curSite = null; },
  back() { return false; },
  update(dt) {
    const I = game.input, run = H.run; if (!run) return;
    H.pt += dt;
    if (BB.dev.open) { if (BB.devUpdate(I, dt)) return; if (BB.dev.freeze) return; }
    if (run.mode === 'hub') return BB.hubUpdate(dt);
    if (H.phase === 'story') { BB.updateBackdrop(H.bg, dt); BB.talk.update(dt); BB.talkTick(dt); return; }
    const ctx = H.ctx;
    if (H.phase === 'card') {
      BB.updateBackdrop(ctx, 0); ctx.sceneTime += dt; BB.setYaw(ctx, 0); BB.updateView(ctx.view);
      for (const p of run.players) { p.ax = p.rx; p.ay = p.ry; }
      const skip = H.pt > .9 && (I.pressed('confirm') || (I.clicked && I.clicked()));
      if (H.pt > 2.6 || skip) { H.phase = 'play'; ctx.t = 0; ctx.state = 'play'; if (!ctx.def.range) { BB.bark(ctx.def.bonus ? 'start' : 'start'); } BB.sfx('whistle'); BB.resetIdle(); }
      return;
    }
    if (H.phase === 'play') {
      /* trophy cam */
      if (H.cam) { BB.camUpdate(dt); }
      BB.updateSite(ctx, dt);
      if (!ctx.def.bonus && ctx.state === 'ended' || ctx.def.bonus && ctx.state === 'play' && ctx.t >= ctx.timeLimit) {
        if (ctx.def.bonus) { ctx.state = 'ended'; ctx.endReason = 'time'; BB.bark('time'); BB.sfx('whistle'); ctx.endT = 0; }
        else if (ctx.def.range) { }
      }
      if (ctx.def.bonus && ctx.state === 'ended' && !ctx.results) { ctx.endT += dt; if (ctx.endT > .8) afterSite(); }
      else if (!ctx.def.bonus && ctx.state === 'ended') { if (H.cam && H.cam.t < H.cam.dur) { } else afterSite(); }
      if (ctx.def.range && ctx.state === 'ended' && H.pt > 0) { ctx.endT += dt; if (ctx.endT > 3) { game.go('menu'); } }
      return;
    }
    if (H.phase === 'tally') {
      ctx.sceneTime += dt; BB.updateFx(dt);
      const go = H.pt > .6 && (I.pressed('confirm') || (I.clicked && I.clicked()));
      if (go) { if (BB.tally.page === 0 && !ctx.def.bonus && ctx.kills.length) { BB.tally.page = 1; BB.sfx('uiOk'); } else { nextSeg(); } }
      if (I.pressed('cancel') && BB.tally.page === 1) { BB.tally.page = 0; }
      return;
    }
    if (H.phase === 'results') {
      const res = H.res;
      if (res.initials) {
        const ini = res.initials;
        if (I.pressed('up')) { ini.letters[ini.at] = (ini.letters[ini.at] + 1) % 26; BB.sfx('uiMove'); } if (I.pressed('down')) { ini.letters[ini.at] = (ini.letters[ini.at] + 25) % 26; BB.sfx('uiMove'); }
        if (I.pressed('right')) ini.at = Math.min(2, ini.at + 1); if (I.pressed('left')) ini.at = Math.max(0, ini.at - 1);
        if (H.pt > 1 && (I.pressed('confirm') || (I.clicked && I.clicked()))) { if (ini.at < 2) { ini.at++; BB.sfx('uiOk'); } else finishResults(); }
      } else if (H.pt > 1.2 && (I.pressed('confirm') || (I.clicked && I.clicked()))) finishResults();
      return;
    }
    if (H.phase === 'ceremony') {
      if (!H.cerStory && H.pt > 2) { H.cerStory = true; BB.makeTalk(game); BB.say(BB.STORY[H.cer.win ? 'ceremony_win' : 'ceremony_lose'], () => { H.cerDone = true; }); }
      if (H.cerStory) BB.talk.update(dt);
      if (H.cerDone && (I.pressed('confirm') || (I.clicked && I.clicked()))) { H.cerDone = false; BB.pendingExit = 'lodge'; endRun(); BB.pendingExit = null; }
      return;
    }
  },
  draw(r) {
    const run = H.run; if (!run) return;
    r.overlay(g => {
      const W = r.W, Hh = r.H;
      if (run.mode === 'hub') return BB.hubDraw(g, W, Hh);
      if (H.phase === 'story') { BB.renderMain(g, H.bg, H.bg.sceneTime); BB.drawWeather(g, H.bg.view, H.bg.hunt, 1 / 60); px.blend(g, .3, 'normal', () => px.rect(g, 0, 0, W, Hh, '#0c0e1a')); BB.talk.draw(r); return; }
      if (H.phase === 'ceremony') return drawCeremony(g, W, Hh, r);
      const ctx = H.ctx; if (!ctx) return;
      ctx.view.W = W; ctx.view.H = Hh; BB.updateView(ctx.view);
      BB.drawSiteFrame(g, ctx, ctx.sceneTime, { noHud: H.phase === 'card' });
      if (H.cam) BB.camDraw(g, W, Hh);
      if (H.phase === 'card') drawCard(g, ctx, W, Hh);
      if (H.phase === 'results') drawResults(g, W, Hh);
      if (H.phase === 'tally') BB.drawTally(g, ctx, W, Hh);
      if (ctx.def.range && ctx.range) drawRange(g, ctx, W, Hh);
      if (BB.dev.open) BB.devDraw(g, W, Hh);
      if (BB.dev.overlays.fps) txt(g, 'FPS ' + Math.round(game.fps || 0) + ' T ' + ctx.t.toFixed(1), W - 80, Hh - 12, '#9fe08a');
    });
  }
});
function drawCard(g, ctx, W, Hh) {
  const u = Math.min(1, H.pt / .4); px.blend(g, .55 * u, 'normal', () => px.rect(g, 0, 0, W, Hh, '#0a0c16'));
  const def = ctx.def, hunt = ctx.hunt;
  const kind = def.bonus ? 'BONUS GAME' : def.trophy ? 'TROPHY HUNT' : def.range ? 'PRACTICE' : 'SITE ' + (BB.HUNT_PLAN[def.hunt].sites.indexOf(def.id) + 1) + ' OF 3';
  txt(g, hunt.name.toUpperCase() + ' • ' + kind, W / 2 - BB.tw(hunt.name.toUpperCase() + ' • ' + kind) / 2, Hh / 2 - 40, hunt.hudColor);
  E.font.title(g, def.name.toUpperCase(), W / 2, Hh / 2 - 26, { scale: 2, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' });
  const lines = E.font.wrap(def.desc || BB.BONUS[def.bonus] && BB.BONUS[def.bonus].desc || '', W - 120); lines.forEach((l, i) => txt(g, l, W / 2 - BB.tw(l) / 2, Hh / 2 + 2 + i * 11, '#e8e4ff'));
  if (!def.bonus && !def.trophy && !def.range) { const n = def.spawns.filter(s => s.k === 'buck').length; const m = n + (n === 1 ? ' BUCK' : ' BUCKS') + ' • ' + def.time + ' SECONDS • BUCKS ONLY'; txt(g, m, W / 2 - BB.tw(m) / 2, Hh / 2 + 34, '#ffd36a'); }
  BB.prompts(g, [['confirm', 'START']], W / 2, Hh - 24, 'center');
}
function drawResults(g, W, Hh) {
  const res = H.res; px.rect(g, 0, 0, W, Hh, '#0c0f1e');
  E.font.title(g, res.hunt.name.toUpperCase() + ' RESULTS', W / 2, 8, { scale: 2, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' });
  const rows = res.entries; rows.forEach((e, i) => {
    const y = 36 + i * 22, name = e.rival ? e.name : (res.rows.length > 1 ? 'P' + (e.p.idx + 1) + ' ' + BB.COLOR_NAMES[e.p.idx] : 'YOU');
    E.ui.box(g, 60, y, W - 120, 19, { bg: e.rival ? ['#1a2036', '#10131f'] : ['#3a2c14', '#241a0c'], border: e.rival ? '#3a4264' : (e.p.color), alpha: .95 });
    txt(g, (i + 1) + '.', 68, y + 6, '#ffd36a'); txt(g, name, 86, y + 6, e.rival ? '#c8c8dc' : '#fff'); txt(g, BB.fmt(e.score), W - 68 - BB.tw(BB.fmt(e.score)), y + 6, '#ffe27a');
    if (!e.rival) txt(g, e.rank, 190, y + 6, '#9fe08a');
  });
  const y2 = 36 + rows.length * 22 + 6;
  txt(g, 'PAR ' + BB.fmt(res.par), 60, y2, '#8a90b0');
  if (res.dwayneBeat) txt(g, res.bragging ? 'BEAT COUSIN DWAYNE! +1000 BRAGGING RIGHTS' : 'BEAT COUSIN DWAYNE!', W / 2 - 100, y2 + 12, '#9fe08a'); else txt(g, 'COUSIN DWAYNE IS STILL AHEAD', W / 2 - 80, y2 + 12, '#ff9a6a');
  if (res.initials) {
    const x0 = W / 2 - 30, y0 = Hh - 66; txt(g, 'ENTER YOUR INITIALS', W / 2 - BB.tw('ENTER YOUR INITIALS') / 2, y0 - 14, '#fff');
    res.initials.letters.forEach((l, i) => { const x = x0 + i * 22; E.ui.box(g, x, y0, 18, 22, { bg: ['#1b2240', '#10152a'], border: i === res.initials.at ? '#ffd36a' : '#3a4264', alpha: 1 }); txt(g, String.fromCharCode(65 + l), x + 6, y0 + 7, '#fff', { scale: 1 }); if (i === res.initials.at) { txt(g, '↑', x + 6, y0 - 8, '#ffd36a'); txt(g, '↓', x + 6, y0 + 24, '#ffd36a'); } });
    BB.prompts(g, [['aim', 'LETTER'], ['confirm', 'OK']], W / 2, Hh - 20, 'center');
  } else BB.prompts(g, [['confirm', 'CONTINUE']], W / 2, Hh - 20, 'center');
}
function drawCeremony(g, W, Hh, r) {
  px.rect(g, 0, 0, W, Hh, '#1a1208'); for (let i = 0; i < 40; i++) px.dot(g, (i * 97) % W, (i * 53 + H.pt * 20) % Hh, '#ffd36a');
  E.font.title(g, H.cer.win ? 'HUNT-OFF CHAMPION' : 'FINAL STANDINGS', W / 2, 10, { scale: 2, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' });
  H.cer.entries.forEach((e, i) => { const y = 44 + i * 26; E.ui.box(g, 100, y, W - 200, 22, { bg: e.me ? ['#4a3a18', '#2c2210'] : ['#1a2036', '#10131f'], border: e.me ? '#ffd36a' : '#3a4264', alpha: 1 }); txt(g, (i + 1) + '. ' + e.name, 110, y + 8, e.me ? '#ffe27a' : '#c8c8dc'); txt(g, BB.fmt(e.score), W - 110 - BB.tw(BB.fmt(e.score)), y + 8, '#fff'); });
  if (H.cerStory) BB.talk.draw(r);
  if (H.cerDone) BB.prompts(g, [['confirm', 'TO THE LODGE']], W / 2, Hh - 20, 'center');
}
function drawRange(g, ctx, W, Hh) {
  const R = ctx.range; if (!R.stations) return;
  E.ui.box(g, W / 2 - 110, Hh - 56, 220, 22, { bg: ['#1d2236', '#101426'], border: '#9fd18a', alpha: .85 });
  txt(g, 'STATION ' + (R.station + 1) + ' OF ' + R.stations.length, W / 2 - 104, Hh - 52, '#9fd18a');
  if (R.prompts) BB.prompts(g, R.prompts, W / 2, Hh - 40, 'center');
}

/* ---------- trophy cam ---------- */
BB.bus.on('kill', ev => {
  if (!H.ctx || !(ev.a.trophyMult > 1) || H.cam) return;
  H.cam = { t: 0, dur: 2.4, a: ev.a, x0: 0 };
});
BB.camUpdate = (dt) => {
  const c = H.cam, ctx = H.ctx; c.t += dt / Math.max(.05, BB.game.timeScale);
  BB.game.timeScale = c.t < c.dur - .3 ? .25 : 1;
  const v = ctx.view, a = c.a, u = clamp(c.t / .8, 0, 1), mag = 1 + 1.4 * E.ease.outCubic(u);
  v.mag = 1; BB.updateView(v);
  const pr = BB.project(v, a.x, a.y, a.z + .8);
  if (pr) { v.mag = mag; v.offX = -(pr[0] - v.W / 2) * (mag - 1) - (pr[0] - v.W / 2) * 0; v.offY = -(pr[1] - v.hy) * (mag - 1) + (v.H * .5 - pr[1]) * 0; }
  BB.updateView(v);
  if (c.t >= c.dur) { H.cam = null; BB.game.timeScale = 1; v.mag = 1; v.offX = 0; v.offY = 0; BB.updateView(v); }
};
BB.camDraw = (g, W, Hh) => {
  const c = H.cam; px.blend(g, .5, 'multiply', () => { px.rect(g, 0, 0, W, 24, '#000'); px.rect(g, 0, Hh - 24, W, 24, '#000'); });
  txt(g, 'TROPHY CAM', 10, 8, '#ffe27a'); txt(g, c.a.pts + ' POINTS', W - 10 - BB.tw(c.a.pts + ' POINTS'), 8, '#fff');
};

/* ---------- attract mode ---------- */
BB.buildAttractScene = (game) => {
  const A = { i: 0, t: 0, ctx: null, phase: 'play', playlist: [
    { type: 'site', id: 'hollow1', dur: 33, tally: 7 }, { type: 'site', id: 'bugle2', dur: 24, tally: 6 }, { type: 'bonus', id: 'bonus_saucers', dur: 15, tally: 4 },
    { type: 'site', id: 'bigmo', dur: 20, tally: 0 }, { type: 'table', dur: 7 }, { type: 'lodge', dur: 6 }, { type: 'title', dur: 5 }
  ] };
  BB.attract = A;
  const begin = () => {
    const it = A.playlist[A.i % A.playlist.length]; A.t = 0; A.it = it; A.phase = 'play'; A.guard = A.guard || 0;
    if (it.type === 'site' || it.type === 'bonus') {
      BB.RNG.reseed(777 + A.i);
      const bot = BB.makeBot('expert', true), p = BB.makePlayer(0, { bot }); p.bot.auto = true; const players = [p]; BB.players = players;
      A.ctx = BB.curSite = BB.createSite(it.id, players, { seed: 777 + A.i, mode: 'attract' }); A.ctx.state = 'play';
      p.rx = bot.rx = A.ctx.view.W / 2; p.ry = bot.ry = A.ctx.view.H * .55;
      BB.music(it.type === 'bonus' ? 'bonus' : A.ctx.def.trophy ? 'trophy' : A.ctx.def.hunt);
    } else if (it.type === 'table') { A.ctx = null; BB.music('results'); BB.bg = BB.makeBackdrop('hollow1'); }
    else if (it.type === 'lodge') { A.ctx = null; BB.music('lodge'); }
    else { A.ctx = null; BB.music('title'); BB.bg = BB.makeBackdrop('hollow1'); }
  };
  return {
    view: 'overhead', pausable: false,
    enter() { A.i = 0; A.guard = .5; BB.makeTalk(game); begin(); },
    update(dt) {
      A.guard -= dt; if (A.guard < 0 && BB.anyInput()) { BB.resetIdle(); game.go('title'); return; }
      A.t += dt; const it = A.it, ctx = A.ctx;
      if (ctx) {
        if (A.phase === 'play') {
          if (it.id === 'bigmo') BB.players[0].calls = 9;
          BB.updateSite(ctx, dt);
          if (ctx.state === 'ended' || A.t > it.dur) {
            if (ctx.state !== 'ended') { ctx.t = ctx.timeLimit; ctx.state = 'endwait'; ctx.endT = 2; }
            if (ctx.state === 'endwait' && ctx.endT >= 1.6 || ctx.state === 'ended') { if (ctx.state !== 'ended') { ctx.state = 'ended'; if (it.type === 'bonus') BB.finishBonus(ctx); else BB.finishSite(ctx); } else if (!ctx.results) { if (it.type === 'bonus') BB.finishBonus(ctx); else BB.finishSite(ctx); } if (!ctx.results) { if (it.type === 'bonus') BB.finishBonus(ctx); else BB.finishSite(ctx); } if (it.tally > 0) { A.phase = 'tally'; A.t = 0; BB.tally.page = 0; } else { A.i++; begin(); } }
          }
        } else if (A.phase === 'tally') { ctx.sceneTime += dt; BB.updateFx(dt); if (A.t > it.tally / 2 && BB.tally.page === 0 && ctx.kills.length) BB.tally.page = 1; if (A.t > it.tally) { A.i++; begin(); } }
      } else { if (BB.bg) BB.updateBackdrop(BB.bg, dt); if (A.t > it.dur) { A.i++; begin(); } }
    },
    draw(r) {
      r.overlay(g => {
        const W = r.W, Hh = r.H, it = A.it, ctx = A.ctx;
        if (ctx) { ctx.view.W = W; ctx.view.H = Hh; BB.updateView(ctx.view); BB.drawSiteFrame(g, ctx, ctx.sceneTime, { noPrompts: true }); if (A.phase === 'tally') BB.drawTally(g, ctx, W, Hh); }
        else if (it.type === 'lodge') { game.scene && 0; drawLodgeLite(g, W, Hh); }
        else { BB.renderMain(g, BB.bg, BB.bg.sceneTime); px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, Hh, '#0c0e1a')); if (it.type === 'table') drawTable(g, W, Hh); else { E.font.title(g, 'BIG BUCK', W / 2, 60, { scale: 4, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' }); E.font.title(g, 'HUNT-OFF', W / 2, 104, { scale: 4, colors: ['#ff8a5a', '#c0392b'], outline: '#2a0a08', align: 'center' }); } }
        const blink = Math.floor(game.time * 2) % 2 === 0; E.ui.box(g, W - 112, 4, 46, 14, { bg: ['#6a1a1a', '#3a0f0f'], border: '#ff7a6a', alpha: .9 }); txt(g, 'DEMO', W - 101, 8, '#ffb0a0');
        if (blink) { const m = 'PRESS ANY BUTTON'; txt(g, m, W / 2 - BB.tw(m) / 2, Hh - 14, '#ffffff'); }
      });
    }
  };
};
function drawTable(g, W, Hh) {
  E.font.title(g, 'HIGH SCORES', W / 2, 20, { scale: 3, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' });
  const rows = []; for (const k of Object.keys(BB.records.tables)) for (const e of BB.records.tables[k]) rows.push(e); rows.sort((a, b) => b.score - a.score);
  const base = [{ name: 'DUB', score: 12500 }, { name: 'MAE', score: 9800 }, { name: 'LOR', score: 8400 }, { name: 'EAR', score: 5200 }, { name: 'DWY', score: 1200 }];
  const all = rows.concat(base).sort((a, b) => b.score - a.score).slice(0, 8);
  all.forEach((e, i) => { const y = 66 + i * 16; txt(g, (i + 1) + '.', W / 2 - 90, y, '#ffd36a'); txt(g, e.name, W / 2 - 66, y, '#fff'); txt(g, BB.fmt(e.score), W / 2 + 90 - BB.tw(BB.fmt(e.score)), y, '#ffe27a'); });
}
function drawLodgeLite(g, W, Hh) {
  px.rect(g, 0, 0, W, Hh, '#3a2616'); for (let y = 0; y < Hh; y += 14) px.rect(g, 0, y, W, 1, '#2c1c10');
  E.font.title(g, 'THE LODGE', W / 2, 10, { scale: 3, colors: ['#ffe27a', '#d9822a'], outline: '#1a0e06', align: 'center' });
  [['whitetail', 14, 30], ['elk', 14, 22], ['moose', 72, 17]].forEach((m, i) => { const x = 80 + i * ((W - 160) / 2); E.ui.box(g, x - 56, 50, 112, 100, { bg: ['#2a1c10', '#1c1209'], border: '#ffd36a', alpha: 1 }); BB.drawAnimal(g, { species: m[0], sex: 'male', age: 'adult', pts: m[1], face: 1, phase: 0, gait: 'stand', pose: 'alert', mode: 'stand' }, x, 128, 46 / BB.SPECIES[m[0]].size, null, { scale: BB.SPECIES[m[0]].size }); });
}
})();
