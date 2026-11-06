const C = {
	ink: 0x101e27,
	paper: 0xffebc2,
	teal: 0x67ceb2,
	copper: 0xd78149,
	gold: 0xffd16b,
	navy: 0x173b45,
	red: 0xf27a66,
	ice: 0x92dcec,
};
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x122c35);
scene.fog = new THREE.Fog(0x122c35, 45, 90);
const camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 120);
camera.position.set(0, 12.5, 38);
camera.lookAt(0, 7, 0);
const viewport = $("viewport");
let gpuAdapter = null,
	gpuDevice = null;
if (
	navigator.gpu &&
	new URLSearchParams(location.search).get("renderer") !== "webgl"
) {
	try {
		gpuAdapter = await navigator.gpu.requestAdapter({
			powerPreference: "high-performance",
		});
		if (gpuAdapter)
			gpuDevice = await gpuAdapter.requestDevice({ requiredFeatures: [] });
	} catch {}
}
let renderer = new THREE.WebGPURenderer({
	device: gpuDevice || undefined,
	antialias: true,
	powerPreference: "high-performance",
	forceWebGL: new URLSearchParams(location.search).get("renderer") === "webgl",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
try {
	await renderer.init();
} catch (e) {
	$("load-msg").textContent =
		"This browser cannot create a graphics context. Try a current Chrome, Edge, or Safari.";
	throw e;
}
viewport.appendChild(renderer.domElement);
let graphicsBackend = renderer.backend.isWebGPUBackend
	? "WebGPU"
	: "WebGL2 fallback";
const initialGraphicsBackend = graphicsBackend;
let graphicsRecovery = null;
renderer.onDeviceLost = () => {
	if (graphicsRecovery) return;
	graphicsRecovery = (async () => {
		const previousRenderer = renderer;
		previousRenderer.setAnimationLoop(null);
		let replacement = null,
			lastError = null;
		for (let attempt = 0; attempt < 5; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 400 + attempt * 200));
			try {
				const canvas = document.createElement("canvas");
				const gl = canvas.getContext("webgl2", {
					antialias: true,
					alpha: false,
				});
				if (!gl) throw new Error("Waiting for the graphics driver");
				replacement = new THREE.WebGPURenderer({
					canvas,
					context: gl,
					antialias: true,
					forceWebGL: true,
				});
				replacement.setPixelRatio(Math.min(devicePixelRatio, 2));
				replacement.setSize(innerWidth, innerHeight);
				replacement.outputColorSpace = THREE.SRGBColorSpace;
				replacement.toneMapping = THREE.ACESFilmicToneMapping;
				replacement.toneMappingExposure = 1.15;
				await replacement.init();
				break;
			} catch (e) {
				lastError = e;
				replacement = null;
			}
		}
		if (!replacement) throw lastError;
		viewport.replaceChild(replacement.domElement, previousRenderer.domElement);
		renderer = replacement;
		graphicsBackend = "WebGL2 recovery";
		if (window.__test) window.__test.renderer = renderer;
		if (window.FlipBros) window.FlipBros.backend = graphicsBackend;
		renderer.setAnimationLoop(frame);
	})().catch((e) => {
		window.__graphicsError = { message: e.message, stack: e.stack };
		if (AIHub.active) AIHub.fail("Graphics recovery failed: " + e.message);
		$("load-msg").textContent = "Graphics recovery failed: " + e.message;
		$("loading").classList.remove("hidden");
	});
};
scene.add(new THREE.AmbientLight(0xb3d8d2, 1.25));
const sun = new THREE.DirectionalLight(0xffe5b6, 3.4);
sun.position.set(-8, 19, 16);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x5bd6df, 1.8);
rim.position.set(12, 10, -9);
scene.add(rim);
const materials = new Map();
function mat(color, flat = true) {
	const key = color + ":" + flat;
	if (!materials.has(key)) {
		materials.set(key, new THREE.MeshToonMaterial({ color }));
	}
	return materials.get(key);
}
const black = new THREE.MeshBasicMaterial({
	color: C.ink,
	side: THREE.BackSide,
});
const geom = {
	box: new THREE.BoxGeometry(1, 1, 1),
	sphere: new THREE.SphereGeometry(1, 14, 10),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 14),
	torus: new THREE.TorusGeometry(1, 0.16, 6, 20),
};
function mesh(
	parent,
	kind,
	color,
	pos = [0, 0, 0],
	scale = [1, 1, 1],
	outline = true,
) {
	const m = new THREE.Mesh(geom[kind] || kind, mat(color));
	m.position.set(...pos);
	m.scale.set(...scale);
	parent.add(m);
	if (outline) {
		const ink = new THREE.Mesh(m.geometry, black);
		ink.scale.setScalar(1.045);
		m.add(ink);
	}
	return m;
}
function box(p, c, pos, size, outline = true) {
	return mesh(p, "box", c, pos, size, outline);
}
function ball(p, c, pos, size, outline = true) {
	return mesh(p, "sphere", c, pos, size, outline);
}
function cylinder(p, c, pos, size, axis = "y", outline = true) {
	const m = mesh(p, "cylinder", c, pos, size, outline);
	if (axis === "x") m.rotation.z = Math.PI / 2;
	if (axis === "z") m.rotation.x = Math.PI / 2;
	return m;
}
function ring(p, c, pos, r, t = 0.13) {
	const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 7, 24), mat(c));
	m.position.set(...pos);
	p.add(m);
	return m;
}
function textPlane(
	parent,
	text,
	x,
	y,
	z,
	size,
	color = "#f7edce",
	bg = null,
	w = 512,
	h = 128,
) {
	const cvs = document.createElement("canvas");
	cvs.width = w;
	cvs.height = h;
	const ctx = cvs.getContext("2d");
	if (bg) {
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, w, h);
	}
	ctx.fillStyle = color;
	ctx.font = `900 ${h * 0.67}px "Arial Black",sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, w / 2, h * 0.52, w * 0.94);
	const tex = new THREE.CanvasTexture(cvs);
	tex.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry((size * w) / h, size),
		new THREE.MeshBasicMaterial({
			map: tex,
			transparent: true,
			depthWrite: false,
		}),
	);
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}
const architecture = new THREE.Group();
scene.add(architecture);
const stageVisual = new THREE.Group();
scene.add(stageVisual);
const actors = new THREE.Group();
scene.add(actors);
const effectsGroup = new THREE.Group();
scene.add(effectsGroup);
box(architecture, 0x193a43, [0, 7.3, -4.4], [33, 19, 1]);
// Large masonry, scratched with a restrained ink hatch.
for (let row = 0; row < 10; row++)
	for (let col = 0; col < 12; col++) {
		const x = -17 + col * 3.1 + (row % 2) * 1.55,
			y = row * 1.8;
		box(architecture, 0x264851, [x, y, -3.83], [3.02, 1.7, 0.07], false);
		if ((row + col) % 5 === 0) {
			const slash = box(
				architecture,
				0x35565b,
				[x + 0.7, y - 0.3, -3.77],
				[0.7, 0.035, 0.015],
				false,
			);
			slash.rotation.z = 0.3;
		}
	}
for (const x of [-10.1, 0, 10.1]) {
	box(architecture, 0x0c252e, [x, 7.7, -3.66], [5.7, 12.8, 0.2]);
	const arch = new THREE.Mesh(
		new THREE.TorusGeometry(2.85, 0.26, 7, 24, Math.PI),
		mat(0x3b5c60),
	);
	arch.position.set(x, 13.6, -3.5);
	architecture.add(arch);
	for (const side of [-1, 1])
		box(architecture, 0x37585e, [x + side * 2.85, 7.5, -3.5], [0.35, 12, 0.2]);
}
// Copper supply pipes, collars, valves, and numbered service signs.
for (const x of [-14.4, 14.4]) {
	cylinder(architecture, C.teal, [x, 7.7, -1.8], [0.6, 17, 0.6]);
	for (let y = 1; y < 16; y += 2.6) {
		cylinder(architecture, 0x478e82, [x, y, -1.8], [0.8, 0.23, 0.8]);
		for (const dx of [-0.51, 0.51])
			ball(
				architecture,
				C.gold,
				[x + dx, y, -1.28],
				[0.075, 0.075, 0.05],
				false,
			);
	}
	cylinder(
		architecture,
		C.teal,
		[x - Math.sign(x) * 1.3, 12.35, -1.8],
		[0.6, 2.6, 0.6],
		"x",
	);
	cylinder(
		architecture,
		0x0c2429,
		[x - Math.sign(x) * 2.6, 12.35, -1.8],
		[0.44, 0.025, 0.44],
		"x",
	);
	cylinder(
		architecture,
		C.teal,
		[x - Math.sign(x) * 2.55, 12.35, -1.8],
		[0.82, 0.3, 0.82],
		"x",
	);
	cylinder(
		architecture,
		C.teal,
		[x - Math.sign(x) * 1.1, 0.8, -1.7],
		[0.58, 2, 0.58],
		"x",
	);
}
for (const x of [-5.1, 5.1]) {
	cylinder(architecture, C.copper, [x, 8, -3], [0.14, 15, 0.14]);
	for (const y of [2, 5, 8, 11, 14])
		cylinder(architecture, 0xf0b772, [x, y, -3], [0.24, 0.16, 0.24]);
}
cylinder(architecture, 0x48656a, [0, 14.35, -3.1], [1.8, 0.3, 1.8], "z");
cylinder(architecture, C.ink, [0, 14.35, -2.88], [1.59, 0.1, 1.59], "z");
cylinder(architecture, C.paper, [0, 14.35, -2.78], [1.42, 0.08, 1.42], "z");
const gaugeNeedle = box(
	architecture,
	C.red,
	[0, 14.35, -2.65],
	[0.08, 1.15, 0.07],
);
gaugeNeedle.geometry.translate(0, 0.2, 0);
gaugeNeedle.rotation.z = -0.8;
textPlane(architecture, "PRESSURE", 0, 13.52, -2.55, 0.23, "#1b3038");
for (let i = 0; i < 9; i++) {
	const a = -Math.PI * 0.75 + (i * Math.PI * 1.5) / 8;
	const tick = box(
		architecture,
		C.ink,
		[Math.sin(a) * 1.18, 14.35 + Math.cos(a) * 1.18, -2.68],
		[0.045, 0.18, 0.04],
		false,
	);
	tick.rotation.z = -a;
}
const fans = [];
for (const x of [-9.7, 9.7]) {
	cylinder(architecture, 0x516b6c, [x, 9.1, -3.24], [1.8, 0.16, 1.8], "z");
	cylinder(architecture, 0x0d2630, [x, 9.1, -3.1], [1.58, 0.1, 1.58], "z");
	const f = new THREE.Group();
	f.position.set(x, 9.1, -2.95);
	architecture.add(f);
	fans.push(f);
	for (let i = 0; i < 4; i++) {
		const blade = box(f, 0x355b62, [0, 0, 0], [0.55, 2.5, 0.08]);
		blade.rotation.z = (i * Math.PI) / 2 + 0.3;
	}
	ball(f, C.copper, [0, 0, 0.12], [0.3, 0.3, 0.14]);
	for (const dx of [-1.3, -0.65, 0, 0.65, 1.3])
		box(
			architecture,
			0x70918c,
			[x + dx, 9.1, -2.65],
			[0.045, 2.8, 0.05],
			false,
		);
}
textPlane(architecture, "NIGHT SHIFT", 0, 16.3, -2.9, 0.55, "#9ac5b8");
textPlane(architecture, "07", -10.2, 14.8, -2.8, 0.5, "#6c9c98");
textPlane(architecture, "09", 10.2, 14.8, -2.8, 0.5, "#6c9c98");
box(architecture, 0x0c272e, [0, -0.45, 0], [33, 1, 7]);
box(architecture, 0x37716d, [0, -0.12, 1.9], [33, 0.18, 0.45]);
for (let i = 0; i < 36; i++)
	box(
		architecture,
		0x173b43,
		[-16 + i * 0.92, -0.1, 2.05],
		[0.12, 0.23, 0.5],
		false,
	);
const water = new THREE.Mesh(
	new THREE.PlaneGeometry(36, 5),
	new THREE.MeshBasicMaterial({
		color: 0x1f8580,
		transparent: true,
		opacity: 0.45,
	}),
);
water.rotation.x = -Math.PI / 2;
water.position.set(0, -0.26, 5.2);
architecture.add(water);
const planks = [
	{ x: 0, w: 29, y: 0.45 },
	{ x: -8.5, w: 12, y: 4.05 },
	{ x: 8.5, w: 12, y: 4.05 },
	{ x: 0, w: 20.2, y: 7.65 },
	{ x: -8.5, w: 12, y: 11.25 },
	{ x: 8.5, w: 12, y: 11.25 },
];
const platforms = [];
for (const [i, p] of planks.entries()) {
	const g = new THREE.Group();
	stageVisual.add(g);
	box(g, C.ink, [p.x, p.y - 0.28, 0], [p.w, 0.56, 2.1], false);
	box(
		g,
		i === 0 ? 0x446e70 : C.teal,
		[p.x, p.y - 0.18, 0.12],
		[p.w - 0.07, 0.31, 2],
	);
	box(
		g,
		i === 0 ? 0x7a9f92 : 0xb3e3be,
		[p.x, p.y - 0.025, 0.12],
		[p.w, 0.1, 2.1],
	);
	for (let x = p.x - p.w / 2 + 0.5; x < p.x + p.w / 2; x += 1.1) {
		ball(g, C.ink, [x, p.y - 0.27, 1.175], [0.055, 0.055, 0.03], false);
		if (i !== 0) {
			const hatch = box(
				g,
				0x24554f,
				[x, p.y - 0.24, 1.17],
				[0.38, 0.07, 0.025],
				false,
			);
			hatch.rotation.z = 0.5;
		}
	}
	if (i > 0)
		for (const x of [p.x - p.w * 0.35, p.x + p.w * 0.35]) {
			box(architecture, 0x345859, [x, p.y - 0.8, -0.8], [0.18, 1.1, 1]);
			const strut = box(
				architecture,
				0x345859,
				[x + 0.35, p.y - 0.65, -0.8],
				[0.18, 1.05, 0.6],
			);
			strut.rotation.z = -0.7;
		}
	const mix = new THREE.AnimationMixer(g);
	const clip = new THREE.AnimationClip("bump", 0.32, [
		new THREE.NumberKeyframeTrack(
			".position[y]",
			[0, 0.07, 0.16, 0.32],
			[0, 0.32, -0.04, 0],
		),
	]);
	const action = mix.clipAction(clip);
	action.setLoop(THREE.LoopOnce, 1);
	action.clampWhenFinished = true;
	platforms.push({ ...p, index: i, group: g, mixer: mix, action });
}
const bellVisual = new THREE.Group();
bellVisual.position.set(0, 2.15, 0.1);
stageVisual.add(bellVisual);
box(bellVisual, C.ink, [0, 0, 0], [1.66, 1.24, 1.5], false);
box(bellVisual, C.gold, [0, 0, 0.03], [1.5, 1.08, 1.47]);
textPlane(bellVisual, "BELL", 0, 0.04, 0.8, 0.38, "#172e35");
for (const x of [-0.57, 0.57])
	for (const y of [-0.34, 0.34])
		ball(bellVisual, C.ink, [x, y, 0.81], [0.055, 0.055, 0.03], false);
const bellMixer = new THREE.AnimationMixer(bellVisual);
const bellAction = bellMixer.clipAction(
	new THREE.AnimationClip("ring", 0.5, [
		new THREE.NumberKeyframeTrack(
			".rotation[z]",
			[0, 0.07, 0.14, 0.24, 0.35, 0.5],
			[0, -0.18, 0.15, -0.1, 0.06, 0],
		),
	]),
);
bellAction.setLoop(THREE.LoopOnce, 1);
bellAction.clampWhenFinished = true;
function limb(parent, name, x, y, color, length = 0.5) {
	const pivot = new THREE.Group();
	pivot.name = name;
	pivot.position.set(x, y, 0);
	parent.add(pivot);
	cylinder(pivot, color, [0, -length / 2, 0], [0.14, length, 0.14]);
	ball(pivot, C.ink, [0, -length, 0.08], [0.21, 0.14, 0.28]);
	return pivot;
}
function heroModel(id) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	root.add(rig);
	const cap = [C.copper, C.teal, C.gold, C.red][id % 4],
		suit = [0x287a84, 0x8173a4, 0x4a9682, 0x577eae][id % 4];
	box(rig, suit, [0, 0.62, 0], [0.64, 0.57, 0.43]);
	ball(rig, C.paper, [0, 1.1, 0.02], [0.42, 0.38, 0.33]);
	ball(rig, 0x9c7051, [0, 1.05, 0.31], [0.34, 0.16, 0.12]);
	ball(rig, C.ink, [0.04, 1.06, 0.43], [0.105, 0.085, 0.07]);
	for (const x of [-0.17, 0.17]) {
		ball(rig, C.paper, [x, 1.18, 0.29], [0.13, 0.16, 0.08]);
		ball(rig, C.ink, [x + 0.025, 1.18, 0.37], [0.057, 0.08, 0.035]);
		ball(rig, cap, [x * 1.8, 1.31, -0.03], [0.13, 0.16, 0.13]);
	}
	ball(rig, cap, [0, 1.38, -0.015], [0.44, 0.18, 0.35]);
	box(rig, cap, [0, 1.34, 0.3], [0.84, 0.08, 0.31]);
	box(rig, C.paper, [0, 0.77, 0.245], [0.22, 0.15, 0.03]);
	textPlane(
		rig,
		String(id + 1),
		0,
		0.78,
		0.27,
		0.13,
		"#17313b",
		null,
		128,
		128,
	);
	for (const x of [-0.22, 0.22])
		ball(rig, C.gold, [x, 0.8, 0.24], [0.045, 0.045, 0.03], false);
	const armL = limb(rig, "armL", -0.43, 0.85, cap, 0.39),
		armR = limb(rig, "armR", 0.43, 0.85, cap, 0.39);
	for (const arm of [armL, armR])
		ball(arm, C.paper, [0, -0.36, 0.04], [0.17, 0.18, 0.17]);
	limb(rig, "legL", -0.18, 0.36, suit, 0.27);
	limb(rig, "legR", 0.18, 0.36, suit, 0.27);
	const tail = new THREE.Group();
	tail.position.set(0.25, 0.5, -0.2);
	tail.rotation.z = -0.65;
	rig.add(tail);
	for (let i = 0; i < 4; i++)
		ball(
			tail,
			i % 2 ? C.ink : C.paper,
			[0.05, -i * 0.12, -0.12 - i * 0.08],
			[0.14, 0.14, 0.16],
		);
	const pack = box(rig, 0x785740, [0, 0.66, -0.33], [0.46, 0.44, 0.23]);
	cylinder(pack, C.gold, [0.35, 0.1, 0], [0.06, 0.64, 0.06]);
	const mixer = new THREE.AnimationMixer(rig);
	const walk = new THREE.AnimationClip("walk", 0.5, [
		new THREE.NumberKeyframeTrack(
			"armL.rotation[z]",
			[0, 0.125, 0.25, 0.375, 0.5],
			[-0.55, 0, 0.55, 0, -0.55],
		),
		new THREE.NumberKeyframeTrack(
			"armR.rotation[z]",
			[0, 0.125, 0.25, 0.375, 0.5],
			[0.55, 0, -0.55, 0, 0.55],
		),
		new THREE.NumberKeyframeTrack(
			"legL.rotation[z]",
			[0, 0.125, 0.25, 0.375, 0.5],
			[0.65, 0, -0.65, 0, 0.65],
		),
		new THREE.NumberKeyframeTrack(
			"legR.rotation[z]",
			[0, 0.125, 0.25, 0.375, 0.5],
			[-0.65, 0, 0.65, 0, -0.65],
		),
		new THREE.NumberKeyframeTrack(
			".position[y]",
			[0, 0.125, 0.25, 0.375, 0.5],
			[0, 0.05, 0, 0.05, 0],
		),
	]);
	const idle = new THREE.AnimationClip("idle", 1.8, [
		new THREE.NumberKeyframeTrack(".scale[y]", [0, 0.9, 1.8], [1, 1.035, 1]),
	]);
	const jump = new THREE.AnimationClip("jump", 0.8, [
		new THREE.NumberKeyframeTrack(
			"armL.rotation[z]",
			[0, 0.15, 0.6, 0.8],
			[0.25, 1.4, 1.4, 0.25],
		),
		new THREE.NumberKeyframeTrack(
			"armR.rotation[z]",
			[0, 0.15, 0.6, 0.8],
			[-0.25, -1.4, -1.4, -0.25],
		),
		new THREE.NumberKeyframeTrack(
			"legL.rotation[z]",
			[0, 0.4, 0.8],
			[0.1, 0.4, 0.1],
		),
		new THREE.NumberKeyframeTrack(
			"legR.rotation[z]",
			[0, 0.4, 0.8],
			[-0.1, -0.4, -0.1],
		),
	]);
	const actions = {
		walk: mixer.clipAction(walk),
		idle: mixer.clipAction(idle),
		jump: mixer.clipAction(jump),
	};
	actions.idle.play();
	root.userData = { rig, mixer, actions, current: "idle" };
	return root;
}
function enemyModel(type) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	root.add(rig);
	const colors = {
		crab: C.teal,
		armored: C.copper,
		hopper: C.red,
		frost: C.ice,
		boss: C.copper,
	};
	const color = colors[type] || C.teal;
	const boss = type === "boss",
		s = boss ? 1.9 : 1;
	rig.scale.setScalar(s);
	ball(rig, color, [0, 0.37, 0], [0.65, 0.37, 0.45]);
	ball(
		rig,
		type === "armored" ? 0xeeb861 : color,
		[0, 0.58, -0.03],
		[0.61, 0.28, 0.43],
	);
	box(rig, C.paper, [0, 0.5, 0.38], [0.7, 0.12, 0.08]);
	for (const x of [-0.32, 0.32]) {
		cylinder(rig, color, [x, 0.75, 0.14], [0.065, 0.4, 0.065]);
		ball(rig, C.paper, [x, 0.95, 0.16], [0.17, 0.2, 0.14]);
		ball(rig, C.ink, [x + 0.04, 0.96, 0.29], [0.075, 0.1, 0.04]);
		const leg = new THREE.Group();
		leg.name = x < 0 ? "clawL" : "clawR";
		leg.position.set(x * 2, 0.32, 0.12);
		rig.add(leg);
		ball(leg, color, [x < 0 ? -0.17 : 0.17, 0.12, 0], [0.28, 0.2, 0.22]);
		const notch = box(
			leg,
			C.ink,
			[x < 0 ? -0.32 : 0.32, 0.2, 0.21],
			[0.1, 0.14, 0.04],
			false,
		);
		for (let j = 0; j < 3; j++) {
			const l = box(
				rig,
				C.ink,
				[x * 1.6, 0.12, -0.25 + j * 0.23],
				[0.42, 0.12, 0.13],
			);
			l.rotation.z = x < 0 ? 0.35 : -0.35;
		}
	}
	if (type === "hopper") {
		for (const x of [-0.55, 0.55]) {
			const wing = ball(rig, C.paper, [x, 0.67, -0.22], [0.38, 0.16, 0.08]);
			wing.rotation.z = x;
		}
		ring(rig, C.gold, [0, 0.68, 0.42], 0.25, 0.06);
	}
	if (type === "frost") {
		for (let i = 0; i < 4; i++) {
			const crystal = mesh(
				rig,
				new THREE.ConeGeometry(0.16, 0.42, 4),
				0xcaf4f5,
				[-0.4 + i * 0.27, 0.86, -0.12],
				[1, 1, 1],
			);
			crystal.rotation.z = (i - 1.5) * 0.18;
		}
	}
	let helmet = null;
	if (type === "armored") {
		helmet = new THREE.Group();
		rig.add(helmet);
		box(helmet, C.ink, [0, 0.81, -0.06], [1.05, 0.12, 0.51]);
		box(helmet, C.gold, [0, 0.87, -0.03], [0.2, 0.14, 0.6]);
	}
	if (boss) {
		cylinder(rig, 0xd09257, [0, 0.93, -0.14], [0.48, 0.62, 0.38]);
		cylinder(rig, C.gold, [0, 1.26, -0.14], [0.58, 0.12, 0.46]);
		const valve = ring(rig, C.red, [0, 1.43, -0.1], 0.33, 0.07);
		box(rig, C.red, [0, 1.43, -0.1], [0.5, 0.055, 0.06]);
		box(rig, C.red, [0, 1.43, -0.1], [0.055, 0.5, 0.06]);
		textPlane(rig, "CLOG", 0, 0.57, 0.48, 0.19, "#17313b");
	}
	const mixer = new THREE.AnimationMixer(rig),
		clip = new THREE.AnimationClip("scuttle", 0.55, [
			new THREE.NumberKeyframeTrack(
				"clawL.rotation[z]",
				[0, 0.275, 0.55],
				[-0.2, 0.3, -0.2],
			),
			new THREE.NumberKeyframeTrack(
				"clawR.rotation[z]",
				[0, 0.275, 0.55],
				[0.2, -0.3, 0.2],
			),
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.275, 0.55],
				[0, 0.055, 0],
			),
		]);
	mixer.clipAction(clip).play();
	root.userData = { rig, mixer, helmet };
	return root;
}
const coinGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.09, 10);
const coinMat = mat(C.gold);
function coinModel() {
	const m = new THREE.Mesh(coinGeo, coinMat);
	m.rotation.x = Math.PI / 2;
	const ink = new THREE.Mesh(coinGeo, black);
	ink.scale.setScalar(1.09);
	m.add(ink);
	return m;
}
const shadowMat = new THREE.MeshBasicMaterial({
	color: 0x081e27,
	transparent: true,
	opacity: 0.3,
	depthWrite: false,
});
function shadow() {
	const m = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), shadowMat);
	m.rotation.x = -Math.PI / 2;
	actors.add(m);
	return m;
}
function floorAt(x, y) {
	let best = null;
	for (const p of platforms)
		if (
			x > p.x - p.w / 2 - 0.1 &&
			x < p.x + p.w / 2 + 0.1 &&
			p.y < y + 0.12 &&
			(!best || p.y > best.y)
		)
			best = p;
	return best;
}
const particles = [],
	floaters = [];
let shake = 0;
function burst(x, y, color, count = 12, force = 4) {
	for (let i = 0; i < count; i++) {
		const m = mesh(
			effectsGroup,
			i % 3 === 0 ? "box" : "sphere",
			color,
			[x, y, 0.4 + Math.random() * 0.6],
			[0.06 + Math.random() * 0.09, 0.06 + Math.random() * 0.09, 0.07],
			false,
		);
		particles.push({
			m,
			x,
			y,
			vx: (Math.random() - 0.5) * force,
			vy: 1 + Math.random() * force,
			z: m.position.z,
			t: 0.4 + Math.random() * 0.4,
			max: 1,
		});
	}
}
function floatText(text, x, y, color = "#ffda70", pop = false) {
	const el = document.createElement("div");
	el.className = "floater" + (pop ? " poptext" : "");
	el.textContent = text;
	el.style.color = color;
	$("floaters").appendChild(el);
	floaters.push({ el, x, y, t: 1.1 });
}
function updateEffects(dt) {
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.t -= dt;
		p.vy -= dt * 10;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.m.position.set(p.x, p.y, p.z);
		p.m.rotation.z += dt * 5;
		p.m.scale.multiplyScalar(1 - dt * 0.5);
		if (p.t <= 0) {
			effectsGroup.remove(p.m);
			particles.splice(i, 1);
		}
	}
	for (let i = floaters.length - 1; i >= 0; i--) {
		const f = floaters[i];
		f.t -= dt;
		f.y += dt * 0.8;
		const v = new THREE.Vector3(f.x, f.y, 1).project(camera);
		f.el.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px";
		f.el.style.top = (-v.y * 0.5 + 0.5) * innerHeight + "px";
		f.el.style.opacity = Math.min(1, f.t * 3);
		if (f.t <= 0) {
			f.el.remove();
			floaters.splice(i, 1);
		}
	}
	for (const p of platforms) p.mixer.update(dt);
	bellMixer.update(dt);
	for (const f of fans) f.rotation.z += dt * 0.5;
	gaugeNeedle.rotation.z = -0.8 + Math.sin(performance.now() * 0.0004) * 0.22;
}
function resize() {
	const a = innerWidth / innerHeight;
	let h = 18.9,
		w = h * a;
	if (w < 32.4) {
		w = 32.4;
		h = w / a;
	}
	camera.left = -w / 2;
	camera.right = w / 2;
	camera.top = h / 2;
	camera.bottom = -h / 2;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
}
addEventListener("resize", resize);
resize();
