import * as THREE from "three/webgpu";
import RAPIER from "https://esm.sh/@dimforge/rapier3d-compat@0.19.3";

const $ = (id) => document.getElementById(id);
const defaults = {
	speed: 4.8,
	enemySpeed: 1,
	matchDuration: 20,
	dashCooldown: 2.8,
	brightness: 1,
	music: 0.1,
	sfx: 0.65,
	invincible: false,
	reveal: false,
	autoLight: false,
	flashes: true,
	glyphs: "ps",
};
const config = { ...defaults };
try {
	Object.assign(
		config,
		JSON.parse(localStorage.getItem("hhp-settings") || "{}"),
	);
	config.invincible = false;
	config.reveal = false;
} catch {}
const FLOOR_NAMES = [
	"The lower house",
	"The borrowed bedrooms",
	"The forgotten wing",
	"The attic above",
];
const ROOMS = [
	[
		"The Conservatory",
		"The Long Gallery",
		"The Dining Room",
		"The Cobweb Parlour",
		"The Foyer",
		"The Clock Room",
	],
	[
		"The Moonlit Study",
		"The Doll Room",
		"The East Library",
		"The Blue Bedroom",
		"The Landing",
		"The Sealed Salon",
	],
	[
		"The Winter Garden",
		"The Mourning Room",
		"The Observatory",
		"The Music Room",
		"The Dusty Landing",
		"The Nursery",
	],
	[
		"The Crooked Stair",
		"The Family Vault",
		"The Moth Room",
		"The Trunk Room",
		"The Last Landing",
		"The Rafter Room",
	],
];
let state,
	view,
	physics,
	controller,
	bodyMap = new Map(),
	doorColliders = new Map(),
	wallColliders = [],
	ready = false,
	inputMode = "keyboard",
	localMode = false,
	overlayPage = null,
	backPage = null,
	mapFloor = 0,
	idle = 0,
	toastLife = 0,
	networkStatus = "",
	hubWaiting = false,
	hubInfo = null,
	hubEnded = false,
	netAccumulator = 0,
	lastRoom = -1,
	hurtTime = 0,
	lastFrame = 0,
	aiGoals = [],
	aiIndex = 0,
	aiPath = [],
	aiStuck = 0,
	endWait = 0,
	mutedRender = false;
const keys = new Set(),
	remoteInputs = new Map(),
	prevPads = new Map();
