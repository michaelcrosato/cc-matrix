import * as THREE from "three/webgpu";

const C = {
	ink: 0x172729,
	cream: 0xffe7af,
	brass: 0xe8a657,
	copper: 0xc67443,
	teal: 0x358f8c,
	dark: 0x193d42,
	red: 0xef694d,
	blue: 0x8ed5db,
};
const rand = (a, b) => a + Math.random() * (b - a);
const geo = {
	box: new THREE.BoxGeometry(1, 1, 1),
	sphere: new THREE.SphereGeometry(1, 16, 12),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
	torus: new THREE.TorusGeometry(1, 0.13, 8, 28),
	ico: new THREE.IcosahedronGeometry(1, 0),
};
const mats = new Map();
function mat(color) {
	if (!mats.has(color)) {
		const m = new THREE.MeshToonNodeMaterial({ color });
		mats.set(color, m);
	}
	return mats.get(color);
}
const ink = new THREE.MeshBasicNodeMaterial({
	color: C.ink,
	side: THREE.BackSide,
});
const basic = (color, opacity = 1) =>
	new THREE.MeshBasicNodeMaterial({
		color,
		transparent: opacity < 1,
		opacity,
		depthWrite: opacity === 1,
	});

function mesh(
	parent,
	g,
	color,
	pos = [0, 0, 0],
	scale = [1, 1, 1],
	outline = true,
) {
	const m = new THREE.Mesh(
		typeof g === "string" ? geo[g] : g,
		typeof color === "number" ? mat(color) : color,
	);
	m.position.set(...pos);
	m.scale.set(...scale);
	m.castShadow = true;
	m.receiveShadow = true;
	parent.add(m);
	if (outline) {
		const edge = new THREE.Mesh(m.geometry, ink);
		edge.scale.setScalar(1.045);
		m.add(edge);
	}
	return m;
}
const box = (p, c, pos, s, outline = true) =>
	mesh(p, "box", c, pos, s, outline);
const ball = (p, c, pos, s, outline = true) =>
	mesh(p, "sphere", c, pos, s, outline);
function pipe(parent, points, radius, color) {
	const curve = new THREE.CatmullRomCurve3(
		points.map((p) => new THREE.Vector3(...p)),
		false,
		"catmullrom",
		0.2,
	);
	return mesh(
		parent,
		new THREE.TubeGeometry(curve, 36, radius, 12, false),
		color,
	);
}
function ring(parent, x, y, z, r, color) {
	const m = mesh(parent, "torus", color, [x, y, z], [r, r, r]);
	return m;
}
function label(
	parent,
	text,
	x,
	y,
	z,
	size = 0.4,
	color = "#ffe8b2",
	bg = null,
) {
	const can = document.createElement("canvas");
	can.width = 1024;
	can.height = 192;
	const ctx = can.getContext("2d", { willReadFrequently: true });
	if (bg) {
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, 1024, 192);
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "bold 108px Bungee, sans-serif";
	const fit = Math.min(
		108,
		(108 * 940) / Math.max(1, ctx.measureText(text).width),
	);
	ctx.font = `bold ${fit}px Bungee, sans-serif`;
	ctx.lineWidth = 14;
	ctx.strokeStyle = "#172729";
	ctx.strokeText(text, 512, 100);
	ctx.fillStyle = color;
	ctx.fillText(text, 512, 100);
	const tex = new THREE.CanvasTexture(can);
	tex.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(size * 5.33, size),
		new THREE.MeshBasicNodeMaterial({
			map: tex,
			transparent: true,
			depthWrite: false,
		}),
	);
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}

