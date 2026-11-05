// 51-flow.js — Run (a session of play: mode, difficulty, stage carry-over), the play scene (single and split screen),
// scene audio mapping, continues, and results/game-over routing. Reads Sim; the Sim never reads this.
let game = null, arcade = null;
const Run = {
  mode: 'arcade', diff: 'normal', stage: 1, np: 1, sim: null, carry: null, results: [], hub: null, attract: false,
  players(n) { return Array.from({ length: n }, (_, i) => ({ name: 'P' + (i + 1), agent: AGENT[i], color: PCOL[i] })); },
  begin(mode, stage, diff, np) { this.mode = mode; this.stage = stage; this.diff = diff || 'normal'; this.np = np || 1; this.carry = null; this.results = []; this.sim = null; },
  newSim(stage, sceneId, extra = {}) {
    const first = reg('stage', stage).scenes[0], sim = new Sim(Object.assign({ mode: this.mode, stage, scene: sceneId || first, difficulty: this.diff, players: this.players(this.np), seed: (Date.now() & 0xffff) + stage * 77 }, extra));
    if (this.carry) this.carry.forEach((c, i) => { const p = sim.players[i]; if (p && c) { p.score = c.score; p.lives = Math.max(c.lives, 1); p.ammo = c.ammo.slice(); p.weapon = 0; p.st = c.st; p.continues = c.continues; p.mark = c.mark; p.nextLife = c.nextLife; p.seen = c.seen; p.best = c.best; } });
    this.sim = sim; return sim;
  },
  keepCarry(sim) { this.carry = sim.players.map(p => ({ score: p.score, lives: p.down ? sim.diff.lives : p.lives, ammo: p.ammo.slice(), st: p.st, continues: p.continues, mark: p.mark || 0, nextLife: p.nextLife, seen: p.seen, best: p.best })); }
};
const Settings_ = () => game.settings || {};
function viewportRects(np, W, H) { if (np <= 1) return [{ x: 0, y: 0, w: W, h: H }]; const w = Math.floor((W - 1) / 2); return [{ x: 0, y: 0, w, h: H }, { x: W - w, y: 0, w, h: H }]; }
function localInputs(np) { const a = [game.input]; for (let i = 1; i < np; i++) a.push(game.players[i] || game.input); return a; }
// ---- audio mapping for sim events ----
function playEvents(sim, local) {
  const near = pid => pid == null || local.includes(pid);
  for (const ev of sim.events) {
    switch (ev.type) {
      case 'shot': SND.play('w_' + WEAPONS[ev.w].id, { pitch: near(ev.p) ? 1 : .8, vol: near(ev.p) ? 1 : .6 }); break;
      case 'empty': SND.play('empty'); break;
      case 'reload': if (near(ev.p)) SND.play('reload'); break;
      case 'switch': if (near(ev.p)) SND.play('switch'); HUD.strip = HUD.strip || []; HUD.strip[ev.p] = .8; break;
      case 'impact': SND.play(ev.mat === 'steel' || ev.mat === 'metal' ? 'ping' : ev.mat === 'crate' || ev.mat === 'planks' || ev.mat === 'timber' ? 'wood' : 'thud', { vol: .6 }); break;
      case 'hit': SND.play(ev.head ? 'head' : 'e_hit', { vol: near(ev.p) ? .8 : .4 }); break;
      case 'kill': SND.play('e_die', { vol: .6 }); if (Math.random() < .5) { } break;
      case 'explode': SND.play(ev.big ? 'boom_b' : 'boom_s'); break;
      case 'break': SND.play(ev.mat === 'glass' ? 'glass' : ev.kind === 'lantern' ? 'lantern' : 'wood'); break;
      case 'eshot': SND.play(ev.kind === 'zap' ? 'zap' : ev.kind === 'turret' ? 'w_mg' : 'w_handgun', { vol: .35, pitch: .85 }); break;
      case 'emiss': SND.play('whizz', { vol: .5 }); break;
      case 'threat': SND.play('tick', { vol: .6 }); break;
      case 'impactme': SND.play('chirp'); break;
      case 'blocked': SND.play('ping'); SND.play('cover_in', { vol: .3 }); break;
      case 'hurt': SND.play('thud'); if (near(ev.p)) { Voice.bark(AGENT[ev.p] || 'kai'); game.input.rumble(.6, .25); } break;
      case 'pickup': SND.play(ev.first ? 'newweapon' : 'pickup'); break;
      case 'oneup': SND.play('oneup'); break;
      case 'extend': SND.play('extend'); break;
      case 'timeup': SND.play('timeup'); break;
      case 'action': SND.play('confirm'); break;
      case 'throw': SND.play(ev.kind === 'grenade' ? 'grenade' : ev.kind === 'harpoon' ? 'harpoon' : ev.kind === 'flare' ? 'flare' : 'rocket'); break;
      case 'windup': SND.play('windup', { vol: .5 }); break;
      case 'slash': SND.play('slash'); break;
      case 'spinup': SND.play('spin'); break;
      case 'stagger': case 'topple': SND.play('stomp'); break;
      case 'bigboom': SND.play('boom_b'); break;
      case 'lockjam': SND.play('lock'); break;
      case 'partbreak': SND.play('boom_s'); break;
      case 'clear': SND.play('stamp'); break;
      case 'turretspin': SND.play('spin', { vol: .5 }); break;
      case 'clawcharge': SND.play('windup', { vol: .6 }); break;
      case 'shotdown': SND.play('head'); break;
      case 'civhit': SND.play('timeup'); break;
    }
  }
}
function sceneMusic(sim) {
  const st = reg('stage', sim.stage), sc = sim.scene; if (!st || !sc) return; const want = sim.boss && !sim.boss.mini ? (sim.boss.id === 'krake' ? 'kingtide' : 'boss') : sim.boss && sim.boss.mini ? 'boss' : sc.stage === 0 ? 'range' : st.music;
  if (Run._song !== want) { Run._song = want; musicFor(game, want); Run._layers = null; }
}
function layerMusic(sim) { const on = sim.phase === 'action' || sim.phase === 'boss'; if (Run._layerOn === on) return; Run._layerOn = on; try { for (const n of ['lead', 'drums']) game.audio.layer(n, on ? 1 : 0, .4); } catch (e) { } }
// ---- the play scene ----
const PlayCtx = { inputs: [], local: [0], settings: {}, corner: null, reticleOn: () => true };
function playEnter(data) {
  data = data || {};
  Pres.reset(); resetHud(); HUD.shown = Run.mode === 'attract' ? { cover: 1, reload: 1, shield: 1, laser: 1, torpedo: 1, final: 1 } : (HUD.seenStore || HUD.shown); 
  const sim = data.sim || Run.sim || Run.newSim(Run.stage); Run.sim = sim; Run._song = null; Run._layerOn = null;
  PlayCtx.local = sim.players.map((p, i) => i); if (Run.hub) PlayCtx.local = sim.mode === 'server' ? [] : [Run.hub.me];
  game.camera && 0; 
  if (sim.players.length > 1 && PlayCtx.local.length > 1) game.splitScreen(2, { layout: 'columns' }); else game.splitScreen(0);
  game.lights.enabled = false; Run.paused = false; Run.endT = 0; Run.contHandled = {};
  if (!Run.sim.started) { Run.sim.started = true; }
}
function applySettings() { const s = game.settings; PlayCtx.settings = { aimAssist: s.aimAssist, padSpeed: s.padSpeed, coverMode: s.coverMode, autoFire: s.autoFire, reticle: s.reticle, reticleSize: s.reticleSize, threatSize: s.threatSize, subtitles: s.subtitles === 'on' || s.subtitles === true, mouseOff: false }; PlayCtx.settings.subtitles = s.subtitles !== 'off' && s.subtitles !== false; }
function playUpdate(dt) {
  const sim = Run.sim; if (!sim) return;
  applySettings(); const np = sim.players.length, isCo = np > 1 && PlayCtx.local.length > 1, rects = viewportRects(isCo ? np : 1, game.W, game.H);
  PlayCtx.inputs = localInputs(np);
  if (Run.hub && sim.mode === 'replica' && window.AIHub.time() < 0) { HUD.countdown = Math.ceil(-window.AIHub.time() / 1000); return; }
  if (Dev.open) { Dev.update(dt); stepPres(0, sim); return; }
  if (tune.view.freecam) { freeCam(dt); }
  const cmds = [];
  if (Run.mode === 'attract' || Run.botOn) { for (const p of sim.players) cmds[p.id] = Bot.command(sim, p, dt); }
  else if (sim.mode === 'replica') { cmds[Run.hub.me] = readCommand(sim, Run.hub.me, game.input, rects[0], dt, PlayCtx.settings, true); }
  else if (sim.mode === 'host' || sim.mode === 'server') { if (Run.hub && window.AIHub.time() < 0) { sim.events.length = 0; HUD.countdown = Math.ceil(-window.AIHub.time() / 1000); stepPres(dt, sim); return; } HUD.countdown = 0; const hc = netHostCommands(sim); for (const k in hc) cmds[k] = hc[k]; if (sim.mode === 'host') cmds[Run.hub.me] = readCommand(sim, Run.hub.me, game.input, rects[0], dt, PlayCtx.settings, true); }
  else for (const i of PlayCtx.local) { const inp = PlayCtx.inputs[i]; cmds[i] = readCommand(sim, i, inp, rects[isCo ? i : 0], dt, PlayCtx.settings, i === 0); if (Run.botP2 && i === 1) cmds[i] = Bot.command(sim, sim.players[1], dt); }
  // continue handling
  for (const p of sim.players) if (p.down && p.contT > 0 && !p.contFail && Run.mode !== 'attract') {
    const inp = PlayCtx.inputs[p.id] || game.input; if (inp.pressed('start') || inp.pressed('confirm') || (p.id === 0 && inp.clicked && inp.clicked())) { sim.continuePlayer(p); SND.play('confirm'); }
  }
  const single = sim.players.length === 1; let frozen = false;
  if (single && sim.players[0].down && sim.players[0].contT > 0) { sim.players[0].contT -= dt; frozen = true; if (sim.players[0].contT <= 0) { sim.players[0].contFail = true; sim.players[0].contT = 0; sim.emit('contfail', {}); sim.checkOver(); frozen = false; } }
  if (!frozen) { if (sim.mode === 'replica') netReplicaStep(sim, dt, cmds); else sim.step(dt * tune.time.speed, cmds); } else sim.events.length = 0;
  for (const p of sim.players) { if (p.down && p.contFail && single) { } }
  if (sim.mode === 'host') netHostStep(sim, dt);
  consumeEvents(sim, PlayCtx); hudEvents(sim, game.input, PlayCtx.local); playEvents(sim, PlayCtx.local); stepHud(dt); stepPres(dt, sim);
  if (sim.events.some(e => e.type === 'timeup' || e.type === 'hurt')) game.flash && game.flash('#ff2020', .12);
  for (let i = 0; i < 4; i++) if (HUD.strip && HUD.strip[i] > 0) HUD.strip[i] -= dt;
  sceneMusic(sim); layerMusic(sim);
  if (sim.timer < 10 && sim.phase === 'action' && Math.floor(sim.timer) !== Run._lastTick) { Run._lastTick = Math.floor(sim.timer); SND.play('time_tick'); }
  // end conditions
  if (sim.phase === 'stageclear') { Run.endT += dt; if (Run.endT > 2.2) endStage(); }
  else if (sim.phase === 'over') { Run.endT += dt; if (Run.endT > 2.5) { if (Run.mode === 'attract') attractNext(); else if (!Run.hub) game.go('gameover', { sim }); } }
  if (Run.mode === 'range' && sim.phase === 'clear') { }
  if (Run.mode === 'attract') attractWatch(sim, dt);
  if (sim.mode === 'range' && sim.phase === 'stageclear') { }
}
function freeCam(dt) {
  const I = game.input, c = Dev.cam, sp = (I.down('cover') ? 240 : 90) * dt, ca = Math.cos(c.yaw), sa = Math.sin(c.yaw);
  if (!Dev.camInit) { const p = Run.sim.pose(0); Object.assign(c, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }); Dev.camInit = 1; }
  let fx = 0, fy = 0; if (I.down('up')) fx++; if (I.down('down')) fx--; if (I.down('left')) fy--; if (I.down('right')) fy++; const m = I.padMove; if (m && Math.hypot(m[0], m[1]) > .2) { fx -= m[1]; fy += m[0]; }
  c.x += (ca * fx - sa * fy) * sp; c.y += (sa * fx + ca * fy) * sp; if (I.down('next')) c.z += sp; if (I.down('prev')) c.z -= sp; if (I.padAim) { c.yaw += I.padAim[0] * 1.6 * dt; c.pitch = clamp(c.pitch - I.padAim[1] * 1.2 * dt, -1.2, 1.2); }
  if (I.pressed('reload') && navigator.clipboard) { const s = '[' + [c.x, c.y, c.z, c.yaw / DEG, c.pitch / DEG].map(v => +v.toFixed(1)).join(', ') + ']'; try { navigator.clipboard.writeText(s); } catch (e) { } console.log('camera pose', s); Dev.msg = 'Copied ' + s; Dev.msgT = 3; }
}
function drawSimView(g, sim, pid, rect, t) {
  g.save(); g.beginPath(); g.rect(rect.x, rect.y, rect.w, rect.h); g.clip(); g.translate(rect.x, rect.y); E.px.reset(g);
  drawWorld(g, sim, pid, rect.w, rect.h, t, tune.view.freecam ? { pose: Object.assign({ fov: tune.view.fov, roll: 0 }, Dev.cam) } : {}); g.restore(); E.px.reset(g);
}
function playDraw(r) {
  const sim = Run.sim; if (!sim) return; const np = sim.players.length, isCo = np > 1 && PlayCtx.local.length > 1;
  r.overlay(g => {
    const rects = viewportRects(isCo ? np : 1, r.W, r.H); const t = game.time;
    const local = PlayCtx.local; PlayCtx.corner = game.cornerArea && game.cornerArea();
    const pids = isCo ? [0, 1] : [local[0] != null ? local[0] : 0];
    for (let k = 0; k < pids.length; k++) { const pid = pids[k], rect = rects[k]; drawSimView(g, sim, pid, rect, t); drawHud(g, sim, pid, rect, PlayCtx); }
    if (isCo) px.rect(g, rects[0].w, 0, r.W - rects[0].w * 2, r.H, '#000000');
    if (Dev.open) Dev.draw(g, r.W, r.H, sim);
    if (tune.view.rail || tune.view.colliders) devOverlays(g, sim, rects[0]);
    if (Run.mode === 'attract') attractOverlay(g, r.W, r.H);
    if (sim.phase === 'travel' && sim.pt < .45) { px.blend(g, 1 - sim.pt / .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000')); }
  });
}
function endStage() {
  const sim = Run.sim; Run.keepCarry(sim);
  if (Run.mode === 'attract') { attractNext(); return; }
  if (Run.hub) return;
  game.go('results', { sim, stage: sim.stage });
}
