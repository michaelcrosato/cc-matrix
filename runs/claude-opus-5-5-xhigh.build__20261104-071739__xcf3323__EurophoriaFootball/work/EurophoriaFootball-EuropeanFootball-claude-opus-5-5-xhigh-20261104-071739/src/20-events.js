/* MATCHDAY EVENTS (section 6.20): registry 'event' { stadiums, chance, when: { minute: [a, b], ballLoose }, start(m),
 * update(m, dt) -> true when finished, lines }. At most one a half; none at set pieces or in the last 5 minutes. All
 * through m.rng, so a seed replays them. The presentation draws each from its state (m.events). */
Object.assign(Match.prototype, {
  eventsStep(dt) {
    for (const ev of this.events.slice()) { let done = false; try { done = ev.def.update(this, ev, dt); } catch (e) { game.fail('event ' + ev.def.id, e); done = true; } ev.t += dt; if (done) { this.events.splice(this.events.indexOf(ev), 1); if (ev.def.done) ev.def.done(this, ev); this.emit('eventEnd', { id: ev.def.id }); } }
    if (this.mode !== 'play' || this.half >= 3 || this.eventsDone[this.half] || this.minute > 85 || this.events.length || this.kind === 'training') return;
    this.evCheckT = (this.evCheckT || 0) - dt; if (this.evCheckT > 0) return; this.evCheckT = 1;
    for (const def of EF.all('event')) {
      if (def.cosmetic || !(this.stadium.events || []).includes(def.id)) continue;
      const w = def.when || {}, mn = this.minute;
      if (w.minute && (mn < w.minute[0] * (this.half === 1 ? .5 : 1) || mn > w.minute[1])) continue;
      if (w.night && this.timeOfDay === 'day') continue;
      if (w.ballLoose && (this.owner || this.ball.speed() > 60 || this.ball.z > 2)) continue;
      if (this.rng() > (def.chance || .5) / 25 * (this.forceEvent === def.id ? 999 : 1)) continue;
      this.startEvent(def.id); break;
    }
  },
  startEvent(id) {
    const def = EF.get('event', id); if (!def) return null;
    const ev = { def, t: 0, id }; this.events.push(ev); this.eventsDone[this.half] = 1;
    try { def.start(this, ev); } catch (e) { game.fail('event ' + id, e); }
    this.emit('event', { id, name: def.name }); return ev;
  }
});
/* seagull: lands on a loose, slow ball and pins it until a player runs within 10 */
EF.def('event', 'seagull', { name: 'SEAGULL', stadiums: ['smokehouse'], chance: .7, when: { minute: [10, 80], ballLoose: true }, lines: 'event-seagull',
  start(m, ev) { const b = m.ball; ev.x = b.x + 60; ev.y = b.y - 40; ev.z = 70; ev.state = 'fly'; },
  update(m, ev, dt) {
    const b = m.ball;
    if (ev.state === 'fly') { ev.x = lerp(ev.x, b.x, dt * 3); ev.y = lerp(ev.y, b.y, dt * 3); ev.z = Math.max(4, ev.z - dt * 60); if (ev.z <= 4.5 && H.d2(ev.x, ev.y, b.x, b.y) < 4) { if (m.owner) { ev.state = 'away'; return false; } ev.state = 'sit'; b.held = true; b.heldBy = null; b.vx = b.vy = 0; m.emit('gullLand', {}); } return ev.t > 6; }
    if (ev.state === 'sit') { ev.x = b.x; ev.y = b.y; ev.z = 4; if (m.players.some(f => H.d(f.body, b) < 10) || ev.t > 9 || m.mode !== 'play') { ev.state = 'away'; b.held = false; m.emit('gullAway', {}); } return false; }
    ev.z += dt * 50; ev.x += dt * 90; ev.y -= dt * 30; return ev.z > 160;
  } });
/* beach ball: a fan throws one on; it deflects the real ball and bodies for 20 s, then the referee pops it */
EF.def('event', 'beachball', { name: 'BEACH BALL', stadiums: ['pasapasa'], chance: .7, when: { minute: [10, 80] }, lines: 'event-beachball',
  start(m, ev) { ev.body = new E.Body({ x: P.CX + (m.rng() - .5) * 300, y: P.Y0 - 10, r: 7, bounce: .9, gravity: 200, friction: 0 }); ev.body.z = 40; ev.body.vy = 90; ev.body.vz = 60; ev.body.onGround = false; },
  update(m, ev, dt) {
    const B = ev.body, b = m.ball; B.vx *= Math.exp(-dt * .6); B.vy *= Math.exp(-dt * .6); B.update(dt, m.pitch.map);
    B.x = clamp(B.x, P.X0 + 8, P.X1 - 8); B.y = clamp(B.y, P.Y0 + 8, P.Y1 - 8);
    const d = H.d(B, b); if (d < 10 && Math.abs(b.z - B.z) < 12 && !m.owner) { const a = H.ang(B, b), sp = Math.max(60, b.speed() * .8); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; B.vx -= Math.cos(a) * 40; B.vy -= Math.sin(a) * 40; B.vz = 70; m.emit('beachHit', {}); }
    for (const f of m.players) if (H.d(f.body, B) < 12) { const a = H.ang(f.body, B); B.vx = Math.cos(a) * 110; B.vy = Math.sin(a) * 110; B.vz = 90; B.onGround = false; }
    if (ev.t > 20 && !ev.popped) { ev.popped = true; m.emit('beachPop', { x: B.x, y: B.y }); }
    return ev.t > 20.4;
  } });
