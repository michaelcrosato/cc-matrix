/* ---- THE PLAYERS (plan §6.4–6.5, §6.14, §7.4): one entity per slot (0–1 HOME, 2–3 AWAY). A player is a body on the arena
 * (E.Body, radius 6), a dressed rig, the command it reads this step (from its input source: a human, a CPU brain, the
 * network or a script), its turbo, its juice, its heat streak, and its state. Ratings scale every effect (§6.4). ---- */
const SLOTS = 4;
const HOME = 0, AWAY = 1;
const emptyCmd = () => ({ move: [0, 0], shoot: { down: false, pressed: false, released: false }, pass: { pressed: false }, turbo: { down: false },
  shove: { pressed: false }, oop: { pressed: false }, taunt: { pressed: false } });

/** a rig dressed for a player: the team's colors (jersey, trim, shorts, sneakers, socks), the player's build and hair */
const dressRig = (def, team) => {
  const r = def.rig || {};
  const colors = {
    skin: r.skin || '#c89070', hair: r.hairColor || '#1a1a1a', cloth: team.colors.jersey, trim: team.colors.trim,
    pants: team.colors.shorts, boot: team.colors.sneaker, glove: team.colors.trim, belt: team.colors.shorts, sock: team.colors.sock
  };
  if (r.robot) { colors.skin = r.skin || '#c8d0dc'; colors.cloth = team.colors.jersey; colors.metal = '#c8d0dc'; colors.plate = '#8a94a8'; colors.eye = r.visor; }
  const opts = { size: r.size || 1.7, build: r.build || 'heroic', weapon: null, outfit: 'shirt', sleeves: 'none', colors, shorts: { len: .55, sock: team.colors.sock, sockLen: .35 } };
  if (r.hair) opts.hair = r.hair;
  if (r.hat) opts.hat = r.hat;
  if (r.cap) opts.hat = { style: 'cap', color: r.cap };
  if (r.legs) opts.legs = r.legs;
  if (r.hunch) opts.hunch = r.hunch;
  return new E.Humanoid(opts);
};

/** a player's entity in its slot. team: the side's team id; def: the player's data. */
const makePlayer = (slot, defId, side) => {
  const def = playerDef(defId), team = teamDef(def.team);
  const body = new E.Body({ x: 0, y: 0, r: 6, friction: 0, bounce: 0, gravity: tune('playerGravity') });
  return {
    slot, side, id: defId, def, team, name: def.name, number: def.number, size: def.rig.size || 1.7,
    body, rig: dressRig(def, team), cmd: emptyCmd(), input: null, brain: null, human: false, device: null,
    face: side === HOME ? 0 : PI, state: 'run', stateT: 0, turbo: 1, juice: 1, heat: 0, nova: false, novaT: 0,
    pu: null, pu2: null, stats: { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, dunks: 0, reb: 0, ast: 0, stl: 0, blk: 0, knock: 0, shatter: 0, novas: 0 },
    cool: { shove: 0, steal: 0, spin: 0, block: 0, pass: 0 }, onCourt: true, bench: false, shot: null, dunk: null, knocked: 0, hang: null,
    z: 0, vz: 0, air: false, lastTouch: 0, lastStep: 0, dribbleT: 0, dribbleHand: 1, taunt: null, celebrate: null, shove: null, spinT: 0,
    fumble: 0, reboot: 0, dizzy: 0, glue: false, goldBall: false, rocket: 0, laser: 0, moon: 0, bomb: false, lx: 0, ly: 0
  };
};

/** place a player's body at a world point (feet), facing an angle */
const placePlayer = (p, x, y, face) => { p.body.x = x; p.body.y = y; p.body.z = 0; p.body.vx = p.body.vy = p.body.vz = 0; p.z = 0; if (face !== undefined) p.face = face; p.state = 'run'; p.stateT = 0; p.shot = null; p.dunk = null; p.hang = null; };

/** a player's speed right now: ZOOM (§6.4), juice (§6.14), turbo, power-ups and Supernova (§6.5, §6.12, §6.15) */
const playerSpeed = p => {
  let s = tune('runSpeed') * (.86 + .028 * p.def.ratings.zoom) * juiceFactor(p);
  if (p.turbo > 0 && p.cmd.turbo.down && p.turboOn) s *= tune('turboMult');
  if (p.rocket > 0) s *= 1.4;
  if (p.nova && p.turbo > 0 && p.cmd.turbo.down) s *= 1.05;
  return s;
};
/** the juice factor (§6.14): 0.85 + 0.15 × juice multiplies the ratings' effects */
const juiceFactor = p => .85 + .15 * p.juice;
/** a rating's value (1..10) of a player, with a Blambot's or a power-up's bonus where it applies */
const rate = (p, key) => p.def.ratings[key] || 5;

/** the arena's clamp: the invisible walls, 24 outside the lines (plan §6.1) */
const clampToArena = p => {
  p.body.x = clamp(p.body.x, PLAY_X[0] + 4, PLAY_X[1] - 4);
  p.body.y = clamp(p.body.y, PLAY_Y[0] + 4, PLAY_Y[1] - 4);
};

/** the player's turbo (§6.5): held and moving drains; otherwise it refills after the delay. Supernova is unlimited. */
const turboStep = (p, dt, moving) => {
  if (p.nova || (S.cheats && S.cheats.infTurbo)) { p.turbo = 1; p.turboOn = !!(p.cmd.turbo.down && moving); return; }   // (Supernova and the INFINITE TURBO code)
  const want = !!(p.cmd.turbo.down && moving && p.turbo > 0);
  p.turboOn = want;
  if (want) { p.turbo = Math.max(0, p.turbo - tune('turboDrain') * dt * (p.rocket > 0 ? .8 : 1)); p.idle = 0; }
  else { p.idle = (p.idle || 0) + dt; if (p.idle > tune('turboRefillDelay')) p.turbo = Math.min(1, p.turbo + tune('turboRefill') * dt * (p.rocket > 0 ? 2 : 1)); }
};

/** a player's power-ups' clocks (§6.15): they count down, and end themselves */
const powerTick = (p, dt) => {
  if (p.rocket > 0) p.rocket = Math.max(0, p.rocket - dt);
  if (p.moon > 0) p.moon = Math.max(0, p.moon - dt);
  if (p.laser > 0) p.laser = Math.max(0, p.laser - dt);
  if (p.glue > 0) p.glue = Math.max(0, p.glue - dt);
  if (p.goldBall > 0) p.goldBall = Math.max(0, p.goldBall - dt);
  if (p.reboot > 0) p.reboot = Math.max(0, p.reboot - dt);
  if (p.dizzy > 0) p.dizzy = Math.max(0, p.dizzy - dt);
  for (const k of ['shove', 'steal', 'spin', 'block', 'pass']) if (p.cool[k] > 0) p.cool[k] = Math.max(0, p.cool[k] - dt);
};

/** a body's knockdown (§6.10): it goes down for a time; the rig lies, then gets up on its own */
const knockDown = (p, secs) => {
  p.knocked = Math.max(p.knocked, secs); p.state = 'knocked'; p.stateT = 0; p.shot = null; p.dunk = null;
  p.juice = Math.max(0, p.juice - .06); p.stats.knock++;
  if (p.bomb) p.bomb = false;
};
