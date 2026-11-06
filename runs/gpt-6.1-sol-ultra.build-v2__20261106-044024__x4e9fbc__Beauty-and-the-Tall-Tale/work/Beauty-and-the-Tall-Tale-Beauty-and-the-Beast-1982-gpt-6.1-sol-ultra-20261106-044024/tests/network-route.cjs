"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
require("../src/network.js");
require("../content/tower.js");
require("../src/simulation.js");
const TT = globalThis.TallTale;

function engine() {
	const context = { console };
	vm.createContext(context);
	vm.runInContext(
		fs.readFileSync(
			path.join(__dirname, "../vendor/engine-repo/dist/handoff/my-3d2dge.js"),
			"utf8",
		),
		context,
	);
	return context.My3D2dge;
}

function seeded(seed) {
	return () => {
		seed = (seed + 0x6d2b79f5) >>> 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

async function normalRoute(
	E,
	{
		latency = 0,
		jitter = 0,
		loss = 0,
		server = false,
		helperLeave = false,
	} = {},
) {
	const random = seeded(19);
	const hostId = server ? 2 : 0;
	const players = [
		{ id: 0, seat: 1, name: "Buford" },
		{ id: 1, seat: 2, name: "Pip" },
	];
	const hubs = new Map();
	const adapters = new Map();
	const queue = [];
	const outgoing = [];
	const finish = [];
	let now = 0;
	let departed = false;
	const incidents = [];
	let seenIncident = 0;
	let host;
	const make = (id) => {
		const handlers = new Map();
		const hub = {
			active: true,
			async connect() {
				return {
					me: id,
					host: hostId,
					isHost: id === hostId,
					server: server && id === hostId,
					players,
					seed: 1982,
				};
			},
			ready() {},
			probe() {},
			rng: (label) => seeded(label === "tower" ? 1982 : 543),
			time: () => now,
			on(type, fn) {
				const list = handlers.get(type) || [];
				list.push(fn);
				handlers.set(type, list);
				return () => list.splice(list.indexOf(fn), 1);
			},
			emit(type, ...args) {
				for (const fn of handlers.get(type) || []) fn(...args);
			},
			send(data, opts) {
				outgoing.push({
					id,
					at: now,
					bytes: JSON.stringify(data).length,
					reliable: opts.reliable,
				});
				if (!opts.reliable && random() < loss) return false;
				const at = now + latency + (random() - 0.5) * jitter * 2;
				for (const [to, target] of hubs)
					if (to !== id && (opts.to === undefined || opts.to === to))
						queue.push({
							at,
							from: id,
							target,
							data: JSON.parse(JSON.stringify(data)),
						});
				return true;
			},
			finish(outcome) {
				finish.push(outcome);
			},
		};
		hubs.set(id, hub);
		let jumpHoldUntil = 0;
		const net = new TT.Network({
			hub,
			create: (info, rng) =>
				new TT.Simulation(E, { players: info.players, seed: 1982, rng }),
			getIntent: () => {
				const delayed = id !== hostId || server;
				const command = host.sim.botIntent(id, {
					latency: delayed ? (latency + jitter) / 1000 + 1 / 12 : 1 / 12,
				});
				// A scripted player holds a jump for a human-readable 200 ms rather
				// than releasing a one-tick tap before its packet reaches authority.
				if (command.jumpPressed)
					jumpHoldUntil = Math.max(jumpHoldUntil, now + 200);
				if (now < jumpHoldUntil) command.jump = true;
				return command;
			},
		});
		adapters.set(id, net);
		return net;
	};
	host = make(hostId);
	for (const p of players) if (p.id !== hostId) make(p.id);
	for (const net of adapters.values()) await net.connect();
	for (const hub of hubs.values()) hub.emit("start");
	const flush = (all = false) => {
		queue.sort((a, b) => a.at - b.at);
		for (let i = 0; i < queue.length; ) {
			if (!all && queue[i].at > now) {
				i++;
				continue;
			}
			const p = queue.splice(i, 1)[0];
			p.target.emit("message", p.data, p.from);
		}
	};
	let n = 0;
	for (; n < 120 * 700 && !host.finished; n++) {
		now = (n / 120) * 1000;
		flush();
		for (const net of adapters.values()) net.update(1 / 120, now);
		for (const event of host.sim.events) {
			if (event.id > seenIncident && event.type === "hit")
				incidents.push({ ...event, at: now, section: host.sim.section });
			seenIncident = Math.max(seenIncident, event.id);
		}
		if (helperLeave && !departed && host.sim.section >= 1) {
			departed = true;
			for (const hub of hubs.values())
				hub.emit("leave", { id: 1, reason: "left" });
			adapters.get(1).dispose();
		}
	}
	flush(true);
	const outcome = host.sim.outcome();
	const snapshot = host.sim.snapshot();
	const detail = {
		incidents,
		seconds: n / 120,
		outcome,
		coverage: host.sim.coverage,
		finish,
		departed,
		actors: host.sim.actors.map((a) => ({
			id: a.id,
			x: a.x,
			z: a.z,
			hurt: a.hurt,
			power: a.power,
		})),
		diagnostics: [...adapters].map(([id, net]) => ({
			id,
			...net.diagnostics(),
		})),
		route: { latency, jitter, loss, server, helperLeave },
	};
	assert.equal(outcome.phase, "results", JSON.stringify(detail));
	assert.equal(outcome.rescued, true);
	assert.equal(host.sim.invulnerable, false);
	assert.equal(host.sim.unranked, false);
	assert.equal(finish.length, 1);
	assert.equal(finish[0].won, true);
	assert.deepEqual(finish[0].standings, [helperLeave ? [0] : [0, 1]]);
	for (const [id, net] of adapters) {
		if (helperLeave && id === 1) continue;
		assert.equal(net.sim.rescued, snapshot.rescued);
		assert.equal(net.sim.score, snapshot.score);
		assert.equal(net.sim.chances, snapshot.chances);
		assert.equal(net.sim.section, snapshot.section);
		assert.equal(net.sim.eventSerial, snapshot.eventSerial);
		assert.deepEqual(
			Object.keys(net.sim.ledger).sort(),
			Object.keys(host.sim.ledger).sort(),
		);
		assert(net.metrics.maxRoutineBytes <= 1200);
		assert.equal(net.metrics.postEndSends, 0);
	}
	for (const type of ["boulder", "bumper", "split", "rat", "bird", "bat"])
		assert(host.sim.coverage.seen[type] > 0, `unseen hazard ${type}`);
	assert(host.sim.coverage.hearts > 0);
	assert(host.sim.coverage.windows >= 12);
	return detail;
}

async function runNetworkRoutes() {
	const E = engine();
	const results = [];
	for (const [name, opts] of [
		["two-client normal-intention rescue", {}],
		["two-client degraded rescue", { latency: 150, jitter: 50, loss: 0.05 }],
		[
			"server-host rescue after helper leave",
			{ latency: 150, jitter: 50, loss: 0.05, server: true, helperLeave: true },
		],
	]) {
		try {
			results.push({ name, pass: true, detail: await normalRoute(E, opts) });
		} catch (error) {
			results.push({ name, pass: false, error: error.stack });
		}
	}
	fs.writeFileSync(
		path.join(__dirname, "../artifacts/network-routes.json"),
		JSON.stringify(results, null, 2),
	);
	return results;
}
module.exports = runNetworkRoutes;
if (require.main === module)
	runNetworkRoutes().then((results) => {
		for (const c of results)
			if (!c.pass) process.stderr.write(`${c.name}\n${c.error}\n`);
		process.stdout.write(
			`${results.filter((c) => c.pass).length}/${results.length} network rescue routes passed\n`,
		);
		if (results.some((c) => !c.pass)) process.exitCode = 1;
	});
