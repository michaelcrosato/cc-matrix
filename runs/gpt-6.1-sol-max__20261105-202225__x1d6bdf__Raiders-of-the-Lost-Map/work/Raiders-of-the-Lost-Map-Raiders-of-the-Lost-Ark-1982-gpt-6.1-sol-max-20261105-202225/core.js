import * as THREE from "three/webgpu";
import RAPIER from "rapier";

const $ = (id) => document.getElementById(id);
const PI = Math.PI,
	TAU = PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const params = new URLSearchParams(location.search);
const TITLE = "Raiders of the Lost Map";
const COLORS = ["#d6653f", "#4d9da6", "#7eaa66", "#d0a33e"];
const defaults = Object.freeze({
	speed: 5.2,
	enemySpeed: 1,
	damage: 1,
	reach: 3.8,
	gravity: 18,
	timeScale: 1,
});
const tune = { ...defaults };
const settings = {
	music: 0.1,
	sfx: 0.7,
	voice: 0.5,
	master: 0.75,
	glyphs: "PlayStation",
	shake: true,
	subtitles: true,
	assist: true,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("lost-map-options") || "{}"),
	);
} catch {}
const stageData = [
	{
		name: "The Saffron Bazaar",
		subtitle: "Every good expedition begins with a bad bargain.",
		palette: "sand",
		start: [-12, 0, 8],
	},
	{
		name: "Temple of the Coiled Sun",
		subtitle: "The architecture is lovely. The tenants bite.",
		palette: "temple",
		start: [0, 0, 10],
	},
	{
		name: "The Sun Atlas",
		subtitle: "A little light on the subject.",
		palette: "atlas",
		start: [0, 0, 10],
	},
	{
		name: "The Valley of Poison",
		subtitle: "A short walk. With several very long drops.",
		palette: "sand",
		start: [-14, 0, 7],
	},
	{
		name: "A Leap of Bad Judgment",
		subtitle: "Remember the parachute. Preferably before landing.",
		palette: "canyon",
		start: [-8, 23, 7],
	},
	{
		name: "The Well of Whispers",
		subtitle: "Some things are buried for a perfectly good reason.",
		palette: "well",
		start: [0, 0, 10],
	},
	{
		name: "The Last Exit",
		subtitle: "Take the treasure. Leave the enormous rolling stone.",
		palette: "escape",
		start: [0, 0, 12],
	},
];
const glyphNames = ["IBIS", "COBRA", "SCARAB"];
const S = {
	mode: "loading",
	stage: 0,
	time: 0,
	elapsed: 0,
	coins: 0,
	kills: 0,
	secrets: 0,
	flags: {},
	players: [],
	enemies: [],
	pickups: [],
	interacts: [],
	projectiles: [],
	effects: [],
	dynamic: [],
	mirrors: [2, 3, 0],
	seals: [],
	target: 0,
	selectedMesa: 0,
	escape: 0,
	checkpoint: null,
	won: false,
	attract: false,
	attractClock: 0,
	attractStep: 0,
	revision: 0,
	sceneSerial: 0,
	remoteSceneSerial: 0,
	deathCount: 0,
};
let scene,
	camera,
	renderer,
	world,
	level,
	worldRoot,
	playerRoot,
	raycaster,
	plane;
let materials = {},
	geoDispose = [],
	colliderDebug,
	backgroundRoot,
	ambientRoot;
let lastFrame = 0,
	accumulator = 0,
	renderTime = 0,
	cardTimer = 0,
	speechTimer = 0,
	toastTimer = 0,
	flash = 0;
let menu = "title",
	previousMenu = "title",
	menuFocus = 0,
	lastActivity = performance.now(),
	inputType = "keyboard",
	mouseMoved = false;
let debug = {
	god: false,
	noclip: false,
	freeze: false,
	colliders: false,
	waypoints: true,
};
let loadingError = null,
	ready = false;
let localId = 0,
	isHost = true,
	netActive = false,
	hubInfo = null,
	hubStarted = false,
	hubEnded = false,
	netTimer = 0,
	netSequence = 0,
	lastSnapshot = 0;
let standalone = null,
	remoteInputs = new Map(),
	inputSeq = 0;
let latestInput = {
	x: 0,
	z: 0,
	aim: null,
	attack: false,
	interact: false,
	dodge: false,
	tool: false,
};
let nearest = null,
	hovered = null,
	interactCooldown = 0;
let cameraTarget = vec(),
	cameraLook = vec(),
	shake = 0;
