import assert from "node:assert/strict";
import test from "node:test";
import { fieldEntrants } from "../src/characters.js";
import { BALLOON_YARD, CINDER_LOOP, placeKart, roadStrip } from "../src/courses.js";
import {
  actionsFromKeys,
  actionsFromPad,
  applyAxisInvert,
  ATTRACT_IDLE_SEC,
  menuEdges,
  neutralAction,
  seedHeldMenu,
  touchGateVisible,
  TOUCH_MESSAGE,
} from "../src/input.js";
import { outlineMaterialOptions } from "../src/look.js";
import { ITEM_IDS, rollItem, WEAK_ITEMS } from "../src/items.js";
import { mulberry32 } from "../src/math.js";
import { createCup, createSession, noteTrial, recordCupResult, stepSession } from "../src/modes.js";
import { bodyTranslation, createRaceWorld, stepWorld } from "../src/physics.js";
import { boxWorldPosition, createRace, finishOrder, stepRace } from "../src/race.js";

function humans(count, characterId = "pip") {
  return Array.from({ length: count }, (_, index) => ({
    characterId,
    name: `Driver ${index + 1}`,
    isPlayer: true,
    playerIndex: index,
  }));
}

function act(extra = {}) {
  return { ...neutralAction(), ...extra };
}

function grid(race, extras = []) {
  const row = race.karts.map(() => act());
  extras.forEach((extra, index) => {
    row[index] = act(extra);
  });
  return row;
}

function toRacing(race) {
  let guard = 0;
  while (race.phase === "countdown" && guard < 400) {
    stepRace(race, grid(race), 0.05);
    guard += 1;
  }
  assert.equal(race.phase, "racing");
  return race;
}

function freshRace(overrides = {}) {
  return createRace({
    course: CINDER_LOOP,
    mode: "cup",
    seed: 7,
    entrants: humans(overrides.count || 2, overrides.characterId || "pip"),
    ...overrides,
  });
}

test("rocket start rewards the window and punishes an early press", () => {
  function finishSpeed(mode) {
    const race = freshRace({ count: 1, seed: 3 });
    let guard = 0;
    while (race.phase === "countdown" && guard < 400) {
      const t = race.timeToGo;
      let accel = false;
      if (mode === "early") accel = t > 0;
      if (mode === "boost") accel = t <= 0.35 && t > 0;
      stepRace(race, [act({ accel })], 0.02);
      guard += 1;
    }
    assert.equal(race.phase, "racing");
    assert.equal(race.karts[0].startEarly, mode === "early");
    assert.equal(race.karts[0].startBoost, mode === "boost");
    for (let i = 0; i < 30; i++) stepRace(race, [act({ accel: true })], 0.02);
    return race.karts[0].speed;
  }
  const boost = finishSpeed("boost");
  const none = finishSpeed("none");
  const early = finishSpeed("early");
  assert.ok(boost > none, `boost ${boost} should beat clean ${none}`);
  assert.ok(none > early, `clean ${none} should beat early ${early}`);
});

test("drift charges two stages and a release raises speed", () => {
  const race = toRacing(freshRace({ count: 1 }));
  const kart = race.karts[0];
  placeKart(CINDER_LOOP, kart, 30, 0);
  kart.speed = 16;
  let stage = 0;
  for (let i = 0; i < 80; i++) {
    stepRace(race, [act({ accel: true, steer: 1, hop: true })], 1 / 60);
    stage = Math.max(stage, kart.driftStage);
  }
  assert.equal(stage, 2);
  const before = kart.speed;
  stepRace(race, [act({ accel: true, steer: 0, hop: false })], 1 / 60);
  assert.ok(kart.miniTurboT > 0);
  assert.ok(kart.speed > before, `speed ${kart.speed} should exceed ${before}`);
});

test("off-road speed stays below on-track speed", () => {
  function run(lateral) {
    const race = toRacing(freshRace({ count: 1 }));
    const kart = race.karts[0];
    placeKart(CINDER_LOOP, kart, 24, lateral);
    kart.speed = 0;
    for (let i = 0; i < 100; i++) stepRace(race, [act({ accel: true })], 0.02);
    return kart.speed;
  }
  const onTrack = run(0);
  const offTrack = run(CINDER_LOOP.roadHalf + 1.6);
  assert.ok(onTrack > offTrack, `on ${onTrack} off ${offTrack}`);
});

