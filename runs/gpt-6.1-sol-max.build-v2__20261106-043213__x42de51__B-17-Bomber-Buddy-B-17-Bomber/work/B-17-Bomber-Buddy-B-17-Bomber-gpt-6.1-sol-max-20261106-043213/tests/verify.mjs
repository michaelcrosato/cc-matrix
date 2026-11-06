import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Simulation } from "../src/sim/simulation.js";
import { sortieBot } from "../src/sim/bot.js";
import { synthSamples } from "../src/audio/sound.js";
import {
	U,
	HOME,
	STATIONS,
	OPERATION,
	DEFAULT_BALANCE,
} from "../content/operation.js";
import { segmentHit, local } from "../src/core/math.js";
await import("../vendor/engine-repo/dist/handoff/my-3d2dge.js");
const E = globalThis.My3D2dge;
let count = 0,
	failed = 0;
const evidence = [];
function test(name, fn) {
	count++;
	try {
		const detail = fn();
		evidence.push({ name, pass: true, detail });
	} catch (e) {
		failed++;
		console.error("FAIL " + name + ": " + e.message);
		evidence.push({ name, pass: false, error: e.stack });
	}
}
function advance(s, seconds, controller) {
	for (let i = 0; i < Math.ceil(seconds * 120) && !s.ended; i++) {
		if (controller && i % 12 === 0) controller(s);
		s.step(1 / 120);
	}
}
function airborne(extra = {}) {
	const s = new Simulation(extra);
	s.practice = s.practice || "isolated";
	Object.assign(s.aircraft, {
		airborne: true,
		z: 850 * U,
		speed: 70 * U,
		throttle: 0.85,
		gear: 0,
		x: 10000 * U,
	});
	return s;
}
function station(s, id = "nose", who = 0) {
	s.command(who, "station", { station: id });
	advance(s, 0.4);
}
test("Native engine version", () => assert.equal(E.version, "0.89.1"));
test("Takeoff requires power and gains clearance", () => {
	const s = new Simulation();
	advance(s, 10);
	assert.equal(s.aircraft.airborne, false);
	s.command(0, "input", { throttle: 1 });
	for (let i = 0; i < 40 * 120; i++) {
		if (i % 30 === 0)
			s.command(0, "input", { throttle: s.aircraft.throttle < 0.9 ? 1 : 0 });
		s.step(1 / 120);
	}
	assert(s.aircraft.airborne);
	assert(s.aircraft.z > 100 * U);
	assert(!s.ended);
});
test("Manual bank, pitch, throttle change shared flight", () => {
	const s = airborne(),
		before = s.aircraft.heading;
	s.command(0, "input", { bank: 1, pitch: 0.5, throttle: 0.4 });
	advance(s, 0.5);
	assert(s.aircraft.heading > before);
	assert(!s.aircraft.hold);
	assert(s.aircraft.pitch > 0);
	assert(s.aircraft.throttle > 0.85);
});
test("Course hold yields immediately and holds on station handover", () => {
	const s = airborne();
	s.command(0, "input", { bank: 0.9 });
	advance(s, 0.1);
	s.command(0, "hold");
	const heading = s.aircraft.heading;
	station(s, "tail");
	advance(s, 3);
	assert(s.aircraft.hold);
	assert(Math.abs(s.aircraft.heading - heading) < 0.1);
	assert.equal(s.commander, 0);
});
test("Stall warns and a safe descent can recover", () => {
	const s = airborne();
	s.aircraft.speed = 28 * U;
	s.aircraft.throttle = 0;
	advance(s, 0.2);
	assert(s.aircraft.stall);
	assert(s.history.some((e) => e.type === "radio" && e.text.includes("Stall")));
	s.aircraft.throttle = 1;
	advance(s, 15);
	assert(!s.aircraft.stall);
	assert(!s.ended);
});
test("Ground collision resolves complete result", () => {
	const s = airborne();
	s.aircraft.z = 0;
	s.step(1 / 120);
	assert.equal(s.result.reason, "crash");
});
test("Finite fuel, weight and power affect flight", () => {
	const light = airborne({ loadout: 0 }),
		heavy = airborne({ loadout: 2 });
	advance(light, 30);
	advance(heavy, 30);
	assert(light.aircraft.speed > heavy.aircraft.speed);
	assert(light.aircraft.fuel < 100);
	assert(light.reserve() > heavy.reserve());
});
test("Damaged engine reduces attainable speed and adds consumption", () => {
	const a = airborne(),
		b = airborne();
	b.applyDamage("engine");
	advance(a, 25);
	advance(b, 25);
	assert(b.aircraft.speed < a.aircraft.speed);
	assert(b.aircraft.fuel < a.aircraft.fuel);
});
for (const st of STATIONS.filter((s) => s.arc))
	test(st.id + " has a distinct bounded physical mount", () => {
		const s = airborne();
		station(s, st.id);
		s.command(0, "input", { aimYaw: 99, aimPitch: 99, fire: true });
		advance(s, 0.4);
		const p = s.player(0);
		assert(Math.abs(p.aimYaw) <= st.arc);
		assert(p.aimPitch <= 0.75);
		const { origin, direction } = s.gunDirection(p),
			q = local(s.aircraft, ...st.offset.map((v) => v * U));
		assert(Math.hypot(origin.x - q.x, origin.y - q.y, origin.z - q.z) < 1e-6);
		assert(Math.hypot(direction.x, direction.y, direction.z) > 0.99);
		assert(s.guns[st.id].ammo < 480);
		assert.equal(s.guns.nose.ammo, st.id === "nose" ? s.guns[st.id].ammo : 480);
	});
