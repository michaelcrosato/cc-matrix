import vm from "node:vm";
import fs from "node:fs";
const files = [
  "vendor/engine/my-3d2dge.js",
  "src/content/sectors.js",
  "src/sim/world.js",
  "src/sim/pilot.js",
  "src/presentation/art.js",
  "src/presentation/audio.js",
  "src/input/controls.js",
  "src/online/session.js",
  "src/dev/tools.js",
  "src/main.js",
];
export function load({ app = false } = {}) {
  const logs = [];
  const ctx = {
    console: {
      log: (...s) => logs.push(s.join(" ")),
      warn: (...s) => logs.push(s.join(" ")),
      error: (...s) => logs.push(s.join(" ")),
    },
    TextEncoder,
  };
  vm.createContext(ctx);
  for (const p of app ? files : files.slice(0, 4))
    vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: p });
  return { G: ctx.Edge, E: ctx.My3D2dge, ctx, app: ctx.__edge, logs };
}
