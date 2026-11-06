import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
require(path.join(root, "vendor/engine-repo/dist/handoff/my-3d2dge.js"));
require(path.join(root, "content/tower.js"));
require(path.join(root, "src/simulation.js"));
const E = globalThis.My3D2dge;
const TT = globalThis.TallTale;
const DT = 1 / 120;
const N = () => TT.neutralIntent();

function fixture(players) {
	const s = new TT.Simulation(E, { players });
	for (const a of s.actors) a.recovery = 0;
	return s;
}
function climbFixture() {
	const s = fixture(),
		a = s.actors[0];
	s.advance(0.6);
	a.body.x = 88;
	a.body.z = 16;
	a.body.vx = a.body.vz = 0;
	a.body.onGround = true;
	a.recovery = 0;
	s.step(DT, { 1: { up: true } });
	return { s, a };
}
function addContact(s, type, a = s.actors[0]) {
	s.spawnHazard(type, 0);
	const h = s.hazards.at(-1);
	Object.assign(h, {
		x: a.x,
		z: a.z,
		vx: 0,
		vz: 0,
		age: type === "bird" ? 3.15 : type === "bat" ? 2.15 : 2,
		startZ: a.z,
		state:
			type === "bird"
				? "cross"
				: type === "bat"
					? "swoop"
					: type === "rat"
						? "scurry"
						: "roll",
		bumper: null,
		bounced: true,
	});
	return h;
}
function route(options = {}, limit = 700, script) {
	const s = new TT.Simulation(E, options),
		trace = [];
	for (let k = 0; k < limit * 120; k++) {
		const intents = {};
		for (const a of s.actors) intents[a.id] = s.botIntent(a.id);
		if (script) script(s, intents, k);
		if (k % 120 === 0)
			trace.push({
				t: +s.time.toFixed(2),
				section: s.section,
				phase: s.phase,
				chances: s.chances,
				actors: s.actors.map((a) => [a.id, +a.x.toFixed(2), +a.z.toFixed(2)]),
			});
		s.step(DT, intents);
		for (const a of s.actors)
			for (const n of [a.x, a.z, a.vx, a.vz])
				assert(Number.isFinite(n), "Route produced a non-finite actor");
		if (["results", "failed"].includes(s.phase)) break;
	}
	return { s, trace };
}

