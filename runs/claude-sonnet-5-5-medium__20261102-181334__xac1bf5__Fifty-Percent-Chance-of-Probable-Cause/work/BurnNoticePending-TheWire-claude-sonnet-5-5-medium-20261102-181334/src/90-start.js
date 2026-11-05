/* ---- attract hooks on every scene the demo visits ---- */
for (const n of ['street', 'wire', 'board', 'raid', 'results']) {
  const sc = scenes[n], u = sc.update, d = sc.draw, e = sc.enter;
  sc.enter = function (data) { HUB.last = n; return e ? e.call(this, data) : undefined; };
  sc.update = function (dt) { if (DEMO) { attract.t += dt; if (attractInput()) { exitAttract(); return; } } return u.call(this, dt); };
  sc.draw = function (r) {
    d.call(this, r);
    if (DEMO) r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .8, 'normal', () => panel(g, W / 2 - 100, H - 36, 200, 20)); if (Math.floor(game.time * 1.6) % 2) txt(g, 'DEMO: PRESS ANY BUTTON', W / 2, H - 30, COL.gold, { align: 'center' }); txt(g, 'ATTRACT MODE', W - 8, H - 12, '#fff', { align: 'right' }); });
  };
}
/* ---- AI Hub: parallel mode. In a session the game opens straight into the round ---- */
const hubOn = !!(window.AIHub && AIHub.active);
const hash = (location.hash || '').slice(1);
if (hubOn) {
  HUB.active = true; HUB.started = false;
  game.start({ scenes, scene: 'hubload' });
  const fallback = () => { HUB.active = false; HUB.started = true; game.go('title'); };
  AIHub.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) return fallback();
    HUB.info = info; S = BLANK(); DEMO = false; game.go('street'); AIHub.ready();
    AIHub.on('time-up', () => { S.score = Math.round(scoreNow()); hubResult(); });
    AIHub.on('end', () => { hubDone = true; try { A.mute(); } catch (e) { /* none */ } game.timeScale = 0; I.clear && I.clear(); });
  }).catch(fallback);
} else {
  game.start({ scenes, scene: scenes[hash] ? hash : 'title' });
}
window.__game = { game, scenes, talk, S: () => S, setS: v => { S = v; }, BLANK, EVID, CALLS, CHARGES, OPT, startAttract, get demo() { return DEMO; } };
