import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { AudioEngine } from "./audio.js";
import { createOnline } from "./online.js";
import report from "./report.json";
import {
	createBoss,
	createHelicopter,
	createJet,
	createPilot,
	createTruck,
	createWorld,
	palette,
} from "./visuals.js";

const $ = (id) => document.getElementById(id),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
	wrap = (x) => ((((x + 100) % 200) + 200) % 200) - 100,
	delta = (a, b) => wrap(a - b),
	dist = (a, b) => Math.hypot(delta(a.x, b.x), a.y - b.y);
let rng = 724832;
function random() {
	rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
	return rng / 4294967296;
}
const rand = (a, b) => a + random() * (b - a);
const defaults = {
	speed: 17,
	spawnRate: 1,
	damage: 1,
	armor: 1,
	power: 1,
	timeScale: 1,
};
let tune = { ...defaults },
	godMode = false;
let settings = {
	music: 0.1,
	sfx: 0.65,
	glyphs: "ps",
	autoFire: false,
	reducedShake: false,
};
try {
	settings = {
		...settings,
		...JSON.parse(localStorage.getItem("palooza-settings") || "{}"),
	};
} catch {}
let high = 0;
try {
	high = +localStorage.getItem("palooza-high") || 0;
} catch {}
const audio = new AudioEngine();
audio.setVolume(settings.music, settings.sfx);
const keys = new Set();
let lastInput = "keyboard",
	mouse = { x: 0, y: 0, down: false, active: false },
	touch = {
		active: false,
		id: null,
		x: 0,
		y: 0,
		baseX: 0,
		baseY: 0,
		aimId: null,
		aimX: 1,
		aimY: 0,
	},
	idle = 0,
	screen = "title",
	backTarget = "title",
	gameMode = "title",
	lastTick = 0,
	accum = 0,
	cameraX = 0,
	toastTimer = 0,
	radioTimer = 0,
	shake = 0,
	flash = 0,
	gamepadPrev = [],
	navClock = 0,
	flareLatch = false,
	pauseLatch = false,
	rescueNear = false,
	localCoop = false,
	testMode = false,
	testPilot = false,
	lastSnapshot = null,
	remoteInputs = {},
	attractRestart = false,
	upgradePower = 1,
	upgradeSpeed = 1;
let renderer, scene, camera, worldVisual, physics, queue;
let entities = [],
	particles = [],
	pilots = [],
	ships = [],
	trucks = [],
	boss = null,
	uid = 1;
let stage = 0,
	stageTime = 0,
	totalTime = 0,
	spawnClock = 0,
	score = 0,
	kills = 0,
	rescues = 0,
	shotsFired = 0,
	combo = 0,
	comboTime = 0,
	upgrades = 0,
	bossSeen = false,
	won = false,
	lossReason = "",
	attractClock = 0,
	finished = false;
