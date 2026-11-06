import assert from "node:assert/strict";
import {
	createWorld,
	command,
	step,
	predict,
	planShot,
	health,
	collapse,
	finish,
	timeout,
	resetCastles,
	validateCourt,
	segmentBox,
	DEFAULTS,
	STONES,
	COURTS,
	RIVALS,
	DT,
	pack,
	unpack,
} from "../src/sim.js";
import { load, save, NAMESPACE } from "../src/persistence.js";
import "../vendor/engine/my-3d2dge.js";
import { createRuntime } from "../src/main.js";
export async function runSimulation() {
	let checks = 0;
	const failures = [];
	const evidence = { tour: [], courts: [], issues: [] };
	const ok = (value, message) => {
		checks++;
		try {
			assert.ok(value, message);
		} catch (e) {
			failures.push(message);
		}
	};
	const equal = (a, b, message) => {
		checks++;
		try {
			assert.deepEqual(a, b, message);
		} catch (e) {
			failures.push(
				message + ": " + JSON.stringify({ actual: a, expected: b }),
			);
		}
	};
	const advance = (w, seconds) => {
		for (let i = 0; i < Math.round(seconds / DT); i++) step(w);
	};
	const shot = (w, power, type = 0, seat = 0) => {
		command(w, seat, { type: "stone", stone: type });
		command(w, seat, { type: "begin" });
		advance(w, Math.round((power * w.config.chargeTime) / DT) * DT);
		const q = w.players[seat].charge?.power;
		command(w, seat, { type: "release" });
		return q;
	};
	// Predictor and production integration, every stone from both ends.
	for (let type = 0; type < 3; type++)
		for (let seat = 0; seat < 2; seat++) {
			const w = createWorld();
			const n = 108,
				power = (n * DT) / w.config.chargeTime;
			const predicted = predict(w, seat, power, type);
			command(w, seat, { type: "stone", stone: type });
			command(w, seat, { type: "begin" });
			for (let i = 0; i < n; i++) step(w);
			command(w, seat, { type: "release" });
			advance(w, 7);
			const impacts = w.events.filter(
				(e) => e.type === "impact" && e.seat === seat,
			);
			equal(
				impacts.length,
				predicted.impacts.length,
				`stone${type} seat${seat} impact count`,
			);
			ok(
				impacts.every(
					(e, i) =>
						Math.hypot(
							e.x - predicted.impacts[i].x,
							e.z - predicted.impacts[i].z,
						) < 0.001,
				),
				`stone${type} seat${seat} prediction/live agreement`,
			);
			ok(
				w.events.filter((e) => e.type === "split").length ===
					(type === 2 ? 1 : 0),
				`stone${type} deterministic apex split`,
			);
		}
	const sweep = segmentBox(0, 100, 900, 100, { x: 430, z: 95, w: 4, h: 10 }, 3);
	ok(sweep > 0 && sweep < 1, "fast projectile sweeps thin block");
	// Charge stops full, cancellation and buffer semantics.
	{
		const w = createWorld();
		shot(w, 0.03);
		equal(w.stats.shots, [0, 0], "short hold cancels safely");
		command(w, 0, { type: "begin" });
		advance(w, 2);
		equal(w.players[0].charge.power, 1, "charge stops at full");
		command(w, 0, { type: "stone", stone: 1 });
		equal(w.players[0].stone, 0, "stone locked while charging");
		command(w, 0, { type: "cancel" });
		equal(w.players[0].charge, null, "cancel charge");
		shot(w, 0.6);
		command(w, 0, { type: "begin" });
		ok(w.players[0].buffer, "reload press buffered");
		command(w, 0, { type: "release" });
		advance(w, 2);
		equal(w.stats.shots[0], 1, "released buffer never fires");
		command(w, 0, { type: "begin" });
		advance(w, 0.4);
		command(w, 0, { type: "release" });
		ok(w.stats.shots[0] === 2, "fresh charge after reload");
	}
	{
		const w = createWorld();
		command(w, 0, { type: "begin" });
		command(w, 1, { type: "begin" });
		advance(w, 0.7);
		command(w, 1, { type: "release" });
		advance(w, 0.2);
		command(w, 0, { type: "release" });
		equal(
			w.stats.shots,
			[1, 1],
			"simultaneous independent holds opposite release order",
		);
	}
	// Every objective is reachable when exposed, all five authored layouts connect.
	for (let court = 0; court < 5; court++) {
		const base = createWorld({ court });
		ok(
			validateCourt({ version: 1, layout: COURTS[court].layout }).valid,
			`court${court} valid supports`,
		);
		for (let seat = 0; seat < 2; seat++) {
			let all = true;
			for (const b of base.blocks.filter(
				(b) => b.seat === 1 - seat && !b.foundation,
			)) {
				const w = pack(base);
				for (const x of w.blocks)
					if (x.seat === b.seat && !x.foundation && x.id !== b.id)
						x.alive = false;
				let hit = false;
				for (let i = 15; i <= 100 && !hit; i++) {
					const p = predict(w, seat, i / 100, 0);
					hit = p.impacts.some((h) => h.target === "block" && h.id === b.id);
				}
				if (!hit) all = false;
			}
			ok(all, `court${court} seat${seat} every last fragment reachable`);
		}
	}
	const find = (w, target, seat = 0, type = 0) => {
		for (let i = 100; i < 1000; i++) {
			const pr = predict(w, seat, i / 1000, type);
			if (pr.impacts.some((h) => h.target === target)) return i / 1000;
		}
		return null;
	};
	for (const target of ["crew", "launcher"]) {
		const w = createWorld();
		const power = find(w, target);
		ok(power !== null, target + " reachable");
		shot(w, power);
		advance(w, 7);
		const hits = w.events.filter((e) => e.type === target);
		equal(hits.length, 1, target + " interruption occurs");
		ok(w.stats.recoveries >= 1, target + " returns");
		equal(
			w.players[0].score,
			target === "crew" ? 7 : 13,
			target + " weighted direct score",
		);
	}
	// Direct fixture places a real swept projectile at a target; tests recovery state transitions without bypassing damage resolution.
	const near = (w, target, seat = 0, id = 91) => {
		const p = w.players[1 - seat],
			x = target === "crew" ? p.crewX : p.x;
		w.throws[id] = { hit: [], disabled: [] };
		w.projectiles.push({
			id,
			throwId: id,
			seat,
			type: 0,
			x: x - 20 * (seat ? -1 : 1),
			z: 55,
			vx: 600 * (seat ? -1 : 1),
			vz: 0,
			age: 0,
			fragment: false,
			power: 0.5,
			gravity: 120,
		});
	};
	{
		const w = createWorld();
		command(w, 1, { type: "begin" });
		near(w, "crew");
		advance(w, 0.1);
		ok(w.players[1].crewUntil > w.time, "crew retreats");
		equal(w.players[1].charge, null, "interrupt cancels charge");
		ok(!command(w, 1, { type: "begin" }), "absent crew cannot charge");
		near(w, "launcher", 0, 92);
		advance(w, 0.1);
		ok(
			w.players[1].launcherUntil > w.players[1].crewUntil,
			"overlap uses later repair endpoint",
		);
		const end = Math.max(w.players[1].crewUntil, w.players[1].launcherUntil);
		advance(w, end - w.time + 0.02);
		ok(w.players[1].protectUntil > w.time, "return protected");
		equal(w.players[1].held, false, "no returning queued shot");
		const score = w.players[0].score;
		near(w, "crew", 0, 93);
		advance(w, 0.08);
		equal(w.players[0].score, score, "protected hit no repeat score");
		ok(w.players[1].crewUntil < w.time, "protected hit no re-disable");
	}
	{
		const w = createWorld();
		near(w, "crew", 0, 97);
		near(w, "crew", 0, 97);
		advance(w, 0.1);
		equal(w.stats.crew, 1, "same split/throw cannot multiply crew duration");
		equal(w.players[0].score, 7, "same throw cannot farm crew score");
	}
	{
		const w = createWorld();
		const victim = w.blocks.find(
			(b) => b.seat === 1 && !b.foundation && b.z === 40,
		);
		victim.alive = false;
		victim.hp = 0;
		const score = w.players[0].score;
		const ids = collapse(w);
		ok(ids.length > 0, "removing support cascades");
		equal(w.players[0].score, score, "cascade gives no direct score");
		ok(
			w.blocks.filter((b) => b.foundation).every((b) => b.alive),
			"foundations remain stable",
		);
		ok(
			w.blocks
				.filter((b) => ids.includes(b.id))
				.every((b) => !b.alive && b.hp === 0),
			"collapse removed from collision/objective state",
		);
	}
	{
		const w = createWorld({ bout: 7 });
		w.players[0].score = 13;
		finish(w, 0);
		equal(
			w.outcome.banked,
			[91, 0],
			"one-based weighted score banks winner only",
		);
		ok(!finish(w, 1), "outcome exactly once");
		equal(w.projectiles, [], "old shots cleared on outcome");
	}
	{
		const w = createWorld();
		for (const b of w.blocks) if (!b.foundation) b.alive = false;
		step(w);
		equal(w.outcome.winner, -1, "mutual objective loss same tick is draw");
	}
	{
		const w = createWorld({ limit: 0.01 });
		step(w);
		step(w);
		equal(w.outcome.winner, -1, "equal timeout is draw");
		equal(w.outcome.reason, "time", "visible deadline");
	}
	{
		const w = createWorld();
		w.players[0].score = 7;
		timeout(w);
		equal(w.outcome.winner, 0, "timeout tied health uses direct score");
	}
	{
		const w = createWorld();
		w.blocks.find((b) => b.seat === 0 && !b.foundation).hp -= 1;
		w.players[0].score = 100;
		timeout(w);
		equal(w.outcome.winner, 1, "timeout health percentage precedes score");
	}
	{
		const w = createWorld({
			config: { gravity: NaN, reload: -30, maxSpeed: 999 },
		});
		ok(
			Number.isFinite(w.config.gravity) &&
				w.config.reload > 0 &&
				w.config.maxSpeed <= 390,
			"tuning validates finite ranges",
		);
		equal(unpack(pack(w)), w, "serializable complete world round trip");
	}
	// Persistence denial and corrupt/old data.
	const memory = {
		data: null,
		getItem() {
			return this.data;
		},
		setItem(k, v) {
			this.data = v;
		},
	};
	for (const value of [
		"{",
		JSON.stringify({ version: 0, settings: { music: 0.9 }, tour: { next: 9 } }),
	]) {
		memory.data = value;
		const l = load(memory);
		equal(l.settings.music, 0.1, "corrupt/old settings safe defaults");
		equal(l.tour, null, "corrupt/old tour rejected");
	}
	{
		const denied = {
			getItem() {
				throw Error("denied");
			},
			setItem() {
				throw Error("denied");
			},
		};
		equal(load(denied).settings.music, 0.1, "denied storage boot");
		ok(!save({}, null, denied), "denied storage write nonfatal");
	}
	{
		const s = load(memory).settings;
		s.fire1 = "KeyF";
		s.prev1 = "KeyA";
		s.uiScale = 1.1;
		s.seat1 = "pad0";
		const t = { next: 4, totals: [10, 30], seed: 52, cheated: false };
		save(s, t, memory);
		const v = load(memory);
		equal(v.tour, t, "tour between-bout save restores");
		equal(
			[
				v.settings.fire1,
				v.settings.prev1,
				v.settings.uiScale,
				v.settings.seat1,
			],
			["KeyF", "KeyA", 1.1, "pad0"],
			"bindings/scale/seat settings retained",
		);
	}
	{
		ok(
			!validateCourt({ version: 1, layout: [[0, 40, 20, 20, "stone"]] }).valid,
			"unsupported author court rejected",
		);
		const w = createWorld();
		ok(
			validateCourt({ version: 1, blocks: w.blocks }).valid,
			"block author export/import validates",
		);
		const bad = pack(w).blocks;
		bad[4].supports = [9999];
		ok(
			!validateCourt({ version: 1, blocks: bad }).valid,
			"missing author support rejected",
		);
		const foreign = pack(w).blocks;
		foreign[4].supports = [
			foreign.find((b) => b.seat === 1 && b.foundation).id,
		];
		ok(
			!validateCourt({ version: 1, blocks: foreign }).valid,
			"foreign-castle support rejected",
		);
		const outside = pack(w).blocks;
		outside[4].x = 320;
		ok(
			!validateCourt({ version: 1, blocks: outside }).valid,
			"author keeps blocks inside supported collision court footprint",
		);
	}
	// Human-paced entry path through runtime; pause cancels and freezes; slow speed and one-step dev paths.
	{
		const app = createRuntime({
			headless: true,
			loop: false,
			storage: { getItem: () => null, setItem() {} },
		});
		app.start("quick", { teaching: true, difficulty: "easy", seed: 17 });
		app.command(0, { type: "begin" });
		app.game.advance(0.75);
		ok(
			app.world.players[0].charge.power > 0.5 &&
				app.world.players[0].charge.power < 0.6,
			"human-paced .75s hold yields understandable tension",
		);
		app.pause();
		const t = app.world.tick;
		app.game.advance(1);
		equal(app.world.tick, t, "standalone pause freezes simulation");
		equal(app.world.players[0].charge, null, "pause cancels pending charge");
		app.resume();
		app.game.advance(1);
		equal(app.world.stats.shots[0], 0, "resume does not fire held input");
		app.dev.speed = 0.5;
		const tick = app.world.tick;
		app.game.advance(1);
		equal(app.world.tick - tick, 60, "developer half-speed works");
		app.dev.paused = true;
		app.dev.step = true;
		const before = app.world.tick;
		app.game.advance(DT);
		equal(app.world.tick, before + 1, "developer exact one-step works");
		app.dispose();
	}
	// Practice and same-device play must never mutate the saved solo tour.
	{
		const storage = {
			data: null,
			getItem() {
				return this.data;
			},
			setItem(k, v) {
				this.data = v;
			},
		};
		const app = createRuntime({ headless: true, loop: false, storage });
		app.start("solo", { seed: 83 });
		const before = JSON.stringify(app.savedTour);
		app.playLesson();
		equal(app.mode, "quick", "lesson replay uses independent practice duel");
		equal(app.tour, null, "quick lesson has no active solo score bank");
		equal(
			JSON.stringify(app.savedTour),
			before,
			"lesson replay preserves saved tour",
		);
		const w = app.world;
		w.players[0].score = 13;
		finish(w, 0);
		app.game.advance(2);
		equal(
			JSON.stringify(app.savedTour),
			before,
			"practice result never overwrites saved tour",
		);
		app.start("local", { war: true });
		app.start("local", { war: false });
		equal(app.tour, null, "single local duel clears prior local war ledger");
		app.dispose();
	}
	// Exact idle threshold, consumed exit handled in browser adapter tests.
	{
		const app = createRuntime({
			headless: true,
			loop: false,
			storage: { getItem: () => null, setItem() {} },
		});
		app.setScreen("settings");
		app.focus = 3;
		app.game.advance(10 - DT);
		equal(app.mode, "title", "no attract before ten seconds");
		app.game.advance(DT);
		equal(app.mode, "attract", "attract at exactly ten seconds");
		app.game.advance(30);
		ok(
			app.world.stats.shots.reduce((a, b) => a + b, 0) > 0,
			"attract runs real legal simulation",
		);
		equal(app.savedTour, null, "attract never writes tour");
		app.game.advance(60);
		ok(
			app._attractHistory?.length >= 2,
			"attract showcase cycles two court moods",
		);
		ok(
			app._attractHistory.every((x) => x.outcome),
			"attract leaves time for actual outcome ceremony",
		);
		app.title();
		equal(
			app.world.stats.shots,
			[0, 0],
			"attract exit clears simulation state",
		);
		equal(
			[app.screen, app.focus],
			["settings", 3],
			"attract restores prior menu focus",
		);
		app.dispose();
	}
	// All authored rival/court combinations finish through legal AI, bounded duration.
	for (let court = 0; court < 5; court++) {
		const w = createWorld({
			court,
			seed: 81 + court,
			ai: [
				{ style: "mason", perfect: true, reaction: 0.8, breadth: 81 },
				RIVALS[court * 2 + 1],
			],
		});
		while (w.phase === "play") step(w);
		ok(w.outcome && w.time <= 90, `court${court} rival completes`);
		ok(
			w.stats.shots.every((n) => n > 0),
			`court${court} both AI use legal shots`,
		);
		ok(
			w.blocks.every((b) => Number.isFinite(b.hp)) &&
				w.projectiles.every((s) => Number.isFinite(s.x)),
			`court${court} no NaN`,
		);
		evidence.courts.push({
			court,
			time: w.time,
			outcome: w.outcome,
			stats: w.stats,
		});
	}
	// Complete tour via real runtime entry, one skilled test driver sending only legal commands.
	{
		memory.data = null;
		const app = createRuntime({ headless: true, loop: false, storage: memory });
		app.start("solo", { seed: 88417 });
		let guard = 0;
		let drive = null;
		let runShots = 0;
		const coverage = {
			stones: new Set(),
			crew: 0,
			launcher: 0,
			collapse: 0,
			teaching: false,
			loss: false,
		};
		while (app.screen !== "championship" && guard < 130000) {
			guard++;
			const w = app.world,
				p = w.players[0];
			if (app.screen === "play" && w.phase === "play" && w.bout !== 4) {
				if (
					!drive &&
					!p.charge &&
					p.reloadUntil <= w.time &&
					Math.max(p.crewUntil, p.launcherUntil) <= w.time
				) {
					let type = w.available[runShots % w.available.length];
					let q;
					if (w.bout === 1 && runShots < 2) {
						q = find(w, runShots === 0 ? "crew" : "launcher");
						type = 0;
					}
					const aim = q
						? { power: q, type }
						: planShot({ ...w, available: [type] }, 0, {
								style: "mason",
								breadth: 81,
							});
					command(w, 0, { type: "stone", stone: type });
					if (command(w, 0, { type: "begin" }))
						drive = {
							release:
								w.time +
								aim.power * w.config.chargeTime * (1 + w.config.assist * 0.5),
						};
				} else if (drive) {
					if (!p.charge) {
						drive = null;
					} else if (w.time >= drive.release) {
						command(w, 0, { type: "release" });
						runShots++;
						drive = null;
					}
				}
			}
			app.game.advance(DT);
			if (app.lesson?.phase === 2) coverage.teaching = true;
			if (app.screen === "result") {
				coverage.crew += w.stats.crew;
				coverage.launcher += w.stats.launcher;
				coverage.collapse += w.stats.collapses;
				for (const s of w.stats.used[0]) coverage.stones.add(s);
				coverage.loss ||= w.outcome.winner === 1;
				evidence.tour.push({
					bout: w.bout,
					court: w.court,
					time: w.time,
					outcome: w.outcome,
					stats: w.stats,
				});
				app.advance();
				drive = null;
			}
		}
		equal(evidence.tour.length, 10, "full tour plays all ten bouts");
		equal(
			[...new Set(evidence.tour.map((r) => r.court))],
			[0, 1, 2, 3, 4],
			"full tour visits five courts",
		);
		equal(app.screen, "championship", "tour reaches championship ceremony");
		ok(coverage.teaching, "teaching requires shot and actual hit");
		ok(
			coverage.loss,
			"a natural loss still advances through the complete tour",
		);
		equal(
			[...coverage.stones].sort(),
			[0, 1, 2],
			"tour demonstrates all three stones",
		);
		ok(
			coverage.crew > 0 && coverage.launcher > 0,
			"tour demonstrates both tactical interruptions",
		);
		ok(coverage.collapse > 0, "tour demonstrates support collapse");
		equal(app.savedTour, null, "completed tour clears resumable save");
		ok(app._tourHistory.length === 10, "tour results bank exactly once");
		const sum = [0, 1].map((s) =>
			evidence.tour.reduce((n, b) => n + b.outcome.banked[s], 0),
		);
		equal(app.tour.totals, sum, "tour weighted totals reconcile");
		app.start("solo", { seed: 999 });
		equal(app.world.bout, 1, "championship replay starts fresh run");
		ok(
			!app.world.invulnerable && app.dev.speed === 1,
			"cheat and attract assistance do not leak into fresh play",
		);
		app.dispose();
		evidence.coverage = { ...coverage, stones: [...coverage.stones] };
	}
	return { checks, failures, evidence };
}
if (process.argv[1]?.endsWith("simulation.mjs")) {
	const r = await runSimulation();
	for (const f of r.failures) console.error("FAIL " + f);
	console.log(`${r.checks} checks, ${r.failures.length} failures`);
	const fs = await import("node:fs");
	fs.writeFileSync(
		new URL("../artifacts/simulation.json", import.meta.url),
		JSON.stringify(r, null, 2),
	);
	process.exitCode = r.failures.length ? 1 : 0;
}
