/* SKILLER7 — the presenter: turns the sim's state into the 3D picture (the engine's World3D: cel filter, ink, rigs on
 * cards). A world per area (Room 7's stays alive), actors mirrored from the sim each step, set pieces drawn with the pen,
 * snow, footprints and breath, warm-spot glows, the scan ring, the first-person weapons on the overlay. It never changes
 * the sim; the sim never reads it. */
const WHITE = { skin: '#f6f6f4', hair: '#ffffff', cloth: '#ffffff', pants: '#ecedf2', boot: '#e8e8ee', eye: '#101010', trim: '#e0e4ee' };
const TINTS = ['#fff4f8', '#f4f8ff', '#f8fff4', '#fffbf0', '#f6f0ff'];
const NPC_LOOK = {
  villager: { outfit: 'coat', hair: 'short', colors: { skin: '#e8d0b8', cloth: '#6a4a3a', coat: '#6a4a3a', pants: '#3a2a20', hair: '#5a3a20' } }, villager2: { outfit: 'robe', hair: 'long', colors: { skin: '#e8d0b8', cloth: '#8a3a4a', hair: '#c8a060' } },
  instructor: { outfit: 'shirt', hair: 'short', hat: { style: 'beanie', color: '#c8302a', pom: '#ffffff' }, colors: { cloth: '#c8302a', pants: '#1a1a20' } },
  ambassador: { build: 'heroic', outfit: 'coat', hair: 'short', colors: { cloth: '#1a3a7a', coat: '#1a3a7a', pants: '#14141a', hair: '#c0c0c0' } }, general: { build: 'bulky', outfit: 'coat', hair: 'bald', hat: { style: 'cap', color: '#5a2a2a' }, colors: { cloth: '#5a4a4a', coat: '#5a4a4a', pants: '#3a2a2a', trim: '#d8b040' } },
  interpreter: { outfit: 'shirt', hair: 'ponytail', colors: { cloth: '#d8d0c0', pants: '#2a2a30', hair: '#3a2a20' } }, waiter: { outfit: 'coat', hair: 'short', colors: { cloth: '#f0f0f0', coat: '#f0f0f0', pants: '#141414' } },
  journalist: { outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#5a5a5a' }, colors: { cloth: '#8a7a5a', coat: '#8a7a5a' } }, secretary: { outfit: 'robe', hair: 'long', colors: { cloth: '#3a3a5a', hair: '#1a1a1a' } },
  frozen1: { outfit: 'coat', colors: { cloth: '#5a6a7a' } }, frozen2: { outfit: 'robe', hair: 'long', colors: { cloth: '#7a5a6a' } }, frozen3: { outfit: 'shirt', colors: { cloth: '#6a7a5a' } }, frozen4: { outfit: 'coat', hat: 'cap', colors: { cloth: '#4a4a5a' } }
};
const BAND_LOOK = { tuba: { build: 'bulky', colors: { cloth: '#f0ece0', pants: '#5a3a1e', trim: '#2e5a2e' } }, accordion: { colors: { cloth: '#f0ece0', pants: '#8a1a2a', trim: '#2e5a2e' } }, trumpet: { colors: { cloth: '#f0ece0', pants: '#5a3a1e', trim: '#2e5a2e' }, hat: { style: 'felt', color: '#4a4a4a' } }, snare: { hair: 'ponytail', colors: { cloth: '#f0ece0', pants: '#2a5a8a', trim: '#c8302a' } } };
const ECHO_COLS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const AT = (x, y, z = 0) => [x * M, y * M, z * M];

class Presenter3D {
  constructor(game, W3) { this.game = game; this.W3 = W3; this.worlds = {}; this.rec = null; this.titleOn = false; this.fx = { tracers: [], prints: [], puffT: 0 }; this.flakes = null; this.mouse = [0, 0]; }
  backend() { const R = this.W3 && this.W3.renderer; return R && R.backend && R.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2'; }
  init() {
    if (typeof window !== 'undefined' && window.ASSETS && window.ASSETS['kenney-holiday']) E.addAssets(window.ASSETS['kenney-holiday']);
    this.bus();
    this.ready = true;
    this.world('room7');
    if (typeof document !== 'undefined') {
      const cv = document.getElementById('screen');
      if (cv) cv.addEventListener('pointerdown', e => { const R0 = this.rec; if (!R0 || e.pointerType !== 'mouse' || S7.game.settings.mouseMode !== 'Look' || this.game.paused) return; if (e.button === 2 || G && G.aim.on) { R0.w.camera.capture = true; if (!document.pointerLockElement) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { S7.mouseFail = true; }); } catch (err) { S7.mouseFail = true; } } } });
      document.addEventListener('pointerlockerror', () => { if (!S7.mouseFail) { S7.mouseFail = true; S7.game.note && S7.game.note('MOUSE: POINTER MODE', 2); } });
      cv && cv.addEventListener('contextmenu', e => e.preventDefault());
    }
  }
  bus() {
    const P = () => this.game.particles, on = (t, f) => S7.bus.on(t, d => { if (this.rec) try { f(d); } catch (e) { this.game.fail('fx ' + t, e); } });
    on('explode', d => P().explosion(d.at[0], d.at[1], d.at[2], Math.max(.6, (d.radius || 1.5) / 2), { shake: 2 }));
    on('kill', d => { const e = d.enemy; if (e) { P().bits(e.x, e.y, e.z + 16, d.crit ? 22 : 12, ['#c8101e', '#ff3040', '#ffffff']); } });
    on('crit', d => { const e = d.enemy; if (e) P().bits(e.x, e.y, e.z + 22, 14, ['#ffffff', '#ff4050']); this.game.input.rumble && this.game.input.rumble(.4, .12); });
    on('hit', d => { const e = d.target; if (e && e.x !== undefined) P().sparks(e.x, e.y, e.z + 18, 4); });
    on('tink', d => P().sparks(d.at[0], d.at[1], d.at[2], 8)); on('deflect', d => P().glints(d.at[0], d.at[1], d.at[2], 6, '#ffe080'));
    on('shatter', d => P().bits(d.at[0], d.at[1], d.at[2], 10, ['#ffffff', '#c0e0ff'])); on('splat', d => P().bits(d.at[0], d.at[1], d.at[2], 8, ['#ffffff', '#e0e8ff']));
    on('pickup', d => { const H = heroPos(); P().glints(H.x, H.y, H.z + 20, 6, d.kind === 'rime' ? '#80e0ff' : '#ff4050'); });
    on('tracer', d => { this.fx.tracers.push({ a: d.from.slice(), b: d.to.slice(), t: .06 }); });
    on('flash', () => {}); on('skill', d => { if (d.skill === 'flash') this.game.flash('#ffffff', .12, .7); if (d.skill === 'echo') this.fx.echo = 1.2; if (d.skill === 'makeitrain') { const H = heroPos(); P().glints(H.x, H.y, H.z + 30, 30, '#ffd040'); } });
    on('hurt', () => { this.game.flash('#ff2030', .08, .5); this.game.shake && this.game.shake(2); });
    on('freeze', d => P().glints(d.at[0], d.at[1], d.at[2] + 16, 20, '#c0f0ff')); on('rescue', () => { const H = heroPos(); P().bits(H.x, H.y, H.z + 16, 16, ['#ffffff', '#c0f0ff']); });
    on('steam', () => { const H = heroPos(); P().smoke(H.x, H.y, H.z + 16, 10, { color: '#ffffff' }); }); on('hockey', () => { const H = heroPos(); P().smoke(H.x, H.y, H.z + 2, 8, { color: '#ffffff', size: 1.5 }); });
    on('collapse', () => { const H = heroPos(); P().bits(H.x, H.y, H.z + 40, 30, ['#a89880', '#e8e0d0']); this.game.shake && this.game.shake(6); });
    on('bigBell', () => this.game.shake && this.game.shake(3)); on('lawine', () => this.game.shake && this.game.shake(5)); on('corniceFall', () => this.game.shake && this.game.shake(6));
    on('area', () => { this.fx.prints.length = 0; this.fx.tracers.length = 0; });
  }
  /** a world for an area (built once; another area's world is disposed when we move on, Room 7's stays) */
  world(id) {
    if (this.worlds[id]) return this.worlds[id];
    for (const k in this.worlds) if (k !== 'room7' && k !== id && !(G && G.r7from && G.r7from.area === k && id === 'room7')) { this.worlds[k].w.dispose(); delete this.worlds[k]; }
    const A = S7.AREAS[id], W0 = A.world, o = Object.assign({}, W0);
    delete o.filter; o.filter = Object.assign({ bands: T.celBands, ink: T.ink }, W0.filter || {}, { bands: T.celBands, ink: (W0.filter && W0.filter.ink || 1) * T.ink });
    if (o.fog) o.fog = Object.assign({}, o.fog, { far: o.fog.far * T.fogFar });
    if (o.level) { o.level = Object.assign({}, o.level, { legend: Object.assign({}, o.level.legend) }); for (const k in o.level.legend) { const e = o.level.legend[k]; if (e && e.ground === 'red') o.level.legend[k] = Object.assign({}, e, { ground: 'plain', colors: { base: '#8a1420', dark: '#5a0a14', light: '#a82030' } }); } }
    const props = A.props || [];
    o.lights = props.filter(p => p[0] === 'light').length + 5;
    o.camera = Object.assign({ mode: 'fixed', near: 1 }, W0.camera || {}, { capture: false });
    o.onDraw = null;
    const w = new this.W3(this.game, o);
    const rec = { id, w, area: A, actors: {}, enemies: new Map(), lights: [], fxl: {}, people: [], shapes: [] };
    const fz = (x, y) => (A.world.terrain ? A.world.terrain.height(x, y) : (S7.loadArea(id).grid.floor(x, y)));
    for (const p of props) {
      if (p[0] === 'shape') { const [, sid, x, y, z, op] = p; try { rec.shapes.push(w.shape(sid, x * M, y * M, fz(x * M, y * M) + (z || 0) * M, Object.assign({ solid: false }, op || {}))); } catch (e) { this.game.fail('shape ' + sid, e); } }
      else if (p[0] === 'light') { const [, x, y, z, op] = p, h = w.light(op); h.x = x * M; h.y = y * M; h.z = fz(x * M, y * M) + z * M; rec.lights.push(h); }
    }
    for (const k of ['muzzle', 'boom', 'flare', 'flash']) rec.fxl[k] = w.light({ color: k === 'flare' ? '#ff5040' : k === 'boom' ? '#ff9a4a' : '#ffe8c0', reach: k === 'boom' ? 300 : 200, power: 0, on: false });
    for (const pe of A.people || []) {
      const [pid, x, y, z, face, mode, need] = pe, X = x * M, Y = y * M, Z = fz(X, Y) + (z || 0) * M;
      let a;
      if (mode === 'murmel') a = w.mob({ x: X, y: Y, z: Z, blob: new E.Blob({ R: 7, ears: 'cat', feet: true, mouth: true, face: 'front', colors: { dk: '#c8c4bc', base: '#f4f4f0', lt: '#ffffff', eye: '#1a1414' } }), fly: true, pose: false });
      else { const spec = S7.PEOPLE[pid] && S7.PEOPLE[pid].rig || NPC_LOOK[pid] || {}; a = w.mob({ x: X, y: Y, z: Z, rig: new E.Humanoid(Object.assign({ size: 1.3, build: 'heroic', weapon: null }, spec, { weapon: null })), fly: true, pose: false }); }
      a.setSolid(false); a.place(X, Y, Z); a.facing = face; if (mode === 'pim' || mode === 'pimseat') a.fade = .6;
      rec.people.push({ a, id: pid, mode, need, x: X, y: Y, z: Z, face, t: Math.random() * 3 });
    }
    w.prepare();
    this.worlds[id] = rec; return rec;
  }
  enterArea(id) { if (!this.ready) return; this.rec = this.world(id); this.rec.w.camera.set('fixed'); }
  /** the persona's actor in a world (one a persona, made when first needed) */
  heroActor(rec, id) {
    if (rec.actors[id]) return rec.actors[id];
    const P = S7.PERSONAS[id], rig = new E.Humanoid(Object.assign({ size: P.size || 1.3 }, P.rig));
    const a = rec.w.mob({ x: 0, y: 0, z: 0, rig, fly: true, pose: false }); a.setSolid(false); a.visible = false; rec.actors[id] = a; return a;
  }
  enemyActor(rec, e) {
    let a = rec.enemies.get(e.id); if (a) return a;
    const D = S7.ENEMIES[e.type], hat = D.hat === 'pillbox' ? { style: 'pillbox', color: '#f0f0f0', band: '#d8d8e8' } : e.id % 3 === 0 ? { style: 'beanie', color: '#ffffff', pom: TINTS[e.tint] } : null;
    const rig = new E.Humanoid({ size: 1.3 * e.size, build: e.type === 'bloom' || e.type === 'plow' ? 'bulky' : 'heroic', hunch: .2 + (e.id % 4) * .04, outfit: 'shirt', hair: 'bald', hat, weapon: null, colors: Object.assign({}, WHITE, { cloth: TINTS[e.tint], pants: TINTS[(e.tint + 2) % 5] }) });
    a = rec.w.mob({ x: e.x, y: e.y, z: e.z, rig, fly: true, pose: false }); a.setSolid(false); a.fade = 0; rec.enemies.set(e.id, a); a.data.e = e; return a;
  }
  title(on) { this.titleOn = on; if (on && this.ready) { this.rec = this.world('room7'); this.titleT = 0; } }
  step(dt) {
    if (!this.ready || !G) return;
    if (!this.rec || G.area !== this.rec.id) this.enterArea(G.area);
    const rec = this.rec;
    const w = this.rec.w, H = heroPos(), f = heroFacing(), wk = G.walker, e0 = curEdge();
    // the mouse in look mode: pointer lock while aiming
    const look = S7.game.settings.mouseMode === 'Look' && !S7.mouseFail;
    w.camera.capture = !!(G.aim.on && look); w.camera.mouseLook = true;
    if (!G.aim.on && typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock();
    S7.mouse.locked = !!w.camera.locked;
    if (w.camera.capture) { w.camera.takeMouse(this.mouse); if (!S7.mouse.wasLocked && S7.mouse.locked) this.mouse[0] = this.mouse[1] = 0; if (Math.abs(this.mouse[0]) < 240 && Math.abs(this.mouse[1]) < 240) { S7.mouse.dx += this.mouse[0]; S7.mouse.dy += this.mouse[1]; } }
    S7.mouse.wasLocked = S7.mouse.locked;
    // the personas: the active one walks the rail; the rest stay in the wardrobe; frozen ones stand as statues
    for (const id of ORDER) {
      const R0 = G.roster[id], act = id === G.persona && G.mode !== 'gameover', st = R0.frozen && R0.statue && R0.statue.area === G.area;
      if (!act && !st && !rec.actors[id]) continue;
      const a = this.heroActor(rec, id);
      if (act) {
        const ski = e0 && (e0.kind === 'ski' || e0.kind === 'jump'), v = wk.v * (wk.dir || 1), vx = ski ? 0 : Math.cos(H.angle) * wk.v, vy = ski ? 0 : Math.sin(H.angle) * wk.v;
        a.place(H.x, H.y, H.z); a.facing = f; a.visible = !(G.aim.on && G.aim.k > .5) && !CHEATS.freeCam || CHEATS.freeCam;
        const sw = G.mode === 'switch' ? clamp(G.switchT / .45, 0, 1) : 0; a.sink = sw > .5 ? (1 - (1 - sw) * 2) * 28 * 0 : 0; a.fade = G.mode === 'switch' ? Math.abs(sw * 2 - 1) : 1;
        let pose = ski ? 'crouch' : G.healing ? 'cast' : G.mode === 'frozen' ? null : null;
        if (G.mode === 'switch' && sw < .5) pose = 'hips';
        a.rig.update(dt, { x: H.x, y: H.y, z: H.z, vx, vy, facing: f, pose, lean: ski ? (wk.tucking ? .45 : .25) : 0, air: e0 && e0.kind === 'jump', point: G.aim.on, flip: 0 });
        if (G.mode === 'frozen') a.rig.update(0, { x: H.x, y: H.y, z: H.z, vx: 0, vy: 0, facing: f });
        void v;
      } else if (st) { a.place(R0.statue.at[0], R0.statue.at[1], R0.statue.at[2]); a.facing = R0.statue.face || 0; a.visible = true; a.fade = 1; }
      else a.visible = false;
    }
    // the Whiteouts: they fade in when revealed; footprints and breath give them away
    const alive = new Set();
    for (const e of G.enemies) {
      const a = this.enemyActor(rec, e); alive.add(e.id);
      const moving = Math.hypot(e.x - (a.data.px ?? e.x), e.y - (a.data.py ?? e.y)) / Math.max(dt, 1e-4); a.data.px = e.x; a.data.py = e.y;
      a.place(e.x, e.y, e.z); a.facing = e.facing;
      const show = e.alive ? e.vis : Math.max(0, 1 - e.dying / .6) * (e.vis > .3 || e.crit ? 1 : .6);
      a.fade = clamp(show, 0, 1); a.visible = a.fade > .03; a.sink = e.alive ? 0 : Math.min(28, e.dying / .6 * 28);
      a.flash = e.giggle >= 0 ? .1 : Math.max(0, a.flash - dt);
      const laughing = e.laughT > 0 && e.laughT < .5, pose = e.kneel > 0 ? 'kneel' : e.stun > 0 ? 'guard' : e.giggle >= 0 ? 'cheer' : laughing ? 'cheer' : e.ai === 'sled' ? 'crouch' : null;
      a.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: Math.cos(e.facing) * Math.min(moving, 90), vy: Math.sin(e.facing) * Math.min(moving, 90), facing: e.facing, pose, expr: 'smile', run: e.ai === 'runner' ? .6 : .3 });
      if (e.giggle >= 0) a.rig.kick && a.rig.kick(.15);
      // tells while unseen
      if (e.alive && e.vis < .5 && moving > 5) { a.data.stride = (a.data.stride || 0) + moving * dt; if (a.data.stride > 9) { a.data.stride = 0; a.data.foot = !a.data.foot; const sd = a.data.foot ? 3 : -3; this.fx.prints.push({ x: e.x + Math.cos(e.facing + Math.PI / 2) * sd, y: e.y + Math.sin(e.facing + Math.PI / 2) * sd, z: e.z, a: e.facing, t: 0, life: S7.AREAS[G.area].interior ? 2.5 : 8 }); if (this.fx.prints.length > 400) this.fx.prints.shift(); } }
      if (e.alive && e.vis < .5) { a.data.breath = (a.data.breath || e.id * .3 % 1.2) - dt; if (a.data.breath <= 0) { a.data.breath = 1.2; this.game.particles.smoke(e.x + Math.cos(e.facing) * 4, e.y + Math.sin(e.facing) * 4, e.z + 1.62 * e.size * M, 1, { color: '#ffffff', size: .6 }); } }
    }
    for (const [id, a] of rec.enemies) if (!alive.has(id)) { rec.w.remove(a); rec.enemies.delete(id); }
    // the boss's bodies
    this.bossActors(rec, dt);
    // people (NPCs): breathing, Pim's seat bobs, those that wait for a flag
    for (const p of rec.people) { p.t += dt; const vis = !p.need || flag(p.need); p.a.visible = vis && !(p.mode === 'pim' && flag('pim1done')); const z = p.z + (p.mode.startsWith('pim') ? Math.sin(p.t * 1.4) * 2 : 0); p.a.place(p.x, p.y, z); if (p.a.rig) p.a.rig.update(dt, { x: p.x, y: p.y, z, vx: 0, vy: 0, facing: p.face, pose: p.mode === 'sit' ? 'kneel' : p.mode === 'frozen' ? 'wave' : p.mode === 'lie' ? null : null, down: p.mode === 'lie' ? 1 : 0, expr: p.mode === 'frozen' ? 'shout' : undefined }); else if (p.a.blob) p.a.blob.update(dt, { squash: Math.sin(p.t * 2) * .05, look: [0, 1] }); }
    for (const t of this.fx.tracers) t.t -= dt; this.fx.tracers = this.fx.tracers.filter(t => t.t > 0);
    for (const p of this.fx.prints) p.t += dt; this.fx.prints = this.fx.prints.filter(p => p.t < p.life);
    // the presenter's own echo and ghost actors (Echo Run)
    this.echoActors(rec, dt);
    w.step(dt);
    S7.audioFrame && S7.audioFrame(dt);
  }
  bossActors(rec, dt) {
    const b = G.boss, B0 = rec.boss || (rec.boss = {});
    const need = (k, spec) => { if (!B0[k]) { const a = rec.w.mob({ x: 0, y: 0, z: 0, rig: new E.Humanoid(spec), fly: true, pose: false }); a.setSolid(false); a.visible = false; B0[k] = a; } return B0[k]; };
    for (const k in B0) B0[k].visible = false;
    if (G.area === '00C' && !flag('grauDead') && (b && b.id === 'grau' || !b)) {
      const a = need('grau', Object.assign({ size: 1.4 }, S7.PEOPLE.grau.rig)), p = b ? BOSSES.grau.pos(b) : [9 * M + 18, 9 * M, 6.5 * M], H = heroPos();
      a.place(p[0], p[1], p[2]); a.facing = Math.atan2(H.y - p[1], H.x - p[0]); a.visible = !(b && b.state === 'dying' && b.st > 1);
      a.rig.o.hat = b && b.hat > 0 ? null : { style: 'pillbox', color: '#a01818', band: '#e0b040' };
      a.rig.update(dt, { x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, facing: a.facing, pose: b && b.state === 'throw' ? 'cast' : b && b.hat > 0 ? 'wave' : b && b.state === 'dying' ? 'die' : 'hips', expr: 'smile' });
      if (b && b.state === 'dying') a.sink = Math.min(30, b.st * 14);
    }
    if (G.area === '01B' && b && b.id === 'band') b.m.forEach((mu, i) => { const a = need('band' + i, Object.assign({ size: 1.3, build: 'heroic', weapon: null, hair: 'short', hat: { style: 'felt', color: '#3a5a2a', feather: '#e8e0c0' } }, BAND_LOOK[mu.name], { colors: Object.assign({}, WHITE, BAND_LOOK[mu.name].colors) })); a.place(mu.x, mu.y, mu.z); a.facing = Math.PI / 2; a.visible = mu.alive || mu.dying < .8; a.sink = mu.alive ? 0 : mu.dying * 30; const on = BOSSES.band.window(b, mu); a.rig.update(dt, { x: mu.x, y: mu.y, z: mu.z, vx: 0, vy: 0, facing: Math.PI / 2, pose: on ? 'cheer' : 'cast', expr: 'smile' }); if (on) a.rig.kick && a.rig.kick(.04); });
    if (G.area === '01F' && b && b.id === 'hansi' && b.phase >= 2) {
      const a = need('hansi', Object.assign({ size: 1.4 }, S7.PEOPLE.hansi.rig));
      if (b.phase === 2) { const p = BOSSES.hansi.hansiPos(b), e = W.rails.byId['sl0-sl1'], q = edgePos(W.rails, e, clamp(b.hs, 0, e.len)); a.place(p[0], p[1], p[2]); a.facing = q.angle; a.visible = true; a.rig.update(dt, { x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, facing: q.angle, pose: 'crouch', lean: .3, flip: b.crash ? .6 : 0 }); }
      else { const H = heroPos(), f = heroFacing(), px0 = H.x + Math.cos(f + Math.PI / 2) * 14, py0 = H.y + Math.sin(f + Math.PI / 2) * 14; a.place(px0, py0, H.z - 4); a.facing = f + .4; a.visible = !(b.end === 'fell' && b.endT > 1.2); a.sink = b.end === 'fell' ? b.endT * 40 : 0; a.rig.update(dt, { x: px0, y: py0, z: H.z, vx: 0, vy: 0, facing: f + .4, pose: 'kneel', expr: b.end === 'shot' ? 'wince' : 'smile' }); }
    }
  }
  echoActors(rec, dt) {
    const E2 = rec.echo || (rec.echo = {});
    for (const k in E2) E2[k].visible = false;
    if (!S7.ECHO || !S7.ECHO.on || G.area !== '01C') return;
    const mk = (k, col) => { if (!E2[k]) { const a = rec.w.mob({ x: 0, y: 0, z: 0, rig: new E.Humanoid(Object.assign({ size: 1.3 }, S7.PERSONAS.dagny.rig, { colors: Object.assign({}, S7.PERSONAS.dagny.rig.colors, { cloth: col, pants: col, trim: '#ffffff' }) })), fly: true, pose: false }); a.setSolid(false); a.fade = .45; E2[k] = a; } return E2[k]; };
    const show = (k, col, p, name) => { const a = mk(k, col); a.place(p.x, p.y, p.z); a.facing = p.angle; a.visible = true; a.fade = .45; a.rig.update(dt, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.angle, pose: 'crouch', lean: .35 }); this.tags.push([p, name, col]); };
    this.tags = [];
    if (S7.ECHO.solo && S7.ECHO.best && S7.ECHO.started) { const p = S7.echoAt(S7.ECHO.best.rec, S7.ECHO.t); if (p) show('mine', '#a8d0ff', p, 'YOUR ECHO'); }
    if (S7.HUB) for (const id in S7.HUB.ghosts) { const g0 = S7.HUB.ghosts[id], e = W.rails.edges[g0.e]; if (!e) continue; const target = edgePos(W.rails, e, g0.s); const cur = g0.cur || (g0.cur = { x: target.x, y: target.y, z: target.z }); const k = Math.min(1, dt * 8); cur.x += (target.x - cur.x) * k; cur.y += (target.y - cur.y) * k; cur.z += (target.z - cur.z) * k; const pl = (S7.HUB.info.players || []).find(p => String(p.id) === String(id)); show('p' + id, ECHO_COLS[(+id) % 4], { x: cur.x, y: cur.y, z: cur.z, angle: target.angle }, pl ? pl.name : 'P' + (+id + 1)); }
  }
  project(p) { const w = this.rec && this.rec.w; if (!w) return undefined; return w.project(p[0], p[1], p[2]); }
  /** the frame: the pen's set pieces, lights, glows, the camera, the gun on the overlay, then the world */
  draw(r) {
    if (!this.ready || !G) return; if (!this.rec || G.area !== this.rec.id) this.enterArea(G.area);
    const rec = this.rec;
    const w = rec.w, pen = w.pen, t = G.time;
    pen.at();
    try { this.drawPens(rec, pen, t); } catch (e) { this.game.fail('pens', e); }
    // footprints (dark prints fading), tracers, projectiles, drops, statues' ice
    for (const p of this.fx.prints) { const k = 1 - p.t / p.life; pen.at(p.x, p.y, p.z + .3, p.a).box(0, 0, 0, 4, 2.2, .4, k > .5 ? '#7a8090' : '#a8b0c0'); }
    pen.at();
    for (const tr of this.fx.tracers) pen.tube(tr.a[0], tr.a[1], tr.a[2] - 2, tr.b[0], tr.b[1], tr.b[2], .25, '#fff0a0');
    for (const p of G.proj) { if (p.kind === 'suitcase') pen.at(p.p[0], p.p[1], p.p[2], t * 6).box(0, 0, 0, 10, 4, 7, '#7a1a1a').box(0, 0, 4, 3, 1, 2, '#d8b040'); else if (p.kind === 'medal') { pen.at(); pen.glow(p.p[0], p.p[1], p.p[2], 3, '#ffd040'); } else if (p.kind === 'shell' || p.kind === 'charge') { pen.at(); pen.ball(p.p[0], p.p[1], p.p[2], p.kind === 'charge' ? 3.5 : 2.5, 2, 2, '#c81e1e'); } else { pen.at(); pen.ball(p.p[0], p.p[1], p.p[2], p.r, p.r, p.r, p.kind === 'icecube' ? '#c8f0ff' : '#ffffff'); } }
    pen.at();
    for (const d of G.drops) w.glow(d.x, d.y, d.z, 1.4, d.rime ? '#80e0ff' : '#ff3040', { core: '#ffffff' });
    for (const s of statuesHere()) { const a = s.st.at; pen.at(a[0], a[1], a[2]); pen.box(0, 0, 14, 16, 16, 30, '#bfe8ff').ball(0, 0, 30, 10, 10, 8, '#d8f4ff'); }
    if (G.mode === 'frozen') { const H = heroPos(), k = clamp(G.modeT / 1.2, 0, 1); pen.at(H.x, H.y, H.z).box(0, 0, 14 * k, 16 * k, 16 * k, 30 * k, '#bfe8ff'); }
    // pickups still lying about: red snow, rime crystals, pins, documents
    for (const s of W.spots) if (s.kind === 'pickup' && !spotDone(s) && (!s.hidden || flag(s.hidden))) { const it = S7.ITEMS[s.item], bob = Math.sin(t * 2 + s.pos[0]) * 2; if (it.kind === 'red') { pen.at(s.pos[0], s.pos[1], s.pos[2]).ball(0, 0, 1, 7, 6, 1.5, '#c8101e'); } else if (it.kind === 'rime') { pen.at(s.pos[0], s.pos[1], s.pos[2] + 10 + bob, t).cone(0, 0, -5, 0, 0, 6, 3, '#80e0ff'); w.glow(s.pos[0], s.pos[1], s.pos[2] + 10 + bob, 1, '#80e0ff'); } else { pen.at(s.pos[0], s.pos[1], s.pos[2] + 12 + bob, t).box(0, 0, 0, 5, 1, 6, it.kind === 'pin' ? '#e0b040' : it.kind === 'key' ? '#d8b040' : '#f0e8d8'); w.glow(s.pos[0], s.pos[1], s.pos[2] + 12 + bob, .8, '#fff0c0'); } }
    // warm spots: revealed and within 30 m glow; the four nearest light the scene
    const eye = S7.eye(), glows = [];
    for (const e of G.enemies) if (e.alive && e.vis > .4) { if (e.spots) bloomSpots(e).forEach(s => { if (e.spots[s.i]) glows.push(s.pos); }); else if (!(e.ai === 'plow' && !(e.back > 0))) glows.push(warmPos(e)); }
    for (const bt of S7.bossTargets()) if (bt.kind === 'warm' && bt.window) glows.push(bt.pos);
    glows.filter(p => V.dist(p, eye) < 34 * M).sort((a, b) => V.dist(a, eye) - V.dist(b, eye)).forEach((p, i) => w.glow(p[0], p[1], p[2], 2.2, '#ff6a1e', { core: '#ffe0a0', light: i < 4 }));
    // the scan ring, the flare, Echo's rings
    if (G.scan) { const s = G.scan; w.arc(s.at[0], s.at[1], W.grid.floor(s.at[0], s.at[1]) + 1, Math.max(0, s.r - 10), s.r, 0, TAU, '#80e0ff', .55); }
    const FX = rec.fxl;
    if (G.flare) { const f = G.flare.at; w.glow(f[0], f[1], f[2], 3, '#ff4030', { core: '#ffe0c0' }); Object.assign(FX.flare, { x: f[0], y: f[1], z: f[2], on: true, power: 30 }); } else FX.flare.on = false;
    if (this.fx.echo > 0) { this.fx.echo -= 1 / 60; const H = heroPos(), k = 1 - this.fx.echo / 1.2; for (let i = 0; i < 3; i++) w.arc(H.x, H.y, H.z + 1, k * 25 * M * (1 - i * .2), k * 25 * M * (1 - i * .2) + 8, 0, TAU, '#e0f0ff', .4 * (1 - k)); }
    const wp = wstate(G.persona); Object.assign(FX.muzzle, { x: eye[0] + Math.cos(G.aim.yaw) * 20, y: eye[1] + Math.sin(G.aim.yaw) * 20, z: eye[2], on: G.aim.on && wp.flash > .6, power: 14 * wp.flash });
    // the echoes' name tags (drawn as text on the HUD, never as HTML)
    if (this.tags && this.tags.length) r.overlay(g => { for (const [p, name, col] of this.tags) { const q = w.project(p.x, p.y, p.z + 36); if (q) { txt(g, name, q[0] - tw(name) / 2, q[1] - 10, col); } } });
    // snow
    this.snow(rec, pen, t);
    // the camera
    if (CHEATS.freeCam) { if (w.camera.mode !== 'fly') w.camera.set('fly'); }
    else { if (w.camera.mode !== 'fixed') w.camera.set('fixed'); const c = G.cam || S7.director.pose; w.camera.fixed = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, roll: c.roll || 0, fov: c.fov || 55 }; }
    // first person: the persona's weapon on the overlay
    // (the gun is drawn in the world, in the eye's frame, so the cel filter and ink take it as they take everything:
    //  the engine's overlay pass does not compose with the filter's post-processing)
    if (w.overlay) w.overlay.on = false;
    if (G.aim.on && G.aim.k > .85 && !G.aim.scope && !CHEATS.freeCam) { const c = G.cam; drawWeapon(pen, G.persona, wp, t, this, c); pen.at(); }
    if (CHEATS.showRails) this.debugRails(pen);
    w.draw(r);
  }
  snow(rec, pen, t) {
    const A = rec.area, amt = A.snow || (rec.id === 'room7' ? 0 : 0); if (!amt || S7.reduceMotion() && false) return;
    const c = G.cam || S7.director.pose, n = Math.round(420 * amt), wind = (A.wind || .3) * 40, S = 30 * M;
    if (!this.flakes || this.flakes.length !== n) { const rnd = E.rng(77); this.flakes = Array.from({ length: n }, () => [rnd() * S, rnd() * S, rnd() * S * .6, .6 + rnd() * .8]); }
    pen.at();
    for (const f of this.flakes) { const x = c.x - S / 2 + ((f[0] + t * wind) % S + S) % S, y = c.y - S / 2 + ((f[1] + t * wind * .3) % S + S) % S, z = c.z - S * .3 + ((f[2] - t * 30 * f[3]) % (S * .6) + S * .6) % (S * .6); pen.glow(x, y, z, .55 * f[3], '#ffffff'); }
  }
  debugRails(pen) {
    pen.at();
    for (const e of W.rails.edges) { const P = e.path.pts; for (let i = 0; i < P.length - 1; i++) { const a = edgePos(W.rails, e, 0), b = a; void b; } for (let s = 0; s < e.len; s += 24) { const p = edgePos(W.rails, e, s), q = edgePos(W.rails, e, Math.min(e.len, s + 24)); pen.tube(p.x, p.y, p.z + 2, q.x, q.y, q.z + 2, .6, e.kind === 'ski' ? '#40a0ff' : '#ff40ff'); } }
    for (const id in W.rails.nodes) { const n = W.rails.nodes[id]; pen.ball(n.x, n.y, n.z + 4, 3, 3, 3, '#ffff40'); }
  }
  drawTitle(r) {
    if (!this.ready) return;
    const rec = this.world('room7'); this.rec = rec; const w = rec.w; this.titleT = (this.titleT || 0) + 1 / 60;
    const t = this.titleT, u = (Math.sin(t * .07) + 1) / 2;
    w.camera.set('fixed'); w.camera.fixed = { x: (9.5 - u * 3) * M, y: (8.2 - u * 1.5) * M, z: (2.6 + u * .6) * M, yaw: Math.atan2((1.4 - 8.2) + u * 2, (6.4 - 9.5) + u * 2), pitch: -.18, roll: 0, fov: 52 };
    const pen = w.pen; pen.at();
    for (const p of rec.people) { p.t += 1 / 60; if (p.a.rig) p.a.rig.update(1 / 60, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.face, pose: p.mode === 'sit' ? 'kneel' : null, down: p.mode === 'lie' ? 1 : 0 }); }
    if (G) { try { this.drawPens(rec, pen, t); } catch (e) { this.game.fail('pens', e); } } else this.drawRoom7(pen, t, rec);
    if (w.overlay) w.overlay.on = false;
    w.step(1 / 60);
    w.draw(r);
  }
  drawRoom7(pen, t) { PENS.window7(pen, 6.5, .9, 0, {}, t); PENS.featherbed(pen, 2.2, 2.6, 0, {}, t); PENS.lamp7(pen, 6, 5, 3.4, {}, t); PENS.phone7(pen, 10.4, 4.8, 0, {}, t); }
  drawPens(rec, pen, t) {
    const A = rec.area, fz = (x, y) => A.world.terrain ? A.world.terrain.height(x * M, y * M) : S7.loadArea(rec.id).grid.floor(x * M, y * M);
    for (const p of A.props || []) if (p[0] === 'pen') { const f = PENS[p[1]]; if (f) { pen.at(); f(pen, p[2], p[3], (p[4] || 0) + fz(p[2], p[3]) / M, p[5] || {}, t, rec); } }
    pen.at();
  }
}
S7.Presenter3D = Presenter3D;

