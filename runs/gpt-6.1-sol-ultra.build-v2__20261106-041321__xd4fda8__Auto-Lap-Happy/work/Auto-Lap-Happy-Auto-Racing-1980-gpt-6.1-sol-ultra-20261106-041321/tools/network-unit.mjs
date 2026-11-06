import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export async function runNetworkUnitTests() {
	const results = [];
	const test = (name, pass, detail = "") =>
		results.push({ name, pass: !!pass, detail });
	const source = fs.readFileSync(
		new URL("../src/network.js", import.meta.url),
		"utf8",
	);
	let clock = 0;
	function makeHub({
		host = true,
		server = false,
		me = 0,
		courseCount = 5,
		rngValue = 0.4,
		players = [
			{ id: 0, name: "One" },
			{ id: 1, name: "Two" },
		],
	} = {}) {
		const handlers = {},
			sent = [],
			finishes = [],
			inputs = [],
			snaps = [],
			starts = [];
		let ready = 0;
		const info = {
			isHost: host,
			server,
			me,
			players,
			host: server ? 99 : 0,
			round: 7,
			seed: 1980,
		};
		const hub = {
			active: true,
			connect: async () => info,
			rng: () => () => rngValue,
			time: () => clock,
			ready: () => ready++,
			send: (p, o) => {
				sent.push([p, o]);
				return true;
			},
			finish: (f) => finishes.push(f),
			progress: () => {},
			on: (name, fn) => {
				handlers[name] = fn;
				return () => delete handlers[name];
			},
		};
		const ctx = vm.createContext({
			AIHub: hub,
			performance: { now: () => clock },
			setTimeout,
			clearTimeout,
			Uint32Array,
			console,
		});
		ctx.globalThis = ctx;
		vm.runInContext(source, ctx);
		const network = new ctx.HappyNetwork({
			courseCount,
			onInput: (s, i) => inputs.push([s, i]),
			onSnapshot: (s) => snaps.push(s),
			onStart: (c) => starts.push(c),
		});
		return {
			network,
			handlers,
			sent,
			finishes,
			inputs,
			snaps,
			starts,
			info,
			get ready() {
				return ready;
			},
		};
	}
	const h = makeHub();
	await h.network.connectHub();
	const extended = makeHub({ courseCount: 6, rngValue: 0.99 });
	await extended.network.connectHub();
	test(
		"Hub configuration honors the authored course count",
		extended.starts[0].course === 5,
	);
	test("Hub ready needs no gesture", h.ready === 1 && h.starts.length === 1);
	test(
		"Hub deterministic config",
		h.starts[0].course === 2 && h.starts[0].humans === 2,
	);
	test(
		"Hub authoritative seat",
		h.network.authoritative && h.network.localSeat === 0,
	);
	h.network.update(0.125, { score: [4, 2] }, {});
	test(
		"Hub host emits state",
		h.sent.length === 1 &&
			h.sent[0][0].t === "s" &&
			h.sent[0][1].reliable === false,
	);
	const input = (n) =>
		h.network.packet("i", {
			n,
			i: { steer: 0.3, brake: 0.5, throttle: 0.8, recover: false },
		});
	h.handlers.message(input(2), 1);
	h.handlers.message(input(1), 1);
	h.handlers.message(input(5), 9);
	test(
		"Hub validates sender and sequence",
		h.inputs.length === 1 &&
			h.inputs[0][0] === 1 &&
			h.inputs[0][1].brake === 0.5,
	);
	clock = 1000;
	h.network.update(0.1, { score: [4, 2] }, {});
	test("Hub stale input brakes", h.inputs.at(-1)[1].brake === 1);
	clock = 1250;
	const raceSnapshot = {
		v: 1,
		mode: "duel",
		state: "running",
		ci: 4,
		t: 55.213,
		tick: 6625,
		score: [4, 2],
		ex: 4,
		cd: 0,
		target: 10,
		laps: 2,
		penalty: 0,
		message: "DRIVER 1 +1 · Clear lead",
		messageT: 1.1123,
		finished: null,
		cars: [0, 1].map((i) => ({
			x: 2243.12 + i * 12,
			y: 1522.76,
			a: 1.2345,
			vx: 45.23,
			vy: 123.45,
			s: 131.45,
			p: 3 + i,
			cr: 0,
			im: 0.123456,
			r: {
				index: 156,
				d: 4325.234232,
				total: 10437.123456,
				gate: 4,
				lap: 1,
				lastGate: 3,
				lapT: 13.543326,
				splits: [51.234321],
				valid: true,
				wrong: false,
			},
		})),
	};
	h.network.update(0.125, raceSnapshot, {});
	const wire = h.sent.at(-1)[0];
	test(
		"Complete two-car snapshot fits one unreliable envelope",
		JSON.stringify(wire).length < 1200,
	);
	const packedGuest = makeHub({ host: false, me: 1 });
	await packedGuest.network.connectHub();
	packedGuest.handlers.message(wire, 0);
	test(
		"Compact wire restores route legality and velocities",
		packedGuest.snaps[0]?.cars[1].r.gate === 4 &&
			packedGuest.snaps[0]?.cars[1].r.valid === true &&
			packedGuest.snaps[0]?.cars[0].vy === 123.45 &&
			Math.abs(packedGuest.snaps[0]?.cars[0].r.total - 10437.123456) < 0.001,
	);
	packedGuest.network.destroy();
	h.handlers["time-up"]();
	h.handlers["time-up"]();
	test(
		"Hub time-up finishes once with actual scores",
		h.finishes.length === 1 &&
			h.finishes[0].scores[0] === 4 &&
			h.finishes[0].scores[1] === 2,
	);
	test(
		"Hub best-first standings",
		JSON.stringify(h.finishes[0].standings) === "[[0],[1]]",
	);
	h.network.destroy();
	const s = makeHub({ host: true, server: true, me: 99 });
	await s.network.connectHub();
	test(
		"Actorless server owns simulation without seat",
		s.network.authoritative &&
			s.network.localSeat === null &&
			s.starts.length === 1,
	);
	s.network.update(0.125, { score: [5, 5] }, null);
	s.network.finish([5, 5]);
	test(
		"Actorless server groups tied human scores",
		JSON.stringify(s.finishes[0].standings) === "[[0,1]]",
	);
	let forbidden = false;
	try {
		s.network.createOffer().catch(() => {});
		s.network.assertStandalone();
	} catch {
		forbidden = true;
	}
	test("Hub cannot open standalone RTC", forbidden);
	s.network.destroy();
	const g = makeHub({ host: false, me: 1 });
	await g.network.connectHub();
	g.network.receive(
		g.network.packet("s", { n: 3, s: { score: [2, 1], tick: 3 } }),
		0,
	);
	g.network.receive(
		g.network.packet("s", { n: 2, s: { score: [1, 1], tick: 2 } }),
		0,
	);
	g.network.receive(
		g.network.packet("s", { n: 8, s: { score: [9, 9], tick: 8 } }),
		9,
	);
	test(
		"Hub guests reject stale and nonhost snapshots",
		g.snaps.length === 1 && g.snaps[0].tick === 3,
	);
	g.network.finish([10, 0]);
	test("Hub guest cannot finish", g.finishes.length === 0);
	g.network.destroy();
	const leave = makeHub();
	await leave.network.connectHub();
	leave.handlers.leave({ id: 1, reason: "left" });
	test(
		"Hub departure standings contain remaining humans once",
		JSON.stringify(leave.finishes[0].standings) === "[[0]]",
	);
	leave.network.destroy();
	return results;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
	console.log(JSON.stringify(await runNetworkUnitTests()));