test("Fast shot uses swept segment intersection", () => {
	assert(
		segmentHit(
			{ x: 0, y: 0, z: 0 },
			{ x: 10000, y: 0, z: 0 },
			{ x: 5000, y: 0, z: 0 },
			20,
		),
	);
	assert(
		!segmentHit(
			{ x: 0, y: 0, z: 0 },
			{ x: 10000, y: 0, z: 0 },
			{ x: 5000, y: 100, z: 0 },
			20,
		),
	);
});
test("Gunnery four bearings hits and counts each fighter once", () => {
	for (let bearing = 0; bearing < 4; bearing++) {
		const s = airborne();
		s.spawnWave(bearing, bearing === 2 ? "pursuit" : "crossing", 1);
		advance(s, 25, sortieBot);
		assert.equal(s.stats.kills, 1);
		const score = s.score;
		advance(s, 10);
		assert.equal(s.score, score);
	}
});
test("Ammo exhaustion and jam prevent shots", () => {
	const s = airborne();
	station(s);
	s.guns.nose.ammo = 0;
	s.command(0, "input", { fire: true });
	advance(s, 0.3);
	assert.equal(s.shots.length, 0);
	s.guns.nose.ammo = 100;
	s.guns.nose.jammed = true;
	advance(s, 0.3);
	assert.equal(s.shots.length, 0);
});
test("Attack patterns proceed through firing and disengage", () => {
	for (const pattern of ["head-on", "crossing", "pursuit"]) {
		const s = airborne();
		s.cheats.invulnerable = true;
		s.spawnWave(0, pattern, 1);
		advance(s, 15);
		assert.equal(s.enemies[0].state, "firing");
		advance(s, 20);
		assert(s.enemies.length === 0 || s.enemies.every((e) => !e.alive));
	}
});
test("Station ownership collision and deliberate handover", () => {
	const s = airborne({ players: [0, 1] });
	assert(!s.command(1, "station", { station: "pilot" }));
	assert.equal(s.owners.pilot, 0);
	assert(s.command(0, "accept"));
	assert.equal(s.owners.pilot, 1);
	assert.equal(s.commander, 1);
	assert.equal(s.requests.length, 0);
	assert.equal(s.player(0).station, "tail");
	assert.equal(s.player(1).station, "pilot");
	assert.equal(new Set(s.players.map((p) => p.station)).size, 2);
});
test("Departure clears ownership and transfers flight permission", () => {
	const s = airborne({ players: [0, 1] });
	s.commander = 1;
	s.removePlayer(1);
	assert.equal(s.owners.tail, null);
	assert.equal(s.commander, 0);
	assert(s.aircraft.hold);
});
test("Invalid / nonowner commands cannot release or navigate", () => {
	const s = airborne({ players: [0, 1] });
	assert(!s.command(1, "release"));
	assert(!s.command(1, "route", { route: "home" }));
	s.command(0, "input", { bank: Infinity, pitch: NaN });
	assert.equal(s.player(0).input.bank, 0);
});
test("Prediction and bomb integration share trajectory exactly", () => {
	const s = airborne({ practice: "bombing" }),
		p = s.predict(),
		bomb = s.createBomb();
	while (bomb.z > 0) s.integrateBomb(bomb, 1 / 120);
	assert.equal(bomb.x, p.x);
	assert.equal(bomb.y, p.y);
	assert.equal(bomb.age, p.age);
});
test("Doors, last-bomb salvo, duplicate release and inventory", () => {
	const s = airborne();
	station(s, "bombs");
	assert(!s.command(0, "release"));
	s.aircraft.doors = 1;
	s.aircraft.doorsOpen = true;
	s.aircraft.bombs = 1;
	assert(s.command(0, "release", {}, 5));
	assert(!s.command(0, "release", {}, 5));
	assert.equal(s.aircraft.bombs, 0);
	assert.equal(s.stats.released, 1);
	advance(s, 20);
	assert.equal(s.bombs.length, 0);
	assert(!s.ended);
	assert(s.command(0, "route", { route: "home" }));
});
test("Bomb miss stays legible and duplicate target damage never scores twice", () => {
	const s = airborne();
	s.aircraft.doors = 1;
	station(s, "bombs");
	s.aircraft.doors = 1;
	s.command(0, "release");
	advance(s, 20);
	assert.equal(s.stats.targets, 0);
	assert(s.history.some((e) => e.type === "impact" && !e.hit));
	const q = s.targets[0].parts[0];
	for (let i = 0; i < 8; i++) {
		s.bombs.push({
			x: q.x,
			y: q.y,
			z: 0,
			vx: 0,
			vy: 0,
			vz: 0,
			age: 0,
			alive: true,
		});
		s.bombing(1 / 120);
	}
	const score = s.score;
	s.bombs.push({
		x: q.x,
		y: q.y,
		z: 0,
		vx: 0,
		vy: 0,
		vz: 0,
		age: 0,
		alive: true,
	});
	s.bombing(1 / 120);
	assert.equal(s.score, score);
	assert.equal(
		s.score,
		s.targets[0].parts.filter((p) => p.dead).reduce((v, p) => v + p.points, 0),
	);
});
test("Coastal battery destruction suppresses that barrage", () => {
	const s = airborne();
	assert(s.batteryActive());
	s.targets[1].parts[0].dead = true;
	assert(!s.batteryActive());
});
test("Flak can be evaded with actual pilot input", () => {
	const s = airborne();
	s.aircraft.x = 9000 * U;
	s.spawnFlak();
	advance(s, 5, sortieBot);
	assert(s.stats.flakEvaded > 0);
	assert.equal(s.stats.damage, 0);
});
test("Fire extinguisher is atomic, finite and actionable", () => {
	const s = airborne({ players: [0, 1] });
	s.applyDamage("fire");
	assert(!s.command(1, "extinguish", {}, 1));
	assert(s.command(0, "extinguish", {}, 2));
	assert(!s.command(0, "extinguish", {}, 2));
	assert.equal(s.aircraft.extinguisher, 0);
	assert.equal(s.aircraft.fire, -1);
});
test("Unextinguished fire reaches a defined feathered state", () => {
	const s = airborne();
	s.applyDamage("fire");
	s.aircraft.extinguisher = 0;
	advance(s, 41);
	assert.equal(s.aircraft.fire, -1);
	assert(s.aircraft.engines.includes(0));
	assert(s.aircraft.hull < 100);
	assert(!s.ended);
});
test("Sight damage retains a physically correct coarse solution", () => {
	const s = airborne(),
		p = s.predict();
	s.applyDamage("sight");
	assert(s.aircraft.sight < 0.5);
	assert.deepEqual(s.predict(), p);
});
test("Jettison needs sustained commander input", () => {
	const s = airborne();
	s.command(0, "input", { jettison: true });
	advance(s, 0.4);
	s.command(0, "input", {});
	assert(s.aircraft.bombs > 0);
	advance(s, 2, (s) => s.command(0, "input", { jettison: true }));
	assert.equal(s.aircraft.bombs, 0);
	assert(s.stats.jettisoned > 0);
});
test("Stale controls expire instead of stuck fire/throttle", () => {
	const s = airborne();
	station(s);
	s.command(0, "input", { fire: true });
	advance(s, 1);
	assert(!s.player(0).input.fire);
	const ammo = s.guns.nose.ammo;
	advance(s, 1);
	assert.equal(s.guns.nose.ammo, ammo);
});
test("Terminal outcomes: destruction, exhaustion, deadline and abort", () => {
	const a = airborne();
	a.hurt(200, "test");
	assert.equal(a.result.reason, "destroyed");
	const b = airborne();
	b.aircraft.fuel = 0;
	b.aircraft.z = 0;
	b.step(1 / 120);
	assert.equal(b.result.reason, "fuel");
	const c = airborne();
	c.time = 720;
	c.step(1 / 120);
	assert.equal(c.result.reason, "deadline");
	const d = airborne();
	d.time = 100;
	d.aircraft.x = HOME.x + 500 * U;
	d.selectRoute("home");
	advance(d, 16);
	assert.equal(d.result.reason, "abort");
	assert(d.result.returned);
});
test("All practice scenarios have real systems and outcomes", () => {
	for (const kind of ["gunnery", "bombing", "return"]) {
		const s = new Simulation({ practice: kind });
		assert(s.cheated);
		assert(s.aircraft.airborne);
		if (kind === "gunnery") assert(s.enemies.length);
		if (kind === "bombing") assert.equal(s.owners.bombs, 0);
		if (kind === "return") assert(s.aircraft.fire >= 0);
	}
});
for (let loadout = 0; loadout < 3; loadout++)
	for (let difficulty = 0; difficulty < 3; difficulty++)
		test(`Full native fixed-step sortie: load ${loadout}, difficulty ${difficulty}`, () => {
			const s = new Simulation({ loadout, difficulty });
			const g = new E.Game({ headless: true, loop: false });
			g.start({
				update: (dt) => {
					if (s.tick % 12 === 0) sortieBot(s);
					s.step(dt);
				},
				draw() {},
			});
			g.advance(721);
			assert(s.result?.won);
			assert(s.stats.defense > 0);
			assert.equal(
				new Set(
					s.history.filter((e) => e.type === "wave").map((e) => e.bearing),
				).size,
				4,
			);
			assert(s.history.some((e) => e.type === "flak-warning"));
			assert(s.stats.accurate > 0);
			assert(s.aircraft.fuel > 15);
			assert(!s.cheated);
			assert(s.time >= 600 && s.time <= 720);
			assert.equal(g.errors.length, 0);
			g.dispose();
			return {
				seconds: Math.round(s.time),
				fuel: Math.round(s.aircraft.fuel),
				score: s.result.score,
			};
		});
