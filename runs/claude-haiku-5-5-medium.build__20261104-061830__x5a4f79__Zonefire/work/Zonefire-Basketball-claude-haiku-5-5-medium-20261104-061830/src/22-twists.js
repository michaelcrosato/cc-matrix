/* ---- THE TWISTS (plan §10.1, §6.15): each court's own hazard, the Jackpot Spot, the power-ups' spawns and pickups, the
 * Blambots' overclock and reboot, and the Dome's pyro. Every timer is tuned by hazardInterval; every effect is a rule
 * the match reads (the shot's chance, the ball's push, the player's speed, a knockdown), with its own drawing. ---- */
const TWIST_OF = { skybox: 'jackpot', pier: 'wind', scrapyard: 'slick', caldera: 'eruption', dome: 'boss' };
const twistOf = () => (COURTS[S.court] && COURTS[S.court].twist) || 'none';
/** the twists this match has: the court's own, and the Jackpot Spot on every court when the setting says so */
const twistsOn = () => S.twistsOn !== false && !S.cheats.noTwists;

/** a match's twists at its start: the Jackpot's first place, the slicks, the timers (§10.1) */
const twistStart = () => {
  const k = twistOf(), c = CENTRE(), R = S.rng;
  S.twist = { kind: k, wind: 0, windT: 0, gustNext: 4 + R() * 6, slicks: [], erupt: 0, eruptNext: 12 + R() * 10, vents: [{ x: OX + 200, y: OY + 60, t: 0, on: false }, { x: OX + 440, y: OY + 228, t: 2.5, on: false }], bombs: [], reboot: 0, overclock: null, jackpot: null, jackT: 0, bots: {} };
  if (k === 'slick') { S.twist.slicks = [0, 1, 2].map(() => { const x = OX + 120 + R() * 400, y = OY + 60 + R() * 170; return { x, y, r: 20 + R() * 16 }; }); }
  if (k === 'jackpot' || setting('jackpot') === 'On') { const rim = R() < .5 ? 0 : 1; S.twist.jackpot = { x: RIMW[rim].x + (rim ? -1 : 1) * (60 + R() * 60), y: RIMW[rim].y + (R() - .5) * 60, t: 0, life: 20, rim }; }
  if (k === 'boss') S.twist.overclock = null;
};
/** the twists' step: the wind's gusts, the eruption's telegraphs, the vents' puffs, the jackpot's moves, the boss */
const twistStep = dt => {
  const T = S.twist; if (!T || !S.match || S.match.over) return;
  if (!twistsOn()) return;
  const H = tune('hazardInterval');
  if (T.kind === 'wind') {
    T.gustNext -= dt;
    if (T.gustNext <= 0 && T.windT <= 0) { T.windT = 4; T.windDir = S.rng() < .5 ? 1 : -1; T.gustNext = (15 + S.rng() * 10) * H; emit('twist', { kind: 'gust' }); caption('gust', {}, 'DEE DEE'); }
    if (T.windT > 0) { T.windT -= dt; T.wind = T.windDir * Math.min(1, T.windT > 3.5 ? (4 - T.windT) * 2 : 1) * (T.windT < 1 ? T.windT : 1); } else T.wind = 0;
  }
  if (T.kind === 'eruption') {
    T.eruptNext -= dt;
    if (T.eruptNext <= 0) { T.eruptNext = (25 + S.rng() * 10) * H; T.erupt = 1.2; emit('twist', { kind: 'eruption' }); caption('eruption', {}, 'VINNIE'); T.bombs = [{ x: S.ball.x, y: S.ball.y, t: -1.2 }, { x: CENTRE().x + (S.rng() - .5) * 200, y: CENTRE().y + (S.rng() - .5) * 120, t: -1.2 }, { x: CENTRE().x + (S.rng() - .5) * 200, y: CENTRE().y + (S.rng() - .5) * 120, t: -1.2 }]; }
    if (T.erupt > 0) T.erupt -= dt;
    for (const b of T.bombs || []) { b.t += dt; if (b.t >= 0 && !b.hit) { b.hit = true; for (const p of S.players) if (p.onCourt && Math.hypot(p.body.x - b.x, p.body.y - b.y) < 22) { knockDown(p, .8); if (S.ball.owner === p) { releaseLoose(S.ball); S.ball.vz = 60; S.ball.state = 'loose'; } } emit('bomb', { x: b.x, y: b.y }); } }
    T.bombs = (T.bombs || []).filter(b => b.t < 1.4);
    for (const v of T.vents) { v.t -= dt; if (v.t <= 0) { v.on = !v.on; v.t = v.on ? 2 : 3; } }
  }
  if (T.kind === 'jackpot' || T.jackpot) {
    if (T.jackpot) { T.jackpot.t += dt; if (T.jackpot.t >= T.jackpot.life) { const rim = T.jackpot.rim; T.jackpot = { x: RIMW[rim].x + (rim ? -1 : 1) * (60 + S.rng() * 60), y: RIMW[rim].y + (S.rng() - .5) * 60, t: 0, life: 20, rim }; } }
  }
  if (T.kind === 'boss') {
    const bots = S.players.filter(p => p.team && p.team.boss && p.onCourt);
    if (bots.length) {
      const q4 = S.match.quarter === 4 && !T.oc4;
      const trailing = S.match.quarter === 3 && (S.match.score[0] - S.match.score[1] >= 8 || S.match.score[1] - S.match.score[0] >= 8) && !T.oc3;
      if (q4 || trailing) { if (q4) T.oc4 = true; else T.oc3 = true; overclockOn(); }
      if (T.overclock) { T.overclock.t -= dt; if (T.overclock.t <= 0) { T.overclock = null; for (const p of bots) endNova(p, 'overclock'); } }
    }
    for (const p of bots) { if (p.reboot > 0) continue; }
  }
};
/** the boss's overclock (§10.1): both bots go Supernova for 30 s; the overclock music layer is the music's */
const overclockOn = () => { const bots = S.players.filter(p => p.team && p.team.boss && p.onCourt); S.twist.overclock = { t: 30 }; for (const p of bots) { if (!p.nova) igniteNova(p); p.novaT = 0; } emit('twist', { kind: 'overclock' }); caption('boss', {}, 'DEE DEE'); banner('OVERCLOCK!', 'SUPERNOVA'); return true; };
/** a bot knocked down twice within ten seconds short-circuits for three seconds (SYSTEM REBOOT) */
const bootKnock = p => {
  if (!p.team || !p.team.boss || S.netReplay) return;   // (a bot's reboot)
  const now = S.match.t, hist = (S.twist.bots[p.slot] = (S.twist.bots[p.slot] || []).filter(t => now - t < 10));
  hist.push(now);
  if (hist.length >= 2) { hist.length = 0; p.reboot = 3; knockDown(p, 3); emit('reboot', { slot: p.slot }); banner('SYSTEM REBOOT!', 'SHATTERED'); caption('reboot', { TEAM: p.team.name }, 'DEE DEE'); }
};
on('knockdown', ev => { const p = S.players[ev.slot]; if (p) bootKnock(p); });
/** the vent launch: a handler on a puffing vent in its offensive half, pressing shoot with turbo, is launched into the VOLCANO
 * LAUNCH dunk (§10.1); a defender on a puffing vent jumps a SUPER BLOCK */
