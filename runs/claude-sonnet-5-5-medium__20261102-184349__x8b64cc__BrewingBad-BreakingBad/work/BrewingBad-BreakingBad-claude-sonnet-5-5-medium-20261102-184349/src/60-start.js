/* ---- START ---- */
hubSetup();
game.debug = {
  snapshot: () => ({ scene: game.sceneName, step: S.step, hero: [hero.b.x, hero.b.y].map(v => Math.round(v)), hp: S.hp, cash: S.cash, dirty: S.dirty, bags: S.bags, foes: foes.length, heat: Math.round(S.heat), demo: demo ? demo.stage : null, errors: game.errors.length }),
  teleport(x, y) { Object.assign(hero.b, { x, y, vx: 0, vy: 0 }); },
  setStep(n) { setStep(n); }, S, foes, hero, game, go: (...a) => game.go(...a)
};
window.__bb = { hitFoe, finishGame, startAmbush, game, S, foes, hero, npcs, setStep, demoSetup, startDemo, addGoon, addBoss, PX, AT };
game.start({
  scene: 'title',
  scenes: Object.assign({ title: titleScene, play, over: overScene, results: resultsScene }, scenes),
  boot: { title: TITLE }
});
showTouchNotice();
