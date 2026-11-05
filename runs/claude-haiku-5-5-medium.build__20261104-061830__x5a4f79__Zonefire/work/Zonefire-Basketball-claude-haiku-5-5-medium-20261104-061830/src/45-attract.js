/* ---- ATTRACT MODE (plan §13): after ten seconds without input on a title or menu screen, a looping demo of five real
 * segments: the CPU plays both sides, cheating freely (infinite turbo, a wide dunk range, frequent power-ups), and a
 * script forces each feature so every one shows. Any input leaves at once. ---- */
const ATTRACT_SEGMENTS = [
  { court: 'skybox', home: 'hightops', away: 'breakers', seconds: 35, score: [0, 0], quarter: 1, cheats: { infTurbo: true, dunkRange: 60 }, script: [[0, 'tip'], [6, 'twist', 'jackpot'], [12, 'command', 0, 'oop'], [18, 'spin', 0]] },
  { court: 'pier', home: 'breakers', away: 'crushers', seconds: 30, score: [0, 0], quarter: 1, cheats: { infTurbo: true }, script: [[5, 'twist', 'wind'], [9, 'spawn', 'rocket'], [14, 'spawn', 'laser']] },
  { court: 'scrapyard', home: 'crushers', away: 'magma', seconds: 30, score: [0, 0], quarter: 2, cheats: { infTurbo: true }, script: [[4, 'twist', 'slick'], [10, 'bomb']] },
  { court: 'caldera', home: 'magma', away: 'hightops', seconds: 35, score: [0, 0], quarter: 2, cheats: { infTurbo: true }, script: [[6, 'twist', 'eruption'], [14, 'vent']] },
  { court: 'dome', home: 'blambots', away: 'allstars', seconds: 35, score: [0, 0], quarter: 3, cheats: { infTurbo: true, boss: true }, script: [[4, 'nova', 0], [12, 'overclock'], [20, 'quake']] }
];
S.attract = { seg: 0, t: 0, card: 0, showing: false, cardT: 0 };
/** a script's action: the features the segment shows, forced on time */
const attractAct = (step) => {
  const [, act, a, b] = step;
  if (act === 'tip') return;
  if (act === 'twist') return forceTwist(a);
  if (act === 'command') { const p = S.players[a]; if (p && p.brain) { p.attractOop = true; } return; }
  if (act === 'spin') { const p = S.players[a]; if (p && p.hasBall) spinMove(p); return; }
  if (act === 'spawn') return spawnPowerupNamed(a);
  if (act === 'bomb') { const p = S.players.find(q => q.side === S.match.poss && q.hasBall); if (p) p.bomb = true; return; }
  if (act === 'nova') { const p = S.players[a]; if (p && !p.nova) igniteNova(p); return; }
  if (act === 'overclock') { return overclockOn && overclockOn(); }
  if (act === 'vent') { return ventLaunch && ventLaunch(); }
  if (act === 'quake') { return; }
};
const attractStart = (idx) => {
  const seg = ATTRACT_SEGMENTS[idx];
  S.attract.seg = idx; S.attract.t = 0; S.attract.fired = [];
  S.cheats = Object.assign({}, seg.cheats);
  S.attractCheats = seg.cheats;
  setupMatch({ court: seg.court, home: seg.home, away: seg.away, qLen: 60, humans: [], powerups: true, twists: true, mode: 'attract', difficulty: 'BLAM' });
  S.match.quarter = seg.quarter; S.match.score = seg.score.slice();
  S.tourShift = 0;
  S.attractOn = true;
};
const attractCard = { t: 0 };
scenes.attract = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'attract'; S.attract.card = 0; S.attract.cardT = 0; S.attractOn = false; S.attract.seg = S.attract.seg || 0; attractCard.t = 0; A.music(null); },
  update(dt) {
    if (anyPressed('confirm') || anyPressed('start') || anyPressed('cancel') || anyPressed('pause') || anyPressed('up') || anyPressed('down') || anyPressed('left') || anyPressed('right') || (game.input.clicked && game.input.clicked()) || (game.players.some(I => I && I.anyPressed && I.anyPressed()))) {
      anyConsume('confirm'); S.attractOn = false; S.idle = 0; game.go('title', null, { fade: .2 }); return;
    }
    if (S.attract.card > 0) {
      S.attract.cardT += dt;
      if (S.attract.card === 1 && S.attract.cardT > 2) { S.attract.card = 0; attractStart(S.attract.seg); }
      else if (S.attract.card === 2 && S.attract.cardT > 6) { S.attract.card = 0; S.attract.seg = 0; S.attract.t = 0; game.go('title', null, { fade: .3 }); }
      return;
    }
    if (!S.attractOn) { attractStart(S.attract.seg); }
    S.attract.t += dt;
    const seg = ATTRACT_SEGMENTS[S.attract.seg];
    for (const st of seg.script) { if (S.attract.fired.includes(st) || S.attract.t < st[0]) continue; S.attract.fired.push(st); attractAct(st); }
    // a cheat's effects each step: infinite turbo for everyone; the dunk range for the demo
    if (S.attractCheats && S.attractCheats.infTurbo) for (const p of S.players) p.turbo = 1;
    matchStep(dt); cameraStep(dt); matchFrame(dt);
    if (S.match.over || S.attract.t >= seg.seconds) {
      S.attract.seg++;
      S.attractOn = false;
      if (S.attract.seg >= ATTRACT_SEGMENTS.length) { S.attract.card = 2; S.attract.cardT = 0; }
      else { S.attract.card = 1; S.attract.cardT = 0; }
    }
  },
  draw(r) {
    if (S.attract.card === 1) { r.sky(['#05040a', '#1d1240', '#3a1a5a']); r.overlay(g => E.font.title(g, 'TONIGHT ON CHANNEL BLAM', r.W / 2, r.H * .42, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a'] })); return; }
    if (S.attract.card === 2) { r.sky(['#05040a', '#1d1240', '#3a1a5a']); r.overlay(g => { screenTitle(g, 'HALL OF BLAM', 'THE TOP TEN TOUR SCORES', r.W); }); return; }
    drawCourt(r, S.courtDef);
    hudDraw(r);
    r.overlay(g => { E.ui.box(g, r.W / 2 - 150, r.H - 90, 300, 22, { bg: ['#1a1030', '#0c0618'], alpha: .9 }); E.font.text(g, 'CHANNEL BLAM DEMO · PRESS ANY BUTTON', r.W / 2, r.H - 84, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
  }
};
/** the forced twist and the power-up spawns (also the dev panel's buttons) */
const forceTwist = kind => { if (kind === 'wind') { S.twist.wind = 1; S.twist.windT = 4; S.twist.windDir = 1; } else if (kind === 'jackpot') { S.twist.jackpot = { x: CENTRE().x + 60, y: CENTRE().y, t: 0 }; } else if (kind === 'slick') { S.twist.slicks = [{ x: CENTRE().x + 60, y: CENTRE().y + 40, r: 28 }]; } else if (kind === 'eruption') { S.twist.erupt = 0; } };
const spawnPowerupNamed = id => { const pu = get('powerup', id); if (pu) S.powerups.push({ id, x: CENTRE().x + 40, y: CENTRE().y - 30, t: 0 }); };
