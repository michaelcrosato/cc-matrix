import * as THREE from "three/webgpu";
import { color, normalWorld, vec3, dot, float } from "three/tsl";
import RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm";
import { createCity, createHero, createCitizen } from "./art.js";
import { AudioSystem, offlineTest } from "./audio.js";
import { OnlineLink } from "./hub.js";
import { createExtras } from "./extras.js";

const $ = (s) => document.querySelector(s),
	clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
	V = THREE.Vector3;
const DEFAULTS = {
	flightSpeed: 30,
	boostSpeed: 68,
	freezePower: 1,
	damage: 1,
	solarRegen: 7,
};
const tuning = { ...DEFAULTS },
	settings = {
		music: 0.1,
		sfx: 0.65,
		glyphs: "ps",
		sensitivity: 1,
		invert: false,
	};
const audio = new AudioSystem();
let renderer,
	scene,
	camera,
	world,
	city,
	controller,
	ready = false,
	mode = "title",
	modalPage = "",
	previousMode = "title",
	lastInput = "keyboard",
	lastActivity = performance.now(),
	clock = 0,
	simTime = 0,
	frameCount = 0,
	dtLast = 0.016;
let yaw = 0,
	pitch = 0.12,
	focusIndex = 0,
	menuCooldown = 0,
	gamepadPrev = [],
	demo = false,
	localCoop = false,
	cameraShake = 0,
	runId = 0,
	lastSave = 0,
	chapterUntil = 0,
	subtitleUntil = 0,
	toastUntil = 0,
	netState = null,
	networkTicker = 0,
	hiddenPaused = false;
let mission = 0,
	rescued = 0,
	fireProgress = 0,
	tramProgress = 0,
	hope = 100,
	score = 0,
	runTime = 0,
	finished = false,
	missionStarts = [0, 0, 0, 0],
	freezeHits = 0,
	punches = 0,
	collisionCount = 0;
const actors = new Map(),
	remoteInputs = new Map(),
	keys = new Set(),
	pointers = new Map(),
	effects = [],
	drones = [],
	bolts = [],
	citizens = [],
	fireMeshes = [],
	nodes = [],
	rings = [];
let tram,
	helicopter,
	boss,
	safeRing,
	freezeBeam,
	freezeGlow,
	mouseHeld = false,
	mouseAction = false,
	touchAction = false,
	touchMove = { x: 0, y: 0 },
	touchLook = { x: 0, y: 0 },
	touchStart = {},
	touchEnabled = matchMedia("(pointer:coarse)").matches;
let extras,
	bridgeDone = [false, false, false],
	bonusIdentity = false;
const TEST = new URLSearchParams(location.search).has("test");
const tmp = new V(),
	target = new V(),
	dir = new V(),
	camTarget = new V();
const COLORS = [0x237fb2, 0x49a78f, 0x8658a6, 0xcb753c];
const quest = [
	{
		kicker: "01 / HOLD THE FRONT PAGE",
		title: "Someone needs a lift.",
		detail:
			"Three people are stranded on the news chopper. Carry each to the golden ring in Civic Square.",
		headline: "A LITTLE LIFT",
		copy: "The evening edition can wait. These people cannot.",
		voice: "EDITOR",
		line: "Our traffic report has become the traffic. Get those people down, sunshine!",
	},
	{
		kicker: "02 / A COOL HEAD",
		title: "A little less heat.",
		detail:
			"The Evening Sun is living up to its name. Hold freeze breath near the rooftop flames.",
		headline: "HOT OFF THE PRESS",
		copy: "A cool head is a remarkably useful superpower.",
		voice: "HERO",
		line: "A newspaper should be hot off the press. The whole building? That seems excessive.",
	},
	{
		kicker: "03 / RIGHT ON TRACK",
		title: "Next stop: absolutely here.",
		detail:
			"Catch the runaway tram on the east–west line. Stay close and hold your strength action to brake.",
		headline: "PLEASE MIND THE CAPE",
		copy: "One runaway tram. A city full of very breakable things.",
		voice: "CONDUCTOR",
		line: "The brakes have retired early! Might you put in a good word with momentum?",
	},
	{
		kicker: "04 / THE LAST WORD",
		title: "Give the sun back.",
		detail:
			"Freeze each green emitter until brittle, then punch it. Dodge the drones. Three emitters, one very bad idea.",
		headline: "A BRIGHTER TOMORROW",
		copy: "Doctor Dusk has filed a rather aggressive sunset proposal.",
		voice: "DOCTOR DUSK",
		line: "I own the skyline! Surely that includes everything above it?",
	},
];

const online = new OnlineLink({
	onRole(role, info) {
		updateNetworkLabel();
		if (ready && online.playing) {
			for (const p of online.players)
				if (!actors.has(String(p.id)))
					addActor(String(p.id), new V(actors.size * 5, 14, 65));
		}
	},
	onStatus(s) {
		updateNetworkLabel(s);
	},
	onStart() {
		if (ready) {
			if (online.active) startHub();
			else {
				prepareNetworkActors();
				startGame(false);
			}
		}
	},
	onInput(input, id) {
		if (ready && !actors.has(String(id)))
			addActor(String(id), new V(5, 14, 65));
		remoteInputs.set(String(id), { ...input, at: performance.now() });
	},
	onState(s) {
		netState = s;
		if (ready && online.role === "guest") applySnapshot(s);
	},
	onLeave(id) {
		removeActor(String(id));
	},
	onTimeUp() {
		if (!finished) finish(false, "The final edition has gone to print.");
	},
	onEnd(reason) {
		mode = "ended";
		demo = false;
		audio.suspend();
		showSessionEnd(reason);
	},
	onRoundEnd(result) {
		if (online.role === "guest") {
			finished = true;
			mode = "victory";
			showResults(result?.won !== false);
		}
	},
});

