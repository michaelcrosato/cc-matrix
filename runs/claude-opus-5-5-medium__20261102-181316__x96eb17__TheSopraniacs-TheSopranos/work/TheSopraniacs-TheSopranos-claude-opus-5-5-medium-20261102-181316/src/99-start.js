/* ---- START ---- */
shots = new E.Bullets(game, { plane: 'ground' });
// a handle for tests and tools (test.mjs, tools/check.mjs)
game.debug = {
  snapshot: () => ({ scene: game.sceneName, area: A && A.id, ch: S && S.ch, step: S && S.step, mode: S && S.mode, hero: hero ? [Math.round(hero.x), Math.round(hero.y)] : null, hp: hero && Math.round(hero.hp),
    stress: S && Math.round(S.stress), heat: S && Math.round(S.heat), money: S && S.money, respect: S && S.respect, driving, foes: foes.filter(f => !f.dead).length, talk: talk.open, attract, outfit: S && S.outfit,
    car: car ? [Math.round(car.x), Math.round(car.y)] : null, hot: hot && hot.label, ghosts: Object.keys(ghosts).filter(k => game.real - ghosts[k].at < 3).length, panic: panic > 0, fight: !!fightOn, knocked: hero && hero.knocked, view: game.view.id, errors: game.errors.length }),
  teleport(x, y) { if (driving) { car.x = x; car.y = y; } hero.x = x; hero.y = y; hero.vx = hero.vy = 0; },
  newGame, newRun, skip: ch => newGame(ch), state: () => S, talk, setStep: id => setStep(id), hotspots: () => hotspots().map(h => h.label),
  act(label) { const h = hotspots().find(q => q.label === label); if (h) h.act(); return !!h; }, foes: () => foes, kill() { for (const f of foes) { f.hp = 0; if (!f.dead) ko(f); } },
  glyphCode: (a, d) => codeFor(a, d), padStyle: () => input.padStyle(), touchOnly: () => touchOnly(), enterCar, exitCar, finish: () => { talk.close(); }
};
game.start({
  scenes: { title, play, over, black, ending, results, about, hubwait }, scene: HUB ? 'hubwait' : 'title',
  boot: { title: 'THE SOPRANIACS', steps: [['Paving Newark Avenue', () => buildAreas()], ['Waking up the ducks', () => { S = newState(); makeCar(); makeTown(); }]] }
});
if (HUB) hubStart();
})();
/* ============================== GAME END ============================== */
