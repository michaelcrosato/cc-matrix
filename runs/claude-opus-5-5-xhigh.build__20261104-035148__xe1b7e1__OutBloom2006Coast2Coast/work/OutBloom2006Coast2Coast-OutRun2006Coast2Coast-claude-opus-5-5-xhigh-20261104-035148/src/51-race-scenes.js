/* OutBloom — the race scene (one scene for every mode: game.go('race', RaceConfig)) and how a frame of it is drawn:
 * the sky, the road with its strands (a fork's two branches, the road not taken sliding away), traffic, rivals, ghosts
 * and request objects interleaved by distance, the player's car with its occupants, particles, the pixel bloom, the
 * lens flare, weather, then the HUD. Three cameras: chase, high, bumper (C / d-pad down). */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E, SEG = OB.SEG;
const game = OB.game, FX = OB.FX, Art = OB.Art, UI = OB.UI;
const TINT = { dawn: '#ffb0a0|.1', sunset: '#ff7a4a|.16', lateafternoon: '#ffb060|.08', twilight: '#4a4a8a|.32', night: '#1a1a4a|.5' };
const sgn = v => v < 0 ? -1 : v > 0 ? 1 : 0;
/** the camera for a driver: height, distance behind, focal, horizon, lateral (half roads) */
OB.cameraOf = (d, vp) => {
  const T = OB.tuning, car = d.car, mode = d.cam.mode || 'chase';
  const h = mode === 'high' ? 1350 : mode === 'bumper' ? 420 : T.cameraHeight;
  const back = mode === 'high' ? OB.AHEAD * 1.25 : mode === 'bumper' ? -60 : OB.AHEAD;
  const fov = T.cameraFov + 8 * clamp(car.v / Math.max(1, car.vtop), 0, 1);
  const focal = OB.FOCAL * Math.tan(50 * Math.PI / 180) / Math.tan(fov / 2 * Math.PI / 180);
  const horizon = mode === 'bumper' ? .47 : clamp(OB.GROUND_Y - focal * h / back, .2, .6);
  const ax = d.absX(), lagK = car.drift.on ? .35 : .15;
  return { h, z: car.z - back, x: ax * (1 - lagK) + d.cam.lagX * lagK, focal, horizon, mode, back };
};
/** draw one driver's view into g at vp: everything but the HUD */
OB.drawRaceView = (g, race, d, vp, t, o = {}) => {
  const car = d.car, road = d.road, S = OB.STAGES[d.stage], cam = OB.cameraOf(d, vp);
  Art.tint = TINT[S.tod] || null; Art.night = !!OB.TOD[S.tod].lights; Art.focal = cam.focal * vp.h; Art.viewCenter = vp.x + vp.w / 2;
  const hy = vp.y + vp.h * cam.horizon, ev = road.events.filter(e => car.z >= e.z0 && car.z < (e.z1 || e.z0)).map(e => e.kind);
  const turn = d.turn || 0;
  const sky = (g2, vp2) => {
    OB.Sky.draw(g2, vp2, hy, road.sky, turn, t, { rainbow: ev.includes('shower') ? 1 : 0, fireworks: ev.includes('fireworks') });
    if (d.skyT < 1 && d.skyFrom) { const old = OB.World.stage(d.skyFrom); const tmp = OB.drawRaceView.tmp || (OB.drawRaceView.tmp = E.mkCanvas(vp2.w, vp2.h)); if (tmp.width !== vp2.w || tmp.height !== vp2.h) { tmp.width = vp2.w; tmp.height = vp2.h; }
      const tg = E.ctx2d(tmp); tg.clearRect(0, 0, vp2.w, vp2.h); OB.Sky.draw(tg, { x: 0, y: 0, w: vp2.w, h: vp2.h }, hy - vp2.y, old.sky, turn, t, {}); const a = g2.globalAlpha; g2.globalAlpha = Math.round((1 - d.skyT) * 4) / 4; g2.drawImage(tmp, vp2.x, vp2.y); g2.globalAlpha = a; }
  };
  // what stands on each road: traffic, the other drivers, ghosts, request objects, and the player's own car
  const carsOn = (stageId, rd, strand) => {
    const list = [];
    for (const v of race.traffic.of(stageId)) list.push({ z: v.z, x: race.vehAbsX(rd, v), draw: (g3, sx, sy, sc, tt) => Art.drawTraffic(g3, v, sx, sy, sc, tt) });
    for (const o2 of race.drivers) if (o2 !== d && o2.stage === stageId && !o2.out) list.push({ z: o2.car.z, x: o2.absX(), draw: (g3, sx, sy, sc) => OB.drawDriverCar(g3, race, o2, sx, sy, sc, cam, vp, false) });
    for (const gh of race.ghosts) { const s = OB.ghostAt(race, gh, stageId); if (s) list.push({ z: s.z, x: s.x, alpha: .5, draw: (g3, sx, sy, sc) => OB.drawGhost(g3, gh, s, sx, sy, sc, cam, vp) }); }
    if (race.req) for (const ob of race.req.objectsOn(stageId)) list.push(ob);
    for (const ob of race.objects) if (ob.stage === stageId && !ob.gone) list.push(ob);
    if (!strand && stageId === d.stage && cam.mode !== 'bumper') list.push({ z: car.z, x: d.absX(), draw: (g3, sx, sy, sc) => OB.drawDriverCar(g3, race, d, sx, sy, sc, cam, vp, true) });
    return list;
  };
  const strands = [];
  if (road.junctionAt && car.z + 230 * SEG > road.junctionAt) {
    const f = OB.FORKS[d.stage];
    f.forEach((id, i) => { const sd = i ? 1 : -1, chosen = d.decided && d.branch === sd; strands.push({ road: OB.World.stage(id), z0: road.length, x0: sd * OB.SPREAD, cars: carsOn(id, OB.World.stage(id), true), maxSegs: chosen ? 1e9 : 140 }); });
  }
  if (d.otherStrand) { const rd = OB.World.stage(d.otherStrand.stage); strands.push({ road: rd, z0: 0, x0: d.otherStrand.x0, cars: carsOn(d.otherStrand.stage, rd, true), maxSegs: 140 }); }
  road.drawTo(g, vp, { z: cam.z, x: cam.x, w: road.widthAt(car.z), h: cam.h, focal: cam.focal, horizon: cam.horizon, cars: carsOn(d.stage, road, false), strands, sky,
    onBand: (g4, seg, p1, p2, st, list) => OB.paintAsphalt(g4, race, seg, p1, p2, st.road, list) }, t);
  if (cam.mode === 'bumper') OB.drawBonnet(g, d, vp, t);
  // weather and screen effects
  FX.draw(g, vp);
  if (ev.includes('shower')) FX.weather(g, vp, 'shower', t, .8);
  if (ev.includes('petals')) FX.weather(g, vp, 'petals', t, 1);
  if (S.shimmer && !OB.env.headless) FX.shimmer(g, vp, hy, t);
  FX.speedLines(g, vp, car.v, t, car.slip);
  FX.wind(g, vp, car.slip, t);
  if (!o.noPost) {
    const inTunnel = road.seg(car.z).tunnel;
    FX.bloom(g, vp, (OB.TOD[S.tod].bloom || .4) * (inTunnel ? .5 : 1), OB.Sky.sunAt ? (OB.SKIES[road.sky].sun || {}).halo : '#ffd8f0');
    if (OB.Sky.sunAt && OB.Sky.sunAt[1] < hy - 4 && !inTunnel && !OB.game.settings.motion) FX.flare(g, vp, OB.Sky.sunAt, .6);
  }
  if (race.phase === 'timeup' || (race.phase === 'done' && race.endReason === 'timeup')) FX.ditherFill(g, vp, '#ff7a3a', Math.min(.5, race.phaseT * .25));
  return cam;
};
/** a driver's car where the road put it: sprite by yaw, lamps, the occupants (the player's), its effects */
OB.drawDriverCar = (g, race, d, sx, sy, sc, cam, vp, isMe) => {
  const car = d.car, bank = Art.car(d.carId, d.paint || OB.CARS[d.carId].paints[0], d.edition);
  const k = sc * 500 / Art.PXM, dxw = (d.absX() - cam.x) * OB.ROADW, dzw = Math.max(200, car.z - cam.z);
  const view = -Math.atan2(dxw, dzw) * .9, yaw = clamp(car.yaw + view, -Math.PI / 2, Math.PI / 2);
  const lit = (d.lastIntent && d.lastIntent.brake > .3) || Art.night, lift = (car.air ? Math.sin(Math.min(1, car.airT / car.airDur) * Math.PI) * 14 : 0) * k + car.bounce * .08 * k;
  if (isMe && Art.night && !car.crash && k > .3) { const a = g.globalAlpha, op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .16;
    for (const sd of [-1, 1]) px.poly(g, [[sx + sd * 18 * k, sy - 30 * k], [sx + sd * 26 * k, sy - 30 * k], [sx + sd * 60 * k + yaw * 120 * k, sy - 110 * k], [sx + sd * 6 * k + yaw * 120 * k, sy - 112 * k]], '#fff2c0');
    g.globalAlpha = .1; px.poly(g, [[sx - 40 * k, sy - 40 * k], [sx + 40 * k, sy - 40 * k], [sx + 70 * k + yaw * 140 * k, sy - 130 * k], [sx - 70 * k + yaw * 140 * k, sy - 130 * k]], '#fff8e0'); g.globalAlpha = a; g.globalCompositeOperation = op; px.reset(g); }
  const blink = car.invuln > 0 && Math.floor(OB.now() * 12) % 2 === 0;
  if (blink && isMe) return;
  const f = Art.drawCar(g, bank, sx, sy, k, { yaw, lit, spin: car.crash ? car.spinA + yaw : 0, lift, occupants: isMe || (d.kind === 'player') ? (g2, A, kk) => { OB.Cast.drawOccupants(g2, A, kk, { driver: d.driver, passenger: d.passenger, outfit: d.outfit, yaw, speed: car.v }); if (A[1]) d.seatScreen = [A[1][0], A[1][1]]; } : null });
  if (!f) return;
  // effects at the car (cosmetic)
  const rearY = sy - 12 * k - lift, wl = sx - f.w * k * .18, wr = sx + f.w * k * .18;
  if (car.drift.on && car.v > 60 && FX.rnd() < .8) { FX.emit('smoke', wl, rearY, 1, { color: '#e8e8f0', speed: 20, life: .8, size: 4 * k, vx: -car.drift.dir * 20 }); FX.emit('smoke', wr, rearY, 1, { color: '#f4f4f8', speed: 20, life: .8, size: 4 * k, vx: -car.drift.dir * 20 }); }
  if (car.scrape > .2) FX.emit('spark', car.x > 0 ? wr + 20 * k : wl - 20 * k, rearY - 6 * k, 3, { color: '#ffb040', speed: 120, life: .35, angle: car.x > 0 ? -2.4 : -.7 });
  if (car.offroad && car.v > 40) { const gnd = OB.World.info(d.road, car.z, car.x, d.branch).ground; FX.emit(gnd === 'water' ? 'spray' : 'dust', car.x > 0 ? wr : wl, rearY, 1, { color: gnd === 'sand' ? '#f0d8a0' : gnd === 'water' ? '#e8f8ff' : gnd === 'snow' ? '#ffffff' : '#c8b088', speed: 30, life: .6, size: 3 * k }); }
  if (car.backfire > .4 && isMe) { for (const sd of [-1, 1]) FX.emit('spark', sx + sd * f.w * k * .11, rearY + 4 * k, 2, { color: '#ff7a1a', speed: 60, life: .2, angle: Math.PI / 2, spread: .6 }); }
  if (isMe && d.bloom.level >= 3 && car.v > 120 && FX.rnd() < (d.bloom.level - 2) * .25) FX.emit('petal', sx + (FX.rnd() - .5) * f.w * k * .4, rearY - 20 * k, 1, { colors: ['#ffb0d0', '#ff7ab8', '#ffffff', '#ffd23a'], speed: 40, angle: Math.PI / 2 + .5, life: 1.2, size: 2 + k, grav: 20, vx: -30 });
  if (car.splash > 0 && isMe) { FX.emit('spray', sx, rearY - 10 * k, 14, { color: '#e8f8ff', speed: 140, life: .8, size: 4 }); car.splash = 0; }
  if (!isMe && d.kind === 'rival' && sc * 500 > 20) UI.text(g, (OB.PERSONAS[d.persona] || {}).name ? OB.PERSONAS[d.persona].name.split(' ')[0].toUpperCase() : d.name, sx, sy - f.ay * k - 10 - lift, { align: 'center', color: (OB.CAST[(OB.PERSONAS[d.persona] || {}).rig] || {}).color || '#ffffff' });
  if (!isMe && d.kind === 'player' && race.players.length > 1) UI.text(g, d.name, sx, sy - f.ay * k - 10 - lift, { align: 'center', color: d.idx ? '#ff7a7a' : '#7ab0ff' });
};
/** a ghost: a translucent car in its colour, a name tag */
OB.drawGhost = (g, gh, s, sx, sy, sc, cam, vp) => {
  const bank = Art.car(gh.car || 'orchidea', gh.color || '#ffffff'), k = sc * 500 / Art.PXM, view = -Math.atan2((s.x - cam.x) * OB.ROADW, Math.max(200, s.z - cam.z)) * .9;
  const a = g.globalAlpha; g.globalAlpha = a * .5; Art.drawCar(g, bank, sx, sy, k, { yaw: clamp((s.yaw || 0) + view, -1.5, 1.5), shadow: false }); g.globalAlpha = a;
  if (sc * 500 > 18) UI.text(g, gh.name || 'GHOST', sx, sy - 70 * k, { align: 'center', color: gh.color || '#ffffff' });
};
/** where a ghost is now on a stage: interpolated samples at 10 Hz */
OB.ghostAt = (race, gh, stageId) => {
  if (gh.live) return gh.live.stage === stageId ? gh.live : null;
  const data = gh.data; if (!data || !data.length) return null;
  const st = race.fixed || OB.routeStages(gh.route || race.p1.routeStr), i = Math.min(data.length - 1, Math.floor(race.t * 10)), j = Math.min(data.length - 1, i + 1), u = race.t * 10 - i;
  const a = data[i], b = data[j]; if (!a) return null;
  const sid = gh.stages ? gh.stages[a[0]] : st[a[0]]; if (sid !== stageId) return null;
  return { stage: sid, z: a[1] + (b[0] === a[0] ? (b[1] - a[1]) * u : 0), x: a[2] + (b[0] === a[0] ? (b[2] - a[2]) * u : 0), yaw: a[3] };
};
/** paint on the asphalt: the start grid, skid marks, the photo box, headlight pools at night */
OB.paintAsphalt = (g, race, seg, p1, p2, road, list) => {
  if (road.id === 'S1' && seg.i >= 17 && seg.i <= 20 && !(race.fixed && race.fixed[0] !== 'S1')) {
    const W = road.o.width; for (const u of [-.5, .5]) { if (seg.i % 2) px.poly(g, [[p1.x + (u - .3) * W * p1.scale, p1.y], [p1.x + (u + .3) * W * p1.scale, p1.y], [p2.x + (u + .3) * W * p2.scale, p2.y], [p2.x + (u - .3) * W * p2.scale, p2.y]], '#f4f4f4'); }
    if (seg.i === 20) px.poly(g, [[p1.x - W * p1.scale, p1.y], [p1.x + W * p1.scale, p1.y], [p2.x + W * p2.scale, p2.y], [p2.x - W * p2.scale, p2.y]], '#f4f4f8');
  }
  if (FX.skids.length) FX.drawSkids(g, seg, p1, p2, road);
  if (race.req) race.req.paint(g, seg, p1, p2, road);
  if (Art.night && seg.lit && seg.i % 4 < 2) { const a = g.globalAlpha; g.globalAlpha = .18; for (const sd of [-1, 1]) px.ell(g, Math.round(p1.x + sd * road.o.width * .8 * p1.scale), Math.round(p1.y), Math.max(1, Math.round(road.o.width * .5 * p1.scale)), Math.max(1, Math.round((p1.y - p2.y) * 1.5)), '#ffe8a0'); g.globalAlpha = a; px.reset(g); }
};
OB.drawBonnet = (g, d, vp, t) => {
  const W = vp.w, H = vp.h, X = vp.x, Y = vp.y, c = d.paint || OB.CARS[d.carId].paints[0], T = E.tones(c), b = Math.round(d.car.bounce * .1);
  px.poly(g, [[X, Y + H], [X + W * .12, Y + H * .86 + b], [X + W * .88, Y + H * .86 + b], [X + W, Y + H]], T.base);
  px.poly(g, [[X + W * .12, Y + H * .86 + b], [X + W * .88, Y + H * .86 + b], [X + W * .84, Y + H * .88 + b], [X + W * .16, Y + H * .88 + b]], T.lt);
  px.rect(g, X, Y + H * .97, W, H * .03, '#1a1a22');
};

