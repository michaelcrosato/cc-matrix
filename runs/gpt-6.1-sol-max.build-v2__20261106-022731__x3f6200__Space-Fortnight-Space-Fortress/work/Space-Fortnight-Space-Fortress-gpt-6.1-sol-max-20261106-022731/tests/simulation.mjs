import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { loadSim } from "../tools/sim-loader.mjs";
const S = loadSim();
vm.runInThisContext(
	readFileSync(new URL("../src/online.js", import.meta.url), "utf8"),
	{ filename: "online-packet-contract" },
);
const results = [];
function check(name, fn) {
	try {
		fn();
		results.push({ name, pass: true });
	} catch (e) {
		results.push({ name, pass: false, error: e.stack });
	}
}
function step(w, n, bot = false, choice = 0, inspect) {
	for (let i = 0; i < n && !w.s.result; i++) {
		if (bot)
			for (const p of w.s.players) {
				w.setIntent(p.id, S.botIntent(w, p.id, p.seq + 1));
				if (w.s.phase === "upgrade") w.upgrade(p.id, choice);
			}
		w.step();
		if (inspect && i % 12 === 0) inspect(w);
	}
}
function playing(options = {}) {
	const w = new S.World(options);
	w.s.phase = "play";
	return w;
}
function fullRun(n, choice, seed = 198113) {
	const w = new S.World({
		seed,
		players: Array.from({ length: n }, (_, id) => ({ id, name: "BOT " + id })),
	});
	let inspect;
	if (n === 4) {
		const wire = Object.create(S.Online.prototype);
		Object.assign(wire, {
			app: { world: w },
			lastShot: 0,
			maxRoutineBytes: 0,
			lastFull: 0,
		});
		w.packetStats = {
			routineMax: 0,
			completeMax: 0,
			reliableMax: 0,
			chunksMax: 0,
		};
		inspect = (world) => {
			wire.routine();
			w.packetStats.routineMax = wire.maxRoutineBytes;
			const text = S.encodeWorld(world.s),
				chunks = Math.ceil(text.length / 4000);
			w.packetStats.completeMax = Math.max(
				w.packetStats.completeMax,
				new TextEncoder().encode(text).length,
			);
			w.packetStats.chunksMax = Math.max(w.packetStats.chunksMax, chunks);
			for (let i = 0; i < chunks; i++)
				w.packetStats.reliableMax = Math.max(
					w.packetStats.reliableMax,
					new TextEncoder().encode(
						JSON.stringify({
							t: "k",
							e: 1,
							id: 1,
							n: chunks,
							i,
							v: text.slice(i * 4000, (i + 1) * 4000),
						}),
					).length,
				);
		};
	}
	step(w, 100000, true, choice, inspect);
	return w;
}
check("authored data validates and missing definitions are rejected", () => {
	assert.deepEqual(S.validateWaves(), []);
	const bad = structuredClone(S.WAVES);
	bad[0].groups[0].kind = "absent";
	assert(S.validateWaves(bad).length > 0);
	const extra = structuredClone(S.WAVES[0]);
	extra.title = "ADDED DATA BEAT";
	extra.groups[0].at = 4;
	assert.deepEqual(S.validateWaves([extra]), []);
});
for (const [n, choice] of [
	[1, 0],
	[1, 1],
	[1, 2],
	[2, 1],
	[4, 2],
])
	check(
		`${n}-pilot no-cheat complete victory with upgrade branch ${choice}`,
		() => {
			const w = fullRun(n, choice);
			assert(w.s.result?.won, JSON.stringify(w.s.result));
			assert.equal(w.s.modified, false);
			assert.equal(w.s.options.god, false);
			assert.equal(w.s.upgrades, 2);
			assert.deepEqual(new Set(w.s.seen), new Set(Object.keys(S.ENEMIES)));
			assert.deepEqual(w.s.bossPhases, [0, 1, 2]);
			assert(
				w.s.activeTime >= 590 && w.s.activeTime < 760,
				`Active time ${w.s.activeTime}`,
			);
			assert(w.s.base > 0);
			assert.equal(w.s.outcomes.length, 3);
			assert(w.s.score > 14000);
			if (n === 4) {
				assert(w.packetStats.routineMax <= 1200);
				assert(w.packetStats.reliableMax < 16384);
				assert(w.packetStats.chunksMax <= 12);
				writeFileSync(
					new URL("../evidence/packet-budget.json", import.meta.url),
					JSON.stringify(w.packetStats, null, 2) + "\n",
				);
			}
			for (const p of w.s.players)
				assert.equal(p.upgrades[S.UPGRADES[choice].id], 2);
		},
	);
