/* ATTRACT MODE: after 10 s with no input on the title or a top menu, a looping highlight reel played by the real game:
 * CPU against CPU with cheats on (forced pitches and contact, full meters), one caption card per segment. Any input
 * returns to the title. Each segment has a time limit and moves on by itself. Never in an AI Hub session. */
const ATT_SEGS = [
  { cap: 'PLAY BALL!', park: 'kernel', away: 'HCK', home: 'COM', len: 16, setup: m => { m.force = { contact: null }; m.attractForce = [{ at: 2, contact: 'perfect' }]; } },
  { cap: 'SUPER PITCHES', park: 'caldera', away: 'COM', home: 'MCE', len: 14, setup: m => { m.teams[1].meter = 100; m.strikes = 2; m.cheats.cpuNoSwing = true; m.hz && (m.hz.vent = 6); } },
  { cap: 'LEATHER AND LASERS', park: 'barnacle', away: 'COM', home: 'HCK', len: 16, setup: m => { m.teams[1].meter = 100; m.attractForce = [{ at: 0, contact: 'perfect' }]; } },
  { cap: 'WHEELS', park: 'kernel', away: 'COM', home: 'HCK', len: 14, setup: m => { m.attractRunner = 1; m.attractSteal = true; m.cheats.cpuNoSwing = true; } },
  { cap: 'BATZOOKA!', park: 'megadome', away: 'COM', home: 'MMX', len: 18, setup: m => { m.teams[0].meter = 100; m.cheats.infMeter = true; m.attractForce = [{ at: 0, homer: true }]; m.attractArm = true; } },
  { cap: 'RHUBARB!', park: 'caldera', away: 'COM', home: 'MCE', len: 16, setup: m => { m.attractRhubarb = true; } },
  { cap: 'SIX WILD PARKS', park: 'tranquility', away: 'COM', home: 'MBM', len: 14, setup: m => { m.attractForce = [{ at: 0, homer: true }]; } },
  { cap: 'SIX WILD PARKS', park: 'boneyard', away: 'COM', home: 'HMH', len: 14, setup: m => { m.teams[1].meter = 100; m.strikes = 2; m.cheats.cpuNoSwing = true; } },
  { cap: '1-4 PLAYERS · PLAY ONLINE IN AI HUB', park: 'megadome', derby: true, len: 16 },
  { cap: 'MOONSHOT LEADERS', table: true, len: 8 }
];
const ATT = { seg: 0, t: 0, card: 0 };
BZ.attract = ATT;
SCENES.attract = {
  input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter() { ATT.seg = -1; IDLE.t = 0; IDLE.px = null; BZ.mute = false; nextSeg(); },
  exit() { game.timeScale = 1; game.weather = null; RADIO.who = null; },
  update(dt) {
    commonTick(dt); radioTick(dt);
    if (ATT.t > .4 && anyInput()) { for (const I of game.players) I.consumeAll(); IDLE.t = 0; return game.go('title'); }
    ATT.t += dt / Math.max(.05, game.timeScale); ATT.card = Math.max(0, ATT.card - dt);
    const S = ATT_SEGS[ATT.seg];
    if (!S.table && M) {
      // the director's forces: at the n-th pitch, perfect contact or a home run; arm the Batzooka; steals; a rhubarb
      if (M.attractForce && M.phase === 'select') { const f = M.attractForce.find(f => f.at <= M.pitchCount && !f.used); if (f) { f.used = true; M.force = Object.assign(M.force || {}, f.contact ? { contact: f.contact } : {}, f.homer ? { homer: true, contact: 'perfect' } : {}); } }
      if (M.attractArm && M.phase === 'select') M.armed = true;
      if (M.attractRunner && M.phase === 'walkUp' && !M.runners.length) { addRunner(offense().lineup[0], M.attractRunner); }
      if (M.attractSteal && M.phase === 'select') { const r = runnerOn(1); if (r && !runnerOn(2)) r.steal = true; }
      if (M.attractRhubarb && M.phase === 'select' && !M.rhubarb) { M.attractRhubarb = false; startRhubarb(() => { walk(true); return 'walk'; }, batterNow()); }
      matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt);
      if (S.derby) ghostsStep(dt);
    }
    if (ATT.t > S.len || (M && M.phase === 'final')) nextSeg();
  },
  draw(r) {
    const S = ATT_SEGS[ATT.seg];
    if (S.table || !M) menuBackdrop(r, .6); else { drawMatchWorld(r); drawHUD(r); if (S.derby) ghostsDraw(r);  }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (S.table) { title(g, 'MOONSHOT LEADERS', W / 2, 20, 3); drawLeaders(g, W / 2, 60); E.font.title(g, 'BATZOOKA BASEBALL', W / 2, H - 70, { scale: 2, colors: GOLD, align: 'center' }); }
      E.ui.box(g, W - SAFE - 84 - cornerW(), H - SAFE - 38, 84, 16, { bg: ['#e8443a', '#a82a20'], border: '#ffffff' }); text(g, 'DEMO PLAY', W - SAFE - 42 - cornerW(), H - SAFE - 34, '#ffffff', { align: 'center' });
      if (ATT.card > 0 || S.table) E.font.title(g, S.cap, W / 2, H * .3, { scale: S.cap.length > 20 ? 2 : 3, colors: GOLD, align: 'center', depth: 2 });
      if (Math.floor(game.real * 2) % 2) { const touch = BZ.touchOnly, I = game.input; if (touch) text(g, 'TOUCH TO RETURN', W / 2, H - 30, '#ffffff', { align: 'center', scale: 2 }); else { const w = E.font.width('PRESS ANY BUTTON', { scale: 2 }); glyph(g, I, I.lastDevice === 'keyboard' ? 'start' : 'south', W / 2 - w / 2 - 16, H - 32, 11); text(g, 'PRESS ANY BUTTON', W / 2 + 0, H - 30, '#ffffff', { align: 'center', scale: 2 }); } }
    });
  }
};
function nextSeg() {
  ATT.seg = (ATT.seg + 1) % ATT_SEGS.length; ATT.t = 0; ATT.card = 2.2; const S = ATT_SEGS[ATT.seg];
  game.timeScale = 1;
  if (S.table) { M = BZ.M = null; MENUBG.park = 'kernel'; music('title'); return; }
  if (S.derby) { newDerby({ park: 'megadome', input: null, batter: TEAMS.COM.roster[0], time: 999, outs: 99, noClock: true, deal: E.rng(77 + ATT.seg) }); M.cheats.perfectContact = true; M.cheats.perfectAll = true; M.attractForce = [0, 1, 2, 3, 4, 5].map(i => ({ at: i, homer: i % 2 === 0, contact: 'perfect' })); ghostsFake(); }
  else {
    newMatch({ mode: 'attract', away: S.away, home: S.home, park: S.park, innings: 3, difficulty: 'allstar', ctrl: [[null, null], [null, null]], cheats: { noErrors: false }, shows: false, seed: 900 + ATT.seg });
    M.phase = 'halfStart'; M.phaseT = 0; halfStartSetup(); setPhase('walkUp'); M.cam = 'plate';
    if (S.setup) S.setup(M);
  }
  music(M.park.song); game.setView('broadcast'); game.weather = M.park.weather; CAMS.z = 1;
}
