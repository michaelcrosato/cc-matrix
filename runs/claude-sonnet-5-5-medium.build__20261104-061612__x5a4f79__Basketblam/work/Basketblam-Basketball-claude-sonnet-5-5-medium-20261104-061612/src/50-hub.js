/* BASKETBLAM - AI Hub integration (Session Protocol v1, parallel mode): "BLAM SHOWDOWN".
   Every player plays the same seeded game against the same CPU crew; the biggest point lead tops the scoreboard. */
const hubState = { info: null, started: false, ended: false, done: false, lastProg: 0, timeUp: false };
function hubCfg() {
  const R = HUB && window.AIHub.rng ? window.AIHub.rng('showdown') : E.rng(5);
  const home = Math.floor(R() * 3), away = [3, 4, 1, 2, 0].filter(t => t !== home)[Math.floor(R() * 4)];
  return { teams: [home, away], court: COURT_ORDER[Math.floor(R() * 4)], mode: 'hub', humans: { 0: game.input }, qLen: 32, difficulty: 'Pro', seed: ((hubState.info && hubState.info.seed) | 0) || 77, noOT: true, hub: true };
}
function hubWaiting() { return S.hub && !hubState.started && HUB; }
function hubStep(dt) {
  const M = S.match, A_ = window.AIHub; if (!M) return;
  if (hubState.ended) return;
  if (!hubState.done && M.time - hubState.lastProg > 1) { hubState.lastProg = M.time; try { A_.progress({ score: M.score[0] - M.score[1], label: 'Q' + M.quarter + ' ' + M.score[0] + '-' + M.score[1] }); } catch (e) { } }
}
function hubFinish(why) {
  if (hubState.done || !HUB) return; hubState.done = true;
  const M = S.match, me = S.players[0], diff = M ? M.score[0] - M.score[1] : 0, pts = me ? me.st.pts : 0;
  const stats = { Points: pts, Dunks: me.st.dunks, Blocks: me.st.blocks, Steals: me.st.steals, 'Style': me.st.style };
  const awards = []; if (me.st.dunks >= 3) awards.push({ title: 'Rim Wrecker', detail: me.st.dunks + ' dunks' }); if (me.st.blocks >= 2) awards.push({ title: 'Gatekeeper', detail: me.st.blocks + ' blocks' });
  try { window.AIHub.result({ score: Math.max(0, 1000 + diff * 25 + pts), stats, awards }); } catch (e) { game.fail('hub result', e); }
}
function hubPrepare(info) {
  hubState.info = info; S.hub = hubState;
  game.go('match', { hub: true }, { fade: 0 });
}
function hubConnect() {
  const A_ = window.AIHub;
  A_.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title'); return; }
    hubPrepare(info);
    A_.on('start', () => { hubState.started = true; });
    A_.on('time-up', () => { hubState.timeUp = true; if (S.match && !S.match.over) { S.match.over = false; } hubFinish('timeup'); });
    A_.on('end', () => { hubState.ended = true; hubState.done = true; try { game.audio.mute && !game.audio.muted && game.audio.mute(); crowdStop(); music(null); } catch (e) { } game.input.consumeAll(); });
    A_.on('leave', () => { });
    A_.ready();
  }).catch(e => { game.fail('hub connect', e); game.go('title'); });
}
scenes.hubwait = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { L.enabled = false; },
  update() { }, draw(r) { r.sky(['#0a0620', '#2a0f48', '#7a1a50']); r.overlay(g => { bigText(g, 'BASKETBLAM', r.W / 2, r.H / 2 - 20, { scale: 4 }); txt(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2 + 24, '#ffe8c8', { align: 'center' }); }); }
};