const toonCache = new WeakMap();
function toon(root) {
	root.traverse((o) => {
		if (
			!o.isMesh ||
			!o.material ||
			Array.isArray(o.material) ||
			!o.material.isMeshStandardMaterial
		)
			return;
		const old = o.material;
		if (old.map) return;
		if (toonCache.has(old)) {
			o.material = toonCache.get(old);
			return;
		}
		const m = new THREE.MeshBasicNodeMaterial({
			side: old.side,
			transparent: old.transparent,
			opacity: old.opacity,
		});
		const l = dot(normalWorld, vec3(-0.45, 0.85, 0.35))
			.max(0)
			.mul(3)
			.floor()
			.div(3)
			.mul(0.42)
			.add(0.58);
		m.colorNode = color(old.color).mul(l);
		toonCache.set(old, m);
		o.material = m;
	});
}
function material(c, emissive = 0) {
	return new THREE.MeshStandardMaterial({
		color: c,
		roughness: 0.85,
		flatShading: true,
		emissive,
		emissiveIntensity: 0.4,
	});
}
function mesh(geo, mat, p, parent = scene) {
	const m = new THREE.Mesh(geo, mat);
	m.position.copy(p);
	parent.add(m);
	return m;
}
function box(w, h, d, c, p, parent) {
	const m = mesh(new THREE.BoxGeometry(w, h, d), material(c), p, parent);
	const e = new THREE.LineSegments(
		new THREE.EdgesGeometry(m.geometry),
		new THREE.LineBasicMaterial({ color: 0x16384a }),
	);
	m.add(e);
	return m;
}
function ring(pos, r = 8, c = 0xffcf60) {
	const g = new THREE.Group();
	g.position.copy(pos);
	scene.add(g);
	const tor = mesh(
		new THREE.TorusGeometry(r, 0.22, 6, 64),
		new THREE.MeshBasicMaterial({ color: c }),
		new V(),
		g,
	);
	tor.rotation.x = -Math.PI / 2;
	const glow = mesh(
		new THREE.CylinderGeometry(r, r, 0.05, 48),
		new THREE.MeshBasicMaterial({
			color: c,
			transparent: true,
			opacity: 0.13,
			side: THREE.DoubleSide,
		}),
		new V(),
		g,
	);
	rings.push(g);
	return g;
}
function makeWorld() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x8fc8c7);
	scene.fog = new THREE.Fog(0xaacfc3, 155, 520);
	camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.15, 850);
	scene.add(new THREE.HemisphereLight(0xffedc2, 0x537a87, 2));
	const sun = new THREE.DirectionalLight(0xffdda0, 3);
	sun.position.set(-90, 170, 80);
	scene.add(sun);
	city = createCity(scene);
	toon(city.group);
	extras = createExtras(scene);
	toon(extras.booth);
	extras.bridgePieces.forEach(toon);
	world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
	for (const c of city.colliders) {
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz)
				.setTranslation(c.x, c.y, c.z)
				.setFriction(0.1),
		);
	}
	controller = world.createCharacterController(0.12);
	controller.setSlideEnabled(true);
	controller.setMaxSlopeClimbAngle(Math.PI / 3);
	controller.setMinSlopeSlideAngle(Math.PI / 3);
	safeRing = ring(new V(0, 0.9, 65), 12);
	safeRing.visible = false;
	// A chopper hanging by the last scrap of a very respectable evening.
	helicopter = new THREE.Group();
	helicopter.position.set(42, 52, -58);
	scene.add(helicopter);
	box(10, 4, 4, 0xf1d29a, new V(), helicopter);
	box(4, 3.3, 3.7, 0x355d6d, new V(3, 0, 0), helicopter);
	box(11, 0.6, 0.7, 0xd65343, new V(-9, 0.5, 0), helicopter);
	box(0.5, 5, 2, 0xd65343, new V(-14, 2, 0), helicopter);
	for (const z of [-2.3, 2.3]) {
		box(10, 0.25, 0.25, 0x264554, new V(0, -3, z), helicopter);
		box(0.2, 2, 0.2, 0x264554, new V(-2, -2, z), helicopter);
	}
	const rotor = box(19, 0.1, 0.4, 0x18394a, new V(0, 3, 0), helicopter);
	helicopter.userData.rotor = rotor;
	helicopter.rotation.z = 0.15;
	toon(helicopter);
	for (let i = 0; i < 3; i++) {
		const group = createCitizen();
		group.position.set(36 + i * 6, 48 + i * 0.7, -53);
		scene.add(group);
		toon(group);
		citizens.push({ group, status: "waiting", index: i });
		ring(
			group.position.clone().add(new V(0, -0.2, 0)),
			2.5,
			0xffdf77,
		).userData.citizen = i;
	}
	for (let i = 0; i < 18; i++) {
		const f = mesh(
			new THREE.ConeGeometry(1.4 + (i % 3) * 0.6, 5 + (i % 5), 5),
			new THREE.MeshBasicMaterial({
				color: i % 2 ? 0xffa536 : 0xe55a38,
				transparent: true,
				opacity: 0.9,
			}),
			new V(-75 + (i % 6) * 4, 34 + (i % 3), -47 + Math.floor(i / 6) * 6),
		);
		fireMeshes.push(f);
	}
	tram = new THREE.Group();
	scene.add(tram);
	box(13, 5, 4.8, 0xe3bf66, new V(0, 3, 0), tram);
	box(14, 0.5, 5.5, 0xb94536, new V(0, 5.7, 0), tram);
	box(13, 1, 5, 0xa54637, new V(0, 0.8, 0), tram);
	for (let x = -4.5; x < 6; x += 3) {
		for (const z of [-2.43, 2.43])
			box(2, 2, 0.12, 0x325b66, new V(x, 3.6, z), tram);
	}
	for (const x of [-4, 4])
		for (const z of [-2.3, 2.3]) {
			const w = mesh(
				new THREE.CylinderGeometry(0.8, 0.8, 0.5, 10),
				material(0x213c48),
				new V(x, 0.5, z),
				tram,
			);
			w.rotation.x = Math.PI / 2;
		}
	tram.position.set(-92, 0.7, 35);
	toon(tram);
	boss = new THREE.Group();
	boss.position.set(0, 55, -145);
	scene.add(boss);
	mesh(new THREE.IcosahedronGeometry(9, 1), material(0x314a57), new V(), boss);
	const tor = mesh(
		new THREE.TorusGeometry(14, 1, 8, 60),
		material(0xc58b4f),
		new V(),
		boss,
	);
	tor.rotation.x = Math.PI / 2;
	boss.userData.torus = tor;
	const core = mesh(
		new THREE.IcosahedronGeometry(5, 1),
		new THREE.MeshBasicMaterial({ color: 0xffdb75 }),
		new V(0, 1, 0),
		boss,
	);
	boss.userData.core = core;
	for (let i = 0; i < 3; i++) {
		const a = (i / 3) * Math.PI * 2;
		const g = new THREE.Group();
		g.position.set(Math.sin(a) * 21, Math.cos(a) * 4, Math.cos(a) * 21);
		boss.add(g);
		const connector = box(2, 2, 19, 0x365b65, new V(0, 0, -9.5), g);
		connector.rotation.y = a;
		mesh(
			new THREE.IcosahedronGeometry(3.3, 0),
			material(0x79cf7e, 0x468558),
			new V(),
			g,
		);
		const r = mesh(
			new THREE.TorusGeometry(4.7, 0.35, 5, 24),
			material(0xecc16a),
			new V(),
			g,
		);
		g.userData.ring = r;
		nodes.push({ group: g, freeze: 0, broken: false, hp: 1 });
	}
	toon(boss);
	for (const n of nodes) {
		n.crystal = n.group.children.find(
			(c) => c.isMesh && c.geometry.type === "IcosahedronGeometry",
		);
		n.crystal.material = new THREE.MeshBasicMaterial({ color: 0x79cf7e });
	}
	boss.visible = false;
	for (let i = 0; i < 6; i++) {
		const g = new THREE.Group();
		mesh(new THREE.OctahedronGeometry(1.8), material(0x38545b), new V(), g);
		box(5, 0.35, 0.6, 0xa94e43, new V(), g);
		mesh(
			new THREE.SphereGeometry(0.5, 8, 6),
			new THREE.MeshBasicMaterial({ color: 0x96ee99 }),
			new V(0, 0, 1.4),
			g,
		);
		scene.add(g);
		toon(g);
		g.visible = false;
		drones.push({
			group: g,
			phase: (i * Math.PI) / 3,
			cooldown: i * 0.6,
			disabled: 0,
		});
	}
	freezeBeam = mesh(
		new THREE.CylinderGeometry(0.12, 0.8, 1, 8, 1, true),
		new THREE.MeshBasicMaterial({
			color: 0xb5faff,
			transparent: true,
			opacity: 0.45,
			side: THREE.DoubleSide,
		}),
		new V(),
	);
	freezeBeam.visible = false;
	freezeGlow = new THREE.PointLight(0x8dffff, 30, 25);
	scene.add(freezeGlow);
	freezeGlow.visible = false;
	addActor("local", new V(0, 14, 65));
	camera.position.set(22, 27, 98);
	camera.lookAt(0, 17, 55);
}
function addActor(id, pos) {
	if (actors.has(id)) return actors.get(id);
	const n = actors.size % 4,
		art = createHero(COLORS[n], n === 1 ? 0xf1bd58 : 0xd95043);
	toon(art.group);
	scene.add(art.group);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			pos.x,
			pos.y,
			pos.z,
		),
	);
	const collider = world.createCollider(
		RAPIER.ColliderDesc.capsule(1, 0.65),
		body,
	);
	const a = {
		id,
		art,
		body,
		collider,
		pos: pos.clone(),
		velocity: new V(),
		yaw: 0,
		energy: 100,
		carry: -1,
		actionCooldown: 0,
		points: 0,
		input: {},
		boosting: false,
		freezing: false,
		reporter: false,
		bridgeCarry: -1,
		boothLatch: false,
	};
	a.reporterMesh = createCitizen();
	a.reporterMesh.scale.setScalar(1.3);
	toon(a.reporterMesh);
	scene.add(a.reporterMesh);
	a.reporterMesh.visible = false;
	art.group.position.copy(pos);
	actors.set(id, a);
	return a;
}
function removeActor(id) {
	const a = actors.get(id);
	if (!a) return;
	scene.remove(a.art.group);
	scene.remove(a.reporterMesh);
	world.removeRigidBody(a.body);
	if (a.carry >= 0) {
		citizens[a.carry].status = "waiting";
		a.carry = -1;
	}
	actors.delete(id);
}
function localId() {
	return online.active || online.role !== "solo" ? String(online.me) : "local";
}
function primary() {
	return actors.get(localId()) || actors.values().next().value;
}
function resetState() {
	mission = 0;
	rescued = 0;
	fireProgress = 0;
	tramProgress = 0;
	hope = 100;
	score = 0;
	runTime = 0;
	finished = false;
	freezeHits = 0;
	punches = 0;
	missionStarts = [0, 0, 0, 0];
	bridgeDone = [false, false, false];
	bonusIdentity = false;
	[
		[-115, 3, 115],
		[-85, 7, 95],
		[-120, 4, 5],
	].forEach((p, i) => extras.bridgePieces[i].position.fromArray(p));
	for (const n of nodes) {
		n.freeze = 0;
		n.broken = false;
		n.group.visible = true;
	}
	citizens.forEach((c, i) => {
		c.status = "waiting";
		c.group.visible = true;
		c.group.position.set(36 + i * 6, 48 + i * 0.7, -53);
	});
	drones.forEach((d) => {
		d.disabled = 0;
		d.cooldown = 2;
	});
	for (const a of actors.values()) {
		a.carry = -1;
		a.bridgeCarry = -1;
		a.reporter = false;
		a.art.group.visible = true;
		a.reporterMesh.visible = false;
		a.energy = 100;
		a.velocity.set(0, 0, 0);
		teleport(
			a,
			new V(actors.size > 1 ? (a.id === "local" ? 0 : 5) : 0, 14, 65),
		);
	}
	bolts.forEach((b) => scene.remove(b.mesh));
	bolts.length = 0;
	fireMeshes.forEach((f) => (f.visible = true));
	tram.position.set(-92, 0.7, 35);
	boss.visible = false;
	safeRing.visible = true;
	runId++;
}
function startGame(isDemo = false) {
	if (!ready || (online.active && mode === "ended")) return;
	demo = isDemo;
	mode = isDemo ? "demo" : "playing";
	modalPage = "";
	$("#modal").classList.add("hidden");
	$("#title").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	$("#demo-banner").classList.toggle("hidden", !demo);
	$("#demo-bottom").classList.toggle("hidden", !demo);
	if (!online.active && online.role === "solo") {
		for (const id of [...actors.keys()])
			if (id !== "local" && !(localCoop && id === "couch")) removeActor(id);
		if (!actors.has("local")) addActor("local", new V(0, 14, 65));
		if (localCoop) addActor("couch", new V(6, 14, 65));
	}
	resetState();
	yaw = 0;
	pitch = 0.12;
	if (!isDemo) {
		audio.start();
		chapterCard(0);
	}
	updateObjective();
	lastActivity = performance.now();
}
function prepareNetworkActors() {
	for (const id of [...actors.keys()]) removeActor(id);
	for (const p of online.players)
		addActor(String(p.id), new V(actors.size * 5, 14, 65));
}
function startHub() {
	for (const id of [...actors.keys()]) removeActor(id);
	for (const p of online.players) {
		const id = String(typeof p === "object" ? p.id : p);
		addActor(id, new V(actors.size * 5, 14, 65));
	}
	if (!actors.size && !online.server)
		addActor(String(online.me), new V(0, 14, 65));
	startGame(false);
	if (online.role === "guest" && netState) applySnapshot(netState);
}
function title() {
	if (online.active) return;
	mode = "title";
	demo = false;
	modalPage = "";
	$("#modal").classList.add("hidden");
	$("#title").classList.remove("hidden");
	$("#hud").classList.add("hidden");
	$("#demo-banner").classList.add("hidden");
	$("#demo-bottom").classList.add("hidden");
	$("#chapter").classList.add("hidden");
	$("#context").classList.add("hidden");
	$("#touchAction").style.display = "none";
	$("#touchHint").classList.add("hidden");
	$("#subtitle").classList.add("hidden");
	$("#toast").classList.add("hidden");
	freezeBeam.visible = false;
	lastActivity = performance.now();
	audio.update(0.01, { playing: false });
	setFocus(0);
}
function chapterCard(i) {
	const q = quest[i];
	$("#chapterNumber").textContent =
		`THE EVENING SUN · CHAPTER ${["I", "II", "III", "IV"][i]}`;
	$("#chapterTitle").textContent = q.headline;
	$("#chapterCopy").textContent = q.copy;
	$("#chapter").classList.remove("hidden");
	chapterUntil = clock + 3.1;
	subtitle(q.voice, q.line, 7);
	audio.voice(i + 1);
}
function subtitle(who, line, duration = 5) {
	$("#subtitle").innerHTML = `<b>${who}</b> &nbsp; ${line}`;
	$("#subtitle").classList.remove("hidden");
	subtitleUntil = clock + duration;
}
function toast(line, duration = 2) {
	$("#toast").textContent = line;
	$("#toast").classList.remove("hidden");
	toastUntil = clock + duration;
}
function updateObjective() {
	const q = quest[Math.min(mission, 3)];
	$("#chapterLabel").textContent = finished ? "THE EXTRA EDITION" : q.kicker;
	$("#objectiveTitle").textContent = finished
		? bridgeDone.every(Boolean)
			? "An ordinary good citizen."
			: "One more good turn."
		: q.title;
	$("#objectiveDetail").textContent = finished
		? bridgeDone.every(Boolean)
			? "Find the red telephone booth by Civic Square. Even a hero has an evening edition to file."
			: "Bonus: collect three golden bridge trusses and carry each to its matching river socket."
		: q.detail;
	$("#task-progress").textContent = finished
		? `${bridgeDone.filter(Boolean).length} / 3 BRIDGE TRUSSES · ${score.toLocaleString()} PTS`
		: mission === 0
			? `${rescued} / 3 CITIZENS SAFE`
			: mission === 1
				? `${Math.floor(fireProgress * 100)}% COOLED`
				: mission === 2
					? `${Math.floor(tramProgress * 100)}% BRAKED`
					: `${nodes.filter((n) => n.broken).length} / 3 EMITTERS DISMANTLED`;
}
function advance() {
	if (mission < 3) {
		score += 500;
		mission++;
		missionStarts[mission] = runTime;
		audio.sfx("success");
		updateObjective();
		if (!demo) chapterCard(mission);
		else toast(quest[mission].headline, 2);
		if (mission === 3) boss.visible = true;
	} else finish(true);
}
function finish(won, line) {
	if (finished) return;
	finished = true;
	score += won ? Math.round(hope * 20) + 1500 : 0;
	audio.sfx(won ? "success" : "failure");
	if (online.active || online.connected)
		online.finish({
			score,
			won,
			stats: {
				rescues: rescued,
				hope: Math.round(hope),
				seconds: Math.round(runTime),
			},
		});
	if (demo) {
		toast("THE CITY GETS ANOTHER TOMORROW.", 4);
		lastSave = clock;
		return;
	}
	mode = won ? "victory" : "failure";
	showResults(won, line);
}
function teleport(a, p) {
	a.pos.copy(p);
	a.body.setTranslation(p, true);
	a.body.setNextKinematicTranslation(p);
	a.art.group.position.copy(p);
	a.velocity.set(0, 0, 0);
}
function targetFor(a) {
	if (finished) {
		if (a.bridgeCarry >= 0) return extras.repairSockets[a.bridgeCarry].clone();
		const piece = extras.bridgePieces
			.filter(
				(g, i) =>
					!bridgeDone[i] &&
					![...actors.values()].some((h) => h.bridgeCarry === i),
			)
			.sort(
				(g, h) => g.position.distanceTo(a.pos) - h.position.distanceTo(a.pos),
			)[0];
		return piece
			? piece.position.clone()
			: !bonusIdentity
				? extras.booth.position.clone().add(new V(0, 1, 0))
				: null;
	}
	if (mission === 0) {
		if (a.carry >= 0) return new V(0, 5, 65);
		const available = citizens.filter((c) => c.status === "waiting");
		available.sort(
			(c, d) =>
				c.group.position.distanceTo(a.pos) - d.group.position.distanceTo(a.pos),
		);
		return (
			available[0]?.group.position.clone().add(new V(0, 1, 0)) ||
			new V(0, 5, 65)
		);
	}
	if (mission === 1) return new V(-65, 36, -40);
	if (mission === 2) return tram.position.clone().add(new V(0, 3, 0));
	const n = nodes
		.filter((n) => !n.broken)
		.sort(
			(c, d) =>
				c.group.getWorldPosition(new V()).distanceTo(a.pos) -
				d.group.getWorldPosition(new V()).distanceTo(a.pos),
		)[0];
	return n?.group.getWorldPosition(new V());
}
function inputEmpty() {
	return {
		x: 0,
		z: 0,
		y: 0,
		boost: false,
		action: false,
		freeze: false,
		yaw,
		pitch,
	};
}
function keyboardInput() {
	let x = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
		z = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
		y =
			(keys.has("Space") ? 1 : 0) -
			(keys.has("ControlLeft") || keys.has("KeyC") ? 1 : 0);
	return {
		x,
		z,
		y,
		boost: keys.has("ShiftLeft") || keys.has("ShiftRight"),
		action: keys.has("KeyE") || mouseAction,
		freeze: keys.has("KeyQ") || mouseHeld,
		yaw,
		pitch,
	};
}
function padInput(p) {
	if (!p) return inputEmpty();
	const dead = (v) => (Math.abs(v) > 0.15 ? v : 0),
		b = (i) => !!p.buttons[i]?.pressed;
	return {
		x: dead(p.axes[0] || 0),
		z: -dead(p.axes[1] || 0),
		y: (b(0) ? 1 : 0) - (b(1) ? 1 : 0),
		boost: b(7),
		action: b(2) || b(5),
		freeze: b(6) || b(4),
		yaw,
		pitch,
	};
}
function readInputs(dt) {
	const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	menuCooldown = Math.max(0, menuCooldown - dt);
	for (let i = 0; i < pads.length; i++) {
		const p = pads[i],
			b = (j) => !!p.buttons[j]?.pressed,
			old = gamepadPrev[i] || [];
		if (
			p.axes.some((v) => Math.abs(v) > 0.2) ||
			p.buttons.some((x) => x.pressed)
		) {
			setLastInput("pad");
			activity();
		}
		if (b(9) && !old[9] && !b(8)) {
			if (mode === "playing") pause();
			else if (mode === "paused" && !modalPage.includes("dev")) resume();
			else if (mode === "title" && !modalPage) startGame();
		}
		if (mode === "title" || modalPage) {
			const delta =
				p.axes[1] > 0.5 || b(13) ? 1 : p.axes[1] < -0.5 || b(12) ? -1 : 0;
			if (delta && menuCooldown === 0) {
				setFocus(focusIndex + delta);
				menuCooldown = 0.19;
			}
			if (b(0) && !old[0]) focused()?.click();
			if (b(1) && !old[1]) goBack();
			if (
				modalPage &&
				(Math.abs(p.axes[0]) > 0.4 || b(14) || b(15)) &&
				menuCooldown === 0
			) {
				const el = focused();
				if (el?.type === "range") {
					el.value = clamp(
						+el.value + (p.axes[0] > 0 || b(15) ? 1 : -1) * (+el.step || 1),
						+el.min,
						+el.max,
					);
					el.dispatchEvent(new Event("input"));
					menuCooldown = 0.09;
				}
			}
		}
		gamepadPrev[i] = p.buttons.map((x) => x.pressed);
	}
	if (mode !== "playing" && mode !== "demo") return;
	let a = primary();
	if (!a) return;
	let input = keyboardInput();
	if (lastInput === "pad" && pads[0]) {
		input = padInput(pads[0]);
		if (!localCoop || pads.length > 1) {
			yaw -=
				((pads[0].axes[2] || 0) > 0.12 || Math.abs(pads[0].axes[2] || 0) > 0.12
					? pads[0].axes[2]
					: 0) *
				dt *
				2.1 *
				settings.sensitivity;
			pitch = clamp(
				pitch + (pads[0].axes[3] || 0) * dt * 1.4 * (settings.invert ? -1 : 1),
				-0.85,
				0.85,
			);
			input.yaw = yaw;
			input.pitch = pitch;
		}
	}
	if (localCoop) {
		input = pads.length > 1 ? padInput(pads[0]) : keyboardInput();
		const second = actors.get("couch");
		if (second) {
			const p = pads.length > 1 ? pads[1] : pads[0];
			second.input = padInput(p);
			second.input.yaw = yaw;
		}
	}
	if (touchEnabled) {
		input.x = touchMove.x;
		input.z = -touchMove.y;
		input.y = pointers.size >= 2 ? 0.65 : 0;
		input.boost = Math.hypot(input.x, input.z) > 0.8;
		input.action = touchAction;
		const t = targetFor(a);
		if (t) {
			const dist = a.pos.distanceTo(t);
			if (
				pointers.size < 2 &&
				(dist < 35 || Math.hypot(input.x, input.z) > 0.15)
			)
				input.y = clamp((t.y - a.pos.y) * 0.06, -0.7, 0.7);
			input.freeze =
				(mission === 1 && dist < 26) || (mission === 3 && dist < 23);
			if (mission === 0 && dist < 13) {
				input.y = clamp((t.y - a.pos.y) * 0.2, -1, 1);
				input.action = true;
			}
			if (mission === 2 && dist < 18) input.action = true;
		}
	}
	if (TEST && window.__testInput) input = { ...input, ...window.__testInput };
	a.input = input;
	if (online.role === "guest") online.sendInput(input);
}
function botInput(a) {
	const t = targetFor(a);
	if (!t) return inputEmpty();
	const delta = t.clone().sub(a.pos),
		distance = delta.length();
	let stop = finished
		? 3
		: mission === 0
			? 3
			: mission === 1
				? 12
				: mission === 2
					? 4
					: 10;
	if (mission === 0 && a.carry >= 0) stop = 2;
	const v = delta
		.normalize()
		.multiplyScalar(distance > stop ? Math.min(1, (distance - stop) / 12) : 0);
	return {
		direct: [v.x, v.y, v.z],
		x: 0,
		z: 0,
		y: 0,
		boost: distance > 30,
		action: distance < 20,
		freeze: distance < 30 && (mission === 1 || mission === 3),
		yaw: Math.atan2(-v.x, -v.z),
		pitch: 0,
	};
}
function simulateActor(a, dt) {
	let input = a.input || inputEmpty();
	if (demo) input = botInput(a);
	if (
		online.role !== "solo" &&
		a.id !== localId() &&
		a.id !== "couch" &&
		!demo
	) {
		const r = remoteInputs.get(a.id);
		input = r && performance.now() - r.at < 700 ? r : inputEmpty();
		a.input = input;
	}
	a.actionCooldown = Math.max(0, a.actionCooldown - dt);
	if (!input.action) a.boothLatch = false;
	const s = a.reporter
		? 7
		: input.boost && a.energy > 2
			? tuning.boostSpeed
			: tuning.flightSpeed;
	let desired = new V();
	if (input.direct) desired.fromArray(input.direct);
	else {
		const y = input.yaw || 0;
		desired.set(
			Math.cos(y) * input.x - Math.sin(y) * input.z,
			input.y,
			-Math.sin(y) * input.x - Math.cos(y) * input.z,
		);
		if (desired.length() > 1) desired.normalize();
	}
	if (a.reporter) {
		desired.y = 0;
		if (a.pos.y > 1.8) desired.y = -Math.min(1, (a.pos.y - 1.8) * 0.2);
	}
	a.boosting =
		!a.reporter && !!input.boost && desired.length() > 0.1 && a.energy > 2;
	if (demo) sunRecharge(a, dt, true);
	else sunRecharge(a, dt, false);
	if (a.boosting && !demo && !devInvincible)
		a.energy = Math.max(0, a.energy - dt * 8);
	const speed = demo ? 90 : s;
	a.velocity.lerp(
		desired.multiplyScalar(speed * (a.carry >= 0 ? 0.78 : 1)),
		1 - Math.exp(-dt * 5),
	);
	if (a.pos.y < 2 && a.velocity.y < 0) a.velocity.y = 0;
	if (a.pos.y > 135 && a.velocity.y > 0) a.velocity.y = 0;
	const movement = a.velocity.clone().multiplyScalar(dt);
	if (demo || devNoclip) {
		a.pos.add(movement);
		a.body.setNextKinematicTranslation(a.pos);
	} else {
		controller.computeColliderMovement(a.collider, movement);
		const corrected = controller.computedMovement();
		a.pos.add(new V(corrected.x, corrected.y, corrected.z));
		if (controller.numComputedCollisions() > 0 && a.velocity.length() > 20) {
			collisionCount++;
			if (a.actionCooldown <= 0) {
				a.actionCooldown = 0.4;
				audio.sfx("hit");
				cameraShake = 0.15;
				burst(a.pos, 0xf5df9c, 5);
			}
		}
		a.body.setNextKinematicTranslation(a.pos);
	}
	a.pos.x = clamp(a.pos.x, -235, 220);
	a.pos.z = clamp(a.pos.z, -230, 220);
	a.pos.y = clamp(a.pos.y, 1.7, 140);
	a.body.setNextKinematicTranslation(a.pos);
	a.art.group.position.copy(a.pos);
	a.reporterMesh.position.copy(a.pos).add(new V(0, -1.5, 0));
	a.reporterMesh.rotation.y = a.yaw;
	a.art.group.visible = !a.reporter;
	a.reporterMesh.visible = a.reporter;
	if (a.velocity.length() > 1) {
		a.yaw = Math.atan2(a.velocity.x, a.velocity.z);
		a.art.group.rotation.y = a.yaw;
	}
	a.art.setPose(
		a.velocity.length() > 42
			? "boost"
			: a.velocity.length() > 5
				? "fly"
				: "idle",
	);
	a.art.tick(dt, a.velocity.length());
	a.freezing = false;
	if (a.carry >= 0) {
		const c = citizens[a.carry];
		c.group.position.copy(a.pos).add(new V(0.6, -0.3, 0.9));
		c.group.rotation.y = a.yaw;
	}
	if (a.bridgeCarry >= 0)
		extras.bridgePieces[a.bridgeCarry].position.copy(a.pos).add(new V(0, 4, 0));
	if (input.action && a.actionCooldown <= 0) act(a, dt);
	if (input.freeze && a.energy > 0 && !a.reporter) freeze(a, dt);
	if (a.id === localId() || online.server) updateBeam(a);
	if (a.boosting && frameCount % 3 === 0)
		burst(a.pos.clone().add(new V(0, 1, 0)), 0xffe3a3, 1, 0.5);
}
let devInvincible = false,
	devNoclip = false;
