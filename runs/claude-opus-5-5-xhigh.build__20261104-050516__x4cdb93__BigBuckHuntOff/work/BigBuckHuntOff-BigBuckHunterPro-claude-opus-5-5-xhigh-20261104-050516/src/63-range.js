// 63-range: Uncle Dub's Practice Range: seven stations, each a line from Dub, an objective with the glyphs for this
// player's device, and a check; then the Range badge in the Lodge.
function rangePaper(B, b, d, o = {}) {   // a paper target on a stand: a deer (or a doe) side-on with the vital ring
  const w = B.at(b, d), H = B.H, doe = !!o.doe;
  const T2 = B.add(Object.assign({ kind: doe ? 'paperdoe' : 'paper', points: doe ? 0 : o.points || 100, protected: doe, label: doe ? 'THAT\'S A DOE' : '', x: w.x, y: w.y, z: w.z, life: o.life || 1e9, box: [30, 34], counts: !doe, holes: [], down: 0,
    zones: T => { if (T.down > .3) return []; const R = H.lens, rx = R.Rx, ry = R.Ry, P = (lat, up) => [T.x + rx * lat * M, T.y + ry * lat * M, T.z + up * M];
      return [{ id: 'heart', a: P(.34, .86), r: .13 * M }, { id: 'body', a: P(-.55, 1.0), b: P(.45, 1.0), r: .36 * M }, { id: 'head', a: P(.78, 1.42), r: .2 * M }]; },
    update: (T, dt) => { if (T.move) { T.d0 = (T.d0 || 0) + dt * T.move; const p = B.at(T.b0 + Math.sin(T.d0) * T.amp, d); T.x = p.x; T.y = p.y; T.vx = (T.lx === undefined ? 0 : (p.x - T.lx) / dt); T.lx = p.x; } if (T.hitT) { T.down = Math.min(1, T.down + dt * 3); } },
    draw: (g, ox, oy, k, view, T) => drawPaper(g, ox, oy, k, T, doe),
    onHit: (T, B2, p, pt) => { const zs = T.zones(T), R = H.lens.ray(p.aimPoint()[0], p.aimPoint()[1]); let zone = 'body'; for (const z of zs) { const t = z.b ? rayCapsule(R, R, z.a, z.b, z.r) : raySphere(R, R, z.a, z.r); if (t !== null) { zone = z.id; break; } } T.lastZone = zone; T.hitT = H.time; if (G.sfx) G.sfx.play('wood'); if (zone === 'heart') HUD.banner('HEART SHOT!', { scale: 3 }); bus.emit('rangeHit', { T, zone, p }); if (!T.keep) T.alive = false; else T.hitT = 0; }
  }, o));
  return T2;
}
function drawPaper(g, ox, oy, k, T, doe) {
  const u = M * k, drop = T.down || 0, top = oy - 1.7 * u * (1 - drop * .9);
  px.rect(g, ox - .05 * u, top + .2 * u, Math.max(1, .1 * u), oy - top, '#6a5040');
  const C = doe ? '#c8a878' : '#e8dcc0', S = (lat, up) => [ox + lat * u, oy - up * u * (1 - drop * .9)];
  const body = [S(-.75, 1.25), S(.5, 1.32), S(.62, 1.15), S(.62, .7), S(-.75, .72)];
  px.poly(g, body, '#2a2018'); px.poly(g, body.map(p => [p[0] + .5, p[1] + .5]), C);
  px.disc(g, ...S(.8, 1.45), Math.max(1, .2 * u), C); px.line(g, ...S(.55, 1.25), ...S(.75, 1.4), C, Math.max(1, .14 * u));
  for (const x of [-.6, -.35, .3, .5]) px.line(g, ...S(x, .72), ...S(x, .2), C, Math.max(1, .07 * u));
  if (!doe) { const a = S(.8, 1.62); px.line(g, a[0], a[1], a[0] - .25 * u, a[1] - .35 * u, '#5a4030', Math.max(1, .05 * u)); px.line(g, a[0], a[1], a[0] + .2 * u, a[1] - .4 * u, '#5a4030', Math.max(1, .05 * u)); px.line(g, a[0] - .12 * u, a[1] - .18 * u, a[0] - .3 * u, a[1] - .2 * u, '#5a4030', 1); }
  const h = S(.34, .86); px.disc(g, h[0], h[1], Math.max(1, .2 * u), '#c83a2a'); px.disc(g, h[0], h[1], Math.max(.5, .13 * u), '#f4ecd8'); px.disc(g, h[0], h[1], Math.max(.5, .06 * u), '#c83a2a');
  if (doe && u > 3) E.font.text(g, 'DOE', ox, oy - 1.9 * u, '#c83a2a', { align: 'center', outline: '#1a0c08' });
}
function rangeTin(B, b, d, skunk) {
  const w = B.at(b, d), H = B.H;
  return B.add({ kind: skunk ? 'tinskunk' : 'tin', points: skunk ? 0 : 50, protected: skunk, label: skunk ? 'DON\'T SHOOT THE SKUNK' : '', x: w.x, y: w.y, z: w.z, life: 4.5, rise: 0, r: .18 * M, zc: .3 * M, box: [12, 14],
    update: T => { T.rise = T.t < .3 ? T.t / .3 : T.t > 3.8 ? Math.max(0, 1 - (T.t - 3.8) / .5) : 1; T.zc = (.3 * T.rise) * M; },
    draw: (g, ox, oy, k, view, T) => { const u = M * k, y = oy - (.35 * T.rise) * u; px.rect(g, ox - .02 * u, y, Math.max(1, .04 * u), oy - y, '#5a5a5a'); px.ell(g, ox, y - .12 * u, .16 * u, .14 * u, skunk ? '#1a1a1e' : '#8a8a90'); px.disc(g, ox + .14 * u, y - .24 * u, .08 * u, skunk ? '#1a1a1e' : '#9a9aa0'); px.line(g, ox - .14 * u, y - .1 * u, ox - .26 * u, y - .4 * u, skunk ? '#f4f4f0' : '#7a7a80', Math.max(1, .08 * u)); if (skunk) { px.line(g, ox - .1 * u, y - .24 * u, ox + .1 * u, y - .2 * u, '#f4f4f0'); if (u > 3) E.font.text(g, "DON'T", ox, y - .7 * u, '#e8443a', { align: 'center', outline: '#1a0c08' }); } },
    onHit: (T, B2, p) => { T.alive = false; if (G.sfx) G.sfx.play(skunk ? 'stink' : 'ping'); if (skunk) { H.stink = 1.5; Barks.caption('dub', 'Skunk. Even a tin one. Leave it be.'); } } });
}
const RANGE_STATIONS = [
  { name: 'AIM AND FIRE', dub: 'Three paper bucks. Put a round in each.', keys: [['fire', 'SHOOT']], setup(B) { this.ts = [rangePaper(B, -8, 22), rangePaper(B, 0, 22), rangePaper(B, 8, 22)]; }, done() { return this.ts.every(t => !t.alive); } },
  { name: 'PUMP', dub: 'Shoot, pump, shoot. Then empty the tube and let it reload.', keys: [['fire', 'SHOOT'], ['pump', 'PUMP']], setup(B) { this.t = rangePaper(B, 0, 22, { keep: true }); this.pumped = false; this.reloaded = false; this.offs = [bus.on('pump', () => { this.pumped = true; }), bus.on('reload', () => { this.reloaded = true; })]; }, done(B) { const r = B.H.players[0].rifle; return this.pumped && this.reloaded && r.reloadT <= 0 && r.chambered; }, end() { for (const f of this.offs) f(); } },
  { name: 'SHOT PLACEMENT', dub: 'See the ring behind the shoulder? That\'s his heart. Hit it.', keys: [['fire', 'SHOOT']], setup(B) { this.t = rangePaper(B, 0, 20, { keep: true }); this.ok = false; this.off = bus.on('rangeHit', e => { if (e.zone === 'heart') this.ok = true; else Barks.caption('dub', e.zone === 'head' ? 'Head works too. Show me the heart.' : 'Lower and forward. The ring.'); }); }, done() { return this.ok; }, end() { this.off(); } },
  { name: 'BUCKS ONLY', dub: 'Bucks and does on the track. Bucks only. Antlers, son.', keys: [['fire', 'SHOOT']], setup(B) { this.n = 0; this.spawnT = 0; this.off = bus.on('rangeHit', e => { if (e.T.kind === 'paper') this.n++; }); this.offD = bus.on('bonusHit', e => { if (e.T.kind === 'paperdoe') Barks.caption('dub', "That's a doe. No antlers. In a hunt, that benches you."); }); }, update(B, dt) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 2.2; this.k = (this.k || 0) + 1; const doe = this.k % 3 === 2; const T2 = rangePaper(B, -26, 30, { doe, life: 6 }); T2.move = .55; T2.b0 = 0; T2.amp = 26; T2.d0 = -Math.PI / 2; } }, done() { return this.n >= 3; }, end() { this.off(); this.offD(); } },
  { name: 'SCOPE AND BREATH', dub: 'Way out there. Scope up, hold your breath, squeeze.', keys: [['scope', 'SCOPE'], ['breath', 'HOLD BREATH'], ['fire', 'SHOOT']], setup(B) { this.t = rangePaper(B, 0, 152, { keep: true, points: 300 }); this.ok = false; this.off = bus.on('rangeHit', e => { const p = e.p; if (p.scope.up && (p.scope.holding || p.bot)) this.ok = true; else Barks.caption('dub', p.scope.up ? 'Hold your breath first.' : 'Use the scope out that far.'); }); }, done() { return this.ok; }, end() { this.off(); } },
  { name: 'THE CALL', dub: 'Mechanical deer. Call him, he stops. Then shoot.', keys: [['call', 'CALL'], ['fire', 'SHOOT']], setup(B) { const H = B.H; this.ok = false; this.T = rangePaper(B, -30, 40, { keep: true, points: 200 }); this.T.move = .9; this.T.b0 = 0; this.T.amp = 30; this.T.d0 = 0; this.T.moving = true; const T2 = this.T; this.offC = bus.on('call', () => { T2.stopT = 2; }); this.offH = bus.on('rangeHit', e => { if (e.T === T2) { if (T2.stopT > 0) this.ok = true; else Barks.caption('dub', 'Call him first. A stopped deer is a sure shot.'); } }); const up = T2.update; T2.update = (T, dt) => { if (T.stopT > 0) { T.stopT -= dt; T.vx = 0; } else up(T, dt); T.running = !(T.stopT > 0); }; B.H.players.forEach(p => { p.call.charges = 5; }); }, done() { return this.ok; }, end() { this.offC(); this.offH(); } },
  { name: 'CRITTERS', dub: 'Tin squirrels for bonus points. That one\'s a skunk. Don\'t.', keys: [['fire', 'SHOOT']], setup(B) { this.n = 0; this.k = 0; this.spawnT = 0; this.off = bus.on('bonusHit', e => { if (e.T.kind === 'tin') this.n++; }); }, update(B, dt) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 1.6; this.k++; rangeTin(B, -20 + (this.k * 13) % 40, 26 + (this.k % 3) * 3, this.k % 4 === 3); } }, done() { return this.n >= 3; }, end() { this.off(); } }
];
SEG.range = (H, o) => {
  let B, i = -1, t = 0, phase = 'intro', st = null;
  const next = () => { if (st && st.end) st.end(B); i++; t = 0; if (i >= RANGE_STATIONS.length) { phase = 'done'; Records.d.badge = true; Records.save(); Barks.caption('dub', "You'll do. Go win that Hunt-Off."); if (G.sfx) G.sfx.sting('fanfare'); return; } st = Object.create(RANGE_STATIONS[i]); for (const T2 of B.targets) T2.alive = false; st.setup(B); phase = 'line'; Barks.caption('dub', st.dub); for (const p of H.players) { p.rifle.setup({}); p.call.charges = Math.max(p.call.charges, 2); } };
  return { kind: 'range', canShoot: true, canCall: true,
    enter() { H.camAt('bench', 0, 2, 34); H.vantageId = 'bench'; H.fanB = [-60, 60]; H.vkind = 'range'; for (const p of H.players) { p.resetSite(); p.rx = H.W / 2; p.ry = H.H * .55; }
      B = H.bonus = new BonusRun(H, { id: 'range', vantage: 'bench', time: 1e9, timeline: function* () { yield E.until(() => false); } });
      if (G.sfx) { G.sfx.music('lodgefire', { fade: .6 }); G.sfx.ambience('range'); } Barks.caption('dub', reg('beat', 'range-intro').lines[0][1]); },
    update(dt) {
      t += dt; H.camAt('bench', 0, i === 4 ? 0 : 2, 34);
      B.update(dt);
      if (phase === 'intro' && (t > 2.5 || anyConfirm(H))) next();
      else if (phase === 'line' || phase === 'play') { if (phase === 'line' && t > 1) phase = 'play'; if (st.update) st.update(B, dt); if (st.done(B)) { phase = 'good'; t = 0; Barks.caption('dub', ['Good.', 'There you go.', 'Now you\'re talkin\'.', 'Not bad.'][i % 4]); if (G.sfx) G.sfx.play('confirm'); } }
      else if (phase === 'good' && t > 1.4) next();
      else if (phase === 'done' && (t > 3.5 || anyConfirm(H) && t > .8)) { H.bonusResult = { id: 'range', name: "Uncle Dub's Range", score: B.score, scores: B.scores, hits: B.hits, shots: B.shots, perfect: false }; Records.setBest('range', B.score); return true; }
      return false;
    },
    resolve(shots) { B.resolve(shots); },
    items(items) { B.items(items); },
    bot(p, bot, dt) {   // the bot does each lesson the way it asks: calls the running deer, empties the tube
      if (st && st.name === 'THE CALL' && !(st.T.stopT > 0) && (bot.callT = (bot.callT || 0) - dt) <= 0) { bot.callT = 2.5; H.useCall(p); }
      const keep = H.seg; H.seg = { canShoot: true, kind: 'rangeBot' }; bot.update(dt, p, H); H.seg = keep;
      if (st && st.name === 'PUMP' && p.rifle.rounds > 0 && !p.rifle.busy && p.rifle.chambered && H.time - p.rifle.last > .5) H.trigger(p);
    },
    draw(g, W, Ht) {
      if (!st) return;
      E.ui.box(g, W / 2 - 150, 8, 300, 36, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .9 });
      E.font.text(g, 'STATION ' + (i + 1) + ' OF 7: ' + st.name, W / 2, 13, '#ffd040', { align: 'center', outline: false });
      let x = W / 2 - st.keys.reduce((s, [a, txt]) => s + Glyph.measure(a, H.players[0].input) + 6 + E.font.width(txt) + 14, 0) / 2;
      for (const [a, txt] of st.keys) x += Glyph.cue(g, a, txt, x, 32, H.players[0].input, { align: 'left' }) + 14;
      if (phase === 'done') E.font.title(g, 'RANGE BADGE EARNED!', W / 2, Ht * .4, { scale: 2, colors: ['#fff6d8', '#ffd040', '#c87a10'], outline: '#1a0c08', align: 'center' });
    },
    exit() { if (st && st.end) st.end(B); H.bonus = null; }
  };
};
