import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dir = fileURLToPath(new URL("../", import.meta.url));
for (const f of [
	"src/config.js",
	"src/content/campaign.js",
	"src/sim/geometry.js",
	"src/sim/simulation.js",
	"src/sim/director.js",
])
	vm.runInThisContext(fs.readFileSync(dir + f, "utf8"), { filename: f });
const { Simulation } = DTSim,
	C = DTContent,
	M = DTGeometry,
	T = 16;
const fresh = (cave = "chalk", players = [1]) => {
	const sim = new Simulation({ players });
	sim.enterCave(cave);
	return sim;
};
const advance = (sim, seconds, command = null) => {
	for (let n = 0; n < Math.ceil(seconds * 120); n++) {
		if (command) sim.submit(command.id || 1, command.cmd || command);
		sim.step(1 / 120);
	}
};
const fire = (sim, id = 1, ax = 1, ay = 0) => {
	const p = sim.state.players.find((p) => p.id === id);
	sim.submit(id, {
		mx: 0,
		my: 0,
		ax,
		ay,
		actions: [{ id: p.lastAction + 1, type: "fire" }],
	});
};
function arrow(sim, e, extra = {}) {
	return {
		id: `fixture-${++sim.ids}`,
		x: e.x - 40,
		y: e.y,
		z: 21.96,
		vx: 265,
		vy: 0,
		life: 1,
		bounces: 0,
		energy: 1,
		owner: 1,
		hit: [],
		origin: { x: e.x - 80, y: e.y },
		lastSafe: { x: e.x - 40, y: e.y },
		...extra,
	};
}
export function runSimulationTests() {
	const results = [],
		failures = [];
	let fullPlay;
	const test = (name, fn) => {
		try {
			fn();
			results.push({ name, pass: true });
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
			results.push({ name, pass: false, error: error.stack });
		}
	};
	test("all authored content validates", () =>
		assert.deepEqual(C.validate(), []));
	test("27 chambers each have a purposeful encounter or reveal", () =>
		assert.equal(
			Object.values(C.caves).reduce((n, c) => n + c.rooms.length, 0),
			27,
		));
	test("tool chain never depends on its own reward", () => {
		const states = [
			{},
			{ axe: true },
			{ axe: true, boat: true },
			{ axe: true, boat: true, key: true },
		];
		const expected = [
			["chalk", "spring"],
			["root", "lookout"],
			["tide"],
			["summit"],
		];
		states.forEach((tools, index) => {
			const seen = new Set(["camp"]);
			for (let p = 0; p < 12; p++)
				for (const e of C.edges)
					if (!e.requires || tools[e.requires]) {
						if (seen.has(e.from)) seen.add(e.to);
						if (seen.has(e.to)) seen.add(e.from);
					}
			for (const node of expected[index])
				assert.ok(seen.has(node), `${index} missing ${node}`);
			if (index < 3)
				assert.ok(
					!seen.has(index === 0 ? "root" : index === 1 ? "tide" : "summit"),
				);
		});
	});
	test("each section has damage-budget supply margin", () => {
		for (const c of Object.values(C.caves)) {
			const damage = c.enemies.reduce(
				(n, e) =>
					n +
					(["ooze", "target"].includes(e.kind) ? 0 : C.creatures[e.kind].hp),
				0,
			);
			const arrows = c.pickups
				.filter((p) => p.kind === "arrows")
				.reduce((n, p) => n + p.count, 0);
			assert.ok(arrows >= damage + 3, c.id);
		}
	});
	test("rime checkpoint has reachable free supplies with empty quiver", () => {
		const sim = fresh("rime");
		sim.state.quiver = 0;
		const p = sim.state.players[0],
			pile = sim.state.pickups.find((p) => p.id === "rime-entry-quiver");
		assert.ok(sim.path(p, pile).length);
		assert.equal(pile.guard, undefined);
		assert.ok(pile.count >= 3);
	});
	test("swept thin wall collision gives earliest normal", () => {
		const hit = M.segmentBox(0, 0, 1000, 0, 50, -2, 51, 2);
		assert.equal(hit.t, 0.05);
		assert.equal(hit.nx, -1);
		assert.equal(hit.ny, 0);
	});
	test("diagonal reflection preserves speed and turns direction", () => {
		const n = 1 / Math.sqrt(2),
			v = M.reflect(200, 0, -n, n);
		assert.ok(Math.abs(v[0]) < 1e-9);
		assert.ok(Math.abs(v[1] - 200) < 1e-9);
	});
	test("bank sweep catches diagonal segment and endpoints", () => {
		const b = { id: "b", a: [50, 0], b: [100, 50] };
		assert.ok(M.segmentBank(0, 10, 100, 0, b, 1));
		assert.ok(M.segmentBank(49, -20, 0, 40, b, 1));
	});
	test("high-speed arrow cannot tunnel through enemy", () => {
		const sim = fresh(),
			e = sim.state.enemies[0];
		sim.state.arrows = [arrow(sim, e, { vx: 20000 })];
		sim.stepArrows(0.01);
		assert.equal(e.hp, 0);
		assert.equal(sim.state.stats.hits, 1);
		assert.equal(sim.state.arrows.length, 0);
	});
	test("one arrow wounds a target at most once", () => {
		const sim = fresh(),
			e = sim.state.enemies[1],
			a = arrow(sim, e);
		sim.hitEnemy(a, e);
		sim.hitEnemy(a, e);
		assert.equal(e.hp, 1);
		assert.equal(sim.state.stats.hits, 1);
	});
	test("one-shot command retransmission spends one shaft", () => {
		const sim = fresh(),
			p = sim.state.players[0];
		sim.submit(1, { ax: 1, ay: 0, actions: [{ id: 1, type: "fire" }] });
		sim.submit(1, { ax: 1, ay: 0, actions: [{ id: 1, type: "fire" }] });
		advance(sim, 0.3);
		assert.equal(sim.state.quiver, 2);
		assert.equal(sim.state.stats.shots, 1);
		assert.equal(p.lastAction, 1);
	});
	test("holding a direction does not repeat a shot", () => {
		const sim = fresh();
		fire(sim);
		advance(sim, 1.1, { mx: 1, my: 0, ax: 1, ay: 0, actions: [] });
		assert.equal(sim.state.stats.shots, 1);
	});
	test("miss expires into a recoverable stable-ID shaft", () => {
		const sim = fresh();
		fire(sim);
		advance(sim, 1.6);
		assert.ok(
			sim.state.pickups.some(
				(p) => p.recovered && p.id.startsWith("recover-arrow-"),
			),
		);
	});
	test("inaccessible landing relocates to validated floor", () => {
		const sim = fresh(),
			a = {
				id: "fixture-wall",
				owner: 1,
				x: 0,
				y: 0,
				lastSafe: { x: 0, y: 0 },
				origin: { x: 88, y: 440 },
			};
		sim.settle(a);
		const p = sim.state.pickups.find((p) => p.id === "recover-fixture-wall");
		assert.ok(p);
		assert.ok(sim.clearAt(p.x, p.y, 5));
	});
	test("reflection contact loop remains finite at a corner", () => {
		const sim = fresh(),
			p = sim.state.players[0];
		sim.state.arrows = [
			{
				id: "corner",
				owner: 1,
				x: 32.01,
				y: 352.01,
				z: 22,
				vx: -1000,
				vy: -1000,
				life: 0.5,
				bounces: 0,
				energy: 1,
				hit: [],
				origin: { x: p.x, y: p.y },
				lastSafe: { x: p.x, y: p.y },
			},
		];
		sim.stepArrows(0.05);
		assert.ok(sim.state.stats.banks <= 3);
		assert.ok(
			sim.state.arrows.length === 0 || Number.isFinite(sim.state.arrows[0].x),
		);
	});
	test("post-bank self-hit wounds the shooter once", () => {
		const sim = fresh(),
			p = sim.state.players[0];
		p.invuln = 0;
		sim.state.arrows = [
			{
				id: "self",
				owner: 1,
				x: p.x - 25,
				y: p.y,
				z: 22,
				vx: 1000,
				vy: 0,
				life: 1,
				bounces: 1,
				energy: 1,
				hit: [],
				origin: { x: p.x, y: p.y },
				lastSafe: { x: p.x, y: p.y },
			},
		];
		sim.stepArrows(0.05);
		assert.equal(p.hp, 2);
		assert.equal(sim.state.arrows.length, 0);
	});
	test("ordinary partner arrows do not cause friendly fire", () => {
		const sim = fresh("chalk", [1, 2]),
			p = sim.state.players[1];
		p.invuln = 0;
		sim.state.arrows = [
			{
				id: "partner",
				owner: 1,
				x: p.x - 25,
				y: p.y,
				z: 22,
				vx: 1000,
				vy: 0,
				life: 1,
				bounces: 1,
				energy: 1,
				hit: [],
				origin: { x: p.x, y: p.y },
				lastSafe: { x: p.x, y: p.y },
			},
		];
		sim.stepArrows(0.05);
		assert.equal(p.hp, 3);
	});
	test("supply overflow remains on the floor", () => {
		const sim = fresh(),
			p = sim.state.players[0],
			pile = sim.state.pickups[0];
		p.x = pile.x;
		p.y = pile.y;
		sim.state.quiver = 11;
		sim.interact(p);
		assert.equal(sim.state.quiver, 12);
		assert.equal(pile.count, 6);
	});
	test("simultaneous contested pickups credit once", () => {
		const sim = fresh("chalk", [1, 2]),
			pile = sim.state.pickups[0];
		sim.state.quiver = 0;
		sim.state.players.forEach((p) => {
			p.x = pile.x;
			p.y = pile.y;
			sim.interact(p);
		});
		assert.equal(sim.state.quiver, 7);
		assert.ok(!sim.state.pickups.includes(pile));
	});
	test("empty quiver fire gives dry response without a debit", () => {
		const sim = fresh();
		sim.state.quiver = 0;
		fire(sim);
		advance(sim, 0.3);
		assert.equal(sim.state.stats.shots, 0);
		assert.ok(sim.state.events.some((e) => e.type === "dry-fire"));
	});
	test("damage immunity prevents repeated attack contacts", () => {
		const sim = fresh(),
			p = sim.state.players[0];
		p.invuln = 0;
		assert.ok(sim.damage(p));
		assert.ok(!sim.damage(p));
		assert.equal(p.hp, 2);
	});
	test("one attack records only one wound per player", () => {
		const sim = fresh(),
			p = sim.state.players[0],
			e = sim.state.enemies[1];
		p.x = e.x;
		p.y = e.y;
		p.invuln = 0;
		e.state = "attack";
		e.timer = 0.4;
		e.attackDir = 0;
		e.hitPlayers = [];
		for (let n = 0; n < 30; n++) sim.updateEnemies(1 / 120);
		assert.equal(p.hp, 2);
		assert.equal(e.hitPlayers.length, 1);
	});
	test("solo death restores complete checkpoint and spends one persistent reserve", () => {
		const sim = fresh(),
			p = sim.state.players[0];
		sim.state.quiver = 0;
		sim.state.enemies[0].hp = 0;
		p.invuln = 0;
		sim.damage(p, 3);
		sim.deathRecovery();
		assert.equal(sim.state.reserves, 2);
		assert.equal(sim.state.quiver, 3);
		assert.equal(sim.state.enemies[0].hp, 1);
		assert.equal(sim.state.stats.deaths, 1);
		const loaded = new Simulation();
		loaded.load(sim.save());
		assert.equal(loaded.state.reserves, 2);
	});
	test("voluntary restart rolls back section and preserves spent reserves", () => {
		const sim = fresh();
		sim.state.reserves = 1;
		sim.state.quiver = 0;
		sim.state.enemies[0].hp = 0;
		sim.state.pickups[0].count = 0;
		sim.restart();
		assert.equal(sim.state.reserves, 1);
		assert.equal(sim.state.quiver, 3);
		assert.equal(sim.state.enemies[0].hp, 1);
		assert.equal(sim.state.pickups[0].count, 7);
		assert.equal(sim.state.stats.restarts, 1);
	});
	test("simultaneous two-ranger wipe costs exactly one reserve", () => {
		const sim = fresh("chalk", [1, 2]);
		sim.state.players.forEach((p) => {
			p.invuln = 0;
			sim.damage(p, 3);
		});
		sim.deathRecovery();
		assert.equal(sim.state.reserves, 2);
		assert.ok(sim.state.players.every((p) => p.hp === 3 && !p.down));
	});
	test("co-op held interaction revives without spending reserve", () => {
		const sim = fresh("chalk", [1, 2]),
			[_a, b] = sim.state.players;
		b.invuln = 0;
		sim.damage(b, 3);
		advance(sim, 1.7, {
			mx: 0,
			my: 0,
			ax: 1,
			ay: 0,
			heldInteract: true,
			actions: [],
		});
		assert.equal(b.down, 0);
		assert.equal(b.hp, 2);
		assert.equal(sim.state.reserves, 3);
		assert.equal(sim.state.stats.revives, 1);
	});
	test("expired revive spends one reserve and uses a safe anchor", () => {
		const sim = fresh("chalk", [1, 2]),
			p = sim.state.players[1];
		p.invuln = 0;
		sim.damage(p, 3);
		advance(sim, 10.2);
		assert.equal(sim.state.reserves, 2);
		assert.equal(p.down, 0);
		assert.equal(p.hp, 3);
		assert.ok(sim.clearAt(p.x, p.y, 5));
	});
	test("zero reserves produces a complete defeat state", () => {
		const sim = fresh();
		sim.state.reserves = 1;
		const p = sim.state.players[0];
		p.invuln = 0;
		sim.damage(p, 3);
		sim.deathRecovery();
		assert.equal(sim.state.phase, "defeat");
		assert.equal(sim.state.outcome, "loss");
	});
	test("learning continuation marks assisted result", () => {
		const sim = fresh();
		sim.state.reserves = 1;
		const p = sim.state.players[0];
		p.invuln = 0;
		sim.damage(p, 3);
		sim.deathRecovery();
		sim.assistedContinue();
		assert.equal(sim.state.phase, "cave");
		assert.equal(sim.state.reserves, 3);
		assert.equal(sim.state.stats.assisted, true);
	});
	test("explored memory does not render an unseen enemy", () => {
		const sim = fresh(),
			e = sim.state.enemies[1];
		const cave = sim.getCave(),
			k = Math.floor(e.y / T) * cave.width + Math.floor(e.x / T);
		sim.state.explored.push(k);
		assert.ok(!sim.isVisible(e.x, e.y));
	});
	test("arrow scouting is temporary and does not permanently explore", () => {
		const sim = fresh(),
			e = sim.state.enemies[1],
			old = new Set(sim.state.explored);
		sim.state.arrows = [arrow(sim, e, { x: e.x, y: e.y })];
		sim.updateVisibility();
		assert.ok(sim.isVisible(e.x, e.y));
		assert.deepEqual(new Set(sim.state.explored), old);
		sim.state.arrows = [];
		sim.updateVisibility();
		assert.ok(!sim.isVisible(e.x, e.y));
	});
	test("wall-occluded acoustic route is longer than straight-line distance", () => {
		const sim = fresh(),
			a = { x: 664, y: 440 },
			b = { x: 920, y: 200 };
		assert.ok(sim.acoustic(a, b, 1000) > Math.hypot(a.x - b.x, a.y - b.y));
	});
	test("strong local sound wakes a listener toward its origin", () => {
		const sim = fresh("tide"),
			ooze = sim.state.enemies[0],
			origin = { x: ooze.x - 60, y: ooze.y };
		sim.noise("bank", origin.x, origin.y, 2, 1);
		sim.updateEnemies(0.01);
		assert.equal(ooze.state, "investigate");
		assert.deepEqual(ooze.target, origin);
	});
	test("held-state timeout releases a disconnected input", () => {
		const sim = fresh();
		sim.submit(1, { mx: 1, my: 0, ax: 1, ay: 0, actions: [] });
		advance(sim, 1);
		assert.equal(sim.state.players[0].vx, 0);
	});
	test("live join enforces two seats and spawn protection", () => {
		const sim = fresh();
		assert.ok(sim.join(2));
		assert.ok(!sim.join(3));
		assert.equal(sim.state.players.length, 2);
		assert.ok(sim.state.players[1].invuln >= 3);
		assert.ok(sim.clearAt(sim.state.players[1].x, sim.state.players[1].y, 5));
	});
	test("guest departure removes avatar and pending held input", () => {
		const sim = fresh("chalk", [1, 2]);
		sim.submit(2, { mx: 1, my: 0, actions: [] });
		assert.ok(sim.leave(2));
		assert.equal(sim.state.players.length, 1);
		assert.ok(!sim.commands.has("2"));
	});
	test("travel requires physical terrain tool and adjacency", () => {
		const sim = new Simulation();
		assert.ok(!sim.travel(1, "summit"));
		sim.state.node = "chalk";
		assert.ok(!sim.travel(1, "forest"));
		sim.state.tools.axe = true;
		assert.ok(sim.travel(1, "forest"));
	});
	test("ladder refuses to abandon its required progression tool", () => {
		const sim = fresh(),
			p = sim.state.players[0],
			c = sim.getCave();
		p.x = c.exit.x;
		p.y = c.exit.y;
		for (const e of sim.state.enemies) e.hp = 0;
		assert.ok(!sim.exitCave());
		assert.equal(sim.state.phase, "cave");
	});
	test("direct gong hit never opens mandatory bank bridge", () => {
		const sim = fresh("root"),
			e = sim.state.enemies[0];
		sim.hitEnemy(arrow(sim, e), e);
		assert.equal(e.hp, 1);
		assert.ok(!sim.state.flags.bankLesson);
	});
	test("banked gong hit opens the actual blocked path", () => {
		const sim = fresh("root"),
			e = sim.state.enemies[0];
		assert.ok(sim.wall(40, 21));
		sim.hitEnemy(arrow(sim, e, { bounces: 1 }), e);
		assert.ok(sim.state.flags.bankLesson);
		assert.ok(!sim.wall(40, 21));
	});
	test("authored pale-notch shot opens gong through ordinary physical reflection", () => {
		const sim = fresh("root"),
			launch = sim.getCave().bankLaunch,
			p = sim.state.players[0];
		assert.ok(launch && sim.clearAt(launch.x, launch.y, 5));
		p.x = launch.x;
		p.y = launch.y;
		fire(sim, 1, launch.ax, launch.ay);
		advance(sim, 0.9);
		assert.ok(sim.state.flags.bankLesson);
		assert.ok(sim.state.stats.banks >= 1);
		assert.equal(sim.state.quiver, 2);
	});
	test("indestructible ooze sheds an accessible recoverable shaft", () => {
		const sim = fresh("tide"),
			e = sim.state.enemies[0];
		sim.hitEnemy(arrow(sim, e), e);
		assert.equal(e.hp, 999);
		assert.ok(sim.state.pickups.some((p) => p.recovered));
	});
	test("first guardian armor deflects frontal shots and accepts flank", () => {
		const sim = fresh("ember"),
			e = sim.state.enemies.find((e) => e.kind === "guardian1");
		e.aim = Math.PI;
		sim.hitEnemy(arrow(sim, e), e);
		assert.equal(e.hp, 3);
		sim.hitEnemy(arrow(sim, e, { id: "flank", vx: 0, vy: 265 }), e);
		assert.equal(e.hp, 2);
		assert.equal(e.mustSwoop, true);
	});
	test("second guardian requires recovery and one wound per cycle", () => {
		const sim = fresh("rime"),
			e = sim.state.enemies.find((e) => e.kind === "guardian2");
		sim.hitEnemy(arrow(sim, e), e);
		assert.equal(e.hp, 3);
		e.state = "recover";
		sim.hitEnemy(arrow(sim, e, { id: "valid" }), e);
		assert.equal(e.hp, 2);
		sim.hitEnemy(arrow(sim, e, { id: "duplicate-window" }), e);
		assert.equal(e.hp, 2);
	});
	test("thin-bank navigation validates fractional start, goal and cached edges", () => {
		const sim = fresh("root");
		sim.state.flags.bankLesson = true;
		const a = { x: 386.9249438942308, y: 412.15378125453987 },
			b = { x: 633.6334242323502, y: 455.99947607860787 };
		assert.ok(sim.clearAt(a.x, a.y, 5));
		assert.ok(!sim.clearAt(392, 408, 5));
		const validate = (from, to) => {
			const path = sim.path(from, to);
			assert.ok(path.length, "missing route");
			let prev = from;
			for (const p of path) {
				assert.ok(
					sim.moveClear(prev, p, 5),
					`blocked edge ${JSON.stringify(prev)} to ${JSON.stringify(p)}`,
				);
				prev = p;
			}
			assert.ok(Math.hypot(prev.x - to.x, prev.y - to.y) < 0.01);
			return path;
		};
		validate(a, b);
		validate(b, a);
		// Same cell, opposite side: a tile-only cached route must not be reused through the bank.
		const otherSide = { x: 400, y: 402 };
		assert.ok(sim.clearAt(otherSide.x, otherSide.y, 5));
		validate(otherSide, b);
		validate(a, b);
		const creature = { kind: "spider", x: 380, y: 420, aim: 0 };
		for (
			let n = 0;
			n < 1200 && Math.hypot(creature.x - b.x, creature.y - b.y) > 7;
			n++
		) {
			sim.enemyMove(creature, b, 60, 1 / 120);
			assert.ok(sim.clearAt(creature.x, creature.y, 7));
		}
		assert.ok(
			Math.hypot(creature.x - b.x, creature.y - b.y) <= 7,
			"creature stalled against bank",
		);
		sim.state.players[0].x = 370;
		sim.state.players[0].y = 450;
		sim.dev("spawn", "guardian1");
		const spawned = sim.state.enemies.at(-1);
		assert.ok(
			sim.clearAt(spawned.x, spawned.y, C.creatures.guardian1.r),
			"dev spawn ignored creature radius",
		);
	});
	test("supply yield rescales existing authored remainder and preserves missed shafts", () => {
		const sim = fresh(),
			pile = sim.state.pickups[0],
			p = sim.state.players[0];
		sim.state.pickups.push({
			id: "loose-test",
			kind: "arrows",
			x: p.x,
			y: p.y,
			count: 1,
			recovered: true,
		});
		sim.setTunable("supplyYield", 2);
		assert.equal(pile.count, 14);
		assert.equal(sim.state.pickups.at(-1).count, 1);
		p.x = pile.x;
		p.y = pile.y;
		sim.state.quiver = 8;
		sim.interact(p);
		assert.equal(pile.count, 10);
		assert.equal(pile._supplyBase, 5);
		sim.resetTunables();
		assert.equal(pile.count, 5);
		assert.equal(sim.state.pickups.find((x) => x.id === "loose-test").count, 1);
		assert.ok(sim.state.stats.assisted);
	});
	test("new section supplies use live yield and recovered spider shafts are not scaled", () => {
		const sim = fresh();
		sim.setTunable("supplyYield", 2);
		sim.enterCave("root");
		const pile = sim.state.pickups.find((p) => p.id === "root-bank-quiver"),
			stash = sim.state.pickups.find((p) => p.stash);
		assert.equal(pile.count, 16);
		const spider = sim.state.enemies.find((e) => e.kind === "spider");
		sim.state.pickups.push({
			id: "spider-loose-test",
			kind: "arrows",
			x: spider.x,
			y: spider.y,
			count: 1,
			recovered: true,
		});
		sim.updateEnemies(0.01);
		assert.equal(stash._recoveredUnits, 1);
		assert.equal(stash.count, 13);
		sim.setTunable("supplyYield", 0.5);
		assert.equal(stash.count, 4);
		sim.resetTunables();
		assert.equal(stash.count, 7);
		assert.equal(stash._recoveredUnits, 1);
		assert.equal(pile.count, 8);
	});
	test("reset tunables restores all defaults and affects current actors", () => {
		const sim = fresh();
		sim.setTunable("moveSpeed", 100);
		assert.equal(sim.tunables.moveSpeed, 100);
		sim.submit(1, { mx: 1, my: 0, actions: [] });
		sim.step(1 / 120);
		assert.equal(sim.state.players[0].vx, 100);
		sim.resetTunables();
		assert.deepEqual(sim.tunables, DTConfig.defaults);
	});
	test("Hub exposes diagnostics without mutable cheats or restart", () => {
		const sim = new Simulation({ mode: "hub" });
		sim.enterCave("chalk");
		assert.ok(!sim.dev("heal"));
		assert.ok(!sim.dev("warp", "rime"));
		assert.ok(!sim.restart());
		assert.ok(!sim.setTunable("moveSpeed", 100));
		assert.ok(!sim.resetTunables());
	});
	test("save schema rejects incompatible state", () => {
		const sim = fresh();
		assert.throws(() => sim.load({ schema: 500, version: C.version }));
		assert.throws(() => sim.restore({ ...sim.snapshot(), version: "other" }));
	});
	test("same production commands produce deterministic snapshots", () => {
		const a = fresh(),
			b = fresh();
		for (let n = 0; n < 1200; n++) {
			const cmd = {
				mx: n < 500 ? 1 : 0,
				my: 0,
				ax: 0,
				ay: 1,
				actions: n === 10 ? [{ id: 1, type: "fire" }] : [],
			};
			a.submit(1, cmd);
			b.submit(1, cmd);
			a.step(1 / 120);
			b.step(1 / 120);
		}
		assert.deepEqual(a.snapshot(), b.snapshot());
	});
	test("standard-rules complete expedition through production commands", () => {
		const sim = new Simulation(),
			director = new DTDirector.ExpeditionDirector(sim, 1),
			seenEvents = new Set(),
			enemyKinds = new Set();
		let maxBytes = 0,
			lastEvent = 0,
			snapshots = 0;
		if (!globalThis.My3D2dge)
			vm.runInThisContext(
				fs.readFileSync(
					`${dir}vendor/engine-repo/dist/handoff/my-3d2dge.js`,
					"utf8",
				),
			);
		const game = new My3D2dge.Game({
			headless: true,
			draw: true,
			res: "ps1",
			view: "threequarter",
		});
		let steps = 0;
		game.start({
			update(dt) {
				director.update(dt);
				sim.step(dt);
				for (const e of sim.state.events)
					if (e.id > lastEvent) {
						seenEvents.add(e.type);
						if (e.type === "enemy-hit") enemyKinds.add(e.kind);
						lastEvent = Math.max(lastEvent, e.id);
					}
				if (steps++ % 120 === 0) {
					maxBytes = Math.max(maxBytes, JSON.stringify(sim.snapshot()).length);
					snapshots++;
				}
			},
			draw() {},
		});
		try {
			for (let seconds = 0; seconds < 600 && !director.done; seconds++)
				game.advance(1);
			assert.deepEqual(game.errors, []);
		} finally {
			game.dispose();
		}

		assert.equal(director.errors.length, 0, director.errors.join(","));
		assert.ok(
			director.done,
			`director timed out ${JSON.stringify(director.tasks[0])}`,
		);
		assert.equal(sim.state.phase, "victory");
		assert.deepEqual(sim.state.tools, { axe: true, boat: true, key: true });
		assert.equal(sim.state.relics.length, 2);
		assert.equal(sim.state.stats.assisted, false);
		assert.ok(sim.state.flags.bankLesson);
		assert.ok(seenEvents.has("ooze-shed"));
		assert.ok(seenEvents.has("victory"));
		assert.ok(enemyKinds.has("guardian1") && enemyKinds.has("guardian2"));
		assert.ok(maxBytes < 16000, `snapshot exceeds Hub budget ${maxBytes}`);
		assert.equal(sim.state.stats.restarts, 0);
		assert.deepEqual(sim.cheats, {
			infiniteHealth: false,
			infiniteAmmo: false,
			noclip: false,
			reveal: false,
		});
		fullPlay = {
			pass: true,
			simulatedSeconds: sim.state.stats.elapsed,
			stats: sim.state.stats,
			tools: sim.state.tools,
			relics: sim.state.relics,
			progress: director.progress,
			maxSnapshotBytes: maxBytes,
			snapshots,
			method:
				"my-3D2dge E.Game.advance fixed steps drive every move, aim, shot, pickup, bank, tool route and ladder through Simulation.submit; no state edits or cheats.",
		};
	});
	const report = {
		passed: results.filter((r) => r.pass).length,
		failed: failures.length,
		failures,
		results,
		fullPlay,
	};
	fs.writeFileSync(
		`${dir}reports/simulation-tests.json`,
		JSON.stringify(report, null, 2),
	);
	return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const r = runSimulationTests();
	for (const f of r.failures) console.error(`FAIL ${f}`);
	console.log(`Simulation: ${r.passed} passed, ${r.failed} failed`);
	process.exitCode = r.failed ? 1 : 0;
}
