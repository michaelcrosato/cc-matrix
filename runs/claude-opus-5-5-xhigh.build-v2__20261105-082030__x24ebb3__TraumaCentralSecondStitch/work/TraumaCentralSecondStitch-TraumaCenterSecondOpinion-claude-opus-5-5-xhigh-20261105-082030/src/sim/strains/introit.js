// INTROIT, "the Knock". A core moving under the tissue. Every few seconds it stops and knocks:
// lance the pore, grab the core, pull it against its tether. Three times.
const LOOP = [[-3.6, -1.6], [-0.8, -2.6], [2.8, -2], [3.8, 0], [1.6, 1.6], [-1.6, 1.8], [-4, 0.4]];

export const introit = {
  init(sim, e) {
    e.hp = e.hp0 = Math.max(1, Math.round((e.hp ?? 3) * sim.cfg.strainHpMul));
    e.phase = 'roam';
    e.t = 0;
    e.speed = (e.speed ?? 1.6) * sim.cfg.strainSpeedMul;
    e.way = e.way ?? LOOP;
    e.wi = 0;
    e.knocks = 0;
    e.knockEvery = e.knockEvery ?? 6;
    e.task = e.task ?? true;
    e.x = e.way[0][0];
    e.z = e.way[0][1];
  },
  update(sim, e, dt, api) {
    if (e.hidden) return;
    e.t += dt;
    switch (e.phase) {
      case 'roam':
      case 'flee': {
        const w = e.way[e.wi % e.way.length];
        const dx = w[0] - e.x, dz = w[1] - e.z, l = Math.hypot(dx, dz);
        const sp = e.speed * (e.phase === 'flee' ? 2.2 : 1) * dt;
        if (l <= sp) e.wi++;
        else { e.x += (dx / l) * sp; e.z += (dz / l) * sp; }
        if (e.phase === 'flee' && e.t > 1.6) { e.phase = 'roam'; e.t = 0; }
        if (e.phase === 'roam' && e.t >= e.knockEvery) {
          e.phase = 'pore';
          e.t = 0;
          e.knocks++;
          const ang = Math.round(api.range(-40, 40));
          const c = Math.cos((ang * Math.PI) / 180) * 0.55, s = Math.sin((ang * Math.PI) / 180) * 0.55;
          api.spawn({ k: 'incision', id: `${e.id}-pore${e.knocks}`, role: 'pore', owner: e.id, at: [e.x - c, e.z - s], ang, len: 1.1, short: true, table: e.table, task: true });
          api.emit('knock', { x: e.x, z: e.z, table: e.table });
          if (e.knocks === 1 && e.firstKnockLine) api.say(e.firstKnockLine);
        }
        break;
      }
      case 'pore':
        if (e.t >= (e.poreTime ?? 3)) {
          const pore = api.get(`${e.id}-pore${e.knocks}`);
          if (pore) api.remove(pore);
          // A missed knock tears on its way back down.
          api.spawn({ k: 'laceration', at: [e.x - 0.8, e.z + 0.3], ang: Math.round(api.range(-25, 25)), len: 1.7, table: e.table });
          api.spawn({ k: 'pool', at: [e.x, e.z + 0.2], r: 0.7, task: false, table: e.table });
          api.emit('missedKnock', { x: e.x, z: e.z });
          e.phase = 'roam';
          e.t = 0;
        }
        break;
      case 'exposed': {
        const core = api.get(`${e.id}-core`);
        if (!core) { e.phase = 'roam'; e.t = 0; break; }
        if ((core.holders ?? 0) > 0) { e.t = Math.max(0, e.t - dt); break; }
        if (e.t >= (e.exposedTime ?? 3.5)) {
          api.remove(core);
          api.emit('coreSinks', { x: e.x, z: e.z });
          e.phase = 'roam';
          e.t = 0;
        }
        break;
      }
      case 'dead':
        if (e.t > 1.4) {
          api.remove(e);
          api.emit('strainDead', { name: 'introit', x: e.x, z: e.z });
          if (e.deadFlag) sim.flags[e.deadFlag] = true;
          if (e.onDead) api.run(e.onDead);
        }
        break;
      default: break;
    }
  },
  on(sim, e, what, ent, seat, api) {
    if (ent.role === 'pore' && what === 'done') {
      e.phase = 'exposed';
      e.t = 0;
      const dir = e.z > 0 ? -90 : 90;
      api.spawn({ k: 'core', id: `${e.id}-core`, role: 'core', owner: e.id, at: [e.x, e.z], dir, pull: 2.5, tether: true, autoDone: true, table: e.table, tearMul: 1.6, grabR: 0.2, fight: 0.5 });
      api.emit('coreOut', { x: e.x, z: e.z });
    } else if (ent.role === 'core' && what === 'done') {
      e.hp--;
      e.speed *= 1.25;
      api.emit('strainHit', { name: 'introit', hp: e.hp, x: ent.x, z: ent.z });
      api.spawn({ k: 'laceration', at: [ent.x - 1.1, ent.z - 0.6], ang: Math.round(api.range(-20, 20)), len: 1.7, table: e.table });
      if (e.hp <= 0) { e.phase = 'dead'; e.t = 0; api.emit('strainDying', { name: 'introit', x: e.x, z: e.z }); }
      else {
        api.spawn({ k: 'laceration', at: [ent.x - 0.7, ent.z + 0.8], ang: Math.round(api.range(-20, 20)), len: 1.7, table: e.table });
        e.phase = 'flee';
        e.t = 0;
      }
    } else if (ent.role === 'core' && what === 'snap') {
      api.remove(ent);
      api.spawn({ k: 'laceration', at: [ent.x - 0.8, ent.z], ang: Math.round(api.range(-25, 25)), len: 1.7, table: e.table });
      api.emit('coreSnap', { x: ent.x, z: ent.z });
      e.phase = 'roam';
      e.t = 0;
    }
  },
};
