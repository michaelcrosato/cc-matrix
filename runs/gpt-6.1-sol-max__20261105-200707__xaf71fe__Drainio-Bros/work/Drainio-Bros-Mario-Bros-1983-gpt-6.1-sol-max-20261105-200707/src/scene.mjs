import * as THREE from "three/webgpu";
import { PLATFORMS, PHASES } from "./core.mjs";

const INK = 0x142e31;
const PALETTE = [0xef8e52, 0x6ed2c0, 0xbda1e9, 0xf0d365];
const matCache = new Map();
let ramp;
function material(color, flat = false) {
	const key = `${color}-${flat}`;
	if (!matCache.has(key))
		matCache.set(
			key,
			flat
				? new THREE.MeshBasicMaterial({ color })
				: new THREE.MeshToonMaterial({ color, gradientMap: ramp }),
		);
	return matCache.get(key);
}
const black = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const geometries = {
	box: new THREE.BoxGeometry(1, 1, 1),
	sphere: new THREE.SphereGeometry(1, 18, 12),
	cylinder: new THREE.CylinderGeometry(1, 1, 1, 20),
	torus: new THREE.TorusGeometry(1, 0.12, 8, 32),
	cone: new THREE.ConeGeometry(1, 1, 12),
};
function shape(
	parent,
	geo,
	color,
	x,
	y,
	z,
	sx = 1,
	sy = sx,
	sz = sx,
	outline = true,
) {
	const mesh = new THREE.Mesh(
		typeof geo === "string" ? geometries[geo] : geo,
		material(color),
	);
	mesh.position.set(x, y, z);
	mesh.scale.set(sx, sy, sz);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	if (outline) {
		const edge = new THREE.Mesh(mesh.geometry, black);
		edge.scale.set(1.055, 1.055, 1.055);
		mesh.add(edge);
	}
	parent.add(mesh);
	return mesh;
}
function flatShape(parent, geo, color, x, y, z, sx, sy, sz) {
	const m = shape(parent, geo, color, x, y, z, sx, sy, sz, false);
	m.material = material(color, true);
	return m;
}
function line(parent, points, color = INK, opacity = 1) {
	const g = new THREE.BufferGeometry().setFromPoints(
		points.map((p) => new THREE.Vector3(...p)),
	);
	const m = new THREE.Line(
		g,
		new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
	);
	parent.add(m);
	return m;
}
function ring(parent, x, y, z, r, color, thickness = 0.08) {
	return shape(
		parent,
		new THREE.TorusGeometry(r, thickness, 8, 24),
		color,
		x,
		y,
		z,
		1,
	);
}
function label(
	parent,
	text,
	w,
	h,
	x,
	y,
	z,
	{
		bg = "#ead7a9",
		color = "#1b3436",
		size = 60,
		border = true,
		font = "Bungee",
		rotate = 0,
	} = {},
) {
	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(w * 110);
	canvas.height = Math.ceil(h * 110);
	const ctx = canvas.getContext("2d");
	if (bg) {
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		if (border) {
			ctx.lineWidth = 8;
			ctx.strokeStyle = color;
			ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
		}
	}
	ctx.fillStyle = color;
	ctx.font = `${size}px "${font}", sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(
		text,
		canvas.width / 2,
		canvas.height / 2 + 3,
		canvas.width - 22,
	);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshBasicMaterial({
			map: tex,
			transparent: !bg,
			depthWrite: !!bg,
		}),
	);
	m.position.set(x, y, z);
	m.rotation.z = rotate;
	parent.add(m);
	return m;
}
function pipe(
	parent,
	x,
	y,
	length,
	radius,
	color,
	horizontal = false,
	z = -0.25,
) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	if (horizontal) g.rotation.z = Math.PI / 2;
	shape(g, "cylinder", color, 0, 0, 0, radius, length, radius);
	for (const sign of [-1, 1]) {
		shape(
			g,
			"cylinder",
			color,
			0,
			sign * (length / 2 - 0.12),
			0,
			radius * 1.24,
			0.24,
			radius * 1.24,
		);
		shape(
			g,
			"cylinder",
			0x183b3b,
			0,
			sign * (length / 2 + 0.015),
			0,
			radius * 0.82,
			0.03,
			radius * 0.82,
			false,
		);
	}
	parent.add(g);
	return g;
}
function makeWalk(mixer, root, enemy = false) {
	const tracks = [];
	if (root.getObjectByName("legL")) {
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"legL.rotation[z]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[0.5, -0.5, 0.5, -0.5, 0.5],
			),
		);
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"legR.rotation[z]",
				[0, 0.15, 0.3, 0.45, 0.6],
				[-0.5, 0.5, -0.5, 0.5, -0.5],
			),
		);
	}
	if (root.getObjectByName("armL")) {
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"armL.rotation[z]",
				[0, 0.3, 0.6],
				[-0.4, 0.45, -0.4],
			),
		);
		tracks.push(
			new THREE.NumberKeyframeTrack(
				"armR.rotation[z]",
				[0, 0.3, 0.6],
				[0.45, -0.4, 0.45],
			),
		);
	}
	tracks.push(
		new THREE.NumberKeyframeTrack(
			"rig.position[y]",
			[0, 0.15, 0.3, 0.45, 0.6],
			[0, 0.06, 0, 0.06, 0],
		),
	);
	const walk = mixer.clipAction(
		new THREE.AnimationClip("scuttle", 0.6, tracks),
	);
	walk.play();
	walk.setEffectiveWeight(0);
	const idle = mixer.clipAction(
		new THREE.AnimationClip("breathing", 1.8, [
			new THREE.NumberKeyframeTrack(
				"rig.scale[y]",
				[0, 0.9, 1.8],
				[1, 1.035, 1],
			),
		]),
	);
	idle.play();
	return { walk, idle };
}
function playerModel(color) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "rig";
	root.add(rig);
	shape(rig, "sphere", color, 0, 0.73, 0, 0.34, 0.43, 0.25);
	shape(rig, "box", 0x283e48, 0, 0.65, 0.22, 0.43, 0.4, 0.1);
	for (const side of [-1, 1]) {
		shape(rig, "box", 0xd9d7ae, side * 0.17, 0.91, 0.25, 0.075, 0.23, 0.065);
		shape(rig, "sphere", 0xf3ce6d, side * 0.17, 0.83, 0.3, 0.045);
		const leg = new THREE.Group();
		leg.name = side < 0 ? "legL" : "legR";
		leg.position.set(side * 0.19, 0.43, 0.02);
		rig.add(leg);
		shape(leg, "cylinder", color, 0, -0.12, 0, 0.12, 0.3, 0.12);
		shape(leg, "sphere", 0x233539, 0.055, -0.3, 0.12, 0.19, 0.13, 0.24);
		const arm = new THREE.Group();
		arm.name = side < 0 ? "armL" : "armR";
		arm.position.set(side * 0.32, 0.9, 0);
		rig.add(arm);
		shape(arm, "cylinder", color, side * 0.05, -0.16, 0, 0.115, 0.3, 0.12);
		shape(arm, "sphere", 0xf6dfad, side * 0.07, -0.33, 0.015, 0.13);
	}
	shape(rig, "sphere", 0xbf8c63, 0, 1.18, 0.04, 0.35, 0.31, 0.27);
	shape(rig, "sphere", 0xf1d9a5, 0.04, 1.1, 0.25, 0.28, 0.17, 0.13);
	shape(rig, "sphere", 0x2a3736, 0.22, 1.16, 0.33, 0.09, 0.065, 0.065);
	for (const x of [-0.17, 0.14]) {
		shape(rig, "sphere", 0x503c2e, x, 1.41, 0, 0.13, 0.15, 0.09);
		ring(rig, x, 1.27, 0.28, 0.125, 0xe9bd64, 0.035);
		flatShape(rig, "sphere", 0xf0f4db, x, 1.27, 0.295, 0.105, 0.1, 0.025);
		flatShape(rig, "sphere", INK, x + 0.03, 1.27, 0.325, 0.045, 0.062, 0.02);
		flatShape(
			rig,
			"sphere",
			0xffffff,
			x + 0.044,
			1.3,
			0.346,
			0.017,
			0.02,
			0.01,
		);
	}
	shape(rig, "sphere", color, 0, 1.46, 0.025, 0.37, 0.19, 0.29);
	shape(rig, "box", color, 0.05, 1.43, 0.31, 0.63, 0.09, 0.19);
	shape(rig, "sphere", 0xf6d36c, 0, 1.55, 0.225, 0.1, 0.09, 0.07);
	shape(rig, "box", 0xe5d8a8, -0.28, 0.58, 0.23, 0.07, 0.3, 0.06).rotation.z =
		-0.4;
	ring(rig, -0.34, 0.74, 0.25, 0.08, 0xc5cec2, 0.035);
	const mixer = new THREE.AnimationMixer(root);
	const actions = makeWalk(mixer, root);
	const jump = mixer.clipAction(
		new THREE.AnimationClip("jump", 0.45, [
			new THREE.NumberKeyframeTrack(
				"armL.rotation[z]",
				[0, 0.12, 0.45],
				[0, -2, -0.6],
			),
			new THREE.NumberKeyframeTrack(
				"armR.rotation[z]",
				[0, 0.12, 0.45],
				[0, 2, 0.6],
			),
			new THREE.NumberKeyframeTrack(
				"legL.rotation[z]",
				[0, 0.25, 0.45],
				[0, 0.65, 0.3],
			),
		]),
	);
	jump.setLoop(THREE.LoopOnce, 1);
	jump.clampWhenFinished = true;
	const kick = mixer.clipAction(
		new THREE.AnimationClip("boot", 0.3, [
			new THREE.NumberKeyframeTrack(
				"legR.rotation[z]",
				[0, 0.09, 0.25, 0.3],
				[0, 1.6, 0.4, 0],
			),
			new THREE.NumberKeyframeTrack(
				"rig.rotation[z]",
				[0, 0.1, 0.3],
				[0, -0.2, 0],
			),
		]),
	);
	kick.setLoop(THREE.LoopOnce, 1);
	return { root, rig, mixer, ...actions, jump, kick, jumping: false };
}
function enemyModel(type) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "rig";
	root.add(rig);
	if (type === "shell") {
		shape(rig, "sphere", 0xb3d480, 0.08, 0.28, 0.01, 0.56, 0.23, 0.32);
		shape(rig, "sphere", 0xf0c37e, -0.12, 0.46, -0.02, 0.42, 0.4, 0.31);
		ring(rig, -0.12, 0.48, 0.3, 0.255, 0x946548, 0.04);
		ring(rig, -0.12, 0.48, 0.35, 0.12, 0x946548, 0.035);
		for (const x of [0.28, 0.52]) {
			shape(rig, "cylinder", 0xb3d480, x, 0.52, 0.14, 0.04, 0.4, 0.04);
			shape(rig, "sphere", 0xf6edcf, x, 0.72, 0.16, 0.1);
			flatShape(rig, "sphere", INK, x + 0.025, 0.73, 0.25, 0.04, 0.05, 0.02);
		}
		for (const s of [-1, 1]) {
			const leg = new THREE.Group();
			leg.name = s < 0 ? "legL" : "legR";
			leg.position.set(s * 0.26, 0.16, 0.1);
			rig.add(leg);
			shape(leg, "sphere", 0x91b966, 0, -0.07, 0, 0.19, 0.09, 0.23);
		}
	} else if (type === "crab" || type === "boss") {
		const color = type === "boss" ? 0xc17a50 : 0xec8269;
		shape(rig, "sphere", color, 0, 0.38, 0, 0.53, 0.34, 0.33);
		for (const side of [-1, 1]) {
			const leg = new THREE.Group();
			leg.name = side < 0 ? "legL" : "legR";
			leg.position.set(side * 0.32, 0.25, 0.05);
			rig.add(leg);
			for (let i = 0; i < 3; i++) {
				const m = shape(
					leg,
					"cylinder",
					color,
					side * (0.12 + i * 0.04),
					-0.08,
					i * -0.15,
					0.05,
					0.37,
					0.05,
				);
				m.rotation.z = side * 0.9;
			}
			shape(
				rig,
				"cylinder",
				color,
				side * 0.61,
				0.5,
				0.05,
				0.07,
				0.42,
				0.07,
			).rotation.z = -side * 0.8;
			shape(rig, "sphere", color, side * 0.75, 0.73, 0.08, 0.23, 0.26, 0.17);
			flatShape(
				rig,
				"box",
				INK,
				side * 0.75,
				0.85,
				0.245,
				0.03,
				0.22,
				0.01,
			).rotation.z = side * 0.2;
			shape(rig, "cylinder", color, side * 0.2, 0.68, 0.14, 0.04, 0.27, 0.04);
			shape(rig, "sphere", 0xfff1d4, side * 0.2, 0.83, 0.16, 0.12);
			flatShape(
				rig,
				"sphere",
				INK,
				side * 0.2 + 0.025,
				0.84,
				0.27,
				0.045,
				0.06,
				0.025,
			);
		}
		if (type === "boss") {
			shape(rig, "box", 0xe4b363, 0, 0.55, -0.02, 0.8, 0.17, 0.65);
			for (let i = -1; i <= 1; i++)
				shape(rig, "cone", 0xf6d984, i * 0.23, 0.8, -0.12, 0.13, 0.45, 0.15);
			ring(rig, 0, 0.39, 0.33, 0.2, 0xf0c26c, 0.055);
			for (let i = 0; i < 3; i++) {
				const a = (i * Math.PI * 2) / 3;
				line(
					rig,
					[
						[0, 0.39, 0.4],
						[Math.cos(a) * 0.16, 0.39 + Math.sin(a) * 0.16, 0.4],
					],
					0x593e2f,
				);
			}
			root.scale.setScalar(1.85);
		}
	} else if (type === "hopper") {
		shape(rig, "sphere", 0xb49ade, 0, 0.4, 0, 0.37, 0.33, 0.28);
		for (const side of [-1, 1]) {
			const wing = shape(
				rig,
				"sphere",
				0xb9e2d8,
				side * 0.4,
				0.61,
				-0.12,
				0.31,
				0.17,
				0.07,
			);
			wing.rotation.z = side * 0.5;
			const leg = new THREE.Group();
			leg.name = side < 0 ? "legL" : "legR";
			leg.position.set(side * 0.23, 0.22, 0.08);
			rig.add(leg);
			shape(
				leg,
				"cylinder",
				0x635e85,
				0,
				-0.1,
				0,
				0.045,
				0.3,
				0.045,
			).rotation.z = side * 0.65;
			shape(leg, "sphere", 0xddb0d4, side * 0.1, -0.19, 0.12, 0.16, 0.09, 0.2);
			shape(rig, "sphere", 0xffefcb, side * 0.16, 0.52, 0.22, 0.15);
			flatShape(
				rig,
				"sphere",
				INK,
				side * 0.16 + 0.03,
				0.52,
				0.35,
				0.05,
				0.07,
				0.03,
			);
			shape(
				rig,
				"cylinder",
				0xb49ade,
				side * 0.17,
				0.8,
				0,
				0.035,
				0.3,
				0.035,
			).rotation.z = -side * 0.35;
			shape(rig, "sphere", 0xf2c972, side * 0.23, 0.97, 0, 0.07);
		}
	} else {
		shape(rig, "box", 0x9ae0df, 0, 0.38, 0, 0.72, 0.66, 0.55);
		for (const x of [-0.19, 0.19]) {
			shape(rig, "sphere", 0xe7f8df, x, 0.46, 0.3, 0.13);
			flatShape(rig, "sphere", INK, x + 0.02, 0.46, 0.42, 0.045, 0.06, 0.025);
		}
		line(
			rig,
			[
				[-0.15, 0.19, 0.3],
				[0, 0.24, 0.31],
				[0.15, 0.19, 0.3],
			],
			INK,
		);
		for (const s of [-1, 1]) {
			const l = new THREE.Group();
			l.name = s < 0 ? "legL" : "legR";
			l.position.set(s * 0.2, 0.1, 0);
			rig.add(l);
			shape(l, "sphere", 0x6fb8ce, 0, -0.06, 0.1, 0.14, 0.1, 0.19);
		}
		for (const x of [-0.25, 0.2])
			shape(rig, "cone", 0xd0f7e8, x, 0.84, 0, 0.12, 0.3, 0.12);
	}
	const mixer = new THREE.AnimationMixer(root),
		actions = makeWalk(mixer, root, true);
	return { root, rig, mixer, ...actions };
}

export class InkScene {
	constructor(container, { fallback = false, lowMotion = false } = {}) {
		const data = new Uint8Array([75, 170, 255]);
		ramp = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
		ramp.minFilter = THREE.NearestFilter;
		ramp.magFilter = THREE.NearestFilter;
		ramp.needsUpdate = true;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#15383b");
		this.scene.fog = new THREE.Fog("#15383b", 47, 85);
		this.camera = new THREE.OrthographicCamera(-15, 15, 8.5, -8.5, 0.1, 100);
		this.camera.position.set(0, 8.6, 35);
		this.camera.lookAt(0, 5.7, 0);
		this.renderer = new THREE.WebGPURenderer({
			antialias: true,
			alpha: false,
			forceWebGL: fallback,
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.NoToneMapping;
		this.installRecovery();
		this.renderer.domElement.id = "game-canvas";
		container.append(this.renderer.domElement);
		this.container = container;
		this.lowMotion = lowMotion;
		this.world = new THREE.Group();
		this.scene.add(this.world);
		this.actors = new Map();
		this.tokens = new Map();
		this.hazardModels = new Map();
		this.effects = [];
		this.platformMeshes = new Map();
		this.time = 0;
		this.shake = 0;
		this.titleAmount = 1;
		this.targetTitle = true;
		this.scene.add(new THREE.HemisphereLight(0xffe3b3, 0x3c7f83, 2.3));
		const sun = new THREE.DirectionalLight(0xffdfaf, 2.7);
		sun.position.set(-8, 16, 14);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		sun.shadow.camera.left = -18;
		sun.shadow.camera.right = 18;
		sun.shadow.camera.top = 18;
		sun.shadow.camera.bottom = -8;
		sun.shadow.bias = -0.001;
		sun.shadow.normalBias = 0.03;
		this.scene.add(sun);
		const rim = new THREE.DirectionalLight(0x8ddfd5, 1.2);
		rim.position.set(12, 8, -2);
		this.scene.add(rim);
		this.buildStation();
		this.cover = new THREE.Group();
		this.world.add(this.cover);
		this.coverModels = [];
		for (const [index, color] of PALETTE.slice(0, 2).entries()) {
			const m = playerModel(color);
			m.root.position.set(1.2 + index * 3.7, 3.53, 4 - index * 0.3);
			m.root.scale.setScalar(index ? 2.3 : 2.75);
			m.root.rotation.y = index ? -0.18 : 0.18;
			m.idle.setEffectiveWeight(1);
			this.cover.add(m.root);
			this.coverModels.push(m);
		}
		this.resize();
	}
	installRecovery() {
		this.renderer.onDeviceLost = () => {
			if (!this.recovering)
				this.recovering = this.recover().catch((error) => {
					console.error("Renderer recovery failed:", error);
				});
		};
	}
	async recover() {
		const previous = this.renderer;
		this.renderer = new THREE.WebGPURenderer({
			antialias: true,
			forceWebGL: true,
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.NoToneMapping;
		this.renderer.domElement.id = "game-canvas";
		previous.domElement.replaceWith(this.renderer.domElement);
		await this.renderer.init();
		this.backend = "WebGL 2 compatibility (recovered)";
		this.resize();
		await this.renderer.compileAsync(this.scene, this.camera);
		this.recovering = null;
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 compatibility";
		this.initialBackend = this.backend;
		await this.renderer.compileAsync(this.scene, this.camera);
		return this;
	}
	buildStation() {
		const wallCanvas = document.createElement("canvas");
		wallCanvas.width = 1800;
		wallCanvas.height = 1100;
		const c = wallCanvas.getContext("2d");
		c.fillStyle = "#245156";
		c.fillRect(0, 0, 1800, 1100);
		let seed = 57;
		const rand = () => {
			seed = (seed * 16807) % 2147483647;
			return seed / 2147483647;
		};
		for (let row = 0; row < 17; row++)
			for (let col = -1; col < 20; col++) {
				const x = col * 100 + (row % 2 ? 50 : 0),
					y = row * 68;
				c.fillStyle = ["#28575b", "#2b5a5d", "#255054", "#2c585b"][
					Math.floor(rand() * 4)
				];
				c.fillRect(x + 2, y + 2, 96, 64);
				c.strokeStyle = "#193e43";
				c.lineWidth = 2;
				c.strokeRect(x + 2, y + 2, 96, 64);
				c.strokeStyle = "#4d7975";
				c.globalAlpha = 0.35;
				c.beginPath();
				c.moveTo(x + 8, y + 6);
				c.lineTo(x + 88, y + 6);
				c.stroke();
				c.globalAlpha = 1;
				if (rand() < 0.18) {
					c.strokeStyle = "#173c42";
					c.beginPath();
					c.moveTo(x + 30, y + 2);
					c.lineTo(x + 43, y + 20);
					c.lineTo(x + 33, y + 33);
					c.lineTo(x + 49, y + 62);
					c.stroke();
				}
			}
		for (let i = 0; i < 1200; i++) {
			c.fillStyle = rand() < 0.5 ? "#193e43" : "#52817a";
			c.globalAlpha = 0.2;
			c.fillRect(rand() * 1800, rand() * 1100, 1 + rand() * 3, 2 + rand() * 3);
		}
		c.globalAlpha = 1;
		const tex = new THREE.CanvasTexture(wallCanvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		const wall = new THREE.Mesh(
			new THREE.BoxGeometry(30, 17, 0.5),
			new THREE.MeshToonMaterial({
				map: tex,
				color: 0xffffff,
				gradientMap: ramp,
			}),
		);
		wall.position.set(0, 6, -3.3);
		wall.receiveShadow = true;
		this.world.add(wall);
		// Deep, ink-lined inspection arches, copper plumbing, pressure gauges.
		for (const x of [-8.8, 0, 8.8]) {
			const arch = new THREE.Shape();
			arch.moveTo(-2.45, 0);
			arch.lineTo(-2.45, 7.4);
			arch.absarc(0, 7.4, 2.45, Math.PI, 0, true);
			arch.lineTo(2.45, 0);
			arch.closePath();
			const mesh = shape(
				this.world,
				new THREE.ExtrudeGeometry(arch, { depth: 0.18, bevelEnabled: false }),
				0x173e43,
				x,
				0.3,
				-3,
				1,
				1,
				1,
				false,
			);
			mesh.receiveShadow = true;
			const points = [
				[x - 2.55, 0.3, -2.7],
				[x - 2.55, 7.7, -2.7],
			];
			for (let i = 0; i <= 24; i++) {
				const a = Math.PI - (i * Math.PI) / 24;
				points.push([x + Math.cos(a) * 2.55, 7.7 + Math.sin(a) * 2.55, -2.7]);
			}
			points.push([x + 2.55, 0.3, -2.7]);
			line(this.world, points, 0x759282);
			for (let k = 0; k < 5; k++) {
				const bar = shape(
					this.world,
					"box",
					0x203b40,
					x - 1.6 + k * 0.8,
					4.4,
					-2.64,
					0.08,
					8,
					0.15,
					false,
				);
				bar.castShadow = false;
			}
			for (let y = 1; y < 8; y += 1.2)
				line(
					this.world,
					[
						[x - 1.9, y, -2.55],
						[x + 1.9, y, -2.55],
					],
					0x2e5356,
				);
		}
		for (const x of [-13.8, 13.8]) {
			pipe(this.world, x, 5.6, 14.2, 0.47, 0x548f7d, false, -1.9);
			for (let y = 0.8; y < 12; y += 2.7)
				shape(this.world, "cylinder", 0x263b38, x, y, -1.9, 0.56, 0.14, 0.56);
		}
		pipe(this.world, 0, 12.4, 28.3, 0.22, 0xb18855, true, -1.7);
		for (const x of [-5, 5]) {
			pipe(this.world, x, 11.2, 1.9, 0.13, 0xc5a46d, false, -1.3);
			shape(this.world, "sphere", 0x203f3d, x, 10.8, -1.13, 0.62, 0.62, 0.22);
			ring(this.world, x, 10.8, -0.85, 0.55, 0xbaa06a, 0.075);
			flatShape(
				this.world,
				"sphere",
				0xf1d9a1,
				x,
				10.8,
				-0.88,
				0.47,
				0.47,
				0.06,
			);
			for (let n = 0; n < 9; n++) {
				const a = -0.5 + n * Math.PI * 0.23;
				line(
					this.world,
					[
						[x + Math.cos(a) * 0.34, 10.8 + Math.sin(a) * 0.34, -0.79],
						[x + Math.cos(a) * 0.41, 10.8 + Math.sin(a) * 0.41, -0.79],
					],
					INK,
				);
			}
			const needle = shape(
				this.world,
				"box",
				0xb65d41,
				x,
				10.89,
				-0.72,
				0.035,
				0.38,
				0.04,
			);
			needle.rotation.z = x > 0 ? -0.7 : 0.7;
		}
		label(this.world, "WATERWORKS", 5.1, 0.85, 0, 11.9, -0.8, { size: 65 });
		label(this.world, "NIGHT SHIFT / No. 07", 4.8, 0.42, 0, 11.25, -0.8, {
			size: 30,
			bg: null,
			color: "#acc9b3",
			font: "Barlow Condensed",
		});
		for (const side of [-1, 1]) {
			pipe(this.world, side * 11.5, 11.3, 2.7, 0.6, 0x65b19a, false, -0.5);
			pipe(this.world, side * 11.6, 10.6, 1.8, 0.59, 0x65b19a, true, -0.48);
			pipe(this.world, side * 11.5, 0.55, 1.7, 0.57, 0x5c9e87, true, -0.35);
			const valve = new THREE.Group();
			valve.position.set(side * 13.75, 4.7, -0.75);
			this.world.add(valve);
			ring(valve, 0, 0, 0, 0.62, 0xe18b59, 0.1);
			shape(valve, "sphere", 0xceb273, 0, 0, 0.03, 0.14);
			for (let i = 0; i < 4; i++) {
				const a = (i * Math.PI) / 2;
				const spoke = shape(
					valve,
					"box",
					0xe18b59,
					Math.cos(a) * 0.28,
					Math.sin(a) * 0.28,
					0,
					0.54,
					0.08,
					0.08,
					false,
				);
				spoke.rotation.z = a;
			}
			label(
				this.world,
				side < 0 ? "IN" : "OUT",
				1.2,
				0.48,
				side * 11.5,
				12.55,
				-0.3,
				{ bg: "#e5c788", size: 33 },
			);
			// Wall lamps with scalloped shades.
			shape(
				this.world,
				"cone",
				0xe7b267,
				side * 8.6,
				11.9,
				-1.3,
				0.5,
				0.3,
				0.38,
			);
			flatShape(
				this.world,
				"sphere",
				0xffecb4,
				side * 8.6,
				11.7,
				-1.2,
				0.28,
				0.12,
				0.22,
			);
			const glow = new THREE.PointLight(0xffc16d, 5, 7, 2);
			glow.position.set(side * 8.6, 10.7, 1);
			this.world.add(glow);
		}
		for (const p of PLATFORMS) {
			const group = new THREE.Group();
			group.position.set(p.x, p.y - p.h / 2, 0);
			this.world.add(group);
			this.platformMeshes.set(p.id, group);
			if (p.special) {
				shape(group, "box", 0xefb85f, 0, 0, 0, p.w, p.h, 0.9);
				this.bopLabel = label(group, "BOP", 1.02, 0.55, 0, 0.03, 0.49, {
					bg: "#f2cd7a",
					size: 42,
					border: false,
				});
				for (const x of [-0.46, 0.46])
					for (const y of [-0.32, 0.32])
						shape(group, "sphere", INK, x, y, 0.48, 0.045);
			} else {
				shape(
					group,
					"box",
					p.id === "ground" ? 0xa67b51 : 0xd3a16b,
					0,
					0,
					-0.05,
					p.w,
					p.h,
					1.6,
				);
				shape(
					group,
					"box",
					0xe1c08b,
					0,
					p.h / 2 - 0.04,
					0.07,
					p.w + 0.08,
					0.13,
					1.72,
				);
				shape(
					group,
					"box",
					0x82694d,
					0,
					-p.h / 2 + 0.05,
					0.73,
					p.w,
					0.11,
					0.09,
					false,
				);
				const segments = Math.ceil(p.w / 0.9);
				for (let i = 0; i < segments; i++) {
					const x = -p.w / 2 + (i * p.w) / segments;
					line(
						group,
						[
							[x, -0.13, 0.77],
							[x + 0.08, 0.07, 0.78],
						],
						0x775c44,
					);
					if (i % 2 === 0) {
						flatShape(
							group,
							"sphere",
							0x635941,
							x + 0.3,
							-0.04,
							0.79,
							0.035,
							0.035,
							0.015,
						);
						line(
							group,
							[
								[x + 0.12, 0.09, 0.79],
								[x + 0.24, 0.14, 0.79],
							],
							0xf4d49a,
						);
					}
				}
				if (p.y > 0 && p.w > 2)
					for (const end of [-1, 1]) {
						const support = shape(
							group,
							"box",
							0x657d6c,
							end * (p.w / 2 - 0.5),
							-0.43,
							-0.65,
							0.12,
							0.85,
							0.15,
						);
						support.rotation.z = end * -0.6;
					}
				const frost = shape(
					group,
					"box",
					0xa9e8e4,
					0,
					p.h / 2 + 0.04,
					0.1,
					p.w,
					0.09,
					1.65,
					false,
				);
				frost.visible = false;
				group.userData.frost = frost;
			}
			group.userData.baseY = group.position.y;
		}
		// A dark water channel and reflected brass beneath the deck.
		shape(this.world, "box", 0x183b40, 0, -1.15, -0.5, 28.5, 1.2, 3, false);
		for (let i = 0; i < 36; i++)
			line(
				this.world,
				[
					[-13 + i * 0.75, -0.65 + (i % 3) * 0.06, 1.1],
					[-12.6 + i * 0.75, -0.65 + (i % 3) * 0.06, 1.1],
				],
				i % 3 === 0 ? 0x8bba9e : 0x426e69,
			);
		label(this.world, "MIND YOUR HEAD", 3.1, 0.54, -5.7, 1.4, -2.4, {
			size: 32,
			bg: "#c7aa6d",
			rotate: -0.04,
		});
		label(this.world, "BUMP • FLIP • BOOT", 4.0, 0.52, 5.5, 5.0, -2.4, {
			size: 30,
			bg: "#b7b986",
			rotate: 0.025,
		});
		label(this.world, "↔", 1, 0.5, -11.6, 2.0, -2.4, {
			size: 40,
			bg: null,
			color: "#94baa0",
			font: "sans-serif",
		});
		// Cross hatching adds the small imperfections of an illustrated cutaway.
		for (let i = 0; i < 68; i++) {
			const x = rand() * 25 - 12.5,
				y = rand() * 11;
			if (i % 4 === 0)
				for (let j = 0; j < 3; j++)
					line(
						this.world,
						[
							[x + j * 0.08, y, -2.9],
							[x + 0.2 + j * 0.08, y + 0.3, -2.9],
						],
						0x598079,
						0.4,
					);
		}
	}
	resize() {
		const { width: w, height: h } = this.container.getBoundingClientRect();
		if (!w || !h) return;
		this.renderer.setSize(w, h);
		this.aspect = w / h;
		const vertical = Math.max(15.9, 28.5 / this.aspect);
		this.viewHeight = vertical;
		this.camera.left = (-vertical * this.aspect) / 2;
		this.camera.right = (vertical * this.aspect) / 2;
		this.camera.top = vertical / 2;
		this.camera.bottom = -vertical / 2;
		this.camera.updateProjectionMatrix();
	}
	ensureActor(e, player = false) {
		const key = `${player ? "p" : "e"}${e.id}`;
		if (!this.actors.has(key)) {
			const model = player
				? playerModel(PALETTE[e.id % 4])
				: enemyModel(e.type);
			model.type = e.type;
			model.player = player;
			model.root.position.set(
				e.x,
				e.y - (player ? 0.62 : e.type === "boss" ? 0.65 : 0.35),
				0.3,
			);
			this.world.add(model.root);
			this.actors.set(key, model);
		}
		return this.actors.get(key);
	}
	update(state, dt, title = false) {
		this.time += dt;
		this.targetTitle = title;
		this.titleAmount = THREE.MathUtils.damp(
			this.titleAmount,
			title ? 1 : 0,
			4,
			dt,
		);
		const t = this.time;
		this.cover.visible = this.titleAmount > 0.05;
		this.cover.scale.setScalar(this.titleAmount);
		for (const m of this.coverModels) m.mixer.update(dt);
		const baseX = -this.titleAmount * 5.5;
		this.camera.position.x = baseX;
		this.camera.position.y = 8.6;
		if (this.shake > 0 && !this.lowMotion) {
			this.camera.position.x += Math.sin(t * 81) * this.shake * 0.15;
			this.camera.position.y += Math.cos(t * 67) * this.shake * 0.1;
			this.shake = Math.max(0, this.shake - dt * 2.5);
		}
		this.camera.lookAt(baseX, 5.65, 0);
		const seen = new Set();
		for (const e of [
			...state.players.map((p) => ({ ...p, isPlayer: true })),
			...state.enemies,
		]) {
			const m = this.ensureActor(e, e.isPlayer),
				key = `${e.isPlayer ? "p" : "e"}${e.id}`;
			seen.add(key);
			const target = new THREE.Vector3(
				e.x,
				e.y - (e.isPlayer ? 0.62 : e.type === "boss" ? 0.65 : 0.35),
				0.45,
			);
			const teleport = m.root.position.distanceTo(target) > 4;
			if (teleport || title || !state.remote) m.root.position.copy(target);
			else m.root.position.lerp(target, 1 - Math.exp(-dt * 20));
			m.root.visible =
				e.lives !== 0 &&
				!(e.invuln > 0 && e.dead <= 0 && Math.floor(t * 12) % 2 === 0);
			m.root.rotation.z = e.dead > 0 ? t * 8 : 0;
			m.root.rotation.y = e.isPlayer ? (e.dir < 0 ? -0.24 : 0.24) : 0;
			m.rig.rotation.z = e.state === "flipped" ? Math.PI : 0;
			const baseline = e.type === "boss" ? 1.85 : 1;
			m.root.scale.x = baseline * (e.isPlayer ? 1 : e.dir < 0 ? -1 : 1);
			m.root.scale.y = baseline;
			m.root.scale.z = baseline;
			if (e.state === "flipped") {
				m.rig.position.y = 0.75;
				m.root.rotation.z =
					Math.sin(t * (e.stun < 3 ? 22 : 8)) * (e.stun < 3 ? 0.13 : 0.03);
			} else {
				m.rig.position.y = 0;
				if (!e.dead) m.root.rotation.z = 0;
			}
			const moving = Math.min(1, Math.abs(e.vx || 0) / (e.isPlayer ? 4 : 1));
			m.walk.setEffectiveWeight(
				e.grounded !== false && e.state !== "flipped" ? moving : 0.05,
			);
			m.walk.timeScale = 0.65 + moving * 0.8;
			m.idle.setEffectiveWeight(1 - moving * 0.6);
			if (e.isPlayer) {
				if (!e.grounded && !m.jumping) {
					m.jump.reset().setEffectiveWeight(1).play();
					m.jumping = true;
				}
				if (e.grounded && m.jumping) {
					m.jump.fadeOut(0.1);
					m.jumping = false;
				}
				if (e.kick > 0 && !m.kicking) {
					m.kick.reset().setEffectiveWeight(1).play();
					m.kicking = true;
				}
				if (e.kick <= 0) m.kicking = false;
			}
			m.mixer.update(dt);
			if (e.state === "flipped") {
				m.rig.rotation.z = Math.PI;
				m.rig.position.y = 0.78;
			}
		}
		for (const [key, m] of this.actors)
			if (!seen.has(key)) {
				this.world.remove(m.root);
				m.mixer.stopAllAction();
				this.actors.delete(key);
			}
		const coinSeen = new Set();
		for (const c of state.coins) {
			coinSeen.add(c.id);
			let m = this.tokens.get(c.id);
			if (!m) {
				m = new THREE.Group();
				const disk = shape(m, "cylinder", 0xf4c861, 0, 0, 0, 0.25, 0.1, 0.25);
				disk.rotation.x = Math.PI / 2;
				ring(m, 0, 0, 0.07, 0.18, 0xaa743a, 0.025);
				flatShape(m, "box", 0xffe6a0, 0, 0, 0.09, 0.05, 0.22, 0.02);
				this.world.add(m);
				this.tokens.set(c.id, m);
			}
			m.position.set(
				c.x,
				c.y + (c.bonus ? Math.sin(t * 3 + c.id) * 0.07 : 0),
				0.65,
			);
			m.rotation.y = t * 2.5 + c.id;
		}
		for (const [id, m] of this.tokens)
			if (!coinSeen.has(id)) {
				this.world.remove(m);
				this.tokens.delete(id);
			}
		const hazardSeen = new Set();
		for (const h of state.hazards) {
			hazardSeen.add(h.id);
			let m = this.hazardModels.get(h.id);
			if (!m) {
				m = new THREE.Group();
				if (h.type === "fire") {
					shape(m, "sphere", 0xf5ad56, 0, 0, 0, 0.38);
					shape(m, "sphere", 0xffe7a3, 0, 0, 0.29, 0.21);
					for (let i = 0; i < 5; i++)
						shape(
							m,
							"cone",
							0xe77b4d,
							-0.25 - i * 0.1,
							0.02 + Math.sin(i) * 0.1,
							-0.03,
							0.25 - i * 0.025,
							0.6 + i * 0.05,
							0.2,
						).rotation.z = -Math.PI / 2;
				} else {
					shape(m, "cone", 0xc1efdf, 0, 0, 0, 0.27, 1.0, 0.25).rotation.z =
						Math.PI;
				}
				this.world.add(m);
				this.hazardModels.set(h.id, m);
			}
			m.position.set(h.x, h.y, 0.5);
			if (h.type === "fire") {
				m.scale.x = h.dir;
				m.rotation.z = Math.sin(t * 15) * 0.12;
			} else {
				m.visible = h.age > 1.1 || Math.floor(t * 12) % 2 === 0;
			}
		}
		for (const [id, m] of this.hazardModels)
			if (!hazardSeen.has(id)) {
				this.world.remove(m);
				this.hazardModels.delete(id);
			}
		for (const [id, m] of this.platformMeshes) {
			m.position.y =
				m.userData.baseY +
				(m.userData.bump ? Math.sin(m.userData.bump * Math.PI * 2) * 0.12 : 0);
			m.userData.bump = Math.max(0, (m.userData.bump || 0) - dt * 3);
			if (m.userData.frost) m.userData.frost.visible = state.ice.includes(id);
		}
		const bop = this.platformMeshes.get("bop");
		bop.scale.y = state.pow > 0 ? 0.7 + state.pow * 0.1 : 0.48;
		this.bopLabel.material.color.set(state.pow > 0 ? 0xffffff : 0x8d9a88);
		for (const f of this.effects) {
			f.life -= dt;
			f.mesh.position.x += f.vx * dt;
			f.mesh.position.y += f.vy * dt;
			f.vy -= f.gravity * dt;
			f.mesh.rotation.z += f.spin * dt;
			if (f.mesh.material?.transparent)
				f.mesh.material.opacity = Math.min(1, f.life * 3);
		}
		for (const f of this.effects.filter((f) => f.life <= 0)) {
			this.world.remove(f.mesh);
			if (f.dispose) {
				f.mesh.material.map?.dispose();
				f.mesh.material.dispose();
				f.mesh.geometry.dispose();
			}
		}
		this.effects = this.effects.filter((f) => f.life > 0);
	}
	burst(x, y, color, n = 14, big = false) {
		for (let i = 0; i < n; i++) {
			const m = shape(
				this.world,
				i % 3 ? "box" : "sphere",
				color,
				x,
				y,
				1,
				0.055 + Math.random() * 0.08,
				0.055 + Math.random() * 0.08,
				0.055,
				i % 3 === 0,
			);
			this.effects.push({
				mesh: m,
				vx: (Math.random() - 0.5) * (big ? 12 : 7),
				vy: 2 + Math.random() * 6,
				gravity: 16,
				spin: (Math.random() - 0.5) * 20,
				life: 0.4 + Math.random() * 0.6,
			});
		}
	}
	word(text, x, y, color = "#f9dc87", big = false) {
		const m = label(
			this.world,
			text,
			big ? 3.1 : 2.0,
			big ? 1.1 : 0.7,
			x,
			y + 0.7,
			2,
			{
				bg: null,
				color,
				size: big ? 78 : 58,
				border: false,
				rotate: (Math.random() - 0.5) * 0.15,
			},
		);
		this.effects.push({
			mesh: m,
			vx: 0,
			vy: 0.85,
			gravity: 0,
			spin: 0,
			life: 1.05,
			dispose: true,
		});
	}
	event(e) {
		if (e.type === "bump") {
			const m = this.platformMeshes.get(e.platform);
			if (m) m.userData.bump = 0.5;
			this.burst(e.x, e.y - 0.25, 0xe7c690, 6);
		}
		if (e.type === "flip") {
			this.word("FLIP!", e.x, e.y);
			this.burst(e.x, e.y, 0xf1d27f, 9);
		}
		if (e.type === "armor")
			this.word(e.armor === 1 ? "ONE MORE!" : "CRACK!", e.x, e.y, "#f9ba83");
		if (e.type === "kick") {
			this.word(
				e.combo > 1 ? `${e.combo}× BOOT!` : "BOOT!",
				e.x,
				e.y,
				"#f9e3a1",
				true,
			);
			this.burst(
				e.x,
				e.y,
				e.enemy === "hopper" ? 0xc2a6df : 0xf3c777,
				23,
				true,
			);
			this.shake = 0.5;
		}
		if (e.type === "coin") this.burst(e.x, e.y, 0xf7d36f, 7);
		if (e.type === "bop") {
			this.shake = 1;
			this.word("B-O-P!", 0, 4.5, "#ffe2a1", true);
			this.burst(0, 2, 0xf2c56a, 35, true);
		}
		if (e.type === "hurt") {
			this.shake = 0.7;
			this.word("OOPS!", e.x, e.y, "#f4aa8a");
			this.burst(e.x, e.y, 0xef9b70, 18);
		}
		if (["freeze", "shatter"].includes(e.type)) {
			this.word(e.type === "freeze" ? "Brrr!" : "CRUNCH!", e.x, e.y, "#b9efe3");
			this.burst(e.x, e.y, 0xb4e8dc, 20);
		}
		if (e.type === "extra") this.word("+1 LIFE!", e.x, e.y, "#c5e59c");
		if (["wrap", "pipe", "spawn", "respawn"].includes(e.type))
			this.burst(e.x, e.y, 0x8ccebd, 9);
		if (e.type === "victory")
			for (let i = 0; i < 10; i++)
				this.burst((i - 5) * 2.5, 11.5, PALETTE[i % 4], 12, true);
	}
	debugPhysics(data) {
		if (this.debugLines) {
			this.scene.remove(this.debugLines);
			this.debugLines.geometry.dispose();
			this.debugLines.material.dispose();
			this.debugLines = null;
		}
		if (!data) return;
		const vertices = [];
		for (let i = 0; i < data.vertices.length; i += 2)
			vertices.push(data.vertices[i], data.vertices[i + 1], 2.7);
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		this.debugLines = new THREE.LineSegments(
			g,
			new THREE.LineBasicMaterial({ color: 0xbcff99, depthTest: false }),
		);
		this.scene.add(this.debugLines);
	}
	render() {
		if (!this.recovering) this.renderer.render(this.scene, this.camera);
	}
	async capture() {
		await this.renderer.renderAsync(this.scene, this.camera);
		return this.renderer.domElement.toDataURL();
	}
}
