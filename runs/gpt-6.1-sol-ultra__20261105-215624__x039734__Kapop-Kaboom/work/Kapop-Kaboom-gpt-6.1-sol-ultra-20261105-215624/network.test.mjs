import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(
	new URL("./network.js", import.meta.url),
	"utf8",
);
const { Network } = await import(
	`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
let count = 0,
	failures = 0;
async function test(name, fn) {
	try {
		await fn();
		count++;
	} catch (e) {
		failures++;
		console.error(`FAIL ${name}: ${e.message}`);
	}
}
function makeHub({ host = false, server = false } = {}) {
	const handlers = {},
		messages = [],
		results = [];
	let clock = -Infinity;
	const hub = {
		active: true,
		me: server ? 4 : host ? 0 : 1,
		host: server ? 4 : 0,
		isHost: host,
		server,
		players: [0, 1, 2, 3].map((id) => ({
			id,
			name: `Player ${id}`,
			color: "#fff",
		})),
		connect: async (options) => {
			hub.options = options;
			return hub;
		},
		ready: () => {
			hub.readyCount++;
		},
		readyCount: 0,
		on: (event, fn) => {
			handlers[event] = fn;
			return () => delete handlers[event];
		},
		time: () => clock,
		send: (data, options) => {
			messages.push({ data, options });
			return true;
		},
		finish: (value) => results.push(value),
		emit: (event, ...args) => handlers[event]?.(...args),
		clock: (value) => {
			clock = value;
		},
		messages,
		results,
	};
	globalThis.AIHub = hub;
	return hub;
}
await test("standalone init does not load broker", async () => {
	globalThis.AIHub = { active: false };
	const n = new Network();
	assert.equal(await n.init(), null);
	assert.equal(n.role, "offline");
	assert.equal(n.hubActive, false);
});
await test("hub connects and readies without interaction", async () => {
	const h = makeHub({ host: true });
	const n = new Network();
	await n.init();
	assert.deepEqual(h.options, { mode: "shared-world", seats: [1, 4] });
	assert.equal(h.readyCount, 1);
	assert.equal(n.role, "host");
});
await test("hub enforces synchronized countdown", async () => {
	const h = makeHub({ host: true });
	let start;
	const n = new Network({ onStart: (value) => (start = value) });
	await n.init();
	h.emit("start", { in: 3000 });
	assert.equal(start.countdownMs, 3000);
	n.update(1, { score: 1 });
	assert.equal(h.messages.length, 0);
	h.clock(1);
	n.update(0.11, { score: 1 });
	assert.equal(h.messages.length, 1);
});
await test("host accepts only roster inputs and clamps coordinate", async () => {
	const h = makeHub({ host: true });
	const inputs = [];
	const n = new Network({ onInput: (id, value) => inputs.push({ id, value }) });
	await n.init();
	h.emit("message", { t: "input", input: { x: 100, pop: true } }, 1);
	h.emit("message", { t: "input", input: { x: -2, pop: true } }, 999);
	assert.deepEqual(inputs, [{ id: 1, value: { x: 7, pop: true } }]);
});
await test("guest accepts only host ordered snapshots", async () => {
	const h = makeHub();
	const states = [];
	const n = new Network({ onState: (s) => states.push(s) });
	await n.init();
	h.emit("message", { t: "state", seq: 1, state: { score: 5 } }, 0);
	h.emit("message", { t: "state", seq: 0, state: { score: 4 } }, 0);
	h.emit("message", { t: "state", seq: 2, state: { score: 6 } }, 2);
	assert.deepEqual(states, [{ score: 5 }]);
});
await test("guest transmits idle input and preserves short pop tap", async () => {
	const h = makeHub();
	const n = new Network();
	await n.init();
	h.emit("start", { in: 0 });
	h.clock(1);
	n.sendInput({ x: 3, pop: true });
	n.sendInput({ x: 4, pop: false });
	n.update(0.07);
	assert.deepEqual(h.messages[0], {
		data: { t: "input", input: { x: 4, pop: true } },
		options: { to: 0 },
	});
	n.update(0.07);
	assert.equal(h.messages[1].data.input.pop, false);
});
await test("host sends no more than ten snapshots per second", async () => {
	const h = makeHub({ host: true });
	const n = new Network();
	await n.init();
	h.emit("start", { in: 0 });
	h.clock(1);
	for (let i = 0; i < 100; i++) n.update(0.01, { score: 10 });
	assert.ok(h.messages.length >= 9 && h.messages.length <= 10);
});
await test("oversize hub snapshot is rejected before protocol client", async () => {
	const h = makeHub({ host: true });
	const n = new Network();
	await n.init();
	h.emit("start", { in: 0 });
	h.clock(1);
	n.update(0.2, { score: 10, large: "x".repeat(17000) });
	assert.equal(h.messages.length, 0);
	assert.equal(n.metrics.rejected, 1);
});
await test("dedicated server has no local player and still runs host", async () => {
	const h = makeHub({ host: true, server: true });
	let started;
	const n = new Network({ onStart: (value) => (started = value) });
	await n.init();
	h.emit("start", { in: 0 });
	h.clock(1);
	n.update(0.2, { score: 4 });
	assert.equal(started.server, true);
	assert.equal(started.me, 4);
	assert.equal(n.role, "host");
	assert.equal(h.messages.length, 1);
});
await test("time-up reports tied team standings with remaining players", async () => {
	const h = makeHub({ host: true });
	const n = new Network();
	await n.init();
	h.emit("start", { in: 0 });
	h.clock(1);
	n.update(0.2, { score: 420 });
	h.emit("leave", { id: 3, reason: "left" });
	h.emit("time-up", { graceMs: 3000 });
	assert.deepEqual(h.results[0].standings, [[0, 1, 2]]);
	assert.deepEqual(h.results[0].scores, { 0: 420, 1: 420, 2: 420 });
	assert.equal(h.results[0].won, false);
});
await test("result is submitted once and only by host", async () => {
	const h = makeHub({ host: true });
	const n = new Network();
	await n.init();
	n.finish(true, 42);
	n.finish(false, 0);
	assert.equal(h.results.length, 1);
	const gh = makeHub();
	const g = new Network();
	await g.init();
	assert.equal(g.finish(true, 42), false);
	assert.equal(gh.results.length, 0);
});
await test("hub end stops all traffic and state input", async () => {
	const h = makeHub({ host: true });
	let inputs = 0,
		end;
	const n = new Network({
		onInput: () => inputs++,
		onEnd: (value) => (end = value),
	});
	await n.init();
	h.emit("start", { in: 0 });
	h.clock(1);
	h.emit("end", { reason: "finished" });
	n.update(0.2, { score: 2 });
	h.emit("message", { t: "input", input: { x: 2, pop: true } }, 1);
	assert.equal(h.messages.length, 0);
	assert.equal(inputs, 0);
	assert.equal(n.canPlay, false);
	assert.equal(end.reason, "finished");
});
await test("session menus cannot disconnect the hub", async () => {
	makeHub({ host: true });
	const n = new Network();
	await n.init();
	assert.equal(n.disconnect(), false);
	assert.equal(n.connected, true);
});
console.log(`${count} network checks passed; ${failures} failed`);
process.exitCode = failures ? 1 : 0;
