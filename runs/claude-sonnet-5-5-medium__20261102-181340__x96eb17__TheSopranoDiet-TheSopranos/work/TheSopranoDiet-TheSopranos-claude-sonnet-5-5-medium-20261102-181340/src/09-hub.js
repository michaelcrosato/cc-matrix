/* AI Hub session (protocol v1): ghost mode. Everyone plays the same Main Street round, seeded alike, and sees the others as ghosts. */
(() => {
const G = SD, E = G.E, game = G.game, W = G.W;
const ROUND_MS = 240000;
G.hubState = G.HUB ? 'wait' : 'none';
let sent = 0, progT = 0, resultSent = false, ended = false, info = null;
G.hubGoing = () => G.HUB && W.hubGo && !ended;
G.hubClock = () => {
  if (!info || !W.hubGo) return AIHub.time() > -Infinity && AIHub.time() < 0 ? String(Math.ceil(-AIHub.time() / 1000)) : '';
  const left = Math.max(0, Math.ceil((Math.min(ROUND_MS, info.limitMs || ROUND_MS) - AIHub.time()) / 1000));
  return Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
};
const sendResult = () => {
  if (resultSent) return; resultSent = true; const S = G.S;
  AIHub.result({ score: G.calcScore(), stats: { Take: G.fmt(S.cash), Rank: G.RANKS[G.rank()], Knockouts: S.kills, 'Panic attacks': S.panics }, awards: [S.kills >= 10 ? { title: 'Enforcer', detail: S.kills + ' knockouts' } : { title: 'Collector', detail: G.fmt(S.cash) + ' taken' }] });
};
G.hubTick = dt => {
  if (!G.HUB || G.hubState === 'none') return;
  W.hubGo = AIHub.time() >= 0 && !ended;
  for (const id in W.ghosts) {
    const gh = W.ghosts[id]; const px0 = gh.x, py0 = gh.y;
    gh.x += (gh.tx - gh.x) * Math.min(1, dt * 10); gh.y += (gh.ty - gh.y) * Math.min(1, dt * 10);
    gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx: (gh.x - px0) / dt, vy: (gh.y - py0) / dt, facing: gh.f || 0 });
  }
};
G.hubProgress = dt => {
  if (!G.HUB || G.hubState !== 'ready' || ended) return;
  const t = AIHub.time(); if (t < 0) return;
  progT += dt; sent += dt;
  if (sent > .1 && W.hero) { sent = 0; AIHub.send({ a: W.A.name, x: Math.round(W.hero.body.x * 10) / 10, y: Math.round(W.hero.body.y * 10) / 10, f: Math.round(W.hero.facing * 100) / 100 }, { reliable: false }); }
  if (progT > 1) { progT = 0; AIHub.progress({ score: G.calcScore(), label: G.fmt(G.S.cash) + ' | ' + G.RANKS[G.rank()] }); }
  if (t >= Math.min(ROUND_MS, (info && info.limitMs) || ROUND_MS)) sendResult();
};
if (G.HUB) {
  AIHub.connect({ mode: 'ghost', seats: [1, 4] }).then(i => {
    if (!i) { G.HUB = false; G.hubState = 'none'; return; }
    info = i; G.info = i; G.hubState = 'ready';
    AIHub.on('message', (d, from) => {
      const p = info.players.find(q => q.id === from) || { name: 'P' + from, color: '#ffffff' };
      let gh = W.ghosts[from];
      if (!gh) { const base = G.RIGDEFS.tommy; gh = W.ghosts[from] = { rig: G.makeRig('tommy', { colors: Object.assign({}, base.colors, { cloth: p.color }) }), name: String(p.name || 'P' + from), color: p.color, x: d.x, y: d.y }; }
      gh.a = d.a; gh.tx = d.x; gh.ty = d.y; gh.f = d.f; if (Math.abs(gh.x - d.x) > 90 || Math.abs(gh.y - d.y) > 90) { gh.x = d.x; gh.y = d.y; }
    });
    AIHub.on('start', () => { G.stopMusic(); });
    AIHub.on('time-up', sendResult);
    AIHub.on('leave', ev => { delete W.ghosts[ev.id]; });
    AIHub.on('end', () => { ended = true; W.cut = true; G.stopMusic(); try { game.audio.mute(); } catch (e) {} });
    G.S = G.fresh(); Object.assign(G.S.flags, { yardDone: true, intro: true, bread: true, townIntro: true, ambushStarted: true, ambushDone: true }); G.S.chap = 1; G.S.area = 'town';
    game.go('play', { round: true, demo: false, area: 'town' }, { fade: 0 });
    AIHub.ready();
  });
}
})();
