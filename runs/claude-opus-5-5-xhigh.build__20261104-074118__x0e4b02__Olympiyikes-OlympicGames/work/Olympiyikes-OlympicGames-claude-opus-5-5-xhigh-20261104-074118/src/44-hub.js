// AI Hub sessions ("Hub Heats", ghost mode): our own card, three events dealt from AIHub.rng, each in a fixed slot on
// the hub's clock (GET READY, the heat, a results splash), the other players as ghosts, progress, one result,
// time-up and the end. Outside a session nothing here runs (O.Hub.offline() fakes a hub for the dev panel's JUMP).
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp } = E;
const UI = O.UI, Art = O.Art;
const GROUPS = [['sprint', 'swim'], ['javelin', 'archery', 'weights', 'diving', 'skijump'], ['downhill', 'bobsled']];
const READY_S = 5, SPLASH_S = 4;
const H = O.Hub = {
  active: false, info: null, card: null, started: false, ended: false, slot: -1, total: 0, sentResult: false, results: [], ghosts: {}, others: {}, deal: [], nations: {}, lastSend: 0, lastProg: 0, offlineOn: false, timeUp: false,
  hub() { return typeof window !== 'undefined' && window.AIHub; },
  /** the boot step: connect, or play the normal game when there is no hub after all */
  boot() {
    const A = H.hub(); if (!A || !A.active) return null;
    return A.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => { if (!info) { H.active = false; return; } H.setup(info); }).catch(e => { game.fail('hub connect', e); });
  },
  setup(info) {
    const A = H.hub(); H.info = info; H.active = true; O.hubSeeded = true;
    const r = A.rng('deal'); H.deal = GROUPS.map(g => g[Math.floor(r() * g.length)]);
    const perm = O.shuffle(O.NATION_IDS, A.rng('nations')); info.players.forEach((p, i) => H.nations[p.id] = perm[i % 8]);
    A.on('card', c => { H.card = c; });
    A.on('start', () => { H.started = true; });
    A.on('message', (d, from) => H.message(d, from));
    A.on('leave', e => { delete H.ghosts[e.id]; delete H.others[e.id]; });
    A.on('time-up', () => { H.timeUp = true; if (!H.sentResult) H.sendResult(); });
    A.on('end', () => H.end());
  },
  me() { return H.info ? H.info.me : 0; },
  player(id) { return (H.info && H.info.players.find(p => p.id === id)) || { id, name: 'P' + (id + 1), color: E.PLAYER_COLORS[id % 4] }; },
  slots() { let t = 0; return H.deal.map(id => { const ev = O.EVENTS[id], len = READY_S + ((ev.hub && ev.hub.seconds) || 40) + SPLASH_S, s = { id, from: t, to: t + len }; t += len; return s; }); },
  now() { const A = H.hub(); return A && A.time ? A.time() / 1000 : -Infinity; },
  // ---- the round on the hub's clock -------------------------------------------------------------------------
  tickCard() {
    // the card answers: Enter / ✕ = ready, △ / T = more time
    const A = H.hub(); if (!A || H.started) return;
    if (game.input.pressed('confirm') || game.input.pressed('start')) { A.answer('ready'); UI.sfx('confirm'); }
    if (game.input.pressed('turbo') || game.input.pressed('more')) { A.answer('more'); UI.sfx('select'); }
  },
  beginSlot(i) {
    const sl = H.slots()[i]; if (!sl) return H.finishRound();
    H.slot = i; H.slotRec = { done: false, perf: null };
    O.meet = O.flow.newMeet({ mode: 'hub', events: [sl.id], players: [{ nation: H.nations[H.me()] || 'SUN', input: game.input, color: H.player(H.me()).color }], seed: (H.info && H.info.seed) || 1 });
    H.ghosts = {}; H.phase = 'ready';
    game.go('ev:' + sl.id, {}, { fade: 'iris', seconds: .3 });
  },
  eventEnter(ctx) { ctx.hubPhase = 'ready'; },
  /** called by the runner each step; returns true while the hub holds the event (get ready, the splash) */
  tickEvent(ctx, dt, rdt) {
    if (H.ended) return true;
    const sl = H.slots()[H.slot], t = H.now(); if (!sl) return true;
    if (t >= sl.to) { H.finalize(ctx); if (H.slot + 1 < H.deal.length) H.beginSlot(H.slot + 1); else H.finishRound(); return true; }
    const into = t - sl.from;
    if (game.real - H.lastProg > 1) H.progress();
    if (into < READY_S) { ctx.hubPhase = 'ready'; ctx.hubLeft = READY_S - into; if (game.real - H.lastSend > .25) { H.lastSend = game.real; H.send({ t: 'g', e: ctx.def.id, i: H.slot, a: 0, ts: 0, s: [0, 0, 0] }, false); } return true; }
    if (ctx.phase === 'end' || ctx.phase === 'finish' && !ctx.cur && O.Run.queue.length === 0) { if (!H.slotRec.done) H.finalize(ctx); }
    if (H.slotRec.done && t >= sl.to - SPLASH_S) { ctx.hubPhase = 'splash'; return true; }
    ctx.hubPhase = H.slotRec.done ? 'watch' : 'heat';
    if (H.timeUp) { for (const p of game.players) p.consumeAll(); }
    // ghosts out, ~10 a second
    if (!H.slotRec.done && game.real - H.lastSend > .1 && ctx.def.hubSample && ctx.phase === 'play') { H.lastSend = game.real; const s = ctx.def.hubSample(ctx); if (s) H.send({ t: 'g', e: ctx.def.id, i: H.slot, a: ctx.round, ts: +(ctx.def.hubTime ? ctx.def.hubTime(ctx) : ctx.t || 0).toFixed(2), s: s.map(v => typeof v === 'number' ? +v.toFixed(2) : v) }, false); }
    if (game.real - H.lastProg > 1) H.progress();
    return false;
  },
  attemptDone(ctx) { const a = ctx.humans[0]; if (!a) return; const perf = O.aggregate(ctx.def, a); H.send({ t: 'r', e: ctx.def.id, i: H.slot, perf, pts: O.points(ctx.def.id, perf), total: H.total + O.points(ctx.def.id, perf), a: ctx.round }, true); },
  finalize(ctx) {
    if (H.slotRec.done) return; const a = ctx && ctx.humans[0], id = H.deal[H.slot];
    const perf = a ? O.aggregate(O.EVENTS[id], a) : null, pts = O.points(id, perf);
    H.slotRec = { done: true, perf, pts }; H.total += pts; H.results[H.slot] = { id, perf, pts };
    H.send({ t: 'r', e: id, i: H.slot, perf, pts, total: H.total, final: true }, true); H.progress();
  },
  finishRound() { H.phase = 'over'; if (!H.sentResult) H.sendResult(); game.go('hubSplash', { over: true }, { fade: 'dissolve' }); },
  progress() { const A = H.hub(); H.lastProg = game.real; if (!A || H.ended || !A.progress) return; const last = H.results.filter(Boolean).slice(-1)[0], ev = last && O.EVENTS[last.id]; A.progress({ score: H.total, label: last ? ev.short + ' · ' + (last.perf == null ? 'DNF' : ev.measure.fmt(last.perf)) + ' · ' + O.fmt.thousands(last.pts) + ' pts' : 'Hub Heats · ' + H.total + ' pts' }); },
  sendResult() {
    const A = H.hub(); if (H.sentResult || H.ended) return; H.sentResult = true; if (!A || !A.result) return;
    const stats = {}, awards = [];
    H.results.forEach(r => { if (!r) return; const ev = O.EVENTS[r.id]; stats[ev.short] = r.perf == null ? 'DNF' : ev.measure.fmt(r.perf); const wr = O.EVENTS[r.id].measure.wr; if (r.perf != null && wr && O.better(ev, r.perf, wr[0])) awards.push({ title: 'WORLD RECORD', detail: ev.short + ' · ' + ev.measure.fmt(r.perf) }); });
    stats.Points = O.fmt.thousands(H.total);
    A.result({ score: H.total, stats, awards });
  },
  send(d, reliable) { const A = H.hub(); if (!A || H.ended || !A.send) return; try { A.send(d, { reliable }); } catch (e) { /* dropped */ } },
  message(d, from) {
    if (!d || from === H.me()) return;
    if (d.t === 'g') { if (d.i !== H.slot) return; const g = H.ghosts[from] || (H.ghosts[from] = { id: from, track: [], color: H.player(from).color, name: H.player(from).name.toUpperCase().slice(0, 10) }); g.last = d.s; g.track.push([d.ts].concat(d.s)); if (g.track.length > 3000) g.track.shift(); }
    if (d.t === 'r') { const o = H.others[from] || (H.others[from] = { id: from, total: 0, res: {} }); o.total = d.total; o.res[d.e] = d.perf; }
  },
  ghostsFor(id) { if (!H.active || H.deal[H.slot] !== id) return []; return Object.values(H.ghosts); },
  end() { H.ended = true; for (const p of game.players) { p.clear(); } game.audio.music(null); O.CrowdAudio.set(false); O.Comms.reset(); if (game.sceneName !== 'hubSplash') game.go('hubSplash', { over: true, ended: true }, { fade: 0 }); },
  // ---- an offline hub for the dev panel (no network): three fake ghosts --------------------------------------------
  offline() {
    if (H.offlineOn) return; H.offlineOn = true; const players = [{ id: 0, name: 'YOU', color: '#e8443a' }, { id: 1, name: 'GHOSTY', color: '#3b82f6' }, { id: 2, name: 'SPOOKS', color: '#22c55e' }, { id: 3, name: 'BOO', color: '#f5b700' }];
    let t0 = null; const fake = { active: true, rng: l => E.rng(O.hash('offline:' + l)), time: () => t0 === null ? -Infinity : (game.real - t0) * 1000, answer: w => { if (w === 'ready') { t0 = game.real + 3; H.started = true; } }, ready() {}, progress() {}, result() {}, send() {}, on() {} };
    H.hub = () => fake; H.setup({ me: 0, players, seed: 7 });
    H.card = { left: 15000, ready: [1, 2], asking: 0, asked: false };
    O.updaters.push(() => { if (!H.started || H.slot < 0 || !O.Run.ctx || !O.Run.ctx.def.hubSample) return; for (const p of players.slice(1)) { const ctx = O.Run.ctx, base = ctx.def.hubSample(ctx); if (!base) continue; const s = base.map((v, k) => typeof v === 'number' ? v * (1 - .02 * p.id) + (k === 1 ? p.id * 3 : 0) : v); H.message({ t: 'g', i: H.slot, e: ctx.def.id, ts: (ctx.t || 0) - p.id * .3, s }, p.id); } });
  }
};

