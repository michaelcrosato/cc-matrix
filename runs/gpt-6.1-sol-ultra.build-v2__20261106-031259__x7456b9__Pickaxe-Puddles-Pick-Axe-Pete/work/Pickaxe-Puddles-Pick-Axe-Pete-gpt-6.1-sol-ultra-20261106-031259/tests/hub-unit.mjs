import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = await readFile(
	new URL("../src/net/net.js", import.meta.url),
	"utf8",
);
const idle = () => ({ mx: 0, my: 0, aim: 0 });
function fixture({ host = true, server = false, visibility = false } = {}) {
	let ms = 0;
	const listeners = new Map(),
		sent = [],
		finishes = [],
		statuses = [],
		timers = new Map(),
		visibilityListeners = new Set(),
		handoffs = [];
	const document = {
		hidden: false,
		addEventListener(type, callback) {
			if (type === "visibilitychange") visibilityListeners.add(callback);
		},
		removeEventListener(type, callback) {
			if (type === "visibilitychange") visibilityListeners.delete(callback);
		},
	};
	let timerIndex = 0;
	const hub = {
		isHost: host,
		server,
		me: server ? -1 : host ? 0 : 1,
		host: server ? -1 : 0,
		seed: 6,
		limitMs: 900000,
		players: [
			{ id: 0, name: "<Puddles>", color: "#f00" },
			{ id: 1, name: "Partner", color: "#00f" },
		],
		connect: async () => ({ players: hub.players }),
		rng: () => () => 0.123,
		time: () => ms - 3000,
		ready() {
			hub.readyCount = (hub.readyCount || 0) + 1;
		},
		on(name, callback) {
			listeners.set(name, callback);
			return () => listeners.delete(name);
		},
		send(data, options) {
			sent.push({ data: structuredClone(data), options, at: ms });
			return true;
		},
		finish(outcome) {
			finishes.push(outcome);
		},
	};
	const context = vm.createContext({
		AIHub: hub,
		PP: {},
		performance: { now: () => ms },
		TextEncoder,
		structuredClone,
		setInterval: (callback, period) => {
			const id = ++timerIndex;
			timers.set(id, { callback, period });
			return id;
		},
		clearInterval: (id) => timers.delete(id),
		...(visibility ? { document } : {}),
	});
	vm.runInContext(source, context);
	const steps = [],
		removed = [];
	const sim = {
		time: 0,
		score: 12,
		runEpoch: 1,
		chamberEpoch: 0,
		completed: null,
		miners: hub.players.map((p) => ({
			...p,
			hero: { x: 60, z: 16, vx: 0, vz: 0 },
			facing: 1,
			stats: { chops: 1 },
		})),
		rocks: [],
		pickups: [],
		step(dt, intents) {
			steps.push(structuredClone(intents));
			sim.time += dt;
		},
		snapshot() {
			return structuredClone({
				runEpoch: sim.runEpoch,
				chamberEpoch: sim.chamberEpoch,
				time: sim.time,
				miners: sim.miners,
				rocks: sim.rocks,
				pickups: sim.pickups,
				completed: sim.completed,
				score: sim.score,
			});
		},
		restore(state) {
			Object.assign(sim, structuredClone(state));
		},
		removeMiner(id) {
			removed.push(id);
			sim.miners = sim.miners.filter((p) => p.id !== id);
		},
	};
	const net = new context.PP.Net({
		createSim: () => sim,
		onStatus: (status, detail) => statuses.push({ status, detail }),
		onClockHandoff: (background) => handoffs.push(background),
	});
	return {
		net,
		hub,
		sim,
		steps,
		removed,
		sent,
		finishes,
		statuses,
		timers,
		handoffs,
		visibilityListeners,
		setHidden(hidden) {
			document.hidden = hidden;
			for (const listener of [...visibilityListeners]) listener();
		},
		setTime(value) {
			ms = value;
		},
		emit(name, ...args) {
			listeners.get(name)?.(...args);
		},
		tick(count = 1, intent = idle()) {
			for (let i = 0; i < count; i++) {
				ms += 1000 / 120;
				net.tick(1 / 120, intent);
			}
		},
		fireTimers() {
			for (const { callback } of [...timers.values()]) callback();
		},
	};
}

