import * as RAPIER from "@dimforge/rapier3d-compat";
import { AudioEngine } from "./audio.js";
import { Network } from "./network.js";
import { UI } from "./ui.js";
import { THREE, Visuals } from "./visuals.js";

const $ = (s) => document.querySelector(s),
	clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
	dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const defaults = { speed: 4, enemy: 1, lantern: 35, lives: 3 };
let tuning = { ...defaults };
const settings = {
	music: 0.1,
	sfx: 0.55,
	brightness: 1,
	glyph: "ps",
	reducedMotion: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("urn-settings") || "{}"),
	);
} catch {}
const rooms = [
	[
		"The Locked Study",
		"Portrait Gallery",
		"Dusty Nursery",
		"Faded Parlor",
		"Entrance Hall",
		"Dining Room",
	],
	[
		"Cold Conservatory",
		"Music Room",
		"The Sealed Library",
		"Servants’ Landing",
		"Clock Gallery",
		"East Landing",
	],
	[
		"Urn Chamber",
		"The Widow’s Walk",
		"Moonlit Attic",
		"West Landing",
		"Cobweb Hall",
		"Forgotten Observatory",
	],
];
let scene,
	renderer,
	physics,
	controller,
	body,
	colliders = [],
	last = performance.now(),
	state,
	mode = "title",
	attract = false,
	idle = performance.now(),
	titlePhase = 0,
	buildFloorIndex = -1,
	steps = 0,
	shake = 0,
	device = "keyboard",
	padPrevious = [],
	menuRepeat = 0,
	accum = 0,
	mapVisible = false,
	debugReveal = false,
	loading = true,
	lastHud = 0,
	remoteInput = { x: 0, z: 0 },
	remoteInputs = {};
