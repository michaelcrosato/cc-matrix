/* ---- MAIN: the game, its settings, the pause menu's items, saves, game.debug, deep links, the hub hookup ---- */
E.VIEWS.board = new E.View('board', 'Board', 0, 50, 1);
const HUB = typeof AIHub !== 'undefined' && AIHub.active;
G.hubActive = HUB;
G.GAME_SETTINGS = [
  { key: 'battleAnim', label: 'Battle animations', options: ['Full', 'Fast', 'Minimal'], value: 'Full' },
  { key: 'battleCam', label: 'Battle camera', options: ['Dynamic', 'Fixed'], value: 'Dynamic' },
  { key: 'battleView', label: 'Battle view', options: ['Board', 'Isometric'], value: 'Board' },
  { key: 'grid', label: 'Grid lines', options: ['Subtle', 'Bold', 'Off'], value: 'Subtle' },
  { key: 'tips', label: 'Tutorial tips', options: ['On', 'Off'], value: 'On' },
  { key: 'textSpeed', label: 'Text speed', options: ['Normal', 'Slow', 'Fast', 'Instant'], value: 'Normal' },
  { key: 'voices', label: 'Voices', options: ['On', 'Off'], value: 'On' },
  { key: 'uiScale', label: 'UI scale', options: ['Normal', 'Large'], value: 'Normal' },
  { key: 'edgePan', label: 'Edge panning (mouse)', options: ['Off', 'On'], value: 'Off' },
  { key: 'aiBattles', label: 'Battles between AI realms', options: ['Show result', 'Skip'], value: 'Show result' },
  { key: 'confirmEnd', label: 'Confirm before ending a turn', options: ['On', 'Off'], value: 'On' },
  { key: 'hotseatTimer', label: 'Hot-seat turn timer', options: ['Off', '60 s', '30 s'], value: 'Off' },
  { key: 'privacy', label: 'Hot-seat privacy cards', options: ['On', 'Off'], value: 'On' }
];
G.run = null;   // the campaign or skirmish being played: { sim, mode, flow, ... }
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: G.INPUT, bg: '#07060d', autoPause: !HUB,
  menu: HUB ? { items: [], settings: G.GAME_SETTINGS, quit: false } : { items: () => G.pauseItems(), settings: G.GAME_SETTINGS, quit: 'title', saves: { slots: 3, version: 1, migrate: (d, from) => G.migrateSave(d, from) } } });
