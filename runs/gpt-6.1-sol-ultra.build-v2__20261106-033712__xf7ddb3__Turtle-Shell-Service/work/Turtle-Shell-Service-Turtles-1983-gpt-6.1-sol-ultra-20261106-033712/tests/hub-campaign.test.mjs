import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createBridge, createLocalNetwork } from "../vendor/hub/bridge.js";
import { createRound } from "../vendor/hub/round.js";
import "../vendor/engine/my-3d2dge.js";
import "../src/content.js";
import "../src/sim.js";
import "../src/bot.js";
import "../src/net.js";

const sessionSource = readFileSync(
	new URL("../vendor/hub/session.js", import.meta.url),
	"utf8",
);
const clone = (x) => JSON.parse(JSON.stringify(x));

function virtualClock() {
	let now = 0,
		serial = 0;
	const timers = new Map();
	const clock = {
		now: () => now,
		performance: { now: () => now },
		setTimeout(fn, ms = 0) {
			const id = ++serial;
			timers.set(id, { at: now + Math.max(0, ms), fn });
			return id;
		},
		clearTimeout(id) {
			timers.delete(id);
		},
		advance(ms) {
			const until = now + ms;
			let calls = 0;
			while (timers.size) {
				const next = [...timers].sort(
					(a, b) => a[1].at - b[1].at || a[0] - b[0],
				)[0];
				if (next[1].at > until) break;
				timers.delete(next[0]);
				now = next[1].at;
				next[1].fn();
				if (++calls > 100000) throw new Error("Virtual clock timer loop");
			}
			now = until;
		},
	};
	return clock;
}

