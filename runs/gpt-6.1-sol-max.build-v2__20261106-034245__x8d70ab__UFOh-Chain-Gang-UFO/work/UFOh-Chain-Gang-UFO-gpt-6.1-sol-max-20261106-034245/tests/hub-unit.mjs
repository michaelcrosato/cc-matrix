import assert from "node:assert/strict";
import "../vendor/engine/my-3d2dge.js";
import {
	createHubAdapter,
	decodeSnapshot,
	encodeSnapshot,
	sanitizeIntent,
} from "../src/net/hub-adapter.js";
import { World } from "../src/simulation.js";

const clone = (v) => JSON.parse(JSON.stringify(v));

class FakeWorld {
	constructor(options) {
		this.options = options;
		this.events = [];
		this.removed = [];
		this.state = {
			t: 0,
			tick: 0,
			status: "running",
			score: 0,
			bestChain: 0,
			balance: {
				moveSpeed: 220,
				recoveryFactor: 0.5,
				acceleration: 12,
				cannonSlew: 6.283,
			},
			players: options.players.map(({ id, name }, index) => ({
				id,
				index,
				name,
				x: 360 + index * 120,
				y: 300,
				vx: 0,
				vy: 0,
				r: 13,
				hull: 3,
				shield: 0,
				invuln: 0,
				grace: 0,
				active: true,
				down: false,
				bearing: 0,
				requested: 0,
				cool: 0,
				recoil: 0,
				score: 0,
				ack: 0,
			})),
			enemies: [],
			shots: [],
			blasts: [],
			boss: null,
			events: this.events,
		};
	}
	step(dt, intents) {
		this.state.t += dt;
		this.state.tick++;
		for (const player of this.state.players) {
			const intent = intents[player.id] || {};
			player.x += (intent.mx || 0) * 220 * dt;
			player.y += (intent.my || 0) * 220 * dt;
			if (intent.fire) {
				this.state.score++;
				player.score++;
				this.events.push({
					id: this.state.tick * 2 + player.index,
					type: "shot",
					t: this.state.t,
					x: player.x,
					y: player.y,
				});
			}
		}
	}
	snapshot() {
		return clone(this.state);
	}
	applySnapshot(snapshot) {
		this.state = snapshot;
		this.events = snapshot.events;
	}
	removePlayer(id) {
		this.removed.push(id);
		const player = this.state.players.find((p) => p.id === id);
		if (player) player.active = false;
	}
}

function network({ server = false, count = 2, standalone = false } = {}) {
	const players = Array.from({ length: count }, (_, id) => ({
		id,
		name: id ? "WING 2" : "PILOT 1",
	}));
	const host = server ? -1 : 0;
	const network = {
		now: -Infinity,
		hubs: [],
		packets: [],
		queued: [],
		defer: false,
	};
	function makeHub(me) {
		const listeners = new Map();
		const hub = {
			me,
			host,
			server: me === -1,
			isHost: me === host,
			players,
			active: !standalone,
			seed: 8431,
			limitMs: 600000,
			readyCount: 0,
			connectCount: 0,
			finishCount: 0,
			result: null,
			errors: [],
			on(event, fn) {
				const group = listeners.get(event) || new Set();
				group.add(fn);
				listeners.set(event, group);
				return () => group.delete(fn);
			},
			emit(event, ...args) {
				for (const fn of listeners.get(event) || []) fn(...args);
			},
			async connect(options) {
				hub.connectCount++;
				assert.deepEqual(options, { mode: "shared-world", seats: [1, 2] });
				return standalone ? null : hub;
			},
			ready() {
				hub.readyCount++;
			},
			time() {
				return network.now;
			},
			rng(label) {
				assert.equal(label, "ufoh-world");
				return () => 0.394848;
			},
			send(packet, options) {
				network.packets.push({
					from: me,
					packet: clone(packet),
					options: { ...options },
				});
				for (const other of network.hubs) {
					if (
						other.me === me ||
						(options.to !== undefined && other.me !== options.to)
					)
						continue;
					const deliver = () => other.emit("message", clone(packet), me);
					if (network.defer) network.queued.push(deliver);
					else deliver();
				}
				return true;
			},
			finish(result) {
				hub.finishCount++;
				hub.result = clone(result);
			},
			fail(message) {
				hub.errors.push(message);
			},
		};
		network.hubs.push(hub);
		return hub;
	}
	network.host = makeHub(host);
	network.guests = players
		.filter((p) => p.id !== host)
		.map((p) => makeHub(p.id));
	network.start = () => {
		network.now = -3000;
		for (const hub of network.hubs) hub.emit("start", { in: 3000 });
	};
	network.flush = () => {
		const queue = network.queued.splice(0);
		for (const deliver of queue) deliver();
	};
	return network;
}

