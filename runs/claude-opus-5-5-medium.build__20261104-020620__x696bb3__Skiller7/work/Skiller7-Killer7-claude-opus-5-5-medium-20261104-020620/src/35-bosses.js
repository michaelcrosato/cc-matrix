/* SKILLER7 — bosses (§11.8): Bellcaptain Grau (a car in a shaft, a hat-tip window), Die Lustigen Vier (warm spots that
 * glow only while their own track sounds, on the music clock), Hansi Pulver (the Avalaugh, the slalom, the interview).
 * Also: the avalanche chase, ranks and the results. */
const BOSSES = {};
S7.BOSSES = BOSSES;
S7.bossTargets = () => (G && G.boss && BOSSES[G.boss.id].targets ? BOSSES[G.boss.id].targets(G.boss) : []);
S7.bossHit = (t, dmg, at, how) => { if (G.boss) BOSSES[G.boss.id].hit(G.boss, t, dmg, at, how); };
S7.bossStep = (dt, I) => { if (G.boss && !G.boss.done) BOSSES[G.boss.id].step(G.boss, dt, I); avalStep(dt); if (G.slowmo) { /* scene reads it */ } };
S7.startBoss = (id, phase) => { G.boss = BOSSES[id].start(phase || 1); emit('boss', { id, phase: G.boss.phase }); };
S7.bossFlash = (o, d) => { if (G.boss && BOSSES[G.boss.id].flash) BOSSES[G.boss.id].flash(G.boss, o, d); };
const bossWin = (b, beat) => { b.done = true; G.boss = null; emit('bossDead', { id: b.id }); runBeat(beat); };

