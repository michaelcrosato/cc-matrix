const CREDITS = {"sourceInformation": {"date": "2026-11-05 20:22:25", "source": "Raiders of the Lost Ark (Atari 2600, 1982), designed by Howard Scott Warshaw", "plan": "none", "genre": "Action-adventure; environmental puzzles; cooperative exploration", "perspective": "Third-person isometric 3D, with a tracking escape camera", "tech": "Three.js 0.180.0 (r180), WebGPURenderer with WebGL 2 fallback, Rapier 3D 0.19.3, Gamepad API, Web Audio API, AI Hub Session Protocol v1 client 1.4.0, PeerJS 1.5.5, BroadcastChannel. Interface fonts: Barlow Condensed and DM Sans.", "artDirection": "Stylized cel shading, ink outlines, hand-built low-poly sandstone dioramas, warm paper and teal shadows", "animation": "Native Three.js AnimationMixer and AnimationClip keyframes for walk, idle, whip, evade, flute, digging, parachuting and biplane propeller; procedural snake motion and effects", "audio": "Original code-synthesized adventure music (10% by default), procedural sound effects, Animalese-style gibberish voices; no audio files", "online": "1–4 player host-authoritative cooperative AI Hub sessions; standalone WebRTC rooms via PeerJS and same-browser BroadcastChannel rooms", "testing": "Headless Chromium 153 with Playwright 1.63.0: 33/33 full-suite checks, including the complete seven-chapter playthrough, WebGPU state, WebGL 2 visual review, emulated standard gamepad, touch, offline audio, two-page co-op, direct file launch, and four official AI Hub harness scenarios. A stricter replay regression passed 8/8, showing every chapter and nine whip crossings. Visuals reviewed at 1600x900 and 1920x1080; touch profile 844x390. No FPS targets. Physical controller, real mobile hardware, subjective audio quality and cross-device WebRTC: unknown.", "research": "Original Atari instruction manual and reverse-engineered game analysis: inventory, trading, snakes and flute, map room, ankh, mesas, parachute, room silhouettes, enemies and TIA sound / title music. AI Hub Session Protocol v1, Three.js r180 toon material source, and Rapier character-controller documentation. Original audio recordings were not auditioned.", "environment": "Codex CLI (headless); Linux", "model": "OpenAI, gpt-6.1-sol, reasoning effort max", "usage": "added on import"}, "testingFeedback": ["10 findings were addressed: 8 game or UX issues and 2 test-tool issues. These included co-op roster synchronization, title loading and attract timing, replay routing, shared Sprite geometry cleanup, canyon visibility, controller scrolling, material colors and an automated evade timing error.", "1 critical issue: a newly joined co-op player could lack a visible actor when the roster changed without a room change. It was fixed and two-page state convergence passed.", "The two-page authoritative co-op state comparison caught the missing remote actor. The complete seven-chapter scripted playthrough also verified trading, both puzzles, traversal, boss combat, defeat recovery and the escape ending.", "The WebGPU screenshot was blank in this headless environment. WebGPU state assertions and WebGL 2 captures provided the useful evidence instead."], "engineFeedback": ["Native toon materials, reusable geometry and AnimationMixer clips made a coherent ink-and-sand world possible without external art or animation files.", "Yes. Cloning a toon node material lost the intended cloth colors, and disposing shared Sprite geometry hid later inscriptions. A WebGPU queue-completion diagnostic also failed on the headless adapter. Each was corrected or replaced with an appropriate check.", "The adventure state machine, contextual interactions, procedural art and audio, input abstraction, checkpoints, and host-authoritative cooperative networking.", "Keeping Rapier movement, animated whip traversal, room transitions and replicated actors synchronized across input methods and network copies.", "none", "An integrated character controller and a small gameplay / resource-lifetime inspector would make this kind of single-file game easier to build."], "promptFeedback": ["The specific source, controller-first requirements, complete vertical-slice scope and explicit testing stand-ins gave the game a clear direction.", "Standalone networking transport, signaling-service expectations and the target length of the demo were unspecified. There was no blocking ambiguity.", "Combining seven distinct adventure sequences, procedural presentation, controller and touch support, and verified standalone / AI Hub co-op in one HTML file.", "Specify the standalone networking transport, whether public signaling services are acceptable, and a target demo duration."], "aiHub": {"name": "Raiders of the Lost Map", "tagline": "One missing map. Far too many snakes.", "description": "Trade in a bustling bazaar, charm snakes, solve a sunlit atlas, and swing across desert mesas in a cel-shaded pulp adventure. Recover a buried reliquary and outrun the inevitable boulder, solo or with up to three partners.", "type": "Game", "genre": "Adventure", "source": "Raiders of the Lost Ark (1982)", "series": "Indiana Jones", "players": "1–4", "controls": "Left stick / WASD move; Square / LMB whip; Triangle / E interact; Cross / Space evade; Circle / F flute or parachute; L1 / Q notes; Options / Esc pause.", "tags": ["3d", "adventure", "co-op", "isometric", "exploration", "boss fights"]}};
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

function disposeLevel() {
	if (level) {
		level.traverse((o) => {
			if (o.geometry && !o.isSprite) o.geometry.dispose();
			if (o.isSprite && o.material.map) {
				o.material.map.dispose();
				o.material.dispose();
			}
		});
		scene.remove(level);
	}
	if (playerRoot) {
		playerRoot.traverse((o) => {
			if (o.geometry) o.geometry.dispose();
		});
		scene.remove(playerRoot);
	}
	if (world) world.free();
}
function landscape(theme) {
	const dark = ["temple", "atlas", "well"].includes(theme);
	scene.background = new THREE.Color(dark ? 0x183d3c : 0xd4bd8e);
	scene.fog = new THREE.Fog(dark ? 0x183d3c : 0xd4bd8e, 75, 150);
	scene.getObjectByName("sunlight").intensity = dark ? 1.8 : 2.7;
	scene.getObjectByName("ambient").intensity = dark ? 1.25 : 1.4;
	const sea = mesh(
		new THREE.PlaneGeometry(400, 400),
		dark ? "deep" : "sand",
		0,
		-19,
		0,
	);
	sea.rotation.x = -PI / 2;
	sea.receiveShadow = false;
	worldRng = rngSeed(1936 + S.stage * 91);
	for (let i = 0; i < 24; i++) {
		const a = (i / 24) * TAU,
			r = 35 + worldRng() * 55,
			x = Math.cos(a) * r,
			z = Math.sin(a) * r,
			h = 7 + worldRng() * 17;
		const m = cylinder(
			x,
			-18 + h / 2,
			z,
			5 + worldRng() * 7,
			h,
			i % 2 ? "rock" : "rockDark",
			level,
			5 + Math.floor(worldRng() * 4),
			3 + worldRng() * 4,
		);
		m.rotation.y = worldRng() * 2;
	}
	if (!dark) {
		const sun = mesh(
			new THREE.SphereGeometry(8, 32, 24),
			new THREE.MeshBasicMaterial({ color: 0xf8d283 }),
			-35,
			22,
			-65,
		);
		sun.castShadow = false;
		for (let i = 0; i < 11; i++) {
			const cloud = box(
				-55 + i * 11,
				17 + worldRng() * 10,
				-55 - worldRng() * 30,
				8 + worldRng() * 12,
				0.2,
				1.1,
				"cream",
				level,
				false,
			);
			cloud.material = new THREE.MeshBasicMaterial({
				color: 0xf7dca9,
				transparent: true,
				opacity: 0.25,
			});
		}
	}
	const dust = new THREE.BufferGeometry(),
		pts = [];
	for (let i = 0; i < 180; i++)
		pts.push((worldRng() - 0.5) * 65, worldRng() * 16, (worldRng() - 0.5) * 55);
	dust.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
	const particles = new THREE.Points(
		dust,
		new THREE.PointsMaterial({
			color: dark ? 0xeba944 : 0xffedbd,
			size: 0.06,
			transparent: true,
			opacity: 0.5,
		}),
	);
	level.add(particles);
	S.dynamic.push({ kind: "dust", mesh: particles });
}
function floorDecor(w = 36, d = 25, key = "rockDark") {
	for (let i = 0; i < 75; i++) {
		const x = (worldRng() - 0.5) * w,
			z = (worldRng() - 0.5) * d,
			r = 0.06 + worldRng() * 0.2;
		const m = mesh(
			new THREE.CircleGeometry(r, 3),
			i % 4 ? "sandLight" : key,
			x,
			0.012,
			z,
		);
		m.rotation.x = -PI / 2;
		m.rotation.z = worldRng() * TAU;
	}
	for (let j = 0; j < 18; j++) {
		const x = (worldRng() - 0.5) * w,
			z = (worldRng() - 0.5) * d;
		line(
			[
				[x, 0.025, z],
				[x + 0.7, 0.025, z + 0.2],
				[x + 1.1, 0.025, z + 0.12],
			],
			0xb18e5e,
		);
	}
}
function boundRoom(w = 38, d = 27) {
	fixedBox(-w / 2 - 0.3, 1.5, 0, 0.6, 3, d + 1, "sand", false);
	fixedBox(w / 2 + 0.3, 1.5, 0, 0.6, 3, d + 1, "sand", false);
	fixedBox(0, 1.5, -d / 2 - 0.3, w + 1, 3, 0.6, "sand", false);
	fixedBox(0, 1.5, d / 2 + 0.3, w + 1, 3, 0.6, "sand", false);
}
function expeditionBanner(text = "✥", x = 0, z = 0) {
	const m = cloth(x, 3.6, z, 1.5, 2.6, "red");
	m.rotation.x = 0;
	m.rotation.z = 0.04;
	box(x - 0.9, 2, z, 0.08, 4, 0.08, "brown");
	box(x + 0.9, 2, z, 0.08, 4, 0.08, "brown");
	sign(text, x, 3.7, z + 0.06, 0.8);
}
function npc(x, z, color = "teal", name = "NADIA") {
	const v = makeExplorer(palette[color] || color);
	v.mesh.position.set(x, 0, z);
	level.add(v.mesh);
	v.mesh.rotation.y = -0.5;
	S.dynamic.push({ kind: "npc", visual: v, mesh: v.mesh });
	sign(name, x, 3.2, z, 0.8, "#f2d89f");
	return v;
}
function buildBazaar() {
	ground(0, 0, 40, 29, "sand");
	floorDecor(39, 28);
	boundRoom(40, 29);
	building(-13, -10, 9, 6, 6);
	building(12, -10, 10, 7, 6);
	doorway(0, -11, "TEMPLE OF THE COILED SUN");
	for (let side of [-1, 1]) {
		for (let i = 0; i < 3; i++) {
			const x = side * 15,
				z = -2 + i * 5;
			fixedBox(x, 1, z, 4, 2, 2.3, "sand");
			cloth(x, 3.2, z + 0.7, 5, 3.8, i % 2 ? "red" : "teal");
			for (let xx of [-2.1, 2.1])
				box(x + xx, 1.6, z + 2, 0.09, 3.2, 0.09, "brown");
			for (let j = 0; j < 3; j++)
				pot(x - 1 + j, z + 1.3, 0.45, i % 2 ? "gold" : "rock");
		}
	}
	palm(-17, 10, 0.95);
	palm(17, 9, 1.2);
	palm(-5, -9, 0.9);
	// A hand-woven route through the market.
	for (let z = 4; z > -8; z -= 3.2) {
		box(0, 0.025, z, 3, 0.04, 2.8, "teal", level, false);
		for (let x of [-1.2, 1.2])
			box(x, 0.05, z, 0.05, 0.02, 2.6, "gold", level, false);
		const diamond = mesh(new THREE.PlaneGeometry(0.7, 0.7), "gold", 0, 0.06, z);
		diamond.rotation.set(-PI / 2, 0, PI / 4);
	}
	const merchant = npc(9, 1, "teal", "NADIA / OUTFITTER");
	cloth(9, 0.04, 3.2, 6.7, 3.6, "red");
	pot(11, 1, 0.8);
	pot(7, 1, 0.6);
	crate(12, 4);
	const shop = addInteract(
		9,
		2.7,
		() => (S.flags.flute ? "Talk to Nadia" : "Trade 3 coins · field kit"),
		(p) => {
			if (S.flags.flute) {
				say("NADIA", "The sun reads the map. You merely carry the hat.");
				return;
			}
			if (S.coins < 3) {
				say(
					"NADIA",
					"Three coins. The snake flute and a shovel. Dignity costs extra.",
				);
				audio.fx("click");
				return;
			}
			S.coins -= 3;
			S.flags.flute = true;
			S.flags.shovel = true;
			audio.fx("chime");
			say(
				"NADIA",
				"A flute for the snakes. A shovel for everything the snakes are sitting on.",
			);
			toast("FIELD KIT ACQUIRED · Flute + shovel");
			saveCheckpoint();
		},
		{ radius: 3.5 },
	);
	shop.marker.position.y = 3.7;
	addInteract(
		0,
		-9.6,
		"Enter the temple",
		() => {
			if (!S.flags.flute) {
				say(
					"FIELD NOTE",
					"The doorway is crawling. Nadia sells a flute that might help.",
				);
				return;
			}
			advanceStage(1);
		},
		{ radius: 2.7 },
	);
	npc(-7, 7, "gold", "THE CARTOGRAPHER");
	addInteract(
		-7,
		7.8,
		"Ask about the lost map",
		() => {
			say(
				"THE CARTOGRAPHER",
				"I sold the map to a man who sold it to a man who lost it. Try the Sun Atlas.",
			);
			S.flags.cartographer = true;
		},
		{ hideMarker: true },
	);
	[
		[-11, 2],
		[-7, -3],
		[-4, 6],
		[4, 7],
		[7, -5],
		[14, 7],
		[-15, -5],
	].forEach((p, i) => coin(...p));
	crate(-8, 1, 1, true);
	crate(3, 5, 1, true);
	crate(4, -6, 0.9, true);
	crate(-13, 7, 0.8, true);
	spawnEnemy("thief", -5, -2);
	spawnEnemy("thief", 4, 2);
	spawnEnemy("snake", -1, -6);
	sign("S A F F R O N   B A Z A A R", 0, 8.3, -12, 1.8, "#8e4e35");
	brazier(-3, -10);
	brazier(3, -10);
}
function sealPlinth(x, z, index, symbol) {
	cylinder(x, 0.22, z, 1.15, 0.44, "rockDark", level, 12);
	cylinder(x, 0.46, z, 0.93, 0.1, "gold", level, 12);
	const emblem = sign(symbol, x, 0.9, z, 1.2, "#edc66c");
	ring(x, z, 1.55, "gold");
	const obj = addInteract(
		x,
		z,
		"Press the " + ["COIL", "SUN", "WING"][index] + " seal",
		(p) => {
			if (S.flags.templeSolved) {
				toast("The three seals are already awake.");
				return;
			}
			if (S.seals.length === index) {
				S.seals.push(index);
				audio.fx("chime");
				emblem.material.color.set("#fff4bf");
				toast(
					["THE COIL WAKES", "THE SUN ANSWERS", "THE WING OPENS THE WAY"][
						index
					],
				);
			} else {
				S.seals = [];
				audio.fx("hurt");
				say(
					"FIELD NOTE",
					"Coil, then sun, then wing. Whoever built this was very particular.",
				);
				spawnEnemy("snake", x + 2, z);
			}
			if (S.seals.length === 3) {
				S.flags.templeSolved = true;
				S.revision++;
				say(
					"EXPLORER",
					"A door that opens without an explosion. How civilized.",
				);
				saveCheckpoint();
			}
		},
		{ can: () => !S.flags.templeSolved },
	);
	S.dynamic.push({ kind: "seal", mesh: emblem, index });
}
function buildTemple() {
	ground(0, 0, 38, 28, "sand");
	floorDecor();
	boundRoom(38, 28);
	for (let x of [-15, -7, 7, 15]) for (let z of [-9, 4]) pillar(x, z, 6.4);
	for (let x of [-18, 18])
		for (let z = -10; z < 13; z += 4) box(x, 1.6, z, 1, 3.2, 3.5, "rockDark");
	box(0, 0.025, 0, 4, 0.05, 22, "rockDark", level, false);
	for (let z = -10; z < 10; z += 1.3)
		box(0, 0.06, z, 3.7, 0.05, 0.9, "sandLight", level, false);
	box(0, 4, -13, 36, 8, 1.2, "rock");
	box(0, 6.6, -12.35, 15, 1.8, 0.2, "deep");
	sign("COIL   →   SUN   →   WING", 0, 6.6, -12.1, 1.65, "#f5d388");
	doorway(0, -11.8, "THE SUN ATLAS");
	sealPlinth(-10, -1, 0, "∿");
	sealPlinth(0, -5, 1, "☀");
	sealPlinth(10, -1, 2, "⌁");
	const staff = addInteract(
		0,
		-8,
		"Take the sun staff",
		() => {
			S.flags.staff = true;
			audio.fx("chime");
			toast("SUN STAFF RECOVERED");
			say("EXPLORER", "The world’s most elaborate reading lamp.");
			saveCheckpoint();
		},
		{ can: () => S.flags.templeSolved && !S.flags.staff },
	);
	const staffmesh = new THREE.Group();
	level.add(staffmesh);
	staffmesh.position.set(0, 1, -8);
	cylinder(0, 0.8, 0, 0.08, 1.7, "gold", staffmesh, 8);
	torus(0, 1.85, 0, 0.36, 0.08, "gold", staffmesh);
	ball(0, 1.85, 0, 0.2, "blue", staffmesh);
	S.dynamic.push({ kind: "staff", mesh: staffmesh });
	chest(11, 8, "Open the expedition satchel", () => {
		if (S.flags.chute) {
			toast("Your parachute is packed. More or less.");
			return;
		}
		S.flags.chute = true;
		audio.fx("chime");
		toast("PARACHUTE FOUND · Canvas has never looked so reassuring.");
		saveCheckpoint();
	});
	addInteract(
		0,
		-10,
		"Descend to the Sun Atlas",
		() => {
			if (!S.flags.staff) {
				say(
					"FIELD NOTE",
					"The three seals guard a sun staff. Read the inscription above the door.",
				);
				return;
			}
			if (!S.flags.chute) {
				say(
					"FIELD NOTE",
					"That satchel by the southern pillar looks useful. Take the parachute.",
				);
				return;
			}
			advanceStage(2);
		},
		{ radius: 2 },
	);
	for (const p of [
		[-11, 3],
		[10, 3],
		[-5, -7],
		[5, -8],
	])
		spawnEnemy("snake", ...p);
	for (const p of [
		[-16, 0],
		[16, -6],
	])
		spawnEnemy("thief", ...p);
	for (let z of [5, -3]) {
		ring(0, z, 1.9, "red");
		S.dynamic.push({
			kind: "trap",
			x: -17,
			z,
			timer: 2 + worldRng() * 2,
			period: 4.4,
		});
		box(-17, 0.7, z, 1, 1, 1, "deep");
	}
	brazier(-11, -10);
	brazier(11, -10);
	pot(-12, 9, 1.2);
	pot(14, -5, 0.8);
	for (let i = 0; i < 8; i++) coin(-13 + i * 3.7, 11);
}
const mirrorTargets = [0, 1, 2];
const compassWords = ["NORTH", "EAST", "SOUTH", "WEST"];
let beamGroup,
	mirrorVisuals = [];
