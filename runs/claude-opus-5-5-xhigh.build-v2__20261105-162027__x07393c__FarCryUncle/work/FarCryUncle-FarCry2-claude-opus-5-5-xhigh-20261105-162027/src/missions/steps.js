// Step types. A step shows its text at the top for 5 s when it starts, and always in the map margin. Bots drive these same steps.
import { SITES, POSTS } from '../content/sites.js';
const siteAt = (s) => (s.site ? SITES[s.site].at : s.at);
const dist = (g, a) => { const f = g.hasPlayer ? g.player.feet : { x: 0, z: 0 }; return Math.hypot(f.x - a[0], f.z - a[1]); };
const seatDist = (g, a) => { const v = g.driving.vehicle; const f = v ?? g.player.feet; return Math.hypot(f.x - a[0], f.z - a[1]); };
export const STEPS = {
  goto: {
    enter(r, s, g) { const a = siteAt(s); g.map.setWaypoint(a[0], a[1]); if (s.site) g.map.see(s.site); },
    tick(r, s, g) { return seatDist(g, siteAt(s)) <= s.r; },
  },
  leave: {
    enter(r, s, g) {},
    tick(r, s, g) { return seatDist(g, siteAt(s)) >= s.r; },
  },
  talk: {
    enter(r, s, g) { const n = g.npcs.byWho[s.who]; if (n) g.map.setWaypoint(n.x, n.z); s._state = 'wait'; g.player.frozen = false; g.dialogue.play(s.lines, { onEnd: () => { s._state = 'done'; } }); g.faceNpc(n); },
    tick(r, s, g) { return s._state === 'done'; },
    exit(r, s, g) { g.faceNpc(null); },
  },
  report: {
    enter(r, s, g) {
      const n = g.npcs.byWho[s.to];
      s._state = 'go';
      if (n) {
        g.map.setWaypoint(n.x, n.z);
        s._u = g.interact.add({ tag: 'mission', x: n.x, y: n.y + 1.5, z: n.z, r: 3.4, wide: true, verb: () => `REPORT TO ${s.to.toUpperCase()}`, onUse: () => {
          g.interact.remove(s._u); s._u = null; s._state = 'talking'; g.faceNpc(n);
          if (s.lines) g.dialogue.play(s.lines, { onEnd: () => { s._state = 'done'; } });
          else s._state = 'done';
        } });
      } else s._state = 'done';
    },
    tick(r, s, g) { return s._state === 'done'; },
    exit(r, s, g) { if (s._u) g.interact.remove(s._u); g.faceNpc(null); },
  },
  use: {
    enter(r, s, g) {
      const a = siteAt(s), x = a[0] + (s.dx ?? 0), z = a[1] + (s.dz ?? 0);
      g.map.setWaypoint(x, z);
      s._done = false;
      s._u = g.interact.add({ tag: 'mission', id: s.id, x, y: g.world.heightAt(x, z) + (s.y ?? 1), z, r: s.reach ?? 2.8, wide: true, hold: s.hold, verb: () => s.verb, onStart: () => { g.vm.showProp(); g.vm.play('Open', { keep: true }); }, onCancel: () => { g.vm.endAction(); g.vm.showGun(g.weapons.gun?.id ?? 'cane', false); }, onUse: () => { if (s.hold) { g.vm.endAction(); g.vm.showGun(g.weapons.gun?.id ?? 'cane', false); } s._done = true; g.events.emit('step-used', s.id); } });
    },
    tick(r, s) { return s._done; },
    exit(r, s, g) { if (s._u) g.interact.remove(s._u); },
  },
  deliver: { enter(r, s, g) { STEPS.goto.enter(r, s, g); }, tick(r, s, g) { return dist(g, siteAt(s)) <= s.r; } },
  enter: {
    enter(r, s, g) { const v = r.tags[s.tag]; if (v) g.map.setWaypoint(v.x, v.z); },
    tick(r, s, g) { return g.driving.vehicle && g.driving.vehicle === r.tags[s.tag]; },
  },
  /** Take a vehicle that isn't yours. The story cares that you are driving it. */
  steal: {
    enter(r, s, g) { const v = r.tags[s.tag]; if (v) g.map.setWaypoint(v.x, v.z); },
    tick(r, s, g) { const v = r.tags[s.tag]; return !v || !v.alive || g.driving.vehicle === v; },
  },
  /** Someone walks to a place, and only while you stay with them. */
  escort: {
    enter(r, s, g) {
      const b = g.actors.buddy(s.who), f = g.player.feet;
      if (!b.active) b.spawn(g.ctx, f.x + 3, f.z + 3, { hp: 200, following: false });
      b.following = false;
      g.map.setWaypoint(s.to[0], s.to[1]);
      s._b = b;
    },
    tick(r, s, g) {
      const b = s._b, f = g.player.feet;
      if (b.dead) return true;
      const near = Math.hypot(b.x - f.x, b.z - f.z) < (s.leash ?? 70);
      b.goal = near && !b.isDown ? { x: s.to[0], z: s.to[1] } : null;
      return Math.hypot(b.x - s.to[0], b.z - s.to[1]) < (s.r ?? 6);
    },
    exit(r, s) { if (s._b) { s._b.goal = null; s._b.following = true; } },
  },
  /** On Old Bakr's train to where it is going, and off at the end. */
  ride: {
    enter(r, s, g) {
      const tr = g.train;
      if (s.from) tr.place(tr.sAt(s.from[0], s.from[1]));
      g.player.seatOnTrain(s.car ?? 1, s.offset ?? [1, 2.2, 1.4]);
      tr.run(tr.sAt(s.to[0], s.to[1]), s.speed ?? 11);
      tr.whistle();
      g.map.setWaypoint(s.to[0], s.to[1]);
    },
    tick(r, s, g) { return !g.train.moving; },
    exit(r, s, g) { g.player.leaveTrain(g.train.cars[s.car ?? 1].x + 4, g.train.cars[s.car ?? 1].z + 4); },
  },
  destroy: {
    enter(r, s, g) { s._n = 0; for (const ex of g.world.explosives) if (ex.tag === s.tag && !ex.alive) s._n++; s._off = g.events.on('destroyed', (tag) => { if (tag === s.tag) s._n++; }); const t = g.world.explosives.find((e) => e.tag === s.tag); if (t) g.map.setWaypoint(t.x, t.z); },
    tick(r, s) { return s._n >= s.n; },
    exit(r, s) { s._off?.(); },
  },
  blast: {
    enter(r, s, g) { const a = siteAt(s); s._hit = false; g.map.setWaypoint(a[0], a[1]); s._off = g.events.on('blast', (x, z) => { if (Math.hypot(x - a[0], z - a[1]) < s.r) s._hit = true; }); },
    tick(r, s) { return s._hit; },
    exit(r, s) { s._off?.(); },
  },
  kill: {
    enter(r, s, g) { const sq = g.actors.squads.get(s.squad); if (sq) { sq.forceLive = true; g.map.setWaypoint(sq.def.at[0], sq.def.at[1]); } },
    tick(r, s, g) { const sq = g.actors.squads.get(s.squad); return !sq || sq.alive <= (s.left ?? 0); },
    exit(r, s, g) { const sq = g.actors.squads.get(s.squad); if (sq) sq.forceLive = false; },
  },
  collect: {
    enter(r, s, g) { s._got = false; s._off = g.events.on('collected', (id) => { if (id === s.id) s._got = true; }); },
    tick(r, s) { return s._got; },
    exit(r, s) { s._off?.(); },
  },
  hold: { enter(r, s, g) { s._t = s.seconds; const a = siteAt(s); g.map.setWaypoint(a[0], a[1]); }, tick(r, s, g, dt) { if (seatDist(g, siteAt(s)) <= s.r) s._t -= dt; return s._t <= 0; } },
  timer: { enter(r, s) { s._t = s.seconds; }, tick(r, s, g, dt) { s._t -= dt; return s._t <= 0; } },
  choice: {
    enter(r, s, g) { s._picked = null; g.ui.choice(s.prompt, s.options.map((o) => ({ label: o.label, onSelect: () => { s._picked = o.id; g.story.chose[s.key] = o.id; o.run?.(g); } }))); },
    tick(r, s) { return s._picked != null; },
  },
  script: {
    enter(r, s, g) { s._gen = r.scripts[s.name](g, r, s); s._wait = 0; s._done = false; s._pred = null; },
    tick(r, s, g, dt) {
      if (s._pred) { if (!s._pred()) return false; s._pred = null; }
      if (s._wait > 0) { s._wait -= dt; if (s._wait > 0) return false; }
      const { value, done } = s._gen.next();
      if (done) return true;
      if (typeof value === 'number') s._wait = value;
      else if (typeof value === 'function') s._pred = value;
      return false;
    },
    exit(r, s) { s._gen = null; },
  },
};
export const STEP_NAMES = Object.keys(STEPS);
