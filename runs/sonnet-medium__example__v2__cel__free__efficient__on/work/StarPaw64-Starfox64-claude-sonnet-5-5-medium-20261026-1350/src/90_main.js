// ---------------------------------------------------------------- App flow, attract mode, 3D menu backdrop, boot, main loop
const Flow = {
  launch() {
    const players = UI.slots.map((s, i) => (s ? { dev: s.dev, slot: i } : null)).filter(Boolean); UI.hide(); Menu3D.leave(); Music.stop(true);
    Game.start({ stageIds: UI.mission.stages, players }); App.mode = 'play';
  },
  pause() { if (!Game.active || Game.paused || Game.over) return; Game.paused = true; A.loopStop('charge'); for (const p of Game.pilots) p.charging = false; A.play('ui_ok'); UI.show('pause'); },
  resume() { Game.paused = false; UI.hide(); },
  restart() { UI.hide(); Game.retryStage(); },
  quit() { Game.end(); UI.hide(); App.toTitle(); },
};
const App = {
  mode: 'menu', idleLimit: 10000,
  toTitle() { this.mode = 'menu'; Menu3D.enter(); UI.show('title'); Music.play('title'); },
};
const Attract = {
  active: false, actCount: 0, t: 0,
  start() {
    this.active = true; this.actCount = Input.activityCount; this.t = 0; UI.hide(); Menu3D.leave(); Music.stop(true); UI.show('attract'); this.ui = UI.cur;
    Game.start({ stageIds: ['catnip', 'belt'], players: [{ slot: 0, ai: {} }, { slot: 1, ai: {} }], attract: true }); App.mode = 'attract'; Music.play('stage1');
  },
  stop() { this.active = false; Game.end(); UI.hide(); App.toTitle(); Input.note(); },
  tick(dt) {
    if (!Game.active || Game.paused) return; this.t += dt;
    if (Game.kind === 'rail') { const a = Game.a; if (Game.time > 75 && a.s < 5300 && !Game.boss) Game.skipTo(5400); if (Game.boss && Game.boss.t > 50 && !Game.boss.dead) { for (const p of Game.boss.parts) if (p.part === 'core') { p.hp = Math.min(p.hp, 3); p.active = true; p.armor = false; } Game.boss.cannonL.hp = Game.boss.cannonR.hp = 1; } }
    else if (Game.arPhase === 0 && Game.arT > 32) Game.arKills = Math.max(Game.arKills, Game.st.quota);
    else if (Game.rival && Game.rival.t > 40) Game.rival.hp = Math.min(Game.rival.hp, 3);
  },
};
Game.skipTo = function (s) { this.a.s = s; Comms.reset(); while (this.evIdx < this.evs.length && this.evs[this.evIdx].trig < s) this.evIdx++; };

// 3D backdrop for the front-end: formation of cel-shaded ships orbiting in the asteroid belt
const Menu3D = {
  active: false, t: 0, ships: [], env: null,
  enter() {
    this.leave(); R.clearWorld(); FX.reset(); Phys.clearDebris(); Phys.newWorld(0, false); R.setPalette(STAGES.belt.palette); this.env = buildSpaceEnv(mulberry(9)); this.ships = [];
    const defs = [{ body: 0xeaf2ff, accent: 0x2f7bff, p: [0, 0, 0] }, { body: 0xf4f4ea, accent: 0x4cc36b, ears: true, p: [-11, 1, 7] }, { body: 0x4a4263, accent: 0xb35cff, p: [11, 1.5, 8] }, { body: 0xe8ffd8, accent: 0xffd33d, p: [0, 4, 13] }];
    for (const d of defs) { const s = buildShip(d); s.position.set(...d.p); R.world.add(s); this.ships.push({ s, base: V3(...d.p), ph: rr(0, 6) }); }
    this.active = true; this.t = 0; if (!R.cams.length) R.cams = [R.cam];
  },
  leave() { this.active = false; this.ships = []; },
  update(dt) {
    if (!this.active) return; this.t += dt; const t = this.t;
    this.ships.forEach((o, i) => { const p = o.base.clone(); p.y += Math.sin(t * 0.8 + o.ph) * 0.8; p.x += Math.sin(t * 0.5 + o.ph) * 1.2; o.s.position.copy(p); o.s.rotation.set(Math.sin(t * 0.6 + o.ph) * 0.06, 0.2, Math.sin(t * 0.7 + o.ph) * 0.3, 'YXZ'); for (const g of o.s.userData.glows) g.scale.set(1, 1.3 + Math.sin(t * 40 + i) * 0.2, 1); });
    for (const r of this.env.rocks) { r.m.rotation.x += r.spin.x * dt; r.m.rotation.y += r.spin.y * dt; }
    const cam = R.cams[0]; const ang = -0.9 + Math.sin(t * 0.12) * 0.45, rad = 30 - Math.sin(t * 0.07) * 4; cam.position.set(Math.sin(ang) * rad - 6, 5 + Math.sin(t * 0.2) * 2, Math.cos(ang) * rad + 5); cam.up.set(0, 1, 0); cam.lookAt(5, 2, 6); cam.fov = 55; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    this.env.stars.position.copy(cam.position); R.followSun(V3(0, 0, 0));
    if (Math.random() < dt * 8) FX.spark(V3(rr(-40, 40), rr(-15, 15), rr(-60, 20)).add(cam.position.clone().multiplyScalar(0.0)), V3(0, 0, 55), 0xbfe9ff, 1.2, 0.35);
  },
};

