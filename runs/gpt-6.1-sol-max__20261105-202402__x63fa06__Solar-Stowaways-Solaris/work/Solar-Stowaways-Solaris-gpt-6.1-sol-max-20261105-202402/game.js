import RAPIER from "@dimforge/rapier3d-compat";
import { AudioEngine } from "./audio.js";
import { WingLink } from "./network.js";
import { SpaceView, T } from "./visual.js";

const $ = (id) => document.getElementById(id),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const SETTINGS = {
	music: 0.1,
	sfx: 0.65,
	glyphs: "ps",
	assist: 0.65,
	motion: true,
};
const DEFAULTS = {
	speed: 25,
	steering: 20,
	enemyHealth: 1,
	enemyDamage: 1,
	weaponPower: 1,
	cooling: 0.26,
	fuelBurn: 0.12,
	shieldRegen: 3,
	tractorRange: 65,
};
const SECTORS = [
	{
		name: "Breakwater",
		grid: "B · 04",
		role: "PATROL",
		symbol: "⌁",
		title: "Clear the patrol",
		objective:
			"Break the Corsair picket. Eight interceptors stand between us and the distress signal.",
		hint: "Fire in bursts. Pulse clears nearby fire.",
		cost: 0,
		x: 13,
		y: 57,
		color: "coral",
	},
	{
		name: "Cinder",
		grid: "C · 03",
		role: "RESCUE",
		symbol: "◇",
		title: "Bring them aboard",
		objective:
			"Three pilots are stranded above Cinder. Match their position and hold the tractor beam to recover them.",
		hint: "Close on each beacon. Hold tractor inside 65 km.",
		cost: 6,
		x: 34,
		y: 30,
		color: "teal",
	},
	{
		name: "Quiet Anchorage",
		grid: "D · 05",
		role: "SERVICE",
		symbol: "⊕",
		title: "Make a quiet landing",
		objective:
			"Our last friendly station. Align with the service ring and hold tractor to dock, repair, and refuel.",
		hint: "Center the ring. Hold tractor until service completes.",
		cost: 3,
		x: 53,
		y: 67,
		color: "teal",
	},
	{
		name: "Red Channel",
		grid: "E · 03",
		role: "NAVIGATION",
		symbol: "◎",
		title: "Thread the channel",
		objective:
			"The short way through is mined. Fly through five navigation gates. Shoot mines or use a pulse to clear the lane.",
		hint: "Steer through each turquoise ring. Missed gates return.",
		cost: 8,
		x: 72,
		y: 29,
		color: "coral",
	},
	{
		name: "Last Light",
		grid: "F · 04",
		role: "CARRIER",
		symbol: "✣",
		title: "Put the lights out",
		objective:
			"The Corsair carrier blocks the jump home. Break its three shield relays. Then destroy the exposed reactor.",
		hint: "Three turquoise relays first. Watch for the lane cannon.",
		cost: 10,
		x: 90,
		y: 54,
		color: "coral",
	},
];
const damageable = new Set([
	"scout",
	"ace",
	"bomber",
	"mine",
	"relay",
	"core",
	"rock",
]);
const enemies = new Set(["scout", "ace", "bomber"]);
const storage = {
	get(k) {
		try {
			return JSON.parse(localStorage.getItem(k));
		} catch {
			return null;
		}
	},
	set(k, v) {
		try {
			localStorage.setItem(k, JSON.stringify(v));
		} catch {}
	},
	remove(k) {
		try {
			localStorage.removeItem(k);
		} catch {}
	},
};
const storedSettings = storage.get("stowaways.settings");
const settings = { ...SETTINGS, ...storedSettings };
settings.music = clamp(Number(settings.music) || 0, 0, 1);
settings.sfx = clamp(Number(settings.sfx) || 0, 0, 1);
const audio = new AudioEngine(settings),
	view = new SpaceView($("space"), $("instruments"));
const hub = window.AIHub;
const S = {
	screen: "loading",
	returnTo: "title",
	sector: 0,
	selected: 0,
	elapsed: 0,
	totalTime: 0,
	score: 0,
	kills: 0,
	rescued: 0,
	gates: 0,
	cleared: [],
	player: { x: 0, y: 0, shield: 100, hull: 100, fuel: 65 },
	aim: { x: 0, y: 0 },
	moveX: 0,
	moveY: 0,
	flow: 25,
	boost: false,
	heat: 0,
	overheat: false,
	pulses: 2,
	combo: 1,
	comboTimer: 0,
	shotCooldown: 0,
	pulseCooldown: 0,
	lastHit: 100,
	phase: "flight",
	entities: [],
	shots: [],
	debris: [],
	attract: false,
	autopilot: false,
	god: false,
	touch: false,
	tractoring: false,
	tractorProgress: 0,
	dockProgress: 0,
	missionKills: 0,
	missionRescued: 0,
	missionGates: 0,
	warning: null,
	beamClock: 0,
	sectorHistory: [],
	runSeed: 1986,
	hubStarted: false,
	hubEnded: false,
	hubResult: false,
	onlineResult: null,
	metrics: {
		shots: 0,
		hits: 0,
		damage: 0,
		tractors: 0,
		pulses: 0,
		boostSeconds: 0,
		collisionQueries: 0,
		steps: 0,
		renderFrames: 0,
	},
};
const dev = { ...DEFAULTS };
const input = {
	keys: new Set(),
	mouseFire: false,
	mouseTractor: false,
	aimX: 0,
	aimY: 0,
	touchLeft: null,
	touchRight: null,
	touchX: 0,
	touchY: 0,
	touchTractor: false,
	last: "keyboard",
	padPrev: [],
	padAxes: [0, 0, 0, 0],
	pad: null,
	navAt: 0,
};
let world,
	playerBody,
	playerCollider,
	playerShape,
	idCounter = 1,
	rngState = 1986,
	lastActivity = performance.now(),
	focusIndex = 0,
	radioUntil = 0,
	noticeUntil = 0,
	ignoreClickUntil = 0,
	uiClock = 0,
	hubClock = 0,
	netClock = 0,
	clearTimer = 0,
	schedules = [],
	ready = false,
	manual = new URLSearchParams(location.search).has("test"),
	wingGhosts = new Map(),
	networkCode = "",
	networkBusy = false;
