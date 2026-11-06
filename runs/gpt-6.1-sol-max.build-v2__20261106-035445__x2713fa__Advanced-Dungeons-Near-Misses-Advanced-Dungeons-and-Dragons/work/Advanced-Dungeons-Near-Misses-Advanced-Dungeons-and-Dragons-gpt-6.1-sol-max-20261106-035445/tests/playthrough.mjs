import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

/** Honest director: production commands + fixed stepping. Never writes simulation state. */
export function createDirector() {
	const context = vm.createContext({ console });
	for (const path of [
		"src/config.js",
		"src/content/campaign.js",
		"src/sim/geometry.js",
		"src/sim/simulation.js",
	])
		vm.runInContext(
			readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
			context,
			{ filename: path },
		);
	const N = context.NM;
	const sim = new N.Sim({ seed: 1982 });
	const dt = 1 / 120;
	let seq = 0,
		fire = 0,
		dodge = 0,
		interact = 0,
		actions = 0;
	const observed = new Map();
	const report = {
		sections: [],
		deaths: 0,
		restarts: 0,
		simulatedSeconds: 0,
		shots: 0,
		banks: 0,
		recovered: 0,
		actions: 0,
	};
	const hero = () => sim.state.players[0];
	function input({
		mx = 0,
		my = 0,
		ax = Math.cos(hero().angle),
		ay = Math.sin(hero().angle),
		shot = false,
		evade = false,
		use = false,
		sprint = false,
		focus = false,
	} = {}) {
		sim.command(1, {
			mx,
			my,
			ax,
			ay,
			sprint,
			focus,
			seq: ++seq,
			epoch: 1,
			fireId: shot ? ++fire : fire,
			dodgeId: evade ? ++dodge : dodge,
			interactId: use ? ++interact : interact,
		});
		sim.step(dt);
		actions++;
		if (sim.state.mode === "defeat")
			throw new Error(
				`Director expedition defeated in ${sim.level.data.id}: ${JSON.stringify(sim.state.stats)}`,
			);
	}
	function wait(seconds, options = {}) {
		for (let i = 0; i < seconds / dt; i++) input(options);
	}
	function aim(enemy) {
		const previous = observed.get(enemy.id);
		const age = previous ? sim.state.time - previous.time : 0;
		const vx = age > 0 && age < 0.1 ? (enemy.x - previous.x) / age : 0;
		const vy = age > 0 && age < 0.1 ? (enemy.y - previous.y) / age : 0;
		const flight =
			Math.hypot(enemy.x - hero().x, enemy.y - hero().y) /
				sim.config.arrowSpeed +
			sim.config.drawTime;
		observed.set(enemy.id, { x: enemy.x, y: enemy.y, time: sim.state.time });
		const tx = enemy.x + vx * flight * 0.7,
			ty = enemy.y + vy * flight * 0.7;
		const distance = Math.hypot(tx - hero().x, ty - hero().y) || 1;
		return [(tx - hero().x) / distance, (ty - hero().y) / distance];
	}
	function threat() {
		const p = hero();
		return sim.state.enemies
			.filter(
				(e) =>
					e.hp > 0 &&
					e.type !== "ooze" &&
					e.type !== "target" &&
					sim.visible(e) &&
					N.Geometry.los(sim.level, p.x, p.y, e.x, e.y),
			)
			.sort(
				(a, b) =>
					Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
			)[0];
	}
	function goTo(
		tx,
		ty,
		{
			combat = true,
			tolerance = 2,
			maxSeconds = 110,
			stopAtModeChange = false,
		} = {},
	) {
		const startTime = sim.state.time,
			startingMode = sim.state.mode,
			cave = sim.state.caveIndex;
		let path = [],
			nextPath = 0,
			stalledAt = sim.state.time,
			lastX = hero().x,
			lastY = hero().y;
		while (Math.hypot(hero().x - tx, hero().y - ty) > tolerance) {
			if (
				stopAtModeChange &&
				(sim.state.mode !== startingMode || sim.state.caveIndex !== cave)
			)
				return;
			if (sim.state.time - startTime > maxSeconds)
				throw new Error(
					`Director navigation timed out in ${sim.level.data.id} to ${tx / 16},${ty / 16} from ${hero().x / 16},${hero().y / 16}; hp=${hero().hp}, ammo=${sim.state.party.ammo}`,
				);
			const p = hero();
			if (sim.state.time >= nextPath || !path.length) {
				path = N.Geometry.path(sim.level, p.x, p.y, tx, ty);
				nextPath = sim.state.time + 0.3;
			}
			while (path.length && Math.hypot(p.x - path[0][0], p.y - path[0][1]) < 4)
				path.shift();
			const directSteps = Math.ceil(Math.hypot(tx - p.x, ty - p.y) / 3);
			let directSafe = true;
			for (let i = 1; i <= directSteps; i++)
				if (
					!N.Geometry.validCircle(
						sim.level,
						p.x + ((tx - p.x) * i) / directSteps,
						p.y + ((ty - p.y) * i) / directSteps,
					)
				) {
					directSafe = false;
					break;
				}
			const point = directSafe ? [tx, ty] : path[0] || [tx, ty];
			const dx = point[0] - p.x,
				dy = point[1] - p.y,
				len = Math.hypot(dx, dy) || 1;
			let mx = dx / len,
				my = dy / len,
				ax = mx,
				ay = my,
				shot = false,
				evade = false;
			const e = combat ? threat() : null;
			if (e) {
				[ax, ay] = aim(e);
				const dist = Math.hypot(e.x - p.x, e.y - p.y);
				const guardian = e.type.startsWith("guardian");
				if (!p.draw && !p.recovery && sim.state.party.ammo > 0)
					shot =
						!guardian ||
						e.state === "recovering" ||
						(e.type === "guardian1" &&
							ax * Math.cos(e.angle) + ay * Math.sin(e.angle) > -0.25);
				if (e.state === "windup" && dist < 130) {
					const side =
						(p.x - e.x) * -Math.sin(e.angle) +
							(p.y - e.y) * Math.cos(e.angle) >=
						0
							? 1
							: -1;
					mx = -Math.sin(e.angle) * side;
					my = Math.cos(e.angle) * side;
					evade = p.dodge <= 0 && e.stateTime > 0.75;
				} else if (
					!guardian &&
					dist < 45 &&
					e.state !== "recovering" &&
					e.state !== "stunned"
				) {
					mx = -ax;
					my = -ay;
					evade = p.dodge <= 0 && e.state === "attacking";
				}
			}
			input({ mx, my, ax, ay, shot, evade });
			if (Math.hypot(p.x - lastX, p.y - lastY) > 6) {
				stalledAt = sim.state.time;
				lastX = p.x;
				lastY = p.y;
			}
			if (sim.state.time - stalledAt > 8)
				throw new Error(
					`Director stuck in ${sim.level.data.id} at ${p.x / 16},${p.y / 16} toward ${tx / 16},${ty / 16}`,
				);
		}
		input();
	}
	function visitTile(x, y, options) {
		goTo(x * N.TILE, y * N.TILE, options);
	}
	function fight(id, { maxSeconds = 80 } = {}) {
		const started = sim.state.time;
		const initial = sim.state.enemies.find((e) => e.id === id);
		if (!initial || initial.hp <= 0) return;
		// The room's center is known from the authored route. Enemy aiming is visible-only.
		const room = sim.level.data.rooms.find((r) => r.id === initial.room);
		const center = [(room.x + room.w / 2) * 16, (room.y + room.h / 2) * 16];
		while (sim.state.enemies.find((e) => e.id === id)?.hp > 0) {
			if (sim.state.time - started > maxSeconds) {
				const e = sim.state.enemies.find((e) => e.id === id);
				throw new Error(
					`Director fight timed out ${id}: ${JSON.stringify({ hp: e.hp, state: e.state, x: e.x / 16, y: e.y / 16, hero: [hero().x / 16, hero().y / 16], ammo: sim.state.party.ammo })}`,
				);
			}
			const p = hero(),
				e = sim.state.enemies.find((e) => e.id === id);
			if (!e) break;
			if (!sim.visible(e) || !N.Geometry.los(sim.level, p.x, p.y, e.x, e.y)) {
				const path = N.Geometry.path(sim.level, p.x, p.y, ...center);
				const target = path[0] || center,
					len = Math.hypot(target[0] - p.x, target[1] - p.y) || 1;
				input({ mx: (target[0] - p.x) / len, my: (target[1] - p.y) / len });
				continue;
			}
			const [ax, ay] = aim(e),
				dist = Math.hypot(e.x - p.x, e.y - p.y),
				guardian = e.type.startsWith("guardian");
			let mx = 0,
				my = 0;
			const shot =
				!p.draw &&
				!p.recovery &&
				sim.state.party.ammo > 0 &&
				(!guardian ||
					e.state === "recovering" ||
					(e.type === "guardian1" &&
						ax * Math.cos(e.angle) + ay * Math.sin(e.angle) > -0.25));
			let evade = false;
			if (
				guardian &&
				dist > 67 &&
				e.state !== "windup" &&
				e.state !== "attacking" &&
				e.state !== "recovering"
			) {
				mx = ax;
				my = ay;
			}
			if (e.state === "windup") {
				const side =
					(p.x - e.x) * -Math.sin(e.angle) + (p.y - e.y) * Math.cos(e.angle) >=
					0
						? 1
						: -1;
				const across = Math.abs(
					(p.x - e.x) * -Math.sin(e.angle) + (p.y - e.y) * Math.cos(e.angle),
				);
				if (across < 35) {
					mx = -Math.sin(e.angle) * side;
					my = Math.cos(e.angle) * side;
				}
				evade = p.dodge <= 0 && e.stateTime > 0.8 && across < 22;
			} else if (
				!guardian &&
				dist < 48 &&
				e.state !== "recovering" &&
				e.state !== "stunned"
			) {
				mx = -ax;
				my = -ay;
				evade = p.dodge <= 0 && e.state === "attacking";
			}
			input({ mx, my, ax, ay, shot, evade });
		}
		wait(0.4);
	}
	function suppliesBeforeGuard(cave) {
		for (const supply of cave.supplies.filter((s) => s.kind === "arrows")) {
			const record = sim.state.pickups.find((p) => p.id === supply.id);
			if (record?.amount > 0 && sim.state.party.ammo < 8)
				visitTile(supply.x, supply.y);
		}
	}
	function climb() {
		const cave = sim.level.data;
		visitTile(...cave.exit);
		input({ use: true });
		wait(1.3);
	}
	function finishSection() {
		const cave = sim.level.data;
		const start = sim.state.time;
		for (const roomId of cave.criticalPath) {
			const room = cave.rooms.find((r) => r.id === roomId);
			visitTile(room.x + room.w / 2, room.y + room.h / 2);
			for (const supply of cave.supplies.filter(
				(s) =>
					s.kind === "arrows" &&
					s.x >= room.x &&
					s.x < room.x + room.w &&
					s.y >= room.y &&
					s.y < room.y + room.h,
			))
				if (sim.state.party.ammo < 9) visitTile(supply.x, supply.y);
			for (const e of cave.enemies.filter(
				(e) => e.room === roomId && e.type !== "ooze" && e.type !== "target",
			))
				fight(e.id);
			for (const tool of cave.tools.filter(
				(t) =>
					t.x >= room.x &&
					t.x < room.x + room.w &&
					t.y >= room.y &&
					t.y < room.y + room.h,
			))
				visitTile(tool.x, tool.y);
		}
		for (const id of cave.guardIds)
			if (sim.state.enemies.find((e) => e.id === id)?.hp > 0) fight(id);
		for (const tool of cave.tools) visitTile(tool.x, tool.y);
		climb();
		report.sections.push({
			cave: cave.id,
			seconds: +(sim.state.time - start).toFixed(2),
			ammo: sim.state.party.ammo,
			reserves: sim.state.party.reserves,
		});
	}
	return {
		N,
		sim,
		report,
		hero,
		input,
		wait,
		visitTile,
		fight,
		finishSection,
		suppliesBeforeGuard,
		get actions() {
			return actions;
		},
	};
}