const keys = new Set();
let touch = { active: false, id: null, x: 0, z: 0, ox: 0, oy: 0 };
let mouseTarget = null;
const audio = new AudioEngine();
let ui;
let about = {};
const net = new Network({
	onStatus: (status) => {
		ui?.updateOnline?.({ status, roomCode: net.room || "" });
	},
	onInput: (input, index) => {
		remoteInputs[index] = input;
		remoteInput = input;
	},
	onSnapshot: (s) => {
		if (net.role === "guest") {
			if (
				!state ||
				state.floor !== s.floor ||
				buildFloorIndex !== s.floor ||
				state.doors.map((d) => d.locked).join() !==
					s.doors.map((d) => d.locked).join() ||
				state.items.length !== s.items.length ||
				state.candles.map((c) => c.lit).join() !==
					s.candles.map((c) => c.lit).join()
			) {
				state = s;
				buildFloor();
			} else state = s;
			if (mode !== "play" && mode !== "pause") {
				mode = "play";
				scene.mode(false);
				resize();
				ui.setScreen("none");
			}
			scene.sync(state, net.role === "guest" ? Math.max(0, net.localIndex) : 0);
			if (s.result) {
				state.resultShown = false;
				showResult(s.result === "win", false);
			}
		}
	},
	onStart: (info) => {
		if (net.role !== "guest") start(false, info.playerCount || 2);
		else {
			mode = "play";
			ui.setScreen("none");
		}
	},
	onEnd: (info) => {
		if (net.active) {
			audio.setMuted(true);
			mode = "ended";
			ui.setScreen("none");
			keys.clear();
		} else if (info.won !== undefined) showResult(info.won, false);
		else {
			mode = "pause";
			ui.setScreen("pause");
		}
	},
	onTimeUp: () => showResult(state?.fragments >= 3),
});
function inputActivity(dev = device) {
	idle = performance.now();
	if (loading) return;
	if (attract) {
		attract = false;
		goTitle();
		return;
	}
	if (dev !== device) {
		device = dev;
		ui.setDevice(device, settings.glyph);
	}
	audio.init().catch(() => {});
}
function player(x = 0, z = 5, index = 0) {
	return {
		x,
		z,
		angle: 0,
		light: tuning.lantern,
		tool: null,
		moving: false,
		cooldown: 0,
		invincible: 0,
		index,
	};
}
function floorItems(f) {
	const a = [
		{
			id: `shard${f}`,
			type: "shard",
			x: f === 1 ? 8 : -8,
			z: -4,
			taken: false,
		},
	];
	if (f === 0)
		a.push(
			{ id: "key", type: "key", x: -8, z: 4, taken: false },
			{ id: "ward", type: "ward", x: 0, z: -4, taken: false },
		);
	return a;
}
function floorDoors(f) {
	const a = [];
	for (const x of [-4, 4])
		for (const z of [-4, 4])
			a.push({ x, z, axis: "x", locked: z === -4 && x === (f === 1 ? 4 : -4) });
	for (const x of [-8, 0, 8])
		a.push({ x, z: 0, axis: "z", locked: f === 1 ? x === 8 : x === -8 });
	return a;
}
function newState(count = 1) {
	return {
		floor: 0,
		time: 0,
		elapsed: 0,
		fragments: 0,
		fragmentFloors: [],
		lives: tuning.lives,
		playerCount: count,
		players: [player(), player(1, 5, 1)],
		items: floorItems(0),
		doors: floorDoors(0),
		candles: [
			{ x: 1.4, z: 4, lit: true },
			{ x: -1, z: -4, lit: false },
		],
		floors: {},
		enemies: [],
		visited: Array(6).fill(false),
		matches: 0,
		hits: 0,
		result: null,
		windIn: 21,
	};
}
function enemies(f) {
	return [
		{ type: "ghost", x: -8, z: -4, angle: 0, stun: 0, phase: 0 },
		{ type: "bat", x: 8, z: -4, angle: 0, stun: 0, phase: 2 },
		{
			type: f === 2 ? "ghost" : "spider",
			x: 0,
			z: -4,
			angle: 0,
			stun: 0,
			phase: 4,
		},
		...(f > 0
			? [{ type: "ghost", x: 8, z: 4, angle: 0, stun: 0, phase: 6 }]
			: []),
	];
}
function saveFloor() {
	state.floors[state.floor] = {
		items: state.items,
		doors: state.doors,
		candles: state.candles.map(({ x, z, lit }) => ({ x, z, lit })),
		visited: state.visited,
	};
}
function loadFloor(f, entry) {
	saveFloor();
	state.floor = f;
	const stored = state.floors[f];
	state.items = stored?.items || floorItems(f);
	state.doors = stored?.doors || floorDoors(f);
	state.candles = stored?.candles || [
		{ x: 1.4, z: 4, lit: true },
		{ x: -1, z: -4, lit: false },
	];
	state.visited = stored?.visited || Array(6).fill(false);
	state.enemies = enemies(f);
	state.players.forEach((p, i) => {
		p.x = entry.x + i * 0.9;
		p.z = entry.z;
		p.invincible = 2;
	});
	buildFloor();
	audio.play("stairs");
	ui.toast(
		["Ground floor", "First floor", "The attic"][f],
		rooms[f][roomIndex(state.players[0])],
	);
}
function start(demo = false, count = net.connected ? 2 : 1) {
	if (mapVisible) toggleMap(false);
	attract = demo;
	state = newState(count);
	state.enemies = enemies(0);
	mode = "play";
	net.beginRound?.();
	audio.setMuted(false);
	debugReveal = false;
	scene.mode(false);
	buildFloor();
	ui.setScreen("none");
	resize();
	if (!demo) {
		audio.play("door");
		ui.toast(
			"The urn is in three pieces.",
			"Find the brass key in the parlor.",
		);
	}
	last = performance.now();
}
function goTitle() {
	audio.setMuted(false);
	mode = "title";
	attract = false;
	scene.mode(true);
	ui.setScreen("title");
	mapVisible = false;
	$("#map")?.remove();
	idle = performance.now();
	resize();
}
function roomIndex(p) {
	return (
		clamp(Math.floor((p.x + 12) / 8), 0, 2) +
		clamp(Math.floor((p.z + 8) / 8), 0, 1) * 3
	);
}
function buildFloor() {
	buildFloorIndex = state.floor;
	scene.buildFloor(
		state.floor,
		rooms[state.floor],
		state.doors,
		state.items,
		state.candles,
	);
	rebuildPhysics();
	scene.sync(state, net.role === "guest" ? Math.max(0, net.localIndex) : 0);
}
function rebuildPhysics() {
	for (const c of colliders) physics.removeCollider(c, true);
	colliders = [];
	const wall = (x, z, hx, hz) => {
		colliders.push(
			physics.createCollider(
				RAPIER.ColliderDesc.cuboid(hx, 2, hz).setTranslation(x, 1, z),
			),
		);
	};
	wall(-12, 0, 0.15, 8);
	wall(12, 0, 0.15, 8);
	wall(0, -8, 12, 0.15);
	wall(0, 8, 12, 0.15);
	for (const x of [-4, 4])
		for (const z of [-4, 4])
			for (const d of [-1, 1]) wall(x, z + d * 2.55, 0.12, 1.43);
	for (const x of [-8, 0, 8])
		for (const d of [-1, 1]) wall(x + d * 2.55, 0, 1.43, 0.12);
	for (const o of scene.obstacles) wall(o.x, o.z, o.hx, o.hz);
	for (const d of state.doors)
		if (d.locked)
			wall(
				d.x,
				d.z,
				d.axis === "x" ? 0.15 : 0.95,
				d.axis === "x" ? 0.95 : 0.15,
			);
}
function nearestInteraction(p) {
	const options = [];
	for (const i of state.items)
		if (!i.taken && dist(p, i) < 1.65)
			options.push({
				kind: "item",
				data: i,
				d: dist(p, i),
				label:
					i.type === "key"
						? "Take brass key"
						: i.type === "ward"
							? "Take spirit ward"
							: "Recover urn fragment",
			});
	for (const d of state.doors)
		if (d.locked && dist(p, d) < 1.9)
			options.push({
				kind: "door",
				data: d,
				d: dist(p, d),
				label: p.tool === "key" ? "Unlock door" : "Locked · find the brass key",
			});
	for (const c of state.candles)
		if (!c.lit && dist(p, c) < 1.8)
			options.push({
				kind: "candle",
				data: c,
				d: dist(p, c),
				label: "Light sanctuary candle",
			});
	const f = state.floor;
	const up = { x: f === 0 ? 9 : -9, z: 5 },
		down = { x: f === 1 ? 9 : -9, z: 5 };
	if (f < 2 && dist(p, up) < 1.65)
		options.push({
			kind: "up",
			data: up,
			d: dist(p, up),
			label: "Climb to " + (f === 0 ? "first floor" : "the attic"),
		});
	if (f > 0 && dist(p, down) < 1.65)
		options.push({
			kind: "down",
			data: down,
			d: dist(p, down),
			label: "Go downstairs",
		});
	if (f === 0 && dist(p, { x: 0, z: 7.3 }) < 1.8)
		options.push({
			kind: "exit",
			d: 0,
			label:
				state.fragments === 3
					? "Escape with the urn"
					: "The exit · " + state.fragments + "/3 fragments",
		});
	return options.sort((a, b) => a.d - b.d)[0];
}
function drop(p) {
	if (!p.tool) return;
	const old = p.tool;
	state.items.push({
		id: old + "-" + state.time,
		type: old,
		x: p.x,
		z: p.z,
		taken: false,
	});
	scene.addItem(state.items.at(-1));
	p.tool = null;
	audio.play("pickup");
}
function interact(index = 0) {
	if (mode !== "play" || net.role === "guest") return;
	const p = state.players[index],
		o = nearestInteraction(p);
	if (!o) return;
	const i = o.data;
	switch (o.kind) {
		case "item":
			if (i.type === "shard") {
				i.taken = true;
				state.fragments++;
				state.fragmentFloors.push(state.floor);
				audio.play("pickup");
				audio.gibberish("happy");
				ui.toast(
					state.fragments === 3 ? "The urn is whole." : "A piece of the past.",
					"URN FRAGMENTS  " +
						state.fragments +
						" / 3" +
						(state.fragments === 3 ? " · Return to the entrance." : ""),
				);
			} else {
				drop(p);
				p.tool = i.type;
				i.taken = true;
				audio.play("pickup");
				ui.toast(
					i.type === "key" ? "Brass key acquired." : "Spirit ward acquired.",
					i.type === "key"
						? "Opens the house’s three locked doors."
						: "Your flash now drives spirits farther away.",
				);
			}
			break;
		case "door":
			if (p.tool === "key") {
				state.doors.forEach((d) => {
					d.locked = false;
				});
				buildFloor();
				audio.play("door");
				ui.toast("A reluctant click.", "The way is open.");
			} else {
				audio.gibberish("curious");
				ui.toast(
					"It refuses to budge.",
					"The brass key is in the ground-floor parlor.",
				);
			}
			break;
		case "candle":
			i.lit = true;
			p.light = tuning.lantern;
			state.lives = Math.min(tuning.lives, state.lives + 1);
			buildFloor();
			audio.play("match");
			ui.toast(
				"A little sanctuary.",
				"Courage restored. Spirits keep their distance.",
			);
			break;
		case "up":
			loadFloor(state.floor + 1, { x: state.floor === 0 ? 9 : -9, z: 5 });
			break;
		case "down":
			loadFloor(state.floor - 1, { x: state.floor === 1 ? 9 : -9, z: 5 });
			break;
		case "exit":
			if (state.fragments === 3) showResult(true);
			else
				ui.toast(
					"You cannot leave it behind.",
					"Find all three urn fragments, one on each floor.",
				);
	}
}
function pulse(index = 0) {
	if (mode !== "play" || net.role === "guest") return;
	const p = state.players[index];
	if (p.light <= 0) {
		p.light = tuning.lantern;
		state.matches++;
		audio.play("match");
		ui.toast("A match against the dark.", "Keep moving.");
		return;
	}
	if (p.cooldown > 0) return;
	p.cooldown = p.tool === "ward" ? 3 : 4;
	p.light = Math.max(0, p.light - 3);
	const range = p.tool === "ward" ? 5 : 2.6;
	for (const e of state.enemies)
		if (dist(p, e) < range) {
			e.stun = p.tool === "ward" ? 5 : 2.4;
			const dd = dist(p, e) || 1;
			e.x = clamp(e.x + ((e.x - p.x) / dd) * 1.5, -11, 11);
			e.z = clamp(e.z + ((e.z - p.z) / dd) * 1.5, -7, 7);
		}
	audio.play("pulse");
	const ring = scene.ring(scene.actors, range, "#f0d69a", p.x, 0.15, p.z);
	ring.material = ring.material.clone();
	ring.material.transparent = true;
	ring.userData.life = 0.5;
	p.pulse = 0.5;
	effects.push(ring);
}
let effects = [];
function hurt(p) {
	if (p.invincible > 0 || attract) return;
	state.lives--;
	state.hits++;
	p.invincible = 4;
	p.light = 0;
	shake = 0.5;
	audio.play("hurt");
	audio.gibberish("scared");
	ui.toast(
		"Something brushed past you.",
		"Relight your match. Stay near sanctuary candles.",
	);
	if (state.lives <= 0) showResult(false);
}
function showResult(won, send = true) {
	if (!state || state.resultShown) return;
	state.result = won ? "win" : "lose";
	state.resultShown = true;
	mode = won ? "win" : "lose";
	attract = false;
	const score =
		state.fragments * 1000 +
		Math.max(0, Math.round(600 - state.elapsed)) * 2 +
		state.lives * 100;
	ui.setScreen(mode, {
		time:
			Math.floor(state.elapsed / 60) +
			":" +
			String(Math.floor(state.elapsed % 60)).padStart(2, "0"),
		score,
		fragments: state.fragments,
		matches: state.matches,
		hits: state.hits,
	});
	audio.play(mode);
	if (send)
		net.finish(won, score, { fragments: state.fragments, time: state.elapsed });
}
function move(p, x, z, dt) {
	p.slow = Math.max(0, (p.slow || 0) - dt);
	const len = Math.hypot(x, z);
	p.moving = len > 0.08;
	if (len > 1) {
		x /= len;
		z /= len;
	}
	if (len > 0.08) {
		p.angle = Math.atan2(x, z);
		body.setTranslation({ x: p.x, y: 0.55, z: p.z }, true);
		physics.propagateModifiedBodyPositionsToColliders();
		controller.computeColliderMovement(body.collider(0), {
			x: x * tuning.speed * (p.slow > 0 ? 0.5 : 1) * dt,
			y: 0,
			z: z * tuning.speed * (p.slow > 0 ? 0.5 : 1) * dt,
		});
		const m = controller.computedMovement();
		p.x = clamp(p.x + m.x, -11.5, 11.5);
		p.z = clamp(p.z + m.z, -7.5, 7.5);
	}
	p.cooldown = Math.max(0, p.cooldown - dt);
	p.invincible = Math.max(0, p.invincible - dt);
}
function update(dt) {
	state.time += dt;
	state.elapsed += dt;
	state.windIn -= dt;
	const input = getMove();
	if (net.role === "guest") {
		if (
			net.sendInput({
				...input,
				interact: guestActions.interact,
				pulse: guestActions.pulse,
				drop: guestActions.drop,
			})
		)
			guestActions = {};
		return;
	}
	if (net.role === "host" || net.active) state.playerCount = net.playerCount;
	if (attract) {
		demoUpdate(dt);
	} else {
		for (let idx = 0; idx < state.playerCount; idx++) {
			const inp =
				!net.server && idx === net.localIndex ? input : remoteInputs[idx] || {};
			move(state.players[idx], inp.x || 0, inp.z || 0, dt);
			if (inp.interact) {
				interact(idx);
				inp.interact = false;
			}
			if (inp.pulse) {
				pulse(idx);
				inp.pulse = false;
			}
			if (inp.drop) {
				drop(state.players[idx]);
				inp.drop = false;
			}
		}
	}
	for (const p of state.players.slice(0, state.playerCount)) {
		state.visited[roomIndex(p)] = true;
		const safe = state.candles.some((c) => c.lit && dist(c, p) < 2.1);
		if (safe) p.light = Math.min(tuning.lantern, p.light + dt * 8);
		else p.light = Math.max(0, p.light - dt);
		if (device === "touch" && !attract) {
			if (p.light <= 0) pulse(p.index);
			const o = nearestInteraction(p);
			if (o && o.kind === "item") interact(p.index);
			if (
				p.tool === "ward" &&
				state.enemies.some((e) => dist(e, p) < 3 && e.stun <= 0)
			)
				pulse(p.index);
		}
	}
	if (state.windIn <= 0) {
		state.windIn = 20 + state.floor * 2;
		for (const p of state.players.slice(0, state.playerCount))
			if (!state.candles.some((c) => c.lit && dist(c, p) < 2.1)) p.light = 0;
		audio.play("extinguish");
		if (!attract)
			ui.toast("A cold breath through the halls.", "Relight your match.");
	}
	for (const e of state.enemies) {
		e.stun = Math.max(0, e.stun - dt);
		if (e.stun > 0) continue;
		const p = state.players
			.slice(0, state.playerCount)
			.reduce((a, b) => (dist(a, e) < dist(b, e) ? a : b));
		let target = {
			x: Math.sin(state.time * 0.25 + e.phase) * 9,
			z: Math.cos(state.time * 0.3 + e.phase) * 5,
		};
		const nearby = dist(e, p) < (p.tool === "key" ? 9 : 6);
		if (nearby && p.light > 0) target = p;
		const speed =
			(e.type === "bat" ? 2 : e.type === "spider" ? 1.1 : 1.45) * tuning.enemy;
		const dd = dist(e, target);
		if (dd > 0.1) {
			let dx = (target.x - e.x) / dd,
				dz = (target.z - e.z) / dd;
			const safe = state.candles.find((c) => c.lit && dist(c, e) < 2.5);
			if (safe) {
				dx = (e.x - safe.x) / (dist(e, safe) || 1);
				dz = (e.z - safe.z) / (dist(e, safe) || 1);
			}
			e.x = clamp(e.x + dx * speed * dt, -11.5, 11.5);
			e.z = clamp(e.z + dz * speed * dt, -7.5, 7.5);
			e.angle = Math.atan2(dx, dz);
		}
		if (dist(e, p) < 0.7) {
			if (e.type === "bat" && p.tool && p.invincible <= 0) {
				const stolen = p.tool;
				p.tool = null;
				const it = {
					id: stolen + "-stolen-" + state.time,
					type: stolen,
					x: -e.x * 0.8,
					z: -e.z * 0.7,
					taken: false,
				};
				state.items.push(it);
				scene.addItem(it);
				e.stun = 3;
				p.invincible = 2;
				audio.play("ghost");
				ui.toast(
					"The bat pinched your " + (stolen === "key" ? "key!" : "ward!"),
					"Look for its glow across the room.",
				);
			} else {
				if (e.type === "spider") p.slow = 2.5;
				hurt(p);
			}
		}
	}
	steps += dt;
	if (state.players[0].moving && steps > 0.32) {
		audio.play("step");
		steps = 0;
	}
	physics.step();
	net.broadcast(state);
}
let demoStage = 0,
	demoClock = 0;