/* ---- the first-person weapons (the overlay pen: x ahead of the eye, y right, z up; engine units) ---- */
function drawWeapon(op, id, w, t, P0, base) {
  const W0 = S7.WEAPONS[S7.PERSONAS[id].weapon], kick = w.flash, rel = w.reloadT > 0 ? Math.sin(clamp(1 - w.reloadT / (W0.perShell ? W0.reload * W0.mag : W0.reload), 0, 1) * Math.PI) : w.overT > 0 ? .6 : 0;
  const bob = Math.sin(t * 2.2) * .15, x0 = -kick * 1.6, z0 = -rel * 4 + bob + kick * .5, glove = { ansel: '#2a2a2a', dagny: '#101014', ignaz: '#5a3a2a', rurik: '#3a2a20', kasimir: '#e8c8a8', mireille: '#1a1a1a', brigid: '#c81e1e' }[id];
  op.at(base.x, base.y, base.z, base.yaw, 1, base.pitch - rel * .5, 0);
  if (id === 'ansel') { op.box(8 + x0, 3.4, -4.6 + z0, 3, 1.3, 1.8, '#3a3a40').tube(9 + x0, 3.4, -4 + z0, 14 + x0, 3.4, -4 + z0, .5, '#4a4a52').tube(7.6 + x0, 3.4, -4.3 + z0, 9.2 + x0, 3.4, -4.3 + z0, 1, '#5a5a62').box(6.4 + x0, 3.4, -6 + z0, 1.6, 1.1, 2.4, '#5a3a20').ball(6.2 + x0, 3.4, -6 + z0, 1.4, 1.2, 1.2, glove); if (rel) op.ball(8.4, 2.2, -4.2 + z0, 1, .6, 1, '#8a8a92'); }
  else if (id === 'dagny') { const a = w.alt ? 1 : 0; for (const sd of [-1, 1]) { const k = (sd > 0) === !!a ? x0 : 0; op.tube(5 + k, sd * 4.2, -6 + z0, 17 + k, sd * 3.2, -2.4 + z0, .35, '#c8ccd4').box(5.4 + k, sd * 4.2, -6 + z0, 1.6, 1.2, 2.4, '#1e5cff').ball(5 + k, sd * 4.2, -6.3 + z0, 1.3, 1.1, 1.1, glove); if (w.flash > .5 && (sd > 0) === !!a) op.glow(17.4, sd * 3.2, -2.4 + z0, 1.4, '#ffd080'); } }
  else if (id === 'ignaz') { op.tube(2 + x0, 3, -6 + z0, 7 + x0, 3, -4.6 + z0, 1, '#6a4a2a').tube(7 + x0, 3, -4.4 + z0, 18 + x0, 2.6, -3.4 + z0, .45, '#2a2a30').tube(8 + x0, 2.9, -3.2 + z0, 12 + x0, 2.8, -2.9 + z0, .7, '#1a1a1e').box(9 + x0, 3, -4.9 + z0, 4, 1.2, 1, '#6a4a2a').ball(5.6 + x0, 3, -5.6 + z0, 1.3, 1.1, 1.1, glove).ball(11 + x0, 2.4, -5 + z0, 1.2, 1, 1, glove); }
  else if (id === 'rurik') { const pump = w.reloadT > 0 ? Math.sin(t * 14) * 1.5 : kick * 1.4; op.tube(4 + x0, 3.2, -6 + z0, 16 + x0, 3, -3.6 + z0, .7, '#d8b040').tube(6 + x0, 3.2, -6.6 + z0, 15 + x0, 3, -4.7 + z0, .55, '#c8a030').box(10 - pump + x0, 3.1, -5 + z0, 4, 1.6, 1.4, '#6a4a2a').ball(5.4 + x0, 3.2, -6.5 + z0, 1.6, 1.4, 1.4, glove).ball(10 - pump + x0, 2.4, -5.6 + z0, 1.5, 1.2, 1.2, glove); }
  else if (id === 'kasimir') { const heat = 1 - w.mag / W0.mag; op.cone(3 + x0, 1.5, -5 + z0, 24 + x0, .2, -3.2 + z0, 1, '#8a5a2a').ball(24 + x0, .2, -3.2 + z0, 1, 2.6, 2.6, '#a06a32').ball(4 + x0, 2.6, -5.6 + z0, 1.3, 1.1, 1.1, glove); if (heat > .5) P0.game.particles.smoke && false; }
  else if (id === 'mireille') { op.box(8 + x0, 3, -4.2 + z0, 3.4, 1, 1.2, '#2a2a30').box(6.8 + x0, 3, -5.4 + z0, 1.2, .9, 2, '#3a3a40').ball(6.6 + x0, 3, -5.6 + z0, 1.2, 1, 1, glove); if (S7.G.cd.flash > 1.6) op.glow(9, -4, -3, 3, '#ffffff'); op.box(7, -4.6, -6 + z0 * .5, 3, 3, 2.4, '#3a3028').glow(8.5, -4.6, -5.4 + z0 * .5, .6, '#e0e0ff'); }
  else if (id === 'brigid') { op.tube(3 + x0, 3.6, -6 + z0, 16 + x0, 3.2, -3.4 + z0, 1.5, '#5a6068').tube(5 + x0, 4.8, -7 + z0, 9 + x0, 4.8, -6.4 + z0, .9, '#c8c8d0').box(7 + x0, 3.6, -7.2 + z0, 2, 1.4, 2.4, '#3a3a40').ball(6.6 + x0, 3.6, -7.4 + z0, 1.5, 1.3, 1.3, glove).ball(12 + x0, 2.4, -5.4 + z0, 1.4, 1.2, 1.2, glove); }
  if (w.flash > .5 && id !== 'dagny' && id !== 'kasimir') op.glow(id === 'ignaz' ? 18.5 + x0 : 15 + x0, 3, id === 'brigid' ? -3.4 : -3.8, 1.8, '#fff0a0');
}

