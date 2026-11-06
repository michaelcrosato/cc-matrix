// Tempo Trauma's AI Hub shim: owns every AIHub call and queues events; the game (wasm) polls it.
// Inlined right after the session client. Outside a hub session it does nothing.
(function () {
  var A = window.AIHub;
  var H = window.__hub = { active: !!(A && A.active), info: null, events: [], last: null, cardLeft: null, started: false };
  // Controller rumble from the game, on any pad that has an actuator.
  window.__rumble = function (v, ms) {
    try {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        var act = p && (p.vibrationActuator || (p.hapticActuators && p.hapticActuators[0]));
        if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms || 100, strongMagnitude: Math.min(1, v), weakMagnitude: Math.min(1, v * 0.6) });
      }
    } catch (e) { /* no rumble here */ }
  };
  if (!H.active) return;
  H.pollQueue = [];
  A.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(function (info) {
    if (!info) { H.active = false; return; }   // no hub after all: run as on its own
    H.info = info;
    ['card', 'start', 'leave', 'end'].forEach(function (ev) {
      A.on(ev, function (d) { H.events.push([ev, d]); });
    });
    A.on('message', function (d, from) { H.events.push(['message', d, from]); });
    A.on('time-up', function () {
      H.events.push(['time-up']);
      // Answer now: frames may be slow. The host finishes from the standings Rust last published.
      if (A.isHost) {
        var fin = H.last || { standings: [A.players.map(function (p) { return p.id; })], won: false };
        try { A.finish(fin); } catch (e) { /* already finished */ }
      }
    });
  });
  addEventListener('keydown', function (e) { if (e.key === 'Enter') { try { A.answer('ready'); } catch (x) { /* not on the card */ } } }, true);
  H.poll = function () { var a = H.events; H.events = []; return JSON.stringify(a); };
  H.infoJson = function () { return H.info ? JSON.stringify({ me: H.info.me, players: H.info.players, host: H.info.host, isHost: !!A.isHost, server: !!A.server, seed: H.info.seed, mode: H.info.mode, limitMs: H.info.limitMs }) : ''; };
  H.ready = function () { if (!H.readied) { H.readied = true; try { A.ready(); } catch (e) { /* ignore */ } } };
  H.answer = function (what) { try { A.answer(what); } catch (e) { /* not on the card */ } };
  H.time = function () { return A.time(); };
  H.finish = function (json) { try { A.finish(JSON.parse(json)); } catch (e) { /* ignore */ } };
  H.send = function (json, to) { try { A.send(JSON.parse(json), to === undefined || to < 0 ? { reliable: false } : { reliable: false, to: to }); } catch (e) { /* dropped */ } };
  H.publish = function (json) { try { H.last = JSON.parse(json); } catch (e) { /* ignore */ } };
  H.fail = function (msg) { try { A.fail(msg); } catch (e) { /* ignore */ } };
})();
