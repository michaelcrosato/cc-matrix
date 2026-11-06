import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { load, dev } from "../tools/load.mjs";
let count = 0;
const failures = [];
const { F, E, logs } = load();
const test = (name, fn) => {
	count++;
	try {
		fn();
	} catch (e) {
		failures.push(name + ": " + e.message);
	}
};
const make = (options = {}) => {
	const game = new E.Game({ headless: true, loop: false });
	const sim = new F.Simulation(game, { seed: 61421, ...options });
	sim.s.spawned = F.MISSIONS[0].entries.map((x) => x.id);
	sim.s.entities = [];
	sim._checkpointPending = false;
	return sim;
};
const neutral = () => ({ ...F.NEUTRAL });
const action = (
	mx = 0,
	my = 0,
	ax = 1,
	ay = 0,
	fire = false,
	warp = false,
) => ({ mx, my, ax, ay, fire, warp });
const advance = (sim, n = 120, inputs = {}) => {
	for (let i = 0; i < n; i++) sim.step(1 / 120, inputs);
};
const equal = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
test("authored content validates", () =>
	assert.equal(F.validateMissions(F.MISSIONS), true));
test("invalid mission references fail validation", () => {
	const x = F.clone(F.MISSIONS);
	x[1].entries[0].pattern = "not-a-formation";
	assert.throws(() => F.validateMissions(x));
});
test("balance clamps and rejects nonfinite edits", () => {
	const b = F.validateBalance({ hull: 500, burstDuration: NaN, speed: -5 });
	assert.equal(b.hull, 9);
	assert.equal(b.speed, 55);
	assert.equal(b.burstDuration, 0.45);
});
test("diagonal conventional speed normalized", () => {
	const a = make(),
		b = make();
	advance(a, 120, { 0: action(1, 0) });
	advance(b, 120, { 0: action(1, 1) });
	assert.ok(
		Math.abs(Math.hypot(b.s.ship.vx, b.s.ship.vy) - a.s.ship.vx) < 0.001,
	);
});
test("aim independent of travel and neutral bearing retained", () => {
	const s = make();
	s.step(1 / 120, { 0: action(1, 0, 0, -1) });
	s.step(1 / 120, { 0: action(1, 0, 0, 0) });
	assert.equal(s.s.ship.aimY, -1);
	assert.equal(s.s.ship.aimX, 0);
	assert.ok(s.s.ship.vx > 0);
});
test("burst commits one normalized vector", () => {
	const s = make();
	s.step(1 / 120, { 0: action(1, 1, 1, 0, false, true) });
	advance(s, 28, { 0: action(-1, 0, 1, 0, false, true) });
	assert.equal(s.s.ship.drive, "burst");
	assert.ok(Math.abs(s.s.ship.burstX - Math.SQRT1_2) < 1e-8);
	assert.equal(s.s.ship.burstX, s.s.ship.burstY);
});
test("held trigger spends energy once then requires release", () => {
	const s = make();
	advance(s, 1000, { 0: action(0, 0, 1, 0, false, true) });
	assert.equal(s.s.warpCount, 1);
	assert.equal(Math.round(s.s.ship.energy), 100);
	s.step(1 / 120, { 0: neutral() });
	advance(s, 80, { 0: action(0, 0, 1, 0, false, true) });
	assert.equal(s.s.warpCount, 2);
});
test("low-energy denied activation leaves drive ready", () => {
	const s = make();
	s.s.ship.energy = 10;
	s.step(1 / 120, { 0: action(0, 0, 0, -1, false, true) });
	assert.equal(s.s.ship.drive, "ready");
	assert.ok(s.s.events.some((e) => e.type === "denied"));
});
test("neutral burst falls back to retained aim", () => {
	const s = make();
	s.s.ship.aimX = 0;
	s.s.ship.aimY = -1;
	s.step(1 / 120, { 0: action(0, 0, 0, 0, false, true) });
	assert.equal(s.s.ship.burstY, -1);
});
test("swept hyperspace rescues between endpoints", () => {
	const s = make();
	s.s.ship.drive = "burst";
	s.s.ship.driveT = 1;
	s.balance.burstSpeed = 12000;
	s.add("crystal", 160, 135, { id: "swept", slot: "swept" });
	s.step(1 / 120, {});
	assert.ok(s.s.rescued.includes("swept"));
});
test("swept hyperspace hits armed mines without immunity", () => {
	const s = make();
	s.s.ship.drive = "burst";
	s.s.ship.driveT = 1;
	s.balance.burstSpeed = 12000;
	s.add("mine", 160, 135, { age: 5 });
	s.step(1 / 120, {});
	assert.equal(s.s.ship.hull, 2);
});
test("rescue wins same-tick laser race; hostile hull hit still applies", () => {
	const s = make();
	const q = s.add("crystal", 110, 135, { id: "race", slot: "race", hp: 1 });
	s.shots.fire({ x: 110, y: 135, vx: 0, team: "player" });
	s.shots.fire({ x: 110, y: 135, vx: 0, team: "hostile" });
	s.step(1 / 120, {});
	assert.ok(s.s.rescued.includes("race"));
	assert.ok(!s.s.lost.includes("race"));
	assert.equal(s.s.ship.hull, 2);
	assert.equal(q.dead, true);
});
test("rescue logical ledger prevents duplicate awards", () => {
	const s = make(),
		q = s.add("crystal", 110, 135, { id: "one", slot: "one" });
	assert.equal(s.rescue(q), true);
	const points = s.s.score;
	assert.equal(s.rescue(q), false);
	assert.equal(s.s.score, points);
	const again = s.add("crystal", 110, 135, { id: "two", slot: "one" });
	s.rescue(again);
	assert.equal(s.s.score, points);
});
test("crystal takes three separate laser hits with warnings", () => {
	const s = make(),
		q = s.add("crystal", 160, 100, { slot: "fragile" });
	for (let i = 0; i < 3; i++) {
		s.shots.fire({ x: 160, y: 100, vx: 0, team: "player", dmg: 1 });
		s.step(1 / 120, {});
		if (i < 2) {
			assert.equal(q.dead, false);
			assert.ok(q.flash > 0);
		}
	}
	assert.ok(s.s.lost.includes(q.id));
	assert.equal(s.s.events.filter((e) => e.type === "crystalHit").length, 3);
});
test("damage grace rejects repeat hits", () => {
	const s = make();
	assert.equal(s.damage("a"), true);
	assert.equal(s.damage("b"), false);
	assert.equal(s.s.ship.hull, 2);
	advance(s, 151);
	assert.equal(s.damage("c"), true);
	assert.equal(s.s.ship.hull, 1);
});
test("deploying and arming mines are harmless", () => {
	const s = make();
	s.add("mine", 110, 135);
	advance(s, 60);
	assert.equal(s.s.ship.hull, 3);
	advance(s, 85);
	assert.equal(s.s.ship.hull, 2);
});
test("field collapse affects only linked owner and awards ship value", () => {
	const s = make(),
		a = s.add("layer", 200, 100),
		b = s.add("layer", 300, 100),
		m1 = s.add("mine", 170, 90, { owner: a.id }),
		m2 = s.add("mine", 280, 90, { owner: b.id });
	s.kill(a);
	assert.equal(m1.state, "disarmed");
	assert.equal(m2.state, "deploying");
	assert.equal(s.s.score, 5);
	advance(s, 120);
	assert.equal(m1.dead, true);
});
test("all three authored formations preserve safe rescue collars", () => {
	for (const pattern of ["curtain", "ring", "arc"]) {
		const s = make();
		s.add("crystal", 350, 135, { slot: "safe" });
		s.formation("owner", pattern, 300, 135);
		assert.ok(
			s.s.entities
				.filter((q) => q.kind === "mine")
				.every((q) => Math.hypot(q.x - 350, q.y - 135) >= 43),
		);
		assert.ok(s.s.entities.filter((q) => q.kind === "mine").length > 2);
	}
});
test("enemy spawns have warning and avoid the player", () => {
	const s = make();
	const q = s.add("interceptor", 110, 135);
	assert.ok(Math.hypot(q.x - 110, q.y - 135) >= 90);
	assert.ok(q.warning >= 1);
	advance(s, 100);
	assert.equal(s.s.ship.hull, 3);
});
test("lost required target deploys reachable penalized replacement", () => {
	const s = make();
	const q = s.add("crystal", 200, 135, { slot: "mandatory" });
	s.lose(q);
	advance(s, 850);
	const replacement = s.s.entities.find(
		(x) => x.kind === "crystal" && x.replacement,
	);
	assert.ok(replacement);
	assert.equal(s.s.replacementPenalty, 1);
	assert.ok(
		Math.hypot(replacement.x - s.s.ship.x, replacement.y - s.s.ship.y) < 240,
	);
	s.rescue(replacement);
	assert.equal(s.s.score, 20);
});
test("retry restores score and ledgers baseline, three hull and energy", () => {
	const s = make();
	s.s.score = 50;
	s.s.rescued = ["before"];
	s.checkpoint = s.checkpointData();
	s.s.score = 500;
	s.s.rescued.push("after");
	s.s.ship.hull = 0;
	s.s.ship.energy = 1;
	s.finish(false, "test");
	s.retry();
	assert.equal(s.s.score, 50);
	equal(s.s.rescued, ["before"]);
	assert.equal(s.s.ship.hull, 3);
	assert.equal(s.s.ship.energy, 100);
	assert.equal(s.s.outcome, null);
});
test("malformed and old checkpoints rejected", () => {
	assert.equal(F.Simulation.validCheckpoint({ version: 0 }), false);
	const s = make(),
		cp = s.checkpointData();
	assert.equal(F.Simulation.validCheckpoint(cp), true);
	cp.score = NaN;
	assert.equal(F.Simulation.validCheckpoint(cp), false);
});
test("sector clears transient state and preserves secured ledger", () => {
	const s = make();
	s.s.rescued = ["a"];
	s.s.score = 20;
	s.s.ship.drive = "windup";
	s.shots.fire({ x: 100, y: 100 });
	s.enter(1);
	assert.equal(s.s.entities.length, 0);
	assert.equal(s.shots.list.length, 0);
	assert.equal(s.s.ship.drive, "ready");
	assert.equal(s.s.score, 20);
	equal(s.s.rescued, ["a"]);
});
test("co-op authority keeps pilot steering during navigator preview", () => {
	const s = make({ roster: [0, 1] });
	s.step(1 / 120, { 0: action(1, 0, -1, 0), 1: action(0, -1, 0, 1) });
	assert.ok(s.s.ship.vx > 0);
	assert.equal(s.s.ship.vy, 0);
	assert.equal(s.s.ship.aimY, 1);
	assert.equal(s.s.ship.previewY, -1);
});
test("navigator commit overrides pilot only for committed burst", () => {
	const s = make({ roster: [0, 1] });
	s.step(1 / 120, { 0: action(1, 0), 1: action(0, -1, 0, 1, false, true) });
	advance(s, 22, { 0: action(1, 0), 1: action(1, 0) });
	assert.equal(s.s.ship.drive, "burst");
	assert.equal(s.s.ship.vx, 0);
	assert.ok(s.s.ship.vy < 0);
});
test("two fire buttons share one cadence", () => {
	const a = make({ roster: [0, 1] }),
		b = make();
	advance(a, 120, { 0: action(0, 0, 1, 0, true), 1: action(0, 0, 1, 0, true) });
	advance(b, 120, { 0: action(0, 0, 1, 0, true) });
	assert.equal(
		a.s.events.filter((e) => e.type === "shot").length,
		b.s.events.filter((e) => e.type === "shot").length,
	);
	assert.ok(a.s.events.filter((e) => e.type === "shot").length <= 9);
});
test("remaining seat immediately owns every solo action", () => {
	const s = make({ roster: [0, 1] });
	s.setRoster([1]);
	s.step(1 / 120, { 1: neutral() });
	s.step(1 / 120, { 1: action(-1, 0, 0, -1, true, true) });
	assert.ok(s.s.ship.vx < 0);
	assert.equal(s.s.ship.aimY, -1);
	assert.equal(s.s.ship.drive, "windup");
	assert.equal(s.s.roles.pilot, 1);
});
test("invalid and nonfinite intentions become neutral", () => {
	equal(
		F.intent({ mx: NaN, my: 0, ax: 0, ay: 0, fire: true, warp: true }),
		F.NEUTRAL,
	);
	equal(
		F.intent({ mx: 10, my: 0, ax: 0, ay: 0, fire: true, warp: true }),
		F.NEUTRAL,
	);
});
test("shroud suppresses then visibly restores cannon", () => {
	const s = make();
	s.enter(2);
	s.s.ship.x = 5500;
	s.direct(1 / 120);
	assert.equal(s.s.weaponsOff, true);
	const n = s.shots.list.length;
	s.step(1 / 120, { 0: action(0, 0, 1, 0, true) });
	assert.equal(s.shots.list.filter((q) => q.team === "player").length, n);
	s.s.ship.x = 6300;
	s.direct(1 / 120);
	assert.equal(s.s.weaponsOff, false);
	assert.equal(s.s.shroudCrossed, true);
});
test("terminal result latches; victory ignores later collisions", () => {
	const s = make();
	assert.equal(s.finish(true, "safe"), true);
	assert.equal(s.finish(false, "late"), false);
	const score = s.s.score;
	advance(s, 100);
	assert.equal(s.s.score, score);
	assert.equal(s.s.outcome, "victory");
});
test("carrier core / hull death same tick is failure", () => {
	const s = make();
	s.enter(3);
	s.s.ship.x = 6500;
	s.s.ship.hull = 1;
	s.s.boss = { phase: "core", hull: { x: 7100, y: 135, w: 160, h: 120 } };
	s.add("core", 6550, 100, { hp: 1, warning: 0 });
	s.shots.fire({ x: 6550, y: 100, vx: 0, team: "player" });
	s.shots.fire({ x: 6500, y: 135, vx: 0, team: "hostile" });
	s.step(1 / 120, {});
	assert.equal(s.s.outcome, "failure");
});
test("aim assistance avoids firing through a crystal", () => {
	const s = make();
	s.add("layer", 300, 135, { warning: 0 });
	s.add("crystal", 200, 135);
	const aim = F.safeAim(s.s, [1, 0], 0.2, true);
	assert.equal(aim.fire, false);
});
test("new hull maximum preserves missing hull units", () => {
	const s = make();
	s.s.ship.hull = 2;
	s.tune({ ...s.balance, hull: 5 });
	assert.equal(s.s.ship.hull, 4);
	s.tune({ ...s.balance, hull: 1 });
	assert.equal(s.s.ship.hull, 1);
});
test("native draw smoke for title, rescue, minefield and carrier", () => {
	const a = F.create({ headless: true, draw: true, loop: false });
	a.game.advance(0.2);
	a.game.debug.start();
	a.game.advance(0.2);
	a.command("sector", 2);
	a.sim.s.ship.x = 2600;
	a.sim.direct(0);
	a.game.advance(0.3);
	a.command("sector", 3);
	a.sim.s.ship.x = 6700;
	a.sim.direct(0);
	a.game.advance(0.1);
	assert.equal(
		a.game.errors.length,
		0,
		a.game.errors.map((e) => e.message).join(";"),
	);
	a.dispose();
});
test("attract threshold, isolated demo, consumed exit and records unchanged", () => {
	const a = F.create({ headless: true, loop: false });
	const records = JSON.stringify(a.records);
	a.game.advance(9.99);
	assert.equal(a.attract, false);
	a.game.advance(0.03);
	assert.equal(a.attract, true);
	a.game.advance(32, { draw: false });
	assert.equal(a.sim.s.roles.shared, true);
	assert.ok(a.sim.s.boss);
	assert.equal(JSON.stringify(a.records), records);
	assert.equal(a.activity("keyboard"), true);
	assert.equal(a.attract, false);
	assert.equal(a.game.sceneName, "title");
	assert.equal(a.ui.screen, "title");
	assert.equal(JSON.stringify(a.records), records);
	a.dispose();
});
test("attract never begins over settings", () => {
	const a = F.create({ headless: true, loop: false });
	a.game.menu("settings");
	a.game.advance(15);
	assert.equal(a.attract, false);
	a.dispose();
});
test("developer reset restores authored values and protects records", () => {
	const a = F.create({ headless: true, loop: false });
	a.game.debug.start();
	a.game.settings.set("dev_speed", 140);
	assert.equal(a.sim.balance.speed, 140);
	assert.equal(a.sim.debug, true);
	a.command("reset");
	assert.equal(a.sim.balance.speed, 96);
	assert.equal(a.game.timeScale, 1);
	a.command("step");
	assert.ok(a.sim.s.tick > 0);
	a.dispose();
});
test("evasion fields approach an idle ship rather than leaving it safe", () => {
	const s = make({ mode: "evasion" });
	advance(s, 2400);
	assert.ok(s.s.ship.hull < 3 || s.s.outcome === "failure");
});
test("evasion cannon always unavailable and extraction at 180s", () => {
	const s = make({ mode: "evasion" });
	s.invulnerable = true;
	advance(s, 21605, { 0: action(0, 0, 1, 0, true) });
	assert.equal(s.s.outcome, "victory");
	assert.equal(s.s.weaponsOff, true);
	assert.equal(s.shots.list.filter((q) => q.team === "player").length, 0);
	assert.ok(s.s.score >= 36);
});
function hubInfo(server = false, me = 0) {
	return {
		players: [
			{ id: 0, name: "Pilot" },
			{ id: 1, name: "Navigator" },
		],
		me: server ? 9 : me,
		host: server ? 9 : 0,
		isHost: server || me === 0,
		seed: 99,
		round: 1,
		server,
		limitMs: 900000,
	};
}
function fakeHub() {
	const handlers = {},
		sent = [],
		results = [];
	return {
		handlers,
		sent,
		results,
		on(k, f) {
			handlers[k] = f;
		},
		ready() {
			this.readyCalls = (this.readyCalls || 0) + 1;
		},
		time: () => 1000,
		send(d, o) {
			sent.push([F.clone(d), o]);
			return true;
		},
		finish(x) {
			results.push(F.clone(x));
		},
	};
}
test("Hub server no local player readies and simulates without gesture", () => {
	const h = fakeHub(),
		a = F.create({ headless: true, loop: false, info: hubInfo(true), hub: h });
	assert.equal(h.readyCalls, 1);
	h.handlers.start();
	a.game.advance(1);
	assert.ok(a.sim.s.tick > 0);
	assert.equal(a.sound.unlocked, false);
	assert.equal(a.net.roster.includes(9), false);
	assert.ok(h.sent.length > 0);
	a.dispose();
});
test("Hub waits until time reaches zero despite early start event", () => {
	const h = fakeHub();
	h.time = () => -1000;
	const a = F.create({ headless: true, loop: false, info: hubInfo(), hub: h });
	h.handlers.start();
	a.game.advance(1);
	assert.equal(a.sim.s.tick, 0);
	h.time = () => 0;
	a.game.advance(0.1);
	assert.ok(a.sim.s.tick > 0);
	a.dispose();
});
test("Hub rejects forged, stale and invalid intent packets", () => {
	const h = fakeHub(),
		a = F.create({ headless: true, loop: false, info: hubInfo(), hub: h }),
		n = a.net;
	const packet = {
		v: 1,
		k: "i",
		run: n.runId,
		seq: 1,
		tick: 0,
		a: action(0, 1),
	};
	n.receive(packet, 22);
	assert.equal(n.rejected, 1);
	n.receive(packet, 1);
	assert.equal(n.received.get(1), 1);
	n.receive(packet, 1);
	n.receive({ ...packet, seq: 2, a: { ...packet.a, mx: NaN } }, 1);
	assert.equal(n.rejected, 3);
	a.dispose();
});
test("Hub complete snapshots reconstruct rescue ledger and terminal state", () => {
	const h = fakeHub(),
		a = F.create({ headless: true, loop: false, info: hubInfo(), hub: h }),
		c = F.create({
			headless: true,
			loop: false,
			info: hubInfo(false, 1),
			hub: fakeHub(),
		});
	a.sim.rescue(a.sim.s.entities[0]);
	a.sim.s.tick = 5;
	c.net.receive(a.net.compact(), 0);
	equal(c.sim.s.rescued, a.sim.s.rescued);
	assert.equal(c.sim.s.score, a.sim.s.score);
	const before = c.sim.s.score;
	c.net.receive(a.net.compact(), 0);
	assert.equal(c.sim.s.score, before);
	a.dispose();
	c.dispose();
});
test("Hub read-only tools reject mutations", () => {
	const a = F.create({
		headless: true,
		loop: false,
		info: hubInfo(),
		hub: fakeHub(),
	});
	assert.equal(a.command("sector", 3), false);
	assert.equal(a.fixture("ship", { hull: 9 }), false);
	assert.equal(a.sim.s.sector, 0);
	a.dispose();
});
test("Hub timeout finish once includes tied remaining roster and numeric stats", () => {
	const h = fakeHub(),
		a = F.create({ headless: true, loop: false, info: hubInfo(true), hub: h });
	h.handlers.start();
	h.handlers["time-up"]();
	h.handlers["time-up"]();
	assert.equal(h.results.length, 1);
	equal(h.results[0].standings, [[0, 1]]);
	assert.equal(h.results[0].won, false);
	assert.equal(typeof h.results[0].scores[0], "number");
	assert.equal(typeof h.results[0].stats[1].Rescued, "number");
	h.handlers.end({ reason: "finished" });
	const sent = h.sent.length;
	a.game.advance(2);
	assert.equal(h.sent.length, sent);
	assert.equal(a.ended, true);
	a.dispose();
});
test("Hub departure transfers all roles to survivor", () => {
	const h = fakeHub(),
		a = F.create({ headless: true, loop: false, info: hubInfo(true), hub: h });
	h.handlers.leave({ id: 0 });
	equal(a.net.roster, [1]);
	equal(a.sim.roster, [1]);
	a.dispose();
});
test("seeded simulation stays deterministic with different rendering frequency", () => {
	const a = make(),
		b = make();
	for (let i = 0; i < 1200; i++) {
		const action0 = action(
			Math.sin(i * 0.01),
			Math.cos(i * 0.01),
			1,
			0,
			i % 3 === 0,
			i % 300 === 0,
		);
		a.step(1 / 120, { 0: action0 });
		b.step(1 / 120, { 0: action0 });
	}
	equal(a.snapshot(), b.snapshot());
});
test("mine farming credit is finite and survives checkpoint restore", () => {
	const s = make();
	for (let i = 0; i < 20; i++)
		s.kill(s.add("mine", 400 + i, 100, { owner: "budget-owner" }));
	assert.equal(s.s.score, 8);
	s.checkpoint = s.checkpointData();
	s.s.mineCredit = {};
	s.retry();
	assert.equal(s.s.mineCredit["budget-owner"], 8);
	s.kill(s.add("mine", 450, 100, { owner: "budget-owner" }));
	assert.equal(s.s.score, 8);
	const cp = s.checkpointData();
	cp.mineCredit = "bad";
	assert.equal(F.Simulation.validCheckpoint(cp), false);
});
test("score increases pressure only within its explicit cap", () => {
	const s = make();
	const initial = s.pressure();
	s.s.score = 100000;
	assert.equal(s.pressure(), initial * 1.3);
});
test("root title back and pause never strand the front end", () => {
	const a = F.create({ headless: true, loop: false });
	a.game.input.tap("cancel");
	a.game.advance(0.1);
	assert.equal(a.ui.screen, "title");
	a.game.input.tap("pause");
	a.game.advance(0.1);
	assert.equal(a.ui.screen, "title");
	a.dispose();
});
test("a new co-op pairing starts with canonical seat roles after a disconnect", () => {
	const s = make({ roster: [0, 1] });
	s.swap = true;
	s.setRoster([0]);
	s.setRoster([0, 1]);
	assert.equal(s.swap, false);
	s.step(1 / 120, { 0: action(1, 0), 1: action(0, 1) });
	assert.ok(s.s.ship.vx > 0);
	assert.equal(s.s.roles.pilot, 0);
});
test("all semantic producers respect local overlays and terminal input suppression", () => {
	const a = F.create({ headless: true, loop: false });
	a.game.debug.start();
	a.injected[0] = action(1, 0, 1, 0, true, true);
	a.ui.show("help");
	equal(F.readSeat(a, a.game.input, 1 / 120, 0), F.NEUTRAL);
	a.ui.hide();
	a.ended = true;
	equal(F.readSeat(a, a.game.input, 1 / 120, 0), F.NEUTRAL);
	a.dispose();
});
test("retry and attract exit clear native and game-owned transient effects", () => {
	const a = F.create({ headless: true, loop: false });
	a.game.debug.start();
	a.game.particles.add({ x: 100, y: 100 });
	a.presentation.fx = [{ type: "rescue", age: 0 }];
	a.retry();
	assert.equal(a.game.particles.list.length, 0);
	assert.equal(a.presentation.fx.length, 0);
	a.startAttract();
	a.game.particles.add({ x: 100, y: 100 });
	a.activity("mouse");
	assert.equal(a.game.particles.list.length, 0);
	a.dispose();
});
test("Hub hull failure reports once and end stops the native loop and audio", () => {
	const h = fakeHub(),
		a = F.create({ headless: true, loop: false, info: hubInfo(true), hub: h });
	h.handlers.start();
	a.sim.s.ship.hull = 1;
	a.sim.damage("fixture");
	a.game.advance(0.1);
	h.handlers["time-up"]();
	assert.equal(h.results.length, 1);
	assert.equal(h.results[0].won, false);
	h.handlers.end({ reason: "finished" });
	assert.equal(a.game._running, false);
	assert.equal(a.game.audio.muted, true);
	a.dispose();
});
test("carrier rescue quota and trajectories are driven by validated mission data", () => {
	const m = F.MISSIONS[3],
		old = m.quota;
	try {
		m.quota = 4;
		F.validateMissions(F.MISSIONS);
		const s = make();
		s.enter(3);
		s.s.ship.x = m.bossX - 300;
		s.bossDirector();
		for (const q of s.s.entities.filter((x) => x.kind === "organ")) s.kill(q);
		s.bossDirector();
		const pods = s.s.entities.filter((q) => q.kind === "crystal");
		assert.equal(pods.length, 4);
		assert.ok(
			pods.every((q) => q.y >= m.release.minY && q.y <= m.release.maxY),
		);
		for (const q of pods) s.rescue(q);
		s.bossDirector();
		assert.equal(s.s.boss.phase, "core");
	} finally {
		m.quota = old;
	}
	const data = F.clone(F.MISSIONS);
	data[3].release.minY = NaN;
	assert.throws(() => F.validateMissions(data));
});
test("unsecured optional captives are recorded when leaving a sector", () => {
	const s = make();
	s.enter(2);
	s.s.spawned = F.MISSIONS[2].entries.map((q) => q.id);
	const q = s.add("crystal", 10500, 70, {
		id: "left-behind",
		slot: "left-behind",
		optional: true,
	});
	s.s.sectorRescued = 4;
	s.s.shroudCrossed = true;
	s.s.ship.x = F.MISSIONS[2].length - 80;
	s.s.ship.y = 135;
	s.direct(0);
	assert.ok(s.s.lost.includes(q.id));
	assert.equal(s.s.sector, 3);
});
test("Evasion opportunities close honestly without replacement promises", () => {
	const s = make({ mode: "evasion" });
	s.direct(0);
	const q = s.s.entities.find((q) => q.kind === "crystal");
	assert.equal(q.optional, true);
	s.finish(true, "extract");
	assert.ok(s.s.lost.includes(q.id));
	assert.equal(Object.keys(s._replacementAt).length, 0);
});
test("the actual radio scheduler reaches pilot, navigator and survivor profiles", () => {
	const sound = Object.create(F.Sound.prototype),
		heard = [],
		original = F.radioPhrase;
	sound.g = { real: 0 };
	sound.a = {
		ready: true,
		ctx: { currentTime: 0 },
		bus: () => ({}),
		sfx: () => {},
	};
	sound.unlocked = true;
	sound.lastVoice = -10;
	sound.radioTurn = 0;
	try {
		F.radioPhrase = (_ctx, _bus, _at, voice) => {
			heard.push(voice);
			return [];
		};
		sound.event({ type: "radio" }, false);
		sound.g.real = 3;
		sound.event({ type: "radio" }, false);
		sound.g.real = 6;
		sound.event({ type: "rescue" }, false);
		equal(heard, ["pilot", "navigator", "survivor"]);
	} finally {
		F.radioPhrase = original;
	}
});
test("developer scenario revisits have fresh ledgers and leave Evasion correctly", () => {
	const a = F.create({ headless: true, loop: false });
	a.game.debug.start("evasion");
	a.sim.s.credited = ["reach-a"];
	a.sim.s.rescued = ["reach-a"];
	a.command("sector", 1);
	assert.equal(a.sim.mode, "operation");
	assert.equal(a.sim.debug, true);
	assert.equal(a.sim.s.credited.length, 0);
	a.sim.s.credited.push("reach-a");
	a.command("sector", 1);
	assert.equal(a.sim.s.credited.length, 0);
	assert.equal(a.sim.s.sector, 1);
	a.dispose();
});
test("paused developer steps and spawns refresh the displayed world immediately", () => {
	const a = F.create({ headless: true, loop: false });
	a.game.debug.start();
	a.game.pause("player");
	const tick = a.sim.s.tick;
	a.command("step");
	assert.equal(a.viewState.tick, tick + 1);
	a.command("spawn", "crystal");
	assert.equal(a.viewState.entities.length, a.sim.s.entities.length);
	a.dispose();
});
test("a held hyperspace input cannot re-spend restored sector energy", () => {
	const s = make();
	s.step(1 / 120, { 0: action(1, 0, 1, 0, false, true) });
	s.enter(1);
	s.s.spawned = F.MISSIONS[1].entries.map((q) => q.id);
	advance(s, 20, { 0: action(1, 0, 1, 0, false, true) });
	assert.equal(s.s.ship.drive, "ready");
	assert.equal(s.s.ship.energy, 100);
	s.step(1 / 120, { 0: neutral() });
	s.step(1 / 120, { 0: action(1, 0, 1, 0, false, true) });
	assert.equal(s.s.ship.drive, "windup");
});
test("host local input clearing preserves the remote navigator's committed windup", () => {
	const h = fakeHub(),
		a = F.create({ headless: true, loop: false, info: hubInfo(), hub: h });
	h.handlers.start();
	a.net.receive(
		{
			v: 1,
			k: "i",
			run: a.net.runId,
			seq: 1,
			tick: 0,
			a: action(1, 0, 1, 0, false, true),
		},
		1,
	);
	a.game.advance(0.05);
	assert.equal(a.sim.s.ship.drive, "windup");
	const held = a.sim._warpHeld;
	a.clearInput();
	assert.equal(a.sim.s.ship.drive, "windup");
	assert.equal(a.sim._warpHeld, held);
	a.game.advance(0.14);
	assert.equal(a.sim.s.ship.drive, "burst");
	a.dispose();
});
test("carrier extraction also preserves the hyperspace release latch", () => {
	const s = make();
	s.enter(3);
	s.s.entities = [];
	s.s.boss = { phase: "core", hull: { x: 7100, y: 135, w: 160, h: 120 } };
	s._warpHeld = true;
	s.bossDirector();
	assert.equal(s.s.phase, "extraction");
	s.step(1 / 120, { 0: action(1, 0, 1, 0, false, true) });
	assert.equal(s.s.ship.drive, "ready");
	assert.equal(s.s.extractionWarp, false);
});
test("all authored balance defaults survive validation and reset exactly", () => {
	equal(F.validateBalance(F.BALANCE), F.BALANCE);
	const a = F.create({ headless: true, loop: false });
	a.game.debug.start();
	a.sim.tune({ ...a.sim.balance, speed: 130, warning: 2 });
	a.command("reset");
	equal(a.sim.balance, F.BALANCE);
	a.dispose();
});
test("the opening mine-layer stages a visible linked-field collapse", () => {
	const s = make();
	s.enter(1);
	s.s.ship.x = 740;
	s.direct(0);
	const layer = s.s.entities.find((q) => q.id === "reach-layer");
	advance(s, 230);
	const linked = s.s.entities.filter(
		(q) => q.kind === "mine" && q.owner === layer.id && !q.dead,
	);
	assert.ok(linked.length > 0);
	s.kill(layer);
	assert.ok(linked.every((q) => q.state === "disarmed"));
	assert.ok(
		s.s.events.some(
			(e) => e.type === "collapse" && e.id === layer.id && e.count > 0,
		),
	);
});
function whole(mode, seed = 61421) {
	const a = F.create({ headless: true, loop: false });
	a.game.debug.start(mode, seed);
	const seen = new Set(),
		phases = new Set();
	let n = 0,
		shots = 0,
		warps = 0;
	for (; n < 24000 && !a.sim.s.outcome; n++) {
		const s = a.sim.s,
			act = F.pilot(a.sim);
		a.game.debug.inject(act);
		a.game.advance(0.05, { draw: false });
		for (const e of s.events) {
			if (e.kind) seen.add(e.kind);
			if (e.type === "bossPhase") phases.add(e.phase);
		}
		if (act.fire) shots++;
		if (act.warp) warps++;
	}
	const s = a.snapshot();
	writeFileSync(
		resolve(dev, `artifacts/playthrough-${mode}.json`),
		JSON.stringify(
			{
				seed,
				elapsed: s.elapsed,
				outcome: s.outcome,
				rescued: s.rescued,
				lost: s.lost,
				hull: s.ship.hull,
				score: s.score,
				seen: [...seen],
				bossPhases: [...phases],
				fireActions: shots,
				warpActions: warps,
				modified: s.debug,
				engineErrors: a.game.errors.map((e) => e.message),
			},
			null,
			2,
		),
	);
	assert.equal(s.debug, false);
	assert.equal(
		s.outcome,
		"victory",
		JSON.stringify({
			phase: s.phase,
			sector: s.sector,
			hull: s.ship.hull,
			x: s.ship.x,
			t: s.elapsed,
		}),
	);
	assert.equal(a.game.errors.length, 0);
	assert.ok(warps > 0);
	if (mode === "operation") {
		assert.ok(shots > 0);
		assert.ok(s.rescued.length >= 11);
		for (const k of ["layer", "guard", "interceptor", "mine", "organ", "core"])
			assert.ok(seen.has(k), k);
		equal([...phases], ["fields", "prisoners", "core", "destroyed"]);
	} else {
		assert.ok(s.elapsed >= 180);
		assert.ok(s.rescued.length > 0);
	}
	a.dispose();
	return s;
}
test("entire operation wins through ordinary observed actions without cheats", () =>
	whole("operation"));
