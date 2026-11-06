import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url),
	context = vm.createContext({ console, performance });
for (const file of [
	"vendor/engine/my-3d2dge.js",
	"src/content/content.js",
	"src/sim/sim.js",
	"src/sim/pilot.js",
])
	vm.runInContext(readFileSync(new URL(file, root), "utf8"), context, {
		filename: file,
	});
const { PP, My3D2dge: E } = context,
	dt = 1 / 120;
const plain = (x) => JSON.parse(JSON.stringify(x));
const neutral = () => ({
	mx: 0,
	my: 0,
	jump: false,
	jumpHeld: false,
	chop: false,
	redirect: false,
	interact: false,
	interactHeld: false,
	aim: 0,
});
function fixture(options = {}) {
	const s = new PP.Sim(options);
	s.transition = 0;
	s.director.spawnIn = 1e6;
	s.director.pairIn = 1e6;
	s.director.noKey = -1e6;
	s.miners.forEach((m, i) => {
		m.hero.x = 200 + i * 15;
		m.hero.z = 16;
	});
	return s;
}
function ticks(s, count, input = neutral(), id = s.miners[0]?.id) {
	for (let i = 0; i < count && !s.completed; i++)
		s.step(dt, typeof input === "function" ? input(s, i) : { [id]: input });
	return s;
}
function until(
	s,
	predicate,
	input = neutral(),
	limit = 120 * 30,
	id = s.miners[0]?.id,
) {
	for (let i = 0; i < limit && !s.completed; i++) {
		if (predicate(s)) return i;
		s.step(dt, typeof input === "function" ? input(s, i) : { [id]: input });
	}
	assert.ok(predicate(s), "condition was not reached before tick budget");
	return limit;
}
function core(s) {
	const out = plain(s.snapshot());
	delete out.events;
	return out;
}
export async function runSimTests() {
	let count = 0;
	const failures = [];
	const times = [];
	const test = (name, fn) => {
		try {
			fn();
			count++;
		} catch (error) {
			failures.push(`${name}: ${error.stack || error}`);
		}
	};
	test("content IDs, tier adapter, gaps and reachable ladder landings", () => {
		assert.equal(new Set(PP.CHAMBERS.map((r) => r.id)).size, 3);
		for (let chamber = 0; chamber < 3; chamber++)
			for (let route = 0; route < 3; route++) {
				const room = PP.makeRoom(chamber, route),
					level = PP.makeLevel(room);
				assert.equal(room.tiers, 5 + chamber);
				assert.equal(
					new Set([...room.ladders, ...room.doors].map((x) => x.id)).size,
					room.ladders.length + 3,
				);
				for (const f of room.floors) {
					for (let cx = 0; cx < 36; cx++) {
						const gap = f.gaps.some(
							([a, b]) => cx * 16 + 8 >= a && cx * 16 + 8 < b,
						);
						assert.equal(
							level.cell(cx, f.z / 16 - 1),
							gap ? 0 : 1,
							`row conversion chamber${chamber} floor${f.z} col${cx}`,
						);
					}
				}
				for (const l of room.ladders)
					for (const z of [l.z0, l.z1]) {
						const f = room.floors.find((f) => f.z === z);
						assert.ok(
							f && !f.gaps.some(([a, b]) => l.x >= a - 5 && l.x <= b + 5),
							`ladder ${chamber}:${l.id} has no safe landing at ${z}`,
						);
					}
			}
	});
	test("route variants author different gaps, ore families and palette identity", () => {
		for (let chamber = 0; chamber < 3; chamber++) {
			const [sun, moon, star] = [0, 1, 2].map((route) =>
					PP.makeRoom(chamber, route),
				),
				source = PP.CHAMBERS[chamber].gaps;
			for (let i = 1; i < sun.floors.length; i++) {
				assert.deepEqual(plain(sun.floors[i].gaps[0]), plain(source[i - 1]));
				assert.deepEqual(plain(moon.floors[i].gaps[0]), [
					576 - source[i - 1][1],
					576 - source[i - 1][0],
				]);
				assert.deepEqual(
					plain(star.floors[i].gaps[0]),
					plain(source[i % source.length]),
				);
			}
			assert.equal(
				new Set([sun, moon, star].map((r) => JSON.stringify(r.floors))).size,
				3,
			);
			assert.equal(new Set([sun, moon, star].map((r) => r.routeColor)).size, 3);
			if (chamber > 0) {
				assert.ok(
					moon.patterns.filter((k) => k === "bounce").length >
						moon.patterns.filter((k) => k === "heavy").length,
				);
				assert.ok(
					star.patterns.filter((k) => k === "heavy").length >
						star.patterns.filter((k) => k === "bounce").length,
				);
			}
		}
	});
	test("route personalities award actual richer gold and collision scores", () => {
		for (let route = 0; route < 3; route++) {
			const s = fixture();
			s.enter(1, route);
			s.transition = 0;
			s.director.spawnIn = 1e6;
			s.director.pairIn = 1e6;
			s.spawnRock({ x: 296, z: 100, vx: 0 });
			s.spawnRock({ x: 300, z: 100, vx: 0 });
			s.rockPairs();
			assert.equal(s.score, route === 2 ? 9 : 6);
			s.rocks = [];
			s.pickups = [];
			const m = s.miners[0];
			m.hero.x = 200;
			const before = s.score;
			s.spawnPickup("gold", 200, 30);
			s.step(dt, { 1: neutral() });
			assert.equal(s.score - before, route === 1 ? 5 : 3);
		}
	});
	test("normal pilot sustains rising jumps and prioritizes falling unarmed replacement", () => {
		const s = fixture(),
			m = s.miners[0];
		ticks(s, 3);
		s.step(dt, { 1: { ...neutral(), jump: true, jumpHeld: true } });
		assert.ok(m.hero.vz > 0);
		assert.equal(PP.pilot(s, 1, 0).jumpHeld, true);
		m.hero.x = 200;
		m.hero.z = 16;
		m.hero.vx = m.hero.vz = 0;
		m.hero.climbing = false;
		m.tool = 0;
		s.spawnPickup("key", 430, 30);
		s.spawnPickup("pick", 120, 200);
		const intent = PP.pilot(s, 1, 0);
		assert.equal(intent.mx, -1);
		assert.equal(intent.my, 0);
		assert.equal(intent.chop, false);
		assert.equal(intent.interact, false);
	});
	test("native coyote jump after leaving a ledge", () => {
		const s = fixture(),
			m = s.miners[0],
			f = s.room.floors[1],
			a = f.gaps[0][0];
		m.hero.x = a - 10;
		m.hero.z = f.z;
		m.hero.onGround = true;
		until(s, () => !m.hero.onGround, { ...neutral(), mx: 1 }, 60);
		s.step(dt, { 1: { ...neutral(), mx: 1, jump: true, jumpHeld: true } });
		assert.equal(m.hero.jumped, true);
		assert.ok(m.hero.vz > 0);
	});
	test("native buffered jump triggers on landing", () => {
		const s = fixture(),
			h = s.miners[0].hero;
		h.z = 23;
		h.vz = -90;
		h.onGround = false;
		s.step(dt, { 1: { ...neutral(), jump: true, jumpHeld: true } });
		let jumped = h.jumped;
		for (let i = 0; i < 20 && !jumped; i++) {
			s.step(dt, { 1: { ...neutral(), jumpHeld: true } });
			jumped = h.jumped;
		}
		assert.ok(jumped);
	});
	test("native variable-height jump and crouch silhouette", () => {
		const apex = (held) => {
			const s = fixture(),
				h = s.miners[0].hero;
			ticks(s, 3);
			let max = h.z;
			for (let i = 0; i < 150; i++) {
				s.step(dt, { 1: { ...neutral(), jump: i === 0, jumpHeld: i < held } });
				max = Math.max(max, h.z);
			}
			return max;
		};
		assert.ok(apex(70) > apex(2) + 18);
		const s = fixture(),
			h = s.miners[0].hero;
		ticks(s, 3);
		const height = h.h;
		ticks(s, 4, { ...neutral(), my: 1 });
		assert.ok(h.crouching);
		assert.ok(h.h < height * 0.7);
		ticks(s, 4);
		assert.equal(h.h, height);
	});
	test("permanent native ladders reach every tier on every route", () => {
		for (let chamber = 0; chamber < 3; chamber++)
			for (let route = 0; route < 3; route++)
				for (const x of [104, 456]) {
					const s = fixture({ chamber });
					s.route = route;
					s.miners[0].hero.x = x;
					const z = s.room.floors.at(-1).z;
					until(
						s,
						() => s.miners[0].hero.z >= z - 0.1,
						{ ...neutral(), my: -1 },
						120 * 8,
					);
					assert.ok(s.tutorial.ladder);
					ticks(s, 6, { ...neutral(), mx: 1, jump: true });
					assert.equal(s.miners[0].hero.climbing, false);
				}
	});
	test("temporary ladder expiry grants occupied climber grace", () => {
		const s = fixture(),
			l = s.room.ladders.find((x) => x.temporary),
			h = s.miners[0].hero;
		s.chamberTime = s.tuning.ladderPeriod * 0.9 - l.offset;
		h.x = l.x;
		h.z = (l.z0 + l.z1) / 2;
		h.climbing = true;
		s.updateLadders(true);
		assert.equal(l.state, "warning");
		assert.equal(
			s.level.kind(Math.floor(l.x / 16), Math.floor(h.z / 16)),
			"ladder",
		);
		until(s, () => h.z >= l.z1 - 0.1, { ...neutral(), my: -1 }, 240);
		ticks(s, 3, { ...neutral(), mx: 1, jump: true });
		assert.equal(h.climbing, false);
		s.updateLadders();
		assert.notEqual(l.state, "usable");
	});
	test("safe drops preserve health and bottom safety net recovers", () => {
		const s = fixture(),
			h = s.miners[0].hero;
		h.x = 220;
		h.z = 80;
		h.onGround = false;
		until(s, () => h.onGround, neutral(), 120);
		assert.equal(h.z, 16);
		assert.equal(s.miners[0].health, 3);
		h.z = -40;
		s.step(dt, { 1: neutral() });
		assert.equal(h.z, 16);
		assert.equal(h.x, 104);
		assert.equal(s.miners[0].health, 3);
	});
	test("one contact per native swing and misses cost no durability", () => {
		const s = fixture(),
			m = s.miners[0];
		ticks(s, 3);
		const r = s.spawnRock({ x: 223, z: 29, vx: 0, kind: "heavy" });
		ticks(s, 20, { ...neutral(), chop: true });
		assert.equal(r.hp, 2);
		assert.equal(m.tool, 5);
		assert.equal(s.eventLog.filter((e) => e.type === "chopHit").length, 1);
		s.rocks = [];
		ticks(s, 120, { ...neutral(), chop: true });
		assert.equal(m.tool, 5);
	});
	test("heavy ore needs three distinct chops and one final break event", () => {
		const s = fixture(),
			m = s.miners[0];
		m.tool = 3;
		const r = s.spawnRock({ x: 223, z: 29, vx: 0, kind: "heavy" });
		for (let hits = 0; hits < 3; hits++) {
			r.x = m.hero.x + 23;
			r.z = m.hero.z + 14;
			r.vx = 0;
			r.vz = 0;
			const before = m.tool;
			until(s, () => m.tool < before, { ...neutral(), chop: true }, 120);
			ticks(s, 40, neutral());
		}
		assert.equal(m.tool, 0);
		assert.ok(r.dead);
		assert.equal(s.eventLog.filter((e) => e.type === "toolBreak").length, 1);
		assert.equal(m.stats.ore, 1);
	});
	test("unredirected collisions cannot shatter reinforced heavy ore", () => {
		const s = fixture(),
			heavy = s.spawnRock({ x: 290, z: 29, vx: 30, kind: "heavy" }),
			ordinary = s.spawnRock({ x: 305, z: 29, vx: -30 });
		s.rockPairs();
		assert.equal(heavy.dead, false);
		assert.equal(heavy.hp, 3);
		assert.equal(ordinary.dead, true);
		assert.equal(s.director.collisions, 0);
		const second = s.spawnRock({ x: heavy.x + 15, z: heavy.z, vx: -30 });
		second.redirected = 1;
		s.rockPairs();
		assert.equal(heavy.dead, true);
		assert.equal(second.dead, true);
		assert.equal(s.director.collisions, 1);
	});
	test("redirect anticipation, timed contact, high/low arcs, grace and one wear", () => {
		for (const aim of [-1, 1]) {
			const s = fixture(),
				m = s.miners[0],
				r = s.spawnRock({ x: 223, z: 30, vx: 0 });
			s.step(dt, { 1: { ...neutral(), redirect: true, aim } });
			assert.equal(r.redirected, null);
			assert.equal(m.tool, 6);
			ticks(s, 10, { ...neutral(), aim });
			assert.equal(r.redirected, m.id);
			assert.equal(m.tool, 5);
			assert.ok(r.grace > 0);
			assert.equal(m.stats.redirects, 1);
			assert.ok(aim < 0 ? r.vz > 140 : r.vz < 0);
			ticks(s, 8);
			assert.equal(m.tool, 5);
		}
	});
	test("resolution order: final tool wear, pair collision, same-tick fresh pick", () => {
		const s = fixture(),
			m = s.miners[0];
		m.tool = 1;
		s.spawnRock({ x: 211, z: 30, vx: 0, kind: "heavy" });
		s.spawnRock({ x: 229, z: 30, vx: 0 });
		m.action = "redirect";
		m.aim = 1;
		m.attack.start();
		m.attack.phase = "active";
		m.attack.t = 0.02;
		s.step(dt, { 1: neutral() });
		const types = s.eventLog.map((e) => e.type),
			a = types.indexOf("toolBreak"),
			b = types.indexOf("collision"),
			c = types.indexOf("pickCollect");
		assert.ok(a >= 0 && a < b && b < c, types.join(","));
		assert.equal(m.tool, s.tuning.durability);
		assert.equal(m.stats.tools, 1);
		assert.equal(s.director.collisions, 1);
	});
	test("collision pair/reward deduplication and seeded deck reproducibility", () => {
		const a = fixture({ seed: 44 }),
			b = fixture({ seed: 44 });
		for (const s of [a, b])
			for (let i = 0; i < 9; i++) {
				s.spawnRock({ x: 296, z: 100, vx: 0 });
				s.spawnRock({ x: 300, z: 100, vx: 0 });
				s.rockPairs();
				s.rockPairs();
				s.rocks = s.rocks.filter((r) => !r.dead);
			}
		assert.equal(a.director.collisions, 9);
		assert.equal(a.director.deckAt, 9);
		assert.equal(a.score, b.score);
		assert.deepEqual(plain(a.pickups), plain(b.pickups));
		assert.equal(new Set(a.pickups.map((p) => p.id)).size, a.pickups.length);
	});
	test("bounded tool opportunity and complete unarmed recovery through real input", () => {
		const s = fixture({ seed: 99 }),
			m = s.miners[0];
		m.tool = 0;
		until(
			s,
			() => s.pickups.some((p) => p.kind === "pick"),
			neutral(),
			120 * 16,
		);
		assert.ok(s.chamberTime <= s.tuning.recoveryWait + 3.8);
		assert.ok(s.eventLog.some((e) => e.type === "supplyWarning"));
		until(
			s,
			() => m.tool > 0,
			(s) => ({ 1: PP.pilot(s, 1, 0) }),
			120 * 40,
		);
		assert.equal(m.tool, s.tuning.durability);
		assert.ok(s.eventLog.some((e) => e.type === "pickCollect"));
	});
	test("key expiry produces another unique achievable progression opportunity", () => {
		const s = fixture();
		s.invincible = true;
		s.director.kills = 5;
		s.director.noKey = 0;
		s.spawnPickup("key", 400, 60).ttl = 0.01;
		ticks(s, 4);
		assert.ok(s.eventLog.some((e) => e.type === "keyExpired"));
		until(
			s,
			() => s.pickups.some((p) => p.kind === "key"),
			neutral(),
			120 * 14,
		);
		assert.ok(s.chamberTime < 12);
		assert.equal(s.pickups.filter((p) => p.kind === "key").length, 1);
		assert.equal(s.spawnPickup("key", 100, 26), null);
	});
	test("key collection races award once; explicit unlock and comic jam", () => {
		const s = fixture({ seats: [{ id: 1 }, { id: 2 }] }),
			[a, b] = s.miners;
		a.hero.x = 200;
		b.hero.x = 200;
		s.spawnPickup("key", 200, 30);
		s.step(dt, { 1: neutral(), 2: neutral() });
		assert.equal(s.keyOwner, 1);
		assert.equal(s.score, 10);
		assert.equal(a.stats.keys + b.stats.keys, 1);
		assert.equal(s.pickups.length, 0);
		const door = s.room.doors[0];
		a.hero.x = door.x;
		a.hero.z = door.z;
		ticks(s, 3);
		assert.equal(s.nextChamber, undefined);
		s.step(dt, { 1: { ...neutral(), interact: true } });
		assert.equal(s.nextChamber, 1);
		assert.equal(s.score, 30);
		s.step(dt, { 1: { ...neutral(), interact: true } });
		assert.equal(s.score, 30);
		const j = fixture(),
			m = j.miners[0];
		m.hero.x = j.room.doors[0].x;
		j.step(dt, { 1: { ...neutral(), interact: true } });
		assert.ok(m.jam > 0);
		assert.equal(j.tutorial.jam, true);
		ticks(j, 65, { ...neutral(), mx: 1 });
		assert.equal(m.jam, 0);
		assert.ok(m.hero.x > j.room.doors[0].x + 20);
	});
	test("damage invulnerability, full wipe, standalone checkpoint retry and Hub refusal", () => {
		const s = fixture(),
			m = s.miners[0],
			r = { x: m.hero.x - 1 };
		m.invuln = 0;
		s.hurt(m, r);
		assert.equal(m.health, 2);
		s.hurt(m, r);
		assert.equal(m.health, 2);
		for (let i = 0; i < 2; i++) {
			m.invuln = 0;
			s.hurt(m, r);
		}
		s.step(dt, { 1: neutral() });
		assert.equal(s.completed.won, false);
		s.score = 999;
		s.banked = 20;
		s.checkpoint = { chamber: 1, score: 20, route: 2 };
		assert.equal(s.retry(), true);
		assert.equal(s.chamber, 1);
		assert.equal(s.route, 2);
		assert.equal(s.score, 20);
		assert.equal(m.health, 3);
		assert.equal(m.tool, 6);
		assert.equal(s.completed, null);
		const net = fixture({ online: true });
		net.finish(false);
		assert.equal(net.retry(), false);
	});
	test("co-op rescue, carrier departure recovery and safe join ownership", () => {
		const s = fixture({
				seats: [
					{ id: 1, name: "Puddles" },
					{ id: 2, name: "Pebble" },
				],
			}),
			[a, b] = s.miners;
		b.downed = true;
		b.health = 0;
		b.hero.x = a.hero.x + 12;
		ticks(s, Math.ceil(s.tuning.rescueTime * 120) + 2, {
			...neutral(),
			interactHeld: true,
		});
		assert.equal(b.downed, false);
		assert.equal(b.health, 2);
		assert.equal(a.stats.rescues, 1);
		s.keyOwner = 2;
		s.removeMiner(2);
		assert.equal(s.keyOwner, null);
		assert.equal(s.miners.length, 1);
		const key = s.pickups.find((p) => p.kind === "key");
		assert.equal(key.x, 136);
		assert.equal(key.z, 26);
		const local = fixture();
		assert.equal(local.addMiner({ id: 2, name: "Pebble" }), true);
		assert.equal(local.addMiner({ id: 3 }), false);
		assert.equal(local.miners[0].id, 1);
		const online = fixture({ online: true });
		assert.equal(online.addMiner({ id: 2 }), false);
	});
	test("snapshot preserves mid-jump, mid-ladder, RNG and subsequent events", () => {
		const s = fixture({ seed: 17, seats: [{ id: 1 }, { id: 2 }] });
		s.chamberTime = 16;
		s.miners[0].hero.x = 200;
		s.miners[0].hero.z = 16;
		ticks(s, 3);
		s.step(dt, {
			1: { ...neutral(), jump: true, jumpHeld: true },
			2: neutral(),
		});
		ticks(s, 8, (s) => ({ 1: { ...neutral(), jumpHeld: true }, 2: neutral() }));
		const h = s.miners[1].hero;
		h.x = 104;
		h.z = 48;
		h.climbing = true;
		h.vz = 78;
		s.updateLadders(true);
		const snapshot = plain(s.snapshot()),
			copy = new PP.Sim();
		copy.restore(snapshot);
		assert.deepEqual(
			core(copy),
			core(s),
			"snapshot core changed during restore",
		);
		for (let i = 0; i < 180; i++) {
			const intents = {
				1: { ...neutral(), mx: i % 40 < 20 ? 1 : -1, jumpHeld: i < 20 },
				2: { ...neutral(), my: -1 },
			};
			s.step(dt, intents);
			copy.step(dt, intents);
		}
		assert.deepEqual(core(copy), core(s), "restored simulation diverged");
		assert.equal(s.random(), copy.random());
		assert.deepEqual(plain(copy.events), plain(s.events));
	});
	test("live tuning validates clamps and complete defaults reset", () => {
		const s = fixture();
		for (const [key, spec] of Object.entries(PP.TUNING)) {
			assert.equal(s.setTuning(key, spec.max + 99), true);
			assert.equal(s.tuning[key], spec.max);
			s.setTuning(key, spec.min - 99);
			assert.equal(s.tuning[key], spec.min);
		}
		assert.equal(s.setTuning("bad", 2), false);
		s.tuning = PP.validTuning({});
		assert.deepEqual(plain(s.tuning), plain(PP.defaults()));
	});
	for (let route = 0; route < 3; route++)
		test(`unassisted normal-input expedition route ${route} and ordered feature evidence`, () => {
			const s = new PP.Sim({ seed: 99 });
			assert.equal(s.invincible, false);
			until(
				s,
				() => !!s.completed,
				(s) => ({ 1: PP.pilot(s, 1, route) }),
				120 * 400,
			);
			assert.equal(s.completed.won, true, JSON.stringify(s.completed));
			const events = s.eventLog,
				find = (type, start = 0) =>
					events.findIndex((e, i) => i >= start && e.type === type);
			let cursor = 0;
			for (const type of [
				"chamber",
				"chopHit",
				"keyCollect",
				"unlock",
				"chamber",
				"keyCollect",
				"unlock",
				"chamber",
				"wave",
				"wave",
				"keyCollect",
				"unlock",
				"victory",
			]) {
				const i = find(type, cursor);
				assert.ok(i >= 0, `route${route}: missing ordered ${type}`);
				cursor = i + 1;
			}
			const breakAt = find("toolBreak");
			assert.ok(
				breakAt >= 0 && find("pickCollect", breakAt) > breakAt,
				`route${route}: no armed → unarmed → renewed circuit`,
			);
			assert.equal(events.filter((e) => e.type === "unlock").length, 3);
			assert.equal(events.filter((e) => e.type === "chamber").length, 3);
			assert.equal(s.chamber, 2);
			assert.ok(s.director.wave >= 3);
			assert.ok(s.bestChain >= 1);
			assert.ok(events.some((e) => e.type === "redirect"));
			assert.ok(
				events.some(
					(e) => e.type === "collision" && e.text?.includes("TRICK SHOT"),
				),
				`route${route}: no deliberate ricochet collision`,
			);
			assert.ok(s.time < 900 - 60);
			times.push({
				route,
				seconds: Number(s.time.toFixed(2)),
				score: s.score,
				health: s.miners[0].health,
			});
		});
	for (let route = 0; route < 3; route++)
		test(`two simultaneous normal-input miners complete shared route ${route}`, () => {
			const s = new PP.Sim({
				seed: 99,
				seats: [
					{ id: 1, name: "Puddles" },
					{ id: 2, name: "Pebble" },
				],
			});
			until(
				s,
				() => !!s.completed,
				(s) =>
					Object.fromEntries(
						s.miners.map((m) => [m.id, PP.pilot(s, m.id, route)]),
					),
				120 * 400,
			);
			assert.equal(s.completed.won, true);
			assert.ok(s.miners.every((m) => m.health > 0));
			assert.equal(s.eventLog.filter((e) => e.type === "unlock").length, 3);
			assert.ok(s.miners.reduce((n, m) => n + m.stats.ore, 0) > 6);
		});
	test("additional authored chamber and finale role need no core changes", () => {
		const extra = {
			...PP.CHAMBERS[1],
			id: "afterdeep",
			name: "Afterdeep",
			finale: false,
		};
		PP.CHAMBERS.push(extra);
		try {
			const s = new PP.Sim({ chamber: 3, seed: 99 });
			assert.equal(s.chamber, 3);
			assert.equal(s.room.id, "afterdeep");
			assert.equal(s.director.wave, 0);
			s.director.kills = 4;
			assert.equal(s.canKey(), true);
			s.enter(2);
			s.transition = 0;
			s.keyOwner = 1;
			s.unlock(s.miners[0], s.room.doors[0]);
			s.step(3, {});
			assert.equal(s.completed, null);
			assert.equal(s.chamber, 3);
			s.transition = 0;
			s.keyOwner = 1;
			s.unlock(s.miners[0], s.room.doors[0]);
			s.step(3, {});
			assert.equal(s.completed.won, true);
		} finally {
			PP.CHAMBERS.pop();
		}
	});
	if (failures.length)
		throw new Error(
			`Simulation failures (${failures.length}):\n${failures.join("\n")}`,
		);
	return { count, times };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
	try {
		const { count } = await runSimTests();
		console.log(`${count} simulation checks passed`);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
