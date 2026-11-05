/* ---- AI HUB: a ghost-mode round of the Collection. Each copy plays its own street from the same seed; the others'
 * Sals walk through it as see-through ghosts, and the hub keeps the score (the cash) ---- */
const HUBS = { sendT: 0, progT: 0, info: null };
scenes.hubwait = {
  enter() { hideHud(); music(null); },
  update() { game.focus(0, 0, 0); },
  draw(r) { cityBg.draw(r); r.overlay(g => { E.font.title(g, 'THE BARITONES', r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center' }); txt(g, 'Joining the round...', r.W / 2, r.H / 2 + 4, '#f4ecd8', { align: 'center' }); }); }
};
async function hubConnect() {
  let info = null;
  try { info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] }); } catch (e) { info = null; }
  if (!info) { HUB = false; game.go('title'); return; }
  HUBS.info = info;
  AIHub.on('message', (d, from) => {
    if (!d || d.t !== 'g') return;
    let gh = W.ghosts.get(from);
    if (!gh) { const p = (info.players || []).find(q => q.id === from) || {}; gh = { rig: rigOf('sal', false), name: String(p.name || 'Player ' + (from + 1)).slice(0, 16), color: p.color || '#ffffff', x: d.x, y: d.y, f: d.f, lx: d.x, ly: d.y }; W.ghosts.set(from, gh); }
    gh.lx = gh.x; gh.ly = gh.y; gh.x = +d.x || 0; gh.y = +d.y || 0; gh.f = +d.f || 0; gh.place = d.p; gh.atk = !!d.a; gh.car = !!d.c;
  });
  AIHub.on('leave', ({ id }) => { W.ghosts.delete(id); });
  AIHub.on('time-up', () => { if (!C.over) finishCollection(); });
  AIHub.on('end', () => { C.ended = true; music(null); A.music(null); try { game.audio.mute(true); } catch (e) { /* no sound */ } game.players.forEach(p => p.clear()); });
  game.go('play', { mode: 'collect', hub: true }, { fade: 0 });
}
// each step of a hub round: our Sal to the others (10 a second), the score to the hub (once a second), the ghosts posed
function hubTick(dt) {
  if (!HUBS.info || C.ended || W.mode !== 'collect') return;
  const h = hero(); if (!h) return;
  HUBS.sendT -= dt; HUBS.progT -= dt;
  if (HUBS.sendT <= 0 && C.started) { HUBS.sendT = .1; AIHub.send({ t: 'g', x: Math.round(h.x), y: Math.round(h.y), f: +h.facing.toFixed(2), p: W.place, a: !!(h.combo.busy || h.kickA.busy), c: !!h.car }, { reliable: false }); }
  if (HUBS.progT <= 0 && C.started && !C.over) { HUBS.progT = 1; AIHub.progress({ score: h.cash, label: money(h.cash) }); }
  for (const [, gh] of W.ghosts) { const vx = (gh.x - gh.lx) * 10, vy = (gh.y - gh.ly) * 10; gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx, vy, facing: gh.f, attack: gh.atk ? E.move('jab', (game.time * 3) % 1) : null }); }
}
