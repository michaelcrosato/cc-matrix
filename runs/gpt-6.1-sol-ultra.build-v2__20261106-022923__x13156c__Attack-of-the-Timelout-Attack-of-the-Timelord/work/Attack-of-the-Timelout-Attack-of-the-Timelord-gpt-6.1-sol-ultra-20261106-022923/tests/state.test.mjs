import assert from "node:assert/strict";
import {
	BOSS_PHASES,
	DEFAULT_TUNING,
	TUNING_SPEC,
	validateCampaign,
	WAVES,
} from "../src/content/campaign.js";
import {
	applySnapshot,
	autoPilot,
	createWorld,
	finishWorld,
	getSnapshot,
	hitPlayer,
	jumpEncounter,
	refillWorld,
	removePlayer,
	resetTuning,
	STEP,
	spawnThreat,
	stepWorld,
	sweptHit,
} from "../src/game/simulation.js";

export function runStateTests() {
	const failures = [];
	let count = 0;
	const test = (name, fn) => {
		count++;
		try {
			fn();
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
		}
	};
	const play = (world, seconds, actions = {}) => {
		for (let i = 0; i < Math.round(seconds / STEP); i++)
			stepWorld(
				world,
				typeof actions === "function" ? actions(world) : actions,
			);
	};
	const active = (options = {}) => {
		const w = createWorld(options);
		play(w, 2.5);
		w.fireClock = 999;
		return w;
	};
	const bare = (options = {}) => {
		const w = active(options);
		w.enemies = w.enemies.slice(0, 1);
		w.enemies[0].delay = 999;
		w.threats = [];
		w.shots = [];
		return w;
	};

	test("content validates all waves, paths and tuning defaults", () => {
		assert.deepEqual(validateCampaign(), []);
		assert.equal(WAVES.length, 8);
		assert.equal(BOSS_PHASES.length, 3);
		for (const s of TUNING_SPEC)
			assert.equal(typeof DEFAULT_TUNING[s.key], "number");
	});
	test("empty shared meter, three pips, immutable defaults", () => {
		const a = createWorld(),
			b = createWorld();
		a.tuning.playerSpeed = 500;
		assert.equal(b.tuning.playerSpeed, 340);
		assert.equal(DEFAULT_TUNING.playerSpeed, 340);
		assert.equal(a.charge, 0);
		assert.equal(a.players[0].hp, 3);
	});
	test("assisted record classification latches even after all assists are disabled", () => {
		assert.equal(createWorld().assisted, false);
		assert.equal(createWorld({ assists: { autoFire: true } }).assisted, true);
		const w = active();
		assert.equal(w.assisted, false);
		w.assists.reducedSpeed = true;
		stepWorld(w);
		assert.equal(w.assisted, true);
		w.assists = { autoFire: false, reducedSpeed: false, emergencyBrake: false };
		stepWorld(w);
		assert.equal(w.assisted, true);
		assert.equal(Object.values(w.assists).some(Boolean), false);
		assert.equal(getSnapshot(w).assisted, true);
		assert.equal(w.modified, false);
		assert.equal(w.demo, false);
		assert.equal(createWorld().assisted, false);
	});
	test("pointer target respects movement speed and keyboard overrides target", () => {
		const w = bare();
		const p = w.players[0];
		stepWorld(w, { p1: { targetX: 400 } });
		assert.ok(p.x < 4 && p.x > 0);
		stepWorld(w, { p1: { move: -1, targetX: 400 } });
		assert.ok(Math.abs(p.x) < 0.00001);
	});
	test("one normal live shot per owner, independent simultaneous cannons", () => {
		const w = bare({ players: [{ id: "a" }, { id: "b" }] });
		play(w, 0.1, { a: { fire: true }, b: { fire: true } });
		assert.equal(w.shots.length, 2);
		assert.deepEqual(new Set(w.shots.map((s) => s.owner)), new Set(["a", "b"]));
	});
	test("continuous swept intersection catches thin target", () => {
		assert.ok(sweptHit(0, 50, 0, -50, 0, 0, 0, 0, 3));
		assert.equal(sweptHit(20, 50, 20, -50, 0, 0, 0, 0, 3), false);
	});
	test("interception precedes hostile damage and cannot score twice", () => {
		const w = bare();
		w.players[0].invuln = 0;
		const t = spawnThreat(w, "missile", { x: 0, y: 239, warning: 0 });
		w.shots = [
			{ id: 9999, owner: "p1", x: 0, y: 250, py: 250 },
			{ id: 9998, owner: "p1", x: 0, y: 250, py: 250 },
		];
		stepWorld(w, {}, 0.02);
		assert.equal(w.stats.intercepts, 1);
		assert.equal(w.score, 2);
		assert.equal(w.players[0].hp, 3);
		assert.equal(
			w.threats.some((x) => x.id === t.id),
			false,
		);
		assert.equal(w.events.filter((e) => e.type === "intercept").length, 1);
	});
	test("one hit event with overlapping hazards and visible invulnerability", () => {
		const w = bare();
		w.players[0].invuln = 0;
		for (let i = 0; i < 4; i++)
			spawnThreat(w, "missile", { x: 0, y: 240, warning: 0 });
		stepWorld(w);
		assert.equal(w.players[0].hp, 2);
		assert.equal(w.events.filter((e) => e.type === "hit").length, 1);
		assert.ok(w.players[0].invuln > 2);
		assert.equal(hitPlayer(w, "p1"), false);
		assert.equal(w.threats.length, 0);
	});
	test("solo zero integrity ends and once-only outcome cancels hazards", () => {
		const w = bare();
		for (let i = 0; i < 3; i++) {
			w.players[0].invuln = 0;
			hitPlayer(w, "p1");
		}
		assert.equal(w.outcome, "defeat");
		assert.equal(w.threats.length, 0);
		assert.equal(finishWorld(w, "victory"), false);
		play(w, 3);
		assert.equal(w.phase, "results");
		const tick = w.tick;
		stepWorld(w, { p1: { fire: true } });
		assert.equal(w.tick, tick);
	});
	test("co-op disabled seat stays disabled until wave-clear repair", () => {
		const w = bare({ players: [{ id: "a" }, { id: "b" }] });
		for (let i = 0; i < 3; i++) {
			w.players[0].invuln = 0;
			hitPlayer(w, "a");
		}
		assert.equal(w.outcome, null);
		assert.equal(w.players[0].hp, 0);
		stepWorld(w, { a: { fire: true, move: 1 } });
		assert.equal(w.shots.length, 0);
		w.enemies = [];
		stepWorld(w);
		assert.equal(w.phase, "intermission");
		assert.equal(w.players[0].hp, 1);
		assert.equal(w.players[1].hp, 3);
	});
	test("departed seats cannot keep team alive or block targeting", () => {
		const w = bare({ players: [{ id: "a" }, { id: "b" }] });
		removePlayer(w, "b");
		assert.equal(w.players[1].connected, false);
		for (let i = 0; i < 3; i++) {
			w.players[0].invuln = 0;
			hitPlayer(w, "a");
		}
		assert.equal(w.outcome, "defeat");
	});
	test("fair targeting rotates live seats with stable ordering", () => {
		const w = bare({ players: [{ id: "z" }, { id: "a" }, { id: "q" }] });
		const ids = Array.from(
			{ length: 6 },
			() => spawnThreat(w, "missile", { warning: 0 }).targetId,
		);
		assert.deepEqual(ids, ["a", "q", "z", "a", "q", "z"]);
	});
	test("mine steering is bounded and follows host-selected seat", () => {
		const w = bare();
		w.players[0].x = 300;
		const t = spawnThreat(w, "mine", { x: -200, y: -100, warning: 0 });
		stepWorld(w);
		assert.ok(t.vx > 0 && t.vx <= DEFAULT_TUNING.mineTurnRate * STEP + 0.00001);
		assert.equal(t.targetId, "p1");
	});
	test("hunter commits once to warned prediction instead of continuous homing", () => {
		const w = bare();
		w.players[0].vx = 300;
		const t = spawnThreat(w, "hunter", { x: -200, y: -150, warning: 0.1 });
		const warned = t.targetX;
		play(w, 0.15, { p1: { move: -1 } });
		const vx = t.vx;
		play(w, 0.3, { p1: { move: 1 } });
		assert.equal(t.targetX, warned);
		assert.equal(t.vx, vx);
		assert.ok(t.committed);
	});
	test("airborne rollers are interceptable, grounded rollers are not", () => {
		const w = bare();
		w.players[0].x = 150;
		const t = spawnThreat(w, "roller", { x: 150, y: 150, warning: 0 });
		assert.ok(t);
		w.shots = [{ id: 9999, owner: "p1", x: 150, y: 165, py: 165 }];
		stepWorld(w, {}, 0.02);
		assert.equal(w.stats.intercepts, 1);
		const g = spawnThreat({ ...w, lastRoller: -100 }, "roller", {
			x: 150,
			y: 240,
			warning: 0,
			grounded: true,
			life: 2,
			left: 40,
			right: 250,
			dir: 1,
		});
		assert.ok(g);
		w.threats = [g];
		w.players[0].x = -200;
		w.shots = [{ id: 9998, owner: "p1", x: 150, y: 245, py: 245 }];
		stepWorld(w, {}, 0.02);
		assert.equal(w.stats.intercepts, 1);
		assert.ok(w.threats.some((x) => x.id === g.id));
	});
	test("roller sweep has reachable exit and finite expiry without brake", () => {
		for (const x of [-440, -260, 0, 260, 440]) {
			const w = bare();
			w.players[0].x = x;
			const t = spawnThreat(w, "roller", { y: -120, warning: 0.8 });
			assert.ok(t, `roller at ${x}`);
			assert.ok(t.safeX < t.left - 25 || t.safeX > t.right + 25);
			const time = (240 - t.y) / 145 + t.warning;
			assert.ok(Math.abs(t.safeX - x) < DEFAULT_TUNING.playerSpeed * time);
			play(w, 8, { p1: { targetX: t.safeX } });
			assert.equal(w.stats.hits, 0);
			assert.equal(w.threats.length, 0);
			assert.equal(w.charge, 0);
		}
	});
	test("simultaneous brake requests produce one activation and consume shared meter", () => {
		const w = bare({ players: [{ id: "a" }, { id: "b" }] });
		w.charge = 100;
		stepWorld(w, { a: { brake: true }, b: { brake: true } });
		assert.equal(w.events.filter((e) => e.type === "brake").length, 1);
		assert.equal(w.charge, 0);
		assert.equal(w.stats.brakes, 1);
		w.charge = 100;
		play(w, 3, { a: { brake: true }, b: { brake: true } });
		assert.equal(w.stats.brakes, 1);
		stepWorld(w, { a: { brake: false }, b: { brake: false } });
		stepWorld(w, { a: { brake: true } });
		assert.equal(w.stats.brakes, 2);
	});
	test("brake slows only hostile movement and clocks; no catch-up burst", () => {
		const a = bare(),
			b = bare();
		a.charge = 100;
		spawnThreat(a, "missile", { x: 300, y: 0, warning: 0 });
		spawnThreat(b, "missile", { x: 300, y: 0, warning: 0 });
		stepWorld(a, { p1: { brake: true, move: 1, fire: true } });
		stepWorld(b, { p1: { move: 1, fire: true } });
		assert.equal(a.players[0].x, b.players[0].x);
		assert.equal(a.shots[0].y, b.shots[0].y);
		assert.ok(Math.abs(a.threats[0].y / b.threats[0].y - 0.35) < 0.00001);
		a.fireClock = 0.1;
		play(a, 1.7);
		assert.equal(a.brake, 0);
		assert.ok(a.threats.length <= 2);
	});
	test("wave clear dissolves all ordnance and transitions promptly", () => {
		const w = bare();
		spawnThreat(w, "mine");
		w.shots.push({ id: 9999, owner: "p1", x: 300, y: 0, py: 0 });
		w.enemies = [];
		stepWorld(w);
		assert.equal(w.phase, "intermission");
		assert.equal(w.threats.length, 0);
		assert.equal(w.shots.length, 0);
		play(w, 3.3);
		assert.equal(w.phase, "playing");
		assert.equal(w.wave, 1);
	});
	test("same seed and actions produce identical canonical state", () => {
		const a = createWorld({ seed: 123 }),
			b = createWorld({ seed: 123 });
		for (let i = 0; i < 4000; i++) {
			const actions = {
				p1: {
					move: Math.sin(i * 0.003),
					fire: i % 3 !== 0,
					brake: i % 500 === 0,
				},
			};
			stepWorld(a, actions);
			stepWorld(b, actions);
		}
		assert.deepEqual(a, b);
		const c = {};
		applySnapshot(c, getSnapshot(a));
		assert.deepEqual(c, a);
	});
	test("dev jump/refill marks run and reset copies immutable defaults", () => {
		const w = createWorld();
		jumpEncounter(w, 8, 2);
		assert.equal(w.modified, true);
		assert.equal(w.phase, "finale");
		assert.equal(w.bossPhase, 2);
		w.tuning.playerSpeed = 600;
		resetTuning(w);
		assert.equal(w.tuning.playerSpeed, DEFAULT_TUNING.playerSpeed);
		refillWorld(w);
		assert.equal(w.charge, 100);
		assert.equal(w.players[0].hp, 3);
		const inherited = createWorld({ tuning: { playerSpeed: 600 } });
		assert.equal(inherited.modified, true);
	});
	test("legitimate full campaign seed 1982 covers every encounter and ends once", () => {
		const w = createWorld({ seed: 1982 });
		while (w.time < 1400 && w.phase !== "results")
			stepWorld(w, { p1: autoPilot(w, "p1") });
		assert.equal(w.outcome, "victory");
		assert.equal(w.stats.waveClears, 8);
		assert.equal(w.stats.bossPhases, 3);
		assert.equal(w.stats.visited.length, 11);
		assert.deepEqual(
			new Set(w.stats.threatsSeen),
			new Set(["missile", "mine", "roller", "hunter"]),
		);
		assert.ok(w.stats.intercepts > 20);
		assert.ok(w.stats.brakes > 0);
		assert.ok(w.score > 1200);
		assert.equal(w.modified, false);
		assert.equal(w.invulnerable, undefined);
		assert.equal(w.demo, false);
		assert.equal(w.threats.length, 0);
		assert.equal(w.enemies.length, 0);
		assert.equal(w.players[0].hp > 0, true);
	});
	test("four-player campaign uses same rules and reaches one shared victory", () => {
		const w = createWorld({
			seed: 77,
			players: ["a", "b", "c", "d"].map((id) => ({ id })),
		});
		while (w.time < 1400 && w.phase !== "results")
			stepWorld(
				w,
				Object.fromEntries(w.players.map((p) => [p.id, autoPilot(w, p.id)])),
			);
		assert.equal(w.outcome, "victory");
		assert.equal(w.stats.waveClears, 8);
		assert.equal(w.stats.bossPhases, 3);
		assert.equal(w.stats.visited.length, 11);
		assert.equal(w.modified, false);
		assert.ok(w.players.some((p) => p.hp > 0));
	});
	return { count, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const result = runStateTests();
	for (const failure of result.failures) console.error(failure);
	console.log(
		`${result.count - result.failures.length}/${result.count} state checks passed`,
	);
	process.exitCode = result.failures.length ? 1 : 0;
}