function rnd() {
	rngState ^= rngState << 13;
	rngState ^= rngState >>> 17;
	rngState ^= rngState << 5;
	return (rngState >>> 0) / 4294967296;
}
function radio(who, text) {
	$("radioWho").textContent = who;
	$("radioText").textContent = text;
	radioUntil = S.totalTime + 7;
	$("radio").classList.add("visible");
	audio.voice(text.length);
}
function notice(text, time = 2.6) {
	$("notice").textContent = text;
	$("notice").classList.add("show");
	noticeUntil = performance.now() + time * 1000;
}
function setInputMode(mode) {
	if (input.last === mode) return;
	input.last = mode;
	S.touch = mode === "touch";
	document.body.classList.toggle("touch-mode", S.touch);
	updatePrompts();
}
function activity(mode) {
	lastActivity = performance.now();
	if (mode) setInputMode(mode);
	if (S.attract) {
		ignoreClickUntil = performance.now() + 300;
		S.attract = false;
		resetRun();
		showTitle();
		return true;
	}
	return false;
}
function promptFor(which) {
	const ps = settings.glyphs === "ps";
	const p = {
		fire: "R2",
		tractor: "L2",
		pulse: "L1",
		boost: "R1",
		chart: ps ? "△" : "Y",
		confirm: ps ? "✕" : "A",
		back: ps ? "○" : "B",
		pause: ps ? "OPTIONS" : "MENU",
		move: "L",
		aim: "R",
	};
	const k = {
		fire: "CLICK / SPACE",
		tractor: "E / RMB",
		pulse: "Q",
		boost: "SHIFT",
		chart: "TAB",
		confirm: "ENTER",
		back: "ESC",
		pause: "ESC",
		move: "WASD",
		aim: "MOUSE",
	};
	return (input.last === "pad" ? p : k)[which];
}
function updatePrompts() {
	if (!ready) return;
	$("controlHints").innerHTML = ["fire", "tractor", "pulse", "boost", "chart"]
		.map(
			(k) =>
				`<span><b>${promptFor(k)}</b>${k.toUpperCase()}${k === "pulse" ? " · " + S.pulses : ""}</span>`,
		)
		.join("");
	for (const el of document.querySelectorAll("[data-prompt]"))
		el.textContent = promptFor(el.dataset.prompt);
}
function resetInput() {
	input.keys.clear();
	input.mouseFire = false;
	input.mouseTractor = false;
	input.touchX = 0;
	input.touchY = 0;
	input.touchTractor = false;
	input.touchLeft = null;
	input.touchRight = null;
}
function resetPhysics() {
	world?.free();
	world = new RAPIER.World({ x: 0, y: 0, z: 0 });
	playerBody = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 2),
	);
	playerCollider = world.createCollider(
		RAPIER.ColliderDesc.ball(1.25).setSensor(true),
		playerBody,
	);
	playerShape = new RAPIER.Ball(1.25);
}
function resetRun(seed = 1986) {
	S.score = 0;
	S.kills = 0;
	S.rescued = 0;
	S.gates = 0;
	S.cleared = [];
	S.totalTime = 0;
	S.sectorHistory = [];
	S.player = { x: 0, y: 0, shield: 100, hull: 100, fuel: 65 };
	S.pulses = 2;
	S.combo = 1;
	S.comboTimer = 0;
	S.runSeed = seed;
	S.hubResult = false;
	S.onlineResult = null;
	S.phase = "flight";
	S.sector = 0;
	S.selected = 0;
	S.autopilot = false;
	S.god = false;
	for (const k in S.metrics) S.metrics[k] = 0;
	clearEntities();
	view.reset(0);
	resetInput();
}
function clearEntities() {
	for (const e of S.entities) view.remove(e.mesh);
	for (const e of S.shots) view.remove(e.mesh);
	for (const e of S.debris) view.remove(e.mesh);
	S.entities = [];
	S.shots = [];
	S.debris = [];
	wingGhosts.forEach((g) => {
		view.remove(g.mesh);
	});
	wingGhosts.clear();
	resetPhysics();
}
function saveCheckpoint() {
	if (hub.active || S.attract || link.connected) return;
	storage.set("stowaways.checkpoint", {
		version: 1,
		cleared: S.cleared,
		score: S.score,
		kills: S.kills,
		rescued: S.rescued,
		gates: S.gates,
		totalTime: S.totalTime,
		player: S.player,
		pulses: S.pulses,
		runSeed: S.runSeed,
		sectorHistory: S.sectorHistory,
		metrics: S.metrics,
	});
}
function resumeCheckpoint() {
	const c = storage.get("stowaways.checkpoint");
	if (!c || c.version !== 1) return;
	resetRun(c.runSeed || 1986);
	for (const key of [
		"cleared",
		"score",
		"kills",
		"rescued",
		"gates",
		"totalTime",
		"pulses",
		"sectorHistory",
	])
		if (c[key] !== undefined) S[key] = c[key];
	S.player = { ...S.player, ...c.player, x: 0, y: 0 };
	S.metrics = { ...S.metrics, ...c.metrics };
	S.selected = Math.min(4, S.cleared.length);
	showChart();
}
function launchSector(i) {
	clearEntities();
	S.sector = i;
	S.selected = i;
	S.elapsed = 0;
	S.missionKills = 0;
	S.missionRescued = 0;
	S.missionGates = 0;
	S.dockProgress = 0;
	S.tractorProgress = 0;
	S.heat = 0;
	S.overheat = false;
	S.phase = "flight";
	S.lastHit = 10;
	S.shotCooldown = 0;
	S.player.x = 0;
	S.player.y = 0;
	S.player.fuel = Math.max(12, S.player.fuel - SECTORS[i].cost);
	S.beamClock = 0;
	S.warning = null;
	S.chartInFlight = false;
	S.tractoring = false;
	S.aim = { x: 0, y: 0 };
	input.aimX = 0;
	input.aimY = 0;
	rngState = (S.runSeed + i * 71719 + 41) >>> 0;
	schedules = [];
	view.reset(i);
	S.screen = "playing";
	$("menu").innerHTML = "";
	$("hud").hidden = false;
	$("attractBanner").hidden = !S.attract;
	resetInput();
	S.sectorHistory.push(i);
	if (i === 0) {
		for (let n = 0; n < 8; n++)
			schedules.push({
				at: n * 2.3,
				fn: () => spawnEnemy(n === 5 ? "ace" : n === 7 ? "bomber" : "scout"),
			});
		radio("FRONTIER CONTROL", "Breakwater is closed. Eight Corsairs. Open it.");
	}
	if (i === 1) {
		for (let n = 0; n < 3; n++)
			schedules.push({
				at: 1 + n * 8,
				fn: () =>
					spawn("pod", [-10, 11, 0][n], [-2, 5, -6][n], -105, { pilot: n }),
			});
		for (let n = 0; n < 7; n++)
			schedules.push({
				at: 2 + n * 4,
				fn: () => spawnEnemy(n % 3 === 2 ? "bomber" : "scout"),
			});
		radio(
			"CADET / KETT",
			"Three beacons still transmitting. We knew someone would come.",
		);
	}
	if (i === 2) {
		spawn("station", 0, 0, -112);
		radio(
			"ANCHORAGE / TOWER",
			"The ring is yours. Center up. Hold the tractor. We will do the rest.",
		);
	}
	if (i === 3) {
		const lanes = [
			[-10, 4],
			[10, -4],
			[-8, -6],
			[10, 6],
			[0, 0],
		];
		for (let n = 0; n < 5; n++)
			schedules.push({
				at: n * 5,
				fn: () => spawn("gate", ...lanes[n], -145, { index: n }),
			});
		for (let n = 0; n < 14; n++)
			schedules.push({
				at: n * 1.8,
				fn: () => spawn("mine", (rnd() - 0.5) * 34, (rnd() - 0.5) * 21, -150),
			});
		radio(
			"FRONTIER CONTROL",
			"Red Channel. Five beacons mark the safe line. Stay inside them.",
		);
	}
	if (i === 4) {
		const boss = spawn("boss", 0, 1, -117);
		for (let n = 0; n < 3; n++)
			spawn("relay", [-13, 13, 0][n], [5, 5, -8][n], -100, {
				boss: boss.id,
				node: n,
			});
		spawn("core", 0, 1, -96, { boss: boss.id, locked: true });
		for (let n = 0; n < 30; n++)
			schedules.push({
				at: 8 + n * 8,
				fn: () => spawnEnemy(n % 3 === 0 ? "ace" : "scout"),
			});
		radio(
			"FRONTIER CONTROL",
			"Carrier ahead. Three shield relays. Break those, then the heart.",
		);
	}
	updateHUD();
	audio.warp();
}
function spawn(type, x, y, z, extra = {}) {
	const hp =
		type === "core"
			? 120
			: type === "relay"
				? 12
				: type === "bomber"
					? 6
					: type === "ace"
						? 5
						: type === "mine"
							? 1
							: 3;
	const e = {
		id: idCounter++,
		type,
		x,
		y,
		z,
		baseX: x,
		baseY: y,
		age: 0,
		hp: hp * dev.enemyHealth,
		maxHp: hp * dev.enemyHealth,
		alive: true,
		phase: rnd() * Math.PI * 2,
		fireIn: 2 + rnd() * 3,
		warn: 0,
		pull: 0,
		passed: false,
		mesh: view.create(type),
		...extra,
	};
	e.mesh.position.set(x, y, z);
	if (damageable.has(type) || type === "pod") {
		const radius =
			type === "core"
				? 4.6
				: type === "relay"
					? 2.5
					: type === "bomber"
						? 3
						: type === "rock"
							? 2.5
							: type === "mine"
								? 1.4
								: 2.2;
		e.radius = radius;
		e.body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z),
		);
		e.collider = world.createCollider(
			RAPIER.ColliderDesc.ball(radius).setSensor(true),
			e.body,
		);
	}
	S.entities.push(e);
	return e;
}
function spawnEnemy(type = "scout") {
	const x = (rnd() - 0.5) * 30,
		y = (rnd() - 0.5) * 17;
	return spawn(type, x, y, -130 - rnd() * 25);
}
function erase(e) {
	if (!e.alive) return;
	e.alive = false;
	view.remove(e.mesh);
	if (e.body) world.removeRigidBody(e.body);
}
function hurt(e, damage) {
	if (!e.alive) return;
	if (e.locked) {
		if (S.elapsed - (e.lastLocked || -10) > 3) {
			e.lastLocked = S.elapsed;
			notice("REACTOR SHIELDED · BREAK THE THREE RELAYS", 1.5);
		}
		return;
	}
	e.hp -= damage;
	S.metrics.hits++;
	audio.hit();
	e.hitFlash = 0.15;
	if (e.hp <= 0) {
		erase(e);
		view.explosion(e.x, e.y, e.z, e.type === "core");
		audio.explosion(e.type === "core");
		if (enemies.has(e.type)) {
			S.kills++;
			S.missionKills++;
		}
		if (damageable.has(e.type)) {
			S.combo = Math.min(8, S.combo + 1);
			S.comboTimer = 7;
			S.score += Math.round(
				(e.type === "core"
					? 5000
					: e.type === "relay"
						? 700
						: e.type === "bomber"
							? 250
							: e.type === "mine"
								? 50
								: 150) *
					(1 + (S.combo - 1) * 0.2),
			);
		}
		if (e.type === "relay") {
			const remaining = S.entities.filter(
				(v) => v.alive && v.type === "relay",
			).length;
			if (!remaining) {
				const core = S.entities.find((v) => v.alive && v.type === "core");
				if (core) core.locked = false;
				radio(
					"FRONTIER CONTROL",
					"Shield collapsed. Reactor exposed. Finish this.",
				);
				notice("REACTOR EXPOSED", 3);
			}
		}
		makeDebris(e);
	}
}
function makeDebris(e) {
	const n = e.type === "core" ? 28 : 7;
	for (let i = 0; i < n; i++) {
		const mesh = view.create("debris");
		const b = world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(e.x, e.y, e.z)
				.setLinearDamping(0.6)
				.setAngularDamping(0.5),
		);
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(0.2, 0.2, 0.4).setDensity(0.1),
			b,
		);
		b.setLinvel(
			{ x: (rnd() - 0.5) * 18, y: (rnd() - 0.5) * 18, z: rnd() * 18 + 8 },
			true,
		);
		b.setAngvel({ x: rnd() * 7, y: rnd() * 7, z: rnd() * 7 }, true);
		S.debris.push({ mesh, body: b, life: 2 + rnd() });
	}
}
function damagePlayer(amount) {
	if (S.god || S.attract || S.phase !== "flight") return;
	amount *= dev.enemyDamage;
	S.metrics.damage += amount;
	const rest = Math.max(0, amount - S.player.shield);
	S.player.shield = Math.max(0, S.player.shield - amount);
	S.player.hull = Math.max(0, S.player.hull - rest);
	S.lastHit = 0;
	S.combo = 1;
	S.comboTimer = 0;
	view.flash = 0.7;
	audio.hit();
	if (S.player.hull <= 0) showDefeat();
}
function shoot() {
	if (S.shotCooldown > 0 || S.overheat || S.phase !== "flight") return;
	S.shotCooldown = 0.13;
	S.heat += 0.065;
	S.metrics.shots++;
	if (S.heat >= 1) S.overheat = true;
	const target = nearestAimTarget(
		settings.assist * (input.last === "pad" ? 0.22 : 0.16),
	);
	let aim = view.aimPoint(S.aim.x, S.aim.y, -125);
	if (target) {
		aim = new T.Vector3(target.x, target.y, target.z);
		if (settings.assist < 0.95)
			aim.lerp(
				view.aimPoint(S.aim.x, S.aim.y, target.z),
				1 - settings.assist * 0.92,
			);
	}
	for (const side of [-1, 1]) {
		const p = { x: S.player.x + side * 0.72, y: S.player.y - 0.55, z: 6 };
		const dir = new T.Vector3(
			aim.x - p.x,
			aim.y - p.y,
			aim.z - p.z,
		).normalize();
		S.shots.push({
			friendly: true,
			x: p.x,
			y: p.y,
			z: p.z,
			vx: dir.x * 210,
			vy: dir.y * 210,
			vz: dir.z * 210,
			life: 2,
			mesh: view.create("laser"),
		});
	}
	audio.laser();
}
function enemyShot(e) {
	const dx = S.player.x - e.x,
		dy = S.player.y - e.y,
		dz = 2 - e.z,
		len = Math.hypot(dx, dy, dz),
		v = e.type === "bomber" ? 37 : 29;
	const shot = {
		friendly: false,
		x: e.x,
		y: e.y,
		z: e.z + 2,
		vx: (dx / len) * v,
		vy: (dy / len) * v,
		vz: (dz / len) * v,
		life: 7,
		mesh: view.create("hostile"),
		damage: e.type === "bomber" ? 16 : 10,
	};
	S.shots.push(shot);
	e.warn = 0;
}
function usePulse() {
	if (S.pulses <= 0 || S.pulseCooldown > 0 || S.phase !== "flight") return;
	S.pulses--;
	S.pulseCooldown = 0.8;
	S.metrics.pulses++;
	view.pulse(S.player.x, S.player.y);
	audio.pulse();
	notice("PULSE DISCHARGED", 1.3);
	for (const e of [...S.entities])
		if (
			e.alive &&
			damageable.has(e.type) &&
			Math.hypot(e.x - S.player.x, e.y - S.player.y, e.z - 2) < 115
		)
			hurt(e, e.type === "core" ? 5 : 9);
	for (const shot of S.shots) if (!shot.friendly) shot.life = 0;
	updatePrompts();
}
function nearestAimTarget(radius = 0.2) {
	let best = null,
		dist = Infinity;
	for (const e of S.entities) {
		if (!e.alive || !damageable.has(e.type) || e.locked || e.z > 2) continue;
		const p = view.project(e);
		if (!p.visible) continue;
		const d = Math.hypot((p.nx - S.aim.x) * view.camera.aspect, p.ny - S.aim.y);
		if (d < radius && d < dist) {
			best = e;
			dist = d;
		}
	}
	return best;
}
function tractorTarget() {
	let best = null,
		d = Infinity;
	for (const e of S.entities) {
		if (!e.alive || !["pod", "station"].includes(e.type) || e.z > 9) continue;
		const dist = Math.hypot(e.x - S.player.x, e.y - S.player.y, e.z - 2);
		if (dist < d) {
			d = dist;
			best = e;
		}
	}
	return best;
}
function autoControls() {
	const c = {
		x: Math.sin(S.elapsed * 0.7) * 0.2,
		y: Math.sin(S.elapsed * 0.4) * 0.15,
		fire: false,
		tractor: false,
		boost: false,
		pulse: false,
	};
	const objective = S.entities
		.filter(
			(e) => e.alive && ["pod", "station", "gate"].includes(e.type) && e.z < 9,
		)
		.sort((a, b) => b.z - a.z)[0];
	if (objective) {
		c.x = clamp((objective.x - S.player.x) * 0.6, -1, 1);
		c.y = clamp((objective.y - S.player.y) * 0.6, -1, 1);
		c.tractor = true;
		const p = view.project(objective);
		S.aim.x = clamp(p.nx, -0.85, 0.85);
		S.aim.y = clamp(p.ny, -0.85, 0.85);
	}
	const target = S.entities
		.filter(
			(e) =>
				e.alive && damageable.has(e.type) && !e.locked && e.z < 0 && e.z > -165,
		)
		.sort(
			(a, b) =>
				(a.type === "relay" ? -100 : 0) -
				(b.type === "relay" ? -100 : 0) +
				b.z -
				a.z,
		)[0];
	if (target && !objective) {
		const p = view.project(target);
		S.aim.x = clamp(p.nx, -0.9, 0.9);
		S.aim.y = clamp(p.ny, -0.9, 0.9);
		c.fire = true;
	}
	if (objective && objective.type === "gate") c.fire = false;
	if (S.attract) {
		S.player.shield = 100;
		S.player.hull = 100;
		S.player.fuel = Math.max(S.player.fuel, 75);
	}
	return c;
}
function readControls(dt) {
	const k = input.keys,
		p = input.pad;
	let x =
			(k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
			(k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0),
		y =
			(k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) -
			(k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
	let fire = input.mouseFire || k.has("Space"),
		tractor = input.mouseTractor || k.has("KeyE") || input.touchTractor,
		boost = k.has("ShiftLeft") || k.has("ShiftRight");
	if (p) {
		x += dead(p.axes[0] || 0);
		y -= dead(p.axes[1] || 0);
		if (input.last === "pad") {
			input.aimX = clamp(
				input.aimX + dead(p.axes[2] || 0) * dt * 1.8,
				-0.85,
				0.85,
			);
			input.aimY = clamp(
				input.aimY - dead(p.axes[3] || 0) * dt * 1.8,
				-0.85,
				0.85,
			);
		}
		fire = fire || pressed(p, 7);
		tractor = tractor || pressed(p, 6) || pressed(p, 0);
		boost = boost || pressed(p, 5) || pressed(p, 1);
	}
	if (S.touch) {
		x += input.touchX;
		y -= input.touchY;
		fire = !!input.touchRight;
		const candidates = S.entities.filter(
			(e) => e.alive && damageable.has(e.type) && !e.locked && e.z < 0,
		);
		if (candidates.length && (input.touchRight || input.touchLeft)) {
			const e = candidates.sort((a, b) => b.z - a.z)[0],
				pr = view.project(e);
			input.aimX += (clamp(pr.nx, -0.8, 0.8) - input.aimX) * 0.1;
			input.aimY += (clamp(pr.ny, -0.8, 0.8) - input.aimY) * 0.1;
			fire = true;
		}
		const tt = tractorTarget();
		if (tt && Math.hypot(tt.x - S.player.x, tt.y - S.player.y) < 6)
			tractor = true;
	}
	S.aim.x = input.aimX;
	S.aim.y = input.aimY;
	return {
		x: clamp(x, -1, 1),
		y: clamp(y, -1, 1),
		fire,
		tractor,
		boost,
		pulse: false,
	};
}
function simulate(dt, override = null) {
	if (S.screen !== "playing" || S.hubEnded) return;
	dt = Math.min(0.05, Math.max(0.001, dt));
	S.metrics.steps++;
	S.elapsed += dt;
	S.totalTime += dt;
	S.lastHit += dt;
	S.shotCooldown = Math.max(0, S.shotCooldown - dt);
	S.pulseCooldown = Math.max(0, S.pulseCooldown - dt);
	S.heat = Math.max(0, S.heat - dev.cooling * dt);
	if (S.overheat && S.heat < 0.25) S.overheat = false;
	S.comboTimer = Math.max(0, S.comboTimer - dt);
	if (S.comboTimer === 0) S.combo = 1;
	const c =
		override || (S.attract || S.autopilot ? autoControls() : readControls(dt));
	if (override?.aim) {
		S.aim.x = override.aim.x;
		S.aim.y = override.aim.y;
	}
	S.moveX = c.x || 0;
	S.moveY = c.y || 0;
	S.boost = !!c.boost && S.player.fuel > 2;
	S.flow = dev.speed * (S.boost ? 1.7 : 1);
	if (S.boost) S.metrics.boostSeconds += dt;
	S.player.x = clamp(S.player.x + S.moveX * dev.steering * dt, -21, 21);
	S.player.y = clamp(S.player.y + S.moveY * dev.steering * 0.78 * dt, -12, 13);
	if (S.phase === "flight") {
		S.player.fuel = Math.max(
			0,
			S.player.fuel - dt * dev.fuelBurn * (S.boost ? 5 : 1),
		);
		if (S.player.fuel <= 0) {
			S.flow *= 0.6;
			if (S.elapsed % 5 < dt) damagePlayer(4);
			if (!S.fuelWarned) {
				S.fuelWarned = true;
				radio(
					"ENGINE / LOW FUEL",
					"Reserve drive engaged. Finish the sortie. A service tender is standing by.",
				);
			}
		}
		if (S.lastHit > 5)
			S.player.shield = Math.min(100, S.player.shield + dev.shieldRegen * dt);
		if (c.fire) shoot();
		if (c.pulse) usePulse();
	}
	for (const event of schedules) {
		if (!event.done && S.elapsed >= event.at) {
			event.done = true;
			event.fn();
		}
	}
	S.tractoring = false;
	const tt = tractorTarget();
	S.tractorProgress = 0;
	for (const e of S.entities) {
		if (!e.alive) continue;
		e.age += dt;
		e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
		if (enemies.has(e.type)) {
			e.x = e.baseX + Math.sin(e.age * 0.8 + e.phase) * 3;
			e.y = e.baseY + Math.sin(e.age * 0.6 + e.phase) * 1.4;
			e.z += S.flow * dt;
			if (e.z > -47 && e.age < 15) e.z = -47 + Math.sin(e.age) * 3;
			if (e.z > 18) {
				e.z = -140;
				e.age = 0;
				e.baseX = (rnd() - 0.5) * 31;
				e.baseY = (rnd() - 0.5) * 17;
			}
			e.mesh.rotation.z = -(e.x - e.baseX) * 0.07;
			e.mesh.rotation.y = Math.sin(e.age * 0.8 + e.phase) * 0.16;
			e.fireIn -= dt;
			if (e.fireIn < 0.8 && e.z > -110) e.warn = 0.8 - e.fireIn;
			if (e.fireIn <= 0) {
				enemyShot(e);
				e.fireIn = e.type === "ace" ? 2.4 : 3.5 + rnd() * 2;
			}
		}
		if (["mine", "rock"].includes(e.type)) {
			e.z += S.flow * dt;
			e.mesh.rotation.x += dt * 0.3;
			e.mesh.rotation.z += dt * 0.2;
			if (e.z > 20) erase(e);
		}
		if (e.type === "pod") {
			e.z += S.flow * dt * 0.7;
			e.mesh.rotation.z = Math.sin(e.age * 1.5) * 0.15;
			const dist = Math.hypot(e.x - S.player.x, e.y - S.player.y, e.z - 2),
				aligned = Math.hypot(e.x - S.player.x, e.y - S.player.y) < 6;
			if (e === tt && c.tractor && dist < dev.tractorRange && aligned) {
				e.pull += dt;
				S.tractoring = true;
				S.tractorProgress = e.pull / 1.2;
				e.z = Math.min(e.z, -13);
				view.beam({ x: S.player.x, y: S.player.y - 0.4, z: 6 }, e);
			} else e.pull = Math.max(0, e.pull - dt * 0.5);
			if (e.pull >= 1.2) {
				erase(e);
				S.rescued++;
				S.missionRescued++;
				S.metrics.tractors++;
				S.score += 1200;
				S.player.shield = Math.min(100, S.player.shield + 18);
				audio.pickup();
				view.recovery(e.x, e.y, e.z);
				notice(`PILOT ABOARD · ${S.missionRescued} / 3`, 2);
				radio(
					["CADET / KETT", "CADET / VEGA", "CADET / NOOR"][e.pilot || 0],
					[
						"Nice ship. Room for two more?",
						"Beacon off. I am coming home.",
						"All accounted for. Take us out of here.",
					][e.pilot || 0],
				);
			}
			if (e.z > 12) {
				e.z = -110;
				e.pull = 0;
				notice("BEACON REACQUIRED · LINE UP AND HOLD TRACTOR", 2);
			}
		}
		if (e.type === "station") {
			e.z = Math.min(-37, e.z + S.flow * dt * 0.5);
			const aligned = Math.hypot(e.x - S.player.x, e.y - S.player.y) < 4;
			if (
				e === tt &&
				c.tractor &&
				aligned &&
				Math.abs(e.z - 2) < dev.tractorRange
			) {
				S.tractoring = true;
				S.dockProgress += dt / 2.8;
				view.beam({ x: S.player.x, y: S.player.y - 0.4, z: 6 }, e);
				S.player.fuel = Math.min(100, S.player.fuel + dt * 30);
				S.player.shield = Math.min(100, S.player.shield + dt * 30);
				S.player.hull = Math.min(100, S.player.hull + dt * 30);
			} else S.dockProgress = Math.max(0, S.dockProgress - dt * 0.12);
			if (S.dockProgress >= 1 && S.phase === "flight") {
				S.player.fuel = 100;
				S.player.shield = 100;
				S.player.hull = 100;
				S.pulses = 2;
				S.fuelWarned = false;
				audio.pickup();
				radio(
					"ANCHORAGE / TOWER",
					"Tanks full. Hull sealed. Two pulses loaded. Give them a reason to remember us.",
				);
				completeSector();
			}
		}
		if (e.type === "gate") {
			const last = e.z;
			e.z += S.flow * dt;
			if (last < 2 && e.z >= 2) {
				if (Math.hypot(e.x - S.player.x, e.y - S.player.y) < 5.7) {
					erase(e);
					S.gates++;
					S.missionGates++;
					S.score += 500;
					audio.pickup();
					notice(`GATE ${S.missionGates} / 5 · CLEAN PASS`, 1.4);
					view.recovery(e.x, e.y, 0);
				} else {
					e.z = -140;
					notice("GATE MISSED · SIGNAL RECIRCULATING", 1.7);
				}
			}
		}
		if (e.type === "boss") {
			e.z = Math.min(-86, e.z + dt * 7);
			e.x = Math.sin(S.elapsed * 0.32) * 3.2;
			e.y = 1 + Math.sin(S.elapsed * 0.23) * 2;
			e.mesh.rotation.z = Math.sin(S.elapsed * 0.25) * 0.05;
		}
		if (e.type === "relay" || e.type === "core") {
			const b = S.entities.find((v) => v.id === e.boss);
			if (b) {
				e.x = b.x + (e.type === "relay" ? [-13, 13, 0][e.node] : 0);
				e.y = b.y + (e.type === "relay" ? [5, 5, -8][e.node] : 0);
				e.z = b.z + (e.type === "core" ? 31 : 29);
				if (e.type === "core") {
					const shield = e.mesh.getObjectByName("shield");
					if (shield) shield.visible = !!e.locked;
				}
			}
		}
		if (!e.alive) continue;
		e.mesh.position.set(e.x, e.y, e.z);
		if (e.body) e.body.setNextKinematicTranslation({ x: e.x, y: e.y, z: e.z });
	}
	playerBody.setNextKinematicTranslation({
		x: S.player.x,
		y: S.player.y,
		z: 2,
	});
	world.timestep = dt;
	world.step();
	for (const shot of S.shots) {
		shot.life -= dt;
		if (shot.life <= 0) continue;
		const len = Math.hypot(shot.vx, shot.vy, shot.vz) * dt,
			dir = {
				x: (shot.vx * dt) / len,
				y: (shot.vy * dt) / len,
				z: (shot.vz * dt) / len,
			};
		const ray = new RAPIER.Ray({ x: shot.x, y: shot.y, z: shot.z }, dir);
		const hit = world.castRay(
			ray,
			len,
			true,
			undefined,
			undefined,
			shot.friendly ? playerCollider : undefined,
			shot.friendly ? playerBody : undefined,
			(c) =>
				shot.friendly
					? S.entities.some(
							(e) =>
								e.alive &&
								damageable.has(e.type) &&
								e.collider?.handle === c.handle,
						)
					: c.handle === playerCollider.handle,
		);
		S.metrics.collisionQueries++;
		if (hit) {
			shot.life = 0;
			if (shot.friendly) {
				const e = S.entities.find(
					(e) => e.alive && e.collider?.handle === hit.collider.handle,
				);
				if (e) hurt(e, dev.weaponPower);
			} else damagePlayer(shot.damage || 10);
		}
		shot.x += shot.vx * dt;
		shot.y += shot.vy * dt;
		shot.z += shot.vz * dt;
		shot.mesh.position.set(shot.x, shot.y, shot.z);
		shot.mesh.lookAt(shot.x + shot.vx, shot.y + shot.vy, shot.z + shot.vz);
		if (shot.z > 25 || shot.z < -360) shot.life = 0;
	}
	for (let i = S.shots.length - 1; i >= 0; i--)
		if (S.shots[i].life <= 0) {
			view.remove(S.shots[i].mesh);
			S.shots.splice(i, 1);
		}
	const contact = world.intersectionWithShape(
		{ x: S.player.x, y: S.player.y, z: 2 },
		{ x: 0, y: 0, z: 0, w: 1 },
		playerShape,
		undefined,
		undefined,
		playerCollider,
		playerBody,
		(c) =>
			S.entities.some(
				(e) =>
					e.alive &&
					["scout", "ace", "bomber", "mine", "rock"].includes(e.type) &&
					e.collider?.handle === c.handle,
			),
	);
	S.metrics.collisionQueries++;
	if (contact) {
		const e = S.entities.find((e) => e.collider?.handle === contact.handle);
		if (e) {
			damagePlayer(e.type === "mine" ? 23 : 18);
			view.explosion(e.x, e.y, e.z);
			erase(e);
			if (enemies.has(e.type)) {
				S.missionKills++;
				S.kills++;
				S.score += 25;
			}
		}
	}
	for (let i = S.debris.length - 1; i >= 0; i--) {
		const d = S.debris[i];
		d.life -= dt;
		if (d.life <= 0) {
			view.remove(d.mesh);
			world.removeRigidBody(d.body);
			S.debris.splice(i, 1);
		} else {
			d.mesh.position.copy(d.body.translation());
			d.mesh.quaternion.copy(d.body.rotation());
		}
	}
	if (S.sector === 4 && S.phase === "flight") {
		S.beamClock += dt;
		const core = S.entities.find((e) => e.alive && e.type === "core");
		const interval = core && !core.locked ? 6 : 9;
		if (S.beamClock > interval && !S.warning) {
			S.beamClock = 0;
			S.warning = { x: S.player.x, age: 0, fired: false };
			audio.tone(180, 0.4, "square", 0.03, 1.2);
			notice("LANE CANNON · MOVE SIDEWAYS", 2.2);
		}
		if (S.warning) {
			const q = S.warning;
			q.age += dt;
			if (q.age > 2.3 && !q.fired) {
				q.fired = true;
				if (Math.abs(S.player.x - q.x) < 3.3) {
					damagePlayer(26);
					view.explosion(S.player.x, S.player.y, -1);
				}
				audio.explosion();
			}
			if (q.age > 2.8) S.warning = null;
		}
	}
	if (S.phase === "flight") {
		if (S.sector === 0 && S.missionKills >= 8) completeSector();
		if (S.sector === 1 && S.missionRescued >= 3) completeSector();
		if (S.sector === 3 && S.missionGates >= 5) completeSector();
		if (S.sector === 4 && !S.entities.some((e) => e.alive && e.type === "core"))
			completeSector();
	}
	if (S.phase === "clear") {
		clearTimer -= dt;
		if (clearTimer <= 0) {
			if (S.sector === 4) showVictory();
			else {
				S.selected = S.sector + 1;
				if (S.attract) launchSector(S.selected);
				else showChart();
			}
		}
	}
	if (S.totalTime > radioUntil) $("radio").classList.remove("visible");
}
function completeSector() {
	if (S.phase !== "flight") return;
	S.phase = "clear";
	clearTimer = S.attract ? 1.5 : 3;
	S.warning = null;
	S.score += 1000;
	S.player.fuel = Math.max(18, S.player.fuel);
	if (!S.cleared.includes(S.sector)) S.cleared.push(S.sector);
	S.cleared.sort();
	for (const shot of S.shots) if (!shot.friendly) shot.life = 0;
	notice(
		S.sector === 4
			? "JUMP CORRIDOR OPEN · EVERYONE COMES HOME"
			: "SECTOR SECURE · JUMP COORDINATES RECEIVED",
		3,
	);
	audio.pickup();
	saveCheckpoint();
}
function updateHUD() {
	const sec = SECTORS[S.sector];
	$("sectorLabel").textContent = `${sec.grid} / ${sec.role}`;
	$("objectiveText").textContent =
		S.phase === "clear" ? "Sector secure" : sec.title;
	const detail =
		S.sector === 0
			? `${S.missionKills} / 8 INTERCEPTORS`
			: S.sector === 1
				? `${S.missionRescued} / 3 PILOTS ABOARD`
				: S.sector === 2
					? `SERVICE LINK ${Math.floor(S.dockProgress * 100)}%`
					: S.sector === 3
						? `${S.missionGates} / 5 GATES`
						: `${S.entities.filter((e) => e.alive && e.type === "relay").length} SHIELD RELAYS · ${Math.max(0, Math.ceil(S.entities.find((e) => e.alive && e.type === "core")?.hp || 0))} REACTOR`;
	$("objectiveDetail").textContent = detail;
	$("flighttag").textContent =
		`${sec.name.toUpperCase()} / ${String(Math.floor(S.elapsed / 60)).padStart(2, "0")}:${String(Math.floor(S.elapsed % 60)).padStart(2, "0")}`;
	for (const n of ["shield", "hull", "fuel"]) {
		$(n + "Bar").style.width = S.player[n] + "%";
		$(n + "Num").textContent = Math.ceil(S.player[n]);
	}
	$("scoreNum").textContent = String(Math.round(S.score)).padStart(6, "0");
	$("comboText").textContent =
		S.combo > 1
			? `${S.combo} CHAIN · ×${(1 + (S.combo - 1) * 0.2).toFixed(1)}`
			: "";
	$("heat").querySelector("i").style.width = Math.min(100, S.heat * 100) + "%";
	$("heat").querySelector("b").textContent = S.overheat ? "COOLING" : "";
	const tt = tractorTarget();
	let hint = "";
	if (tt) {
		const align = Math.hypot(tt.x - S.player.x, tt.y - S.player.y),
			dist = Math.hypot(tt.x - S.player.x, tt.y - S.player.y, tt.z - 2);
		hint =
			dist > dev.tractorRange
				? "CLOSE ON THE BEACON"
				: align > 6
					? "ALIGN WITH THE BEACON"
					: `${S.touch ? "HOLD" : promptFor("tractor")} · ${tt.type === "pod" ? "TRACTOR LOCK" : "DOCKING LINK"}`;
		if (S.tractoring)
			hint =
				tt.type === "pod"
					? `RECOVERING ${Math.floor(S.tractorProgress * 100)}%`
					: `SERVICING ${Math.floor(S.dockProgress * 100)}%`;
	}
	$("targetHint").textContent = hint;
	$("touchAction").hidden =
		!S.touch || !tt || Math.abs(tt.z) > dev.tractorRange;
	$("touchAction").textContent = tt?.type === "station" ? "DOCK" : "TRACTOR";
	$("wingHud").replaceChildren();
	for (const [id, g] of wingGhosts) {
		const el = document.createElement("div");
		el.style.color = g.color || "#80e0c4";
		el.textContent = `${g.name || "WING " + id} · ${String(Math.round(g.score || 0)).padStart(6, "0")}${g.sector !== S.sector ? " / " + SECTORS[clamp(g.sector || 0, 0, 4)].name : ""}`;
		$("wingHud").appendChild(el);
	}
	updatePrompts();
}
function drawTargets() {
	if (S.screen !== "playing") return;
	const c = view.ctx,
		w = view.width,
		h = view.height,
		u = Math.max(0.75, w / 1440);
	c.save();
	c.lineWidth = 1.2 * u;
	c.font = `${11 * u}px monospace`;
	c.textAlign = "center";
	const guide = S.entities
		.filter(
			(e) => e.alive && e.z < 6 && ["pod", "station", "gate"].includes(e.type),
		)
		.sort((a, b) => b.z - a.z)[0];
	for (const e of S.entities) {
		if (
			!e.alive ||
			e.z > 6 ||
			e.z < -240 ||
			(!damageable.has(e.type) && !["pod", "station", "gate"].includes(e.type))
		)
			continue;
		const p = view.project(e);
		const friendly = ["pod", "station", "gate"].includes(e.type);
		if (!p.visible) continue;
		if (friendly && (Math.abs(p.nx) > 0.88 || Math.abs(p.ny) > 0.7)) {
			if (e === guide) {
				const x = clamp(p.x, w * 0.12, w * 0.88),
					y = clamp(p.y, h * 0.26, h * 0.72);
				c.save();
				c.globalAlpha = 0.9;
				c.fillStyle = "#80e0c4";
				c.translate(x, y);
				c.rotate(Math.atan2(p.y - h * 0.5, p.x - w * 0.5));
				c.beginPath();
				c.moveTo(8 * u, 0);
				c.lineTo(-5 * u, -6 * u);
				c.lineTo(-2 * u, 0);
				c.lineTo(-5 * u, 6 * u);
				c.closePath();
				c.fill();
				c.restore();
				c.fillStyle = "#80e0c4";
				c.fillText(
					e.type === "pod"
						? `PILOT ${e.pilot + 1}`
						: e.type === "gate"
							? `GATE ${e.index + 1}`
							: "ANCHORAGE",
					x,
					y - 15 * u,
				);
			}
			continue;
		}
		const col = e.locked ? "#aa979a" : friendly ? "#80e0c4" : "#ff9477",
			r = clamp(((e.radius || 3) * 800) / (-e.z + 18), 11, 45) * u;
		c.strokeStyle = col;
		c.globalAlpha = e.hitFlash > 0 ? 1 : 0.62;
		c.beginPath();
		if (friendly) {
			c.moveTo(p.x, p.y - r - 5);
			c.lineTo(p.x + r + 5, p.y);
			c.lineTo(p.x, p.y + r + 5);
			c.lineTo(p.x - r - 5, p.y);
			c.closePath();
		} else {
			const a = r + 5,
				l = 6 * u;
			for (const [x, y] of [
				[-1, -1],
				[1, -1],
				[-1, 1],
				[1, 1],
			]) {
				c.moveTo(p.x + x * a, p.y + y * (a - l));
				c.lineTo(p.x + x * a, p.y + y * a);
				c.lineTo(p.x + x * (a - l), p.y + y * a);
			}
		}
		c.stroke();
		if (e.hp < e.maxHp) {
			c.fillStyle = col;
			c.fillRect(
				p.x - r,
				p.y + r + 11,
				r * 2 * Math.max(0, e.hp / e.maxHp),
				2 * u,
			);
		}
		if (friendly || e.type === "relay" || e.type === "core") {
			c.fillStyle = col;
			c.fillText(
				e.type === "pod"
					? "PILOT " + (e.pilot + 1)
					: e.type === "gate"
						? "GATE " + (e.index + 1)
						: e.type === "station"
							? "ANCHORAGE"
							: e.type === "relay"
								? "SHIELD RELAY"
								: e.locked
									? "SHIELDED"
									: "REACTOR",
				p.x,
				p.y - r - 14 * u,
			);
		}
		if (e.warn > 0) {
			c.strokeStyle = "#ffcf8d";
			c.beginPath();
			c.arc(p.x, p.y, r + 11, 0, Math.PI * 2 * clamp(e.warn / 0.8, 0, 1));
			c.stroke();
		}
	}
	if (S.warning) {
		const a = view.project({ x: S.warning.x, y: 0, z: -32 }),
			b = view.project({ x: S.warning.x + 3.3, y: 0, z: -32 });
		c.globalAlpha = S.warning.fired
			? 0.3
			: 0.1 + Math.sin(S.warning.age * 20) * 0.06;
		c.fillStyle = "#ff775c";
		c.fillRect(a.x - (b.x - a.x), h * 0.22, (b.x - a.x) * 2, h * 0.6);
		c.globalAlpha = 0.8;
		c.strokeStyle = "#ff775c";
		c.setLineDash([8, 8]);
		c.strokeRect(a.x - (b.x - a.x), h * 0.22, (b.x - a.x) * 2, h * 0.6);
		c.setLineDash([]);
		c.fillStyle = "#ffb296";
		c.fillText(S.warning.fired ? "DISCHARGE" : "LANE CANNON", a.x, h * 0.24);
	}
	c.globalAlpha = 0.9;
	const x = (0.5 + S.aim.x * 0.5) * w,
		y = (0.5 - S.aim.y * 0.5) * h;
	c.strokeStyle = S.overheat ? "#ff775c" : "#eee9d5";
	c.lineWidth = 1.1 * u;
	c.beginPath();
	c.arc(x, y, 8 * u, 0, Math.PI * 2);
	for (const [dx, dy] of [
		[-1, 0],
		[1, 0],
		[0, -1],
		[0, 1],
	]) {
		c.moveTo(x + dx * 13 * u, y + dy * 13 * u);
		c.lineTo(x + dx * 21 * u, y + dy * 21 * u);
	}
	c.stroke();
	c.fillStyle = "#80e0c4";
	c.fillRect(x - 1, y - 1, 2, 2);
	if (S.tractoring) {
		c.strokeStyle = "#80e0c4";
		c.lineWidth = 3 * u;
		c.beginPath();
		c.arc(
			x,
			y,
			29 * u,
			-Math.PI / 2,
			-Math.PI / 2 +
				Math.PI * 2 * (S.sector === 2 ? S.dockProgress : S.tractorProgress),
		);
		c.stroke();
	}
	c.restore();
}

function button(label, action, primary = false, extra = "") {
	return `<button class="btn ${primary ? "primary" : ""}" data-action="${action}" ${extra}>${label}<small>↗</small></button>`;
}
function panel(title, body, wide = false, kicker = "FLIGHT / 07", back = true) {
	return `<section class="panel-screen"><div class="panel ${wide ? "wide" : ""}"><div class="panelhead"><div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>${back ? '<button class="back-btn" data-action="back"><span data-prompt="back">ESC</span> / BACK</button>' : ""}</div>${body}</div></section>`;
}
function mount(screen, html) {
	S.screen = screen;
	$("menu").innerHTML = html;
	$("hud").hidden = !["playing", "paused", "dev"].includes(screen);
	$("attractBanner").hidden = !S.attract;
	focusIndex = 0;
	updatePrompts();
	refreshFocus();
	resetInput();
}
function focusables() {
	return [
		...$("menu").querySelectorAll(
			'button:not(:disabled),input,select,textarea,[tabindex="0"]',
		),
	].filter((e) => e.offsetParent !== null && !e.disabled);
}
function refreshFocus(index = focusIndex, doFocus = false) {
	const list = focusables();
	if (!list.length) return;
	focusIndex = (index + list.length) % list.length;
	list.forEach((e, i) => {
		e.classList.toggle("focused", i === focusIndex);
	});
	if (doFocus) {
		const e = list[focusIndex];
		e.focus({ preventScroll: true });
		e.scrollIntoView({ block: "nearest" });
	}
}
function moveFocus(direction) {
	refreshFocus(focusIndex + direction, true);
	audio.menu();
}
function showTitle() {
	S.attract = false;
	S.phase = "flight";
	S.returnTo = "title";
	lastActivity = performance.now();
	$("radio").classList.remove("visible");
	$("attractBanner").hidden = true;
	view.reset(0);
	const checkpoint = storage.get("stowaways.checkpoint");
	mount(
		"title",
		`<section class="title-screen"><div class="topline"><strong>FRONTIER / RESCUE DIVISION</strong><span>FLIGHT 07 · UNAUTHORIZED DEPARTURE</span></div><div class="title-copy"><div class="title-kicker">A SIGNAL FROM THE FAR SIDE</div><h1>Solar<br><span class="outline">Stowaways</span></h1><p>A small ship. A very large wrong turn.<br><strong>Bring the lost ones home.</strong></p><div class="title-actions">${button('Launch flight <small data-prompt="confirm">ENTER</small>', "new", true)}${checkpoint ? button("Continue flight", "continue") : ""}${button("Wing race <small>2 PILOTS</small>", "wing")}${button("Settings", "settings")}${button("About & credits", "about")}</div></div><div class="orbitnote">CINDER / C · 03<br><span>3 EMERGENCY BEACONS<br>NO RETURN TRAFFIC</span></div><div class="serial">ST-07 / KEEP THE CHANNEL OPEN</div><div class="title-bottom"><div class="subnote">INSPIRED BY SOLARIS · 1986<br>AN ORIGINAL FRONTIER FLIGHT</div><div class="subnote">CONTROLLER · MOUSE & KEYS · TOUCH<br>AUTOPILOT TOUR AFTER 10 SECONDS</div></div></section>`,
	);
}
function showBriefing() {
	mount(
		"briefing",
		`<section class="briefing"><div><span class="eyebrow">PRIORITY SIGNAL / CINDER</span><h2>Three pilots.<br>One way home.</h2><p>The frontier has gone quiet. A Corsair picket guards the distress signal. Beyond it: three stranded pilots, one friendly fuel stop, and a carrier between you and home.</p><p>Clear the patrol. Recover the pilots. Keep enough ship to bring them back.</p><div class="callout smallprint">${promptFor("move")} / FLY &nbsp; ${promptFor("aim")} / AIM<br>${promptFor("fire")} / FIRE &nbsp; ${promptFor("tractor")} / RECOVER<br>${promptFor("pulse")} / PULSE &nbsp; ${promptFor("boost")} / BOOST</div>${button("Open the channel", "launch", true)}${button("Flight controls", "controls")}</div></section>`,
	);
}
function showChart() {
	if (S.attract) {
		launchSector(Math.min(S.sector + 1, 4));
		return;
	}
	S.selected = clamp(S.selected, 0, 4);
	const sec = SECTORS[S.selected],
		unlocked = S.selected <= S.cleared.length;
	const nodes = SECTORS.map(
		(s, i) =>
			`<button class="sector-node ${S.cleared.includes(i) ? "complete" : ""} ${S.selected === i ? "selected" : ""} ${i > S.cleared.length ? "locked" : ""}" style="left:${s.x}%;top:${s.y}%" data-action="select-${i}" aria-label="${s.name}${i > S.cleared.length ? " locked" : ""}"><span class="symbol">${S.cleared.includes(i) ? "✓" : s.symbol}</span><span>${s.grid}</span></button>`,
	).join("");
	mount(
		"chart",
		`<section class="chart-screen"><div class="chart-head"><div><span class="eyebrow">FRONTIER / TACTICAL CHART</span><h2>The way through.</h2></div><div class="chart-meta">PILOTS <strong>${S.rescued} / 3</strong><br>FUEL <strong>${Math.ceil(S.player.fuel)}%</strong> &nbsp; HULL <strong>${Math.ceil(S.player.hull)}%</strong><br>FLIGHT SCORE <strong>${String(S.score).padStart(6, "0")}</strong></div></div><div class="chart-main"><div class="starmap"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M13 57 L34 30 L53 67 L72 29 L90 54" fill="none" stroke="#80e0c445" stroke-width=".35" stroke-dasharray="1 1"/><path d="M0 12H100M0 89H100M5 0V100M97 0V100" fill="none" stroke="#7bb5ab22" stroke-width=".1"/><circle cx="84" cy="80" r="6" fill="none" stroke="#ff775c33" stroke-width=".18"/><circle cx="84" cy="80" r="9" fill="none" stroke="#ff775c22" stroke-width=".15"/><text x="82" y="81" fill="#ff775c77" font-size="2">×</text></svg>${nodes}</div><div class="mission-card"><span class="eyebrow">${String(S.selected + 1).padStart(2, "0")} / ${sec.role}${S.cleared.includes(S.selected) ? " / SECURE" : ""}</span><h3>${sec.name}</h3><p>${sec.objective}</p><div class="mission-facts"><div>JUMP COST<b>${sec.cost}% FUEL</b></div><div>STATUS<b>${unlocked ? (S.cleared.includes(S.selected) ? "SECURE" : "SIGNAL OPEN") : "ENCRYPTED"}</b></div></div>${button(unlocked ? (S.cleared.includes(S.selected) ? "Replay sortie" : "Jump to " + sec.name) : "Clear previous sector", "jump", true, unlocked ? "" : "disabled")}<p class="smallprint">${sec.hint}</p></div></div><div class="chart-bottom"><span>SELECT A SECTOR · ${promptFor("confirm")} TO CONFIRM</span><button class="text-button" data-action="pause-chart">FLIGHT MENU / ${promptFor("pause")}</button></div></section>`,
	);
	refreshFocus(focusables().findIndex((e) => e.dataset.action === "jump"));
}
function showPause(from = S.screen) {
	if (from === "playing" || from === "chart") S.returnTo = from;
	mount(
		"paused",
		panel(
			"Hold your orbit.",
			`${button("Resume flight", "resume", true)}${button("Flight controls", "controls")}${button("Settings", "settings")}${button("Developer flight deck", "dev")}${button("About & credits", "about")}${hub.active ? "" : button("Return to title", "title")}`,
			"",
			"PAUSED / " + SECTORS[S.sector].name.toUpperCase(),
			false,
		),
	);
}
function showSettings(back = S.screen) {
	if (!["settings", "about", "controls", "dev"].includes(back))
		S.subReturn = back;
	mount(
		"settings",
		panel(
			"Make yourself at home.",
			`<div class="setting-row"><label for="music">Music<small>PROCEDURAL / DEFAULT 10%</small></label><input id="music" data-setting="music" type="range" min="0" max="100" value="${Math.round(settings.music * 100)}"><output>${Math.round(settings.music * 100)}%</output></div><div class="setting-row"><label for="sfx">Effects & radio</label><input id="sfx" data-setting="sfx" type="range" min="0" max="100" value="${Math.round(settings.sfx * 100)}"><output>${Math.round(settings.sfx * 100)}%</output></div><div class="setting-row"><label for="assist">Aim assistance</label><input id="assist" data-setting="assist" type="range" min="0" max="100" value="${Math.round(settings.assist * 100)}"><output>${Math.round(settings.assist * 100)}%</output></div><div class="setting-row"><label for="glyphs">Controller glyphs</label><select id="glyphs" data-setting="glyphs"><option value="ps" ${settings.glyphs === "ps" ? "selected" : ""}>PlayStation</option><option value="xbox" ${settings.glyphs === "xbox" ? "selected" : ""}>Xbox</option></select><output></output></div><div class="setting-row"><label>Camera motion</label><button class="switchbtn" data-action="motion">${settings.motion ? "ON" : "REDUCED"}</button><output></output></div>${button("Reset settings", "reset-settings")}<p class="smallprint">All sound is synthesized. Radio voices are fictional syllables. Touch flight assists aim, fire, and close-range recovery.</p>`,
		),
	);
}
function showControls(back = S.screen) {
	if (!["settings", "about", "controls", "dev"].includes(back))
		S.subReturn = back;
	const rows = [
		["Fly", promptFor("move")],
		["Aim", promptFor("aim")],
		["Fire / heat-limited", promptFor("fire")],
		["Tractor / dock", promptFor("tractor")],
		["Pulse / 2 charges", promptFor("pulse")],
		["Boost / burns fuel", promptFor("boost")],
		["Tactical chart", promptFor("chart")],
		["Pause / menu", promptFor("pause")],
	];
	mount(
		"controls",
		panel(
			"Keep it pointed home.",
			`<div class="controls-grid">${rows.map(([a, b]) => `<div class="controlrow"><span>${a}</span><b>${b}</b></div>`).join("")}</div><div class="callout"><p>Line up with pilot beacons and hold tractor. Dock the same way. Navigation gates require the ship itself to pass through.</p><p>Shields recharge after five quiet seconds. Hull repairs and pulse reloads require a service stop. Burst fire keeps the guns cool.</p></div><p class="smallprint">Touch: left thumb steers, right thumb aims. Firing is assisted while touching. Tractor engages when aligned; a context button also appears. Menus work by tap.<br>Menus: D-pad / arrows to focus, ${promptFor("confirm")} to select, ${promptFor("back")} to go back. Right stick scrolls credits.</p>`,
			true,
		),
	);
}
function showAbout(back = S.screen) {
	if (!["settings", "about", "controls", "dev"].includes(back))
		S.subReturn = back;
	const cr = window.GAME_CREDITS;
	const labels = {
		date: "Date",
		source: "Source",
		plan: "Plan",
		genre: "Genre",
		perspective: "Perspective",
		tech: "Tech",
		artDirection: "Art direction",
		animation: "Animation",
		audio: "Audio",
		online: "Online",
		testing: "Testing",
		research: "Research",
		environment: "Environment",
		model: "Model",
		usage: "Usage",
	};
	const feedback = (name, a) =>
		`<h3>${name}</h3><ol>${a.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`;
	mount(
		"about",
		panel(
			"A signal. A small ship.",
			`<div class="credits" tabindex="0"><p><b>Solar Stowaways</b> is an original game inspired by the galactic patrols, rescue missions, warp chart, and perilous fuel stops of <b>Solaris (1986)</b>. Ships, characters, writing, sound and art here are original procedural work.</p><h3>SOURCE INFORMATION</h3><dl>${Object.entries(
				labels,
			)
				.map(
					([k, v]) =>
						`<dt>${v}</dt><dd>${esc(cr.sourceInformation[k] || "unknown")}</dd>`,
				)
				.join(
					"",
				)}</dl><h3>RUNTIME</h3><p>Renderer: ${esc(view.backend)} · Three.js ${T.REVISION} · Rapier ${RAPIER.version()}<br>AI Hub Session Protocol v1 / ghost wing race / 1–4 players.<br>Standalone: direct WebRTC / 2 players / manual offer and answer codes. Connectivity across restrictive NATs is unknown; no relay server is supplied.</p>${feedback("TESTING FEEDBACK", cr.testingFeedback)}${feedback("ENGINE FEEDBACK", cr.engineFeedback)}${feedback("PROMPT FEEDBACK", cr.promptFeedback)}<h3>CREDITS & LICENSES</h3><p>Game design, code, procedural models, animation, music, effects, and fictional radio voices: OpenAI gpt-6.1-sol. Three.js (MIT), Rapier (Apache-2.0), AI Hub session client (upstream client included unmodified). Original Solaris: Atari, 1986; original game creator Doug Neubauer. No source assets or recordings are used. Dependency license texts are included in the bundled HTML.</p><p class="smallprint">BRING THE LOST ONES HOME. / END TRANSMISSION.</p></div>`,
			true,
			"ABOUT / CREDITS",
		),
	);
}
function showDev() {
	if (S.screen !== "dev") S.devReturn = S.screen;
	const defs = [
		["speed", "Cruise speed", 10, 65, 1],
		["steering", "Steering speed", 8, 38, 1],
		["enemyHealth", "Enemy health", 0.25, 3, 0.05],
		["enemyDamage", "Incoming damage", 0, 3, 0.05],
		["weaponPower", "Weapon damage", 0.25, 5, 0.05],
		["cooling", "Gun cooling", 0.1, 1, 0.01],
		["fuelBurn", "Fuel burn", 0, 0.6, 0.01],
		["shieldRegen", "Shield recharge", 0, 12, 0.5],
		["tractorRange", "Tractor range", 30, 120, 1],
	];
	mount(
		"dev",
		panel(
			"Developer flight deck.",
			`<p class="smallprint">${hub.active ? "Session flight controls are read-only." : "Live flight balance. Changes apply immediately. Test aids do not affect saved defaults."} · ${view.backend} / RAPier ${RAPIER.version()}<br>${S.metrics.steps} SIM STEPS · ${S.metrics.collisionQueries} PHYSICS QUERIES · ${S.metrics.hits} HITS</p><div class="dev-grid">${defs.map(([k, l, min, max, step]) => `<div class="setting-row"><label for="dev-${k}">${l}</label><input id="dev-${k}" type="range" data-dev="${k}" min="${min}" max="${max}" step="${step}" value="${dev[k]}" ${hub.active ? "disabled" : ""}><output>${dev[k]}</output></div>`).join("")}</div><div class="dev-actions">${button("Restore ship & pulses", "dev-refill", false, hub.active ? "disabled" : "")}${button("Invulnerability: " + (S.god ? "ON" : "OFF"), "dev-god", false, hub.active ? "disabled" : "")}${button("Autopilot: " + (S.autopilot ? "ON" : "OFF"), "dev-auto", false, hub.active ? "disabled" : "")}${button("Restart this sortie", "dev-restart", false, hub.active ? "disabled" : "")}${button("Complete this sortie", "dev-complete", false, hub.active ? "disabled" : "")}${button("Reset balance defaults", "dev-reset", false, hub.active ? "disabled" : "")}</div><div class="setting-row"><label for="dev-sector">Jump / teleport</label><select id="dev-sector" ${hub.active ? "disabled" : ""}>${SECTORS.map((s, i) => `<option value="${i}" ${i === S.sector ? "selected" : ""}>${s.name}</option>`).join("")}</select><button class="switchbtn" data-action="dev-jump" ${hub.active ? "disabled" : ""}>GO</button></div>`,
			true,
			"DEV / LIVE TUNING",
		),
	);
}
function showDefeat() {
	S.player.hull = 0;
	S.phase = "lost";
	audio.explosion(true);
	mount(
		"defeat",
		panel(
			"Not quite home.",
			`<p>The escape beacon is transmitting. A frontier tender has your position.</p><div class="stats"><div><b>${String(S.score).padStart(6, "0")}</b><span>FLIGHT SCORE</span></div><div><b>${S.rescued}</b><span>PILOTS ABOARD</span></div><div><b>${S.kills}</b><span>INTERCEPTORS</span></div></div><p class="smallprint">Retry this sortie with a repaired ship. Previous sectors stay secure. Tender fee: 500 points.</p>${button("Accept tow & retry", "retry", true)}${button("Flight controls", "controls")}${hub.active ? "" : button("Return to title", "title")}`,
			false,
			"BEACON / SIGNAL RECEIVED",
			false,
		),
	);
}
function reportResult() {
	if (!hub.active || S.hubResult || S.hubEnded) return;
	S.hubResult = true;
	hub.result({
		score: Math.round(S.score),
		stats: {
			"Pilots recovered": S.rescued,
			"Interceptors destroyed": S.kills,
			"Gates crossed": S.gates,
		},
		awards:
			S.rescued >= 3
				? [
						{
							title: "No one left behind",
							detail: "All three stranded pilots recovered.",
						},
					]
				: [],
	});
}
function showVictory() {
	if (S.attract) {
		resetRun(1986);
		S.attract = true;
		launchSector(0);
		return;
	}
	S.phase = "won";
	storage.remove("stowaways.checkpoint");
	reportResult();
	link.send({ type: "finish", score: S.score });
	radio(
		"FRONTIER CONTROL",
		"All three beacons aboard. The corridor is open. Welcome home, Stowaway.",
	);
	const grade =
		S.metrics.damage < 80 ? "S" : S.metrics.damage < 180 ? "A" : "B";
	mount(
		"victory",
		panel(
			"Everyone comes home.",
			`<div class="medal">✦ / ${grade}</div><p>The carrier is dark. Three pilots are alive to see it. Somewhere on the far side, a station leaves its running lights on.</p><div class="stats"><div><b>${String(S.score).padStart(6, "0")}</b><span>FLIGHT SCORE</span></div><div><b>${S.rescued} / 3</b><span>PILOTS HOME</span></div><div><b>${Math.floor(S.totalTime / 60)}:${String(Math.floor(S.totalTime % 60)).padStart(2, "0")}</b><span>FLIGHT TIME</span></div></div><p id="raceResult" class="smallprint">${S.onlineResult != null ? "WINGMATE SCORE: " + S.onlineResult : "FIVE SECTORS SECURE · " + S.kills + " INTERCEPTORS · " + S.gates + " CLEAN GATES"}</p>${hub.active ? '<p class="smallprint">SCORE TRANSMITTED / WAITING FOR THE WING</p>' : button("Another wrong turn", "new", true) + button("Return to title", "title")}${button("About & credits", "about")}`,
			false,
			"DEBRIEF / CHANNEL OPEN",
			false,
		),
	);
}
function showWing() {
	S.subReturn = "title";
	mount(
		"wing",
		panel(
			"Never fly alone.",
			`<div class="network"><p>Race the same five sectors on two devices. Your wingmate appears as a turquoise ship in the same sector. Each ship rescues its own pilots; highest score wins.</p><p class="smallprint">For 1–4 players, open through AI Hub. Standalone uses a direct two-player link: share codes using your own messenger. Keep both pages open. No account or game server.</p><div class="two-buttons">${button("Create lead code", "net-host", true)}${button("Join with a code", "net-join")}</div><label class="eyebrow" for="flightCode">FLIGHT CODE / ${networkCode ? "YOUR CODE" : "PASTE RECEIVED CODE"}</label><textarea id="flightCode" spellcheck="false" placeholder="SS1.…" aria-label="Flight code">${esc(networkCode)}</textarea><div class="two-buttons">${button("Copy / select code", "net-copy")}${button("Use received code", "net-accept")}</div><div class="network-status" id="netStatus" role="status">${esc(link.status)}</div>${link.connected ? button(link.role === "host" ? "Launch wing race" : "Waiting for lead ship", "net-launch", true, link.role === "host" ? "" : "disabled") : ""}${button("Disconnect wing", "net-close")}<p class="smallprint">Direct links need a route between devices; restrictive NATs may block them. This page includes no relay server.</p></div>`,
			true,
			"WING RACE / DIRECT LINK",
		),
	);
}

const link = new WingLink(
	(data) => {
		if (hub.active) return;
		if (data.type === "begin" && link.role === "guest") {
			resetRun(data.seed);
			launchSector(0);
			notice("WING RACE / CHANNEL OPEN", 2);
		}
		if (data.type === "state") receiveGhost(data, "wingmate");
		if (data.type === "finish") {
			S.onlineResult = Number(data.score) || 0;
			if ($("raceResult"))
				$("raceResult").textContent = "WINGMATE SCORE: " + S.onlineResult;
		}
		if (data.type === "disconnect") {
			for (const g of wingGhosts.values()) view.remove(g.mesh);
			wingGhosts.clear();
		}
	},
	() => {
		if ($("netStatus")) $("netStatus").textContent = link.status;
		if (
			link.connected &&
			S.screen === "wing" &&
			!$("menu").querySelector('[data-action="net-launch"]')
		)
			showWing();
	},
);
function receiveGhost(data, from) {
	if (
		S.hubEnded ||
		!data ||
		!Number.isFinite(data.x) ||
		!Number.isFinite(data.y) ||
		!Number.isFinite(data.score)
	)
		return;
	let g = wingGhosts.get(from);
	if (!g) {
		const p = hub.active ? hub.players?.find((p) => p.id === from) : null;
		g = {
			mesh: view.create("ghost"),
			name: p?.name || "WINGMATE",
			color: p?.color || "#80e0c4",
			x: 0,
			y: 0,
		};
		g.mesh.scale.setScalar(0.62);
		wingGhosts.set(from, g);
	}
	g.tx = clamp(data.x, -30, 30);
	g.ty = clamp(data.y, -20, 20);
	g.score = Math.max(0, data.score);
	g.sector = clamp(Math.floor(data.sector), 0, 4);
	g.alive = data.alive !== false;
	g.last = performance.now();
}
function back() {
	if (S.hubEnded) return;
	if (S.screen === "playing") {
		showPause();
		return;
	}
	if (S.screen === "paused") {
		resume();
		return;
	}
	if (S.screen === "chart") {
		showPause("chart");
		return;
	}
	if (S.screen === "briefing") {
		showTitle();
		return;
	}
	if (S.screen === "title") return;
	if (["defeat", "victory"].includes(S.screen)) return;
	if (S.screen === "dev") {
		showPause();
		return;
	}
	const target = S.subReturn || "title";
	if (target === "paused") showPause();
	else if (target === "briefing") showBriefing();
	else if (target === "defeat") showDefeat();
	else if (target === "victory") showVictory();
	else if (target === "chart") showChart();
	else showTitle();
}
function resume() {
	if (S.returnTo === "chart") {
		showChart();
		return;
	}
	S.screen = "playing";
	$("menu").innerHTML = "";
	$("hud").hidden = false;
	resetInput();
}
async function action(a) {
	audio.menu();
	if (S.hubEnded) return;
	if (a.startsWith("select-")) {
		S.selected = Number(a.slice(7));
		showChart();
		return;
	}
	if (a === "back") {
		back();
		return;
	}
	if (a === "new") {
		if (hub.active) return;
		resetRun(crypto.getRandomValues(new Uint32Array(1))[0]);
		if (link.connected && link.role === "host") {
			link.send({ type: "begin", seed: S.runSeed });
			launchSector(0);
		} else showBriefing();
	}
	if (a === "launch") launchSector(0);
	if (a === "continue") resumeCheckpoint();
	if (a === "jump") {
		if (S.selected <= S.cleared.length) {
			if (S.chartInFlight && S.selected === S.sector && S.phase === "flight") {
				S.chartInFlight = false;
				S.returnTo = "playing";
				resume();
			} else {
				S.chartInFlight = false;
				launchSector(S.selected);
			}
		}
	}
	if (a === "chart") {
		S.chartInFlight = S.phase === "flight";
		S.selected = S.sector;
		showChart();
	}
	if (a === "pause-chart") showPause("chart");
	if (a === "resume") resume();
	if (a === "title" && !hub.active) {
		if (link.connected) link.send({ type: "finish", score: S.score });
		S.attract = false;
		clearEntities();
		showTitle();
	}
	if (a === "settings") showSettings();
	if (a === "controls") showControls();
	if (a === "about") showAbout();
	if (a === "dev") showDev();
	if (a === "wing" && !hub.active) showWing();
	if (a === "motion") {
		settings.motion = !settings.motion;
		saveSettings();
		showSettings("settings");
	}
	if (a === "reset-settings") {
		Object.assign(settings, SETTINGS);
		saveSettings();
		showSettings("settings");
	}
	if (a === "retry") {
		S.player.shield = 100;
		S.player.hull = 100;
		S.player.fuel = Math.max(50, S.player.fuel);
		S.pulses = Math.max(1, S.pulses);
		S.score = Math.max(0, S.score - 500);
		launchSector(S.sector);
	}
	if (a.startsWith("dev-") && !hub.active) {
		if (a === "dev-refill") {
			S.player.shield = S.player.hull = S.player.fuel = 100;
			S.pulses = 2;
			notice("SHIP RESTORED", 1.5);
			showDev();
		}
		if (a === "dev-god") {
			S.god = !S.god;
			showDev();
		}
		if (a === "dev-auto") {
			S.autopilot = !S.autopilot;
			showDev();
		}
		if (a === "dev-restart") launchSector(S.sector);
		if (a === "dev-complete") {
			S.screen = "playing";
			$("menu").innerHTML = "";
			$("hud").hidden = false;
			completeSector();
		}
		if (a === "dev-reset") {
			Object.assign(dev, DEFAULTS);
			showDev();
		}
		if (a === "dev-jump") {
			const i = Number($("dev-sector").value);
			S.cleared = Array.from({ length: i }, (_, n) => n);
			launchSector(i);
		}
	}
	if (a === "net-host" && !networkBusy) {
		networkBusy = true;
		try {
			networkCode = await link.host();
			if (S.screen === "wing") showWing();
		} catch {
		} finally {
			networkBusy = false;
		}
	}
	if (a === "net-join") {
		networkCode = "";
		showWing();
		$("netStatus").textContent =
			"Paste the lead ship code, then choose Use received code.";
		$("flightCode").focus();
	}
	if (a === "net-accept" && !networkBusy) {
		const code = $("flightCode")?.value || "";
		networkBusy = true;
		try {
			if (link.role === "host") {
				await link.accept(code);
			} else {
				networkCode = await link.join(code);
				if (S.screen === "wing") showWing();
			}
		} catch {
		} finally {
			networkBusy = false;
		}
	}
	if (a === "net-copy") {
		const el = $("flightCode");
		el.focus();
		el.select();
		try {
			await navigator.clipboard.writeText(el.value);
			notice("FLIGHT CODE COPIED", 1.5);
		} catch {
			notice("CODE SELECTED · COPY WITH YOUR DEVICE", 2);
		}
	}
	if (a === "net-close") {
		link.close();
		networkCode = "";
		link.say("Wing disconnected. Create a new code to fly together.");
		showWing();
	}
	if (a === "net-launch" && link.connected && link.role === "host") {
		resetRun(crypto.getRandomValues(new Uint32Array(1))[0]);
		link.send({ type: "begin", seed: S.runSeed });
		launchSector(0);
	}
}
function saveSettings() {
	storage.set("stowaways.settings", settings);
	audio.updateSettings();
	updatePrompts();
}
function settingChange(el) {
	if (el.dataset.setting) {
		const k = el.dataset.setting;
		settings[k] = k === "glyphs" ? el.value : Number(el.value) / 100;
		if (el.nextElementSibling?.tagName === "OUTPUT")
			el.nextElementSibling.textContent = k === "glyphs" ? "" : el.value + "%";
		saveSettings();
	}
	if (el.dataset.dev && !hub.active) {
		const k = el.dataset.dev,
			old = dev[k];
		dev[k] = Number(el.value);
		if (k === "enemyHealth")
			for (const e of S.entities)
				if (e.alive && damageable.has(e.type)) {
					e.hp = (e.hp / old) * dev[k];
					e.maxHp = (e.maxHp / old) * dev[k];
				}
		if (el.nextElementSibling) el.nextElementSibling.textContent = el.value;
	}
}
function dead(v) {
	return Math.abs(v) < 0.16 ? 0 : (Math.sign(v) * (Math.abs(v) - 0.16)) / 0.84;
}
function pressed(p, n) {
	return !!(p?.buttons?.[n]?.pressed || p?.buttons?.[n]?.value > 0.5);
}
function adjustFocus(dir) {
	const el = focusables()[focusIndex];
	if (el?.tagName === "INPUT" && el.type === "range") {
		const step = Number(el.step) || 1;
		el.value = clamp(
			Number(el.value) + dir * step,
			Number(el.min),
			Number(el.max),
		);
		settingChange(el);
		return true;
	}
	if (el?.tagName === "SELECT") {
		el.selectedIndex =
			(el.selectedIndex + dir + el.options.length) % el.options.length;
		el.dispatchEvent(new Event("change", { bubbles: true }));
		return true;
	}
	return false;
}
function pollPad() {
	if (S.hubEnded) return;
	const p = [...(navigator.getGamepads?.() || [])].find((p) => p?.connected);
	input.pad = p || null;
	if (!p) {
		input.padPrev = [];
		return;
	}
	const buttons = Array.from({ length: 17 }, (_, i) => pressed(p, i)),
		edge = (i) => buttons[i] && !input.padPrev[i],
		axisActivity = p.axes?.some((v) => Math.abs(v) > 0.2);
	if (axisActivity || buttons.some(Boolean)) {
		if (!audio.ctx) void audio.start();
		if (activity("pad")) {
			input.padPrev = buttons;
			return;
		}
	}
	const now = performance.now();
	const menu = S.screen !== "playing";
	if (menu) {
		const v = (buttons[13] ? 1 : 0) - (buttons[12] ? 1 : 0) + (p.axes[1] || 0);
		const x = (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0) + (p.axes[0] || 0);
		if (now > input.navAt) {
			if (Math.abs(v) > 0.5) {
				moveFocus(Math.sign(v));
				input.navAt = now + 190;
			} else if (Math.abs(x) > 0.5) {
				if (!adjustFocus(Math.sign(x))) moveFocus(Math.sign(x));
				input.navAt = now + 190;
			}
		}
		if (edge(0)) {
			const el = focusables()[focusIndex];
			if (el?.tagName === "BUTTON") el.click();
		}
		if (edge(1)) back();
		if (S.screen === "about" && Math.abs(p.axes[3] || 0) > 0.2)
			$("menu").querySelector(".credits").scrollTop += (p.axes[3] || 0) * 18;
	} else {
		if (edge(4)) usePulse();
		if (edge(3)) action("chart");
	}
	if (edge(9) && !(hub.active && buttons[8])) {
		if (S.screen === "playing") showPause();
		else if (S.screen === "paused") resume();
	}
	input.padPrev = buttons;
}
function installInput() {
	document.addEventListener(
		"click",
		(e) => {
			if (performance.now() < ignoreClickUntil) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		true,
	);
	document.addEventListener("keydown", (e) => {
		if (S.hubEnded) return;
		void audio.start();
		const wasAttract = activity("keyboard");
		if (wasAttract) {
			e.preventDefault();
			return;
		}
		const editing = ["TEXTAREA", "INPUT", "SELECT"].includes(e.target.tagName);
		if (editing && e.code !== "Escape") return;
		if (e.code === "Escape") {
			e.preventDefault();
			back();
			return;
		}
		if (S.screen === "playing") {
			if (
				[
					"Space",
					"Tab",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
				].includes(e.code)
			)
				e.preventDefault();
			input.keys.add(e.code);
			if (!e.repeat && e.code === "KeyQ") usePulse();
			if (!e.repeat && e.code === "Tab") action("chart");
		} else {
			const scroll = e.target.classList?.contains("credits");
			if (
				!scroll &&
				["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.code)
			) {
				e.preventDefault();
				if (e.code === "ArrowDown") moveFocus(1);
				if (e.code === "ArrowUp") moveFocus(-1);
				if (e.code === "ArrowLeft" && !adjustFocus(-1)) moveFocus(-1);
				if (e.code === "ArrowRight" && !adjustFocus(1)) moveFocus(1);
			}
			if (e.code === "Enter" || e.code === "Space") {
				if (e.target.classList?.contains("credits")) return;
				e.preventDefault();
				const el = focusables()[focusIndex];
				if (el?.tagName === "BUTTON") el.click();
			}
		}
	});
	document.addEventListener("keyup", (e) => input.keys.delete(e.code));
	document.addEventListener("contextmenu", (e) => e.preventDefault());
	document.addEventListener("pointerdown", (e) => {
		if (S.hubEnded) return;
		void audio.start();
		if (activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
			e.preventDefault();
			return;
		}
		if (
			S.screen !== "playing" ||
			e.target.closest("button,input,select,textarea")
		)
			return;
		if (e.pointerType === "touch") {
			const t = { id: e.pointerId, x: e.clientX, y: e.clientY };
			if (e.clientX < innerWidth * 0.5) input.touchLeft = t;
			else input.touchRight = t;
			e.target.setPointerCapture?.(e.pointerId);
		} else {
			if (e.button === 0) input.mouseFire = true;
			if (e.button === 2) input.mouseTractor = true;
		}
	});
	document.addEventListener("pointermove", (e) => {
		if (S.hubEnded) return;
		if (e.pointerType === "touch") {
			if (input.touchLeft?.id === e.pointerId) {
				input.touchX = clamp((e.clientX - input.touchLeft.x) / 65, -1, 1);
				input.touchY = clamp((e.clientY - input.touchLeft.y) / 65, -1, 1);
			}
			if (input.touchRight?.id === e.pointerId) {
				input.aimX = clamp((e.clientX - input.touchRight.x) / 180, -0.85, 0.85);
				input.aimY = clamp(
					-(e.clientY - input.touchRight.y) / 180,
					-0.85,
					0.85,
				);
			}
			return;
		}
		if (
			Math.abs(e.movementX) + Math.abs(e.movementY) > 1 &&
			activity("keyboard")
		)
			return;
		if (S.screen === "playing") {
			input.aimX = clamp((e.clientX / innerWidth) * 2 - 1, -0.88, 0.88);
			input.aimY = clamp(1 - (e.clientY / innerHeight) * 2, -0.88, 0.88);
		}
	});
	const up = (e) => {
		if (input.touchLeft?.id === e.pointerId) {
			input.touchLeft = null;
			input.touchX = input.touchY = 0;
		}
		if (input.touchRight?.id === e.pointerId) input.touchRight = null;
		if (e.pointerType !== "touch") {
			if (e.button === 0) input.mouseFire = false;
			if (e.button === 2) input.mouseTractor = false;
		}
	};
	document.addEventListener("pointerup", up);
	document.addEventListener("pointercancel", up);
	window.addEventListener("blur", resetInput);
	$("menu").addEventListener("click", (e) => {
		const el = e.target.closest("[data-action]");
		if (el && !el.disabled) void action(el.dataset.action);
	});
	$("menu").addEventListener("pointerover", (e) => {
		const el = e.target.closest('button,input,select,textarea,[tabindex="0"]');
		if (el) {
			const i = focusables().indexOf(el);
			if (i >= 0) refreshFocus(i);
		}
	});
	$("menu").addEventListener("input", (e) => settingChange(e.target));
	$("menu").addEventListener("change", (e) => {
		if (e.target.tagName === "SELECT") settingChange(e.target);
	});
	$("pauseButton").onclick = () => showPause();
	$("touchAction").addEventListener("pointerdown", (e) => {
		e.preventDefault();
		input.touchTractor = true;
	});
	const releaseTractor = () => (input.touchTractor = false);
	$("touchAction").addEventListener("pointerup", releaseTractor);
	$("touchAction").addEventListener("pointercancel", releaseTractor);
	window.addEventListener("resize", () => view.resize());
	document.addEventListener("visibilitychange", () => {
		if (
			document.hidden &&
			!hub.active &&
			S.screen === "playing" &&
			!S.attract &&
			!manual
		)
			showPause();
	});
}

async function setupHub() {
	if (!hub.active) return false;
	hub.on("start", () => {
		S.hubStarted = true;
	});
	hub.on("message", (data, from) => {
		if (data?.kind === "wing") receiveGhost(data, from);
	});
	hub.on("leave", ({ id }) => {
		const g = wingGhosts.get(id);
		if (g) view.remove(g.mesh);
		wingGhosts.delete(id);
	});
	hub.on("time-up", () => reportResult());
	hub.on("end", () => {
		S.hubEnded = true;
		S.screen = "hub-end";
		resetInput();
		audio.setMuted(true);
		$("menu").innerHTML = "";
		$("hud").hidden = true;
	});
	const info = await hub.connect({ mode: "ghost", seats: [1, 4] });
	if (!info) return false;
	mount(
		"hub-wait",
		`<section class="briefing"><div><span class="eyebrow">WING RACE / SIGNAL ACQUIRED</span><h2>Hold for<br>the channel.</h2><p>Bring the lost ones home. Your wing is forming.</p></div></section>`,
	);
	hub.ready();
	return true;
}
function tickNetwork(dt) {
	if (S.hubEnded) return;
	if (hub.active) {
		if (S.hubStarted && !S.launchedByHub && hub.time() >= 0) {
			S.launchedByHub = true;
			resetRun(hub.seed);
			launchSector(0);
		}
		if (!S.launchedByHub) return;
		hubClock += dt;
		if (hubClock >= 0.7) {
			hubClock = 0;
			hub.progress({
				score: Math.round(S.score),
				label: `${S.rescued}/3 pilots · ${SECTORS[S.sector].name}`,
			});
		}
	}
	netClock += dt;
	if (netClock >= 0.11 && ((hub.active && S.launchedByHub) || link.connected)) {
		netClock = 0;
		const data = {
			kind: "wing",
			type: "state",
			sector: S.sector,
			x: S.player.x,
			y: S.player.y,
			score: Math.round(S.score),
			alive: S.player.hull > 0,
		};
		if (hub.active) hub.send(data, { reliable: false });
		else link.send(data);
	}
}
function startAttract() {
	if (hub.active || S.screen !== "title") return;
	void audio.start();
	resetRun(1986);
	S.attract = true;
	launchSector(0);
}
let previous = performance.now();
function frame(now) {
	if (!ready) return;
	const dt = Math.min(0.05, Math.max(0.001, (now - previous) / 1000));
	previous = now;
	pollPad();
	tickNetwork(dt);
	if (!manual) simulate(dt);
	if (S.screen === "title" && now - lastActivity > 10000) startAttract();
	audio.tick(S.screen === "playing");
	view.flash = Math.max(0, view.flash - dt * 2);
	$("wash").style.opacity = settings.motion ? view.flash * 0.3 : 0;
	if (now > noticeUntil) $("notice").classList.remove("show");
	S.motion = settings.motion;
	if (!settings.motion) {
		S.moveX = 0;
	}
	view.update(dt, S);
	S.metrics.renderFrames++;
	for (const g of wingGhosts.values()) {
		g.x += (g.tx - g.x) * Math.min(1, dt * 8);
		g.y += (g.ty - g.y) * Math.min(1, dt * 8);
		g.mesh.position.set(g.x, g.y, -9);
		g.mesh.rotation.z = (g.tx - g.x) * -0.06;
		g.mesh.visible =
			S.screen === "playing" &&
			g.sector === S.sector &&
			g.alive &&
			now - g.last < 5000;
	}
	drawTargets();
	uiClock += dt;
	if (uiClock > 0.08) {
		uiClock = 0;
		updateHUD();
	}
	requestAnimationFrame(frame);
}
function snapshot() {
	return {
		ready,
		screen: S.screen,
		sector: S.sector,
		elapsed: S.elapsed,
		totalTime: S.totalTime,
		phase: S.phase,
		score: S.score,
		kills: S.kills,
		rescued: S.rescued,
		gates: S.gates,
		cleared: [...S.cleared],
		player: { ...S.player },
		aim: { ...S.aim },
		heat: S.heat,
		overheat: S.overheat,
		pulses: S.pulses,
		attract: S.attract,
		autopilot: S.autopilot,
		god: S.god,
		settings: { ...settings },
		balance: { ...dev },
		input: input.last,
		connected: link.connected,
		wingCount: wingGhosts.size,
		hub: !!hub.active,
		hubEnded: S.hubEnded,
		warning: S.warning ? { ...S.warning } : null,
		sectorHistory: [...S.sectorHistory],
		metrics: { ...S.metrics },
		audio: {
			state: audio.ctx?.state || "locked",
			level: audio.level(),
			events: { ...audio.events },
		},
		renderer: view.backend,
		animationMixers: view.mixers.length,
		physicsVersion: RAPIER.version(),
		entities: S.entities
			.filter((e) => e.alive)
			.map(({ id, type, x, y, z, hp, maxHp, locked, pull }) => ({
				id,
				type,
				x,
				y,
				z,
				hp,
				maxHp,
				locked,
				pull,
			})),
	};
}
async function init() {
	await RAPIER.init();
	await view.init();
	ready = true;
	installInput();
	window.__solar = {
		snapshot,
		action,
		renderPixels: () => view.pixels(),
		loseGraphicsDevice() {
			if (!hub.active) view.device?.destroy();
		},
		advance(seconds, controls = null) {
			for (let t = 0; t < seconds; t += 1 / 60)
				simulate(Math.min(1 / 60, seconds - t), controls);
			updateHUD();
			return snapshot();
		},
		startAttract,
		damage: damagePlayer,
		spawn,
		link,
		audio,
		settings,
		balance: dev,
		setManual(v) {
			manual = v;
		},
		setPlayer(values) {
			if (hub.active) return;
			for (const k of ["x", "y", "shield", "hull", "fuel"])
				if (Number.isFinite(values[k])) S.player[k] = values[k];
		},
		setAutopilot(v) {
			if (!hub.active) S.autopilot = v;
		},
		setGod(v) {
			if (!hub.active) S.god = v;
		},
		projectEntity(id) {
			const e = S.entities.find((e) => e.id === id);
			return e ? view.project(e) : null;
		},
		setSeed(seed) {
			if (!hub.active) S.runSeed = seed;
		},
		debugState: S,
	};
	resetPhysics();
	const session = await setupHub();
	if (!session) showTitle();
	$("loading").hidden = true;
	previous = performance.now();
	requestAnimationFrame(frame);
}
init().catch((e) => {
	console.error(e);
	$("loadStatus").textContent = "FLIGHT COMPUTER OFFLINE · " + e.message;
	$("loading").querySelector("i").style.background = "#ff775c";
	if (hub.active) hub.fail(e.message);
	window.__solarError = e.message;
});