/* ---- the set pieces drawn with the pen each frame (x, y in tiles; z in metres above the ground) ---- */
const PENS = {
  window7(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.box(0, 0, 40, 34, 2, 46, '#2a1e1c').box(0, -1.4, 40, 30, .6, 42, '#0a1430'); for (let i = 0; i < 14; i++) { const s = (i * 37) % 30 - 15, h = ((i * 53 + t * 16) % 42); pen.glow(s, -.4, 61 - h, .5, '#ffffff'); } pen.box(0, 1, 40, 2, 1, 46, '#2a1e1c').box(0, 1, 40, 34, 1, 2, '#2a1e1c'); if (flag('fohnHere') && G && G.flags.epilogue) pen.glow(0, 2, 30, 6, '#ffb060'); },
  featherbed(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); const heave = G && G.flags.featherShake ? Math.sin(t * 9) * 2 : Math.sin(t * .8) * .6; for (let i = 0; i < 9; i++) pen.ball(((i % 3) - 1) * 6, (Math.floor(i / 3) - 1) * 9 + 4, 14 + heave * ((i % 2) ? 1 : -.5), 6, 7, 3.5, '#f4f2ee'); pen.ball(0, -12, 13, 6, 4, 3, '#ffffff'); },
  phone7(pen, x, y, z) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 13.5, 0, 0, 20, .6, '#1a1a1a').cone(0, 0, 13.5, 0, 0, 15, 2.4, '#1a1a1a').tube(-1.5, 0, 20, 1.5, 0, 21.5, .8, '#1a1a1a'); },
  lamp7(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 10, .3, '#2a2a2a').cone(0, 0, -2, 0, 0, 2, 6, '#5a3a1a'); pen.glow(0, 0, -2.5, 2 + Math.sin(t * 3) * .1, '#ffd890'); },
  chandelier(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 30, .4, '#d8b040'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, cx = Math.cos(a) * 14, cy = Math.sin(a) * 14; pen.tube(0, 0, 2, cx, cy, -1, .35, '#d8b040').glow(cx, cy, 1, 1.2 + Math.sin(t * 7 + i) * .1, '#ffe0a0'); } pen.ball(0, 0, 0, 6, 6, 4, '#e8d8a0'); },
  balustrade(pen, x, y, z, o) { pen.at(); const y0 = y * M; for (let xx = x; xx <= o.x1; xx += .8) pen.tube(xx * M, y0, z * M, xx * M, y0, z * M + 14, .5, '#d8c8a8'); pen.bar(x * M, y0, z * M + 15, o.x1 * M, y0, z * M + 15, 2, 1.4, '#6a3a20'); },
  'elevator-car'(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.box(0, 0, 0, 20, 22, 1, '#3a2a1a').box(8, 0, 22, 2, 22, 44, '#5a4a2a'); pen.glow(0, 0, 42, 2, flag('pim1done') ? '#806040' : '#c0ffd0'); if (!flag('pim1done')) { pen.box(0, 0, 10 + Math.sin(t * 1.4) * 2, 10, 8, 1.2, '#4a3a2a').tube(-4, 0, 10, -4, 0, 60, .3, '#3a3a3a'); } },
  'service-bell'(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); const sw = flag('bellRung') ? Math.sin(t * 3) * .2 * Math.max(0, 1 - (G.time - (G.bellT || G.time)) / 4) : 0; pen.at(x * M, y * M, z * M, sw).tube(0, 0, 18, 0, 0, 60, .8, '#3a3a3a').cone(0, 0, -14, 0, 0, 14, 20, '#d8b040').ball(0, 0, -15, 4, 4, 4, '#a08020'); },
  lightwell(pen, x, y, z, o) { pen.at(); for (let k = 0; k < 6; k++) { const yy = (y + k * 4) * M; pen.box((x + o.x1) / 2 * M, yy, -40, (o.x1 - x) * M, 2, 4, '#2a3a2a'); } },
  'broken-floor'(pen, x, y, z, o) { pen.at(); for (let i = 0; i < 6; i++) pen.box((x + (i * 7 % 3)) * M, (y + i * .6) * M, -3 - i * 2, 10, 6, 2, '#5a4a3a'); },
  shaft(pen, x, y, z, o, t) {
    pen.at(x * M, y * M, 0); const b = G && G.boss && G.boss.id === 'grau' ? G.boss : null, cz = b ? b.carZ : 6.5 * M;
    for (const sd of [-1, 1]) pen.tube(sd * 20, 0, 0, sd * 20, 0, 300, 1, '#3a3a3a');
    if (!b || b.phase === 1) pen.tube(0, 0, cz + 50, 0, 0, 340, .8, '#5a5a5a');
    pen.box(0, 0, cz - 2, 44, 44, 4, '#4a3a2a').box(0, 0, cz + 46, 44, 44, 3, '#3a2a1a'); for (const [dx, dy] of [[-21, -21], [21, -21], [-21, 21], [21, 21]]) pen.tube(dx, dy, cz, dx, dy, cz + 46, 1, '#d8b040');
    for (const fz of [3, 6.5, 10]) pen.box(0, -30, fz * M - 2, 60, 6, 3, '#2a1a1a');
    pen.glow(0, 0, cz + 50, 2.5 + Math.sin(t * 6) * .5, '#ff2020');
    if (b && b.phase === 3) { pen.tube(10, 0, cz + 49, 10, 0, cz + 60, .6, '#3a3a3a').cone(10, 0, cz + 56, 10, 0, cz + 62, 4, '#d8b040'); }
  },
  'string-lights'(pen, x, y, z, o, t) { pen.at(); for (let xx = x; xx < o.x1; xx += 1.2) { const sag = Math.sin((xx - x) / (o.x1 - x) * Math.PI) * 10; pen.glow(xx * M, y * M, z * M - sag, .9, ['#ffd040', '#ff5040', '#80e0ff', '#ffffff'][Math.floor(xx * 3) % 4]); } },
  'church-bell'(pen, x, y, z, o, t) { const sw = flag('liftClear') ? Math.sin(t * 3) * .25 : 0; pen.at(x * M, y * M, z * M, 0, 1, sw).cone(0, 0, -10, 0, 0, 10, 14, '#c8a040').ball(0, 0, -11, 3, 3, 3, '#8a6a20').box(0, 0, 14, 30, 4, 3, '#4a3020'); },
  'roof-drift'(pen, x, y, z, o, t) { if (flag('liftClear')) return; pen.at(x * M, y * M, z * M); for (let i = 0; i < 6; i++) pen.ball(-30 + i * 12, 0, 10 + (i % 2) * 6, 14, 18, 10, '#f4f8ff'); },
  'tbar-pylon'(pen, x, y, z) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 120, 3, '#5a5a62').bar(-30, 0, 120, 30, 0, 120, 6, 4, '#4a4a52'); },
  'mirror-wall'(pen, x, y, z, o, t) { const open = S7.gateOpen && G && G.gates['01B:mirrors'], k = open ? Math.min(1, (G.time - (G.mirrorT || (G.mirrorT = G.time))) / 1.5) : 0; for (const sd of [-1, 1]) { pen.at(x * M, (y + sd * 1.5) * M, 0, sd * k * 1.4); pen.box(0, -sd * 12, 48, 4, 24, 96, '#d8dce8').box(1.8, -sd * 12, 48, .6, 20, 88, '#a8b8d8'); } },
  mirrors(pen, x, y, z, o) { pen.at(); for (let xx = x + 1; xx < o.x1; xx += 3) { pen.box(xx * M, y * M + 2, 40, 30, 2, 60, '#c8d0e8'); pen.box(xx * M, (y + 6) * M - 2, 40, 30, 2, 60, '#c8d0e8'); } },
  stage(pen, x, y, z, o, t) { pen.at(); pen.box((x + o.x1) / 2 * M, (y + .5) * M, 15, (o.x1 - x) * M, 24, 2, '#6a1a1a'); const b = G && G.boss && G.boss.id === 'band' ? G.boss : null; if (b) b.m.forEach(mu => { if (!mu.alive) return; const on = BOSSES.band.window(b, mu); pen.at(mu.x, mu.y + 6, mu.z); if (mu.name === 'tuba') pen.cone(4, 0, 10, 8, -2, 34, 7, '#d8b040').ball(4, 0, 12, 6, 5, 7, '#c8a030'); else if (mu.name === 'accordion') { const st = on ? 1.5 : 1; pen.box(-3, 0, 20, 4, 6, 8, '#8a1a2a').box(0, 0, 20, 3 * st, 6, 8, '#f0e0c0').box(3 * st, 0, 20, 4, 6, 8, '#8a1a2a'); } else if (mu.name === 'trumpet') pen.cone(2, 0, 26, 12, 0, 27, 2.6, '#d8b040'); else pen.tube(0, 3, 12, 0, 3, 18, 6, '#e8e8f0'); }); },
  dancefloor(pen, x, y, z, o, t) { pen.at(); const b = G && G.boss && G.boss.id === 'band' ? G.boss : null, beat = b ? Math.floor(b.step / 4) : Math.floor(t * 2); for (let i = 0; i < 25; i++) { const cx = x + (i % 5) * 2 + 1, cy = y + Math.floor(i / 5) * 2 + 1, on = (i + beat) % 3 === 0; pen.box(cx * M, cy * M, .3, 30, 30, .5, on ? '#4a1a3a' : '#1a1418'); } },
  'piste-poles'(pen, x, y, z, o, t, rec) { pen.at(); for (const e of W.rails.edges) if (e.kind === 'ski' && W.area.id === rec.id) for (let s = 0; s < e.len; s += 240) { const p = edgePos(W.rails, e, s), a = p.angle + Math.PI / 2; for (const sd of [-1, 1]) { const px0 = p.x + Math.cos(a) * sd * 7 * M, py0 = p.y + Math.sin(a) * sd * 7 * M, pz = W.grid.floor(px0, py0); pen.tube(px0, py0, pz, px0, py0, pz + 22, .8, '#ff7a1e'); } } },
  'patrol-rope'(pen, x, y, z, o, t) { if (G && G.gates['01C:rope']) return; pen.at(x * M, y * M, z * M); for (const sd of [-1, 1]) pen.tube(0, sd * 40, 0, 0, sd * 40, 18, 1, '#ff7a1e'); for (let i = -6; i <= 6; i++) pen.box(0, i * 6, 14 + Math.abs(i) * .2, 1, 4, 4, i % 2 ? '#ff7a1e' : '#141414'); },
  cornice(pen, x, y, z, o, t) { if (G && G.flags.cornice) { pen.at(x * M, y * M, z * M).box(70, 0, -2, 130, 40, 8, '#e8f0f8'); return; } pen.at(x * M, y * M, z * M); for (let i = 0; i < 5; i++) pen.ball(20 + i * 18, 0, 6 + (i % 2) * 4, 18, 26, 10, '#f4f8ff'); },
  floodlights(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; for (const [m, n] of [[150, 380], [90, 600], [130, 250], [60, 450]]) { const X = m * M, Y = n * M, Z = W.grid.floor(X, Y); pen.tube(X, Y, Z, X, Y, Z + 220, 2, '#3a3a40').box(X, Y, Z + 222, 30, 6, 10, '#2a2a30'); pen.glow(X, Y + 4, Z + 220, 4, '#fff6d8'); } },
  'tbar-line'(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; const e = W.rails.byId['tbB-tbT']; if (!e) return; for (let s = 0; s < e.len; s += 160) { const p = edgePos(W.rails, e, s), q = edgePos(W.rails, e, Math.min(e.len, s + 160)); pen.tube(p.x + 20, p.y, p.z + 60, q.x + 20, q.y, q.z + 60, .4, '#2a2a2a'); if (s % 800 < 160) pen.tube(p.x + 20, p.y, p.z, p.x + 20, p.y, p.z + 64, 2, '#5a5a62'); } },
  kicker(pen, x, y, z) { pen.at(x * M, y * M, z * M); pen.box(0, 30, 6, 40, 30, 12, '#f0f4f8').box(0, 44, 12, 40, 4, 4, '#ff7a1e'); },
  gondola(pen, x, y, z, o, t, rec) {
    pen.at(); if (W.area.id !== rec.id) return; const e = W.rails.byId['gs-gl'];
    for (const dy of [0, 12 * M]) for (let s = 0; s < e.len; s += 200) { const p = edgePos(W.rails, e, s), q = edgePos(W.rails, e, Math.min(e.len, s + 200)); pen.tube(p.x, p.y + dy, p.z + 34, q.x, q.y + dy, q.z + 34, .6, '#1a1a1e'); }
    const cabin = (X, Y, Z, yaw, lit) => { pen.at(X, Y, Z, yaw); pen.box(0, 0, -1, 40, 30, 2, '#3a4a5a').box(0, 0, 32, 42, 32, 3, '#c8302a'); for (const [dx, dy] of [[-19, -14], [19, -14], [-19, 14], [19, 14]]) pen.tube(dx, dy, 0, dx, dy, 32, .9, '#d8d8e0'); pen.tube(0, 0, 33, 0, 0, 36, .8, '#2a2a2a'); pen.box(0, 15, 6, 36, 1, 10, '#5a6a7a').box(0, -15, 6, 36, 1, 10, '#5a6a7a'); if (lit) pen.glow(0, 0, 29, 1.2, flag('powerCut') && !flag('ins3') ? '#402010' : '#ffe0a0'); };
    if (curEdge() && curEdge().id === 'gs-gl') { const H = heroPos(), sw = flag('powerCut') && !flag('ins3') ? Math.sin(t * 1.3) * .08 : 0; cabin(H.x, H.y, H.z - 2, H.angle + sw, true); }
    for (const en of G.enemies) if (en.cabin && en.alive) cabin(en.x, en.y, en.z - 6, Math.PI, false);
  },
  pylons(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; for (const m of [300, 600]) { const X = m * M, Y = 300 * M + 6 * M, Zg = W.grid.floor(X, Y), Zc = S7.CABLE(m) * M; pen.tube(X, Y, Zg, X, Y, Zc + 40, 4, '#5a5a62').bar(X, Y - 10 * M, Zc + 36, X, Y + 10 * M, Zc + 36, 6, 4, '#4a4a52'); } for (const tg of W.targets || []) { const hit = flag('hit:' + key(tg.id)); pen.at(); pen.ball(tg.pos[0], tg.pos[1], tg.pos[2], 6, 6, 9, hit ? '#3a3a40' : '#bfe8ff'); if (!hit && flag('powerCut')) w0glow(rec, tg.pos, '#80e0ff'); } },
  'ice-walls'(pen, x, y, z, o, t, rec) { pen.at(); const G2 = S7.loadArea(rec.id).grid; for (let cy = 0; cy < G2.h; cy += 3) for (let cx = 0; cx < G2.w; cx += 3) if (!G2.walkable(cx, cy) && G2.walkable(cx + 1, cy) || false) pen.glow(cx * M + 14, cy * M + 8, 30 + ((cx * cy) % 5) * 8, 1.4, '#40d0ff'); },
  crystals(pen, x, y, z, o, t) { if (G && G.gates[G.area + ':' + o.gate]) return; pen.at(x * M, y * M, z * M); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = 6 + (i % 3) * 4; pen.cone(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, 30 + (i % 3) * 14, 5, '#80e8ff'); } pen.glow(0, 0, 20, 3 + Math.sin(t * 5) * .5, '#a0f0ff'); },
  seracs(pen, x, y, z, o, t) { if (G && G.flags.seracs) { pen.at(x * M, y * M, z * M); for (let i = 0; i < 6; i++) pen.box(i * 6 - 15, (i % 2) * 8 - 4, 3, 10, 8, 6, '#bfe8ff'); return; } pen.at(x * M, y * M, z * M); for (let i = 0; i < 4; i++) pen.box(i * 8 - 12, (i % 2) * 6 - 3, 30, 10, 10, 60 + i * 6, '#bfe8ff'); },
  ledger(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 16, 1.5, '#3a2a1a').box(0, 0, 17, 14, 10, 2, flag('ledger') ? '#e8e0c0' : '#1a2a3a').box(0, 0, 18.5, 15, 11, 1, '#a8e0f0'); },
  icedoor(pen, x, y, z, o, t) { if (G && G.gates[G.area + ':' + o.gate]) return; pen.at(x * M, y * M, z * M); pen.box(0, 0, 22, 24, 6, 44, '#a8e0f8'); pen.glow(0, 4, 24, 2, '#c0f0ff'); },
  pavilion(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; pen.tube(Math.cos(a) * 80, Math.sin(a) * 80, 0, Math.cos(a) * 80, Math.sin(a) * 80, 70, 2, '#d8e0f0'); } pen.cone(0, 0, 70, 0, 0, 110, 90, '#a8c8e0'); pen.box(0, 0, 12, 60, 24, 3, '#3a2a1a'); },
  avalaugh(pen, x, y, z, o, t) {
    const b = G && G.boss && G.boss.id === 'hansi' && G.boss.phase === 1 ? G.boss : null; if (!b && !(G && G.flags.hansiIntroDone === false)) { if (!(G && G.flags.avalaughDown)) { if (!(G && G.boss)) return; } else { pen.at(x * M, y * M, z * M); for (let i = 0; i < 8; i++) pen.ball(Math.cos(i) * 40, Math.sin(i * 1.7) * 40, 8, 26, 22, 10, '#f0f4f8'); return; } }
    if (!b) return; const left = b.spots.filter(Boolean).length, melt = 1 - left / 5 * .3, bob = Math.sin(t * 2) * 3;
    pen.at(x * M, y * M, z * M); pen.ball(0, 0, 3.5 * M, 4 * M, 4 * M, 3.6 * M * melt, '#f4f8ff').ball(0, 0, 8 * M + bob, 3 * M, 3 * M, 2.8 * M, '#ffffff').ball(0, 0, 11.5 * M + bob, 2 * M, 2 * M, 2 * M, '#ffffff');
    pen.box(0, 1.85 * M, 11 * M + bob, 1.4 * M, .3 * M, .25 * M, '#141414');
    for (const sd of [-1, 1]) pen.tube(sd * 2.8 * M, 0, 8.4 * M + bob, sd * 6.5 * M, 0, (10 + Math.sin(t * 1.5 + sd) * 1.5) * M, 1.2 * M * .5, '#4a3020');
    b.spots.forEach((on, i) => { const p = BOSSES.hansi.spotPos(i); if (on) { pen.at(); if (i < 3) pen.ball(p[0], p[1] - 4, p[2], 7, 3, 7, '#e0b040'); else pen.ball(p[0], p[1] - 3, p[2], 6, 3, 6, '#141414'); } });
    if (b.thaw) { const k = 1 - b.thaw.t / 40; pen.at(); for (let a = 0; a < TAU; a += .5) pen.glow(x * M + Math.cos(a) * k * 24 * M, y * M + Math.sin(a) * k * 24 * M, z * M + 2, 2, '#80d0ff'); }
  },
  'slalom-gates'(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; const e = W.rails.byId['sl0-sl1'], b = G && G.boss && G.boss.id === 'hansi' && G.boss.phase === 2 ? G.boss : null; if (!e) return; S7.SLALOM_GATES.forEach((g, i) => { const s = g * e.len, p = edgePos(W.rails, e, s), a = p.angle + Math.PI / 2, off = 20 * M, gx = p.x + Math.cos(a) * off, gy = p.y + Math.sin(a) * off, gz = W.grid.floor(gx, gy), hot = b && Math.abs(b.hs - s) < 84; for (const sd of [-1, 1]) pen.tube(gx + Math.cos(a) * sd * 50, gy + Math.sin(a) * sd * 50, gz, gx + Math.cos(a) * sd * 50, gy + Math.sin(a) * sd * 50, gz + 30, 1, hot ? '#ff2020' : i % 2 ? '#2a5ac8' : '#c8302a'); }); },
  chairlift(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 260, 3, '#4a4a52').box(0, 0, 120, 60, 40, 60, '#3a3a40'); if (G && G.boss && G.boss.id === 'hansi' && G.boss.phase === 3) { const H = heroPos(); pen.at(H.x, H.y, H.z); pen.box(6, 0, -6, 40, 20, 3, '#5a3a20').tube(-10, 0, -6, -10, 0, 120, .8, '#2a2a2a').tube(10, 0, -6, 10, 0, 120, .8, '#2a2a2a'); } }
};
S7.PENS = PENS;
function w0glow(rec, p, c) { rec.w.glow(p[0], p[1], p[2], 1.6, c, { core: '#ffffff' }); }
