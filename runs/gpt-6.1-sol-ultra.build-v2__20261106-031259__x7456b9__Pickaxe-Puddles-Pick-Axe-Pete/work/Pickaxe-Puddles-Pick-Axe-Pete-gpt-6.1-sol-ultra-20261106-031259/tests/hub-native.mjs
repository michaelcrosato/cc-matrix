import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const filenames = [
	"vendor/engine/my-3d2dge.js",
	"src/content/content.js",
	"src/sim/sim.js",
	"src/net/net.js",
];
const sources = await Promise.all(
	filenames.map((name) =>
		readFile(new URL(`../${name}`, import.meta.url), "utf8"),
	),
);

export async function runHubNative() {
	let time = 0,
		rng = 12345,
		unreliable = 0,
		lost = 0;
	const random = () => {
		rng = (Math.imul(rng, 1664525) + 1013904223) | 0;
		return (rng >>> 0) / 4294967296;
	};
	const pending = [],
		worlds = [],
		finishes = [],
		lastReliable = [0, 0];
	const players = [
		{ id: 0, name: "Puddles", color: "#e8443a" },
		{ id: 1, name: "Partner", color: "#3b82f6" },
	];
	function copy(me) {
		const callbacks = new Map();
		const hub = {
			me,
			host: 0,
			isHost: me === 0,
			server: false,
			limitMs: 900000,
			players,
			time: () => time - 3000,
			connect: async () => ({ players }),
			ready() {},
			rng: () => () => 0.45,
			on(event, callback) {
				callbacks.set(event, callback);
				return () => callbacks.delete(event);
			},
			send(packet, options) {
				if (options.reliable === false) {
					unreliable++;
					if (random() < 0.05) {
						lost++;
						return true;
					}
				}
				let at = time + 150 + (random() * 100 - 50);
				if (options.reliable !== false) {
					at = Math.max(at, lastReliable[me] + 0.001);
					lastReliable[me] = at;
				}
				pending.push({
					to: me === 0 ? 1 : 0,
					from: me,
					packet: structuredClone(packet),
					at,
				});
				return true;
			},
			finish(outcome) {
				finishes.push(outcome);
			},
		};
		const ctx = vm.createContext({
			console,
			AIHub: hub,
			TextEncoder,
			performance: { now: () => time },
			setInterval,
			clearInterval,
		});
		for (let i = 0; i < sources.length; i++)
			vm.runInContext(sources[i], ctx, { filename: filenames[i] });
		let nativeSteps = 0;
		const net = new ctx.PP.Net({
			createSim: (options) => {
				const sim = new ctx.PP.Sim(options),
					step = sim.step.bind(sim);
				sim.step = (...args) => {
					nativeSteps++;
					return step(...args);
				};
				return sim;
			},
		});
		return { net, callbacks, steps: () => nativeSteps };
	}
	try {
		worlds.push(copy(0), copy(1));
		for (const w of worlds) {
			await w.net.connect();
			w.callbacks.get("start")({ in: 3000 });
		}
		const idle = { mx: 0, my: 0, aim: 0 };
		let moved = false,
			jumped = false,
			immediate = false,
			checkedImmediate = false;
		for (let frame = 0; frame < 1800; frame++) {
			time = (frame + 1) * (1000 / 120);
			pending.sort((a, b) => a.at - b.at);
			while (pending.length && pending[0].at <= time) {
				const packet = pending.shift();
				worlds[packet.to].callbacks.get("message")?.(
					packet.packet,
					packet.from,
				);
			}
			const input =
				time > 5500 && time < 7000 ? { ...idle, mx: 1 } : { ...idle };
			if (frame === 925) {
				input.jump = true;
				input.jumpHeld = true;
			}
			const beforePeerX = worlds[1].net.sim.miners.find((p) => p.id === 1).hero
				.x;
			const beforeHostX = worlds[0].net.sim.miners.find((p) => p.id === 1).hero
				.x;
			worlds[0].net.tick(1 / 120, idle);
			worlds[1].net.tick(1 / 120, input);
			if (input.mx && !checkedImmediate) {
				checkedImmediate = true;
				immediate =
					worlds[1].net.sim.miners.find((p) => p.id === 1).hero.x >
						beforePeerX &&
					worlds[0].net.sim.miners.find((p) => p.id === 1).hero.x ===
						beforeHostX;
			}
			const remote = worlds[0].net.sim.miners.find((p) => p.id === 1);
			if (remote.hero.x > 200) moved = true;
			if (
				worlds[0].net.sim.eventLog.some(
					(event) => event.type === "jump" && event.miner === 1,
				)
			)
				jumped = true;
		}
		const [host, peer] = worlds.map((w) => w.net);
		assert(
			moved,
			"Remote controls must move the real native Platformer on the authority",
		);
		assert(
			jumped,
			"A remote Jump edge must reach the real simulation despite delay/loss",
		);
		assert(
			immediate,
			"Local traversal must respond before the delayed authority receives its input",
		);
		assert(worlds[0].steps() > 1000, "Host must own fixed simulation steps");
		assert.equal(
			worlds[1].steps(),
			0,
			"A replica must never step the authoritative simulation",
		);
		assert(
			peer.stats.snapshots >= 15,
			"Replica must reconstruct native miners from reliable keyframes",
		);
		assert(
			host.stats.maxRate <= 13 && peer.stats.maxRate <= 13,
			"Combined message rates must stay below Hub limits",
		);
		assert(
			host.stats.maxBytes <= 16384 && peer.stats.maxBytes <= 16384,
			"All real-mine messages must fit the protocol bound",
		);
		assert(
			lost > 0 && unreliable > 100,
			"Fault profile must actually discard unreliable packets",
		);
		assert.equal(
			finishes.length,
			0,
			"Short transport test must not invent a win or finish",
		);
		host.sim.keyOwner = 1;
		worlds[0].callbacks.get("leave")({ id: 1, reason: "disconnected" });
		assert.equal(
			host.sim.keyOwner,
			null,
			"Departing native key carrier must release the shared key",
		);
		assert(
			host.sim.pickups.some((p) => p.kind === "key"),
			"Key recovery must create a reachable loose native key",
		);
		return 12;
	} finally {
		for (const world of worlds) world.net.dispose();
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		console.log(`${await runHubNative()} native Hub transport checks passed`);
	} catch (error) {
		console.error(error.stack);
		process.exitCode = 1;
	}
}
