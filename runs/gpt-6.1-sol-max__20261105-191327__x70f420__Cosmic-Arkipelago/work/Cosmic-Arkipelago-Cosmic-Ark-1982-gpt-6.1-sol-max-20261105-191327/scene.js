import * as T from "three/webgpu";
import { color, normalWorld, vec3 } from "three/tsl";
import { WORLDS } from "./core.js";

const ink = new T.MeshBasicNodeMaterial({ color: 0x091322, side: T.BackSide });
const mats = new Map();
function cel(c) {
	if (mats.has(c)) return mats.get(c);
	const m = new T.MeshBasicNodeMaterial();
	const light = normalWorld
		.dot(vec3(-0.35, 0.8, 1).normalize())
		.mul(0.5)
		.add(0.5)
		.mul(3)
		.floor()
		.div(3)
		.mul(0.47)
		.add(0.53);
	m.colorNode = color(c).mul(light);
	mats.set(c, m);
	return m;
}
function flat(c, opacity = 1) {
	return new T.MeshBasicNodeMaterial({
		color: c,
		transparent: opacity < 1,
		opacity,
		depthWrite: opacity >= 1,
	});
}
function part(
	parent,
	geo,
	c,
	x = 0,
	y = 0,
	z = 0,
	scale = [1, 1, 1],
	outline = true,
) {
	const m = new T.Mesh(
		geo,
		typeof c === "string" || typeof c === "number" ? cel(c) : c,
	);
	m.position.set(x, y, z);
	m.scale.set(...scale);
	parent.add(m);
	if (outline) {
		const edge = new T.Mesh(geo, ink);
		edge.scale.setScalar(1.055);
		m.add(edge);
	}
	return m;
}
const sphere = new T.SphereGeometry(1, 18, 12),
	ico = new T.IcosahedronGeometry(1, 1),
	box = new T.BoxGeometry(1, 1, 1),
	cylinder = new T.CylinderGeometry(1, 1, 1, 12),
	cone = new T.ConeGeometry(1, 1, 8),
	circle = new T.CircleGeometry(1, 24);
const mint = "#a9efd0",
	cream = "#f7edcc",
	coral = "#f48c7b",
	navy = "#23354c",
	gold = "#f7ce80";
