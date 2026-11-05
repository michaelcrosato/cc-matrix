/* 20-events: matchday events (registry 'event'): a seagull that sits on the ball, a beach ball from the crowd, a pitch
 * invader with stewards, the floodlights failing, flare smoke, a camera drone and fireworks. At most one a half, never
 * at a set piece or in the last minutes; all through the match's rng, so a seed replays them. */
EF.def('event', 'seagull', { name: 'SEAGULL', chance: .8, start(m, e) { e.x = m.ball.x; e.y = m.ball.y; e.t = 0; e.landed = false; },
  update(m, e, dt) {
    e.t += dt; const b = m.ball;
    if (!e.landed) { if (!m.owner && hyp(b.vx, b.vy) < 60) { e.landed = true; e.x = b.x; e.y = b.y; m.emit('gullLand', {}); } if (e.t > 12) return true; return false; }
    if (!e.gone) { b.x = e.x; b.y = e.y; b.vx = b.vy = 0; if (m.owner) m.owner = null;
      const near = m.players.some(p => !p.sentOff && hyp(p.body.x - e.x, p.body.y - e.y) < 12);
      if (near || e.t > 14) { e.gone = true; e.goneT = e.t; m.emit('gullAway', {}); } }
    return e.gone && e.t - e.goneT > 2;
  } });
EF.def('event', 'beachball', { name: 'BEACH BALL', chance: .8, start(m, e) {
    e.body = new E.Body({ x: lerp(P.X0, P.X1, .3 + m.rng() * .4), y: P.Y0 - 10, r: 7, friction: 0, bounce: .9, gravity: 200 }); e.body.vy = 80; e.body.vz = 80; e.body.z = 30; e.t = 0;
  },
  update(m, e, dt) {
    e.t += dt; const k = e.body; k.vx *= Math.exp(-dt * .3); k.vy *= Math.exp(-dt * .3); k.update(dt, m.map);
    const b = m.ball;
    if (!m.owner && hyp(b.x - k.x, b.y - k.y) < 10 && Math.abs(b.z - k.z) < 12) { const a = Math.atan2(b.y - k.y, b.x - k.x), sp = hyp(b.vx, b.vy); b.vx = Math.cos(a) * Math.max(60, sp * .7); b.vy = Math.sin(a) * Math.max(60, sp * .7); k.vx -= Math.cos(a) * 40; k.vy -= Math.sin(a) * 40; k.vz = 70; m.emit('beachHit', {}); }
    for (const p of m.players) if (hyp(p.body.x - k.x, p.body.y - k.y) < 10 && k.z < 14) { const a = Math.atan2(k.y - p.body.y, k.x - p.body.x); k.vx = Math.cos(a) * 90; k.vy = Math.sin(a) * 90; k.vz = 90; }
    if (e.t > 20 && !e.popped) { e.popped = true; m.emit('beachPop', { x: k.x, y: k.y }); }
    return e.popped;
  } });
