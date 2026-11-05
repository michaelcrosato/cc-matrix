/* Skiller7: the test and tool handle, game.debug. The tests and the dev tools read the state and drive the game
 * through these functions; the player never needs them. */
S7.debugHandle = () => ({
  snapshot() {
    const run = S7.run, R = S7.room7, sc = S7.game.sceneName;
    const r = run || null, sim = r ? r.sim : null;
    const hero = sim ? sim.me : null;
    return {
      scene: sc,
      version: S7.VERSION,
      area: r ? r.areaId : (R ? 'room7' : null),
      leg: sim ? sim.legId : null,
      s: sim ? +sim.s.toFixed(2) : null,
      dir: sim ? sim.dir : null,
      mode: sim ? sim.mode : null,
      persona: hero ? hero.id : null,
      hp: hero ? hero.hp : null,
      frozen: hero ? hero.frozen : null,
      heroes: sim ? sim.heroes.map(h => ({ id: h.id, hp: h.hp, frozen: h.frozen, mag: h.mag })) : [],
      red: S7.prog ? S7.prog.red : null,
      rime: S7.prog ? S7.prog.rime : null,
      enemies: sim ? { alive: sim.enemies.filter(e => e.alive).length, revealed: sim.enemies.filter(e => e.alive && e.revealT > 0).length, total: sim.stats.kills } : null,
      boss: sim && sim.boss ? { id: sim.boss.id, hp: +sim.boss.hp.toFixed(2), alive: sim.boss.alive, phase: sim.boss.phase } : null,
      cut: r ? !!r.cut : null,
      dialog: r ? !!r.talk.open : null,
      aim: sim ? { yaw: +sim.aimYaw.toFixed(3), pitch: +sim.aimPitch.toFixed(3) } : null,
      junction: sim && sim.junction ? sim.junction.options.slice() : null,
      complete: sim ? sim.complete : null,
      over: sim ? sim.over : null,
      time: sim ? +sim.t.toFixed(2) : null,
      stats: sim ? Object.assign({}, sim.stats) : null,
      unlocked: S7.prog ? Object.keys(S7.prog.unlocked).filter(k => S7.prog.unlocked[k]) : [],
      bossDown: S7.prog ? Object.keys(S7.prog.bossDown) : [],
      cheats: Object.assign({}, S7.cheats),
      live: Object.assign({}, S7.live),
      hash: sim ? S7.hashSim(sim) : null
    };
  },
  hash() { return S7.run ? S7.hashSim(S7.run.sim) : null; },
  go(scene, data) { S7.game.go(scene, data || {}, { fade: 0 }); },
  play(areaId, bot) { S7.game.go('play', { area: areaId, bot: !!bot }, { fade: 0 }); },
  tune(key, v) { if (!(key in S7.TUNING)) throw new Error('no tuning ' + key); S7.live[key] = v; },
  cheat(name, on) { S7.cheats[name] = !!on; },
  give(what, n) { if (what === 'rime') S7.prog.rime += n; if (what === 'red') S7.prog.red += n; if (what === 'coats') for (const id of S7.ROSTER) S7.prog.unlocked[id] = true; },
  killAll() { if (S7.run) for (const e of S7.run.sim.enemies) if (e.alive) S7.run.sim.killEnemy(e, false); },
  revealAll() { if (S7.run) for (const e of S7.run.sim.enemies) e.revealT = 99; },
  freezeMe() { if (S7.run) { const h = S7.run.sim.me; h.hp = 0; h.frozen = true; } },
  freezeAll() { if (S7.run) for (const h of S7.run.sim.heroes) { h.hp = 0; h.frozen = true; } },
  finishRun() { if (S7.run) { const sim = S7.run.sim; sim.s = sim.leg.len; sim.arriveEnd(); } },
  wave(name) { if (S7.run) S7.run.sim.spawnWave(name); },
  bot(on) { if (S7.run) S7.run.bot = !!on; },
  save(slot) { return S7.game.saves.save(slot === undefined ? 0 : slot); },
  load(slot) { return S7.game.saves.load(slot === undefined ? 0 : slot); },
  sceneName() { return S7.game.sceneName; }
});

/* a stable number for the sim's state: the same inputs always give the same hash */
S7.hashSim = (sim) => {
  const h = [sim.t, sim.s, sim.speed, sim.dir, sim.cur, sim.stats.kills, sim.stats.shots, sim.stats.hits, sim.stats.deaths,
    sim.heroes.reduce((a, x) => a + x.hp * 7 + x.mag, 0), sim.enemies.length, sim.enemies.reduce((a, e) => a + e.s + e.hp, 0)];
  let x = 0x811c9dc5;
  for (const n of h) { const v = Math.round(n * 1000) | 0; x ^= v; x = Math.imul(x, 0x01000193) >>> 0; }
  return x.toString(16).padStart(8, '0');
};