export async function runRules() {
	const failures = [],
		details = [];
	let count = 0;
	const test = (name, fn) => {
		count++;
		try {
			const detail = fn();
			details.push({ name, pass: true, detail: detail || null });
		} catch (e) {
			failures.push(`${name}: ${e.message}`);
			details.push({ name, pass: false, error: e.stack });
		}
	};
	test("authored content has unique IDs, valid fixtures, window timing and a route on every floor", () =>
		assert.deepEqual(TT.validateContent(), []));
	test("validator rejects a missing upward route", () => {
		const c = structuredClone(TT.CONTENT);
		c.sections[0].windows = c.sections[0].windows.filter((w) => w.floor !== 2);
		assert(TT.validateContent(c).some((e) => e.includes("no reachable")));
	});
	test("validator rejects broken bumper links", () => {
		const c = structuredClone(TT.CONTENT);
		c.sections[1].bumpers[0].next = "missing";
		assert(TT.validateContent(c).some((e) => e.includes("broken bumper")));
	});
	test("native platformer jump cannot bypass the 48-unit floor", () => {
		const s = fixture();
		let max = 16;
		for (let k = 0; k < 100; k++) {
			s.step(DT, { 1: { jump: true, jumpPressed: k === 0 } });
			max = Math.max(max, s.actors[0].z);
		}
		assert(max > 30 && max < 40, `Native jump apex ${max}`);
		assert.equal(s.floorOf(s.actors[0]), 0);
	});
	test("native variable jump height and running leap remain intact", () => {
		const jump = (hold, running) => {
			const s = fixture();
			const a = s.actors[0];
			a.body.vx = running ? 95 : 0;
			let z = a.z;
			for (let k = 0; k < 60; k++) {
				s.step(DT, {
					1: { x: running ? 1 : 0, jump: hold || k < 3, jumpPressed: k === 0 },
				});
				z = Math.max(z, a.z);
			}
			return { z, x: a.x };
		};
		const full = jump(true, false),
			short = jump(false, false),
			run = jump(true, true);
		assert(full.z > short.z + 5);
		assert(run.x > full.x + 30);
	});
	test("native coyote jump works after leaving a ledge", () => {
		const level = new E.PlatformMap({
			rows: ["###     "],
			legend: { "#": 1 },
			types: { 1: {} },
			edges: "open",
		});
		const b = new E.Platformer({
			x: 46,
			z: 16,
			vx: 95,
			run: 95,
			onGround: true,
			jump: 200,
			gravity: 1000,
		});
		for (let k = 0; k < 10; k++) b.update(DT, level, { x: 1 });
		assert(!b.onGround);
		b.update(DT, level, { x: 1, jump: true, jumpPressed: true });
		assert(b.jumped && b.vz > 0);
	});
	test("common-intent jump buffering survives press before landing", () => {
		const s = fixture(),
			a = s.actors[0];
		Object.assign(a.body, { z: 18, vz: -100, onGround: false });
		let jumped = false;
		for (let k = 0; k < 15; k++) {
			s.step(DT, { 1: { jump: true, jumpPressed: k === 0 } });
			jumped ||= a.body.jumped;
		}
		assert(jumped, "Buffered jump was lost on landing");
	});
	test("one incident consumes only one chance through recovery", () => {
		const s = fixture(),
			a = s.actors[0];
		assert(s.hurtActor(a, "test"));
		assert(!s.hurtActor(a, "duplicate"));
		assert.equal(s.chances, 2);
		s.advance(0.8);
		assert(a.recovery > 1.8);
		assert(!s.hurtActor(a, "reentry"));
	});
	test("a physical hazard cannot consume two shared chances from the same contact", () => {
		const s = fixture([
			{ id: 0, seat: 1 },
			{ id: 1, seat: 2 },
		]);
		for (const a of s.actors) {
			a.body.x = 160;
			a.body.z = 16;
			a.prev = { x: a.x, z: a.z };
		}
		const h = addContact(s, "boulder");
		s._hazards(DT);
		assert.equal(s.chances, 2);
		assert(h.spent);
	});
	test("native E.Action works on Platformer without a parallel movement owner", () => {
		const { s, a } = climbFixture();
		assert(a.action instanceof E.Action);
		const before = a.x;
		s.advance(0.2, { 1: { up: true, x: 1, jump: true, jumpPressed: true } });
		assert(Math.abs(a.x - before) < 0.01);
		assert(a.z > 28 && a.z < 48);
		assert(a.body.climbing);
	});
	test("releasing up holds a window climb and down reverses it", () => {
		const { s, a } = climbFixture();
		s.advance(0.25, { 1: { up: true } });
		const z = a.z;
		s.advance(0.2);
		assert.equal(a.z, z);
		s.advance(0.4, { 1: { down: true } });
		assert.equal(a.z, 16);
		assert.equal(a.traversal, null);
		assert(a.body.onGround);
	});
	test("window ascent exits on the exact upper collision feet", () => {
		const { s, a } = climbFixture();
		s.advance(0.8, { 1: { up: true } });
		assert.equal(a.z, 64);
		assert.equal(a.traversal, null);
		assert.equal(a.body.climbing, false);
		assert.equal(s.coverage.windows, 1);
	});
	test("closed windows reject entry", () => {
		const s = fixture(),
			a = s.actors[0];
		a.body.x = 232;
		s.advance(0.2, { 1: { up: true } });
		assert.equal(a.traversal, null);
		assert.equal(a.z, 16);
	});
	test("warning entry is risky and shutter closure cancels climb into one tumble", () => {
		const s = fixture(),
			a = s.actors[0];
		s.sectionTime = 7.7;
		s._updateWindows();
		a.body.x = 88;
		a.body.z = 16;
		a.body.onGround = true;
		s.step(DT, { 1: { up: true } });
		assert(a.traversal);
		s.advance(0.25, { 1: { up: true } });
		assert.equal(a.traversal, null);
		assert(a.hurt > 0);
		assert.equal(s.chances, 2);
	});
	test("every authored floor eventually opens and never offers two simultaneous routes", () => {
		for (const hard of [false, true])
			for (let section = 0; section < 4; section++) {
				const s = new TT.Simulation(E, { hard });
				s._enterSection(section);
				const seen = new Set();
				for (let t = 0; t < 100; t += 0.2) {
					s.sectionTime = t;
					s._updateWindows(false);
					for (let f = 0; f < s.currentSection().floors; f++) {
						const n = s.windows.filter((w) => w.floor === f && w.usable).length;
						assert(n <= 1);
						if (n) seen.add(f);
					}
				}
				assert.equal(seen.size, s.currentSection().floors);
			}
	});
	test("descending through an open window uses the same reversible native action", () => {
		const { s, a } = climbFixture();
		s.advance(0.8, { 1: { up: true } });
		s.advance(0.2);
		s.advance(0.8, { 1: { down: true } });
		assert.equal(a.z, 16);
		assert.equal(a.traversal, null);
	});
	test("native overlap plus swept collision catches a stone crossing within one fast tick", () => {
		const a = { x: 160, z: 16, w: 9, h: 22 },
			b = { x: 180, z: 16, w: 9, h: 9 };
		assert(!E.overlapBox(a, b));
		assert(TT.sweptContact(E, a, b, { x: 160, z: 16 }, { x: 140, z: 16 }));
		assert(
			!TT.sweptContact(
				E,
				{ ...a, z: 40 },
				b,
				{ x: 160, z: 40 },
				{ x: 140, z: 16 },
			),
		);
	});
	for (const type of ["boulder", "bumper", "split", "rat", "bird", "bat"]) {
		test(`${type} powered contact produces one destruction and one stable award`, () => {
			const s = fixture(),
				a = s.actors[0];
			a.body.x = 160;
			a.power = 6;
			a.prev = { x: a.x, z: a.z };
			const h = addContact(s, type);
			s._hazards(DT);
			assert(h.spent, `${type} survived powered contact`);
			assert.equal(s.chances, 3);
			assert.equal(s.score, 50);
			s._hazards(DT);
			assert.equal(s.score, 50);
		});
		test(`${type} can be avoided through normal movement without spending a chance`, () => {
			const s = fixture(),
				a = s.actors[0];
			a.body.x = 160;
			const h = addContact(s, type);
			// A deliberately telegraphed lane ahead: walk away, then jump across a grounded threat.
			h.x = 185;
			h.vx = -20;
			h.state = "telegraph";
			h.age = 0;
			h.telegraph = 1;
			for (let k = 0; k < 30; k++)
				s.step(DT, {
					1: {
						x: -1,
						jump: !["bird", "bat"].includes(type),
						jumpPressed: k === 0 && !["bird", "bat"].includes(type),
					},
				});
			assert.equal(s.chances, 3);
			assert(a.x < 145);
		});
	}
	test("bumper stone visibly reverses then takes its linked drop", () => {
		const s = fixture();
		s._enterSection(1);
		s.hazards.length = 0;
		const lesson = s.currentSection().spawns.find((h) => h.type === "bumper");
		s._spawn(lesson, 0);
		for (let k = 0; k < 120 * 9; k++) s._hazards(DT);
		assert(s.coverage.reversals > 0);
		assert(s.coverage.drops > 0);
	});
	test("cracked boulder splits into two distinct trajectories", () => {
		const s = fixture();
		s._enterSection(1);
		const lesson = s.currentSection().spawns.find((h) => h.type === "split");
		s._spawn(lesson, 0);
		let fragments = [];
		for (let k = 0; k < 120 * 7; k++) {
			s._hazards(DT);
			fragments = s.hazards.filter((h) => h.type === "fragment");
			if (fragments.length === 2) break;
		}
		assert.equal(fragments.length, 2);
		assert(fragments[0].vx * fragments[1].vx < 0);
		assert.equal(s.coverage.splits, 1);
	});
	test("a heart visibly travels from Mabel and grants six seconds to both climbers", () => {
		const s = fixture([
			{ id: 0, seat: 1 },
			{ id: 1, seat: 2 },
		]);
		for (const a of s.actors) {
			a.body.x = 150;
			a.body.z = 64;
		}
		s.floorSeen[1] = 0;
		s.sectionTime = 0.5;
		s._schedule();
		const h = s.hearts[0];
		assert(h.z > 200 && h.targetZ < 100);
		for (let k = 0; k < 200; k++) s._hearts(DT);
		assert(s.actors.every((a) => a.power >= 6));
		assert.equal(s.score, 50);
		const duplicate = { ...h, collected: false, age: 1.5 };
		s.hearts.push(duplicate);
		s.actors[0].power = 2;
		s._hearts(DT);
		assert.equal(s.actors[0].power, 2);
		assert.equal(s.score, 50);
	});
	test("heart expiry gives a warning and cannot remove protection on pickup contact frame", () => {
		const s = fixture(),
			a = s.actors[0];
		a.power = 1.21;
		s.advance(0.03);
		assert(s.events.some((e) => e.type === "heart-warning"));
		a.body.x = 150;
		s.hearts = [
			{
				id: "contact",
				baseId: "contact",
				x: 150,
				z: 27,
				startX: 150,
				startZ: 27,
				targetX: 150,
				targetZ: 27,
				age: 2,
				life: 12,
				floor: 0,
			},
		];
		const h = addContact(s, "rat");
		h.x = 150;
		s.step(DT, { 1: N() });
		assert(a.power > 5.9);
		assert.equal(s.chances, 3);
		s.hazards = [];
		s.advance(6.2);
		assert.equal(a.power, 0);
	});
	test("a legitimate ledge fall consumes one chance and returns to current section start", () => {
		const s = fixture(),
			a = s.actors[0];
		a.body.x = -7;
		s.step(DT, { 1: { x: -1 } });
		s.advance(1);
		assert.equal(s.chances, 2);
		assert.equal(a.z, 16);
		assert(a.recovery > 0);
	});
	test("co-op regroup timeout carries a straggler and awards a pursuit once", () => {
		const s = fixture([
			{ id: 0, seat: 1 },
			{ id: 1, seat: 2 },
		]);
		const a = s.actors[0];
		Object.assign(a.body, { x: 248, z: 208, onGround: true });
		s.step(DT);
		assert(s.regroup > 3);
		s.advance(3.3);
		assert.equal(s.phase, "transition");
		assert.equal(s.score, 125);
		s.advance(4.1);
		assert.equal(s.section, 1);
		assert(s.actors.every((p) => p.z === 16));
		assert.equal(s.score, 125);
	});
	test("helper departure cannot block regroup", () => {
		const s = fixture([
			{ id: 0, seat: 1 },
			{ id: 1, seat: 2 },
		]);
		Object.assign(s.actors[0].body, { x: 248, z: 208, onGround: true });
		s.step(DT);
		s.removePlayer(1);
		s.step(DT);
		assert.equal(s.phase, "transition");
		assert.equal(s.actors.length, 1);
	});
	test("failure retry restores checkpoint score baseline and separates continued records", () => {
		const s = fixture();
		s.award("section:old", 100, "old pursuit");
		s._enterSection(1);
		const baseline = s.score;
		s.award("heart:temporary", 50, "temporary heart");
		s.chances = 1;
		s.actors[0].recovery = 0;
		s.hurtActor(s.actors[0], "test");
		assert.equal(s.phase, "failed");
		assert(s.retryCheckpoint());
		assert.equal(s.chances, 3);
		assert.equal(s.score, baseline);
		assert(!s.ledger["heart:temporary"]);
		assert.equal(s.recordCategory(), "continued");
		s.setConfig("run", 120);
		assert.equal(s.recordCategory(), "unranked");
	});
	test("malformed checkpoint data cannot corrupt or prevent fresh play", () => {
		const s = fixture();
		for (const cp of [
			null,
			{},
			{ v: 1, section: 20 },
			{ v: 1, section: 0, score: 500, ledger: {} },
			{ v: 1, section: 0, score: 0, ledger: null },
		])
			assert.equal(s.loadCheckpoint(cp), false);
		assert.equal(s.section, 0);
		assert.equal(s.score, 0);
		s.step(DT, { 1: { x: 1 } });
		assert(s.actors[0].x > 48);
	});
	test("live balance reset updates active native bodies and keeps the cheated run unranked", () => {
		const s = fixture();
		s.setConfig("run", 125);
		assert.equal(s.actors[0].body.run, 125);
		s.setConfig("jump", 250);
		s.resetConfig();
		assert.deepEqual(s.config, TT.DEFAULTS);
		assert.equal(s.actors[0].body.run, 95);
		assert.equal(s.actors[0].body.jump, 200);
		assert(s.unranked);
	});
	test("harder replay changes authored route order and combinations without blanket speed multiplication", () => {
		const a = fixture(),
			b = new TT.Simulation(E, { hard: true });
		a.sectionTime = b.sectionTime = 5;
		a._updateWindows(false);
		b._updateWindows(false);
		assert.notEqual(
			a.windows.find((w) => w.usable).x,
			b.windows.find((w) => w.usable).x,
		);
		assert(b.encounters.length > a.encounters.length);
		assert.equal(a.config.run, b.config.run);
		assert.equal(a.config.hazardSpeed, b.config.hazardSpeed);
	});
	test("snapshot restore preserves mid-window ownership and deterministic simulation", () => {
		const { s, a } = climbFixture();
		s.advance(0.25, { 1: { up: true } });
		const snap = s.snapshot();
		const b = fixture().restore(snap);
		assert.equal(b.actors[0].z, a.z);
		for (let k = 0; k < 200; k++) {
			const i = { 1: k < 30 ? { up: true } : { x: 1 } };
			s.step(DT, i);
			b.step(DT, i);
		}
		assert.deepEqual(b.snapshot(), s.snapshot());
	});
	test("compact shared-world snapshots reject stale state and replicate objective/score ledger", () => {
		const a = fixture([
				{ id: 0, seat: 1 },
				{ id: 1, seat: 2 },
			]),
			b = fixture([
				{ id: 0, seat: 1 },
				{ id: 1, seat: 2 },
			]);
		a.advance(1);
		a.award("test-heart", 50, "Mabel's heart");
		const snap = a.compactSnapshot();
		assert(b.applyCompact(snap));
		assert.equal(b.tick, a.tick);
		assert.equal(b.score, a.score);
		assert.deepEqual(b.ledger, a.ledger);
		const old = { ...snap, t: snap.t - 1, sc: 0 };
		assert.equal(b.applyCompact(old), false);
		assert.equal(b.score, 50);
	});
	test("retained seed and normal intention trace reproduce the same rule state", () => {
		const a = fixture(),
			b = fixture();
		const trace = [];
		for (let k = 0; k < 1800; k++) {
			const i = a.botIntent(1);
			trace.push(structuredClone(i));
			a.step(DT, { 1: i });
		}
		for (const i of trace) b.step(DT, { 1: i });
		// Bot planning is an input adapter; only authoritative rule state is compared.
		const sa = a.snapshot(),
			sb = b.snapshot();
		assert.deepEqual(sb, sa);
	});
	test("native game draw-enabled and draw-skipped runs have identical rules and no errors", () => {
		const run = (draw) => {
			const s = fixture(),
				game = new E.Game({
					headless: true,
					draw: true,
					view: "side",
					input: "PLATFORMER",
					res: [640, 480],
				});
			game.start({
				update(dt) {
					s.step(dt, { 1: { x: 1, jump: true, jumpPressed: s.tick === 30 } });
				},
				draw(r) {
					r.sky(["#102030", "#405060"]);
					s.level.draw(r);
				},
			});
			game.advance(1, { draw });
			assert.equal(game.errors.length, 0);
			const snap = s.snapshot();
			game.dispose();
			return snap;
		};
		assert.deepEqual(run(true), run(false));
	});

	test("full uncheated solo normal-input route exercises every family through rescue and plane departure", () => {
		const { s, trace } = route();
		fs.writeFileSync(
			path.join(root, "artifacts/solo-route.json"),
			JSON.stringify(
				{ outcome: s.outcome(), elapsed: s.time, coverage: s.coverage, trace },
				null,
				2,
			),
		);
		assert.equal(
			s.phase,
			"results",
			`Solo route ended ${s.phase} at section ${s.section}`,
		);
		assert(s.rescued);
		assert(s.departureTime >= 9);
		assert.equal(s.invulnerable, false);
		assert.equal(s.unranked, false);
		assert(s.coverage.windows >= 15);
		assert(s.coverage.jumps > 0);
		assert(s.coverage.hearts > 0);
		for (const kind of ["boulder", "bumper", "split", "rat", "bird", "bat"]) {
			assert(s.coverage.seen[kind], `${kind} not exercised`);
			assert(
				s.coverage.smashed[kind],
				`${kind} never cleared under heart rush`,
			);
		}
		assert(s.coverage.reversals && s.coverage.drops && s.coverage.splits);
		assert.equal(s.coverage.sections, 3);
		assert.equal(s.coverage.rescue, 1);
		assert.equal(
			Object.keys(s.ledger).filter((k) => k === "objective:rescue").length,
			1,
		);
		return { seconds: s.time, score: s.score, coverage: s.coverage };
	});
	test("full two-climber route shares objectives and reaches the same ending without cheats", () => {
		const { s, trace } = route({
			players: [
				{ id: 0, seat: 1 },
				{ id: 1, seat: 2 },
			],
		});
		fs.writeFileSync(
			path.join(root, "artifacts/coop-route.json"),
			JSON.stringify(
				{ outcome: s.outcome(), elapsed: s.time, coverage: s.coverage, trace },
				null,
				2,
			),
		);
		assert.equal(
			s.phase,
			"results",
			`Co-op ended ${s.phase} section ${s.section}`,
		);
		assert(s.rescued);
		assert(s.actors.every((a) => a.finished));
		assert(s.actors.every((a) => a.stats.climbs > 0));
		assert(s.coverage.hits > 0, "Route should include a recoverable mistake");
		return { seconds: s.time, score: s.score, chances: s.chances };
	});
	test("a checkpoint retry and helper leaving on the roof still permit a complete solo rescue", () => {
		let retried = false,
			left = false,
			retries = 0;
		const s = new TT.Simulation(E, {
			players: [
				{ id: 0, seat: 1 },
				{ id: 1, seat: 2 },
			],
		});
		for (let k = 0; k < 120 * 700; k++) {
			if (!retried && s.section === 1) {
				s.retryCheckpoint();
				retried = true;
			}
			if (!left && s.section === 3) {
				s.removePlayer(1);
				left = true;
			}
			const intents = {};
			for (const a of s.actors) intents[a.id] = s.botIntent(a.id);
			s.step(DT, intents);
			if (s.phase === "failed" && retries < 2) {
				s.retryCheckpoint();
				retries++;
			}
			if (s.phase === "results") break;
		}
		assert(retried && left);
		assert.equal(s.phase, "results");
		assert.equal(s.recordCategory(), "continued");
		assert.equal(s.actors.length, 1);
		return { seconds: s.time, score: s.score, retries };
	});
	fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
	fs.writeFileSync(
		path.join(root, "artifacts/rules-report.json"),
		JSON.stringify({ count, failures, details }, null, 2),
	);
	return { count, failures };
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const r = await runRules();
	for (const f of r.failures) console.log(`FAIL ${f}`);
	console.log(`${r.count - r.failures.length}/${r.count} rule checks passed`);
	process.exitCode = r.failures.length ? 1 : 0;
}
