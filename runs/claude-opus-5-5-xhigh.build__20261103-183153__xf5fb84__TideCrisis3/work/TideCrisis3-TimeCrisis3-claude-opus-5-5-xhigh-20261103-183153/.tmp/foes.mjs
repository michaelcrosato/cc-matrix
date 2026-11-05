import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, setTimeout, clearTimeout, TC_NO_BOOT: true }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const TC = ctx.TC, V3 = TC.V3, D = Math.PI / 180;
const sim = new TC.Sim({ mode: 'stage', stage: 2, scene: '2-4', seed: 5, skipIntro: true });
const land = +(process.argv[2] || 300);
const eyes = [[land, 77], [land, 85]].map(([s, r]) => { const p = TC.stairAt(s * D, r); return [p[0], p[1], p[2] + 24]; });
for (let sf = land + 200; sf <= 695; sf += 10) {
  const f = TC.stairAt(sf * D), head = [f[0], f[1], f[2] + 27], body = [f[0], f[1], f[2] + 15];
  const r = eyes.map(o => { const d = V3.sub(head, o), L = V3.len(d), w = sim.rayWorld({ o, d: V3.mul(d, 1 / L) }, L, false), pitch = Math.atan2(head[2] - o[2], Math.hypot(head[0] - o[0], head[1] - o[1])) / D, yaw = Math.atan2(head[1] - o[1], head[0] - o[0]) / D; return pitch.toFixed(0) + '/' + yaw.toFixed(0) + (w && w.t < L - 4 ? 'X' : ''); });
  console.log(sf, r.join('  '));
}
