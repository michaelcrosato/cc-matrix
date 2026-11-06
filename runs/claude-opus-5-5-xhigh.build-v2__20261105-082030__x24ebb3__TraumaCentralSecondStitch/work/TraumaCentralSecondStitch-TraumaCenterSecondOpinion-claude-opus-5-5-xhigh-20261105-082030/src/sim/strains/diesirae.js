// DIES IRAE, "the Wrath". Everything on the beat. Plates are cut in one diastole and lifted in the
// next; each lift speeds the heart. Laser the eye. At 120 BPM it fibrillates. Then it arrests.
export function stepHeart(sim, dt, api) {
  const h = sim.heart;
  if (!h) return;
  h.phase += (dt * h.bpm) / 60;
  if (h.phase >= 1) {
    h.phase -= 1;
    h.beat++;
    api.emit('thump', { bpm: h.bpm });
  }
  h.systole = !h.calm && h.phase < 0.35;
}

export const diesirae = {
  init(sim, e, api) {
    const cx = e.cx ?? 0, cz = e.cz ?? -0.4;
    e.x = cx;
    e.z = cz;
    e.task = false;
    sim.heart = { bpm: sim.cfg.diesIraeBpm + (e.bpmAdd ?? 0), phase: 0.36, beat: 0, systole: false, slipBeat: -1, calm: false, strain: e.id };
    e.rounds = e.rounds ?? [2, 2, 3];
    e.round = 0;
    e.flareT = e.flareEvery ?? 7;
    e.flareEvery = e.flareEvery ?? 7;
    e.fibbed = 0;
    e.plateN = e.rounds.reduce((a, b) => a + b, 0);
    e.ringR = e.ringR ?? 1.9;
    e.plates = [];
    for (let i = 0; i < e.plateN; i++) {
      const a = (i / e.plateN) * Math.PI * 2 - Math.PI / 2;
      const id = `${e.id}-plate${i}`;
      const x = cx + Math.cos(a) * e.ringR, z = cz + Math.sin(a) * e.ringR * 0.86;
      api.spawn({ k: 'plate', id, owner: e.id, at: [x, z], dir: (a * 180) / Math.PI, pull: 1, locked: true, task: false, table: e.table, ang: a, active: false, tearMul: 1.5, grabR: 0.2 });
      e.plates.push(id);
    }
    api.spawn({ k: 'eye', id: `${e.id}-eye`, owner: e.id, at: [cx, cz], r: 0.6, hp: e.rounds.length, hpMax: e.rounds.length, locked: true, open: false, burn: 1.1 / 0.7, task: false, table: e.table, heartEye: true });
    startRound(sim, e, api);
  },
  update(sim, e, dt, api) {
    const h = sim.heart;
    if (e.phase === 'dead') { e.t = (e.t || 0) + dt; if (e.t > 1.4) finish(sim, e, api); return; }
    if (e.phase === 'arrest') return;
    // Flares run along the arteries as pools to drain.
    e.flareT -= dt * sim.coop;
    if (e.flareT <= 0) {
      e.flareT = e.flareEvery;
      const x = (e.cx ?? 0) + api.range(-4.4, 4.4) + (e.xOff ?? 0), z = api.range(-2.8, 1.8);
      api.spawn({ k: 'pool', at: [x, z], r: api.range(0.55, 0.85), task: false, table: e.table, flare: true });
      api.emit('flare', { x, z });
    }
    // Fibrillation.
    if (h.bpm >= 120 && !sim.codeBlue) {
      e.fibbed++;
      api.run({ codeBlue: { fib: true, need: 1, time: 10, restore: 1, then: [{ say: e.fibLine ?? null }] } });
      h.bpm = 96;
      api.emit('bpm', { bpm: h.bpm });
      return;
    }
    // A cut plate reseals if it isn't lifted within a few beats.
    for (const id of e.plates) {
      const p = api.get(id);
      if (p && p.active && !p.locked && h.beat > p.sealAt && !p.holders) {
        p.locked = true;
        p.task = false;
        spawnCut(sim, e, p, api);
        api.emit('plateSeals', { x: p.x, z: p.z });
      }
    }
  },
  on(sim, e, what, ent, seat, api) {
    const h = sim.heart;
    if (ent.role === 'platecut' && what === 'done') {
      const p = api.get(ent.plate);
      if (p) {
        p.locked = false;
        p.task = true;
        p.sealAt = h.beat + 3;
        api.emit('plateCut', { x: p.x, z: p.z });
      }
    } else if (ent.k === 'plate' && what === 'done') {
      h.bpm += 6;
      api.emit('bpm', { bpm: h.bpm });
      api.emit('plateOff', { x: ent.x, z: ent.z });
      const left = e.plates.map((id) => api.get(id)).filter((p) => p && p.active);
      if (left.length === 0) {
        const eye = api.get(`${e.id}-eye`);
        if (eye) { eye.locked = false; eye.open = true; eye.task = true; eye.heat = 0; api.emit('eyeOpen', { x: eye.x, z: eye.z, wrath: true }); }
      }
    } else if (ent.k === 'eye' && what === 'burned') {
      ent.hp--;
      ent.locked = true;
      ent.open = false;
      ent.task = false;
      ent.heat = 0;
      e.round++;
      api.emit('strainHit', { name: 'diesirae', hp: ent.hp, x: ent.x, z: ent.z });
      if (e.round >= e.rounds.length) {
        if (e.noArrest) { ent.task = false; api.remove(ent); finish(sim, e, api); return; }
        e.phase = 'arrest';
        for (const id of e.plates) { const p = api.get(id); if (p) { p.task = false; api.remove(p); } }
        api.remove(ent);
        h.calm = true;
        h.bpm = 0.001;
        api.emit('arrest', {});
        api.say(e.arrestLine ?? null);
        const self = e.id;
        api.run({ massage: { beats: 8, bpm: 66, then: [{ spawn: [{ k: 'incision', id: `${self}-final`, role: 'final', owner: self, at: [(e.cx ?? 0) - 1.2, e.cz ?? -0.4], ang: 0, len: 2.4, table: e.table }] }, { say: e.finalLine ?? null }] } });
      } else startRound(sim, e, api);
    } else if (ent.role === 'final' && what === 'done') {
      h.bpm = sim.cfg.diesIraeBpm;
      h.calm = true;
      e.phase = 'dead';
      e.t = 0;
      api.emit('strainDying', { name: 'diesirae', x: e.x, z: e.z });
    }
  },
};

