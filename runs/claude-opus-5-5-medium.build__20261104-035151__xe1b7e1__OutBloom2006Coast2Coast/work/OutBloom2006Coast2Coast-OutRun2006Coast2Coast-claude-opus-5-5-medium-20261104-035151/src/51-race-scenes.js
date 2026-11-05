/* Race scenes (PLAN §5.3, §7.2): 'race' (one scene for every mode, split screen for Versus), 'ending' (the goal's
 * side-view vignette in its mood) and 'results' (big tiles, seeds, records, initials). A frame: sky, the forking road
 * with everything on it, the player's car, particles, weather, the night grade and glows, the pixel bloom, the lens
 * flare, speed lines, then the HUD and the passenger's speech bubble. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL, SEG = OB.SEG;
const S = OB.SCENES = OB.SCENES || {};
const game = () => OB.game;
let race = null, sounds = [], subs = [], endT = 0, heart = 0;
const depth = fov => 1 / Math.tan(fov / 2 * Math.PI / 180);
const camH = P => ({ chase: OB.tuning.cameraHeight, high: OB.tuning.cameraHeight * 1.35, bumper: 380 }[P.cam.mode] || OB.tuning.cameraHeight);

/** the result of a run, for the ending, the results and the debrief */
OB.buildResult = r => {
  const P = r.p1, love = !!r.requests, f = P.petalMax ? P.petals / P.petalMax : 0, grade = love ? OB.gradeOf(f) : null;
  const mood = love ? OB.moodOfGrade(grade) : (P.timeLeft >= 20 ? 'bloom' : P.timeLeft >= 5 ? 'bud' : 'wilt');
  return { mode: r.mode, cfg: r.cfg, score: Math.round(P.score), time: r.raceT, route: P.route, stages: P.stages.slice(), goal: P.goal || null, finished: P.finished && !P.timeUp, timeLeft: P.timeLeft || 0, mood, stats: Object.assign({}, P.stats),
    petals: P.petals, petalMax: P.petalMax, grade, requests: r.requests ? r.requests.results.slice() : [], mission: r.rules ? r.rules.result() : null, ghost: r.ghostRec, players: r.players.map(q => ({ id: q.id, place: q.place, finished: q.finished, time: q.finishT, score: Math.round(q.score), progress: r.progress(q) })), passenger: P.passenger, driver: P.driver, car: P.car.model, paint: P.paint, outfit: P.outfit };
};

/* ---- what a viewport sees on the road ---- */
function objectsFor(P) {
  const out = [], t = race.t, vp = P.vpRect || { w: 480 };
  const stages = new Set([P.car.stage, P.prevStage, P.sibling && P.sibling.stage].concat(OB.forkOf(P.car.stage) || []).filter(Boolean));
  if (!race.cheats.noTraffic) for (const o of race.traffic.list) if (stages.has(o.stage)) out.push({ stage: o.stage, z: o.z, x: o.x, draw: (g, X, Y, k, c) => OB.drawTraffic(g, X, Y, k, { type: o.type, color: o.color, yaw: (o.spin > 0 ? o.spin * 6 : 0) + (o.yawVis || 0) + E.clamp((vp.cx - X) / vp.w * .9, -.6, .6), brake: o.brake, blink: o.laneT && o.blink > 0 ? Math.sign(o.to - o.lane) : 0, night: c.night, glow: c.glow, t, honk: o.honk > 0 }) });
  for (const Q of race.players.concat(race.rivals)) if (Q !== P && !Q.out && stages.has(Q.car.stage)) out.push({ stage: Q.car.stage, z: Q.car.z, x: Q.car.x, y: Q.car.air > 0 ? 300 : 0, draw: (g, X, Y, k, c) => OB.drawCar(g, X, Y, k, { model: Q.car.model, paint: Q.paint, yaw: (Q.car.crash.t > 0 ? Q.car.crash.spin : Q.car.yaw) + E.clamp((vp.cx - X) / vp.w * .9, -.6, .6), brake: false, night: c.night, glow: c.glow, t, speed: Q.car.v, occupants: Q.rival ? null : { driver: Q.driver, passenger: Q.passenger, outfit1: Q.outfit }, tag: Q.rival ? Q.name.toUpperCase() : 'P' + (Q.i + 1), tagColor: Q.rival ? (OB.CAST[Q.who] || {}).color : E.PLAYER_COLORS ? E.PLAYER_COLORS[Q.i] : '#fff' }) });
  for (const o of race.objects) if (o.alive && stages.has(o.stage) && OB.OBJ_ART[o.kind]) out.push({ stage: o.stage, z: o.z, x: o.x, draw: (g, X, Y, k, c) => { if (o.kind === 'ribbon') o.gap = o.gap || .5; OB.OBJ_ART[o.kind](g, X, Y, k, { t, v: (o.z | 0) % 7, side: o.side, gap: o.gap, glow: c.glow, flash: o.box && o.box.stopped }); } });
  // the ghost (Time Trial), the hub's other players
  if (race.ghost) { const gs = race.ghost.cur; if (gs && stages.has(gs[0])) out.push({ stage: gs[0], z: gs[1], x: gs[2], draw: (g, X, Y, k, c) => { px.blend(g, .5, 'normal', () => OB.drawCar(g, X, Y, k, { model: P.car.model, paint: '#a8c8ff', yaw: gs[3], t, tag: 'BEST', shadow: false })); } }); }
  if (OB.Hub && OB.Hub.ghosts) for (const gh of OB.Hub.ghosts()) if (stages.has(gh.area)) out.push({ stage: gh.area, z: gh.z, x: gh.x, draw: (g, X, Y, k) => { px.blend(g, .55, 'normal', () => OB.drawCar(g, X, Y, k, { model: 'orchidea', paint: gh.color, yaw: gh.yaw, t, shadow: false })); if (k > .02) T(g, gh.name, X, Y - 560 * k, gh.color, { align: 'center' }); } });
  // the start line: the grid, the gantry with its lights, Bruno with the flag, a few fans
  if (stages.has(race.start)) {
    const lights = race.phase === 'countdown' ? Math.max(0, Math.min(5, Math.floor((3.6 - race.cd) / .7))) : 6;
    out.push({ stage: race.start, z: OB.Race.GANTRY_Z, x: 0, draw: (g, X, Y, k, c) => OB.ART.startgantry.draw(g, X, Y, k, Object.assign({}, c, { th: { lights } })) });
    out.push({ stage: race.start, z: OB.Race.START_Z + 300, x: 0, draw: (g, X, Y, k, c) => OB.ART.gridline.draw(g, X, Y, k, c) });
    out.push(OB.brunoObj(race, race.start, OB.Race.GANTRY_Z - 600));
    for (let i = 0; i < 4; i++) out.push(OB.fanObj(race.start, OB.Race.START_Z + 800 + i * 900, (i % 2 ? 1 : -1) * 1.55, i));
  }
  // a fixed route's finish arch and closed branches
  if (race.route) {
    const last = race.route.stages[race.route.stages.length - 1];
    if (race.route.end === 'sprint' && stages.has(last)) out.push({ stage: last, z: (OB.World.get(last).len - 2) * SEG, x: 0, draw: (g, X, Y, k, c) => OB.ART.sprintarch.draw(g, X, Y, k, c) });
    for (const st of stages) { const cl = race.closedSide(st), Sx = OB.World.get(st); if (cl && Sx.juncStart >= 0) { const z = (Sx.juncStart + 50) * SEG; out.push({ stage: st, z, x: cl * OB.World.spread(Sx, z), draw: (g, X, Y, k, c) => OB.ART.barrier.draw(g, X, Y, k, c) }); } }
  }
  return out;
}

