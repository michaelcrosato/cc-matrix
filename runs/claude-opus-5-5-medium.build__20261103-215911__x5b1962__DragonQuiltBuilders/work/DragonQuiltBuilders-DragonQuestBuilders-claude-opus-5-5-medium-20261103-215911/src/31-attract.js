// The attract mode: after 10 s idle on the title, an AI builder plays vignettes of the whole demo, cheating freely.
// Any key, button, click, mouse move or stick push returns to the title. It never touches the player's save.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;
DQ.VIGNETTES = [
  { id: 'morning', name: 'Morning in Thimbleton', len: 12 },
  { id: 'gather', name: 'Gathering', len: 14 },
  { id: 'craft', name: 'Crafting', len: 10 },
  { id: 'room', name: 'Raising a room', len: 24 },
  { id: 'skirmish', name: 'Skirmish', len: 16 },
  { id: 'night', name: 'Nightfall', len: 10 },
  { id: 'siege', name: 'Siege', len: 18 },
  { id: 'gnarl', name: 'Gnarlgrim', len: 16 },
  { id: 'bee', name: 'Quilting Bee', len: 10 }
];
// each vignette: a generator on the attract session, driving the autopilot
const V = {
  *morning(A) { const ctx = A.ctx; ctx.clock.set(7.2); A.tp(72, 80); const f = { x: 66 * T, y: 70 * T, z: 12 * T }; ctx.camFocus = f; yield ctx.game.tween(f, { x: 82 * T, y: 84 * T }, 10, { ease: 'inOutSine' }); ctx.camFocus = null; },
  *gather(A) {
    const ctx = A.ctx, ap = A.ap; ctx.clock.set(10); A.tp(60, 58);
    const near = ctx.objects.filter(o => o.def.plant && Math.hypot(o.x - 60, o.y - 58) < 9).slice(0, 4);
    for (const o of near) yield* ap.breakAt(o.x, o.y, o.z);
    const t = ctx.world.topZ(63, 60); yield* ap.breakAt(63, 60, t - 1);
    ctx.crafting.known.delete('thatch'); ctx.crafting.know('thatch');
    yield* ap.wait(2);
  },
  *craft(A) { const ctx = A.ctx, ap = A.ap; ctx.clock.set(11); const bench = ctx.objects.find(o => o.id === 'bench'); if (bench) A.tp(bench.x, bench.y + 2); yield* ap.craft('strawBed', 1); yield* ap.wait(1); },
  *room(A) {
    const ctx = A.ctx, ap = A.ap; ctx.clock.set(13); const x0 = 63, y0 = 75; DQ.flatten(ctx.world, x0 - 2, y0 - 2, x0 + 4, y0 + 5, 9); ctx.world.recomputeTops();
    for (const o of ctx.objects.filter(o => o.x >= x0 - 2 && o.x <= x0 + 4 && o.y >= y0 - 2 && o.y <= y0 + 5 && !o.def.portal && !o.def.banner)) ctx.objects.remove(o, { silent: true, noRegrow: true });
    A.tp(x0 + 1, y0 + 4);
    yield* ap.buildRoom(x0, y0, 3, 2, { items: ['strawBed', 'torch'] });
    yield* ap.wait(3);
  },
  *skirmish(A) { const ctx = A.ctx, ap = A.ap; ctx.clock.set(15); A.tp(58, 64); A.b.spinUnlocked = true; for (const [id, dx, dy] of [['lintling', 3, 0], ['lintling', 3, 2], ['lintling', 2, -2], ['pinhog', 5, 1]]) { const m = ctx.monsters.spawnCell(id, 58 + dx, 64 + dy); m.aggro = true; m.state = 'chase'; } yield* ap.fight({ timeout: 14, soft: true }); yield* ap.wait(1); },
  *night(A) { const ctx = A.ctx; ctx.clock.set(20.9); A.tp(72, 80); for (let i = 0; i < 3; i++) { const m = ctx.monsters.spawnCell('mothlet', 60 + i * 4, 64); m.home = [m.body.x, m.body.y, m.body.z]; } const f = { x: 72 * T, y: 78 * T, z: 12 * T }; ctx.camFocus = f; yield ctx.game.tween(f, { x: 64 * T, y: 72 * T }, 8, { ease: 'inOutSine' }); ctx.camFocus = null; },
  *siege(A) {
    const ctx = A.ctx, ap = A.ap; ctx.clock.set(16); A.tp(84, 74);
    ctx.siege.start({ prep: 0, waves: [[['lintling', 6, 'east'], ['knotbrute', 1, 'east']]] }); ctx.siege.nextWave();
    const ba = ctx.objects.find(o => o.id === 'ballista' && o.x === 88); if (ba) { yield* ap.wait(3); const m = ctx.monsters.list.find(q => !q.dead); if (m) yield* ap.manBallista(ba, m, () => ctx.monsters.list.filter(q => !q.dead).length < 4); }
    yield* ap.fight({ timeout: 10, soft: true });
  },
  *gnarl(A) {
    const ctx = A.ctx, ap = A.ap; ctx.clock.set(16.5); ctx.siege.stop(); A.tp(80, 72);
    const g = ctx.monsters.spawnCell('gnarlgrim', 86, 70); g.awake = true; g.hp = Math.round(g.maxHp * .3); g.phase = 3;
    const ba = ctx.objects.find(o => o.id === 'ballista' && o.x === 88);
    if (ba) yield* ap.manBallista(ba, g, () => g.tangled > 0 || g.dead);
    A.b.setEquip('weapon', 'seamRipper');
    yield* ap.fight({ timeout: 10, spin: false, soft: true, filter: m => m.id === 'gnarlgrim' });
    if (!g.dead) { g.dead = true; g.deadT = 0; }
    DQ.FX.unravel(ctx, g.body.x, g.body.y, g.body.z, 70); DQ.FX.confetti(ctx, g.body.x, g.body.y, g.body.z + 40, 60); yield* ap.wait(2);
  },
  *bee(A) {
    // a separate Bee world: three bot builders raise the barn
    const game = A.game, players = [{ id: 0, name: 'Patch', bot: true }, { id: 1, name: 'Bobbin', bot: true }, { id: 2, name: 'Thimble', bot: true }];
    const bee = new DQ.Bee(game, { net: new DQ.LoopbackNet(), me: -1, host: -1, server: true, players, limitMs: 60000 });
    bee.phase = 'build'; for (const q of bee.bots) { q.ap.cheats.fastPlace = true; q.b.bag.infinite = true; }
    A.bee = bee; bee.ctx.builder = bee.bots[0].b; bee.ctx.mode = 'attract';
    game.cam.bounds = v => bee.ctx.world.bounds(v); game.cam.snap = true;
    yield 9.5;
    A.bee = null; game.cam.bounds = v => A.ctx.world.bounds(v); game.cam.snap = true;
  }
};
class Attract {
  constructor(game) {
    this.game = game; this.ctx = DQ._demo || DQ.demoSession(game); this.ctx.mode = 'attract';
    const b = this.b = this.ctx.builder; b.invuln = true; b.bag.infinite = true; b.spinUnlocked = true;
    for (const k of ['strawBed', 'torch', 'planks', 'latticeDoor', 'seamRipper', 'copperBodkin']) b.bag.add(k, 1);
    b.setEquip('weapon', 'copperBodkin');
    this.ap = new DQ.Autopilot(this.ctx, b, { cheats: { god: true, teleport: true, infinite: true, fastPlace: true }, ui: true });
    this.i = -1; this.t = 0; this.card = 4; this.loops = 0; this.done = []; this.task = null; this.bee = null;
  }
  tp(x, y) { this.ap.teleport(x, y); }
  next() {
    if (this.task && !this.task.done) this.task.cancel();
    const ctx = this.ctx; if (ctx.cutscenes.cur) { ctx.cutscenes.cur.script.cancel(); ctx.cutscenes.cur = null; ctx.cutscene = null; } ctx.blackout = 0; ctx.frayvern = 0; ctx.party = 0; ctx.ui.close(); ctx.talk.cur = null; ctx.talk.q = []; ctx.camFocus = null; ctx.hud.popups = []; if (ctx.siege.active) ctx.siege.stop();
    for (const m of ctx.monsters.list) { m.dead = true; m.deadT = 99; }
    this.b.seat = null; this.b.hp = this.b.maxHp;
    this.i++; if (this.i >= DQ.VIGNETTES.length) { this.i = -1; this.card = 4; this.loops++; return; }
    const v = DQ.VIGNETTES[this.i]; this.t = 0; this.ctx.swirl = .5;
    this.task = this.game.script(V[v.id](this), { keep: true });
  }
  update(dt) {
    const ctx = this.ctx;
    if (this.card > 0) { this.card -= dt; if (this.card <= 0) this.next(); return; }
    this.t += dt;
    const v = DQ.VIGNETTES[this.i];
    if (this.t >= v.len || (this.task && this.task.done && this.t > v.len * .5)) { this.done.push(v.id); this.next(); return; }
    if (this.bee) { this.bee.update(dt); const f = this.bee.bots[0].b.body; this.game.focus(DQ.BEE.site[0] * T + 56, DQ.BEE.site[1] * T + 40, 6 * T); return; }
    DQ.sessionUpdate(ctx, dt, () => this.ap.intent());
  }
  draw(r) {
    if (this.card > 0) { r.sky(['#06051a', '#0d0b2a', '#141238']); r.overlay(g => { DQ.UI.logo(g, r.W / 2, r.H / 2 - 40, 4, this.game.real); if (Math.floor(this.game.real * 2) % 2 === 0) DQ.Glyphs.text(g, this.game, 'Press any button', r.W / 2 - 40, r.H - 30, '#fff0c0'); }); return; }
    if (this.bee) this.bee.draw(r); else DQ.sessionDraw(this.ctx, r);
    r.overlay(g => {
      const W = r.W, H = r.H, ca = this.game.cornerArea ? this.game.cornerArea() : null, ty = ca ? Math.round(ca.y1) + 4 : 6;
      E.font.title(g, 'DRAGON QUILT', 6, 6, { scale: 1, colors: ['#ffe07a', '#d0a030'], outline: '#1a1020' });
      DQ.UI.panel(g, W - 50, ty, 44, 16, { thread: '#ff8a8a' }); DQ.UI.center(g, 'DEMO', W - 28, ty + 5, '#ffd0d0');
      const v = DQ.VIGNETTES[this.i]; if (v) DQ.UI.center(g, v.name, W / 2, 6, '#ffd36a');
      if (Math.floor(this.game.real * 2) % 2 === 0) { const s = 'Press any button {btn:confirm}'; DQ.Glyphs.text(g, this.game, s, Math.round(W / 2 - DQ.Glyphs.width(this.game, s) / 2), H - 44, '#fff0c0'); }
    });
  }
}
DQ.Attract = Attract;
DQ.ATTRACT_SCENES = (game) => ({
  attract: {
    input: DQ.Controls.PLAY, pausable: false, camera: { zoom: false },
    enter() { const s = this; game.setView(DQ.VIEW_ISO); game.setZoom(1); s.a = new Attract(game); s.ctx = s.a.ctx; s.ptr = game.input.pointer(); s.t = 0; game.cam.bounds = v => s.ctx.world.bounds(v); game.lights.enabled = true; if (game._audioX) { game._audioX.vol = .6; game._audioX.ctx = s.ctx; game._audioX.cur = null; } },
    exit() { const s = this; if (s.a && s.a.task) s.a.task.cancel(); if (game._audioX) game._audioX.vol = 1; const ctx = s.ctx; ctx.mode = 'attract'; ctx.camFocus = null; game.weather = null; },
    update(dt) {
      const s = this, I = game.input; s.t += dt;
      const p = I.pointer(), moved = p && s.ptr && Math.hypot(p[0] - s.ptr[0], p[1] - s.ptr[1]) > 8; if (!s.ptr && p) s.ptr = p.slice();
      const stick = (I.padMove && Math.hypot(...I.padMove) > .5) || (I.padAim && Math.hypot(...I.padAim) > .5);
      if ((I.anyPressed() && s.t > .1 && !(I._apTap !== undefined && I.clock - I._apTap < .1)) || moved || stick || I.clicked()) { game.go('title', null, { fade: .3 }); return; }
      s.a.update(dt);
    },
    draw(r) { this.a.draw(r); }
  }
});
})();
