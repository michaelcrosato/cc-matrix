import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import RAPIER from "@dimforge/rapier3d-compat";
import { Game, LEVEL, DEFAULTS } from "./game.js";

const warn = console.warn;
console.warn = (...args) => {
	if (!String(args[0]).includes("deprecated parameters for the initialization"))
		warn(...args);
};
await RAPIER.init();
console.warn = warn;

const stages = [
	{ type: "relic", id: 0, name: "Grinning Sun" },
	{ type: "vine", left: 30, right: 41, name: "Fernway vine" },
	{ type: "relic", id: 1, name: "Rain Dancer" },
	{ type: "crocs", left: 69, right: 80, name: "Crocodile creek" },
	{ type: "cave", id: 2, down: 84, up: 108, name: "Root Keeper cave" },
	{ type: "vine", left: 116, right: 130, name: "Tarwood vine" },
	{ type: "relic", id: 3, name: "Moon Monkey" },
	{ type: "vine", left: 166, right: 179, name: "Hollow earth vine" },
	{ type: "cave", id: 4, down: 184, up: 204, name: "Sleeping Star cave" },
	{ type: "crocs", left: 210, right: 224, name: "Last leap crocodiles" },
	{ type: "relic", id: 5, name: "Golden Goodbye" },
	{ type: "exit", x: 279, name: "Expedition exit" },
];

const diagnostics = {
	policy:
		"Real-time state-aware scripted expedition using only x/y/jump/autoGrab controls. No teleports, invincibility, noclip, time freeze, or tuning changes.",
	step: 1 / 60,
	attempts: [],
};

function movement(game, target, { hazards = true, stop = 0.12 } = {}) {
	const p = game.player;
	const dx = target - p.x;
	const x = Math.abs(dx) > stop ? Math.sign(dx) : 0;
	let jump = false;
	if (hazards && p.grounded && x) {
		const threats =
			p.y < -2
				? game.hazards.scorpions
				: [...game.hazards.logs, ...game.hazards.snakes];
		jump = threats.some((h) => {
			const ahead = (h.x - p.x) * x;
			return Math.abs(p.y - h.y) < 0.7 && ahead > 0.5 && ahead < 3.15;
		});
	}
	return { x, jump, autoGrab: false };
}

function routeInput(game, stage) {
	const p = game.player;
	if (stage.type === "relic") {
		const relic = LEVEL.relics.find((r) => r.id === stage.id);
		return movement(game, relic.x);
	}
	if (stage.type === "vine") {
		if (p.swinging) return { x: 1, jump: p.x > stage.right - 1.0 && p.vx > 0 };
		if (p.x >= stage.right - 0.1 || (game.grabCooldown > 0 && p.x > stage.left))
			return { x: 1 };
		const waitingX = stage.left - 2.1;
		if (p.x < waitingX - 0.35) return movement(game, waitingX);
		if (p.y < -2) return { x: 1, autoGrab: true };
		// Wait on solid ground and hop into the low end of the moving rope.
		return {
			x: p.x < waitingX - 0.1 ? 1 : p.x > waitingX + 0.3 && p.grounded ? -1 : 0,
			jump: p.grounded,
			autoGrab: true,
		};
	}
	if (stage.type === "crocs") {
		if (p.x < stage.left - 0.9) return movement(game, stage.left - 0.65);
		return { x: 1, jump: true };
	}
	if (stage.type === "cave") {
		const relic = LEVEL.relics.find((r) => r.id === stage.id);
		const gotIt = game.collected.has(stage.id);
		if (p.climbing) return { y: gotIt ? -1 : 1 };
		if (p.y > -1) {
			if (gotIt) return movement(game, stage.up + 1);
			if (Math.abs(p.x - stage.down) < 0.5) return { y: 1 };
			return movement(game, stage.down);
		}
		const target = gotIt ? stage.up : relic.x;
		if (gotIt && Math.abs(p.x - stage.up) < 0.5 && p.y < -4.7) return { y: -1 };
		return movement(game, target);
	}
	return movement(game, stage.x);
}