function drawViewport(g, vp, P) {
  const c = P.car, h = camH(P), fov = OB.tuning.cameraFov + 8 * Math.min(1, c.v / 320);
  P.vpRect = { w: vp.w, cx: vp.x + vp.w / 2 };
  const V = race.view(P, h, depth(fov)), st = OB.STAGES[c.stage], tod = OB.TOD[OB.todOverride || OB.STAGES[V.stage].tod], info = Object.assign({}, c.info || {}), wo = OB.weatherOverride; if (wo) info.event = wo;
  const fx = { fireworks: info.event === 'fireworks' || (st.goal && c.z > OB.World.get(c.stage).len * SEG * .8), lanterns: c.stage === 'S11' && c.z > OB.World.get('S11').len * SEG * .5, rainbow: info.event === 'shower' };
  const D = OB.Road.draw(g, vp, { stage: V.stage, z: V.z, x: V.x, h, turn: P.turn || 0, t: race.t, objs: objectsFor(P), sibling: V.sibling, closed: V.closed, fov, r: S.race._r, fx });
  // light pools on the asphalt (street lamps, headlights) go under the car
  if (tod.night || info.tunnel) { for (const s of [-1, 1]) { const q = OB.Road.project(c.stage, c.z + 2600, c.x + s * .15, 0); if (q) D.glows.push([q[0], q[1], 520 * q[2], '#fff4d0', .9, 'pool', q[2]]); } OB.FX.pools(g, vp, D.glows); }
  // the player's car at the bottom: its shadow, body, occupants, lights
  const lift = c.air > 0 ? Math.sin(Math.min(1, (c.airT - c.air) / c.airT) * Math.PI) * 420 : 0;
  const p = OB.Road.project(c.stage, c.z, c.x, lift);
  if (p && P.cam.mode !== 'bumper') {
    const k = p[2] * (P.cam.mode === 'high' ? .8 : 1), bounce = (c.bounce > 0 ? Math.sin(c.bounce * 20) * 2 : 0) + (!info.onRoad && c.v > 30 ? Math.round(Math.sin(race.t * 40)) : 0);
    const yaw = c.crash.t > 0 ? c.crash.spin : c.yaw, blink = c.invuln > 0 && Math.floor(race.t * 12) % 2;
    if (lift) { const sh = OB.Road.project(c.stage, c.z, c.x, 0); if (sh) px.blend(g, .3, 'multiply', () => px.ell(g, sh[0], sh[1], 280 * k, 50 * k, '#20202a')); }
    if (!blink) OB.drawCar(g, p[0], p[1] + bounce, k, { model: c.model, paint: P.paint, yaw, steer: c.steerVis, brake: P.brakeLight, night: tod.night || c.info && c.info.tunnel, glow: (x, y, r, col, a) => D.glows.push([x, y, r, col, a]), t: race.t, speed: c.v, shadow: !lift,
      occupants: { driver: P.driver, passenger: P.passenger, outfit1: P.outfit, pose: P.pose ? P.pose.name : null, pointDir: P.pose ? P.pose.dir : 1, drPose: race.phase === 'goal' && P.finished ? 'wave' : null } });
    // particles at the car: smoke from a drift or a spin, sparks from a scrape, dust off the road, spray in the wet
    const rw = [p[0] - 200 * k, p[0] + 200 * k], ry = p[1] - 40 * k, vpi = vp.i;
    if ((c.drift.on || c.crash.t > 0) && race.t % .03 < 1 / 120) for (const x of rw) OB.FX.emit('smoke', x, ry, 1, { vy: 24, vs: 30, life: .7, size: 3 * k / .24, color: '#e8e8f0', vp: vpi });
    if (c.scrape && race.t % .02 < 1 / 120) OB.FX.emit('spark', c.x < 0 ? rw[0] - 40 * k : rw[1] + 40 * k, ry - 30 * k, 3, { vx: c.x < 0 ? -60 : 60, vy: -40, vs: 80, life: .3, color: '#ffd040', g: 200, vp: vpi });
    if (!info.onRoad && c.v > 40 && race.t % .04 < 1 / 120) { const ground = info.ground, col = ground === 'snow' ? '#ffffff' : ground === 'sand' || ground === 'nightsand' ? '#e8d090' : OB.GROUND_WATER[ground] ? '#c8e8ff' : '#9a7a5a'; OB.FX.emit(OB.GROUND_WATER[ground] ? 'spray' : 'dust', rw[c.x < 0 ? 0 : 1], ry, 2, { vy: 10, vs: 40, life: .7, size: 4, color: col, vp: vpi }); }
    if (P.bloom.lvl >= 3 && race.t % (P.bloom.lvl >= 5 ? .05 : .12) < 1 / 120 && !OB.FX.reduce()) OB.FX.emit('petal', p[0], p[1] - 200 * k, 1, { vx: 0, vy: 30, vs: 80, life: 1.4, size: 3, colors: ['#ffc0d8', '#ff8ac0', '#ffffff'], vp: vpi });
    P.carScreen = [p[0], p[1] - 600 * k];
  } else if (P.cam.mode === 'bumper') {
    const t = E.tones(P.paint || OB.CARS[c.model].paint); px.poly(g, [[vp.x, vp.y + vp.h], [vp.x + vp.w * .12, vp.y + vp.h - 26], [vp.x + vp.w * .88, vp.y + vp.h - 26], [vp.x + vp.w, vp.y + vp.h]], t.base); px.rect(g, vp.x + vp.w * .12, vp.y + vp.h - 27, vp.w * .76, 2, t.lt);
    P.carScreen = [vp.x + vp.w * .7, vp.y + vp.h - 60];
  }
  if (!OB.FX.reduce() && !OB.env.headless) OB.FX.draw(g, vp);
  if (info.event === 'shower') OB.FX.rain(g, vp, race.t, 1);
  if (info.event === 'petals' && !OB.FX.reduce()) OB.FX.petalStorm(g, vp, race.t, 1);
  if (st.heat && !info.tunnel) OB.FX.heat(g, vp, race.t);
  OB.FX.grade(g, vp, tod, D.glows, info.tunnel);
  const bloomOn = OB.game.settings.bloom !== false;
  if (bloomOn) OB.FX.bloom(g, vp, tod.bloom * (P.bloom.lvl >= 5 ? 1.3 : 1), tod.sun && tod.sun.color);
  if (tod.sun && !info.tunnel && bloomOn) OB.FX.flare(g, vp, tod.sun, .8 - Math.abs(tod.sun.x - .5));
  if (c.v > 260) OB.FX.speedLines(g, vp, (c.v - 260) / 60, race.t);
  if (c.slip > .5 && !OB.FX.reduce()) px.blend(g, .3 * c.slip, 'add', () => { for (let i = 0; i < 8; i++) { const x = vp.x + vp.w * (.3 + i * .06), y = vp.y + vp.h * (.55 + (i % 3) * .08) + ((race.t * 300 + i * 40) % 60); px.rect(g, x, y, 1, 10, '#c8f0ff'); } });
  if (race.phase === 'timeup') px.blend(g, Math.min(.5, race.goalT * .2), 'multiply', () => px.rect(g, vp.x, vp.y, vp.w, vp.h, '#ff9a6a'));
  // the HUD and the passenger's bubble
  OB.HUD.draw(g, vp, race, P, { standings: OB.Hub && OB.Hub.standings && race.mode === 'hub' ? OB.Hub.standings() : null });
  if (P.carScreen) OB.HUD.bubble(g, P.carScreen[0] + 40, P.carScreen[1], P, vp.x + vp.w);
  if (race.cheats.debugOverlay && P.i === 0) OB.HUD.debug(g, race, P, vp.x + 8, vp.y + 70);
  if (race.cheats.showHitboxes && p) { px.rect(g, p[0] - c.hw * OB.ROADW * p[2], p[1] - 2, c.hw * 2 * OB.ROADW * p[2], 2, '#ff00ff'); }
  if (race.phase === 'countdown' && !race.cfg.attract) { const n = Math.ceil(race.cd - .6); T(g, n > 0 ? String(n) : 'GO!', vp.x + vp.w / 2, vp.y + vp.h * .3, n > 0 ? '#ffffff' : C.good, { align: 'center', scale: 5 }); if (race.cd > 2.5 && P.i === 0) OB.UI.prompt(g, vp.x + vp.w / 2 - 60, vp.y + vp.h * .3 + 46, 'confirm', 'Skip', { input: P.input }); }
}

