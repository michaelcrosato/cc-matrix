import { initPhysics, Hockey } from "./simulation.js";
await initPhysics();
const results = [];
const check = (name, pass, detail = "") =>
	results.push({ name, pass: !!pass, detail });
const g = new Hockey({ seed: 81 });
const run = (n, ins = {}) => {
	for (let i = 0; i < n; i++) g.step(ins);
};
const reset = (o = {}) => {
	g.reset(o);
	g.phase = "play";
};
try {
	reset();
	const x = g.players[0].x;
	run(60, { 0: { x: 1, z: 0 } });
	check("skating changes world position", g.players[0].x > x + 5);
	reset();
	run(60, { 0: { x: 1, z: 0, boost: true } });
	check("burst consumes energy", g.players[0].energy < 0.7);
	check("burst adds speed", g.players[0].x > x + 8);
	reset();
	g.givePuck(0);
	g.pass(g.players[0]);
	check("pass switches to receiver", g.seats[0].index === 1);
	check("pass is counted", g.stats.passes[0] === 1);
	run(60, { 0: { x: 0, z: 0 } });
	check("receiver catches pass", g.puck.owner === 1, JSON.stringify(g.puck));
	reset();
	g.givePuck(0);
	g.players[0].charge = 1;
	g.shoot(g.players[0], { aimX: 24, aimZ: 0 });
	check("slapshot releases puck", g.puck.owner === -1 && g.puck.vx > 30);
	check("shot recorded", g.stats.shots[0] === 1);
	reset();
	const p = g.players[0],
		q = g.players[2];
	q.x = p.x + 1.4;
	q.z = p.z;
	q.body.setTranslation({ x: q.x, y: 0.65, z: q.z }, true);
	g.givePuck(2);
	g.check(p);
	check("body check stuns opponent", q.stun > 0.5);
	check("check frees puck", g.puck.owner === -1 && g.stats.checks[0] === 1);
	reset({ players: 2 });
	g.givePuck(2);
	g.players[2].charge = 0.8;
	g.release(g.players[2], -10, 0);
	g.puck.lock = 2;
	run(10, { 0: {}, 1: { x: 0, z: 1 } });
	check(
		"lost possession cancels charge and restores steering",
		g.players[2].charge === 0 && Math.abs(g.players[2].angle) < 0.05,
	);
	reset();
	g.puck.owner = -1;
	g.puck.lock = 3;
	g.placePuck(0, 12.5, 0, 12);
	run(25, { 0: {} });
	check(
		"board rebound uses physics",
		g.puck.vz < 0 && Math.abs(g.puck.z) < 13.8,
	);

	for (const sx of [-1, 1])
		for (const sz of [-1, 1]) {
			reset();
			g.puck.owner = -1;
			g.puck.lock = 3;
			g.placePuck(20 * sx, 8 * sz, 12 * sx, 12 * sz);
			run(40, { 0: {} });
			check(
				"rounded corner rebound " + sx + "," + sz,
				g.puck.vx * sx + g.puck.vz * sz < 0 &&
					Math.abs(g.puck.x) < 26 &&
					Math.abs(g.puck.z) < 14,
				JSON.stringify(g.puck),
			);
		}
	reset();
	g.puck.owner = -1;
	g.puck.lastTeam = 0;
	g.puck.lock = 0;
	g.placePuck(20, 0, 20, 0);
	run(20, { 0: {} });
	check("goalie can save shots", g.stats.saves[1] > 0);
	reset();
	g.players[5].body.setTranslation({ x: 22.4, y: 0.65, z: 8 }, true);
	g.players[5].x = 22.4;
	g.players[5].z = 8;
	g.puck.owner = -1;
	g.puck.lock = 1;
	g.placePuck(22.8, 1, 30, 0);
	run(5, { 0: {} });
	check("crossing goal line scores", g.score[0] === 1 && g.phase === "goal");
	reset();
	g.tune.periodLength = 0.5;
	g.remaining = 0.5;
	g.score = [2, 0];
	run(900, { 0: {} });
	check(
		"complete three-period match",
		g.phase === "gameover" && g.period === 3 && g.winner === 0,
		JSON.stringify({ phase: g.phase, period: g.period, score: g.score }),
	);
	reset();
	g.period = 3;
	g.score = [1, 1];
	g.endPeriod();
	check("tie enters sudden death", g.overtime && g.phase === "faceoff");
	g.phase = "play";
	g.goal(1);
	check(
		"sudden-death goal ends match",
		g.phase === "gameover" && g.winner === 1,
	);
	reset({ training: true });
	run(60, { 0: { x: 1, z: 0 } });
	check("training skating drill", g.drill >= 1);
	run(40, { 0: { x: 1, z: 0, boost: true } });
	check("training burst drill", g.drill >= 2);
	g.givePuck(g.seats[0].index);
	g.pass(g.players[g.seats[0].index]);
	check("training pass drill", g.drill === 3);
	g.givePuck(g.seats[0].index);
	g.shoot(g.players[g.seats[0].index], { aimX: 24, aimZ: 0 });
	check("training shot drill", g.drill === 4);
	g.check(g.players[g.seats[0].index]);
	check("training check drill", g.drill === 5);
	g.phase = "play";
	g.goal(0);
	check(
		"all six drills complete",
		g.drill === 6 && g.phase === "training-complete",
	);
	Object.assign(g.tune, { periodLength: 45 });
	reset({ attract: true });
	run(18000);
	check(
		"AI produces shots",
		g.stats.shots.reduce((a, b) => a + b, 0) > 5,
		JSON.stringify(g.stats),
	);
	check(
		"AI produces passes",
		g.stats.passes.reduce((a, b) => a + b, 0) > 0,
		JSON.stringify(g.stats),
	);
	check(
		"AI produces checks",
		g.stats.checks.reduce((a, b) => a + b, 0) > 0,
		JSON.stringify(g.stats),
	);
	check(
		"AI makes goals",
		g.score[0] + g.score[1] > 0,
		JSON.stringify({ score: g.score, stats: g.stats }),
	);
	check(
		"scripted AI match plays to completion",
		g.phase === "gameover",
		JSON.stringify({ phase: g.phase, period: g.period, score: g.score }),
	);
	const s = g.snapshot(),
		other = new Hockey();
	other.applySnapshot(s);
	check(
		"network snapshot restores match",
		JSON.stringify(other.score) === JSON.stringify(g.score) &&
			other.players[0].x === g.players[0].x &&
			other.puck.owner === g.puck.owner,
	);
	other.dispose();
} catch (e) {
	check("simulation suite exception", false, e.stack);
} finally {
	g.dispose();
}
process.stdout.write(JSON.stringify(results));
