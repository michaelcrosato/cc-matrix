import * as T from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
import {
	createMall,
	createCharacter,
	hazardModel,
	pickupModel,
	Effects,
	FLOOR,
	Z,
	INK,
} from "./world.js";
import { RadioAudio } from "./audio.js";
import credits from "./credits.json";

const $ = (s) => document.querySelector(s),
	show = (s, on = true) => $(s).classList.toggle("hidden", !on),
	clamp = T.MathUtils.clamp;
const audio = new RadioAudio(),
	hub = window.AIHub;
const DEFAULTS = {
	runSpeed: 7.8,
	crookSpeed: 3.6,
	jumpPower: 9.7,
	hazardRate: 4.5,
	clockSeconds: 180,
	damageSeconds: 6,
};
const cfg = { ...DEFAULTS };
let prefs = {
	glyph: "ps",
	music: 0.1,
	sfx: 0.65,
	voice: 0.45,
	shake: true,
	touchAssist: true,
};
try {
	prefs = {
		...prefs,
		...JSON.parse(localStorage.getItem("keystone-prefs") || "{}"),
	};
} catch {}
audio.musicVolume = prefs.music;
audio.sfxVolume = prefs.sfx;
audio.voiceVolume = prefs.voice;
const keys = new Set(),
	pressed = new Set(),
	touches = new Map();
let lastInput = "keyboard",
	lastActivity = performance.now(),
	touchAxis = 0,
	touchDuck = 0,
	touchJump = false,
	touchAct = false,
	touchJumpQueued = false,
	touchActQueued = false,
	queuedDash = false,
	stickTouch = null,
	stickStart = null;
let closing = false,
	recovering = false,
	recoveryError = null,
	deviceLosses = [];
window.addEventListener("pagehide", () => (closing = true));
let scene,
	camera,
	renderer,
	mall,
	world,
	effects,
	rendererName = "unknown",
	initialRendererName = "unknown",
	ready = false,
	lastFrame = 0,
	acc = 0,
	realClock = 0;
let phase = "title",
	menu = null,
	returnMenu = null,
	attract = false,
	localCoop = false,
	paused = false,
	netInfo = null,
	hubEnded = false,
	hubStarted = false,
	netLast = 0,
	netSeq = 0,
	remoteSeq = -1,
	remoteInputs = new Map(),
	remotePulses = new Map();
let players = [],
	thief = null,
	hazards = [],
	pickups = [],
	time = 180,
	totalTime = 180,
	score = 0,
	wave = 0,
	gameTime = 0,
	phaseTimer = 0,
	hazardTimer = 0,
	toastTimer = 0,
	dispatchTimer = 0,
	shake = 0,
	camX = 0,
	cheats = { invulnerable: false, freezeCrook: false, noHazards: false },
	liftRide = null;
let stats = { captures: 0, pickups: 0, hits: 0, jumps: 0, rides: 0, dashes: 0 },
	seenMechanics = new Set(),
	testExternal = false,
	roundReported = false,
	highScore = 0;
const targetNames = [
	"THE POCKET ROCKET",
	"THE FLYING FINGERS",
	"THE MIDNIGHT MARKDOWN",
];
const targetTips = [
	"Take a shortcut. Meet the crook upstairs.",
	"Duck the toy planes. Jump the rolling toys.",
	"Shopping carts incoming. Close the gap with a dash.",
];
const routes = [
	{ f: 0, start: -21, end: 14, nextF: 1, nextX: 21, dir: 1 },
	{ f: 1, start: 21, end: -21, nextF: 2, nextX: -14, dir: -1 },
	{ f: 2, start: -14, end: 21, nextF: 1, nextX: 14, dir: 1 },
	{ f: 1, start: 14, end: -14, nextF: 0, nextX: -21, dir: -1 },
];
const EMPTY = {
	x: 0,
	jump: false,
	duck: false,
	act: false,
	dash: false,
	down: false,
};
const labels = new Map();
try {
	highScore = Number(localStorage.getItem("keystone-best")) || 0;
} catch {}
const activeHub = () => !!(netInfo && hub.active);
const host = () => !activeHub() || hub.isHost;
const inGame = () => ["playing", "intermission"].includes(phase);
const savePrefs = () => {
	try {
		localStorage.setItem("keystone-prefs", JSON.stringify(prefs));
	} catch {}
};
const glyph = () =>
	prefs.glyph === "xbox"
		? { jump: "A", duck: "B", act: "X", dash: "RT", pause: "Menu" }
		: { jump: "✕", duck: "○", act: "□", dash: "R2", pause: "Options" };
