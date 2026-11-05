/* ============================================================================
 * 99-start: the scenes, the attract mode's wrapper, the AI Hub session, and the start
 * ========================================================================== */
Object.assign(scenes, { corner: CORNER, wire: WIRE, board: BOARD, meet: MEET });
// every play scene runs the attract mode's clock and banner when it is the demo playing
for (const id of ['corner', 'wire', 'board', 'meet']) {
  const sc = scenes[id], up = sc.update, dr = sc.draw, en = sc.enter;
  sc.enter = function (d) { if (!(d && d.attract)) attract.on = false; return en.call(this, d); };
  sc.update = function (dt) { if (attractTick(dt)) return; return up.call(this, dt); };
  sc.draw = function (r) { dr.call(this, r); attractBanner(r); };
  if (id !== 'corner' || !HUB) sc.pausable = true;
}
/* the AI Hub round: a ghost race for evidence on the corner, no title, no menus */
scenes.hubwait = {
  view: 'side', res: 'ps1',
  update() {}, draw(r) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#06070a'); txt(g, 'WIRE ME UP  •  waiting for the round', r.W / 2, r.H / 2, '#f0c060', { align: 'center' }); }); }
};
const _cornerDraw = CORNER.draw;
CORNER.draw = function (r) {
  _cornerDraw.call(this, r);
  if (HUB && window.AIHub && AIHub.time() < 0) r.overlay(g => { const s = AIHub.time() === -Infinity ? 'GET READY' : 'STARTS IN ' + Math.ceil(-AIHub.time() / 1000); px.blend(g, .6, 'normal', () => px.rect(g, 0, r.H / 2 - 20, r.W, 40, '#000')); txt(g, s, r.W / 2, r.H / 2 - 7, '#ffd060', { align: 'center', scale: 2 }); });
};
async function hubStart() {
  const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] });
  if (!info) { game.go('title'); return; }
  AIHub.on('message', (data, from) => CORNER.onGhost(data, from));
  AIHub.on('leave', (e) => CORNER.dropGhost(e && e.id));
  AIHub.on('time-up', () => { CORNER.hubScore(true); });
  AIHub.on('end', () => { CASE.hubEnded = true; music(null); A.setVolume(0); game.input.clear(); game.stop(); });
  HUBSTATE.on = true;
  game.go('corner', null, { fade: 0 });
  AIHub.ready();
}
game.start({ scenes, scene: HUB ? 'hubwait' : (scenes[(location.hash || '').slice(1)] ? location.hash.slice(1) : 'title'),
  boot: { title: 'WIRE ME UP', steps: [['Wiring the block', () => {}]] } });
if (HUB) hubStart();
window.__wire = { game, CASE, scenes, attract: () => attract };