// the generic ghost painter: a translucent figure in the player's colour with their name, at a world point
O.drawHubGhosts = (ctx, r) => {
  if (!H.active || !ctx.def.hubPoint) return;
  for (const g of Object.values(H.ghosts)) {
    const q = g.last; if (!q) continue; const p = ctx.def.hubPoint(ctx, q, g); if (!p) continue;
    r.queue(p[0], p[1], p[2], gg => { const s = r.w(p[0], p[1], p[2]); px.blend(gg, .5, 'normal', () => { px.rect(gg, s[0] - 4, s[1] - 26, 8, 16, g.color); px.disc(gg, s[0], s[1] - 30, 4, g.color); px.rect(gg, s[0] - 4, s[1] - 10, 3, 10, g.color); px.rect(gg, s[0] + 1, s[1] - 10, 3, 10, g.color); }); E.font.text(gg, g.name, s[0] - E.font.width(g.name, { font: 'tiny' }) / 2, s[1] - 42, '#ffffff', { font: 'tiny', outline: '#000' }); }, { bias: 2 });
  }
};
// the hub's view over an event: GET READY with the event card, the countdown, the splash
O.overlays.push((r, g) => {
  if (!H.active || !game.sceneName || !game.sceneName.startsWith('ev:')) return;
  const ctx = O.Run.ctx; if (!ctx) return; const W = r.W, Ht = r.H, ev = ctx.def;
  if (ctx.hubPhase === 'ready') { UI.panel(g, W / 2 - 150, 40, 300, 120, { alpha: .93 }); Art.picto(g, ev.id, W / 2 - 140, 50, 32); UI.text(g, 'EVENT ' + (H.slot + 1) + ' OF 3', W / 2 - 100, 52, '#aab0d0'); UI.text(g, ev.name, W / 2 - 100, 64, '#ffffff', { scale: 2 }); ev.howto.rows.slice(0, 3).forEach(([a, l], i) => { const w = O.Prompt.draw(g, W / 2 - 140, 90 + i * 20, a, {}); UI.text(g, l, W / 2 - 134 + w, 93 + i * 20, '#ffffff'); }); E.font.text(g, String(Math.ceil(ctx.hubLeft || 0)), W / 2 + 110, 50, '#ffe066', { scale: 4, shadow: '#000', outline: false }); }
  if (ctx.hubPhase === 'watch') UI.text(g, 'DONE! WATCHING THE OTHERS...', W / 2 - UI.tw('DONE! WATCHING THE OTHERS...', 1) / 2, 64, '#ffe066');
  if (ctx.hubPhase === 'splash' || ctx.hubPhase === 'watch') { const rows = [{ name: H.player(H.me()).name.toUpperCase(), color: H.player(H.me()).color, total: H.total }].concat(Object.values(H.others).map(o => ({ name: H.player(o.id).name.toUpperCase(), color: H.player(o.id).color, total: o.total }))).sort((a, b) => b.total - a.total); UI.panel(g, W / 2 - 110, Ht - 30 - rows.length * 14, 220, 16 + rows.length * 14, { title: 'POINTS', alpha: .9 }); rows.forEach((p, i) => { UI.text(g, (i + 1) + '. ' + p.name.slice(0, 12), W / 2 - 100, Ht - 14 - (rows.length - i) * 14 + 4, p.color); UI.text(g, O.fmt.thousands(p.total), W / 2 + 60, Ht - 14 - (rows.length - i) * 14 + 4, '#ffffff'); }); }
  if (H.timeUp && !H.ended) UI.text(g, 'TIME!', W / 2 - UI.tw('TIME!', 4) / 2, Ht / 2 - 30, '#ffe066', { scale: 4 });
  if (H.ended) UI.text(g, 'ROUND OVER', W / 2 - UI.tw('ROUND OVER', 4) / 2, Ht / 2 - 30, '#ffffff', { scale: 4 });
});