function mirrorPlinth(x, z, index) {
	cylinder(x, 0.45, z, 1.1, 0.9, "rockDark", level, 8);
	cylinder(x, 0.95, z, 1, 0.15, "gold", level, 8);
	const dial = new THREE.Group();
	level.add(dial);
	dial.position.set(x, 1.2, z);
	const mirror = box(0, 1, 0, 1.3, 1.8, 0.17, "blue", dial);
	mirror.rotation.x = -0.22;
	box(0, 1, 0, 1.55, 2.1, 0.08, "gold", dial);
	box(0, 1, 0.12, 1.28, 1.75, 0.07, "blue", dial);
	const arrow = mesh(
		new THREE.ConeGeometry(0.18, 0.6, 3),
		"gold",
		0,
		-0.1,
		0.85,
		dial,
	);
	arrow.rotation.x = PI / 2;
	mirrorVisuals[index] = dial;
	addInteract(
		x,
		z,
		() =>
			["I", "II", "III"][index] +
			" · " +
			compassWords[S.mirrors[index]] +
			" · rotate",
		() => {
			S.mirrors[index] = (S.mirrors[index] + 1) % 4;
			audio.fx("rotate");
			checkAtlas();
		},
		{ radius: 3.2 },
	);
	sign(["I / NORTH", "II / EAST", "III / SOUTH"][index], x, 4, z, 1, "#f0d697");
}
function checkAtlas() {
	if (
		S.flags.staffPlaced &&
		S.mirrors.every((v, i) => v === mirrorTargets[i]) &&
		!S.flags.mapped
	) {
		S.flags.mapped = true;
		audio.fx("chime");
		S.revision++;
		toast("THE LOST MAP REVEALS THE " + glyphNames[S.target] + " MESA");
		say(
			"EXPLORER",
			"The " +
				glyphNames[S.target].toLowerCase() +
				" mesa. Naturally, it’s the one with the appalling drop.",
		);
		saveCheckpoint();
	}
	updateBeams();
}
function updateBeams() {
	if (!beamGroup) return;
	while (beamGroup.children.length) {
		const child = beamGroup.children[0];
		child.geometry?.dispose();
		beamGroup.remove(child);
	}
	const path = [
		[-16, 3, -7],
		[-9, 2, -3],
		[2, 2, -5],
		[10, 2, 3],
		[0, 1.8, 0],
	];
	if (!S.flags.staffPlaced) return;
	let through = true;
	for (let i = 0; i < 4; i++) {
		if (!through) break;
		const a = vec(...path[i]),
			b = vec(...path[i + 1]);
		const g = new THREE.CylinderGeometry(0.055, 0.055, a.distanceTo(b), 8),
			m = new THREE.MeshBasicMaterial({ color: 0xffd078 });
		const beam = mesh(
			g,
			m,
			...a.clone().add(b).multiplyScalar(0.5).toArray(),
			beamGroup,
		);
		beam.quaternion.setFromUnitVectors(vec(0, 1, 0), b.sub(a).normalize());
		beam.castShadow = false;
		if (i < 3) through = S.mirrors[i] === mirrorTargets[i];
	}
}
function buildAtlas() {
	ground(0, 0, 38, 28, "deep");
	boundRoom(38, 28);
	floorDecor(36, 25, "teal");
	for (let x of [-16, 16])
		for (let z of [-9, -2, 6]) pillar(x, z, 6.7, "rockDark");
	for (let i = 0; i < 3; i++) {
		const r = ring(0, 0, 3.2 + i * 0.35, "gold");
		r.material.opacity = 0.5;
	}
	cylinder(0, 0.45, 0, 3, 0.9, "rockDark", level, 12);
	cylinder(0, 0.96, 0, 2.8, 0.12, "sand", level, 12);
	for (let i = 0; i < 3; i++) {
		const x = (i - 1) * 1.5,
			m = cylinder(
				x,
				1.4,
				-0.3,
				0.5,
				0.8,
				i === S.target && S.flags.mapped ? "gold" : "rock",
				level,
				5 + i,
				0.35,
			);
		S.dynamic.push({ kind: "mapMesa", mesh: m, index: i });
		sign(glyphNames[i], x, 2.4, -0.3, 0.39, "#ead49e");
	}
	const staffModel = new THREE.Group();
	staffModel.position.set(0, 1.2, 1);
	level.add(staffModel);
	cylinder(0, 1, 0, 0.08, 2, "gold", staffModel);
	torus(0, 2.12, 0, 0.34, 0.06, "gold", staffModel);
	ball(0, 2.12, 0, 0.16, "blue", staffModel);
	S.dynamic.push({ kind: "placedStaff", mesh: staffModel });
	addInteract(
		0,
		2.5,
		() => (S.flags.staffPlaced ? "Read the atlas" : "Place the sun staff"),
		() => {
			if (!S.flags.staffPlaced) {
				S.flags.staffPlaced = true;
				audio.fx("chime");
				say(
					"FIELD NOTE",
					"The plinths name their headings. Turn each mirror to its inscription.",
				);
				checkAtlas();
			} else if (S.flags.mapped)
				say(
					"FIELD NOTE",
					"The " +
						glyphNames[S.target] +
						" mesa holds the Well. Use the ankh gateway to travel there.",
				);
			else
				say(
					"FIELD NOTE",
					"I faces NORTH. II faces EAST. III faces SOUTH. Align the three mirrors.",
				);
		},
		{ radius: 3.3 },
	);
	mirrorVisuals = [];
	mirrorPlinth(-9, -3, 0);
	mirrorPlinth(2, -5, 1);
	mirrorPlinth(10, 3, 2);
	box(0, 5.7, -12.8, 24, 3.2, 0.6, "rockDark");
	sign("FOLLOW THE SUN. TRUST THE STONE.", 0, 6, -12.2, 1.45, "#eec98b");
	brazier(-13, -9);
	brazier(13, -9);
	brazier(-13, 9);
	brazier(13, 9);
	const ankh = new THREE.Group();
	ankh.position.set(-11, 2, 8);
	level.add(ankh);
	torus(0, 1.3, 0, 0.65, 0.16, "gold", ankh);
	box(0, 0.1, 0, 0.26, 1.7, 0.26, "gold", ankh);
	box(0, 0.5, 0, 1.4, 0.24, 0.24, "gold", ankh);
	ring(-11, 8, 2, "gold");
	addInteract(
		-11,
		8,
		"Invoke the ankh gateway",
		() => {
			if (!S.flags.mapped) {
				say(
					"FIELD NOTE",
					"The gateway needs a destination. Let the sun finish its work.",
				);
				return;
			}
			advanceStage(3);
		},
		{ radius: 3 },
	);
	beamGroup = new THREE.Group();
	level.add(beamGroup);
	updateBeams();
}
function mesa(x, z, rx, rz, height = 17, shape = 7) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	level.add(g);
	for (let j = 0; j < 5; j++) {
		const h = height / 5,
			top = j === 4;
		const m = cylinder(
			0,
			-height + (j + 0.5) * h,
			0,
			1,
			h + 0.05,
			top ? "sand" : j % 2 ? "rockDark" : "rock",
			g,
			shape,
			0.92,
		);
		m.scale.set(rx * (1 + (4 - j) * 0.035), 1, rz * (1 + (4 - j) * 0.035));
	}
	fixedBox(x, -0.4, z, rx * 1.65, 0.8, rz * 1.65, "sand", false);
	for (let j = 0; j < 8; j++) {
		const a = (j / 8) * TAU;
		line(
			[
				[Math.cos(a) * rx * 0.9, -0.02, Math.sin(a) * rz * 0.9],
				[Math.cos(a) * rx * 0.95, -4, Math.sin(a) * rz * 0.95],
			],
			0x744d38,
			g,
		);
	}
	return g;
}
function swingAnchor(x, z, to, label) {
	const anchor = new THREE.Group();
	anchor.position.set(x, 0, z);
	level.add(anchor);
	box(0, 2.5, 0, 0.25, 5, 0.25, "brown", anchor);
	box(0.8, 4.5, 0, 2, 0.2, 0.2, "brown", anchor);
	torus(1.5, 4.1, 0, 0.28, 0.09, "gold", anchor);
	addInteract(
		x,
		z,
		label,
		(p) => beginSwing(p, to, { x: x + 1.5, y: 4.1, z }),
		{ radius: 3.5 },
	);
}
function buildMesas() {
	mesa(-14, 7, 5.6, 5, 19, 7);
	mesa(-3, 0, 4.7, 4.4, 17, 6);
	mesa(6, -8, 4.6, 4, 20, 7);
	mesa(13, 4, 5, 5, 18, 8);
	palm(-16, 7, 0.8);
	rubble(-14, 10, 0.7);
	pot(-16, 4, 0.7);
	brazier(-12, 8);
	swingAnchor(-10, 5, [-3, 0, 1], "Whip across to the Ibis Mesa");
	swingAnchor(-5, 2, [-13, 0, 7], "Whip back to the trailhead");
	swingAnchor(-1, -2, [6, 0, -7], "Swing to the Cobra Mesa");
	swingAnchor(4, -6, [-3, 0, 0], "Swing back to the Ibis Mesa");
	swingAnchor(8, -6, [13, 0, 4], "Swing to the Scarab Mesa");
	swingAnchor(10, 2, [6, 0, -7], "Swing back to the Cobra Mesa");
	const positions = [
		[-3, 0],
		[6, -8],
		[13, 4],
	];
	positions.forEach(([x, z], i) => {
		sign(glyphNames[i], x, 4.5, z - 1, 0.95, "#ffe3a2");
		ring(x, z + 1.3, 1.1, i === S.target ? "gold" : "teal");
		addInteract(
			x,
			z + 1.5,
			"Parachute into the " + glyphNames[i] + " mesa",
			(p) => {
				S.selectedMesa = i;
				S.flags.parachuteOpen = false;
				advanceStage(4);
			},
			{ radius: 2.2, color: i === S.target ? "gold" : "blue" },
		);
		if (i === S.target)
			sign("✥  THE WELL IS HERE", x, 5.8, z - 1, 0.8, "#ffdd84");
	});
	for (let i = 0; i < 3; i++) {
		coin(-3 + i * 0.75, 0, 1);
		coin(12 + i * 0.7, 5.5, 1);
	}
	// A passing bird writes a small circle above the canyon.
	const bird = new THREE.Group();
	level.add(bird);
	box(-0.3, 0, 0, 0.8, 0.05, 0.24, "brown", bird);
	box(0.3, 0, 0, 0.8, 0.05, 0.24, "brown", bird);
	S.dynamic.push({ kind: "bird", mesh: bird });
}
function buildDescent() {
	// The cliff is open toward the camera; the landing ledge is visible below.
	for (let i = 0; i < 5; i++) {
		box(-17, 4 + i * 6, -1, 5, 5.9, 28, i % 2 ? "rock" : "rockDark");
		box(17, -15 + i * 3, -1, 5, 2.95, 28, i % 2 ? "rock" : "rockDark");
	}
	mesa(7, -5, 5.5, 5, 15, 7);
	doorway(7, -7, "THE WELL OF WHISPERS");
	ring(7, -4.2, 3.3, "gold", 0.08);
	sign("LAND HERE", 7, 2, -5, 1.1, "#f8d590");
	// Rings reward steering rather than perfect timing.
	[
		[-3, 16, 4],
		[2, 10, 0],
		[7, 5, -4],
	].forEach(([x, y, z], i) => {
		const m = torus(x, y, z, 1.5, 0.1, "gold");
		m.rotation.x = -0.4;
		S.pickups.push({
			kind: "airring",
			x,
			y,
			z,
			mesh: m,
			active: true,
			value: 2,
		});
	});
	for (let i = 0; i < 6; i++) {
		const z = -9 + i * 3.8;
		rubble(-12, z, 1, "rock");
		rubble(12, z, 0.8, "rock");
	}
	sign("✥", 7, 20, -9, 3.5, "#eac17b");
}
function digSite(x, z, index) {
	const g = new THREE.Group();
	g.position.set(x, 0.15, z);
	level.add(g);
	const pile = mesh(new THREE.ConeGeometry(1.8, 0.6, 9), "sand", 0, 0, 0, g);
	ring(x, z, 2.1, index === S.target ? "gold" : "teal");
	sign(glyphNames[index], x, 1.6, z, 1.05);
	addInteract(
		x,
		z,
		"Excavate the " + glyphNames[index] + " seal",
		(p) => {
			if (!S.flags.shovel) {
				say(
					"FIELD NOTE",
					"Nadia has the shovel. The sand appears unwilling to move itself.",
				);
				return;
			}
			p.dig = 0.75;
			animateActor(p, "dig");
			audio.fx("rotate");
			if (index !== S.target) {
				if (!S.flags["dug" + index]) {
					S.flags["dug" + index] = true;
					S.coins += 2;
					spawnEnemy("snake", x + 2, z);
					say("EXPLORER", "Two coins and a snake. A very small inheritance.");
				} else
					say(
						"FIELD NOTE",
						"The Sun Atlas marked the " + glyphNames[S.target] + " seal.",
					);
				return;
			}
			if (S.flags.bossDefeated) {
				takeRelic();
				return;
			}
			if (!S.flags.bossAwake) {
				S.flags.bossAwake = true;
				S.flags.excavated = true;
				pile.visible = false;
				spawnEnemy("boss", 0, -7);
				say(
					"CAPTAIN VOSS",
					"Splendid digging, professor. I’ll take it from here.",
				);
				audio.fx("slam");
				toast("VOSS · Dodge the slam. Whip when his guard drops.");
			} else say("EXPLORER", "One excavation. One unwanted colleague.");
		},
		{ can: () => !S.flags.relic, radius: 3 },
	);
}
function buildWell() {
	ground(0, 0, 38, 28, "deep");
	boundRoom(38, 28);
	floorDecor(35, 25, "rockDark");
	for (let x of [-16, -10, 10, 16])
		for (let z of [-10, 4]) pillar(x, z, 7, "rockDark");
	box(0, 4.5, -13, 35, 9, 1, "rockDark");
	box(0, 4.5, -12.4, 15, 6, 0.2, "deep");
	sign(
		"WHAT THE SUN HIDES, THE EARTH REMEMBERS.",
		0,
		7.2,
		-12,
		1.45,
		"#edc786",
	);
	for (let i = 0; i < 3; i++) digSite(-8 + i * 8, -2, i);
	for (let x of [-12, 12]) for (let z of [-8, 9]) brazier(x, z);
	for (let i = 0; i < 4; i++) spawnEnemy("snake", -10 + i * 7, 6);
	const relic = new THREE.Group();
	relic.position.set(0, 1, -7);
	level.add(relic);
	cylinder(0, -0.4, 0, 2, 0.7, "rockDark", relic, 12);
	box(0, 0.4, 0, 2.4, 0.95, 1.2, "gold", relic);
	box(0, 1, 0, 2.6, 0.2, 1.4, "cream", relic);
	for (let side of [-1, 1]) {
		const wing = box(side * 0.85, 1.45, 0, 0.15, 0.8, 0.7, "gold", relic);
		wing.rotation.z = -side * 0.65;
		ball(side * 0.5, 1.3, 0, 0.15, "gold", relic);
		torus(side * 1.1, 0.5, 0.65, 0.19, 0.05, "gold", relic);
	}
	S.dynamic.push({ kind: "relic", mesh: relic });
	addInteract(
		0,
		-6,
		"Take the golden reliquary",
		() => {
			if (S.flags.bossDefeated) takeRelic();
			else
				say(
					"FIELD NOTE",
					"The reliquary is under the seal named by the atlas.",
				);
		},
		{ can: () => S.flags.bossDefeated && !S.flags.relic, radius: 3 },
	);
	if (S.flags.bossAwake && !S.flags.bossDefeated) spawnEnemy("boss", 0, -7);
}
function buildEscape() {
	ground(0, -8, 14, 56, "sand");
	boundRoom(14, 58);
	for (let z = -32; z <= 18; z += 5) {
		for (let side of [-1, 1]) {
			box(side * 8, 2, z, 2, 4, 4.9, "rockDark");
			pillar(side * 6.5, z, 5.5, "rock");
		}
		if (z % 2 === 0) {
			box(0, 5.4, z, 14, 0.5, 1.6, "rock");
		}
	}
	for (let i = 0; i < 4; i++) {
		const z = 3 - i * 8,
			side = i % 2 ? -1 : 1;
		fixedBox(side * 3.3, 0.7, z, 3.5, 1.4, 2.2, "rock");
		rubble(side * 4, z - 1.2, 0.6, "rockDark");
		for (let j = 0; j < 3; j++) coin(-side * 3, z + j * 0.8, 1);
		S.dynamic.push({
			kind: "trap",
			x: -6,
			z: z - 3,
			timer: 1.6 + i * 0.3,
			period: 3.7,
		});
	}
	const boulder = mesh(
		new THREE.IcosahedronGeometry(3, 1),
		"rock",
		0,
		3,
		20,
		level,
		true,
	);
	S.dynamic.push({ kind: "boulder", mesh: boulder });
	S.escape = 20;
	biplane(0, -34);
	sign("DAYLIGHT  ↑", 0, 7, -31, 2, "#ffdf93");
	addInteract(0, -28, "Get aboard. Keep the hat.", () => winGame(), {
		radius: 4,
	});
	for (let i = 0; i < 6; i++) coin((i % 2 ? 1 : -1) * 2, -20 - i * 0.9);
	S.dynamic.push({ kind: "collapse", timer: 2.5 });
}
function buildStage(index, spawn = true) {
	S.stage = index;
	S.revision++;
	S.sceneSerial++;
	disposeLevel();
	world = new RAPIER.World({ x: 0, y: -tune.gravity, z: 0 });
	world.timestep = 1 / 60;
	level = new THREE.Group();
	scene.add(level);
	playerRoot = new THREE.Group();
	scene.add(playerRoot);
	S.enemies = [];
	S.pickups = [];
	S.interacts = [];
	S.projectiles = [];
	S.effects = [];
	S.dynamic = [];
	beamGroup = null;
	mirrorVisuals = [];
	nearest = null;
	hovered = null;
	landscape(stageData[index].palette);
	[
		buildBazaar,
		buildTemple,
		buildAtlas,
		buildMesas,
		buildDescent,
		buildWell,
		buildEscape,
	][index]();
	for (let i = 0; i < S.players.length; i++) {
		const p = S.players[i];
		p.visual = makeExplorer(p.color);
		playerRoot.add(p.visual.mesh);
		const start = stageData[index].start;
		p.pos = { x: start[0] + i * 0.75, y: start[1], z: start[2] + i * 0.35 };
		p.vy = 0;
		p.gliding = false;
		p.swing = null;
		p.roll = 0;
		p.invuln = 2;
		p.attackCd = 0;
		p.toolCd = 0;
		p.flute = 0;
		p.face = PI;
		p.floor = true;
		p.body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				p.pos.x,
				p.pos.y + 0.92,
				p.pos.z,
			),
		);
		p.collider = world.createCollider(
			RAPIER.ColliderDesc.capsule(0.52, 0.36),
			p.body,
		);
		p.controller = world.createCharacterController(0.035);
		p.controller.enableAutostep(0.3, 0.2, true);
		p.controller.enableSnapToGround(0.2);
		p.visual.mesh.position.copy(p.pos);
		p.checkpoint = { ...p.pos };
		p.lastInput = S.time;
	}
	world.step();
	cameraTarget.set(0, index === 4 ? 12 : 0, index === 6 ? -4 : 0);
	cameraLook.copy(cameraTarget);
	if (colliderDebug) {
		scene.remove(colliderDebug);
		colliderDebug.geometry.dispose();
		colliderDebug = null;
	}
	if (spawn && S.mode === "playing") {
		showStageCard(index);
		if (!S.attract) saveCheckpoint();
		if (index === 0)
			say(
				"EXPLORER",
				"The map is missing. The market is open. I’ve worked with less.",
			);
		if (index === 1)
			say(
				"FIELD NOTE",
				"The wall gives the seal order: COIL, SUN, WING. The flute buys you time.",
			);
		if (index === 3)
			say(
				"FIELD NOTE",
				"Find the " +
					glyphNames[S.target] +
					" mesa. Interact at a gold hook to swing across.",
			);
		if (index === 4)
			say(
				"FIELD NOTE",
				"Open the parachute, steer toward the gold landing circle, and try to look confident.",
			);
		if (index === 6)
			say("EXPLORER", "Of course there’s a boulder. There’s always a boulder.");
	}
	logEvent("stage", { index });
}
function advanceStage(index) {
	if (!hostAuthority() || S.won) return;
	buildStage(index);
	netTimer = 1;
	audio.fx("chime");
}

