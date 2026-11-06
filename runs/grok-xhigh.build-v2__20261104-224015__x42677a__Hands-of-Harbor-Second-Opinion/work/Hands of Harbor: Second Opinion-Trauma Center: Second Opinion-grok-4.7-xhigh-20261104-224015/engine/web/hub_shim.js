// Hands of Harbor hub shim. Protocol calls stay here; the game polls them.
(function () {
  const H = window.__hub = { active: !!(window.AIHub && AIHub.active), info: null, events: [], last: null };
  if (!H.active) return;
  const held = Object.create(null);
  AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then((info) => {
    H.info = info;
    if (!info) { H.active = false; return; }
    for (const ev of ['card', 'start', 'leave', 'end']) AIHub.on(ev, (d) => H.events.push([ev, d]));
    AIHub.on('message', (d, from) => H.events.push(['message', d, from]));
    AIHub.on('time-up', () => {
      H.events.push(['time-up']);
      if (AIHub.isHost) AIHub.finish(H.last || { standings: [AIHub.players.map((p) => p.id)], won: false });
    });
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Enter') AIHub.answer('ready');
    held[e.key] = true;
  }, true);
  addEventListener('keyup', (e) => { held[e.key] = false; }, true);
  H.dom = () => {
    let x = 0, y = 0;
    if (held.ArrowRight || held.d || held.D) x += 1;
    if (held.ArrowLeft || held.a || held.A) x -= 1;
    if (held.ArrowUp || held.w || held.W) y += 1;
    if (held.ArrowDown || held.s || held.S) y -= 1;
    const use = !!(held.e || held.E);
    return JSON.stringify({ x, y, use });
  };
  H.poll = () => { const a = H.events; H.events = []; return JSON.stringify(a); };
  H.ready = () => AIHub.ready();
  H.answer = (what) => AIHub.answer(what);
  H.time = () => AIHub.time();
  H.finish = (json) => AIHub.finish(JSON.parse(json));
  H.send = (json, to) => AIHub.send(JSON.parse(json), { reliable: false, to });
  H.publish = (json) => { H.last = JSON.parse(json); };
})();
