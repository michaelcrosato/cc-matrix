import "../vendor/engine/my-3d2dge.js";
import assert from "node:assert/strict";
import { clone, GARDENS } from "../src/content/gardens.js";
import { HubCoop, packView, unpackView } from "../src/net/hub.js";
import { STEP } from "../src/sim/world.js";

class FakeHub {
	constructor(info, active = true) {
		this.active = active;
		this.info = info;
		this.listeners = new Map();
		this.now = -Infinity;
		this.readyCalls = 0;
		this.connectCalls = [];
		this.sends = [];
		this.finishes = [];
		this.drop = null;
	}
	on(name, fn) {
		if (!this.listeners.has(name)) this.listeners.set(name, new Set());
		this.listeners.get(name).add(fn);
		return () => this.listeners.get(name)?.delete(fn);
	}
	emit(name, ...args) {
		for (const fn of this.listeners.get(name) || []) fn(...args);
	}
	async connect(options) {
		this.connectCalls.push(clone(options));
		return this.info ? clone(this.info) : null;
	}
	ready() {
		this.readyCalls++;
	}
	time() {
		return this.now;
	}
	send(data, options = {}) {
		const packet = { data: clone(data), options: clone(options) };
		this.sends.push(packet);
		return this.drop ? !this.drop(packet) : true;
	}
	finish(data) {
		this.finishes.push(clone(data));
	}
}
const players = (n) =>
	Array.from({ length: n }, (_, id) => ({
		id,
		name: `Gardener ${id + 1}`,
		color: id ? "#ff887c" : "#73cefa",
	}));
async function make({
	host = true,
	server = false,
	count = 2,
	me = null,
	callbacks = {},
} = {}) {
	const hostId = server ? count : 0;
	const info = {
		mode: "shared-world",
		round: 7,
		seed: 297728,
		limitMs: 900000,
		players: players(count),
		host: hostId,
		isHost: host,
		server: server && host,
		me: me ?? (host ? hostId : count > 1 ? 1 : 0),
	};
	const hub = new FakeHub(info),
		events = { ready: 0, end: 0, stage: [], leave: [], event: [] };
	const net = new HubCoop(hub, {
		ready: () => events.ready++,
		end: () => events.end++,
		stage: (n) => events.stage.push(n),
		leave: (id) => events.leave.push(id),
		event: (e) => events.event.push(e),
		...callbacks,
	});
	await net.connect();
	return { hub, net, events };
}
function start(pair, time = 0) {
	pair.hub.now = time;
	pair.hub.emit("start", { in: 3000 });
}
function steps(pair, seconds, command = { stop: true }) {
	for (let i = 0; i < Math.ceil(seconds / STEP); i++)
		pair.net.tick(STEP, command);
}
function input(pair, from, seq, dir = [1, 0], extra = {}) {
	pair.hub.emit(
		"message",
		{
			t: "i",
			g: pair.net.world.s.level * 8 + (pair.net.world.s.wave || 0),
			seq,
			d: dir,
			...extra,
		},
		from,
	);
}

