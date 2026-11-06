import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function runCoreTests() {
	const out = [],
		check = (name, fn) => {
			try {
				const x = fn();
				out.push({
					name,
					pass: x !== false,
					detail: x === false ? "Assertion returned false" : "",
				});
			} catch (e) {
				out.push({ name, pass: false, detail: e.stack });
			}
		},
		assert = (v, m) => {
			if (!v) throw Error(m);
		};
	for (const f of [
		"vendor/engine/my-3d2dge.js",
		"src/world.js",
		"src/render.js",
		"src/sim.js",
	])
		vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"), {
			filename: f,
		});
	const w = new HappyWorld(),
		newSim = (c) => {
			const s = new HappySim(w);
			s.start({ mode: "trial", course: 0, profile: 2, laps: 1, ...c });
			return s;
		},
		advance = (s, sec, input) => {
			for (let i = 0; i < Math.ceil(sec * 120); i++)
				s.step(1 / 120, typeof input === "function" ? input(s) : input || []);
		},
		driver = (s) => [{ ...s.aiIntent(s.cars[0], 1.24), ai: true }],
		evidence = [];
	check("World schema, five original circuits and safe restart anchors", () => {
		assert(w.courses.length === 5, "course count");
		assert(w.validate().length === 0, w.validate().join(";"));
		assert(
			w.courses.every((c) => c.gates.length === 12),
			"gate count",
		);
	});
	check(
		"A sixth authored course is selectable and completes a legal lap",
		() => {
			const data = HappyWorld.COURSE_DATA;
			data.push({
				...data[0],
				id: "authoring-sixth",
				name: "Sixth Authoring Check",
				points: data[0].points.map((p) => [...p]),
			});
			try {
				const extended = new HappyWorld(),
					s = new HappySim(extended);
				s.start({ mode: "trial", course: 5, profile: 2, laps: 1 });
				assert(
					s.courseIndex === 5 && s.course.id === "authoring-sixth",
					"sixth course was clamped away",
				);
				for (let i = 0; i < 120 * 75 && s.state !== "finished"; i++)
					s.step(1 / 120, driver(s));
				assert(
					s.state === "finished" &&
						s.cars[0].route.lap === 1 &&
						s.cars[0].route.valid,
					"sixth-course lap was not legal",
				);
				const restored = new HappySim(extended);
				assert(
					restored.applySnapshot(s.snapshot()) && restored.courseIndex === 5,
					"sixth course snapshot rejected",
				);
			} finally {
				data.pop();
			}
		},
	);
	check("Four handling profiles and exact matched tan/blue physics", () => {
		const [a, b, c, d, e] = HappyRules.PROFILES;
		assert(new Set([a.top, b.top, c.top, d.top]).size === 4, "four profiles");
		for (const key of ["top", "accel", "turn", "grip"])
			assert(d[key] === e[key], `matched ${key}`);
		assert(
			b.accel > c.accel &&
				c.accel > d.accel &&
				a.grip > c.grip &&
				c.grip > d.grip,
			"handling ladder",
		);
	});
	check(
		"Countdown freezes every velocity and pose without reverse creep",
		() => {
			const s = newSim(),
				c = s.cars[0],
				p = [c.x, c.y];
			advance(s, 2.8, [{ brake: 1 }]);
			assert(c.x === p[0] && c.y === p[1] && c.speed === 0, "grid moved");
		},
	);
	check(
		"Long held brake stops at rest and release resumes acceleration",
		() => {
			const s = newSim();
			advance(s, 3.1);
			advance(s, 2, [{ steer: 0, brake: 0 }]);
			advance(s, 20, [{ steer: 0, brake: 1 }]);
			const c = s.cars[0],
				p = [c.x, c.y];
			advance(s, 2, [{ brake: 1 }]);
			assert(
				Math.abs(c.speed) < 0.001 && Math.hypot(c.x - p[0], c.y - p[1]) < 0.01,
				"brake creeps",
			);
			advance(s, 1, [{ brake: 0 }]);
			assert(c.speed > 30, "release did not accelerate");
		},
	);
	check("Partial throttle and brake pressure preserve analog magnitude", () => {
		const run = (gas) => {
			const s = newSim();
			s.settings.auto = false;
			s.state = "running";
			advance(s, 0.8, [{ gas }]);
			return s.cars[0].speed;
		};
		assert(
			run(0.3) > run(0) + 10 && run(1) > run(0.3) + 25,
			"throttle boolean",
		);
		const brake = (v) => {
			const s = newSim();
			s.state = "running";
			const c = s.cars[0];
			c.speed = 100;
			c.vx = Math.cos(c.angle) * 100;
			c.vy = Math.sin(c.angle) * 100;
			advance(s, 0.1, [{ brake: v }]);
			return c.speed;
		};
		assert(brake(0.3) > brake(1) + 10, "brake boolean");
	});
	check("Road, grass, gravel and water have distinct motion/rules", () => {
		const tags = new Set();
		for (let y = 300; y < 5700; y += 75)
			for (let x = 300; x < 5700; x += 75) tags.add(w.surface(x, y));
		assert(
			["road", "grass", "gravel", "water"].every((t) => tags.has(t)),
			"surface absent",
		);
		const run = (tag) => {
			const s = newSim();
			s.state = "running";
			s.world = { ...w, solids: [], surface: () => tag };
			s.invulnerable = true;
			advance(s, 4, [{}]);
			return s.cars[0].speed;
		};
		assert(
			run("road") > run("gravel") && run("gravel") > run("grass"),
			"surfaces same speed",
		);
	});
	check(
		"Directed gate rejects reverse, outside/parallel and line oscillation",
		() => {
			const g = { x: 0, y: 0, angle: 0 };
			assert(HappyRules.crossGate(g, -5, 0, 5, 0, 40), "forward rejected");
			assert(!HappyRules.crossGate(g, 5, 0, -5, 0, 40), "reverse passed");
			assert(!HappyRules.crossGate(g, -5, 100, 5, 100, 40), "parallel passed");
			assert(!HappyRules.crossGate(g, 1, 0, 5, 0, 40), "oscillation passed");
		},
	);
	check("Skipping gates and start-line oscillation cannot create a lap", () => {
		const s = newSim();
		s.state = "running";
		const c = s.cars[0],
			g = s.course.gates[0];
		for (let i = 0; i < 20; i++) {
			const old = { x: g.x - Math.cos(g.angle), y: g.y - Math.sin(g.angle) };
			c.x = g.x + Math.cos(g.angle);
			c.y = g.y + Math.sin(g.angle);
			s.updateRoute(c, old, 1 / 120);
		}
		assert(c.route.lap === 0 && c.route.gate === 1, "manufactured lap");
	});
	check(
		"Teleport and off-route shortcuts cannot manufacture legal progress",
		() => {
			const s = newSim();
			s.state = "running";
			const c = s.cars[0],
				old = { x: c.x, y: c.y },
				g = s.course.gates[4];
			c.x = g.x;
			c.y = g.y;
			s.updateRoute(c, old, 1 / 120);
			assert(
				!c.route.valid && c.route.lap === 0 && c.route.gate === 1,
				"teleport accepted",
			);
			s.safeRestart(c);
			assert(c.route.gate === 1 && c.route.lap === 0, "reset awards gate");
		},
	);
	check(
		"A short continuous grass excursion can rejoin without gaining off-road distance",
		() => {
			const s = newSim(),
				c = s.cars[0],
				width = s.course.width;
			s.state = "running";
			const move = (d, offset) => {
				const old = { x: c.x, y: c.y },
					p = s.course.path.at(d);
				c.x = p.x - Math.sin(p.angle) * offset;
				c.y = p.y + Math.cos(p.angle) * offset;
				c.angle = p.angle;
				s.updateRoute(c, old, 1 / 120);
			};
			// Ease across the shoulder in physically continuous steps, then drive
			// parallel to the road before returning well before the next gate.
			for (let offset = 2; offset <= width + 20; offset += 2) move(6, offset);
			const before = c.route.total;
			for (let d = 7; d <= 106; d++) move(d, width + 20);
			assert(
				Math.abs(c.route.total - before) < 0.1,
				"grass awarded lead distance",
			);
			for (let offset = width + 18; offset >= 0; offset -= 2) move(106, offset);
			assert(
				c.route.valid && c.route.gate === 1 && c.route.d > 100,
				"ordinary reentry wrongly invalidated",
			);
		},
	);
	check(
		"A distant or wrong-road reentry requires an explicit route recovery",
		() => {
			const s = newSim(),
				c = s.cars[0],
				wrongRoad = w.courses[1].gates[0];
			s.state = "running";
			c.x = wrongRoad.x;
			c.y = wrongRoad.y;
			s.updateRoute(c, { x: c.x - 1, y: c.y }, 1 / 120);
			assert(
				!c.route.valid && c.route.gate === 1 && c.route.lap === 0,
				"wrong road silently remained valid",
			);
			s.safeRestart(c);
			assert(
				c.route.valid && c.route.gate === 1 && c.route.lap === 0,
				"last-gate recovery failed",
			);
		},
	);
	for (let course = 0; course < 5; course++)
		for (let profile = 0; profile < 5; profile++)
			check(`Legal AI lap course ${course + 1}, car ${profile + 1}`, () => {
				const s = newSim({ course, profile });
				s.aiAll = true;
				for (let i = 0; i < 120 * 210 && s.state !== "finished"; i++)
					s.step(1 / 120);
				evidence.push({
					course,
					profile,
					state: s.state,
					time: s.t,
					laps: s.cars[0].route.lap,
					valid: s.cars[0].route.valid,
				});
				assert(
					s.state === "finished" &&
						s.cars[0].route.lap === 1 &&
						s.cars[0].route.valid,
					JSON.stringify(evidence.at(-1)),
				);
			});
	check("Classic five-lap time trial finishes through actual driving", () => {
		const s = newSim({ laps: 5 });
		for (let i = 0; i < 120 * 350 && s.state !== "finished"; i++)
			s.step(1 / 120, driver(s));
		assert(
			s.state === "finished" && s.cars[0].route.splits.length === 5,
			"five laps incomplete",
		);
		assert(s.ghost.length > 1000, "ghost not captured");
	});
	const duel = () => {
		const s = newSim({ mode: "duel", humans: 2, target: 10 });
		s.state = "running";
		return s;
	};
	check("Duel one crash gives exactly two and stages a safe exchange", () => {
		const s = duel();
		s.resolveDuel([1]);
		assert(
			s.score[0] === 2 && s.state === "exchange" && s.exchange === 1,
			"crash score",
		);
		s.resolveDuel([1]);
		assert(s.score[0] === 2, "duplicate award");
		assert(
			Math.hypot(s.cars[0].x - s.cars[1].x, s.cars[0].y - s.cars[1].y) > 16,
			"restart overlap",
		);
	});
	check("Duel simultaneous crashes tie with zero points", () => {
		const s = duel();
		s.resolveDuel([0, 1]);
		assert(
			s.score.every((n) => n === 0) && s.state === "exchange",
			"simultaneous scoring",
		);
	});
	check("Crash takes priority over a pending lead", () => {
		const s = duel();
		s.cars[0].route.total = 600;
		s.leadT = 0.34;
		s.resolveDuel([0]);
		assert(s.score[1] === 2 && s.score[0] === 0, "priority");
	});
	check("Lead threshold uses legal distance and awards only once", () => {
		const s = duel();
		s.cars[0].route.total = 400;
		for (let i = 0; i < 45; i++) s.resolveDuel([]);
		assert(s.score[0] === 1 && s.exchange === 1, "lead wrong");
	});
	check("Wrong-way/invalid route cannot qualify for lead", () => {
		const s = duel();
		s.cars[0].route.total = 900;
		s.cars[0].route.valid = false;
		for (let i = 0; i < 80; i++) s.resolveDuel([]);
		assert(s.score[0] === 0, "invalid lead");
	});
	check("Winning point finishes before another exchange", () => {
		const s = duel();
		s.score[0] = 9;
		s.resolveDuel([1]);
		assert(
			s.state === "finished" && s.exchange === 0 && s.score[0] === 11,
			"extra exchange",
		);
	});
	check("Deadline tie produces draw and no invented winner", () => {
		const s = duel();
		s.limit = 0.01;
		advance(s, 0.02, [{ brake: 1 }, { brake: 1 }]);
		assert(
			s.state === "finished" && s.finishedResult.reason.includes("draw"),
			"tie wrong",
		);
	});
	check("Manual recovery counts once as rival crash", () => {
		const s = duel();
		advance(s, 0.7, [{ recover: true, brake: 1 }, { brake: 1 }]);
		assert(s.score[1] === 2 && s.exchange === 1, "recovery score");
	});
	check(
		"Time trial recovery charges one visible penalty and keeps lap legal",
		() => {
			const s = newSim();
			s.state = "running";
			advance(s, 1.6, [{ brake: 1, recover: true }]);
			assert(
				s.penalty === 3 &&
					s.cars[0].route.lap === 0 &&
					s.cars[0].route.gate === 1,
				"penalty",
			);
		},
	);
	check("Coincident cars resolve finite contact without NaN", () => {
		const s = duel(),
			a = s.cars[0],
			b = s.cars[1];
		b.x = a.x;
		b.y = a.y;
		advance(s, 0.01, [{ brake: 1 }, { brake: 1 }]);
		assert([a.x, a.y, b.x, b.y].every(Number.isFinite), "nonfinite contact");
		assert(Math.hypot(a.x - b.x, a.y - b.y) >= 15.9, "unresolved contact");
	});
	check("Real scored AI pursuit reaches results and resets for rematch", () => {
		const s = newSim({
			mode: "duel",
			profile: 3,
			opponent: 0,
			target: 10,
			humans: 1,
		});
		for (let i = 0; i < 120 * 260 && s.state !== "finished"; i++)
			s.step(1 / 120, driver(s));
		assert(
			s.state === "finished" && s.score[0] >= 10,
			"duel did not finish scored",
		);
		s.start({ mode: "duel", target: 10 });
		assert(
			s.score.every((v) => v === 0) && s.state === "countdown",
			"rematch retained score",
		);
	});
	check(
		"Full guided tour completes by driving every stage and scenic connector",
		() => {
			const s = newSim({ mode: "tour", profile: 2 });
			const stages = [];
			for (let k = 0; k < HappyRules.TOUR.length; k++) {
				for (let i = 0; i < 120 * 260 && s.state !== "finished"; i++)
					s.step(1 / 120, driver(s));
				stages.push({
					step: k,
					state: s.state,
					t: s.t,
					score: s.score.slice(),
				});
				assert(s.state === "finished", `stage ${k} stuck`);
				if (k === 5) assert(Math.max(...s.score) > 0, "duel no scoring");
				s.continueTour();
			}
			assert(s.tourComplete && s.state === "finished", "tour ending");
			fs.writeFileSync(
				path.join(root, "evidence/tour-playthrough.json"),
				JSON.stringify(stages, null, 2),
			);
		},
	);
	check(
		"Connected navigation reaches all five paddocks and hidden straight on roads",
		() => {
			const from = w.courses[0].gates[0];
			for (const to of [...w.courses.map((c) => c.gates[0]), w.drag.start]) {
				const nav = w.routeBetween(from, to);
				assert(nav && nav.length >= 0, "unreachable paddock");
				assert(
					nav.samples.every((p) => w.surface(p.x, p.y) === "road"),
					"navigation leaves road",
				);
			}
		},
	);
	check(
		"Free drive has no laps/score and discoveries use real approach",
		() => {
			const s = newSim({ mode: "free" });
			s.aiAll = true;
			advance(s, 60);
			assert(
				s.cars[0].route.lap === 0 && s.score.every((n) => n === 0),
				"free has competition",
			);
			assert(s.discovered.has(w.courses[0].id), "discovery missing");
		},
	);
	check(
		"Live tuning changes intended car values and reset restores defaults",
		() => {
			const s = newSim(),
				c = s.cars[0],
				old = c.o.top;
			s.tuning.speed = 1.5;
			s.tuning.acceleration = 1.4;
			s.tuning.roadGrip = 0.8;
			s.applyProfile(c);
			assert(
				c.o.top === old * 1.5 &&
					c.o.accel === HappyRules.PROFILES[2].accel * 1.4,
				"tune ignored",
			);
			s.tuning = { ...HappyRules.DEFAULTS };
			s.applyProfile(c);
			assert(c.o.top === old, "reset wrong");
		},
	);
	check("Snapshots restore both cars, route and authoritative score", () => {
		const a = duel();
		advance(a, 0.3, [{}, {}]);
		a.score = [3, 5];
		const b = duel();
		assert(b.applySnapshot(a.snapshot()), "restore rejected");
		assert(
			JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()),
			"snapshot differs",
		);
		assert(
			!b.applySnapshot({ ...a.snapshot(), cars: [{ x: NaN }] }),
			"malformed accepted",
		);
	});
	check(
		"Native 80-degree overhead render and procedural shapes draw headlessly",
		() => {
			const s = newSim(),
				g = new My3D2dge.Game({
					headless: true,
					draw: true,
					res: [640, 360],
					view: "topdown",
					menu: false,
					autoPause: false,
				}),
				r = new HappyRenderer(g, w);
			g.start({
				update(dt) {
					s.step(dt, driver(s));
					r.update(dt, s);
					g.focus(s.cars[0].x, s.cars[0].y, 0);
				},
				draw(v) {
					r.draw(v, s, { dev: true });
				},
			});
			g.advance(0.1);
			assert(!g.errors.length, JSON.stringify(g.errors));
			g.dispose();
		},
	);
	check(
		"Hidden straight times a real acceleration run and uses one passport identity",
		() => {
			const s = newSim({ mode: "free" });
			s.state = "running";
			const c = s.cars[0],
				start = w.drag.start;
			Object.assign(c, {
				x: start.x,
				y: start.y,
				angle: 0,
				speed: 0,
				vx: 0,
				vy: 0,
			});
			advance(s, 0.15, [{ brake: 1 }]);
			assert(s.dragRun, "start marker inactive");
			for (
				let i = 0;
				i < 120 * 25 && !s.events.some((e) => e.type === "dragFinish");
				i++
			)
				s.step(1 / 120, [{ steer: 0, brake: 0 }]);
			const finish = s.events.find((e) => e.type === "dragFinish");
			assert(
				finish &&
					finish.time > 5 &&
					finish.time < 25 &&
					s.dragBest === finish.time,
				"timed finish missing",
			);
			assert(
				s.events
					.filter((e) => e.type === "discovery")
					.every((e) => w.discoveries.some((d) => d.id === e.id)),
				"extra passport identity",
			);
		},
	);
	check(
		"AI recovers an invalid route in finite time with one crash award",
		() => {
			const s = newSim({ mode: "duel", humans: 1, target: 10 });
			s.state = "running";
			s.cars[1].route.valid = false;
			advance(s, 0.8, [{ brake: 1 }]);
			assert(
				s.score[0] === 2 && s.exchange === 1 && s.cars[1].route.valid,
				"AI did not recover safely",
			);
		},
	);
	check("Holding Recover triggers once until released", () => {
		const s = newSim();
		s.state = "running";
		advance(s, 8, [{ brake: 1, recover: true }]);
		assert(s.penalty === 3, "held recovery repeated");
		advance(s, 0.1, [{ brake: 1, recover: false }]);
		advance(s, 0.7, [{ brake: 1, recover: true }]);
		assert(s.penalty === 6, "release did not rearm recovery");
	});
	fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
	fs.writeFileSync(
		path.join(root, "evidence/core-playthrough.json"),
		JSON.stringify(evidence, null, 2),
	);
	return out;
}