/* ---- bus events: banners, sounds, particles, hints ---- */
function hook() {
  const on = (n, fn) => subs.push(OB.bus.on(n, fn)), PL = d => race && race.players.find(p => p.id === (d && d.car)) || (race && race.p1);
  const at = P => P.carScreen || [240, 200];
  on('countdown', d => { if (race.cfg.attract && !race.cfg.attractSound) return; OB.Sound.play(d.n ? 'beep' : 'go'); if (!d.n) for (const P of race.players) OB.HUD.banner(P, 'GO!', C.good, 1); });
  on('start:perfect', d => { const P = PL(d); OB.HUD.banner(P, 'PERFECT START!', C.sun, 1.8); OB.Sound.play('whoosh'); });
  on('checkpoint', d => { const P = PL(d); if (d.bonus) { OB.HUD.banner(P, 'TIME EXTENDED!', C.good, 2.4, '+' + d.bonus + '   ' + OB.STAGES[d.id].name.toUpperCase()); P.plus = { n: d.bonus, t: 2 }; } else OB.HUD.banner(P, 'CHECKPOINT', C.sea, 2, OB.STAGES[d.id].name.toUpperCase() + '   ' + OB.fmtTime(d.split)); OB.Sound.sting('checkpoint'); OB.Sound.play('whoosh'); OB.Ambience.set(OB.STAGES[d.id].kit); });
  on('fork:approach', d => { const P = PL(d), L = OB.STAGES[d.left], R = OB.STAGES[d.right], st = n => '♥'.repeat(n); OB.HUD.banner(P, d.closed ? (d.closed < 0 ? 'KEEP RIGHT →' : '← KEEP LEFT') : '← ' + L.name.toUpperCase() + ' | ' + R.name.toUpperCase() + ' →', C.ink, 2.8, d.closed ? 'ROAD CLOSED' : st(L.diff) + '     ' + st(R.diff)); OB.Sound.sting('fork'); OB.HUD.hint(P, 'left', 'Steer left or right at the fork'); });
  on('nearmiss', d => { const P = PL(d), [x, y] = at(P); OB.FX.text(x, y - 20, 'NEAR MISS +' + 500 * P.bloom.lvl, C.sea, P.i); OB.Sound.play('zing'); });
  on('slingshot', d => { const P = PL(d); OB.HUD.banner(P, 'SLINGSHOT!', C.sea, 1.2); OB.Sound.play('whoosh'); });
  on('slip:start', d => { const P = PL(d); if (P) OB.HUD.hint(P, 'gas', 'Tuck in behind a car to slipstream'); });
  on('drift:start', d => { if (!race) return; if (race.players.some(p => p.id === d.car)) OB.Sound.play('squeal', { vol: .5 }); });
  on('drift:end', d => { const P = race && race.players.find(p => p.id === d.car); if (P && d.score > 1500) { const [x, y] = at(P); OB.FX.text(x, y - 30, 'DRIFT +' + d.score * P.bloom.lvl, C.sun, P.i); } });
  on('fullbloom', d => { const P = PL(d); OB.HUD.banner(P, 'FULL BLOOM!', C.pink, 2.2); OB.Radio.bloom(true); OB.Sound.sting('bloom'); });
  on('bloom:level', d => { if (d.n < 5) OB.Radio.bloom(false); });
  on('req:start', d => { const P = PL(d), def = OB.REQUESTS[d.type]; OB.HUD.banner(P, def.callout.replace('{n}', d.n).replace('{v}', OB.speedText(d.v)), C.pink, 2); OB.Sound.sting('reqStart'); });
  on('req:end', d => { const P = PL(d); OB.HUD.banner(P, OB.RATINGS[d.rating] + '!', [C.good, C.sea, '#ffffff', C.bad][d.rating], 1.8, d.petals ? '+' + d.petals + ' ♥' : ''); OB.Sound.sting(d.rating < 3 ? 'reqWin' : 'reqFail'); if (d.rating < 2) { const [x, y] = at(P); OB.FX.emit('petal', x, y - 30, 30, { vy: -60, vs: 160, g: 120, life: 1.6, size: 3, colors: ['#ff8ac0', '#ffc0d8', '#ffffff', '#ff5fa2'], vp: P.i }); } });
  const objFx = (sfx, colors) => d => { const P = PL(d); OB.Sound.play(sfx); const [x, y] = at(P); OB.FX.emit('confetti', x, y - 10, 12, { vy: -80, vs: 120, g: 200, life: 1, size: 2, colors, vp: P.i }); };
  on('obj:pop', objFx('pop', ['#ff4a7a', '#ffd040', '#4ab0ff', '#ffffff'])); on('obj:bonk', objFx('bonk', ['#e83a3a', '#3a6ad0', '#ffffff'])); on('obj:bouquet', objFx('chime', ['#ff4a7a', '#ffd040', '#ffffff']));
  on('obj:arch', objFx('harp', ['#ff6aa0', '#ffd040', '#ffffff', '#c080ff'])); on('obj:snap', objFx('snap', ['#ff6aa0', '#ff9ac8'])); on('obj:cone', d => OB.Sound.play(d.hit ? 'thunk' : 'tok'));
  on('obj:sting', d => { OB.Sound.play('sting'); const P = PL(d); OB.HUD.banner(P, 'OUCH!', C.bad, .8); });
  on('obj:photo', d => { OB.Sound.play('shutter'); const P = PL(d); OB.HUD.banner(P, ['PERFECT SHOT!', 'GREAT SHOT!', 'GOOD SHOT', 'BLURRY...'][d.rating], [C.good, C.sea, '#ffffff', C.bad][d.rating], 1.6); if (!OB.FX.reduce() && OB.game.settings.flashes > .3) game().flash('#ffffff', .1, .6 * OB.game.settings.flashes); });
  on('car:crash', d => { const P = race && race.players.find(p => p.id === d.car); if (!P) return; OB.Sound.play('squeal'); OB.Sound.play('thunk'); game().shake(.35 * OB.game.settings.shake); if (P.input && P.input.rumble) P.input.rumble(.7, .35); });
  on('car:bump', d => { const P = race && race.players.find(p => p.id === d.car); if (!P) return; OB.Sound.play('thunk', { vol: .7 }); game().shake(.15 * OB.game.settings.shake); if (P.input && P.input.rumble) P.input.rumble(.4, .15); });
  on('car:scrape', d => { if (race && race.players.find(p => p.id === d.car)) OB.Sound.play('scrape'); });
  on('car:splash', d => { if (race && race.players.find(p => p.id === d.car)) OB.Sound.play('splash'); });
  on('air:land', d => { if (race && race.players.find(p => p.id === d.car)) { OB.Sound.play('land'); if (d.hard) game().shake(.2 * OB.game.settings.shake); } });
  on('gust', d => { const P = race && race.players.find(p => p.id === d.car); if (P) { OB.HUD.banner(P, 'CROSSWIND!', C.sea, 1); OB.Sound.play('gust'); } });
  on('goal', d => { const P = PL(d); OB.HUD.banner(P, 'GOAL!', C.sun, 3, d.id ? OB.GOALS[d.id].name.toUpperCase() : ''); OB.Sound.sting('goal'); OB.Sound.play('crowd'); const [x, y] = at(P); OB.FX.emit('confetti', x, y - 80, 80, { vy: -40, vs: 260, g: 90, life: 2.5, size: 3, colors: ['#ff5fa2', '#ffcf4a', '#3ac8e0', '#ffffff', '#5ae08a'], vp: P.i }); });
  on('time:up', () => { for (const P of race.players) OB.HUD.banner(P, 'TIME UP', C.bad, 3, 'The sun set over ' + OB.STAGES[P.car.stage].name + '.'); OB.Sound.sting('gameover'); });
  on('radio:next', () => { OB.Radio.next(); const st = OB.STATIONS[OB.Radio.i]; OB.UI.toast('♪ ' + OB.Radio.song.name, st.freq + ' ' + st.name, 2.5); });
  on('horn', d => { const P = PL(d); OB.Sound.play(P.i ? 'hornB' : 'hornA'); });
  on('camera', d => OB.UI.toast('CAMERA', d.mode.toUpperCase(), 1.2));
  on('rival:out', d => { OB.HUD.banner(race.p1, d.id === 'p1' ? 'YOU WILTED!' : (d.name || d.id).toUpperCase() + ' WILTS!', d.id === 'p1' ? C.bad : C.sun, 2); });
  on('go', () => { for (const P of race.players) OB.HUD.hint(P, 'gas', 'Hold to accelerate'); });
  on('countdown', d => { if (d.n === 3) for (const P of race.players) OB.HUD.hint(P, 'gas', 'Rev in the green at GO'); });
}

