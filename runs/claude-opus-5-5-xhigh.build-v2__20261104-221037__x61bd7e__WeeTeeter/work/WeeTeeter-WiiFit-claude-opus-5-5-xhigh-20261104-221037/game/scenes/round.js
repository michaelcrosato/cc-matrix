/* scenes/round.js: "Morning Class", the AI Hub round. Everyone plays the same 3 events on their own copy, in lockstep on the
 * hub's clock, and sees the others as translucent seat-coloured ghosts. No title, menus, saves or other network. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const GROUPS = [['stork', 'candle', 'squat', 'pushup'], ['step', 'hoop'], ['slalom', 'jog']], INTRO = 5, PLAY = 40, SCORE = 5;
const H = G.Hub = { live: false, info: null, card: null, over: false, reported: false, ghosts: {}, gone: {}, deal: [], total: 0, sum: {}, stats: { steady: 0, n: 0 }, t: 0,
  /** the session wrapper: outside a session nothing happens */
  connect() {
    if (!G.inSession) return;
    (async () => {
      const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
      if (!info) { G.inSession = false; return game.go('title'); }
      H.info = info; H.live = true; H.players = info.players; G.devMember(1); G.Save.slot = null;
      const rng = AIHub.rng('deal'); H.deal = GROUPS.map(g => g[Math.floor(rng() * g.length) % g.length]);
      const lim = info.limitMs || 240000, need = (INTRO + PLAY + SCORE) * 3 * 1000; H.k = clamp((lim - 4000) / need, .4, 1);
      H.rig = {}; for (const p of info.players) { H.rig[p.id] = G.memberRig({ hair: G.LOOK.hair[p.id % 5], skin: (p.id * 2 + 1) % 6, top: 0, bottom: p.id % 4 }, {}, { size: 1.6, color: p.color }); H.rig[p.id].poser = new G.Poser(H.rig[p.id]); }
      AIHub.on('card', c => { H.card = c; });
      AIHub.on('start', () => { H.started = true; });
      AIHub.on('message', (d, from) => { if (d && d.t === 'g') H.ghosts[from] = d; });
      AIHub.on('leave', ({ id }) => { delete H.ghosts[id]; H.gone[id] = true; });
      AIHub.on('time-up', () => H.report());
      AIHub.on('end', () => { H.over = true; game.audio.stopMusic(); game.audio.mute(true); game.input.clear(); });
      await game.booted; AIHub.ready();
    })();
  },
  report() {
    if (H.reported || !G.inSession) return; H.reported = true;
    const n = Math.max(1, H.stats.n), steady = Math.round(H.stats.steady / n * 100), a = H.bestEvent, awards = a ? [{ title: G.DATA.lines.hubTitles[a.d] || 'Participated', detail: a.name + ': ' + a.score + ' points' }] : [{ title: 'Participated', detail: 'Tare saw you.' }];
    AIHub.result({ score: H.total, stats: { Steadiness: steady + '%', Points: String(H.total) }, awards });
  }
};
/* ---- ghosts: neighbouring mats, or in the world for Slalom and Jog ---- */
const SLOTS = [-104, 104, -190, 190];
const ghostList = () => { if (!H.info) return []; const out = []; let k = 0; for (const p of H.info.players) { if (p.id === H.info.me) continue; const d = H.ghosts[p.id], slot = SLOTS[k++ % 4]; if (d && !H.gone[p.id]) out.push({ p, d, slot, rig: H.rig[p.id] }); } return out; };
H.updateGhosts = (dt, ctx, e) => {
  for (const q of ghostList()) {
    if (q.d.a !== e || !ctx) continue;
    const def = ctx.def, x = q.d.x || {}, rig = q.rig, wob = q.d.w || [0, 0];
    if (def.family === 'hold') { rig.poser.pose(ctx.poses[0]); rig.poser.update(dt); rig.wob = wob; rig.update(dt, { x: q.slot, y: -8, z: 0, vx: 0, vy: 0, facing: rig.poser.facing }); }
    else if (def.family === 'candle') { rig.poser.pose('sit'); rig.poser.update(dt); rig.wob = wob; rig.update(dt, { x: q.slot, y: -8, z: 0, vx: 0, vy: 0, facing: rig.poser.facing }); }
    else if (def.family === 'rep') { G.repBody(ctx, null, rig.poser, rig, x.v || 0, wob[0], q.slot, -8, dt); }
    else if (def.family === 'step') { const k = x.k || 0; rig.body = G.moves.stepUp(Math.sin(k * Math.PI)); rig.update(dt, { x: q.slot, y: -8, z: 0, vx: 0, vy: 0, facing: 1.57 }); }
    else if (def.family === 'hoop') { rig.body = G.moves.hula(x.ph || 0); rig.update(dt, { x: q.slot, y: -8, z: 0, vx: 0, vy: 0, facing: 1.57 }); }
    else if (def.family === 'slalom') { rig.body = null; rig.mocap = null; rig.wob = x.w || [0, 0]; rig.update(dt, { x: x.x || 0, y: x.y || 0, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: 'crouch' }); }
    else if (def.family === 'jog') { rig.poser.clip('Run_Loop', { loop: true, tgt: -1.57 }); rig.poser.update(dt); rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: rig.poser.facing }); }
  }
};
G.drawGhosts = (r, ctx) => {
  if (!H.live || ctx.mode !== 'round') return;
  for (const q of ghostList()) { if (q.d.a !== H.e) continue; r.actor(q.slot, -8, 0, (g, ox, oy) => q.rig.draw(g, ox, oy, r.view), { alpha: .5 }); const name = q.p.name, col = q.p.color; r.overlay(g => { const p = r.w(q.slot, -8, 66); txt(g, name, p[0], p[1], col, { align: 'center', shadow: '#ffffff' }); }); }
};
G.drawSkiGhosts = ctx => { if (!H.live || ctx.mode !== 'round') return; for (const q of ghostList()) { if (q.d.a !== H.e || !q.d.x) continue; const m7 = G.m7, x = q.d.x.x, y = q.d.x.y; m7.add(x, y, 0, (g, sx, sy, k) => { const al = g.globalAlpha; g.globalAlpha = al * .5; q.rig.draw(g, Math.round(sx), Math.round(sy), m7.view(k * .92)); g.globalAlpha = al; txt(g, q.p.name, sx, sy - 60 * k, q.p.color, { align: 'center', shadow: '#ffffff' }); }); } };
G.jogGhosts = ctx => { if (!H.live || ctx.mode !== 'round') return []; const out = []; for (const q of ghostList()) { if (q.d.a !== H.e || !q.d.x) continue; const name = q.p.name, col = q.p.color, rig = q.rig; out.push({ z: (q.d.x.z || 0) + ctx.ahead, x: q.d.x.x || 0, w: 300, draw(g, sx, sy, s) { const k = Math.max(.3, s * 300 * .012), al = g.globalAlpha; g.globalAlpha = al * .5; rig.draw(g, Math.round(sx), Math.round(sy), G.scaleView(k)); g.globalAlpha = al; if (k > .5) txt(g, name, sx, sy - 44 * k, col, { align: 'center', shadow: '#ffffff' }); } }); } return out; };

