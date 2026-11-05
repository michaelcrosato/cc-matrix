/* ---- START: the handle for tests and tools, the boot, the first scene ---- */
game.debug = {
  snapshot: () => ({ scene: game.sceneName, mode: W.mode, place: W.place, ch: S.ch, step: S.step, cash: S.cash, respect: S.respect, family: S.family, stress: Math.round(S.stress), ammo: S.ammo,
    hero: hero() ? { x: Math.round(hero().x), y: Math.round(hero().y), hp: Math.round(hero().hp), car: !!hero().car, robe: hero().robe } : null, heroes: W.heroes.length,
    foes: W.foes.filter(f => !f.dead).length, talk: talk.open, mini: W.mini ? W.mini.kind : null, objective: W.objective ? W.objective.title : null, flags: Object.keys(S.flags).filter(k => S.flags[k]),
    collect: { t: Math.round(C.t), over: C.over, started: C.started }, view: game.view && game.view.id, errors: game.errors.length }),
  teleport(x, y) { const h = hero(); if (h) { h.x = x; h.y = y; h.vx = h.vy = 0; } },
  S, W, C, STORY, CHAPTERS, SHOPS, startChapter, spawnFoe, convoQ, talk, TOWN, BARRENS, DINER, OFFICE, game, autoFight, nearestUse, interactables, hero, panicAttack, stareDown, fixGlyphs, finishCollection, convoBusy, dropItem, AP, makeHero, addCollector, hitFoe, hurtHero, applyGlyphs,
  get touchLocked() { return touchLocked; }, set touchLocked(v) { touchLocked = v; }, get HUB() { return HUB; }
};
const firstScene = HUB ? 'hubwait' : 'title';
game.start({ scenes, scene: firstScene, boot: { title: 'THE BARITONES', steps: [
  ['Paving North Caldwell', () => mapOf(TOWN)], ['Planting the Pine Barrens', () => mapOf(BARRENS)], ['Booking the couch', () => mapOf(OFFICE)], ['Wiping down the booth', () => mapOf(DINER)]
] } });
if (HUB) Promise.resolve(game.booted).then(() => hubConnect());