function mechanic(id = 0) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	root.add(rig);
	rig.name = "rig";
	const jacket = id === 0 ? C.teal : 0x835987,
		cap = id === 0 ? C.red : 0xe4bc61;
	ball(rig, jacket, [0, -0.06, 0], [0.4, 0.43, 0.27]);
	box(rig, C.ink, [0, -0.32, 0.04], [0.69, 0.16, 0.52]);
	const limbs = {};
	for (const [i, s] of [
		[0, -1],
		[1, 1],
	]) {
		const leg = new THREE.Group();
		leg.name = i ? "rightLeg" : "leftLeg";
		leg.position.set(s * 0.2, -0.32, 0);
		rig.add(leg);
		limbs[leg.name] = leg;
		box(leg, 0x24454b, [0, -0.17, 0], [0.25, 0.39, 0.32]);
		box(leg, C.ink, [s * 0.015, -0.39, 0.07], [0.32, 0.2, 0.46]);
		box(leg, 0x667c70, [0, -0.34, 0.19], [0.28, 0.05, 0.13]);
		const arm = new THREE.Group();
		arm.name = i ? "rightArm" : "leftArm";
		arm.position.set(s * 0.4, 0.1, 0);
		rig.add(arm);
		limbs[arm.name] = arm;
		ball(arm, jacket, [s * 0.025, -0.12, 0], [0.16, 0.28, 0.19]);
		ball(arm, C.cream, [s * 0.03, -0.34, 0.04], [0.17, 0.18, 0.19]);
		box(rig, C.brass, [s * 0.2, 0.12, 0.245], [0.07, 0.45, 0.05]);
		ball(rig, C.cream, [s * 0.2, -0.06, 0.3], [0.045, 0.045, 0.035], false);
	}
	box(rig, cap, [0, 0.27, 0.07], [0.64, 0.13, 0.5]);
	const head = new THREE.Group();
	head.name = "head";
	head.position.y = 0.45;
	rig.add(head);
	ball(head, 0xf4c28c, [0, 0.12, 0.04], [0.35, 0.35, 0.3]);
	ball(head, 0xd78d68, [-0.35, 0.12, 0], [0.08, 0.12, 0.1]);
	ball(head, 0xd78d68, [0.35, 0.12, 0], [0.08, 0.12, 0.1]);
	ball(head, cap, [0, 0.37, -0.02], [0.4, 0.22, 0.35]);
	box(head, cap, [0, 0.28, 0.27], [0.81, 0.11, 0.32]);
	box(head, 0x604831, [0, 0.14, 0.29], [0.65, 0.18, 0.08]);
	for (const s of [-1, 1]) {
		ring(head, s * 0.16, 0.14, 0.35, 0.15, C.ink);
		ball(head, 0xd5f0df, [s * 0.16, 0.14, 0.355], [0.122, 0.117, 0.035], false);
		box(
			head,
			0xffffff,
			[s * 0.16 - 0.035, 0.185, 0.393],
			[0.035, 0.07, 0.01],
			false,
		);
	}
	ball(head, 0xe99c70, [0, -0.005, 0.34], [0.1, 0.095, 0.12]);
	const smile = ring(head, 0, -0.08, 0.29, 0.105, C.ink);
	smile.scale.y = 0.52;
	ball(head, C.brass, [0, 0.4, 0.3], [0.13, 0.13, 0.05]);
	ball(head, C.cream, [0, 0.4, 0.35], [0.075, 0.075, 0.025], false);
	// A little wrench hangs from each keeper's belt.
	box(rig, C.brass, [0.36, -0.29, 0.31], [0.07, 0.37, 0.05]);
	ring(rig, 0.36, -0.08, 0.31, 0.095, C.brass);
	const mixer = new THREE.AnimationMixer(rig);
	const track = (n, t, v) => new THREE.NumberKeyframeTrack(n, t, v);
	const clips = {
		idle: new THREE.AnimationClip("idle", 2, [
			track(".scale[y]", [0, 1, 2], [1, 1.025, 1]),
			track("head.rotation[z]", [0, 1, 2], [-0.035, 0.035, -0.035]),
		]),
		run: new THREE.AnimationClip("run", 0.52, [
			track(
				"leftLeg.rotation[z]",
				[0, 0.13, 0.26, 0.39, 0.52],
				[-0.55, 0, 0.55, 0, -0.55],
			),
			track(
				"rightLeg.rotation[z]",
				[0, 0.13, 0.26, 0.39, 0.52],
				[0.55, 0, -0.55, 0, 0.55],
			),
			track("leftArm.rotation[z]", [0, 0.26, 0.52], [0.48, -0.48, 0.48]),
			track("rightArm.rotation[z]", [0, 0.26, 0.52], [-0.48, 0.48, -0.48]),
			track(
				".position[y]",
				[0, 0.13, 0.26, 0.39, 0.52],
				[0, 0.075, 0, 0.075, 0],
			),
		]),
		jump: new THREE.AnimationClip("jump", 0.7, [
			track("leftArm.rotation[z]", [0, 0.25, 0.7], [-1.1, -0.8, -0.5]),
			track("rightArm.rotation[z]", [0, 0.25, 0.7], [1.1, 0.8, 0.5]),
			track("leftLeg.rotation[z]", [0, 0.7], [0.35, 0.1]),
			track("rightLeg.rotation[z]", [0, 0.7], [-0.4, -0.1]),
		]),
		kick: new THREE.AnimationClip("kick", 0.3, [
			track("rightLeg.rotation[z]", [0, 0.1, 0.3], [0, 1.4, 0]),
			track("leftArm.rotation[z]", [0, 0.15, 0.3], [0, -0.65, 0]),
			track(".rotation[z]", [0, 0.15, 0.3], [0, 0.13, 0]),
		]),
	};
	const actions = Object.fromEntries(
		Object.entries(clips).map(([n, c]) => [n, mixer.clipAction(c)]),
	);
	actions.idle.play();
	return { root, rig, mixer, actions, current: "idle" };
}