test("Seeded simulation repeats exactly and replay resets all systems", () => {
	function run() {
		const s = airborne({ seed: 5 });
		s.spawnWave();
		advance(s, 28, sortieBot);
		return JSON.stringify(s.snapshot());
	}
	assert.equal(run(), run());
	const s = new Simulation({ seed: 6 });
	assert.equal(s.time, 0);
	assert.equal(s.aircraft.heading, 0);
	assert(s.aircraft.engines.every((h) => h === 1));
	assert.equal(s.stats.kills, 0);
	assert(s.guns.nose.ammo === 480);
});
test("Pressure ceiling prevents accumulated fighter waves", () => {
	const s = airborne();
	for (let i = 0; i < 40; i++) s.spawnWave(i % 4, "crossing", 2);
	assert(s.enemies.length <= 6);
});
test("Mission definition survives export roundtrip", () => {
	const op = JSON.parse(JSON.stringify(OPERATION));
	op.targets[0].x += 100 * U;
	const s = new Simulation({ operation: op });
	assert.equal(
		s.targets[0].parts[0].x,
		op.targets[0].x + op.targets[0].parts[0].dx,
	);
	assert.equal(s.operation.name, OPERATION.name);
});
for (const kind of [
	"drone",
	"gun",
	"impact",
	"flak",
	"bomb",
	"voice",
	"click",
	"warning",
	"extinguish",
])
	test("Procedural audio " + kind + ": finite, audible, unclipped", () => {
		const data = synthSamples(kind);
		let energy = 0,
			peak = 0;
		for (const x of data) {
			assert(Number.isFinite(x));
			energy += x * x;
			peak = Math.max(peak, Math.abs(x));
		}
		assert(energy / data.length > 0.00001);
		assert(peak < 0.99);
	});