/* ---- the race scene ---- */
let race = null, offs = [], engine = [];
const sceneRace = {
  pausable: !OB.env.hub, res: [480, 270], expand: true, touch: [],
  enter(cfg) {
    if (OB.Race.current && OB.Race.current.phase !== 'done' && OB.Race.current.cfg === cfg) race = OB.Race.current;
    else race = OB.Race.create(cfg || { mode: 'arcade' });
    FX.clear(); OB.HUD.clear(); OB.Talk.clear(); OB.resetLines();
    game.timeScale = OB.tune('gameSpeed') * (OB.cheats.slow ? .25 : OB.cheats.fast ? 2 : 1);
    offs.forEach(f => f()); offs = [OB.HUD.listen(race), OB.bus.on('*', (e, n) => OB.Cast.react(race, n, e))];
    if (race.players.length > 1) { game.splitScreen(2, { layout: 'rows' }); this.res = [640, 360]; } else { game.splitScreen(0); }
    for (const d of race.drivers) d.turn = 0;
    if (OB.Audio) OB.Audio.raceStart(race);
    if (cfg && cfg.mode !== 'attract' && !OB.env.hub) OB.HUD.showHint('gas');
    OB.UI.screenName = 'race';
  },
  exit() { offs.forEach(f => f()); offs = []; if (OB.Audio) OB.Audio.raceEnd(); game.splitScreen(0); game.timeScale = 1; this.res = [480, 270]; },
  update(dt) {
    if (!race) return;
    if (race.cfg.mode === 'attract' && OB.Attract) { if (OB.Attract.update(dt, race)) return; }
    if (OB.Dev && OB.Dev.isOpen) { OB.Dev.update(dt); return; }
    const I = game.input;
    // driver-side controls: camera, radio
    for (const d of race.players) { const inp = d.input; if (!inp) continue; if (inp.pressed('camera')) { d.cam.mode = { chase: 'high', high: 'bumper', bumper: 'chase' }[d.cam.mode] || 'chase'; game.settings.set && d.idx === 0 && game.settings.set('camera', d.cam.mode); } }
    if (I.pressed('radio') && OB.Radio && race.mode !== 'hub') OB.Radio.next(true);
    if (I.pressed('dev') && !OB.env.hub && OB.Dev) OB.Dev.open();
    game.timeScale = OB.tune('gameSpeed') * (OB.cheats.slow ? .25 : OB.cheats.fast ? 2 : 1) * (race.slowmo > 0 ? .4 : 1);
    if (race.slowmo > 0) race.slowmo -= dt / Math.max(.1, game.timeScale);
    race.step(dt);
    for (const d of race.drivers) {
      const c = d.car; d.turn = (d.turn || 0) + d.road.curveAt(c.z) * c.v * OB.UNITS_PER_KMH * dt * .0025;
      d.cam.lagX += (d.absX() - d.cam.lagX) * Math.min(1, dt * (c.drift.on ? 3 : 6));
      if (c.drift.on && c.v > 60 && d.kind === 'player' && Math.floor(race.t * 30) !== Math.floor((race.t - dt) * 30)) FX.skid(d.stage, c.z, d.absX());
    }
    if (race.mode !== 'attract' && race.mode !== 'hub' && race.p1.input) { const p = race.p1; if (race.phase === 'countdown' && race.phaseT > .3) OB.HUD.showHint('rev'); if (race.phase === 'race' && Math.abs(p.road.curveAt(p.car.z + 2600)) >= 3.5 && p.car.v > 150) OB.HUD.showHint('drift'); }
    FX.step(dt); OB.HUD.step(dt); OB.Talk.step(dt); OB.Cast.step(dt, race.p1.car); OB.UI.stepToasts(dt);
    if (OB.Audio) OB.Audio.raceStep(race, dt);
    if (OB.Hub && race.mode === 'hub') OB.Hub.step(race, dt);
    if (race.phase === 'done' && !race.afterGone) { race.afterGone = true; OB.afterRace(race); }
  },
  draw(r) {
    if (!race) return;
    const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H }, d = race.players[vp.i || 0] || race.p1;
    r.overlay(g => {
      OB.drawRaceView(g, race, d, vp, game.time);
      OB.HUD.draw(g, race, d, vp);
      if (race.cfg.mode === 'attract' && OB.Attract) OB.Attract.overlay(g, race, vp);
      if (!r.viewport) UI.drawToasts(g, r.W);
      if (OB.Dev && OB.Dev.isOpen && !vp.i) OB.Dev.draw(g, r.W, r.H);
      if (OB.Hub && race.mode === 'hub' && OB.Hub.result) { UI.panel(g, r.W / 2 - 90, r.H * .4, 180, 20, { alpha: .8 }); UI.text(g, 'Waiting for the others...', r.W / 2, r.H * .4 + 6, { align: 'center', color: '#ffcf4a' }); }
    });
  },
  hud(r) { r.overlay(g => { if (race && race.players.length > 1) { px.rect(g, 0, Math.floor(r.H / 2) - 1, r.W, 2, '#1a0a28'); } UI.drawToasts(g, r.W); }); },
  back() { return false; }
};
/* ---- after a race: the ending (a goal), the game over (time up), a mission's debrief, results ---- */
OB.afterRace = race => {
  const R = race.result, cfg = race.cfg;
  if (cfg.after) return cfg.after(R, race);
  if (cfg.mode === 'attract' || cfg.mode === 'hub' || cfg.mode === 'demo') return;
  if (R.reason === 'retire') return;
  if (cfg.mode === 'versus') return game.go('results', R, { fade: 'wipe' });
  if (R.reason === 'timeup') return game.go('gameover', R, { fade: 'black', seconds: .6 });
  if (R.reason === 'goal' && R.players[0].goal && (cfg.mode === 'arcade' || cfg.mode === 'love')) return game.go('ending', R, { fade: 'white', seconds: .5 });
  game.go('results', R, { fade: 'wipe' });
};
OB.raceScene = sceneRace;
OB.SCENES = OB.SCENES || {};
OB.SCENES.race = sceneRace;
})();