test("laps advance and rank follows an eight-kart field", () => {
  const race = toRacing(freshRace({ count: 8 }));
  race.karts.forEach((kart, index) => {
    placeKart(CINDER_LOOP, kart, 15 + index * 22, 0);
    kart.speed = 0;
  });
  stepRace(race, grid(race), 1 / 60);
  const leader = race.karts[7];
  const last = race.karts[0];
  assert.equal(leader.rank, 1);
  assert.equal(last.rank, 8);
  assert.equal(race.karts.length, 8);
  placeKart(CINDER_LOOP, leader, CINDER_LOOP.length - 2, 0);
  leader.speed = 36;
  const before = leader.displayLap;
  for (let i = 0; i < 20; i++) stepRace(race, grid(race, [{ accel: true }]), 0.02);
  assert.equal(before, 1);
  assert.ok(leader.displayLap >= 2, `lap ${leader.displayLap} progress ${leader.progress}`);
  placeKart(CINDER_LOOP, leader, CINDER_LOOP.length * 3 + 4, 0);
  leader.speed = 20;
  stepRace(race, grid(race), 0.05);
  assert.equal(leader.finished, true);
  assert.equal(leader.rank, 1);
  const order = finishOrder(race);
  assert.equal(order[0].name, leader.name);
  assert.equal(order.length, 8);
});

test("karts bounce off each other and off the wall", () => {
  const race = toRacing(freshRace({ count: 2 }));
  placeKart(CINDER_LOOP, race.karts[0], 40, 0);
  placeKart(CINDER_LOOP, race.karts[1], 40, 0);
  race.karts[0].speed = 12;
  race.karts[1].speed = 12;
  const before = race.karts[0].speed;
  stepRace(race, grid(race), 1 / 60);
  const apart = Math.hypot(race.karts[0].x - race.karts[1].x, race.karts[0].z - race.karts[1].z);
  assert.ok(apart >= race.karts[0].radius + race.karts[1].radius - 0.08);
  assert.ok(race.karts[0].speed < before || race.karts[1].speed < 12);

  const walled = toRacing(freshRace({ count: 1 }));
  const kart = walled.karts[0];
  placeKart(CINDER_LOOP, kart, 36, CINDER_LOOP.wallHalf + 3);
  kart.speed = 22;
  stepRace(walled, [act()], 1 / 60);
  assert.ok(Math.abs(kart.lateral) <= CINDER_LOOP.wallHalf + 0.05);
  assert.ok(kart.speed < 22);
});