const ventAt = p => (S.twist.vents || []).find(v => v.on && Math.hypot(p.body.x - v.x, p.body.y - v.y) < 40);
const ventLaunch = () => { const p = S.players.find(q => q.onCourt && q.hasBall && ventAt(q)); if (!p) return false; startDunk(p, { kind: get('dunk', 'volcano'), vent: true }); return true; };

/** the Jackpot Spot's rule for a shot: the shooter's feet in the ring at release (a made jump shot scores +2) */
const jackpotHit = p => { const J = S.twist.jackpot; return !!J && Math.hypot(p.body.x - J.x, p.body.y - J.y) < 16; };

/* ---- the power-ups: the spawner (one on the floor at a time, every powerupInterval ± 6 s, lasting 10 s) and the pickup ---- */
const powerupStep = dt => {
  if (!S.powerupsOn || !S.match || S.match.over || S.match.phase !== 'live') return;
  if (S.cheats.powerEvery5 && !S.powerups.length) S.puT = Math.max(S.puT || 0, 5);
  S.puT = (S.puT === undefined ? tune('powerupInterval') : S.puT) - dt;
  for (const q of S.powerups) { q.t += dt; if (q.t > 10) q.gone = true; }
  S.powerups = S.powerups.filter(q => !q.gone);
  if (S.puT <= 0 && S.powerups.length < 1) {
    S.puT = tune('powerupInterval') + (S.rng() - .5) * 12;
    const list = all('powerup'), pu = list[(S.rng() * list.length) | 0], x = CENTRE().x + (S.rng() - .5) * 320, y = CENTRE().y + (S.rng() - .5) * 150;
    S.powerups.push({ id: pu.id, x, y, t: 0 }); emit('powerupSpawn', { id: pu.id, x, y });
  }
  for (const q of S.powerups) for (const p of S.players) {
    if (!p.onCourt || Math.hypot(p.body.x - q.x, p.body.y - q.y) > 12) continue;
    const pu = get('powerup', q.id);
    if (p.pu && p.pu.id) { const old = get('powerup', p.pu.id); if (old && old.remove) old.remove(p); }
    pu.apply(p); p.pu = { id: pu.id, icon: pu.icon, color: pu.color, t: pu.seconds };
    q.gone = true; emit('powerupPick', { slot: p.slot, id: pu.id });
    banner(pu.name, 'PICKPOCKET'); caption(PU_LINE[pu.id], { NAME: p.name }, 'VINNIE');
  }
  for (const p of S.players) if (p.pu) { p.pu.t -= dt; if (p.pu.t <= 0) { const old = get('powerup', p.pu.id); if (old && old.remove) old.remove(p); p.pu = null; emit('powerupEnd', { slot: p.slot }); } }
};
