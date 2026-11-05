// The scripted playthrough of the whole game (18.3): title -> CUP RUN -> chapters 1-5 (cutscenes, choices, chapter 1's
// warm-up drills, each game played by the bot through game.input, the intermission Flood Wagon once, chapter 4's
// Shootout Showcase, chapter 5's boss) -> the ending, credits and the title; then Practice drills 1-7 by script.
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
import { makeBot } from '../bot.mjs';
import { drillBot } from '../drillbot.mjs';
guard('story', async () => {
  const { game, G, snap } = load();
  const bot = makeBot(G, game); bot.drill = drillBot(G);
  let lastK = ''; const trace = process.env.TRACE ? (k => { if (k !== lastK) { console.log('  > ' + k); lastK = k; } }) : () => {};
  const step = (sec, until) => { const n = Math.round(sec * 120); for (let i = 0; i < n; i++) { bot.step(); game.advance(1 / 120); trace(game.sceneName + ' ' + (G.Match.m ? G.Match.m.cfg.mode + G.Match.m.cfg.chapter + ' ' + G.Match.m.phase : '')); if (until && until()) return true; } return !!(until && until()); };
  const seen = {}; G.Bus.sim('*', e => { seen[e.type] = (seen[e.type] || 0) + 1; });
  game.advance(.5);
  check('boots to the title', game.sceneName === 'title');
  game.input.tap('confirm'); game.advance(.2); game.input.tap('confirm'); game.advance(.5);
  check('CUP RUN opens the story map', game.sceneName === 'storymap', game.sceneName);
  G.T.set('aiSkillHome', .95); G.T.set('aiSkillAway', .3);
  const SIG = { 1: ['onetimer'], 2: ['kaboom_start', 'thin_ice_break'], 3: ['fight_end'], 4: ['mascot_down', 'shootout_end'], 5: ['boost_start', 'organ_boost'] };
  const WARP = { thin_ice_break: () => G.Dev.warp('breakIce'), kaboom_start: () => G.Dev.warp('kaboom'), fight_end: () => { G.Dev.warp('fight'); }, mascot_down: () => { const m = G.Match.m; if (!m || !m.humans[0]) return; const p = m.extras.find(e => e.kind === 'pete'), s = m.humans[0].skater; if (p) { p.x = s.x + 14; p.y = s.y; s.vx = 220; s.vy = 0; s.facing = 0; G.Skater.check(m, s); } },
    onetimer: () => { const m = G.Match.m, R = G.Rink, dir = m.attackDir(0), gx = R.goalX(m.attackNet(0)), [a, b] = m.teams[0].skaters; a.x = gx - dir * 60; a.y = R.C.y - 55; b.x = gx - dir * 55; b.y = R.C.y + 50; G.Puck.setOwner(m, m.puck, a, 'test'); a.passPick = b.id; G.Shots.pass(m, a, false); b.otArmed = 1; } };
  bot.wantFlood = true;
  for (let n = 1; n <= (process.env.SKIPSTORY ? 0 : 5); n++) {
    const before = {}; for (const k in seen) before[k] = seen[k];
    const ok = step(240, () => game.sceneName === 'match' && G.Match.m && G.Match.m.cfg.mode === 'story');
    check('chapter ' + n + ': the pre-game scene leads to the game', ok && G.Match.m.cfg.chapter === n, game.sceneName + ' ' + (G.Match.m && G.Match.m.cfg.chapter));
    if (n === 1) check('chapter 1: the warm-up drills ran', (seen.objective || 0) >= 0 && G.Save.data.drills[1] && G.Save.data.drills[2] && G.Save.data.drills[3], JSON.stringify(G.Save.data.drills));
    const m = G.Match.m;
    check('chapter ' + n + ': the choice was saved', !!G.Save.data.choices[n], JSON.stringify(G.Save.data.choices));
    // period 1 for real
    step(400, () => m.period >= 2 || m.phase === 'final' || game.sceneName !== 'match');
    for (const sig of SIG[n]) if (!((seen[sig] || 0) > (before[sig] || 0)) && WARP[sig]) { if (game.sceneName === 'flood') step(60, () => game.sceneName === 'match'); if (m.phase !== 'play') step(10, () => m.phase === 'play'); for (let k = 0; k < 4 && !((seen[sig] || 0) > (before[sig] || 0)); k++) { if (m.phase !== 'play') step(10, () => m.phase === 'play'); WARP[sig](); step(8, () => (seen[sig] || 0) > (before[sig] || 0)); } }
    // the rest: the clock warped to 0:05 each period, keeping the lead
    let guardT = 0;
    while (game.sceneName !== 'results' && guardT < 900) {
      if (game.sceneName === 'match' && m.phase === 'play' && m.clock > 5 && (m.teams[0].score > m.teams[1].score || m.period >= 3 && m.clock > 20)) { while (m.teams[0].score <= m.teams[1].score && m.period >= 3) G.Dev.warp('homeGoal'); m.clock = 5; }
      step(2, () => game.sceneName === 'results'); guardT += 2; if (game.sceneName === 'flood') bot.wantFlood = false;
    }
    check('chapter ' + n + ': the game reaches the results', game.sceneName === 'results', game.sceneName + ' ' + m.phase);
    check('chapter ' + n + ': the Muskrats won it', m.winner === 0, m.teams[0].score + '-' + m.teams[1].score + ' so ' + JSON.stringify(m.so && m.so.marks));
    check('chapter ' + n + ': at least one goal', m.goals.length > 0 || (m.so && m.so.marks[0].some(Boolean)));
    for (const sig of SIG[n]) check('chapter ' + n + ': ' + sig + ' happened', (seen[sig] || 0) > (before[sig] || 0), JSON.stringify(seen));
    check('chapter ' + n + ': stars recorded', !!G.Save.data.stars[n] && G.Save.data.done[n], JSON.stringify(G.Save.data.stars));
    if (n === 1) check('the Flood Wagon was driven at an intermission', (seen.flood_done || 0) > 0);
    if (n === 4) check('chapter 4: the Shootout Showcase ran', !!(m.so && m.so.done));
  }
  // the ending: the post-game scene, credits, Marge, the title with the Cup
  step(240, () => game.sceneName === 'credits'); check('the ending rolls the credits', game.sceneName === 'credits' || G.Save.data.finished, game.sceneName);
  step(300, () => game.sceneName === 'title'); check('the credits end on the title', game.sceneName === 'title', game.sceneName);
  check('the Cup Run is finished and saved', G.Save.data.finished && G.Save.totalStars() >= 5, G.Save.totalStars());
  check('the Grizzlies unlocked for exhibition', G.Setup.teams().includes('grizzlies'));
  G.T.resetAll();
  // Practice: drills 1-7, each by script
  for (let d = 1; d <= 7; d++) {
    game.go('match', { cfg: G.Drills.cfg(d) }, { fade: 0 }); game.advance(.2);
    const ok = step(150, () => game.sceneName === 'practice');
    if (!ok && process.env.TRACE) { const m = G.Match.m, hs = m.humans[0] && m.humans[0].skater; console.log('drill fail dbg', m.phase, hs && [hs.id, Math.round(hs.x), Math.round(hs.y), hs.state, hs.offIce], [...game.input.held].join(','), game.view.id, G.Dev.isOpen(), game.paused, game.timeScale); }
    check('drill ' + d + ' (' + G.Drills.LIST[d - 1].title + ') passes', ok && G.Save.data.drills[d], game.sceneName + ' ' + JSON.stringify(G.Match.m && G.Match.m.drillState && Object.fromEntries(Object.entries(G.Match.m.drillState).filter(([k, v]) => typeof v !== 'object'))));
  }
  check('all 7 drills earn Marge Approved', G.Save.data.badge);
  check('no errors in the playthrough', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')).join(' | '));
});
