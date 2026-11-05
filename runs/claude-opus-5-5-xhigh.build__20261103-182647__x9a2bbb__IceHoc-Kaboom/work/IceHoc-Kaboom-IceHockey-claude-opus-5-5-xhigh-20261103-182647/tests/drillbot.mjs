// scripted play for Coach Marge's drills (18.3): the stick and buttons a player would use for each
export function drillBot(G) {
  let last = 0, phase = 0;
  return (m, s, io) => {
    if (m.cfg.mode !== 'drill') return false;
    const n = m.cfg.drill, ds = m.drillState, pk = m.puck, R = G.Rink, t = io.t, own = pk.owner === s, go = (x, y, turbo) => { const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy) || 1; io.stick(dx / d, dy / d); io.hold('turbo', !!turbo); return d; };
    let shootOn = false; const done = () => { io.hold('shoot', shootOn); return true; };
    if (n === 1) { const GATES = [[R.C.x - 250, R.C.y - 110], [R.C.x, R.C.y - 140], [R.C.x + 260, R.C.y - 90], [R.C.x + 300, R.C.y + 110, 'stop'], [R.C.x, R.C.y + 130], [R.C.x - 300, R.C.y + 60]], g = GATES[ds.gate] || GATES[0], sp = Math.hypot(s.vx, s.vy), d = Math.hypot(g[0] - s.x, g[1] - s.y);
      if (g[2] === 'stop' && d < 60 && sp > 25) { io.stick(-s.vx / sp, -s.vy / sp); io.hold('turbo', false); } else if (g[2] === 'stop' && d < 22) io.stick(0, 0); else go(g[0], g[1], d > 90 && g[2] !== 'stop'); return done(); }
    if (n === 2) { if (own && t - last > .6) { last = t; io.tap(ds.saucer ? 'pass' : (ds.count >= 2 ? 'lob' : 'pass')); } io.stick(0, 0); return done(); }
    if (n === 3) { if (own && t - last > .9) { last = t; phase++; io.stick(0, phase % 2 ? -1 : 1); io.tap('shoot'); } else if (!own) io.stick(0, 0); return done(); }
    if (n === 4) { io.stick(0, 0); shootOn = pk.passTo === s && !pk.owner; return done(); }
    if (n === 5) { const dums = m.teams[1].skaters.filter(o => !o.offIce && o.state === 'skate'); const tgt = dums.sort((a, b) => G.Rink && Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0]; if (!tgt) { io.stick(0, 1); return done(); } const d = go(tgt.x, tgt.y + 4, true); if (d < 30 && s.state === 'skate' && t - last > .5) { last = t; io.tap('shoot'); } if (d > 30 && d < 60 && Math.hypot(s.vx, s.vy) < 120) go(tgt.x, tgt.y + 120, true); return done(); }
    if (n === 7) { if (ds.part === 0) { if (own) { io.stick(0, 0); shootOn = (t % 1.3) < 1.0; } else go(pk.x, pk.y); } else { const lou = m.teams[1].skaters[0]; const d = Math.hypot(lou.x - s.x, lou.y - s.y); io.stick(0, 0); if (d < 46 && t - last > .9) { last = t; io.tap('deke'); } } return done(); }
    return false;
  };
}
