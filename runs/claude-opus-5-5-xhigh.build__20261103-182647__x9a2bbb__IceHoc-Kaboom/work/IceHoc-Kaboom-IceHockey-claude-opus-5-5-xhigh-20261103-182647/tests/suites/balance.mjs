// Balance (18.4, 7.6): AI-vs-AI games at Pro (goals a game, fights, KABOOMs) and save rates by shot type from scripted
// shots: wrist shots from distance, cross-crease one-timers, breakaway dekes, KABOOM shots. Prints a table when run alone.
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
const alone = process.argv[1].endsWith('balance.mjs') && !process.env.RUNNER;
guard('balance', async () => {
  const { game, G } = load(); game.advance(.3);
  const N = +process.env.GAMES || 8, tot = { goals: 0, fights: 0, kab: 0 };
  for (let i = 0; i < N; i++) {
    const ev = {}; G.Bus.sim('*', e => { if (G.Match.m && G.Match.m.cfg.seed === 700 + i) ev[e.type] = (ev[e.type] || 0) + 1; });
    const teams = ['muskrats', 'drillers', 'lumberjacks', 'bruisers', 'marauders'];
    game.go('match', { cfg: { mode: 'exhibition', home: teams[i % 5], away: teams[(i + 1 + Math.floor(i / 5)) % 5], arena: 'icebox', humans: [], intros: false, flood: 'never', periodLen: 120, seed: 700 + i, replays: 'off', difficulty: 'pro' } }, { fade: 0 }); game.advance(.1);
    let t = 0; while (G.Match.m.phase !== 'final' && t < 900) { game.advance(1); t++; }
    const m = G.Match.m; tot.goals += m.teams[0].score + m.teams[1].score; tot.fights += ev.fight_start || 0; tot.kab += ev.kaboom_start || 0;
    if (alone) console.log('game', i, m.teams[0].def.abbr, m.teams[0].score, '-', m.teams[1].score, m.teams[1].def.abbr, 'fights', ev.fight_start || 0, 'kabooms', ev.kaboom_start || 0);
  }
  const g = tot.goals / N, f = tot.fights / N * 10, k = tot.kab / N;
  check('AI-vs-AI goals a game 5-11', g >= 5 && g <= 11, g.toFixed(2)); check('fights: 2+ per 10 games', f >= 2, f.toFixed(1)); check('KABOOMs a game 1-5', k >= 1 && k <= 5, k.toFixed(2));
  // save rates by shot type (scripted)
  const R = G.Rink, start = seed => { game.go('match', { cfg: Object.assign(G.Setup.quickCfg({}), { seed, replays: 'off', humans: [] }) }, { fade: 0 }); game.advance(.4); const m = G.Match.m; m.setPhase('play'); for (const o of m.teams[1].skaters) { o.offIce = true; o.x = R.C.x; o.y = R.Y0 - 30; } return m; };
  let shots = []; G.Bus.sim('shot', e => shots.push(e));
  const trial = (n, setup) => { let saved = 0, goals = 0; for (let k2 = 0; k2 < n; k2++) { const m = start(9000 + k2 * 7 + n); shots = []; setup(m, k2); game.advance(1.8); const on = shots.length && shots[0].onGoal; if (m.teams[0].score > 0) goals++; else if (on) saved++; } return saved / Math.max(1, saved + goals); };
  const wrist = trial(40, (m, k2) => { const s = m.teams[0].skaters[0], dir = m.attackDir(0), gx = R.goalX(m.attackNet(0)); s.x = gx - dir * (160 + (k2 % 5) * 15); s.y = R.C.y + ((k2 % 7) - 3) * 18; s.facing = Math.atan2(R.C.y - s.y, gx - s.x); G.Puck.setOwner(m, m.puck, s, 't'); G.Shots.shoot(m, s, 'wrist', 0); });
  const ot = trial(30, (m, k2) => { const dir = m.attackDir(0), gx = R.goalX(m.attackNet(0)), [a, b] = m.teams[0].skaters; a.x = gx - dir * 50; a.y = R.C.y - 70; b.x = gx - dir * 70; b.y = R.C.y + 40; b.facing = dir > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, a, 't'); game.advance(.3); a.passPick = b.id; G.Shots.pass(m, a, false); b.otArmed = 1; b.ai.shootT = 1; });
  const deke = trial(30, (m, k2) => { const s = m.teams[0].skaters[0], dir = m.attackDir(0), gx = R.goalX(m.attackNet(0)); s.x = gx - dir * 140; s.y = R.C.y; s.vx = dir * 150; s.facing = dir > 0 ? 0 : Math.PI; G.Puck.setOwner(m, m.puck, s, 't'); s.ai.plan = { at: 50, deke: true, side: k2 % 2 ? 1 : -1 }; s.ai.deked = false; m.so = { att: { shooter: s.id } }; for (let q = 0; q < 200; q++) { G.AI.shooter(m, s, 1 / 120); game.advance(1 / 120); if (!m.puck.owner) break; } m.so = null; });
  const kab = trial(30, (m, k2) => { const s = m.teams[0].skaters[0], dir = m.attackDir(0), gx = R.goalX(m.attackNet(0)); G.Boom.start(m, 0); s.x = gx - dir * (110 + (k2 % 4) * 20); s.y = R.C.y + ((k2 % 5) - 2) * 15; s.facing = Math.atan2(R.C.y - s.y, gx - s.x); G.Puck.setOwner(m, m.puck, s, 't'); G.Shots.shoot(m, s, 'slap', 1); });
  if (alone) console.log('save rates: wrist from distance', wrist.toFixed(2), ' one-timers', ot.toFixed(2), ' breakaway dekes', deke.toFixed(2), ' KABOOM', kab.toFixed(2));
  check('wrist shots from distance saved 85-99%', wrist >= .85 && wrist <= .99, wrist.toFixed(2));
  check('cross-crease one-timers saved 30-82%', ot >= .3 && ot <= .82, ot.toFixed(2));
  check('breakaway dekes saved 35-85%', deke >= .35 && deke <= .85, deke.toFixed(2));
  check('KABOOM shots on target saved 15-50%', kab >= .15 && kab <= .5, kab.toFixed(2));
  check('no errors in the balance run', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message).join(' | '));
});