function controls() {
	const g = glyph();
	return lastInput === "gamepad"
		? `${g.jump} JUMP　 ${g.duck} DUCK　 ${g.act} CUFF / RIDE　 ${g.dash} DASH`
		: "SPACE JUMP　 S / ↓ DUCK　 E CUFF / RIDE　 SHIFT DASH";
}
function announce(text, seconds = 5) {
	$("#dispatch-text").textContent = text;
	dispatchTimer = seconds;
}
function toast(text, duration = 2) {
	$("#toast").textContent = text;
	show("#toast");
	toastTimer = duration;
}
function markActivity(type) {
	lastActivity = performance.now();
	lastInput = type;
	document.body.classList.toggle("touch-game", type === "touch" && inGame());
	if (attract) {
		titleScreen();
		return true;
	}
	return false;
}
function damage(p) {
	if (p.invul > 0 || cheats.invulnerable || attract) return;
	p.hp--;
	p.hits++;
	stats.hits++;
	p.invul = 2.4;
	p.stun = 0.38;
	time = Math.max(0, time - cfg.damageSeconds);
	shake = 0.24;
	audio.sfx("hit");
	effects.word("BONK!", p.x, p.floor * FLOOR + 2.5, "#f47b51");
	effects.burst(p.x, p.y + 0.6, Z, 0xf47b51, 9);
	$("#hit-flash").style.opacity = "1";
	setTimeout(() => ($("#hit-flash").style.opacity = "0"), 160);
	if (p.hp <= 0) {
		p.hp = 4;
		time = Math.max(0, time - 12);
		p.invul = 4;
		toast("BADGE DENTED. SPIRIT INTACT.");
		announce("A little tea, a fresh badge. Back on the beat!", 5);
	} else announce("Oof! Lost a little time. Coffee mends a dented badge.", 4);
}
function clearActors() {
	for (const p of players) {
		p.visual.dispose();
		world.removeRigidBody(p.body);
	}
	players = [];
	if (thief) {
		thief.visual.dispose();
		thief = null;
	}
	for (const h of hazards) {
		h.model.removeFromParent();
		world.removeRigidBody(h.body);
	}
	hazards = [];
	for (const p of pickups) {
		p.model.removeFromParent();
	}
	pickups = [];
	for (const el of labels.values()) el.remove();
	labels.clear();
	liftRide = null;
	mall.lift.position.y = 0;
}
function spawnPlayer(id, x = -15, floor = 0, name = null) {
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(x, floor * FLOOR + 0.74, Z)
			.enabledTranslations(true, true, false)
			.lockRotations()
			.setCcdEnabled(true),
	);
	const collider = world.createCollider(
		RAPIER.ColliderDesc.capsule(0.43, 0.29)
			.setFriction(0)
			.setRestitution(0)
			.setDensity(1),
		body,
	);
	const visual = createCharacter(scene, "cop", id);
	const p = {
		id,
		name:
			name ||
			["OFFICER PIP", "OFFICER DOT", "OFFICER ACE", "OFFICER BEA"][id % 4],
		body,
		collider,
		visual,
		x,
		y: floor * FLOOR,
		floor,
		dir: 1,
		duck: false,
		hp: 4,
		invul: 0,
		stun: 0,
		dash: 0,
		dashCD: 0,
		actCD: 0,
		transit: null,
		score: 0,
		hits: 0,
		grounded: true,
		prevJump: false,
		prevAct: false,
		prevDash: false,
		input: { ...EMPTY },
	};
	players.push(p);
	return p;
}
function setPlayerFloor(p, f, x = p.x) {
	p.floor = clamp(f, 0, 2);
	p.x = clamp(x, -23, 23);
	p.y = p.floor * FLOOR;
	p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
	p.body.setTranslation({ x: p.x, y: p.y + 0.74, z: Z }, true);
	p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
	p.transit = null;
	p.invul = 0.3;
}
function spawnThief(index) {
	if (thief) thief.visual.dispose();
	const ri = index === 0 ? 0 : index === 1 ? 2 : 0,
		r = routes[ri],
		x = index === 0 ? 10 : index === 1 ? -19 : 19;
	thief = {
		x,
		y: r.f * FLOOR,
		floor: r.f,
		dir: r.dir,
		route: ri,
		visual: createCharacter(scene, "thief", index),
		transit: null,
		captured: false,
		speed: cfg.crookSpeed + index * 0.5,
	};
	thief.visual.root.position.set(x, thief.y, Z);
}
function spawnPickup(type, x, floor) {
	const model = pickupModel(scene, type);
	model.position.set(x, floor * FLOOR + 1, Z);
	pickups.push({ type, x, floor, model, alive: true, seed: Math.random() * 7 });
}
function seedPickups() {
	for (let f = 0; f < 3; f++) {
		for (const x of [-17, -8, 8, 18]) spawnPickup("loot", x, f);
		spawnPickup("coffee", f % 2 ? -4 : 4, f);
	}
}
function spawnHazard(type, floor, x = null, dir = null) {
	dir = dir ?? (Math.random() < 0.5 ? 1 : -1);
	x = x ?? -dir * 23;
	const y =
			floor * FLOOR + (type === "plane" ? 1.68 : type === "cart" ? 0.56 : 0.4),
		body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, Z),
		);
	const cd =
		type === "ball"
			? RAPIER.ColliderDesc.ball(0.39)
			: RAPIER.ColliderDesc.cuboid(
					type === "plane" ? 0.7 : 0.55,
					type === "plane" ? 0.29 : 0.49,
					type === "plane" ? 0.8 : 0.4,
				);
	const collider = world.createCollider(cd.setSensor(true), body),
		model = hazardModel(scene, type);
	model.position.set(x, y, Z);
	const h = {
		type,
		floor,
		x,
		y,
		dir,
		speed: type === "plane" ? 5.5 : type === "cart" ? 3.8 : 4.4,
		body,
		collider,
		model,
	};
	hazards.push(h);
	return h;
}
function resetGame(coop = false, demo = false) {
	clearActors();
	camX = innerWidth / innerHeight < 1.2 ? -12 : 0;
	touchJumpQueued = false;
	touchActQueued = false;
	queuedDash = false;
	remoteInputs.clear();
	remotePulses.clear();
	touchJump = false;
	touchAct = false;
	localCoop = coop;
	attract = demo;
	phase = "playing";
	menu = null;
	paused = false;
	wave = 0;
	score = 0;
	gameTime = 0;
	time = cfg.clockSeconds;
	totalTime = time;
	phaseTimer = 0;
	hazardTimer = 2.6;
	stats = { captures: 0, pickups: 0, hits: 0, jumps: 0, rides: 0, dashes: 0 };
	seenMechanics.clear();
	roundReported = false;
	cheats = { invulnerable: false, freezeCrook: false, noHazards: false };
	if (activeHub()) {
		for (const s of hub.players) spawnPlayer(s.id, -15 + s.id * 1.1, 0, s.name);
	} else {
		spawnPlayer(0);
		if (coop) spawnPlayer(1, -17);
	}
	spawnThief(0);
	seedPickups();
	spawnHazard("ball", 0, -5, -1);
	spawnHazard("plane", 1, 3, 1);
	show("#title", false);
	show("#overlay", false);
	show("#hud");
	show("#attract", demo);
	document.body.classList.toggle("touch-game", lastInput === "touch");
	show("#toast", false);
	announce(
		"Three crooks before closing. Ride the ↑ arrows. Cuff when close!",
		8,
	);
	if (!demo) {
		audio.init();
		audio.speak();
		toast("CLOCKING IN!", 1.7);
	}
	updateHUD();
}
function titleScreen() {
	attract = false;
	phase = "title";
	menu = null;
	paused = false;
	lastActivity = performance.now();
	show("#title");
	show("#hud", false);
	show("#overlay", false);
	show("#attract", false);
	show("#toast", false);
	document.body.classList.remove("touch-game");
	audio.silence(false);
	clearActors();
	spawnPlayer(0, -12, 0);
	spawnThief(0);
	thief.floor = 1;
	thief.y = FLOOR;
	thief.x = 11;
	thief.visual.root.position.set(11, FLOOR, Z);
	focusIndex = 0;
	refreshFocus();
}
function startTransit(p, kind, targetFloor, targetX) {
	if (p.transit) return false;
	const source = p.body.translation();
	p.transit = {
		kind,
		from: { x: source.x, y: source.y - 0.74 },
		to: { x: targetX, y: targetFloor * FLOOR },
		targetFloor,
		t: 0,
		duration: kind === "lift" ? 1.35 : 1.85,
	};
	p.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
	p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
	p.invul = 2.2;
	stats.rides++;
	seenMechanics.add(kind);
	if (kind === "lift") {
		liftRide = { p, fromY: p.floor * FLOOR };
		audio.sfx("bell");
		announce("Express service. No waiting for the shopping!", 4);
	} else audio.sfx("ui");
	return true;
}
function nearbyAction(p, input = {}) {
	if (!thief || !p || p.transit) return null;
	if (
		!thief.captured &&
		!thief.transit &&
		p.floor === thief.floor &&
		Math.abs(p.x - thief.x) < 2.15 &&
		Math.abs(p.y - thief.y) < 1.25
	)
		return { kind: "cuff", text: "CUFF THE CROOK!" };
	if (Math.abs(p.x) < 1.75 && (!liftRide || liftRide.p === p)) {
		const f =
			input.down || input.duck ? p.floor - 1 : p.floor === 2 ? 1 : p.floor + 1;
		return {
			kind: "lift",
			floor: clamp(f, 0, 2),
			x: 0,
			text: input.down && p.floor > 0 ? "LIFT ↓" : "EXPRESS LIFT ↑ / ↓",
		};
	}
	const candidates = [];
	for (let f = 0; f < 2; f++) {
		if (p.floor === f) {
			candidates.push(
				{ x: -21, floor: f + 1, toX: -14 },
				{ x: 14, floor: f + 1, toX: 21 },
			);
		}
		if (p.floor === f + 1)
			candidates.push(
				{ x: -14, floor: f, toX: -21 },
				{ x: 21, floor: f, toX: 14 },
			);
	}
	const c = candidates
		.filter((c) => Math.abs(c.x - p.x) < 1.55)
		.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
	return c
		? {
				kind: "escalator",
				floor: c.floor,
				x: c.toX,
				text: c.floor > p.floor ? "RIDE ESCALATOR ↑" : "RIDE ESCALATOR ↓",
			}
		: null;
}
function interact(p, input) {
	if (p.actCD > 0 || p.transit) return;
	p.actCD = 0.32;
	const a = nearbyAction(p, input);
	if (a?.kind === "cuff") capture(p);
	else if (a && a.floor !== p.floor) startTransit(p, a.kind, a.floor, a.x);
	else if (!a) {
		p.visual.cuff.reset().play();
		audio.sfx("ui");
	}
}
function capture(p) {
	if (!thief || thief.captured || phase !== "playing") return;
	thief.captured = true;
	phase = "intermission";
	phaseTimer = 2.4;
	score += 1000 + Math.ceil(time) * 5;
	p.score += 1000;
	stats.captures++;
	time = Math.min(240, time + 18);
	totalTime = Math.max(totalTime, time);
	p.hp = Math.min(4, p.hp + 1);
	p.visual.cuff.reset().play();
	audio.sfx("cuff");
	effects.burst(thief.x, thief.y + 1, Z, 0xfbd264, 44);
	effects.word(
		["NABBED!", "CUFFED!", "CASE CLOSED!"][wave],
		thief.x,
		thief.y + 2.6,
	);
	toast(
		[
			"ONE DOWN. TWO TO GO!",
			"TWO DOWN. ONE SLIPPERY CUSTOMER!",
			"THAT’S THE LOT!",
		][wave],
		2.3,
	);
	announce(
		[
			"The Pocket Rocket has run out of pocket. +18 seconds!",
			"Flying Fingers? More like sitting duck. +18 seconds!",
			"The mall is safe. The merchandise is mostly safe.",
		][wave],
		5,
	);
	seenMechanics.add("capture");
}
function reportRound(won) {
	if (!activeHub() || !hub.isHost || roundReported || hubEnded) return;
	roundReported = true;
	const ids = hub.players.map((p) => p.id),
		scores = Object.fromEntries(
			ids.map((id) => [id, players.find((p) => p.id === id)?.score || 0]),
		);
	hub.finish({
		standings: [ids],
		scores,
		won,
		stats: Object.fromEntries(
			ids.map((id) => [id, { Cuffs: stats.captures, Loot: stats.pickups }]),
		),
	});
}
function finish(won) {
	phase = won ? "win" : "lose";
	attract = false;
	show("#attract", false);
	audio.sfx(won ? "win" : "fail");
	if (won) score += Math.floor(time) * 10;
	try {
		if (score > highScore) {
			highScore = score;
			localStorage.setItem("keystone-best", String(highScore));
		}
	} catch {}
	reportRound(won);
	if (!activeHub()) openResult(won);
}
function updateThief(dt) {
	if (!thief || thief.captured) return;
	const c = thief;
	if (c.transit) {
		c.transit.t += dt;
		const k = clamp(c.transit.t / 1.7, 0, 1);
		c.x = T.MathUtils.lerp(c.transit.x, c.transit.toX, k);
		c.y = T.MathUtils.lerp(c.transit.y, c.transit.toF * FLOOR, k);
		if (k >= 1) {
			c.route = (c.route + 1) % 4;
			c.floor = routes[c.route].f;
			c.y = c.floor * FLOOR;
			c.dir = routes[c.route].dir;
			c.transit = null;
		}
	} else if (!cheats.freezeCrook) {
		c.speed = cfg.crookSpeed + wave * 0.5;
		c.x += c.dir * c.speed * dt;
		const r = routes[c.route];
		if ((c.dir > 0 && c.x >= r.end) || (c.dir < 0 && c.x <= r.end)) {
			c.x = r.end;
			c.transit = { t: 0, x: c.x, y: c.y, toX: r.nextX, toF: r.nextF };
		}
	}
}
function updatePlayer(p, input, dt) {
	p.input = input;
	if (p.id === (activeHub() ? hub.me : 0)) {
		if (input.jump) touchJumpQueued = false;
		if (input.act) touchActQueued = false;
		if (input.dash) queuedDash = false;
	}
	p.invul = Math.max(0, p.invul - dt);
	p.stun = Math.max(0, p.stun - dt);
	p.dashCD = Math.max(0, p.dashCD - dt);
	p.actCD = Math.max(0, p.actCD - dt);
	if (p.transit) {
		const tr = p.transit;
		tr.t += dt;
		const k = clamp(tr.t / tr.duration, 0, 1),
			s = k * k * (3 - 2 * k);
		p.x = T.MathUtils.lerp(tr.from.x, tr.to.x, s);
		p.y = T.MathUtils.lerp(tr.from.y, tr.to.y, s);
		p.body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.74, z: Z });
		if (tr.kind === "lift") mall.lift.position.y = p.y;
		if (k >= 1) {
			p.floor = tr.targetFloor;
			p.transit = null;
			p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
			p.body.setTranslation({ x: p.x, y: p.y + 0.74, z: Z }, true);
			p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			if (liftRide?.p === p) liftRide = null;
			p.invul = 0.5;
			audio.sfx("bell");
		}
		return;
	}
	const pos = p.body.translation(),
		vel = p.body.linvel();
	p.x = pos.x;
	p.y = pos.y - 0.74;
	p.grounded = pos.y - p.floor * FLOOR < 0.85 && vel.y < 1;
	const duck = !!input.duck && p.grounded;
	if (duck !== p.duck) {
		p.duck = duck;
		p.collider.setShape(new RAPIER.Capsule(duck ? 0.07 : 0.43, 0.29));
		p.collider.setTranslationWrtParent({ x: 0, y: duck ? -0.36 : 0, z: 0 });
		if (duck) seenMechanics.add("duck");
	}
	if (input.jump && !p.prevJump && p.grounded && !duck && p.stun <= 0) {
		p.body.setLinvel({ x: vel.x, y: cfg.jumpPower, z: 0 }, true);
		stats.jumps++;
		audio.sfx("jump");
		seenMechanics.add("jump");
	}
	if (input.dash && !p.prevDash && p.dashCD <= 0 && !duck && p.stun <= 0) {
		p.dash = 0.25;
		p.dashCD = 1.35;
		stats.dashes++;
		audio.sfx("dash");
		effects.burst(p.x, p.y + 0.5, Z, 0xd8ef9b, 7);
		seenMechanics.add("dash");
	}
	p.dash = Math.max(0, p.dash - dt);
	const ix = clamp(input.x || 0, -1, 1);
	if (Math.abs(ix) > 0.1) p.dir = Math.sign(ix);
	let speed = cfg.runSpeed * (duck ? 0.47 : 1) * (p.dash > 0 ? 1.65 : 1);
	const vx = p.stun > 0 ? 0 : p.dash > 0 ? p.dir * speed : ix * speed;
	const v = p.body.linvel();
	p.body.setLinvel({ x: vx, y: v.y, z: 0 }, true);
	if (input.act && !p.prevAct) interact(p, input);
	p.prevJump = !!input.jump;
	p.prevAct = !!input.act;
	p.prevDash = !!input.dash;
	if (p.x < -23.2 || p.x > 23.2) {
		p.body.setTranslation({ x: clamp(p.x, -23.2, 23.2), y: pos.y, z: Z }, true);
	}
	if (p.y < p.floor * FLOOR - 1) setPlayerFloor(p, p.floor, p.x);
}
function updateHazards(dt) {
	if (cheats.noHazards) return;
	hazardTimer -= dt;
	if (hazardTimer <= 0 && hazards.length < 15) {
		hazardTimer = cfg.hazardRate;
		const f = Math.floor(Math.random() * 3);
		const choices =
			wave === 0
				? ["ball", "ball", "plane"]
				: wave === 1
					? ["ball", "plane", "plane"]
					: ["cart", "plane", "ball"];
		spawnHazard(choices[Math.floor(Math.random() * choices.length)], f);
	}
	for (const h of hazards) {
		h.x += h.dir * h.speed * dt;
		h.body.setNextKinematicTranslation({ x: h.x, y: h.y, z: Z });
		h.model.position.x = h.x;
		if (h.type === "ball") h.model.rotation.z -= (h.dir * h.speed * dt) / 0.4;
		if (h.type === "plane") {
			h.model.getObjectByName("prop").rotation.x += dt * 45;
			h.model.rotation.z = Math.sin(gameTime * 6) * 0.025;
		}
	}
	const remove = hazards.filter((h) => Math.abs(h.x) > 25);
	for (const h of remove) {
		world.removeRigidBody(h.body);
		h.model.removeFromParent();
	}
	hazards = hazards.filter((h) => Math.abs(h.x) <= 25);
}
function pickupCheck(p) {
	for (const o of pickups) {
		if (
			!o.alive ||
			o.floor !== p.floor ||
			p.transit ||
			Math.abs(o.x - p.x) > 0.7
		)
			continue;
		if (Math.abs(p.y - p.floor * FLOOR) > 0.95) continue;
		o.alive = false;
		o.model.visible = false;
		if (o.type === "coffee") {
			p.hp = Math.min(4, p.hp + 1);
			time = Math.min(240, time + 5);
			audio.sfx("coffee");
			effects.word("COFFEE!", p.x, p.y + 2.3, "#d8ef9b");
			seenMechanics.add("coffee");
		} else {
			score += 100;
			p.score += 100;
			stats.pickups++;
			time = Math.min(240, time + 2);
			audio.sfx("pickup");
			effects.word("+100", p.x, p.y + 2.1);
			seenMechanics.add("loot");
		}
		effects.burst(p.x, p.y + 1, Z, 0xf4d17b, 7);
	}
}
function botInput(p) {
	if (!thief || thief.captured) return { ...EMPTY };
	const c = thief;
	let desiredX = c.x,
		act = false,
		down = false;
	if (p.transit) return { ...EMPTY };
	if (p.floor !== c.floor) {
		down = p.floor > c.floor;
		const xs = down ? [-14, 0, 21] : [-21, 0, 14];
		desiredX = xs.reduce((a, b) =>
			Math.abs(a - p.x) < Math.abs(b - p.x) ? a : b,
		);
		if (Math.abs(desiredX - p.x) < 0.7) act = true;
	} else act = Math.abs(c.x - p.x) < 2.0;
	const dist = desiredX - p.x;
	let x = Math.abs(dist) < 0.45 ? 0 : Math.sign(dist),
		jump = false,
		duck = down && act;
	for (const h of hazards) {
		if (h.floor !== p.floor || Math.abs(h.x - p.x) > 3.0) continue;
		if (h.type === "plane" && Math.abs(h.x - p.x) < 2.4) duck = true;
		else if (h.type !== "plane" && Math.abs(h.x - p.x) < 2.5) jump = true;
	}
	if (p.prevAct && act) act = false;
	return {
		x,
		jump,
		duck,
		act,
		down,
		dash: Math.abs(dist) > 6 && !duck && p.dashCD <= 0,
	};
}

