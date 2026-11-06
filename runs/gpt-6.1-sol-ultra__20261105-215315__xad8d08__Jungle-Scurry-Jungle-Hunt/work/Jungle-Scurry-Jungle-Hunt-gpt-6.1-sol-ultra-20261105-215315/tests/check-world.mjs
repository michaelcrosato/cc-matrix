import assert from "node:assert/strict";
import * as THREE from "three/webgpu";
import { createWorld } from "../world.js";

let checks = 0,
	failures = 0;
function check(name, fn) {
	checks++;
	try {
		fn();
	} catch (error) {
		failures++;
		console.error(`FAIL world: ${name}: ${error.message}`);
	}
}
const scene = new THREE.Scene();
let world;
check("procedural world creates", () => {
	world = createWorld(THREE, scene);
	assert.ok(world.root.isGroup);
	assert.equal(world.root.parent, scene);
	assert.ok(world.player.isGroup);
	assert.ok(world.ghost.isGroup);
});
if (world) {
	for (let stage = 0; stage < 4; stage++) {
		check(`chapter ${stage + 1} geometry and actor clips`, () => {
			world.setStage(stage);
			const snapshot = {
				stage,
				time: 0,
				player: {
					x: 4,
					y: stage === 0 ? 3 : stage === 1 ? 5 : 1,
					vx: 0,
					vy: 0,
					onGround: stage !== 1,
					swinging: -1,
					face: 1,
					attack: 0,
					health: 3,
					hit: 0,
				},
				ghost: {
					x: 3,
					y: stage === 0 ? 3 : 1,
					stage,
					visible: true,
					vx: 5,
					face: -1,
				},
				enemies: [
					{ id: "croc", type: "croc", x: 17, y: 3, active: true, stun: 0 },
					{
						id: "rock",
						type: "boulder",
						x: 24,
						y: 3,
						radius: 0.95,
						active: true,
					},
					{
						id: "beetle",
						type: "beetle",
						x: 35,
						y: 1.5,
						active: true,
						stun: 2,
					},
					{ id: "drum", type: "drum", x: 45, y: 1.5, active: true },
				],
				pickups: [
					{ id: "fruit", type: "fruit", x: 12, y: 2, taken: false },
					{ id: "air", type: "air", x: 16, y: 3, taken: false },
					{ id: "bell", type: "bell", x: 23, y: 2.25, taken: false },
				],
				vines: Array.from({ length: 7 }, (_, i) => ({
					x: 7 + i * 11,
					y: 13.5,
					angle: Math.sin(i * 0.65) * 0.64,
					length: 8.8,
				})),
				bells: 0,
			};
			for (let frame = 0; frame < 90; frame++) {
				snapshot.time = frame / 30;
				snapshot.player.vx = frame < 15 ? 0 : 7;
				snapshot.player.onGround = frame < 30;
				snapshot.player.vy = frame < 45 ? 0 : 3;
				snapshot.player.swinging = frame >= 45 && frame < 60 ? 0 : -1;
				snapshot.player.attack = frame >= 60 && frame < 75 ? 0.35 : 0;
				snapshot.player.duck = frame >= 75;
				snapshot.bells = Math.min(3, Math.floor(frame / 20));
				snapshot.won = frame > 85;
				world.update(1 / 30, snapshot);
			}
			scene.updateMatrixWorld(true);
			let meshes = 0,
				hasCelColors = false;
			scene.traverse((o) => {
				for (const v of [
					o.position.x,
					o.position.y,
					o.position.z,
					o.scale.x,
					o.scale.y,
					o.scale.z,
					...o.matrixWorld.elements,
				])
					assert.ok(
						Number.isFinite(v),
						`${o.name || o.type} has non-finite transform`,
					);
				if (o.isMesh) {
					meshes++;
					assert.ok(o.geometry.attributes.position?.count > 0);
					const position = o.geometry.attributes.position;
					for (let i = 0; i < position.array.length; i++)
						assert.ok(
							Number.isFinite(position.array[i]),
							"non-finite geometry vertex",
						);
					if (o.geometry.attributes.color) hasCelColors = true;
				}
			});
			assert.ok(
				meshes > 250,
				`expected furnished chapter, found ${meshes} meshes`,
			);
			assert.ok(hasCelColors, "cel vertex colors missing");
			assert.equal(world.ghost.visible, true);
			if (stage === 0) assert.equal(world.vines.length, 7);
			else assert.equal(world.vines.length, 0);
			for (const name of ["body", "armL", "armR", "legL", "legR"])
				assert.ok(
					world.player.getObjectByName(name),
					`missing native animation target ${name}`,
				);
		});
	}

	check("second explorer swims, hangs and ducks with an animated body", () => {
		const testScene = new THREE.Scene(),
			duo = createWorld(THREE, testScene);
		const person = {
			x: 4,
			y: 4,
			vx: 4,
			vy: 0,
			swinging: -1,
			onGround: false,
			attack: 0,
			duck: false,
		};
		const state = {
			stage: 1,
			time: 0,
			player: { ...person },
			ghost: { ...person, visible: true },
			enemies: [],
			pickups: [],
		};
		for (let i = 0; i < 10; i++) {
			state.time += 1 / 30;
			duo.update(1 / 30, state);
		}
		const first = duo.ghost.getObjectByName("armR").rotation.z;
		for (let i = 0; i < 10; i++) {
			state.time += 1 / 30;
			duo.update(1 / 30, state);
		}
		const next = duo.ghost.getObjectByName("armR").rotation.z;
		assert.ok(
			Math.abs(first - next) > 0.2,
			"swimming partner's arm did not stroke",
		);
		assert.ok(
			duo.ghost.getObjectByName("body").rotation.z < -0.2,
			"swimming partner did not lean into the water",
		);
		assert.ok(
			Math.abs(duo.player.getObjectByName("armR").rotation.z - next) < 1e-5,
			"explorers used different native swim motion",
		);
		state.stage = 0;
		state.player.swinging = 0;
		state.ghost.swinging = 0;
		for (let i = 0; i < 15; i++) {
			state.time += 1 / 30;
			duo.update(1 / 30, state);
		}
		assert.ok(
			duo.ghost.getObjectByName("armR").rotation.z > 2.3,
			"partner did not raise hands to vine zero",
		);
		state.stage = 2;
		state.player.swinging = -1;
		state.ghost.swinging = -1;
		state.ghost.duck = true;
		state.ghost.onGround = true;
		duo.update(1 / 30, state);
		assert.ok(
			duo.ghost.getObjectByName("body").scale.y < 0.8,
			"partner did not crouch below boulders",
		);
		testScene.updateMatrixWorld(true);
		for (const v of duo.ghost.matrixWorld.elements)
			assert.ok(Number.isFinite(v));
	});
	check("stale actors and collected fruit are removed", () => {
		world.setStage(1);
		world.update(0.016, {
			stage: 1,
			time: 3,
			player: { x: 4, y: 5, swinging: -1 },
			enemies: [],
			pickups: [],
			ghost: null,
		});
		assert.equal(world.ghost.visible, false);
		assert.ok(
			world.root.children[2].children.every(
				(o) => o === world.player || o === world.ghost,
			),
		);
	});
}
console.log(`${checks - failures}/${checks} world checks passed`);
if (failures) process.exitCode = 1;
