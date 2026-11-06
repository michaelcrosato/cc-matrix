import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

export const C = {
	ink: 0x122e2b,
	paper: 0xfff1c9,
	leaf: 0x478d4c,
	lime: 0xa8c857,
	deep: 0x174d43,
	teal: 0x2c8b80,
	orange: 0xf79a48,
	rock: 0xa79f76,
	soil: 0x9b6549,
	gold: 0xf3c55f,
};
const mats = new Map(),
	geos = new Map();
function geo(type) {
	if (!geos.has(type))
		geos.set(
			type,
			type === "box"
				? new THREE.BoxGeometry(1, 1, 1)
				: type === "sphere"
					? new THREE.SphereGeometry(1, 12, 8)
					: type === "cone"
						? new THREE.ConeGeometry(1, 1, 7)
						: type === "cylinder"
							? new THREE.CylinderGeometry(1, 1, 1, 9)
							: type === "rock"
								? new THREE.DodecahedronGeometry(1, 0)
								: type === "leaf"
									? new THREE.SphereGeometry(1, 8, 5)
									: new THREE.TorusGeometry(1, 0.13, 6, 16),
		);
	return geos.get(type);
}
export function mat(hex, flat = false) {
	const key = `${hex}-${flat}`;
	if (mats.has(key)) return mats.get(key);
	const m = new THREE.MeshBasicNodeMaterial({ color: hex });
	if (!flat) {
		const light = normalWorld
			.dot(vec3(-0.35, 0.8, 0.6))
			.mul(0.5)
			.add(0.5);
		const bands = light.mul(3).floor().div(3).mul(0.42).add(0.59);
		m.colorNode = color(hex).mul(bands);
	}
	mats.set(key, m);
	return m;
}
const ink = new THREE.MeshBasicNodeMaterial({
	color: C.ink,
	side: THREE.BackSide,
});
export function shape(
	parent,
	type,
	col,
	x = 0,
	y = 0,
	z = 0,
	sx = 1,
	sy = sx,
	sz = sx,
	outline = true,
) {
	const o = new THREE.Mesh(geo(type), mat(col));
	o.position.set(x, y, z);
	o.scale.set(sx, sy, sz);
	if (outline) {
		const edge = new THREE.Mesh(geo(type), ink);
		edge.scale.setScalar(1.045);
		o.add(edge);
	}
	parent.add(o);
	return o;
}
export function rod(parent, a, b, r, col = C.deep) {
	const va = new THREE.Vector3(...a),
		vb = new THREE.Vector3(...b),
		delta = vb.clone().sub(va);
	const o = shape(
		parent,
		"cylinder",
		col,
		...va.clone().add(vb).multiplyScalar(0.5).toArray(),
		r,
		delta.length(),
		r,
	);
	o.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		delta.normalize(),
	);
	return o;
}
export function label(
	parent,
	text,
	x,
	y,
	z,
	size = 0.6,
	col = "#fff1c9",
	back = null,
) {
	const cn = document.createElement("canvas");
	cn.width = 1024;
	cn.height = 128;
	const cx = cn.getContext("2d");
	if (back) {
		cx.fillStyle = back;
		cx.fillRect(0, 0, 1024, 128);
	}
	cx.font = "900 66px sans-serif";
	cx.textAlign = "center";
	cx.textBaseline = "middle";
	cx.fillStyle = col;
	cx.fillText(text, 512, 67);
	const t = new THREE.CanvasTexture(cn);
	t.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.SpriteMaterial({
		map: t,
		transparent: true,
		depthWrite: false,
	});
	const s = new THREE.Sprite(m);
	s.position.set(x, y, z);
	s.scale.set(size * 8, size, 1);
	parent.add(s);
	return s;
}
export function hero(col = C.teal, ghost = false) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	root.add(rig);
	rig.name = "rig";
	const body = shape(rig, "sphere", col, 0, 1.05, 0, 0.43, 0.54, 0.3);
	body.rotation.z = -0.05;
	shape(rig, "box", C.soil, 0, 0.84, 0.03, 0.83, 0.15, 0.64);
	shape(rig, "sphere", C.paper, 0, 1.76, 0, 0.36, 0.4, 0.33);
	shape(rig, "sphere", C.gold, 0, 2.04, 0, 0.48, 0.25, 0.44);
	shape(rig, "cylinder", C.paper, 0, 1.99, 0, 0.63, 0.09, 0.54);
	shape(rig, "box", C.orange, -0.02, 1.49, 0.02, 0.69, 0.17, 0.62);
	const scarf = shape(rig, "cone", C.orange, -0.56, 1.4, 0, 0.22, 0.68, 0.1);
	scarf.rotation.z = -1.1;
	shape(rig, "sphere", C.ink, 0.2, 1.78, 0.29, 0.045);
	shape(rig, "sphere", C.ink, -0.13, 1.78, 0.3, 0.045);
	shape(rig, "sphere", 0xd89a6c, 0.1, 1.64, 0.31, 0.18, 0.045, 0.02);
	shape(rig, "box", C.soil, -0.4, 1.03, -0.02, 0.28, 0.5, 0.55);
	for (const [name, x, z] of [
		["legL", -0.2, 0.03],
		["legR", 0.2, -0.03],
		["armL", -0.42, 0.0],
		["armR", 0.42, 0.0],
	]) {
		const p = new THREE.Group();
		p.name = name;
		p.position.set(x, name.startsWith("leg") ? 0.77 : 1.37, z);
		rig.add(p);
		if (name.startsWith("leg")) {
			shape(p, "cylinder", C.paper, 0, -0.23, 0, 0.15, 0.47, 0.15);
			shape(p, "box", C.ink, 0.04, -0.5, 0.02, 0.31, 0.21, 0.43);
		} else {
			shape(p, "cylinder", col, 0, -0.22, 0, 0.13, 0.44, 0.13);
			shape(p, "sphere", 0xe6ad7a, 0, -0.48, 0, 0.13);
		}
	}
	const mixer = new THREE.AnimationMixer(root);
	const clips = {};
	const track = (name, values, times) =>
		new THREE.NumberKeyframeTrack(name, times, values);
	clips.idle = new THREE.AnimationClip("idle", 1.8, [
		track("rig.position[y]", [0, 0.06, 0], [0, 0.9, 1.8]),
		track("armL.rotation[z]", [0.1, 0.2, 0.1], [0, 0.9, 1.8]),
		track("armR.rotation[z]", [-0.1, -0.2, -0.1], [0, 0.9, 1.8]),
	]);
	clips.run = new THREE.AnimationClip("run", 0.55, [
		track("legL.rotation[z]", [-0.7, 0.7, -0.7], [0, 0.275, 0.55]),
		track("legR.rotation[z]", [0.7, -0.7, 0.7], [0, 0.275, 0.55]),
		track("armL.rotation[z]", [0.65, -0.65, 0.65], [0, 0.275, 0.55]),
		track("armR.rotation[z]", [-0.65, 0.65, -0.65], [0, 0.275, 0.55]),
		track(
			"rig.position[y]",
			[0, 0.12, 0, 0.12, 0],
			[0, 0.137, 0.275, 0.412, 0.55],
		),
	]);
	clips.swim = new THREE.AnimationClip("swim", 0.9, [
		track("rig.rotation[z]", [-0.6, -0.74, -0.6], [0, 0.45, 0.9]),
		track("legL.rotation[z]", [-0.4, 0.4, -0.4], [0, 0.45, 0.9]),
		track("legR.rotation[z]", [0.4, -0.4, 0.4], [0, 0.45, 0.9]),
		track("armR.rotation[z]", [-2.2, 0.8, -2.2], [0, 0.45, 0.9]),
		track("armL.rotation[z]", [0.8, -2.2, 0.8], [0, 0.45, 0.9]),
	]);
	clips.hang = new THREE.AnimationClip("hang", 1, [
		track("armL.rotation[z]", [2.8, 2.9, 2.8], [0, 0.5, 1]),
		track("armR.rotation[z]", [-2.8, -2.9, -2.8], [0, 0.5, 1]),
		track("legL.rotation[z]", [0.2, 0.35, 0.2], [0, 0.5, 1]),
		track("legR.rotation[z]", [-0.2, -0.35, -0.2], [0, 0.5, 1]),
	]);
	clips.jump = new THREE.AnimationClip("jump", 0.7, [
		track("armL.rotation[z]", [2.2, 1.8, 2.2], [0, 0.35, 0.7]),
		track("armR.rotation[z]", [-2.2, -1.8, -2.2], [0, 0.35, 0.7]),
		track("legL.rotation[z]", [0.7, 0.9, 0.7], [0, 0.35, 0.7]),
		track("legR.rotation[z]", [-0.6, -0.8, -0.6], [0, 0.35, 0.7]),
	]);
	clips.duck = new THREE.AnimationClip("duck", 1, [
		track("rig.scale[y]", [0.54, 0.58, 0.54], [0, 0.5, 1]),
		track("armL.rotation[z]", [0.6, 0.7, 0.6], [0, 0.5, 1]),
		track("armR.rotation[z]", [-0.6, -0.7, -0.6], [0, 0.5, 1]),
	]);
	clips.cheer = new THREE.AnimationClip("cheer", 0.6, [
		track("armL.rotation[z]", [2, 2.9, 2], [0, 0.3, 0.6]),
		track("armR.rotation[z]", [-2, -2.9, -2], [0, 0.3, 0.6]),
		track("rig.position[y]", [0, 0.2, 0], [0, 0.3, 0.6]),
	]);
	let action = null,
		actionName = "";
	return {
		root,
		mixer,
		play(name) {
			if (actionName === name) return;
			const next = mixer.clipAction(clips[name] || clips.idle);
			next.reset().play();
			if (action) action.crossFadeTo(next, 0.13, false);
			action = next;
			actionName = name;
		},
		get animation() {
			return actionName;
		},
		ghost,
	};
}
export function croc() {
	const r = new THREE.Group();
	shape(r, "sphere", C.leaf, 0, 0, 0, 1.2, 0.38, 0.42);
	const jaw = new THREE.Group();
	jaw.name = "jaw";
	jaw.position.set(-0.65, -0.03, 0);
	r.add(jaw);
	shape(jaw, "box", C.lime, -0.7, 0, 0, 1.5, 0.22, 0.65);
	for (let j = 0; j < 5; j++) {
		const t = shape(
			jaw,
			"cone",
			C.paper,
			-1.3 + j * 0.29,
			0.18,
			0.26,
			0.09,
			0.2,
			0.09,
		);
		t.rotation.z = 0;
	}
	shape(r, "box", C.leaf, -1.1, 0.24, 0, 1.5, 0.22, 0.65);
	shape(r, "sphere", C.lime, -0.55, 0.4, 0.25, 0.17);
	shape(r, "sphere", C.ink, -0.61, 0.43, 0.38, 0.065);
	for (let i = 0; i < 5; i++)
		shape(r, "cone", C.deep, 0.1 + i * 0.25, 0.34, 0, 0.13, 0.27, 0.13);
	const tail = shape(r, "cone", C.leaf, 1.6, 0, 0, 0.35, 1.4, 0.32);
	tail.rotation.z = -Math.PI / 2;
	for (const x of [-0.55, 0.65])
		for (const z of [-0.4, 0.4])
			shape(r, "sphere", C.deep, x, -0.2, z, 0.33, 0.13, 0.23);
	const mix = new THREE.AnimationMixer(r);
	mix
		.clipAction(
			new THREE.AnimationClip("chomp", 2.8, [
				new THREE.NumberKeyframeTrack(
					"jaw.rotation[z]",
					[0, 1.2, 1.6, 2.2, 2.8],
					[0, 0.1, 0.32, 0.1, 0],
				),
			]),
		)
		.play();
	return { root: r, mixer: mix };
}
export function sentinel() {
	const r = new THREE.Group();
	shape(r, "sphere", C.gold, 0, 0.9, 0, 0.64, 0.68, 0.45);
	shape(r, "box", C.deep, 0, 1.02, 0.4, 0.8, 0.22, 0.12);
	for (const x of [-0.21, 0.21])
		shape(r, "sphere", C.orange, x, 1.05, 0.51, 0.08);
	shape(r, "cone", C.teal, 0, 1.78, 0, 0.68, 0.57, 0.53);
	for (const x of [-0.55, 0.55]) {
		rod(r, [x, 0.8, 0], [x * 1.55, 0.2, 0.1], 0.12, C.soil);
		shape(r, "box", C.ink, x * 1.55, 0.13, 0.1, 0.43, 0.18, 0.54);
	}
	rod(r, [0.6, 0.6, 0], [1.35, 1.5, 0], 0.08, C.soil);
	const spear = shape(r, "cone", C.paper, 1.5, 1.7, 0, 0.17, 0.68, 0.14);
	spear.rotation.z = -0.6;
	return r;
}
export class JungleScene {
	constructor(canvas) {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xc2dbb4);
		this.camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 180);
		this.camera.position.set(8, 6.5, 30);
		this.camera.lookAt(8, 5, 0);
		this.canvas = canvas;
		this.renderer = null;
		this.world = new THREE.Group();
		this.scene.add(this.world);
		this.floating = [];
		this.decor = [];
		this.mixers = [];
		this.vines = [];
		this.items = [];
		this.enemies = [];
		this.effects = [];
		this.ghosts = new Map();
		this.clock = 0;
		this.stage = 0;
	}
	async init() {
		let forceWebGL =
			!navigator.gpu || new URLSearchParams(location.search).has("webgl");
		let device;
		if (navigator.gpu && !forceWebGL) {
			let expired = false;
			let timer;
			try {
				this.gpu = navigator.gpu;
				const attempt = (async () => {
					this.adapter = await this.gpu.requestAdapter();
					if (!this.adapter || expired) return null;
					const candidate = await this.adapter.requestDevice({
						requiredFeatures: [],
					});
					if (expired) {
						candidate.destroy();
						return null;
					}
					return candidate;
				})();
				device = await Promise.race([
					attempt,
					new Promise((resolve) => {
						timer = setTimeout(() => {
							expired = true;
							resolve(null);
						}, 6500);
					}),
				]);
				if (device) this.gpuDevice = device;
				else forceWebGL = true;
			} catch {
				forceWebGL = true;
			} finally {
				clearTimeout(timer);
			}
		}
		this.renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: false,
			forceWebGL,
			device,
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		this.resize();
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer?.setSize(w, h);
		const aspect = w / h;
		const hh = aspect < 1.1 ? 14 : 10.5;
		this.camera.left = -hh * aspect;
		this.camera.right = hh * aspect;
		this.camera.top = hh;
		this.camera.bottom = -hh;
		this.camera.updateProjectionMatrix();
	}
	clear() {
		this.world.traverse((object) => {
			if (object.isSprite) {
				object.material.map?.dispose();
				object.material.dispose();
			}
			if (object.userData.ownedMaterial) object.material.dispose();
		});
		this.cage = null;
		this.pal = null;
		this.cageBars = null;
		while (this.world.children.length)
			this.world.remove(this.world.children[0]);
		this.vines = [];
		this.items = [];
		this.enemies = [];
		this.decor = [];
		this.floating = [];
		this.mixers = [];
		this.effects = [];
		this.ghosts.clear();
	}
	dispose() {
		this.clear();
		this.renderer?.dispose();
		this.gpuDevice?.destroy();
	}
	rng(seed) {
		let s = seed >>> 0;
		return () => {
			s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
			return s / 4294967296;
		};
	}
	leaf(parent, x, y, z, scale = 1, angle = 0, col = C.leaf) {
		const group = new THREE.Group();
		group.position.set(x, y, z);
		group.rotation.z = angle;
		parent.add(group);
		shape(
			group,
			"leaf",
			col,
			0,
			0.7 * scale,
			0,
			0.33 * scale,
			1.1 * scale,
			0.1 * scale,
		);
		rod(
			group,
			[0, -0.3 * scale, 0.1],
			[0, 1.6 * scale, 0.1],
			0.025 * scale,
			C.deep,
		);
		return group;
	}
	fern(x, y, z, scale = 1) {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		this.world.add(g);
		for (let i = 0; i < 7; i++)
			this.leaf(
				g,
				0,
				0,
				0,
				scale * (0.6 + Math.sin(i) * 0.17),
				(i - 3) * 0.38,
				i % 2 ? C.deep : C.leaf,
			);
		return g;
	}
	tree(x, z, height = 15) {
		const g = new THREE.Group();
		this.world.add(g);
		shape(g, "cylinder", C.deep, x, height / 2 - 2, z, 0.65, height + 4, 0.65);
		rod(g, [x, 5, z], [x - 3, 10, z], 0.32, C.deep);
		rod(g, [x, 7, z], [x + 3, 12, z], 0.35, C.deep);
		for (let j = 0; j < 5; j++) {
			const a = j * 1.4;
			shape(
				g,
				"sphere",
				j % 2 ? C.deep : C.leaf,
				x + Math.cos(a) * 2.4,
				height - 1 + Math.sin(a),
				z,
				3.5,
				1.7,
				1.8,
			);
		}
		for (let j = 0; j < 3; j++)
			this.leaf(g, x + Math.sin(j * 4) * 2, 10 + j, z + 0.5, 1.1, j * 2);
		return g;
	}
	ground(x, width, top = 0, col = C.soil) {
		shape(this.world, "box", col, x, top - 2.1, 0, width, 4.2, 6);
		shape(this.world, "box", C.deep, x, top - 0.05, 0.1, width, 0.28, 6.1);
		shape(this.world, "box", C.lime, x, top + 0.13, 0.1, width, 0.18, 6.15);
		const rand = this.rng(Math.round(x * 83 + 101));
		for (let i = 0; i < width * 0.8; i++)
			shape(
				this.world,
				"rock",
				i % 3 ? 0xb87e52 : 0xe8b87b,
				x - width / 2 + rand() * width,
				top - 0.6 - rand() * 2.8,
				3.03,
				0.1 + rand() * 0.23,
				0.11,
				0.02,
			);
	}
	build(stage) {
		this.clear();
		this.stage = stage;
		const rand = this.rng(104 + stage);
		this.scene.background.setHex(
			[0xc2dbb4, 0x6aaea6, 0xefc68b, 0xc8c8a0][stage],
		);
		const _sky = shape(
			this.world,
			"sphere",
			0xffe5a3,
			32,
			15,
			-28,
			5,
			5,
			0.1,
			false,
		);
		for (let i = 0; i < 18; i++) {
			shape(
				this.world,
				"cone",
				[0x8db19a, 0x6f9d89, 0xa7c8a1][i % 3],
				i * 10 - 25,
				2,
				-30,
				12 + rand() * 9,
				17 + rand() * 12,
				1,
				false,
			);
		}
		for (let x = -15; x < 130; x += 5 + rand() * 5) {
			this.tree(x, -10 - rand() * 7, 13 + rand() * 6);
			if (stage !== 1) this.fern(x, stage === 0 ? -7 : -0.02, -3, 0.9 + rand());
		}
		for (let x = -10; x < 120; x += 11) {
			this.fern(x, stage === 1 || stage === 0 ? -7 : -0.1, 4.6, 1.3);
			this.leaf(this.world, x, 13, 3, 2, Math.PI * 0.72, C.deep);
			this.leaf(this.world, x + 3, 14, 3, 2, -Math.PI * 0.65, C.leaf);
		}
		if (stage === 0) {
			this.ground(-1, 14);
			this.ground(73, 22);
			for (let i = 0; i < 7; i++) this.makeVine(10 + i * 7.6, i);
			for (let i = 0; i < 7; i++) {
				this.makeItem(10 + i * 7.6, 5.4 + (i % 2) * 0.8);
				this.makeItem(13 + i * 7.6, 8.3);
			}
			for (let x = 8; x < 64; x += 7)
				shape(this.world, "cone", C.deep, x, -7, -2, 4, 4, 3);
			shape(this.world, "box", 0x2c7d6f, 36, -7.5, 0, 62, 0.3, 6);
			label(this.world, "CATCH THE NEXT VINE", 10, 11.8, 1, 0.56);
			this.sign(3, "VINEWAY", 2.7);
			this.sign(65, "RIVER →", 2.7);
		}
		if (stage === 1) {
			this.ground(40, 110, -7);
			const water = shape(
				this.world,
				"box",
				0x3d9291,
				44,
				-0.1,
				-8,
				120,
				13.6,
				0.08,
				false,
			);
			water.material = new THREE.MeshBasicNodeMaterial({
				color: 0x3d9291,
				transparent: true,
				opacity: 0.48,
				depthWrite: false,
			});
			water.userData.ownedMaterial = true;
			for (let j = 0; j < 32; j++) {
				const line = shape(
					this.world,
					"box",
					0x92c8b3,
					j * 3.7 - 10,
					(j % 7) * 1.6 - 5.8,
					-2,
					1.7 + (j % 4) * 0.6,
					0.025,
					0.03,
					false,
				);
				this.floating.push({
					obj: line,
					y: line.position.y,
					phase: j,
					kind: "water",
				});
			}
			shape(this.world, "box", 0x77b9a7, 44, 6.9, -1, 110, 0.16, 7);
			for (let j = 0; j < 11; j++) {
				const ln = shape(
					this.world,
					"box",
					0xd4ebc8,
					j * 10 - 8,
					6.94,
					3.1,
					5,
					0.035,
					0.05,
					false,
				);
				this.floating.push({ obj: ln, y: 6.94, phase: j, kind: "water" });
			}
			for (let j = 0; j < 10; j++) {
				const e = croc();
				e.root.position.set(16 + j * 6.9, 1 + (j % 3) * 1.65, 0);
				this.world.add(e.root);
				this.mixers.push(e.mixer);
				this.enemies.push({
					kind: "croc",
					root: e.root,
					x: 16 + j * 6.9,
					y: 1 + (j % 3) * 1.65,
					phase: j * 0.9,
					stun: 0,
					passed: false,
				});
			}
			for (let j = 0; j < 12; j++)
				this.makeItem(9 + j * 6.5, -1.7 + (j % 4) * 1.7);
			for (let j = 0; j < 4; j++) {
				const g = new THREE.Group();
				g.position.set(22 + j * 19, -6, 0);
				this.world.add(g);
				for (let k = 0; k < 6; k++)
					shape(
						g,
						"sphere",
						0xc3e6ca,
						Math.sin(k) * 0.35,
						k * 1.6,
						0,
						0.13 + k * 0.015,
					);
				this.decor.push({ root: g, kind: "bubbles", x: 22 + j * 19 });
			}
			for (let x = 0; x < 100; x += 3)
				this.fern(x, -6.9, -2, 0.6 + rand() * 0.5);
			this.sign(4, "SURFACE FOR AIR", 9.3);
			this.sign(86, "DRY LAND →", 9.3);
		}
		if (stage === 2) {
			this.ground(45, 112);
			for (let x = 20; x < 100; x += 14) {
				shape(this.world, "rock", C.rock, x, -0.5, -5, 4, 5, 2);
				shape(this.world, "rock", 0xceba89, x + 3, -1, -7, 4, 6, 3);
			}
			for (let j = 0; j < 17; j++)
				this.makeItem(10 + j * 4.6, j % 3 === 0 ? 3.7 : 1.6);
			for (let j = 0; j < 6; j++) {
				const r = shape(
					this.world,
					"rock",
					j % 2 ? C.rock : 0xc6b78b,
					24 + j * 14.8,
					1.1,
					0,
					j % 2 ? 1.1 : 0.67,
				);
				const shadow = shape(
					this.world,
					"sphere",
					C.deep,
					24 + j * 14.8,
					0.27,
					0.1,
					j % 2 ? 1.4 : 0.8,
					0.025,
					0.6,
					false,
				);
				this.enemies.push({
					kind: "boulder",
					root: r,
					shadow,
					x: 24 + j * 14.8,
					baseX: 24 + j * 14.8,
					phase: j * 1.7,
					big: j % 2 === 1,
					passed: false,
				});
			}
			this.sign(5, "BOULDER BLUFF", 3.1);
			this.sign(40, "LOW: JUMP · HIGH: DUCK", 5.6);
			this.sign(89, "TEMPLE →", 3);
		}
		if (stage === 3) {
			this.ground(36, 92);
			for (let x = 13; x < 74; x += 13) {
				shape(this.world, "box", C.rock, x, 2.8, -6, 2.7, 6.1, 2);
				shape(this.world, "box", C.gold, x, 5.9, -6, 3.5, 0.6, 2.8);
				for (let k = 0; k < 3; k++)
					shape(
						this.world,
						"box",
						C.deep,
						x,
						1.1 + k * 1.6,
						-4.9,
						2,
						0.15,
						0.1,
					);
			}
			for (let i = 0; i < 5; i++)
				shape(
					this.world,
					"box",
					i % 2 ? C.rock : C.gold,
					52,
					7 + i * 0.65,
					-6,
					26 - i * 2.5,
					0.8,
					5,
				);
			for (let j = 0; j < 4; j++) {
				const r = sentinel();
				this.world.add(r);
				r.position.set(17 + j * 9, 0, 0);
				this.enemies.push({
					kind: "sentinel",
					root: r,
					x: 17 + j * 9,
					phase: j * 1.4,
					stun: 0,
					passed: false,
				});
			}
			for (let j = 0; j < 11; j++)
				this.makeItem(10 + j * 4.5, j % 2 ? 3.1 : 1.3);
			shape(this.world, "cylinder", C.deep, 58, 1, 0, 2.6, 1.4, 2.1);
			shape(this.world, "sphere", C.orange, 58, 1.55, 0, 2.5, 0.4, 2);
			for (let i = 0; i < 8; i++) {
				const s = shape(
					this.world,
					"sphere",
					C.paper,
					58 + Math.sin(i * 4),
					2.2 + i * 0.35,
					-0.3,
					0.3,
					0.6,
					0.2,
					false,
				);
				this.floating.push({
					obj: s,
					y: 2.2 + i * 0.35,
					phase: i,
					kind: "steam",
				});
			}
			this.cage = new THREE.Group();
			this.cage.position.set(58, 5.8, 0);
			this.world.add(this.cage);
			for (const x of [-1.35, 1.35])
				for (const z of [-0.6, 0.6])
					rod(this.cage, [x, -1.4, z], [x, 1.2, z], 0.065, C.gold);
			shape(this.cage, "box", C.soil, 0, -1.4, 0, 3, 0.16, 1.8);
			shape(this.cage, "cone", C.teal, 0, 1.5, 0, 2, 0.8, 1.5);
			this.pal = hero(C.orange);
			this.pal.root.scale.setScalar(0.85);
			this.pal.root.position.set(0, -1.35, 0);
			this.cage.add(this.pal.root);
			this.cageBars = new THREE.Group();
			this.cage.add(this.cageBars);
			for (const x of [-0.85, 0, 0.85])
				rod(this.cageBars, [x, -1.35, 0.75], [x, 1.2, 0.75], 0.045, C.gold);
			this.pal.play("idle");
			this.mixers.push(this.pal.mixer);
			rod(this.world, [58, 7.5, 0], [58, 10.2, 0], 0.06, C.deep);
			this.winch = shape(
				this.world,
				"torus",
				C.gold,
				52,
				1.4,
				1,
				0.7,
				0.7,
				0.7,
			);
			rod(this.world, [52, 0, 0], [52, 1.5, 0], 0.12, C.soil);
			this.sign(51, "HOLD TO FREE PIP", 4);
			this.sign(4, "THE TEA TEMPLE", 3);
		}
		this.player = hero();
		this.world.add(this.player.root);
		this.playerShadow = shape(
			this.world,
			"sphere",
			C.deep,
			3,
			0.27,
			0.6,
			0.65,
			0.025,
			0.38,
			false,
		);
		this.player.play("idle");
		for (let i = 0; i < 25; i++) {
			const s = shape(
				this.world,
				"sphere",
				C.gold,
				-10 + rand() * 120,
				rand() * 13,
				-4 + rand() * 6,
				0.035 + rand() * 0.035,
				undefined,
				undefined,
				false,
			);
			this.floating.push({ obj: s, y: s.position.y, phase: i, kind: "mote" });
		}
	}
	sign(x, text, y = 3) {
		rod(this.world, [x, 0, -1.6], [x, y, -1.6], 0.08, C.soil);
		shape(
			this.world,
			"box",
			C.paper,
			x,
			y,
			-1.6,
			Math.min(11, text.length * 0.34 + 1),
			1.05,
			0.18,
		);
		label(this.world, text, x, y, -1.45, 0.5, "#173f35");
	}
	makeItem(x, y) {
		const r = shape(this.world, "rock", C.gold, x, y, 0, 0.24, 0.38, 0.17);
		this.items.push({ root: r, x, y, got: false });
	}
	makeVine(x, i) {
		const g = new THREE.Group();
		g.position.set(x, 13, 0);
		this.world.add(g);
		rod(g, [0, 0, 0], [0, -8.3, 0], 0.065, C.soil);
		for (let j = 0; j < 6; j++)
			this.leaf(g, 0, -j * 1.4, 0, 0.33, j % 2 ? 0.8 : -0.8, C.lime);
		const _ring = shape(g, "torus", C.gold, 0, -8.3, 0, 0.24, 0.24, 0.24);
		const mixer = new THREE.AnimationMixer(g);
		const duration = 3.2 + (i % 3) * 0.17;
		const times = [],
			vals = [];
		for (let j = 0; j <= 64; j++) {
			times.push((j / 64) * duration);
			vals.push(Math.sin((j / 64) * Math.PI * 2 + i * 0.5) * 0.58);
		}
		const act = mixer.clipAction(
			new THREE.AnimationClip("swing", duration, [
				new THREE.NumberKeyframeTrack(".rotation[z]", times, vals),
			]),
		);
		act.play();
		this.mixers.push(mixer);
		this.vines.push({
			root: g,
			x,
			i,
			length: 8.3,
			tip: new THREE.Vector3(),
			last: new THREE.Vector3(),
			velocity: new THREE.Vector3(),
			mixer,
		});
	}
	ghost(id, col) {
		if (!this.ghosts.has(id)) {
			const h = hero(col, true);
			this.world.add(h.root);
			h.root.scale.setScalar(0.91);
			h.play("run");
			label(h.root, `GHOST ${Number(id) + 1}`, 0, 2.7, 0, 0.36);
			this.ghosts.set(id, h);
		}
		return this.ghosts.get(id);
	}
	burst(x, y, col = C.gold, n = 12) {
		for (let i = 0; i < n; i++) {
			const p = shape(
				this.world,
				"rock",
				col,
				x,
				y,
				0.7,
				0.07 + 0.03 * (i % 3),
				undefined,
				undefined,
				false,
			);
			this.effects.push({
				root: p,
				x,
				y,
				vx: Math.cos(i * 2.4) * (2 + (i % 4)),
				vy: Math.sin(i * 2.4) * 3 + 2,
				life: 1,
			});
		}
	}
	tick(dt, time) {
		this.clock = time;
		for (const m of this.mixers) m.update(dt);
		this.player?.mixer.update(dt);
		for (const v of this.vines) {
			v.last.copy(v.tip);
			v.root.updateMatrixWorld(true);
			v.tip.set(0, -v.length, 0).applyMatrix4(v.root.matrixWorld);
			v.velocity.copy(v.tip).sub(v.last).divideScalar(Math.max(dt, 0.001));
		}
		for (const f of this.floating) {
			f.obj.position.y =
				f.y +
				Math.sin(time * 0.9 + f.phase) * (f.kind === "steam" ? 0.45 : 0.12);
			if (f.kind === "mote")
				f.obj.position.x += Math.sin(time + f.phase) * dt * 0.2;
		}
		for (const it of this.items)
			if (!it.got) {
				it.root.rotation.y = time * 2;
				it.root.position.y = it.y + Math.sin(time * 2 + it.x) * 0.12;
			}
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const e = this.effects[i];
			e.life -= dt;
			e.vy -= 9 * dt;
			e.root.position.x += e.vx * dt;
			e.root.position.y += e.vy * dt;
			e.root.scale.multiplyScalar(1 - dt * 0.65);
			if (e.life <= 0) {
				this.world.remove(e.root);
				this.effects.splice(i, 1);
			}
		}
	}
	follow(x, _y, dt, menu = false) {
		const targetX = menu ? 15 : x + 4;
		const targetY = this.stage === 1 ? 2.5 : 5;
		this.camera.position.x +=
			(targetX - this.camera.position.x) * Math.min(1, dt * 4);
		this.camera.position.y +=
			(targetY + 1.7 - this.camera.position.y) * Math.min(1, dt * 3);
		this.camera.lookAt(this.camera.position.x, this.camera.position.y - 1.7, 0);
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
	async renderProbe() {
		const target = new THREE.RenderTarget(64, 64);
		this.renderer.setRenderTarget(target);
		try {
			await this.renderer.renderAsync(this.scene, this.camera);
			const pixels = await this.renderer.readRenderTargetPixelsAsync(
				target,
				0,
				0,
				64,
				64,
			);
			const colors = new Set();
			let min = 255,
				max = 0;
			for (let i = 0; i < pixels.length; i += 4) {
				colors.add(
					`${pixels[i] >> 3},${pixels[i + 1] >> 3},${pixels[i + 2] >> 3}`,
				);
				min = Math.min(min, pixels[i], pixels[i + 1], pixels[i + 2]);
				max = Math.max(max, pixels[i], pixels[i + 1], pixels[i + 2]);
			}
			return { colors: colors.size, min, max };
		} finally {
			this.renderer.setRenderTarget(null);
			target.dispose();
		}
	}
}
