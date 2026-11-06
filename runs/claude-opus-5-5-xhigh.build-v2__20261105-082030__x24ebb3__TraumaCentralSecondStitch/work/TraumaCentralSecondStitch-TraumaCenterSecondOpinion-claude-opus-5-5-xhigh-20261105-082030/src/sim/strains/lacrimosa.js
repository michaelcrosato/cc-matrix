// LACRIMOSA, "the Weeper". Eyes that open in turns and weep; Laser closes them; the last one sobs.
const DEFAULT_EYES = [[-3.6, -2], [3.4, -2.2], [-1.2, -0.4], [1.8, 0.6], [-3.2, 1.2]];

export const lacrimosa = {
  init(sim, e, api) {
    const hp = Math.max(1, Math.round((e.eyeHp ?? 3) * sim.cfg.strainHpMul));
    e.eyes = (e.positions ?? DEFAULT_EYES).slice(0, e.count ?? 5).map((at, i) => {
      const id = `${e.id}-eye${i}`;
      api.spawn({ k: 'eye', id, owner: e.id, at, r: 0.55, hp, hpMax: hp, open: false, locked: true, burn: 1.2 / 0.7, openT: 0, weep: 0.5, table: e.table, task: true });
      return id;
    });
    e.nextOpen = 0.5;
    e.phase = 'weep';
    e.t = 0;
    e.hpMax = hp * e.eyes.length;
    e.maxOpen = e.maxOpen ?? 2;
    e.sobN = 0;
    e.sobs = e.sobs ?? 3;
    e.task = false;
    e.weepEvery = e.weepEvery ?? 1.2;
    e.x = 0;
    e.z = -0.6;
  },
  update(sim, e, dt, api) {
    e.t += dt;
    const eyes = e.eyes.map((id) => api.get(id)).filter(Boolean);
    const totalHp = eyes.reduce((a, o) => a + o.hp, 0);
    const half = totalHp <= e.hpMax / 2;
    if (half && !e.crawl) {
      e.crawl = true;
      api.emit('weeperCrawl', {});
      if (e.halfLine) api.say(e.halfLine);
    }
    if (e.phase === 'weep') {
      if (eyes.length <= 1 && !e.noSob) { startSob(sim, e, eyes, api); return; }
      if (eyes.length === 0) { kill(sim, e, api); return; }
      const open = eyes.filter((o) => o.open);
      e.nextOpen -= dt;
      if (e.nextOpen <= 0 && open.length < e.maxOpen) {
        const closed = eyes.filter((o) => !o.open);
        if (closed.length) {
          const pick = closed[Math.floor(api.random() * closed.length)];
          pick.open = true;
          pick.locked = false;
          pick.openT = 0;
          pick.heat = 0;
          api.emit('eyeOpen', { x: pick.x, z: pick.z });
        }
        e.nextOpen = 2.4;
      }
      for (const o of open) {
        o.openT += dt;
        o.weep -= dt;
        if (o.weep <= 0) {
          o.weep = e.weepEvery / sim.coop;
          weep(sim, o, e.crawl, api);
        }
        if (o.openT >= 8) {
          o.hp = Math.min(o.hpMax, o.hp + 1);
          o.open = false;
          o.locked = true;
          api.emit('eyeHeals', { x: o.x, z: o.z });
        }
        if (e.crawl) crawl(o, dt, api, sim);
      }
    } else if (e.phase === 'sob') {
      e.sobT -= dt;
      const mask = api.get(e.sobMask);
      if (!mask) {
        nextSob(sim, e, eyes, api);
      } else if (e.sobT <= 0) {
        const pct = mask.painted;
        api.remove(mask);
        if (pct < 0.8) {
          api.hurt(25, e.table);
          api.emit('sobWave', {});
        }
        nextSob(sim, e, eyes, api);
      }
    } else if (e.phase === 'stalk') {
      if (!api.get(`${e.id}-stalk`)) e.phase = 'dead';
    } else if (e.phase === 'dead') {
      kill(sim, e, api);
    }
  },
  on(sim, e, what, ent, seat, api) {
    if (ent.k === 'eye' && what === 'burned') {
      ent.hp--;
      ent.open = false;
      ent.locked = true;
      ent.heat = 0;
      api.emit('strainHit', { name: 'lacrimosa', x: ent.x, z: ent.z, hp: ent.hp });
      if (ent.hp <= 0) {
        api.emit('eyeDead', { x: ent.x, z: ent.z });
        api.addMark(ent.table, { t: 'burnt', x: ent.x, z: ent.z });
        ent.task = false;
        api.remove(ent);
      }
      e.nextOpen = Math.min(e.nextOpen, 1.0);
    } else if (ent.role === 'stalk' && what === 'snap') {
      api.spawn({ k: 'stalk', id: `${e.id}-stalk`, role: 'stalk', owner: e.id, at: ent.home, path: ent.path, tether: true, autoDone: true, table: e.table, grabR: 0.2, fight: 0.55 });
      ent.dead = true;
    } else if (ent.role === 'stalk' && what === 'done') {
      for (const id of e.eyes) { const o = api.get(id); if (o) { o.task = false; api.remove(o); } }
      e.phase = 'dead';
    } else if (ent.role === 'sobmask' && what === 'done') {
      api.emit('sobHeld', {});
    }
  },
};

