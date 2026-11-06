import "../vendor/engine/my-3d2dge.js";
import { cell, key, reverse, same } from "../src/sim/maze.js";
import { STEP, World } from "../src/sim/world.js";

const memories = new WeakMap();

function dangerCost(world, point, hero, arrival = 0) {
	if (hero.invuln > arrival + 0.2) return 0;
	let risk = 0;
	const enemies = [
		...world.crawlers.map((c) => ({ m: c.m, head: true })),
		...world.sentries
			.filter((w) => w.spin <= 0 && world.s.fright <= arrival + 0.3)
			.map((w) => ({ m: w.m, head: false })),
	];
	for (const { m, head } of enemies) {
		const direct = Math.hypot(point[0] - m.x, point[1] - m.y),
			steps = world.graph.distance(point, cell(m));
		const safeRadius = head ? 1.1 : 1.3;
		if (direct < safeRadius) risk += (safeRadius - direct) * 35;
		if (steps < 3) risk += (3 - steps) * (head ? 2.5 : 3);
		const edge = world.graph.edge(cell(m), m.dir);
		if (edge && same(edge.b, point)) risk += head ? 18 : 14;
	}
	return risk;
}

function choose(world, hero, index, memory) {
	const graph = world.graph,
		m = hero.m;
	// Pick a cell ahead while halfway through an edge, leaving enough time to queue
	// the next legal turn. The simulated movement still uses the normal buffer.
	const origin = m.moving && m._u > 0.42 ? m._to : cell(m);
	const tails = world.crawlers
		.filter((c) => c.segments > 0)
		.map((c) => ({ crawler: c, tail: world.positions(c).at(-1) }));
	if (!tails.length) return { dir: null, stop: true };
	const selected = tails.reduce((best, item) => {
		const c = [Math.round(item.tail.x), Math.round(item.tail.y)],
			target = graph.nearest(c),
			d =
				graph.distance(origin, target) +
				(item.crawler.id === index % tails.length ? -0.6 : 0);
		return !best || d < best.d ? { ...item, target, d } : best;
	}, null);
	const target = selected.target;
	// Approach the tail from its travelled path, rather than cutting through a
	// permanently dangerous head to the same square.
	const costs = new Map([[key(origin), 0]]),
		first = new Map(),
		queue = [origin],
		visited = new Set();
	while (queue.length) {
		queue.sort(
			(a, b) =>
				costs.get(key(a)) +
				graph.distance(a, target) * 0.9 -
				(costs.get(key(b)) + graph.distance(b, target) * 0.9),
		);
		const from = queue.shift(),
			k = key(from);
		if (visited.has(k)) continue;
		visited.add(k);
		if (same(from, target)) break;
		for (const edge of graph.edges(from)) {
			const elapsed = (costs.get(k) || 0) / 5.2;
			const extra =
				1 +
				dangerCost(world, edge.b, hero, Math.min(elapsed, 0.7)) +
				(edge.wrap ? 0.03 : 0);
			const cost = costs.get(k) + extra,
				nk = key(edge.b);
			if (cost < (costs.get(nk) ?? Infinity)) {
				costs.set(nk, cost);
				first.set(nk, first.get(k) || edge.dir);
				queue.push(edge.b);
			}
		}
	}
	let dir = first.get(key(target));
	if (!dir) {
		// The target occupies our own cell. Continue along the tail's local tangent
		// while respecting hazards. This catches it without orbiting an empty cell.
		const edges = graph.edges(origin);
		edges.sort((a, b) => {
			const score = (e) =>
				graph.distance(e.b, cell(selected.crawler.m)) * -0.2 +
				dangerCost(world, e.b, hero) +
				Math.hypot(e.b[0] - selected.tail.x, e.b[1] - selected.tail.y) +
				(same(e.dir, m.dir) ? -0.2 : 0);
			return score(a) - score(b);
		});
		dir = edges[0]?.dir || null;
	}
	// A new opposite direction is an immediate reversal. Keep a decision for a few
	// physical ticks to suppress indecisive mid-cell oscillation around a target.
	if (
		memory.dir &&
		world.s.t - memory.changed < 0.16 &&
		same(dir, reverse(memory.dir))
	)
		dir = memory.dir;
	if (!same(dir, memory.dir)) {
		memory.dir = dir;
		memory.changed = world.s.t;
	}
	return { dir, plant: false };
}

