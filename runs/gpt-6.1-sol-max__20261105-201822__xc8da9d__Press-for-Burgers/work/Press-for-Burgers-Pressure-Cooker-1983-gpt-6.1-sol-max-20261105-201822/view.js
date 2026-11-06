import RAPIER from "@dimforge/rapier3d-compat";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as THREE from "three/webgpu";
import { CHUTES, COLORS, FOOD } from "./model.js";

const INK = "#262433",
	CREAM = "#fff1cd",
	RED = "#d95240",
	TEAL = "#3e9993";
const outlineMat = new THREE.MeshBasicMaterial({
	color: INK,
	side: THREE.BackSide,
});
const mats = new Map();
const ramp = new THREE.DataTexture(
	new Uint8Array([85, 155, 215, 255]),
	4,
	1,
	THREE.RedFormat,
);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
function mat(color) {
	if (!mats.has(color))
		mats.set(color, new THREE.MeshToonMaterial({ color, gradientMap: ramp }));
	return mats.get(color);
}
function mesh(geo, color, parent, x = 0, y = 0, z = 0, ink = true) {
	const m = new THREE.Mesh(geo, mat(color));
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	if (ink) {
		const o = new THREE.Mesh(geo, outlineMat);
		o.scale.setScalar(1.035);
		m.add(o);
	}
	parent.add(m);
	return m;
}
function box(parent, w, h, d, color, x = 0, y = 0, z = 0, radius = 0.08) {
	return mesh(
		new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)),
		color,
		parent,
		x,
		y,
		z,
	);
}
function sphere(parent, r, color, x = 0, y = 0, z = 0) {
	return mesh(new THREE.SphereGeometry(r, 16, 10), color, parent, x, y, z);
}
function cyl(parent, r, h, color, x = 0, y = 0, z = 0, r2 = r) {
	return mesh(new THREE.CylinderGeometry(r, r2, h, 24), color, parent, x, y, z);
}
function torus(parent, r, t, color, x = 0, y = 0, z = 0) {
	const m = mesh(new THREE.TorusGeometry(r, t, 6, 28), color, parent, x, y, z);
	m.rotation.x = Math.PI / 2;
	return m;
}
function label(
	text,
	color = INK,
	bg = null,
	width = 3,
	height = 0.7,
	size = 70,
	font = "900",
) {
	const c = document.createElement("canvas");
	c.width = 768;
	c.height = Math.round((768 * height) / width);
	const ctx = c.getContext("2d");
	if (bg) {
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, c.width, c.height);
	}
	ctx.fillStyle = color;
	ctx.font = `${font} ${size}px Trebuchet MS, sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, c.width / 2, c.height / 2, 720);
	const texture = new THREE.CanvasTexture(c);
	texture.colorSpace = THREE.SRGBColorSpace;
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
		new THREE.MeshBasicMaterial({
			map: texture,
			transparent: !bg,
			depthWrite: !!bg,
			side: THREE.DoubleSide,
		}),
	);
	return m;
}
function shadow(parent, r, x = 0, z = 0) {
	const s = new THREE.Mesh(
		new THREE.CircleGeometry(r, 28),
		new THREE.MeshBasicMaterial({
			color: "#292833",
			transparent: true,
			opacity: 0.17,
			depthWrite: false,
		}),
	);
	s.rotation.x = -Math.PI / 2;
	s.position.set(x, 0.09, z);
	parent.add(s);
	return s;
}
function release(root) {
	root.removeFromParent();
	const geometries = new Set(),
		materials = new Set();
	root.traverse((o) => {
		if (o.geometry) geometries.add(o.geometry);
		if (o.material) materials.add(o.material);
	});
	for (const geometry of geometries) geometry.dispose();
	const shared = new Set(mats.values());
	shared.add(outlineMat);
	for (const material of materials)
		if (!shared.has(material)) {
			material.map?.dispose();
			material.dispose();
		}
}

export function topping(type, parent = new THREE.Group()) {
	const g = new THREE.Group();
	parent.add(g);
	if (type === 0) {
		cyl(g, 0.48, 0.13, FOOD[0].color);
		cyl(g, 0.37, 0.145, "#ff9b6c");
		for (let i = 0; i < 5; i++) {
			const a = (i * Math.PI * 2) / 5;
			const seed = sphere(
				g,
				0.055,
				CREAM,
				Math.cos(a) * 0.23,
				0.085,
				Math.sin(a) * 0.23,
			);
			seed.scale.y = 0.3;
		}
	} else if (type === 1) {
		const m = box(g, 0.87, 0.1, 0.83, FOOD[1].color);
		m.rotation.y = 0.2;
		box(g, 0.77, 0.035, 0.7, "#ffe68c", 0, 0.065, 0);
	} else if (type === 2) {
		for (let i = 0; i < 5; i++) {
			const a = i * 1.256;
			const m = sphere(
				g,
				0.29,
				i % 2 ? "#97d46a" : FOOD[2].color,
				Math.cos(a) * 0.25,
				0,
				Math.sin(a) * 0.25,
			);
			m.scale.set(1, 0.24, 1);
		}
	} else {
		torus(g, 0.33, 0.09, FOOD[3].color);
		torus(g, 0.19, 0.055, "#f3dcf0", 0, 0.01, 0);
	}
	return g;
}
function bun(parent, y, top = false) {
	const m = sphere(parent, 0.57, top ? "#f1bb67" : "#df9a49", 0, y, 0);
	m.scale.set(1, top ? 0.52 : 0.26, 1);
	if (top)
		for (let i = 0; i < 9; i++) {
			const a = i * 2.399,
				r = 0.15 + (i % 3) * 0.11;
			const s = sphere(
				parent,
				0.036,
				CREAM,
				Math.cos(a) * r,
				y + 0.16,
				Math.sin(a) * r,
			);
			s.scale.set(0.5, 0.4, 1.8);
			s.rotation.y = a;
		}
}
function burger(data) {
	const g = new THREE.Group();
	const plate = cyl(g, 0.83, 0.09, "#f9f0d3", 0, 0.02, 0);
	plate.castShadow = false;
	torus(g, 0.78, 0.045, COLORS[data.chute]);
	bun(g, 0.16);
	cyl(g, 0.51, 0.18, "#744236", 0, 0.34);
	data.toppings.forEach((t, i) => {
		const f = topping(t, g);
		f.position.y = 0.48 + i * 0.13;
	});
	if (data.ready) bun(g, 0.54 + data.toppings.length * 0.13, true);
	box(g, 0.05, 0.7, 0.04, "#e0cda6", 0.63, 0.52, 0);
	const tag = label(
		String(data.chute + 1),
		"#fff6dc",
		COLORS[data.chute],
		0.48,
		0.48,
		140,
	);
	tag.position.set(0.63, 0.92, 0.03);
	g.add(tag);
	return g;
}
function chef(id) {
	const root = new THREE.Group(),
		rig = new THREE.Group();
	root.add(rig);
	const color = COLORS[id % 4];
	const body = new THREE.Group();
	body.name = "body";
	body.position.y = 0.88;
	rig.add(body);
	const torso = sphere(body, 0.53, CREAM, 0, 0.35, 0);
	torso.scale.set(1.05, 1.12, 0.85);
	box(body, 0.76, 0.69, 0.18, color, 0, 0.31, 0.41);
	box(body, 0.12, 0.9, 0.09, color, -0.25, 0.46, 0.44);
	box(body, 0.12, 0.9, 0.09, color, 0.25, 0.46, 0.44);
	for (let i = 0; i < 2; i++)
		sphere(body, 0.045, INK, -0.14 + i * 0.28, 0.58, 0.51);
	const head = sphere(body, 0.39, "#edb384", 0, 1.05, 0.025);
	head.scale.set(1, 0.92, 0.93);
	sphere(body, 0.14, "#f0b88b", 0, 1.05, 0.38);
	for (const x of [-0.14, 0.14]) {
		const eye = sphere(body, 0.047, INK, x, 1.15, 0.345);
		eye.scale.y = 1.3;
	}
	const mustache = sphere(body, 0.14, "#573b36", -0.1, 0.91, 0.35);
	mustache.scale.set(1.1, 0.35, 0.5);
	const st = sphere(body, 0.14, "#573b36", 0.1, 0.91, 0.35);
	st.scale.set(1.1, 0.35, 0.5);
	cyl(body, 0.38, 0.19, CREAM, 0, 1.42);
	for (let i = 0; i < 3; i++)
		sphere(body, 0.26, CREAM, (i - 1) * 0.25, 1.63, 0);
	const arms = [];
	for (const side of [-1, 1]) {
		const arm = new THREE.Group();
		arm.name = side < 0 ? "leftArm" : "rightArm";
		arm.position.set(side * 0.53, 0.68, 0);
		body.add(arm);
		const sleeve = sphere(arm, 0.23, CREAM, 0, -0.1, 0);
		sleeve.scale.y = 1.3;
		sphere(arm, 0.16, "#edb384", 0, -0.4, 0.02);
		arms.push(arm);
	}
	for (const side of [-1, 1]) {
		const leg = new THREE.Group();
		leg.name = side < 0 ? "leftLeg" : "rightLeg";
		leg.position.set(side * 0.23, 0.78, 0);
		rig.add(leg);
		cyl(leg, 0.145, 0.52, "#34474c", 0, -0.26);
		box(leg, 0.3, 0.2, 0.52, INK, 0, -0.55, 0.1);
	}
	const name = label(String(id + 1), CREAM, color, 0.46, 0.46, 140);
	name.position.set(0, 2.94, 0);
	root.add(name);
	shadow(root, 0.64);
	const hand = new THREE.Group();
	hand.position.set(0, 1.25, 0.92);
	rig.add(hand);
	const mixer = new THREE.AnimationMixer(rig);
	const idle = mixer.clipAction(
		new THREE.AnimationClip("breathe", 2, [
			new THREE.NumberKeyframeTrack("body.scale[y]", [0, 1, 2], [1, 1.035, 1]),
		]),
	);
	idle.play();
	const walk = mixer.clipAction(
		new THREE.AnimationClip("scurry", 0.48, [
			new THREE.NumberKeyframeTrack(
				"leftLeg.rotation[x]",
				[0, 0.12, 0.24, 0.36, 0.48],
				[0.55, 0, -0.55, 0, 0.55],
			),
			new THREE.NumberKeyframeTrack(
				"rightLeg.rotation[x]",
				[0, 0.12, 0.24, 0.36, 0.48],
				[-0.55, 0, 0.55, 0, -0.55],
			),
			new THREE.NumberKeyframeTrack(
				"body.position[y]",
				[0, 0.12, 0.24, 0.36, 0.48],
				[0.88, 0.96, 0.88, 0.96, 0.88],
			),
			new THREE.NumberKeyframeTrack(
				"leftArm.rotation[x]",
				[0, 0.24, 0.48],
				[-0.4, 0.4, -0.4],
			),
			new THREE.NumberKeyframeTrack(
				"rightArm.rotation[x]",
				[0, 0.24, 0.48],
				[0.4, -0.4, 0.4],
			),
		]),
	);
	walk.play();
	walk.weight = 0;
	const pop = mixer.clipAction(
		new THREE.AnimationClip("order-up", 0.38, [
			new THREE.NumberKeyframeTrack(
				"body.scale[x]",
				[0, 0.13, 0.38],
				[1, 1.15, 1],
			),
			new THREE.NumberKeyframeTrack(
				"body.scale[z]",
				[0, 0.13, 0.38],
				[1, 0.85, 1],
			),
		]),
	);
	pop.setLoop(THREE.LoopOnce);
	pop.clampWhenFinished = false;
	return { root, rig, mixer, walk, pop, hand, heldKey: "", arms };
}

export class DinerView {
	async init(container) {
		this.container = container;
		this.renderer = new THREE.WebGPURenderer({
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
		this.renderer.setClearColor("#252b3a");
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.0;
		await this.renderer.init();
		container.append(this.renderer.domElement);
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL2 compatibility";
		this.gpuErrors = [];
		this.renderer.onDeviceLost = (info) => {
			this.gpuLost = info;
			this.recover();
		};
		this.renderer.backend.device?.addEventListener("uncapturederror", (e) =>
			this.gpuErrors.push(e.error.message),
		);
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#252b3a");
		this.scene.fog = new THREE.Fog("#252b3a", 60, 95);
		this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 120);
		this.camera.position.set(13, 25, 31);
		this.camera.lookAt(0, 0, 0);
		this.scene.add(new THREE.HemisphereLight("#fff3ce", "#7e8996", 0.8));
		const sun = new THREE.DirectionalLight("#fff1c8", 1.7);
		sun.position.set(-8, 20, 12);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		Object.assign(sun.shadow.camera, {
			left: -16,
			right: 16,
			top: 14,
			bottom: -14,
			far: 65,
		});
		sun.shadow.bias = -0.001;
		sun.shadow.normalBias = 0.04;
		this.scene.add(sun);
		const rim = new THREE.DirectionalLight("#90dfed", 0.45);
		rim.position.set(10, 8, -7);
		this.scene.add(rim);
		this.stage = new THREE.Group();
		this.scene.add(this.stage);
		this.buildKitchen();
		this.chefs = new Map();
		this.burgers = new Map();
		this.foods = new Map();
		this.particles = [];
		this.effects = [];
		this.fxWorld = new RAPIER.World({ x: 0, y: -16, z: 0 });
		this.fxWorld.createCollider(
			RAPIER.ColliderDesc.cuboid(13, 0.1, 11).setTranslation(0, -0.1, 0),
		);
		this.raycaster = new THREE.Raycaster();
		this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		this.pointer = new THREE.Vector2();
		this.resize();
		window.addEventListener("resize", () => this.resize());
		return this;
	}
	async recover() {
		if (this.recovering) return;
		this.recovering = true;
		const old = this.renderer;
		try {
			const next = new THREE.WebGPURenderer({
				antialias: true,
				forceWebGL: true,
			});
			next.setPixelRatio(Math.min(devicePixelRatio, 1.8));
			next.shadowMap.enabled = true;
			next.shadowMap.type = THREE.PCFSoftShadowMap;
			next.toneMapping = THREE.ACESFilmicToneMapping;
			next.toneMappingExposure = 1.0;
			await next.init();
			old.domElement.replaceWith(next.domElement);
			this.renderer = next;
			this.backend = "WebGL2 compatibility (GPU recovery)";
			this.resize();
			// Retire render-object listeners while the old pipeline maps still exist.
			const materials = new Set(),
				geometries = new Set(),
				textures = new Set();
			this.scene.traverse((o) => {
				if (o.geometry) geometries.add(o.geometry);
				if (o.material) {
					materials.add(o.material);
					if (o.material.map) textures.add(o.material.map);
					if (o.material.gradientMap) textures.add(o.material.gradientMap);
				}
			});
			for (const material of materials) material.dispose();
			for (const geometry of geometries) geometry.dispose();
			for (const texture of textures) texture.dispose();
			old.dispose();
		} catch (e) {
			this.gpuErrors.push(e.message);
		} finally {
			this.recovering = false;
		}
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h);
		const aspect = w / h;
		const span = aspect < 1 ? 26 / aspect : 19.8;
		this.span = span;
		this.projectionOffset = 0;
		this.camera.left = (-span * aspect) / 2;
		this.camera.right = (span * aspect) / 2;
		this.camera.top = span / 2;
		this.camera.bottom = -span / 2;
		this.camera.updateProjectionMatrix();
	}
	buildKitchen() {
		const g = this.stage;
		box(g, 21.2, 0.55, 16.6, INK, 0, -0.35, 0);
		box(g, 20.7, 0.16, 16.1, "#f1d6a5", 0, -0.04, 0);
		for (let x = -10; x <= 10; x++)
			for (let z = -7; z <= 7; z++) {
				const t = mesh(
					new THREE.BoxGeometry(0.965, 0.035, 0.965),
					(x + z) % 2 === 0 ? "#e2cca2" : "#f8e8c7",
					g,
					x,
					0.055,
					z,
					false,
				);
				t.castShadow = false;
			}
		box(g, 21.0, 3.6, 0.45, CREAM, 0, 1.7, -7.6);
		box(g, 21, 0.3, 0.52, RED, 0, 0.6, -7.55);
		for (let i = -10; i < 11; i++)
			box(g, 0.62, 0.4, 0.52, i % 2 ? CREAM : TEAL, i, 1.18, -7.55, 0.01);
		box(g, 0.35, 1.9, 15.3, "#b4d5cc", -10.3, 0.8, 0);
		box(g, 0.4, 0.13, 15.6, INK, -10.3, 1.8, 0);
		// The great mechanical sandwich parade.
		box(g, 2.75, 1.15, 10.5, TEAL, -5.65, 0.58, -0.4);
		box(g, 2.88, 0.2, 10.6, INK, -5.65, 1.2, -0.4);
		box(g, 2.55, 0.12, 10.4, "#647977", -5.65, 1.32, -0.4);
		this.slats = [];
		for (let i = 0; i < 27; i++) {
			const s = box(
				g,
				2.42,
				0.035,
				0.12,
				"#9caf9d",
				-5.65,
				1.4,
				-5.4 + i * 0.39,
				0.01,
			);
			this.slats.push(s);
		}
		for (const x of [-7.08, -4.22])
			box(g, 0.1, 0.24, 10.55, "#e4cda0", x, 1.48, -0.4);
		box(g, 3.3, 2.1, 2.1, RED, -5.65, 1.65, -6.1);
		box(g, 2.62, 0.85, 0.12, INK, -5.65, 1.55, -4.98);
		this.flames = [];
		for (let i = 0; i < 7; i++) {
			const f = mesh(
				new THREE.ConeGeometry(0.18, 0.65, 5),
				"#ffba44",
				g,
				-6.65 + i * 0.33,
				1.61,
				-5.02,
			);
			this.flames.push(f);
		}
		box(g, 3.6, 0.4, 2.35, CREAM, -5.65, 2.8, -6.1);
		const hot = label("CHAR • BROIL", CREAM, RED, 2.7, 0.43, 73);
		hot.position.set(-5.65, 2.8, -4.89);
		g.add(hot);
		const beltLabel = label("BUILD IT HERE", INK, null, 2.1, 0.5, 65);
		beltLabel.position.set(-5.65, 1.53, 3.65);
		beltLabel.rotation.x = -Math.PI / 2;
		g.add(beltLabel);
		// Four striped dispensers, all ingredients made from geometry.
		this.pistons = [];
		FOOD.forEach((f, i) => {
			const z = f.lane;
			box(g, 2.05, 1.8, 2.0, f.color, 8.75, 0.9, z);
			box(g, 2.16, 0.25, 2.1, CREAM, 8.75, 1.91, z);
			box(g, 0.18, 0.8, 1.22, INK, 7.66, 1.08, z);
			box(g, 0.3, 0.15, 1.52, CREAM, 7.45, 0.76, z);
			const cap = new THREE.Group();
			cap.name = "piston";
			cap.position.set(8.75, 2.25, z);
			g.add(cap);
			cyl(cap, 0.34, 0.36, "#e7e2c7");
			const food = topping(i, cap);
			food.scale.setScalar(0.85);
			food.position.y = 0.35;
			const mx = new THREE.AnimationMixer(cap);
			mx.clipAction(
				new THREE.AnimationClip("chug", 1.1 + i * 0.1, [
					new THREE.NumberKeyframeTrack(
						".position[y]",
						[0, 0.55, 1.1 + i * 0.1],
						[2.25, 2.37, 2.25],
					),
				]),
			).play();
			this.pistons.push(mx);
			const l = label(f.name.toUpperCase(), INK, CREAM, 1.65, 0.38, 64);
			l.position.set(8.75, 1.3, z + 1.03);
			g.add(l);
		});
		// Numbered service windows: both number and colour carry the order.
		this.windows = [];
		CHUTES.forEach((x, i) => {
			const z = 7.0,
				c = COLORS[i];
			box(g, 3.4, 1.55, 1.4, c, x, 0.77, z);
			box(g, 3.6, 0.2, 1.65, CREAM, x, 1.58, z);
			box(g, 2.5, 0.08, 0.7, INK, x, 1.7, z - 0.05);
			const sign = label(`${i + 1}  •  PICK UP`, CREAM, c, 2.6, 0.48, 70);
			sign.position.set(x, 1.0, z + 0.73);
			g.add(sign);
			const floorTag = label(String(i + 1), c, null, 1.1, 1.1, 180);
			floorTag.rotation.x = -Math.PI / 2;
			floorTag.position.set(x, 0.13, 4.2);
			g.add(floorTag);
			box(g, 0.055, 1.15, 0.055, INK, x - 1.18, 2.22, z);
			const windowNumber = label(String(i + 1), CREAM, c, 0.9, 0.9, 180);
			windowNumber.position.set(x - 1.18, 2.96, z);
			windowNumber.quaternion.copy(this.camera.quaternion);
			g.add(windowNumber);
			const bag = new THREE.Group();
			bag.name = "bag";
			bag.position.set(x, 1.82, z + 0.1);
			g.add(bag);
			box(bag, 0.7, 0.8, 0.4, "#d7a665", 0, 0.4, 0);
			const stamp = label("♥", RED, null, 0.47, 0.45, 140);
			stamp.position.set(0, 0.43, 0.22);
			bag.add(stamp);
			const mx = new THREE.AnimationMixer(bag);
			const a = mx.clipAction(
				new THREE.AnimationClip("wrap", 0.6, [
					new THREE.NumberKeyframeTrack(
						".position[y]",
						[0, 0.18, 0.6],
						[1.82, 2.9, 1.82],
					),
					new THREE.NumberKeyframeTrack(
						".rotation[y]",
						[0, 0.6],
						[0, Math.PI * 2],
					),
				]),
			);
			a.setLoop(THREE.LoopOnce);
			this.windows.push({ bag, mx, a });
		});
		// The front-of-house peeking over the kitchen.
		const marquee = label("THE SQUEEZE", CREAM, TEAL, 6.2, 1.15, 114, "900");
		marquee.position.set(1.1, 2.9, -7.32);
		g.add(marquee);
		const tagline = label("GOOD FOOD. FAST HANDS.", RED, null, 5.8, 0.5, 70);
		tagline.position.set(1.1, 1.92, -7.3);
		g.add(tagline);
		const clock = cyl(g, 0.62, 0.13, INK, 6.3, 2.8, -7.25);
		clock.rotation.x = Math.PI / 2;
		const face = cyl(g, 0.53, 0.15, CREAM, 6.3, 2.8, -7.15);
		face.rotation.x = Math.PI / 2;
		box(g, 0.05, 0.34, 0.06, INK, 6.3, 2.94, -7.03);
		box(g, 0.28, 0.05, 0.06, INK, 6.42, 2.8, -7.03);
		for (const x of [-8.8, -7.9]) {
			cyl(g, 0.22, 0.7, RED, x, 2, -6.7);
			cyl(g, 0.13, 0.25, CREAM, x, 2.48, -6.7);
		}
		// Steam grate, paper mats and kitchen markings.
		box(g, 1.8, 0.07, 1.6, INK, 1.2, 0.07, -0.2);
		for (let i = 0; i < 7; i++)
			box(g, 0.08, 0.04, 1.45, "#8caaa2", 0.53 + i * 0.22, 0.12, -0.2, 0.01);
		for (let i = 0; i < 9; i++) {
			const stripe = box(
				g,
				0.55,
				0.025,
				0.16,
				"#d6ab55",
				-3.6 + i * 1.27,
				0.1,
				4.55,
				0.01,
			);
			stripe.rotation.y = -0.25;
		}
		const floorText = label("HOT FEET", RED, null, 2, 0.6, 100);
		floorText.rotation.x = -Math.PI / 2;
		floorText.position.set(1.2, 0.13, 1.23);
		g.add(floorText);
		for (const z of [-3.8, -0.3, 3.2]) {
			const arrow = label("←", TEAL, null, 1, 0.6, 180);
			arrow.rotation.x = -Math.PI / 2;
			arrow.position.set(-2.5, 0.12, z);
			g.add(arrow);
		}
		// Back shelf with dishes, cookbooks, plant and tiny burger trophy.
		box(g, 3.6, 0.16, 1.2, "#8c5c43", -1, 3.95, -7.1);
		for (let i = 0; i < 5; i++)
			cyl(g, 0.37, 0.07, CREAM, -1.9, 4.08 + i * 0.07, -7.1);
		for (let i = 0; i < 3; i++)
			box(
				g,
				0.2,
				0.68,
				0.6,
				[RED, TEAL, "#e9b54b"][i],
				-0.7 + i * 0.25,
				4.36,
				-7.1,
			);
		cyl(g, 0.24, 0.38, RED, 1.0, 4.22, -7.1, 0.17);
		for (let i = 0; i < 5; i++) {
			const leaf = sphere(
				g,
				0.24,
				"#71a95b",
				1 + Math.cos(i * 1.26) * 0.17,
				4.6 + Math.sin(i) * 0.12,
				-7.1,
			);
			leaf.scale.set(0.5, 1.5, 0.5);
			leaf.rotation.z = i * 0.6;
		}
		const specials = label("TODAY’S SPECIAL: YOU.", CREAM, INK, 4.2, 0.65, 78);
		specials.position.set(-10.08, 1.05, 1.3);
		specials.rotation.y = Math.PI / 2;
		g.add(specials);
		// Warm diner lamps and cables.
		for (const x of [-5.7, 2.3]) {
			cyl(g, 0.025, 1.35, INK, x, 6.6, -3.7);
			cyl(g, 0.67, 0.4, TEAL, x, 5.75, -3.7, 0.24);
			cyl(g, 0.58, 0.05, "#ffe7a2", x, 5.54, -3.7);
			const l = new THREE.PointLight("#ffcc75", 12, 9);
			l.position.set(x, 4.8, -3.7);
			g.add(l);
		}
	}
	point(clientX, clientY) {
		this.pointer.set(
			(clientX / innerWidth) * 2 - 1,
			1 - (clientY / innerHeight) * 2,
		);
		this.raycaster.setFromCamera(this.pointer, this.camera);
		const out = new THREE.Vector3();
		this.raycaster.ray.intersectPlane(this.plane, out);
		return { x: out.x, z: out.z };
	}
	destination(clientX, clientY, state) {
		const choices = state.burgers
			.map((b) => ({ x: b.x, y: 2, z: b.z, target: { x: -3.55, z: b.z } }))
			.concat(CHUTES.map((x) => ({ x, y: 1.65, z: 7, target: { x, z: 5.55 } })))
			.concat(
				state.foods.map((f) => ({
					x: f.x,
					y: 1.4,
					z: f.z,
					target: { x: Math.max(-3.55, Math.min(7.5, f.x - 0.3)), z: f.z },
				})),
			);
		let best = null,
			distance = 70;
		for (const c of choices) {
			const p = new THREE.Vector3(c.x, c.y, c.z).project(this.camera);
			const d = Math.hypot(
				((p.x + 1) * innerWidth) / 2 - clientX,
				((1 - p.y) * innerHeight) / 2 - clientY,
			);
			if (d < distance) {
				best = c.target;
				distance = d;
			}
		}
		if (best) return best;
		const p = this.point(clientX, clientY);
		return {
			x: Math.max(-3.55, Math.min(7.5, p.x)),
			z: Math.max(-5.5, Math.min(5.7, p.z)),
		};
	}
	popText(text, x, z, color = CREAM) {
		const m = label(text, color, INK, 3.4, 0.65, 90);
		m.position.set(x, 3.4, z);
		m.quaternion.copy(this.camera.quaternion);
		this.scene.add(m);
		this.effects.push({ m, life: 1.2 });
	}
	confetti(x, z, count = 12) {
		for (let i = 0; i < count; i++) {
			const m = box(
				this.scene,
				0.12,
				0.11,
				0.16,
				[RED, TEAL, "#ffd064", CREAM][i % 4],
				x,
				2,
				z,
				0.01,
			);
			const b = this.fxWorld.createRigidBody(
				RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 2, z),
			);
			this.fxWorld.createCollider(
				RAPIER.ColliderDesc.cuboid(0.06, 0.055, 0.08).setRestitution(0.5),
				b,
			);
			b.setLinvel(
				{
					x: (Math.random() - 0.5) * 6,
					y: 4 + Math.random() * 4,
					z: (Math.random() - 0.5) * 6,
				},
				true,
			);
			b.setAngvel({ x: 5, y: 7, z: 3 }, true);
			this.particles.push({ m, b, life: 2.2 });
		}
	}
	event(e) {
		if (e.type === "spill") this.confetti(e.x, e.z, 5);
		if (e.type === "reject" && e.fromHand) {
			const m = topping(e.foodType);
			m.position.set(e.x, 1.6, e.z);
			this.scene.add(m);
			this.effects.push({ m, life: 1.2, vx: 9 });
		}
		if (e.type === "served") {
			const w = this.windows[e.chute];
			w.a.reset().play();
			this.confetti(e.x, e.z);
			this.popText(`+${e.value}  ORDER UP!`, e.x, e.z);
		}
		if (e.type === "mistake" && e.amount >= 2)
			this.popText(`−${e.amount}`, e.x ?? 0, e.z ?? 0, "#ff9a79");
		if (e.type === "catch" || e.type === "topping" || e.type === "pickup")
			this.chefs.get(e.id)?.pop.reset().play();
		if (e.type === "won") this.confetti(1, 0, 50);
	}
	render(s, dt, title = false, time = 0) {
		if (this.recovering) return;
		const offset = title && innerWidth < innerHeight ? this.span * 0.22 : 0;
		if (offset !== this.projectionOffset) {
			this.projectionOffset = offset;
			this.camera.top = this.span / 2 + offset;
			this.camera.bottom = -this.span / 2 + offset;
			this.camera.updateProjectionMatrix();
		}
		const target = title
			? new THREE.Vector3(-4.8, 0, 0)
			: new THREE.Vector3(-0.2, 0, 0);
		if (innerWidth / innerHeight < 1) target.set(0, 0, 0);
		const desired = new THREE.Vector3(target.x + 13, 25, 31);
		this.camera.position.lerp(desired, Math.min(1, dt * 4));
		this.camera.lookAt(target);
		this.slats.forEach((m, i) => {
			if (s.mode === "playing" && s.brake <= 0)
				m.position.z = -5.5 + ((i * 0.39 + time * 0.4) % 10.53);
		});
		this.flames.forEach((m, i) => {
			m.scale.y = 0.7 + 0.35 * Math.sin(time * 7 + i * 2);
		});
		for (const mx of this.pistons) mx.update(dt);
		for (const w of this.windows) w.mx.update(dt);
		for (const p of s.players) {
			let c = this.chefs.get(p.id);
			if (!c) {
				c = chef(p.id);
				this.scene.add(c.root);
				this.chefs.set(p.id, c);
			}
			c.root.visible = !p.disconnected;
			c.root.position.set(p.x, 0, p.z);
			const angle =
				THREE.MathUtils.euclideanModulo(
					p.face - c.rig.rotation.y + Math.PI,
					Math.PI * 2,
				) - Math.PI;
			c.rig.rotation.y += angle * Math.min(1, dt * 15);
			c.walk.weight = p.moving ? 1 : 0;
			c.mixer.update(dt * (p.dash > 0 ? 1.8 : 1));
			c.root.scale.y = p.stunned > 0 ? 0.87 : 1;
			const key = p.held ? JSON.stringify(p.held) : "";
			if (key !== c.heldKey) {
				for (const child of [...c.hand.children]) release(child);
				if (p.held?.kind === "topping") topping(p.held.type, c.hand);
				else if (p.held?.kind === "burger") {
					const b = burger(p.held.burger);
					b.scale.setScalar(0.75);
					c.hand.add(b);
				}
				c.heldKey = key;
			}
			c.arms.forEach((a) => {
				if (p.held) a.rotation.x = -0.8;
			});
		}
		for (const [id, c] of this.chefs)
			if (!s.players.some((p) => p.id === id)) c.root.visible = false;
		for (const b of s.burgers) {
			const key = JSON.stringify([b.chute, b.recipe, b.toppings, b.ready]);
			let entry = this.burgers.get(b.id);
			if (!entry || entry.key !== key) {
				if (entry) release(entry.m);
				entry = { m: burger(b), key };
				this.scene.add(entry.m);
				this.burgers.set(b.id, entry);
			}
			entry.m.position.set(b.x, 1.5, b.z);
			if (b.ready) entry.m.position.y += Math.sin(time * 5) * 0.045;
		}
		for (const [id, e] of this.burgers)
			if (!s.burgers.some((b) => b.id === id)) {
				release(e.m);
				this.burgers.delete(id);
			}
		for (const f of s.foods) {
			let m = this.foods.get(f.id);
			if (m && m.userData.foodType !== f.type) {
				release(m);
				this.foods.delete(f.id);
				m = null;
			}
			if (!m) {
				m = topping(f.type);
				m.userData.foodType = f.type;
				this.scene.add(m);
				this.foods.set(f.id, m);
			}
			m.position.set(f.x, 1.4 + Math.sin(f.age * 5) * 0.12, f.z);
			m.rotation.y = f.age * 2;
		}
		for (const [id, m] of this.foods)
			if (!s.foods.some((f) => f.id === id)) {
				release(m);
				this.foods.delete(id);
			}
		if (s.steam && Math.random() < dt * 10) {
			const m = sphere(
				this.scene,
				0.24,
				"#f6f0d6",
				1.2 + (Math.random() - 0.5),
				0.3,
				-0.2 + (Math.random() - 0.5),
			);
			m.material = new THREE.MeshBasicMaterial({
				color: CREAM,
				transparent: true,
				opacity: 0.4,
			});
			this.effects.push({ m, life: 1.0, steam: true });
		}
		this.fxWorld.timestep = Math.min(dt, 1 / 30);
		this.fxWorld.step();
		this.particles = this.particles.filter((p) => {
			p.life -= dt;
			if (p.life <= 0) {
				release(p.m);
				this.fxWorld.removeRigidBody(p.b);
				return false;
			}
			p.m.position.copy(p.b.translation());
			p.m.quaternion.copy(p.b.rotation());
			return true;
		});
		this.effects = this.effects.filter((e) => {
			e.life -= dt;
			if (e.vx) {
				e.m.position.x += e.vx * dt;
				e.m.rotation.y += dt * 5;
			}
			e.m.position.y += dt * (e.steam ? 2 : 0.7);
			if (e.steam) {
				e.m.scale.multiplyScalar(1 + dt * 0.8);
				e.m.material.opacity = e.life * 0.35;
			}
			if (e.life <= 0) {
				release(e.m);
				return false;
			}
			return true;
		});
		this.renderer.render(this.scene, this.camera);
	}
}
