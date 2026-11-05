// --playthrough: the expert bot clears every stage in god mode, the fair bot clears every stage on Normal, the
// showoff bot plays the whole ARCADE through its cutscenes, the Training range completes
export default async t => {
  const { TC } = t.load();
  const play = (o, style, secs) => { const s = new TC.Sim(o), bot = new TC.Autopilot(style); bot.skipCuts = true; const times = {}; let last = s.scene.id, ts = 0;
    for (let i = 0; i < secs * 120; i++) { s.step(1 / 120, [bot.command(s, 0, 1 / 120)]); s.drain(); if (s.scene.id !== last) { times[last] = +(s.t - ts).toFixed(1); last = s.scene.id; ts = s.t; } if (s.phase === 'done' || s.phase === 'gameover' || s.phase === 'continue') break; if (o.stages && s.phase === 'done') break; }
    return { s, times }; };
  for (const st of [1, 2, 3]) { const { s, times } = play({ mode: 'stage', stage: st, seed: 21, skipIntro: true, cheats: { god: true } }, 'expert', 900); t.check('expert bot clears stage ' + st, s.phase === 'done', s.phase + ' at ' + s.scene.id + ' ' + JSON.stringify(times)); }
  for (const st of [1, 2, 3]) { const { s, times } = play({ mode: 'stage', stage: st, seed: 31, skipIntro: true }, 'fair', 1200); t.check('the fair bot clears stage ' + st + ' on Normal without a continue', s.phase === 'done' && s.players[0].conts === 0, s.phase + ' ' + s.scene.id + ' lives ' + s.players[0].lives + ' ' + JSON.stringify(times)); }
  { const { s } = play({ mode: 'range', stage: 'range', seed: 23 }, 'expert', 400); t.check('the Training range completes', s.phase === 'done', s.phase + ' ' + s.scene.id); }
  // the whole ARCADE with its cutscenes: stage 1 -> 2 -> 3
  { const s = new TC.Sim({ mode: 'arcade', stage: 1, seed: 24, cheats: { god: true, ammo: true } }), bot = new TC.Autopilot('showoff'); bot.skipCuts = true; let stage = 1, cuts = 0;
    for (let i = 0; i < 120 * 2400; i++) { s.step(1 / 120, [bot.command(s, 0, 1 / 120)]); for (const e of s.drain()) if (e.type === 'cutstart') cuts++; if (s.phase === 'done') { if (stage < 3) { stage++; s.nextStage(stage); } else break; } }
    t.check('the showoff bot plays the whole ARCADE to the ending', s.phase === 'done' && stage === 3, 'stage ' + stage + ' ' + s.phase + ' ' + s.scene.id);
    t.check('every stage intro and outro played', cuts >= 6, cuts); }
  // the whole game through its screens, as a player sees it (game.advance, input taps): title -> menu -> ARCADE -> the
  // Training offer -> difficulty -> briefing -> play (the showoff bot, god and infinite ammo) -> results -> the next
  // briefing ... -> the ending -> initials -> the high-score table -> the menu
  { const { TC, game } = t.load({ boot: true }), seen = []; const go = (a, s = .5) => { if (a) game.input.tap(a); game.advance(s); if (seen[seen.length - 1] !== game.sceneName) seen.push(game.sceneName); };
    go(null, .8); go('confirm', .8); go('confirm', .8); go('down', .3); go('confirm', .8); go('confirm', .8);
    let stages = 0;
    for (let k = 0; k < 2 * 3000 && game.sceneName !== 'gameover'; k++) {
      const sc = game.sceneName;
      if (sc === 'play' && TC.play && !TC.play.bots[0]) { stages++; Object.assign(TC.play.sim.cheats, { god: true, ammo: true }); const b = new TC.Autopilot('showoff'); b.skipCuts = true; TC.play.bots[0] = b; }
      go(sc === 'briefing' || sc === 'results' || sc === 'ending' ? 'confirm' : null, .5);
    }
    const won = game.sceneName === 'gameover' && TC.scenes.gameover.d.won, score = TC.scenes.gameover.score;
    for (let k = 0; k < 40 && game.sceneName !== 'menu'; k++) go('confirm', .5);
    const path = seen.join(' > ');
    t.check('the whole game through its screens: title to the ending', won && stages === 3 && ['menu', 'offer', 'difficulty', 'briefing', 'play', 'results', 'ending'].every(s => seen.includes(s)), path);
    t.check('...the initials go on the high-score table and the game returns to the menu', game.sceneName === 'menu' && score > 0 && TC.arcade.table('arcade').some(e => e.score === score), game.sceneName + ' ' + score);
    t.check('...with no errors', game.errors.length === 0, game.errors.map(e => e.message || e).slice(0, 2).join(' | ')); }
};
