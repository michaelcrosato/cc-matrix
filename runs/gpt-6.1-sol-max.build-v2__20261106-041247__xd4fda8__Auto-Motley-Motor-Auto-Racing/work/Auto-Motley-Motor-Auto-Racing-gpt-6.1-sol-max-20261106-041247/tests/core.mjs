import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

export function loadCore() {
	const ctx = {
		console,
		performance,
		structuredClone,
		setTimeout,
		clearTimeout,
	};
	ctx.window = ctx;
	vm.createContext(ctx);
	for (const f of [
		"vendor/engine/my-3d2dge.js",
		"src/data.js",
		"src/world.js",
		"src/sim.js",
		"src/storage.js",
		"src/art.js",
	])
		vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
	return ctx;
}

export async function coreTests(test, filter) {
	const ctx = loadCore(),
		M = ctx.MM,
		E = ctx.My3D2dge,
		W = new M.World();
	await test("data schemas", () => assert.equal(M.validateData().length, 0));
	await test("matching profiles identical", () =>
		assert.deepEqual(M.CARS[3].physics, M.CARS[4].physics));
	await test("independent named random streams", () => {
		const a = M.namedRng(7, "rules"),
			b = M.namedRng(7, "rules"),
			c = M.namedRng(7, "cosmetic");
		for (let i = 0; i < 30; i++) {
			c();
			assert.equal(a(), b());
		}
	});
	await test("countdown holds both cars exactly still", () => {
		const s = new M.Simulation(W, { mode: "duel" }),
			p = s.snapshot().cars.map((c) => c.slice(1, 4));
		for (let i = 0; i < 350; i++)
			s.step([{ gas: 1, brake: 1, steer: 1 }, { gas: 1 }]);
		assert.deepEqual(
			s.snapshot().cars.map((c) => c.slice(1, 4)),
			p,
		);
	});
	await test("held brake never reverses and release accelerates", () => {
		const s = new M.Simulation(W, { countdown: 0 });
		s.step();
		for (let i = 0; i < 1200; i++) s.step([{ brake: 1 }]);
		assert.equal(s.drivers[0].car.speed, 0);
		for (let i = 0; i < 120; i++) s.step([{ gas: 1 }]);
		assert.ok(s.drivers[0].car.speed > 25);
	});
	await test("partial analog brake survives normalization", () => {
		assert.equal(M.intent({ brake: 0.37 }).brake, 0.37);
		const velocities = [0, 0.35, 1].map((brake) => {
			const c = new E.Car({ x: 500, y: 500, reverse: 0, accel: 52 });
			c.vx = c.speed = 100;
			for (let i = 0; i < 30; i++) c.update(M.DT, null, { brake });
			return c.speed;
		});
		assert.ok(velocities[0] > velocities[1] && velocities[1] > velocities[2]);
	});
	await test("surface speed and grip differ", () => {
		const samples = ["road", "grass", "gravel"].map((tag) => {
			const c = new E.Car({
				ground: () => tag,
				surfaces: {
					road: { top: 1, grip: 1 },
					grass: { top: 0.42, grip: 0.66 },
					gravel: { top: 0.7, grip: 0.43 },
				},
				reverse: 0,
			});
			for (let i = 0; i < 600; i++) c.update(M.DT, null, { gas: 1 });
			return c.speed;
		});
		assert.ok(samples[0] > samples[2] && samples[2] > samples[1]);
	});
	await test("nonfinite and malformed intents neutralized", () => {
		const r = M.intent({ steer: Infinity, gas: NaN, brake: "1", recover: 1 });
		assert.equal(r.steer, 0);
		assert.equal(r.gas, 0);
		assert.equal(r.brake, 0);
		assert.equal(r.recover, false);
	});
	await test("all restart slots clear visible solids and water", () => {
		for (const C of W.courses)
			for (const a of C.anchors)
				for (const side of [-12, 0, 12])
					assert.ok(
						W.safe(
							a.x - Math.sin(a.angle) * side,
							a.y + Math.cos(a.angle) * side,
						),
						"Unsafe " + C.id + " gate " + a.gate,
					);
	});
	await test("all courses reachable through lane graph", () => {
		for (const C of W.courses) {
			const p = W.graphPath(W.courses[0].at(0), C.at(0));
			assert.ok(p.length > 0);
		}
	});
	await test("a sixth circuit is authored with data only", () => {
		const sixth = {
			...M.COURSE_DATA[0],
			id: "sixth",
			name: "Another lane",
			points: M.COURSE_DATA[0].points.map(([x, y]) => [x + 30, y + 30]),
		};
		M.COURSE_DATA.push(sixth);
		try {
			assert.equal(M.validateData().length, 0);
			const other = new M.World();
			assert.equal(other.courses.length, 6);
			assert.equal(other.courses[5].id, "sixth");
			const s = new M.Simulation(other, { course: 5, countdown: 0 });
			assert.equal(s.course.id, "sixth");
		} finally {
			M.COURSE_DATA.pop();
		}
	});
	await test("start-line oscillation and reverse give no laps", () => {
		const C = W.courses[0],
			p = new M.Progress(C),
			g = C.gates[0];
		for (let i = 0; i < 20; i++) {
			const old = {
					x: g.x - Math.cos(g.angle) * 2,
					y: g.y - Math.sin(g.angle) * 2,
				},
				c = {
					x: g.x + Math.cos(g.angle) * 2,
					y: g.y + Math.sin(g.angle) * 2,
					angle: g.angle,
					speed: 20,
				};
			p.update(c, old, M.DT, i);
			p.update(old, c, M.DT, i);
		}
		assert.equal(p.laps, 0);
	});
	await test("skipping ordered gates cannot manufacture lap", () => {
		const C = W.courses[0],
			p = new M.Progress(C);
		for (const g of C.gates.slice(2).concat(C.gates[0])) {
			p.s = g.s - 1;
			const old = { x: g.x - Math.cos(g.angle), y: g.y - Math.sin(g.angle) },
				c = {
					x: g.x + Math.cos(g.angle),
					y: g.y + Math.sin(g.angle),
					angle: g.angle,
					speed: 40,
				};
			p.update(c, old, M.DT, 10);
		}
		assert.equal(p.laps, 0);
		assert.equal(p.next, 1);
	});
	await test("teleporting across gate cannot award progress", () => {
		const C = W.courses[0],
			p = new M.Progress(C),
			g = C.gates[1];
		p.s = g.s - 20;
		p.update(
			{ x: g.x + 40, y: g.y, angle: 0, speed: 60 },
			{ x: g.x - 40, y: g.y },
			M.DT,
			10,
		);
		assert.equal(p.gatesPassed, 0);
	});
	const duel = () => {
		const s = new M.Simulation(W, { mode: "duel", countdown: 0 });
		s.step();
		s.drivers.forEach((d) => {
			d.immune = 0;
		});
		return s;
	};
	await test("opponent crash awards exactly two once", () => {
		const s = duel();
		s.resolve([{ crash: true }, { crash: false }], M.DT);
		assert.equal(s.score[1], 2);
		s.resolve([{ crash: true }, { crash: false }], M.DT);
		assert.equal(s.score[1], 2);
		assert.equal(s.phase, "exchange");
	});
	await test("simultaneous crashes score zero", () => {
		const s = duel();
		s.resolve([{ crash: true }, { crash: true }], M.DT);
		assert.equal(s.score[0] + s.score[1], 0);
		assert.equal(s.phase, "exchange");
	});
	await test("crash takes priority over qualifying lead", () => {
		const s = duel();
		s.drivers[0].progress.distance = 2000;
		s.leadT = 0.5;
		s.resolve([{ crash: true }, { crash: false }], M.DT);
		assert.deepEqual(Array.from(s.score), [0, 2]);
	});
	await test("legal lead awards one after confirmation", () => {
		const s = duel();
		s.drivers[0].progress.distance = 500;
		for (let i = 0; i < 40; i++)
			s.resolve([{ crash: false }, { crash: false }], M.DT);
		assert.deepEqual(Array.from(s.score), [1, 0]);
	});
	await test("off-route projection cannot score a lead", () => {
		const s = duel();
		s.drivers[0].progress.distance = 500;
		s.drivers[0].progress.legal = false;
		for (let i = 0; i < 100; i++)
			s.resolve([{ crash: false }, { crash: false }], M.DT);
		assert.equal(s.score[0] + s.score[1], 0);
	});
	await test("winning score ends before another exchange", () => {
		const s = duel();
		s.score[0] = 9;
		s.resolve([{ crash: false }, { crash: true }], M.DT);
		assert.equal(s.phase, "finished");
		assert.equal(s.winner, 0);
		assert.equal(s.exchange, 0);
	});
	await test("deadline with tied scores produces a draw", () => {
		const s = duel();
		s.step([{ brake: 1 }, { brake: 1 }], M.DT, 181);
		assert.equal(s.phase, "finished");
		assert.equal(s.winner, null);
	});
	await test("manual recovery counts as a crash in duel", () => {
		const s = duel();
		for (let i = 0; i < 85; i++)
			s.step([{ recover: true, brake: 1 }, { brake: 1 }]);
		assert.equal(s.score[1], 2);
	});
	await test("time trial recovery adds fixed visible penalty", () => {
		const s = new M.Simulation(W, { countdown: 0 });
		s.step();
		s.drivers[0].immune = 0;
		for (let i = 0; i < 85; i++) s.step([{ recover: true, brake: 1 }]);
		assert.equal(s.drivers[0].penalty, 5);
	});
	await test("coincident cars separate to finite poses", () => {
		const s = duel(),
			a = s.drivers[0].car,
			b = s.drivers[1].car;
		b.x = a.x;
		b.y = a.y;
		s.step([{ brake: 1 }, { brake: 1 }]);
		assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 0.01);
	});
	await test("snapshots reject stale and malformed data", () => {
		const a = duel(),
			b = duel();
		for (let i = 0; i < 10; i++) a.step();
		const snap = a.snapshot();
		assert.ok(b.apply(snap));
		assert.equal(b.apply(snap), false);
		const bad = structuredClone(snap);
		bad.tick += 1;
		bad.cars[0][1] = NaN;
		assert.equal(b.apply(bad), false);
	});
	await test("authoritative finish at same physics tick is delivered", () => {
		const a = duel(),
			b = duel();
		for (let i = 0; i < 10; i++) a.step();
		assert.ok(b.apply(a.snapshot()));
		a.finish("Deadline", null);
		assert.ok(b.apply(a.snapshot()));
		assert.equal(b.phase, "finished");
	});
	await test("corrupt and unavailable storage does not block play", () => {
		for (const storage of [
			{ getItem: () => "{bad", setItem: () => {} },
			{
				getItem: () => {
					throw Error("blocked");
				},
				setItem: () => {
					throw Error("blocked");
				},
			},
		]) {
			const s = new M.SaveStore(storage);
			s.passport("meadow");
			assert.equal(s.data.passport[0], "meadow");
		}
	});
	await test("malformed best ghost is ignored without losing valid time", () => {
		const store = new M.SaveStore(null),
			s = new M.Simulation(W),
			key = store.recordKey(s);
		store.data.records[key] = { time: 50, physics: M.PHYSICS, ghost: [null] };
		assert.equal(store.best(s).time, 50);
		assert.equal(store.best(s).ghost.length, 0);
	});
	await test("two-car AI can pass and finish with pursuit points", () => {
		const s = new M.Simulation(W, {
			mode: "duel",
			course: 0,
			cars: [2, 4],
			countdown: 0,
			cap: 180,
		});
		for (let i = 0; i < 120 * 185 && s.phase !== "finished"; i++) s.step();
		assert.equal(s.phase, "finished");
		assert.ok(Math.max(...s.score) > 0, JSON.stringify(s.snapshot()));
	});
	await test("a contact push through a gate still counts on the next tick", () => {
		const C = W.courses[0],
			g = C.gates[1],
			p = new M.Progress(C, g.s - 2),
			pt = (d) => ({
				x: g.x + Math.cos(g.angle) * d,
				y: g.y + Math.sin(g.angle) * d,
				angle: g.angle,
				speed: 30,
				r: 7,
			});
		p.update(pt(-0.4), pt(-2), M.DT, 1);
		p.update(pt(0.9), pt(0.4), M.DT, 1 + M.DT);
		assert.equal(p.gatesPassed, 1);
	});
	await test("hidden airfield straight has a real timed finish", () => {
		const s = new M.Simulation(W, { mode: "free", countdown: 0, cap: 0 });
		s.step();
		const c = s.drivers[0].car;
		c.x = 4960;
		c.y = 4480;
		c.angle = Math.PI;
		c.vx = c.vy = c.speed = 0;
		for (let i = 0; i < 120 * 35 && !s.dragBest; i++)
			s.step([{ gas: 1, steer: 0 }]);
		assert.ok(s.dragBest && s.dragBest.time > 0 && s.dragBest.peak > 100);
		assert.ok(s.discoveries.has("airfield"));
	});
	await test("native headless renderer draws the driving scene without errors", () => {
		const game = new E.Game({
				headless: true,
				draw: true,
				view: "topdown",
				res: [640, 360],
				menu: false,
				corner: false,
			}),
			s = new M.Simulation(W, { countdown: 0 }),
			presentation = new M.Presentation(game, W);
		game.start({
			update: (dt) => {
				s.step();
				presentation.update(s, dt);
			},
			draw: (r) => presentation.draw(r, s),
		});
		game.advance(2, { draw: true });
		assert.equal(game.errors.length, 0, JSON.stringify(game.errors));
		game.dispose();
	});
	if (filter === "core") return;
	const evidence = [];
	for (let course = filter === "grand" ? 4 : 0; course < 5; course++)
		for (let car = 0; car < 5; car++)
			await test(
				"legal AI lap " + M.COURSE_DATA[course].id + "/" + M.CARS[car].id,
				() => {
					const s = new M.Simulation(W, {
						course,
						cars: [car],
						laps: 1,
						countdown: 0,
						cap: 0,
					});
					let firstOff = null;
					for (let i = 0; i < 120 * 270 && s.phase !== "finished"; i++) {
						s.step();
						const d = s.drivers[0];
						if (!d.progress.legal && !firstOff) {
							const q = s.course.project(d.car.x, d.car.y, d.progress.s, 12);
							firstOff = {
								time: s.time,
								x: d.car.x,
								y: d.car.y,
								s: d.progress.s,
								aiS: d.aiS,
								q,
							};
						}
					}
					const D = s.drivers[0];
					evidence.push({
						firstOff,
						course,
						car,
						phase: s.phase,
						time: s.time,
						lap: D.progress.laps,
						next: D.progress.next,
						crashes: D.crashes,
						x: D.car.x,
						y: D.car.y,
						s: D.progress.s,
						aiS: D.aiS,
					});
					assert.equal(s.phase, "finished", JSON.stringify(evidence.at(-1)));
					assert.equal(D.progress.laps, 1);
					assert.equal(D.crashes, 0, "AI should finish cleanly");
				},
			);
	fs.mkdirSync("docs/evidence", { recursive: true });
	fs.writeFileSync(
		"docs/evidence/ai-laps.json",
		JSON.stringify(evidence, null, 2),
	);
}