S.race = {
  pausable: true, view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(cfg) {
    cfg = Object.assign({}, cfg); this.cfg = cfg;
    const p = OB.Profile.p, wantMirror = !!(cfg.mirror && p.unlocked.mirror);
    if (OB.mirror !== wantMirror) { OB.mirror = wantMirror; OB.World.reset(); }
    OB.FX.clear(); OB.resetLines(); OB.bus.clear(); endT = 0; heart = 0;
    if (cfg.players > 1) game().splitScreen(2, { layout: 'rows' }); else game().splitScreen(0);
    race = OB.race = OB.Race.create(cfg);
    hook();
    sounds = cfg.silent ? [] : race.players.map((P, i) => new OB.CarSound(P.car, race.players.length > 1 ? .7 : 1));
    if (!cfg.keepMusic) { if (cfg.station !== undefined) OB.Radio.tune(cfg.station, { fade: .6, restart: true }); else if (!game().audio.song) OB.Radio.tune(OB.Radio.i); }
    OB.Ambience.set(OB.STAGES[race.start].kit);
    for (const P of race.players) P.turn = 0;
    game().input.consumeAll();
  },
  exit() { if (race) race.dispose(); for (const u of subs) u(); subs = []; for (const s of sounds) s.stop(); sounds = []; OB.Ambience.stop(); game().splitScreen(0); game().timeScale = 1; OB.Radio.bloom(false); },
  update(dt) {
    if (OB.Dev && OB.Dev.active) { OB.Dev.update(dt); return; }
    const g = game(), I = g.input;
    g.timeScale = OB.tuning.gameSpeed * (race.cheats.slowMo ? .25 : race.cheats.fastMo ? 2 : 1) * (race.slowT > 0 ? .4 : 1);
    if (race.slowT > 0) race.slowT -= dt / Math.max(.1, g.timeScale);
    if (race.phase === 'countdown' && race.cd > 1.2 && I.pressed('confirm') && !race.cfg.attract && !race.cfg.hub) race.cd = 1.1;
    race.step(dt);
    for (const P of race.players) {
      OB.Passenger.step(P, dt); OB.HUD.step(P, dt);
      const c = P.car, inf = c.info || {}; P.turn = (P.turn || 0) + (inf.curve || 0) * c.v * dt * .015;
      const In = P.input; P.brakeLight = !P.bot && In ? (In.analog ? In.analog('brake') : 0) > .2 : P.bot && P.bot.lift > 1;
    }
    OB.FX.step(dt); OB.UI.stepToasts(dt); OB.Radio.update(dt); OB.Ambience.update(race.t);
    sounds.forEach((s, i) => { const P = race.players[i]; s.update(dt, P.bot ? (P.bot.lift ? 0 : 1) : (P.input && P.input.analog ? P.input.analog('gas') : 1), P.car.info && P.car.info.tunnel); });
    if (race.phase === 'run' && !race.clockUp && race.clock < 10 && race.clock > 0) { heart -= dt; if (heart <= 0) { heart = 1; OB.Sound.play('heartbeat'); } }
    if (race.ghost) { const gd = race.ghost.data, i = Math.min(gd.length - 1, Math.floor(race.raceT * 10)); race.ghost.cur = race.phase === 'countdown' ? gd[0] : gd[i]; }
    if (this.onStep) this.onStep(dt, race);
    if (race.done && !this.leaving && !this.cfg.noLeave) {
      endT += dt; if (endT < .3) return;
      this.leaving = true; const res = OB.buildResult(race); OB.lastResult = res;
      const next = this.cfg.next ? this.cfg.next(res) : null;
      if (next) game().go(next[0], next[1], { fade: 'wipe' });
      else if (res.goal && res.finished && (race.mode === 'arcade' || race.mode === 'love')) game().go('ending', res, { fade: 'wipe' });
      else if (race.mode === 'mission' || this.cfg.mission) game().go('debrief', res, { fade: 'wipe' });
      else game().go('results', res, { fade: 'wipe' });
    } else if (!race.done) this.leaving = false;
  },
  draw(r) { this._r = r; r.overlay(g => { const vp = r.viewport || { x: 0, y: 0, w: r.bw || r.W, h: r.bh || r.H, i: 0 }; if (vp.i === undefined) vp.i = 0; const P = race.players[vp.i] || race.p1; drawViewport(g, vp, P); if (!r.viewport) { OB.UI.drawToasts(g, vp.w); if (OB.Dev && OB.Dev.active) OB.Dev.draw(g, vp.w, vp.h); if (race.cfg.overlay) race.cfg.overlay(g, vp.w, vp.h); } }); },
  hud(r) { r.overlay(g => { const W = r.W, H = r.H; px.rect(g, 0, Math.floor(H / 2) - 1, W, 2, '#140a28'); OB.UI.drawToasts(g, W); if (race.phase === 'countdown') { const n = Math.ceil(race.cd - .6); T(g, n > 0 ? String(n) : 'GO!', W / 2, H / 2 - 12, '#ffffff', { align: 'center', scale: 3 }); } if (OB.Dev && OB.Dev.active) OB.Dev.draw(g, W, H); if (race.cfg.overlay) race.cfg.overlay(g, W, H); }); },
  back() { return false; },
  stopSounds() { for (const s of sounds) s.stop(.2); sounds = []; OB.Ambience.stop(); }
};