const demoRoute = [
	{ floor: 0, x: -8, z: 4, action: "key" },
	{ floor: 0, x: -8, z: 1.2, action: "door" },
	{ floor: 0, x: -8, z: -4, action: "shard" },
	{ floor: 0, x: 0, z: -4, action: "ward" },
	{ floor: 0, x: 9, z: 5, action: "up" },
	{ floor: 1, x: 8, z: 1.2, action: "door" },
	{ floor: 1, x: 8, z: -4, action: "shard" },
	{ floor: 1, x: -9, z: 5, action: "up" },
	{ floor: 2, x: -8, z: 1.2, action: "door" },
	{ floor: 2, x: -8, z: -4, action: "shard" },
	{ floor: 2, x: -9, z: 5, action: "down" },
	{ floor: 1, x: 9, z: 5, action: "down" },
	{ floor: 0, x: 0, z: 7, action: "exit" },
];
function demoUpdate(dt) {
	demoClock += dt;
	if (demoClock > 65) {
		demoClock = 0;
		demoStage = 0;
		start(true);
		return;
	}
	const t = demoRoute[demoStage];
	if (!t) {
		demoStage = 0;
		demoClock = 0;
		start(true);
		return;
	}
	const p = state.players[0];
	p.invincible = 99;
	p.light = tuning.lantern;
	const d = dist(p, t);
	p.moving = true;
	p.angle = Math.atan2(t.x - p.x, t.z - p.z);
	if (d > 0.5) {
		p.x += ((t.x - p.x) / d) * 5 * dt;
		p.z += ((t.z - p.z) / d) * 5 * dt;
	} else {
		if (t.action === "door") {
			p.tool = "key";
			const door = state.doors.find((q) => q.locked);
			if (door) {
				door.locked = false;
				buildFloor();
			}
		} else if (t.action === "exit") {
			demoStage = 0;
			demoClock = 0;
			start(true);
			return;
		} else interact();
		demoStage++;
	}
	if (Math.floor(state.time * 2) % 9 === 0) pulse();
}
let guestActions = {};
function act(name) {
	if (net.active && net.ended) return;
	if (net.role === "guest") {
		guestActions[name] = true;
		return;
	}
	if (name === "interact") interact();
	if (name === "pulse") pulse();
	if (name === "drop") drop(state.players[0]);
}
function pause() {
	if (net.role === "guest") {
		net.lastInput = -Infinity;
		net.sendInput({ x: 0, z: 0 });
	}
	if (mapVisible) toggleMap(false);
	if (mode === "play" && !attract) {
		mode = "pause";
		ui.setScreen("pause");
	} else if (mode === "pause") {
		mode = "play";
		ui.setScreen("none");
	}
}
function action(name, value) {
	if (net.active && net.ended) return;
	if (net.active && ["start", "restart", "title"].includes(name)) return;
	inputActivity();
	audio.play("menu");
	switch (name) {
		case "start":
		case "restart":
			start();
			break;
		case "title":
			net.disconnect();
			goTitle();
			break;
		case "resume":
			mode = "play";
			ui.setScreen("none");
			break;
		case "help":
		case "settings":
		case "about":
		case "dev":
		case "online":
			ui.setScreen(
				name,
				name === "about"
					? about
					: name === "settings"
						? { settings }
						: name === "dev"
							? { tuning }
							: {},
			);
			break;
		case "back":
			if (ui.screen === "pause") {
				mode = "play";
				ui.setScreen("none");
			} else if (state && mode !== "title") {
				mode = "pause";
				ui.setScreen("pause");
			} else goTitle();
			break;
		case "setting":
			settings[value.key] = value.value;
			audio.setMusic(settings.music);
			audio.setSfx(settings.sfx);
			scene.brightness.value = settings.brightness;
			scene.reducedMotion = settings.reducedMotion;
			ui.setDevice(device, settings.glyph);
			try {
				localStorage.setItem("urn-settings", JSON.stringify(settings));
			} catch {}
			break;
		case "tune":
			tuning[value.key] = Number(value.value);
			if (value.key === "lives" && state)
				state.lives = Math.min(state.lives, tuning.lives);
			break;
		case "refill":
			state.lives = tuning.lives;
			state.players.forEach((p) => {
				p.light = tuning.lantern;
				p.invincible = 10;
			});
			ui.toast("Courage and light restored.");
			break;
		case "reveal":
			debugReveal = !debugReveal;
			toggleMap(true);
			break;
		case "grant-fragments":
			state.fragments = 3;
			state.fragmentFloors = [0, 1, 2];
			state.items
				.filter((i) => i.type === "shard")
				.forEach((i) => {
					i.taken = true;
				});
			ui.toast("The urn is whole.");
			break;
		case "teleport-exit":
			loadFloor(0, { x: 0, z: 6.5 });
			ui.toast("Returned to the entrance.");
			break;
		case "reset-defaults":
			tuning = { ...defaults };
			ui.setScreen("dev", { tuning });
			break;
		case "host": {
			const code = net.host();
			ui.updateOnline?.({
				roomCode: code,
				status: "Room ready. Open this game in another tab and enter the code.",
			});
			break;
		}
		case "join":
			net.join(value);
			break;
		case "create-offer":
			ui.updateOnline?.({ status: "Creating a direct invitation…" });
			net
				.createOffer()
				.then((code) =>
					ui.updateOnline?.({
						signalCode: code,
						signalLabel: "Send this invitation to your friend.",
						status: "Waiting for your friend’s answer.",
					}),
				)
				.catch((e) => ui.updateOnline?.({ status: e.message }));
			break;
		case "accept-offer":
			net
				.acceptOffer(value)
				.then((code) =>
					ui.updateOnline?.({
						signalCode: code,
						signalLabel: "Send this answer back to the host.",
						status: "Answer ready. Waiting for connection.",
					}),
				)
				.catch((e) => ui.updateOnline?.({ status: e.message }));
			break;
		case "accept-answer":
			net
				.acceptAnswer(value)
				.catch((e) => ui.updateOnline?.({ status: e.message }));
			break;
		case "interact":
			act("interact");
			break;
		case "pause":
			pause();
			break;
	}
}
function getMove() {
	let x =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
		z =
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
	const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
	if (pad) {
		x += Math.abs(pad.axes[0]) > 0.18 ? pad.axes[0] : 0;
		z += Math.abs(pad.axes[1]) > 0.18 ? pad.axes[1] : 0;
	}
	if (touch.active) {
		x += touch.x;
		z += touch.z;
	} // Screen-oriented motion for the oblique camera.
	let wx = x * 0.793 + z * 0.61,
		wz = z * 0.793 - x * 0.61;
	if (mouseTarget && Math.hypot(x, z) < 0.05 && state) {
		const p =
				state.players[net.role === "guest" ? Math.max(0, net.localIndex) : 0],
			d = dist(p, mouseTarget);
		if (d > 0.25) {
			wx = (mouseTarget.x - p.x) / d;
			wz = (mouseTarget.z - p.z) / d;
		} else {
			mouseTarget = null;
			act("interact");
		}
	}
	return { x: wx, z: wz };
}
function gamepad(dt) {
	if (net.active && net.ended) return;
	const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
	if (!pad) {
		padPrevious = [];
		return;
	}
	const down = (i) => !!pad.buttons[i]?.pressed,
		pressed = (i) => down(i) && !padPrevious[i];
	const wasAttract = attract;
	const any =
		pad.buttons.some((b) => b.pressed) ||
		pad.axes.some((a) => Math.abs(a) > 0.2);
	if (any) inputActivity("gamepad");
	if (wasAttract && any) {
		padPrevious = pad.buttons.map((b) => b.pressed);
		return;
	}
	const menu = ui.screen !== "none";
	if (menu) {
		menuRepeat -= dt;
		const dx =
				(down(15) ? 1 : 0) -
				(down(14) ? 1 : 0) +
				(Math.abs(pad.axes[0]) > 0.55 ? Math.sign(pad.axes[0]) : 0),
			dy =
				(down(13) ? 1 : 0) -
				(down(12) ? 1 : 0) +
				(Math.abs(pad.axes[1]) > 0.55 ? Math.sign(pad.axes[1]) : 0);
		if ((dx || dy) && menuRepeat <= 0) {
			ui.navigate(dx, dy);
			menuRepeat = 0.2;
		}
		if (pressed(0)) ui.confirm();
		if (pressed(1)) ui.back();
	} else {
		if (pressed(0)) act("interact");
		if (pressed(2)) act("pulse");
		if (pressed(3)) act("drop");
		if (pressed(17) || pressed(8)) toggleMap();
	}
	if (pressed(9) && !(net.active && down(8))) pause();
	padPrevious = pad.buttons.map((b) => b.pressed);
}
function toggleMap(force) {
	if (!state) return;
	mapVisible = force === undefined ? !mapVisible : force;
	$("#map")?.remove();
	if (!mapVisible) return;
	const el = document.createElement("div");
	el.id = "map";
	el.innerHTML =
		'<div class="map-heading">HOUSE NOTES <span>' +
		["GROUND FLOOR", "FIRST FLOOR", "ATTIC"][state.floor] +
		'</span></div><div class="map-grid">' +
		rooms[state.floor]
			.map((r, i) => {
				const seen = state.visited[i] || debugReveal,
					active =
						roomIndex(
							state.players[
								net.role === "guest" ? Math.max(0, net.localIndex) : 0
							],
						) === i;
				return (
					'<div class="map-room ' +
					(active ? "current" : "") +
					'">' +
					(seen ? r : "Unexplored") +
					"<small>" +
					(active
						? "YOU ARE HERE"
						: seen &&
								state.items.some(
									(it) =>
										it.type === "shard" && !it.taken && roomIndex(it) === i,
								)
							? "URN FRAGMENT"
							: seen &&
									state.items.some(
										(it) =>
											it.type === "key" && !it.taken && roomIndex(it) === i,
									)
								? "BRASS KEY"
								: "") +
					"</small></div>"
				);
			})
			.join("") +
		"</div><p>One urn fragment on each floor. Stairs connect the landings.</p>";
	el.onclick = () => toggleMap();
	document.body.append(el);
}
function resize() {
	if (!renderer) return;
	renderer.setSize(innerWidth, innerHeight);
	scene.resize(innerWidth, innerHeight, mode === "title" ? "title" : "play");
}
function controls() {
	window.addEventListener("resize", resize);
	window.addEventListener(
		"pointerdown",
		(e) => {
			const dev = e.pointerType === "touch" ? "touch" : "keyboard";
			if (attract) {
				inputActivity(dev);
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}
			inputActivity(dev);
		},
		{ capture: true },
	);
	window.addEventListener("keydown", (e) => {
		if (net.active && net.ended) return;
		if (
			e.target.tagName === "TEXTAREA" ||
			(e.target.tagName === "INPUT" && e.target.type !== "range")
		)
			return;
		const wasAttract = attract;
		inputActivity("keyboard");
		if (wasAttract) {
			e.preventDefault();
			return;
		}
		keys.add(e.code);
		if (
			[
				"Space",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Tab",
			].includes(e.code)
		)
			e.preventDefault();
		if (e.repeat) return;
		if (ui.screen !== "none") {
			if (e.code === "ArrowDown" || e.code === "KeyS") ui.navigate(0, 1);
			if (e.code === "ArrowUp" || e.code === "KeyW") ui.navigate(0, -1);
			if (e.code === "ArrowLeft" || e.code === "KeyA") ui.navigate(-1, 0);
			if (e.code === "ArrowRight" || e.code === "KeyD") ui.navigate(1, 0);
			if (e.code === "Enter" || e.code === "Space") ui.confirm();
			if (e.code === "Escape") ui.back();
		} else {
			if (e.code === "KeyE" || e.code === "Enter") act("interact");
			if (e.code === "Space") act("pulse");
			if (e.code === "KeyQ") act("drop");
			if (e.code === "KeyM" || e.code === "Tab") toggleMap();
			if (e.code === "Escape") pause();
		}
	});
	window.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => {
		if (net.role === "guest") {
			net.lastInput = -Infinity;
			net.sendInput({ x: 0, z: 0 });
		}
		keys.clear();
		touch.active = false;
		if (mode === "play" && !attract && net.role === "solo") pause();
	});
	window.addEventListener("pointermove", (e) => {
		if (e.pointerType !== "touch") {
			idle = performance.now();
			if (attract) {
				inputActivity("keyboard");
			} else if (
				device !== "keyboard" &&
				Math.abs(e.movementX) + Math.abs(e.movementY) > 2
			) {
				device = "keyboard";
				ui.setDevice(device, settings.glyph);
			}
		}
	});
	renderer.domElement.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "touch") return;
		const wasAttract = attract;
		inputActivity("keyboard");
		if (wasAttract || mode !== "play") return;
		const ray = new THREE.Raycaster();
		ray.setFromCamera(
			new THREE.Vector2(
				(e.clientX / innerWidth) * 2 - 1,
				(-e.clientY / innerHeight) * 2 + 1,
			),
			scene.camera,
		);
		const p = new THREE.Vector3();
		ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
		mouseTarget = { x: clamp(p.x, -11.5, 11.5), z: clamp(p.z, -7.5, 7.5) };
		const own =
				state.players[net.role === "guest" ? Math.max(0, net.localIndex) : 0],
			o = nearestInteraction(own);
		if (o && dist(mouseTarget, o.data || { x: 0, z: 7.3 }) < 2) {
			act("interact");
			mouseTarget = null;
		}
	});
	window.addEventListener(
		"touchstart",
		(e) => {
			const wasAttract = attract;
			inputActivity("touch");
			if (
				wasAttract ||
				mode !== "play" ||
				e.target.closest("button,input,textarea")
			)
				return;
			e.preventDefault();
			for (const t of e.changedTouches)
				if (!touch.active) {
					touch = {
						active: true,
						id: t.identifier,
						ox: t.clientX,
						oy: t.clientY,
						x: 0,
						z: 0,
					};
					const mark = $("#touch-marker");
					mark.style.left = t.clientX + "px";
					mark.style.top = t.clientY + "px";
					mark.hidden = false;
				}
		},
		{ passive: false },
	);
	window.addEventListener(
		"touchmove",
		(e) => {
			if (!touch.active) return;
			e.preventDefault();
			for (const t of e.changedTouches)
				if (t.identifier === touch.id) {
					touch.x = clamp((t.clientX - touch.ox) / 65, -1, 1);
					touch.z = clamp((t.clientY - touch.oy) / 65, -1, 1);
				}
		},
		{ passive: false },
	);
	window.addEventListener("touchend", (e) => {
		for (const t of e.changedTouches)
			if (t.identifier === touch.id) {
				touch.active = false;
				touch.x = touch.z = 0;
				$("#touch-marker").hidden = true;
			}
	});
}
function frame(now) {
	const dt = Math.min((now - last) / 1000, 0.05);
	last = now;
	gamepad(dt);
	if (
		mode === "title" &&
		now - idle > 10000 &&
		!loading &&
		!net.active &&
		!window.AIHub?.active
	) {
		demoStage = 0;
		demoClock = 0;
		start(true);
	}
	if (mode === "play" && state) {
		update(dt);
		scene.sync(state, net.role === "guest" ? Math.max(0, net.localIndex) : 0);
		if (now - lastHud > 100) {
			lastHud = now;
			const p =
					state.players[net.role === "guest" ? Math.max(0, net.localIndex) : 0],
				o = nearestInteraction(p);
			ui.updateHUD({
				floorName: ["GROUND FLOOR", "FIRST FLOOR", "THE ATTIC"][state.floor],
				roomName: rooms[state.floor][roomIndex(p)],
				fragments: state.fragments,
				lives: state.lives,
				maxLives: tuning.lives,
				tool:
					p.tool === "key"
						? "Brass key"
						: p.tool === "ward"
							? "Spirit ward"
							: "Empty hands",
				lantern: p.light / tuning.lantern,
				context: o?.label || "",
				objective:
					state.fragments === 3
						? "Return to the entrance."
						: "Recover the urn · " + state.fragments + "/3 fragments",
				cooldown: p.cooldown,
				attract,
			});
			$("#attract")?.remove();
			if (attract) {
				const a = document.createElement("div");
				a.id = "attract";
				a.textContent = "A MIDNIGHT PREVIEW  ·  ANY INPUT TO RETURN";
				document.body.append(a);
			}
			if (mapVisible) toggleMap(true);
		}
		audio.update(dt, {
			playing: !attract,
			danger: state.enemies.some((e) => dist(e, state.players[0]) < 4) ? 1 : 0,
		});
	} else audio.update(dt, { playing: false, danger: 0 });
	scene.update(dt, now / 1000);
	for (const e of effects) {
		e.userData.life -= dt;
		e.scale.setScalar(1 + (0.5 - e.userData.life) * 2);
		e.material.opacity = Math.max(0, e.userData.life * 1.5);
		if (e.userData.life <= 0) {
			scene.actors.remove(e);
			effects = effects.filter((x) => x !== e);
		}
	}
	if (!attract) $("#attract")?.remove();
	renderer.render(scene.scene, scene.camera);
	requestAnimationFrame(frame);
}
async function init() {
	try {
		await RAPIER.init();
		physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
		body = physics.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.55, 5),
		);
		physics.createCollider(RAPIER.ColliderDesc.ball(0.32), body);
		controller = physics.createCharacterController(0.02);
		controller.setSlideEnabled(true);
		scene = new Visuals();
		renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		document.body.prepend(renderer.domElement);
		await renderer.init();
		ui = new UI({ onAction: action, onInput: () => inputActivity() });
		ui.mount();
		ui.setLoading(false);
		ui.setDevice(device, settings.glyph);
		audio.setMusic(settings.music);
		audio.setSfx(settings.sfx);
		scene.brightness.value = settings.brightness;
		scene.reducedMotion = settings.reducedMotion;
		document.body.insertAdjacentHTML(
			"beforeend",
			'<div id="touch-marker" hidden></div>',
		);
		controls();
		goTitle();
		loading = false;
		$("#loading")?.remove();
		net.init().then(() => {
			if (net.active) {
				mode = "waiting";
				ui.setScreen("none");
			}
		});
		window.__URN = {
			get state() {
				return state;
			},
			get mode() {
				return mode;
			},
			get attract() {
				return attract;
			},
			get ui() {
				return ui;
			},
			get network() {
				return net;
			},
			get audio() {
				return audio;
			},
			get renderer() {
				return renderer;
			},
			get camera() {
				return scene.camera;
			},
			get settings() {
				return settings;
			},
			get tuning() {
				return tuning;
			},
			start,
			interact,
			pulse,
			loadFloor,
			action,
			move,
			nearestInteraction,
			toggleMap,
			get debug() {
				return debugReveal;
			},
			teleport(x, z) {
				state.players[0].x = x;
				state.players[0].z = z;
			},
			advance(dt) {
				update(dt);
			},
			setAbout(data) {
				about = data;
			},
			get physics() {
				return physics;
			},
			get backend() {
				return renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 fallback";
			},
		};
		requestAnimationFrame(frame);
	} catch (e) {
		console.error(e);
		$("#loading").innerHTML =
			"<h1>The house won’t open.</h1><p>" +
			e.message +
			"</p><p>Reload in a current browser with WebGPU or WebGL2 enabled.</p>";
	}
}
init();
