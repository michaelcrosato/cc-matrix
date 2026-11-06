/* Perfect resident. Reads the live operation and aims the way a mouse would.
   The same function drives tests, attract mode, and couch colleagues. */
(() => {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GAME = (G.GAME ||= {});
  const DIGIT = { forceps: 1, scalpel: 2, suture: 3, salve: 4, syringe: 5, cautery: 6, suction: 7, sonar: 8 };
  const mems = new WeakMap();

  function hyp(x, y) { return Math.hypot(x, y); }
  function mem(S) {
    let m = mems.get(S);
    if (!m) {
      m = { ang: 0, skip: 0, giftCd: 0, saw: 0, stuck: 0, gid: 0, prog: -1 };
      mems.set(S, m);
    }
    return m;
  }
  function go(tool, x, y, trig, extra) {
    extra = extra || {};
    return {
      digit: DIGIT[tool] || 1, mouse: [x, y], trig: trig ? 1 : 0,
      fine: !!extra.fine, gift: !!extra.gift, consult: !!extra.consult, cancel: false,
      aim: [0, 0], move: [0, 0], why: extra.why || tool,
    };
  }
  function idle(p, extra) {
    return go(p.tool || 'forceps', p.bx, p.by, 0, extra);
  }
  function ignored(o) {
    if (!o || o.done || !o.alive || o.optional) return true;
    if (o.type === 'nerve' || o.type === 'eloquent' || o.type === 'hold' || o.type === 'retractor') return true;
    if (o.type === 'bead' && o.tag !== 'dacapo-bead') return true;
    return false;
  }
  function toolFor(o) {
    if (o.hidden && !o.marked) return 'sonar';
    if (o.type === 'pool') return 'suction';
    if (o.type === 'laceration' || o.type === 'patch' || o.type === 'bite') return 'salve';
    if (o.type === 'wound' || o.type === 'arteryTear') return 'suture';
    if (o.type === 'clot') return o.dosed ? 'forceps' : 'syringe';
    if (o.type === 'reed' || o.type === 'voice') return 'syringe';
    if (o.type === 'lobe') return o.mode === 'scalpel' ? 'scalpel' : o.mode || 'cautery';
    if (o.type === 'mass' || o.type === 'nest') return o.cut ? 'forceps' : 'scalpel';
    if (o.type === 'bleeder' || o.type === 'polyp' || o.type === 'rupture' || o.type === 'bead' || o.type === 'uvula' || o.type === 'eye' || o.type === 'tremass' || o.type === 'barb') return 'cautery';
    if (o.type === 'slur' || o.type === 'tendril' || o.type === 'spiral' || o.type === 'wire' || o.type === 'repeat' || o.type === 'cut') return 'scalpel';
    if (o.guide && !o.cut) return 'scalpel';
    if (o.pairs) return 'suture';
    if (o.cells && (o.type === 'laceration' || o.type === 'patch' || o.type === 'bite' || o.mode === 'salve')) return 'salve';
    return 'forceps';
  }
  function usable(S, o) {
    if (o.hidden && !o.marked) return true;
    if (o.type === 'lobe' && !o.open) return false;
    if (o.type === 'eye' && !o.open) return false;
    if (o.type === 'repeat' && !o.open) return false;
    if (o.type === 'reed' || o.type === 'voice') return true;
    if (o.needsWindow && S.windowOpen <= 0) return false;
    if (o.needsBoard && S.device && !S.device.shown) return false;
    return true;
  }
  function goals(S) {
    const list = [];
    const seen = new Set();
    const push = o => { if (o && !seen.has(o.id) && !ignored(o)) { seen.add(o.id); list.push(o); } };
    const sign = S.objects.find(o => o.tag === 'repeat' && o.open && !o.done);
    if (sign) push(sign);
    for (const o of S.objects) {
      if (ignored(o)) continue;
      if (S.device && S.device.order && o.type === 'wire' && o.tag !== S.device.order[S.device.next || 0]) continue;
      if (o.under) {
        const pool = GAME.Sim.objById(S, o.under);
        if (pool && !pool.done && pool.vol > 1) { push(pool); continue; }
      }
      push(o);
    }
    list.sort((a, b) => (a.order - b.order) || (b.drain - a.drain) || (a.id - b.id));
    return list;
  }
  function pointAlong(pts, dist) {
    let left = dist;
    for (let i = 1; i < pts.length; i++) {
      const L = hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) || 1;
      if (left <= L) {
        const u = left / L;
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
      }
      left -= L;
    }
    return pts[pts.length - 1].slice();
  }
  function polyLen(pts) {
    let n = 0;
    for (let i = 1; i < pts.length; i++) n += hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return n || 1;
  }
  function shock(S, p) {
    const peaks = [0.9, 1.8, 2.7, 3.6];
    const cb = S.codeBlue;
    const peak = peaks[cb.next] == null ? 99 : peaks[cb.next];
    const on = Math.abs(cb.t - peak) <= 0.045;
    return go('forceps', p.bx, p.by, on, { why: 'shock' });
  }
  function dressing(S, p) {
    const u = S.dressing.t % 1.2;
    return go('suture', p.bx, p.by, u < 0.045, { why: 'stamp' });
  }
  function act(S, p, o, dt, m) {
    const tool = toolFor(o);
    const fine = !!(S.strain && S.strain.jitter) || (o.tension && o.tension < 80) || tool === 'suture' || tool === 'scalpel';
    const near = (x, y, r) => hyp(p.bx - x, p.by - y) <= r;

    if (tool === 'sonar') return go('sonar', o.x, o.y, 1, { fine, why: 'sonar' });
    if (tool === 'suction') return go('suction', o.x, o.y, 1, { why: 'suction' });

    if (tool === 'salve') {
      const cell = (o.cells || []).find(c => !c[2]);
      const x = cell ? cell[0] : o.x, y = cell ? cell[1] : o.y;
      return go('salve', x, y, 1, { why: 'salve' });
    }

    if (tool === 'syringe' && (o.type === 'reed' || o.type === 'voice')) {
      const beat = (S.strain && S.strain.beat) || 0;
      /* Charge in clear tissue. A closed reed splits if the needle lets go on it, and the neighbors sit inside that reach. */
      const park = [46, 188];
      if (!o.window) {
        if (p.fill >= 0.97) return go('syringe', park[0], park[1], 0, { fine: true, why: 'dump' });
        const charging = p.cool <= 0 && p.fill < 0.94 && beat >= 0.12 && beat < 0.68;
        return go('syringe', park[0], park[1], charging || (p.fill > 0.05 && p.fill < 0.94), { fine: true, why: 'prime' });
      }
      if (p.fill < 0.9) return go('syringe', o.x, o.y, 1, { fine: true, why: 'fill' });
      return go('syringe', o.x, o.y, 0, { fine: true, why: 'dose' });
    }

    if (tool === 'syringe') {
      if (!near(o.x, o.y, 3)) return go('syringe', o.x, o.y, p.fill > 0.2 && p.fill < 0.96 ? 1 : 0, { fine, why: 'aimdose' });
      if (p.fill < 0.93 && p.cool <= 0) return go('syringe', o.x, o.y, 1, { fine, why: 'fill' });
      return go('syringe', o.x, o.y, 0, { fine, why: 'dose' });
    }

    if (tool === 'cautery') {
      if (p.lock > 0 || p.heat > 0.78) return go('cautery', o.x, o.y, 0, { why: 'cool' });
      return go('cautery', o.x, o.y, 1, { why: 'burn' });
    }

    if (tool === 'suture') {
      const pair = o.pairs[o.stitch || 0];
      if (!pair) return idle(p, { why: 'nopair' });
      const a = pair[0], b = pair[1];
      if (!(p.stroke && p.stroke.kind === 'suture' && p.stroke.id === o.id)) {
        return go('suture', a[0], a[1], near(a[0], a[1], 2), { fine: true, why: 'needle' });
      }
      if (near(b[0], b[1], 1.2)) return go('suture', b[0], b[1], 0, { fine: true, why: 'pop' });
      const dx = b[0] - p.bx, dy = b[1] - p.by, d = hyp(dx, dy) || 1;
      const step = Math.min(d, 90 * dt);
      return go('suture', p.bx + dx / d * step, p.by + dy / d * step, 1, { fine: true, why: 'cross' });
    }

    if (tool === 'scalpel' && (o.slash || o.type === 'nest' || (o.type === 'lobe' && o.mode === 'scalpel')) && !o.guide) {
      if (!near(o.x - 8, o.y, 2)) return go('scalpel', o.x - 8, o.y, 0, { why: 'windup' });
      return go('scalpel', o.x + 8, o.y, 1, { why: 'slash' });
    }
    if (tool === 'scalpel' && o.type === 'lobe' && o.slash && !o.cut) {
      if (!near(o.x - 8, o.y, 2)) return go('scalpel', o.x - 8, o.y, 0, { why: 'windup' });
      return go('scalpel', o.x + 8, o.y, 1, { why: 'slash' });
    }

    if (tool === 'scalpel' && o.guide) {
      const g = o.guide;
      const start = g[0];
      if (!(p.stroke && p.stroke.kind === 'scalpel' && p.stroke.id === o.id) || p.stroke.paused) {
        return go('scalpel', start[0], start[1], near(start[0], start[1], 2) ? 1 : 0, { fine, why: 'start' });
      }
      if (o.beatLock && S.flags.onBeat) return go('scalpel', p.bx, p.by, 1, { fine: true, why: 'waitbeat' });
      const far = p.stroke.far || 0;
      const pt = pointAlong(g, Math.min(polyLen(g), far + 160 * dt + 0.8));
      return go('scalpel', pt[0], pt[1], 1, { fine, why: 'trace' });
    }

    if (o.type === 'screw') {
      if (p.held !== o.id) {
        const on = near(o.x + 12, o.y, 3);
        return go('forceps', o.x + 12, o.y, on && p.prevTrig <= 0.3, { why: 'screw' });
      }
      m.ang += 0.55;
      return go('forceps', o.x + Math.cos(m.ang) * 12, o.y + Math.sin(m.ang) * 12, 1, { why: 'turn' });
    }

    if (tool === 'forceps') {
      if (p.held && p.held !== o.id) return go('forceps', p.bx, p.by, 0, { why: 'drop' });
      if (p.held !== o.id) {
        const on = near(o.x, o.y, 2.5);
        return go('forceps', o.x, o.y, on && p.prevTrig <= 0.3, { fine, why: 'grip' });
      }
      const limit = Math.min(78, (o.tension || 120) * 0.6);
      const ox = o.origin[0], oy = o.origin[1];
      const along = (p.bx - ox) * o.axis[0] + (p.by - oy) * o.axis[1];
      /* Stay on the trigger until the sim calls it free. Releasing at depth-epsilon drops a deep pull. */
      if (!o.free) {
        const n = Math.min((o.depth || 16) + 1.5, along + limit * dt);
        return go('forceps', ox + o.axis[0] * n, oy + o.axis[1] * n, 1, { fine: limit < 70, why: 'pull' });
      }
      const tx = ox + o.axis[0] * (Math.max(o.depth, 0) + 30);
      const ty = oy + o.axis[1] * (Math.max(o.depth, 0) + 30);
      const dx = tx - p.bx, dy = ty - p.by, d = hyp(dx, dy) || 1;
      if (hyp(p.bx - ox, p.by - oy) < 26) {
        const step = Math.min(d, limit * dt);
        return go('forceps', p.bx + dx / d * step, p.by + dy / d * step, 1, { fine: true, why: 'carry' });
      }
      return go('forceps', p.bx, p.by, 0, { why: 'dish' });
    }
    return go(tool, o.x, o.y, 1, { why: 'generic' });
  }

  function device(S, i, dt) {
    const p = S.players[i] || S.players[0];
    const m = mem(S);
    if (m.giftCd > 0) m.giftCd -= dt;
    if (m.consultCd > 0) m.consultCd -= dt;
    if (!p || p.gone) return idle(S.players[0] || { bx: 213, by: 150, tool: 'forceps' });
    if (S.won || S.lost) return idle(p);
    if (S.codeBlue) return shock(S, p);
    if (S.dressing) return dressing(S, p);

    const n = S.players.filter(q => !q.gone).length;
    if (n > 1 && i === 0 && S.objects.some(o => o.needsWindow && !o.done && o.alive)) {
      const h = S.objects.find(o => o.type === 'retractor' && !o.done);
      if (h) return go('forceps', h.x, h.y, 1, { why: 'hold' });
    }

    let gift = false, consult = false;
    const breathOk = S.gift === 'breath' || S.activeDoc === 'vale' || (S.gift === 'both' && S.activeDoc !== 'sokolova');
    const lookOk = S.gift === 'look' || S.activeDoc === 'sokolova' || S.gift === 'both';
    if (!S.breath && m.giftCd <= 0 && S.steady >= 35 && breathOk && (S.flags.needBreath || (S.strain && S.strain.jitter && S.strain.kind === 'tremolo'))) {
      gift = true; m.giftCd = 0.5;
    }
    if (!gift && !S.breath && m.giftCd <= 0 && S.steady >= 45 && lookOk && S.flags.needLook && S.mode !== 'rounds' && (S.slips || 0) > (m.seenSlips || 0)) {
      gift = true; m.giftCd = 1.2; m.seenSlips = S.slips;
    }
    const wantDoc = S.flags.needLook ? 'sokolova' : (S.flags.needBreath ? 'vale' : null);
    if (S.consult && wantDoc && S.activeDoc !== wantDoc && (m.consultCd || 0) <= 0) {
      consult = true; m.consultCd = 0.45;
    }
    if (gift || consult) return go(p.tool || 'forceps', p.bx, p.by, 0, { gift, consult, why: 'gift' });

    if (S.device && !S.device.shown && S.objects.some(o => o.needsBoard && !o.done)) {
      return go('sonar', S.device.x || 213, S.device.y || 100, 1, { why: 'board' });
    }

    const needIv = S.flags.needIv && (S.flags.iv || 0) < S.flags.needIv;
    const blocking = S.objects.some(o => !o.done && (o.type === 'rupture' || o.type === 'reed' || o.type === 'arteryTear'));
    if ((needIv || S.vitals < 42) && p.cool <= 0 && !blocking) {
      if (p.fill < 0.93) return go('syringe', 46, 188, 1, { why: 'iv' });
      return go('syringe', 46, 188, 0, { why: 'iv' });
    }

    const list = goals(S).filter(o => usable(S, o));
    if (!list.length) return idle(p, { why: 'wait', fine: !!(S.strain && S.strain.jitter) });
    const o = list[Math.min(i, list.length - 1) % list.length];
    if (m.gid === o.id && Math.abs((o.prog || 0) - m.prog) < 0.01 && usable(S, o) && o.type !== 'reed' && o.type !== 'voice' && o.type !== 'lobe' && o.type !== 'eye') m.stuck += dt;
    else m.stuck = 0;
    m.gid = o.id; m.prog = o.prog || 0;
    if (m.stuck > 8) m.whyStuck = (S.phaseName || '') + ':' + o.type + ':' + (o.tag || '');
    const d = act(S, p, o, dt || 1 / 60, m);
    if (S.strain && S.strain.jitter) d.fine = true;
    return d;
  }

  function play(S, maxT, dt) {
    dt = dt || 1 / 60;
    const t0 = S.t;
    let guard = 0;
    while (S.t - t0 < maxT && !S.won && !S.lost && guard < 200000) {
      const inputs = [];
      for (let i = 0; i < S.players.length; i++) {
        const dev = device(S, i, dt);
        const p = S.players[i];
        GAME.Wheel.update(p, dev, dt);
        if (dev.mouse) GAME.Cursor.update(p, { mouse: dev.mouse, fine: dev.fine }, S, dt);
        inputs.push({ tool: p.tool, trig: dev.trig, fine: !!dev.fine, gift: !!dev.gift, consult: !!dev.consult, cancel: false, mouse: true });
      }
      GAME.Op.step(S, inputs, dt);
      guard++;
    }
    if (!S.won && !S.lost) S.timeout = true;
    return S;
  }

  GAME.Bot = { device, play, goals, toolFor };
})();
