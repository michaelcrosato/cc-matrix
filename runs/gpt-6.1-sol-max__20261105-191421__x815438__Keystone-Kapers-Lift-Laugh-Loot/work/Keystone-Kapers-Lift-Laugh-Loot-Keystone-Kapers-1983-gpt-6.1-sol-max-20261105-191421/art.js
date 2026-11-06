import * as THREE from "three/webgpu";
import { FLOOR } from "./core.js";

const C = {
	ink: 0x24333e,
	navy: 0x274b60,
	blue: 0x4586a3,
	cream: 0xffe8b8,
	paper: 0xf3d8aa,
	orange: 0xe76e40,
	yellow: 0xf8c756,
	mint: 0x76aea4,
	pink: 0xc88685,
	plum: 0x705b70,
	skin: 0xefba86,
	white: 0xfff3d2,
	red: 0xc94f40,
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const edgeGeo = new THREE.EdgesGeometry(boxGeo);
const ink = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
const lineMat = new THREE.LineBasicMaterial({
	color: C.ink,
	transparent: true,
	opacity: 0.72,
});
const materials = new Map();
const gradient = new THREE.DataTexture(
	new Uint8Array([90, 145, 205, 255]),
	4,
	1,
	THREE.RedFormat,
);
gradient.minFilter = THREE.NearestFilter;
gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
function mat(color) {
	if (!materials.has(color))
		materials.set(
			color,
			new THREE.MeshToonMaterial({ color, gradientMap: gradient }),
		);
	return materials.get(color);
}
function mesh(geo, color, outline = true) {
	const m = new THREE.Mesh(geo, mat(color));
	m.castShadow = true;
	m.receiveShadow = true;
	if (outline) {
		const o = new THREE.Mesh(geo, ink);
		o.scale.setScalar(1.045);
		o.castShadow = false;
		m.add(o);
	}
	return m;
}
function box(parent, x, y, z, w, h, d, color, outline = true) {
	const m = mesh(boxGeo, color, false);
	m.position.set(x, y, z);
	m.scale.set(w, h, d);
	if (outline) {
		const e = new THREE.LineSegments(edgeGeo, lineMat);
		e.scale.setScalar(1.002);
		m.add(e);
	}
	parent.add(m);
	return m;
}
function sphere(parent, x, y, z, rx, ry, rz, color, detail = 16) {
	const m = mesh(new THREE.SphereGeometry(1, detail, 10), color);
	m.position.set(x, y, z);
	m.scale.set(rx, ry, rz);
	parent.add(m);
	return m;
}
function cylinder(parent, x, y, z, r1, r2, h, color, n = 12) {
	const m = mesh(new THREE.CylinderGeometry(r1, r2, h, n), color);
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}
function bar(parent, a, b, radius, color) {
	const from = new THREE.Vector3(...a),
		to = new THREE.Vector3(...b),
		m = mesh(
			new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 8),
			color,
		);
	m.position.copy(from).add(to).multiplyScalar(0.5);
	m.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 1, 0),
		to.sub(from).normalize(),
	);
	parent.add(m);
	return m;
}
function label(parent, text, x, y, z, width, height, opts = {}) {
	const cv = document.createElement("canvas");
	cv.width = 1024;
	cv.height = Math.max(128, Math.round((1024 * height) / width));
	const cx = cv.getContext("2d");
	if (opts.bg) {
		cx.fillStyle = opts.bg;
		cx.fillRect(0, 0, cv.width, cv.height);
	}
	cx.textAlign = "center";
	cx.textBaseline = "middle";
	cx.fillStyle = opts.color || "#26353e";
	cx.font = `${opts.weight || 800} ${Math.round(cv.height * (opts.size || 0.67))}px "Barlow Condensed", sans-serif`;
	if (opts.border) {
		cx.strokeStyle = opts.border;
		cx.lineWidth = 8;
		cx.strokeRect(5, 5, cv.width - 10, cv.height - 10);
	}
	cx.fillText(text, cv.width / 2, cv.height * 0.52, cv.width * 0.93);
	const tex = new THREE.CanvasTexture(cv);
	tex.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
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
function starShape(r = 0.14) {
	const s = new THREE.Shape();
	for (let i = 0; i < 10; i++) {
		const a = Math.PI / 2 + (i * Math.PI) / 5,
			rr = i % 2 ? r * 0.48 : r;
		const x = Math.cos(a) * rr,
			y = Math.sin(a) * rr;
		i ? s.lineTo(x, y) : s.moveTo(x, y);
	}
	s.closePath();
	return new THREE.ShapeGeometry(s);
}
function shadow(parent, radius = 0.65) {
	const m = new THREE.Mesh(
		new THREE.CircleGeometry(radius, 24),
		new THREE.MeshBasicMaterial({
			color: C.ink,
			transparent: true,
			opacity: 0.18,
			depthWrite: false,
		}),
	);
	m.rotation.x = -Math.PI / 2;
	m.position.set(0, 0.026, 0);
	m.scale.y = 0.52;
	parent.add(m);
	return m;
}

export function character(kind = "officer", palette = C.blue) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	rig.name = "Rig";
	root.add(rig);
	const crook = kind === "crook";
	const coat = crook ? C.cream : palette;
	const body = new THREE.Group();
	body.name = "Body";
	rig.add(body);
	sphere(body, 0, 1.05, 0, 0.41, 0.57, 0.29, coat);
	if (crook) {
		for (let i = 0; i < 4; i++) {
			const stripe = cylinder(
				body,
				0,
				0.76 + i * 0.18,
				0,
				0.37,
				0.37,
				0.085,
				C.ink,
				16,
			);
			stripe.scale.z = 0.74;
		}
	} else {
		cylinder(body, 0, 0.65, 0, 0.43, 0.48, 0.27, palette);
		box(body, 0, 0.8, 0.26, 0.74, 0.105, 0.055, C.ink, false);
		box(body, 0.08, 0.8, 0.3, 0.15, 0.13, 0.05, C.yellow);
		for (const y of [0.99, 1.18, 1.37])
			sphere(body, 0.02, y, 0.293, 0.035, 0.035, 0.025, C.yellow, 8);
		const badge = mesh(starShape(0.13), C.yellow, false);
		badge.position.set(0.21, 1.28, 0.3);
		body.add(badge);
		const stick = bar(
			body,
			[-0.39, 0.77, 0.02],
			[-0.52, 0.25, 0.06],
			0.055,
			C.ink,
		);
		stick.rotation.z = -0.18;
	}
	for (const [name, x, phase] of [
		["LLeg", -0.21, 1],
		["RLeg", 0.21, -1],
	]) {
		const g = new THREE.Group();
		g.name = name;
		g.position.set(x, 0.7, phase * 0.04);
		body.add(g);
		const leg = cylinder(
			g,
			0,
			-0.27,
			0,
			0.12,
			0.1,
			0.55,
			crook ? C.ink : C.navy,
		);
		leg.rotation.z = -0.04;
		sphere(g, 0.07, -0.58, 0.075, 0.23, 0.13, 0.19, C.ink, 12);
	}
	for (const [name, x] of [
		["LArm", -0.42],
		["RArm", 0.42],
	]) {
		const g = new THREE.Group();
		g.name = name;
		g.position.set(x, 1.33, 0);
		body.add(g);
		cylinder(g, 0, -0.2, 0, 0.13, 0.11, 0.43, coat);
		sphere(g, 0.02, -0.45, 0.04, 0.13, 0.16, 0.13, C.skin, 12);
		if (crook) box(g, 0, -0.15, 0.12, 0.23, 0.1, 0.04, C.ink, false);
	}
	const head = new THREE.Group();
	head.name = "Head";
	head.position.set(0, 1.68, 0.025);
	body.add(head);
	sphere(head, 0, 0.02, 0, 0.32, 0.37, 0.29, C.skin);
	sphere(head, 0.31, 0.02, 0.17, 0.14, 0.12, 0.13, C.skin, 12);
	sphere(head, -0.28, 0.01, -0.01, 0.1, 0.13, 0.1, C.skin, 10);
	if (crook) {
		box(head, 0.07, 0.11, 0.265, 0.56, 0.17, 0.07, C.ink, false);
		for (const x of [-0.08, 0.19])
			sphere(head, x, 0.12, 0.308, 0.06, 0.06, 0.035, C.white, 10);
		for (const x of [-0.06, 0.21])
			sphere(head, x, 0.12, 0.34, 0.026, 0.036, 0.016, C.ink, 8);
		sphere(head, -0.025, 0.33, 0, 0.36, 0.14, 0.32, C.orange);
		box(head, 0.23, 0.3, 0.1, 0.45, 0.065, 0.35, C.orange);
		box(head, 0.16, -0.15, 0.27, 0.17, 0.035, 0.04, C.ink, false);
		sphere(body, -0.44, 1.2, -0.28, 0.42, 0.55, 0.36, C.yellow);
		cylinder(body, -0.36, 1.72, -0.28, 0.15, 0.1, 0.15, C.yellow);
		label(body, "$", -0.43, 1.2, 0.09, 0.39, 0.43, { color: "#76603d" });
	} else {
		for (const x of [-0.08, 0.16]) {
			sphere(head, x, 0.1, 0.263, 0.062, 0.076, 0.037, C.white, 10);
			sphere(head, x + 0.017, 0.1, 0.299, 0.027, 0.04, 0.016, C.ink, 8);
		}
		for (const x of [-0.045, 0.17]) {
			const st = sphere(head, x, -0.1, 0.277, 0.13, 0.055, 0.045, C.ink, 10);
			st.rotation.z = x < 0 ? -0.22 : 0.22;
		}
		sphere(head, 0, 0.43, -0.015, 0.37, 0.32, 0.33, C.navy);
		cylinder(head, 0, 0.27, 0, 0.4, 0.4, 0.08, C.navy, 18);
		cylinder(head, 0, 0.75, 0, 0.065, 0.1, 0.12, C.yellow, 10);
		const hb = mesh(starShape(0.12), C.yellow, false);
		hb.position.set(0.04, 0.46, 0.31);
		head.add(hb);
	}
	const mixer = new THREE.AnimationMixer(root),
		actions = {};
	const N = (path, times, values) =>
		new THREE.NumberKeyframeTrack(path, times, values);
	const t = [0, 0.15, 0.3, 0.45, 0.6];
	const clips = [
		new THREE.AnimationClip("idle", 1.8, [
			N("Body.position[y]", [0, 0.9, 1.8], [0, 0.035, 0]),
			N("Head.rotation[z]", [0, 0.9, 1.8], [-0.035, 0.035, -0.035]),
		]),
		new THREE.AnimationClip("run", 0.6, [
			N("LLeg.rotation[z]", t, [-0.75, 0, 0.75, 0, -0.75]),
			N("RLeg.rotation[z]", t, [0.75, 0, -0.75, 0, 0.75]),
			N("LArm.rotation[z]", t, [0.65, 0, -0.65, 0, 0.65]),
			N("RArm.rotation[z]", t, [-0.65, 0, 0.65, 0, -0.65]),
			N("Body.position[y]", t, [0, 0.1, 0, 0.1, 0]),
			N("Body.rotation[z]", [0, 0.6], [-0.09, -0.09]),
		]),
		new THREE.AnimationClip("jump", 0.7, [
			N("LLeg.rotation[z]", [0, 0.35, 0.7], [-0.9, -0.55, -0.9]),
			N("RLeg.rotation[z]", [0, 0.35, 0.7], [0.85, 0.45, 0.85]),
			N("LArm.rotation[z]", [0, 0.7], [-1.15, -1.15]),
			N("RArm.rotation[z]", [0, 0.7], [1, 1]),
		]),
		new THREE.AnimationClip("duck", 0.7, [
			N("Rig.scale[y]", [0, 0.7], [0.52, 0.52]),
			N("Rig.scale[x]", [0, 0.7], [1.15, 1.15]),
			N("LArm.rotation[z]", [0, 0.7], [0.6, 0.6]),
			N("RArm.rotation[z]", [0, 0.7], [-0.6, -0.6]),
		]),
		new THREE.AnimationClip("stumble", 0.45, [
			N("Body.rotation[z]", [0, 0.1, 0.3, 0.45], [0.23, -0.26, 0.26, 0.23]),
			N("LArm.rotation[z]", [0, 0.45], [-1.8, -1.8]),
			N("RArm.rotation[z]", [0, 0.45], [1.8, 1.8]),
		]),
		new THREE.AnimationClip("cheer", 0.8, [
			N("Body.position[y]", [0, 0.2, 0.4, 0.6, 0.8], [0, 0.22, 0, 0.22, 0]),
			N("LArm.rotation[z]", [0, 0.4, 0.8], [-2.5, -2.1, -2.5]),
			N("RArm.rotation[z]", [0, 0.4, 0.8], [2.5, 2.1, 2.5]),
		]),
	];
	for (const clip of clips) actions[clip.name] = mixer.clipAction(clip);
	let pose = "";
	root.userData.animate = (next, dt) => {
		if (next !== pose) {
			const old = actions[pose];
			const action = actions[next] || actions.idle;
			action.reset().fadeIn(0.14).play();
			old?.fadeOut(0.14);
			pose = next;
		}
		mixer.update(dt);
	};
	root.userData.mixer = mixer;
	return root;
}