function weep(sim, o, chase, api) {
  const sp = 1.5 * sim.cfg.strainSpeedMul;
  sim.drops.push({ x: o.x + api.range(-0.2, 0.2), z: o.z + 0.3, vx: api.range(-0.25, 0.25), vz: sp, age: 0, life: api.range(2.8, 4.2), table: o.table, chase: !!chase });
  api.emit('weep', { x: o.x, z: o.z });
}
function crawl(o, dt, api, sim) {
  if (o.wx == null || Math.hypot(o.wx - o.x, o.wz - o.z) < 0.15) {
    o.wx = api.range(-4.6, 4.6);
    o.wz = api.range(-2.8, 1.6);
  }
  const dx = o.wx - o.x, dz = o.wz - o.z, l = Math.hypot(dx, dz) || 1;
  o.x += (dx / l) * 0.8 * sim.cfg.strainSpeedMul * dt;
  o.z += (dz / l) * 0.8 * sim.cfg.strainSpeedMul * dt;
}
function startSob(sim, e, eyes, api) {
  e.phase = 'sob';
  e.sobN = 0;
  for (const o of eyes) { o.open = true; o.locked = true; o.heat = 0; o.task = false; }
  if (e.sobLine) api.say(e.sobLine);
  spawnSob(sim, e, api);
}
function spawnSob(sim, e, api) {
  e.sobN++;
  e.sobT = 6;
  const z = api.range(-2.2, 1.4), tilt = api.range(-0.7, 0.7);
  const id = `${e.id}-sob${e.sobN}`;
  api.spawn({ k: 'mask', id, role: 'sobmask', owner: e.id, sob: true, path: [[-4.6, z - tilt], [4.6, z + tilt]], need: 0.8, table: e.table, task: true });
  e.sobMask = id;
  api.emit('sob', { n: e.sobN });
}
function nextSob(sim, e, eyes, api) {
  if (e.sobN >= e.sobs) {
    e.phase = 'stalk';
    const o = eyes[0];
    const at = o ? [o.x, o.z] : [0, -0.6];
    api.spawn({ k: 'stalk', id: `${e.id}-stalk`, role: 'stalk', owner: e.id, at, dir: at[1] > 0 ? -90 : 90, pull: 2.4, tether: true, autoDone: true, table: e.table, grabR: 0.2, fight: 0.55 });
    api.emit('stalkOut', { x: at[0], z: at[1] });
    return;
  }
  spawnSob(sim, e, api);
}
function kill(sim, e, api) {
  api.remove(e);
  api.emit('strainDead', { name: 'lacrimosa', x: e.x, z: e.z });
  if (e.deadFlag) sim.flags[e.deadFlag] = true;
  if (e.onDead) api.run(e.onDead);
}
