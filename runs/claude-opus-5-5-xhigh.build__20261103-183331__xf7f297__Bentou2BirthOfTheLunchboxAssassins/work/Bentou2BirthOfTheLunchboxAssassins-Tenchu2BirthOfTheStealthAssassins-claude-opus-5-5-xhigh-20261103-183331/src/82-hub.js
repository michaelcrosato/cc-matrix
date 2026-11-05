/* ---- MULTIPLAYER: AI Hub Session Protocol v1, ghost mode, 1-4 players. Each player runs "Night Delivery" in their own
 * copy; the others appear as translucent shadow ninja in their seat colours and never touch the world. The game shows
 * its own card, starts on the hub's clock, sends its ninja 10 times a second, reports progress every second and its
 * result once. The SHADOW TRIAL is the same round alone, racing your own best run's ghost (white) ---- */
const Hub = { phase: 'off', info: null, card: null, ghosts: {}, sendT: 0, progT: 0, track: [], trackT: 0, resulted: false, ended: false, standings: null, locked: false, M: null };
const SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const ROUND_RANK = [[4000, 'Grand Kaiseki'], [3200, 'Makunouchi'], [2400, 'Ekiben'], [1500, 'Hinomaru'], [-1e9, 'Leftovers']];
Hub.rankOf = sc => ROUND_RANK.find(r => sc >= r[0])[1];
const AH = () => (typeof window !== 'undefined' ? window.AIHub : null);
/** the hero's state code for a ghost: 0 run, 1 crouch, 2 swim, 3 dive, 4 attack, 5 cut, 6 dead, 7 done */
Hub.code = (h, M) => M.ended ? 7 : h.dead ? 6 : h.action && /^cut_/.test(h.action.name) ? 5 : h.combo.busy ? 4 : h.dive ? 3 : h.swim ? 2 : h.crouch ? 1 : 0;
/** start a session: our own card first; null from connect() means no hub after all: the normal title */
Hub.boot = () => {
  const A = AH(); Hub.phase = 'card'; game.go('hubCard', {}, { fade: 0 });
  let p; try { p = A.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { Hub.fallback(); return; }
  Promise.resolve(p).then(info => {
    if (!info) { Hub.fallback(); return; }
    Hub.info = info;
    A.on('card', c => { Hub.card = c; });
    A.on('start', () => { Hub.phase = 'countdown'; Hub.enterRound(); });
    A.on('message', (d, from) => Hub.onMessage(d, from));
    A.on('leave', e => { delete Hub.ghosts[e.id]; Hub.labels(); });
    A.on('time-up', () => Hub.report(true));
    A.on('end', e => Hub.end(e));
    const ch = (info.me % 2) ? 'kaede' : 'sojiro';
    Hub.M = Mission.create('delivery', { mode: 'hub', char: ch, missionId: 'delivery', loadout: Bento.fromHint(B.get('mission', 'delivery').loadoutHint, Save.fresh()) });
    Hub.M.startLoadout = Bento.copy(Hub.M.hero.bento);
    for (const pl of info.players || []) if (pl.id !== info.me) Hub.ghosts[pl.id] = Hub.ghost(pl);
    Hub.cardRigs = (info.players || []).map(pl => { const r = Rigs.make(pl.id % 2 ? 'kaede' : 'sojiro'); r.C.cape = SEAT[pl.id % 4]; r.C.belt = SEAT[pl.id % 4]; return r; });
    A.ready();
  }, () => Hub.fallback());
};
Hub.fallback = () => { Hub.phase = 'off'; if (game.o.menu) game.o.menu.quit = 'title'; game.go('title', {}, { fade: 'dissolve' }); };
Hub.ghost = pl => { const rig = Rigs.make(pl.id % 2 ? 'kaede' : 'sojiro'); rig.C.cape = SEAT[pl.id % 4]; rig.C.belt = SEAT[pl.id % 4]; return { id: pl.id, name: pl.name, color: SEAT[pl.id % 4], rig, x: null, y: 0, z: 0, f: 0, s: 0, k: 0, tx: 0, ty: 0, tz: 0, a: 'delivery', done: false }; };
Hub.enterRound = () => { if (Hub.inRound) return; Hub.inRound = true; Hub.M.locked = true; game.go('mission', { M: Hub.M, mode: 'hub' }, { fade: 0 }); Hub.labels(); };
Hub.onMessage = (d, from) => {
  if (!d || Hub.ended) return; let gh = Hub.ghosts[from];
  if (!gh) { const pl = ((Hub.info && Hub.info.players) || []).find(p => p.id === from) || { id: from, name: 'P' + (from + 1) }; gh = Hub.ghosts[from] = Hub.ghost(pl); Hub.labels(); }
  if (d.t === 'g') { if (gh.x === null) { gh.x = d.x; gh.y = d.y; gh.z = d.z; } gh.tx = d.x; gh.ty = d.y; gh.tz = d.z; gh.f = d.f; gh.s = d.s; gh.k = d.k; gh.a = d.a; }
  if (d.t === 'done') { gh.done = true; gh.score = d.score; }
};
/** each step of the hub round or the trial: the clock, the countdown, ghosts, sends and progress */
Hub.step = (dt, M) => {
  // the trial's own ghost and its recording (10 Hz)
  if (M.mode === 'trial') {
    Hub.trackT -= dt; if (Hub.trackT <= 0 && !M.ended) { Hub.trackT = .1; const h = M.hero; Hub.track.push([Math.round(h.x), Math.round(h.y), Math.round(h.z), +h.facing.toFixed(2), Hub.code(h, M)]); }
    const g = Hub.trialGhost; if (g && g.track.length) { const i = Math.min(g.track.length - 1, Math.floor(M.stats.time * 10)); const [x, y, z, f, s] = g.track[i]; Object.assign(g, { tx: x, ty: y, tz: z, f, s }); if (g.x === null) { g.x = x; g.y = y; g.z = z; } }
  }
  for (const id in Hub.ghosts) { const g = Hub.ghosts[id]; if (g.x === null) continue; const k = 1 - Math.pow(.002, dt); g.x += (g.tx - g.x) * k; g.y += (g.ty - g.y) * k; g.z += (g.tz - g.z) * k; g.rig.blink = 9; g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.f, vx: (g.tx - g.x) * 4, vy: (g.ty - g.y) * 4, crouch: g.s === 1, down: g.s === 2 ? .35 : g.s === 3 ? .55 : g.s === 6 ? 1 : 0, attack: g.s === 4 || g.s === 5 ? E.move('slash', (game.real * 3) % 1) : null }); }
  if (Hub.trialGhost && Hub.trialGhost.x !== null) { const g = Hub.trialGhost, k = 1 - Math.pow(.002, dt); g.x += (g.tx - g.x) * k; g.y += (g.ty - g.y) * k; g.z += (g.tz - g.z) * k; g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.f, crouch: g.s === 1, down: g.s === 2 ? .35 : g.s === 3 ? .55 : 0 }); }
  if (M.mode !== 'hub') return;
  const A = AH(); if (!A || Hub.ended) return;
  const t = A.time();
  if (t < 0) { M.locked = true; return; }
  if (M.locked) { M.locked = false; Hub.phase = 'play'; M.stats.time = 0; }
  M.stats.time = t / 1000;
  Hub.sendT -= dt; if (Hub.sendT <= 0 && !Hub.resulted) { Hub.sendT = .1; const h = M.hero; A.send({ t: 'g', a: 'delivery', x: Math.round(h.x), y: Math.round(h.y), z: Math.round(h.z), f: +h.facing.toFixed(2), s: Hub.code(h, M), k: M.stats.silentCuts + M.stats.kills }, { reliable: false }); }
  Hub.progT -= dt; if (Hub.progT <= 0 && !Hub.resulted) { Hub.progT = 1; A.progress({ score: Score.round(M, {}), label: Hub.label(M) }); }
};
Hub.label = M => { const tg = Mission.find(M, 'sakubei'); if (M.ended && M.result === 'win') return 'Escaped ' + fmtTime(M.stats.time); if (tg && !tg.alive) return 'Target down'; return 'Cuts ' + M.stats.silentCuts + (M.stats.detections ? ' · Seen ' + M.stats.detections : ' · Unseen'); };
Hub.awards = M => { const s = M.stats, out = []; if (s.detections === 0) out.push({ title: 'Ghost of the Moon', detail: 'Never detected' }); if (s.silentCuts >= 5) out.push({ title: 'Silent Blade', detail: s.silentCuts + ' Silent Cuts' }); if (s.kills === 0 && s.silentCuts <= 1) out.push({ title: 'Fed by All', detail: 'No kills but the target' }); return out.slice(0, 3); };
Hub.stats = (M, sc) => ({ 'Silent cuts': M.stats.silentCuts, 'Detected': M.stats.detections, 'Time': fmtTime(M.stats.time), 'Rank': Hub.rankOf(sc) });
/** report the round once: on escape, on death, or at once on time-up */
Hub.report = (timeUp) => {
  const A = AH(), M = Hub.M; if (!A || !M || Hub.resulted) return;
  Hub.resulted = true; const escaped = M.ended && M.result === 'win', sc = Score.round(M, { escaped });
  try { A.send({ t: 'done', score: sc }, { reliable: true }); } catch (e) { /* the round may be over */ }
  A.result({ score: sc, stats: Hub.stats(M, sc), awards: Hub.awards(M) });
  Hub.finalScore = sc; if (timeUp) B.Hud.toast('Time!', 'Score ' + sc);
};
Hub.died = M => { if (M.mode === 'hub') { M.ended = true; M.result = 'dead'; Hub.report(false); B.Hud.toast('Fallen', 'Your round is over.'); } };
B.on('missionEnd', e => { if (e.M && e.M.mode === 'hub') { Hub.report(false); e.M.onEnd = () => {}; } });
Hub.end = e => {
  Hub.ended = true; Hub.locked = true; Hub.standings = e && e.standings; Hub.reason = e && e.reason; Hub.phase = 'end';
  if (B.M) B.M.locked = true; Au.stopMusic(.2); Au.mute(true); game.input.clear();
  Hub.labels();
};
/** names as DOM text (never HTML): over the card, the ghosts, and the round-over standings */
Hub.labels = () => {
  if (!hasDOM) return;
  let box = document.getElementById('hub-names'); if (!box) { box = document.createElement('div'); box.id = 'hub-names'; box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30;font:600 14px system-ui,sans-serif'; document.body.appendChild(box); }
  box.replaceChildren();
  Hub.nameEls = {};
  const add = (id, txt, col) => { const s = document.createElement('div'); s.textContent = txt; s.style.cssText = 'position:absolute;transform:translate(-50%,-100%);padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.55);color:' + col + ';white-space:nowrap'; box.appendChild(s); Hub.nameEls[id] = s; return s; };
  const pls = (Hub.info && Hub.info.players) || [];
  if (Hub.phase === 'card') for (const p of pls) add('c' + p.id, p.name + (Hub.card && Hub.card.ready && Hub.card.ready.includes(p.id) ? '  ✓' : ''), SEAT[p.id % 4]);
  else if (Hub.phase === 'end') {
    const panel = document.createElement('div'); panel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(20,12,12,.92);border:1px solid #e8b04a;padding:18px 28px;border-radius:8px;color:#f4ead5;text-align:center;min-width:240px';
    const h = document.createElement('div'); h.textContent = 'Round over'; h.style.cssText = 'font:600 26px Georgia,serif;color:#e8b04a;margin-bottom:10px'; panel.appendChild(h);
    const order = (Hub.standings || []).flat(); (order.length ? order : pls.map(p => p.id)).forEach((id, i) => { const p = pls.find(q => q.id === id); if (!p) return; const r = document.createElement('div'); r.textContent = (i + 1) + '. ' + p.name; r.style.color = SEAT[p.id % 4]; panel.appendChild(r); });
    box.appendChild(panel);
  } else for (const id in Hub.ghosts) add(id, Hub.ghosts[id].name, Hub.ghosts[id].color);
};
/** draw the ghosts (translucent, an afterimage, their colour) and keep their name labels over them */
Hub.drawGhosts = (r, M) => {
  const list = Object.values(Hub.ghosts).filter(g => g.x !== null && g.a === 'delivery');
  if (Hub.trialGhost && Hub.trialGhost.x !== null) list.push(Hub.trialGhost);
  for (const g of list) r.actor(g.x, g.y, g.z - (g.s === 2 ? 9 : g.s === 3 ? 15 : 0), (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { alpha: .45, flash: g.color, flashMix: .35, ghost: { color: g.color, life: .25, alpha: .25, owner: g }, outline: false });
  if (!hasDOM || !Hub.nameEls || Hub.phase === 'end') return;
  const cv = document.getElementById('screen'), rc = cv && cv.getBoundingClientRect(); if (!rc) return;
  for (const id in Hub.nameEls) { const g = Hub.ghosts[id], el = Hub.nameEls[id]; if (!g || g.x === null) { el.style.display = 'none'; continue; } const p = r.w(g.x, g.y, g.z + 46); el.style.display = ''; el.style.left = (rc.left + p[0] / r.W * rc.width) + 'px'; el.style.top = (rc.top + p[1] / r.H * rc.height) + 'px'; }
};
/* ---- THE HUB CARD (the game's own): a rooftop at night, the players lined up in their colours, ready ticks, the goal,
 * this player's controls, the countdown. Enter / cross: Ready. Triangle / M: more time (again: take it back) ---- */
const hubCardScene = Object.assign({}, MENU_SCENE, {
  enter() { this.asked = false; B.Music.play('title'); },
  update(dt) {
    const A = AH(), I = game.input; if (!A || Hub.phase !== 'card') return;
    if (I.pressed('confirm') || I.pressed('start')) A.answer('ready');
    if (I.pressed('interact') || I.held.has('KeyM') && I.pressed('objectives')) A.answer('more');
    const c = I.clicked(); if (c && this.btns) { for (const b of this.btns) if (c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h) A.answer(b.a); }
    if (this.lastReady !== JSON.stringify(Hub.card && Hub.card.ready)) { this.lastReady = JSON.stringify(Hub.card && Hub.card.ready); Hub.labels(); }
    (Hub.cardRigs || []).forEach((rg, i) => { rg.blink = 9; rg.update(dt, { x: TMID - 45 + i * 30, y: 0, z: 32, facing: Math.PI / 2, vx: 0, vy: 0, stance: Hub.card && Hub.card.ready && Hub.card.ready.includes(i) ? 'ready' : null }); });
    game.focus(TMID, 0, 32 + (game.H / 2 - 40) / -game.view.bz);
  },
  draw(r) {
    TITLE_BG.draw(r); RIDGE.draw(r);
    (Hub.cardRigs || []).forEach((rg, i) => r.actor(TMID - 45 + i * 30, 0, 32, (g, ox, oy) => rg.draw(g, ox, oy, r.view)));
    r.overlay(g => {
      const W = r.W, c = Hub.card || {};
      E.font.title(g, 'BENTOU 2', W / 2, 10, { align: 'center', scale: 3, colors: ['#fff4c8', '#e8b04a', '#d8402a'], depth: 2 });
      E.font.text(g, 'Night Delivery  ·  ghost round', W / 2, 38, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silence the rice broker and escape by the canal gate.', W / 2, 52, '#e8dcc0', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silent Cuts, unseen, fast: the best ninja score wins.', W / 2, 62, '#e8dcc0', { align: 'center', outline: false, shadow: '#000' });
      Glyph.text(g, 'Move {a:up}{a:left}{a:down}{a:right}  Strike {a:attack}  Jump {a:jump}  Crouch {a:crouch}  Hook {a:grapple}  Tool {a:useTool}', W / 2, 76, '#b8b0d8', { align: 'center' });
      const st = c.paused ? 'Paused: more time asked' : c.starting ? 'Starting…' : c.left !== null && c.left !== undefined ? 'Starting in ' + Math.ceil(c.left / 1000) + ' s' : 'Waiting for the hub…';
      E.font.text(g, st, W / 2, r.H - 46, '#ffd36a', { align: 'center', outline: false, shadow: '#000' });
      const bw = 96, y = r.H - 32; this.btns = [{ a: 'ready', x: W / 2 - bw - 6, y, w: bw, h: 16 }, { a: 'more', x: W / 2 + 6, y, w: bw, h: 16 }];
      px.rect(g, this.btns[0].x, y, bw, 16, '#e8b04a'); Glyph.text(g, '{a:confirm} Ready', this.btns[0].x + bw / 2, y + 4, '#1a1418', { align: 'center', shadow: false });
      px.rect(g, this.btns[1].x, y, bw, 16, c.asked ? '#8a1c1c' : '#3a2a20'); E.font.text(g, (Glyph.device() === 'pad' ? '' : 'M  ') + 'More time', this.btns[1].x + bw / 2 + (Glyph.device() === 'pad' ? 6 : 0), y + 4, '#f4ead5', { align: 'center', outline: false }); if (Glyph.device() === 'pad') Glyph.draw(g, 'interact', this.btns[1].x + 8, y + 3);
    });
    if (hasDOM && Hub.nameEls) { const cv = document.getElementById('screen'), rc = cv && cv.getBoundingClientRect(); if (rc) ((Hub.info && Hub.info.players) || []).forEach((p, i) => { const el = Hub.nameEls['c' + p.id]; if (!el) return; el.style.left = (rc.left + rc.width / 2) + 'px'; el.style.top = (rc.top + rc.height * .36 + i * 28) + 'px'; }); }   // the players listed under the goal, one a line
  }
});
/** the countdown over the round's first frames: 3, 2, 1 in big brush digits */
Hub.drawCountdown = r => {
  const A = AH(); if (!A || Hub.phase === 'end') return; const t = A.time(); if (!(t < 0) || t === -Infinity) return;
  const n = Math.ceil(-t / 1000); r.overlay(g => E.font.title(g, String(Math.min(3, n)), r.W / 2, Math.round(r.H * .32), { align: 'center', scale: 5, colors: ['#ffffff', '#ffd36a', '#d8402a'], depth: 3 }));
};
/* ---- THE SHADOW TRIAL on its own: your best run's ghost in white, the local top five ---- */
Hub.trialStart = M => {
  Hub.track = []; Hub.trackT = 0; const best = Save.trial().ghost;
  if (best && best.track && best.track.length) { const rig = Rigs.make(best.char === 'kaede' ? 'kaede' : 'sojiro'); Hub.trialGhost = { id: 'best', name: 'Best', color: '#ffffff', rig, x: null, y: 0, z: 0, f: 0, s: 0, a: 'delivery', track: best.track }; }
  else Hub.trialGhost = null;
  M.onEnd = () => Hub.trialEnd(M, true); M.onFail = () => Hub.trialEnd(M, false);
};
Hub.trialEnd = (M, escaped) => {
  if (M.trialDone) return; M.trialDone = true;
  const sc = Score.round(M, { escaped }), entry = { score: sc, rank: Hub.rankOf(sc), char: M.char, date: new Date().toISOString().slice(0, 10), time: fmtTime(M.stats.time), escaped };
  const place = Save.trialAdd(entry, escaped ? Hub.track.slice() : null);
  game.go('trialResults', { M, entry, place }, { fade: 'dissolve' });
};
B.on('missionStart', e => { if (e.M.mode === 'trial') Hub.trialStart(e.M); });
const trialResultsScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.t = 0; B.Music.play('results'); this.menu = new E.Menu(game, ['Try again', 'Title'], { box: false, onPick: i => { if (i === 0) Flow.bento('delivery', d.M.char, 'trial'); else game.go('title', { menu: true }); } }); },
  update(dt) { B.pollInput(); this.t += dt; if (this.t > 1) this.menu.update(dt); },
  draw(r) {
    paper(r); const d = this.d, b = Save.trial().board;
    r.overlay(g => {
      const W = r.W;
      E.font.title(g, d.entry.escaped ? 'DELIVERED' : 'THE NIGHT TAKES YOU', W / 2, 12, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      E.font.title(g, String(d.entry.score), W / 2, 36, { align: 'center', scale: 3, colors: ['#fff4c8', '#ffd36a', '#d8402a'], depth: 2 });
      E.font.text(g, d.entry.rank + '  ·  ' + d.entry.time + '  ·  Silent Cuts ' + d.M.stats.silentCuts + '  ·  Detected ' + d.M.stats.detections, W / 2, 64, '#f4ead5', { align: 'center', outline: false });
      if (d.place) E.font.text(g, d.place === 1 ? 'A new best! Your ghost will race you next time.' : 'Place ' + d.place + ' on the board.', W / 2, 76, '#ffd36a', { align: 'center', outline: false });
      E.font.text(g, 'THE BOARD', W / 2, 92, '#e8b04a', { align: 'center', outline: false });
      b.forEach((e, i) => E.font.text(g, (i + 1) + '.  ' + e.score + '   ' + e.rank + '   ' + (B.CHARS[e.char] || B.CHARS.sojiro).name + '   ' + e.date, W / 2, 104 + i * 11, i === d.place - 1 ? '#ffd36a' : '#f4ead5', { align: 'center', outline: false }));
    });
    this.menu.y = r.H - 34; this.menu.draw(r);
  }
});
B.Hub = Hub; B.hubScenes = { hubCard: hubCardScene, trialResults: trialResultsScene };
