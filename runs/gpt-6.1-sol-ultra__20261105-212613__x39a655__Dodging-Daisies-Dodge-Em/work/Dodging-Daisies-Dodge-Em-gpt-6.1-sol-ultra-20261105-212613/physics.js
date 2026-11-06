import RAPIER from "@dimforge/rapier3d-compat";
import { trackPoint } from "./core.js";
export async function createPhysics() {
	await RAPIER.init();
	let world = null,
		entries = [],
		signature = "",
		steps = 0,
		contacts = 0;
	function rebuild(state) {
		if (world) world.free();
		world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		entries = [];
		for (const car of [...state.players, ...state.enemies]) {
			const p = trackPoint(car.t, car.renderLane);
			const body = world.createRigidBody(
				RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
					p.x,
					0.6,
					p.z,
				),
			);
			const collider = world.createCollider(
				RAPIER.ColliderDesc.ball(0.58)
					.setSensor(true)
					.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
				body,
			);
			entries.push({ carId: car.id, body, collider });
		}
	}
	return {
		step(state, dt) {
			const sig =
				state.players.map((p) => p.id).join() +
				state.enemies.map((e) => e.id).join();
			if (!world || sig !== signature) {
				signature = sig;
				rebuild(state);
			}
			entries.forEach((item) => {
				const car = [...state.players, ...state.enemies].find(
					(c) => c.id === item.carId,
				);
				const p = trackPoint(car.t, car.renderLane);
				item.body.setNextKinematicTranslation({ x: p.x, y: 0.6, z: p.z });
			});
			world.timestep = dt;
			world.step();
			steps++;
			const hits = [];
			state.players.forEach((p, i) => {
				const entry = entries.find((e) => e.carId === p.id);
				for (const enemy of state.enemies) {
					const other = entries.find((e) => e.carId === enemy.id);
					if (world.intersectionPair(entry.collider, other.collider)) {
						hits.push(i);
						contacts++;
						break;
					}
				}
			});
			return hits;
		},
		debug() {
			return {
				engine: "Rapier 0.19.3",
				steps,
				contacts,
				bodies: entries.length,
			};
		},
		dispose() {
			world?.free();
		},
	};
}
