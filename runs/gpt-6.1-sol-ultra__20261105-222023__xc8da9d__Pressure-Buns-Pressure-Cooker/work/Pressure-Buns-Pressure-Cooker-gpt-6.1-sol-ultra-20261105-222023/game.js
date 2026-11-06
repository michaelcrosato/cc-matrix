export const COLORS = ["#ed665a", "#51c5b4", "#f2ba48"];
export const TYPES = ["tomato", "lettuce", "cheese", "onion"];
export const DEFAULTS = {
	playerSpeed: 5.2,
	beltSpeed: 1,
	ingredientSpeed: 1,
	spawnInterval: 2.2,
	pressureLoss: 1,
	assist: false,
	invincible: false,
	autoplay: false,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createGame(RAPIER, onEvent = () => {}) {
	let world,
		bodies = new Map(),
		clock = 0,
		serial = 0,
		rng,
		spawnClock = 0,
		between = 0;
	const config = { ...DEFAULTS };
	const state = {
		mode: "title",
		time: 0,
		shift: 1,
		score: 0,
		best: 0,
		performance: 60,
		combo: 0,
		served: 0,
		shiftServed: 0,
		goal: 3,
		faults: 0,
		players: [],
		burgers: [],
		ingredients: [],
		message: "",
		messageTime: 0,
		attract: false,
		endless: false,
		stats: {
			caught: 0,
			rejected: 0,
			added: 0,
			buns: 0,
			dashes: 0,
			wrong: 0,
			lost: 0,
		},
	};
	function random() {
		rng ^= rng << 13;
		rng ^= rng >>> 17;
		rng ^= rng << 5;
		return (rng >>> 0) / 4294967296;
	}
	function event(name, data = {}) {
		onEvent(name, data);
	}
	function say(text) {
		state.message = text;
		state.messageTime = 3;
	}
	function initPhysics() {
		world?.free();
		bodies.clear();
		world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(12, 0.2, 9).setTranslation(0, -0.3, 0),
		);
		for (const [x, z, hx, hz] of [
			[-5.5, 0, 0.2, 8],
			[6.4, 0, 0.2, 8],
			[0, -4.75, 12, 0.2],
			[0, 4.85, 12, 0.2],
		])
			world.createCollider(
				RAPIER.ColliderDesc.cuboid(hx, 2, hz).setTranslation(x, 1, z),
			);
	}
	function addPlayer(id) {
		if (state.players.some((p) => p.id === id)) return;
		const p = {
			id,
			x: id ? 1.2 : 0,
			z: 1.4,
			held: null,
			carrying: null,
			dash: 0,
			cooldown: 0,
			anim: "idle",
			actionCooldown: 0,
		};
		state.players.push(p);
		const b = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				p.x,
				0.6,
				p.z,
			),
		);
		const c = world.createCollider(RAPIER.ColliderDesc.capsule(0.15, 0.38), b);
		const controller = world.createCharacterController(0.015);
		controller.setApplyImpulsesToDynamicBodies(true);
		bodies.set(id, { b, c, controller });
	}
	function removePlayer(id) {
		const player = state.players.find((p) => p.id === id);
		const body = bodies.get(id);
		if (!player && !body) return false;
		if (
			state.mode === "play" &&
			player?.carrying &&
			!state.burgers.some((b) => b.id === player.carrying.id)
		) {
			let z = -3.6;
			for (const burger of [...state.burgers].sort((a, b) => a.z - b.z)) {
				if (Math.abs(z - burger.z) < 1.95) z = burger.z + 1.95;
			}
			if (z > 3.2) z = Math.min(-3.6, ...state.burgers.map((b) => b.z - 1.95));
			state.burgers.push({ ...player.carrying, x: -6, z });
		}
		state.players = state.players.filter((p) => p.id !== id);
		if (body) {
			world.removeCharacterController(body.controller);
			world.removeRigidBody(body.b);
			bodies.delete(id);
		}
		if (state.mode === "play") fillOrders();
		return true;
	}
	function start({
		attract = false,
		endless = false,
		players = [0],
		seed = 80419,
	} = {}) {
		rng = seed;
		serial = 0;
		clock = 0;
		spawnClock = 0.7;
		between = 0;
		Object.assign(state, {
			mode: "play",
			time: 0,
			shift: endless ? 3 : 1,
			score: 0,
			performance: 60,
			combo: 0,
			served: 0,
			shiftServed: 0,
			goal: endless ? 999 : 3,
			faults: 0,
			players: [],
			burgers: [],
			ingredients: [],
			message: "",
			messageTime: 0,
			attract,
			endless,
			stats: {
				caught: 0,
				rejected: 0,
				added: 0,
				buns: 0,
				dashes: 0,
				wrong: 0,
				lost: 0,
			},
		});
		initPhysics();
		players.forEach(addPlayer);
		fillOrders();
		state.burgers.forEach((b, i) => {
			b.z = -3.6 + i * 2.1;
		});
		say(
			attract
				? "THE KITCHEN IS COOKING. YOUR TURN?"
				: "CLOCK IN! Catch toppings. Build burgers. Match the chute.",
		);
		event("start");
		return state;
	}
	function recipe(slot) {
		const n = state.shift === 1 ? 1 : state.shift === 2 ? 2 : slot % 2 ? 4 : 3;
		const types = [...TYPES];
		for (let i = types.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[types[i], types[j]] = [types[j], types[i]];
		}
		return types.slice(0, n);
	}
	function newBurger(slot) {
		const zs = state.burgers.map((b) => b.z);
		let z = -3.8;
		if (zs.length) z = Math.min(-3.8, Math.min(...zs) - 1.95);
		state.burgers.push({
			id: ++serial,
			slot,
			x: -6,
			z,
			ingredients: [],
			required: recipe(slot),
			color: COLORS[slot],
			ready: false,
			needsBun: false,
		});
	}
	function fillOrders() {
		for (let slot = 0; slot < 3; slot++) {
			if (
				state.shiftServed +
					state.burgers.length +
					state.players.filter((p) => p.carrying).length >=
				state.goal
			)
				break;
			if (
				!state.burgers.some((b) => b.slot === slot) &&
				!state.players.some((p) => p.carrying?.slot === slot)
			)
				newBurger(slot);
		}
	}
	function penalty(n, text) {
		state.stats.wrong++;
		state.combo = 0;
		state.faults++;
		if (!config.invincible && !state.attract)
			state.performance = Math.max(
				0,
				state.performance - n * config.pressureLoss,
			);
		if (text) say(text);
		event("wrong");
		if (state.performance <= 0) end(false);
	}
	function end(won) {
		state.mode = won ? "victory" : "gameover";
		say(
			won
				? "ORDER UP! That is one well-fed neighborhood."
				: "Kitchen closed. The buns got away from us.",
		);
		event(won ? "win" : "lose", { score: state.score });
	}
	function serve(p, slot) {
		if (!p.carrying) return false;
		if (p.carrying.slot !== slot) {
			penalty(5, "Wrong wrapper! Match the burger’s color and number.");
			return false;
		}
		const c = p.carrying;
		p.carrying = null;
		state.served++;
		state.shiftServed++;
		state.combo++;
		state.score += 100 * Math.min(state.combo, 5) + state.shift * 25;
		state.performance = clamp(state.performance + 4, 0, 99);
		event("serve", { x: p.x, z: p.z, color: c.color });
		say(
			[
				"BEAUTIFUL BUNS!",
				"THAT’S A WRAP!",
				"HOT OFF THE BELT!",
				"ORDER UP, BUTTERCUP!",
			][state.served % 4],
		);
		if (state.shiftServed >= state.goal) {
			if (state.shift === 3 && !state.endless) {
				end(true);
			} else {
				state.mode = "intermission";
				between = 4;
				state.score += Math.round(state.performance * 5);
				event("shift");
			}
		} else fillOrders();
		return true;
	}
	function interact(p) {
		if (p.actionCooldown > 0) return;
		p.actionCooldown = 0.22;
		if (p.carrying) {
			const slot = Math.round((p.x + 3) / 3);
			if (
				p.z > 3.45 &&
				slot >= 0 &&
				slot < 3 &&
				Math.abs(p.x - [-3, 0, 3][slot]) < 1.35
			)
				serve(p, slot);
			else say("Take this burger to its matching wrapper at the front.");
			return;
		}
		const near = state.burgers
			.filter((b) => Math.abs(p.z - b.z) < 1.05)
			.sort((a, b) => Math.abs(p.z - a.z) - Math.abs(p.z - b.z))[0];
		if (p.x < -3.85 && near) {
			if (near.ready && !p.held) {
				p.carrying = { ...near };
				state.burgers = state.burgers.filter((b) => b !== near);
				p.anim = "catch";
				event("ready", { x: p.x, z: p.z, color: near.color });
				say(`Wrap it at chute ${near.slot + 1}!`);
			} else if (p.held) {
				const type = p.held;
				p.held = null;
				if (type === "bun" && near.needsBun) {
					near.ready = true;
					near.needsBun = false;
					state.stats.buns++;
					event("ready", { x: -6, z: near.z, color: near.color });
					say("A perfect stack! Touch the burger to pick it up.");
				} else if (
					near.required.includes(type) &&
					!near.ingredients.includes(type)
				) {
					near.ingredients.push(type);
					state.stats.added++;
					state.score += 15;
					event("add", { x: -6, z: near.z, color: near.color });
					if (near.required.every((t) => near.ingredients.includes(t))) {
						near.needsBun = true;
						spawnClock = Math.min(spawnClock, 0.4);
						say("Toppings done! Catch a golden top bun.");
					}
				} else
					penalty(2, "That topping isn’t on this ticket. Mind the recipe!");
			}
			return;
		}
	}
	function reject(p) {
		if (p.held) {
			event("reject", { x: p.x, z: p.z, type: p.held });
			p.held = null;
			state.stats.rejected++;
			state.score += 3;
		}
	}
	function spawnIngredient() {
		if (!state.burgers.length) return;
		const buns = state.burgers.filter((b) => b.needsBun);
		const needs = state.burgers.flatMap((b) =>
			b.required.filter((t) => !b.ingredients.includes(t)),
		);
		const held = state.players.map((p) => p.held);
		let type =
			buns.length && !held.includes("bun")
				? "bun"
				: needs[Math.floor(random() * needs.length)] ||
					TYPES[Math.floor(random() * 4)];
		if (type !== "bun" && random() < 0.16)
			type = TYPES[Math.floor(random() * 4)];
		const z = [-2.5, 0, 2.5][Math.floor(random() * 3)];
		state.ingredients.push({ id: ++serial, x: 6.9, z, type });
		event("launch", { z, type });
	}
	function step(dt, inputs = {}) {
		dt = Math.min(dt, 0.05);
		if (state.mode === "intermission") {
			between -= dt;
			state.time += dt;
			if (between <= 0) nextShift();
			return;
		}
		if (state.mode !== "play") return;
		clock += dt;
		state.time += dt;
		state.messageTime = Math.max(0, state.messageTime - dt);
		for (const p of state.players) {
			const input = inputs[p.id] || {};
			const assist = config.assist || !!input.assist;
			p.cooldown = Math.max(0, p.cooldown - dt);
			p.dash = Math.max(0, p.dash - dt);
			p.actionCooldown = Math.max(0, p.actionCooldown - dt);
			let x = input.x || 0,
				z = input.z || 0;
			const len = Math.hypot(x, z);
			if (len > 1) {
				x /= len;
				z /= len;
			}
			if (input.dash && p.cooldown <= 0 && len > 0.1) {
				p.dash = 0.2;
				p.cooldown = 1.25;
				state.stats.dashes++;
				event("dash");
			}
			const speed = config.playerSpeed * (p.dash > 0 ? 2.4 : 1);
			const body = bodies.get(p.id);
			if (body) {
				const pos = body.b.translation();
				if (Math.abs(pos.x - p.x) > 0.5 || Math.abs(pos.z - p.z) > 0.5)
					body.b.setTranslation({ x: p.x, y: 0.6, z: p.z }, true);
				body.controller.computeColliderMovement(body.c, {
					x: x * dt * speed,
					y: 0,
					z: z * dt * speed,
				});
				const m = body.controller.computedMovement();
				p.x = clamp(p.x + m.x, -4.86, 5.8);
				p.z = clamp(p.z + m.z, -4.1, 4.25);
				body.b.setNextKinematicTranslation({ x: p.x, y: 0.6, z: p.z });
			}
			p.anim = p.dash > 0 ? "dash" : len > 0.1 ? "walk" : "idle";
			if (input.reject) reject(p);
			if (input.action) interact(p);
			if (!p.carrying && !p.held) {
				for (const ing of state.ingredients) {
					if (
						ing.dead ||
						Math.hypot(p.x - ing.x, p.z - ing.z) > (assist ? 1.25 : 0.9)
					)
						continue;
					if (input.reject) {
						ing.dead = true;
						state.stats.rejected++;
						state.score += 3;
						event("reject", { x: p.x, z: p.z, type: ing.type });
					} else {
						ing.dead = true;
						p.held = ing.type;
						p.anim = "catch";
						state.stats.caught++;
						state.score += 5;
						event("catch", { x: p.x, z: p.z, type: ing.type });
					}
					break;
				}
			}
			if (p.x < -4.18 && !input.reject) interact(p);
			if (
				assist &&
				p.carrying &&
				p.z > 3.8 &&
				Math.abs(p.x - [-3, 0, 3][p.carrying.slot]) < 1.2
			)
				interact(p);
		}
		world.timestep = dt;
		world.step();
		const belt =
			(state.shift === 1 ? 0.065 : state.shift === 2 ? 0.085 : 0.105) *
			config.beltSpeed;
		for (const b of [...state.burgers]) {
			b.z += dt * belt;
			if (b.z > 4.1) {
				state.burgers = state.burgers.filter((v) => v !== b);
				state.stats.lost++;
				penalty(8, "Burger overboard! Watch the end of the belt.");
				event("spill", { x: -6, z: 4, color: b.color });
				fillOrders();
			}
		}
		for (const ing of state.ingredients) {
			ing.x -= dt * (2.5 + state.shift * 0.15) * config.ingredientSpeed;
			if (ing.x < -5.7 && !ing.dead) {
				ing.dead = true;
				penalty(1, "");
				event("spill", { x: ing.x, z: ing.z, type: ing.type });
			}
		}
		state.ingredients = state.ingredients.filter((i) => !i.dead);
		spawnClock -= dt;
		if (spawnClock <= 0 && state.ingredients.length < 2) {
			spawnIngredient();
			spawnClock = config.spawnInterval;
		}
		if (state.attract) state.performance = 75;
	}
	function nextShift() {
		state.shift++;
		if (state.endless) state.shift = Math.max(3, state.shift);
		state.goal = state.endless ? 999 : state.shift === 2 ? 4 : 5;
		state.shiftServed = 0;
		state.burgers = [];
		state.ingredients = [];
		state.players.forEach((p) => {
			p.held = null;
			p.carrying = null;
		});
		state.mode = "play";
		spawnClock = 0.5;
		fillOrders();
		state.burgers.forEach((b, i) => {
			b.z = -3.6 + i * 2.1;
		});
		say(
			state.shift === 2
				? "LUNCH RUSH! Two toppings. Same hungry customers."
				: "SUPPER CLUB! Taller stacks. Keep those buns moving.",
		);
		event("start");
	}
	function aiInput(p) {
		let tx = p.x,
			tz = p.z,
			action = false,
			rejectInput = false;
		if (p.carrying) {
			tx = [-3, 0, 3][p.carrying.slot];
			tz = 4.15;
			action = Math.hypot(p.x - tx, p.z - tz) < 0.5;
		} else if (p.held) {
			const b = state.burgers
				.filter((b) =>
					p.held === "bun"
						? b.needsBun
						: b.required.includes(p.held) && !b.ingredients.includes(p.held),
				)
				.sort((a, b) => b.z - a.z)[0];
			if (b) {
				tx = -4.65;
				tz = b.z;
				action = true;
			} else rejectInput = true;
		} else {
			const ready = state.burgers
				.filter((b) => b.ready)
				.sort((a, b) => b.z - a.z)[0];
			if (ready) {
				tx = -4.65;
				tz = ready.z;
				action = true;
			} else {
				const ing = state.ingredients
					.filter(
						(i) =>
							i.x > -4.5 &&
							(i.type === "bun"
								? state.burgers.some((b) => b.needsBun)
								: state.burgers.some(
										(b) =>
											b.required.includes(i.type) &&
											!b.ingredients.includes(i.type),
									)),
					)
					.sort((a, b) => a.x - b.x)[0];
				if (ing) {
					tx = clamp(ing.x - 0.8, -4.5, 5.2);
					tz = ing.z;
				} else {
					tx = 2.8;
					tz = 0;
				}
			}
		}
		const dx = tx - p.x,
			dz = tz - p.z,
			d = Math.hypot(dx, dz);
		return {
			x: d > 0.12 ? dx / Math.max(0.5, d) : 0,
			z: d > 0.12 ? dz / Math.max(0.5, d) : 0,
			action,
			reject: rejectInput,
			dash: d > 3,
		};
	}
	function snapshot() {
		return JSON.parse(JSON.stringify(state));
	}
	function replace(s) {
		Object.assign(state, s);
	}
	initPhysics();
	return {
		state,
		config,
		start,
		step,
		addPlayer,
		removePlayer,
		interact,
		reject,
		serve,
		penalty,
		spawnIngredient,
		nextShift,
		aiInput,
		snapshot,
		replace,
		get physics() {
			return {
				bodies: world.bodies.len(),
				colliders: world.colliders.len(),
				version: RAPIER.version(),
			};
		},
		dispose() {
			world.free();
		},
	};
}