function futureValue(world, base, commands, actorId) {
	const trial = Object.create(World.prototype);
	trial.restore(base);
	trial.graph = world.graph;
	const before = {
		hits: world.s.stats.hits,
		bites: world.s.stats.bites,
		catches: world.s.stats.catches,
	};
	for (let i = 0; i < 66 && trial.s.phase === "play"; i++)
		trial.step(STEP, commands);
	const hero = trial.players.find((p) => p.id === actorId);
	let value =
		(trial.s.stats.bites - before.bites) * 42 +
		(trial.s.stats.catches - before.catches) * 5 -
		(trial.s.stats.hits - before.hits) * 1200;
	if (trial.s.phase === "clear") return value + 300;
	if (hero.respawn > 0) value -= 500;
	const tails = trial.crawlers
		.filter((c) => c.segments > 0)
		.map((c) => trial.positions(c).at(-1));
	if (tails.length) {
		const at = [Math.round(hero.m.x), Math.round(hero.m.y)],
			nearest = trial.graph.nearest(at);
		value -=
			Math.min(
				...tails.map(
					(t) =>
						trial.graph.distance(
							nearest,
							trial.graph.nearest([Math.round(t.x), Math.round(t.y)]),
						) +
						0.2 * Math.hypot(hero.m.x - t.x, hero.m.y - t.y),
				),
			) * 1.5;
	}
	value -= dangerCost(trial, [hero.m.x, hero.m.y], hero) * 0.16;
	return value;
}

export function botCommands(world, options = {}) {
	let memory = memories.get(world);
	if (!memory || memory.level !== world.s.level || world.s.t < memory.time) {
		memory = {
			level: world.s.level,
			time: world.s.t,
			next: -1,
			heroes: new Map(),
			commands: {},
		};
		memories.set(world, memory);
	}
	memory.time = world.s.t;
	if (world.s.t < memory.next) return memory.commands;
	memory.next = world.s.t + 0.075;
	const commands = {};
	world.players.forEach((hero, index) => {
		if (!memory.heroes.has(hero.id))
			memory.heroes.set(hero.id, { dir: null, changed: -99 });
		commands[hero.id] =
			hero.respawn > 0
				? { dir: null }
				: choose(world, hero, index, memory.heroes.get(hero.id));
	});
	const imminent = world.players.some(
		(hero) =>
			hero.respawn <= 0 &&
			hero.invuln < 0.7 &&
			(world.crawlers.some(
				(c) => Math.hypot(c.m.x - hero.m.x, c.m.y - hero.m.y) < 4,
			) ||
				(world.s.fright < 0.7 &&
					world.sentries.some(
						(w) =>
							w.spin < 0.7 &&
							Math.hypot(w.m.x - hero.m.x, w.m.y - hero.m.y) < 4,
					))),
	);
	if (imminent && !options.simple) {
		const base = world.snapshot(false);
		for (const hero of world.players) {
			if (hero.respawn > 0) continue;
			const legal = [
				...world.graph.edges(cell(hero.m)),
				...(hero.m._to ? world.graph.edges(hero.m._to) : []),
			].map((e) => e.dir);
			const seen = new Set();
			let best = commands[hero.id],
				bestValue = futureValue(world, base, commands, hero.id) + 0.12;
			for (const direction of legal) {
				const k = direction ? key(direction) : "stop";
				if (seen.has(k)) continue;
				seen.add(k);
				const candidate = direction
					? { dir: direction, plant: false }
					: { dir: null, stop: true, plant: false };
				const trialCommands = { ...commands, [hero.id]: candidate };
				const value = futureValue(world, base, trialCommands, hero.id);
				if (value > bestValue) {
					bestValue = value;
					best = candidate;
				}
			}
			commands[hero.id] = best;
		}
	}
	memory.commands = commands;
	return commands;
}

export function runCampaign(
	players = 1,
	seed = 0x48b00,
	{ maxSeconds = 1200, record = false } = {},
) {
	const world = new World({ players, seed }),
		gardens = [],
		commands = [];
	let steps = 0;
	while (
		steps < maxSeconds / STEP &&
		world.s.phase !== "victory" &&
		world.s.phase !== "defeat"
	) {
		if (world.s.phase === "clear") {
			gardens.push({
				level: world.s.level,
				wave: world.s.wave || 0,
				seconds: +world.s.t.toFixed(2),
				score: world.s.score,
				lives: world.s.lives,
				bites: world.s.gardenStats.bites,
			});
			world.nextGarden();
			continue;
		}
		const command = botCommands(world);
		if (record) commands.push(command);
		world.step(STEP, command);
		steps++;
	}
	return {
		won: world.s.phase === "victory",
		phase: world.s.phase,
		players,
		seed,
		seconds: +world.s.totalTime.toFixed(2),
		score: world.s.score,
		lives: world.s.lives,
		stats: { ...world.s.stats },
		gardens,
		modified: world.s.modified,
		demo: world.s.demo,
		commands: record ? commands : undefined,
		world,
	};
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("/bot.mjs")) {
	for (const players of [1, 2]) {
		const result = runCampaign(players);
		delete result.world;
		delete result.commands;
		console.log(JSON.stringify(result));
	}
}
