// Owns every AIHub call and queues events; the game polls it each frame. Rust talks to it through
// window.__hub. Outside a session it does nothing but offer the rumble helper.
window.__rumble = function (i, ms, weak, strong) {
  try {
    const p = navigator.getGamepads && navigator.getGamepads()[i];
    const a = p && p.vibrationActuator;
    if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, weakMagnitude: weak, strongMagnitude: strong });
  } catch (e) { /* no rumble here */ }
};
// Taps, for touch-only devices: the game has no touch controls, only a Settings button.
window.__tap = null;
for (const name of ['pointerdown', 'touchstart']) {
  addEventListener(name, (e) => {
    const t = e.touches && e.touches[0];
    if (t) window.__tap = [t.clientX / innerWidth, t.clientY / innerHeight];
    else if (e.pointerType === 'touch') window.__tap = [e.clientX / innerWidth, e.clientY / innerHeight];
  }, true);
}
(function () {
  const H = window.__hub = { active: !!(window.AIHub && AIHub.active), info: undefined, events: [], last: null, ended: false };
  if (!H.active) return;
  AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then((info) => {
    H.info = info;
    if (!info) { H.active = false; return; }      // no hub after all: run as on its own
    for (const ev of ['card', 'start', 'leave', 'end']) AIHub.on(ev, (d) => { H.events.push([ev, d]); if (ev === 'end') H.ended = true; });
    AIHub.on('message', (d, from) => H.events.push(['message', d, from]));
    // Frames can take seconds on a slow machine: a keepalive on a timer, from the start until the
    // game's first real message, so the copies are talking whatever the frame rate.
    AIHub.on('start', () => {
      H.hello = setInterval(() => { if (!H.ended) AIHub.send({ t: 'h' }, { reliable: false }); }, 600);
    });
    AIHub.on('end', () => clearInterval(H.hello));
    AIHub.on('time-up', () => {                   // answer now: frames may be slow
      H.events.push(['time-up', null]);
      if (AIHub.isHost && !H.done) { H.done = true; AIHub.finish(H.last || { standings: [AIHub.players.map((p) => p.id)], won: false }); }
    });
  });
  addEventListener('keydown', (e) => {
    if (H.started) return;
    if (e.key === 'Enter') AIHub.answer('ready');
    if (e.key === 'm' || e.key === 'M') AIHub.answer('more');
  }, true);
  H.infoJson = () => (H.info === undefined ? undefined : JSON.stringify(H.info));
  H.poll = () => { const a = H.events; H.events = []; for (const e of a) if (e[0] === 'start') H.started = true; return JSON.stringify(a); };
  H.ready = () => AIHub.ready();
  H.answer = (what) => { if (!H.started) AIHub.answer(what); };
  H.time = () => AIHub.time();
  H.finish = (json) => { if (AIHub.isHost && !H.done && !H.ended) { H.done = true; AIHub.finish(JSON.parse(json)); } };
  H.send = (json, to) => { clearInterval(H.hello); if (!H.ended) AIHub.send(JSON.parse(json), { reliable: false, to }); };
  H.publish = (json) => { H.last = JSON.parse(json); };
})();
