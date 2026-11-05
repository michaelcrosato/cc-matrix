/* FX: the camera director (follows the ball with a lead, the dunk cam, slow motion), comic banners by priority, the
 * effect recipes for every impact, the crowd's reactions and the announcers' calls, all driven by match events. */
const FX = { banner: null, slow: 0, slowScale: 1, zoom: 1, zoomTarget: 1, focusX: XM, react: { jump: 0, slump: 0, flash: 0, beat: 0 }, dunkCam: null };
const BANNER_PRI = { shatter: 10, supernova: 9, posterized: 8, dunk: 7, alleyoop: 6, block: 5, jackpot: 4, three: 3, steal: 2, ankles: 1, goaltend: 4, sudden: 9, overtime: 9, reboot: 6, overclock: 9, buzzer: 8, eruption: 5 };
const BANNER_COL = { shatter: ['#ffffff', '#cfe4ff', '#6ab0ff'], supernova: ['#ffffff', '#d8a0ff', '#ffd23a'], posterized: ['#ffe0ff', '#ff5ad8', '#a0208a'], dunk: ['#fffbe8', '#ffd23a', '#ff7a1a'], alleyoop: ['#fffbe8', '#ffe08a', '#ff9a3a'],
  block: ['#ffe8e0', '#ff5a3a', '#a01a10'], jackpot: ['#fffbe8', '#ffd23a', '#c88a10'], three: ['#e8ffff', '#5ae8ff', '#1a8ab0'], steal: ['#e8ffe8', '#5aff8a', '#1a8a3a'], ankles: ['#ffffe8', '#ffe05a', '#c8a010'], goaltend: ['#ffffff', '#ffb0b0', '#c84040'],
  sudden: ['#ffffff', '#ffd23a', '#ff3a3a'], overtime: ['#ffffff', '#ffd23a', '#ff7a1a'], reboot: ['#e8f8ff', '#5ac8ff', '#2a6ab0'], overclock: ['#ffe0e0', '#ff3a2a', '#8a0a0a'], buzzer: ['#ffffff', '#ffd23a', '#ff7a1a'], eruption: ['#ffe0c0', '#ff7a2a', '#a02a0a'] };
function banner(kind, text, o = {}) {
  const cur = FX.banner; if (cur && cur.t < 1 && (BANNER_PRI[cur.kind] || 0) > (BANNER_PRI[kind] || 0)) return;
  FX.banner = { kind, text, t: 0, sub: o.sub || '' };
}
function slowMo(scale, seconds) { if (game.settings.motion) return; FX.slow = seconds; FX.slowScale = scale; }
function dunkFx(p, h, shatter) {
  game.freeze(shatter ? .15 : .08); game.shake(4); game.flash('#ffffff', .06, .6);
  P.ring(h.x, h.y, 4, 26, '#fff6c0', .4); P.sparks(h.x, h.y, RIM_Z, 16); P.glints(h.x, h.y, RIM_Z, 10, '#ffe08a');
  sfxAt('slam', h.x); sfxAt('crowd_roar', h.x); rumble(.6, .2); FX.react.jump = 1.4; FX.react.flash = 1;
}
/** the camera: x follows the ball (or its holder) with a lead toward where play goes; the dunk cam zooms in */
function cameraStep(dt) {
  const m = S.match, b = S.ball; if (!m || !b) return;
  const o = b.owner, tx0 = o ? o.x + attackHoop(o.team).dir * 48 : b.x;
  let tx = tx0, zoom = 1;
  const dunker = S.players.find(p => p.state === 'dunk');
  if (dunker && !game.settings.motion && S.mode !== 'hub') { const h = attackHoop(dunker.team); tx = (dunker.x + h.x) / 2; zoom = 1.22; }
  if (m.phase === 'tipoff') { tx = XM; zoom = 1.12; }
  FX.focusX = approach(FX.focusX, clamp(tx, X0 + 60, X1 - 60), Math.max(60, Math.abs(tx - FX.focusX) * 4) * dt);
  FX.zoom = approach(FX.zoom, zoom, dt * (zoom > FX.zoom ? 1.6 : 1));
  const camY = game.view.id === HIGH ? YM + 10 : YM - 30;
  game.focus(FX.focusX, camY, dunker ? 30 : 0);
  if (Math.abs((FX.applied || 1) - FX.zoom) > .005) { game.setZoom(FX.zoom); FX.applied = FX.zoom; }
  // slow motion around a dunk's apex, and after shatters
  let ts = tune('gameSpeed');
  if (FX.slow > 0) { FX.slow -= dt / Math.max(.1, FX.slowScale); ts *= FX.slowScale; }
  else if (dunker && dunker.dunk && !game.settings.motion && S.mode !== 'hub') { const u = dunker.dunk.t / dunker.dunk.T; if (u > .45 && u < .85) ts *= tune('dunkSlowMo'); }
  game.timeScale = ts;
  for (const k of ['jump', 'slump', 'flash']) FX.react[k] = Math.max(0, FX.react[k] - dt);
  if (FX.banner) { FX.banner.t += dt; if (FX.banner.t > 1.3) FX.banner = null; }
}

