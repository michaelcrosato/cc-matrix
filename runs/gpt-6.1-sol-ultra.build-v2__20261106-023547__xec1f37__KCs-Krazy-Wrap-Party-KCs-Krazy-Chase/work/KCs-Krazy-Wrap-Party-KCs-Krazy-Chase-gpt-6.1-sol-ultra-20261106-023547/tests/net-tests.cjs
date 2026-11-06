const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const simCode = fs.readFileSync(path.join(root, "src/sim.js"), "utf8");
const netCode = fs.readFileSync(path.join(root, "src/net.js"), "utf8");
let passed = 0,
	failed = 0;
const test = async (name, fn) => {
	try {
		await fn();
		passed++;
	} catch (e) {
		failed++;
		console.log(`FAIL ${name}: ${e.message}`);
	}
};
function network(server = false, count = 2) {
	const peers = new Map(),
		all = [],
		players = Array.from({ length: count }, (_, id) => ({
			id,
			name: `Keeper ${id}`,
			color: "#fff",
		}));
	const host = server ? -1 : 0;
	let clock = 1000;
	async function peer(id) {
		const handlers = new Map(),
			sends = [],
			finishes = [];
		const hub = {
			active: true,
			isHost: id === host,
			server: server && id === host,
			me: id,
			host,
			round: 1,
			seed: 923,
			players: players.slice(),
			time: () => clock,
			on(e, f) {
				handlers.set(e, f);
			},
			connect: async () => ({
				me: id,
				host,
				players,
				seed: 923,
				round: 1,
				server: server && id === host,
			}),
			ready() {
				this.wasReady = true;
			},
			send(data, opts = {}) {
				sends.push({ data, opts });
				all.push({ from: id, data, opts });
				for (const [otherId, p] of peers)
					if (otherId !== id && (opts.to === undefined || opts.to === otherId))
						p.handlers.get("message")?.(JSON.parse(JSON.stringify(data)), id);
				return true;
			},
			finish(result) {
				finishes.push(result);
			},
		};
		const context = vm.createContext({
			AIHub: hub,
			performance: { now: () => clock },
			console,
		});
		vm.runInContext(simCode, context);
		vm.runInContext(netCode, context);
		const p = {
			context,
			net: context.GardenNet,
			hub,
			handlers,
			sends,
			finishes,
			ended: false,
		};
		peers.set(id, p);
		await p.net.init({
			onEnd() {
				p.ended = true;
			},
		});
		return p;
	}
	return {
		peer,
		all,
		clock(dt) {
			clock += dt;
		},
		start() {
			for (const p of peers.values()) p.handlers.get("start")?.({ in: 0 });
		},
		step(frames = 1) {
			for (let i = 0; i < frames; i++) {
				clock += 1000 / 60;
				for (const p of peers.values()) p.net.update(1 / 60, {});
			}
		},
		peers,
	};
}
(async () => {
	await test("ready requires no gesture and single-player Hub creates one keeper", async () => {
		const n = network(false, 1),
			p = await n.peer(0);
		assert(p.hub.wasReady);
		assert.equal(p.net.state.players.length, 1);
		assert.equal(p.net.localId, 1);
		const tick = p.net.state.tick;
		p.net.update(0.25, { dir: [1, 0] });
		assert.equal(p.net.state.tick, tick);
	});
	await test("non-playing authority has no phantom seat and advances both keepers", async () => {
		const n = network(true),
			a = await n.peer(-1),
			b = await n.peer(0),
			c = await n.peer(1);
		assert.equal(a.net.localId, null);
		assert.equal(a.net.state.players.length, 2);
		n.start();
		n.step(12);
		assert(a.net.state.tick > 0);
		assert(b.net.state.tick > 0);
		assert(c.net.state.tick > 0);
		assert.equal(b.net.state.players.length, 2);
	});
	await test("host binds movement to transport sender and rejects stale sequence", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		const m = a.handlers.get("message");
		m({ t: "c", r: 1, g: 0, q: 2, d: [1, 0], actor: 1 }, 1);
		m({ t: "c", r: 1, g: 0, q: 1, d: [-1, 0] }, 1);
		const before = a.net.state.players.map((p) => p.x);
		a.net.update(1 / 60, {});
		assert.equal(a.net.state.players[0].x, before[0]);
		assert(a.net.state.players[1].x > before[1]);
		assert(a.net.stats.stale > 0);
		m({ t: "c", r: 1, g: 0, q: 9, d: [1, 0] }, 99);
		assert(a.net.stats.rejected > 0);
	});
	await test("a sub-heartbeat direction tap survives release and cancels a prior click path", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		a.net.state.players[1].clickTarget = [5, 7];
		b.net.update(0.02, { dir: [-1, 0] });
		b.net.update(0.02, {});
		assert.equal(b.sends.filter((s) => s.data.t === "c").length, 0);
		b.net.update(0.09, {});
		a.net.update(1 / 60, {});
		assert.equal(a.net.state.players[1].clickTarget, null);
		const packet = b.sends.find((s) => s.data.t === "c");
		assert.deepEqual(JSON.parse(JSON.stringify(packet.data.d)), [-1, 0]);
		assert.equal(packet.data.tg, undefined);
		assert.equal(packet.opts.reliable, true);
	});
	await test("a newer mouse destination supersedes an unsent direction tap", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		b.net.update(0.02, { dir: [-1, 0] });
		b.net.update(0.02, { target: [6, 7] });
		b.net.update(0.09, { target: [6, 7] });
		a.net.update(1 / 60, {});
		assert.deepEqual(
			JSON.parse(JSON.stringify(a.net.state.players[1].clickTarget)),
			[6, 7],
		);
		assert(a.net.state.players[1].x > 2);
	});
	await test("a refused heartbeat retains the buffered direction for its next allowed send", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		a.net.state.players[1].clickTarget = [5, 7];
		const original = b.hub.send;
		b.hub.send = () => false;
		b.net.update(0.13, { dir: [-1, 0] });
		b.hub.send = original;
		b.net.update(0.13, {});
		a.net.update(1 / 60, {});
		assert.equal(a.net.state.players[1].clickTarget, null);
		assert.deepEqual(
			JSON.parse(JSON.stringify(b.sends.find((s) => s.data.t === "c").data.d)),
			[-1, 0],
		);
	});
	await test("stale directional input stops instead of steering forever", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		a.handlers.get("message")({ t: "c", r: 1, g: 0, q: 1, d: [1, 0] }, 1);
		a.net.update(1 / 60, {});
		n.clock(800);
		const before = a.net.state.players[1].x;
		a.net.update(1 / 60, {});
		assert.equal(a.net.state.players[1].x, before);
	});
	await test("reliable plant deduplication spends once and repeats acknowledgement", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		const data = { t: "p", r: 1, g: 0, id: "0-1" };
		const m = a.handlers.get("message");
		m(data, 1);
		m(data, 1);
		a.net.update(1 / 60, {});
		const seeds = a.net.state.seeds;
		const actions = a.net.stats.actions;
		m(data, 1);
		a.net.update(1 / 60, {});
		assert.equal(a.net.state.seeds, seeds);
		assert.equal(a.net.stats.actions, actions);
		assert.equal(a.net.state.stats.plants, 1);
		assert(a.sends.filter((s) => s.data.t === "a").length >= 2);
		assert.equal(a.net.state.plantResults.length, 1);
		assert.equal(b.net.acknowledgements.get("1:0-1"), "accepted");
	});
	await test("a delayed burst resolves every discrete action separately", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		const m = a.handlers.get("message");
		m({ t: "p", r: 1, g: 0, id: "0-1" }, 1);
		n.clock(200);
		m({ t: "p", r: 1, g: 0, id: "0-2" }, 1);
		a.net.update(2 / 60, {});
		assert.equal(a.net.state.stats.plants, 1);
		const results = a.sends
			.filter((s) => s.data.t === "a")
			.map((s) => s.data.result);
		assert.equal(results.filter((r) => r === "accepted").length, 1);
		assert.equal(results.filter((r) => r === "rejected").length, 1);
	});
	await test("round-long deduplication retains old final action results", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		const m = a.handlers.get("message"),
			data = { t: "p", r: 1, g: 0, id: "0-1" };
		m(data, 1);
		a.net.update(1 / 60, {});
		const actions = a.net.stats.actions;
		for (let i = 0; i < 80; i++) m({ t: "p", r: 1, g: 9, id: `9-${i}` }, 1);
		n.clock(200);
		m(data, 1);
		a.net.update(1 / 60, {});
		assert.equal(a.net.stats.actions, actions);
		assert.equal(a.net.state.stats.plants, 1);
	});
	await test("mouse movement targets and explicit adjacent planting use authority rules", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		const m = a.handlers.get("message");
		m({ t: "c", r: 1, g: 0, q: 1, d: null, tg: [4, 7] }, 1);
		const before = a.net.state.players[1].x;
		a.net.update(1 / 60, {});
		assert(a.net.state.players[1].x > before);
		m({ t: "p", r: 1, g: 0, id: "0-1", pt: [2, 6] }, 1);
		a.net.update(1 / 60, {});
		assert(
			a.net.state.bait.some((b) => b.owner === 2 && b.x === 2 && b.y === 6),
		);
	});
	await test("malformed planting coordinates receive rejection without spending", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		const seeds = a.net.state.seeds;
		a.handlers.get("message")(
			{ t: "p", r: 1, g: 0, id: "0-1", pt: ["bad", 6] },
			1,
		);
		a.net.update(1 / 60, {});
		assert.equal(a.net.state.seeds, seeds);
		assert(
			a.sends.some((s) => s.data.t === "a" && s.data.result === "rejected"),
		);
	});
	await test("old-garden plant gets a final rejection rather than silently disappearing", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		a.handlers.get("message")({ t: "p", r: 1, g: 9, id: "9-1" }, 1);
		assert(
			a.sends.some((s) => s.data.t === "a" && s.data.result === "rejected"),
		);
	});
	await test("plant during garden report receives immediate final rejection", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		a.net.state.status = "clear";
		a.handlers.get("message")({ t: "p", r: 1, g: 0, id: "0-9" }, 1);
		assert(
			a.sends.some(
				(s) =>
					s.data.t === "a" &&
					s.data.id === "1:0-9" &&
					s.data.result === "rejected",
			),
		);
	});
	await test("garden report never duplicates the clear presentation event", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		for (const c of a.net.state.crawlers) c.segments = 0;
		a.net.update(0.2, {});
		a.net.update(0.2, {});
		const packet = a.sends.filter((s) => s.data.t === "s").at(-1).data;
		assert.equal(packet.e.filter((pair) => pair[1].type === "clear").length, 1);
	});
	await test("old or forged snapshots cannot replace newer host state", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		n.step(20);
		const latest = b.net.state.tick;
		const packet = a.sends.filter((s) => s.data.t === "s").at(-1).data;
		const old = JSON.parse(JSON.stringify(packet));
		old.q = -1;
		old.s.score = 999;
		b.handlers.get("message")(old, 0);
		assert.equal(b.net.state.tick, latest);
		b.handlers.get("message")(
			{ ...packet, q: packet.q + 1, s: { score: 999 } },
			99,
		);
		assert.notEqual(b.net.state.score, 999);
	});
	await test("departure removes actor, owned bait and queued commands without resetting score", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		a.net.state.score = 19;
		a.net.state.bait.push({ owner: 2, x: 1, y: 6 });
		a.hub.players = a.hub.players.filter((p) => p.id !== 1);
		a.handlers.get("leave")({ id: 1 });
		assert.equal(a.net.state.players.length, 1);
		assert.equal(a.net.state.bait.length, 0);
		assert.equal(a.net.state.score, 19);
		assert.equal(a.net.state.players[0].id, 1);
	});
	await test("garden clear advances peers together without finishing the Hub round early", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		a.net.state.score = 83;
		a.net.state.status = "clear";
		n.step(90);
		assert.equal(a.finishes.length, 0);
		assert.equal(a.net.state.garden, 0);
		n.step(90);
		assert.equal(a.net.state.garden, 1);
		assert.equal(b.net.state.garden, 1);
		assert.equal(a.net.state.score, 83);
		assert.equal(b.net.state.score, 83);
		assert.equal(a.finishes.length, 0);
	});
	await test("replicated final victory finishes once and reports a shared team win", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		a.net.state = a.context.GardenSim.create({ garden: 4, players: 2 });
		a.net.state.score = 170;
		a.net.state.status = "clear";
		n.step(170);
		assert.equal(a.finishes.length, 1);
		assert.equal(a.finishes[0].won, true);
		assert.equal(b.net.state.status, "victory");
		assert.equal(b.net.state.score, 170);
	});
	await test("client visuals reconcile movement while leaving exact snapshots unchanged", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		const before = b.net.visual(1 / 60);
		const x = before.players[0].x;
		b.net.state.players[0].x = x + 0.7;
		const exact = JSON.stringify(b.net.state);
		const shown = b.net.visual(1 / 60);
		assert(shown.players[0].x > x && shown.players[0].x < x + 0.7);
		assert.equal(JSON.stringify(b.net.state), exact);
		assert.equal(a.net.visual(1 / 60), a.net.state);
	});
	await test("visual interpolation snaps wrap/body discontinuities and new garden/outcome", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		b.net.visual(1 / 60);
		b.net.state.players[0].x = 13;
		b.net.state.crawlers[0].body[0].x += 7;
		let shown = b.net.visual(1 / 60);
		assert.equal(shown.players[0].x, 13);
		assert.equal(
			shown.crawlers[0].body[0].x,
			b.net.state.crawlers[0].body[0].x,
		);
		b.net.state.garden = 1;
		b.net.state.players[0].x = 12.5;
		shown = b.net.visual(1 / 60);
		assert.equal(shown.players[0].x, 12.5);
		b.net.state.status = "victory";
		b.net.state.players[0].x = 12;
		assert.equal(b.net.visual(1 / 60).players[0].x, 12);
	});
	await test("time-up finishes once with shared real scores and complete tied standings", async () => {
		const n = network(true),
			a = await n.peer(-1);
		await n.peer(0);
		await n.peer(1);
		n.start();
		a.net.state.score = 42;
		a.handlers.get("time-up")({ graceMs: 500 });
		a.handlers.get("time-up")({ graceMs: 500 });
		assert.equal(a.finishes.length, 1);
		assert.deepEqual(JSON.parse(JSON.stringify(a.finishes[0].standings)), [
			[0, 1],
		]);
		assert.equal(a.finishes[0].scores[0], 42);
		assert.equal(a.finishes[0].scores[1], 42);
		assert.equal(a.finishes[0].won, false);
		a.handlers.get("message")({ t: "p", r: 1, g: 0, id: "0-9" }, 1);
		assert(
			a.sends.some((s) => s.data.t === "a" && s.data.result === "rejected"),
		);
	});
	await test("end stops simulation, outgoing traffic, input and pending actions", async () => {
		const n = network(),
			a = await n.peer(0),
			b = await n.peer(1);
		n.start();
		n.step(10);
		for (const p of [a, b]) p.handlers.get("end")({ reason: "finished" });
		const tick = a.net.state.tick,
			sent = n.all.length;
		n.step(60);
		a.net.update(0.25, { plant: true, dir: [1, 0] });
		b.net.update(0.25, { plant: true, dir: [1, 0] });
		assert.equal(a.net.state.tick, tick);
		assert.equal(n.all.length, sent);
		assert(a.ended && b.ended);
		assert.equal(b.net.pendingActions.size, 0);
	});
	await test("all gardens produce valid payloads below the protocol hard limit", async () => {
		const n = network(),
			a = await n.peer(0);
		await n.peer(1);
		n.start();
		for (let g = 0; g < 5; g++) {
			a.net.state = a.context.GardenSim.create({ garden: g, players: 2 });
			n.step(8);
		}
		assert(a.net.stats.maxBytes < 16384);
		assert(a.net.stats.maxBytes > 0);
	});
	console.log(`${passed} passed, ${failed} failed (network)`);
	process.exitCode = failed ? 1 : 0;
})();
