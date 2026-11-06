/* scenes/class.js: Class, 2 to 4 people on one screen. Join with Start on a free pad or 2 on the keyboard. Empty mats hold
 * Regulars, for life, not for score. Polite podium. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const LIST = ['stork', 'candle', 'squat', 'step', 'hoop'], FILL = ['gertrude', 'marisol', 'kevin'];
let phase = 'join', pills = null, ctx = null, t = 0, queue = [], totals = [], round = 0, rounds = 1, podium = null, tare, previews = [], idle = 0;
const specs = () => {
  const P = game.players, out = P.map((I, i) => ({ name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], input: I, local: true, look: { hair: G.LOOK.hair[(i * 2) % 5], skin: (i * 2 + 1) % 6, top: 0, bottom: i % 4 }, shirt: E.PLAYER_COLORS[i], wear: {} }));
  for (let k = out.length; k < 4; k++) { const id = FILL[(k - P.length + 3) % 3]; out.push({ name: G.DATA.lines.regulars[id].name, color: '#9fb5bc', regular: id, skill: 'average', life: true }); }
  return out;
};
function menu() {
  phase = 'join'; t = 0; game.setView('brawler'); G.talk.close(); ctx = null;
  const items = LIST.map(id => ({ label: G.activities[id].short || G.activities[id].name, id }));
  items.push({ label: 'Surprise me', id: 'surprise' });
  pills = new G.Pills(items, { x: () => game.W / 2, y: () => 40, w: 150, h: 19, gap: 3, onPick(i, it) {
    round = 0; totals = game.players.map(() => 0);
    if (it.id === 'surprise') { const pool = LIST.slice(); queue = []; for (let k = 0; k < 3; k++) { const j = Math.floor(G.cosmetic() * pool.length); queue.push(pool.splice(j, 1)[0]); } rounds = 3; }
    else { queue = [it.id]; rounds = 1; }
    begin();
  }, onBack() { G.go('title'); } });
}
function begin() {
  const id = queue[round], def = G.activities[id]; phase = 'intro'; t = 0;
  game.setView(def.view);
  ctx = G.makeRun(id, { tier: 0, mode: 'class', dur: 35, short: true, seed: 300 + round * 7 + Math.floor(G.cosmetic() * 1000), contestants: specs(), lanes: ['left', 'down', 'up', 'right'] });
  G.music(def.music); G.say('tare', G.line('tare.class'), { auto: 2.5, modal: false, place: 'top' });
}
function finish() {
  const humans = ctx.contestants.filter(c => !c.life); humans.forEach((c, i) => { totals[i] = (totals[i] || 0) + c.score; });
  round++;
  if (round < rounds) { phase = 'between'; t = 0; return; }
  const order = humans.map((c, i) => ({ c, i, score: totals[i] })).sort((a, b) => b.score - a.score), titles = G.DATA.lines.class.titles;
  podium = order.map((o, k) => ({ name: o.c.name, color: o.c.color, score: o.score, title: titles[Math.min(k, titles.length - 1)], rig: o.c.rig, poser: new G.Poser(o.c.rig), k }));
  phase = 'podium'; t = 0; G.sting('star3'); G.music('festival'); game.setView('brawler');
  G.mutter('tare', G.line('tare.podium'), { auto: 3.5, face: 'happy' });
  pills = new G.Pills([{ label: 'Again', id: 'again' }, { label: 'Another', id: 'menu' }, { label: 'Done', id: 'title' }], { layout: 'h', y: () => game.H - 32, w: 90, h: 20, onPick(i, it) { if (it.id === 'again') { round = 0; totals = game.players.map(() => 0); begin(); } else if (it.id === 'menu') menu(); else G.go('title'); }, onBack() { menu(); } });
}
G.classPodium = () => phase === 'podium' ? podium : null;
G.classIdle = () => phase === 'join' && game.players.length === 1;
G.scenes.class = {
  view: 'brawler', camera: { zoom: false }, input: G.CLASS_INPUT, pausable: false,
  enter() { G.dbg.activity = 'class'; G.L.enabled = false; G.music('studio'); tare = new G.TareBody(0, 30); tare.scale = 1.1; game.allowJoin({ max: 4, onJoin: (input, n) => { G.A.sfx('ok'); } }); menu(); this.pausable = false; },
  exit() { if (ctx && ctx.def.stop) ctx.def.stop(ctx); game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]); game.input.use(G.INPUT); G.talk.close(); },
  update(dt) {
    t += dt; G.talk.update(dt); tare.update(dt);
    if (phase === 'join') { G.stageCam(30, 8); pills.update(dt); return; }
    if (phase === 'intro') { G.previewRun(ctx, dt); if (t >= 3.5) { phase = 'play'; for (const I of game.players) I.consumeAll(); this.pausable = true; } return; }
    if (phase === 'play') { G.stepRun(ctx, dt); if (ctx.done) { this.pausable = false; finish(); } return; }
    if (phase === 'between') { G.previewRun(ctx, dt); if (t > 2.5 || game.input.pressed('confirm')) { game.input.consumeAll(); begin(); } return; }
    if (phase === 'podium') { G.stageCam(30, 8); for (const p of podium) { p.poser.clip(p.k === 0 ? 'Cheering_Two_Hands' : p.k === 1 ? 'Victory' : 'Idle_Subtle', { loop: true, tgt: 1.5 }); p.poser.update(dt); p.rig.body = null; p.rig.wob = [0, 0]; p.rig.update(dt, { x: (p.k - (podium.length - 1) / 2) * 76, y: 0, z: [20, 12, 6, 0][p.k], vx: 0, vy: 0, facing: p.poser.facing, expr: 'smile' }); } if (t > 1) pills.update(dt); }
  },
  draw(r) {
    if (phase === 'join') {
      G.ROOMS.studio(r); const m = G.mats(4); m.xs.forEach((x, i) => G.drawMat(r, x, 44, 26, 8, i < game.players.length ? E.PLAYER_COLORS[i] : '#e8f0f2')); tare.draw(r, { scale: 1.1 });
      r.overlay(g => { const W = game.W, H = game.H; G.title(g, 'Class', W / 2, 4, 3); pills.draw(g); m.xs.forEach((x, i) => { const p = game.r.w(x, 44, 0); txt(g, i < game.players.length ? 'P' + (i + 1) : 'Free', p[0], p[1] + 12, i < game.players.length ? E.PLAYER_COLORS[i] : '#5f7f8a', { align: 'center', shadow: '#ffffff' }); }); txt(g, G.DATA.lines.class.join, W / 2, H - 12, '#20404c', { align: 'center', shadow: '#ffffff' }); G.prompts(g, [['confirm', 'Pick']], { y: H - 30 }); });
    } else if (phase === 'podium') {
      G.ROOMS.pier(r, { festive: true });
      for (const p of podium) { const x = (p.k - (podium.length - 1) / 2) * 76, z = [20, 12, 6, 0][p.k]; r.queue(x, -1, 0, g => { const a = r.w(x - 30, 0, z), b = r.w(x + 30, 0, 0); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1] + 8, '#fbfdfd'); px.rect(g, a[0], a[1], b[0] - a[0], 2, p.color); }); G.drawRig(r, p.rig, x, 0, z); }
      r.overlay(g => { const W = game.W; for (const p of podium) { const x = game.r.w((p.k - (podium.length - 1) / 2) * 76, 0, 0)[0]; G.panel(g, x - 36, game.H - 72, 72, 34, { r: 7 }); txt(g, p.name, x, game.H - 69, p.color, { align: 'center' }); txt(g, p.title, x, game.H - 60, '#20404c', { align: 'center' }); txt(g, p.score, x, game.H - 51, '#14a8c8', { align: 'center' }); } G.title(g, 'The Podium', W / 2, 8, 2); pills.draw(g); });
    } else {
      G.drawRun(r, ctx);
      r.overlay(g => { const W = game.W, H = game.H;
        if (phase === 'intro') { G.panel(g, W / 2 - 100, 34, 200, 46, { r: 9 }); txt(g, 'Round ' + (round + 1) + ' of ' + rounds, W / 2, 39, '#5f7f8a', { align: 'center' }); txt(g, ctx.tier.name, W / 2, 51, '#14a8c8', { align: 'center', scale: 2 }); txt(g, Math.max(1, Math.ceil(3.5 - t)), W / 2, 90, '#20404c', { align: 'center', scale: 3, shadow: '#ffffff' }); }
        if (phase === 'between') { G.panel(g, W / 2 - 110, 34, 220, 40 + 11 * totals.length, { r: 9 }); txt(g, 'So far', W / 2, 39, '#14a8c8', { align: 'center' }); ctx.contestants.filter(c => !c.life).forEach((c, i) => txt(g, c.name + ': ' + totals[i], W / 2, 52 + i * 11, c.color, { align: 'center' })); }
      });
    }
    G.talk.draw(r);
  }
};
})();
