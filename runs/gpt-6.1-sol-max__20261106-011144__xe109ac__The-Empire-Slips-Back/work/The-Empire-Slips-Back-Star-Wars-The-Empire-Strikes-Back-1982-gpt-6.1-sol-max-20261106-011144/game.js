import * as THREE from "three/webgpu";
import { normalWorld, vec3, color, mix } from "three/tsl";
import RAPIER from "rapier";

const $ = (id) => document.getElementById(id);
const show = (id, on = true) => $(id).classList.toggle("hidden", !on);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = {
	ink: 0x142d3d,
	snow: 0xe0ece4,
	blue: 0x7faeba,
	slate: 0x627e8e,
	armor: 0xa8b9b8,
	orange: 0xfa7044,
	ice: 0xb8e9e6,
	green: 0xbce896,
	paper: 0xf1f0df,
	dark: 0x243f4c,
};
const DEFAULTS = {
	speed: 22,
	damage: 1,
	armor: 1,
	enemySpeed: 1,
	cooling: 25,
	heat: 9,
	aimAssist: 1,
	timeScale: 1,
};
const tuning = { ...DEFAULTS };
const settingsDefaults = {
	music: 0.1,
	sfx: 0.65,
	glyphs: "ps",
	shake: 0.55,
	assist: true,
};
let settings = { ...settingsDefaults };
let record = { best: 0, wins: 0 };
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("slips-settings") || "{}"),
	);
	Object.assign(
		record,
		JSON.parse(localStorage.getItem("slips-record") || "{}"),
	);
} catch {}
const saveSettings = () => {
	try {
		localStorage.setItem("slips-settings", JSON.stringify(settings));
	} catch {}
};
let scene,
	camera,
	renderer,
	world,
	eventQueue,
	ground,
	ship,
	shipBody,
	shipCollider,
	shipMixer,
	engineFlames = [],
	snow,
	backdrop,
	base,
	transport;
let walkers = [],
	drones = [],
	bolts = [],
	particles = [],
	pilots = [],
	debris = [],
	mixers = [],
	ghosts = new Map();
let screen = "loading",
	menuPage = "",
	menuReturn = "title",
	ready = false,
	simTime = 0,
	lastTime = 0,
	accumulator = 0,
	uiClock = 0,
	menuIdle = 0;
let padPrior = [],
	padIndex = -1,
	inputKind = "keyboard",
	keys = new Set(),
	mouse = { x: 0, y: 0, down: false, active: false },
	touches = new Map(),
	touchMove = { x: 0, y: 0 },
	touchAim = null;
let lastInput = performance.now(),
	cameraX = 40,
	cameraY = 13,
	shake = 0,
	radioUntil = 0,
	toastUntil = 0,
	bannerUntil = 0,
	hitUntil = 0;
let hudLabels = new Map(),
	debugLines = null,
	debugEnabled = false,
	devGod = false,
	pauseStep = false,
	autoClock = 0;
let currentInput = {
	mx: 0,
	my: 0,
	ax: 1,
	ay: 0,
	fire: false,
	boost: false,
	cable: false,
	focus: false,
};
let game = {};
let hubInfo = null,
	hubStarted = false,
	hubEnded = false,
	hubReported = false,
	netTimer = 0,
	netPeers = new Map(),
	peerConnection = null,
	dataChannel = null,
	broadcast = null,
	netRole = "",
	linkStatus = "Offline",
	standaloneSeed = 8291;
let inputEdges = { focus: false, cable: false },
	audio;
let metrics = {
	shots: 0,
	hits: 0,
	weakHits: 0,
	kills: 0,
	cables: 0,
	rescued: 0,
	repairs: 0,
	focus: 0,
	lost: 0,
};
const stages = [
	{
		name: "FIRST CONTACT",
		objective: "BREAK THE ADVANCE",
		sub: "Destroy two walkers. Keep the generator standing.",
		walkers: [{ x: 20 }, { x: 99 }],
		drones: [],
		pilots: [],
		duration: 0,
	},
	{
		name: "COLD HANDS",
		objective: "NO PILOT LEFT BEHIND",
		sub: "Stop the armor. Hover low to rescue stranded pilots.",
		walkers: [{ x: 56 }, { x: 128 }],
		drones: [
			{ x: 10, y: 17 },
			{ x: 81, y: 20 },
			{ x: 120, y: 16 },
		],
		pilots: [-15, 41, 94],
		duration: 0,
	},
	{
		name: "THE LAST TRANSPORT",
		objective: "HOLD THE NORTH RIDGE",
		sub: "Bring down the siege walker. Cover the evacuation.",
		walkers: [{ x: 36 }, { x: 110, boss: true }],
		drones: [
			{ x: 0, y: 17 },
			{ x: 68, y: 22 },
			{ x: 130, y: 18 },
		],
		pilots: [],
		duration: 65,
	},
];
function rngSeed(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
let rand = rngSeed(8291);
const random = (a, b) => a + (b - a) * rand();
function promptFor(action) {
	const ps = {
		confirm: "✕",
		back: "○",
		fire: "R2",
		boost: "L2",
		cable: "□",
		focus: "△",
		pause: "OPTIONS",
		move: "L",
		aim: "R",
	};
	const xb = {
		confirm: "A",
		back: "B",
		fire: "RT",
		boost: "LT",
		cable: "X",
		focus: "Y",
		pause: "MENU",
		move: "L",
		aim: "R",
	};
	const kb = {
		confirm: "↵",
		back: "ESC",
		fire: "LMB",
		boost: "SHIFT",
		cable: "E",
		focus: "Q",
		pause: "ESC",
		move: "WASD",
		aim: "MOUSE",
	};
	return inputKind === "gamepad"
		? (settings.glyphs === "xbox" ? xb : ps)[action]
		: inputKind === "touch"
			? {
					confirm: "TAP",
					back: "BACK",
					fire: "AUTO",
					boost: "DRAG",
					cable: "TAP",
					focus: "TAP",
					pause: "Ⅱ",
					move: "DRAG",
					aim: "DRAG",
				}[action]
			: kb[action];
}
function updatePrompts() {
	document
		.querySelectorAll("[data-action]")
		.forEach((el) => (el.textContent = promptFor(el.dataset.action)));
	$("titleControls").textContent =
		inputKind === "gamepad"
			? `${promptFor("move")} FLY   ·   ${promptFor("aim")} AIM   ·   ${promptFor("fire")} FIRE`
			: "WASD FLY   ·   MOUSE AIM   ·   CLICK FIRE";
}
function noteInput(kind) {
	lastInput = performance.now();
	menuIdle = 0;
	if (inputKind !== kind) {
		inputKind = kind;
		document.body.classList.toggle("touch", kind === "touch");
		updatePrompts();
	}
	if (screen === "attract") {
		returnToTitle();
		return true;
	}
	return false;
}

class SynthAudio {
	constructor(ctx) {
		this.ctx = ctx;
		this.master = ctx.createGain();
		this.master.gain.value = 0.7;
		this.master.connect(ctx.destination);
		this.music = ctx.createGain();
		this.music.gain.value = settings.music;
		this.music.connect(this.master);
		this.fx = ctx.createGain();
		this.fx.gain.value = settings.sfx;
		this.fx.connect(this.master);
		this.next = 0;
		this.beat = 0;
		this.events = 0;
		this.active = true;
		this.engine = null;
		this.engineOsc = ctx.createOscillator();
		this.engineOsc.type = "sawtooth";
		this.engineOsc.frequency.value = 48;
		this.engineGain = ctx.createGain();
		this.engineGain.gain.value = 0;
		const engineFilter = ctx.createBiquadFilter();
		engineFilter.type = "lowpass";
		engineFilter.frequency.value = 220;
		this.engineOsc.connect(engineFilter);
		engineFilter.connect(this.engineGain);
		this.engineGain.connect(this.fx);
		this.engineOsc.start();
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 256;
		this.master.connect(this.analyser);
		this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
		const a = this.noiseBuffer.getChannelData(0);
		let r = rngSeed(481);
		for (let i = 0; i < a.length; i++) a[i] = r() * 2 - 1;
	}
	tone(
		f,
		d = 0.2,
		type = "triangle",
		gain = 0.1,
		when = this.ctx.currentTime,
		bus = this.fx,
		endF = f,
	) {
		const o = this.ctx.createOscillator(),
			g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(10, f), when);
		o.frequency.exponentialRampToValueAtTime(Math.max(10, endF), when + d);
		g.gain.setValueAtTime(0.001, when);
		g.gain.linearRampToValueAtTime(gain, when + 0.008);
		g.gain.exponentialRampToValueAtTime(0.001, when + d);
		o.connect(g);
		g.connect(bus);
		o.start(when);
		o.stop(when + d + 0.03);
		this.events++;
	}
	noise(d, gain, cut = 1800) {
		const t = this.ctx.currentTime,
			s = this.ctx.createBufferSource(),
			f = this.ctx.createBiquadFilter(),
			g = this.ctx.createGain();
		s.buffer = this.noiseBuffer;
		s.loop = true;
		f.type = "lowpass";
		f.frequency.value = cut;
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + d);
		s.connect(f);
		f.connect(g);
		g.connect(this.fx);
		s.start(t);
		s.stop(t + d);
		this.events++;
	}
	sfx(name) {
		if (!this.active) return;
		const t = this.ctx.currentTime;
		if (name === "fire")
			this.tone(980, 0.11, "sawtooth", 0.035, t, this.fx, 180);
		if (name === "enemy") this.tone(220, 0.25, "square", 0.022, t, this.fx, 80);
		if (name === "hit") {
			this.noise(0.13, 0.12, 2200);
			this.tone(380, 0.12, "triangle", 0.1, t, this.fx, 90);
		}
		if (name === "explode") {
			this.noise(1.1, 0.4, 850);
			this.tone(100, 0.7, "sawtooth", 0.16, t, this.fx, 25);
		}
		if (name === "step") this.noise(0.18, 0.055, 240);
		if (name === "ui") this.tone(610, 0.08, "sine", 0.045, t, this.fx, 920);
		if (name === "rescue") {
			[0, 4, 7, 12].forEach((n, i) =>
				this.tone(330 * 2 ** (n / 12), 0.35, "triangle", 0.11, t + i * 0.1),
			);
		}
		if (name === "focus") {
			[0, 7, 12, 19].forEach((n, i) =>
				this.tone(220 * 2 ** (n / 12), 0.8, "sine", 0.12, t + i * 0.06),
			);
		}
		if (name === "cable") {
			this.tone(470, 0.45, "sawtooth", 0.06, t, this.fx, 85);
			this.noise(0.3, 0.08, 3200);
		}
		if (name === "repair") this.tone(660, 0.08, "sine", 0.04, t, this.fx, 810);
	}
	voice(name = "control") {
		if (!this.active) return;
		let r = rngSeed(name.length + this.events),
			t = this.ctx.currentTime;
		for (let i = 0; i < 9; i++) {
			let f = (name === "pilot" ? 350 : 180) + r() * 220;
			this.tone(
				f,
				0.07 + r() * 0.08,
				"triangle",
				0.06,
				t + i * 0.105,
				this.fx,
				f * (0.6 + r()),
			);
			this.tone(f * 2.4, 0.045, "sine", 0.018, t + i * 0.105);
		}
	}
	tick() {
		if (!this.active || this.ctx.state !== "running") return;
		const now = this.ctx.currentTime;
		const flying = ["playing", "attract"].includes(screen) && !game.ended;
		this.engineGain.gain.setTargetAtTime(
			flying ? (currentInput.boost ? 0.013 : 0.006) : 0,
			now,
			0.15,
		);
		this.engineOsc.frequency.setTargetAtTime(
			48 + (currentInput.boost ? 25 : 0) + Math.abs(currentInput.mx) * 10,
			now,
			0.1,
		);
		if (this.next < now - 0.2) this.next = now + 0.03;
		const minor = [0, 3, 7, 10, 7, 3, 5, 7, 0, 3, 12, 10, 7, 5, 3, -2];
		while (this.next < now + 0.18) {
			const b = this.beat++,
				root = screen === "title" ? 146.83 : 130.81,
				step = minor[(b >> 1) % minor.length],
				f = root * 2 ** (step / 12),
				intense = game.act === 2 ? 1.2 : 1;
			this.tone(f, 0.42, "triangle", 0.11, this.next, this.music);
			if (b % 4 === 0) {
				this.tone(root / 2, 0.8, "sine", 0.16, this.next, this.music);
				this.tone(
					root * 2 ** (7 / 12),
					0.7,
					"sine",
					0.055,
					this.next,
					this.music,
				);
			}
			if (b % 2 === 0)
				this.tone(
					b % 4 === 0 ? 70 : 100,
					0.12,
					"sine",
					0.12 * intense,
					this.next,
					this.music,
					35,
				);
			if (b % 8 === 6)
				this.tone(f * 2, 0.45, "sine", 0.065, this.next, this.music);
			this.next += 0.235;
		}
	}
	volumes() {
		this.music.gain.setTargetAtTime(settings.music, this.ctx.currentTime, 0.03);
		this.fx.gain.setTargetAtTime(settings.sfx, this.ctx.currentTime, 0.03);
	}
	stop() {
		this.active = false;
		this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
	}
	resume() {
		this.active = true;
		this.master.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.03);
		this.next = 0;
	}
}
async function unlockAudio() {
	try {
		if (!audio)
			audio = new SynthAudio(
				new (window.AudioContext || window.webkitAudioContext)(),
			);
		await audio.ctx.resume();
		audio.resume();
	} catch {}
}
const sfx = (name) => audio?.sfx(name);
function radio(text, name = "ECHO CONTROL", duration = 6) {
	$("radioText").textContent = text;
	$("radioName").textContent = name;
	radioUntil = simTime + duration;
	show("radio");
	audio?.voice(name === "ROOK / WING TWO" ? "pilot" : "control");
}
function toast(text, d = 2) {
	$("toast").textContent = text;
	toastUntil = simTime + d;
	show("toast");
}
function banner(small, big, d = 3.2) {
	$("bannerSmall").textContent = small;
	$("bannerBig").textContent = big;
	bannerUntil = simTime + d;
	show("banner");
}

const matCache = new Map(),
	geomCache = new Map();
function cel(hex) {
	if (matCache.has(hex)) return matCache.get(hex);
	const m = new THREE.MeshBasicNodeMaterial({ color: hex });
	const c = new THREE.Color(hex);
	const l = normalWorld
		.dot(vec3(0.35, 0.8, 0.55))
		.max(0)
		.mul(3)
		.floor()
		.div(3);
	m.colorNode = mix(
		color(c.clone().multiplyScalar(0.5)),
		color(c),
		l.mul(0.7).add(0.3),
	);
	matCache.set(hex, m);
	return m;
}
const flat = (hex, transparent = false, opacity = 1) =>
	new THREE.MeshBasicMaterial({
		color: hex,
		transparent,
		opacity,
		depthWrite: !transparent,
	});