async function setup(options = {}) {
	const net = network(options);
	const ended = [];
	const events = [];
	const adapters = net.hubs.map((hub) =>
		createHubAdapter({
			hub,
			createWorld: (args) =>
				options.actual ? new World(args) : new FakeWorld(args),
			onEnd: (reason) => ended.push({ id: hub.me, reason }),
			onEvent: (event) => events.push({ id: hub.me, event }),
		}),
	);
	await Promise.all(adapters.map((adapter) => adapter.connect()));
	return {
		net,
		adapters,
		host: adapters[0],
		guest: adapters[1],
		ended,
		events,
	};
}

function steps(fixture, count, intents = {}) {
	for (let i = 0; i < count; i++) {
		for (const adapter of fixture.adapters)
			adapter.tick(1 / 120, intents[adapter.localId] || {});
	}
}

export async function runHubUnitTests() {
	const results = [];
	async function test(name, fn) {
		try {
			await fn();
			results.push({ name, pass: true });
		} catch (error) {
			results.push({ name, pass: false, detail: error.stack || error.message });
		}
	}

	await test("Hub: standalone null selects local boot without ready", async () => {
		const f = await setup({ standalone: true, count: 1 });
		assert.equal(f.host.active, false);
		assert.equal(f.host.getWorld(), null);
		assert.equal(f.net.host.readyCount, 0);
	});

	await test("Hub: connect and automatic ready run once without input", async () => {
		const f = await setup();
		await f.host.connect();
		for (const hub of f.net.hubs) {
			assert.equal(hub.readyCount, 1);
			assert.equal(hub.connectCount, 1);
		}
		assert.equal(f.host.getWorld().state.players.length, 2);
		assert.equal(
			f.host.getWorld().options.seed,
			f.guest.getWorld().options.seed,
		);
	});

	await test("Hub: waiting and three-second countdown cannot advance world or traffic", async () => {
		const f = await setup();
		steps(f, 120, { 0: { fire: true, mx: 1 }, 1: { fire: true } });
		f.net.start();
		steps(f, 360, { 0: { fire: true, mx: 1 }, 1: { fire: true } });
		assert.equal(f.host.getWorld().state.t, 0);
		assert.equal(f.net.packets.length, 0);
		f.net.now = 0;
		steps(f, 1);
		assert.ok(f.host.getWorld().state.t > 0);
	});

	await test("Hub: local and remote intent affect their own authoritative pilots", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 120, { 0: { mx: -1 }, 1: { mx: 1, fire: true } });
		const [p0, p1] = f.host.getWorld().state.players;
		assert.ok(p0.x < 200);
		assert.ok(p1.x > 640);
		assert.equal(p0.score, 0);
		assert.ok(p1.score > 0);
		assert.ok(f.guest.getWorld().state.score > 0);
		assert.ok(f.net.packets.some((packet) => packet.from === 0));
		assert.ok(f.net.packets.some((packet) => packet.from === 1));
	});

	await test("Hub: no-input clients send neutral reliable heartbeats", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 120);
		const packets = f.net.packets.filter((packet) => packet.from === 1);
		assert.ok(packets.length >= 9 && packets.length <= 10);
		assert.ok(
			packets.every(
				(packet) => packet.packet.i.mx === 0 && packet.packet.i.fire === false,
			),
		);
		assert.ok(
			f.net.packets.every((packet) => packet.options.reliable === true),
		);
	});

	await test("Hub: packet rate stays within 20 per second and payload within 16 KB", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 240);
		assert.ok(f.net.packets.filter((packet) => packet.from === 0).length <= 17);
		assert.ok(f.net.packets.filter((packet) => packet.from === 1).length <= 21);
		assert.ok(f.host.diagnostics().maxBytes < 16384);
		assert.ok(f.guest.diagnostics().maxBytes < 16384);
	});

	await test("Hub: actor codec retains heterogeneous fields, nulls, IDs and every actor", () => {
		const snapshot = new FakeWorld({
			players: [{ id: 0, name: "A" }],
		}).snapshot();
		snapshot.enemies = [
			{ id: 1, x: 4.123456, kind: "drifter", fuse: null },
			{ id: 2, x: 9, kind: "hunter", armed: true },
		];
		snapshot.shots = [{ id: 3, x: 8, y: 2, player: 0 }];
		snapshot.events = Array.from({ length: 100 }, (_, id) => ({
			id,
			type: "kill",
		}));
		const decoded = decodeSnapshot(
			JSON.parse(JSON.stringify(encodeSnapshot(snapshot))),
		);
		assert.equal(decoded.enemies.length, 2);
		assert.equal(decoded.shots.length, 1);
		assert.equal(decoded.enemies[0].x, 4.123);
		assert.equal(decoded.enemies[0].fuse, null);
		assert.equal("fuse" in decoded.enemies[1], false);
		assert.equal(decoded.enemies[1].armed, true);
		assert.equal(decoded.shots[0].player, 0);
		assert.equal(decoded.events.length, 24);
		assert.equal(decoded.events.at(-1).id, 99);
	});

	await test("Hub: dense 40-enemy/60-projectile full world fits limit without dropped actors", () => {
		const snapshot = new FakeWorld({
			players: [
				{ id: 0, name: "PILOT" },
				{ id: 1, name: "WING" },
			],
		}).snapshot();
		snapshot.enemies = Array.from({ length: 40 }, (_, id) => ({
			id: id + 20,
			kind: ["drifter", "hunter", "gunship"][id % 3],
			x: 10.123 + id * 20,
			y: 40.931 + id * 9,
			vx: 19.398,
			vy: 4.231,
			r: 12,
			age: 4.789,
			rot: 2.32,
			cool: 1.3,
			armed: true,
			gate: 0,
			fuse: null,
		}));
		snapshot.shots = Array.from({ length: 60 }, (_, id) => ({
			id: id + 100,
			x: id * 9.821,
			y: id * 5.792,
			px: id * 9.7,
			py: id * 5.6,
			vx: 260.819,
			vy: 329.819,
			r: 3,
			life: 1.842,
			team: id % 2 ? "hostile" : "player",
			owner: id % 2,
			damage: 1,
		}));
		snapshot.events = Array.from({ length: 24 }, (_, id) => ({
			id,
			type: "chain",
			x: id * 9.389,
			y: id * 5.829,
			depth: 4,
			player: 0,
			t: 27.483,
		}));
		const packet = {
			v: 1,
			t: "w",
			n: 90,
			ack: { 0: 89, 1: 84 },
			final: false,
			w: encodeSnapshot(snapshot),
		};
		assert.ok(new TextEncoder().encode(JSON.stringify(packet)).length <= 16384);
		const decoded = decodeSnapshot(packet.w);
		assert.equal(decoded.enemies.length, 40);
		assert.equal(decoded.shots.length, 60);
	});

	await test("Hub: sanitization rejects claimed score, invalid vectors, NaN and aim spoofing", () => {
		const sanitized = sanitizeIntent(
			{ mx: Infinity, my: -9, aim: NaN, fire: "yes", score: 999 },
			4,
		);
		assert.deepEqual(sanitized, {
			mx: 0,
			my: -1,
			aim: null,
			fire: false,
			seq: 4,
		});
		assert.ok(
			Math.hypot(
				...Object.values(sanitizeIntent({ mx: 1, my: 1 })).slice(0, 2),
			) <= 1.00001,
		);
	});

	await test("Hub: foreign sender and duplicate/reordered sequences cannot inject input", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		f.net.host.emit("message", { v: 1, t: "i", n: 99, i: { fire: true } }, 80);
		f.net.host.emit("message", { v: 1, t: "i", n: 2, i: { mx: 1 } }, 1);
		f.net.host.emit(
			"message",
			{ v: 1, t: "i", n: 1, i: { mx: -1, fire: true } },
			1,
		);
		f.host.tick(0.1, {});
		assert.equal(f.host.getWorld().state.score, 0);
		assert.ok(f.host.getWorld().state.players[1].x > 480);
		assert.equal(f.host.diagnostics().discardedPackets, 2);
	});

	await test("Hub: clients reject forged authority and older world snapshots", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 30);
		const packet = clone(f.net.packets.find((p) => p.packet.t === "w").packet);
		const time = f.guest.getWorld().state.t;
		f.net.guests[0].emit("message", { ...packet, n: 1000 }, 777);
		f.net.guests[0].emit("message", packet, 0);
		assert.equal(f.guest.getWorld().state.t, time);
		assert.ok(f.guest.diagnostics().discardedPackets >= 2);
	});

	await test("Hub: remote held fire expires after half a second without packets", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		f.net.host.emit("message", { v: 1, t: "i", n: 1, i: { fire: true } }, 1);
		for (let i = 0; i < 80; i++) f.host.tick(1 / 120, {});
		const score = f.host.getWorld().state.score;
		for (let i = 0; i < 120; i++) f.host.tick(1 / 120, {});
		assert.equal(f.host.getWorld().state.score, score);
	});

	await test("Hub: a local overlay sends neutral intent while authority continues", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		for (let i = 0; i < 60; i++) {
			f.host.tick(1 / 120, { fire: true }, { overlay: true });
			f.guest.tick(1 / 120, { fire: true, mx: 1 }, { overlay: true });
		}
		assert.ok(f.host.getWorld().state.t > 0.49);
		assert.equal(f.host.getWorld().state.score, 0);
		assert.equal(f.host.getWorld().state.players[1].x, 480);
	});

	await test("Hub: leave clears old input and removes pilot from final tied standing", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		f.net.host.emit("message", { v: 1, t: "i", n: 1, i: { fire: true } }, 1);
		f.net.host.emit("leave", { id: 1, reason: "left" });
		for (let i = 0; i < 20; i++) f.host.tick(1 / 120, {});
		assert.deepEqual(f.host.getWorld().removed, [1]);
		assert.equal(f.host.getWorld().state.score, 0);
		f.net.host.emit("time-up", { graceMs: 1000 });
		assert.deepEqual(f.net.host.result.standings, [[0]]);
	});

	await test("Hub: server host has no pilot but simulates all members and broadcasts", async () => {
		const f = await setup({ server: true });
		assert.equal(f.host.localId, null);
		assert.equal(
			f.host.getWorld().state.players.some((p) => p.id === -1),
			false,
		);
		f.net.start();
		f.net.now = 0;
		steps(f, 120, { 0: { fire: true }, 1: { my: 1 } });
		assert.ok(f.host.getWorld().state.score > 0);
		assert.ok(f.host.getWorld().state.players[1].y > 400);
		assert.ok(f.net.packets.some((p) => p.from === -1));
		f.net.host.emit("time-up", { graceMs: 500 });
		assert.deepEqual(f.net.host.result.standings, [[0, 1]]);
		assert.equal(f.net.host.finishCount, 1);
	});

	await test("Hub: supported one-player session simulates and finishes normally", async () => {
		const f = await setup({ count: 1 });
		f.net.start();
		f.net.now = 0;
		steps(f, 30, { 0: { fire: true } });
		f.net.host.emit("time-up", { graceMs: 500 });
		assert.deepEqual(f.net.host.result.standings, [[0]]);
		assert.equal(f.net.host.result.won, false);
		assert.ok(f.net.host.result.scores[0] > 0);
	});

	await test("Hub: time-up sends final world before exactly one team-loss finish", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 30);
		f.net.host.emit("time-up", { graceMs: 500 });
		f.net.host.emit("time-up", { graceMs: 500 });
		assert.equal(f.net.host.finishCount, 1);
		assert.equal(f.net.packets.at(-1).packet.final, true);
		assert.equal(f.net.host.result.won, false);
		assert.equal(f.guest.getWorld().state.status, "defeat");
		const traffic = f.net.packets.length;
		steps(f, 60);
		assert.equal(f.net.packets.length, traffic);
	});

	await test("Hub: real victory status reports tied team win and shared score", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		f.host.getWorld().state.status = "victory";
		f.host.getWorld().state.score = 501;
		f.host.tick(1 / 120, {});
		assert.equal(f.net.host.result.won, true);
		assert.deepEqual(f.net.host.result.standings, [[0, 1]]);
		assert.deepEqual(f.net.host.result.scores, { 0: 501, 1: 501 });
	});

	await test("Hub: local presentation predicts without moving authority or changing score", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 30);
		const before = clone(f.guest.getWorld().state);
		f.guest.tick(1 / 120, { mx: 1, aim: Math.PI / 2 });
		const presentation = f.guest.getPresentation();
		assert.ok(presentation.players[1].x > before.players[1].x);
		assert.deepEqual(f.guest.getWorld().state, before);
		assert.equal(presentation.score, before.score);
	});

	await test("Hub: repeated snapshots cannot replay simulation audio events", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 60, { 0: { fire: true } });
		const guestIds = f.events
			.filter((entry) => entry.id === 1)
			.map((entry) => entry.event.id);
		assert.equal(new Set(guestIds).size, guestIds.length);
		assert.ok(guestIds.length > 0);
	});

	await test("Hub: end stops input, outbound traffic and invokes sound-stop callback once", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 30);
		const count = f.net.packets.length;
		const time = f.host.getWorld().state.t;
		for (const hub of f.net.hubs) {
			hub.emit("end", { reason: "host-left" });
			hub.emit("end", { reason: "host-left" });
		}
		steps(f, 120, { 0: { fire: true }, 1: { fire: true } });
		assert.equal(f.net.packets.length, count);
		assert.equal(f.host.getWorld().state.t, time);
		assert.equal(f.ended.length, 2);
		assert.ok(f.adapters.every((adapter) => adapter.ended));
	});

	await test("Hub: actual dense world preserves 40 threats, 60 shots, four chains and boss within 16 KB", () => {
		const world = new World({
			seed: 1981,
			players: [
				{ id: 0, name: "PILOT ONE" },
				{ id: 1, name: "PILOT TWO" },
			],
		});
		for (let i = 0; i < 40; i++)
			world.spawn(
				["drifter", "hunter", "gunship"][i % 3],
				60 + i * 20,
				100 + i * 8,
				{ instant: true },
			);
		for (let i = 0; i < 60; i++) {
			const player = world.state.players[i % 2];
			player.cool = 0;
			world.fire(player);
			world.state.shots.at(-1).x += i * 2.81384;
			world.state.shots.at(-1).y -= i * 0.39273;
		}
		for (let i = 0; i < 4; i++) {
			const chain = world.chain(i % 2, 280 + i * 100, 200);
			chain.victims = Array.from({ length: 10 }, (_, id) => i * 20 + id);
		}
		world.createBoss();
		const packet = {
			v: 1,
			t: "w",
			n: 90,
			ack: { 0: 89, 1: 84 },
			final: false,
			w: encodeSnapshot(world.snapshot()),
		};
		const bytes = new TextEncoder().encode(JSON.stringify(packet)).length;
		assert.ok(bytes <= 16384, `Actual dense world packet is ${bytes} bytes`);
		const decoded = decodeSnapshot(packet.w);
		assert.equal(decoded.enemies.length, 40);
		assert.equal(decoded.shots.length, 60);
		assert.equal(decoded.chains.length, 4);
		assert.equal(decoded.boss.components.length, 3);
		assert.deepEqual(
			decoded.chains.map((chain) => chain.victims),
			world.state.chains.map((chain) => chain.victims),
		);
	});

	await test("Hub: actual launch transition holds local presentation still despite move input", async () => {
		const f = await setup({ actual: true });
		f.net.start();
		f.net.now = 0;
		steps(f, 30, { 1: { mx: 1, fire: true } });
		const authoritative = clone(f.guest.getWorld().state.players[1]);
		f.guest.tick(1 / 120, { mx: 1, fire: true });
		const rendered = f.guest.getPresentation().players[1];
		assert.equal(rendered.x, authoritative.x);
		assert.equal(rendered.y, authoritative.y);
		assert.equal(rendered.hull, authoritative.hull);
		assert.equal(rendered.shield, authoritative.shield);
		assert.equal(f.host.getWorld().state.metrics.shots, 0);
	});

	await test("Hub: actual shared collision, shield, score and ack originate from one host", async () => {
		const f = await setup({ actual: true });
		f.net.start();
		f.net.now = 0;
		const world = f.host.getWorld();
		world.state.transition = 0;
		world.state.waveSpawned = [0, 1];
		const wing = world.state.players[1];
		world.spawn("drifter", wing.x, wing.y, {
			instant: true,
			merge: false,
			speed: 0,
		});
		steps(f, 30);
		const hostWing = world.state.players[1];
		const guestWing = f.guest.getWorld().state.players[1];
		assert.equal(world.state.metrics.rams, 1);
		assert.equal(world.state.score, 1);
		assert.equal(f.guest.getWorld().state.score, 1);
		assert.ok(hostWing.shield > 0);
		assert.ok(guestWing.shield > 0);
		assert.equal(hostWing.hull, guestWing.hull);
		assert.equal(hostWing.score, guestWing.score);
		assert.ok(f.host.diagnostics().ack[1] >= 1);
		assert.equal(world.state.debug, false);
	});

	await test("Hub fire latch: one-tick tap reaches real host cannon once, then releases", async () => {
		const f = await setup({ actual: true });
		f.net.start();
		f.net.now = 0;
		const world = f.host.getWorld();
		world.state.transition = 0;
		world.state.waveTime = -100;
		f.guest.tick(1 / 120, { fire: true });
		steps(f, 60);
		const packets = f.net.packets.filter((p) => p.from === 1);
		assert.deepEqual(
			packets.slice(0, 2).map((p) => p.packet.i.fire),
			[true, false],
		);
		assert.ok(packets.slice(1).every((p) => p.packet.i.fire === false));
		assert.equal(world.state.metrics.shots, 1);
		assert.equal(f.guest.diagnostics().queuedFire, false);
	});

	await test("Hub fire latch: opening overlay discards an unsent tap before resume", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		f.guest.tick(1 / 120, { fire: true });
		assert.equal(f.guest.diagnostics().queuedFire, true);
		f.guest.tick(1 / 120, {}, { overlay: true });
		assert.equal(f.guest.diagnostics().queuedFire, false);
		steps(f, 40);
		assert.ok(
			f.net.packets.filter((p) => p.from === 1).every((p) => !p.packet.i.fire),
		);
		assert.equal(f.host.getWorld().state.score, 0);
	});

	await test("Hub fire latch: failed sends retain a tap until exactly one successful packet", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		const guestHub = f.net.guests[0],
			originalSend = guestHub.send;
		let attempts = 0;
		guestHub.send = (...args) =>
			attempts++ === 0 ? false : originalSend(...args);
		f.guest.tick(1 / 120, { fire: true });
		steps(f, 11);
		assert.equal(f.guest.diagnostics().queuedFire, true);
		steps(f, 24);
		const packets = f.net.packets.filter((p) => p.from === 1);
		assert.deepEqual(
			packets.map((p) => p.packet.i.fire),
			[true, false],
		);
		assert.equal(f.guest.diagnostics().queuedFire, false);
	});

	await test("Hub fire latch: held fire remains held and release does not invent another edge", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		steps(f, 36, { 1: { fire: true } });
		steps(f, 24);
		const flags = f.net.packets
			.filter((p) => p.from === 1)
			.map((p) => p.packet.i.fire);
		assert.deepEqual(flags, [true, true, true, false, false]);
	});

	await test("Hub fire latch: countdown, leave and end discard pending edge state", async () => {
		const f = await setup();
		f.net.start();
		f.guest.tick(1 / 120, { fire: true });
		f.guest.tick(1 / 120, { fire: false });
		assert.equal(f.guest.diagnostics().queuedFire, false);
		f.net.now = 0;
		steps(f, 12);
		assert.equal(f.net.packets.find((p) => p.from === 1).packet.i.fire, false);
		f.guest.tick(1 / 120, { fire: true });
		assert.equal(f.guest.diagnostics().queuedFire, true);
		f.net.guests[0].emit("leave", { id: 1, reason: "left" });
		assert.equal(f.guest.diagnostics().queuedFire, false);
		const count = f.net.packets.filter((p) => p.from === 1).length;
		for (let i = 0; i < 30; i++) f.guest.tick(1 / 120, { fire: true });
		assert.equal(f.net.packets.filter((p) => p.from === 1).length, count);
		assert.equal(f.guest.diagnostics().queuedFire, false);
		const other = await setup();
		other.net.start();
		other.net.now = 0;
		other.guest.tick(1 / 120, { fire: true });
		other.net.guests[0].emit("end", { reason: "finished" });
		assert.equal(other.guest.diagnostics().queuedFire, false);
	});

	await test("Hub fire latch: lost release heartbeat still expires at the host stale-input limit", async () => {
		const f = await setup();
		f.net.start();
		f.net.now = 0;
		f.guest.tick(1 / 120, { fire: true });
		steps(f, 11);
		assert.equal(
			f.net.packets.filter((p) => p.from === 1).at(-1).packet.i.fire,
			true,
		);
		f.net.guests[0].send = () => false;
		steps(f, 80);
		const score = f.host.getWorld().state.score;
		assert.ok(score > 0);
		steps(f, 80);
		assert.equal(f.host.getWorld().state.score, score);
		assert.equal(f.guest.diagnostics().queuedFire, false);
	});

	return results;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
	const results = await runHubUnitTests();
	for (const result of results.filter((item) => !item.pass))
		console.error(`${result.name}\n${result.detail}`);
	const failed = results.filter((item) => !item.pass).length;
	console.log(`${results.length - failed} passed, ${failed} failed`);
	process.exitCode = failed ? 1 : 0;
}