/* ---- GRAU: the shaft (00C). Floors at 3, 6.5 and 10 m; the car in the middle; Grau throws, then tips his hat ---- */
const FLOORS = [3, 6.5, 10];
BOSSES.grau = {
  start(phase) {
    S7.autosave && S7.autosave('boss');
    return { id: 'grau', phase, t: 0, carZ: FLOORS[1] * M, carTo: FLOORS[0] * M, state: 'move', st: 0, throws: 0, hat: 0, hp: 150, noSwitch: true, floorI: 0, dropT: 6, hpMax: 150, name: 'BELLCAPTAIN GRAU', bar: 1 };
  },
  pos(b) { const H = heroPos(), c = [9 * M, 9 * M], a = Math.atan2(H.y - c[1], H.x - c[0]); return [c[0] + Math.cos(a) * 1.1 * M, c[1] + Math.sin(a) * 1.1 * M, b.carZ + (b.phase === 3 ? 2.6 * M : .1)]; },
  targets(b) {
    if (b.state === 'dying') return [];
    const p = this.pos(b), out = [{ id: 'body', kind: 'body', pos: [p[0], p[1], p[2] + 18], r: 9, capsule: 14 }];
    if (b.hat > 0) out.unshift({ id: 'head', kind: 'warm', window: true, pos: [p[0], p[1], p[2] + 1.75 * 1.4 * M], r: warmR() * 1.3 });
    return out;
  },
  step(b, dt) {
    b.t += dt; b.st += dt; b.hat = Math.max(0, b.hat - dt);
    const speed = b.phase === 2 ? 340 : 120;
    if (b.state === 'move') { b.carZ = approach(b.carZ, b.carTo, speed * dt); if (b.carZ === b.carTo) { b.state = 'ding'; b.st = 0; emit('ding', { phase: b.phase }); } }
    else if (b.state === 'ding' && b.st > .6) { b.state = 'throw'; b.st = 0; b.throws = 0; }
    else if (b.state === 'throw') {
      if (b.st > .55 && b.throws < 3) { b.st = 0; b.throws++; const p = this.pos(b), H = heroPos(); throwAt({ x: p[0], y: p[1], z: p[2] - .6 * M, size: 1.4 }, [H.x + RR('spawn', -34, 34), H.y + RR('spawn', -34, 34), H.z], 'suitcase'); if (b.phase >= 2 && R('spawn') < .5) { const side = [RR('spawn', 3, 15) * M, R('spawn') < .5 ? 2.5 * M : 15.5 * M]; throwAt({ x: side[0], y: side[1], z: 8 * M, size: 1 }, [H.x, H.y, H.z], 'suitcase'); } }
      if (b.throws >= 3 && b.st > .7) { b.state = 'hat'; b.st = 0; b.hat = b.phase === 3 ? 1 : 1.4; emit('hattip', {}); }
    } else if (b.state === 'hat' && b.hat <= 0) {
      b.state = 'move'; b.floorI = (b.floorI + 1 + Math.floor(R('spawn') * 2)) % 3; b.carTo = FLOORS[b.floorI] * M;
      if (b.phase === 2) { b.carTo = FLOORS[(b.floorI + 1) % 3] * M; }
    } else if (b.state === 'dying') { if (b.st > 2.4) { setFlag('grauDead'); bossWin(b, 't00_done'); } return; }
    if (b.phase === 3) { b.dropT -= dt; if (b.dropT <= 0) { b.dropT = 5; const H = heroPos(), c = 9 * M; spawnEnemy('giggler', c - (H.x - c) * .9, c - (H.y - c) * .9, undefined, { revealed: 4 }); emit('drop', {}); } }
  },
  hit(b, t, dmg) {
    if (b.state === 'dying') return;
    if (t.kind === 'warm' && b.hat > 0) { emit('crit', { enemy: null, boss: true }); S7.splash('CRITICAL BRAVO', 1.2, { big: true }); G.stats.crits++; G.stats.kills++; this.next(b); return; }
    if (b.hat > 0) { b.hp -= dmg; b.bar = Math.max(0, b.hp / b.hpMax); emit('hit', { target: 'grau', part: 'body', dmg }); if (b.hp <= 0) this.next(b); return; }
    emit('tink', { at: t.pos }); S7.splash('THE HAT.', .5, { small: true });
  },
  next(b) {
    b.hat = 0; b.hp = b.hpMax; b.bar = 1; b.phase++; emit('boss', { id: 'grau', phase: b.phase });
    if (b.phase === 2) { emit('cableSnap', {}); S7.barkLine('grau', 'The cable. Housekeeping will hear of this.', 2.6); b.state = 'move'; b.carTo = FLOORS[0] * M; }
    else if (b.phase === 3) { S7.barkLine('grau', 'Ding. Ding. Ding. Last call.', 2.6); b.state = 'move'; b.carTo = FLOORS[1] * M; }
    else { b.state = 'dying'; b.st = 0; G.rime += 10; S7.barkLine('grau', 'Checkout... is at... eleven...', 3); S7.killAll(); emit('melt', { boss: 'grau' }); }
  }
};
S7.beat('grau_intro', function* (B) {
  const G2 = B.G(); B.cut(true);
  yield B.card('TARGET 00 — AUGUSTIN GRAU', 'THE BELLCAPTAIN', 2.6, { target: true, who: 'grau' });
  yield B.cam({ shot: 'orbit', center: [9 * M, 9 * M, 3 * M], radius: 6 * M, height: 3 * M, speed: .35, t0: 0, lookUp: 2 * M, fov: 52 }, 999);
  yield B.say([['grau', 'Ding. Ding. Ding. Every floor has a bell, and every bell has a floor.'], ['grau', 'Your luggage, Madame? It is very heavy. It is full of everyone you were.']]);
  B.camOff(); B.cut(false); S7.startBoss('grau'); void G2;
  S7.tip('aim');
});