export async function run() {
	const d = createDirector(),
		{ sim, N } = d;
	let checks = 0;
	const check = (value, message) => {
		assert.ok(value, message);
		checks++;
	};
	check(
		sim.travel("chalk"),
		"Start the first delve through the production wilderness route",
	);
	d.visitTile(24.5, 8.5, { combat: false });
	d.input({ ax: 0, ay: -1, shot: true });
	// Step sideways during the bow anticipation; the return line passes the empty mark.
	for (let i = 0; i < 0.7 * 120; i++) d.input({ mx: -1, ax: 0, ay: -1 });
	d.wait(2.8);
	const missed = sim.state.pickups.find((a) => a.kind === "shaft");
	check(!!missed, "An honest safe missed shot settles recoverably");
	d.visitTile(missed.x / 16, missed.y / 16, { combat: false });
	check(
		sim.state.stats.recovered > 0,
		"The director retrieves its first missed arrow",
	);
	d.finishSection();
	check(
		sim.state.mode === "map" && sim.state.party.tools.includes("axe"),
		"Axe acquired and first guarded ladder cleared",
	);
	check(
		sim.travel("forest") && sim.travel("root"),
		"The axe opens the real forest route",
	);
	// Exact authored floor-mark lesson; the target is harmless and bank-only.
	d.visitTile(...N.Content.caves[1].spawn, { combat: false, tolerance: 0.7 });
	d.input({ ax: 1, ay: 0, shot: true });
	d.wait(1.4, { ax: 1, ay: 0 });
	check(
		sim.state.enemies.find((e) => e.type === "target").hp === 0,
		"Mandatory safe bell is hit through the production reflection simulation",
	);
	d.finishSection();
	check(
		sim.state.mode === "map" && sim.state.party.tools.includes("boat"),
		"Boat acquired and second guarded ladder cleared",
	);
	check(
		sim.travel("river") && sim.travel("cistern"),
		"Boat opens the real river crossing",
	);
	// A real miss, placed at a known stone, calls the indestructible listener away.
	d.visitTile(18.5, 9.5, { combat: false });
	const lureX = 35 * 16 - d.hero().x,
		lureY = 7 * 16 - d.hero().y;
	const lureLength = Math.hypot(lureX, lureY);
	d.input({ ax: lureX / lureLength, ay: lureY / lureLength, shot: true });
	d.wait(1.7, { ax: lureX / lureLength, ay: lureY / lureLength });
	const listener = sim.state.enemies.find((e) => e.type === "ooze");
	check(
		listener.heard && listener.state === "investigating",
		"The indestructible ooze investigates a production arrow-noise event",
	);
	check(
		Math.hypot(listener.targetX - d.hero().x, listener.targetY - d.hero().y) >
			100,
		"The ooze follows the distant impact rather than the archer's live position",
	);
	d.finishSection();
	check(
		sim.state.mode === "map" && sim.state.party.tools.includes("key"),
		"Key acquired and third guarded ladder cleared",
	);
	check(
		sim.travel("wall") && sim.travel("dawn"),
		"Key opens the real summit gate",
	);
	d.finishSection();
	check(
		sim.state.caveIndex === 4 && sim.state.party.halves.includes("dawn"),
		"First guardian defeated; fresh wing checkpoint entered",
	);
	d.finishSection();
	check(
		sim.state.mode === "victory",
		"A full standard-rules expedition reaches victory",
	);
	check(
		sim.state.party.halves.length === 2 && sim.state.party.cleared.length === 5,
		"Both relic halves and all five sections completed",
	);
	check(
		!sim.state.stats.assisted,
		"The director never uses developer assistance",
	);
	check(
		sim.state.stats.banks > 0 && sim.state.stats.recovered > 0,
		"Ricochet and recovery are demonstrated during the legitimate clear",
	);
	Object.assign(d.report, {
		deaths: sim.state.stats.deaths,
		restarts: sim.state.stats.restarts,
		simulatedSeconds: +sim.state.time.toFixed(2),
		shots: sim.state.stats.shots,
		banks: sim.state.stats.banks,
		recovered: sim.state.stats.recovered,
		actions: d.actions,
		tools: [...sim.state.party.tools],
		halves: [...sim.state.party.halves],
		assisted: sim.state.stats.assisted,
	});
	writeFileSync(
		new URL("../docs/playthrough-result.json", import.meta.url),
		JSON.stringify(d.report, null, 2),
	);
	return checks;
}
