import assert from "node:assert/strict";
import { DEFAULTS, HouseGame } from "../core.mjs";

const failures = [];
let count = 0;
const warning = console.warn;
console.warn = () => {};
await HouseGame.init();
console.warn = warning;
function test(name, fn) {
	count++;
	try {
		fn();
	} catch (e) {
		failures.push(`${name}: ${e.message}`);
	}
}
const games = [];
function make() {
	const g = new HouseGame();
	g.reset([{ id: 0, name: "Test" }]);
	games.push(g);
	return g;
}
function walk(g, x, z) {
	const p = g.player(),
		path = g.pathTo(p, x, z);
	assert.ok(
		path.length || Math.hypot(p.x - x, p.z - z) < 0.6,
		"no navigable path",
	);
	for (const q of path) {
		let n = 0;
		while (Math.hypot(q.x - p.x, q.z - p.z) > 0.13 && n++ < 100) {
			const dx = q.x - p.x,
				dz = q.z - p.z,
				d = Math.hypot(dx, dz);
			g.update(1 / 60, { 0: { x: dx / d, z: dz / d } });
		}
		assert.ok(
			n < 100,
			`stuck near ${p.x.toFixed(1)},${p.z.toFixed(1)} towards ${q.x},${q.z}`,
		);
	}
	assert.ok(Math.hypot(p.x - x, p.z - z) < 0.9, "wrong destination");
}
function act(g) {
	g.player().stairCD = 0;
	return g.interact(g.player());
}
test("Four floors, three fragments, one key and one ward", () => {
	const g = make();
	assert.equal(g.items.length, 5);
	assert.equal(g.enemies.length, 12);
	assert.equal(g.visited.length, 4);
});
test("Rapier blocks solid walls", () => {
	const g = make(),
		p = g.player();
	g.teleport(p, -6, -8);
	for (let i = 0; i < 90; i++) g.update(1 / 60, { 0: { x: 1 } });
	assert.ok(p.x < -5.3, `crossed wall: ${p.x}`);
});
test("Rapier allows door crossings", () => {
	const g = make(),
		p = g.player();
	g.god = true;
	g.teleport(p, -6, -5);
	for (let i = 0; i < 70; i++) g.update(1 / 60, { 0: { x: 1 } });
	assert.ok(p.x > -2, "door blocked");
});
test("Match consumes one and expires", () => {
	const g = make(),
		p = g.player();
	assert.ok(g.ignite(p));
	assert.equal(p.matches, 15);
	assert.equal(p.match, 12);
	for (let i = 0; i < 721; i++) g.update(1 / 60);
	assert.equal(p.match, 0);
});
test("Holding match input does not consume repeatedly", () => {
	const g = make(),
		p = g.player();
	for (let i = 0; i < 60; i++) g.update(1 / 60, { 0: { match: true } });
	assert.equal(p.matches, 15);
});
test("No matches gives a usable hint", () => {
	const g = make(),
		p = g.player();
	p.matches = 0;
	assert.equal(g.ignite(p), false);
	assert.match(g.events.at(-1).text, /candle/);
});
test("Taking a second item swaps a single held object", () => {
	const g = make(),
		p = g.player();
	g.teleport(p, 10, -6.6);
	act(g);
	assert.equal(p.carry, "key");
	const ward = g.items.find((i) => i.id === "ward");
	ward.f = 0;
	ward.x = 10.6;
	ward.z = -6.6;
	g.teleport(p, 10.6, -6.6);
	act(g);
	assert.equal(p.carry, "ward");
	assert.equal(g.items.find((i) => i.id === "key").holder, null);
});
test("The brass lock consumes the key and stays open", () => {
	const g = make(),
		p = g.player();
	g.teleport(p, -12, -7, 1);
	assert.equal(act(g), false);
	assert.equal(p.f, 1);
	const key = g.items.find((i) => i.id === "key");
	key.holder = 0;
	p.carry = "key";
	assert.ok(act(g));
	assert.equal(p.f, 2);
	assert.equal(g.unlocked, true);
	assert.equal(p.carry, null);
	assert.equal(key.banked, true);
});
test("Safe candles refill and heal only once per floor", () => {
	const g = make(),
		p = g.player();
	g.teleport(p, 0, 5);
	p.matches = 0;
	p.health = 2;
	act(g);
	assert.equal(p.matches, 18);
	assert.equal(p.health, 3);
	p.health = 2;
	act(g);
	assert.equal(p.health, 2);
});
test("Unprotected wind extinguishes a match", () => {
	const g = make(),
		p = g.player();
	g.teleport(p, 10, 5);
	p.match = 8;
	g.time = DEFAULTS.windInterval - 4 - 0.01;
	g.update(0.02, { 0: {} });
	assert.equal(g.wind, 1);
	assert.equal(p.match, 0);
});
test("Hush protects immediately on the gust frame", () => {
	const g = make(),
		p = g.player();
	g.teleport(p, 10, 5);
	p.match = 8;
	g.time = DEFAULTS.windInterval - 4 - 0.01;
	g.update(0.02, { 0: { hush: true } });
	assert.ok(p.match > 7);
});
test("Scepter pulses stun nearby enemies and enforce cooldown", () => {
	const g = make(),
		p = g.player();
	p.carry = "ward";
	g.items.find((i) => i.id === "ward").holder = 0;
	const e = g.enemies[0];
	e.x = p.x + 2;
	e.z = p.z;
	assert.ok(g.pulse(p));
	assert.equal(e.stun, 6);
	assert.equal(g.pulse(p), false);
});
test("Bats snuff a lit match before harming nerves", () => {
	const g = make(),
		p = g.player();
	p.invuln = 0;
	p.match = 6;
	assert.ok(g.hit(p, { type: "bat" }));
	assert.equal(p.match, 0);
	assert.equal(p.health, 5);
});
test("A hit drops the held item and gives invulnerability", () => {
	const g = make(),
		p = g.player();
	p.invuln = 0;
	p.carry = "key";
	g.items.find((i) => i.id === "key").holder = 0;
	g.hit(p, { type: "ghost" });
	assert.equal(p.health, 4);
	assert.equal(p.carry, null);
	g.hit(p, { type: "ghost" });
	assert.equal(p.health, 4);
});
test("A zero-nerve solo player reaches loss", () => {
	const g = make(),
		p = g.player();
	p.health = 1;
	p.invuln = 0;
	g.hit(p, { type: "ghost" });
	assert.equal(g.status, "lost");
	assert.equal(g.finished, true);
});
test("Co-op companions keep the night alive", () => {
	const g = make(),
		p = g.player();
	g.addPlayer({ id: 1, name: "Friend" });
	p.health = 1;
	p.invuln = 0;
	g.hit(p, { type: "ghost" });
	assert.equal(g.status, "playing");
	assert.equal(p.health, 3);
	assert.equal(p.f, 0);
});
test("Snapshots restore all progression and physical bodies", () => {
	const a = make(),
		b = make();
	a.addPlayer({ id: 1 });
	a.unlocked = true;
	a.teleport(a.player(), 11, 3, 2);
	a.banked = ["shard0"];
	a.items[2].banked = true;
	assert.ok(b.apply(a.snapshot()));
	assert.equal(b.players.length, 2);
	assert.equal(b.player().f, 2);
	assert.equal(b.unlocked, true);
	assert.equal(b.bodies.size, 2);
	assert.equal(b.banked[0], "shard0");
});
test("Disconnect drops carried items", () => {
	const g = make();
	g.addPlayer({ id: 1 });
	const p = g.players[1];
	p.carry = "key";
	g.items[0].holder = 1;
	g.removePlayer(1);
	assert.equal(g.items[0].holder, null);
	assert.equal(g.players.length, 1);
});
test("Complete physical playthrough recovers all fragments and escapes", () => {
	const g = make(),
		p = g.player();
	g.god = true;
	walk(g, 10, -6.6);
	act(g);
	assert.equal(p.carry, "key");
	walk(g, 12, 7);
	act(g);
	assert.equal(p.f, 1);
	walk(g, -12, -7);
	act(g);
	assert.equal(p.f, 2);
	assert.ok(g.unlocked);
	walk(g, -10, 5.8);
	act(g);
	assert.equal(p.carry, "shard1");
	walk(g, -12, -7);
	act(g);
	walk(g, 12, 7);
	act(g);
	assert.equal(p.f, 0);
	walk(g, 0, 6.2);
	act(g);
	assert.ok(g.banked.includes("shard1"));
	walk(g, 12, 7);
	act(g);
	walk(g, 0, -5.8);
	act(g);
	assert.equal(p.carry, "shard0");
	walk(g, 12, 7);
	act(g);
	walk(g, 0, 6.2);
	act(g);
	assert.equal(g.banked.length, 2);
	walk(g, 12, 7);
	act(g);
	walk(g, -12, -7);
	act(g);
	walk(g, 12, 7);
	act(g);
	assert.equal(p.f, 3);
	walk(g, 10, -6.2);
	act(g);
	assert.equal(p.carry, "shard2");
	walk(g, 12, 7);
	act(g);
	walk(g, -12, -7);
	act(g);
	walk(g, 12, 7);
	act(g);
	assert.equal(p.f, 0);
	walk(g, 0, 6.2);
	act(g);
	assert.equal(g.banked.length, 3);
	walk(g, 0, 9);
	act(g);
	assert.equal(g.status, "won");
	assert.ok(g.stairsUsed >= 12);
	assert.equal(g.recovered, 3);
});
test("Co-op escape waits for every guest in the foyer", () => {
	const g = make(),
		p = g.player();
	g.addPlayer({ id: 1 });
	g.banked = ["shard0", "shard1", "shard2"];
	g.teleport(p, 0, 9, 0);
	g.teleport(g.players[1], 10, 5, 2);
	assert.equal(act(g), false);
	assert.equal(g.status, "playing");
	g.teleport(g.players[1], 1, 5, 0);
	assert.equal(act(g), true);
	assert.equal(g.status, "won");
});
for (const g of games) g.dispose();
process.stdout.write(JSON.stringify({ count, failures }));
