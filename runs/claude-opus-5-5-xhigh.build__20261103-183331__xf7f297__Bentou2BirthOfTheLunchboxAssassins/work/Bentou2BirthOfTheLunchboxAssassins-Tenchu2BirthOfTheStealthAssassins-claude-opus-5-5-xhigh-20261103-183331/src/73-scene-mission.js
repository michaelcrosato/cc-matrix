/* ---- THE MISSION SCENE: one gameplay scene for the story, the Shadow Trial, the hub round, attract mode and the
 * Workshop's test play. Each step: the intent, the hero, the senses, the minds, bosses, Tobei, tools, the mission's rules,
 * the HUD, the music, the camera. It draws the level, Shadow Sight's actors, the HUD and the game-over overlay ---- */
let GPU = null;
const LIGHT_AMB = { dusk: .5, night: .38, rain: .32, festival: .44 };
const MS = {};
MS.enter = d => {
  const opts = d || {};
  let M = opts.M;
  if (!M) {
    const mid = opts.mission || 'training', mis = B.get('mission', mid), lv = opts.level || (mis ? mis.level : mid);
    M = Mission.create(lv, { mode: opts.mode || 'story', char: opts.char || Save.get().character || 'sojiro', missionId: mid, loadout: opts.loadout, cheats: opts.cheats, save: Save.get() });
    M.startLoadout = Bento.copy(M.hero.bento); M.levelSpec = opts.level && typeof opts.level === 'object' ? opts.level : null;
  }
  M.onEnd = opts.onEnd || M.onEnd || null; M.endT = 0; M.overMenu = null;
  B.M = M; Tools.cd = 0; Hud.reset(); Cutscene.clear(); game.resetCamera(); Cam.reset(); Grapple.cands = []; Grapple.best = null; Grapple.aiming = false; SilentCut.active = null; SilentCut.slowT = 0;
  game.timeScale = (B.Dev && B.Dev.timeScale) || 1;
  if (game.settings.camAngle === 'high') game.setView('threequarter'); else game.setView('iso');
  const W = M.world, L = M.level;
  Lt.enabled = true; Lt.ambient = clamp(T('ambientNight') * (LIGHT_AMB[L.time] || .38) / .38, .1, .9);
  if (!game.headless && !GPU && typeof navigator !== 'undefined' && navigator.gpu && !(E.session && (E.session.recording || E.session.replaying))) { try { GPU = game.enableGPU({ map: W.map }); } catch (e) { GPU = null; } }
  if (GPU) { GPU.map = W.map; GPU.enabled = true; const a = Lt.ambient; GPU.ambient = [a * .8, a * .85, a * 1.15]; }
  game.weather = L.weather ? { kind: L.weather, amount: L.weather === 'rain' ? .9 : .5, wind: .3, lightning: 0 } : null;
  game.cam.bounds = v => W.map.bounds(v); game.cam.smooth = .12; game.cam.snap = true; game.follow(null);
  M.lightT = 6 + rand() * 6;
  B.Music.play(M.music || L.music || 'm1', { fade: .6 }); Au.layer && Music.cur && (Music.level = 0);
  if (M.snap) B.Hud.toast('Checkpoint', 'Back where the rice was last good.');
  B.emit('missionStart', { M });
};
MS.intent = M => {
  if (M.mode === 'attract' && B.Autopilot) return B.Autopilot.intent(M);
  if (B.testIntent) return Object.assign(B.noIntent(), B.testIntent);
  if (M.autopilot && B.Autopilot) return B.Autopilot.intent(M);
  if (M.locked || (B.Hub && B.Hub.locked)) return B.noIntent();
  return B.intentFromInput();
};
MS.step = (dt, M) => {
  const W = M.world, rd = dt / Math.max(.05, game.timeScale);
  SilentCut.update(rd, M);
  if (Cutscene.update(dt)) { Hud.update(dt, M); Cam.update(dt, M.hero, null); return; }
  if (M.ended) { MS.ending(dt, M); Hud.update(dt, M); Cam.update(dt, M.hero, null); return; }
  const it = MS.intent(M); M.lastIntent = it;
  if (it.mouseMode && M.holding && game.input.down('attack')) it.interactDown = true;   // a held left click keeps a hold interaction going
  if (it.player && game.input.pressed('objectives') && !HUBACTIVE && M.mode !== 'attract') { MS.objectivesPanel(M); return; }
  M.focus = !!it.focusDown;
  W.dynStep.length = 0;
  if (M.hero.stunT > 0) { M.hero.stunT -= dt; Object.assign(it, { move: [0, 0], attackPressed: false, jumpPressed: false, usePressed: false }); }
  Hero.update(M.hero, dt, it, M);
  Perception.update(dt, M);
  for (const g of M.guards) Brain.update(g, dt, M);
  for (const c of M.civs) Brain.update(c, dt, M);
  for (const n of M.npcs) { n.rig.update(dt, n.rigState({ pose: n.pose })); }
  for (const b of M.bosses) Bosses.update(b, dt, M);
  Bosses.updateSummons(dt, M);
  if (M.escort) Escort.update(M.escort, dt, M);
  Tools.update(dt, M);
  Mission.update(M, dt, it);
  if (M.level.time === 'rain') { M.lightT -= dt; if (M.lightT <= 0) { M.lightT = 7 + rand() * 9; W.flash = .25; game.flash('#e8f0ff', .12, .6); M.timers.push({ t: .5 + rand() * .6, fn: () => Au.sfx('thunder') }); } }
  // the music's mood: tension at any notice or a high Ki, alert layers on any alert
  let lv = 0; for (const g of M.guards) { if (!g.alive || !g.mind) continue; if (g.mind.state === 'alert') { lv = 2; break; } if (g.mind.state !== 'calm') lv = Math.max(lv, 1); }
  if (Perception.ki >= 60) lv = Math.max(lv, 1);
  if (!M.bossFight) Music.mood(lv, dt);
  // the Ki heartbeat: a soft taiko thump, faster as the nearest guard comes closer (0.8 to 2.2 a second from Ki 50)
  if (Perception.ki >= 50 && game.settings.heartbeat && M.mode !== 'attract') { M.heartT = (M.heartT || 0) - dt; if (M.heartT <= 0) { const k = (Perception.ki - 50) / 49; M.heartT = 1 / (.8 + 1.4 * k); Au.sfx('heart', { vol: .35 + .4 * k }); } } else M.heartT = 0;
  // fireflies over the water near the hero (cosmetic)
  M.flyT = (M.flyT || 0) - dt; if (M.flyT <= 0) { M.flyT = .25; const a = crand() * TAU, d = 30 + crand() * 120, x = M.hero.x + Math.cos(a) * d, y = M.hero.y + Math.sin(a) * d; if (W.isDeep(x, y, 0) || W.isHide(x, y, 0)) Pt.add({ kind: 'glint', x, y, z: 6 + crand() * 14, life: 1.2, color: '#d8f06a', vz: 4 }); }
  if (M.hero.dead && !M.ended && M.mode !== 'attract') { M.hero.deadT = M.hero.deadT || 0; if (M.hero.deadT > 1.4 && !M.overMenu) MS.gameOver(M, 'Your box is empty'); }
  if (M.mode === 'attract' && M.hero.dead) M.hero.dead = false;
  Hud.update(dt, M);
  Cam.update(dt, M.hero, it);
  if (B.Hub) B.Hub.step(dt, M);
  if (B.Dev) B.Dev.step(dt, M, it);
};
/** the mission ended: a short beat, then results (or the fail overlay) */
MS.ending = (dt, M) => {
  M.endT += dt;
  const h = M.hero; h.rig.update(dt, h.rigState({ pose: M.result === 'win' ? 'cheer' : undefined }));
  if (M.result === 'win' && M.endT > 1.6 && !M.endDone) { M.endDone = true; if (M.onEnd) M.onEnd(M); else B.Flow.missionDone(M); }
  if (M.result === 'fail' && M.timerFail && !M.timerCut && M.mode !== 'attract' && M.mode !== 'hub' && M.endT > 1.2) { M.timerCut = true; Cutscene.play('m3_fail', M.char, () => game.go('mission', { M }, { fade: 'dissolve' })); return; }   // the lord raises his cup
  if (M.result === 'fail' && M.endT > 1.2 && !M.overMenu) MS.gameOver(M, M.failed);
};
MS.gameOver = (M, reason) => {
  if (M.mode === 'hub') { if (B.Hub) B.Hub.died(M); return; }
  if (M.onFail) { M.onFail(M, reason); return; }
  Au.sfx('stingOver'); B.Music.play(null);
  const items = [M.snap ? 'Retry from checkpoint' : null, 'Restart mission', M.mode === 'workshop' ? 'Back to the Workshop' : 'Quit to title'].filter(Boolean);
  M.overMenu = new E.Menu(game, items, { y: 'center', onPick: (i, it) => {
    if (it === 'Retry from checkpoint') game.go('mission', { M: Mission.restore(M, M.snap) }, { fade: 'dissolve' });
    else if (it === 'Restart mission') game.go('mission', { M: Mission.restore(M, null) }, { fade: 'dissolve' });
    else if (it === 'Back to the Workshop') game.go('workshop', { resume: true });
    else game.go('title');
  } });
  M.overReason = reason; M.overT = 0;
};
MS.objectivesPanel = M => {
  const mis = B.get('mission', M.missionId);
  game.pause('menu');
  ui.show('objectives', { kicker: (mis && mis.chapter) || 'Mission', title: (mis && mis.title) || M.level.name,
    sections: M.objectives.filter(o => o.state !== 'hidden').map(o => [(o.state === 'done' ? '✓ ' : o.state === 'failed' ? '✗ ' : '○ ') + (o.optional ? 'Optional' : 'Objective'), o.text + (o.type === 'interact' && o.count ? '  (' + o.n + '/' + o.count + ')' : o.type === 'killAll' ? '  (' + o.n + '/' + o.targets.length + ')' : '')]),
    stats: [[fmtTime(M.stats.time), 'Time'], [String(M.stats.silentCuts), 'Silent Cuts'], [String(M.stats.detections), 'Times detected']],
    actions: [{ label: 'Back to the mission', primary: true, fn: () => { ui.hide(); game.resume(); } }], back: () => { ui.hide(); game.resume(); } });
};
/** the pause menu's own items (after Resume): none in a hub session */
B.pauseItems = () => {
  const M = B.M; if (HUBACTIVE || !M || !game.scene || !game.scene.isMission || M.mode === 'attract') return [];
  const out = [];
  if (M.snap) out.push(['Restart from checkpoint', () => { ui.hide(); game.go('mission', { M: Mission.restore(M, M.snap) }, { fade: 'dissolve' }); }]);
  out.push(['Restart mission', () => { ui.hide(); game.go('mission', { M: Mission.restore(M, null) }, { fade: 'dissolve' }); }]);
  out.push(['Objectives', () => MS.objectivesPanel(M)]);
  if (B.Dev) out.push(['Dev Mode', () => B.Dev.open()]);
  if (M.mode === 'workshop') out.push(['Back to the Workshop', () => { ui.hide(); game.go('workshop', { resume: true }); }]);
  return out;
};
const SENSED = { alpha: .35, flash: '#5a5aff', flashMix: 1 };
MS.draw = (r, M) => {
  const W = M.world, h = M.hero, focus = M.focus;
  W.draw(r, h);
  // drifting barges float away downstream (cosmetic)
  for (const p of W.props) if (p.drift) { p.x += .25; p.o.z = (p.o.z || 0); if (p.x > W.w * T16 + 40) p.gone = true; }
  E.prune(W.props, p => p.gone);
  // sight cones of the guards the ninja can see (Focus: through walls, of the sensed ones too)
  if (game.settings.cones || focus) for (const g of M.guards) {
    if (!g.alive || g.asleep || g.status.sleep > 0 || g.cutBy || (g.vis !== 'visible' && !(focus && g.vis === 'sensed')) || g.A.hound) continue;
    const st = g.mind.state; r.sightCone(g, { map: W.map, range: T('sightRange') * g.sightMul * (M.heightened > 0 ? 1.2 : 1), fov: T('sightFov') * g.fovMul, color: Perception.COLOR[st], alpha: st === 'calm' ? (focus ? .3 : .16) : .32 });
  }
  // pickups and interactions
  for (const p of M.pickups) if (!p.taken) { const ic = p.kind === 'tool' ? Art.icon[B.get('tool', p.tool).icon] : Art.icon.scroll; r.sprite(p.x, p.y, p.z + 4 + Math.sin(game.time * 3 + p.x) * 1.5, ic, { glow: .5 }); Lt.add(p.x, p.y, p.z + 8, 26, .5, { color: '#ffe08a' }); }
  for (const ix of M.interacts) if (!ix.done && Mission.interactReady(M, ix) && (focus || Math.hypot(ix.x - h.x, ix.y - h.y) < 70)) r.queue(ix.x, ix.y, ix.z + 22, g => { const p = r.w(ix.x, ix.y, ix.z + 22 + Math.sin(game.real * 4) * 1.5); px.line(g, p[0] - 3, p[1], p[0], p[1] - 3, '#e8b04a'); px.line(g, p[0], p[1] - 3, p[0] + 3, p[1], '#e8b04a'); px.line(g, p[0] + 3, p[1], p[0], p[1] + 3, '#e8b04a'); px.line(g, p[0], p[1] + 3, p[0] - 3, p[1], '#e8b04a'); }, { emissive: true });
  // the actors: Shadow Sight decides who is drawn and how
  const flashOf = a => a.flash > 0 ? '#ffffff' : false;
  for (const g of M.guards.concat(M.civs)) {
    if (g.sunk) continue;
    if (g.vis === 'hidden' && !(g.dragged)) continue;
    const o = g.vis === 'sensed' && g.alive ? Object.assign({}, SENSED, focus ? { alpha: .55 } : {}) : { flash: flashOf(g), xray: g.alive && g.mind && g.mind.state !== 'calm' ? { color: Perception.COLOR[g.mind.state] } : false };
    if (!g.alive && g.hidden) o.alpha = .6;
    if (g.A && g.A.hound) { if (g.vis !== 'hidden') { r.shadow(g.x, g.y, 6, .35, undefined, W.map.groundAt(g.x, g.y, 4, g.z)); r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), o); } continue; }
    if (g.status.stun > 0 || g.status.blind > 0) o.flash = Math.floor(game.real * 8) % 2 ? '#ffffff' : false;
    if (g.alive && g.unmasked === undefined && g.disguised && focus) o.flash = '#ff3a2a', o.flashMix = .35;
    Actor.draw(r, g, o);
  }
  for (const n of M.npcs) Actor.draw(r, n, {});
  for (const b of M.bosses) if (!b.sunk && !b.hiddenBoss && !b.vanished) { Actor.draw(r, b, { flash: flashOf(b) || (b.guardT > 0 && Math.floor(game.real * 6) % 2 ? '#c8d8ff' : false), flashMix: .4 }); if (b.id === 'hotaru' && b.phase && b.alive) Lt.add(b.x, b.y, b.z + 20, 30, .6, { color: '#ff3a2a' }); if (b.id === 'kurogane' && b.phase) { Lt.add(b.x, b.y, b.z + 30, 60, .8, { color: '#ff6a2a' }); if (crand() < .4) Pt.add({ kind: 'ember', x: b.x + (crand() - .5) * 16, y: b.y + (crand() - .5) * 16, z: b.z + 10 + crand() * 30, life: .8, color: '#ff8a3a' }); } }
  for (const c of M.summons) if (c.alive) { if (c.spirit) r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { emissive: true }); else Actor.draw(r, c, { alpha: .7, flash: '#ff6a8a', flashMix: .25, ghost: { color: '#ff3a5a', life: .2, alpha: .3, owner: c } }); }
  if (M.escort && M.escort.alive !== undefined) { Actor.draw(r, M.escort, { flash: flashOf(M.escort), xray: { color: '#5ad05a' } }); if (M.escort.swim) MS.water(r, M.escort); }
  if (B.Hub) B.Hub.drawGhosts(r, M);
  // the hero: x-ray through everything in front, a straw cloak's shimmer, swimming and diving
  if (!M.cheats.noclip || true) {
    const ho = { xray: { actors: true, color: '#8fe3ff' }, flash: h.hurtT > .3 ? '#ff4a3a' : h.blockFx > 0 ? '#c8d8ff' : false, flashMix: .5 };
    if (h.dive) Object.assign(ho, { alpha: .35, flash: '#0a1a2a', flashMix: .8 });
    if (h.cloakT > 0) Object.assign(ho, { flash: '#c8b070', flashMix: .55, alpha: .75 });
    if (h.sprinting && !h.dive) ho.ghost = { color: h.char === 'kaede' ? '#2a8a8a' : '#b0302a', life: .12, alpha: .25, owner: h };
    Actor.draw(r, h, ho); if (h.blockFx > 0) h.blockFx -= 1 / 60;
    if (h.swim) MS.water(r, h);
    if (h.combo.busy) h.rig.drawSmear && h.rig.drawSmear(r, h.char === 'kaede' ? ['#ffffff', '#c8fff4', '#5ae0d0', '#2a8a8a'] : undefined);
  }
  Grapple.draw(r, h); Tools.draw(r, M);
  Hud.world(r, M);
  if (B.Dev) B.Dev.drawWorld(r, M);
  Hud.draw(r, M);
  Cutscene.draw(r);
  if (M.overMenu) MS.drawOver(r, M);
};
/** the water's surface over a swimmer (the body below it), a ripple, bubbles while diving */
MS.water = (r, a) => {
  r.queue(a.x, a.y, 1, g => {
    const p = r.w(a.x, a.y, 0), k = game.zoom || 1, t = game.real;
    px.blend(g, a.dive ? .8 : .7, 'normal', () => { px.ell ? px.ell(g, p[0], p[1] + 3 * k, 10 * k, 6 * k, '#1e3a5a') : px.disc(g, p[0], p[1] + 3 * k, 9 * k, '#1e3a5a'); });
    const rr = (t * 10) % 10; px.blend(g, .5, 'normal', () => { for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; px.dot(g, p[0] + Math.cos(an) * (6 + rr) * k, p[1] + Math.sin(an) * (3 + rr / 2) * k, '#8ab8d8'); } });
  }, { bias: 6 });
};
MS.drawOver = (r, M) => {
  M.overT = (M.overT || 0) + 1 / 60;
  r.overlay(g => {
    px.blend(g, Math.min(.75, M.overT), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#140808'));
    const y = Math.round(r.H * .26);
    E.font.title(g, 'YOUR BOX IS EMPTY', r.W / 2, y, { align: 'center', scale: 3, colors: ['#ffe0d0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810', depth: 2 });
    if (M.overReason && M.overReason !== 'Your box is empty') E.font.text(g, M.overReason, r.W / 2, y + 30, '#f4ead5', { align: 'center', shadow: '#000', outline: false, wrap: r.W - 40 });
  });
  M.overMenu.y = Math.round(r.H * .5); M.overMenu.draw(r);
};
const missionScene = {
  isMission: true, pausable: true, view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [],
  camera: { zoom: [.75, 2], start: 1.15, tall: 1.35, rotate: true, wheel: false },
  enter: MS.enter,
  update(dt) {
    const M = B.M; if (!M) return;
    B.pollInput();
    if (M.overMenu) { M.overMenu.update(dt); MS.step(dt * 0, M); if (M.hero) M.hero.rig.update(dt, M.hero.rigState({ pose: 'die' })); return; }
    MS.step(dt, M);
  },
  draw(r) { if (B.M) MS.draw(r, B.M); },
  exit() { game.weather = null; game.timeScale = 1; if (GPU) GPU.enabled = false; Lt.enabled = false; B.Cam.override = null; Cutscene.clear(); },
  back() { return false; }
};
B.MS = MS; B.missionScene = missionScene;
