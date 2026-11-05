/* ---- Battle AI: stateless planner. Each call returns the next command for the side whose phase it is. ---- */
const BA = G.BattleAI = {};
const nearestFoe = (S, u, from) => { let b = null, bd = 99; for (const t of B.live(S)) if (t.side !== u.side) { const d = H.dist(from, [t.c, t.r]); if (d < bd) { bd = d; b = t; } } return [b, bd]; };
const keepHex = S => { for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (S.tiles[r][c] === 'K') return [c, r]; return [Math.floor(S.cols / 2), Math.floor(S.rows / 2)]; };
const threat = (S, u, hex) => {
  let t = 0;
  for (const e of B.live(S)) if (e.side !== u.side) { const d = H.dist(hex, [e.c, e.r]); if (d <= e.mov + e.range[1]) t += (e.atk + e.int) * .3 / Math.max(8, u.maxhp) * 10; }
  return t * (u.kind === 'knight' ? 1.7 : 1);
};
BA.plans = (S, u) => {
  const rc = u.moved ? new Map([[u.c + ',' + u.r, { c: u.c, r: u.r }]]) : B.reach(S, u), plans = [];
  const kh = keepHex(S), human = S.sides[u.side].human;
  const attackerObjective = u.side === 0;
  for (const v of rc.values()) {
    const from = [v.c, v.r], here = v.c === u.c && v.r === u.r;
    let base = -threat(S, u, from) * (S.sides[u.side].aggr || 1);
    const [nf, nd] = nearestFoe(S, u, from);
    // approach term when nothing to hit
    let approach = 0;
    if (attackerObjective && S.bell >= S.bells - 3 && u.kind === 'knight') approach = -H.dist(from, kh) * 3;
    else if (!attackerObjective && nd > u.mov + u.range[1] + 2) approach = -Math.max(0, H.dist(from, kh) - 3) * 1.5 - (u.kind === 'knight' ? 0 : 0);
    else approach = -nd * (u.akind === 'melee' ? 2.2 : 1.2) + (u.kind === 'knight' ? -Math.max(0, 2 - nd) * 0 : 0);
    if (u.akind !== 'melee' && nf) approach += Math.abs(nd - u.range[1]) === 0 ? 3 : 0;
    // keep monsters near their knight (the ward)
    if (u.kind === 'mon' && !u.fx.root) { const k = S.units.find(o => o.side === u.side && o.troop === u.troop && o.lead && o.alive && !o.gone); if (k) { const dk = H.dist(from, [k.c, k.r]); if (dk > 4) approach -= (dk - 4) * 4; } }
    const wait = { to: from, here, act: { t: 'wait' }, score: base + approach };
    plans.push(wait);
    if (u.acted) continue;
    for (const t of B.targetsFrom(S, u, from)) {
      const f = B.forecast(S, u, t, null, from), dmg = Math.min(f.dmg, t.hp);
      let s = base + dmg / t.maxhp * 100 * f.hit + (f.kill ? 45 : 0) + (t.kind === 'knight' ? 25 : 0) + (f.kill && t.lead ? 90 : 0) + 20;
      if (u.akind !== 'melee') s += H.dist(from, [t.c, t.r]) * 2;
      plans.push({ to: from, here, act: { t: 'attack', target: t.uid }, score: s });
    }
    if (u.kind === 'knight') {
      if (!u.moved || here) {
        for (const sid of u.skills) {
          const sk = G.get('skill', sid); if (u.mp < sk.mp || (u.moved && !sk.mobile)) continue;
          let best = null;
          const mk = (act, s) => { if (!best || s > best.score) best = { to: from, here, act, score: base + s }; };
          const foes = B.live(S).filter(t => t.side !== u.side), allies = B.live(S, u.side).filter(t => t.troop === u.troop);
          const sd = (h) => { const d = H.dist(from, h); return d >= sk.range[0] && d <= sk.range[1]; };
          if (sk.kind === 'aoe') {
            const centres = sk.target === 'self' ? [from] : [...Array(S.rows * S.cols).keys()].map(i => [i % S.cols, Math.floor(i / S.cols)]).filter(sd);
            for (const cn of (sk.target === 'self' ? [from] : foes.map(f => [f.c, f.r]))) {
              if (sk.target !== 'self' && !sd(cn)) continue;
              let sum = 0, n = 0;
              for (const t of foes) if (H.dist(cn, [t.c, t.r]) <= sk.radius) { const fc = B.forecast(S, u, t, sid, from); sum += Math.min(fc.dmg, t.hp) / t.maxhp * 100 + (fc.kill ? 40 : 0) + (t.kind === 'knight' ? 15 : 0); n++; }
              if (n) mk({ t: 'skill', skill: sid, hex: cn }, sum + 10);
            }
          } else if (sk.kind === 'heal') {
            for (const a of B.live(S, u.side)) if (sd([a.c, a.r]) && a.hp < a.maxhp * .6) mk({ t: 'skill', skill: sid, target: a.uid }, (1 - a.hp / a.maxhp) * 90 + (a.kind === 'knight' ? 20 : 0));
          } else if (sk.kind === 'buff') {
            const near = foes.some(f => H.dist(from, [f.c, f.r]) <= 7);
            const already = allies.some(a => a.fx[sk.fx]);
            if (near && !already && allies.length > 1) mk({ t: 'skill', skill: sid }, 22 + allies.length * 3);
          } else if (sk.kind === 'root' || sk.kind === 'debuff') {
            for (const f of foes) if (sd([f.c, f.r]) && !f.fx.root && !f.fx.defDown) mk({ t: 'skill', skill: sid, target: f.uid }, 16 + (f.kind === 'knight' ? 14 : 0) + f.atk * .6);
          } else if (sk.kind === 'daze') {
            const n = foes.filter(f => H.dist(from, [f.c, f.r]) === 1 && !f.fx.daze).length; if (n >= 2) mk({ t: 'skill', skill: sid }, 18 * n);
          }
          if (best) plans.push(best);
        }
        // bind weakened monsters
        for (const t of B.live(S)) if (t.side !== u.side && t.kind === 'mon' && H.dist(from, [t.c, t.r]) <= 2) { const p = B.captureChance(S, u, t); if (p > .2 && !u.moved === !u.moved) plans.push({ to: from, here, act: { t: 'bind', target: t.uid }, score: base + p * 70 + 10 }); }
      }
      if (S.sides[u.side].items.includes('potion')) for (const a of B.live(S, u.side)) if (H.dist(from, [a.c, a.r]) <= 1 && a.hp < a.maxhp * .4) plans.push({ to: from, here, act: { t: 'item', item: 'potion', target: a.uid }, score: base + 30 });
    }
  }
  return plans;
};
BA.step = S => {
  if (S.over) return null;
  const mine = B.live(S, S.phase).filter(u => !u.done);
  if (!mine.length) return { t: 'endphase' };
  let best = null;
  for (const u of mine) {
    const plans = BA.plans(S, u); if (!plans.length) continue;
    const order = u.kind === 'knight' ? 0 : 3;   // knights just a little later than eager strikers; deterministic tie-break by uid
    for (const p of plans) { const sc = p.score + (p.act.t === 'wait' ? -20 : 0) - order * .1 - u.uid * .001; if (!best || sc > best.sc) best = { sc, u, p }; }
  }
  if (!best) return { t: 'endphase' };
  const { u, p } = best;
  if (!u.moved && !p.here) return { t: 'move', u: u.uid, to: p.to };
  return Object.assign({ u: u.uid }, p.act);
};
/* run a whole battle on the AI (Delegate, the campaign's other battles, the attract reel, the bot) */
BA.auto = (S, cap = 1800, evOut) => {
  let n = 0;
  while (!S.over && n++ < cap) { const c = BA.step(S); if (!c) break; const ev = B.apply(S, c); if (!ev) { if (c.t === 'endphase') break; B.apply(S, { t: 'wait', u: c.u }) || B.apply(S, { t: 'endphase' }); } else if (evOut) evOut.push(...ev); }
  if (!S.over) { S.over = true; S.winner = 1; S.reason = 'stalled'; }
  return S;
};