/* ---- DIE LUSTIGEN VIER: four musicians on the stage (01B ballroom). The band song's tracks are their windows ---- */
const BAND = [['tuba', 48, 16.8], ['accordion', 50.8, 16.6], ['trumpet', 53.4, 16.6], ['snare', 55.6, 16.8]];
const BPMS = [112, 124, 136, 148];
function trackOn(name, step) { const sg = S7.SONGS.band, tr = sg.tracks.find(t => t.name === name); if (!tr) return false; const tk = tr._tok || (tr._tok = tr.notes.split(/\s+/).filter(x => x && x !== '|')); const k = tk[step % tk.length]; return k !== '.'; }
S7.trackOn = trackOn;
BOSSES.band = {
  start(phase) {
    S7.autosave && S7.autosave('boss');
    return { id: 'band', phase, t: 0, clock: 0, step: 0, bpm: BPMS[0], bar: 1, name: 'DIE LUSTIGEN VIER', kills: 0, lastBar: -1,
      m: BAND.map(([name, x, y]) => ({ name, x: x * M, y: y * M, z: 16, dmg: 0, alive: true, dying: 0 })) };
  },
  window(b, mus) { return mus.alive && trackOn(mus.name, b.step); },
  targets(b) {
    const out = [];
    for (const mu of b.m) if (mu.alive) {
      const win = this.window(b, mu), solo = b.m.filter(x => x.alive).length === 1;
      out.push({ id: mu.name + ':body', kind: 'body', pos: [mu.x, mu.y, mu.z + 18], r: 8, capsule: 12, mu, window: win });
      out.push({ id: mu.name + ':warm', kind: 'warm', pos: [mu.x, mu.y, mu.z + (mu.name === 'tuba' && solo ? 30 : 22)], r: warmR() * 1.15, mu, window: win });
    }
    return out;
  },
  step(b, dt) {
    b.t += dt; b.clock += dt * b.bpm / 60 * 4; b.step = Math.floor(b.clock);
    const bar = Math.floor(b.step / 16);
    const Hb = heroPos(), inRoom = Math.hypot(Hb.x - 51.5 * M, Hb.y - 23 * M) < 14 * M;
    if (bar !== b.lastBar) { b.lastBar = bar; if (bar % 2 === 0 && inRoom && G.enemies.filter(e => e.alive && e.type === 'dancer').length < 4) for (const sd of [-1, 1]) spawnEnemy('dancer', (51.5 + sd * 6.5) * M, 19.5 * M, undefined, { revealed: 0 }); }
    for (const mu of b.m) if (!mu.alive) mu.dying += dt;
    if (b.m.every(x => !x.alive) && !b.ending) { b.ending = true; b.endT = 0; }
    if (b.ending) { b.endT += dt; if (b.endT > 1.6) { setFlag('band'); G.rime += 10; S7.killAll(); bossWin(b, 'band_done'); } }
  },
  hit(b, t, dmg) {
    const mu = t.mu; if (!mu || !mu.alive) return;
    if (!t.window) { emit('deflect', { at: t.pos }); S7.splash('THE MUSIC PROTECTS THEM.', .7, { small: true }); return; }
    if (t.kind === 'warm') { G.stats.crits++; this.kill(b, mu); S7.splash('CRITICAL BRAVO', 1.1, { big: true }); return; }
    mu.dmg += dmg; emit('hit', { target: mu.name, part: 'body', dmg }); if (mu.dmg >= 120) this.kill(b, mu);
  },
  kill(b, mu) {
    mu.alive = false; b.kills++; G.stats.kills++; b.bpm = BPMS[Math.min(3, b.kills)]; b.clock = b.step;   // (the clock keeps its place at the new tempo)
    b.bar = b.m.filter(x => x.alive).length / 4;
    emit('bandKill', { name: mu.name, bpm: b.bpm }); emit('kill', { type: 'musician', crit: true });
    if (mu.name === 'tuba' && !G.flags.edel2) { G.flags.edel2 = true; giveItem('edelweiss'); S7.splash('EDELWEISS PASS', 1.6); }
  }
};
S7.beat('band_intro', function* (B) {
  B.cut(true);
  yield B.card('DIE LUSTIGEN VIER', 'THE JOLLY FOUR', 2.6, { target: true, who: 'band' });
  yield B.cam({ shot: 'fixed', at: [51.5, 29.6, 2.4], look: [51.5, 16.8, 2], fov: 50 }, 999);
  yield B.say([['tuba', 'Eins! Zwei! Drei! Vier!'], ['kasimir', 'They play only on the beat. Shoot on the beat.']]);
  B.camOff(); B.cut(false); S7.startBoss('band');
});
S7.beat('band_done', function* (B) {
  yield B.say([['tuba', 'Bravo... bravo...']]);
  S7.splash('BRAVO.', 1.6, { big: true }); B.emit('bandDone', {});
});

