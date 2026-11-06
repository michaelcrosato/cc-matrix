import assert from "node:assert/strict";
import "../src/net.js";

const N = globalThis.NightNet;
const zero = () => ({ x: 0, y: 0, focus: false, ray: 0 });
function fixture() {
	return {
		seed: 1,
		tick: 120,
		time: 1,
		stage: 0,
		stageTime: 1,
		phase: "playing",
		score: 100,
		streak: 0,
		kills: 1,
		totalTargets: 6,
		assisted: false,
		players: [
			{
				id: 0,
				x: 40,
				y: 50,
				vx: 2,
				vy: 0,
				bees: 12,
				charge: true,
				focus: false,
				r: 10,
				hitUntil: 0,
				contact: false,
				raySeen: 1,
				emptySince: 0,
			},
			{
				id: 1,
				x: 60,
				y: 50,
				vx: 0,
				vy: 0,
				bees: 11,
				charge: false,
				focus: true,
				r: 6,
				hitUntil: 2,
				contact: true,
				raySeen: 0,
				emptySince: 0,
			},
		],
		targets: [
			{
				id: 4,
				type: "left",
				x: 120,
				y: 80,
				r: 8,
				health: 8,
				maxHealth: 10,
				dir: 1,
				warning: 0,
				contact: true,
				recovering: false,
				bossPhase: "move",
			},
		],
		rivals: [
			{
				id: 5,
				x: 200,
				y: 90,
				r: 9,
				stage: "hunter",
				warning: 0,
				age: 20,
				angle: 1,
			},
		],
		husks: [{ id: 3, x: 150, y: 200, r: 8 }],
		obstacles: [{ x: 190, y: 40, w: 16, h: 30 }],
		events: [],
		tuning: { speed: 86 },
		stats: { rays: 1 },
	};
}
function session(options = {}) {
	return new N.Session({
		kind: "direct",
		host: true,
		server: false,
		localIndex: 0,
		players: [{ id: 0 }, { id: 1 }],
		hostId: 0,
		callbacks: {},
		transport: () => true,
		...options,
	});
}
export function runNetworkUnitTests() {
	const results = [];
	const test = (name, fn) => {
		try {
			fn();
			results.push({ name, pass: true });
		} catch (e) {
			results.push({ name, pass: false, error: e.stack });
		}
	};
	test("snapshot independently retains shared garden state", () => {
		const w = fixture(),
			s = N.unpack(N.pack(w));
		assert.equal(s.targets[0].type, "left");
		assert.equal(s.rivals[0].stage, "hunter");
		assert.equal(s.players[1].bees, 11);
		assert.deepEqual(s.obstacles, w.obstacles);
		assert.equal(s.score, 100);
		assert.equal(s.tick, 120);
	});
	test("all authored upper bounds fit reliable packet limit", () => {
		const w = fixture();
		w.targets = Array.from({ length: 12 }, (_, i) => ({
			...w.targets[0],
			id: 100 + i,
		}));
		w.rivals = Array.from({ length: 8 }, (_, i) => ({
			...w.rivals[0],
			id: 200 + i,
		}));
		w.husks = Array.from({ length: 20 }, (_, i) => ({
			...w.husks[0],
			id: 300 + i,
		}));
		assert.ok(N.bytes({ v: 1, k: "s", q: 999, w: N.pack(w) }) < 16384);
	});
	test("large independently complete snapshots choose reliable delivery", () => {
		const w = fixture(),
			sent = [];
		w.targets = Array.from({ length: 12 }, (_, i) => ({
			...w.targets[0],
			id: 100 + i,
		}));
		w.rivals = Array.from({ length: 5 }, (_, i) => ({
			...w.rivals[0],
			id: 200 + i,
		}));
		w.husks = Array.from({ length: 12 }, (_, i) => ({
			...w.husks[0],
			id: 300 + i,
		}));
		const s = session({
			transport: (data, reliable) => {
				sent.push({ data, reliable });
				return true;
			},
		});
		s.tick(1 / 12, zero(), w);
		assert.equal(sent.length, 1);
		assert.equal(sent[0].reliable, true);
		const received = N.unpack(sent[0].data.w);
		assert.equal(received.targets.length, 12);
		assert.equal(received.rivals.length, 5);
		assert.equal(received.husks.length, 12);
		assert.ok(s.diagnostics.maxBytes > 1200 && s.diagnostics.maxBytes <= 16384);
	});
	test("intent validation rejects nonfinite and excessive axes", () => {
		assert.equal(N.validateAction({ x: NaN, y: 0, ray: 0 }), null);
		assert.equal(N.validateAction({ x: 2, y: 0, ray: 0 }), null);
		assert.equal(N.validateAction({ x: 0, y: 0, ray: -1 }), null);
		const a = N.validateAction({ x: 1, y: 1, ray: 2 }, zero());
		assert.ok(Math.hypot(a.x, a.y) <= 1.00001);
		assert.equal(
			N.validateAction({ ...zero(), ray: 0 }, { ...zero(), ray: 5 }).ray,
			5,
		);
	});
	test("remote ownership and monotonic sequence", () => {
		const s = session();
		s.receive({ v: 1, k: "i", q: 1, a: [1, 0, 1, 2] }, 99);
		assert.equal(s.inputs[1].ray, 0);
		s.receive({ v: 1, k: "i", q: 1, a: [1, 0, 1, 2] }, 1);
		assert.equal(s.inputs[1].ray, 2);
		s.receive({ v: 1, k: "i", q: 1, a: [-1, 0, 0, 0] }, 1);
		assert.equal(s.inputs[1].x, 1);
		s.receive({ v: 1, k: "i", q: 2, a: [-1, 0, 0, 0] }, 1);
		assert.equal(s.inputs[1].ray, 2);
	});
	test("stale remote movement and focus release within 450ms", () => {
		const s = session();
		s.receive({ v: 1, k: "i", q: 1, a: [1, 0, 1, 2] }, 1);
		for (let i = 0; i < 56; i++) s.tick(1 / 120, zero(), fixture());
		assert.equal(s.inputs[1].x, 0);
		assert.equal(s.inputs[1].focus, false);
		assert.equal(s.inputs[1].ray, 2);
	});
	test("sender traffic remains below 20Hz and teardown stops it", () => {
		const sent = [];
		const s = session({
			transport: (data) => {
				sent.push(data);
				return true;
			},
		});
		for (let i = 0; i < 120; i++) s.tick(1 / 120, zero(), fixture());
		assert.ok(sent.length >= 10 && sent.length <= 13);
		assert.ok(s.diagnostics.maxPerSecond <= 19);
		s.close();
		const before = sent.length;
		for (let i = 0; i < 120; i++) s.tick(1 / 120, zero(), fixture());
		assert.equal(sent.length, before);
	});
	test("Hub countdown and once-only tied finish", () => {
		const old = globalThis.AIHub;
		let clock = -1;
		const calls = [];
		globalThis.AIHub = { time: () => clock, finish: (v) => calls.push(v) };
		try {
			const s = session({ kind: "hub" });
			assert.equal(s.canStep(), false);
			s.started = true;
			assert.equal(s.canStep(), false);
			clock = 0;
			assert.equal(s.canStep(), true);
			s.finish(fixture(), false);
			s.finish(fixture(), true);
			assert.equal(calls.length, 0);
			s.receive({ v: 1, k: "ack" }, 1);
			assert.equal(calls.length, 1);
			assert.deepEqual(calls[0].standings, [[0, 1]]);
			assert.deepEqual(calls[0].scores, { 0: 100, 1: 100 });
			assert.equal(calls[0].won, false);
		} finally {
			globalThis.AIHub = old;
		}
	});
	test("Hub final state acknowledgement has a once-only 450ms fallback", () => {
		const oldHub = globalThis.AIHub,
			oldSet = globalThis.setTimeout,
			oldClear = globalThis.clearTimeout;
		let fallback, delay;
		const calls = [];
		globalThis.AIHub = {
			time: () => 0,
			finish: (data) => {
				calls.push(data);
			},
		};
		globalThis.setTimeout = (fn, ms) => {
			fallback = fn;
			delay = ms;
			return 1;
		};
		globalThis.clearTimeout = () => {};
		try {
			const s = session({ kind: "hub" });
			s.finish(fixture(), true);
			assert.equal(delay, 450);
			assert.equal(calls.length, 0);
			fallback();
			assert.equal(calls.length, 1);
			s.receive({ v: 1, k: "ack" }, 1);
			s.finish(fixture(), false);
			assert.equal(calls.length, 1);
		} finally {
			globalThis.AIHub = oldHub;
			globalThis.setTimeout = oldSet;
			globalThis.clearTimeout = oldClear;
		}
	});
	test("dedicated authority has no synthetic local player", () => {
		const s = session({ kind: "hub", server: true, localIndex: -1 });
		assert.equal(s.inputs.length, 2);
		assert.equal(s.localIndex, -1);
		s.leave(1);
		assert.equal(s.players[1].left, true);
		assert.equal(s.inputs[1].x, 0);
	});
	test("direct codes reject malformed wrong-step and oversized input", () => {
		const offer = { type: "offer", sdp: "v=0\r\ns=local test\r\n" },
			code = N.encodeDescription(offer);
		assert.deepEqual(N.decodeDescription(code, "offer"), offer);
		assert.throws(() => N.decodeDescription(code, "answer"));
		assert.throws(() => N.decodeDescription("garbage", "offer"));
		assert.throws(() =>
			N.decodeDescription(`KBN1.${"a".repeat(65536)}`, "offer"),
		);
	});
	return results;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
	const r = runNetworkUnitTests();
	for (const t of r) if (!t.pass) console.error(`FAIL ${t.name}\n${t.error}`);
	console.log(
		`${r.filter((t) => t.pass).length}/${r.length} network unit checks passed`,
	);
	if (r.some((t) => !t.pass)) process.exitCode = 1;
}
