import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const base = new URL("../", import.meta.url);
function setup() {
	const c = {};
	vm.createContext(c);
	for (const path of ["src/content.js", "src/sim.js", "tests/server-pilot.js"])
		vm.runInContext(fs.readFileSync(new URL(path, base), "utf8"), c);
	return c;
}
export default async function runTests() {
	const results = [],
		evidence = [];
	function test(name, fn) {
		try {
			fn();
			results.push({ name, ok: true });
		} catch (e) {
			results.push({ name, ok: false, error: e.stack || String(e) });
		}
	}
	test("network-cadence campaign policy reads world without changing simulation state", () => {
		const { RuinSim: S, RuinServerPilot: P } = setup(),
			w = S.create({ players: 2 }),
			pilot = P.create(0);
		const before = JSON.stringify(w);
		pilot.action(w);
		pilot.action(w);
		assert.equal(JSON.stringify(w), before);
	});
	for (const cfg of [
		{ seed: 3249287277, players: 2, hold: 12, delay: 0 },
		{ seed: 3249287277, players: 2, hold: 16, delay: 6 },
		{ seed: 1982, players: 2, hold: 18, delay: 6 },
		{ seed: 1106, players: 2, hold: 12, delay: 12 },
		{ seed: 3249287277, players: 1, hold: 12, delay: 6 },
	]) {
		test(`ordinary network action pilot wins seed ${cfg.seed}, ${cfg.players} scouts, ${cfg.hold} held ticks, ${cfg.delay} input-delay ticks`, () => {
			const { RuinSim: S, RuinServerPilot: P } = setup(),
				w = S.create(cfg),
				pilots = w.players.map((_p, i) => P.create(i));
			let next = 0,
				active = pilots.map(() => ({})),
				queue = [],
				visited = new Set([0]);
			for (
				let tick = 0;
				tick < 120 * 180 && !["victory", "defeat"].includes(w.mode);
				tick++
			) {
				if (w.mode === "transition") {
					S.nextSector(w);
					visited.add(w.sector);
				}
				if (tick >= next) {
					next = tick + cfg.hold;
					queue.push({
						tick: tick + cfg.delay,
						actions: pilots.map((p) => {
							const a = p.action(w);
							for (const k of ["mx", "my", "ax", "ay"])
								a[k] = Math.round(a[k] * 127) / 127;
							return a;
						}),
					});
				}
				if (queue[0]?.tick === tick) active = queue.shift().actions;
				S.step(w, active);
				active = active.map((a) => ({ ...a, cannon: false }));
			}
			evidence.push({
				...cfg,
				mode: w.mode,
				seconds: w.time,
				stats: w.stats,
				reserves: w.reserves,
			});
			assert.equal(w.mode, "victory");
			assert.equal(visited.size, 3);
			assert.equal(w.stats.coreHits, 6);
			assert.ok(w.stats.biteCount >= 5);
			assert.ok(w.stats.airborne >= 1);
			assert.ok(w.stats.refills > 0);
			assert.equal(w.practice, false);
			assert.equal(w.assist, false);
			assert.equal(w.attract, false);
			assert.equal(w.dev.invulnerable, false);
			assert.equal(w.dev.infiniteCharge, false);
		});
	}
	fs.writeFileSync(
		new URL("tests/artifacts/server-pilot-replays.json", base),
		JSON.stringify(evidence, null, 2),
	);
	return {
		passed: results.filter((r) => r.ok).length,
		failed: results.filter((r) => !r.ok).length,
		results,
	};
}
if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])
) {
	const report = await runTests();
	for (const r of report.results)
		if (!r.ok) process.stderr.write("FAIL " + r.name + "\n" + r.error + "\n");
	process.stdout.write(
		report.passed + " passed, " + report.failed + " failed\n",
	);
	process.exitCode = report.failed ? 1 : 0;
}
