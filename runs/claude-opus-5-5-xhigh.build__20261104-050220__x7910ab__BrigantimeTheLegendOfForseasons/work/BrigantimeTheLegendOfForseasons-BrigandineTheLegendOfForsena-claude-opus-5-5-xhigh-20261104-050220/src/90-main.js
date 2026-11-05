// MAIN: the game, its settings and saves, the pause menu's items, the boot steps, the scenes (each wrapped so dev mode
// can open over it), the deep links (#title #attract #campaign/<realm> #battle/<map>/<season>/<preset> #event/<id>
// #ending/<id> #about #help #gallery #skirmish), game.debug for tests and tools, and the AI Hub session start.

const session = G.hub.isSession();
const SETTINGS = [
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
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['board', 'iso'], input: G.PRESET, bg: '#07060d', id: 'brigantime',
  autoPause: !session,
  menu: {
    items: () => [
      ['How to Play', () => { G.lastPlayScene = game.sceneName; game.resume(); game.go('help', { back: 'pause' }); }],
      !session && ['Dev Mode', () => { G.Dev.toggle(true); }],
      ['About & Credits', () => { G.lastPlayScene = game.sceneName; game.resume(); game.go('about', { back: 'pause' }); }]
    ].filter(Boolean),
    settings: SETTINGS.map(s => Object.assign({ group: 'Game' }, s)),
    controls: G.CONTROL_NAMES,
    quit: session ? false : 'title',
    saves: session ? false : { slots: 3, version: 2, migrate: (data, from) => G.migrateSave(data, from) }
  }
});
G.game = game;
if (game.input) game.input.glyphs = 'playstation';
try { const sg = game.settings && game.settings.glyphs; if (sg && sg !== 'auto') game.input.glyphs = sg; } catch (e) { /* defaults */ }

/* ---- saves: { v, campaign, seats, story } ---- */
G.saveData = () => {
  const sim = G.Camp.sim; if (!sim) return null;
  const r = sim.currentHuman() || sim.s.humans[0];
  return { data: { v: 2, campaign: sim.serialize(), seats: G.seats || {}, meta: { realms: sim.s.humans, season: sim.season, year: sim.year } }, place: G.get('realm', r).short + ' • ' + G.SEASON_NAME[sim.season] + ' Y' + sim.year + (sim.s.dev ? ' (DEV)' : ''), level: sim.year };
};
G.migrateSave = (data, from) => { if (from < 2 && data && data.campaign && !data.meta) data.meta = { realms: [], season: 'spring', year: 1 }; return data; };
G.autosave = () => { if (session || !game.saves || !G.Camp.sim) return; try { const d = G.saveData(); if (d) game.saves.save('auto', d); } catch (e) { game.fail('autosave', e); } };
G.loadLatest = () => { const s = game.saves && game.saves.latest(); if (s) game.saves.load(s.slot); };
if (!session && game.saves) {
  game.saves.write = () => G.saveData();
  game.saves.read = save => { const d = save.data; const sim = G.CampaignSim.load(d.campaign); G.seats = d.seats || {}; if (sim.s.phase === 'resolve' && sim.s.pending) sim.s.queue.unshift(sim.s.pending.march); G.startCampaign(sim, { loaded: true }); };
  game.saves.canSave = false;
}

/* ---- data validation (boot): every reference resolves ---- */
G.validate = () => {
  const bad = [], need = (kind, id, where) => { if (!G.has(kind, id)) bad.push(where + ': no ' + kind + ' "' + id + '"'); };
  for (const c of G.all('castle')) { for (const e of c.circle) need('monster', e.sp, 'castle ' + c.id); need('site', c.site, 'castle ' + c.id); need('item', c.treasury, 'castle ' + c.id); need('map', c.map, 'castle ' + c.id); for (const r of c.roads) need('castle', r, 'road ' + c.id); }
  for (const k of G.all('knight')) { need('class', k.cls, 'knight ' + k.id); for (const [sp] of k.troop) need('monster', sp, 'knight ' + k.id); if (k.castle) need('castle', k.castle, 'knight ' + k.id); }
  for (const c of G.all('class')) { for (const [s] of c.skills) need('skill', s, 'class ' + c.id); if (c.next) need('class', c.next, 'class ' + c.id); }
  for (const m of G.all('monster')) for (const t of m.skills) for (const s of t) need('skill', s, 'monster ' + m.id);
  for (const s of G.all('site')) need('castle', s.castle, 'site ' + s.id);
  for (const r of Object.values(G.POOLS)) { for (const i of r.items) need('item', i, 'pool'); for (const b of r.beasts) need('monster', b, 'pool'); for (const w of r.wanderers) need('knight', w, 'pool'); }
  for (const e of G.all('event')) for (const l of e.lines) { const sp = l[0]; if (!['narrator', 'ruler', 'knight', 'herald', 'keeper'].includes(sp)) need('knight', sp, 'event ' + e.id); }
  if (bad.length) throw new Error('Bad data: ' + bad.slice(0, 5).join('; '));
  return true;
};