test("each item class changes racer state", () => {
  function racing(count = 2) {
    return toRacing(freshRace({ count, seed: 11 }));
  }
  function put(race, index, progress, lateral = 0) {
    placeKart(CINDER_LOOP, race.karts[index], progress, lateral);
    race.karts[index].speed = 0;
    return race.karts[index];
  }

  {
    const race = racing();
    const user = put(race, 0, 50);
    const victim = put(race, 1, 58);
    user.held = { kind: "ricochet", charges: 1 };
    user.speed = 0;
    victim.speed = 0;
    stepRace(race, grid(race, [{ useItem: true }]), 0.25);
    assert.ok(victim.spinT > 0, "ricochet");
  }
  {
    const race = racing();
    const user = put(race, 0, 50);
    const victim = put(race, 1, 57);
    user.held = { kind: "homing", charges: 1 };
    stepRace(race, grid(race), 1 / 60);
    stepRace(race, grid(race, [{ useItem: true }]), 0.45);
    assert.ok(victim.spinT > 0, "homing");
    assert.ok(victim.held == null);
  }
  {
    const race = racing();
    const user = put(race, 0, 40);
    const leader = put(race, 1, 52);
    leader.held = { kind: "spark", charges: 1 };
    user.held = { kind: "crownseeker", charges: 1 };
    stepRace(race, grid(race), 1 / 60);
    assert.equal(leader.rank, 1);
    stepRace(race, grid(race, [{ useItem: true }]), 0.6);
    assert.ok(leader.spinT > 0, "crownseeker");
    assert.equal(leader.held, null);
  }
  {
    const race = racing();
    const user = put(race, 0, 70);
    user.speed = 0;
    user.held = { kind: "slick", charges: 1 };
    stepRace(race, grid(race, [{ useItem: true }]), 1 / 60);
    assert.equal(race.hazards.length, 1);
    const victim = race.karts[1];
    victim.x = race.hazards[0].x;
    victim.z = race.hazards[0].z;
    victim.speed = 0;
    stepRace(race, grid(race), 0.4);
    assert.ok(victim.spinT > 0, "slick");
    assert.equal(victim.fooled, false);
  }
  {
    const race = racing();
    const user = put(race, 0, 80);
    user.held = { kind: "scatter", charges: 1 };
    stepRace(race, grid(race, [{ useItem: true }]), 1 / 60);
    assert.equal(race.hazards.length, 3);
    assert.ok(race.hazards.every((hazard) => hazard.kind === "slick"));
  }
  {
    const race = racing();
    const user = put(race, 0, 90);
    user.held = { kind: "phantom", charges: 1 };
    stepRace(race, grid(race, [{ useItem: true }]), 1 / 60);
    assert.equal(race.hazards[0].kind, "phantom");
    const victim = race.karts[1];
    victim.x = race.hazards[0].x;
    victim.z = race.hazards[0].z;
    victim.speed = 0;
    stepRace(race, grid(race), 0.45);
    assert.equal(victim.fooled, true);
    assert.ok(victim.spinT > 1);
  }
  {
    const race = racing(1);
    const user = put(race, 0, 30);
    user.speed = 4;
    user.held = { kind: "spark", charges: 1 };
    const before = user.speed;
    stepRace(race, [act({ useItem: true })], 1 / 60);
    assert.ok(user.speed > before);
    assert.ok(user.boostT > 0);
  }
  {
    const race = racing(1);
    const user = put(race, 0, 30);
    user.held = { kind: "triSpark", charges: 3 };
    stepRace(race, [act({ useItem: true })], 1 / 60);
    stepRace(race, [act({ useItem: false })], 1 / 60);
    assert.equal(user.held.charges, 2);
    assert.ok(user.speed > 10);
    stepRace(race, [act({ useItem: true })], 1 / 60);
    stepRace(race, [act()], 1 / 60);
    stepRace(race, [act({ useItem: true })], 1 / 60);
    assert.equal(user.held, null);
  }
  {
    const race = racing(1);
    const user = put(race, 0, 30);
    user.speed = 0;
    user.held = { kind: "sparkStorm", charges: 1 };
    stepRace(race, [act({ useItem: true, accel: true })], 1 / 60);
    assert.ok(user.stormT > 2);
    stepRace(race, [act({ accel: true })], 0.5);
    assert.ok(user.speed > 15, `storm speed ${user.speed}`);
  }
  {
    const race = racing();
    const user = put(race, 0, 44, 0);
    const other = put(race, 1, 44, 0);
    user.held = { kind: "aegis", charges: 1 };
    stepRace(race, grid(race, [{ useItem: true }]), 1 / 60);
    assert.ok(user.aegisT > 0);
    assert.ok(other.spinT > 0, "aegis knock");
    assert.equal(user.spinT, 0);
  }
  {
    const race = racing();
    put(race, 0, 20, 0);
    put(race, 1, 20, 3);
    race.karts[0].held = { kind: "brownout", charges: 1 };
    race.karts[0].speed = 0;
    race.karts[1].speed = 0;
    stepRace(race, grid(race, [{ useItem: true, accel: true }, { accel: true }]), 1 / 60);
    assert.equal(race.karts[0].brownoutT, 0);
    assert.ok(race.karts[1].brownoutT > 0);
    for (let i = 0; i < 50; i++) stepRace(race, grid(race, [{ accel: true }, { accel: true }]), 0.02);
    assert.ok(race.karts[0].speed > race.karts[1].speed);
  }
  {
    const race = racing();
    const user = put(race, 0, 30);
    const victim = put(race, 1, 48);
    victim.held = { kind: "spark", charges: 1 };
    user.held = { kind: "pilfer", charges: 1 };
    stepRace(race, grid(race, [{ useItem: true }]), 1 / 60);
    assert.equal(victim.held, null);
    assert.equal(user.held.kind, "spark");
  }
  {
    const race = racing();
    const user = put(race, 0, 60);
    user.held = { kind: "slick", charges: 1 };
    user.speed = 0;
    stepRace(race, grid(race, [{ useItem: true, brake: true }]), 1 / 60);
    assert.equal(user.trailing, true);
    assert.equal(user.held.kind, "slick");
    const other = race.karts[1];
    other.x = user.x - Math.sin(user.heading) * 1.7;
    other.z = user.z - Math.cos(user.heading) * 1.7;
    other.speed = 0;
    stepRace(race, grid(race), 1 / 60);
    assert.ok(other.spinT > 0, "trail");
    assert.equal(user.trailing, false);
  }
});

