/* ============ 40-attract: ten idle seconds on a menu, then the machine plays itself ============ */
EF.activity = since => {
  EF.pollPads(); const p = game.input.pointer && game.input.pointer(); if (p && (p[0] !== EF.lastPointer[0] || p[1] !== EF.lastPointer[1])) { const moved = Math.hypot(p[0] - EF.lastPointer[0], p[1] - EF.lastPointer[1]); EF.lastPointer = [p[0], p[1]]; if (moved > 3 && EF.lastPointerSeen) EF.lastInput = performance.now(); EF.lastPointerSeen = true; }
  if (game.players.some(q => q.anyPressed && q.anyPressed())) EF.lastInput = performance.now();
  return EF.lastInput > since;
};
EF.CAPTIONS = ['SLIDE TACKLES THAT SEND PEOPLE FLYING', 'THE CROWD IS YOUR POWER BAR', 'FILL IT, THEN UNLEASH EUROPHORIA', 'SUPER STRIKES THAT BEND THE BALL TO THEIR WILL', 'THE SAVE DUEL: TIME THE RINGS', 'DIVES, CARDS AND THE DREADED VAR', 'SET PIECES: CORNERS, FREE KICKS, PENALTIES', 'FIVE ROUNDS FROM KIPPERTON TO THE EUPHORIUM', 'ONE TO FOUR PLAYERS, ONLINE VIA AI HUB'];
EF.ATTRACT = [
  { home: 'kip', away: 'hoo', stadium: 'smokehouse', ref: 'haltwhistle', sp: [['freekick', 14], ['corner', 30]] },
  { home: 'rpp', away: 'svs', stadium: 'stahlpresse', ref: 'ironside', sp: [['penalty', 12], ['freekick', 28]] },
  { home: 'acl', away: 'opu', stadium: 'lucchetto', ref: 'severo', sp: [['corner', 12], ['penalty', 26]] },
  { home: 'kip', away: 'opu', stadium: 'euphorium', ref: 'haltwhistle', shootout: true }
];
EF.attractData = (i, from) => {
  const sc = EF.ATTRACT[i % EF.ATTRACT.length], done = {}; const startedAt = performance.now();
  return { attract: true, startedAt, mode: 'attract', home: sc.home, away: sc.away, stadium: sc.stadium, ref: sc.ref, humans: [], noResults: true, music: 'attract', seed: 40 + i * 13, cheat: { euphoria: 7 },
    rules: sc.shootout ? { shootoutOnly: true, needWinner: true, euphoria: false } : { halfSecs: 34, needWinner: false, noExtra: true, advantage: true }, noEvents: false, aiSpeed: 1.04,
    onUpdate(M, dt, scn) {
      if (sc.sp && M.mode === 'play' && !M.rules.training) for (const [type, at] of sc.sp) if (!done[type + at] && M.clock > at && M.clock < at + 4) { done[type + at] = 1; const side = M.ball.owner ? M.ball.owner.side : 0; if (type === 'penalty') { M.emit('penaltyAwarded', { side, who: 0, foul: 0 }); M.setPiece('penalty', side, 0, 0, {}); } else if (type === 'corner') M.setPiece('corner', side, 0, 0, { right: side === 0, low: M.ball.y > Pitch.CY }); else M.setPiece('freekick', side, Pitch.goalX(side) - (side ? -1 : 1) * 190, Pitch.CY + 40, { foulBy: 0 }); }
      for (const f of M.F) { f.stamina = 1; f.lowStamina = false; }
      if (M.mode === 'shootout' && M.shoot && M.shoot.phase === 'ready' && !M.shoot.aiGo) M.shoot.t = Math.max(M.shoot.t, 1.2);
    },
    onOver: M => game.go('match', EF.attractData(i + 1)),
    drawExtra(r, M, scn) { r.overlay(g => { const W = r.W, H = r.H; px.rect(g, 0, H - 30, W, 30, '#05060f'); const cap = EF.CAPTIONS[Math.floor(game.time / 5) % EF.CAPTIONS.length]; TXT(g, cap, W / 2, H - 25, '#ffe7a8', { align: 'center' }); if (Math.floor(game.time * 1.6) % 2) TXT(g, 'PRESS ANY BUTTON', W / 2, H - 14, '#ffffff', { align: 'center', scale: 1 }); TXT(g, 'EUROPHORIA FOOTBALL', W - 6, H - 40 + 22, '#8a9ac8', { font: 'tiny', align: 'right' }); }); }
  };
};
EF.scenes.attract = { view: 'broadcast', input: EF.KEYS, res: 'ps1', touch: [], pausable: false, enter(d) { game.go('match', EF.attractData(((EF.attractIdx = (EF.attractIdx || 0) + 1) - 1) % EF.ATTRACT.length), { fade: 0 }); }, update() {}, draw() {} };