export async function runNetTests({ filter = null } = {}) {
	let passed = 0,
		failed = 0;
	const failures = [];
	const test = async (name, fn) => {
		if (filter && !filter.test(name)) return;
		try {
			await fn();
			passed++;
		} catch (error) {
			failed++;
			failures.push(`${name}: ${error.message}`);
		}
	};
	await test("null Hub connect leaves standalone readiness alone", async () => {
		const hub = new FakeHub(null, false),
			net = new HubCoop(hub);
		assert.equal(await net.connect(), null);
		assert.equal(net.active, false);
		assert.equal(net.world, null);
		assert.equal(hub.readyCalls, 0);
	});
	await test("Hub connects shared-world 1–2 and readies once without a gesture", async () => {
		const p = await make();
		assert.deepEqual(p.hub.connectCalls, [
			{ mode: "shared-world", seats: [1, 2] },
		]);
		assert.equal(p.hub.readyCalls, 1);
		assert.equal(p.events.ready, 1);
		assert.equal(p.net.started, false);
		assert.deepEqual(p.net.world.s.ids, [0, 1]);
	});
	await test("start notification cannot advance a negative Hub clock", async () => {
		const p = await make();
		start(p, -3000);
		p.net.tick(0.5, { dir: [1, 0] });
		assert.equal(p.net.world.s.totalTime, 0);
		assert.equal(p.hub.sends.length, 0);
		p.hub.now = 0;
		p.net.tick(0.1, { dir: [1, 0] });
		assert.ok(p.net.world.s.totalTime > 0);
	});
	await test("single-seat host runs the complete world with its actual player", async () => {
		const p = await make({ count: 1 });
		start(p);
		p.net.tick(0.1, { dir: [1, 0] });
		assert.equal(p.net.world.players.length, 1);
		assert.equal(p.net.world.players[0].id, 0);
		assert.ok(p.net.world.players[0].m.x > 2);
		assert.equal(p.net.diagnostics().local, true);
	});
	await test("nonplaying host simulates without creating a phantom local actor", async () => {
		const p = await make({ server: true });
		assert.equal(p.net.diagnostics().server, true);
		assert.equal(p.net.diagnostics().local, false);
		assert.deepEqual(
			p.net.world.players.map((p) => p.id),
			[0, 1],
		);
		start(p);
		input(p, 0, 1, [1, 0]);
		p.net.tick(0.1, { dir: [-1, 0], plant: true });
		assert.ok(p.net.world.players[0].m.x > 2);
		assert.equal(p.net.world.s.stats.plants, 0);
		assert.ok(p.net.world.s.totalTime > 0);
		assert.ok(p.hub.sends.some((s) => s.data.t === "s"));
	});
	await test("single-seat nonplaying authority remains playable through the remote command path", async () => {
		const p = await make({ server: true, count: 1 });
		start(p);
		input(p, 0, 1, [1, 0]);
		p.net.tick(0.1, {});
		assert.deepEqual(
			p.net.world.players.map((p) => p.id),
			[0],
		);
		assert.equal(p.net.info.me, 1);
		assert.ok(p.net.world.players[0].m.x > 2);
		assert.equal(p.net.diagnostics().local, false);
	});
	await test("client controls cannot advance or award its local placeholder world", async () => {
		const p = await make({ host: false });
		start(p);
		steps(p, 0.5, { dir: [1, 0], plant: true });
		assert.equal(p.net.world.s.totalTime, 0);
		assert.equal(p.net.world.s.score, 0);
		assert.equal(p.net.world.s.seeds, 2);
		assert.equal(p.net.world.bait.length, 0);
	});
	await test("transport from owns commands and claimed identities are ignored", async () => {
		const p = await make();
		start(p);
		const first = p.net.world.players[0].m.x;
		input(p, 1, 1, [1, 0], { id: 0, seat: 0, player: 0 });
		p.net.tick(0.1, { stop: true });
		assert.equal(p.net.world.players[0].m.x, first);
		assert.ok(p.net.world.players[1].m.x > 3);
		assert.equal(p.net.heard.has(0), false);
		assert.equal(p.net.heard.has(1), true);
	});
	await test("unknown senders cannot create commands or spend team seeds", async () => {
		const p = await make();
		start(p);
		input(p, 99, 1);
		p.hub.emit("message", { t: "p", g: 0, id: "fake", player: 0 }, 99);
		assert.equal(p.net.heard.size, 0);
		assert.equal(p.net.world.s.seeds, 2);
		assert.equal(p.net.world.bait.length, 0);
	});
	await test("stale sequence numbers and wrong-generation inputs are rejected", async () => {
		const p = await make();
		start(p);
		input(p, 1, 5, [-1, 0]);
		input(p, 1, 4, [1, 0]);
		input(p, 1, 6, [0, -1], { g: 8 });
		assert.equal(p.net.heard.get(1).seq, 5);
		assert.deepEqual(p.net.heard.get(1).dir, [-1, 0]);
	});
	await test("lost heartbeats expire and stop stale player motion", async () => {
		const p = await make();
		start(p);
		input(p, 1, 1, [1, 0]);
		steps(p, 1.05);
		const actor = p.net.world.players[1],
			x = actor.m.x,
			y = actor.m.y;
		steps(p, 0.5);
		assert.equal(actor.m.x, x);
		assert.equal(actor.m.y, y);
		assert.ok(x > 3);
		assert.equal(actor.m.moving, false);
	});
	await test("host local plant uses the same authoritative simulation", async () => {
		const p = await make();
		start(p);
		p.net.tick(STEP, { plant: true, actionId: "local-one" });
		assert.equal(p.net.world.s.seeds, 1);
		assert.equal(p.net.world.bait.length, 1);
		assert.equal(p.net.world.bait[0].owner, 0);
		assert.equal(p.net.world.s.stats.plants, 1);
	});
	await test("remote plant is bound to sender and duplicate packets spend once", async () => {
		const p = await make();
		start(p);
		const message = { t: "p", g: 0, id: "one", player: 0 };
		p.hub.emit("message", message, 1);
		p.hub.emit("message", message, 1);
		assert.equal(p.net.world.s.seeds, 1);
		assert.equal(p.net.world.bait.length, 1);
		assert.equal(p.net.world.bait[0].owner, 1);
		assert.equal(p.net.world.s.stats.plants, 1);
		const acks = p.hub.sends.filter((p) => p.data.t === "a");
		assert.equal(acks.length, 2);
		assert.ok(
			acks.every(
				(p) => p.data.ok === true && p.options.to === 1 && p.options.reliable,
			),
		);
	});
	await test("rejected remote plant acknowledges once without spending a missing seed", async () => {
		const p = await make();
		start(p);
		p.net.world.s.seeds = 0;
		p.hub.emit("message", { t: "p", g: 0, id: "empty" }, 1);
		assert.equal(p.net.world.s.seeds, 0);
		assert.equal(p.net.world.bait.length, 0);
		assert.equal(p.hub.sends.at(-1).data.ok, false);
		assert.equal(p.hub.sends.at(-1).options.to, 1);
	});
	await test("wrong-generation plant packets cannot affect the active garden", async () => {
		const p = await make();
		start(p);
		p.hub.emit("message", { t: "p", g: 8, id: "old" }, 1);
		assert.equal(p.net.world.s.seeds, 2);
		assert.equal(p.net.world.bait.length, 0);
		assert.equal(p.net.ack.length, 0);
	});
	await test("planting cannot mutate the card or negative start countdown", async () => {
		const p = await make();
		p.hub.emit("message", { t: "p", g: 0, id: "before" }, 1);
		assert.equal(p.net.world.s.seeds, 2);
		start(p, -1000);
		p.hub.emit("message", { t: "p", g: 0, id: "countdown" }, 1);
		assert.equal(p.net.world.s.seeds, 2);
		assert.equal(p.net.world.bait.length, 0);
	});
	await test("deduplication survives the presentation acknowledgement window", async () => {
		const p = await make();
		start(p);
		p.hub.emit("message", { t: "p", g: 0, id: "original" }, 1);
		for (let i = 0; i < 30; i++)
			p.hub.emit("message", { t: "p", g: 0, id: `rejected-${i}` }, 1);
		p.net.world.bait = [];
		const reserve = p.net.world.s.seeds;
		p.hub.emit("message", { t: "p", g: 0, id: "original" }, 1);
		assert.equal(p.net.world.s.seeds, reserve);
		assert.equal(p.net.world.s.stats.plants, 1);
	});
	await test("client sends discrete reliable plant plus rate-limited unreliable input", async () => {
		const p = await make({ host: false });
		start(p);
		p.net.tick(STEP, { dir: [1, 0], plant: true });
		steps(p, 0.5, { dir: [1, 0] });
		const actions = p.hub.sends.filter((s) => s.data.t === "p"),
			inputs = p.hub.sends.filter((s) => s.data.t === "i");
		assert.equal(new Set(actions.map((p) => p.data.id)).size, 1);
		assert.ok(actions.length <= 2);
		assert.equal(actions[0].options.reliable, true);
		assert.equal(actions[0].options.to, 0);
		assert.ok(inputs.length >= 3 && inputs.length <= 5);
		assert.ok(
			inputs.every((s) => s.options.reliable === false && s.options.to === 0),
		);
		assert.ok(
			inputs.every((s, i) => i === 0 || s.data.seq > inputs[i - 1].data.seq),
		);
	});
	await test("client retries a reliable action refused by send without duplicating its id", async () => {
		const p = await make({ host: false });
		start(p);
		let dropped = false;
		p.hub.drop = (packet) => {
			if (packet.data.t === "p" && !dropped) {
				dropped = true;
				return true;
			}
			return false;
		};
		p.net.tick(STEP, { plant: true });
		steps(p, 1.2, {});
		const attempts = p.hub.sends.filter((s) => s.data.t === "p");
		assert.ok(
			attempts.length >= 2,
			"a refused reliable plant was never retried",
		);
		assert.ok(attempts.every((s) => s.data.id === attempts[0].data.id));
		assert.equal(p.net.pending.size, 1);
	});
	await test("reliable acknowledgement or repeated snapshot clears client pending action", async () => {
		const host = await make(),
			client = await make({ host: false });
		start(host);
		start(client);
		client.net.tick(STEP, { plant: true });
		const action = client.hub.sends.find((s) => s.data.t === "p");
		host.hub.emit("message", action.data, 1);
		const ack = host.hub.sends.find((s) => s.data.t === "a");
		client.hub.emit("message", ack.data, 0);
		assert.equal(client.net.pending.size, 0);
		client.net.tick(STEP, { plant: true });
		steps(client, 0.26, {});
		const action2 = client.hub.sends.filter((s) => s.data.t === "p").at(-1);
		host.hub.emit("message", action2.data, 1);
		host.net.broadcast();
		const snapshot = host.hub.sends.filter((s) => s.data.t === "s").at(-1);
		client.hub.emit("message", snapshot.data, 0);
		assert.equal(client.net.pending.size, 0);
	});
	await test("stage reconciliation cancels obsolete pending plant packets", async () => {
		const p = await make({ host: false });
		start(p);
		p.net.tick(STEP, { plant: true });
		assert.equal(p.net.pending.size, 1);
		const packet = packView(p.net.world.view(), 1);
		packet.W = 1;
		p.hub.emit("message", packet, 0);
		assert.equal(p.net.pending.size, 0);
		const oldAttempts = p.hub.sends.filter((s) => s.data.t === "p").length;
		steps(p, 1, {});
		assert.equal(
			p.hub.sends.filter((s) => s.data.t === "p").length,
			oldAttempts,
		);
	});
	await test("only host snapshots can change a client view", async () => {
		const p = await make({ host: false }),
			fake = packView(p.net.world.view(), 8);
		fake.s = 999;
		fake.l = 1;
		p.hub.emit("message", fake, 1);
		assert.equal(p.net.remote.score, 0);
		assert.equal(p.net.lastSnap, -1);
		p.hub.emit("message", fake, 0);
		assert.equal(p.net.remote.score, 999);
		assert.equal(p.net.remote.lives, 1);
	});
	await test("later snapshots repair loss and stale reordering cannot roll state back", async () => {
		const host = await make(),
			client = await make({ host: false });
		host.net.world.s.score = 20;
		host.net.broadcast();
		const dropped = clone(host.hub.sends.at(-1).data);
		host.net.world.s.score = 33;
		host.net.world.s.lives = 2;
		host.net.world.s.seeds = 1;
		host.net.world.crawlers[0].segments = 4;
		host.net.world.bait = [{ owner: 1, x: 4, y: 7 }];
		host.net.broadcast();
		const latest = clone(host.hub.sends.at(-1).data);
		client.hub.emit("message", latest, 0);
		client.hub.emit("message", dropped, 0);
		assert.equal(client.net.lastSnap, latest.n);
		assert.equal(client.net.remote.score, 33);
		assert.equal(client.net.remote.lives, 2);
		assert.equal(client.net.remote.seeds, 1);
		assert.equal(client.net.remote.remaining, 4);
		assert.deepEqual(client.net.remote.bait, host.net.world.bait);
	});
	await test("course transitions reconcile immediately and notify presentation once", async () => {
		const p = await make({ host: false }),
			packet = packView(p.net.world.view(), 1);
		packet.W = 1;
		packet.r = "play";
		packet.s = 50;
		p.hub.emit("message", packet, 0);
		assert.equal(p.net.remote.wave, 1);
		assert.equal(p.net.display.wave, 1);
		assert.deepEqual(p.events.stage, [0]);
		p.hub.emit("message", packet, 0);
		assert.deepEqual(p.events.stage, [0]);
	});
	await test("client smoothing never interpolates a wrap across the maze middle", async () => {
		const p = await make({ host: false });
		start(p);
		let packet = packView(p.net.world.view(), 1);
		packet.p[1][1] = -0.2;
		packet.p[1][2] = 4;
		p.hub.emit("message", packet, 0);
		p.net.tick(STEP, {});
		packet = clone(packet);
		packet.n = 2;
		packet.p[1][1] = 14.2;
		p.hub.emit("message", packet, 0);
		p.net.tick(STEP, {});
		assert.equal(p.net.current().players[1].x, 14.2);
	});
	await test("host presents captured clear events once during the transition hold", async () => {
		const p = await make();
		start(p);
		p.net.world.crawlers.forEach((c) => {
			c.segments = 0;
		});
		p.net.tick(STEP, {});
		assert.equal(p.net.world.s.phase, "clear");
		steps(p, 0.1, {});
		assert.equal(p.events.event.filter((e) => e.type === "clear").length, 1);
	});
	await test("client presents retained events once despite repeated snapshots", async () => {
		const p = await make({ host: false }),
			packet = packView(
				p.net.world.view(),
				1,
				[],
				[{ type: "bite", id: 7, x: 4, y: 7, value: 3 }],
			);
		p.hub.emit("message", packet, 0);
		packet.n = 2;
		p.hub.emit("message", packet, 0);
		assert.equal(p.events.event.filter((e) => e.type === "bite").length, 1);
	});
	await test("leaving removes actor, sprout ownership and stale command state", async () => {
		const p = await make();
		start(p);
		input(p, 1, 1);
		p.hub.emit("message", { t: "p", g: 0, id: "leave-bait" }, 1);
		p.hub.emit("leave", { id: 1, reason: "disconnected" });
		assert.deepEqual(
			p.net.info.players.map((p) => p.id),
			[0],
		);
		assert.deepEqual(
			p.net.world.players.map((p) => p.id),
			[0],
		);
		assert.equal(p.net.heard.has(1), false);
		assert.ok(p.net.world.bait.every((b) => b.owner !== 1));
		assert.ok(p.hub.sends.at(-1).options.reliable);
		p.net.tick(0.1, { dir: [1, 0] });
		assert.ok(p.net.world.s.totalTime > 0);
	});
	await test("a departed partner cannot return through checkpoint retry", async () => {
		const p = await make();
		start(p);
		p.hub.emit("leave", { id: 1, reason: "disconnected" });
		p.net.world.retry();
		assert.deepEqual(
			p.net.world.players.map((p) => p.id),
			[0],
		);
		assert.deepEqual(p.net.world.s.ids, [0]);
		assert.ok(p.net.world.entry.players.every((p) => p.id !== 1));
	});
	await test("finish is host-only, once, with tied remaining players and real score", async () => {
		const host = await make(),
			client = await make({ host: false });
		host.net.world.s.score = 247;
		host.net.finish(true);
		host.net.finish(false);
		client.net.finish(true);
		assert.equal(host.hub.finishes.length, 1);
		assert.equal(client.hub.finishes.length, 0);
		assert.deepEqual(host.hub.finishes[0].standings, [[0, 1]]);
		assert.deepEqual(host.hub.finishes[0].scores, { 0: 247, 1: 247 });
		assert.equal(host.hub.finishes[0].won, true);
	});
	await test("time-up finishes within the callback and stops authoritative stepping", async () => {
		const p = await make({ server: true });
		start(p);
		p.net.world.s.score = 82;
		p.hub.emit("time-up", { graceMs: 500 });
		assert.equal(p.hub.finishes.length, 1);
		assert.equal(p.hub.finishes[0].won, false);
		assert.deepEqual(p.hub.finishes[0].standings, [[0, 1]]);
		const t = p.net.world.s.totalTime,
			sends = p.hub.sends.length;
		p.net.tick(0.5, { dir: [1, 0] });
		assert.equal(p.net.world.s.totalTime, t);
		assert.equal(p.hub.sends.length, sends);
	});
	await test("end stops input, sends, simulation and invokes sound-stop callback once", async () => {
		const p = await make();
		start(p);
		input(p, 1, 1);
		p.hub.emit("end", { reason: "host-left" });
		const time = p.net.world.s.totalTime,
			seeds = p.net.world.s.seeds,
			sends = p.hub.sends.length;
		p.net.tick(0.5, { plant: true, dir: [1, 0] });
		p.hub.emit("message", { t: "p", g: 0, id: "after" }, 1);
		p.net.send({ t: "anything" });
		assert.equal(p.net.world.s.totalTime, time);
		assert.equal(p.net.world.s.seeds, seeds);
		assert.equal(p.hub.sends.length, sends);
		assert.equal(p.net.pending.size, 0);
		assert.equal(p.net.heard.size, 0);
		assert.equal(p.events.end, 1);
	});
	await test("worst authored snapshots remain below protocol size and preserve objectives", async () => {
		const p = await make();
		for (let level = 0; level < GARDENS.length; level++) {
			p.net.world.dev("garden", level);
			for (let wave = 0; wave < 3; wave++) {
				p.net.world.s.wave = wave;
				p.net.world.enter();
				const view = p.net.world.view(),
					packet = packView(
						view,
						level * 3 + wave,
						Array.from({ length: 8 }, (_, i) => [
							`1/${level * 8 + wave}/${i}`,
							true,
						]),
						Array.from({ length: 8 }, (_, i) => ({
							type: "bite",
							id: i + 1,
							x: 10.25,
							y: 11,
							value: 9,
							mult: 3,
						})),
					);
				assert.ok(Buffer.byteLength(JSON.stringify(packet)) < 16384);
				const unpacked = unpackView(packet);
				assert.equal(unpacked.remaining, view.remaining);
				assert.equal(unpacked.players.length, 2);
				assert.equal(unpacked.garden.id, level);
				assert.equal(unpacked.wave, wave);
			}
		}
	});
	await test("dispose detaches every registered lifecycle handler", async () => {
		const p = await make();
		p.net.dispose();
		assert.equal(
			[...p.hub.listeners.values()].reduce((n, s) => n + s.size, 0),
			0,
		);
		p.hub.emit("start");
		assert.equal(p.net.started, false);
	});
	return { passed, failed, failures };
}

if (process.argv[1]?.endsWith("/net-tests.mjs")) {
	const r = await runNetTests();
	for (const failure of r.failures) console.log(`FAIL ${failure}`);
	console.log(`${r.passed} passed / ${r.failed} failed`);
	process.exitCode = r.failed ? 1 : 0;
}