export async function runHubUnit() {
	let count = 0;
	const test = async (name, fn) => {
		try {
			await fn();
			count++;
		} catch (error) {
			throw new Error(`Hub unit: ${name}: ${error.stack || error}`);
		}
	};
	await test("readiness and synchronized countdown", async () => {
		const f = fixture();
		assert.equal(await f.net.connect(), true);
		assert.equal(f.hub.readyCount, 1);
		f.emit("start", { in: 3000 });
		f.tick(120);
		assert.equal(f.steps.length, 0);
		f.setTime(3000);
		f.tick();
		assert.equal(f.steps.length, 1);
		assert.equal(f.net.status, "play");
		f.net.dispose();
	});
	await test("sender authentication, epoch, sequence and edge deduplication", async () => {
		const f = fixture();
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(3000);
		const packet = {
			v: 1,
			t: "i",
			e: "1:0",
			n: 1,
			a: { mx: 1, my: 0, aim: 1 },
			c: [1, 1, 1],
		};
		f.emit("message", packet, 22);
		f.tick();
		assert.equal(f.steps.at(-1)[1].mx, 0);
		f.emit("message", packet, 1);
		f.tick();
		assert.equal(f.steps.at(-1)[1].jump, true);
		assert.equal(f.steps.at(-1)[1].redirect, true);
		assert.equal(f.steps.at(-1)[1].interact, true);
		f.emit("message", packet, 1);
		f.tick();
		assert.equal(f.steps.at(-1)[1].jump, false);
		f.emit("message", { ...packet, n: 2, c: [2, 1, 1], e: "1:9" }, 1);
		f.tick();
		assert.equal(f.steps.at(-1)[1].jump, false);
		assert.equal(f.net.diagnostics().rejected, 3);
		f.net.dispose();
	});
	await test("held input timeout and departure", async () => {
		const f = fixture();
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(3000);
		f.emit(
			"message",
			{
				v: 1,
				t: "i",
				e: "1:0",
				n: 1,
				a: { mx: 1, my: 0, chop: true },
				c: [0, 0, 0],
			},
			1,
		);
		f.tick();
		assert.equal(f.steps.at(-1)[1].mx, 1);
		f.tick(100);
		assert.equal(f.steps.at(-1)[1].mx, 0);
		f.emit("leave", { id: 1, reason: "left" });
		assert.deepEqual(f.removed, [1]);
		assert.equal(f.net.roster.length, 1);
		f.net.dispose();
	});
	await test("chamber epochs clear old edges and preserve a first new-epoch edge", async () => {
		const host = fixture();
		await host.net.connect();
		host.emit("start", { in: 0 });
		host.setTime(4000);
		host.emit(
			"message",
			{ v: 1, t: "i", e: "1:0", n: 1, a: idle(), c: [5, 3, 1] },
			1,
		);
		host.tick();
		host.sim.chamberEpoch = 1;
		// A fast new-epoch packet may arrive before the next authority step notices its room changed.
		host.emit(
			"message",
			{ v: 1, t: "i", e: "1:1", n: 2, a: idle(), c: [1, 0, 0] },
			1,
		);
		host.tick();
		assert.equal(host.steps.at(-1)[1].jump, true);
		assert.equal(host.steps.at(-1)[1].redirect, false);
		assert.equal(host.steps.at(-1)[1].interact, false);
		host.tick();
		assert.equal(host.steps.at(-1)[1].jump, false);
		host.net.dispose();
		const peer = fixture({ host: false });
		await peer.net.connect();
		peer.emit("start", { in: 0 });
		peer.setTime(4000);
		peer.tick(1, { ...idle(), jump: true, redirect: true });
		const snapshot = { ...peer.sim.snapshot(), chamberEpoch: 1 };
		peer.emit(
			"message",
			{ v: 1, t: "s", e: "1:1", n: 4, s: snapshot, ack: [[1, 5, 3, 1]] },
			0,
		);
		assert.equal(peer.net.localEdges.join(","), "0,0,0");
		assert.equal(peer.net.localAck.join(","), "0,0,0");
		peer.tick(15);
		assert.equal(peer.sent.at(-1).data.c.join(","), "0,0,0");
		peer.net.dispose();
	});
	await test("combined send ceiling and compact positions", async () => {
		const f = fixture();
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(3000);
		f.sim.rocks = Array.from({ length: 40 }, (_, id) => ({
			id: `rock-${id}`,
			x: 100.1111,
			z: 55.9999,
		}));
		f.tick(480);
		assert(f.sent.length > 20);
		assert(f.net.diagnostics().maxRate <= 13);
		assert(
			f.sent
				.filter((p) => p.data.t === "p")
				.every(
					(p) =>
						new TextEncoder().encode(JSON.stringify(p.data)).length <= 1200,
				),
		);
		assert(f.net.diagnostics().maxBytes <= 16000);
		f.net.dispose();
	});
	await test("time-up finishes a tied team exactly once and end is silent", async () => {
		const f = fixture();
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(3000);
		f.tick();
		f.emit("time-up", { graceMs: 5000 });
		f.emit("time-up", { graceMs: 5000 });
		assert.equal(f.finishes.length, 1);
		assert.equal(f.finishes[0].won, false);
		assert.equal(JSON.stringify(f.finishes[0].standings), "[[0,1]]");
		f.emit("end", { reason: "finished" });
		const sent = f.sent.length,
			steps = f.steps.length;
		f.tick(240, { ...idle(), jump: true, chop: true });
		f.fireTimers();
		assert.equal(f.sent.length, sent);
		assert.equal(f.steps.length, steps);
		assert.equal(f.net.status, "end");
		f.net.dispose();
	});
	await test("an authoritative co-op wipe reports loss without restarting the mine", async () => {
		const f = fixture();
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(3000);
		f.sim.completed = { won: false, reason: "Crew wiped out" };
		f.tick();
		assert.equal(f.finishes.length, 1);
		assert.equal(f.finishes[0].won, false);
		assert.equal(f.net.status, "finishing");
		const steps = f.steps.length;
		f.tick(240);
		assert.equal(f.steps.length, steps);
		assert.equal(f.finishes.length, 1);
		assert.equal(f.sim.completed.reason, "Crew wiped out");
		f.net.dispose();
	});
	await test("hidden nonplayer authority runs both players, without local input", async () => {
		const f = fixture({ host: true, server: true });
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(3100);
		f.fireTimers();
		assert.equal(f.net.localId, null);
		assert.equal(f.steps.length, 60);
		assert.equal(Object.keys(f.steps[0]).sort().join(","), "0,1");
		const steps = f.steps.length;
		f.net.tick(1 / 120, { ...idle(), jump: true });
		assert.equal(f.steps.length, steps);
		f.net.dispose();
		assert.equal(f.timers.size, 0);
	});
	await test("hidden visible-host clock advances without RAF and preserves remote input", async () => {
		const f = fixture({ visibility: true });
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(4000);
		f.tick(1, { ...idle(), mx: 1 });
		const before = f.steps.length;
		f.emit(
			"message",
			{
				v: 1,
				t: "i",
				e: "1:0",
				n: 1,
				a: { ...idle(), mx: -1, chop: true },
				c: [1, 0, 0],
			},
			1,
		);
		f.setHidden(true);
		assert.equal(f.net.backgroundOwner, true);
		assert.equal(f.timers.size, 1);
		f.tick(12, { ...idle(), mx: 1, jump: true });
		assert.equal(
			f.steps.length,
			before,
			"A residual RAF must not also step the hidden world",
		);
		f.fireTimers();
		assert.equal(f.steps.length - before, 12);
		assert(
			f.steps
				.slice(before)
				.every(
					(intents) =>
						intents[0].mx === 0 && !intents[0].jump && !intents[0].chop,
				),
			"Hidden local controls must be neutral",
		);
		assert(
			f.steps
				.slice(before)
				.every((intents) => intents[1].mx === -1 && intents[1].chop),
			"The partner must retain control while the host is hidden",
		);
		assert.equal(
			f.steps.slice(before).filter((intents) => intents[1].jump).length,
			1,
		);
		const beforeSecond = f.steps.length;
		f.setTime(5108.333333333333);
		f.emit(
			"message",
			{ v: 1, t: "i", e: "1:0", n: 2, a: { ...idle(), mx: -1 }, c: [1, 0, 0] },
			1,
		);
		f.fireTimers();
		assert.equal(
			f.steps.length - beforeSecond,
			120,
			"One-second timer batching must preserve 120 Hz simulation time",
		);
		assert.equal(f.steps.at(-1)[1].mx, -1);
		f.setHidden(false);
		assert.equal(f.net.backgroundOwner, false);
		assert.equal(f.timers.size, 0);
		assert.deepEqual(f.handoffs, [true, false]);
		const beforeVisible = f.steps.length;
		f.tick(1, { ...idle(), mx: 1 });
		assert.equal(f.steps.length, beforeVisible + 1);
		assert.equal(f.steps.at(-1)[0].mx, 1);
		f.net.dispose();
		assert.equal(f.visibilityListeners.size, 0);
	});
	await test("background handoff clips countdown time rather than simulating it", async () => {
		const f = fixture({ visibility: true });
		f.setHidden(true);
		await f.net.connect();
		f.emit("start", { in: 3000 });
		f.setTime(2500);
		f.fireTimers();
		assert.equal(f.steps.length, 0);
		f.setTime(3500);
		f.fireTimers();
		assert.equal(
			f.steps.length,
			60,
			"Only the half-second after the countdown belongs to gameplay",
		);
		f.net.dispose();
		assert.equal(f.timers.size, 0);
		assert.equal(f.visibilityListeners.size, 0);
	});
	await test("finish, end and dispose remove the background clock and listener", async () => {
		for (const action of ["finish", "end", "dispose"]) {
			const f = fixture({ visibility: true });
			await f.net.connect();
			f.emit("start", { in: 0 });
			f.setTime(4000);
			f.setHidden(true);
			if (action === "finish") f.net.finish(false, "time-up");
			else if (action === "end") f.emit("end", { reason: "finished" });
			else f.net.dispose();
			assert.equal(f.net.backgroundOwner, false);
			assert.equal(f.timers.size, 0);
			assert.equal(f.visibilityListeners.size, 0);
			const steps = f.steps.length,
				sent = f.sent.length;
			f.setHidden(false);
			f.setHidden(true);
			f.setTime(8000);
			f.fireTimers();
			f.net.tick(1 / 120, { ...idle(), jump: true });
			assert.equal(f.steps.length, steps);
			assert.equal(f.sent.length, sent);
			assert.deepEqual(f.handoffs, [true]);
			f.net.dispose();
		}
	});
	await test("visibility handoff leaves replicas, nonplayer servers and standalone unchanged", async () => {
		for (const options of [{ host: false }, { host: true, server: true }]) {
			const f = fixture({ ...options, visibility: true });
			await f.net.connect();
			const timers = f.timers.size;
			f.setHidden(true);
			assert.equal(f.visibilityListeners.size, 0);
			assert.equal(f.net.backgroundOwner, false);
			assert.equal(f.timers.size, timers);
			assert.deepEqual(f.handoffs, []);
			f.net.dispose();
		}
		const f = fixture({ visibility: true });
		f.hub.connect = async () => null;
		assert.equal(await f.net.connect(), false);
		f.setHidden(true);
		assert.equal(f.visibilityListeners.size, 0);
		assert.equal(f.timers.size, 0);
		f.net.dispose();
	});
	await test("client repeats lost edges and trusts only host snapshots", async () => {
		const f = fixture({ host: false });
		await f.net.connect();
		f.emit("start", { in: 0 });
		f.setTime(3000);
		f.net.tick(1 / 120, { ...idle(), jump: true, redirect: true });
		f.tick(24);
		assert(
			f.sent
				.filter((p) => p.data.t === "i")
				.every((p) => p.data.c[0] === 1 && p.data.c[1] === 1),
		);
		assert.equal(f.steps.length, 0);
		const snapshot = {
			v: 1,
			t: "s",
			e: "1:0",
			n: 1,
			ack: [[1, 1, 1, 0]],
			s: f.sim.snapshot(),
		};
		snapshot.s.score = 89;
		f.emit("message", snapshot, 1);
		assert.equal(f.sim.score, 12);
		f.emit("message", snapshot, 0);
		assert.equal(f.sim.score, 89);
		assert.equal(f.net.localAck.join(","), "1,1,0");
		f.emit("message", { ...snapshot, s: { ...snapshot.s, score: 999 } }, 0);
		assert.equal(f.sim.score, 89);
		f.net.dispose();
	});
	await test("keyframe chunks assemble atomically", async () => {
		const f = fixture({ host: false });
		await f.net.connect();
		const data = JSON.stringify({
			v: 1,
			t: "s",
			e: "1:0",
			n: 1,
			s: { ...f.sim.snapshot(), score: 77 },
		});
		const at = Math.floor(data.length / 2);
		f.emit(
			"message",
			{ v: 1, t: "c", e: "1:0", n: 1, i: 1, total: 2, text: data.slice(at) },
			0,
		);
		assert.equal(f.sim.score, 12);
		f.emit(
			"message",
			{ v: 1, t: "c", e: "1:0", n: 1, i: 0, total: 2, text: data.slice(0, at) },
			0,
		);
		assert.equal(f.sim.score, 77);
		f.net.dispose();
	});
	await test("a large final keyframe drains before finish within grace", async () => {
		const f = fixture();
		await f.net.connect();
		f.setTime(4000);
		const snapshot = f.sim.snapshot.bind(f.sim);
		f.sim.snapshot = () => ({
			...snapshot(),
			authoringData: "x".repeat(45000),
		});
		f.net.finish(false, "time-up");
		assert.equal(f.finishes.length, 0);
		for (let i = 1; i < 25; i++) {
			f.setTime(4000 + i * 100);
			f.fireTimers();
		}
		assert.equal(f.finishes.length, 1);
		assert(f.sent.length >= 9);
		assert(f.sent.every((item) => item.data.t === "c"));
		assert(f.net.diagnostics().maxBytes < 16384);
		assert.equal(f.timers.size, 0);
		f.net.dispose();
	});
	return count;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		console.log(`${await runHubUnit()} Hub unit checks passed`);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
