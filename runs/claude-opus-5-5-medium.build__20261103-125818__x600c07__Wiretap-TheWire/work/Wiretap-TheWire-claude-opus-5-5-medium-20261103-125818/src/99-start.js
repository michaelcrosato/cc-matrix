// WIRETAP: start. The game, its standard menu (Save/Load in the pause menu, the game settings), E.Shell's HUD, the boot
// steps, every scene (each through the globals), the save state, the debug handle and deep links, and the hub's path.
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso'], input: KEYS, id: 'wiretap', bg: '#07060a', autoPause: !HUB,
  menu: { items: HUB ? [] : [['Restart this part', () => { game.resume(); Director.restartBeat(); }], ['Episode select', () => { game.resume(); Director.toEpisodes(); }]], settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: HUB ? false : 'title', saves: !HUB } });
E.style.propSize = 1.35;
installGamepadInversion(game);
const THEME = { ink: '#f2ead8', paper: '#141210', accent: '#ffb347', muted: '#9a9080', danger: '#ff5a4a', line: '#3a342c', font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', titleFont: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif' };
const ui = new E.Shell(game, { theme: THEME, meters: .0625 });
game.input.touchEnabled = false;
game.saves.write = () => ({ data: STATE, place: 'Ep ' + STATE.ep + ' · ' + (EPIS[STATE.ep] || EPIS[1]).title, level: 'Episode ' + STATE.ep });
game.saves.read = s => { STATE = Object.assign(freshState(), s.data); Director.start(STATE.beat, { noSave: true, restart: true }); };
game.saves.canSave = false;
for (const p of game.players || [game.input]) p.glyphs = game.settings.padSymbols || 'playstation';
BUS.on('device', d => { if (d === 'pad') for (const p of game.players || [game.input]) p.glyphs = game.settings.padSymbols || 'playstation'; });
const SCENES = { title: Title, field: Field, annex: Annex, room: Room, card: Card, montage: Montage, credits: Credits, shutdown: Shutdown, versus: Versus, hubWait: HubWait };
/** a content check: every mission, beat and call points at things that exist */
function validateData() {
  const bad = [];
  for (const b of BEATS) { if (b.kind === 'field' && !MISSIONS[b.m]) bad.push('beat ' + b.id + ': no mission ' + b.m); if (b.il && !INTERLUDES[b.il]) bad.push('beat ' + b.id + ': no interlude ' + b.il); if (b.kind === 'room' && !ROOMS[b.room]) bad.push('beat ' + b.id + ': no room ' + b.room); }
  for (const [sid, list] of Object.entries(CALLS)) for (const c of list) { if (c.page) continue; if (!c.sp.every(w => VOICES[w])) bad.push('call ' + c.id + ': a voice is missing'); }
  for (const [id, [cx, cy]] of Object.entries(POI)) if (!World.map.walkable(Math.floor(cx), Math.floor(cy)) && !['stash', 'v1412', 'garageSide', 'garageRoll', 'mamabBack'].includes(id)) bad.push('POI ' + id + ' not walkable');
  for (const [k] of Object.entries(ESC)) if (!World.map.walkable(...ESC[k].map(Math.floor))) bad.push('escape node ' + k + ' not walkable');
  if (bad.length) game.fail('validateData', new Error(bad.join('; ')));
  return bad;
}
const BOOT = { title: 'WIRETAP', version: '1.0', messages: ['Pouring the coffee', 'Juking the stats', 'Filling out the 24-hour report', 'Finding a parking space on Ridley'],
  steps: [['Laying Ridley Avenue', () => { World.build(); for (const id of ['P1', 'P2', 'P3', 'post', 'handoff', 'chevy']) World.flow(...POI[id]); }], ['Hanging the phone lines', () => {}],
    ['Waking the block', () => { for (const id of Object.keys(CAST)) rigOf(id); }], ['Checking the paperwork', () => validateData()],
    ['Charging the pagers', () => { defineSounds(game.audio); Talk.init(); UI.init(); Prompt.init(); Touch.init(); }]] };
const wrap = s => s;   // every scene's update begins with Globals.tick (the idle timer, attract, prompts, ambience)
const scenes = Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, wrap(v)]));
game.debug = {
  snapshot: () => ({ scene: game.sceneName, ep: STATE.ep, beat: STATE.beat, meters: STATE.meters, flags: Object.fromEntries(Object.entries(STATE.flags).filter(([, v]) => v)), facts: STATE.facts.length, evidence: STATE.evidence.length,
    dana: FD.me ? [Math.round(FD.me.x), Math.round(FD.me.y)] : null, objective: game.sceneName === 'field' && FD.m && FD.m.objective ? (FD.m.objective(FD) || {}).title : null, attract: Attract.on, ui: UI.top() && UI.top().id,
    versus: Versus.sim ? { ev: Versus.sim.ev, cn: Versus.sim.corner.led.banked + Versus.sim.corner.led.cash, t: Math.round(Versus.sim.t), over: Versus.sim.over } : null, errors: game.errors.length }),
  jump: id => Director.start(id), preset: ep => Director.preset(ep), state: () => STATE, Globals, Talk, Camera, Director, Attract, UI, Versus, FD, World, Cipher, Wire, Board, Box, Paper, CornerSim, MISSIONS, BEATS
};
if (typeof window !== 'undefined') window.__wt = game.debug;
/** deep links: #title #attract #about #ep<N> #ep<N>.<beat> (#ep3.wire2) #versus.bots #versus.local */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1);
  if (!h || h === 'title') return;
  if (h === 'attract') return Attract.start();
  if (h === 'about') { UI.closeAll(); return About.open(() => Title.menu()); }
  let m = h.match(/^ep(\d)(?:\.(.+))?$/); if (m) { Director.preset(+m[1]); if (m[2]) { const id = 'e' + m[1] + '.' + m[2]; if (Director.find(id) >= 0) Director.start(id); } return; }
  if (h === 'versus.bots') return REEL.find(v => v.id === 'game').go();
  if (h === 'versus.local') { UI.closeAll(); return Title.vsetup(); }
}
if (HUB) (async () => {
  game.start({ scenes, scene: 'hubWait', boot: BOOT });
  await game.booted;
  const info = await Net.connectHub(scenes);
  if (!info) { game.go('title', {}); return; }
  HUB.ready();
})().catch(e => { game.fail('hub', e); try { HUB.fail(String((e && e.message) || e)); } catch (x) {} });
else { game.start({ scenes, scene: 'title', boot: BOOT }); Promise.resolve(game.booted).then(() => setTimeout ? setTimeout(deepLink, 50) : deepLink()); }
