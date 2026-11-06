import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const files = [
	"vendor/engine/my-3d2dge.js",
	"src/content/content.js",
	"src/sim/sim.js",
	"src/sim/pilot.js",
	"src/net/net.js",
];
const sources = await Promise.all(
	files.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")),
);
// Fixed pre-round content fixtures. MOON's 99 fixture includes actual break/replacement
// rather than finishing while repeatedly renewing a nearly worn-out tool.
export const HUB_EXPEDITION_SEEDS = Object.freeze([1932735283, 99, 1932735283]);

export async function runHubExpedition({
	route = 0,
	limit = 900,
	server = false,
	seed = HUB_EXPEDITION_SEEDS[route],
} = {}) {
	let wall = 0,
		rng = 1982,
		losses = 0;
	const random = () => {
		rng = (Math.imul(rng, 1664525) + 1013904223) | 0;
		return (rng >>> 0) / 4294967296;
	};
	const roster = [
		{ id: 0, name: "Puddles", color: "#e8443a" },
		{ id: 1, name: "Partner", color: "#3b82f6" },
	];
	const messages = [],
		copies = [],
		finishes = [],
		reliableAt = new Map(),
		timers = new Map(),
		observedChambers = new Map();
	let nextTimer = 1;
	const hostId = server ? -1 : 0;
	const idle = () => ({ mx: 0, my: 0, aim: 0 });
	for (const id of server ? [-1, 0, 1] : [0, 1]) {
		const callbacks = new Map();
		const hub = {
			me: id,
			host: hostId,
			isHost: id === hostId,
			server: id === -1,
			players: roster,
			limitMs: limit * 1000,
			connect: async () => ({ players: roster }),
			ready() {},
			time: () => wall - 3000,
			rng: () => () => ((seed >>> 0) + 0.125) / 4294967296,
			on(type, callback) {
				callbacks.set(type, callback);
				return () => callbacks.delete(type);
			},
			send(packet, options) {
				if (!options.reliable && random() < 0.05) {
					losses++;
					return true;
				}
				let at = wall + 150 + random() * 100 - 50;
				if (options.reliable) {
					at = Math.max(at, (reliableAt.get(id) || 0) + 0.001);
					reliableAt.set(id, at);
				}
				const recipients =
					options.to == null
						? (server ? [-1, 0, 1] : [0, 1]).filter((to) => to !== id)
						: [options.to];
				for (const to of recipients)
					messages.push({ to, from: id, packet: structuredClone(packet), at });
				return true;
			},
			finish(result) {
				finishes.push(result);
				for (const copy of copies)
					copy.callbacks.get("end")?.({ reason: "finished" });
			},
		};
		const ctx = vm.createContext({
			console,
			AIHub: hub,
			performance: { now: () => wall },
			TextEncoder,
			setInterval: (callback) => {
				const timer = nextTimer++;
				timers.set(timer, callback);
				return timer;
			},
			clearInterval: (timer) => timers.delete(timer),
		});
		for (let i = 0; i < files.length; i++)
			vm.runInContext(sources[i], ctx, { filename: files[i] });
		const net = new ctx.PP.Net({
			createSim: (options) => new ctx.PP.Sim(options),
		});
		copies.push({ net, callbacks, ctx, id });
		await net.connect();
		callbacks.get("start")({ in: 3000 });
	}
	try {
		for (
			let frame = 0;
			frame < (limit + 4) * 120 && !finishes.length;
			frame++
		) {
			wall = (frame + 1) * (1000 / 120);
			messages.sort((a, b) => a.at - b.at);
			while (messages.length && messages[0].at <= wall) {
				const message = messages.shift();
				copies
					.find((copy) => copy.id === message.to)
					.callbacks.get("message")?.(message.packet, message.from);
			}
			for (const callback of [...timers.values()]) callback();
			for (const copy of copies)
				if (copy.id !== -1)
					copy.net.tick(
						1 / 120,
						copy.ctx.PP.pilot(copy.net.sim, copy.id, route) || idle(),
					);
			const mine = copies[0].net.sim;
			if (!observedChambers.has(mine.chamber))
				observedChambers.set(mine.chamber, {
					chamber: mine.chamber,
					route: mine.route,
					gaps: mine.room.floors.slice(1).map((floor) => floor.gaps),
					patterns: [...mine.room.patterns],
				});
		}
		const host = copies[0].net;
		const trace = host.sim.eventLog;
		assert.equal(
			finishes.length,
			1,
			`Route ${route}: expected one result, got ${JSON.stringify(host.sim.completed)}`,
		);
		assert.equal(
			finishes[0].won,
			true,
			`Route ${route}, seed ${host.sim.seed}: online expedition failed (${JSON.stringify(host.sim.completed)}), chamber ${host.sim.chamber}, miners ${JSON.stringify(host.sim.miners.map((m) => ({ id: m.id, hp: m.health, down: m.downed, x: m.hero.x, z: m.hero.z, tool: m.tool })))}, latest events ${JSON.stringify(trace.slice(-12).map((e) => ({ type: e.type, miner: e.miner, x: e.x, z: e.z })))}`,
		);
		assert(
			host.sim.chamber === 2 &&
				host.sim.online &&
				!host.sim.invincible &&
				!host.sim.developer &&
				!host.sim.attract,
			"Extraction must follow all three chambers with ordinary online rules and no developer/attract assistance",
		);
		assert(
			trace.some((event) => event.type === "keyCollect"),
			"Key collection must occur",
		);
		assert(
			host.hub.time() < host.hub.limitMs - 30000,
			"Successful expedition must retain a meaningful wall-clock margin",
		);
		assert(losses > 0, "Fault profile must actually lose packets");
		if (server)
			assert.equal(
				host.localId,
				null,
				"Hidden authority must never own a miner",
			);
		assert.equal(
			trace
				.filter((event) => event.type === "chamber")
				.map((event) => event.chamber)
				.join(","),
			"0,1,2",
			"All chambers must be entered in order",
		);
		assert.equal(
			trace.filter((event) => event.type === "unlock").length,
			3,
			"Exactly three keyed door interactions must occur",
		);
		assert(
			trace.some((event) => event.type === "wave" && event.wave === 2) &&
				trace.some((event) => event.type === "wave" && event.wave === 3),
			"Finale must advance through the authored extraction waves",
		);
		assert(
			trace.findIndex((event) => event.type === "toolBreak") <
				trace.findLastIndex((event) => event.type === "pickCollect"),
			"A broken pick must be replaced during real play",
		);
		assert(
			trace.some((event) => event.type === "collision"),
			"Ore collisions must happen in the complete run",
		);
		assert.equal(
			new Set(trace.map((event) => event.id)).size,
			trace.length,
			"Feature events must retain unique IDs across chamber epochs",
		);
		assert(
			trace.some((event) => event.type === "redirect" && event.aim < -0.25) &&
				trace.some((event) => event.type === "redirect" && event.aim > 0.25),
			"Genuine timed high and low redirect contacts must both occur during ordinary online play",
		);
		const number = (type) =>
			trace.filter((event) => event.type === type).length;
		const features = {
			oreBroken: number("shatter"),
			collisions: number("collision"),
			redirects: number("redirect"),
			highRedirects: trace.filter(
				(event) => event.type === "redirect" && event.aim < -0.25,
			).length,
			lowRedirects: trace.filter(
				(event) => event.type === "redirect" && event.aim > 0.25,
			).length,
			toolBreaks: number("toolBreak"),
			replacements: number("pickCollect"),
			keys: number("keyCollect"),
			unlocks: number("unlock"),
			hurts: number("hurt"),
			rescues: number("rescue"),
			waves: trace
				.filter((event) => event.type === "wave")
				.map((event) => event.wave),
		};
		return {
			count: server ? 14 : 13,
			route,
			server,
			seed: host.sim.seed,
			seconds: wall / 1000 - 3,
			score: host.sim.score,
			losses,
			rooms: [...observedChambers.values()],
			features,
			events: [...new Set(trace.map((event) => event.type))],
		};
	} finally {
		for (const copy of copies) copy.net.dispose();
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		console.log(
			JSON.stringify(
				await runHubExpedition({
					route: Number(process.argv[2] || 0),
					server: process.argv.includes("--server"),
				}),
			),
		);
	} catch (error) {
		console.error(error.stack);
		process.exitCode = 1;
	}
}