function pest(type) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "bug";
	root.add(rig);
	const col =
		type === "crab"
			? C.red
			: type === "hopper"
				? 0xb6a7eb
				: type === "frost"
					? C.blue
					: 0xb6bd5b;
	const legs = [];
	if (type === "beetle") {
		ball(rig, 0x647854, [0, 0, 0], [0.55, 0.29, 0.36]);
		ball(rig, col, [0, 0.2, -0.03], [0.48, 0.35, 0.34]);
		const shell = ring(rig, 0, 0.17, 0.29, 0.35, 0x4e693a);
		shell.scale.y = 0.8;
		box(rig, 0xe9d987, [0, 0.31, 0.285], [0.045, 0.33, 0.04]);
		ball(rig, C.cream, [0.42, 0.01, 0.15], [0.2, 0.19, 0.2]);
	} else if (type === "crab") {
		ball(rig, col, [0, 0.05, 0], [0.56, 0.31, 0.32]);
		for (const s of [-1, 1]) {
			box(rig, C.ink, [s * 0.27, 0.32, 0.13], [0.07, 0.35, 0.07]);
			ball(rig, C.cream, [s * 0.27, 0.49, 0.13], [0.14, 0.14, 0.13]);
			ball(rig, C.ink, [s * 0.24, 0.5, 0.25], [0.05, 0.07, 0.04], false);
			const claw = ball(rig, col, [s * 0.72, 0.16, 0.02], [0.25, 0.3, 0.2]);
			claw.rotation.z = s * -0.45;
			box(rig, C.ink, [s * 0.77, 0.32, 0.12], [0.06, 0.2, 0.06]);
		}
	} else if (type === "hopper") {
		ball(rig, 0x76608b, [0, 0.02, 0], [0.4, 0.32, 0.28]);
		ball(rig, col, [0, 0.23, 0.1], [0.38, 0.28, 0.29]);
		for (const s of [-1, 1]) {
			const wing = ball(
				rig,
				0xc9e9d9,
				[s * 0.48, 0.35, -0.05],
				[0.38, 0.16, 0.08],
			);
			wing.name = s < 0 ? "wingL" : "wingR";
		}
		box(rig, 0xffc76a, [0, 0.5, 0.1], [0.07, 0.28, 0.07]);
		ball(rig, C.brass, [0, 0.66, 0.1], [0.12, 0.12, 0.12]);
	} else {
		mesh(rig, new THREE.ConeGeometry(0.53, 0.9, 5), C.blue, [0, 0.07, 0]);
		for (let i = 0; i < 3; i++)
			box(
				rig,
				0xc2f7ee,
				[-0.25 + i * 0.2, 0.03, 0.32],
				[0.06, 0.3, 0.04],
				false,
			);
	}
	if (type !== "crab")
		for (const s of [-1, 1]) {
			ball(rig, C.cream, [s * 0.17, 0.22, 0.3], [0.14, 0.16, 0.075]);
			ball(rig, C.ink, [s * 0.17, 0.21, 0.368], [0.055, 0.08, 0.02], false);
		}
	if (type !== "frost")
		for (let i = 0; i < 4; i++) {
			const l = new THREE.Group();
			l.name = "leg" + i;
			l.position.set((i % 2 ? 1 : -1) * 0.4, -0.12, 0);
			rig.add(l);
			box(l, C.ink, [0, -0.13, i < 2 ? 0.2 : -0.2], [0.12, 0.25, 0.14]);
			legs.push(l);
		}
	const tracks = legs.map(
		(_, i) =>
			new THREE.NumberKeyframeTrack(
				"leg" + i + ".rotation[z]",
				[0, 0.2, 0.4],
				[i % 2 ? 0.3 : -0.3, i % 2 ? -0.3 : 0.3, i % 2 ? 0.3 : -0.3],
			),
	);
	if (type === "hopper") {
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[z]",
				[0, 0.1, 0.2],
				[-0.3, 0.4, -0.3],
			),
		);
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[z]",
				[0, 0.1, 0.2],
				[0.3, -0.4, 0.3],
			),
		);
	}
	const mixer = new THREE.AnimationMixer(rig);
	if (tracks.length)
		mixer.clipAction(new THREE.AnimationClip("scuttle", 0.4, tracks)).play();
	return { root, rig, mixer, type };
}