/* ---- scenes: each wrapped so dev mode can open over it ---- */
const scenes = {};
for (const [id, sc] of Object.entries(G.SCENES)) {
  scenes[id] = Object.assign({}, sc, {
    touch: [],
    update(dt) { if (G.Dev.open) { G.inputTick(dt); G.Dev.update(dt); return; } if (game.input.down('create')) game.input.suppress('pause'); return sc.update.call(sc, dt); },
    draw(r) { sc.draw.call(sc, r); if (G.Dev.open) G.Dev.draw(r); },
    enter(d) { G.In.seatInput = null; if (sc.enter) sc.enter.call(sc, d); },
    exit() { if (sc.exit) sc.exit.call(sc); },
    back: sc.back ? function () { return sc.back.call(sc); } : undefined
  });
}
/** a battle spec for dev links and tests: map, season, preset ('duel' | 'siege' | 'sanctum' | 'shrine') */
G.devBattleSpec = (map = 'river_ford', season = 'spring', preset = 'siege') => {
  if (preset === 'sanctum' || map === 'clockwork_sanctum') {
    const s = { seed: 3, map: 'clockwork_sanctum', season, mode: 'sanctum', sides: [{ realm: 'verdance', role: 'att', human: true, items: { herb: 2 }, troops: ['gareth', 'lynette', 'wren'].map(id => G.troopAt(id, 20, { realm: 'verdance' })) }, { realm: 'dominion', role: 'def', troops: [G.CampaignSim.prototype._grayKnightTroop.call(null)] }] };
    return { spec: s, ctx: { kind: 'dev', region: 'hour', sides: ['human', 'ai'], playerSide: 0, onEnd: () => game.go('title') } };
  }
  if (preset === 'shrine' || map === 'wheel_shrine') { const spec = G.skirmishSpec({ map: 'wheel_shrine', season: 'wheel', sides: [{ realm: 'verdance', ctl: 'human', level: 10 }, { realm: 'solmark', ctl: 'normal', level: 10 }, { realm: 'amberlyn', ctl: 'normal', level: 10 }, { realm: 'hoarfast', ctl: 'normal', level: 10 }] }); return { spec, ctx: { kind: 'dev', region: 'hour', sides: ['human', 'ai', 'ai', 'ai'], playerSide: 0, onEnd: () => game.go('title') } }; }
  const spec = G.skirmishSpec({ map, season, sides: [{ realm: 'solmark', ctl: preset === 'ai' ? 'normal' : 'human', level: 8 }, { realm: 'hoarfast', ctl: 'normal', level: 8 }], seed: 4 });
  return { spec, ctx: { kind: 'dev', region: G.get('map', map).hour ? 'hour' : season, sides: [preset === 'ai' ? 'ai' : 'human', 'ai'], playerSide: 0, onEnd: () => game.go('title') } };
};
/** the deep link's scene and data */
function deepLink() {
  if (session) return null;
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h) return null;
  const [a, b, c, d] = h.split('/');
  switch (a) {
    case 'title': return ['title'];
    case 'attract': G.Attract.on = true; return ['attract', {}];
    case 'campaign': { const sim = G.CampaignSim.create({ seed: 7, humans: [G.PLAYABLE.includes(b) ? b : 'verdance'] }); G.Camp.sim = sim; G.fastStory = c === 'fast'; return ['campaign', { fresh: true }]; }
    case 'battle': return ['battle', G.devBattleSpec(b || 'river_ford', c || 'spring', d || 'siege')];
    case 'event': { const sim = G.CampaignSim.create({ seed: 7, humans: ['verdance'] }); return ['event', { id: G.has('event', b) ? b : 'open_verdance', realm: 'verdance', sim, onDone: () => game.go('title') }]; }
    case 'ending': { const sim = G.CampaignSim.create({ seed: 7, humans: ['verdance'] }); const id = G.has('event', b) ? b : 'ending_verdance'; sim.s.result = { kind: id.startsWith('ending_wheel') || id === 'ending_candle' || id === 'ending_fallen' ? 'lose' : 'win', ending: id, realm: id.replace('ending_', '').replace('wheel_', '') }; if (!G.PLAYABLE.includes(sim.s.result.realm)) sim.s.result.realm = 'verdance'; return ['event', { id, realm: sim.s.result.realm, sim, onDone: () => game.go('ending', { sim, bad: sim.s.result.kind !== 'win', title: G.get('event', id).title }) }]; }
    case 'about': return ['about', { back: 'title' }];
    case 'help': return ['help', { back: 'title' }];
    case 'gallery': return ['gallery'];
    case 'skirmish': return ['skirmishSetup', {}];
  }
  return null;
}

