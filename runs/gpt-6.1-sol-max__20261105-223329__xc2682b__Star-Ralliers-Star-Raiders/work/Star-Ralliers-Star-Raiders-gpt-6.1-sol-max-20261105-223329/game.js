import RAPIER from "rapier";
import * as THREE from "three/webgpu";

const $ = (id) => document.getElementById(id),
	clamp = THREE.MathUtils.clamp,
	lerp = THREE.MathUtils.lerp;
const V = () => new THREE.Vector3(),
	TAU = Math.PI * 2;
const seedRng = (a) => () => {
	a |= 0;
	a = (a + 0x6d2b79f5) | 0;
	let t = Math.imul(a ^ (a >>> 15), 1 | a);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const visRng = seedRng(42398);
let rng = seedRng(771);
const defaults = {
	enemyHull: 1,
	enemyDamage: 1,
	enemySpeed: 1,
	fireInterval: 0.19,
	aimAssist: 0.75,
	energyDrain: 1,
	siegeSpeed: 1,
	timeScale: 1,
};
const settings = {
	master: 0.65,
	music: 0.1,
	sfx: 0.75,
	sensitivity: 1,
	invert: false,
	glyphs: "ps",
	shake: 0.7,
	assist: true,
	reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("ralliers-settings") || "{}"),
	);
} catch (e) {}
const tune = { ...defaults },
	audio = new SynthAudio();
audio.masterVolume = settings.master;
audio.musicVolume = settings.music;
audio.sfxVolume = settings.sfx;
const input = {
	keys: new Set(),
	fire: false,
	boost: false,
	x: 0,
	y: 0,
	roll: 0,
	throttle: 0,
	mouseX: 0,
	mouseY: 0,
	pointer: false,
	touch: new Map(),
	touchTurn: { x: 0, y: 0 },
	touchThrust: 0,
	kind: matchMedia("(pointer:coarse)").matches ? "touch" : "kb",
	pad: null,
	buttons: [],
	menuAxisAt: 0,
};
const state = {
	mode: "loading",
	overlay: null,
	modal: null,
	returnOverlay: null,
	attract: false,
	auto: false,
	hubEnded: false,
	hubStarted: false,
	ready: false,
	time: 0,
	missionTime: 0,
	idleAt: performance.now(),
	score: 0,
	kills: 0,
	total: 11,
	shots: 0,
	hits: 0,
	jumps: 0,
	docks: 0,
	usedEnergy: 0,
	win: false,
	reason: "",
	sector: "C3",
	selected: "D3",
	target: null,
	shake: 0,
	hitFlash: 0,
	toastUntil: 0,
	commUntil: 0,
	warp: null,
	docking: null,
	pulseCd: 0,
	fireCd: 0,
	lock: 0,
	enemyTimer: 0,
	autoWait: 0,
	autoDocked: false,
	debug: false,
	god: false,
	freeze: false,
	stats: {
		physicsSteps: 0,
		collisions: 0,
		frames: 0,
		nativeMixers: 0,
		attractStarts: 0,
		projectiles: 0,
		ghostUpdates: 0,
	},
};
let scene,
	camera,
	renderer,
	sky,
	cockpit,
	hero,
	heroMixer,
	world,
	events,
	playerBody,
	playerCollider,
	station,
	shuttle,
	debugLines;
const enemies = [],
	bullets = [],
	debris = [],
	effects = [],
	mixers = [],
	entityByCollider = new Map(),
	ghosts = new Map();
const player = {
	position: V(),
	velocity: V(),
	yaw: 0,
	pitch: 0,
	roll: 0,
	throttle: 0.22,
	hull: 100,
	shield: 100,
	energy: 1000,
	shieldOn: true,
	lastHit: -100,
	engineDamaged: false,
};
let sectors = {},
	bases = [],
	lastRender = performance.now(),
	accumulator = 0,
	lastUI = 0,
	lastNet = 0,
	lastProgress = 0,
	frameID = 0,
	hubInfo = null;
