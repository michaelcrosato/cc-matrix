import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  logs = [];
const ctx = vm.createContext({
  console: {
    log: (...a) => logs.push(a.join(" ")),
    warn: (...a) => logs.push(a.join(" ")),
    error: (...a) => logs.push(a.join(" ")),
  },
});
for (const file of [
  "vendor/engine-repo/dist/handoff/my-3d2dge.js",
  "src/config.js",
  "src/content.js",
  "src/sim.js",
  "src/presentation.js",
  "src/audio.js",
])
  vm.runInContext(fs.readFileSync(path.join(dir, file), "utf8"), ctx, { filename: file });
const E = ctx.My3D2dge,
  F = ctx.FWR,
  game = new E.Game({ headless: true, draw: true, res: [600, 338], view: "overhead", menu: false }),
  p = new F.Presentation(E, game),
  a = new F.Audio(E, game),
  world = new F.World(1982);
let count = 0;
game.start({
  update() {},
  draw(r) {
    p.draw(r, world);
  },
});
for (let sector = 0; sector <= 4; sector++) {
  world.enter(sector);
  world.entities = [];
  for (const [type, x, y] of [
    ["crystal", 480, 250],
    ["layer", 790, 180],
    ["interceptor", 960, 500],
    ["guard", 850, 360],
    ["mine", 600, 400],
    ["mine", 680, 320],
    ["beacon", 1140, 338],
  ])
    world.spawn({ type, x, y, state: type === "mine" ? "active" : "active" });
  if (sector === 3) {
    world.camera.x = 5500;
    world.ship.x = 5210;
    world.spawn({ type: "carrier", x: 5560, y: 337.5, w: 260, h: 310 });
    world.spawn({ type: "organ", x: 5388, y: 160 });
    world.spawn({ type: "core", x: 5390, y: 337.5 });
  }
  world.emit("rescue", world.ship.x + 90, 230);
  world.emit("collapse", world.ship.x + 100, 400);
  world.emit("warp", world.ship.x, world.ship.y, { dx: 1, dy: 0 });
  for (const phase of ["rescue", "organs", "prisoners", "core", "extract"]) {
    world.phase = phase;
    world.time += 1;
    game.advance(0.025, { draw: true });
    count++;
  }
}
world.ship.vy = 200;
world.time += 0.1;
game.advance(0.025, { draw: true });
if (!(Math.abs(p.bank) > 0))
  throw Error("State-driven bank did not advance when render dt was omitted");
count++;
world.events = [];
for (let i = 0; i < 30; i++) {
  world.time += 0.1;
  game.advance(0.025, { draw: true });
}
if (p.effects.length)
  throw Error("Presentation events did not expire on the authoritative world clock");
count++;
p.recoil = 0;
world.emit("enemyFire");
world.time += 0.1;
game.advance(0.025, { draw: true });
if (p.recoil !== 0) throw Error("Hostile fire incorrectly recoiled the player cannon");
count++;
const audioEvents = [],
  audio = new F.Audio(E, game);
audio.unlocked = true;
audio._theme = () => {};
audio.voice = () => {};
audio.effect = (name) => audioEvents.push(name);
audio.update(
  {
    runId: "audio-fixture",
    time: 1,
    sector: 0,
    events: [
      { id: 1, type: "warpDenied" },
      { id: 2, type: "enemyFire" },
      { id: 3, type: "hit" },
    ],
  },
  1 / 120,
);
for (const [i, want] of ["denied", "enemy", "impact"].entries()) {
  if (audioEvents[i] !== want)
    throw Error("Wrong audio event mapping: " + audioEvents[i] + " wanted " + want);
  count++;
}
if (a.native.musicVolume !== 0.1) throw Error("Music default was not 10 percent");
count++;
if (game.errors.length || logs.some((s) => /unknown|non-number|zero radius/.test(s))) {
  for (const e of game.errors) console.error(e.message, e.stack);
  for (const l of logs) console.error(l);
  process.exitCode = 1;
}
console.log(`${count} presentation checks; ${game.errors.length} failures`);
game.dispose();