function sunRecharge(a, dt, all) {
	const green =
		mission === 3 &&
		!finished &&
		a.pos.distanceTo(boss.position) < 28 &&
		nodes.some((n) => !n.broken);
	if (green && !all && !devInvincible) {
		hope -= dt * 0.6 * tuning.damage;
		a.energy = Math.max(0, a.energy - dt * 6);
	} else if (!a.freezing && !a.boosting)
		a.energy = Math.min(100, a.energy + dt * tuning.solarRegen);
	if (all || devInvincible) a.energy = 100;
}
function act(a, dt) {
	if (
		a.carry < 0 &&
		a.bridgeCarry < 0 &&
		a.pos.distanceTo(extras.booth.position) < 9 &&
		!a.boothLatch
	) {
		a.reporter = !a.reporter;
		a.boothLatch = true;
		a.actionCooldown = 1;
		teleport(a, new V(18, 2, 92));
		bonusIdentity = finished && bridgeDone.every(Boolean);
		audio.sfx("rescue");
		burst(a.pos, 0xffd778, 20);
		toast(a.reporter ? "MILD MANNERS. STRONG COFFEE." : "BACK IN A FLASH.", 2);
		return;
	}
	if (a.reporter) return;
	if (finished) {
		bonusAct(a);
		return;
	}
	if (mission === 0) {
		if (a.carry >= 0) {
			if (Math.hypot(a.pos.x, a.pos.z - 65) < 15 && a.pos.y < 17) {
				const c = citizens[a.carry];
				c.status = "safe";
				c.group.position.set(-6 + rescued * 6, 1, 65);
				c.group.rotation.y = Math.PI;
				rescued++;
				a.points += 300;
				score += 300;
				a.carry = -1;
				a.actionCooldown = 0.6;
				hope = Math.min(100, hope + 4);
				audio.sfx("rescue");
				audio.voice(rescued + 6);
				burst(a.pos, 0xffdc74, 18);
				toast(
					["A SOFT LANDING.", "ONE LESS WORRY.", "EVERYBODY HOME."][
						rescued - 1
					],
					1.7,
				);
				if (rescued === 3) advance();
			}
		} else {
			const c = citizens
				.filter((c) => c.status === "waiting")
				.sort(
					(c, d) =>
						c.group.position.distanceTo(a.pos) -
						d.group.position.distanceTo(a.pos),
				)[0];
			if (c && c.group.position.distanceTo(a.pos) < 13) {
				c.status = "carried";
				a.carry = c.index;
				a.actionCooldown = 0.45;
				audio.sfx("rescue");
				subtitle("HERO", "I have you. Let’s take the scenic route.", 3);
			}
		}
	} else if (
		mission === 2 &&
		a.pos.distanceTo(tram.position.clone().add(new V(0, 3, 0))) < 20
	) {
		tramProgress = Math.min(1, tramProgress + dt * 0.21);
		if (frameCount % 12 === 0) {
			burst(tram.position.clone().add(new V(5, 1, 0)), 0xffde82, 4);
			audio.sfx("hit");
		}
		if (tramProgress >= 1) advance();
	} else if (mission === 3) {
		const n = nodes.find(
			(n) =>
				!n.broken && n.group.getWorldPosition(new V()).distanceTo(a.pos) < 18,
		);
		if (n) {
			if (n.freeze >= 0.95) {
				n.broken = true;
				n.group.visible = false;
				score += 400;
				a.points += 400;
				a.actionCooldown = 0.55;
				punches++;
				burst(n.group.getWorldPosition(new V()), 0xa0f2e7, 28);
				audio.sfx("hit");
				cameraShake = 0.5;
				toast("CRACK! A BRIGHT IDEA.", 1.4);
				if (nodes.every((n) => n.broken)) {
					burst(boss.position, 0xffdd72, 55);
					boss.visible = false;
					advance();
				}
			} else if (a.actionCooldown <= 0) {
				a.actionCooldown = 0.7;
				audio.sfx("danger");
				subtitle(
					"HERO",
					"Green and smug. Better freeze it before I hit it.",
					2.5,
				);
			}
		} else {
			const d = drones.find(
				(d) => d.disabled <= 0 && d.group.position.distanceTo(a.pos) < 15,
			);
			if (d) {
				d.disabled = 7;
				a.actionCooldown = 0.4;
				score += 50;
				burst(d.group.position, 0xffcc6d, 12);
				audio.sfx("hit");
			}
		}
	}
}
function freeze(a, dt) {
	if (finished) return;
	const t = targetFor(a);
	if (!t) return;
	const distance = a.pos.distanceTo(t);
	if (mission === 1 && distance < 30) {
		fireProgress = Math.min(1, fireProgress + dt * 0.17 * tuning.freezePower);
		a.freezing = true;
		if (fireProgress >= 1) {
			fireMeshes.forEach((f) => (f.visible = false));
			score += 400;
			advance();
		}
	} else if (mission === 3) {
		const n = nodes
			.filter((n) => !n.broken)
			.sort(
				(c, d) =>
					c.group.getWorldPosition(new V()).distanceTo(a.pos) -
					d.group.getWorldPosition(new V()).distanceTo(a.pos),
			)[0];
		if (n && distance < 28) {
			n.freeze = Math.min(1, n.freeze + dt * 0.45 * tuning.freezePower);
			a.freezing = true;
			if (
				n.freeze >= 0.95 &&
				n.freeze - dt * 0.45 * tuning.freezePower < 0.95
			) {
				audio.sfx("freeze");
				toast("BRITTLE. NOW BREAK IT.", 1.3);
				freezeHits++;
			}
		}
		const d = drones.find(
			(d) => d.disabled <= 0 && d.group.position.distanceTo(a.pos) < 23,
		);
		if (d) {
			d.disabled = 4;
			a.freezing = true;
			burst(d.group.position, 0xb5faf1, 3);
		}
	} else if (distance < 35) a.freezing = true;
	if (a.freezing && !demo && !devInvincible)
		a.energy = Math.max(0, a.energy - dt * 4);
	if (a.freezing && frameCount % 9 === 0) {
		audio.sfx("freeze");
		burst(t, 0xc3fff7, 2, 0.8);
	}
}
function updateBeam(a) {
	if (!a.freezing) {
		freezeBeam.visible = false;
		freezeGlow.visible = false;
		return;
	}
	const t = targetFor(a);
	if (!t) return;
	const p = a.pos.clone().add(new V(0, 2, 0));
	const delta = t.clone().sub(p);
	freezeBeam.position.copy(p).addScaledVector(delta, 0.5);
	freezeBeam.scale.set(1, delta.length(), 1);
	freezeBeam.quaternion.setFromUnitVectors(new V(0, 1, 0), delta.normalize());
	freezeBeam.visible = true;
	freezeGlow.position.copy(p);
	freezeGlow.visible = true;
}
function burst(p, c, count = 8, life = 0.7) {
	for (let i = 0; i < count; i++) {
		const m = mesh(
			new THREE.IcosahedronGeometry(0.08 + Math.random() * 0.22, 0),
			new THREE.MeshBasicMaterial({ color: c, transparent: true }),
			p.clone(),
		);
		effects.push({
			m,
			life,
			max: life,
			v: new V(
				(Math.random() - 0.5) * 12,
				Math.random() * 8,
				(Math.random() - 0.5) * 12,
			),
		});
	}
}
function bonusAct(a) {
	if (a.bridgeCarry >= 0) {
		const i = a.bridgeCarry;
		if (a.pos.distanceTo(extras.repairSockets[i]) < 20) {
			extras.bridgePieces[i].position.copy(extras.repairSockets[i]);
			bridgeDone[i] = true;
			a.bridgeCarry = -1;
			a.actionCooldown = 0.8;
			score += 350;
			audio.sfx("success");
			burst(a.pos, 0xffd778, 22);
			toast(
				bridgeDone.every(Boolean)
					? "A CITY BUILT TOGETHER."
					: "A LITTLE STRONGER.",
				2,
			);
		}
	} else {
		const i = extras.bridgePieces.findIndex(
			(g, i) =>
				!bridgeDone[i] &&
				g.position.distanceTo(a.pos) < 16 &&
				![...actors.values()].some((h) => h.bridgeCarry === i),
		);
		if (i >= 0) {
			a.bridgeCarry = i;
			a.actionCooldown = 0.7;
			audio.sfx("rescue");
		}
	}
}
function updateWorld(dt) {
	simTime += dt;
	city.tick(simTime);
	extras.tick(simTime);
	helicopter.userData.rotor.rotation.y += dt * 25;
	helicopter.rotation.z = 0.13 + Math.sin(simTime * 1.2) * 0.025;
	for (const r of rings) {
		r.rotation.y += dt * 0.15;
		r.visible =
			r === safeRing
				? mission === 0 && !finished
				: typeof r.userData.citizen === "number" &&
					citizens[r.userData.citizen].status === "waiting" &&
					mission === 0;
	}
	fireMeshes.forEach((f, i) => {
		f.visible =
			mission <= 1 && fireProgress < 1 && i / 18 > fireProgress * 0.85;
		f.scale.setScalar(Math.max(0.15, 1 - fireProgress));
		f.scale.y *= 0.85 + Math.sin(simTime * 7 + i) * 0.17;
		f.rotation.y += dt * 0.5;
	});
	if (mission === 2 && !finished) {
		const speed = demo ? 13 : 18;
		tram.position.x += dt * speed * (1 - tramProgress * 0.8);
		if (tram.position.x > 115) tram.position.x = -115;
		if (runTime - missionStarts[2] > 45 && !demo && !devInvincible)
			hope -= dt * 0.35 * tuning.damage;
	}
	boss.visible = mission === 3 && !finished;
	if (boss.visible) {
		boss.userData.torus.rotation.z += dt * 0.13;
		boss.userData.core.rotation.y += dt * 0.6;
		nodes.forEach((n, i) => {
			if (!n.broken) {
				n.group.userData.ring.rotation.y += dt * (n.freeze > 0.95 ? -0.5 : 1);
				if (n.crystal)
					n.crystal.material.color.setHex(
						n.freeze > 0.95 ? 0xc8fbf6 : 0x79cf7e,
					);
			}
		});
	}
	for (const d of drones) {
		d.group.visible = mission === 3 && !finished && d.disabled <= 0;
		d.disabled = Math.max(0, d.disabled - dt);
		if (!d.group.visible) continue;
		d.phase += dt * 0.22;
		d.group.position.set(
			Math.sin(d.phase) * 44,
			55 + Math.sin(d.phase * 2) * 12,
			-145 + Math.cos(d.phase) * 44,
		);
		d.group.rotation.y = -d.phase;
		d.cooldown -= dt;
		if (d.cooldown < 0) {
			d.cooldown = 3.5 + Math.random() * 1.5;
			const a = [...actors.values()].sort(
				(a, b) =>
					a.pos.distanceTo(d.group.position) -
					b.pos.distanceTo(d.group.position),
			)[0];
			if (a && a.pos.distanceTo(d.group.position) < 100) {
				const m = mesh(
					new THREE.SphereGeometry(0.45, 6, 4),
					new THREE.MeshBasicMaterial({ color: 0xa1ff94 }),
					d.group.position.clone(),
				);
				bolts.push({
					mesh: m,
					v: a.pos.clone().sub(d.group.position).normalize().multiplyScalar(27),
					life: 4,
				});
			}
		}
	}
	for (let i = bolts.length - 1; i >= 0; i--) {
		const b = bolts[i];
		b.mesh.position.addScaledVector(b.v, dt);
		b.life -= dt;
		for (const a of actors.values()) {
			if (b.mesh.position.distanceTo(a.pos) < 3) {
				b.life = 0;
				if (!demo && !devInvincible) {
					hope -= 6 * tuning.damage;
					a.energy = Math.max(0, a.energy - 9);
					cameraShake = 0.4;
					$("#damage").style.borderWidth = "15px";
					setTimeout(() => ($("#damage").style.borderWidth = "0"), 180);
				}
				audio.sfx("danger");
				burst(a.pos, 0xb0f38d, 6);
				break;
			}
		}
		if (b.life <= 0) {
			scene.remove(b.mesh);
			bolts.splice(i, 1);
		}
	}
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.life -= dt;
		e.m.position.addScaledVector(e.v, dt);
		e.v.y -= dt * 5;
		e.m.material.opacity = Math.max(0, e.life / e.max);
		if (e.life <= 0) {
			scene.remove(e.m);
			e.m.geometry.dispose();
			e.m.material.dispose();
			effects.splice(i, 1);
		}
	}
	if (
		!demo &&
		!finished &&
		!devInvincible &&
		mission < 2 &&
		runTime - missionStarts[mission] > 80
	)
		hope -= dt * 0.25 * tuning.damage;
	if (hope <= 0 && !finished)
		finish(
			false,
			"Even the strongest need another try. The city still believes in you.",
		);
	hope = clamp(hope, 0, 100);
	if (demo && finished && bonusIdentity && clock - lastSave > 5) {
		resetState();
		yaw = 0;
	}
	updateObjective();
}
function updateCamera(dt) {
	const a = primary();
	if (!a) return;
	if (mode === "title") {
		const t = clock * 0.09;
		a.art.group.position.set(23, 39 + Math.sin(t) * 1.5, 58);
		a.art.group.rotation.y = -0.55;
		a.art.setPose("idle");
		a.art.tick(dt, 0);
		camera.position.set(31 + Math.sin(t) * 5, 44, 82);
		camera.lookAt(10, 38, 47);
		return;
	}
	const group = [a];
	if (localCoop && actors.has("couch")) group.push(actors.get("couch"));
	const p = new V();
	group.forEach((x) => p.add(x.pos));
	p.divideScalar(group.length);
	let extra = 0;
	if (group.length > 1)
		extra = Math.min(30, group[0].pos.distanceTo(group[1].pos) * 0.3);
	if (demo) {
		const t = targetFor(a);
		if (t) {
			const d = t.clone().sub(a.pos);
			if (d.length() > 5)
				yaw = THREE.MathUtils.lerp(yaw, Math.atan2(-d.x, -d.z), dt * 1.6);
		}
		pitch = 0.12;
	}
	const distance = 17 + extra + (a.boosting ? 7 : 0);
	const offset = new V(
		Math.sin(yaw) * distance,
		6 + Math.sin(pitch) * 18,
		Math.cos(yaw) * distance,
	);
	const wanted = p.clone().add(offset);
	camTarget.copy(p).add(new V(0, 2.5 - Math.sin(pitch) * 10, 0));
	camera.position.lerp(wanted, 1 - Math.exp(-dt * 5));
	if (camera.position.y < 2) camera.position.y = 2;
	if (cameraShake > 0) {
		camera.position.x += (Math.random() - 0.5) * cameraShake;
		camera.position.y += (Math.random() - 0.5) * cameraShake;
		cameraShake = Math.max(0, cameraShake - dt * 1.4);
	}
	camera.lookAt(camTarget);
	camera.fov = THREE.MathUtils.lerp(camera.fov, a.boosting ? 68 : 57, dt * 2);
	camera.updateProjectionMatrix();
}
function prompt(key, ps, xbox) {
	if (lastInput === "pad")
		return `<span class="glyph">${settings.glyphs === "ps" ? ps : xbox}</span>`;
	return `<kbd>${key}</kbd>`;
}
function updateControls() {
	const p = lastInput === "pad";
	$("#controls").innerHTML = p
		? `${prompt("", "L", "L")} Fly &nbsp; ${prompt("", "R", "R")} Look &nbsp; ${prompt("", "×", "A")} Rise &nbsp; ${prompt("", "○", "B")} Descend &nbsp; ${prompt("", "R2", "RT")} Boost &nbsp; ${prompt("", "□", "X")} Strength &nbsp; ${prompt("", "L2", "LT")} Freeze`
		: `<span><kbd>W A S D</kbd> Fly</span><span><kbd>Space</kbd> Rise <kbd>Ctrl</kbd> Descend</span><span><kbd>Shift</kbd> Boost</span><span><kbd>E</kbd> Strength</span><span><kbd>Q</kbd> Freeze</span><span>Mouse · look</span>`;
}
function context(a) {
	let text = "",
		sub = "";
	const t = targetFor(a),
		d = t ? a.pos.distanceTo(t) : 999;
	if (mission === 0) {
		if (a.carry >= 0) {
			text =
				Math.hypot(a.pos.x, a.pos.z - 65) < 15
					? a.pos.y < 17
						? `${prompt("E", "□", "X")} A gentle landing`
						: "Descend into the golden ring"
					: "Passenger aboard · head for Civic Square";
			sub = "The golden ring is your safe landing zone.";
		} else if (d < 15) {
			text = `${prompt("E", "□", "X")} Give them a lift`;
			sub = "Carry one citizen at a time. No one gets left behind.";
		}
	} else if (mission === 1 && d < 32) {
		text = `Hold ${prompt("Q", "L2", "LT")} Freeze breath`;
		sub = "Stay close. The whole rooftop needs cooling.";
	} else if (mission === 2 && d < 23) {
		text = `Hold ${prompt("E", "□", "X")} Stop that tram`;
		sub = "Match its speed and keep pulling. You’ve got this.";
	} else if (mission === 3 && d < 30) {
		const n = nodes
			.filter((n) => !n.broken)
			.sort(
				(a, b) =>
					a.group.getWorldPosition(new V()).distanceTo(primary().pos) -
					b.group.getWorldPosition(new V()).distanceTo(primary().pos),
			)[0];
		if (n) {
			text =
				n.freeze >= 0.95
					? `${prompt("E", "□", "X")} Shatter the emitter`
					: `Hold ${prompt("Q", "L2", "LT")} Make it brittle`;
			sub =
				n.freeze >= 0.95
					? "One good punch. An extremely bad investment."
					: `FROZEN ${Math.round(n.freeze * 100)}% · Green radiation drains solar charge.`;
		}
	}
	if (finished && d < 22) {
		text =
			a.bridgeCarry >= 0
				? `${prompt("E", "□", "X")} Reinforce the bridge`
				: `${prompt("E", "□", "X")} Lift the golden truss`;
		sub = "Bonus restoration · carry each truss to its matching river socket.";
	}
	if (
		a.carry < 0 &&
		a.bridgeCarry < 0 &&
		a.pos.distanceTo(extras.booth.position) < 10
	) {
		text = `${prompt("E", "□", "X")} ${a.reporter ? "Time to be super" : "Become a mild-mannered reporter"}`;
		sub = "A small tribute to a certain 1979 telephone booth.";
	}
	if (a.reporter && a.pos.distanceTo(extras.booth.position) >= 10) {
		text = "Mild-mannered mode · walk back to the phone booth";
		sub = "The city could use your other identity.";
	}
	$("#context").classList.toggle("hidden", !text || demo);
	$("#contextText").innerHTML = text;
	$("#contextSub").textContent = sub;
	if (touchEnabled) {
		$("#touchAction").style.display = text && !demo ? "block" : "none";
		$("#touchAction").textContent =
			mission === 0
				? "SAVE"
				: mission === 1
					? "COOL"
					: mission === 2
						? "BRAKE"
						: "POW";
	}
}
function updateHUD() {
	const a = primary();
	if (!a) return;
	$("#hopeText").textContent = Math.ceil(hope);
	$("#hopeBar").style.width = hope + "%";
	$("#energyText").textContent = Math.ceil(a.energy);
	$("#energyBar").style.width = a.energy + "%";
	$("#speed").textContent = Math.round(a.velocity.length() * 3.6);
	$("#altitude").textContent = Math.round(a.pos.y) + " M";
	context(a);
	const t = targetFor(a);
	$("#marker").classList.toggle("hidden", !t);
	if (t) {
		const v = t.clone().project(camera);
		const off = v.z > 1;
		let x = (v.x * 0.5 + 0.5) * innerWidth,
			y = (-v.y * 0.5 + 0.5) * innerHeight;
		if (off) {
			x = innerWidth - x;
			y = innerHeight - y;
		}
		x = clamp(x, 55, innerWidth - 55);
		y = clamp(y, 85, innerHeight - 130);
		$("#marker").style.left = x + "px";
		$("#marker").style.top = y + "px";
		$("#markerText").textContent =
			`${Math.round(a.pos.distanceTo(t))} M ${mission === 0 && a.carry >= 0 ? "· CIVIC SQUARE" : mission === 3 ? "· EMITTER" : ""}`;
		$("#marker").style.opacity = demo ? 0.65 : 1;
	}
	const map = $("#minimap"),
		c = map.getContext("2d");
	c.clearRect(0, 0, 320, 320);
	c.save();
	c.translate(160, 160);
	c.strokeStyle = "#7cb7ae44";
	c.lineWidth = 2;
	for (let x = -150; x < 160; x += 44) {
		c.beginPath();
		c.moveTo(x, -160);
		c.lineTo(x, 160);
		c.stroke();
		c.beginPath();
		c.moveTo(-160, x);
		c.lineTo(160, x);
		c.stroke();
	}
	c.scale(0.62, 0.62);
	c.fillStyle = "#75aeb788";
	c.fillRect(-250, -260, 85, 520);
	if (t) {
		c.fillStyle = "#ffcf60";
		c.beginPath();
		c.arc(t.x, t.z, 8, 0, Math.PI * 2);
		c.fill();
	}
	for (const h of actors.values()) {
		c.save();
		c.translate(h.pos.x, h.pos.z);
		c.rotate(-h.yaw);
		c.fillStyle = h === a ? "#fff4d7" : "#80e1cb";
		c.beginPath();
		c.moveTo(0, 11);
		c.lineTo(-7, -8);
		c.lineTo(7, -8);
		c.closePath();
		c.fill();
		c.restore();
	}
	c.restore();
}
function snapshot() {
	return {
		mission,
		rescued,
		fireProgress,
		tramProgress,
		hope,
		score,
		runTime,
		finished,
		bridgeDone: bridgeDone.slice(),
		bonusIdentity,
		bridgePos: extras.bridgePieces.map((g) => g.position.toArray()),
		tram: tram.position.toArray(),
		nodes: nodes.map((n) => [n.freeze, n.broken]),
		citizens: citizens.map((c) => [c.status, ...c.group.position.toArray()]),
		drones: drones.map((d) => [
			...d.group.position.toArray(),
			d.group.rotation.y,
			d.group.visible,
			d.disabled,
		]),
		bolts: bolts.map((b) => [
			...b.mesh.position.toArray(),
			...b.v.toArray(),
			b.life,
		]),
		heroes: [...actors.values()].map((a) => ({
			id: a.id,
			pos: a.pos.toArray(),
			yaw: a.yaw,
			energy: a.energy,
			carry: a.carry,
			velocity: a.velocity.toArray(),
			freezing: a.freezing,
			reporter: a.reporter,
			bridgeCarry: a.bridgeCarry,
		})),
		mode,
	};
}
function applySnapshot(s) {
	if (!s || !s.heroes || online.role !== "guest") return;
	const changed = mission !== s.mission;
	mission = s.mission;
	rescued = s.rescued;
	fireProgress = s.fireProgress;
	tramProgress = s.tramProgress;
	hope = s.hope;
	score = s.score;
	runTime = s.runTime;
	finished = s.finished;
	if (s.bridgeDone) bridgeDone = s.bridgeDone.slice();
	bonusIdentity = !!s.bonusIdentity;
	s.bridgePos?.forEach((p, i) => extras.bridgePieces[i]?.position.fromArray(p));
	tram.position.fromArray(s.tram);
	s.nodes?.forEach((n, i) => {
		nodes[i].freeze = n[0];
		nodes[i].broken = n[1];
		nodes[i].group.visible = !n[1];
		if (nodes[i].crystal)
			nodes[i].crystal.material.color.setHex(n[0] > 0.95 ? 0xc8fbf6 : 0x79cf7e);
	});
	s.drones?.forEach((d, i) => {
		if (!drones[i]) return;
		drones[i].group.position.set(d[0], d[1], d[2]);
		drones[i].group.rotation.y = d[3];
		drones[i].group.visible = d[4];
		drones[i].disabled = d[5];
	});
	const incomingBolts = s.bolts || [];
	incomingBolts.forEach((b, i) => {
		if (!bolts[i])
			bolts.push({
				mesh: mesh(
					new THREE.SphereGeometry(0.45, 6, 4),
					new THREE.MeshBasicMaterial({ color: 0xa1ff94 }),
					new V(),
				),
				v: new V(),
				life: 0,
			});
		bolts[i].mesh.position.set(b[0], b[1], b[2]);
		bolts[i].v.set(b[3], b[4], b[5]);
		bolts[i].life = b[6];
	});
	while (bolts.length > incomingBolts.length) {
		const b = bolts.pop();
		scene.remove(b.mesh);
		b.mesh.geometry.dispose();
		b.mesh.material.dispose();
	}
	s.citizens?.forEach((c, i) => {
		citizens[i].status = c[0];
		citizens[i].group.position.set(c[1], c[2], c[3]);
	});
	for (const h of s.heroes) {
		const a = addActor(String(h.id), new V().fromArray(h.pos));
		a.pos.fromArray(h.pos);
		a.art.group.position.copy(a.pos);
		a.art.group.rotation.y = h.yaw;
		a.yaw = h.yaw;
		a.energy = h.energy;
		a.carry = h.carry;
		a.velocity.fromArray(h.velocity);
		a.freezing = h.freezing;
		a.reporter = !!h.reporter;
		a.bridgeCarry = h.bridgeCarry ?? -1;
		a.art.group.visible = !a.reporter;
		a.reporterMesh.visible = a.reporter;
		a.reporterMesh.position.copy(a.pos);
		a.reporterMesh.rotation.y = h.yaw;
		a.art.setPose(
			a.velocity.length() > 42
				? "boost"
				: a.velocity.length() > 5
					? "fly"
					: "idle",
		);
	}
	for (const id of [...actors.keys()])
		if (!s.heroes.some((h) => String(h.id) === id)) removeActor(id);
	if (changed && !demo) chapterCard(mission);
	updateObjective();
}
function activity() {
	const wasDemo = demo;
	lastActivity = performance.now();
	if (wasDemo) {
		title();
		return true;
	}
	return false;
}
function setLastInput(v) {
	if (lastInput !== v) {
		lastInput = v;
		updateControls();
	}
}
function pause() {
	if (mode !== "playing") return;
	previousMode = mode;
	mode = "paused";
	if (document.pointerLockElement) document.exitPointerLock();
	audio.suspend();
	openMenu("pause");
}
function resume() {
	if (online.active && online.ended) return;
	modalPage = "";
	$("#modal").classList.add("hidden");
	mode = "playing";
	audio.resume();
	lastActivity = performance.now();
}
function visibleFocusables() {
	const root = modalPage ? $("#panel") : $("#title");
	return [...root.querySelectorAll("button,input,textarea")].filter(
		(e) => !e.disabled && e.offsetParent !== null,
	);
}
function focused() {
	return visibleFocusables()[focusIndex];
}
function setFocus(n) {
	const items = visibleFocusables();
	if (!items.length) return;
	focusIndex = ((n % items.length) + items.length) % items.length;
	items.forEach((e, i) => e.classList.toggle("focus", i === focusIndex));
	items[focusIndex].focus({ preventScroll: true });
	items[focusIndex].scrollIntoView({ block: "nearest" });
}
function btn(label, action, primary = false) {
	return `<button class="btn${primary ? " primary" : ""}" data-act="${action}">${label}<span>›</span></button>`;
}
function openMenu(page) {
	modalPage = page;
	$("#modal").classList.remove("hidden");
	const panel = $("#panel");
	if (page === "pause")
		panel.innerHTML = `<div class="eyebrow">A brief intermission</div><h2>The city can wait.<br>A little.</h2><p>${online.active || online.connected ? "Your team’s city keeps moving while this menu is open." : "Your cape deserves a breather."}</p><div class="menu-list">${btn("Back to the skyline", "resume", true)}${btn("How to be super", "help")}${btn("Settings", "settings")}${btn("Developer studio", "dev")}${btn("About & credits", "credits")}${!online.active ? btn("Replay the shift", "restart") + btn("Back to the matinee", "title") : ""}</div>`;
	if (page === "help")
		panel.innerHTML = `<div class="eyebrow">A field guide to being decent</div><h2>Look up. Lend a hand.</h2><p>Fly anywhere in the city. Follow the gold diamond to each emergency. Your powers work on nearby targets automatically — being super should feel good.</p><div class="help-grid"><div class="help-card"><b>01 · Take flight</b><p>WASD / left stick moves. Mouse / right stick looks. Space / × rises; Ctrl / ○ descends. Shift / R2 boosts. Drag on the sky to capture mouse look; Esc releases.</p></div><div class="help-card"><b>02 · Be someone’s hero</b><p>E / □ picks up a nearby citizen. Fly to the golden Civic Square ring, descend below 17 m, then press again for a soft landing.</p></div><div class="help-card"><b>03 · Keep your cool</b><p>Hold Q / L2 for freeze breath. Hold E / □ to brake the moving tram. Emitters need freezing before one strength punch.</p></div><div class="help-card"><b>04 · A sunny disposition</b><p>Boost and breath use solar charge. Ease off to refill. Green emitters and drone bolts drain the city’s hope. Freeze or punch nearby drones to disable them.</p></div></div><p>After the finale, keep flying to restore the bridge. Near Civic Square, a red telephone booth swaps your cape for a reporter’s coat. Return to the booth to fly again.</p><p class="footer-note">Touch: invisible left thumbstick flies, right thumbstick looks, two fingers climb. Nearby rescue, freeze and braking are assisted. The pop-up button handles strength.</p>${btn("Back", "back", true)}`;
	if (page === "settings")
		panel.innerHTML = `<div class="eyebrow">Tune your matinee</div><h2>A personal touch.</h2>${slider("Music", "music", 0, 100, 1, Math.round(settings.music * 100), "%")}${slider("Sound & voices", "sfx", 0, 100, 1, Math.round(settings.sfx * 100), "%")}${slider("Look sensitivity", "sensitivity", 0.3, 2, 0.1, settings.sensitivity, "×")}<div class="menu-list" style="margin-top:20px">${btn(`Controller glyphs: ${settings.glyphs === "ps" ? "PlayStation" : "Xbox"}`, "glyphs")}${btn(`Invert vertical look: ${settings.invert ? "On" : "Off"}`, "invert")}${btn("Back", "back", true)}</div>`;
	if (page === "dev")
		panel.innerHTML = `<div class="eyebrow">Behind the cape</div><h2>Developer studio.</h2><p>Changes apply live. Studio controls are available to the host. Default values restore the intended balance.</p>${Object.entries(
			{
				flightSpeed: ["Cruise speed", 10, 75, 1, " m/s"],
				boostSpeed: ["Boost speed", 30, 120, 1, " m/s"],
				freezePower: ["Freeze strength", 0.25, 4, 0.05, "×"],
				damage: ["Incoming damage", 0, 3, 0.1, "×"],
				solarRegen: ["Solar recharge", 1, 25, 1, "/s"],
			},
		)
			.map(([k, v]) => slider(v[0], k, v[1], v[2], v[3], tuning[k], v[4]))
			.join(
				"",
			)}<div class="two-col" style="margin-top:18px"><div class="menu-list">${btn(`Invincible: ${devInvincible ? "On" : "Off"}`, "invincible")}${btn(`Fly through buildings: ${devNoclip ? "On" : "Off"}`, "noclip")}${btn("Refill hope & solar", "refill")}</div><div class="menu-list">${btn("Jump to next emergency", "skip")}${btn("Go to current target", "warp")}${btn("Reset balance defaults", "defaults")}</div></div><div class="notice">WebGPU · Three.js r180 · Rapier 0.19.3 · ${actors.size} hero(es) · ${city.colliders.length} static colliders · ${collisionCount} contacts</div>${btn("Back", "back", true)}`;
	if (page === "multiplayer")
		panel.innerHTML = `<div class="eyebrow">Twice the capes. Half the paperwork.</div><h2>Better together.</h2><p>Share one city and every good deed. Couch co-op uses keyboard + a controller, or two controllers. Direct online co-op uses an invitation and reply code. AI Hub sessions support up to four heroes.</p><div class="menu-list">${btn(`Couch co-op: ${localCoop ? "On · two heroes" : "Off"}`, "couch")}${btn("Start the co-op shift", "startcoop", true)}${btn("Create online invitation", "offer")}${btn("Accept invitation", "joinoffer")}${btn("Same-browser room", "tabroom")}${btn("Back", "back")}</div><div id="networkStatus">${online.status || "Solo · ready to fly"}</div><p class="footer-note">Direct online uses WebRTC with STUN; restrictive networks may need AI Hub. No account, game server, or voice chat required.</p>`;
	if (page === "joinoffer")
		panel.innerHTML = `<div class="eyebrow">Direct co-op · partner</div><h2>A heroic invitation.</h2><p>Paste your partner’s invitation, then send the reply code back to them.</p><textarea id="signalInput" aria-label="Invitation code" placeholder="SUN1…"></textarea><div class="menu-list">${btn("Make reply code", "answer", true)}${btn("Back", "back")}</div><div id="networkStatus" class="notice"></div>`;
	if (page === "tabroom")
		panel.innerHTML = `<div class="eyebrow">Same-browser co-op</div><h2>Another tab. Another cape.</h2><p>Open this game twice in the same browser. Use the same room name in both tabs. One hosts, the others join.</p><input type="text" id="roomName" aria-label="Room name" value="SUNSHINE" maxlength="20"><div class="menu-list" style="margin-top:18px">${btn("Host this room", "hosttab", true)}${btn("Join this room", "jointab")}${btn("Back", "back")}</div><div id="networkStatus" class="notice"></div>`;
	if (page === "credits")
		panel.innerHTML = `<div class="eyebrow">The people behind the sunshine</div><h2>About this matinee.</h2><p>An original, unofficial adventure inspired by <i>Superman (1979)</i>: city rescues, green danger, bridge restoration and a mild-mannered change in a telephone booth, with the hero’s familiar optimism and theatrical villainy. Built entirely from procedural geometry and code. No affiliation with DC or its owners.</p><div id="creditsContent" class="credits"></div>${btn("Back", "back", true)}`;
	if (page === "credits") fillCredits();
	bindPanel();
	setFocus(0);
}
function slider(label, id, min, max, step, value, suffix) {
	return `<div class="row"><label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-slider="${id}" data-suffix="${suffix}"><output for="${id}">${value}${suffix}</output></div>`;
}
function bindPanel() {
	for (const e of $("#panel").querySelectorAll("[data-slider]"))
		e.addEventListener("input", () => {
			const id = e.dataset.slider,
				val = +e.value;
			e.nextElementSibling.value = val + e.dataset.suffix;
			if (id === "music") {
				settings.music = val / 100;
				audio.setMusicVolume(settings.music);
			} else if (id === "sfx") {
				settings.sfx = val / 100;
				audio.setSfxVolume(settings.sfx);
			} else if (id === "sensitivity") settings.sensitivity = val;
			else tuning[id] = val;
			saveSettings();
		});
}
function goBack() {
	if (modalPage === "pause") resume();
	else if (["joinoffer", "tabroom", "offer"].includes(modalPage))
		openMenu("multiplayer");
	else if (mode === "paused") openMenu("pause");
	else {
		modalPage = "";
		$("#modal").classList.add("hidden");
		setFocus(0);
		lastActivity = performance.now();
	}
}
function showResults(won, line = "") {
	modalPage = "results";
	$("#modal").classList.remove("hidden");
	$("#panel").innerHTML =
		`<div class="win-paper"><small>THE EVENING SUN &nbsp; · &nbsp; EXTRA! EXTRA!</small><h2>${won ? "CITY GETS<br>ANOTHER TOMORROW." : "HERO VOWS<br>TO TRY AGAIN."}</h2><p>${won ? "Three citizens safe. One cool newspaper. A tram right on time. And the sun, still gloriously public property." : line}</p></div><div class="badge-line"><div class="result-score">${score.toLocaleString()}</div><div class="result-rank">${won ? (hope > 75 ? "A FIRST-CLASS GOOD SAMARITAN" : "A HERO THROUGH AND THROUGH") : "THE CITY STILL BELIEVES"}<p>${rescued} rescues · ${Math.round(hope)} hope · ${Math.floor(runTime / 60)}:${String(Math.floor(runTime % 60)).padStart(2, "0")} on the clock</p></div></div><div class="menu-list">${!online.active ? btn(won ? "Keep flying · explore the city" : "Try the shift again", won ? "freeflight" : "restart", true) + btn("Replay the matinee", "restart") : ""}${btn("About & credits", "credits")}</div>`;
	setFocus(0);
}
function showSessionEnd(reason) {
	$("#hud").classList.add("hidden");
	$("#modal").classList.remove("hidden");
	modalPage = "ended";
	$("#panel").innerHTML =
		`<div class="eyebrow">AI Hub · final edition</div><h2>Thanks for the sunshine.</h2><p>The session has ended. ${score.toLocaleString()} points · ${rescued} citizens safe.</p><p class="footer-note">${String(reason || "Round complete").replace(/[<>]/g, "")}</p>`;
}
function saveSettings() {
	try {
		localStorage.setItem("son-of-a-sun-settings", JSON.stringify(settings));
	} catch {}
}
function updateNetworkLabel(s) {
	const e = $("#networkStatus");
	if (e) e.textContent = s || online.status;
}
async function action(name) {
	audio.sfx("click");
	activity();
	switch (name) {
		case "start":
			startGame();
			break;
		case "startcoop":
			startGame();
			break;
		case "couch":
			localCoop = !localCoop;
			openMenu("multiplayer");
			break;
		case "resume":
			resume();
			break;
		case "back":
			goBack();
			break;
		case "title":
			online.close();
			title();
			break;
		case "restart":
			if (!online.active) startGame();
			break;
		case "freeflight":
			mode = "playing";
			modalPage = "";
			$("#modal").classList.add("hidden");
			audio.resume();
			updateObjective();
			break;
		case "glyphs":
			settings.glyphs = settings.glyphs === "ps" ? "xbox" : "ps";
			saveSettings();
			updateControls();
			openMenu("settings");
			break;
		case "invert":
			settings.invert = !settings.invert;
			saveSettings();
			openMenu("settings");
			break;
		case "invincible":
			devInvincible = !devInvincible;
			openMenu("dev");
			break;
		case "noclip":
			devNoclip = !devNoclip;
			openMenu("dev");
			break;
		case "refill":
			hope = 100;
			actors.forEach((a) => (a.energy = 100));
			toast("A LITTLE SUN DOES WONDERS.");
			break;
		case "skip":
			if (online.role !== "guest") {
				if (mission === 0) {
					rescued = 3;
					citizens.forEach((c) => {
						c.status = "safe";
						c.group.position.set(c.index * 4, 1, 65);
					});
					actors.forEach((a) => (a.carry = -1));
				} else if (mission === 1) fireProgress = 1;
				else if (mission === 2) tramProgress = 1;
				else nodes.forEach((n) => (n.broken = true));
				advance();
				openMenu("dev");
			}
			break;
		case "warp": {
			const a = primary(),
				t = a && targetFor(a);
			if (t && online.role !== "guest")
				teleport(a, t.clone().add(new V(0, 3, 7)));
			break;
		}
		case "defaults":
			Object.assign(tuning, DEFAULTS);
			devInvincible = false;
			devNoclip = false;
			openMenu("dev");
			break;
		case "hosttab":
			await online.host($("#roomName").value || "SUNSHINE");
			prepareNetworkActors();
			startGame();
			break;
		case "jointab":
			await online.join($("#roomName").value || "SUNSHINE");
			break;
		case "offer":
			await makeOffer();
			break;
		case "answer":
			await makeAnswer();
			break;
		case "acceptanswer":
			await receiveAnswer();
			break;
		case "copycode": {
			const v = $("#signalOutput");
			v.select();
			try {
				await navigator.clipboard.writeText(v.value);
				updateNetworkLabel("Copied. Send this code to your partner.");
			} catch {
				updateNetworkLabel("Code selected. Copy it with Ctrl+C.");
			}
			break;
		}
		default:
			if (
				[
					"help",
					"settings",
					"credits",
					"dev",
					"multiplayer",
					"joinoffer",
					"tabroom",
				].includes(name)
			)
				openMenu(name);
	}
}
async function makeOffer() {
	openMenu("offer");
	$("#panel").innerHTML =
		`<h2>Calling all capes…</h2><p>Preparing a direct invitation. This can take a few seconds.</p><div id="networkStatus" class="notice"></div>${btn("Back", "back")}`;
	try {
		const code = await online.createOffer();
		$("#panel").innerHTML =
			`<div class="eyebrow">Direct co-op · host</div><h2>Send some sunshine.</h2><p>Send this invitation to a friend. They choose “Accept invitation” and send you a reply. Paste that reply below.</p><textarea id="signalOutput" readonly aria-label="Invitation">${code}</textarea>${btn("Copy invitation", "copycode")}<textarea id="signalInput" aria-label="Partner reply" placeholder="Paste partner’s SUN1 reply…"></textarea><div class="menu-list">${btn("Connect partner", "acceptanswer", true)}${btn("Back", "back")}</div><div id="networkStatus" class="notice"></div>`;
		setFocus(0);
	} catch (e) {
		updateNetworkLabel(e.message);
	}
}
async function makeAnswer() {
	const code = $("#signalInput").value;
	updateNetworkLabel("Preparing your reply…");
	try {
		const reply = await online.acceptOffer(code);
		$("#panel").innerHTML =
			`<h2>A friend in high places.</h2><p>Send this reply to the host. The shift begins when they connect.</p><textarea id="signalOutput" readonly aria-label="Reply code">${reply}</textarea>${btn("Copy reply", "copycode")}<div id="networkStatus" class="notice">Waiting for the host…</div>${btn("Back", "back")}`;
		setFocus(0);
	} catch (e) {
		updateNetworkLabel(e.message);
	}
}
async function receiveAnswer() {
	try {
		await online.acceptAnswer($("#signalInput").value);
		updateNetworkLabel("Connecting…");
	} catch (e) {
		updateNetworkLabel(e.message);
	}
}
function fillCredits() {
	const d = window.GAME_CREDITS;
	if (!d) {
		$("#creditsContent").textContent =
			"Credits are assembled with the single-file release.";
		return;
	}
	const names = {
		sourceInformation: "Source Information",
		testingFeedback: "Testing Feedback",
		engineFeedback: "Engine Feedback",
		promptFeedback: "Prompt Feedback",
	};
	const questions = {
		testingFeedback: [
			"Issues caught",
			"Critical issues",
			"Most helpful test",
			"Least helpful test",
		],
		engineFeedback: [
			"What worked best",
			"Wrong guesses",
			"Built for this game",
			"Hardest part",
			"Engine changes",
			"One desired change",
		],
		promptFeedback: [
			"What worked best",
			"What was confusing",
			"Hardest requirement",
			"Suggested change",
		],
	};
	for (const [key, label] of Object.entries(names)) {
		const h = document.createElement("h3");
		h.textContent = label;
		$("#creditsContent").append(h);
		const dl = document.createElement("dl");
		if (key === "sourceInformation")
			for (const [k, v] of Object.entries(d[key])) {
				const dt = document.createElement("dt");
				dt.textContent = k.replace(/([A-Z])/g, " $1");
				const dd = document.createElement("dd");
				dd.textContent = v;
				dl.append(dt, dd);
			}
		else
			d[key].forEach((v, i) => {
				const dt = document.createElement("dt");
				dt.textContent = questions[key][i];
				const dd = document.createElement("dd");
				dd.textContent = v;
				dl.append(dt, dd);
			});
		$("#creditsContent").append(dl);
	}
}

