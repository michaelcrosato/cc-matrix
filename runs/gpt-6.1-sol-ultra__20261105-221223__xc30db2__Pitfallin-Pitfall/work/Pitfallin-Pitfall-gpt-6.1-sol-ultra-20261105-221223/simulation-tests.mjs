import assert from "node:assert/strict";
import RAPIER from "@dimforge/rapier3d-compat";
import { Game, LEVEL, DEFAULTS } from "./game.js";

// Rapier's compat WASM loader emits an upstream deprecation notice for its own
// generated bootstrap. Test output deliberately includes failures and totals only.
const originalWarn = console.warn;
console.warn = (...args) => {
	if (!String(args[0]).includes("deprecated parameters for the initialization"))
		originalWarn(...args);
};
await RAPIER.init();
console.warn = originalWarn;

let passed = 0;
let failed = 0;
const dt = 1 / 60;
function frames(game, count, input = {}) {
	for (let i = 0; i < count; i++)
		game.update(dt, typeof input === "function" ? input(i, game) : input);
}
function seconds(game, duration, input = {}) {
	frames(game, Math.round(duration / dt), input);
}
function fresh() {
	const game = new Game(RAPIER);
	game.start();
	return game;
}
function hasEvent(game, type) {
	return game.drainEvents().some((event) => event.type === type);
}
function test(name, fn) {
	let game;
	try {
		game = fresh();
		fn(game);
		passed++;
	} catch (error) {
		failed++;
		console.error(`FAIL ${name}: ${error.message}`);
	} finally {
		game?.world.free();
	}
}

// These assertions treat Game as a simulation boundary. Level coordinates arrange
// encounters; movement, collisions, pickups and finish conditions run through update.
test("Rapier world and a stable grounded explorer", (game) => {
	seconds(game, 0.3);
	const state = game.snapshot();
	assert.ok(state.physics.bodies > 10 && state.physics.colliders > 10);
	assert.equal(state.physics.engine, "Rapier 0.19.3");
	assert.ok(state.player.grounded);
	assert.ok(Math.abs(state.player.y) < 0.1, `ground y ${state.player.y}`);
	assert.ok(Number.isFinite(state.player.x));
});

test("directional acceleration, braking and ground collision", (game) => {
	seconds(game, 0.2);
	const start = game.player.x;
	seconds(game, 0.65, { x: 1 });
	assert.ok(
		game.player.x > start + 3,
		"right movement should cover useful distance",
	);
	assert.ok(game.player.grounded && Math.abs(game.player.y) < 0.1);
	seconds(game, 0.3, {});
	assert.ok(Math.abs(game.player.vx) < 0.05, "release should brake");
	const turnaround = game.player.x;
	seconds(game, 0.3, { x: -1 });
	assert.ok(game.player.x < turnaround - 1);
	assert.equal(game.player.facing, -1);
});

test("jump leaves ground, reaches apex and lands once", (game) => {
	seconds(game, 0.2);
	game.drainEvents();
	game.update(dt, { jump: true });
	seconds(game, 0.3);
	assert.ok(game.player.y > 1.4, `jump height ${game.player.y}`);
	assert.ok(!game.player.grounded);
	seconds(game, 1);
	assert.ok(game.player.grounded && Math.abs(game.player.y) < 0.1);
	assert.equal(game.stats.jumps, 1);
	const events = game.drainEvents();
	assert.equal(events.filter((event) => event.type === "jump").length, 1);
	assert.equal(events.filter((event) => event.type === "land").length, 1);
});

test("rolling log damage, checkpoint rescue and temporary invulnerability", (game) => {
	game.tuning.hazardSpeed = 0;
	game.updateHazards();
	const log = game.hazards.logs[0];
	game.score = 500;
	game.teleport(log.x, 0.03);
	game.update(dt, {});
	assert.equal(game.health, 2);
	assert.equal(game.deaths, 1);
	assert.equal(game.score, 350);
	assert.ok(Math.abs(game.player.x - 4) < 0.01);
	assert.ok(game.player.invuln > 2);
	assert.ok(hasEvent(game, "hurt"));
	game.teleport(log.x, 0.03);
	game.update(dt, {});
	assert.equal(
		game.health,
		2,
		"same hazard must not hit during invulnerability",
	);
	game.teleport(4, 0.03);
	seconds(game, 2.8);
	game.teleport(log.x, 0.03);
	game.update(dt, {});
	assert.equal(
		game.health,
		1,
		"hazard must hit again after invulnerability expires",
	);
});