test("item roulette favors weaker items for the leader and boxes come back", () => {
  const draws = 2500;
  let leader = 0;
  let last = 0;
  const rngA = mulberry32(99);
  const rngB = mulberry32(99);
  for (let i = 0; i < draws; i++) {
    if (WEAK_ITEMS.includes(rollItem(1, 8, rngA))) leader += 1;
    if (WEAK_ITEMS.includes(rollItem(8, 8, rngB))) last += 1;
  }
  assert.ok(leader / draws > last / draws + 0.25, `${leader} vs ${last}`);

  const race = toRacing(freshRace({ count: 1, seed: 5 }));
  const kart = race.karts[0];
  const spot = boxWorldPosition(race, race.boxes[0]);
  kart.x = spot.x;
  kart.z = spot.z;
  kart.speed = 0;
  stepRace(race, [act()], 1 / 60);
  assert.equal(race.boxes[0].alive, false);
  assert.ok(kart.roulette);
  stepRace(race, [act({ useItem: true })], 1 / 60);
  assert.ok(kart.held && ITEM_IDS.includes(kart.held.kind));
  stepRace(race, [act()], 5.3);
  assert.equal(race.boxes[0].alive, true);
});

test("cup continue rule, trial best, and battle elimination", () => {
  const cup = createCup();
  const mid = recordCupResult(cup, 4);
  assert.equal(mid.action, "continue");
  assert.equal(cup.index, 1);
  assert.equal(cup.points, 5);
  const done = recordCupResult(cup, 1);
  assert.equal(done.action, "finished");
  assert.ok(done.total > 5);
  const retryCup = createCup();
  const retry = recordCupResult(retryCup, 5);
  assert.equal(retry.action, "retry");
  assert.equal(retryCup.index, 0);
  assert.equal(retryCup.points, 0);

  const bests = {};
  const first = noteTrial(bests, "cinder-loop", 42);
  assert.equal(first.improved, true);
  const worse = noteTrial(bests, "cinder-loop", 50);
  assert.equal(worse.improved, false);
  assert.equal(worse.best, 42);
  const better = noteTrial(bests, "cinder-loop", 40);
  assert.equal(better.best, 40);

  const race = createRace({
    course: BALLOON_YARD,
    mode: "battle",
    seed: 2,
    entrants: humans(2),
  });
  toRacing(race);
  assert.equal(race.karts[0].balloons, 3);
  assert.equal(race.karts[1].balloons, 3);
  for (let pop = 0; pop < 3; pop++) {
    race.karts[0].x = 0;
    race.karts[0].z = 0;
    race.karts[0].heading = 0;
    race.karts[0].speed = 0;
    race.karts[1].x = 0;
    race.karts[1].z = 3.2;
    race.karts[1].speed = 0;
    race.karts[0].held = { kind: "ricochet", charges: 1 };
    race.karts[0].useLatch = false;
    stepRace(race, grid(race, [{ useItem: true }]), 0.3);
    stepRace(race, grid(race), 1 / 60);
  }
  assert.equal(race.karts[1].balloons, 0);
  assert.equal(race.karts[1].eliminated, true);
  assert.equal(race.phase, "finished");
  assert.equal(race.winner, race.karts[0]);
});

test("time trial starts with a multi-charge boost and no boxes", () => {
  const entrants = fieldEntrants(["bramble"], "trial");
  assert.equal(entrants.length, 1);
  const race = createRace({ course: CINDER_LOOP, mode: "trial", entrants, seed: 1 });
  assert.equal(race.boxes.length, 0);
  assert.equal(race.karts[0].held.kind, "triSpark");
  assert.equal(race.karts[0].held.charges, 3);
});

test("attract idle starts at 10 seconds and clears on input", () => {
  assert.equal(ATTRACT_IDLE_SEC, 10);
  const session = createSession();
  stepSession(session, 9.9, false);
  assert.equal(session.attract, false);
  stepSession(session, 0.1, false);
  assert.equal(session.attract, true);
  assert.equal(session.screen, "attract");
  stepSession(session, 2, true);
  assert.equal(session.attract, false);
  assert.equal(session.screen, "title");
  session.screen = "race";
  stepSession(session, 30, false);
  assert.equal(session.attract, false);
});