let enemySerial = 0;
function spawnEnemy(kind, x, z, id = null) {
	const e = {
		id: id === null ? ++enemySerial : id,
		kind,
		pos: { x, y: 0, z },
		home: { x, z },
		hp: kind === "boss" ? 8 : kind === "thief" ? 2 : 1,
		state: "patrol",
		timer: 0.6 + worldRng(),
		phase: worldRng() * TAU,
		hit: 0,
		charmed: 0,
		dead: false,
	};
	if (kind === "snake") {
		e.visual = makeSnake(x, z);
		e.mesh = e.visual.mesh;
	} else {
		e.visual = makeExplorer(kind === "boss" ? "#cfb66e" : "#65827c", true);
		e.mesh = e.visual.mesh;
		level.add(e.mesh);
		e.mesh.position.set(x, 0, z);
		if (kind === "boss") e.mesh.scale.setScalar(1.7);
	}
	e.body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			x,
			kind === "boss" ? 1.5 : 0.8,
			z,
		),
	);
	e.collider = world.createCollider(
		RAPIER.ColliderDesc.ball(kind === "boss" ? 0.85 : 0.5).setSensor(true),
		e.body,
	);
	if (kind === "boss") {
		e.danger = ring(x, z, 4, "red");
		e.danger.visible = false;
		sign("CAPTAIN VOSS", 0, 3.6, 0, 1, "#f4cd8a", e.mesh);
	}
	S.enemies.push(e);
	return e;
}
function particleBurst(x, y, z, color = "gold", count = 9, physical = false) {
	for (let i = 0; i < count; i++) {
		const size = 0.07 + Math.random() * 0.14,
			m = mesh(new THREE.BoxGeometry(size, size, size), color, x, y, z);
		const e = {
			kind: physical ? "debris" : "spark",
			mesh: m,
			life: 0.5 + Math.random() * 0.6,
			max: 1,
			velocity: vec(
				(Math.random() - 0.5) * 7,
				2 + Math.random() * 5,
				(Math.random() - 0.5) * 7,
			),
		};
		if (physical) {
			e.body = world.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic()
					.setTranslation(x, y, z)
					.setLinvel(e.velocity.x, e.velocity.y, e.velocity.z)
					.setAngvel({ x: 2, y: 3, z: 1 }),
			);
			e.collider = world.createCollider(
				RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setRestitution(
					0.4,
				),
				e.body,
			);
		}
		S.effects.push(e);
	}
}
function hitEnemy(e, damage = 1) {
	if (e.dead || e.hit > 0) return;
	if (e.kind === "boss" && e.state !== "exposed") {
		audio.fx("rotate");
		particleBurst(e.pos.x, 1.5, e.pos.z, "gold", 4);
		toast("HIS GUARD IS UP · Dodge the slam, then strike.");
		return;
	}
	e.hp -= damage;
	e.hit = 0.2;
	particleBurst(
		e.pos.x,
		1,
		e.pos.z,
		e.kind === "snake" ? "green" : "gold",
		9,
		true,
	);
	audio.fx("hurt");
	shake = 0.16;
	if (e.hp <= 0) {
		e.dead = true;
		e.mesh.visible = false;
		if (e.danger) e.danger.visible = false;
		world.removeRigidBody(e.body);
		e.body = null;
		S.kills++;
		if (e.kind === "boss") {
			S.flags.bossDefeated = true;
			audio.fx("chime");
			say("CAPTAIN VOSS", "I shall be filing a strongly worded complaint.");
			toast("VOSS DEFEATED · Recover the reliquary");
			saveCheckpoint();
		} else {
			coin(e.pos.x, e.pos.z, e.kind === "thief" ? 2 : 1);
			if (e.kind === "thief" && Math.random() < 0.2)
				dropHeart(e.pos.x + 0.5, e.pos.z);
		}
		logEvent("enemy-defeated", { kind: e.kind });
	}
}
function dropHeart(x, z) {
	const m = ball(x, 0.9, z, 0.3, "red");
	S.pickups.push({ kind: "heart", x, y: 0.9, z, mesh: m, active: true });
}
function attack(p) {
	if (p.down > 0 || p.attackCd > 0 || p.swing || S.stage === 4) return false;
	p.attackCd = 0.44;
	metrics.attacks++;
	animateActor(p, "whip");
	audio.fx("whip");
	let aim = vec(Math.sin(p.face), 0, Math.cos(p.face));
	if (settings.assist && inputType !== "mouse") {
		const enemy = S.enemies
			.filter((e) => !e.dead && dist(e.pos, p.pos) < tune.reach + 0.5)
			.sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))[0];
		if (enemy) {
			p.face = Math.atan2(enemy.pos.x - p.pos.x, enemy.pos.z - p.pos.z);
			aim = vec(Math.sin(p.face), 0, Math.cos(p.face));
		}
	}
	const pts = [];
	for (let i = 0; i < 10; i++) {
		const t = i / 9;
		pts.push([
			p.pos.x +
				aim.x * t * tune.reach +
				Math.cos(p.face) * Math.sin(t * TAU) * 0.32,
			p.pos.y + 1.3 + Math.sin(t * PI) * 0.5,
			p.pos.z +
				aim.z * t * tune.reach -
				Math.sin(p.face) * Math.sin(t * TAU) * 0.32,
		]);
	}
	const whip = tube(pts, 0.028, "gold");
	S.effects.push({ kind: "lash", mesh: whip, life: 0.2, max: 0.2 });
	for (const e of S.enemies) {
		if (e.dead) continue;
		const d = dist(e.pos, p.pos),
			dot =
				((e.pos.x - p.pos.x) * aim.x + (e.pos.z - p.pos.z) * aim.z) / (d || 1);
		if (d < tune.reach + (e.kind === "boss" ? 0.6 : 0) && dot > -0.1)
			hitEnemy(e);
	}
	for (const pickup of S.pickups) {
		if (
			pickup.kind === "crate" &&
			pickup.active &&
			dist(pickup, p.pos) < tune.reach
		) {
			pickup.active = false;
			pickup.mesh.visible = false;
			particleBurst(pickup.x, 0.8, pickup.z, "brown", 12, true);
			coin(pickup.x, pickup.z, 2);
			logEvent("crate");
		}
	}
	return true;
}
function useTool(p) {
	if (p.down > 0) return false;
	if (S.stage === 4) {
		if (!S.flags.chute) {
			say(
				"EXPLORER",
				"I have forgotten something. Something rather parachute-shaped.",
			);
			return false;
		}
		if (!p.gliding) {
			p.gliding = true;
			p.vy = -1.8;
			p.visual.canopy.visible = true;
			metrics.glides++;
			audio.fx("chute");
			logEvent("chute-open");
			toast("STEER TOWARD THE GOLD CIRCLE");
		}
		return true;
	}
	if (!S.flags.flute) {
		say("FIELD NOTE", "Nadia sells a snake flute. A sound investment.");
		return false;
	}
	if (p.toolCd > 0) {
		toast("The flute needs a breath · " + Math.ceil(p.toolCd) + "s");
		return false;
	}
	p.toolCd = 8;
	p.flute = 6.5;
	animateActor(p, "flute");
	audio.fx("flute");
	logEvent("flute");
	for (const e of S.enemies) if (!e.dead && e.kind === "snake") e.charmed = 7;
	const m = ring(p.pos.x, p.pos.z, 1.2, "gold");
	S.effects.push({ kind: "wave", mesh: m, life: 1, max: 1 });
	say("EXPLORER", "Music appreciation. Finally, a subject we agree on.");
	return true;
}
function dodge(p, input) {
	if (p.down > 0 || p.rollCd > 0 || p.swing) return false;
	if (S.stage === 4) return useTool(p);
	p.roll = 0.42;
	p.rollCd = 0.85;
	p.invuln = Math.max(p.invuln, 0.48);
	metrics.rolls++;
	animateActor(p, "roll");
	audio.fx("roll");
	const move = inputWorld(input);
	if (move.lengthSq() < 0.1) move.set(Math.sin(p.face), 0, Math.cos(p.face));
	p.rollDir = move.normalize();
	logEvent("dodge");
	return true;
}
function inputWorld(input) {
	const x = input.x || 0,
		z = input.z || 0;
	return vec(x * 0.821 + z * 0.571, 0, -x * 0.571 + z * 0.821);
}
function beginSwing(p, to, anchor = null) {
	if (p.swing || p.down > 0) return;
	p.swing = {
		from: { ...p.pos },
		to: { x: to[0], y: to[1], z: to[2] },
		t: 0,
		duration: 1.8,
	};
	p.invuln = 2.2;
	metrics.swings++;
	audio.fx("whip");
	animateActor(p, "glide");
	const a = anchor
		? vec(anchor.x, anchor.y, anchor.z)
		: vec((p.pos.x + to[0]) / 2, 7, (p.pos.z + to[2]) / 2);
	const l = line(
		[[0, 1.5, 0], a.clone().sub(vec(p.pos.x, p.pos.y, p.pos.z))],
		0xf7d49c,
		p.visual.tether,
	);
	p.swing.rope = l;
	p.swing.anchor = a;
	logEvent("swing");
}
function damagePlayer(p, amount = 1, source = "hazard") {
	if (p.down > 0 || p.invuln > 0 || debug.god || S.attract) return false;
	amount *= tune.damage;
	if (amount <= 0) return false;
	p.hp = clamp(p.hp - amount, 0, 6);
	p.invuln = 1.2;
	metrics.damages++;
	audio.fx("hurt");
	shake = 0.35;
	if (p.id === localId) {
		flash = 0.8;
		toast(
			source === "snake"
				? "SNAKE BITE · The flute keeps them calm."
				: source === "dart"
					? "DART TRAP · Dodge through the volley."
					: "A scratch. Probably.",
		);
	}
	particleBurst(p.pos.x, 1, p.pos.z, "red", 7);
	logEvent("damage", { id: p.id, amount, source });
	if (p.hp <= 0) {
		p.down = S.players.length > 1 ? 9 : 2.4;
		p.roll = 0;
		S.deathCount++;
		say(
			"EXPLORER",
			S.players.length > 1
				? "A hand, please. Preferably attached to a colleague."
				: "Still have the hat. That’s the important part.",
		);
	}
	return true;
}
function respawn(p) {
	const st = p.checkpoint || {
		x: stageData[S.stage].start[0],
		y: stageData[S.stage].start[1],
		z: stageData[S.stage].start[2],
	};
	p.pos = { ...st };
	p.body.setTranslation({ x: st.x, y: st.y + 0.92, z: st.z }, true);
	p.hp = 6;
	p.down = 0;
	p.invuln = 3;
	p.vy = 0;
	p.gliding = false;
	if (S.stage === 6) S.escape = 20;
	if (S.stage === 4) {
		p.pos.y = 23;
		p.body.setTranslation({ x: p.pos.x, y: 23.92, z: p.pos.z }, true);
	}
	toast("HAT RECOVERED · Checkpoint restored");
	logEvent("respawn", { id: p.id });
}
function interact(p) {
	if (p.down > 0 || p.swing || interactCooldown > 0) return false;
	const fallen = S.players.find(
		(o) => o.id !== p.id && o.down > 0 && dist(o.pos, p.pos) < 3,
	);
	if (fallen) {
		fallen.down = 0;
		fallen.hp = 3;
		fallen.invuln = 3;
		audio.fx("chime");
		toast("PARTNER BACK ON THEIR FEET");
		return true;
	}
	const items = S.interacts.filter(
		(i) =>
			i.enabled &&
			(!i.can || i.can()) &&
			Math.abs((i.y || 0) - p.pos.y) < 2.5 &&
			dist(i, p.pos) < i.radius,
	);
	items.sort((a, b) => dist(a, p.pos) - dist(b, p.pos));
	const i = items.find((o) => o === hovered) || items[0];
	if (!i) return false;
	interactCooldown = 0.3;
	metrics.interactions++;
	audio.fx("click");
	i.action(p);
	logEvent("interact", {
		label: typeof i.label === "function" ? i.label() : i.label,
	});
	return true;
}
function takeRelic() {
	if (S.flags.relic) return;
	S.flags.relic = true;
	audio.fx("victory");
	particleBurst(0, 2, -7, "gold", 30);
	say("EXPLORER", "It belongs in a museum. We belong outside.");
	advanceStage(6);
}
function fireDart(x, z) {
	const m = mesh(new THREE.ConeGeometry(0.075, 0.7, 5), "gold", x, 0.9, z);
	m.rotation.z = -PI / 2;
	S.projectiles.push({ x, y: 0.9, z, vx: 14, vz: 0, life: 3, mesh: m });
	audio.noise(audio.ctx ? audio.ctx.currentTime : 0, 0.06, 0.07, 2500);
}
function updateEnemy(e, dt) {
	if (e.dead) return;
	e.hit = Math.max(0, e.hit - dt);
	e.charmed = Math.max(0, e.charmed - dt);
	e.phase += dt * 6;
	const targets = S.players.filter((p) => !p.down);
	if (!targets.length) return;
	const p = targets.reduce((a, b) =>
			dist(a.pos, e.pos) < dist(b.pos, e.pos) ? a : b,
		),
		d = dist(e.pos, p.pos);
	if (debug.freeze) return;
	if (e.kind === "boss") {
		e.danger.position.set(e.pos.x, 0.055, e.pos.z);
		e.danger.visible = e.state === "windup";
		if (e.state === "windup") {
			e.timer -= dt;
			e.danger.scale.setScalar(1 + Math.sin(e.timer * 18) * 0.03);
			if (e.timer <= 0) {
				for (const o of targets)
					if (dist(o.pos, e.pos) < 4.3) damagePlayer(o, 2, "slam");
				audio.fx("slam");
				shake = 0.65;
				e.state = "exposed";
				e.timer = 2.4;
				const m = ring(e.pos.x, e.pos.z, 1, "gold");
				S.effects.push({ kind: "wave", mesh: m, life: 0.7, max: 0.7 });
			}
		} else if (e.state === "exposed") {
			e.timer -= dt;
			if (e.timer <= 0) {
				e.state = "chase";
				e.timer = 1.8;
			}
		} else {
			const dx = (p.pos.x - e.pos.x) / (d || 1),
				dz = (p.pos.z - e.pos.z) / (d || 1);
			if (d > 2.8) {
				e.pos.x += dx * 1.8 * dt * tune.enemySpeed;
				e.pos.z += dz * 1.8 * dt * tune.enemySpeed;
			}
			e.timer -= dt;
			if (e.timer <= 0 && d < 6) {
				e.state = "windup";
				e.timer = 1.15;
			}
			e.mesh.rotation.y = Math.atan2(dx, dz);
		}
		e.mesh.position.set(e.pos.x, 0, e.pos.z);
		e.body?.setNextKinematicTranslation({ x: e.pos.x, y: 1.5, z: e.pos.z });
		animateActor({ visual: e.visual }, e.state === "chase" ? "walk" : "idle");
		return;
	}
	let speed = e.kind === "snake" ? 1.65 : 2.05;
	if (
		e.kind === "snake" &&
		(e.charmed > 0 || S.players.some((o) => o.flute > 0))
	) {
		e.state = "charmed";
		e.pos.x += Math.cos(e.phase * 0.22) * dt * 0.28;
		e.mesh.rotation.y += dt * 0.5;
	} else if (e.state === "windup") {
		e.timer -= dt;
		if (e.timer <= 0) {
			if (d < 1.8) {
				const hit = damagePlayer(p, 1, e.kind === "snake" ? "snake" : "thief");
				if (hit && e.kind === "thief" && S.coins > 0) {
					S.coins--;
					e.stolen = true;
					toast("PICKPOCKET · Whip the thief to recover your coins.");
				}
			}
			e.state = "recover";
			e.timer = 1.25;
		}
	} else if (e.state === "recover") {
		e.timer -= dt;
		if (e.timer <= 0) e.state = "chase";
	} else {
		let tx = p.pos.x,
			tz = p.pos.z;
		if (d > 10) {
			tx = e.home.x + Math.sin(S.time * 0.6 + e.phase * 0.05) * 2;
			tz = e.home.z + Math.cos(S.time * 0.4 + e.phase * 0.05) * 2;
			speed *= 0.4;
			e.state = "patrol";
		} else e.state = "chase";
		const dd = Math.hypot(tx - e.pos.x, tz - e.pos.z) || 1,
			dx = (tx - e.pos.x) / dd,
			dz = (tz - e.pos.z) / dd;
		if (d > 1.2) {
			e.pos.x += dx * speed * dt * tune.enemySpeed;
			e.pos.z += dz * speed * dt * tune.enemySpeed;
			e.mesh.rotation.y = Math.atan2(dx, dz);
		}
		if (d < 1.55) {
			e.state = "windup";
			e.timer = e.kind === "snake" ? 0.5 : 0.65;
		}
	}
	e.pos.x = clamp(e.pos.x, -17, 17);
	e.pos.z = clamp(e.pos.z, -11, 11);
	e.mesh.position.set(e.pos.x, 0, e.pos.z);
	e.mesh.visible = e.hit <= 0 || Math.sin(S.time * 60) > 0;
	e.body?.setNextKinematicTranslation({ x: e.pos.x, y: 0.8, z: e.pos.z });
	if (e.kind === "snake") {
		for (let i = 0; i < e.visual.segments.length; i++)
			e.visual.segments[i].position.x = Math.sin(e.phase - i * 0.5) * 0.16;
		e.mesh.scale.y = e.state === "windup" ? 1.6 : 1;
	} else
		animateActor(
			{ visual: e.visual },
			["chase", "patrol"].includes(e.state) ? "walk" : "idle",
		);
}
function stepPlayer(p, input, dt) {
	p.invuln = Math.max(0, (p.invuln || 0) - dt);
	p.attackCd = Math.max(0, (p.attackCd || 0) - dt);
	p.toolCd = Math.max(0, (p.toolCd || 0) - dt);
	p.dig = Math.max(0, (p.dig || 0) - dt);
	p.rollCd = Math.max(0, (p.rollCd || 0) - dt);
	p.flute = Math.max(0, (p.flute || 0) - dt);
	if (p.down > 0) {
		p.down -= dt;
		animateActor(p, "idle");
		if (p.down <= 0) respawn(p);
		return;
	}
	if (input.attack) attack(p);
	if (input.dodge) dodge(p, input);
	if (input.tool) useTool(p);
	if (input.interact) {
		const old = S.stage;
		interact(p);
		if (S.stage !== old) return;
	}
	if (p.swing) {
		const a = p.swing;
		a.t += dt;
		const t = clamp(a.t / a.duration, 0, 1),
			ease = t * t * (3 - 2 * t);
		p.pos.x = lerp(a.from.x, a.to.x, ease);
		p.pos.z = lerp(a.from.z, a.to.z, ease);
		p.pos.y = lerp(a.from.y, a.to.y, ease) + Math.sin(t * PI) * 4;
		p.face = Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z);
		const l = a.rope;
		if (l) {
			const arr = l.geometry.attributes.position.array;
			arr[0] = 0;
			arr[1] = 1.4;
			arr[2] = 0;
			const dx = a.anchor.x - p.pos.x,
				dz = a.anchor.z - p.pos.z;
			arr[3] = dx * Math.cos(p.face) - dz * Math.sin(p.face);
			arr[4] = a.anchor.y - p.pos.y;
			arr[5] = dx * Math.sin(p.face) + dz * Math.cos(p.face);
			l.geometry.attributes.position.needsUpdate = true;
		}
		p.body.setNextKinematicTranslation({
			x: p.pos.x,
			y: p.pos.y + 0.92,
			z: p.pos.z,
		});
		if (t >= 1) {
			p.pos.y = a.to.y;
			p.swing = null;
			p.vy = 0;
			p.checkpoint = { ...a.to };
			p.visual.tether.clear();
			audio.fx("roll");
		}
		return;
	}
	let move = inputWorld(input);
	if (move.length() > 1) move.normalize();
	if (input.aim && Number.isFinite(input.aim.x) && Number.isFinite(input.aim.z))
		p.face = Math.atan2(input.aim.x - p.pos.x, input.aim.z - p.pos.z);
	else if (move.lengthSq() > 0.05) p.face = Math.atan2(move.x, move.z);
	let speed = tune.speed;
	if (p.roll > 0) {
		p.roll -= dt;
		move = p.rollDir.clone();
		speed = 12;
	}
	if (S.stage === 4) {
		if (inputType === "touch" && !p.gliding) useTool(p);
		const wind = p.gliding ? Math.sin(S.time * 0.7) * 0.6 : 0;
		move.x += wind * 0.2;
		p.vy = p.gliding ? -1.9 : Math.max(-16, p.vy - tune.gravity * dt);
		if (p.pos.y < 5 && !p.gliding && settings.assist) {
			useTool(p);
			toast("PARACHUTE ASSIST · Steer to the gold circle");
		}
	} else p.vy = Math.max(-22, p.vy - tune.gravity * dt);
	if (debug.noclip) {
		p.pos.x += move.x * speed * dt;
		p.pos.z += move.z * speed * dt;
		p.pos.y = S.stage === 4 ? p.pos.y + p.vy * dt : 0;
		p.floor = true;
		p.body.setNextKinematicTranslation({
			x: p.pos.x,
			y: p.pos.y + 0.92,
			z: p.pos.z,
		});
	} else {
		p.controller.computeColliderMovement(
			p.collider,
			{ x: move.x * speed * dt, y: p.vy * dt, z: move.z * speed * dt },
			RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
			undefined,
			(c) =>
				!S.players.some((q) => q.collider && q.collider.handle === c.handle),
		);
		const m = p.controller.computedMovement();
		p.pos.x += m.x;
		p.pos.y += m.y;
		p.pos.z += m.z;
		p.floor = p.controller.computedGrounded();
		if (p.floor) p.vy = 0;
		p.body.setNextKinematicTranslation({
			x: p.pos.x,
			y: p.pos.y + 0.92,
			z: p.pos.z,
		});
	}
	if (p.pos.y < -10) {
		if (S.stage === 4) {
			p.hp = Math.max(1, p.hp - 1);
			respawn(p);
		} else {
			damagePlayer(p, 2, "fall");
			p.pos = { ...p.checkpoint };
			p.body.setTranslation(
				{ x: p.pos.x, y: p.pos.y + 0.92, z: p.pos.z },
				true,
			);
			p.vy = 0;
			toast("WHIP RECOVERY · Watch the edge.");
		}
	}
	if (S.stage === 4 && p.floor && p.pos.y < 1) {
		if (dist(p.pos, { x: 7, z: -5 }) < 5.2) {
			if (S.selectedMesa === S.target) {
				audio.fx("chime");
				advanceStage(5);
				return;
			} else {
				S.coins += 3;
				S.secrets++;
				advanceStage(3);
				say(
					"EXPLORER",
					"An empty tomb. Three coins. I shall call it research.",
				);
				return;
			}
		}
	}
	if (p.roll > 0) animateActor(p, "roll");
	else if (p.dig > 0) animateActor(p, "dig");
	else if (S.stage === 4 || p.swing) animateActor(p, "glide");
	else if (p.flute > 5.4) animateActor(p, "flute");
	else if (p.attackCd > 0.14) animateActor(p, "whip");
	else animateActor(p, move.lengthSq() > 0.04 ? "walk" : "idle");
	if (
		inputType === "touch" &&
		p.id === localId &&
		settings.assist &&
		S.stage !== 4
	) {
		const enemy = S.enemies.find(
			(e) => !e.dead && dist(e.pos, p.pos) < tune.reach - 0.3,
		);
		if (enemy) {
			if (enemy.kind === "snake" && S.flags.flute && p.toolCd <= 0) useTool(p);
			else attack(p);
		}
	}
}
function updatePickups(dt) {
	for (const item of S.pickups) {
		if (!item.active) {
			item.mesh.visible = false;
			continue;
		}
		if (item.kind === "crate") continue;
		if (item.kind === "coin" || item.kind === "heart") {
			item.mesh.position.y =
				(item.y || 0.8) + Math.sin(S.time * 3 + (item.phase || 0)) * 0.12;
			item.mesh.rotation.z += dt * 1.7;
		}
		for (const p of S.players) {
			if (p.down) continue;
			const match =
				item.kind === "airring"
					? Math.hypot(p.pos.x - item.x, p.pos.y - item.y, p.pos.z - item.z) <
						2.4
					: dist(p.pos, item) < 1.15 && Math.abs(p.pos.y - (item.y || 0)) < 1.8;
			if (match) {
				item.active = false;
				item.mesh.visible = false;
				if (item.kind === "heart") {
					p.hp = Math.min(6, p.hp + 2);
					audio.fx("chime");
					toast("A LITTLE SECOND WIND");
				} else {
					S.coins += item.value || 1;
					audio.fx("coin");
					if (item.kind === "airring") {
						S.secrets++;
						toast("GOLD RING · +2 coins");
					}
				}
				logEvent("pickup", { kind: item.kind });
				break;
			}
		}
	}
}
function stepWorld(dt) {
	if (!gameRunning() || hubEnded) return;
	const revision = S.revision;
	S.time += dt;
	S.elapsed += dt;
	interactCooldown = Math.max(0, interactCooldown - dt);
	const local = localPlayer();
	for (const p of S.players) {
		let input =
			p.id === localId ? latestInput : remoteInputs.get(p.id) || { x: 0, z: 0 };
		if (S.attract && p.id === localId) input = attractInput(dt);
		if (S.time - (p.lastInput || 0) > 0.5 && p.id !== localId)
			input = { x: 0, z: 0 };
		stepPlayer(p, input, dt);
		if (S.revision !== revision) return;
		if (p.id !== localId && remoteInputs.has(p.id)) {
			const inp = remoteInputs.get(p.id);
			inp.attack = false;
			inp.interact = false;
			inp.dodge = false;
			inp.tool = false;
		}
	}
	for (const e of S.enemies) updateEnemy(e, dt);
	updatePickups(dt);
	for (let i = S.projectiles.length - 1; i >= 0; i--) {
		const a = S.projectiles[i];
		a.x += a.vx * dt;
		a.z += a.vz * dt;
		a.life -= dt;
		a.mesh.position.set(a.x, a.y, a.z);
		for (const p of S.players)
			if (Math.hypot(a.x - p.pos.x, a.z - p.pos.z) < 0.6 && p.pos.y < 1.2) {
				damagePlayer(p, 1, "dart");
				a.life = 0;
			}
		if (a.x > 20 || a.life <= 0) {
			level.remove(a.mesh);
			a.mesh.geometry.dispose();
			S.projectiles.splice(i, 1);
		}
	}
	for (const d of S.dynamic) {
		if (d.kind === "trap" && !debug.freeze) {
			d.timer -= dt;
			if (d.timer <= 0) {
				for (let i = 0; i < 3; i++) fireDart(d.x, d.z + (i - 1) * 0.42);
				d.timer = d.period;
			}
		} else if (d.kind === "boulder") {
			S.escape -= 3.75 * dt;
			d.mesh.position.z = S.escape;
			d.mesh.rotation.x -= dt * 1.6;
			for (const p of S.players)
				if (
					Math.abs(p.pos.z - S.escape) < 3 &&
					Math.abs(p.pos.x) < 5 &&
					p.pos.y < 2
				) {
					damagePlayer(p, 3, "boulder");
					p.pos.z -= 4;
					p.body.setTranslation(
						{ x: p.pos.x, y: p.pos.y + 0.92, z: p.pos.z },
						true,
					);
				}
			const alive = S.players.filter((p) => p.down <= 0);
			if (
				alive.length &&
				S.escape < Math.min(...alive.map((p) => p.pos.z)) - 6
			) {
				S.escape = 20;
				for (const p of S.players) respawn(p);
			}
		} else if (d.kind === "collapse") {
			d.timer -= dt;
			if (d.timer <= 0) {
				const p = local || S.players[0];
				if (p) {
					particleBurst(p.pos.x + 4, 5, p.pos.z - 3, "rock", 6, true);
					if (Math.random() < 0.4) shake = 0.14;
				}
				d.timer = 2.3;
			}
		}
	}
	world.timestep = dt;
	world.step();
	metrics.physicsSteps++;
	latestInput.attack = false;
	latestInput.interact = false;
	latestInput.dodge = false;
	latestInput.tool = false;
}
function visuals(dt) {
	for (const p of S.players) {
		const v = p.visual;
		if (!v) continue;
		if (!hostAuthority() && p.netTarget) {
			p.pos.x = lerp(p.pos.x, p.netTarget.x, Math.min(1, dt * 18));
			p.pos.y = lerp(p.pos.y, p.netTarget.y, Math.min(1, dt * 18));
			p.pos.z = lerp(p.pos.z, p.netTarget.z, Math.min(1, dt * 18));
		}
		v.mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
		v.mesh.rotation.y = p.face;
		v.mesh.visible = p.invuln < 1 || Math.sin(S.time * 24) > -0.5 || p.down > 0;
		v.rig.rotation.z = p.down > 0 ? PI / 2 : 0;
		v.canopy.visible = p.gliding && S.stage === 4;
		v.shadow.visible = p.pos.y < 1;
		v.mixer.update(dt);
		v.actions.walk.timeScale = tune.speed / 5.2;
	}
	for (const e of S.enemies)
		if (!e.dead && e.kind !== "snake") e.visual.mixer.update(dt);
	for (const d of S.dynamic) {
		if (d.kind === "flame") {
			const scale = 0.85 + Math.sin(renderTime * 11 + d.phase) * 0.15;
			d.mesh.scale.set(
				scale,
				1 + Math.sin(renderTime * 9 + d.phase) * 0.18,
				scale,
			);
		} else if (d.kind === "marker") {
			d.mesh.visible = debug.waypoints && S.mode !== "title";
			d.mesh.position.y = d.base + Math.sin(renderTime * 2 + d.phase) * 0.15;
			d.mesh.rotation.y = renderTime;
		} else if (d.kind === "dust")
			d.mesh.position.x = Math.sin(renderTime * 0.05) * 3;
		else if (d.kind === "npc") {
			d.visual.mixer.update(dt);
			d.mesh.rotation.y = Math.sin(renderTime * 0.2) * 0.3 - 1;
		} else if (d.kind === "mapMesa") {
			const active = S.flags.mapped && S.target === d.index;
			d.mesh.material = mat(active ? "gold" : "rock");
			d.mesh.position.y = active ? 1.5 + Math.sin(renderTime * 2) * 0.1 : 1.4;
		} else if (d.kind === "staff")
			d.mesh.visible = S.flags.templeSolved && !S.flags.staff;
		else if (d.kind === "placedStaff") d.mesh.visible = !!S.flags.staffPlaced;
		else if (d.kind === "seal")
			d.mesh.material.opacity =
				S.seals.includes(d.index) || S.flags.templeSolved ? 1 : 0.65;
		else if (d.kind === "relic") {
			d.mesh.visible = !!S.flags.excavated && !S.flags.relic;
			d.mesh.rotation.y = Math.sin(renderTime * 0.3) * 0.05;
		} else if (d.kind === "bird") {
			d.mesh.position.set(
				Math.cos(renderTime * 0.4) * 13,
				9,
				Math.sin(renderTime * 0.4) * 10,
			);
			d.mesh.rotation.y = -renderTime * 0.4;
		} else if (d.kind === "plane") d.mixer.update(dt);
	}
	for (const i of S.interacts)
		if (i.marker)
			i.marker.visible =
				debug.waypoints &&
				S.mode !== "title" &&
				i.enabled &&
				(!i.can || i.can());
	for (let j = 0; j < mirrorVisuals.length; j++)
		mirrorVisuals[j].rotation.y = lerp(
			mirrorVisuals[j].rotation.y,
			(S.mirrors[j] * PI) / 2,
			Math.min(1, dt * 8),
		);
	for (let i = S.effects.length - 1; i >= 0; i--) {
		const e = S.effects[i];
		e.life -= dt;
		if (e.kind === "spark") {
			e.velocity.y -= 12 * dt;
			e.mesh.position.addScaledVector(e.velocity, dt);
			e.mesh.rotation.x += dt * 5;
			e.mesh.scale.setScalar(clamp(e.life * 2, 0, 1));
		}
		if (e.kind === "debris" && e.body) {
			const tr = e.body.translation(),
				rot = e.body.rotation();
			e.mesh.position.set(tr.x, tr.y, tr.z);
			e.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
		}
		if (e.kind === "wave") {
			e.mesh.scale.setScalar(1 + (1 - e.life / e.max) * 4);
			e.mesh.material.opacity = e.life / e.max;
		}
		if (e.life <= 0) {
			if (e.body) world.removeRigidBody(e.body);
			level.remove(e.mesh);
			e.mesh.geometry?.dispose();
			S.effects.splice(i, 1);
		}
	}
	if (debug.colliders && world) {
		const data = world.debugRender();
		if (!colliderDebug) {
			colliderDebug = new THREE.LineSegments(
				new THREE.BufferGeometry(),
				new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
			);
			colliderDebug.renderOrder = 99;
			scene.add(colliderDebug);
		}
		colliderDebug.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(data.vertices, 3),
		);
		colliderDebug.geometry.setAttribute(
			"color",
			new THREE.BufferAttribute(data.colors, 4),
		);
		colliderDebug.visible = true;
	} else if (colliderDebug) colliderDebug.visible = false;
}
function preparePlayer(id, name, color) {
	return {
		id,
		name,
		color: color || COLORS[id % 4],
		hp: 6,
		pos: { x: 0, y: 0, z: 0 },
		face: PI,
		invuln: 2,
		roll: 0,
		rollCd: 0,
		attackCd: 0,
		toolCd: 0,
		flute: 0,
		down: 0,
		lastInput: 0,
	};
}
function newRun(saved = null) {
	if (AIHub.active && hubEnded) return;
	const names = hubInfo
		? hubInfo.players
		: standalone
			? standalone.members
			: [{ id: 0, name: "PROFESSOR FINCH", color: COLORS[0] }];
	if (standalone && isHost) standalone.started = true;
	S.players = names.map((p) => preparePlayer(p.id, p.name, p.color));
	localId = hubInfo ? hubInfo.me : standalone ? standalone.me : 0;
	S.coins = 0;
	S.kills = 0;
	S.secrets = 0;
	S.time = 0;
	S.elapsed = 0;
	S.flags = {};
	S.mirrors = [2, 3, 0];
	S.seals = [];
	S.target = Math.floor(Math.random() * 3);
	S.selectedMesa = 0;
	S.deathCount = 0;
	S.won = false;
	S.mode = "playing";
	if (saved) {
		for (const k of [
			"coins",
			"kills",
			"secrets",
			"elapsed",
			"flags",
			"mirrors",
			"seals",
			"target",
			"selectedMesa",
			"deathCount",
		])
			if (saved[k] !== undefined) S[k] = saved[k];
	}
	menu = null;
	$("modal").classList.add("hidden");
	$("title-screen").classList.add("hidden");
	$("hud").classList.remove("hidden");
	audio.resume();
	buildStage(saved?.stage || 0);
	lastActivity = performance.now();
	logEvent("new-run");
}
function checkpointData() {
	return {
		stage: S.stage,
		coins: S.coins,
		kills: S.kills,
		secrets: S.secrets,
		elapsed: S.elapsed,
		flags: { ...S.flags },
		mirrors: [...S.mirrors],
		seals: [...S.seals],
		target: S.target,
		selectedMesa: S.selectedMesa,
		deathCount: S.deathCount,
	};
}
function saveCheckpoint() {
	if (S.attract || netActive || S.mode !== "playing") return;
	try {
		localStorage.setItem(
			"lost-map-checkpoint",
			JSON.stringify(checkpointData()),
		);
	} catch {}
}
function loadCheckpoint() {
	try {
		return JSON.parse(localStorage.getItem("lost-map-checkpoint") || "null");
	} catch {
		return null;
	}
}
function winGame() {
	if (S.won) return;
	S.won = true;
	S.mode = "victory";
	audio.fx("victory");
	logEvent("victory");
	if (!netActive) {
		try {
			localStorage.removeItem("lost-map-checkpoint");
		} catch {}
	}
	if (AIHub.active && AIHub.isHost) {
		finishHub(true);
	} else showVictory();
}
function makeSnapshot() {
	return {
		kind: "world",
		seq: ++netSequence,
		stage: S.stage,
		sceneSerial: S.sceneSerial,
		time: S.time,
		elapsed: S.elapsed,
		coins: S.coins,
		kills: S.kills,
		secrets: S.secrets,
		flags: S.flags,
		target: S.target,
		selectedMesa: S.selectedMesa,
		mirrors: S.mirrors,
		seals: S.seals,
		won: S.won,
		escape: S.escape,
		players: S.players.map((p) => ({
			id: p.id,
			name: p.name,
			color: p.color,
			x: +p.pos.x.toFixed(3),
			y: +p.pos.y.toFixed(3),
			z: +p.pos.z.toFixed(3),
			face: +p.face.toFixed(3),
			hp: p.hp,
			down: p.down,
			gliding: p.gliding,
			anim: p.visual?.anim || "idle",
			flute: p.flute,
			toolCd: p.toolCd,
		})),
		enemies: S.enemies
			.filter((e) => !e.dead)
			.map((e) => ({
				id: e.id,
				kind: e.kind,
				x: +e.pos.x.toFixed(2),
				z: +e.pos.z.toFixed(2),
				hp: e.hp,
				state: e.state,
			})),
		removed: S.pickups.map((p, i) => (p.active ? -1 : i)).filter((i) => i >= 0),
	};
}
function receiveSnapshot(d) {
	if (d.seq <= lastSnapshot) return;
	lastSnapshot = d.seq;
	metrics.snapshots++;
	const rosterChanged =
		d.players.length !== S.players.length ||
		d.players.some((q) => !S.players.some((p) => p.id === q.id));
	const change =
		rosterChanged ||
		S.remoteSceneSerial !== d.sceneSerial ||
		S.stage !== d.stage ||
		["title", "lobby", "loading"].includes(S.mode);
	for (const k of [
		"time",
		"elapsed",
		"coins",
		"kills",
		"secrets",
		"target",
		"selectedMesa",
		"escape",
	])
		S[k] = d[k];
	S.flags = { ...d.flags };
	S.mirrors = [...d.mirrors];
	S.seals = [...d.seals];
	S.won = d.won;
	const ids = d.players.map((p) => p.id);
	S.players = S.players.filter((p) => ids.includes(p.id));
	for (const q of d.players)
		if (!S.players.some((p) => p.id === q.id))
			S.players.push(preparePlayer(q.id, q.name, q.color));
	if (change) buildStage(d.stage, false);
	S.remoteSceneSerial = d.sceneSerial;
	for (const q of d.players) {
		const p = S.players.find((p) => p.id === q.id);
		p.netTarget = { x: q.x, y: q.y, z: q.z };
		if (change) p.pos = { ...p.netTarget };
		p.face = q.face;
		p.hp = q.hp;
		p.down = q.down;
		p.gliding = q.gliding;
		p.flute = q.flute;
		p.toolCd = q.toolCd;
		animateActor(p, q.anim);
	}
	const alive = d.enemies.map((e) => e.id);
	for (const e of S.enemies)
		if (!alive.includes(e.id)) {
			e.dead = true;
			e.mesh.visible = false;
			if (e.danger) e.danger.visible = false;
		}
	for (const q of d.enemies) {
		let e = S.enemies.find((e) => e.id === q.id && !e.dead);
		if (!e) e = spawnEnemy(q.kind, q.x, q.z, q.id);
		e.pos.x = q.x;
		e.pos.z = q.z;
		e.hp = q.hp;
		e.state = q.state;
		e.mesh.position.set(q.x, 0, q.z);
		e.mesh.visible = true;
	}
	for (const i of d.removed)
		if (S.pickups[i]) {
			S.pickups[i].active = false;
			S.pickups[i].mesh.visible = false;
		}
	updateBeams();
	S.mode = d.won ? "victory" : "playing";
	if (d.won && menu !== "victory" && !AIHub.active) showVictory();
}
function acceptInput(d, from) {
	if (!hostAuthority() || !d || d.kind !== "input") return;
	const p = S.players.find((p) => p.id === from);
	if (!p) return;
	if (d.seq !== undefined && d.seq <= (p.lastSeq || 0)) return;
	p.lastSeq = d.seq || 0;
	const old = remoteInputs.get(from) || {};
	const input = {
		x: clamp(Number(d.x) || 0, -1, 1),
		z: clamp(Number(d.z) || 0, -1, 1),
		aim:
			d.aim && Number.isFinite(d.aim.x) && Number.isFinite(d.aim.z)
				? { x: clamp(d.aim.x, -100, 100), z: clamp(d.aim.z, -100, 100) }
				: null,
	};
	for (const a of ["attack", "interact", "dodge", "tool"])
		input[a] = !!d[a] || !!old[a];
	remoteInputs.set(from, input);
	p.lastInput = S.time;
	metrics.inputs++;
}
function finishHub(won) {
	if (!AIHub.active || !AIHub.isHost || hubEnded) return;
	const ids = S.players.map((p) => p.id);
	const scores = {};
	for (const id of ids)
		scores[id] = Math.round(
			S.stage * 100 + S.coins + S.kills * 3 + (won ? 1000 : 0),
		);
	AIHub.finish({
		standings: [ids],
		scores,
		won,
		stats: Object.fromEntries(
			ids.map((id) => [
				id,
				{
					"Rooms explored": S.stage + 1,
					"Relics recovered": S.flags.relic ? 1 : 0,
					Coins: S.coins,
				},
			]),
		),
	});
}
function networkTick(dt) {
	if (
		!netActive ||
		hubEnded ||
		!["playing", "victory"].includes(S.mode) ||
		(standalone && !standalone.started && isHost)
	)
		return;
	netTimer += dt;
	if (netTimer < 0.1) return;
	netTimer = 0;
	if (hostAuthority()) {
		const d = makeSnapshot();
		if (AIHub.active) AIHub.send(d);
		else standalone?.send(d);
	} else {
		const d = { kind: "input", seq: ++inputSeq, ...latestInput };
		if (AIHub.active) AIHub.send(d, { to: AIHub.host });
		else standalone?.send(d);
		latestInput.attack = false;
		latestInput.interact = false;
		latestInput.dodge = false;
		latestInput.tool = false;
	}
}
function attractInput(dt) {
	S.attractClock += dt;
	const t = S.attractClock,
		p = localPlayer();
	if (!p) return { x: 0, z: 0 };
	// Each postcard uses real interactions and movement; transitions keep the reel broad.
	const routes = [
		[
			[-11, 2],
			[-4, 6],
			[4, 7],
			[9, 2.7],
			[0, -9.6],
		],
		[
			[11, 8],
			[-10, -1],
			[0, -5],
			[10, -1],
			[0, -8],
			[0, -10],
		],
		[
			[0, 2.5],
			[-9, -3],
			[-9, -3],
			[2, -5],
			[2, -5],
			[10, 3],
			[10, 3],
			[-11, 8],
		],
		[
			[-10, 5],
			[-1, -2],
			[8, -6],
			[13, 5.5],
		],
		[
			[-3, 4],
			[2, 0],
			[7, -4],
		],
		[
			[-8 + S.target * 8, -2],
			[0, -6],
		],
		[
			[-3, 4],
			[3, -5],
			[-3, -13],
			[3, -21],
			[0, -28],
		],
	];
	S.flags.flute = true;
	S.flags.shovel = true;
	S.flags.chute = true;
	if (S.stage > 1) S.flags.staff = true;
	if (S.stage === 0 && S.coins < 3) S.coins = 3;
	if (S.stage === 2) {
		S.flags.staffPlaced = true;
	}
	if (S.stage === 3) S.flags.mapped = true;
	if (S.stage === 4) {
		p.gliding = true;
		p.visual.canopy.visible = true;
	}
	if (S.stage === 5) {
		S.flags.excavated = true;
		S.flags.bossAwake = true;
	}
	const route = routes[S.stage],
		goal = route[Math.min(S.attractStep, route.length - 1)];
	const d = dist(p.pos, { x: goal[0], z: goal[1] });
	if (d < 1.1 && !p.swing) {
		if (S.stage === 1) {
			if (S.attractStep === 0) S.flags.chute = true;
			if (S.attractStep === 4) S.flags.staff = true;
		}
		const priorStage = S.stage;
		interactCooldown = 0;
		interact(p);
		if (S.stage !== priorStage) return { x: 0, z: 0 };
		S.attractStep++;
	}
	// Steering is converted to screen axes to take exactly the same path as input.
	let dx = goal[0] - p.pos.x,
		dz = goal[1] - p.pos.z,
		len = Math.hypot(dx, dz) || 1;
	dx /= len;
	dz /= len;
	const out = {
		x: dx * 0.821 - dz * 0.571,
		z: dx * 0.571 + dz * 0.821,
		attack: S.stage === 5 || Math.sin(t * 4) > 0.8,
		tool: !p.toolCd,
	};
	if (
		t > 15 ||
		(S.attractStep >= route.length && t > (S.stage === 5 ? 13 : 5))
	) {
		const next = (S.stage + 1) % 7;
		S.attractStep = 0;
		S.attractClock = 0;
		if (next === 0) {
			S.won = false;
			S.flags = {};
			S.mirrors = [2, 3, 0];
			S.seals = [];
			S.target = 2;
		}
		if (next === 1) S.flags.flute = true;
		if (next === 2) {
			S.flags.staff = true;
			S.flags.chute = true;
			S.flags.templeSolved = true;
		}
		if (next === 3) S.flags.mapped = true;
		if (next === 4) S.selectedMesa = S.target;
		if (next === 6) {
			S.flags.relic = true;
			S.flags.bossDefeated = true;
		}
		buildStage(next, false);
	}
	return out;
}
function startAttract() {
	if (netActive || S.attract) return;
	S.attract = true;
	S.attractClock = 0;
	S.attractStep = 0;
	newRun();
	S.target = 2;
	S.attract = true;
	$("attract-banner").classList.remove("hidden");
	$("context").classList.add("hidden");
	logEvent("attract-start");
}
function stopAttract() {
	if (!S.attract) return;
	S.attract = false;
	$("attract-banner").classList.add("hidden");
	returnTitle();
}

