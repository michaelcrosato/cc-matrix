import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { CONTENT, DEFAULT_TUNING, FLOORS, ITEMS } from "../src/content.js";
import {
	addPlayer,
	advance,
	attackPreview,
	command,
	createRun,
	developer,
	importContent,
	lineOfSight,
	removePlayer,
	restore,
	restPreview,
	retryCheckpoint,
	setTuning,
	snapshot,
	validateContent,
	walkable,
} from "../src/core.js";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
let recording = null;
const run = (s, a, id = "solo") => {
	if (recording)
		recording.push({ id, action: structuredClone(a), now: s.clock + 100 });
	const r = command(s, id, a, s.clock + 100);
	assert(r.ok, `${a.type}: ${r.reason}`);
	return r;
};
const fresh = () => createRun();
const dirs = [
	{ dx: 1, dy: 0 },
	{ dx: 0, dy: 1 },
	{ dx: -1, dy: 0 },
	{ dx: 0, dy: -1 },
];
function path(s, target, radius = 0) {
	const p = s.players.solo,
		queue = [{ x: p.x, y: p.y, path: [] }],
		seen = new Set([`${p.x},${p.y}`]);
	while (queue.length) {
		const n = queue.shift();
		if (Math.abs(n.x - target.x) + Math.abs(n.y - target.y) <= radius)
			return n.path;
		for (const d of dirs) {
			const x = n.x + d.dx,
				y = n.y + d.dy,
				k = `${x},${y}`;
			if (
				seen.has(k) ||
				!walkable(s, x, y, {
					ignoreDoor: true,
					ignoreSecret: true,
					ignoreEnemy: true,
				})
			)
				continue;
			seen.add(k);
			queue.push({ x, y, path: [...n.path, d] });
		}
	}
	throw new Error(`No path to ${target.x},${target.y} floor${s.floor}`);
}
function rest(s) {
	const p = s.players.solo;
	let n = 0;
	while ((p.war < p.maxWar || p.spirit < p.maxSpirit) && p.food > 0) {
		run(s, { type: "rest", confirm: true });
		if (++n > 30) throw new Error("Rest loop");
	}
}
function equip(s, kind) {
	const p = s.players.solo;
	if (p.right?.kind === kind) return;
	const slot = p.pack.findIndex((i) => i?.kind === kind);
	if (slot >= 0) run(s, { type: "equip", slot });
	else if (p.left?.kind === kind) run(s, { type: "swap" });
	else throw new Error(`Missing ${kind}`);
}
function wear(s, kind) {
	const p = s.players.solo;
	if (p[kind]) return;
	const slot = p.pack.findIndex((i) => i?.kind === kind);
	if (slot >= 0) run(s, { type: "use", slot });
}
function fight(s) {
	let count = 0;
	while (s.encounter) {
		if (++count > 120) throw new Error(`Combat stuck ${s.encounter.id}`);
		const p = s.players.solo,
			e = s.enemies.find((e) => s.encounter.enemies.includes(e.id) && e.alive);
		if (s.encounter.preparation) {
			rest(s);
			run(s, { type: "continueBoss" });
			continue;
		}
		const choices = [
			{ type: "attack" },
			...(p.unlocks.spirit ? [{ type: "attack", channel: "spirit" }] : []),
			{ type: "attack", channel: "war" },
			...p.pack
				.map((it, slot) =>
					it && ITEMS[it.kind].channel ? { type: "attack", slot } : null,
				)
				.filter(Boolean),
		];
		const valid = choices
			.map((a) => ({ a, v: attackPreview(s, "solo", a) }))
			.filter(
				({ v }) =>
					v?.ok &&
					Math.abs(p.x - e.x) + Math.abs(p.y - e.y) <= v.range &&
					lineOfSight(s, p, e),
			);
		valid.sort(
			(a, b) =>
				Math.ceil(e[a.v.channel] / a.v.damage) -
					Math.ceil(e[b.v.channel] / b.v.damage) || b.v.damage - a.v.damage,
		);
		if (!valid.length) {
			const approach = path(s, e, 1);
			run(s, { type: "move", ...approach[0] });
			continue;
		}
		if (e.intent?.power > 0 && p[e.intent.channel] < 10) {
			const potion = p.pack.findIndex((i) => i?.kind === "potion");
			if (potion >= 0) {
				run(s, { type: "use", slot: potion });
				continue;
			}
		}
		run(s, valid[0].a);
		assert.equal(s.status, "playing", `Died at ${e.id}; ${p.war}/${p.spirit}`);
	}
	rest(s);
}
function go(s, target, radius = 0) {
	let count = 0;
	while (
		Math.abs(s.players.solo.x - target.x) +
			Math.abs(s.players.solo.y - target.y) >
		radius
	) {
		if (++count > 200) throw new Error("Path loop");
		if (s.encounter) fight(s);
		const route = path(s, target, radius),
			d = route[0];
		assert(d, "Missing route");
		const p = s.players.solo,
			x = p.x + d.dx,
			y = p.y + d.dy;
		const door = s.doors.find((e) => e.x === x && e.y === y && !e.open);
		const secret = s.features.find(
			(e) => e.x === x && e.y === y && e.kind === "secret" && !e.open,
		);
		if (door) run(s, { type: "interact", target: door.id });
		else if (secret) run(s, { type: "interact", target: secret.id });
		else run(s, { type: "move", ...d });
	}
	if (s.encounter) fight(s);
}
function take(s, id) {
	const l = s.loot.find((l) => l.id === id && !l.claimed);
	assert(l, `Missing loot ${id}`);
	go(s, l, 1);
	if (recording)
		recording.push({
			id: "solo",
			action: { type: "pickup", target: id },
			now: s.clock + 100,
		});
	const result = command(
		s,
		"solo",
		{ type: "pickup", target: id },
		s.clock + 100,
	);
	if (result.needs === "swap") {
		const p = s.players.solo;
		const replace = p.pack.findIndex(
			(it) => it && ["blade", "throwing", "scroll", "potion"].includes(it.kind),
		);
		assert(replace >= 0, "No expendable pack slot");
		run(s, { type: "pickup", target: id, replace });
	} else assert(result.ok, result.reason);
}
export function fullPlaythrough() {
	const s = fresh();
	run(s, { type: "move", dx: 1, dy: 0 });
	fight(s);
	take(s, "upper-rune");
	equip(s, "rune");
	take(s, "upper-key");
	take(s, "upper-rations");
	take(s, "upper-arrows");
	take(s, "upper-scroll");
	take(s, "upper-mail");
	wear(s, "armor");
	go(s, { x: 7, y: 6 });
	go(s, FLOORS[0].ladder, 1);
	run(s, { type: "interact", target: "ladder", confirm: true });
	assert.equal(s.floor, 1);
	assert(s.unlockedSpirit);
	assert(s.keyring.includes("brass"));
	assert(s.floors[0].doors[0].open);
	take(s, "passage-ring");
	wear(s, "ring");
	take(s, "passage-training");
	let slot = s.players.solo.pack.findIndex((i) => i?.kind === "warBook");
	run(s, { type: "use", slot });
	assert.equal(s.players.solo.maxWar, 46);
	go(s, { x: 5, y: 2 });
	take(s, "passage-rations");
	go(s, { x: 3, y: 7 }, 1);
	run(s, { type: "interact", target: "wired-coffer" });
	run(s, { type: "interact", target: "wired-coffer" });
	run(s, { type: "interact", target: "wired-coffer" });
	take(s, "wired-coffer:reward");
	take(s, "passage-sight");
	slot = s.players.solo.pack.findIndex((i) => i?.kind === "sightBook");
	run(s, { type: "use", slot });
	go(s, { x: 5, y: 3 }, 1);
	run(s, { type: "interact", target: "breath-gate", confirm: true });
	fight(s);
	assert.equal(s.stats.gates, 1);
	go(s, { x: 8, y: 3 }, 1);
	run(s, { type: "interact", target: "sighing-wall" });
	take(s, "secret-spirit");
	slot = s.players.solo.pack.findIndex((i) => i?.kind === "spiritBook");
	run(s, { type: "use", slot });
	go(s, FLOORS[1].ladder, 1);
	run(s, { type: "descend", confirm: true });
	assert.equal(s.floor, 2);
	take(s, "approach-rations");
	take(s, "approach-potion");
	take(s, "approach-arrows");
	take(s, "approach-scroll");
	go(s, { x: 7, y: 7 });
	rest(s);
	go(s, { x: 7, y: 5 });
	if (s.encounter) fight(s);
	assert(s.bossDefeated, "Warden not defeated");
	assert(!s.treasureClaimed, "Victory before claim");
	assert.equal(s.status, "playing");
	go(s, { x: 9, y: 5 }, 1);
	run(s, { type: "interact", target: "treasure" });
	assert.equal(s.status, "victory");
	assert(s.treasureClaimed);
	assert(s.stats.secrets >= 1);
	assert(s.stats.rests > 0);
	assert(s.stats.kills >= 7);
	assert(s.enemies.find((e) => e.id === "warden").phase === 3);
	return s;
}
export function scriptedRoute() {
	const previous = recording;
	recording = [];
	const final = fullPlaythrough();
	const actions = recording;
	recording = previous;
	return { actions, final };
}
test("Authored content validates", () =>
	assert.deepEqual(validateContent(), []));
