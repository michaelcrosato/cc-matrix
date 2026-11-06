import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const base = new URL("../", import.meta.url);
export function frontendTests() {
  const tests = [];
  const run = (name, fn) => {
    try {
      fn();
      tests.push({ name, pass: true });
    } catch (error) {
      tests.push({ name, pass: false, error: error.stack });
    }
  };
  let pads = [];
  const ctx = { console, navigator: { getGamepads: () => pads } };
  vm.createContext(ctx);
  for (const path of ["vendor/engine-repo/dist/handoff/my-3d2dge.js", "src/input.js", "src/ui.js"])
    vm.runInContext(readFileSync(new URL(path, base), "utf8"), ctx, {
      filename: path,
    });
  const { My3D2dge: E, FWR: F } = ctx;
  const mem = new Map();
  const storage = {
    getItem: (k) => mem.get(k) || null,
    setItem: (k, v) => mem.set(k, v),
  };
  const store = new F.Store(storage);
  run("preferences: initial music is exactly ten percent", () =>
    assert.equal(store.settings.music, 0.1),
  );
  run("preferences: invalid values normalized and settings persisted", () => {
    store.setSettings({
      music: 99,
      effects: -5,
      voice: NaN,
      glyphs: "xbox",
      reducedMotion: true,
    });
    assert.equal(store.settings.music, 1);
    assert.equal(store.settings.effects, 0);
    assert.equal(store.settings.voice, 0.7);
    const next = new F.Store(storage);
    assert.equal(next.settings.glyphs, "xbox");
    assert.equal(next.settings.reducedMotion, true);
  });
  run("storage: denied and malformed storage retain playable defaults", () => {
    const denied = new F.Store({
      getItem() {
        throw Error("denied");
      },
      setItem() {
        throw Error("denied");
      },
    });
    assert.equal(denied.available, false);
    assert.equal(denied.settings.music, 0.1);
    assert.equal(
      denied.saveCheckpoint({
        version: 1,
        seed: 1,
        sector: 0,
        mode: "operation",
      }),
      false,
    );
    const malformed = new F.Store({ getItem: () => "{broken", setItem() {} });
    assert.equal(malformed.settings.music, 0.1);
  });
  run("records: excluded developer/attract writes cannot change best or checkpoint", () => {
    store.record("operation", 100, true);
    store.record("operation", 1000, false);
    assert.equal(store.best("operation"), 100);
    store.saveCheckpoint({
      version: 1,
      seed: 15,
      sector: 1,
      mode: "operation",
    });
    store.saveCheckpoint({ version: 1, seed: 99, sector: 1, mode: "operation" }, false);
    assert.equal(store.getCheckpoint().seed, 15);
    const cp = store.getCheckpoint();
    cp.seed = 999;
    assert.equal(store.getCheckpoint().seed, 15);
  });
  let world = { ship: { x: 100, y: 100, energy: 100 }, entities: [] },
    pause = 0,
    seats = [],
    activity = false;
  const game = new E.Game({
    headless: true,
    input: F.INPUT_MAP,
    menu: false,
    live: true,
  });
  const input = new F.Input(game, {
    getWorld: () => world,
    onPause: () => pause++,
    onActivity: () => activity,
    onSeatsChange: (x) => {
      seats = x;
    },
    settings: () => store.settings,
  });
  let intents;
  game.start({
    scene: "main",
    scenes: {
      main: {
        pausable: false,
        update(dt) {
          intents = input.poll(dt);
        },
      },
    },
  });
  game.advance(0.03);
  run("native semantic movement normalizes diagonals", () => {
    game.input.press("KeyW");
    game.input.press("KeyD");
    game.advance(0.03);
    const i = intents["local-1"];
    assert.ok(Math.abs(Math.hypot(i.mx, i.my) - 1) < 1e-9);
    assert.ok(i.mx > 0 && i.my < 0);
    input.clear();
  });
  run("native action rebinding changes gameplay and prompts", () => {
    assert.equal(game.input.rebind("warp", "keys", "KeyQ"), null);
    game.input.press("KeyQ");
    game.advance(0.03);
    assert.equal(intents["local-1"].burst, true);
    input.family = "keyboard";
    assert.equal(input.label("warp"), "Q");
    input.clear();
  });
  const makePad = (index, axes = [0, 0, 0, 0], buttons = []) => ({
    index,
    connected: true,
    id: `DualSense ${index}`,
    mapping: "standard",
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({
      pressed: buttons.includes(i),
      value: buttons.includes(i) ? 1 : 0,
    })),
  });
  run("standard pad supports complete solo flight/aim/cannon/warp", () => {
    pads = [makePad(0, [0.8, -0.8, 0, 1], [7, 6])];
    game.advance(0.03);
    const i = intents["local-1"];
    assert.ok(i.mx > 0 && i.my < 0);
    assert.ok(i.ay > 0);
    assert.equal(i.fire, true);
    assert.equal(i.burst, true);
    assert.equal(seats.length, 1);
    pads = [makePad(0)];
    game.advance(0.03);
  });
  run("two pads join one ship and unplug restores solo authority", () => {
    pads = [makePad(0, [0.5, 0, 0, 0]), makePad(1)];
    game.advance(0.03);
    assert.equal(input.join(1), true);
    pads = [makePad(0, [1, 0, 0, 0], [7]), makePad(1, [0, 1, -1, 0], [6])];
    game.advance(0.03);
    assert.equal(seats.length, 2);
    assert.ok(intents["local-1"].mx > 0);
    assert.ok(intents["local-2"].my > 0);
    assert.ok(intents["local-2"].ax < 0);
    assert.equal(input.swap(), true);
    assert.equal(input.swapped, true);
    pads = [makePad(0, [1, 0, 0, 0], [6])];
    game.advance(0.03);
    assert.equal(seats.length, 1);
    assert.equal(input.swapped, false);
    assert.equal(intents["local-1"].burst, false);
    pads = [makePad(0)];
    game.advance(0.03);
    pads = [makePad(0, [0, 0, 0, 0], [6])];
    game.advance(0.03);
    assert.equal(intents["local-1"].burst, true);
  });
  run("keyboard plus controller assigns independent intentions", () => {
    pads = [makePad(0)];
    game.input.lastDevice = "keyboard";
    input.family = "keyboard";
    input._primaryPad = null;
    assert.equal(input.join(), true);
    game.input.press("KeyD");
    pads = [makePad(0, [0, 1, 1, 0], [6])];
    game.advance(0.03);
    assert.ok(intents["local-1"].mx > 0);
    assert.equal(intents["local-1"].my, 0);
    assert.ok(intents["local-2"].my > 0);
    input.leave();
    input.clear();
    pads = [];
  });
  run("attract exit consumes controller press until release", () => {
    activity = true;
    pads = [makePad(0, [1, 0, 0, 0], [9])];
    game.advance(0.03);
    assert.equal(pause, 0);
    assert.equal(intents["local-1"].mx, 0);
    activity = false;
    game.advance(0.03);
    assert.equal(intents["local-1"].mx, 0);
    pads = [makePad(0)];
    game.advance(0.03);
    pads = [makePad(0, [1, 0, 0, 0])];
    game.advance(0.03);
    assert.ok(intents["local-1"].mx > 0);
    pads = [];
  });
  run("touch automatic targeting avoids a crystal in the firing lane", () => {
    world.entities = [
      { id: "c", type: "crystal", x: 200, y: 100, r: 25 },
      { id: "e", type: "layer", x: 300, y: 100, hp: 5 },
    ];
    assert.equal(input._safeAutoAim(world), null);
    world.entities.push({
      id: "e2",
      type: "interceptor",
      x: 200,
      y: 250,
      hp: 2,
    });
    const aim = input._safeAutoAim(world);
    assert.ok(aim);
    assert.ok(aim.ay > 0);
    assert.equal(aim.fire, true);
  });
  run("native TV shell works headlessly with all required screens", () => {
    const ui = new F.UI(E, game, {
      input,
      store,
      getWorld: () => ({ ...world, seed: 1, tick: 0 }),
      getConfig: () => ({}),
      onAction() {},
    });
    ui.showTitle();
    assert.equal(ui.screen, "title");
    ui.showPause();
    assert.equal(ui.screen, "pauseMenu");
    ui.showDev();
    assert.equal(ui.screen, "dev");
    ui.shell.hide();
    let resumed = false;
    ui.o.onAction = (action) => {
      if (action === "resume") resumed = true;
    };
    ui.update();
    assert.equal(resumed, true);
    ui.showSettings();
    assert.equal(ui.screen, "settings");
    ui.showControls();
    assert.equal(ui.screen, "controls");
    ui.showAbout(0);
    assert.equal(ui.screen, "about");
    ui.showResults({ score: 100, rescued: 4, lost: 1 });
    assert.equal(ui.screen, "results");
    ui.showFailure({ score: 10 });
    assert.equal(ui.screen, "failure");
    ui.dispose();
  });
  run("engine reports no frontend errors", () => assert.equal(game.errors.length, 0));
  input.dispose();
  game.dispose();
  return tests;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tests = frontendTests();
  for (const t of tests) if (!t.pass) console.error(`FAIL ${t.name}\n${t.error}`);
  console.log(
    `${tests.length - tests.filter((t) => !t.pass).length}/${tests.length} frontend checks passed`,
  );
  if (tests.some((t) => !t.pass)) process.exitCode = 1;
}
