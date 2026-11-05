/* ---- SETUP OF A MATCH: the court's arena, the four players of the two teams (slots 0–1 HOME, 2–3 AWAY), who is human
 * (each human's input is a device's: game.players, the one on the keyboard or a pad) and who is a CPU brain, the match
 * state and the ball. Exhibition, the Tour's stops, the hub's round, the attract mode and the tests all start here. ---- */
/** the two teams' rosters (their starters: the first two players of each team), by their ids */
const startersOf = teamId => rosterOf(teamId).slice(0, 2);

/** the match's players: four entities (the starters of each side) with their inputs and brains. opts: { home, away (team ids),
 *  humans: [{ slot, input }], difficulty (the CPU's), powerups, twists, qLen, court }. Returns the match's state. */
const setupMatch = (opts = {}) => {
  const court = COURTS[opts.court || 'skybox'];
  S.rng = E.rng(opts.seed || S.seed || 1); S.fxRng = E.rng((opts.seed || S.seed || 1) + 1000);
  S.court = court.id; S.courtDef = court;
  S.map = buildArena(court);
  S.teams = [teamDef(opts.home || court.home), teamDef(opts.away || 'breakers')];
  S.cheats = Object.assign({}, opts.cheats || {});
  S.powerupsOn = opts.powerups !== undefined ? !!opts.powerups : setting('powerups') !== 'Off';
  S.twistsOn = opts.twists !== undefined ? !!opts.twists : setting('twists') !== 'Off';
  S.players = [];
  const starts = [startersOf(S.teams[0].id), startersOf(S.teams[1].id)];
  for (let side = 0; side < 2; side++) for (let k = 0; k < 2; k++) {
    const slot = side * 2 + k, pid = starts[side][k].id, p = makePlayer(slot, pid, side);
    S.players.push(p);
  }
  const home = S.players.filter(p => p.side === HOME), away = S.players.filter(p => p.side === AWAY);
  // the starters' spots, facing the far baselines
  placePlayer(home[0], OX + 150, OY + 130, 0); placePlayer(home[1], OX + 150, OY + 160, 0);
  placePlayer(away[0], OX + CW - 150, OY + 130, PI); placePlayer(away[1], OX + CW - 150, OY + 160, PI);
  for (const h of opts.humans || []) { const p = S.players[h.slot]; if (!p) continue; p.human = true; p.input = h.input; p.device = h.input && h.input.lastDevice; }
  for (const p of S.players) { if (!p.human) p.brain = newBrain(p, S.rng() * .1); poseLayer(p.rig); }
  S.ball = newBall();
  S.powerups = []; S.puT = undefined; S.powerupsOn = S.powerupsOn && opts.powerups !== false;
  twistStart();
  S.lastHumans = opts.humans || [];
  S.match && (S.match.mode = opts.mode || 'exhibition');
  S.match = newMatch({ qLen: opts.qLen || tune('quarterLength'), mode: opts.mode || 'exhibition' });
  if (opts.difficulty !== undefined) S.tourShift = opts.tourShift || 0;
  S.seq = S.seq || 0;
  S.gameOver = false;
  tipOff();
  playSong(court.song);
  crowdStart();
  return S.match;
};
