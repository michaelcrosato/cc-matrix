import { fileURLToPath } from "node:url";
import {
	BEARINGS,
	DIFFICULTIES,
	LOADOUTS,
	MISSION,
	U,
	validateMission,
} from "../content/mission.js";
import {
	angle,
	BomberSim,
	bombIntegrate,
	localVector,
	predictBomb,
	segmentHit,
} from "../src/sim.js";

const DT = 1 / 120;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const copy = (x) => JSON.parse(JSON.stringify(x));

function advance(sim, seconds, control) {
	for (let i = 0; i < Math.ceil(seconds / DT) && !sim.state.result; i++) {
		if (control) control(sim, i);
		sim.step(DT);
	}
}

function airborne(options = {}) {
	const sim = new BomberSim(options),
		s = sim.state,
		a = s.aircraft;
	Object.assign(a, {
		x: 85000,
		y: 0,
		z: 900 * U,
		speed: 75 * U,
		yaw: 0,
		pitch: 0,
		bank: 0,
		throttle: 0.8,
		airborne: true,
		hold: false,
		holdMode: "course",
		gear: 0,
	});
	s.t = 50;
	s.phase = "outbound";
	sim.definition.encounters = [];
	return sim;
}

function lineUp(sim, target, offset = 0) {
	const s = sim.state,
		a = s.aircraft;
	const p = predictBomb(a, sim.wind());
	a.x += target.x - p.x + offset;
	a.y += target.y - p.y;
	s.phase = "strike";
	s.targets.find((t) => t.id === "battery").alive = false;
	sim.command(1, { type: "station", station: "bombs" });
	s.doorsOpen = true;
	a.doors = 1;
	sim.updatePrediction();
}

/** An observer bot submits real commands. It never edits sortie state/resources. */
export function playSortie(options = {}) {
	const sim = new BomberSim({ seed: 1942, ...options }),
		seenTypes = new Set(),
		phases = new Set(),
		encounters = new Set();
	let lastObserved = 0,
		releaseSent = false,
		evasiveUntil = 0,
		evasionSide = 1,
		restoredCourse = false,
		frame = 0;
	const beats = [];
	while (!sim.state.result && sim.state.t < 721 && frame++ < 120 * 723) {
		const s = sim.state,
			a = s.aircraft,
			player = s.players[0];
		for (const event of s.events)
			if (event.id > lastObserved) {
				lastObserved = Math.max(lastObserved, event.id);
				seenTypes.add(event.type);
				if (event.type === "fighter-spawn") encounters.add(event.bearing);
				if (event.type === "flak-warning" && !releaseSent && a.x < 302000) {
					evasiveUntil = s.t + sim.balance.flakWindow + 0.12;
					evasionSide *= -1;
					restoredCourse = false;
				}
			}
		if (!phases.has(s.phase)) {
			phases.add(s.phase);
			beats.push({
				phase: s.phase,
				t: Number(s.t.toFixed(2)),
				hull: Number(a.hull.toFixed(1)),
			});
		}
		if (a.fire && a.extinguishers)
			sim.command(1, {
				type: "extinguish",
				actionId: `bottle-${Math.floor(s.t)}`,
			});
		if (s.primary && s.route.target !== "home")
			sim.command(1, { type: "route", target: "home" });
		if (s.phase !== "landing" && s.t < evasiveUntil && !releaseSent) {
			if (player.station !== "pilot")
				sim.command(1, { type: "station", station: "pilot" });
			sim.command(1, {
				type: "controls",
				bank: evasionSide,
				pitch: 1,
				throttleDelta: 1,
			});
		} else if (!restoredCourse && evasiveUntil && !releaseSent) {
			sim.command(1, { type: "controls" });
			sim.command(1, { type: "route", target: "harbor" });
			restoredCourse = true;
		} else if (!s.primary && a.x > 300000 && s.bombsLeft) {
			if (player.station !== "bombs")
				sim.command(1, { type: "station", station: "bombs" });
			const target = s.targets.find((t) => t.primary && t.alive);
			if (
				target &&
				a.doors > 0.85 &&
				dist(s.prediction, target) < target.r * 0.55 &&
				!releaseSent
			) {
				releaseSent = sim.command(1, {
					type: "release",
					salvo: 2,
					actionId: "primary-salvo",
				});
			}
		} else if (s.phase !== "landing") {
			const enemy = s.enemies.find((e) => e.alive && e.phase !== "disengage");
			if (enemy) {
				if (player.station !== enemy.bearing)
					sim.command(1, { type: "station", station: enemy.bearing });
				const lead = dist(enemy, a) / (850 * U),
					x = enemy.x + (enemy.vx || 0) * lead - a.x,
					y = enemy.y + (enemy.vy || 0) * lead - a.y;
				sim.command(1, {
					type: "aim",
					yaw: angle(Math.atan2(y, x) - a.yaw - BEARINGS[enemy.bearing]),
					pitch: Math.atan2(
						enemy.z + (enemy.vz || 0) * lead - a.z,
						Math.hypot(x, y),
					),
				});
				sim.command(1, { type: "controls", fire: true });
			} else sim.command(1, { type: "controls" });
		}
		sim.step(DT);
	}
	phases.add(sim.state.phase);
	return {
		sim,
		seenTypes,
		phases,
		encounters,
		beats,
		frames: frame,
		releaseSent,
	};
}