const inkMaterial = new THREE.LineBasicMaterial({
	color: C.ink,
	transparent: true,
	opacity: 0.9,
});
function mesh(parent, geometry, material, pos, outline = true) {
	const obj = new THREE.Mesh(geometry, material);
	if (pos) obj.position.copy(pos);
	parent?.add(obj);
	if (outline) {
		const e = new THREE.LineSegments(
			new THREE.EdgesGeometry(geometry, 22),
			inkMaterial,
		);
		obj.add(e);
	}
	return obj;
}
function box(parent, w, h, d, hex, x = 0, y = 0, z = 0, outline = true) {
	const key = `b${w},${h},${d}`;
	if (!geomCache.has(key)) geomCache.set(key, new THREE.BoxGeometry(w, h, d));
	return mesh(parent, geomCache.get(key), cel(hex), V(x, y, z), outline);
}
function cyl(
	parent,
	r,
	h,
	hex,
	x = 0,
	y = 0,
	z = 0,
	segments = 10,
	outline = true,
) {
	return mesh(
		parent,
		new THREE.CylinderGeometry(r, r, h, segments),
		cel(hex),
		V(x, y, z),
		outline,
	);
}
function sphere(parent, r, hex, x = 0, y = 0, z = 0) {
	return mesh(
		parent,
		new THREE.IcosahedronGeometry(r, 1),
		cel(hex),
		V(x, y, z),
	);
}
function line(parent, points, hex = C.ink) {
	const g = new THREE.BufferGeometry().setFromPoints(points);
	const obj = new THREE.Line(g, new THREE.LineBasicMaterial({ color: hex }));
	parent.add(obj);
	return obj;
}
function shadow(parent, x, z, sx, sz, opacity = 0.16) {
	const m = mesh(
		parent,
		new THREE.CircleGeometry(1, 32),
		flat(C.ink, true, opacity),
		V(x, 0.04, z),
		false,
	);
	m.rotation.x = -Math.PI / 2;
	m.scale.set(sx, sz, 1);
	return m;
}
function hatch(parent, w, h, x, y, z) {
	const pts = [];
	for (let t = -w * 0.5; t < w * 0.5; t += 0.65) {
		pts.push(
			V(t, y - h * 0.5, z),
			V(Math.min(t + h * 0.7, w * 0.5), y + h * 0.5, z),
		);
	}
	const obj = new THREE.LineSegments(
		new THREE.BufferGeometry().setFromPoints(pts),
		new THREE.LineBasicMaterial({
			color: C.ink,
			transparent: true,
			opacity: 0.3,
		}),
	);
	obj.position.x = x;
	parent.add(obj);
}
function makeSpeeder(ghost = false, hex = C.orange) {
	const g = new THREE.Group();
	const hull = box(g, 2.5, 0.48, 1.4, ghost ? hex : C.paper);
	hull.rotation.z = -0.06;
	box(g, 1.1, 0.52, 0.85, C.dark, -0.15, 0.4, 0);
	box(g, 0.4, 0.05, 0.87, C.ice, 0.16, 0.68, 0);
	for (let side of [-1, 1]) {
		const wing = box(
			g,
			1.75,
			0.18,
			1.18,
			ghost ? hex : C.paper,
			-0.2,
			-0.05,
			side * 1.1,
		);
		wing.rotation.x = side * 0.12;
		box(g, 1.6, 0.25, 0.22, hex, -0.15, 0.1, side * 1.6);
		const gun = cyl(g, 0.1, 2.25, C.dark, 0.8, 0, side * 1.55, 8);
		gun.rotation.z = -Math.PI / 2;
		const e = cyl(g, 0.24, 0.7, C.slate, -1.2, 0.03, side * 0.72);
		e.rotation.z = Math.PI / 2;
		const fire = mesh(
			g,
			new THREE.ConeGeometry(0.21, 1.3, 8),
			flat(C.ice),
			V(-1.92, 0.03, side * 0.72),
			false,
		);
		fire.rotation.z = Math.PI / 2;
		fire.name = `flame${side}`;
		if (!ghost) engineFlames.push(fire);
	}
	box(g, 0.9, 0.06, 0.36, hex, 0.85, 0.27, 0.3);
	const mixer = new THREE.AnimationMixer(g);
	let tracks = [
		new THREE.NumberKeyframeTrack(".position[z]", [0, 0.7, 1.4], [0, 0.09, 0]),
	];
	for (let side of [-1, 1])
		tracks.push(
			new THREE.NumberKeyframeTrack(
				`flame${side}.scale[y]`,
				[0, 0.07, 0.14, 0.21],
				[0.75, 1.25, 0.85, 0.75],
			),
		);
	mixer
		.clipAction(new THREE.AnimationClip("ion-engine-pulse", 1.4, tracks))
		.play();
	if (!ghost) shipMixer = mixer;
	else mixers.push(mixer);
	return g;
}
function makeWalker(x, boss = false, decor = false) {
	const root = new THREE.Group(),
		scale = boss ? 1.28 : 1;
	root.position.set(x, 0, 0);
	root.scale.setScalar(scale);
	const body = box(root, 7.5, 3.3, 3.6, boss ? 0x8b9ca5 : C.armor, 0, 9.1, 0);
	box(root, 6.5, 0.3, 3.9, C.slate, -0.15, 10.7, 0);
	box(root, 2.1, 2, 3.8, C.slate, 2.7, 9.1, 0);
	box(root, 0.6, 1.5, 2.9, C.dark, -3.9, 8.7, 0);
	for (let z of [-1.83, 1.83]) {
		box(root, 4.9, 2, 0.1, boss ? 0x87959e : 0x92a8ad, -0.5, 9.05, z);
		hatch(root, 4, 1.4, -0.5, 9.05, z * 1.08);
		for (let i = 0; i < 5; i++)
			box(root, 0.05, 0.35, 0.1, C.dark, -2 + i * 0.67, 10.05, z * 1.05, false);
		for (let i = 0; i < 3; i++)
			box(root, 0.17, 1.2, 0.15, C.slate, 1.6 + i * 0.3, 9, z * 1.04);
	}
	const neck = box(root, 1.8, 0.8, 1.6, C.slate, -4.55, 8.7, 0);
	neck.rotation.z = 0.15;
	const head = new THREE.Group();
	root.add(head);
	head.position.set(-5.6, 8.4, 0);
	box(head, 2.1, 1.65, 2, C.armor);
	box(head, 0.09, 0.19, 1.63, C.orange, -1.07, 0.25, 0, false);
	box(head, 0.2, 0.3, 1.9, C.dark, -1.13, -0.45, 0);
	for (let z of [-0.65, 0.65]) {
		const gun = cyl(head, 0.1, 1.9, C.dark, -1.4, -0.55, z, 8);
		gun.rotation.z = Math.PI / 2;
	}
	const tracks = [];
	for (let side of [-1, 1])
		for (let p of [-1, 1]) {
			const hip = new THREE.Group();
			hip.name = `hip${side === -1 ? "B" : "F"}${p === -1 ? "L" : "R"}`;
			hip.position.set(p * 2.5, 7.6, side * 1.3);
			root.add(hip);
			const joint = cyl(hip, 0.65, 0.55, C.slate, 0, 0, 0);
			joint.rotation.x = Math.PI / 2;
			box(hip, 0.7, 3.4, 0.7, C.armor, 0, -1.65, 0);
			box(hip, 0.18, 2.7, 0.16, C.dark, 0.44, -1.65, 0.1);
			const knee = new THREE.Group();
			knee.position.y = -3.4;
			knee.name = `knee${hip.name}`;
			hip.add(knee);
			const cap = cyl(knee, 0.47, 0.72, C.slate);
			cap.rotation.x = Math.PI / 2;
			box(knee, 0.55, 3.45, 0.55, C.armor, 0, -1.6, 0);
			box(knee, 1.65, 0.5, 1.1, C.slate, -0.18, -3.35, 0);
			box(knee, 1.4, 0.12, 1.2, C.armor, -0.18, -3.07, 0);
			const phase = side * p > 0 ? 1 : -1;
			tracks.push(
				new THREE.NumberKeyframeTrack(
					`${hip.name}.rotation[z]`,
					[0, 0.75, 1.5, 2.25, 3],
					[0.22 * phase, 0, -0.22 * phase, 0, 0.22 * phase],
				),
			);
			tracks.push(
				new THREE.NumberKeyframeTrack(
					`${knee.name}.rotation[z]`,
					[0, 0.75, 1.5, 2.25, 3],
					[0.05, 0.18 * phase, 0.05, -0.12 * phase, 0.05],
				),
			);
		}
	tracks.push(
		new THREE.NumberKeyframeTrack(
			".position[y]",
			[0, 0.75, 1.5, 2.25, 3],
			[0, 0.12, 0, 0.12, 0],
		),
	);
	const mixer = new THREE.AnimationMixer(root);
	mixer
		.clipAction(new THREE.AnimationClip("armored-quadruped-march", 3, tracks))
		.play();
	mixers.push(mixer);
	const reactor = mesh(
		root,
		new THREE.SphereGeometry(0.55, 12, 8),
		flat(C.orange),
		V(-0.7, 9.1, 1.94),
		false,
	);
	const ring = mesh(
		root,
		new THREE.RingGeometry(0.75, 0.85, 32),
		flat(C.orange),
		V(-0.7, 9.1, 2),
		false,
	);
	const reactorCore = mesh(
		root,
		new THREE.CircleGeometry(0.22, 12),
		flat(C.paper),
		V(-0.7, 9.1, 2.06),
		false,
	);
	if (boss) {
		box(root, 4, 0.8, 2.5, C.dark, -0.4, 11.4, 0);
		for (const z of [-0.65, 0.65]) {
			const cannon = cyl(root, 0.22, 5, C.slate, -2.4, 11.8, z, 10);
			cannon.rotation.z = Math.PI / 2;
			box(root, 0.7, 0.35, 0.8, C.orange, 0.8, 11.8, z);
		}
		for (let i = 0; i < 3; i++)
			box(root, 0.45, 1.2, 1.4, C.slate, 1.6 + i * 0.7, 11.4, 0);
	}
	const w = {
		armorMesh: body,
		id: Math.floor(random(1, 1e9)),
		root,
		mixer,
		x,
		boss,
		scale,
		hp: (boss ? 100 : 62) * tuning.armor,
		maxHp: (boss ? 100 : 62) * tuning.armor,
		dead: false,
		fallen: false,
		exposed: 0,
		reactor,
		ring,
		reactorCore,
		fireTimer: decor ? 999 : random(2.2, 5),
		phase: random(0, 8),
		stepTimer: 0,
		fall: 0,
		decor,
		body: null,
		collider: null,
		legCollider: null,
		shadow: null,
	};
	scene.add(root);
	w.shadow = shadow(scene, x, 0, 6 * scale, 2.1 * scale, 0.18);
	if (!decor) {
		w.body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				x,
				9.1 * scale,
				0,
			),
		);
		w.collider = world.createCollider(
			RAPIER.ColliderDesc.cuboid(4.1 * scale, 1.8 * scale, 1.8 * scale)
				.setSensor(true)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
			w.body,
		);
		w.legCollider = world.createCollider(
			RAPIER.ColliderDesc.cuboid(3.1 * scale, 3.3 * scale, 1.35 * scale)
				.setTranslation(0, -5 * scale, 0)
				.setSensor(true),
			w.body,
		);
	}
	return w;
}
let decorWalker;
function buildWorld() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x6f96a9);
	scene.fog = new THREE.Fog(0x8fb3bd, 80, 260);
	camera = new THREE.OrthographicCamera(-35, 35, 21, -21, 0.1, 600);
	camera.position.set(40, 17, 52);
	camera.lookAt(40, 12, 0);
	scene.add(new THREE.HemisphereLight(0xeaf5e0, 0x536e87, 2));
	const sun = new THREE.DirectionalLight(0xffe9cc, 2.8);
	sun.position.set(-30, 70, 40);
	scene.add(sun);
	ground = box(scene, 720, 2, 180, C.snow, 0, -1, 0, false);
	const skySun = mesh(
		scene,
		new THREE.CircleGeometry(9, 64),
		flat(0xe5dcc7),
		V(58, 3, -155),
		false,
	);
	line(scene, [V(-340, 4, -12), V(340, 4, -12)], 0x94b3bb);
	backdrop = new THREE.Group();
	scene.add(backdrop);
	let terrainRand = rngSeed(264);
	for (let layer = 0; layer < 3; layer++) {
		for (let i = 0; i < 17; i++) {
			const h = 7 + terrainRand() * 15,
				w = 14 + terrainRand() * 23,
				x = -330 + i * 44 + terrainRand() * 20,
				z = -45 - layer * 45;
			const m = mesh(
				backdrop,
				new THREE.ConeGeometry(w, h, 4),
				cel([0x9abcc4, 0xa8c8cc, 0xbcd4d3][layer]),
				V(x, h * 0.46 - layer * 9, z),
				false,
			);
			m.rotation.y = Math.PI / 4 + terrainRand() * 0.3;
			const cap = mesh(
				backdrop,
				new THREE.ConeGeometry(w * 0.38, h * 0.4, 4),
				cel([0xc8dedb, 0xd7e6dc, 0xe5ece0][layer]),
				V(x, h * 0.79 - layer * 9, z),
				false,
			);
			cap.rotation.y = m.rotation.y;
		}
	}
	for (let i = 0; i < 100; i++) {
		const x = -200 + terrainRand() * 430,
			z = 5 + terrainRand() * 34,
			r = 0.3 + terrainRand() * 1.7;
		const rock = mesh(
			scene,
			new THREE.IcosahedronGeometry(r, 0),
			cel(i % 3 ? 0xc5d9d7 : 0x88aab6),
			V(x, r * 0.2, z),
			true,
		);
		rock.scale.y = 0.4;
		rock.rotation.set(terrainRand(), terrainRand() * 3, terrainRand());
	}
	for (let i = 0; i < 90; i++) {
		const x = -240 + terrainRand() * 530,
			z = -15 + terrainRand() * 40;
		line(
			scene,
			[
				V(x, 0.035, z),
				V(x + 2 + terrainRand() * 5, 0.035, z + 0.1),
				V(x + 7, 0.035, z - 0.3),
			],
			i % 3 ? 0xafcbd0 : 0x8eb1bd,
		);
	}
	// Long trenches, antennae, and warm windows give the base a human scale.
	for (let i = 0; i < 9; i++) {
		box(scene, 6, 0.12, 1.8, 0xabc6cc, -110 + i * 8, 0.06, 5, false);
		box(scene, 6, 0.3, 0.2, 0x759aa8, -110 + i * 8, 0.16, 5.9);
	}
	base = new THREE.Group();
	base.position.x = -104;
	scene.add(base);
	for (let i = 0; i < 4; i++) {
		const dome = mesh(
			base,
			new THREE.SphereGeometry(2.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
			cel(C.slate),
			V(-i * 4.1, 0, -3),
			true,
		);
		box(base, 2.5, 0.25, 0.05, C.orange, -i * 4.1, 0.8, 0.01, false);
	}
	box(base, 19, 0.45, 7, C.blue, -6, 0.2, -3);
	for (let i = 0; i < 3; i++) {
		const plate = mesh(
			base,
			new THREE.TorusGeometry(2.6, 0.35, 6, 20),
			cel(C.armor),
			V(-i * 3.1, 2, -7),
			true,
		);
		plate.rotation.y = Math.PI / 2;
		box(base, 0.4, 2, 0.4, C.dark, -i * 3.1, 1, -7);
	}
	box(base, 12, 0.15, 5, C.ink, 7, 0.08, 0);
	box(base, 10, 0.02, 3.7, C.orange, 7, 0.17, 0, false);
	for (let i = -1; i <= 1; i++)
		box(base, 0.25, 0.03, 3.7, C.paper, 7 + i * 3, 0.19, 0, false);
	line(base, [V(7, 0, 0), V(7, 5, 0)], C.paper);
	for (let i = 0; i < 2; i++) {
		const pole = cyl(base, 0.08, 9, C.dark, -10 + i * 24, 4.5, -5, 8);
		box(base, 2, 0.6, 0.15, C.orange, pole.position.x, 8, -5);
		const dish = mesh(
			base,
			new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, 0.6),
			cel(C.paper),
			V(pole.position.x, 9, -5),
			true,
		);
		dish.rotation.z = 0.4;
	}
	transport = new THREE.Group();
	box(transport, 9, 2.5, 4, C.paper);
	box(transport, 6, 2, 3.6, C.armor, 4, 0.2, 0);
	box(transport, 2, 1.4, 2.5, C.dark, 8, 0.3, 0);
	for (let side of [-1, 1]) {
		box(transport, 9, 0.3, 3, C.slate, -1, -1, side * 3);
		for (let i = 0; i < 3; i++) {
			const e = cyl(transport, 0.5, 1.5, C.dark, -4, 0, side * (1.4 + i * 0.5));
			e.rotation.z = Math.PI / 2;
		}
	}
	transport.position.set(-135, 5, -13);
	scene.add(transport);
	const positions = new Float32Array(800 * 3);
	for (let i = 0; i < 800; i++) {
		positions[i * 3] = terrainRand() * 300 - 150;
		positions[i * 3 + 1] = terrainRand() * 70;
		positions[i * 3 + 2] = terrainRand() * 80 - 35;
	}
	const snowGeo = new THREE.BufferGeometry();
	snowGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	snow = new THREE.Points(
		snowGeo,
		new THREE.PointsMaterial({
			color: 0xf4f3e3,
			size: 0.09,
			transparent: true,
			opacity: 0.65,
		}),
	);
	scene.add(snow);
	ship = makeSpeeder();
	scene.add(ship);
	shipBody = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(-55, 8, 0)
			.setGravityScale(0)
			.lockRotations()
			.setLinearDamping(3)
			.setCcdEnabled(true),
	);
	shipBody.setEnabledTranslations(true, true, false, true);
	shipCollider = world.createCollider(
		RAPIER.ColliderDesc.cuboid(1.2, 0.38, 1.4).setActiveEvents(
			RAPIER.ActiveEvents.COLLISION_EVENTS,
		),
		shipBody,
	);
	ship.userData.shadow = shadow(scene, -55, 0, 2.5, 0.8, 0.17);
	decorWalker = makeWalker(51, false, true);
	decorWalker.root.scale.setScalar(1.55);
	decorWalker.root.position.z = -2;
	decorWalker.shadow.scale.set(9, 3.1, 1);
	decorWalker.reactor.visible = false;
	decorWalker.ring.visible = false;
	decorWalker.reactorCore.visible = false;
}
const targets = new Map();
function removeBody(body) {
	try {
		if (body && body.isValid()) world.removeRigidBody(body);
	} catch {}
}
function retire(obj) {
	if (!obj) return;
	if (obj.parent) obj.parent.remove(obj);
	const cachedGeometry = new Set(geomCache.values()),
		cachedMaterial = new Set(matCache.values());
	cachedMaterial.add(inkMaterial);
	obj.traverse((node) => {
		if (node.geometry && !cachedGeometry.has(node.geometry))
			node.geometry.dispose();
		for (const material of Array.isArray(node.material)
			? node.material
			: node.material
				? [node.material]
				: [])
			if (!cachedMaterial.has(material)) material.dispose();
	});
	mixers = mixers.filter((m) => {
		if (m.getRoot() !== obj) return true;
		m.stopAllAction();
		m.uncacheRoot(obj);
		return false;
	});
}
function clearCombat() {
	for (const w of walkers) {
		removeBody(w.body);
		retire(w.root);
		retire(w.shadow);
		targets.delete(w.collider?.handle);
		targets.delete(w.legCollider?.handle);
	}
	for (const d of drones) {
		removeBody(d.body);
		retire(d.root);
		targets.delete(d.collider?.handle);
	}
	for (const b of bolts) retire(b.mesh);
	for (const p of particles) retire(p.mesh);
	for (const d of debris) {
		removeBody(d.body);
		retire(d.mesh);
	}
	for (const p of pilots) retire(p.root);
	walkers = [];
	drones = [];
	bolts = [];
	particles = [];
	debris = [];
	pilots = [];
	mixers = mixers.filter((m) => m.getRoot() === ship);
	for (const el of hudLabels.values()) el.remove();
	hudLabels.clear();
	if (game.cableLine) retire(game.cableLine);
}
function makeDrone(x, y) {
	const root = new THREE.Group();
	root.position.set(x, y, 0);
	sphere(root, 0.85, C.dark);
	const eye = mesh(
		root,
		new THREE.CircleGeometry(0.25, 16),
		flat(C.orange),
		V(0, 0, 0.86),
		false,
	);
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2;
		const arm = box(
			root,
			0.14,
			1.1,
			0.14,
			C.slate,
			Math.sin(a) * 0.58,
			-1.05,
			Math.cos(a) * 0.58,
		);
		arm.rotation.z = Math.sin(a) * 0.6;
	}
	const fin = box(root, 0.35, 1.8, 0.4, C.armor, 0, 1.1, 0);
	root.add(fin);
	scene.add(root);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, 0),
	);
	const collider = world.createCollider(
		RAPIER.ColliderDesc.ball(0.95).setSensor(true),
		body,
	);
	const d = {
		id: Math.floor(random(1, 1e9)),
		root,
		x,
		y,
		hp: 13,
		maxHp: 13,
		dead: false,
		fireTimer: random(1, 5),
		phase: random(0, 6),
		body,
		collider,
		eye,
	};
	targets.set(collider.handle, { type: "drone", obj: d });
	return d;
}
function makePilot(x) {
	const root = new THREE.Group();
	root.position.set(x, 0, 0);
	const body = cyl(root, 0.24, 0.7, C.orange, 0, 0.8, 0, 8);
	sphere(root, 0.23, C.paper, 0, 1.4, 0);
	for (let s of [-1, 1]) {
		box(root, 0.13, 0.5, 0.15, C.dark, s * 0.15, 0.3, 0);
		const a = box(root, 0.12, 0.6, 0.12, C.orange, s * 0.38, 1, 0);
		a.rotation.z = s * 0.6;
	}
	const beacon = mesh(
		root,
		new THREE.CylinderGeometry(0.05, 0.75, 4, 12, 1, true),
		flat(C.green, true, 0.12),
		V(0, 2, 0),
		false,
	);
	const ring = mesh(
		root,
		new THREE.RingGeometry(0.8, 1, 24),
		flat(C.green),
		V(0, 0.03, 0),
		false,
	);
	ring.rotation.x = -Math.PI / 2;
	scene.add(root);
	const mixer = new THREE.AnimationMixer(root);
	mixer
		.clipAction(
			new THREE.AnimationClip("rescue-beacon", 1.5, [
				new THREE.NumberKeyframeTrack(
					".scale[y]",
					[0, 0.75, 1.5],
					[1, 1.07, 1],
				),
			]),
		)
		.play();
	mixers.push(mixer);
	return { root, x, rescued: false, progress: 0, beacon, ring };
}
function startStage(index, checkpoint = false) {
	clearCombat();
	game.act = index;
	game.stageTime = 0;
	game.clearTime = -1;
	game.transition = 0;
	game.cable = null;
	game.cableProgress = 0;
	game.stageSeed = index;
	const s = stages[index];
	walkers = s.walkers.map((d) => {
		const w = makeWalker(d.x, !!d.boss);
		targets.set(w.collider.handle, { type: "walker", obj: w });
		targets.set(w.legCollider.handle, { type: "leg", obj: w });
		return w;
	});
	drones = s.drones.map((d) => makeDrone(d.x, d.y));
	pilots = s.pilots.map(makePilot);
	game.base = Math.max(game.base, checkpoint ? 70 : game.base);
	if (checkpoint) {
		game.hull = 100;
		game.lives = 3;
		game.x = -55;
		game.y = 8;
		shipBody.setTranslation({ x: game.x, y: game.y, z: 0 }, true);
		shipBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	}
	game.checkpointScore = game.score;
	game.evac = 0;
	game.reinforced = 0;
	game.escapeTime = 0;
	transport.position.set(-116, 3, -13);
	show("banner", false);
	if (index === 0) {
		banner("ECHO SQUADRON / SORTIE 01", "THE NORTH RIDGE");
		radio(
			"Those walkers reach our generator, we lose the base. Make every pass count.",
		);
	}
	if (index === 1) {
		banner("SORTIE 02 / COLD HANDS", "BRING THEM HOME");
		radio(
			"Three pilots down in the snow. Fly low and hold steady. We do not leave our people.",
		);
	}
	if (index === 2) {
		banner("SORTIE 03 / EVACUATION", "ONE LAST STAND");
		radio(
			"Last transport is fueling. That siege walker is the only thing between us and the stars.",
		);
	}
	updateHud();
}
function startGame(attract = false, checkpoint = false) {
	if (hubEnded) return;
	if (!checkpoint) {
		rand = hubInfo ? AIHub.rng("mission") : rngSeed(standaloneSeed);
		metrics = {
			shots: 0,
			hits: 0,
			weakHits: 0,
			kills: 0,
			cables: 0,
			rescued: 0,
			repairs: 0,
			focus: 0,
			lost: 0,
		};
		game = {
			act: 0,
			x: -55,
			y: 8,
			hull: 100,
			base: 100,
			lives: 3,
			score: 0,
			heat: 0,
			overheated: false,
			boost: 100,
			focus: 0,
			focusTime: 0,
			cableCooldown: 0,
			cable: null,
			cableProgress: 0,
			fireCooldown: 0,
			invincible: 2,
			stageTime: 0,
			missionTime: 0,
			evac: 0,
			won: false,
			ended: false,
			direction: 1,
			aim: 0,
			checkpointScore: 0,
			respawn: 0,
			combo: 0,
			comboTimer: 0,
			repairTick: 0,
			cableLine: null,
		};
		simTime = 0;
		autoClock = 0;
		radioUntil = 0;
		toastUntil = 0;
		bannerUntil = 0;
		hitUntil = 0;
		shipBody.setTranslation({ x: game.x, y: game.y, z: 0 }, true);
		shipBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	} else {
		game.ended = false;
		game.score = game.checkpointScore;
		game.heat = 0;
		game.focus = 0;
		game.respawn = 0;
	}
	screen = attract ? "attract" : "playing";
	show("title", false);
	show("overlay", false);
	show("hud");
	show("attractBadge", attract);
	show("hubWaiting", false);
	show("aimMark", inputKind === "keyboard");
	decorWalker.root.visible = false;
	decorWalker.shadow.visible = false;
	ship.visible = true;
	startStage(checkpoint ? game.act : 0, checkpoint);
	cameraX = game.x + 12;
	cameraY = 13;
	menuPage = "";
	hubReported = false;
	inputEdges = { focus: false, cable: false };
	keys.clear();
	mouse.down = false;
	if (!attract) unlockAudio();
}
function returnToTitle() {
	if (hubInfo) return;
	clearCombat();
	game = {};
	screen = "title";
	menuIdle = 0;
	show("hud", false);
	show("attractBadge", false);
	show("overlay", false);
	show("title");
	show("radio", false);
	show("banner", false);
	decorWalker.root.visible = true;
	decorWalker.shadow.visible = true;
	ship.visible = true;
	ship.position.set(33, 10, 4);
	ship.scale.set(1, 1, 1);
	ship.rotation.set(0, 0, -0.08);
	cameraX = 31;
	cameraY = 16;
	shipBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	$("personalBest").textContent = record.best
		? `PERSONAL BEST  ${String(record.best).padStart(6, "0")}   /   EVACUATIONS  ${record.wins}`
		: "YOUR FIRST FLIGHT IS WAITING";
	updatePrompts();
}
function score(amount, reason = "") {
	game.score += Math.round(amount);
	game.focus = clamp(game.focus + amount * 0.008, 0, 100);
	if (reason) toast(`+${amount}  ${reason}`);
}
function burst(x, y, hex, count = 12, size = 0.16, power = 5) {
	for (let i = 0; i < count; i++) {
		const m = mesh(
			scene,
			new THREE.IcosahedronGeometry(size * random(0.5, 1.7), 0),
			cel(hex),
			V(x, y, random(-1, 2)),
			false,
		);
		particles.push({
			mesh: m,
			vx: random(-power, power),
			vy: random(-power * 0.3, power),
			vz: random(-2, 2),
			life: random(0.25, 1.1),
			max: 1.1,
		});
	}
}
function spawnDebris(w) {
	for (let i = 0; i < 11; i++) {
		const size = random(0.3, 0.9),
			m = box(
				scene,
				size,
				size * 0.7,
				size,
				C.slate,
				w.x + random(-3, 3) * w.scale,
				random(6, 11) * w.scale,
				random(-1, 1),
			);
		const body = world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(m.position.x, m.position.y, m.position.z)
				.setCcdEnabled(true),
		);
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(size / 2, size * 0.35, size / 2)
				.setRestitution(0.3)
				.setFriction(0.8),
			body,
		);
		body.setLinvel(
			{ x: random(-6, 6), y: random(4, 11), z: random(-4, 4) },
			true,
		);
		body.setAngvel(
			{ x: random(-4, 4), y: random(-4, 4), z: random(-4, 4) },
			true,
		);
		debris.push({ mesh: m, body, life: 8 });
	}
}
function killWalker(w, cabled = false) {
	if (w.dead) return;
	w.dead = true;
	w.fall = 0;
	metrics.kills++;
	if (cabled) metrics.cables++;
	score(
		w.boss ? 2500 : cabled ? 1100 : 800,
		cabled ? "CABLE TAKEDOWN" : w.boss ? "SIEGE BREAKER" : "WALKER DOWN",
	);
	sfx("explode");
	shake = 1;
	burst(w.x, 8 * w.scale, C.orange, 30, 0.35, 9);
	spawnDebris(w);
	targets.delete(w.collider.handle);
	targets.delete(w.legCollider.handle);
	removeBody(w.body);
	w.body = null;
	w.mixer.stopAllAction();
	const clip = new THREE.AnimationClip("walker-collapse", 1.9, [
		new THREE.NumberKeyframeTrack(
			".rotation[z]",
			[0, 0.5, 1.2, 1.9],
			[0, -0.06, 0.13, 1.42],
		),
		new THREE.NumberKeyframeTrack(
			".position[y]",
			[0, 0.5, 1.2, 1.9],
			[0, 0.15, -1, -2.6],
		),
	]);
	const action = w.mixer.clipAction(clip);
	action.setLoop(THREE.LoopOnce);
	action.clampWhenFinished = true;
	action.play();
	if (w.boss)
		radio(
			"That did it! Armor is down. Keep the sky clear until the transport lifts.",
			"ROOK / WING TWO",
		);
	else if (metrics.kills === 1)
		radio(
			"Good hit! Watch for the orange reactor flash. And those legs are asking for a cable.",
			"ROOK / WING TWO",
		);
}
function damageWalker(w, amount, weak = false) {
	if (w.dead) return;
	w.hp -= amount;
	w.armorMesh.material = cel(
		w.hp / w.maxHp < 0.25
			? 0xd99868
			: w.hp / w.maxHp < 0.5
				? 0xb9ac83
				: w.boss
					? 0x8b9ca5
					: C.armor,
	);
	metrics.hits++;
	if (weak) {
		metrics.weakHits++;
		score(120);
		toast("REACTOR HIT  +120", 1.1);
		burst(w.x - 0.7 * w.scale, 9.1 * w.scale, C.orange, 12, 0.2, 4);
	} else burst(w.x + random(-2, 2), 9 * w.scale, C.paper, 4, 0.1, 3);
	w.exposed = Math.max(w.exposed, weak ? 0.3 : 0);
	game.focus = clamp(game.focus + (weak ? 6 : 1.1), 0, 100);
	hitUntil = simTime + 0.09;
	sfx("hit");
	if (w.hp <= 0) killWalker(w);
}
function killDrone(d) {
	if (d.dead) return;
	d.dead = true;
	d.root.visible = false;
	targets.delete(d.collider.handle);
	removeBody(d.body);
	d.body = null;
	burst(d.x, d.y, C.orange, 15, 0.16, 5);
	score(250);
	sfx("explode");
	metrics.kills++;
}
function damageShip(amount) {
	if (
		game.invincible > 0 ||
		game.focusTime > 0 ||
		screen === "attract" ||
		devGod ||
		game.respawn > 0
	)
		return;
	game.hull = clamp(game.hull - amount * tuning.damage, 0, 100);
	game.invincible = 0.7;
	shake = 0.6;
	burst(game.x, game.y, C.orange, 8, 0.12, 5);
	sfx("hit");
	if (game.cable) cancelCable();
	if (game.hull <= 0) {
		game.lives--;
		metrics.lost++;
		game.respawn = 2.2;
		ship.visible = false;
		burst(game.x, game.y, C.orange, 25, 0.3, 8);
		sfx("explode");
		if (game.lives <= 0)
			endGame(false, "The snow is quiet. Your wing fought to the end.");
		else {
			toast("SPEEDER LOST / REINFORCEMENT INBOUND", 2.4);
			radio(
				"Stay with me. Another speeder is on its way.",
				"ROOK / WING TWO",
				3,
			);
		}
	}
}
function spawnBolt(x, y, angle, enemy = false, homing = false) {
	const speed = enemy ? (homing ? 10 : 24) : 74;
	const bmesh = mesh(
		scene,
		new THREE.BoxGeometry(enemy ? 0.8 : 1.65, 0.13, 0.13),
		flat(enemy ? C.orange : game.focusTime > 0 ? C.green : C.ice),
		V(x, y, 1.3),
		false,
	);
	bmesh.rotation.z = angle;
	const b = {
		mesh: bmesh,
		x,
		y,
		vx: Math.cos(angle) * speed,
		vy: Math.sin(angle) * speed,
		life: enemy ? 6 : 2,
		enemy,
		homing,
		speed,
	};
	bolts.push(b);
	if (enemy) sfx("enemy");
	return b;
}
function shoot() {
	if (
		game.fireCooldown > 0 ||
		game.overheated ||
		game.respawn > 0 ||
		game.cable
	)
		return;
	game.fireCooldown = game.focusTime > 0 ? 0.075 : 0.14;
	game.heat = clamp(game.heat + (game.focusTime > 0 ? 1 : tuning.heat), 0, 110);
	if (game.heat >= 100) {
		game.overheated = true;
		toast("BLASTERS HOT / LET THEM COOL", 2);
		sfx("hit");
	}
	metrics.shots++;
	const a = game.aim;
	spawnBolt(game.x + Math.cos(a) * 1.6, game.y + Math.sin(a) * 1.6, a);
	burst(
		game.x + Math.cos(a) * 1.8,
		game.y + Math.sin(a) * 1.8,
		C.ice,
		2,
		0.06,
		2,
	);
	sfx("fire");
}
function activateFocus() {
	if (game.focus < 100 || game.focusTime > 0 || game.respawn > 0) return;
	game.focus = 0;
	game.focusTime = 7;
	game.heat = 0;
	game.overheated = false;
	metrics.focus++;
	banner("TRUST YOUR INSTINCT", "CLEAR YOUR MIND", 2);
	sfx("focus");
}
function cableTarget() {
	return walkers
		.filter(
			(w) =>
				!w.dead &&
				Math.abs(w.x - game.x) < 13 * w.scale &&
				game.y < 8 * w.scale,
		)
		.sort((a, b) => Math.abs(a.x - game.x) - Math.abs(b.x - game.x))[0];
}
function beginCable() {
	if (game.cableCooldown > 0 || game.cable || game.respawn > 0) return;
	const w = cableTarget();
	if (!w) {
		toast("CABLE: FLY LOW, CLOSE TO WALKER LEGS", 2);
		return;
	}
	game.cable = w;
	game.cableProgress = 0;
	game.invincible = 3.7;
	game.cableLine = line(scene, [V(game.x, game.y, 2), V(w.x, 2, 2)], C.paper);
	sfx("cable");
	toast("CABLE LOCKED / WINDING THE LEGS", 2);
}
function cancelCable() {
	game.cable = null;
	game.cableProgress = 0;
	if (game.cableLine) retire(game.cableLine);
	game.cableLine = null;
	game.cableCooldown = 3;
}
function updateCable(dt) {
	const w = game.cable;
	if (!w) return;
	if (w.dead) {
		cancelCable();
		return;
	}
	game.cableProgress += dt / 3.6;
	const t = game.cableProgress * Math.PI * 6,
		x = w.x + Math.cos(t) * 6.6 * w.scale,
		y = 3.1 * w.scale + Math.sin(t) * 1.4 * w.scale;
	shipBody.setTranslation({ x, y, z: 0 }, true);
	shipBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	game.x = x;
	game.y = y;
	game.direction = Math.sin(t) > 0 ? -1 : 1;
	game.aim = game.direction > 0 ? 0 : Math.PI;
	ship.position.z = Math.sin(t) * 2.7;
	const pts = [V(x, y, ship.position.z)];
	for (let i = 0; i < 50; i++) {
		const a = t - i * 0.1;
		pts.push(
			V(
				w.x + Math.cos(a) * 2.9 * w.scale,
				(1.6 + i * 0.025) * w.scale,
				Math.sin(a) * 2.2 * w.scale,
			),
		);
	}
	game.cableLine.geometry.dispose();
	game.cableLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
	if (game.cableProgress >= 1) {
		killWalker(w, true);
		cancelCable();
		game.cableCooldown = 12;
		game.focus = clamp(game.focus + 15, 0, 100);
		ship.position.z = 0;
		shipBody.setLinvel({ x: game.direction * 12, y: 8, z: 0 }, true);
	}
}
function segmentDistance(px, py, ax, ay, bx, by) {
	const dx = bx - ax,
		dy = by - ay,
		t = clamp(
			((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1),
			0,
			1,
		);
	return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function updateBolts(dt) {
	for (let i = bolts.length - 1; i >= 0; i--) {
		const b = bolts[i];
		b.life -= dt;
		if (b.homing && b.enemy) {
			const a = Math.atan2(game.y - b.y, game.x - b.x);
			b.vx = lerp(b.vx, Math.cos(a) * b.speed, dt * 1.6);
			b.vy = lerp(b.vy, Math.sin(a) * b.speed, dt * 1.6);
		}
		const ox = b.x,
			oy = b.y,
			nx = ox + b.vx * dt,
			ny = oy + b.vy * dt;
		if (b.enemy) {
			if (
				game.respawn <= 0 &&
				segmentDistance(game.x, game.y, ox, oy, nx, ny) < 1.05
			) {
				damageShip(b.homing ? 24 : 14);
				b.life = 0;
			}
		} else {
			const dx = nx - ox,
				dy = ny - oy,
				len = Math.hypot(dx, dy);
			if (len > 0) {
				const ray = new RAPIER.Ray(
					{ x: ox, y: oy, z: 0 },
					{ x: dx / len, y: dy / len, z: 0 },
				);
				const hit = world.castRay(
					ray,
					len,
					true,
					undefined,
					undefined,
					shipCollider,
					shipBody,
					(c) => targets.has(c.handle),
				);
				if (hit) {
					const t = targets.get(hit.collider.handle);
					if (t) {
						if (t.type === "drone") {
							t.obj.hp -= 5;
							if (t.obj.hp <= 0) killDrone(t.obj);
							else {
								metrics.hits++;
								burst(t.obj.x, t.obj.y, C.ice, 4, 0.1, 3);
							}
						} else {
							const w = t.obj;
							const weak =
								t.type !== "leg" &&
								isWeak(w) &&
								segmentDistance(
									w.x - 0.7 * w.scale,
									9.1 * w.scale,
									ox,
									oy,
									nx + (dx / len) * 9 * w.scale,
									ny + (dy / len) * 9 * w.scale,
								) <
									0.85 * w.scale;
							damageWalker(w, t.type === "leg" ? 1.2 : weak ? 25 : 3.7, weak);
						}
						b.life = 0;
					}
				}
				for (const missile of bolts) {
					if (
						missile !== b &&
						missile.enemy &&
						missile.homing &&
						segmentDistance(missile.x, missile.y, ox, oy, nx, ny) < 0.85
					) {
						missile.life = 0;
						b.life = 0;
						score(80);
						burst(missile.x, missile.y, C.orange, 5, 0.12, 3);
						break;
					}
				}
			}
		}
		b.x = nx;
		b.y = ny;
		b.mesh.position.set(nx, ny, 1.3);
		b.mesh.rotation.z = Math.atan2(b.vy, b.vx);
		if (ny < 0.2 || ny > 42 || nx < -160 || nx > 190) b.life = 0;
		if (b.life <= 0) {
			retire(b.mesh);
			bolts.splice(i, 1);
		}
	}
}
function isWeak(w) {
	return (
		!w.dead &&
		(w.fallen || w.exposed > 0 || (game.stageTime + w.phase) % 7.8 < 2.8)
	);
}
function updateEnemies(dt) {
	for (const w of walkers) {
		if (w.dead) {
			w.fall += dt;
			w.reactor.visible = false;
			w.ring.visible = false;
			w.reactorCore.visible = false;
			w.shadow.material.opacity = Math.max(0.05, 0.18 - w.fall * 0.03);
			continue;
		}
		const speed = (w.boss ? 0.54 : 0.66 + game.act * 0.08) * tuning.enemySpeed;
		w.x -= speed * dt;
		w.root.position.x = w.x;
		w.shadow.position.x = w.x;
		w.mixer.timeScale = (speed / 0.66) * 0.8;
		w.body.setNextKinematicTranslation({ x: w.x, y: 9.1 * w.scale, z: 0 });
		w.exposed = Math.max(0, w.exposed - dt);
		const weak = isWeak(w);
		w.reactor.visible = weak;
		w.ring.visible = weak;
		w.reactorCore.visible = weak;
		w.ring.scale.setScalar(1 + Math.sin(simTime * 8) * 0.13);
		w.ring.rotation.z += dt;
		w.fireTimer -= dt;
		w.stepTimer -= dt;
		if (w.stepTimer <= 0) {
			w.stepTimer = 1.5;
			if (Math.abs(w.x - game.x) < 45) {
				sfx("step");
				shake = Math.max(shake, 0.08);
				burst(w.x + random(-2, 2), 0.2, C.snow, 5, 0.17, 2);
			}
		}
		if (w.fireTimer <= 0) {
			w.fireTimer = random(2.8, 5) / (1 + game.act * 0.2);
			if (Math.abs(w.x - game.x) < 65 && game.respawn <= 0) {
				const x = w.x - 6.5 * w.scale,
					y = 8 * w.scale,
					a = Math.atan2(game.y - y, game.x - x);
				spawnBolt(x, y, a, true, game.act > 0 && rand() < 0.32);
				burst(x, y, C.orange, 3, 0.1, 2);
			}
		}
		if (w.x < -94) {
			game.base -= w.boss ? 42 : 28;
			w.x = -65;
			w.root.position.x = w.x;
			w.body.setTranslation({ x: w.x, y: 9.1 * w.scale, z: 0 }, true);
			radio("Generator hit! Turn them back. We cannot take another barrage.");
			shake = 1.3;
			sfx("explode");
			burst(-104, 3, C.orange, 22, 0.35, 9);
			if (game.base <= 0) {
				game.base = 0;
				endGame(
					false,
					"The generator is gone. The ridge belongs to the Empire.",
				);
				return;
			}
		}
	}
	for (const d of drones) {
		if (d.dead) continue;
		d.phase += dt;
		d.x += Math.sin(d.phase * 0.55) * dt * 2;
		d.y += Math.cos(d.phase * 0.8) * dt * 0.9;
		d.root.position.set(d.x, d.y, Math.sin(d.phase) * 0.4);
		d.root.rotation.y = Math.sin(d.phase) * 0.4;
		d.body.setNextKinematicTranslation({ x: d.x, y: d.y, z: 0 });
		d.fireTimer -= dt;
		if (d.fireTimer <= 0 && Math.abs(d.x - game.x) < 65) {
			d.fireTimer = random(3, 6);
			spawnBolt(d.x, d.y, Math.atan2(game.y - d.y, game.x - d.x), true, true);
		}
	}
}
function updateRescues(dt) {
	for (const p of pilots) {
		if (p.rescued) continue;
		p.ring.rotation.z += dt;
		p.beacon.material.opacity = 0.12 + Math.sin(simTime * 4) * 0.04;
		const close =
			Math.abs(game.x - p.x) < 4.2 &&
			game.y < 4.4 &&
			!game.cable &&
			game.respawn <= 0;
		if (close) {
			p.progress += dt / 1.4;
			if (p.progress >= 1) {
				p.rescued = true;
				retire(p.root);
				metrics.rescued++;
				score(1000, "PILOT RECOVERED");
				game.hull = clamp(game.hull + 12, 0, 100);
				game.focus = clamp(game.focus + 22, 0, 100);
				sfx("rescue");
				radio(
					[
						"Thought you had forgotten me. Let’s get off this ice cube!",
						"I owe you a warm drink. Two, if we live.",
						"All accounted for. Now let’s make some very large footprints disappear.",
					][metrics.rescued - 1] || "Good flying, Commander.",
					"ROOK / WING TWO",
					4,
				);
			}
		} else p.progress = Math.max(0, p.progress - dt * 0.5);
	}
	const repairing =
		Math.abs(game.x + 97) < 5.7 &&
		game.y < 3.3 &&
		game.respawn <= 0 &&
		!game.cable;
	if (repairing && game.hull < 100) {
		const before = game.hull;
		game.hull = clamp(game.hull + dt * 16, 0, 100);
		metrics.repairs += game.hull - before;
		game.repairTick -= dt;
		if (game.repairTick < 0) {
			game.repairTick = 0.4;
			sfx("repair");
			burst(game.x, game.y, C.green, 3, 0.08, 1);
		}
	}
}
function updateParticles(dt) {
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= dt;
		p.vy -= dt * 8;
		p.mesh.position.x += p.vx * dt;
		p.mesh.position.y += p.vy * dt;
		p.mesh.position.z += p.vz * dt;
		p.mesh.rotation.x += dt * 4;
		p.mesh.rotation.z += dt * 3;
		p.mesh.scale.setScalar(Math.max(0.05, p.life / p.max));
		if (p.life <= 0) {
			retire(p.mesh);
			particles.splice(i, 1);
		}
	}
	for (let i = debris.length - 1; i >= 0; i--) {
		const d = debris[i];
		d.life -= dt;
		d.mesh.position.copy(d.body.translation());
		d.mesh.quaternion.copy(d.body.rotation());
		if (d.life < 1) d.mesh.scale.setScalar(Math.max(0.01, d.life));
		if (d.life <= 0) {
			retire(d.mesh);
			removeBody(d.body);
			debris.splice(i, 1);
		}
	}
}
function updateMission(dt) {
	game.stageTime += dt;
	game.missionTime += dt;
	if (game.act === 2) {
		game.evac = clamp(game.stageTime / 65, 0, 1);
		const threshold =
			game.reinforced === 0 ? 24 : game.reinforced === 1 ? 44 : Infinity;
		if (game.stageTime > threshold) {
			game.reinforced++;
			drones.push(
				makeDrone(clamp(game.x + 36, -40, 135), 18),
				makeDrone(135, 22),
			);
			radio(
				game.reinforced === 1
					? "More probes coming over the ridge. Keep them off the transport!"
					: "Last of their scouts. Clear the flight path!",
			);
		}
		const clear = walkers.every((w) => w.dead) && drones.every((d) => d.dead);
		if (game.stageTime > 65 && clear) {
			game.escapeTime += dt;
			transport.position.x += dt * 17;
			transport.position.y += dt * 4;
		}
		if (game.escapeTime > 4)
			endGame(true, "The last transport is away. Today, hope flies.");
	} else if (walkers.every((w) => w.dead) && drones.every((d) => d.dead)) {
		if (game.clearTime < 0) {
			game.clearTime = game.stageTime;
			radio(
				game.act === 0
					? "First wave broken. Catch your breath; more signatures beyond the ridge."
					: "The sky is clear. Collect any remaining pilots. We lift soon.",
			);
		}
		const wait = game.act === 0 ? 7 : pilots.every((p) => p.rescued) ? 5 : 18;
		game.transition = wait - (game.stageTime - game.clearTime);
		if (game.transition <= 0) {
			game.hull = Math.min(100, game.hull + 25);
			game.focus = Math.min(100, game.focus + 15);
			startStage(game.act + 1);
		}
	}
	if (game.stageTime > 12 && game.act === 0 && !game.taughtCable) {
		game.taughtCable = true;
		radio(
			"Get below the armor and close to the legs. A tow cable can bring the whole beast down.",
			"ROOK / WING TWO",
		);
	}
	if (game.focus >= 100 && !game.taughtFocus) {
		game.taughtFocus = true;
		radio(
			"Steady. You know what to do. Trust your instinct.",
			"ROOK / WING TWO",
		);
	}
}
function simulate(dt, input) {
	if (game.ended || hubEnded) return;
	simTime += dt;
	game.fireCooldown = Math.max(0, game.fireCooldown - dt);
	game.invincible = Math.max(0, game.invincible - dt);
	game.focusTime = Math.max(0, game.focusTime - dt);
	game.cableCooldown = Math.max(0, game.cableCooldown - dt);
	game.heat = Math.max(
		0,
		game.heat - dt * tuning.cooling * (game.focusTime > 0 ? 2 : 1),
	);
	if (game.overheated && game.heat < 32) game.overheated = false;
	game.focus = clamp(game.focus + dt * 1.05, 0, 100);
	if (game.respawn > 0) {
		game.respawn -= dt;
		if (game.respawn <= 0 && !game.ended) {
			game.hull = 100;
			game.x = -60;
			game.y = 8;
			shipBody.setTranslation({ x: game.x, y: game.y, z: 0 }, true);
			shipBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
			game.invincible = 3;
			ship.visible = true;
		}
	} else if (!game.cable) {
		let mx = input.mx,
			my = input.my;
		const len = Math.hypot(mx, my);
		if (len > 1) {
			mx /= len;
			my /= len;
		}
		const boost = input.boost && game.boost > 1 && (mx || my);
		game.boost = clamp(game.boost + dt * (boost ? -30 : 20), 0, 100);
		const speed = tuning.speed * (boost ? 1.8 : 1),
			vel = shipBody.linvel();
		shipBody.setLinvel(
			{
				x: lerp(vel.x, mx * speed, 1 - Math.exp(-dt * 9)),
				y: lerp(vel.y, my * speed * 0.75, 1 - Math.exp(-dt * 9)),
				z: 0,
			},
			true,
		);
		if (Math.abs(input.ax) + Math.abs(input.ay) > 0.1) {
			game.aim = Math.atan2(input.ay, input.ax);
			game.direction = Math.cos(game.aim) < 0 ? -1 : 1;
		} else if (Math.abs(mx) > 0.15) {
			game.direction = mx > 0 ? 1 : -1;
			game.aim = game.direction > 0 ? 0 : Math.PI;
		}
		if (input.focus && !inputEdges.focus) activateFocus();
		if (input.cable && !inputEdges.cable) beginCable();
		if (input.fire) shoot();
		if (boost && rand() < dt * 24)
			burst(game.x - game.direction * 2, game.y, C.ice, 1, 0.11, 1);
	}
	inputEdges = { focus: input.focus, cable: input.cable };
	updateEnemies(dt);
	world.timestep = dt;
	world.step(eventQueue);
	eventQueue.drainCollisionEvents((a, b, started) => {
		if (!started) return;
		const other =
			a === shipCollider.handle ? b : b === shipCollider.handle ? a : null;
		if (other != null && targets.has(other)) damageShip(20);
	});
	if (!game.cable) {
		const p = shipBody.translation();
		game.x = clamp(p.x, -124, 147);
		game.y = clamp(p.y, 1.25, 29);
		if (game.x !== p.x || game.y !== p.y)
			shipBody.setTranslation({ x: game.x, y: game.y, z: 0 }, true);
		ship.position.z = 0;
	}
	updateCable(dt);
	updateBolts(dt);
	updateRescues(dt);
	updateParticles(dt);
	updateMission(dt);
	for (const m of mixers) m.update(dt);
	shipMixer.update(dt);
	updateShipVisual(dt, input);
}
function updateShipVisual(dt, input) {
	ship.position.x = game.x;
	ship.position.y = game.y;
	ship.position.z = game.cable
		? Math.sin(game.cableProgress * Math.PI * 6) * 2.7
		: 0;
	ship.scale.x = game.direction;
	const desired = clamp(input.my * 0.17 + input.mx * 0.04, -0.24, 0.24);
	ship.rotation.z = lerp(ship.rotation.z, desired * game.direction, dt * 8);
	ship.rotation.x = lerp(ship.rotation.x, -input.my * 0.13, dt * 6);
	ship.visible =
		game.respawn <= 0 &&
		(game.invincible <= 0 ||
			Math.sin(simTime * 25) > -0.25 ||
			game.cable ||
			game.focusTime > 0);
	const sh = ship.userData.shadow;
	sh.position.x = game.x;
	sh.scale.set(2.5 + game.y * 0.06, 0.8 + game.y * 0.025, 1);
	sh.material.opacity = clamp(0.26 - game.y * 0.005, 0.05, 0.22);
	if (game.focusTime > 0 && rand() < dt * 30)
		burst(game.x, game.y, C.green, 1, 0.15, 1);
}
function endGame(won, message) {
	if (game.ended) return;
	game.ended = true;
	game.won = won;
	game.message = message;
	if (won) {
		const bonus = Math.round(
			game.base * 10 + game.lives * 300 + metrics.rescued * 250,
		);
		score(bonus);
		banner("THE LAST TRANSPORT IS AWAY", "HOPE FLIES", 3);
		sfx("rescue");
	}
	if (screen === "attract") {
		game.demoRestart = simTime + 5;
		return;
	}
	screen = "result";
	if (!hubInfo) {
		if (game.score > record.best) record.best = game.score;
		if (won) record.wins++;
		try {
			localStorage.setItem("slips-record", JSON.stringify(record));
		} catch {}
	}
	reportHub();
	openResult();
}
function autopilot(dt) {
	autoClock += dt;
	const input = {
		mx: 0,
		my: 0,
		ax: 1,
		ay: 0,
		fire: false,
		boost: false,
		cable: false,
		focus: false,
	};
	if (game.ended) return input;
	const living = walkers.filter((w) => !w.dead),
		liveDrones = drones.filter((d) => !d.dead),
		unrescued = pilots.filter((p) => !p.rescued);
	let tx = game.x,
		ty = game.y;
	const rescue =
		game.act === 1 &&
		unrescued.length &&
		(living.length === 0 || game.stageTime % 28 > 19);
	if (rescue) {
		const p = unrescued.reduce((a, b) =>
			Math.abs(a.x - game.x) < Math.abs(b.x - game.x) ? a : b,
		);
		tx = p.x;
		ty = 2.5;
	} else if (living.length) {
		const w = living[0];
		const useCable =
			(w.boss ||
				(living.length === 1 && game.act === 1) ||
				(game.act === 0 && metrics.cables === 0 && living.length === 1)) &&
			game.cableCooldown <= 0;
		if (useCable) {
			tx = w.x + 9;
			ty = 4.1;
			if (Math.abs(game.x - tx) < 4 && Math.abs(game.y - ty) < 2)
				input.cable = true;
		} else {
			tx = w.x - 19;
			ty = 9.1 * w.scale;
			const ax = w.x - 0.7 * w.scale - game.x,
				ay = 9.1 * w.scale - game.y;
			input.ax = ax;
			input.ay = ay;
			input.fire = Math.abs(game.y - ty) < 2.7 && Math.abs(game.x - w.x) < 40;
		}
	} else if (liveDrones.length) {
		const d = liveDrones[0];
		tx = d.x - 13;
		ty = d.y;
		input.ax = d.x - game.x;
		input.ay = d.y - game.y;
		input.fire = true;
	} else if (unrescued.length) {
		tx = unrescued[0].x;
		ty = 2.5;
	} else {
		tx = -72 + Math.sin(autoClock * 0.5) * 12;
		ty = 10 + Math.cos(autoClock * 0.6) * 4;
	}
	input.mx = clamp((tx - game.x) * 0.3, -1, 1);
	input.my = clamp((ty - game.y) * 0.45, -1, 1);
	if (!input.fire) {
		input.ax = tx - game.x;
		input.ay = 0;
	}
	input.boost = Math.abs(tx - game.x) > 35;
	input.focus = game.focus >= 100;
	if (screen === "attract") {
		game.hull = 100;
		game.base = 100;
		if (game.stageTime > 25 && game.focus < 100 && metrics.focus === 0)
			game.focus = 100;
	}
	return input;
}
function pointerWorld(x, y) {
	const vec = V((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2, 0.5);
	vec.unproject(camera);
	const dir = camera.getWorldDirection(V());
	const t = -vec.z / dir.z;
	return vec.addScaledVector(dir, t);
}
function readInput() {
	let mx = 0,
		my = 0,
		ax = game.direction || 1,
		ay = 0,
		fire = mouse.down || keys.has("Space"),
		boost = keys.has("ShiftLeft") || keys.has("ShiftRight"),
		cable = keys.has("KeyE"),
		focus = keys.has("KeyQ");
	if (keys.has("KeyA") || keys.has("ArrowLeft")) mx--;
	if (keys.has("KeyD") || keys.has("ArrowRight")) mx++;
	if (keys.has("KeyW") || keys.has("ArrowUp")) my++;
	if (keys.has("KeyS") || keys.has("ArrowDown")) my--;
	if (mouse.active && inputKind === "keyboard") {
		const p = pointerWorld(mouse.x, mouse.y);
		ax = p.x - game.x;
		ay = p.y - game.y;
	}
	const pads = navigator.getGamepads?.() || [];
	const pad =
		padIndex >= 0 ? pads[padIndex] : Array.from(pads).find((p) => p?.connected);
	if (pad && inputKind === "gamepad") {
		const dead = (x) =>
			Math.abs(x) < 0.16 ? 0 : (Math.sign(x) * (Math.abs(x) - 0.16)) / 0.84;
		mx = dead(pad.axes[0] || 0);
		my = -dead(pad.axes[1] || 0);
		const rx = dead(pad.axes[2] || 0),
			ry = -dead(pad.axes[3] || 0);
		if (Math.hypot(rx, ry) > 0.1) {
			ax = rx;
			ay = ry;
		} else {
			ax = Math.abs(mx) > 0.1 ? mx : game.direction;
			ay = 0;
		}
		fire = !!(pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
		boost = !!pad.buttons[6]?.pressed;
		cable = !!pad.buttons[2]?.pressed;
		focus = !!pad.buttons[3]?.pressed;
	}
	if (inputKind === "touch") {
		mx = touchMove.x;
		my = touchMove.y;
		boost = Math.hypot(mx, my) > 0.9;
		if (touchAim) {
			const p = pointerWorld(touchAim.x, touchAim.y);
			ax = p.x - game.x;
			ay = p.y - game.y;
			fire = true;
		} else {
			let target =
				walkers.find((w) => !w.dead && Math.abs(w.x - game.x) < 35) ||
				drones.find((d) => !d.dead && Math.abs(d.x - game.x) < 32);
			if (target) {
				ax = target.x - (target.boss ? 0.7 * target.scale : 0.7) - game.x;
				ay = (target.root ? target.y || 9.1 * (target.scale || 1) : 9) - game.y;
				fire = true;
			} else ax = game.direction;
		}
	}
	if (settings.assist && tuning.aimAssist > 0 && inputKind !== "keyboard") {
		let angle = Math.atan2(ay, ax),
			best = null,
			bestDelta = 0.16 * tuning.aimAssist;
		for (const w of walkers) {
			if (w.dead) continue;
			const targetAngle = Math.atan2(
				9.1 * w.scale - game.y,
				w.x - 0.7 * w.scale - game.x,
			);
			let delta = Math.atan2(
				Math.sin(targetAngle - angle),
				Math.cos(targetAngle - angle),
			);
			if (Math.abs(delta) < bestDelta) {
				best = w;
				bestDelta = Math.abs(delta);
			}
		}
		if (best) {
			const a = Math.atan2(
				9.1 * best.scale - game.y,
				best.x - 0.7 * best.scale - game.x,
			);
			ax = Math.cos(a);
			ay = Math.sin(a);
		}
	}
	return { mx, my, ax, ay, fire, boost, cable, focus };
}
function project(x, y, z = 2) {
	const p = V(x, y, z).project(camera);
	return {
		x: (p.x * 0.5 + 0.5) * innerWidth,
		y: (-0.5 * p.y + 0.5) * innerHeight,
		visible:
			p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.15 && Math.abs(p.y) < 1.15,
	};
}
function label(key, cls = "") {
	if (!hudLabels.has(key)) {
		const el = document.createElement("div");
		el.className = "worldlabel " + cls;
		$("worldLabels").append(el);
		hudLabels.set(key, el);
	}
	return hudLabels.get(key);
}
function updateLabels() {
	for (const w of walkers) {
		const el = label("w" + w.id);
		if (w.dead) {
			el.classList.add("hidden");
			continue;
		}
		const p = project(w.x, 12.5 * w.scale);
		el.classList.toggle("hidden", !p.visible);
		el.style.left = p.x + "px";
		el.style.top = p.y + "px";
		el.innerHTML = `<div class="name">${w.boss ? "SIEGE WALKER" : "ARMORED WALKER"}${isWeak(w) ? " / REACTOR OPEN" : ""}</div><div class="bar"><i style="width:${clamp((w.hp / w.maxHp) * 100, 0, 100)}%"></i></div>`;
	}
	for (let i = 0; i < pilots.length; i++) {
		const p = pilots[i],
			el = label("p" + i, "pilot"),
			v = project(p.x, 3.8);
		el.classList.toggle("hidden", p.rescued || !v.visible);
		el.style.left = v.x + "px";
		el.style.top = v.y + "px";
		el.textContent =
			p.progress > 0 ? `WINCH ${Math.round(p.progress * 100)}%` : "PILOT";
	}
	const pos = project(-97, 4.1);
	const b = label("base", "pilot");
	b.style.left = pos.x + "px";
	b.style.top = pos.y + "px";
	b.classList.toggle("hidden", !pos.visible);
	b.style.color = "#b8e9e6";
	b.textContent = "REPAIR PAD";
	for (const [id, g] of ghosts) {
		const p = project(g.root.position.x, g.root.position.y + 2.2),
			el = label("g" + id);
		el.classList.toggle(
			"hidden",
			!p.visible || g.act !== game.act || !g.root.visible,
		);
		el.style.left = p.x + "px";
		el.style.top = p.y + "px";
		el.textContent = g.name;
		el.style.font = "600 12px var(--font)";
		el.style.color = g.color;
	}
}
function drawRadar() {
	const c = $("radar"),
		ctx = c.getContext("2d"),
		w = c.width,
		h = c.height;
	ctx.clearRect(0, 0, w, h);
	const px = (x) => ((x + 128) / 280) * w;
	ctx.strokeStyle = "#b8e9e633";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, 65);
	ctx.lineTo(w, 65);
	for (let i = 0; i < 8; i++) {
		ctx.moveTo((i * w) / 7, 60);
		ctx.lineTo((i * w) / 7, 70);
	}
	ctx.stroke();
	ctx.fillStyle = "#b8e9e633";
	ctx.fillRect(
		px(cameraX - camera.right),
		0,
		((camera.right - camera.left) / 280) * w,
		67,
	);
	ctx.fillStyle = "#bce896";
	ctx.fillRect(px(-104), 41, 12, 23);
	for (const walker of walkers) {
		if (walker.dead) continue;
		ctx.fillStyle = walker.boss ? "#faad68" : "#fa7044";
		ctx.fillRect(
			px(walker.x) - 4,
			walker.boss ? 28 : 36,
			walker.boss ? 11 : 8,
			26,
		);
		ctx.fillRect(px(walker.x) - 8, walker.boss ? 34 : 42, 5, 4);
	}
	for (const d of drones) {
		if (d.dead) continue;
		ctx.fillStyle = "#fa7044";
		ctx.beginPath();
		ctx.arc(px(d.x), 65 - d.y * 1.6, 3, 0, Math.PI * 2);
		ctx.fill();
	}
	for (const p of pilots) {
		if (p.rescued) continue;
		ctx.fillStyle = "#bce896";
		ctx.beginPath();
		ctx.arc(px(p.x), 60, 3, 0, Math.PI * 2);
		ctx.fill();
	}
	for (const g of ghosts.values()) {
		if (g.act !== game.act) continue;
		ctx.fillStyle = g.color;
		ctx.fillRect(
			px(g.root.position.x) - 2,
			65 - g.root.position.y * 1.6 - 2,
			5,
			5,
		);
	}
	ctx.fillStyle = "#b8e9e6";
	ctx.beginPath();
	const x = px(game.x),
		y = 65 - game.y * 1.6;
	ctx.moveTo(x + 6 * game.direction, y);
	ctx.lineTo(x - 4 * game.direction, y - 4);
	ctx.lineTo(x - 4 * game.direction, y + 4);
	ctx.closePath();
	ctx.fill();
}
function updateHud() {
	if (!game.hull && game.hull !== 0) return;
	const s = stages[game.act];
	$("actName").textContent = `0${game.act + 1} / ${s.name}`;
	$("objective").textContent =
		game.transition > 0 ? "RIDGE SECURED" : s.objective;
	$("subObjective").textContent =
		game.transition > 0
			? `Next wave in ${Math.ceil(game.transition)}s. ${game.act === 1 ? "Rescues still available." : "Land on the blue pad to repair."}`
			: s.sub;
	$("hullNumber").textContent = Math.ceil(game.hull);
	$("hullBar").style.width = game.hull + "%";
	$("hullBar").style.background = game.hull < 30 ? "#fa7044" : "#b8e9e6";
	$("lives").textContent = Array.from({ length: 3 }, (_, i) =>
		i < game.lives ? "◆" : "◇",
	).join(" ");
	$("baseValue").textContent = Math.ceil(game.base) + "%";
	$("baseBar").style.width = game.base + "%";
	$("heatBar").style.width = Math.min(100, game.heat) + "%";
	$("heatLabel").textContent = game.overheated ? "COOLING…" : "BLASTER HEAT";
	$("score").textContent = String(game.score).padStart(6, "0");
	$("waveCount").textContent = "WAVE " + (game.act + 1) + " OF 3";
	const time =
		game.act === 2 ? Math.max(0, 65 - game.stageTime) : game.missionTime;
	const mins = Math.floor(time / 60),
		secs = Math.floor(time % 60);
	$("evacTime").textContent =
		game.act === 2
			? `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
			: `0${game.act + 1} / 03`;
	$("evacBar").style.width =
		(game.act === 2 ? game.evac * 100 : (game.act / 3) * 100) + "%";
	$("abilityPrompts").innerHTML =
		`<span class="ability ${game.cableCooldown <= 0 ? "ready" : ""}"><span class="prompt">${promptFor("cable")}</span> ${game.cable ? "WINDING" : game.cableCooldown > 0 ? Math.ceil(game.cableCooldown) + "s" : "CABLE"}</span><span class="ability ${game.focus >= 100 || game.focusTime > 0 ? "ready" : ""}"><span class="prompt">${promptFor("focus")}</span> ${game.focusTime > 0 ? "INSTINCT " + Math.ceil(game.focusTime) + "s" : game.focus >= 100 ? "INSTINCT READY" : Math.floor(game.focus) + "%"}</span>`;
	let context = "";
	if (game.cable)
		context = `WINDING THE LEGS / ${Math.min(100, Math.floor(game.cableProgress * 100))}%<small>Hold your nerve. The cable is doing its work.</small>`;
	else if (Math.abs(game.x + 97) < 6 && game.y < 3.4 && game.hull < 100)
		context = "REPAIRING HULL<small>Hold steady on the landing pad.</small>";
	else if (pilots.some((p) => !p.rescued && Math.abs(p.x - game.x) < 7))
		context =
			"RESCUE: HOVER LOW & HOLD STEADY<small>Stay below 4 m to winch the pilot aboard.</small>";
	else if (cableTarget() && game.cableCooldown <= 0)
		context = `<span class="prompt">${promptFor("cable")}</span> DEPLOY TOW CABLE<small>Automatic wrap • three passes around the legs</small>`;
	else if (game.focus >= 100)
		context = `<span class="prompt">${promptFor("focus")}</span> TRUST YOUR INSTINCT<small>7 seconds of protection and rapid fire</small>`;
	$("context").innerHTML = context;
	show("context", !!context);
	const touchReady =
		inputKind === "touch" &&
		!game.cable &&
		(game.focus >= 100 || (cableTarget() && game.cableCooldown <= 0));
	show("touchAction", touchReady);
	$("touchAction").textContent =
		cableTarget() && game.cableCooldown <= 0 ? "CABLE" : "INSTINCT";
	show(
		"radio",
		simTime < radioUntil && !(inputKind === "touch" && simTime < toastUntil),
	);
	show("toast", simTime < toastUntil);
	show("banner", simTime < bannerUntil);
	$("hitMark").style.opacity = simTime < hitUntil ? "1" : "0";
	$("damageFlash").style.opacity =
		game.invincible > 0.25 && game.invincible < 0.72 && game.focusTime <= 0
			? ".7"
			: "0";
	drawRadar();
	updateLabels();
	const wing = $("wingScores");
	wing.replaceChildren();
	for (const [id, g] of ghosts) {
		if (performance.now() - g.received > 8000) continue;
		const row = document.createElement("div");
		row.className = "wingrow";
		row.style.borderColor = g.color;
		const name = document.createElement("span");
		name.textContent = g.name;
		const sc = document.createElement("b");
		sc.textContent = String(g.score).padStart(6, "0");
		row.append(name, sc);
		wing.append(row);
	}
	if (debugEnabled) updateDebug();
}
function panel(html, page) {
	$("panel").innerHTML = html;
	menuPage = page;
	show("overlay");
	const el = $("panel").querySelector("button,input,select,textarea");
	el?.focus({ preventScroll: true });
	updatePrompts();
	bindMenuHover();
}
const backButton = (label = "BACK") =>
	`<button class="back" id="menuBack"><span class="prompt" data-action="back">ESC</span> ${label}</button>`;
function bindBack(fn) {
	$("menuBack")?.addEventListener("click", () => {
		sfx("ui");
		fn();
	});
}
function openPause() {
	if (screen !== "playing" || hubEnded) return;
	screen = "paused";
	menuReturn = "pause";
	mouse.down = false;
	panel(
		`<div class="eyebrow">ECHO SQUADRON / COMMAND CHANNEL</div><h2>HOLDING PATTERN<span class="orange">.</span></h2><p>The ridge can wait a moment.</p><div class="menu"><button class="primary" id="resume"><span class="prompt" data-action="confirm">↵</span> RESUME FLIGHT</button><button id="pauseHow">FLIGHT SCHOOL</button><button id="pauseOptions">OPTIONS</button><button id="dev">DEVELOPER TOOLS</button>${hubInfo ? "" : `<button id="checkpoint">RESTART CHECKPOINT</button><button id="quit">RETURN TO HANGAR</button>`}</div>`,
		"pause",
	);
	$("resume").onclick = resumeGame;
	$("pauseHow").onclick = () => openSchool("pause");
	$("pauseOptions").onclick = () => openSettings("pause");
	$("dev").onclick = openDev;
	$("checkpoint")?.addEventListener("click", () => startGame(false, true));
	$("quit")?.addEventListener("click", returnToTitle);
}
function resumeGame() {
	screen = "playing";
	show("overlay", false);
	menuPage = "";
	lastTime = performance.now();
	keys.clear();
	mouse.down = false;
	sfx("ui");
}
function returnMenu(dest) {
	if (dest === "pause") {
		screen = "playing";
		openPause();
	} else if (dest === "result") openResult();
	else {
		show("overlay", false);
		screen = "title";
		menuPage = "";
		menuIdle = 0;
	}
}
function openSchool(dest = "title") {
	menuReturn = dest;
	if (dest === "title") screen = "menu";
	panel(
		`<div class="eyebrow">FLIGHT SCHOOL / SIX THINGS TO LIVE BY</div><h2>SMALL SHIP. BIG TROUBLE.</h2><div class="schoolgrid"><div class="schoolcard"><strong>01 / FLY & FIGHT</strong><p>Move freely across the snowfield. Aim at armor; hold fire. Orange reactor flashes take massive damage. Release fire when the heat bar fills.</p><div class="keyline">${promptFor("move")} FLY · ${promptFor("aim")} AIM · ${promptFor("fire")} FIRE</div></div><div class="schoolcard"><strong>02 / SWEEP THE LEGS</strong><p>Fly below a walker’s body, close to its legs. Deploy the cable. Your speeder automatically wraps three times, bringing the beast down.</p><div class="keyline">${promptFor("cable")} DEPLOY · 12 SECOND RECHARGE</div></div><div class="schoolcard"><strong>03 / BRING THEM HOME</strong><p>Stranded pilots glow green in wave two. Hover close and low for 1.4 seconds. Each rescue restores hull, charges instinct and earns 1,000 points.</p><div class="keyline">HOVER BELOW 4 M · NO BUTTON NEEDED</div></div><div class="schoolcard"><strong>04 / LIVE TO FLY AGAIN</strong><p>The orange landing pad beside the generator repairs your hull. Three speeders per sortie. If the armor reaches the base, the generator takes damage.</p><div class="keyline">${promptFor("boost")} BOOST · LAND AT THE BASE TO REPAIR</div></div><div class="schoolcard"><strong>05 / TRUST YOUR INSTINCT</strong><p>Surviving, hitting armor and rescuing pilots fill instinct. Activate it for seven seconds of invulnerability, rapid fire and cool blasters.</p><div class="keyline">${promptFor("focus")} INSTINCT · CHARGE TO 100%</div></div><div class="schoolcard"><strong>06 / HOLD THE LINE</strong><p>Three waves. Clear walkers and probe drones, then cover the last transport for 65 seconds. Score reactor hits, rescues and takedowns. Hope needs time.</p><div class="keyline">${promptFor("pause")} PAUSE · DEV TOOLS INSIDE</div></div></div>${inputKind === "touch" ? "<p>Touch: drag anywhere on the left to fly; drag on the right to aim and fire. Auto-aim and auto-fire help when you lift your right thumb. A contextual action appears for cable and instinct.</p>" : ""}${backButton(dest === "title" ? "BACK TO HANGAR" : "BACK TO PAUSE")}`,
		"school",
	);
	bindBack(() => returnMenu(dest));
}
function openSettings(dest = "title") {
	if (dest === "title") screen = "menu";
	menuReturn = dest;
	panel(
		`<div class="eyebrow">FLIGHT SYSTEMS / OPTIONS</div><h2>MAKE YOURSELF AT HOME.</h2><div class="settingrow"><label for="music">Music<small>Original synthesized score</small></label><div class="settingspair"><input id="music" type="range" min="0" max="100" step="1" value="${Math.round(settings.music * 100)}"><output class="rangevalue" id="musicVal">${Math.round(settings.music * 100)}%</output></div></div><div class="settingrow"><label for="sfx">Effects & radio<small>Procedural sound and gibberish voices</small></label><div class="settingspair"><input id="sfx" type="range" min="0" max="100" value="${Math.round(settings.sfx * 100)}"><output id="sfxVal" class="rangevalue">${Math.round(settings.sfx * 100)}%</output></div></div><div class="settingrow"><label for="glyphs">Controller glyphs</label><select id="glyphs"><option value="ps">PlayStation · ✕ ○ □ △</option><option value="xbox">Xbox · A B X Y</option></select></div><div class="settingrow"><label for="shake">Camera shake</label><div class="settingspair"><input id="shake" type="range" min="0" max="100" value="${Math.round(settings.shake * 100)}"><output id="shakeVal" class="rangevalue">${Math.round(settings.shake * 100)}%</output></div></div><div class="settingrow"><label for="assist">Aim assistance<small>A gentle reactor snap for pad & touch</small></label><select id="assist"><option value="yes">On</option><option value="no">Off</option></select></div><div class="menu"><button id="fullscreen">${document.fullscreenElement ? "EXIT" : "ENTER"} FULLSCREEN</button><button id="resetSettings">RESET OPTIONS</button></div>${backButton()}`,
		"settings",
	);
	$("glyphs").value = settings.glyphs;
	$("assist").value = settings.assist ? "yes" : "no";
	for (const key of ["music", "sfx", "shake"])
		$(key).oninput = () => {
			settings[key] = Number($(key).value) / 100;
			$(key + "Val").textContent = $(key).value + "%";
			audio?.volumes();
			saveSettings();
		};
	$("glyphs").onchange = () => {
		settings.glyphs = $("glyphs").value;
		saveSettings();
		updatePrompts();
	};
	$("assist").onchange = () => {
		settings.assist = $("assist").value === "yes";
		saveSettings();
	};
	$("fullscreen").onclick = () => {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else document.documentElement.requestFullscreen?.().catch(() => {});
	};
	$("resetSettings").onclick = () => {
		settings = { ...settingsDefaults };
		audio?.volumes();
		saveSettings();
		openSettings(dest);
	};
	bindBack(() => returnMenu(dest));
}
const devRanges = [
	["speed", "Flight speed", 8, 42, 1],
	["damage", "Incoming damage", 0, 3, 0.1],
	["armor", "Walker armor (new spawns)", 0.2, 3, 0.1],
	["enemySpeed", "Walker march speed", 0, 3, 0.1],
	["cooling", "Cooling per second", 5, 80, 1],
	["heat", "Heat per shot", 1, 25, 1],
	["aimAssist", "Aim assist strength", 0, 3, 0.1],
	["timeScale", "Simulation speed", 0.25, 4, 0.25],
];
function openDev() {
	panel(
		`<div class="eyebrow">DEVELOPER TOOLS / LIVE FLIGHT LAB</div><h2>CHANGE THE ODDS.</h2>${devRanges.map(([k, label, min, max, step]) => `<div class="settingrow"><label for="dev-${k}">${label}</label><div class="settingspair"><input id="dev-${k}" type="range" min="${min}" max="${max}" step="${step}" value="${tuning[k]}"><output id="value-${k}" class="rangevalue">${tuning[k]}</output></div></div>`).join("")}<div class="devgrid" style="margin-top:20px"><button id="god">GOD MODE: ${devGod ? "ON" : "OFF"}</button><button id="rearm">REPAIR & CHARGE INSTINCT</button><button id="debug">PHYSICS OVERLAY: ${debugEnabled ? "ON" : "OFF"}</button><button id="step">STEP 1 SECOND</button><button id="act0">JUMP TO WAVE 1</button><button id="act1">JUMP TO WAVE 2</button><button id="act2">JUMP TO WAVE 3</button><button id="clear">CLEAR CURRENT WAVE</button><button id="pilot">TELEPORT TO RESCUE</button><button id="baseTeleport">TELEPORT TO REPAIR PAD</button><button id="resetTuning">RESET BALANCE DEFAULTS</button><button id="replayAI">WATCH AUTOPILOT</button></div><div class="devstats" id="devStats"></div>${backButton("BACK TO PAUSE")}`,
		"dev",
	);
	for (const [key] of devRanges)
		$("dev-" + key).oninput = () => {
			tuning[key] = Number($("dev-" + key).value);
			$("value-" + key).textContent = tuning[key];
		};
	$("god").onclick = () => {
		devGod = !devGod;
		$("god").textContent = "GOD MODE: " + (devGod ? "ON" : "OFF");
	};
	$("rearm").onclick = () => {
		game.hull = 100;
		game.lives = 3;
		game.base = 100;
		game.focus = 100;
		game.heat = 0;
		game.overheated = false;
		game.cableCooldown = 0;
		updateHud();
	};
	$("debug").onclick = () => {
		debugEnabled = !debugEnabled;
		$("debug").textContent =
			"PHYSICS OVERLAY: " + (debugEnabled ? "ON" : "OFF");
		if (debugLines) debugLines.visible = debugEnabled;
	};
	$("step").onclick = () => {
		for (let i = 0; i < 60; i++)
			simulate(1 / 60, {
				mx: 0,
				my: 0,
				ax: game.direction,
				ay: 0,
				fire: false,
				boost: false,
				cable: false,
				focus: false,
			});
		updateHud();
		updateDevStats();
	};
	for (let i = 0; i < 3; i++)
		$("act" + i).onclick = () => {
			game.ended = false;
			startStage(i, true);
			updateDevStats();
		};
	$("clear").onclick = () => {
		for (const w of walkers) if (!w.dead) killWalker(w);
		for (const d of drones) if (!d.dead) killDrone(d);
		updateHud();
		updateDevStats();
	};
	$("baseTeleport").onclick = () => teleport(-97, 2);
	$("pilot").onclick = () => {
		const p = pilots.find((p) => !p.rescued);
		if (p) teleport(p.x, 2.5);
	};
	$("resetTuning").onclick = () => {
		Object.assign(tuning, DEFAULTS);
		openDev();
	};
	$("replayAI").onclick = () => {
		if (hubInfo) {
			toast("Autopilot is available outside Hub sessions.");
			return;
		}
		startGame(true);
	};
	bindBack(() => {
		screen = "playing";
		openPause();
	});
	updateDevStats();
}
function updateDevStats() {
	if ($("devStats"))
		$("devStats").textContent =
			`${renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 fallback"} · Three ${THREE.REVISION} · Rapier ${RAPIER.version()} · ${world.bodies.len()} bodies / ${world.colliders.len()} colliders · T+${simTime.toFixed(1)}s · X ${game.x.toFixed(1)} Y ${game.y.toFixed(1)}`;
}
function teleport(x, y) {
	game.x = x;
	game.y = y;
	shipBody.setTranslation({ x, y, z: 0 }, true);
	shipBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	cameraX = x + 8;
	updateHud();
	updateDevStats();
}
function updateDebug() {
	const data = world.debugRender();
	if (debugLines) {
		retire(debugLines);
		debugLines.geometry.dispose();
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(data.vertices, 3));
	geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 4));
	debugLines = new THREE.LineSegments(
		geo,
		new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
	);
	debugLines.renderOrder = 50;
	scene.add(debugLines);
}
function openResult() {
	const won = game.won;
	panel(
		`<div class="missionstamp">${won ? "EVACUATION COMPLETE / TRANSPORT AWAY" : "SIGNAL LOST / SORTIE ENDED"}</div><h2>${won ? "HOPE FLIES." : "WE FLY AGAIN."}</h2><p>${game.message}</p><div class="resultgrid"><div><span>DEFENSE SCORE</span><strong>${String(game.score).padStart(6, "0")}</strong></div><div><span>PILOTS HOME</span><strong>${metrics.rescued} / 3</strong></div><div><span>BASE INTEGRITY</span><strong>${Math.ceil(game.base)}%</strong></div><div><span>ARMOR & PROBES</span><strong>${metrics.kills}</strong></div><div><span>CABLE TAKEDOWNS</span><strong>${metrics.cables}</strong></div><div><span>REACTOR HITS</span><strong>${metrics.weakHits}</strong></div></div><p>${won ? "Somewhere above the clouds, your people are counting their lucky stars." : "The Empire has numbers. Your wing has another chance."}</p>${hubInfo ? "<p>Score transmitted to AI Hub. Awaiting the rest of the wing.</p>" : `<div class="menu">${!won ? '<button class="primary" id="continue">RETRY CHECKPOINT</button>' : ""}<button ${won ? 'class="primary"' : ""} id="again">FLY A NEW SORTIE</button><button id="resultAbout">ABOUT & CREDITS</button><button id="resultQuit">RETURN TO HANGAR</button></div>`}`,
		"result",
	);
	$("continue")?.addEventListener("click", () => startGame(false, true));
	$("again")?.addEventListener("click", () => startGame());
	$("resultAbout")?.addEventListener("click", () => openAbout("result"));
	$("resultQuit")?.addEventListener("click", returnToTitle);
}
function escapeHTML(s) {
	return String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}
function openAbout(dest = "title") {
	if (dest === "title") screen = "menu";
	let credits = {};
	try {
		credits = JSON.parse($("creditsData").textContent);
	} catch {}
	const info = credits.sourceInformation || {};
	const labels = {
		date: "Date",
		source: "Source",
		plan: "Plan",
		genre: "Genre",
		perspective: "Perspective",
		tech: "Tech",
		artDirection: "Art Direction",
		animation: "Animation",
		audio: "Audio",
		online: "Online",
		testing: "Testing",
		research: "Research",
		environment: "Environment",
		model: "Model",
		usage: "Usage",
	};
	const fallback = {
		date: "2026-11-06 01:11:44",
		source:
			"Star Wars: The Empire Strikes Back (Parker Brothers, Atari 2600, 1982)",
		plan: "none",
		genre: "Arcade flight / defense shooter",
		perspective: "2.5D side-on orthographic",
		tech: "Three.js r180, WebGPU, Rapier 0.19.3, Web Audio, Gamepad API",
		artDirection: "Three-band cel shading, ink outlines, arctic comic diorama",
		animation: "Three.js AnimationMixer and authored keyframe clips",
		audio:
			"Code-generated original music (10%), effects and gibberish radio voices",
		online:
			"AI Hub ghost race 1–4; standalone WebRTC direct link and same-browser wing",
		testing:
			"Headless scripted playthrough, physics, audio, pad, touch and Hub protocol",
		research:
			"Original manual, box art, screenshots; AI Hub protocol and engine documentation",
		environment: "Codex CLI (headless); Linux",
		model: "OpenAI, gpt-6.1-sol, reasoning effort max",
		usage: "added on import",
	};
	const section = (title, key) =>
		`<div class="creditsection">${title}</div>${(credits[key] || ["unknown"]).map((t) => `<p class="feedback">${escapeHTML(t)}</p>`).join("")}`;
	panel(
		`<div class="eyebrow">FIELD NOTES / ABOUT & CREDITS</div><h2>A LITTLE HOPE. A LOT OF SNOW.</h2><p>An original arcade tribute to the 1982 snowspeeder defense game. All geometry, animation, music, effects and radio voices are created in code. Star Wars and its characters belong to Lucasfilm. This is an unofficial fan work.</p><div class="creditsection">Source Information</div><dl class="credits">${Object.entries(
			labels,
		)
			.map(
				([k, v]) =>
					`<dt>${v}</dt><dd>${escapeHTML(info[k] || fallback[k])}</dd>`,
			)
			.join(
				"",
			)}</dl><p class="feedback">Research: <a href="https://atariage.com/manual_html_page.php?SoftwareLabelID=501" target="_blank" rel="noopener">1982 Parker Brothers manual</a> · <a href="https://www.atarimania.com/game-atari-2600-vcs-star-wars-the-empire-strikes-back_16249.html" target="_blank" rel="noopener">Original manual scans & images</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a></p><p class="feedback">Libraries: Three.js MIT · Rapier Apache-2.0 · AI Hub session client 1.4.0. Fonts: Barlow Condensed & DM Sans, SIL Open Font License, via Google Fonts. No external visual assets or audio recordings.</p>${section("Testing Feedback", "testingFeedback")}${section("Engine Feedback", "engineFeedback")}${section("Prompt Feedback", "promptFeedback")}${backButton()}`,
		"about",
	);
	if (hubInfo)
		$("panel")
			.querySelectorAll("a")
			.forEach((a) => {
				a.removeAttribute("target");
				a.onclick = (e) => e.preventDefault();
			});
	bindBack(() => returnMenu(dest));
}
function bindMenuHover() {
	for (const el of $("panel").querySelectorAll("button,input,select,textarea"))
		el.addEventListener("pointerenter", () => {
			if (inputKind === "keyboard") el.focus({ preventScroll: true });
		});
}
const localPeerId = crypto.randomUUID();
function ghostPacket() {
	return {
		type: "ghost",
		id: localPeerId,
		x: game.x || -55,
		y: game.y || 8,
		dir: game.direction || 1,
		act: game.act || 0,
		score: game.score || 0,
		fire: !!currentInput.fire,
		playing: ["playing", "attract", "paused", "result"].includes(screen),
		ended: !!game.ended,
	};
}
function applyGhost(packet, id, name, colorHex) {
	if (
		!packet ||
		packet.type !== "ghost" ||
		!Number.isFinite(packet.x) ||
		!Number.isFinite(packet.y)
	)
		return;
	if (!ghosts.has(id)) {
		const c = colorHex || "#bce896",
			root = makeSpeeder(true, new THREE.Color(c).getHex());
		scene.add(root);
		for (const obj of [root, ...root.children]) {
			if (obj.isMesh) {
				obj.material = obj.material.clone();
				obj.material.transparent = true;
				obj.material.opacity = 0.48;
				obj.material.depthWrite = false;
			}
		}
		ghosts.set(id, {
			root,
			id,
			name: name || "WING TWO",
			color: c,
			act: 0,
			score: 0,
			target: V(),
			received: 0,
		});
	}
	const g = ghosts.get(id);
	g.target.set(clamp(packet.x, -140, 160), clamp(packet.y, 0, 35), -4);
	g.act = packet.act;
	g.score = Math.round(packet.score || 0);
	g.dir = packet.dir === -1 ? -1 : 1;
	g.received = performance.now();
	g.playing = packet.playing;
	g.root.visible = g.act === game.act && !!packet.playing;
}
function removeGhost(id) {
	const g = ghosts.get(id);
	if (g) {
		retire(g.root);
		ghosts.delete(id);
	}
	hudLabels.get("g" + id)?.remove();
	hudLabels.delete("g" + id);
}
function reportHub() {
	if (!hubInfo || hubReported || hubEnded) return;
	hubReported = true;
	AIHub.result({
		score: game.score || 0,
		stats: {
			Rescued: metrics.rescued,
			"Cable trips": metrics.cables,
			"Reactor hits": metrics.weakHits,
			"Base hull": Math.ceil(game.base || 0),
		},
	});
}
function networkTick(dt) {
	if (hubEnded) return;
	netTimer += dt;
	if (netTimer < 0.1) return;
	netTimer = 0;
	const p = ghostPacket();
	if (hubInfo && hubStarted && AIHub.time() >= 0) {
		AIHub.send(p, { reliable: false });
		AIHub.progress({
			score: game.score || 0,
			label: `Wave ${(game.act || 0) + 1} · ${metrics.rescued} rescued`,
		});
	} else if (!hubInfo) {
		if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(p));
		if (broadcast) broadcast.postMessage({ ...p, from: localPeerId });
	}
}
function updateGhosts(dt) {
	for (const g of ghosts.values()) {
		g.root.position.lerp(g.target, 1 - Math.exp(-dt * 12));
		g.root.scale.x = g.dir;
		g.root.visible =
			g.playing &&
			g.act === (game.act || 0) &&
			performance.now() - g.received < 8000 &&
			screen !== "title" &&
			screen !== "menu";
	}
}
async function connectHub() {
	if (!AIHub.active) return;
	hubInfo = await AIHub.connect({ mode: "ghost", seats: [1, 4] });
	if (!hubInfo) return;
	screen = "hub-wait";
	show("title", false);
	show("hubWaiting");
	AIHub.on("start", () => {
		hubStarted = true;
	});
	AIHub.on("message", (packet, from) => {
		if (hubEnded) return;
		const p = hubInfo.players.find((p) => p.id === from);
		if (p) applyGhost(packet, from, p.name, p.color);
	});
	AIHub.on("leave", ({ id }) => removeGhost(id));
	AIHub.on("time-up", () => reportHub());
	AIHub.on("end", () => {
		hubEnded = true;
		hubStarted = false;
		screen = "hub-ended";
		keys.clear();
		mouse.down = false;
		audio?.stop();
		show("overlay", false);
		show("hud", false);
		show("hubWaiting");
		$("hubWaiting").innerHTML =
			'<div class="eyebrow">ECHO SQUADRON / SORTIE COMPLETE</div><h2>SCORE TRANSMITTED</h2><p>Awaiting orders from AI Hub.</p>';
	});
	AIHub.ready();
}
function handleNet(data) {
	if (hubInfo) return;
	try {
		const p = typeof data === "string" ? JSON.parse(data) : data;
		if (p.type === "ghost")
			applyGhost(p, p.from || p.id, "WING TWO", "#bce896");
		if (p.type === "hello") {
			linkStatus = "Wingmate connected";
			if (netRole === "host")
				sendStandalone({ type: "welcome", seed: standaloneSeed });
			updateNetStatus();
		}
		if (p.type === "welcome") {
			standaloneSeed = p.seed;
			linkStatus = "Linked to wing leader";
			updateNetStatus();
		}
		if (p.type === "launch") {
			standaloneSeed = p.seed;
			show("overlay", false);
			startGame();
		}
		if (p.type === "bye") {
			linkStatus = "Wingmate disconnected";
			updateNetStatus();
			if (p.from) removeGhost(p.from);
		}
	} catch {
		linkStatus = "Unreadable link message";
		updateNetStatus();
	}
}
function sendStandalone(data) {
	if (dataChannel?.readyState === "open")
		dataChannel.send(JSON.stringify(data));
	if (broadcast) broadcast.postMessage({ ...data, from: localPeerId });
}
function updateNetStatus() {
	if ($("netStatus")) $("netStatus").textContent = linkStatus;
	if ($("linkedLaunch"))
		$("linkedLaunch").disabled = !(
			dataChannel?.readyState === "open" || broadcast
		);
}
function attachDataChannel(channel) {
	dataChannel = channel;
	channel.onopen = () => {
		linkStatus = "Direct link established";
		updateNetStatus();
		sendStandalone({ type: "hello" });
		if (netRole === "host")
			sendStandalone({ type: "welcome", seed: standaloneSeed });
	};
	channel.onmessage = (e) => handleNet(e.data);
	channel.onclose = () => {
		linkStatus = "Wingmate disconnected";
		updateNetStatus();
		for (const id of [...ghosts.keys()]) removeGhost(id);
	};
	channel.onerror = () => {
		linkStatus = "Link error. Create a new invitation to reconnect.";
		updateNetStatus();
	};
}
function closeStandalone() {
	sendStandalone({ type: "bye" });
	broadcast?.close();
	broadcast = null;
	dataChannel?.close();
	dataChannel = null;
	peerConnection?.close();
	peerConnection = null;
	for (const id of [...ghosts.keys()]) removeGhost(id);
	linkStatus = "Offline";
	netRole = "";
}
function newPeer() {
	peerConnection?.close();
	dataChannel = null;
	const pc = new RTCPeerConnection({
		iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
	});
	peerConnection = pc;
	pc.ondatachannel = (e) => attachDataChannel(e.channel);
	pc.onconnectionstatechange = () => {
		if (pc.connectionState === "failed") {
			linkStatus =
				"Direct route unavailable. Try the same-browser wing or AI Hub.";
			updateNetStatus();
		}
	};
	return pc;
}
async function waitIce(pc) {
	if (pc.iceGatheringState === "complete") return;
	await new Promise((resolve) => {
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			pc.removeEventListener("icegatheringstatechange", changed);
			resolve();
		};
		const changed = () => {
			if (pc.iceGatheringState === "complete") finish();
		};
		pc.addEventListener("icegatheringstatechange", changed);
		setTimeout(finish, 2200);
	});
}
function encodeSignal(desc) {
	return btoa(JSON.stringify({ type: desc.type, sdp: desc.sdp }));
}
function decodeSignal(text) {
	let d = JSON.parse(atob(text.trim()));
	if (!["offer", "answer"].includes(d.type) || typeof d.sdp !== "string")
		throw new Error("Invalid code");
	return d;
}
async function createOffer() {
	try {
		netRole = "host";
		const pc = newPeer();
		attachDataChannel(
			pc.createDataChannel("echo-wing", { ordered: false, maxRetransmits: 0 }),
		);
		await pc.setLocalDescription(await pc.createOffer());
		await waitIce(pc);
		$("netOutput").value = encodeSignal(pc.localDescription);
		linkStatus =
			"Invitation ready. Send it to your wingmate; paste their response below.";
		updateNetStatus();
	} catch (e) {
		linkStatus = "Could not create invitation: " + e.message;
		updateNetStatus();
	}
}
async function acceptSignal() {
	try {
		const d = decodeSignal($("netInput").value);
		if (d.type === "offer") {
			netRole = "guest";
			const pc = newPeer();
			await pc.setRemoteDescription(d);
			await pc.setLocalDescription(await pc.createAnswer());
			await waitIce(pc);
			$("netOutput").value = encodeSignal(pc.localDescription);
			linkStatus = "Response ready. Send it back to the wing leader.";
		} else {
			if (!peerConnection) throw new Error("Create an invitation first");
			await peerConnection.setRemoteDescription(d);
			linkStatus = "Response accepted. Connecting engines…";
		}
		updateNetStatus();
	} catch (e) {
		linkStatus = "Link code error: " + e.message;
		updateNetStatus();
	}
}
function openSquad() {
	screen = "menu";
	panel(
		`<div class="eyebrow">WING RACE / SAME RIDGE, FRIENDLY RIVALRY</div><h2>NEVER FLY ALONE.</h2><p>Race through the mission alongside translucent wingmates. You share positions and scores; each pilot defends their own generator. AI Hub supports 1–4 pilots. Direct links support two.</p><div class="netstatus" id="netStatus"></div><div class="netactions"><button id="makeInvite">CREATE INVITATION</button><button id="localWing">SAME-BROWSER WING</button></div><div class="netstep">1 / SEND THIS CODE TO YOUR WINGMATE</div><textarea id="netOutput" readonly aria-label="Your invitation or response code" placeholder="Create an invitation, or accept one below to produce a response."></textarea><div class="netactions"><button id="copyCode">COPY CODE</button></div><div class="netstep">2 / PASTE THEIR INVITATION OR RESPONSE</div><textarea id="netInput" aria-label="Wingmate invitation or response code" placeholder="Paste a wingmate’s code here."></textarea><div class="netactions"><button id="acceptCode">ACCEPT CODE</button><button id="unlink">DISCONNECT</button></div><p class="feedback">Direct links use WebRTC. Some networks block direct routes; AI Hub provides its own transport. For two tabs on this browser, choose Same-browser wing in both tabs. Codes are connection details; no account or game server is needed.</p><div class="menu"><button class="primary" id="linkedLaunch">LAUNCH LINKED SORTIE</button></div>${backButton()}`,
		"squad",
	);
	$("makeInvite").onclick = async () => {
		await unlockAudio();
		await createOffer();
	};
	$("acceptCode").onclick = acceptSignal;
	$("copyCode").onclick = async () => {
		const text = $("netOutput").value;
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			linkStatus = "Code copied";
		} catch {
			$("netOutput").focus();
			$("netOutput").select();
			document.execCommand("copy");
			linkStatus = "Code selected for copying";
		}
		updateNetStatus();
	};
	$("localWing").onclick = () => {
		if (!broadcast) {
			netRole = "host";
			broadcast = new BroadcastChannel("empire-slips-wing-v1");
			broadcast.onmessage = (e) => {
				if (e.data.from !== localPeerId) handleNet(e.data);
			};
			broadcast.postMessage({ type: "hello", from: localPeerId });
		}
		linkStatus =
			"Same-browser wing active. Open this game in a second tab and choose this option there.";
		updateNetStatus();
	};
	$("unlink").onclick = () => {
		closeStandalone();
		updateNetStatus();
	};
	$("linkedLaunch").onclick = () => {
		sendStandalone({ type: "launch", seed: standaloneSeed });
		startGame();
	};
	bindBack(() => returnMenu("title"));
	updateNetStatus();
}
function confirmMenu() {
	const root = screen === "title" ? $("title") : $("panel"),
		active = document.activeElement;
	if (root.contains(active) && active.matches("button,input,select,textarea"))
		active.click();
	else root.querySelector("button:not(:disabled)")?.click();
}
function menuNavigate(delta) {
	const root = screen === "title" ? $("title") : $("panel");
	const list = Array.from(
		root.querySelectorAll("button,input,select,textarea"),
	).filter((e) => !e.disabled && e.offsetParent !== null);
	if (!list.length) return;
	const old = list.indexOf(document.activeElement);
	const n = (old + delta + list.length) % list.length;
	list[n].focus({ preventScroll: true });
	list[n].scrollIntoView({ block: "nearest" });
	sfx("ui");
}
function adjustFocused(delta) {
	const el = document.activeElement;
	if (el?.type === "range") {
		el.value = clamp(
			Number(el.value) + delta * Number(el.step || 1),
			Number(el.min),
			Number(el.max),
		);
		el.dispatchEvent(new Event("input", { bubbles: true }));
		sfx("ui");
		return true;
	}
	if (el?.tagName === "SELECT") {
		el.selectedIndex = clamp(
			el.selectedIndex + delta,
			0,
			el.options.length - 1,
		);
		el.dispatchEvent(new Event("change", { bubbles: true }));
		sfx("ui");
		return true;
	}
	return false;
}
function menuBack() {
	if (hubEnded) return;
	if (screen === "playing") {
		openPause();
		return;
	}
	if (screen === "paused") {
		if (menuPage === "pause") resumeGame();
		else returnMenu("pause");
	} else if (screen === "menu") returnMenu("title");
	else if (screen === "result" && !hubInfo) returnToTitle();
}
let padNavTime = 0;
function pollGamepad(now) {
	const pads = navigator.getGamepads?.() || [];
	let pad = null;
	for (const p of pads) {
		if (p?.connected && p.mapping === "standard") {
			pad = p;
			break;
		}
	}
	if (!pad) return;
	padIndex = pad.index;
	const pressed = (i) => !!pad.buttons[i]?.pressed,
		edge = (i) => pressed(i) && !padPrior[i];
	const active =
		pad.axes.some((v) => Math.abs(v) > 0.2) ||
		pad.buttons.some((b) => b.pressed);
	if (active) {
		if (noteInput("gamepad")) {
			padPrior = pad.buttons.map((b) => b.pressed);
			return;
		}
		unlockAudio();
	}
	if (hubEnded) {
		padPrior = pad.buttons.map((b) => b.pressed);
		return;
	}
	if (edge(9) && !pressed(8)) menuBack();
	if (["title", "menu", "paused", "result"].includes(screen)) {
		const axis = pad.axes[1] || 0,
			up = pressed(12) || axis < -0.55,
			down = pressed(13) || axis > 0.55;
		if ((up || down) && now > padNavTime) {
			menuNavigate(down ? 1 : -1);
			padNavTime = now + 230;
		}
		if (
			edge(14) ||
			edge(15) ||
			(Math.abs(pad.axes[0] || 0) > 0.65 && now > padNavTime)
		) {
			adjustFocused(pressed(14) || (pad.axes[0] || 0) < 0 ? -1 : 1);
			padNavTime = now + 130;
		}
		if (edge(0)) {
			confirmMenu();
		}
		if (edge(1)) menuBack();
	}
	padPrior = pad.buttons.map((b) => b.pressed);
}
function bindEvents() {
	document.addEventListener("keydown", (e) => {
		if (hubEnded) return;
		const typing =
			["TEXTAREA", "INPUT"].includes(document.activeElement?.tagName) &&
			document.activeElement?.type !== "range";
		if (typing) {
			lastInput = performance.now();
			return;
		}
		if (noteInput("keyboard")) {
			e.preventDefault();
			return;
		}
		unlockAudio();
		if (
			[
				"Space",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Tab",
			].includes(e.code) &&
			!e.ctrlKey &&
			!e.metaKey
		)
			e.preventDefault();
		keys.add(e.code);
		if (e.repeat) return;
		if (e.code === "Escape") {
			menuBack();
			return;
		}
		if (["title", "menu", "paused", "result"].includes(screen)) {
			if (e.code === "ArrowDown" || (e.code === "Tab" && !e.shiftKey))
				menuNavigate(1);
			if (e.code === "ArrowUp" || (e.code === "Tab" && e.shiftKey))
				menuNavigate(-1);
			if (e.code === "ArrowLeft") adjustFocused(-1);
			if (e.code === "ArrowRight") adjustFocused(1);
			if (e.code === "Enter" || e.code === "Space") {
				e.preventDefault();
				confirmMenu();
			}
		}
	});
	document.addEventListener("keyup", (e) => keys.delete(e.code));
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch") return;
		const exited = noteInput("keyboard");
		if (exited) return;
		mouse.x = e.clientX;
		mouse.y = e.clientY;
		mouse.active = true;
		if (["title", "menu", "paused", "result"].includes(screen)) {
			const el = e.target.closest("button,input,select,textarea");
			el?.focus({ preventScroll: true });
		}
		if (screen === "playing") {
			$("aimMark").style.left = mouse.x + "px";
			$("aimMark").style.top = mouse.y + "px";
			show("aimMark");
		}
	});
	document.addEventListener("pointerdown", (e) => {
		if (hubEnded) return;
		const kind = e.pointerType === "touch" ? "touch" : "keyboard";
		if (noteInput(kind)) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		unlockAudio();
		if (e.target.closest("button,input,textarea,select,a")) return;
		if (screen !== "playing") return;
		if (kind === "touch") {
			const left = e.clientX < innerWidth * 0.5;
			touches.set(e.pointerId, { left, startX: e.clientX, startY: e.clientY });
			if (!left) touchAim = { x: e.clientX, y: e.clientY };
			e.target.setPointerCapture?.(e.pointerId);
		} else if (e.button === 0) {
			mouse.down = true;
			mouse.active = true;
			mouse.x = e.clientX;
			mouse.y = e.clientY;
		}
	});
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType !== "touch" || !touches.has(e.pointerId)) return;
		const t = touches.get(e.pointerId);
		if (t.left) {
			touchMove.x = clamp((e.clientX - t.startX) / 55, -1, 1);
			touchMove.y = clamp((t.startY - e.clientY) / 55, -1, 1);
		} else touchAim = { x: e.clientX, y: e.clientY };
	});
	const release = (e) => {
		mouse.down = false;
		if (touches.has(e.pointerId)) {
			if (touches.get(e.pointerId).left) touchMove = { x: 0, y: 0 };
			else touchAim = null;
			touches.delete(e.pointerId);
		}
	};
	document.addEventListener("pointerup", release);
	document.addEventListener("pointercancel", release);
	window.addEventListener("blur", () => {
		keys.clear();
		mouse.down = false;
		touchMove = { x: 0, y: 0 };
		touchAim = null;
		if (screen === "playing" && !hubInfo) openPause();
	});
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			keys.clear();
			mouse.down = false;
			if (screen === "playing" && !hubInfo) openPause();
		} else lastTime = performance.now();
	});
	window.addEventListener("resize", resize);
	document.addEventListener(
		"wheel",
		() => {
			if (!hubEnded) noteInput("keyboard");
		},
		{ passive: true },
	);
	document.addEventListener("contextmenu", (e) => e.preventDefault());
	window.addEventListener("gamepadconnected", (e) => {
		padIndex = e.gamepad.index;
		noteInput("gamepad");
	});
	window.addEventListener("gamepaddisconnected", () => {
		padIndex = -1;
		padPrior = [];
		if (screen === "playing") toast("CONTROLLER DISCONNECTED / KEYBOARD READY");
	});
	$("launch").onclick = () => {
		if (ready) startGame();
	};
	$("how").onclick = () => openSchool();
	$("settings").onclick = () => openSettings();
	$("about").onclick = () => openAbout();
	$("squad").onclick = openSquad;
	$("pauseButton").onclick = openPause;
	$("touchAction").onclick = (e) => {
		e.stopPropagation();
		if (cableTarget() && game.cableCooldown <= 0) beginCable();
		else activateFocus();
	};
	for (const el of $("title").querySelectorAll("button"))
		el.addEventListener("pointerenter", () => {
			if (inputKind === "keyboard") el.focus({ preventScroll: true });
		});
	window.addEventListener("beforeunload", () => {
		sendStandalone({ type: "bye" });
	});
}
function resize() {
	if (!renderer) return;
	const aspect = innerWidth / innerHeight;
	const height = aspect < 0.8 ? 58 : 42;
	camera.left = (-height * aspect) / 2;
	camera.right = (height * aspect) / 2;
	camera.top = height / 2;
	camera.bottom = -height / 2;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
}
function animateSnow(dt) {
	const pos = snow.geometry.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		let x = pos.getX(i) - dt * 7,
			y = pos.getY(i) - dt * 1.9;
		if (y < 0) y = 65;
		if (x < cameraX - 130) x = cameraX + 130;
		pos.setXY(i, x, y);
	}
	pos.needsUpdate = true;
}
function updateCamera(dt) {
	let tx = 31,
		ty = 16;
	if (
		["playing", "attract", "paused", "result"].includes(screen) &&
		Number.isFinite(game.x)
	) {
		tx = clamp(game.x + game.direction * 11, -95, 126);
		ty = 13 + Math.max(0, game.y - 17) * 0.3;
	}
	cameraX = lerp(cameraX, tx, 1 - Math.exp(-dt * 3.5));
	cameraY = lerp(cameraY, ty, 1 - Math.exp(-dt * 3));
	shake = Math.max(0, shake - dt * 2.4);
	const s = shake * settings.shake;
	camera.position.set(
		cameraX + Math.sin(simTime * 67) * s,
		cameraY + 8 + Math.cos(simTime * 89) * s,
		58,
	);
	camera.lookAt(cameraX, cameraY, 0);
}
function frame(now) {
	const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000 || 0.016));
	lastTime = now;
	pollGamepad(now);
	if (hubInfo && hubStarted && screen === "hub-wait" && AIHub.time() >= 0)
		startGame();
	if (screen === "title" || (screen === "menu" && menuPage !== "squad")) {
		menuIdle = (now - lastInput) / 1000;
		const left = Math.max(0, Math.ceil(10 - menuIdle));
		$("idleText").textContent = "AUTOPILOT DEMO IN " + left;
		if (menuIdle >= 10) startGame(true);
	}
	if (screen === "attract" && game.ended) {
		simTime += dt;
		if (simTime > game.demoRestart) startGame(true);
	}
	if (
		(screen === "playing" || screen === "attract") &&
		!game.ended &&
		!hubEnded
	) {
		accumulator += dt * tuning.timeScale;
		let steps = 0;
		while (accumulator >= 1 / 60 && steps < 12) {
			currentInput = screen === "attract" ? autopilot(1 / 60) : readInput();
			simulate(1 / 60, currentInput);
			accumulator -= 1 / 60;
			steps++;
		}
	} else {
		accumulator = 0;
		if (screen === "title" || screen === "menu" || screen === "hub-wait") {
			decorWalker.mixer.update(dt * 0.6);
			shipMixer.update(dt);
			ship.position.y = 10 + Math.sin(now * 0.001) * 0.4;
			ship.position.x = 33 + Math.sin(now * 0.0006) * 2;
			ship.rotation.z = -0.07 + Math.sin(now * 0.0012) * 0.04;
			ship.userData.shadow.position.x = ship.position.x;
			ship.userData.shadow.scale.set(3, 1, 1);
		}
		if (screen === "result") {
			for (const m of mixers) m.update(dt);
			updateParticles(dt);
		}
	}
	if (screen !== "paused" && !hubEnded) animateSnow(dt);
	updateGhosts(dt);
	updateCamera(dt);
	networkTick(dt);
	audio?.tick();
	uiClock += dt;
	if (uiClock > 0.07) {
		uiClock = 0;
		if (["playing", "attract", "paused", "result"].includes(screen))
			updateHud();
	}
	renderer.render(scene, camera);
}
async function boot() {
	try {
		$("loadMessage").textContent = "Loading the physics core…";
		await RAPIER.init();
		world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
		eventQueue = new RAPIER.EventQueue(true);
		world.createCollider(
			RAPIER.ColliderDesc.cuboid(400, 1, 100)
				.setTranslation(0, -1, 0)
				.setFriction(0.9),
		);
		$("loadMessage").textContent = "Inking the north ridge…";
		renderer = new THREE.WebGPURenderer({
			canvas: $("world"),
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.NoToneMapping;
		await renderer.init();
		buildWorld();
		resize();
		bindEvents();
		await renderer.renderAsync(scene, camera);
		ready = true;
		$("rendererLabel").textContent = renderer.backend.isWebGPUBackend
			? "WEBGPU"
			: "WEBGL2";
		show("loading", false);
		returnToTitle();
		await connectHub();
		lastTime = performance.now();
		renderer.setAnimationLoop(frame);
		exposeTesting();
	} catch (e) {
		$("loadMessage").textContent =
			"Flight systems could not start: " +
			e.message +
			". Check your internet connection and browser graphics support.";
		console.error(e);
		if (AIHub.active) AIHub.fail(e.message);
	}
}
function exposeTesting() {
	window.__game = {
		get ready() {
			return ready;
		},
		get renderer() {
			return renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2";
		},
		capture: async () => {
			const w = innerWidth,
				h = innerHeight,
				target = new THREE.RenderTarget(w, h, {
					type: THREE.UnsignedByteType,
					format: THREE.RGBAFormat,
				});
			target.texture.colorSpace = THREE.SRGBColorSpace;
			renderer.setRenderTarget(target);
			await renderer.renderAsync(scene, camera);
			const pixels = await renderer.readRenderTargetPixelsAsync(
				target,
				0,
				0,
				w,
				h,
			);
			renderer.setRenderTarget(null);
			const c = document.createElement("canvas");
			c.width = w;
			c.height = h;
			const ctx = c.getContext("2d");
			const stride = Math.ceil((w * 4) / 256) * 256,
				out = new Uint8ClampedArray(w * h * 4);
			for (let row = 0; row < h; row++)
				out.set(
					pixels.subarray(row * stride, row * stride + w * 4),
					row * w * 4,
				);
			ctx.putImageData(new ImageData(out, w, h), 0, 0);
			target.dispose();
			return c.toDataURL("image/png");
		},
		get snapshot() {
			return {
				screen,
				menu: menuPage,
				act: game.act,
				x: game.x,
				y: game.y,
				hull: game.hull,
				base: game.base,
				lives: game.lives,
				score: game.score,
				heat: game.heat,
				overheated: game.overheated,
				focus: game.focus,
				focusTime: game.focusTime,
				cable: !!game.cable,
				cableCooldown: game.cableCooldown,
				stageTime: game.stageTime,
				missionTime: game.missionTime,
				won: game.won,
				ended: game.ended,
				metrics: { ...metrics },
				walkers: walkers.map((w) => ({
					x: w.x,
					hp: w.hp,
					dead: w.dead,
					boss: w.boss,
					weak: isWeak(w),
				})),
				drones: drones.map((d) => ({ x: d.x, y: d.y, hp: d.hp, dead: d.dead })),
				pilots: pilots.map((p) => ({
					x: p.x,
					rescued: p.rescued,
					progress: p.progress,
				})),
				bodies: world.bodies.len(),
				colliders: world.colliders.len(),
				ghosts: [...ghosts.values()].map((g) => ({
					name: g.name,
					x: g.root.position.x,
					y: g.root.position.y,
					score: g.score,
					act: g.act,
				})),
				inputKind,
				tuning: { ...tuning },
				settings: { ...settings },
				hub: !!hubInfo,
				hubEnded,
				hubReported,
				linkStatus,
			};
		},
		start: startGame,
		pause: openPause,
		resume: resumeGame,
		teleport,
		setGod: (v) => {
			devGod = v;
		},
		damage: damageShip,
		setHull: (v) => {
			game.hull = clamp(v, 0, 100);
		},
		setFocus: (v) => {
			game.focus = v;
		},
		activateFocus,
		beginCable,
		jump: (i) => startStage(i, true),
		setTuning: (k, v) => {
			tuning[k] = v;
		},
		step: (seconds, input = {}) => {
			const old = screen;
			for (let i = 0; i < Math.round(seconds * 60); i++) {
				if (game.ended) break;
				simulate(1 / 60, {
					mx: 0,
					my: 0,
					ax: 1,
					ay: 0,
					fire: false,
					boost: false,
					cable: false,
					focus: false,
					...input,
				});
			}
			updateHud();
			return window.__game.snapshot;
		},
		autoplay: (seconds, cheat = false) => {
			const god = devGod;
			devGod = cheat;
			for (let i = 0; i < Math.round(seconds * 60); i++) {
				if (game.ended) break;
				simulate(1 / 60, autopilot(1 / 60));
			}
			devGod = god;
			updateHud();
			return window.__game.snapshot;
		},
		setIdle: (seconds) => {
			lastInput = performance.now() - seconds * 1000;
		},
		audioStats: () => {
			if (!audio) return null;
			const bins = new Uint8Array(audio.analyser.fftSize);
			audio.analyser.getByteTimeDomainData(bins);
			return {
				state: audio.ctx.state,
				music: audio.music.gain.value,
				sfx: audio.fx.gain.value,
				events: audio.events,
				peak: Math.max(...bins.map((x) => Math.abs(x - 128))) / 128,
			};
		},
		offlineAudio: async () => {
			const ctx = new OfflineAudioContext(2, 44100 * 3, 44100),
				s = new SynthAudio(ctx);
			s.sfx("fire");
			s.sfx("explode");
			s.sfx("rescue");
			s.voice("pilot");
			for (let i = 0; i < 12; i++)
				s.tone(
					130.81 * 2 ** ([0, 3, 7, 10][i % 4] / 12),
					0.4,
					"triangle",
					0.1,
					i * 0.2,
					s.music,
				);
			const b = await ctx.startRendering();
			const samples = b.getChannelData(0);
			let sum = 0,
				peak = 0;
			for (const v of samples) {
				sum += v * v;
				peak = Math.max(peak, Math.abs(v));
			}
			return {
				rms: Math.sqrt(sum / samples.length),
				peak,
				duration: b.duration,
				events: s.events,
			};
		},
		emitGhost: () => sendStandalone(ghostPacket()),
		sendPacket: sendStandalone,
		closeNetwork: closeStandalone,
		returnToTitle,
	};
}
boot();
