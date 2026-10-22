// Attract-mode autopilot. It chases the nearest target, rolls out of laser gates and
// incoming shots, fires in pulses (so lock-on releases happen), and bombs crowds.
// It only exists to show the demo, so the stage runs it with cheats on.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createAutopilot() {
  let t = 0;
  const held = new Set();
  const hits = new Set();
  const ctl = {
    move: { x: 0, y: 0 },
    down: (a) => held.has(a),
    hit: (a) => hits.has(a),
  };
  return {
    step(stage, dt) {
      t += dt;
      held.clear();
      hits.clear();
      const p = stage.player;
      const air = p.mode === 'air';
      const y = stage.playerY();
      let best = null;
      let bestScore = Infinity;
      for (const e of stage.targets()) {
        const dz = p.z - e.pos.z;
        if (dz < 12 || dz > 230) continue;
        const score = Math.abs(e.pos.x - p.x) + Math.abs(e.pos.y - y) * 0.6 + dz * 0.05;
        if (score < bestScore) { bestScore = score; best = e; }
      }
      const tx = best ? best.pos.x : Math.sin(t * 0.4) * 18;
      const ty = best ? best.pos.y : 10 + Math.sin(t * 0.7) * 4;
      ctl.move.x = clamp((tx - p.x) * 0.25, -1, 1);
      ctl.move.y = air ? clamp((ty - y) * 0.2, -1, 1) : 0;

      for (const b of stage.eBullets) {
        const dz = p.z - b.pos.z;
        if (air && dz > -2 && dz < 22 && Math.abs(b.pos.x - p.x) < 4.5) {
          hits.add(p.x > b.pos.x ? 'rollL' : 'rollR');
          break;
        }
      }
      for (const g of stage.gates) {
        const dz = p.z - g.z;
        if (air && g.on && dz > -4 && dz < 30) { hits.add('rollL'); break; }
      }
      if (t % 0.9 < 0.5) held.add('fire');
      if (!best) held.add('boost');
      const near = stage.targets().filter((e) => p.z - e.pos.z > 0 && p.z - e.pos.z < 200).length;
      if (p.bombs > 0 && near >= 5 && t % 4 < dt) hits.add('bomb');
      return ctl;
    },
  };
}