function simulate(dt, override = null) {
	if (
		(paused && !activeHub()) ||
		hubEnded ||
		phase === "title" ||
		phase === "hubwait" ||
		phase === "win" ||
		phase === "lose" ||
		phase === "ended"
	)
		return;
	if (activeHub() && (!hubStarted || hub.time() < 0)) return;
	if (!host()) return;
	gameTime += dt;
	if (phase === "playing") {
		time = Math.max(0, time - dt);
		if (time <= 0) {
			if (attract) {
				resetGame(false, true);
				return;
			}
			finish(false);
			return;
		}
	}
	if (phase === "intermission") {
		phaseTimer -= dt;
		if (phaseTimer <= 0) {
			if (wave >= 2) {
				if (attract) {
					resetGame(false, true);
					return;
				}
				finish(true);
				return;
			}
			wave++;
			phase = "playing";
			spawnThief(wave);
			for (const p of players) p.hp = Math.min(4, p.hp + 1);
			spawnHazard(
				wave === 1 ? "plane" : "cart",
				thief.floor,
				thief.x - 8,
				thief.dir,
			);
			announce(targetTips[wave], 7);
		}
	}
	updateThief(dt);
	updateHazards(dt);
	for (let i = 0; i < players.length; i++) {
		const p = players[i];
		let input;
		if (override) input = override[p.id] || { ...EMPTY };
		else if (attract) input = botInput(p);
		else if (activeHub())
			input =
				p.id === hub.me && !hub.server
					? readPlayer(0)
					: consumeRemoteInput(p.id);
		else input = readPlayer(i);
		updatePlayer(p, input, dt);
	}
	world.timestep = dt;
	world.step();
	for (const p of players) {
		const pos = p.body.translation();
		if (!p.transit) {
			p.x = pos.x;
			p.y = pos.y - 0.74;
		}
		if (!p.transit && !cheats.noHazards)
			for (const h of hazards) {
				if (
					p.floor === h.floor &&
					world.intersectionPair(p.collider, h.collider)
				)
					damage(p);
			}
		pickupCheck(p);
	}
	for (const o of pickups)
		if (o.alive) {
			o.model.position.y =
				o.floor * FLOOR + 1 + Math.sin(gameTime * 3 + o.seed) * 0.12;
			o.model.rotation.y = Math.sin(gameTime + o.seed) * 0.2;
		}
}