export async function createHubCampaignRoom({
	dedicated = false,
	latency = 0,
	jitter = 0,
	loss = 0,
	seed = 47,
} = {}) {
	const clock = virtualClock();
	let rng = seed >>> 0;
	const random = () => {
		rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
		return rng / 4294967296;
	};
	const net = createLocalNetwork({ latency, jitter, loss, random, clock });
	const hubEndpoint = net.endpoint("hub");
	const warnings = [],
		issues = [],
		endpoints = [],
		cells = [];
	let status, record;
	const coordinator = createRound({
		round: 1,
		players: [
			{ key: "p0", slot: 0, name: "Red Fox" },
			{ key: "p1", slot: 1, name: "Blue Otter" },
		],
		hostKey: "p0",
		serverKey: dedicated ? "server" : null,
		mode: "shared-world",
		seed,
		limitMs: 900000,
		clock,
		gate: true,
		deliver: (key, m) => hubEndpoint.send(key, { k: "h", r: 1, m }),
		onStatus: (s) => {
			status = s;
		},
		onEnd: (r) => {
			record = r;
		},
	});
	hubEndpoint.onMessage((from, env) => {
		if (env.k === "c" && env.r === 1) coordinator.receive(from, env.m);
	});
	const keys = ["p0", "p1", ...(dedicated ? ["server"] : [])];
	const connecting = [];
	for (const key of keys) {
		const endpoint = net.endpoint(key);
		endpoints.push(endpoint);
		const listeners = [];
		let context;
		const bridge = createBridge({
			key,
			round: 1,
			coordinator: "hub",
			clock,
			net: endpoint,
			onIssue: (issue) => issues.push(issue),
			post: (msg) => {
				for (const fn of listeners)
					fn({
						source: context.parent,
						origin: "http://127.0.0.1",
						data: clone(msg),
					});
			},
		});
		endpoint.onMessage((from, env) => bridge.fromNet(from, env));
		context = {
			location: { search: "?aihub=1" },
			parent: { postMessage: (msg) => bridge.fromGame(clone(msg)) },
			console: {
				warn: (s) => warnings.push(s),
				log() {},
				error: (s) => warnings.push(s),
			},
			performance: clock.performance,
			setTimeout: clock.setTimeout,
			clearTimeout: clock.clearTimeout,
			addEventListener: (name, fn) => {
				if (name === "message") listeners.push(fn);
			},
		};
		context.window = context;
		vm.createContext(context);
		vm.runInContext(sessionSource, context, {
			filename: "vendor/hub/session.js",
		});
		const cell = {
			key,
			context,
			hub: context.AIHub,
			bridge,
			endpoint,
			ended: null,
		};
		cells.push(cell);
		connecting.push(cell.hub.connect({ mode: "shared-world", seats: [1, 2] }));
	}
	clock.advance(1500);
	const infos = await Promise.all(connecting);
	cells.forEach((cell, i) => {
		cell.network = new TSS.Network({
			hub: cell.hub,
			info: infos[i],
			createSimulation: (o) => new TSS.Simulation(o),
			onEnd: (d) => {
				cell.ended = d;
			},
		});
		cell.driver = Object.create(cell.network.sim);
		cell.bot = new TSS.Bot(cell.driver, {
			seats: cell.network.localSeat === null ? [] : [cell.network.localSeat],
		});
		cell.network.ready();
	});
	clock.advance(1500);
	assert.ok(cells.every((c) => c.network.readyCalled));
	coordinator.release();
	clock.advance(3500);
	const authority = cells.find((c) => c.network.isHost);
	// A coordinated test driver may inspect the authoritative debug state. It
	// still sends only legal seat intentions through each genuine client. The
	// reaction lead is routing/defensive caution, never a balance or world edit.
	const campaignBot = new TSS.Bot(authority.network.sim, {
		reactionLead: latency ? 0.45 : 0,
	});
	const room = {
		cells,
		authority,
		clock,
		coordinator,
		warnings,
		issues,
		get status() {
			return status;
		},
		get record() {
			return record;
		},
		removePlayer(key) {
			const cell = cells.find((c) => c.key === key);
			// The real harness removes the departed iframe and closes its endpoint.
			cell?.network.dispose();
			cell?.endpoint.close();
			coordinator.leave(key, "left");
		},
		step(seconds, { bots = true } = {}) {
			for (let i = 0; i < Math.round(seconds * 120); i++) {
				clock.advance(1000 / 120);
				const coordinated = bots ? campaignBot.intents() : {};
				for (const cell of cells) {
					let intent = { dir: -1, bomb: false, confirm: false };
					if (bots && cell.network.localSeat !== null) {
						intent = coordinated[cell.network.localSeat] || intent;
					}
					cell.network.update(1 / 120, intent);
				}
			}
		},
		close() {
			cells.forEach((c) => {
				c.network.dispose();
				c.endpoint.close();
			});
			hubEndpoint.close();
		},
	};
	return room;
}