const controls = {
	x: 0,
	z: 0,
	match: false,
	interact: false,
	dash: false,
	drop: false,
};
const touch = { active: false, id: null, sx: 0, sy: 0, x: 0, z: 0 };
const audio = createAudio();
audio.setVolume(config.music, config.sfx);
const network = createNetwork({
	onStatus(s) {
		networkStatus = s.text;
		if (
			ready &&
			network.role === "host" &&
			state.phase === "playing" &&
			s.players?.length
		) {
			for (const seat of s.players) {
				if (!state.players.some((p) => p.id === seat.id)) {
					const p = makePlayer(seat.id, state.players.length);
					const host = state.players[0];
					p.x = host.x + 1;
					p.z = host.z;
					state.players.push(p);
					syncBodies();
				}
			}
		}
		const n = $("net-status");
		if (n) n.textContent = s.text;
		if (s.room && $("room-code")) $("room-code").textContent = s.room;
	},
	onStart(info) {
		hubInfo = info;
		localMode = false;
		startGame("network", info);
		hubWaiting = network.mode === "hub";
	},
	onInput(data, id) {
		remoteInputs.set(id, { ...data, received: performance.now() });
	},
	onState(s) {
		if (network.role === "guest" && !hubEnded) {
			const old = state.floor;
			state = s;
			if (old !== s.floor) {
				view?.setFloor(s.floor);
				rebuildStatics();
				rebuildDoors();
			}
			if (s.phase === "won" || s.phase === "lost")
				showResult(s.phase === "won", true);
		}
	},
	onLeave(id) {
		if (state) {
			const p = state.players.find((p) => p.id === id);
			if (p) dropItem(p);
			state.players = state.players.filter((p) => p.id !== id);
			remoteInputs.delete(id);
			toast("A guest has left the house.");
		}
	},
	onEnd() {
		hubEnded = true;
		audio.stop();
		keys.clear();
		Object.assign(controls, { x: 0, z: 0 });
		if (state) state.phase = "ended";
		closeOverlay();
	},
	onTimeUp() {
		if (network.role === "host") endGame(false);
	},
	onResult(r) {
		showResult(r.won, true);
	},
});
function makePlayer(id = 0, i = 0) {
	return {
		id,
		x: i * 1.3 - 0.4,
		z: 7,
		dir: 0,
		lit: 0,
		carry: null,
		pieces: 0,
		invulnerable: 4,
		dashing: 0,
		dashCooldown: 0,
		stepClock: 0,
		moving: false,
	};
}
function initialState(count = 1, ids = null) {
	return {
		phase: "title",
		floor: 0,
		time: 0,
		elapsed: 0,
		lives: 9,
		matches: 0,
		score: 0,
		stormTimer: 22,
		lightning: 0,
		players: Array.from({ length: count }, (_, i) =>
			makePlayer(ids ? ids[i] : i, i),
		),
		items: [
			{ id: "key", type: "key", floor: 0, x: 4, z: 5, pieces: 0, held: null },
			{
				id: "scepter",
				type: "scepter",
				floor: 0,
				x: -12,
				z: 5,
				pieces: 0,
				held: null,
			},
			{
				id: "urn-a",
				type: "urn",
				floor: 1,
				x: 12,
				z: 5.5,
				pieces: 1,
				held: null,
			},
			{
				id: "urn-b",
				type: "urn",
				floor: 2,
				x: 14,
				z: -7,
				pieces: 1,
				held: null,
			},
			{
				id: "urn-c",
				type: "urn",
				floor: 3,
				x: 0,
				z: -7,
				pieces: 1,
				held: null,
			},
		],
		doors: [
			{
				id: "east-a",
				floor: 1,
				x: 6,
				z: -5.5,
				orientation: "x",
				locked: true,
				kind: "key",
			},
			{
				id: "east-b",
				floor: 1,
				x: 6,
				z: 5.5,
				orientation: "x",
				locked: true,
				kind: "key",
			},
			{
				id: "vault-a",
				floor: 3,
				x: -6,
				z: -5.5,
				orientation: "x",
				locked: true,
				kind: "urn",
			},
			{
				id: "vault-b",
				floor: 3,
				x: 6,
				z: -5.5,
				orientation: "x",
				locked: true,
				kind: "urn",
			},
			{
				id: "vault-c",
				floor: 3,
				x: 0,
				z: 0,
				orientation: "z",
				locked: true,
				kind: "urn",
			},
		],
		enemies: [],
		visited: Array.from({ length: 4 }, () => Array(6).fill(false)),
		fx: [],
		brightness: config.brightness,
		cameraShake: 0,
		objective: "Find the master key in the Foyer.",
	};
}
state = initialState();
function spawnEnemies(floor) {
	const defs = [
		["spider", -12, -6],
		["bat", 12, -6],
		["ghost", 0, -7],
		["spider", -10, 6],
		["bat", 10, 6],
		["spider", 3, -5],
		["ghost", -12, -5],
	];
	state.enemies = defs.slice(0, 3 + floor).map(([type, x, z], i) => ({
		id: floor * 10 + i,
		type,
		x,
		z,
		homeX: x,
		homeZ: z,
		stun: 0,
		phase: i * 1.7,
		windCooldown: 0,
		alert: false,
	}));
}
function buildPhysics() {
	physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
	controller = physics.createCharacterController(0.035);
	controller.setSlideEnabled(true);
	bodyMap.clear();
	wallColliders = [];
	for (const o of view.obstacles) {
		const c = physics.createCollider(
			RAPIER.ColliderDesc.cuboid(o.w / 2, 2, o.d / 2).setTranslation(
				o.x,
				0.8,
				o.z,
			),
		);
		wallColliders.push(c);
	}
	syncBodies();
	rebuildDoors();
	physics.step();
}
function rebuildStatics() {
	for (const c of wallColliders) physics.removeCollider(c, true);
	wallColliders = [];
	for (const o of view.obstacles) {
		wallColliders.push(
			physics.createCollider(
				RAPIER.ColliderDesc.cuboid(o.w / 2, 2, o.d / 2).setTranslation(
					o.x,
					0.8,
					o.z,
				),
			),
		);
	}
}
function syncBodies() {
	for (const p of state.players) {
		if (!bodyMap.has(p.id)) {
			const body = physics.createRigidBody(
				RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
					p.x,
					0.7,
					p.z,
				),
			);
			const collider = physics.createCollider(
				RAPIER.ColliderDesc.ball(0.4),
				body,
			);
			bodyMap.set(p.id, { body, collider });
		} else
			bodyMap.get(p.id).body.setTranslation({ x: p.x, y: 0.7, z: p.z }, true);
	}
}
function rebuildDoors() {
	if (!physics) return;
	for (const c of doorColliders.values()) physics.removeCollider(c, true);
	doorColliders.clear();
	for (const d of state.doors) {
		if (d.floor === state.floor && d.locked) {
			const c = physics.createCollider(
				RAPIER.ColliderDesc.cuboid(
					d.orientation === "x" ? 0.18 : 1.48,
					2,
					d.orientation === "x" ? 1.48 : 0.18,
				).setTranslation(d.x, 0.8, d.z),
			);
			doorColliders.set(d.id, c);
		}
	}
	physics.step();
}
function roomAt(x, z) {
	return Math.max(0, Math.min(2, Math.floor((x + 18) / 12))) + (z >= 0 ? 3 : 0);
}
function me() {
	return state.players.find((p) => p.id === network.me) || state.players[0];
}
function heldItem(p) {
	return state.items.find((i) => i.held === p.id);
}
function clearEdges(input) {
	input.match = false;
	input.interact = false;
	input.dash = false;
	input.drop = false;
}
function pulse(type, x, z) {
	state.fx.push({ type, x, z, age: 0 });
}
function toast(text, seconds = 3.8) {
	$("toast").textContent = text;
	$("toast").classList.remove("hidden");
	toastLife = seconds;
}
function unlockAudio() {
	if (!hubEnded) {
		audio.unlock();
		audio.resume();
	}
}
function markInput(kind = "keyboard") {
	if (hubEnded) return;
	idle = 0;
	if (state.phase === "attract") {
		returnToTitle();
		return true;
	}
	if (kind !== inputMode) {
		inputMode = kind;
		document.body.classList.toggle("touch", kind === "touch");
	}
	unlockAudio();
	return false;
}
function startGame(mode = "solo", info = null) {
	if (hubEnded && network.mode === "hub") return;
	overlayPage = null;
	$("overlay").classList.add("hidden");
	$("title").classList.add("hidden");
	$("attract").classList.add("hidden");
	$("hud").classList.remove("hidden");
	localMode = mode === "local";
	const ids = info?.players?.map((p) => p.id);
	state = initialState(ids?.length || (localMode ? 2 : 1), ids);
	state.phase = mode === "attract" ? "attract" : "playing";
	state.objective = "Light a match. Find the master key in the Foyer.";
	spawnEnemies(0);
	view?.setFloor(0);
	if (physics) {
		rebuildStatics();
		for (const { body } of bodyMap.values()) physics.removeRigidBody(body);
		bodyMap.clear();
		syncBodies();
		rebuildDoors();
	}
	lastRoom = -1;
	keys.clear();
	clearEdges(controls);
	touch.active = false;
	idle = 0;
	hubEnded = false;
	endWait = 0;
	if (mode === "attract") {
		config.invincible = true;
		$("hud").classList.add("hidden");
		$("attract").classList.remove("hidden");
		makeAttractGoals();
	} else {
		config.invincible = false;
		toast(
			localMode
				? "Two pairs of eyes. One extremely bad idea. P2: arrows + Enter, or a second pad."
				: "Welcome. Do come in. The house has been expecting you.",
			5,
		);
		audio.play("voice");
	}
	updateHUD();
}
function returnToTitle() {
	if (network.mode === "hub") return;
	network.leave();
	hubInfo = null;
	hubWaiting = false;
	hubEnded = false;
	config.invincible = false;
	state = initialState();
	spawnEnemies(0);
	view?.setFloor(0);
	if (physics) {
		rebuildStatics();
		syncBodies();
		rebuildDoors();
	}
	overlayPage = null;
	$("overlay").classList.add("hidden");
	$("title").classList.remove("hidden");
	$("hud").classList.add("hidden");
	$("attract").classList.add("hidden");
	$("toast").classList.add("hidden");
	idle = 0;
	keys.clear();
	touch.active = false;
}
function dropItem(p, silent = false) {
	const i = heldItem(p);
	if (!i) return;
	i.held = null;
	i.x = p.x;
	i.z = p.z;
	i.floor = state.floor;
	p.carry = null;
	p.pieces = 0;
	if (!silent) {
		audio.play("pickup");
		toast("Put down " + itemName(i) + ".");
	}
}
function itemName(i) {
	return i?.type === "key"
		? "the master key"
		: i?.type === "scepter"
			? "the moon scepter"
			: i?.type === "urn"
				? `the urn (${i.pieces}/3)`
				: "nothing";
}
function takeItem(p, i) {
	if (!(p.lit > 0) && !config.reveal) {
		toast("Strike a match. Things hide in the dark.");
		return false;
	}
	const own = heldItem(p);
	if (own?.type === "urn" && i.type === "urn") {
		own.pieces += i.pieces;
		p.pieces = own.pieces;
		state.items = state.items.filter((a) => a !== i);
		audio.play("merge");
		pulse("merge", p.x, p.z);
		toast(
			own.pieces === 3
				? "The urn is whole. Return it to the Foyer."
				: "Two pieces remember how to be one.",
		);
	} else {
		dropItem(p, true);
		i.held = p.id;
		p.carry = i.type;
		p.pieces = i.pieces || 0;
		audio.play("pickup");
		pulse("pickup", i.x, i.z);
		toast(
			i.type === "key"
				? "The master key. It has terrible taste in houses."
				: i.type === "scepter"
					? "The moon scepter. Creatures cannot touch its bearer."
					: "An urn fragment. Keep it in hand to join the others.",
		);
	}
	updateObjective();
	return true;
}
function contextFor(p) {
	if (!p) return null;
	const dist = (x, z) => Math.hypot(p.x - x, p.z - z);
	if (state.floor === 0 && dist(0, 9.5) < 2.3)
		return {
			kind: "exit",
			text:
				p.carry === "urn" && p.pieces === 3
					? "Leave this dreadful party"
					: "The front door · urn required",
		};
	const door = state.doors.find(
		(d) => d.floor === state.floor && d.locked && dist(d.x, d.z) < 2.5,
	);
	if (door)
		return {
			kind: "door",
			target: door,
			text:
				door.kind === "key"
					? p.carry === "key"
						? "Unlock the east wing"
						: "Locked · bring the master key"
					: p.carry === "urn" && p.pieces >= 2
						? "Unseal the family vault"
						: "The vault wants two urn pieces",
		};
	if (dist(-14, -8) < 1.05 && state.floor < 3)
		return { kind: "up", text: "Climb to " + FLOOR_NAMES[state.floor + 1] };
	if (dist(14, 8) < 1.05 && state.floor > 0)
		return { kind: "down", text: "Descend to " + FLOOR_NAMES[state.floor - 1] };
	const item = state.items
		.filter(
			(i) => i.floor === state.floor && i.held === null && dist(i.x, i.z) < 1.9,
		)
		.sort((a, b) => dist(a.x, a.z) - dist(b.x, b.z))[0];
	if (item)
		return {
			kind: "item",
			target: item,
			text:
				(p.carry && !(p.carry === "urn" && item.type === "urn")
					? "Swap for "
					: "Take ") + itemName(item),
		};
	if (dist(-14, -8) < 2.2 && state.floor < 3)
		return { kind: "up", text: "Climb to " + FLOOR_NAMES[state.floor + 1] };
	if (dist(14, 8) < 2.2 && state.floor > 0)
		return { kind: "down", text: "Descend to " + FLOOR_NAMES[state.floor - 1] };
	return null;
}
function interact(p) {
	if (network.role === "guest") return;
	const c = contextFor(p);
	if (!c) return;
	if (c.kind === "item") takeItem(p, c.target);
	if (c.kind === "door") {
		const d = c.target;
		if (
			(d.kind === "key" && p.carry === "key") ||
			(d.kind === "urn" && p.carry === "urn" && p.pieces >= 2)
		) {
			for (const a of state.doors)
				if (a.floor === state.floor && a.kind === d.kind) a.locked = false;
			rebuildDoors();
			audio.play("unlock");
			pulse("unlock", d.x, d.z);
			toast(
				d.kind === "key"
					? "The east wing is open. The key has done its duty."
					: "The vault remembers its family. Come in.",
			);
			updateObjective();
		} else {
			audio.play("door");
			toast(
				d.kind === "key"
					? "Only the master key fits. Find it downstairs."
					: "Bring two joined urn pieces to the vault.",
			);
		}
	}
	if (c.kind === "up" || c.kind === "down")
		changeFloor(c.kind === "up" ? 1 : -1);
	if (c.kind === "exit") {
		if (p.carry === "urn" && p.pieces === 3) endGame(true);
		else
			toast(
				"Three urn pieces, joined together. That is your invitation to leave.",
			);
	}
}
function changeFloor(delta) {
	state.floor += delta;
	for (const [i, p] of state.players.entries()) {
		p.x = (delta > 0 ? -14 : 14) + i * 0.75;
		p.z = delta > 0 ? -5.5 : 5.5;
		p.invulnerable = 3;
	}
	spawnEnemies(state.floor);
	view.setFloor(state.floor);
	rebuildStatics();
	syncBodies();
	rebuildDoors();
	audio.play("stairs", { down: delta < 0 });
	pulse("stairs", me()?.x || 0, me()?.z || 0);
	toast(
		FLOOR_NAMES[state.floor] +
			". " +
			[
				"Mind the furniture.",
				"Someone has locked the east wing.",
				"The walls have begun to whisper.",
				"The family vault wants what you carry.",
			][state.floor],
	);
	lastRoom = -1;
	aiPath = [];
	updateObjective();
}
function updateObjective() {
	const shards = state.items
		.filter((i) => i.type === "urn" && i.held !== null)
		.reduce((s, i) => s + i.pieces, 0);
	if (shards === 3)
		state.objective =
			"The urn is whole. Return to the front door in the Foyer.";
	else if (state.floor === 0)
		state.objective = state.players.some((p) => p.carry === "key")
			? "Take the north-west stairs to the bedrooms."
			: "Find the master key in the Foyer. A scepter waits in the west parlour.";
	else if (
		state.floor === 1 &&
		state.doors.some((d) => d.floor === 1 && d.locked)
	)
		state.objective =
			"Use the master key to open the east wing. Search the Sealed Salon.";
	else if (state.floor === 1)
		state.objective =
			"Find the urn fragment in the east salon. Then take the north-west stairs.";
	else if (state.floor === 2)
		state.objective = "An urn fragment waits in the north-east Observatory.";
	else
		state.objective =
			"Bring two joined pieces to the Family Vault. Find the final fragment.";
}
function strike(p) {
	p.lit = config.matchDuration;
	state.matches++;
	audio.play("match");
	pulse("match", p.x, p.z);
}
function dash(p) {
	if (p.dashCooldown > 0) return;
	p.dashing = 0.28;
	p.dashCooldown = config.dashCooldown;
	p.invulnerable = Math.max(p.invulnerable, 0.42);
	audio.play("dash");
	pulse("dash", p.x, p.z);
}
function scare(p, e) {
	if (
		p.invulnerable > 0 ||
		p.carry === "scepter" ||
		config.invincible ||
		state.phase === "attract"
	)
		return;
	state.lives--;
	p.invulnerable = 3.5;
	p.lit = 0;
	state.cameraShake = 0.45;
	hurtTime = 0.65;
	audio.play("hurt");
	audio.play("voice", { pitch: 1.4 });
	pulse("hurt", p.x, p.z);
	e.stun = 2.5;
	const dx = p.x - e.x,
		dz = p.z - e.z,
		l = Math.hypot(dx, dz) || 1;
	movePlayer(p, (dx / l) * 1.2, (dz / l) * 1.2);
	toast(
		state.lives > 1
			? "A fright! Keep your distance, or carry the moon scepter."
			: "One nerve left. Make it count.",
	);
	if (state.lives <= 0) endGame(false);
}
function movePlayer(p, dx, dz) {
	const b = bodyMap.get(p.id);
	if (!b) return;
	controller.computeColliderMovement(
		b.collider,
		{ x: dx, y: 0, z: dz },
		undefined,
		undefined,
		(c) => !c.parent() || c.parent().handle === b.body.handle,
	);
	const m = controller.computedMovement();
	p.x = Math.max(-17.45, Math.min(17.45, p.x + m.x));
	p.z = Math.max(-10.45, Math.min(10.45, p.z + m.z));
	b.body.setNextKinematicTranslation({ x: p.x, y: 0.7, z: p.z });
}
function simulate(dt, inputs = null) {
	if (!["playing", "attract"].includes(state.phase) || hubEnded || hubWaiting)
		return;
	state.time += dt;
	state.elapsed += dt;
	state.lightning = Math.max(0, (state.lightning || 0) - dt);
	state.stormTimer -= dt;
	if (state.stormTimer <= 0) {
		state.stormTimer = 29 + state.floor * 3;
		state.lightning = config.flashes ? 0.32 : 0;
		audio.play("thunder");
		for (const p of state.players)
			if (p.lit > 0 && p.carry !== "scepter") {
				p.lit = 0;
				pulse("wind", p.x, p.z);
			}
	}
	state.brightness = config.brightness;
	state.cameraShake = Math.max(0, state.cameraShake - dt);
	for (const f of state.fx) f.age += dt;
	state.fx = state.fx.filter((f) => f.age < 1.8);
	for (const p of state.players) {
		let u = inputs?.get?.(p.id) || remoteInputs.get(p.id) || { x: 0, z: 0 };
		if (u.received && performance.now() - u.received > 1000) u = { x: 0, z: 0 };
		p.invulnerable = Math.max(0, p.invulnerable - dt);
		p.dashing = Math.max(0, p.dashing - dt);
		p.dashCooldown = Math.max(0, p.dashCooldown - dt);
		p.lit = Math.max(0, p.lit - dt);
		if (
			(config.autoLight ||
				inputMode === "touch" ||
				state.phase === "attract") &&
			p.lit <= 0
		)
			strike(p);
		if (u.match) strike(p);
		if (u.dash) dash(p);
		if (u.drop) dropItem(p);
		if (u.interact) interact(p);
		clearEdges(u);
		let x = u.x || 0,
			z = u.z || 0;
		const len = Math.hypot(x, z);
		if (len > 1) {
			x /= len;
			z /= len;
		}
		p.moving = len > 0.08;
		if (p.moving) p.dir = Math.atan2(x, z);
		if (p.dashing > 0 && len < 0.1) {
			x = Math.sin(p.dir);
			z = Math.cos(p.dir);
		}
		const speed = config.speed * (p.dashing > 0 ? 2.8 : 1);
		movePlayer(p, x * speed * dt, z * speed * dt);
		p.stepClock += p.moving ? dt : 0;
		if (p.stepClock > 0.32) {
			p.stepClock = 0;
			audio.play("step", { pan: p.x / 25 });
		}
		const r = roomAt(p.x, p.z);
		if (p.room !== undefined && p.room !== r)
			audio.play("door", { pan: p.x / 25 });
		p.room = r;
		state.visited[state.floor][r] = true;
		const i = heldItem(p);
		if (i) {
			i.x = p.x;
			i.z = p.z;
			i.floor = state.floor;
		}
		if (p.carry === "urn" && p.lit > 0) {
			const other = state.items.find(
				(i) =>
					i.type === "urn" &&
					i.floor === state.floor &&
					i.held === null &&
					Math.hypot(i.x - p.x, i.z - p.z) < 1,
			);
			if (other) takeItem(p, other);
		}
	}
	physics.timestep = dt;
	physics.step();
	for (const e of state.enemies) {
		e.phase += dt;
		e.stun = Math.max(0, e.stun - dt);
		e.windCooldown = Math.max(0, e.windCooldown - dt);
		if (e.stun > 0) continue;
		let p = state.players.reduce((a, b) =>
			Math.hypot(a.x - e.x, a.z - e.z) < Math.hypot(b.x - e.x, b.z - e.z)
				? a
				: b,
		);
		if (!p) continue;
		const dist = Math.hypot(e.x - p.x, e.z - p.z),
			same = roomAt(p.x, p.z) === roomAt(e.x, e.z),
			safe = p.carry === "scepter";
		let tx = e.homeX + Math.sin(e.phase * 0.5) * 2.1,
			tz = e.homeZ + Math.cos(e.phase * 0.6) * 1.8;
		let speed = e.type === "ghost" ? 1.3 : e.type === "bat" ? 2 : 1;
		if (same && dist < 8 && !safe && state.elapsed > 7) {
			e.alert = true;
			tx = p.x;
			tz = p.z;
			if (e.type === "bat") speed = Math.sin(e.phase * 1.2) > 0.3 ? 3.8 : 0.6;
		} else e.alert = false;
		if (safe && dist < 5) {
			tx = e.x + (e.x - p.x);
			tz = e.z + (e.z - p.z);
			speed = 2.3;
		}
		const dl = Math.hypot(tx - e.x, tz - e.z) || 1,
			dx = ((tx - e.x) / dl) * speed * config.enemySpeed * dt,
			dz = ((tz - e.z) / dl) * speed * config.enemySpeed * dt;
		const good = (x, z) =>
			!view.obstacles.some(
				(o) =>
					Math.abs(x - o.x) < o.w / 2 + 0.38 &&
					Math.abs(z - o.z) < o.d / 2 + 0.38,
			) &&
			!state.doors.some(
				(d) =>
					d.floor === state.floor &&
					d.locked &&
					Math.abs(x - d.x) < (d.orientation === "x" ? 0.55 : 1.8) &&
					Math.abs(z - d.z) < (d.orientation === "x" ? 1.8 : 0.55),
			);
		if (e.type === "ghost" || good(e.x + dx, e.z)) e.x += dx;
		if (e.type === "ghost" || good(e.x, e.z + dz)) e.z += dz;
		e.x = Math.max(-17, Math.min(17, e.x));
		e.z = Math.max(-10, Math.min(10, e.z));
		if (
			same &&
			dist < 3.1 &&
			p.lit > 0 &&
			e.windCooldown === 0 &&
			state.elapsed > 10
		) {
			p.lit = 0;
			e.windCooldown = 11;
			audio.play("wind");
			pulse("wind", p.x, p.z);
			if (state.phase === "playing" && p.id === me()?.id)
				toast("A cold guest has blown out your match.", 2.2);
		}
		if (dist < (e.type === "spider" ? 0.85 : 1.05) && state.elapsed > 8)
			scare(p, e);
	}
	if (state.phase === "attract") runAttract(dt);
}
function totalPieces() {
	return state.items
		.filter((i) => i.type === "urn" && i.held !== null)
		.reduce((n, i) => n + i.pieces, 0);
}
function score() {
	return Math.max(
		0,
		Math.round(
			3000 +
				state.lives * 400 -
				state.matches * 12 -
				state.elapsed * 2 +
				totalPieces() * 500,
		),
	);
}
function endGame(won) {
	if (!["playing", "attract"].includes(state.phase)) return;
	const attract = state.phase === "attract";
	state.phase = won ? "won" : "lost";
	state.score = score();
	audio.play(won ? "win" : "lose");
	if (attract) {
		endWait = 4;
		return;
	}
	network.sendState(snapshot());
	if (network.role === "host")
		network.finish(won, state.score, {
			Matches: state.matches,
			Nerves: state.lives,
			Seconds: Math.round(state.elapsed),
		});
	showResult(won);
}
function showResult(won, remote = false) {
	if (hubEnded) return;
	state.phase = won ? "won" : "lost";
	openOverlay("result", false);
	$("overlay").innerHTML =
		`<div class="panel"><div class="eyebrow">${won ? "An unusually successful visit" : "The house sends its regards"}</div><h2>${won ? "Party, departed." : "Scared out of your wits."}</h2><p>${won ? "The urn is whole. The door swings open. Behind you, the house settles into a thoroughly disappointed silence." : "You have used up your last nerve. The guests have decided you should stay a little longer."}</p><div id="result-stats"><div><b>${won ? score() : totalPieces() + "/3"}</b><span>${won ? "HOUSE SCORE" : "URN PIECES"}</span></div><div><b>${state.matches}</b><span>MATCHES</span></div><div><b>${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, "0")}</b><span>TIME INSIDE</span></div></div>${network.mode === "hub" ? '<p class="subtle">Your party’s result has been sent to AI Hub.</p>' : `<button class="menu-button primary" data-action="retry">Another unfortunate visit <span>↗</span></button><button class="menu-button" data-action="title">Return to the invitation</button>`}</div>`;
	focusFirst();
}
function snapshot() {
	return JSON.parse(JSON.stringify(state));
}
function glyph(action) {
	const ps = {
		match: "□",
		interact: "✕",
		dash: "○",
		drop: "△",
		map: "L1",
		pause: "Options",
	};
	const xbox = {
		match: "X",
		interact: "A",
		dash: "B",
		drop: "Y",
		map: "LB",
		pause: "Menu",
	};
	const key = {
		match: "Space",
		interact: "E",
		dash: "Shift",
		drop: "Q",
		map: "Tab",
		pause: "Esc",
	};
	return inputMode === "gamepad"
		? (config.glyphs === "xbox" ? xbox : ps)[action]
		: inputMode === "touch"
			? "Tap"
			: key[action];
}
function keyPrompt(action) {
	return `<span class="key">${glyph(action)}</span>`;
}
function updateHUD() {
	if (!ready) return;
	const p = me();
	if (!p) return;
	const r = roomAt(p.x, p.z);
	$("floor-name").textContent =
		["I", "II", "III", "IV"][state.floor] + " · " + FLOOR_NAMES[state.floor];
	$("room-name").textContent = ROOMS[state.floor][r];
	$("objective").textContent = state.objective;
	$("nerves").textContent =
		"•".repeat(Math.max(0, state.lives)) +
		"◦".repeat(Math.max(0, 9 - state.lives));
	$("matches").textContent = state.matches + " matches struck";
	const n = totalPieces();
	document
		.querySelectorAll(".shard")
		.forEach((s, i) => s.classList.toggle("found", i < n));
	$("hand-name").textContent =
		p.carry === "key"
			? "The master key"
			: p.carry === "scepter"
				? "The moon scepter"
				: p.carry === "urn"
					? `The urn · ${p.pieces}/3`
					: "Nothing. Yet.";
	$("hand-hint").textContent =
		p.carry === "key"
			? "Opens the east wing. You have one free hand."
			: p.carry === "scepter"
				? "Safe from every creature while held."
				: p.carry === "urn"
					? "Carry this to join it with the other pieces."
					: "Strike a match to find what the dark is hiding.";
	$("lightbar").firstElementChild.style.width =
		(p.lit / config.matchDuration) * 100 + "%";
	const c = contextFor(p);
	$("context").classList.toggle("hidden", !c);
	if (c) $("context").innerHTML = keyPrompt("interact") + c.text;
	$("controls").innerHTML =
		keyPrompt("match") +
		" Light " +
		keyPrompt("dash") +
		" Dodge " +
		keyPrompt("map") +
		" Journal";
	$("network-indicator").textContent =
		network.mode === "solo"
			? localMode
				? "TWO PAIRS OF EYES · P2 ARROWS / ENTER"
				: ""
			: networkStatus;
}
function saveConfig() {
	try {
		const save = { ...config };
		delete save.invincible;
		delete save.reveal;
		localStorage.setItem("hhp-settings", JSON.stringify(save));
	} catch {}
	audio.setVolume(config.music, config.sfx);
	state.brightness = config.brightness;
}
function resetConfig() {
	Object.assign(config, defaults);
	saveConfig();
}
const panel = (name, content, wide = false) =>
	`<div class="panel ${wide ? "wide" : ""}"><button class="close" data-action="back" aria-label="Back">×</button><div class="eyebrow">Haunted House Party</div><h2>${name}</h2>${content}</div>`;