// Input from a standard-mapped pad, keyboard or unobtrusive touch gestures.
let pads = [],
	padPrev = [],
	padNow = [],
	padNavTime = 0,
	focusIndex = 0;
function readPlayer(index) {
	if (menu) return { ...EMPTY };
	let pad = pads[index];
	if (!localCoop && index === 0) pad = pads.find(Boolean);
	const b = (n) => !!pad?.buttons[n]?.pressed;
	const axis = pad?.axes?.[0] || 0;
	const left = index === 0 ? ["KeyA", "ArrowLeft"] : ["KeyJ"],
		right = index === 0 ? ["KeyD", "ArrowRight"] : ["KeyL"];
	return {
		x: clamp(
			(right.some((k) => keys.has(k)) ? 1 : 0) -
				(left.some((k) => keys.has(k)) ? 1 : 0) +
				(Math.abs(axis) > 0.16 ? axis : 0) +
				(b(15) ? 1 : 0) -
				(b(14) ? 1 : 0) +
				(index === 0 ? touchAxis : 0),
			-1,
			1,
		),
		jump:
			(index === 0
				? keys.has("Space") || touchJump || touchJumpQueued
				: keys.has("KeyI")) || b(0),
		duck:
			(index === 0
				? keys.has("KeyS") || keys.has("ArrowDown") || touchDuck > 0
				: keys.has("KeyK")) ||
			b(1) ||
			b(13),
		act:
			(index === 0
				? keys.has("KeyE") ||
					keys.has("KeyW") ||
					keys.has("ArrowUp") ||
					touchAct ||
					touchActQueued
				: keys.has("KeyU")) ||
			b(2) ||
			b(12),
		down:
			(index === 0
				? keys.has("KeyS") || keys.has("ArrowDown")
				: keys.has("KeyK")) || b(13),
		dash:
			(index === 0
				? keys.has("ShiftLeft") || keys.has("ShiftRight") || queuedDash
				: keys.has("KeyO")) ||
			b(7) ||
			b(5),
	};
}
function focusables() {
	const root = menu ? $("#modal") : phase === "title" ? $("#main-menu") : null;
	return root
		? [
				...root.querySelectorAll("button:not(:disabled),input[type=range]"),
			].filter((el) => el.offsetParent !== null)
		: [];
}
function refreshFocus() {
	const all = focusables();
	focusIndex = clamp(focusIndex, 0, Math.max(0, all.length - 1));
	document
		.querySelectorAll(".focused")
		.forEach((el) => el.classList.remove("focused"));
	if (all[focusIndex]) all[focusIndex].classList.add("focused");
}
function moveFocus(n) {
	const all = focusables();
	if (!all.length) return;
	focusIndex = (focusIndex + n + all.length) % all.length;
	refreshFocus();
	all[focusIndex].scrollIntoView({ block: "nearest" });
	audio.sfx("ui");
}
function menuAdjust(n) {
	const all = focusables(),
		el = all[focusIndex];
	if (el?.type === "range") {
		el.value = clamp(
			Number(el.value) + n * Number(el.step || 1),
			Number(el.min),
			Number(el.max),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	} else moveFocus(n);
}
function menuAccept() {
	const el = focusables()[focusIndex];
	if (el?.tagName === "BUTTON") el.click();
}
function pollPads() {
	pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
	padNow = pads.map((p) => p.buttons.map((b) => b.pressed));
	const pad = pads[0];
	if (pad) {
		const prev = padPrev[0] || [],
			newPress = pad.buttons.some((b, i) => b.pressed && !prev[i]),
			axes = pad.axes.some((a) => Math.abs(a) > 0.16);
		if ((newPress || axes) && lastInput !== "gamepad") {
			if (markActivity("gamepad")) {
				padPrev = padNow;
				return;
			}
		}
		if (newPress || axes) lastActivity = performance.now();
		if (attract && (newPress || axes)) {
			markActivity("gamepad");
			padPrev = padNow;
			return;
		}
		const rise = (i) => pad.buttons[i]?.pressed && !prev[i];
		if (activeHub() && !hub.isHost && inGame() && !menu) {
			if (rise(0)) touchJumpQueued = true;
			if (rise(2) || rise(12)) touchActQueued = true;
			if (rise(7) || rise(5)) queuedDash = true;
		}
		if (rise(9) && !pad.buttons[8]?.pressed) {
			if (menu) backMenu();
			else if (inGame()) openPause();
		}
		if (menu || phase === "title") {
			if (menu && Math.abs(pad.axes[3] || 0) > 0.2)
				$("#modal").scrollTop += (pad.axes[3] || 0) * 35;
			if (rise(0)) menuAccept();
			if (rise(1) && menu) backMenu();
			if (performance.now() > padNavTime) {
				const y = pad.axes[1] || 0,
					x = pad.axes[0] || 0;
				if (pad.buttons[12]?.pressed || y < -0.55) {
					moveFocus(-1);
					padNavTime = performance.now() + 210;
				} else if (pad.buttons[13]?.pressed || y > 0.55) {
					moveFocus(1);
					padNavTime = performance.now() + 210;
				} else if (pad.buttons[14]?.pressed || x < -0.6) {
					menuAdjust(-1);
					padNavTime = performance.now() + 180;
				} else if (pad.buttons[15]?.pressed || x > 0.6) {
					menuAdjust(1);
					padNavTime = performance.now() + 180;
				}
			}
		}
	}
	padPrev = padNow;
}

window.addEventListener("keydown", (e) => {
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
	if (e.repeat && ["Enter", "Escape", "Space"].includes(e.code)) return;
	if (markActivity("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.init();
	keys.add(e.code);
	if (activeHub() && !hub.isHost && inGame() && !menu) {
		if (e.code === "Space") touchJumpQueued = true;
		if (["KeyE", "KeyW", "ArrowUp"].includes(e.code)) touchActQueued = true;
		if (e.code.startsWith("Shift")) queuedDash = true;
	}
	if (e.code === "Escape" || e.code === "KeyP") {
		if (menu) backMenu();
		else if (inGame()) openPause();
		return;
	}
	if (menu || phase === "title") {
		if (e.code === "ArrowUp" || e.code === "KeyW") moveFocus(-1);
		if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
			moveFocus(e.shiftKey ? -1 : 1);
		if (e.code === "ArrowLeft") menuAdjust(-1);
		if (e.code === "ArrowRight") menuAdjust(1);
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			menuAccept();
		}
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	touchAxis = 0;
	if (inGame() && !attract && !activeHub() && !testExternal) openPause();
});
document.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	if (attract && (e.movementX || e.movementY)) {
		markActivity("keyboard");
		return;
	}
	if (e.movementX || e.movementY) lastActivity = performance.now();
	const el = e.target.closest("button,input[type=range]");
	if (el) {
		lastInput = "keyboard";
		const all = focusables(),
			i = all.indexOf(el);
		if (i >= 0) {
			focusIndex = i;
			refreshFocus();
		}
	}
});
document.addEventListener(
	"pointerdown",
	(e) => {
		const isTouch = e.pointerType === "touch";
		if (markActivity(isTouch ? "touch" : "keyboard")) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		audio.init();
		if (e.target.closest("button,input") || menu || !inGame()) return;
		if (!isTouch) {
			if (nearbyAction(players[0])) {
				touchAct = true;
				touchActQueued = true;
				setTimeout(() => (touchAct = false), 150);
			}
			return;
		}
		touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			t: performance.now(),
		});
		if (e.clientX < innerWidth * 0.52 && stickTouch === null) {
			stickTouch = e.pointerId;
			stickStart = { x: e.clientX, y: e.clientY };
			const s = $("#touch-stick");
			s.style.display = "block";
			s.style.left = e.clientX + "px";
			s.style.top = e.clientY + "px";
		} else {
			touchJump = true;
			touchJumpQueued = true;
		}
	},
	{ capture: true },
);
document.addEventListener(
	"pointermove",
	(e) => {
		if (e.pointerType !== "touch" || menu) return;
		const t = touches.get(e.pointerId);
		if (!t) return;
		const dy = e.clientY - t.y;
		if (e.pointerId === stickTouch) {
			touchAxis = clamp((e.clientX - stickStart.x) / 52, -1, 1);
			$("#touch-stick i").style.transform =
				`translate(${touchAxis * 28}px,${clamp(dy / 3, -15, 15)}px)`;
		}
		if (dy > 32) {
			touchDuck = 1;
			touchJump = false;
		}
	},
	{ passive: true },
);
function touchEnd(e) {
	if (e.pointerId === stickTouch) {
		stickTouch = null;
		touchAxis = 0;
		$("#touch-stick").style.display = "none";
	}
	touches.delete(e.pointerId);
	touchJump = false;
	if (!touches.size) {
		touchJump = false;
		touchDuck = 0;
	}
	touchAct = false;
}
document.addEventListener("pointerup", touchEnd);
document.addEventListener("pointercancel", touchEnd);
$("#touch-action").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	touchAct = true;
	touchActQueued = true;
});
$("#action-prompt").addEventListener("pointerdown", () => {
	touchAct = true;
	touchActQueued = true;
	setTimeout(() => (touchAct = false), 160);
});