/* ---- the ending: the goal's vignette in its mood (PLAN §8.3) ---- */
const ENDSKY = {
  A: { sky: ['#2a1a5a', '#8a3a7a', '#f0604a', '#ffb050'], sun: { x: .7, y: .7, r: 22, color: '#ffd070' }, layers: [{ kind: 'sea', color: '#3a4a9a', y: .72, height: .3 }] },
  B: { sky: ['#3a2a6a', '#c86a7a', '#f8a060', '#ffd090'], sun: { x: .2, y: .65, r: 18, color: '#ffd8a0' }, layers: [{ kind: 'forest', color: '#1a5a2a', y: .62, height: .3 }] },
  C: { sky: ['#05051a', '#0a1040', '#1a2a6a', '#3a3a7a'], moon: { x: .8, y: .2, r: 10, color: '#f8f4e0' }, stars: 60, layers: [{ kind: 'city', color: '#202a4a', y: .55, height: .3, windows: '#ffe070' }, { kind: 'sea', color: '#14204a', y: .78, height: .2 }] },
  D: { sky: ['#020210', '#0a0a30', '#1a1a4a', '#2a2050'], stars: 140, starsY: .8, layers: [{ kind: 'mountains', color: '#1a1a3a', y: .7, height: .2 }] },
  E: { sky: ['#0a0a2a', '#4a2a6a', '#e8704a', '#ffc070'], sun: { x: .5, y: .78, r: 26, color: '#ffb050' }, layers: [{ kind: 'sea', color: '#2a3a6a', y: .78, height: .25 }] }
};
const endBg = {};
S.ending = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(res) {
    this.res = res; this.t = 0; this.beat = 0; const goal = res.goal;
    this.bg = endBg[goal] || (endBg[goal] = new E.Backdrop(ENDSKY[goal]));
    this.couple = [OB.Cast.rig(res.driver), OB.Cast.rig(res.passenger, res.outfit || 0)];
    this.localId = OB.GOALS[goal].local; this.local = OB.Cast.rig(this.localId);
    this.lines = [OB.LOCAL_LINES[OB.GOALS[goal].local], OB.ENDING_LINES[goal][res.mood][res.passenger]];
    game().focus(0, 0, 40); game().follow(null);
    game().audio.music(res.mood === 'bloom' ? OB.SONGS.lullaby : OB.SONGS.garden, { fade: 1 });
    if (res.mood === 'bloom') OB.Sound.play('crowd');
  },
  update(dt) {
    this.t += dt; const I = game().input, t = this.t, res = this.res;
    if (t > 1 && (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked()))) this.t = Math.max(this.t, 12.5);
    if (this.beat === 0 && t > 3.6) { this.beat = 1; OB.Voice.say(this.lines[0], this.localId, 'happy'); }
    if (this.beat === 1 && t > 6.4) { this.beat = 2; OB.Voice.say(this.lines[1], res.passenger, res.mood === 'wilt' ? 'sad' : 'excited'); }
    if (this.beat === 2 && t > 9.4) { this.beat = 3; OB.Sound.sting(res.mood === 'wilt' ? 'reqFail' : 'goal'); }
    // the car rolls in and parks; the couple step out and play their scene
    const carX = Math.min(0, -260 + t * 110), out = t > 3, walk = out && t < 4.6;
    const [dr, ps] = this.couple, mood = res.mood;
    OB.Cast.pose(dr, dt, { x: 20 + (out ? Math.min(40, (t - 3) * 30) : 0), y: 0, z: 0, facing: walk ? 0 : Math.PI, vx: walk ? 30 : 0, pose: t > 9.4 && mood !== 'wilt' ? 'wave' : null, expr: mood === 'wilt' ? 'wince' : 'smile' });
    OB.Cast.pose(ps, dt, { x: 60 + (out ? Math.min(55, (t - 3) * 35) : 0), y: 0, z: 0, facing: Math.PI, vx: walk ? 30 : 0, pose: t > 6.4 ? (mood === 'bloom' ? 'cheer' : mood === 'bud' ? 'wave' : 'hips') : null, expr: mood === 'wilt' ? 'angry' : 'smile' });
    OB.Cast.pose(this.local, dt, { x: 170, y: 0, z: 0, facing: Math.PI, pose: t > 3.6 && t < 6.4 ? 'wave' : null, expr: 'smile' });
    this.carX = carX;
    if (mood === 'bloom' && t > 6 && Math.floor(t * 3) !== Math.floor((t - dt) * 3)) OB.FX.emit('star', 240 + (Math.sin(t * 7) * 160), 60 + Math.cos(t * 5) * 30, 6, { vs: 80, life: 1, size: 3, color: ['#ff5aa0', '#ffe060', '#60e0ff'][Math.floor(t) % 3] });
    OB.FX.step(dt);
    if (this.t > 13) game().go('results', res, { fade: 'wipe' });
  },
  draw(r) {
    const res = this.res, goal = res.goal, G = OB.GOALS[goal], t = this.t, W = r.W, H = r.H, mood = res.mood;
    this.bg.draw(r);
    { const g = r.ctx; px.reset(g);
      const gy = Math.round(H * .78);
      px.rect(g, 0, gy, W, H - gy, { A: '#8a6a4a', B: '#3a7a3a', C: '#3a3a4a', D: '#4a3a3a', E: '#5a6a4a' }[goal]);
      px.rect(g, 0, gy, W, 2, '#ffffff22');
      // the place
      const cx = W / 2;
      if (goal === 'A') { px.rect(g, 0, gy - 6, W, 6, '#a07a50'); for (let x = 10; x < W; x += 40) px.rect(g, x, gy - 40, 3, 34, '#6a4a2a'); for (let i = 0; i < (mood === 'bloom' ? 40 : mood === 'bud' ? 2 : 0); i++) { const lx = (i * 53 + t * 6) % W, ly = gy - 40 - ((t * 14 + i * 31) % (gy - 20)); px.rect(g, lx, ly, 3, 4, '#ffb040'); px.blend(g, .3, 'add', () => px.disc(g, lx + 1, ly + 2, 5, '#ffb040')); } }
      if (goal === 'B') { px.rect(g, cx + 80, gy - 80, 70, 80, '#f8f4ec'); px.poly(g, [[cx + 74, gy - 80], [cx + 115, gy - 110], [cx + 156, gy - 80]], '#ff8ab0'); px.rect(g, cx + 108, gy - 30, 14, 30, '#8a5a3a'); for (let i = 0; i < 9; i++) px.disc(g, cx - 40 + Math.cos(Math.PI * i / 8) * 30, gy - 40 - Math.sin(Math.PI * i / 8) * 30, 4, i % 2 ? '#ffffff' : '#ff8ab0'); if (mood === 'wilt') OB.FX.rain(g, { x: 0, y: 0, w: W, h: gy }, t, .8); }
      if (goal === 'C') { px.rect(g, cx + 40, gy - 130, 160, 130, '#2a2040'); for (let y = gy - 120; y < gy - 20; y += 14) for (let x = cx + 50; x < cx + 190; x += 16) px.rect(g, x, y, 8, 8, '#ffe080'); T(g, 'GRAND HOTEL VESPERA', cx + 120, gy - 145, '#ffd040', { align: 'center' }); if (mood === 'bloom') px.rect(g, cx - 40, gy - 2, 120, 3, '#e83a3a'); if (mood === 'wilt') { px.rect(g, cx - 160, gy - 40, 50, 40, '#c83a2a'); T(g, 'NOODLES', cx - 135, gy - 52, '#ffe040', { align: 'center' }); } }
      if (goal === 'D') { px.disc(g, cx + 120, gy - 40, 40, '#d8d8e8'); px.rect(g, cx + 80, gy - 40, 80, 40, '#c8c8d8'); px.rect(g, cx + 115, gy - 82, 10, 30, '#3a3a48'); const n = mood === 'bloom' ? 6 : mood === 'bud' ? 1 : 0; for (let i = 0; i < n; i++) { const p = (t * .6 + i * .37) % 1.5; if (p < 1) px.blend(g, 1 - p, 'add', () => px.line(g, 60 + i * 60 + p * 80, 20 + p * 40, 60 + i * 60 + p * 80 - 14, 20 + p * 40 - 6, '#ffffff')); } if (mood === 'wilt') px.blend(g, .7, 'normal', () => { for (let i = 0; i < 6; i++) px.ell(g, (i * 90 + t * 10) % W, 40 + (i % 2) * 20, 50, 14, '#5a5a6a'); }); }
      if (goal === 'E') { px.rect(g, cx + 110, gy - 120, 22, 120, '#f8f4ec'); for (let y = gy - 110; y < gy; y += 24) px.rect(g, cx + 110, y, 22, 10, '#e83a3a'); px.rect(g, cx + 106, gy - 134, 30, 14, '#3a3a48'); px.blend(g, .4 + .3 * Math.sin(t * 3), 'add', () => px.disc(g, cx + 121, gy - 127, 9, '#fff4c0')); if (mood === 'bloom' && t > 6 && t < 9) px.blend(g, .7, 'add', () => px.rect(g, W / 2 - 30, Math.round(H * .78) - 26, 60, 3, '#40ff80')); }
    }
    // the couple and the car, then the local
    const baseX = -40, dr = this.couple[0], ps = this.couple[1];
    r.overlay(g => OB.drawCarSide(g, Math.round(r.W / 2 - 160 + this.carX), Math.round(r.H * .78), 1.4, res.car, res.paint, { roll: t * 6, people: t < 3 ? [res.driver, res.passenger] : null }));
    if (t > 3) { for (const R of [dr, ps]) if (R.rig) r.actor(R.state.x + baseX, 0, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view)); }
    if (this.local.rig && t > 2) r.actor(this.local.state.x + baseX, 0, 0, (g, ox, oy) => this.local.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      OB.FX.draw(g);
      const W = r.W, H = r.H;
      // the beats: the local's line, her line, the caption card
      const bub = (text, x, y, who) => { const lines = E.font.wrap(text, 200), w = Math.max(...lines.map(l => OB.TW(l))) + 14, h = lines.length * 9 + 10; E.ui.box(g, Math.round(x - w / 2), Math.round(y - h), w, h, { bg: '#fff8f0', border: '#5a1e4a', gradient: false }); lines.forEach((l, i) => E.font.text(g, l, Math.round(x - w / 2 + 7), Math.round(y - h + 5 + i * 9), '#3a1a4a', { outline: false })); T(g, OB.CAST[who] ? OB.CAST[who].name : '', x - w / 2, y - h - 10, (OB.CAST[who] || {}).color || '#fff'); };
      if (t > 3.6 && t < 6.6) bub(this.lines[0], W / 2 + 120, H * .45, this.localId);
      if (t > 6.4 && t < 9.6) bub(this.lines[1], W / 2 - 40, H * .45, res.passenger);
      if (t > 9.4) { const m = G.moods[mood]; OB.UI.panel(g, W / 2 - 170, 18, 340, 58, { alpha: .94 }); T(g, 'GOAL ' + goal + ' • ' + G.name.toUpperCase(), W / 2, 26, C.sun, { align: 'center', scale: 2 }); T(g, mood.toUpperCase() + ': ' + m.title, W / 2, 46, mood === 'bloom' ? C.pink : mood === 'bud' ? C.good : C.sea, { align: 'center' }); T(g, m.caption, W / 2, 58, '#ffffff', { align: 'center' }); }
      OB.UI.footer(g, W, H, [['confirm', 'Skip']]);
    });
  }
};