/* ---- HANSI PULVER: the Avalaugh (5 warm spots, the Thaw), the slalom (hit him only at the gates), the interview ---- */
const AV = [200, 100];
const GATES = [.16, .31, .46, .61, .76, .9];
S7.SLALOM_GATES = GATES;
BOSSES.hansi = {
  start(phase) {
    S7.autosave && S7.autosave('boss');
    const b = { id: 'hansi', phase, t: 0, name: 'HANSI PULVER', bar: 1, snowT: 2.2, budT: 5, spots: [1, 1, 1, 1, 1], thaw: null, crits: 0, dmg: 0, hs: 0, wait: 0, medalT: 3, regrow: 0 };
    if (phase === 2) Object.assign(b, { noSwitch: true, aimOnTheMove: true });
    if (phase === 3) Object.assign(b, { noSwitch: true, lockWalker: true, t3: 0, forceAim: true });
    return b;
  },
  spotPos(i) { const P = [[-1.6, 6.8, 2.75], [0, 7.8, 3.05], [1.6, 6.8, 2.75], [-.7, 11.9, 1.95], [.7, 11.9, 1.95]][i]; return [AV[0] * M + P[0] * M, AV[1] * M + P[2] * M, W.grid.floor(AV[0] * M, AV[1] * M) + P[1] * M]; },
  balls() { const z0 = W.grid.floor(AV[0] * M, AV[1] * M); return [[3.5, 4], [8, 3], [11.5, 2]].map(([z, r]) => [[AV[0] * M, AV[1] * M, z0 + z * M], r * M]); },
  hansiPos(b) {
    const e = W.rails.byId['sl0-sl1'], s = clamp(b.hs, 0, e.len), p = edgePos(W.rails, e, s), a = p.angle + Math.PI / 2, off = (20 + Math.sin(s / 90) * 5) * M;
    return [p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, W.grid.floor(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off)];
  },
  inWindow(b) { const e = W.rails.byId['sl0-sl1']; return GATES.some(g => Math.abs(b.hs - g * e.len) < 84); },
  targets(b) {
    if (b.phase === 1) { const out = this.balls().map(([pos, r], i) => ({ id: 'av:ball' + i, kind: 'body', pos, r })); b.spots.forEach((on, i) => { if (on) out.unshift({ id: 'av:' + i, kind: 'warm', window: true, pos: this.spotPos(i), r: warmR() * 2.2, spot: i }); }); return out; }
    if (b.phase === 2) { const p = this.hansiPos(b), w = this.inWindow(b); return [{ id: 'h:warm', kind: 'warm', window: w, pos: [p[0], p[1], p[2] + 1.3 * 1.4 * M], r: warmR() * 1.4 }, { id: 'h:body', kind: 'body', window: w, pos: [p[0], p[1], p[2] + 18], r: 9, capsule: 12 }]; }
    return [];
  },
  step(b, dt, I) {
    b.t += dt;
    if (b.phase === 1) {
      const H = heroPos();
      b.snowT -= dt; if (b.snowT <= 0) { b.snowT = 3; G.proj.push({ id: G.nextId++, kind: 'snowball', team: 'enemy', p: [AV[0] * M, AV[1] * M + 3.4 * M, W.grid.floor(AV[0] * M, AV[1] * M) + 10.4 * M], v: [0, 0, 0], g: 300, hp: 1, r: 9, dmg: 12, t: 0, life: 5 }); const p = G.proj[G.proj.length - 1], d = V.sub([H.x, H.y, H.z + 16], p.p), tt = V.len(d) / 210; p.v = [d[0] / tt, d[1] / tt, d[2] / tt + 150 * tt]; emit('throw', { kind: 'snowball', at: p.p }); }
      b.budT -= dt; if (b.budT <= 0) { b.budT = 5; if (aliveEnemies().length < 6) spawnEnemy('giggler', (AV[0] + RR('spawn', -5, 5)) * M, (AV[1] + 6) * M, undefined, { revealed: 2 }); }
      const left = b.spots.filter(Boolean).length;
      if (left <= 2 && left > 0) { if (!b.thaw) { b.thaw = { t: 40 }; emit('thaw', {}); S7.splash('THE THAW', 1.6, { big: true }); } b.thaw.t -= dt; if (b.thaw.t <= 0) { hurt(60, null); const i = b.spots.indexOf(0); if (i >= 0) b.spots[i] = 1; b.thaw = null; emit('explode', { at: [AV[0] * M, AV[1] * M, 6 * M], radius: 12 }); } }
      b.bar = left / 5;
      if (!left && !b.down) { b.down = true; b.downT = 0; emit('avalaughDown', {}); S7.killAll(); }
      if (b.down) { b.downT += dt; if (b.downT > 2.2) { setFlag('avalaughDown'); G.boss = null; runBeat('hansi_slalom'); } }
    } else if (b.phase === 2) {
      const e = W.rails.byId['sl0-sl1'], wk = G.walker, ps = curEdge() === e ? wk.s : 0, lead = b.hs - ps;
      let v = clamp(170 + (lead < 15 * M ? 60 : lead > 45 * M ? -60 : 0), 60, 260);
      const nextGate = GATES.map(g => g * e.len).find(g => g > b.hs + 4);
      if (lead > 60 * M && nextGate !== undefined && nextGate - b.hs < 20) { v = 0; if (!b.waitBark) { b.waitBark = true; S7.barkLine('hansi', 'Bend the knees!', 2); } } else b.waitBark = false;
      if (this.inWindow(b)) v *= .55;   // (he carves round the pole: the flags flash red)
      b.hs = Math.min(e.len - 40, b.hs + v * dt);
      if (wk.node === 'sl1' && !b.crash) { S7.splash('AGAIN! FROM THE TOP!', 1.8, { big: true }); S7.barkLine('hansi', 'Ha! Too slow! Again, from the top!', 2.4); placeAtNode('sl0'); b.hs = 0; director.cut(); emit('slalomAgain', {}); }
      b.medalT -= dt; if (b.medalT <= 0 && !this.inWindow(b)) { b.medalT = 2.8; const p = this.hansiPos(b); throwAt({ x: p[0], y: p[1], z: p[2], size: 1.4 }, [heroPos().x, heroPos().y, heroPos().z], 'medal'); }
      b.bar = 1 - b.crits / 4;
      if (b.crits >= 4 && !b.crash) { b.crash = true; emit('hansiCrash', {}); S7.splash('HE IS DOWN.', 1.6); b.hs = e.len - 40; }
      if (b.crash && wk.node === 'sl1') { G.boss = null; runBeat('hansi_interview'); }
    } else if (b.phase === 3) {
      b.t3 += dt; G.aim.on = true; I.scan = false; I.skill = false;
      if (!b.l1 && b.t3 > 1) { b.l1 = true; S7.barkLine('hansi', 'You know what the Föhn told me? The snow is a lie the mountain tells the valley.', 4.2); }
      if (!b.l2 && b.t3 > 5.4) { b.l2 = true; S7.barkLine('hansi', 'Every spring the truth runs down into the rivers, and the children drink it.', 4.2); }
      if (!b.l3 && b.t3 > 9.8) { b.l3 = true; S7.barkLine('hansi', 'Your grandmother keeps it frozen. Who pays her? Who pays you? Same bank.', 4.4); }
      if (b.t3 > 24.2 && !b.end) { b.end = 'fell'; S7.barkLine('hansi', '...You hesitate. That\'s new. They usually don\'t.', 3.4); emit('hansiFall', {}); b.endT = 0; }
      if (b.end) { b.endT = (b.endT || 0) + dt; if (b.endT > 3.4) { setFlag('hansiDead'); G.ending = b.end; giveItem(b.end === 'shot' ? 'doc_t01' : 'doc_t01'); G.flags.ending = b.end; G.aim.on = false; bossWin(b, 't01_done'); } }
    }
  },
  hit(b, t, dmg) {
    if (b.phase === 1) {
      if (t.kind === 'warm') { b.spots[t.spot] = 0; G.stats.crits++; G.stats.kills++; emit('crit', { boss: true }); emit('melt', { spot: t.spot }); S7.splash('CRITICAL BRAVO', 1, { big: true }); return; }
      emit('tink', { at: t.pos }); return;
    }
    if (b.phase === 2) {
      if (!t.window) { emit('deflect', { at: t.pos }); S7.splash('AT THE GATES.', .6, { small: true }); return; }
      if (t.kind === 'warm') { b.crits++; G.stats.crits++; emit('crit', { boss: true }); S7.splash('CRITICAL BRAVO', 1, { big: true }); return; }
      b.dmg += dmg; if (b.dmg >= 90) { b.dmg -= 90; b.crits++; S7.splash('HIT.', .8); }
    }
  }
};
S7.bossShot = () => { if (G.boss && G.boss.id === 'hansi' && G.boss.phase === 3 && !G.boss.end && G.boss.t3 > .6) { G.boss.end = 'shot'; G.boss.endT = 0; emit('hansiShot', {}); S7.barkLine(G.persona, '...', 1.6); } };
S7.beat('hansi_intro', function* (B) {
  B.cut(true);
  yield B.card('TARGET 01 — HANSI PULVER', 'THE POWDER KING', 2.8, { target: true, who: 'hansi' });
  yield B.cam({ shot: 'fixed', at: [200, 138, 304], look: [200, 100, 304], fov: 50 }, 999);
  B.emit('hansiAppear', {});
  yield B.say([['hansi', 'Grüß Gott! You came for a lesson? Lesson one: everything goes downhill.']]);
  B.emit('avalaughRise', {}); yield 2.4;
  B.camOff(); B.cut(false); S7.startBoss('hansi', 1);
});
S7.beat('hansi_slalom', function* (B) {
  B.cut(true);
  yield B.say([['hansi', 'Ha! You melt my snowman? Race me, then! Gates only! Fair is fair!']]);
  B.cut(false); S7.startBoss('hansi', 2); S7.tip('ski');
  S7.barkLine(B.G().persona, 'Down the face. Hit him at the gates.', 2.6);
});
S7.beat('hansi_interview', function* (B) {
  B.cut(true); B.emit('fog', {});
  yield B.card('THE INTERVIEW', '', 2.2);
  B.cut(false); S7.startBoss('hansi', 3);
});

