/* 99-start: the game, its standard menu (with the game's settings, names on the Controls screen and save slots), the
   HTML shell, the boot steps, deep links, and either the title or (inside an AI Hub session) straight into a round. */
const THEME = { ink: '#f2ead8', paper: '#141210', accent: '#ffb347', muted: '#9a9080', danger: '#ff5a4a', line: '#3a342c', font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', titleFont: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif' };
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active;
game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso'], input: KEYS, id: 'wiretap', bg: '#060506', autoPause: !HUB,
  menu: { items: HUB ? [] : [['Restart this part', () => { game.resume(); Director.restartBeat(); }], ['Episode select', () => { game.resume(); Director.episodeMenu(); }]],
    settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: HUB ? false : 'title', saves: !HUB } });
E.style.propSize = 1.35;
installGamepadInversion(game);
shell = new E.Shell(game, { theme: THEME, meters: .0625 });
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(STATE)), place: 'Ep ' + STATE.ep + ' · ' + EPISODES[STATE.ep - 1].title, level: 'Episode ' + STATE.ep });
game.saves.read = s => { restoreState(s.data); UI.closeAll(); game.resume(); Director.go(STATE.beat, { noSave: true }); };
game.saves.canSave = false;
UI.init(); Talk.init(); Snd.define();
// chorded mouse buttons (hold right to watch, click left to shoot): browsers report a second button as a pointermove
// with e.button set, not a pointerdown, and the engine listens to pointerdown/up only
if (!HEADLESS) { const cv = document.getElementById('screen'); if (cv) cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || e.button < 0) return; const bit = [1, 4, 2, 8, 16][e.button] || 0; if (e.buttons & bit) game.input.press('Mouse' + e.button); else game.input.release('Mouse' + e.button); }); }
// E.Shell's key chips get the same colored glyphs as ours
if (!HEADLESS && typeof MutationObserver !== 'undefined') {
  const paint = root => { for (const n of root.querySelectorAll('.esh-k, .esh-pr kbd, .esh-keys b')) { const t = n.textContent.trim(), g = GLYPH[t]; n.classList.remove('g-cross', 'g-circle', 'g-square', 'g-tri', 'g-xa', 'g-xb', 'g-xx', 'g-xy'); if (g && Prompts.dev === 'gamepad') n.classList.add('g-' + g[0]); } };
  const mo = new MutationObserver(() => { mo.disconnect(); try { paint(document.body); } finally { mo.observe(document.body, { subtree: true, childList: true, characterData: true }); } });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true });
}
Object.assign(scenes, VersusScenes);
for (const k in scenes) if (!scenes[k].__wrapped) scenes[k].__wrapped = true;
const BOOT = { title: 'WIRETAP', version: '1.0', messages: ['Pouring the coffee', 'Juking the stats', 'Filling out the 24-hour report', 'Finding a parking space on Ridley'],
  steps: [['Laying Ridley Avenue', () => { World.build(); Flow.reset(World.map); }], ['Hanging the phone lines', () => { E.shapeInfo && E.shapeInfo('payphone'); }],
    ['Waking the block', () => { for (const id in PEOPLE) rigOf(id); }], ['Checking the paperwork', () => { DATA_PROBLEMS = validateData(); }],
    ['Charging the pagers', () => { Snd.define(); }]] };
installDebug();
let DATA_PROBLEMS = [];
game.booted.then(() => { if (DATA_PROBLEMS.length) game.fail('data', new Error(DATA_PROBLEMS.length + ' data problems: ' + DATA_PROBLEMS.slice(0, 8).join(' | '))); });
if (HUB) {
  (async () => {
    game.start({ scenes, scene: 'hubWait', boot: BOOT });
    await game.booted;
    Net.hubStart();
  })().catch(e => { game.fail('hub', e); try { AIHub.fail(String((e && e.message) || e)); } catch (e2) { /* gone */ } });
} else {
  Globals.init();
  const link = (typeof location !== 'undefined' && location.hash || '').slice(1);
  const first = deepLink(link);
  game.start({ scenes, scene: first.scene, data: first.data, boot: BOOT });
  if (first.after) game.booted.then(first.after);
}
if (typeof window !== 'undefined') window.__wiretap = { game, STATE: () => STATE, Director, UI, World, Cam, Perception, Board, Box, Paper, Wire, Versus, Mission, Globals, ORDER, rot, decodeWith, Net, Attract, BotCtl, Flow, Talk, Annex, BOARD, readableRole, onReadRole, PEOPLE, RAID_SPOTS, Cipher, TeeShift, Cipher_solved: () => Cipher.solved(Cipher.sel), BEATS };