// ---------------------------------------------------------------------------------------------------------------
// the splash (while connecting, and after the round) and our own card
// ---------------------------------------------------------------------------------------------------------------
O.scene('hubSplash', {
  view: 'brawler', input: O.KEYS, camera: { zoom: false }, touch: [], lock: 0,
  enter(d) { this.over = !!d.over; this.ended = !!d.ended; this.t = 0; if (!this.over) O.Music.play('title'); },
  update(dt, rdt) { this.t += rdt; if (this.over) return; if (H.active && H.info) return O.go('hubCard', {}, { fade: 'dissolve' }); if (!O.inHub || (this.t > 25 && !H.info)) { O.inHub = false; O.go('title'); } },
  draw(r) {
    const W = r.W, Hh = r.H, t = game.real; O.drawTitleBack(r.ctx, W, Hh, t);
    r.overlay(g => {
      O.drawLogo(g, W, 30, t);
      if (!this.over) { UI.text(g, 'JOINING THE HUB...', W / 2 - UI.tw('JOINING THE HUB...', 2) / 2, Hh * .7, '#ffffff', { scale: 2 }); return; }
      UI.panel(g, W / 2 - 130, Hh * .45, 260, 90, { alpha: .9, title: this.ended ? 'ROUND OVER' : 'HUB HEATS COMPLETE' });
      H.results.forEach((res, i) => { if (!res) return; const ev = O.EVENTS[res.id]; UI.text(g, ev.short + '  ' + (res.perf == null ? 'DNF' : ev.measure.fmt(res.perf)) + '  ' + res.pts + ' PTS', W / 2 - 120, Hh * .45 + 20 + i * 14, '#ffffff'); });
      UI.text(g, 'TOTAL ' + O.fmt.thousands(H.total) + ' POINTS', W / 2 - 120, Hh * .45 + 66, '#ffe066', { scale: 1 });
    });
  }
});
O.scene('hubCard', {
  view: 'brawler', input: Object.assign({}, O.KEYS, { more: ['KeyT'] }), camera: { zoom: false }, touch: [], lock: 0,
  enter() {
    this.t = 0; this.rigs = {}; this.blob = Art.makeYikesy(9); this.readySent = false; this.rects = {};
    O.Music.play('title');
    const A = H.hub(); if (A && A.ready && !H.readyCalled) { H.readyCalled = true; A.ready(); }
    if (!this.keyHook && typeof addEventListener !== 'undefined') { this.keyHook = true; addEventListener('keydown', e => { if (game.sceneName === 'hubCard' && !H.started && H.hub()) { if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') H.hub().answer('ready'); if (e.code === 'KeyT') H.hub().answer('more'); } }, { capture: true }); }
  },
  update(dt, rdt) {
    this.t += rdt; game.focus(100, 40, 20);
    H.tickCard();
    const c = UI.clicked(); if (c && H.hub() && !H.started) { if (this.rects.ready && UI.hit(c, ...this.rects.ready)) H.hub().answer('ready'); if (this.rects.more && UI.hit(c, ...this.rects.more)) H.hub().answer('more'); }
    if (H.started && H.now() >= 0 && H.slot < 0) H.beginSlot(0);
  },
  draw(r) {
    const W = r.W, Hh = r.H, t = game.real, info = H.info || { players: [] };
    // the venue of the first event as the backdrop: the stadium's crowd under a night sky
    O.Venue.stadium(r, { night: true, marks: false, blimp: true, jumbo: ['HUB HEATS', 'GET READY'] });
    r.overlay(g => {
      UI.panel(g, 10, 8, W - 20, Hh - 16, { alpha: .82 });
      E.font.title(g, O.TITLE, W / 2, 14, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e0461a'], outline: '#3a0a10', depth: 2, align: 'center' });
      UI.text(g, 'HUB HEATS: MOST POINTS OVER THREE EVENTS WINS', W / 2 - UI.tw('HUB HEATS: MOST POINTS OVER THREE EVENTS WINS', 1) / 2, 44, '#ffe066');
      H.deal.forEach((id, i) => { const ev = O.EVENTS[id], x = Math.round(W / 2 - 150 + i * 104); Art.picto(g, id, x, 58, 28); UI.text(g, (i + 1) + '. ' + (ev.short || ev.name).toUpperCase(), x + 32, 64, '#ffffff'); UI.text(g, (ev.hub.seconds || 40) + ' S', x + 32, 76, '#aab0d0'); });
      // the players in seat colours, with a READY tick each
      const ready = (H.card && H.card.ready) || [];
      info.players.forEach((p, i) => { const x = Math.round(W / 2 - info.players.length * 50 + i * 100 + 50), y = 140, nat = H.nations[p.id] || 'SUN'; const rig = this.rigs[p.id] || (this.rigs[p.id] = O.makeRig(nat, 'ceremony')); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: ready.includes(p.id) ? 'cheer' : 'wave' }); rig.drawPortrait(g, x - 20, 92, 40, { bg: p.color }); Art.flag(g, x - 10, 134, 20, 13, nat); const nm = (p.id === H.me() ? '▸' : '') + String(p.name).toUpperCase().slice(0, 12); UI.text(g, nm, x - UI.tw(nm, 1) / 2, 150, p.color); if (ready.includes(p.id)) UI.text(g, '✓ READY', x - 20, 162, '#4fe0a8'); });
      // this player's controls
      const items = [['move', 'MOVE / STEER'], [['mashL', 'mashR'], 'MASH'], ['action', 'ACTION'], ['turbo', 'TURBO']]; items.forEach(([a, l], i) => { const x = 24 + (i % 2) * ((W - 48) / 2), y = 178 + Math.floor(i / 2) * 16; const w = O.Prompt.draw(g, x, y, a, {}); UI.text(g, l, x + w + 4, y + 2, '#ffffff'); });
      // the answers and the countdown
      const left = H.card && H.card.left != null ? Math.ceil(H.card.left / 1000) : null, st = H.started ? Math.ceil(-H.now()) : null;
      const bw = 90, by = Hh - 36; this.rects.ready = [W / 2 - bw - 6, by, bw, 18]; this.rects.more = [W / 2 + 6, by, bw, 18];
      px.rect(g, ...this.rects.ready, '#4fe0a8'); O.Prompt.draw(g, W / 2 - bw - 2, by + 3, 'confirm', { label: 'READY', color: '#06120a' });
      px.rect(g, ...this.rects.more, H.card && H.card.asked ? '#f2b632' : '#3a3f66'); O.Prompt.draw(g, W / 2 + 10, by + 3, 'turbo', { label: 'MORE TIME' });
      if (st !== null && isFinite(st) && st > 0) E.font.title(g, String(st), W / 2, Hh / 2 - 30, { scale: 6, colors: ['#ffffff', '#ffe066', '#ff7a1a'], outline: '#3a0a10', depth: 3, align: 'center' });
      else if (left !== null) UI.text(g, 'STARTS IN ' + left + ' S' + (H.card && H.card.paused ? ' (PAUSED)' : ''), W - 24 - UI.tw('STARTS IN 00 S (PAUSED)', 1), 58, '#ffffff');
    });
  }
});
})();