check("an unattended wing retreats twice and reaches real defeat", () => {
	const w = new S.World({ seed: 23 });
	step(w, 110000);
	assert.equal(w.s.result?.won, false);
	assert.equal(w.s.act, 2);
	assert(w.s.outcomes.length >= 2);
	assert(w.s.base <= 0 || w.s.players.every((p) => p.hp <= 0));
});
check("same seed and intent stream produce identical state", () => {
	const a = new S.World({ seed: 616 }),
		b = new S.World({ seed: 616 });
	step(a, 11000, true);
	step(b, 11000, true);
	assert.deepEqual(a.snapshot(), b.snapshot());
});
check(
	"complete snapshot restores deterministic continuation and clears old inputs",
	() => {
		const a = new S.World({ seed: 71 });
		step(a, 4500, true);
		const b = new S.World();
		b.restore(a.snapshot());
		assert.equal(b.intents.size, 0);
		step(a, 4000, true);
		step(b, 4000, true);
		assert.deepEqual(a.snapshot(), b.snapshot());
	},
);
check("empty boost leaves thrust and laser functional", () => {
	const w = playing();
	const p = w.s.players[0];
	p.energy = 0;
	p.inv = 0;
	w.setIntent(0, {
		seq: 1,
		mx: 1,
		my: 0,
		ax: 0,
		ay: -1,
		fire: true,
		boost: true,
		pulse: false,
	});
	step(w, 25);
	assert(p.x > 360);
	assert(w.s.shots.some((b) => !b.foe));
	assert.equal(p.boost, 0);
	assert(p.energy >= 0);
});
check(
	"pulse clears only local hostile projectiles and breaks a tractor",
	() => {
		const w = playing(),
			p = w.s.players[0];
		w.shot(p.x + 40, p.y, 0, 0, true);
		w.shot(p.x + 210, p.y, 0, 0, true);
		w.shot(p.x + 30, p.y, 0, 0, false);
		const e = w.spawn("tractor", p.x + 90, p.y, {
			tele: 0,
			wind: 2,
			target: 0,
			lock: 1,
		});
		w.pulsePlayer(p);
		assert.equal(w.s.shots.filter((b) => b.foe).length, 1);
		assert.equal(w.s.shots.filter((b) => !b.foe).length, 1);
		assert.equal(e.target, -1);
		assert.equal(e.lock, -1);
		assert(e.cool >= 3);
	},
);
check(
	"radiators require a quiet interval and unlocked sections cool proportionally",
	() => {
		const w = playing();
		w.s.act = 1;
		w.s.heat = 50;
		w.s.lastObjectiveHit = w.s.t;
		step(w, 240);
		assert.equal(w.s.heat, 50);
		w.s.lastObjectiveHit = -10;
		w.s.locks = [true, true, true, true];
		w.step();
		assert.equal(w.s.heat, 50);
		w.s.locks = [false, false, false, false];
		w.step();
		assert(w.s.heat < 50);
		w.objectiveHit();
		assert(w.s.heat > 50);
	},
);
check("solo wipe consumes first two layers and loses on the ground", () => {
	const w = playing();
	w.s.players[0].hp = 0;
	w.step();
	assert.equal(w.s.phase, "retreat");
	assert.equal(w.s.outcomes[0].held, false);
	step(w, 2000);
	assert.equal(w.s.act, 1);
	assert(w.s.players[0].hp > 0);
	w.s.phase = "play";
	w.s.heat = 100;
	w.step();
	assert.equal(w.s.phase, "retreat");
	assert.equal(w.s.outcomes[1].reason, "HEAT OVERFLOW");
	step(w, 2000);
	assert.equal(w.s.act, 2);
	assert.equal(w.s.base, 76);
	w.s.phase = "play";
	w.s.players[0].hp = 0;
	w.step();
	assert.equal(w.s.result.won, false);
});
check(
	"co-op redeploy has invulnerability and a complete wipe ignores pending respawns",
	() => {
		const w = playing({
				players: [
					{ id: 0, name: "a" },
					{ id: 1, name: "b" },
				],
			}),
			p = w.s.players[0];
		p.inv = 0;
		p.hp = 1;
		w.damagePlayer(p);
		assert.equal(p.hp, 0);
		step(w, 361);
		assert(p.hp > 0);
		assert(p.inv > 2.9);
		const hp = p.hp;
		w.damagePlayer(p);
		assert.equal(p.hp, hp);
		for (const q of w.s.players) q.hp = 0;
		w.step();
		assert.equal(w.s.phase, "retreat");
	},
);
check("simultaneous final kill and base loss resolves only defeat", () => {
	const w = playing();
	w.jump(2, 2, 2);
	w.s.base = 0;
	w.s.boss.dead = true;
	w.resolve();
	assert.equal(w.s.result.won, false);
	assert.equal(w.s.events.filter((e) => e.type === "victory").length, 0);
	const score = w.s.score;
	w.finish(true, "late");
	assert.equal(w.s.result.won, false);
	assert.equal(w.s.score, score);
});
check("damage is blocked exactly while invulnerability is positive", () => {
	const w = playing(),
		p = w.s.players[0];
	p.inv = S.DT;
	const hp = p.hp;
	assert.equal(w.damagePlayer(p), false);
	w.step();
	assert.equal(p.inv, 0);
	assert(w.damagePlayer(p));
	assert.equal(p.hp, hp - 1);
});
check(
	"swept laser collision cannot tunnel and a near miss stays a miss",
	() => {
		const w = playing(),
			e = w.spawn("anchor", 500, 250, { tele: 0, charge: 10 });
		w.shot(100, 250, 0, 100000, false, 0, { dmg: 100 });
		w.stepShots(S.DT);
		assert.equal(e.hp, 0);
		const score = w.s.score;
		w.kill(e);
		assert.equal(w.s.score, score);
		const other = w.spawn("anchor", 500, 350, { tele: 0, charge: 10 });
		w.shot(100, 320, 0, 100000, false, 0, { dmg: 100 });
		w.stepShots(S.DT);
		assert.equal(other.hp, other.maxHp);
	},
);
check("shared pickups apply once and benefit every living pilot", () => {
	const w = playing({
		players: [
			{ id: 0, name: "a" },
			{ id: 1, name: "b" },
		],
	});
	for (const p of w.s.players) {
		p.hp = 2;
		p.energy = 0;
	}
	const p = w.s.players[0];
	w.s.drops.push({ id: 45, x: p.x, y: p.y, t: 0, life: 12, charge: true });
	w.stepDrops(S.DT);
	const score = w.s.score;
	assert(w.s.players.every((p) => p.hp === 3 && p.energy === 55));
	w.stepDrops(S.DT);
	assert.equal(w.s.score, score);
});
check("charged anchor pull is bounded and boost can escape", () => {
	const w = playing(),
		p = w.s.players[0];
	p.x = 440;
	p.y = 300;
	w.spawn("anchor", 500, 300, { tele: 0, charge: 0, cool: 30 });
	p.inv = 0;
	const before = p.x;
	step(w, 30);
	assert(p.x > before);
	const distance = S.dist(p, { x: 500, y: 300 });
	for (let i = 0; i < 90; i++) {
		w.setIntent(0, {
			seq: i + 1,
			mx: -1,
			my: 0,
			ax: -1,
			ay: 0,
			fire: false,
			boost: true,
			pulse: false,
		});
		w.step();
	}
	assert(S.dist(p, { x: 500, y: 300 }) > distance + 80);
});
check("bad or stale intents are rejected; old held fire expires", () => {
	const w = playing();
	assert(!w.setIntent(9, S.neutral(1)));
	assert(!w.setIntent(0, { ...S.neutral(1), mx: NaN }));
	assert(!w.setIntent(0, { ...S.neutral(1), mx: 1, my: 1 }));
	assert(w.setIntent(0, { ...S.neutral(5), fire: true }));
	assert(!w.setIntent(0, S.neutral(5)));
	step(w, 61);
	const fired = w.s.events.filter((e) => e.type === "shot").length;
	step(w, 80);
	assert.equal(w.s.events.filter((e) => e.type === "shot").length, fired);
});
check(
	"transition cleanup, finite tuning and restart produce clean state",
	() => {
		const w = playing();
		w.spawn("hunter", 400, 120);
		w.shot(1, 1, 0, 10, true);
		w.retreat(false, "test");
		assert.equal(w.s.enemies.length, 0);
		assert.equal(w.s.shots.length, 0);
		assert.equal(w.intents.size, 0);
		assert(!w.balance("gravity", Infinity));
		w.balance("gravity", 90000);
		assert.equal(w.s.balance.gravity, 420);
		assert(w.s.modified);
		w.resetBalance();
		assert.deepEqual(w.s.balance, S.DEFAULTS);
		const fresh = new S.World();
		assert(!fresh.s.modified);
		assert.equal(fresh.s.tick, 0);
		assert.equal(fresh.s.enemies.length, 0);
	},
);
check("ground aim stays in the legal upper arc", () => {
	for (const a of [-Math.PI, -1.5, -0.01, 0, 0.2, 1.5, 3]) {
		const q = S.groundAim(a);
		assert(q <= -0.15 && q >= -Math.PI + 0.15);
	}
});
check("native renderer and alternate draw rates cannot change gameplay", () => {
	vm.runInThisContext(
		readFileSync(
			new URL("../vendor/engine/my-3d2dge.js", import.meta.url),
			"utf8",
		),
		{ filename: "engine" },
	);
	for (const file of ["render/assets", "render/scene"])
		vm.runInThisContext(
			readFileSync(new URL("../src/" + file + ".js", import.meta.url), "utf8"),
			{ filename: file },
		);
	const E = globalThis.My3D2dge,
		a = new S.World({ seed: 4 }),
		b = new S.World({ seed: 4 });
	const game = new E.Game({
		headless: true,
		draw: true,
		res: [960, 540],
		expand: false,
		view: "overhead",
		loop: false,
		menu: false,
	});
	const paint = new S.Painter(game);
	game.cam.smooth = 0;
	game.focus(480, 270, 0);
	game.start({
		update() {
			for (const p of a.s.players)
				a.setIntent(p.id, S.botIntent(a, p.id, p.seq + 1));
			a.step();
		},
		draw(r) {
			paint.draw(r, a.s, game.time);
		},
	});
	for (let i = 0; i < 1200; i++) {
		game.advance(S.DT, { draw: i % 4 === 0 });
		for (const p of b.s.players)
			b.setIntent(p.id, S.botIntent(b, p.id, p.seq + 1));
		b.step();
	}
	assert.deepEqual(game.errors, []);
	assert.deepEqual(a.snapshot(), b.snapshot());
	game.dispose();
});
check(
	"a newly authored data-only encounter runs and then advances to the boss",
	() => {
		const extra = {
			act: 2,
			title: "RESERVE WING",
			min: 1,
			deadline: 2,
			goal: 1,
			radio: "Reserve wing arriving.",
			lesson: "Clear the reserve.",
			groups: [
				{ at: 0.1, kind: "hunter", count: 1, side: "top", pattern: "fan" },
			],
		};
		S.WAVES.push(extra);
		try {
			assert.deepEqual(S.validateWaves(), []);
			const w = playing({ demo: true });
			w.jump(2, 3);
			assert.equal(S.WAVES[w.s.wave].title, "RESERVE WING");
			step(w, 260, true);
			assert(w.s.boss);
			assert.equal(w.s.wave, S.WAVES.length);
		} finally {
			S.WAVES.pop();
		}
	},
);
check(
	"entry telegraphs stay clear of every co-op pilot and anchors stay outside fortress armor",
	() => {
		const w = playing({
			players: Array.from({ length: 4 }, (_, id) => ({
				id,
				name: "WING" + id,
			})),
		});
		w.spawnGroup({ kind: "rammer", count: 5, side: "bottom", pattern: "fan" });
		for (const e of w.s.enemies) {
			assert(e.tele > 0);
			assert(w.s.players.every((p) => S.dist(p, e) >= 110));
		}
		w.s.act = 1;
		const anchor = w.spawn("anchor", 485, 280);
		assert(Math.hypot(anchor.x - 480, anchor.y - 277) >= 111.9);
	},
);
export const simulationResults = results;
if (process.argv[1]?.endsWith("simulation.mjs"))
	console.log(JSON.stringify(results));
