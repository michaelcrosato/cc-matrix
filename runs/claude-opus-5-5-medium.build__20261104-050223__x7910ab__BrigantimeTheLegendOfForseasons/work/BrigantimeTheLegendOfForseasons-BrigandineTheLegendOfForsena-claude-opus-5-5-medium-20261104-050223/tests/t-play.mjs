// playthrough: each realm, a new Normal campaign on autoplay through the real scenes (events, commanded tutorial,
// delegated battles, the Sanctum, the ending and credits) to the title, with tune.aiPlayerBoost raised; and a defeat
export default async ({ boot, t }) => {
  for (const [realm, seed] of [['verdance', 21], ['solmark', 22], ['amberlyn', 23], ['hoarfast', 21]]) await t(realm + ' reaches Meridian, wins the Sanctum and plays the ending', () => {
    const { G, game } = boot(); game.advance(.5); G.tune.aiPlayerBoost = 2; G.newCampaign({ realms: [realm], seed }); G.autoplay = true; game.advance(.5);
    const seen = new Set(); let over = null;
    for (let i = 0; i < 12000; i++) { game.advance(.25); seen.add(game.sceneName); if (G.run && G.run.sim.state.over) over = G.run.sim.state.over; if (game.errors.length) throw new Error(game.errors[0].message + ' ' + String(game.errors[0].stack).split('\n')[1]); if (game.sceneName === 'title' && over) break; }
    if (!over || over.kind !== 'win') throw new Error('ended ' + JSON.stringify(over)); if (!G.run.sim.state.seen['meridian_falls:' + realm]) throw new Error('no meridian_falls'); for (const s of ['event', 'battle', 'ending']) if (!seen.has(s)) throw new Error('never saw ' + s);
  });
  for (const [realm, seed] of [['verdance', 2], ['solmark', 2], ['amberlyn', 1], ['hoarfast', 3]]) await t(realm + ' wins on Easy with no stat boost (autoplay, every battle delegated)', () => {
    const { G } = boot(); G.tune.aiPlayerBoost = 0; const s = G.CampaignSim.create({ humans: [realm], seed, difficulty: 'easy' }); let n = 0; while (!s.state.over && n++ < 40) s.autoSeason(); if (!s.state.over || s.state.over.kind !== 'win') throw new Error(JSON.stringify(s.state.over));
  });
  await t('the candle burns out (the defeat path)', () => {
    const { G, game } = boot(); game.advance(.5); G.newCampaign({ realms: ['amberlyn'], seed: 5, difficulty: 'hard' }); G.autoplay = true; G.tune.aiPlayerBoost = 0; game.advance(.5); let over = null;
    for (let i = 0; i < 16000; i++) { game.advance(.25); if (G.run && G.run.sim.state.over) over = G.run.sim.state.over; if (game.errors.length) throw new Error(game.errors[0].message); if (game.sceneName === 'title' && over) break; }
    if (!over || over.kind === 'win') throw new Error('ended ' + JSON.stringify(over));
  });
};
// balance without the test boost: on Easy, each realm's autoplay (every battle delegated) can win the war
export const unboosted = true;