let debugLog = [],
	metrics = {
		frames: 0,
		physicsSteps: 0,
		attacks: 0,
		interactions: 0,
		rolls: 0,
		swings: 0,
		glides: 0,
		damages: 0,
		sfx: 0,
		snapshots: 0,
		inputs: 0,
	};
const rngSeed = (n) => {
	let a = n >>> 0;
	return () => {
		a += 0x6d2b79f5;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};
let worldRng = rngSeed(1936);
function logEvent(type, data = {}) {
	debugLog.push({ type, stage: S.stage, time: S.time, ...data });
	if (debugLog.length > 300) debugLog.shift();
}
function saveOptions() {
	try {
		localStorage.setItem("lost-map-options", JSON.stringify(settings));
	} catch {}
	audio.apply();
}
function localPlayer() {
	return S.players.find((p) => p.id === localId) || S.players[0];
}
function hostAuthority() {
	return !netActive || isHost;
}
function gameRunning() {
	return S.mode === "playing" && (menu === null || netActive);
}
function safeText(text) {
	return String(text).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}

class ExpeditionAudio {
	constructor() {
		this.ctx = null;
		this.nodes = null;
		this.next = 0;
		this.beat = 0;
		this.muted = false;
		this.events = 0;
	}
	unlock() {
		if (!this.ctx) {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			this.ctx = new AC();
			const c = this.ctx;
			const master = c.createGain(),
				music = c.createGain(),
				sfx = c.createGain(),
				voice = c.createGain(),
				analyser = c.createAnalyser();
			music.connect(master);
			sfx.connect(master);
			voice.connect(master);
			master.connect(analyser);
			analyser.connect(c.destination);
			this.nodes = { master, music, sfx, voice, analyser };
			this.apply();
		}
		if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
	}
	apply() {
		if (!this.nodes) return;
		for (const k of ["master", "music", "sfx", "voice"])
			this.nodes[k].gain.value = this.muted ? 0 : settings[k];
	}
	tone(
		freq,
		t,
		duration,
		gain = 0.15,
		type = "triangle",
		target = null,
		ctx = null,
	) {
		const c = ctx || this.ctx;
		if (!c) return;
		const o = c.createOscillator(),
			g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(gain, t + 0.012);
		g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		o.connect(g);
		g.connect(target || this.nodes.sfx);
		o.start(t);
		o.stop(t + duration + 0.03);
		this.events++;
	}
	noise(t, duration, gain = 0.15, cutoff = 1500, target = null, ctx = null) {
		const c = ctx || this.ctx;
		if (!c) return;
		const b = c.createBuffer(
				1,
				Math.floor(c.sampleRate * duration),
				c.sampleRate,
			),
			d = b.getChannelData(0);
		for (let i = 0; i < d.length; i++)
			d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
		const n = c.createBufferSource(),
			f = c.createBiquadFilter(),
			g = c.createGain();
		n.buffer = b;
		f.type = "lowpass";
		f.frequency.value = cutoff;
		g.gain.value = gain;
		n.connect(f);
		f.connect(g);
		g.connect(target || this.nodes.sfx);
		n.start(t);
		n.stop(t + duration);
		this.events++;
	}
	fx(kind, ctx = null, target = null) {
		const c = ctx || this.ctx;
		if (!c || (this.muted && !ctx)) return;
		const t = c.currentTime,
			out = target || (this.nodes && this.nodes.sfx);
		const tone = (f, dt, d, g, type) =>
			this.tone(f, t + dt, d, g, type, out, c);
		if (kind === "whip") {
			this.noise(t, 0.15, 0.6, 3500, out, c);
			tone(240, 0.02, 0.08, 0.1, "sawtooth");
		} else if (kind === "coin") {
			tone(880, 0, 0.12, 0.22, "sine");
			tone(1320, 0.08, 0.19, 0.15, "triangle");
		} else if (kind === "hurt") {
			tone(155, 0, 0.2, 0.3, "sawtooth");
			tone(90, 0.08, 0.3, 0.2, "square");
			this.noise(t, 0.14, 0.2, 900, out, c);
		} else if (kind === "roll") {
			this.noise(t, 0.24, 0.25, 650, out, c);
		} else if (kind === "chime") {
			[0, 4, 7, 12].forEach((v, i) =>
				tone(440 * 2 ** (v / 12), i * 0.09, 0.5, 0.18, "triangle"),
			);
		} else if (kind === "rotate") {
			tone(260, 0, 0.15, 0.2, "triangle");
			this.noise(t, 0.1, 0.15, 900, out, c);
		} else if (kind === "flute") {
			[74, 77, 81, 79, 74].forEach((n, i) =>
				tone(440 * 2 ** ((n - 69) / 12), i * 0.13, 0.28, 0.2, "sine"),
			);
		} else if (kind === "slam") {
			this.noise(t, 0.7, 0.6, 450, out, c);
			tone(55, 0, 0.6, 0.4, "triangle");
		} else if (kind === "chute") {
			this.noise(t, 0.7, 0.3, 1700, out, c);
		} else if (kind === "click") {
			tone(500, 0, 0.045, 0.08, "triangle");
		} else if (kind === "victory") {
			[0, 4, 7, 12, 7, 12, 16].forEach((v, i) =>
				tone(261.6 * 2 ** (v / 12), i * 0.17, 0.65, 0.2, "triangle"),
			);
		}
		metrics.sfx++;
	}
	say(text) {
		if (!this.ctx || this.muted) return;
		const c = this.ctx,
			t = c.currentTime,
			syll = Math.min(14, Math.max(4, Math.floor(text.length / 5)));
		for (let i = 0; i < syll; i++) {
			const dt = i * 0.075,
				f = 180 + (text.charCodeAt(i % text.length) % 13) * 25;
			this.tone(
				f,
				t + dt,
				0.065,
				0.11,
				i % 3 ? "triangle" : "sawtooth",
				this.nodes.voice,
			);
			this.tone(f * 2.03, t + dt, 0.045, 0.035, "sine", this.nodes.voice);
		}
	}
	update() {
		if (!this.ctx || this.ctx.state !== "running" || this.muted) return;
		const c = this.ctx;
		if (this.next < c.currentTime - 0.5) this.next = c.currentTime + 0.05;
		const melody = [
			62, 65, 69, 72, 69, 65, 62, 60, 62, 65, 67, 69, 67, 65, 60, 57, 58, 62,
			65, 69, 65, 62, 58, 57, 57, 60, 64, 67, 64, 60, 57, 60,
		];
		while (this.next < c.currentTime + 0.15) {
			const i = this.beat % 32,
				t = this.next,
				tense = S.stage === 6 || (S.stage === 5 && S.flags.bossAwake),
				n = melody[i] + (tense ? 12 : 0);
			if (i % 2 === 0 || i === 7 || i === 15)
				this.tone(
					440 * 2 ** ((n - 69) / 12),
					t,
					0.3,
					0.16,
					"triangle",
					this.nodes.music,
				);
			if (i % 4 === 0) {
				this.tone(
					440 * 2 ** (((i < 16 ? 38 : 34) - 69) / 12),
					t,
					0.45,
					0.23,
					"sine",
					this.nodes.music,
				);
				this.noise(t, 0.12, 0.16, 600, this.nodes.music);
			}
			if (i % 2) this.noise(t, 0.06, 0.045, 4000, this.nodes.music);
			if (i % 8 === 4)
				[50, 57, 65].forEach((nn) =>
					this.tone(
						440 * 2 ** ((nn - 69) / 12),
						t,
						0.65,
						0.035,
						"sawtooth",
						this.nodes.music,
					),
				);
			this.beat++;
			this.next += tense ? 0.19 : 0.26;
		}
	}
	stop() {
		this.muted = true;
		this.apply();
	}
	resume() {
		this.muted = false;
		this.apply();
	}
	async offlineTest() {
		const c = new OfflineAudioContext(1, 44100, 44100),
			g = c.createGain();
		g.gain.value = 0.4;
		g.connect(c.destination);
		this.fx("whip", c, g);
		this.tone(440, 0.2, 0.5, 0.2, "triangle", g, c);
		const b = await c.startRendering(),
			d = b.getChannelData(0);
		let sum = 0,
			peak = 0;
		for (const x of d) {
			sum += x * x;
			peak = Math.max(peak, Math.abs(x));
		}
		return {
			rms: Math.sqrt(sum / d.length),
			peak,
			samples: d.length,
			musicDefault: 0.1,
		};
	}
}
const audio = new ExpeditionAudio();

const palette = {
	ink: 0x19332f,
	sand: 0xdab475,
	sandLight: 0xf3d398,
	rock: 0xb86c43,
	rockDark: 0x82503a,
	gold: 0xeeba50,
	cream: 0xf9e4ae,
	teal: 0x3c7770,
	deep: 0x244947,
	green: 0x79945c,
	red: 0xb34b35,
	cloth: 0xd58b53,
	blue: 0x719f9b,
	skin: 0xdb9d68,
	leather: 0x75462f,
	brown: 0x573d2f,
	white: 0xf3ead0,
};
let gradient, inkMaterial, lineMaterial, shadowMaterial;
function mat(key) {
	if (typeof key === "number") {
		const k = "x" + key;
		if (!materials[k])
			materials[k] = new THREE.MeshToonNodeMaterial({
				color: key,
				gradientMap: gradient,
			});
		return materials[k];
	}
	if (!materials[key])
		materials[key] = new THREE.MeshToonNodeMaterial({
			color: palette[key] || key,
			gradientMap: gradient,
		});
	return materials[key];
}
function mesh(geo, key, x = 0, y = 0, z = 0, parent = level, outline = false) {
	const m = new THREE.Mesh(geo, typeof key === "object" ? key : mat(key));
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	parent.add(m);
	if (outline) {
		const e = new THREE.LineSegments(
			new THREE.EdgesGeometry(geo, 28),
			lineMaterial,
		);
		m.add(e);
	}
	return m;
}
function box(x, y, z, w, h, d, key, parent = level, outline = true) {
	return mesh(new THREE.BoxGeometry(w, h, d), key, x, y, z, parent, outline);
}
function cylinder(x, y, z, r, h, key, parent = level, n = 12, top = null) {
	return mesh(
		new THREE.CylinderGeometry(top === null ? r : top, r, h, n),
		key,
		x,
		y,
		z,
		parent,
		true,
	);
}
function ball(x, y, z, r, key, parent = level, n = 12) {
	return mesh(new THREE.SphereGeometry(r, n, 8), key, x, y, z, parent);
}
function torus(x, y, z, r, t, key, parent = level) {
	return mesh(new THREE.TorusGeometry(r, t, 5, 32), key, x, y, z, parent);
}
function line(points, color = 0x19332f, parent = level, width = 1) {
	const g = new THREE.BufferGeometry().setFromPoints(
			points.map((p) => (Array.isArray(p) ? vec(...p) : p)),
		),
		m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
	const l = new THREE.Line(g, m);
	parent.add(l);
	return l;
}
function tube(points, r, key, parent = level) {
	return mesh(
		new THREE.TubeGeometry(
			new THREE.CatmullRomCurve3(points.map((p) => vec(...p))),
			24,
			r,
			5,
			false,
		),
		key,
		0,
		0,
		0,
		parent,
	);
}
function fixedBox(x, y, z, w, h, d, key = "sand", visible = true) {
	if (visible) box(x, y, z, w, h, d, key);
	return world.createCollider(
		RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z),
	);
}
function ground(x, z, w, d, key = "sand", y = 0) {
	return fixedBox(x, y - 0.65, z, w, 1.3, d, key);
}
function sign(text, x, y, z, size = 1.5, color = "#f9e4ae", parent = level) {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 180;
	const c = canvas.getContext("2d");
	c.font = '600 112px "Barlow Condensed", sans-serif';
	c.textAlign = "center";
	c.textBaseline = "middle";
	c.fillStyle = color;
	c.strokeStyle = "#18322d";
	c.lineWidth = 3;
	c.strokeText(text, 512, 90, 980);
	c.fillText(text, 512, 90, 980);
	const t = new THREE.CanvasTexture(canvas);
	t.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Sprite(
		new THREE.SpriteMaterial({
			map: t,
			depthWrite: false,
			depthTest: false,
			fog: false,
			transparent: true,
		}),
	);
	m.position.set(x, y, z);
	m.scale.set(size * 5.69, size, 1);
	m.renderOrder = 12;
	m.userData.text = text;
	parent.add(m);
	return m;
}
function blob(x, z, r = 1, parent = level, y = 0.04) {
	const m = mesh(
		new THREE.CircleGeometry(r, 28),
		shadowMaterial,
		x,
		y,
		z,
		parent,
	);
	m.rotation.x = -PI / 2;
	m.castShadow = false;
	return m;
}
function ring(x, z, r, key = "gold", y = 0.05, parent = level) {
	const m = mesh(
		new THREE.RingGeometry(r - 0.065, r, 48),
		new THREE.MeshBasicMaterial({
			color: palette[key] || key,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.8,
		}),
		x,
		y,
		z,
		parent,
	);
	m.rotation.x = -PI / 2;
	return m;
}
function pot(x, z, s = 1, key = "rock", parent = level) {
	cylinder(x, 0.43 * s, z, 0.48 * s, 0.85 * s, key, parent, 10, 0.32 * s);
	cylinder(x, 0.92 * s, z, 0.29 * s, 0.16 * s, "sandLight", parent, 10);
	cylinder(x, 0.98 * s, z, 0.22 * s, 0.04 * s, "brown", parent, 10);
}
function palm(x, z, s = 1, parent = level) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	parent.add(g);
	tube(
		[
			[0, 0, 0],
			[0.13 * s, 2 * s, 0],
			[0.5 * s, 4.3 * s, 0.1 * s],
		],
		0.17 * s,
		"brown",
		g,
	);
	for (let j = 0; j < 7; j++) {
		const a = (j / 7) * TAU;
		const pts = [
			[0.5 * s, 4.3 * s, 0.1 * s],
			[(0.5 + Math.cos(a) * 1.2) * s, 4.8 * s, Math.sin(a) * 1.2 * s],
			[(0.5 + Math.cos(a) * 2.2) * s, 3.9 * s, Math.sin(a) * 2.2 * s],
		];
		const leaf = tube(pts, 0.19 * s, "green", g);
		leaf.scale.y = 1;
	}
	for (let j = 0; j < 3; j++)
		ball((0.4 + j * 0.13) * s, 4.05 * s, 0.15 * s, 0.2 * s, "rockDark", g);
	blob(x, z, 2 * s, parent);
}
function crate(x, z, s = 1, breakable = false) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	level.add(g);
	box(0, 0.55 * s, 0, 1.1 * s, 1.1 * s, 1.1 * s, "brown", g);
	box(0, 0.55 * s, 0.57 * s, 0.16 * s, 1.07 * s, 0.06 * s, "sand", g);
	const b = box(0, 0.56 * s, 0.58 * s, 1.23 * s, 0.12 * s, 0.06 * s, "sand", g);
	b.rotation.z = 0.73;
	if (breakable)
		S.pickups.push({ kind: "crate", x, z, mesh: g, active: true, hp: 1 });
	else fixedBox(x, 0.5 * s, z, 1.1 * s, s, 1.1 * s, "brown", false);
	return g;
}
function rubble(x, z, s = 1, key = "rock") {
	const r = mesh(new THREE.DodecahedronGeometry(s, 0), key, x, s * 0.43, z);
	r.scale.set(1, 0.6, 0.8);
	r.rotation.set(0.2, worldRng() * TAU, 0.1);
	return r;
}
function pillar(x, z, h = 5, key = "sand") {
	fixedBox(x, 0.45, z, 1.8, 0.9, 1.8, key);
	cylinder(x, h / 2, z, 0.58, h - 0.6, key, level, 8);
	box(x, h - 0.3, z, 1.65, 0.6, 1.65, "sandLight");
	box(x, 1, z, 1.1, 0.2, 1.1, "rockDark");
	for (let i = 0; i < 3; i++)
		box(
			x - 0.02,
			2 + i * 0.65,
			z + 0.59,
			0.38,
			0.11,
			0.025,
			"rockDark",
			level,
			false,
		);
}
function brazier(x, z) {
	cylinder(x, 0.6, z, 0.45, 1.2, "brown", level, 8, 0.28);
	cylinder(x, 1.28, z, 0.38, 0.25, "gold", level, 10, 0.63);
	const flame = mesh(new THREE.ConeGeometry(0.32, 0.9, 7), "gold", x, 1.86, z);
	const f2 = mesh(
		new THREE.ConeGeometry(0.18, 0.65, 6),
		"cream",
		x,
		1.8,
		z + 0.03,
	);
	S.dynamic.push({
		kind: "flame",
		mesh: flame,
		other: f2,
		phase: worldRng() * TAU,
	});
	const l = new THREE.PointLight(0xffbb66, 6, 9, 2);
	l.position.set(x, 2.2, z);
	level.add(l);
}
function cloth(x, y, z, w, d, key, parent = level) {
	const g = new THREE.PlaneGeometry(w, d, 10, 6),
		p = g.attributes.position;
	for (let i = 0; i < p.count; i++)
		p.setZ(i, 0.12 * Math.cos(p.getX(i) * 4) + 0.1 * Math.cos(p.getY(i) * 2));
	g.computeVertexNormals();
	const m = mesh(
		g,
		new THREE.MeshToonNodeMaterial({
			color: palette[key] || key,
			gradientMap: gradient,
			side: THREE.DoubleSide,
		}),
		x,
		y,
		z,
		parent,
	);
	m.rotation.x = -PI / 2;
	return m;
}
function building(x, z, w = 7, h = 6, d = 5) {
	fixedBox(x, h / 2, z, w, h, d, "sand");
	box(x, h + 0.22, z, w + 0.4, 0.45, d + 0.4, "sandLight");
	for (let i = -1; i <= 1; i++)
		box(x + (i * w) / 3, h + 0.7, z + d / 2, 0.65, 1, 0.65, "sandLight");
	const door = mesh(
		new THREE.PlaneGeometry(1.5, 2.8),
		"brown",
		x,
		1.4,
		z + d / 2 + 0.015,
	);
	door.rotation.y = 0;
	for (let i = -1; i <= 1; i += 2) {
		box(x + i * w * 0.32, 3.7, z + d / 2 + 0.04, 0.9, 1.3, 0.1, "deep");
		box(x + i * w * 0.32, 3.7, z + d / 2 + 0.14, 0.07, 1.35, 0.1, "brown");
	}
	for (let i = 0; i < 3; i++)
		box(x + w * 0.5 - 0.2, h + 1 + i * 0.3, z - d * 0.25, 1, 0.15, 1, "rock");
}
function doorway(x, z, label, key = "gold") {
	box(x - 1.85, 2.3, z, 1.3, 4.6, 1.6, "sand");
	box(x + 1.85, 2.3, z, 1.3, 4.6, 1.6, "sand");
	box(x, 4.7, z, 5.1, 1, 1.7, "sandLight");
	box(x, 2, z - 0.4, 2.4, 4, 0.13, "deep");
	sign(label, x, 5.7, z, 1.1, "#f6dda2");
	ring(x, z + 1.4, 1.2, key);
	return vec(x, 0, z + 1.4);
}
function coin(x, z, value = 1, y = 0.8) {
	const m = cylinder(x, y, z, 0.27, 0.1, "gold");
	m.rotation.x = PI / 2;
	S.pickups.push({
		kind: "coin",
		x,
		y,
		z,
		value,
		mesh: m,
		active: true,
		phase: worldRng() * TAU,
	});
}
function chest(x, z, label, action) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	level.add(g);
	box(0, 0.55, 0, 1.5, 0.95, 1, "brown", g);
	const top = cylinder(0, 1.02, 0, 0.52, 1.5, "rockDark", g, 12);
	top.rotation.z = PI / 2;
	box(-0.5, 0.85, 0, 0.12, 0.65, 1.1, "gold", g);
	box(0.5, 0.85, 0, 0.12, 0.65, 1.1, "gold", g);
	box(0, 0.65, 0.57, 0.25, 0.3, 0.12, "gold", g);
	addInteract(x, z, label, action, { mesh: g });
	return g;
}
function marker(x, z, key = "gold", parent = level) {
	const g = new THREE.Group();
	g.position.set(x, 3, z);
	parent.add(g);
	const diamond = mesh(new THREE.OctahedronGeometry(0.24), key, 0, 0, 0, g);
	S.dynamic.push({ kind: "marker", mesh: g, base: 3, phase: worldRng() * TAU });
	return g;
}
function addInteract(x, z, label, action, extra = {}) {
	const i = {
		id: S.interacts.length,
		x,
		z,
		y: 0,
		label,
		action,
		radius: 2.6,
		enabled: true,
		...extra,
	};
	S.interacts.push(i);
	if (!i.hideMarker) i.marker = marker(x, z, i.color || "gold");
	return i;
}
function makeExplorer(color = COLORS[0], enemy = false) {
	const g = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "rig";
	g.add(rig);
	const shadow = blob(0, 0, 0.68, g);
	shadow.position.y = 0.025;
	const hips = new THREE.Group();
	hips.name = "hips";
	hips.position.y = 0.83;
	rig.add(hips);
	const torso = box(
		0,
		0.46,
		0,
		0.67,
		0.85,
		0.4,
		enemy ? "deep" : "leather",
		hips,
		false,
	);
	box(0, 0.25, 0.23, 0.44, 0.44, 0.11, color, hips, false);
	const leftLeg = new THREE.Group();
	leftLeg.name = "leftLeg";
	leftLeg.position.set(-0.2, 0, 0);
	hips.add(leftLeg);
	const rightLeg = new THREE.Group();
	rightLeg.name = "rightLeg";
	rightLeg.position.set(0.2, 0, 0);
	hips.add(rightLeg);
	box(0, -0.36, 0, 0.26, 0.73, 0.3, "sand", leftLeg, false);
	box(0, -0.69, 0.09, 0.3, 0.21, 0.49, "brown", leftLeg, false);
	box(0, -0.36, 0, 0.26, 0.73, 0.3, "sand", rightLeg, false);
	box(0, -0.69, 0.09, 0.3, 0.21, 0.49, "brown", rightLeg, false);
	const leftArm = new THREE.Group();
	leftArm.name = "leftArm";
	leftArm.position.set(-0.47, 0.7, 0);
	hips.add(leftArm);
	const rightArm = new THREE.Group();
	rightArm.name = "rightArm";
	rightArm.position.set(0.47, 0.7, 0);
	hips.add(rightArm);
	box(
		0,
		-0.28,
		0,
		0.23,
		0.58,
		0.29,
		enemy ? "deep" : "leather",
		leftArm,
		false,
	);
	ball(0, -0.59, 0, 0.14, "skin", leftArm, 8);
	box(
		0,
		-0.28,
		0,
		0.23,
		0.58,
		0.29,
		enemy ? "deep" : "leather",
		rightArm,
		false,
	);
	ball(0, -0.59, 0, 0.14, "skin", rightArm, 8);
	const head = new THREE.Group();
	head.name = "head";
	head.position.set(0, 1.15, 0);
	hips.add(head);
	box(0, 0.13, 0, 0.47, 0.5, 0.43, "skin", head, false);
	box(-0.13, 0.16, 0.224, 0.065, 0.06, 0.03, "ink", head, false);
	box(0.13, 0.16, 0.224, 0.065, 0.06, 0.03, "ink", head, false);
	box(0, -0.01, 0.226, 0.16, 0.035, 0.03, "brown", head, false);
	cylinder(0, 0.4, 0, 0.46, 0.09, "brown", head, 12);
	cylinder(0, 0.56, 0, 0.29, 0.32, enemy ? "deep" : "leather", head, 10, 0.25);
	cylinder(0, 0.43, 0, 0.3, 0.08, "gold", head, 12);
	const strap = box(0.04, 0.52, 0.245, 0.09, 0.94, 0.06, "gold", hips, false);
	strap.rotation.z = -0.55;
	box(0.47, 0.19, 0.03, 0.27, 0.34, 0.33, "brown", hips, false);
	const inkMeshes = [];
	g.traverse((o) => {
		if (o.isMesh && o !== shadow) inkMeshes.push(o);
	});
	for (const o of inkMeshes) {
		const ink = new THREE.Mesh(o.geometry, inkMaterial);
		ink.scale.setScalar(1.045);
		o.add(ink);
	}
	const mixer = new THREE.AnimationMixer(g),
		clips = {};
	const track = (name, values, times = [0, 0.17, 0.34, 0.51, 0.68]) =>
		new THREE.NumberKeyframeTrack(name, times, values);
	clips.walk = new THREE.AnimationClip("walk", 0.68, [
		track("leftLeg.rotation[x]", [-0.7, 0, 0.7, 0, -0.7]),
		track("rightLeg.rotation[x]", [0.7, 0, -0.7, 0, 0.7]),
		track("leftArm.rotation[x]", [0.55, 0, -0.55, 0, 0.55]),
		track("rightArm.rotation[x]", [-0.55, 0, 0.55, 0, -0.55]),
		track("hips.position[y]", [0.83, 0.88, 0.83, 0.88, 0.83]),
	]);
	clips.idle = new THREE.AnimationClip("idle", 2.4, [
		track("hips.position[y]", [0.83, 0.87, 0.83], [0, 1.2, 2.4]),
		track("head.rotation[z]", [0, 0.035, 0], [0, 1.2, 2.4]),
	]);
	clips.whip = new THREE.AnimationClip("whip", 0.38, [
		track("rightArm.rotation[x]", [0, -2.4, -1.3, 0], [0, 0.12, 0.22, 0.38]),
		track("rightArm.rotation[z]", [0, -0.8, 0.4, 0], [0, 0.12, 0.22, 0.38]),
		track("hips.rotation[y]", [0, -0.5, 0.3, 0], [0, 0.12, 0.22, 0.38]),
	]);
	clips.roll = new THREE.AnimationClip("roll", 0.5, [
		track("rig.rotation[x]", [0, -PI, -TAU], [0, 0.25, 0.5]),
	]);
	clips.glide = new THREE.AnimationClip("glide", 1.4, [
		track("leftArm.rotation[z]", [2.2, 2.3, 2.2], [0, 0.7, 1.4]),
		track("rightArm.rotation[z]", [-2.2, -2.3, -2.2], [0, 0.7, 1.4]),
		track("leftLeg.rotation[x]", [0.25, 0.35, 0.25], [0, 0.7, 1.4]),
		track("rightLeg.rotation[x]", [-0.1, -0.2, -0.1], [0, 0.7, 1.4]),
	]);
	clips.flute = new THREE.AnimationClip("flute", 1.2, [
		track("rightArm.rotation[x]", [-1.9, -1.8, -1.9], [0, 0.6, 1.2]),
		track("leftArm.rotation[x]", [-1.8, -1.9, -1.8], [0, 0.6, 1.2]),
	]);
	clips.dig = new THREE.AnimationClip("dig", 0.75, [
		track("rig.rotation[x]", [0, 0.55, 0], [0, 0.35, 0.75]),
		track("rightArm.rotation[x]", [-0.2, -1.2, -0.2], [0, 0.35, 0.75]),
	]);
	const actions = {};
	for (const [name, clip] of Object.entries(clips)) {
		actions[name] = mixer.clipAction(clip);
		if (["whip", "roll", "dig"].includes(name)) {
			actions[name].setLoop(THREE.LoopOnce, 1);
			actions[name].clampWhenFinished = false;
		}
	}
	actions.idle.play();
	const canopy = new THREE.Group();
	canopy.name = "canopy";
	canopy.position.y = 4;
	canopy.visible = false;
	g.add(canopy);
	for (let i = 0; i < 8; i++) {
		const geo = new THREE.SphereGeometry(
			2.4,
			4,
			6,
			(i / 8) * TAU,
			TAU / 8,
			0,
			PI / 2,
		);
		mesh(geo, i % 2 ? "cream" : color, 0, 0, 0, canopy);
		const a = (i / 8) * TAU;
		line(
			[
				[Math.cos(a) * 2.35, 0, Math.sin(a) * 2.35],
				[Math.cos(a) * 0.45, -2.4, Math.sin(a) * 0.3],
			],
			0xf3dfb5,
			canopy,
		);
	}
	const tether = new THREE.Group();
	g.add(tether);
	return {
		mesh: g,
		mixer,
		actions,
		anim: "idle",
		canopy,
		tether,
		shadow,
		head,
		rig,
	};
}
function animateActor(p, state) {
	if (!p.visual) return;
	const v = p.visual;
	if (v.anim === state) return;
	const prior = v.actions[v.anim],
		next = v.actions[state] || v.actions.idle;
	if (prior) prior.fadeOut(0.1);
	next.reset().fadeIn(0.1).play();
	v.anim = state;
}
function makeSnake(x, z) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	level.add(g);
	const segments = [];
	for (let i = 0; i < 8; i++) {
		const b = ball(
			0,
			0.18,
			-i * 0.19,
			0.2 * (1 - i * 0.055),
			i % 2 ? "green" : "gold",
			g,
			8,
		);
		b.scale.z = 1.3;
		segments.push(b);
	}
	const head = box(0, 0.24, 0.15, 0.4, 0.28, 0.44, "green", g, false);
	box(-0.12, 0.34, 0.32, 0.055, 0.055, 0.05, "ink", g, false);
	box(0.12, 0.34, 0.32, 0.055, 0.055, 0.05, "ink", g, false);
	blob(x, z, 0.6);
	return { mesh: g, segments };
}
function biplane(x, z) {
	const g = new THREE.Group();
	g.position.set(x, 1.8, z);
	g.rotation.y = -0.4;
	level.add(g);
	const fuselage = mesh(
		new THREE.CapsuleGeometry(0.55, 4, 5, 10),
		"red",
		0,
		0,
		0,
		g,
	);
	fuselage.rotation.x = PI / 2;
	box(0, 0.15, -0.35, 7, 0.15, 1.6, "cream", g);
	box(0, 1.4, -0.35, 7, 0.15, 1.6, "gold", g);
	for (let side of [-1, 1])
		for (let zz of [-0.85, 0.2]) {
			const strut = box(side * 2.5, 0.77, zz, 0.07, 1.3, 0.07, "brown", g);
			strut.rotation.z = side * 0.12;
		}
	box(0, 0.22, -2.25, 2.4, 0.13, 0.9, "gold", g);
	box(0, 0.65, -2.1, 0.1, 1.4, 1, "gold", g);
	cylinder(0, 0, 2.5, 0.35, 0.6, "brown", g);
	const prop = box(0, 0, 2.85, 0.17, 3.3, 0.09, "brown", g);
	prop.name = "prop";
	const wheels = new THREE.Group();
	g.add(wheels);
	for (let side of [-1, 1]) {
		const w = cylinder(side * 0.8, -1.25, 0.5, 0.36, 0.23, "ink", wheels);
		w.rotation.z = PI / 2;
		box(side * 0.6, -0.75, 0.5, 0.08, 1, 0.08, "brown", wheels);
	}
	const m = new THREE.AnimationMixer(g);
	m.clipAction(
		new THREE.AnimationClip("propeller", 0.12, [
			new THREE.NumberKeyframeTrack("prop.rotation[z]", [0, 0.12], [0, TAU]),
		]),
	).play();
	S.dynamic.push({ kind: "plane", mesh: g, mixer: m });
	return g;
}
