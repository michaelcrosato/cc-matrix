import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
for (const f of [
	"vendor/engine-repo/dist/handoff/my-3d2dge.js",
	"src/content/campaign.js",
	"src/config.js",
	"src/sim/geometry.js",
	"src/sim/simulation.js",
	"src/render/world.js",
	"src/audio/score.js",
])
	vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"), {
		filename: f,
	});
const E = globalThis.My3D2dge;
let count = 0;
const failures = [];
function check(name, fn) {
	try {
		fn();
		count++;
	} catch (e) {
		failures.push(`${name}: ${e.stack}`);
	}
}
check("native bow attachment agrees in every aim direction", () => {
	for (let i = 0; i < 8; i++) {
		const aim = (i * Math.PI) / 4,
			p = { x: 100, y: 100, z: 0, aim },
			o = DTRender.bowOrigin(p),
			rig = DTArt.ranger();
		rig._bowPull = 1;
		rig.update(1, { x: p.x, y: p.y, z: 0, facing: aim, pose: "dt-bow" });
		const h = rig.hand();
		assert.ok(
			Math.hypot(h[0] - o.x, h[1] - o.y, h[2] - o.z) < 1e-5,
			"real native bow hand must match projectile origin",
		);
	}
});
check("all original creatures and bow draw through native painter", () => {
	E.store.clear();
	const game = new E.Game({
		headless: true,
		draw: true,
		res: "ps1",
		expand: true,
		view: "threequarter",
	});
	const R = new DTRender(game);
	let state;
	game.start({
		update(dt) {
			R.update(dt, state, { title: false, debug: { fogReveal: true } });
		},
		draw(r) {
			R.draw(r, state, { debug: { fogReveal: true } });
		},
	});
	for (const [id, c] of Object.entries(DTContent.caves)) {
		state = {
			phase: "cave",
			cave: id,
			time: 2,
			tick: 240,
			node: "camp",
			players: [
				{
					id: "p1",
					x: c.spawn[0],
					y: c.spawn[1],
					aim: 0,
					hp: 3,
					bow: "draw",
					draw: 0.15,
				},
			],
			enemies: c.enemies.map((e, i) => ({
				...e,
				x: c.spawn[0] + 35 + (i % 2) * 20,
				y: c.spawn[1] + Math.floor(i / 2) * 16,
				state: "windup",
				hp: DTContent.creatures[e.kind].hp,
				maxHp: DTContent.creatures[e.kind].hp,
			})),
			arrows: [],
			pickups: c.pickups,
			visible: [],
			explored: [],
			events: [],
			noise: [],
			tools: {},
			relics: [],
		};
		game.advance(1 / 120);
		assert.deepEqual(game.errors, []);
	}
	game.dispose();
});
check("unknown enemies draw no body, shadow, label or telegraph", () => {
	E.store.clear();
	const game = new E.Game({
		headless: true,
		draw: true,
		res: "ps1",
		view: "threequarter",
	});
	const R = new DTRender(game),
		c = DTContent.caves.chalk,
		enemy = {
			id: "hidden",
			kind: "guardian1",
			x: c.spawn[0] + 40,
			y: c.spawn[1] + 20,
			hp: 3,
			maxHp: 3,
			state: "windup",
		},
		state = {
			phase: "cave",
			cave: "chalk",
			time: 1,
			node: "camp",
			players: [{ id: 1, x: c.spawn[0], y: c.spawn[1], hp: 3, aim: 0 }],
			enemies: [enemy],
			arrows: [],
			pickups: [],
			visible: [],
			explored: [],
			events: [],
			noise: [],
			tools: {},
		};
	const calls = [];
	const before = JSON.stringify(state);
	game.start({
		update(dt) {
			R.update(dt, state);
		},
		draw(r) {
			const actor = r.actor,
				shadow = r.shadow;
			r.actor = function (x, y, ...rest) {
				calls.push(["actor", x, y]);
				return actor.call(this, x, y, ...rest);
			};
			r.shadow = function (x, y, ...rest) {
				calls.push(["shadow", x, y]);
				return shadow.call(this, x, y, ...rest);
			};
			try {
				R.draw(r, state);
			} finally {
				r.actor = actor;
				r.shadow = shadow;
			}
		},
	});
	game.advance(1 / 120);
	assert.ok(!calls.some((c) => c[1] === enemy.x && c[2] === enemy.y));
	assert.equal(JSON.stringify(state), before);
	assert.deepEqual(game.errors, []);
	game.dispose();
});
check("title and map painter paths have no draw errors", () => {
	E.store.clear();
	const game = new E.Game({
		headless: true,
		draw: true,
		res: "ps1",
		expand: true,
		view: "threequarter",
	});
	const R = new DTRender(game);
	let options = { title: true };
	const state = { phase: "map", node: "camp", tools: {}, players: [], time: 3 };
	game.start({
		update(dt) {
			R.update(dt, state, options);
		},
		draw(r) {
			R.draw(r, state, options);
		},
	});
	game.advance(1 / 120);
	options = { title: false };
	game.advance(1 / 120);
	assert.deepEqual(game.errors, []);
	game.dispose();
});
check(
	"code audio cues have finite bounded envelopes and unique identities",
	() => {
		assert.ok(Object.keys(DTAudio.CUES).length >= 22);
		for (const [name, voices] of Object.entries(DTAudio.CUES)) {
			assert.ok(voices.length);
			for (const v of voices) {
				assert.ok(v.f >= 20 && v.f <= 20000, name);
				assert.ok(v.v > 0 && v.v <= 0.3, name);
				assert.ok(v.d > 0 && v.d < 2, name);
			}
		}
		assert.equal(
			new Set(Object.values(DTAudio.CUES).map((x) => JSON.stringify(x))).size,
			Object.keys(DTAudio.CUES).length,
		);
	},
);
check(
	"production animation adapter covers nock, hurt, down, revive, pickup, climb and boat",
	() => {
		E.store.clear();
		const game = new E.Game({
				headless: true,
				res: "ps1",
				view: "threequarter",
			}),
			R = new DTRender(game),
			c = DTContent.caves.chalk,
			p = {
				id: 1,
				x: c.spawn[0],
				y: c.spawn[1],
				z: 0,
				vx: 0,
				vy: 0,
				aim: 0,
				hp: 3,
				bow: "idle",
				anim: "idle",
				animTime: 0,
				focus: false,
				dash: 0,
				down: 0,
			},
			state = {
				phase: "cave",
				cave: "chalk",
				node: "camp",
				time: 0,
				players: [p],
				enemies: [],
				visible: [],
				explored: [],
				events: [],
				noise: [],
				tools: {},
			};
		const advance = (n = 20) => {
			for (let i = 0; i < n; i++) {
				state.time += 1 / 120;
				R.update(1 / 120, state, { title: false });
			}
		};
		advance();
		const rig = R.rigs.get(1);
		p.anim = "pickup";
		p.animTime = 0.5;
		advance();
		assert.ok(rig.poseW.cheer > 0.8);
		p.anim = "climb";
		advance();
		assert.ok(rig._climbW > 0.8);
		assert.ok(rig._climbP > 0);
		p.anim = "hurt";
		advance();
		assert.ok(rig.hurtW > 0);
		p.anim = "down";
		p.down = 8;
		advance();
		assert.ok(rig.downW > 0.5);
		p.down = 0;
		p.anim = "revive";
		advance();
		assert.ok(rig.poseW.kneel > 0.8);
		p.anim = "idle";
		p.bow = "recover";
		p.recover = 0.11;
		advance();
		assert.ok(rig._ownW["dt-nock"] > 0.8);
		assert.ok(rig.J.handL[0] < 3);
		state.phase = "map";
		state.node = "root";
		state.tools.boat = true;
		state.transition = {
			kind: "travel",
			from: "root",
			to: "river",
			tool: "boat",
			time: 0.65,
			duration: 1.3,
		};
		advance();
		assert.equal(R.titleRig.o.weapon, "dt-oar");
		assert.equal(R.boatTravel.unfold, 1);
		state.phase = "victory";
		state.transition = null;
		advance();
		assert.ok(R.titleRig.poseW.cheer > 0.8);
		game.dispose();
	},
);
check("quiver count event produces one deduplicated click sequence", () => {
	const audio = { instrument() {}, music() {}, duck() {}, layer() {} },
		A = new DTAudio({ audio }),
		calls = [];
	A.quiver = (n) => calls.push(n);
	const state = {
		phase: "map",
		players: [],
		events: [{ id: 9, type: "quiver", count: 7 }],
	};
	A.update(state, 1 / 120);
	A.update(state, 1 / 120);
	assert.deepEqual(calls, [7]);
});
for (const mode of ["collision", "navigation", "hearing", "los"])
	check(`truthful ${mode} overlay draws its actual simulation geometry`, () => {
		E.store.clear();
		const game = new E.Game({
				headless: true,
				draw: true,
				res: "ps1",
				view: "threequarter",
			}),
			sim = new DTSim.Simulation({ players: [1] });
		sim.enterCave("chalk");
		const R = new DTRender(game, sim),
			state = sim.state,
			enemy = state.enemies.find((e) => e.kind === "snake");
		sim.noise("bank", enemy.x - 16, enemy.y, 1.35, 1);
		sim.tunables.vision = 144;
		const debug = { [mode]: true, fogReveal: true };
		game.start({
			update(dt) {
				R.update(dt, state, { title: false, debug });
			},
			draw(r) {
				R.draw(r, state, { debug });
			},
		});
		game.advance(1 / 120);
		const before = JSON.stringify(state),
			data = R.debugData(state, debug);
		assert.equal(JSON.stringify(state), before);
		assert.deepEqual(game.errors, []);
		if (mode === "collision") {
			assert.ok(data.collision.edges.length > 0);
			assert.ok(
				data.collision.banks.some(
					(b) => b.id === "chalk-practice-bank" && b.thickness === 3,
				),
			);
			assert.equal(data.collision.actors.find((a) => a.kind === "ranger").r, 5);
			assert.equal(data.navigation, null);
		}
		if (mode === "navigation") {
			assert.ok(data.navigation.edges.length > 0);
			assert.ok(data.navigation.path.length > 10);
			for (const edge of data.navigation.edges.slice(0, 20))
				assert.ok(
					sim.moveClear(
						{ x: edge.a[0], y: edge.a[1] },
						{ x: edge.b[0], y: edge.b[1] },
						5,
					),
				);
			assert.equal(data.collision, null);
		}
		if (mode === "hearing") {
			const h = data.hearing.find((h) => h.enemy === enemy.id);
			assert.ok(h);
			assert.equal(h.distance, sim.acoustic(enemy, state.noise[0], 360));
			assert.equal(h.threshold, DTContent.creatures.snake.hearing);
			assert.equal(h.strength, 1.35 / (1 + h.distance / 70));
			assert.equal(h.status, "HEARD");
			assert.ok(h.path.length > 1);
		}
		if (mode === "los") {
			assert.equal(data.los.radius, 144);
			assert.equal(data.los.cells, state.visible.length);
			assert.ok(data.los.boundary.length > 0);
			assert.equal(data.los.rays.length, 24);
			for (const ray of data.los.rays) {
				assert.ok(ray.distance <= 144);
				assert.ok(sim.lineClear(...ray.a, ...ray.b));
			}
		}
		game.dispose();
	});
for (const f of failures) console.error(f);
console.log(`${count} render/audio checks passed; ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
