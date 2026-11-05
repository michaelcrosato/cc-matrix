/* AI HUB (Session Protocol v1, ghost mode): in a session the game opens straight into an Echo Run round, no title, menus
 * or prompts; connect() in the first boot step, ready() once the world is built, the countdown on AIHub.time(), our
 * place sent ten times a second (unreliable), the others drawn as echoes in their seat colours, progress about once a
 * second, one result, time-up answered at once, end: no input, no sound. Outside a session none of this runs. */
S7.hubConnect = async (game, sim) => {
  let info = null;
  try { info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] }); } catch (e) { info = null; }
  if (!info) { S7.inSession = false; S7.noPersist = false; S7.hub = null; return; }
  if (S7.touchOnly()) { AIHub.fail('Controller or keyboard required'); }
  const H = S7.hub = { info, players: {}, readied: false, started: false, resultSent: false, ended: false, progT: 0, sendT: 0 };
  AIHub.on('start', () => { H.started = true; });
  AIHub.on('message', (data, from) => {
    if (!data || typeof data !== 'object' || from === info.me) return;
    const p = H.players[from] || (H.players[from] = { id: from });
    if (data.t === 'g') { p.e = data.e; p.s = data.s; p.a = data.a; p.y = data.y; p.seen = true; }
    if (data.t === 'done') p.done = data.time;
  });
  AIHub.on('leave', d => { if (d) delete H.players[d.id]; });
  AIHub.on('time-up', () => { if (!H.resultSent && sim.echoRun) { H.resultSent = true; AIHub.result({ score: sim.echoRun.metres() }); } });
  AIHub.on('end', () => {
    H.ended = true;
    try { game.input.clear(); } catch (e) { /* none */ }
    try { game.audio.stopMusic(0); game.audio.mute(true); } catch (e) { /* no sound */ }
    S7.pointerLock(false);
  });
  H.ready = () => { if (H.readied) return; H.readied = true; AIHub.ready(); };
  H.tick = (sim2, R, dt) => {
    const E1 = sim2.echoRun;
    if (H.ended) { R.ended = true; return; }
    if (R.phase === 'wait' && H.started) R.phase = 'count';
    // the others, drawn where they are (eased toward the latest sample)
    const seat = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'], list = [];
    for (const id in H.players) {
      const p = H.players[id]; if (!p.seen) continue;
      const e = sim2.rails.edges[E1.edges[p.e]]; if (!e) continue;
      const q = e.path.at(p.s); p.x = p.x === undefined ? q.x : p.x + (q.x - p.x) * .2; p.y2 = p.y2 === undefined ? q.y : p.y2 + (q.y - p.y2) * .2; p.z = q.z;
      const pl = (info.players || []).find(x => String(x.id) === String(id));
      list.push({ id, x: p.x, y: p.y2, z: p.z, yaw: (p.y || 0) / 100, aim: p.a, name: pl ? String(pl.name) : 'P' + (Number(id) + 1), color: pl && pl.color || seat[Number(id) % 4] });
    }
    S7.ghosts = list;
    if (!H.started || R.phase === 'wait') return;
    // send our place ten times a second, and progress about once a second (on the clock: the protocol's time is real time)
    const now = typeof performance !== 'undefined' ? performance.now() / 1000 : (H.clock = (H.clock || 0) + dt);
    if (now - (H.sentAt || 0) >= .1) { H.sentAt = now; AIHub.send({ t: 'g', area: 'blackrun', e: E1.edges.indexOf(sim2.W.edge || ''), s: Math.round(sim2.W.s), a: sim2.aim.on ? 1 : 0, y: Math.round(sim2.W.yaw * 100) }, { reliable: false }); }
    if (now - (H.progAt || -9) >= 1) { H.progAt = now; AIHub.progress({ score: E1.metres(), label: Math.round(E1.metres() / 12) + '% down · +' + E1.pen + ' s' }); }
    if (E1.done && !H.resultSent) {
      H.resultSent = true;
      AIHub.send({ t: 'done', time: Math.round(E1.final * 1000) });
      const awards = E1.pen === 0 ? [{ title: 'Clean Line', detail: 'No penalties' }] : [];
      AIHub.result({ time: Math.round(AIHub.time() + E1.pen * 1000 - E1.crits * 500), stats: { Crits: E1.crits, Penalties: E1.stumbles, Thawed: E1.thawed }, awards });
    }
  };
};
