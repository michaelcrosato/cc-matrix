import { color, normalWorld, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";
import { seeded } from "./game.js";

export const COLORS = {
	ink: 0x070e1c,
	cream: 0xf5ecd2,
	coral: 0xff715c,
	cyan: 0x64e5df,
	lime: 0xd7f975,
	purple: 0xc692f5,
	navy: 0x0e2032,
};
const PLAYER_COLORS = [COLORS.cyan, COLORS.coral, COLORS.lime, COLORS.purple];
const cache = new Map();
function material(c, flat = false) {
	const key = c + "_" + flat;
	if (cache.has(key)) return cache.get(key);
	const m = new THREE.MeshBasicNodeMaterial({ side: THREE.FrontSide });
	if (flat) m.colorNode = color(c);
	else
		m.colorNode = color(c).mul(
			normalWorld
				.dot(vec3(-0.35, 0.7, 0.65).normalize())
				.mul(0.5)
				.add(0.5)
				.mul(3)
				.floor()
				.div(3)
				.mul(0.65)
				.add(0.38),
		);
	cache.set(key, m);
	return m;
}
const outlineMat = new THREE.MeshBasicNodeMaterial({
	color: COLORS.ink,
	side: THREE.BackSide,
});
function mesh(geometry, c, ink = true) {
	const m = new THREE.Mesh(geometry, material(c));
	if (ink) {
		const edge = new THREE.Mesh(geometry, outlineMat);
		edge.scale.setScalar(1.075);
		m.add(edge);
	}
	return m;
}
function polygon(points, depth = 0.14) {
	const shape = new THREE.Shape();
	shape.moveTo(points[0][0], points[0][1]);
	for (const p of points.slice(1)) shape.lineTo(p[0], p[1]);
	shape.closePath();
	return new THREE.ExtrudeGeometry(shape, {
		depth,
		bevelEnabled: true,
		bevelThickness: 0.025,
		bevelSize: 0.025,
		bevelSegments: 1,
		steps: 1,
	});
}
function poly(points, c, depth = 0.14) {
	return mesh(polygon(points, depth), c);
}
function ball(r, c, detail = 0) {
	return mesh(new THREE.IcosahedronGeometry(r, detail), c);
}
function flat(geometry, c) {
	return new THREE.Mesh(geometry, material(c, true));
}
function line(points, c = COLORS.cyan, opacity = 0.3) {
	const g = new THREE.BufferGeometry().setFromPoints(
		points.map((p) => new THREE.Vector3(...p)),
	);
	return new THREE.Line(
		g,
		new THREE.LineBasicNodeMaterial({ color: c, transparent: true, opacity }),
	);
}
function ring(radius, c, width = 0.035) {
	return flat(new THREE.RingGeometry(radius - width, radius + width, 90), c);
}

export class View {
	constructor(canvas, settings) {
		this.canvas = canvas;
		this.settings = settings;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x0a1626);
		this.camera = new THREE.OrthographicCamera(-12, 12, 7, -7, 0.1, 100);
		this.camera.position.set(0, 0, 30);
		this.camera.lookAt(0, 0, 0);
		this.root = new THREE.Group();
		this.scene.add(this.root);
		this.objects = new Map();
		this.effects = [];
		this.labels = [];
		this.time = 0;
		this.shake = 0;
		this.hits = new THREE.Group();
		this.scene.add(this.hits);
		this.hitMaterial = new THREE.LineBasicNodeMaterial({ color: COLORS.lime });
		this.particlesGeo = new THREE.IcosahedronGeometry(0.08, 0);
		this.sparkGeo = new THREE.PlaneGeometry(0.07, 0.24);
		this.hero = new THREE.Group();
		this.scene.add(this.hero);
		this.heroDemon = this.makeDemon("fiend", 0);
		this.hero.add(this.heroDemon.group);
		this.heroDemon.group.scale.setScalar(2.65);
		this.heroDemon.group.position.set(3.9, 1, 1);
		this.heroRing = ring(3.35, 0x20404a, 0.025);
		this.heroRing.position.set(3.9, 1, -2);
		this.hero.add(this.heroRing);
		const r = ring(3.6, 0x172f40, 0.07);
		r.position.copy(this.heroRing.position);
		this.hero.add(r);
		this.heroOuterRing = r;
		for (let i = 0; i < 3; i++) {
			const d = this.makeDemon(i === 1 ? "diver" : "moth", i);
			d.group.position.set(1.6 + i * 2.6, -2.2 + (i % 2) * 0.4, 0.5);
			d.group.scale.setScalar(0.63);
			this.hero.add(d.group);
			this.heroExtras ??= [];
			this.heroExtras.push(d);
		}
		this.createStage();
		this.resize();
	}
	async init() {
		const force =
			new URLSearchParams(location.search).get("renderer") === "webgl";
		for (const fallback of force ? [true] : [false, true]) {
			try {
				this.renderer = new THREE.WebGPURenderer({
					canvas: this.canvas,
					antialias: true,
					alpha: false,
					powerPreference: "high-performance",
					forceWebGL: fallback,
				});
				this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
				this.renderer.setSize(innerWidth, innerHeight);
				this.renderer.outputColorSpace = THREE.SRGBColorSpace;
				await this.renderer.init();
				await this.renderer.compileAsync(this.scene, this.camera);
				this.backend = this.renderer.backend.isWebGPUBackend
					? "WebGPU"
					: "WebGL 2";
				return this.backend;
			} catch (error) {
				if (fallback) throw error;
				this.fallbackReason = error.message;
				try {
					this.renderer.dispose();
				} catch {}
				const replacement = document.createElement("canvas");
				replacement.id = this.canvas.id;
				replacement.setAttribute("aria-label", "Demon Encore game battlefield");
				this.canvas.replaceWith(replacement);
				this.canvas = replacement;
			}
		}
	}
	createStage() {
		const stage = new THREE.Group();
		this.scene.add(stage);
		this.stage = stage;
		const rand = seeded(42);
		const vertices = [],
			colors = [];
		for (let i = 0; i < 240; i++) {
			vertices.push((rand() - 0.5) * 45, (rand() - 0.5) * 25, -7 - rand() * 4);
			const c = new THREE.Color(i % 4 === 0 ? 0x54aab5 : 0x8f9eab);
			colors.push(c.r, c.g, c.b);
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		const stars = new THREE.Points(
			geo,
			new THREE.PointsNodeMaterial({
				size: 1.5,
				vertexColors: true,
				sizeAttenuation: false,
			}),
		);
		stage.add(stars);
		this.stars = stars;
		const moon = flat(new THREE.CircleGeometry(1.6, 48), 0x182c3c);
		moon.position.set(-7, 4.5, -9);
		stage.add(moon);
		const crescent = ring(1.75, 0x2c4951, 0.02);
		crescent.position.copy(moon.position);
		stage.add(crescent);
		for (let i = 0; i < 6; i++) {
			const yy = -5.55 - i * 0.33;
			stage.add(
				line(
					[
						[-30, yy, -2],
						[30, yy, -2],
					],
					i === 0 ? 0x40878d : 0x173b49,
					i === 0 ? 0.7 : 0.35,
				),
			);
		}
		for (let i = -12; i <= 12; i++)
			stage.add(
				line(
					[
						[i * 1.3, -5.55, -2],
						[i * 2.4, -9, -1],
					],
					0x19414c,
					0.4,
				),
			);
		for (const side of [-1, 1]) {
			const mountain = poly(
				[
					[side * 10, -5.5],
					[side * 12, -2.5],
					[side * 13, -3.3],
					[side * 14, 1.5],
					[side * 16, -0.7],
					[side * 18, 2.3],
					[side * 23, -5.5],
				],
				0x112738,
				0.3,
			);
			mountain.position.z = -5;
			stage.add(mountain);
			for (let i = 0; i < 5; i++) {
				const x = side * (10.5 + i * 2.1),
					height = 2.5 + rand() * 4;
				const pillar = mesh(
					new THREE.CylinderGeometry(0.12, 0.4, height, 4),
					0x17313f,
				);
				pillar.position.set(x, -5.5 + height / 2, -4);
				stage.add(pillar);
				const cap = ball(0.22, i % 2 ? 0x4c746c : 0x325766);
				cap.position.set(x, -5.5 + height, -4);
				stage.add(cap);
			}
		}
		this.arenaFrame = new THREE.Group();
		stage.add(this.arenaFrame);
		this.updateBounds();
	}
	updateBounds(width = this.width) {
		if (!this.arenaFrame) return;
		while (this.arenaFrame.children.length) {
			const c = this.arenaFrame.children[0];
			this.arenaFrame.remove(c);
			c.geometry?.dispose();
		}
		const w = width + 0.55;
		this.frameWidth = width;
		for (const s of [-1, 1]) {
			this.arenaFrame.add(
				line(
					[
						[s * w, -5.3, -1],
						[s * w, 4.9, -1],
					],
					0x2a4653,
					0.38,
				),
			);
			for (const y of [-5.3, 4.9])
				this.arenaFrame.add(
					line(
						[
							[s * (w - 0.32), y, -1],
							[s * w, y, -1],
							[s * w, y + (y > 0 ? -0.28 : 0.28), -1],
						],
						COLORS.cyan,
						0.75,
					),
				);
		}
	}
	resize() {
		const aspect = innerWidth / innerHeight,
			h = 14;
		this.camera.left = (-h * aspect) / 2;
		this.camera.right = (h * aspect) / 2;
		this.camera.top = h / 2;
		this.camera.bottom = -h / 2;
		this.camera.updateProjectionMatrix();
		this.width = Math.min(9, (h * aspect) / 2 - 0.7);
		this.renderer?.setSize(innerWidth, innerHeight);
		this.updateBounds();
		if (aspect < 1.1) {
			this.heroDemon.group.position.set(0, 3.2, 1);
			this.heroDemon.group.scale.setScalar(1.55);
			this.heroRing.visible = false;
			this.heroOuterRing.visible = false;
		} else {
			this.heroDemon.group.position.set(3.9, 1, 1);
			this.heroDemon.group.scale.setScalar(2.65);
			this.heroRing.visible = true;
			this.heroOuterRing.visible = true;
		}
		for (const d of this.heroExtras || []) d.group.visible = aspect >= 1.1;
	}
	makeDemon(kind, id) {
		const group = new THREE.Group();
		const boss = kind === "boss",
			small = kind === "hatchling";
		const c =
			kind === "fiend"
				? COLORS.coral
				: kind === "artillery"
					? COLORS.purple
					: kind === "diver"
						? COLORS.lime
						: small
							? COLORS.cream
							: COLORS.cyan;
		const body = ball(0.48, c, 0);
		body.scale.set(1, 1.1, 0.6);
		group.add(body);
		const brow = poly(
			[
				[-0.36, 0.22],
				[-0.12, 0.12],
				[0, 0.18],
				[0.12, 0.12],
				[0.36, 0.22],
				[0.25, 0.04],
				[-0.25, 0.04],
			],
			COLORS.ink,
			0.05,
		);
		brow.position.z = 0.4;
		group.add(brow);
		for (const s of [-1, 1]) {
			const eye = poly(
				[
					[s * 0.09, 0.06],
					[s * 0.33, 0.15],
					[s * 0.28, -0.07],
					[s * 0.12, -0.06],
				],
				COLORS.cream,
				0.035,
			);
			eye.position.z = 0.48;
			group.add(eye);
			const pupil = ball(0.043, COLORS.ink);
			pupil.position.set(s * 0.21, 0.01, 0.56);
			group.add(pupil);
			const horn = poly(
				[
					[s * 0.24, 0.28],
					[s * 0.4, 0.85],
					[s * 0.6, 0.5],
					[s * 0.45, 0.12],
				],
				c,
				0.13,
			);
			horn.position.z = 0.05;
			group.add(horn);
			const fang = poly(
				[
					[s * 0.08, -0.23],
					[s * 0.13, -0.49],
					[s * 0.23, -0.2],
				],
				COLORS.cream,
				0.035,
			);
			fang.position.z = 0.39;
			group.add(fang);
			const wing = new THREE.Group();
			wing.name = "wing" + (s === 1 ? "R" : "L");
			wing.position.set(s * 0.37, 0.08, 0);
			const blade = poly(
				[
					[0, 0.12],
					[s * 0.35, 0.62],
					[s * 1.2, 0.85],
					[s * 0.85, 0.2],
					[s * 1.05, -0.02],
					[s * 0.56, -0.1],
					[s * 0.62, -0.43],
					[s * 0.17, -0.24],
					[0, -0.06],
				],
				c,
				0.1,
			);
			wing.add(blade);
			const slash = poly(
				[
					[s * 0.12, 0.1],
					[s * 0.95, 0.67],
					[s * 0.44, 0.08],
					[s * 0.51, -0.11],
				],
				kind === "fiend"
					? 0xffb873
					: kind === "artillery"
						? 0x785b99
						: 0x3a848e,
				0.03,
			);
			slash.position.z = 0.18;
			wing.add(slash);
			group.add(wing);
		}
		const mouth = poly(
			[
				[-0.18, -0.18],
				[0, -0.29],
				[0.18, -0.18],
				[0.1, -0.34],
				[-0.1, -0.34],
			],
			COLORS.ink,
			0.04,
		);
		mouth.position.z = 0.41;
		group.add(mouth);
		if (kind === "artillery") {
			const gem = ball(0.18, COLORS.cream);
			gem.position.set(0, 0.65, 0.25);
			group.add(gem);
		}
		if (boss) {
			group.scale.setScalar(2.35);
			const crown = poly(
				[
					[-0.55, 0.55],
					[-0.65, 1.02],
					[-0.24, 0.81],
					[0, 1.22],
					[0.24, 0.81],
					[0.65, 1.02],
					[0.55, 0.55],
				],
				COLORS.lime,
				0.2,
			);
			crown.position.z = 0.05;
			group.add(crown);
			const jewel = ball(0.13, COLORS.coral);
			jewel.position.set(0, 0.84, 0.32);
			group.add(jewel);
		} else if (small) group.scale.setScalar(0.48);
		else if (kind === "diver") group.scale.set(1, 0.82, 1);
		const times = [0, 0.19, 0.38, 0.57, 0.76];
		const clip = new THREE.AnimationClip("wingbeat", 0.76, [
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[z]",
				times,
				[0.2, -0.35, 0.2, 0.48, 0.2],
			),
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[z]",
				times,
				[-0.2, 0.35, -0.2, -0.48, -0.2],
			),
			new THREE.NumberKeyframeTrack(
				".rotation[y]",
				[0, 0.38, 0.76],
				[-0.12, 0.12, -0.12],
			),
		]);
		const mixer = new THREE.AnimationMixer(group);
		const action = mixer.clipAction(clip);
		action.play();
		mixer.setTime((id * 0.17) % 0.76);
		return { group, mixer, kind, baseScale: group.scale.clone() };
	}
	makePlayer(seat) {
		const group = new THREE.Group(),
			c = PLAYER_COLORS[seat % 4];
		const wing = poly(
			[
				[-0.94, -0.29],
				[-0.42, 0.03],
				[-0.17, 0.72],
				[0, 0.39],
				[0.17, 0.72],
				[0.42, 0.03],
				[0.94, -0.29],
				[0.36, -0.35],
				[0, -0.14],
				[-0.36, -0.35],
			],
			COLORS.cream,
			0.18,
		);
		group.add(wing);
		const fuselage = poly(
			[
				[-0.24, -0.34],
				[-0.18, 0.32],
				[0, 0.78],
				[0.18, 0.32],
				[0.24, -0.34],
				[0, -0.2],
			],
			c,
			0.25,
		);
		fuselage.position.z = 0.13;
		group.add(fuselage);
		const cockpit = poly(
			[
				[-0.09, -0.03],
				[0, 0.4],
				[0.09, -0.03],
			],
			COLORS.ink,
			0.06,
		);
		cockpit.position.z = 0.44;
		group.add(cockpit);
		for (const s of [-1, 1]) {
			const stripe = poly(
				[
					[s * 0.36, -0.25],
					[s * 0.65, -0.23],
					[s * 0.38, -0.08],
				],
				c,
				0.03,
			);
			stripe.position.z = 0.24;
			group.add(stripe);
		}
		const flame = poly(
			[
				[-0.14, -0.3],
				[0, -0.98],
				[0.14, -0.3],
			],
			c,
			0.03,
		);
		flame.name = "flame";
		flame.position.z = 0.1;
		group.add(flame);
		const mixer = new THREE.AnimationMixer(group);
		const clip = new THREE.AnimationClip("reactor", 0.2, [
			new THREE.NumberKeyframeTrack(
				"flame.scale[y]",
				[0, 0.1, 0.2],
				[0.82, 1.2, 0.82],
			),
		]);
		mixer.clipAction(clip).play();
		return {
			group,
			mixer,
			kind: "player",
			baseScale: new THREE.Vector3(1, 1, 1),
		};
	}
	makeObject(e) {
		let o;
		if (e.type === "enemy") o = this.makeDemon(e.kind, e.id);
		else if (e.type === "player") o = this.makePlayer(e.seat);
		else if (e.type === "pickup") {
			const group = new THREE.Group();
			const c =
				e.kind === "repair"
					? COLORS.coral
					: e.kind === "prism"
						? COLORS.lime
						: COLORS.cyan;
			group.add(mesh(new THREE.OctahedronGeometry(0.4), c));
			const r = ring(0.57, c, 0.03);
			group.add(r);
			const symbol =
				e.kind === "repair"
					? poly(
							[
								[-0.06, 0.2],
								[0.06, 0.2],
								[0.06, 0.06],
								[0.2, 0.06],
								[0.2, -0.06],
								[0.06, -0.06],
								[0.06, -0.2],
								[-0.06, -0.2],
								[-0.06, -0.06],
								[-0.2, -0.06],
								[-0.2, 0.06],
								[-0.06, 0.06],
							],
							COLORS.ink,
							0.02,
						)
					: poly(
							[
								[-0.12, -0.22],
								[0.14, 0.02],
								[-0.03, 0.02],
								[0.13, 0.24],
								[-0.15, 0.02],
								[0.01, 0.02],
							],
							COLORS.ink,
							0.02,
						);
			symbol.position.z = 0.44;
			group.add(symbol);
			o = { group, kind: "pickup" };
		} else {
			const friendly = e.type === "shot",
				group = new THREE.Group(),
				c = friendly
					? PLAYER_COLORS[(e.seat || 0) % 4]
					: e.style === 2
						? COLORS.lime
						: COLORS.coral;
			if (friendly) {
				const shot = poly(
					[
						[-0.065, -0.32],
						[0.065, -0.32],
						[0.09, 0.15],
						[0, 0.28],
						[-0.09, 0.15],
					],
					c,
					0.05,
				);
				group.add(shot);
				group.rotation.z = -Math.atan2(e.vx || 0, e.vy || 15);
			} else {
				const core = ball(0.14, c);
				core.scale.set(1, 1.7, 1);
				group.add(core);
				const trail = poly(
					[
						[-0.08, 0.06],
						[0, 0.55],
						[0.08, 0.06],
					],
					c,
					0.02,
				);
				group.add(trail);
				group.rotation.z = Math.atan2(e.vx || 0, -(e.vy || -3));
			}
			o = { group, kind: e.type };
		}
		this.root.add(o.group);
		this.objects.set(e.id, o);
		return o;
	}
	effect(event) {
		const { type, x = 0, y = 0 } = event;
		const settings = this.settings;
		if (
			type === "kill" ||
			type === "hurt" ||
			type === "split" ||
			type === "bossDown"
		) {
			const count =
				settings.effects === "low" ? 7 : type === "bossDown" ? 75 : 20;
			const c =
				type === "hurt"
					? COLORS.coral
					: type === "split"
						? COLORS.cream
						: type === "bossDown"
							? COLORS.lime
							: COLORS.cyan;
			for (let i = 0; i < count; i++) {
				const angle = Math.random() * Math.PI * 2,
					speed = 1.4 + Math.random() * 5;
				const m = flat(this.particlesGeo, c);
				m.position.set(x, y, 0.7);
				m.rotation.z = angle;
				this.root.add(m);
				this.effects.push({
					m,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					life: 0.5 + Math.random() * 0.4,
					max: 1,
					spin: (Math.random() - 0.5) * 15,
				});
			}
			this.burstRing(x, y, c, type === "bossDown" ? 5 : 1.3);
			if (settings.shake)
				this.shake = Math.max(
					this.shake,
					type === "bossDown" ? 0.35 : type === "hurt" ? 0.22 : 0.06,
				);
		}
		if (type === "encore") {
			this.burstRing(x, y, COLORS.lime, 25);
			this.burstRing(x, y, COLORS.cream, 19);
			if (settings.shake) this.shake = 0.24;
		}
		if (type === "dash") {
			for (let i = 0; i < 8; i++) {
				const m = flat(
					new THREE.PlaneGeometry(0.45, 0.035),
					PLAYER_COLORS[event.seat % 4],
				);
				m.position.set(x - event.dir * i * 0.28, y + ((i % 3) - 1) * 0.25, 0.5);
				this.root.add(m);
				this.effects.push({
					m,
					vx: -event.dir * 7,
					vy: 0,
					life: 0.28,
					max: 0.28,
					spin: 0,
				});
			}
		}
		if (type === "graze") this.burstRing(x, y, COLORS.cream, 0.85, 0.25);
		if (type === "pickup") this.burstRing(x, y, COLORS.lime, 2);
	}
	burstRing(x, y, c, speed = 2, life = 0.55) {
		const m = ring(0.22, c, 0.035);
		m.position.set(x, y, 0.7);
		this.root.add(m);
		this.effects.push({
			m,
			vx: 0,
			vy: 0,
			life,
			max: life,
			spin: 0,
			expand: speed,
		});
	}
	render(game, dt, menu = false, hitboxes = false) {
		this.time += dt;
		this.hero.visible = menu;
		this.root.visible = !menu;
		this.heroDemon.mixer.update(dt * 0.75);
		for (const d of this.heroExtras || []) d.mixer.update(dt);
		this.heroDemon.group.position.y =
			(innerWidth / innerHeight < 1.1 ? 3.2 : 1) +
			Math.sin(this.time * 1.2) * 0.13;
		this.heroRing.rotation.z += dt * 0.07;
		this.stars.rotation.z = this.time * 0.001;
		if (game && !menu) {
			if (this.frameWidth !== game.width) this.updateBounds(game.width);
			const alive = new Set();
			for (const e of game.entities.values()) {
				alive.add(e.id);
				const o = this.objects.get(e.id) || this.makeObject(e);
				o.group.position.set(e.x, e.y, e.type === "player" ? 0.8 : 0.25);
				o.mixer?.update(
					dt * (e.kind === "hatchling" ? 1.65 : e.kind === "boss" ? 0.7 : 1),
				);
				if (e.type === "player") {
					o.group.visible =
						e.alive && (e.inv <= 0 || Math.floor(this.time * 16) % 3 !== 0);
					o.group.rotation.z +=
						(Math.max(-0.18, Math.min(0.18, (o.lastX ?? e.x) - e.x)) -
							o.group.rotation.z) *
						0.35;
					o.lastX = e.x;
					o.group.scale.setScalar(e.dash > 0 ? 1.08 : 1);
				} else if (e.type === "enemy") {
					const flash = e.damageFlash > 0 ? 1.11 : 1;
					o.group.scale.copy(o.baseScale).multiplyScalar(flash);
					o.group.rotation.z = Math.sin(this.time * 2 + e.id) * 0.065;
				} else if (e.type === "pickup") {
					o.group.rotation.y = Math.sin(this.time * 2) * 0.25;
					o.group.rotation.z = Math.sin(this.time * 3) * 0.12;
				}
			}
			for (const [id, o] of this.objects)
				if (!alive.has(id)) {
					this.disposeObject(o);
					this.objects.delete(id);
				}
		}
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const f = this.effects[i];
			f.life -= dt;
			if (f.life <= 0) {
				this.root.remove(f.m);
				if (f.m.geometry !== this.particlesGeo) f.m.geometry.dispose();
				this.effects.splice(i, 1);
				continue;
			}
			f.m.position.x += f.vx * dt;
			f.m.position.y += f.vy * dt;
			f.m.rotation.z += f.spin * dt;
			if (f.expand) f.m.scale.setScalar(1 + (1 - f.life / f.max) * f.expand);
			else f.m.scale.setScalar(Math.max(0.05, f.life / f.max));
		}
		this.hits.visible = hitboxes && !menu;
		if (this.hits.visible && game) {
			while (this.hits.children.length) {
				const m = this.hits.children[0];
				this.hits.remove(m);
				m.geometry.dispose();
			}
			for (const e of game.entities.values()) {
				const geo = new THREE.BufferGeometry().setFromPoints(
					Array.from(
						{ length: 25 },
						(_, i) =>
							new THREE.Vector3(
								Math.cos((i / 24) * Math.PI * 2) * (e.r || 0.3) + e.x,
								Math.sin((i / 24) * Math.PI * 2) * (e.r || 0.3) + e.y,
								1.4,
							),
					),
				);
				this.hits.add(new THREE.Line(geo, this.hitMaterial));
			}
		}
		this.shake = Math.max(0, this.shake - dt * 0.7);
		const shake = this.shake * (this.settings.effects === "low" ? 0.3 : 1);
		this.camera.position.x = shake * (Math.random() - 0.5);
		this.camera.position.y = shake * (Math.random() - 0.5);
		this.renderer.render(this.scene, this.camera);
	}
	clear() {
		for (const o of this.objects.values()) this.disposeObject(o);
		this.objects.clear();
		for (const f of this.effects) {
			this.root.remove(f.m);
			if (f.m.geometry !== this.particlesGeo) f.m.geometry.dispose();
		}
		this.effects = [];
	}
	disposeObject(o) {
		this.root.remove(o.group);
		o.mixer?.stopAllAction();
		o.mixer?.uncacheRoot(o.group);
		const geometries = new Set();
		o.group.traverse((m) => {
			if (m.geometry) geometries.add(m.geometry);
		});
		for (const g of geometries) g.dispose();
	}
	worldX(clientX) {
		return ((clientX / innerWidth) * 2 - 1) * this.camera.right;
	}
}
