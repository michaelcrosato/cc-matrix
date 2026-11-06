import "../vendor/engine/my-3d2dge.js";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
	World,
	pilotIntent,
	clockwise,
	sanitizeIntent,
	sweptCircle,
} from "../src/simulation.js";
import { createGame } from "../src/main.js";
import { createRecords } from "../src/storage.js";
import {
	DEFAULT_BALANCE,
	defaultContent,
	validateContent,
} from "../src/data/content.js";
const E = globalThis.My3D2dge;
export async function runSimulationTests() {
	const results = [];
	const test = async (name, fn) => {
		try {
			await fn();
			results.push({ name, pass: true });
		} catch (e) {
			results.push({ name, pass: false, detail: e.stack });
		}
	};
	const fixture = (n = 1) => {
		const w = new World({
			players: Array.from({ length: n }, (_, id) => ({ id, name: `P${id}` })),
		});
		w.state.transition = 0;
		w.state.waveTime = -100;
		for (const p of w.state.players) {
			p.invuln = 0;
			p.x = 480;
			p.y = 350;
		}
		return w;
	};
	const advance = (w, seconds, intents = {}) => {
		for (let i = 0; i < Math.round(seconds * 120); i++)
			w.step(1 / 120, typeof intents === "function" ? intents(w) : intents);
	};
	const eq = (a, b, eps = 1e-5) =>
		assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
	await test("intent diagonal normalization and hostile values", () => {
		const i = sanitizeIntent({
			mx: 99,
			my: 99,
			aim: Infinity,
			fire: 1,
			seq: -1,
		});
		eq(Math.hypot(i.mx, i.my), 1);
		assert.equal(i.aim, null);
		assert.equal(i.fire, false);
		assert.equal(i.seq, 0);
	});
	await test("clockwise zero seam and exact stop", () => {
		eq(clockwise(6.2, 0.1, 0.1), 0.01681469282);
		eq(clockwise(6.2, 0.1, 2), 0.1);
		eq(clockwise(0.2, 0.1, 0.1), 0.3);
		eq(clockwise(0.1, 0.1, 1), 0.1);
	});
	await test("swept collision catches a crossing and rejects a miss", () => {
		eq(sweptCircle(0, 0, 100, 0, 50, 0, 10), 0.4);
		assert.equal(sweptCircle(0, 20, 100, 20, 50, 0, 10), null);
		eq(sweptCircle(50, 0, 100, 0, 50, 0, 10), 0);
	});
	await test("direct movement acceleration and diagonal speed", () => {
		const a = fixture(),
			b = fixture();
		advance(a, 0.5, { 0: { mx: 1 } });
		advance(b, 0.5, { 0: { mx: 1, my: 1 } });
		eq(
			Math.hypot(a.state.players[0].vx, a.state.players[0].vy),
			Math.hypot(b.state.players[0].vx, b.state.players[0].vy),
		);
		assert.ok(a.state.players[0].x > 565);
	});
	await test("boundary sliding has no wrapping", () => {
		const w = fixture();
		advance(w, 6, { 0: { mx: 1, my: 0.4 } });
		const p = w.state.players[0];
		assert.equal(p.x, 947);
		assert.equal(p.vx, 0);
		assert.ok(p.y <= 527);
	});
	await test("exposure halves steady flight speed", () => {
		const w = fixture();
		w.state.players[0].shield = 10;
		advance(w, 0.8, { 0: { mx: 1 } });
		eq(w.state.players[0].vx, 115, 0.01);
	});
	await test("stationary requested bearing persists", () => {
		const w = fixture();
		advance(w, 0.1, { 0: { aim: 0.2 } });
		const a = w.state.players[0].requested;
		advance(w, 1, {});
		eq(w.state.players[0].requested, a);
		eq(w.state.players[0].bearing, a);
	});
	await test("cannon leaves the real bead while aim is still slewing", () => {
		const w = fixture(),
			p = w.state.players[0];
		p.bearing = 0;
		advance(w, 1 / 120, { 0: { aim: Math.PI, fire: true } });
		const b = w.state.shots[0];
		assert.ok(b.vx > 600);
		assert.ok(b.vy < 60);
		assert.equal(p.shield, 1.6);
	});
	await test("blocked cooldown never spends a second charge", () => {
		const w = fixture(),
			p = w.state.players[0];
		w.fire(p);
		p.shield = 0.4;
		assert.equal(w.fire(p), false);
		eq(p.shield, 0.4);
	});
	await test("held fire repeats and resets recharge on each accepted shot", () => {
		const w = fixture(),
			p = w.state.players[0];
		advance(w, 1.01, { 0: { fire: true } });
		assert.equal(w.state.metrics.shots, 5);
		assert.ok(p.shield > 1.58);
	});
	await test("shield only protects at full recharge", () => {
		const w = fixture(),
			p = w.state.players[0];
		p.shield = 0.3;
		const e = w.spawn("drifter", p.x, p.y, {
			instant: true,
			merge: false,
			speed: 0,
		});
		advance(w, 1 / 120);
		assert.equal(p.hull, 2);
		assert.equal(e.dead, false);
	});
	await test("one ready shield consumes once for a contact batch", () => {
		const w = fixture(),
			p = w.state.players[0];
		w.spawn("drifter", p.x - 8, p.y, { instant: true, speed: 0, merge: false });
		w.spawn("drifter", p.x + 8, p.y, { instant: true, speed: 0, merge: false });
		advance(w, 1 / 120);
		assert.equal(p.hull, 3);
		assert.ok(p.shield > 0);
		assert.equal(w.state.metrics.rams, 1);
		assert.equal(w.state.metrics.kills, 1);
	});
	await test("contact grace separates shield collapse from hull damage", () => {
		const w = fixture(),
			p = w.state.players[0];
		w.spawn("drifter", p.x, p.y, { instant: true, speed: 0 });
		advance(w, 1 / 120);
		w.spawn("hunter", p.x, p.y, { instant: true });
		advance(w, 0.05);
		assert.equal(p.hull, 3);
	});
	await test("damage immunity stops repeated overlap hits", () => {
		const w = fixture(),
			p = w.state.players[0];
		p.shield = 10;
		const src = { x: p.x, y: p.y, r: 20 };
		assert.equal(w.hurt(p, src), true);
		assert.equal(w.hurt(p, src), false);
		assert.equal(p.hull, 2);
		assert.ok(p.invuln > 1);
	});
	await test("hostile projectile spends ready shield", () => {
		const w = fixture(),
			p = w.state.players[0];
		w.missile(p.x - 40, p.y, 0);
		advance(w, 0.15);
		assert.equal(p.hull, 3);
		assert.ok(p.shield > 0);
		assert.equal(w.state.shots.length, 0);
	});
	await test("dead entity is removed and scored only once", () => {
		const w = fixture(),
			e = w.spawn("drifter", 200, 150, { instant: true, speed: 0 });
		assert.equal(w.kill(e, 0), true);
		assert.equal(w.kill(e, 0), false);
		assert.equal(w.state.score, 1);
		assert.equal(w.state.players[0].score, 1);
	});
	await test("cascade ownership, depth, centroid and friendly safety", () => {
		const w = fixture(),
			p = w.state.players[0];
		p.x = 400;
		p.y = 260;
		const es = w.formation({
			formation: "chain",
			x: 400,
			y: 200,
			kind: "drifter",
			instant: true,
			speed: 0,
			merge: false,
		});
		w.kill(es[0], 0);
		advance(w, 1);
		assert.equal(w.state.metrics.kills, 5);
		assert.equal(w.state.bestChain, 5);
		assert.equal(w.state.score, 15);
		assert.equal(p.hull, 3);
		assert.equal(p.score, 15);
	});
	await test("enemy fire destroys drifter and attributes cascade to team", () => {
		const w = fixture(),
			e = w.spawn("drifter", 300, 200, {
				instant: true,
				speed: 0,
				merge: false,
			});
		w.missile(250, 200, 0);
		advance(w, 0.4);
		assert.ok(e.dead);
		assert.equal(w.state.score, 1);
		assert.equal(w.state.players[0].score, 0);
	});
	await test("two drifters fuse once with visible windup and arming", () => {
		const w = fixture();
		const es = w.formation({
			formation: "pair",
			kind: "drifter",
			x: 300,
			y: 150,
			instant: true,
			speed: 0,
			forcedMerge: true,
		});
		advance(w, 3.1);
		assert.ok(es[0].merging > 0);
		advance(w, 1.5);
		assert.equal(w.state.metrics.fusions, 1);
		assert.equal(w.state.enemies.filter((e) => e.kind === "hunter").length, 1);
		assert.ok(w.state.enemies[0].arm > 0);
	});
	await test("destroying a fusion partner cancels the merge", () => {
		const w = fixture(),
			es = w.formation({
				formation: "pair",
				kind: "drifter",
				x: 300,
				y: 150,
				instant: true,
				speed: 0,
				forcedMerge: true,
			});
		advance(w, 3.1);
		w.kill(es[0], 0);
		advance(w, 0.1);
		assert.equal(w.state.metrics.fusions, 0);
		assert.equal(es[1].merging, 0);
	});
	await test("hunter turn rate is bounded and arming prevents pursuit", () => {
		const w = fixture(),
			e = w.spawn("hunter", 200, 100, { instant: true });
		e.arm = 1;
		e.rot = 0;
		advance(w, 0.5);
		eq(e.x, 200);
		e.arm = 0;
		advance(w, 1 / 120);
		assert.ok(Math.abs(e.rot) <= w.balance.hunterTurn / 120 + 0.001);
	});
	await test("recharge progress and hunter arming emit their actual cue exactly once", () => {
		const w = fixture(),
			p = w.state.players[0];
		w.fire(p);
		const h = w.spawn("hunter", 200, 100, { instant: true });
		h.arm = w.balance.hunterArm;
		advance(w, 1.8);
		for (const type of ["recharge", "hunter", "ready"])
			assert.equal(w.events.filter((e) => e.type === type).length, 1, type);
	});
	await test("gunship lane warns then fires a defined volley", () => {
		const w = fixture(),
			e = w.spawn("gunship", 50, 55);
		assert.ok(e.warning > 0);
		advance(w, 1.6);
		assert.equal(w.state.shots.length, 0);
		advance(w, 0.2);
		assert.ok(w.state.shots.length >= 3);
		assert.ok(w.events.some((e) => e.type === "missile"));
	});
	await test("inactive pilot cannot move or fire", () => {
		const w = fixture(2);
		w.removePlayer(1);
		advance(w, 0.5, { 1: { mx: 1, fire: true } });
		assert.equal(w.state.players[1].active, false);
		assert.equal(w.state.metrics.shots, 0);
	});
	await test("ready wingmate rescues once and spends ring", () => {
		const w = fixture(2),
			[a, b] = w.state.players;
		b.down = true;
		b.hull = 0;
		b.wreck = 1;
		a.x = 450;
		b.x = 480;
		advance(w, 1 / 120);
		assert.equal(b.down, false);
		assert.equal(b.hull, 1);
		assert.ok(a.shield > 0);
		assert.ok(b.invuln > 0);
		assert.equal(w.state.metrics.rescues, 1);
	});
	await test("recharging wingmate cannot rescue", () => {
		const w = fixture(2),
			[a, b] = w.state.players;
		a.shield = 1;
		b.down = true;
		b.hull = 0;
		b.wreck = 1;
		advance(w, 0.2);
		assert.ok(b.down);
		assert.equal(w.state.metrics.rescues, 0);
	});
	await test("both wrecks end in defeat after readable sequence", () => {
		const w = fixture(2);
		for (const p of w.state.players) {
			p.down = true;
			p.hull = 0;
		}
		advance(w, 1);
		assert.equal(w.state.status, "running");
		advance(w, 0.6);
		assert.equal(w.state.status, "defeat");
		assert.equal(w.events.filter((e) => e.type === "defeat").length, 1);
	});
	await test("one active surviving pilot can finish extraction", () => {
		const w = fixture(2);
		w.state.players[1].down = true;
		w.extract();
		advance(w, 4.1);
		assert.equal(w.state.status, "victory");
		assert.equal(w.events.filter((e) => e.type === "victory").length, 1);
	});
	await test("both pilots down during extraction still means defeat", () => {
		const w = fixture(2);
		w.extract();
		for (const p of w.state.players) {
			p.down = true;
			p.hull = 0;
		}
		advance(w, 1.6);
		assert.equal(w.state.status, "defeat");
	});
	await test("boss covers block damage and components open during recovery", () => {
		const w = fixture();
		w.createBoss();
		const b = w.state.boss,
			c = b.components[0],
			hp = c.hp;
		assert.equal(w.hitComponent(c, 1, 0, "cannon"), false);
		eq(c.hp, hp);
		b.transition = 0;
		advance(w, 2.4);
		assert.ok(c.open);
		assert.equal(w.hitComponent(c, 1, 0, "cannon"), true);
		eq(c.hp, hp - 1);
	});
	await test("boss body ram spends shield without deleting boss", () => {
		const w = fixture(),
			p = w.state.players[0];
		w.createBoss();
		const b = w.state.boss;
		p.x = b.x;
		p.y = b.y;
		w.contacts();
		assert.ok(p.shield > 0);
		assert.equal(b.dead, false);
		assert.equal(b.phase, 0);
	});
	await test("each boss phase requires all emitters and concludes extraction", () => {
		const w = fixture();
		w.createBoss();
		for (let phase = 0; phase < 3; phase++) {
			assert.equal(w.state.boss.phase, phase);
			for (const c of [...w.state.boss.components]) {
				c.open = true;
				w.hitComponent(c, 100, 0, "cannon");
			}
		}
		assert.equal(w.state.status, "extracting");
		advance(w, 4.1);
		assert.equal(w.state.status, "victory");
		assert.equal(w.state.metrics.phases, 3);
	});
	await test("boss-clear cancels queued hostile hits before extraction", () => {
		const w = fixture(),
			p = w.state.players[0];
		w.createBoss();
		const b = w.state.boss;
		b.phase = 2;
		w.bossParts();
		b.components[1].hp = b.components[2].hp = 0;
		const c = b.components[0];
		c.hp = 1;
		c.open = true;
		p.hull = 1;
		p.shield = 1;
		w.state.shots = [
			{
				id: 990,
				x: c.x,
				y: c.y,
				vx: 0,
				vy: 0,
				r: 3,
				life: 1,
				foe: false,
				owner: 0,
			},
			{
				id: 991,
				x: p.x,
				y: p.y,
				vx: 0,
				vy: 0,
				r: 3,
				life: 1,
				foe: true,
				owner: "team",
			},
		];
		w.projectiles(1 / 120);
		assert.equal(p.hull, 1);
		assert.equal(p.down, false);
		assert.equal(w.state.status, "extracting");
	});
	await test("boss health slider clamps, reset restores canonical defaults", () => {
		const w = fixture();
		w.createBoss();
		w.setBalance("bossHealth", 3);
		assert.ok(w.state.boss.components.every((c) => c.hp <= 3));
		w.command("resetBalance");
		assert.deepEqual(w.balance, { ...DEFAULT_BALANCE });
		assert.ok(w.state.debug);
	});
	await test("valid content roundtrip and invalid import retain working content", () => {
		const w = fixture(),
			json = w.exportContent();
		assert.deepEqual(validateContent(JSON.parse(json)), defaultContent());
		const bad = JSON.parse(json);
		bad.mission[0].spawns[0].formation = "missing";
		assert.throws(() => w.importContent(bad));
		assert.equal(w.exportContent(), json);
		const bad2 = JSON.parse(json);
		bad2.mission[1].id = bad2.mission[0].id;
		assert.throws(() => validateContent(bad2));
	});
	await test("inherited names, missing formation dependencies and malformed flags are rejected atomically", () => {
		const w = fixture(),
			json = w.exportContent();
		for (const name of ["toString", "constructor"]) {
			const d = JSON.parse(json);
			d.mission[0].spawns[0].formation = name;
			assert.throws(() => w.importContent(d));
			assert.equal(w.exportContent(), json);
		}
		const d = JSON.parse(json);
		delete d.formations.cover;
		assert.throws(() => w.importContent(d));
		const e = JSON.parse(json);
		e.mission[0].spawns[0].kind = "toString";
		assert.throws(() => w.importContent(e));
		const f = JSON.parse(json);
		f.mission[0].spawns[0].merge = "false";
		assert.throws(() => w.importContent(f));
		assert.equal(w.exportContent(), json);
	});
	await test("snapshot roundtrip carries stable IDs and all gameplay actors", () => {
		const w = fixture();
		w.formation({ formation: "chain", x: 480, y: 200, kind: "drifter" });
		w.fire(w.state.players[0]);
		const snapshot = w.snapshot(),
			other = fixture();
		other.applySnapshot(snapshot);
		assert.deepEqual(other.snapshot(), snapshot);
	});
	await test("versioned records sanitize names, separate modes and exclude debug", () => {
		const data = new Map(),
			storage = {
				getItem: (k) => data.get(k),
				setItem: (k, v) => data.set(k, v),
			},
			r = createRecords(storage);
		assert.equal(r.commit("mission", 100, "pilot!"), true);
		assert.equal(r.commit("score", 30, "nope", { debug: true }), false);
		assert.equal(r.get().mission.name, "PILOT ");
		assert.equal(r.get().score.score, 0);
		assert.deepEqual(createRecords(storage).get(), r.get());
	});
	await test("blocked, corrupt and unknown-version storage remain playable", () => {
		const r = createRecords({
			getItem() {
				throw new Error("blocked");
			},
			setItem() {
				throw new Error("blocked");
			},
		});
		assert.equal(r.commit("mission", 3, "ABCDEF"), true);
		assert.equal(r.saved, false);
		assert.equal(
			createRecords({ getItem: () => "{broken" }).get().mission.score,
			0,
		);
		assert.equal(
			createRecords({
				getItem: () => ' {"v":99,"mission":{"score":999}}',
			}).get().mission.score,
			0,
		);
	});
	await test("draw does not change simulation hashes or RNG state", () => {
		const a = fixture(),
			b = fixture(),
			input = (i) => ({
				0: {
					mx: Math.sin(i * 0.004),
					my: Math.cos(i * 0.003),
					aim: i * 0.009,
					fire: i % 120 < 20,
				},
			});
		for (let i = 0; i < 1000; i++) {
			a.step(1 / 120, input(i));
			b.step(1 / 120, input(i));
			if (i % 20 === 0) b.snapshot();
		}
		assert.deepEqual(a.snapshot(), b.snapshot());
	});
	await test("native scene/input/draw lifecycle and 10-second attract isolation", async () => {
		const app = createGame({ headless: true, draw: true, loop: false });
		await app.ready;
		app.game.fadeTime = 0;
		app.game.advance(0.01);
		assert.equal(app.game.sceneName, "title");
		app.game.advance(9.8);
		assert.equal(app.attract, false);
		app.game.advance(0.25);
		assert.equal(app.attract, true);
		app.game.advance(0.3);
		assert.equal(app.game.sceneName, "play");
		app.activity();
		app.game.advance(0.3);
		assert.equal(app.game.sceneName, "title");
		assert.equal(app.world, null);
		assert.equal(app.records.get().mission.score, 0);
		assert.deepEqual(app.game.errors, []);
		app.game.dispose();
	});
	await test("native keyboard start / defeat / replay keeps flow usable", async () => {
		const app = createGame({ headless: true, draw: true, loop: false });
		await app.ready;
		app.game.fadeTime = 0;
		app.game.advance(0.01);
		app.game.input.tap("confirm");
		app.game.advance(0.3);
		assert.equal(app.game.sceneName, "play");
		app.world.state.transition = 0;
		app.world.state.players[0].down = true;
		app.world.state.players[0].hull = 0;
		app.game.advance(2.6);
		assert.equal(app.game.sceneName, "results");
		app.game.input.tap("confirm");
		app.game.advance(0.3);
		assert.equal(app.game.sceneName, "play");
		assert.equal(app.world.state.players[0].hull, 3);
		assert.deepEqual(app.game.errors, []);
		app.game.dispose();
	});
	await test("a fire press released before the next input tick still fires once", async () => {
		const app = createGame({ headless: true, loop: false });
		await app.ready;
		app.game.fadeTime = 0;
		app.game.advance(0.01);
		app.debug.begin();
		app.game.advance(0.1);
		app.world.state.transition = 0;
		app.world.state.waveTime = -100;
		app.game.advance(0.05);
		app.game.input.press("Space");
		app.game.input.release("Space");
		app.game.advance(1 / 120);
		assert.equal(app.world.state.metrics.shots, 1);
		app.game.advance(0.1);
		assert.equal(app.world.state.metrics.shots, 1);
		app.game.dispose();
	});
	await test("extended score attack uses fusion, gunship and boss vocabulary", () => {
		const w = new World({ mode: "score" });
		w.state.transition = 0;
		for (let wave = 0; wave < 6; wave++) {
			w.state.waveTime = 4;
			w.scoreDeck();
			if (w.state.boss) break;
			assert.ok(w.state.enemies.length);
			for (const e of w.state.enemies) w.kill(e, 0);
			w.state.enemies = [];
			w.state.blasts = [];
			w.state.chains = [];
		}
		assert.ok(w.state.boss);
		for (let phase = 0; phase < 3; phase++)
			for (const c of [...w.state.boss.components]) {
				c.open = true;
				w.hitComponent(c, 100, 0, "cannon");
			}
		assert.equal(w.state.boss, null);
		assert.equal(w.state.status, "running");
		for (const p of w.state.players) {
			p.down = true;
			p.hull = 0;
		}
		advance(w, 1.6);
		assert.equal(w.state.status, "defeat");
	});
	await test("legal input complete mission reaches all mechanics and victory", async () => {
		const w = new World({ seed: 1981 }),
			game = new E.Game({ headless: true, loop: false });
		let seconds = 0,
			changed = -1;
		const milestones = [];
		game.start({
			update(dt) {
				w.step(dt, { 0: pilotIntent(w) });
				if (changed !== w.state.wave) {
					changed = w.state.wave;
					milestones.push({
						wave: changed,
						t: w.state.t,
						hull: w.state.players[0].hull,
						score: w.state.score,
					});
				}
			},
			draw() {},
		});
		while (!["victory", "defeat"].includes(w.state.status) && seconds < 1800) {
			game.advance(0.5);
			seconds += 0.5;
		}
		await writeFile(
			new URL("../artifacts/mission-playthrough.json", import.meta.url),
			JSON.stringify(
				{
					seed: 1981,
					seconds,
					status: w.state.status,
					metrics: w.state.metrics,
					milestones,
					final: w.snapshot(),
					history: w.history,
				},
				null,
				2,
			),
		);
		game.dispose();
		assert.equal(
			w.state.status,
			"victory",
			`At wave ${w.state.wave}, t=${w.state.t.toFixed(1)}, hull=${w.state.players[0].hull}, enemies=${w.state.enemies.length}`,
		);
		for (const key of ["shots", "rams", "fusions", "gunships", "cascades"])
			assert.ok(w.state.metrics[key] > 0, `Missing ${key}`);
		assert.equal(w.state.metrics.phases, 3);
		assert.ok(w.state.bestChain >= 3);
		assert.ok(
			w.history.some((e) => e.type === "extraction") ||
				w.events.some((e) => e.type === "extraction"),
		);
	});
	return results;
}