test("Six slots, two hands, durable fallback and default strengths", () => {
	const s = fresh(),
		p = s.players.solo;
	assert.equal(p.pack.length, 6);
	assert(p.left && p.right);
	assert.equal(p.war, 36);
	assert.equal(p.spirit, 24);
	assert.equal(attackPreview(s, "solo", { channel: "war" }).power, 3);
	assert.equal(attackPreview(s, "solo", { channel: "spirit" }).ok, false);
});
test("Rest is previewed, clamps, and never wastes food", () => {
	const s = fresh(),
		p = s.players.solo;
	assert(!command(s, "solo", { type: "rest", confirm: true }).ok);
	p.war = 34;
	p.spirit = 23;
	const f = p.food,
		r = command(s, "solo", { type: "rest" });
	assert.equal(r.needs, "confirm");
	assert.deepEqual(restPreview(s, "solo"), { food: 1, war: 2, spirit: 1 });
	assert.equal(p.food, f);
	run(s, { type: "rest", confirm: true });
	assert.equal(p.war, 36);
	assert.equal(p.spirit, 24);
	assert.equal(p.food, f - 1);
});
test("Invalid movement and attack consume neither turns nor ammo", () => {
	const s = fresh(),
		p = s.players.solo;
	const ammo = p.arrows;
	assert(!command(s, "solo", { type: "move", dx: -1, dy: 0 }).ok);
	assert(!command(s, "solo", { type: "attack", target: "missing" }).ok);
	assert.equal(p.arrows, ammo);
	assert.equal(s.stats.rounds, 0);
});
test("Deterministic damage, kill before scheduled enemy hit, ammo costs", () => {
	const s = fresh(),
		p = s.players.solo;
	run(s, { type: "move", dx: 1, dy: 0 });
	assert(s.encounter);
	const before = p.war;
	run(s, { type: "attack" });
	assert.equal(p.war, before - 4);
	assert.equal(p.arrows, 8);
	assert.equal(s.enemies[0].war, 7);
	run(s, { type: "attack" });
	assert.equal(p.war, before - 4);
	assert.equal(p.arrows, 7);
	assert(!s.enemies[0].alive);
	assert(!s.encounter);
});
test("Guard blocks matching hit and exposes exact reductions", () => {
	const s = fresh();
	run(s, { type: "move", dx: 1, dy: 0 });
	const p = s.players.solo,
		b = p.war;
	run(s, { type: "guard" });
	assert.equal(p.war, b);
	const hit = s.events.findLast((e) => e.type === "damage");
	assert.equal(hit.guard, 4);
	assert.equal(hit.damage, 0);
});
test("Armor and left shield reduce War separately from Spirit ring", () => {
	const s = fresh(),
		p = s.players.solo;
	run(s, { type: "equip", slot: 0 });
	run(s, { type: "swap" });
	assert.equal(p.left.kind, "shield");
	p.armor = { id: "testmail", kind: "armor" };
	p.ring = { id: "testring", kind: "ring" };
	run(s, { type: "move", dx: 1, dy: 0 });
	const b = p.war;
	run(s, { type: "guard", channel: "spirit" });
	assert.equal(p.war, b);
	const hit = s.events.findLast((e) => e.type === "damage");
	assert.equal(hit.defense, 4);
	assert.equal(hit.guard, 0);
});
test("Retreat previews parting strike and returns to validated safe tile", () => {
	const s = fresh();
	run(s, { type: "move", dx: 1, dy: 0 });
	const p = s.players.solo,
		b = p.war;
	assert.equal(command(s, "solo", { type: "retreat" }).needs, "confirm");
	assert(s.encounter);
	run(s, { type: "retreat", confirm: true });
	assert(!s.encounter);
	assert.equal(p.x, 1);
	assert.equal(p.y, 1);
	assert(p.war < b);
});
test("Spirit offense never consumes own survival pool; zero Spirit defeats", () => {
	const s = fresh(),
		p = s.players.solo;
	p.unlocks.spirit = true;
	p.right = { id: "testrune", kind: "rune" };
	run(s, { type: "move", dx: 1, dy: 0 });
	const b = p.spirit;
	run(s, { type: "attack" });
	assert.equal(p.spirit, b);
	s.enemies[0].intent.channel = "spirit";
	s.enemies[0].intent.power = 99;
	run(s, { type: "guard", channel: "war" });
	assert.equal(p.spirit, 0);
	assert(p.down);
	assert.equal(s.status, "defeat");
});
test("Full pack cancellation preserves loot and stable replacement IDs", () => {
	const s = fresh(),
		p = s.players.solo;
	p.pack = p.pack.map((it, i) => it || { id: `fill${i}`, kind: "potion" });
	const l = s.loot.find((l) => l.id === "upper-rune");
	p.x = l.x;
	p.y = l.y;
	const r = command(s, "solo", { type: "pickup", target: l.id });
	assert.equal(r.needs, "swap");
	assert(!l.claimed);
	const old = p.pack[0].id;
	run(s, { type: "pickup", target: l.id, replace: 0 });
	assert.equal(p.pack[0].id, l.id);
	assert(s.loot.some((e) => e.id === old && !e.claimed));
	assert(!command(s, "solo", { type: "pickup", target: l.id }).ok);
	assert(p.unlocks.spirit);
});
test("Single use and reusable items have correct costs", () => {
	const s = fresh(),
		p = s.players.solo;
	run(s, { type: "move", dx: 1, dy: 0 });
	const iid = p.pack[2].id;
	run(s, { type: "attack", slot: 2 });
	assert.equal(p.pack[2], null);
	assert.equal(s.enemies[0].war, 0);
	assert(!s.loot.some((l) => l.id === iid));
	const r = fresh();
	r.players.solo.right = { id: "rune", kind: "rune" };
	r.players.solo.unlocks.spirit = true;
	run(r, { type: "move", dx: 1, dy: 0 });
	run(r, { type: "attack" });
	assert.equal(r.players.solo.right.id, "rune");
});
test("Co-op first commitment owns one deadline; defaults guard; one resolution", () => {
	const s = createRun({
		players: [
			{ id: "a", name: "A" },
			{ id: "b", name: "B" },
		],
		mode: "coop",
	});
	run(s, { type: "move", dx: 1, dy: 0 }, "a");
	const round = s.encounter.round;
	run(s, { type: "attack", round }, "a");
	const deadline = s.encounter.deadline;
	assert(!command(s, "a", { type: "attack", round }, s.clock + 50).ok);
	assert.equal(s.encounter.deadline, deadline);
	advance(s, deadline);
	assert.equal(s.stats.rounds, 1);
	assert.equal(s.enemies[0].war, s.enemies[0].maxWar - 8);
	advance(s, deadline + 1);
	assert.equal(s.stats.rounds, 1);
	assert(!command(s, "a", { type: "attack", round }, s.clock).ok);
});
test("Revive from either empty pool consumes one ration and preserves higher pool", () => {
	for (const channel of ["war", "spirit"]) {
		const s = createRun({ players: [{ id: "a" }, { id: "b" }], mode: "coop" }),
			a = s.players.a,
			b = s.players.b;
		b[channel] = 0;
		b.down = true;
		const other = channel === "war" ? "spirit" : "war",
			higher = b[other],
			food = a.food;
		run(s, { type: "revive", target: "b" }, "a");
		assert(!b.down);
		assert(
			b[channel] >=
				Math.ceil(b[channel === "war" ? "maxWar" : "maxSpirit"] * 0.3),
		);
		assert.equal(b[other], higher);
		assert.equal(a.food, food - 1);
		b.down = true;
		b[channel] = 0;
		a.food = 0;
		assert(!command(s, "a", { type: "revive", target: "b" }).ok);
		assert(b.down);
	}
});
test("Loot claim has one authoritative winner and nearby handoff is atomic", () => {
	const s = createRun({ players: [{ id: "a" }, { id: "b" }], mode: "coop" }),
		a = s.players.a,
		b = s.players.b,
		l = s.loot.find((l) => l.item === "rune");
	a.x = b.x = l.x;
	a.y = b.y = l.y;
	run(s, { type: "pickup", target: l.id }, "a");
	assert(!command(s, "b", { type: "pickup", target: l.id }).ok);
	const slot = a.pack.findIndex((i) => i?.kind === "rune");
	run(s, { type: "handoff", slot, to: "b" }, "a");
	assert(!a.pack[slot]);
	assert(b.pack.some((i) => i?.id === l.id));
});
test("Departure recovers reachable bags and cannot hold committed round", () => {
	const s = createRun({ players: [{ id: "a" }, { id: "b" }], mode: "coop" });
	run(s, { type: "move", dx: 1, dy: 0 }, "a");
	run(s, { type: "attack" }, "a");
	const intent = JSON.stringify(s.enemies[0].intent);
	removePlayer(s, "b");
	assert.equal(s.stats.rounds, 1);
	assert(s.loot.some((l) => l.bag === "b" && l.item === "bow"));
	assert.equal(s.players.b.connected, false);
	assert(s.players.a.unlocks.war);
	assert(intent);
});
test("Downed ally follows descent without blocking or spontaneous revival", () => {
	const s = createRun({ players: [{ id: "a" }, { id: "b" }], mode: "coop" });
	s.players.a.x = 9;
	s.players.a.y = 1;
	s.players.b.down = true;
	s.players.b.spirit = 0;
	run(s, { type: "descend", confirm: true }, "a");
	assert.equal(s.floor, 1);
	assert(s.players.b.down);
	assert.equal(s.players.b.spirit, 0);
	assert.equal(s.players.a.x, s.players.b.x);
});
test("Gate preview floors pools at one and cannot be farmed repeatedly", () => {
	const s = fresh();
	developer(s, "solo", "floor", 1);
	const p = s.players.solo;
	p.x = 5;
	p.y = 3;
	p.war = 2;
	p.spirit = 3;
	assert.equal(
		command(s, "solo", { type: "interact", target: "breath-gate" }).needs,
		"confirm",
	);
	assert.equal(p.war, 2);
	run(s, { type: "interact", target: "breath-gate", confirm: true });
	assert.equal(p.war, 1);
	assert.equal(p.spirit, 9);
	assert(walkable(s, p.x, p.y, { ignoreEnemy: true }));
	assert(!s.enemies.some((e) => e.alive && e.x === p.x && e.y === p.y));
});
test("Save restores aliases and exact replay; corrupt data is rejected", () => {
	const s = fresh();
	run(s, { type: "move", dx: 0, dy: 1 });
	const restored = restore(JSON.stringify(snapshot(s)));
	assert.deepEqual(snapshot(restored), snapshot(s));
	run(s, { type: "move", dx: 0, dy: 1 });
	run(restored, { type: "move", dx: 0, dy: 1 });
	assert.deepEqual(snapshot(restored), snapshot(s));
	assert.throws(() => restore("{bad"));
	const bad = snapshot(s);
	bad.players.solo.pack = [];
	assert.throws(() => restore(bad));
});
test("Floor-entry retry restores viable food, strength, and prior entities", () => {
	const s = fresh();
	s.players.solo.war = 0;
	s.players.solo.food = 0;
	s.status = "defeat";
	assert(retryCheckpoint(s).ok);
	assert.equal(s.status, "playing");
	assert.equal(s.players.solo.war, 36);
	assert.equal(s.players.solo.food, 7);
	assert(s.enemies[0].alive);
});
test("Tuning applies bounds and reset; scored modes reject mutations", () => {
	const s = fresh();
	assert(setTuning(s, { playerDamage: 2, maxWar: 50 }).ok);
	assert.equal(s.players.solo.maxWar, 50);
	assert(s.modified);
	assert(setTuning(s, DEFAULT_TUNING).ok);
	assert.equal(s.players.solo.maxWar, 36);
	assert(
		s.modified,
		"Resetting balance cannot erase prior modified-run provenance",
	);
	const h = createRun({ mode: "hub" });
	assert(!setTuning(h, { enemyDamage: 0 }).ok);
	assert(!developer(h, "solo", "supplies").ok);
});
test("Content import validates before replacing authored content", () => {
	const bad = structuredClone(CONTENT);
	bad.floors[0].enemies[0].kind = "missing";
	assert(!importContent(bad).ok);
	assert.equal(FLOORS[0].enemies[0].kind, "skeleton");
	assert(importContent(structuredClone(CONTENT)).ok);
});
test("Malformed content never throws and cannot destroy the current campaign", () => {
	for (const value of [
		null,
		[],
		{},
		"bad",
		"{bad",
		{
			version: 1,
			items: {},
			enemies: {},
			floors: [
				{ rows: ["###", "#.#", "###"], loot: {}, features: {} },
				null,
				{},
			],
		},
	]) {
		assert.doesNotThrow(() => validateContent(value));
		const r = importContent(value);
		assert.equal(r.ok, false);
	}
	assert.deepEqual(validateContent(), []);
});
test("Validator detects a key locked behind its own door", () => {
	const c = structuredClone(CONTENT),
		f = c.floors[0];
	f.rows = [
		"###########",
		"#...#.....#",
		"#...#.#.###",
		"#.....#...#",
		"###.###.#.#",
		"#...#...#.#",
		"#.#.#.#...#",
		"#.........#",
		"###########",
	];
	f.loot = f.loot.filter((l) => l.item !== "key");
	f.loot.push({ id: "own-lock-key", item: "key", key: "brass", x: 9, y: 1 });
	f.doors = [{ id: "sealed-key-door", x: 8, y: 1, key: "brass", open: false }];
	assert(validateContent(c).some((e) => /key\/lock order/.test(e)));
});
test("Validator rejects gate landing collision and one-way isolated region", () => {
	const c = structuredClone(CONTENT),
		f = c.floors[1],
		g = f.features.find((x) => x.kind === "gate");
	g.destination = { x: 7, y: 5 };
	assert(validateContent(c).some((e) => /inside an enemy/.test(e)));
	g.destination = { x: 9, y: 3 };
	f.rows[2] = "#.###.#.###";
	f.rows[4] = "###.###.###";
	f.features = f.features.filter((x) => x.kind !== "secret");
	f.rows[3] = "#.....##..#";
	assert(validateContent(c).some((e) => /strands its objective/.test(e)));
});
test("Restore rejects nonfinite counters, fractional positions, mismatched down states and unknown objects", () => {
	for (const change of [
		(p) => (p.food = NaN),
		(p) => (p.arrows = Infinity),
		(p) => (p.x = 1.5),
		(p) => (p.y = -4),
		(p) => (p.dir = 5),
		(p) => (p.right = { id: "x", kind: "unknown" }),
		(p) => (p.war = 0),
	]) {
		const bad = snapshot(fresh());
		change(bad.players.solo);
		assert.throws(() => restore(bad));
	}
});
test("Scroll consumption, shielded zero damage, permanent books and wall-sight duration", () => {
	const s = fresh(),
		p = s.players.solo;
	run(s, { type: "move", dx: 1, dy: 0 });
	p.pack[3] = { id: "testscroll", kind: "scroll" };
	run(s, { type: "attack", slot: 3 });
	assert.equal(p.pack[3], null);
	assert.equal(p.spirit, 24);
	assert.equal(s.enemies[0].spirit, 5);
	while (s.encounter) run(s, { type: "attack" });
	p.pack[3] = { id: "book", kind: "spiritBook" };
	run(s, { type: "use", slot: 3 });
	assert.equal(p.maxSpirit, 32);
	assert.equal(p.pack[3], null);
	p.pack[3] = { id: "sight", kind: "sightBook" };
	run(s, { type: "use", slot: 3 });
	assert.equal(p.sightUntil, s.clock + 60000);
	assert.equal(p.pack[3].id, "sight");
	const z = fresh();
	z.players.solo.unlocks.spirit = true;
	z.enemies[0].armor = 5;
	run(z, { type: "move", dx: 1, dy: 0 });
	assert.equal(attackPreview(z, "solo", { channel: "war" }).damage, 0);
	run(z, { type: "attack", channel: "war" });
	assert.equal(z.enemies[0].war, z.enemies[0].maxWar);
});
test("Boss phase changes preserve earned damage, give preparation, and do not count as victory", () => {
	const s = fresh();
	developer(s, "solo", "floor", 2);
	developer(s, "solo", "encounter", "warden");
	s.modified = false;
	const p = s.players.solo,
		e = s.enemies.find((x) => x.id === "warden");
	p.right = { id: "scroll", kind: "scroll" };
	p.pack[3] = { id: "scroll2", kind: "scroll" };
	const w = e.war;
	run(s, { type: "attack" });
	assert.equal(e.spirit, 54);
	assert.equal(e.phase, 1);
	run(s, { type: "attack", slot: 3 });
	assert.equal(e.phase, 2);
	assert(s.encounter.preparation);
	assert.equal(e.war, w);
	assert.equal(e.spirit, 36);
	assert(!s.bossDefeated);
	assert(!s.treasureClaimed);
	const before = e.spirit;
	advance(s, s.clock + 100000);
	assert.equal(e.spirit, before);
	assert(s.encounter.preparation);
	run(s, { type: "continueBoss" });
	assert.equal(e.intent.channel, "spirit");
});
test("Departed allies cannot consume revival food or receive lost handoffs", () => {
	const s = createRun({ players: [{ id: "a" }, { id: "b" }], mode: "coop" });
	s.players.b.war = 0;
	s.players.b.down = true;
	removePlayer(s, "b");
	const food = s.players.a.food,
		it = s.players.a.pack[0];
	assert(!command(s, "a", { type: "revive", target: "b" }).ok);
	assert(!command(s, "a", { type: "handoff", slot: 0, to: "b" }).ok);
	assert.equal(s.players.a.food, food);
	assert.equal(s.players.a.pack[0], it);
});
test("Wired coffer can spring exactly once; inspection/disarm prevents its damage", () => {
	for (const safe of [true, false]) {
		const s = fresh();
		developer(s, "solo", "floor", 1);
		const p = s.players.solo;
		p.x = 3;
		p.y = 7;
		const before = p.spirit;
		if (safe) {
			run(s, {
				type: "interact",
				target: "wired-coffer",
				operation: "inspect",
			});
			run(s, { type: "interact", target: "wired-coffer", operation: "disarm" });
		}
		run(s, { type: "interact", target: "wired-coffer", operation: "open" });
		assert.equal(p.spirit, before - (safe ? 0 : 6));
		assert.equal(
			s.loot.filter((l) => l.id === "wired-coffer:reward").length,
			1,
		);
		assert(
			!command(s, "solo", {
				type: "interact",
				target: "wired-coffer",
				operation: "open",
			}).ok,
		);
		assert.equal(p.spirit, before - (safe ? 0 : 6));
	}
	const down = fresh();
	developer(down, "solo", "floor", 1);
	down.players.solo.x = 3;
	down.players.solo.y = 7;
	down.players.solo.spirit = 4;
	run(down, { type: "interact", target: "wired-coffer", operation: "open" });
	assert.equal(down.status, "defeat");
	assert(down.players.solo.down);
});
test("Every normal hit reports an arithmetically exact absorbed-defense reduction", () => {
	const s = fresh();
	s.players.solo.unlocks.spirit = true;
	s.enemies[0].armor = 5;
	run(s, { type: "move", dx: 1, dy: 0 });
	run(s, { type: "attack", channel: "war" });
	const outgoing = s.events.findLast((e) => e.type === "attack");
	assert.equal(outgoing.power - outgoing.defense, outgoing.damage);
	assert.equal(outgoing.damage, 0);
	assert.equal(outgoing.defenseRating, 5);
	s.players.solo.armor = { id: "mail", kind: "armor" };
	s.players.solo.left = { id: "shield", kind: "shield" };
	run(s, { type: "guard" });
	const incoming = s.events.findLast((e) => e.type === "damage");
	assert.equal(
		incoming.power - incoming.defense - incoming.guard,
		incoming.damage,
	);
	assert.equal(incoming.damage, 0);
});
test("Emergency potion is consumed once and costs a real combat round", () => {
	const s = fresh(),
		p = s.players.solo;
	p.war = 20;
	p.spirit = 10;
	run(s, { type: "move", dx: 1, dy: 0 });
	run(s, { type: "use", slot: 1 });
	assert.equal(p.pack[1], null);
	assert.equal(p.war, 32);
	assert.equal(p.spirit, 22);
	assert.equal(s.stats.rounds, 1);
	assert.equal(p.food, 7);
	const round = s.stats.rounds;
	assert(!command(s, "solo", { type: "use", slot: 1 }).ok);
	assert.equal(s.stats.rounds, round);
});
test("An empty bow never spends ammunition or a turn; learned spark survives dropping its rune", () => {
	const s = fresh(),
		p = s.players.solo;
	run(s, { type: "move", dx: 1, dy: 0 });
	p.arrows = 0;
	assert(!command(s, "solo", { type: "attack" }).ok);
	assert.equal(p.arrows, 0);
	assert.equal(s.stats.rounds, 0);
	run(s, { type: "attack", slot: 2 });
	p.x = 3;
	p.y = 2;
	run(s, { type: "pickup", target: "upper-rune" });
	const slot = p.pack.findIndex((it) => it?.kind === "rune");
	run(s, { type: "drop", slot });
	assert(p.unlocks.spirit);
	assert(attackPreview(s, "solo", { channel: "spirit" }).ok);
});
test("Late join shares the current floor and learned fallback without rescaling an active foe", () => {
	const s = createRun({ players: [{ id: "a" }], mode: "coop" });
	s.unlockedSpirit = true;
	s.players.a.unlocks.spirit = true;
	run(s, { type: "move", dx: 1, dy: 0 }, "a");
	const war = s.enemies[0].maxWar;
	assert(addPlayer(s, { id: "b", name: "B" }).ok);
	assert.equal(s.players.b.x, s.players.a.x);
	assert(s.players.b.unlocks.spirit);
	assert.equal(s.enemies[0].maxWar, war);
	assert(!addPlayer(s, { id: "c" }).ok);
});
test("Attacks during a broken-seal preparation return a no-cost failure and preserve earned damage", () => {
	const s = fresh();
	developer(s, "solo", "floor", 2);
	developer(s, "solo", "encounter", "warden");
	const p = s.players.solo;
	p.right = { id: "preparation-scroll-one", kind: "scroll" };
	p.pack[3] = { id: "preparation-scroll-two", kind: "scroll" };
	run(s, { type: "attack" });
	run(s, { type: "attack", slot: 3 });
	assert(s.encounter.preparation);
	const e = s.enemies.find((enemy) => enemy.id === "warden");
	const before = snapshot(s);
	for (const action of [
		{ type: "attack" },
		{ type: "attack", channel: "spirit" },
		{ type: "attack", target: "warden", slot: 2 },
	]) {
		const result = command(s, "solo", action, s.clock);
		assert.equal(result.ok, false);
		assert.match(result.reason, /seal|prepar/i);
		assert.deepEqual(snapshot(s), before);
	}
	assert.equal(e.spirit, 36);
	assert.equal(e.phase, 2);
	run(s, { type: "continueBoss" });
	assert.equal(s.encounter.preparation, false);
	assert.equal(e.spirit, 36);
	assert.equal(e.intent.channel, "spirit");
});
test("Full normal-rules solo route completes all floors, secret, gate, three phases and deliberate claim", () => {
	const s = fullPlaythrough();
	assert.equal(s.modified, false);
	assert.equal(s.invulnerable, false);
	assert.equal(s.floor, 2);
});

export async function verifyCore() {
	const failures = [];
	for (const t of tests) {
		try {
			await t.fn();
		} catch (e) {
			failures.push({ name: t.name, error: e.stack || String(e) });
		}
	}
	return { count: tests.length, failures };
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const r = await verifyCore();
	for (const f of r.failures) console.error(`FAIL ${f.name}\n${f.error}`);
	console.log(`${r.count - r.failures.length}/${r.count} core checks passed`);
	process.exitCode = r.failures.length ? 1 : 0;
}