export async function runHubCampaignTests({ full = true } = {}) {
	let count = 0;
	const failures = [],
		evidence = [];
	const test = async (name, fn) => {
		count++;
		try {
			await fn();
		} catch (e) {
			failures.push(`${name}: ${e.stack || e}`);
		}
	};

	await test("Actual Hub client, supplied bridge/round/network: dedicated host, leave, time-up and end cleanup", async () => {
		const room = await createHubCampaignRoom({
			dedicated: true,
			latency: 150,
			jitter: 50,
			loss: 0.05,
		});
		try {
			assert.equal(room.authority.network.localSeat, null);
			room.step(8);
			assert.ok(room.authority.network.sim.state.tick > 100);
			room.removePlayer("p1");
			room.step(0.6);
			assert.equal(
				room.authority.network.sim.state.players.find((p) => p.seat === 2)
					.active,
				false,
			);
			room.coordinator.timeUp();
			room.step(2, { bots: false });
			assert.equal(room.record?.status, "played");
			assert.equal(room.record?.won, false);
			assert.ok(
				room.cells.filter((c) => c.key !== "p1").every((c) => c.network.ended),
			);
			const sent = room.cells.map((c) => c.bridge.stats.sent);
			room.step(0.5);
			assert.deepEqual(
				room.cells.map((c) => c.bridge.stats.sent),
				sent,
			);
			assert.deepEqual(room.warnings, []);
			assert.deepEqual(room.issues, []);
			assert.deepEqual(room.status.issues, []);
		} finally {
			room.close();
		}
	});
	await test("Actual Hub client, supplied round: host loss voids without migration", async () => {
		const room = await createHubCampaignRoom();
		try {
			room.step(0.5);
			room.removePlayer("p0");
			room.step(0.5);
			assert.equal(room.record?.status, "void");
			assert.equal(room.record?.endReason, "host-left");
			assert.equal(room.cells[1].network.ended, true);
			assert.equal(room.cells[1].network.isHost, false);
		} finally {
			room.close();
		}
	});
	if (full) {
		const configs = [
			{ dedicated: false, latency: 0, jitter: 0, loss: 0, mustWin: true },
			{ dedicated: true, latency: 0, jitter: 0, loss: 0, mustWin: true },
			{ dedicated: true, latency: 150, jitter: 50, loss: 0.05, mustWin: false },
		];
		for (const config of configs) {
			await test(`Actual Hub shared-world campaign (${config.loss ? "dedicated stress,150±50ms,5%loss" : config.dedicated ? "dedicated host,26 rescues" : "player host,26 rescues"})`, async () => {
				const room = await createHubCampaignRoom(config);
				try {
					for (let i = 0; i < 900 && !room.record; i++) room.step(1);
					room.step(0.5, { bots: false });
					const state = room.authority.network.sim.state;
					evidence.push({
						...config,
						phase: state.phase,
						floor: state.floor,
						rescued: state.totalRescued,
						lives: state.lives,
						score: state.score,
						seconds: state.time,
						metrics: state.metrics,
						largestPacket: Math.max(
							...room.cells.map((c) => c.network.metrics.largestBytes),
						),
						result: room.record,
					});
					if (config.mustWin) {
						assert.equal(
							state.phase,
							"won",
							JSON.stringify({
								phase: state.phase,
								floor: state.floor,
								rescued: state.totalRescued,
								lives: state.lives,
								metrics: state.metrics,
							}),
						);
						assert.equal(state.totalRescued, 26);
						assert.ok(state.lives > 0);
					} else {
						// Packet loss is a world/lifecycle stress case, not a demand that a
						// scripted player never loses. Both real copies must agree on the
						// accepted team outcome and preserve substantial campaign progress.
						assert.ok(state.phase === "won" || state.phase === "lost");
						assert.ok(state.totalRescued >= 15);
						assert.ok(state.floor >= 3);
					}
					assert.equal(state.practice, false);
					assert.equal(state.demo, false);
					assert.equal(room.record?.status, "played");
					assert.equal(room.record?.won, state.phase === "won");
					assert.ok(room.cells.every((c) => c.network.ended));
					for (const c of room.cells) {
						const remote = c.network.sim.state;
						assert.equal(remote.totalRescued, state.totalRescued);
						assert.equal(remote.score, state.score);
						assert.equal(remote.floor, state.floor);
					}
					assert.deepEqual(room.warnings, []);
					assert.deepEqual(room.issues, []);
					assert.deepEqual(room.status.issues, []);
					assert.equal(room.authority.network.metrics.finish, 1);
				} finally {
					room.close();
				}
			});
		}
	}
	return { count, failures, evidence };
}

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	const result = await runHubCampaignTests({
		full: !process.argv.includes("--quick"),
	});
	writeFileSync(
		new URL("../build/hub-campaign-results.json", import.meta.url),
		JSON.stringify(result, null, 2),
	);
	if (process.argv.includes("--evidence"))
		console.error(JSON.stringify(result.evidence));
	result.failures.forEach((f) => console.error(f));
	console.log(
		`${result.count - result.failures.length}/${result.count} Hub campaign checks passed`,
	);
	if (result.failures.length) process.exitCode = 1;
}