const wing = new WingLink(receiveNetwork, renderWingStatus);
const palette = {
	ink: 0x06121e,
	cream: 0xefdcbc,
	teal: 0x69e2ce,
	orange: 0xfb8650,
	navy: 0x18404d,
	blue: 0x4c8b9a,
	red: 0xec5b43,
};
const mats = {};
const geometries = {};
function basic(color, opacity = 1) {
	return new THREE.MeshBasicMaterial({
		color,
		transparent: opacity < 1,
		opacity,
		depthWrite: opacity === 1,
	});
}
function toon(color) {
	const key = "t" + color;
	if (mats[key]) return mats[key];
	const data = new Uint8Array([55, 150, 255]);
	const grad = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
	grad.needsUpdate = true;
	grad.minFilter = grad.magFilter = THREE.NearestFilter;
	return (mats[key] = new THREE.MeshToonNodeMaterial({
		color,
		gradientMap: grad,
	}));
}
const ink = basic(palette.ink);
ink.side = THREE.BackSide;
function shape(
	parent,
	geometry,
	material,
	pos = [0, 0, 0],
	scale = [1, 1, 1],
	rot = [0, 0, 0],
	outline = true,
) {
	const m = new THREE.Mesh(
		geometry,
		typeof material === "number" ? toon(material) : material,
	);
	m.position.set(...pos);
	m.scale.set(...scale);
	m.rotation.set(...rot);
	parent.add(m);
	if (outline) {
		const o = new THREE.Mesh(geometry, ink);
		o.scale.setScalar(1.045);
		m.add(o);
	}
	return m;
}
function box(parent, mat, pos, scale, rot = [0, 0, 0], outline = true) {
	geometries.box ??= new THREE.BoxGeometry(1, 1, 1);
	return shape(parent, geometries.box, mat, pos, scale, rot, outline);
}
function cone(parent, mat, pos, scale, rot = [0, 0, 0], outline = true) {
	geometries.cone ??= new THREE.ConeGeometry(1, 1, 4);
	return shape(parent, geometries.cone, mat, pos, scale, rot, outline);
}
function orb(parent, mat, pos, r = 1, outline = true) {
	geometries.orb ??= new THREE.IcosahedronGeometry(1, 1);
	return shape(parent, geometries.orb, mat, pos, [r, r, r], [0, 0, 0], outline);
}
function ring(parent, r, t, color, pos = [0, 0, 0], rot = [0, 0, 0]) {
	return shape(
		parent,
		new THREE.TorusGeometry(r, t, 5, 64),
		typeof color === "number" ? toon(color) : color,
		pos,
		[1, 1, 1],
		rot,
		true,
	);
}
function animate(root, name, duration, tracks, loop = true) {
	const mixer = new THREE.AnimationMixer(root),
		clip = new THREE.AnimationClip(name, duration, tracks),
		action = mixer.clipAction(clip);
	if (!loop) {
		action.setLoop(THREE.LoopOnce, 1);
		action.clampWhenFinished = true;
	}
	action.play();
	mixers.push(mixer);
	root.userData.mixer = mixer;
	state.stats.nativeMixers++;
	return mixer;
}
function createInterceptor(ghost = false, color = palette.teal) {
	const group = new THREE.Group(),
		rig = new THREE.Group();
	group.add(rig);
	const hull = ghost ? basic(color, 0.38) : toon(palette.cream),
		dark = ghost ? basic(color, 0.28) : toon(palette.navy),
		accent = ghost ? basic(color, 0.7) : toon(palette.orange);
	box(rig, hull, [0, 0, 0], [1.7, 0.9, 5.8], [0.08, 0, 0]);
	cone(
		rig,
		hull,
		[0, 0, -4.1],
		[1.2, 3.6, 0.75],
		[Math.PI / 2, 0, Math.PI / 4],
	);
	box(rig, dark, [0, 0.65, -0.9], [1.25, 0.6, 2.2], [0.13, 0, 0]);
	box(
		rig,
		basic(0x81e7df),
		[0, 0.83, -1.3],
		[0.85, 0.15, 1.6],
		[0.13, 0, 0],
		false,
	);
	for (let s of [-1, 1]) {
		const wingPart = new THREE.Group();
		wingPart.name = s < 0 ? "port" : "starboard";
		wingPart.position.set(s * 0.65, 0, 0.6);
		rig.add(wingPart);
		box(
			wingPart,
			hull,
			[s * 2.5, -0.1, 0.35],
			[5.5, 0.32, 2.5],
			[0, s * 0.29, s * 0.07],
		);
		box(
			wingPart,
			accent,
			[s * 4.3, 0, 0.9],
			[1.4, 0.42, 2.8],
			[0, s * 0.29, s * 0.07],
		);
		box(wingPart, dark, [s * 2.1, -0.25, 1.1], [1.1, 1.05, 3.5], [0, 0, 0]);
		box(
			wingPart,
			accent,
			[s * 2.1, 0.42, 1.9],
			[0.16, 1.3, 1.4],
			[0.2, 0, s * 0.05],
		);
		box(
			wingPart,
			basic(palette.teal),
			[s * 2.1, -0.25, 2.88],
			[0.65, 0.65, 0.08],
			[0, 0, 0],
			false,
		);
		cone(
			wingPart,
			basic(palette.teal, 0.65),
			[s * 2.1, -0.25, 4.2],
			[0.5, 2.5, 0.5],
			[-Math.PI / 2, 0, 0],
			false,
		);
		box(wingPart, dark, [s * 4.2, -0.2, -1.8], [0.18, 0.3, 3.1], [0, 0, 0]);
		box(
			wingPart,
			basic(palette.orange),
			[s * 4.2, -0.2, -3.4],
			[0.24, 0.3, 0.2],
			[0, 0, 0],
			false,
		);
	}
	box(rig, accent, [0, 0.55, 2], [0.2, 1.8, 1.8], [0.3, 0, 0]);
	animate(rig, "Ion wing trim", 4, [
		new THREE.NumberKeyframeTrack("port.rotation[z]", [0, 2, 4], [0, -0.04, 0]),
		new THREE.NumberKeyframeTrack(
			"starboard.rotation[z]",
			[0, 2, 4],
			[0, 0.04, 0],
		),
		new THREE.NumberKeyframeTrack(".position[y]", [0, 2, 4], [0, 0.08, 0]),
	]);
	return group;
}
function createEnemy(type) {
	const g = new THREE.Group(),
		rig = new THREE.Group();
	g.add(rig);
	const c =
		type === "crown" ? palette.orange : type === "lancer" ? 0xadb8ba : 0xef774c;
	const hull = toon(c),
		dark = toon(palette.navy),
		glow = basic(0xffd380);
	if (type === "crown") {
		orb(rig, hull, [0, 0, 0], 0.9);
		for (let j = 0; j < 6; j++) {
			const a = (j * TAU) / 6;
			box(
				rig,
				dark,
				[Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0.2],
				[0.8, 0.6, 2.4],
				[0, 0, a],
			);
			cone(
				rig,
				hull,
				[Math.cos(a) * 2.4, Math.sin(a) * 2.4, -0.3],
				[0.75, 2, 0.55],
				[0, 0, a - Math.PI / 2],
			);
			orb(rig, glow, [Math.cos(a) * 2.2, Math.sin(a) * 2.2, -1.1], 0.18, false);
		}
		ring(rig, 1.4, 0.14, palette.cream);
		orb(rig, glow, [0, 0, -0.85], 0.48, false);
		const shell = new THREE.Mesh(
			new THREE.IcosahedronGeometry(3, 1),
			basic(palette.teal, 0.09),
		);
		rig.add(shell);
		shell.name = "shield";
		const wire = new THREE.LineSegments(
			new THREE.EdgesGeometry(shell.geometry),
			new THREE.LineBasicMaterial({
				color: palette.teal,
				transparent: true,
				opacity: 0.35,
			}),
		);
		shell.add(wire);
		animate(rig, "Command core rotation", 9, [
			new THREE.NumberKeyframeTrack(".rotation[z]", [0, 9], [0, TAU]),
		]);
	} else {
		box(rig, dark, [0, 0, 0], [1.1, 0.8, 2.2]);
		orb(rig, glow, [0, 0, -1.1], 0.43, false);
		for (const s of [-1, 1]) {
			const wingPart = new THREE.Group();
			wingPart.name = s < 0 ? "port" : "starboard";
			rig.add(wingPart);
			box(
				wingPart,
				hull,
				[s * 1.3, 0, 0.2],
				[1.1, type === "lancer" ? 2.4 : 1.8, 0.8],
				[0, 0, s * 0.22],
			);
			cone(
				wingPart,
				hull,
				[s * 2, 0, -0.6],
				[0.65, 2.4, 0.6],
				[Math.PI / 2, 0, s * 0.15],
			);
			box(
				wingPart,
				palette.ink,
				[s * 1.35, 0, -0.28],
				[0.65, 0.12, 0.1],
				[0, 0, s * 0.22],
				false,
			);
			box(
				wingPart,
				palette.ink,
				[s * 1.25, 0.45, -0.25],
				[0.6, 0.12, 0.1],
				[0, 0, s * 0.22],
				false,
			);
			box(
				wingPart,
				glow,
				[s * 1.5, 0, 0.68],
				[0.25, 0.5, 0.1],
				[0, 0, 0],
				false,
			);
			if (type === "lancer")
				box(wingPart, hull, [s * 1.3, -1.1, 0.6], [0.9, 0.3, 2.3]);
		}
		animate(rig, "Vex folding attack wings", 2.5, [
			new THREE.NumberKeyframeTrack(
				"port.rotation[z]",
				[0, 1.25, 2.5],
				[-0.08, 0.12, -0.08],
			),
			new THREE.NumberKeyframeTrack(
				"starboard.rotation[z]",
				[0, 1.25, 2.5],
				[0.08, -0.12, 0.08],
			),
		]);
	}
	return g;
}
function createStation() {
	const g = new THREE.Group(),
		rotor = new THREE.Group();
	rotor.name = "rotor";
	g.add(rotor);
	ring(rotor, 30, 3.6, palette.cream);
	ring(rotor, 35, 0.8, palette.orange);
	ring(rotor, 27, 0.6, palette.teal);
	for (let i = 0; i < 6; i++) {
		const a = (i * TAU) / 6;
		box(
			rotor,
			palette.navy,
			[Math.cos(a) * 28, Math.sin(a) * 28, 0],
			[13, 5, 12],
			[0, 0, a],
		);
		box(
			rotor,
			palette.orange,
			[Math.cos(a) * 33, Math.sin(a) * 33, -7],
			[8, 2, 1],
			[0, 0, a],
		);
		box(
			rotor,
			basic(palette.teal),
			[Math.cos(a) * 32, Math.sin(a) * 32, -7.6],
			[4, 1, 0.2],
			[0, 0, a],
			false,
		);
		box(
			g,
			palette.navy,
			[Math.cos(a) * 14, Math.sin(a) * 14, 4],
			[27, 1.2, 2],
			[0, 0, a],
		);
	}
	box(g, palette.cream, [0, 0, 8], [16, 11, 22]);
	box(g, palette.navy, [0, 0, -5], [12, 7, 3]);
	box(g, basic(palette.teal), [0, 0, -6.7], [8, 4, 0.3], [0, 0, 0], false);
	ring(g, 8, 0.5, palette.orange, [0, 0, -7]);
	animate(g, "Relay habitat rotation", 40, [
		new THREE.NumberKeyframeTrack("rotor.rotation[z]", [0, 40], [0, TAU]),
	]);
	return g;
}
function createCockpit() {
	const g = new THREE.Group();
	const dash = toon(0x12303b),
		top = toon(0x28515a);
	box(g, dash, [0, -1.58, -2.05], [4.9, 0.6, 1.2], [0.15, 0, 0]);
	box(g, top, [0, -1.26, -2.4], [1.55, 0.18, 0.55], [0.2, 0, 0]);
	for (const s of [-1, 1]) {
		box(g, dash, [s * 2.17, -1.1, -2.3], [0.35, 0.9, 2.6], [0.05, 0, s * -0.3]);
		box(
			g,
			palette.cream,
			[s * 2.35, -0.35, -2.25],
			[0.11, 2.8, 0.14],
			[0, 0, s * -0.36],
		);
		box(
			g,
			palette.navy,
			[s * 2.52, 0.54, -2.27],
			[0.15, 1.3, 0.15],
			[0, 0, s * -0.6],
		);
		box(g, top, [s * 1.55, -1.22, -1.95], [1.2, 0.14, 0.8], [0.2, 0, s * 0.07]);
		box(
			g,
			basic(palette.teal),
			[s * 1.48, -1.13, -2.13],
			[0.7, 0.01, 0.36],
			[0.2, 0, 0],
			false,
		);
		for (let i = 0; i < 4; i++)
			box(
				g,
				basic(i === 0 ? palette.orange : palette.teal),
				[s * (0.9 + i * 0.16), -1.12, -2.25],
				[0.045, 0.02, 0.09],
				[0.2, 0, 0],
				false,
			);
		box(
			g,
			palette.orange,
			[s * 2.31, -0.92, -2.33],
			[0.16, 0.25, 0.16],
			[0, 0, s * -0.36],
		);
	}
	return g;
}
function canvasTexture(draw, w = 512, h = 512) {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	draw(c.getContext("2d"), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}
async function initScene() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x071a28);
	scene.fog = new THREE.FogExp2(0x071a28, 0.00015);
	camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 8000);
	scene.add(camera);
	renderer = new THREE.WebGPURenderer({
		antialias: true,
		powerPreference: "high-performance",
		forceWebGL:
			new URLSearchParams(location.search).has("webgl") || !navigator.gpu,
	});
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.setSize(innerWidth, innerHeight);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.2;
	await renderer.init();
	$("viewport").appendChild(renderer.domElement);
	renderer.domElement.setAttribute(
		"aria-label",
		"Star Ralliers flight viewport",
	);
	scene.add(new THREE.AmbientLight(0xa3d5e3, 2.0));
	const sun = new THREE.DirectionalLight(0xffd7a7, 4.1);
	sun.position.set(-80, 150, 100);
	scene.add(sun);
	const rim = new THREE.DirectionalLight(0x70d5db, 2.2);
	rim.position.set(120, -25, -180);
	scene.add(rim);
	sky = new THREE.Group();
	scene.add(sky);
	const starGeo = new THREE.BufferGeometry(),
		starPos = [],
		starColors = [];
	for (let i = 0; i < 2200; i++) {
		const p = new THREE.Vector3(visRng() - 0.5, visRng() - 0.5, visRng() - 0.5)
			.normalize()
			.multiplyScalar(1700 + visRng() * 1800);
		starPos.push(p.x, p.y, p.z);
		const c = new THREE.Color(
			i % 9 === 0 ? 0xffc69a : i % 4 === 0 ? 0x6cd9dc : 0xd3e7df,
		);
		starColors.push(c.r, c.g, c.b);
	}
	starGeo.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(starPos, 3),
	);
	starGeo.setAttribute(
		"color",
		new THREE.Float32BufferAttribute(starColors, 3),
	);
	sky.add(
		new THREE.Points(
			starGeo,
			new THREE.PointsMaterial({
				size: 2.9,
				vertexColors: true,
				sizeAttenuation: true,
				transparent: true,
				opacity: 0.9,
			}),
		),
	);
	const mist = canvasTexture(
		(ctx, w, h) => {
			const r = seedRng(555);
			for (let i = 0; i < 40; i++) {
				const x = r() * w,
					y = r() * h,
					rad = 40 + r() * 180,
					gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
				gr.addColorStop(
					0,
					i % 3 === 0 ? "rgba(244,139,84,.13)" : "rgba(63,157,171,.1)",
				);
				gr.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = gr;
				ctx.fillRect(0, 0, w, h);
			}
		},
		1024,
		512,
	);
	const nebula = new THREE.Sprite(
		new THREE.SpriteMaterial({
			map: mist,
			transparent: true,
			depthWrite: false,
			opacity: 0.8,
		}),
	);
	nebula.position.set(100, 200, -2800);
	nebula.scale.set(7200, 3600, 1);
	sky.add(nebula);
	const planet = new THREE.Group();
	planet.position.set(600, 110, -1600);
	planet.rotation.z = 0.25;
	sky.add(planet);
	const tex = canvasTexture(
		(ctx, w, h) => {
			ctx.fillStyle = "#366c75";
			ctx.fillRect(0, 0, w, h);
			for (let i = 0; i < 40; i++) {
				const y = visRng() * h;
				ctx.fillStyle = ["#54898a", "#75a8a1", "#254a5a", "#c8c4a0", "#3c7280"][
					i % 5
				];
				ctx.beginPath();
				ctx.moveTo(0, y);
				for (let x = 0; x <= w; x += 40)
					ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 8);
				for (let x = w; x >= 0; x -= 40)
					ctx.lineTo(x, y + 14 + Math.sin(x * 0.012 + i) * 6);
				ctx.closePath();
				ctx.fill();
			}
		},
		1024,
		512,
	);
	shape(
		planet,
		new THREE.SphereGeometry(415, 80, 48),
		new THREE.MeshToonNodeMaterial({ map: tex, color: 0x82bcb9 }),
		[0, 0, 0],
		[1, 1, 1],
		[0, 0, 0.2],
	);
	for (let i = 0; i < 5; i++) {
		const r = new THREE.Mesh(
			new THREE.RingGeometry(470 + i * 32, 489 + i * 32, 100),
			new THREE.MeshBasicMaterial({
				color: i % 2 ? 0x70b6ad : 0xa9cfc0,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: i % 2 ? 0.18 : 0.37,
			}),
		);
		r.rotation.x = -1.08;
		r.rotation.y = 0.16;
		planet.add(r);
	}
	const moon = orb(sky, toon(0xb4a08d), [-700, 430, -2200], 140);
	moon.rotation.z = 0.6;
	hero = createInterceptor();
	hero.position.set(30, -2, -75);
	hero.rotation.set(0.28, -0.59, -0.25);
	hero.scale.setScalar(5);
	scene.add(hero);
	heroMixer = animate(hero, "Patrol idle", 8, [
		new THREE.NumberKeyframeTrack(".position[y]", [0, 4, 8], [-2, 0, -2]),
		new THREE.NumberKeyframeTrack(
			".rotation[z]",
			[0, 4, 8],
			[-0.25, -0.18, -0.25],
		),
	]);
	cockpit = createCockpit();
	camera.add(cockpit);
	cockpit.visible = false;
	station = createStation();
	station.position.set(-80, 50, -550);
	scene.add(station);
	shuttle = createInterceptor();
	shuttle.scale.setScalar(1.05);
	shuttle.visible = false;
	scene.add(shuttle);
	resize();
}
function resetSectors() {
	sectors = {};
	for (let y = 0; y < 4; y++)
		for (let x = 0; x < 5; x++) {
			const code = String.fromCharCode(65 + x) + (y + 1);
			sectors[code] = {
				code,
				x,
				y,
				name: ["Silent reach", "Dust corridor", "Outer drift", "Deep watch"][
					(x + y) % 4
				],
				kind: "empty",
				fleet: [],
				cleared: false,
				hazard: (x + y) % 4 === 1,
			};
		}
	Object.assign(sectors.C3, { name: "Kestrel relay", kind: "base" });
	Object.assign(sectors.B4, { name: "Meridian relay", kind: "base" });
	Object.assign(sectors.D3, {
		name: "Kestrel blockade",
		kind: "fleet",
		fleet: ["splinter", "splinter", "lancer"],
		threat: "C3",
	});
	Object.assign(sectors.B2, {
		name: "Meridian raiding party",
		kind: "fleet",
		fleet: ["splinter", "lancer", "splinter", "lancer"],
		threat: "B4",
	});
	Object.assign(sectors.E1, {
		name: "Vex command fleet",
		kind: "fleet",
		fleet: ["lancer", "splinter", "splinter", "crown"],
	});
	bases = [
		{ code: "C3", health: 100, siege: 210, alive: true, threat: "D3" },
		{ code: "B4", health: 100, siege: 330, alive: true, threat: "B2" },
	];
}
function removeMixer(root) {
	root?.traverse((o) => {
		if (o.userData.mixer) {
			const m = o.userData.mixer;
			m.stopAllAction();
			m.uncacheRoot(o);
			const i = mixers.indexOf(m);
			if (i >= 0) mixers.splice(i, 1);
		}
	});
}
function removeEntity(e) {
	if (e.removed) return;
	e.removed = true;
	if (e.mesh) {
		scene.remove(e.mesh);
		removeMixer(e.mesh);
	}
	if (e.collider) entityByCollider.delete(e.collider.handle);
	if (e.body && world) world.removeRigidBody(e.body);
}
function clearWorld() {
	for (const e of [...enemies, ...bullets, ...debris]) removeEntity(e);
	enemies.length = bullets.length = debris.length = 0;
	for (const e of effects) scene.remove(e.mesh);
	effects.length = 0;
	if (world) {
		world.free();
		events.free();
	}
	entityByCollider.clear();
	world = new RAPIER.World({ x: 0, y: 0, z: 0 });
	world.timestep = 1 / 60;
	events = new RAPIER.EventQueue(true);
	playerBody = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(0, 0, 0)
			.setLinearDamping(0)
			.lockRotations()
			.setCcdEnabled(true),
	);
	playerCollider = world.createCollider(
		RAPIER.ColliderDesc.ball(3.7)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		playerBody,
	);
	entityByCollider.set(playerCollider.handle, { kind: "player" });
}
function spawnEnemy(type, index, pos = null) {
	const scale = type === "crown" ? 12 : type === "lancer" ? 6.0 : 5.2,
		mesh = createEnemy(type);
	mesh.scale.setScalar(scale);
	const p =
		pos ||
		new THREE.Vector3(
			((index % 3) - 1) * 94,
			(index % 2) * 55 - 18,
			-240 - index * 66,
		);
	mesh.position.copy(p);
	scene.add(mesh);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z),
	);
	const radius = type === "crown" ? 29 : type === "lancer" ? 12 : 10;
	const collider = world.createCollider(
		RAPIER.ColliderDesc.ball(radius)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		body,
	);
	const maxHp =
		(type === "crown" ? 28 : type === "lancer" ? 6 : 3) * tune.enemyHull;
	const e = {
		kind: "enemy",
		type,
		mesh,
		body,
		collider,
		position: p.clone(),
		anchor: p.clone(),
		velocity: V(),
		radius,
		hp: maxHp,
		maxHp,
		phase: rng() * TAU,
		fire: 1.5 + index * 0.7,
		age: 0,
		dead: false,
	};
	enemies.push(e);
	entityByCollider.set(collider.handle, e);
	return e;
}
function createAsteroid(p, size = 11) {
	const mesh = shape(
		new THREE.Group(),
		new THREE.IcosahedronGeometry(size, 0),
		toon(0x59727b),
	);
	const g = mesh.parent;
	g.position.copy(p);
	scene.add(g);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(p.x, p.y, p.z)
			.setLinvel(-2, 1, 4)
			.setAngvel({ x: 0.15, y: 0.07, z: 0.1 }),
	);
	const collider = world.createCollider(
		RAPIER.ColliderDesc.ball(size).setActiveEvents(
			RAPIER.ActiveEvents.COLLISION_EVENTS,
		),
		body,
	);
	const a = {
		kind: "rock",
		mesh: g,
		body,
		collider,
		life: 300,
		hp: 2,
		position: p.clone(),
	};
	debris.push(a);
	entityByCollider.set(collider.handle, a);
}
function enterSector(code) {
	for (const e of [...enemies, ...bullets, ...debris]) removeEntity(e);
	enemies.length = bullets.length = debris.length = 0;
	state.sector = code;
	const s = sectors[code];
	player.position.set(0, 0, 0);
	player.velocity.set(0, 0, 0);
	player.yaw = player.pitch = player.roll = 0;
	playerBody.setTranslation({ x: 0, y: 0, z: 0 }, true);
	playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	player.throttle = s.kind === "base" ? 0.08 : 0.23;
	state.target = null;
	state.lock = 0;
	const base = bases.find((b) => b.code === code);
	station.visible = s.kind === "base" && base?.alive;
	station.position.set(0, 0, -240);
	shuttle.visible = false;
	s.fleet.forEach((type, i) => spawnEnemy(type, i));
	if (s.hazard && s.kind !== "base") {
		for (let i = 0; i < 5; i++)
			createAsteroid(
				new THREE.Vector3((i - 2) * 65, ((i * 37) % 90) - 45, -110 - i * 70),
				7 + i * 2,
			);
	}
	if (enemies.length) {
		cycleTarget();
		toast("RED ALERT · " + s.fleet.length + " HOSTILES", "ATTACK COMPUTER", 3);
		audio.alert();
		if (s.fleet.includes("crown"))
			comms(
				"The Crown’s shield turns away long shots. Close to 190 meters, then make it count.",
				7,
			);
	} else if (base?.alive) {
		toast("HYPERWARP COMPLETE", "NAVIGATION", 2);
		comms(
			state.kills >= state.total
				? "All sectors clear. Dock and bring the flight recorder home."
				: "Relay in sight. Slow to under 35, approach within 115 meters, then request docking.",
			6,
		);
	} else toast("SECTOR CLEAR", "LONG RANGE SCAN", 2);
	updateMap();
}
function startMission({ attract = false, seed = 771, auto = false } = {}) {
	if (AIHub.active && state.hubEnded) return;
	clearWorld();
	resetSectors();
	rng = seedRng(seed);
	Object.assign(state, {
		mode: "playing",
		overlay: null,
		modal: null,
		attract,
		auto,
		missionTime: 0,
		score: 0,
		kills: 0,
		shots: 0,
		hits: 0,
		jumps: 0,
		docks: 0,
		usedEnergy: 0,
		win: false,
		reason: "",
		target: null,
		warp: null,
		docking: null,
		pulseCd: 0,
		fireCd: 0,
		lock: 0,
		autoWait: 1.3,
		autoDocked: false,
		hitFlash: 0,
		aft: false,
		freeze: false,
		god: attract,
	});
	Object.assign(player, {
		yaw: 0,
		pitch: 0,
		roll: 0,
		throttle: 0.18,
		hull: 100,
		shield: 100,
		energy: 1000,
		shieldOn: true,
		lastHit: -100,
		engineDamaged: false,
	});
	hero.visible = false;
	cockpit.visible = true;
	heroMixer.timeScale = 0;
	enterSector("C3");
	comms(
		"Cadet, the frontier is counting on you. Chart a jump to D3. Clear three fleets, then come home.",
		9,
	);
	if (attract) state.stats.attractStarts++;
	refreshScreens();
}
function spendEnergy(n) {
	if (state.god) return;
	const used = n * tune.energyDrain;
	player.energy = Math.max(0, player.energy - used);
	state.usedEnergy += used;
}
function forwardVector() {
	return new THREE.Vector3(0, 0, -1).applyEuler(
		new THREE.Euler(player.pitch, player.yaw, 0, "YXZ"),
	);
}
function aimVector() {
	const f = forwardVector();
	if (state.aft) f.negate();
	if (input.pointer) {
		const q = new THREE.Quaternion().setFromEuler(
			new THREE.Euler(player.pitch, player.yaw, 0, "YXZ"),
		);
		f.add(
			new THREE.Vector3(
				input.mouseX * 0.16,
				-input.mouseY * 0.12,
				0,
			).applyQuaternion(q),
		).normalize();
	}
	return f;
}
function cycleTarget() {
	const alive = enemies.filter((e) => !e.dead);
	if (!alive.length) {
		state.target = null;
		return;
	}
	const i = alive.indexOf(state.target);
	state.target = alive[(i + 1) % alive.length];
	state.lock = 0;
	audio.select();
}
function projectile(position, direction, team, damage = 1) {
	const mat = team === "player" ? basic(palette.teal) : basic(palette.orange);
	geometries.bullet ??= new THREE.SphereGeometry(1, 6, 4);
	const mesh = new THREE.Mesh(geometries.bullet, mat);
	mesh.scale.set(
		team === "player" ? 1.2 : 2,
		team === "player" ? 1.2 : 2,
		team === "player" ? 5 : 3.5,
	);
	mesh.position.copy(position);
	mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
	scene.add(mesh);
	const body = world.createRigidBody(
		RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(position.x, position.y, position.z)
			.setLinvel(
				direction.x * (team === "player" ? 490 : 145),
				direction.y * (team === "player" ? 490 : 145),
				direction.z * (team === "player" ? 490 : 145),
			)
			.setCcdEnabled(true),
	);
	const collider = world.createCollider(
		RAPIER.ColliderDesc.ball(team === "player" ? 1.8 : 2.3)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
		body,
	);
	const b = {
		kind: "bullet",
		team,
		damage,
		mesh,
		body,
		collider,
		life: team === "player" ? 2.4 : 6,
		dead: false,
	};
	bullets.push(b);
	entityByCollider.set(collider.handle, b);
	state.stats.projectiles++;
	return b;
}
function rumble(strong = 0.2, weak = 0.1, duration = 100) {
	if (input.kind !== "pad") return;
	try {
		input.pad?.vibrationActuator
			?.playEffect("dual-rumble", {
				startDelay: 0,
				duration,
				strongMagnitude: strong,
				weakMagnitude: weak,
			})
			?.catch(() => {});
	} catch (e) {}
}
function fire() {
	if (
		state.fireCd > 0 ||
		state.warp ||
		state.docking ||
		player.energy < 2 ||
		state.mode !== "playing"
	)
		return;
	state.fireCd = tune.fireInterval;
	spendEnergy(2);
	let f = aimVector();
	const t = state.target;
	if (t && !t.dead) {
		const d = t.position.clone().sub(player.position),
			dist = d.length(),
			dir = d.normalize();
		if (f.dot(dir) > 0.965 - tune.aimAssist * 0.025) {
			const lead = t.position.clone().addScaledVector(t.velocity, dist / 490);
			const lock = lead.sub(player.position).normalize();
			f.lerp(lock, tune.aimAssist).normalize();
		}
	}
	const side = new THREE.Vector3(1, 0, 0).applyEuler(
		new THREE.Euler(0, player.yaw, 0),
	);
	for (const s of [-1, 1]) {
		const p = player.position
			.clone()
			.addScaledVector(side, s * 2.5)
			.addScaledVector(f, 6)
			.add(new THREE.Vector3(0, -0.8, 0));
		projectile(p, f, "player", 1);
	}
	state.shots += 2;
	audio.shot();
	rumble(0.04, 0.12, 45);
	state.shake = Math.max(state.shake, 0.08);
}
function enemyFire(e) {
	if (
		state.warp ||
		state.docking ||
		state.overlay === "map" ||
		state.mode !== "playing"
	)
		return;
	let dir = player.position
		.clone()
		.addScaledVector(player.velocity, 0.3)
		.sub(e.position)
		.normalize();
	const scatter = e.type === "crown" ? 0.025 : 0.04;
	dir
		.add(new THREE.Vector3((rng() - 0.5) * scatter, (rng() - 0.5) * scatter, 0))
		.normalize();
	const count = e.type === "crown" ? 5 : e.type === "lancer" ? 3 : 1;
	for (let i = 0; i < count; i++) {
		const d = dir
			.clone()
			.applyAxisAngle(
				new THREE.Vector3(0, 1, 0),
				(i - (count - 1) / 2) * 0.065,
			);
		projectile(
			e.position.clone().addScaledVector(d, e.radius + 5),
			d,
			"enemy",
			e.type === "crown" ? 17 : 13,
		);
	}
}
function burst(position, color = palette.orange, big = false) {
	const mesh = new THREE.Group();
	const shell = orb(mesh, basic(color, 0.55), [0, 0, 0], 1, false);
	const halo = ring(mesh, 1, 0.09, basic(color, 0.8));
	halo.rotation.x = 0.6;
	mesh.position.copy(position);
	scene.add(mesh);
	effects.push({
		mesh,
		life: big ? 1.25 : 0.65,
		maxLife: big ? 1.25 : 0.65,
		type: "burst",
		size: big ? 65 : 26,
		shell,
		halo,
	});
	for (let i = 0; i < (big ? 26 : 12); i++) {
		const p = position
				.clone()
				.add(
					new THREE.Vector3(
						rng() - 0.5,
						rng() - 0.5,
						rng() - 0.5,
					).multiplyScalar(5),
				),
			g = new THREE.Mesh(
				new THREE.TetrahedronGeometry(big ? 2.5 : 1.5),
				toon(i % 3 === 0 ? palette.cream : color),
			);
		scene.add(g);
		const d = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5)
			.normalize()
			.multiplyScalar(20 + rng() * 55);
		const body = world.createRigidBody(
			RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(p.x, p.y, p.z)
				.setLinvel(d.x, d.y, d.z)
				.setAngvel({ x: rng() * 4, y: rng() * 4, z: rng() * 4 })
				.setLinearDamping(0.4),
		);
		debris.push({ kind: "debris", mesh: g, body, life: 1.5 + rng() * 1.5 });
	}
}
function damageEnemy(e, n) {
	if (e.dead) return;
	const dist = e.position.distanceTo(player.position);
	if (e.type === "crown" && dist > 190) {
		burst(e.position, palette.teal, false);
		if (state.missionTime - (e.warnAt || -100) > 5) {
			e.warnAt = state.missionTime;
			toast("SHIELD DEFLECTED · CLOSE TO 190 m", "TARGET ANALYSIS", 2);
		}
		return;
	}
	e.hp -= n;
	state.hits++;
	if (e.hp > 0) {
		audio.impact();
		return;
	}
	e.dead = true;
	state.kills++;
	state.score += e.type === "crown" ? 900 : e.type === "lancer" ? 250 : 150;
	const s = sectors[state.sector];
	const i = s.fleet.indexOf(e.type);
	if (i >= 0) s.fleet.splice(i, 1);
	burst(e.position, palette.orange, e.type === "crown");
	audio.explode(e.type === "crown");
	state.shake = Math.max(state.shake, e.type === "crown" ? 0.7 : 0.2);
	if (state.target === e) {
		state.target = null;
		setTimeout(() => {
			if (state.mode === "playing" && !state.target) cycleTarget();
		}, 100);
	}
	removeEntity(e);
	if (s.fleet.length === 0) {
		s.cleared = true;
		if (state.kills >= state.total) {
			toast("ALL HOSTILES CLEARED", "SUBSPACE / COMMAND", 5);
			comms(
				"That’s the last of them. Your commission is waiting. Return to a surviving relay and dock.",
				8,
			);
		} else {
			toast("SECTOR SECURED · " + s.name.toUpperCase(), "ATTACK COMPUTER", 4);
			comms(
				"Good shooting, cadet. Check the chart. The other relays still need us.",
				5,
			);
		}
		state.autoWait = 1.5;
		updateMap();
	}
}
function damagePlayer(n) {
	if (state.god || state.warp || state.docking || state.mode !== "playing")
		return;
	let damage = n * tune.enemyDamage;
	player.lastHit = state.missionTime;
	audio.impact();
	rumble(0.55, 0.25, 160);
	state.hitFlash = 0.8;
	state.shake = Math.max(state.shake, 0.4);
	if (player.shieldOn && player.shield > 0) {
		const absorbed = Math.min(player.shield, damage);
		player.shield -= absorbed;
		damage -= absorbed;
	}
	player.hull = Math.max(0, player.hull - damage);
	if (player.hull < 45 && !player.engineDamaged) {
		player.engineDamaged = true;
		toast("ION DRIVE DAMAGED", "DAMAGE CONTROL", 4);
		comms("Backup impulse engaged. Get to a relay base for repairs.", 5);
	}
	if (player.hull <= 0)
		finishMission(
			false,
			"Your ship was lost to Vex fire. The frontier remembers its pilots.",
		);
}
function pulse() {
	if (
		state.pulseCd > 0 ||
		player.energy < 55 ||
		state.warp ||
		state.docking ||
		state.mode !== "playing"
	)
		return;
	state.pulseCd = 14;
	spendEnergy(55);
	audio.pulse();
	rumble(0.65, 0.35, 300);
	const mesh = new THREE.Mesh(
		new THREE.SphereGeometry(1, 24, 16),
		new THREE.MeshBasicMaterial({
			color: palette.teal,
			wireframe: true,
			transparent: true,
			opacity: 0.6,
		}),
	);
	mesh.position.copy(player.position);
	scene.add(mesh);
	effects.push({ type: "pulse", mesh, life: 0.8, maxLife: 0.8, size: 150 });
	for (const b of bullets)
		if (b.team === "enemy" && b.mesh.position.distanceTo(player.position) < 180)
			b.dead = true;
	for (const e of enemies)
		if (!e.dead && e.position.distanceTo(player.position) < 150)
			damageEnemy(e, 5);
	state.shake = 0.45;
	toast("SHOCK PULSE RELEASED", "WEAPONS", 1.5);
}
function toggleShield() {
	if (state.warp || state.docking) return;
	player.shieldOn = !player.shieldOn;
	toast(
		player.shieldOn ? "SHIELDS UP" : "SHIELDS DOWN · ENERGY CONSERVATION",
		"DEFENSE SYSTEMS",
		1.5,
	);
	audio.select();
}
function warpCost(code) {
	const a = sectors[state.sector],
		b = sectors[code];
	return a && b ? Math.round(45 + Math.hypot(a.x - b.x, a.y - b.y) * 34) : 0;
}
function startWarp(code) {
	if (!sectors[code] || state.warp || state.docking || code === state.sector)
		return false;
	const cost = warpCost(code);
	if (player.energy < cost) {
		toast("INSUFFICIENT JUMP ENERGY", "NAVIGATION", 3);
		return false;
	}
	spendEnergy(cost);
	state.warp = {
		code,
		time: 0,
		duration: 4,
		accuracy: 0,
		x: 0,
		y: 0,
		cost,
		beaconX: 0,
		beaconY: 0,
	};
	animate(
		cockpit,
		"Hyperwarp instrument recoil",
		4,
		[
			new THREE.NumberKeyframeTrack(
				".position[z]",
				[0, 0.3, 3.6, 4],
				[0, 0.09, 0.09, 0],
			),
		],
		false,
	);
	state.overlay = null;
	state.aft = false;
	state.jumps++;
	audio.warp();
	toast("HYPERWARP ENGAGED", "NAVIGATION", 1.6);
	input.mouseX = input.mouseY = 0;
	refreshScreens();
	return true;
}
function tryDock() {
	const b = bases.find((b) => b.code === state.sector && b.alive);
	if (!b || state.warp || state.docking) return false;
	const distance = player.position.distanceTo(station.position),
		speed = player.velocity.length();
	if (distance > 115) {
		toast("APPROACH WITHIN 115 m TO DOCK", "RELAY CONTROL", 2);
		return false;
	}
	if (speed > 35) {
		toast("REDUCE ION SPEED BELOW 35", "RELAY CONTROL", 2);
		return false;
	}
	state.docking = {
		time: 0,
		duration: 4.6,
		from: player.position.clone(),
		to: station.position.clone().add(new THREE.Vector3(0, 0, 78)),
		wasShield: player.shieldOn,
	};
	player.shieldOn = false;
	player.velocity.set(0, 0, 0);
	playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	player.throttle = 0;
	shuttle.visible = true;
	shuttle.position.copy(station.position);
	shuttle.quaternion.identity();
	if (shuttle.userData.dockMixer) {
		shuttle.userData.dockMixer.stopAllAction();
		mixers.splice(mixers.indexOf(shuttle.userData.dockMixer), 1);
	}
	const m = animate(
		shuttle,
		"Relay transfer vessel",
		4.6,
		[
			new THREE.VectorKeyframeTrack(
				".position",
				[0, 1.7, 3.0, 4.6],
				[
					station.position.x,
					station.position.y,
					station.position.z,
					player.position.x + 8,
					player.position.y - 3,
					player.position.z - 12,
					player.position.x + 8,
					player.position.y - 3,
					player.position.z - 12,
					station.position.x,
					station.position.y,
					station.position.z,
				],
			),
		],
		false,
	);
	shuttle.userData.dockMixer = m;
	audio.arrive();
	toast("ORBIT ESTABLISHED", "RELAY CONTROL", 2.5);
	refreshScreens();
	return true;
}
function interact() {
	if (state.overlay === "map") {
		startWarp(state.selected);
		return;
	}
	if (state.warp) return;
	if (tryDock()) return;
	if (sectors[state.sector]?.kind !== "base") openMap();
}
function finishMission(win, reason = "") {
	if (state.mode !== "playing") return;
	state.mode = "result";
	state.win = win;
	state.reason = reason;
	state.overlay = null;
	state.score = Math.max(
		0,
		Math.round(
			state.score +
				(win ? 1000 : 0) +
				bases.filter((b) => b.alive).length * 300 -
				state.missionTime * 0.65 -
				state.usedEnergy * 0.15,
		),
	);
	document.exitPointerLock?.();
	if (!state.attract) {
		try {
			const best = Number(localStorage.getItem("ralliers-best") || 0);
			if (state.score > best)
				localStorage.setItem("ralliers-best", state.score);
		} catch (e) {}
		if (AIHub.active && !state.hubEnded)
			AIHub.result({
				score: state.score,
				stats: {
					"Hostiles cleared": state.kills,
					"Bases saved": bases.filter((b) => b.alive).length,
					Time: formatTime(state.missionTime),
				},
				awards: win
					? [
							{
								title: "Frontier guardian",
								detail: "Returned from Operation Last Light.",
							},
						]
					: [],
			});
		if (wing.room) wing.emit({ type: "result", score: state.score, win });
	}
	audio.arrive();
	refreshScreens();
}
function updatePhysics(dt) {
	const mapScale = state.overlay === "map" ? 0.16 : 1;
	const tdt = dt * mapScale;
	state.missionTime += tdt;
	state.fireCd = Math.max(0, state.fireCd - tdt);
	state.pulseCd = Math.max(0, state.pulseCd - tdt);
	if (state.warp) {
		const w = state.warp;
		w.time += dt;
		w.beaconX = Math.sin(w.time * 1.9) * 0.32;
		w.beaconY = Math.cos(w.time * 1.35) * 0.23;
		w.x = lerp(w.x, clamp(input.x + input.mouseX * 0.7, -1, 1), dt * 4);
		w.y = lerp(w.y, clamp(input.y + input.mouseY * 0.7, -1, 1), dt * 4);
		if (state.auto || state.attract || input.kind === "touch") {
			w.x = w.beaconX;
			w.y = w.beaconY;
		}
		const error = Math.hypot(w.x - w.beaconX, w.y - w.beaconY);
		w.accuracy += error < 0.3 ? dt : 0;
		if (w.time >= w.duration) {
			const good = w.accuracy / w.duration > 0.65;
			if (good) player.energy = Math.min(1000, player.energy + w.cost * 0.25);
			const code = w.code;
			state.warp = null;
			enterSector(code);
			audio.arrive();
			if (good) toast("PRECISE JUMP · 25% ENERGY RECOVERED", "NAVIGATION", 2.5);
			refreshScreens();
		}
		return;
	}
	if (state.docking) {
		const d = state.docking;
		d.time += dt;
		const a = clamp(d.time / 1.7, 0, 1);
		player.position.lerpVectors(d.from, d.to, a * a * (3 - 2 * a));
		playerBody.setTranslation(player.position, true);
		player.yaw = lerp(player.yaw, 0, dt * 2);
		player.pitch = lerp(player.pitch, 0, dt * 2);
		if (d.time >= d.duration) {
			player.hull = player.shield = 100;
			player.energy = 1000;
			player.engineDamaged = false;
			player.shieldOn = d.wasShield;
			state.docking = null;
			shuttle.visible = false;
			state.docks++;
			state.autoDocked = true;
			toast("TRANSFER COMPLETE · ALL SYSTEMS RESTORED", "RELAY CONTROL", 3);
			audio.arrive();
			if (state.kills >= state.total)
				finishMission(
					true,
					"Three fleets silenced. The relay lights still burn. Welcome home, Star Rallier.",
				);
			else
				comms(
					"Shipshape and ready. Let’s give the Vex a reason to remember this patrol.",
					5,
				);
			refreshScreens();
		}
		return;
	}
	let turnX = input.x,
		turnY = input.y;
	if (!state.auto && !state.attract) {
		const k = input.keys;
		turnX +=
			(k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
			(k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
		turnY += (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
		if (input.pointer && !document.pointerLockElement) {
			turnX += input.mouseX * 0.8;
			turnY += input.mouseY * 0.8;
		}
		if (input.kind === "touch") {
			turnX += input.touchTurn.x;
			turnY += input.touchTurn.y;
		}
		const invert = settings.invert ? -1 : 1;
		player.yaw -= turnX * 1.35 * settings.sensitivity * tdt;
		player.pitch = clamp(
			player.pitch - turnY * 1.15 * settings.sensitivity * invert * tdt,
			-1.4,
			1.4,
		);
		const throttleAxis =
			(k.has("KeyW") ? 1 : 0) -
			(k.has("KeyS") ? 1 : 0) +
			input.throttle +
			input.touchThrust;
		player.throttle = clamp(player.throttle + throttleAxis * tdt * 0.7, 0, 1);
		if (k.has("KeyX")) player.throttle = 0;
		player.roll = lerp(player.roll, -turnX * 0.18 + input.roll * 0.3, tdt * 4);
	}
	const boost =
		(input.boost ||
			input.keys.has("ShiftLeft") ||
			input.keys.has("ShiftRight")) &&
		player.energy > 15;
	const speed =
		player.throttle * (player.engineDamaged ? 42 : 86) + (boost ? 95 : 0);
	const desired = forwardVector().multiplyScalar(speed);
	player.velocity.lerp(desired, clamp(tdt * 2.5, 0, 1));
	if (state.overlay === "map") player.velocity.multiplyScalar(0.96);
	playerBody.setLinvel(player.velocity, true);
	spendEnergy(tdt * ((player.shieldOn ? 0.22 : 0.05) + (boost ? 7.5 : 0)));
	if (
		player.shieldOn &&
		state.missionTime - player.lastHit > 4 &&
		player.shield < 100 &&
		player.energy > 3
	) {
		player.shield = Math.min(100, player.shield + tdt * 5);
		spendEnergy(tdt * 0.7);
	}
	if (player.energy <= 0 && !state.god)
		finishMission(
			false,
			"Energy exhausted. Mission Control recovered your escape pod. Plan shorter jumps and refuel at a relay.",
		);
	if ((input.fire || input.keys.has("Space")) && state.overlay !== "map")
		fire();
	if (
		input.kind === "touch" &&
		state.pulseCd <= 0 &&
		player.energy > 160 &&
		bullets.some(
			(b) =>
				b.team === "enemy" &&
				!b.dead &&
				b.mesh.position.distanceTo(player.position) < 40,
		)
	)
		pulse();
	if (
		input.kind === "touch" &&
		state.target &&
		!state.target.dead &&
		forwardVector().dot(
			state.target.position.clone().sub(player.position).normalize(),
		) > 0.94
	)
		fire();
	for (const e of enemies) {
		if (e.dead) continue;
		e.age += tdt;
		const old = e.position.clone();
		let desired;
		if (e.type === "splinter") {
			desired = player.position
				.clone()
				.add(
					new THREE.Vector3(
						Math.sin(e.age * 0.2 + e.phase) * 130,
						Math.sin(e.age * 0.31 + e.phase) * 50,
						-145 + Math.cos(e.age * 0.2 + e.phase) * 100,
					),
				);
		} else {
			desired = e.anchor
				.clone()
				.add(
					new THREE.Vector3(
						Math.sin(e.age * 0.15 + e.phase) * 42,
						Math.sin(e.age * 0.18 + e.phase) * 24,
						Math.cos(e.age * 0.12 + e.phase) * 28,
					),
				);
		}
		const delta = desired.sub(e.position),
			step = Math.min(
				delta.length(),
				(e.type === "splinter" ? 37 : e.type === "lancer" ? 19 : 10) *
					tune.enemySpeed *
					tdt,
			);
		if (delta.length() > 0.1)
			e.position.addScaledVector(delta.normalize(), step);
		e.velocity.copy(e.position).sub(old).divideScalar(Math.max(tdt, 0.001));
		e.body.setNextKinematicTranslation(e.position);
		e.mesh.position.copy(e.position);
		e.mesh.lookAt(player.position);
		e.mesh.rotateY(Math.PI);
		e.fire -= tdt;
		if (e.fire <= 0 && e.position.distanceTo(player.position) < 650) {
			enemyFire(e);
			e.fire =
				(e.type === "crown" ? 2.1 : e.type === "lancer" ? 3.0 : 3.5) +
				rng() * 0.5;
		}
		const shield = e.mesh.getObjectByName("shield");
		if (shield) {
			const visible = e.position.distanceTo(player.position) > 190;
			shield.visible = visible;
			shield.rotation.y += tdt * 0.4;
		}
	}
	world.timestep = tdt;
	world.step(events);
	state.stats.physicsSteps++;
	events.drainCollisionEvents((a, b, started) => {
		if (!started) return;
		const A = entityByCollider.get(a),
			B = entityByCollider.get(b);
		if (!A || !B) return;
		state.stats.collisions++;
		let bullet = A.kind === "bullet" ? A : B.kind === "bullet" ? B : null,
			other = bullet === A ? B : A;
		if (bullet && !bullet.dead) {
			if (bullet.team === "player" && other.kind === "enemy" && !other.dead) {
				bullet.dead = true;
				damageEnemy(other, bullet.damage);
			}
			if (bullet.team === "enemy" && other.kind === "player") {
				bullet.dead = true;
				damagePlayer(bullet.damage);
			}
			if (other.kind === "rock") {
				bullet.dead = true;
				other.hp--;
				if (other.hp <= 0) {
					burst(other.mesh.position, 0xa3bbc3);
					other.life = 0;
				}
			}
		} else if (
			(A.kind === "player" && B.kind === "rock") ||
			(B.kind === "player" && A.kind === "rock")
		) {
			damagePlayer(22);
			(A.kind === "rock" ? A : B).life = 0;
		}
	});
	player.position.copy(playerBody.translation());
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		b.life -= tdt;
		if (b.dead || b.life <= 0) {
			removeEntity(b);
			bullets.splice(i, 1);
		} else {
			b.mesh.position.copy(b.body.translation());
		}
	}
	for (let i = debris.length - 1; i >= 0; i--) {
		const d = debris[i];
		d.life -= tdt;
		if (d.life <= 0) {
			removeEntity(d);
			debris.splice(i, 1);
		} else {
			d.mesh.position.copy(d.body.translation());
			d.mesh.quaternion.copy(d.body.rotation());
		}
	}
	for (const b of bases) {
		if (!b.alive || !sectors[b.threat].fleet.length) continue;
		b.siege -= tdt * tune.siegeSpeed;
		if (b.siege < 45 && !b.warned) {
			b.warned = true;
			comms(
				b.code +
					" relay is surrounded. Break the nearby fleet before we lose the station!",
				6,
			);
			audio.alert();
		}
		if (b.siege <= 0) {
			b.alive = false;
			b.health = 0;
			state.score = Math.max(0, state.score - 300);
			toast(
				sectors[b.code].name.toUpperCase() + " DESTROYED",
				"SUBSPACE / EMERGENCY",
				4,
			);
			if (state.sector === b.code) station.visible = false;
			if (!bases.some((b) => b.alive))
				finishMission(
					false,
					"Both relay bases were lost. The invasion cut our last line home.",
				);
			updateMap();
		}
	}
	if (state.target && !state.target.dead) {
		const d = state.target.position.clone().sub(player.position).normalize();
		state.lock = clamp(
			state.lock + (aimVector().dot(d) > 0.98 ? tdt * 2 : -tdt * 3),
			0,
			1,
		);
	} else {
		state.lock = 0;
		if (enemies.some((e) => !e.dead)) cycleTarget();
	}
}
function angleDelta(a, b) {
	return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
function steerAt(position, dt) {
	const d = position.clone().sub(player.position),
		dist = d.length();
	const yaw = Math.atan2(-d.x, -d.z),
		pitch = Math.asin(clamp(d.y / Math.max(1, dist), -1, 1));
	player.yaw += clamp(angleDelta(yaw, player.yaw), -dt * 2.4, dt * 2.4);
	player.pitch += clamp(pitch - player.pitch, -dt * 2, dt * 2);
	player.roll = lerp(
		player.roll,
		clamp(angleDelta(yaw, player.yaw), -0.3, 0.3),
		dt * 3,
	);
	return dist;
}
function updateAutopilot(dt) {
	if (state.warp || state.docking || state.mode !== "playing") return;
	state.autoWait -= dt;
	if (state.overlay === "map") {
		if (state.autoWait < 0) {
			startWarp(state.selected);
			state.autoWait = 0.7;
		}
		return;
	}
	if (enemies.some((e) => !e.dead)) {
		let t = state.target;
		if (!t || t.dead) {
			cycleTarget();
			t = state.target;
		}
		if (!t) return;
		const d = steerAt(t.position, dt);
		player.throttle =
			d > (t.type === "crown" ? 130 : 115) ? 0.7 : d < 65 ? 0.05 : 0.16;
		player.shieldOn = true;
		if (
			forwardVector().dot(t.position.clone().sub(player.position).normalize()) >
			0.97
		)
			fire();
		if (d < 140 && state.pulseCd <= 0 && player.energy > 180) pulse();
		return;
	}
	const needRefill =
		!state.autoDocked && (player.energy < 480 || player.hull < 60);
	if (
		sectors[state.sector].kind === "base" &&
		(needRefill || state.kills >= state.total)
	) {
		const d = steerAt(station.position, dt);
		player.throttle = d > 130 ? 0.4 : 0.05;
		if (d < 110 && player.velocity.length() < 35) tryDock();
		return;
	}
	if (state.autoWait > 0) return;
	const fleet = ["D3", "B2", "E1"].find((c) => sectors[c].fleet.length);
	let dest = fleet;
	if (needRefill || !fleet) {
		dest = bases.find((b) => b.alive)?.code;
	}
	if (dest && dest !== state.sector) {
		state.selected = dest;
		state.overlay = "map";
		state.autoWait = state.attract ? 1.3 : 0.12;
		refreshScreens();
	} else if (dest === state.sector) {
		state.autoDocked = false;
		state.autoWait = 0.2;
	}
}
function fixedUpdate(dt) {
	state.time += dt;
	state.shake = Math.max(0, state.shake - dt * 1.3);
	state.hitFlash = Math.max(0, state.hitFlash - dt * 1.8);
	if (state.mode === "playing" && !state.hubEnded) {
		if (state.overlay === "pause" || state.overlay === "modal") {
			if (!AIHub.active) return;
		}
		if (state.freeze) return;
		const tdt = dt * tune.timeScale;
		if (state.auto || state.attract) updateAutopilot(tdt);
		updatePhysics(tdt);
	}
	for (let i = effects.length - 1; i >= 0; i--) {
		const e = effects[i];
		e.life -= dt;
		const p = 1 - e.life / e.maxLife;
		e.mesh.scale.setScalar(1 + p * e.size);
		if (e.type === "burst") {
			e.shell.material.opacity = (1 - p) * 0.55;
			e.halo.material.opacity = (1 - p) * 0.8;
		} else e.mesh.material.opacity = (1 - p) * 0.5;
		if (e.life <= 0) {
			scene.remove(e.mesh);
			effects.splice(i, 1);
		}
	}
	if (state.attract && state.mode === "result") {
		state.autoWait += dt;
		if (state.autoWait > 5) startMission({ attract: true, seed: 771 });
	}
}
function show(el, on) {
	$(el).classList.toggle("hidden", !on);
}
function toast(text, overline = "SUBSPACE / COMMAND", duration = 3) {
	$("toastText").textContent = text;
	$("toastOverline").textContent = overline;
	state.toastUntil = state.time + duration;
	show("toast", true);
}
function comms(text, duration = 6) {
	$("commsText").textContent = text;
	state.commUntil = state.time + duration;
	show("comms", true);
	if (!state.attract) audio.voice(text);
}
function glyph(action) {
	const ps = {
			accept: "✕",
			back: "○",
			fire: "R2",
			boost: "L2",
			target: "△",
			pulse: "□",
			shield: "○",
			map: "↑",
			aft: "←",
			pause: "OPTIONS",
		},
		xb = {
			accept: "A",
			back: "B",
			fire: "RT",
			boost: "LT",
			target: "Y",
			pulse: "X",
			shield: "B",
			map: "↑",
			aft: "←",
			pause: "MENU",
		},
		kb = {
			accept: "E",
			back: "ESC",
			fire: "LMB / SPACE",
			boost: "SHIFT",
			target: "F",
			pulse: "Q",
			shield: "C",
			map: "TAB",
			aft: "R",
			pause: "ESC",
		};
	return input.kind === "pad"
		? (settings.glyphs === "xbox" ? xb : ps)[action]
		: kb[action];
}
function promptHTML(action, label) {
	return "<span><b>" + glyph(action) + "</b>" + label + "</span>";
}
function updatePrompts() {
	document.body.classList.toggle("touch-mode", input.kind === "touch");
	$("titleHint").innerHTML =
		input.kind === "pad"
			? "PRESS " + glyph("accept") + " TO LAUNCH <i>·</i> CONTROLLER CONNECTED"
			: "ENTER TO LAUNCH <i>·</i> MOUSE + KEYBOARD / CONTROLLER";
	$("briefControls").textContent =
		input.kind === "pad"
			? "Left stick steer · R2 fire · L2 boost · " +
				glyph("map") +
				" chart · " +
				glyph("accept") +
				" jump / dock"
			: "Mouse aim · WASD steer / throttle · Space or click fire · Tab chart · E jump / dock";
	$("controlStrip").innerHTML =
		promptHTML("fire", "Photons") +
		promptHTML("map", "Chart") +
		promptHTML("target", "Target") +
		promptHTML("pulse", "Pulse") +
		promptHTML("shield", "Shields") +
		promptHTML("boost", "Boost");
	$("mapHint").textContent =
		input.kind === "pad"
			? "Left stick / D-pad select · " +
				glyph("accept") +
				" jump · " +
				glyph("back") +
				" back"
			: "Arrow keys select · Enter / E jump · Esc / Tab back";
	show(
		"touchMenu",
		input.kind === "touch" && state.mode === "playing" && !state.overlay,
	);
}
function refreshScreens() {
	for (const id of [
		"titleScreen",
		"briefScreen",
		"flightHUD",
		"mapScreen",
		"pauseScreen",
		"modalScreen",
		"resultScreen",
		"hubWaiting",
	])
		show(id, false);
	if (state.mode === "title") show("titleScreen", true);
	if (state.mode === "brief") show("briefScreen", true);
	if (state.mode === "waiting" || state.mode === "hubEnd")
		show("hubWaiting", true);
	if (state.mode === "playing") {
		show("flightHUD", true);
		if (state.overlay === "map") {
			show("mapScreen", true);
			updateMap();
		}
		if (state.overlay === "pause") show("pauseScreen", true);
		if (state.overlay === "modal") show("modalScreen", true);
	}
	if (state.mode === "title" && state.overlay === "modal")
		show("modalScreen", true);
	if (state.mode === "result") {
		show("resultScreen", true);
		$("resultEyebrow").textContent = state.win
			? "OPERATION LAST LIGHT / COMPLETE"
			: "FLIGHT RECORDER / RECOVERED";
		$("resultTitle").textContent = state.win
			? "Frontier secured."
			: "The stars are still there.";
		$("resultText").textContent = state.reason;
		$("rankName").textContent = state.win
			? state.score > 3700
				? "STAR COMMANDER"
				: state.score > 2500
					? "WING CAPTAIN"
					: "FRONTIER GUARDIAN"
			: state.kills >= 5
				? "VETERAN CADET"
				: "GALACTIC COOK";
		$("resultScore").textContent = state.score.toLocaleString();
		$("resultKills").textContent = state.kills + " / " + state.total;
		$("resultBases").textContent = bases.filter((b) => b.alive).length + " / 2";
		$("resultTime").textContent = formatTime(state.missionTime);
		show("retryBtn", !AIHub.active);
		show("resultHome", !AIHub.active);
	}
	show("attractBanner", state.attract);
	show("warpUI", !!state.warp);
	show("dockUI", !!state.docking);
	show("touchAction", false);
	hero.visible =
		state.mode === "title" ||
		state.mode === "brief" ||
		state.mode === "waiting" ||
		state.mode === "hubEnd";
	cockpit.visible = state.mode === "playing" || state.mode === "result";
	document.body.style.cursor =
		state.mode === "playing" && !state.overlay ? "crosshair" : "default";
	updatePrompts();
	clearFocus();
	if (state.overlay === "map") focusElement($("cell-" + state.selected));
	else if (state.overlay === "pause") focusElement($("resumeBtn"));
	else if (state.mode === "title" && !state.overlay)
		focusElement($("launchBtn"));
	else if (state.mode === "brief") focusElement($("beginBtn"));
	else if (state.mode === "result") focusElement($("retryBtn"));
}
function showTitle() {
	if (AIHub.active && state.hubStarted) return;
	state.mode = "title";
	state.overlay = null;
	state.attract = state.auto = false;
	state.warp = state.docking = null;
	state.idleAt = performance.now();
	input.fire = input.boost = false;
	state.aft = false;
	state.freeze = false;
	input.keys.clear();
	input.pointer = false;
	hero.visible = true;
	heroMixer.timeScale = 1;
	station.visible = true;
	station.position.set(-100, 35, -630);
	shuttle.visible = false;
	for (const e of [...enemies, ...bullets, ...debris]) removeEntity(e);
	enemies.length = bullets.length = debris.length = 0;
	document.exitPointerLock?.();
	for (const e of ghosts.values()) e.mesh.visible = false;
	refreshScreens();
}
function openMap() {
	if (
		state.mode !== "playing" ||
		state.warp ||
		state.docking ||
		state.overlay === "modal" ||
		state.overlay === "pause"
	)
		return;
	if (state.overlay === "map") {
		state.overlay = null;
		refreshScreens();
		return;
	}
	state.overlay = "map";
	document.exitPointerLock?.();
	input.fire = false;
	input.pointer = false;
	input.mouseX = input.mouseY = 0;
	state.selected =
		state.selected === state.sector
			? Object.values(sectors).find((s) => s.fleet.length)?.code ||
				bases.find((b) => b.alive)?.code ||
				"C3"
			: state.selected;
	refreshScreens();
	audio.select();
}
function togglePause() {
	if (state.mode !== "playing" || state.attract || state.hubEnded) return;
	if (state.overlay === "pause") {
		state.overlay = null;
		refreshScreens();
		audio.unlock();
		return;
	}
	if (state.overlay === "modal") {
		closeModal();
		return;
	}
	state.overlay = "pause";
	input.fire = false;
	input.pointer = false;
	input.mouseX = input.mouseY = 0;
	document.exitPointerLock?.();
	$("pauseNote").textContent = AIHub.active
		? "The Hub clock and mission continue during a session."
		: "The frontier can wait a moment.";
	$("quitBtn").disabled = AIHub.active;
	refreshScreens();
}
function updateMap() {
	if (!Object.keys(sectors).length) return;
	const grid = $("mapGrid");
	if (!grid.children.length) {
		for (const s of Object.values(sectors)) {
			const b = document.createElement("button");
			b.id = "cell-" + s.code;
			b.className = "map-cell";
			b.dataset.sector = s.code;
			b.innerHTML =
				'<span class="cell-code">' +
				s.code +
				'</span><span class="cell-icon"></span><span class="cell-count"></span><span class="cell-player"></span>';
			b.onpointerenter = () => selectSector(s.code);
			b.onfocus = () => selectSector(s.code);
			b.onclick = () => {
				selectSector(s.code);
				startWarp(s.code);
			};
			grid.appendChild(b);
		}
	}
	for (const s of Object.values(sectors)) {
		const el = $("cell-" + s.code),
			base = bases.find((b) => b.code === s.code);
		el.className =
			"map-cell" +
			(s.kind === "base" ? " base" : "") +
			(s.cleared ? " cleared" : "") +
			(state.selected === s.code ? " selected" : "");
		el.querySelector(".cell-icon").textContent =
			s.kind === "base"
				? base?.alive
					? "✦"
					: "×"
				: s.fleet.length
					? s.fleet.includes("crown")
						? "♜"
						: "⋀"
					: s.cleared
						? "✓"
						: s.hazard
							? "· ·"
							: "·";
		el.querySelector(".cell-count").textContent = s.fleet.length
			? s.fleet.length + " VEX"
			: "";
		el.querySelector(".cell-player").textContent =
			s.code === state.sector ? "⌖" : "";
		el.setAttribute(
			"aria-label",
			s.code +
				" " +
				s.name +
				(s.fleet.length ? ", " + s.fleet.length + " hostiles" : ""),
		);
	}
	renderSectorDetail();
}
function selectSector(code) {
	if (!sectors[code]) return;
	state.selected = code;
	for (const el of $("mapGrid").children)
		el.classList.toggle("selected", el.dataset.sector === code);
	renderSectorDetail();
}
function renderSectorDetail() {
	const s = sectors[state.selected];
	if (!s) return;
	const base = bases.find((b) => b.code === s.code),
		cost = warpCost(s.code);
	$("mapSector").textContent = s.code;
	$("mapKind").textContent = s.fleet.length
		? "HOSTILE SECTOR"
		: s.kind === "base"
			? "FRIENDLY RELAY"
			: s.cleared
				? "SECURED SECTOR"
				: "OPEN SPACE";
	$("mapName").textContent = s.name;
	$("mapDescription").textContent =
		s.code === "D3" && s.fleet.length
			? "A fast wing is closing on Kestrel. Break this blockade first."
			: s.code === "B2" && s.fleet.length
				? "Heavy raiders threaten Meridian. Expect armored Lancers."
				: s.code === "E1" && s.fleet.length
					? "The Crown flagship directs the invasion. Its shield rejects fire beyond 190 m."
					: s.kind === "base"
						? base?.alive
							? "Repair, recharge, and return to the fight. Approach within 115 m at less than 35 ion speed."
							: "The relay is gone. Find another base before your energy runs out."
						: s.cleared
							? "Hostile transmissions have ceased. The sector is ours."
							: s.hazard
								? "Meteor fragments drift through this sector. Photons or a pulse can clear a path."
								: "Quiet stars. No hostile contacts.";
	$("mapTargets").textContent = s.fleet.length;
	$("mapCost").textContent =
		s.code === state.sector
			? "CURRENT SECTOR"
			: cost + " / " + Math.floor(player.energy);
	$("jumpBtn").disabled = s.code === state.sector || cost > player.energy;
	$("baseStatus").textContent = bases
		.map(
			(b) =>
				(b.alive ? "✦ " : "× ") +
				b.code +
				" " +
				(b.alive
					? sectors[b.threat].fleet.length
						? "SIEGE " + formatTime(b.siege)
						: "SECURE"
					: "LOST"),
		)
		.join("  /  ");
}
function formatTime(t) {
	t = Math.max(0, Math.floor(t));
	return (
		String(Math.floor(t / 60)).padStart(2, "0") +
		":" +
		String(t % 60).padStart(2, "0")
	);
}
const escapeText = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
function sliderRow(name, label, detail, value, min, max, step = 0.01) {
	return (
		'<label class="setting-row"><span class="setting-label"><b>' +
		label +
		"</b><small>" +
		detail +
		'</small></span><input id="setting-' +
		name +
		'" type="range" min="' +
		min +
		'" max="' +
		max +
		'" step="' +
		step +
		'" value="' +
		value +
		'" aria-label="' +
		label +
		'"><output id="output-' +
		name +
		'">' +
		(max === 1 ? Math.round(value * 100) + "%" : Number(value).toFixed(2)) +
		"</output></label>"
	);
}
function bindSlider(name, obj, max = 1) {
	const el = $("setting-" + name);
	el.oninput = () => {
		obj[name] = Number(el.value);
		$("output-" + name).textContent =
			max === 1 ? Math.round(obj[name] * 100) + "%" : obj[name].toFixed(2);
		if (obj === settings) {
			audio.masterVolume = settings.master;
			audio.musicVolume = settings.music;
			audio.sfxVolume = settings.sfx;
			audio.levels();
			saveSettings();
		}
	};
}
function saveSettings() {
	try {
		localStorage.setItem("ralliers-settings", JSON.stringify(settings));
	} catch (e) {}
	updatePrompts();
}
function openModal(kind, from = null) {
	state.returnOverlay = from ?? (state.mode === "playing" ? "pause" : null);
	state.overlay = "modal";
	state.modal = kind;
	input.fire = false;
	input.pointer = false;
	document.exitPointerLock?.();
	$("modalBody").scrollTop = 0;
	const body = $("modalBody");
	if (kind === "settings") {
		$("modalEyebrow").textContent = "COCKPIT / PREFERENCES";
		$("modalTitle").textContent = "Make yourself at home.";
		body.innerHTML =
			sliderRow(
				"master",
				"Master volume",
				"All ship, radio and music audio.",
				settings.master,
				0,
				1,
			) +
			sliderRow(
				"music",
				"Music volume",
				"Procedural frontier score. Default 10%.",
				settings.music,
				0,
				1,
			) +
			sliderRow(
				"sfx",
				"Effects & radio",
				"Weapons, warning tones and gibberish crew voices.",
				settings.sfx,
				0,
				1,
			) +
			sliderRow(
				"sensitivity",
				"Steering sensitivity",
				"Mouse and stick turn speed.",
				settings.sensitivity,
				0.3,
				2.5,
			) +
			sliderRow(
				"shake",
				"Cockpit shake",
				"Impact and engine vibration.",
				settings.shake,
				0,
				1,
			) +
			'<label class="setting-row"><span class="setting-label"><b>Controller glyphs</b><small>Prompts follow your most recent input.</small></span><select id="glyphSelect"><option value="ps">PlayStation · ✕ ○ □ △</option><option value="xbox">Xbox · A B X Y</option></select></label><label class="setting-row"><span class="setting-label"><b>Flight pitch</b><small>Choose how the vertical axis steers.</small></span><select id="invertSelect"><option value="normal">Normal</option><option value="inverted">Inverted</option></select></label><label class="setting-row"><span class="setting-label"><b>Motion effects</b><small>Reduces warp streaks and camera shake.</small></span><select id="motionSelect"><option value="full">Full</option><option value="reduced">Reduced</option></select></label><div class="settings-footer"><button id="resetSettings">Reset defaults</button><button id="fullscreenBtn">Toggle fullscreen</button></div>';
		for (const n of ["master", "music", "sfx", "shake"])
			bindSlider(n, settings);
		bindSlider("sensitivity", settings, 2.5);
		$("glyphSelect").value = settings.glyphs;
		$("glyphSelect").onchange = (e) => {
			settings.glyphs = e.target.value;
			saveSettings();
		};
		$("invertSelect").value = settings.invert ? "inverted" : "normal";
		$("invertSelect").onchange = (e) => {
			settings.invert = e.target.value === "inverted";
			saveSettings();
		};
		$("motionSelect").value = settings.reduced ? "reduced" : "full";
		$("motionSelect").onchange = (e) => {
			settings.reduced = e.target.value === "reduced";
			saveSettings();
		};
		$("resetSettings").onclick = () => {
			Object.assign(settings, {
				master: 0.65,
				music: 0.1,
				sfx: 0.75,
				sensitivity: 1,
				shake: 0.7,
				glyphs: "ps",
				invert: false,
				reduced: false,
			});
			saveSettings();
			audio.masterVolume = 0.65;
			audio.musicVolume = 0.1;
			audio.sfxVolume = 0.75;
			audio.levels();
			openModal("settings", state.returnOverlay);
		};
		$("fullscreenBtn").onclick = () => {
			if (document.fullscreenElement) document.exitFullscreen?.();
			else document.documentElement.requestFullscreen?.().catch(() => {});
		};
	}
	if (kind === "guide") {
		$("modalEyebrow").textContent = "CADET FIELD MANUAL / REV 07";
		$("modalTitle").textContent = "A little nerve. A steady hand.";
		const controls =
			input.kind === "pad"
				? [
						["Steer", "Left stick"],
						["Throttle / roll", "Right stick"],
						["Twin photons", "R2"],
						["Ion boost", "L2"],
						["Target / shock pulse", glyph("target") + " / " + glyph("pulse")],
						["Shields / aft view", glyph("shield") + " / D-pad ←"],
						["Galactic chart", "D-pad ↑"],
						["Jump / dock", glyph("accept")],
						["Pause", "Options"],
					]
				: [
						["Steer", "Mouse / A D / arrows"],
						["Throttle / stop", "W S / X"],
						["Twin photons", "Left click / Space"],
						["Ion boost", "Shift"],
						["Target / shock pulse", "F / Q"],
						["Shields / aft view", "C / R"],
						["Galactic chart", "Tab / M"],
						["Jump / dock", "E / Enter"],
						["Pause", "Esc / P"],
					];
		body.innerHTML =
			'<div class="guide-grid"><div><h3>Your flight controls</h3>' +
			controls
				.map(
					(c) =>
						'<div class="control-row"><span>' +
						c[0] +
						"</span><b>" +
						c[1] +
						"</b></div>",
				)
				.join("") +
			'</div><div><h3>Know your ship.</h3><p class="guide-tip">Hold your reticle near a target to guide twin photons. Cycle targets when a Vex slips behind you; the edge arrow will point the way.</p><p class="guide-tip">Shields regenerate after four quiet seconds. They, your weapons and your engines share one energy reserve. Turn shields off in safe space to conserve power.</p><p class="guide-tip">A shock pulse clears incoming fire and damages enemies within 150 m. It costs 55 energy and recharges in 14 seconds.</p><p class="guide-tip">When the ion drive is damaged, your top speed falls. Dock at either surviving blue relay to repair every system.</p></div></div><p class="guide-tip">On touch: drag anywhere on the left to steer, drag on the right to change thrust. Targeting, shooting and pulse are assisted. Tap the context button to open the chart, jump or dock. In a wing, pilots share the same invasion orders and compete on score; wing ghosts cannot damage you.</p>';
	}
	if (kind === "about") {
		$("modalEyebrow").textContent = "FLIGHT RECORDER / CREDITS";
		$("modalTitle").textContent = "Made of starlight & code.";
		body.innerHTML =
			'<div class="about-tabs"><button data-credit="sourceInformation" class="active">Source Information</button><button data-credit="testingFeedback">Testing Feedback</button><button data-credit="engineFeedback">Engine Feedback</button><button data-credit="promptFeedback">Prompt Feedback</button></div><div id="creditContent"></div>';
		body
			.querySelectorAll("[data-credit]")
			.forEach((b) => (b.onclick = () => renderCredits(b.dataset.credit)));
		renderCredits("sourceInformation");
	}
	if (kind === "dev") {
		if (AIHub.active) {
			$("modalEyebrow").textContent = "DEVELOPER / SESSION";
			$("modalTitle").textContent = "Flight telemetry.";
			body.innerHTML =
				'<p class="lead">Balance controls are available during solo patrols. This session keeps the same defaults for every pilot.</p><p class="guide-tip">Physics: Rapier ' +
				RAPIER.version() +
				" · Renderer: " +
				renderer.backend.constructor.name +
				" · Simulation ticks: " +
				state.stats.physicsSteps +
				"</p>";
		} else {
			$("modalEyebrow").textContent = "DEVELOPER / LIVE FLIGHT LAB";
			$("modalTitle").textContent = "Tune the frontier.";
			body.innerHTML =
				'<p class="fine">Changes apply immediately. Enemy hull applies to newly spawned ships. Close this panel to test.</p><div class="settings-footer" style="flex-wrap:wrap"><button id="devGod">Invulnerable: ' +
				(state.god ? "ON" : "OFF") +
				'</button><button id="devAuto">Autopilot: ' +
				(state.auto ? "ON" : "OFF") +
				'</button><button id="devRefill">Repair & recharge</button><button id="devClear">Clear current fleet</button><button id="devSpawn">Spawn a Splinter</button><button id="devDebug">Physics outlines: ' +
				(state.debug ? "ON" : "OFF") +
				'</button><button id="devFreeze">Freeze simulation: ' +
				(state.freeze ? "ON" : "OFF") +
				'</button><button id="devMap">Jump to a sector</button><button id="devRestart">Restart patrol</button></div>' +
				sliderRow(
					"enemyHull",
					"Enemy hull multiplier",
					"New enemy durability.",
					tune.enemyHull,
					0.3,
					3,
				) +
				sliderRow(
					"enemyDamage",
					"Enemy damage",
					"Incoming damage multiplier.",
					tune.enemyDamage,
					0,
					3,
				) +
				sliderRow(
					"enemySpeed",
					"Enemy speed",
					"Flight and attack approach speed.",
					tune.enemySpeed,
					0.2,
					2.5,
				) +
				sliderRow(
					"fireInterval",
					"Photon interval",
					"Seconds between twin photon volleys.",
					tune.fireInterval,
					0.05,
					0.6,
				) +
				sliderRow(
					"aimAssist",
					"Photon guidance",
					"How strongly an aimed volley guides onto a target.",
					tune.aimAssist,
					0,
					1,
				) +
				sliderRow(
					"energyDrain",
					"Energy consumption",
					"Weapons, shields, boost and jumps.",
					tune.energyDrain,
					0.1,
					3,
				) +
				sliderRow(
					"siegeSpeed",
					"Siege clock",
					"Rate at which threatened bases are lost.",
					tune.siegeSpeed,
					0.1,
					4,
				) +
				sliderRow(
					"timeScale",
					"Simulation speed",
					"Flight, weapons, energy and mission clock.",
					tune.timeScale,
					0.25,
					3,
				) +
				'<div class="settings-footer"><button id="resetTune">Reset balance defaults</button></div><p class="guide-tip">Renderer: ' +
				renderer.backend.constructor.name +
				" / Three r" +
				THREE.REVISION +
				" · Rapier " +
				RAPIER.version() +
				" · Physics steps: " +
				state.stats.physicsSteps +
				" · Collisions: " +
				state.stats.collisions +
				" · Native animation clips: " +
				state.stats.nativeMixers +
				"</p>";
			for (const [n, v] of Object.entries(tune))
				bindSlider(n, tune, n === "aimAssist" ? 1 : 3);
			$("devGod").onclick = () => {
				state.god = !state.god;
				$("devGod").textContent = "Invulnerable: " + (state.god ? "ON" : "OFF");
			};
			$("devAuto").onclick = () => {
				state.auto = !state.auto;
				$("devAuto").textContent = "Autopilot: " + (state.auto ? "ON" : "OFF");
			};
			$("devRefill").onclick = () => {
				player.hull = player.shield = 100;
				player.energy = 1000;
				player.engineDamaged = false;
				toast("ALL SYSTEMS RESTORED", "FLIGHT LAB", 2);
			};
			$("devClear").onclick = () => {
				for (const e of [...enemies])
					if (!e.dead) {
						e.position.copy(player.position);
						damageEnemy(e, 9999);
					}
			};
			$("devSpawn").onclick = () => {
				const p = player.position.clone().addScaledVector(forwardVector(), 200);
				spawnEnemy("splinter", 0, p);
				sectors[state.sector].fleet.push("splinter");
				state.total++;
			};
			$("devDebug").onclick = () => {
				state.debug = !state.debug;
				$("devDebug").textContent =
					"Physics outlines: " + (state.debug ? "ON" : "OFF");
			};
			$("devFreeze").onclick = () => {
				state.freeze = !state.freeze;
				$("devFreeze").textContent =
					"Freeze simulation: " + (state.freeze ? "ON" : "OFF");
			};
			$("devMap").onclick = () => {
				state.freeze = false;
				state.overlay = null;
				state.modal = null;
				openMap();
			};
			$("devRestart").onclick = () => startMission();
			$("resetTune").onclick = () => {
				Object.assign(tune, defaults);
				openModal("dev", state.returnOverlay);
			};
		}
	}
	if (kind === "wing") {
		$("modalEyebrow").textContent = "MULTIPLAYER / 1–4 PILOTS";
		$("modalTitle").textContent = "No one flies alone.";
		if (wing.room) renderWingBody();
		else {
			body.innerHTML =
				'<p class="about-intro">Race the same invasion with up to three wingmates. See their ships, compare scores, and earn your commission.</p><div class="network-grid"><article class="network-card"><h3>Start a wing.</h3><p>Create a six-character rally code. Share it with your pilots.</p><button id="hostWing" class="primary">Create room <span>↗</span></button></article><article class="network-card"><h3>Join your wing.</h3><p>Enter the code from your flight leader.</p><div class="room-input"><input id="roomCode" maxlength="6" placeholder="ABC123" aria-label="Six-character room code" autocomplete="off" spellcheck="false"></div><button id="joinWing" class="secondary">Join room <span>↗</span></button></article></div><p class="guide-tip">Internet play uses WebRTC with public PeerJS signaling. Tabs on the same origin also link locally. AI Hub sessions connect automatically. Each pilot fights independently; highest mission score wins.</p>';
			$("hostWing").onclick = () => {
				const a = new Uint8Array(6);
				crypto.getRandomValues(a);
				const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
				const code = [...a].map((x) => chars[x % chars.length]).join("");
				wing.open(code, true);
				renderWingBody();
			};
			$("joinWing").onclick = () => {
				const code = $("roomCode")
					.value.toUpperCase()
					.replace(/[^A-Z0-9]/g, "");
				if (code.length !== 6) {
					$("roomCode").focus();
					$("roomCode").setCustomValidity("Enter six letters or numbers.");
					$("roomCode").reportValidity();
					return;
				}
				wing.open(code, false);
				renderWingBody();
			};
		}
	}
	refreshScreens();
	focusElement(body.querySelector("button,input,select") || $("modalBack"));
}
function closeModal() {
	state.modal = null;
	state.overlay = state.returnOverlay;
	if (state.overlay === "pause" && state.mode !== "playing")
		state.overlay = null;
	refreshScreens();
}
function renderCredits(tab) {
	const tabs = $("modalBody").querySelectorAll("[data-credit]");
	tabs.forEach((b) => b.classList.toggle("active", b.dataset.credit === tab));
	const c = $("creditContent");
	if (tab === "sourceInformation") {
		c.innerHTML =
			'<p class="about-intro">An original frontier patrol inspired by the cockpit, galactic strategy and nerve of Atari’s Star Raiders.</p><div class="credits-grid">' +
			Object.entries(CREDITS.sourceInformation)
				.map(
					([k, v]) =>
						'<div class="credit"><span>' +
						escapeText(k.replace(/([A-Z])/g, " $1")) +
						"</span><p>" +
						escapeText(v) +
						"</p></div>",
				)
				.join("") +
			'</div><p class="guide-tip">Research: <a href="https://www.atariage.com/manual_html_page.php?SoftwareLabelID=664" target="_blank" rel="noopener">Atari 5200 field manual</a> · <a href="https://www.atariage.com/2600/manuals_old/star_raiders.html" target="_blank" rel="noopener">Atari 2600 manual</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub protocol</a>. Three.js, Rapier and PeerJS retain their respective open-source licenses. Barlow Condensed by Jeremy Tribby and Space Grotesk by Florian Karsten are used under SIL OFL 1.1; their full notices are embedded in this HTML. All game geometry, animation, writing and sound are procedural originals.</p>';
		if (AIHub.active)
			c.querySelectorAll("a").forEach((a) => {
				a.removeAttribute("target");
				a.removeAttribute("href");
			});
	} else
		c.innerHTML = CREDITS[tab]
			.map(
				(a, i) =>
					'<div class="feedback-item"><h3>' +
					FEEDBACK_QUESTIONS[tab][i] +
					"</h3><p>" +
					escapeText(a) +
					"</p></div>",
			)
			.join("");
}
function renderWingBody() {
	if (state.modal !== "wing") return;
	const body = $("modalBody");
	body.innerHTML =
		'<p class="about-intro">' +
		(wing.host
			? "You are flight leader. Share this code, then launch when your wing is ready."
			: "Linking to the flight leader. The patrol starts when they launch.") +
		'</p><div class="room-code" id="roomDisplay"></div><p class="room-status" id="roomStatus"></p><div class="room-members" id="roomMembers"></div><div class="room-actions">' +
		(wing.host
			? '<button id="launchWing" class="primary">Launch wing <span>↗</span></button>'
			: "") +
		'<button id="leaveWing" class="secondary">Leave room</button></div><p class="guide-tip">All pilots begin with identical orders. Wing ghosts appear when pilots occupy the same sector. Shields, damage, bases and scores belong to each pilot’s own patrol.</p>';
	$("roomDisplay").textContent = wing.room;
	if (wing.host)
		$("launchWing").onclick = () => {
			wing.emit({ type: "start", seed: 771 });
			startMission({ seed: 771 });
		};
	$("leaveWing").onclick = () => {
		wing.close();
		clearGhosts();
		openModal("wing", null);
	};
	renderWingStatus();
}
function renderWingStatus() {
	if (state.modal !== "wing" || !$("roomStatus")) return;
	$("roomStatus").textContent =
		(wing.connected ? "LINK ACTIVE" : "AWAITING FLIGHT LEADER") +
		" / " +
		wing.transport.toUpperCase();
	$("roomMembers").textContent =
		"Pilots on frequency: " + wing.members.size + " / 4";
}
function clearGhosts() {
	for (const g of ghosts.values()) {
		scene.remove(g.mesh);
		removeMixer(g.mesh);
	}
	ghosts.clear();
}
function receiveNetwork(d, from) {
	if (state.hubEnded || !d) return;
	if (d.type === "start" && !AIHub.active) {
		startMission({ seed: Number.isFinite(d.seed) ? d.seed : 771 });
		return;
	}
	if (d.type === "leave") {
		const g = ghosts.get(from);
		if (g) {
			scene.remove(g.mesh);
			removeMixer(g.mesh);
			ghosts.delete(from);
		}
		wing.members.delete(from);
		renderWingStatus();
		return;
	}
	if (d.type === "result") {
		const g = ghosts.get(from);
		if (g) {
			g.score = Number(d.score) || 0;
			g.done = true;
		}
		return;
	}
	if (
		d.type !== "ghost" ||
		!Array.isArray(d.p) ||
		d.p.length !== 3 ||
		!d.p.every(Number.isFinite) ||
		!sectors[d.sector]
	)
		return;
	let g = ghosts.get(from);
	if (!g) {
		const p = AIHub.active ? AIHub.players.find((p) => p.id === from) : null;
		g = {
			mesh: createInterceptor(true, p?.color || palette.teal),
			position: V(),
			target: V(),
			yaw: 0,
			pitch: 0,
			sector: d.sector,
			score: 0,
			name: p?.name || wing.members.get(from)?.name || "Wing pilot",
			seen: state.time,
			fire: 0,
		};
		scene.add(g.mesh);
		g.mesh.scale.setScalar(1.8);
		ghosts.set(from, g);
	}
	g.target.set(...d.p);
	g.yaw = Number(d.yaw) || 0;
	g.pitch = Number(d.pitch) || 0;
	g.sector = d.sector;
	g.score = Number(d.score) || 0;
	g.seen = state.time;
	g.fire = d.fire ? 1 : 0;
	state.stats.ghostUpdates++;
}
function updateNetwork(dt) {
	if (state.hubEnded || state.attract) return;
	if (AIHub.active && !state.hubStarted) return;
	if (state.mode !== "playing" && state.mode !== "result") return;
	lastNet += dt;
	lastProgress += dt;
	if (lastNet > 0.14) {
		lastNet = 0;
		const msg = {
			type: "ghost",
			p: player.position.toArray().map((n) => Math.round(n * 100) / 100),
			yaw: Math.round(player.yaw * 100) / 100,
			pitch: Math.round(player.pitch * 100) / 100,
			sector: state.sector,
			score: Math.round(state.score),
			fire: state.fireCd > tune.fireInterval * 0.5,
		};
		if (AIHub.active) {
			AIHub.send(msg, { reliable: false });
			wing.sent++;
		} else if (wing.room) wing.emit(msg);
	}
	if (lastProgress > 1.05) {
		lastProgress = 0;
		if (AIHub.active && state.mode === "playing")
			AIHub.progress({
				score: Math.round(state.score),
				label: state.kills + "/11 · " + state.sector,
			});
	}
	for (const [id, g] of ghosts) {
		g.mesh.visible =
			g.sector === state.sector &&
			state.time - g.seen < 6 &&
			state.mode === "playing";
		g.position.lerp(g.target, Math.min(1, dt * 9));
		g.mesh.position.copy(g.position);
		g.mesh.rotation.set(g.pitch, g.yaw, 0, "YXZ");
	}
}
function setupHub(info) {
	hubInfo = info;
	if (!info) return;
	wing.hub = true;
	state.mode = "waiting";
	state.overlay = null;
	refreshScreens();
	AIHub.on("start", () => {
		state.hubStarted = true;
		$("hubWaitText").textContent =
			"Flight systems engaged. Stand by for launch.";
	});
	AIHub.on("message", receiveNetwork);
	AIHub.on("leave", ({ id }) => receiveNetwork({ type: "leave" }, id));
	AIHub.on("time-up", () => {
		if (!state.hubEnded) {
			if (state.mode === "playing")
				finishMission(
					false,
					"Patrol time complete. Mission Control has your flight recorder.",
				);
			else if (state.mode !== "result") AIHub.result({ score: state.score });
		}
	});
	AIHub.on("end", ({ reason }) => {
		state.hubEnded = true;
		state.hubStarted = false;
		clearGhosts();
		input.keys.clear();
		input.fire = input.boost = false;
		state.mode = "hubEnd";
		state.overlay = null;
		$("hubWaitText").textContent =
			"Round complete. Your flight recorder is with Mission Control.";
		audio.enabled = false;
		audio.suspend();
		refreshScreens();
	});
	AIHub.ready();
}
function visibleFocusables() {
	const scopes = [
		"modalScreen",
		"pauseScreen",
		"mapScreen",
		"briefScreen",
		"resultScreen",
		"titleScreen",
	];
	const id = scopes.find((id) => !$(id).classList.contains("hidden"));
	return id
		? [...$(id).querySelectorAll("button:not(:disabled),input,select")].filter(
				(e) => !e.closest(".hidden") && e.getBoundingClientRect().height > 0,
			)
		: [];
}
function clearFocus() {
	document
		.querySelectorAll(".focused")
		.forEach((e) => e.classList.remove("focused"));
}
function focusElement(el) {
	if (!el || el.disabled || el.closest(".hidden")) return;
	clearFocus();
	el.classList.add("focused");
	if (input.kind === "pad") el.focus({ preventScroll: true });
	if (el.closest(".modal-body")) el.scrollIntoView({ block: "nearest" });
}
function navigateMenu(dx, dy) {
	const a = visibleFocusables();
	if (!a.length) return;
	let current =
		a.find((e) => e.classList.contains("focused")) || document.activeElement;
	let i = a.indexOf(current);
	if (state.overlay === "map" && current?.dataset.sector) {
		const s = sectors[current.dataset.sector],
			x = clamp(s.x + dx, 0, 4),
			y = clamp(s.y + dy, 0, 3),
			code = String.fromCharCode(65 + x) + (y + 1);
		selectSector(code);
		focusElement($("cell-" + code));
		return;
	}
	if (current?.type === "range" && dx) {
		current.value = clamp(
			Number(current.value) + Number(current.step || 0.01) * dx * 3,
			Number(current.min),
			Number(current.max),
		);
		current.dispatchEvent(new Event("input", { bubbles: true }));
		return;
	}
	if (current?.tagName === "SELECT" && dx) {
		current.selectedIndex = clamp(
			current.selectedIndex + dx,
			0,
			current.options.length - 1,
		);
		current.dispatchEvent(new Event("change", { bubbles: true }));
		return;
	}
	i = (i + (dy || dx || 1) + a.length) % a.length;
	focusElement(a[i]);
	audio.select();
}
function acceptMenu() {
	const a = visibleFocusables(),
		e = a.find((e) => e.classList.contains("focused")) || a[0];
	if (e?.tagName === "BUTTON") e.click();
	else if (e?.tagName === "INPUT") e.focus();
}
function backAction() {
	if (state.overlay === "modal") {
		closeModal();
		return;
	}
	if (state.overlay === "map") {
		state.overlay = null;
		refreshScreens();
		return;
	}
	if (state.overlay === "pause") {
		togglePause();
		return;
	}
	if (state.mode === "brief") {
		showTitle();
		return;
	}
	if (state.mode === "playing") togglePause();
}
function activity(kind) {
	if (state.hubEnded) return false;
	state.idleAt = performance.now();
	if (state.attract) {
		showTitle();
		setInputKind(kind);
		return false;
	}
	setInputKind(kind);
	return true;
}
function setInputKind(kind) {
	if (input.kind !== kind) {
		input.kind = kind;
		updatePrompts();
	}
}
function keyAction(code) {
	if (state.mode === "playing") {
		if (state.overlay === "modal" || state.overlay === "pause") {
			if (code === "Escape" || code === "KeyP") backAction();
			return;
		}
		if (code === "Escape" || code === "KeyP") {
			backAction();
			return;
		}
		if (code === "Tab" || code === "KeyM") {
			openMap();
			return;
		}
		if (state.overlay === "map") {
			if (code === "Enter" || code === "KeyE") startWarp(state.selected);
			return;
		}
		if (code === "KeyF") cycleTarget();
		if (code === "KeyC") toggleShield();
		if (code === "KeyQ") pulse();
		if (code === "KeyR") {
			state.aft = !state.aft;
			toast(state.aft ? "AFT VIEW" : "FORWARD VIEW", "FLIGHT COMPUTER", 1.5);
		}
		if (code === "KeyE" || code === "Enter") interact();
	} else if (code === "Escape") backAction();
}
function setupInput() {
	window.addEventListener("keydown", (e) => {
		if (!activity("kb")) {
			e.preventDefault();
			return;
		}
		audio.unlock();
		if (e.target.matches("input:not([type=range]),textarea")) {
			if (e.code === "Escape") backAction();
			return;
		}
		if (
			[
				"Tab",
				"Space",
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
			].includes(e.code)
		)
			e.preventDefault();
		if (e.repeat) return;
		const isMenu = state.mode !== "playing" || state.overlay;
		const arrows = {
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
		};
		if (
			state.overlay === "modal" &&
			(e.code === "PageDown" || e.code === "PageUp")
		) {
			$("modalBody").scrollBy(
				0,
				(e.code === "PageDown" ? 1 : -1) * $("modalBody").clientHeight * 0.75,
			);
			e.preventDefault();
			return;
		}
		if (isMenu && arrows[e.code]) {
			navigateMenu(...arrows[e.code]);
			return;
		}
		if (
			isMenu &&
			(e.code === "Enter" || e.code === "Space") &&
			state.overlay !== "map"
		) {
			acceptMenu();
			return;
		}
		input.keys.add(e.code);
		keyAction(e.code);
	});
	window.addEventListener("keyup", (e) => input.keys.delete(e.code));
	window.addEventListener("blur", () => {
		input.keys.clear();
		input.fire = input.boost = false;
	});
	document.addEventListener("pointerover", (e) => {
		const b = e.target.closest("button,input,select");
		if (b) focusElement(b);
	});
	document.addEventListener(
		"pointerdown",
		(e) => {
			if (e.pointerType === "touch") return;
			if (!activity("kb")) {
				state.justExitedAttract = true;
				e.preventDefault();
				e.stopPropagation();
				return;
			}
			audio.unlock();
		},
		true,
	);
	document.addEventListener(
		"click",
		(e) => {
			if (state.justExitedAttract) {
				state.justExitedAttract = false;
				e.preventDefault();
				e.stopPropagation();
			}
		},
		true,
	);
	const canvas = renderer.domElement;
	canvas.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "touch") return;
		if (state.mode !== "playing" || state.overlay || state.attract) return;
		input.pointer = true;
		input.fire = e.button === 0;
		input.boost = e.button === 2;
		input.mouseX = input.mouseY = 0;
		canvas.requestPointerLock?.();
	});
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	window.addEventListener("pointerup", (e) => {
		if (e.pointerType === "touch") return;
		if (e.button === 0) input.fire = false;
		if (e.button === 2) input.boost = false;
	});
	window.addEventListener("mousemove", (e) => {
		if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
		if (!activity("kb")) return;
		if (state.mode !== "playing" || state.overlay) return;
		if (document.pointerLockElement === canvas) {
			player.yaw -= e.movementX * 0.0022 * settings.sensitivity;
			player.pitch = clamp(
				player.pitch -
					e.movementY *
						0.002 *
						settings.sensitivity *
						(settings.invert ? -1 : 1),
				-1.4,
				1.4,
			);
			input.mouseX = input.mouseY = 0;
		} else if (input.pointer) {
			input.mouseX = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
			input.mouseY = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
		}
	});
	document.addEventListener("pointerlockchange", () => {
		if (!document.pointerLockElement) input.pointer = false;
	});
	canvas.addEventListener(
		"touchstart",
		(e) => {
			if (!activity("touch")) {
				e.preventDefault();
				return;
			}
			audio.unlock();
			if (state.mode !== "playing" || state.overlay) return;
			e.preventDefault();
			for (const t of e.changedTouches)
				input.touch.set(t.identifier, {
					x: t.clientX,
					y: t.clientY,
					side: t.clientX < innerWidth * 0.55 ? "left" : "right",
				});
		},
		{ passive: false },
	);
	canvas.addEventListener(
		"touchmove",
		(e) => {
			if (state.mode !== "playing" || state.overlay) return;
			e.preventDefault();
			for (const t of e.changedTouches) {
				const a = input.touch.get(t.identifier);
				if (!a) continue;
				if (a.side === "left") {
					input.touchTurn.x = clamp((t.clientX - a.x) / 90, -1, 1);
					input.touchTurn.y = clamp((t.clientY - a.y) / 90, -1, 1);
				} else input.touchThrust = clamp((a.y - t.clientY) / 100, -1, 1);
			}
		},
		{ passive: false },
	);
	const endTouch = (e) => {
		for (const t of e.changedTouches) {
			const a = input.touch.get(t.identifier);
			if (a?.side === "left") input.touchTurn = { x: 0, y: 0 };
			else input.touchThrust = 0;
			input.touch.delete(t.identifier);
		}
	};
	canvas.addEventListener("touchend", endTouch);
	canvas.addEventListener("touchcancel", endTouch);
	$("launchBtn").onclick = () => {
		state.mode = "brief";
		state.overlay = null;
		refreshScreens();
		audio.select();
	};
	$("beginBtn").onclick = () => {
		audio.unlock();
		startMission();
	};
	$("wingBtn").onclick = () => openModal("wing");
	document
		.querySelectorAll("[data-open]")
		.forEach((b) => (b.onclick = () => openModal(b.dataset.open)));
	document
		.querySelectorAll("[data-pause-open]")
		.forEach(
			(b) => (b.onclick = () => openModal(b.dataset.pauseOpen, "pause")),
		);
	$("pauseBtn").onclick = $("touchPause").onclick = togglePause;
	$("resumeBtn").onclick = togglePause;
	$("quitBtn").onclick = () => {
		if (!AIHub.active) showTitle();
	};
	$("modalBack").onclick = closeModal;
	$("closeMap").onclick = () => {
		state.overlay = null;
		refreshScreens();
	};
	$("jumpBtn").onclick = () => startWarp(state.selected);
	$("retryBtn").onclick = () => startMission();
	$("resultHome").onclick = showTitle;
	$("touchAction").onclick = () => {
		if (state.warp || state.docking) return;
		if (
			sectors[state.sector].kind === "base" &&
			player.position.distanceTo(station.position) < 115
		)
			tryDock();
		else openMap();
	};
	window.addEventListener("resize", resize);
	window.addEventListener("gamepadconnected", () => {
		setInputKind("pad");
		audio.unlock();
	});
}
function pollGamepad() {
	const pad = [...(navigator.getGamepads?.() || [])].find(
		(p) => p && p.connected !== false,
	);
	if (!pad) {
		input.x = input.y = input.roll = input.throttle = 0;
		return;
	}
	const dead = (v) =>
		Math.abs(v || 0) < 0.14 ? 0 : ((Math.abs(v) - 0.14) / 0.86) * Math.sign(v);
	const vals = pad.buttons.map((b) => b.pressed || b.value > 0.5),
		axis = [
			dead(pad.axes[0]),
			dead(pad.axes[1]),
			dead(pad.axes[2]),
			dead(pad.axes[3]),
		],
		fresh = (i) => vals[i] && !input.buttons[i];
	const active =
		axis.some((x) => Math.abs(x) > 0.1) ||
		vals.some((v, i) => v && !input.buttons[i]);
	if (active && !activity("pad")) {
		input.buttons = vals;
		return;
	}
	if (active) audio.unlock();
	input.pad = pad;
	if (!active && input.kind !== "pad") {
		input.x = input.y = input.roll = input.throttle = 0;
		input.buttons = vals;
		return;
	}
	const menu = state.mode !== "playing" || !!state.overlay;
	if (menu) {
		if (state.overlay === "modal" && Math.abs(axis[3]) > 0.1)
			$("modalBody").scrollTop += axis[3] * 26;
		input.x = input.y = 0;
		const dx = fresh(14)
				? -1
				: fresh(15)
					? 1
					: axis[0] < -0.5
						? -1
						: axis[0] > 0.5
							? 1
							: 0,
			dy = fresh(12)
				? -1
				: fresh(13)
					? 1
					: axis[1] < -0.5
						? -1
						: axis[1] > 0.5
							? 1
							: 0;
		if ((dx || dy) && performance.now() > input.menuAxisAt) {
			navigateMenu(dx, dy);
			input.menuAxisAt = performance.now() + 190;
		}
		if (fresh(0)) acceptMenu();
		if (fresh(1)) backAction();
		if (fresh(9) && !vals[8] && state.overlay === "pause") backAction();
	} else {
		input.x = axis[0];
		input.y = axis[1];
		input.roll = axis[2];
		input.throttle = -axis[3];
		input.fire = !!vals[7];
		input.boost = !!vals[6];
		if (fresh(0)) interact();
		if (fresh(1)) toggleShield();
		if (fresh(2)) pulse();
		if (fresh(3)) cycleTarget();
		if (fresh(12)) openMap();
		if (fresh(14)) {
			state.aft = !state.aft;
			toast(state.aft ? "AFT VIEW" : "FORWARD VIEW", "FLIGHT COMPUTER", 1.5);
		}
		if (fresh(9) && !vals[8]) togglePause();
	}
	input.buttons = vals;
}
function resize() {
	if (!renderer) return;
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
	const c = $("hudCanvas");
	c.width = innerWidth;
	c.height = innerHeight;
}
function renderHUD() {
	const canvas = $("hudCanvas"),
		ctx = canvas.getContext("2d"),
		w = canvas.width,
		h = canvas.height,
		s = Math.min(w / 1440, h / 900);
	ctx.clearRect(0, 0, w, h);
	if (state.mode !== "playing" || state.overlay === "map") return;
	ctx.save();
	const cx = w * 0.5,
		cy = h * 0.48;
	const teal = "#7cebd8",
		orange = "#ff9d64";
	ctx.strokeStyle = state.lock > 0.65 ? orange : teal;
	ctx.lineWidth = 1.5 * s;
	ctx.globalAlpha = 0.85;
	let rx = cx,
		ry = cy;
	if (state.warp) {
		const wa = state.warp;
		rx = cx + wa.x * w * 0.27;
		ry = cy + wa.y * h * 0.3;
		const bx = cx + wa.beaconX * w * 0.27,
			by = cy + wa.beaconY * h * 0.3;
		ctx.strokeStyle = teal;
		ctx.lineWidth = 2 * s;
		ctx.beginPath();
		ctx.moveTo(bx, by - 18 * s);
		ctx.lineTo(bx + 18 * s, by);
		ctx.lineTo(bx, by + 18 * s);
		ctx.lineTo(bx - 18 * s, by);
		ctx.closePath();
		ctx.stroke();
		if (!settings.reduced) {
			for (let i = 0; i < 100; i++) {
				const a = i * 2.39996,
					t = (state.time * 0.5 + i * 0.173) % 1,
					r = 50 + t * t * Math.max(w, h),
					len = 20 + t * t * 180;
				ctx.globalAlpha = t * 0.65;
				ctx.strokeStyle = i % 3 ? teal : "#ffe2ad";
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
				ctx.lineTo(cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len));
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 0.9;
	} else if (input.pointer && !document.pointerLockElement) {
		rx += input.mouseX * w * 0.08;
		ry += input.mouseY * h * 0.08;
	}
	const r = 20 * s;
	ctx.strokeStyle = state.lock > 0.65 ? orange : teal;
	ctx.beginPath();
	for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
		ctx.moveTo(rx + Math.cos(a) * r, ry + Math.sin(a) * r);
		ctx.lineTo(
			rx + Math.cos(a) * (r + 13 * s),
			ry + Math.sin(a) * (r + 13 * s),
		);
	}
	ctx.stroke();
	ctx.fillStyle = teal;
	ctx.fillRect(rx - 1.5 * s, ry - 1.5 * s, 3 * s, 3 * s);
	if (state.lock > 0.01 && !state.warp) {
		ctx.beginPath();
		ctx.arc(rx, ry, 34 * s, -Math.PI / 2, -Math.PI / 2 + TAU * state.lock);
		ctx.stroke();
	}
	if (!state.warp && !state.docking) {
		const t = state.target;
		if (t && !t.dead) {
			const p = t.position.clone().project(camera),
				front =
					t.position
						.clone()
						.sub(camera.position)
						.dot(camera.getWorldDirection(V())) > 0;
			if (front && Math.abs(p.x) < 0.83 && Math.abs(p.y) < 0.7) {
				const x = (p.x * 0.5 + 0.5) * w,
					y = (-p.y * 0.5 + 0.5) * h,
					dist = t.position.distanceTo(player.position),
					size = clamp(1300 / dist, 1, 4) * 18 * s;
				ctx.strokeStyle = orange;
				ctx.lineWidth = 1.6 * s;
				ctx.beginPath();
				for (const [a, b] of [
					[-1, -1],
					[1, -1],
					[1, 1],
					[-1, 1],
				]) {
					ctx.moveTo(x + a * size, y + b * (size - 8 * s));
					ctx.lineTo(x + a * size, y + b * size);
					ctx.lineTo(x + a * (size - 8 * s), y + b * size);
				}
				ctx.stroke();
				ctx.font = `600 ${Math.max(11, 12 * s)}px Space, sans-serif`;
				ctx.textAlign = "center";
				ctx.fillStyle = orange;
				ctx.fillText(
					t.type.toUpperCase() + (state.lock > 0.65 ? " / LOCKED" : ""),
					x,
					y - size - 12 * s,
				);
				if (state.hits > 0 && state.fireCd > tune.fireInterval * 0.7) {
					ctx.globalAlpha = 0.55;
					ctx.beginPath();
					ctx.moveTo(rx - 7 * s, ry - 7 * s);
					ctx.lineTo(rx + 7 * s, ry + 7 * s);
					ctx.moveTo(rx + 7 * s, ry - 7 * s);
					ctx.lineTo(rx - 7 * s, ry + 7 * s);
					ctx.stroke();
					ctx.globalAlpha = 0.9;
				}
			} else {
				const dir = t.position
						.clone()
						.sub(player.position)
						.applyQuaternion(camera.quaternion.clone().invert()),
					a = Math.atan2(dir.x, -dir.y),
					x = cx + Math.sin(a) * w * 0.29,
					y = cy - Math.cos(a) * h * 0.29;
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(a);
				ctx.fillStyle = orange;
				ctx.beginPath();
				ctx.moveTo(0, -12 * s);
				ctx.lineTo(7 * s, 6 * s);
				ctx.lineTo(-7 * s, 6 * s);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
				ctx.textAlign = "center";
				ctx.font = `600 ${Math.max(11, 12 * s)}px Space, sans-serif`;
				ctx.fillStyle = orange;
				ctx.fillText(front ? "TARGET" : "TARGET AFT", x, y + 30 * s);
			}
		}
		if (station.visible) {
			const p = station.position.clone().project(camera),
				front =
					station.position
						.clone()
						.sub(camera.position)
						.dot(camera.getWorldDirection(V())) > 0;
			if (front && Math.abs(p.x) < 0.85 && Math.abs(p.y) < 0.8) {
				const x = (p.x * 0.5 + 0.5) * w,
					y = (-p.y * 0.5 + 0.5) * h;
				ctx.strokeStyle = teal;
				ctx.setLineDash([4 * s, 7 * s]);
				ctx.beginPath();
				ctx.arc(x, y, 38 * s, 0, TAU);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.fillStyle = teal;
				ctx.font = `600 ${12 * s}px Space, sans-serif`;
				ctx.textAlign = "center";
				ctx.fillText(
					"RELAY / " +
						Math.round(station.position.distanceTo(player.position)) +
						" m",
					x,
					y + 58 * s,
				);
			}
		}
	}
	ctx.globalAlpha = 0.45;
	ctx.fillStyle = teal;
	ctx.font = `500 ${Math.max(10, 11 * s)}px Space, sans-serif`;
	ctx.textAlign = "center";
	ctx.fillText(
		state.aft ? "AFT OPTICS / REVERSED" : "FORWARD OPTICS / RALLIER 07",
		cx,
		h * 0.16,
	);
	ctx.strokeStyle = "#6cafaf";
	ctx.lineWidth = 1 * s;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(cx + side * w * 0.16, h * 0.475);
		ctx.lineTo(cx + side * w * 0.19, h * 0.475);
		ctx.moveTo(cx + side * w * 0.175, h * 0.46);
		ctx.lineTo(cx + side * w * 0.175, h * 0.49);
		ctx.stroke();
	}
	ctx.restore();
}
function renderRadar() {
	const c = $("radar"),
		ctx = c.getContext("2d"),
		w = c.width,
		h = c.height,
		cx = w * 0.5,
		cy = h * 0.5;
	ctx.clearRect(0, 0, w, h);
	ctx.strokeStyle = "#79c9c455";
	ctx.fillStyle = "#071a28a0";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.ellipse(cx, cy, 65, 53, 0, 0, TAU);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.ellipse(cx, cy, 32, 26, 0, 0, TAU);
	ctx.moveTo(cx - 65, cy);
	ctx.lineTo(cx + 65, cy);
	ctx.moveTo(cx, cy - 53);
	ctx.lineTo(cx, cy + 53);
	ctx.stroke();
	ctx.fillStyle = "#8cf4db";
	ctx.beginPath();
	ctx.moveTo(cx, cy - 5);
	ctx.lineTo(cx - 4, cy + 4);
	ctx.lineTo(cx + 4, cy + 4);
	ctx.closePath();
	ctx.fill();
	const rot = new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(0, 1, 0),
		-player.yaw,
	);
	const plot = (pos, color, target = false) => {
		const d = pos.clone().sub(player.position).applyQuaternion(rot);
		const x = clamp(d.x / 500, -1, 1) * 61,
			y = clamp(d.z / 500, -1, 1) * 49;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(cx + x, cy + y, target ? 3.4 : 2.3, 0, TAU);
		ctx.fill();
		if (target) {
			ctx.strokeStyle = color;
			ctx.strokeRect(cx + x - 6, cy + y - 6, 12, 12);
		}
	};
	for (const e of enemies)
		if (!e.dead) plot(e.position, "#ffa46e", e === state.target);
	if (station.visible) plot(station.position, "#8cf4db");
	for (const g of ghosts.values())
		if (g.mesh.visible) plot(g.position, "#bcadff");
	ctx.strokeStyle = "#77e2d935";
	const a = state.time * 0.6;
	ctx.beginPath();
	ctx.moveTo(cx, cy);
	ctx.lineTo(cx + Math.sin(a) * 64, cy - Math.cos(a) * 52);
	ctx.stroke();
}
function updateHUD() {
	if (state.mode !== "playing") return;
	const s = sectors[state.sector];
	$("sectorName").textContent = s.name.toUpperCase();
	$("sectorCode").textContent = s.code;
	$("killCounter").textContent = state.kills + " / " + state.total;
	$("missionObjective").textContent =
		state.kills >= state.total ? "RETURN & DOCK" : "CLEAR THE INVASION";
	$("hullNumber").textContent = Math.ceil(player.hull);
	$("hullBar").style.width = player.hull + "%";
	$("hullBar").style.background = player.hull < 35 ? "#ff8656" : "#f4e9cf";
	$("shieldNumber").textContent = Math.ceil(player.shield);
	$("shieldBar").style.width = player.shield + "%";
	$("shieldBar").style.opacity = player.shieldOn ? "1" : ".25";
	$("shieldLabel").textContent =
		"SHIELDS / " + (player.shieldOn ? "ON" : "OFF");
	$("energyNumber").textContent = Math.floor(player.energy);
	$("energyBar").style.width = player.energy / 10 + "%";
	$("energyNumber").style.color = player.energy < 180 ? "#ff8656" : "";
	$("speedNumber").textContent = Math.round(player.velocity.length());
	$("pulseState").textContent =
		state.pulseCd > 0
			? "PULSE " + Math.ceil(state.pulseCd) + "s"
			: "PULSE READY";
	show("engineDamage", player.engineDamaged);
	show("toast", state.time < state.toastUntil);
	show("comms", state.time < state.commUntil && !state.warp && !state.docking);
	const t = state.target;
	if (t && !t.dead) {
		$("targetType").textContent = "VEX / " + t.type.toUpperCase();
		$("targetRange").textContent =
			Math.round(t.position.distanceTo(player.position)) + " m";
		$("targetHP").style.width = (t.hp / t.maxHp) * 100 + "%";
		$("targetNote").textContent =
			t.type === "crown"
				? t.position.distanceTo(player.position) > 190
					? "SHIELD ACTIVE / CLOSE TO 190 m"
					: "SHIELD OPEN / FIRE AT WILL"
				: state.lock > 0.65
					? "PHOTON GUIDANCE / LOCKED"
					: "CENTER TARGET FOR PHOTON GUIDANCE";
	} else {
		$("targetType").textContent = station.visible
			? "RELAY / FRIENDLY"
			: "CLEAR SPACE";
		$("targetRange").textContent = station.visible
			? Math.round(player.position.distanceTo(station.position)) + " m"
			: "—";
		$("targetHP").style.width = station.visible ? "100%" : "0%";
		$("targetNote").textContent = station.visible
			? "APPROACH SLOWLY / REQUEST DOCKING"
			: "FIND YOUR NEXT SECTOR ON THE CHART";
	}
	const dockPossible =
		station.visible &&
		player.position.distanceTo(station.position) < 115 &&
		!state.docking &&
		!state.warp;
	const context = dockPossible
		? "<b>" +
			glyph("accept") +
			"</b> " +
			(player.velocity.length() > 35
				? "Reduce speed to dock"
				: "Request docking")
		: !enemies.some((e) => !e.dead) && !state.warp && !state.docking
			? "<b>" +
				glyph("map") +
				"</b> " +
				(state.kills >= state.total
					? "Return to a relay base"
					: "Choose your next sector")
			: "";
	$("contextPrompt").innerHTML = context;
	show("contextPrompt", !!context);
	if (state.warp) {
		$("warpProgress").style.width =
			clamp((state.warp.time / state.warp.duration) * 100, 0, 100) + "%";
		$("warpText").textContent =
			"Destination " +
			state.warp.code +
			" · " +
			Math.round(
				(state.warp.accuracy / Math.max(0.01, state.warp.time)) * 100,
			) +
			"% beacon alignment";
	}
	if (state.docking) {
		$("dockProgress").style.width =
			(state.docking.time / state.docking.duration) * 100 + "%";
		$("dockText").textContent =
			state.docking.time < 1.6
				? "Transfer shuttle inbound. Stand by."
				: state.docking.time < 3.6
					? "Hull repair · photon calibration · energy transfer"
					: "Transfer complete. Preparing departure.";
	}
	const ghostList = [...ghosts.values()];
	$("wingScores").textContent = ghostList.length
		? "WING / YOU " +
			Math.round(state.score) +
			"   " +
			ghostList.map((g) => g.name + " " + Math.round(g.score)).join("   ")
		: "";
	if (
		input.kind === "touch" &&
		!state.overlay &&
		!state.warp &&
		!state.docking
	) {
		show("touchAction", true);
		$("touchAction").textContent = dockPossible
			? "Dock"
			: enemies.some((e) => !e.dead)
				? "Chart ↗"
				: "Choose sector ↗";
	} else show("touchAction", false);
	renderRadar();
	if (state.overlay === "map") renderSectorDetail();
}
function renderDebug() {
	if (debugLines) {
		scene.remove(debugLines);
		debugLines.geometry.dispose();
		debugLines = null;
	}
	if (!state.debug || !world) return;
	const d = world.debugRender(),
		g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.BufferAttribute(d.vertices, 3));
	debugLines = new THREE.LineSegments(
		g,
		new THREE.LineBasicMaterial({
			color: palette.teal,
			transparent: true,
			opacity: 0.6,
			depthTest: false,
		}),
	);
	scene.add(debugLines);
}
function renderFrame(now) {
	try {
		const dt = Math.min((now - lastRender) / 1000, 0.07);
		lastRender = now;
		pollGamepad();
		if (
			AIHub.active &&
			state.hubStarted &&
			state.mode === "waiting" &&
			AIHub.time() >= 0
		)
			startMission({ seed: AIHub.seed || 771 });
		if (
			state.mode === "title" &&
			!state.overlay &&
			now - state.idleAt >= 10000 &&
			!AIHub.active
		)
			startMission({ attract: true, seed: 771 });
		if (AIHub.active && state.mode === "waiting" && state.hubStarted)
			$("hubWaitText").textContent =
				"Launch in " + Math.max(0, Math.ceil(-AIHub.time() / 1000)) + "…";
		accumulator += dt;
		let loops = 0;
		while (accumulator >= 1 / 60 && loops < 5) {
			fixedUpdate(1 / 60);
			accumulator -= 1 / 60;
			loops++;
		}
		const animateScene =
			state.mode !== "playing" ||
			!state.overlay ||
			AIHub.active ||
			state.attract;
		if (animateScene) for (const m of mixers) m.update(dt);
		if (
			state.mode === "title" ||
			state.mode === "brief" ||
			state.mode === "waiting" ||
			state.mode === "hubEnd"
		) {
			camera.position.set(0, 0, 0);
			camera.rotation.set(0, 0, 0);
			camera.fov = 53;
			sky.position.set(0, 0, 0);
		} else {
			const shake = settings.reduced ? 0 : state.shake * settings.shake;
			camera.position
				.copy(player.position)
				.add(
					new THREE.Vector3(
						Math.sin(state.time * 93) * shake,
						Math.cos(state.time * 87) * shake,
						0,
					),
				);
			camera.rotation.set(
				player.pitch,
				player.yaw + (state.aft ? Math.PI : 0),
				player.roll,
				"YXZ",
			);
			camera.fov = lerp(
				camera.fov,
				state.warp ? 95 : input.boost ? 76 : 66,
				dt * 4,
			);
			sky.position.copy(player.position);
			cockpit.rotation.x = lerp(cockpit.rotation.x, input.y * 0.035, dt * 3);
		}
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();
		$("damageFlash").style.opacity = String(state.hitFlash * 0.55);
		audio.engine(
			state.mode === "playing" && !state.overlay
				? clamp(player.velocity.length() / 100, 0, 1)
				: 0,
			input.boost,
		);
		if (animateScene)
			audio.update(
				dt,
				state.mode === "playing" && enemies.some((e) => !e.dead) ? 1 : 0,
			);
		updateNetwork(dt);
		lastUI += dt;
		if (lastUI > 0.075) {
			updateHUD();
			lastUI = 0;
		}
		renderHUD();
		if (state.debug) renderDebug();
		else if (debugLines) {
			scene.remove(debugLines);
			debugLines = null;
		}
		renderer.render(scene, camera);
		state.stats.frames++;
	} catch (e) {
		renderer.setAnimationLoop(null);
		state.fatal = String(e.stack || e);
		console.error(e);
		$("loadStatus").textContent = "Flight systems stopped: " + e.message;
		show("loading", true);
	}
}
async function boot() {
	try {
		$("loadStatus").textContent =
			"Starting the renderer and zero-gravity physics…";
		await Promise.all([RAPIER.init(), initScene()]);
		resetSectors();
		clearWorld();
		setupInput();
		const info = await window.hubConnection;
		state.ready = true;
		state.mode = "title";
		if (info) setupHub(info);
		else showTitle();
		show("loading", false);
		lastRender = performance.now();
		renderer.setAnimationLoop(renderFrame);
		window.__STAR = {
			state,
			player,
			tune,
			settings,
			audio,
			wing,
			get enemies() {
				return enemies;
			},
			get sectors() {
				return sectors;
			},
			get bases() {
				return bases;
			},
			get renderer() {
				return renderer;
			},
			get physics() {
				return world;
			},
			get ghosts() {
				return ghosts;
			},
			start: startMission,
			title: showTitle,
			openMap,
			warp: startWarp,
			dock: tryDock,
			pulse,
			damagePlayer,
			fire,
			cycleTarget,
			openModal,
			closeModal,
			step(n = 1) {
				for (let i = 0; i < n; i++) fixedUpdate(1 / 60);
				updateHUD();
				return this.snapshot();
			},
			snapshot() {
				return {
					ready: state.ready,
					mode: state.mode,
					overlay: state.overlay,
					sector: state.sector,
					kills: state.kills,
					total: state.total,
					score: state.score,
					time: state.missionTime,
					hull: player.hull,
					energy: player.energy,
					shield: player.shield,
					engineDamaged: player.engineDamaged,
					bases: bases.map((b) => ({
						code: b.code,
						alive: b.alive,
						siege: b.siege,
					})),
					enemies: enemies
						.filter((e) => !e.dead)
						.map((e) => ({
							type: e.type,
							hp: e.hp,
							distance: e.position.distanceTo(player.position),
						})),
					jumps: state.jumps,
					docks: state.docks,
					win: state.win,
					attract: state.attract,
					reason: state.reason,
					backend: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
					rapier: RAPIER.version(),
					stats: { ...state.stats },
					fatal: state.fatal || null,
				};
			},
		};
	} catch (e) {
		console.error(e);
		$("loadStatus").textContent =
			"Unable to initialize flight systems. Check your connection to the Three.js and Rapier CDNs, then reload. " +
			e.message;
		AIHub.active && AIHub.fail(e.message);
	}
}
boot();