function button(text, action, cls = "") {
	return `<button class="${cls}" data-action="${action}">${text}</button>`;
}
function modal(kind, html) {
	menu = kind;
	show("#overlay");
	$("#modal").innerHTML = html;
	focusIndex = 0;
	refreshFocus();
}
function openPause() {
	if (!inGame() || attract || hubEnded) return;
	paused = !activeHub();
	audio.silence(paused);
	modal(
		"pause",
		`<div class="eyebrow">TINSEL GALLERIA · NIGHT WATCH</div><h2>A little breather.</h2><div class="menu">${button("Back on the beat <em>RESUME ↗</em>", "resume", "primary")}${button("Settings", "settings")}${button("Field guide", "howto")}${button("Developer tools <em>LIVE BALANCE</em>", "dev")}${button("About & credits", "about")}${!activeHub() ? button("End your shift <em>TITLE SCREEN</em>", "title") : ""}</div>${activeHub() ? '<p class="tiny">The shared shift continues while this menu is open.</p>' : ""}`,
	);
}
function closeMenu() {
	menu = null;
	paused = false;
	show("#overlay", false);
	audio.silence(false);
	keys.clear();
	lastActivity = performance.now();
}
function backMenu() {
	if (menu === "pause") {
		closeMenu();
		return;
	}
	if (menu === "result") {
		if (!activeHub()) titleScreen();
		return;
	}
	if (inGame()) openPause();
	else {
		closeMenu();
		focusIndex = 0;
		refreshFocus();
	}
}
function openSettings() {
	returnMenu = menu;
	modal(
		"settings",
		`<div class="eyebrow">MAKE YOURSELF COMFORTABLE</div><h2>Off-duty adjustments.</h2><div class="control-row"><label>Controller glyphs<small>Prompts follow your last input.</small></label><div class="setting-choice">${button("PlayStation", "ps", prefs.glyph === "ps" ? "selected small" : "small")}${button("Xbox", "xbox", prefs.glyph === "xbox" ? "selected small" : "small")}</div></div>${volumeSlider("music", "Music", prefs.music, "A little department-store swing. Default 10%.")}${volumeSlider("sfx", "Sound effects", prefs.sfx)}${volumeSlider("voice", "Radio gibberish", prefs.voice)}<div class="control-row"><label>Screen shake</label>${button(prefs.shake ? "On" : "Off", "shake", "small")}</div><div class="control-row"><label>Touch assistance<small>Auto-duck planes; auto-cuff at close range.</small></label>${button(prefs.touchAssist ? "On" : "Off", "assist", "small")}</div><div class="control-row"><label>Display<small>Rendering with ${rendererName}.</small></label>${button("Fullscreen", "fullscreen", "small")}</div><div class="close-row">${button("Back", "back", "primary")}</div>`,
	);
}
function volumeSlider(id, name, v, desc = "") {
	return `<div class="control-row"><label for="vol-${id}">${name}${desc ? `<small>${desc}</small>` : ""}</label><div><input id="vol-${id}" aria-label="${name}" type="range" min="0" max="100" step="1" value="${Math.round(v * 100)}" data-volume="${id}"><span class="value">${Math.round(v * 100)}%</span></div></div>`;
}
function openGuide() {
	modal(
		"guide",
		`<div class="eyebrow">THE OFFICER’S POCKET FIELD GUIDE</div><h2>Mind the merchandise.</h2><div class="card-grid"><div class="guide-card"><div class="big">01</div><h3>Cut them off.</h3><p>Chase across three floors. Use the yellow ↑ markers at escalator ends, or the express lift in the middle. Press action to ride; hold duck + action to take the lift down.</p></div><div class="guide-card"><div class="big">02</div><h3>Stay on your feet.</h3><p>Jump rolling balls and shopping carts. Duck beneath toy planes. Dash to close a gap. A bonk dents your badge and costs time. Coffee restores one badge pip and adds five seconds.</p></div><div class="guide-card"><div class="big">03</div><h3>Close the case.</h3><p>Get close on the same floor, then press action to cuff. Recover dropped loot for points and time. Cuff all three crooks before closing. Each capture adds eighteen seconds.</p></div></div><h3>${lastInput === "gamepad" ? "Your controller" : "Your controls"}</h3><p>${controls()}</p><p class="tiny">Move: left stick / A D or ← →. Pause: Options / Esc.<br>Local partner: second controller, or J L move · I jump · K duck · U action · O dash.<br>Touch: drag left thumb to move; tap the right side to jump; swipe down to duck. A contextual action appears when you can ride. Assisted cuffing and ducking are on by default.<br>Solo, two officers on one screen, or up to four together in an AI Hub session. In co-op, the clock and precinct score are shared.</p><div class="close-row">${button("Got it", "back", "primary")}</div>`,
	);
}
function openDev() {
	const vars = [
		["runSpeed", "Officer speed", 3, 14, 0.1],
		["crookSpeed", "Crook speed", 0, 8, 0.1],
		["jumpPower", "Jump power", 5, 15, 0.1],
		["hazardRate", "Seconds between hazards", 1, 12, 0.1],
		["clockSeconds", "Shift length (next shift)", 30, 360, 5],
		["damageSeconds", "Seconds lost per bonk", 0, 20, 1],
	];
	modal(
		"dev",
		`<div class="eyebrow">PRECINCT WORKSHOP · LIVE TOOLS</div><h2>Behind the badge.</h2><div class="dev-line">Physics: Rapier 0.19.3 · Animation: Three.js clips · ${rendererName}<br>Case ${wave + 1}/3 · ${hazards.length} hazards · ${world.bodies.len()} rigid bodies · ${activeHub() ? (host() ? "Hub host" : "Hub guest; host owns the world") : "Standalone"}</div>${vars.map(([id, name, min, max, step]) => `<div class="control-row"><label for="dev-${id}">${name}</label><div><input id="dev-${id}" aria-label="${name}" data-config="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${cfg[id]}"><span class="value">${cfg[id]}</span></div></div>`).join("")}<div class="dev-grid">${button("Invulnerability: " + (cheats.invulnerable ? "ON" : "OFF"), "god")}${button("Freeze crook: " + (cheats.freezeCrook ? "ON" : "OFF"), "freeze")}${button("Hazards: " + (cheats.noHazards ? "OFF" : "ON"), "hazards")}${button("Add 30 seconds", "time")}${button("Warp to next floor", "warp")}${button("Place crook beside officer", "summon")}${button("Spawn rolling ball", "ball")}${button("Spawn toy plane", "plane")}${button("Spawn shopping cart", "cart")}${button("Refill badges", "heal")}</div><div class="close-row">${button("Reset defaults", "defaults")}${button("Back to pause", "pausemenu")}${button("Resume", "resume", "primary")}</div>`,
	);
}
let aboutPage = 0;
function openAbout(index = 0) {
	aboutPage = index;
	const s = credits.sourceInformation,
		names = [
			"Source Information",
			"Testing Feedback",
			"Engine Feedback",
			"Prompt Feedback",
		];
	const body =
		index === 0
			? `<div class="credits-grid">${Object.entries(s)
					.map(
						([k, v]) =>
							`<b>${k.replace(/([A-Z])/g, " $1")}</b><span>${v}</span>`,
					)
					.join("")}</div>`
			: `<div class="feedback">${[credits.testingFeedback, credits.engineFeedback, credits.promptFeedback][index - 1].map((v, i) => `<p><b>${String(i + 1).padStart(2, "0")}.</b> ${v}</p>`).join("")}</div>`;
	modal(
		"about",
		`<div class="eyebrow">A SMALL BADGE. A BIG NIGHT.</div><h2>Keystone Catch-Up</h2><div class="credits-tabs">${names.map((n, i) => button(n, "credits" + i, i === index ? "selected small" : "small")).join("")}</div><h3>${names[index]}</h3>${body}<p class="tiny credits-foot">An original fan-inspired demo. All art, signs, music and sounds are written in code.<br>Three.js r180 (MIT) · Rapier 0.19.3 (Apache-2.0) · AI Hub client 1.4.0.<br>RIGHT STICK / MOUSE WHEEL TO SCROLL · CIRCLE / ESC TO GO BACK</p><div class="close-row">${button("Back", "back", "primary")}</div>`,
	);
	focusIndex = index;
	refreshFocus();
}