/* ---- events → banners, captions, crowd, sounds ---- */
const nameOf = slot => (S.players[slot] || {}).name;
const DUNK_BANK = { power: 'dunkPower', spin: 'dunkSpin', flip: 'dunkFlip', hang: 'dunkHang', long: 'dunkLong', nova: 'dunkNova', volcano: 'dunkVolcano', quake: 'dunkQuake' };
on('basket', ev => {
  const p = S.players[ev.slot], ctx = { name: p && p.name, team: teamName(ev.team) };
  if (ev.goaltend) { banner('goaltend', 'GOALTEND!'); Caption.call('goaltend', ctx); }
  else if (ev.dunk) { const dk = get('dunk', ev.dunkId); banner(ev.alleyoop ? 'alleyoop' : 'dunk', ev.alleyoop ? 'ALLEY-OOP!' : (dk ? dk.banner : 'SLAM!'), { sub: ev.alleyoop && dk ? dk.banner : '' }); Caption.call(ev.alleyoop ? 'alleyoop' : DUNK_BANK[dk ? dk.family : 'power'], ctx); }
  else if (ev.three) { banner('three', ev.dist > 220 ? 'FROM DOWNTOWN!' : 'THREE!'); Caption.call(ev.dist > 220 ? 'deepThree' : 'three', ctx); }
  else if (ev.layup) Caption.call('layup', ctx);
  else Caption.call('jumper', ctx);
  if (ev.jackpot) { banner('jackpot', 'JACKPOT!'); Caption.call('jackpot', ctx); sfxAt('jackpot'); }
  if (ev.gold) P.text(XM, YM, 60, 'GOLD BALL x2', '#ffd23a', { scale: 2 });
  if (ev.buzzer) banner('buzzer', 'AT THE BUZZER!');
  FX.react.jump = Math.max(FX.react.jump, ev.dunk ? 1.4 : .8);
  const m = S.match, diff = m.score[ev.team] - m.score[1 - ev.team];
  if (diff >= 15 && S.fxRng() < .3) Caption.call('blowout', { team: teamName(ev.team) });
  else if (diff >= -3 && diff <= 0 && m.quarter >= 3 && S.fxRng() < .25) Caption.call('comeback', { team: teamName(ev.team) });
});
on('release', ev => { const m = S.match; if (ev.rel === 'perfect') { const p = S.players[ev.slot]; if (p) P.text(p.x, p.y, p.z + 60, 'PERFECT', '#5ae8ff', { scale: 1, bounce: false }); } });
on('rim', () => { const b = S.ball; if (b.shot && b.shot.airball === false && S.fxRng() < .2) sfxAt('crowd_ooh', b.x, { vol: .5 }); });
on('block', ev => { banner('block', 'REJECTED!'); Caption.call('block', { name: ev.name, victim: ev.victimName }); FX.react.jump = .8; sfxAt('crowd_ooh'); });
on('steal', ev => { banner('steal', 'PICKPOCKET!'); Caption.call('steal', { name: ev.name, victim: ev.victimName }); const p = S.players[ev.slot]; if (p && S.fxRng() < .4) bark(p); });
on('shove', ev => { Caption.call('shove', { name: ev.name, victim: ev.victimName }); FX.react.jump = Math.max(FX.react.jump, .3); });
on('ankles', ev => { banner('ankles', 'ANKLES BROKEN!'); Caption.call('ankles', { name: ev.name, victim: ev.victimName }); });
on('posterized', ev => { banner('posterized', 'POSTERIZED!'); Caption.call('posterized', { name: ev.name, victim: ev.victimName }, { force: true }); bark(S.players[ev.slot]); });
on('supernovaOn', ev => banner('supernova', 'SUPERNOVA!', { sub: ev.name }));
on('shatter', () => banner('shatter', 'SHATTERED!'));
on('reboot', ev => banner('reboot', 'SYSTEM REBOOT!', { sub: ev.name }));
on('twist', ev => { if (ev.kind === 'overclock') banner('overclock', 'OVERCLOCK!'); if (ev.kind === 'eruption') banner('eruption', 'ERUPTION!'); });
on('overtime', ev => banner(ev.sudden ? 'sudden' : 'overtime', ev.sudden ? 'SUDDEN BLAM!' : 'OVERTIME!'));
on('release', ev => { const b = S.ball; if (b.shot && b.shot.airball) game.after(.8, () => { if (S.ball && !S.ball.touched) { Caption.call('airball', { name: nameOf(ev.slot) }); FX.react.slump = 1; } }); });
on('taunt', ev => { const p = S.players[ev.slot]; if (p) bark(p); });
on('dunkStart', ev => { const p = S.players[ev.slot]; if (p && p.nova) P.fire(p.x, p.y, p.z + 20, 6); });
function bark(p) { if (!p || !p.def.barks) return; const line = pick(p.def.barks); Voice.say(line, p.def.voice, { vol: .7 }); P.text(p.x, p.y, p.z + 64, line.toUpperCase(), '#ffffff', { scale: 1, bounce: false }); }