/* ---- game.debug: the handle tests and tools read ---- */
game.debug = {
  snapshot() {
    const B = G.Battle, C2 = G.Camp, sim = C2.sim, bs = game.sceneName === 'battle' && B.sim;
    return {
      scene: game.sceneName, phase: sim ? sim.s.phase : null, season: sim ? sim.season : null, year: sim ? sim.year : null, candle: sim ? sim.s.candle : null,
      realm: sim ? sim.currentHuman() : null, mana: sim && sim.currentHuman() ? sim.s.realms[sim.currentHuman()].mana : null, focus: C2.focus, panel: C2.panel ? true : null,
      prompts: G.lastPrompts || [], result: sim && sim.s.result,
      battle: bs ? { map: bs.s.map, bell: bs.s.bell, troop: bs.s.active, mode: B.mode, cursor: B.cursor, over: bs.s.over, units: bs.units.map(u => [u.id, u.side, u.cx, u.cy, u.hp, u.mp, bs.onField(u) ? 'on' : u.dead ? 'dead' : 'off']) } : null,
      event: G.Talk.open ? (G.Talk.cur && G.Talk.cur.line.text) : null, touchOnly: G.In.touchOnly, attract: { on: G.Attract.on, beat: G.Attract.beat }, dev: G.Dev.open, idle: G.In.idle,
      errors: game.errors.map(e => e.message || String(e))
    };
  },
  newCampaign(o = {}) { const sim = G.CampaignSim.create(Object.assign({ seed: 7, humans: ['verdance'], difficulty: 'normal' }, o)); G.startCampaign(sim); return sim; },
  startBattle(d) { game.go('battle', d || G.devBattleSpec()); },
  sim() { return game.sceneName === 'battle' ? G.Battle.sim : G.Camp.sim; },
  cmd(c) { return game.sceneName === 'battle' ? G.Battle.apply(c) : G.Camp.sim.apply(c); },
  autoplay(on = true) { G.autoplayOn = on; },
  setTune: (k, v) => G.setTune(k, v), resetTune: () => G.resetTune(),
  trigger(id) { G.Camp.sim.apply({ t: 'dev', op: 'trigger', id }); G.Camp.todo.unshift({ k: 'takeStory' }); },
  jump(turn) { G.Camp.sim.apply({ t: 'dev', op: 'jump', turn }); },
  hash() { const s = this.sim(); return s ? s.hash() : null; },
  G
};

/* ---- boot ---- */
const steps = [
  ['Winding the Great Clock', () => { G.validate(); }],
  ['Teaching wyverns to sit', () => { for (const s of ['blossom', 'sun', 'oak', 'snowflake', 'hourglass', 'axes']) G.sigil(s, '#ffffff'); for (const e of ['spring', 'summer', 'autumn', 'winter', 'hour', 'none']) G.elemIcon(e); }],
  ['Counting the bells', () => { G.defineSfx(); G.loadTune(); G.UI.loadTips(); }],
  ['Sweeping the cross-quarter roads', () => { G.Camp.wm = new G.WorldMap(); }],
  ['Waking the beasts', () => { for (const r of G.PLAYABLE) G.knightVis(G.get('realm', r).ruler); }]
];
const link = deepLink();
game.start({ scenes, scene: link ? link[0] : session ? 'hubWait' : 'title', data: link ? link[1] : undefined, boot: { title: 'BRIGANTIME', version: G.VERSION, steps, messages: ['Winding the Great Clock', 'Teaching wyverns to sit', 'Counting the bells', 'Sweeping the cross-quarter roads'] } });
if (link && link[1] && game.sceneName === link[0] && scenes[link[0]].enter) { /* the engine passes data on start */ }
if (session) Promise.resolve(game.booted).then(() => G.hub.begin()).catch(e => game.fail('hub', e));
