import RAPIER from "rapier";
import { Sound } from "./audio.js";
import { Network } from "./net.js";
import { Coast } from "./scene.js";

const $ = (id) => document.getElementById(id),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const defaults = {
	speed: 29,
	gravity: 13,
	cooldown: 0.3,
	enemySpeed: 1,
	spawn: 1.45,
	damage: 1,
	wind: 1,
	assist: 0.35,
};
let tuning = { ...defaults },
	prefs = { music: 0.1, sfx: 0.65, glyph: "ps", shake: true, assist: true };
try {
	Object.assign(
		prefs,
		JSON.parse(localStorage.getItem("pier-pressure-prefs") || "{}"),
	);
} catch {}
const sound = new Sound();
sound.setMusic(prefs.music);
sound.setSfx(prefs.sfx);
let coast,
	world,
	events,
	screen = "loading",
	previous = "title",
	mode = "solo",
	inputMode = "keyboard",
	idle = 0,
	ready = false,
	autoplay = false;
let simTime = 0,
	physicsSteps = 0,
	stepClock = 0,
	spawnClock = 0,
	supplyClock = 0,
	nextId = 1,
	shake = 0,
	toastTime = 0,
	bannerTime = 0,
	demoTime = 0;
let entities = new Map(),
	handles = new Map(),
	remoteViews = new Map(),
	inputs = [
		{ angle: 1.1, fire: false, salvo: false },
		{ angle: 2.04, fire: false, salvo: false },
	],
	remoteInputs = [{}, {}];
let salvoLatch = [0, 0];
function playerSeat() {
	return mode === "online" ? Math.max(0, net.localSeat) : 0;
}
function requestSalvo(seat = playerSeat()) {
	if (screen !== "playing") return;
	if (mode === "online" && net.isGuest) salvoLatch[seat] = 0.35;
	else salvo(seat);
}
let G = {},
	keys = new Set(),
	pointerDown = false,
	mousePoint = null,
	padPrevious = [],
	navAt = 0,
	navIndex = 0,
	manualInput = null,
	touchOrigin = null,
	touchAim = null,
	touchActive = false,
	touchPointerId = null;