function ball(p, c, x, y, z, sx = 1, sy = sx, sz = sx) {
	return part(p, sphere, c, x, y, z, [sx, sy, sz]);
}
function rod(p, c, x, y, z, sx, sy, sz) {
	return part(p, box, c, x, y, z, [sx, sy, sz]);
}
function ring(p, r, c, x = 0, y = 0, z = 0, tube = 0.035) {
	return part(
		p,
		new T.TorusGeometry(r, tube, 5, 90),
		flat(c),
		x,
		y,
		z,
		[1, 1, 1],
		false,
	);
}
function line(p, points, c, opacity = 1) {
	const geo = new T.BufferGeometry().setFromPoints(
		points.map((v) => new T.Vector3(...v)),
	);
	const m = new T.Line(
		geo,
		new T.LineBasicNodeMaterial({
			color: c,
			opacity,
			transparent: opacity < 1,
		}),
	);
	p.add(m);
	return m;
}
function animate(root, tracks, duration) {
	const mix = new T.AnimationMixer(root);
	mix.clipAction(new T.AnimationClip("alive", duration, tracks)).play();
	return mix;
}
function ark() {
	const g = new T.Group(),
		body = new T.Group();
	body.name = "Hull";
	g.add(body);
	ball(body, navy, 0, -0.2, 0, 2.65, 0.7, 0.8);
	ball(body, cream, 0, 0.12, 0.05, 2.6, 0.79, 0.86);
	ball(body, coral, 0, -0.45, 0.08, 2.25, 0.32, 0.83);
	rod(body, navy, 0, -0.12, 0.83, 4.6, 0.12, 0.08);
	rod(body, mint, 0, -0.28, 0.85, 4.2, 0.07, 0.1);
	ball(body, "#618e9f", 0.2, 0.75, 0.08, 1.15, 0.53, 0.65);
	ball(body, "#b3ecde", 0.2, 0.91, 0.42, 0.88, 0.32, 0.39);
	rod(body, cream, -1.5, 0.8, 0, 0.18, 0.9, 0.28);
	ball(body, gold, -1.5, 1.32, 0, 0.13);
	rod(body, cream, 1.6, 0.62, 0, 0.22, 0.8, 0.3);
	for (let i = 0; i < 8; i++) {
		const x = -1.96 + i * 0.56;
		ball(body, navy, x, 0.04, 0.8, 0.14, 0.14, 0.075);
		ball(body, "#a9efd0", x, 0.055, 0.87, 0.08, 0.08, 0.025);
	}
	for (const sign of [-1, 1]) {
		const fin = part(
			body,
			new T.ConeGeometry(0.6, 1.25, 3),
			cream,
			sign * 2.6,
			-0.08,
			-0.05,
			[1, 1, 0.4],
		);
		fin.rotation.z = (sign * -Math.PI) / 2;
		rod(body, navy, sign * 2.75, 0.05, 0.05, 0.85, 0.16, 0.26);
		ball(body, coral, sign * 2.95, 0.12, 0.15, 0.14);
	}
	rod(body, cream, 0, -0.88, 0.06, 1.25, 0.38, 0.75);
	rod(body, navy, 0, -1.08, 0.45, 0.8, 0.13, 0.1);
	const mix = animate(
		g,
		[
			new T.NumberKeyframeTrack("Hull.position[y]", [0, 1.5, 3], [0, 0.13, 0]),
			new T.NumberKeyframeTrack(
				"Hull.rotation[z]",
				[0, 1.5, 3],
				[-0.015, 0.015, -0.015],
			),
		],
		3,
	);
	return { g, mix };
}
function shuttle() {
	const g = new T.Group(),
		body = new T.Group();
	g.add(body);
	body.name = "Pod";
	ball(body, cream, 0, 0, 0, 0.82, 0.33, 0.5);
	ball(body, navy, 0, 0.22, 0, 0.43, 0.3, 0.36);
	ball(body, mint, 0, 0.24, 0.24, 0.32, 0.23, 0.19);
	rod(body, coral, 0, -0.2, 0.37, 1.1, 0.1, 0.1);
	for (const v of [-1, 1]) {
		const a = part(body, cone, gold, v * 0.65, -0.14, 0, [0.28, 0.4, 0.3]);
		a.rotation.z = v * -1.0;
		ball(body, cream, v * 0.17, 0.25, 0.42, 0.06);
		ball(body, navy, v * 0.17, 0.25, 0.47, 0.025);
	}
	const flame = ball(g, mint, 0, 0.05, -0.45, 0.3, 0.4, 0.12);
	flame.name = "Thruster";
	const beam = part(
		g,
		new T.CylinderGeometry(0.12, 1.25, 1, 24, 1, true),
		flat(mint, 0.16),
		0,
		-1,
		0,
		[1, 1, 1],
		false,
	);
	beam.visible = false;
	const bands = [];
	for (let i = 0; i < 6; i++) {
		const b = ring(g, 1, mint);
		b.rotation.x = Math.PI / 2;
		bands.push(b);
	}
	const mix = animate(
		g,
		[
			new T.VectorKeyframeTrack(
				"Thruster.scale",
				[0, 0.15, 0.3],
				[0.3, 0.4, 0.12, 0.45, 0.7, 0.15, 0.3, 0.4, 0.12],
			),
		],
		0.3,
	);
	return { g, body, beam, bands, mix };
}
function creature(world, id) {
	const root = new T.Group(),
		g = new T.Group();
	g.name = "Beastie";
	root.add(g);
	const col =
		world === 0
			? id
				? coral
				: mint
			: world === 1
				? id
					? "#cebbf3"
					: "#a6dcf0"
				: id
					? "#ffc08b"
					: "#f7ce80";
	ball(g, col, 0, 0.13, 0, 0.47, 0.55, 0.37);
	ball(g, cream, 0, -0.03, 0.31, 0.29, 0.27, 0.09);
	const ears = [];
	for (const s of [-1, 1]) {
		const ear = new T.Group();
		ear.name = s < 0 ? "EarL" : "EarR";
		ear.position.set(s * 0.27, 0.52, 0);
		g.add(ear);
		if (world === 0) {
			ball(ear, col, s * 0.04, 0.26, 0, 0.17, 0.36, 0.13);
			ball(ear, cream, s * 0.04, 0.27, 0.11, 0.08, 0.21, 0.03);
		} else if (world === 1) {
			const f = part(ear, cone, col, s * 0.25, -0.2, 0, [0.35, 0.65, 0.12]);
			f.rotation.z = s * -1.1;
		} else {
			part(ear, cone, col, 0, 0.1, 0, [0.22, 0.4, 0.19]);
			part(ear, cone, coral, 0, 0.1, 0.14, [0.11, 0.2, 0.035]);
		}
		ears.push(ear);
		ball(g, navy, s * 0.16, 0.24, 0.35, 0.085, 0.11, 0.045);
		ball(g, "#fff8e5", s * 0.177, 0.275, 0.388, 0.026);
		ball(g, coral, s * 0.31, 0.04, 0.32, 0.075, 0.05, 0.025);
		ball(g, col, s * 0.25, -0.4, 0.05, 0.18, 0.13, 0.23);
	}
	const tail = ball(g, col, 0.43, -0.05, -0.15, 0.22, 0.25, 0.2);
	tail.name = "Tail";
	ball(g, navy, 0, 0.035, 0.41, 0.045, 0.03, 0.025);
	if (world === 0) {
		const leaf = part(g, cone, gold, 0, 0.81, -0.02, [0.19, 0.39, 0.08]);
		leaf.rotation.z = -0.5;
	}
	if (world === 1) {
		const fin = part(g, cone, col, 0, -0.12, -0.4, [0.4, 0.7, 0.12]);
		fin.rotation.x = 1.2;
	}
	const mix = animate(
		root,
		[
			new T.NumberKeyframeTrack(
				"Beastie.position[y]",
				[0, 0.3, 0.6, 1.2],
				[0, 0.18, 0, 0],
			),
			new T.VectorKeyframeTrack(
				"Beastie.scale",
				[0, 0.3, 0.6, 1.2],
				[1, 1, 1, 0.94, 1.07, 1, 1.07, 0.93, 1, 1, 1, 1],
			),
			new T.NumberKeyframeTrack(
				"EarL.rotation[z]",
				[0, 0.6, 1.2],
				[-0.14, 0.14, -0.14],
			),
			new T.NumberKeyframeTrack(
				"EarR.rotation[z]",
				[0, 0.6, 1.2],
				[0.14, -0.14, 0.14],
			),
		],
		1.2,
	);
	mix.setTime(id * 0.43);
	return { g: root, mix };
}
function random(seed) {
	return () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}
