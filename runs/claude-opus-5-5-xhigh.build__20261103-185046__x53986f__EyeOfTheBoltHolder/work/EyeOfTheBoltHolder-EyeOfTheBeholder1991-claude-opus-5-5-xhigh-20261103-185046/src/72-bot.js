/* =====================================================================================
 * 72-bot: the walkthrough runner. It plays by the game's own rules, through commands, as a player would: it paths with
 * A*, opens doors, faces and uses things, carries, puts down and throws, fights (faces what attacks, Party Strike, Spark
 * Dart down lines, Mend when hurt), sidesteps heavy blows, rests when it must. Tests, the attract mode and Dev Mode's
 * auto-play run it. bot = B.Bot.make(steps, { choices, cheat }); each step: cmds = B.Bot.tick(bot, dt)
 * ===================================================================================== */
const Bot = {
  make(steps, o = {}) { return { steps: steps.slice(), i: 0, t: 0, sub: {}, done: false, wait: 0, log: [], o, stuck: 0, lastCell: '', skipped: [], stepT: 0, fightT: 0 }; },
  /** the commands for this step */
  tick(b, dt) {
    const out = [], P = S.party;
    b.t += dt; b.stepT += dt;
    if (S.over || b.done) return out;
    if (S.talk) { if (S.talk.choices) { const pick = b.o.choices && b.o.choices[S.talk.node] !== undefined ? b.o.choices[S.talk.node] : 0; out.push({ c: 'talk', op: 'choose', i: pick }); } else out.push({ c: 'talk', op: 'next' }); return out; }
    if (S.transit) { out.push({ c: 'skipCard' }); return out; }
    if (S.moment || P.busy) return out;
    if (S.camp && !S.camp.rest && !b.sub.camping) out.push({ c: 'camp', op: 'close' });
    if (S.camp) { if (S.camp.rest) return out; if (b.sub.camping) return this.camping(b, out); return out; }
    if (b.wait > 0) { b.wait -= dt; return out; }
    if (P.tw) return out;
    // reflexes: heal, fight, shoot
    if (this.heal(b, out)) return out;
    if (this.fight(b, out, dt)) return out;
    const st = b.steps[b.i];
    if (!st) { b.done = true; return out; }
    if (b.stepT > (st && st[0] === 'boss' ? 420 : b.o.timeout || 90)) { b.skipped.push(st.join(' ')); this.next(b); return out; }
    const r = this.step(b, st, out, dt);
    if (r === true) this.next(b);
    return out;
  },
  next(b) { b.i++; b.sub = {}; b.stepT = 0; b.wait = .05; },
  /* ---- reflexes ---- */
  heal(b, out) {
    const P = S.party;
    // a fallen front: a standing member from behind takes the place
    for (const p of [0, 1]) { const mi = P.form[p], m = P.members[mi]; if (mi >= 0 && m.state === 'ok' && m.hp > m.max * .2) continue;
      const back = [2, 3, 4, 5].filter(q => P.form[q] >= 0 && P.members[P.form[q]].state === 'ok' && P.members[P.form[q]].hp > P.members[P.form[q]].max * .3 && ['F', 'P', 'R', 'T', 'C'].includes(P.members[P.form[q]].cls)).sort((a, c) => P.members[P.form[c]].hp - P.members[P.form[a]].hp)[0];
      if (back !== undefined) { out.push({ c: 'swap', a: p, b: back }); return true; } }
    const low = P.members.filter(m => (m.state === 'ok' && m.hp < m.max * .45) || m.state === 'down');
    if (!low.length) return false;
    const t = low.sort((a, c) => (a.state === 'down' ? -1 : a.hp / a.max) - (c.state === 'down' ? -1 : c.hp / c.max))[0], ti = P.members.indexOf(t);
    for (const [ci, c] of P.members.entries()) {
      if (!B.canCast(c) || c.cool.main > 0) continue; const rs = B.readySpells(c);
      for (const sp of ['greaterMend', 'mend']) if (rs[sp]) { out.push({ c: 'cast', m: ci, spell: sp, target: ti }); return true; }
      if (c.cls === 'P' && c.layOnHands) { out.push({ c: 'cast', m: ci, spell: 'layOnHands', target: ti }); return true; }
    }
    if (t.state === 'ok' && t.hp < t.max * (S.floor === 'f4' ? .5 : .35) || t.state === 'down') {
      const pot = this.find(r => IT(r.id).kind === 'potion' && IT(r.id).heal && (t.state !== 'down' || IT(r.id).wake));
      if (pot && t.state === 'ok') { if (pot.m === t) { out.push({ c: 'useItem', m: ti, slot: pot.slot }); return true; } if (!P.hand) { out.push({ c: 'inv', op: 'take', m: P.members.indexOf(pot.m), slot: pot.slot }); out.push({ c: 'inv', op: 'place', m: ti, slot: t.pack.indexOf(null) >= 0 ? t.pack.indexOf(null) : 11 }); return true; } }
    }
    return false;
  },
  /** where an item is carried: { m, slot, it } */
  find(test) { for (const m of S.party.members) { if (m.state === 'dead') continue; for (const s of [...m.pack.keys(), ...B.SLOT_NAMES]) { const it = B.getSlot(m, s); if (it && test(it)) return { m, slot: s, it }; } } return null; },
  fight(b, out, dt) {
    const P = S.party, fl = FL(), near = [];
    for (const m of fl.mons) if (m.hp > 0 && m.type !== 'boltholder' && manhattan(m.cx, m.cy, P.cx, P.cy) === 1) near.push(m);
    const boss = S.boss && S.floor === 'f4' && S.boss.alive && S.boss.awake;
    if (boss && b.steps[b.i] && b.steps[b.i][0] === 'boss') return false;   // (the boss step fights its own way)
    if (!near.length) {
      // shoot what comes down the line, or wait for it
      const lt = B.lineTarget(6);
      if (lt && !lt.boss && lt.d > 1 && lt.mon.aware) { if (this.ranged(b, out)) return true; }
      return false;
    }
    b.fightT += dt;
    // sidestep a heavy blow about to land, when a free cell beside is safe
    const heavy = near.find(m => m.wind > 0 && m.wind < .3 && (B.MON(m.type).heavy || alive().some(x => x.hp < x.max * .5)));
    if (heavy && !b.o.noDodge) {
      for (const d of ['l', 'r', 'b']) { const dir = (P.dir + { l: 3, r: 1, b: 2 }[d]) % 4, x = P.cx + DX[dir], y = P.cy + DY[dir];
        if (B.partyCan(x, y) && !monsAt(x, y).length && !pitOpen(x, y) && !IX().tpAt[key(x, y)] && !IX().stairAt[key(x, y)] && !fl.mons.some(m => m.hp > 0 && manhattan(m.cx, m.cy, x, y) === 1)) { out.push({ c: 'move', d }); return true; } }
    }
    const tgt = near.sort((a, c) => (dirTo(P.cx, P.cy, a.cx, a.cy) === P.dir ? -1 : 0) - (dirTo(P.cx, P.cy, c.cx, c.cy) === P.dir ? -1 : 0) || a.hp - c.hp)[0], want = dirTo(P.cx, P.cy, tgt.cx, tgt.cy);
    if (want !== P.dir) { out.push({ c: 'turn', s: ((want - P.dir + 4) % 4) === 3 ? -1 : 1 }); return true; }
    this.attack(b, out);
    return true;
  },
  /** everyone ready acts: Party Strike, off hands, casters */
  attack(b, out) {
    const P = S.party;
    out.push({ c: 'strike' });
    P.members.forEach((m, i) => {
      if (!B.canAct(m)) return;
      if (m.slots.off && B.handKind(m.slots.off) === 'melee' && m.cool.off <= 0 && B.rowOf(i) === 0) out.push({ c: 'hand', m: i, h: 'off' });
      if (B.canCast(m) && m.cool.main <= 0) { const rs = B.readySpells(m), lt = B.lineTarget(6), T = lt && lt.mon && B.MON(lt.mon.type);
        if (rs.blazingOrb && lt && monsAt(lt.x, lt.y).length >= 2) out.push({ c: 'cast', m: i, spell: 'blazingOrb' });
        else if (rs.forkedLightning && lt && !lt.boss && T && T.construct) out.push({ c: 'cast', m: i, spell: 'forkedLightning' });
        else if (rs.sparkDart && lt && !(S.floor === 'f4' && lt.boss && S.boss.phase === 1)) out.push({ c: 'cast', m: i, spell: 'sparkDart' });
        else if (rs.turnDead && lt && T && T.undead && lt.d === 1) out.push({ c: 'cast', m: i, spell: 'turnDead' });
        else if (rs.steadyHand && !P.steady && b.fightT > 2) out.push({ c: 'cast', m: i, spell: 'steadyHand' });
        else if (rs.wardOfBrass) { const fr = [0, 1].map(p => P.form[p]).find(j => j >= 0 && P.members[j].state === 'ok' && !(P.members[j].ward > 0) && P.members[j].hp < P.members[j].max * .8); if (fr !== undefined) out.push({ c: 'cast', m: i, spell: 'wardOfBrass', target: fr }); } }
      if (m.slots.main && B.handKind(m.slots.main) === 'missile' && m.cool.main <= 0) out.push({ c: 'hand', m: i, h: 'main' });
      for (const h of ['main', 'off']) if (B.rowOf(i) > 0 && m.slots[h] && B.handKind(m.slots[h]) === 'throwStack' && m.cool[h] <= 0 && B.lineTarget(4)) out.push({ c: 'hand', m: i, h });
    });
  },
  ranged(b, out) {
    const P = S.party; let any = false;
    P.members.forEach((m, i) => {
      if (!B.canAct(m) || m.cool.main > 0) return;
      const k = m.slots.main && B.handKind(m.slots.main);
      if (k === 'missile' && m.slots.quiver) { out.push({ c: 'hand', m: i, h: 'main' }); any = true; }
      else if (k === 'throwStack' && B.rowOf(i) > 0) { out.push({ c: 'hand', m: i, h: 'main' }); any = true; }
      else if (B.canCast(m)) { const rs = B.readySpells(m); if (rs.sparkDart && (b.o.cheat || S.party.members.filter(x => x.state === 'ok').length > 0)) { out.push({ c: 'cast', m: i, spell: 'sparkDart' }); any = true; } }
    });
    return any;
  },
  /* ---- moving ---- */
  /** the next command toward (tx, ty): a turn, a step, opening a door; null when there */
  goTo(tx, ty, out, o = {}) {
    const P = S.party; if (P.cx === tx && P.cy === ty) return null;
    const X = IX(), fl = FL();
    const pass = (x, y) => {
      if (x === tx && y === ty) return B.partyCan(x, y) || (doorAt(x, y) && ['door', 'lock'].includes(doorAt(x, y).kind) && !fl.doors[doorAt(x, y).id].locked);
      if (wallAt(x, y)) return false; const d = doorAt(x, y), k = key(x, y);
      if (d && !doorPass(d) && !(d.kind === 'door' || (d.kind === 'lock' && !fl.doors[d.id].locked))) return false;
      if (pitOpen(x, y) && !(P.floating > 0)) return false;
      const pt = X.pitAt[k]; if (pt && pt.trapdoor && !fl.pits[pt.id].bridged) return false;
      if (X.tpAt[k] && fl.tps[X.tpAt[k].id]) return false;
      if (X.stairAt[k] && !o.stairs) return false;
      if (X.spin[k] && !o.spin) return false;
      if (X.trapAt[k] && fl.traps[X.trapAt[k].id] && !o.traps) return false;
      if (S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === x && S.boss.cy === y) return false;
      return true;
    };
    let path = X.grid.path([P.cx, P.cy], [tx, ty], { blocked: (x, y) => !pass(x, y), ends: true });
    if (path.length < 2 && !o.spin) path = X.grid.path([P.cx, P.cy], [tx, ty], { blocked: (x, y) => !(pass(x, y) || X.spin[key(x, y)] || (X.trapAt[key(x, y)] && !wallAt(x, y))), ends: true });
    if (path.length < 2) return 'nopath';
    const [nx, ny] = path[1], want = dirTo(P.cx, P.cy, nx, ny);
    if (want !== P.dir) { const d = (want - P.dir + 4) % 4; if (d === 2) out.push({ c: 'move', d: 'b' }); else out.push({ c: 'turn', s: d === 3 ? -1 : 1 }); return 'moving'; }
    const d = doorAt(nx, ny); if (d && !doorPass(d) && (d.kind === 'door' || d.kind === 'lock')) { if (!fl.doors[d.id].want || fl.doors[d.id].locked) out.push({ c: 'use' }); return 'moving'; }
    if (monsAt(nx, ny).length) { this.attack({ fightT: 0 }, out); return 'moving'; }
    out.push({ c: 'move', d: 'f' }); return 'moving';
  },
  face(dir, out) { const P = S.party; if (P.dir === dir) return true; const d = (dir - P.dir + 4) % 4; out.push({ c: 'turn', s: d === 3 ? -1 : 1 }); return false; },
  /** get an item into the Hand from a pack (or it is there already) */
  toHand(id, out) {
    const P = S.party; if (P.hand && P.hand.id === id) return true;
    if (P.hand) { this.stowHand(out); return false; }
    const f = this.find(r => r.id === id); if (!f) return null;
    out.push({ c: 'inv', op: 'take', m: S.party.members.indexOf(f.m), slot: f.slot }); return false;
  },
  stowHand(out) {
    const P = S.party; if (!P.hand) return true;
    for (const [i, m] of P.members.entries()) { if (m.state === 'dead') continue; const s = m.pack.indexOf(null); if (s >= 0) { out.push({ c: 'inv', op: 'place', m: i, slot: s }); return false; } }
    out.push({ c: 'putDown' }); return false;
  },
  area(name) { const F = B.FLOORS[S.floor]; return (F.areas || {})[name] || null; },
  /* ---- the walkthrough's steps; true when the step is done ---- */
  step(b, st, out, dt) {
    const P = S.party, fl = FL(), [k, a1, a2, a3, a4] = st;
    switch (k) {
      case 'go': { const r = this.goTo(a1, a2, out, { stairs: true, spin: b.sub.spin }); if (r === 'nopath') { b.sub.spin = true; b.stuck += dt; if (b.stuck > 6) { b.stuck = 0; return true; } } return r === null; }
      case 'use': { const r = this.goTo(a1, a2, out); if (r) return r === 'nopath' && b.stepT > 10; if (!this.face(FACE_DIR[a3], out)) return false; if (!b.sub.used) { if (P.hand && !B.featAt(P.cx, P.cy, P.dir)) { this.stowHand(out); return false; } out.push({ c: 'use' }); b.sub.used = true; b.wait = .3; return false; } return true; }
      case 'take': {
        if (a4) { // from an alcove ahead
          const r = this.goTo(a1, a2, out); if (r) return r === 'nopath' && b.stepT > 10; if (!this.face(FACE_DIR[a4], out)) return false;
          const ft = B.featAt(P.cx, P.cy, P.dir), its = ft && fl.feats[ft.id].items || [];
          if (P.hand && P.hand.id === a3) { this.stowHand(out); return !!b.sub.got; }
          if (P.hand) { this.stowHand(out); return false; }
          if (b.sub.got) return true;
          if (!its.some(i => i.id === a3)) return true;
          out.push({ c: 'use' }); b.sub.got = true; b.wait = .15; return false;
        }
        if (P.hand && P.hand.id === a3 && b.sub.got) { this.stowHand(out); return false; }
        if (b.sub.got && !P.hand) return true;
        const its = B.itemsAt(a1, a2); const j = its.map(i => i.id).lastIndexOf(a3);
        if (j < 0) return true;
        const r = this.goTo(a1, a2, out); if (r) return r === 'nopath' && b.stepT > 10;
        if (P.hand) { this.stowHand(out); return false; }
        out.push({ c: 'pick', x: a1, y: a2, i: j }); b.sub.got = true; b.wait = .05; return false;
      }
      case 'takeAll': {
        const A = this.area(a1) || [P.cx, P.cy, P.cx, P.cy];
        if (P.hand) { this.stowHand(out); return false; }
        for (let y = A[1]; y <= A[3]; y++) for (let x = A[0]; x <= A[2]; x++) { const its = B.itemsAt(x, y); if (its.length) { const r = this.goTo(x, y, out); if (r === 'nopath') continue; if (r) return false; out.push({ c: 'pick', x, y, i: its.length - 1 }); b.wait = .05; return false; } }
        return true;
      }
      case 'clear': {
        const A = this.area(a1); if (!A) return true;
        const live = fl.mons.filter(m => m.hp > 0 && m.cx >= A[0] - 1 && m.cx <= A[2] + 1 && m.cy >= A[1] - 1 && m.cy <= A[3] + 1);
        if (!live.length) return true;
        const t = live.sort((m1, m2) => manhattan(m1.cx, m1.cy, P.cx, P.cy) - manhattan(m2.cx, m2.cy, P.cx, P.cy))[0];
        if (manhattan(t.cx, t.cy, P.cx, P.cy) === 1) return false;
        const lt = B.lineTarget(6); if (lt && lt.mon && this.ranged(b, out)) return false;
        // to a cell beside it
        const spots = [0, 1, 2, 3].map(d => [t.cx + DX[d], t.cy + DY[d]]).filter(([x, y]) => B.partyCan(x, y) && !monsAt(x, y).length && !pitOpen(x, y)).sort((p, q) => manhattan(p[0], p[1], P.cx, P.cy) - manhattan(q[0], q[1], P.cx, P.cy));
        for (const [x, y] of spots) { const r = this.goTo(x, y, out); if (r === 'moving') return false; }
        if (b.stepT > 25) return true;
        b.wait = .4; return false;
      }
      case 'clearNear': return !fl.mons.some(m => m.hp > 0 && manhattan(m.cx, m.cy, P.cx, P.cy) <= 3 && m.aware) || b.stepT > 20;
      case 'put': case 'throw': case 'place': {
        if (!b.sub.inHand) { const h = a4 === null ? true : this.toHand(a4, out); if (h === null) return true; if (!h) return false; b.sub.inHand = true; }
        const r = this.goTo(a1, a2, out); if (r) return r === 'nopath' && b.stepT > 10; if (!this.face(FACE_DIR[a3], out)) return false;
        if (b.sub.did) return true;
        out.push({ c: k === 'put' ? 'putDown' : k === 'throw' ? 'throw' : 'use' }); b.sub.did = true; b.wait = .2; return false;
      }
      case 'equip': {
        const slot = a2, f = this.find(r => r.id === a1); if (!f) return true;
        if (typeof f.slot === 'string' && f.slot === slot || (slot.startsWith('ring') && f.slot.toString().startsWith('ring'))) { if (P.hand) this.stowHand(out); return !P.hand; }
        if (P.hand && P.hand.id !== a1) { this.stowHand(out); return false; }
        const who = P.members.map((m, i) => i).filter(i => P.members[i].state !== 'dead' && B.fits(P.members[i], slot, f.it) === true).sort((x, y) => (P.members[x].slots[slot] ? 1 : 0) - (P.members[y].slots[slot] ? 1 : 0))[0];
        if (who === undefined) return true;
        if (!P.hand) { out.push({ c: 'inv', op: 'take', m: P.members.indexOf(f.m), slot: f.slot }); return false; }
        out.push({ c: 'inv', op: 'place', m: who, slot }); b.wait = .05; b.sub.n = (b.sub.n || 0) + 1; return b.sub.n > 3;
      }
      case 'choose': b.o.choices = b.o.choices || {}; return true;
      case 'answerAll': return !S.talk;
      case 'wait': if (!b.sub.t0) b.sub.t0 = b.t; return b.t - b.sub.t0 >= a1;
      case 'read': { const f = this.find(r => r.id === a1); if (f) out.push({ c: 'useItem', m: P.members.indexOf(f.m), slot: f.slot }); return true; }
      case 'cast': { const mi = P.members.findIndex(m => B.canCast(m) && B.readySpells(m)[a1]); if (mi >= 0) out.push({ c: 'cast', m: mi, spell: a1, target: a2 }); return true; }
      case 'rest': case 'restIfLow': {
        if (k === 'restIfLow' && !this.needRest()) return true;
        if (b.sub.rested) return !S.camp;
        if (B.enemiesNear(6)) { if (b.stepT > 15) return true; return false; }
        b.sub.camping = true; b.sub.rested = true; out.push({ c: 'camp', op: 'open' }); return false;
      }
      case 'scribeAll': {
        const mi = P.members.findIndex(m => m.cls === 'M' && m.state === 'ok'); if (mi < 0) return true;
        const m = P.members[mi], sc = this.find(r => IT(r.id).kind === 'scroll' && IT(r.id).spell && B.SP(IT(r.id).spell).arc && !m.book.includes(IT(r.id).spell));
        if (!sc) return true; if (B.enemiesNear(6)) return b.stepT > 10;
        b.sub.camping = true; b.sub.scribe = true; out.push({ c: 'camp', op: 'open' }); return false;
      }
      case 'fill': {
        const ids = a1, pending = ids.find(id => !(fl.feats[id].items || []).length);
        if (!pending) return true;
        if (!b.sub.h) { const h = this.toHand('tumblerGear', out); if (h === null) return true; if (!h) return false; b.sub.h = true; }
        const ft = IX().feats[pending]; const r = this.goTo(ft.x, ft.y, out); if (r) return r === 'nopath' && b.stepT > 10;
        if (!this.face(ft.dir, out)) return false; out.push({ c: 'use' }); b.sub.h = false; b.wait = .2; return false;
      }
      case 'insert': { const r = this.goTo(a1, a2, out); if (r) return r === 'nopath' && b.stepT > 10; if (!this.face(FACE_DIR[a3], out)) return false; if (b.sub.did) return true; if (P.hand) { this.stowHand(out); return false; } out.push({ c: 'use' }); b.sub.did = true; b.wait = .3; return false; }
      case 'unlatch': {
        const r = this.goTo(a1, a2, out); if (r) return r === 'nopath' && b.stepT > 10; if (!this.face(FACE_DIR[a3], out)) return false;
        const d = doorAt(P.cx + DX[P.dir], P.cy + DY[P.dir]); if (!d || fl.doors[d.id].want) return b.sub.did ? fl.doors[d.id] && fl.doors[d.id].open > .9 : true;
        const mi = P.members.findIndex(m => B.canCast(m) && B.readySpells(m).unlatch); if (mi >= 0) { out.push({ c: 'cast', m: mi, spell: 'unlatch' }); b.sub.did = true; return false; }
        const w = this.find(r2 => r2.id === 'wandUnlatching' && r2.ch > 0); if (w) { out.push({ c: 'useItem', m: P.members.indexOf(w.m), slot: w.slot }); b.sub.did = true; return false; }
        const sc = this.find(r2 => r2.id === 'sc_unlatch'); const mage = P.members.findIndex(m => m.cls === 'M' && m.state === 'ok'); if (sc && mage >= 0) { if (sc.m !== P.members[mage]) { if (!P.hand) out.push({ c: 'inv', op: 'take', m: P.members.indexOf(sc.m), slot: sc.slot }); else out.push({ c: 'inv', op: 'place', m: mage, slot: P.members[mage].pack.indexOf(null) }); return false; } out.push({ c: 'useItem', m: mage, slot: sc.slot }); b.sub.did = true; }
        return false;
      }
      case 'buttons': {   // floor 1's two buttons, both within the window: press one, run, press the other
        const s = b.sub;
        if (fl.doors.G4.want) return true;
        if (!s.p1) { const r = this.goTo(13, 10, out); if (r) return false; if (!this.face(0, out)) return false; out.push({ c: 'use' }); s.p1 = true; return false; }
        const r = this.goTo(18, 10, out, { traps: true }); if (r) return false; if (!this.face(2, out)) return false; out.push({ c: 'use' }); s.p1 = false; b.wait = .3; return false;
      }
      case 'gauntlet': {   // niche to niche down the Seers' hall, waiting out their bolts
        const s = b.sub, niches = [[9, 7], [13, 7], [17, 7]]; s.k = s.k || 0;
        if (s.k >= niches.length) return true;
        const [nx, ny] = niches[s.k];
        if (P.cx === nx && P.cy === ny) { if (!s.t) s.t = b.t; if (b.t - s.t > 1.6 && !S.proj.some(p => p.team === 'mon')) { s.k++; s.t = 0; } return false; }
        const r = this.goTo(nx, ny, out); if (r === 'nopath') s.k++; return false;
      }
      case 'candles': {
        const order = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], pending = order.find(id => !fl.feats[id].lit);
        if (!pending || S.special.sq3) return true;
        const ft = IX().feats[pending]; const r = this.goTo(ft.x, ft.y, out); if (r) return false; if (!this.face(ft.dir, out)) return false;
        if (P.hand) { this.stowHand(out); return false; } out.push({ c: 'use' }); b.wait = .2; return false;
      }
      case 'veil': return !S.talk && (S.flags.veilHelped || S.flags.veilRefused || b.stepT > 8);
      case 'reliquary': {
        if (S.flags.veilHelped) { const r = this.goTo(21, 13, out); if (r === null) return true; if (r === 'nopath' && b.stepT > 10) return true; return false; }
        if (!b.sub.barracks) { b.steps.splice(b.i + 1, 0, ['go', 19, 9], ['clear', 'barracks'], ['take', 22, 11, 'wardensBlade'], ['use', 22, 10, 'N'], ['go', 21, 13]); return true; }
        return true;
      }
      case 'boss': return this.boss(b, out, dt);
      default: return true;
    }
  },
  needRest() { return S.party.members.some(m => m.state === 'down' || (m.state === 'ok' && m.hp < m.max * .7)) || S.party.members.some(m => B.isCaster(m) && m.state === 'ok' && [1, 2, 3].some(L => m.spent[L].some(Boolean))); },
  /** inside camp: scribe scrolls, prepare spells, rest, leave */
  camping(b, out) {
    const P = S.party;
    if (b.sub.scribe) {
      for (const [mi, m] of P.members.entries()) { if (m.cls !== 'M') continue; for (const [fi, o] of P.members.entries()) for (const [si, it] of o.pack.entries()) if (it && IT(it.id).kind === 'scroll' && IT(it.id).spell && B.SP(IT(it.id).spell).arc && !m.book.includes(IT(it.id).spell)) { out.push({ c: 'camp', op: 'scribe', m: mi, from: fi, slot: si }); return out; } }
      b.sub.scribe = false;
    }
    // prepare: casters fill empty slots with useful spells
    for (const [mi, m] of P.members.entries()) {
      if (!B.isCaster(m) || m.state === 'dead') continue; const c = B.slotCount(m), known = B.knownSpells(m);
      const want = { 1: m.cls === 'M' ? ['sparkDart', 'sparkDart', 'slumber', 'wardOfBrass', 'sparkDart'] : ['mend', 'mend', 'steadyHand', 'mend'], 2: m.cls === 'M' ? ['unlatch', 'frostbite', 'featherStep'] : ['purge', 'loaves', 'holdFast'], 3: m.cls === 'M' ? ['blazingOrb', 'blazingOrb', 'forkedLightning'] : ['greaterMend', 'freeHinge', 'raise'] };
      for (let L = 1; L <= 3; L++) if (m.mem[L].length < c[L - 1]) { const sp = want[L].concat(known.filter(s => B.SP(s).lvl === L)).find(s => known.includes(s) && (L !== 2 || m.cls !== 'M' || !m.mem[2].includes('unlatch') || s !== 'unlatch')); if (sp) { out.push({ c: 'camp', op: 'mem', m: mi, spell: sp }); return out; } }
    }
    if (!b.sub.restDone) { b.sub.restDone = true; out.push({ c: 'camp', op: 'eat' }); out.push({ c: 'camp', op: 'rest' }); return out; }
    if (!S.camp.rest && b.sub.restDone && this.needRest() && !b.sub.second && !B.enemiesNear(6)) { b.sub.second = true; out.push({ c: 'camp', op: 'rest' }); return out; }
    out.push({ c: 'camp', op: 'close' }); b.sub.camping = false;
    return out;
  },
  /** the Bolt-Holder: turn the locks between its attacks, fight the open Eye, dodge its lines and its rain */
  boss(b, out, dt) {
    const P = S.party, Bs = S.boss; if (!Bs) return true;
    if (!Bs.alive) return !S.moment;
    if (!Bs.awake) { const r = this.goTo(6, 5, out); return false; }
    const T = Bs.tele, here = [P.cx, P.cy];
    // dodge: out of the lightning's line, or off the marked cells
    if (T && (T.k === 'lightning' || T.k === 'rain') && T.cells.some(([x, y]) => x === here[0] && y === here[1]) && T.t < T.dur - .05) {
      for (const d of ['l', 'r', 'b', 'f']) { const dir = (P.dir + { f: 0, l: 3, r: 1, b: 2 }[d]) % 4, x = P.cx + DX[dir], y = P.cy + DY[dir];
        if (B.partyCan(x, y) && !monsAt(x, y).length && !(Bs.cx === x && Bs.cy === y) && !T.cells.some(([cx, cy]) => cx === x && cy === y)) { out.push({ c: 'move', d }); return false; } }
    }
    const gaz = FL().mons.filter(m => m.hp > 0 && m.type === 'gazer' && manhattan(m.cx, m.cy, P.cx, P.cy) === 1);
    if (gaz.length) { const want = dirTo(P.cx, P.cy, gaz[0].cx, gaz[0].cy); if (want !== P.dir) { out.push({ c: 'turn', s: ((want - P.dir + 4) % 4) === 3 ? -1 : 1 }); return false; } this.attack(b, out); return false; }
    // a lock to turn (all of them caged; the relocked one after)
    const pending = Object.keys(Bs.locks).find(id => !Bs.locks[id]);
    if (pending && (Bs.phase === 1 || Bs.relocked)) {
      const ft = IX().feats[pending]; const r = this.goTo(ft.x, ft.y, out); if (r) return false; if (!this.face(ft.dir, out)) return false;
      if (!T && Bs.atkT > 1.6) { out.push({ c: 'use' }); b.wait = .2; }
      return false;
    }
    // the open Eye: beside it, strike; casters dart it
    if (manhattan(Bs.cx, Bs.cy, P.cx, P.cy) === 1) { const want = dirTo(P.cx, P.cy, Bs.cx, Bs.cy); if (want !== P.dir) { out.push({ c: 'turn', s: ((want - P.dir + 4) % 4) === 3 ? -1 : 1 }); return false; } this.attack(b, out); return false; }
    const spots = [0, 1, 2, 3].map(d => [Bs.cx + DX[d], Bs.cy + DY[d]]).filter(([x, y]) => B.partyCan(x, y) && !monsAt(x, y).length).sort((p, q) => manhattan(p[0], p[1], P.cx, P.cy) - manhattan(q[0], q[1], P.cx, P.cy));
    for (const [x, y] of spots) { const r = this.goTo(x, y, out); if (r === 'moving') return false; }
    return false;
  },
  /** the whole campaign's walk, floor by floor (the bot reads each floor's walk as it arrives) */
  campaign(o = {}) {
    const b = this.make([], o); b.floor = null; b.campaign = true;
    const tick = this.tick.bind(this);
    b.tickAll = dt => { if (S.floor !== b.floor && !S.transit) { b.floor = S.floor; b.steps = (B.FLOORS[S.floor].walk || []).slice(); b.i = 0; b.sub = {}; b.stepT = 0; b.done = false; } return tick(b, dt); };
    return b;
  }
};
B.Bot = Bot;