test("invert toggles negate only the requested gamepad axis", () => {
  const pad = { axes: [0.62, 0.8, 0, 0], buttons: Array(16).fill(0) };
  const plain = actionsFromPad(pad, { invertX: false, invertY: false });
  const flipX = actionsFromPad(pad, { invertX: true, invertY: false });
  const flipY = actionsFromPad(pad, { invertX: false, invertY: true });
  assert.equal(flipX.steer, -plain.steer);
  assert.equal(flipX.menuY, plain.menuY);
  assert.ok(flipX.steer < 0);
  assert.equal(flipY.steer, plain.steer);
  assert.equal(flipY.menuY, -plain.menuY);
  const both = applyAxisInvert(0.4, -0.2, { invertX: true, invertY: true });
  assert.equal(both.x, -0.4);
  assert.equal(both.y, 0.2);
  const none = applyAxisInvert(0.4, -0.2, { invertX: false, invertY: false });
  assert.equal(none.x, 0.4);
  assert.equal(none.y, -0.2);
});

test("a held pause does not resume until it is released", () => {
  const escape = actionsFromKeys({ Escape: true }, 0);
  assert.equal(escape.pause, true);
  assert.equal(escape.back, true);
  const seeded = seedHeldMenu(escape);
  const stillHeld = menuEdges(escape, seeded);
  assert.equal(stillHeld.pause, false);
  assert.equal(stillHeld.back, false);
  const released = actionsFromKeys({}, 0);
  const idle = menuEdges(released, seeded);
  assert.equal(idle.pause, false);
  assert.equal(idle.back, false);
  const again = menuEdges(actionsFromKeys({ Escape: true }, 0), released);
  assert.equal(again.pause, true);
  assert.equal(again.back, true);
  const buttons = Array(16).fill(0);
  buttons[9] = 1;
  const start = actionsFromPad({ axes: [0, 0, 0, 0], buttons }, {});
  const startHeld = menuEdges(start, seedHeldMenu(start));
  assert.equal(start.pause, true);
  assert.equal(startHeld.pause, false);
  assert.equal(startHeld.back, false);
});

test("outline shells use the back side so they do not cover the kart", () => {
  const THREE = { BackSide: { id: "back" }, FrontSide: { id: "front" } };
  const options = outlineMaterialOptions(THREE);
  assert.equal(options.side, THREE.BackSide);
  assert.notEqual(options.side, THREE.FrontSide);
  assert.equal(options.color, 0x141018);
});

test("touch-only devices are told a controller or keyboard is required", () => {
  assert.equal(TOUCH_MESSAGE, "Controller or keyboard required");
  assert.equal(touchGateVisible({ coarsePointer: true, hover: false, maxTouchPoints: 5 }), true);
  assert.equal(touchGateVisible({ coarsePointer: false, hover: true, maxTouchPoints: 0 }), false);
  assert.equal(touchGateVisible({ coarsePointer: true, hover: true, maxTouchPoints: 2 }), false);
});

test("road strip faces up and a kart travels along its heading", () => {
  const strip = roadStrip(CINDER_LOOP, CINDER_LOOP.roadHalf, 0.08);
  const p = strip.positions;
  const [i0, i1, i2] = strip.indices;
  const ax = p[i0 * 3];
  const ay = p[i0 * 3 + 1];
  const az = p[i0 * 3 + 2];
  const bx = p[i1 * 3];
  const by = p[i1 * 3 + 1];
  const bz = p[i1 * 3 + 2];
  const cx = p[i2 * 3];
  const cy = p[i2 * 3 + 1];
  const cz = p[i2 * 3 + 2];
  const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
  assert.ok(ny > 0, `road normal y ${ny}`);
  const race = toRacing(freshRace({ count: 1, seed: 3 }));
  const kart = race.karts[0];
  placeKart(race.course, kart, 24, 0);
  kart.speed = 20;
  kart.drifting = false;
  const heading = kart.heading;
  const x0 = kart.x;
  const z0 = kart.z;
  stepRace(race, [act({ accel: true })], 0.05);
  const dx = kart.x - x0;
  const dz = kart.z - z0;
  const len = Math.hypot(dx, dz);
  const along = (dx * Math.sin(heading) + dz * Math.cos(heading)) / len;
  assert.ok(len > 0.4, `moved ${len}`);
  assert.ok(along > 0.95, `along ${along}`);
});

test("shipped Rapier world moves a dynamic body", async () => {
  const { world, cone } = await createRaceWorld(CINDER_LOOP);
  const start = bodyTranslation(cone);
  stepWorld(world, 40);
  const next = bodyTranslation(cone);
  assert.ok(next.y < start.y - 0.5, `y ${start.y} -> ${next.y}`);
});