function slider(name, label, min, max, step) {
	return `<div class="settings-row"><label for="cfg-${name}">${label}</label><input id="cfg-${name}" data-config="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${config[name]}"><output>${name === "music" || name === "sfx" ? Math.round(config[name] * 100) + "%" : config[name]}</output></div>`;
}
function openOverlay(page, pause = true) {
	if (hubEnded) return;
	if (state.phase === "attract") returnToTitle();
	backPage = overlayPage;
	overlayPage = page;
	if (pause && state.phase === "playing" && network.mode === "solo")
		state.phase = "paused";
	$("overlay").classList.remove("hidden");
	let content = "";
	if (page === "pause")
		content = panel(
			"A moment to breathe.",
			`<button class="menu-button primary" data-action="resume">Return to the house <span>↗</span></button><button class="menu-button" data-action="map">The house journal</button><button class="menu-button" data-action="settings">Settings</button><button class="menu-button" data-action="dev">Developer’s room</button><button class="menu-button" data-action="about">About & credits</button>${network.mode === "hub" ? "" : `<button class="menu-button" data-action="title">Return to the invitation</button>`}<p class="subtle">${network.mode === "solo" ? "The house can wait." : "The party continues while this menu is open."}</p>`,
		);
	if (page === "settings")
		content = panel(
			"Set the mood.",
			`${slider("music", "Music", 0, 1, 0.01)}${slider("sfx", "Sound & little voices", 0, 1, 0.01)}${slider("brightness", "Moonlight", 0.5, 1.8, 0.1)}<div class="settings-row"><label>Controller glyphs</label><select data-config="glyphs"><option value="ps" ${config.glyphs === "ps" ? "selected" : ""}>PlayStation</option><option value="xbox" ${config.glyphs === "xbox" ? "selected" : ""}>Xbox · ABXY</option></select></div><div class="settings-row"><label for="cfg-autoLight">Automatic matches</label><input id="cfg-autoLight" type="checkbox" data-config="autoLight" ${config.autoLight ? "checked" : ""}></div><div class="settings-row"><label>Storm flashes</label><input type="checkbox" data-config="flashes" ${config.flashes ? "checked" : ""}></div><button class="menu-button" data-action="reset-settings">Restore defaults</button>`,
		);
	if (page === "dev")
		content = panel(
			"The developer’s room.",
			`<p class="subtle">Live controls. Changes take effect as soon as you return to play.</p>${slider("speed", "Walking speed", 2, 10, 0.2)}${slider("enemySpeed", "Creature speed", 0, 2.5, 0.1)}${slider("matchDuration", "Match life · seconds", 3, 60, 1)}${slider("dashCooldown", "Dodge recharge · seconds", 0.5, 8, 0.1)}<div class="settings-row"><label>Infinite nerves</label><input type="checkbox" data-config="invincible" ${config.invincible ? "checked" : ""}></div><div class="settings-row"><label>Reveal the house</label><input type="checkbox" data-config="reveal" ${config.reveal ? "checked" : ""}></div><div class="settings-row"><label>Visit a floor</label><select data-dev="floor">${FLOOR_NAMES.map((n, i) => `<option value="${i}" ${state.floor === i ? "selected" : ""}>${i + 1} · ${n}</option>`).join("")}</select></div><button class="menu-button" data-action="dev-urn">Assemble the urn in hand</button><button class="menu-button" data-action="dev-nerves">Restore nine nerves</button><button class="menu-button" data-action="dev-unlock">Unlock every door</button><button class="menu-button" data-action="reset-dev">Reset balance to defaults</button>`,
		);
	if (page === "how")
		content = panel(
			"House rules.",
			`<p>Old Mr. Morrow left three pieces of his favourite urn somewhere upstairs. Find them. Join them. Bring them to the front door. Do try to keep your nerves.</p><div class="instruction-grid"><div><h3>01 · A little light</h3><p>${keyPrompt("match")} Strike a match. Unlimited supply; each one counts. Cold guests and draughts can snuff it out.</p></div><div><h3>02 · One free hand</h3><p>${keyPrompt("interact")} Take or swap an object. ${keyPrompt("drop")} Put it down. Urn pieces join while carried.</p></div><div><h3>03 · Uninvited guests</h3><p>Spiders creep. Bats swoop. Mr. Morrow walks through walls. ${keyPrompt("dash")} Dodge, or carry the moon scepter for protection.</p></div><div><h3>04 · Up & away</h3><p>Use the north-west stairs to climb; south-east to descend. ${keyPrompt("map")} Open your journal. Return the complete urn to the Foyer.</p></div></div><p class="subtle">Move: WASD / left stick. P2: arrow keys, Enter to interact, right Shift to dodge, / to light, Backspace to drop; or a second controller. Touch: drag anywhere to walk; matches are automatic. Tap the contextual action or double-tap to dodge.</p><button class="menu-button primary" data-action="back">Quite clear. Probably.</button>`,
			true,
		);
	if (page === "online")
		content = panel(
			"Misery loves company.",
			`<p>Share one house with up to three friends. One player carries the key. Another can brave the dark with the urn.</p><button class="menu-button primary" data-action="host">Host a house party <span>↗</span></button><div class="smallcaps" style="margin-top:22px">Or enter a friend’s room code</div><input class="network-code" id="join-code" aria-label="Room code" maxlength="16" placeholder="ROOM CODE" autocomplete="off"><button class="menu-button" data-action="join">Join their party</button><p id="net-status" class="network-status">${escapeHTML(networkStatus || "Online uses WebRTC. Room codes also work between tabs.")}</p><div id="room-code" class="network-code hidden"></div><p class="subtle">In AI Hub, the lobby and connection are handled automatically. Standalone internet play needs access to the public PeerJS signalling service; some networks may block direct connections.</p>`,
		);
	if (page === "map") {
		mapFloor = state.floor;
		content = mapContent();
	}
	if (page === "about") content = aboutContent();
	$("overlay").innerHTML = content;
	focusFirst();
}
function mapContent() {
	const p = me(),
		r = p ? roomAt(p.x, p.z) : -1;
	return panel(
		"The house journal.",
		`<div class="floor-tabs">${FLOOR_NAMES.map((n, i) => `<button data-map-floor="${i}" class="${i === mapFloor ? "active" : ""}">${["I", "II", "III", "IV"][i]}</button>`).join("")}</div><div class="map-rooms">${ROOMS[
			mapFloor
		]
			.map((name, i) => {
				const visited = state.visited[mapFloor][i] || config.reveal;
				const items = state.items.filter(
					(it) =>
						it.floor === mapFloor &&
						it.held === null &&
						roomAt(it.x, it.z) === i,
				);
				return `<div class="map-room ${visited ? "visited" : ""} ${mapFloor === state.floor && r === i ? "current" : ""}">${visited ? name : "Unexplored"}<span>${mapFloor === state.floor && r === i ? "● YOU ARE HERE" : visited ? items.map(itemName).join(" · ") : ""}</span>${i === 0 ? "<span>↗ Stairs up</span>" : ""}${i === 5 ? "<span>↙ Stairs down</span>" : ""}${i === 4 && mapFloor === 0 ? "<span>◇ Front door</span>" : ""}</div>`;
			})
			.join(
				"",
			)}</div><p class="subtle">The journal remembers rooms you visit and objects you leave. North is the back wall. Your one free hand is part of the puzzle.</p><button class="menu-button primary" data-action="resume">Close the journal</button>`,
		true,
	);
}
function escapeHTML(s) {
	return String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}
