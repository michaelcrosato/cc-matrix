/* AI Hub, Session Protocol v1, ghost mode: every player drives the same Parallel Run on their own copy; each copy sends where its
 * train is, and the others appear as coloured ghost trains. Outside a session none of this runs. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, txt = DH.txt, R = DH.route;
const H = DH.hub = { active: false, info: null, ghosts: new Map(), started: false, done: false, sendT: 0, progT: 0, over: false };
DH.hubPlaying = () => H.started && !H.over;
DH.hubEnter = (d) => { d.ghosts = []; H.drive = d; d.run.oncoming = []; };
DH.hubTick = (d, dt) => {
  if (!H.active || !window.AIHub) return;
  const run = d.run;
  H.sendT += dt; H.progT += dt;
  if (H.sendT > .12) { H.sendT = 0; AIHub.send({ s: run.s - run.s0, v: run.v, st: run.results.length, sc: Math.round(run.score) }, { reliable: false }); }
  if (H.progT > 1) { H.progT = 0; AIHub.progress({ score: Math.round(run.score), label: run.results.length + '/' + run.stops.length + ' stops' }); }
  d.ghosts = [...H.ghosts.values()].map(g => ({ s: run.s0 + g.s, len: 120, lane: 0, color: g.color }));
};
DH.hubFinish = (d, sum) => {
  if (H.done) return; H.done = true; H.over = true;
  if (window.AIHub && AIHub.active) AIHub.result({ score: Math.round(sum.score), stats: { 'Perfect stops': sum.perfect, 'Halo Time left': sum.halo, 'Rank': sum.rank }, awards: sum.perfect ? [{ title: 'Eagle Eye', detail: sum.perfect + ' PERFECT stop(s)' }] : [] });
  H.sum = sum;
};
DH.hubFail = (d) => { if (H.done) return; H.done = true; H.over = true; H.sum = { score: Math.round(d.run.score), rank: 'F', failed: d.run.failed }; if (window.AIHub && AIHub.active) AIHub.result({ score: Math.round(d.run.score * .5), stats: { 'Result': d.run.failed } }); };
DH.hubDraw = (g, W, Hh, d) => {
  const run = d.run;
  // board
  const rows = [{ name: 'YOU', color: (H.info && H.info.players.find(p => p.id === H.info.me) || { color: '#fff' }).color, s: run.s - run.s0, sc: Math.round(run.score) }];
  for (const [id, gh] of H.ghosts) rows.push({ name: gh.name, color: gh.color, s: gh.s, sc: gh.sc });
  rows.sort((a, b) => b.sc - a.sc);
  const x = W - 100, y0 = 44; px.rect(g, x - 2, y0 - 2, 98, 6 + rows.length * 9, '#000a');
  rows.forEach((r, k) => { px.rect(g, x, y0 + 1 + k * 9, 4, 6, r.color); txt(g, r.name.slice(0, 9), x + 7, y0 + k * 9, '#fff', { font: 'tiny' }); txt(g, String(r.sc), x + 94, y0 + k * 9, '#ffd36a', { font: 'tiny', align: 'right' }); });
  if (window.AIHub && AIHub.active && !H.started) { const t = AIHub.time(); txt(g, isFinite(t) ? String(Math.ceil(-t / 1000)) : 'READY', W / 2, 70, '#fff', { align: 'center', scale: 4 }); }
  if (H.over) { px.rect(g, 0, Hh / 2 - 22, W, 44, '#000c'); txt(g, H.sum && H.sum.rank !== 'F' ? 'RUN COMPLETE  ' + H.sum.score + ' PTS' : 'RUN OVER', W / 2, Hh / 2 - 14, '#ffd23a', { align: 'center', scale: 2 }); txt(g, 'Waiting for the results...', W / 2, Hh / 2 + 6, '#fff', { align: 'center' }); }
};
DH.hubInit = async () => {
  if (!(window.AIHub && AIHub.active)) return null;
  const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] });
  if (!info) return null;
  H.active = true; H.info = info;
  AIHub.on('message', (data, from) => { const p = info.players.find(q => q.id === from) || { name: 'P' + from, color: '#ccc' }; H.ghosts.set(from, { s: data.s, v: data.v, st: data.st, sc: data.sc || 0, name: p.name || ('P' + from), color: p.color }); });
  AIHub.on('start', () => { H.started = true; });
  AIHub.on('time-up', () => { if (!H.done && H.drive) { const r = H.drive.run; H.done = true; H.over = true; AIHub.result({ score: Math.round(r.score) }); } });
  AIHub.on('leave', e => { H.ghosts.delete(e.id); });
  AIHub.on('end', () => { H.over = true; DH.soundStop(); const a = E.current && E.current.audio; if (a && a.mute) a.mute(); });
  return info;
};
// the time gate: play begins when the hub's clock reaches zero
setInterval(() => { if (H.active && !H.started && window.AIHub && AIHub.time() >= 0) H.started = true; }, 50);
})();