function makeHazard(kind) {
	const g = new THREE.Group();
	if (kind === "cart") {
		box(g, 0, -0.37, 0, 1.45, 0.12, 0.75, C.ink);
		box(g, 0.03, 0.1, 0, 1.18, 0.62, 0.74, C.orange);
		for (let i = 0; i < 5; i++)
			box(g, -0.43 + i * 0.23, 0.1, 0.39, 0.035, 0.5, 0.035, C.cream, false);
		bar(g, [-0.65, 0.1, 0], [-0.96, 0.69, 0], 0.055, C.ink);
		bar(g, [-0.96, 0.69, -0.35], [-0.96, 0.69, 0.35], 0.06, C.ink);
		for (const x of [-0.47, 0.47])
			for (const z of [-0.4, 0.4]) {
				const w = cylinder(g, x, -0.47, z, 0.16, 0.16, 0.08, C.ink);
				w.rotation.x = Math.PI / 2;
			}
		sphere(g, 0.2, 0.45, 0, 0.27, 0.25, 0.23, C.yellow, 12);
		box(g, -0.24, 0.48, -0.06, 0.34, 0.46, 0.34, C.mint);
	} else if (kind === "plane") {
		sphere(g, 0, 0, 0, 0.91, 0.21, 0.23, C.yellow);
		box(g, 0.1, 0.26, 0, 0.72, 0.07, 1.9, C.orange);
		box(g, 0.1, -0.2, 0, 0.72, 0.07, 1.8, C.orange);
		for (const z of [-0.65, 0.65])
			for (const x of [-0.15, 0.36])
				bar(g, [x, -0.2, z], [x, 0.26, z], 0.022, C.ink);
		box(g, -0.68, 0.2, 0, 0.28, 0.48, 0.07, C.yellow);
		box(g, -0.64, 0.04, 0, 0.38, 0.06, 0.67, C.yellow);
		const prop = box(g, 0.94, 0, 0, 0.05, 1.04, 0.055, C.ink);
		prop.name = "Prop";
		const mixer = new THREE.AnimationMixer(g);
		mixer
			.clipAction(
				new THREE.AnimationClip("propeller", 0.12, [
					new THREE.NumberKeyframeTrack(
						"Prop.rotation[x]",
						[0, 0.12],
						[0, Math.PI * 2],
					),
				]),
			)
			.play();
		g.userData.mixer = mixer;
	} else if (kind === "ball") {
		const ball = mesh(new THREE.SphereGeometry(0.49, 24, 16), C.cream);
		g.add(ball);
		for (let i = 0; i < 6; i++) {
			const p = new THREE.Mesh(
				new THREE.SphereGeometry(0.496, 12, 12, (i * Math.PI) / 3, Math.PI / 3),
				mat(i % 3 === 0 ? C.red : i % 3 === 1 ? C.mint : C.yellow),
			);
			g.add(p);
		}
	} else {
		box(g, 0, 0, 0, 1.15, 1.03, 0.65, C.plum);
		sphere(g, 0, 0.49, 0, 0.57, 0.45, 0.32, C.plum);
		box(g, 0, -0.09, 0.35, 0.65, 0.64, 0.045, C.ink);
		for (let i = 0; i < 5; i++)
			box(
				g,
				-0.25 + i * 0.125,
				-0.08,
				0.38,
				0.036,
				0.48,
				0.02,
				C.yellow,
				false,
			);
		for (const x of [-0.42, 0.42])
			sphere(g, x, -0.32, 0.38, 0.09, 0.09, 0.055, C.yellow, 10);
		label(g, "♪", 0.02, 0.51, 0.36, 0.42, 0.43, { color: "#ffe1a0" });
	}
	return g;
}

