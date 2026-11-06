import { pathToFileURL } from "node:url";
import { ARENAS, DEFAULTS, HockeyGame } from "./game.js";

const DT = 1 / 60;
const idle = () => ({
	x: 0,
	z: 0,
	aimX: 0,
	aimZ: 0,
	shoot: false,
	pass: false,
	check: false,
	switch: false,
});
const assert = (condition, message) => {
	if (!condition) throw new Error(message);
};
const close = (actual, expected, tolerance, message) =>
	assert(
		Math.abs(actual - expected) <= tolerance,
		`${message}: got ${actual}, expected ${expected} ± ${tolerance}`,
	);

function tick(game, seconds, first = {}, second = {}) {
	for (let i = 0; i < Math.ceil(seconds / DT); i++)
		game.step(DT, [
			{ ...idle(), ...first },
			{ ...idle(), ...second },
		]);
}

function until(game, condition, seconds = 4, first = {}, second = {}) {
	for (let i = 0; i < Math.ceil(seconds / DT); i++) {
		if (condition()) return;
		game.step(DT, [
			{ ...idle(), ...first },
			{ ...idle(), ...second },
		]);
	}
	assert(condition(), `Timed out after ${seconds}s in phase ${game.phase}`);
}

function place(game, index, x, z) {
	const player = game.players[index];
	Object.assign(player, {
		x,
		z,
		vx: 0,
		vz: 0,
		speed: 0,
		stun: 0,
		cooldown: 0,
		charge: 0,
	});
	player.rb.setTranslation({ x, y: 0.55, z }, true);
	player.rb.setNextKinematicTranslation({ x, y: 0.55, z });
	return player;
}

function setPuck(game, x, z, vx = 0, vz = 0) {
	game.owner = -1;
	game.body.setTranslation({ x, y: 0.25, z }, true);
	game.body.setLinvel({ x: vx, y: 0, z: vz }, true);
	game.puck = { x, z, vx, vz };
}

function clearLane(game, team = 0) {
	const sign = team === 0 ? 1 : -1;
	for (const player of game.players)
		place(game, player.index, player.team ? 14 : -14, player.slot ? -7.5 : 7.5);
	const shooter = place(game, team * 2 + 1, sign * 11, 0);
	game.selected[team] = shooter.index;
	game.takePuck(shooter.index);
	game.noPickup = 0;
	return shooter;
}

function shootToGoal(game, team = 0) {
	const shooter = clearLane(game, team);
	const other =
		team === 0
			? [{ shoot: true, aimX: 1, aimZ: 0 }, {}]
			: [{}, { shoot: true, aimX: -1, aimZ: 0 }];
	tick(game, 0.8, other[0], other[1]);
	tick(
		game,
		DT,
		team === 0 ? { aimX: 1, aimZ: 0 } : {},
		team === 1 ? { aimX: -1, aimZ: 0 } : {},
	);
	assert(
		game.lastShooter === shooter.index,
		`Team ${team} did not release its shot`,
	);
	until(game, () => game.phase === "goal" || game.phase === "final", 2);
	assert(
		game.scores[team] > 0,
		`Team ${team} shot did not cross the goal mouth`,
	);
}