function openResult(won) {
	paused = false;
	modal(
		"result",
		`<div class="eyebrow">${won ? "ALL THREE CROOKS ACCOUNTED FOR" : "CLOSING TIME AT TINSEL GALLERIA"}</div><h2>${won ? "A clean-ish getaway." : "The crooks clocked out."}</h2><p>${won ? "The loot is back. The floors are scuffed. Your badge has never looked better." : "They made off with the bargains. Take a shortcut, watch the clock, and give it another shift."}</p><div class="result-score">${String(score).padStart(6, "0")} <span style="font-size:20px">POINTS</span></div><div class="result-stats"><div>CUFFS<b>${stats.captures} / 3</b></div><div>LOOT RECOVERED<b>${stats.pickups}</b></div><div>TIME REMAINING<b>${formatTime(time)}</b></div><div>BEST SHIFT<b>${highScore}</b></div></div><div class="close-row">${button("Clock in again", "restart", "primary")}${button("Back to title", "title")}</div>`,
	);
}

document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-action]");
	if (!b || b.disabled) return;
	const a = b.dataset.action;
	audio.init();
	audio.sfx("ui");
	const p =
		players.find((p) => p.id === (activeHub() ? hub.me : 0)) || players[0];
	switch (a) {
		case "solo":
			resetGame();
			break;
		case "coop":
			resetGame(true);
			break;
		case "pause":
			openPause();
			break;
		case "pausemenu":
			openPause();
			break;
		case "resume":
			closeMenu();
			break;
		case "settings":
			openSettings();
			break;
		case "howto":
			openGuide();
			break;
		case "credits0":
		case "credits1":
		case "credits2":
		case "credits3":
			openAbout(Number(a.slice(-1)));
			break;
		case "about":
			openAbout();
			break;
		case "dev":
			openDev();
			break;
		case "back":
			backMenu();
			break;
		case "title":
			if (!activeHub()) titleScreen();
			break;
		case "restart":
			if (!activeHub()) resetGame(localCoop);
			break;
		case "ps":
		case "xbox":
			prefs.glyph = a;
			savePrefs();
			openSettings();
			break;
		case "shake":
			prefs.shake = !prefs.shake;
			savePrefs();
			openSettings();
			break;
		case "assist":
			prefs.touchAssist = !prefs.touchAssist;
			savePrefs();
			openSettings();
			break;
		case "fullscreen":
			if (!document.fullscreenElement)
				document.documentElement.requestFullscreen?.().catch(() => {});
			else document.exitFullscreen?.().catch(() => {});
			break;
		case "god":
			cheats.invulnerable = !cheats.invulnerable;
			openDev();
			break;
		case "freeze":
			cheats.freezeCrook = !cheats.freezeCrook;
			openDev();
			break;
		case "hazards":
			cheats.noHazards = !cheats.noHazards;
			openDev();
			break;
		case "time":
			time += 30;
			totalTime = Math.max(time, totalTime);
			openDev();
			break;
		case "warp":
			if (p) setPlayerFloor(p, (p.floor + 1) % 3);
			openDev();
			break;
		case "summon":
			if (thief && p) {
				thief.floor = p.floor;
				thief.x = p.x + 1;
				thief.y = p.floor * FLOOR;
				thief.transit = null;
				thief.route = routes.findIndex((r) => r.f === p.floor);
				cheats.freezeCrook = true;
			}
			openDev();
			break;
		case "ball":
		case "plane":
		case "cart":
			if (p) spawnHazard(a, p.floor, p.x + 5, -1);
			openDev();
			break;
		case "heal":
			for (const p of players) p.hp = 4;
			openDev();
			break;
		case "defaults":
			Object.assign(cfg, DEFAULTS);
			cheats = { invulnerable: false, freezeCrook: false, noHazards: false };
			openDev();
			break;
	}
});
document.addEventListener("input", (e) => {
	const el = e.target;
	if (el.dataset.volume) {
		const id = el.dataset.volume,
			v = Number(el.value) / 100;
		prefs[id] = v;
		audio.setVolume(id, v);
		el.nextElementSibling.textContent = el.value + "%";
		savePrefs();
	}
	if (el.dataset.config) {
		const id = el.dataset.config;
		cfg[id] = Number(el.value);
		el.nextElementSibling.textContent = el.value;
	}
});