function makeLoot(kind) {
	const g = new THREE.Group();
	if (kind === "case") {
		box(g, 0, 0, 0, 0.78, 0.54, 0.36, C.yellow);
		for (const x of [-0.25, 0.25])
			box(g, x, 0, 0.19, 0.06, 0.53, 0.04, C.orange, false);
		bar(g, [-0.14, 0.29, 0], [-0.14, 0.43, 0], 0.04, C.ink);
		bar(g, [0.14, 0.29, 0], [0.14, 0.43, 0], 0.04, C.ink);
		bar(g, [-0.14, 0.43, 0], [0.14, 0.43, 0], 0.04, C.ink);
	} else {
		sphere(g, 0, -0.04, 0, 0.32, 0.35, 0.27, C.yellow, 12);
		cylinder(g, 0, 0.3, 0, 0.19, 0.09, 0.19, C.yellow);
		label(g, "$", 0, 0, 0.29, 0.3, 0.36, { color: "#725b37" });
	}
	const halo = new THREE.Mesh(
		new THREE.TorusGeometry(0.53, 0.016, 6, 24),
		new THREE.MeshBasicMaterial({
			color: C.yellow,
			transparent: true,
			opacity: 0.65,
		}),
	);
	g.add(halo);
	return g;
}

export class Art {
	constructor(container) {
		this.container = container;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xc88780);
		this.camera = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.1, 250);
		this.renderer = new THREE.WebGPURenderer({
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setSize(innerWidth, innerHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.NoToneMapping;
		container.appendChild(this.renderer.domElement);
		this.renderer.domElement.setAttribute(
			"aria-label",
			"HalFwick’s department store, a four-storey comic-book chase",
		);
		this.scene.add(new THREE.HemisphereLight(0xfff0d1, 0x697e92, 2.4));
		const sun = new THREE.DirectionalLight(0xffe5be, 2.5);
		sun.position.set(-18, 30, 25);
		this.scene.add(sun);
		const fill = new THREE.DirectionalLight(0x91b4c7, 0.65);
		fill.position.set(20, 12, -8);
		this.scene.add(fill);
		this.world = new THREE.Group();
		this.scene.add(this.world);
		this.actors = new Map();
		this.hazardModels = new Map();
		this.lootModels = new Map();
		this.effects = [];
		this.cameraTarget = new THREE.Vector3(-15, 8, 0);
		this.viewWidth = 87;
		this.lastCase = -1;
		this.buildBackdrop();
		this.buildStore();
		this.buildTitleActors();
		this.last = null;
		this.prepared = false;
		this.debugLines = null;
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 compatibility";
		this.errors = [];
		this.renderer.backend.device?.addEventListener("uncapturederror", (e) => {
			const message = e.error?.message || String(e.error);
			this.errors.push(message);
			console.error(`WebGPU validation: ${message}`);
		});
	}
	async prepare() {
		this.scene.updateMatrixWorld(true);
		this.camera.updateMatrixWorld(true);
		const culling = [];
		this.scene.traverse((object) => {
			culling.push([object, object.frustumCulled]);
			object.frustumCulled = false;
		});
		await this.renderer.compileAsync(this.scene, this.camera);
		for (const [object, value] of culling) object.frustumCulled = value;
		this.prepared = true;
	}
	buildBackdrop() {
		const g = new THREE.Group();
		this.scene.add(g);
		const cv = document.createElement("canvas");
		cv.width = 16;
		cv.height = 256;
		const cx = cv.getContext("2d"),
			grad = cx.createLinearGradient(0, 0, 0, 256);
		grad.addColorStop(0, "#b9787d");
		grad.addColorStop(0.55, "#e6a27f");
		grad.addColorStop(1, "#f5c88f");
		cx.fillStyle = grad;
		cx.fillRect(0, 0, 16, 256);
		const tex = new THREE.CanvasTexture(cv);
		tex.colorSpace = THREE.SRGBColorSpace;
		const sky = new THREE.Mesh(
			new THREE.PlaneGeometry(250, 140),
			new THREE.MeshBasicMaterial({ map: tex }),
		);
		sky.position.set(0, 30, -42);
		g.add(sky);
		const sunset = new THREE.Mesh(
			new THREE.CircleGeometry(9, 64),
			new THREE.MeshBasicMaterial({ color: 0xf9d58e }),
		);
		sunset.position.set(12, 22, -32);
		g.add(sunset);
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(9.3, 9.38, 64),
			new THREE.MeshBasicMaterial({
				color: 0xf6d19b,
				transparent: true,
				opacity: 0.5,
			}),
		);
		ring.position.copy(sunset.position);
		g.add(ring);
		const rnd = (i) => (Math.sin(i * 12.9898 + 1) * 43758.5453) % 1;
		for (let i = 0; i < 23; i++) {
			const x = -72 + i * 6.5,
				h = 7 + Math.abs(rnd(i)) * 14;
			box(
				g,
				x,
				h / 2 - 4,
				-25 - (i % 3),
				5,
				h,
				3,
				i % 2 ? 0x9d7a82 : 0xa88383,
				false,
			);
			box(g, x, h - 3.7, -25 - (i % 3), 5.5, 0.4, 3.3, 0x8a737f, false);
			for (let y = 0; y < h - 2; y += 2)
				for (const off of [-1.2, 0.7])
					box(
						g,
						x + off,
						y - 1.6,
						-23 - (i % 3),
						0.7,
						1,
						0.05,
						0xcfa292,
						false,
					);
		}
		for (const [x, y, s] of [
			[-27, 27, 1],
			[35, 28, 0.8],
			[-40, 17, 0.6],
			[4, 32, 0.8],
		]) {
			const cloud = new THREE.Group();
			cloud.position.set(x, y, -30);
			cloud.scale.setScalar(s);
			g.add(cloud);
			for (let i = 0; i < 4; i++)
				sphere(
					cloud,
					i * 1.8,
					Math.sin(i * 1.7) * 0.65,
					0,
					2.3,
					1.1 + (i % 2) * 0.7,
					0.3,
					0xeab79a,
					16,
				);
		}
		box(g, 0, -1.7, 0, 160, 2.6, 30, 0x756d75, false);
		for (let x = -75; x < 75; x += 6)
			box(g, x, -0.36, 8, 3, 0.02, 0.18, C.paper, false);
		this.background = g;
	}
	buildStore() {
		const g = this.world;
		box(g, 0, -0.65, -0.5, 56, 0.9, 7, C.ink);
		box(g, 0, -0.19, 0.2, 55.3, 0.35, 6.8, C.cream);
		const shops = [
			[
				["PIP & PURL", "HATS · COATS · ODD SOCKS", C.mint],
				["THE DAILY THREAD", "A CUT ABOVE", C.pink],
				["BAGGAGE CLAIM", "GO PLACES", C.mint],
				["BRASS & CO.", "FINE THINGS", C.pink],
			],
			[
				["TICK TOCK", "EVERY SECOND COUNTS", C.pink],
				["THE CROOKED SPOON", "TEA & SYMPATHY", C.mint],
				["SOUND ADVICE", "RADIOS & RECORDS", C.pink],
				["HALFWICK HABERDASHERY", "DRESS TO IMPRESS", C.mint],
			],
			[
				["FLYING COLOURS", "LITTLE PLANES, BIG IDEAS", C.mint],
				["BALL & BOUNCE", "TOYS FOR ALL AGES", C.pink],
				["THE GIFT HORSE", "HANDS OFF THE MERCHANDISE", C.mint],
				["ODDS & ENDS", "MARVELS & MISCHIEF", C.pink],
			],
		];
		for (let f = 0; f < 3; f++) {
			const y = f * FLOOR;
			box(
				g,
				0,
				y + 2.65,
				-2.1,
				54,
				5.5,
				0.4,
				f === 1 ? 0xe5caa5 : 0xf1d9ac,
				false,
			);
			box(g, 0, y + 0.07, 0, 54, 0.14, 4.5, f === 1 ? 0x81aaa0 : 0x8ab8ad);
			box(g, 0, y - 0.16, 1.95, 54.4, 0.3, 0.28, C.cream);
			box(g, 0, y - 0.37, 2.04, 54.6, 0.14, 0.36, C.ink);
			// Tiled walkways and brass inlay make each floor read as a little stage.
			for (let x = -26; x <= 26; x += 2) {
				box(g, x, y + 0.152, 0.5, 0.025, 0.015, 3.7, 0x5d8984, false);
				box(g, x, y + 0.154, 1.5, 1.98, 0.016, 0.025, C.paper, false);
			}
			for (let j = 0; j < 4; j++) {
				const x = [-19.5, -8, 8, 19.5][j],
					w = j === 1 || j === 2 ? 10 : 9;
				const [name, sub, col] = shops[f][j];
				box(g, x, y + 2.13, -1.78, w - 0.35, 3.25, 0.25, C.ink);
				box(g, x, y + 2.15, -1.6, w - 0.7, 2.95, 0.08, 0x688e8f);
				for (let k = -1; k <= 1; k++) {
					box(
						g,
						x + (k * w) / 3.4,
						y + 2.12,
						-1.5,
						0.07,
						2.95,
						0.09,
						C.cream,
						false,
					);
					const glint = box(
						g,
						x + (k * w) / 3.4 + 0.6,
						y + 2.7,
						-1.43,
						0.06,
						1.4,
						0.02,
						0x9ac3bc,
						false,
					);
					glint.rotation.z = -0.45;
				}
				box(g, x, y + 3.95, -1.42, w, 0.78, 0.5, col);
				label(g, name, x, y + 3.99, -1.12, w - 0.3, 0.55, { color: "#24333e" });
				label(g, sub, x, y + 3.42, -1.35, w - 0.9, 0.35, {
					color: "#ffeac0",
					size: 0.65,
				});
				box(g, x, y + 0.58, -1.22, w - 0.5, 0.22, 1, C.cream);
				// Merchandise silhouettes are all modelled, never photographic textures.
				if (f === 0) {
					for (let k = -1; k <= 1; k++) {
						const xx = x + k * 2.2;
						cylinder(
							g,
							xx,
							y + 1.05,
							-1.15,
							0.46,
							0.5,
							0.13,
							k % 2 ? C.plum : C.orange,
						);
						cylinder(
							g,
							xx,
							y + 1.35,
							-1.15,
							0.31,
							0.36,
							0.5,
							k % 2 ? C.plum : C.orange,
						);
					}
				} else if (f === 1) {
					if (j % 2) {
						for (let k = -1; k <= 1; k++) {
							box(g, x + k * 2, y + 1.25, -1.1, 1.05, 1.1, 0.5, C.plum);
							sphere(g, x + k * 2, y + 1.7, -0.84, 0.3, 0.3, 0.04, C.yellow);
						}
					} else
						for (let k = -1; k <= 1; k++) {
							cylinder(g, x + k * 2, y + 1.28, -1.1, 0.3, 0.25, 0.5, C.paper);
							sphere(g, x + k * 2, y + 1.75, -1.1, 0.5, 0.09, 0.4, C.paper);
						}
				} else {
					for (let k = -1; k <= 1; k++) {
						const b = sphere(
							g,
							x + k * 2.3,
							y + 1.17,
							-1.05,
							0.45,
							0.45,
							0.42,
							[C.yellow, C.orange, C.mint][k + 1],
						);
						const stripe = new THREE.Mesh(
							new THREE.TorusGeometry(0.45, 0.045, 6, 20),
							mat(C.paper),
						);
						stripe.position.copy(b.position);
						g.add(stripe);
					}
				}
			}
			for (const x of [-27, -14, 14, 27]) {
				box(g, x, y + 2.55, -0.85, 0.36, 5.2, 0.7, C.cream);
				box(g, x, y + 4.95, -0.75, 0.72, 0.25, 0.9, C.yellow);
			}
			// Lift doors on every served floor, and a large legible floor plaque.
			box(g, 0, y + 1.55, -1.2, 3.7, 3.3, 0.55, C.ink);
			box(g, 0, y + 1.55, -0.88, 3.24, 3.02, 0.12, C.yellow);
			box(g, 0, y + 1.55, -0.78, 2.84, 2.83, 0.13, C.navy);
			label(g, `${f === 0 ? "G" : f}  ·  LIFT`, 0, y + 3.7, -0.7, 3.4, 0.58, {
				color: "#24333e",
				bg: "#f6ca63",
				border: "#24333e",
			});
			for (const x of [-3.2, 3.2]) {
				cylinder(g, x, y + 0.43, -1, 0.3, 0.22, 0.65, C.orange);
				for (let k = 0; k < 4; k++) {
					const leaf = sphere(
						g,
						x + Math.sin(k * 2) * 0.16,
						y + 0.95 + k * 0.12,
						-0.98,
						0.12,
						0.5,
						0.11,
						C.mint,
						10,
					);
					leaf.rotation.z = Math.sin(k * 3) * 0.5;
				}
			}
			const dir = f % 2 === 0 ? 1 : -1,
				x0 = dir * 20,
				x1 = dir * 24;
			const esc = new THREE.Group();
			g.add(esc);
			bar(esc, [x0, y + 0.1, 0.35], [x1, y + FLOOR + 0.1, 0.35], 0.44, C.ink);
			bar(
				esc,
				[x0, y + 0.2, -0.25],
				[x1, y + FLOOR + 0.2, -0.25],
				0.38,
				C.cream,
			);
			const steps = [];
			for (let k = 0; k < 16; k++) {
				const q = k / 16;
				const m = box(
					esc,
					x0 + (x1 - x0) * q,
					y + FLOOR * q + 0.15,
					0.65,
					0.55,
					0.12,
					1.2,
					C.yellow,
				);
				steps.push(m);
			}
			for (const z of [0.0, 1.25]) {
				bar(esc, [x0, y + 1.1, z], [x1, y + FLOOR + 1.1, z], 0.07, C.navy);
				for (let k = 0; k <= 4; k++) {
					const q = k / 4;
					bar(
						esc,
						[x0 + (x1 - x0) * q, y + FLOOR * q + 0.1, z],
						[x0 + (x1 - x0) * q, y + FLOOR * q + 1.1, z],
						0.025,
						C.navy,
					);
				}
			}
			label(
				g,
				f === 2 ? "ROOF ↑  ONE WAY" : "THIS WAY UP ↑",
				x0 - dir * 2,
				y + 1.75,
				1.15,
				3.5,
				0.65,
				{ color: "#fff0c9", bg: "#294d60" },
			);
			this.escalators ??= [];
			this.escalators.push({ steps, x0, x1, y });
		}
		box(g, 0, 18, 0, 55.3, 0.26, 5.2, C.cream);
		box(g, 0, 17.69, 2.18, 55.6, 0.32, 0.5, C.ink);
		box(g, 0, 18.24, -2.1, 55.3, 0.45, 0.5, C.yellow);
		for (let x = -26; x < 27; x += 3) {
			bar(g, [x, 18.3, -2], [x, 19.4, -2], 0.045, C.ink);
		}
		bar(g, [-27, 19.4, -2], [27, 19.4, -2], 0.05, C.ink);
		box(g, -24, 19.6, -0.65, 3.5, 3.1, 2.2, C.navy);
		box(g, -24, 19.4, 0.5, 1.9, 2.6, 0.12, C.orange);
		label(g, "EXIT", -24, 20.1, 0.61, 1.7, 0.57, { color: "#fff2cc" });
		sphere(g, -23.4, 19.25, 0.66, 0.075, 0.075, 0.08, C.yellow, 8);
		for (const x of [-9, 9]) {
			box(g, x, 19, -1.2, 3, 1.6, 1.8, C.mint);
			for (let k = 0; k < 6; k++)
				box(g, x - 1 + k * 0.4, 19, -0.25, 0.07, 1.1, 0.07, C.navy, false);
		}
		// Rooftop marquee, edged like an old lithographed advertisement.
		box(g, 0, 21.2, -1.5, 24, 3.5, 0.45, C.ink);
		box(g, 0, 21.2, -1.21, 23.5, 3.03, 0.16, C.cream);
		label(g, "HALFWICK’S", 0, 21.45, -0.98, 21, 1.85, {
			color: "#294d60",
			size: 0.83,
		});
		label(
			g,
			"GRAND DEPARTMENT STORE  ·  EST. 1883",
			0,
			20.25,
			-0.97,
			21,
			0.55,
			{ color: "#a0513f" },
		);
		for (let x = -11.5; x < 12; x += 1)
			sphere(g, x, 22.85, -1.1, 0.075, 0.075, 0.075, C.yellow, 8);
		for (const x of [-12, 12])
			bar(g, [x, 18, -1.5], [x, 22.9, -1.5], 0.09, C.ink);
		this.liftCage = new THREE.Group();
		g.add(this.liftCage);
		box(this.liftCage, 0, 1.5, -0.57, 2.65, 2.9, 0.1, C.mint);
		box(this.liftCage, 0, 0.08, 0.1, 2.9, 0.16, 1.5, C.yellow);
		this.doors = [
			box(this.liftCage, -0.69, 1.5, 0.34, 1.3, 2.8, 0.1, C.navy),
			box(this.liftCage, 0.69, 1.5, 0.35, 1.3, 2.8, 0.1, C.navy),
		];
		this.liftArrow = label(this.liftCage, "↑", 0, 3.05, 0.35, 1, 0.6, {
			color: "#f7cb63",
		});
	}
	buildTitleActors() {
		this.titleActors = new THREE.Group();
		this.scene.add(this.titleActors);
		box(this.titleActors, 0, -0.2, 0, 15, 0.4, 5, C.cream);
		const pip = character("officer"),
			bert = character("crook");
		pip.position.set(-3.1, 0, 0.3);
		pip.scale.setScalar(2.2);
		bert.position.set(3.6, 0, 0.2);
		bert.scale.setScalar(2.2);
		this.titleActors.add(pip, bert);
		this.heroPip = pip;
		this.heroBert = bert;
		const cart = makeHazard("cart");
		cart.scale.setScalar(1.5);
		cart.position.set(0.2, 0.8, 1);
		this.titleActors.add(cart);
		this.heroCart = cart;
		this.titleActors.position.set(7, -0.22, 10);
	}
	actor(id, crook = false) {
		if (!this.actors.has(id)) {
			const a = character(
				crook ? "crook" : "officer",
				[C.blue, C.mint, C.orange, C.plum][Number(id) % 4] || C.blue,
			);
			shadow(a);
			this.world.add(a);
			this.actors.set(id, a);
		}
		return this.actors.get(id);
	}
	event(e) {
		if (e.type === "whistle")
			this.effect(e.x, e.y + 1.4, "ring", C.yellow, 1.1);
		if (e.type === "pickup") this.effect(e.x, e.y, "stars", C.yellow, 0.9);
		if (e.type === "jump") this.effect(e.x, e.y + 0.15, "puff", C.cream, 0.4);
		if (e.type === "hit") this.effect(e.x, e.y + 1.3, "stars", C.orange, 0.8);
		if (e.type === "caught" || e.type === "victory") {
			const p = this.last?.crook;
			for (let i = 0; i < 26; i++)
				this.effect(
					(p?.x || 0) + Math.sin(i * 2.4) * 3,
					(p?.y || 0) + 2 + (i % 4),
					"confetti",
					[C.orange, C.yellow, C.mint, C.cream][i % 4],
					2.3,
				);
		}
	}
	effect(x, y, type, color, duration) {
		const g = new THREE.Group();
		g.position.set(x, y, 1);
		this.world.add(g);
		if (type === "ring") {
			for (let i = 0; i < 3; i++) {
				const m = new THREE.Mesh(
					new THREE.TorusGeometry(1 + i * 0.55, 0.032, 6, 36),
					new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
				);
				g.add(m);
			}
		} else if (type === "stars") {
			for (let i = 0; i < 6; i++) {
				const m = new THREE.Mesh(
					starShape(0.16),
					new THREE.MeshBasicMaterial({ color, transparent: true }),
				);
				m.position.set(Math.cos(i) * 0.6, Math.sin(i) * 0.6, 0);
				g.add(m);
			}
		} else if (type === "confetti") {
			box(g, 0, 0, 0, 0.12, 0.24, 0.025, color, false);
			g.userData.vx = Math.sin(x * 5.4) * 2;
			g.userData.vy = 2 + Math.abs(Math.sin(y)) * 3;
		} else {
			for (let i = 0; i < 3; i++)
				sphere(g, (i - 1) * 0.25, 0, 0, 0.2, 0.13, 0.1, color, 8);
		}
		this.effects.push({ g, age: 0, duration, type });
	}
	update(
		snapshot,
		dt,
		mode = "play",
		localId = 0,
		overview = false,
		reduceMotion = false,
	) {
		if (!snapshot) return;
		this.last = snapshot;
		const title = mode === "title";
		this.titleActors.visible = title;
		this.heroPip.userData.animate("run", dt);
		this.heroBert.userData.animate("run", dt);
		this.heroCart.rotation.z = Math.sin(performance.now() / 400) * 0.04;
		const s = snapshot;
		const active = new Set(["crook", ...s.players.map((p) => p.id)]);
		for (const [id, actor] of this.actors) actor.visible = active.has(id);
		for (const p of [...s.players, { ...s.crook, id: "crook" }]) {
			const a = this.actor(p.id, p.id === "crook");
			const desired = new THREE.Vector3(
				p.x,
				p.y + 0.16,
				p.id === "crook" ? 0.4 : 0.75 + Number(p.id) * 0.12,
			);
			if (a.position.distanceTo(desired) > 4) a.position.copy(desired);
			else a.position.lerp(desired, 1 - Math.exp(-dt * 24));
			a.scale.x = p.dir;
			a.userData.animate(p.pose || "idle", dt);
			a.visible = !(
				p.invuln > 0 &&
				Math.sin(s.time * 28) < -0.3 &&
				mode !== "title"
			);
		}
		const hazards = new Set();
		for (const h of s.hazards) {
			const key = `${s.caseIndex}-${h.id}`;
			hazards.add(key);
			if (!this.hazardModels.has(key)) {
				const model = makeHazard(h.kind);
				this.world.add(model);
				this.hazardModels.set(key, model);
			}
			const m = this.hazardModels.get(key);
			m.position.set(h.x, h.y + 0.16, 0.7);
			m.rotation.y = h.dir < 0 ? Math.PI : 0;
			if (h.kind === "ball") m.rotation.z = h.age * h.dir * -3;
			if (h.stunned > 0) m.rotation.z = Math.sin(h.age * 14) * 0.08;
			m.userData.mixer?.update(dt);
		}
		for (const [id, m] of this.hazardModels)
			if (!hazards.has(id)) {
				this.world.remove(m);
				this.hazardModels.delete(id);
			}
		const lootIds = new Set();
		for (const l of s.loot) {
			const key = `${s.caseIndex}-${l.id}`;
			lootIds.add(key);
			if (!this.lootModels.has(key)) {
				const m = makeLoot(l.kind);
				this.world.add(m);
				this.lootModels.set(key, m);
			}
			const m = this.lootModels.get(key);
			m.visible = !l.taken;
			m.position.set(l.x, l.y + 0.12 + Math.sin(s.time * 3 + l.id) * 0.09, 0.8);
			m.rotation.y = Math.sin(s.time * 1.4 + l.id) * 0.3;
		}
		for (const [id, m] of this.lootModels)
			if (!lootIds.has(id)) {
				this.world.remove(m);
				this.lootModels.delete(id);
			}
		this.liftCage.position.y = s.lift.y;
		this.doors[0].position.x = -0.69 - s.lift.open * 1.2;
		this.doors[1].position.x = 0.69 + s.lift.open * 1.2;
		this.liftArrow.rotation.z = s.lift.dir > 0 ? 0 : Math.PI;
		for (const { steps, x0, x1, y } of this.escalators)
			for (let i = 0; i < steps.length; i++) {
				const t = (i / steps.length + s.time * 0.13) % 1;
				steps[i].position.set(x0 + (x1 - x0) * t, y + FLOOR * t + 0.15, 0.65);
			}
		for (const e of [...this.effects]) {
			e.age += dt;
			const t = e.age / e.duration;
			if (e.type === "ring") {
				e.g.scale.setScalar(0.1 + t * 3.5);
				e.g.children.forEach((m) => {
					m.material.opacity = 1 - t;
				});
			} else if (e.type === "confetti") {
				e.g.position.x += (e.g.userData.vx || 0) * dt;
				e.g.position.y += ((e.g.userData.vy || 0) - e.age * 5) * dt;
				e.g.rotation.z += dt * 4;
			} else {
				e.g.scale.setScalar(1 + t);
				e.g.position.y += dt * 1.6;
				e.g.rotation.z += dt;
			}
			if (t >= 1) {
				this.world.remove(e.g);
				e.g.traverse((o) => {
					if (o.material && !materials.has(o.material.color?.getHex()))
						o.material.dispose?.();
				});
				this.effects.splice(this.effects.indexOf(e), 1);
			}
		}
		const p = s.players.find((p) => p.id === localId) || s.players[0];
		const aspect = innerWidth / innerHeight;
		let target, width;
		if (title) {
			target = new THREE.Vector3(aspect > 1.25 ? -14 : -2, 9, 0);
			width = aspect > 1.25 ? 88 : 67;
		} else if (overview) {
			target = new THREE.Vector3(0, 10, 0);
			width = Math.max(63, 33 * aspect);
		} else {
			target = new THREE.Vector3(
				THREE.MathUtils.clamp(p?.x || 0, -15, 15),
				(p?.y || 0) + 2.65,
				0,
			);
			width = aspect > 1.4 ? 27.5 : aspect > 0.9 ? 25 : 23;
		}
		const lerp = reduceMotion ? 1 : 1 - Math.exp(-dt * 5);
		this.cameraTarget.lerp(target, lerp);
		this.viewWidth += (width - this.viewWidth) * lerp;
		const halfW = this.viewWidth / 2,
			halfH = halfW / aspect;
		this.camera.left = -halfW;
		this.camera.right = halfW;
		this.camera.top = halfH;
		this.camera.bottom = -halfH;
		this.camera.position
			.copy(this.cameraTarget)
			.add(new THREE.Vector3(title ? 6 : 2.5, title ? 9 : 5, 50));
		this.camera.lookAt(this.cameraTarget);
		this.camera.updateProjectionMatrix();
	}
	draw() {
		if (this.prepared) this.renderer.render(this.scene, this.camera);
	}
	resize() {
		this.renderer.setSize(innerWidth, innerHeight);
	}
	debug(world, enabled) {
		if (this.debugLines) {
			this.scene.remove(this.debugLines);
			this.debugLines.geometry.dispose();
			this.debugLines = null;
		}
		if (!enabled || !world) return;
		const { vertices, colors } = world.debugRender();
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
		geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
		this.debugLines = new THREE.LineSegments(
			geometry,
			new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
		);
		this.debugLines.position.z = 1;
		this.scene.add(this.debugLines);
	}
}
