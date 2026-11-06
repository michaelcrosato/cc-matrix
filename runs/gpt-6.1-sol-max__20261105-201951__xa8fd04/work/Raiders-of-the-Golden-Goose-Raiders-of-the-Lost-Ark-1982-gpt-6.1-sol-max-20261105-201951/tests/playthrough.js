() => {
  const api = window.__GG,
    log = [];
  let total = 0;
  const state = () => api.snapshot();
  const require = (condition, message) => {
    if (!condition)
      throw new Error(
        message +
          " | " +
          JSON.stringify({
            status: state().status,
            phase: state().phase,
            p: state().players[0],
            stage: log.at(-1),
          }),
      );
  };
  function step(input = {}, n = 1) {
    api.advance(n, { 0: input });
    total += n;
    require(state().status !== "failed", "Explorer fell during scripted play");
  }
  function combatInput(p, s) {
    const candidates = s.enemies
      .filter((e) => !e.dead && e.z < -58 === p.z < -58 && Math.hypot(e.x - p.x, e.z - p.z) < 13)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const e = candidates[0];
    if (!e) return { whip: true };
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    return {
      ax: (e.x - p.x) / d,
      az: (e.z - p.z) / d,
      mouseAim: true,
      whip: true,
      shoot: e.kind !== "snake" && d < 9 && d > 2.5 && p.ammo > 0,
    };
  }
  function go(x, z, maxFrames = 1600) {
    let oldD = 999,
      stuck = 0;
    for (let k = 0; k < maxFrames; k++) {
      const s = state(),
        p = s.players[0],
        dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (s.status === "won" && z >= 19) {
        log.push({ exit: true, time: s.elapsed });
        return;
      }
      if (d < 0.55) {
        log.push({ where: [x, z], p: [p.x, p.z], hp: p.hp, time: s.elapsed });
        return;
      }
      let input = { mx: dx / d, mz: dz / d, sprint: true, ...combatInput(p, s) };
      if (p.x > 16 && p.z > -50.65 && p.z < -49 && p.grounded) input.jump = true;
      const trapZ = p.x > 16 ? [-64, -55, -25, -4] : [-6, -31, -51];
      if (trapZ.some((t) => Math.abs(t - p.z) < 1.9) && p.grounded && k % 20 === 0) input.jump = true;
      if (d > oldD - 0.006) stuck++;
      else stuck = 0;
      if (stuck > 45) {
        input.jump = true;
        input.roll = true;
      }
      oldD = d;
      step(input);
    }
    throw new Error("Could not reach " + [x, z] + " | " + JSON.stringify(state().players[0]));
  }
  function clearArea() {
    for (let k = 0; k < 1500; k++) {
      const s = state(),
        p = s.players[0],
        enemies = s.enemies.filter((e) => !e.dead && e.z < -58 === p.z < -58 && Math.abs(e.z - p.z) < 17);
      if (!enemies.length) return;
      enemies.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
      const e = enemies[0],
        d = Math.hypot(e.x - p.x, e.z - p.z);
      step({
        mx: d > 2.3 ? (e.x - p.x) / d : 0,
        mz: d > 2.3 ? (e.z - p.z) / d : 0,
        sprint: true,
        ...combatInput(p, s),
        roll: false,
        jump: k % 80 === 0 && p.grounded,
      });
    }
    throw new Error("Combat stalled");
  }
  api.start(false);
  step({}, 20);
  go(4, 0);
  go(-7, -10);
  require(state().treasures === 1, "First curio was not collected");
  go(0, -13.8);
  step({ interact: true });
  require(state().players[0].grapple, "Grapple did not engage");
  step({}, 80);
  require(state().phase === "puzzle", "River crossing did not advance chapter");
  go(0, -29);
  clearArea();
  go(-6, -33.7);
  step({ interact: true });
  step({}, 30);
  require(state().mirrors[0].rotation === 1, "Lens I failed");
  go(0, -33);
  go(6, -33.7);
  step({ interact: true });
  step({}, 24);
  step({ interact: true });
  step({}, 24);
  require(state().mirrors[1].rotation === 0, "Lens II failed");
  go(3, -40);
  go(6, -46.7);
  step({ interact: true });
  step({}, 24);
  step({ interact: true });
  step({}, 24);
  require(state().gateOpen, "Vault door stayed shut");
  go(0, -46);
  go(-7, -48);
  require(state().treasures === 2, "Second curio was not collected");
  go(-4, -52);
  go(0, -54);
  go(0, -61);
  clearArea();
  require(state().enemies.find((e) => e.kind === "boss").dead, "Captain Brass survived");
  go(7, -79);
  require(state().treasures === 3, "Third curio was not collected");
  go(0, -74.1);
  step({ interact: true });
  require(state().phase === "balance", "Idol exchange did not start");
  for (let k = 0; k < 1800 && state().phase === "balance"; k++) {
    step({ interact: Math.abs(state().balanceNeedle - 0.5) < 0.065 });
  }
  require(state().hasRelic, "No goose after the exchange");
  require(state().cleanSwap, "The precise exchange failed");
  go(7, -74.3);
  go(21, -74.3);
  go(21, -50.7);
  go(21, 20, 2400);
  require(state().status === "won", "Launch did not complete the expedition");
  require(state().score > 3000, "Score did not include expedition rewards");
  return { steps: total, simulatedSeconds: total / 60, milestones: log, final: state() };
};
