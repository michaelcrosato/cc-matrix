import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

/** Focused adversarial fixtures intentionally mutate setup; playthrough.mjs never does. */
export async function run() {
	const context = vm.createContext({ console });
	for (const path of [
		"src/config.js",
		"src/content/campaign.js",
		"src/sim/geometry.js",
		"src/sim/simulation.js",
		"src/save/save.js",
	])
		vm.runInContext(
			readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
			context,
			{ filename: path },
		);
	const N = context.NM,
		G = N.Geometry,
		dt = 1 / 120;
	let checks = 0;
	const failures = [];
	const check = (value, message) => {
		assert.ok(value, message);
		checks++;
	};
	const equal = (actual, expected, message) => {
		assert.equal(actual, expected, message);
		checks++;
	};
	const test = (name, work) => {
		try {
			work();
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
		}
	};
	const closed = {
		id: "test-room",
		width: 18,
		height: 18,
		rooms: [{ id: "room", x: 2, y: 2, w: 12, h: 12 }],
		passages: [],
		banks: [],
		spawn: [5, 5],
		exit: [12, 12],
		triggers: [],
		reward: "axe",
		guardIds: [],
	};
	function fixture(players = [1], data = closed) {
		const sim = new N.Sim({ seed: 10, players });
		sim.loadCave(0);
		sim.level = G.compile(data);
		Object.assign(sim.state, {
			enemies: [],
			arrows: [],
			pickups: [],
			noise: [],
			events: [],
			visible: [],
			explored: [],
			arrowLit: [],
			triggered: [],
		});
		for (const [i, player] of sim.state.players.entries())
			Object.assign(player, {
				x: 80 + i * 32,
				y: 80,
				invuln: 0,
				hp: 3,
				downed: false,
			});
		return sim;
	}
	function step(sim, seconds, command = {}) {
		for (let i = 0; i < seconds / dt; i++) {
			sim.command(1, { ax: 1, ay: 0, epoch: 1, seq: i + 1, ...command });
			sim.step(dt);
		}
	}
	function actor(type, id = "fixture-creature", x = 120, y = 80) {
		const def = N.EnemyDefaults[type];
		return {
			id,
			type,
			x,
			y,
			z: 0,
			r: type.startsWith("guardian") ? 13 : 5,
			hp: def.hp,
			maxHp: def.hp,
			state: "dormant",
			stateTime: 0,
			angle: Math.PI,
			homeX: x,
			homeY: y,
			targetX: x,
			targetY: y,
			invuln: 0,
			walk: 0,
			cueTimer: 2,
			attackSerial: 0,
			heard: null,
			aware: 0,
			phase: 0,
			mask: 0,
		};
	}
	function arrow(id, x, y, vx, vy, extra = {}) {
		return {
			id,
			x,
			y,
			vx,
			vy,
			z: 15,
			bounces: 0,
			owner: 1,
			life: 2.8,
			age: 0,
			lastX: x,
			lastY: y,
			...extra,
		};
	}

	test("swept thin and diagonal collisions", () => {
		const level = G.compile({
			...closed,
			banks: [{ id: "thin", ax: 8, ay: 3, bx: 8, by: 11 }],
		});
		const hit = G.sweep(level, 64, 100, 120, 0);
		check(
			hit?.edge.id === "thin",
			"A fast segment cannot tunnel across a thin reflector",
		);
		check(
			Math.abs(hit.t - 64 / 120) < 1e-8 && hit.nx === -1 && hit.ny === 0,
			"Earliest contact carries a stable opposing normal",
		);
		const diagonal = G.intersection(64, 100, 100, 0, {
			ax: 120,
			ay: 80,
			bx: 152,
			by: 112,
		});
		check(diagonal !== null, "A swept shot hits the true diagonal segment");
		const projection = 100 * diagonal.nx;
		check(
			Math.abs(100 - 2 * projection * diagonal.nx) < 1e-7 &&
				-2 * projection * diagonal.ny > 99,
			"A diagonal bank reflects east to south",
		);
		check(
			G.intersection(128.0001, 100, 10, 0, {
				ax: 128,
				ay: 80,
				bx: 128,
				by: 112,
			}) === null,
			"Separating offset prevents a zero-distance recollision",
		);
		const corner = G.sweep(level, 64, 64, 400, 400);
		check(
			corner && Number.isFinite(corner.t) && corner.t >= 0 && corner.t <= 1,
			"Near-corner sweep remains bounded and finite",
		);
	});

	test("finite reflections and reachable recovery", () => {
		const sim = fixture();
		sim.state.players[0].x = 48;
		sim.state.players[0].y = 48;
		sim.state.arrows.push(arrow("bounce-test", 130, 150, 240, 50));
		step(sim, 3.1);
		equal(sim.state.arrows.length, 0, "Lifetime expiration settles the arrow");
		equal(
			sim.state.pickups.filter((a) => a.kind === "shaft").length,
			1,
			"One stable recoverable pickup per missed arrow",
		);
		check(
			sim.state.stats.banks <= sim.config.reflections,
			"Maximum reflection count is honored",
		);
		check(
			G.validCircle(sim.level, sim.state.pickups[0].x, sim.state.pickups[0].y),
			"Recovery point supports an actor",
		);
		const pickupId = sim.state.pickups[0].id;
		sim.settle({ id: "bounce-test", x: 0, y: 0, spent: true });
		equal(
			sim.state.pickups[0].id,
			pickupId,
			"Repeated spent settlement does not add an arrow",
		);
	});

	test("initial shooter immunity, fair bank self-hit, and partner safety", () => {
		const sim = fixture([1, 2]);
		step(sim, 0.3, { fireId: 1 });
		equal(sim.state.players[0].hp, 3, "Initial release ignores the shooter");
		equal(
			sim.state.players[1].hp,
			3,
			"Outgoing arrow passes a partner without damage",
		);
		step(sim, 1.5, { fireId: 1 });
		equal(
			sim.state.players[0].hp,
			2,
			"A returning banked shot can hurt its shooter once",
		);
		equal(sim.state.players[1].hp, 3, "Returning shot still ignores a partner");
		equal(
			sim.state.stats.shots,
			1,
			"Holding/retransmitting the same fire ID draws one shaft",
		);
		equal(
			sim.state.party.ammo,
			2,
			"One intentional press debits the shared quiver once",
		);
	});

	test("one projectile applies one wound and is spent", () => {
		const sim = fixture();
		const snake = actor("snake");
		snake.state = "recovering";
		sim.state.enemies.push(snake);
		sim.state.arrows.push(arrow("wound-test", 95, 80, 240, 0));
		sim.updateArrows(0.2);
		sim.updateArrows(0.2);
		equal(snake.hp, 1, "One swept projectile applies exactly one wound");
		equal(sim.state.arrows.length, 0, "The damaging arrow is consumed");
		equal(
			sim.state.pickups.length,
			0,
			"Damaging arrows cannot be recovered for free damage",
		);
	});

	test("capacity overflow and contested pickup are atomic", () => {
		const sim = fixture([1, 2]);
		sim.state.players[1].x = 80;
		sim.state.party.ammo = 11;
		sim.state.pickups.push({
			id: "shared-supply",
			kind: "arrows",
			x: 80,
			y: 80,
			amount: 4,
		});
		sim.updatePickups();
		equal(
			sim.state.party.ammo,
			12,
			"Two rangers cannot both credit the same one-arrow capacity",
		);
		equal(sim.state.pickups[0].amount, 3, "Overflow remains on the floor");
		sim.state.party.ammo = 9;
		sim.updatePickups();
		sim.updatePickups();
		equal(
			sim.state.party.ammo,
			12,
			"The retained overflow can be collected later exactly once",
		);
		equal(sim.state.pickups.length, 0, "Consumed stable pickup is removed");
	});

	test("damage immunity and complete restart state", () => {
		const sim = new N.Sim();
		sim.loadCave(0);
		const player = sim.state.players[0];
		player.invuln = 0;
		check(sim.damage(player, 1, "test"), "First valid damage lands");
		check(
			!sim.damage(player, 1, "same attack"),
			"Invulnerability rejects repeated contact callbacks",
		);
		equal(player.hp, 2, "Repeated callbacks cost only one segment");
		const originalAmmo = sim.restartSnapshot.party.ammo,
			originalEnemyHp = sim.restartSnapshot.enemies[0].hp,
			originalSupply = sim.restartSnapshot.pickups[0].amount;
		sim.state.party.ammo = 0;
		sim.state.enemies[0].hp = 0;
		sim.state.pickups[0].amount = 0;
		player.invuln = 0;
		sim.damage(player, 3, "test wipe");
		sim.updateRevives(dt);
		equal(
			sim.state.party.reserves,
			2,
			"Solo death spends one persistent reserve",
		);
		equal(
			sim.state.stats.deaths,
			1,
			"Death record survives checkpoint restore",
		);
		equal(
			sim.state.party.ammo,
			originalAmmo,
			"Ammo restores from the same section snapshot",
		);
		equal(
			sim.state.enemies[0].hp,
			originalEnemyHp,
			"Enemy damage rolls back with restored ammo",
		);
		equal(
			sim.state.pickups[0].amount,
			originalSupply,
			"Consumed supplies roll back atomically",
		);
		sim.restart();
		equal(
			sim.state.party.reserves,
			2,
			"Voluntary restart cannot mint an expedition reserve",
		);
		equal(sim.state.stats.restarts, 1, "Voluntary restart is recorded");
		equal(
			sim.state.enemies[0].hp,
			originalEnemyHp,
			"Repeated restart never preserves dead enemies with replenished ammo",
		);
	});

	test("co-op wipe charges one reserve and revive is free", () => {
		const sim = new N.Sim({ players: [1, 2] });
		sim.loadCave(0);
		for (const p of sim.state.players) {
			p.invuln = 0;
			sim.damage(p, 3, "simultaneous wipe");
		}
		sim.updateRevives(dt);
		equal(
			sim.state.party.reserves,
			2,
			"Simultaneous party wipe spends one reserve total",
		);
		equal(
			sim.state.stats.deaths,
			1,
			"Simultaneous wipe has one death-charge record",
		);
		check(
			sim.state.players.every((p) => p.hp === 3 && !p.downed),
			"Both avatars return in one snapshot restore",
		);
		const [down, helper] = sim.state.players;
		down.invuln = 0;
		sim.damage(down, 3, "revive fixture");
		helper.x = down.x + 10;
		helper.y = down.y;
		for (let i = 0; i < 230; i++) {
			sim.command(2, { interactHeld: true, epoch: 1, seq: i + 1 });
			sim.step(dt);
		}
		check(
			!down.downed && down.hp === 2,
			"Fresh held interaction revives a nearby ranger",
		);
		equal(sim.state.party.reserves, 2, "Successful revive spends no reserve");
		equal(sim.state.stats.revives, 1, "Revive completes once");
	});

	test("expired co-op revive and zero reserves", () => {
		const sim = fixture([1, 2]);
		const [down, helper] = sim.state.players;
		down.invuln = 0;
		sim.damage(down, 3, "expired fixture");
		down.downTime = 0.01;
		helper.x = 160;
		sim.step(0.02);
		check(
			!down.downed && down.hp === 3,
			"Expired downed ranger respawns at a safe anchor",
		);
		equal(sim.state.party.reserves, 2, "Expired revive spends one reserve");
		check(
			G.validCircle(sim.level, down.x, down.y),
			"Respawn point is traversable",
		);
		const solo = fixture();
		solo.state.party.reserves = 1;
		solo.state.players[0].invuln = 0;
		solo.damage(solo.state.players[0], 3, "last reserve");
		solo.updateRevives(dt);
		equal(
			solo.state.mode,
			"defeat",
			"Last reserve resolves into a proper defeat state",
		);
		equal(solo.state.party.reserves, 0, "Last reserve never goes negative");
	});

	test("held-state heartbeat cleanup covers revival", () => {
		const sim = fixture([1, 2]);
		const [down, helper] = sim.state.players;
		helper.x = down.x + 10;
		down.invuln = 0;
		sim.damage(down, 3, "stale helper");
		sim.command(2, { interactHeld: true, epoch: 1, seq: 1 });
		step(sim, 2.1);
		check(
			down.downed,
			"A single stale interact packet cannot continue a 1.8-second revival after held-state timeout",
		);
	});

	test("fog memory, occlusion, and transient arrow light", () => {
		const split = {
			...closed,
			width: 16,
			height: 16,
			rooms: [
				{ id: "left", x: 2, y: 2, w: 4, h: 10 },
				{ id: "right", x: 7, y: 2, w: 4, h: 10 },
				{ id: "bridge", x: 2, y: 2, w: 9, h: 2 },
			],
		};
		const sim = fixture([1], split),
			p = sim.state.players[0];
		p.x = 5.5 * 16;
		p.y = 8.5 * 16;
		const hidden = actor("rat", "hidden", 7.5 * 16, 8.5 * 16);
		sim.state.enemies.push(hidden);
		sim.updateVisibility();
		check(
			!sim.visible(hidden),
			"An enemy across a wall is not visible despite proximity",
		);
		const cell = 8 * sim.level.w + 7;
		check(
			!sim.state.explored.includes(cell),
			"Unknown floor beyond a wall remains unexplored",
		);
		sim.illuminate(hidden.x, hidden.y);
		sim.updateVisibility();
		check(
			sim.visible(hidden),
			"A legitimate arrow light can briefly reveal the enemy cell",
		);
		check(
			!sim.state.explored.includes(cell),
			"Arrow scouting does not write permanent exploration memory",
		);
		sim.state.time += 0.5;
		sim.updateVisibility();
		check(
			!sim.visible(hidden),
			"Expired arrow light removes the unseen enemy again",
		);
		p.x = hidden.x;
		p.y = hidden.y;
		sim.updateVisibility();
		check(
			sim.state.explored.includes(cell),
			"Actual traversal writes persistent memory",
		);
		p.x = 5.5 * 16;
		p.y = 8.5 * 16;
		sim.updateVisibility();
		check(
			sim.state.explored.includes(cell) && !sim.visible(hidden),
			"Remembered floor never makes the hidden enemy visible",
		);
	});

	test("acoustic geometry and investigation origin", () => {
		const split = {
			...closed,
			width: 16,
			height: 16,
			rooms: [
				{ id: "left", x: 2, y: 2, w: 4, h: 10 },
				{ id: "right", x: 7, y: 2, w: 4, h: 10 },
				{ id: "bridge", x: 2, y: 2, w: 9, h: 2 },
			],
		};
		const sim = fixture([1], split),
			p = sim.state.players[0];
		p.x = 5.5 * 16;
		p.y = 7.5 * 16;
		const listener = actor("ooze", "listener", 7.5 * 16, 7.5 * 16);
		sim.state.enemies.push(listener);
		const acoustic = G.field(sim.level, p.x, p.y),
			[cx, cy] = G.cell(listener.x, listener.y);
		check(
			acoustic[cy * sim.level.w + cx] > 2,
			"Acoustic distance follows the passage around the wall",
		);
		sim.noise("quiet fixture", p.x, p.y, 3);
		sim.updateEnemy(listener, dt);
		equal(
			listener.heard,
			null,
			"A quiet nearby sound cannot pass unrestricted through stone",
		);
		const loud = sim.noise("bank", p.x, p.y, 16, "arrow");
		const origin = [p.x, p.y];
		p.x = 3.5 * 16;
		p.y = 9.5 * 16;
		sim.updateEnemy(listener, dt);
		equal(
			listener.heard,
			loud.id,
			"A strong echo reaches the listener through the real passage",
		);
		equal(
			listener.targetX,
			origin[0],
			"Investigation retains the event origin, not the live ranger x",
		);
		equal(
			listener.targetY,
			origin[1],
			"Investigation retains the event origin, not the live ranger y",
		);
	});

	test("ordinary attack includes cue and reaction window", () => {
		const sim = fixture();
		const p = sim.state.players[0],
			rat = actor("rat", "timed-rat", p.x + 18, p.y);
		sim.state.enemies.push(rat);
		step(sim, 0.5);
		equal(
			p.hp,
			3,
			"A newly alerted rat cannot cause immediate hidden contact damage",
		);
		check(
			sim.state.events.some((e) => e.kind === "alert-rat"),
			"A distinct warning event precedes damage",
		);
		let firstDamage = null;
		for (let i = 0; i < 3 * 120; i++) {
			sim.step(dt);
			if (p.hp < 3) {
				firstDamage = sim.state.time;
				break;
			}
		}
		check(
			firstDamage !== null && firstDamage >= 1.2,
			"The first strike follows alert and windup with a meaningful reaction interval",
		);
	});

	test("save integrity, interrupted writes, and denied storage", () => {
		const memory = new Map();
		const storage = {
			getItem: (key) => memory.get(key) ?? null,
			setItem: (key, value) => memory.set(key, value),
			removeItem: (key) => memory.delete(key),
		};
		const save = new N.Save(storage),
			sim = new N.Sim();
		sim.loadCave(0);
		const valid = { state: sim.snapshot(), restart: sim.snapshot() };
		save.write(valid);
		check(
			save.read()?.state.version === N.VERSION,
			"Valid versioned checkpoint round-trips",
		);
		const good = memory.get(save.key);
		const encoded = JSON.parse(good);
		encoded.checksum = "wrong";
		equal(
			save.decode(JSON.stringify(encoded)),
			null,
			"Checksum damage is rejected",
		);
		encoded.checksum = JSON.parse(good).checksum;
		encoded.schema = 999;
		equal(
			save.decode(JSON.stringify(encoded)),
			null,
			"Unsupported schema is rejected",
		);
		memory.set(`${save.key}.pending`, "truncated");
		check(
			save.read()?.state.mode === "cave",
			"Interrupted pending write preserves the previous committed save",
		);
		const denied = new N.Save({
			getItem() {
				throw Error("denied");
			},
			setItem() {
				throw Error("denied");
			},
			removeItem() {
				throw Error("denied");
			},
		});
		denied.write(valid);
		check(
			denied.read()?.state.version === N.VERSION && !denied.available,
			"Denied storage falls back to a complete in-memory checkpoint",
		);
		const invalid = N.clone(valid);
		invalid.state.players[0].x = null;
		check(
			save.decode(save.encode(invalid)) === null,
			"Invalid actor coordinates cannot become a valid resumed state",
		);
	});

	test("storage property denial itself is nonblocking", () => {
		const denied = vm.createContext({ console });
		Object.defineProperty(denied, "localStorage", {
			get() {
				throw Error("SecurityError");
			},
		});
		for (const path of [
			"src/config.js",
			"src/content/campaign.js",
			"src/save/save.js",
		])
			vm.runInContext(
				readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
				denied,
			);
		check(
			vm.runInContext("new NM.Save().available === false", denied),
			"The localStorage property may throw before any getItem call",
		);
	});

	test("checkpoint restores current roster across joins and departures", () => {
		const sim = new N.Sim({ players: [1, 2] });
		sim.loadCave(0);
		sim.removePlayer(2);
		sim.restart();
		equal(
			sim.state.players.length,
			1,
			"A departed guest cannot return as a phantom after restart",
		);
		equal(
			sim.state.players[0].seat,
			1,
			"The remaining seat owns the restored ranger",
		);
		const late = new N.Sim({ players: [1] });
		late.loadCave(0);
		late.addPlayer(2);
		late.restart();
		equal(
			late.state.players.length,
			2,
			"A late-arriving ranger survives a checkpoint created before joining",
		);
		check(
			late.state.players.every((p) => G.validCircle(late.level, p.x, p.y)),
			"Both restored seats have safe anchors",
		);
	});

	test("live supply tuning changes remaining piles and resets existing state", () => {
		const sim = new N.Sim();
		sim.loadCave(0);
		const pile = sim.state.pickups.find((p) => p.kind === "arrows"),
			original = pile.amount;
		sim.tune("supplyMultiplier", 2);
		equal(
			pile.amount,
			original * 2,
			"Supply yield changes a pile already in the current section",
		);
		pile.amount -= 2;
		sim.resetTuning();
		equal(
			pile.amount,
			original - 1,
			"Reset scales only the remaining pile instead of restoring consumed arrows",
		);
		check(
			sim.state.stats.assisted,
			"Live resource experiments remain marked as assistance",
		);
	});

	if (failures.length) throw new Error(failures.join("\n"));
	return checks;
}