const sectorNames = ["DUST UP", "CROSSWIND", "RED ROCK RUN", "THE BIG CHOP"];
const stageLengths = [43, 49, 55];
const online = createOnline({
	onStatus(t) {
		$("netStatus").textContent = t;
		$("roomDisplay").textContent = online.room || "";
		$("netLaunch").style.display = online.role === "host" ? "block" : "none";
	},
	onStart() {
		startGame(false, true);
	},
	onInput(input, seat) {
		remoteInputs[seat] = input;
	},
	onState(state) {
		lastSnapshot = state;
		applySnapshot(state);
	},
	onHub() {
		showScreen("none");
		$("loading").style.display = "none";
		gameMode = "waiting";
	},
	onTimeUp() {
		if (online.isHost)
			endGame(
				trucks.some((t) => t.hp > 0),
				"The patrol clock ran out. The convoy made it this far.",
			);
	},
	onEnd() {
		gameMode = "ended";
		audio.setVolume(0, 0);
		keys.clear();
		mouse.down = false;
	},
	onDisconnect(reason, seat = 1) {
		remoteInputs = {};
		if (ships[seat]) ships[seat].inactive = true;
		if (!online.isHost) {
			gameMode = "disconnected";
			backTarget = "title";
			showScreen("online");
			$("netStatus").textContent =
				"The host disconnected. Join another patrol or return to title.";
		} else radio("Wingmate signed off. You have the patrol, Lucky.");
	},
});
function saveSettings() {
	try {
		localStorage.setItem("palooza-settings", JSON.stringify(settings));
	} catch {}
	audio.setVolume(settings.music, settings.sfx);
}
function inputUsed(type) {
	idle = 0;
	document.body.classList.toggle("touchMode", type === "touch");
	if (lastInput !== type) {
		lastInput = type;
		updatePrompts();
	}
}
function toast(title, sub = "", time = 3) {
	$("toast").querySelector("strong").textContent = title;
	$("toast").querySelector("span").textContent = sub;
	$("toast").classList.add("show");
	toastTimer = time;
}
function radio(text, time = 5) {
	$("radio").querySelector("p").textContent = text;
	$("radio").style.display = "block";
	radioTimer = time;
	if (gameMode !== "attract") audio.voice(text);
}
function showScreen(name) {
	screen = name;
	for (const s of document.querySelectorAll(".screen"))
		s.classList.toggle("open", s.id === name + "Screen");
	if (name !== "none") {
		mouse.down = false;
		keys.clear();
		const b = $(name + "Screen")?.querySelector("button,input,select");
		b?.focus({ preventScroll: true });
	}
	$("pauseButton").style.display =
		gameMode === "play" && name === "none" && !online.hub ? "block" : "none";
}
function updatePrompts() {
	const pad = lastInput === "gamepad",
		xbox = settings.glyphs === "xbox";
	$("controls").innerHTML =
		lastInput === "touch"
			? ""
			: pad
				? `${xbox ? "RT" : "R2"} FIRE &nbsp; ${xbox ? "B" : "○"} FLARE<br>${xbox ? "LT" : "L2"} BOOST &nbsp; ${xbox ? "A" : "×"} RESCUE`
				: "WASD FLY &nbsp; CLICK / SPACE FIRE<br>SHIFT BOOST &nbsp; Q FLARE &nbsp; E RESCUE";
	$("helpControls").textContent = pad
		? `Left stick flies. Right stick aims. ${xbox ? "RT / X" : "R2 / □"} fires; ${xbox ? "LT" : "L2"} boosts. Options pauses.`
		: "WASD or arrows to fly. Aim with your mouse and hold click, Space or J to fire. Shift boosts.";
	$("helpRescue").textContent =
		`Hover low beside a waving pilot to rescue automatically, or press ${pad ? (xbox ? "A" : "×") : "E"}. Each rescue repairs your hull and earns a flare.`;
	$("helpFlare").textContent =
		`${pad ? (xbox ? "B" : "○") : "Q"} releases a flare: enemy shots vanish and nearby hostiles take a hit. Beat three sectors, pick field upgrades, then stop the carrier.`;
	$("touchHint").style.display =
		lastInput === "touch" && screen === "none" && gameMode === "play"
			? "block"
			: "none";
}
function disposeModel(mesh) {
	const geometries = new Set();
	mesh.traverse((m) => {
		if (m.geometry) geometries.add(m.geometry);
	});
	for (const g of geometries) g.dispose();
	mesh.userData.mixer?.stopAllAction();
}
function removeEntity(e) {
	if (e.dead) return;
	e.dead = true;
	scene.remove(e.mesh);
	disposeModel(e.mesh);
	if (e.body) {
		physics.removeRigidBody(e.body);
		e.body = null;
	}
	if (e.temporary) e.mesh.material?.dispose();
}
function clearWorld() {
	for (const e of entities) removeEntity(e);
	for (const p of particles) {
		scene.remove(p.mesh);
		p.mesh.geometry?.dispose();
	}
	for (const p of pilots) {
		scene.remove(p.mesh);
		disposeModel(p.mesh);
	}
	entities = [];
	particles = [];
	pilots = [];
	ships = [];
	trucks = [];
	boss = null;
	physics.free();
	queue.free();
	physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
	queue = new RAPIER.EventQueue(true);
}
function bodyFor(e, hx, hy, offset = 0) {
	e.body = physics.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			e.x,
			e.y + offset,
			0,
		),
	);
	e.collider = physics.createCollider(
		RAPIER.ColliderDesc.cuboid(hx, hy, 0.8)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
		e.body,
	);
	e.offset = offset;
	e.collider.userData = e;
	entities.push(e);
	return e;
}
const colliders = new Map();
function addEntity(e, hx, hy, offset = 0) {
	e.mesh.position.set(e.x, e.y, e.type === "truck" ? 0 : 2);
	scene.add(e.mesh);
	bodyFor(e, hx, hy, offset);
	colliders.set(e.collider.handle, e);
	return e;
}
function makeShip(index) {
	const e = {
		id: uid++,
		type: "ship",
		index,
		x: index ? -7 : 0,
		y: 14,
		hp: 100,
		maxHp: 100,
		lives: 2,
		flares: 3,
		inv: 2,
		cool: 0,
		boost: 1,
		face: 1,
		aimX: 1,
		aimY: 0,
		vx: 0,
		vy: 0,
		rescueClock: 0,
		inactive: false,
		mesh: createHelicopter(index ? 0xf5ca57 : palette.teal),
	};
	e.mesh.position.set(e.x, e.y, 2 + index * 0.2);
	ships.push(e);
	addEntity(e, 1.55, 0.65);
	return e;
}
function startGame(attract = false, network = false) {
	if (!physics) return;
	clearWorld();
	colliders.clear();
	rng = 724832;
	uid = 1;
	stage = 0;
	stageTime = 0;
	totalTime = 0;
	spawnClock = 1;
	score = 0;
	kills = 0;
	rescues = 0;
	shotsFired = 0;
	combo = 0;
	comboTime = 0;
	upgrades = 0;
	bossSeen = false;
	won = false;
	finished = false;
	lossReason = "";
	attractClock = 0;
	attractRestart = false;
	upgradePower = 1;
	upgradeSpeed = 1;
	remoteInputs = {};
	localCoop = false;
	gameMode = attract ? "attract" : "play";
	showScreen("none");
	const count = network ? Math.max(1, online.players.length || 2) : 1;
	for (let i = 0; i < count; i++) makeShip(i);
	for (let i = 0; i < 6; i++) {
		const e = {
			id: uid++,
			type: "truck",
			x: -23 + i * 8,
			y: 0.12,
			hp: 100,
			mesh: createTruck(),
		};
		trucks.push(e);
		addEntity(e, 2, 1, 1);
	}
	spawnPilot(22);
	spawnPilot(-62);
	cameraX = 0;
	$("hud").classList.add("visible");
	$("attract").textContent = "LIVE DEMO · PRESS ANY BUTTON TO FLY";
	$("attract").style.display = attract ? "block" : "none";
	$("bossHud").style.display = "none";
	audio.start();
	if (!attract) {
		audio.sfx("start");
		toast("SCRAMBLE, LUCKY!", "SECTOR 01 / DUST UP");
		radio("Six trucks. One long road. Keep the sky clear, Lucky.");
	}
	updatePrompts();
	updateHUD();
}
function title() {
	if (online.hub) return;
	online.leave();
	gameMode = "title";
	finished = false;
	showScreen("title");
	$("hud").classList.remove("visible");
	$("attract").style.display = "none";
	$("bossHud").style.display = "none";
	$("radio").style.display = "none";
	$("rescueAction").style.display = "none";
	$("toast").classList.remove("show");
	idle = 0;
	if (physics) {
		clearWorld();
		colliders.clear();
		const ship = makeShip(0);
		ship.x = 18;
		ship.y = 17;
		ship.mesh.scale.setScalar(1.8);
		for (let i = 0; i < 5; i++) {
			const t = {
				id: uid++,
				type: "truck",
				x: -5 + i * 11,
				y: 0.12,
				hp: 100,
				mesh: createTruck(),
			};
			trucks.push(t);
			addEntity(t, 2, 1, 1);
		}
		cameraX = 0;
		spawnEnemy("heli", -26, 23);
		spawnEnemy("jet", 36, 28);
	}
}
function spawnPilot(x) {
	const mesh = createPilot();
	mesh.position.set(x, 0.2, 3);
	scene.add(mesh);
	pilots.push({ id: uid++, x, y: 0.2, mesh, clock: 0 });
}
function spawnEnemy(kind = "heli", x = null, y = null) {
	const p = ships[0] || { x: 0 };
	if (x === null) x = wrap(p.x + (random() > 0.5 ? 1 : -1) * rand(34, 58));
	if (y === null) y = rand(18, 31);
	const e = {
		id: uid++,
		type: "enemy",
		kind,
		x,
		y,
		baseY: y,
		hp: kind === "jet" ? 48 : kind === "ace" ? 110 : 65,
		maxHp: kind === "ace" ? 110 : 65,
		face: random() > 0.5 ? 1 : -1,
		vx: 0,
		vy: 0,
		cool: rand(1, 3),
		age: 0,
		inv: 0,
		mesh:
			kind === "jet"
				? createJet()
				: createHelicopter(kind === "ace" ? 0x795274 : palette.coral, true),
	};
	if (kind !== "jet") e.mesh.scale.setScalar(0.85);
	addEntity(e, kind === "jet" ? 2 : 1.6, 0.75);
	return e;
}
function spawnBoss() {
	if (boss) return;
	for (const e of entities.filter((e) => e.type === "enemy")) removeEntity(e);
	stage = 3;
	stageTime = 0;
	bossSeen = true;
	boss = {
		id: uid++,
		type: "boss",
		x: wrap((ships[0]?.x || 0) + 27),
		y: 24,
		hp: 1500,
		maxHp: 1500,
		age: 0,
		cool: 1,
		face: -1,
		mesh: createBoss(),
	};
	addEntity(boss, 7, 2.6);
	$("bossHud").style.display = "block";
	toast("THE BIG CHOP", "Take down the command carrier.");
	radio("That is a very large helicopter. You know what to do.");
	audio.voice("big chop");
}
function bullet(
	source,
	vx,
	vy,
	hostile = false,
	damage = 20,
	xoff = null,
	yoff = 0,
) {
	const x = wrap(source.x + (xoff ?? Math.sign(vx) * 2.5)),
		y = source.y + yoff;
	const mesh = new THREE.Mesh(
		new THREE.BoxGeometry(hostile ? 0.6 : 1.75, hostile ? 0.35 : 0.16, 0.2),
		new THREE.MeshBasicMaterial({ color: hostile ? 0xf7714a : 0xfff4b0 }),
	);
	const e = {
		id: uid++,
		type: "bullet",
		hostile,
		owner: source.index ?? -1,
		x,
		y,
		vx,
		vy,
		hp: 1,
		damage,
		age: 0,
		mesh,
		temporary: true,
	};
	mesh.rotation.z = Math.atan2(vy, vx);
	addEntity(e, hostile ? 0.3 : 0.8, hostile ? 0.2 : 0.15);
	if (!hostile) {
		shotsFired++;
		if (shotsFired % 2 === 0) audio.sfx("shoot");
	}
	return e;
}
function burst(x, y, color = palette.coral, count = 20, size = 1) {
	for (let i = 0; i < count; i++) {
		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 0.5),
			new THREE.MeshBasicMaterial({
				color: i % 4 === 0 ? palette.cream : i % 3 === 0 ? palette.ink : color,
				transparent: true,
			}),
		);
		const a = rand(0, Math.PI * 2),
			s = rand(3, 13) * size;
		mesh.position.set(x, y, 3);
		const scale = rand(0.14, 0.65) * size;
		mesh.scale.setScalar(scale);
		scene.add(mesh);
		particles.push({
			mesh,
			vx: Math.cos(a) * s,
			vy: Math.sin(a) * s,
			life: rand(0.25, 0.85),
			max: 0.85,
			spin: rand(-8, 8),
		});
	}
	shake = Math.max(shake, 0.2 * size);
}
function damage(e, amount, owner = 0) {
	if (e.dead || e.hp <= 0) return;
	if (
		(godMode || gameMode === "attract") &&
		(e.type === "ship" || e.type === "truck")
	)
		return;
	if (e.type === "ship" && e.inv > 0) return;
	e.hp -= amount;
	if (e.type === "ship") {
		e.inv = 0.6;
		flash = 0.5;
		shake = 0.45;
		audio.sfx("hit");
	}
	if (e.hp > 0) {
		if (e.type === "enemy" || e.type === "boss")
			burst(e.x, e.y, palette.yellow, 4, 0.35);
		return;
	}
	if (e.type === "ship") {
		burst(e.x, e.y, palette.teal, 35, 1.5);
		audio.sfx("boom");
		if (e.lives > 0) {
			e.lives--;
			e.hp = e.maxHp;
			e.x = trucks.find((t) => t.hp > 0)?.x || 0;
			e.y = 17;
			e.inv = 3;
			e.flares = Math.max(2, e.flares);
			toast(
				"BACK IN THE AIR",
				`${e.lives} REPLACEMENT${e.lives === 1 ? "" : "S"} LEFT`,
			);
		} else {
			e.hp = 0;
			e.inactive = true;
			e.mesh.visible = false;
			if (ships.every((s) => s.inactive))
				endGame(false, "Out of choppers. The convoy will remember you.");
		}
	} else if (e.type === "truck") {
		e.hp = 0;
		burst(e.x, 2, palette.coral, 35, 1.7);
		e.mesh.rotation.z = -0.1;
		e.mesh.children.forEach((m) => {
			if (m.material?.color) {
				m.material = m.material.clone();
				m.material.color.multiplyScalar(0.5);
			}
		});
		audio.sfx("boom");
		radio("Truck down! Keep those raiders off the road.", 3);
		if (trucks.every((t) => t.hp <= 0))
			endGame(false, "The road went quiet. Every truck was lost.");
	} else {
		combo = comboTime > 0 ? combo + 1 : 1;
		comboTime = 2.5;
		kills++;
		score +=
			(e.type === "boss"
				? 8000
				: e.kind === "ace"
					? 350
					: e.kind === "jet"
						? 200
						: 150) * Math.min(combo, 5);
		burst(
			e.x,
			e.y,
			e.type === "boss" ? palette.yellow : palette.coral,
			e.type === "boss" ? 80 : 24,
			e.type === "boss" ? 3 : 1,
		);
		audio.sfx("boom");
		removeEntity(e);
		if (e.type === "boss") {
			endGame(
				true,
				"You brought the convoy home. Dusty says the next tank of fuel is on him.",
			);
		} else if (kills % 5 === 0 && pilots.length < 4) spawnPilot(e.x);
	}
}
function flare(ship) {
	if (ship.flares <= 0 || ship.inactive) return;
	ship.flares--;
	audio.sfx("flare");
	burst(ship.x, ship.y, palette.cream, 45, 2.2);
	for (const e of [...entities])
		if (e.type === "bullet" && e.hostile) removeEntity(e);
		else if (
			(e.type === "enemy" || e.type === "boss") &&
			Math.abs(delta(e.x, ship.x)) < 43
		)
			damage(e, e.type === "boss" ? 150 : 120, ship.index);
	toast("SKY CLEAR!", "FLARE DEPLOYED", 1.4);
}
function rescuePilot(p, ship) {
	scene.remove(p.mesh);
	disposeModel(p.mesh);
	pilots = pilots.filter((x) => x !== p);
	rescues++;
	score += 600;
	ship.hp = Math.min(ship.maxHp, ship.hp + 30);
	ship.flares = Math.min(5, ship.flares + 1);
	audio.sfx("rescue");
	burst(ship.x, ship.y, palette.teal, 15, 0.7);
	toast("PILOT ABOARD", "+600 / HULL REPAIRED / +1 FLARE", 2);
	if (rescues === 1) radio("Good catch, Lucky! That pilot owes you lunch.", 3);
}
function pilotAI(ship) {
	let target = entities
		.filter((e) => (e.type === "enemy" || e.type === "boss") && !e.dead)
		.sort((a, b) => dist(a, ship) - dist(b, ship))[0];
	const p = pilots.sort(
		(a, b) => Math.abs(delta(a.x, ship.x)) - Math.abs(delta(b.x, ship.x)),
	)[0];
	if (p && (totalTime % 28 < 8 || !target))
		target = { ...p, y: 4.1, rescue: true };
	if (!target) target = { x: trucks[3]?.x || 0, y: 17 };
	const dx = delta(target.x, ship.x),
		dy = target.y - ship.y;
	let x = clamp(dx * 0.3, -1, 1),
		y = clamp(dy * 0.5, -1, 1);
	if (!target.rescue && Math.abs(dx) < 19) x = 0;
	const aimDX = target.rescue ? ship.face : dx;
	return {
		x,
		y,
		fire: !target.rescue,
		flare:
			entities.filter(
				(e) => e.type === "bullet" && e.hostile && dist(e, ship) < 10,
			).length > 3 && ship.flares > 0,
		rescue: true,
		boost: Math.abs(dx) > 35,
		aimX: Math.abs(aimDX) < 0.1 ? ship.face : Math.sign(aimDX),
		aimY: target.rescue
			? 0
			: clamp(dy / Math.max(5, Math.abs(dx)), -0.75, 0.75),
	};
}
function readInput(index = 0, seat = index) {
	const pads = navigator.getGamepads?.() || [];
	const pad = pads[index];
	const dead = (v) => (Math.abs(v || 0) > 0.16 ? v : 0);
	let x = 0,
		y = 0,
		fire = false,
		flare = false,
		rescue = false,
		boost = false,
		aimX = 0,
		aimY = 0;
	if (index === 0) {
		x =
			(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
			(keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
		y =
			(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
			(keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
		fire =
			keys.has("Space") || keys.has("KeyJ") || mouse.down || settings.autoFire;
		flare = keys.has("KeyQ");
		rescue = keys.has("KeyE");
		boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
		if (mouse.active && lastInput === "keyboard") {
			const ship = ships[seat];
			if (ship) {
				const v = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(camera);
				const dx = v.x - ship.x;
				aimX = Math.sign(dx) || ship.face;
				aimY = clamp((v.y - ship.y) / Math.max(3, Math.abs(dx)), -0.8, 0.8);
			}
		}
		if (lastInput === "touch" && (touch.active || touch.aimId !== null)) {
			x = touch.active ? clamp((touch.x - touch.baseX) / 60, -1, 1) : 0;
			y = touch.active ? clamp((touch.baseY - touch.y) / 60, -1, 1) : 0;
			fire = true;
			rescue = true;
			aimX = touch.aimId !== null ? touch.aimX : ships[seat]?.face || 1;
			aimY = touch.aimId !== null ? touch.aimY : 0;
		}
	}
	if (pad) {
		const px = dead(pad.axes[0]),
			py = -dead(pad.axes[1]);
		if (px || py) {
			x = px;
			y = py;
			inputUsed("gamepad");
		}
		const ax = dead(pad.axes[2]),
			ay = -dead(pad.axes[3]);
		if (ax || ay) {
			aimX = Math.sign(ax) || ships[index]?.face || 1;
			aimY = clamp(ay / Math.max(0.35, Math.abs(ax)), -0.8, 0.8);
			inputUsed("gamepad");
		}
		fire = fire || !!pad.buttons[7]?.pressed || !!pad.buttons[2]?.pressed;
		flare = flare || !!pad.buttons[1]?.pressed;
		rescue = rescue || !!pad.buttons[0]?.pressed;
		boost = boost || !!pad.buttons[6]?.pressed;
		if (pad.buttons.some((b) => b.pressed)) inputUsed("gamepad");
	}
	return { x, y, fire, flare, rescue, boost, aimX, aimY };
}
function updateShip(ship, dt, input) {
	if (ship.inactive) return;
	ship.inv = Math.max(0, ship.inv - dt);
	ship.cool -= dt;
	const boosting = input.boost && ship.boost > 0.05;
	ship.boost = clamp(ship.boost + dt * (boosting ? -0.35 : 0.2), 0, 1);
	const speed = tune.speed * upgradeSpeed * (boosting ? 1.65 : 1);
	const len = Math.max(1, Math.hypot(input.x, input.y));
	ship.vx = THREE.MathUtils.damp(ship.vx, (input.x / len) * speed, 8, dt);
	ship.vy = THREE.MathUtils.damp(ship.vy, (input.y / len) * speed, 8, dt);
	ship.x = wrap(ship.x + ship.vx * dt);
	ship.y = clamp(ship.y + ship.vy * dt, 3.2, 33);
	if (Math.abs(input.x) > 0.1) ship.face = Math.sign(input.x);
	if (input.aimX) {
		ship.face = Math.sign(input.aimX);
		ship.aimX = ship.face;
		ship.aimY = input.aimY || 0;
	} else {
		ship.aimX = ship.face;
		ship.aimY = 0;
	}
	ship.mesh.rotation.y = 0;
	ship.mesh.scale.x = Math.abs(ship.mesh.scale.x) * ship.face;
	ship.mesh.rotation.z = -ship.vx * 0.008;
	ship.mesh.visible = ship.inv <= 0 || Math.floor(ship.inv * 12) % 2 === 0;
	if (input.fire && ship.cool <= 0) {
		const len = Math.hypot(ship.aimX, ship.aimY);
		bullet(
			ship,
			(ship.aimX / len) * 72,
			(ship.aimY / len) * 72,
			false,
			20 * tune.power * upgradePower,
			ship.face * 2.8,
			-0.45,
		);
		ship.cool = 0.145;
	}
	if (input.flare && !ship.flareWas) flare(ship);
	ship.flareWas = input.flare;
	for (const p of pilots) {
		if (Math.abs(delta(p.x, ship.x)) < 3.5 && ship.y < 6.3) {
			rescueNear = true;
			p.clock += dt;
			if (input.rescue || p.clock > 0.85) rescuePilot(p, ship);
		}
	}
}
function stageComplete() {
	if (stage >= 3) return;
	if (gameMode === "attract" || testPilot || online.hub) {
		applyUpgrade("gun");
		return;
	}
	showScreen("upgrade");
	audio.sfx("pickup");
	$("upgradeTitle").textContent =
		stage === 0 ? "Dust settled." : "Still in one piece.";
	radio("Next sector ahead. The crew has a present for you.", 3);
}
function applyUpgrade(type) {
	if (type === "gun") upgradePower *= 1.3;
	else {
		upgradeSpeed *= 1.15;
		for (const s of ships) s.maxHp += 25;
	}
	upgrades++;
	for (const s of ships) {
		s.hp = s.maxHp;
		s.flares = Math.min(5, s.flares + 1);
		s.inv = 2;
	}
	for (const t of trucks) if (t.hp > 0) t.hp = Math.min(100, t.hp + 30);
	stage++;
	stageTime = 0;
	spawnClock = 2;
	for (const e of entities)
		if (e.type === "bullet" && e.hostile) removeEntity(e);
	showScreen("none");
	if (stage === 3) spawnBoss();
	else {
		toast("SECTOR 0" + (stage + 1), sectorNames[stage]);
		spawnPilot(wrap(ships[0].x + 32));
		radio(
			stage === 1
				? "Jets inbound. Watch the radar; they are quick."
				: "Red Rock pass. The raider aces are waiting.",
			4,
		);
	}
	syncDev();
}
function simulate(dt) {
	if (!online.isHost) return;
	if (
		finished ||
		!["play", "attract"].includes(gameMode) ||
		screen !== "none" ||
		!online.canPlay
	)
		return;
	dt *= tune.timeScale;
	totalTime += dt;
	stageTime += dt;
	attractClock += dt;
	comboTime -= dt;
	rescueNear = false;
	for (const p of pilots) p.clock = Math.max(0, p.clock - dt * 0.15);
	for (let i = 0; i < ships.length; i++) {
		const remote = online.connected && (online.server || i !== online.seat);
		let input = remote ? remoteInputs[i] || {} : readInput(i);
		if (gameMode === "attract" || testPilot) input = pilotAI(ships[i]);
		updateShip(ships[i], dt, { x: 0, y: 0, ...input });
	}
	for (let i = 0; i < trucks.length; i++) {
		const t = trucks[i];
		if (t.hp > 0) {
			t.x = wrap(t.x + 1.3 * dt);
			t.mesh.position.y = 0.12 + Math.sin(totalTime * 12 + i) * 0.025;
			if (random() < dt * 4) trail(t.x - 2, 0.5);
		}
	}
	spawnClock -= dt;
	if (stage < 3 && spawnClock <= 0) {
		spawnClock = (stage === 0 ? 3.7 : stage === 1 ? 3.1 : 2.8) / tune.spawnRate;
		if (entities.filter((e) => e.type === "enemy" && !e.dead).length < 13) {
			spawnEnemy(
				stage === 2 && random() > 0.5
					? "ace"
					: stage > 0 && random() > 0.45
						? "jet"
						: "heli",
			);
			if (stage > 0 && random() > 0.6) spawnEnemy("heli");
		}
	}
	for (const e of [...entities]) {
		if (e.dead) continue;
		if (e.type === "enemy") {
			e.age += dt;
			e.cool -= dt;
			const target =
				trucks
					.filter((t) => t.hp > 0)
					.sort(
						(a, b) => Math.abs(delta(a.x, e.x)) - Math.abs(delta(b.x, e.x)),
					)[0] || ships[0];
			if (e.kind === "jet") {
				e.x = wrap(e.x + e.face * (stage === 2 ? 19 : 16) * dt);
				e.y = e.baseY + Math.sin(e.age * 1.5) * 1.4;
				if (Math.abs(delta(target.x, e.x)) < 8 && e.cool <= 0) {
					bullet(e, e.face * 2, -22, true, 24, 0, -1);
					e.cool = 1.5;
				}
				if (e.age > 17) removeEntity(e);
			} else {
				const dx = delta(target.x, e.x);
				e.face = Math.sign(dx) || 1;
				e.x = wrap(e.x + clamp(dx, -7, 7) * dt * 0.7);
				e.y = clamp(e.baseY + Math.sin(e.age * 1.4 + e.id) * 2.6, 10, 31);
				if (e.cool <= 0) {
					const dx = delta(target.x, e.x),
						dy = 2 - e.y,
						len = Math.hypot(dx, dy);
					bullet(
						e,
						(dx / len) * 19,
						(dy / len) * 19,
						true,
						e.kind === "ace" ? 22 : 16,
						0,
						-0.8,
					);
					e.cool = e.kind === "ace" ? 1.7 : 2.6;
				}
			}
			e.mesh.rotation.y = 0;
			e.mesh.scale.x = Math.abs(e.mesh.scale.x) * e.face;
			e.mesh.rotation.z =
				e.kind === "jet"
					? Math.sin(e.age) * 0.04
					: Math.sin(e.age * 1.5) * 0.06;
		} else if (e.type === "boss") {
			e.age += dt;
			e.cool -= dt;
			const p = ships.find((s) => !s.inactive) || ships[0];
			const targetX = wrap(p.x + 24);
			e.x = wrap(e.x + clamp(delta(targetX, e.x), -6, 6) * dt);
			e.y = 23 + Math.sin(e.age * 0.6) * 4;
			if (e.cool <= 0) {
				e.cool = e.hp < e.maxHp * 0.5 ? 0.85 : 1.5;
				for (let j = -1; j <= 1; j++) {
					const dx = delta(p.x, e.x),
						dy = p.y - e.y + j * 5,
						len = Math.hypot(dx, dy);
					bullet(e, (dx / len) * 22, (dy / len) * 22, true, 15, -6, -1);
				}
				const t = trucks.filter((t) => t.hp > 0)[
					Math.floor(random() * trucks.filter((t) => t.hp > 0).length)
				];
				if (t) bullet(e, delta(t.x, e.x) * 0.5, -17, true, 20, 0, -3);
			}
			if (
				e.age > 9 &&
				e.age % 14 < dt &&
				entities.filter((e) => e.type === "enemy" && !e.dead).length < 4
			)
				spawnEnemy("jet", wrap(e.x + 22), 29);
		} else if (e.type === "bullet") {
			e.age += dt;
			e.x = wrap(e.x + e.vx * dt);
			e.y += e.vy * dt;
			if (e.age > (e.hostile ? 6 : 1.45) || e.y < 0.3 || e.y > 38) {
				if (e.hostile && e.y < 0.3) burst(e.x, 0.4, palette.sand, 4, 0.4);
				removeEntity(e);
			}
		}
		if (!e.dead) {
			e.mesh.position.x = e.x;
			if (e.type !== "truck") e.mesh.position.y = e.y;
			e.mesh.position.z =
				e.type === "bullet" ? 2.5 : e.type === "truck" ? 0 : 2;
			e.body.setNextKinematicTranslation({
				x: e.x,
				y: e.y + (e.offset || 0),
				z: 0,
			});
			e.mesh.userData.mixer?.update(dt);
		}
	}
	physics.timestep = dt;
	physics.step(queue);
	queue.drainCollisionEvents((h1, h2, started) => {
		if (!started) return;
		const a = colliders.get(h1),
			b = colliders.get(h2);
		if (!a || !b || a.dead || b.dead) return;
		const shot = a.type === "bullet" ? a : b.type === "bullet" ? b : null,
			target = shot === a ? b : a;
		if (shot) {
			const allowed = shot.hostile
				? target.type === "ship" || target.type === "truck"
				: target.type === "enemy" || target.type === "boss";
			if (allowed) {
				damage(
					target,
					(shot.damage * (shot.hostile ? tune.damage : 1)) /
						(target.type === "truck" ? tune.armor : 1),
					shot.owner,
				);
				removeEntity(shot);
			}
		} else if (a.type === "ship" && (b.type === "enemy" || b.type === "boss"))
			damage(a, 22 * tune.damage);
		else if (b.type === "ship" && (a.type === "enemy" || a.type === "boss"))
			damage(b, 22 * tune.damage);
	});
	entities = entities.filter((e) => !e.dead);
	for (const [h, e] of colliders) if (e.dead) colliders.delete(h);
	for (const p of pilots) p.mesh.userData.mixer?.update(dt);
	updateParticles(dt);
	if (stage < 3 && stageTime >= stageLengths[stage]) stageComplete();
	if (gameMode === "attract" && (attractClock > 210 || attractRestart))
		startGame(true);
	$("rescueAction").style.display =
		lastInput === "touch" && rescueNear ? "block" : "none";
}
function trail(x, y) {
	if (particles.length > 350) return;
	const mesh = new THREE.Mesh(
		new THREE.BoxGeometry(0.4, 0.3, 0.1),
		new THREE.MeshBasicMaterial({
			color: palette.cream,
			transparent: true,
			opacity: 0.4,
		}),
	);
	mesh.position.set(x, y, 1);
	scene.add(mesh);
	particles.push({ mesh, vx: -1, vy: 0.5, life: 0.8, max: 0.8, spin: 0 });
}
function updateParticles(dt) {
	for (const p of particles) {
		p.life -= dt;
		p.mesh.position.x += p.vx * dt;
		p.mesh.position.y += p.vy * dt;
		p.vy -= dt * 8;
		p.mesh.rotation.z += p.spin * dt;
		p.mesh.material.opacity = Math.max(0, p.life / p.max);
		if (p.life <= 0) {
			scene.remove(p.mesh);
			p.mesh.geometry.dispose();
			p.mesh.material.dispose();
		}
	}
	particles = particles.filter((p) => p.life > 0);
}
function endGame(victory, reason = "") {
	if (finished) return;
	if (gameMode === "attract") {
		attractRestart = true;
		return;
	}
	finished = true;
	won = victory;
	lossReason = reason;
	gameMode = "debrief";
	score +=
		victory && online.isHost
			? trucks.filter((t) => t.hp > 0).length * 1000 + rescues * 200
			: 0;
	if (score > high) {
		high = score;
		try {
			localStorage.setItem("palooza-high", high);
		} catch {}
	}
	$("debriefEyebrow").textContent = victory
		? "PATROL COMPLETE / ROAD CLEAR"
		: "PATROL ENDED / RETRY READY";
	$("debriefTitle").textContent = victory
		? "Convoy delivered."
		: "A rough landing.";
	$("debriefMessage").textContent = reason;
	$("debriefStats").innerHTML =
		`<div class="stat"><b>${String(score).padStart(6, "0")}</b><span>FINAL SCORE</span></div><div class="stat"><b>${trucks.filter((t) => t.hp > 0).length} / 6</b><span>TRUCKS DELIVERED</span></div><div class="stat"><b>${kills}</b><span>HOSTILES DOWN</span></div><div class="stat"><b>${rescues}</b><span>PILOTS RECOVERED</span></div>`;
	if (!online.hub) showScreen("debrief");
	audio.sfx(victory ? "victory" : "loss");
	if (victory)
		radio("Road clear! Six wheels down, rotors up. Nice work, Lucky.", 6);
	online.finish(score, victory, {
		Kills: kills,
		Rescues: rescues,
		Convoy: trucks.filter((t) => t.hp > 0).length,
	});
}
function getSnapshot() {
	return {
		v: 1,
		mode: gameMode,
		screen,
		stage,
		stageTime,
		totalTime,
		score,
		kills,
		rescues,
		upgrades,
		won,
		finished,
		bossSeen,
		ships: ships.map((s) => ({
			id: s.id,
			x: s.x,
			y: s.y,
			hp: s.hp,
			maxHp: s.maxHp,
			lives: s.lives,
			flares: s.flares,
			face: s.face,
			inv: s.inv,
			inactive: s.inactive,
		})),
		trucks: trucks.map((t) => ({ id: t.id, x: t.x, y: t.y, hp: t.hp })),
		enemies: entities
			.filter((e) => e.type === "enemy" || e.type === "boss")
			.map((e) => ({
				id: e.id,
				x: e.x,
				y: e.y,
				hp: e.hp,
				maxHp: e.maxHp,
				type: e.type,
				kind: e.kind,
				face: e.face,
			})),
		bullets: entities
			.filter((e) => e.type === "bullet")
			.slice(-70)
			.map((e) => ({
				id: e.id,
				x: e.x,
				y: e.y,
				vx: e.vx,
				vy: e.vy,
				hostile: e.hostile,
			})),
		pilots: pilots.map((p) => ({ id: p.id, x: p.x, y: p.y })),
	};
}
function applySnapshot(s) {
	if (online.isHost || !s?.v) return;
	const was = gameMode;
	const previousKills = kills,
		previousRescues = rescues,
		previousHp = ships[online.seat]?.hp;
	gameMode = s.mode;
	stage = s.stage;
	stageTime = s.stageTime;
	totalTime = s.totalTime;
	score = s.score;
	kills = s.kills;
	rescues = s.rescues;
	won = s.won;
	finished = s.finished;
	bossSeen = s.bossSeen;
	if (s.kills > previousKills) audio.sfx("boom");
	if (s.rescues > previousRescues) audio.sfx("rescue");
	if (previousHp > s.ships[online.seat]?.hp) audio.sfx("hit");
	$("hud").classList.add("visible");
	if (s.finished && was !== "debrief") {
		finished = false;
		endGame(
			s.won,
			s.won
				? "Convoy delivered. Good flying, wingmate."
				: "The patrol ended. Time for another sortie.",
		);
	}
	if (!s.finished && ["title", "online"].includes(screen)) showScreen("none");
	if (!s.finished) {
		$("attract").textContent =
			s.screen === "upgrade"
				? "HOST IS CHOOSING A FIELD UPGRADE"
				: "WINGMATE PAUSED · WAITING FOR HOST";
		$("attract").style.display = s.screen !== "none" ? "block" : "none";
	}
	const all = [
		...s.ships.map((e, i) => ({ ...e, type: "ship", index: i })),
		...s.trucks.map((e) => ({ ...e, type: "truck" })),
		...s.enemies,
		...s.bullets.map((e) => ({ ...e, type: "bullet" })),
	];
	const wanted = new Set(all.map((e) => e.id));
	for (const e of entities) if (!wanted.has(e.id)) removeEntity(e);
	entities = entities.filter((e) => !e.dead);
	for (const data of all) {
		let e = entities.find((e) => e.id === data.id);
		if (!e) {
			const mesh =
				data.type === "ship"
					? createHelicopter(data.index ? palette.yellow : palette.teal)
					: data.type === "truck"
						? createTruck()
						: data.type === "boss"
							? createBoss()
							: data.type === "bullet"
								? new THREE.Mesh(
										new THREE.BoxGeometry(1, 0.18, 0.18),
										new THREE.MeshBasicMaterial({
											color: data.hostile ? palette.coral : palette.cream,
										}),
									)
								: data.kind === "jet"
									? createJet()
									: createHelicopter(palette.coral, true);
			e = { ...data, mesh };
			if (data.type === "enemy" && data.kind !== "jet")
				mesh.scale.setScalar(0.85);
			mesh.position.set(data.x, data.y, data.type === "truck" ? 0 : 2);
			scene.add(mesh);
			entities.push(e);
		}
		Object.assign(e, data);
		e.targetX = data.x;
		e.targetY = data.y;
		e.mesh.rotation.y = 0;
		e.mesh.scale.x = Math.abs(e.mesh.scale.x) * (data.face || 1);
		e.mesh.visible = !data.inactive;
		if (data.type === "bullet")
			e.mesh.rotation.z = Math.atan2(data.vy, data.vx);
	}
	ships = entities
		.filter((e) => e.type === "ship")
		.sort((a, b) => a.index - b.index);
	trucks = entities.filter((e) => e.type === "truck");
	boss = entities.find((e) => e.type === "boss");
	for (const p of pilots)
		if (!s.pilots.some((a) => a.id === p.id)) {
			scene.remove(p.mesh);
			disposeModel(p.mesh);
		}
	pilots = pilots.filter((p) => s.pilots.some((a) => a.id === p.id));
	for (const p of s.pilots)
		if (!pilots.some((a) => a.id === p.id)) {
			const mesh = createPilot();
			mesh.position.set(p.x, p.y, 3);
			scene.add(mesh);
			pilots.push({ ...p, mesh });
		}
}
function updateHUD() {
	const me = ships[online.connected ? online.seat : 0] || ships[0];
	if (!me) return;
	$("pilotLabel").textContent =
		`0${(me.index || 0) + 1} / ${me.index ? "PATCHES" : "LUCKY"} · ${me.lives} SPARES`;
	$("lifeLabel").textContent =
		`HULL ${Math.ceil(Math.max(0, me.hp))}  /  ✦ ${me.flares}`;
	$("hull").innerHTML = Array.from(
		{ length: 10 },
		(_, i) => `<i class="${(me.hp / me.maxHp) * 10 > i ? "" : "off"}"></i>`,
	).join("");
	$("score").textContent = String(score).padStart(6, "0");
	$("highScore").textContent = String(Math.max(high, score)).padStart(6, "0");
	$("sectorLabel").textContent =
		`SECTOR 0${Math.min(4, stage + 1)} / ${sectorNames[stage]}`;
	$("objective").textContent =
		stage === 3
			? "DESTROY THE COMMAND CARRIER"
			: `ESCORT THE CONVOY · ${Math.max(0, Math.ceil(stageLengths[stage] - stageTime))}s`;
	$("trucks").innerHTML = trucks
		.map((t) => `<i class="${t.hp > 0 ? "" : "dead"}"></i>`)
		.join("");
	$("cargoLabel").textContent = `${trucks.filter((t) => t.hp > 0).length} / 6`;
	$("bossHud").style.display = boss && !boss.dead ? "block" : "none";
	if (boss)
		$("bossFill").style.width =
			clamp((boss.hp / boss.maxHp) * 100, 0, 100) + "%";
	drawRadar();
}
function drawRadar() {
	const c = $("radar"),
		ctx = c.getContext("2d");
	ctx.clearRect(0, 0, c.width, c.height);
	ctx.strokeStyle = "#4a7370";
	ctx.lineWidth = 1;
	for (let i = 0; i < 10; i++) {
		ctx.beginPath();
		ctx.moveTo(i * 62, 0);
		ctx.lineTo(i * 62, 82);
		ctx.stroke();
	}
	ctx.fillStyle = "#23494a";
	ctx.fillRect(0, 66, 620, 16);
	const xy = (e) => [((e.x + 100) / 200) * 620, 67 - (e.y / 35) * 60];
	for (const t of trucks) {
		const [x, y] = xy(t);
		ctx.fillStyle = t.hp > 0 ? "#ffc757" : "#6f5148";
		ctx.fillRect(x - 4, 67, 9, 5);
	}
	for (const p of pilots) {
		const [x, y] = xy(p);
		ctx.fillStyle = "#fff0cf";
		ctx.fillRect(x - 2, 60, 4, 5);
	}
	for (const e of entities.filter(
		(e) => e.type === "enemy" || e.type === "boss",
	)) {
		const [x, y] = xy(e);
		ctx.fillStyle = e.type === "boss" ? "#ff4f45" : "#f27151";
		ctx.beginPath();
		ctx.moveTo(x, y - 4);
		ctx.lineTo(x + 5, y + 3);
		ctx.lineTo(x - 5, y + 3);
		ctx.fill();
	}
	for (const s of ships) {
		if (s.inactive) continue;
		const [x, y] = xy(s);
		ctx.fillStyle = s.index ? "#ffc757" : "#67dbc0";
		ctx.beginPath();
		ctx.arc(x, y, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#fff0cf";
		ctx.strokeRect(x - 7, y - 7, 14, 14);
	}
	const left = ((cameraX - camera.right + 100) / 200) * 620,
		right = ((cameraX + camera.right + 100) / 200) * 620;
	ctx.strokeStyle = "#a5d1b477";
	ctx.strokeRect(left, 1, right - left, 78);
}
function menuBack() {
	if (screen === "pause") resume();
	else if (screen === "dev") showScreen("pause");
	else if (screen === "title") return;
	else showScreen(backTarget);
}
function pause() {
	if (online.hub || gameMode !== "play") return;
	if (screen === "none") {
		showScreen("pause");
		audio.sfx("menu");
	} else if (screen === "pause") resume();
}
function resume() {
	showScreen("none");
	audio.sfx("menu");
	updatePrompts();
}
function syncDev() {
	for (const [key] of Object.entries(defaults)) {
		const v = $("dev-" + key);
		if (v) {
			v.value = tune[key];
			$("value-" + key).textContent = Number(tune[key]).toFixed(
				key === "speed" ? 0 : 2,
			);
		}
	}
	$("godMode").checked = godMode;
}
function initUI() {
	const specs = [
		["speed", "Flight speed", 8, 32, 1],
		["spawnRate", "Enemy traffic", 0.25, 3, 0.05],
		["damage", "Incoming damage", 0.1, 3, 0.05],
		["armor", "Convoy armor", 0.25, 4, 0.05],
		["power", "Weapon power", 0.25, 4, 0.05],
		["timeScale", "Simulation speed", 0.25, 3, 0.05],
	];
	$("devSliders").innerHTML = specs
		.map(
			([k, l, a, b, s]) =>
				`<label class="labelrow" for="dev-${k}">${l}<output id="value-${k}">${tune[k]}</output></label><input type="range" id="dev-${k}" min="${a}" max="${b}" step="${s}" value="${tune[k]}">`,
		)
		.join("");
	for (const [k] of specs)
		$("dev-" + k).addEventListener("input", (e) => {
			tune[k] = +e.target.value;
			syncDev();
		});
	$("godMode").onchange = (e) => (godMode = e.target.checked);
	for (const k of ["music", "sfx"]) {
		const e = $(k);
		e.value = settings[k] * 100;
		$(k + "Value").textContent = Math.round(settings[k] * 100) + "%";
		e.oninput = () => {
			settings[k] = +e.value / 100;
			$(k + "Value").textContent = e.value + "%";
			saveSettings();
		};
	}
	for (const k of ["autoFire", "reducedShake"]) {
		$(k).checked = settings[k];
		$(k).onchange = (e) => {
			settings[k] = e.target.checked;
			saveSettings();
		};
	}
	$("glyphs").value = settings.glyphs;
	$("glyphs").onchange = (e) => {
		settings.glyphs = e.target.value;
		saveSettings();
		updatePrompts();
	};
	$("pauseButton").onclick = pause;
	$("rescueAction").onclick = () => {
		if (ships[0])
			for (const p of [...pilots])
				if (Math.abs(delta(p.x, ships[0].x)) < 4) rescuePilot(p, ships[0]);
	};
	for (const b of document.querySelectorAll("[data-action]"))
		b.addEventListener("click", async (event) => {
			audio.start();
			audio.sfx("menu");
			if (event.detail > 0)
				inputUsed(event.pointerType === "touch" ? "touch" : "keyboard");
			const action = b.dataset.action;
			if (["settings", "help", "about", "online"].includes(action)) {
				backTarget = screen === "pause" ? "pause" : "title";
				showScreen(action);
				return;
			}
			if (action === "back") {
				menuBack();
				return;
			}
			if (action === "start") startGame();
			if (action === "resume") resume();
			if (action === "dev") {
				syncDev();
				showScreen("dev");
			}
			if (action === "restart" && !online.hub)
				startGame(false, online.connected);
			if (action === "title") title();
			if (action === "upgradeGun") applyUpgrade("gun");
			if (action === "upgradeArmor") applyUpgrade("armor");
			if (action === "host") {
				b.disabled = true;
				try {
					const code = await online.host();
					$("roomDisplay").textContent = code;
					$("netLaunch").style.display = "block";
				} catch (e) {
					$("netStatus").textContent = e.message;
				}
				b.disabled = false;
			}
			if (action === "join") await online.join($("roomCode").value);
			if (action === "netStart") startGame(false, true);
			if (action === "nextSector") {
				if (stage < 3) applyUpgrade("gun");
				else toast("FINAL SECTOR", "The carrier is already here.");
				showScreen("dev");
			}
			if (action === "spawnBoss") {
				spawnBoss();
				showScreen("none");
			}
			if (action === "heal") {
				for (const s of ships) {
					s.hp = s.maxHp;
					s.flares = 5;
					s.lives = 2;
					s.inactive = false;
					s.mesh.visible = true;
				}
				for (const t of trucks) t.hp = 100;
				toast("REPAIRED", "ALL PILOTS & TRUCKS");
			}
			if (action === "clear") {
				for (const e of entities)
					if (e.type === "enemy" || e.type === "bullet") removeEntity(e);
				toast("CLEAR SKIES", "HOSTILES REMOVED");
			}
			if (action === "resetTune") {
				tune = { ...defaults };
				godMode = false;
				syncDev();
			}
			if (action === "victory")
				endGame(true, "Developer hangar: victory screen check.");
		});
	for (const b of document.querySelectorAll("button,input,select"))
		b.addEventListener("pointerenter", () => {
			if (document.activeElement !== b) b.focus({ preventScroll: true });
		});
	let html = "<h3>Source Information</h3>";
	for (const [k, v] of Object.entries(report.sourceInformation))
		html += `<div class="credit-line"><b>${k.replace(/([A-Z])/g, " $1")}:</b> ${v}</div>`;
	for (const [k, label] of [
		["testingFeedback", "Testing Feedback"],
		["engineFeedback", "Engine Feedback"],
		["promptFeedback", "Prompt Feedback"],
	]) {
		html += `<h3>${label}</h3>`;
		for (const a of report[k]) html += `<div class="credit-line">${a}</div>`;
	}
	$("credits").innerHTML = html;
	updatePrompts();
}
function inputEvent(e) {
	if (online.hub && online.ended) return true;
	inputUsed(e.pointerType === "touch" ? "touch" : "keyboard");
	if (gameMode === "attract") {
		e.preventDefault();
		title();
		return true;
	}
	return false;
}
window.addEventListener("keydown", (e) => {
	if (inputEvent(e)) return;
	if (e.target.tagName === "INPUT" && e.target.type === "text") {
		if (e.code === "Escape") {
			e.preventDefault();
			menuBack();
		} else if (e.code === "Enter") {
			e.preventDefault();
			online.join(e.target.value);
		}
		return;
	}
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Escape",
			"Tab",
			"Enter",
		].includes(e.code) &&
		e.target.tagName !== "INPUT"
	)
		e.preventDefault();
	if (e.code === "Escape" || e.code === "KeyP") {
		if (screen === "none") pause();
		else menuBack();
		return;
	}
	keys.add(e.code);
	if (screen !== "none") {
		if (e.repeat && ["Enter", "Space"].includes(e.code)) return;
		const f = document.activeElement;
		if (f?.type === "range" && ["ArrowLeft", "ArrowRight"].includes(e.code)) {
			f.value = clamp(
				+f.value + (e.code === "ArrowRight" ? 1 : -1) * (+f.step || 1),
				+f.min,
				+f.max,
			);
			f.dispatchEvent(new Event("input"));
			return;
		}
		if (
			f?.tagName === "SELECT" &&
			["ArrowLeft", "ArrowRight"].includes(e.code)
		) {
			f.selectedIndex = (f.selectedIndex + 1) % f.options.length;
			f.dispatchEvent(new Event("change"));
			return;
		}
		if (["ArrowDown", "ArrowUp", "Tab"].includes(e.code))
			navigate(e.code === "ArrowUp" || e.shiftKey ? -1 : 1);
		if (e.code === "Enter" || e.code === "Space") {
			if (document.activeElement?.tagName === "BUTTON")
				document.activeElement.click();
		}
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	mouse.down = false;
	if (gameMode === "play" && screen === "none" && !online.connected) pause();
});
window.addEventListener(
	"pointerdown",
	(e) => {
		if (inputEvent(e)) return;
		if (!audio.ctx) audio.start();
	},
	{ capture: true },
);
$("game").addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") {
		if (e.pointerId === touch.id) {
			touch.x = e.clientX;
			touch.y = e.clientY;
		} else if (e.pointerId === touch.aimId) {
			const dx = e.clientX - innerWidth * 0.75,
				dy = innerHeight * 0.5 - e.clientY;
			touch.aimX = Math.sign(dx) || 1;
			touch.aimY = clamp(dy / Math.max(20, Math.abs(dx)), -0.8, 0.8);
		}
		return;
	}
	inputUsed("keyboard");
	mouse.x = (e.clientX / innerWidth) * 2 - 1;
	mouse.y = (-e.clientY / innerHeight) * 2 + 1;
	mouse.active = true;
});
$("game").addEventListener("pointerdown", (e) => {
	if (online.hub && !online.canPlay) return;
	if (screen !== "none") return;
	if (e.pointerType === "touch") {
		inputUsed("touch");
		if (e.clientX < innerWidth * 0.55 && touch.id === null) {
			touch.active = true;
			touch.id = e.pointerId;
			touch.baseX = touch.x = e.clientX;
			touch.baseY = touch.y = e.clientY;
		} else {
			touch.aimId = e.pointerId;
			touch.aimX = e.clientX > innerWidth * 0.75 ? 1 : -1;
			touch.aimY = 0;
			if (ships[0] && touch.lastTap && e.timeStamp - touch.lastTap < 330)
				flare(ships[0]);
			touch.lastTap = e.timeStamp;
		}
		$("game").setPointerCapture(e.pointerId);
	} else {
		mouse.down = true;
		mouse.active = true;
	}
});
window.addEventListener("pointerup", (e) => {
	mouse.down = false;
	if (e.pointerId === touch.id) {
		touch.active = false;
		touch.id = null;
	}
	if (e.pointerId === touch.aimId) touch.aimId = null;
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("pointermove", (e) => {
	if (
		e.pointerType !== "touch" &&
		(gameMode === "title" || gameMode === "attract")
	) {
		inputUsed("keyboard");
		if (gameMode === "attract") title();
	}
});
function navigate(dir) {
	const s = $(screen + "Screen");
	if (!s) return;
	const items = [...s.querySelectorAll("button,input,select")].filter(
		(e) =>
			!e.disabled &&
			getComputedStyle(e).display !== "none" &&
			e.offsetParent !== null,
	);
	const i = items.indexOf(document.activeElement);
	items[(i + dir + items.length) % items.length]?.focus({
		preventScroll: true,
	});
	audio.sfx("menu");
}
function pollGamepad(dt) {
	navClock -= dt;
	const pads = navigator.getGamepads?.() || [];
	for (let i = 0; i < Math.min(pads.length, 2); i++) {
		const p = pads[i];
		if (!p) continue;
		const prev = gamepadPrev[i] || [];
		const pressed = (b) => p.buttons[b]?.pressed && !prev[b];
		const any =
			p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.2);
		if (any) {
			inputUsed("gamepad");
			if (gameMode === "attract") {
				title();
				gamepadPrev[i] = p.buttons.map((b) => b.pressed);
				continue;
			}
		}
		if (
			i === 1 &&
			pressed(0) &&
			gameMode === "play" &&
			ships.length === 1 &&
			!online.connected
		) {
			makeShip(1);
			localCoop = true;
			toast("PATCHES REPORTING", "WINGMATE JOINED / SHARED SCORE");
		}
		if (pressed(9) && !p.buttons[8]?.pressed) {
			if (screen === "none") pause();
			else if (screen === "pause") resume();
			else if (screen !== "title") menuBack();
		}
		if (screen !== "none") {
			const dir =
				p.axes[1] > 0.5 || p.buttons[13]?.pressed
					? 1
					: p.axes[1] < -0.5 || p.buttons[12]?.pressed
						? -1
						: 0;
			if (dir && navClock <= 0) {
				navigate(dir);
				navClock = 0.2;
			}
			const focus = document.activeElement;
			if (
				focus?.tagName === "INPUT" &&
				focus.type === "range" &&
				navClock <= 0
			) {
				const lr =
					p.axes[0] > 0.5 || p.buttons[15]?.pressed
						? 1
						: p.axes[0] < -0.5 || p.buttons[14]?.pressed
							? -1
							: 0;
				if (lr) {
					focus.value = clamp(
						+focus.value + lr * (+focus.step || 1),
						+focus.min,
						+focus.max,
					);
					focus.dispatchEvent(new Event("input"));
					navClock = 0.12;
				}
			}
			if (pressed(0)) {
				if (focus?.tagName === "BUTTON") focus.click();
				else if (focus?.type === "checkbox") {
					focus.checked = !focus.checked;
					focus.dispatchEvent(new Event("change"));
				} else if (focus?.tagName === "SELECT") {
					focus.selectedIndex =
						(focus.selectedIndex + 1) % focus.options.length;
					focus.dispatchEvent(new Event("change"));
				}
			}
			if (pressed(1) && screen !== "title") menuBack();
		}
		gamepadPrev[i] = p.buttons.map((b) => b.pressed);
	}
}
function resize() {
	if (!renderer) return;
	const aspect = innerWidth / innerHeight;
	const h = aspect < 1 ? 59 : 43;
	camera.left = (-h * aspect) / 2;
	camera.right = (h * aspect) / 2;
	camera.top = h / 2;
	camera.bottom = -h / 2;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener("resize", resize);
function animate(ms) {
	const dt = Math.min(0.06, (ms - lastTick) / 1000 || 0.016);
	lastTick = ms;
	idle += dt;
	pollGamepad(dt);
	if (screen === "title" && idle > 10 && !online.hub) startGame(true);
	if (!online.isHost) {
		if (!online.ended) online.sendInput(readInput(0, online.seat));
		for (const e of entities) {
			e.mesh.userData.mixer?.update(dt);
			if (e.targetX !== undefined) {
				const f = 1 - Math.exp(-22 * dt);
				e.mesh.position.x = wrap(
					e.mesh.position.x + delta(e.targetX, e.mesh.position.x) * f,
				);
				e.mesh.position.y = THREE.MathUtils.lerp(
					e.mesh.position.y,
					e.targetY,
					f,
				);
			}
		}
	} else if (!testMode) {
		accum += dt;
		while (accum >= 1 / 60) {
			simulate(1 / 60);
			accum -= 1 / 60;
		}
	}
	if (gameMode === "title") {
		const s = ships[0];
		if (s) {
			s.y = 17 + Math.sin(ms * 0.001) * 0.6;
			s.mesh.position.set(18, s.y, 3);
			s.mesh.rotation.z = Math.sin(ms * 0.0006) * 0.04;
			s.mesh.userData.mixer?.update(dt);
		}
		for (const e of entities) if (e !== s) e.mesh.userData.mixer?.update(dt);
		for (let i = 0; i < trucks.length; i++) {
			trucks[i].mesh.position.x = -13 + i * 12 + Math.sin(ms * 0.0001) * 2;
		}
	}
	const followed = ships[online.connected ? online.seat : 0] || ships[0];
	const target =
		gameMode === "title" ? 5 : followed ? followed.x + followed.face * 9 : 0;
	if (Math.abs(cameraX - target) > 120) cameraX = target;
	cameraX = THREE.MathUtils.damp(cameraX, target, 3, dt);
	shake = Math.max(0, shake - dt);
	flash = Math.max(0, flash - dt * 2);
	const j = settings.reducedShake ? 0 : shake;
	camera.position.set(
		cameraX + Math.sin(ms * 0.09) * j,
		19 + Math.cos(ms * 0.12) * j,
		70,
	);
	camera.lookAt(cameraX, 18, 0);
	worldVisual.update(dt, cameraX, ms / 1000);
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").classList.remove("show");
	}
	if (radioTimer > 0) {
		radioTimer -= dt;
		if (radioTimer <= 0) $("radio").style.display = "none";
	}
	$("damageFlash").style.opacity = flash;
	audio.update(dt, {
		playing: screen === "none" && gameMode === "play" && !online.ended,
		throttle: Math.hypot(followed?.vx || 0, followed?.vy || 0) / 25,
		danger: trucks.filter((t) => t.hp > 0).length < 3,
		boss: stage === 3,
	});
	$("touchHint").style.opacity = totalTime > 10 ? "0" : "1";
	updateHUD();
	if (online.connected) online.tick(dt, getSnapshot());
	renderer.render(scene, camera);
}
async function init() {
	try {
		initUI();
		await RAPIER.init();
		physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
		queue = new RAPIER.EventQueue(true);
		scene = new THREE.Scene();
		scene.background = new THREE.Color(palette.sky);
		scene.fog = new THREE.Fog(palette.sky, 110, 260);
		camera = new THREE.OrthographicCamera(-40, 40, 21.5, -21.5, 0.1, 300);
		renderer = new THREE.WebGPURenderer({
			canvas: $("game"),
			antialias: true,
			alpha: false,
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.9;
		await renderer.init();
		worldVisual = createWorld(scene);
		resize();
		title();
		$("loading").style.display = "none";
		renderer.setAnimationLoop(animate);
		await online.initHub();
		window.__game = {
			ready: true,
			get state() {
				return getSnapshot();
			},
			get mode() {
				return gameMode;
			},
			get backend() {
				return renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 fallback";
			},
			get physicsVersion() {
				return RAPIER.version();
			},
			get audio() {
				return audio;
			},
			get online() {
				return {
					role: online.role,
					hub: online.hub,
					connected: online.connected,
					server: online.server,
					canPlay: online.canPlay,
				};
			},
			start: () => {
				testMode = true;
				startGame();
			},
			step: (seconds) => {
				testMode = true;
				for (let i = 0; i < Math.round(seconds * 60); i++) simulate(1 / 60);
				updateHUD();
				return getSnapshot();
			},
			realtime: () => {
				testMode = false;
			},
			pilot: (value) => {
				testPilot = value;
			},
			tune: (values) => {
				Object.assign(tune, values);
				syncDev();
			},
			invincible: (value) => {
				godMode = value;
			},
			spawn: (kind, x, y) => {
				const e = spawnEnemy(kind, x, y);
				return e.id;
			},
			damageShip: (amount) => damage(ships[0], amount),
			damageTruck: (index, amount) => damage(trucks[index], amount),
			setShip: (x, y) => {
				ships[0].x = x;
				ships[0].y = y;
				ships[0].inv = 0;
			},
			flare: () => flare(ships[0]),
			rescue: () => spawnPilot(ships[0].x),
			boss: spawnBoss,
			upgrade: applyUpgrade,
			pause,
			screen: () => screen,
			menu: (name) => showScreen(name),
			title,
			devDefaults: () => ({ ...defaults }),
			get tuneValues() {
				return { ...tune, upgradePower, upgradeSpeed };
			},
			get diagnostics() {
				return {
					entities: entities.length,
					physicsBodies: physics.bodies.len(),
					animations: entities.filter((e) => e.mesh.userData.mixer).length,
					audio: audio.diagnostics(),
					shotsFired,
					combo,
					pilots: pilots.length,
					testMode,
				};
			},
			offlineAudio: async () => {
				const ctx = new OfflineAudioContext(2, 96000, 48000);
				const a = new AudioEngine({ context: ctx });
				await a.start();
				a.update(0.016, { playing: true, throttle: 1, boss: true });
				for (const n of [
					"shoot",
					"hit",
					"boom",
					"rescue",
					"flare",
					"pickup",
					"menu",
					"start",
					"victory",
					"loss",
				])
					a.sfx(n);
				a.voice("Lucky");
				const buf = await ctx.startRendering();
				let sum = 0,
					peak = 0,
					finite = true;
				for (const v of buf.getChannelData(0)) {
					sum += v * v;
					peak = Math.max(peak, Math.abs(v));
					if (!Number.isFinite(v)) finite = false;
				}
				return {
					rms: Math.sqrt(sum / buf.length),
					peak,
					finite,
					stats: a.diagnostics(),
				};
			},
		};
	} catch (error) {
		console.error(error);
		$("loading").style.display = "flex";
		$("loadError").textContent =
			"Unable to start the patrol: " +
			error.message +
			". Use a browser with WebGPU or WebGL 2 enabled.";
		globalThis.AIHub?.fail?.(error.message);
		window.__game = { ready: false, error: error.message };
	}
}
init();
