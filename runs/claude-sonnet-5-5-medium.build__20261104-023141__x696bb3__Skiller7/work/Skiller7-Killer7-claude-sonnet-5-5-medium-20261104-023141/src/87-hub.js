// AI Hub integration (Session Protocol v1, ghost mode): in a session the game opens straight into Echo Run, sends its racer
// to the others, and reports its time. On its own, Echo Run races your own recorded echo.
const Hub = S7.hub = { active: false, info: null, ended: false, sent: 0, prog: 0, finished: false, last: null };
Hub.init = async function () {
  const A = typeof window !== 'undefined' && window.AIHub; if (!A || !A.active) return null;
  try { const info = await A.connect({ mode: 'ghost', seats: [1, 4] }); if (info) { Hub.active = true; Hub.info = info; Hub.attach(); } return info; } catch (e) { return null; }
};
Hub.attach = function () {
  const A = window.AIHub;
  A.on('message', (d, from) => { const ec = S7.st.echo; if (!ec || !d || typeof d !== 'object') return; const pl = (A.players || []).find(p => p.id === from); ec.others[from] = { area: d.a, edge: d.e, s: +d.s || 0, persona: S7.reg.personas[d.p] ? d.p : 'rurik', name: pl ? pl.name : 'P' + from }; });
  A.on('leave', d => { const ec = S7.st.echo; if (ec && ec.others) delete ec.others[d.id]; });
  A.on('time-up', () => { Hub.report(true); });
  A.on('end', () => { Hub.ended = true; });
};
Hub.sessionTime = () => { try { return window.AIHub.time(); } catch (e) { return -Infinity; } };
Hub.tick = function (dt) {
  const st = S7.st, ec = st.echo; if (!Hub.active || !ec || Hub.ended) return;
  const tm = Hub.sessionTime();
  if (!ec.started) { ec.countdown = tm === -Infinity ? 3 : Math.max(0, -tm / 1000); if (tm !== -Infinity && tm >= 0) { ec.countdown = 0.001; } }
  Hub.sent -= dt;
  if (Hub.sent <= 0 && ec.started) { Hub.sent = .125; window.AIHub.send({ a: st.area, e: st.edge, s: +st.s.toFixed(1), p: st.persona }, { reliable: false }); }
  Hub.prog -= dt;
  if (Hub.prog <= 0) { Hub.prog = 1; const G = S7.graph(); let dist = 0; for (const id of ['s1', 's2', 's3']) { if (id === st.edge) { dist += st.s; break; } dist += G.edges[id].len; } window.AIHub.progress({ score: Math.round(dist), label: Math.round(dist) + ' m' }); }
  if (ec.finished && !Hub.finished) Hub.report(false);
};
Hub.report = function (timeUp) {
  if (!Hub.active || Hub.finished) return; const ec = S7.st.echo; if (!ec) return; Hub.finished = true;
  try {
    if (ec.result) window.AIHub.result({ time: Math.max(1, Math.round(Hub.sessionTime() - ec.result.cut * 1000)), stats: { 'Targets thawed': ec.result.hits + '/' + ec.result.total, 'Time cut': ec.result.cut + ' s' }, awards: ec.result.hits === ec.result.total ? [{ title: 'Clean Sweep', detail: 'Every target thawed' }] : [] });
    else { const G = S7.graph(); let dist = 0; for (const id of ['s1', 's2', 's3']) { if (id === S7.st.edge) { dist += S7.st.s; break; } dist += G.edges[id].len; } window.AIHub.result({ score: Math.round(dist) }); }
  } catch (e) { S7.fail('hub result', e); }
};
// the solo echo: your best run, kept in storage
Hub.loadEcho = function () { try { const t = localStorage.getItem('skiller7:echo'); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
Hub.saveEcho = function (time, rec) { try { const old = Hub.loadEcho(); if (!old || time < old.time) localStorage.setItem('skiller7:echo', JSON.stringify({ time, rec })); } catch (e) { /* storage blocked */ } };
S7.bus.on('echo', d => { if (d.kind === 'finish') { const ec = S7.st.echo; Hub.saveEcho(d.result.time, ec.rec); Hub.last = d.result; } });
