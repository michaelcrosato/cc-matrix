import { color, dot, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

export { THREE };

const C = {
	ink: 0x0b1026,
	cream: 0xf6e2b5,
	orange: 0xfb9769,
	teal: 0x81e5d6,
	purple: 0x7e5f9d,
	pink: 0xe57894,
	red: 0xe76e6c,
	gold: 0xedba78,
};
export class Graphics {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x11152d);
		this.scene.fog = new THREE.FogExp2(0x29213f, 0.0038);
		this.camera = new THREE.PerspectiveCamera(
			57,
			innerWidth / innerHeight,
			0.1,
			900,
		);
		this.camera.position.set(0, 7.5, 21);
		this.camera.lookAt(0, 1, -32);
		this.materials = new Map();
		this.mixers = [];
		this.particles = [];
		this.ghosts = new Map();
		this.terrain = new THREE.Group();
		this.space = new THREE.Group();
		this.fx = new THREE.Group();
		this.scene.add(this.terrain, this.space, this.fx);
		this.title = true;
		this.surface = true;
		this.shake = 0;
		this.t = 0;
		this.lastLook = new THREE.Vector3();
	}
	async init() {
		this.stage = "requesting renderer";
		this.renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: true,
			powerPreference: "high-performance",
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.setSize(innerWidth, innerHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.NoToneMapping;
		await this.renderer.init();
		this.stage = "creating procedural scene";
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL2 fallback";
		this.buildSky();
		this.buildTerrain();
		this.buildSpace();
		this.player = this.craft("player");
		this.scene.add(this.player);
		this.player.position.set(6, 1, -5);
		this.player.scale.setScalar(1.6);
		this.rival = this.craft("raider");
		this.rival.position.set(-8, 6, -37);
		this.rival.scale.setScalar(1.7);
		this.scene.add(this.rival);
		addEventListener("resize", () => this.resize());
		this.stage = "ready";
	}
	mat(hex, unlit = false, transparent = false) {
		const key = `${hex}_${unlit}_${transparent}`;
		if (this.materials.has(key)) return this.materials.get(key);
		const m = new THREE.MeshBasicNodeMaterial({
			color: hex,
			side: THREE.FrontSide,
		});
		if (!unlit) {
			const shade = dot(normalWorld, vec3(-0.5, 0.8, 0.6))
				.max(0)
				.mul(3)
				.floor()
				.div(3)
				.mul(0.63)
				.add(0.37);
			m.colorNode = color(hex).mul(shade);
		}
		if (transparent) {
			m.transparent = true;
			m.opacity = 0.5;
			m.depthWrite = false;
		}
		this.materials.set(key, m);
		return m;
	}
	mesh(
		geometry,
		hex,
		parent,
		position = [0, 0, 0],
		scale = [1, 1, 1],
		ink = true,
		unlit = false,
	) {
		const m = new THREE.Mesh(geometry, this.mat(hex, unlit));
		m.position.set(...position);
		m.scale.set(...scale);
		parent.add(m);
		if (ink) {
			this.outlineMat ??= new THREE.MeshBasicNodeMaterial({
				color: C.ink,
				side: THREE.BackSide,
			});
			const outline = new THREE.Mesh(geometry, this.outlineMat);
			outline.scale.setScalar(1.035);
			m.add(outline);
		}
		return m;
	}
	box(hex, parent, pos, scale, ink = true) {
		this.boxGeo ??= new THREE.BoxGeometry(1, 1, 1);
		return this.mesh(this.boxGeo, hex, parent, pos, scale, ink);
	}
	sphere(hex, parent, pos, scale, ink = true) {
		this.sphereGeo ??= new THREE.IcosahedronGeometry(1, 2);
		return this.mesh(this.sphereGeo, hex, parent, pos, scale, ink);
	}
	ring(hex, parent, pos, radius, tube = 0.06) {
		const r = this.mesh(
			new THREE.TorusGeometry(radius, tube, 5, 80),
			hex,
			parent,
			pos,
			[1, 1, 1],
			false,
			true,
		);
		return r;
	}
	wedge(points, thickness = 0.2) {
		const shape = new THREE.Shape();
		points.forEach(([x, z], i) => {
			if (i) shape.lineTo(x, -z);
			else shape.moveTo(x, -z);
		});
		shape.closePath();
		return new THREE.ExtrudeGeometry(shape, {
			depth: thickness,
			bevelEnabled: true,
			bevelThickness: 0.055,
			bevelSize: 0.035,
			bevelSegments: 1,
			steps: 1,
		}).rotateX(-Math.PI / 2);
	}
	craft(kind = "player") {
		const root = new THREE.Group(),
			roll = new THREE.Group(),
			hull = new THREE.Group();
		roll.name = "Roll";
		roll.add(hull);
		root.add(roll);
		root.userData.kind = kind;
		const enemy = kind !== "player" && kind !== "ghost",
			base = enemy ? C.red : C.cream,
			accent = enemy ? 0x682d57 : C.orange;
		const wing = this.wedge(
			[
				[-2.7, 1.8],
				[-0.8, -0.5],
				[0, -3.2],
				[0.8, -0.5],
				[2.7, 1.8],
				[0.5, 1.35],
				[0, 1.8],
				[-0.5, 1.35],
			],
			0.18,
		);
		this.mesh(wing, base, hull, [0, 0, 0]);
		this.mesh(
			this.wedge(
				[
					[-0.48, 1.6],
					[-0.32, -2.4],
					[0, -3.1],
					[0.32, -2.4],
					[0.48, 1.6],
				],
				0.65,
			),
			enemy ? 0xb95569 : 0x315668,
			hull,
			[0, 0.12, 0],
		);
		this.sphere(
			enemy ? 0xf3a768 : 0x7fe3d2,
			hull,
			[0, 0.72, -0.75],
			[0.3, 0.23, 0.8],
		);
		for (const s of [-1, 1]) {
			const stripe = this.box(
				accent,
				hull,
				[s * 1.5, 0.23, 1.05],
				[1.35, 0.08, 0.2],
			);
			stripe.rotation.y = s * -0.45;
			this.box(C.ink, hull, [s * 2.05, 0.23, 1.3], [0.1, 0.12, 0.7], false);
			this.box(base, hull, [s * 0.85, 0.35, 1.3], [0.5, 0.7, 1.2]);
			const eng = this.mesh(
				new THREE.CylinderGeometry(0.25, 0.3, 0.35, 10),
				C.ink,
				hull,
				[s * 0.85, 0.37, 2],
				[1, 1, 1],
			);
			eng.rotation.x = Math.PI / 2;
			const port = this.mesh(
				new THREE.CircleGeometry(0.2, 10),
				C.teal,
				hull,
				[s * 0.85, 0.37, 2.19],
				[1, 1, 1],
				false,
				true,
			);
			port.rotation.y = Math.PI;
			const flame = this.mesh(
				new THREE.ConeGeometry(0.22, 2.2, 6),
				enemy ? 0xf39d84 : C.teal,
				hull,
				[s * 0.85, 0.37, 3.05],
				[1, 1, 1],
				false,
				true,
			);
			flame.name = `Flame${s === -1 ? "L" : "R"}`;
			flame.rotation.x = Math.PI / 2;
			const fin = this.box(
				accent,
				hull,
				[s * 0.86, 0.95, 1.4],
				[0.1, 1.1, 0.8],
			);
			fin.rotation.z = s * 0.1;
			const _gun = this.box(
				C.ink,
				hull,
				[s * 1.95, 0.2, 0.65],
				[0.12, 0.12, 1.25],
				false,
			);
			this.box(C.gold, hull, [s * 1.95, 0.22, -0.01], [0.16, 0.16, 0.3], false);
		}
		if (enemy) {
			hull.rotation.y = Math.PI;
			root.scale.setScalar(0.65);
		}
		if (kind === "ghost")
			root.traverse((o) => {
				if (o.isMesh) {
					o.material = this.mat(0x70c4d7, true, true);
				}
			});
		const mixer = new THREE.AnimationMixer(root);
		const flameTracks = ["FlameL", "FlameR"].map(
			(n) =>
				new THREE.VectorKeyframeTrack(
					`${n}.scale`,
					[0, 0.12, 0.24, 0.36],
					[1, 1, 1, 0.75, 1.3, 0.75, 1.15, 0.8, 1.15, 1, 1, 1],
				),
		);
		mixer
			.clipAction(new THREE.AnimationClip("Afterburn", 0.36, flameTracks))
			.play();
		const rollAction = mixer.clipAction(
			new THREE.AnimationClip("Barrel Roll", 0.65, [
				new THREE.NumberKeyframeTrack(
					"Roll.rotation[z]",
					[0, 0.12, 0.3, 0.5, 0.65],
					[0, -0.4, -Math.PI, -5.8, -Math.PI * 2],
				),
			]),
		);
		rollAction.setLoop(THREE.LoopOnce, 1);
		root.userData.rollAction = rollAction;
		root.userData.mixer = mixer;
		root.userData.hull = hull;
		this.mixers.push(mixer);
		return root;
	}
	enemy(kind) {
		if (kind === "raider" || kind === "cobra") {
			const g = this.craft("raider");
			if (kind === "cobra") {
				g.scale.setScalar(0.9);
				const crown = this.box(C.gold, g, [0, 1, 0], [2, 0.14, 0.4]);
				crown.rotation.z = 0.1;
			}
			return g;
		}
		if (kind === "boss") return this.boss();
		const g = new THREE.Group();
		g.name = "Mech";
		this.sphere(0xb27bb2, g, [0, 0, 0], [1.3, 0.85, 0.7]);
		this.box(C.ink, g, [0, 0, 0.75], [1.4, 0.26, 0.2]);
		this.box(C.orange, g, [0, 0, 0.89], [0.75, 0.12, 0.08], false);
		for (const s of [-1, 1]) {
			const arm = new THREE.Group();
			arm.name = s < 0 ? "ArmL" : "ArmR";
			arm.position.x = s * 1.25;
			g.add(arm);
			this.box(0xcb829d, arm, [s * 0.5, -0.3, 0], [1, 0.3, 0.6]);
			this.box(C.gold, arm, [s * 0.95, -0.1, 0.3], [0.28, 0.8, 0.4]);
		}
		const mixer = new THREE.AnimationMixer(g);
		mixer
			.clipAction(
				new THREE.AnimationClip("Threaten", 1.4, [
					new THREE.NumberKeyframeTrack(
						"ArmL.rotation[z]",
						[0, 0.7, 1.4],
						[-0.2, 0.5, -0.2],
					),
					new THREE.NumberKeyframeTrack(
						"ArmR.rotation[z]",
						[0, 0.7, 1.4],
						[0.2, -0.5, 0.2],
					),
				]),
			)
			.play();
		g.userData.mixer = mixer;
		this.mixers.push(mixer);
		return g;
	}
	boss() {
		const g = new THREE.Group();
		g.rotation.x = 0.22;
		this.mesh(
			this.wedge(
				[
					[-9, 1],
					[-6, -2],
					[-2, -1],
					[0, -4],
					[2, -1],
					[6, -2],
					[9, 1],
					[6, 4],
					[2, 3],
					[-2, 3],
					[-6, 4],
				],
				1.6,
			),
			0x7f527c,
			g,
			[0, 0, 0],
		);
		this.box(0x996481, g, [0, 1.5, 0], [5.3, 3.5, 4.6]);
		this.box(0xc98a92, g, [0, 3.3, -0.5], [3, 1.5, 2.8]);
		this.box(0x16192f, g, [0, 3.4, 1.1], [2.8, 0.45, 0.15]);
		this.box(C.gold, g, [0, 3.4, 1.21], [1.9, 0.14, 0.1], false);
		for (const s of [-1, 1]) {
			this.sphere(0x8e587a, g, [s * 5, 1.2, 1], [3.3, 2.2, 2.1]);
			this.box(0xd08c96, g, [s * 5, 2.5, 1], [3, 0.4, 2.5]);
			for (let i = 0; i < 4; i++)
				this.box(
					C.gold,
					g,
					[s * (3.8 + i * 0.7), 1.3, 3],
					[0.12, 0.8, 0.1],
					false,
				);
			this.box(0x332f4e, g, [s * 8, 1.5, 0], [1.4, 3.5, 2]);
			this.box(C.orange, g, [s * 8, 1.6, 1.1], [0.5, 1.4, 0.2]);
		}
		this.box(0xa56680, g, [0, 1.3, 0.4], [4, 1.2, 4]);
		this.box(C.ink, g, [0, 1.6, 2.5], [2.9, 0.5, 0.2]);
		const core = this.sphere(C.orange, g, [0, 0.8, 3.3], [1.15, 1.15, 0.5]);
		core.name = "Core";
		for (const s of [-1, 1]) {
			this.box(0xcd8a99, g, [s * 5.5, 0.7, 1], [2.5, 0.75, 2.7]);
			this.box(C.gold, g, [s * 7.7, 0.1, 1.8], [0.45, 0.4, 3]);
			this.box(C.ink, g, [s * 7.7, 0.1, 3.35], [0.6, 0.6, 0.3]);
			this.ring(C.red, g, [s * 5.5, 1.15, 1], 0.9, 0.1).rotation.x =
				Math.PI / 2;
			this.box(C.orange, g, [s * 3.4, 1, 1.7], [0.3, 0.4, 2]);
		}
		const mixer = new THREE.AnimationMixer(g);
		mixer
			.clipAction(
				new THREE.AnimationClip("Reactor", 1.3, [
					new THREE.VectorKeyframeTrack(
						"Core.scale",
						[0, 0.65, 1.3],
						[1.15, 1.15, 0.5, 1.4, 1.4, 0.7, 1.15, 1.15, 0.5],
					),
				]),
			)
			.play();
		g.userData.mixer = mixer;
		this.mixers.push(mixer);
		return g;
	}
	cadet() {
		const g = new THREE.Group();
		this.sphere(C.cream, g, [0, 0.3, 0], [0.25, 0.25, 0.25]);
		this.box(C.teal, g, [0, -0.1, 0], [0.4, 0.5, 0.3]);
		this.box(C.ink, g, [0, 0.32, 0.2], [0.3, 0.1, 0.1], false);
		for (const s of [-1, 1]) {
			const arm = this.box(C.orange, g, [s * 0.35, 0.1, 0], [0.16, 0.5, 0.16]);
			arm.name = s < 0 ? "LeftWave" : "RightWave";
			arm.rotation.z = s * -0.8;
			this.box(C.cream, g, [s * 0.13, -0.5, 0], [0.14, 0.45, 0.17]);
		}
		const r = this.ring(C.teal, g, [0, -0.8, 0], 1.1, 0.045);
		r.rotation.x = -Math.PI / 2;
		const beam = this.mesh(
			new THREE.CylinderGeometry(0.025, 0.025, 5, 6),
			C.teal,
			g,
			[0, 2, 0],
			[1, 1, 1],
			false,
			true,
		);
		beam.material = this.mat(C.teal, true, true);
		const mixer = new THREE.AnimationMixer(g);
		mixer
			.clipAction(
				new THREE.AnimationClip("Hey You", 0.8, [
					new THREE.NumberKeyframeTrack(
						"LeftWave.rotation[z]",
						[0, 0.4, 0.8],
						[-0.8, -1.8, -0.8],
					),
					new THREE.NumberKeyframeTrack(
						"RightWave.rotation[z]",
						[0, 0.4, 0.8],
						[0.8, 1.8, 0.8],
					),
				]),
			)
			.play();
		g.userData.mixer = mixer;
		this.mixers.push(mixer);
		return g;
	}
	pickup(kind) {
		const g = new THREE.Group();
		if (kind === "cadet") return this.cadet();
		if (kind === "key") {
			this.mesh(new THREE.OctahedronGeometry(0.7), C.gold, g);
			const r = this.ring(C.gold, g, [0, 0, 0], 1.1);
			r.rotation.y = 0.5;
		} else this.mesh(new THREE.OctahedronGeometry(0.4), C.teal, g);
		return g;
	}
	gate(open = false) {
		const g = new THREE.Group();
		for (const s of [-1, 1]) {
			this.box(0x49395e, g, [s * 10, 0, 0], [3, 15, 3]);
			this.box(C.gold, g, [s * 8.3, 0, 1.6], [0.25, 13, 0.3]);
		}
		this.box(0x49395e, g, [0, 7, 0], [20, 2, 3]);
		this.box(C.gold, g, [0, 6, 1.6], [16, 0.16, 0.25]);
		const bars = new THREE.Group();
		bars.name = "IonBars";
		g.add(bars);
		for (let i = -7; i <= 7; i += 2)
			this.box(open ? C.teal : C.red, bars, [i, 0, 0], [0.12, 12, 0.1], false);
		const mixer = new THREE.AnimationMixer(g);
		const action = mixer.clipAction(
			new THREE.AnimationClip("Ion Doors Open", 0.7, [
				new THREE.VectorKeyframeTrack(
					"IonBars.scale",
					[0, 0.7],
					[1, 1, 1, 1, 0.001, 1],
				),
			]),
		);
		action.setLoop(THREE.LoopOnce, 1);
		action.clampWhenFinished = true;
		g.userData.openAction = action;
		g.userData.mixer = mixer;
		this.mixers.push(mixer);
		return g;
	}
	dock() {
		const g = new THREE.Group();
		this.box(0x315665, g, [0, -3, 0], [16, 2, 12]);
		for (const s of [-1, 1]) {
			this.box(C.cream, g, [s * 6, 1, 0], [2, 8, 7]);
			this.box(C.teal, g, [s * 4.8, 1, 4], [0.2, 7, 0.15]);
		}
		this.box(C.cream, g, [0, 5, 0], [14, 1.5, 7]);
		this.box(C.orange, g, [0, 4.2, 3.7], [5, 0.15, 0.2]);
		for (let i = 0; i < 5; i++)
			this.box(C.teal, g, [0, -1.95, 4 - i * 2], [0.3, 0.1, 0.9], false);
		return g;
	}
	bolt(enemy = false) {
		const g = new THREE.Group();
		this.boltGeo ??= new THREE.CylinderGeometry(0.07, 0.07, 1.7, 5);
		this.mesh(
			this.boltGeo,
			enemy ? C.red : C.teal,
			g,
			[0, 0, 0],
			[1, 1, 1],
			false,
			true,
		).rotation.x = Math.PI / 2;
		this.sphere(
			enemy ? C.orange : C.cream,
			g,
			[0, 0, -0.3],
			[0.11, 0.11, 0.38],
			false,
		);
		return g;
	}
	buildSky() {
		const positions = [],
			colors = [];
		for (let i = 0; i < 1500; i++) {
			positions.push(
				(Math.random() - 0.5) * 900,
				(Math.random() - 0.35) * 500,
				-120 - Math.random() * 650,
			);
			const c = new THREE.Color(
				i % 5 === 0 ? 0xf8bd88 : i % 3 === 0 ? 0x7189c4 : 0xc4c6d5,
			);
			colors.push(c.r, c.g, c.b);
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		this.stars = new THREE.Points(
			geo,
			new THREE.PointsMaterial({
				size: 0.8,
				sizeAttenuation: true,
				vertexColors: true,
				fog: false,
			}),
		);
		this.scene.add(this.stars);
		this.planet = new THREE.Group();
		this.planet.position.set(36, 29, -150);
		this.scene.add(this.planet);
		this.sphere(0xd9ad83, this.planet, [0, 0, 0], [22, 22, 22]);
		for (let i = 0; i < 10; i++) {
			const y = -17 + i * 3.6,
				r = Math.sqrt(22 * 22 - y * y);
			const band = this.mesh(
				new THREE.TorusGeometry(r, 0.15, 3, 96),
				i % 2 === 0 ? 0xab7e79 : 0xf4c896,
				this.planet,
				[0, y, 0],
				[1, 1, 1],
				false,
				true,
			);
			band.rotation.x = Math.PI / 2;
		}
		const rings = new THREE.Group();
		rings.rotation.set(-1.12, 0.25, -0.35);
		this.planet.add(rings);
		for (let i = 0; i < 7; i++) {
			const r = this.mesh(
				new THREE.RingGeometry(29 + i * 1.4, 30 + i * 1.4, 128),
				i % 3 === 0 ? 0x574668 : i % 2 === 0 ? 0xd9b69b : 0x9a8291,
				rings,
				[0, 0, 0],
				[1, 1, 1],
				false,
				true,
			);
			r.material = r.material.clone();
			r.material.side = THREE.DoubleSide;
		}
		this.moon = this.sphere(
			0x71628d,
			this.scene,
			[-42, 17, -170],
			[10, 10, 10],
		);
		for (let i = 0; i < 7; i++) {
			const cloud = new THREE.Mesh(
				new THREE.SphereGeometry(1, 32, 16),
				new THREE.MeshBasicNodeMaterial({
					color: i % 2 ? 0x514062 : 0x343054,
					transparent: true,
					opacity: 0.05,
					depthWrite: false,
					side: THREE.BackSide,
				}),
			);
			cloud.position.set(-110 + i * 30, 20 + (i % 3) * 15, -270);
			cloud.scale.set(100, 18, 28);
			this.scene.add(cloud);
		}
	}
	buildTerrain() {
		this.mesh(
			new THREE.PlaneGeometry(900, 900),
			0x504064,
			this.terrain,
			[0, -5.3, -270],
			[1, 1, 1],
			false,
			true,
		).rotation.x = -Math.PI / 2;
		this.stripes = [];
		for (let i = 0; i < 65; i++) {
			const stripe = this.box(
				i % 5 === 0 ? 0xa478a5 : i % 2 === 0 ? 0x7b5b8f : 0x604a78,
				this.terrain,
				[0, -5.25, -i * 5.5],
				[400, 0.035, i % 5 === 0 ? 0.16 : 0.065],
				false,
			);
			this.stripes.push(stripe);
		}
		for (let i = -12; i <= 12; i++) {
			this.box(
				0x78608b,
				this.terrain,
				[i * 12, -5.24, -160],
				[0.04, 0.02, 420],
				false,
			);
		}
		this.mountains = [];
		for (let i = 0; i < 58; i++) {
			const x = (i % 2 ? 1 : -1) * (23 + Math.random() * 150),
				z = -Math.random() * 390;
			const h = 3 + Math.random() * 24;
			const m = this.mesh(
				new THREE.ConeGeometry(5 + Math.random() * 11, h, 4),
				i % 4 ? 0x4c3d69 : 0x7a5c86,
				this.terrain,
				[x, h / 2 - 5.3, z],
				[1, 1, 1],
			);
			m.rotation.y = Math.random() * 6;
			this.mountains.push(m);
		}
		this.ridges = [];
		for (let i = 0; i < 26; i++) {
			const m = this.mesh(
				new THREE.ConeGeometry(5 + Math.random() * 8, 3 + Math.random() * 8, 5),
				0x4a3c61,
				this.terrain,
				[(i - 13) * 15, 0, -275],
				[1, 1, 1],
				false,
			);
			this.ridges.push(m);
		}
	}
	buildSpace() {
		this.rocks = [];
		for (let i = 0; i < 70; i++) {
			const s = 0.5 + Math.random() * 2;
			const m = this.mesh(
				new THREE.DodecahedronGeometry(s),
				i % 3 === 0 ? 0xc18a8a : 0x5a5677,
				this.space,
				[
					(i % 2 ? 1 : -1) * (15 + Math.random() * 70),
					-10 + Math.random() * 35,
					-Math.random() * 310,
				],
				[1, 1, 1],
			);
			m.rotation.set(Math.random(), Math.random(), Math.random());
			this.rocks.push(m);
		}
		this.tunnel = new THREE.Group();
		this.tunnel.visible = false;
		this.scene.add(this.tunnel);
		this.tunnelRings = [];
		for (let i = 0; i < 35; i++) {
			const ring = this.ring(
				i % 3 ? 0x7f6eb2 : C.teal,
				this.tunnel,
				[0, 0, -i * 9],
				12,
				0.1 + (i % 3) * 0.06,
			);
			ring.rotation.z = i * 0.2;
			this.tunnelRings.push(ring);
		}
		this.corridor = new THREE.Group();
		this.corridor.visible = false;
		this.scene.add(this.corridor);
		for (const s of [-1, 1]) {
			this.box(0x312c4c, this.corridor, [s * 12, -0.4, -130], [3, 13, 340]);
			for (let i = 0; i < 35; i++) {
				this.box(
					i % 4 === 0 ? C.orange : 0x9779a9,
					this.corridor,
					[s * 10.45, 0, -i * 10],
					[0.15, 12, 0.15],
					false,
				);
			}
		}
	}
	mode(type) {
		this.title = type === "title";
		this.surface = ["title", "rescue", "dock", "boss"].includes(type);
		this.terrain.visible = this.surface;
		this.space.visible = !this.surface;
		this.tunnel.visible = type === "warp" || type === "wormhole";
		this.corridor.visible = type === "corridor";
		this.player.visible = true;
		this.rival.visible = this.title;
		this.player.scale.setScalar(this.title ? 1.8 : 0.72);
		this.planet.visible = type !== "wormhole" && type !== "warp";
		this.moon.visible = this.planet.visible;
		this.scene.fog.color.set(
			type === "wormhole" ? 0x181938 : this.surface ? 0x3d2c4d : 0x171b36,
		);
		this.scene.background.set(this.surface ? 0x17162f : 0x10162c);
	}
	burst(pos, hex = C.orange, count = 22) {
		this.particleGeo ??= new THREE.OctahedronGeometry(0.16);
		for (let i = 0; i < count; i++) {
			const mesh = this.mesh(
				this.particleGeo,
				i % 3 ? hex : C.cream,
				this.fx,
				[pos.x, pos.y, pos.z],
				[1, 1, 1],
				false,
				true,
			);
			const life = 0.35 + Math.random() * 0.65;
			this.particles.push({
				mesh,
				life,
				max: life,
				vel: new THREE.Vector3(
					(Math.random() - 0.5) * 14,
					(Math.random() - 0.5) * 12,
					(Math.random() - 0.5) * 15,
				),
			});
		}
		const ring = this.ring(hex, this.fx, [pos.x, pos.y, pos.z], 0.4, 0.035);
		this.particles.push({
			mesh: ring,
			life: 0.5,
			max: 0.5,
			ring: true,
			vel: new THREE.Vector3(),
		});
	}
	pulse(pos) {
		const ring = this.ring(C.teal, this.fx, [pos.x, pos.y, pos.z], 1, 0.1);
		this.particles.push({
			mesh: ring,
			life: 0.9,
			max: 0.9,
			ring: true,
			pulse: true,
			vel: new THREE.Vector3(0, 0, -15),
		});
		this.shake = 0.08;
	}
	remove(g) {
		if (!g) return;
		g.removeFromParent();
		const mixer = g.userData.mixer;
		if (mixer) {
			mixer.stopAllAction();
			mixer.uncacheRoot(g);
			this.mixers = this.mixers.filter((m) => m !== mixer);
		}
	}
	ghost(id, data) {
		let g = this.ghosts.get(id);
		if (!g) {
			g = this.craft("ghost");
			g.scale.setScalar(0.7);
			this.scene.add(g);
			this.ghosts.set(id, g);
		}
		g.visible = data.visible;
		if (g.visible) {
			g.position.lerp(new THREE.Vector3(data.x, data.y, data.z ?? -3), 0.3);
			g.rotation.z = data.bank ?? 0;
		}
	}
	clearGhosts() {
		for (const g of this.ghosts.values()) this.remove(g);
		this.ghosts.clear();
	}
	project(pos) {
		const p = pos.clone().project(this.camera);
		return {
			x: (p.x * 0.5 + 0.5) * innerWidth,
			y: (-0.5 * p.y + 0.5) * innerHeight,
			visible: p.z < 1,
		};
	}
	resize() {
		this.camera.aspect = innerWidth / innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(innerWidth, innerHeight);
	}
	update(dt, state) {
		this.t += dt;
		for (const m of this.mixers) m.update(dt);
		const speed = state?.speed ?? 14;
		for (const s of this.stripes) {
			s.position.z += speed * dt;
			if (s.position.z > 28) s.position.z -= 357.5;
		}
		for (const m of this.mountains) {
			m.position.z += speed * dt;
			if (m.position.z > 60) m.position.z -= 430;
		}
		for (const m of this.rocks) {
			m.position.z += speed * dt * 0.7;
			m.rotation.x += dt * 0.08;
			m.rotation.z += dt * 0.06;
			if (m.position.z > 45) m.position.z -= 360;
		}
		for (const [i, r] of this.tunnelRings.entries()) {
			r.position.z += dt * (state?.warp ? 150 : 45);
			r.rotation.z += dt * 0.13;
			if (r.position.z > 28) r.position.z -= 315;
			r.scale.setScalar(1 + Math.sin(this.t + i * 0.4) * 0.12);
		}
		this.stars.rotation.z = Math.sin(this.t * 0.03) * 0.02;
		this.planet.rotation.y += dt * 0.006;
		if (this.title) {
			this.player.position.set(
				7.2 + Math.sin(this.t * 0.45) * 1.5,
				0.7 + Math.sin(this.t * 0.6) * 0.6,
				-5,
			);
			this.player.rotation.set(
				0.04,
				Math.sin(this.t * 0.24) * 0.12,
				-0.18 + Math.sin(this.t * 0.45) * 0.1,
			);
			this.rival.position.x = -8 + Math.sin(this.t * 0.3) * 6;
			this.rival.position.y = 3 + Math.sin(this.t * 0.5) * 2;
			this.rival.rotation.z = Math.sin(this.t * 0.4) * 0.3;
		}
		const targetX = this.title ? 0 : (state?.x ?? 0) * 0.12;
		const targetY = this.title ? 8 : 7 + (state?.y ?? 0) * 0.1;
		this.camera.position.x = THREE.MathUtils.damp(
			this.camera.position.x,
			targetX,
			3,
			dt,
		);
		this.camera.position.y = THREE.MathUtils.damp(
			this.camera.position.y,
			targetY,
			3,
			dt,
		);
		this.camera.position.z = THREE.MathUtils.damp(
			this.camera.position.z,
			state?.boost ? 23 : 21,
			2,
			dt,
		);
		this.shake = Math.max(0, this.shake - dt * 0.7);
		if (this.shake && state?.shake !== false) {
			this.camera.position.x += (Math.random() - 0.5) * this.shake;
			this.camera.position.y += (Math.random() - 0.5) * this.shake;
		}
		this.camera.lookAt(targetX * 0.7, 1, -32);
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			if (p.life <= 0) {
				p.mesh.removeFromParent();
				this.particles.splice(i, 1);
				continue;
			}
			p.mesh.position.addScaledVector(p.vel, dt);
			p.mesh.scale.setScalar(
				p.ring
					? 1 + (1 - p.life / p.max) * (p.pulse ? 23 : 7)
					: Math.max(0.05, p.life / p.max),
			);
			if (!p.ring) p.mesh.rotation.x += dt * 5;
		}
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
}