/* pitch invader: Kipper Keith (the Smokehouse) or the Steel Stag; stewards chase; a human who tackles him gets Euphoria and a sticker */
const invader = (id, who, stadium) => EF.def('event', id, { name: who, stadiums: [stadium], chance: .6, when: { minute: [20, 75] }, lines: 'event-invader', who,
  start(m, ev) { ev.body = new E.Body({ x: P.X0 + 80 + m.rng() * (P.L - 160), y: P.Y1 + 20, r: 6, gravity: 700 }); ev.zig = 0; ev.stewards = [0, 1].map(i => new E.Body({ x: ev.body.x + (i ? 30 : -30), y: P.Y1 + 34, r: 5, gravity: 700 })); ev.kind = id; ev.facing = -Math.PI / 2; },
  update(m, ev, dt) {
    const B = ev.body; ev.zig += dt;
    if (!ev.caught) { const tx = B.x + Math.sin(ev.zig * 2.4) * 60, ty = P.Y0 - 20; const d = H.d2(tx, ty, B.x, B.y) || 1; B.vx = (tx - B.x) / d * 95; B.vy = (ty - B.y) / d * 95; ev.facing = Math.atan2(B.vy, B.vx); }
    else { B.vx = approach(B.vx, 0, 300 * dt); B.vy = approach(B.vy, 0, 300 * dt); }
    B.update(dt, m.pitch.map); B.x += B.vx * 0;
    for (const s of ev.stewards) { const d = H.d(s, B) || 1; s.vx = (B.x - s.x) / d * 88; s.vy = (B.y - s.y) / d * 88; s.update(dt, m.pitch.map); if (d < 9 && !ev.caught && ev.t > 3) { ev.caught = 'stewards'; ev.caughtT = ev.t; m.emit('invaderCaught', { by: 'stewards' }); } }
    const b = m.ball; if (!m.owner && H.d(B, b) < 8 && b.z < 20) { const a = H.ang(B, b), sp = Math.max(60, b.speed() * .7); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; m.emit('invaderBall', {}); }
    for (const f of m.players) {
      if (!ev.caught && H.d(f.body, B) < 9 && (f.state === 'slide' || f.state === 'poke' || f.state === 'barge')) {
        ev.caught = 'player'; ev.caughtT = ev.t; if (f.human) { m.addEuphoria(f.side, 10, 'invader'); m.emit('invaderTackled', { who: f, id }); } else m.emit('invaderCaught', { by: 'player' });
      }
    }
    if (ev.caught) { ev.down = true; return ev.t - ev.caughtT > 2.5; }
    return B.y < P.Y0 - 10 || ev.t > 14;
  } });
invader('invader-keith', 'KIPPER KEITH', 'smokehouse'); invader('invader-stag', 'THE STEEL STAG', 'stahlpresse');
/* floodlight flicker (night matches): the lights stutter and fail for 4 s */
EF.def('event', 'floodlight', { name: 'FLOODLIGHT FAILURE', stadiums: ['smokehouse', 'stahlpresse'], chance: .6, when: { minute: [15, 80], night: true }, lines: 'event-floodlight',
  start(m, ev) { m.lightsOut = 0; },
  update(m, ev) { const t = ev.t; m.lightsOut = t < .8 ? (Math.floor(t * 12) % 2) : t < 4.8 ? 1 : t < 5.4 ? (Math.floor(t * 14) % 2) : 0; if (t > 5.4) { m.lightsOut = 0; return true; } return false; } });
/* flare smoke (Lucchetto): red smoke drifts across a band of the pitch for 15 s; cosmetic */
EF.def('event', 'flaresmoke', { name: 'FLARE SMOKE', stadiums: ['lucchetto'], chance: .7, when: { minute: [10, 80] }, lines: 'event-smoke',
  start(m, ev) { ev.x = P.X0 + m.rng() * P.L; ev.dir = m.rng() < .5 ? -1 : 1; },
  update(m, ev, dt) { ev.x += ev.dir * dt * 22; return ev.t > 15; } });
/* drone (the Euphorium): a camera drone flies over; cosmetic */
EF.def('event', 'drone', { name: 'DRONE', stadiums: ['euphorium'], chance: .7, when: { minute: [10, 80] }, lines: 'event-drone',
  start(m, ev) { ev.x = P.X0 - 60; ev.y = P.CY + (m.rng() - .5) * 200; },
  update(m, ev, dt) { ev.x += dt * 70; ev.y += Math.sin(ev.t * 1.3) * dt * 20; return ev.x > P.X1 + 80; } });
/* fireworks: at goals and Europhoria in the Euphorium (the presentation fires them; listed for the dev menu) */
EF.def('event', 'fireworks', { name: 'FIREWORKS', stadiums: ['euphorium'], chance: 0, cosmetic: true, lines: 'event-fireworks',
  start(m, ev) { ev.n = 0; }, update(m, ev) { return ev.t > 3; } });
