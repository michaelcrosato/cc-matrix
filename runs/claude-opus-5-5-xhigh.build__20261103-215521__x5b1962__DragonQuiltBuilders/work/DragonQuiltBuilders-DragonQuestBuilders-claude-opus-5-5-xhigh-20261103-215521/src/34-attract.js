// The attract mode: after 10 s without input on the title, an AI builder plays vignettes of the whole demo in a world of
// its own (cheats on: invulnerable, infinite materials, fast placing, teleports), looping with a logo card. Any input
// returns to the title. It never touches the player's save or settings.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const F = (g, s, x, y, c, o) => E.font.text(g, DQ.safe(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const FW = s => E.font.width(DQ.safe(s));
const A = DQ.Attract = {
  _lp: null,
  /** any key, button, click, a mouse move over 8 px, a stick past .5 */
  anyInput(game) {
    const I = game.input; let any = false;
    if (I.anyPressed && I.anyPressed()) any = true;
    if (I.held && I.held.size) any = true;
    const p = I.pointer ? I.pointer() : null; if (p) { if (A._lp && Math.hypot(p[0] - A._lp[0], p[1] - A._lp[1]) > 8) any = true; A._lp = p.slice(); }
    if (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .5) any = true; if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .5) any = true;
    if (I.clicked && I.clicked()) any = true;
    if (DQ.Controls._wheelAcc) { any = true; DQ.Controls._wheelAcc = 0; }
    return any;
  },
  VIGNETTES: [
    { name: 'Morning in Thimbleton', len: 12, run: function* (ctx, ap) { ctx.clock.setHour(7.5); const t = ctx.town; ctx.camFocus = { x: (t.x - 8) * T, y: (t.y - 6) * T, z: t.L * T + 10 }; ap.teleport(t.x + 1, t.y + 3, t.L); yield DQ.game.tween(ctx.camFocus, { x: (t.x + 8) * T, y: (t.y + 8) * T }, 11, { ease: 'inOutSine' }); ctx.camFocus = null; } },
    { name: 'Gathering', len: 14, run: function* (ctx, ap) { ctx.clock.setHour(10); const b = ap.b; ap.teleport(56, 62, ctx.world.topZ(56, 62));
      const tufts = ctx.objects.list.filter(o => o.def.plant && Math.hypot(o.x - 56, o.y - 62) < 9).slice(0, 3);
      for (const o of tufts) yield* ap.breakAt(o.x, o.y, o.z, { timeout: 3 });
      for (let k = 0; k < 3; k++) { const x = b.cx + 1 + k, y = b.cy + 1, z = ctx.world.topZ(x, y) - 1; if (z > 1) yield* ap.breakAt(x, y, z, { timeout: 2.5 }); }
      ctx.crafting.known.delete('strawBed'); ctx.crafting.learn('strawBed'); yield 2.5; } },
    { name: 'Crafting', len: 10, run: function* (ctx, ap) { const bench = ctx.objects.list.find(o => o.def.station === 'bench'); if (bench) { ap.teleport(bench.x, bench.y + 1, bench.z); yield .4; yield* ap.craft('strawBed', 1); } yield 1.5; } },
    { name: 'Raising a room', len: 24, run: function* (ctx, ap) {
      const w = ctx.world, x0 = 86, y0 = 66, L = w.topZ(88, 68); for (let y = y0 - 1; y <= y0 + 5; y++) for (let x = x0 - 1; x <= x0 + 5; x++) for (let z = L; z < L + 3; z++) { w.set(x, y, z, 0, { silent: true }); const o = ctx.objects.at(x, y, z); if (o) ctx.objects.remove(o, { silent: true }); }
      ap.teleport(x0 + 2, y0 + 6, L); yield .3; const cells = [];
      for (let z = L; z < L + 2; z++) for (let y = y0; y < y0 + 5; y++) for (let x = x0; x < x0 + 5; x++) { const edge = x === x0 || y === y0 || x === x0 + 4 || y === y0 + 4; if (!edge) continue; if (x === x0 + 2 && y === y0 + 4) continue; cells.push({ x, y, z, block: DQ.blockId(z === L ? 'cobble' : 'planks') }); }
      yield* ap.buildStamp(cells);
      yield* ap.placeAt(x0 + 2, y0 + 4, L, 'plankDoor', { facing: 1 }); ap.teleport(x0 + 2, y0 + 2, L); yield .2;
      yield* ap.placeAt(x0 + 1, y0 + 1, L, 'strawBed', { facing: 1, noWalk: true }); yield* ap.placeAt(x0 + 3, y0 + 1, L, 'torch', { noWalk: true });
      yield 2; for (const n of ctx.npcs.list.slice(0, 2)) ctx.npcs.bubbles.push({ x: n.x, y: n.y, z: n.z + 34, owner: n, need: 'comfort', t: 0, fly: null });
      ap.teleport(x0 + 2, y0 + 6, L); yield 3; } },
    { name: 'Skirmish', len: 16, run: function* (ctx, ap) { const b = ap.b, x = 60, y = 96, L = ctx.world.topZ(x, y); ap.teleport(x, y, L); ctx.monsters.enabled = false; for (const [k, dx, dy] of [['lintling', 3, 0], ['lintling', 2, 2], ['lintling', -2, 2], ['pinhog', 0, 4]]) ctx.monsters.spawn(k, x + dx, y + dy); ctx.flags.spinStitch = true; yield .5; yield* ap.fight({ range: 10, timeout: 13 }); yield 1; } },
    { name: 'Nightfall', len: 10, run: function* (ctx, ap) { const t = ctx.town; ap.teleport(t.x, t.y + 2, t.L); ctx.clock.setHour(20.6); ctx.clock.frozen = false; for (let i = 0; i < 3; i++) ctx.monsters.spawn('mothlet', t.x + 14 + i * 2, t.y - 8); yield 9; ctx.monsters.clear(); ctx.clock.frozen = true; } },
    { name: 'Siege', len: 18, run: function* (ctx, ap) {
      const t = ctx.town, w = ctx.world; ctx.clock.setHour(15); ap.teleport(t.x + 2, t.y, t.L);
      for (const [dx, dy] of [[5, -1], [5, 2]]) { const x = t.x + dx, y = t.y + dy, L = w.topZ(x, y); if (!ctx.objects.at(x, y, L)) ctx.objects.add('ballista', x, y, L, 0, { silent: true }); }
      for (let y = t.y - 3; y <= t.y + 3; y++) for (let z = t.L; z < t.L + 2; z++) w.set(t.x + 9, y, z, DQ.blockId('cobble'), { silent: true, town: true });
      ctx.siege.begin({ prep: 0 }); ctx.siege.waves = [{ name: 'The Knotted army!', from: ['east'], list: [['lintling', 5], ['knotbrute', 1], ['frayedKnight', 1]] }]; ctx.siege.spawns = { east: [t.x + 16, t.y] }; ctx.siege.phase = 'prep'; ctx.siege.t = 0;
      const bal = ctx.objects.list.find(o => o.def.ballista); yield 3; const tgt = ctx.monsters.list.find(m => m.kind === 'knotbrute');
      if (bal && tgt) yield* ap.manBallista(bal, tgt, { timeout: 8 }); yield* ap.fight({ range: 16, timeout: 6 });
      ctx.siege.end(true); ctx.monsters.clear(); } },
    { name: 'Gnarlgrim', len: 16, run: function* (ctx, ap) {
      const t = ctx.town, w = ctx.world; ap.b.bag.add('seamRipper', 1); ap.b.equipItem('seamRipper');
      const m = ctx.bosses.spawnGnarlgrim({ x: t.x + 8, y: t.y + 1 }); m.hp = Math.round(m.maxHp * .3); m.brain.phase = 3; ctx.siege.active = true; ctx.siege.phase = 'boss';
      const bal = ctx.objects.list.find(o => o.def.ballista && !o.data.broken) || ctx.objects.add('ballista', t.x + 3, t.y - 2, w.topZ(t.x + 3, t.y - 2), 0, { silent: true });
      bal.data.broken = false; yield .5; yield* ap.manBallista(bal, m, { untilTangled: true, timeout: 8 });
      if (!(m.tangled > 0)) m.brain.tangle(); yield* ap.walkTo(m.cx - 1, m.cy, m.L, { radius: 1.5 }); ap.b.targetFacing = Math.atan2(m.y - ap.b.y, m.x - ap.b.x);
      for (let k = 0; k < 30 && !m.dead; k++) { ap.b.targetFacing = Math.atan2(m.y - ap.b.y, m.x - ap.b.x); ap.want.swing = true; yield .2; if (!(m.tangled > 0) && !m.dead) m.brain.tangle(); }
      for (let i = 0; i < 5; i++) { DQ.game.particles.bits(t.x * T + 8, t.y * T + 8, t.L * T + 60, 20, ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a']); yield .3; }
      ctx.siege.active = false; ctx.siege.phase = 'none'; ctx.flags.boss_gnarlgrim = false; ctx.flags.bossDone = false; yield 1.5; } },
    { name: 'Quilting Bee', len: 10, bee: true, run: function* (ctx, ap) { yield 10; } }
  ]
};
DQ.SCENES.attract = {
  touch: [],
  enter() {
    this.vi = -1; this.t = 0; this.card = 4; this.ctx = null; this.ap = null; this.bee = null; DQ.Controls._wheelAcc = 0;
    const G = DQ.game; G.setView('iso'); G.resetCamera(); G.setZoom(1); this.vol = G.audio.volume; G.audio.setVolume(this.vol * .6); this.armed = .4;
    this.loop();
  },
  exit() { const G = DQ.game; if (this.ap) this.ap.stop(); G.audio.setVolume(this.vol); this.endBee(); DQ._demo = null; DQ.ctx = DQ._prevCtx || DQ.ctx; },
  loop() { DQ._demo = null; this.ctx = DQ.demoCtx(); DQ._prevCtx = DQ._prevCtx || DQ.ctx; this.ctx.dev.god = true; this.ap = new DQ.Autopilot(this.ctx, this.ctx.builder, { cheats: { god: true, infinite: true, fastPlace: true, teleport: true }, ui: true, autoTalk: 1.1 }); this.ctx.builder.local = false; this.card = 4; this.vi = -1; },
  next() {
    this.vi++; if (this.vi >= A.VIGNETTES.length) { this.loop(); return; }
    const v = A.VIGNETTES[this.vi]; this.vt = 0; this.endBee();
    if (v.bee && DQ.Bee) { this.bee = DQ.Bee.demo(); this.ap.stop(); return; }
    this.ap.run(v.run(this.ctx, this.ap));
  },
  endBee() { if (this.bee) { this.bee.stop && this.bee.stop(); this.bee = null; } },
  update(dt) {
    const G = DQ.game; this.t += dt; this.armed -= dt;
    if (this.armed <= 0 && A.anyInput(G)) { G.go('title'); return; }
    if (this.card > 0) { this.card -= dt; const t = this.ctx.town; G.focus(t.x * T, t.y * T, t.L * T + 10); if (this.card <= 0) this.next(); return; }
    const v = A.VIGNETTES[this.vi]; this.vt += dt;
    if (this.bee) { this.bee.update(dt); if (this.vt > v.len) { this.endBee(); this.next(); } return; }
    DQ.ctx = this.ctx; DQ.Play.update(this.ctx, dt, { intent: () => this.ap.intent(), ai: this.ap });
    if (this.ap.done || this.vt > v.len + 4) { this.ap.stop(); this.next(); }
  },
  draw(r) {
    const W = r.W, H = r.H;
    if (this.bee) this.bee.draw(r); else DQ.Play.draw(this.ctx, r, { noHud: !!this.card });
    r.overlay(g => {
      if (this.card > 0) { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#06051a')); DQ.Title.logo(g, W / 2, Math.round(H * .3), this.t); F(g, 'An original block-building action RPG', W / 2 - FW('An original block-building action RPG') / 2, H * .3 + 56, '#ffe9a0'); }
      else { E.font.title(g, 'DRAGON QUILT', 44, 6, { scale: 1, colors: ['#9ae07a', '#c83a4a'], align: 'center', outline: '#1a1020' }); E.font.text(g, 'BUILDERS', 22, 16, '#ffe070', { outline: '#2a1410', font: 'tiny' }); const v = A.VIGNETTES[this.vi]; if (v) { DQ.Hud.panel(g, W / 2 - FW(v.name) / 2 - 8, H - 46, FW(v.name) + 16, 14, { gold: true }); F(g, v.name, W / 2 - FW(v.name) / 2, H - 43, '#ffe070'); } }
      const ca = DQ.game.cornerArea && DQ.game.cornerArea(), top = ca ? Math.round(ca.y1) + 4 : 6;
      DQ.Hud.panel(g, W - 48, top, 42, 14, {}); F(g, 'DEMO', W - 39, top + 3, '#ff9a8a');
      if (Math.floor(this.t * 2) % 2) { const s = DQ.touchOnly() ? 'Tap to return' : (DQ.Glyphs.family(DQ.game) === 'ps' || DQ.Glyphs.family(DQ.game) === 'xbox' ? 'Press any button' : 'Press any key'); DQ.Hud.panel(g, W / 2 - FW(s) / 2 - 8, H - 24, FW(s) + 16, 14, {}); F(g, s, W / 2 - FW(s) / 2, H - 21, '#ffffff'); }
    });
  }
};
})();