/* ---- the round ---- */
let tare, ctx = null, e = -1, sim = 0, ghostT = 0, progT = 0, reported = {}, sentReady = false, last = 0;
const clock = () => (window.AIHub && AIHub.time ? AIHub.time() / 1000 : -Infinity);
const seg = () => ({ intro: INTRO * (H.k || 1), play: PLAY * (H.k || 1), score: SCORE * (H.k || 1) });
function startEvent(i) {
  e = i; H.e = i; const id = H.deal[i], def = G.activities[id], S = seg(), meInfo = H.info.players.find(p => p.id === H.info.me) || { name: 'You', color: '#ff7a59' };
  game.setView(def.view); G.talk.close(); sim = 0;
  ctx = G.makeRun(id, { tier: 0, mode: 'round', dur: S.play, short: true, seed: (H.info.seed >>> 0) % 100000 + i * 101, rng: AIHub.rng('e' + i), contestants: [{ name: meInfo.name, color: meInfo.color, input: game.input, local: true, look: { hair: G.LOOK.hair[H.info.me % 5], skin: (H.info.me * 2 + 1) % 6, top: 0, bottom: H.info.me % 4 }, shirt: meInfo.color, wear: {} }] });
  G.music(def.music || null);
}
function finishEvent() {
  if (!ctx || ctx.scored) return; ctx.scored = true; if (!ctx.done) G.endRun(ctx); const c = ctx.local; H.total += c.score; H.stats.steady += c.pct; H.stats.n++;
  if (!H.bestEvent || c.score > H.bestEvent.score) H.bestEvent = { name: ctx.def.name, score: c.score, d: ctx.def.discipline };
}
G.scenes.round = {
  view: 'brawler', camera: { zoom: false }, pausable: false,
  enter() { tare = new G.TareBody(0, 16); tare.scale = 2; e = -1; G.L.enabled = false; },
  update(dt) {
    tare.update(dt); G.talk.update(dt);
    if (!H.live) { G.stageCam(30, 8); return; }
    if (H.over) return;
    const now = clock(), I = game.input; G.scenes.round.pausable = now !== -Infinity;
    if (now === -Infinity) { // the card
      G.stageCam(30, 8);
      if (Math.floor(game.real / 1.6) !== Math.floor((game.real - dt) / 1.6)) tare.hop(30);
      for (const p of H.info.players) { const rg = H.rig[p.id]; rg.update(dt, { x: H.lineX(p.id), y: 34, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); }
      if (I.pressed('confirm') || I.pressed('start')) { AIHub.answer('ready'); I.consumeAll(); }
      if (I.pressed('more')) { AIHub.answer('more'); I.consumeAll(); }
      const ck = I.clicked(); if (ck) { const b = H.cardButtons(); if (ck[1] >= b.y && ck[1] < b.y + b.h) { if (ck[0] < game.W / 2) AIHub.answer('ready'); else AIHub.answer('more'); } }
      return;
    }
    if (now < 0) { G.stageCam(30, 8); for (const p of H.info.players) H.rig[p.id].update(dt, { x: H.lineX(p.id), y: 34, z: 0, vx: 0, vy: 0, facing: 1.57, expr: 'smile' }); return; }
    /* all timing comes from the hub's clock: a slow machine catches up in fixed steps */
    const S = seg(), len = S.intro + S.play + S.score, i = Math.floor(now / len);
    if (i >= H.deal.length) { if (ctx && !ctx.scored) finishEvent(); H.report(); return; }
    if (i !== e) { if (ctx && !ctx.scored) finishEvent(); startEvent(i); }
    const u = now - i * len;
    if (u < S.intro) { G.previewRun(ctx, dt); }
    else if (u < S.intro + S.play) { const want = u - S.intro; let n = 0; while (sim < want && n < 16 && !ctx.done) { G.stepRun(ctx, 1 / 120); sim += 1 / 120; n++; } H.updateGhosts(dt, ctx, e); }
    else { if (!ctx.scored) finishEvent(); G.previewRun(ctx, dt); }
    /* ghosts about ten times a second; progress about once a second */
    ghostT -= dt; if (ghostT <= 0 && ctx) { ghostT = .1; const c = ctx.local, b = c.bal, res = ctx.def.result(ctx, c) || { pct: 0 }, s = H.total + (ctx.scored ? 0 : Math.round(clamp(res.pct, 0, 1) * 1000)); AIHub.send({ t: 'g', a: e, l: [b ? +b.x.toFixed(2) : 0, b ? +b.y.toFixed(2) : 0], p: ctx.poseI || 0, w: [b ? +b.x.toFixed(2) : 0, b ? +b.y.toFixed(2) : 0], s, x: ctx.def.ghost ? ctx.def.ghost(ctx, c) : null }, { reliable: false }); H.live2 = s; }
    progT -= dt; if (progT <= 0) { progT = 1; const s = H.live2 === undefined ? H.total : H.live2; AIHub.progress({ score: s, label: s + ' pts' }); }
  },
  draw(r) {
    if (!H.live) { G.ROOMS.studio(r); r.overlay(g => txt(g, 'Zeroing the scale', game.W / 2, game.H / 2, '#14a8c8', { align: 'center' })); return; }
    const now = clock(), W = game.W, HH = game.H;
    if (now < 0 || now === -Infinity) {
      G.ROOMS.studio(r); for (const p of H.info.players) G.drawMat(r, H.lineX(p.id), 34, 24, 8, '#e8f0f2');
      tare.draw(r, { scale: 2 }); for (const p of H.info.players) { const x = H.lineX(p.id); G.drawRig(r, H.rig[p.id], x, 34, 0); }
      r.overlay(g => {
        G.title(g, G.TITLE, W / 2, 6, 3); txt(g, 'Morning Class', W / 2, 40, '#14a8c8', { align: 'center', shadow: '#ffffff' });
        G.panel(g, W / 2 - 150, 52, 300, 38, { r: 8 }); txt(g, G.DATA.lines.notes.roundGoal, W / 2, 57, '#20404c', { align: 'center' }); txt(g, H.howto(), W / 2, 70, '#5f7f8a', { align: 'center' });
        H.info.players.forEach(p => { const q = game.r.w(H.lineX(p.id), 34, 0), rd = H.card && H.card.ready && H.card.ready.includes(p.id); txt(g, p.name, q[0], q[1] + 12, p.color, { align: 'center', shadow: '#ffffff' }); if (rd) txt(g, '✓ Ready', q[0], q[1] + 22, '#14a8c8', { align: 'center', shadow: '#ffffff' }); });
        if (now === -Infinity) { const c = H.card, left = c && c.left !== null && c.left !== undefined ? Math.ceil(c.left / 1000) : null, b = H.cardButtons(); G.panel(g, W / 2 - b.w - 4, b.y, b.w, b.h, { r: 8, bg: '#2cc6e6', border: '#14a8c8' }); txt(g, 'Ready ' + game.input.label('confirm'), W / 2 - b.w / 2 - 4, b.y + 6, '#ffffff', { align: 'center' }); G.panel(g, W / 2 + 4, b.y, b.w, b.h, { r: 8, bg: c && c.asked ? '#ffd166' : '#fbfdfd' }); txt(g, (c && c.asked ? 'Asked ' : 'More time ') + game.input.label('more'), W / 2 + 4 + b.w / 2, b.y + 6, '#20404c', { align: 'center' }); txt(g, c && c.paused ? 'Paused: everyone is getting ready' : left !== null ? left + ' s' : c && c.starting ? 'Starting' : '', W / 2, b.y - 11, '#20404c', { align: 'center', shadow: '#ffffff' }); }
        else { txt(g, Math.ceil(-now), W / 2, HH / 2 - 24, '#ff7a59', { align: 'center', scale: 4, shadow: '#ffffff' }); }
      });
      return;
    }
    if (!ctx) { G.ROOMS.studio(r); return; }
    G.drawRun(r, ctx);
    const S = seg(), len = S.intro + S.play + S.score, u = now - e * len;
    r.overlay(g => {
      if (u < S.intro && e < 3) { G.panel(g, W / 2 - 110, 34, 220, 60, { r: 10 }); txt(g, 'Event ' + (e + 1) + ' of 3', W / 2, 39, '#5f7f8a', { align: 'center' }); txt(g, ctx.def.short || ctx.def.name, W / 2, 51, '#14a8c8', { align: 'center', scale: 2 }); G.wrapText(g, ctx.def.say.split('.')[0] + '.', W / 2, 72, 200, '#20404c', { align: 'center' }); txt(g, Math.ceil(S.intro - u), W / 2, 100, '#ff7a59', { align: 'center', scale: 3, shadow: '#ffffff' }); G.prompts(g, G.controlsFor(ctx.def)); }
      else if (u >= S.intro + S.play || ctx.done) { const c = ctx.local; G.panel(g, W / 2 - 110, 34, 220, 70, { r: 10 }); G.drawStars(g, W / 2, 40, c.stars, { scale: 2, gap: 22 }); txt(g, c.score + ' points', W / 2, 62, '#20404c', { align: 'center', scale: 2 }); txt(g, 'Total ' + H.total, W / 2, 84, '#14a8c8', { align: 'center' }); }
      /* others' scores, quietly */
      const ca = game.cornerArea(), rx = ca && ca.y0 < 40 ? Math.floor(ca.x0) - 6 : W - 8; let y = 18; for (const q of ghostList()) { txt(g, q.p.name + ' ' + (q.d.s || 0), rx, y, q.p.color, { align: 'right', shadow: '#ffffff' }); y += 10; }
      txt(g, 'Total ' + (H.live2 === undefined ? H.total : H.live2), rx, 7, '#20404c', { align: 'right', shadow: '#ffffff' });
    });
  }
};
H.lineX = id => { const n = H.info.players.length; return (id - (n - 1) / 2) * 70; };
H.cardButtons = () => ({ y: game.H - 32, w: 104, h: 22 });
H.howto = () => { const I = game.input; if (I.lastDevice === 'gamepad') return 'Lean: left stick. Breathe: R2. Ready ' + I.label('confirm') + '. More time ' + I.label('more'); return 'Lean: WASD or mouse. Breathe: Space. Ready Enter. More time Tab'; };
})();