test("entire Evasion wins through ordinary observed actions without cheats", () =>
	whole("evasion"));
test("final package preserves exact first-head Hub client and has no runtime neighbors", () => {
	const p = JSON.parse(readFileSync(resolve(dev, "project.json"), "utf8")),
		html = readFileSync(resolve(dev, "..", p.html), "utf8"),
		client = readFileSync(
			resolve(dev, "vendor/ai-hub/lib/hub/session.js"),
			"utf8",
		);
	assert.ok(html.startsWith("<!doctype html>"));
	assert.ok(
		html.includes('<meta charset="utf-8">\n<script>' + client + "</script>"),
	);
	assert.equal(html.split("/*! aihub-session 1.4.0").length - 1, 1);
	assert.equal((html.match(/<script[^>]+src=/g) || []).length, 0);
	assert.ok(html.includes('hub:session-mode" content="shared-world'));
});
test("metadata schema and catalogue values validate and agree with title", () => {
	const r = JSON.parse(
		readFileSync(resolve(dev, "..", "exit-interview.json"), "utf8"),
	);
	equal(Object.keys(r), [
		"sourceInformation",
		"testingFeedback",
		"engineFeedback",
		"promptFeedback",
		"aiHub",
	]);
	equal(Object.keys(r.sourceInformation), [
		"date",
		"source",
		"plan",
		"genre",
		"perspective",
		"tech",
		"artDirection",
		"animation",
		"audio",
		"online",
		"testing",
		"research",
		"environment",
		"model",
		"usage",
	]);
	assert.equal(r.sourceInformation.usage, "added on import");
	assert.equal(r.aiHub.name, F.TITLE);
	assert.equal(r.aiHub.type, "Game");
	assert.equal(r.aiHub.genre, "Shooter");
	assert.equal(r.aiHub.players, "1–2");
	for (const [key, n] of [
		["testingFeedback", 4],
		["engineFeedback", 6],
		["promptFeedback", 4],
	]) {
		assert.equal(r[key].length, n);
		assert.ok(r[key].every((x) => typeof x === "string" && x.length));
	}
	assert.ok(r.aiHub.tags.length >= 3 && r.aiHub.tags.length <= 6);
	assert.ok(r.aiHub.tags.every((x) => x === x.toLowerCase()));
	assert.ok(
		Object.values(r.sourceInformation).every(
			(x) => typeof x === "string" && x.length,
		),
	);
});
console.log(
	JSON.stringify({
		count,
		failures,
		logs: logs.filter((x) =>
			/error in|unknown|undefined|invalid|failed/i.test(x),
		),
	}),
);