export function runSimTests({ full = true } = {}) {
	let count = 0;
	const failures = [],
		details = [];
	let group = "";
	const check = (condition, name, extra = "") => {
		count++;
		if (!condition)
			failures.push(`${group}: ${name}${extra ? ` (${extra})` : ""}`);
	};
	const test = (name, fn) => {
		group = name;
		try {
			fn();
		} catch (error) {
			count++;
			failures.push(`${name}: unexpected ${error.stack || error}`);
		}
	};

	test("geometry and RNG", () => {
		const east = localVector(0, 1, 2, 3),
			south = localVector(Math.PI / 2, 1, 0);
		check(
			east.x === 1 &&
				east.y === 2 &&
				east.z === 3 &&
				Math.abs(south.y - 1) < 1e-9,
			"one z-up forward/right transform",
		);
		check(
			segmentHit(
				{ x: 0, y: 0, z: 0 },
				{ x: 10000, y: 0, z: 0 },
				{ x: 5000, y: 0, z: 0 },
				10,
			),
			"fast swept shot hits between endpoints",
		);
		check(
			!segmentHit(
				{ x: 0, y: 0, z: 0 },
				{ x: 10000, y: 0, z: 0 },
				{ x: 5000, y: 100, z: 0 },
				10,
			),
			"near swept shot misses",
		);
		const a = new BomberSim({ seed: 413 }),
			b = new BomberSim({ seed: 413 });
		advance(a, 5);
		advance(b, 5);
		check(
			JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()),
			"seeded simulation is deterministic",
		);
	});

	test("flight and resources", () => {
		const sim = new BomberSim();
		advance(sim, 30);
		check(
			sim.state.aircraft.airborne &&
				sim.state.aircraft.z > 1000 &&
				sim.state.phase === "outbound",
			"assisted takeoff and positive climb",
		);
		const low = airborne(),
			high = airborne();
		low.state.aircraft.throttle = 0.1;
		high.state.aircraft.throttle = 1;
		advance(low, 15);
		advance(high, 15);
		check(
			high.state.aircraft.fuel < low.state.aircraft.fuel &&
				high.state.aircraft.speed > low.state.aircraft.speed,
			"power trades fuel for speed",
		);
		const stalled = airborne(),
			a = stalled.state.aircraft;
		a.speed = 30 * U;
		a.throttle = 0.1;
		let sawStall = false;
		advance(stalled, 15, (s) => {
			s.command(1, { type: "controls", throttleDelta: 1 });
			sawStall ||= s.state.aircraft.stall;
		});
		check(
			sawStall && !a.stall && !stalled.state.result,
			"stall is warned and recoverable by increasing power",
		);
		const hold = airborne();
		Object.assign(hold.state.aircraft, {
			yaw: 0.4,
			holdYaw: 0.4,
			holdAlt: 900 * U,
			holdMode: "course",
		});
		hold.command(1, { type: "station", station: "nose" });
		const before = copy(hold.state.aircraft);
		advance(hold, 10);
		check(
			hold.state.aircraft.hold &&
				Math.abs(angle(hold.state.aircraft.yaw - before.yaw)) < 0.1 &&
				Math.abs(hold.state.aircraft.z - before.z) < 500,
			"leaving flight yields stable course hold",
		);
		hold.command(1, { type: "station", station: "pilot" });
		hold.command(1, { type: "controls", bank: 1 });
		hold.step(DT);
		check(!hold.state.aircraft.hold, "direct pilot input cancels hold");
		const healthy = airborne(),
			damaged = airborne();
		damaged.applySystem("engine");
		advance(healthy, 12);
		advance(damaged, 12);
		check(
			damaged.state.aircraft.speed < healthy.state.aircraft.speed &&
				damaged.state.aircraft.fuel < healthy.state.aircraft.fuel,
			"damaged engine lowers power and raises burn",
		);
		const light = new BomberSim({ loadout: "longrange" }),
			heavy = new BomberSim({ loadout: "heavy" });
		advance(light, 30);
		advance(heavy, 30);
		check(
			heavy.state.bombsLeft > light.state.bombsLeft &&
				heavy.state.aircraft.maxFuel < light.state.aircraft.maxFuel &&
				heavy.state.aircraft.speed < light.state.aircraft.speed,
			"payload presets have actual weight and fuel tradeoffs",
		);
	});

	test("ownership and commands", () => {
		const sim = airborne({ players: [1, 2] }),
			s = sim.state;
		check(
			!sim.command(2, { type: "route", target: "home" }),
			"noncommander cannot commit routes",
		);
		check(
			!sim.command(1, { type: "station", station: "nose" }),
			"occupied station requires handover",
		);
		check(
			sim.command(1, { type: "station", station: "nose", handover: true }) &&
				sim.owner(2).station === "pilot",
			"explicit handover exchanges seats",
		);
		check(
			s.owners.pilot === 2 && s.owners.nose === 1,
			"handover maintains unique station owners",
		);
		check(
			s.commandOwner === 2 &&
				sim.command(2, { type: "route", target: "harbor" }) &&
				!sim.command(1, { type: "route", target: "home" }),
			"displaced player receiving pilot immediately receives flight command",
		);
		sim.command(2, { type: "station", station: "pilot" });
		check(s.commandOwner === 2, "taking pilot transfers command");
		sim.command(2, { type: "station", station: "bombs" });
		check(
			s.commandOwner === 2 &&
				sim.command(2, { type: "route", target: "harbor" }),
			"commander retains route rights while looking at another station",
		);
		check(
			sim.command(2, { type: "controls", seq: 3, fire: true }) &&
				!sim.command(2, { type: "controls", seq: 3, fire: true }),
			"continuous packet sequence deduplicates",
		);
		sim.depart(2);
		check(
			s.owners.bombs === "AI" && s.commandOwner === 1 && !sim.controls[2],
			"departure restores AI, command and cleared held controls",
		);
		check(
			!sim.command(2, { type: "release" }),
			"departed sender cannot command",
		);
		check(
			!sim.command(1, { type: "aim", yaw: NaN, pitch: 0 }),
			"invalid aim rejected",
		);
		sim.command(1, { type: "aim", yaw: 200, pitch: -200 });
		check(
			sim.owner(1).aim.yaw <= 0.83 && sim.owner(1).aim.pitch >= -0.48,
			"remote aim clamps to mount arc",
		);
		const repeated = airborne();
		repeated.command(1, { type: "station", station: "bombs" });
		repeated.command(1, { type: "aim", yaw: 0.2, pitch: 0.1 });
		const historyLength = repeated.state.history.length;
		for (let i = 0; i < 100; i++)
			repeated.command(1, { type: "station", station: "bombs" });
		check(
			repeated.state.history.length === historyLength &&
				repeated.owner(1).aim.yaw === 0.2,
			"same station request preserves aim and cannot flood radio or transition events",
		);
	});

	test("bomb prediction and release", () => {
		const sim = airborne(),
			s = sim.state,
			a = s.aircraft,
			target = s.targets.find((t) => t.primary);
		lineUp(sim, target);
		const prediction = predictBomb(a, sim.wind()),
			b = {
				x: a.x,
				y: a.y,
				z: a.z - 24,
				vx: Math.cos(a.yaw) * a.speed,
				vy: Math.sin(a.yaw) * a.speed,
				vz: Math.sin(a.pitch) * a.speed,
			};
		while (b.z > 0) bombIntegrate(b, DT, sim.wind());
		check(
			dist(prediction, b) < 1e-5 && Math.abs(prediction.time - b.age) < 1e-8,
			"sight and actual bomb use identical integration",
		);
		s.doorsOpen = false;
		a.doors = 0;
		const inventory = s.bombsLeft;
		check(
			!sim.command(1, { type: "release", salvo: 1 }) &&
				s.bombsLeft === inventory,
			"closed doors deny release without charging payload",
		);
		s.doorsOpen = true;
		a.doors = 1;
		check(
			sim.command(1, { type: "release", salvo: 2, actionId: 71 }) &&
				s.bombsLeft === inventory - 2 &&
				s.bombs.length === 2,
			"salvo debits exactly inventory",
		);
		check(
			!sim.command(1, { type: "release", salvo: 2, actionId: 71 }) &&
				s.bombsLeft === inventory - 2,
			"reliable duplicate release is idempotent",
		);
		advance(sim, 18);
		check(
			s.primary && !s.targets.find((t) => t.primary).alive && s.score === 2500,
			"direct strike destroys primary and awards score once",
		);
		const impact = s.history.find((e) => e.type === "impact");
		check(
			impact && dist(impact, prediction) < 10,
			"released bomb impact agrees with sight",
		);
		const score = s.score;
		advance(sim, 3);
		check(s.score === score, "destroyed debris never awards score again");
		const last = airborne();
		lineUp(
			last,
			last.state.targets.find((t) => t.primary),
		);
		last.state.bombsLeft = 1;
		check(
			last.command(1, { type: "release", salvo: 4 }) &&
				last.state.bombsLeft === 0 &&
				last.state.bombs.length === 1,
			"last-bomb salvo caps to remaining inventory",
		);
		advance(last, 18);
		check(
			last.state.primary &&
				!last.state.result &&
				last.command(1, { type: "route", target: "home" }),
			"last bomb leaves a valid return path",
		);
		const miss = airborne();
		lineUp(
			miss,
			miss.state.targets.find((t) => t.primary),
			15000,
		);
		miss.command(1, { type: "release", salvo: 1 });
		advance(miss, 18);
		check(
			!miss.state.primary &&
				miss.state.wasted === 1 &&
				miss.state.lastImpact?.hit === false,
			"clear miss keeps objective and permits another pass/abort",
		);
	});

	test("four directional guns", () => {
		for (const station of Object.keys(BEARINGS)) {
			const sim = airborne(),
				s = sim.state;
			sim.command(1, { type: "station", station });
			const enemy = sim.spawnFighter(
				station,
				station === "tail" ? "pursuit" : "cross",
			);
			advance(sim, 18, () => {
				const a = s.aircraft,
					lead = dist(enemy, a) / (850 * U),
					x = enemy.x + (enemy.vx || 0) * lead - a.x,
					y = enemy.y + (enemy.vy || 0) * lead - a.y;
				sim.command(1, {
					type: "aim",
					yaw: angle(Math.atan2(y, x) - a.yaw - BEARINGS[station]),
					pitch: Math.atan2(
						enemy.z + (enemy.vz || 0) * lead - a.z,
						Math.hypot(x, y),
					),
				});
				sim.command(1, { type: "controls", fire: true });
			});
			check(
				s.kills === 1 && !enemy.alive && s.mounts[station].ammo < 480,
				`${station} mount aims, spends ammo, and kills its real spatial target`,
				`kills ${s.kills}, hp ${enemy.hp}`,
			);
			const score = s.score;
			sim.hitFighter(enemy, 10);
			check(s.score === score, `${station} kill scores once`);
		}
		const empty = airborne();
		empty.command(1, { type: "station", station: "nose" });
		empty.state.mounts.nose.ammo = 1;
		advance(empty, 1, (s) => s.command(1, { type: "controls", fire: true }));
		check(
			empty.state.mounts.nose.ammo === 0 && empty.state.mounts.nose.shots === 1,
			"empty mount stops firing",
		);
		const wrong = airborne();
		wrong.command(1, { type: "station", station: "nose" });
		const e = wrong.spawnFighter("tail", "pursuit");
		advance(wrong, 8, (s) => {
			s.command(1, { type: "aim", yaw: 99, pitch: 0 });
			s.command(1, { type: "controls", fire: true });
		});
		check(
			e.alive && e.hp === 4,
			"wrong bearing cannot hit through rear mount arc",
		);
		const departure = airborne();
		const fighter = departure.spawnFighter();
		advance(departure, 35);
		check(
			!fighter.alive &&
				departure.state.history.some((e) => e.type === "disengage"),
			"fighter disengages rather than stacking indefinitely",
		);
	});

	test("flak and battery", () => {
		const straight = airborne(),
			evasive = airborne();
		for (const sim of [straight, evasive]) {
			sim.state.aircraft.x = 270000;
			sim.state.targets.find((t) => t.id === "battery").alive = false;
			sim.spawnFlak();
		}
		advance(straight, straight.balance.flakWindow + 0.1);
		advance(evasive, evasive.balance.flakWindow + 0.1, (s) =>
			s.command(1, { type: "controls", bank: 1, pitch: 1, throttleDelta: 1 }),
		);
		check(
			straight.state.aircraft.hull < 100 &&
				straight.state.history.some((e) => e.type === "flak-burst"),
			"led telegraph becomes real damage volume",
		);
		check(
			evasive.state.history.some((e) => e.type === "flak-evaded") &&
				evasive.state.aircraft.hull > straight.state.aircraft.hull,
			"normal flight controls can clear the telegraphed flak volume",
			`straight=${straight.state.aircraft.hull}, evade=${evasive.state.aircraft.hull}`,
		);
		const battery = airborne(),
			target = battery.state.targets.find((t) => t.id === "battery");
		lineUp(battery, target);
		target.alive = true;
		battery.command(1, { type: "release", salvo: 1 });
		advance(battery, 18);
		check(!target.alive, "battery is a real optional bomb target");
		battery.state.aircraft.x = target.x;
		battery.flakCool = 0;
		battery.state.flak = [];
		advance(battery, 3);
		check(
			battery.state.flak.length === 0,
			"destroyed battery stops local barrages",
		);
		const direct = airborne({ route: "direct" }),
			dogleg = airborne({ route: "dogleg" });
		for (const sim of [direct, dogleg]) {
			sim.state.aircraft.x = 270000;
			sim.state.invulnerable = true;
			advance(sim, 25);
		}
		const directWarnings = direct.state.history.filter(
				(e) => e.type === "flak-warning",
			).length,
			doglegWarnings = dogleg.state.history.filter(
				(e) => e.type === "flak-warning",
			).length;
		check(
			directWarnings > doglegWarnings && doglegWarnings > 0,
			"dogleg route has an actual quieter coastal barrage cadence",
			`direct=${directWarnings}, dogleg=${doglegWarnings}`,
		);
	});

	test("damage and emergencies", () => {
		const sim = airborne(),
			s = sim.state;
		sim.damage(1, "fire");
		check(
			s.aircraft.fire > 0 && s.aircraft.engines.some((e) => e < 1),
			"engine fire is consequential",
		);
		check(
			sim.command(1, { type: "extinguish", actionId: 19 }) &&
				s.aircraft.extinguishers === 0 &&
				!s.aircraft.fire,
			"single extinguisher clears fire",
		);
		check(
			!sim.command(1, { type: "extinguish", actionId: 19 }) &&
				s.aircraft.extinguishers === 0,
			"extinguisher duplicate consumes once",
		);
		sim.applySystem("gun");
		sim.command(1, { type: "station", station: "nose" });
		advance(sim, 0.5, (ss) => ss.command(1, { type: "controls", fire: true }));
		check(
			s.mounts.nose.jammed && s.mounts.nose.shots === 0,
			"jammed mount cannot fire",
		);
		sim.command(1, { type: "station", station: "port" });
		advance(sim, 0.5, (ss) => ss.command(1, { type: "controls", fire: true }));
		check(s.mounts.port.shots > 0, "alternate mount remains usable");
		sim.applySystem("sight");
		sim.updatePrediction();
		check(
			s.sightDamaged && Number.isFinite(s.prediction.x),
			"damaged sight retains coarse usable solution",
		);
		const bombs = s.bombsLeft;
		check(
			!sim.command(1, { type: "jettison", held: 0.9 }) && s.bombsLeft === bombs,
			"jettison requires deliberate hold",
		);
		check(
			sim.command(1, { type: "jettison", held: 1.5, actionId: 20 }) &&
				s.bombsLeft === 0,
			"held jettison removes payload",
		);
		check(
			!sim.command(1, { type: "jettison", held: 1.5, actionId: 20 }),
			"duplicate jettison cannot consume twice",
		);
		sim.clearDamage();
		check(
			!s.sightDamaged &&
				!s.mounts.nose.jammed &&
				s.aircraft.hull === 100 &&
				s.aircraft.engines.every((e) => e === 1),
			"repair resets all consequences",
		);
		const burning = airborne();
		burning.applySystem("fire");
		burning.state.aircraft.extinguishers = 0;
		advance(burning, 52);
		check(
			burning.state.result?.reason === "fire" &&
				burning.state.history.some(
					(e) => e.type === "radio" && /spreading/.test(e.text),
				),
			"uncontrolled fire warns and resolves instead of burning forever",
		);
	});

	test("all terminal outcomes and replay", () => {
		const abort = airborne();
		Object.assign(abort.state.aircraft, { x: 50000, y: 0, yaw: Math.PI });
		abort.command(1, { type: "route", target: "home" });
		advance(abort, 80);
		check(
			abort.state.returned &&
				abort.state.result?.reason === "abort" &&
				!abort.state.result.win,
			"early return gives complete partial debrief",
		);
		const destroyed = airborne();
		destroyed.damage(1000);
		check(
			destroyed.state.result?.reason === "destroyed",
			"destroyed aircraft resolves",
		);
		const fuel = airborne();
		fuel.state.aircraft.fuel = 0.001;
		fuel.step(DT);
		check(
			fuel.state.result?.reason === "fuel-exhausted",
			"empty fuel resolves",
		);
		const ground = airborne();
		ground.state.aircraft.z = 10;
		ground.step(DT);
		check(
			ground.state.result?.reason === "ground-impact",
			"ground impact resolves",
		);
		const deadline = airborne();
		deadline.state.t = deadline.state.deadline - 0.001;
		deadline.step(DT);
		check(
			deadline.state.result?.reason === "deadline",
			"deadline resolves incomplete mission",
		);
		const terminal = copy(deadline.state.result);
		deadline.result("destroyed");
		check(
			JSON.stringify(deadline.state.result) === JSON.stringify(terminal),
			"terminal report is idempotent",
		);
		const replay = airborne();
		replay.sayOnce("verification-warning", "pilot", "FIRST");
		replay.state.aircraft.yaw = Math.PI;
		replay.applySystem("gun");
		replay.reset({ seed: 9 });
		check(
			replay.state.aircraft.yaw === 0 &&
				replay.state.mounts.nose.ammo === 480 &&
				!replay.state.mounts.nose.jammed &&
				!replay.state.result &&
				replay.state.t === 0,
			"replay resets orientation, resources, damage, clock and outcome",
		);
		replay.sayOnce("verification-warning", "pilot", "SECOND");
		check(
			replay.state.caption.text === "SECOND",
			"replay resets one-shot warning suppression",
		);
		const snapshot = replay.snapshot();
		snapshot.aircraft.fuel = 2;
		check(
			replay.state.aircraft.fuel !== 2,
			"snapshot does not alias authority",
		);
		const restored = new BomberSim();
		restored.loadSnapshot(replay.snapshot());
		check(
			restored.state.seed === 9,
			"snapshot round trip preserves authority data",
		);
	});

	test("practice, dev and mission data", () => {
		for (const practice of ["gunnery", "bombing", "return"]) {
			const sim = new BomberSim({ practice });
			check(
				sim.state.aircraft.airborne &&
					!sim.state.result &&
					sim.state.practice === practice,
				`${practice} practice starts with real active systems`,
			);
		}
		const sim = airborne();
		sim.dev("invulnerable", true);
		const hull = sim.state.aircraft.hull;
		sim.damage(99);
		check(
			sim.state.cheated && sim.state.aircraft.hull === hull,
			"invulnerability marks cheat and blocks damage",
		);
		sim.dev("infinite", true);
		sim.state.bombsLeft = 0;
		sim.step(DT);
		check(
			sim.state.bombsLeft >= 4 &&
				sim.state.aircraft.fuel === sim.state.aircraft.maxFuel,
			"infinite resources really refill",
		);
		for (const kind of ["engine", "gun", "sight", "fire"])
			sim.dev("damage", kind);
		sim.dev("repair");
		check(
			sim.state.aircraft.engines.every((e) => e === 1) &&
				!sim.state.aircraft.fire &&
				!sim.state.sightDamaged,
			"dev damage and repair use live systems",
		);
		for (const bearing of Object.keys(BEARINGS)) sim.dev("fighter", bearing);
		check(
			sim.state.enemies.filter((e) => e.alive).length === 3,
			"fighter spawn respects pressure ceiling",
		);
		sim.dev("flak");
		sim.dev("flak");
		sim.dev("flak");
		check(
			sim.state.flak.filter((e) => !e.burst).length === 2,
			"flak spawn respects pressure ceiling",
		);
		for (const beat of ["outbound", "coast", "bomb", "home"]) {
			sim.dev("jump", beat);
			check(
				Number.isFinite(sim.state.aircraft.x) && sim.state.aircraft.airborne,
				`dev ${beat} jump is usable`,
			);
		}
		const data = JSON.parse(sim.exportMission());
		check(
			validateMission(data).length === 0 && data.targets.some((t) => t.primary),
			"mission export parses and validates",
		);
		data.waypoints.harbor.x += 200;
		check(
			sim.importMission(JSON.stringify(data)) &&
				JSON.parse(sim.exportMission()).waypoints.harbor.x ===
					data.waypoints.harbor.x,
			"edited mission export/import round trip",
		);
		const bad = copy(data);
		bad.targets[0].r = -2;
		let refused = false;
		try {
			sim.importMission(bad);
		} catch {
			refused = true;
		}
		check(refused, "invalid mission data rejected");
		check(
			validateMission(copy(MISSION)).length === 0,
			"canonical mission is valid",
		);
	});

	if (full)
		for (const loadout of Object.keys(LOADOUTS))
			for (const difficulty of Object.keys(DIFFICULTIES))
				test(`whole sortie ${loadout}/${difficulty}`, () => {
					const run = playSortie({ loadout, difficulty }),
						s = run.sim.state;
					check(
						s.result?.win && s.primary && s.returned,
						"honest command bot completes strike and recovery",
						`reason=${s.result?.reason}; t=${s.t.toFixed(1)}; x=${s.aircraft.x.toFixed(0)}; y=${s.aircraft.y.toFixed(0)}; hull=${s.aircraft.hull.toFixed(1)}; released=${run.releaseSent}`,
					);
					check(
						[
							"launch",
							"outbound",
							"coast",
							"strike",
							"return",
							"landing",
							"debrief",
						].every((p) => run.phases.has(p)),
						"all mission beats were reached",
						[...run.phases].join(","),
					);
					check(
						Object.keys(BEARINGS).every((b) => run.encounters.has(b)),
						"all four actual threat bearings appear",
						[...run.encounters].join(","),
					);
					check(
						run.seenTypes.has("gun") &&
							run.seenTypes.has("flak-burst") &&
							run.seenTypes.has("release") &&
							run.seenTypes.has("impact"),
						"operation couples defense, flak, deliberate release and impact",
					);
					check(
						s.aircraft.fuel > 0 && s.bombsLeft >= 0 && !s.cheated,
						"resource viable without cheats",
					);
					check(
						!s.aircraft.airborne &&
							s.aircraft.z <= 80.1 &&
							s.aircraft.speed < 1 &&
							s.aircraft.gear > 0.99 &&
							Math.hypot(s.aircraft.x + 1800, s.aircraft.y) < 1,
						"assisted recovery physically reaches runway with deployed gear and stopped aircraft",
						`x=${s.aircraft.x}, y=${s.aircraft.y}, z=${s.aircraft.z}, speed=${s.aircraft.speed}, gear=${s.aircraft.gear}, airborne=${s.aircraft.airborne}`,
					);
					details.push({
						loadout,
						difficulty,
						result: s.result,
						beats: run.beats,
						encounters: [...run.encounters],
						frames: run.frames,
					});
				});
	return { count, failures, details };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const result = runSimTests({ full: !process.argv.includes("--quick") });
	for (const failure of result.failures) console.error(failure);
	console.log(
		`${result.count} simulation checks, ${result.failures.length} failures`,
	);
	if (process.argv.includes("--details"))
		console.log(JSON.stringify(result.details, null, 2));
	process.exitCode = result.failures.length ? 1 : 0;
}