function aboutContent() {
	const src = window.GAME_CREDITS?.sourceInformation || {};
	return panel(
		"A house with a history.",
		`<div class="about about-columns"><div><h3>Source Information</h3><p class="subtle">Scroll with the right stick, mouse wheel, or Page Down.</p>${Object.entries(
			src,
		)
			.map(([k, v]) => `<p><b>${escapeHTML(k)}:</b> ${escapeHTML(v)}</p>`)
			.join(
				"",
			)}</div><div><h3>Made for a most peculiar evening</h3><p>Original game design, code, procedural geometry, ink outlines, animation and synthesized sound. No external art or audio files.</p><p>Inspired by the mechanics and atmosphere of Atari’s <i>Haunted House</i> (1982). This is an original, unofficial homage. Atari and the original game’s creators retain their respective rights.</p><p><a href="https://atari.com/pages/hauntedhouse" target="_blank" rel="noreferrer">Atari source information</a><br><a href="https://static.atariage.com/manual_html_page.php?SoftwareLabelID=233" target="_blank" rel="noreferrer">Original instruction manual</a></p><p>Three.js r180 · Rapier 0.19.3 · AI Hub Session v1.4.0 · PeerJS 1.5.5.<br>Dependencies load from CDNs. Internet is needed on first launch.</p><div class="feedback">${["testingFeedback", "engineFeedback", "promptFeedback"].map((k) => `<h3>${k === "testingFeedback" ? "Testing Feedback" : k === "engineFeedback" ? "Engine Feedback" : "Prompt Feedback"}</h3>${(window.GAME_CREDITS?.[k] || ["unknown"]).map((v) => `<p>${escapeHTML(v)}</p>`).join("")}`).join("")}</div></div></div>`,
		true,
	);
}
function closeOverlay() {
	overlayPage = null;
	$("overlay").classList.add("hidden");
	if (state.phase === "paused") state.phase = "playing";
	keys.clear();
	clearEdges(controls);
}
function goBack() {
	if (overlayPage === "pause" || overlayPage === "result") {
		closeOverlay();
		return;
	}
	if (state.phase === "title") closeOverlay();
	else if (overlayPage === "map") closeOverlay();
	else openOverlay("pause");
}
function focusFirst() {
	requestAnimationFrame(() => {
		const buttons = $("overlay").classList.contains("hidden")
			? $("title").querySelectorAll("button")
			: $("overlay").querySelectorAll("button,input,select,a");
		const b =
			Array.from(buttons).find((b) => !b.classList.contains("close")) ||
			buttons[0];
		b?.focus({ preventScroll: true });
	});
}
function activate(action) {
	if (hubEnded) return;
	if (action === "solo") {
		unlockAudio();
		network.leave();
		startGame("solo");
	} else if (action === "local") {
		unlockAudio();
		network.leave();
		startGame("local");
	} else if (action === "retry") {
		network.leave();
		startGame(localMode ? "local" : "solo");
	} else if (action === "title") returnToTitle();
	else if (action === "resume") closeOverlay();
	else if (action === "back") goBack();
	else if (
		["settings", "about", "how", "online", "map", "dev"].includes(action)
	)
		openOverlay(action);
	else if (action === "pause") {
		if (overlayPage) goBack();
		else openOverlay("pause");
	} else if (action === "interact") {
		controls.interact = true;
	} else if (action === "reset-settings" || action === "reset-dev") {
		resetConfig();
		openOverlay(action === "reset-dev" ? "dev" : "settings");
	} else if (action === "dev-urn") {
		debugCollect();
		toast("Developer: the urn is whole.");
	} else if (action === "dev-nerves") {
		state.lives = 9;
		toast("Developer: nine nerves restored.");
	} else if (action === "dev-unlock") {
		state.doors.forEach((d) => (d.locked = false));
		rebuildDoors();
		toast("Developer: every door unlocked.");
	} else if (action === "host") {
		unlockAudio();
		network
			.host()
			.then((code) => {
				if ($("room-code")) {
					$("room-code").classList.remove("hidden");
					$("room-code").textContent = code;
				}
				if ($("net-status"))
					$("net-status").textContent =
						"Send this code to a friend. The house opens when they join.";
			})
			.catch((e) => toast(e.message));
	} else if (action === "join") {
		unlockAudio();
		const code = $("join-code")?.value.trim().toUpperCase();
		if (code) network.join(code).catch((e) => toast(e.message));
		else toast("Enter a room code first.");
	}
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (b) {
		if (
			markInput(
				e.pointerType === "touch"
					? "touch"
					: e.detail === 0
						? inputMode
						: "keyboard",
			)
		)
			return;
		audio.play("ui");
		activate(b.dataset.action);
	}
});
document.addEventListener("input", (e) => {
	const n = e.target.dataset.config;
	if (n) {
		config[n] =
			e.target.type === "checkbox"
				? e.target.checked
				: e.target.type === "range"
					? Number(e.target.value)
					: e.target.value;
		const o = e.target.nextElementSibling;
		if (o?.tagName === "OUTPUT")
			o.textContent =
				n === "music" || n === "sfx"
					? Math.round(config[n] * 100) + "%"
					: config[n];
		saveConfig();
	}
});
document.addEventListener("change", (e) => {
	if (e.target.dataset.config) {
		config[e.target.dataset.config] =
			e.target.type === "checkbox"
				? e.target.checked
				: e.target.type === "range"
					? Number(e.target.value)
					: e.target.value;
		saveConfig();
	}
	if (e.target.dataset.dev === "floor") {
		state.floor = Number(e.target.value);
		for (const p of state.players) {
			p.x = 0;
			p.z = 5;
		}
		spawnEnemies(state.floor);
		view.setFloor(state.floor);
		rebuildStatics();
		syncBodies();
		rebuildDoors();
		updateObjective();
	}
	if (e.target.dataset.mapFloor) {
		mapFloor = +e.target.dataset.mapFloor;
	}
});
document.addEventListener("click", (e) => {
	if (window.AIHub?.active && e.target.closest("a")) e.preventDefault();
	const b = e.target.closest("[data-map-floor]");
	if (b) {
		mapFloor = Number(b.dataset.mapFloor);
		$("overlay").innerHTML = mapContent();
	}
});
document.addEventListener("pointermove", (e) => {
	if (e.pointerType !== "touch" && (e.movementX || e.movementY))
		markInput("keyboard");
});
document.addEventListener("pointerover", (e) => {
	const b = e.target.closest("button");
	if (b && inputMode !== "touch") b.focus({ preventScroll: true });
});
function adjustFocusedControl(direction) {
	const el = document.activeElement;
	if (el?.type === "range") {
		el.value = Number(el.value) + direction * Number(el.step || 0.1);
		el.dispatchEvent(new Event("input", { bubbles: true }));
		return true;
	}
	if (el?.tagName === "SELECT") {
		el.selectedIndex =
			(el.selectedIndex + direction + el.options.length) % el.options.length;
		el.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new Event("change", { bubbles: true }));
		return true;
	}
	if (el?.type === "checkbox") {
		el.click();
		return true;
	}
	return false;
}
function activateFocused() {
	const el = document.activeElement;
	if (el?.tagName === "BUTTON" || el?.type === "checkbox") el.click();
	else if (el?.tagName === "SELECT") adjustFocusedControl(1);
	else if (!overlayPage && state.phase === "title") activate("solo");
}
function handleMenuDirection(direction) {
	const parent = overlayPage ? $("overlay") : $("title");
	const els = Array.from(
		parent.querySelectorAll("button,input,select,a"),
	).filter((el) => el.offsetParent !== null);
	if (!els.length) return;
	let index = els.indexOf(document.activeElement);
	index = (index + direction + els.length) % els.length;
	els[index].focus({ preventScroll: true });
	els[index].scrollIntoView({ block: "nearest" });
	audio.play("ui");
}
document.addEventListener("keydown", (e) => {
	if (hubEnded) return;
	const tag = e.target.tagName;
	if (tag === "INPUT" && e.target.type === "text") return;
	if (markInput()) return;
	if (
		[
			"Enter",
			"Space",
			"Tab",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Backspace",
		].includes(e.code)
	)
		e.preventDefault();
	if (e.repeat) return;
	keys.add(e.code);
	if (overlayPage || state.phase === "title") {
		if (e.code === "PageDown" || e.code === "PageUp") {
			e.preventDefault();
			$("overlay")
				.querySelector(".panel")
				?.scrollBy(0, e.code === "PageDown" ? 350 : -350);
		} else if (e.code === "Escape") goBack();
		else if (e.code === "ArrowDown" || e.code === "KeyS")
			handleMenuDirection(1);
		else if (e.code === "ArrowUp" || e.code === "KeyW") handleMenuDirection(-1);
		else if (e.code === "ArrowLeft") adjustFocusedControl(-1);
		else if (e.code === "ArrowRight") adjustFocusedControl(1);
		else if (e.code === "Enter" || e.code === "Space") activateFocused();
		return;
	}
	if (e.code === "Escape") {
		activate("pause");
		return;
	}
	if (e.code === "Tab") {
		openOverlay("map");
		return;
	}
	if (e.code === "Space") controls.match = true;
	if (e.code === "KeyE") controls.interact = true;
	if (e.code === "ShiftLeft") controls.dash = true;
	if (e.code === "KeyQ") controls.drop = true;
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	touch.active = false;
});
let clickTarget = null,
	clickPath = [],
	lastTap = 0;