function formatTime(t) {
	t = Math.max(0, Math.ceil(t));
	return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function makeTag(id, cls) {
	if (!labels.has(id)) {
		const el = document.createElement("div");
		el.className = "world-tag " + cls;
		$("#world-labels").append(el);
		labels.set(id, el);
	}
	return labels.get(id);
}
const projected = new T.Vector3();
function tag(id, text, x, y, cls) {
	const el = makeTag(id, cls);
	el.textContent = text;
	projected.set(x, y, Z + 0.3).project(camera);
	const off = projected.x < -1 || projected.x > 1;
	let px = (projected.x * 0.5 + 0.5) * innerWidth,
		py = (-projected.y * 0.5 + 0.5) * innerHeight;
	if (off && cls === "thief") {
		px = clamp(px, 65, innerWidth - 65);
		py = clamp(py, 100, innerHeight - 100);
		el.textContent =
			(projected.x < 0 ? "◀ " : "▶ ") + text + " · " + (thief.floor + 1) + "F";
	}
	el.style.left = px + "px";
	el.style.top = py + "px";
	el.style.display = off && cls !== "thief" ? "none" : "block";
}

function updateHUD() {
	if (!ready || phase === "title") return;
	$("#case-number").textContent = `0${wave + 1} / 03`;
	$("#target-name").textContent = targetNames[wave];
	$("#target-tip").textContent = targetTips[wave];
	$("#clock").textContent = formatTime(time);
	$("#clock").style.color = time < 30 ? "#bd5034" : "";
	$("#clock-fill").style.width = clamp((time / totalTime) * 100, 0, 100) + "%";
	$("#score").textContent = String(score).padStart(6, "0");
	const p =
		players.find((p) => p.id === (activeHub() ? hub.me : 0)) || players[0];
	$("#health").textContent = p
		? Array.from({ length: 4 }, (_, i) => (i < p.hp ? "●" : "○")).join(" ")
		: "";
	$("#play-prompts").textContent = controls();
	$("#floor-map").innerHTML = [2, 1, 0]
		.map(
			(f) =>
				`<i class="${p?.floor === f ? "active" : ""}">${f + 1}F ${f === thief?.floor ? "◆" : ""}</i>`,
		)
		.join("");
	for (const p of players) tag("p" + p.id, p.name, p.x, p.y + 2.6, "player");
	if (thief) {
		const el = makeTag("thief", "thief");
		el.style.visibility = thief.captured ? "hidden" : "visible";
		tag(
			"thief",
			"◆ " +
				(thief.captured
					? "NABBED"
					: p?.floor === thief.floor && Math.abs(p.x - thief.x) < 2.15
						? "CUFF!"
						: "CROOK"),
			thief.x,
			thief.y + 2.5,
			"thief",
		);
	}
	if (p) {
		const action = nearbyAction(p, { down: keys.has("KeyS") || touchDuck > 0 });
		show("#action-prompt", !!action && !attract);
		if (action)
			$("#action-prompt").textContent =
				(lastInput === "gamepad" ? glyph().act : "E") + "  " + action.text;
		$("#touch-action").style.display = action ? "block" : "none";
		$("#touch-action").textContent = action?.kind === "cuff" ? "CUFF!" : "RIDE";
	}
}
function renderFrame(dt, forceRender = false) {
	realClock += dt;
	mall.animate(realClock);
	effects.update(paused && !activeHub() ? 0 : dt);
	if (phase === "title") {
		$("#title-input").textContent =
			lastInput === "gamepad"
				? "LEFT STICK MOVE · " +
					glyph().jump +
					" JUMP · " +
					glyph().act +
					" ACTION"
				: "← → / A D MOVE · SPACE JUMP · E ACTION";
		players[0]?.visual.root.position.set(
			-11 + Math.sin(realClock * 0.25) * 2,
			0,
			Z,
		);
		if (players[0])
			players[0].visual.animate(
				dt,
				2,
				false,
				Math.cos(realClock * 0.25) > 0 ? 1 : -1,
			);
		if (thief) {
			thief.visual.root.position.set(
				11 + Math.sin(realClock * 0.4) * 4,
				FLOOR,
				Z,
			);
			thief.visual.animate(
				dt,
				3,
				false,
				Math.cos(realClock * 0.4) > 0 ? 1 : -1,
			);
		}
	} else {
		for (const p of players) {
			p.visual.root.position.set(p.x, p.y, Z);
			p.visual.root.visible =
				p.invul <= 0 || Math.floor(realClock * 14) % 2 === 0 || attract;
			p.visual.animate(
				paused && !activeHub() ? 0 : dt,
				p.transit ? 3 : p.body.linvel().x,
				p.duck,
				p.dir,
				realClock,
			);
		}
		if (thief) {
			thief.visual.root.position.set(thief.x, thief.y, Z);
			thief.visual.animate(
				paused && !activeHub() ? 0 : dt,
				thief.captured ? 0 : thief.speed,
				false,
				thief.dir,
				realClock,
			);
			if (thief.captured)
				thief.visual.model.rotation.z = Math.sin(realClock * 8) * 0.07;
		}
	}
	const aspect = innerWidth / innerHeight;
	let w = phase === "title" ? (aspect < 1.2 ? 47 : 74) : aspect < 1.2 ? 30 : 56;
	const h = w / aspect;
	camera.left = -w / 2;
	camera.right = w / 2;
	camera.top = h / 2;
	camera.bottom = -h / 2;
	let targetX =
		phase === "title"
			? -11
			: aspect < 1.2
				? (
						players.find((p) => p.id === (activeHub() ? hub.me : 0)) ||
						players[0]
					)?.x || 0
				: 0;
	targetX = clamp(targetX, -12, 12);
	camX = forceRender
		? targetX
		: T.MathUtils.lerp(camX, targetX, Math.min(1, dt * 4));
	const sy = prefs.shake && shake > 0 ? (Math.random() - 0.5) * shake : 0.0;
	camera.position.set(camX, 18 + sy, 60);
	camera.lookAt(camX, 7.5 + sy, 0);
	camera.updateProjectionMatrix();
	camera.updateMatrixWorld();
	shake = Math.max(0, shake - dt);
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) show("#toast", false);
	}
	if (dispatchTimer > 0) {
		dispatchTimer -= dt;
		if (dispatchTimer <= 0) announce(targetTips[wave], 10);
	}
	updateHUD();
	if (
		!recovering &&
		(!testExternal || forceRender) &&
		(!activeHub() || (hubStarted && hub.time() >= 0 && !hub.server))
	)
		renderer.render(scene, camera);
}

function serialState() {
	return {
		phase,
		wave,
		time,
		score,
		gameTime,
		stats: { ...stats },
		players: players.map((p) => ({
			id: p.id,
			name: p.name,
			x: p.x,
			y: p.y,
			floor: p.floor,
			dir: p.dir,
			duck: p.duck,
			hp: p.hp,
			invul: p.invul,
			score: p.score,
			transit: !!p.transit,
			vx: p.body.linvel().x,
		})),
		thief: thief
			? {
					x: thief.x,
					y: thief.y,
					floor: thief.floor,
					dir: thief.dir,
					speed: thief.speed,
					captured: thief.captured,
					transit: !!thief.transit,
				}
			: null,
		hazards: hazards.map((h) => ({
			type: h.type,
			x: h.x,
			y: h.y,
			floor: h.floor,
			dir: h.dir,
		})),
		pickups: pickups.map((p) => p.alive),
		liftY: mall.lift.position.y,
	};
}
function applySnapshot(s) {
	if (!s || !Array.isArray(s.players)) return;
	phase = s.phase;
	wave = s.wave;
	time = s.time;
	score = s.score;
	gameTime = s.gameTime;
	stats = s.stats;
	for (const q of s.players) {
		let p = players.find((p) => p.id === q.id);
		if (!p) p = spawnPlayer(q.id, q.x, q.floor, q.name);
		Object.assign(p, {
			x: q.x,
			y: q.y,
			floor: q.floor,
			dir: q.dir,
			duck: q.duck,
			hp: q.hp,
			invul: q.invul,
			score: q.score,
		});
		p.body.setLinvel({ x: q.vx, y: 0, z: 0 }, true);
		p.body.setTranslation({ x: q.x, y: q.y + 0.74, z: Z }, true);
	}
	if (s.thief) {
		if (!thief || thief.visualVariant !== wave) {
			spawnThief(wave);
			thief.visualVariant = wave;
		}
		Object.assign(thief, s.thief);
		thief.transit = s.thief.transit ? {} : null;
	}
	while (hazards.length > s.hazards.length) {
		const h = hazards.pop();
		h.model.removeFromParent();
		world.removeRigidBody(h.body);
	}
	for (let i = 0; i < s.hazards.length; i++) {
		const a = s.hazards[i];
		if (hazards[i]?.type !== a.type) {
			if (hazards[i]) {
				hazards[i].model.removeFromParent();
				world.removeRigidBody(hazards[i].body);
			}
			const h = {
				type: a.type,
				model: hazardModel(scene, a.type),
				body: world.createRigidBody(
					RAPIER.RigidBodyDesc.kinematicPositionBased(),
				),
			};
			hazards[i] = h;
		}
		Object.assign(hazards[i], a);
		hazards[i].model.position.set(a.x, a.y, Z);
	}
	s.pickups.forEach((alive, i) => {
		if (pickups[i]) {
			pickups[i].alive = alive;
			pickups[i].model.visible = alive;
		}
	});
	mall.lift.position.y = s.liftY;
}
function consumeRemoteInput(id) {
	const base = remoteInputs.get(id) || EMPTY,
		pulse = remotePulses.get(id) || EMPTY;
	remotePulses.delete(id);
	return {
		...base,
		jump: base.jump || pulse.jump,
		act: base.act || pulse.act,
		dash: base.dash || pulse.dash,
	};
}
function networkTick() {
	if (!activeHub() || hubEnded || !hubStarted) return;
	const now = performance.now();
	if (now - netLast < 100) return;
	netLast = now;
	if (hub.isHost)
		hub.send(
			{ kind: "world", seq: netSeq++, ...serialState() },
			{ reliable: false },
		);
	else if (!hub.server) {
		const pulse = touchJumpQueued || touchActQueued || queuedDash;
		if (
			hub.send(
				{ kind: "input", seq: netSeq++, ...readPlayer(0) },
				{ to: hub.host, reliable: pulse },
			)
		) {
			touchJumpQueued = false;
			touchActQueued = false;
			queuedDash = false;
		}
	}
}

async function setupHub() {
	if (!hub.active) return;
	netInfo = await hub.connect({ mode: "shared-world", seats: [1, 4] });
	if (!netInfo) return;
	resetGame(false);
	phase = "hubwait";
	show("#toast", false);
	show("#overlay", false);
	audio.silence(false);
	hub.on("start", () => {
		hubStarted = true;
		phase = "playing";
		announce("Together on the beat. Three crooks. One precinct.", 6);
	});
	hub.on("message", (data, from) => {
		if (!data || hubEnded) return;
		if (
			hub.isHost &&
			data.kind === "input" &&
			hub.players.some((p) => p.id === from) &&
			from !== hub.host
		) {
			const pulse = remotePulses.get(from) || EMPTY;
			remotePulses.set(from, {
				jump: pulse.jump || !!data.jump,
				act: pulse.act || !!data.act,
				dash: pulse.dash || !!data.dash,
			});
			remoteInputs.set(from, {
				x: clamp(Number(data.x) || 0, -1, 1),
				jump: !!data.jump,
				duck: !!data.duck,
				act: !!data.act,
				dash: !!data.dash,
				down: !!data.down,
			});
		} else if (
			!hub.isHost &&
			data.kind === "world" &&
			from === hub.host &&
			data.seq > remoteSeq
		) {
			remoteSeq = data.seq;
			applySnapshot(data);
		}
	});
	hub.on("leave", ({ id }) => {
		remoteInputs.delete(id);
		remotePulses.delete(id);
		const p = players.find((p) => p.id === id);
		if (p) {
			p.visual.dispose();
			world.removeRigidBody(p.body);
			players = players.filter((p) => p.id !== id);
			labels.get("p" + id)?.remove();
			labels.delete("p" + id);
		}
	});
	hub.on("time-up", () => {
		if (hub.isHost) reportRound(stats.captures >= 3);
	});
	hub.on("end", () => {
		hubEnded = true;
		phase = "ended";
		keys.clear();
		audio.silence(true);
		show("#overlay", false);
		show("#toast", false);
	});
	hub.ready();
}

