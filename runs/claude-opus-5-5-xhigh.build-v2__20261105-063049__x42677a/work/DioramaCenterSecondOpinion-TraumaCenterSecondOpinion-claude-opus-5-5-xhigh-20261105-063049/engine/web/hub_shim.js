// The page's side of an AI Hub session: this shim owns every AIHub call and queues events; Rust
// polls it. Outside a session it does nothing but offer rumble.
(function () {
  // Rumble, for the game: a small helper the wasm calls by name.
  window.__rumble = function (strong, weak, ms) {
    try {
      for (const pad of (navigator.getGamepads ? navigator.getGamepads() : [])) {
        if (pad && pad.vibrationActuator && pad.vibrationActuator.playEffect) {
          pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
        }
      }
    } catch (e) { /* no rumble is fine */ }
  };
  const H = window.__hub = { active: !!(window.AIHub && AIHub.active), info: null, events: [], last: null, host: 0 };
  if (!H.active) return;
  let readied = false;
  H.ready = () => { if (!readied) { readied = true; AIHub.ready(); } };              // Rust, after the first frame
  AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then((info) => {
    if (!info) { H.active = false; return; }        // no hub after all: run as on its own
    // A slow machine may still be compiling shaders: it must not sit the round out for that.
    // Events wait in the queue until the game gets to them.
    setTimeout(H.ready, 8000);
    for (const ev of ['card', 'start', 'leave', 'end']) AIHub.on(ev, (d) => H.events.push([ev, d]));
    // A keepalive that doesn't depend on frames: slow frames mustn't look like a silent copy.
    AIHub.on('start', () => { H.beat = setInterval(() => AIHub.send({ beat: 1 }, { reliable: false }), 500); });
    AIHub.on('end', () => clearInterval(H.beat));
    AIHub.on('message', (d, from) => H.events.push(['message', d, from]));
    AIHub.on('time-up', () => {                     // answer now: frames may be slow
      H.events.push(['time-up']);
      if (AIHub.isHost) {
        const ids = (AIHub.players || []).map((p) => p.id);
        AIHub.finish(H.last || { standings: ids.map((id) => [id]), won: false });
      }
    });
    H.host = info.host;
    H.info = { me: info.me, players: info.players, host: info.host, isHost: info.isHost, server: info.server, seed: info.seed, round: info.round };
  });
  addEventListener('keydown', (e) => { if (e.key === 'Enter') AIHub.answer('ready'); if (e.key === 'm' || e.key === 'M') AIHub.answer('more'); }, true);
  H.poll = () => { const a = H.events; H.events = []; return JSON.stringify(a); };   // Rust, every frame
  H.answer = (what) => AIHub.answer(what);                                           // the card: 'ready' or 'more'
  H.time = () => AIHub.time();
  H.finish = (json) => AIHub.finish(JSON.parse(json));                               // host, at the round's end
  H.send = (json, to) => AIHub.send(JSON.parse(json), to === undefined ? { reliable: false } : { reliable: false, to });
  H.publish = (json) => { H.last = JSON.parse(json); };                              // Rust, about once a second
})();
