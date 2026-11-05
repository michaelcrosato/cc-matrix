// story: every event's speakers and effects are valid; every event plays in the event scene; endings reachable
export default async ({ boot, t }) => {
  const { G, game } = boot(); game.advance(.5);
  const speakers = id => ['narrator', 'RULER', 'KNIGHT'].includes(id) || G.has('knight', id) || G.has('speaker', id);
  const sim = G.CampaignSim.create({ humans: ['verdance'], seed: 1 });
  await t('every event has valid speakers', () => { for (const e of G.all('event')) for (const r of G.PLAYABLE) { const lines = typeof e.lines === 'function' ? e.lines(sim, r, { castle: 'meridian' }) : e.lines; for (const [w] of lines) if (!speakers(w)) throw new Error(e.id + ' ' + w); } });
  await t('every event plays through the event scene without errors', () => {
    for (const e of G.all('event')) { game.errors.length = 0; G.run = null; game.go('event', { id: e.id, realm: 'solmark', back: 'title', applied: true }, { fade: 0 }); game.advance(.1); for (let i = 0; i < 60 && game.sceneName === 'event'; i++) { game.input.tap('confirm'); game.advance(.25); } if (game.errors.length) throw new Error(e.id + ': ' + game.errors[0].message); if (game.sceneName === 'event') throw new Error(e.id + ' stuck'); }
  });
  await t('every event effect applies in a campaign', () => { for (const e of G.all('event')) for (const c of [null, 0, 1]) { if (c !== null && !(e.choices && e.choices[c])) continue; const s = G.CampaignSim.create({ humans: ['amberlyn'], seed: 2 }); s.beginSeason(); s.applyEvent(e.id, 'amberlyn', c); } });
  await t('prologue and voices: the babble plan is stable', () => { const p = G.voice.profile('gareth'); const a = JSON.stringify(G.voice.plan(p, 'Sound the horn!')), b = JSON.stringify(G.voice.plan(p, 'Sound the horn!')); if (a !== b || a.length < 10) throw new Error('plan'); });
  for (const k of ['win', 'candle', 'wheel', 'fallen']) await t('the ' + k + ' ending plays to the title', () => { game.errors.length = 0; game.go('ending', { kind: k, realm: 'hoarfast' }, { fade: 0 }); for (let i = 0; i < 400 && game.sceneName !== 'title'; i++) { game.input.tap(i % 2 ? 'confirm' : 'cancel'); game.advance(.25); if (game.sceneName === 'ending' && game.scene.phase === 'bad') { game.scene.list.i = 1; } } if (game.errors.length) throw new Error(game.errors[0].message); if (game.sceneName !== 'title') throw new Error('stuck in ' + game.sceneName); });
};
