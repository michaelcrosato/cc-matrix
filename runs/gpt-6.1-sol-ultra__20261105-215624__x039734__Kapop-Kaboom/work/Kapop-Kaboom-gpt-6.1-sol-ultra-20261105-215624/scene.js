import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

const C = {
	ink: 0x243340,
	cream: 0xf5e9ce,
	paper: 0xfff3d7,
	coral: 0xeb7159,
	mint: 0x61c5b1,
	teal: 0x278f88,
	navy: 0x354d60,
	gold: 0xf7bd50,
	rose: 0xd9a08b,
	blue: 0x85b8bf,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let seed = 281;
const rnd = () => {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
};

export class GameScene {
	constructor() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(C.cream);
		this.bombMeshes = new Map();
		this.playerGroups = [];
		this.particles = [];
		this.rings = [];
		this.time = 0;
		this.materials = new Map();
		this.lastThrow = 0;
		this.lastCatch = [0, 0, 0, 0];
		this.mixers = [];
		this.shake = 0;
		this.ready = false;
		this.renderCount = 0;
		this.animCount = 0;
	}
	async init(container) {
		this.container = container;
		this.renderer = new THREE.WebGPURenderer({
			antialias: true,
			alpha: false,
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.setClearColor(C.cream, 1);
		container.appendChild(this.renderer.domElement);
		this.renderer.domElement.setAttribute(
			"aria-label",
			"Kapop: an inked rooftop bomb-catching arcade diorama",
		);
		await this.renderer.init();
		this.camera = new THREE.OrthographicCamera(-12, 12, 15, -2, 0.1, 100);
		this.camera.position.set(0, 8.2, 30);
		this.camera.lookAt(0, 6.3, 0);
		this.scene.add(new THREE.HemisphereLight(0xfff6dc, 0x6d8c99, 2));
		const key = new THREE.DirectionalLight(0xffe4b0, 3);
		key.position.set(-8, 16, 12);
		this.scene.add(key);
		this.buildStage();
		this.buildBomber();
		this.buildPlayers();
		this.resize();
		this.ready = true;
		return this;
	}
	mat(hex, unlit = false) {
		const id = `${hex}-${unlit}`;
		if (this.materials.has(id)) return this.materials.get(id);
		let m;
		if (unlit) m = new THREE.MeshBasicMaterial({ color: hex });
		else {
			m = new THREE.MeshBasicNodeMaterial();
			const bands = normalWorld
				.dot(vec3(-0.35, 0.72, 0.6))
				.mul(0.5)
				.add(0.5)
				.mul(3)
				.floor()
				.div(3)
				.mul(0.35)
				.add(0.65);
			m.colorNode = color(hex).mul(bands);
		}
		this.materials.set(id, m);
		return m;
	}
	mesh(geo, col, parent = this.scene, ink = true) {
		const m = new THREE.Mesh(geo, this.mat(col));
		parent.add(m);
		if (ink) {
			const o = new THREE.Mesh(
				geo,
				new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide }),
			);
			o.scale.setScalar(1.045);
			m.add(o);
		}
		return m;
	}
	box(w, h, d, x, y, z, col, parent = this.scene, ink = true) {
		const m = this.mesh(new THREE.BoxGeometry(w, h, d), col, parent, ink);
		m.position.set(x, y, z);
		return m;
	}
	sphere(r, x, y, z, col, parent = this.scene, ink = true) {
		const m = this.mesh(new THREE.SphereGeometry(r, 16, 12), col, parent, ink);
		m.position.set(x, y, z);
		return m;
	}
	cylinder(
		rt,
		rb,
		h,
		x,
		y,
		z,
		col,
		parent = this.scene,
		ink = true,
		segments = 24,
	) {
		const m = this.mesh(
			new THREE.CylinderGeometry(rt, rb, h, segments),
			col,
			parent,
			ink,
		);
		m.position.set(x, y, z);
		return m;
	}
	line(points, col = C.ink, width = 1, parent = this.scene) {
		const geo = new THREE.BufferGeometry().setFromPoints(
			points.map((v) => new THREE.Vector3(...v)),
		);
		const m = new THREE.Line(
			geo,
			new THREE.LineBasicMaterial({ color: col, linewidth: width }),
		);
		parent.add(m);
		return m;
	}
	text(
		label,
		x,
		y,
		z,
		{
			width = 4,
			height = 0.8,
			fg = "#243340",
			bg = null,
			rotate = 0,
			font = "900",
		} = {},
		parent = this.scene,
	) {
		const canvas = document.createElement("canvas");
		canvas.width = 1024;
		canvas.height = Math.round((1024 * height) / width);
		const ctx = canvas.getContext("2d");
		if (bg) {
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		ctx.fillStyle = fg;
		ctx.font = `${font} ${Math.round(canvas.height * 0.79)}px "Trebuchet MS",sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, 512, canvas.height / 2, 980);
		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(width, height),
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
	ellipse(rx, ry, x, y, z, col, opacity = 1, parent = this.scene) {
		const m = new THREE.Mesh(
			new THREE.CircleGeometry(1, 40),
			new THREE.MeshBasicMaterial({
				color: col,
				transparent: opacity < 1,
				opacity,
				depthWrite: opacity >= 1,
			}),
		);
		m.scale.set(rx, ry, 1);
		m.position.set(x, y, z);
		parent.add(m);
		return m;
	}
	buildStage() {
		const bg = new THREE.Group();
		this.scene.add(bg);
		// The paper texture is drawn in code; faint print-grain gives the whole set a physical feel.
		const paper = document.createElement("canvas");
		paper.width = 512;
		paper.height = 512;
		const p = paper.getContext("2d");
		p.fillStyle = "#f6eacf";
		p.fillRect(0, 0, 512, 512);
		for (let i = 0; i < 4200; i++) {
			p.fillStyle = i % 2 ? "rgba(89,77,62,.035)" : "rgba(255,255,255,.10)";
			p.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1);
		}
		const tx = new THREE.CanvasTexture(paper);
		tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
		tx.repeat.set(4, 3);
		tx.colorSpace = THREE.SRGBColorSpace;
		const back = new THREE.Mesh(
			new THREE.PlaneGeometry(38, 27),
			new THREE.MeshBasicMaterial({ map: tx }),
		);
		back.position.set(0, 8, -6);
		bg.add(back);
		// A large setting sun and softly printed skyline sit behind the clear playfield.
		this.ellipse(4.6, 4.6, 5.5, 10, -5.8, 0xf2ce9d);
		for (let i = 0; i < 11; i++) {
			const x = -16 + i * 3.0;
			const h = 3 + rnd() * 5;
			this.box(2.7, h, 0.2, x, 1 + h / 2, -5.3, 0xe2d3bc, bg, false);
			this.box(2.95, 0.24, 0.35, x, 1 + h, -5.2, 0xc5b7a7, bg, false);
			for (let k = 0; k < 2; k++)
				for (let r = 0; r < Math.floor(h / 1.5); r++)
					this.box(
						0.28,
						0.5,
						0.05,
						x - 0.65 + k * 1.2,
						1.7 + r * 1.4,
						-5.1,
						0xc8bdaa,
						bg,
						false,
					);
		}
		// Balcony spanning the roof. Only the rails lie behind the bombs.
		this.box(17.6, 0.38, 1.6, 0, 10.62, -0.2, C.coral);
		this.box(18, 0.13, 1.78, 0, 10.86, -0.2, C.paper);
		this.box(17.8, 0.16, 0.32, 0, 10.36, 0.65, C.ink, this.scene, false);
		for (let x = -8.6; x < 9; x += 0.64) {
			this.box(0.065, 0.83, 0.07, x, 11.32, -0.62, C.navy);
			this.sphere(0.065, x, 11.74, -0.62, C.gold, this.scene, false);
		}
		this.box(17.6, 0.08, 0.09, 0, 11.74, -0.62, C.navy);
		// Finely ruled playfield: floor and faint plumb-lines read as a stage, not a flat HUD.
		this.box(27, 0.6, 6.0, 0, -0.58, -0.7, C.rose);
		this.box(26, 0.15, 5.6, 0, -0.23, -0.55, 0xf0c9a2);
		for (let x = -13; x <= 13; x += 1.35)
			this.line(
				[
					[x, -0.14, -3],
					[x, -0.14, 2.3],
				],
				0xcc9f86,
			);
		for (let z = -2.6; z < 2.5; z += 1.1)
			this.line(
				[
					[-13, -0.14, z],
					[13, -0.14, z],
				],
				0xcc9f86,
			);
		this.box(19.0, 0.16, 0.14, 0, 0.05, -0.8, C.ink, this.scene, false);
		// Curved washed-up puddles.
		for (let i = 0; i < 6; i++) {
			const m = this.ellipse(
				0.45 + rnd() * 0.5,
				0.13,
				-8 + rnd() * 16,
				0.04,
				1.2 + rnd() * 0.2,
				C.teal,
				0.22,
			);
			m.rotation.x = -Math.PI / 2;
		}
		this.buildBuilding(-10.6, false);
		this.buildBuilding(10.6, true);
		// Worn carnival signs suspended beneath the gallery.
		this.box(4.65, 0.84, 0.12, 0, 9.83, -1.3, C.paper);
		this.text("BUCKET BRIGADE", 0, 9.83, -1.21, {
			width: 4.38,
			height: 0.57,
			size: 94,
		});
		this.text("NO BOOMS. JUST BLOOMS.", 0, 9.14, -2.1, {
			width: 4.65,
			height: 0.45,
			size: 72,
			fg: "#a79279",
		});
		for (const x of [-2.1, 2.1]) {
			this.line(
				[
					[x, 10.45, -1.3],
					[x, 10.05, -1.3],
				],
				C.ink,
			);
			this.sphere(0.048, x, 10.05, -1.18, C.gold);
		}
		// Strings and flags arch over the courtyard.
		const flagColors = [C.coral, C.mint, C.gold, C.paper];
		for (const side of [-1, 1]) {
			const pts = [];
			for (let i = 0; i <= 20; i++) {
				const x = side * (2.8 + i * 0.47),
					y = 13.1 + ((i - 10) / 10) ** 2 * 0.72;
				pts.push([x, y, -2]);
			}
			this.line(pts, C.ink);
			for (let i = 0; i < 19; i++) {
				const x = side * (3.1 + i * 0.47),
					y = 13.1 + ((i - 10) / 10) ** 2 * 0.72;
				const geo = new THREE.BufferGeometry();
				geo.setAttribute(
					"position",
					new THREE.Float32BufferAttribute(
						[-0.22, 0, 0, 0, -0.6, 0, 0.22, 0, 0],
						3,
					),
				);
				geo.computeVertexNormals();
				const f = this.mesh(geo, flagColors[i % 4], this.scene, false);
				f.position.set(x, y, -1.95);
				const clip = new THREE.AnimationClip("flag", 2.4, [
					new THREE.NumberKeyframeTrack(
						".rotation[y]",
						[0, 1.2, 2.4],
						[-0.3, 0.3, -0.3],
					),
				]);
				const mix = new THREE.AnimationMixer(f);
				mix.clipAction(clip).play();
				this.mixers.push(mix);
				this.animCount++;
			}
		}
		// A proper gallery clock.
		this.cylinder(0.53, 0.53, 0.11, -7.5, 12.4, -0.42, C.ink).rotation.x =
			Math.PI / 2;
		this.ellipse(0.46, 0.46, -7.5, 12.4, -0.33, C.paper);
		for (let i = 0; i < 12; i++) {
			const a = (i * Math.PI) / 6;
			this.sphere(
				0.025,
				-7.5 + Math.sin(a) * 0.37,
				12.4 + Math.cos(a) * 0.37,
				-0.27,
				C.ink,
				this.scene,
				false,
			);
		}
		this.line(
			[
				[-7.5, 12.65, -0.22],
				[-7.5, 12.4, -0.22],
				[-7.26, 12.28, -0.22],
			],
			C.ink,
		);
		this.text("EST. 1981", 7.2, 12.35, -0.6, {
			width: 2.1,
			height: 0.4,
			size: 80,
			fg: "#765c4f",
		});
		// Clouds, stars and a tiny crescent provide sky detail without harming readability.
		for (let k = 0; k < 5; k++) {
			const x = -10 + rnd() * 20,
				y = 14 + rnd() * 2;
			for (let j = 0; j < 3; j++)
				this.ellipse(
					0.55 + j * 0.2,
					0.25 + j * 0.08,
					x + j * 0.55,
					y + (j === 1 ? 0.13 : 0),
					-5,
					0xfff4d9,
					0.8,
				);
		}
		this.ambient = new THREE.Group();
		this.scene.add(this.ambient);
		for (let i = 0; i < 13; i++) {
			const f = this.box(
				0.05,
				0.14,
				0.025,
				-12 + rnd() * 24,
				12 + rnd() * 4,
				-3.3,
				C.gold,
				this.ambient,
				false,
			);
			f.rotation.z = 0.6;
		}
	}
	buildBuilding(x, right) {
		const col = right ? 0xdcbda7 : 0xe9ccaa;
		this.box(3.4, 13.4, 2.4, x, 6.4, -2.5, col);
		this.box(3.65, 0.25, 2.65, x, 12.9, -2.45, C.paper);
		const roof = this.mesh(new THREE.ConeGeometry(2.65, 2.2, 4), C.navy);
		roof.position.set(x, 14.1, -2.5);
		roof.rotation.y = Math.PI / 4;
		this.box(0.55, 1.55, 0.55, x + (right ? 0.8 : -0.7), 14.9, -2.6, C.coral);
		this.box(0.7, 0.17, 0.69, x + (right ? 0.8 : -0.7), 15.7, -2.6, C.ink);
		for (let row = 0; row < 4; row++)
			for (let coln = 0; coln < 2; coln++) {
				const wx = x - 0.83 + coln * 1.66,
					wy = 2 + row * 2.8;
				this.box(0.96, 1.68, 0.17, wx, wy, -1.2, C.ink);
				this.box(0.79, 1.5, 0.18, wx, wy, -1.08, row % 2 ? 0xffd288 : 0xa5c1bd);
				this.box(0.07, 1.53, 0.12, wx, wy, -0.94, C.paper);
				this.box(0.85, 0.075, 0.12, wx, wy, -0.94, C.paper);
				for (const side of [-1, 1]) {
					this.box(
						0.29,
						1.64,
						0.16,
						wx + side * 0.63,
						wy,
						-1.03,
						right ? C.teal : C.coral,
					);
					for (let sy = 0; sy < 5; sy++)
						this.box(
							0.25,
							0.035,
							0.05,
							wx + side * 0.63,
							wy - 0.59 + sy * 0.28,
							-0.92,
							C.ink,
							this.scene,
							false,
						);
				}
				this.box(1.24, 0.15, 0.57, wx, wy - 0.89, -1, C.paper);
				if (row === 1 || row === 3) {
					this.box(0.9, 0.3, 0.36, wx, wy - 0.72, -0.66, C.rose);
					for (let f = 0; f < 5; f++) {
						this.sphere(
							0.12,
							wx - 0.32 + f * 0.16,
							wy - 0.45 + rnd() * 0.09,
							-0.62,
							f % 2 ? C.gold : C.coral,
						);
						this.box(
							0.04,
							0.24,
							0.04,
							wx - 0.32 + f * 0.16,
							wy - 0.6,
							-0.65,
							C.teal,
							this.scene,
							false,
						);
					}
				}
			}
		// Drainpipe with collars, brick marks, little shop awning and lanterns.
		const px = x + (right ? -1.5 : 1.5);
		this.cylinder(0.08, 0.08, 12.3, px, 6.0, -1.04, C.navy);
		for (let y = 1; y < 13; y += 2.5)
			this.cylinder(0.12, 0.12, 0.12, px, y, -1.04, C.gold);
		for (let n = 0; n < 20; n++) {
			const bx = x - 1.25 + rnd() * 2.5,
				by = 0.5 + rnd() * 12;
			this.line(
				[
					[bx, by, -1.25],
					[bx + 0.3, by, -1.25],
				],
				0xb9977e,
			);
		}
		this.box(3.1, 0.72, 1.0, x, 1, -0.38, C.cream);
		for (let i = 0; i < 7; i++) {
			const aw = this.box(
				0.43,
				0.16,
				1.15,
				x - 1.29 + i * 0.43,
				1.48,
				-0.3,
				i % 2 ? C.paper : C.coral,
			);
			aw.rotation.x = 0.12;
		}
		this.text(right ? "POP! POST" : "EAU de BOOM", x, 0.77, 0.18, {
			width: 2.8,
			height: 0.38,
			size: 75,
		});
		this.box(0.28, 0.64, 0.32, x + (right ? -1.85 : 1.85), 5.0, -0.65, C.ink);
		this.box(0.19, 0.44, 0.34, x + (right ? -1.85 : 1.85), 5.0, -0.62, C.gold);
	}
	buildBomber() {
		this.bomberRoot = new THREE.Group();
		this.bomberRoot.position.set(0, 10.92, 0.2);
		this.scene.add(this.bomberRoot);
		const body = new THREE.Group();
		body.name = "prankster";
		this.bomberRoot.add(body);
		this.bomberBody = body;
		// Oversized boots, striped sweater and rubbery mischievous silhouette.
		this.sphere(0.23, -0.25, 0.08, 0.08, C.ink, body);
		this.sphere(0.23, 0.25, 0.08, 0.08, C.ink, body);
		this.cylinder(0.36, 0.31, 0.83, 0, 0.64, 0, C.paper, body);
		for (let i = 0; i < 4; i++)
			this.cylinder(
				0.365,
				0.365,
				0.085,
				0,
				0.33 + i * 0.2,
				0,
				C.navy,
				body,
				false,
			);
		this.sphere(0.39, 0, 1.39, 0.02, 0xf3bb86, body);
		this.box(0.77, 0.19, 0.22, 0, 1.44, 0.31, C.ink, body);
		this.ellipse(0.115, 0.08, -0.18, 1.46, 0.435, C.paper, 1, body);
		this.ellipse(0.115, 0.08, 0.18, 1.46, 0.435, C.paper, 1, body);
		this.sphere(0.037, -0.15, 1.46, 0.45, C.ink, body, false);
		this.sphere(0.037, 0.2, 1.46, 0.45, C.ink, body, false);
		this.sphere(0.08, 0, 1.32, 0.4, 0xef9b71, body);
		this.line(
			[
				[-0.11, 1.2, 0.39],
				[0, 1.17, 0.41],
				[0.11, 1.21, 0.39],
			],
			C.ink,
			1,
			body,
		);
		this.cylinder(0.38, 0.42, 0.2, 0, 1.73, -0.01, C.navy, body);
		this.sphere(0.12, 0.36, 1.79, -0.01, C.gold, body);
		const arm = new THREE.Group();
		arm.name = "throwarm";
		arm.position.set(0.39, 0.99, 0);
		body.add(arm);
		this.throwArm = arm;
		const sleeve = this.cylinder(0.13, 0.11, 0.57, 0.15, -0.16, 0, C.navy, arm);
		sleeve.rotation.z = 0.7;
		this.sphere(0.135, 0.32, -0.36, 0.01, 0xf3bb86, arm);
		const arm2 = new THREE.Group();
		arm2.position.set(-0.37, 0.99, 0);
		body.add(arm2);
		const s2 = this.cylinder(0.13, 0.11, 0.55, -0.16, -0.16, 0, C.navy, arm2);
		s2.rotation.z = -0.7;
		this.sphere(0.135, -0.32, -0.36, 0.01, 0xf3bb86, arm2);
		this.mixer = new THREE.AnimationMixer(body);
		const idle = new THREE.AnimationClip("mischief-idle", 1.15, [
			new THREE.NumberKeyframeTrack(
				".position[y]",
				[0, 0.575, 1.15],
				[0, 0.08, 0],
			),
			new THREE.NumberKeyframeTrack(
				".rotation[z]",
				[0, 0.575, 1.15],
				[-0.035, 0.035, -0.035],
			),
		]);
		this.mixer.clipAction(idle).play();
		const throwClip = new THREE.AnimationClip("bomb-toss", 0.32, [
			new THREE.NumberKeyframeTrack(
				"throwarm.rotation[z]",
				[0, 0.09, 0.22, 0.32],
				[0, -1.65, 0.4, 0],
			),
		]);
		this.throwAction = this.mixer.clipAction(throwClip);
		this.throwAction.setLoop(THREE.LoopOnce, 1);
		this.throwAction.clampWhenFinished = false;
		this.animCount += 2;
	}
	makeBucket(col, index, parent) {
		const g = new THREE.Group();
		g.position.y = 0.055 + index * 0.55;
		parent.add(g);
		g.userData.body = this.cylinder(0.73, 0.54, 0.48, 0, 0, 0, col, g);
		const rim = this.mesh(
			new THREE.TorusGeometry(0.73, 0.065, 8, 36),
			C.paper,
			g,
		);
		rim.rotation.x = Math.PI / 2;
		rim.position.y = 0.245;
		this.cylinder(0.66, 0.66, 0.035, 0, 0.216, 0, 0x94e8d5, g, false);
		this.box(0.62, 0.17, 0.03, 0, -0.01, 0.65, C.paper, g);
		this.text(
			"K",
			0,
			-0.01,
			0.674,
			{ width: 0.29, height: 0.22, size: 110 },
			g,
		);
		for (const s of [-1, 1]) {
			this.sphere(0.07, s * 0.69, 0.11, 0, C.ink, g);
			const handle = this.mesh(
				new THREE.TorusGeometry(0.2, 0.027, 6, 16, Math.PI),
				C.ink,
				g,
				false,
			);
			handle.rotation.z = (s * Math.PI) / 2;
			handle.position.set(s * 0.75, 0.02, 0);
		}
		this.line(
			[
				[-0.36, 0.02, 0.55],
				[-0.4, -0.15, 0.52],
			],
			0x208079,
			1,
			g,
		);
		return g;
	}
	buildPlayers() {
		const palettes = [0x93d3bd, 0xf68b74, 0xe6c44d, 0xafadd7];
		const labelColors = ["#247d76", "#a64032", "#8d6816", "#655b91"];
		for (let i = 0; i < 4; i++) {
			const root = new THREE.Group();
			root.name = `bucket-player-${i}`;
			this.scene.add(root);
			const bounce = new THREE.Group();
			bounce.name = "bounce";
			root.add(bounce);
			const buckets = [];
			for (let j = 0; j < 3; j++)
				buckets.push(this.makeBucket(palettes[i], j, bounce));
			const label = this.text(
				String(i + 1).padStart(2, "0"),
				0,
				-0.11,
				0.88,
				{ width: 0.48, height: 0.22, size: 90, fg: labelColors[i] },
				root,
			);
			const shadow = this.ellipse(1.1, 0.18, 0, -0.08, 0.4, C.ink, 0.13, root);
			shadow.rotation.x = -Math.PI / 2;
			const mixer = new THREE.AnimationMixer(bounce);
			const clip = new THREE.AnimationClip("bucket-splosh", 0.24, [
				new THREE.VectorKeyframeTrack(
					".scale",
					[0, 0.06, 0.16, 0.24],
					[1, 1, 1, 1.15, 0.8, 1.1, 0.95, 1.1, 1, 1, 1, 1],
				),
			]);
			const action = mixer.clipAction(clip);
			action.setLoop(THREE.LoopOnce, 1);
			action.clampWhenFinished = false;
			this.animCount++;
			this.playerGroups.push({
				root,
				bounce,
				buckets,
				mixer,
				action,
				label,
				color: palettes[i],
			});
		}
	}
	makeBomb(kind) {
		const g = new THREE.Group();
		const split = kind === "split";
		const mini = kind === "mini";
		const gold = kind === "gold" || kind === "bonus";
		const r = mini ? 0.2 : split ? 0.32 : 0.28;
		const bodyColor = gold ? C.gold : split ? 0xe78dab : C.ink;
		this.sphere(r, 0, 0, 0, bodyColor, g);
		this.sphere(
			r * 0.3,
			-r * 0.28,
			r * 0.32,
			r * 0.83,
			gold || split ? C.paper : 0x596a70,
			g,
			false,
		);
		const scale = mini ? 0.72 : 1;
		this.cylinder(
			0.09 * scale,
			0.085 * scale,
			0.14 * scale,
			0,
			r + 0.01,
			0,
			C.navy,
			g,
		);
		this.line(
			[
				[0, r + 0.08 * scale, 0],
				[0.1 * scale, r + 0.2 * scale, 0],
				[0.18 * scale, r + 0.18 * scale, 0],
			],
			C.ink,
			1,
			g,
		);
		const spark = this.sphere(
			0.075 * scale,
			0.18 * scale,
			r + 0.2 * scale,
			0,
			C.gold,
			g,
			false,
		);
		g.userData.spark = spark;
		g.userData.kind = kind;
		g.userData.radius = r;
		if (split) {
			const seam = this.mesh(
				new THREE.TorusGeometry(r * 0.99, 0.022, 6, 28),
				C.paper,
				g,
				false,
			);
			seam.rotation.y = Math.PI / 2;
			seam.rotation.z = -0.3;
			this.text(
				"↗",
				0.085,
				-0.025,
				r + 0.025,
				{ width: 0.31, height: 0.3, fg: "#fff7e4" },
				g,
			);
		} else {
			for (const side of [-1, 1]) {
				this.ellipse(
					r * 0.16,
					r * 0.23,
					side * r * 0.34,
					-r * 0.07,
					r * 0.94,
					C.paper,
					1,
					g,
				);
				this.sphere(
					r * 0.068,
					side * r * 0.34 + r * 0.032,
					-r * 0.09,
					r * 0.99,
					C.ink,
					g,
					false,
				);
			}
		}
		this.scene.add(g);
		return g;
	}
	update(dt, state = {}) {
		if (!this.ready) return;
		this.time = state.time ?? this.time + dt;
		this.lastState = state;
		this.mixer.update(dt);
		for (const m of this.mixers) m.update(dt);
		this.bomberRoot.position.x =
			state.bomberX ?? Math.sin(this.time * 0.8) * 4.8;
		const pulse = state.throwPulse ?? Math.floor(this.time * 2.0);
		if (pulse !== this.lastThrow) {
			this.throwAction.reset().play();
			this.lastThrow = pulse;
		}
		const players = state.players?.length
			? state.players
			: [{ x: Math.sin(this.time) * 3.5, lives: 3 }];
		this.playerGroups.forEach((v, i) => {
			const p = players[i];
			v.root.visible = !!p;
			if (!p) return;
			v.root.position.x = p.x ?? 0;
			if (p.color && p.color !== v.color) {
				for (const bucket of v.buckets)
					bucket.userData.body.material = this.mat(p.color);
				v.color = p.color;
			}
			const lives = p.lives ?? 3;
			v.buckets.forEach((b, j) => {
				b.visible = j < lives;
			});
			v.bounce.rotation.z = clamp((p.vx ?? 0) * -0.006, -0.09, 0.09);
			const pulse = p.catchPulse ?? 0;
			if (pulse !== this.lastCatch[i]) {
				v.action.reset().play();
				this.lastCatch[i] = pulse;
			}
			v.mixer.update(dt);
			v.label.visible = players.length > 1;
			if (p.pop > 0) v.bounce.scale.x = 1 + Math.sin(this.time * 25) * 0.035;
		});
		const ids = new Set();
		for (const b of state.bombs ?? []) {
			ids.add(b.id);
			let m = this.bombMeshes.get(b.id);
			if (!m) {
				m = this.makeBomb(b.kind);
				this.bombMeshes.set(b.id, m);
			}
			m.position.set(b.x, b.y, 0.4);
			m.rotation.z = b.rotation ?? Math.sin(this.time * 6 + b.id) * 0.15;
			const s = 0.8 + Math.sin(this.time * 43 + (Number(b.id) || 0)) * 0.25;
			m.userData.spark.scale.setScalar(s);
		}
		for (const [id, m] of this.bombMeshes)
			if (!ids.has(id)) {
				this.scene.remove(m);
				this.disposeGroup(m);
				this.bombMeshes.delete(id);
			}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			if (p.life <= 0) {
				this.scene.remove(p.mesh);
				p.mesh.geometry.dispose();
				p.mesh.material.dispose();
				this.particles.splice(i, 1);
				continue;
			}
			p.vy -= p.gravity * dt;
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.y += p.vy * dt;
			p.mesh.position.z += p.vz * dt;
			p.mesh.rotation.z += p.spin * dt;
			p.mesh.scale.setScalar(Math.max(0.01, p.life / p.max));
		}
		for (let i = this.rings.length - 1; i >= 0; i--) {
			const r = this.rings[i];
			r.life -= dt;
			if (r.life <= 0) {
				this.scene.remove(r.mesh);
				r.mesh.geometry.dispose();
				r.mesh.material.dispose();
				this.rings.splice(i, 1);
				continue;
			}
			const t = 1 - r.life / r.max;
			r.mesh.scale.setScalar(1 + t * 3);
			r.mesh.material.opacity = (1 - t) * 0.8;
		}
		const shake = Math.max(state.shake ?? 0, this.shake);
		this.camera.position.x = (Math.random() - 0.5) * shake * 0.2;
		this.camera.position.y = 8.2 + (Math.random() - 0.5) * shake * 0.12;
		this.shake = Math.max(0, this.shake - dt * 4);
		this.camera.lookAt(0, 6.3, 0);
	}
	effects(type, x, y, col) {
		if (!this.ready) return;
		const miss = type === "miss" || type === "explosion";
		const gold = type === "gold" || type === "victory";
		const pop = type === "pop";
		const n = miss ? 32 : gold ? 34 : pop ? 28 : 18;
		const palette = miss
			? [C.coral, C.ink, C.gold]
			: gold
				? [C.gold, C.paper, C.coral, C.mint]
				: [C.mint, 0x9fe6d7, C.paper, 0x56acc3];
		for (let i = 0; i < n; i++) {
			const a = rnd() * Math.PI * 2,
				s = (miss ? 3 : 2) + rnd() * (miss ? 5 : 3);
			const mat = new THREE.MeshBasicMaterial({
				color: col ?? palette[i % palette.length],
			});
			const geo =
				gold || miss
					? new THREE.BoxGeometry(0.1 + rnd() * 0.08, 0.11 + rnd() * 0.1, 0.06)
					: new THREE.SphereGeometry(0.055 + rnd() * 0.04, 6, 4);
			const m = new THREE.Mesh(geo, mat);
			m.position.set(x, y, 0.6 + rnd() * 0.3);
			this.scene.add(m);
			const life = 0.4 + rnd() * 0.55;
			this.particles.push({
				mesh: m,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s + 2,
				vz: (rnd() - 0.5) * 2,
				gravity: miss ? 10 : 7,
				life,
				max: life,
				spin: (rnd() - 0.5) * 18,
			});
		}
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.3, 0.34, 40),
			new THREE.MeshBasicMaterial({
				color: miss ? C.coral : gold ? C.gold : C.mint,
				transparent: true,
				opacity: 0.8,
				depthWrite: false,
				side: THREE.DoubleSide,
			}),
		);
		ring.position.set(x, y, 1.0);
		this.scene.add(ring);
		this.rings.push({ mesh: ring, life: 0.35, max: 0.35 });
		if (miss) this.shake = 1;
	}
	resize() {
		if (!this.renderer) return;
		const w = this.container.clientWidth || innerWidth,
			h = this.container.clientHeight || innerHeight;
		this.renderer.setSize(w, h);
		const aspect = w / h;
		const requiredHalfWidth = aspect < 1 ? 8.3 : 11.8;
		const halfH = Math.max(8.15, requiredHalfWidth / aspect);
		this.camera.left = -halfH * aspect;
		this.camera.right = halfH * aspect;
		this.camera.top = halfH;
		this.camera.bottom = -halfH;
		this.camera.updateProjectionMatrix();
	}
	worldFromPointer(clientX, clientY) {
		const rect = this.renderer.domElement.getBoundingClientRect();
		const v = new THREE.Vector3(
			((clientX - rect.left) / rect.width) * 2 - 1,
			(-(clientY - rect.top) / rect.height) * 2 + 1,
			0,
		);
		v.unproject(this.camera);
		return { x: clamp(v.x, -7.2, 7.2), y: v.y };
	}
	render() {
		if (this.ready) {
			this.renderer.render(this.scene, this.camera);
			this.renderCount++;
		}
	}
	inspect() {
		return {
			ready: this.ready,
			backend: this.renderer?.backend?.isWebGPUBackend ? "webgpu" : "webgl",
			renders: this.renderCount,
			bombs: this.bombMeshes.size,
			particles: this.particles.length,
			animationClips: this.animCount,
			playerSlots: this.playerGroups.length,
			visiblePlayers: this.playerGroups.filter((p) => p.root.visible).length,
			viewHalfWidth: this.camera?.right,
			materials: this.materials.size,
			sceneObjects: this.scene.children.length,
		};
	}
	disposeGroup(g) {
		const shared = new Set(this.materials.values()),
			geometries = new Set(),
			materials = new Set();
		g.traverse((o) => {
			if (o.geometry) geometries.add(o.geometry);
			if (o.material && !shared.has(o.material)) materials.add(o.material);
		});
		for (const geo of geometries) geo.dispose();
		for (const mat of materials) {
			if (mat.map) mat.map.dispose();
			mat.dispose();
		}
	}
}