document.addEventListener("pointerdown", (e) => {
	setLastInput(e.pointerType === "touch" ? "touch" : "keyboard");
	activity();
	audio.start();
});
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-act]");
	if (b) action(b.dataset.act);
});
document.addEventListener("pointerover", (e) => {
	const b = e.target.closest("button,input");
	if (b && (modalPage || mode === "title")) {
		const items = visibleFocusables();
		const i = items.indexOf(b);
		if (i >= 0) {
			focusIndex = i;
			items.forEach((x, n) => x.classList.toggle("focus", n === i));
		}
	}
});
document.addEventListener("keydown", (e) => {
	if (e.target.matches("textarea,input[type=text]")) {
		setLastInput("keyboard");
		activity();
		return;
	}
	if (
		e.target.matches("input[type=range]") &&
		["ArrowLeft", "ArrowRight"].includes(e.code)
	) {
		e.preventDefault();
		setLastInput("keyboard");
		activity();
		const el = e.target;
		el.value = clamp(
			+el.value + (e.code === "ArrowRight" ? 1 : -1) * (+el.step || 1),
			+el.min,
			+el.max,
		);
		el.dispatchEvent(new Event("input"));
		return;
	}
	setLastInput("keyboard");
	if (activity()) return;
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
	keys.add(e.code);
	if (e.repeat) return;
	if (e.code === "Escape") {
		if (modalPage) goBack();
		else if (mode === "playing") pause();
	}
	if (
		(mode === "title" || modalPage) &&
		["ArrowDown", "ArrowUp", "Tab"].includes(e.code)
	)
		setFocus(focusIndex + (e.code === "ArrowUp" || e.shiftKey ? -1 : 1));
	if ((mode === "title" || modalPage) && e.code === "Enter") focused()?.click();
	if (e.code === "KeyR" && mode === "playing") {
		yaw = primary()?.yaw - Math.PI || 0;
		pitch = 0.12;
	}
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
$("#pauseBtn").onclick = () => pause();
$("#touchMenu").onclick = () => (mode === "playing" ? pause() : goBack());
$("#view").addEventListener("pointerdown", (e) => {
	setLastInput(e.pointerType === "touch" ? "touch" : "keyboard");
	if (activity()) return;
	if (mode !== "playing") return;
	audio.start();
	if (e.pointerType === "touch") {
		touchEnabled = true;
		document.body.classList.add("touch");
		pointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			left: e.clientX < innerWidth * 0.5,
		});
		$("#view").setPointerCapture(e.pointerId);
		touchStart[e.pointerId] = { x: e.clientX, y: e.clientY };
		$("#touchHint").classList.add("hidden");
	} else {
		if (e.button === 0) {
			mouseAction = true;
			if (!document.pointerLockElement) $("#view").requestPointerLock?.();
		}
		if (e.button === 2) mouseHeld = true;
	}
});
document.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch" && pointers.has(e.pointerId)) {
		const p = pointers.get(e.pointerId),
			dx = (e.clientX - p.x) / 70,
			dy = (e.clientY - p.y) / 70;
		if (p.left) {
			touchMove = { x: clamp(dx, -1, 1), y: clamp(dy, -1, 1) };
		} else {
			touchLook = { x: dx, y: dy };
			yaw -= e.movementX * 0.005 * settings.sensitivity;
			pitch = clamp(pitch + e.movementY * 0.004, -0.8, 0.8);
		}
		activity();
	} else if (mode === "playing" && document.pointerLockElement) {
		setLastInput("keyboard");
		yaw -= e.movementX * 0.0025 * settings.sensitivity;
		pitch = clamp(
			pitch + e.movementY * 0.002 * (settings.invert ? -1 : 1),
			-0.85,
			0.85,
		);
		if (e.movementX || e.movementY) activity();
	} else if (
		mode === "title" &&
		(Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3)
	) {
		activity();
	}
});
document.addEventListener("pointerup", (e) => {
	if (pointers.has(e.pointerId)) {
		const p = pointers.get(e.pointerId);
		if (p.left) touchMove = { x: 0, y: 0 };
		else touchLook = { x: 0, y: 0 };
		pointers.delete(e.pointerId);
	}
	if (e.button === 0) mouseAction = false;
	if (e.button === 2) mouseHeld = false;
});
document.addEventListener("pointercancel", (e) => {
	pointers.delete(e.pointerId);
	touchMove = { x: 0, y: 0 };
});
document.addEventListener("contextmenu", (e) => {
	if (e.target === $("#view")) e.preventDefault();
});
$("#touchAction").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	touchAction = true;
});
document.addEventListener("pointerup", () => (touchAction = false));
window.addEventListener("blur", () => {
	keys.clear();
	mouseAction = false;
	mouseHeld = false;
	if (mode === "playing" && !online.connected && !online.active) pause();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		if (mode === "playing" && !online.active && !online.connected) {
			hiddenPaused = true;
			pause();
		}
	} else lastActivity = performance.now();
});
window.addEventListener("resize", () => {
	if (!renderer) return;
	renderer.setSize(innerWidth, innerHeight);
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
});