const menuTrail = [];
let creditsTab = "source",
	roomDigits = [0, 0, 0, 0, 0, 0],
	roomNotice = "",
	pendingRoom = null;
function glyph(action) {
	const pad = {
		interact: ["△", "Y"],
		attack: ["□", "X"],
		dodge: ["✕", "A"],
		tool: ["○", "B"],
		notes: ["L1", "LB"],
		pause: ["☰", "☰"],
		move: ["L", "L"],
	};
	const key = {
		interact: "E",
		attack: "LMB",
		dodge: "SPACE",
		tool: "F",
		notes: "Q",
		pause: "ESC",
		move: "WASD",
	};
	if (inputType === "controller")
		return (
			'<span class="glyph pad">' +
			(pad[action] || ["✕", "A"])[settings.glyphs === "Xbox" ? 1 : 0] +
			"</span>"
		);
	return '<span class="glyph">' + (key[action] || "ENTER") + "</span>";
}
function toast(text) {
	$("toast").textContent = text;
	$("toast").classList.remove("hidden");
	toastTimer = 3.3;
}
function say(name, text) {
	if (settings.subtitles) {
		$("speech").innerHTML = "<b>" + safeText(name) + "</b>" + safeText(text);
		$("speech").classList.remove("hidden");
		speechTimer = 5.5;
	}
	audio.say(text);
}
function showStageCard(i) {
	const c = $("stage-card");
	c.querySelector(".stage-number").textContent =
		"CHAPTER 0" + (i + 1) + " / THE SAFFRON EXPEDITION";
	c.querySelector("h2").textContent = stageData[i].name;
	c.querySelector("p").textContent = stageData[i].subtitle;
	c.style.opacity = 1;
	c.classList.remove("hidden");
	cardTimer = 3.5;
	if (S.attract) {
		S.attractClock = 0;
		S.attractStep = 0;
	}
}
function objectiveText() {
	switch (S.stage) {
		case 0:
			return S.flags.flute
				? "Enter the snake temple beyond the north gate."
				: S.coins >= 3
					? "Trade with Nadia for a flute and shovel."
					: "Find 3 coins. Watch the pickpockets.";
		case 1:
			return !S.flags.chute
				? "Recover the parachute from the eastern satchel."
				: !S.flags.templeSolved
					? "Wake the seals: " +
						["COIL", "SUN", "WING"].slice(S.seals.length).join(" → ")
					: !S.flags.staff
						? "Take the sun staff beside the north gate."
						: "Carry the staff into the Sun Atlas.";
		case 2:
			return !S.flags.staffPlaced
				? "Place the sun staff on the central atlas."
				: !S.flags.mapped
					? "Align the mirrors: I NORTH · II EAST · III SOUTH."
					: "The " + glyphNames[S.target] + " mesa. Invoke the ankh gateway.";
		case 3:
			return (
				"Swing to the " +
				glyphNames[S.target] +
				" mesa. Parachute into its tomb."
			);
		case 4:
			return (
				"Steer to the gold circle. " +
				Math.max(0, Math.round(localPlayer()?.pos.y || 0)) +
				" m to landing."
			);
		case 5:
			return S.flags.bossDefeated
				? "Recover the golden reliquary."
				: S.flags.bossAwake
					? "Dodge Voss’s slam. Whip while his guard is down."
					: "Excavate the " + glyphNames[S.target] + " seal with your shovel.";
		case 6:
			return "Run toward daylight. Get aboard the biplane.";
	}
}
function refreshHUD(dt) {
	const p = localPlayer();
	if (S.mode === "title" || S.mode === "loading") return;
	$("chapter-tag").textContent = "CHAPTER 0" + (S.stage + 1) + " / 07";
	$("chapter-title").textContent = stageData[S.stage].name;
	$("objective").textContent = objectiveText();
	$("coins").textContent = S.coins;
	const hp = p ? Math.ceil(p.hp) : 6;
	$("health").textContent = "♥".repeat(hp) + "♡".repeat(6 - hp);
	const kit = [
		["⌁", "WHIP", true],
		["♫", "FLUTE", S.flags.flute],
		["⚒", "SHOVEL", S.flags.shovel],
		["☀", "STAFF", S.flags.staff],
		["♧", "CHUTE", S.flags.chute],
		["✥", "RELIC", S.flags.relic],
	];
	const gearHTML = kit
		.map(
			([symbol, name, has]) =>
				'<div class="gear-slot ' +
				(has ? "" : "empty") +
				'" title="' +
				name +
				'">' +
				symbol +
				"<small>" +
				name +
				"</small></div>",
		)
		.join("");
	if ($("gear").innerHTML !== gearHTML) $("gear").innerHTML = gearHTML;
	$("hud-hints").innerHTML =
		'<span class="hint">' +
		glyph("attack") +
		'Whip</span><span class="hint">' +
		glyph("dodge") +
		'Evade</span><span class="hint">' +
		glyph("tool") +
		(S.stage === 4 ? "Chute" : "Flute") +
		'</span><span class="hint">' +
		glyph("notes") +
		'Notes</span><span class="hint">' +
		glyph("pause") +
		"Pause</span>";
	nearest = null;
	if (p && !p.down && !p.swing) {
		const valid = S.interacts.filter(
			(i) =>
				i.enabled &&
				(!i.can || i.can()) &&
				Math.abs((i.y || 0) - p.pos.y) < 2.5 &&
				dist(i, p.pos) < i.radius,
		);
		nearest = valid.sort((a, b) => dist(a, p.pos) - dist(b, p.pos))[0] || null;
		const fallen = S.players.find(
			(o) => o.id !== p.id && o.down > 0 && dist(o.pos, p.pos) < 3,
		);
		if (fallen) nearest = { label: "Help " + fallen.name + " back up" };
	}
	const contextVisible =
		nearest && menu === null && !S.attract && S.stage !== 4;
	$("context").classList.toggle("hidden", !contextVisible);
	if (contextVisible)
		$("context").innerHTML =
			(inputType === "touch" ? "" : glyph("interact")) +
			safeText(
				typeof nearest.label === "function" ? nearest.label() : nearest.label,
			);
	if (p && p.down > 0) {
		$("context").classList.remove("hidden");
		$("context").textContent = "HAT RECOVERY IN " + Math.ceil(p.down) + "…";
	}
	const boss = S.enemies.find((e) => e.kind === "boss" && !e.dead);
	$("boss-hud").classList.toggle("hidden", !boss || S.stage !== 5);
	if (boss) {
		$("boss-fill").style.width = clamp((boss.hp / 8) * 100, 0, 100) + "%";
		$("boss-state").textContent =
			boss.state === "exposed"
				? "GUARD DOWN · WHIP!"
				: boss.state === "windup"
					? "SLAM INCOMING · EVADE"
					: "CAPTAIN VOSS";
	}
	$("touch-menu").classList.toggle(
		"hidden",
		inputType !== "touch" || menu !== null,
	);
	if (netActive) {
		$("network-tag").classList.remove("hidden");
		$("network-tag").textContent =
			(AIHub.active ? "AI HUB CO-OP" : "ROOM " + (standalone?.code || "")) +
			" · " +
			S.players.length +
			" EXPLORER" +
			(S.players.length === 1 ? "" : "S");
	} else $("network-tag").classList.add("hidden");
	if (speechTimer > 0) {
		speechTimer -= dt;
		if (speechTimer <= 0) $("speech").classList.add("hidden");
	}
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").classList.add("hidden");
	}
	if (cardTimer > 0) {
		cardTimer -= dt;
		$("stage-card").style.opacity = Math.min(1, cardTimer);
		if (cardTimer <= 0) $("stage-card").classList.add("hidden");
	}
	flash = Math.max(0, flash - dt * 2);
	$("damage-flash").style.opacity = flash;
}
function menuButton(label, action, extra = "") {
	return (
		'<button class="menu-button" data-action="' +
		action +
		'" ' +
		extra +
		">" +
		label +
		"<span>→</span></button>"
	);
}
function paperButton(label, action, secondary = false, extra = "") {
	return (
		'<button class="paper-button ' +
		(secondary ? "secondary" : "") +
		'" data-action="' +
		action +
		'" ' +
		extra +
		">" +
		label +
		"</button>"
	);
}
function slider(label, key, min, max, step, value, dev = false) {
	return (
		'<label class="row"><span class="setting-label">' +
		label +
		'</span><input aria-label="' +
		label +
		'" type="range" min="' +
		min +
		'" max="' +
		max +
		'" step="' +
		step +
		'" value="' +
		value +
		'" data-slider="' +
		key +
		'" data-dev="' +
		dev +
		'"><span class="value" id="value-' +
		key +
		'">' +
		(max === 1 ? Math.round(value * 100) + "%" : value.toFixed(1)) +
		"</span></label>"
	);
}
function toggleRow(label, key, value, scope = "settings") {
	return (
		'<div class="row"><span class="setting-label">' +
		label +
		'</span><button data-action="toggle" data-scope="' +
		scope +
		'" data-key="' +
		key +
		'">' +
		(value ? "ON" : "OFF") +
		"</button></div>"
	);
}
function openMenu(kind) {
	if (hubEnded) return;
	if (AIHub.active && ["title", "coop"].includes(kind)) return;
	if (S.attract) {
		stopAttract();
		return;
	}
	if (menu !== kind) menuTrail.push(menu);
	menu = kind;
	renderMenu();
}
function closeMenu() {
	const target = menuTrail.length
		? menuTrail.pop()
		: S.mode === "title"
			? "title"
			: null;
	menu = target;
	if (menu === null) {
		$("modal").classList.add("hidden");
		lastActivity = performance.now();
	} else if (menu === "title") {
		$("modal").classList.add("hidden");
		$("title-screen").classList.remove("hidden");
	} else renderMenu();
}
function returnTitle() {
	if (AIHub.active) return;
	standalone?.close();
	standalone = null;
	netActive = false;
	isHost = true;
	localId = 0;
	remoteInputs.clear();
	menuTrail.length = 0;
	menu = "title";
	S.mode = "title";
	S.won = false;
	S.attract = false;
	S.flags = {
		flute: true,
		shovel: true,
		chute: true,
		mapped: true,
		staff: true,
	};
	S.target = 1;
	S.players = [preparePlayer(0, "PROFESSOR FINCH", COLORS[0])];
	buildStage(3, false);
	addMenuScenery();
	S.players[0].pos = { x: 6, y: 0, z: -7 };
	S.players[0].visual.mesh.position.set(6, 0, -7);
	$("modal").classList.add("hidden");
	$("title-screen").classList.remove("hidden");
	$("hud").classList.add("hidden");
	$("stage-card").classList.add("hidden");
	$("attract-banner").classList.add("hidden");
	$("speech").classList.add("hidden");
	$("toast").classList.add("hidden");
	$("touch-menu").classList.add("hidden");
	$("network-tag").classList.add("hidden");
	$("continue-button").classList.toggle("hidden", !loadCheckpoint());
	lastActivity = performance.now();
	resetFocus();
}
function renderMenu(keepFocus = false) {
	const previousFocus = menuFocus;
	$("modal").classList.remove("hidden");
	let title = "",
		html = "";
	if (menu === "pause") {
		title = "The expedition can wait.";
		html =
			"<p>The hat stays on. Take a breath.</p>" +
			menuButton("RESUME EXPEDITION", "back") +
			menuButton("FIELD NOTES", "notes") +
			menuButton("OPTIONS", "settings");
		if (!AIHub.active)
			html +=
				menuButton("DEVELOPER FIELD KIT", "dev") +
				menuButton("ABOUT & CREDITS", "about") +
				menuButton("RETURN TO TITLE", "title");
		else
			html +=
				'<p class="note">Your expedition continues while this menu is open. The Hub controls the round.</p>';
	} else if (menu === "settings") {
		title = "A few adjustments.";
		html =
			slider("Music", "music", 0, 1, 0.01, settings.music) +
			slider("Sound effects", "sfx", 0, 1, 0.01, settings.sfx) +
			slider("Gibberish voices", "voice", 0, 1, 0.01, settings.voice) +
			slider("Master volume", "master", 0, 1, 0.01, settings.master);
		html +=
			'<div class="row"><span class="setting-label">Controller symbols</span><button data-action="glyphs">' +
			settings.glyphs +
			"</button></div>";
		html +=
			toggleRow("Screen shake", "shake", settings.shake) +
			toggleRow("Dialogue captions", "subtitles", settings.subtitles) +
			toggleRow("Aim & parachute assist", "assist", settings.assist);
		html +=
			'<div class="coop-actions">' +
			paperButton("FULLSCREEN", "fullscreen", true) +
			paperButton("RESET OPTIONS", "reset-options", true) +
			"</div>";
	} else if (menu === "manual") {
		title = "Keep this page dry.";
		html =
			"<p>You are Professor Finch, an archaeologist with excellent instincts and a spectacularly unreliable map. Reach the Well of Whispers before Captain Voss does. Getting out is also recommended.</p>";
		html += '<div class="manual-grid">';
		for (const [a, titleText, body] of [
			[
				"move",
				"MOVE",
				"WASD or the left stick. Move relative to the screen. Aim with the mouse or right stick.",
			],
			[
				"attack",
				"CRACK THE WHIP",
				"Strike snakes and thieves, break crates, and punish Voss while his guard is down.",
			],
			[
				"interact",
				"READ THE ROOM",
				"Trade, press seals, rotate mirrors, dig, or swing at a nearby hook. One contextual action.",
			],
			[
				"dodge",
				"KEEP YOUR HAT",
				"Roll through attacks and dart volleys. You are protected during the roll.",
			],
			[
				"tool",
				"A LITTLE MUSIC",
				"The flute calms every snake for seven seconds. In freefall, this opens the parachute.",
			],
			[
				"notes",
				"FIELD NOTES",
				"Your notebook keeps puzzle clues and the next step. Tools belong to the whole expedition.",
			],
		])
			html +=
				'<div class="manual-item">' +
				glyph(a) +
				"<strong>" +
				titleText +
				"</strong><p>" +
				body +
				"</p></div>";
		html +=
			'</div><p class="note">Touch: move with an invisible left thumbstick. Tap the right half to evade. Nearby actions appear when useful. Whip, flute, and parachute assist are automatic. Co-op: 1–4 explorers, shared tools and progress; help a fallen partner before the checkpoint rescue.</p>';
	} else if (menu === "notes") {
		title = "Finch’s field notebook";
		html =
			'<div class="chapter-tag" style="color:#a0452e">CHAPTER 0' +
			(S.stage + 1) +
			"</div><h3>" +
			stageData[S.stage].name +
			"</h3><p>" +
			objectiveText() +
			"</p>";
		const notes = [
			[
				"The price of progress",
				"Three coins buy Nadia’s flute and shovel. Crates and pickpockets are both surprisingly good sources of pocket money.",
			],
			[
				"A language even I can read",
				"The temple inscription reads COIL → SUN → WING. The eastern satchel holds a parachute. Collect it and the sun staff before leaving.",
			],
			[
				"The Sun Atlas",
				"Place the staff, then turn plinth I NORTH, II EAST, III SOUTH. The glowing miniature names the correct mesa.",
			],
			[
				"The valley route",
				"The trailhead leads to IBIS, then COBRA, then SCARAB. Interact beside gold hooks to swing. The marked mesa is " +
					glyphNames[S.target] +
					".",
			],
			[
				"Canvas before courage",
				"Open the parachute with " +
					(inputType === "controller" ? "Circle / B" : "F or Space") +
					". Steer toward the gold circle. Airborne rings are optional.",
			],
			[
				"An unwelcome colleague",
				"Excavate the " +
					glyphNames[S.target] +
					" seal. Voss drops his guard after a slam. Dodge the red circle, then whip him.",
			],
			[
				"The exit strategy",
				"Run toward the far end of the corridor. Weave around rubble, dodge the darts, board the plane.",
			],
		];
		for (let i = 0; i <= S.stage; i++)
			html +=
				"<h3>0" +
				(i + 1) +
				" / " +
				notes[i][0] +
				"</h3><p>" +
				notes[i][1] +
				"</p>";
	} else if (menu === "dev") {
		title = "Developer field kit";
		html =
			'<p class="note">Live tuning. Changes apply immediately. Reset restores the expedition’s balance.</p>';
		html +=
			toggleRow("Invulnerability", "god", debug.god, "debug") +
			toggleRow("No collision / safe flight", "noclip", debug.noclip, "debug") +
			toggleRow("Freeze enemies & traps", "freeze", debug.freeze, "debug") +
			toggleRow("Physics wireframes", "colliders", debug.colliders, "debug") +
			toggleRow("World markers", "waypoints", debug.waypoints, "debug");
		for (const [label, key, min, max, step] of [
			["Explorer speed", "speed", 2, 10, 0.1],
			["Enemy speed", "enemySpeed", 0, 2.5, 0.1],
			["Incoming damage", "damage", 0, 3, 0.1],
			["Whip reach", "reach", 2, 8, 0.1],
			["Gravity", "gravity", 5, 30, 0.5],
			["Time scale", "timeScale", 0.25, 2, 0.05],
		])
			html += slider(label, key, min, max, step, tune[key], true);
		html +=
			'<h3>JUMP TO CHAPTER</h3><div class="dev-grid">' +
			stageData
				.map(
					(s, i) =>
						'<button data-action="stage" data-stage="' +
						i +
						'">0' +
						(i + 1) +
						" " +
						safeText(s.name) +
						"</button>",
				)
				.join("") +
			"</div>";
		html +=
			'<div class="coop-actions">' +
			paperButton("HEAL PARTY", "heal", true) +
			paperButton("GRANT FIELD KIT", "grant", true) +
			paperButton("RESTORE CHECKPOINT", "checkpoint", true) +
			paperButton("RESET TUNING", "reset-dev", true) +
			paperButton("WATCH ATTRACT REEL", "reel", true) +
			"</div>";
		html +=
			'<p class="note">' +
			safeText(
				renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL 2 fallback",
			) +
			" · Three.js r180 · Rapier 0.19.3 · " +
			metrics.physicsSteps +
			" physics steps</p>";
	} else if (menu === "about") {
		title = "Behind the expedition";
		html =
			'<div class="tabs">' +
			[
				["source", "SOURCE INFORMATION"],
				["testing", "TESTING FEEDBACK"],
				["engine", "ENGINE FEEDBACK"],
				["prompt", "PROMPT FEEDBACK"],
			]
				.map(
					([id, text]) =>
						'<button class="' +
						(creditsTab === id ? "active" : "") +
						'" data-action="credits-tab" data-tab="' +
						id +
						'">' +
						text +
						"</button>",
				)
				.join("") +
			"</div>";
		if (creditsTab === "source") {
			html +=
				'<dl class="credits-data">' +
				Object.entries(CREDITS.sourceInformation)
					.map(
						([key, value]) =>
							"<dt>" +
							safeText(
								key
									.replace(/([A-Z])/g, " $1")
									.replace(/^./, (s) => s.toUpperCase()),
							) +
							"</dt><dd>" +
							safeText(value) +
							"</dd>",
					)
					.join("") +
				"</dl>";
			html +=
				'<h3>RESEARCH & ACKNOWLEDGMENTS</h3><p class="note">An original homage to Howard Scott Warshaw’s 1982 Atari adventure. Original characters, music, geometry and writing. No original game assets or recordings.</p><p class="note"><a href="https://www.atariage.com/2600/manuals_old/raiders_of_the_lost_ark.html" target="_blank" rel="noreferrer">Atari instruction manual</a> · <a href="https://github.com/halkuncode/Raiders2600" target="_blank" rel="noreferrer">Reverse-engineered game analysis</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noreferrer">AI Hub Session Protocol v1</a></p>';
		} else {
			const qs = {
				testing: [
					"How many issues did testing catch?",
					"How many were critical / game breaking?",
					"Most helpful test?",
					"Least helpful test?",
				],
				engine: [
					"What did you like most?",
					"Did you get stuck or guess wrong?",
					"Most important thing built yourself?",
					"Hardest part of using the engine?",
					"Engine changes?",
					"One thing you would change?",
				],
				prompt: [
					"What did you like most?",
					"What was confusing?",
					"Hardest thing to do?",
					"What would you change?",
				],
			};
			const list = CREDITS[creditsTab + "Feedback"];
			html +=
				'<ol class="feedback-list">' +
				list
					.map(
						(answer, i) =>
							"<li><strong>" +
							qs[creditsTab][i] +
							"</strong><br>" +
							safeText(answer) +
							"</li>",
					)
					.join("") +
				"</ol>";
		}
	} else if (menu === "coop") {
		title = "Better trouble, together.";
		html =
			'<p>One expedition. Up to four questionable experts. Share tools, solve the atlas together, and haul each other out of trouble.</p><div class="coop-actions">' +
			paperButton("HOST AN EXPEDITION", "host-room") +
			paperButton("JOIN A ROOM", "join-menu", true) +
			'</div><h3>HOW IT WORKS</h3><p>Share the six-digit room code or invite link. Open this game on each device and enter the same code. Keep the host’s game open until everyone is safely home.</p><p class="note">AI Hub sessions connect automatically. Partners on different devices need an internet connection.</p>';
	} else if (menu === "join") {
		title = "Find your expedition.";
		html =
			'<p>Enter the six-digit room code.</p><input aria-label="Room code" class="room-entry" id="room-input" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" value="' +
			roomDigits.join("") +
			'"><div class="coop-actions">' +
			roomDigits
				.map(
					(d, i) =>
						'<button aria-label="Room digit ' +
						(i + 1) +
						'" class="paper-button secondary" data-action="digit" data-index="' +
						i +
						'">' +
						d +
						"</button>",
				)
				.join("") +
			'</div><p class="note">Controller: select a digit, then use left / right to change it.</p>' +
			paperButton("JOIN EXPEDITION", "join-room") +
			'<p id="room-notice" class="note" style="margin-top:15px">' +
			safeText(roomNotice) +
			"</p>";
	} else if (menu === "lobby") {
		title = "The expedition assembles.";
		html =
			'<p>Share this code with your partners.</p><div class="room-code">' +
			safeText(standalone?.code || "------") +
			'</div><div id="roster">' +
			(standalone?.members || [])
				.map(
					(p) =>
						'<div class="player-row"><span class="player-dot" style="background:' +
						p.color +
						'"></span>' +
						safeText(p.name) +
						(p.id === 0 ? " / HOST" : "") +
						"</div>",
				)
				.join("") +
			"</div>";
		html +=
			'<div class="coop-actions">' +
			(isHost
				? paperButton("SET OUT TOGETHER", "launch-room")
				: "<p>Waiting for the host to set out.</p>") +
			paperButton(
				location.protocol === "file:" ||
					["localhost", "127.0.0.1"].includes(location.hostname)
					? "COPY ROOM CODE"
					: "COPY INVITE LINK",
				"copy-invite",
				true,
			) +
			'</div><p id="room-notice" class="note">' +
			safeText(
				roomNotice ||
					"The room is ready. Partners may join before or during the expedition.",
			) +
			"</p>";
	} else if (menu === "victory") {
		title = "It belongs in a museum.";
		const rank =
			S.deathCount === 0 && S.secrets >= 2
				? "LEGENDARY FIELDWORK"
				: S.deathCount < 3
					? "A RESPECTABLE DISASTER"
					: "THE HAT SURVIVED";
		const score = Math.max(
			0,
			1000 + S.coins * 20 + S.kills * 35 + S.secrets * 100 - S.deathCount * 75,
		);
		html =
			'<p>One reliquary recovered. One map still missing. Professor Finch considers this an unqualified success.</p><div class="victory-score">' +
			score.toLocaleString() +
			'</div><div class="eyebrow" style="text-align:center;color:#a34a30">' +
			rank +
			'</div><div class="stat-grid"><div><strong>' +
			Math.floor(S.elapsed / 60) +
			":" +
			String(Math.floor(S.elapsed % 60)).padStart(2, "0") +
			"</strong><span>Expedition time</span></div><div><strong>" +
			S.coins +
			"</strong><span>Coins rescued</span></div><div><strong>" +
			S.kills +
			"</strong><span>Close calls settled</span></div></div>";
		if (!AIHub.active)
			html +=
				'<div class="coop-actions">' +
				paperButton("ANOTHER EXPEDITION", "again") +
				paperButton("RETURN TO TITLE", "title", true) +
				paperButton("CREDITS", "about", true) +
				"</div>";
	}
	$("modal-title").textContent = title;
	$("modal-body").innerHTML = html;
	$("modal-hint").innerHTML =
		inputType === "controller"
			? "D-PAD SELECT · " +
				glyph("dodge") +
				"CONFIRM · " +
				glyph("tool") +
				"BACK · R SCROLL"
			: "↑ ↓ SELECT · ENTER CONFIRM · ESC BACK · PGDN SCROLL";
	if (keepFocus) focusElement(previousFocus);
	else resetFocus();
}
function showVictory() {
	if (S.attract) {
		S.attractClock = 16;
		S.mode = "playing";
		return;
	}
	menuTrail.length = 0;
	menu = "victory";
	renderMenu();
}
function focusList() {
	const root = menu === "title" ? $("title-screen") : $("modal-body");
	const nodes = [...root.querySelectorAll("button:not(:disabled),input")];
	if (menu !== "title")
		nodes.push($("modal").querySelector(".panel-footer button"));
	return nodes.filter((e) => e.getClientRects().length > 0);
}
function focusElement(index) {
	const list = focusList();
	if (!list.length) return;
	list.forEach((e) => e.classList.remove("focused"));
	menuFocus = (index + list.length) % list.length;
	const el = list[menuFocus];
	el.classList.add("focused");
	el.focus({ preventScroll: true });
	if (menu !== "title") el.scrollIntoView({ block: "nearest" });
	return el;
}
function resetFocus() {
	menuFocus = 0;
	focusElement(0);
}
function menuMove(d) {
	focusElement(menuFocus + d);
	audio.fx("click");
}
function menuAdjust(d) {
	const e = focusList()[menuFocus];
	if (!e) return;
	if (e.type === "range") {
		e.value = clamp(
			Number(e.value) + Number(e.step) * d,
			Number(e.min),
			Number(e.max),
		);
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (e.dataset.action === "digit") {
		const i = +e.dataset.index;
		roomDigits[i] = (roomDigits[i] + d + 10) % 10;
		e.textContent = roomDigits[i];
		$("room-input").value = roomDigits.join("");
	}
}
function setDevStage(i) {
	if (!hostAuthority()) return;
	S.flags = {
		flute: true,
		shovel: true,
		chute: true,
		staff: true,
		templeSolved: true,
		staffPlaced: i > 2,
		mapped: i > 2,
	};
	if (i === 5) S.flags.mapped = true;
	if (i === 6) {
		S.flags.relic = true;
		S.flags.bossDefeated = true;
	}
	S.seals = [0, 1, 2];
	S.mirrors = i > 2 ? [0, 1, 2] : [2, 3, 0];
	S.selectedMesa = S.target;
	S.mode = "playing";
	S.won = false;
	menu = null;
	menuTrail.length = 0;
	$("modal").classList.add("hidden");
	buildStage(i);
}
async function doAction(action, el) {
	if (hubEnded) return;
	audio.unlock();
	audio.fx("click");
	lastActivity = performance.now();
	switch (action) {
		case "begin":
			newRun();
			break;
		case "continue":
			newRun(loadCheckpoint());
			break;
		case "back":
			if (menu === "victory") {
				returnTitle();
			} else closeMenu();
			break;
		case "settings":
		case "manual":
		case "notes":
		case "dev":
		case "about":
		case "coop":
			openMenu(action);
			break;
		case "title":
			returnTitle();
			break;
		case "fullscreen":
			try {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			} catch {
				toast("Fullscreen is unavailable in this browser.");
			}
			break;
		case "toggle": {
			const obj = el.dataset.scope === "debug" ? debug : settings;
			obj[el.dataset.key] = !obj[el.dataset.key];
			saveOptions();
			renderMenu(true);
			break;
		}
		case "glyphs":
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			saveOptions();
			renderMenu(true);
			break;
		case "reset-options":
			Object.assign(settings, {
				music: 0.1,
				sfx: 0.7,
				voice: 0.5,
				master: 0.75,
				glyphs: "PlayStation",
				shake: true,
				subtitles: true,
				assist: true,
			});
			saveOptions();
			renderMenu(true);
			break;
		case "credits-tab":
			creditsTab = el.dataset.tab;
			renderMenu(true);
			break;
		case "stage":
			setDevStage(Number(el.dataset.stage));
			break;
		case "heal":
			for (const p of S.players) {
				p.hp = 6;
				p.down = 0;
				p.invuln = 3;
			}
			toast("PARTY HEALED");
			break;
		case "grant":
			Object.assign(S.flags, {
				flute: true,
				shovel: true,
				chute: true,
				staff: true,
			});
			S.coins += 20;
			toast("FIELD KIT GRANTED");
			break;
		case "checkpoint":
			for (const p of S.players) respawn(p);
			closeMenu();
			break;
		case "reset-dev":
			Object.assign(tune, defaults);
			Object.assign(debug, {
				god: false,
				noclip: false,
				freeze: false,
				colliders: false,
				waypoints: true,
			});
			world.gravity = { x: 0, y: -tune.gravity, z: 0 };
			renderMenu();
			break;
		case "reel":
			if (!netActive) {
				returnTitle();
				startAttract();
			}
			break;
		case "host-room":
			await createRoom();
			break;
		case "join-menu":
			roomNotice = "";
			openMenu("join");
			break;
		case "digit": {
			const i = +el.dataset.index;
			roomDigits[i] = (roomDigits[i] + 1) % 10;
			el.textContent = roomDigits[i];
			$("room-input").value = roomDigits.join("");
			break;
		}
		case "join-room": {
			const code = ($("room-input")?.value || roomDigits.join(""))
				.replace(/\D/g, "")
				.padStart(6, "0");
			await joinRoom(code);
			break;
		}
		case "launch-room":
			if (isHost) {
				newRun();
				standalone.send({ kind: "begin" });
			}
			break;
		case "copy-invite": {
			const u = new URL(location.href);
			u.search = "";
			u.searchParams.set("room", standalone.code);
			const local =
					location.protocol === "file:" ||
					["localhost", "127.0.0.1"].includes(location.hostname),
				invite = local ? standalone.code : u.href;
			try {
				await navigator.clipboard.writeText(invite);
				toast(local ? "ROOM CODE COPIED" : "INVITE LINK COPIED");
			} catch {
				roomNotice = invite;
				renderMenu();
			}
			break;
		}
		case "again":
			if (isHost) newRun();
			break;
	}
}
document.addEventListener("click", (e) => {
	const el = e.target.closest("[data-action]");
	if (!el) return;
	doAction(el.dataset.action, el).catch((err) => {
		roomNotice = err.message;
		if (menu === "join" || menu === "lobby") renderMenu();
		else toast(err.message);
	});
});
document.addEventListener("input", (e) => {
	const key = e.target.dataset.slider;
	if (!key) return;
	const value = Number(e.target.value),
		dev = e.target.dataset.dev === "true";
	(dev ? tune : settings)[key] = value;
	const label = $("value-" + key);
	if (label)
		label.textContent =
			Number(e.target.max) === 1
				? Math.round(value * 100) + "%"
				: value.toFixed(1);
	if (key === "gravity" && world) world.gravity = { x: 0, y: -value, z: 0 };
	if (!dev) saveOptions();
	lastActivity = performance.now();
});
document.addEventListener("pointerover", (e) => {
	if (!menu) return;
	const el = e.target.closest("button,input");
	if (!el) return;
	const i = focusList().indexOf(el);
	if (i >= 0) {
		focusList().forEach((n) => n.classList.remove("focused"));
		menuFocus = i;
		el.classList.add("focused");
	}
});
$("context").onclick = (e) => {
	e.stopPropagation();
	activity(e.pointerType === "touch" ? "touch" : "mouse");
	latestInput.interact = true;
};
$("touch-menu").onclick = () => {
	activity("touch");
	openMenu("pause");
};

let peerLoader = null;
function loadPeer() {
	if (window.Peer) return Promise.resolve(window.Peer);
	if (peerLoader) return peerLoader;
	peerLoader = new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
		s.onload = () => resolve(window.Peer);
		s.onerror = () =>
			reject(
				new Error(
					"Internet signaling unavailable. Same-browser rooms still work.",
				),
			);
		document.head.append(s);
	});
	return peerLoader;
}
function roomStatus(text) {
	roomNotice = text;
	const e = $("room-notice");
	if (e) e.textContent = text;
}
function appendParticipant(member) {
	if (S.players.some((p) => p.id === member.id)) return;
	const p = preparePlayer(member.id, member.name, member.color),
		near = localPlayer()?.pos || { x: 0, y: 0, z: 8 };
	p.pos = { x: near.x + 0.8, y: near.y, z: near.z + 0.5 };
	p.checkpoint = { ...p.pos };
	p.visual = makeExplorer(p.color);
	playerRoot.add(p.visual.mesh);
	p.body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			p.pos.x,
			p.pos.y + 0.92,
			p.pos.z,
		),
	);
	p.collider = world.createCollider(
		RAPIER.ColliderDesc.capsule(0.52, 0.36),
		p.body,
	);
	p.controller = world.createCharacterController(0.035);
	p.controller.enableAutostep(0.3, 0.2, true);
	p.controller.enableSnapToGround(0.2);
	p.vy = 0;
	p.lastInput = S.time;
	S.players.push(p);
	world.step();
	toast("A PARTNER JOINS THE EXPEDITION");
}
function removeParticipant(id) {
	const p = S.players.find((p) => p.id === id);
	if (!p) return;
	if (p.body) world.removeRigidBody(p.body);
	p.visual?.mesh.parent?.remove(p.visual.mesh);
	S.players = S.players.filter((p) => p.id !== id);
	remoteInputs.delete(id);
}
class RoomBus {
	constructor(code, host) {
		this.code = code;
		this.host = host;
		this.me = host ? 0 : null;
		this.token = crypto.randomUUID();
		this.members = host
			? [{ id: 0, name: "PROFESSOR FINCH", color: COLORS[0] }]
			: [];
		this.tokens = new Map();
		this.nextId = 1;
		this.conns = new Map();
		this.closed = false;
		this.started = false;
		this.lastContact = performance.now();
		try {
			this.channel = new BroadcastChannel("lost-map-room-" + code);
			this.channel.onmessage = (e) => this.receive(e.data, null);
		} catch {}
		this.timer = setInterval(() => {
			if (this.closed) return;
			if (!this.host && this.me === null)
				this.raw({ kind: "hello", token: this.token });
			else this.raw({ kind: "pulse", id: this.me, token: this.token });
			if (
				!this.host &&
				this.me !== null &&
				performance.now() - this.lastContact > 14000
			) {
				roomStatus(
					"The host connection was lost. Return to title to reconnect.",
				);
				if (menu === null) openMenu("lobby");
			}
		}, 1000);
		this.setupInternet();
		if (!host)
			setTimeout(() => this.raw({ kind: "hello", token: this.token }), 50);
	}
	async setupInternet() {
		try {
			const Peer = await loadPeer();
			if (this.closed) return;
			this.peer = new Peer(
				this.host ? "lostmap-expedition-" + this.code : undefined,
				{ debug: 0 },
			);
			this.peer.on("error", (err) => {
				if (!this.closed)
					roomStatus(
						this.me === null
							? "Looking for the room. Check the code, or open its invite link."
							: "This browser’s room is ready. The internet room service is unavailable; try again shortly.",
					);
			});
			this.peer.on("open", () => {
				if (this.closed) return;
				if (this.host)
					roomStatus(
						"Room ready for partners on this browser or another device.",
					);
				else
					this.attach(
						this.peer.connect("lostmap-expedition-" + this.code, {
							reliable: true,
							serialization: "json",
							metadata: { token: this.token },
						}),
					);
			});
			this.peer.on("connection", (c) => this.attach(c));
		} catch (err) {
			if (!this.closed) roomStatus(err.message);
		}
	}
	attach(conn) {
		conn.on("open", () => {
			if (this.closed) {
				conn.close();
				return;
			}
			this.conns.set(conn.peer, conn);
			if (!this.host) conn.send({ kind: "hello", token: this.token });
		});
		conn.on("data", (d) => this.receive(d, conn));
		conn.on("close", () => {
			this.conns.delete(conn.peer);
			if (!this.host)
				roomStatus(
					"Internet peer disconnected. A same-browser connection may still be active.",
				);
		});
		conn.on("error", () =>
			roomStatus(
				"Peer connection interrupted. Rejoin with the same room code.",
			),
		);
	}
	raw(d) {
		if (this.closed) return;
		const data = { ...d, room: this.code, sender: this.token };
		try {
			this.channel?.postMessage(data);
		} catch {}
		for (const c of this.conns.values())
			if (c.open)
				try {
					c.send(data);
				} catch {}
	}
	send(d) {
		this.raw({ ...d, from: this.me });
	}
	receive(d, conn) {
		if (
			this.closed ||
			!d ||
			(d.room && d.room !== this.code) ||
			d.sender === this.token
		)
			return;
		if (d.kind === "hello" && this.host) {
			let id = this.tokens.get(d.token);
			if (id === undefined) {
				if (this.members.length >= 4) {
					this.raw({ kind: "full", to: d.token });
					return;
				}
				id = this.nextId++;
				this.tokens.set(d.token, id);
				const member = {
					id,
					name: ["PROFESSOR FINCH", "DR. REED", "CAPTAIN QUILL", "DOC MARLOW"][
						id % 4
					],
					color: COLORS[id % 4],
				};
				this.members.push(member);
				if (this.started) appendParticipant(member);
			}
			this.raw({
				kind: "welcome",
				to: d.token,
				id,
				members: this.members,
				started: this.started,
			});
			this.raw({ kind: "roster", members: this.members });
			if (menu === "lobby") renderMenu();
			return;
		}
		if (d.kind === "welcome" && !this.host && d.to === this.token) {
			this.me = d.id;
			this.members = d.members;
			this.lastContact = performance.now();
			localId = this.me;
			netActive = true;
			isHost = false;
			roomStatus("Connected. The expedition is ready.");
			if (menu !== "lobby") {
				menu = "lobby";
				renderMenu();
			}
			return;
		}
		if (d.kind === "roster" && !this.host) {
			this.members = d.members;
			if (menu === "lobby") renderMenu();
			return;
		}
		if (d.kind === "full" && d.to === this.token) {
			roomStatus("This expedition already has four explorers.");
			return;
		}
		if (d.kind === "pulse") {
			if (!this.host && d.id === 0) this.lastContact = performance.now();
			return;
		}
		if (d.kind === "world" && !this.host && this.me !== null) {
			this.lastContact = performance.now();
			if (menu === "lobby" || S.mode === "title") {
				$("title-screen").classList.add("hidden");
				$("modal").classList.add("hidden");
				$("hud").classList.remove("hidden");
				menu = null;
			}
			receiveSnapshot(d);
			return;
		}
		if (d.kind === "input" && this.host) {
			acceptInput(d, d.from);
			return;
		}
		if (d.kind === "bye" && this.host) {
			this.members = this.members.filter((p) => p.id !== d.from);
			removeParticipant(d.from);
			this.raw({ kind: "roster", members: this.members });
			if (menu === "lobby") renderMenu();
			return;
		}
		if (d.kind === "host-left" && !this.host) {
			this.close();
			standalone = null;
			netActive = false;
			returnTitle();
			toast("THE HOST CLOSED THE EXPEDITION");
			return;
		}
	}
	close() {
		if (this.closed) return;
		this.raw({ kind: this.host ? "host-left" : "bye", from: this.me });
		this.closed = true;
		clearInterval(this.timer);
		this.channel?.close();
		for (const c of this.conns.values()) c.close();
		this.peer?.destroy();
	}
}
async function createRoom() {
	standalone?.close();
	const a = new Uint32Array(1);
	crypto.getRandomValues(a);
	const code = String(100000 + (a[0] % 900000));
	S.mode = "lobby";
	standalone = new RoomBus(code, true);
	netActive = true;
	isHost = true;
	localId = 0;
	lastSnapshot = 0;
	roomNotice = "Creating the expedition room…";
	openMenu("lobby");
}
async function joinRoom(code) {
	if (!/^\d{6}$/.test(code)) {
		roomStatus("Use the six digits on the host’s screen.");
		return;
	}
	standalone?.close();
	S.mode = "lobby";
	standalone = new RoomBus(code, false);
	isHost = false;
	netActive = true;
	lastSnapshot = 0;
	roomStatus("Looking for expedition " + code + "…");
}
async function initializeHub() {
	if (!AIHub.active) return null;
	hubInfo = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
	if (!hubInfo) return null;
	netActive = true;
	isHost = AIHub.isHost;
	localId = AIHub.me;
	AIHub.on("message", (data, from) => {
		if (hubEnded) return;
		if (isHost) acceptInput(data, from);
		else if (from === AIHub.host && data.kind === "world")
			receiveSnapshot(data);
	});
	AIHub.on("start", () => {
		hubStarted = true;
		S.mode = "playing";
		menu = null;
		$("modal").classList.add("hidden");
	});
	AIHub.on("leave", ({ id }) => {
		removeParticipant(id);
	});
	AIHub.on("time-up", () => {
		if (isHost) finishHub(!!S.flags.relic);
	});
	AIHub.on("end", () => {
		hubEnded = true;
		S.mode = "ended";
		audio.stop();
		$("modal").classList.add("hidden");
		$("context").classList.add("hidden");
	});
	return hubInfo;
}