test("snakes and underground scorpions both cause damage", (game) => {
	game.tuning.hazardSpeed = 0;
	game.updateHazards();
	game.teleport(game.hazards.snakes[0].x, 0.03);
	game.update(dt, {});
	assert.equal(game.health, 2);
	assert.ok(hasEvent(game, "hurt"));
	game.player.invuln = 0;
	game.teleport(game.hazards.scorpions[0].x, -5.75);
	game.update(dt, {});
	assert.equal(game.health, 1);
	assert.ok(hasEvent(game, "hurt"));
});

test("crocodile jaw cycle distinguishes safe from dangerous footing", (game) => {
	game.tuning.hazardSpeed = 0;
	game.updateHazards();
	assert.equal(game.hazards.crocs[0].open, false);
	game.teleport(LEVEL.crocs[0].x, 0.2);
	game.update(dt, {});
	assert.equal(game.health, 3);
	game.time = 4.2;
	game.tuning.hazardSpeed = 1;
	game.player.invuln = 0;
	game.teleport(LEVEL.crocs[0].x, 0.2);
	game.update(dt, {});
	assert.equal(game.hazards.crocs[0].open, true);
	assert.equal(game.health, 2);
});

test("falling into a pit rescues the player and charges a time penalty", (game) => {
	const before = game.remaining;
	game.teleport(35, -9.5);
	game.update(dt, {});
	assert.equal(game.stats.falls, 1);
	assert.equal(game.health, 2);
	assert.ok(game.remaining <= before - 5);
	assert.ok(game.player.y > -0.1);
	assert.ok(Number.isFinite(game.player.x));
});

test("checkpoints advance once, heal once and control the rescue point", (game) => {
	game.health = 1;
	game.teleport(LEVEL.checkpoints[3].x + 0.2, 0.03);
	game.update(dt, {});
	assert.equal(game.checkpoint, 3);
	assert.equal(game.health, 3);
	const count = game
		.drainEvents()
		.filter((event) => event.type === "checkpoint").length;
	assert.equal(count, 3);
	game.health = 1;
	game.update(dt, {});
	assert.equal(game.health, 1, "standing at camp must not heal every frame");
	assert.equal(hasEvent(game, "checkpoint"), false);
	game.teleport(170, -10);
	game.update(dt, {});
	assert.ok(Math.abs(game.player.x - (LEVEL.checkpoints[3].x + 1)) < 0.01);
});

test("ladder descent reaches cave floor and ascent returns to daylight", (game) => {
	game.teleport(LEVEL.ladders[0], 0.03);
	game.update(dt, { y: 1 });
	assert.ok(game.player.climbing);
	seconds(game, 1.8, { y: 1 });
	assert.ok(!game.player.climbing && game.player.y < -5.7);
	game.update(dt, { y: -1 });
	assert.ok(game.player.climbing);
	seconds(game, 1.8, { y: -1 });
	assert.ok(!game.player.climbing && game.player.grounded);
	assert.ok(Math.abs(game.player.y) < 0.1);
	assert.ok(hasEvent(game, "climb"));
});

test("vine catch, pendulum travel and release preserve a playable trajectory", (game) => {
	game.time = 1.45;
	game.updateHazards();
	const vine = game.vines[0];
	game.teleport(
		vine.x + Math.sin(vine.angle) * vine.length,
		vine.y - Math.cos(vine.angle) * vine.length - 1.3,
	);
	game.update(dt, { grab: true });
	assert.ok(game.player.swinging, "grab close to a rope should attach");
	const start = game.player.x;
	seconds(game, 0.5);
	assert.ok(
		Math.abs(game.player.x - start) > 0.5,
		"pendulum should move attached explorer",
	);
	game.update(dt, { jump: true, x: 1 });
	assert.ok(!game.player.swinging);
	assert.ok(game.player.vy >= 4.8);
	assert.ok(game.grabCooldown > 0.5);
	assert.equal(game.stats.swings, 1);
	const events = game.drainEvents();
	assert.ok(events.some((event) => event.type === "grab"));
	assert.ok(events.some((event) => event.type === "release"));
});

test("relic pickup is one-time and the exit rejects an incomplete expedition", (game) => {
	const relic = LEVEL.relics[0];
	game.teleport(relic.x, relic.y - 0.7);
	game.update(dt, {});
	const score = game.score;
	assert.equal(game.collected.size, 1);
	game.update(dt, {});
	assert.equal(game.score, score);
	game.teleport(279, 0.03);
	game.update(dt, {});
	assert.equal(game.finished, false);
	assert.equal(game.mode, "playing");
	assert.ok(hasEvent(game, "notice"));
});

