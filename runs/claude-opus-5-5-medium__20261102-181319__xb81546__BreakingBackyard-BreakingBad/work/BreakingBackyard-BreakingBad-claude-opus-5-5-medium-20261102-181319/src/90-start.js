/* ---------------- the handle tests and tools read ---------------- */
game.debug = {
  snapshot: () => ({
    scene: game.sceneName, ep: S.ep, step: S.step, stepId: curStep() && curStep().id, obj: objText(), day: S.day, hp: W && W.hero ? Math.round(W.hero.hp) : null,
    dirty: S.dirty, clean: S.clean, product: S.product, purity: S.purity, heat: Math.round(S.heat), flasks: { ...S.flasks }, up: { ...S.up }, alias: S.alias,
    hero: W && W.hero ? [Math.round(W.hero.x), Math.round(W.hero.y)] : null, enemies: W ? W.enemies.filter(e => !e.dead).length : 0, agents: W ? W.agents.map(a => a.state) : [],
    buyers: W ? W.buyers.length : 0, npcs: W ? W.npcs.map(n => n.id) : [], modal: modal ? modal.kind : null, talking: talk.open, demo: !!(W && W.demo), partner: !!(W && W.partner), p2: !!(W && W.partner && !W.partner.ai),
    view: game.view && game.view.id, near: W && W.near ? W.near.id : null, toasts: toasts.map(t => t.text), errors: game.errors.length
  }),
  state: () => S,
  setState: o => Object.assign(S, o),
  level: () => W,
  log: () => LOG,
  modal: () => modal,
  talk,
  teleport(x, y) { if (W && W.hero) { W.hero.x = x; W.hero.y = y; W.hero.vx = W.hero.vy = 0; } },
  spot: SPOT, labSpot: LAB_SPOT, buyerSpots: BUYER_SPOTS,
  story, advance, interactables, EPISODES, UPGRADES,
  skipTalk() { let n = 0; while (talk.open && n++ < 60) { talk.close(); } },
  hub: hubState,
  killAll() { if (W) for (const e of W.enemies) if (!e.dead) hurtEnemy(e, 9999, 0); },
  hurtEnemy: (e, d) => hurtEnemy(e, d, 0), hurtHero: (h, d) => hurtHero(h, d, 0), makeEnemy: (k, x, y) => makeEnemy(k, x, y), makeAgent: (b, s, i) => makeAgent(b, s, i),
  burst: (x, y, k) => burst(x, y, k), sync: () => syncAgents(), touchOnly: () => touchOnly(), titleItems: () => titleItems().map(i => i.label), mixHex, openCook: o => { modal = new Cook(o || {}); return modal; }
};

/* ---------------- deep links (tests and screenshots): #town, #ep=3, #lab, #cook, #demo, #about, #ending, #credits ---------------- */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1);
  if (!h) return null;
  const m = /^ep=(\d)(?:\.(\d))?$/.exec(h);
  if (m) { S = NEW_STATE(); S.ep = +m[1]; S.step = +(m[2] || 0); if (S.ep >= 2) { S.flags.smoke = true; S.flags.shop = true; S.flasks.smoke = 2; S.clean = 8000; S.product = 6; S.purity = 92; } return [sceneForState(), { fresh: true }]; }
  if (h === 'town') { S = NEW_STATE(); return ['town', { fresh: true }]; }
  if (h === 'lab') { S = NEW_STATE(); S.ep = 5; S.step = 1; S.up.pistol = true; S.alias = true; return ['lab', {}]; }
  if (h === 'cook') { S = NEW_STATE(); S.ep = 1; S.step = 1; return ['town', { fresh: true, cook: true }]; }
  if (h === 'demo') return ['town', { demo: true }];
  if (scenes[h]) return [h, {}];
  return null;
}

/* ---------------- start ---------------- */
const LAUNCH = HUB ? null : deepLink();
scenes.launch = { update() { game.go(LAUNCH[0], LAUNCH[1], { fade: 0 }); }, draw(r) { r.sky(['#000000', '#000000']); } };
game.start({
  scenes, scene: HUB ? 'hubwait' : LAUNCH ? 'launch' : 'title',
  boot: { title: TITLE, version: '1.0', messages: ['Calibrating the glassware', 'Parking the RV', 'Briefing the task force', 'Folding the salsa verde', 'Printing Lenny\'s billboard'],
    steps: [['Building Las Brujas', () => { town.bounds && town.bounds(game.view); }], ['Waking the cast', () => { for (const k of ['hollis', 'dusty', 'lenny', 'vela', 'dale', 'skyler', 'rafa', 'mack']) speaker(k); }]] }
});
if (HUB) {
  hubConnect().then(info => {
    if (!info) { game.go('title'); return; }
    game.go('hubround', {}, { fade: 0 });
  }).catch(err => { try { HUB.fail(String(err && err.message || err)); } catch (e) { /* no hub */ } game.go('title'); });
}
})();
