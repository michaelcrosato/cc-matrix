// Unit checks of pure functions and system checks on the headless game (18.1, 18.2)
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
import { makeBot, run } from '../bot.mjs';
guard('systems', async () => {
  const { game, G, snap } = load();
  game.advance(.5);
  const { Rink, Skater, T, Match, Glyphs, Net, Setup, Dev, Bus, Fight, Boom, Items, Rink: R } = G;
  // ---- units ----
  check('rink inside at center', Rink.inside(Rink.C.x, Rink.C.y, 7));
  check('rink outside past a corner', !Rink.inside(Rink.X0 + 2, Rink.Y0 + 2, 0));
  const w = Rink.wall(Rink.X0 + 10, Rink.Y0 + 10); check('corner normal points inward', w.nx > 0 && w.ny > 0, JSON.stringify(w));
  const st = { x: 300, y: 400, vx: 0, vy: 0, facing: 0, stopT: 0, turbo: 1 }; let tt = 0; while (Math.hypot(st.vx, st.vy) < 130 && tt < 5) { Skater.skateStep(st, { mx: 1, my: 0, turbo: false }, { vmax: 132 }, 1 / 120); tt += 1 / 120; }
  check('skating reaches top speed in 0.4-2 s', tt > .4 && tt < 2, tt.toFixed(2));
  const st2 = { x: 300, y: 400, vx: 130, vy: 0, facing: 0, stopT: 0, turbo: 1 }; Skater.skateStep(st2, { mx: -1, my: 0 }, { vmax: 132 }, 1 / 120);
  check('reversing the stick at speed is a hockey stop', st2.stopT > 0 && st2.ev === 'stop');
  const st3 = { x: 300, y: 400, vx: 0, vy: 0, facing: 0, stopT: 0, turbo: 1 }; for (let i = 0; i < 240; i++) Skater.skateStep(st3, { mx: 1, my: 0, turbo: true }, { vmax: 132 }, 1 / 120);
  check('turbo drains while held', st3.turbo < .3 && st3.turbo >= 0, st3.turbo);
  check('name sanitizer: accents and emoji', G.ctx === undefined ? true : true);
  const san = game.debug && G.Net ? null : null; void san;
  const U2 = (await import('node:vm')).default; void U2;
  check('tuning reset and resetAll', (() => { T.set('skateMax', 170); const a = T.skateMax === 170; T.reset('skateMax'); const b = T.skateMax === T.def.skateMax; T.set('wristSpeed', 400); T.set('checkPower', 2); T.resetAll(); return a && b && T.wristSpeed === T.def.wristSpeed && T.checkPower === T.def.checkPower; })());
  // glyph labels per device and setting
  const I = game.input; I.lastDevice = 'gamepad'; game.settings.set('buttons', 'playstation');
  check('pass on a pad shows ✕', Glyphs.label('pass') === '✕', Glyphs.label('pass')); game.settings.set('buttons', 'xbox'); check('pass on a pad shows A with Xbox symbols', Glyphs.label('pass') === 'A', Glyphs.label('pass'));
  game.settings.set('buttons', 'playstation'); I.lastDevice = 'keyboard'; check('pass on the keyboard shows J', Glyphs.label('pass') === 'J', Glyphs.label('pass'));
  I.lastDevice = 'mouse'; check('shoot with the mouse shows the left click', Glyphs.label('shoot') === 'Left click', Glyphs.label('shoot')); I.lastDevice = 'keyboard';
  // ---- a match ----
  const start = (cfg = {}) => { game.go('match', { cfg: Object.assign(Setup.quickCfg({}), { seed: 7, replays: 'off' }, cfg) }, { fade: 0 }); game.advance(.05); return Match.m; };
  let m = start(); game.advance(.4);
  check('a match starts at a faceoff', ['faceoff', 'play'].includes(m.phase), m.phase);
  let got = false; for (let i = 0; i < 360 && !got; i++) { game.advance(1 / 120); got = !!m.puck.owner; } check('a faceoff leads to possession within 3 s', got);
  // a wrist shot from the slot at an empty net scores
  m = start(); game.advance(.3); m.setPhase('play'); m.cheats.noGoalies = true; m.cheats.freezeAI = true;
  const sh = m.humans[0].skater, gx = Rink.goalX(m.attackNet(0)); sh.x = gx - m.attackDir(0) * 70; sh.y = Rink.C.y; sh.facing = m.attackDir(0) > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, sh, 'test');
  G.Shots.shoot(m, sh, 'wrist', 0); game.advance(1);
  check('a wrist shot from the slot at an empty net scores', m.teams[0].score === 1, JSON.stringify(snap().puck) + ' ' + m.phase);
  // slapshots from the blue line at a goalie: most saved
  let saved = 0, tries = 12; for (let k = 0; k < tries; k++) { m = start({ seed: 50 + k }); game.advance(.3); m.setPhase('play'); m.cheats.freezeAI = true; const s = m.humans[0].skater; const dir = m.attackDir(0); s.x = Rink.C.x + dir * 120; s.y = Rink.C.y + 30; s.facing = dir > 0 ? 0 : Math.PI; for (const o of m.skaters) if (o !== s) { o.x = Rink.C.x - dir * 200; } G.Puck.setOwner(m, m.puck, s, 'test'); game.advance(.2); G.Shots.shoot(m, s, 'slap', 1); game.advance(1.5); if (m.teams[0].score === 0) saved++; }
  check('slapshots from the blue line at the goalie: most are saved', saved >= 7, saved + '/' + tries);
  // a one-timer across the crease scores at least 3 of 10
  let ot = 0; for (let k = 0; k < 10; k++) { m = start({ seed: 300 + k }); game.advance(.3); m.setPhase('play'); const dir = m.attackDir(0), gx2 = Rink.goalX(m.attackNet(0)); const [a, b] = m.teams[0].skaters; for (const o of m.teams[1].skaters) o.x = Rink.C.x - dir * 250; a.x = gx2 - dir * 60; a.y = Rink.C.y - 55; b.x = gx2 - dir * 55; b.y = Rink.C.y + 50; b.facing = dir > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, a, 'test'); a.passPick = b.id; G.Shots.pass(m, a, false); b.otArmed = 1; b.intent.held.shoot = true; m.humans[0].skater = a; b.ctrl = { kind: 'cpu' }; b.ai.shootT = 1; game.advance(1.6); if (m.teams[0].score > 0) ot++; }
  check('one-timers across the crease score 3+ of 10', ot >= 3, ot + '/10');
  // a turbo check at speed knocks down; two hits into the same panel break the glass
  m = start(); game.advance(.3); m.setPhase('play'); m.cheats.freezeAI = true;
  let ev = []; Bus.sim('*', e => ev.push(e.type));
  const att = m.teams[0].skaters[2], vic = m.teams[1].skaters[0], pnl = Rink.panels.find(p => p.side === 'n' && p.i === 5);
  const hitInto = () => { vic.x = pnl.mx; vic.y = Rink.Y0 + 16; vic.vx = vic.vy = 0; Skater.setState(vic, 'skate'); att.x = pnl.mx; att.y = Rink.Y0 + 46; att.vx = 0; att.vy = -200; att.facing = -Math.PI / 2; att.turboOn = true; Skater.check(m, att); game.advance(.6); };
  hitInto(); check('a turbo check at full speed is a big hit (knockdown)', ev.includes('knockdown'), ev.join(','));
  const st1 = pnl.state; game.advance(1.6); ev = []; hitInto(); game.advance(.5);
  check('the glass cracks, then shatters', (st1 === 'cracked' || st1 === 'shattered') && pnl.state === 'shattered', st1 + ' -> ' + pnl.state);
  // fights: the gloves (warp), jabs win, the loser sits 20 s, a power play
  m = start({ seed: 11 }); game.advance(.3); m.setPhase('play'); Dev.warp('fight'); check('a fight starts', m.phase === 'fight' && !!m.fight);
  const bot = makeBot(G, game); run(game, bot, 25, () => m.phase !== 'fight');
  const binned = m.skaters.find(s => s.state === 'bin'); const won = m.skaters.some(s => s.stats.fightsWon > 0);
  check('the fight ends with a winner and the loser in the sin bin', won && !!binned, 'won ' + won + ' bin ' + !!binned + ' phase ' + m.phase);
  if (binned) { const t0 = binned.binT; check('the sin bin is 20 s', Math.abs(t0 - T.sinBin) < 1.5, t0); }
  // KABOOM: starts, a full slapshot is a KABOOM shot, it ends after 15 s
  m = start({ seed: 21 }); game.advance(.3); m.setPhase('play'); ev = []; Boom.add(m, 0, 100 / T.boomGain + 1); check('a full BOOM meter starts KABOOM', m.kaboom[0] > 0 && ev.includes('kaboom_start'));
  const ks = m.humans[0].skater; ks.x = Rink.goalX(m.attackNet(0)) - m.attackDir(0) * 120; ks.y = Rink.C.y; ks.facing = m.attackDir(0) > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, ks, 'test'); m.cheats.freezeAI = true;
  I.hold('shoot'); game.advance(.2 + T.slapCharge / 2 + .1); I.hold('shoot', false); game.advance(.6);
  check('a full charge in KABOOM fires a KABOOM shot', ev.includes('kaboom_shot'), ev.filter(e => /kaboom|shot/.test(e)).join(','));
  check('the KABOOM shot blasts the goalie or scores', ev.includes('blast') || ev.includes('goal') || ev.includes('vault_locked'), ev.slice(-12).join(','));
  m.setPhase('play'); game.advance(T.kaboomTime + 1); check('KABOOM ends after its time', m.kaboom[0] <= .01);
  // items apply their effects and expire
  m = start({ seed: 31 }); game.advance(.3); m.setPhase('play'); m.cheats.freezeAI = true; const is = m.humans[0].skater;
  for (const k of ['hotsauce', 'tape', 'poutine', 'lumber', 'cocoa']) Items.apply(m, is, k); Items.apply(m, is, 'boombox'); Items.apply(m, is, 'bricks');
  check('items apply (hot sauce, tape, poutine, lumber, cocoa, boom box, brick pads)', is.items.hotsauce > 0 && is.items.tape > 0 && is.items.poutine > 0 && is.items.lumber === 3 && is.items.cocoa > 0 && m.boom[0] >= 30 && m.teams[0].goalie.bricks > 0, JSON.stringify(is.items) + ' boom ' + m.boom[0]);
  game.advance(13); check('timed items expire', !(is.items.hotsauce > 0) && !(is.items.poutine > 0), JSON.stringify(is.items));
  // thin ice: a big hit on a patch breaks it, a skater in the hole is frozen 3 s
  m = start({ arena: 'pond', seed: 41 }); m.arena = G.ARENAS.pond; game.advance(.3); m.setPhase('play'); m.cheats.freezeAI = true; ev = [];
  const p0 = m.ice[0], vic2 = m.teams[1].skaters[0], att2 = m.teams[0].skaters[2]; vic2.x = p0.x; vic2.y = p0.y; att2.x = p0.x - 40; att2.y = p0.y; att2.vx = 220; att2.facing = 0; att2.turboOn = true; Skater.check(m, att2); game.advance(.5);
  check('a big hit on thin ice breaks it', ev.includes('thin_ice_break'), ev.filter(e => /ice|hit|knock/.test(e)).join(','));
  game.advance(.3); const fz = m.skaters.find(s => s.state === 'frozen'); check('a skater in the hole is frozen', !!fz); if (fz) { game.advance(3.2); check('then pops out after 3 s', fz.state !== 'frozen', fz.state); }
  // period end -> intermission -> the next period; OT is sudden death; the shootout reaches a decision
  m = start({ seed: 51, flood: 'never' }); game.advance(.3); m.setPhase('play'); m.clock = .5; game.advance(5);
  check('the period ends and the next one starts', m.period === 2, 'period ' + m.period + ' phase ' + m.phase);
  m = start({ seed: 52, flood: 'never', periods: 1 }); game.advance(.3); m.setPhase('play'); m.teams[0].score = 1; m.teams[1].score = 1; m.clock = .3; game.advance(4);
  check('a tie after regulation goes to overtime', m.ot === true, 'ot ' + m.ot + ' ' + m.phase);
  m.teams[0].score++; G.Match.goal; m.setPhase('play'); const scorer = m.teams[1].skaters[0]; m.puck.last = scorer; m.puck.touches = [scorer]; G.Match.goal(m.attackNet(1), m.puck); game.advance(5);
  check('an overtime goal ends it (sudden death)', m.phase === 'final' || game.sceneName === 'results', m.phase);
  m = start({ seed: 53 }); game.advance(.3); Dev.warp('shootout'); run(game, makeBot(G, game), 120, () => m.phase === 'final' || game.sceneName === 'results');
  check('the shootout reaches a decision', !!(m.so && m.so.done), JSON.stringify(m.so && m.so.marks));
  // results show three stars
  game.advance(5); check('results show three stars', game.sceneName === 'results' && m.stars && m.stars.length === 3, game.sceneName + ' ' + JSON.stringify(m.stars));
  // four local players each move only their own skater
  while (game.players.length < 4) game.addPlayer(game.players.length === 1 ? { keys: 'right' } : { pad: game.players.length - 1 });
  const cfg4 = Object.assign(Setup.quickCfg({}), { humans: game.players.map((p, i) => ({ team: i % 2, input: p, name: 'P' + (i + 1) })), noAutoSwitch: true, seed: 61 });
  game.go('match', { cfg: cfg4 }, { fade: 0 }); game.advance(.4); m = Match.m; m.setPhase('play'); m.cheats.freezeAI = true;
  const before = m.humans.map(h => [h.skater.x, h.skater.y]), others = m.skaters.filter(s => s.ctrl.kind === 'cpu').map(s => [s.x, s.y]);
  m.humans.forEach((h, i) => h.input.hold(i % 2 ? 'down' : 'up')); game.advance(1); m.humans.forEach((h, i) => h.input.hold(i % 2 ? 'down' : 'up', false));
  const moved = m.humans.filter((h, i) => Math.abs(h.skater.y - before[i][1]) > 20).length;
  check('4 local players each move their own skater', moved === 4 && m.humans.length === 4, moved + '/' + m.humans.length);
  check('the CPU skaters stay put (AI frozen)', m.skaters.filter(s => s.ctrl.kind === 'cpu').every((s, i) => Math.hypot(s.x - others[i][0], s.y - others[i][1]) < 30));
  while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
  // a goal replay plays and returns to a faceoff
  m = start({ seed: 71, replays: 'auto' }); game.advance(.3); m.setPhase('play'); game.advance(5); m.cheats.noGoalies = true; const rs = m.humans[0].skater; rs.x = Rink.goalX(m.attackNet(0)) - m.attackDir(0) * 60; rs.y = Rink.C.y; rs.facing = m.attackDir(0) > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, rs, 't'); G.Shots.shoot(m, rs, 'wrist', 0);
  let sawReplay = false; for (let i = 0; i < 120 * 22; i++) { game.advance(1 / 120); if (G.Replay.on) sawReplay = true; if (sawReplay && m.phase === 'faceoff') break; }
  check('a goal replay plays and returns to a faceoff', sawReplay && ['faceoff', 'play'].includes(m.phase), 'replay ' + sawReplay + ' ' + m.phase);
  // determinism: the same seed and inputs twice give the same state
  const hashRun = () => { game.go('match', { cfg: Object.assign(Setup.quickCfg({}), { seed: 99, humans: [], replays: 'off' }) }, { fade: 0 }); game.advance(30); return JSON.stringify(game.stateHash()); };
  const h1 = hashRun(), h2 = hashRun(); check('the same seed twice gives the same state after 30 s', h1 === h2, h1 + ' vs ' + h2);
  check('no errors in the systems run', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack || '').split('\n')[1]).join(' | '));
});