async function init() {
	try {
		try {
			const saved = JSON.parse(localStorage.getItem("son-of-a-sun-settings"));
			if (saved) Object.assign(settings, saved);
		} catch {}
		audio.setMusicVolume(settings.music);
		audio.setSfxVolume(settings.sfx);
		if (touchEnabled) document.body.classList.add("touch");
		await Promise.all([RAPIER.init(), online.init()]);
		$("#loading-detail").textContent = "Setting the sun · preparing WebGPU";
		renderer = new THREE.WebGPURenderer({
			canvas: $("#view"),
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		await renderer.init();
		makeWorld();
		ready = true;
		$("#loader").classList.add("hidden");
		updateControls();
		title();
		if (online.active) {
			$("#title").classList.add("hidden");
			$("#loader").classList.remove("hidden");
			$("#loading-detail").textContent =
				"City ready · waiting for the shared starting bell";
			online.ready();
		}
		renderer.setAnimationLoop(frame);
		window.__sun = {
			get state() {
				return {
					...snapshot(),
					ready,
					mode,
					demo,
					backend: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
					actors: actors.size,
					collisionCount,
					settings: { ...settings },
					tuning: { ...tuning },
					nativeAnimations: [...actors.values()].map((a) =>
						Object.keys(a.art.actions),
					),
					audio: audio.stats(),
					network: {
						role: online.role,
						connected: online.connected,
						active: online.active,
						me: online.me,
					},
				};
			},
			renderInfo: () => JSON.parse(JSON.stringify(renderer.info.render)),
			start: () => startGame(),
			pause,
			resume,
			openMenu,
			action,
			online,
			offlineTest,
			controls: () => ({ ...primary()?.input }),
			target: () => targetFor(primary())?.toArray(),
			get primaryId() {
				return localId();
			},
		};
		if (TEST)
			Object.assign(window.__sun, {
				warp: (p) => teleport(primary(), new V(...p)),
				input: (i) => (window.__testInput = i),
				settings,
				tuning,
				setAttract: () => {
					lastActivity = performance.now() - 10001;
				},
				advanceTime: (seconds) => {
					for (let n = 0; n < seconds * 60; n++) {
						const dt = 1 / 60;
						for (const a of actors.values()) {
							a.input = { ...inputEmpty(), ...window.__testInput };
							simulateActor(a, dt);
						}
						world.timestep = dt;
						world.step();
						runTime += dt;
						updateWorld(dt);
					}
					updateHUD();
				},
				refill: () => {
					hope = 100;
					actors.forEach((a) => (a.energy = 100));
				},
				actor: (id) => actors.get(id)?.pos.toArray(),
				setActor: (id, p) => teleport(actors.get(id), new V(...p)),
				native: () => ({
					rapier: typeof world.step === "function",
					animation: primary()?.art.mixer instanceof THREE.AnimationMixer,
					colliders: city.colliders.length,
				}),
			});
	} catch (e) {
		console.error(e);
		$("#loading-detail").innerHTML =
			`The projectionist needs a hand.<br>${String(e.message).replace(/[<>]/g, "")}<br><br>Use a current Chromium browser with WebGPU and an internet connection for the engine libraries. Reload to try again.`;
		$("#loader .line").classList.add("hidden");
		window.__bootError = String(e.stack || e);
	}
}
let lastFrame = performance.now();
function frame(now) {
	const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
	lastFrame = now;
	clock += dt;
	dtLast = dt;
	frameCount++;
	readInputs(dt);
	if (
		mode === "title" &&
		!online.active &&
		online.role === "solo" &&
		performance.now() - lastActivity > 10000
	)
		startGame(true);
	const simulating =
		mode === "playing" ||
		mode === "demo" ||
		(mode === "paused" && (online.active || online.connected));
	if (simulating) {
		if (online.role !== "guest") {
			if (mode === "paused") {
				const a = primary();
				if (a) a.input = inputEmpty();
			}
			runTime += dt;
			for (const a of actors.values()) simulateActor(a, dt);
			world.timestep = dt;
			world.step();
			updateWorld(dt);
			if (online.connected || online.active) online.sendState(snapshot());
		} else {
			for (const a of actors.values()) a.art.tick(dt, a.velocity.length());
			city.tick(clock);
			helicopter.userData.rotor.rotation.y += dt * 25;
			helicopter.rotation.z = 0.13 + Math.sin(clock * 1.2) * 0.025;
			for (const r of rings) {
				r.rotation.y += dt * 0.15;
				r.visible =
					r === safeRing
						? mission === 0 && !finished
						: typeof r.userData.citizen === "number" &&
							citizens[r.userData.citizen].status === "waiting" &&
							mission === 0;
			}
			boss.visible = mission === 3 && !finished;
			if (boss.visible) {
				boss.userData.torus.rotation.z += dt * 0.13;
				boss.userData.core.rotation.y += dt * 0.6;
				nodes.forEach((n) => {
					if (!n.broken)
						n.group.userData.ring.rotation.y +=
							dt * (n.freeze > 0.95 ? -0.5 : 1);
				});
			}
			fireMeshes.forEach((f, i) => {
				f.visible =
					mission <= 1 && fireProgress < 1 && i / 18 > fireProgress * 0.85;
				f.scale.setScalar(Math.max(0.15, 1 - fireProgress));
				f.scale.y *= 0.85 + Math.sin(clock * 7 + i) * 0.17;
				f.rotation.y += dt * 0.5;
			});
			for (const b of bolts) {
				b.mesh.position.addScaledVector(b.v, dt);
				b.life -= dt;
				b.mesh.visible = b.life > 0;
			}
			if (primary()) updateBeam(primary());
		}
		updateCamera(dt);
		updateHUD();
		audio.update(dt, {
			speed: primary()?.velocity.length() || 0,
			danger: mission === 3,
			playing: !demo,
		});
	} else if (mode === "title") {
		city.tick(clock);
		updateCamera(dt);
	} else if (mode === "victory") {
		city.tick(clock);
		primary()?.art.tick(dt, 0);
	}
	if (clock > chapterUntil) $("#chapter").classList.add("hidden");
	if (clock > subtitleUntil) $("#subtitle").classList.add("hidden");
	if (clock > toastUntil) $("#toast").classList.add("hidden");
	if (online.active && ready && online.playing) {
		$("#loader").classList.add("hidden");
	}
	renderer.render(scene, camera);
}
init();