/* ---- results: big tiles, no tables ---- */
S.results = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(res) {
    this.res = res; this.t = 0; this.scr = new OB.UI.Screen(); this.seeds = 0; this.entry = false; this.record = false;
    game().audio.music(OB.SONGS.results, { fade: .6 });
    const attract = OB.attractActive;
    if (!attract && (res.mode === 'arcade' || res.mode === 'love')) { this.seeds = OB.Profile.run({ score: res.score, goal: res.finished ? res.goal : null, mood: res.mood, route: res.route, time: res.time }); }
    if (!attract && res.mode === 'trial' && res.finished) { const k = res.cfg.trialKey; const tr = OB.Profile.trial(k, res.time, res.ghost); this.trial = tr; if (tr.best) { this.record = true; OB.Sound.sting('record'); } }
    if (!attract && OB.arcade && (res.mode === 'arcade' || res.mode === 'love') && OB.arcade.qualifies(res.score, res.mode)) { this.entry = true; OB.arcade.enter(res.score, res.mode, () => { this.entry = false; OB.Sound.sting('record'); }); }
    if (OB.Hub && res.mode === 'hub') return;
    const again = () => { const cfg = Object.assign({}, res.cfg); delete cfg.ghost; if (res.mode === 'trial' && OB.Profile.p.records.stage[cfg.trialKey]) cfg.ghost = OB.Profile.p.records.stage[cfg.trialKey].ghost; game().go('race', cfg, { fade: 'wipe' }); };
    const items = [{ id: 'again', label: res.mode === 'versus' ? 'REMATCH' : 'DRIVE AGAIN', onPick: again }, { id: 'car', label: res.mode === 'versus' ? 'CHANGE ROUTE' : 'CHANGE CAR', onPick: () => game().go(res.mode === 'versus' ? 'versus' : res.mode === 'trial' ? 'trial' : 'garage', { mode: res.mode, back: 'menu' }, { fade: 'wipe' }) }, { id: 'menu', label: 'MENU', onPick: () => game().go('menu', {}, { fade: 'wipe' }) }];
    this.items = items;
  },
  update(dt) {
    this.t += dt; if (OB.arcade) OB.arcade.update(dt);
    if (this.entry) return;
    if (this.t < .8) return;
    const W = game().W, H = game().H, bw = 128;
    this.scr.set(this.items.map((it, i) => Object.assign(it, { x: W / 2 - (bw * 3 + 20) / 2 + i * (bw + 10), y: H - 62, w: bw, h: 30 })));
    const r = this.scr.update(dt); if (r === 'back') game().go('menu', {}, { fade: 'wipe' });
  },
  draw(r) {
    const res = this.res, W = r.W, H = r.H;
    r.sky(['#1a0a3a', '#5a2a6a', '#ff7a59']);
    r.overlay(g => {
      OB.UI.title(g, res.mode === 'versus' ? (res.players[0].place === 1 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!') : res.finished ? (res.goal ? 'GOAL ' + res.goal + '!' : 'FINISH!') : 'TIME UP', W / 2, 12, { scale: 3 });
      const tile = (x, y, w, h, head, rows) => { OB.UI.panel(g, x, y, w, h, { alpha: .92 }); T(g, head, x + w / 2, y + 6, C.sun, { align: 'center' }); rows.forEach(([a, b, big], i) => { T(g, a, x + 10, y + 22 + i * 18, C.dim); T(g, b, x + w - 10, y + 19 + i * 18, '#ffffff', { align: 'right', scale: big ? 2 : 1 }); }); };
      const tw = Math.min(150, (W - 40) / 3), y = 52, h = 112;
      if (res.mode === 'versus') res.players.forEach((p, i) => tile(W / 2 - tw - 6 + i * (tw + 12), y, tw, h, 'PLAYER ' + (i + 1), [['Place', ['1ST', '2ND'][p.place - 1], true], ['Time', p.finished ? OB.fmtTime(p.time) : 'DNF'], ['Score', String(p.score)]]));
      else {
        tile(W / 2 - tw * 1.5 - 10, y, tw, h, res.mode === 'trial' ? 'TIME TRIAL' : 'YOUR RUN', res.mode === 'trial' ? [['Time', OB.fmtTime(res.time), true], ['Medal', this.trial && this.trial.medal ? this.trial.medal.toUpperCase() : '-'], ['Record', this.record ? 'NEW!' : '-']] : [['Score', String(res.score), true], ['Time', OB.fmtTime(res.time)], ['Route', res.route || '-']]);
        tile(W / 2 - tw / 2, y, tw, h, 'YOUR STYLE', [['Best drift', String(res.stats.bestDrift)], ['Near misses', String(res.stats.nearmiss)], ['Slipstream', res.stats.slip.toFixed(1) + ' s'], ['Overtakes', String(res.stats.overtakes)]]);
        if (res.grade) { tile(W / 2 + tw / 2 + 10, y, tw, h, 'LOVE IN BLOOM', [['Petals', res.petals + ' / ' + res.petalMax], ['Grade', '', false]]); const s = Math.min(1, this.t / .6), gx = W / 2 + tw + 10, gy = y + 70; T(g, res.grade, gx, gy - 10 * (1 - s), res.grade.startsWith('A') ? C.pink : '#ffffff', { align: 'center', scale: Math.round(2 + s * 2) }); if (res.grade === 'AAA') T(g, 'FULL BLOOM', gx, gy + 30, C.sun, { align: 'center' }); }
        else tile(W / 2 + tw / 2 + 10, y, tw, h, 'REWARDS', [['Seeds', '+' + this.seeds, true], ['Seed bank', String(OB.Profile.p.seeds)], ['Mood', res.goal ? res.mood.toUpperCase() : '-']]);
      }
      if (res.grade) T(g, '+' + this.seeds + ' seeds   (bank ' + OB.Profile.p.seeds + ')', W / 2, y + h + 8, C.good, { align: 'center' });
      this.scr.draw(g);
      OB.UI.footer(g, W, H, [['confirm', 'Select'], ['cancel', 'Menu']]);
    });
    if (this.entry && OB.arcade) { r.overlay(g => px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#140a28'))); OB.arcade.draw(r); }
  }
};
})();