test("Package preserves Hub client and embeds all dependencies", () => {
	execFileSync(process.execPath, ["tools/build.mjs", "--quiet"], {
		stdio: "pipe",
	});
	const html = readFileSync("game.html", "utf8"),
		hub = readFileSync("vendor/hub-repo/lib/hub/session.js", "utf8");
	assert.equal(
		html.match(/<meta charset="utf-8"><script>([\s\S]*?)<\/script>/)[1],
		hub,
	);
	assert(
		[...html.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)].every(
			(m) => !/\bsrc\s*=/i.test(m[1]),
		),
	);
	assert(html.includes("Apache License"));
	assert(html.includes("RELEASE_LICENSES"));
	assert(html.includes("shared-world"));
});
test("Native bank frame agrees with right-side-down convention", () => {
	const p = local(
		{ x: 0, y: 0, z: 0, heading: 0, pitch: 0, bank: Math.PI / 6 },
		0,
		16,
		0,
	);
	assert(p.z < 0);
	assert(Math.abs(p.z + 8) < 1e-8);
});
test("Attract controller completes the real sortie and showcases every beat", () => {
	const s = new Simulation({ seed: 1717, attract: true });
	s.aircraft.throttle = 0.9;
	advance(s, 721, (q) => sortieBot(q));
	assert(s.result?.won);
	for (const event of [
		"takeoff",
		"wave",
		"flak-warning",
		"release",
		"impact",
		"finish",
	])
		assert(s.history.some((e) => e.type === event));
});
await writeFile(
	new URL("../docs/verification.json", import.meta.url),
	JSON.stringify({ count, failed, evidence }, null, 2),
);
console.log(`${count - failed}/${count} checks passed; ${failed} failures`);
process.exitCode = failed ? 1 : 0;
