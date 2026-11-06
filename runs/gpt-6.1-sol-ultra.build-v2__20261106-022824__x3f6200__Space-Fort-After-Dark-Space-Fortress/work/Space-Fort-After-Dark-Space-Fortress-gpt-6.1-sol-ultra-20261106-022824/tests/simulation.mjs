import assert from "node:assert/strict";
import "../src/world.js";

const SF = globalThis.SF;
const advance = (w, seconds, input = {}) => {
	for (let t = 0; t < seconds - SF.DT / 2; t += SF.DT)
		w.step(SF.DT, typeof input === "function" ? input(w) : input);
};
const bot = (w) => Object.fromEntries(w.s.players.map((p) => [p.id, w.bot(p)]));
function fixture(n = 1, act = 0) {
	const w = new SF.World({
		seed: 1981,
		players: Array.from({ length: n }, (_, i) => ({
			id: i,
			name: `PILOT ${i + 1}`,
		})),
	});
	w.s.state = "play";
	w.s.timer = 0;
	w.s.act = act;
	w.s.spawnIndex = 99;
	for (const p of w.s.players) {
		p.y = act === 2 ? 465 : 390;
		p.invuln = 0;
	}
	return w;
}

export function runSimulationTests() {
	const failures = [];
	let passed = 0;
	function test(name, fn) {
		try {
			fn();
			passed++;
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
		}
	}

	test("authored encounter validation supports an additional data-only wave", () => {
		assert.deepEqual(SF.validate(), []);
		const count = SF.ENCOUNTERS.length;
		try {
			SF.ENCOUNTERS.push({
				act: 0,
				name: "DATA TEST",
				goal: "Intercept",
				duration: 10,
				groups: [[1, "hunter", 2, "top"]],
			});
			assert.deepEqual(SF.validate(), []);
			SF.ENCOUNTERS.pop();
			SF.ENCOUNTERS.push({
				act: 0,
				name: "INVALID",
				duration: 10,
				groups: [[1, "missing-threat", 2, "top"]],
			});
			assert.ok(SF.validate().length > 0);
		} finally {
			SF.ENCOUNTERS.splice(count);
		}
	});

	for (const seats of [1, 2, 3, 4])
		for (const upgrade of [0, 1, 2])
			test(`${seats}-pilot normal-intent complete victory with upgrade ${upgrade}`, () => {
				const w = new SF.World({
					seed: 1981,
					players: Array.from({ length: seats }, (_, i) => ({
						id: i,
						name: `PILOT ${i + 1}`,
					})),
				});
				const phases = new Set();
				let intermissions = 0,
					lastState = "briefing";
				while (!w.s.result && w.s.time < 780) {
					const intents = bot(w);
					if (w.s.state === "upgrade")
						for (const p of w.s.players) intents[p.id] = { choice: upgrade };
					w.step(SF.DT, intents);
					if (w.s.state === "upgrade" && lastState !== "upgrade")
						intermissions++;
					if (w.s.boss) phases.add(w.s.boss.phase);
					lastState = w.s.state;
				}
				assert.equal(
					w.s.modified,
					false,
					"the win must not use dev flags or cheats",
				);
				assert.equal(w.s.attract, false);
				assert.equal(
					w.s.result?.won,
					true,
					w.s.result?.reason || "campaign stalled",
				);
				assert.deepEqual([...phases], [0, 1, 2]);
				assert.equal(intermissions, 2);
				assert.equal(w.s.outcomes.length, 3);
				assert.ok(w.s.outcomes.every((x) => x.held));
				for (const p of w.s.players) assert.equal(p.upgrades[upgrade], 2);
				if (seats === 1 && upgrade === 0)
					for (const name of Object.keys(SF.ENEMIES))
						assert.ok(
							w.s.introduced.includes(name),
							`missing normal introduction: ${name}`,
						);
				assert.ok(Number.isFinite(w.s.result.score) && w.s.result.score > 0);
				assert.ok(w.s.time * 1000 < w.s.limitMs - 5000);
			});

	test("briefing and retreat cinematics do not move shots or apply damage", () => {
		const w = new SF.World();
		w.shoot(360, 390, 0, 1, -1, 1, 100);
		const x = w.s.shots[0].y,
			hp = w.s.players[0].hp;
		advance(w, 1);
		assert.equal(w.s.shots[0].y, x);
		assert.equal(w.s.players[0].hp, hp);
		w.s.state = "play";
		w.retreat(false);
		assert.equal(w.s.shots.length, 0);
		assert.equal(w.s.enemies.length, 0);
		advance(w, 1);
		assert.equal(w.s.players[0].hp, hp);
	});

	test("solo wipes force both early retreats and final defeat without pending redeploy", () => {
		const w = fixture();
		w.s.score = 1000;
		w.s.players[0].hp = 0;
		w.s.players[0].respawn = 4;
		w.step(SF.DT, {});
		assert.equal(w.s.state, "transition");
		assert.equal(w.s.outcomes[0].held, false);
		assert.equal(w.s.score, 500);
		advance(w, 4.1);
		assert.equal(w.s.act, 1);
		assert.equal(w.s.state, "upgrade");
		w.choose(0, 1);
		advance(w, 4.1);
		assert.equal(w.s.state, "play");
		w.s.players[0].hp = 0;
		w.step(SF.DT, {});
		assert.equal(w.s.state, "transition");
		advance(w, 4.1);
		assert.equal(w.s.act, 2);
		w.choose(0, 2);
		advance(w, 4.1);
		w.s.players[0].hp = 0;
		w.step(SF.DT, {});
		assert.equal(w.s.result.won, false);
		assert.equal(w.s.result.reason, "ALL VIPERS LOST");
		assert.equal(w.s.outcomes.filter((x) => !x.held).length, 2);
	});

	test("a living teammate enables delayed redeploy with invulnerability", () => {
		const w = fixture(2);
		const p = w.s.players[0];
		p.hp = 0;
		p.respawn = 4;
		advance(w, 3.9);
		assert.equal(p.hp, 0);
		assert.equal(w.s.state, "play");
		advance(w, 0.2);
		assert.equal(p.hp, p.maxHp);
		assert.ok(p.invuln > 2.8);
		assert.equal(p.energy, 100);
		for (const a of w.s.players) {
			a.hp = 0;
			a.respawn = 4;
		}
		w.step(SF.DT, {});
		assert.equal(w.s.state, "transition");
	});

	test("empty boost cannot disable movement or laser fire", () => {
		const w = fixture(),
			p = w.s.players[0],
			x = p.x;
		p.energy = 0;
		advance(w, 0.2, {
			0: { mx: 1, my: 0, ax: 0, ay: -1, fire: true, boost: true },
		});
		assert.ok(p.x > x + 4);
		assert.ok(w.s.shots.some((q) => q.owner === 0));
		assert.equal(p.boostT, 0);
		assert.ok(p.energy > 0);
	});

	test("pulse clears nearby hostile shots, preserves friendly and distant shots, and breaks tractor acquisition", () => {
		const w = fixture(),
			p = w.s.players[0];
		w.shoot(p.x + 40, p.y, 0, -1, -1, 1, 0);
		w.shoot(p.x + 180, p.y, 0, -1, -1, 1, 0);
		w.shoot(p.x + 40, p.y, 0, -1, 0, 12, 0);
		const e = w.spawn("tractor", p.x + 130, p.y, {
			t: 6,
			telegraph: 0,
			cycle: 3,
		});
		w.step(SF.DT, {});
		assert.ok(p.lock > 0);
		w.step(SF.DT, { 0: { pulse: true } });
		assert.equal(w.s.shots.filter((q) => q.owner === -1).length, 1);
		assert.equal(w.s.shots.filter((q) => q.owner === 0).length, 1);
		assert.equal(p.lock, 0);
		assert.ok(e.cycle < 0);
		assert.ok(p.pulse > 0 && p.pulseFX > 0);
	});

	test("kills and neutral pickups award team resources exactly once", () => {
		const w = fixture(2),
			e = w.spawn("anchor", 600, 250, { telegraph: 0 });
		w.kill(e);
		const score = w.s.score;
		w.kill(e);
		assert.equal(w.s.kills, 1);
		assert.equal(w.s.score, score);
		assert.equal(w.s.pickups.length, 1);
		const p = w.s.players[0];
		w.s.pickups[0].x = p.x;
		w.s.pickups[0].y = p.y;
		for (const a of w.s.players) {
			a.energy = 0;
			a.hp = 4;
		}
		w.step(SF.DT, {});
		assert.equal(w.s.pickups.length, 0);
		for (const a of w.s.players) {
			assert.ok(a.energy >= 25);
			assert.equal(a.hp, 5.2);
		}
		w.step(SF.DT, {});
		for (const a of w.s.players) assert.equal(a.hp, 5.2);
	});

	test("radiators cool only after a quiet interval and cease cooling under all four locks", () => {
		const w = fixture(1, 1);
		w.s.objective.heat = 50;
		w.s.objective.lastHit = w.s.time;
		advance(w, 1.9);
		assert.equal(w.s.objective.heat, 50);
		advance(w, 0.2);
		assert.ok(w.s.objective.heat < 50);
		w.s.enemies = [];
		w.s.objective.heat = 50;
		w.s.objective.lastHit = -10;
		for (let i = 0; i < 4; i++)
			w.spawn("tractor", 80 + i * 200, 100, { t: 5, telegraph: 0, cycle: 3 });
		w.step(SF.DT, {});
		assert.ok(w.s.objective.radiators.every((x) => !x));
		assert.equal(w.s.objective.heat, 50);
		w.kill(w.s.enemies[0]);
		w.step(SF.DT, {});
		assert.ok(w.s.objective.heat < 50);
	});

	test("shield invulnerability prevents repeated damage and expires by simulation time", () => {
		const w = fixture(),
			p = w.s.players[0];
		w.damagePlayer(p, 1);
		assert.equal(p.hp, 11);
		w.damagePlayer(p, 1);
		assert.equal(p.hp, 11);
		advance(w, 1.1);
		w.damagePlayer(p, 1);
		assert.equal(p.hp, 11);
		advance(w, 0.1);
		assert.equal(p.invuln, 0);
		w.damagePlayer(p, 1);
		assert.equal(p.hp, 10);
	});

	test("swept laser collision catches fast crossing shots and rejects a miss", () => {
		const w = fixture();
		const e = w.spawn("hunter", 400, 200, { telegraph: 0 });
		w.shoot(400, 350, 0, -1, 0, 24, 24000);
		w.step(SF.DT, {});
		assert.equal(w.s.kills, 1);
		assert.ok(e.hp <= 0);
		const miss = w.spawn("hunter", 400, 200, { telegraph: 0 });
		w.shoot(550, 350, 0, -1, 0, 24, 24000);
		w.step(SF.DT, {});
		assert.equal(miss.hp, 24);
	});

	test("friendly lasers do not hit teammates", () => {
		const w = fixture(2),
			p = w.s.players[1];
		w.shoot(p.x, p.y + 50, 0, -1, 0, 12, 24000);
		w.step(SF.DT, {});
		assert.equal(p.hp, p.maxHp);
	});

	test("an anchor pull is escapable using ordinary boost intent", () => {
		const w = fixture(),
			p = w.s.players[0];
		p.x = 480;
		p.y = 350;
		const e = w.spawn("anchor", 480, 290, { telegraph: 0, t: 4 });
		// The safe-spawn mechanism relocates a new anchor; fixture the already deployed hazard.
		e.x = 480;
		e.y = 290;
		w.step(SF.DT, {});
		assert.ok(p.vy < 0, "anchor should pull upward");
		advance(w, 0.9, { 0: { mx: 0, my: 1, ax: 0, ay: -1, boost: true } });
		assert.ok(
			Math.hypot(p.x - e.x, p.y - e.y) > 155,
			"boost should cross the pull radius",
		);
		assert.ok(p.energy < 100);
	});

	test("objective failure and final team wipe take priority over the final boss kill", () => {
		for (const cause of ["base", "wipe"]) {
			const w = fixture(1, 2);
			w.startBoss();
			w.s.boss.phase = 2;
			w.bossParts();
			for (const c of w.s.boss.components) c.hp = 0;
			if (cause === "base") w.s.objective.integrity = 0;
			else w.s.players[0].hp = 0;
			w.step(SF.DT, {});
			assert.equal(w.s.result.won, false);
			assert.equal(w.s.outcomes.length, 0);
			const result = w.s.result;
			w.step(SF.DT, {});
			assert.equal(w.s.result, result);
		}
	});

	test("fortress-overflow collision on a wave boundary forces a failed retreat", () => {
		const w = fixture(1, 1);
		w.s.wave = 2;
		w.s.waveTime = SF.ENCOUNTERS[5].duration - 0.5;
		w.s.objective.heat = 99.9;
		w.s.objective.lastHit = w.s.time;
		w.shoot(480, 320, 0, -1, -1, 1, 0, 3);
		w.step(SF.DT, {});
		assert.equal(w.s.state, "transition");
		assert.equal(w.s.outcomes[0].held, false);
	});

	test("seeded simulation and complete snapshot restoration reproduce the next input stream", () => {
		const a = new SF.World({ seed: 42 }),
			b = new SF.World({ seed: 42 });
		advance(a, 22, bot);
		advance(b, 22, bot);
		assert.deepEqual(a.snapshot(), b.snapshot());
		const c = new SF.World({ seed: 99 });
		assert.equal(c.restore(a.snapshot()), true);
		advance(a, 15, bot);
		advance(c, 15, bot);
		assert.deepEqual(a.snapshot(), c.snapshot());
		assert.equal(c.restore({ v: 0 }), false);
	});

	test("modified balance survives a complete simulation snapshot", () => {
		const w = fixture();
		w.dev("thrust", 800);
		w.dev("gravity", 220);
		const r = new SF.World();
		assert.equal(r.restore(w.snapshot()), true);
		assert.equal(r.balance.thrust, 800);
		assert.equal(r.balance.gravity, 220);
	});

	test("act jump resets encounter scheduling and balance sliders clamp and reset", () => {
		const w = fixture();
		w.s.spawnIndex = 6;
		w.dev("act", 0);
		assert.equal(w.s.spawnIndex, 0);
		w.dev("thrust", 100000);
		assert.equal(w.balance.thrust, SF.BALANCE[0][4]);
		w.dev("thrust", NaN);
		assert.equal(w.balance.thrust, SF.BALANCE[0][4]);
		w.dev("resetBalance");
		assert.deepEqual(w.balance, SF.DEFAULTS);
		assert.equal(w.s.modified, true);
	});

	test("late enemies cannot stall authored campaign progression", () => {
		const w = fixture();
		w.s.waveTime = SF.ENCOUNTERS[0].duration + 16.1;
		w.spawn("relay", -10000, -10000, { telegraph: 0 });
		w.step(SF.DT, {});
		assert.equal(w.s.wave, 1);
	});

	test("dev invulnerability survives act boundaries and can be disabled", () => {
		const w = fixture();
		w.dev("invulnerable", true);
		w.retreat(true);
		w.nextAct();
		const p = w.s.players[0];
		p.invuln = 0;
		const hp = p.hp;
		w.damagePlayer(p, 1);
		assert.equal(p.hp, hp);
		w.dev("invulnerable", false);
		p.invuln = 0;
		w.damagePlayer(p, 1);
		assert.equal(p.hp, hp - 1);
	});

	test("new authored wave uses existing scheduler/combat without engine changes", () => {
		const extra = {
			act: 0,
			name: "RECOVERY POCKET",
			goal: "Clear one hunter.",
			duration: 3,
			groups: [[0.1, "hunter", 1, "top"]],
		};
		SF.ENCOUNTERS.push(extra);
		try {
			assert.equal(SF.validate().length, 0);
			const w = fixture();
			w.dev("act", 0);
			w.dev("wave", 3);
			for (let n = 0; n < 440; n++) w.step(SF.DT, { 0: w.bot(w.s.players[0]) });
			assert.ok(w.s.introduced.includes("hunter"));
			assert.equal(w.s.state, "transition");
			assert.equal(w.s.pendingAct, 1);
		} finally {
			SF.ENCOUNTERS.pop();
		}
	});

	test("neutral ground boost always crosses a firing lane", () => {
		const w = fixture();
		w.dev("act", 2);
		w.s.state = "play";
		w.s.timer = 0;
		const p = w.s.players[0];
		p.x = 400;
		p.y = 465;
		p.vx = 0;
		p.angle = -Math.PI / 2;
		w.step(SF.DT, { 0: { mx: 0, my: 0, ax: 0, ay: -1, boost: true } });
		assert.ok(Math.abs(p.vx) > 400);
		assert.equal(p.y, 465);
		assert.ok(p.energy < 100);
	});

	return { passed, failed: failures.length, failures };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
	const result = runSimulationTests();
	for (const failure of result.failures) console.error(`FAIL ${failure}`);
	console.log(`${result.passed} passed, ${result.failed} failed`);
	if (result.failed) process.exitCode = 1;
}
