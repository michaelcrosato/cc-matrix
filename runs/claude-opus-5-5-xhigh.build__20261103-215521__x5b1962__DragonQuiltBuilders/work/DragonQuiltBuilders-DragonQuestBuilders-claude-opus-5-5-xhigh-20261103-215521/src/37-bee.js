// The Quilting Bee: a co-op round on Bumblebee Meadow (48 x 48). Raise the Quilt Barn Pattern together (it grows with the
// player count), then hold off three raid waves. AI Hub shared-world sessions (1-4 players, the game's own card), or solo
// from the title with optional bot builders. The host runs the round and reports standings with finish().
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const F = (g, s, x, y, c, o) => E.font.text(g, DQ.safe(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#05040a' }, o || {}));
const FW = s => E.font.width(DQ.safe(s));
const SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const BEE = DQ.BEE_WORLD = { W: 48, D: 48, H: 16, seed: 0xBEE,
  poi: { banner: { x: 24, y: 26 }, site: { x: 26, y: 16 }, bench: { x: 20, y: 26 }, crate: { x: 22, y: 28 }, start: { x: 24, y: 30 } },
  regions: null, town: { x: 24, y: 26, flat: 30 } };
const B = k => DQ.blockId(k);
DQ.Bee = {
  /** Bumblebee Meadow: a flat meadow with a void ring, trees NE, stone NW, bushes S, tufts W */
  gen(w) {
    const objs = [], R = DQ.rng('bee', BEE.seed), WG = DQ.WG;
    for (let y = 0; y < w.D; y++) for (let x = 0; x < w.W; x++) {
      const ring = x < 2 || y < 2 || x > w.W - 3 || y > w.D - 3; if (ring) { WG.column(w, x, y, 0); continue; }
      const lv = 5 + ((x - 24) ** 2 + (y - 22) ** 2 > 380 && E.noise2(x / 5 + 3, y / 5) > .62 ? 1 : 0);
      WG.column(w, x, y, lv, 'grass', 'earth', 'stone', 2);
    }
    for (let y = 22; y <= 32; y++) for (let x = 18; x <= 30; x++) WG.column(w, x, y, 5, 'grass', 'earth', 'stone', 2);
    for (let y = 15; y <= 21; y++) for (let x = 25; x <= 33; x++) WG.column(w, x, y, 5, 'grass', 'earth', 'stone', 2);
    // stone outcrops with gravel (NW)
    for (const [cx, cy] of [[6, 8], [10, 12], [5, 13], [11, 7]]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const h = 5 + (dx === 0 && dy === 0 ? 2 : 1); for (let z = 5; z < h; z++) w.vox[w.idx(cx + dx, cy + dy, z)] = B(z === h - 1 && (dx || dy) ? 'gravel' : 'stone'); }
    // trees (NE)
    for (const [x, y] of [[35, 7], [39, 9], [43, 7], [36, 12], [41, 13], [44, 11]]) WG.tree(w, x, y, w.topZ ? 5 : 5, R, { h: 4 });
    // plants: cotton and berries (S), tufts (W), dead bushes
    for (const [id, x, y] of [['cottonPuff', 17, 39], ['berryBush', 20, 41], ['cottonPuff', 24, 40], ['berryBush', 28, 42], ['cottonPuff', 31, 39], ['berryBush', 22, 44], ['tuft', 5, 25], ['tuft', 7, 28], ['tuft', 9, 31], ['tuft', 6, 33], ['deadBush', 8, 26], ['deadBush', 10, 34], ['deadBush', 14, 20], ['deadBush', 38, 30]]) objs.push({ id, x, y, z: 5, facing: Math.floor(R() * 4) });
    objs.push({ id: 'bench', x: 20, y: 26, z: 5, facing: 1 }, { id: 'hearthPot', x: 20, y: 28, z: 5, facing: 1 }, { id: 'supplyCrate', x: 22, y: 28, z: 5, facing: 1 }, { id: 'barrel', x: 18, y: 24, z: 5, facing: 0 }, { id: 'sack', x: 18, y: 30, z: 5, facing: 2 });
    WG.recalc(w);
    const poi = {}; for (const k in BEE.poi) poi[k] = Object.assign({ L: w.topZ(BEE.poi[k].x, BEE.poi[k].y) }, BEE.poi[k]);
    poi.bannerSpot = poi.banner;
    return { objects: objs, poi };
  },
  makeCtx(game, o = {}) {
    const ctx = DQ.Play.make(game, { mode: 'bee', def: BEE, gen: w => DQ.Bee.gen(w), spawn: [24, 31, 5], noButtons: true, siege: { bee: true, breather: 8 } });
    ctx.crafting.allKnown = true; ctx.monsters.enabled = false; ctx.clock.setHour(10); ctx.clock.frozen = true;
    ctx.town.plant(24, 26, 5, { instant: true }); ctx.town.level = 5; ctx.town.rDisp = 20; ctx.town.banner.hp = 200; ctx.town.banner.def = Object.assign({}, ctx.town.banner.def, { hp: 200 });
    ctx.bee = null;
    return ctx;
  },
  /** the attract mode's vignette: three bots raise the barn on a fresh meadow */
  demo() {
    const G = DQ.game, ctx = DQ.Bee.makeCtx(G), round = new Round(ctx, { solo: true, bots: 3, players: [{ id: 0, name: 'Patch', color: SEAT[0] }], demo: true });
    round.begin(); round.fast = true; const ap = new DQ.Autopilot(ctx, ctx.builder, { cheats: { infinite: true, fastPlace: true, teleport: true } }); ctx.builder.local = false;
    ap.run(round.botTask(ap, 0, true));
    return { ctx, round, update: dt => { DQ.Play.update(ctx, dt, { intent: () => ap.intent(), ai: ap }); round.update(dt); }, draw: r => { DQ.Play.draw(ctx, r, { noHud: true }); round.drawHud(r); }, stop: () => { ap.stop(); for (const b of round.bots) b.ap.stop(); } };
  }
};
class Round {
  constructor(ctx, o) {
    this.ctx = ctx; this.o = o; this.players = o.players || [{ id: 0, name: 'Patch', color: SEAT[0] }]; this.hub = o.hub || null; this.net = o.net || null;
    this.phase = 'build'; this.total = o.limitMs ? Math.min(480, o.limitMs / 1000) : 480; this.buildLen = this.total * 5 / 8; this.left = this.total; this.t = 0;
    this.scores = {}; this.stats = {}; for (const p of this.players) { this.scores[p.id] = 0; this.stats[p.id] = { Blocks: 0, Monsters: 0, Crafted: 0, items: 0 }; }
    this.bots = []; this.crateUse = {}; this.finished = false; this.won = null; this.pattern = null;
    ctx.bee = this; this.wire();
  }
  get isHost() { return !this.net || this.net.host; }
  spawnFor(id) { const k = this.players.findIndex(p => p.id === id); return [(22 + (k % 4) * 1.5) * T + 8, 31 * T + 8, 5 * T]; }
  patternDef() { const n = this.players.length + (this.o.bots || 0); return DQ.WORLD.patterns[n <= 1 ? 'barn1' : n === 2 ? 'barn2' : 'barn3']; }
  begin() {
    const ctx = this.ctx, def = this.patternDef(), b = ctx.builder;
    this.pattern = ctx.town.placePattern(def, 26, 16, 5, 0, { silent: true });
    // each player's kit: a club for stone, some planks, and the crate gives more
    const kit = [['cobbleClub', 1], ['planks', 6], ['branch', 4], ['earth', 6], ['bun', 2]];
    if (b && (!this.net || !this.net.server)) { for (const [id, n] of kit) b.bag.add(id, n); b.equipItem('cobbleClub'); b.bag.hotbar = ['cobble', 'planks', 'feltRed', 'latticeDoor', 'torch', 'bun', null, null]; }
    if (this.net && this.net.host) for (const p of this.players) if (p.id !== this.net.me) this.net.event(['kit', p.id, kit]);
    // bots (solo)
    for (let i = 0; i < (this.o.bots || 0); i++) {
      const id = 100 + i, sp = [(23 + i * 1.5) * T + 8, 32 * T + 8, 5 * T], bb = new DQ.Builder(ctx, { id, name: ['Bobbin', 'Tuffet', 'Quill'][i], color: SEAT[(i + 1) % 4], x: sp[0], y: sp[1], z: sp[2], local: false });
      bb.bag.add('cobbleClub', 1); bb.equipItem('cobbleClub'); const ap = new DQ.Autopilot(ctx, bb, { cheats: { infinite: true, fastPlace: !!this.o.demo, teleport: !!this.o.demo } }); bb.ai = ap; bb.ap = ap; ctx.builders.push(bb); this.bots.push(bb);
      this.players.push({ id, name: bb.name, color: bb.color, bot: true }); this.scores[id] = 0; this.stats[id] = { Blocks: 0, Monsters: 0, Crafted: 0, items: 0 };
      ap.run(this.botTask(ap, i + 1, !!this.o.demo));
    }
    for (let i = 0; i < 3; i++) ctx.monsters.spawn('lintling', 8 + i * 14, 40, undefined, { fixed: true });
    DQ.AudioX && DQ.AudioX.music('bee');
  }
  wire() {
    const ev = this.ctx.events, idOf = by => by && by.isBuilder ? by.id : null;
    ev.on('patternCell', e => { if (!this.isHost) return; const by = this.lastPlacer; const id = by !== null && by !== undefined ? by : null; if (id === null) return; this.add(id, e.cell.obj ? 5 : 3); if (!e.cell.obj) this.stats[id] && this.stats[id].Blocks++; });
    ev.on('blockPlaced', e => { this.lastPlacer = idOf(e.by); this.ctx.town.markDirty(e.x, e.y); if (this.ctx.town.patterns[0]) this.ctx.town.checkPattern(this.ctx.town.patterns[0]); });
    ev.on('objectPlaced', e => { this.lastPlacer = idOf(e.by); if (this.ctx.town.patterns[0]) this.ctx.town.checkPattern(this.ctx.town.patterns[0]); });
    ev.on('monsterKilled', e => { if (!this.isHost) return; const id = idOf(e.by); if (id === null) return; this.add(id, e.kind === 'knotbrute' ? 15 : 5); if (this.stats[id]) this.stats[id].Monsters++; });
    ev.on('itemGained', e => { if (!this.isHost || e.crafted) return; const id = idOf(e.by); if (id === null || !this.stats[id]) return; this.stats[id].items += e.n; while (this.stats[id].items >= 5) { this.stats[id].items -= 5; this.add(id, 1); } });
    ev.on('crafted', e => { const b = e.by; if (!b || !b.isBuilder) return; if (this.isHost) { if (!b.remote) this.crafted(b.id, e.id); } else if (b.local && this.net) this.net.sendOp(['craft', e.id]); });
    ev.on('patternDone', () => { if (this.ctx.hud) this.ctx.hud.banner('The Quilt Barn is up!', 'Now hold it!'); DQ.AudioX && DQ.AudioX.jingle('room'); });
  }
  add(id, n) { if (this.scores[id] === undefined) this.scores[id] = 0; this.scores[id] += n; if (this.net && this.net.host) this.net.event(['score', id, this.scores[id]]); }
  /** a craft: 1 point and a Crafted stat (the host counts its own and bots' crafts; clients report theirs as an op) */
  crafted(id, item) { if (!this.isHost || !this.stats[id] || !DQ.ITEMS[item]) return; this.stats[id].Crafted++; this.add(id, 1); }
  /** the Supply Crate: 10 Planks once a minute per player (and 2 Lint the first time) */
  crate(b, o, remoteCall) {
    const ctx = this.ctx; if (this.net && this.net.client && b.local) { this.net.sendOp(['take']); DQ.sfx('zipper'); return; }
    const id = b.id, now = this.t; if (this.crateUse[id] !== undefined && now - this.crateUse[id] < 60) { if (b.local) ctx.hud.toast('The crate is empty. Try again in ' + Math.ceil(60 - (now - this.crateUse[id])) + ' s.', 'planks'); return; }
    const first = this.crateUse[id] === undefined; this.crateUse[id] = now; const give = [['planks', 10]].concat(first ? [['lint', 2]] : []);
    if (b.remote && this.net && this.net.host) this.net.event(['kit', id, give]); else for (const [k, n] of give) { b.bag.add(k, n); ctx.events.emit('itemGained', { id: k, n, by: b }); if (b.local) ctx.hud.pickup(k, n); }
    DQ.sfx('zipper');
  }
  progress() { const p = this.ctx.town.patterns[0]; return p ? p.progress / p.total : 0; }
  setPhase(ph, fromNet) {
    if (this.phase === ph) return; this.phase = ph; const ctx = this.ctx;
    if (ph === 'raid') { if (ctx.hud) ctx.hud.banner('The raid begins!', 'Defend the barn and the Banner!'); DQ.AudioX && DQ.AudioX.layer('raid', 1); if (this.isHost) this.startRaid(); }
    if (ph === 'over') { if (ctx.hud) ctx.hud.banner('Round over!', ''); }
    if (this.net && this.net.host && !fromNet) this.net.event(['phase', ph]);
  }
  startRaid() {
    const ctx = this.ctx, n = this.players.length, S = ctx.siege;
    S.waves = [{ name: 'Raid wave 1', from: ['nw', 'ne', 'sw', 'se'], list: [['lintling', 4 + 2 * n]] }, { name: 'Raid wave 2', from: ['nw', 'ne', 'sw', 'se'], list: [['pinhog', 2 + n], ['lintling', 2]] }, { name: 'Raid wave 3', from: ['ne', 'se'], list: [['knotbrute', Math.max(1, Math.floor(n / 2))], ['lintling', 2 + n]] }];
    S.spawns = { nw: [4, 4], ne: [43, 4], sw: [4, 43], se: [43, 43] }; S.o.sizeK = 1; S.begin({ prep: 1 });
  }
  /** the round's clock: AIHub.time() in a session, the round's own time solo */
  update(dt) {
    if (this.finished) return; this.t += dt * (this.fast ? 1 : 1);
    const hub = this.hub; let t = hub ? hub.time() / 1000 : this.t; if (!isFinite(t)) t = 0;
    this.left = Math.max(0, this.total - t);
    if (this.isHost) {
      if (t >= this.buildLen && this.phase === 'build') this.setPhase('raid');
      if (this.phase === 'raid' && this.ctx.siege.phase === 'done' && !this.ctx.siege.active) this.raidDone = true;
      const ban = this.ctx.town.banner; if (ban && ban.hp <= 0 && this.phase !== 'over') { this.ctx.siege.active = false; this.finish('banner'); }
      if (t >= this.total && this.phase !== 'over') this.finish('time');
      if (this.o.demo && this.progress() >= 1) this.won = true;
    }
  }
  finish(why) {
    if (this.finished) return; this.finished = true; this.setPhase('over');
    const ban = this.ctx.town.banner, won = this.progress() >= 1 && !!ban && ban.hp > 0; this.won = won;
    const ids = this.players.filter(p => !p.bot && !p.gone).map(p => p.id), byScore = {};
    for (const id of ids) (byScore[this.scores[id] || 0] = byScore[this.scores[id] || 0] || []).push(id);
    const standings = Object.keys(byScore).map(Number).sort((a, b) => b - a).map(k => byScore[k]);
    const stats = {}; for (const id of ids) stats[id] = { Blocks: this.stats[id] ? this.stats[id].Blocks : 0, Monsters: this.stats[id] ? this.stats[id].Monsters : 0, Crafted: this.stats[id] ? this.stats[id].Crafted : 0 };
    const best = k => ids.slice().sort((a, b) => (stats[b][k] || 0) - (stats[a][k] || 0))[0], awards = [];
    if (ids.length) { const mq = best('Blocks'), kc = best('Monsters'); if (stats[mq].Blocks) awards.push({ id: mq, title: 'Master Quilter', detail: stats[mq].Blocks + ' blocks' }); if (stats[kc].Monsters) awards.push({ id: kc, title: 'Knot Cutter', detail: stats[kc].Monsters + ' monsters' }); }
    const scores = {}; for (const id of ids) scores[id] = this.scores[id] || 0;
    if (this.hub && this.net && this.net.host) { try { this.hub.finish({ standings, scores, won, stats, awards }); } catch (e) { DQ.fail('finish', e); } }
    if (!this.hub && !this.o.demo) { const me = this.scores[0] || 0, best0 = DQ.store.get('beeBest', 0); if (me > best0) DQ.store.set('beeBest', me); this.best = Math.max(me, best0); }
    this.result = { standings, scores, won, why };
    this.ctx.events.emit('beeFinish', this.result);
  }
  fromSnapshot(s) { this.left = s.left / 1000; if (s.ph && s.ph !== this.phase) this.setPhase(s.ph, true); if (this.ctx.town.banner) this.ctx.town.banner.hp = s.bhp; if (s.sc) Object.assign(this.scores, s.sc); }
  /** a bot builder: gather a little, then place the next ghost block; fight in the raid */
  *botTask(ap, k, fast) {
    const ctx = this.ctx, b = ap.b;
    for (let guard = 0; guard < 2000; guard++) {
      if (this.finished) { yield 1; continue; }
      if (this.phase === 'raid' && ctx.monsters.list.some(m => !m.dead && Math.hypot(m.x - b.x, m.y - b.y) < 10 * T)) { yield* ap.fight({ range: 10, timeout: 6 }); continue; }
      const p = ctx.town.patterns[0]; if (!p || p.done) { yield* ap.walkTo(24 + k, 30, 5, { radius: 1 }); yield 1; continue; }
      const left = p.cells.filter(c => !c.done && !c.claimedBy); const minZ = Math.min(...left.map(c => c.z)); const lvl = left.filter(c => c.z === minZ);
      const c = lvl[(k * 7 + guard) % Math.max(1, lvl.length)]; if (!c) { yield .5; continue; }
      c.claimedBy = b.id;
      if (!fast && guard % 5 === 0) { const src = c.block === B('cobble') ? [6, 9, 6] : c.block === B('planks') ? [22, 29, 5] : [20, 41, 5]; yield* ap.walkTo(src[0], src[1], src[2], { radius: 1.5 }); b.anim = { kind: 'hammer', t: 0, dur: 1.2 }; yield 1.2; }
      yield* ap.placeAt(c.x, c.y, c.z, c.block ? DQ.BLOCKS[c.block].key : c.obj, { facing: c.facing, timeout: 4 });
      c.claimedBy = null; yield fast ? .05 : .6;
    }
  }
  // ---------------------------------------------------------------- the round's HUD
  drawHud(r) {
    const ctx = this.ctx;
    r.overlay(g => {
      const W = r.W, H = r.H, p = ctx.town.patterns[0], cx = Math.max(W / 2, 236);
      DQ.Hud.panel(g, cx - 70, 6, 140, 30, { alpha: .85, gold: true });
      F(g, (this.phase === 'build' ? 'BUILD ' : this.phase === 'raid' ? 'RAID ' : 'OVER ') + DQ.fmtTime(this.left), cx - FW((this.phase === 'build' ? 'BUILD ' : this.phase === 'raid' ? 'RAID ' : 'OVER ') + DQ.fmtTime(this.left)) / 2, 10, '#ffe070');
      if (p) { px.rect(g, cx - 60, 24, 120, 5, '#3a2a10'); px.rect(g, cx - 60, 24, Math.round(120 * p.progress / p.total), 5, '#8adc8a'); F(g, 'Barn ' + p.progress + '/' + p.total, cx - 60, 22, '#ffffff', { font: 'tiny' }); }
      const ban = ctx.town.banner; if (ban) { px.rect(g, cx - 60, 31, 120, 3, '#3a1020'); px.rect(g, cx - 60, 31, Math.round(120 * Math.max(0, ban.hp) / 200), 3, '#ffd060'); }
      let y = 44; for (const pl of this.players) { if (pl.gone) continue; DQ.Hud.panel(g, 6, y, 96, 13, { alpha: .8 }); px.rect(g, 9, y + 3, 6, 6, pl.color); F(g, DQ.safe(pl.name).slice(0, 10), 18, y + 3, '#ffffff'); F(g, String(this.scores[pl.id] || 0), 96 - FW(String(this.scores[pl.id] || 0)), y + 3, '#ffe070'); y += 15; }
      if (this.finished && !this.o.demo) {
        const w = 220, h = 84, x = (W - w) / 2, yy = H * .3; DQ.Hud.panel(g, x, yy, w, h, { gold: true });
        E.font.title(g, this.won ? 'BARN SAVED!' : 'ROUND OVER', W / 2, yy + 8, { scale: 2, colors: this.won ? ['#c8ffc8', '#5aa04a'] : ['#ffffff', '#c8c0e0'], align: 'center', outline: '#140c1c' });
        F(g, this.won ? 'The Quilt Barn stands. Well stitched, everyone!' : 'The Knotted raid got the better of you this time.', x + 10, yy + 34, '#ffffff');
        if (!this.hub) { F(g, 'Your score: ' + (this.scores[0] || 0) + '   Best: ' + (this.best || 0), x + 10, yy + 48, '#ffe070'); DQ.Glyphs.text(g, DQ.game, '{btn:ok} Back to title', x + 10, yy + 64, '#c8c0e0'); }
      }
    });
  }
}
DQ.BeeRound = Round;

// ================================================================ the scene
DQ.SCENES.bee = {
  touch: [], camera: { zoom: false },
  enter(d = {}) {
    const G = DQ.game; this.d = d; this.state = 'setup'; this.t = 0; this.bots = DQ.store.get('beeBots', 1); this.menuI = 0; this.ended = false;
    G.setView('iso'); G.resetCamera(); G.setZoom(1); G.input.use(DQ.Controls.PLAY); DQ.Controls.install(G);
    this.ctx = DQ.ctx = DQ.Bee.makeCtx(G); G.cam.bounds = v => this.ctx.world.bounds(v); G.cam.snap = true;
    if (DQ.HUB) { this.state = 'connecting'; this.connect(); }
    DQ.AudioX && DQ.AudioX.music('bee');
  },
  exit() { if (this.timer) clearInterval(this.timer); },
  async connect() {
    const hub = DQ.HUB, G = DQ.game;
    let info = null; try { info = await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { DQ.HUB = null; G.go('title'); return; }
    this.info = info; this.card = { left: null, ready: [], asking: 0, asked: false };
    hub.on('card', c => { this.card = Object.assign(this.card, c); });
    hub.on('start', s => { this.state = 'countdown'; this.startRound(); });
    hub.on('leave', e => { if (this.round) { const p = this.round.players.find(q => q.id === e.id); if (p) p.gone = true; } if (this.net) this.net.removePlayer(e.id); if (this.round && this.net && this.net.host && this.round.players.filter(p => !p.gone && !p.bot).length === 0) this.round.finish('left'); });
    hub.on('time-up', () => { if (this.round && this.net && this.net.host) this.round.finish('time-up'); });
    hub.on('end', () => this.end());
    // the world is built: ready, with no key press
    this.state = 'card'; hub.ready();
    // a hidden tab keeps the round running
    if (typeof document !== 'undefined') { let last = performance.now(); this.timer = setInterval(() => { const now = performance.now(); if (document.hidden && !this.ended) { G.advance(Math.min(1, (now - last) / 1000)); } last = now; }, 250); }
  },
  startRound() {
    const hub = DQ.HUB, info = this.info, ctx = this.ctx;
    const players = (info.players || []).map(p => ({ id: p.id, name: DQ.safe(p.name || 'Builder'), color: p.color || SEAT[p.id % 4] }));
    this.net = new DQ.Net(ctx, hub, {});
    this.round = new Round(ctx, { players, hub, net: this.net, limitMs: info.limitMs }); this.net.round = this.round;
    const b = ctx.builder;
    if (info.server || !players.some(p => p.id === info.me)) { ctx.builders = []; ctx.builder = null; this.server = true; }
    else { b.id = info.me; b.name = players.find(p => p.id === info.me).name; b.color = players.find(p => p.id === info.me).color; b.rig = DQ.makeBuilderRig(b.look, b.color); const sp = this.round.spawnFor(info.me); b.place3(...sp); }
    if (this.net.host) for (const p of players) if (p.id !== info.me) this.net.builderFor(p.id);
    this.round.begin();
  },
  startSolo() {
    const ctx = this.ctx; this.round = new Round(ctx, { solo: true, bots: this.bots, players: [{ id: 0, name: 'You', color: SEAT[0] }] }); this.round.begin(); this.state = 'play'; DQ.store.set('beeBots', this.bots);
  },
  end() { if (this.ended) return; this.ended = true; this.state = 'ended'; const G = DQ.game; if (this.net) this.net.end(); try { G.audio.mute(true); G.audio.music(null); } catch (e) { /* no sound */ } G.input.clear && G.input.clear(); },
  update(dt) {
    const G = DQ.game, I = G.input, ctx = this.ctx; this.t += dt;
    if (this.state === 'ended') return;
    if (this.state === 'setup') {
      if (I.repeat('up', .3, .1) || I.repeat('down', .3, .1)) { this.menuI = (this.menuI + 1) % 3; DQ.sfx('uiMove'); }
      if ((I.repeat('left', .3, .1) || I.repeat('right', .3, .1)) && this.menuI === 1) { this.bots = (this.bots + (I.repeat('left', .3, .1) ? 3 : 1)) % 4; DQ.sfx('uiMove'); }
      const c = I.clicked ? I.clicked() : null; if (c && this.rects) this.rects.forEach((q, i) => { if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { this.menuI = i; this.pick(); } });
      const p = I.lastDevice === 'mouse' && I.pointer ? I.pointer() : null; if (p && this.rects) this.rects.forEach((q, i) => { if (p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]) this.menuI = i; });
      if (I.pressed('ok')) this.pick(); if (I.pressed('back')) G.go('title');
      this.idleCam(); return;
    }
    if (this.state === 'connecting' || this.state === 'card') {
      if (this.state === 'card') {
        if (I.pressed('ok') || I.pressed('start') || I.pressed('confirm')) { DQ.HUB.answer('ready'); DQ.sfx('uiConfirm'); }
        if (I.pressed('alt2') || I.pressed('place')) { DQ.HUB.answer('more'); DQ.sfx('uiMove'); }
        const c = I.clicked ? I.clicked() : null; if (c && this.cardRects) { if (this.hitR(c, this.cardRects.ready)) DQ.HUB.answer('ready'); if (this.hitR(c, this.cardRects.more)) DQ.HUB.answer('more'); }
      }
      this.idleCam(); ctx.npcs.update(dt); return;
    }
    if (DQ.HUB && I.pressed('pause') && !I.down('satchel')) { ctx.hud.toast('Round in progress!', null, 'round'); }
    if (this.state === 'countdown') { const t = DQ.HUB.time(); if (t >= 0) this.state = 'play'; this.idleCam(); if (this.net) this.net.update(dt); return; }
    // play
    const solo = !DQ.HUB;
    if (this.round && this.round.finished && solo) { if (I.pressed('ok')) { G.go('title'); return; } }
    DQ.Play.update(ctx, dt, Object.assign({ noInput: this.server || (this.round && this.round.finished) }, ctx.driver && !this.server ? { intent: () => ctx.driver.intent(), ai: ctx.driver } : {}));
    if (this.round) this.round.update(dt);
    if (this.net) this.net.update(dt);
    if (this.server) this.idleCam();
  },
  hitR(c, q) { return q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]; },
  pick() { if (this.menuI === 0) this.startSolo(); else if (this.menuI === 1) { this.bots = (this.bots + 1) % 4; } else DQ.game.go('title'); DQ.sfx('uiConfirm'); },
  idleCam() { const a = this.t * .1; DQ.game.focus(24 * T + Math.cos(a) * 80, 22 * T + Math.sin(a) * 60, 5 * T + 10); },
  draw(r) {
    const ctx = this.ctx, W = r.W, H = r.H;
    if (this.server && this.state === 'play') { if (Math.floor(this.t) === this._lastDraw) { r.overlay(g => { F(g, 'Hosting the Bee', 8, 8, '#ffe070'); }); return; } this._lastDraw = Math.floor(this.t); }
    DQ.Play.draw(ctx, r, { noHud: this.state !== 'play' });
    if (this.round && this.state === 'play') this.round.drawHud(r);
    r.overlay(g => {
      if (this.state === 'setup') {
        DQ.Title.logo(g, W / 2, 16, this.t); E.font.title(g, 'QUILTING BEE', W / 2, 70, { scale: 2, colors: ['#fff0a0', '#e8b030'], align: 'center', outline: '#2a1410' });
        DQ.Hud.panel(g, W / 2 - 110, 96, 220, 100, { gold: true });
        DQ.wrapText('Raise the Quilt Barn on Bumblebee Meadow, then defend it from the Knotted raid! Gather, craft at the bench, and fill in the ghost blocks.', 200).forEach((l, i) => F(g, l, W / 2 - 100, 102 + i * 11, '#ffffff'));
        const items = ['Start the Bee', 'Bot friends: ' + (this.bots ? this.bots : 'Off'), 'Back']; this.rects = [];
        items.forEach((s, i) => { const y = 150 + i * 14, sel = i === this.menuI; if (sel) DQ.Hud.panel(g, W / 2 - 80, y - 3, 160, 13, { gold: true }); F(g, s, W / 2 - FW(s) / 2, y, sel ? '#ffe070' : '#ffffff'); this.rects.push([W / 2 - 80, y - 3, 160, 13]); });
        F(g, 'Best score: ' + DQ.store.get('beeBest', 0), W / 2 - 40, H - 22, '#c8c0e0');
      }
      if (this.state === 'connecting' || this.state === 'card') this.drawCard(g, W, H);
      if (this.state === 'countdown' && DQ.HUB) { const t = DQ.HUB.time(); const n = isFinite(t) ? Math.max(1, Math.ceil(-t / 1000)) : 3; E.font.title(g, String(n), W / 2, H / 2 - 20, { scale: 4, colors: ['#fff0a0', '#e8a040'], align: 'center', outline: '#2a1410' }); }
      if (this.state === 'ended') { DQ.Hud.panel(g, W / 2 - 60, H / 2 - 14, 120, 28, { gold: true }); F(g, 'Round over', W / 2 - FW('Round over') / 2, H / 2 - 4, '#ffe070'); }
    });
  },
  drawCard(g, W, H) {
    const info = this.info, c = this.card || {}, pl = (info && info.players) || [];
    px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#06051a'));
    DQ.Title.logo(g, W / 2, 10, this.t);
    E.font.title(g, 'QUILTING BEE', W / 2, 62, { scale: 1, colors: ['#fff0a0', '#e8b030'], align: 'center', outline: '#2a1410' });
    F(g, 'Raise the Quilt Barn together, then defend it!', W / 2 - FW('Raise the Quilt Barn together, then defend it!') / 2, 78, '#ffffff');
    pl.forEach((p, i) => { const x = W / 2 - pl.length * 40 + i * 80 + 40, y = 96; DQ.Hud.panel(g, x - 34, y, 68, 40, {}); px.rect(g, x - 30, y + 4, 60, 4, p.color || SEAT[i % 4]); F(g, DQ.safe(p.name || '').slice(0, 10), x - FW(DQ.safe(p.name || '').slice(0, 10)) / 2, y + 12, '#ffffff'); const rd = (c.ready || []).includes(p.id); F(g, rd ? 'READY' : '...', x - FW(rd ? 'READY' : '...') / 2, y + 26, rd ? '#8adc8a' : '#8a84a8'); });
    const lines = ['{btn:up}{btn:down}{btn:left}{btn:right} Move  {btn:jump} Jump  {btn:swing} Break  {btn:place} Place', '{btn:interact} Use the bench and the crate  {btn:hotPrev}{btn:hotNext} Items'];
    lines.forEach((l, i) => DQ.Glyphs.text(g, DQ.game, l, W / 2 - DQ.Glyphs.measure(DQ.game, l) / 2, 146 + i * 13, '#e8e4f4'));
    const left = c.left === null || c.left === undefined ? (c.starting ? 'Starting...' : c.paused ? 'Waiting for more time...' : '') : 'Starts in ' + Math.ceil(c.left / 1000) + ' s';
    F(g, left, W / 2 - FW(left) / 2, 176, '#ffe070');
    const rw = 80, ry = 190; this.cardRects = { ready: [W / 2 - rw - 6, ry, rw, 16], more: [W / 2 + 6, ry, rw, 16] };
    DQ.Hud.panel(g, ...this.cardRects.ready, { gold: true }); DQ.Glyphs.text(g, DQ.game, '{btn:ok} Ready', W / 2 - rw - 6 + 10, ry + 4, '#ffffff');
    DQ.Hud.panel(g, ...this.cardRects.more, { gold: c.asked }); DQ.Glyphs.text(g, DQ.game, '{btn:alt2} More time', W / 2 + 14, ry + 4, '#ffffff');
  }
};
})();
