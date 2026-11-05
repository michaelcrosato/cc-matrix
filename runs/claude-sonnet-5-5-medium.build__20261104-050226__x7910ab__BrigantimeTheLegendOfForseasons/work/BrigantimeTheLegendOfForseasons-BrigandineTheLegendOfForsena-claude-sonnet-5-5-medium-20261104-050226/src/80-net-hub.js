/* ---- AI Hub session (Protocol v1, mode: shared-world). The host's copy is the authority: it orders every command and
   sends it on; every copy applies the same commands to the same seeded BattleSim. Seats 0 and 1 fight; others watch. ---- */
G.hub = { active: false, info: null, started: false, done: false };
G.hubStartup = () => {
  const A = typeof window !== 'undefined' ? window.AIHub : null; if (!A || !A.active) return false;
  G.hub.active = true;
  A.connect({ mode: 'shared-world', seats: [2, 4] }).then(info => {
    if (!info) { G.hub.active = false; G.game.go('title'); return; }
    G.hub.info = info; const seed = info.seed || 1;
    const spec = G.makeSkirmish(seed, { realms: [0, 2], season: seed % 4, ai: false }); spec.sides[1].human = true; spec.sides[1].items = ['potion'];
    G.game.go('battle', { spec, hub: true });
  }).catch(e => { try { A.fail('Could not connect: ' + e); } catch (er) { } });
  return true;
};
G.hubNet = () => {
  const A = window.AIHub, info = G.hub.info, ids = info.players.map(p => p.id), mySide = ids.indexOf(info.me);
  return { mySide, isHost: !!info.isHost, send: (d, toHost) => { try { toHost && !info.isHost ? A.send(d, { to: info.host }) : A.send(d); } catch (e) { } } };
};
G.hubBattle = scene => {
  const A = window.AIHub, net = G.hubNet(); scene.hubMsg = 'Waiting for the round...'; G.hub.done = false; G.hub.started = false;
  scene.bv.o.net = net; scene.bv.o.noInput = true; scene.bv.o.overDelay = .6;
  A.on('message', (d, from) => { if (!d || !d.c) return; const bv = scene.bv; if (net.isHost) { const side = bv.S.phase; if (bv.isRemote(side) && G.hub.info.players[side] && G.hub.info.players[side].id === from && bv.apply(d.c)) net.send({ c: d.c }); } else if (from === G.hub.info.host) bv.apply(d.c); });
  const finish = () => { if (G.hub.done || !net.isHost) return; G.hub.done = true; const S = scene.bv.S, ids = G.hub.info.players.map(p => p.id); const win = S.over ? S.winner : (B.live(S, 0).reduce((a, u) => a + u.hp, 0) >= B.live(S, 1).reduce((a, u) => a + u.hp, 0) ? 0 : 1);
    const order = [ids[win], ids[1 - win]].filter(x => x !== undefined), rest = ids.filter(x => !order.includes(x));
    try { A.finish({ standings: [[order[0]], [order[1]]].filter(a => a[0] !== undefined).concat(rest.length ? [rest] : []), scores: { [ids[0]]: B.live(S, 0).length, [ids[1]]: B.live(S, 1).length }, stats: {}, awards: [{ id: ids[win], title: 'Field taken', detail: 'Won the shared battle' }] }); } catch (e) { } scene.hubMsg = 'Round over'; };
  scene.hubFinish = finish;
  A.on('time-up', finish); A.on('leave', () => { if (net.isHost) setTimeout(finish, 50); }); A.on('end', () => { G.hub.done = true; scene.bv.o.noInput = true; scene.hubMsg = 'Round over'; });
  A.ready();
};
G.hubGate = scene => {
  const A = window.AIHub; if (!A) return true; const bv = scene.bv;
  const now0 = performance.now(); if (!G.hub.lastHb || now0 - G.hub.lastHb > 900) { G.hub.lastHb = now0; try { A.send({ hb: { bell: bv.S.bell, phase: bv.S.phase, host: !!G.hub.info.isHost } }); } catch (e) { } }
  const t = A.time(); if (t < 0 && !G.hub.started) { scene.hubMsg = t === -Infinity ? 'Waiting for the round...' : 'Starting in ' + Math.ceil(-t / 1000); bv.o.noInput = true; return t !== -Infinity ? false : false; }
  if (!G.hub.started) { G.hub.started = true; scene.hubMsg = bv.o.net.mySide < 0 ? 'Spectating the duel' : null; bv.o.noInput = bv.o.net.mySide < 0; }
  return true;
};
G.hubDone = (scene, S) => { if (scene.hubFinish) scene.hubFinish(); scene.hubMsg = S.winner === 0 ? 'Side one wins' : 'Side two wins'; scene.bv.o.noInput = true; };
