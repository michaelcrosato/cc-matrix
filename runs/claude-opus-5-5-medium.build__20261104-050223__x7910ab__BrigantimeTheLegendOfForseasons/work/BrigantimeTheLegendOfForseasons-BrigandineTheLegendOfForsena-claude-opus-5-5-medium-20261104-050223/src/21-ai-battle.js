/* ---- BATTLE AI (§5.13): scores every reachable hex and every legal action from it; the same state always gives the
 * same plan. Serves CPU sides, Delegate (auto-resolve), the attract mode, the hub host for timed-out players and the bots ---- */
G.BattleAI = {
  // the next unit's commands in the active troop: [move?, act] or [{ t: 'end' }]
  next(sim, o = {}) {
    const S = sim.state, tr = sim.active; if (!tr) return [];
    const ids = [tr.knight, ...tr.units].map(i => S.units[i]).filter(u => !u.out && !u.acted);
    if (!ids.length) return [{ t: 'end' }];
    const foes = sim.foes(ids[0]); if (!foes.length) return [{ t: 'end' }];
    const near = u => Math.min(...foes.map(f => G.hex.dist([u.cx, u.cy], [f.cx, f.cy])));
    const castNow = u => u.skills.some(s => { const k = G.get('skill', s); return k.kind === 'spell' && k.p && sim.skillUsable(u, s).ok; }) || (u.basic.range[1] > 1 && near(u) <= u.basic.range[1]);
    ids.sort((a, b) => (b.kind === 'monster') - (a.kind === 'monster') || castNow(b) - castNow(a) || near(a) - near(b) || a.id - b.id);
    const u = ids[0];
    return this.plan(sim, u, o);
  },
  danger(sim, u) {   // expected damage foes could deal at each hex next bell
    const S = sim.state, map = new Map(), foes = sim.foes(u);
    for (const f of foes) {
      const e = sim.expected(f, null, u, [f.cx, f.cy]) * (f.basic.range[1] > 1 ? 1 : 1), reach = sim.effMov(f) + f.basic.range[1];
      for (const c of G.hex.within([f.cx, f.cy], reach)) { if (!sim.inside(c)) continue; const k = G.hex.key(c); map.set(k, (map.get(k) || 0) + e); }
    }
    return map;
  },
  plan(sim, u, o = {}) {
    const S = sim.state, side = S.sides[u.side], diff = o.diff || side.ai || 'normal', start = [u.cx, u.cy], reach = sim.reach(u), danger = this.danger(sim, u);
    const foes = sim.foes(u), isK = u.kind === 'knight', lowHP = u.hp < u.mhp * .4;
    const keepD = c => S.keeps.length ? Math.min(...S.keeps.map(k => G.hex.dist(c, k))) : 0;
    const myK = sim.knightOf(u), late = S.bell >= Math.max(1, S.bells - 4), attacker = u.side === S.spec.attacker;
    const unlit = S.spec.mode === 'sanctum' ? S.base.map((c, i) => c === 'D' && !S.dials[i] ? [i % S.w, Math.floor(i / S.w)] : null).filter(Boolean) : [];
    const lit = S.spec.mode === 'sanctum' ? S.base.map((c, i) => c === 'D' && S.dials[i] ? [i % S.w, Math.floor(i / S.w)] : null).filter(Boolean) : [];
    // retreat: a non-ruler knight low on HP when its side is losing on power
    if (isK && !u.ruler && u.hp < u.mhp * .25 && S.spec.mode === 'siege' && side.ai !== 'showcase') {
      const pow = si => sim.live(si).reduce((a, x) => a + x.hp + 4 * (x.atk + x.def), 0);
      if (pow(u.side) < pow(1 - u.side) * .7) return [{ t: 'act', u: u.id, a: 'retreat', target: start }];
    }
    const cands = [];
    const posScore = c => {
      const k = G.hex.key(c); let s = -(danger.get(k) || 0) * (isK ? (u.ruler ? 3 : 1.5) : .6) * (lowHP ? 2 : 1) / Math.max(10, u.hp) * 10;
      if (u.kind === 'monster' && myK && !myK.out && G.hex.dist(c, [myK.cx, myK.cy]) > myK.ward) s -= 12;
      s += 10 * Math.max(0, sim.terrainDef({ cx: c[0], cy: c[1], side: u.side }));
      if (S.spec.mode === 'siege' && late) s -= (attacker ? 2 : isK ? 3 : 0) * keepD(c);
      if (S.spec.mode === 'shrine') s -= 1.2 * keepD(c) * (S.bell > 1 ? 1 : .5);
      if (S.spec.mode === 'sanctum') {
        if (u.side === S.spec.attacker) { if (unlit.some(d => G.hex.same(d, c))) s += 30; else if (u.kind === 'monster' && unlit.length) s -= 1.5 * Math.min(...unlit.map(d => G.hex.dist(c, d))); }
        else if (u.sp === 'minute' && lit.length) { if (lit.some(d => G.hex.same(d, c))) s += 25; else s -= 1.5 * Math.min(...lit.map(d => G.hex.dist(c, d))); }
      }
      return s;
    };
    const ranged = u.basic.range[1] > 1 || u.skills.some(s => G.get('skill', s).magic);
    for (const [k, r] of reach) {
      const c = r.c, moved = !G.hex.same(c, start), base = posScore(c);
      const saveX = u.cx, saveY = u.cy, sm = u.moved, sd = u.movedDist;
      u.cx = c[0]; u.cy = c[1]; u.moved = moved || sm; u.movedDist = moved ? r.cost : sd;
      try {
        let acted = false;
        const tryAct = (a, skId, t, val) => { if (val > 1) { cands.push({ c, a, skill: skId, t, score: base + val }); acted = true; } };
        // basic attack
        for (const t of sim.targets(u, 'attack')) { const d = sim.unitAt(t); tryAct('attack', null, t, this.value(sim, u, null, [d], c, diff)); }
        for (const id of u.skills) {
          const sk = G.get('skill', id); if (!sim.skillUsable(u, id).ok) continue;
          let ts = sim.targets(u, 'skill', id);
          if (sk.area === 'r1' || sk.area === 'r2') ts = ts.filter(t => sim.unitAt(t) || G.hex.neighbors(t).some(n => sim.inside(n) && sim.unitAt(n)));
          for (const t of ts) { const hit = sim.unitsIn(u, sk, sim.area(u, sk, t)); if (!hit.length) continue; tryAct('skill', id, t, this.value(sim, u, sk, hit, c, diff)); }
        }
        // no target from here: close the distance (melee) or keep at range
        let idle = base;
        if (foes.length) { const nd = Math.min(...foes.map(f => G.hex.dist(c, [f.cx, f.cy]))); idle -= ranged ? 1.5 * Math.abs(nd - 3) : 1.2 * nd; }
        if (u.ruler && S.spec.mode === 'siege' && !attacker) idle -= .5 * keepD(c);
        cands.push({ c, a: isK && danger.get(k) > u.hp * .3 ? 'guard' : 'wait', t: c, score: idle - (acted ? 1 : 0) });
      } finally { u.cx = saveX; u.cy = saveY; u.moved = sm; u.movedDist = sd; }
    }
    cands.sort((a, b) => b.score - a.score || a.c[1] - b.c[1] || a.c[0] - b.c[0]);
    let pick = cands[0];
    if (diff === 'easy' && cands.length > 2) { const h = (S.n * 7 + u.id * 13 + S.bell) % 6; pick = cands[h < 3 ? 0 : h < 5 ? 1 : 2]; }
    if (!pick) return [{ t: 'act', u: u.id, a: 'wait', target: start }];
    const out = [];
    if (!G.hex.same(pick.c, start)) out.push({ t: 'move', u: u.id, to: pick.c });
    out.push({ t: 'act', u: u.id, a: pick.a === 'attack' ? 'attack' : pick.a, skill: pick.skill, target: pick.t });
    return out;
  },
  value(sim, u, sk, hit, from, diff) {
    let v = 0;
    for (const d of hit) {
      const ally = d.side === u.side, w = 1 + (d.kind === 'knight' ? .5 : 0) + (d.ruler ? 1 : 0);
      if (sk && (sk.heal || sk.healPct)) { const h = Math.min(d.mhp - d.hp, sk.heal ? sk.heal + u.int * .8 : d.mhp * sk.healPct); v += ally ? 1.2 * h * (d.kind === 'knight' ? 2 : 1) : -h; continue; }
      if (sk && sk.buff && !sk.p) { if (ally && !d.eff[sk.buff[0]]) v += 8 + (d.kind === 'knight' ? 4 : 0); continue; }
      if (sk && sk.cleanse) { if (ally && Object.keys(d.eff).some(k => G.get('effect', k).kind !== 'buff')) v += 12; continue; }
      if (sk && sk.steal) { if (!ally) v += Math.min(d.mp, sk.steal) * .8; continue; }
      let e = sim.expected(u, sk, d, from);
      if (ally) { v -= 1.5 * e; continue; }
      v += e * w;
      if (e >= d.hp) v += d.ruler ? 110 : d.kind === 'knight' ? 70 : 30;
      if (diff === 'hard' && d.hp < d.mhp) v += 15;
      if (sk && sk.status && !d.eff[sk.status[0]]) v += sim.statusChance(u, d, sk.status[1]) / 100 * 14;
    }
    if (sk && sk.mp) v -= sk.mp * .3;
    return v;
  },
  // run the active troop's units until its turn ends
  troop(sim, o) { const S = sim.state, tr = sim.active; if (!tr) return []; const ev = []; let guard = 0; while (sim.active === tr && !S.over && guard++ < 40) ev.push(...this.step(sim, o)); return ev; },
  // one unit's commands, applied; an illegal plan falls back to waiting (and, failing that, ends the troop)
  step(sim, o) { const ev = []; for (const c of this.next(sim, o)) { const r = sim.apply(c); if (r.length && r[0].type === 'illegal') { const w = c.u !== undefined ? sim.apply({ t: 'act', u: c.u, a: 'wait', target: [sim.state.units[c.u].cx, sim.state.units[c.u].cy] }) : []; ev.push(...(w.length && w[0].type !== 'illegal' ? w : sim.apply({ t: 'end' }))); break; } ev.push(...r); } return ev; },
  // Delegate: the AI on every side to the end, no drawing
  resolve(sim, o) { const S = sim.state; let guard = 0; while (!S.over && guard++ < 2000) this.troop(sim, o); return sim.results(); }
};