addEventListener('blur', () => { if (Game.active && !Game.paused && !Attract.active && !UI.visible()) Flow.pause(); });
function fatal(msg) { $('#boot').classList.add('hidden'); const f = $('#fatal'); f.classList.remove('hidden'); f.innerHTML = `<div><div class="big" style="font-size:calc(var(--u)*6)">Could not take off</div><p style="margin-top:2vh">${msg}</p><p style="margin-top:2vh;opacity:.7;font-size:.7em">Star Paw 64 requires a WebGPU-capable browser (recent Chrome, Edge or Safari Technology Preview).</p></div>`; }

let lastT = 0;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
  try {
    Input.poll(dt); const events = Input.drain();
    const playing = Game.active && !Game.paused && !Attract.active && !UI.visible();
    if (Attract.active) { if (Input.activityCount !== Attract.actCount) Attract.stop(); }
    else for (const ev of events) { if (playing) { if (ev.a === 'pausekey') { Flow.pause(); break; } } else if (ev.a !== 'pausekey') UI.handle(ev); }
    if (!Attract.active && !Game.active && UI.cur && UI.cur.name !== 'attract' && !Input.touchOnly && performance.now() - Input.activity > App.idleLimit) Attract.start();
    UI.update(dt); if (Attract.active) Attract.tick(dt);
    if (Game.active) Game.update(dt); else Menu3D.update(dt);
    if (!Game.active) { Tweens.update(dt); FX.update(dt); Hud.update(dt); Comms.update(dt); }
    const views = Game.active ? Game.views() : [{ cam: R.cams[0], x: 0, y: 0, w: innerWidth, h: innerHeight, pi: -1 }];
    if (Game.active && Game.kind === 'rail') Game.followCamera(0, false);
    R.draw(views); Hud.draw(views);
  } catch (e) { console.error('frame error', e); if (!frame.err) { frame.err = true; UI.toast('Error: ' + e.message); } }
}
async function boot() {
  try {
    Input.init(); UI.init(); Hud.init();
    $('#tb-settings').addEventListener('click', () => { UI.root.classList.add('raised'); UI.show('settings', { touch: true }); });
    await R.init($('#gl')); await Phys.init(); FX.init(); R.resize();
    if (Input.touchOnly) $('#touchblock').classList.remove('hidden');
    Menu3D.enter(); UI.show('title'); Music.play('title'); const b = $('#boot'); b.style.opacity = 0; setTimeout(() => b.classList.add('hidden'), 600);
    window.StarPaw = { Game, UI, Flow, App, Attract, Settings, STAGES, ENEMY_DEFS, COMMS, TRACKS, Input, A, R, Phys, FX, Hud, Comms, Menu3D, INFO, THREE, ready: true };
    requestAnimationFrame(frame);
  } catch (e) { console.error(e); fatal(String(e.message || e)); window.StarPaw = { error: String(e.message || e) }; }
}
boot();