G.game = game;
G.settings = game.settings;
G.pauseItems = () => {
  const out = [];
  if (game.sceneName === 'campaign') out.push(['Load', () => game.saves.show('load')]);
  out.push(['How to Play', () => { game.resume(); game.go('help', { back: game.sceneName }); }]);
  if (!HUB) out.push(['Dev Mode', () => { game.resume(); G.dev.open = true; G.dev.touched = true; if (G.run) G.run.dev = true; }]);
  out.push(['About & Credits', () => { game.resume(); game.go('about', { back: game.sceneName }); }]);
  return out;
};
// saves: a campaign's sim state, the flow position and the story state
G.migrateSave = (d, from) => { if (from < 1 && d && d.campaign) d.campaign.v = 1; return d; };
game.saves.write = () => {
  const R = G.run; if (!R || !R.sim) return null;
  return { data: { v: 1, campaign: R.sim.serialize(), dev: !!R.dev, flowAt: 'muster' }, place: G.get('realm', R.sim.state.humans[0] || 'verdance').short + ' • ' + R.sim.label(), level: Math.max(...R.sim.knightsOf(R.sim.state.humans[0] || 'verdance').map(k => k.lvl).concat([1])) };
};
game.saves.read = save => { const d = save.data; G.loadCampaign(d.campaign, d.dev); };
G.loadCampaign = (state, dev) => { G.run = { sim: G.CampaignSim.load(state), mode: 'campaign', flow: [], dev: !!dev }; G.run.flow.push({ k: 'resumeMuster' }); game.go('campaign', { load: true }); };
// the debug handle tests and tools read
game.debug = {
  snapshot() {
    const R = G.run, sim = R && R.sim, sc = game.scene || {}, B = G.battle;
    return { scene: game.sceneName, phase: sim ? sim.state.phase : null, season: sim ? sim.season() : null, year: sim ? sim.state.year : null, candle: sim ? sim.state.candle : null,
      realm: sim ? sim.state.humans[0] : null, mana: sim && sim.state.humans[0] ? sim.state.realms[sim.state.humans[0]].mana : null, focus: sc.focusName ? sc.focusName() : null, panel: sc.panelName ? sc.panelName() : null,
      prompts: G.ui.shownPrompts || [], flow: R ? (R.flow[0] || {}).k : null,
      battle: B && B.sim ? { map: B.sim.state.spec.map, bell: B.sim.state.bell, troop: B.sim.active ? B.sim.active.id : null, mode: B.mode, cursor: B.cursor, over: B.sim.state.over, units: B.sim.state.units.map(u => [u.id, u.side, u.cx, u.cy, u.hp, u.mp, u.out]) } : null,
      event: G.eventScene ? G.eventScene.id : null, touchOnly: G.touchOnly(), attract: { beat: G.attract ? G.attract.beat : null }, errors: game.errors.length, over: sim ? sim.state.over : null, dev: !!(R && R.dev) };
  },
  newCampaign(o = {}) { G.newCampaign(o); },
  startBattle(spec, o = {}) { G.startBattle(spec, o); },
  sim: () => G.run && G.run.sim, bsim: () => G.battle && G.battle.sim,
  cmd: c => G.battle && G.battle.sim ? G.battle.sim.apply(c) : G.run.sim.apply(c),
  autoplay: on => { G.autoplay = on; }, setTune: (k, v) => { G.tune[k] = v; }, resetTune: () => G.resetTune(),
  trigger: (id, realm) => G.devTrigger(id, realm), jump: (season, year) => G.devJump(season, year), hash: () => G.run && G.run.sim ? G.run.sim.hash() : null, G
};
// a new campaign from setup: { realms: [humans in seat order], difficulty, seed }
G.makeCampaign = (o = {}) => {
  const seed = o.seed || ((Date.now() ^ 0x5bd1e995) >>> 0) % 1e9;
  const sim = G.CampaignSim.create({ humans: o.realms || ['verdance'], difficulty: o.difficulty || 'normal', seed });
  G.run = { sim, mode: 'campaign', flow: o.skipPrologue ? [{ k: 'tidings' }] : [{ k: 'prologue' }, { k: 'tidings' }], dev: false, seats: o.seats || null };
};
G.newCampaign = (o = {}) => { G.makeCampaign(o); game.go('campaign', {}, { fade: 'iris' }); };
G.startBattle = (spec, o = {}) => { G.battleReq = Object.assign({ spec }, o); game.go('battle', G.battleReq, { fade: o.fade || 'swirl' }); };
// boot
const steps = [
  ['Winding the Great Clock', () => { G.validate(); G.loadTune(); }],
  ['Teaching wyverns to sit', () => { G.audioInit(game); }],
  ['Counting the bells', () => { if (!E.store.get('brigantime:glyphs', false)) { if (game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation'); E.store.set('brigantime:glyphs', true); } }],
  ['Sweeping the cross-quarter roads', () => { G.warmPortraits && G.warmPortraits(); }]
];
G.validate = () => {   // every id a spec refers to exists (fails loudly)
  const bad = [];
  for (const k of G.all('knight')) { if (!G.has('class', k.cls)) bad.push('knight ' + k.id + ' class'); for (const [sp] of k.troop) if (!G.has('monster', sp)) bad.push('knight ' + k.id + ' troop ' + sp); }
  for (const c of G.all('class')) for (const [s] of c.skills) if (!G.SPELL_FAMILY[s] && !G.has('skill', s)) bad.push('class ' + c.id + ' skill ' + s);
  for (const m of G.all('monster')) for (const t of m.skills) for (const s of t) if (!G.has('skill', s)) bad.push('monster ' + m.id + ' skill ' + s);
  for (const c of G.all('castle')) { if (!G.has('map', c.map)) bad.push('castle map ' + c.map); if (!G.has('site', c.site)) bad.push('castle site ' + c.site); if (!G.has('item', c.treasury)) bad.push('castle treasury ' + c.treasury); for (const e of c.circle) if (!G.has('monster', e.split(':')[0])) bad.push('circle ' + e); }
  for (const r in G.POOLS) for (const i of G.POOLS[r].items) if (!G.has('item', i)) bad.push('pool item ' + i);
  for (const e of G.all('event')) for (const f of [].concat(e.effects || [], ...(e.choices || []).map(c => c.effects))) { if (f.addKnight && !G.has('knight', f.addKnight)) bad.push('event ' + e.id + ' knight'); if (f.addItem && !G.has('item', f.addItem)) bad.push('event ' + e.id + ' item'); }
  if (bad.length) throw new Error('Data errors: ' + bad.join('; '));
  return true;
};
// deep links (tools, tests): #title #attract #campaign/<realm> #battle/<map>/<season> #event/<id> #ending/<id> #about #help #gallery #skirmish
const hash = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/');
let first = 'title', data;
if (!HUB) {
  if (hash[0] === 'campaign') { G.makeCampaign({ realms: [G.has('realm', hash[1]) ? hash[1] : 'verdance'], seed: 7, skipPrologue: true }); G.run.sim.state.flags.tutorialDone = true; first = 'campaign'; }
  else if (hash[0] === 'muster') { const r = G.has('realm', hash[1]) ? hash[1] : 'verdance'; G.makeCampaign({ realms: [r], seed: 7, skipPrologue: true }); const sim = G.run.sim; sim.state.flags.tutorialDone = true; sim.beginSeason(); for (const id of sim.eventsFor('tidings', r)) sim.state.seen[G.get('event', id).realm === 'player' ? id + ':' + r : id] = true; G.run.flow = [{ k: 'muster', realm: r }, { k: 'marchPhase' }]; first = 'campaign'; }
  else if (hash[0] === 'battle') { first = 'battle'; data = G.battleReq = { spec: G.quickBattleSpec(G.has('map', hash[1]) ? hash[1] : 'river_ford', G.SEASONS.includes(hash[2]) ? hash[2] : 'spring'), back: 'title' }; }
  else if (hash[0] === 'event' && G.has('event', hash[1])) { first = 'event'; data = { id: hash[1], realm: hash[2] || 'verdance', back: 'title' }; }
  else if (hash[0] === 'ending') { first = 'ending'; data = { kind: hash[1] || 'win', realm: hash[2] || 'verdance' }; }
  else if (['attract', 'about', 'help', 'gallery', 'skirmish', 'title', 'setup'].includes(hash[0])) first = hash[0];
} else first = 'hub';
game.start({ scenes: G.scenes, scene: first, data, boot: { title: 'BRIGANTIME', steps } });
if (typeof window !== 'undefined') window.__game = { game, G };
