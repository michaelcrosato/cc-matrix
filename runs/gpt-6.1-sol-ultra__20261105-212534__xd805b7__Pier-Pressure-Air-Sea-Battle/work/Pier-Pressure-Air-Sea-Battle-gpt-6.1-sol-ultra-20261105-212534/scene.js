import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";

export class Coast {
	constructor(canvas) {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#f0dfbb");
		this.camera = new THREE.OrthographicCamera(-28, 28, 28, -5, 0.1, 250);
		this.camera.position.set(0, 17, 58);
		this.camera.lookAt(0, 12, 0);
		this.renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			alpha: false,
			forceWebGL: new URLSearchParams(location.search).has("webgl"),
		});
		this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.targetRoots = new Set();
		this.trails = new Set();
		this.materials = new Map();
		this.mixers = [];
		this.particles = [];
		this.waves = [];
		this.clouds = [];
		this.time = 0;
		this.ink = new THREE.MeshBasicNodeMaterial({
			color: "#102c3b",
			side: THREE.BackSide,
		});
		this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
		this.ballGeo = new THREE.SphereGeometry(1, 12, 8);
		this.build();
		this.resize();
	}
	async init() {
		await this.renderer.init();
		this.backend = this.renderer.backend.isWebGPUBackend
			? "WebGPU"
			: "WebGL 2 fallback";
	}
	mat(hex) {
		if (!this.materials.has(hex)) {
			const m = new THREE.MeshBasicNodeMaterial();
			m.colorNode = color(hex).mul(
				normalWorld
					.dot(vec3(0.25, 0.8, 0.6))
					.max(0)
					.mul(3)
					.floor()
					.div(3)
					.mul(0.33)
					.add(0.67),
			);
			this.materials.set(hex, m);
		}
		return this.materials.get(hex);
	}
	mesh(
		geo,
		c,
		parent,
		x = 0,
		y = 0,
		z = 0,
		sx = 1,
		sy = 1,
		sz = 1,
		outline = true,
	) {
		const m = new THREE.Mesh(geo, this.mat(c));
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		parent.add(m);
		if (outline) {
			const o = new THREE.Mesh(geo, this.ink);
			o.scale.setScalar(1.045);
			m.add(o);
		}
		return m;
	}
	box(c, p, x, y, z, sx, sy, sz, outline = true) {
		return this.mesh(this.boxGeo, c, p, x, y, z, sx, sy, sz, outline);
	}
	ball(c, p, x, y, z, sx, sy, sz, outline = true) {
		return this.mesh(this.ballGeo, c, p, x, y, z, sx, sy, sz, outline);
	}
	build() {
		const s = this.scene;
		this.mesh(
			new THREE.CircleGeometry(5.1, 64),
			"#fac963",
			s,
			16,
			18,
			-38,
			1,
			1,
			1,
			false,
		);
		this.mesh(
			new THREE.RingGeometry(5.5, 5.54, 64),
			"#d9ac69",
			s,
			16,
			18,
			-37,
			1,
			1,
			1,
			false,
		);
		// Cut-paper distant islands and their ink contour.
		for (let i = 0; i < 11; i++) {
			const x = (i - 5) * 7;
			const h = 2 + Math.sin(i * 3.7) * 1.5;
			this.mesh(
				new THREE.ConeGeometry(5, h, 5),
				"#719692",
				s,
				x,
				0.5 + h / 2,
				-24,
				1,
				1,
				1,
				true,
			);
		}
		this.box("#267f86", s, 0, -75, -27.8, 150, 150, 1, false);
		this.box("#267f86", s, 0, 0, 20, 150, 1, 95, false);
		this.box("#85bbb0", s, 0, 0.65, -24, 150, 0.06, 3, false);
		for (let i = 0; i < 125; i++) {
			const x = ((i * 13.713) % 78) - 39,
				z = ((i * 7.231) % 61) - 30;
			const m = this.box(
				i % 3 ? "#70b8b0" : "#b8d5bc",
				s,
				x,
				0.65,
				z,
				1 + (i % 6) * 0.7,
				0.025,
				0.07,
				false,
			);
			this.waves.push(m);
		}
		for (let i = 0; i < 12; i++) {
			const g = new THREE.Group();
			s.add(g);
			g.position.set(-40 + i * 7, 15 + (i % 4) * 2.3, -28 - (i % 3) * 2);
			for (let k = 0; k < 3; k++)
				this.ball(
					"#f9f0d4",
					g,
					k * 1.5,
					Math.sin(k * 2) * 0.25,
					0,
					1.8,
					0.65 + (k % 2) * 0.3,
					0.3,
					false,
				);
			this.clouds.push(g);
		}
		// Lighthouse on the outer shoal.
		const light = new THREE.Group();
		light.position.set(23, 0.6, -16);
		s.add(light);
		this.mesh(
			new THREE.CylinderGeometry(1, 1.7, 1, 7),
			"#486d6b",
			light,
			0,
			0,
			0,
		);
		this.mesh(
			new THREE.CylinderGeometry(0.45, 0.8, 4.7, 10),
			"#f3dfb3",
			light,
			0,
			2.5,
			0,
		);
		this.mesh(
			new THREE.CylinderGeometry(0.52, 0.6, 0.65, 10),
			"#e56b49",
			light,
			0,
			3.1,
			0,
		);
		this.mesh(
			new THREE.CylinderGeometry(0.7, 0.7, 0.65, 10),
			"#ffce5e",
			light,
			0,
			5.05,
			0,
		);
		this.mesh(
			new THREE.ConeGeometry(0.95, 0.9, 10),
			"#203f48",
			light,
			0,
			5.8,
			0,
		);
		this.box("#e8e0ba", s, 0, -0.9, 9, 70, 0.9, 8);
		for (let i = 0; i < 24; i++) {
			this.box("#c5a578", s, -34 + i * 3, -0.35, 9, 2.9, 0.13, 7.8);
		}
		for (const x of [-12, 12]) {
			const g = new THREE.Group();
			g.position.set(x, 0, 0);
			s.add(g);
			this.mesh(
				new THREE.CylinderGeometry(3.7, 4.2, 1.8, 8),
				"#68766c",
				g,
				0,
				0.5,
				1,
			);
			this.mesh(
				new THREE.CylinderGeometry(3.5, 3.7, 0.45, 8),
				"#d3ba88",
				g,
				0,
				1.5,
				1,
			);
			for (let k = 0; k < 5; k++)
				this.box("#e5c991", g, -2.8 + k * 1.4, 1.95, 2.9, 1.1, 0.6, 0.5);
			this.box("#273f43", g, 0, 1.65, 1.2, 3, 0.1, 2.7);
			this.box("#d3ba88", g, 0, 1.3, -1.7, 5, 0.3, 1.8);
			this.box("#ffcf59", g, x < 0 ? -2.4 : 2.4, 2.9, 2.2, 0.1, 2.6, 0.1);
			this.box(
				x < 0 ? "#e76746" : "#5ab7ad",
				g,
				x < 0 ? -2 : 2,
				3.8,
				2.2,
				0.9,
				0.6,
				0.08,
			);
		}
		for (let x = -30; x <= 30; x += 3.2) {
			this.box("#59665a", s, x, -1, 12, 0.25, 2, 0.25);
			this.box("#d4bf8f", s, x, 0.3, 12, 0.3, 1.1, 0.3);
		}
		this.box("#6b6a52", s, 0, 0.7, 12, 65, 0.16, 0.16);
		this.guns = [this.makeGun(-12, "#ed734c"), this.makeGun(12, "#69bcb0")];
		this.preview = new THREE.Group();
		s.add(this.preview);
		this.previewDots = [];
		for (let i = 0; i < 25; i++) {
			const m = this.ball(
				"#ffe298",
				this.preview,
				0,
				0,
				0.2,
				0.075,
				0.075,
				0.075,
				false,
			);
			this.previewDots.push(m);
		}
		this.reticle = new THREE.Group();
		s.add(this.reticle);
		this.mesh(
			new THREE.TorusGeometry(0.42, 0.035, 5, 32),
			"#fff1be",
			this.reticle,
			0,
			0,
			0,
			1,
			1,
			1,
			false,
		);
		this.reticle.visible = false;
	}
	makeGun(x, c) {
		const root = new THREE.Group();
		root.position.set(x, 2.1, 0);
		this.scene.add(root);
		this.mesh(
			new THREE.CylinderGeometry(1.3, 1.6, 0.65, 12),
			"#183e49",
			root,
			0,
			0,
			0,
		);
		this.ball(c, root, 0, 0.4, 0, 1.25, 0.9, 0.85);
		const pivot = new THREE.Group();
		pivot.position.y = 1.1;
		root.add(pivot);
		const barrel = new THREE.Group();
		barrel.name = "barrel";
		pivot.add(barrel);
		this.box("#1c3943", barrel, 1.2, 0, 0, 2.7, 0.5, 0.5);
		this.box(c, barrel, 0.55, 0, 0, 1.1, 0.7, 0.7);
		this.box("#f3d081", barrel, 2.4, 0, 0, 0.24, 0.65, 0.65);
		this.ball("#294953", root, 0, 0.95, 0.8, 0.4, 0.4, 0.15);
		const mixer = new THREE.AnimationMixer(root);
		const clip = new THREE.AnimationClip("recoil", 0.24, [
			new THREE.NumberKeyframeTrack(
				"barrel.position[x]",
				[0, 0.05, 0.24],
				[0, -0.4, 0],
			),
		]);
		const action = mixer.clipAction(clip);
		action.setLoop(THREE.LoopOnce, 1);
		action.clampWhenFinished = true;
		this.mixers.push(mixer);
		pivot.rotation.z = x < 0 ? 1.1 : 2.04;
		return { root, pivot, mixer, action, x, angle: x < 0 ? 1.1 : 2.04 };
	}
	animate(root, tracks, duration) {
		const mixer = new THREE.AnimationMixer(root);
		const clip = new THREE.AnimationClip("mechanical", duration, tracks);
		mixer.clipAction(clip).play();
		root.userData.mixer = mixer;
		return mixer;
	}
	makeTarget(type, side = 1) {
		const root = new THREE.Group(),
			g = new THREE.Group();
		root.add(g);
		g.name = "hull";
		this.scene.add(root);
		root.userData.type = type;
		this.targetRoots.add(root);
		const c =
			type === "supply"
				? "#8cc7aa"
				: type === "boat"
					? "#e99151"
					: type === "boss"
						? "#c75543"
						: "#edb54d";
		if (type === "plane" || type === "scout") {
			this.ball(c, g, 0, 0, 0, 1.6, 0.4, 0.45);
			this.box(c, g, -0.15, 0, 0, 1.2, 0.13, 4.2);
			this.box("#e9cb82", g, -0.2, 0.78, 0, 1.5, 0.13, 4.5);
			for (const z of [-1.45, 1.45]) {
				this.box("#314b4f", g, -0.65, 0.4, z, 0.07, 0.85, 0.07);
				this.box("#314b4f", g, 0.35, 0.4, z, 0.07, 0.85, 0.07);
			}
			this.box("#c86a44", g, 0.9, -0.03, 0.4, 0.35, 0.45, 0.07);
			for (const z of [-0.4, 0.4]) {
				this.box("#1c3d46", g, 0.35, -0.47, z, 0.1, 0.4, 0.1);
				this.mesh(
					new THREE.CylinderGeometry(0.19, 0.19, 0.14, 8),
					"#193b43",
					g,
					0.35,
					-0.7,
					z,
					1,
					1,
					1,
				).rotation.x = Math.PI / 2;
			}
			for (let k = 0; k < 4; k++)
				this.ball(
					"#374f4c",
					g,
					-0.8 + k * 0.4,
					-0.12,
					0.43,
					0.035,
					0.035,
					0.035,
					false,
				);
			this.box("#183f4a", g, -1.2, 0.43, 0, 0.65, 0.9, 0.13);
			this.box(c, g, -1.25, 0.1, 0, 0.6, 0.13, 1.6);
			this.ball("#a9d8cc", g, 0.4, 0.35, 0, 0.55, 0.33, 0.35);
			const prop = new THREE.Group();
			prop.name = "prop";
			prop.position.x = 1.65;
			g.add(prop);
			this.box("#153a45", prop, 0, 0, 0, 0.12, 1.8, 0.12);
			this.box("#e66846", g, -0.2, 0.88, 1.65, 0.6, 0.04, 0.55);
			this.box("#e66846", g, -0.2, 0.88, -1.65, 0.6, 0.04, 0.55);
			this.animate(
				root,
				[
					new THREE.NumberKeyframeTrack(
						"prop.rotation[x]",
						[0, 2],
						[0, Math.PI * 32],
					),
					new THREE.NumberKeyframeTrack(
						"hull.rotation[z]",
						[0, 1, 2],
						[0, 0.045, 0],
					),
				],
				2,
			);
			g.rotation.y = side < 0 ? Math.PI : 0;
		} else if (type === "heli") {
			this.ball("#db7653", g, 0, 0, 0, 1.1, 0.65, 0.65);
			this.ball("#add9cf", g, 0.6, 0.15, 0.3, 0.65, 0.45, 0.45);
			this.box("#193c47", g, -1.4, 0, 0, 1.9, 0.22, 0.22);
			this.box(c, g, -2.2, 0.35, 0, 0.3, 0.8, 0.15);
			this.box("#173b46", g, 0, 0.85, 0, 0.15, 0.6, 0.15);
			const rotor = new THREE.Group();
			rotor.name = "rotor";
			rotor.position.y = 1.1;
			g.add(rotor);
			this.box("#173b46", rotor, 0, 0, 0, 4.1, 0.06, 0.14);
			for (const k of [-1, 1])
				this.box("#193c47", g, 0, -0.75, k * 0.55, 2.5, 0.13, 0.13);
			this.animate(
				root,
				[
					new THREE.NumberKeyframeTrack(
						"rotor.rotation[y]",
						[0, 2],
						[0, Math.PI * 40],
					),
					new THREE.NumberKeyframeTrack(
						"hull.rotation[z]",
						[0, 1, 2],
						[0, 0.05, 0],
					),
				],
				2,
			);
			g.rotation.y = side < 0 ? Math.PI : 0;
		} else if (type === "supply") {
			this.mesh(
				new THREE.SphereGeometry(1.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
				"#9fc5a1",
				g,
				0,
				1,
				0,
				1,
				0.65,
				1,
			);
			for (const k of [-1, 1])
				this.box("#eee1b5", g, k * 0.65, 0.35, 0, 0.035, 1.4, 0.035, false);
			this.box("#f3d397", g, 0, -0.6, 0, 1, 1, 0.8);
			this.box("#4d9186", g, 0, -0.6, 0.43, 0.15, 0.8, 0.04);
			this.box("#4d9186", g, 0, -0.6, 0.43, 0.75, 0.15, 0.04);
			this.animate(
				root,
				[
					new THREE.NumberKeyframeTrack(
						"hull.rotation[z]",
						[0, 1, 2],
						[-0.15, 0.15, -0.15],
					),
				],
				2,
			);
		} else if (type === "bomb") {
			this.ball("#d15c43", g, 0, 0, 0, 0.23, 0.5, 0.23);
			this.box("#193d46", g, 0, 0.4, 0, 0.7, 0.15, 0.15);
		} else {
			const boss = type === "boss",
				scale = boss ? 2.5 : 1;
			const shape = new THREE.Shape();
			shape.moveTo(-2.2, 0.15);
			shape.lineTo(2.2, 0.15);
			shape.lineTo(1.5, -0.65);
			shape.lineTo(-1.6, -0.65);
			shape.closePath();
			this.mesh(
				new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false }),
				boss ? "#324b52" : "#d66a47",
				g,
				0,
				0,
				-0.6,
				scale,
				scale,
				scale,
			);
			this.box("#f2ce83", g, 0, 0.25, 0, 4.1 * scale, 0.15, 1.3 * scale);
			for (let k = 0; k < 5; k++) {
				this.ball(
					"#f2c274",
					g,
					(-1.4 + k * 0.65) * scale,
					-0.25 * scale,
					0.62 * scale,
					0.1 * scale,
					0.1 * scale,
					0.05,
					false,
				);
			}
			this.box(
				"#d5ccab",
				g,
				-0.3,
				1 * scale,
				0,
				1.7 * scale,
				1.3 * scale,
				0.95 * scale,
			);
			this.box(
				"#264a52",
				g,
				0.1,
				1.4 * scale,
				0.51 * scale,
				0.7 * scale,
				0.35 * scale,
				0.05,
			);
			for (let k = 0; k < (boss ? 3 : 1); k++) {
				this.box(
					"#263e45",
					g,
					(-1.3 + k * 0.9) * scale,
					2 * scale,
					0,
					0.4 * scale,
					1 * scale,
					0.5 * scale,
				);
				this.box(
					"#c96348",
					g,
					(-1.3 + k * 0.9) * scale,
					2.45 * scale,
					0,
					0.43 * scale,
					0.25 * scale,
					0.53 * scale,
				);
			}
			for (const k of [-1, 1]) {
				this.ball(
					"#c75640",
					g,
					k * 1.5 * scale,
					0.55 * scale,
					0,
					0.5 * scale,
					0.4 * scale,
					0.5 * scale,
				);
				this.box(
					"#1c3841",
					g,
					k * 1.9 * scale,
					0.85 * scale,
					0,
					1.1 * scale,
					0.16 * scale,
					0.2 * scale,
				);
			}
			this.box(
				"#25434a",
				g,
				0.8 * scale,
				2 * scale,
				0,
				0.065,
				2.8 * scale,
				0.065,
			);
			this.box(
				"#efbf59",
				g,
				1.15 * scale,
				3.05 * scale,
				0,
				0.7 * scale,
				0.5 * scale,
				0.05,
			);
			for (const z of [-0.8, 0.8]) {
				for (let k = -2; k <= 2; k++)
					this.box(
						"#cdbf95",
						g,
						k * 0.7 * scale,
						0.45 * scale,
						z * scale,
						0.035,
						0.5 * scale,
						0.035,
						false,
					);
				this.box(
					"#cdbf95",
					g,
					0,
					0.7 * scale,
					z * scale,
					3 * scale,
					0.035,
					0.035,
					false,
				);
			}
			if (boss) {
				for (let k = 0; k < 5; k++)
					this.box("#efbd58", g, -3 + k * 1.5, 0, 1.55, 0.65, 0.22, 0.05);
			}
			this.animate(
				root,
				[
					new THREE.NumberKeyframeTrack(
						"hull.rotation[z]",
						[0, 1.5, 3],
						[-0.025, 0.025, -0.025],
					),
					new THREE.NumberKeyframeTrack(
						"hull.position[y]",
						[0, 1.5, 3],
						[0, 0.13, 0],
					),
				],
				3,
			);
		}
		return root;
	}
	remove(root) {
		if (!root) return;
		this.targetRoots.delete(root);
		this.trails.delete(root);
		if (root.userData.mixer) {
			root.userData.mixer.stopAllAction();
			root.userData.mixer.uncacheRoot(root);
		}
		const owned = new Set();
		root.traverse((o) => {
			if (o.isMesh && o.geometry !== this.boxGeo && o.geometry !== this.ballGeo)
				owned.add(o.geometry);
		});
		for (const g of owned) g.dispose();
		this.scene.remove(root);
	}
	projectile(x, y, special = false) {
		const g = new THREE.Group();
		this.scene.add(g);
		this.trails.add(g);
		g.userData.trailTime = 0;
		g.position.set(x, y, 0);
		this.ball(special ? "#9ee7d0" : "#ffe68d", g, 0, 0, 0, 0.17, 0.17, 0.17);
		return g;
	}
	burst(x, y, c = "#ffcb60", size = 1) {
		for (let i = 0; i < 14; i++) {
			const a = Math.random() * Math.PI * 2,
				v = 2 + Math.random() * 6;
			const m = this.mesh(
				i % 2 ? this.boxGeo : this.ballGeo,
				i % 4 === 0 ? "#f7e9bf" : c,
				this.scene,
				x,
				y,
				0.5,
				0.12 + Math.random() * 0.22,
				0.12 + Math.random() * 0.22,
				0.13,
				false,
			);
			this.particles.push({
				m,
				vx: Math.cos(a) * v * size,
				vy: Math.sin(a) * v * size,
				life: 0.35 + Math.random() * 0.55,
				max: 0.9,
			});
		}
		const ring = this.mesh(
			new THREE.TorusGeometry(0.3, 0.07, 5, 24),
			c,
			this.scene,
			x,
			y,
			0.6,
			1,
			1,
			1,
			false,
		);
		this.particles.push({
			m: ring,
			vx: 0,
			vy: 0,
			life: 0.45,
			max: 0.45,
			ring: true,
		});
	}
	drawAim(x, y, angle, speed, gravity, wind, visible) {
		this.preview.visible = visible;
		if (!visible) return;
		for (let i = 0; i < this.previewDots.length; i++) {
			const t = (i + 1) * 0.06;
			const p = this.previewDots[i];
			p.position.set(
				x + Math.cos(angle) * speed * t + wind * 0.5 * t * t,
				y + Math.sin(angle) * speed * t - gravity * 0.5 * t * t,
				0,
			);
			p.visible = p.position.y > 0.8 && p.position.y < 26;
		}
	}
	update(dt) {
		this.time += dt;
		for (const r of this.trails) {
			r.userData.trailTime -= dt;
			if (r.userData.trailTime <= 0 && dt > 0) {
				r.userData.trailTime = 0.04;
				const m = this.ball(
					"#b78e55",
					this.scene,
					r.position.x,
					r.position.y,
					-0.05,
					0.065,
					0.065,
					0.065,
					false,
				);
				this.particles.push({
					m,
					vx: 0,
					vy: 0,
					life: 0.32,
					max: 0.32,
					trail: true,
				});
			}
		}
		for (const r of this.targetRoots) {
			if (!["boat", "boss"].includes(r.userData.type)) continue;
			r.userData.smoke = (r.userData.smoke || 0) - dt;
			if (r.userData.smoke <= 0 && dt > 0) {
				r.userData.smoke = 0.3;
				const boss = r.userData.type === "boss",
					m = this.ball(
						"#66837a",
						this.scene,
						r.position.x - (boss ? 1 : 1.3),
						r.position.y + (boss ? 6 : 2.7),
						-0.1,
						0.22,
						0.26,
						0.22,
						false,
					);
				this.particles.push({
					m,
					vx: -0.5,
					vy: 0.65,
					life: 1.6,
					max: 1.6,
					smoke: true,
				});
			}
		}
		for (const m of this.mixers) m.update(dt);
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			if (p.life <= 0) {
				this.scene.remove(p.m);
				if (p.ring) p.m.geometry.dispose();
				this.particles.splice(i, 1);
				continue;
			}
			p.m.position.x += p.vx * dt;
			p.m.position.y += p.vy * dt;
			if (!p.smoke && !p.trail) p.vy -= 8 * dt;
			p.m.rotation.z += dt * 2;
			if (p.ring) p.m.scale.setScalar(1 + (p.max - p.life) * 12);
			else p.m.scale.multiplyScalar((p.smoke ? 1.55 : 0.25) ** dt);
		}
		for (let i = 0; i < this.waves.length; i++) {
			const w = this.waves[i];
			w.position.x += dt * (0.2 + (i % 3) * 0.06);
			if (w.position.x > 42) w.position.x = -42;
			w.scale.x = 1 + Math.sin(this.time * 1.2 + i) * 0.12;
		}
		for (const c of this.clouds) {
			c.position.x += dt * 0.12;
			if (c.position.x > 48) c.position.x = -48;
		}
	}
	resize() {
		const w = innerWidth,
			h = innerHeight;
		this.renderer.setSize(w, h);
		const aspect = w / h;
		const width = Math.max(54, 33 * aspect),
			height = width / aspect;
		this.camera.left = -width / 2;
		this.camera.right = width / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.updateProjectionMatrix();
		this.camera.position.set(0, 22, 60);
		this.camera.lookAt(0, 12, 0);
	}
	pointer(x, y) {
		const v = new THREE.Vector3(
			(x / innerWidth) * 2 - 1,
			(-y / innerHeight) * 2 + 1,
			0.5,
		).unproject(this.camera);
		const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(
			this.camera.quaternion,
		);
		const t = -v.z / dir.z;
		return v.addScaledVector(dir, t);
	}
	render(shake = 0) {
		this.camera.position.x = shake ? (Math.random() - 0.5) * shake : 0;
		this.renderer.render(this.scene, this.camera);
	}
}
