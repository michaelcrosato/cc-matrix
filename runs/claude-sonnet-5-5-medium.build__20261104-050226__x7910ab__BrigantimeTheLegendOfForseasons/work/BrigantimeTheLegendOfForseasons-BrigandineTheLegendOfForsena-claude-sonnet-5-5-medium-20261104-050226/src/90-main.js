/* ---- main: the game, its menu, settings, scenes and the debug handle ---- */
G.loadTune();
const hubActive = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', input: G.INPUT, bg: '#05040a',
  menu: hubActive ? { items: [], quit: false, controls: {}, settings: [] } : {
    saves: { slots: 3, version: 1 }, quit: 'title',
    items: [['Dev Mode', () => { game.resume(); G.dev.toggle(); }], ['How to Play', () => { game.resume(); game.go('help', { back: G.game.sceneName || 'title' }); }]],
    settings: [{ key: 'glyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation' }],
    controls: { confirm: 'Confirm', cancel: 'Back', alt: 'Commands / End phase', info: 'Details', prev: 'Previous', next: 'Next', view: 'Tilt board', help: 'Help' }
  }
});
G.game = game;
G.initAudio(game);
const sc = G.scenes;
sc.title = new G.TitleScene(); sc.setup = new G.SetupScene(); sc.skirmishSetup = new G.SkirmishScene(); sc.campaign = new G.CampaignScene(); sc.campaign.pausable = true; sc.campaign.view = 'side'; sc.campaign.input = G.INPUT; sc.campaign.res = 'ps1';
Object.assign(sc.campaign, sceneBase({ pausable: true }));
sc.battle = new G.BattleScene(); sc.event = new G.EventScene(); sc.results = new G.ResultsScene(); sc.ending = new G.EndingScene(); sc.help = new G.HelpScene(); sc.about = new G.AboutScene(); sc.attract = new G.AttractScene(); sc.gallery = new G.GalleryScene();
G.touchOnly = (() => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches; } catch (e) { return false; } })();
// activity tracking for the attract mode (keys, pointer, pad)
const HAS_DOM = typeof addEventListener === 'function';
if (HAS_DOM) {
for (const ev of ['keydown', 'pointerdown', 'wheel']) addEventListener(ev, () => { G.activity(); if (ev === 'keydown') G.touchOnly = false; });
addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) G.activity(); } });
addEventListener('gamepadconnected', () => { G.activity(); G.touchOnly = false; });
setInterval(() => { try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5))) { G.activity(); G.touchOnly = false; } } catch (e) { } }, 100);
}
G.activity();
// glyph family follows the setting
game.saves.write = () => { const run = G.run; if (!run || !run.S) return null; const S = run.S; return { data: { v: 1, S, cursor: run.cursor }, place: G.SEASONS[S.season] + ', Year ' + S.year, level: G.REALMS[S.human].name }; };
game.saves.read = save => { const d = save.data; if (!d || !d.S) return; G.clearRigs(); G.run = { S: d.S, stage: 'tidings', cursor: d.cursor }; G.run.S.cards = G.run.S.cards || []; G.run.stage = 'muster'; game.go('campaign'); };
game.debug = {
  G, snapshot() {
    const s = game.scene, run = G.run, bv = s && s.bv;
    return { scene: game.sceneName, phase: run ? run.stage : null, season: run ? run.S.season : null, year: run ? run.S.year : null, candle: run ? run.S.candle : null, realm: run ? run.S.human : null, mana: run ? run.S.realms[run.S.human].mana : null,
      panel: s && s.stack ? s.stack.length : 0, battle: bv ? { map: bv.S.map, bell: bv.S.bell, mode: bv.mode, cursor: bv.cursor, over: bv.S.over, units: bv.S.units.map(u => [u.uid, u.side, u.c, u.r, u.hp, u.mp, u.alive ? 1 : 0]) } : null, touchOnly: G.touchOnly, attract: s && s.beat ? { beat: s.beat } : null, errors: game.errors.length };
  },
  newCampaign(o = {}) { G.startCampaign(o.human || 0, o.difficulty || 'Normal', o.seed || 1); game.go('campaign'); }, startBattle(spec, extra) { game.go('battle', Object.assign({ spec }, extra || {})); }, sim() { return game.scene.bv ? game.scene.bv.S : G.run && G.run.S; },
  cmd(c) { return game.scene.bv ? game.scene.bv.apply(c) : false; }, setTune(k, v) { G.tune[k] = v; }, resetTune() { G.resetTune(); }, trigger(id) { game.go('event', { id, back: 'campaign' }); }, hash() { return G.hash(game.debug.sim()); }
};
const boot = {
  title: 'BRIGANTIME', steps: [['Winding the Great Clock', () => { G.loadTune(); }], ['Summoning the bestiary', () => { for (const m of G.all('monster')) m.names.length; }], ['Tuning the bells', () => { G.motesInit(50); }]]
};
const start = () => {
  const hub = hubActive;
  game.start({ scene: hub ? 'hubwait' : 'title', scenes: Object.assign({}, sc, { hubwait: sceneBase({ enter() { }, update() { UI.pump(); }, draw(r) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05040a'); G.T(g, 'Connecting to the hub...', r.W / 2 - 60, r.H / 2, '#ffe8a0'); }); } }) }), boot });
  const q = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  if (hub) G.hubStartup();
  else if (q) { const [a, b] = q.split('/'); G.deepLink = () => { if (a === 'attract') game.go('attract'); else if (a === 'about') game.go('about'); else if (a === 'help') game.go('help'); else if (a === 'gallery') game.go('gallery'); else if (a === 'skirmish') game.go('skirmishSetup'); else if (a === 'campaign') { game.debug.newCampaign({ human: +b || 0 }); } else if (a === 'training') G.startTraining(); else if (a === 'battle') { game.debug.startBattle(G.makeSkirmish(+b || 5, { realms: [0, 1] }), { skirmish: true }); } }; }
};
start();
