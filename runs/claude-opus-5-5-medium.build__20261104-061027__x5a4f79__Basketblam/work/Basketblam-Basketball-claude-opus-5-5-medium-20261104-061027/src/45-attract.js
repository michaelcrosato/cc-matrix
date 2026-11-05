/* ATTRACT MODE: ten seconds without input on the title or any menu screen starts "CHANNEL BLAM DEMO": five segments of
 * real CPU-vs-CPU play that cheat freely (infinite turbo, forced dunks, spawned power-ups, scripted twists) so every
 * feature shows, a card between segments, the Hall of Blam and the logo; it loops. Any input leaves at once, back to the
 * screen it interrupted (a touch-only device keeps it running and shows the notice on a tap). */
const IDLE = { t: 0, px: null };
function idleReset() { IDLE.t = 0; }
/** called every step (90-start.js): any input from any player resets the timer; 10 s idle on a menu screen starts it */
function idleTick(dt) {
  const sc = game.scene; if (!sc || HUB) return;
  if (inputSeen()) IDLE.t = 0; else IDLE.t += dt;
  if (sc.menuScreen && IDLE.t > 10 && !game.paused && !(game.shell && game.shell._stack && game.shell._stack.length) && !(RS.initials)) { IDLE.t = 0; go('attract', { from: game.sceneName }); }
}
function inputSeen() {
  for (const I of game.players) { if (I.anyPressed()) return true; const m = I.move(); if (Math.abs(m[0]) > .3 || Math.abs(m[1]) > .3) return true; }
  const I0 = game.input, p = I0.pointer && I0.pointer();
  if (p && IDLE.px && Math.hypot(p[0] - IDLE.px[0], p[1] - IDLE.px[1]) > 4) { IDLE.px = p; return true; } if (p) IDLE.px = p;
  if (I0.clicked && I0.clicked()) return true;
  if (I0.held && I0.held.size) return true;
  return false;
}
const SEGMENTS = [
  { court: 'skybox', home: 'hightops', away: 'breakers', seconds: 35, score: [14, 12], quarter: 2, title: 'NEON HEIGHTS: HIGH-FLYING AT THE SKYBOX',
    script: [[1, 'tip'], [5, 'command', [0, 'dunk']], [12, 'command', [1, 'oop']], [18, 'command', [2, 'spin']], [24, 'command', [1, 'three', true]], [29, 'command', [0, 'dunk', 'windmill']]] },
  { court: 'pier', home: 'breakers', away: 'crushers', seconds: 30, score: [22, 25], quarter: 3, title: 'SEA BREEZE AT THE PIER',
    script: [[1, 'spawn', ['rocket', 0]], [1.5, 'spawn', ['laser', 1]], [3, 'twist', 'gust'], [7, 'command', [1, 'three', true]], [13, 'command', [2, 'steal']], [20, 'command', [0, 'dunk', 'tomahawk']]] },
  { court: 'scrapyard', home: 'crushers', away: 'magma', seconds: 30, score: [31, 30], quarter: 3, title: 'OIL AND FIRE AT THE SCRAPYARD',
    script: [[1, 'spawn', ['bomb', 0]], [4, 'command', [0, 'shove']], [10, 'command', [3, 'slip']], [14, 'command', [2, 'block']], [21, 'command', [1, 'dunk', 'reverse']]] },
  { court: 'caldera', home: 'magma', away: 'hightops', seconds: 35, score: [40, 38], quarter: 4, title: 'ERUPTION AT THE CALDERA',
    script: [[3, 'twist', 'eruption'], [9, 'command', [0, 'vent']], [19, 'shatterNext'], [19.2, 'command', [3, 'dunk', 'flip']]] },
  { court: 'dome', home: 'blambots', away: 'allstars', seconds: 35, score: [55, 52], quarter: 4, boss: true, title: 'HUMANS VS HARDWARE AT THE BLAM DOME',
    script: [[2, 'nova', 2], [3, 'command', [2, 'dunk', 'nova720']], [10, 'overclock'], [14, 'command', [0, 'posterize']], [21, 'spawn', ['moon', 1]], [22, 'command', [1, 'dunk', 'quake']], [28, 'command', [2, 'reboot']]] }
];
const ATT = { seg: 0, t: 0, phase: 'card', from: 'title', notice: 0, script: [] };
SCENES.attract = {
  isMatch: true, view: 'broadcast', input: KEYS, pausable: false,
  enter(d) { S.scene = 'attract'; ATT.from = (d && d.from) || ATT.from || 'title'; ATT.seg = (d && d.segment) || 0; ATT.loops = 0; attractCard(); IDLE.px = game.input.pointer && game.input.pointer(); },
  exit() { game.timeScale = 1; game.weather = null; Crowd.update(1, false); S.match = null; S.mode = 'exhibition'; game.setZoom(1); FX.applied = 1; },
  update(dt) {
    // any input leaves, back where it came from (the input is used up)
    if (ATT.t > .3 && inputSeen()) {
      const cl = game.input.clicked && game.input.clicked(); if (S.touchOnly && cl && ATT.notice > 0 && TITLE.btn && hitBox(cl, TITLE.btn)) game.menu('settings');
      if (S.touchOnly) { ATT.notice = 4; }
      else { game.players.forEach(I => I.consumeAll()); idleReset(); go(ATT.from === 'attract' ? 'title' : ATT.from); return; }
    }
    ATT.notice = Math.max(0, ATT.notice - dt);
    ATT.t += dt;
    if (ATT.phase === 'card') { if (ATT.t > 2) attractPlay(); return; }
    if (ATT.phase === 'hall') { if (ATT.t > 6) { ATT.phase = 'logo'; ATT.t = 0; } return; }
    if (ATT.phase === 'logo') { if (ATT.t > 4) { ATT.seg = 0; ATT.loops++; attractCard(); } return; }
    // play: the director's script, then the real match machinery
    const seg = SEGMENTS[ATT.seg];
    while (ATT.script.length && ATT.script[0][0] <= ATT.t) { const [, a, args] = ATT.script.shift(); direct(a, args); }
    matchStep(dt); cameraStep(dt); Caption.update(dt); hoopStep(dt, S.match.wind ? S.match.wind.x / Math.max(1, tune('windStrength')) : 0); Crowd.update(dt, true);
    if (ATT.t > seg.seconds || S.match.phase === 'over') { ATT.seg++; if (ATT.seg >= SEGMENTS.length) { ATT.phase = 'hall'; ATT.t = 0; music('title'); S.match = null; } else attractCard(); }
  },
  draw(r) {
    if (ATT.phase === 'play' && S.match) { drawMatchWorld(r); r.overlay(g => { drawHud(g, r); drawAttractOverlay(g, r); }); return; }
    menuBackdrop(r, game.time);
    r.overlay(g => {
      if (ATT.phase === 'card') { E.font.title(g, 'TONIGHT ON', r.W / 2, r.H * .3, { scale: 2, colors: ['#ffffff', '#c8c0e0'], align: 'center' }); E.font.title(g, 'CHANNEL BLAM', r.W / 2, r.H * .3 + 24, { scale: 4, colors: ['#ffffff', '#ffd23a', '#ff3ca6'], depth: 3, align: 'center' }); txt(g, SEGMENTS[ATT.seg].title, r.W / 2, r.H * .3 + 70, UI.accent2, 1, 'center'); }
      if (ATT.phase === 'hall') drawHall(g, r);
      if (ATT.phase === 'logo') { logo(g, r.W / 2, r.H * .35, Math.max(4, Math.floor(r.W / 90)), game.time); txt(g, 'NO FOULS. NO MERCY. ALL BLAM.', r.W / 2, r.H * .35 + 50, UI.accent2, 1, 'center'); }
      drawAttractOverlay(g, r);
    });
  }
};
function attractCard() { ATT.phase = 'card'; ATT.t = 0; S.match = null; S.mode = 'attract'; music('title'); }
function attractPlay() {
  const seg = SEGMENTS[ATT.seg];
  ATT.phase = 'play'; ATT.t = 0; ATT.script = seg.script.slice();
  startMatch({ court: seg.court, mode: 'attract', teams: [{ id: seg.home }, { id: seg.away }], humans: [], quarter: 90, difficulty: 'blam', powerups: true, twists: true, boss: !!seg.boss, seed: 100 + ATT.seg + ATT.loops * 7, cheats: {} });
  const m = S.match; m.score = seg.score.slice(); m.quarter = seg.quarter; m.clock = 70;
  const court = get('court', seg.court); game.weather = court.weather ? Object.assign({}, court.weather) : null; music(court.music);
  game.setView(setting('camera') === 'high' ? HIGH : 'broadcast'); FX.focusX = XM;
  if (!seg.script.some(s => s[1] === 'tip')) { m.phase = 'live'; giveBall(S.players[0], 'give'); }
  emit('attractSegment', { segment: ATT.seg });
}
/** the director's actions */
function direct(a, args) {
  const m = S.match; if (!m) return;
  switch (a) {
    case 'tip': break;
    case 'spawn': { const p = S.players[args[1]], id = args[0]; spawnPowerup(id, clamp(p.x, X0 + 10, X1 - 10), clamp(p.y, Y0 + 10, Y1 - 10)); game.after(.6, () => { const k = S.match ? S.match.powerups.findIndex(x => x.id === id) : -1; if (k >= 0) { S.match.powerups.splice(k, 1); givePowerup(p, id); } }); break; }
    case 'twist': if (args === 'gust' && m.twist) { m.twist.next = 0; } if (args === 'eruption' && m.twist) m.twist.next = 0; break;
    case 'nova': novaOn(S.players[args]); break;
    case 'overclock': overclock(); break;
    case 'shatterNext': m.forceShatter = true; break;
    case 'command': { const [slot, kind, extra] = args; S.players[slot].force = { kind, extra, t: 0 }; Caption.show('vinnie', ATTRACT_CALLS[kind] || 'WATCH THIS!', { big: true }); break; }
  }
}
const ATTRACT_CALLS = { dunk: 'TURBO DUNK INCOMING!', oop: 'ALLEY-OOP! ALLEY-OOP!', spin: 'SPIN MOVE! ANKLES BEWARE!', three: 'FROM DOWNTOWN!', steal: 'PICKPOCKET ALERT!', shove: 'BLAM BOMB SHOVE!', slip: 'OIL SLICK! WHOOPS!', block: 'REJECTION TIME!', vent: 'VOLCANO LAUNCH!', posterize: 'POSTER ON THE WAY!', reboot: 'SHOVE THE ROBOT! TWICE!' };
/** a forced play: the director moves people where they need to be and presses the buttons (it may cheat freely) */
function forcedStep(p) {
  const F = p.force, c = p.cmd, h = attackHoop(p.team), m = S.match; F.t += 1 / 120;
  if (F.t > 6) { p.force = null; return true; }
  const take = () => { if (!hasBall(p)) { const o = owner(); if (o && o.state !== 'run' && o.state !== 'inbound') return false; giveBall(p, 'give'); if (m.phase !== 'live') m.phase = 'live'; } return true; };
  switch (F.kind) {
    case 'dunk': case 'posterize': {
      if (busy(p) && p.state === 'dunk') { p.force = null; return true; }
      if (!take()) return true;
      if (F.t < .05) { p.x = h.x - h.dir * 110; p.y = h.y + 30; if (F.kind === 'posterize') { const f = foes(p)[0]; f.x = h.x - h.dir * 14; f.y = h.y; f.state = 'run'; } }
      steer(c, p, h.x, h.y); c.tD = true;
      if (Math.hypot(p.x - h.x, p.y - h.y) < 95) { if (F.extra) startDunk(p, { dunk: get('dunk', F.extra) }); else startDunk(p); p.force = null; }
      return true;
    }
    case 'oop': { if (!take()) return true; const t = mate(p); if (F.t < .05) { t.x = h.x - h.dir * 70; t.y = h.y - 20; t.state = 'run'; } c.oP = F.t > .3; if (F.t > .35) p.force = null; return true; }
    case 'three': { if (!take()) return true; if (F.t < .05) { p.x = h.x - h.dir * 150; p.y = h.y - 30; } if (p.state === 'jumpshot') { c.sD = p.jump.t < p.jump.apexT; c.sR = !c.sD; if (!c.sD) { if (F.extra) S.cheats.shots = 'in'; p.force = null; game.after(1.5, () => { if (S.cheats) S.cheats.shots = null; }); } } else c.sP = c.sD = F.t > .2; return true; }
    case 'spin': { if (!take()) return true; if (F.t < .05) { const f = foes(p)[0]; f.x = p.x + Math.cos(p.facing) * 14; f.y = p.y + Math.sin(p.facing) * 14; f.state = 'run'; p.turbo = 1; } c.vP = F.t > .15; if (F.t > .2) p.force = null; return true; }
    case 'steal': { const o = foes(p)[0]; if (!hasBall(o)) { giveBall(o, 'give'); m.phase = 'live'; } if (F.t < .05) { p.x = o.x - Math.cos(o.facing) * 12; p.y = o.y - Math.sin(o.facing) * 12 + 4; givePowerup(p, 'glue'); } c.pP = F.t > .2; if (F.t > .25) p.force = null; return true; }
    case 'shove': { const o = foes(p)[0]; if (hasBall(p)) passTo(p, mate(p)); if (F.t < .05) { o.x = p.x + Math.cos(p.facing) * 14; o.y = p.y + Math.sin(p.facing) * 14; o.state = 'run'; p.turbo = 1; } if (F.t > .15 && !hasBall(p) && p.state === 'run') { p.cool.shove = 0; startShove(p); p.force = null; } return true; }
    case 'slip': { if (F.t > .1) { slip(p); p.force = null; } return true; }
    case 'block': { const o = foes(p)[0]; if (F.t < .05) { giveBall(o, 'give'); m.phase = 'live'; const oh = attackHoop(o.team); o.x = oh.x - oh.dir * 90; o.y = oh.y; p.x = o.x + oh.dir * 12; p.y = o.y; o.force = { kind: 'three', t: 0 }; S.forceBlock = true; } if (o.state === 'jumpshot' && !isAir(p)) { c.sP = true; p.force = null; } return true; }
    case 'vent': { if (!take()) return true; const v = VENTS.find(v => (v.x - XM) * h.dir > 0) || VENTS[0]; if (F.t < .05) { p.x = v.x; p.y = v.y; } if (m.twist) { m.twist.ventOn = true; m.twist.ventT = 3.5; } startDunk(p, { vent: true }); p.force = null; return true; }
    case 'reboot': { const bots = foes(p).filter(f => f.def.team === 'blambots'), o = bots[0]; if (!o) { p.force = null; return true; } if (F.t > .2 && !F.k1) { F.k1 = true; o.x = p.x + 12; o.y = p.y; knockDown(o, .5, p); emit('shove', { slot: p.slot, victim: o.slot, name: p.name, victimName: o.name }); } if (F.t > 1.4 && !F.k2) { F.k2 = true; o.reboot = 0; o.state = 'run'; o.x = p.x + 12; o.y = p.y; knockDown(o, .5, p); emit('shove', { slot: p.slot, victim: o.slot, name: p.name, victimName: o.name }); p.force = null; } return true; }
  }
  p.force = null; return false;
}
function drawAttractOverlay(g, r) {
  if (Math.floor(game.real * 2) % 2 === 0) promptLine(g, S.touchOnly ? 'DEMO' : 'DEMO - PRESS ANY BUTTON', r.W / 2, r.H - 12, game.input, { align: 'center', color: UI.gold });
  txt(g, 'CHANNEL BLAM DEMO', 6, r.H - 12, '#ff3ca6', 1);
  if (ATT.notice > 0 || S.touchOnly && ATT.notice > 0) { E.ui.box(g, r.W / 2 - 150, r.H / 2 - 30, 300, 60, { bg: '#140c24', border: UI.accent }); txt(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H / 2 - 22, '#ffffff', 1, 'center'); const bx = r.W / 2 - 50, by = r.H / 2 - 4; TITLE.btn = [bx, by, 100, 22]; E.ui.box(g, bx, by, 100, 22, { bg: [UI.accent, E.shade(UI.accent, -.4)], border: '#ffffff' }); txt(g, 'SETTINGS', r.W / 2, by + 6, '#ffffff', 1, 'center'); }
}
