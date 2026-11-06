import { DOORS, lockId, propsFor, ROOMS } from "../data.js";
import { Mansion, readyPhysics } from "../model.js";

await readyPhysics;
const checks = [];
const check = (name, pass, detail = "") =>
	checks.push({ name, pass: !!pass, detail });
const events = [];
const m = new Mansion((kind, data) => events.push({ kind, data }));
const advance = (s, input = {}) => {
	for (let i = 0; i < Math.ceil(s * 60); i++) m.step(1 / 60, input);
};
const reset = () => {
	m.cheats = {
		invincible: false,
		noclip: false,
		reveal: false,
		freeze: false,
		pilot: false,
	};
	m.tuning = {
		speed: 4,
		enemySpeed: 1,
		matchDuration: 12,
		lightRadius: 5.7,
		timeScale: 1,
	};
	m.difficulty = "midnight";
	m.reset();
};
try {
	check(
		"four floors and twenty-four authored rooms",
		ROOMS.length === 24 &&
			ROOMS.every((r) => Object.keys(r.neighbors).length >= 2),
	);
	check(
		"every room has authored furniture",
		ROOMS.every((r) => propsFor(r).length >= 3),
	);
	const reachable = new Set([0]),
		queue = [0];
	while (queue.length) {
		const r = ROOMS[queue.shift()];
		for (const n of [
			...Object.values(r.neighbors),
			r.up?.room,
			r.down?.room,
		].filter(Number.isInteger))
			if (!reachable.has(n)) {
				reachable.add(n);
				queue.push(n);
			}
	}
	check("all twenty-four rooms connect to the entrance", reachable.size === 24);
	advance(2, { x: 1, z: 0 });
	check(
		"locked door has a physics collision",
		m.room === 0 && m.x < 6.45 && m.locks.has("0-5"),
		m.x,
	);
	reset();
	advance(2, { x: 1, z: -1 });
	check(
		"solid walls stop the Rapier character",
		Math.abs(m.x) < 6.65 && m.z > -4.6,
		`${m.x}, ${m.z}`,
	);
	reset();
	m.strike();
	check("match reveals and counts", m.match === 12 && m.matches === 1);
	advance(12.1);
	check("match burns out", m.match === 0);
	m.strike();
	m.windAt = m.time + 0.01;
	advance(0.1);
	check("gust extinguishes a fresh match", m.match === 0 && m.stats.wind === 1);
	reset();
	m.enter(1);
	m.x = 2.7;
	m.z = 1.5;
	m.makePhysics();
	advance(1);
	check("unlit object cannot be taken", !m.interact() && !m.carried);
	m.strike();
	m.interact();
	check("master key can be carried", m.carried?.type === "key");
	m.enter(2);
	m.x = -2.6;
	m.z = 1.3;
	m.makePhysics();
	advance(1);
	m.strike();
	m.interact();
	check(
		"one-hand swap drops the previous object",
		m.carried?.type === "scepter" &&
			m.items.some((i) => i.id === "key" && i.room === 2),
	);
	const old = m.lives;
	m.scared = 0;
	m.scare({ type: "spider" });
	m.scare({ type: "bat" });
	m.scare({ type: "ghost" });
	check(
		"scepter protects against all three creatures",
		m.lives === old && m.stats.repels === 3,
	);
	m.difficulty = "nightmare";
	m.scare({ type: "ghost" });
	check("Nightmare ghost ignores the scepter", m.lives === old - 1);
	m.difficulty = "midnight";
	reset();
	m.carried = { id: "key", type: "key" };
	m.items = m.items.filter((i) => i.id !== "key");
	m.scare({ type: "bat" });
	check(
		"bat steals a recoverable object",
		m.carried === null &&
			m.items.some((i) => i.id === "key" && i.room === 0) &&
			m.stats.batThefts === 1,
	);
	const after = m.lives;
	m.scare({ type: "ghost" });
	check("scare recovery prevents repeated contact damage", m.lives === after);
	reset();
	m.enter(4);
	const e = m.enemies[0];
	e.x = m.x + 2;
	e.z = m.z;
	e.timer = 0;
	advance(0.02);
	check("creatures telegraph their attack", e.mode === "warning");
	advance(0.8);
	check("bat warning becomes a swoop", e.mode === "rush");
	reset();
	m.carried = { id: "key", type: "key" };
	m.unlock("east");
	check("master key permanently unlocks a door", !m.locks.has("0-5"));
	m.enter(5);
	m.enter(0);
	check("unlock persists across room changes", !m.doorColliders.has("east"));
	reset();
	m.lives = 1;
	m.scare({ type: "spider" });
	check("ninth scare ends the search", m.result === "lose");
	const t = m.time;
	m.step(1 / 60, { x: 1 });
	check("ended search rejects gameplay updates", m.time === t);
	reset();
	m.tuning.speed = 8;
	advance(0.25, { x: 1 });
	check("live movement slider affects physics", m.x > 1.8);
	m.tuning.matchDuration = 25;
	m.strike();
	check("live match slider affects new matches", m.match === 25);
	reset();
	m.haunted = true;
	m.enter(6);
	check(
		"disturbed ghost follows into a quiet room through walls",
		m.enemies.some((e) => e.type === "ghost" && e.mode === "dormant"),
	);
	advance(3);
	check(
		"pursuing ghost telegraphs its arrival",
		m.enemies.some((e) => e.type === "ghost" && e.mode === "warning"),
	);
	m.finalChase = true;
	m.enter(0);
	check(
		"final chase reaches the foyer",
		m.enemies.some((e) => e.type === "ghost"),
	);
	reset();
	const trail = [];
	function walk(x, z, radius = 0.35, { transition = false } = {}) {
		const initial = m.room;
		for (let n = 0; n < 1800; n++) {
			if (m.result) throw Error(`search ended ${m.result} in room ${m.room}`);
			const d = Math.hypot(x - m.x, z - m.z);
			if (d <= radius) return;
			if (transition && m.room !== initial) return;
			m.step(1 / 60, { x: (x - m.x) / d, z: (z - m.z) / d });
		}
		throw Error(
			`stuck in ${m.room} at ${m.x.toFixed(2)},${m.z.toFixed(2)} toward ${x},${z}`,
		);
	}
	function links(id) {
		const r = ROOMS[id],
			all = Object.entries(r.neighbors).map(([dir, to]) => ({ to, dir }));
		for (const way of ["up", "down"])
			if (r[way]) all.push({ to: r[way].room, way });
		return all.filter(
			(l) =>
				!(
					((l.dir && m.locks.has(lockId(id, l.to))) ||
						(l.way === "up" && m.locks.has(`${id}-up`))) &&
					m.carried?.type !== "key"
				),
		);
	}
	function go(target) {
		const pending = [[m.room]],
			seen = new Set([m.room]);
		let path = null;
		while (pending.length) {
			const p = pending.shift(),
				id = p.at(-1);
			if (id === target) {
				path = p;
				break;
			}
			for (const l of links(id))
				if (!seen.has(l.to)) {
					seen.add(l.to);
					pending.push([...p, l.to]);
				}
		}
		if (!path) throw Error(`no route ${m.room} -> ${target}`);
		for (const id of path.slice(1)) {
			const r = ROOMS[m.room],
				l = links(m.room).find((l) => l.to === id);
			walk(0, 0);
			if (l.dir) {
				const d = DOORS[l.dir];
				walk(d.x, d.z, 0.1, { transition: true });
			} else {
				const p = r[l.way];
				walk(p.x, p.z, 1.2);
				advance(0.85);
				m.interact();
			}
			if (m.room !== id)
				throw Error(`door/stair failed: wanted ${id}, got ${m.room}`);
			trail.push(id);
		}
	}
	function take(id) {
		const item = m.items.find((i) => i.id === id);
		if (!item) throw Error(`missing ${id}`);
		go(item.room);
		walk(0, 0);
		walk(item.x, item.z, 1.05);
		advance(0.55);
		m.strike();
		if (!m.interact()) throw Error(`could not take ${id}`);
	}
	try {
		take("key");
		take("scepter");
		take("key");
		go(9);
		go(12);
		go(18);
		go(23); // Unlock both the upper stair and the attic wing with the key.
		go(10);
		take("urn-a");
		take("urn-b");
		take("urn-c");
		check(
			"three fragments assemble into a single urn",
			m.carried?.type === "urn" &&
				m.carried.parts === 7 &&
				m.stats.merges === 2,
		);
		check("assembled urn triggers the final chase", m.finalChase);
		go(0);
		walk(0, 4.4, 0.35);
		advance(0.55);
		m.interact();
		check(
			"scripted full escape with real movement and no cheats",
			m.result === "win" &&
				m.lives > 0 &&
				Object.values(m.cheats).every((v) => !v),
			JSON.stringify({ result: m.result, lives: m.lives, room: m.room, trail }),
		);
		check(
			"escape used keys, stairs, swaps and assembly",
			m.stats.unlocks >= 2 &&
				m.stats.stairs >= 6 &&
				m.stats.pickups >= 4 &&
				m.stats.merges === 2,
			JSON.stringify(m.stats),
		);
		check(
			"escape scores nerve, time and matches",
			m.score() > 10000 && m.time > 60 && m.matches >= 6,
			JSON.stringify({ score: m.score(), time: m.time, matches: m.matches }),
		);
	} catch (error) {
		check("scripted full escape", false, error.message);
	}
	const playthrough = m.snapshot();
	m.world.free();
	process.stdout.write(
		JSON.stringify({ checks, playthrough, trail, events: events.length }),
	);
} catch (error) {
	checks.push({ name: "model suite", pass: false, detail: error.stack });
	process.stdout.write(JSON.stringify({ checks }));
}