export class GameView {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x173338);
		this.scene.fog = new THREE.Fog(0x173338, 42, 84);
		this.camera = new THREE.OrthographicCamera(
			-20,
			20,
			11.25,
			-11.25,
			0.1,
			100,
		);
		this.camera.position.set(0, 9, 40);
		this.camera.lookAt(0, 9, 0);
		this.entities = new Map();
		this.fx = [];
		this.time = 0;
		this.shake = 0;
		this.lastPhase = 0;
		this.title = true;
		this.bg = new THREE.Group();
		this.scene.add(this.bg);
		this.platforms = [];
		this.seals = [];
		this.targetCenter = -7;
		this.center = -7;
		this.recovering = false;
		this.recoveries = 0;
		this.renderedFrames = 0;
		this.lastDrawCalls = 0;
	}
	async createRenderer(forceWebGL = false) {
		const renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			forceWebGL,
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(innerWidth, innerHeight);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.1;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		await renderer.init();
		const handleLoss = renderer.onDeviceLost.bind(renderer);
		renderer.onDeviceLost = (info) => {
			handleLoss(info);
			this.graphicsError = { reason: info.reason, message: info.message };
			this.recoverGraphics();
		};
		this.backend = renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL fallback";
		this.initialBackend ||= this.backend;
		this.renderer = renderer;
		this.visualReady = false;
	}
	async recoverGraphics() {
		if (this.recovering || this.recoveries > 0) return;
		this.recovering = true;
		this.recoveries++;
		const old = this.renderer;
		try {
			old.dispose();
		} catch {}
		for (let attempt = 0; attempt < 3; attempt++) {
			const canvas = this.canvas.cloneNode(false);
			this.canvas.replaceWith(canvas);
			this.canvas = canvas;
			try {
				await this.createRenderer(true);
				this.resize();
				this.recovering = false;
				return;
			} catch (error) {
				this.graphicsError.recovery = error.message;
				await new Promise((resolve) => setTimeout(resolve, 400));
			}
		}
		this.failed = true;
	}
	async init() {
		await this.createRenderer(
			new URLSearchParams(location.search).get("capture") === "webgl",
		);
		this.scene.add(new THREE.HemisphereLight(0xb3e8e1, 0x55412c, 2.1));
		const light = new THREE.DirectionalLight(0xffdfaa, 3.3);
		light.position.set(-10, 23, 15);
		light.castShadow = true;
		light.shadow.mapSize.set(2048, 2048);
		Object.assign(light.shadow.camera, {
			left: -20,
			right: 20,
			top: 22,
			bottom: -14,
			near: 0.5,
			far: 75,
		});
		light.shadow.bias = -0.001;
		light.shadow.normalBias = 0.035;
		this.scene.add(light);
		const rim = new THREE.DirectionalLight(0x77d0cc, 1);
		rim.position.set(10, 9, 8);
		this.scene.add(rim);
		this.buildRoom();
		this.resize();
		return this;
	}
	buildRoom() {
		const p = this.bg;
		box(p, 0x20454a, [0, 9, -5.3], [35, 25, 0.8], false);
		// Offset brick courses and inky mortar make a stage, rather than a flat backdrop.
		const brickGeo = new THREE.BoxGeometry(1.68, 0.66, 0.18),
			brickMats = [0x285357, 0x2d595b, 0x244b50, 0x315c5d];
		const bricks = new THREE.InstancedMesh(brickGeo, mat(0xffffff), 24 * 20);
		let n = 0;
		const transform = new THREE.Object3D();
		for (let row = 0; row < 24; row++)
			for (let col = 0; col < 20; col++) {
				transform.position.set(
					-17 + col * 1.78 + (row % 2 ? 0.89 : 0),
					row * 0.79 - 0.4,
					-4.73,
				);
				transform.updateMatrix();
				bricks.setMatrixAt(n, transform.matrix);
				bricks.setColorAt(
					n,
					new THREE.Color(brickMats[(row * 7 + col * 3) % 4]),
				);
				n++;
			}
		bricks.receiveShadow = true;
		p.add(bricks);
		// Huge old pressure vessel with fluted sides, battered brass bands and a face-like gauge.
		const boiler = new THREE.Group();
		boiler.position.set(0, 10, -3.7);
		p.add(boiler);
		mesh(boiler, "cylinder", 0x315f5c, [0, 0, 0], [4, 7.6, 1.3]);
		for (const y of [-3.5, 3.5]) {
			mesh(boiler, "cylinder", C.copper, [0, y, 0.1], [4.12, 0.24, 1.45]);
			for (let x = -3.6; x <= 3.6; x += 0.8)
				ball(boiler, C.brass, [x, y, 1.35], [0.08, 0.08, 0.06]);
		}
		for (let x = -3; x <= 3; x += 0.6)
			box(boiler, 0x244c4b, [x, 0, 1.2], [0.035, 6.8, 0.035], false);
		ring(boiler, 0, 2, 1.45, 0.92, C.brass);
		ball(boiler, C.cream, [0, 2, 1.43], [0.81, 0.81, 0.07], false);
		for (let i = 0; i < 9; i++) {
			const a = Math.PI * 0.15 + (i * Math.PI * 0.7) / 8;
			const line = box(
				boiler,
				C.ink,
				[Math.cos(a) * 0.62, 2 + Math.sin(a) * 0.62, 1.54],
				[0.04, 0.12, 0.01],
				false,
			);
			line.rotation.z = a - Math.PI / 2;
		}
		this.gauge = box(boiler, C.red, [0, 2.2, 1.57], [0.055, 0.62, 0.03]);
		this.gauge.rotation.z = -0.7;
		label(boiler, "OLD FAITHFUL", 0, -1, 1.5, 0.48, "#8eb5a4");
		label(boiler, "EST. 83", 0, -1.6, 1.5, 0.28, "#8eb5a4");
		for (const s of [-1, 1]) {
			pipe(
				p,
				[
					[s * 15, 21, -3],
					[s * 15, 17, -3],
					[s * 10, 17, -3],
					[s * 9, 16, -3],
				],
				0.55,
				C.copper,
			);
			pipe(
				p,
				[
					[s * 17, 1, -3],
					[s * 16, 5, -3],
					[s * 16, 10, -3],
					[s * 13, 10, -3],
				],
				0.28,
				0x477f73,
			);
			pipe(
				p,
				[
					[s * 7, 19, -4],
					[s * 7, 16, -4],
					[s * 5, 14, -3],
				],
				0.28,
				0x9c7c4e,
			);
			for (const y of [4, 7, 10, 13, 16]) {
				mesh(p, "cylinder", C.brass, [s * 15, y, -3], [0.67, 0.18, 0.67]);
				box(p, C.ink, [s * 15, y, -4.2], [1.5, 0.2, 0.4]);
			}
			const v = new THREE.Group();
			v.position.set(s * 15, 8, -2);
			p.add(v);
			ring(v, 0, 0, 0, 0.8, C.red);
			for (let j = 0; j < 3; j++) {
				const bar = box(v, C.red, [0, 0, 0], [1.55, 0.12, 0.12]);
				bar.rotation.z = (j * Math.PI) / 3;
			}
			ball(v, C.brass, [0, 0, 0.1], [0.16, 0.16, 0.12]);
			for (const y of [1.65, 12.9]) {
				const g = new THREE.Group();
				g.position.set(s * 12.85, y, -0.8);
				p.add(g);
				const tube = mesh(
					g,
					"cylinder",
					C.teal,
					[s * 0.8, 0, 0],
					[0.77, 2.1, 0.77],
				);
				tube.rotation.z = Math.PI / 2;
				const mouth = mesh(
					g,
					"cylinder",
					C.ink,
					[-s * 0.25, 0, 0],
					[0.68, 0.05, 0.68],
					false,
				);
				mouth.rotation.z = Math.PI / 2;
				const lip = mesh(
					g,
					"cylinder",
					0x65ac95,
					[-s * 0.23, 0, 0],
					[0.91, 0.28, 0.91],
				);
				lip.rotation.z = Math.PI / 2;
				const hole = ball(
					g,
					C.ink,
					[-s * 0.41, 0, 0.27],
					[0.12, 0.64, 0.6],
					false,
				);
				hole.rotation.z = -s * 0.12;
				for (let j = 0; j < 3; j++) {
					const bolt = ball(
						g,
						C.brass,
						[-s * 0.38, Math.sin(j * 2.09) * 0.75, Math.cos(j * 2.09) * 0.75],
						[0.09, 0.09, 0.09],
					);
				}
			}
			// Caged lanterns and slanting pools of warm light.
			for (const y of [5.4, 14]) {
				box(p, C.ink, [s * 11.8, y, -3.9], [0.8, 1.25, 0.5]);
				box(p, basic(0xffcb76), [s * 11.8, y, -3.53], [0.58, 0.88, 0.1], false);
				for (const dx of [-0.2, 0, 0.2])
					box(p, C.ink, [s * 11.8 + dx, y, -3.42], [0.055, 1, 0.08], false);
				const cone = mesh(
					p,
					new THREE.ConeGeometry(2.4, 6, 24, 1, true),
					basic(0xffcc7e, 0.025),
					[s * 11.8, y - 3.8, -3.2],
					[1, 1, 1],
					false,
				);
			}
		}
		// Floor sump, striped safety edge and little reflected ripples.
		box(p, C.ink, [0, -0.55, -0.8], [34, 1.6, 8]);
		box(p, 0x214a48, [0, -0.17, 1], [31, 0.12, 6], false);
		this.water = [];
		for (let i = 0; i < 22; i++) {
			const w = box(
				p,
				basic(i % 3 ? 0x4c9990 : 0xe7bc75, 0.45),
				[rand(-15, 15), rand(-0.15, 0.2), rand(1, 3)],
				[rand(0.2, 1.3), 0.035, 0.035],
				false,
			);
			this.water.push(w);
		}
		box(p, C.brass, [0, 0.58, 0.1], [28, 0.22, 2.5]);
		for (let x = -13.5; x < 14; x += 0.85) {
			const stripe = box(p, C.ink, [x, 0.62, 1.38], [0.46, 0.24, 0.03], false);
			stripe.rotation.z = -0.3;
		}
		label(p, "MUNICIPAL BOILER WORKS", 0, 19, -4.3, 0.6, "#aac1a2");
		for (const s of [-1, 1]) {
			label(p, s < 0 ? "← WRAP" : "WRAP →", s * 15.5, 3, -2, 0.35, "#79a69c");
		}
		this.pulse = new THREE.Group();
		p.add(this.pulse);
		this.pulse.position.set(0, 2.6, 0.2);
		box(this.pulse, C.ink, [0, 0, -0.15], [2.35, 1.4, 0.65]);
		box(this.pulse, C.brass, [0, 0, 0.22], [2.1, 1.13, 0.3]);
		label(this.pulse, "PULSE", 0, 0.13, 0.4, 0.36, "#172729");
		this.chargeDots = [];
		for (let i = 0; i < 3; i++)
			this.chargeDots.push(
				ball(
					this.pulse,
					C.cream,
					[-0.55 + i * 0.55, -0.3, 0.42],
					[0.12, 0.12, 0.06],
					false,
				),
			);
		// Ambient motes and paper-cut steam, animated in the main scene.
		this.motes = [];
		for (let i = 0; i < 28; i++) {
			const m = ball(
				p,
				basic(i % 4 ? 0xd3e4cb : 0xffcc7e, 0.17),
				[rand(-16, 16), rand(0, 21), rand(-2, 3)],
				[0.025, 0.025, 0.025],
				false,
			);
			this.motes.push(m);
		}
		this.steam = [];
		for (let i = 0; i < 12; i++) {
			const m = ball(
				p,
				basic(0xb8dcd2, 0.07),
				[i % 2 ? 14 : -14, rand(0, 16), -1],
				[rand(0.2, 0.5), rand(0.4, 0.9), 0.1],
				false,
			);
			this.steam.push(m);
		}
		this.bossRoot = new THREE.Group();
		this.bossRoot.visible = false;
		this.bossRoot.position.set(0, 17.2, 0);
		p.add(this.bossRoot);
		ball(this.bossRoot, C.copper, [0, 0.2, -0.45], [1.8, 1.15, 0.8]);
		ring(this.bossRoot, 0, 0.2, 0.35, 0.84, C.brass);
		ball(this.bossRoot, C.cream, [0, 0.2, 0.4], [0.69, 0.69, 0.13]);
		for (const s of [-1, 1]) {
			ball(this.bossRoot, C.ink, [s * 0.25, 0.3, 0.55], [0.1, 0.17, 0.05]);
			const eyebrow = box(
				this.bossRoot,
				C.ink,
				[s * 0.27, 0.58, 0.55],
				[0.38, 0.07, 0.04],
			);
			eyebrow.rotation.z = -s * 0.3;
			pipe(
				this.bossRoot,
				[
					[s * 1.4, 0.4, -0.2],
					[s * 2.1, 0.8, -0.2],
					[s * 2.2, 1.5, -0.2],
				],
				0.22,
				C.brass,
			);
		}
		this.bossNeedle = box(
			this.bossRoot,
			C.red,
			[0, 0.04, 0.58],
			[0.06, 0.5, 0.04],
		);
		for (const x of [-5, 0, 5]) {
			const seal = new THREE.Group();
			seal.position.set(x, 15.55, 1.2);
			p.add(seal);
			ring(seal, 0, 0, 0, 0.34, C.brass);
			const fill = ball(seal, C.red, [0, 0, 0.06], [0.24, 0.24, 0.08], false);
			label(seal, "↑", 0, -0.65, 0.1, 0.3);
			this.seals.push({ root: seal, fill });
			seal.visible = false;
		}
	}
	buildPlatforms(data) {
		for (const o of this.platforms) this.scene.remove(o.group);
		this.platforms = [];
		for (const pf of data) {
			if (pf.y < 1) continue;
			const group = new THREE.Group();
			group.position.set(0, pf.y, 0);
			this.scene.add(group);
			const width = pf.x2 - pf.x1,
				cx = (pf.x1 + pf.x2) / 2;
			box(group, C.ink, [cx, -0.28, -0.1], [width + 0.1, 0.58, 1.9]);
			box(group, 0xb47a4b, [cx, -0.15, 0.16], [width, 0.3, 1.55]);
			const top = box(group, C.cream, [cx, -0.025, 0.14], [width, 0.12, 1.75]);
			for (let x = pf.x1 + 0.35; x < pf.x2; x += 0.7) {
				box(group, C.ink, [x, -0.21, 1], [0.035, 0.3, 0.025], false);
				ball(group, C.brass, [x, -0.22, 1.03], [0.055, 0.055, 0.03], false);
			}
			for (let x = pf.x1 + 0.6; x < pf.x2; x += 1.8) {
				const strut = box(group, C.dark, [x, -0.63, -0.5], [0.17, 1.25, 0.18]);
				strut.rotation.z = 0.65;
			}
			this.platforms.push({ group, top, data: pf });
		}
	}
	setMode(mode) {
		this.title = mode === "title";
		this.targetCenter = this.title ? -7 : 0;
	}
	resize() {
		if (!this.renderer) return;
		const w = innerWidth,
			h = innerHeight,
			aspect = w / h;
		let height = 22.3;
		if (aspect < 1.35) height = 31 / aspect;
		this.camHeight = height;
		this.camera.left = (-height * aspect) / 2;
		this.camera.right = (height * aspect) / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h);
	}
	event(e) {
		const x = e.x || 0,
			y = e.y || 2;
		const col =
			e.type === "coin"
				? C.brass
				: e.type === "hurt"
					? C.red
					: e.type === "freeze"
						? C.blue
						: C.cream;
		if (
			[
				"bump",
				"flip",
				"kick",
				"pow",
				"pulse",
				"hurt",
				"bossHit",
				"boss-hit",
			].includes(e.type)
		) {
			this.shake =
				e.type === "hurt"
					? 0.25
					: e.type === "pow" || e.type === "pulse"
						? 0.4
						: 0.1;
			const r = ring(this.scene, x, y, 1, 0.4, col);
			this.fx.push({ obj: r, ttl: 0.4, max: 0.4, kind: "ring" });
			for (let i = 0; i < 9; i++) {
				const m = mesh(
					this.scene,
					"ico",
					col,
					[x, y, 1],
					[0.13, 0.13, 0.13],
					false,
				);
				this.fx.push({
					obj: m,
					ttl: 0.55,
					max: 0.55,
					vx: rand(-5, 5),
					vy: rand(1, 6),
					kind: "debris",
				});
			}
		}
		if (
			e.text &&
			[
				"kick",
				"coin",
				"combo",
				"clear",
				"bossHit",
				"boss-hit",
				"flip",
			].includes(e.type)
		) {
			const t = label(this.scene, e.text, x, y + 1, 2, 0.45);
			this.fx.push({ obj: t, ttl: 1.2, max: 1.2, vy: 1, kind: "text" });
		}
	}
	update(s, dt) {
		this.time += dt;
		const t = this.time;
		if (!this.platforms.length && s.platforms) this.buildPlatforms(s.platforms);
		if (this.lastPhase !== s.phase) {
			this.lastPhase = s.phase;
			for (const [id, o] of this.entities) {
				this.scene.remove(o.root);
			}
			this.entities.clear();
		}
		const alive = new Set();
		for (const p of s.players || []) {
			const key = "p" + p.id;
			alive.add(key);
			let v = this.entities.get(key);
			if (!v) {
				v = mechanic(p.id);
				this.scene.add(v.root);
				this.entities.set(key, v);
			}
			v.root.position.set(p.x, p.y, 1.1);
			v.root.rotation.y = p.facing < 0 ? -0.25 : 0.25;
			v.rig.scale.x = p.facing || 1;
			v.root.visible =
				p.alive !== false &&
				!(p.invulnerable > 0 && Math.floor(t * 14) % 2 === 0);
			const desired =
				p.anim === "kick"
					? "kick"
					: !p.grounded
						? "jump"
						: Math.abs(p.vx) > 0.3
							? "run"
							: "idle";
			if (desired !== v.current) {
				v.actions[v.current].fadeOut(0.1);
				v.actions[desired].reset().fadeIn(0.1).play();
				v.current = desired;
			}
			v.mixer.update(
				dt * (desired === "run" ? Math.max(0.6, Math.abs(p.vx) / 6) : 1),
			);
		}
		for (const e of s.enemies || []) {
			if (e.state === "dead") continue;
			const key = "e" + e.id;
			alive.add(key);
			let v = this.entities.get(key);
			if (!v || v.type !== e.type) {
				if (v) this.scene.remove(v.root);
				v = pest(e.type);
				this.scene.add(v.root);
				this.entities.set(key, v);
			}
			v.root.position.set(e.x, e.y, 1);
			v.rig.rotation.z = e.state === "flipped" ? Math.PI : 0;
			v.root.rotation.y = e.dir < 0 ? -0.15 : 0.15;
			v.mixer.update(dt * (e.hits ? 1.7 : 1));
			if (e.state === "flipped") {
				v.root.position.y += 0.12;
				v.rig.rotation.z += Math.sin(t * 14) * 0.1;
			}
			v.root.scale.setScalar(e.type === "frost" ? 1.1 : 1);
		}
		for (const c of s.coins || []) {
			const key = "c" + c.id;
			alive.add(key);
			let v = this.entities.get(key);
			if (!v) {
				const root = new THREE.Group();
				const coin = mesh(
					root,
					"cylinder",
					C.brass,
					[0, 0, 0],
					[0.27, 0.09, 0.27],
				);
				coin.rotation.x = Math.PI / 2;
				ring(root, 0, 0, 0.06, 0.2, C.cream);
				box(root, C.cream, [0, 0, 0.085], [0.06, 0.25, 0.02], false);
				v = { root };
				this.entities.set(key, v);
				this.scene.add(root);
			}
			v.root.position.set(c.x, c.y + Math.sin(t * 3 + c.x) * 0.09, 1);
			v.root.rotation.y = t * 2 + c.x;
		}
		for (const h of s.hazards || []) {
			const key = "h" + h.id;
			alive.add(key);
			let v = this.entities.get(key);
			if (!v) {
				const root = new THREE.Group();
				ball(root, C.red, [0, 0, 0], [0.38, 0.38, 0.3]);
				ball(root, C.brass, [0, 0, 0.2], [0.24, 0.24, 0.2], false);
				for (let i = 0; i < 4; i++) {
					const tail = mesh(root, new THREE.ConeGeometry(0.2, 0.7, 5), C.red, [
						-0.35 - i * 0.2,
						0.08,
						0,
					]);
					tail.rotation.z = Math.PI / 2;
				}
				v = { root };
				this.entities.set(key, v);
				this.scene.add(root);
			}
			v.root.position.set(h.x, h.y, 1.2);
			v.root.scale.setScalar(0.9 + Math.sin(t * 20) * 0.12);
		}
		for (const [id, v] of this.entities)
			if (!alive.has(id)) {
				this.scene.remove(v.root);
				this.entities.delete(id);
			}
		for (let i = 0; i < this.platforms.length; i++) {
			const p = this.platforms[i],
				current = (s.platforms || []).find(
					(q) => q.y === p.data.y && q.x1 === p.data.x1,
				);
			p.top.material = mat(current?.frozen ? C.blue : C.cream);
			p.group.position.y =
				p.data.y +
				(current?.bump > 0
					? Math.sin((current.bump / 0.32) * Math.PI) * 0.2
					: 0);
		}
		for (let i = 0; i < 3; i++)
			this.chargeDots[i].material = mat(
				i < s.pulseCharges ? C.cream : 0x746748,
			);
		this.pulse.position.y = 2.5 + Math.sin(t * 1.5) * 0.07;
		this.gauge.rotation.z = -0.6 + Math.sin(t * 1.7) * 0.25;
		this.bossRoot.visible = !!s.boss;
		for (let i = 0; i < 3; i++) {
			const v = this.seals[i];
			v.root.visible = !!s.boss;
			if (s.boss)
				v.fill.material = mat(s.boss.seals?.[i]?.lit ? C.blue : C.red);
		}
		if (s.boss) {
			this.bossRoot.position.y = 17.25 + Math.sin(t * 3) * 0.1;
			this.bossNeedle.rotation.z = Math.sin(t * 9) * (0.3 + s.boss.hp * 0.08);
		}
		for (const w of this.water) {
			w.position.x += dt * 0.2;
			if (w.position.x > 16) w.position.x = -16;
		}
		for (let i = 0; i < this.motes.length; i++) {
			const m = this.motes[i];
			m.position.y += dt * 0.15;
			m.position.x += Math.sin(t + i) * dt * 0.04;
			if (m.position.y > 21) m.position.y = 0;
		}
		for (let i = 0; i < this.steam.length; i++) {
			const m = this.steam[i];
			m.position.y += dt * 0.5;
			m.scale.x = 0.25 + (Math.sin(t * 0.5 + i) + 1) * 0.25;
			m.position.x = (i % 2 ? 14 : -14) + Math.sin(t + i) * 0.3;
			if (m.position.y > 20) m.position.y = 0;
		}
		for (let i = this.fx.length - 1; i >= 0; i--) {
			const f = this.fx[i];
			f.ttl -= dt;
			if (f.kind === "ring")
				f.obj.scale.setScalar(0.4 + (1 - f.ttl / f.max) * 2.5);
			else {
				f.obj.position.y += (f.vy || 0) * dt;
				f.obj.position.x += (f.vx || 0) * dt;
				if (f.kind === "debris") {
					f.vy -= dt * 15;
					f.obj.rotation.z += dt * 7;
					f.obj.scale.setScalar(Math.max(0.001, f.ttl / f.max) * 0.13);
				}
			}
			if (f.ttl <= 0) {
				this.scene.remove(f.obj);
				this.fx.splice(i, 1);
			}
		}
		this.center = THREE.MathUtils.damp(this.center, this.targetCenter, 5, dt);
		this.shake = Math.max(0, this.shake - dt);
		const sy = this.shake * Math.sin(t * 92) * 0.3;
		const sx = this.shake * Math.sin(t * 115) * 0.3;
		this.camera.position.set(this.center + sx, 9 + sy, 40);
		this.camera.lookAt(this.center + sx, 9 + sy, 0);
		if (!this.recovering) {
			this.renderer.render(this.scene, this.camera);
			this.lastDrawCalls = this.renderer.info.render.drawCalls;
			if (this.lastDrawCalls > 0) this.renderedFrames++;
			if (this.lastDrawCalls > 0 && !this.visualReady) {
				this.visualReady = true;
				this.onReady?.();
			}
		}
	}
	project(x, y) {
		const v = new THREE.Vector3(x, y, 1).project(this.camera);
		return {
			x: ((v.x + 1) * innerWidth) / 2,
			y: ((1 - v.y) * innerHeight) / 2,
		};
	}
}