export class Observatory {
	constructor(canvas, settings) {
		this.canvas = canvas;
		this.settings = settings;
		this.scene = new T.Scene();
		this.camera = new T.OrthographicCamera(-18, 18, 10, -10, 0.1, 160);
		this.camera.position.set(0, 0, 45);
		this.camera.lookAt(0, 0, 0);
		this.renderer = new T.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance",
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		this.renderer.setClearColor("#0e1b30");
		this.renderer.outputColorSpace = T.SRGBColorSpace;
		this.renderer.toneMapping = T.NoToneMapping;
		this.meshes = new Map();
		this.particles = [];
		this.mixes = [];
		this.world = -1;
		this.shake = 0;
		this.renderFrames = 0;
		this.root = new T.Group();
		this.scene.add(this.root);
		this.sky = new T.Group();
		this.scene.add(this.sky);
		this.land = new T.Group();
		this.root.add(this.land);
		this.orbit = new T.Group();
		this.root.add(this.orbit);
		this.fg = new T.Group();
		this.root.add(this.fg);
		this.buildSky();
		this.buildOrbit();
		const a = ark();
		this.ark = a.g;
		this.mixes.push(a.mix);
		this.root.add(this.ark);
		this.shuttle = shuttle();
		this.root.add(this.shuttle.g);
		this.mixes.push(this.shuttle.mix);
		this.petGroups = [];
		this.laserGroups = [];
		this.pulseRing = ring(this.root, 1, mint);
		this.pulseRing.visible = false;
		this.pulseAge = 5;
		this.dockRing = ring(this.root, 1.8, mint, 0, 6.5, 0, 0.018);
		this.dockRing.scale.y = 0.25;
		this.buildWorld(0);
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
		this.resize();
		window.addEventListener("resize", () => this.resize());
		return this;
	}
	resize() {
		const w = innerWidth,
			h = innerHeight,
			a = w / h,
			spanX = Math.max(35, 20 * a),
			spanY = spanX / a;
		this.camera.left = -spanX / 2;
		this.camera.right = spanX / 2;
		this.camera.top = spanY / 2;
		this.camera.bottom = -spanY / 2;
		this.camera.updateProjectionMatrix();
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setSize(w, h, false);
	}
	buildSky() {
		const rng = random(82);
		for (const [c, count] of [
			["#638696", 180],
			["#c8d7c2", 75],
			["#8acbbf", 30],
		]) {
			const stars = new T.InstancedMesh(
					new T.PlaneGeometry(1, 1),
					flat(c),
					count,
				),
				o = new T.Object3D();
			for (let i = 0; i < count; i++) {
				const s = 0.025 + rng() * 0.07;
				o.position.set(
					(rng() - 0.5) * 90,
					(rng() - 0.5) * 60,
					-25 - rng() * 20,
				);
				o.scale.set(s, s, 1);
				o.rotation.z = Math.PI / 4;
				o.updateMatrix();
				stars.setMatrixAt(i, o.matrix);
			}
			this.sky.add(stars);
		}
		const moon = new T.Group();
		moon.position.set(13.5, 6, -24);
		this.sky.add(moon);
		ball(moon, "#e5ac86", 0, 0, 0, 4.6, 4.6, 1);
		ball(moon, "#edc496", -1, 1, 0.7, 3.8, 3.8, 0.3);
		for (let i = 0; i < 9; i++)
			part(
				moon,
				box,
				flat(i % 2 ? "#dd9f7e" : "#e7b38a"),
				0.2,
				-3.5 + i * 0.8,
				1.2,
				[Math.sqrt(Math.max(0, 20 - (-3.5 + i * 0.8) ** 2)) * 2, 0.075, 0.02],
				false,
			);
		const r = ring(moon, 6.2, "#6a6170", 0, 0, -0.5, 0.035);
		r.scale.y = 0.3;
		r.rotation.z = -0.3;
		for (let i = 0; i < 3; i++) {
			const r = ring(this.sky, 11 + i * 3, "#294052", 9, 4, -20 - i, 0.008);
			r.scale.y = 0.7;
		}
		for (const [x, y, s] of [
			[-13, 7, 0.22],
			[17, -2, 0.18],
			[5, 9, 0.16],
			[-16, -5, 0.13],
		]) {
			const star = new T.Group();
			this.sky.add(star);
			rod(star, "#b7dace", x, y, -15, 0.025, s * 3, 0.01);
			rod(star, "#b7dace", x, y, -15, s * 3, 0.025, 0.01);
		}
	}
	buildOrbit() {
		for (let j = 0; j < 3; j++) {
			const r = ring(
				this.orbit,
				4.2 + j * 2.7,
				j === 0 ? "#385264" : "#22394d",
				0,
				0,
				-2,
				0.012,
			);
			r.scale.x = 1.15;
		}
		for (let d = 0; d < 4; d++) {
			const a = (d * Math.PI) / 2,
				dx = Math.cos(a),
				dy = Math.sin(a);
			for (let i = 0; i < 4; i++)
				line(
					this.orbit,
					[
						[dx * (4.6 + i * 1.7), dy * (4.6 + i * 1.7), -1],
						[dx * (5.25 + i * 1.7), dy * (5.25 + i * 1.7), -1],
					],
					"#486377",
					0.65,
				);
			const tri = part(
				this.orbit,
				cone,
				flat("#638c91"),
				dx * 3.8,
				dy * 3.8,
				-1,
				[0.12, 0.25, 0.1],
				false,
			);
			tri.rotation.z = a - Math.PI / 2;
		}
	}
	buildWorld(index) {
		this.world = index;
		this.land.clear();
		for (const p of this.petGroups) {
			this.root.remove(p.g);
			this.mixes.splice(this.mixes.indexOf(p.mix), 1);
		}
		this.petGroups = [];
		const w = WORLDS[index],
			rng = random(index + 181);
		const shape = new T.Shape();
		shape.moveTo(-16, -6);
		for (let i = 0; i <= 24; i++) {
			const x = -16 + (i * 32) / 24;
			shape.lineTo(x, -6 + Math.sin(i * 0.8) * 0.16);
		}
		shape.lineTo(14, -8);
		shape.lineTo(7, -9.5);
		shape.lineTo(-1, -10.2);
		shape.lineTo(-9, -8.6);
		shape.lineTo(-15, -8);
		shape.closePath();
		const terrain = new T.ExtrudeGeometry(shape, {
			depth: 3,
			bevelEnabled: true,
			bevelThickness: 0.2,
			bevelSize: 0.18,
			bevelSegments: 1,
			steps: 1,
		});
		part(this.land, terrain, w.rock, 0, 0, -2);
		const cap = new T.Shape();
		cap.moveTo(-16, -5.85);
		for (let i = 0; i <= 32; i++) {
			cap.lineTo(-16 + i, -5.7 + Math.sin(i * 1.3) * 0.1);
		}
		cap.lineTo(16, -6.35);
		cap.lineTo(-16, -6.35);
		cap.closePath();
		part(
			this.land,
			new T.ExtrudeGeometry(cap, { depth: 3.3, bevelEnabled: false }),
			w.land,
			0,
			0,
			-2,
		);
		for (let i = 0; i < 30; i++) {
			const x = -15 + rng() * 30,
				y = -6.5 - rng() * 2.6;
			const rock = part(
				this.land,
				ico,
				index === 0 ? "#426b65" : index === 1 ? "#596d95" : "#955b65",
				x,
				y,
				1,
				[0.15 + rng() * 0.35, 0.16 + rng() * 0.25, 0.1],
			);
			rock.rotation.z = rng() * 4;
		}
		for (let i = 0; i < 40; i++) {
			const x = -15 + rng() * 30;
			const blade = part(
				this.land,
				cone,
				i % 3 === 0 ? cream : w.color,
				x,
				-5.55,
				1.1,
				[0.04, 0.17 + rng() * 0.2, 0.02],
			);
			blade.rotation.z = (rng() - 0.5) * 0.8;
		}
		for (const x of [-12.5, -4.6, 3.4, 12]) {
			const tree = new T.Group();
			tree.position.set(x, -5.7, -1);
			this.land.add(tree);
			const h = 1.2 + rng() * 1.5;
			if (index === 0) {
				rod(tree, navy, 0, h * 0.5, 0, 0.16, h, 0.16);
				for (let j = 0; j < 3; j++) {
					const br = line(
						tree,
						[
							[0, h * 0.35, 0],
							[(j - 1) * 0.75, h * (0.55 + j * 0.1), 0],
						],
						w.land,
					);
					ball(
						tree,
						j === 1 ? coral : w.color,
						(j - 1) * 0.55,
						h * (0.75 + j * 0.09),
						0,
						0.75,
						0.48,
						0.5,
					);
				}
				ball(tree, w.color, 0, h + 0.25, 0, 1, 0.65, 0.65);
			} else if (index === 1) {
				for (let j = 0; j < 3; j++) {
					const crystal = part(
						tree,
						new T.ConeGeometry(0.45, h + j * 0.3, 5),
						j % 2 ? "#c5c4f1" : w.color,
						(j - 1) * 0.45,
						(h + j * 0.3) / 2,
						0,
						[1, 1, 0.7],
					);
					crystal.rotation.z = (j - 1) * 0.16;
				}
			} else {
				rod(tree, w.rock, 0, h * 0.45, 0, 0.22, h * 0.9, 0.23);
				ball(tree, w.color, 0, h, 0, 1.1, 0.3, 0.8);
				ball(tree, coral, -0.2, h + 0.18, 0.05, 0.8, 0.18, 0.6);
				for (let j = 0; j < 5; j++)
					ball(tree, cream, -0.65 + j * 0.3, h + 0.16, 0.6, 0.07);
			}
		}
		for (const side of [-1, 1]) {
			const t = new T.Group();
			t.position.set(side * 15.5, -3.1, 0);
			this.land.add(t);
			rod(t, w.rock, 0, -1, 0, 1.1, 3, 1);
			rod(t, cream, 0, 0, 0.05, 0.8, 0.7, 0.7);
			ball(t, coral, -side * 0.4, 0, 0.45, 0.21);
			rod(t, navy, -side * 0.4, 0, 0.1, 0.75, 0.2, 0.28);
			ring(t, 0.44, coral, 0, 0, 0.5, 0.025);
		}
		for (let i = 0; i < 2; i++) {
			const pet = creature(index, i);
			this.petGroups.push(pet);
			this.root.add(pet.g);
			this.mixes.push(pet.mix);
		}
		this.renderer.setClearColor(w.sky);
	}
	burst(x, y, col = coral, amount = 24, size = 1) {
		const rng = Math.random;
		for (let i = 0; i < amount; i++) {
			const mesh = part(
				this.fg,
				i % 3 ? ico : cone,
				flat(i % 4 === 0 ? cream : col),
				x,
				y,
				1,
				[0.08 + Math.random() * 0.12, 0.08 + Math.random() * 0.12, 0.08],
				false,
			);
			const a = rng() * Math.PI * 2;
			this.particles.push({
				mesh,
				vx: Math.cos(a) * (2 + rng() * 4) * size,
				vy: Math.sin(a) * (2 + rng() * 4) * size,
				age: 0,
				life: 0.5 + rng() * 0.6,
			});
		}
	}
	event(e) {
		if (e.type === "burst")
			this.burst(e.x, e.y, e.color === "mint" ? mint : coral, 26, e.size);
		if (e.type === "spark") this.burst(e.x, e.y, gold, 9, 0.4);
		if (e.type === "hit") this.shake = 0.5;
		if (e.type === "captured")
			this.burst(
				this.shuttle.g.position.x,
				this.shuttle.g.position.y,
				mint,
				30,
				0.6,
			);
		if (e.type === "delivered") this.burst(0, 6.6, gold, 35, 1);
		if (e.type === "pulse") {
			this.pulseAge = 0;
			this.pulseRing.position.set(e.x, e.y, 2);
			this.pulseRing.visible = true;
		}
		if (e.type === "boss-down") this.burst(0, 4, gold, 90, 2);
	}
	project(x, y) {
		const v = new T.Vector3(x, y, 1).project(this.camera);
		return {
			x: (v.x * 0.5 + 0.5) * innerWidth,
			y: (-v.y * 0.5 + 0.5) * innerHeight,
		};
	}
	draw(state, dt, mode = "game") {
		const title = mode === "title";
		if (state.worldIndex !== this.world) this.buildWorld(state.worldIndex);
		const rescue =
			title ||
			state.phase === "rescue" ||
			state.phase === "transit" ||
			state.phase === "victory";
		this.land.visible = rescue;
		this.orbit.visible = !rescue;
		this.dockRing.visible = state.phase === "rescue";
		this.root.position.x = title ? 5.4 : 0;
		this.root.position.y = title ? -1 : 0;
		this.ark.position.set(title ? 2 : 0, rescue ? 7.1 : 0, 0);
		this.ark.scale.setScalar(title ? 1.35 : 1);
		this.ark.rotation.z =
			state.phase === "transit" ? Math.sin(state.phaseTime * 2) * 0.025 : 0;
		const s = state.shuttle || { x: 0, y: 1, beam: false };
		this.shuttle.g.visible = title || state.phase === "rescue";
		this.shuttle.g.position.set(title ? 7 : s.x, title ? -1 : s.y, 1);
		this.shuttle.body.rotation.z = title ? -0.12 : -(s.vx || 0) * 0.022;
		this.shuttle.g.scale.setScalar(1);
		this.shuttle.body.visible = !(
			s.inv > 0 && Math.floor(state.time * 14) % 2 === 0
		);
		const length = title ? 4 : s.y + 5.3;
		this.shuttle.beam.visible = title || s.beam;
		this.shuttle.beam.position.y = -length * 0.5 - 0.17;
		this.shuttle.beam.scale.set(1, length, 1);
		for (let i = 0; i < 6; i++) {
			const f = (state.time * 0.65 + i / 6) % 1;
			const b = this.shuttle.bands[i];
			b.visible = title || s.beam;
			b.position.y = -0.2 - f * length;
			b.scale.setScalar(0.25 + f * 1.0);
			b.material.opacity = (1 - f) * 0.5;
			b.material.transparent = true;
		}
		for (let i = 0; i < 2; i++) {
			const pet = this.petGroups[i],
				c = state.creatures?.[i];
			pet.g.visible = rescue && (title || (!!c && c.state !== "banked"));
			if (title) {
				pet.g.position.set(i === 0 ? 4 : 10, -5.3, 1);
				pet.g.scale.setScalar(1);
				pet.g.rotation.y = -0.2;
			} else if (c) {
				if (c.state === "cargo") {
					const slot = s.cargo.indexOf(c.id);
					pet.g.position.set(s.x + (slot - 0.5) * 0.5, s.y + 0.58, 1);
					pet.g.scale.setScalar(0.4);
				} else {
					pet.g.position.set(
						c.x,
						-5.25 + (c.lift || 0) * Math.max(0.8, s.y + 5.2),
						1,
					);
					pet.g.scale.setScalar(1);
				}
			}
		}
		this.sky.rotation.z = Math.sin(state.time * 0.015) * 0.02;
		for (const mix of this.mixes) mix.update(dt);
		const seen = new Set();
		for (const e of state.entities || []) {
			if (e.kind !== "rock" && e.kind !== "shot") continue;
			seen.add(e.id);
			let m = this.meshes.get(e.id);
			if (!m) {
				m = new T.Group();
				if (e.kind === "shot") {
					rod(m, cream, 0, 0, 0, 0.48, 0.15, 0.12);
					ball(m, mint, -0.25, 0, 0, 0.14, 0.07, 0.07);
				} else {
					const c =
						e.type === "waver"
							? mint
							: e.type === "sunheart"
								? gold
								: e.type === "heavy"
									? "#ba8ba2"
									: "#d19786";
					const rock = part(
						m,
						e.type === "sunheart" ? new T.IcosahedronGeometry(1, 1) : ico,
						c,
						0,
						0,
						0,
						[e.r, e.r, e.r * 0.8],
					);
					rock.rotation.z = e.id;
					for (let i = 0; i < (e.type === "sunheart" ? 9 : 3); i++) {
						const a = i * 2.4 + e.id;
						ball(
							m,
							e.type === "waver"
								? "#46796d"
								: e.type === "sunheart"
									? coral
									: "#80616b",
							Math.cos(a) * e.r * 0.55,
							Math.sin(a) * e.r * 0.55,
							e.r * 0.6,
							e.r * 0.17,
							e.r * 0.13,
							e.r * 0.08,
						);
					}
					const trail = part(
						m,
						new T.ConeGeometry(e.r * 0.7, e.r * 3, 7),
						flat(c, 0.13),
						0,
						e.r * 1.2,
						-0.3,
						[1, 1, 0.3],
						false,
					);
					trail.rotation.z = Math.atan2(e.x, -e.y);
				}
				this.meshes.set(e.id, m);
				this.root.add(m);
			}
			m.position.set(e.x, e.y, 0.4);
			if (e.kind === "rock")
				m.rotation.z += dt * (e.type === "waver" ? -2 : 0.7);
			else m.rotation.z = Math.abs(e.x) > Math.abs(e.y) ? 0 : Math.PI / 2;
		}
		for (const [id, m] of this.meshes)
			if (!seen.has(id)) {
				this.root.remove(m);
				this.meshes.delete(id);
			}
		for (const g of this.laserGroups) this.root.remove(g);
		this.laserGroups = [];
		if (state.phase === "rescue")
			for (const l of state.lasers) {
				const g = new T.Group();
				this.root.add(g);
				g.position.set(0, l.y, 1.5);
				if (l.age < 1.2) {
					for (let x = -15; x < 16; x += 1.2)
						rod(
							g,
							flat(coral, 0.15 + Math.sin(l.age * 18) * 0.1),
							x,
							0,
							0,
							0.7,
							0.025,
							0.04,
						);
				} else {
					rod(g, flat(coral, 0.25), 0, 0, 0, 31, 0.45, 0.12);
					rod(g, flat(cream), 0, 0, 0.1, 31, 0.09, 0.06);
				}
				this.laserGroups.push(g);
			}
		for (const p of this.particles) {
			p.age += dt;
			p.vy -= dt * 3;
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.y += p.vy * dt;
			p.mesh.rotation.z += dt * 5;
			p.mesh.scale.multiplyScalar(Math.max(0.92, 1 - dt * 0.8));
			if (p.age > p.life) this.fg.remove(p.mesh);
		}
		this.particles = this.particles.filter((p) => p.age < p.life);
		this.pulseAge += dt;
		if (this.pulseAge < 1.2) {
			this.pulseRing.visible = true;
			this.pulseRing.scale.setScalar(1 + this.pulseAge * 14);
			this.pulseRing.material.transparent = true;
			this.pulseRing.material.opacity = Math.max(0, 1 - this.pulseAge / 1.2);
		} else this.pulseRing.visible = false;
		const portrait = innerWidth < innerHeight,
			spanX =
				portrait && rescue && !title
					? 22
					: Math.max(35, (20 * innerWidth) / innerHeight),
			spanY = (spanX * innerHeight) / innerWidth;
		if (this.camera.right !== spanX / 2) {
			this.camera.left = -spanX / 2;
			this.camera.right = spanX / 2;
			this.camera.top = spanY / 2;
			this.camera.bottom = -spanY / 2;
			this.camera.updateProjectionMatrix();
		}
		this.shake = Math.max(0, this.shake - dt * 2);
		const power = this.settings.shake ? this.shake : 0;
		const follow =
			portrait && rescue && !title
				? Math.max(-6.5, Math.min(6.5, (s.x || 0) * 0.65))
				: 0;
		this.camera.position.x = follow + Math.sin(state.time * 85) * power * 0.15;
		this.camera.position.y = Math.cos(state.time * 77) * power * 0.12;
		this.camera.updateMatrixWorld();
		this.renderer.render(this.scene, this.camera);
		this.renderFrames++;
	}
}