const keys = new Set(),
	touches = new Map();
let stick = null,
	padPrev = [],
	padNavTimer = 0,
	padDetected = false,
	lastMouse = { x: 0, y: 0 };
const mouseNDC = new THREE.Vector2();
function activity(type) {
	if (hubEnded) return false;
	lastActivity = performance.now();
	if (type !== inputType) {
		inputType = type;
		document.body.classList.toggle("touch", type === "touch");
		$("aim").style.display =
			type === "mouse" && menu === null ? "block" : "none";
		if (menu && menu !== "title")
			$("modal-hint").innerHTML =
				type === "controller"
					? "D-PAD SELECT · " +
						glyph("dodge") +
						"CONFIRM · " +
						glyph("tool") +
						"BACK · R SCROLL"
					: "↑ ↓ SELECT · ENTER CONFIRM · ESC BACK · PGDN SCROLL";
		$("title-input").textContent =
			type === "controller"
				? "D-PAD SELECT · " +
					(settings.glyphs === "Xbox" ? "A" : "✕") +
					" CONFIRM"
				: type === "touch"
					? "TAP TO BEGIN · LEFT THUMB TO MOVE"
					: "WASD + MOUSE · OR CONTROLLER";
	}
	if (S.attract) {
		stopAttract();
		return false;
	}
	return true;
}
document.addEventListener(
	"pointerdown",
	(e) => {
		if (!activity(e.pointerType === "touch" ? "touch" : "mouse")) {
			e.stopImmediatePropagation();
			e.preventDefault();
		}
	},
	true,
);
window.addEventListener("keydown", (e) => {
	const typing = e.target.tagName === "INPUT" && e.target.type !== "range";
	if (!activity("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	if (typing && e.code !== "Escape" && e.code !== "Enter") return;
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
	if (menu) {
		if (e.code === "Escape") {
			if (menu !== "title") closeMenu();
			return;
		}
		if (e.code === "PageDown" || e.code === "PageUp") {
			e.preventDefault();
			$("modal-body").scrollTop +=
				(e.code === "PageDown" ? 1 : -1) * $("modal-body").clientHeight * 0.75;
			return;
		}
		if (["ArrowDown", "KeyS", "Tab"].includes(e.code))
			menuMove(e.shiftKey ? -1 : 1);
		if (["ArrowUp", "KeyW"].includes(e.code)) menuMove(-1);
		if (["ArrowLeft", "KeyA"].includes(e.code)) menuAdjust(-1);
		if (["ArrowRight", "KeyD"].includes(e.code)) menuAdjust(1);
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			focusList()[menuFocus]?.click();
		}
		return;
	}
	keys.add(e.code);
	if (e.repeat) return;
	if (e.code === "Escape") {
		openMenu("pause");
		keys.clear();
	}
	if (e.code === "KeyQ") openMenu("notes");
	if (e.code === "KeyE") latestInput.interact = true;
	if (e.code === "Space") latestInput.dodge = true;
	if (e.code === "KeyF") latestInput.tool = true;
	if (e.code === "KeyJ") latestInput.attack = true;
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	stick = null;
});
document.addEventListener("visibilitychange", () => {
	if (
		document.hidden &&
		!netActive &&
		S.mode === "playing" &&
		!S.attract &&
		menu === null
	)
		openMenu("pause");
});
$("world").addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") {
		if (stick && e.pointerId === stick.id) {
			stick.x = clamp((e.clientX - stick.sx) / 55, -1, 1);
			stick.z = clamp((e.clientY - stick.sy) / 55, -1, 1);
		}
		return;
	}
	if (Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y) > 3) {
		activity("mouse");
		lastMouse = { x: e.clientX, y: e.clientY };
		mouseMoved = true;
	}
	mouseNDC.set(
		(e.clientX / innerWidth) * 2 - 1,
		(-e.clientY / innerHeight) * 2 + 1,
	);
	$("aim").style.left = e.clientX + "px";
	$("aim").style.top = e.clientY + "px";
});
$("world").addEventListener("pointerdown", (e) => {
	if (!activity(e.pointerType === "touch" ? "touch" : "mouse")) return;
	audio.unlock();
	if (menu) return;
	if (e.pointerType === "touch") {
		$("world").setPointerCapture(e.pointerId);
		touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			t: performance.now(),
		});
		if (e.clientX < innerWidth * 0.52 && !stick) {
			stick = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: 0, z: 0 };
			$("touch-stick").classList.remove("hidden");
			$("touch-stick").style.left = e.clientX - 50 + "px";
			$("touch-stick").style.top = e.clientY - 50 + "px";
		}
		return;
	}
	if (e.button === 0) {
		if (
			hovered &&
			localPlayer() &&
			dist(hovered, localPlayer().pos) < hovered.radius
		)
			latestInput.interact = true;
		else latestInput.attack = true;
	}
	if (e.button === 2) latestInput.tool = true;
});
window.addEventListener("pointerup", (e) => {
	if (e.pointerType !== "touch") return;
	if (stick && stick.id === e.pointerId) {
		stick = null;
		$("touch-stick").classList.add("hidden");
	} else if (touches.has(e.pointerId) && menu === null)
		latestInput.dodge = true;
	touches.delete(e.pointerId);
});
window.addEventListener("pointercancel", (e) => {
	touches.delete(e.pointerId);
	if (stick?.id === e.pointerId) {
		stick = null;
		$("touch-stick").classList.add("hidden");
	}
});
window.addEventListener("gamepadconnected", () => {
	padDetected = true;
	activity("controller");
});
function pollInput(dt) {
	if (hubEnded) return;
	const pads = Array.from(navigator.getGamepads?.() || []),
		pad = pads.find((p) => p && p.connected !== false);
	let mx = 0,
		mz = 0;
	if (keys.has("KeyW") || keys.has("ArrowUp")) mz--;
	if (keys.has("KeyS") || keys.has("ArrowDown")) mz++;
	if (keys.has("KeyA") || keys.has("ArrowLeft")) mx--;
	if (keys.has("KeyD") || keys.has("ArrowRight")) mx++;
	if (stick) {
		mx = stick.x;
		mz = stick.z;
	}
	let aim = null;
	if (inputType === "mouse" && mouseMoved && camera && localPlayer()) {
		raycaster.setFromCamera(mouseNDC, camera);
		plane.constant = -(S.stage === 4 ? localPlayer().pos.y : 0);
		const hit = vec();
		if (raycaster.ray.intersectPlane(plane, hit)) aim = { x: hit.x, z: hit.z };
		hovered = null;
		let best = 1e9;
		for (const i of S.interacts) {
			if (i.can && !i.can()) continue;
			const projected = vec(i.x, 1.2, i.z).project(camera),
				sx = (projected.x * 0.5 + 0.5) * innerWidth,
				sy = (-projected.y * 0.5 + 0.5) * innerHeight;
			const px = (mouseNDC.x * 0.5 + 0.5) * innerWidth,
				py = (-mouseNDC.y * 0.5 + 0.5) * innerHeight,
				d = Math.hypot(sx - px, sy - py);
			if (d < 42 && d < best) {
				hovered = i;
				best = d;
			}
		}
		$("world").style.cursor = hovered ? "pointer" : "crosshair";
	}
	if (pad) {
		const b = pad.buttons.map((b) =>
				typeof b === "number" ? b > 0.5 : b.pressed || b.value > 0.5,
			),
			edge = (i) => b[i] && !padPrev[i];
		const ax = pad.axes[0] || 0,
			ay = pad.axes[1] || 0,
			rx = pad.axes[2] || 0,
			ry = pad.axes[3] || 0;
		const active =
			Math.hypot(ax, ay) > 0.2 ||
			Math.hypot(rx, ry) > 0.25 ||
			b.some((v, i) => v && !padPrev[i]);
		if (active && !activity("controller")) {
			padPrev = b;
			return;
		}
		if (active) audio.unlock();
		if (menu) {
			if (menu !== "title" && Math.abs(ry) > 0.15)
				$("modal-body").scrollTop += ry * dt * 540;
			padNavTimer -= dt;
			const down = b[13] || ay > 0.55,
				up = b[12] || ay < -0.55,
				left = b[14] || ax < -0.55,
				right = b[15] || ax > 0.55;
			if (padNavTimer <= 0 && (down || up || left || right)) {
				if (down) menuMove(1);
				else if (up) menuMove(-1);
				else menuAdjust(right ? 1 : -1);
				padNavTimer = 0.19;
			}
			if (edge(0)) focusList()[menuFocus]?.click();
			if (edge(1) && menu !== "title") closeMenu();
			if (edge(9) && !(AIHub.active && b[8]) && menu === "pause") closeMenu();
		} else {
			if (Math.abs(ax) > 0.15) mx = ax;
			if (Math.abs(ay) > 0.15) mz = ay;
			if (Math.hypot(rx, ry) > 0.2 && localPlayer()) {
				const v = inputWorld({ x: rx, z: ry });
				aim = {
					x: localPlayer().pos.x + v.x * 10,
					z: localPlayer().pos.z + v.z * 10,
				};
			}
			if (edge(0)) latestInput.dodge = true;
			if (edge(1)) latestInput.tool = true;
			if (edge(2)) latestInput.attack = true;
			if (edge(3)) latestInput.interact = true;
			if (edge(4)) openMenu("notes");
			if (edge(9) && !(AIHub.active && b[8])) openMenu("pause");
		}
		padPrev = b;
		padDetected = true;
	} else padPrev = [];
	if (menu || hubInfo?.server) {
		latestInput.x = 0;
		latestInput.z = 0;
		latestInput.aim = null;
		latestInput.attack = false;
		latestInput.interact = false;
		latestInput.dodge = false;
		latestInput.tool = false;
	} else {
		latestInput.x = mx;
		latestInput.z = mz;
		latestInput.aim = aim;
	}
}

