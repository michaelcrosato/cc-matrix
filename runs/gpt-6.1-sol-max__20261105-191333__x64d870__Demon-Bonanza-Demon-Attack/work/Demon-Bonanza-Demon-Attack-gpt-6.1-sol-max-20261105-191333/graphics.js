import * as THREE from "three/webgpu";
import { COLORS, decodeSnapshot } from "./core.js";
const C = {
	ink: 0x101426,
	cream: 0xfff0cf,
	mint: 0x9ceaca,
	coral: 0xff987e,
	lilac: 0xb5a5ff,
	gold: 0xffda81,
};
export class Graphics {
	constructor(canvas) {
		this.canvas = canvas;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x13182d);
		this.camera = new THREE.OrthographicCamera(-18, 18, 11, -11, 0.1, 200);
		this.camera.position.set(0, 3.8, 40);
		this.camera.lookAt(0, 1, 0);
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.models = new Map();
		this.particles = [];
		this.rings = [];
		this.mixers = [];
		this.labels = [];
		this.shake = 0;
		this.time = 0;
		const ramp = new Uint8Array([74, 147, 213, 255]);
		this.gradient = new THREE.DataTexture(ramp, 4, 1, THREE.RedFormat);
		this.gradient.needsUpdate = true;
		this.gradient.minFilter = THREE.NearestFilter;
		this.gradient.magFilter = THREE.NearestFilter;
		this.mats = new Map();
		this.ink = new THREE.MeshBasicMaterial({
			color: C.ink,
			side: THREE.BackSide,
		});
		this.scene.add(new THREE.AmbientLight(0xb7c4eb, 1.8));
		const key = new THREE.DirectionalLight(0xfff0ce, 3);
		key.position.set(-8, 14, 18);
		this.scene.add(key);
		const fill = new THREE.DirectionalLight(0x93a9ff, 1.4);
		fill.position.set(10, 4, -8);
		this.scene.add(fill);
		this.makeWorld();
		this.hero = this.demon("splitter", true);
		this.hero.position.set(8, 1.6, 2);
		this.hero.scale.setScalar(2.15);
		this.root.add(this.hero);
		this.heroTilt = new THREE.Group();
		this.hero.add(this.heroTilt);
	}
	async init() {
		const configure = async (forceWebGL) => {
			this.renderer = new THREE.WebGPURenderer({
				canvas: this.canvas,
				antialias: true,
				alpha: false,
				powerPreference: "high-performance",
				forceWebGL,
			});
			await this.renderer.init();
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			this.renderer.outputColorSpace = THREE.SRGBColorSpace;
			this.renderer.toneMapping = THREE.NeutralToneMapping;
			this.backend = this.renderer.backend.isWebGPUBackend
				? "WebGPU"
				: "WebGL 2 compatibility";
			this.resize();
			this.renderer.render(this.scene, this.camera);
		};
		const force =
			new URLSearchParams(location.search).get("renderer") === "webgl";
		try {
			await configure(force);
		} catch (error) {
			if (force) throw error;
			this.recovery = error.message;
			try {
				this.renderer?.dispose();
			} catch {}
			// Canvas contexts cannot switch API after creation. Replace only the canvas.
			const next = this.canvas.cloneNode(false);
			this.canvas.replaceWith(next);
			this.canvas = next;
			await configure(true);
		}
	}
	mat(color, basic = false) {
		const key = color + "-" + basic;
		if (!this.mats.has(key))
			this.mats.set(
				key,
				basic
					? new THREE.MeshBasicMaterial({ color })
					: new THREE.MeshToonMaterial({
							color,
							gradientMap: this.gradient,
							flatShading: true,
						}),
			);
		return this.mats.get(key);
	}
	mesh(
		geo,
		color,
		parent,
		pos = [0, 0, 0],
		scale = [1, 1, 1],
		outline = true,
		basic = false,
	) {
		const m = new THREE.Mesh(geo, this.mat(color, basic));
		m.position.set(...pos);
		m.scale.set(...scale);
		parent.add(m);
		if (outline) {
			const o = new THREE.Mesh(geo, this.ink);
			o.scale.setScalar(1.045);
			m.add(o);
		}
		return m;
	}
	shape(points, depth = 0.18) {
		const s = new THREE.Shape();
		points.forEach((p, i) => (i ? s.lineTo(...p) : s.moveTo(...p)));
		s.closePath();
		const geo = new THREE.ExtrudeGeometry(s, {
			depth,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: 0.035,
			bevelThickness: 0.04,
		});
		geo.computeVertexNormals();
		return geo;
	}
	line(points, color, parent, opacity = 1) {
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
	makeWorld() {
		const bg = new THREE.Group();
		this.root.add(bg);
		this.background = bg;
		this.mesh(
			new THREE.PlaneGeometry(130, 75),
			0x171d35,
			bg,
			[0, 8, -32],
			[1, 1, 1],
			false,
			true,
		);
		// A printed eclipse: disk, carved bands, radial registration marks.
		const moon = new THREE.Group();
		moon.position.set(5, 6.3, -24);
		bg.add(moon);
		this.moon = moon;
		this.mesh(
			new THREE.CircleGeometry(7.5, 96),
			0xefaa90,
			moon,
			[0, 0, 0],
			[1, 1, 1],
			false,
			true,
		);
		this.mesh(
			new THREE.CircleGeometry(6.78, 96),
			0x242941,
			moon,
			[0.8, 0.55, 0.04],
			[1, 1, 1],
			false,
			true,
		);
		for (let i = 0; i < 52; i++) {
			const a = (i * Math.PI * 2) / 52,
				r = 8.15,
				len = i % 4 === 0 ? 0.75 : 0.22;
			this.line(
				[
					[Math.cos(a) * r, Math.sin(a) * r, 0.1],
					[Math.cos(a) * (r + len), Math.sin(a) * (r + len), 0.1],
				],
				0x716378,
				moon,
				0.65,
			);
		}
		// Halftone starfield; geometric stars are actual scene objects.
		const starRandom = (i) => {
			const n = Math.sin(i * 127.1 + 74.7) * 43758.5453;
			return n - Math.floor(n);
		};
		this.stars = [];
		for (let i = 0; i < 155; i++) {
			const x = (starRandom(i * 4) - 0.5) * 90,
				y = starRandom(i * 4 + 1) * 37 - 5,
				z = -29 + starRandom(i * 4 + 2) * 8,
				s = 0.022 + starRandom(i * 4 + 3) * 0.055;
			const star = this.mesh(
				new THREE.CircleGeometry(s, i % 9 === 0 ? 4 : 6),
				i % 7 === 0 ? C.coral : 0x8e9dbb,
				bg,
				[x, y, z],
				[1, 1, 1],
				false,
				true,
			);
			this.stars.push(star);
			if (i % 13 === 0) {
				this.line(
					[
						[x - 0.18, y, z],
						[x + 0.18, y, z],
					],
					C.cream,
					bg,
					0.55,
				);
				this.line(
					[
						[x, y - 0.18, z],
						[x, y + 0.18, z],
					],
					C.cream,
					bg,
					0.55,
				);
			}
		}
		// Three ink-cut ice ridges give the arena an unmistakable place.
		for (let layer = 0; layer < 3; layer++) {
			const pts = [[-55, -12]];
			for (let i = 0; i < 20; i++)
				pts.push([
					-55 + i * 6,
					-3 - layer * 1.6 + starRandom(i + layer * 67) * 4,
				]);
			pts.push([65, -12]);
			this.mesh(
				this.shape(pts, 0.2),
				[0x292f4b, 0x323d58, 0x416171][layer],
				bg,
				[0, -1 - layer * 0.55, -20 + layer * 5],
				[1, 1, 1],
				true,
				true,
			);
			if (layer === 2) {
				for (let i = 0; i < 12; i++) {
					const x = -36 + i * 6;
					this.mesh(
						this.shape(
							[
								[0, 0],
								[1.4, 2.1],
								[3.1, -0.2],
								[1.8, 0.45],
								[1.2, 0.25],
							],
							0.08,
						),
						0x89bab9,
						bg,
						[x, -5, -8],
						[1, 1, 1],
						false,
						true,
					);
				}
			}
		}
		// A long floating glacier plinth. Dark front face, pale top, ink facets.
		this.mesh(
			new THREE.BoxGeometry(39, 1.2, 6),
			0x3c7881,
			bg,
			[0, -8.45, 1],
			[1, 1, 1],
			true,
		);
		this.mesh(
			new THREE.BoxGeometry(39, 0.22, 6.1),
			0xbde8d9,
			bg,
			[0, -7.75, 1],
			[1, 1, 1],
			true,
		);
		this.mesh(
			new THREE.BoxGeometry(38, 0.1, 0.12),
			C.mint,
			bg,
			[0, -7.52, 4],
			[1, 1, 1],
			false,
			true,
		);
		for (let i = 0; i < 22; i++) {
			const x = -19 + i * 1.8;
			this.mesh(
				this.shape(
					[
						[0, 0],
						[0.9, -0.15],
						[0.6, -1.6],
						[0.2, -0.7],
					],
					0.12,
				),
				i % 2 ? 0x2c526a : 0x52949a,
				bg,
				[x, -8, 4.1],
				[1, 1, 1],
				false,
				true,
			);
			if (i % 2 === 0)
				this.line(
					[
						[x, -7.62, 3],
						[x + 1.4, -7.62, 0.1],
						[x + 1.1, -7.62, -1.8],
					],
					0x6ca4a9,
					bg,
					0.6,
				);
		}
		for (let side of [-1, 1]) {
			for (let i = 0; i < 7; i++) {
				const g = new THREE.Group();
				g.position.set(side * (16.4 + i * 0.67), -7.4, -2 - i * 0.2);
				bg.add(g);
				const s = 0.75 + starRandom(i + side * 11) * 1.3;
				this.mesh(
					new THREE.ConeGeometry(0.5, 3, 5),
					i % 2 ? 0x91d5d0 : 0x6fa8be,
					g,
					[0, s * 0.6, 0],
					[s, s, s],
				);
				g.rotation.z = side * (-0.18 + i * 0.04);
			}
			const tower = new THREE.Group();
			tower.position.set(side * 16.8, -5.7, -3);
			bg.add(tower);
			this.mesh(new THREE.CylinderGeometry(0.55, 0.8, 3, 5), 0x576b83, tower);
			this.mesh(
				new THREE.OctahedronGeometry(0.55),
				C.coral,
				tower,
				[0, 1.9, 0],
				[1, 1.3, 1],
			);
			for (let i = 0; i < 3; i++)
				this.mesh(
					new THREE.TorusGeometry(0.65, 0.05, 4, 24),
					C.ink,
					tower,
					[0, -1 + i * 0.8, 0.1],
					[1, 1, 1],
					false,
					true,
				);
		}
		this.skyRing = new THREE.Group();
		this.skyRing.position.set(0, 2, -10);
		bg.add(this.skyRing);
		for (let i = 0; i < 3; i++)
			this.mesh(
				new THREE.TorusGeometry(8.5 + i * 0.22, 0.016, 3, 96),
				0x494661,
				this.skyRing,
				[0, 0, -i * 0.05],
				[1, 1, 1],
				false,
				true,
			);
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			const m = this.mesh(
				new THREE.OctahedronGeometry(0.11),
				0x977d8f,
				this.skyRing,
				[Math.cos(a) * 8.6, Math.sin(a) * 8.6, 0.1],
				[1, 2, 1],
				false,
				true,
			);
			m.rotation.z = -a;
		}
		// Wisps of snow are animated against the world rather than a flat overlay.
		this.snow = [];
		for (let i = 0; i < 50; i++) {
			const s = this.mesh(
				new THREE.PlaneGeometry(0.03 + starRandom(i) * 0.04, 0.14),
				0xb2d5d3,
				bg,
				[
					(starRandom(i * 2) - 0.5) * 37,
					starRandom(i * 2 + 1) * 24 - 9,
					1 + starRandom(i * 3) * 3,
				],
				[1, 1, 1],
				false,
				true,
			);
			s.rotation.z = -0.6;
			this.snow.push(s);
		}
	}
	demon(type, hero = false) {
		const g = new THREE.Group(),
			color =
				{
					moth: C.mint,
					firebird: C.coral,
					splitter: C.lilac,
					armor: C.gold,
					imp: C.coral,
					boss: C.coral,
					seal: C.gold,
				}[type] || C.lilac;
		if (type === "seal") {
			this.mesh(
				new THREE.OctahedronGeometry(0.65),
				C.gold,
				g,
				[0, 0, 0],
				[1, 1.2, 0.6],
			);
			this.mesh(
				new THREE.OctahedronGeometry(0.27),
				C.cream,
				g,
				[0, 0, 0.5],
				[1, 1.3, 0.3],
				true,
				true,
			);
			const ring = this.mesh(
				new THREE.TorusGeometry(0.85, 0.04, 4, 24),
				C.gold,
				g,
				[0, 0, 0],
				[1, 1, 1],
				false,
				true,
			);
			ring.name = "orbit";
			const mix = new THREE.AnimationMixer(g);
			mix
				.clipAction(
					new THREE.AnimationClip("Seal orbit", 3, [
						new THREE.NumberKeyframeTrack(
							"orbit.rotation[z]",
							[0, 3],
							[0, Math.PI * 2],
						),
					]),
				)
				.play();
			g.userData.mixer = mix;
			return g;
		}
		const body = this.mesh(
			new THREE.SphereGeometry(0.72, 12, 8),
			color,
			g,
			[0, 0, 0],
			[1, 1.05, 0.64],
		);
		body.name = "breath";
		this.mesh(
			new THREE.SphereGeometry(0.5, 10, 6),
			type === "armor" ? 0xa67655 : 0x52466e,
			g,
			[0, -0.12, 0.39],
			[1, 0.8, 0.45],
		);
		const wpoints = [
			[0, 0.32],
			[0.65, 0.85],
			[1.6, 1.45],
			[2.6, 1.15],
			[2.25, 0.55],
			[2.32, -0.2],
			[1.72, 0.08],
			[1.45, -0.65],
			[0.93, -0.25],
			[0.65, -0.65],
			[0.28, -0.1],
			[0, -0.3],
		];
		for (let side of [-1, 1]) {
			const wing = new THREE.Group();
			wing.name = side < 0 ? "wingL" : "wingR";
			wing.position.set(side * 0.48, 0.13, -0.1);
			g.add(wing);
			const mesh = this.mesh(
				this.shape(wpoints, 0.12),
				color,
				wing,
				[0, 0, 0],
				[side, 1, 1],
			);
			this.mesh(
				this.shape(
					[
						[0.12, 0.25],
						[0.66, 0.61],
						[1.7, 1.22],
						[1.35, 0.22],
						[0.95, -0.1],
						[0.55, -0.38],
					],
					0.035,
				),
				type === "firebird" ? 0xbf526c : type === "moth" ? 0x4b9b9b : 0x775f9b,
				wing,
				[0, 0, 0.18],
				[side, 1, 1],
				false,
			);
			this.line(
				[
					[side * 0.1, 0.3, 0.28],
					[side * 0.85, 0.57, 0.28],
					[side * 1.6, 1.24, 0.28],
				],
				C.ink,
				wing,
			);
			const eye = this.mesh(
				this.shape(
					[
						[-0.24, 0.15],
						[0.25, 0.15],
						[0.18, -0.18],
						[-0.17, -0.18],
					],
					0.07,
				),
				C.cream,
				g,
				[side * 0.3, 0.16, 0.63],
				[1, 1, 1],
				true,
				true,
			);
			this.mesh(
				new THREE.BoxGeometry(0.09, 0.21, 0.04),
				C.ink,
				g,
				[side * 0.28, 0.14, 0.76],
				[1, 1, 1],
				false,
				true,
			);
			const brow = this.mesh(
				new THREE.BoxGeometry(0.53, 0.13, 0.09),
				C.ink,
				g,
				[side * 0.3, 0.39, 0.71],
				[1, 1, 1],
				false,
				true,
			);
			brow.rotation.z = side * 0.23;
			const horn = this.mesh(
				new THREE.ConeGeometry(0.2, 0.68, 5),
				C.cream,
				g,
				[side * 0.48, 0.82, 0.05],
				[1, 1, 1],
			);
			horn.rotation.z = -side * 0.42;
			const fang = this.mesh(
				new THREE.ConeGeometry(0.085, 0.22, 4),
				C.cream,
				g,
				[side * 0.18, -0.4, 0.65],
				[1, -1, 1],
			);
			this.mesh(
				new THREE.ConeGeometry(0.13, 0.5, 4),
				color,
				g,
				[side * 0.36, -0.82, 0.02],
				[1, -1, 1],
			);
		}
		this.mesh(
			this.shape(
				[
					[-0.22, 0],
					[0, -0.17],
					[0.22, 0],
				],
				0.04,
			),
			C.ink,
			g,
			[0, -0.21, 0.71],
			[1, 1, 1],
			false,
			true,
		);
		if (type === "armor")
			for (let i = 0; i < 3; i++) {
				const m = this.mesh(
					new THREE.BoxGeometry(0.92, 0.22, 0.1),
					0xe8c781,
					g,
					[0, -0.14 + i * 0.26, 0.83],
					[1, 1, 1],
				);
				m.rotation.z = i % 2 ? 0.12 : -0.12;
			}
		if (type === "boss" || hero) {
			const crown = new THREE.Group();
			crown.name = "crown";
			crown.position.set(0, 1.1, 0);
			g.add(crown);
			this.mesh(
				this.shape(
					[
						[-0.65, 0],
						[-0.8, 0.75],
						[-0.32, 0.45],
						[0, 1.05],
						[0.32, 0.45],
						[0.8, 0.75],
						[0.65, 0],
					],
					0.2,
				),
				C.gold,
				crown,
			);
			this.mesh(
				new THREE.OctahedronGeometry(0.15),
				C.coral,
				crown,
				[0, 0.35, 0.3],
				[1, 1.25, 0.5],
			);
		}
		const flap = type === "imp" ? 0.38 : type === "boss" ? 0.95 : 0.7;
		const tracks = [
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[y]",
				[0, flap * 0.5, flap],
				[0.4, -0.65, 0.4],
			),
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[y]",
				[0, flap * 0.5, flap],
				[-0.4, 0.65, -0.4],
			),
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[z]",
				[0, flap * 0.5, flap],
				[0.1, -0.21, 0.1],
			),
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[z]",
				[0, flap * 0.5, flap],
				[-0.1, 0.21, -0.1],
			),
			new THREE.VectorKeyframeTrack(
				"breath.scale",
				[0, flap * 0.5, flap],
				[1, 1.05, 0.64, 1.04, 1.01, 0.64, 1, 1.05, 0.64],
			),
		];
		if (type === "boss" || hero)
			tracks.push(
				new THREE.NumberKeyframeTrack(
					"crown.rotation[z]",
					[0, flap, flap * 2],
					[-0.08, 0.08, -0.08],
				),
			);
		const mixer = new THREE.AnimationMixer(g);
		mixer
			.clipAction(
				new THREE.AnimationClip(
					"Inkwing flight",
					type === "boss" || hero ? flap * 2 : flap,
					tracks,
				),
			)
			.play();
		g.userData.mixer = mixer;
		if (type === "imp") g.scale.setScalar(0.53);
		if (type === "boss") g.scale.setScalar(2.35);
		return g;
	}
	cannon(seat = 0) {
		const g = new THREE.Group(),
			color = COLORS[seat % 4];
		this.mesh(
			new THREE.CylinderGeometry(0.6, 0.8, 0.28, 8),
			C.ink,
			g,
			[0, -0.35, 0],
			[1, 1, 1],
		);
		this.mesh(
			new THREE.SphereGeometry(0.73, 10, 6),
			color,
			g,
			[0, -0.08, 0],
			[1, 0.45, 0.7],
		);
		this.mesh(
			new THREE.BoxGeometry(1.1, 0.15, 0.4),
			C.cream,
			g,
			[0, 0.1, 0.28],
			[1, 1, 1],
		);
		const barrel = new THREE.Group();
		barrel.name = "barrel";
		barrel.position.set(0, 0.15, 0);
		g.add(barrel);
		this.mesh(
			new THREE.CylinderGeometry(0.16, 0.23, 0.87, 6),
			color,
			barrel,
			[0, 0.4, 0],
			[1, 1, 1],
		);
		this.mesh(
			new THREE.CylinderGeometry(0.25, 0.25, 0.13, 6),
			C.cream,
			barrel,
			[0, 0.83, 0],
			[1, 1, 1],
		);
		this.mesh(
			new THREE.SphereGeometry(0.36, 10, 6),
			0x25384c,
			g,
			[0, 0.15, 0.18],
			[1, 0.7, 1],
		);
		this.mesh(
			new THREE.BoxGeometry(0.48, 0.1, 0.06),
			C.cream,
			g,
			[0, 0.19, 0.54],
			[1, 1, 1],
			false,
			true,
		);
		for (const side of [-1, 1]) {
			const fin = this.mesh(
				this.shape(
					[
						[0, 0],
						[0.7, -0.2],
						[0.7, -0.5],
						[0.12, -0.35],
					],
					0.25,
				),
				color,
				g,
				[side * 0.36, 0.05, -0.2],
				[side, 1, 1],
			);
		}
		const flame = this.mesh(
			new THREE.ConeGeometry(0.25, 0.5, 6),
			C.mint,
			g,
			[0, -0.66, 0],
			[1, -1, 1],
			false,
			true,
		);
		flame.name = "flame";
		const mixer = new THREE.AnimationMixer(g);
		const clip = new THREE.AnimationClip("Cannon recoil", 0.16, [
			new THREE.NumberKeyframeTrack(
				"barrel.position[y]",
				[0, 0.04, 0.16],
				[0.15, -0.04, 0.15],
			),
		]);
		const action = mixer.clipAction(clip);
		action.setLoop(THREE.LoopOnce);
		action.clampWhenFinished = true;
		g.userData = { mixer, recoil: action, barrel, flame };
		return g;
	}
	makeEntity(e) {
		let g;
		if (e.kind === "enemy") g = this.demon(e.type);
		else if (e.kind === "player") g = this.cannon(e.seat);
		else {
			g = new THREE.Group();
			if (e.kind === "shot") {
				this.mesh(
					new THREE.CapsuleGeometry(0.1, 0.55, 2, 6),
					e.reflected ? C.gold : COLORS[e.owner % 4] || C.mint,
					g,
					[0, 0, 0],
					[1, 1, 1],
					false,
					true,
				);
				this.mesh(
					new THREE.CapsuleGeometry(0.043, 0.35, 2, 5),
					C.cream,
					g,
					[0, 0.07, 0.12],
					[1, 1, 1],
					false,
					true,
				);
			} else if (e.kind === "bomb") {
				if (e.type === "beam")
					this.mesh(
						new THREE.BoxGeometry(0.5, 2.1, 0.3),
						C.coral,
						g,
						[0, 0, 0],
						[1, 1, 1],
						true,
						true,
					);
				else {
					this.mesh(new THREE.OctahedronGeometry(0.27), C.coral, g);
					this.mesh(
						new THREE.OctahedronGeometry(0.13),
						C.cream,
						g,
						[0, 0, 0.23],
						[1, 1, 1],
						false,
						true,
					);
				}
			} else if (e.kind === "pickup") {
				this.mesh(
					new THREE.OctahedronGeometry(0.5),
					C.gold,
					g,
					[0, 0, 0],
					[1, 1.2, 0.6],
				);
				this.mesh(
					new THREE.TorusGeometry(0.7, 0.055, 4, 20),
					C.cream,
					g,
					[0, 0, 0],
					[1, 1, 1],
					false,
					true,
				);
			}
		}
		g.position.set(e.x, e.y, 1);
		g.userData.kind = e.kind;
		g.userData.baseScale = g.scale.x;
		this.root.add(g);
		this.models.set(e.id, g);
		return g;
	}
	setTitle(value) {
		this.title = value;
		this.hero.visible = value;
		this.skyRing.visible = !value;
	}
	sync(source, dt) {
		const list =
			source.entities instanceof Map
				? [...source.entities.values()]
				: decodeSnapshot(source);
		const ids = new Set();
		for (const e of list) {
			ids.add(e.id);
			let m = this.models.get(e.id);
			if (!m) m = this.makeEntity(e);
			m.position.x = THREE.MathUtils.lerp(
				m.position.x,
				e.x,
				Math.min(1, dt * 24),
			);
			m.position.y = THREE.MathUtils.lerp(
				m.position.y,
				e.y,
				Math.min(1, dt * 24),
			);
			if (m.userData.mixer) m.userData.mixer.update(dt);
			if (e.kind === "player") {
				m.userData.barrel.rotation.z = -(e.aim || 0);
				m.visible = !(e.invul > 0 && Math.floor(this.time * 12) % 3 === 0);
				m.userData.flame.scale.y = -1 * (1 + Math.sin(this.time * 25) * 0.25);
				m.rotation.z = -(e.x - m.position.x) * 0.035;
			}
			if (e.kind === "enemy") {
				m.rotation.z = Math.sin(this.time * 2 + e.id) * 0.07;
				if (e.type === "imp" && e.diving) m.rotation.z = Math.PI;
				if (e.hp < e.maxHp) {
					const stretch = 1 + Math.sin(this.time * 3 + e.id) * 0.016;
					m.scale.setScalar(m.userData.baseScale * stretch);
				}
			}
			if (e.kind === "pickup") m.rotation.y = this.time * 2;
		}
		for (const [id, m] of this.models) {
			if (!ids.has(id)) {
				m.userData.mixer?.stopAllAction();
				this.root.remove(m);
				const geos = new Set();
				m.traverse((o) => {
					if (o.geometry) geos.add(o.geometry);
				});
				for (const geo of geos) geo.dispose();
				this.models.delete(id);
			}
		}
	}
	burst(x, y, color, count = 15, size = 1) {
		for (let i = 0; i < count; i++) {
			const a = (i / count) * Math.PI * 2 + Math.random() * 0.3,
				s = 2 + Math.random() * 5;
			const geo =
				i % 3 === 0
					? new THREE.OctahedronGeometry(0.1 + Math.random() * 0.13)
					: new THREE.BoxGeometry(0.08, 0.3, 0.04);
			const m = this.mesh(
				geo,
				color,
				this.root,
				[x, y, 1.5],
				[size, size, size],
				false,
				true,
			);
			m.rotation.z = a;
			this.particles.push({
				m,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s,
				life: 0.4 + Math.random() * 0.45,
				max: 0.9,
			});
		}
	}
	ring(x, y, color, scale = 3, duration = 0.4) {
		const mat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: 1,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		const m = new THREE.Mesh(new THREE.RingGeometry(0.91, 1, 64), mat);
		m.position.set(x, y, 1.8);
		this.root.add(m);
		this.rings.push({ m, age: 0, duration, scale });
	}
	event(e) {
		if (e.type === "kill") {
			this.burst(
				e.x,
				e.y,
				{
					moth: C.mint,
					firebird: C.coral,
					splitter: C.lilac,
					armor: C.gold,
					boss: C.coral,
					imp: C.coral,
					seal: C.gold,
				}[e.enemyType] || C.cream,
				e.enemyType === "boss" ? 70 : 18,
				e.enemyType === "boss" ? 2 : 1,
			);
			this.ring(e.x, e.y, C.cream, e.enemyType === "boss" ? 8 : 2.2, 0.35);
			this.shake = Math.max(this.shake, e.enemyType === "boss" ? 1 : 0.09);
		}
		if (e.type === "hit") {
			const m = this.models.get(e.id);
			if (m) {
				this.burst(e.x, e.y, C.cream, 4, 0.55);
				m.scale.multiplyScalar(1.09);
			}
		}
		if (e.type === "fire")
			this.models
				.get(
					[...this.models.keys()].find(
						(id) =>
							this.models.get(id).userData.kind === "player" &&
							Math.abs(this.models.get(id).position.x - e.x) < 2,
					),
				)
				?.userData.recoil?.reset()
				.play();
		if (e.type === "pulse") {
			this.ring(e.x, e.y, C.mint, 10, 0.65);
			this.ring(e.x, e.y, C.cream, 8, 0.5);
			this.burst(e.x, e.y, C.mint, 24);
			this.shake = 0.25;
		}
		if (e.type === "hurt") {
			this.burst(e.x, e.y, C.coral, 25);
			this.ring(e.x, e.y, C.coral, 4, 0.5);
			this.shake = 0.45;
		}
		if (e.type === "split") {
			this.ring(e.x, e.y, C.lilac, 3, 0.4);
		}
		if (e.type === "dash") {
			this.burst(e.x, e.y, C.mint, 8);
		}
		if (e.type === "pickup") {
			this.ring(e.x, e.y, C.gold, 4, 0.6);
			this.burst(e.x, e.y, C.gold, 20);
		}
		if (e.type === "warning") {
			const mat = new THREE.MeshBasicMaterial({
				color: C.coral,
				transparent: true,
				opacity: 0.2,
				depthWrite: false,
			});
			const m = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 23), mat);
			m.position.set(e.x, 0, 0.5);
			this.root.add(m);
			this.rings.push({
				m,
				age: 0,
				duration: e.duration,
				warning: true,
				scale: 1,
			});
		}
	}
	update(dt) {
		this.time += dt;
		this.skyRing.rotation.z = this.time * 0.022;
		if (this.hero.visible) {
			this.hero.userData.mixer.update(dt);
			this.hero.position.y = 1.6 + Math.sin(this.time * 1.6) * 0.4;
			this.hero.rotation.z = Math.sin(this.time * 0.7) * 0.07;
		}
		for (const s of this.snow) {
			s.position.x += dt * 0.24;
			s.position.y -= dt * 0.55;
			if (s.position.y < -9) {
				s.position.y = 14;
				s.position.x = (Math.random() - 0.5) * 37;
			}
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.m.position.x += p.vx * dt;
			p.m.position.y += p.vy * dt;
			p.vy -= dt * 8;
			p.m.rotation.z += dt * 6;
			p.m.scale.multiplyScalar(Math.max(0.1, 1 - dt * 1.8));
			if (p.life <= 0) {
				this.root.remove(p.m);
				p.m.geometry.dispose();
				this.particles.splice(i, 1);
			}
		}
		for (let i = this.rings.length - 1; i >= 0; i--) {
			const p = this.rings[i];
			p.age += dt;
			const f = p.age / p.duration;
			if (p.warning) {
				p.m.material.opacity = 0.08 + Math.abs(Math.sin(f * 24)) * 0.22;
			} else {
				p.m.scale.setScalar(0.2 + f * p.scale);
				p.m.material.opacity = 1 - f;
			}
			if (f >= 1) {
				this.root.remove(p.m);
				p.m.material.dispose();
				p.m.geometry.dispose();
				this.rings.splice(i, 1);
			}
		}
		this.shake = Math.max(0, this.shake - dt * 2);
		this.camera.position.x = (Math.random() - 0.5) * this.shake;
		this.camera.position.y = 3.8 + (Math.random() - 0.5) * this.shake;
	}
	render() {
		this.renderer.render(this.scene, this.camera);
	}
	resize() {
		const w = innerWidth,
			h = innerHeight,
			aspect = w / h;
		this.renderer.setSize(w, h);
		const height = aspect < 1.3 ? 31 : 23.7;
		this.camera.left = (-height * aspect) / 2;
		this.camera.right = (height * aspect) / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.zoom = aspect < 1.3 ? Math.min(1, aspect / 1.25) : 1;
		this.camera.updateProjectionMatrix();
		this.camera.updateMatrixWorld();
	}
	worldToScreen(x, y) {
		const v = new THREE.Vector3(x, y, 1).project(this.camera);
		return {
			x: (v.x * 0.5 + 0.5) * innerWidth,
			y: (-0.5 * v.y + 0.5) * innerHeight,
		};
	}
	screenToWorld(x, y) {
		const ray = new THREE.Raycaster();
		ray.setFromCamera(
			new THREE.Vector2((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2),
			this.camera,
		);
		const point = new THREE.Vector3();
		ray.ray.intersectPlane(
			new THREE.Plane(new THREE.Vector3(0, 0, 1), -1),
			point,
		);
		return point;
	}
}
