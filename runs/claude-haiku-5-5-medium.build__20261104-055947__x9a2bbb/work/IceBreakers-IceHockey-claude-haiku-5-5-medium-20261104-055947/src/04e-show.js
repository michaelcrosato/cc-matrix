/* ---- THE SHOW: the instant replay after a goal (the last few seconds, at half speed, from the ring of frames the
 * match keeps), the camera's punch-in on a big hit, the chirp bubbles, the player introductions at the first faceoff,
 * and the crowd's waves and signs. None of it changes the match: the replay puts the frames on the entities and then
 * gives back the real positions. ---- */
const CROWD_SIGNS = ['GO TROUT!', 'KABOOM!', 'HOW?!', 'BOO!', 'NICE!', 'SKATE!'];
/** a frame of the match, kept every sixth step (20 a second) for the replay */
function histStep() {
  if (M.tick % 6) return;
  M.hist = M.hist || [];
  M.hist.push({ sk: M.skaters.map(s => [s.x, s.y, s.face, s.state]), gl: M.goalies.map(g => [g.x, g.y, g.face, g.state]), pk: [M.puck.x, M.puck.y, M.puck.z] });
  if (M.hist.length > 90) M.hist.shift();
}
/** the goal's replay: the frames before it, at half speed, then the real positions come back */
function replayStart() {
  if (M.inSO || !M.hist || M.hist.length < 10 || game.settings.replays === 'Off') return;
  M.replay = { frames: M.hist.slice(-50), i: 0, saved: null };
}
function replayStep(dt) {
  const R = M.replay;
  if (!R.saved) R.saved = { sk: M.skaters.map(s => [s.x, s.y, s.face, s.state]), gl: M.goalies.map(g => [g.x, g.y, g.face, g.state]), pk: [M.puck.x, M.puck.y, M.puck.z] };
  R.i += dt * 10;
  if (R.i >= R.frames.length) {
    M.skaters.forEach((s, i) => { [s.x, s.y, s.face, s.state] = R.saved.sk[i]; });
    M.goalies.forEach((g, i) => { [g.x, g.y, g.face, g.state] = R.saved.gl[i]; });
    [M.puck.x, M.puck.y, M.puck.z] = R.saved.pk;
    M.replay = null; return;
  }
  const f = R.frames[Math.floor(R.i)];
  M.skaters.forEach((s, i) => { [s.x, s.y, s.face, s.state] = f.sk[i]; });
  M.goalies.forEach((g, i) => { [g.x, g.y, g.face, g.state] = f.gl[i]; });
  [M.puck.x, M.puck.y, M.puck.z] = f.pk;
}
/** the booth's introductions: each side's players, once, at the first faceoff */
function introduce() {
  M.introDone = true;
  if (game.settings.intros === 'Off') return;
  const names = M.humans.map(h => h.sk.name + ' #' + h.sk.num).join(', ');
  if (names) { M.banner = 'NOW SKATING: ' + names.toUpperCase(); M.bannerT = 3; say('ON THE ICE, ' + M.teams[0].def.name + ' AGAINST ' + M.teams[1].def.name + '. ' + names + '.'); }
}
/** a crowd wave, for a goal or a big hit (the stands stand, sway and hold signs) */
function waveStart() { M.waveT = 4; }
/* the Team AI's cadence: a CPU skater re-thinks every lerp(.3, .12, skill) seconds, and its new decision takes effect
 * after lerp(.35, .1, skill) seconds (the reaction). The skill comes from the CPU skill setting (0.5 .. 1.5). Between
 * decisions it keeps steering the same way; a one-shot action (a pass, a check, a shot) is taken once. */
function aiThink(sk, dt) {
  const skill = clamp(T.cpuSkill - .5, 0, 1), now = M.playT || 0;
  sk.thinkT = (sk.thinkT || 0) - dt;
  if (sk.thinkT <= 0) { sk.thinkT = lerp(.3, .12, skill); sk.pend = { c: aiCtrl(sk, dt), at: now + lerp(.35, .1, skill) }; }
  if (sk.pend && now >= sk.pend.at) { sk.dec = sk.pend.c; sk.pend = null; }
  if (!sk.dec) sk.dec = aiCtrl(sk, dt);
  const out = Object.assign({}, sk.dec);
  Object.assign(sk.dec, { pass: false, lob: false, check: false, shootUp: false, deke: false, switch: false });   // (one-shots are taken once)
  return out;
}
/** the broadcast director: the puck is followed; a fight frames the two fighters; the replay and the overhead follow the same way */
let camMode = 'follow';
function directorStep() {
  if (M.fight && M.fight.a && M.fight.b) {
    if (camMode !== 'fight') { game.follow(null); camMode = 'fight'; }
    const a = M.fight.a, b = M.fight.b;
    game.cam.frame([{ x: a.x, y: a.y, z: 0 }, { x: b.x, y: b.y, z: 0 }], { margin: 40, zoom: [1, 1.7] });
    return;
  }
  if (camMode !== 'follow') { game.cam.frame(null); game.follow(M.puck, { z: 8, lead: 10 }); game.cam.smooth = .18; camMode = 'follow'; }
}