function resize() {
	if (!renderer || !camera) return;
	renderer.setSize(innerWidth, innerHeight);
	const aspect = innerWidth / innerHeight;
	let size =
		S.mode === "title" ? 36 : S.stage === 6 ? 31 : S.stage === 4 ? 38 : 39;
	if (aspect < 1.2) size = Math.max(size, 43 / aspect);
	camera.left = (-size * aspect) / 2;
	camera.right = (size * aspect) / 2;
	camera.top = size / 2;
	camera.bottom = -size / 2;
	camera.updateProjectionMatrix();
}
function updateCamera(dt) {
	const p = localPlayer();
	let desired = vec(0, 0, 0);
	if (S.mode === "title") desired.set(-10, 0, 7.5);
	else if (S.stage === 4) desired.set(0, clamp((p?.pos.y || 0) - 3, 0, 17), 0);
	else if (S.stage === 6) desired.set(0, 0, clamp((p?.pos.z || 0) - 5, -24, 5));
	cameraLook.lerp(desired, Math.min(1, dt * 3.8));
	const offset = vec(25, 31, 36);
	camera.position.copy(cameraLook).add(offset);
	if (settings.shake && shake > 0) {
		camera.position.x += (Math.random() - 0.5) * shake;
		camera.position.y += (Math.random() - 0.5) * shake;
	}
	shake = Math.max(0, shake - dt);
	camera.lookAt(cameraLook);
	resize();
}
function frame(now) {
	if (!ready) return;
	const raw = lastFrame ? Math.min((now - lastFrame) / 1000, 0.12) : 1 / 60;
	lastFrame = now;
	renderTime += raw;
	pollInput(raw);
	if (
		S.mode === "title" &&
		performance.now() - lastActivity > 10000 &&
		!netActive
	)
		startAttract();
	if (hostAuthority()) {
		accumulator += raw * tune.timeScale;
		let count = 0;
		while (accumulator >= 1 / 60 && count < 8) {
			if (!AIHub.active || (hubStarted && AIHub.time() >= 0)) stepWorld(1 / 60);
			accumulator -= 1 / 60;
			count++;
		}
	} else S.time += raw;
	networkTick(raw);
	visuals(raw);
	updateCamera(raw);
	refreshHUD(raw);
	audio.update();
	if (!hubInfo?.server) renderer.render(scene, camera);
	metrics.frames++;
}
function addMenuScenery() {
	for (const o of level.children) if (o.isSprite) o.visible = false;
	for (const i of S.interacts) if (i.marker) i.marker.visible = false;
	// A little temple above an implausibly deep canyon.
	const g = new THREE.Group();
	g.position.set(13, 0, 3);
	level.add(g);
	box(0, 0.3, -1.3, 7, 0.6, 6, "sandLight", g);
	for (let i = 0; i < 3; i++)
		box(
			0,
			0.15 + i * 0.15,
			2.2 - i * 0.45,
			5.6 - i * 0.4,
			0.25,
			1.7,
			"sandLight",
			g,
		);
	for (const x of [-2.6, -0.9, 0.9, 2.6]) {
		cylinder(x, 2.3, -0.2, 0.3, 4, "sand", g, 8);
		box(x, 4.3, -0.2, 0.9, 0.35, 0.9, "cream", g);
	}
	box(0, 4.75, -1.2, 7.4, 0.7, 5, "sandLight", g);
	const roof = mesh(
		new THREE.ConeGeometry(4.4, 1.1, 4),
		"rock",
		0,
		5.6,
		-1.1,
		g,
	);
	roof.rotation.y = PI / 4;
	roof.scale.z = 0.7;
	box(0, 2.4, -2.8, 5.7, 4.3, 0.5, "rock", g);
	box(0, 1.7, -2.5, 1.8, 3.2, 0.12, "deep", g);
	cylinder(0, 5.2, -1, 0.2, 0.7, "gold", g);
	palm(15, 7, 0.7);
	pot(10, 5, 0.6);
	const v = makeExplorer(COLORS[0]);
	v.mesh.position.set(11, 0, 7.6);
	v.mesh.rotation.y = -0.8;
	v.mesh.scale.setScalar(1.35);
	level.add(v.mesh);
	S.dynamic.push({ kind: "npc", visual: v, mesh: v.mesh });
}
async function boot() {
	try {
		$("load-status").textContent = "Preparing the expedition…";
		const hubPromise = initializeHub();
		await RAPIER.init();
		scene = new THREE.Scene();
		gradient = new THREE.DataTexture(
			new Uint8Array([75, 160, 255]),
			3,
			1,
			THREE.RedFormat,
		);
		gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
		gradient.needsUpdate = true;
		inkMaterial = new THREE.MeshBasicMaterial({
			color: 0x20332e,
			side: THREE.BackSide,
		});
		lineMaterial = new THREE.LineBasicMaterial({
			color: 0x394334,
			transparent: true,
			opacity: 0.65,
		});
		shadowMaterial = new THREE.MeshBasicMaterial({
			color: 0x132e2a,
			transparent: true,
			opacity: 0.22,
			depthWrite: false,
		});
		const ambient = new THREE.HemisphereLight(0xffe9b5, 0x56736c, 1.4);
		ambient.name = "ambient";
		scene.add(ambient);
		const sun = new THREE.DirectionalLight(0xffe1ac, 2.7);
		sun.name = "sunlight";
		sun.position.set(-12, 28, 8);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -35;
		sun.shadow.camera.right = 35;
		sun.shadow.camera.top = 30;
		sun.shadow.camera.bottom = -30;
		sun.shadow.camera.far = 100;
		sun.shadow.bias = -0.0008;
		sun.shadow.normalBias = 0.04;
		scene.add(sun);
		const fill = new THREE.DirectionalLight(0x8fb8ab, 0.45);
		fill.position.set(15, 10, -15);
		scene.add(fill);
		camera = new THREE.OrthographicCamera(-32, 32, 18, -18, 0.1, 220);
		raycaster = new THREE.Raycaster();
		plane = new THREE.Plane(vec(0, 1, 0), 0);
		renderer = new THREE.WebGPURenderer({
			canvas: $("world"),
			antialias: true,
			forceWebGL: params.get("renderer") === "webgl",
		});
		await renderer.init();
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.05;
		await hubPromise;
		if (AIHub.active && hubInfo) {
			newRun();
			S.mode = "waiting";
			menu = null;
			$("title-screen").classList.add("hidden");
			$("hud").classList.remove("hidden");
		} else {
			returnTitle();
		}
		resize();
		updateCamera(1);
		visuals(0);
		// Compile the first world before reporting readiness.
		if (!hubInfo?.server) await renderer.compileAsync(scene, camera);
		ready = true;
		lastActivity = performance.now();
		document.body.dataset.ready = "true";
		document.body.dataset.renderer = renderer.backend.isWebGPUBackend
			? "webgpu"
			: "webgl2";
		$("loading").classList.add("hidden");
		window.addEventListener("resize", resize);
		renderer.setAnimationLoop(frame);
		if (AIHub.active) AIHub.ready();
		else if (params.has("room")) {
			openMenu("join");
			const code = params.get("room").replace(/\D/g, "").slice(0, 6);
			if (code.length === 6) {
				$("room-input").value = code;
				await joinRoom(code);
			}
		}
	} catch (err) {
		loadingError = String(err.stack || err);
		console.error(err);
		$("load-status").textContent =
			"The expedition could not load: " +
			err.message +
			". Check your internet connection, then reload.";
		if (AIHub.active) AIHub.fail(err.message);
	}
}
window.__game = {
	get ready() {
		return ready;
	},
	get backend() {
		return renderer?.backend.isWebGPUBackend ? "webgpu" : "webgl2";
	},
	get credits() {
		return CREDITS;
	},
	get state() {
		return {
			mode: S.mode,
			menu,
			stage: S.stage,
			stageName: stageData[S.stage].name,
			time: S.time,
			elapsed: S.elapsed,
			coins: S.coins,
			kills: S.kills,
			secrets: S.secrets,
			flags: { ...S.flags },
			target: S.target,
			mirrors: [...S.mirrors],
			seals: [...S.seals],
			selectedMesa: S.selectedMesa,
			won: S.won,
			attract: S.attract,
			deathCount: S.deathCount,
			localId,
			netActive,
			isHost,
			hubStarted,
			hubEnded,
			players: S.players.map((p) => ({
				id: p.id,
				hp: p.hp,
				pos: { ...p.pos },
				face: p.face,
				down: p.down,
				gliding: p.gliding,
				swing: !!p.swing,
				flute: p.flute,
				toolCd: p.toolCd,
			})),
			enemies: S.enemies
				.filter((e) => !e.dead)
				.map((e) => ({
					id: e.id,
					kind: e.kind,
					pos: { ...e.pos },
					hp: e.hp,
					state: e.state,
					timer: e.timer,
				})),
			interacts: S.interacts
				.filter((i) => i.enabled && (!i.can || i.can()))
				.map((i) => ({
					id: i.id,
					x: i.x,
					z: i.z,
					radius: i.radius,
					label: typeof i.label === "function" ? i.label() : i.label,
				})),
			metrics: { ...metrics },
			tune: { ...tune },
			settings: { ...settings },
			error: loadingError,
		};
	},
	start: () => {
		S.attract = false;
		$("attract-banner").classList.add("hidden");
		newRun();
	},
	input: (input) => Object.assign(latestInput, input),
	step: (seconds, input = {}) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) {
			Object.assign(latestInput, input);
			stepWorld(1 / 60);
		}
		visuals(0);
		refreshHUD(0);
		return window.__game.state;
	},
	drive: (x, z, maxSeconds = 20, tolerance = 0.55, autoCombat = false) => {
		const startStage = S.stage;
		let i = 0;
		for (; i < maxSeconds * 60; i++) {
			const p = localPlayer(),
				dx = x - p.pos.x,
				dz = z - p.pos.z,
				n = Math.hypot(dx, dz);
			if (n < tolerance && (p.roll || 0) <= 0) break;
			latestInput = {
				x: (dx * 0.821 - dz * 0.571) / n,
				z: (dx * 0.571 + dz * 0.821) / n,
				attack: autoCombat,
				interact: false,
				dodge:
					autoCombat &&
					(S.enemies.some(
						(e) =>
							!e.dead &&
							e.state === "windup" &&
							e.timer < 0.3 &&
							dist(e.pos, p.pos) < 4.4,
					) ||
						S.projectiles.some((a) => dist(a, p.pos) < 1.8)),
				tool:
					autoCombat &&
					S.flags.flute &&
					p.toolCd <= 0 &&
					S.enemies.some(
						(e) => !e.dead && e.kind === "snake" && dist(e.pos, p.pos) < 6,
					),
			};
			stepWorld(1 / 60);
			if (S.stage !== startStage) break;
		}
		latestInput.x = 0;
		latestInput.z = 0;
		visuals(0);
		return {
			reached: dist(localPlayer().pos, { x, z }) < tolerance,
			steps: i,
			stage: S.stage,
			pos: { ...localPlayer().pos },
		};
	},
	action: (name) => {
		const p = localPlayer();
		if (name === "interact") return interact(p);
		if (name === "attack") return attack(p);
		if (name === "tool") return useTool(p);
		if (name === "dodge") return dodge(p, latestInput);
	},
	menu: (kind) => openMenu(kind),
	resume: () => {
		menu = null;
		menuTrail.length = 0;
		$("modal").classList.add("hidden");
	},
	attract: startAttract,
	exitAttract: stopAttract,
	idle: () => {
		lastActivity = performance.now() - 10001;
	},
	audio: () => audio.offlineTest(),
	unlockAudio: () => audio.unlock(),
	debug: {
		teleport: (x, y, z) => {
			const p = localPlayer();
			p.pos = { x, y, z };
			p.vy = 0;
			p.body.setTranslation({ x, y: y + 0.92, z }, true);
			p.body.setNextKinematicTranslation({ x, y: y + 0.92, z });
			world.step();
			visuals(0);
		},
		setStage: setDevStage,
		tune: (values) => Object.assign(tune, values),
		flags: (values) => Object.assign(S.flags, values),
		god: (value) => (debug.god = value),
		freeze: (value) => (debug.freeze = value),
		hurt: (amount = 1) => {
			const p = localPlayer();
			p.invuln = 0;
			return damagePlayer(p, amount);
		},
		spawn: (kind, x, z) => spawnEnemy(kind, x, z).id,
		snapshot: makeSnapshot,
		events: () => [...debugLog],
		colliderCount: () => world?.colliders.len(),
		dispose: () => {
			renderer.setAnimationLoop(null);
			standalone?.close();
			audio.stop();
		},
	},
	room: {
		create: createRoom,
		join: joinRoom,
		close: () => returnTitle(),
		get code() {
			return standalone?.code;
		},
	},
	render: () => {
		renderer.render(scene, camera);
		return { frames: metrics.frames, backend: window.__game.backend };
	},
};
boot();