async function recoverRenderer(loop) {
	let canvas, context;
	for (let attempt = 0; attempt < 8; attempt++) {
		if (closing) return;
		if (attempt) await new Promise((resolve) => setTimeout(resolve, 700));
		canvas = document.createElement("canvas");
		context = canvas.getContext("webgl2", {
			antialias: true,
			alpha: true,
			depth: true,
		});
		if (context) break;
	}
	if (!context)
		throw new Error(
			"The graphics device did not recover. Reopen the game when the device is available.",
		);
	canvas.id = "game";
	canvas.setAttribute("aria-label", "Keystone Catch-Up mall chase");
	$("#game").replaceWith(canvas);
	const next = new T.WebGPURenderer({
		canvas,
		context,
		forceWebGL: true,
		antialias: true,
	});
	next.setPixelRatio(Math.min(devicePixelRatio, 2));
	next.setSize(innerWidth, innerHeight);
	next.toneMapping = T.ACESFilmicToneMapping;
	next.toneMappingExposure = 1;
	await next.init();
	renderer = next;
	rendererName = "WebGL 2 compatibility";
	$("#renderer-label").textContent = "THREE.JS R180 · WEBGL 2 COMPATIBILITY";
	lastFrame = performance.now();
	recovering = false;
	recoveryError = null;
	renderer.setAnimationLoop(loop);
}

async function boot() {
	try {
		await RAPIER.init();
		world = new RAPIER.World({ x: 0, y: -23, z: 0 });
		for (let f = 0; f < 3; f++)
			world.createCollider(
				RAPIER.ColliderDesc.cuboid(24, 0.2, 4)
					.setTranslation(0, f * FLOOR - 0.2, 0)
					.setFriction(0),
			);
		scene = new T.Scene();
		scene.background = new T.Color(0xf4eedc);
		scene.fog = new T.Fog(0xf4eedc, 82, 140);
		camera = new T.OrthographicCamera(-28, 28, 16, -16, 0.1, 180);
		let gpuDevice;
		if (
			navigator.gpu &&
			new URLSearchParams(location.search).get("renderer") !== "webgl"
		) {
			try {
				const adapter = await navigator.gpu.requestAdapter({
					powerPreference: "high-performance",
				});
				if (adapter)
					gpuDevice = await adapter.requestDevice({ requiredFeatures: [] });
			} catch {}
		}
		renderer = new T.WebGPURenderer({
			device: gpuDevice,
			canvas: $("#game"),
			antialias: false,
			colorBufferType: T.UnsignedByteType,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.toneMapping = T.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;
		await renderer.init();
		rendererName = renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 compatibility";
		initialRendererName = rendererName;
		$("#renderer-label").textContent =
			"THREE.JS R180 · " + rendererName.toUpperCase();
		scene.add(new T.HemisphereLight(0xfff5d5, 0x667e75, 1.7));
		const sun = new T.DirectionalLight(0xffffff, 1.7);
		sun.position.set(-12, 30, 25);
		scene.add(sun);
		mall = createMall(scene);
		effects = new Effects(scene);
		ready = true;
		titleScreen();
		show("#loading", false);
		window.addEventListener("resize", () => {
			renderer.setSize(innerWidth, innerHeight);
		});
		await setupHub();
		lastFrame = performance.now();
		const loop = (now) => {
			const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
			lastFrame = now;
			pollPads();
			if (!testExternal) {
				if (
					phase === "title" &&
					!menu &&
					now - lastActivity >= 10000 &&
					!activeHub()
				)
					resetGame(false, true);
				if (lastInput === "touch" && prefs.touchAssist && inGame() && host()) {
					const p = players[0];
					if (p && !p.transit) {
						const a = nearbyAction(p);
						if (a?.kind === "cuff") touchAct = true;
						else if (!touches.size) touchAct = false;
						if (
							hazards.some(
								(h) =>
									h.type === "plane" &&
									h.floor === p.floor &&
									Math.abs(h.x - p.x) < 2.5,
							)
						)
							touchDuck = 0.18;
						else touchDuck = Math.max(0, touchDuck - dt);
					}
				}
				acc += dt;
				let steps = 0;
				while (acc >= 1 / 60 && steps < 8) {
					simulate(1 / 60);
					acc -= 1 / 60;
					steps++;
				}
				networkTick();
			}
			audio.update();
			renderFrame(dt);
		};
		renderer.setAnimationLoop(loop);
		renderer.onDeviceLost = (info) => {
			if (closing || recovering) return;
			recovering = true;
			deviceLosses.push(info.message);
			renderer._isDeviceLost = true;
			renderer.setAnimationLoop(null);
			const rescue = (now) => {
				if (!recovering) return;
				loop(now);
				requestAnimationFrame(rescue);
			};
			requestAnimationFrame(rescue);
			recoverRenderer(loop).catch((err) => {
				recoveryError = String(err.stack || err);
				console.error(err);
				if (activeHub()) hub.fail("Renderer recovery failed: " + err.message);
			});
		};
		window.__game = {
			get ready() {
				return ready;
			},
			get state() {
				return {
					...serialState(),
					attract,
					paused,
					menu,
					renderer: rendererName,
					initialRenderer: initialRendererName,
					gpuLost: !!renderer._isDeviceLost,
					deviceLosses: [...deviceLosses],
					recoveryError,
					recovering,
					renderCalls: renderer.info.render.calls,
					config: { ...cfg },
					cheats: { ...cheats },
					seen: [...seenMechanics],
					audio: {
						notes: audio.notes,
						level: audio.level(),
						music: audio.musicVolume,
						sfxGain: audio.fx?.gain.value ?? null,
						state: audio.ctx?.state || "uninitialized",
					},
					animationTime: players[0]?.visual.mixer.time || 0,
					hub: {
						active: activeHub(),
						isHost: hub.isHost,
						server: hub.server,
						started: hubStarted,
						ended: hubEnded,
					},
					playerBodies: players.map((p) => ({
						x: p.body.translation().x,
						y: p.body.translation().y,
						vy: p.body.linvel().y,
					})),
				};
			},
			start: (coop = false) => resetGame(coop),
			external: (v) => (testExternal = v),
			advance: (seconds, mode = "idle", inputs = null) => {
				for (let i = 0; i < Math.ceil(seconds * 60); i++) {
					const inp =
						mode === "bot"
							? Object.fromEntries(players.map((p) => [p.id, botInput(p)]))
							: inputs ||
								Object.fromEntries(players.map((p) => [p.id, { ...EMPTY }]));
					simulate(1 / 60, mode === "live" ? null : inp);
				}
				updateHUD();
				return window.__game.state;
			},
			teleport: (id, f, x) => {
				const p = players.find((p) => p.id === id);
				if (p) setPlayerFloor(p, f, x);
			},
			spawnHazard,
			clearHazards: () => {
				for (const h of hazards) {
					h.model.removeFromParent();
					world.removeRigidBody(h.body);
				}
				hazards = [];
			},
			setThief: (f, x) => {
				Object.assign(thief, {
					floor: f,
					y: f * FLOOR,
					x,
					transit: null,
					route: routes.findIndex((r) => r.f === f),
				});
			},
			setTime: (t) => (time = t),
			setConfig: (v) => Object.assign(cfg, v),
			setCheats: (v) => Object.assign(cheats, v),
			pause: openPause,
			resume: closeMenu,
			title: titleScreen,
			attract: () => resetGame(false, true),
			idleFor: (s) => (lastActivity = performance.now() - s * 1000),
			botInput: () => (players[0] ? botInput(players[0]) : {}),
			interact: () => players[0] && interact(players[0], {}),
			credits,
			render: () => renderFrame(1 / 60, true),
			audioProbe: () => audio.offlineProbe(),
			flushNetwork: () => {
				netLast = 0;
				networkTick();
			},
		};
	} catch (err) {
		console.error(err);
		$("#load-detail").textContent = "Could not open the mall: " + err.message;
		$("#loading h1").textContent = "The shutters are stuck.";
		if (hub.active) hub.fail(err.message);
		window.__bootError = err.stack || err.message;
	}
}
boot();