const invader = (who) => ({ name: who === 'keith' ? 'KIPPER KEITH' : 'THE STEEL STAG', chance: .7, who, start(m, e) {
    e.body = new E.Body({ x: P.X0 + 40, y: P.Y1 + 20, r: 5, friction: 0, gravity: 700 }); e.t = 0; e.stewards = [0, 1].map(i => new E.Body({ x: P.X0 + 10 - i * 14, y: P.Y1 + 24, r: 5, friction: 0, gravity: 700 })); e.who = this.who;
    m.emit('invader', { who: this.who });
  },
  update(m, e, dt) {
    e.t += dt; const k = e.body;
    if (!e.caught) {
      const tx = lerp(P.X0, P.X1, Math.min(1, e.t / 14)), ty = P.CY + Math.sin(e.t * 1.7) * 160;
      const dx = tx - k.x, dy = ty - k.y, d = hyp(dx, dy) || 1; k.vx = dx / d * 95; k.vy = dy / d * 95; k.update(dt, m.map);
      e.stewards.forEach((s, i) => { const ex = k.x - s.x, ey = k.y - s.y, dd = hyp(ex, ey) || 1; s.vx = ex / dd * (80 + i * 6); s.vy = ey / dd * (80 + i * 6); s.update(dt, m.map); });
      const b = m.ball; if (!m.owner && hyp(b.x - k.x, b.y - k.y) < 7 && b.z < 20) { b.vx *= -.6; b.vy *= -.6; }
      // tackled by a human: euphoria and a sticker
      for (const p of m.players) if (p.human != null && (p.state === 'slide' || p.state === 'poke' || p.state === 'barge') && hyp(p.body.x - k.x, p.body.y - k.y) < 12) { e.caught = true; e.caughtT = e.t; m.gain(p.side, 10, 'invader'); m.emit('invaderTackled', { who: this.who, by: p.id }); break; }
      if (e.t > 15 || e.stewards.some(s => hyp(s.x - k.x, s.y - k.y) < 8)) { e.caught = true; e.caughtT = e.t; m.emit('invaderCaught', { who: this.who }); }
    } else {
      const dx = P.CX - k.x, dy = P.Y1 + 40 - k.y, d = hyp(dx, dy) || 1; k.vx = dx / d * 60; k.vy = dy / d * 60; k.update(dt, m.map);
      e.stewards.forEach((s, i) => { s.x = k.x - 8 + i * 16; s.y = k.y; });
      if (e.t - e.caughtT > 4) return true;
    }
    return false;
  } });
EF.def('event', 'invader-keith', invader('keith'));
EF.def('event', 'invader-stag', invader('stag'));
EF.def('event', 'floodlight', { name: 'FLOODLIGHT FAILURE', chance: .6, night: true, start(m, e) { e.t = 0; m.emit('floodFail', {}); }, update(m, e, dt) { e.t += dt; e.dark = e.t < 4 && (e.t > .6 || Math.sin(e.t * 40) > 0); if (e.t > 4 && !e.back) { e.back = true; m.emit('floodBack', {}); } return e.t > 5; } });
EF.def('event', 'flaresmoke', { name: 'FLARE SMOKE', chance: .9, start(m, e) { e.t = 0; e.y = P.CY + (m.rng() - .5) * 200; m.emit('flareSmoke', {}); }, update(m, e, dt) { e.t += dt; return e.t > 15; } });
EF.def('event', 'drone', { name: 'CAMERA DRONE', chance: .9, start(m, e) { e.t = 0; m.emit('drone', {}); }, update(m, e, dt) { e.t += dt; e.x = lerp(P.X0 - 60, P.X1 + 60, e.t / 12); e.y = P.CY + Math.sin(e.t) * 80; return e.t > 12; } });
EF.def('event', 'fireworks', { name: 'FIREWORKS', chance: .9, start(m, e) { e.t = 0; m.emit('fireworks', {}); }, update(m, e, dt) { e.t += dt; return e.t > 6; } });
Match.prototype.eventsStep = function (dt) {
  const m = this;
  if (m.cheats.pure || m.o.pure || m.o.training || m.session && false) return;
  if (!m.evPlan) {
    m.evPlan = [];
    const list = (m.st.events || []).map(id => EF.get('event', id)).filter(Boolean).filter(e => !e.night || m.st.time !== 'day');
    for (let h = 1; h <= 2; h++) if (list.length) { const e = list[Math.floor(m.rng() * list.length)]; if (m.rng() < e.chance) m.evPlan.push({ id: e.id, half: h, minute: (h - 1) * 45 + 10 + m.rng() * 28 }); }
  }
  if (m.ev) { const def = EF.get('event', m.ev.id); if (def.update(m, m.ev, dt)) { m.emit('eventEnd', { id: m.ev.id }); m.ev = null; } return; }
  const next = m.evPlan.find(p => !p.done && p.half === m.half && m.minute >= p.minute);
  if (next && m.mode === 'play' && !m.sp && m.minute < m.half * 45 - 5) { next.done = true; m.startEvent(next.id); }
};
Match.prototype.startEvent = function (id) {
  const def = EF.get('event', id); if (!def) return;
  if (this.ev) this.emit('eventEnd', { id: this.ev.id });
  this.ev = { id }; def.start.call(def, this, this.ev); this.emit('event', { id, name: def.name });
};