function startRound(sim, e, api) {
  const n = e.rounds[e.round];
  const idle = e.plates.map((id) => api.get(id)).filter((p) => p && !p.active);
  for (let i = 0; i < n && i < idle.length; i++) {
    const p = idle[Math.floor((i * idle.length) / n)];
    p.active = true;
    spawnCut(sim, e, p, api);
  }
  api.emit('round', { n: e.round + 1, of: e.rounds.length });
}
function spawnCut(sim, e, p, api) {
  // The cut runs along the plate's edge, tangent to the ring.
  const tan = p.ang + Math.PI / 2;
  const c = Math.cos(tan) * 0.45, s = Math.sin(tan) * 0.45;
  api.spawn({ k: 'incision', id: `${p.id}-cut${e.round}-${sim.tick}`, role: 'platecut', plate: p.id, owner: e.id, path: [[p.x - c, p.z - s], [p.x + c, p.z + s]], short: true, table: e.table });
}
function finish(sim, e, api) {
  api.remove(e);
  api.emit('strainDead', { name: 'diesirae', x: e.x, z: e.z });
  if (sim.heart) { sim.heart.calm = true; sim.heart.bpm = sim.cfg.diesIraeBpm; }
  if (e.deadFlag) sim.flags[e.deadFlag] = true;
  if (e.onDead) api.run(e.onDead);
}
