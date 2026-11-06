import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

/** Pure content and production-geometry checks; the orchestrator owns all output. */
export async function run() {
	const context = vm.createContext({ console });
	for (const path of [
		"src/config.js",
		"src/content/campaign.js",
		"src/sim/geometry.js",
	])
		vm.runInContext(
			readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
			context,
			{ filename: path },
		);
	const { Content: content, Geometry: geometry, TILE } = context.NM;
	let count = 0;
	const check = (value, message) => {
		assert.ok(value, message);
		count++;
	};
	const report = content.validate();
	check(report.valid, report.errors.join("\n"));
	check(
		report.chambers === 29,
		"The campaign has exactly 29 meaningful chambers",
	);
	check(content.caves.length === 5, "Four delves include two summit wings");
	check(
		content.landmarks.length === 9,
		"Compact wilderness has nine landmarks",
	);
	check(
		content.caves.map((c) => c.reward).join(",") === "axe,boat,key,dawn,dusk",
		"Progression chain and relic halves are authored in order",
	);
	check(
		content.caves.flatMap((c) => c.rooms).filter((r) => r.kind === "optional")
			.length === 3,
		"Three optional authored supply/treasure alcoves",
	);
	const encountered = new Set();
	for (const cave of content.caves) {
		const level = geometry.compile(cave);
		const distances = geometry.field(
			level,
			cave.spawn[0] * TILE,
			cave.spawn[1] * TILE,
		);
		for (const [label, point] of [
			["exit", cave.exit],
			...cave.safeAnchors.map((p, i) => [`safe anchor ${i}`, p]),
		]) {
			check(
				geometry.validCircle(level, point[0] * TILE, point[1] * TILE),
				`${cave.id}: ${label} is safe for an actor`,
			);
			check(
				distances[Math.floor(point[1]) * cave.width + Math.floor(point[0])] >=
					0,
				`${cave.id}: ${label} is physically reachable from entry`,
			);
		}
		for (const record of [...cave.enemies, ...cave.supplies, ...cave.tools]) {
			check(
				distances[Math.floor(record.y) * cave.width + Math.floor(record.x)] >=
					0,
				`${record.id}: reachable authored entity`,
			);
		}
		for (const room of cave.rooms) {
			const cx = Math.floor(room.x + room.w / 2),
				cy = Math.floor(room.y + room.h / 2);
			check(
				distances[cy * cave.width + cx] >= 0,
				`${room.id}: real floor graph reaches the chamber`,
			);
		}
		for (const e of cave.enemies)
			if (cave.criticalPath.includes(e.room)) encountered.add(e.type);
		check(
			cave.checkpoints.every(
				(cp) =>
					cp.reachableSupplyIds.reduce(
						(n, id) => n + cave.supplies.find((s) => s.id === id).amount,
						0,
					) >=
					cp.remainingDamage + 3,
			),
			`${cave.id}: every checkpoint has reserve ammunition beyond mandatory wounds`,
		);
		const firstRequiredGuard = cave.enemies.find((e) =>
			cave.guardIds.includes(e.id),
		);
		check(
			firstRequiredGuard &&
				geometry.path(
					level,
					cave.spawn[0] * TILE,
					cave.spawn[1] * TILE,
					firstRequiredGuard.x * TILE,
					firstRequiredGuard.y * TILE,
				).length > 0,
			`${cave.id}: required guard accessible to a solo ranger`,
		);
	}
	for (const type of [
		"rat",
		"snake",
		"bat",
		"spider",
		"ooze",
		"drake",
		"guardian1",
		"guardian2",
		"target",
	])
		check(encountered.has(type), `${type} appears on the critical route`);
	const lesson = content.caves[1],
		level = geometry.compile(lesson);
	const target = lesson.enemies.find((e) => e.type === "target");
	const impact = geometry.sweep(
		level,
		lesson.spawn[0] * TILE,
		lesson.spawn[1] * TILE,
		200,
		0,
	);
	check(
		impact?.edge.id === "root-lesson-bank",
		"Due-east introductory shot reaches the authored diagonal bank first",
	);
	const dot = impact.nx * 200;
	const rx = 200 - 2 * dot * impact.nx,
		ry = -2 * dot * impact.ny;
	check(
		Math.abs(rx) < 1e-7 && ry > 0,
		"Diagonal stone turns eastward flight south",
	);
	const targetHit = geometry.segmentCircle(
		impact.x,
		impact.y + 0.01,
		rx,
		ry,
		target.x * TILE,
		target.y * TILE,
		content.enemyDefs.target.radius,
	);
	check(
		targetHit !== null,
		"The mandatory bank lesson reaches its harmless target with an honest reflected shot",
	);
	check(
		lesson.guardIds.includes(target.id) && content.enemyDefs.target.bankOnly,
		"Exit requires completion of the safe bank lesson",
	);
	check(
		content.enemyDefs.ooze.indestructible &&
			content.enemyDefs.ooze.speed < content.enemyDefs.rat.speed,
		"Ooze is visibly slow and indestructible",
	);
	check(
		content.caves[2].passages.some(
			(p) => p.from === "cistern-wharf" && p.to === "cistern-loop",
		),
		"Ooze lesson has an authored alternate route",
	);
	const template = JSON.stringify({
		caves: content.caves,
		landmarks: content.landmarks,
		routes: content.routes,
		enemyDefs: content.enemyDefs,
	});
	const rejects = (mutate, message) => {
		const candidate = JSON.parse(template);
		mutate(candidate);
		check(!content.validate(candidate).valid, message);
	};
	rejects((c) => {
		c.caves[0].rooms[1].id = c.caves[0].rooms[0].id;
	}, "Duplicate IDs are rejected");
	rejects((c) => {
		c.caves[0].spawn = [0, 0];
	}, "Unsafe spawn rejected");
	rejects((c) => {
		c.caves[0].passages = [];
	}, "Disconnected authored chambers rejected");
	rejects((c) => {
		c.caves[1].banks[0].bx = c.caves[1].banks[0].ax;
		c.caves[1].banks[0].by = c.caves[1].banks[0].ay;
	}, "Degenerate bank rejected");
	rejects((c) => {
		c.caves[4].checkpoints[0].reachableSupplyIds = [];
	}, "Zero-ammo guardian restart supply failure rejected");
	rejects((c) => {
		c.caves[0].tools = [];
	}, "Missing progression tool rejected");
	rejects((c) => {
		c.caves[0].enemies[0].type = "unwritten";
	}, "Unimplemented enemy archetype rejected");
	rejects((c) => {
		c.routes[0].requires = "key";
	}, "Tool behind its own gate rejected");
	rejects((c) => {
		c.caves[3].guardIds.push("not-a-guardian");
	}, "Unknown guard lock rejected");
	return count;
}