const stageNames = ["SKY PATROL", "CONVOY CROSSING", "THE ADMIRAL"];
const stageOrders = [
	"Lead the aircraft. Shoot down red bombs.",
	"Rough water. Low angles. Watch the wind.",
	"Sink the flagship. Keep the pier standing.",
];
const net = new Network({
	onInput: (input, seat) => {
		remoteInputs[seat] = {
			...input,
			fire: !!input.fire,
			salvo: !!input.salvo || !!remoteInputs[seat]?.salvo,
		};
	},
	onState: (s) => applySnapshot(s),
	onStatus: (t) => {
		$("networkStatus").textContent = t;
	},
	onConnect: () => {
		start("online");
		toast("SECOND GUNNER ABOARD");
	},
	onDisconnect: () => {
		if (["playing", "pause", "dev"].includes(screen)) {
			if (net.isGuest) {
				finish(false, "RADIO LINK LOST", true);
				return;
			}
			mode = "solo";
			inputs[1].fire = false;
			remoteInputs[1] = {};
			coast.guns[1].root.visible = false;
			toast("SECOND GUNNER LEFT · KEEP FIRING");
		}
	},
	onStart: () => start("online"),
	onTimeUp: () => {
		if (net.isHost) finish(G.health > 0, "WATCH COMPLETE");
	},
	onEnd: (reason) => {
		if (screen !== "results")
			finish(
				false,
				reason === "host-left" ? "COMMAND DISCONNECTED" : "WATCH ENDED",
				true,
			);
	},
	onResult: (score, won, stats) => {
		G.score = score;
		Object.assign(G, stats);
		finish(won, won ? "HARBOR SECURED" : "WATCH ENDED", true);
	},
	onLeave: () => {
		remoteInputs[1] = {};
		toast("A GUNNER LEFT THE WATCH");
	},
});
function save() {
	try {
		localStorage.setItem("pier-pressure-prefs", JSON.stringify(prefs));
	} catch {}
}
function touchOrPad() {
	document.body.classList.toggle("touch", inputMode === "touch");
}
function setInputMode(v) {
	if (inputMode !== v) {
		inputMode = v;
		$("salvoTouch").hidden = v !== "touch" || screen !== "playing";
		touchOrPad();
		updatePrompts();
		if (
			v === "gamepad" &&
			screen !== "playing" &&
			!focusables().includes(document.activeElement)
		)
			focusables()[0]?.focus({ preventScroll: true });
	}
}
function activity(type) {
	idle = 0;
	if (type) setInputMode(type);
	if (mode === "demo") {
		title();
		return true;
	}
	return false;
}
function updatePrompts() {
	const pad = inputMode === "gamepad",
		xbox = prefs.glyph === "xbox";
	for (const e of document.querySelectorAll("[data-prompt]")) {
		const p = e.dataset.prompt;
		e.textContent = pad
			? {
					fire: xbox ? "RT" : "R2",
					salvo: xbox ? "X" : "□",
					confirm: xbox ? "A" : "✕",
					back: xbox ? "B" : "○",
					pause: "☰",
					aim: "L",
				}[p]
			: {
					fire: "HOLD CLICK / SPACE",
					salvo: "E",
					confirm: "ENTER",
					back: "ESC",
					pause: "ESC",
					aim: "MOUSE / A D",
				}[p];
	}
	$("controlLine").innerHTML = pad
		? `<b>L</b> aim <b>${xbox ? "RT" : "R2"} / ${xbox ? "A" : "✕"}</b> fire <b>${xbox ? "X" : "□"}</b> salvo <b>☰</b> pause`
		: "<b>MOUSE</b> aim <b>HOLD CLICK / SPACE</b> fire <b>E</b> salvo <b>ESC</b> pause";
}
function setScreen(s) {
	screen = s;
	$("screen").dataset.screen = s;
	document.body.dataset.screen = s;
	for (const el of document.querySelectorAll(".panel"))
		el.hidden = el.dataset.panel !== s;
	$("hud").hidden = !["playing", "pause", "dev"].includes(s);
	$("pause").hidden = s !== "playing";
	$("attract").hidden = mode !== "demo";
	$("salvoTouch").hidden = inputMode !== "touch" || s !== "playing";
	navIndex = 0;
	requestAnimationFrame(() => {
		const b = focusables()[0];
		if (b && inputMode === "gamepad") b.focus({ preventScroll: true });
	});
}
function toast(text) {
	$("toast").textContent = text;
	toastTime = 2.8;
	$("toast").classList.add("show");
}
function banner(kicker, title, sub) {
	$("bannerKicker").textContent = kicker;
	$("bannerTitle").textContent = title;
	$("bannerSub").textContent = sub;
	bannerTime = 3.2;
	$("banner").classList.add("show");
	sound.voice(G.wave || 0);
}
function title() {
	clearWorld();
	mode = "solo";
	autoplay = false;
	setScreen("title");
	idle = 0;
	pointerDown = false;
	touchActive = false;
	inputs.forEach((i) => {
		i.fire = false;
	});
	sound.mute(false);
	coast.guns.forEach((g) => {
		g.root.visible = true;
	});
	createTableau();
}
function clearWorld() {
	for (const e of [...entities.values()]) remove(e);
	for (const r of remoteViews.values()) coast?.remove(r);
	remoteViews.clear();
}
function createTableau() {
	if (!coast) return;
	const a = spawn("plane", 1, 24);
	a.x = 9;
	a.y = 16;
	a.baseY = 16;
	a.root.position.set(9, 16, 0);
	a.body.setTranslation({ x: 9, y: 16, z: 0 }, true);
	const b = spawn("boat", -1);
	b.x = 16;
	b.y = 3.5;
	b.baseY = 3.5;
	b.root.position.set(16, 3.5, 0);
	b.body.setTranslation({ x: 16, y: 3.5, z: 0 }, true);
	const h = spawn("heli", -1);
	h.x = 23;
	h.y = 10;
	h.baseY = 10;
	h.root.position.set(23, 10, 0);
	h.body.setTranslation({ x: 23, y: 10, z: 0 }, true);
}
function resetPhysics() {
	clearWorld();
	if (world) world.free();
	if (events) events.free();
	world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
	world.timestep = 1 / 60;
	events = new RAPIER.EventQueue(true);
	handles.clear();
}
function start(which = "solo") {
	if (which !== "online" && !net.active && net.isGuest) net.leave();
	mode = which;
	salvoLatch = [0, 0];
	autoplay = which === "demo";
	$("devAI").textContent = "AUTOPILOT " + (autoplay ? "ON" : "OFF");
	resetPhysics();
	simTime = 0;
	stepClock = 0;
	spawnClock = 0.45;
	supplyClock = 8;
	demoTime = 0;
	remoteInputs = [{}, {}];
	manualInput = null;
	G = {
		wave: 0,
		score: 0,
		health: 7,
		maxHealth: 7,
		energy: [100, 100],
		cooldowns: [0, 0],
		kills: 0,
		waveKills: 0,
		shotsFired: 0,
		hits: 0,
		combo: 0,
		comboTimer: 0,
		bestCombo: 0,
		bossHP: 24,
		bossMax: 24,
		won: false,
		time: 0,
		salvos: 0,
		rescues: 0,
	};
	inputs = [
		{ angle: 1.1, fire: false, salvo: false },
		{ angle: 2.04, fire: false, salvo: false },
	];
	pointerDown = false;
	touchActive = false;
	keys.clear();
	net.reported = false;
	sound.mute(false);
	setScreen("playing");
	banner(
		which === "demo" ? "AUTOMATIC DEMONSTRATION" : "OPERATION 01",
		stageNames[0],
		stageOrders[0],
	);
	updateHUD();
	coast.guns[1].root.visible = which !== "solo" && which !== "demo";
}
function nextWave() {
	G.wave++;
	G.waveKills = 0;
	G.health = Math.min(G.maxHealth, G.health + 2);
	G.energy = G.energy.map((v) => Math.max(v, 65));
	clearWorld();
	spawnClock = 1;
	banner("OPERATION 0" + (G.wave + 1), stageNames[G.wave], stageOrders[G.wave]);
	if (G.wave === 2) spawn("boss", 1);
	sound.fanfare();
}
function finish(
	won,
	reason = won ? "HARBOR SECURED" : "PIER OVERRUN",
	fromNet = false,
) {
	if (screen === "results") return;
	G.won = won;
	inputs.forEach((i) => {
		i.fire = false;
	});
	pointerDown = false;
	touchActive = false;
	if (mode === "demo") {
		start("demo");
		return;
	}
	$("resultKicker").textContent = won ? "MISSION COMPLETE" : "END OF WATCH";
	$("resultTitle").textContent = reason;
	const acc = G.shotsFired ? Math.round((G.hits / G.shotsFired) * 100) : 0;
	const medal = won
		? G.health >= 5
			? "GOLD ANCHOR"
			: G.health >= 3
				? "SILVER ANCHOR"
				: "BRONZE ANCHOR"
		: "BACK TO THE BATTERY";
	$("medal").textContent = medal;
	$("finalScore").textContent = String(G.score || 0).padStart(6, "0");
	$("resultStats").innerHTML =
		`<span><b>${G.kills || 0}</b> TARGETS</span><span><b>${acc}%</b> ACCURACY</span><span><b>${G.bestCombo || 0}×</b> BEST CHAIN</span>`;
	try {
		const old = Number(localStorage.getItem("pier-pressure-best") || 0);
		if (G.score > old) localStorage.setItem("pier-pressure-best", G.score);
		$("best").textContent = String(Math.max(old, G.score || 0)).padStart(
			6,
			"0",
		);
	} catch {}
	setScreen("results");
	if (won) sound.fanfare();
	else sound.hurt();
	if (!fromNet && net.isHost && mode === "online")
		net.finish(G.score, won, {
			kills: G.kills,
			shotsFired: G.shotsFired,
			hits: G.hits,
			bestCombo: G.bestCombo,
			health: G.health,
		});
}
function spawn(type, side = Math.random() < 0.5 ? 1 : -1, y) {
	const id = nextId++,
		x = side > 0 ? -29 : 29,
		baseY =
			y ??
			(type === "boat"
				? 2.8
				: type === "boss"
					? 3.2
					: type === "supply"
						? 24
						: 11 + Math.random() * 11);
	const root = coast.makeTarget(type, side);
	root.position.set(x, baseY, 0);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, baseY, 0),
	);
	const dims =
		type === "boss"
			? [5.4, 2.4, 1.7]
			: type === "boat"
				? [2.2, 1.4, 1.5]
				: type === "bomb"
					? [0.38, 0.55, 0.4]
					: type === "supply"
						? [1.05, 1.5, 1.1]
						: type === "heli"
							? [1.8, 1.05, 1.6]
							: [1.7, 0.65, 1.8];
	const col = world.createCollider(
		RAPIER.ColliderDesc.cuboid(...dims)
			.setTranslation(0, type === "boss" ? 1.5 : type === "boat" ? 0.45 : 0, 0)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		body,
	);
	const speed =
		(type === "boat"
			? 2.5
			: type === "heli"
				? 3.4
				: type === "boss"
					? 0
					: type === "supply"
						? 0
						: 5.1 + Math.random() * 2) * side;
	const e = {
		id,
		type,
		x,
		y: baseY,
		baseY,
		vx: speed,
		vy: 0,
		side,
		root,
		body,
		col,
		alive: true,
		hp: type === "boss" ? 24 : type === "heli" || type === "boat" ? 2 : 1,
		age: 0,
		drop: 2.1 + Math.random() * 2,
		flash: 0,
	};
	if (type === "boss") {
		e.x = 0;
		root.position.x = 0;
		body.setTranslation({ x: 0, y: baseY, z: 0 }, true);
	}
	if (type === "supply") {
		e.x = (Math.random() - 0.5) * 32;
		root.position.x = e.x;
		body.setTranslation({ x: e.x, y: baseY, z: 0 }, true);
	}
	entities.set(id, e);
	handles.set(col.handle, e);
	return e;
}
function remove(e) {
	if (!e || !entities.has(e.id)) return;
	e.alive = false;
	handles.delete(e.col.handle);
	if (world.getRigidBody(e.body.handle)) world.removeRigidBody(e.body);
	coast.remove(e.root);
	entities.delete(e.id);
}
function shoot(seat = 0, angle = inputs[seat].angle, special = false) {
	if (G.cooldowns[seat] > 0 && !special) return false;
	const gun = coast.guns[seat],
		x = gun.x + Math.cos(angle) * 2.65,
		y = 3.2 + Math.sin(angle) * 2.65;
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(x, y, 0)
			.setLinvel(
				Math.cos(angle) * tuning.speed,
				Math.sin(angle) * tuning.speed,
				0,
			)
			.enabledTranslations(true, true, false)
			.enabledRotations(false, false, false)
			.setCcdEnabled(true),
	);
	const col = world.createCollider(
		RAPIER.ColliderDesc.ball(0.25 + tuning.assist * 0.23)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		body,
	);
	const e = {
		id: nextId++,
		type: "shot",
		seat,
		body,
		col,
		root: coast.projectile(x, y, special),
		x,
		y,
		age: 0,
		alive: true,
		special,
	};
	entities.set(e.id, e);
	handles.set(col.handle, e);
	G.shotsFired++;
	G.cooldowns[seat] = tuning.cooldown;
	gun.action.reset().play();
	coast.burst(x, y, "#ffdb79", 0.18);
	sound.shot();
	return true;
}
function salvo(seat) {
	if (G.energy[seat] < 99.8) return;
	G.energy[seat] = 0;
	G.salvos++;
	sound.voice(2);
	shake = prefs.shake ? 0.25 : 0;
	const a = inputs[seat].angle;
	for (let i = -3; i <= 3; i++)
		shoot(seat, clamp(a + i * 0.115, 0.13, Math.PI - 0.13), true);
	for (const e of [...entities.values()]) {
		if (e.type === "bomb") damage(e, 2);
	}
	toast("BROADSIDE!");
}
function damage(e, amount = 1) {
	if (!e?.alive || e.type === "shot") return;
	if (e.type === "supply") {
		G.energy = G.energy.map((v) => Math.min(100, v + 40));
		G.health = Math.min(G.maxHealth, G.health + 1);
		G.rescues++;
		G.score += 250;
		coast.burst(e.x, e.y, "#a4e8c4", 1.4);
		sound.hit("supply");
		toast("SUPPLY +1 HULL · +40 SALVO");
		remove(e);
		return;
	}
	e.hp -= amount;
	G.hits++;
	e.flash = 0.16;
	e.root.scale.setScalar(1.08);
	if (e.type === "boss") G.bossHP = Math.max(0, e.hp);
	coast.burst(
		e.x,
		e.y + (e.type === "boss" ? 1 : 0),
		e.type === "bomb" ? "#f5d077" : "#ef8b50",
		e.hp > 0 ? 0.45 : 1,
	);
	sound.hit(e.type);
	if (e.hp > 0) return;
	const values = {
		plane: 100,
		scout: 100,
		heli: 175,
		boat: 200,
		bomb: 75,
		boss: 2500,
	};
	G.combo = G.comboTimer > 0 ? G.combo + 1 : 1;
	G.comboTimer = 3.5;
	G.bestCombo = Math.max(G.bestCombo, G.combo);
	const mult = Math.min(5, 1 + Math.floor(G.combo / 4));
	G.score += (values[e.type] || 100) * mult;
	G.energy = G.energy.map((v) => Math.min(100, v + 7));
	if (e.type !== "bomb") {
		G.kills++;
		G.waveKills++;
	}
	if (e.type === "boss") {
		remove(e);
		finish(true);
		return;
	}
	remove(e);
	if (G.wave === 0 && G.waveKills >= 8) nextWave();
	else if (G.wave === 1 && G.waveKills >= 10) nextWave();
}
function hurt() {
	if (autoplay || mode === "demo" || tuning.damage === 0) return;
	G.health -= tuning.damage;
	G.combo = 0;
	G.comboTimer = 0;
	shake = prefs.shake ? 0.6 : 0;
	sound.hurt();
	coast.burst((Math.random() - 0.5) * 22, 2, "#ee7450", 1.8);
	$("damageFlash").classList.remove("flash");
	void $("damageFlash").offsetWidth;
	$("damageFlash").classList.add("flash");
	if (G.health <= 0) finish(false);
}
function wind() {
	return (G.wave === 0 ? 0.35 : Math.sin(simTime * 0.19) * 2.3) * tuning.wind;
}
function aimAt(seat, x, y) {
	const dx = x - coast.guns[seat].x,
		dy = y - 3.2,
		v = tuning.speed,
		g = tuning.gravity,
		abs = Math.abs(dx),
		disc = v * v * v * v - g * (g * abs * abs + 2 * dy * v * v);
	if (abs < 0.2) return Math.PI / 2;
	if (disc < 0) return Math.atan2(Math.max(1, dy), dx);
	const a = Math.atan((v * v - Math.sqrt(disc)) / (g * abs));
	return clamp(dx < 0 ? Math.PI - a : a, 0.12, Math.PI - 0.12);
}
function autoInput(seat) {
	const gun = coast.guns[seat];
	let target = null,
		best = 1e9;
	for (const e of entities.values()) {
		if (e.type === "shot") continue;
		const priority =
			(e.type === "bomb" ? -0.7 : 0) +
			(e.type === "boss" ? -0.3 : 0) +
			(e.type === "supply" ? 0.5 : 0);
		const d = Math.hypot(e.x - gun.x, e.y - 3.2) / 30 + priority;
		if (d < best) {
			best = d;
			target = e;
		}
	}
	if (!target) return { angle: 1.1, fire: false, salvo: false };
	let a = aimAt(
		seat,
		target.x,
		target.y + (["boat", "boss"].includes(target.type) ? 1 : 0),
	);
	for (let k = 0; k < 4; k++) {
		let t =
			Math.abs(target.x - gun.x) /
			Math.max(2, Math.abs(Math.cos(a) * tuning.speed));
		t = clamp(t, 0.08, 2.2);
		const xx =
			target.type === "boss"
				? Math.sin((simTime + t) * 0.43) * 13
				: target.x + target.vx * t * tuning.enemySpeed;
		const yy =
			target.y +
			(target.type === "bomb"
				? target.vy * t
				: target.type === "supply"
					? -0.7 * t
					: 0) +
			(target.type === "boss" ? 1.8 : target.type === "boat" ? 0.7 : 0);
		a = aimAt(seat, xx - wind() * 0.5 * t * t, yy);
	}
	return {
		angle: a,
		fire: true,
		salvo: G.energy[seat] >= 100 && G.wave > 0 && G.time > 15,
	};
}
function updateEntities(dt) {
	const dead = [];
	for (const e of entities.values()) {
		e.age += dt;
		if (e.type === "shot") {
			if (Math.abs(wind()) > 0.01) {
				const v = e.body.linvel();
				e.body.setLinvel({ x: v.x + wind() * dt, y: v.y, z: 0 }, true);
			}
			const p = e.body.translation();
			e.x = p.x;
			e.y = p.y;
			e.root.position.set(p.x, p.y, 0);
			if (e.y < 0.8 || e.y > 34 || Math.abs(e.x) > 34 || e.age > 6) {
				if (e.y < 0.8) {
					coast.burst(e.x, 0.8, "#a0d9ca", 0.6);
					sound.splash();
				}
				dead.push(e);
			}
			continue;
		}
		if (e.flash > 0) {
			e.flash -= dt;
			if (e.flash <= 0) e.root.scale.setScalar(1);
		}
		if (e.type === "boss") {
			e.x = Math.sin(simTime * 0.43) * 13;
			e.drop -= dt;
			if (e.drop <= 0) {
				e.drop = 2.1;
				for (let k = -1; k <= 1; k++) {
					const b = spawn("bomb", 1, e.y + 5);
					b.x = e.x + k * 3;
					b.vx = (coast.guns[k === 1 ? 1 : 0].x - b.x) * 0.25;
					b.vy = 6;
					b.baseY = b.y;
				}
			}
		} else if (e.type === "bomb") {
			e.x += e.vx * dt;
			e.vy -= 7 * dt;
			e.y += e.vy * dt;
			if (e.y < 1.8) {
				dead.push(e);
				hurt();
			}
		} else if (e.type === "supply") {
			e.y -= 0.72 * dt;
			if (e.y < 1.8) dead.push(e);
		} else {
			e.x += e.vx * dt * tuning.enemySpeed;
			e.y = e.baseY + Math.sin(e.age * (e.type === "boat" ? 1.5 : 2)) * 0.18;
			e.drop -= dt;
			if (e.drop <= 0 && Math.abs(e.x) < 20) {
				e.drop = e.type === "boat" ? 4.3 : 4.8;
				const b = spawn("bomb", 1, e.y - 0.7);
				b.x = e.x;
				b.vx =
					e.type === "boat"
						? (coast.guns[e.x > 0 ? 1 : 0].x - e.x) * 0.4
						: e.vx * 0.3;
				b.vy = e.type === "boat" ? 11 : -1;
			}
			if (Math.abs(e.x) > 34) dead.push(e);
		}
		e.body.setNextKinematicTranslation({ x: e.x, y: e.y, z: 0 });
		e.root.position.set(e.x, e.y, 0);
		e.root.userData.mixer?.update(dt);
	}
	for (const e of dead) remove(e);
}
function step(dt) {
	if (screen !== "playing" || net.ended) return;
	if (!net.running) return;
	if (net.isGuest && mode === "online") {
		const seat = playerSeat();
		net.tick(
			dt,
			{ ...inputs[seat], salvo: inputs[seat].salvo || salvoLatch[seat] > 0 },
			null,
		);
		salvoLatch[seat] = Math.max(0, salvoLatch[seat] - dt);
		return;
	}
	simTime += dt;
	G.time += dt;
	physicsSteps++;
	world.gravity.y = -tuning.gravity;
	const seats = mode === "coop" || mode === "online" ? 2 : 1;
	for (let i = 0; i < seats; i++) {
		G.cooldowns[i] = Math.max(0, G.cooldowns[i] - dt);
		G.energy[i] = Math.min(100, G.energy[i] + dt * 2.1);
		let inp = autoplay || mode === "demo" ? autoInput(i) : inputs[i];
		if (mode === "online" && (net.server || i !== net.localSeat))
			inp = remoteInputs[i] || {};
		if (inp.angle != null && Number.isFinite(inp.angle))
			inputs[i].angle = clamp(inp.angle, 0.12, Math.PI - 0.12);
		coast.guns[i].pivot.rotation.z = inputs[i].angle;
		if (inp.fire) shoot(i);
		if (inp.salvo) {
			salvo(i);
			if (mode === "online" && (net.server || i !== net.localSeat))
				remoteInputs[i].salvo = false;
		}
	}
	spawnClock -= dt;
	supplyClock -= dt;
	if (spawnClock <= 0) {
		spawnClock = tuning.spawn * (G.wave === 2 ? 1.8 : 1);
		const type =
			G.wave === 0
				? Math.random() < 0.2
					? "heli"
					: "plane"
				: G.wave === 1
					? Math.random() < 0.6
						? "boat"
						: "plane"
					: Math.random() < 0.4
						? "heli"
						: "plane";
		spawn(type);
	}
	if (supplyClock <= 0) {
		spawn("supply");
		supplyClock = 16;
	}
	updateEntities(dt);
	world.step(events);
	const collisions = [];
	events.drainCollisionEvents((a, b, started) => {
		if (started) collisions.push([handles.get(a), handles.get(b)]);
	});
	for (const [a, b] of collisions) {
		if (!a?.alive || !b?.alive) continue;
		const shot = a.type === "shot" ? a : b.type === "shot" ? b : null;
		const target = shot === a ? b : a;
		if (shot && target.type !== "shot") {
			remove(shot);
			damage(target, shot.special ? 2 : 1);
		}
	}
	G.comboTimer = Math.max(0, G.comboTimer - dt);
	if (!G.comboTimer) G.combo = 0;
	net.lastScore = G.score;
	net.tick(dt, inputs[net.localSeat] || {}, snapshot());
}
function snapshot() {
	return {
		g: { ...G, cooldowns: undefined },
		a: inputs.map((i) => i.angle),
		e: [...entities.values()].map((e) => [
			e.id,
			e.type,
			+e.x.toFixed(2),
			+e.y.toFixed(2),
			e.hp || 0,
			e.side || 1,
		]),
		screen,
		mode: "online",
		t: +simTime.toFixed(2),
	};
}
function applySnapshot(s) {
	if (!s?.g || !Array.isArray(s.e) || s.e.length > 170) return;
	G = { ...G, ...s.g };
	simTime = s.t || 0;
	mode = "online";
	if (s.screen === "results") {
		finish(!!G.won, G.won ? "HARBOR SECURED" : "PIER OVERRUN", true);
		return;
	}
	if (
		!["playing", "pause", "dev", "settings", "about", "howto"].includes(screen)
	)
		setScreen("playing");
	coast.guns.forEach((g, i) => {
		g.root.visible = true;
		g.pivot.rotation.z = s.a?.[i] ?? g.angle;
	});
	const seen = new Set();
	for (const d of s.e) {
		const [id, type, x, y, , side] = d;
		seen.add(id);
		let r = remoteViews.get(id);
		if (!r) {
			r =
				type === "shot" ? coast.projectile(x, y) : coast.makeTarget(type, side);
			remoteViews.set(id, r);
			if (type === "shot") sound.shot();
		}
		r.position.set(x, y, 0);
		r.userData.mixer?.update(0.1);
	}
	for (const [id, r] of remoteViews) {
		if (!seen.has(id)) {
			if (r.position.y > 1.5)
				coast.burst(r.position.x, r.position.y, "#edb656", 0.6);
			coast.remove(r);
			remoteViews.delete(id);
		}
	}
	updateHUD();
}
function updateHUD() {
	if (!G.energy) return;
	$("score").textContent = String(G.score || 0).padStart(6, "0");
	$("operation").textContent = "0" + (G.wave + 1) + " / 03";
	$("mission").textContent = stageNames[G.wave];
	$("objective").textContent =
		G.wave === 2
			? "FLAGSHIP " + Math.max(0, G.bossHP) + " / " + G.bossMax
			: (G.waveKills || 0) +
				" / " +
				(G.wave === 0 ? "8 AIRCRAFT" : "10 TARGETS");
	$("health").textContent =
		"▰".repeat(Math.max(0, Math.ceil(G.health))) +
		"▱".repeat(Math.max(0, G.maxHealth - Math.ceil(G.health)));
	$("health").setAttribute("aria-label", G.health + " hull points");
	const energy = G.energy[playerSeat()] ?? 0;
	$("energyFill").style.width = energy + "%";
	$("salvoText").textContent =
		energy >= 99.8
			? "BROADSIDE READY"
			: "BROADSIDE " + Math.floor(energy) + "%";
	$("salvoTouch").classList.toggle("ready", energy >= 99.8);
	$("salvoTouch").textContent = energy >= 99.8 ? "SALVO" : "CHARGING";
	$("combo").textContent =
		G.combo >= 2
			? G.combo + " CHAIN · " + Math.min(5, 1 + Math.floor(G.combo / 4)) + "×"
			: "";
	$("wind").textContent =
		(wind() > 0 ? "→" : "←") + " " + Math.abs(wind()).toFixed(1);
	$("bossTrack").hidden = G.wave !== 2;
	$("bossFill").style.width = Math.max(0, (G.bossHP / G.bossMax) * 100) + "%";
	$("coopTag").textContent =
		mode === "coop"
			? "TWO GUNNERS"
			: mode === "online"
				? "CONNECTED CO-OP"
				: "PORT BATTERY";
	$("sync").hidden = !net.active || net.running;
	if (!net.running)
		$("sync").textContent = "GUNNERS READY · " + Math.ceil(net.countdown);
}
function pause() {
	if (screen === "playing" && mode !== "demo") {
		keys.clear();
		salvoLatch = [0, 0];
		if (mode === "online" && net.isGuest)
			net.tick(
				0.11,
				{ ...inputs[playerSeat()], fire: false, salvo: false },
				null,
			);
		pointerDown = false;
		touchActive = false;
		inputs.forEach((i) => {
			i.fire = false;
			i.salvo = false;
		});
		setScreen("pause");
		sound.mute(true);
	} else if (["pause", "dev"].includes(screen)) {
		setScreen("playing");
		sound.mute(false);
	}
}
function focusables() {
	return [
		...document.querySelectorAll(
			".panel:not([hidden]) button,.panel:not([hidden]) input,.panel:not([hidden]) select,.panel:not([hidden]) textarea",
		),
	].filter((e) => !e.disabled && e.offsetParent !== null);
}
function navigate(d) {
	const a = focusables();
	if (!a.length) return;
	const current = a.indexOf(document.activeElement);
	navIndex = (Math.max(0, current) + d + a.length) % a.length;
	a[navIndex].focus({ preventScroll: true });
	a[navIndex].scrollIntoView({ block: "nearest" });
}
function adjustFocused(d) {
	const e = document.activeElement;
	if (e?.type === "range") {
		e.value = clamp(
			Number(e.value) + d * Number(e.step || 1),
			Number(e.min),
			Number(e.max),
		);
		e.dispatchEvent(new Event("input"));
	} else if (e?.tagName === "SELECT") {
		e.selectedIndex =
			(e.selectedIndex + d + e.options.length) % e.options.length;
		e.dispatchEvent(new Event("change"));
	} else navigate(d);
}
function menuBack() {
	if (["pause", "dev"].includes(screen)) {
		if (screen === "dev") setScreen("pause");
		else pause();
	} else if (screen === "settings") {
		setScreen(previous === "pause" ? "pause" : "title");
		sound.mute(previous === "pause");
	} else if (screen === "about" || screen === "howto")
		setScreen(previous === "pause" ? "pause" : "title");
	else if (screen === "online") {
		net.leave();
		title();
	} else if (screen === "results") title();
}
function pollInputs(dt) {
	const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	for (let n = 0; n < Math.min(2, pads.length); n++) {
		const p = pads[n],
			prev = padPrevious[n] || [],
			pressed = (i) => !!p.buttons[i]?.pressed,
			edge = (i) => pressed(i) && !prev[i];
		const axis = p.axes || [];
		const any =
			p.buttons.some((b) => b.pressed) || axis.some((v) => Math.abs(v) > 0.22);
		if (any) {
			sound.unlock();
			const exit = activity("gamepad");
			if (exit) {
				padPrevious[n] = p.buttons.map((b) => b.pressed);
				continue;
			}
		}
		if (screen !== "playing" && Math.abs(axis[3] || 0) > 0.2) {
			const scroll = document.querySelector(".panel:not([hidden]) .menuInner");
			if (scroll) scroll.scrollTop += (axis[3] || 0) * dt * 700;
		}
		if (screen === "playing") {
			const seat = mode === "online" ? net.localSeat : n;
			if (seat >= 0 && seat < 2) {
				if (Math.hypot(axis[0] || 0, axis[1] || 0) > 0.25)
					inputs[seat].angle = clamp(
						Math.atan2(Math.max(0, -(axis[1] || 0)), axis[0] || 0),
						0.12,
						Math.PI - 0.12,
					);
				inputs[seat].fire = pressed(7) || pressed(0);
				inputs[seat].salvo = pressed(2);
				if (edge(2) && net.isGuest && mode === "online")
					salvoLatch[seat] = 0.35;
			}
			if (edge(9)) pause();
		} else if (any && performance.now() > navAt) {
			if (edge(0)) {
				document.activeElement?.click();
				navAt = performance.now() + 180;
			} else if (edge(1) || edge(9)) {
				menuBack();
				navAt = performance.now() + 180;
			} else if (pressed(13) || (axis[1] || 0) > 0.55) {
				navigate(1);
				navAt = performance.now() + 220;
			} else if (pressed(12) || (axis[1] || 0) < -0.55) {
				navigate(-1);
				navAt = performance.now() + 220;
			} else if (pressed(15) || (axis[0] || 0) > 0.55) {
				adjustFocused(1);
				navAt = performance.now() + 180;
			} else if (pressed(14) || (axis[0] || 0) < -0.55) {
				adjustFocused(-1);
				navAt = performance.now() + 180;
			}
		}
		padPrevious[n] = p.buttons.map((b) => b.pressed);
	}
	if (screen !== "playing") return;
	const seat = mode === "online" ? net.localSeat : 0;
	if (seat < 0) return;
	if (manualInput) {
		Object.assign(inputs[seat], manualInput);
		return;
	}
	if (inputMode === "keyboard") {
		if (mousePoint) {
			const point = coast.pointer(mousePoint.x, mousePoint.y);
			inputs[seat].angle = aimAt(seat, point.x, Math.max(3.5, point.y));
		}
		if (keys.has("KeyA") || keys.has("ArrowLeft")) {
			mousePoint = null;
			inputs[seat].angle = clamp(
				inputs[seat].angle + dt * 1.6,
				0.12,
				Math.PI - 0.12,
			);
		}
		if (keys.has("KeyD") || keys.has("ArrowRight")) {
			mousePoint = null;
			inputs[seat].angle = clamp(
				inputs[seat].angle - dt * 1.6,
				0.12,
				Math.PI - 0.12,
			);
		}
		inputs[seat].fire = pointerDown || keys.has("Space");
		inputs[seat].salvo = keys.has("KeyE");
	}
	if (inputMode === "touch") {
		inputs[seat].fire = touchActive;
		if (touchActive) {
			if (touchAim) {
				const v = coast.pointer(touchAim.x, touchAim.y);
				inputs[seat].angle = aimAt(seat, v.x, Math.max(4, v.y));
			}
			if (prefs.assist) {
				const ai = autoInput(seat);
				inputs[seat].angle = ai.angle;
			}
		}
	}
	if (mode === "coop" && !pads[1]) {
		if (keys.has("KeyJ"))
			inputs[1].angle = clamp(inputs[1].angle + dt * 1.6, 0.12, Math.PI - 0.12);
		if (keys.has("KeyL"))
			inputs[1].angle = clamp(inputs[1].angle - dt * 1.6, 0.12, Math.PI - 0.12);
		inputs[1].fire = keys.has("Enter");
		inputs[1].salvo = keys.has("KeyU");
	}
}
function frame(dt, render = true) {
	if (!ready) return;
	dt = Math.max(0, Math.min(dt, 0.1));
	idle += dt;
	if (screen === "title" && idle >= 10 && !net.active) start("demo");
	pollInputs(dt);
	if (screen === "playing") {
		stepClock += dt;
		while (stepClock + 1e-9 >= 1 / 60 && screen === "playing") {
			stepClock = Math.max(0, stepClock - 1 / 60);
			step(1 / 60);
		}
		demoTime += dt;
		if (mode === "demo" && demoTime > 110) start("demo");
	} else if (
		["title", "settings", "about", "howto", "online"].includes(screen)
	) {
		for (const e of entities.values()) {
			e.age += dt;
			e.root.userData.mixer?.update(dt);
			e.root.position.y = e.baseY + Math.sin(e.age) * 0.16;
		}
	}
	if (screen === "playing" || screen === "title") coast.update(dt);
	else coast.update(0);
	const seat = playerSeat();
	coast.reticle.visible =
		screen === "playing" && inputMode === "keyboard" && !!mousePoint;
	if (coast.reticle.visible) {
		const p = coast.pointer(mousePoint.x, mousePoint.y);
		coast.reticle.position.set(p.x, p.y, 0.5);
	}
	coast.drawAim(
		coast.guns[seat].x,
		3.2,
		inputs[seat]?.angle || 1.1,
		tuning.speed,
		tuning.gravity,
		wind(),
		screen === "playing" && mode !== "demo" && inputMode !== "touch",
	);
	shake = Math.max(0, shake - dt * 1.8);
	toastTime -= dt;
	if (toastTime <= 0) $("toast").classList.remove("show");
	bannerTime -= dt;
	if (bannerTime <= 0) $("banner").classList.remove("show");
	sound.update(dt, screen === "playing" && mode !== "demo", G.wave / 2 || 0);
	if (screen === "playing") updateHUD();
	if (render) coast.render(shake);
}
function bindUI() {
	$("start").onclick = () => {
		sound.unlock();
		start("solo");
	};
	$("coop").onclick = () => {
		sound.unlock();
		start("coop");
	};
	$("online").onclick = () => {
		previous = "title";
		setScreen("online");
	};
	$("settings").onclick = () => {
		previous = "title";
		setScreen("settings");
	};
	$("about").onclick = () => {
		previous = "title";
		setScreen("about");
	};
	$("howto").onclick = () => {
		previous = "title";
		setScreen("howto");
	};
	$("pause").onclick = pause;
	$("resume").onclick = pause;
	$("dev").onclick = () => setScreen("dev");
	$("pauseSettings").onclick = () => {
		previous = "pause";
		setScreen("settings");
	};
	$("pauseAbout").onclick = () => {
		previous = "pause";
		setScreen("about");
	};
	$("quit").onclick = () => {
		net.leave();
		title();
	};
	$("retry").onclick = () => start(mode === "online" ? "solo" : mode);
	$("resultMenu").onclick = () => {
		net.leave();
		title();
	};
	for (const e of document.querySelectorAll("[data-back]"))
		e.onclick = menuBack;
	$("music").value = prefs.music * 100;
	$("musicOut").textContent = Math.round(prefs.music * 100) + "%";
	$("music").oninput = (e) => {
		prefs.music = Number(e.target.value) / 100;
		sound.setMusic(prefs.music);
		$("musicOut").textContent = e.target.value + "%";
		save();
	};
	$("sfx").value = prefs.sfx * 100;
	$("sfxOut").textContent = Math.round(prefs.sfx * 100) + "%";
	$("sfx").oninput = (e) => {
		prefs.sfx = Number(e.target.value) / 100;
		sound.setSfx(prefs.sfx);
		$("sfxOut").textContent = e.target.value + "%";
		sound.shot();
		save();
	};
	$("glyph").value = prefs.glyph;
	$("glyph").onchange = (e) => {
		prefs.glyph = e.target.value;
		save();
		updatePrompts();
	};
	$("shake").checked = prefs.shake;
	$("shake").onchange = (e) => {
		prefs.shake = e.target.checked;
		save();
	};
	$("assist").checked = prefs.assist;
	$("assist").onchange = (e) => {
		prefs.assist = e.target.checked;
		save();
	};
	const names = {
		speed: "Shell velocity",
		gravity: "Gravity",
		cooldown: "Shot interval",
		enemySpeed: "Target speed",
		spawn: "Spawn interval",
		damage: "Incoming damage",
		wind: "Wind strength",
		assist: "Hit forgiveness",
	};
	const ranges = {
		speed: [20, 40, 0.5],
		gravity: [6, 20, 0.5],
		cooldown: [0.08, 0.65, 0.01],
		enemySpeed: [0.3, 2.5, 0.1],
		spawn: [0.5, 3, 0.05],
		damage: [0, 2, 1],
		wind: [0, 3, 0.1],
		assist: [0, 2, 0.05],
	};
	for (const k of Object.keys(defaults)) {
		const label = document.createElement("label");
		label.className = "sliderRow";
		label.innerHTML = `<span>${names[k]}</span><input id="tune-${k}" type="range" min="${ranges[k][0]}" max="${ranges[k][1]}" step="${ranges[k][2]}" value="${defaults[k]}"><output id="out-${k}">${defaults[k]}</output>`;
		$("sliders").append(label);
		$("tune-" + k).oninput = (e) => {
			tuning[k] = Number(e.target.value);
			$("out-" + k).textContent = e.target.value;
		};
	}
	$("resetTuning").onclick = () => {
		tuning = { ...defaults };
		for (const k in defaults) {
			$("tune-" + k).value = defaults[k];
			$("out-" + k).textContent = defaults[k];
		}
		toast("DEFAULT BALANCE RESTORED");
	};
	$("devHeal").onclick = () => {
		G.health = G.maxHealth;
		G.energy = [100, 100];
		updateHUD();
		toast("BATTERY REPAIRED");
	};
	$("devWave").onclick = () => {
		if (G.wave < 2) nextWave();
		else {
			const b = [...entities.values()].find((e) => e.type === "boss");
			if (b) damage(b, 100);
		}
		updateHUD();
	};
	$("devAI").onclick = () => {
		autoplay = !autoplay;
		$("devAI").textContent = "AUTOPILOT " + (autoplay ? "ON" : "OFF");
	};
	$("salvoTouch").onclick = (e) => {
		e.stopPropagation();
		requestSalvo();
	};
	const busy = async (fn) => {
		try {
			$("networkStatus").textContent = "ESTABLISHING RADIO LINK…";
			await fn();
		} catch (e) {
			$("networkStatus").textContent = e.message || "CONNECTION FAILED";
		}
	};
	$("hostLocal").onclick = () =>
		busy(async () => {
			$("roomCode").value = net.hostLocal();
		});
	$("joinLocal").onclick = () =>
		busy(async () => net.joinLocal($("roomCode").value));
	$("createOffer").onclick = () =>
		busy(async () => {
			$("signalOut").value = await net.hostRoom();
			$("networkStatus").textContent =
				"Send your invitation. Paste the other gunner’s reply below, then Connect.";
		});
	$("joinOffer").onclick = () =>
		busy(async () => {
			$("signalOut").value = await net.joinRoom($("signalIn").value);
			$("networkStatus").textContent =
				"Send this reply to the host. Your gun will join automatically.";
		});
	$("acceptAnswer").onclick = () =>
		busy(async () => {
			await net.acceptAnswer($("signalIn").value);
		});
	$("copySignal").onclick = async () => {
		const e = $("signalOut");
		e.select();
		try {
			await navigator.clipboard.writeText(e.value);
			$("networkStatus").textContent = "RADIO CODE COPIED";
		} catch {
			$("networkStatus").textContent = "Code selected. Press Ctrl+C to copy.";
		}
	};
	document.addEventListener("pointerover", (e) => {
		if (e.pointerType !== "touch" && e.target.closest("button"))
			e.target.closest("button").focus({ preventScroll: true });
	});
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch") return;
		activity("keyboard");
		if (screen === "playing") mousePoint = { x: e.clientX, y: e.clientY };
	});
	document.addEventListener(
		"pointerdown",
		(e) => {
			if (activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}
			sound.unlock();
			if (
				screen !== "playing" ||
				e.target.closest("button,input,select,textarea,label")
			)
				return;
			if (e.pointerType === "touch") {
				touchActive = true;
				touchPointerId = e.pointerId;
				touchOrigin = { x: e.clientX, y: e.clientY };
				touchAim = { ...touchOrigin };
			} else if (e.button === 0) {
				pointerDown = true;
				mousePoint = { x: e.clientX, y: e.clientY };
			}
		},
		true,
	);
	document.addEventListener("pointermove", (e) => {
		if (
			e.pointerType === "touch" &&
			touchActive &&
			e.pointerId === touchPointerId
		) {
			touchAim = { x: e.clientX, y: e.clientY };
		}
	});
	document.addEventListener("pointerup", (e) => {
		if (e.pointerType === "touch") {
			if (e.pointerId === touchPointerId) {
				touchActive = false;
				touchPointerId = null;
			}
		} else pointerDown = false;
	});
	document.addEventListener("pointercancel", () => {
		touchActive = false;
		pointerDown = false;
	});
	document.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		if (screen === "playing") requestSalvo();
	});
	document.addEventListener("keydown", (e) => {
		if (
			e.target.matches("input,textarea,select") &&
			!["Escape"].includes(e.code)
		)
			return;
		if (activity("keyboard")) {
			e.preventDefault();
			return;
		}
		sound.unlock();
		if (
			[
				"Space",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Enter",
			].includes(e.code)
		)
			e.preventDefault();
		keys.add(e.code);
		if (
			screen === "playing" &&
			!e.repeat &&
			e.code === "KeyE" &&
			net.isGuest &&
			mode === "online"
		)
			salvoLatch[playerSeat()] = 0.35;
		if (e.repeat) return;
		if (e.code === "Escape") {
			if (screen === "playing") pause();
			else menuBack();
		} else if (screen !== "playing") {
			if (e.code === "ArrowDown") navigate(1);
			if (e.code === "ArrowUp") navigate(-1);
			if (e.code === "ArrowLeft") adjustFocused(-1);
			if (e.code === "ArrowRight") adjustFocused(1);
			if (e.code === "Enter" || e.code === "Space") {
				const a = focusables();
				if (!a.includes(document.activeElement)) a[0]?.focus();
				document.activeElement?.click();
			}
		}
	});
	document.addEventListener("keyup", (e) => keys.delete(e.code));
	window.addEventListener("blur", () => {
		keys.clear();
		pointerDown = false;
		touchActive = false;
		if (screen === "playing" && mode !== "demo" && !net.online) pause();
	});
	window.addEventListener("resize", () => coast.resize());
}
async function init() {
	try {
		$("loadText").textContent = "PREPARING THE COAST…";
		await RAPIER.init();
		coast = new Coast($("game"));
		await coast.init();
		resetPhysics();
		bindUI();
		updatePrompts();
		$("backend").textContent =
			coast.backend + " · THREE.JS r180 · RAPIER 0.19.3";
		await net.init();
		ready = true;
		$("loading").hidden = true;
		title();
		if (net.active) {
			clearWorld();
			$("start").disabled = true;
			$("networkStatus").textContent = "AI HUB · WAITING FOR THE WATCH";
			setScreen("online");
		}
		net.ready();
		window.__Sound = Sound;
		window.__game = {
			state: () => ({
				ready,
				screen,
				mode,
				wave: G.wave || 0,
				score: G.score || 0,
				health: G.health || 0,
				energy: G.energy,
				targets: [...entities.values()].filter((e) => e.type !== "shot").length,
				shots: [...entities.values()].filter((e) => e.type === "shot").length,
				shotsFired: G.shotsFired || 0,
				hits: G.hits || 0,
				kills: G.kills || 0,
				physicsSteps,
				time: G.time || 0,
				musicVolume: sound.stats.musicVolume,
				backend: coast.backend,
				inputMode,
				glyph: prefs.glyph,
				tuning: { ...tuning },
				won: G.won || false,
				autoplay,
				angles: inputs.map((i) => i.angle),
				net: {
					host: net.isHost,
					guest: net.isGuest,
					online: net.online,
					stats: net.stats,
				},
			}),
			start,
			setInput: (i) => (manualInput = i),
			setAutoplay: (v) => {
				autoplay = v;
			},
			advance: (seconds, frameDelta = 1 / 60) => {
				frameDelta = clamp(frameDelta, 1 / 240, 0.1);
				for (let t = 0; t < seconds; t += frameDelta)
					frame(Math.min(frameDelta, seconds - t), false);
				coast.render(0);
			},
			dev: (values) => {
				for (const [k, v] of Object.entries(values)) {
					if (k === "health") {
						G.health = v;
						if (v <= 0) finish(false);
					} else if (k === "wave") {
						while (G.wave < v && G.wave < 2) nextWave();
					} else if (k in tuning) tuning[k] = v;
				}
			},
			goto: setScreen,
			damage: hurt,
			sound,
			net,
			snapshot,
			entities: () =>
				[...entities.values()].map((e) => ({
					type: e.type,
					x: e.x,
					y: e.y,
					hp: e.hp,
				})),
			pause,
		};
		let last = performance.now();
		const loop = (now) => {
			const dt = (now - last) / 1000;
			last = now;
			frame(dt);
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
	} catch (e) {
		console.error(e);
		$("loadText").textContent = "THE RADIO LOST ITS SIGNAL";
		$("loadDetail").textContent =
			e.message +
			" · Check the connection, then reload. CDN libraries require internet on first load.";
		net.fail(e.message);
	}
}
init();
