// 99-start: the game, scenes, boot, and the AI Hub path
const inHub = typeof AIHub !== 'undefined' && AIHub.active;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso'], input: KEYS, id: 'wiretap',
  menu: { items: [['Back to title', () => game.go('title')]], settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: inHub ? false : 'title', saves: false }, autoPause: !inHub });
E.style.propSize = 1.35;
installGamepadInversion(game);
try { game.input.touchEnabled = false; } catch (e) { /* ignore */ }
UI.init(); Hud.init();
const scenes = { title: Scenes.title, card: Scenes.card, annex: Scenes.annex, field: Scenes.field, montage: Scenes.montage, credits: Scenes.credits, hubWait: withGlobals({ draw(r) { r.sky(['#08090e', '#171a24']); r.text('Connecting…', r.W / 2, r.H / 2, '#ddd', { align: 'center' }); } }) };
if (inHub) scenes.field.pausable = false;
const boot = { title: 'WIRETAP', version: '1.0', steps: [['Laying Ridley Avenue', () => { makeMap(); }], ['Hanging the phone lines', () => { Object.keys(SONGS).forEach(k => { if (!SONGS[k].tracks.length) game.fail('data', new Error('empty song ' + k)); }); }], ['Waking the block', () => { Object.values(CAST).forEach(c => mkRig(c.rig)); }], ['Checking the paperwork', () => { validateData(); }], ['Charging the pagers', () => { Object.keys(SFX).forEach(k => { try { game.audio.define && game.audio.define(k, SFX[k]); } catch (e) { game.fail('sfx ' + k, e); } }); }]], messages: ['Pouring the coffee', 'Juking the stats', 'Filling out the 24-hour report', 'Finding a parking space on Ridley'] };
function validateData() { for (const s of STORY) { if (s.t === 'field' && !MISSIONS[s.m]) game.fail('data', new Error('missing mission ' + s.m)); } }
game.debug = { snapshot: () => ({ scene: game.sceneName, ui: UI.cur && UI.cur.title, dana: Field.dana && [Math.round(Field.dana.x), Math.round(Field.dana.y)], photos: STATE.photos.length, beat: STATE.beat, attract: Attract.active, film: STATE.film }), Field, Director, Screens, STATE: () => STATE, Attract, UI, Net, toEnd() { STATE.beat = STORY.length - 1; Director.run(); } };
if (inHub) (async () => {
  game.start({ scenes, scene: 'hubWait', boot });
  AIHub.on('start', () => { Hud.toast('Go', 'Build the best case'); });
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4] });
  if (!info) { game.go('title'); return; }
  Net.begin(info); AIHub.ready();
  let last = performance.now(); Net.stamp = () => { last = performance.now(); };
  setInterval(() => { const now = performance.now(), gap = now - last; if (Net.on && Net.isHost && gap > 400 && game.sceneName === 'field') { last = now; try { game.advance(Math.min(1, gap / 1000)); } catch (e) { /* ignore */ } } }, 250);
})().catch(e => { game.fail('hub', e); AIHub.fail(String((e && e.message) || e)); });
else game.start({ scenes, scene: 'title', boot });