$("world").addEventListener("pointerdown", (e) => {
	if (markInput(e.pointerType === "touch" ? "touch" : "keyboard")) return;
	if (state.phase !== "playing" || overlayPage) return;
	if (e.pointerType === "touch") {
		touch.active = true;
		touch.id = e.pointerId;
		touch.sx = e.clientX;
		touch.sy = e.clientY;
		touch.x = 0;
		touch.z = 0;
		$("world").setPointerCapture(e.pointerId);
		$("touch-ring").classList.remove("hidden");
		$("touch-ring").style.left = e.clientX - 45 + "px";
		$("touch-ring").style.top = e.clientY - 45 + "px";
		if (performance.now() - lastTap < 300) controls.dash = true;
		lastTap = performance.now();
	} else {
		if (e.button === 2) controls.dash = true;
		else {
			const v = view.unproject?.(e.clientX, e.clientY);
			if (v) {
				const p = me();
				const near = state.items.find(
					(i) =>
						i.held === null &&
						i.floor === state.floor &&
						Math.hypot(i.x - v.x, i.z - v.z) < 1.7,
				);
				if (near && Math.hypot(p.x - near.x, p.z - near.z) < 2)
					controls.interact = true;
				else {
					clickTarget = v;
					clickPath = findPath(v.x, v.z);
				}
			}
		}
	}
});
$("world").addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch" && touch.active && touch.id === e.pointerId) {
		const sx = (e.clientX - touch.sx) / 45,
			sy = (e.clientY - touch.sy) / 45;
		touch.x = (sx + sy) * 0.707;
		touch.z = (sy - sx) * 0.707;
		const l = Math.hypot(touch.x, touch.z);
		if (l > 1) {
			touch.x /= l;
			touch.z /= l;
		}
	}
});
function endTouch(e) {
	if (e.pointerId === touch.id) {
		touch.active = false;
		touch.x = touch.z = 0;
		$("touch-ring").classList.add("hidden");
	}
}
$("world").addEventListener("pointerup", endTouch);
$("world").addEventListener("pointercancel", endTouch);
$("world").addEventListener("contextmenu", (e) => e.preventDefault());
function screenVector(x, y) {
	return { x: (x + y) * 0.70710678, z: (y - x) * 0.70710678 };
}
function keyboardInput(second = false) {
	const x = second
		? Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"))
		: Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
	const y = second
		? Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp"))
		: Number(keys.has("KeyS")) - Number(keys.has("KeyW"));
	const u = screenVector(x, y);
	if (second) {
		u.interact = keys.delete("Enter");
		u.dash = keys.delete("ShiftRight");
		u.match = keys.delete("Slash");
		u.drop = keys.delete("Backspace");
	} else
		Object.assign(u, {
			match: controls.match,
			interact: controls.interact,
			dash: controls.dash,
			drop: controls.drop,
		});
	return u;
}
function pollPads() {
	const result = [];
	for (const pad of navigator.getGamepads?.() || []) {
		if (!pad?.connected) continue;
		const prev = prevPads.get(pad.index) || [];
		const now = pad.buttons.map((b) => b.pressed);
		const edge = (i) => now[i] && !prev[i];
		let x = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0,
			y = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
		x += (now[15] ? 1 : 0) - (now[14] ? 1 : 0);
		y += (now[13] ? 1 : 0) - (now[12] ? 1 : 0);
		const any =
			x ||
			y ||
			Math.abs(pad.axes[2] || 0) > 0.2 ||
			Math.abs(pad.axes[3] || 0) > 0.2 ||
			now.some(Boolean);
		if (any && inputMode !== "gamepad") {
			if (markInput("gamepad")) {
				prevPads.set(pad.index, now);
				continue;
			}
		} else if (any) idle = 0;
		if (any && state.phase === "attract") {
			returnToTitle();
			prevPads.set(pad.index, now);
			continue;
		}
		if (overlayPage || state.phase === "title") {
			if (overlayPage && Math.abs(pad.axes[3] || 0) > 0.2)
				$("overlay")
					.querySelector(".panel")
					?.scrollBy(0, pad.axes[3] * 22);
			if (edge(13) || (!prev.axisDown && y > 0.6)) handleMenuDirection(1);
			if (edge(12) || (!prev.axisUp && y < -0.6)) handleMenuDirection(-1);
			if (edge(0)) activateFocused();
			if (edge(1) || (edge(9) && !now[8])) goBack();
			if (edge(14) || edge(15)) adjustFocusedControl(edge(15) ? 1 : -1);
		} else {
			if (edge(9) && !now[8]) activate("pause");
			if (edge(4)) openOverlay("map");
			const u = screenVector(x, y);
			Object.assign(u, {
				interact: edge(0),
				dash: edge(1),
				match: edge(2),
				drop: edge(3),
			});
			result.push(u);
		}
		now.axisDown = y > 0.6;
		now.axisUp = y < -0.6;
		prevPads.set(pad.index, now);
	}
	return result;
}
function getInputs() {
	const pads = pollPads(),
		map = new Map();
	if (overlayPage || state.phase === "title" || hubEnded) {
		clearEdges(controls);
		return map;
	}
	let u = keyboardInput();
	if (pads[0]) u = pads[0];
	if (touch.active) u = { ...u, x: touch.x, z: touch.z };
	if (clickTarget && !pads[0] && !touch.active && Math.hypot(u.x, u.z) < 0.1) {
		const p = me();
		while (
			clickPath.length &&
			Math.hypot(clickPath[0].x - p.x, clickPath[0].z - p.z) < 0.24
		)
			clickPath.shift();
		const target = clickPath[0] || clickTarget,
			dx = target.x - p.x,
			dz = target.z - p.z,
			l = Math.hypot(dx, dz);
		if (l > 0.24) {
			u.x = dx / l;
			u.z = dz / l;
		} else clickTarget = null;
	} else if (Math.hypot(u.x, u.z) > 0.1) clickTarget = null;
	if (hubInfo?.server) {
		for (const p of state.players)
			map.set(p.id, remoteInputs.get(p.id) || { x: 0, z: 0 });
	} else map.set(network.mode === "solo" ? 0 : network.me, u);
	if (localMode) map.set(1, pads[1] || keyboardInput(true));
	clearEdges(controls);
	return map;
}
function blocked(x, z, margin = 0.46) {
	if (x < -17.4 || x > 17.4 || z < -10.4 || z > 10.4) return true;
	if (
		view.obstacles.some(
			(o) =>
				Math.abs(x - o.x) < o.w / 2 + margin &&
				Math.abs(z - o.z) < o.d / 2 + margin,
		)
	)
		return true;
	return state.doors.some(
		(d) =>
			d.floor === state.floor &&
			d.locked &&
			Math.abs(x - d.x) < (d.orientation === "x" ? 0.18 : 1.48) + margin &&
			Math.abs(z - d.z) < (d.orientation === "x" ? 1.48 : 0.18) + margin,
	);
}
function findPath(tx, tz, p = me()) {
	const step = 0.5,
		W = 69,
		H = 41;
	const toGrid = (x, z) => [
		Math.max(0, Math.min(W - 1, Math.round((x + 17) / step))),
		Math.max(0, Math.min(H - 1, Math.round((z + 10) / step))),
	];
	const [sx, sz] = toGrid(p.x, p.z),
		[gx, gz] = toGrid(tx, tz);
	const key = (x, z) => z * W + x;
	const start = key(sx, sz),
		goal = key(gx, gz),
		open = [start],
		parents = new Map(),
		g = new Map([[start, 0]]),
		f = new Map([[start, Math.abs(sx - gx) + Math.abs(sz - gz)]]),
		closed = new Set();
	let end = null;
	while (open.length) {
		let bi = 0;
		for (let i = 1; i < open.length; i++)
			if (f.get(open[i]) < f.get(open[bi])) bi = i;
		const n = open.splice(bi, 1)[0];
		if (n === goal) {
			end = n;
			break;
		}
		closed.add(n);
		const x = n % W,
			z = Math.floor(n / W);
		for (const [dx, dz] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		]) {
			const nx = x + dx,
				nz = z + dz,
				k = key(nx, nz);
			if (
				nx < 0 ||
				nx >= W ||
				nz < 0 ||
				nz >= H ||
				closed.has(k) ||
				blocked(nx * step - 17, nz * step - 10)
			)
				continue;
			const cost = g.get(n) + 1;
			if (cost < (g.get(k) ?? Infinity)) {
				parents.set(k, n);
				g.set(k, cost);
				f.set(k, cost + Math.abs(nx - gx) + Math.abs(nz - gz));
				if (!open.includes(k)) open.push(k);
			}
		}
	}
	if (end === null) return [];
	const path = [];
	while (end !== start) {
		path.unshift({
			x: (end % W) * step - 17,
			z: Math.floor(end / W) * step - 10,
		});
		end = parents.get(end);
	}
	if (!blocked(tx, tz)) path.push({ x: tx, z: tz });
	return path;
}
function routeTo(x, z) {
	const path = findPath(x, z);
	let steps = 0;
	for (const target of path) {
		while (
			Math.hypot(me().x - target.x, me().z - target.z) > 0.12 &&
			steps < 15000
		) {
			const p = me(),
				dx = target.x - p.x,
				dz = target.z - p.z,
				l = Math.hypot(dx, dz) || 1;
			simulate(1 / 60, new Map([[p.id, { x: dx / l, z: dz / l }]]));
			steps++;
		}
		if (steps >= 15000) break;
	}
	return {
		ok: Math.hypot(me().x - x, me().z - z) < 0.7,
		steps,
		x: me().x,
		z: me().z,
		pathLength: path.length,
	};
}
function makeAttractGoals() {
	aiGoals = [
		{ x: -12, z: 5, act: "interact" },
		{ x: 4, z: 5, act: "interact" },
		{ x: -14, z: -8, act: "up" },
		{ x: 8, z: 5.5, gate: true },
		{ x: 12, z: 5.5, act: "interact" },
		{ x: -14, z: -8, act: "up" },
		{ x: 14, z: -7, act: "interact" },
		{ x: -14, z: -8, act: "up" },
		{ x: 0, z: 1.8, act: "interact" },
		{ x: 0, z: -7, act: "interact" },
		{ x: 14, z: 8, act: "down" },
		{ x: 14, z: 8, act: "down" },
		{ x: 14, z: 8, act: "down" },
		{ x: 0, z: 9.5, act: "interact" },
	];
	aiIndex = 0;
	aiPath = [];
	aiStuck = 0;
}
function runAttract(dt) {
	if (aiIndex >= aiGoals.length) return;
	const p = me(),
		goal = aiGoals[aiIndex];
	if (goal.gate) {
		const d = state.doors.find(
			(d) => d.floor === state.floor && d.locked && d.kind === "key",
		);
		if (d) {
			goal.x = d.x - 1.7;
			goal.z = d.z;
		} else {
			aiIndex++;
			aiPath = [];
			return;
		}
	}
	if (!aiPath.length) {
		aiPath = findPath(goal.x, goal.z, p);
		if (!aiPath.length && Math.hypot(p.x - goal.x, p.z - goal.z) > 1) {
			aiStuck += dt;
			if (aiStuck > 2) {
				p.x = goal.x;
				p.z = goal.z;
				syncBodies();
				aiStuck = 0;
			}
		}
	}
	const target = aiPath[0];
	if (target) {
		const dx = target.x - p.x,
			dz = target.z - p.z,
			l = Math.hypot(dx, dz);
		if (l < 0.22) aiPath.shift();
		else {
			p.dir = Math.atan2(dx, dz);
			p.moving = true;
			movePlayer(p, (dx / l) * config.speed * dt, (dz / l) * config.speed * dt);
		}
	}
	if (Math.hypot(p.x - goal.x, p.z - goal.z) < 0.55) {
		if (goal.act || goal.gate) interact(p);
		if (
			goal.gate &&
			!state.doors.some(
				(d) => d.floor === state.floor && d.locked && d.kind === "key",
			)
		) {
			aiIndex++;
		} else if (!goal.gate) aiIndex++;
		aiPath = [];
	}
}
function debugCollect() {
	const p = me();
	dropItem(p, true);
	state.items = state.items.filter((i) => i.type !== "urn");
	state.items.push({
		id: "debug-urn",
		type: "urn",
		x: p.x,
		z: p.z,
		floor: state.floor,
		pieces: 3,
		held: p.id,
	});
	p.carry = "urn";
	p.pieces = 3;
	updateObjective();
}
function teleport(x, z, floor = state.floor) {
	if (floor !== state.floor) {
		state.floor = floor;
		spawnEnemies(floor);
		view.setFloor(floor);
		rebuildStatics();
		rebuildDoors();
	}
	const p = me();
	p.x = x;
	p.z = z;
	syncBodies();
	physics.step();
	updateObjective();
}
function frame(ms) {
	requestAnimationFrame(frame);
	if (!ready) return;
	const realDt = Math.max(0, (ms - (lastFrame || ms)) / 1000),
		dt = Math.min(0.04, realDt);
	lastFrame = ms;
	if (hubEnded) return;
	if (hubWaiting && network.time() >= 0) hubWaiting = false;
	const inputs = getInputs();
	if (hubWaiting) {
		$("title").classList.add("hidden");
		$("hud").classList.remove("hidden");
		$("objective").textContent =
			"The party begins in " +
			Math.max(1, Math.ceil(-network.time() / 1000)) +
			"…";
	}
	if (network.role === "guest") {
		network.sendInput(inputs.get(network.me) || { x: 0, z: 0 });
		state.time += dt;
	} else {
		if (state.phase === "attract") simulate(dt, new Map());
		else simulate(dt, inputs);
		if (network.role === "host") network.sendState(snapshot());
	}
	if (state.phase === "title" && !overlayPage && !window.AIHub?.active) {
		idle += realDt;
		state.time += dt;
		if (idle >= 10) startGame("attract");
	}
	if (endWait > 0) {
		endWait -= dt;
		if (endWait <= 0) startGame("attract");
	}
	if (toastLife > 0) {
		toastLife -= dt;
		if (toastLife <= 0) $("toast").classList.add("hidden");
	}
	hurtTime = Math.max(0, hurtTime - dt);
	$("vignette").classList.toggle("hurt", hurtTime > 0);
	state.revealItems = config.reveal;
	state.cameraPlayerId = network.me;
	state.localCoop = localMode;
	state.cameraAllPlayers = localMode;
	state.brightness = config.reveal ? 2 : config.brightness;
	if (!mutedRender) view.update(state, dt);
	audio.update(state, dt);
	if (state.phase === "playing" || state.phase === "paused") updateHUD();
}
window.addEventListener("error", (e) => {
	console.error("House error:", e.message);
});
async function boot() {
	try {
		const hubConnect = network.initHub();
		if (window.AIHub?.active) {
			$("title").classList.add("hidden");
			$("loading").querySelector(".loading-note").textContent =
				"Joining the house…";
		}
		await RAPIER.init();
		view = await createScene(THREE, $("world"));
		buildPhysics();
		spawnEnemies(0);
		ready = true;
		$("loading").classList.add("hidden");
		window.__game = {
			freezeRender: (v) => (mutedRender = v),
			get ready() {
				return ready;
			},
			get state() {
				return state;
			},
			get inputMode() {
				return inputMode;
			},
			get renderer() {
				return view.renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2";
			},
			config,
			audio,
			network,
			start: startGame,
			action: activate,
			tick: simulate,
			snapshot,
			teleport,
			findPath,
			routeTo,
			resetConfig,
			setIdle: (n) => {
				idle = n;
			},
			testStep: (seconds, u = {}) => {
				const count = Math.ceil(seconds * 60);
				for (let i = 0; i < count; i++)
					simulate(
						1 / 60,
						new Map([
							[
								me().id,
								{
									...u,
									match: i === 0 && u.match,
									interact: i === 0 && u.interact,
									dash: i === 0 && u.dash,
									drop: i === 0 && u.drop,
								},
							],
						]),
					);
				updateHUD();
				return snapshot();
			},
			debug: {
				setInvincible: (v) => (config.invincible = v),
				reveal: (v) => (config.reveal = v),
				collectAll: debugCollect,
				win: () => endGame(true),
				lose: () => {
					state.lives = 0;
					endGame(false);
				},
				solve: () => solvePlaythrough(),
			},
			context: () => contextFor(me()),
			view,
		};
		requestAnimationFrame(frame);
		const info = await hubConnect;
		if (info) {
			hubInfo = info;
			state.phase = "waiting";
			$("title").classList.add("hidden");
			network.ready();
		} else focusFirst();
	} catch (error) {
		console.error(error);
		$("loading").innerHTML =
			`<div class="boot-error"><h2>The match would not strike.</h2><p>${escapeHTML(error.message)}</p><p>This game loads Three.js and Rapier from the internet. Check the connection and reload. A browser with WebGPU or WebGL 2 is required.</p><button onclick="location.reload()">Try again</button></div>`;
		if (window.AIHub?.active) window.AIHub.fail(error.message);
	}
}
function solvePlaythrough() {
	config.invincible = true;
	const log = [];
	function route(x, z) {
		const r = routeTo(x, z);
		if (!r.ok)
			throw new Error("Cannot reach " + x + "," + z + " floor " + state.floor);
		log.push("route " + x + "," + z);
	}
	function act() {
		if (me().lit <= 0) strike(me());
		interact(me());
	}
	route(4, 5);
	act();
	route(-14, -8);
	act();
	route(4.2, 5.5);
	act();
	route(12, 5.5);
	act();
	route(-14, -8);
	act();
	route(14, -7);
	act();
	route(-14, -8);
	act();
	route(0, 1.8);
	act();
	route(0, -7);
	act();
	route(14, 8);
	act();
	route(14, 8);
	act();
	route(14, 8);
	act();
	route(0, 9.5);
	act();
	return {
		won: state.phase === "won",
		log,
		elapsed: state.elapsed,
		matches: state.matches,
		pieces: me().pieces,
	};
}
boot();
