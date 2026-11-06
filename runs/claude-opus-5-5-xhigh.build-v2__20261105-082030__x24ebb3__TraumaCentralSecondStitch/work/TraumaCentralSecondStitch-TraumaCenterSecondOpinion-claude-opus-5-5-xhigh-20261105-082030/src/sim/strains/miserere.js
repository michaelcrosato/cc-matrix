// MISERERE. Pale, beautiful, gold-haloed. It copies you: a ghost hand replays your last three seconds
// of tool motion and cuts where you cut, so you must keep moving differently. Burn its halo, then
// two hands on one tether.
const DELAY_SAMPLES = 45; // trails sample at 15 Hz: 3 s

export const miserere = {
  init(sim, e, api) {
    e.x = e.x ?? 0;
    e.z = e.z ?? -0.6;
    e.phase = 'halo';
    e.t = 0;
    e.task = false;
    e.spin = 0;
    e.halos = [];
    e.haloR = e.haloR ?? 2.1;
    const n = e.count ?? 6;
    for (let i = 0; i < n; i++) {
      const id = `${e.id}-halo${i}`;
      api.spawn({ k: 'halo', id, owner: e.id, at: [e.x, e.z], r: 0.42, table: e.table, burn: 1.1 / 0.7, i });
      e.halos.push(id);
    }
    e.cool = 0;
    placeHalo(sim, e, api);
  },
  update(sim, e, dt, api) {
    e.t += dt;
    if (e.phase === 'halo') {
      e.spin += dt * 0.35 * sim.cfg.strainSpeedMul;
      e.x = (e.cx ?? 0) + Math.sin(e.t * 0.3) * 1.1;
      e.z = (e.cz ?? -0.6) + Math.cos(e.t * 0.23) * 0.5;
      placeHalo(sim, e, api);
      // The ghost hand.
      const you = sim.seats.find((s) => !s.bot) ?? sim.seats[0];
      const tr = sim.trails[you.id];
      const g = tr && tr.length > DELAY_SAMPLES ? tr[tr.length - 1 - DELAY_SAMPLES] : null;
      if (g) {
        sim.handGhost = { x: g[0], z: g[1], use: g[2], tool: g[3] };
        e.cool -= dt;
        if (g[2]) {
          // It heals what it reaches, and it cuts you if you stay where you were.
          for (const id of e.halos) {
            const h = api.get(id);
            if (h && h.heat > 0 && Math.hypot(h.x - g[0], h.z - g[1]) < 0.7) { h.heat = 0; api.emit('haloHeals', { x: h.x, z: h.z }); }
          }
          if (e.cool <= 0 && Math.hypot(you.x - g[0], you.z - g[1]) < 0.75) {
            e.cool = 1.2;
            api.spawn({ k: 'nick', at: [you.x, you.z], table: e.table });
            api.hurt(3, e.table);
            api.emit('ghostCut', { x: you.x, z: you.z });
            api.rate(you, 'sloppy', you.x, you.z, 0.5);
          }
        }
      }
      if (e.halos.every((id) => !api.get(id))) {
        e.phase = 'bare';
        e.t = 0;
        sim.handGhost = null;
        api.emit('haloGone', { x: e.x, z: e.z });
        api.spawn({ k: 'core', id: `${e.id}-core`, role: 'core', owner: e.id, at: [e.x, e.z], dir: e.z > 0 ? -90 : 90, pull: 2.6, twoHanded: true, autoDone: true, table: e.table, tearMul: 2.2, grabR: 0.45 });
      }
    } else if (e.phase === 'dead') {
      if (e.t > 1.6) {
        api.remove(e);
        api.emit('strainDead', { name: 'miserere', x: e.x, z: e.z });
        if (e.deadFlag) sim.flags[e.deadFlag] = true;
        if (e.onDead) api.run(e.onDead);
      }
    }
  },
  on(sim, e, what, ent, seat, api) {
    if (ent.k === 'halo' && what === 'done') {
      api.emit('strainHit', { name: 'miserere', x: ent.x, z: ent.z });
    } else if (ent.role === 'core' && what === 'done') {
      e.phase = 'dead';
      e.t = 0;
      api.emit('strainDying', { name: 'miserere', x: e.x, z: e.z });
    }
  },
};

function placeHalo(sim, e, api) {
  e.halos.forEach((id, i) => {
    const h = api.get(id);
    if (!h) return;
    const a = (i / e.halos.length) * Math.PI * 2 + e.spin;
    h.x = e.x + Math.cos(a) * e.haloR;
    h.z = e.z + Math.sin(a) * e.haloR * 0.72;
  });
}