function stageDone(game, stage) {
	if (stage.type === "relic") return game.collected.has(stage.id);
	if (stage.type === "vine" || stage.type === "crocs")
		return game.player.x >= stage.right + 0.25 && game.player.y > -0.2;
	if (stage.type === "cave")
		return (
			game.collected.has(stage.id) &&
			game.player.y > -0.1 &&
			!game.player.climbing
		);
	return game.finished;
}

let success = false;
for (let attempt = 0; attempt < 3 && !success; attempt++) {
	const game = new Game(RAPIER);
	game.start();
	// A different normal-input departure delay samples differing obstacle phases.
	const departureDelay = attempt * 1.7;
	const record = {
		attempt: attempt + 1,
		departureDelay,
		stages: [],
		events: [],
		trace: [],
		result: null,
	};
	let index = 0;
	let lastTrace = -1;
	let stageStart = 0;
	for (let frame = 0; frame < 60 * 480 && !game.finished; frame++) {
		const stage = stages[index];
		const input = game.time < departureDelay ? {} : routeInput(game, stage);
		game.update(1 / 60, input);
		for (const event of game.drainEvents()) {
			if (
				[
					"hurt",
					"grab",
					"release",
					"climb",
					"relic",
					"checkpoint",
					"finish",
					"rescue",
				].includes(event.type)
			)
				record.events.push({
					time: +game.time.toFixed(3),
					x: +game.player.x.toFixed(2),
					y: +game.player.y.toFixed(2),
					...event,
				});
		}
		if (Math.floor(game.time) !== lastTrace) {
			lastTrace = Math.floor(game.time);
			record.trace.push({
				time: lastTrace,
				stage: stage.name,
				x: +game.player.x.toFixed(2),
				y: +game.player.y.toFixed(2),
				health: game.health,
				relics: game.collected.size,
				swinging: game.player.swinging,
				climbing: game.player.climbing,
			});
		}
		if (stageDone(game, stage)) {
			record.stages.push({
				name: stage.name,
				start: +stageStart.toFixed(3),
				end: +game.time.toFixed(3),
				deaths: game.deaths,
			});
			index++;
			stageStart = game.time;
			if (index >= stages.length) break;
		}
		// Catch a policy or level deadlock quickly without burning all three trials.
		if (game.time - stageStart > 100) break;
	}
	record.result = {
		...game.snapshot(),
		deaths: game.deaths,
		stage: stages[index]?.name || "completed",
		stageIndex: index,
	};
	assert.deepEqual(
		game.tuning,
		{ ...DEFAULTS },
		"playthrough must use the default tuning",
	);
	assert.deepEqual(
		game.dev,
		{ invincible: false, noclip: false, freezeTime: false },
		"playthrough must not use developer assistance",
	);
	success = Boolean(
		game.finished &&
			game.won &&
			game.collected.size === 6 &&
			index === stages.length &&
			game.stats.swings >= 3 &&
			record.events.filter((event) => event.type === "climb").length >= 4,
	);
	diagnostics.attempts.push(record);
	game.world.free();
}

diagnostics.passed = success;
writeFileSync(
	new URL("./playthrough-diagnostics.json", import.meta.url),
	JSON.stringify(diagnostics, null, 2) + "\n",
);
if (!success) {
	const result = diagnostics.attempts.at(-1).result;
	console.error(
		`FAIL input-only full expedition: stopped at ${result.stage}, x=${result.player.x.toFixed(2)}, y=${result.player.y.toFixed(2)}, relics=${result.collected.length}/6, deaths=${result.deaths}, time=${result.time.toFixed(1)}s`,
	);
}
console.log(
	`${success ? 1 : 0} input-only playthrough checks passed, ${success ? 0 : 1} failed`,
);
if (!success) process.exitCode = 1;
