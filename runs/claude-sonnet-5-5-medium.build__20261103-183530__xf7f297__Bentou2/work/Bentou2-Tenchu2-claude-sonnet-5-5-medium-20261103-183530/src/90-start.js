/* ---- START ---- */
scenes.cutscene = cutScene;
game.debug = {
  snapshot: () => ({ scene: game.scene && game.scene.id, mission: S && S.m.id, hp: S && S.hp, hero: S && [S.hero.x, S.hero.y, S.hero.z], cuts: S && S.cuts, detected: S && S.detected, guards: S && S.guards.filter(g => !g.dead).length, obj: S && S.obj, done: S && S.done, boss: S && S.boss && { hp: S.boss.hp, st: S.boss.st, active: S.boss.active } }),
  teleport: (x, y, z = 0) => { if (S) { Object.assign(S.hero, { x, y, z, vx: 0, vy: 0 }); game.cam.snap = true; } }
};
window.__bentou = { game, scenes, B, get S() { return S; }, startMission: id => game.go('play', { mission: id }), RowsUI };
const hash = (location.hash || '').slice(1), forced = scenes[hash] ? hash : null;
game.start({ scenes, scene: HUB ? 'hubcard' : forced || 'title', data: forced === 'play' ? { mission: 'trial' } : undefined,
  boot: { title: TITLE, steps: [['Packing the bento', () => { B.syncGlyphs(); }]] } });
if (HUB) B.hubBoot();
addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'KeyM' && game.scene && game.scene.id === 'play' && 0) A.mute(); });