/* ---- the avalanche chase (01C, once): it runs at 92% of Dagny's tucked top speed; let go and it catches up ---- */
function avalStep(dt) {
  const a = G.aval; if (!a || G.mode !== 'play') return;
  a.t += dt; const wk = G.walker; a.pd += wk.v * dt; a.d += a.speed * dt;
  if (flag('lawineEnd')) { G.aval = null; setFlag('lawineDone'); S7.splash('CLEAR.', 1.4); emit('lawineEnd', {}); return; }
  if (a.d >= a.pd - 12) { G.aval = null; setFlag('lawineDone'); setFlag('lawineEnd'); freezeActive(); emit('buried', {}); }
}

/* ---- ranks and results (§7.25) ---- */
S7.rank = (target, s) => {
  const crit = s.kills ? s.crits / s.kills * 100 : 0, par = target === 0 ? 12 * 60 : 40 * 60;
  if (crit >= 60 && s.frozen === 0 && s.time <= par) return 'DOUBLE BLACK';
  if (crit >= 40 && s.frozen <= 1) return 'BLACK DIAMOND';
  if (crit >= 20) return 'BLUE SQUARE';
  return 'GREEN CIRCLE';
};
BG.results = target => {
  const s = Object.assign({}, G.stats), rank = S7.rank(target, s);
  G.results['t0' + target] = { stats: s, rank };
  G.resultsShow = { target, stats: s, rank, note: target === 0 ? 'Your guest has checked out. Housekeeping has been notified.' : 'The glacier did not weep. The Department is grateful, in its way.' };
  G.mode = 'results'; emit('result', { target, stats: s, rank });
  return () => G.mode !== 'results';
};
S7.closeResults = () => { if (G.mode === 'results') { G.mode = 'play'; G.resultsShow = null; } };
S7.newStatsFn = newStats;