export async function runPhysicsTests() {
	const failures = [];
	let passed = 0;
	const oldWarn = console.warn;
	console.warn = (...args) => {
		if (
			!String(args[0]).includes("deprecated parameters for the initialization")
		)
			oldWarn(...args);
	};
	try {
		await HockeyGame.init();
	} finally {
		console.warn = oldWarn;
	}
	const test = async (name, body) => {
		let game;
		try {
			const events = [];
			game = new HockeyGame((name, data) => events.push({ name, data }));
			game.reset({ mode: "exhibition", ai: [false, false], time: 180 });
			await body(game, events);
			passed++;
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
		} finally {
			game?.dispose();
		}
	};

	await test("Faceoff freezes regulation clock and releases the puck", (game, events) => {
		tick(game, 2);
		assert(game.phase === "faceoff", "Faceoff ended too early");
		close(game.seconds, 180, 0.001, "Clock ran before the whistle");
		until(game, () => game.phase === "play", 1);
		assert(
			events.some((event) => event.name === "whistle"),
			"No opening whistle",
		);
		tick(game, 1);
		assert(
			game.seconds < 179.1 && game.seconds > 178.9,
			"Regulation clock did not advance at real time",
		);
	});

	await test("Skating has acceleration, glide and legal rink limits", (game) => {
		game.phase = "play";
		game.noPickup = 100;
		setPuck(game, -4, -5);
		game.switchLock[0] = 100;
		game.selected[0] = 1;
		tick(game, 0.25, { x: 1, z: 1 });
		const speed = game.players[1].speed;
		assert(
			speed > 6 && speed <= DEFAULTS.skateSpeed + 0.01,
			`Unexpected accelerated skating speed ${speed}`,
		);
		const x = game.players[1].x;
		tick(game, 0.05);
		assert(
			game.players[1].x > x,
			"Skater stopped instantly instead of gliding",
		);
		tick(game, 5, { x: 1, z: 1 });
		close(game.players[1].x, 16.9, 0.01, "Right rink limit");
		close(game.players[1].z, 8.85, 0.01, "Upper rink limit");
		tick(game, 6, { x: -1 });
		close(game.players[1].x, -13, 0.01, "Forward own-zone limit");
		game.selected[0] = 0;
		tick(game, 6, { x: 1 });
		close(game.players[0].x, 2, 0.01, "Goalie attack limit");
	});

	await test("Holding and releasing shoot creates a stronger charged shot", (game) => {
		game.phase = "play";
		clearLane(game);
		tick(game, DT, { shoot: true, aimX: 1 });
		tick(game, DT, { aimX: 1 });
		const tapSpeed = Math.hypot(game.body.linvel().x, game.body.linvel().z);
		const tapShots = game.stats[0].shots;
		clearLane(game);
		tick(game, 0.82, { shoot: true, aimX: 1 });
		assert(
			game.owner === 1 && game.players[1].charge >= 0.99,
			"Charged puck was released while button remained down",
		);
		tick(game, DT, { aimX: 1 });
		const chargeSpeed = Math.hypot(game.body.linvel().x, game.body.linvel().z);
		assert(
			chargeSpeed > tapSpeed * 1.8,
			`Charge added too little power (${tapSpeed} → ${chargeSpeed})`,
		);
		assert(
			game.stats[0].shots === tapShots + 1,
			"A held button fired repeated shots",
		);
		tick(game, 0.05);
		assert(
			game.stats[0].shots === tapShots + 1,
			"Shoot release repeated without new input",
		);
	});

	await test("Shot aim provides 32 discrete forward angles for both teams", (game) => {
		game.phase = "play";
		for (const team of [0, 1]) {
			const angles = new Set();
			const player = game.players[team * 2 + 1];
			for (let i = 0; i < 64; i++) {
				place(game, player.index, 0, 0);
				game.takePuck(player.index);
				const angle = -1.14 + (2.28 * i) / 63;
				game.shoot(player, {
					aimX: Math.cos(angle) * (team ? -1 : 1),
					aimZ: Math.sin(angle),
				});
				const velocity = game.body.linvel();
				assert(
					velocity.x * (team ? -1 : 1) > 0,
					"Shot traveled toward own net",
				);
				angles.add(Math.atan2(velocity.z, Math.abs(velocity.x)).toFixed(4));
			}
			assert(
				angles.size === 32,
				`Team ${team} had ${angles.size} angles instead of 32`,
			);
		}
	});

	await test("Pass travels to teammate and transfers controlled possession", (game, events) => {
		game.phase = "play";
		place(game, 0, -1, 0);
		place(game, 1, -8, 0);
		place(game, 2, 15, 7);
		place(game, 3, 11, -7);
		game.takePuck(1);
		tick(game, DT, { pass: true });
		assert(
			game.owner === -1 && game.selected[0] === 0,
			"Pass did not release puck and select receiver",
		);
		assert(game.stats[0].passes === 1, "Pass stat missing");
		until(game, () => game.owner >= 0, 1.5);
		assert(game.owner === 0, `Wrong receiver captured pass: ${game.owner}`);
		assert(
			game.selected[0] === 0,
			"Possession did not retain the receiver selection",
		);
		assert(
			events.some((event) => event.name === "pass"),
			"Pass event missing",
		);
	});

	await test("Checking knocks down a carrier, steals puck and respects cooldown", (game) => {
		game.phase = "play";
		place(game, 0, -14, -7);
		const checker = place(game, 1, 1, 0);
		place(game, 2, 15, 7);
		const carrier = place(game, 3, 3, 0);
		game.takePuck(3);
		tick(game, DT);
		game.check(checker);
		assert(
			carrier.stun > 0.85 && game.owner === -1,
			"Check did not knock the carrier down and dislodge puck",
		);
		assert(
			game.stats[0].checks === 1 && checker.cooldown > 1,
			"Check did not record hit/cooldown",
		);
		const firstAction = checker.actionId;
		game.check(checker);
		assert(
			checker.actionId === firstAction && game.stats[0].checks === 1,
			"Cooldown permitted a repeated check",
		);
		tick(game, 1.2);
		place(game, 3, checker.x + 1.5, checker.z);
		game.check(checker);
		assert(game.stats[0].checks === 2, "Check did not rearm after cooldown");
	});

	await test("Goalie in crease is immune to checks but vulnerable outside", (game) => {
		game.phase = "play";
		const checker = place(game, 1, 13, 0);
		const goalie = place(game, 2, 15, 0);
		place(game, 3, 0, -7);
		game.takePuck(2);
		game.check(checker);
		assert(
			goalie.stun === 0 && game.owner === 2 && game.stats[0].checks === 0,
			"Crease goalie lost immunity",
		);
		checker.cooldown = 0;
		place(game, 1, 8, 0);
		place(game, 2, 10, 0);
		game.check(checker);
		assert(
			goalie.stun > 0 && game.owner === -1,
			"Goalie outside crease remained immune",
		);
	});

	await test("Side boards physically rebound the puck and record a bank", (game, events) => {
		game.phase = "play";
		game.noPickup = 20;
		setPuck(game, 0, 8, 0, 19);
		game.lastTeam = 0;
		until(game, () => game.body.linvel().z < -1, 1);
		assert(
			game.puck.z <= 9.7,
			`Puck escaped the side boards at ${game.puck.z}`,
		);
		assert(
			game.banks >= 1 && game.stats[0].boards >= 1,
			"Bank-shot statistics missing",
		);
		assert(
			events.some((event) => event.name === "board"),
			"Board event missing",
		);
		tick(game, 0.5);
		assert(
			game.puck.z < 8,
			"Puck did not skate back into the rink after rebound",
		);
	});

	await test("End boards rebound shots outside the goal mouth", (game) => {
		game.phase = "play";
		game.noPickup = 20;
		setPuck(game, 16, 6, 24, 0);
		until(game, () => game.body.linvel().x < -1, 1);
		assert(
			game.phase === "play" && game.scores[0] === 0,
			"End-board shot counted as goal",
		);
		assert(game.puck.x <= 18, "Puck escaped an end board");
	});

	await test("Both teams can score through the correct net and face off again", (game, events) => {
		game.phase = "play";
		shootToGoal(game, 0);
		assert(
			game.scores[0] === 1 && game.scores[1] === 0,
			"Home goal credited incorrectly",
		);
		until(game, () => game.phase === "play", 6);
		close(game.puck.x, 0, 0.05, "Faceoff puck x");
		shootToGoal(game, 1);
		assert(
			game.scores[0] === 1 && game.scores[1] === 1,
			"Away goal credited incorrectly",
		);
		assert(
			events.filter((event) => event.name === "goal").length === 2,
			"Goal emitted duplicate or missing events",
		);
	});

	await test("Goalie can intercept an opposing shot and records a save", (game) => {
		game.phase = "play";
		place(game, 0, -14, 7);
		const shooter = place(game, 1, 6, 0);
		place(game, 2, 15, 0);
		place(game, 3, 11, -7);
		game.takePuck(1);
		game.release(shooter, 1, 0, 22, "shot");
		until(game, () => game.owner >= 0 || game.phase !== "play", 2);
		assert(
			game.owner === 2,
			`Goalie failed to capture shot, owner=${game.owner}, phase=${game.phase}`,
		);
		assert(game.stats[1].saves === 1, "Goalie save was not counted");
		assert(game.scores[0] === 0, "Saved shot still counted as goal");
	});

	await test("Automatic nearest switching and manual switch lock cooperate", (game) => {
		game.phase = "play";
		game.noPickup = 20;
		place(game, 0, -14, 0);
		place(game, 1, 6, 0);
		setPuck(game, -12, 0);
		tick(game, DT);
		assert(
			game.selected[0] === 0,
			"Nearest goalie was not automatically selected",
		);
		tick(game, DT, { switch: true });
		assert(
			game.selected[0] === 1 && game.switchLock[0] > 1,
			"Manual switch failed",
		);
		tick(game, 0.5);
		assert(
			game.selected[0] === 1,
			"Automatic switch immediately overrode manual selection",
		);
		tick(game, 1.1);
		assert(
			game.selected[0] === 0,
			"Nearest-player selection did not resume after manual lock",
		);
		game.takePuck(1);
		tick(game, DT);
		assert(
			game.selected[0] === 1,
			"Puck possession did not select the carrier",
		);
	});

	await test("Practice completes skate, pass, charge, check and scoring lessons", (game, events) => {
		game.reset({ mode: "practice", ai: [false, false] });
		assert(
			game.trainingStep === 0 && game.owner === 1,
			"Practice did not set opening lesson",
		);
		until(game, () => game.trainingStep === 1, 2, { x: 1 });
		tick(game, DT, { pass: true });
		assert(game.trainingStep === 2, "Pass lesson did not advance");
		tick(game, 0.8, { shoot: true, aimX: 1 });
		tick(game, DT, { aimX: 1 });
		assert(
			game.trainingStep === 3 && game.owner === 3,
			"Charged shot lesson did not stage defensive check",
		);
		tick(game, DT, { check: true });
		assert(
			game.trainingStep === 4 && game.owner === 1,
			"Check lesson did not stage scoring opportunity",
		);
		tick(game, 0.8, { shoot: true, aimX: 1 });
		tick(game, DT, { aimX: 1 });
		until(game, () => game.phase === "final", 3);
		assert(
			game.trainingStep === 5 && game.winner === 0 && game.scores[0] === 1,
			"Practice did not complete after actual goal",
		);
		assert(
			events.filter((event) => event.name === "lesson").length === 5,
			"Practice skipped or duplicated a lesson",
		);
	});

	await test("Tied regulation enters sudden death and next real goal wins", (game, events) => {
		game.phase = "play";
		game.seconds = 0.01;
		tick(game, DT);
		assert(
			game.phase === "faceoff" && game.suddenDeath,
			"Tie did not enter overtime faceoff",
		);
		assert(
			game.seconds === 30 && events.some((event) => event.name === "overtime"),
			"Overtime clock/event missing",
		);
		until(game, () => game.phase === "play", 3);
		shootToGoal(game, 1);
		until(game, () => game.phase === "final", 3);
		assert(
			game.winner === 1 && game.scores[1] === 1,
			"Sudden-death goal did not award the win",
		);
	});

	await test("Regulation loss reaches final exactly once", (game, events) => {
		game.phase = "play";
		game.scores = [1, 2];
		game.seconds = 0.01;
		tick(game, 2);
		assert(
			game.phase === "final" && game.winner === 1,
			"Losing regulation did not reach final",
		);
		assert(
			events.filter((event) => event.name === "final").length === 1,
			"Final event repeated after match ended",
		);
	});

	await test("Scripted full cup wins all three authored regulation rounds", (game) => {
		let completed = 0;
		for (let round = 0; round < ARENAS.length; round++) {
			const arena = ARENAS[round];
			game.reset({
				mode: "cup",
				round,
				theme: round,
				time: arena.time,
				skill: arena.skill,
				turbo: arena.turbo,
				ai: [false, false],
			});
			until(game, () => game.phase === "play", 3);
			assert(
				game.round === round &&
					game.theme === round &&
					game.turbo === arena.turbo,
				"Cup arena setup incorrect",
			);
			shootToGoal(game, 0);
			until(game, () => game.phase === "play", 6);
			until(game, () => game.phase === "final", arena.time + 1);
			assert(
				game.winner === 0 && game.scores[0] === 1,
				`Cup round ${round + 1} did not end in scripted regulation win`,
			);
			completed++;
		}
		assert(completed === 3, "Full cup did not contain three completed rounds");
	});

	await test("AI attract match skates, shoots, scores and reaches a result", (game, events) => {
		game.reset({ mode: "attract", ai: [true, true], time: 60, skill: 0.72 });
		until(game, () => game.phase === "final", 160);
		assert(
			game.stats[0].shots + game.stats[1].shots >= 2,
			"Attract AI failed to show shooting",
		);
		assert(
			game.scores[0] + game.scores[1] >= 1,
			"Attract AI failed to show a goal",
		);
		assert(
			events.some((event) => event.name === "pickup"),
			"Attract AI failed to capture puck",
		);
		assert(
			game.winner === 0 || game.winner === 1,
			"Attract match did not produce winner",
		);
	});

	await test("Live balance sliders change puck drag, shot power and clock speed", (game) => {
		game.phase = "play";
		game.noPickup = 20;
		game.params.puckDrag = 3;
		setPuck(game, 0, -6, 10, 0);
		tick(game, 0.5);
		assert(game.body.linvel().x < 3, "Live puck drag had no physical effect");
		game.params.shotPower = 40;
		const shooter = clearLane(game);
		shooter.charge = 1;
		game.shoot(shooter, { aimX: 1, aimZ: 0 });
		assert(game.body.linvel().x > 51, "Live shot power had no effect");
		setPuck(game, 0, -6);
		game.noPickup = 20;
		game.params.clockSpeed = 3;
		game.seconds = 20;
		tick(game, 0.5);
		close(game.seconds, 18.5, 0.01, "Live clock speed");
	});

	await test("Network snapshot faithfully reproduces a live scored match", (game) => {
		game.phase = "play";
		shootToGoal(game, 0);
		const snapshot = game.snapshot();
		const receiver = new HockeyGame();
		try {
			receiver.applySnapshot(JSON.parse(JSON.stringify(snapshot)));
			const received = receiver.snapshot();
			for (const key of [
				"mode",
				"round",
				"theme",
				"phase",
				"seconds",
				"owner",
				"winner",
				"suddenDeath",
			]) {
				assert(received[key] === snapshot[key], `Snapshot lost ${key}`);
			}
			assert(
				JSON.stringify(received.players) === JSON.stringify(snapshot.players),
				"Snapshot lost player animation/position state",
			);
			assert(
				JSON.stringify(received.stats) === JSON.stringify(snapshot.stats),
				"Snapshot lost match statistics",
			);
			assert(
				JSON.stringify(received.scores) === JSON.stringify(snapshot.scores),
				"Snapshot lost score",
			);
		} finally {
			receiver.dispose();
		}
	});

	return { passed, failed: failures.length, failures };
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	try {
		const result = await runPhysicsTests();
		for (const failure of result.failures) console.error(`FAIL ${failure}`);
		console.log(
			`${result.passed + result.failed} physics checks: ${result.passed} passed, ${result.failed} failed`,
		);
		process.exitCode = result.failed ? 1 : 0;
	} catch (error) {
		console.error(`FAIL Physics initialization: ${error.stack || error}`);
		console.log("1 physics check: 0 passed, 1 failed");
		process.exitCode = 1;
	}
}
