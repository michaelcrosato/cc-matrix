// 60-session: a play session: the Sim, the WorldView, a HUD and an Aimer per player, devices routed to players (P1:
// keyboard, mouse and any pad; P2: its own pad, split screen), the bot (attract, tests, the dev P2 bot), the events
// turned into sound, effects and HUD feedback, slow motion, music by phase, and the cutscene dialog box.
// Reads: Sim (20), WorldView (44), Hud (50), Aimer (46), Voice and audio (41, 42), Autopilot (53).

class Session {
  constructor(game, o) {
    this.game = game; this.o = o; this.hub = !!o.hub; this.mode = o.mode || 'arcade';
    const players = (o.players || [{ input: game.input }]).map((p, i) => ({ id: i, name: p.name || 'P' + (i + 1), color: p.color || ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i], agent: p.agent || TC.AGENTS[i], aspect: 16 / 9 }));
    this.inputs = (o.players || [{ input: game.input }]).map(p => p.input || null);
    this.sim = o.sim || new Sim({ mode: o.simMode || this.mode, stages: o.stages, stage: o.stage, scene: o.scene, difficulty: o.difficulty || 'normal', seed: o.seed === undefined ? (Date.now() & 0xffff) : o.seed, players, cheats: o.cheats, skipCuts: o.skipCuts });
    this.view = o.view || TC.view;
    this.huds = players.map((p, i) => new Hud(i)); this.aimers = this.inputs.map((inp, i) => inp ? new Aimer(inp, i) : null);
    this.bots = players.map(() => null); if (o.bot) this.bots[0] = new TC.Autopilot(o.bot);
    this.music = null; this.layersOn = null; this.slowT = 0; this.portraits = new Map(); this.dialogT = 0; this.lastLine = null; this.clearSeen = false; this.countT = 0;
    this.lastTimeTick = 99; this.seenWeapons = {};
    this.vps = [{ x: 0, y: 0, w: 427, h: 240 }];
    if (TC.view) TC.view.setStage(this.sim);
    this.applyAmbience();
  }
  get split() { return this.sim.players.length > 1 && !this.hub; }
  // a second player drops in (a controller's Start during ARCADE, or the co-op screen): split screen from now on
  addPlayer(input, agent = 'rook', bot = null) {
    const sim = this.sim; if (sim.players.length >= 2) return null;
    const p = sim._newPlayer({ name: 'P2', agent, color: '#3b82f6' }, sim.players.length); sim.players.push(p);
    this.huds.push(new Hud(p.i)); this.inputs.push(input); this.aimers.push(input ? new Aimer(input, p.i) : null); this.bots.push(bot);
    sim.emit('join', { p: p.i }); this.huds[p.i].banner('PLAYER 2 JOINED', '#6aa8ff', 1.6, 2);
    return p;
  }
  portrait(id) { if (!has('speaker', id)) return null; let r = this.portraits.get(id); if (!r) { r = new E.Humanoid(Object.assign({}, get('speaker', id).rig, { size: 1 })); r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); this.portraits.set(id, r); } return r; }
  viewports(r) {
    const W = r ? r.W : 427, H = r ? r.H : 240;
    if (this.split && this.sim.players.length === 2) return [{ x: 0, y: 0, w: Math.floor(W / 2) - 1, h: H }, { x: Math.floor(W / 2) + 1, y: 0, w: W - Math.floor(W / 2) - 1, h: H }];
    return [{ x: 0, y: 0, w: W, h: H }];
  }
  // ------------------------------------------------------------ update
  update(dt) {
    const sim = this.sim, set = this.game.settings || {};
    const vps = this.vps;
    const cmds = sim.players.map((p, i) => {
      if (this.bots[i]) return this.bots[i].command(sim, i, dt);
      const A = this.aimers[i]; if (!A) return this.remote ? this.remote(i) : {};
      const vp = vps[Math.min(i, vps.length - 1)] || vps[0], tg = A.dev === 'gamepad' ? TC.assistTargets(sim, i) : [];
      return A.build(dt, sim, vp, tg, { padSpeed: set.padSpeed, aimAssist: set.aimAssist === undefined ? undefined : { Off: 0, Low: .35, Medium: .6, High: .85 }[set.aimAssist], coverMode: set.coverMode, autoFire: set.autoFire });
    });
    if (this.netCmds) this.netCmds(cmds);
    this.lastCmds = cmds;
    if (tune.view.freeCam && !this.hub) { TC.dev.freeStep(dt, sim); cmds[0] = {}; } else TC.dev.free = null;
    const evs = sim.step(dt, cmds);
    this.handle(evs);
    this.view.updateRigs(sim, dt);
    FX.step(dt);
    for (const h of this.huds) h.step(dt);
    this.timeScale(dt);
    this.musicByPhase();
    // the storm: lightning every 9-15 s (a flash, the sky lit, thunder after), rain around every camera
    const env = sim.stage && sim.stage.env;
    if (env && env.lightning && sim.phase !== 'results') { this.boltT = (this.boltT === undefined ? 4 : this.boltT) - dt; if (this.boltT <= 0) { this.boltT = 9 + fxRand() * 6; this.fxCue({ kind: 'lightning' }); } }
    if (env && env.rain) for (let i = 0; i < Math.min(2, sim.players.length); i++) { const c = sim.cameraFor(i); for (let k = 0; k < 6; k++) { const a = fxRand() * 6.283, r = 20 + fxRand() * 220; FX.add({ p: [c.x + Math.cos(a) * r + Math.cos(c.yaw) * 80, c.y + Math.sin(a) * r + Math.sin(c.yaw) * 80, c.z + 60 + fxRand() * 40], v: [-40, 20, -420], rgb: [150, 170, 190], size: .4, life: .35, mode: 'rain' }); } }
    // time ticks below 10 s
    if (sim.phase === 'action' && sim.timer < 10 && Math.ceil(sim.timer) !== this.lastTimeTick) { this.lastTimeTick = Math.ceil(sim.timer); this.sfx('timetick'); }
    if (this.game.audio && this.music && this.game.audio.tempo) { /* tempo follows TIME below 10 s */ const want = this.music.bpm + (sim.phase === 'action' && sim.timer < 10 ? 8 : 0); if (this._tempo !== want) { this._tempo = want; this.game.audio.tempo(want); } }
  }
  timeScale(dt) {
    const sim = this.sim, g = this.game;
    if (this.slowT > 0) this.slowT -= 1 / 120;
    const want = sim.slow ? .3 : this.slowT > 0 ? .35 : 1;
    g.timeScale = want * (tune.time.speed || 1);
  }
  sfx(name, o = {}) { const A = this.game.audio; if (A && A.ctx !== undefined) A.sfx('tc-' + name, o); }
  // ------------------------------------------------------------ events -> sound, effects, HUD
  handle(evs) {
    const sim = this.sim;
    for (const e of evs) {
      for (const h of this.huds) h.onEvent(e, sim, this.view, this.game);
      const P = e.p !== undefined && e.p >= 0 ? e.p : 0;
      switch (e.type) {
        case 'shot': { this.sfx(e.w, { vary: .04 }); FX.recoil[P] = get('weapon', e.w).recoil / 2; if (this.inputs[P] && this.inputs[P].rumble && e.w !== 'hg') this.inputs[P].rumble(.25, .06); const cs = sim.camSetupFor(P), d = aimRay(cs, e.aim[0], e.aim[1]), hit = sim.raycast(cs.pos, d); const from = vadd(vadd(cs.pos, vmul(cs.r, 6)), vadd(vmul(cs.u, -5), vmul(cs.f, 8))); if (e.w === 'mg' || e.w === 'sg' || fxRand() < .35) FX.tracer(from, hit ? hit.at : vadd(cs.pos, vmul(d, 900)), [255, 230, 150], .05); FX.light(vadd(cs.pos, vmul(cs.f, 20)), 120, .5, '#ffd080', .05); break; }
        case 'impact': { const s = e.surf; this.sfx(s === 'wood' || s === 'paper' ? 'wood' : s === 'water' ? 'water' : s === 'glass' ? 'glass' : s === 'concrete' ? 'concrete' : 'metal', { vol: .7 }); const rgb = s === 'wood' ? [180, 130, 70] : s === 'water' ? [200, 220, 255] : s === 'concrete' ? [170, 165, 150] : s === 'glass' ? [200, 230, 255] : [255, 220, 120]; FX.burst(e.at, s === 'water' ? 8 : 6, { rgb, size: s === 'metal' || s === 'armor' || s === 'shield' ? 1 : 1.6, speed: s === 'water' ? 30 : 50, life: .35, mode: s === 'metal' || s === 'armor' || s === 'shield' ? 'add' : 'alpha', g: 160, up: s === 'water' ? 40 : 0 }); break; }
        case 'hit': { this.sfx(e.head ? 'head' : 'ehit'); FX.burst(e.at, 5, { rgb: [230, 230, 230], size: 1.6, speed: 40, life: .25, mode: 'alpha', alpha: .8 }); break; }
        case 'kill': { if (fxRand() < .5) TC.Voice.bark(this.game, 'die', 120); if (e.at) FX.burst(e.at, 6, { rgb: [200, 200, 200], size: 2.2, speed: 40, life: .4, mode: 'alpha' }); break; }
        case 'bosshit': { this.sfx('ehit'); if (e.at) FX.burst(e.at, 6, { rgb: [255, 220, 120], size: 1.2, speed: 60, life: .3, mode: 'add', g: 100 }); break; }
        case 'eshot': { this.sfx(e.kind === 'zap' ? 'zap' : e.kind === 'sniper' ? 'sniper' : 'erifle', { vol: .55 }); FX.light(e.at, 80, .7, '#ffc070', .06); FX.burst(e.at, 3, { rgb: [255, 210, 120], size: 2.2, speed: 20, life: .08 }); const tp = sim.cameraFor(e.target || 0), miss = [tp.x + (fxRand() - .5) * 40, tp.y + (fxRand() - .5) * 40, tp.z + (fxRand() - .3) * 20]; FX.tracer(e.at, miss, e.kind === 'zap' ? [120, 220, 255] : [255, 220, 150], .07); this.sfx('whizz', { vol: .4 }); break; }
        case 'threat': this.sfx('tick', { vol: e.target === 0 ? 1 : .4 }); if (e.kind === 'sweep' || e.kind === 'turret') this.sfx('spinup'); break;
        case 'threathit': case 'hurt': if (e.type === 'hurt') { this.sfx('hurt'); FX.jolt[P] = 1; FX.trauma[P] = Math.min(1, FX.trauma[P] + .5); this.game.flash && this.game.flash('#ff2020', .12, .5); if (this.inputs[P] && this.inputs[P].rumble) this.inputs[P].rumble(.6, .25); TC.Voice.bark(this.game, 'hurt', 150); } break;
        case 'blocked': this.sfx('ricochet', { vol: .6 }); { const cp = TC.coverPoint(sim, P, 13); cp[2] += 12; FX.burst(cp, 6, { rgb: [255, 220, 120], size: 1, speed: 70, life: .25, g: 200 }); } break;
        case 'cover': this.sfx(e.on ? 'coverIn' : 'coverOut', { vol: .6 }); break;
        case 'reload': this.sfx('reload'); break;
        case 'switch': this.sfx('switch'); break;
        case 'empty': this.sfx('empty'); break;
        case 'pickup': this.sfx(e.first ? 'newweapon' : 'pickup'); break;
        case 'extra': this.game.audio.sting && this.game.audio.sting(TC.song('extra'), { at: 'now' }); break;
        case 'extend': this.sfx('extend'); break;
        case 'timeup': this.sfx('tidein'); FX.trauma[0] = 1; break;
        case 'explode': { this.sfx(e.size > 1.1 ? 'explode' : 'explodeS'); FX.explosion(e.at, Math.min(2.4, e.size || 1)); for (let i = 0; i < 4; i++) { const c = sim.cameraFor(i); if (!sim.players[i]) continue; const d = vdist(e.at, [c.x, c.y, c.z]); FX.trauma[i] = Math.min(1, FX.trauma[i] + clamp(1 - d / 500, 0, 1) * .7 * (e.size || 1)); } break; }
        case 'fireworks': this.firework(e.at, e.big); break;
        case 'splash': this.sfx('splash'); FX.burst(e.at, 14, { rgb: [220, 235, 255], size: 2.2, speed: 40, up: 70, g: 240, life: .8, mode: 'alpha', alpha: .8 }); break;
        case 'break': { this.sfx(e.kind === 'window' || e.kind === 'bottles' || e.kind === 'intel' ? 'glassbreak' : 'break'); FX.burst(e.at, 8, { rgb: e.kind === 'lantern' ? [255, 170, 60] : [170, 130, 80], size: 1.4, speed: 50, g: 220, life: .7, mode: e.kind === 'lantern' ? 'add' : 'solid' }); if (e.kind === 'intel') this.saveIntel(e); break; }
        case 'intel': this.saveIntel(e); break;
        case 'door': this.sfx('door'); break;
        case 'land': this.sfx('land'); break;
        case 'throw': this.sfx('slash', { vol: .4 }); break;
        case 'proj': this.sfx(e.kind === 'pgl' ? 'gl' : e.kind === 'harpoon' ? 'harpoon' : e.kind === 'torpedo' ? 'torpedo' : e.kind === 'flare' ? 'flare' : e.kind === 'grenade' ? 'bounce' : 'rocket', { vol: .7 }); break;
        case 'slash': this.sfx(e.blocked ? 'clang' : 'slash'); break;
        case 'spinup': this.sfx('spinup', { vol: .7 }); break;
        case 'armor': this.sfx('armor'); break;
        case 'shieldknock': this.sfx('clang'); break;
        case 'boss': this.view.bossCard = e.card ? { name: e.name, title: e.title, t: 0 } : null; if (e.card) this.game.audio.sting && this.game.audio.sting(TC.song('stinger'), { at: 'now' }); break;
        case 'bossdown': if (e.slow && !this.hub) this.slowT = .6; this.chainExplosions(e.at); break;
        case 'finalshot': this.sfx('slowmo'); break;
        case 'surge': this.sfx('surge'); FX.trauma[0] = .8; break;
        case 'smoke': for (let i = 0; i < 30; i++) FX.add({ p: [sim.boss.x + (fxRand() - .5) * 120, sim.boss.y + (fxRand() - .5) * 120, sim.boss.z + fxRand() * 30], v: [0, 0, 3], rgb: [170, 170, 180], size: 14, grow: 6, life: 3, mode: 'alpha', alpha: .7 }); break;
        case 'say': { if (e.modal || !this.subtitlesOnly) TC.Voice.say(this.game, e.text, e.speaker, { vol: e.modal ? 1 : .8 }); break; }
        case 'music': this.playMusic(e.song); break;
        case 'stageclear': this.game.audio.sting && this.game.audio.sting(TC.song('clear'), { at: 'now' }); break;
        case 'fx': this.fxCue(e); break;
        case 'coverswap': this.sfx('break'); FX.trauma[0] = .6; break;
        case 'coverhit': { this.sfx('break'); for (let i = 0; i < sim.players.length; i++) { const cp = TC.coverPoint(sim, i, 13); cp[2] += 10; FX.burst(cp, 12, { rgb: [150, 140, 130], size: 2, speed: 70, g: 240, life: .7, mode: 'solid' }); } break; }
        case 'scene': this.lastTimeTick = 99; break;
        case 'stage': this.view.setStage(sim); this.applyAmbience(); break;
      }
      if (this.onEvent) this.onEvent(e);
    }
  }
  saveIntel(e) { if (!e.id) return; const got = E.store.get('tc3:intel', []); if (!got.includes(e.id)) { got.push(e.id); E.store.set('tc3:intel', got); } }
  firework(at, big) { const cols = [[255, 90, 90], [255, 211, 74], [90, 209, 255], [138, 255, 138], [255, 140, 255]], c = cols[(fxRand() * cols.length) | 0]; FX.burst(at, big ? 40 : 24, { rgb: c, size: 2, speed: big ? 110 : 70, life: 1.1, g: 40, drag: 1.2, mode: 'add' }); FX.light(at, 400, .9, '#ffd0a0', .3); this.sfx('fireworks', { vol: .6 }); }
  chainExplosions(at) { if (!at) return; for (let i = 0; i < 5; i++) this.game.after ? this.game.after(i * .18, () => { this.sfx('explode'); FX.explosion([at[0] + (fxRand() - .5) * 50, at[1] + (fxRand() - .5) * 50, at[2] + (fxRand() - .5) * 20], 1.4); }) : null; }
  fxCue(e) {
    const sim = this.sim, k = e.kind;
    if (k === 'gallery') { this.sfx('explode'); FX.trauma[0] = .8; }
    if (k === 'bulldog' || k === 'crash') { this.sfx('explode'); FX.trauma[0] = .7; if (e.at) FX.explosion(e.at, 1.2); }
    if (k === 'doorfall') this.sfx('clang');
    if (k === 'beam') { this.game.flash && this.game.flash('#ffffff', .3, .35); }
    if (k === 'topple') { this.sfx('stomp'); FX.trauma[0] = 1; }
    if (k === 'heliCrash') { this.sfx('explode'); }
    if (k === 'lightning') { FX.lightning = 1; this.game.flash && this.game.flash('#ffffff', .1, .25); this.game.after && this.game.after(.6 + fxRand(), () => this.sfx('thunder')); }
  }
  applyAmbience() { const st = this.sim.stage; if (!st || !this.game.audio || !this.game.audio.ctx) return; TC.Amb.start(this.game, st.amb || (st.id === 1 ? 'festival' : st.id === 2 ? 'storm' : st.id === 3 ? 'tidewall' : 'range')); }
  playMusic(id, o = {}) { if (!id || !has('song', id)) return; const s = TC.song(id); if (this.music === s && !o.restart) return; this.music = s; this._tempo = s.bpm; this.layersOn = null; this.game.audio.music && this.game.audio.music(s, { fade: o.fade === undefined ? .8 : o.fade }); }
  musicByPhase() {
    const sim = this.sim; if (sim.phase === 'cut') return;
    const st = sim.stage, boss = sim.boss && !sim.boss.defeated && sim.boss.D && (sim.boss.D.card !== false), want = boss ? (sim.stageId === 3 && sim.boss.id !== 'seawolf' ? 'kingtide' : 'boss') : st.music;
    if (sim.phase === 'results' || sim.phase === 'done') return;
    this.playMusic(want);
    const on = sim.phase === 'action'; if (this.layersOn !== on && this.game.audio.layer) { this.layersOn = on; for (const n of ['lead', 'drums']) try { this.game.audio.layer(n, on ? 1 : 0, .6); } catch (err) { /* this song has no such layer */ } }
  }
  // ------------------------------------------------------------ draw
  draw(r) {
    const sim = this.sim, vps = this.vps = this.viewports(r);
    r.overlay(g => {
      vps.forEach((vp, k) => {
        const i = this.split ? k : (this.localIndex || 0), free = k === 0 && tune.view.freeCam && TC.dev.free, Rr = this.view.draw(g, sim, i, vp, free ? { cam: TC.dev.free } : {});
        TC.dev.overlay(g, Rr, sim, vp);
        this.huds[i] && this.huds[i].draw(g, sim, vp, Rr, { settings: this.game.settings, input: this.inputs[i] || this.game.input, hub: this.hub, portrait: id => this.portrait(id) });
      });
      if (this.split) E.px.rect(g, Math.floor(r.W / 2) - 1, 0, 2, r.H, '#000000');
      this.drawCut(g, r);
      this.drawBossCard(g, r);
      if (tune.view.perf && this.view.R[0]) { const s = this.view.R[0].stats; T(g, 'tris ' + s.tris + ' px ' + s.px + ' actors ' + s.actors, 4, r.H - 10, '#7fe3ff', { font: 'tiny' }); }
      if (this.overlayDraw) this.overlayDraw(g, r);
    });
  }
  drawBossCard(g, r) {
    const c = this.view.bossCard, B = this.sim.boss; if (!c || !B || B.intro <= 0) return;
    const k = clamp((2.5 - B.intro) / .3, 0, 1), y = r.H * .34;
    E.px.rect(g, 0, y - 4, r.W * k, 40, '#08142a'); E.px.rect(g, 0, y - 4, r.W * k, 2, '#ff5a2a'); E.px.rect(g, 0, y + 34, r.W * k, 2, '#ff5a2a');
    if (k >= 1) { E.font.title(g, c.name, r.W / 2, y, { scale: 3, colors: ['#ffffff', '#ffd36a', '#ff5a2a'], outline: '#1a0808', align: 'center' }); T(g, c.title, r.W / 2, y + 24, '#ffb0a0', { align: 'center' }); }
  }
  drawCut(g, r) {
    const sim = this.sim, C = sim.cut; if (!C) return;
    E.px.rect(g, 0, 0, r.W, 16, '#000000'); E.px.rect(g, 0, r.H - 16, r.W, 16, '#000000');
    const I = this.inputs[0] || this.game.input;
    T(g, 'HOLD ' + TC.label(I, 'confirm') + ' TO SKIP', r.W - 6, 4, '#8aa0c8', { align: 'right', font: 'tiny' });
    if (!C.line) return;
    const spk = has('speaker', C.line.speaker) ? get('speaker', C.line.speaker) : null, w = Math.min(r.W - 24, 380), x = (r.W - w) / 2, y = r.H - 72;
    E.ui.box(g, x, y, w, 52, { bg: UI.bg, border: spk ? spk.color : UI.accent, alpha: .94 });
    const rig = this.portrait(C.line.speaker); if (rig) rig.drawPortrait(g, x + 5, y + 6, 40, { zoom: 2.6, turn: .5, bg: C.line.screen ? '#0c3a34' : '#0a1426', frame: true });
    T(g, (spk ? spk.name : '') + (C.line.screen ? '  · BROADCAST' : ''), x + 52, y + 5, spk ? spk.color : UI.gold);
    const full = TC.txt(C.line.text), n = Math.floor(C.lineT * 42), shown = full.slice(0, n), lines = E.font.wrap(shown, w - 60);
    lines.slice(0, 3).forEach((l, k) => T(g, l, x + 52, y + 16 + k * 10, '#ffffff'));
    if (n >= full.length && ((sim.t * 2) | 0) % 2) T(g, '▸', x + w - 10, y + 40, UI.gold);
  }
}
TC.Session = Session;