test("scripted complete expedition: approach all six relics, then cross the exit", (game) => {
	// Feature encounters above cover hazards and traversal. This designer route
	// teleports between regions, then walks through every actual pickup and exit.
	game.dev.invincible = true;
	for (const relic of LEVEL.relics) {
		const floor = relic.y < -1 ? -5.75 : 0.03;
		game.teleport(relic.x - 2.6, floor);
		seconds(game, 0.62, { x: 1 });
		assert.ok(
			game.collected.has(relic.id),
			`route failed to collect ${relic.name}`,
		);
	}
	assert.equal(game.collected.size, 6);
	assert.equal(game.stats.treasures, 6);
	assert.ok(game.score >= 6000);
	game.teleport(275.5, 0.03);
	seconds(game, 0.8, { x: 1 });
	assert.equal(game.finished, true);
	assert.equal(game.won, true);
	assert.equal(game.mode, "results");
	const finishEvents = game
		.drainEvents()
		.filter((event) => event.type === "finish");
	assert.equal(finishEvents.length, 1);
	const score = game.score;
	game.update(dt, { x: 1, jump: true });
	assert.equal(game.score, score, "completed expedition must be frozen");
});

test("timeout ends once with a loss and freezes further input", (game) => {
	game.remaining = 0.02;
	game.update(0.05, {});
	assert.equal(game.finished, true);
	assert.equal(game.won, false);
	assert.equal(game.mode, "results");
	const x = game.player.x;
	frames(game, 10, { x: 1, jump: true });
	assert.equal(game.player.x, x);
	assert.equal(
		game.drainEvents().filter((event) => event.type === "finish").length,
		1,
	);
});

test("attract replay tours daylight, vines, crocodiles and caves, then loops", (game) => {
	game.start(true);
	let cave = false,
		swing = false,
		crocodiles = false,
		farthest = 0,
		looped = false;
	let previousTime = 0;
	for (let i = 0; i < 60 * 65; i++) {
		game.update(dt, {});
		cave ||= game.player.y < -4;
		swing ||= game.player.swinging;
		crocodiles ||= game.player.x > 70 && game.player.x < 79;
		farthest = Math.max(farthest, game.player.x);
		looped ||= game.attractTime < previousTime;
		previousTime = game.attractTime;
	}
	assert.ok(cave && swing && crocodiles && farthest > 278);
	assert.ok(looped);
	assert.equal(game.mode, "attract");
	assert.equal(game.finished, false);
	assert.equal(game.remaining, DEFAULTS.timeLimit);
});

test("live speed and jump tuning affect motion; restoring defaults restores values", (game) => {
	seconds(game, 0.1);
	const start = game.player.x;
	seconds(game, 0.5, { x: 1 });
	const baselineDistance = game.player.x - start;
	game.teleport(3, 0.03);
	game.tuning.speed = DEFAULTS.speed * 1.6;
	seconds(game, 0.1);
	seconds(game, 0.5, { x: 1 });
	assert.ok(game.player.x - 3 > baselineDistance * 1.4);
	game.teleport(3, 0.03);
	game.tuning.jump = DEFAULTS.jump * 1.3;
	seconds(game, 0.2);
	game.update(dt, { jump: true });
	seconds(game, 0.3);
	assert.ok(game.player.y > 2.1);
	Object.assign(game.tuning, DEFAULTS);
	assert.deepEqual(game.tuning, { ...DEFAULTS });
	game.tuning.timeLimit = 123;
	game.start();
	assert.equal(game.remaining, 123);
});

test("dev invincibility, noclip and time-freeze operate independently", (game) => {
	game.dev.invincible = true;
	game.tuning.hazardSpeed = 0;
	game.updateHazards();
	game.teleport(game.hazards.logs[0].x, 0.03);
	game.update(dt, {});
	assert.equal(game.health, 3);
	game.dev.noclip = true;
	game.dev.freezeTime = true;
	const time = game.remaining;
	const y = game.player.y;
	seconds(game, 0.5, { x: 1, y: -1 });
	assert.equal(game.remaining, time);
	assert.ok(game.player.y > y + 2);
	assert.ok(game.player.x > game.hazards.logs[0].x + 2);
});

console.log(`${passed} simulation checks passed, ${failed} failed`);
if (failed) process.exitCode = 1;
